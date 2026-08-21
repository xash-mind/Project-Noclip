import * as pc from 'playcanvas';
import { CELL_SIZE, type CellDescriptor, type WallSpec } from '../world/types.js';
import { ordinaryCasingMaterial } from './ordinaryCasingMaterialPresentation.js';
import {
  noteOrdinaryWallpaperFallback,
  ordinaryWallpaperAssetDiagnostics,
  ordinaryWallpaperImage
} from './ordinaryWallpaperAssets.js';
import {
  ORDINARY_CASING_RUN_CHANCE,
  ORDINARY_OUTLET_CENTER_Y,
  ORDINARY_WALLPAPER_IMAGE_TILE_METERS,
  ordinaryOutletFaceSign,
  ordinaryOutletPlacement,
  ordinaryWallpaperDecision,
  ordinaryWallpaperUv,
  type OrdinaryWallpaperFamily
} from './ordinaryWallpaperRules.js';
import { WorldRenderer } from './WorldRenderer.js';
import { makeMaterial, type CellVisual, type InteractionVisual } from './support.js';

interface RendererAccess {
  app: pc.Application;
  save: { seed: string };
}

type NamedMaterial = pc.StandardMaterial & { name?: string };

interface OrdinaryPresentationCache {
  wallpapers: Readonly<Record<OrdinaryWallpaperFamily, pc.Texture>>;
  materials: Map<string, pc.StandardMaterial>;
  showcase?: pc.Entity;
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

export interface OrdinaryWallpaperPresentationDiagnostics {
  assets: ReturnType<typeof ordinaryWallpaperAssetDiagnostics>;
  wallA: number;
  wallB: number;
  splitC: number;
  casingRuns: number;
  outlets: number;
  worldScaleMeters: number;
  casingChance: number;
}

export interface OrdinaryWallpaperQaBridge {
  diagnostics(): OrdinaryWallpaperPresentationDiagnostics;
  showcase(): OrdinaryWallpaperPresentationDiagnostics;
  clearShowcase(): void;
}

declare global {
  interface Window {
    __projectNoclipWallpaper?: OrdinaryWallpaperQaBridge;
  }
}

const caches = new WeakMap<WorldRenderer, OrdinaryPresentationCache>();
let installed = false;
let latestRenderer: WorldRenderer | undefined;

function childrenOf(entity: pc.Entity): pc.Entity[] {
  return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children];
}

function entityByName(root: pc.Entity, name: string): pc.Entity | undefined {
  return childrenOf(root).find((child) => child.name === name);
}

function materialName(material: pc.StandardMaterial | undefined): string {
  return material ? ((material as unknown as NamedMaterial).name ?? '') : '';
}

function setMaterialName(material: pc.StandardMaterial, name: string): void {
  (material as unknown as NamedMaterial).name = name;
}

function diagnosticCanvas(family: OrdinaryWallpaperFamily): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Wallpaper diagnostic canvas unavailable');
  context.fillStyle = '#ff00ff';
  context.fillRect(0, 0, 128, 128);
  context.fillStyle = '#101010';
  for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) if ((x + y) % 2 === 0) context.fillRect(x * 32, y * 32, 32, 32);
  context.fillStyle = '#ffffff';
  context.font = 'bold 28px sans-serif';
  context.fillText(family, 52, 74);
  return canvas;
}

function createAssetTexture(app: pc.Application, family: OrdinaryWallpaperFamily): pc.Texture {
  const texture = new pc.Texture(app.graphicsDevice, { mipmaps: true });
  texture.addressU = pc.ADDRESS_REPEAT;
  texture.addressV = pc.ADDRESS_REPEAT;
  texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
  texture.magFilter = pc.FILTER_LINEAR;
  const image = ordinaryWallpaperImage(family);
  if (image) texture.setSource(image);
  else {
    noteOrdinaryWallpaperFallback();
    console.error(`[Level 0 wallpaper] ${family} reached material creation before its real decoded image; using diagnostic magenta fallback.`);
    texture.setSource(diagnosticCanvas(family));
  }
  return texture;
}

function cacheFor(renderer: WorldRenderer): OrdinaryPresentationCache {
  const existing = caches.get(renderer);
  if (existing) return existing;
  const app = (renderer as unknown as RendererAccess).app;
  const created: OrdinaryPresentationCache = {
    wallpapers: Object.freeze({
      A: createAssetTexture(app, 'A'),
      B: createAssetTexture(app, 'B'),
      C: createAssetTexture(app, 'C')
    }),
    materials: new Map()
  };
  caches.set(renderer, created);
  latestRenderer = renderer;
  installQaBridge(renderer);
  return created;
}

function material(cache: OrdinaryPresentationCache, key: string, factory: () => pc.StandardMaterial): pc.StandardMaterial {
  const existing = cache.materials.get(key);
  if (existing) return existing;
  const created = factory();
  cache.materials.set(key, created);
  return created;
}

function wallpaperMaterialForUv(
  cache: OrdinaryPresentationCache,
  family: OrdinaryWallpaperFamily,
  tiling: readonly [number, number],
  offset: readonly [number, number]
): pc.StandardMaterial {
  const key = `ordinary-wallpaper:${family}:${tiling.map((value) => value.toFixed(4)).join(',')}:${offset.map((value) => value.toFixed(4)).join(',')}`;
  return material(cache, key, () => {
    const mutableTiling: [number, number] = [tiling[0], tiling[1]];
    const mutableOffset: [number, number] = [offset[0], offset[1]];
    const result = makeMaterial([0.96, 0.95, 0.92], cache.wallpapers[family], mutableTiling, undefined, 1, mutableOffset);
    setMaterialName(result, `ordinary-wallpaper:${family}`);
    result.update();
    return result;
  });
}

function wallpaperMaterial(
  cache: OrdinaryPresentationCache,
  descriptor: CellDescriptor,
  wall: WallSpec,
  family: OrdinaryWallpaperFamily
): pc.StandardMaterial {
  const uv = ordinaryWallpaperUv(descriptor.address.cellX, descriptor.address.cellZ, wall);
  return wallpaperMaterialForUv(cache, family, uv.tiling, uv.offset);
}

function setMaterial(entity: pc.Entity | undefined, value: pc.StandardMaterial): void {
  if (entity?.render) entity.render.material = value;
}

function box(
  name: string,
  parent: pc.Entity,
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
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

function outletPlateMaterial(cache: OrdinaryPresentationCache): pc.StandardMaterial {
  return material(cache, 'ordinary-outlet-plate', () => {
    const result = makeMaterial([0.61, 0.58, 0.36]);
    setMaterialName(result, 'ordinary-outlet-plate');
    result.gloss = 0.035;
    result.update();
    return result;
  });
}

function outletSlotMaterial(cache: OrdinaryPresentationCache): pc.StandardMaterial {
  return material(cache, 'ordinary-outlet-slot', () => {
    const result = makeMaterial([0.16, 0.14, 0.065]);
    setMaterialName(result, 'ordinary-outlet-slot');
    return result;
  });
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
  const halfSurface = wall.orientation === 'z' ? wall.sz / 2 : wall.sx / 2;
  const surfaceOffset = faceSign * (halfSurface + 0.022);
  const alongStart = wall.orientation === 'z' ? wall.cx - wall.sx / 2 : wall.cz - wall.sz / 2;
  const alongLength = wall.orientation === 'z' ? wall.sx : wall.sz;
  const along = alongStart + alongLength * u;
  const localX = wall.orientation === 'z' ? along : wall.cx + surfaceOffset;
  const localZ = wall.orientation === 'z' ? wall.cz + surfaceOffset : along;
  const plateScale: [number, number, number] = wall.orientation === 'z' ? [0.13, 0.18, 0.025] : [0.025, 0.18, 0.13];
  const id = `${wall.id}:outlet`;
  const plate = box(id, visual.root, [localX, ORDINARY_OUTLET_CENTER_Y, localZ], plateScale, outletPlateMaterial(cache));
  const slotSurface = faceSign * 0.017;
  for (const side of [-1, 1] as const) {
    if (wall.orientation === 'z') box(`${id}:slot:${side}`, visual.root, [localX + side * 0.026, ORDINARY_OUTLET_CENTER_Y + 0.012, localZ + slotSurface], [0.012, 0.048, 0.008], outletSlotMaterial(cache));
    else box(`${id}:slot:${side}`, visual.root, [localX + slotSurface, ORDINARY_OUTLET_CENTER_Y + 0.012, localZ + side * 0.026], [0.008, 0.048, 0.012], outletSlotMaterial(cache));
  }

  const interaction: OutletInteractionVisual = {
    kind: 'outlet', id, entity: plate, wallId: wall.id,
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
    if (decision.splitWith === 'C' && decision.splitFraction !== undefined) renderSplitWallpaper(cache, descriptor, visual.root, wall, decision.splitFraction, decision.cOnPositiveSide ?? true);
    else setMaterial(entityByName(visual.root, wall.id), wallpaperMaterial(cache, descriptor, wall, decision.primary));

    const outlet = ordinaryOutletPlacement(seed, descriptor.address.cellX, descriptor.address.cellZ, wall);
    if (!outlet.enabled) continue;
    const faceSign = ordinaryOutletFaceSign(descriptor.walls, wall, outlet.u, outlet.faceSign);
    if (faceSign !== undefined) addOutlet(renderer, cache, visual, wall, outlet.u, faceSign);
  }
}

export function ordinaryWallpaperPresentationDiagnostics(renderer: WorldRenderer | undefined = latestRenderer): OrdinaryWallpaperPresentationDiagnostics {
  const assets = ordinaryWallpaperAssetDiagnostics();
  if (!renderer) return { assets, wallA: 0, wallB: 0, splitC: 0, casingRuns: 0, outlets: 0, worldScaleMeters: ORDINARY_WALLPAPER_IMAGE_TILE_METERS, casingChance: ORDINARY_CASING_RUN_CHANCE };
  let wallA = 0; let wallB = 0; let splitC = 0;
  const casingRuns = new Set<string>();
  const outletIds = new Set<string>();
  for (const visual of renderer.loaded.values()) {
    if (visual.descriptor.world.regionId !== 'ordinary-level-0') continue;
    for (const child of childrenOf(visual.root)) {
      const name = materialName(child.render?.material as pc.StandardMaterial | undefined);
      if (name.startsWith('ordinary-wallpaper:A')) wallA += 1;
      else if (name.startsWith('ordinary-wallpaper:B')) wallB += 1;
      else if (name.startsWith('ordinary-wallpaper:C')) splitC += 1;
      if (name.includes(':casing')) casingRuns.add(child.name.replace(':split-c', ''));
    }
    for (const interaction of visual.interactions) if ((interaction as unknown as { kind?: string }).kind === 'outlet') outletIds.add(interaction.id);
  }
  return { assets, wallA, wallB, splitC, casingRuns: casingRuns.size, outlets: outletIds.size, worldScaleMeters: ORDINARY_WALLPAPER_IMAGE_TILE_METERS, casingChance: ORDINARY_CASING_RUN_CHANCE };
}

function clearShowcase(renderer: WorldRenderer): void {
  const cache = caches.get(renderer);
  cache?.showcase?.destroy();
  if (cache) cache.showcase = undefined;
}

function showShowcase(renderer: WorldRenderer): void {
  const cache = cacheFor(renderer);
  clearShowcase(renderer);
  const app = (renderer as unknown as RendererAccess).app;
  const camera = childrenOf(app.root).find((child) => child.name === 'player-camera');
  if (!camera) throw new Error('Wallpaper inspection requires player-camera');
  const root = new pc.Entity('wallpaper-inspection-showcase');
  camera.addChild(root);
  root.setLocalPosition(0, -0.25, -5.4);
  cache.showcase = root;

  const panelWidth = 1.08;
  const panelHeight = 1.8;
  const panelTiling: [number, number] = [panelWidth / ORDINARY_WALLPAPER_IMAGE_TILE_METERS, panelHeight / ORDINARY_WALLPAPER_IMAGE_TILE_METERS];
  const a = wallpaperMaterialForUv(cache, 'A', panelTiling, [0, 0]);
  const b = wallpaperMaterialForUv(cache, 'B', panelTiling, [0, 0]);
  const c = wallpaperMaterialForUv(cache, 'C', panelTiling, [0, 0]);
  box('qa-wall-a', root, [-2.5, 0, 0], [panelWidth, panelHeight, 0.06], a);
  box('qa-wall-b', root, [-1.25, 0, 0], [panelWidth, panelHeight, 0.06], b);
  box('qa-wall-split-a', root, [-0.27, 0, 0], [0.54, panelHeight, 0.06], a);
  box('qa-wall-split-c', root, [0.27, 0, 0], [0.54, panelHeight, 0.06], c);

  const qaWall: WallSpec = {
    id: 'qa-casing-wall', cx: 0, cy: panelHeight / 2, cz: 0,
    sx: panelWidth, sy: panelHeight, sz: 0.28, orientation: 'z', drawable: true,
    materialId: 'level-0-wallpaper', materialVariant: 0
  };
  const cased = ordinaryCasingMaterial(renderer, a, qaWall);
  box('qa-wall-casing', root, [1.25, 0, 0], [panelWidth, panelHeight, 0.06], cased);

  box('qa-wall-outlet', root, [2.5, 0, 0], [panelWidth, panelHeight, 0.06], a);
  box('qa-outlet-plate', root, [2.5, -0.46, 0.055], [0.13, 0.18, 0.025], outletPlateMaterial(cache));
  for (const side of [-1, 1] as const) box(`qa-outlet-slot:${side}`, root, [2.5 + side * 0.026, -0.45, 0.073], [0.012, 0.048, 0.008], outletSlotMaterial(cache));
}

function installQaBridge(renderer: WorldRenderer): void {
  window.__projectNoclipWallpaper = {
    diagnostics: () => ordinaryWallpaperPresentationDiagnostics(renderer),
    showcase: () => { showShowcase(renderer); return ordinaryWallpaperPresentationDiagnostics(renderer); },
    clearShowcase: () => clearShowcase(renderer)
  };
}

export function installOrdinaryWallpaperPresentation(): void {
  if (installed) return;
  installed = true;
  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function patchedOrdinaryWallpaperLoad(this: WorldRenderer, descriptor: CellDescriptor): void {
    originalLoadCell.call(this, descriptor);
    const visual = this.loaded.get(descriptor.id);
    if (visual) applyOrdinaryWallpaperPresentation(this, visual);
  };
}
