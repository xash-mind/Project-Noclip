import type { CellDescriptor } from '../world/types.js';
import { realizeNearbyArchCollision } from './archDividerCollision.js';
import { applyFinalLevel0Materials, scheduleFinalLevel0MaterialsAfterArchReconstruction } from './finalLevel0MaterialPresentation.js';
import { attachFixtureLights, detachCellFixtures } from './fixtureLighting.js';
import { applyLevel0RegionPresentation, scheduleNearbyArchPresentation } from './level0RegionPresentation.js';
import { assembleLevel0StaticSurfaces } from './level0StaticSurfaceAssembly.js';
import { applyLevel0SurfacePresentation } from './level0SurfacePresentation.js';
import { applyOrdinaryCasingMaterialPresentation } from './ordinaryCasingMaterialPresentation.js';
import {
  refreshRuntimeCellCollisionState,
  registerRuntimeCellState,
  unregisterRuntimeCellState
} from './runtimePerformance.js';
import { markStaticWorldBatchingDirty } from './StaticWorldBatching.js';
import type { WorldRenderer } from './WorldRenderer.js';

/**
 * Canonical streamed Cell load composition order. WorldRenderer invokes this
 * owner directly; participants below do not install or wrap renderer methods.
 */
export const RENDERER_CELL_LOAD_ORDER = Object.freeze([
  'base-cell-realization',
  'level0-surface-presentation',
  'ordinary-casing-presentation',
  'level0-static-surface-assembly',
  'level0-region-presentation',
  'schedule-nearby-arch-presentation',
  'realize-canonical-arch-collision',
  'fixture-lighting-attach',
  'static-batching-dirty',
  'runtime-derived-state-register',
  'final-level0-materials',
  'schedule-final-material-convergence'
] as const);

export const RENDERER_CELL_UNLOAD_ORDER = Object.freeze([
  'runtime-derived-state-unregister',
  'fixture-lighting-detach',
  'base-cell-destroy',
  'schedule-nearby-arch-presentation',
  'realize-neighbor-arch-collision',
  'static-batching-dirty'
] as const);

function syncAlreadyIndexedArchNeighbors(
  renderer: WorldRenderer,
  affectedCellIds: readonly string[],
  currentCellId: string,
  currentAlreadyIndexed: boolean
): void {
  for (const cellId of affectedCellIds) {
    if (!currentAlreadyIndexed && cellId === currentCellId) continue;
    refreshRuntimeCellCollisionState(renderer, cellId);
  }
}

/**
 * Executes the accepted Cell load composition around WorldRenderer's base Cell
 * realization. The callback keeps base entity construction owned by
 * WorldRenderer while this module remains the single explicit ordering owner.
 */
export function runRendererCellLoadLifecycle(
  renderer: WorldRenderer,
  descriptor: CellDescriptor,
  realizeBaseCell: () => void
): void {
  const alreadyLoaded = renderer.loaded.has(descriptor.id);
  realizeBaseCell();
  const visual = renderer.loaded.get(descriptor.id);
  if (!visual) return;

  applyLevel0SurfacePresentation(renderer, visual);
  applyOrdinaryCasingMaterialPresentation(renderer, descriptor);
  if (!alreadyLoaded) {
    assembleLevel0StaticSurfaces(visual);
    applyLevel0RegionPresentation(renderer, visual);
  }
  scheduleNearbyArchPresentation(renderer, descriptor);

  const affectedArchCells = realizeNearbyArchCollision(renderer, descriptor);
  syncAlreadyIndexedArchNeighbors(renderer, affectedArchCells, descriptor.id, alreadyLoaded);

  if (!alreadyLoaded) {
    attachFixtureLights(renderer, visual);
    markStaticWorldBatchingDirty();
    registerRuntimeCellState(renderer, descriptor);
  }

  applyFinalLevel0Materials(renderer, visual);
  scheduleFinalLevel0MaterialsAfterArchReconstruction(renderer, descriptor);
}

/**
 * Executes the accepted Cell unload composition around WorldRenderer's base
 * entity destruction. Derived state observes the still-live Cell before base
 * destruction; neighbor A-A1 collision is then recomputed and re-indexed.
 */
export function runRendererCellUnloadLifecycle(
  renderer: WorldRenderer,
  cellId: string,
  destroyBaseCell: () => void
): void {
  const visual = renderer.loaded.get(cellId);
  const descriptor = visual?.descriptor;

  unregisterRuntimeCellState(renderer, cellId);
  detachCellFixtures(renderer, cellId, descriptor);
  destroyBaseCell();

  if (!descriptor) return;
  scheduleNearbyArchPresentation(renderer, descriptor);
  const affectedArchCells = realizeNearbyArchCollision(renderer, descriptor);
  for (const affectedCellId of affectedArchCells) refreshRuntimeCellCollisionState(renderer, affectedCellId);
  if (visual && !renderer.loaded.has(cellId)) markStaticWorldBatchingDirty();
}