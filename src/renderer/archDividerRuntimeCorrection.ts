import * as pc from 'playcanvas';
import { materialColor, materialNumber } from '../presentation/materialRuntime.js';
import { ARCH_HEADER_HEIGHT, ARCH_LOWER_HEIGHT } from '../world/gen3ArchitectureCore.js';
import { CELL_SIZE, WALL_HEIGHT, type CellDescriptor, type WallSpec } from '../world/types.js';
import { WorldRenderer } from './WorldRenderer.js';
import { makeMaterial, type CellVisual, type WorldCollider } from './support.js';

type ArchStructuralRole = 'pier' | 'upper' | 'lower-panel';
interface ArchCorrectionCache { materials: Map<string, pc.StandardMaterial>; }
const ARCH_TARGET = 'material.arch-pale-wallpaper';
const ARCH_VISIBLE_LOWER_COLLIDER_PREFIX = 'arch-visible-lower-collider:';
const ARCH_LOWER_PANEL_PREFIX = 'arch-frame:lower-panel:';
const caches = new WeakMap<WorldRenderer, ArchCorrectionCache>();
const pendingCollisionCells = new WeakMap<WorldRenderer, Set<string>>();
const scheduledCollisionFlush = new WeakSet<WorldRenderer>();
let installed = false;

function wallMinY(wall: WallSpec): number { return wall.cy - wall.sy / 2; }
function wallMaxY(wall: WallSpec): number { return wall.cy + wall.sy / 2; }
export function archStructuralRole(wall: WallSpec): ArchStructuralRole | undefined {
  if (wall.materialId !== 'arch-pale-wallpaper') return undefined;
  const minY = wallMinY(wall), maxY = wallMaxY(wall);
  if (Math.abs(wall.sy - ARCH_HEADER_HEIGHT) < 0.055 && Math.abs(maxY - WALL_HEIGHT) < 0.045) return 'upper';
  if (Math.abs(wall.sy - ARCH_LOWER_HEIGHT) < 0.065 && minY <= 0.045) return 'lower-panel';
  if (wall.sy > 1.35 && minY > 0.04 && minY <= ARCH_LOWER_HEIGHT + 0.065 && maxY >= WALL_HEIGHT - ARCH_HEADER_HEIGHT - 0.045) return 'pier';
  return undefined;
}
export function archSemanticWallOwnsFinalCollision(wall: WallSpec): boolean {
  const role = archStructuralRole(wall); if (role === 'upper' || role === 'lower-panel') return false; if (role === 'pier') return true; return wallMinY(wall) <= 0.04;
}
function cacheFor(renderer: WorldRenderer): ArchCorrectionCache { const existing = caches.get(renderer); if (existing) return existing; const created = { materials: new Map<string, pc.StandardMaterial>() }; caches.set(renderer, created); return created; }
function childrenOf(entity: pc.Entity): pc.Entity[] { return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children]; }
function entityByName(root: pc.Entity, name: string): pc.Entity | undefined { return childrenOf(root).find((child) => child.name === name); }
function materialForRole(cache: ArchCorrectionCache, role: ArchStructuralRole): pc.StandardMaterial {
  const keyName = role === 'pier' ? 'pierColor' : role === 'lower-panel' ? 'panelColor' : 'upperColor';
  const fallback: [number, number, number] = role === 'pier' ? [0.76,0.735,0.665] : role === 'lower-panel' ? [0.885,0.872,0.805] : [0.955,0.945,0.885];
  const color = materialColor(ARCH_TARGET, keyName, fallback), gloss = materialNumber(ARCH_TARGET, 'gloss', 0.07), key = `${role}:${color.join(',')}:${gloss}`;
  const existing = cache.materials.get(key); if (existing) return existing;
  const value = makeMaterial(color); value.gloss = gloss; value.update(); cache.materials.set(key, value); return value;
}
function applyArchDividerRuntimeCorrection(renderer: WorldRenderer, visual: CellVisual): void {
  if (visual.descriptor.world.generationVersion !== 'gen3-v1') return; const cache = cacheFor(renderer); const wallById = new Map(visual.descriptor.walls.map((wall) => [wall.id, wall]));
  for (const wall of visual.descriptor.walls) { const role = archStructuralRole(wall); if (!role) continue; const entity = entityByName(visual.root, wall.id); if (entity?.render) entity.render.material = materialForRole(cache, role); }
  visual.colliders = visual.colliders.filter((collider) => { const wall = wallById.get(collider.id); if (!wall || archSemanticWallOwnsFinalCollision(wall)) return true; renderer.walls.delete(collider.id); return false; });
}
function lowerPanelOrientation(name: string): WallSpec['orientation'] | undefined { if (!name.startsWith(ARCH_LOWER_PANEL_PREFIX)) return undefined; const suffix = name.slice(ARCH_LOWER_PANEL_PREFIX.length); if (suffix.startsWith('x:')) return 'x'; if (suffix.startsWith('z:')) return 'z'; return undefined; }
function lowerPanelCollider(visual: CellVisual, entity: pc.Entity, orientation: WallSpec['orientation']): WorldCollider {
  const position = entity.getLocalPosition(), scale = entity.getLocalScale(); const cx = visual.descriptor.address.cellX * CELL_SIZE + position.x, cy = position.y, cz = visual.descriptor.address.cellZ * CELL_SIZE + position.z;
  return { id: `${ARCH_VISIBLE_LOWER_COLLIDER_PREFIX}${visual.descriptor.id}:${entity.name}`, cellId: visual.descriptor.id, shiftEpoch: visual.descriptor.address.shiftEpoch, minX: cx-scale.x/2, maxX: cx+scale.x/2, minY: cy-scale.y/2, maxY: cy+scale.y/2, minZ: cz-scale.z/2, maxZ: cz+scale.z/2, cx, cy, cz, sx: scale.x, sy: scale.y, sz: scale.z, orientation, drawable: true };
}
function reconcileVisibleLowerPanelCollision(renderer: WorldRenderer, visual: CellVisual): void {
  if (visual.descriptor.world.generationVersion !== 'gen3-v1') return;
  visual.colliders = visual.colliders.filter((collider) => { if (!collider.id.startsWith(ARCH_VISIBLE_LOWER_COLLIDER_PREFIX)) return true; renderer.walls.delete(collider.id); return false; });
  for (const child of childrenOf(visual.root)) { const orientation = lowerPanelOrientation(child.name); if (!orientation || !child.enabled || !child.render || child.render.enabled === false) continue; const collider = lowerPanelCollider(visual, child, orientation); visual.colliders.push(collider); renderer.walls.set(collider.id, collider); }
}
function markNearbyCollisionCells(renderer: WorldRenderer, descriptor: CellDescriptor): void {
  const pending = pendingCollisionCells.get(renderer) ?? new Set<string>();
  for (const visual of renderer.loaded.values()) if (Math.abs(visual.descriptor.address.cellX-descriptor.address.cellX) <= 1 && Math.abs(visual.descriptor.address.cellZ-descriptor.address.cellZ) <= 1) pending.add(visual.descriptor.id);
  pendingCollisionCells.set(renderer, pending); if (scheduledCollisionFlush.has(renderer)) return; scheduledCollisionFlush.add(renderer);
  queueMicrotask(() => { scheduledCollisionFlush.delete(renderer); const targets = pendingCollisionCells.get(renderer); if (!targets || targets.size === 0) return; pendingCollisionCells.set(renderer, new Set()); for (const cellId of targets) { const visual = renderer.loaded.get(cellId); if (visual) reconcileVisibleLowerPanelCollision(renderer, visual); } });
}
export function installArchDividerRuntimeCorrection(): void {
  if (installed) return; installed = true; const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function patchedArchCorrectionLoad(this: WorldRenderer, descriptor: CellDescriptor): void { originalLoadCell.call(this, descriptor); const visual = this.loaded.get(descriptor.id); if (visual) applyArchDividerRuntimeCorrection(this, visual); markNearbyCollisionCells(this, descriptor); };
  const originalUnloadCell = WorldRenderer.prototype.unloadCell;
  WorldRenderer.prototype.unloadCell = function patchedArchCorrectionUnload(this: WorldRenderer, cellId: string): void { const descriptor = this.loaded.get(cellId)?.descriptor; originalUnloadCell.call(this, cellId); if (descriptor) markNearbyCollisionCells(this, descriptor); };
}
