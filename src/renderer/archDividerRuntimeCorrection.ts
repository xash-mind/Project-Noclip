import * as pc from 'playcanvas';
import { ARCH_HEADER_HEIGHT, ARCH_LOWER_HEIGHT } from '../world/gen3ArchitectureCore.js';
import { WALL_HEIGHT, type CellDescriptor, type WallSpec } from '../world/types.js';
import { WorldRenderer } from './WorldRenderer.js';
import { makeMaterial, type CellVisual } from './support.js';

type ArchStructuralRole = 'pier' | 'upper' | 'lower-panel';

interface ArchCorrectionCache {
  pier: pc.StandardMaterial;
  upper: pc.StandardMaterial;
  lowerPanel: pc.StandardMaterial;
}

const caches = new WeakMap<WorldRenderer, ArchCorrectionCache>();
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
  if (role === 'upper') return false;
  if (role === 'pier') return true;
  return wallMinY(wall) <= 0.04;
}

function cacheFor(renderer: WorldRenderer): ArchCorrectionCache {
  const existing = caches.get(renderer);
  if (existing) return existing;
  const created: ArchCorrectionCache = {
    pier: makeMaterial([0.76, 0.735, 0.665]),
    upper: makeMaterial([0.955, 0.945, 0.885]),
    lowerPanel: makeMaterial([0.885, 0.872, 0.805])
  };
  caches.set(renderer, created);
  return created;
}

function childrenOf(entity: pc.Entity): pc.Entity[] {
  return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children];
}

function entityByName(root: pc.Entity, name: string): pc.Entity | undefined {
  return childrenOf(root).find((child) => child.name === name);
}

function materialForRole(cache: ArchCorrectionCache, role: ArchStructuralRole): pc.StandardMaterial {
  if (role === 'pier') return cache.pier;
  if (role === 'lower-panel') return cache.lowerPanel;
  return cache.upper;
}

function applyArchDividerRuntimeCorrection(renderer: WorldRenderer, visual: CellVisual): void {
  if (visual.descriptor.world.generationVersion !== 'gen3-v1') return;
  const cache = cacheFor(renderer);
  const wallById = new Map(visual.descriptor.walls.map((wall) => [wall.id, wall]));

  for (const wall of visual.descriptor.walls) {
    const role = archStructuralRole(wall);
    if (!role) continue;
    const entity = entityByName(visual.root, wall.id);
    if (entity?.render) entity.render.material = materialForRole(cache, role);
  }

  visual.colliders = visual.colliders.filter((collider) => {
    const wall = wallById.get(collider.id);
    if (!wall || archSemanticWallOwnsFinalCollision(wall)) return true;
    renderer.walls.delete(collider.id);
    return false;
  });
}

/**
 * Final A-A1 compatibility pass after Region reconstruction. Structural semantic
 * fallback pieces use plain Arch-compatible materials (never wallpaper). The
 * 2D solver removes overhead header semantics, but keeps the semantic pier
 * footprint because the visible reconstructed pier reaches the floor on exactly
 * that footprint. Portal cuts and decorative lower panels retain world ownership.
 */
export function installArchDividerRuntimeCorrection(): void {
  if (installed) return;
  installed = true;
  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function patchedArchCorrectionLoad(
    this: WorldRenderer,
    descriptor: CellDescriptor
  ): void {
    originalLoadCell.call(this, descriptor);
    const visual = this.loaded.get(descriptor.id);
    if (visual) applyArchDividerRuntimeCorrection(this, visual);
  };
}
