import {
  archFrameBaysForDescriptors,
  archLowerPanelWorldVolumeForCell,
  archSemanticWallOwnsFinalCollision,
  type ArchLowerPanelWorldVolume
} from '../world/gen3ArchDividerSemantics.js';
import { type CellDescriptor, type WallSpec } from '../world/types.js';
import { WorldRenderer } from './WorldRenderer.js';
import type { CellVisual, WorldCollider } from './support.js';

export const ARCH_LOWER_PANEL_COLLIDER_PREFIX = 'arch-visible-lower-collider:';

function isCanonicalLowerPanelCollider(collider: WorldCollider): boolean {
  return collider.id.startsWith(ARCH_LOWER_PANEL_COLLIDER_PREFIX);
}

function lowerPanelCollider(descriptor: CellDescriptor, volume: ArchLowerPanelWorldVolume): WorldCollider {
  const along = (volume.start + volume.end) / 2;
  const length = volume.end - volume.start;
  const cy = (volume.minY + volume.maxY) / 2;
  const sy = volume.maxY - volume.minY;
  const cx = volume.orientation === 'z' ? along : volume.fixed;
  const cz = volume.orientation === 'z' ? volume.fixed : along;
  const sx = volume.orientation === 'z' ? length : volume.depth;
  const sz = volume.orientation === 'z' ? volume.depth : length;
  return {
    // Preserve the accepted Wave 1 runtime-only collider ID exactly without
    // consulting a rendered entity name. The suffix is derived from the same
    // canonical bay identity that presentation uses.
    id: `${ARCH_LOWER_PANEL_COLLIDER_PREFIX}${descriptor.id}:arch-frame:lower-panel:${volume.bayId}`,
    cellId: descriptor.id,
    shiftEpoch: descriptor.address.shiftEpoch,
    minX: cx - sx / 2,
    maxX: cx + sx / 2,
    minY: volume.minY,
    maxY: volume.maxY,
    minZ: cz - sz / 2,
    maxZ: cz + sz / 2,
    cx,
    cy,
    cz,
    sx,
    sy,
    sz,
    orientation: volume.orientation,
    drawable: true
  };
}

function descriptorWallById(visual: CellVisual): Map<string, WallSpec> {
  return new Map(visual.descriptor.walls.map((wall) => [wall.id, wall]));
}

function removeObsoleteArchCollision(renderer: WorldRenderer, visual: CellVisual): void {
  const walls = descriptorWallById(visual);
  visual.colliders = visual.colliders.filter((collider) => {
    if (isCanonicalLowerPanelCollider(collider)) {
      renderer.walls.delete(collider.id);
      return false;
    }
    const semanticWall = walls.get(collider.id);
    if (!semanticWall || archSemanticWallOwnsFinalCollision(semanticWall)) return true;
    renderer.walls.delete(collider.id);
    return false;
  });
}

function realizeCellLowerPanels(
  renderer: WorldRenderer,
  visual: CellVisual,
  descriptors: readonly CellDescriptor[]
): void {
  if (visual.descriptor.world.generationVersion !== 'gen3-v1') return;
  removeObsoleteArchCollision(renderer, visual);
  for (const bay of archFrameBaysForDescriptors(descriptors)) {
    const volume = archLowerPanelWorldVolumeForCell(visual.descriptor, bay);
    if (!volume) continue;
    const collider = lowerPanelCollider(visual.descriptor, volume);
    visual.colliders.push(collider);
    renderer.walls.set(collider.id, collider);
  }
}

/**
 * Realize the final canonical A-A1 collider set synchronously from world data.
 *
 * Neighbor residency can change which complete world-space bays are observable,
 * so the same local neighborhood that presentation rebuilds is refreshed here.
 * The calculation consumes descriptors only; PlayCanvas entities and names are
 * intentionally absent from gameplay collision truth.
 */
export function realizeNearbyArchCollision(
  renderer: WorldRenderer,
  descriptor: CellDescriptor
): string[] {
  const visuals = [...renderer.loaded.values()];
  const descriptors = visuals.map((visual) => visual.descriptor);
  const affected: string[] = [];
  for (const visual of visuals) {
    if (
      Math.abs(visual.descriptor.address.cellX - descriptor.address.cellX) > 1
      || Math.abs(visual.descriptor.address.cellZ - descriptor.address.cellZ) > 1
    ) continue;
    realizeCellLowerPanels(renderer, visual, descriptors);
    affected.push(visual.descriptor.id);
  }
  return affected;
}
