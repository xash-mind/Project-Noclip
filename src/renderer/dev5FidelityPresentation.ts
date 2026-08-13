import * as pc from 'playcanvas';
import type { CellDescriptor, WallSpec } from '../world/types.js';
import { WorldRenderer } from './WorldRenderer.js';
import { canvasTexture, makeMaterial, type CellVisual } from './support.js';
import { paintLevel0ChevronWallpaper, shouldGen3WallCollide, wallpaperUvForWall } from './dev5Wallpaper.js';

interface RendererAccess {
  app: pc.Application;
}

interface PresentationCache {
  wallpaper: pc.Texture;
  carpet: pc.Texture;
  ceiling: pc.Texture;
  materials: Map<string, pc.StandardMaterial>;
}

const caches = new WeakMap<WorldRenderer, PresentationCache>();
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

function cacheFor(renderer: WorldRenderer): PresentationCache {
  const existing = caches.get(renderer);
  if (existing) return existing;
  const app = (renderer as unknown as RendererAccess).app;
  const created: PresentationCache = {
    wallpaper: createWallpaperTexture(app),
    carpet: canvasTexture(app, 'carpet', 0),
    ceiling: canvasTexture(app, 'ceiling', 0),
    materials: new Map()
  };
  caches.set(renderer, created);
  return created;
}

function material(cache: PresentationCache, key: string, factory: () => pc.StandardMaterial): pc.StandardMaterial {
  const existing = cache.materials.get(key);
  if (existing) return existing;
  const created = factory();
  cache.materials.set(key, created);
  return created;
}

function setMaterial(entity: pc.Entity | undefined, value: pc.StandardMaterial): void {
  if (entity?.render) entity.render.material = value;
}

function wallMaterial(cache: PresentationCache, descriptor: CellDescriptor, wall: WallSpec): pc.StandardMaterial {
  const arch = descriptor.world.regionId === 'arch-rooms';
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

function floorMaterial(cache: PresentationCache, descriptor: CellDescriptor): pc.StandardMaterial {
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

function ceilingMaterial(cache: PresentationCache, descriptor: CellDescriptor): pc.StandardMaterial {
  const arch = descriptor.world.regionId === 'arch-rooms';
  const key = `ceiling:${arch ? 'arch' : 'ordinary'}`;
  return material(cache, key, () => makeMaterial(arch ? [0.98, 0.975, 0.91] : [0.93, 0.91, 0.81], cache.ceiling, [4, 4]));
}

function fixtureMaterial(cache: PresentationCache, descriptor: CellDescriptor, state: 'on' | 'off' | 'flicker'): pc.StandardMaterial {
  const arch = descriptor.world.regionId === 'arch-rooms';
  const active = state !== 'off';
  const key = `fixture:${arch ? 'arch' : 'ordinary'}:${state}`;
  return material(cache, key, () => makeMaterial(
    active ? (arch ? [0.99, 0.985, 0.83] : [0.98, 0.955, 0.76]) : [0.31, 0.31, 0.27],
    undefined,
    [1, 1],
    active ? (arch ? [1, 0.985, 0.78] : [1, 0.95, 0.68]) : [0.01, 0.01, 0.008],
    active ? (state === 'flicker' ? 1.35 : arch ? 2.18 : 2.28) : 0.02
  ));
}

function applyGen3Presentation(renderer: WorldRenderer, visual: CellVisual): void {
  const descriptor = visual.descriptor;
  if (descriptor.world.generationVersion !== 'gen3-v1') return;
  const cache = cacheFor(renderer);
  const root = visual.root;

  // The game uses a 2D navigation solver. Overhead Arch headers/piers must not
  // become invisible floor blockers; decorative lower panels and full-height
  // terminations still retain collision because they reach the floor.
  const wallSpecs = new Map(descriptor.walls.map((wall) => [wall.id, wall]));
  visual.colliders = visual.colliders.filter((collider) => {
    const wall = wallSpecs.get(collider.id);
    if (!wall || shouldGen3WallCollide(wall)) return true;
    renderer.walls.delete(collider.id);
    return false;
  });

  // Remove the inherited 22 cm brown wood strip. REF-L0-001 still supports a
  // shallow base detail, but dev.5 deliberately does not encode that tiny detail
  // as separate geometry: avoiding protruding ends/doubled corners is more robust.
  for (const child of childrenOf(root)) if (child.name.endsWith(':skirting')) child.destroy();

  setMaterial(entityByName(root, 'floor'), floorMaterial(cache, descriptor));
  setMaterial(entityByName(root, 'ceiling'), ceilingMaterial(cache, descriptor));

  for (const wall of descriptor.walls) setMaterial(entityByName(root, wall.id), wallMaterial(cache, descriptor, wall));

  for (const group of descriptor.lightGroups) {
    const fixture = fixtureMaterial(cache, descriptor, group.state);
    group.fixtures.forEach((_position, index) => setMaterial(entityByName(root, `${group.id}:fixture:${index}`), fixture));
  }
}

/**
 * Install the bounded dev.5 presentation pass without changing geography. The
 * canonical renderer still owns Cells/colliders; this pass only replaces Gen3
 * Materials and collision presentation after a Cell is realized.
 */
export function installDev5FidelityPresentation(): void {
  if (installed) return;
  installed = true;
  const original = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function patchedLoadCell(this: WorldRenderer, descriptor: CellDescriptor): void {
    original.call(this, descriptor);
    const visual = this.loaded.get(descriptor.id);
    if (visual) applyGen3Presentation(this, visual);
  };
}
