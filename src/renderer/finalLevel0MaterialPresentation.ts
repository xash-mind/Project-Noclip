import * as pc from 'playcanvas';
import type { CellDescriptor } from '../world/types.js';
import {
  canonicalLevel0CarpetUv,
  resolveLevel0CarpetPresentation,
  type CanonicalLevel0CarpetPresentation,
  type Level0CarpetUvTransform
} from '../presentation/level0PresentationPolicy.js';
import {
  applyLevel0CarpetMaterial,
  cvh1DepthMaterial,
  level0ArchFinishMaterial,
  level0ArchFinishRoleForEntity
} from './level0PresentationMaterials.js';
import { WorldRenderer } from './WorldRenderer.js';
import type { CellVisual } from './support.js';

export type { CanonicalLevel0CarpetPresentation, Level0CarpetUvTransform } from '../presentation/level0PresentationPolicy.js';
export { canonicalLevel0CarpetUv } from '../presentation/level0PresentationPolicy.js';

/** Compatibility export for existing verification consumers; policy ownership lives in src/presentation. */
export function resolveCanonicalLevel0CarpetPresentation(descriptor: CellDescriptor): CanonicalLevel0CarpetPresentation {
  return resolveLevel0CarpetPresentation(descriptor);
}

function childrenOf(entity: pc.Entity): pc.Entity[] {
  return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children];
}

/**
 * Narrow final application boundary. It does not define Level 0 semantic
 * material values; it reapplies the same canonical policy to geometry that may
 * have appeared after the synchronous surface pass.
 */
export function applyFinalLevel0Materials(renderer: WorldRenderer, visual: CellVisual): void {
  if (visual.descriptor.world.generationVersion !== 'gen3-v1') return;
  for (const entity of childrenOf(visual.root)) {
    const archRole = level0ArchFinishRoleForEntity(entity);
    if (archRole) {
      if (entity.render) entity.render.material = level0ArchFinishMaterial(renderer, archRole);
      continue;
    }
    if (entity.name === 'floor' || entity.name.startsWith('floor-piece:') || entity.name === 'cvh1-floor-surface') {
      applyLevel0CarpetMaterial(renderer, visual, entity);
      continue;
    }
    if (!entity.render) continue;
    if (entity.name.includes(':depth-band:upper:')) entity.render.material = cvh1DepthMaterial(renderer, 'upper');
    else if (entity.name.includes(':depth-band:middle:')) entity.render.material = cvh1DepthMaterial(renderer, 'middle');
    else if (entity.name.includes(':depth-band:deep:')) entity.render.material = cvh1DepthMaterial(renderer, 'deep');
    else if (entity.name.endsWith(':depth-occluder')) entity.render.material = cvh1DepthMaterial(renderer, 'void');
  }
}

/**
 * Retained timing boundary: neighbor-aware A-A1 visible reconstruction is
 * intentionally deferred, so newly reconstructed geometry receives the same
 * canonical material policy after that presentation flush.
 */
export function scheduleFinalLevel0MaterialsAfterArchReconstruction(renderer: WorldRenderer, descriptor: CellDescriptor): void {
  queueMicrotask(() => queueMicrotask(() => {
    for (const visual of renderer.loaded.values()) {
      if (Math.abs(visual.descriptor.address.cellX - descriptor.address.cellX) <= 1
        && Math.abs(visual.descriptor.address.cellZ - descriptor.address.cellZ) <= 1) {
        applyFinalLevel0Materials(renderer, visual);
      }
    }
  }));
}

void canonicalLevel0CarpetUv;
void (undefined as unknown as Level0CarpetUvTransform);
