import * as pc from 'playcanvas';
import { materialAssetId, materialColor, materialNumber, materialString } from '../presentation/materialRuntime.js';
import { archStructuralRole } from '../world/gen3ArchDividerSemantics.js';
import { CELL_SIZE, type CellDescriptor, type LightState, type PropSpec, type WallSpec } from '../world/types.js';
import { applyLevel0WallpaperPresentation } from './ordinaryWallpaperPresentation.js';
import { derivedPresentationTexture } from './presentationImageTextures.js';
import { applyLevel0CarpetMaterials, level0ArchFinishMaterial } from './level0PresentationMaterials.js';
import { WorldRenderer } from './WorldRenderer.js';
import { canvasTexture, makeMaterial, type CellVisual } from './support.js';
import { paintLevel0ChevronWallpaper, wallpaperUvForWall } from './level0Wallpaper.js';

interface RendererAccess { app: pc.Application; }
interface SurfacePresentationCache { app: pc.Application; wallpaper: pc.Texture; ceiling: pc.Texture; materials: Map<string, pc.StandardMaterial>; }
const caches = new WeakMap<WorldRenderer, SurfacePresentationCache>();

const CEILING_TARGET = 'material.level-0-ceiling';
const PANEL_TARGET = 'material.fluorescent-panel';

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

function quantizedPulse(state: LightState, pulse: number): number { if (state === 'off') return 0; return Math.max(0, Math.min(1, Math.round(pulse * 16) / 16)); }
function fixtureMaterial(cache: SurfacePresentationCache, descriptor: CellDescriptor, state: LightState, pulse: number): pc.StandardMaterial {
  const arch = descriptor.world.regionId === 'arch-rooms'; const level = quantizedPulse(state, pulse); const visualScale = materialNumber(PANEL_TARGET, 'visualEmissiveScale', 1);
  const activeDiffuse = arch ? materialColor(PANEL_TARGET, 'archDiffuse', [0.99,0.985,0.83]) : materialColor(PANEL_TARGET, 'ordinaryDiffuse', [0.98,0.955,0.76]);
  const offDiffuse: [number, number, number] = [0.31,0.31,0.27]; const diffuse: [number,number,number] = [offDiffuse[0]+(activeDiffuse[0]-offDiffuse[0])*level,offDiffuse[1]+(activeDiffuse[1]-offDiffuse[1])*level,offDiffuse[2]+(activeDiffuse[2]-offDiffuse[2])*level];
  const emissive = arch ? materialColor(PANEL_TARGET, 'archEmissive', [1,0.985,0.78]) : materialColor(PANEL_TARGET, 'ordinaryEmissive', [1,0.95,0.68]);
  const key = `fixture:${arch}:${state}:${level}:${visualScale}:${diffuse.join(',')}:${emissive.join(',')}`;
  return material(cache, key, () => level <= 0.001 ? makeMaterial(diffuse) : makeMaterial(diffuse, undefined, [1,1], emissive, (arch ? 2.18 : 2.28) * level * visualScale));
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
  for (const group of descriptor.lightGroups) { const pulse = group.state === 'off' ? 0 : 1; const value = fixtureMaterial(cache, descriptor, group.state, pulse); group.fixtures.forEach((_position, index) => setMaterial(entityByName(root, `${group.id}:fixture:${index}`), value)); }
  applyLevel0WallpaperPresentation(renderer, visual);
}
