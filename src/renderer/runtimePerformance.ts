import { CELL_SIZE, type CellDescriptor } from '../world/types.js';
import { SpatialAabbIndex, SpatialPointIndex, type SpatialQueryBounds } from './runtimeSpatialIndex.js';
import type { InteractionVisual, WorldItemVisual, WorldWall } from './support.js';
import type { WorldRenderer } from './WorldRenderer.js';

interface RuntimeIndexState {
  collision: SpatialAabbIndex<WorldWall>;
  collisionIdsByCell: Map<string, Set<string>>;
  indexedColliderRefs: Map<string, WorldWall>;
  interactions: SpatialPointIndex<InteractionVisual>;
  dynamicItems: Map<string, WorldItemVisual>;
  diagnostics: RuntimePerformanceDiagnostics;
}

export interface RuntimePerformanceDiagnostics {
  collisionQueries: number;
  collisionCandidates: number;
  collisionCandidatePeak: number;
  collisionGlobalEquivalent: number;
  collisionMs: number;
  collisionMaxMs: number;
  interactionQueries: number;
  interactionCandidates: number;
  interactionCandidatePeak: number;
  interactionGlobalEquivalent: number;
  interactionMs: number;
  interactionMaxMs: number;
  dynamicUpdateCalls: number;
  dynamicCandidates: number;
  dynamicGlobalEquivalent: number;
  dynamicUpdateMs: number;
  dynamicUpdateMaxMs: number;
  indexedColliders: number;
  indexedInteractions: number;
  tickingWorldItems: number;
}

const states = new WeakMap<WorldRenderer, RuntimeIndexState>();
let diagnosticsInitialized = false;
let latestRenderer: WorldRenderer | undefined;

function emptyDiagnostics(): RuntimePerformanceDiagnostics {
  return {
    collisionQueries: 0,
    collisionCandidates: 0,
    collisionCandidatePeak: 0,
    collisionGlobalEquivalent: 0,
    collisionMs: 0,
    collisionMaxMs: 0,
    interactionQueries: 0,
    interactionCandidates: 0,
    interactionCandidatePeak: 0,
    interactionGlobalEquivalent: 0,
    interactionMs: 0,
    interactionMaxMs: 0,
    dynamicUpdateCalls: 0,
    dynamicCandidates: 0,
    dynamicGlobalEquivalent: 0,
    dynamicUpdateMs: 0,
    dynamicUpdateMaxMs: 0,
    indexedColliders: 0,
    indexedInteractions: 0,
    tickingWorldItems: 0
  };
}

function isTickingItem(interaction: InteractionVisual): interaction is WorldItemVisual {
  return interaction.kind === 'item'
    && interaction.item.definitionId === 'glow-stick'
    && Boolean(interaction.activatedAt);
}

function rememberCollision(state: RuntimeIndexState, collider: WorldWall): void {
  state.collision.add(collider);
  state.indexedColliderRefs.set(collider.id, collider);
  const ids = state.collisionIdsByCell.get(collider.cellId) ?? new Set<string>();
  ids.add(collider.id);
  state.collisionIdsByCell.set(collider.cellId, ids);
}

function removeCollision(state: RuntimeIndexState, id: string): void {
  const previous = state.indexedColliderRefs.get(id);
  state.collision.remove(id);
  state.indexedColliderRefs.delete(id);
  if (!previous) return;
  const ids = state.collisionIdsByCell.get(previous.cellId);
  ids?.delete(id);
  if (ids?.size === 0) state.collisionIdsByCell.delete(previous.cellId);
}

function sameBounds(left: WorldWall, right: WorldWall): boolean {
  return left.minX === right.minX
    && left.maxX === right.maxX
    && left.minY === right.minY
    && left.maxY === right.maxY
    && left.minZ === right.minZ
    && left.maxZ === right.maxZ
    && left.orientation === right.orientation
    && left.drawable === right.drawable;
}

/**
 * Reconcile one Cell's derived collision entries without perturbing unchanged
 * insertion order. This keeps indexed collision equivalent to renderer.walls
 * while allowing neighbor-aware A-A1 collider geometry to change in place.
 */
function syncCellColliders(state: RuntimeIndexState, cellId: string, colliders: readonly WorldWall[]): void {
  const desired = new Map(colliders.map((collider) => [collider.id, collider]));
  const existingIds = new Set(state.collisionIdsByCell.get(cellId) ?? []);

  for (const id of existingIds) {
    if (!desired.has(id)) removeCollision(state, id);
  }

  for (const collider of colliders) {
    const previous = state.indexedColliderRefs.get(collider.id);
    if (previous && previous === collider) continue;
    if (previous && sameBounds(previous, collider)) {
      state.indexedColliderRefs.set(collider.id, collider);
      continue;
    }
    if (previous) removeCollision(state, collider.id);
    rememberCollision(state, collider);
  }

  const ids = new Set(colliders.map((collider) => collider.id));
  if (ids.size > 0) state.collisionIdsByCell.set(cellId, ids);
  else state.collisionIdsByCell.delete(cellId);
}

function refreshCounts(state: RuntimeIndexState): void {
  state.diagnostics.indexedColliders = state.collision.size;
  state.diagnostics.indexedInteractions = state.interactions.size;
  state.diagnostics.tickingWorldItems = state.dynamicItems.size;
}

function stateFor(renderer: WorldRenderer): RuntimeIndexState {
  latestRenderer = renderer;
  const existing = states.get(renderer);
  if (existing) return existing;
  const created: RuntimeIndexState = {
    collision: new SpatialAabbIndex<WorldWall>(CELL_SIZE),
    collisionIdsByCell: new Map(),
    indexedColliderRefs: new Map(),
    interactions: new SpatialPointIndex<InteractionVisual>(CELL_SIZE),
    dynamicItems: new Map(),
    diagnostics: emptyDiagnostics()
  };
  // Derived state is reconstructible from canonical renderer state. This also
  // keeps direct-method tests and development hot reload safe without installers.
  for (const wall of renderer.walls.values()) rememberCollision(created, wall);
  for (const interaction of renderer.interactions.values()) {
    created.interactions.add(interaction);
    if (isTickingItem(interaction)) created.dynamicItems.set(interaction.id, interaction);
  }
  states.set(renderer, created);
  refreshCounts(created);
  return created;
}

export function registerRuntimeInteraction(renderer: WorldRenderer, interaction: InteractionVisual): void {
  const state = stateFor(renderer);
  state.interactions.add(interaction);
  if (isTickingItem(interaction)) state.dynamicItems.set(interaction.id, interaction);
  else state.dynamicItems.delete(interaction.id);
  refreshCounts(state);
}

export function unregisterRuntimeInteraction(renderer: WorldRenderer, id: string): void {
  const state = stateFor(renderer);
  state.interactions.remove(id);
  state.dynamicItems.delete(id);
  refreshCounts(state);
}

export function retireRuntimeDynamicItem(renderer: WorldRenderer, id: string): void {
  const state = stateFor(renderer);
  state.dynamicItems.delete(id);
  refreshCounts(state);
}

export function runtimeCollisionCandidates(renderer: WorldRenderer, bounds: SpatialQueryBounds): WorldWall[] {
  const state = stateFor(renderer);
  return state.collision.query(bounds.minX, bounds.minZ, bounds.maxX, bounds.maxZ);
}

export function recordRuntimeCollisionQuery(
  renderer: WorldRenderer,
  candidateCount: number,
  globalEquivalent: number,
  elapsedMs: number
): void {
  const diagnostics = stateFor(renderer).diagnostics;
  diagnostics.collisionQueries += 1;
  diagnostics.collisionCandidates += candidateCount;
  diagnostics.collisionCandidatePeak = Math.max(diagnostics.collisionCandidatePeak, candidateCount);
  diagnostics.collisionGlobalEquivalent += globalEquivalent;
  diagnostics.collisionMs += elapsedMs;
  diagnostics.collisionMaxMs = Math.max(diagnostics.collisionMaxMs, elapsedMs);
}

export function runtimeInteractionCandidates(renderer: WorldRenderer, x: number, z: number, radius: number): InteractionVisual[] {
  return stateFor(renderer).interactions.queryRadius(x, z, radius);
}

export function recordRuntimeInteractionQuery(
  renderer: WorldRenderer,
  candidateCount: number,
  globalEquivalent: number,
  elapsedMs: number
): void {
  const diagnostics = stateFor(renderer).diagnostics;
  diagnostics.interactionQueries += 1;
  diagnostics.interactionCandidates += candidateCount;
  diagnostics.interactionCandidatePeak = Math.max(diagnostics.interactionCandidatePeak, candidateCount);
  diagnostics.interactionGlobalEquivalent += globalEquivalent;
  diagnostics.interactionMs += elapsedMs;
  diagnostics.interactionMaxMs = Math.max(diagnostics.interactionMaxMs, elapsedMs);
}

export function runtimeDynamicItemCandidates(renderer: WorldRenderer): WorldItemVisual[] {
  return [...stateFor(renderer).dynamicItems.values()];
}

export function recordRuntimeDynamicItemUpdate(
  renderer: WorldRenderer,
  candidateCount: number,
  globalEquivalent: number,
  elapsedMs: number
): void {
  const state = stateFor(renderer);
  const diagnostics = state.diagnostics;
  diagnostics.dynamicUpdateCalls += 1;
  diagnostics.dynamicCandidates += candidateCount;
  diagnostics.dynamicGlobalEquivalent += globalEquivalent;
  diagnostics.dynamicUpdateMs += elapsedMs;
  diagnostics.dynamicUpdateMaxMs = Math.max(diagnostics.dynamicUpdateMaxMs, elapsedMs);
  refreshCounts(state);
}

export function refreshRuntimeCellCollisionState(renderer: WorldRenderer, cellId: string): void {
  const state = stateFor(renderer);
  const visual = renderer.loaded.get(cellId);
  syncCellColliders(state, cellId, visual?.colliders ?? []);
  refreshCounts(state);
}

export function registerRuntimeCellState(renderer: WorldRenderer, descriptor: CellDescriptor): void {
  const visual = renderer.loaded.get(descriptor.id);
  if (!visual) return;
  const state = stateFor(renderer);
  syncCellColliders(state, descriptor.id, visual.colliders);
  for (const interaction of visual.interactions) {
    state.interactions.add(interaction);
    if (isTickingItem(interaction)) state.dynamicItems.set(interaction.id, interaction);
    else state.dynamicItems.delete(interaction.id);
  }
  refreshCounts(state);
}

export function unregisterRuntimeCellState(renderer: WorldRenderer, cellId: string): void {
  const visual = renderer.loaded.get(cellId);
  if (!visual) return;
  const state = stateFor(renderer);
  for (const id of [...(state.collisionIdsByCell.get(cellId) ?? [])]) removeCollision(state, id);
  for (const interaction of visual.interactions) {
    state.interactions.remove(interaction.id);
    state.dynamicItems.delete(interaction.id);
  }
  refreshCounts(state);
}

export function runtimePerformanceDiagnosticsSnapshot(renderer: WorldRenderer): RuntimePerformanceDiagnostics {
  return { ...stateFor(renderer).diagnostics };
}

export function resetRuntimePerformanceDiagnostics(renderer: WorldRenderer): void {
  const state = stateFor(renderer);
  state.diagnostics = emptyDiagnostics();
  refreshCounts(state);
}

/** Development diagnostics bridge only; it installs no renderer behavior. */
export function initializeRuntimePerformanceDiagnostics(): void {
  if (diagnosticsInitialized) return;
  diagnosticsInitialized = true;
  if (typeof window !== 'undefined') {
    (window as unknown as { __noclipRuntimePerformanceDiagnostics?: { snapshot: () => RuntimePerformanceDiagnostics | undefined } })
      .__noclipRuntimePerformanceDiagnostics = {
        snapshot: () => latestRenderer ? runtimePerformanceDiagnosticsSnapshot(latestRenderer) : undefined
      };
  }
}
