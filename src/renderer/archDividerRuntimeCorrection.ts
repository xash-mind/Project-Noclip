import { ARCH_HEADER_HEIGHT, ARCH_LOWER_HEIGHT } from '../world/gen3ArchitectureCore.js';
import { WALL_HEIGHT, type CellDescriptor, type WallSpec } from '../world/types.js';
import { WorldRenderer } from './WorldRenderer.js';
import type { CellVisual } from './support.js';

type ArchStructuralRole = 'pier' | 'upper' | 'lower-panel';

let installed = false;

function wallMinY(wall: WallSpec): number { return wall.cy - wall.sy / 2; }
function wallMaxY(wall: WallSpec): number { return wall.cy + wall.sy / 2; }

export function archStructuralRole(wall: WallSpec): ArchStructuralRole | undefined {
  if (wall.materialId !== 'arch-pale-wallpaper') return undefined;
  const minY = wallMinY(wall);
  const maxY = wallMaxY(wall);
  if (Math.abs(wall.sy - ARCH_HEADER_HEIGHT) < 0.055 && Math.abs(maxY - WALL_HEIGHT) < 0.045) return 'upper';
  if (Math.abs(wall.sy - ARCH_LOWER_HEIGHT) < 0.065 && minY <= 0.045) return 'lower-panel';
  if (
    wall.sy > 1.35
    && minY > 0.04
    && minY <= ARCH_LOWER_HEIGHT + 0.065
    && maxY >= WALL_HEIGHT - ARCH_HEADER_HEIGHT - 0.045
  ) return 'pier';
  return undefined;
}

export function archSemanticWallOwnsFinalCollision(wall: WallSpec): boolean {
  const role = archStructuralRole(wall);
  // The player solver is 2D, so collision follows the final visible silhouette:
  // overhead headers are removed while the reconstructed floor-reaching pier keeps this footprint.
  if (role === 'upper') return false;
  if (role === 'pier') return true;
  return wallMinY(wall) <= 0.04;
}

function reconcileArchCollision(renderer: WorldRenderer, visual: CellVisual): void {
  if (visual.descriptor.world.generationVersion !== 'gen3-v1') return;
  const wallById = new Map(visual.descriptor.walls.map((wall) => [wall.id, wall]));

  visual.colliders = visual.colliders.filter((collider) => {
    const wall = wallById.get(collider.id);
    if (!wall || archSemanticWallOwnsFinalCollision(wall)) return true;
    renderer.walls.delete(collider.id);
    return false;
  });
}

/**
 * Renderer-side A-A1 collision compatibility only. Visible A-A1 material and
 * reconstruction ownership belongs to level0RegionPresentation; this adapter
 * only removes semantic overhead-header colliders from the 2D player solver.
 */
export function installArchDividerRuntimeCorrection(): void {
  if (installed) return;
  installed = true;
  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function patchedArchCollisionLoad(
    this: WorldRenderer,
    descriptor: CellDescriptor
  ): void {
    originalLoadCell.call(this, descriptor);
    const visual = this.loaded.get(descriptor.id);
    if (visual) reconcileArchCollision(this, visual);
  };
}
