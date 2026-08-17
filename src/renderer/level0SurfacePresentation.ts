import * as pc from 'playcanvas';
import type { CellDescriptor, LightState, PropSpec, WallSpec } from '../world/types.js';
import { WorldRenderer } from './WorldRenderer.js';
import { canvasTexture, makeMaterial, type CellVisual } from './support.js';
import {
  paintLevel0ChevronWallpaper,
  shouldGen3WallCollide,
  wallpaperUvForWall
} from './level0Wallpaper.js';

interface RendererAccess {
  app: pc.Application;
}

interface SurfacePresentationCache {
  wallpaper: pc.Texture;
  carpet: pc.Texture;
  ceiling: pc.Texture;
  materials: Map<string, pc.StandardMaterial>;
}

const caches = new WeakMap<WorldRenderer, SurfacePresentationCache>();
let installed = false;

function childrenOf(entity: pc.Entity): pc.Entity[] {
  return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children];
}

function entityByName(root: pc.Entity, name: string): pc.Entity | undefined {
  return childrenOf(root).find((child) => child.name === name);
}

function createWallpaperTexture(app: pc.Application): pc.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas texture unavailable');
  paintLevel0ChevronWallpaper(context, 256);
  const texture = new pc.Texture(app.graphicsDevice, { mipmaps: true });
  texture.addressU = pc.ADDRESS_REPEAT;
  texture.addressV = pc.ADDRESS_REPEAT;
  texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
  texture.magFilter = pc.FILTER_LINEAR;
  texture.setSource(canvas);
  return texture;
}

function cacheFor(renderer: WorldRenderer): SurfacePresentationCache {
  const existing = caches.get(renderer);
  if (existing) return existing;
  const app = (renderer as unknown as RendererAccess).app;
  const created: SurfacePresentationCache = {
    wallpaper: createWallpaperTexture(app),
    carpet: canvasTexture(app, 'carpet', 0),
    ceiling: canvasTexture(app, 'ceiling', 0),
    materials: new Map()
  };
  caches.set(renderer, created);
  return created;
}

function material(
  cache: SurfacePresentationCache,
  key: string,
  factory: () => pc.StandardMaterial
): pc.StandardMaterial {
  const existing = cache.materials.get(key);
  if (existing) return existing;
  const created = factory();
  cache.materials.set(key, created);
  return created;
}

function setMaterial(entity: pc.Entity | undefined, value: pc.StandardMaterial): void {
  if (entity?.render) entity.render.material = value;
}

function wallMaterial(
  cache: SurfacePresentationCache,
  descriptor: CellDescriptor,
  wall: WallSpec
): pc.StandardMaterial {
  const arch = wall.materialId === 'arch-pale-wallpaper';
  const lowerPanel = arch && wall.sy > 0.92 && wall.sy < 1.08 && wall.cy > 0.45 && wall.cy < 0.56;
  const uv = wallpaperUvForWall(descriptor.address.cellX, descriptor.address.cellZ, wall);
  const tint: [number, number, number] = lowerPanel
    ? [0.89, 0.885, 0.82]
    : arch
      ? [0.98, 0.975, 0.93]
      : [0.94, 0.925, 0.86];
  const key = `wall:${arch ? 'arch' : 'ordinary'}:${lowerPanel ? 'panel' : 'field'}:${uv.tiling.map((value) => value.toFixed(4)).join(',')}:${uv.offset.map((value) => value.toFixed(4)).join(',')}`;
  return material(cache, key, () => makeMaterial(tint, cache.wallpaper, uv.tiling, undefined, 1, uv.offset));
}

function floorMaterial(cache: SurfacePresentationCache, descriptor: CellDescriptor): pc.StandardMaterial {
  const arch = descriptor.world.regionId === 'arch-rooms';
  const key = `floor:${arch ? 'arch' : 'ordinary'}`;
  return material(cache, key, () => {
    const result = makeMaterial(arch ? [0.67, 0.625, 0.51] : [0.79, 0.72, 0.55], cache.carpet, [5, 5]);
    if (arch) {
      result.gloss = 0.11;
      result.update();
    }
    return result;
  });
}

function ceilingMaterial(cache: SurfacePresentationCache, descriptor: CellDescriptor): pc.StandardMaterial {
  const arch = descriptor.world.regionId === 'arch-rooms';
  const key = `ceiling:${arch ? 'arch' : 'ordinary'}`;
  return material(cache, key, () => makeMaterial(arch ? [0.98, 0.975, 0.91] : [0.93, 0.91, 0.81], cache.ceiling, [4, 4]));
}

function quantizedPulse(state: LightState, pulse: number): number {
  if (state === 'off') return 0;
  return Math.max(0, Math.min(1, Math.round(pulse * 16) / 16));
}

function fixtureMaterial(
  cache: SurfacePresentationCache,
  descriptor: CellDescriptor,
  state: LightState,
  pulse: number
): pc.StandardMaterial {
  const arch = descriptor.world.regionId === 'arch-rooms';
  const level = quantizedPulse(state, pulse);
  const key = `fixture:${arch ? 'arch' : 'ordinary'}:${state}:${level.toFixed(4)}`;
  return material(cache, key, () => {
    const activeDiffuse: [number, number, number] = arch ? [0.99, 0.985, 0.83] : [0.98, 0.955, 0.76];
    const offDiffuse: [number, number, number] = [0.31, 0.31, 0.27];
    const diffuse: [number, number, number] = [
      offDiffuse[0] + (activeDiffuse[0] - offDiffuse[0]) * level,
      offDiffuse[1] + (activeDiffuse[1] - offDiffuse[1]) * level,
      offDiffuse[2] + (activeDiffuse[2] - offDiffuse[2]) * level
    ];
    if (level <= 0.001) return makeMaterial(diffuse);
    const emissive: [number, number, number] = arch ? [1, 0.985, 0.78] : [1, 0.95, 0.68];
    return makeMaterial(diffuse, undefined, [1, 1], emissive, (arch ? 2.18 : 2.28) * level);
  });
}

function pillarWallpaperReferenceWall(prop: PropSpec): WallSpec {
  return {
    id: `${prop.id}:wallpaper`,
    cx: prop.position.x,
    cy: prop.position.y,
    cz: prop.position.z - prop.scale.z / 2,
    sx: prop.scale.x,
    sy: prop.scale.y,
    sz: 0.04,
    orientation: 'z',
    drawable: true,
    materialId: 'level-0-wallpaper',
    materialVariant: 0
  };
}

function replacePillarPresentation(
  cache: SurfacePresentationCache,
  descriptor: CellDescriptor,
  root: pc.Entity,
  prop: PropSpec
): void {
  const container = entityByName(root, prop.id);
  if (!container) return;
  for (const child of childrenOf(container)) {
    if (child.name.startsWith(`${prop.id}:wallpaper:`)) child.destroy();
  }
  const core = entityByName(container, `${prop.id}:body`);
  if (!core) return;
  setMaterial(core, wallMaterial(cache, descriptor, pillarWallpaperReferenceWall(prop)));
}

function setSurfaceMaterial(root: pc.Entity, kind: 'floor' | 'ceiling', value: pc.StandardMaterial): void {
  if (kind === 'ceiling') {
    setMaterial(entityByName(root, 'ceiling'), value);
    return;
  }
  setMaterial(entityByName(root, 'floor'), value);
  for (const child of childrenOf(root)) {
    if (child.name.startsWith('floor-piece:')) setMaterial(child, value);
  }
}

function applyGen3SurfacePresentation(renderer: WorldRenderer, visual: CellVisual): void {
  const descriptor = visual.descriptor;
  if (descriptor.world.generationVersion !== 'gen3-v1') return;
  const cache = cacheFor(renderer);
  const root = visual.root;

  // Upper Arch pieces are presentation geometry. The 2D movement solver may only
  // keep wall colliders that reach the floor.
  const wallSpecs = new Map(descriptor.walls.map((wall) => [wall.id, wall]));
  visual.colliders = visual.colliders.filter((collider) => {
    const wall = wallSpecs.get(collider.id);
    if (!wall || shouldGen3WallCollide(wall)) return true;
    renderer.walls.delete(collider.id);
    return false;
  });

  for (const child of childrenOf(root)) {
    if (child.name.endsWith(':skirting')) child.destroy();
  }

  setSurfaceMaterial(root, 'floor', floorMaterial(cache, descriptor));
  setSurfaceMaterial(root, 'ceiling', ceilingMaterial(cache, descriptor));
  for (const wall of descriptor.walls) setMaterial(entityByName(root, wall.id), wallMaterial(cache, descriptor, wall));
  for (const prop of descriptor.props) {
    if (prop.kind === 'column' && prop.materialId === 'level-0-wallpaper') {
      replacePillarPresentation(cache, descriptor, root, prop);
    }
  }
  for (const group of descriptor.lightGroups) {
    const pulse = group.state === 'off' ? 0 : 1;
    const value = fixtureMaterial(cache, descriptor, group.state, pulse);
    group.fixtures.forEach((_position, index) => setMaterial(entityByName(root, `${group.id}:fixture:${index}`), value));
  }
}

/**
 * Installs Generation 3 Level 0 surface presentation only. Deterministic world
 * descriptors remain renderer-independent; this layer owns wallpaper, base
 * carpet/ceiling materials, pillar faces, fixture mesh appearance, and the
 * floor-reaching collider filter required by the current 2D movement solver.
 */
export function installLevel0SurfacePresentation(): void {
  if (installed) return;
  installed = true;

  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function patchedSurfaceLoad(
    this: WorldRenderer,
    descriptor: CellDescriptor
  ): void {
    originalLoadCell.call(this, descriptor);
    const visual = this.loaded.get(descriptor.id);
    if (visual) applyGen3SurfacePresentation(this, visual);
  };
}