import * as pc from 'playcanvas';
import type { CellDescriptor } from '../world/types.js';
import { WorldRenderer } from './WorldRenderer.js';
import { wallPresentationBoxAtTJunction } from './wallJunctionGeometry.js';
import type { CellVisual } from './support.js';

let installed = false;

function childrenOf(entity: pc.Entity): pc.Entity[] {
  return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children];
}

function entityByName(root: pc.Entity, name: string): pc.Entity | undefined {
  return childrenOf(root).find((child) => child.name === name);
}

function applyWallJunctionPresentation(visual: CellVisual): void {
  if (visual.descriptor.world.generationVersion !== 'gen3-v1') return;
  for (const wall of visual.descriptor.walls) {
    if (!wall.drawable) continue;
    const entity = entityByName(visual.root, wall.id);
    if (!entity?.render || entity.render.enabled === false) continue;
    const box = wallPresentationBoxAtTJunction(wall, visual.descriptor.walls);
    if (
      box.cx === wall.cx && box.cz === wall.cz
      && box.sx === wall.sx && box.sz === wall.sz
    ) continue;
    entity.setLocalPosition(box.cx, box.cy, box.cz);
    entity.setLocalScale(box.sx, box.sy, box.sz);
  }
}

/**
 * Gen3 presentation-only wall join cleanup. Semantic wall spans, collider spans,
 * IDs and save/world identity remain untouched.
 */
export function installWallJunctionPresentation(): void {
  if (installed) return;
  installed = true;
  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function wallJunctionLoadCell(
    this: WorldRenderer,
    descriptor: CellDescriptor
  ): void {
    originalLoadCell.call(this, descriptor);
    const visual = this.loaded.get(descriptor.id);
    if (visual) applyWallJunctionPresentation(visual);
  };
}
