import * as pc from 'playcanvas';
import { CELL_SIZE } from '../world/types.js';

const STATIC_WORLD_BATCH_GROUP_ID = 1601;
const STATIC_WORLD_BATCH_GROUP_NAME = 'level0-static-world';
const RECONCILE_INTERVAL_MS = 100;
const EXCLUDED_SUBTREE_PREFIXES = ['item:', 'note:', 'exit:', 'exit-frame:', 'crack:'] as const;

function isEntity(node: pc.GraphNode): node is pc.Entity {
  return node instanceof pc.Entity;
}

function isExcludedSubtree(entity: pc.Entity): boolean {
  return EXCLUDED_SUBTREE_PREFIXES.some((prefix) => entity.name.startsWith(prefix));
}

function assignStaticVisuals(entity: pc.Entity): boolean {
  if (isExcludedSubtree(entity)) return false;
  let changed = false;
  if (entity.render && entity.render.batchGroupId !== STATIC_WORLD_BATCH_GROUP_ID) {
    entity.render.batchGroupId = STATIC_WORLD_BATCH_GROUP_ID;
    changed = true;
  }
  for (const child of entity.children) {
    if (isEntity(child)) changed = assignStaticVisuals(child) || changed;
  }
  return changed;
}

/**
 * Installs one render-only batching layer over canonical streamed Level 0 cells.
 *
 * The game keeps collision, interaction and persistence data independent of this
 * helper. Only render components under `cell:*` roots are considered, while item,
 * note and exit subtrees remain individually addressable. The reconciler also
 * notices streamed cell replacement/removal and dirties the batch group so the
 * engine rebuilds only when the visible cell set changes.
 */
export function installStaticWorldBatching(): void {
  let currentApp: pc.Application | undefined;
  let previousCellGuids = new Set<string>();

  const reconcile = (): void => {
    const app = pc.Application.getApplication('game-canvas') as pc.Application | undefined;
    if (!app) return;

    if (app !== currentApp) {
      currentApp = app;
      previousCellGuids = new Set<string>();
      app.batcher.addGroup(STATIC_WORLD_BATCH_GROUP_NAME, false, CELL_SIZE * 3, STATIC_WORLD_BATCH_GROUP_ID);
    }

    const cells = app.root.children.filter(isEntity).filter((entity) => entity.name.startsWith('cell:'));
    const nextCellGuids = new Set(cells.map((entity) => entity.guid));
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
