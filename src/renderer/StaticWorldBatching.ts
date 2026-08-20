import * as pc from 'playcanvas';
import { CELL_SIZE } from '../world/types.js';
import { isMFluorescentPanelVisualName } from './fixtureVisualOwnership.js';
import { installFixtureLighting } from './fixtureLighting.js';
import { installLevel0RegionPresentation } from './level0RegionPresentation.js';
import { WorldRenderer } from './WorldRenderer.js';

const STATIC_WORLD_BATCH_GROUP_ID_START = 1601;
const STATIC_WORLD_BATCH_GROUP_NAME = 'level0-static-cell';
const RECONCILE_INTERVAL_MS = 100;
const EXCLUDED_SUBTREE_PREFIXES = ['item:', 'note:', 'exit:', 'exit-frame:', 'crack:'] as const;

export interface StaticWorldBatchingDiagnostics {
  reconcilePasses: number;
  allocations: number;
  removals: number;
  dirtyCalls: number;
  activeGroups: number;
  skippedCleanPasses: number;
  reconcileMs: number;
  maxReconcileMs: number;
}

const batchingDiagnostics: StaticWorldBatchingDiagnostics = {
  reconcilePasses: 0,
  allocations: 0,
  removals: 0,
  dirtyCalls: 0,
  activeGroups: 0,
  skippedCleanPasses: 0,
  reconcileMs: 0,
  maxReconcileMs: 0
};

export function staticWorldBatchingDiagnosticsSnapshot(): StaticWorldBatchingDiagnostics {
  return { ...batchingDiagnostics };
}

export const STATIC_WORLD_BATCHING_PROFILE = Object.freeze({
  mode: 'per-cell' as const,
  reconcileIntervalMs: RECONCILE_INTERVAL_MS,
  maxAabbSize: CELL_SIZE * 1.5,
  excludesFluorescentPanels: true
});

type BatchRenderComponent = { batchGroupId: number };
type BatchEntity = pc.Entity & { name: string; guid: string; children: readonly unknown[]; render?: { material: pc.StandardMaterial } & BatchRenderComponent; };
type BatchManager = {
  addGroup(name: string, dynamic: boolean, maxAabbSize: number, id?: number): unknown;
  removeGroup(id: number): void;
  markGroupDirty(id: number): void;
};
type BatchApplication = pc.Application & { root: BatchEntity; batcher: BatchManager };
type ApplicationLookup = typeof pc.Application & { getApplication(id?: string): pc.Application | undefined; };
let installed = false;
interface CellBatch { id: number; guid: string; }

function isBatchEntity(node: unknown): node is BatchEntity { return node instanceof pc.Entity; }
function isExcludedSubtree(entity: BatchEntity): boolean { return EXCLUDED_SUBTREE_PREFIXES.some((prefix) => entity.name.startsWith(prefix)); }
function assignStaticVisuals(entity: BatchEntity, batchGroupId: number): boolean {
  if (isExcludedSubtree(entity)) return false;
  if (isMFluorescentPanelVisualName(entity.name)) {
    if (entity.render && entity.render.batchGroupId !== -1) { entity.render.batchGroupId = -1; return true; }
    return false;
  }
  let changed = false;
  if (entity.render && entity.render.batchGroupId !== batchGroupId) { entity.render.batchGroupId = batchGroupId; changed = true; }
  for (const child of entity.children) if (isBatchEntity(child)) changed = assignStaticVisuals(child, batchGroupId) || changed;
  return changed;
}
function getRunningApplication(): BatchApplication | undefined {
  return (pc.Application as ApplicationLookup).getApplication('game-canvas') as BatchApplication | undefined;
}

/** Static geometry is batched per streamed Cell so one entering/leaving Cell never invalidates the whole Level 0 batch. */
export function installStaticWorldBatching(): void {
  if (installed) return;
  installed = true;
  installLevel0RegionPresentation();
  installFixtureLighting();
  let currentApp: BatchApplication | undefined;
  let nextGroupId = STATIC_WORLD_BATCH_GROUP_ID_START;
  let freeGroupIds: number[] = [];
  let cellBatches = new Map<string, CellBatch>();
  let dirty = true;

  const reset = (app: BatchApplication): void => {
    currentApp = app;
    nextGroupId = STATIC_WORLD_BATCH_GROUP_ID_START;
    freeGroupIds = [];
    cellBatches = new Map();
    dirty = true;
  };
  const allocate = (app: BatchApplication, cell: BatchEntity): CellBatch => {
    const id = freeGroupIds.pop() ?? nextGroupId++;
    app.batcher.addGroup(`${STATIC_WORLD_BATCH_GROUP_NAME}:${cell.guid}`, false, STATIC_WORLD_BATCHING_PROFILE.maxAabbSize, id);
    batchingDiagnostics.allocations += 1;
    const batch = { id, guid: cell.guid };
    cellBatches.set(cell.guid, batch);
    batchingDiagnostics.activeGroups = cellBatches.size;
    return batch;
  };
  const reconcile = (): void => {
    if (!dirty) {
      batchingDiagnostics.skippedCleanPasses += 1;
      return;
    }
    const reconcileStart = performance.now();
    batchingDiagnostics.reconcilePasses += 1;
    const app = getRunningApplication();
    if (!app) return;
    if (app !== currentApp) reset(app);
    dirty = false;
    const cells = app.root.children.filter(isBatchEntity).filter((entity) => entity.name.startsWith('cell:'));
    const present = new Set(cells.map((cell) => cell.guid));
    for (const [guid, batch] of [...cellBatches.entries()]) {
      if (present.has(guid)) continue;
      app.batcher.removeGroup(batch.id);
      batchingDiagnostics.removals += 1;
      freeGroupIds.push(batch.id);
      cellBatches.delete(guid);
      batchingDiagnostics.activeGroups = cellBatches.size;
    }
    for (const cell of cells) {
      const batch = cellBatches.get(cell.guid) ?? allocate(app, cell);
      if (assignStaticVisuals(cell, batch.id)) {
        app.batcher.markGroupDirty(batch.id);
        batchingDiagnostics.dirtyCalls += 1;
      }
    }
    const reconcileMs = performance.now() - reconcileStart;
    batchingDiagnostics.reconcileMs += reconcileMs;
    batchingDiagnostics.maxReconcileMs = Math.max(batchingDiagnostics.maxReconcileMs, reconcileMs);
  };

  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function batchingLoadCell(this: WorldRenderer, descriptor): void {
    const loadedBefore = this.loaded.has(descriptor.id);
    originalLoadCell.call(this, descriptor);
    if (!loadedBefore && this.loaded.has(descriptor.id)) dirty = true;
  };
  const originalUnloadCell = WorldRenderer.prototype.unloadCell;
  WorldRenderer.prototype.unloadCell = function batchingUnloadCell(this: WorldRenderer, cellId): void {
    const loadedBefore = this.loaded.has(cellId);
    originalUnloadCell.call(this, cellId);
    if (loadedBefore && !this.loaded.has(cellId)) dirty = true;
  };

  reconcile();
  window.setInterval(reconcile, RECONCILE_INTERVAL_MS);
}
