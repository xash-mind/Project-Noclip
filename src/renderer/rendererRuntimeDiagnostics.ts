import type * as pc from 'playcanvas';
import { ProjectNoclipGame } from '../app/ProjectNoclipGame.js';
import type { WorldRenderer } from './WorldRenderer.js';
import { fixtureLightingDiagnosticsSnapshot } from './fixtureLighting.js';
import { archPresentationDiagnosticsSnapshot } from './level0RegionPresentation.js';
import {
  resetRuntimePerformanceDiagnostics,
  runtimePerformanceDiagnosticsSnapshot
} from './runtimePerformance.js';
import { staticWorldBatchingDiagnosticsSnapshot } from './StaticWorldBatching.js';
import type { StreamingDiagnostics } from './streamingScheduler.js';

const MAX_FRAME_SAMPLES = 900;
const MAX_EVENTS = 120;
const FAILURE_STORAGE_KEY = 'project-noclip:renderer-failure:v1';

type FailureKind = 'webgl-context-lost' | 'webgl-context-restored' | 'graphics-device-lost' | 'graphics-device-restored' | 'severe-frame';
interface GameAccess {
  app?: pc.Application;
  renderer?: WorldRenderer;
  currentCellX: number;
  currentCellZ: number;
}
interface RuntimePrototype {
  setupEngine(this: ProjectNoclipGame): void;
}
interface GraphicsDeviceEvents {
  on(name: string, callback: () => void): void;
  loseContext?: () => void;
  restoreContext?: () => void;
}
interface RenderStats { drawCalls?: { total?: number }; }

export interface RendererFailureEvent {
  kind: FailureKind;
  at: number;
  currentCell: string;
  queueDepth: number;
  recentHeavy?: StreamingDiagnostics['lastHeavyOperation'];
  activeCells: number;
  retainedCells: number;
  residentCells: number;
  activeOmnis: number;
  shadowedOmnis: number;
  drawCalls?: number;
}

export interface RendererRuntimeSnapshot {
  scenario?: string;
  currentCell: string;
  activeCells: number;
  retainedCells: number;
  residentCells: number;
  activeOmnis: number;
  shadowedOmnis: number;
  drawCalls?: number;
  frameSamples: number;
  p50FrameMs: number;
  p95FrameMs: number;
  p99FrameMs: number;
  maxFrameMs: number;
  framesOver16_7Ms: number;
  framesOver33Ms: number;
  framesOver50Ms: number;
  streaming?: StreamingDiagnostics;
  hotPaths?: ReturnType<typeof runtimePerformanceDiagnosticsSnapshot>;
  fixture: ReturnType<typeof fixtureLightingDiagnosticsSnapshot>;
  batching: ReturnType<typeof staticWorldBatchingDiagnosticsSnapshot>;
  arch: ReturnType<typeof archPresentationDiagnosticsSnapshot>;
  recentEvents: RendererFailureEvent[];
  previousFailure?: RendererFailureEvent;
}

interface DiagnosticState {
  game: ProjectNoclipGame;
  scenario?: string;
  frameTimes: number[];
  recentEvents: RendererFailureEvent[];
  previousFailure?: RendererFailureEvent;
  rafStarted: boolean;
  lastRafAt?: number;
}

const states = new WeakMap<ProjectNoclipGame, DiagnosticState>();
const attachedApps = new WeakSet<pc.Application>();
let installed = false;

function now(): number { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }
function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index] ?? 0;
}
function access(game: ProjectNoclipGame): GameAccess { return game as unknown as GameAccess; }
function streaming(): StreamingDiagnostics | undefined {
  return (window as unknown as { __noclipStreamingDiagnostics?: StreamingDiagnostics }).__noclipStreamingDiagnostics;
}
function stateFor(game: ProjectNoclipGame): DiagnosticState {
  const existing = states.get(game);
  if (existing) return existing;
  let previousFailure: RendererFailureEvent | undefined;
  try {
    const raw = window.sessionStorage.getItem(FAILURE_STORAGE_KEY);
    if (raw) previousFailure = JSON.parse(raw) as RendererFailureEvent;
  } catch { /* local diagnostics are best-effort */ }
  const created: DiagnosticState = { game, frameTimes: [], recentEvents: [], previousFailure, rafStarted: false };
  states.set(game, created);
  return created;
}
function counts(game: ProjectNoclipGame): Omit<RendererFailureEvent, 'kind' | 'at' | 'queueDepth' | 'recentHeavy'> {
  const gameState = access(game);
  const renderer = gameState.renderer;
  const residentCells = renderer?.loaded.size ?? 0;
  let activeCells = 0;
  if (renderer) for (const visual of renderer.loaded.values()) if (visual.root.enabled) activeCells += 1;
  const retainedCells = Math.max(0, residentCells - activeCells);
  const appStats = (gameState.app as unknown as { stats?: RenderStats } | undefined)?.stats;
  return {
    currentCell: `${gameState.currentCellX}:${gameState.currentCellZ}`,
    activeCells,
    retainedCells,
    residentCells,
    activeOmnis: renderer?.activeRealtimeFixtureLightCount ?? 0,
    shadowedOmnis: renderer?.shadowedRealtimeFixtureLightCount ?? 0,
    drawCalls: appStats?.drawCalls?.total
  };
}
function captureEvent(game: ProjectNoclipGame, kind: FailureKind, persist = false): RendererFailureEvent {
  const diagnostics = streaming();
  const event: RendererFailureEvent = {
    kind,
    at: Date.now(),
    ...counts(game),
    queueDepth: diagnostics?.queueDepth ?? 0,
    recentHeavy: diagnostics?.lastHeavyOperation
  };
  const state = stateFor(game);
  state.recentEvents.push(event);
  if (state.recentEvents.length > MAX_EVENTS) state.recentEvents.splice(0, state.recentEvents.length - MAX_EVENTS);
  if (persist) {
    try { window.sessionStorage.setItem(FAILURE_STORAGE_KEY, JSON.stringify(event)); } catch { /* best-effort local evidence */ }
  }
  return event;
}
function snapshot(game: ProjectNoclipGame): RendererRuntimeSnapshot {
  const state = stateFor(game);
  const frameTimes = state.frameTimes;
  const renderer = access(game).renderer;
  return {
    scenario: state.scenario,
    ...counts(game),
    frameSamples: frameTimes.length,
    p50FrameMs: percentile(frameTimes, 0.5),
    p95FrameMs: percentile(frameTimes, 0.95),
    p99FrameMs: percentile(frameTimes, 0.99),
    maxFrameMs: frameTimes.length > 0 ? Math.max(...frameTimes) : 0,
    framesOver16_7Ms: frameTimes.filter((value) => value > 16.7).length,
    framesOver33Ms: frameTimes.filter((value) => value > 33).length,
    framesOver50Ms: frameTimes.filter((value) => value > 50).length,
    streaming: streaming(),
    hotPaths: renderer ? runtimePerformanceDiagnosticsSnapshot(renderer) : undefined,
    fixture: fixtureLightingDiagnosticsSnapshot(),
    batching: staticWorldBatchingDiagnosticsSnapshot(),
    arch: archPresentationDiagnosticsSnapshot(),
    recentEvents: [...state.recentEvents],
    previousFailure: state.previousFailure
  };
}
function beginScenario(game: ProjectNoclipGame, label: string): void {
  const state = stateFor(game);
  state.scenario = label;
  state.frameTimes.length = 0;
  state.recentEvents.length = 0;
  state.lastRafAt = undefined;
  const renderer = access(game).renderer;
  if (renderer) resetRuntimePerformanceDiagnostics(renderer);
  const diagnostics = streaming();
  if (diagnostics) {
    diagnostics.queueDepthPeak = diagnostics.queueDepth;
    diagnostics.maxBoundaryFrameMs = 0;
    diagnostics.coldBoundaryLoads = 0;
    diagnostics.maxHeavyOperations = 0;
    diagnostics.maxHeavyMs = 0;
    diagnostics.heavyBudgetDeferrals = 0;
    diagnostics.heavyBudgetOverruns = 0;
  }
}
function startFrameSampling(game: ProjectNoclipGame): void {
  const state = stateFor(game);
  if (state.rafStarted) return;
  state.rafStarted = true;
  const sample = (timestamp: number): void => {
    if (state.lastRafAt !== undefined) {
      const frameMs = timestamp - state.lastRafAt;
      state.frameTimes.push(frameMs);
      if (state.frameTimes.length > MAX_FRAME_SAMPLES) state.frameTimes.splice(0, state.frameTimes.length - MAX_FRAME_SAMPLES);
      if (frameMs >= 120) captureEvent(game, 'severe-frame', true);
    }
    state.lastRafAt = timestamp;
    window.requestAnimationFrame(sample);
  };
  window.requestAnimationFrame(sample);
}
function showFailureState(message: string): void {
  let node = document.querySelector<HTMLElement>('[data-renderer-failure]');
  if (!node) {
    node = document.createElement('div');
    node.dataset.rendererFailure = 'true';
    Object.assign(node.style, {
      position: 'fixed', left: '12px', right: '12px', bottom: '12px', zIndex: '100000',
      padding: '10px 12px', background: 'rgba(20,20,20,.92)', color: '#f4e8b2',
      font: '12px/1.4 system-ui,sans-serif', pointerEvents: 'none'
    });
    document.body.appendChild(node);
  }
  node.textContent = message;
}
function attach(game: ProjectNoclipGame): void {
  const gameState = access(game);
  const app = gameState.app;
  if (!app || attachedApps.has(app)) return;
  attachedApps.add(app);
  startFrameSampling(game);

  const graphicsDevice = (app as unknown as { graphicsDevice: unknown }).graphicsDevice;
  const canvas = (graphicsDevice as { canvas: HTMLCanvasElement }).canvas;
  canvas.addEventListener('webglcontextlost', () => {
    captureEvent(game, 'webgl-context-lost', true);
    showFailureState('Renderer context lost. Local renderer diagnostics were captured; reload if the image does not recover.');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    captureEvent(game, 'webgl-context-restored', true);
    showFailureState('Renderer context restored by the existing graphics lifecycle. Local diagnostics were preserved.');
  });

  const device = graphicsDevice as GraphicsDeviceEvents;
  device.on('devicelost', () => {
    captureEvent(game, 'graphics-device-lost', true);
    showFailureState('Graphics device lost. Local renderer diagnostics were captured.');
  });
  device.on('devicerestored', () => captureEvent(game, 'graphics-device-restored', true));

  const diagnosticTestEnabled = new URLSearchParams(window.location.search).get('rendererDiagnosticTest') === 'context-loss';
  (window as unknown as { __noclipRendererRuntimeDiagnostics?: unknown }).__noclipRendererRuntimeDiagnostics = {
    snapshot: () => snapshot(game),
    beginScenario: (label: string) => beginScenario(game, label),
    testContextLoss: diagnosticTestEnabled && typeof device.loseContext === 'function'
      ? () => device.loseContext?.()
      : undefined
  };
}

export function installRendererRuntimeDiagnostics(): void {
  if (installed) return;
  installed = true;
  const prototype = ProjectNoclipGame.prototype as unknown as RuntimePrototype;
  const originalSetupEngine = prototype.setupEngine;
  prototype.setupEngine = function diagnosticSetupEngine(this: ProjectNoclipGame): void {
    originalSetupEngine.call(this);
    attach(this);
  };
}