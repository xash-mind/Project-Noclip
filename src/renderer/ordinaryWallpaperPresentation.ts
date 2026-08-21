import * as pc from 'playcanvas';
import { GENERATED_ASSET_REGISTRY } from '../presentation/generatedAssetRegistry.js';
import { CELL_SIZE, type CellDescriptor, type WallSpec } from '../world/types.js';
import { paintLevel0ChevronWallpaper } from './level0Wallpaper.js';
import {
  ORDINARY_CASING_CENTER_Y,
  ORDINARY_OUTLET_CENTER_Y,
  ordinaryCasingEnabled,
  ordinaryOutletPlacement,
  ordinaryWallpaperDecision,
  ordinaryWallpaperUv,
  type OrdinaryWallpaperFamily
} from './ordinaryWallpaperRules.js';
import { WorldRenderer } from './WorldRenderer.js';
import { makeMaterial, type CellVisual, type InteractionVisual } from './support.js';

const WALLPAPER_ASSET_IDS: Readonly<Record<OrdinaryWallpaperFamily, string>> = Object.freeze({
  A: 'level0.wallpaper.a-chevron',
  B: 'level0.wallpaper.b-dots',
  C: 'level0.wallpaper.c-lines'
});

interface RendererAccess {
  app: pc.Application;
  save: { seed: string };
}

interface OrdinaryPresentationCache {
  wallpapers: Readonly<Record<OrdinaryWallpaperFamily, pc.Texture>>;
  materials: Map<string, pc.StandardMaterial>;
}

export interface OutletInteractionVisual {
  kind: 'outlet';
  id: string;
  entity: pc.Entity;
  wallId: string;
  x: number;
  y: number;
  z: number;
}

const caches = new WeakMap<WorldRenderer, OrdinaryPresentationCache>();
let installed = false;

function childrenOf(entity: pc.Entity): pc.Entity[] {
  return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children];
}

function entityByName(root: pc.Entity, name: string): pc.Entity | undefined {
  return childrenOf(root).find((child) => child.name === name);
}

function fallbackCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas texture unavailable');
  paintLevel0ChevronWallpaper(context, 256);
  return canvas;
}

function createAssetTexture(app: pc.Application, assetId: string): pc.Texture {
  const texture = new pc.Texture(app.graphicsDevice, { mipmaps: true });
  texture.addressU = pc.ADDRESS_REPEAT;
  texture.addressV = pc.ADDRESS_REPEAT;
  texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
  texture.magFilter = pc.FILTER_LINEAR;
  texture.setSource(fallbackCanvas());

  const asset = GENERATED_ASSET_REGISTRY.find((candidate) => candidate.id === assetId && candidate.runtimeStatus === 'ready');
  if (asset && typeof Image !== 'undefined') {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => texture.setSource(image);
    image.onerror = () => console.warn(`[Level 0 wallpaper] runtime asset failed to load: ${assetId}`);
    image.src = asset.runtimePath;
  }
  return texture;
}

function cacheFor(renderer: WorldRenderer): OrdinaryPresentationCache {
  const existing = caches.get(renderer);
  if (existing) return existing;
  const app = (renderer as unknown as RendererAccess).app;
  const created: OrdinaryPresentationCache = {
    wallpapers: Object.freeze({
      A: createAssetTexture(app, WALLPAPER_ASSET_IDS.A),
      B: createAssetTexture(app, WALLPAPER_ASSET_IDS.B),
      C: createAssetTexture(app, WALLPAPER_ASSET_IDS.C)
    }),
    materials: new Map()
  };
  caches.set(renderer, created);
  return created;
}

function material(cache: OrdinaryPresentationCache, key: string, factory: () => pc.StandardMaterial): pc.StandardMaterial {
  const existing = cache.materials.get(key);
  if (existing) return existing;
  const created = factory();
  cache.materials.set(key, created);
  return created;
}

function setMaterial(entity: pc.Entity | undefined, value: pc.StandardMaterial): void {
  if (entity?.render) entity.render.material = value;
}

function box(
  name: string,
  parent: pc.Entity,
  position: [number, number, number],
  scale: [number, number, number],
  value: pc.StandardMaterial
): pc.Entity {
  const entity = new pc.Entity(name);
  entity.addComponent('render', { type: 'box' });
  entity.setLocalPosition(position[0], position[1], position[2]);
  entity.setLocalScale(scale[0], scale[1], scale[2]);
  if (entity.render) entity.render.material = value;
  parent.addChild(entity);
  return entity;
}

function wallpaperMaterial(
  cache: OrdinaryPresentationCache,
  descriptor: CellDescriptor,
  wall: WallSpec,
  family: OrdinaryWallpaperFamily
): pc.StandardMaterial {
  const uv = ordinaryWallpaperUv(descriptor.address.cellX, descriptor.address.cellZ, wall);
  const key = `ordinary-wallpaper:${family}:${uv.tiling.map((value) => value.toFixed(4)).join(',')}:${uv.offset.map((value) => value.toFixed(4)).join(',')}`;
  return material(cache, key, () => makeMaterial([0.96, 0.95, 0.92], cache.wallpapers[family], uv.tiling, undefined, 1, uv.offset));
}

function splitWallSpecs(wall: WallSpec, fraction: number): [WallSpec, WallSpec] {
  const clamped = Math.max(0.25, Math.min(0.75, fraction));
  if (wall.orientation === 'z') {
    const firstLength = wall.sx * clamped;
    const secondLength = wall.sx - firstLength;
    const start = wall.cx - wall.sx / 2;
    return [
      { ...wall, id: wall.id, cx: start + firstLength / 2, sx: firstLength },
      { ...wall, id: `${wall.id}:split-c`, cx: start + firstLength + secondLength / 2, sx: secondLength }
    ];
  }
  const firstLength = wall.sz * clamped;
  const secondLength = wall.sz - firstLength;
  const start = wall.cz - wall.sz / 2;
  return [
    { ...wall, id: wall.id, cz: start + firstLength / 2, sz: firstLength },
    { ...wall, id: `${wall.id}:split-c`, cz: start + firstLength + secondLength / 2, sz: secondLength }
  ];
}

function renderSplitWallpaper(
  cache: OrdinaryPresentationCache,
  descriptor: CellDescriptor,
  root: pc.Entity,
  wall: WallSpec,
  fraction: number,
  cOnPositiveSide: boolean
): void {
  entityByName(root, wall.id)?.destroy();
  const [negative, positive] = splitWallSpecs(wall, fraction);
  const negativeFamily: OrdinaryWallpaperFamily = cOnPositiveSide ? 'A' : 'C';
  const positiveFamily: OrdinaryWallpaperFamily = cOnPositiveSide ? 'C' : 'A';
  box(negative.id, root, [negative.cx, negative.cy, negative.cz], [negative.sx, negative.sy, negative.sz], wallpaperMaterial(cache, descriptor, negative, negativeFamily));
  box(positive.id, root, [positive.cx, positive.cy, positive.cz], [positive.sx, positive.sy, positive.sz], wallpaperMaterial(cache, descriptor, positive, positiveFamily));
}

function casingMaterial(cache: OrdinaryPresentationCache): pc.StandardMaterial {
  return material(cache, 'ordinary-casing', () => {
    const result = makeMaterial([0.46, 0.41, 0.20]);
    result.gloss = 0.05;
    result.update();
    return result;
  });
}

function outletPlateMaterial(cache: OrdinaryPresentationCache): pc.StandardMaterial {
  return material(cache, 'ordinary-outlet-plate', () => {
    const result = makeMaterial([0.62, 0.59, 0.37]);
    result.gloss = 0.04;
    result.update();
    return result;
  });
}

function outletSlotMaterial(cache: OrdinaryPresentationCache): pc.StandardMaterial {
  return material(cache, 'ordinary-outlet-slot', () => makeMaterial([0.18, 0.16, 0.08]));
}

function addCasing(cache: OrdinaryPresentationCache, root: pc.Entity, wall: WallSpec): void {
  const value = casingMaterial(cache);
  const protrusion = 0.028;
  const thickness = 0.045;
  const lengthInset = 0.08;
  if (wall.orientation === 'z') {
    const length = Math.max(0.1, wall.sx - lengthInset);
    for (const face of [-1, 1] as const) {
      box(`${wall.id}:casing:${face}`, root, [wall.cx, ORDINARY_CASING_CENTER_Y, wall.cz + face * (wall.sz / 2 + protrusion)], [length, 0.072, thickness], value);
    }
  } else {
    const length = Math.max(0.1, wall.sz - lengthInset);
    for (const face of [-1, 1] as const) {
      box(`${wall.id}:casing:${face}`, root, [wall.cx + face * (wall.sx / 2 + protrusion), ORDINARY_CASING_CENTER_Y, wall.cz], [thickness, 0.072, length], value);
    }
  }
}

function addOutlet(
  renderer: WorldRenderer,
  cache: OrdinaryPresentationCache,
  visual: CellVisual,
  wall: WallSpec,
  u: number,
  faceSign: -1 | 1
): void {
  const descriptor = visual.descriptor;
  const root = visual.root;
  const plateMaterial = outletPlateMaterial(cache);
  const slotMaterial = outletSlotMaterial(cache);
  const halfSurface = wall.orientation === 'z' ? wall.sz / 2 : wall.sx / 2;
  const surfaceOffset = faceSign * (halfSurface + 0.022);
  const alongStart = wall.orientation === 'z' ? wall.cx - wall.sx / 2 : wall.cz - wall.sz / 2;
  const alongLength = wall.orientation === 'z' ? wall.sx : wall.sz;
  const along = alongStart + alongLength * u;
  const localX = wall.orientation === 'z' ? along : wall.cx + surfaceOffset;
  const localZ = wall.orientation === 'z' ? wall.cz + surfaceOffset : along;
  const plateScale: [number, number, number] = wall.orientation === 'z' ? [0.12, 0.17, 0.025] : [0.025, 0.17, 0.12];
  const id = `${wall.id}:outlet`;
  const plate = box(id, root, [localX, ORDINARY_OUTLET_CENTER_Y, localZ], plateScale, plateMaterial);

  const slotSurface = faceSign * 0.017;
  for (const side of [-1, 1] as const) {
    if (wall.orientation === 'z') {
      box(`${id}:slot:${side}`, root, [localX + side * 0.024, ORDINARY_OUTLET_CENTER_Y + 0.012, localZ + slotSurface], [0.011, 0.045, 0.008], slotMaterial);
    } else {
      box(`${id}:slot:${side}`, root, [localX + slotSurface, ORDINARY_OUTLET_CENTER_Y + 0.012, localZ + side * 0.024], [0.008, 0.045, 0.011], slotMaterial);
    }
  }

  const interaction: OutletInteractionVisual = {
    kind: 'outlet',
    id,
    entity: plate,
    wallId: wall.id,
    x: descriptor.address.cellX * CELL_SIZE + localX,
    y: ORDINARY_OUTLET_CENTER_Y,
    z: descriptor.address.cellZ * CELL_SIZE + localZ
  };
  const boundary = interaction as unknown as InteractionVisual;
  visual.interactions.push(boundary);
  renderer.interactions.set(id, boundary);
}

function eligibleOrdinaryWall(descriptor: CellDescriptor, wall: WallSpec): boolean {
  return descriptor.world.regionId === 'ordinary-level-0'
    && wall.materialId !== 'arch-pale-wallpaper'
    && wall.drawable
    && wall.cy - wall.sy / 2 <= 0.04;
}

function applyOrdinaryWallpaperPresentation(renderer: WorldRenderer, visual: CellVisual): void {
  const descriptor = visual.descriptor;
  if (descriptor.world.generationVersion !== 'gen3-v1' || descriptor.world.regionId !== 'ordinary-level-0') return;
  const cache = cacheFor(renderer);
  const seed = (renderer as unknown as RendererAccess).save.seed;

  for (const wall of descriptor.walls) {
    if (!eligibleOrdinaryWall(descriptor, wall)) continue;
    const decision = ordinaryWallpaperDecision(seed, descriptor.address.cellX, descriptor.address.cellZ, wall);
    if (decision.splitWith === 'C' && decision.splitFraction !== undefined) {
      renderSplitWallpaper(cache, descriptor, visual.root, wall, decision.splitFraction, decision.cOnPositiveSide ?? true);
    } else {
      setMaterial(entityByName(visual.root, wall.id), wallpaperMaterial(cache, descriptor, wall, decision.primary));
    }

    if (ordinaryCasingEnabled(seed, descriptor.address.cellX, descriptor.address.cellZ, wall)) addCasing(cache, visual.root, wall);
    const outlet = ordinaryOutletPlacement(seed, descriptor.address.cellX, descriptor.address.cellZ, wall);
    if (outlet.enabled) addOutlet(renderer, cache, visual, wall, outlet.u, outlet.faceSign);
  }
}

/**
 * Presentation-only Ordinary Level 0 wallpaper/casing/outlet layer. It consumes
 * stable generated wall identity and world coordinates but never changes topology,
 * collision, streaming ownership, Region identity, or save data.
 */
export function installOrdinaryWallpaperPresentation(): void {
  if (installed) return;
  installed = true;
  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function patchedOrdinaryWallpaperLoad(
    this: WorldRenderer,
    descriptor: CellDescriptor
  ): void {
    originalLoadCell.call(this, descriptor);
    const visual = this.loaded.get(descriptor.id);
    if (visual) applyOrdinaryWallpaperPresentation(this, visual);
  };
}
