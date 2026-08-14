import * as pc from 'playcanvas';
import { CELL_SIZE } from '../world/types.js';
import { installFixtureLighting } from './fixtureLighting.js';
import { installLevel0RegionPresentation } from './level0RegionPresentation.js';

const STATIC_WORLD_BATCH_GROUP_ID = 1601;
const STATIC_WORLD_BATCH_GROUP_NAME = 'level0-static-world';
const RECONCILE_INTERVAL_MS = 100;
const EXCLUDED_SUBTREE_PREFIXES = ['item:', 'note:', 'exit:', 'exit-frame:', 'crack:'] as const;

type BatchRenderComponent = { batchGroupId: number };
type BatchEntity = pc.Entity & {
  name: string;
  guid: string;
  children: readonly unknown[];
  render?: { material: pc.StandardMaterial } & BatchRenderComponent;
};
type BatchManager = {
  addGroup(name: string, dynamic: boolean, maxAabbSize: number, id?: number): unknown;
  markGroupDirty(id: number): void;
};
type BatchApplication = pc.Application & { root: BatchEntity; batcher: BatchManager };
type ApplicationLookup = typeof pc.Application & {
  getApplication(id?: string): pc.Application | undefined;
};

function isBatchEntity(node: unknown): node is BatchEntity {
  return node instanceof pc.Entity;
}

function isExcludedSubtree(entity: BatchEntity): boolean {
  return EXCLUDED_SUBTREE_PREFIXES.some((prefix) => entity.name.startsWith(prefix));
}

function assignStaticVisuals(entity: BatchEntity): boolean {
  if (isExcludedSubtree(entity)) return false;
  let changed = false;
  if (entity.render && entity.render.batchGroupId !== STATIC_WORLD_BATCH_GROUP_ID) {
    entity.render.batchGroupId = STATIC_WORLD_BATCH_GROUP_ID;
    changed = true;
  }
  for (const child of entity.children) {
    if (isBatchEntity(child)) changed = assignStaticVisuals(child) || changed;
  }
  return changed;
}

function getRunningApplication(): BatchApplication | undefined {
  const application = (pc.Application as ApplicationLookup).getApplication('game-canvas');
  return application as BatchApplication | undefined;
}

/**
 * Installs renderer-owned Level 0 presentation/lighting and one render-only
 * batching layer over canonical streamed Cells. Collision, interaction and
 * persistence data never enter this layer.
 */
export function installStaticWorldBatching(): void {
  installLevel0RegionPresentation();
  installFixtureLighting();
  let currentApp: BatchApplication | undefined;
  let previousCellGuids = new Set<string>();

  const reconcile = (): void => {
    const app = getRunningApplication();
    if (!app) return;

    if (app !== currentApp) {
      currentApp = app;
      previousCellGuids = new Set<string>();
      app.batcher.addGroup(STATIC_WORLD_BATCH_GROUP_NAME, false, CELL_SIZE * 3, STATIC_WORLD_BATCH_GROUP_ID);
    }

    const cells = app.root.children
      .filter(isBatchEntity)
      .filter((entity) => entity.name.startsWith('cell:'));
    const nextCellGuids = new Set<string>(cells.map((entity) => entity.guid));
    const cellSetChanged = nextCellGuids.size !== previousCellGuids.size
      || [...nextCellGuids].some((guid) => !previousCellGuids.has(guid));
    let assignedNewVisual = false;
    for (const cell of cells) assignedNewVisual = assignStaticVisuals(cell) || assignedNewVisual;

    if (cellSetChanged || assignedNewVisual) app.batcher.markGroupDirty(STATIC_WORLD_BATCH_GROUP_ID);
    previousCellGuids = nextCellGuids;
  };

  reconcile();
  window.setInterval(reconcile, RECONCILE_INTERVAL_MS);
}
