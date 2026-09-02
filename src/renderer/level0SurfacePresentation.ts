import * as pc from 'playcanvas';
import { materialAssetId, materialColor, materialNumber, materialString } from '../presentation/materialRuntime.js';
import { archStructuralRole } from '../world/gen3ArchDividerSemantics.js';
import { CELL_SIZE, type CellDescriptor, type PropSpec, type WallSpec } from '../world/types.js';
import { applyLevel0WallpaperPresentation } from './level0WallpaperPresentation.js';
import { derivedPresentationTexture } from './presentationImageTextures.js';
import { applyLevel0CarpetMaterials, level0ArchFinishMaterial } from './level0PresentationMaterials.js';
import { WorldRenderer } from './WorldRenderer.js';
import { canvasTexture, makeMaterial, type CellVisual } from './support.js';
import { paintLevel0ChevronWallpaper, wallpaperUvForWall } from './level0Wallpaper.js';

interface RendererAccess { app: pc.Application; }
interface SurfacePresentationCache { app: pc.Application; wallpaper: pc.Texture; ceiling: pc.Texture; materials: Map<string, pc.StandardMaterial>; }
const caches = new WeakMap<WorldRenderer, SurfacePresentationCache>();

const CEILING_TARGET = 'material.level-0-ceiling';

function childrenOf(entity: pc.Entity): pc.Entity[] { return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children]; }
function entityByName(root: pc.Entity, name: string): pc.Entity | undefined { return childrenOf(root).find((child) => child.name === name); }
function createWallpaperTexture(app: pc.Application): pc.Texture {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256; const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas texture unavailable');
  paintLevel0ChevronWallpaper(context, 256); const texture = new pc.Texture(app.graphicsDevice, { mipmaps: true }); texture.addressU = pc.ADDRESS_REPEAT; texture.addressV = pc.ADDRESS_REPEAT; texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR; texture.magFilter = pc.FILTER_LINEAR; texture.setSource(canvas); return texture;
}
function cacheFor(renderer: WorldRenderer): SurfacePresentationCache {
  const existing = caches.get(renderer); if (existing) return existing; const app = (renderer as unknown as RendererAccess).app;
  const created: SurfacePresentationCache = { app, wallpaper: createWallpaperTexture(app), ceiling: canvasTexture(app, 'ceiling', 0), materials: new Map() }; caches.set(renderer, created); return created;
}
function material(cache: SurfacePresentationCache, key: string, factory: () => pc.StandardMaterial): pc.StandardMaterial { const existing = cache.materials.get(key); if (existing) return existing; const created = factory(); cache.materials.set(key, created); return created; }
function setMaterial(entity: pc.Entity | undefined, value: pc.StandardMaterial): void { if (entity?.render) entity.render.material = value; }

function wallMaterial(renderer: WorldRenderer, cache: SurfacePresentationCache, descriptor: CellDescriptor, wall: WallSpec): pc.StandardMaterial {
  const structural = archStructuralRole(wall); if (structural) return level0ArchFinishMaterial(renderer, structural);
  const arch = wall.materialId === 'arch-pale-wallpaper'; const uv = wallpaperUvForWall(descriptor.address.cellX, descriptor.address.cellZ, wall);
  const tint: [number, number, number] = arch ? [0.98, 0.975, 0.93] : [0.94, 0.925, 0.86];
  const key = `wall-fallback:${arch ? 'arch' : 'ordinary'}:${uv.tiling.join(',')}:${uv.offset.join(',')}`;
  return material(cache, key, () => makeMaterial(tint, cache.wallpaper, uv.tiling, undefined, 1, uv.offset));
}

function ceilingMaterial(cache: SurfacePresentationCache, descriptor: CellDescriptor): pc.StandardMaterial {
  const sourceMode = materialString(CEILING_TARGET, 'sourceMode', 'procedural'); const pattern = materialNumber(CEILING_TARGET, 'patternSizeMeters', CELL_SIZE / 4);
  const brightness = materialNumber(CEILING_TARGET, 'brightness', 1), contrast = materialNumber(CEILING_TARGET, 'contrast', 1), saturation = materialNumber(CEILING_TARGET, 'saturation', 1);
  const arch = descriptor.world.regionId === 'arch-rooms'; const color = arch ? materialColor(CEILING_TARGET, 'archTint', [0.98,0.975,0.91]) : materialColor(CEILING_TARGET, 'ordinaryTint', [0.93,0.91,0.81]);
  const asset = sourceMode === 'nal-image' ? materialAssetId(CEILING_TARGET, 'texture') : undefined;
  const texture = asset ? derivedPresentationTexture(cache.app, asset, { brightness, contrast, saturation, rotationDegrees: 0, flipU: false, flipV: false }) : cache.ceiling;
  const tiling: [number, number] = [Math.max(0.02, CELL_SIZE / pattern), Math.max(0.02, CELL_SIZE / pattern)];
  const key = `ceiling:${arch ? 'arch' : 'ordinary'}:${sourceMode}:${asset ?? 'procedural'}:${pattern}:${brightness}:${contrast}:${saturation}:${color.join(',')}:${Boolean(texture)}`;
  return material(cache, key, () => makeMaterial(color, texture ?? cache.ceiling, tiling));
}

function preparePillarPresentation(root: pc.Entity, prop: PropSpec): void {
  const container = entityByName(root, prop.id); if (!container) return;
  for (const child of childrenOf(container)) if (child.name.startsWith(`${prop.id}:wallpaper:`)) child.destroy();
}
function setCeilingMaterial(root: pc.Entity, value: pc.StandardMaterial): void { setMaterial(entityByName(root, 'ceiling'), value); }

export function applyLevel0SurfacePresentation(renderer: WorldRenderer, visual: CellVisual): void {
  const descriptor = visual.descriptor; if (descriptor.world.generationVersion !== 'gen3-v1') return; const cache = cacheFor(renderer); const root = visual.root;
  for (const child of childrenOf(root)) if (child.name.endsWith(':skirting')) child.destroy();
  applyLevel0CarpetMaterials(renderer, visual); setCeilingMaterial(root, ceilingMaterial(cache, descriptor));
  for (const wall of descriptor.walls) setMaterial(entityByName(root, wall.id), wallMaterial(renderer, cache, descriptor, wall));
  for (const prop of descriptor.props) if (prop.kind === 'column' && prop.materialId === 'level-0-wallpaper') preparePillarPresentation(root, prop);
  applyLevel0WallpaperPresentation(renderer, visual);
}
