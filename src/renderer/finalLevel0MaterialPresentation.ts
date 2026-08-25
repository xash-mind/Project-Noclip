import * as pc from 'playcanvas';
import { materialAssetId, materialColor, materialNumber, materialString } from '../presentation/materialRuntime.js';
import { CELL_SIZE, type CellDescriptor } from '../world/types.js';
import { derivedPresentationTexture } from './presentationImageTextures.js';
import { cvh1FloorSurfaceProfile, WorldRenderer } from './WorldRenderer.js';
import { makeMaterial, type CellVisual } from './support.js';

interface RendererAccess { app: pc.Application; }
interface FinalMaterialCache { app: pc.Application; materials: Map<string, pc.StandardMaterial>; }
interface RenderWithMeshInstances { material: pc.StandardMaterial; meshInstances?: Array<{ material: pc.StandardMaterial }>; }
const caches = new WeakMap<WorldRenderer, FinalMaterialCache>();
const ARCH_TARGET = 'material.arch-pale-wallpaper';
const CARPET_TARGET = 'material.level-0-carpet';
const HOLE_TARGET = 'carver.floor-hole-cluster';

export interface CanonicalLevel0CarpetPresentation {
  region: CellDescriptor['world']['regionId'];
  conditionSignature: string;
  sourceMode: string;
  color: [number, number, number];
  gloss: number;
  patternSizeMeters: number;
  assetId?: string;
  brightness: number;
  contrast: number;
  saturation: number;
}

export interface Level0CarpetUvTransform {
  tiling: [number, number];
  offset: [number, number];
}

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
  const render = entity.render as unknown as RenderWithMeshInstances;
  for (const instance of render.meshInstances ?? []) instance.material = value;
}
function wrap01(value: number): number { return ((value % 1) + 1) % 1; }

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

/** Final M-C1 truth shared by ordinary floor geometry and CV-H1-cut floor geometry. */
export function resolveCanonicalLevel0CarpetPresentation(descriptor: CellDescriptor): CanonicalLevel0CarpetPresentation {
  const region = descriptor.world.regionId;
  const sourceMode = materialString(CARPET_TARGET, 'sourceMode', 'procedural');
  const color = region === 'arch-rooms'
    ? materialColor(CARPET_TARGET, 'archTint', [0.65,0.60,0.49])
    : region === 'pillar-field'
      ? materialColor(CARPET_TARGET, 'pillarTint', [0.825,0.755,0.585])
      : materialColor(CARPET_TARGET, 'ordinaryTint', [0.79,0.72,0.55]);
  const gloss = region === 'arch-rooms' ? materialNumber(CARPET_TARGET, 'archGloss', 0.11) : 0.07;
  const patternSizeMeters = Math.max(0.05, materialNumber(CARPET_TARGET, 'patternSizeMeters', CELL_SIZE / 5));
  const assetId = sourceMode === 'nal-image' ? materialAssetId(CARPET_TARGET, 'texture') : undefined;
  return {
    region,
    conditionSignature: descriptor.world.conditionIds.join('+'),
    sourceMode,
    color,
    gloss,
    patternSizeMeters,
    assetId,
    brightness: materialNumber(CARPET_TARGET, 'brightness', 1),
    contrast: materialNumber(CARPET_TARGET, 'contrast', 1),
    saturation: materialNumber(CARPET_TARGET, 'saturation', 1)
  };
}

/**
 * World-phase transform for the two full-Cell floor geometry bases.
 * A normal box owns one 0..1 UV span; the CV-H1 mesh already bakes one UV
 * repeat per cvh1FloorSurfaceProfile().carpetRepeatMeters, so only its material
 * multiplier differs. Both resolve to exactly the same world-space frequency
 * and phase for the canonical M-C1 pattern size.
 */
export function canonicalLevel0CarpetUv(
  descriptor: CellDescriptor,
  patternSizeMeters: number,
  surface: 'full-floor' | 'cvh1-indexed'
): Level0CarpetUvTransform {
  const pattern = Math.max(0.05, patternSizeMeters);
  const minWorldX = descriptor.address.cellX * CELL_SIZE - CELL_SIZE / 2;
  const minWorldZ = descriptor.address.cellZ * CELL_SIZE - CELL_SIZE / 2;
  const multiplier = surface === 'cvh1-indexed'
    ? cvh1FloorSurfaceProfile().carpetRepeatMeters / pattern
    : CELL_SIZE / pattern;
  return {
    tiling: [multiplier, multiplier],
    offset: [wrap01(minWorldX / pattern), wrap01(minWorldZ / pattern)]
  };
}

function rectCarpetUv(
  descriptor: CellDescriptor,
  patternSizeMeters: number,
  positionX: number,
  positionZ: number,
  sizeX: number,
  sizeZ: number
): Level0CarpetUvTransform {
  const pattern = Math.max(0.05, patternSizeMeters);
  const minWorldX = descriptor.address.cellX * CELL_SIZE + positionX - sizeX / 2;
  const minWorldZ = descriptor.address.cellZ * CELL_SIZE + positionZ - sizeZ / 2;
  return {
    tiling: [sizeX / pattern, sizeZ / pattern],
    offset: [wrap01(minWorldX / pattern), wrap01(minWorldZ / pattern)]
  };
}

function carpetMaterial(cache: FinalMaterialCache, visual: CellVisual, entity: pc.Entity): pc.StandardMaterial | undefined {
  if (!entity.render) return undefined;
  const source = entity.render.material as pc.StandardMaterial | undefined; if (!source) return undefined;
  const descriptor = visual.descriptor;
  const presentation = resolveCanonicalLevel0CarpetPresentation(descriptor);
  const isCvh1 = entity.name === 'cvh1-floor-surface';
  const position = entity.getLocalPosition();
  const scale = entity.getLocalScale();
  const uv = isCvh1
    ? canonicalLevel0CarpetUv(descriptor, presentation.patternSizeMeters, 'cvh1-indexed')
    : entity.name === 'floor'
      ? canonicalLevel0CarpetUv(descriptor, presentation.patternSizeMeters, 'full-floor')
      : rectCarpetUv(
        descriptor,
        presentation.patternSizeMeters,
        position.x,
        position.z,
        Math.max(0.01, scale.x),
        Math.max(0.01, scale.z)
      );
  const texture = presentation.assetId
    ? derivedPresentationTexture(cache.app, presentation.assetId, {
      brightness: presentation.brightness,
      contrast: presentation.contrast,
      saturation: presentation.saturation,
      rotationDegrees: 0,
      flipU: false,
      flipV: false
    })
    : source.diffuseMap;
  const key = `carpet:${presentation.region}:${presentation.conditionSignature}:${presentation.sourceMode}:${presentation.assetId ?? 'procedural'}:${presentation.color.join(',')}:${presentation.gloss}:${presentation.patternSizeMeters}:${presentation.brightness}:${presentation.contrast}:${presentation.saturation}:${uv.tiling.map((v)=>v.toFixed(4)).join(',')}:${uv.offset.map((v)=>v.toFixed(4)).join(',')}`;
  return cachedMaterial(cache, key, () => {
    const value = source.clone();
    value.diffuse = new pc.Color(presentation.color[0], presentation.color[1], presentation.color[2]);
    value.gloss = presentation.gloss;
    if (texture) value.diffuseMap = texture;
    value.diffuseMapTiling = new pc.Vec2(uv.tiling[0], uv.tiling[1]);
    (value as unknown as { diffuseMapOffset: pc.Vec2 }).diffuseMapOffset = new pc.Vec2(uv.offset[0], uv.offset[1]);
    value.update();
    return value;
  });
}

function holeMaterial(cache: FinalMaterialCache, key: 'upper'|'middle'|'deep'|'void'): pc.StandardMaterial {
  const field = key === 'void' ? 'voidColor' : `${key}Color`;
  const fallback: [number,number,number] = key === 'upper' ? [0.145,0.123,0.072] : key === 'middle' ? [0.028,0.022,0.012] : [0,0,0];
  const color = materialColor(HOLE_TARGET, field, fallback), signature = `hole:${key}:${color.join(',')}`;
  return cachedMaterial(cache, signature, () => { const value = makeMaterial(color); value.gloss = 0; value.update(); return value; });
}

export function applyFinalLevel0Materials(renderer: WorldRenderer, visual: CellVisual): void {
  if (visual.descriptor.world.generationVersion !== 'gen3-v1') return;
  const cache = cacheFor(renderer);
  for (const entity of childrenOf(visual.root)) {
    const role = archRole(entity.name); if (role) { setEntityMaterial(entity, archMaterial(cache, role)); continue; }
    if ((entity.name === 'floor' || entity.name.startsWith('floor-piece:') || entity.name === 'cvh1-floor-surface') && entity.render) {
      const value = carpetMaterial(cache, visual, entity); if (value) setEntityMaterial(entity, value); continue;
    }
    if (!entity.render) continue;
    if (entity.name.includes(':depth-band:upper:')) setEntityMaterial(entity, holeMaterial(cache, 'upper'));
    else if (entity.name.includes(':depth-band:middle:')) setEntityMaterial(entity, holeMaterial(cache, 'middle'));
    else if (entity.name.includes(':depth-band:deep:')) setEntityMaterial(entity, holeMaterial(cache, 'deep'));
    else if (entity.name.endsWith(':depth-occluder')) setEntityMaterial(entity, holeMaterial(cache, 'void'));
  }
}

export function scheduleFinalLevel0MaterialsAfterArchReconstruction(renderer: WorldRenderer, descriptor: CellDescriptor): void {
  queueMicrotask(() => queueMicrotask(() => {
    for (const visual of renderer.loaded.values()) {
      if (Math.abs(visual.descriptor.address.cellX - descriptor.address.cellX) <= 1 && Math.abs(visual.descriptor.address.cellZ - descriptor.address.cellZ) <= 1) applyFinalLevel0Materials(renderer, visual);
    }
  }));
}
