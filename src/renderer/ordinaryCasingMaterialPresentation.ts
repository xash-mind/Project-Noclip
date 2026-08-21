import * as pc from 'playcanvas';
import type { CellDescriptor, WallSpec } from '../world/types.js';
import { ORDINARY_CASING_CENTER_Y } from './ordinaryWallpaperRules.js';
import { WorldRenderer } from './WorldRenderer.js';

const CASING_DETAIL_PERIOD_METERS = 8;
const CASING_HEIGHT_METERS = 0.072;

interface CasingMaterialCache {
  detailTexture: pc.Texture;
  materials: WeakMap<pc.StandardMaterial, Map<string, pc.StandardMaterial>>;
}

interface RendererAccess {
  app: pc.Application;
}

interface DetailMapStandardMaterial extends pc.StandardMaterial {
  diffuseDetailMap: pc.Texture | null;
  diffuseDetailMapTiling: pc.Vec2;
  diffuseDetailMapOffset: pc.Vec2;
}

const caches = new WeakMap<WorldRenderer, CasingMaterialCache>();
let installed = false;

function childrenOf(entity: pc.Entity): pc.Entity[] {
  return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children];
}

function entityByName(root: pc.Entity, name: string): pc.Entity | undefined {
  return childrenOf(root).find((child) => child.name === name);
}

function wrap01(value: number): number {
  return ((value % 1) + 1) % 1;
}

function createCasingDetailTexture(app: pc.Application): pc.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Casing detail texture unavailable');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const lower = ORDINARY_CASING_CENTER_Y - CASING_HEIGHT_METERS / 2;
  const upper = ORDINARY_CASING_CENTER_Y + CASING_HEIGHT_METERS / 2;
  const top = Math.max(0, Math.floor((lower / CASING_DETAIL_PERIOD_METERS) * canvas.height));
  const bottom = Math.min(canvas.height, Math.ceil((upper / CASING_DETAIL_PERIOD_METERS) * canvas.height));
  const height = Math.max(2, bottom - top);

  // Multiply detail keeps this inside the existing wallpaper draw while giving
  // the reference casing its subdued olive-painted body and slight edge depth.
  context.fillStyle = 'rgb(132, 121, 70)';
  context.fillRect(0, top, canvas.width, height);
  context.fillStyle = 'rgb(176, 163, 101)';
  context.fillRect(0, top, canvas.width, 1);
  context.fillStyle = 'rgb(94, 84, 45)';
  context.fillRect(0, top + height - 1, canvas.width, 1);

  const texture = new pc.Texture(app.graphicsDevice, { mipmaps: true });
  texture.addressU = pc.ADDRESS_REPEAT;
  texture.addressV = pc.ADDRESS_REPEAT;
  texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
  texture.magFilter = pc.FILTER_LINEAR;
  texture.setSource(canvas);
  return texture;
}

function cacheFor(renderer: WorldRenderer): CasingMaterialCache {
  const existing = caches.get(renderer);
  if (existing) return existing;
  const app = (renderer as unknown as RendererAccess).app;
  const created: CasingMaterialCache = {
    detailTexture: createCasingDetailTexture(app),
    materials: new WeakMap()
  };
  caches.set(renderer, created);
  return created;
}

function casingMaterial(
  cache: CasingMaterialCache,
  base: pc.StandardMaterial,
  wall: WallSpec
): pc.StandardMaterial {
  let variants = cache.materials.get(base);
  if (!variants) {
    variants = new Map();
    cache.materials.set(base, variants);
  }
  const worldBottom = wall.cy - wall.sy / 2;
  const tilingY = wall.sy / CASING_DETAIL_PERIOD_METERS;
  const offsetY = wrap01(worldBottom / CASING_DETAIL_PERIOD_METERS);
  const key = `${tilingY.toFixed(5)}:${offsetY.toFixed(5)}`;
  const existing = variants.get(key);
  if (existing) return existing;

  const created = base.clone() as pc.StandardMaterial;
  const detail = created as unknown as DetailMapStandardMaterial;
  detail.diffuseDetailMap = cache.detailTexture;
  detail.diffuseDetailMapTiling = new pc.Vec2(1, tilingY);
  detail.diffuseDetailMapOffset = new pc.Vec2(0, offsetY);
  created.update();
  variants.set(key, created);
  return created;
}

function applyMaterialCasing(renderer: WorldRenderer, descriptor: CellDescriptor): void {
  if (descriptor.world.generationVersion !== 'gen3-v1' || descriptor.world.regionId !== 'ordinary-level-0') return;
  const visual = renderer.loaded.get(descriptor.id);
  if (!visual) return;
  const root = visual.root;
  const cache = cacheFor(renderer);

  for (const wall of descriptor.walls) {
    const casingParts = childrenOf(root).filter((child) => child.name.startsWith(`${wall.id}:casing:`));
    if (casingParts.length === 0) continue;
    for (const part of casingParts) part.destroy();

    for (const name of [wall.id, `${wall.id}:split-c`]) {
      const entity = entityByName(root, name);
      const base = entity?.render?.material;
      if (!entity?.render || !(base instanceof pc.StandardMaterial)) continue;
      entity.render.material = casingMaterial(cache, base, wall);
    }
  }
}

/**
 * Converts the common Ordinary lower-wall casing from transient helper meshes
 * into a multiply detail layer on the already-owned wallpaper material. This
 * preserves the deterministic 35% wall-run decision while adding no separate
 * casing draw batch or collision ownership.
 */
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
