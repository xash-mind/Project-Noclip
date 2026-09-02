import type { SaveData } from '../../persistence/types.js';
import { calculateExposureDay, calculateWorldDay } from '../../simulation/timeline.js';
import { CELL_SIZE, type WorldTuning } from '../../world/types.js';
import {
  getRenderSettings,
  rendererRenderScope,
  renderDistanceProfile,
  setRendererParticipatingCells
} from '../renderSettings.js';
import { staticWorldBatchingDiagnosticsSnapshot } from '../StaticWorldBatching.js';
import { latestPredictiveWarmCoordinates } from '../streamingPolicy.js';
import type { WorldRenderer } from '../WorldRenderer.js';
import { buildGen3VisibilityTopology } from './topologyAdapter.js';
import { createVisibilitySnapshot } from './snapshot.js';
import type { PreparedVisibilityTopology, VisibilitySnapshot } from './types.js';
import {
  createSafetyCoreCellIds,
  decideVisibilityParticipation,
  visibilityDiscontinuity,
  visibilityParticipationNeedsDistanceFallback,
  VISIBILITY_PARTICIPATION_PROFILE,
  type PriorRendererParticipation,
  type RendererParticipationState,
  type VisibilityParticipationDecision
} from './participation.js';

interface CameraAccess { getPosition(): { x: number; y?: number; z: number }; }
interface GameVisibilityAccess {
  camera?: CameraAccess;
  renderer?: WorldRenderer;
  save?: SaveData;
  tuning: WorldTuning;
  currentCellX: number;
  currentCellZ: number;
}
type VisibilityGame = object;

export interface VisibilitySuspiciousExclusion {
  observerCell: string;
  observerSpace?: string;
  excludedCell: string;
  excludedSpaces: readonly string[];
  openingId?: string;
  openingPath?: string;
  propagationDepth?: number;
  frontierReason?: string;
  distanceMeters: number;
  reason: 'topology-not-reached' | 'opening-frontier';
  priorState: RendererParticipationState;
}

export interface VisibilityParticipationDiagnostics {
  updates: number;
  skippedUpdates: number;
  invalidations: number;
  updateRateHz: number;
  topologyBuilds: number;
  topologyCacheHits: number;
  topologyBuildMs: number;
  lastTopologyBuildMs: number;
  maxTopologyBuildMs: number;
  snapshotMs: number;
  lastSnapshotMs: number;
  maxSnapshotMs: number;
  participationDecisionMs: number;
  lastParticipationDecisionMs: number;
  maxParticipationDecisionMs: number;
  lastCellsChanged: number;
  totalCellsChanged: number;
  lastStateTransitions: number;
  totalStateTransitions: number;
  legacyDistanceCells: readonly string[];
  visibilityCells: readonly string[];
  finalParticipatingCells: readonly string[];
  missingRequiredCells: readonly string[];
  categories: VisibilityParticipationDecision['categories'];
  suspiciousExclusions: readonly VisibilitySuspiciousExclusion[];
  fallbackActive: boolean;
  observerCell?: string;
  observerSpace?: string;
  snapshotTermination?: string;
  activeMf1ByParticipationState: Readonly<Record<RendererParticipationState, number>>;
  activeMf1Total: number;
  shadowedMf1Total: number;
  activeShadowInvariant: boolean;
  batchDirtyCalls: number;
  batchRebuildRequests: number;
  batchReconcilePasses: number;
}

interface RuntimeState {
  prior: Map<string, PriorRendererParticipation>;
  lastObserver?: { x: number; z: number };
  lastUpdateAtMs: number;
  firstUpdateAtMs: number;
  lastCellX?: number;
  lastCellZ?: number;
  lastLoadRadius?: number;
  predictiveSuppressedUntilMs: number;
  topologyCacheKey?: string;
  topologyCache?: PreparedVisibilityTopology;
  lastPublishedAtMs: number;
  diagnostics: VisibilityParticipationDiagnostics;
}

const runtimeStates = new WeakMap<VisibilityGame, RuntimeState>();

function now(): number { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }
function access(game: VisibilityGame): GameVisibilityAccess { return game as unknown as GameVisibilityAccess; }
function emptyCategories(): VisibilityParticipationDecision['categories'] {
  return { both: [], legacyOnly: [], visibilityOnly: [], safetyCore: [], hysteresisRetained: [], predictive: [], distanceFallback: [], nonParticipating: [] };
}
function emptyMf1Counts(): Record<RendererParticipationState, number> {
  return { CAMERA_VISIBLE: 0, SAFETY_CORE: 0, HYSTERESIS_RETAINED: 0, PREDICTIVE: 0, DISTANCE_FALLBACK: 0, NON_PARTICIPATING: 0 };
}
function createDiagnostics(): VisibilityParticipationDiagnostics {
  return {
    updates: 0, skippedUpdates: 0, invalidations: 0, updateRateHz: 0,
    topologyBuilds: 0, topologyCacheHits: 0,
    topologyBuildMs: 0, lastTopologyBuildMs: 0, maxTopologyBuildMs: 0,
    snapshotMs: 0, lastSnapshotMs: 0, maxSnapshotMs: 0,
    participationDecisionMs: 0, lastParticipationDecisionMs: 0, maxParticipationDecisionMs: 0,
    lastCellsChanged: 0, totalCellsChanged: 0, lastStateTransitions: 0, totalStateTransitions: 0,
    legacyDistanceCells: [], visibilityCells: [], finalParticipatingCells: [], missingRequiredCells: [], categories: emptyCategories(),
    suspiciousExclusions: [], fallbackActive: false,
    activeMf1ByParticipationState: emptyMf1Counts(), activeMf1Total: 0, shadowedMf1Total: 0, activeShadowInvariant: true,
    batchDirtyCalls: 0, batchRebuildRequests: 0, batchReconcilePasses: 0
  };
}
function stateFor(game: VisibilityGame): RuntimeState {
  const existing = runtimeStates.get(game);
  if (existing) return existing;
  const created: RuntimeState = {
    prior: new Map(), lastUpdateAtMs: Number.NEGATIVE_INFINITY, firstUpdateAtMs: 0,
    predictiveSuppressedUntilMs: Number.NEGATIVE_INFINITY,
    lastPublishedAtMs: Number.NEGATIVE_INFINITY,
    diagnostics: createDiagnostics()
  };
  runtimeStates.set(game, created);
  return created;
}

function stableRuntimeKey(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? String(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableRuntimeKey(entry)).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableRuntimeKey(record[key])}`).join(',')}}`;
}

function topologyKey(
  seed: string,
  worldDay: number,
  exposure: number,
  tuning: WorldTuning,
  centerX: number,
  centerZ: number,
  loadRadius: number
): string {
  return `${seed}|${worldDay}|${exposure}|${centerX}:${centerZ}:${loadRadius}|${stableRuntimeKey(tuning)}`;
}

function legacyCoordinates(centerX: number, centerZ: number, radius: number): Array<{ x: number; z: number }> {
  const result: Array<{ x: number; z: number }> = [];
  for (let x = centerX - radius; x <= centerX + radius; x += 1) {
    for (let z = centerZ - radius; z <= centerZ + radius; z += 1) result.push({ x, z });
  }
  return result;
}
function idFor(x: number, z: number): string { return `${x}:${z}`; }
function chebyshevDistance(centerX: number, centerZ: number, id: string): number {
  const [xText, zText] = id.split(':');
  const x = Number(xText); const z = Number(zText);
  return Number.isFinite(x) && Number.isFinite(z) ? Math.max(Math.abs(x - centerX), Math.abs(z - centerZ)) : Number.POSITIVE_INFINITY;
}

function suspiciousExclusions(
  topology: PreparedVisibilityTopology,
  snapshot: VisibilitySnapshot,
  decision: VisibilityParticipationDecision,
  prior: ReadonlyMap<string, PriorRendererParticipation>,
  observerX: number,
  observerZ: number
): VisibilitySuspiciousExclusion[] {
  const nonParticipating = new Set(decision.categories.nonParticipating);
  const legacyOnly = new Set(decision.categories.legacyOnly);
  const candidates = [...nonParticipating].filter((id) => legacyOnly.has(id)).sort().slice(0, 64);
  return candidates.map((excludedCell) => {
    const cell = topology.cellById.get(excludedCell);
    const excludedSpaces = topology.spaces.filter((space) => space.cellIds.includes(excludedCell)).map((space) => space.id).sort();
    const frontier = snapshot.frontier.find((entry) => excludedSpaces.includes(entry.toSpaceId) || excludedSpaces.includes(entry.fromSpaceId));
    const centerX = cell ? (cell.bounds.minX + cell.bounds.maxX) / 2 : observerX;
    const centerZ = cell ? (cell.bounds.minZ + cell.bounds.maxZ) / 2 : observerZ;
    return {
      observerCell: snapshot.observer.cellId,
      observerSpace: snapshot.observer.spaceId,
      excludedCell,
      excludedSpaces,
      openingId: frontier?.openingId,
      openingPath: frontier ? `${frontier.fromSpaceId}->${frontier.toSpaceId}` : undefined,
      propagationDepth: frontier?.depth,
      frontierReason: frontier?.reason,
      distanceMeters: Math.hypot(centerX - observerX, centerZ - observerZ),
      reason: frontier ? 'opening-frontier' : 'topology-not-reached',
      priorState: prior.get(excludedCell)?.state ?? 'NON_PARTICIPATING'
    };
  });
}

function activeMf1Counts(
  renderer: WorldRenderer,
  decision: VisibilityParticipationDecision,
  playerX: number,
  playerZ: number,
  centerX: number,
  centerZ: number,
  loadRadius: number
): Record<RendererParticipationState, number> {
  const stateByCell = decision.stateByCell;
  const candidates: Array<{ state: RendererParticipationState; distance: number; id: string }> = [];
  for (const visual of renderer.loaded.values()) {
    const state = stateByCell[visual.descriptor.id] ?? 'NON_PARTICIPATING';
    if (state === 'NON_PARTICIPATING' || chebyshevDistance(centerX, centerZ, visual.descriptor.id) > loadRadius) continue;
    for (const group of visual.descriptor.lightGroups) {
      if (group.state === 'off') continue;
      group.fixtures.forEach((fixture, index) => {
        const worldX = visual.descriptor.address.cellX * CELL_SIZE + fixture.x;
        const worldZ = visual.descriptor.address.cellZ * CELL_SIZE + fixture.z;
        candidates.push({ state, distance: Math.hypot(worldX - playerX, worldZ - playerZ), id: `${group.id}:${index}` });
      });
    }
  }
  const ceiling = renderDistanceProfile(getRenderSettings()).lightShadowSafetyCeiling;
  const selected = candidates.sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id)).slice(0, ceiling);
  const counts = emptyMf1Counts();
  for (const candidate of selected) counts[candidate.state] += 1;
  return counts;
}

function updatePrior(state: RuntimeState, decision: VisibilityParticipationDecision, timestamp: number): void {
  const next = new Map<string, PriorRendererParticipation>();
  for (const [id, participationState] of Object.entries(decision.stateByCell)) {
    const previous = state.prior.get(id);
    const lastParticipatingAtMs = participationState === 'HYSTERESIS_RETAINED'
      ? previous?.lastParticipatingAtMs ?? timestamp
      : participationState === 'NON_PARTICIPATING'
        ? previous?.lastParticipatingAtMs ?? Number.NEGATIVE_INFINITY
        : timestamp;
    next.set(id, { state: participationState, lastParticipatingAtMs });
  }
  state.prior = next;
}

function publish(game: VisibilityGame, force = false): void {
  if (typeof window === 'undefined') return;
  const state = stateFor(game);
  const timestamp = now();
  // Diagnostics are development evidence, not gameplay authority. Avoid cloning
  // several large Cell/category arrays on every render-frame skip.
  if (!force && timestamp - state.lastPublishedAtMs < 250) return;
  state.lastPublishedAtMs = timestamp;
  (window as unknown as { __noclipVisibilityParticipationDiagnostics?: VisibilityParticipationDiagnostics })
    .__noclipVisibilityParticipationDiagnostics = structuredClone(state.diagnostics);
}

function clearVisibilityAuthority(game: VisibilityGame, renderer: WorldRenderer): void {
  const state = stateFor(game);
  setRendererParticipatingCells(renderer, undefined);
  state.prior.clear();
  state.lastObserver = undefined;
  state.lastCellX = undefined;
  state.lastCellZ = undefined;
  state.lastLoadRadius = undefined;
  state.topologyCacheKey = undefined;
  state.topologyCache = undefined;
}

/**
 * Explicit renderer-participation update. Streaming remains the sole residency
 * owner; this function never loads, unloads, or destroys Cells.
 */
export function updateVisibilityParticipation(game: VisibilityGame, force = false): void {
  const gameState = access(game);
  if (!gameState.save || !gameState.renderer || !gameState.camera) return;
  const renderer = gameState.renderer;
  if (gameState.save.generationVersion !== 'gen3-v1') {
    clearVisibilityAuthority(game, renderer);
    return;
  }

  const runtime = stateFor(game);
  const timestamp = now();
  const position = gameState.camera.getPosition();
  const nextObserver = { x: position.x, z: position.z };
  const scope = rendererRenderScope(renderer);
  const profile = renderDistanceProfile(getRenderSettings());
  const loadRadius = scope?.loadRadius ?? profile.loadRadius;
  const elapsed = timestamp - runtime.lastUpdateAtMs;
  const moved = runtime.lastObserver ? Math.hypot(position.x - runtime.lastObserver.x, position.z - runtime.lastObserver.z) : Number.POSITIVE_INFINITY;
  const discontinuity = visibilityDiscontinuity(runtime.lastObserver, nextObserver);
  const envelopeChanged = runtime.lastCellX !== gameState.currentCellX
    || runtime.lastCellZ !== gameState.currentCellZ
    || runtime.lastLoadRadius !== loadRadius;

  if (discontinuity) {
    runtime.prior.clear();
    runtime.predictiveSuppressedUntilMs = timestamp + VISIBILITY_PARTICIPATION_PROFILE.predictiveSuppressionAfterDiscontinuityMs;
    runtime.diagnostics.invalidations += 1;
  }

  const movementDue = moved >= VISIBILITY_PARTICIPATION_PROFILE.movementThresholdMeters
    && elapsed >= VISIBILITY_PARTICIPATION_PROFILE.minimumUpdateIntervalMs;
  const intervalDue = elapsed >= VISIBILITY_PARTICIPATION_PROFILE.maximumUpdateIntervalMs;
  if (!force && !discontinuity && !envelopeChanged && !movementDue && !intervalDue) {
    runtime.diagnostics.skippedUpdates += 1;
    publish(game);
    return;
  }

  const coordinates = legacyCoordinates(gameState.currentCellX, gameState.currentCellZ, loadRadius);
  const legacyDistanceCells = coordinates.map(({ x, z }) => idFor(x, z)).sort();
  const legacySet = new Set(legacyDistanceCells);
  const worldDay = gameState.tuning.worldDayOverride ?? calculateWorldDay(Date.now());
  const exposure = gameState.tuning.exposureOverride ?? calculateExposureDay(gameState.save.exposure);

  const nextTopologyKey = topologyKey(
    gameState.save.seed,
    worldDay,
    exposure,
    gameState.tuning,
    gameState.currentCellX,
    gameState.currentCellZ,
    loadRadius
  );
  let topology = runtime.topologyCache;
  let topologyMs = 0;
  if (!topology || runtime.topologyCacheKey !== nextTopologyKey) {
    const topologyStart = now();
    topology = buildGen3VisibilityTopology({
      seed: gameState.save.seed,
      worldDay,
      exposure,
      tuning: gameState.tuning,
      cells: coordinates
    });
    topologyMs = now() - topologyStart;
    runtime.topologyCache = topology;
    runtime.topologyCacheKey = nextTopologyKey;
    runtime.diagnostics.topologyBuilds += 1;
  } else {
    runtime.diagnostics.topologyCacheHits += 1;
  }

  const snapshotStart = now();
  // Intentionally omit camera direction/FOV. Topology decides architectural
  // participation in all directions; PlayCanvas frustum culling remains the
  // camera-facing per-renderable authority, so rapid turns cannot reveal a
  // topology Cell that was hidden merely because it was behind the camera.
  const snapshot = createVisibilitySnapshot(
    topology,
    { position: nextObserver },
    {
      maxDistance: Math.SQRT2 * (loadRadius + 1.5) * CELL_SIZE,
      maxDepth: VISIBILITY_PARTICIPATION_PROFILE.snapshotMaxDepth,
      maxFrontierStates: VISIBILITY_PARTICIPATION_PROFILE.snapshotMaxFrontierStates,
      captureFrontier: true
    }
  );
  const snapshotMs = now() - snapshotStart;

  const fallbackToLegacyDistance = visibilityParticipationNeedsDistanceFallback({
    observerCellId: snapshot.observer.cellId,
    observerConservative: snapshot.observer.conservative,
    terminationReason: snapshot.termination.primaryReason
  });
  const safetyCoreCells = createSafetyCoreCellIds(gameState.currentCellX, gameState.currentCellZ, legacySet);
  const predictiveCells = timestamp < runtime.predictiveSuppressedUntilMs
    ? []
    : latestPredictiveWarmCoordinates()
      .map(({ x, z }) => idFor(x, z))
      .filter((id) => renderer.loaded.has(id) && chebyshevDistance(gameState.currentCellX, gameState.currentCellZ, id) <= (scope?.retentionRadius ?? profile.retentionRadius));

  const decisionStart = now();
  const decision = decideVisibilityParticipation({
    legacyDistanceCells,
    visibilityCells: snapshot.visibleCells,
    safetyCoreCells,
    predictiveCells,
    loadedCells: [...renderer.loaded.keys()],
    prior: runtime.prior,
    nowMs: timestamp,
    fallbackToLegacyDistance
  });
  const decisionMs = now() - decisionStart;

  const finalSet = new Set(decision.finalParticipatingCells);
  let cellsChanged = 0;
  for (const [id, visual] of renderer.loaded) {
    const enabled = finalSet.has(id);
    if (visual.root.enabled !== enabled) {
      visual.root.enabled = enabled;
      cellsChanged += 1;
    }
  }
  setRendererParticipatingCells(renderer, finalSet);

  const mf1Counts = activeMf1Counts(renderer, decision, position.x, position.z, gameState.currentCellX, gameState.currentCellZ, loadRadius);
  const rendererWithLights = renderer as WorldRenderer & { activeRealtimeFixtureLightCount?: number; shadowedRealtimeFixtureLightCount?: number };
  const activeMf1Total = rendererWithLights.activeRealtimeFixtureLightCount ?? 0;
  const shadowedMf1Total = rendererWithLights.shadowedRealtimeFixtureLightCount ?? 0;
  const batching = staticWorldBatchingDiagnosticsSnapshot();

  if (runtime.firstUpdateAtMs === 0) runtime.firstUpdateAtMs = timestamp;
  runtime.diagnostics.updates += 1;
  const activeDurationSeconds = (timestamp - runtime.firstUpdateAtMs) / 1000;
  runtime.diagnostics.updateRateHz = activeDurationSeconds > 0 ? runtime.diagnostics.updates / activeDurationSeconds : 0;
  runtime.diagnostics.topologyBuildMs += topologyMs;
  runtime.diagnostics.lastTopologyBuildMs = topologyMs;
  runtime.diagnostics.maxTopologyBuildMs = Math.max(runtime.diagnostics.maxTopologyBuildMs, topologyMs);
  runtime.diagnostics.snapshotMs += snapshotMs;
  runtime.diagnostics.lastSnapshotMs = snapshotMs;
  runtime.diagnostics.maxSnapshotMs = Math.max(runtime.diagnostics.maxSnapshotMs, snapshotMs);
  runtime.diagnostics.participationDecisionMs += decisionMs;
  runtime.diagnostics.lastParticipationDecisionMs = decisionMs;
  runtime.diagnostics.maxParticipationDecisionMs = Math.max(runtime.diagnostics.maxParticipationDecisionMs, decisionMs);
  runtime.diagnostics.lastCellsChanged = cellsChanged;
  runtime.diagnostics.totalCellsChanged += cellsChanged;
  runtime.diagnostics.lastStateTransitions = decision.stateTransitions;
  runtime.diagnostics.totalStateTransitions += decision.stateTransitions;
  runtime.diagnostics.legacyDistanceCells = legacyDistanceCells;
  runtime.diagnostics.visibilityCells = [...snapshot.visibleCells];
  runtime.diagnostics.finalParticipatingCells = [...decision.finalParticipatingCells];
  runtime.diagnostics.missingRequiredCells = [...decision.missingRequiredCells];
  runtime.diagnostics.categories = decision.categories;
  runtime.diagnostics.suspiciousExclusions = suspiciousExclusions(topology, snapshot, decision, runtime.prior, position.x, position.z);
  runtime.diagnostics.fallbackActive = fallbackToLegacyDistance;
  runtime.diagnostics.observerCell = snapshot.observer.cellId;
  runtime.diagnostics.observerSpace = snapshot.observer.spaceId;
  runtime.diagnostics.snapshotTermination = snapshot.termination.primaryReason;
  runtime.diagnostics.activeMf1ByParticipationState = mf1Counts;
  runtime.diagnostics.activeMf1Total = activeMf1Total;
  runtime.diagnostics.shadowedMf1Total = shadowedMf1Total;
  runtime.diagnostics.activeShadowInvariant = activeMf1Total === shadowedMf1Total;
  runtime.diagnostics.batchDirtyCalls = batching.dirtyCalls;
  runtime.diagnostics.batchRebuildRequests = batching.dirtyCalls;
  runtime.diagnostics.batchReconcilePasses = batching.reconcilePasses;

  updatePrior(runtime, decision, timestamp);
  runtime.lastObserver = nextObserver;
  runtime.lastUpdateAtMs = timestamp;
  runtime.lastCellX = gameState.currentCellX;
  runtime.lastCellZ = gameState.currentCellZ;
  runtime.lastLoadRadius = loadRadius;
  publish(game, true);
}

export function visibilityParticipationDiagnostics(game: VisibilityGame): VisibilityParticipationDiagnostics {
  return structuredClone(stateFor(game).diagnostics);
}
