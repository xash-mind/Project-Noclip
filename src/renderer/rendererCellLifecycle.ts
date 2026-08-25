import type { CellDescriptor } from '../world/types.js';
import { realizeNearbyArchCollision } from './archDividerCollision.js';
import { applyFinalLevel0Materials, scheduleFinalLevel0MaterialsAfterArchReconstruction } from './finalLevel0MaterialPresentation.js';
import { attachFixtureLights, detachCellFixtures } from './fixtureLighting.js';
import { applyLevel0RegionPresentation, scheduleNearbyArchPresentation } from './level0RegionPresentation.js';
import { applyLevel0SurfacePresentation } from './level0SurfacePresentation.js';
import { applyOrdinaryCasingMaterialPresentation } from './ordinaryCasingMaterialPresentation.js';
import {
  refreshRuntimeCellCollisionState,
  registerRuntimeCellState,
  unregisterRuntimeCellState
} from './runtimePerformance.js';
import { markStaticWorldBatchingDirty } from './StaticWorldBatching.js';
import { applyWallJunctionPresentation } from './wallJunctionPresentation.js';
import { WorldRenderer } from './WorldRenderer.js';

/**
 * Single streamed Cell composition owner established by Cleanup Wave 1.
 *
 * Wave 2 replaces the A-A1 correction/reconciliation pair with synchronous,
 * descriptor-driven canonical collision realization. Neighbor-aware visible
 * reconstruction and final-material convergence retain their accepted deferred
 * boundaries; neither owns gameplay collision.
 */
export const RENDERER_CELL_LOAD_ORDER = Object.freeze([
  'base-cell-realization',
  'level0-surface-presentation',
  'ordinary-casing-presentation',
  'level0-region-presentation',
  'schedule-nearby-arch-presentation',
  'wall-junction-presentation',
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

let installed = false;

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
 * Installs exactly one load/unload composition hook around WorldRenderer's
 * base Cell realization. No participant below is allowed to wrap loadCell or
 * unloadCell independently; this module is the single ordering authority.
 */
export function installRendererCellLifecycle(): void {
  if (installed) return;
  installed = true;

  const baseLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function rendererLifecycleLoadCell(
    this: WorldRenderer,
    descriptor: CellDescriptor
  ): void {
    const alreadyLoaded = this.loaded.has(descriptor.id);
    baseLoadCell.call(this, descriptor);
    const visual = this.loaded.get(descriptor.id);
    if (!visual) return;

    // Preserve accepted presentation order while moving A-A1 gameplay collision
    // onto the canonical semantic path before derived-index registration.
    applyLevel0SurfacePresentation(this, visual);
    applyOrdinaryCasingMaterialPresentation(this, descriptor);
    if (!alreadyLoaded) applyLevel0RegionPresentation(this, visual);
    scheduleNearbyArchPresentation(this, descriptor);
    applyWallJunctionPresentation(visual);

    const affectedArchCells = realizeNearbyArchCollision(this, descriptor);
    syncAlreadyIndexedArchNeighbors(this, affectedArchCells, descriptor.id, alreadyLoaded);

    if (!alreadyLoaded) {
      attachFixtureLights(this, visual);
      markStaticWorldBatchingDirty();
      registerRuntimeCellState(this, descriptor);
    }

    applyFinalLevel0Materials(this, visual);
    scheduleFinalLevel0MaterialsAfterArchReconstruction(this, descriptor);
  };

  const baseUnloadCell = WorldRenderer.prototype.unloadCell;
  WorldRenderer.prototype.unloadCell = function rendererLifecycleUnloadCell(
    this: WorldRenderer,
    cellId: string
  ): void {
    const visual = this.loaded.get(cellId);
    const descriptor = visual?.descriptor;

    // Derived indexes and fixture state observe the still-live Cell before base
    // entity destruction. Neighbor A-A1 collision is then recomputed from the
    // remaining deterministic descriptors and re-indexed synchronously.
    unregisterRuntimeCellState(this, cellId);
    detachCellFixtures(this, cellId, descriptor);
    baseUnloadCell.call(this, cellId);

    if (!descriptor) return;
    scheduleNearbyArchPresentation(this, descriptor);
    const affectedArchCells = realizeNearbyArchCollision(this, descriptor);
    for (const affectedCellId of affectedArchCells) refreshRuntimeCellCollisionState(this, affectedCellId);
    if (visual && !this.loaded.has(cellId)) markStaticWorldBatchingDirty();
  };
}
