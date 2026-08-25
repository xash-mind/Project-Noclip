import type { CellDescriptor } from '../world/types.js';
import { applyArchDividerRuntimeCorrection, scheduleNearbyArchCollisionReconciliation } from './archDividerRuntimeCorrection.js';
import { applyFinalLevel0Materials, scheduleFinalLevel0MaterialsAfterArchReconstruction } from './finalLevel0MaterialPresentation.js';
import { attachFixtureLights, detachCellFixtures } from './fixtureLighting.js';
import { applyLevel0RegionPresentation, scheduleNearbyArchPresentation } from './level0RegionPresentation.js';
import { applyLevel0SurfacePresentation } from './level0SurfacePresentation.js';
import { applyOrdinaryCasingMaterialPresentation } from './ordinaryCasingMaterialPresentation.js';
import { registerRuntimeCellState, unregisterRuntimeCellState } from './runtimePerformance.js';
import { markStaticWorldBatchingDirty } from './StaticWorldBatching.js';
import { applyWallJunctionPresentation } from './wallJunctionPresentation.js';
import { WorldRenderer } from './WorldRenderer.js';

/**
 * Wave 1 composition owner for streamed Cell renderer lifecycle order.
 *
 * The order below is intentionally the exact effective order of the former
 * prototype-wrapper stack. Semantic policy remains in each participant. The
 * Region/A-A1/final-material deferred boundaries are intentionally retained;
 * Wave 1 makes their ordering explicit but does not reinterpret their behavior.
 */
export const RENDERER_CELL_LOAD_ORDER = Object.freeze([
  'base-cell-realization',
  'level0-surface-presentation',
  'ordinary-casing-presentation',
  'level0-region-presentation',
  'schedule-nearby-arch-presentation',
  'wall-junction-presentation',
  'arch-divider-runtime-correction',
  'schedule-nearby-arch-collision-reconciliation',
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
  'schedule-nearby-arch-collision-reconciliation',
  'static-batching-dirty'
] as const);

let installed = false;

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

    // Preserve the former wrapper unwind order exactly. Several presentation
    // stages intentionally still run on duplicate load requests because the
    // old wrapper stack did so even when base loadCell returned early.
    applyLevel0SurfacePresentation(this, visual);
    applyOrdinaryCasingMaterialPresentation(this, descriptor);
    if (!alreadyLoaded) applyLevel0RegionPresentation(this, visual);
    scheduleNearbyArchPresentation(this, descriptor);
    applyWallJunctionPresentation(visual);
    applyArchDividerRuntimeCorrection(this, visual);
    scheduleNearbyArchCollisionReconciliation(this, descriptor);

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

    // Preserve pre-destroy ownership: derived indexes and fixture state must
    // observe the still-live Cell before WorldRenderer destroys its entities.
    unregisterRuntimeCellState(this, cellId);
    detachCellFixtures(this, cellId, descriptor);
    baseUnloadCell.call(this, cellId);

    if (!descriptor) return;
    scheduleNearbyArchPresentation(this, descriptor);
    scheduleNearbyArchCollisionReconciliation(this, descriptor);
    if (visual && !this.loaded.has(cellId)) markStaticWorldBatchingDirty();
  };
}
