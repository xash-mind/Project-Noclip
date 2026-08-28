import * as pc from 'playcanvas';
import {
  canonicalLevel0CarpetRectUv,
  canonicalLevel0CarpetUv,
  resolveCvh1DepthPresentation,
  resolveLevel0ArchFinishPresentation,
  resolveLevel0CarpetPresentation,
  type Cvh1DepthKey,
  type Level0ArchFinishRole
} from '../presentation/level0PresentationPolicy.js';
import { derivedPresentationTexture } from './presentationImageTextures.js';
import { cvh1FloorSurfaceProfile } from './cvh1FloorSurface.js';
import { WorldRenderer } from './WorldRenderer.js';
import { canvasTexture, makeMaterial, type CellVisual } from './support.js';

interface RendererAccess { app: pc.Application; }
interface RenderWithMeshInstances { material: pc.StandardMaterial; meshInstances?: Array<{ material: pc.StandardMaterial }>; }
interface Level0PresentationMaterialCache {
  app: pc.Application;
  proceduralCarpet: pc.Texture;
  materials: Map<string, pc.StandardMaterial>;
}

type ArchFinishTaggedEntity = pc.Entity & { __level0ArchFinishRole?: Level0ArchFinishRole };

const caches = new WeakMap<WorldRenderer, Level0PresentationMaterialCache>();

function cacheFor(renderer: WorldRenderer): Level0PresentationMaterialCache {
  const existing = caches.get(renderer);
  if (existing) return existing;
  const app = (renderer as unknown as RendererAccess).app;
  const created: Level0PresentationMaterialCache = {
    app,
    proceduralCarpet: canvasTexture(app, 'carpet', 0),
    materials: new Map()
  };
  caches.set(renderer, created);
  return created;
}

function cachedMaterial(
  cache: Level0PresentationMaterialCache,
  key: string,
  factory: () => pc.StandardMaterial
): pc.StandardMaterial {
  const existing = cache.materials.get(key);
  if (existing) return existing;
  const created = factory();
  cache.materials.set(key, created);
  return created;
}

function setEntityMaterial(entity: pc.Entity, value: pc.StandardMaterial): void {
  if (!entity.render) return;
  entity.render.material = value;
  const render = entity.render as unknown as RenderWithMeshInstances;
  for (const instance of render.meshInstances ?? []) instance.material = value;
}

export function bindLevel0ArchFinishRole(entity: pc.Entity, role: Level0ArchFinishRole): void {
  (entity as ArchFinishTaggedEntity).__level0ArchFinishRole = role;
}

export function level0ArchFinishRoleForEntity(entity: pc.Entity): Level0ArchFinishRole | undefined {
  return (entity as ArchFinishTaggedEntity).__level0ArchFinishRole;
}

export function level0ArchFinishMaterial(renderer: WorldRenderer, role: Level0ArchFinishRole): pc.StandardMaterial {
  const cache = cacheFor(renderer);
  const presentation = resolveLevel0ArchFinishPresentation(role);
  const key = `arch-finish:${role}:${presentation.color.join(',')}:${presentation.gloss}`;
  return cachedMaterial(cache, key, () => {
    const value = makeMaterial(presentation.color);
    value.gloss = presentation.gloss;
    value.update();
    return value;
  });
}

export function cvh1DepthMaterial(renderer: WorldRenderer, depth: Cvh1DepthKey): pc.StandardMaterial {
  const cache = cacheFor(renderer);
  const palette = resolveCvh1DepthPresentation();
  const color = palette[depth];
  const key = `cvh1-depth:${depth}:${color.join(',')}`;
  return cachedMaterial(cache, key, () => {
    const value = makeMaterial(color);
    value.gloss = 0;
    value.update();
    return value;
  });
}

export function applyLevel0CarpetMaterial(renderer: WorldRenderer, visual: CellVisual, entity: pc.Entity): void {
  if (!entity.render) return;
  const descriptor = visual.descriptor;
  const presentation = resolveLevel0CarpetPresentation(descriptor);
  const cache = cacheFor(renderer);
  const position = entity.getLocalPosition();
  const scale = entity.getLocalScale();
  const uv = entity.name === 'cvh1-floor-surface'
    ? canonicalLevel0CarpetUv(
      descriptor,
      presentation.patternSizeMeters,
      'cvh1-indexed',
      cvh1FloorSurfaceProfile().carpetRepeatMeters
    )
    : entity.name === 'floor'
      ? canonicalLevel0CarpetUv(descriptor, presentation.patternSizeMeters, 'full-floor')
      : canonicalLevel0CarpetRectUv(
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
    }) ?? cache.proceduralCarpet
    : cache.proceduralCarpet;
  const key = `carpet:${presentation.region}:${presentation.conditionSignature}:${presentation.sourceMode}:${presentation.assetId ?? 'procedural'}:${presentation.color.join(',')}:${presentation.gloss}:${presentation.patternSizeMeters}:${presentation.brightness}:${presentation.contrast}:${presentation.saturation}:${uv.tiling.map((value) => value.toFixed(4)).join(',')}:${uv.offset.map((value) => value.toFixed(4)).join(',')}`;
  const value = cachedMaterial(cache, key, () => {
    const created = makeMaterial(
      presentation.color,
      texture,
      uv.tiling,
      undefined,
      1,
      uv.offset
    );
    created.gloss = presentation.gloss;
    created.update();
    return created;
  });
  setEntityMaterial(entity, value);
}

export function applyLevel0CarpetMaterials(renderer: WorldRenderer, visual: CellVisual): void {
  for (const entity of [...(visual.root as pc.Entity & { children: readonly pc.Entity[] }).children]) {
    if (entity.name === 'floor' || entity.name.startsWith('floor-piece:') || entity.name === 'cvh1-floor-surface') {
      applyLevel0CarpetMaterial(renderer, visual, entity);
    }
  }
}
