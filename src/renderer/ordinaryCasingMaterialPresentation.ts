import * as pc from 'playcanvas';
import type { CellDescriptor, WallSpec } from '../world/types.js';
import {
  ORDINARY_CASING_CENTER_Y,
  ORDINARY_CASING_TERMINATION_SETBACK_FRACTION,
  ordinaryCasingEnabled,
  ordinaryCasingSpan
} from './ordinaryWallpaperRules.js';
import { WorldRenderer } from './WorldRenderer.js';
import { makeMaterial } from './support.js';

export const ORDINARY_CASING_HEIGHT_METERS = 0.09;
const ORDINARY_CASING_DEPTH_METERS = 0.026;

interface CasingPresentationCache {
  texture: pc.Texture;
  material: pc.StandardMaterial;
}

interface RendererAccess {
  app: pc.Application;
  save: { seed: string };
}

type NamedMaterial = pc.StandardMaterial & { name?: string };

export interface OrdinaryCasingPresentationDiagnostics {
  runs: number;
  strips: number;
  terminatingEnds: number;
  junctionEnds: number;
  setbackFraction: number;
}

const caches = new WeakMap<WorldRenderer, CasingPresentationCache>();
let installed = false;
let latestRenderer: WorldRenderer | undefined;

function childrenOf(entity: pc.Entity): pc.Entity[] {
  return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children];
}

function entityByName(root: pc.Entity, name: string): pc.Entity | undefined {
  return childrenOf(root).find((child) => child.name === name);
}

function setMaterialName(material: pc.StandardMaterial, name: string): void {
  (material as unknown as NamedMaterial).name = name;
}

function createCasingTexture(app: pc.Application): pc.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Casing strip texture unavailable');
  context.fillStyle = 'rgb(137, 124, 68)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgb(190, 174, 104)';
  context.fillRect(0, 0, canvas.width, 10);
  context.fillStyle = 'rgb(82, 73, 38)';
  context.fillRect(0, canvas.height - 10, canvas.width, 10);

  const texture = new pc.Texture(app.graphicsDevice, { mipmaps: false });
  texture.addressU = pc.ADDRESS_REPEAT;
  texture.addressV = (pc as unknown as { ADDRESS_CLAMP_TO_EDGE: number }).ADDRESS_CLAMP_TO_EDGE;
  texture.minFilter = pc.FILTER_LINEAR;
  texture.magFilter = pc.FILTER_LINEAR;
  texture.setSource(canvas);
  return texture;
}

function cacheFor(renderer: WorldRenderer): CasingPresentationCache {
  const existing = caches.get(renderer);
  if (existing) return existing;
  const app = (renderer as unknown as RendererAccess).app;
  const texture = createCasingTexture(app);
  const material = makeMaterial([1, 1, 1], texture);
  material.gloss = 0.035;
  setMaterialName(material, 'ordinary-casing-strip');
  material.update();
  const created = { texture, material };
  caches.set(renderer, created);
  latestRenderer = renderer;
  return created;
}

function box(
  name: string,
  parent: pc.Entity,
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
  material: pc.StandardMaterial
): pc.Entity {
  const entity = new pc.Entity(name);
  entity.addComponent('render', { type: 'box' });
  entity.setLocalPosition(position[0], position[1], position[2]);
  entity.setLocalScale(scale[0], scale[1], scale[2]);
  if (entity.render) entity.render.material = material;
  parent.addChild(entity);
  return entity;
}

function wallLength(wall: WallSpec): number {
  return wall.orientation === 'z' ? wall.sx : wall.sz;
}

function hasPresentedWall(root: pc.Entity, wall: WallSpec): boolean {
  return Boolean(entityByName(root, wall.id) || entityByName(root, `${wall.id}:split-c`));
}

function addFaceStrip(
  root: pc.Entity,
  wall: WallSpec,
  startU: number,
  endU: number,
  faceSign: -1 | 1,
  material: pc.StandardMaterial
): void {
  const fullLength = wallLength(wall);
  const length = fullLength * Math.max(0, endU - startU);
  if (length < 0.06) return;
  const alongStart = wall.orientation === 'z' ? wall.cx - wall.sx / 2 : wall.cz - wall.sz / 2;
  const along = alongStart + fullLength * ((startU + endU) / 2);
  const halfSurface = wall.orientation === 'z' ? wall.sz / 2 : wall.sx / 2;
  const surface = faceSign * (halfSurface + ORDINARY_CASING_DEPTH_METERS / 2 + 0.002);
  const position: [number, number, number] = wall.orientation === 'z'
    ? [along, ORDINARY_CASING_CENTER_Y, wall.cz + surface]
    : [wall.cx + surface, ORDINARY_CASING_CENTER_Y, along];
  const scale: [number, number, number] = wall.orientation === 'z'
    ? [length, ORDINARY_CASING_HEIGHT_METERS, ORDINARY_CASING_DEPTH_METERS]
    : [ORDINARY_CASING_DEPTH_METERS, ORDINARY_CASING_HEIGHT_METERS, length];
  box(`${wall.id}:casing:${faceSign > 0 ? 'positive' : 'negative'}`, root, position, scale, material);
}

function applyCasingPresentation(renderer: WorldRenderer, descriptor: CellDescriptor): void {
  if (descriptor.world.generationVersion !== 'gen3-v1' || descriptor.world.regionId !== 'ordinary-level-0') return;
  const visual = renderer.loaded.get(descriptor.id);
  if (!visual) return;
  const seed = (renderer as unknown as RendererAccess).save.seed;
  const material = cacheFor(renderer).material;

  for (const wall of descriptor.walls) {
    if (!wall.drawable || !ordinaryCasingEnabled(seed, descriptor.address.cellX, descriptor.address.cellZ, wall)) continue;
    if (!hasPresentedWall(visual.root, wall)) continue;
    const span = ordinaryCasingSpan(descriptor.walls, wall);
    addFaceStrip(visual.root, wall, span.startU, span.endU, -1, material);
    addFaceStrip(visual.root, wall, span.startU, span.endU, 1, material);
  }
}

export function ordinaryCasingPresentationDiagnostics(
  renderer: WorldRenderer | undefined = latestRenderer
): OrdinaryCasingPresentationDiagnostics {
  if (!renderer) {
    return { runs: 0, strips: 0, terminatingEnds: 0, junctionEnds: 0, setbackFraction: ORDINARY_CASING_TERMINATION_SETBACK_FRACTION };
  }
  const seed = (renderer as unknown as RendererAccess).save.seed;
  let runs = 0;
  let strips = 0;
  let terminatingEnds = 0;
  let junctionEnds = 0;
  for (const visual of renderer.loaded.values()) {
    const descriptor = visual.descriptor;
    if (descriptor.world.regionId !== 'ordinary-level-0') continue;
    for (const wall of descriptor.walls) {
      if (!wall.drawable || !ordinaryCasingEnabled(seed, descriptor.address.cellX, descriptor.address.cellZ, wall)) continue;
      const wallStrips = childrenOf(visual.root).filter((child) => child.name.startsWith(`${wall.id}:casing:`));
      if (wallStrips.length === 0) continue;
      runs += 1;
      strips += wallStrips.length;
      const span = ordinaryCasingSpan(descriptor.walls, wall);
      terminatingEnds += Number(!span.startConnected) + Number(!span.endConnected);
      junctionEnds += Number(span.startConnected) + Number(span.endConnected);
    }
  }
  return { runs, strips, terminatingEnds, junctionEnds, setbackFraction: ORDINARY_CASING_TERMINATION_SETBACK_FRACTION };
}

export function installOrdinaryCasingMaterialPresentation(): void {
  if (installed) return;
  installed = true;
  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function ordinaryCasingPresentationLoad(
    this: WorldRenderer,
    descriptor: CellDescriptor
  ): void {
    originalLoadCell.call(this, descriptor);
    applyCasingPresentation(this, descriptor);
  };
}
