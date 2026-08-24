import type { DroppedItemState } from '../persistence/types.js';
import { resolveCircleAgainstAabbs } from '../physics/collision.js';
import { CELL_SIZE, type CellDescriptor } from '../world/types.js';
import { SpatialAabbIndex, SpatialPointIndex } from './runtimeSpatialIndex.js';
import type { InteractionVisual, WorldItemVisual, WorldWall } from './support.js';
import { WorldRenderer } from './WorldRenderer.js';

interface RuntimeIndexState {
  collision: SpatialAabbIndex<WorldWall>;
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
let installed = false;
let latestRenderer: WorldRenderer | undefined;

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

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

function stateFor(renderer: WorldRenderer): RuntimeIndexState {
  latestRenderer = renderer;
  const existing = states.get(renderer);
  if (existing) return existing;
  const created: RuntimeIndexState = {
    collision: new SpatialAabbIndex<WorldWall>(CELL_SIZE),
    interactions: new SpatialPointIndex<InteractionVisual>(CELL_SIZE),
    dynamicItems: new Map(),
    diagnostics: emptyDiagnostics()
  };
  // The normal installation path runs before any WorldRenderer exists. This
  // reconstruction makes the derived index safe for tests/hot reload as well.
  for (const wall of renderer.walls.values()) created.collision.add(wall);
  for (const interaction of renderer.interactions.values()) {
    created.interactions.add(interaction);
    if (isTickingItem(interaction)) created.dynamicItems.set(interaction.id, interaction);
  }
  states.set(renderer, created);
  refreshCounts(created);
  return created;
}

function refreshCounts(state: RuntimeIndexState): void {
  state.diagnostics.indexedColliders = state.collision.size;
  state.diagnostics.indexedInteractions = state.interactions.size;
  state.diagnostics.tickingWorldItems = state.dynamicItems.size;
}

function addInteraction(state: RuntimeIndexState, interaction: InteractionVisual): void {
  state.interactions.add(interaction);
  if (isTickingItem(interaction)) state.dynamicItems.set(interaction.id, interaction);
  else state.dynamicItems.delete(interaction.id);
}

function removeInteraction(state: RuntimeIndexState, id: string): void {
  state.interactions.remove(id);
  state.dynamicItems.delete(id);
}

function indexCell(renderer: WorldRenderer, descriptor: CellDescriptor): void {
  const visual = renderer.loaded.get(descriptor.id);
  if (!visual) return;
  const state = stateFor(renderer);
  for (const collider of visual.colliders) state.collision.add(collider);
  for (const interaction of visual.interactions) addInteraction(state, interaction);
  refreshCounts(state);
}

function unindexCell(renderer: WorldRenderer, cellId: string): void {
  const visual = renderer.loaded.get(cellId);
  if (!visual) return;
  const state = stateFor(renderer);
  for (const collider of visual.colliders) state.collision.remove(collider.id);
  for (const interaction of visual.interactions) removeInteraction(state, interaction.id);
  refreshCounts(state);
}

export function runtimePerformanceDiagnosticsSnapshot(renderer: WorldRenderer): RuntimePerformanceDiagnostics {
  const diagnostics = stateFor(renderer).diagnostics;
  return { ...diagnostics };
}

export function installRuntimePerformance(): void {
  if (installed) return;
  installed = true;

  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function performanceIndexedLoad(this: WorldRenderer, descriptor: CellDescriptor): void {
    const alreadyLoaded = this.loaded.has(descriptor.id);
    originalLoadCell.call(this, descriptor);
    if (!alreadyLoaded) indexCell(this, descriptor);
  };

  const originalUnloadCell = WorldRenderer.prototype.unloadCell;
  WorldRenderer.prototype.unloadCell = function performanceIndexedUnload(this: WorldRenderer, cellId: string): void {
    unindexCell(this, cellId);
    originalUnloadCell.call(this, cellId);
  };

  const originalRemoveInteraction = WorldRenderer.prototype.removeInteraction;
  WorldRenderer.prototype.removeInteraction = function performanceIndexedInteractionRemoval(this: WorldRenderer, id: string): void {
    removeInteraction(stateFor(this), id);
    originalRemoveInteraction.call(this, id);
    refreshCounts(stateFor(this));
  };

  const originalAddDroppedItem = WorldRenderer.prototype.addDroppedItem;
  WorldRenderer.prototype.addDroppedItem = function performanceIndexedDrop(this: WorldRenderer, drop: DroppedItemState): void {
    originalAddDroppedItem.call(this, drop);
    const cellX = Math.floor((drop.x + CELL_SIZE / 2) / CELL_SIZE);
    const cellZ = Math.floor((drop.z + CELL_SIZE / 2) / CELL_SIZE);
    const visual = this.loaded.get(`${cellX}:${cellZ}`);
    const state = stateFor(this);
    if (visual) for (const interaction of visual.interactions) addInteraction(state, interaction);
    refreshCounts(state);
  };

  WorldRenderer.prototype.resolveMovement = function performanceIndexedMovement(
    this: WorldRenderer,
    currentX: number,
    currentZ: number,
    nextX: number,
    nextZ: number,
    radius = 0.34
  ): [number, number] {
    const state = stateFor(this);
    const started = now();
    // Query the full swept player envelope. Every collider that could influence
    // either sweep axis or depenetration intersects this rectangle.
    const candidates = state.collision.query(
      Math.min(currentX, nextX) - radius - 0.001,
      Math.min(currentZ, nextZ) - radius - 0.001,
      Math.max(currentX, nextX) + radius + 0.001,
      Math.max(currentZ, nextZ) + radius + 0.001
    );
    const result = resolveCircleAgainstAabbs(currentX, currentZ, nextX, nextZ, candidates, radius);
    const elapsed = now() - started;
    const diagnostics = state.diagnostics;
    diagnostics.collisionQueries += 1;
    diagnostics.collisionCandidates += candidates.length;
    diagnostics.collisionCandidatePeak = Math.max(diagnostics.collisionCandidatePeak, candidates.length);
    diagnostics.collisionGlobalEquivalent += this.walls.size;
    diagnostics.collisionMs += elapsed;
    diagnostics.collisionMaxMs = Math.max(diagnostics.collisionMaxMs, elapsed);
    return result;
  };

  WorldRenderer.prototype.closestInteraction = function performanceIndexedClosestInteraction(
    this: WorldRenderer,
    x: number,
    y: number,
    z: number,
    fx: number,
    fz: number,
    maxDistance = 2.75
  ): InteractionVisual | undefined {
    const state = stateFor(this);
    const started = now();
    const candidates = state.interactions.queryRadius(x, z, maxDistance);
    let best: InteractionVisual | undefined;
    let bestDistance = maxDistance;
    for (const interaction of candidates) {
      const dx = interaction.x - x;
      const dz = interaction.z - z;
      const distance = Math.hypot(dx, interaction.y - y, dz);
      if (distance >= bestDistance || distance < 0.001) continue;
      const horizontal = Math.max(0.001, Math.hypot(dx, dz));
      if ((dx * fx + dz * fz) / horizontal < 0.15) continue;
      best = interaction;
      bestDistance = distance;
    }
    const elapsed = now() - started;
    const diagnostics = state.diagnostics;
    diagnostics.interactionQueries += 1;
    diagnostics.interactionCandidates += candidates.length;
    diagnostics.interactionCandidatePeak = Math.max(diagnostics.interactionCandidatePeak, candidates.length);
    diagnostics.interactionGlobalEquivalent += this.interactions.size;
    diagnostics.interactionMs += elapsed;
    diagnostics.interactionMaxMs = Math.max(diagnostics.interactionMaxMs, elapsed);
    return best;
  };

  WorldRenderer.prototype.updateDynamicItems = function performanceIndexedDynamicItems(this: WorldRenderer, timestamp: number): void {
    const state = stateFor(this);
    const started = now();
    const candidates = [...state.dynamicItems.values()];
    for (const interaction of candidates) {
      const activatedAt = interaction.activatedAt;
      if (!activatedAt) continue;
      const remaining = Math.max(0, 1 - (timestamp - activatedAt) / 600_000);
      if (interaction.light?.light) {
        interaction.light.light.intensity = remaining * 0.85;
        interaction.light.light.range = 2 + remaining * 6;
      }
      interaction.entity.enabled = remaining > 0.002;
      if (remaining <= 0) state.dynamicItems.delete(interaction.id);
    }
    const elapsed = now() - started;
    const diagnostics = state.diagnostics;
    diagnostics.dynamicUpdateCalls += 1;
    diagnostics.dynamicCandidates += candidates.length;
    diagnostics.dynamicGlobalEquivalent += this.interactions.size;
    diagnostics.dynamicUpdateMs += elapsed;
    diagnostics.dynamicUpdateMaxMs = Math.max(diagnostics.dynamicUpdateMaxMs, elapsed);
    refreshCounts(state);
  };

  if (typeof window !== 'undefined') {
    (window as unknown as { __noclipRuntimePerformanceDiagnostics?: { snapshot: () => RuntimePerformanceDiagnostics | undefined } })
      .__noclipRuntimePerformanceDiagnostics = {
        snapshot: () => latestRenderer ? runtimePerformanceDiagnosticsSnapshot(latestRenderer) : undefined
      };
  }
}
