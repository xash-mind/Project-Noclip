import * as pc from 'playcanvas';
import { CELL_SIZE } from '../world/types.js';

const STATIC_WORLD_BATCH_GROUP_ID = 1601;
const STATIC_WORLD_BATCH_GROUP_NAME = 'level0-static-world';
const initializedApps = new WeakSet<pc.Application>();
const EXCLUDED_SUBTREE_PREFIXES = ['item:', 'note:', 'exit:', 'exit-frame:', 'crack:'] as const;

function isExcludedSubtree(entity: pc.Entity): boolean {
  return EXCLUDED_SUBTREE_PREFIXES.some((prefix) => entity.name.startsWith(prefix));
}

/**
 * Render-only batching for canonical streamed Level 0 geometry.
 *
 * Collision, interaction and persistence data remain separate. Interactive item,
 * note and exit subtrees are deliberately excluded so removing or mutating those
 * visuals never depends on rebuilding the static environment batch.
 */
export class StaticWorldBatching {
  constructor(private readonly app: pc.Application) {
    if (initializedApps.has(app)) return;
    app.batcher.addGroup(STATIC_WORLD_BATCH_GROUP_NAME, false, CELL_SIZE * 3, STATIC_WORLD_BATCH_GROUP_ID);
    initializedApps.add(app);
  }

  addCell(root: pc.Entity): void {
    this.assignStaticVisuals(root);
    this.markDirty();
  }

  cellRemoved(): void {
    this.markDirty();
  }

  private assignStaticVisuals(entity: pc.Entity): void {
    if (isExcludedSubtree(entity)) return;
    if (entity.render) entity.render.batchGroupId = STATIC_WORLD_BATCH_GROUP_ID;
    for (const child of entity.children) this.assignStaticVisuals(child);
  }

  private markDirty(): void {
    this.app.batcher.markGroupDirty(STATIC_WORLD_BATCH_GROUP_ID);
  }
}
