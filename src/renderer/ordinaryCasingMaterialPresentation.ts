import * as pc from 'playcanvas';
import type { CellDescriptor, WallSpec } from '../world/types.js';
import { ORDINARY_CASING_CENTER_Y, ordinaryCasingEnabled } from './ordinaryWallpaperRules.js';
import { WorldRenderer } from './WorldRenderer.js';

export const ORDINARY_CASING_HEIGHT_METERS = 0.09;

interface CasingMaterialCache {
  textures: Map<string, pc.Texture>;
  materials: WeakMap<pc.StandardMaterial, Map<string, pc.StandardMaterial>>;
}

interface RendererAccess {
  app: pc.Application;
  save: { seed: string };
}

interface DetailMapStandardMaterial extends pc.StandardMaterial {
  diffuseDetailMap: pc.Texture | null;
  diffuseDetailMapTiling: pc.Vec2;
  diffuseDetailMapOffset: pc.Vec2;
}

type NamedMaterial = pc.StandardMaterial & { name?: string };

const caches = new WeakMap<WorldRenderer, CasingMaterialCache>();
let installed = false;

function childrenOf(entity: pc.Entity): pc.Entity[] {
  return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children];
}

function entityByName(root: pc.Entity, name: string): pc.Entity | undefined {
  return childrenOf(root).find((child) => child.name === name);
}

function materialName(material: pc.StandardMaterial): string {
  return (material as unknown as NamedMaterial).name ?? 'ordinary-wallpaper';
}

function setMaterialName(material: pc.StandardMaterial, name: string): void {
  (material as unknown as NamedMaterial).name = name;
}

function cacheFor(renderer: WorldRenderer): CasingMaterialCache {
  const existing = caches.get(renderer);
  if (existing) return existing;
  const created: CasingMaterialCache = { textures: new Map(), materials: new WeakMap() };
  caches.set(renderer, created);
  return created;
}

function wallProfileKey(wall: WallSpec): string {
  const bottom = wall.cy - wall.sy / 2;
  return `${wall.sy.toFixed(4)}:${bottom.toFixed(4)}`;
}

function casingDetailTexture(renderer: WorldRenderer, wall: WallSpec): pc.Texture {
  const cache = cacheFor(renderer);
  const key = wallProfileKey(wall);
  const existing = cache.textures.get(key);
  if (existing) return existing;

  const app = (renderer as unknown as RendererAccess).app;
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Casing detail texture unavailable');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const bottom = wall.cy - wall.sy / 2;
  const normalizedHeight = Math.max(0, Math.min(1, (ORDINARY_CASING_CENTER_Y - bottom) / wall.sy));
  const centerRow = Math.round((1 - normalizedHeight) * (canvas.height - 1));
  const pixelHeight = Math.max(7, Math.round((ORDINARY_CASING_HEIGHT_METERS / wall.sy) * canvas.height));
  const top = Math.max(1, Math.min(canvas.height - pixelHeight - 1, centerRow - Math.floor(pixelHeight / 2)));

  context.fillStyle = 'rgb(137, 124, 68)';
  context.fillRect(0, top, canvas.width, pixelHeight);
  context.fillStyle = 'rgb(190, 174, 104)';
  context.fillRect(0, top, canvas.width, 2);
  context.fillStyle = 'rgb(82, 73, 38)';
  context.fillRect(0, top + pixelHeight - 2, canvas.width, 2);

  const texture = new pc.Texture(app.graphicsDevice, { mipmaps: false });
  texture.addressU = pc.ADDRESS_REPEAT;
  texture.addressV = (pc as unknown as { ADDRESS_CLAMP_TO_EDGE: number }).ADDRESS_CLAMP_TO_EDGE;
  texture.minFilter = pc.FILTER_LINEAR;
  texture.magFilter = pc.FILTER_LINEAR;
  texture.setSource(canvas);
  cache.textures.set(key, texture);
  return texture;
}

export function ordinaryCasingMaterial(renderer: WorldRenderer, base: pc.StandardMaterial, wall: WallSpec): pc.StandardMaterial {
  const cache = cacheFor(renderer);
  let variants = cache.materials.get(base);
  if (!variants) {
    variants = new Map();
    cache.materials.set(base, variants);
  }
  const key = wallProfileKey(wall);
  const existing = variants.get(key);
  if (existing) return existing;

  const created = base.clone() as pc.StandardMaterial;
  setMaterialName(created, `${materialName(base)}:casing`);
  const detail = created as unknown as DetailMapStandardMaterial;
  detail.diffuseDetailMap = casingDetailTexture(renderer, wall);
  detail.diffuseDetailMapTiling = new pc.Vec2(1, 1);
  detail.diffuseDetailMapOffset = new pc.Vec2(0, 0);
  created.update();
  variants.set(key, created);
  return created;
}

function applyMaterialCasing(renderer: WorldRenderer, descriptor: CellDescriptor): void {
  if (descriptor.world.generationVersion !== 'gen3-v1' || descriptor.world.regionId !== 'ordinary-level-0') return;
  const visual = renderer.loaded.get(descriptor.id);
  if (!visual) return;
  const seed = (renderer as unknown as RendererAccess).save.seed;

  for (const wall of descriptor.walls) {
    if (!ordinaryCasingEnabled(seed, descriptor.address.cellX, descriptor.address.cellZ, wall)) continue;
    for (const name of [wall.id, `${wall.id}:split-c`]) {
      const entity = entityByName(visual.root, name);
      const base = entity?.render?.material;
      if (!entity?.render || !(base instanceof pc.StandardMaterial)) continue;
      entity.render.material = ordinaryCasingMaterial(renderer, base, wall);
    }
  }
}

export function installOrdinaryCasingMaterialPresentation(): void {
  if (installed) return;
  installed = true;
  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function ordinaryCasingMaterialLoad(
    this: WorldRenderer,
    descriptor: CellDescriptor
  ): void {
    originalLoadCell.call(this, descriptor);
    applyMaterialCasing(this, descriptor);
  };
}
