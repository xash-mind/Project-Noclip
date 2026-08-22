import * as pc from 'playcanvas';
import { materialAssetId, materialColor, materialNumber, materialString } from '../presentation/materialRuntime.js';
import { CELL_SIZE, type CellDescriptor } from '../world/types.js';
import { derivedPresentationTexture } from './presentationImageTextures.js';
import { WorldRenderer } from './WorldRenderer.js';
import { makeMaterial, type CellVisual } from './support.js';

interface RendererAccess { app: pc.Application; }
interface FinalMaterialCache { app: pc.Application; materials: Map<string, pc.StandardMaterial>; }
const caches = new WeakMap<WorldRenderer, FinalMaterialCache>();
let installed = false;
const ARCH_TARGET = 'material.arch-pale-wallpaper';
const CARPET_TARGET = 'material.level-0-carpet';
const HOLE_TARGET = 'carver.floor-hole-cluster';

function childrenOf(entity: pc.Entity): pc.Entity[] { return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children]; }
function cacheFor(renderer: WorldRenderer): FinalMaterialCache {
  const existing = caches.get(renderer); if (existing) return existing;
  const created = { app: (renderer as unknown as RendererAccess).app, materials: new Map<string, pc.StandardMaterial>() }; caches.set(renderer, created); return created;
}
function cachedMaterial(cache: FinalMaterialCache, key: string, factory: () => pc.StandardMaterial): pc.StandardMaterial {
  const existing = cache.materials.get(key); if (existing) return existing; const created = factory(); cache.materials.set(key, created); return created;
}
function setEntityMaterial(entity: pc.Entity, value: pc.StandardMaterial): void {
  if (!entity.render) return;
  entity.render.material = value;
  for (const instance of entity.render.meshInstances ?? []) instance.material = value;
}

function archMaterial(cache: FinalMaterialCache, role: 'pier'|'upper'|'panel'): pc.StandardMaterial {
  const field = role === 'pier' ? 'pierColor' : role === 'panel' ? 'panelColor' : 'upperColor';
  const fallback: [number,number,number] = role === 'pier' ? [0.76,0.735,0.665] : role === 'panel' ? [0.885,0.872,0.805] : [0.955,0.945,0.885];
  const color = materialColor(ARCH_TARGET, field, fallback), gloss = materialNumber(ARCH_TARGET, 'gloss', 0.07), key = `arch:${role}:${color.join(',')}:${gloss}`;
  return cachedMaterial(cache, key, () => { const value = makeMaterial(color); value.gloss = gloss; value.update(); return value; });
}
function archRole(name: string): 'pier'|'upper'|'panel'|undefined {
  if (!name.startsWith('arch-frame:')) return undefined;
  if (name.includes('lower-panel:')) return 'panel';
  if (name.includes('pier-lower:') || name.includes('pier-upper:')) return 'pier';
  return 'upper';
}

function carpetMaterial(cache: FinalMaterialCache, visual: CellVisual, entity: pc.Entity): pc.StandardMaterial | undefined {
  if (!entity.render) return undefined;
  const source = entity.render.material as pc.StandardMaterial | undefined; if (!source) return undefined;
  const descriptor = visual.descriptor, region = descriptor.world.regionId;
  const sourceMode = materialString(CARPET_TARGET, 'sourceMode', 'procedural');
  const color = region === 'arch-rooms' ? materialColor(CARPET_TARGET, 'archTint', [0.65,0.60,0.49]) : region === 'pillar-field' ? materialColor(CARPET_TARGET, 'pillarTint', [0.825,0.755,0.585]) : materialColor(CARPET_TARGET, 'ordinaryTint', [0.79,0.72,0.55]);
  const gloss = region === 'arch-rooms' ? materialNumber(CARPET_TARGET, 'archGloss', 0.11) : source.gloss;
  const pattern = Math.max(0.05, materialNumber(CARPET_TARGET, 'patternSizeMeters', CELL_SIZE / 5));
  const scale = entity.getLocalScale(), position = entity.getLocalPosition();
  const sx = entity.name === 'floor' ? CELL_SIZE : Math.max(0.01, scale.x), sz = entity.name === 'floor' ? CELL_SIZE : Math.max(0.01, scale.z);
  const minWorldX = descriptor.address.cellX * CELL_SIZE + position.x - sx / 2, minWorldZ = descriptor.address.cellZ * CELL_SIZE + position.z - sz / 2;
  const tiling: [number,number] = [sx / pattern, sz / pattern];
  const offset: [number,number] = [((minWorldX / pattern) % 1 + 1) % 1, ((minWorldZ / pattern) % 1 + 1) % 1];
  const asset = sourceMode === 'nal-image' ? materialAssetId(CARPET_TARGET, 'texture') : undefined;
  const brightness = materialNumber(CARPET_TARGET, 'brightness', 1), contrast = materialNumber(CARPET_TARGET, 'contrast', 1), saturation = materialNumber(CARPET_TARGET, 'saturation', 1);
  const texture = asset ? derivedPresentationTexture(cache.app, asset, { brightness, contrast, saturation, rotationDegrees: 0, flipU: false, flipV: false }) : source.diffuseMap;
  const key = `carpet:${region}:${sourceMode}:${asset ?? 'procedural'}:${color.join(',')}:${gloss}:${pattern}:${brightness}:${contrast}:${saturation}:${tiling.map((v)=>v.toFixed(4)).join(',')}:${offset.map((v)=>v.toFixed(4)).join(',')}`;
  return cachedMaterial(cache, key, () => { const value = source.clone(); value.diffuse = new pc.Color(color[0],color[1],color[2]); value.gloss = gloss; if (texture) value.diffuseMap = texture; value.diffuseMapTiling = new pc.Vec2(tiling[0],tiling[1]); (value as unknown as { diffuseMapOffset: pc.Vec2 }).diffuseMapOffset = new pc.Vec2(offset[0],offset[1]); value.update(); return value; });
}

function holeMaterial(cache: FinalMaterialCache, key: 'upper'|'middle'|'deep'|'void'): pc.StandardMaterial {
  const field = key === 'void' ? 'voidColor' : `${key}Color`;
  const fallback: [number,number,number] = key === 'upper' ? [0.145,0.123,0.072] : key === 'middle' ? [0.028,0.022,0.012] : [0,0,0];
  const color = materialColor(HOLE_TARGET, field, fallback), signature = `hole:${key}:${color.join(',')}`;
  return cachedMaterial(cache, signature, () => { const value = makeMaterial(color); value.gloss = 0; value.update(); return value; });
}

function applyFinalMaterials(renderer: WorldRenderer, visual: CellVisual): void {
  if (visual.descriptor.world.generationVersion !== 'gen3-v1') return;
  const cache = cacheFor(renderer);
  for (const entity of childrenOf(visual.root)) {
    const role = archRole(entity.name); if (role) { setEntityMaterial(entity, archMaterial(cache, role)); continue; }
    if ((entity.name === 'floor' || entity.name.startsWith('floor-piece:')) && entity.render) { const value = carpetMaterial(cache, visual, entity); if (value) setEntityMaterial(entity, value); continue; }
    if (!entity.render) continue;
    if (entity.name.includes(':depth-band:upper:')) setEntityMaterial(entity, holeMaterial(cache, 'upper'));
    else if (entity.name.includes(':depth-band:middle:')) setEntityMaterial(entity, holeMaterial(cache, 'middle'));
    else if (entity.name.includes(':depth-band:deep:')) setEntityMaterial(entity, holeMaterial(cache, 'deep'));
    else if (entity.name.endsWith(':depth-occluder')) setEntityMaterial(entity, holeMaterial(cache, 'void'));
  }
}

function applyAfterArchReconstruction(renderer: WorldRenderer, descriptor: CellDescriptor): void {
  queueMicrotask(() => queueMicrotask(() => {
    for (const visual of renderer.loaded.values()) {
      if (Math.abs(visual.descriptor.address.cellX - descriptor.address.cellX) <= 1 && Math.abs(visual.descriptor.address.cellZ - descriptor.address.cellZ) <= 1) applyFinalMaterials(renderer, visual);
    }
  }));
}

/** Final presentation owner for materials on renderer-created Region geometry. It never changes semantic descriptors, topology or collision. */
export function installFinalLevel0MaterialPresentation(): void {
  if (installed) return; installed = true;
  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function finalMaterialLoad(this: WorldRenderer, descriptor: CellDescriptor): void {
    originalLoadCell.call(this, descriptor);
    const visual = this.loaded.get(descriptor.id); if (visual) applyFinalMaterials(this, visual);
    applyAfterArchReconstruction(this, descriptor);
  };
}
