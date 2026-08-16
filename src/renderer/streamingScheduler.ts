import type * as pc from 'playcanvas';
import type { ProjectNoclipGame } from '../app/ProjectNoclipGame.js';
import type { SaveData } from '../persistence/types.js';
import { canShift, shouldShift } from '../simulation/shifting.js';
import { calculateExposureDay, calculateWorldDay } from '../simulation/timeline.js';
import { generateCell } from '../world/generator.js';
import type { CellDescriptor, WorldTuning } from '../world/types.js';
import type { WorldRenderer } from './WorldRenderer.js';
import { getRenderSettings, renderDistanceProfile, setRendererRenderScope } from './renderSettings.js';

export const STREAMING_SCHEDULER_PROFILE = Object.freeze({
  workBudgetMs: 2.25,
  maxHeavyJobsPerFrame: 1,
  unloadGraceMs: 1200,
  predictiveExtraRings: 1
});

export type StreamingRetentionDisposition = 'active' | 'retained' | 'unload';
export function streamingRetentionDisposition(distance: number, loadRadius: number, retentionRadius: number): StreamingRetentionDisposition {
  if (distance <= loadRadius) return 'active';
  if (distance <= retentionRadius) return 'retained';
  return 'unload';
}

export interface WarmCoordinate { x: number; z: number; priority: number; }
export function predictiveWarmCoordinates(
  centerX: number,
  centerZ: number,
  loadRadius: number,
  directionX: number,
  directionZ: number
): WarmCoordinate[] {
  if (Math.hypot(directionX, directionZ) < 0.08) return [];
  const retentionRadius = loadRadius + STREAMING_SCHEDULER_PROFILE.predictiveExtraRings;
  const length = Math.hypot(directionX, directionZ) || 1;
  const nx = directionX / length;
  const nz = directionZ / length;
  const result = new Map<string, WarmCoordinate>();
  const add = (x: number, z: number, priority: number): void => {
    const id = `${x}:${z}`;
    const existing = result.get(id);
    if (!existing || priority < existing.priority) result.set(id, { x, z, priority });
  };
  if (Math.abs(nx) >= 0.2) {
    const x = centerX + Math.sign(nx) * retentionRadius;
    for (let offset = -loadRadius; offset <= loadRadius; offset += 1) add(x, centerZ + offset, 10 + Math.abs(offset));
  }
  if (Math.abs(nz) >= 0.2) {
    const z = centerZ + Math.sign(nz) * retentionRadius;
    for (let offset = -loadRadius; offset <= loadRadius; offset += 1) add(centerX + offset, z, 10 + Math.abs(offset));
  }
  if (Math.abs(nx) >= 0.2 && Math.abs(nz) >= 0.2) {
    add(centerX + Math.sign(nx) * retentionRadius, centerZ + Math.sign(nz) * retentionRadius, 9);
  }
  return [...result.values()].sort((left, right) => left.priority - right.priority || left.x - right.x || left.z - right.z);
}

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
interface StreamJob { key: string; kind: JobKind; x: number; z: number; priority: number; serial: number; notBefore: number; }
export interface StreamingDiagnostics {
  queueDepth: number;
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
}

const states = new WeakMap<ProjectNoclipGame, SchedulerState>();
let installed = false;

function access(game: ProjectNoclipGame): GameStreamingAccess { return game as unknown as GameStreamingAccess; }
function now(): number { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }
function createDiagnostics(): StreamingDiagnostics {
  return { queueDepth: 0, predictiveWarmLoads: 0, coldBoundaryLoads: 0, generatedCells: 0, loadedCells: 0, refreshedCells: 0, unloadedCells: 0, lastBoundaryFrameMs: 0, maxBoundaryFrameMs: 0, generateMs: 0, cellRendererMs: 0, cellRefreshMs: 0, cellUnloadMs: 0, boundaryReconcileMs: 0, regionRefreshMs: 0 };
}
function stateFor(game: ProjectNoclipGame): SchedulerState {
  const existing = states.get(game);
  if (existing) return existing;
  const created: SchedulerState = { jobs: new Map(), serial: 0, directionX: 0, directionZ: 0, diagnostics: createDiagnostics() };
  states.set(game, created);
  return created;
}
function publish(game: ProjectNoclipGame): void {
  if (typeof window === 'undefined') return;
  const state = stateFor(game);
  state.diagnostics.queueDepth = state.jobs.size;
  (window as unknown as { __noclipStreamingDiagnostics?: StreamingDiagnostics }).__noclipStreamingDiagnostics = { ...state.diagnostics };
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
function enqueue(scheduler: SchedulerState, kind: JobKind, x: number, z: number, priority: number, delayMs = 0): void {
  const key = `${kind}:${x}:${z}`;
  const existing = scheduler.jobs.get(key);
  const notBefore = now() + delayMs;
  if (existing) {
    existing.priority = Math.min(existing.priority, priority);
    if (kind === 'unload') existing.notBefore = Math.max(existing.notBefore, notBefore);
    return;
  }
  scheduler.jobs.set(key, { key, kind, x, z, priority, serial: scheduler.serial++, notBefore });
}
function cancel(scheduler: SchedulerState, kind: JobKind, x: number, z: number): void {
  scheduler.jobs.delete(`${kind}:${x}:${z}`);
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
function processOneJob(game: ProjectNoclipGame): void {
  const scheduler = stateFor(game);
  const timestamp = now();
  const eligible = [...scheduler.jobs.values()]
    .filter((job) => job.notBefore <= timestamp)
    .sort((left, right) => left.priority - right.priority || left.serial - right.serial);
  const job = eligible[0];
  if (!job) { publish(game); return; }
  scheduler.jobs.delete(job.key);
  if (job.kind === 'prepare') prepareCell(game, job.x, job.z, job.priority < 30);
  else if (job.kind === 'refresh') refreshCell(game, job.x, job.z);
  else unloadCell(game, job.x, job.z);
  publish(game);
}
function warmAhead(game: ProjectNoclipGame): void {
  const state = access(game);
  const scheduler = stateFor(game);
  if (!state.renderer || !state.save || !state.camera) return;
  const position = state.camera.getPosition();
  if (scheduler.lastX !== undefined && scheduler.lastZ !== undefined) {
    const dx = position.x - scheduler.lastX;
    const dz = position.z - scheduler.lastZ;
    if (Math.hypot(dx, dz) > 0.005) {
      scheduler.directionX = scheduler.directionX * 0.65 + dx * 0.35;
      scheduler.directionZ = scheduler.directionZ * 0.65 + dz * 0.35;
    }
  }
  scheduler.lastX = position.x;
  scheduler.lastZ = position.z;
  const profile = renderDistanceProfile(getRenderSettings());
  for (const coordinate of predictiveWarmCoordinates(state.currentCellX, state.currentCellZ, profile.loadRadius, scheduler.directionX, scheduler.directionZ)) {
    const id = `${coordinate.x}:${coordinate.z}`;
    if (!state.renderer.loaded.has(id)) enqueue(scheduler, 'prepare', coordinate.x, coordinate.z, coordinate.priority);
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
  const missing: Array<{ x: number; z: number; score: number }> = [];
  const currentDescriptor = descriptorFor(state, state.currentCellX, state.currentCellZ, scheduler.diagnostics);
  const currentExisting = state.renderer.loaded.get(currentDescriptor.id)?.descriptor;
  if (!currentExisting) prepareCell(game, state.currentCellX, state.currentCellZ, false);
  else if (descriptorChanged(currentExisting, currentDescriptor)) {
    const start = now(); state.renderer.refreshCell(currentDescriptor); scheduler.diagnostics.cellRefreshMs += now() - start; scheduler.diagnostics.refreshedCells += 1;
  }
  state.currentCell = currentDescriptor;

  for (let x = state.currentCellX - radius; x <= state.currentCellX + radius; x += 1) {
    for (let z = state.currentCellZ - radius; z <= state.currentCellZ + radius; z += 1) {
      const id = `${x}:${z}`;
      desired.add(id);
      cancel(scheduler, 'unload', x, z);
      const visual = state.renderer.loaded.get(id);
      if (visual) {
        visual.root.enabled = true;
        if (x !== state.currentCellX || z !== state.currentCellZ) enqueue(scheduler, 'refresh', x, z, 80 + cellDistance(state, x, z));
      } else {
        const score = -((x - state.currentCellX) * scheduler.directionX + (z - state.currentCellZ) * scheduler.directionZ);
        missing.push({ x, z, score });
        enqueue(scheduler, 'prepare', x, z, 35 + cellDistance(state, x, z));
      }
    }
  }

  if (missing.length > 0) {
    missing.sort((left, right) => left.score - right.score);
    const emergency = missing[0]!;
    cancel(scheduler, 'prepare', emergency.x, emergency.z);
    prepareCell(game, emergency.x, emergency.z, false);
    scheduler.diagnostics.coldBoundaryLoads += 1;
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
    processOneJob(this);
    originalUpdate.call(this, dt);
    warmAhead(this);
    const changedCell = scheduler.lastCellX !== undefined
      && (scheduler.lastCellX !== state.currentCellX || scheduler.lastCellZ !== state.currentCellZ);
    if (changedCell) {
      const frameMs = now() - frameStart;
      scheduler.diagnostics.lastBoundaryFrameMs = frameMs;
      scheduler.diagnostics.maxBoundaryFrameMs = Math.max(scheduler.diagnostics.maxBoundaryFrameMs, frameMs);
    }
    scheduler.lastCellX = state.currentCellX;
    scheduler.lastCellZ = state.currentCellZ;
    publish(this);
  };
}
