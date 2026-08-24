import type * as pc from 'playcanvas';
import type { ProjectNoclipGame } from '../app/ProjectNoclipGame.js';
import type { SaveData } from '../persistence/types.js';
import { canShift, shouldShift } from '../simulation/shifting.js';
import { calculateExposureDay, calculateWorldDay } from '../simulation/timeline.js';
import { generateCell } from '../world/generator.js';
import type { CellDescriptor, WorldTuning } from '../world/types.js';
import type { WorldRenderer } from './WorldRenderer.js';
import { getRenderSettings, renderDistanceProfile, setRendererRenderScope } from './renderSettings.js';

import {
  STREAMING_SCHEDULER_PROFILE,
  predictiveVelocitySample,
  predictiveWarmCoordinates,
  streamingFrameCanRunHeavyWork
} from './streamingPolicy.js';
export {
  STREAMING_SCHEDULER_PROFILE,
  predictiveVelocitySample,
  predictiveWarmCoordinates,
  streamingFrameCanRunHeavyWork,
  streamingRetentionDisposition
} from './streamingPolicy.js';
export type { PredictiveVelocitySample, StreamingRetentionDisposition, WarmCoordinate } from './streamingPolicy.js';

interface RenderControl { autoRender: boolean; renderNextFrame: boolean; }
interface CameraAccess { getPosition(): { x: number; z: number }; }
interface GameStreamingAccess {
  app?: pc.Application;
  camera?: CameraAccess;
  renderer?: WorldRenderer;
  save?: SaveData;
  tuning: WorldTuning;
  currentCellX: number;
  currentCellZ: number;
  currentCell?: CellDescriptor;
  streamWarmupToken: number;
  refreshRegionExtent(): void;
  refreshLightField(): void;
  notifyRegionEntry(): void;
}
interface RuntimePrototype { update(this: ProjectNoclipGame, dt: number): void; }
type JobKind = 'prepare' | 'refresh' | 'unload';
interface StreamJob {
  key: string; kind: JobKind; x: number; z: number; priority: number; serial: number; notBefore: number; predictive: boolean;
}
export interface StreamingDiagnostics {
  queueDepth: number;
  queueDepthPeak: number;
  predictiveWarmLoads: number;
  coldBoundaryLoads: number;
  generatedCells: number;
  loadedCells: number;
  refreshedCells: number;
  unloadedCells: number;
  lastBoundaryFrameMs: number;
  maxBoundaryFrameMs: number;
  generateMs: number;
  cellRendererMs: number;
  cellRefreshMs: number;
  cellUnloadMs: number;
  boundaryReconcileMs: number;
  regionRefreshMs: number;
  lastHeavyOperations: number;
  maxHeavyOperations: number;
  lastHeavyMs: number;
  maxHeavyMs: number;
  heavyBudgetDeferrals: number;
  heavyBudgetOverruns: number;
  lastHeavyOperation?: { kind: JobKind | 'required-current'; x: number; z: number; durationMs: number };
  lastUpdateMs: number;
  maxUpdateMs: number;
  predictiveSpeedMetersPerSecond: number;
  predictiveDirectionX: number;
  predictiveDirectionZ: number;
  predictiveDiscontinuities: number;
  predictiveStops: number;
  jobSelectionScans: number;
}
interface SchedulerState {
  jobs: Map<string, StreamJob>;
  serial: number;
  lastX?: number;
  lastZ?: number;
  directionX: number;
  directionZ: number;
  lastCellX?: number;
  lastCellZ?: number;
  diagnostics: StreamingDiagnostics;
  frameActive: boolean;
  frameHeavyOperations: number;
  frameHeavyMs: number;
}

const states = new WeakMap<ProjectNoclipGame, SchedulerState>();
let installed = false;

function access(game: ProjectNoclipGame): GameStreamingAccess { return game as unknown as GameStreamingAccess; }
function now(): number { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }
function createDiagnostics(): StreamingDiagnostics {
  return {
    queueDepth: 0, queueDepthPeak: 0, predictiveWarmLoads: 0, coldBoundaryLoads: 0, generatedCells: 0, loadedCells: 0, refreshedCells: 0, unloadedCells: 0,
    lastBoundaryFrameMs: 0, maxBoundaryFrameMs: 0, generateMs: 0, cellRendererMs: 0, cellRefreshMs: 0, cellUnloadMs: 0, boundaryReconcileMs: 0, regionRefreshMs: 0,
    lastHeavyOperations: 0, maxHeavyOperations: 0, lastHeavyMs: 0, maxHeavyMs: 0, heavyBudgetDeferrals: 0, heavyBudgetOverruns: 0, lastUpdateMs: 0, maxUpdateMs: 0,
    predictiveSpeedMetersPerSecond: 0, predictiveDirectionX: 0, predictiveDirectionZ: 0, predictiveDiscontinuities: 0, predictiveStops: 0, jobSelectionScans: 0
  };
}
function stateFor(game: ProjectNoclipGame): SchedulerState {
  const existing = states.get(game);
  if (existing) return existing;
  const created: SchedulerState = { jobs: new Map(), serial: 0, directionX: 0, directionZ: 0, diagnostics: createDiagnostics(), frameActive: false, frameHeavyOperations: 0, frameHeavyMs: 0 };
  states.set(game, created);
  return created;
}
function publish(game: ProjectNoclipGame): void {
  if (typeof window === 'undefined') return;
  const state = stateFor(game);
  state.diagnostics.queueDepth = state.jobs.size;
  state.diagnostics.queueDepthPeak = Math.max(state.diagnostics.queueDepthPeak, state.jobs.size);
  (window as unknown as { __noclipStreamingDiagnostics?: StreamingDiagnostics }).__noclipStreamingDiagnostics = { ...state.diagnostics };
}

function boundQueue(scheduler: SchedulerState): void {
  if (scheduler.jobs.size <= STREAMING_SCHEDULER_PROFILE.maxQueueDepth) return;
  const removable = [...scheduler.jobs.values()]
    .filter((job) => job.predictive || job.kind === 'unload')
    .sort((left, right) => right.priority - left.priority || right.serial - left.serial);
  while (scheduler.jobs.size > STREAMING_SCHEDULER_PROFILE.maxQueueDepth && removable.length > 0) {
    const job = removable.shift();
    if (job) scheduler.jobs.delete(job.key);
  }
}
function cellDistance(state: GameStreamingAccess, x: number, z: number): number {
  return Math.max(Math.abs(x - state.currentCellX), Math.abs(z - state.currentCellZ));
}
function descriptorFor(state: GameStreamingAccess, x: number, z: number, diagnostics: StreamingDiagnostics): CellDescriptor {
  if (!state.save) throw new Error('Streaming descriptor requested without a save');
  const start = now();
  const id = `${x}:${z}`;
  const descriptor = generateCell({
    seed: state.save.seed,
    x,
    z,
    worldDay: state.tuning.worldDayOverride ?? calculateWorldDay(Date.now()),
    exposure: state.tuning.exposureOverride ?? calculateExposureDay(state.save.exposure),
    shiftEpoch: state.save.shiftEpochs[id] ?? 0,
    tuning: state.tuning,
    generationVersion: state.save.generationVersion
  });
  diagnostics.generateMs += now() - start;
  diagnostics.generatedCells += 1;
  return descriptor;
}
function descriptorChanged(existing: CellDescriptor, descriptor: CellDescriptor): boolean {
  return existing.address.shiftEpoch !== descriptor.address.shiftEpoch
    || existing.address.zoneId !== descriptor.address.zoneId
    || existing.roomArchetype !== descriptor.roomArchetype;
}
function enqueue(scheduler: SchedulerState, kind: JobKind, x: number, z: number, priority: number, delayMs = 0, predictive = false): void {
  const key = `${kind}:${x}:${z}`;
  const existing = scheduler.jobs.get(key);
  const notBefore = now() + delayMs;
  if (existing) {
    existing.priority = Math.min(existing.priority, priority);
    existing.predictive = existing.predictive && predictive;
    if (kind === 'unload') existing.notBefore = Math.max(existing.notBefore, notBefore);
    return;
  }
  scheduler.jobs.set(key, { key, kind, x, z, priority, serial: scheduler.serial++, notBefore, predictive });
  boundQueue(scheduler);
}
function cancel(scheduler: SchedulerState, kind: JobKind, x: number, z: number): void {
  scheduler.jobs.delete(`${kind}:${x}:${z}`);
}
function clearPredictiveJobs(scheduler: SchedulerState): void {
  for (const job of scheduler.jobs.values()) if (job.predictive) scheduler.jobs.delete(job.key);
}
function resetPrediction(game: ProjectNoclipGame): void {
  const state = access(game);
  const scheduler = stateFor(game);
  const position = state.camera?.getPosition();
  scheduler.lastX = position?.x;
  scheduler.lastZ = position?.z;
  scheduler.directionX = 0;
  scheduler.directionZ = 0;
  scheduler.diagnostics.predictiveSpeedMetersPerSecond = 0;
  scheduler.diagnostics.predictiveDirectionX = 0;
  scheduler.diagnostics.predictiveDirectionZ = 0;
  clearPredictiveJobs(scheduler);
  predictiveWarmCoordinates(state.currentCellX, state.currentCellZ, renderDistanceProfile(getRenderSettings()).loadRadius, 0, 0);
}
function enableForScope(game: ProjectNoclipGame, descriptor: CellDescriptor): void {
  const state = access(game);
  const visual = state.renderer?.loaded.get(descriptor.id);
  if (!visual) return;
  const loadRadius = renderDistanceProfile(getRenderSettings()).loadRadius;
  visual.root.enabled = cellDistance(state, descriptor.address.cellX, descriptor.address.cellZ) <= loadRadius;
}
function prepareCell(game: ProjectNoclipGame, x: number, z: number, predictive: boolean): void {
  const state = access(game);
  const scheduler = stateFor(game);
  if (!state.renderer || !state.save) return;
  const id = `${x}:${z}`;
  const existing = state.renderer.loaded.get(id)?.descriptor;
  if (existing) { enableForScope(game, existing); return; }
  const descriptor = descriptorFor(state, x, z, scheduler.diagnostics);
  const start = now();
  state.renderer.loadCell(descriptor);
  scheduler.diagnostics.cellRendererMs += now() - start;
  scheduler.diagnostics.loadedCells += 1;
  if (predictive) scheduler.diagnostics.predictiveWarmLoads += 1;
  enableForScope(game, descriptor);
}
function refreshCell(game: ProjectNoclipGame, x: number, z: number): void {
  const state = access(game);
  const scheduler = stateFor(game);
  if (!state.renderer || !state.save) return;
  const id = `${x}:${z}`;
  const existing = state.renderer.loaded.get(id)?.descriptor;
  if (!existing) { prepareCell(game, x, z, false); return; }
  const descriptor = descriptorFor(state, x, z, scheduler.diagnostics);
  if (!descriptorChanged(existing, descriptor)) return;
  const start = now();
  state.renderer.refreshCell(descriptor);
  scheduler.diagnostics.cellRefreshMs += now() - start;
  scheduler.diagnostics.refreshedCells += 1;
  enableForScope(game, descriptor);
}
function unloadCell(game: ProjectNoclipGame, x: number, z: number): void {
  const state = access(game);
  const scheduler = stateFor(game);
  if (!state.renderer || !state.save) return;
  const id = `${x}:${z}`;
  const visual = state.renderer.loaded.get(id);
  if (!visual) return;
  const profile = renderDistanceProfile(getRenderSettings());
  const distance = cellDistance(state, x, z);
  if (distance <= profile.retentionRadius) return;
  const unloadCount = (state.save.unloadCounts[id] ?? 0) + 1;
  state.save.unloadCounts[id] = unloadCount;
  if (state.save.generationVersion === 'gen2'
    && canShift({ occupied: false, observed: false, distanceInCells: distance, stability: visual.descriptor.stability, protectedInteraction: false, preservesPath: true })
    && shouldShift(state.save.seed, id, unloadCount, state.tuning.shiftChance)) {
    state.save.shiftEpochs[id] = (state.save.shiftEpochs[id] ?? 0) + 1;
  }
  const start = now();
  state.renderer.unloadCell(id);
  scheduler.diagnostics.cellUnloadMs += now() - start;
  scheduler.diagnostics.unloadedCells += 1;
}
function runHeavyOperation(
  game: ProjectNoclipGame,
  kind: JobKind | 'required-current',
  x: number,
  z: number,
  required: boolean,
  operation: () => void
): boolean {
  const scheduler = stateFor(game);
  if (scheduler.frameActive && !streamingFrameCanRunHeavyWork(scheduler.frameHeavyOperations, scheduler.frameHeavyMs)) {
    if (!required) {
      scheduler.diagnostics.heavyBudgetDeferrals += 1;
      return false;
    }
  }
  const start = now();
  operation();
  const durationMs = now() - start;
  if (scheduler.frameActive) {
    scheduler.frameHeavyOperations += 1;
    scheduler.frameHeavyMs += durationMs;
    if (scheduler.frameHeavyMs > STREAMING_SCHEDULER_PROFILE.workBudgetMs) scheduler.diagnostics.heavyBudgetOverruns += 1;
  }
  scheduler.diagnostics.lastHeavyOperation = { kind, x, z, durationMs };
  scheduler.diagnostics.maxHeavyMs = Math.max(scheduler.diagnostics.maxHeavyMs, durationMs);
  return true;
}
function processOneJob(game: ProjectNoclipGame): void {
  const scheduler = stateFor(game);
  if (!streamingFrameCanRunHeavyWork(scheduler.frameHeavyOperations, scheduler.frameHeavyMs)) {
    if (scheduler.jobs.size > 0) scheduler.diagnostics.heavyBudgetDeferrals += 1;
    publish(game);
    return;
  }
  const timestamp = now();
  let job: StreamJob | undefined;
  for (const candidate of scheduler.jobs.values()) {
    scheduler.diagnostics.jobSelectionScans += 1;
    if (candidate.notBefore > timestamp) continue;
    if (!job || candidate.priority < job.priority || (candidate.priority === job.priority && candidate.serial < job.serial)) job = candidate;
  }
  if (!job) { publish(game); return; }
  const ran = runHeavyOperation(game, job.kind, job.x, job.z, false, () => {
    if (job?.kind === 'prepare') prepareCell(game, job.x, job.z, job.predictive);
    else if (job?.kind === 'refresh') refreshCell(game, job.x, job.z);
    else if (job) unloadCell(game, job.x, job.z);
  });
  if (ran) scheduler.jobs.delete(job.key);
  publish(game);
}
function warmAhead(game: ProjectNoclipGame, dt: number): void {
  const state = access(game);
  const scheduler = stateFor(game);
  if (!state.renderer || !state.save || !state.camera) return;
  const position = state.camera.getPosition();
  let velocityX = 0;
  let velocityZ = 0;
  if (scheduler.lastX !== undefined && scheduler.lastZ !== undefined) {
    const sample = predictiveVelocitySample(scheduler.lastX, scheduler.lastZ, position.x, position.z, dt);
    if (sample.discontinuity) {
      scheduler.diagnostics.predictiveDiscontinuities += 1;
    } else {
      velocityX = sample.x;
      velocityZ = sample.z;
    }
  }
  scheduler.lastX = position.x;
  scheduler.lastZ = position.z;
  const previousSpeed = Math.hypot(scheduler.directionX, scheduler.directionZ);
  scheduler.directionX = velocityX;
  scheduler.directionZ = velocityZ;
  const speed = Math.hypot(velocityX, velocityZ);
  if (previousSpeed >= STREAMING_SCHEDULER_PROFILE.predictiveMinimumSpeedMetersPerSecond
    && speed < STREAMING_SCHEDULER_PROFILE.predictiveMinimumSpeedMetersPerSecond) scheduler.diagnostics.predictiveStops += 1;
  scheduler.diagnostics.predictiveSpeedMetersPerSecond = speed;
  scheduler.diagnostics.predictiveDirectionX = velocityX;
  scheduler.diagnostics.predictiveDirectionZ = velocityZ;

  const profile = renderDistanceProfile(getRenderSettings());
  // Predictive jobs are a projection of the latest authoritative velocity.
  // Reversal/stop therefore cancels stale work behind the player immediately.
  clearPredictiveJobs(scheduler);
  for (const coordinate of predictiveWarmCoordinates(state.currentCellX, state.currentCellZ, profile.loadRadius, velocityX, velocityZ)) {
    const id = `${coordinate.x}:${coordinate.z}`;
    if (!state.renderer.loaded.has(id)) enqueue(scheduler, 'prepare', coordinate.x, coordinate.z, 60 + coordinate.priority, 0, true);
    cancel(scheduler, 'unload', coordinate.x, coordinate.z);
  }
}
function finishReconcile(game: ProjectNoclipGame): void {
  const state = access(game);
  const scheduler = stateFor(game);
  if (state.app) {
    const rendering = state.app as unknown as RenderControl;
    if (!rendering.autoRender) rendering.renderNextFrame = true;
  }
  const start = now();
  state.refreshRegionExtent();
  state.refreshLightField();
  state.notifyRegionEntry();
  scheduler.diagnostics.regionRefreshMs += now() - start;
  publish(game);
}
function forceReconcile(game: ProjectNoclipGame, radius: number, retentionRadius: number): void {
  const state = access(game);
  const scheduler = stateFor(game);
  if (!state.save || !state.renderer) return;
  scheduler.jobs.clear();
  resetPrediction(game);
  const desired = new Set<string>();
  for (let x = state.currentCellX - radius; x <= state.currentCellX + radius; x += 1) {
    for (let z = state.currentCellZ - radius; z <= state.currentCellZ + radius; z += 1) {
      const id = `${x}:${z}`;
      desired.add(id);
      const descriptor = descriptorFor(state, x, z, scheduler.diagnostics);
      const existing = state.renderer.loaded.get(id)?.descriptor;
      if (!existing) {
        const start = now(); state.renderer.loadCell(descriptor); scheduler.diagnostics.cellRendererMs += now() - start; scheduler.diagnostics.loadedCells += 1;
      } else if (descriptorChanged(existing, descriptor)) {
        const start = now(); state.renderer.refreshCell(descriptor); scheduler.diagnostics.cellRefreshMs += now() - start; scheduler.diagnostics.refreshedCells += 1;
      }
      const visual = state.renderer.loaded.get(id); if (visual) visual.root.enabled = true;
      if (x === state.currentCellX && z === state.currentCellZ) state.currentCell = descriptor;
    }
  }
  for (const [id, visual] of [...state.renderer.loaded.entries()]) {
    if (desired.has(id)) continue;
    const distance = cellDistance(state, visual.descriptor.address.cellX, visual.descriptor.address.cellZ);
    if (distance <= retentionRadius) visual.root.enabled = false;
    else unloadCell(game, visual.descriptor.address.cellX, visual.descriptor.address.cellZ);
  }
  finishReconcile(game);
}

export function reconcileStreaming(game: ProjectNoclipGame, force = false, radiusOverride?: number): void {
  const state = access(game);
  const scheduler = stateFor(game);
  if (!state.save || !state.renderer) return;
  if (radiusOverride === undefined) state.streamWarmupToken += 1;
  const settings = getRenderSettings();
  const profile = renderDistanceProfile(settings);
  state.tuning = { ...state.tuning, activeRadius: profile.loadRadius };
  const radius = Math.max(1, Math.min(profile.loadRadius, Math.round(radiusOverride ?? profile.loadRadius)));
  setRendererRenderScope(state.renderer, { centerCellX: state.currentCellX, centerCellZ: state.currentCellZ, loadRadius: radius, retentionRadius: profile.retentionRadius });
  const reconcileStart = now();
  if (force) {
    forceReconcile(game, radius, profile.retentionRadius);
    scheduler.diagnostics.boundaryReconcileMs += now() - reconcileStart;
    return;
  }

  const desired = new Set<string>();
  const currentId = `${state.currentCellX}:${state.currentCellZ}`;
  let currentDescriptor = state.renderer.loaded.get(currentId)?.descriptor;
  if (!currentDescriptor) {
    cancel(scheduler, 'prepare', state.currentCellX, state.currentCellZ);
    const loaded = runHeavyOperation(game, 'required-current', state.currentCellX, state.currentCellZ, true, () => prepareCell(game, state.currentCellX, state.currentCellZ, false));
    currentDescriptor = state.renderer.loaded.get(currentId)?.descriptor;
    if (loaded) scheduler.diagnostics.coldBoundaryLoads += 1;
  }
  if (currentDescriptor) state.currentCell = currentDescriptor;

  for (let x = state.currentCellX - radius; x <= state.currentCellX + radius; x += 1) {
    for (let z = state.currentCellZ - radius; z <= state.currentCellZ + radius; z += 1) {
      const id = `${x}:${z}`;
      desired.add(id);
      cancel(scheduler, 'unload', x, z);
      const visual = state.renderer.loaded.get(id);
      if (visual) {
        // A retained/active Cell descriptor cannot change while it remains loaded:
        // shift epochs advance only on actual unload. Reusing it avoids flooding the
        // per-frame queue with deterministic no-op descriptor refreshes.
        visual.root.enabled = true;
      } else {
        const directionLength = Math.hypot(scheduler.directionX, scheduler.directionZ) || 1;
        const directional = ((x - state.currentCellX) * scheduler.directionX + (z - state.currentCellZ) * scheduler.directionZ) / directionLength;
        const directionalBias = Math.max(-3, Math.min(3, directional));
        enqueue(scheduler, 'prepare', x, z, 12 + cellDistance(state, x, z) * 2 - directionalBias);
      }
    }
  }

  for (const [id, visual] of [...state.renderer.loaded.entries()]) {
    if (desired.has(id)) continue;
    const x = visual.descriptor.address.cellX;
    const z = visual.descriptor.address.cellZ;
    const distance = cellDistance(state, x, z);
    if (distance <= profile.retentionRadius) {
      visual.root.enabled = false;
      cancel(scheduler, 'unload', x, z);
    } else {
      visual.root.enabled = false;
      enqueue(scheduler, 'unload', x, z, 120 + distance, STREAMING_SCHEDULER_PROFILE.unloadGraceMs);
    }
  }
  scheduler.diagnostics.boundaryReconcileMs += now() - reconcileStart;
  finishReconcile(game);
}

export function installStreamingScheduler(prototype: RuntimePrototype): void {
  if (installed) return;
  installed = true;
  const originalUpdate = prototype.update;
  prototype.update = function streamingScheduledUpdate(this: ProjectNoclipGame, dt: number): void {
    const scheduler = stateFor(this);
    const state = access(this);
    const frameStart = now();
    scheduler.frameActive = true;
    scheduler.frameHeavyOperations = 0;
    scheduler.frameHeavyMs = 0;
    // Boundary safety gets first admission. A required current-Cell load may
    // exceed the ordinary budget if necessary, while queued work stays bounded.
    originalUpdate.call(this, dt);
    processOneJob(this);
    warmAhead(this, dt);
    scheduler.frameActive = false;
    scheduler.diagnostics.lastHeavyOperations = scheduler.frameHeavyOperations;
    scheduler.diagnostics.maxHeavyOperations = Math.max(scheduler.diagnostics.maxHeavyOperations, scheduler.frameHeavyOperations);
    scheduler.diagnostics.lastHeavyMs = scheduler.frameHeavyMs;
    const updateMs = now() - frameStart;
    scheduler.diagnostics.lastUpdateMs = updateMs;
    scheduler.diagnostics.maxUpdateMs = Math.max(scheduler.diagnostics.maxUpdateMs, updateMs);
    const changedCell = scheduler.lastCellX !== undefined
      && (scheduler.lastCellX !== state.currentCellX || scheduler.lastCellZ !== state.currentCellZ);
    if (changedCell) {
      scheduler.diagnostics.lastBoundaryFrameMs = updateMs;
      scheduler.diagnostics.maxBoundaryFrameMs = Math.max(scheduler.diagnostics.maxBoundaryFrameMs, updateMs);
    }
    scheduler.lastCellX = state.currentCellX;
    scheduler.lastCellZ = state.currentCellZ;
    publish(this);
  };
}
