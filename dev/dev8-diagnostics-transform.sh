#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:100]!r}')
    p.write_text(text.replace(old, new, 1))

# ---------------------------------------------------------------------------
# Fixture/shadow lifecycle diagnostics + eliminate invariant property rewrites.
# ---------------------------------------------------------------------------
path = 'src/renderer/fixtureLighting.ts'
insert = r'''export interface FixtureLightingDiagnostics {
  lightsCreated: number;
  lightsDestroyed: number;
  shadowDirtyScans: number;
  shadowDirtyMarks: number;
  shadowUpdateRequests: number;
  selectionChanges: number;
  shadowResolutionChanges: number;
}

const fixtureDiagnostics: FixtureLightingDiagnostics = {
  lightsCreated: 0,
  lightsDestroyed: 0,
  shadowDirtyScans: 0,
  shadowDirtyMarks: 0,
  shadowUpdateRequests: 0,
  selectionChanges: 0,
  shadowResolutionChanges: 0
};

export function fixtureLightingDiagnosticsSnapshot(): FixtureLightingDiagnostics {
  return { ...fixtureDiagnostics };
}

'''
replace_once(path, 'const states = new WeakMap<WorldRenderer, RendererFixtureState>();\nlet installed = false;\n', 'const states = new WeakMap<WorldRenderer, RendererFixtureState>();\nlet installed = false;\n\n' + insert)
replace_once(
    path,
    "function markFixtureShadowsDirtyNearCell(state: RendererFixtureState, descriptor: CellDescriptor): void {\n  for (const runtime of state.fixtures.values()) {\n    if (fixtureRangeTouchesCell(runtime, descriptor)) runtime.shadowDirty = true;\n  }\n}\n",
    "function markFixtureShadowsDirtyNearCell(state: RendererFixtureState, descriptor: CellDescriptor): void {\n  fixtureDiagnostics.shadowDirtyScans += 1;\n  for (const runtime of state.fixtures.values()) {\n    if (!fixtureRangeTouchesCell(runtime, descriptor) || runtime.shadowDirty) continue;\n    runtime.shadowDirty = true;\n    fixtureDiagnostics.shadowDirtyMarks += 1;\n  }\n}\n"
)
replace_once(
    path,
    "      state.fixtures.set(id, {\n        id,\n        cellId: descriptor.id,\n        group,\n        fixtureIndex,\n        light,\n        mesh,\n        descriptor,\n        shadowDirty: true,\n        selected: false\n      });\n",
    "      state.fixtures.set(id, {\n        id,\n        cellId: descriptor.id,\n        group,\n        fixtureIndex,\n        light,\n        mesh,\n        descriptor,\n        shadowDirty: true,\n        selected: false\n      });\n      fixtureDiagnostics.lightsCreated += 1;\n"
)
replace_once(
    path,
    "  for (const [id, runtime] of state.fixtures) {\n    if (runtime.cellId === cellId) state.fixtures.delete(id);\n  }\n",
    "  for (const [id, runtime] of state.fixtures) {\n    if (runtime.cellId !== cellId) continue;\n    state.fixtures.delete(id);\n    fixtureDiagnostics.lightsDestroyed += 1;\n  }\n"
)
replace_once(
    path,
    "    const selected = selectedIds.has(runtime.id);\n    if (selected && !runtime.selected) runtime.shadowDirty = true;\n    runtime.selected = selected;\n",
    "    const selected = selectedIds.has(runtime.id);\n    if (selected !== runtime.selected) {\n      fixtureDiagnostics.selectionChanges += 1;\n      if (selected && !runtime.shadowDirty) {\n        runtime.shadowDirty = true;\n        fixtureDiagnostics.shadowDirtyMarks += 1;\n      }\n    }\n    runtime.selected = selected;\n"
)
replace_once(
    path,
    "    light.color = lightColor(runtime.group);\n    light.range = FIXTURE_LIGHT_RANGE;\n    light.castShadows = true;\n    light.shadowResolution = settings.shadowResolution;\n    light.shadowBias = FIXTURE_SHADOW_BIAS;\n    light.normalOffsetBias = FIXTURE_SHADOW_NORMAL_OFFSET;\n    light.intensity = selected ? runtime.group.intensity * pulse * FIXTURE_LIGHT_INTENSITY_MULTIPLIER : 0;\n",
    "    // Color/range/cast/bias/normal-offset are invariant for this runtime and\n    // are set once at creation. Rewriting them for every fixture every frame\n    // created steady-state CPU/device churn without changing visible output.\n    if (light.shadowResolution !== settings.shadowResolution) {\n      light.shadowResolution = settings.shadowResolution;\n      fixtureDiagnostics.shadowResolutionChanges += 1;\n      if (!runtime.shadowDirty) {\n        runtime.shadowDirty = true;\n        fixtureDiagnostics.shadowDirtyMarks += 1;\n      }\n    }\n    light.intensity = selected ? runtime.group.intensity * pulse * FIXTURE_LIGHT_INTENSITY_MULTIPLIER : 0;\n"
)
replace_once(
    path,
    "      light.shadowUpdateMode = pc.SHADOWUPDATE_THISFRAME;\n      runtime.shadowDirty = false;\n",
    "      light.shadowUpdateMode = pc.SHADOWUPDATE_THISFRAME;\n      fixtureDiagnostics.shadowUpdateRequests += 1;\n      runtime.shadowDirty = false;\n"
)

# ---------------------------------------------------------------------------
# Per-Cell static batching diagnostics.
# ---------------------------------------------------------------------------
path = 'src/renderer/StaticWorldBatching.ts'
insert = r'''export interface StaticWorldBatchingDiagnostics {
  reconcilePasses: number;
  allocations: number;
  removals: number;
  dirtyCalls: number;
  activeGroups: number;
}

const batchingDiagnostics: StaticWorldBatchingDiagnostics = {
  reconcilePasses: 0,
  allocations: 0,
  removals: 0,
  dirtyCalls: 0,
  activeGroups: 0
};

export function staticWorldBatchingDiagnosticsSnapshot(): StaticWorldBatchingDiagnostics {
  return { ...batchingDiagnostics };
}

'''
replace_once(path, "export const STATIC_WORLD_BATCHING_PROFILE = Object.freeze({\n", insert + "export const STATIC_WORLD_BATCHING_PROFILE = Object.freeze({\n")
replace_once(
    path,
    "    app.batcher.addGroup(`${STATIC_WORLD_BATCH_GROUP_NAME}:${cell.guid}`, false, STATIC_WORLD_BATCHING_PROFILE.maxAabbSize, id);\n    const batch = { id, guid: cell.guid };\n    cellBatches.set(cell.guid, batch);\n",
    "    app.batcher.addGroup(`${STATIC_WORLD_BATCH_GROUP_NAME}:${cell.guid}`, false, STATIC_WORLD_BATCHING_PROFILE.maxAabbSize, id);\n    batchingDiagnostics.allocations += 1;\n    const batch = { id, guid: cell.guid };\n    cellBatches.set(cell.guid, batch);\n    batchingDiagnostics.activeGroups = cellBatches.size;\n"
)
replace_once(path, "  const reconcile = (): void => {\n", "  const reconcile = (): void => {\n    batchingDiagnostics.reconcilePasses += 1;\n")
replace_once(
    path,
    "      app.batcher.removeGroup(batch.id);\n      freeGroupIds.push(batch.id);\n      cellBatches.delete(guid);\n",
    "      app.batcher.removeGroup(batch.id);\n      batchingDiagnostics.removals += 1;\n      freeGroupIds.push(batch.id);\n      cellBatches.delete(guid);\n      batchingDiagnostics.activeGroups = cellBatches.size;\n"
)
replace_once(
    path,
    "      if (assignStaticVisuals(cell, batch.id)) app.batcher.markGroupDirty(batch.id);\n",
    "      if (assignStaticVisuals(cell, batch.id)) {\n        app.batcher.markGroupDirty(batch.id);\n        batchingDiagnostics.dirtyCalls += 1;\n      }\n"
)

# ---------------------------------------------------------------------------
# A-A1 reconstruction timing/count diagnostics.
# ---------------------------------------------------------------------------
path = 'src/renderer/level0RegionPresentation.ts'
insert = r'''export interface ArchPresentationDiagnostics {
  reconstructionCalls: number;
  reconstructedCells: number;
  reconstructionMs: number;
  maxReconstructionMs: number;
}

const archPresentationDiagnostics: ArchPresentationDiagnostics = {
  reconstructionCalls: 0,
  reconstructedCells: 0,
  reconstructionMs: 0,
  maxReconstructionMs: 0
};

export function archPresentationDiagnosticsSnapshot(): ArchPresentationDiagnostics {
  return { ...archPresentationDiagnostics };
}

'''
replace_once(path, 'const pendingArchCells = new WeakMap<WorldRenderer, Set<string>>();\n', insert + 'const pendingArchCells = new WeakMap<WorldRenderer, Set<string>>();\n')
replace_once(
    path,
    "function renderArchFrames(renderer: WorldRenderer, targetCellIds?: ReadonlySet<string>): void {\n  const visuals = [...renderer.loaded.values()];\n",
    "function renderArchFrames(renderer: WorldRenderer, targetCellIds?: ReadonlySet<string>): void {\n  const reconstructionStart = performance.now();\n  const visuals = [...renderer.loaded.values()];\n"
)
replace_once(
    path,
    "  }\n}\n\nfunction applyRegionPresentation(renderer: WorldRenderer, visual: CellVisual): void {\n",
    "  }\n  const reconstructionMs = performance.now() - reconstructionStart;\n  archPresentationDiagnostics.reconstructionCalls += 1;\n  archPresentationDiagnostics.reconstructedCells += targetVisuals.length;\n  archPresentationDiagnostics.reconstructionMs += reconstructionMs;\n  archPresentationDiagnostics.maxReconstructionMs = Math.max(archPresentationDiagnostics.maxReconstructionMs, reconstructionMs);\n}\n\nfunction applyRegionPresentation(renderer: WorldRenderer, visual: CellVisual): void {\n"
)

# ---------------------------------------------------------------------------
# Local-only renderer/device diagnostics. Observe; never own restoration.
# ---------------------------------------------------------------------------
runtime = Path('src/renderer/rendererRuntimeDiagnostics.ts')
if runtime.exists():
    raise SystemExit('rendererRuntimeDiagnostics.ts unexpectedly exists')
runtime.write_text(r'''import type * as pc from 'playcanvas';
import { ProjectNoclipGame } from '../app/ProjectNoclipGame.js';
import type { WorldRenderer } from './WorldRenderer.js';
import { fixtureLightingDiagnosticsSnapshot } from './fixtureLighting.js';
import { archPresentationDiagnosticsSnapshot } from './level0RegionPresentation.js';
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
  maxFrameMs: number;
  streaming?: StreamingDiagnostics;
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
  return {
    scenario: state.scenario,
    ...counts(game),
    frameSamples: frameTimes.length,
    p50FrameMs: percentile(frameTimes, 0.5),
    p95FrameMs: percentile(frameTimes, 0.95),
    maxFrameMs: frameTimes.length > 0 ? Math.max(...frameTimes) : 0,
    streaming: streaming(),
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

  const canvas = app.graphicsDevice.canvas as HTMLCanvasElement;
  canvas.addEventListener('webglcontextlost', () => {
    captureEvent(game, 'webgl-context-lost', true);
    showFailureState('Renderer context lost. Local Dev.8 diagnostics were captured; reload if the image does not recover.');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    captureEvent(game, 'webgl-context-restored', true);
    showFailureState('Renderer context restored by the existing graphics lifecycle. Local diagnostics were preserved.');
  });

  const device = app.graphicsDevice as unknown as GraphicsDeviceEvents;
  device.on('devicelost', () => {
    captureEvent(game, 'graphics-device-lost', true);
    showFailureState('Graphics device lost. Local Dev.8 diagnostics were captured.');
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
''')

# Install after existing renderer/runtime installers, before game construction.
replace_once(
    'src/main.ts',
    "import { installStaticWorldBatching } from './renderer/StaticWorldBatching.js';\n",
    "import { installStaticWorldBatching } from './renderer/StaticWorldBatching.js';\nimport { installRendererRuntimeDiagnostics } from './renderer/rendererRuntimeDiagnostics.js';\n"
)
replace_once(
    'src/main.ts',
    "installStaticWorldBatching();\nmountDevelopmentVersionIndicator();\n",
    "installStaticWorldBatching();\ninstallRendererRuntimeDiagnostics();\nmountDevelopmentVersionIndicator();\n"
)

# Bounded source-level regression checks complement browser context-loss testing.
test = Path('tests/dev8-runtime-diagnostics.test.mjs')
test.write_text(r'''import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const fixtureSource = await readFile(new URL('../src/renderer/fixtureLighting.ts', import.meta.url), 'utf8');
const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');
const diagnosticsSource = await readFile(new URL('../src/renderer/rendererRuntimeDiagnostics.ts', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');

test('fixture runtime preserves light/shadow semantics without static per-frame property rewrites', () => {
  const updateBody = fixtureSource.slice(fixtureSource.indexOf('function updateFixtureLighting('), fixtureSource.indexOf('export const FIXTURE_LIGHTING_PROFILE'));
  assert.equal(updateBody.includes('light.color = lightColor'), false);
  assert.equal(updateBody.includes('light.range = FIXTURE_LIGHT_RANGE'), false);
  assert.equal(updateBody.includes('light.castShadows = true'), false);
  assert.equal(updateBody.includes('light.shadowBias = FIXTURE_SHADOW_BIAS'), false);
  assert.match(updateBody, /light\.intensity = selected/);
  assert.match(updateBody, /light\.shadowUpdateMode = pc\.SHADOWUPDATE_THISFRAME/);
  assert.match(updateBody, /fixtureDiagnostics\.shadowUpdateRequests \+= 1/);
});

test('static batching exposes per-Cell allocation, removal and dirty-call evidence', () => {
  assert.match(batchingSource, /batchingDiagnostics\.allocations \+= 1/);
  assert.match(batchingSource, /batchingDiagnostics\.removals \+= 1/);
  assert.match(batchingSource, /batchingDiagnostics\.dirtyCalls \+= 1/);
  assert.match(batchingSource, /activeGroups/);
});

test('renderer diagnostics observe context/device loss locally without taking restoration ownership', () => {
  assert.match(diagnosticsSource, /webglcontextlost/);
  assert.match(diagnosticsSource, /webglcontextrestored/);
  assert.match(diagnosticsSource, /device\.on\('devicelost'/);
  assert.match(diagnosticsSource, /device\.on\('devicerestored'/);
  assert.equal(diagnosticsSource.includes('device.restoreContext?.()'), false);
  assert.match(diagnosticsSource, /window\.sessionStorage\.setItem/);
  assert.match(diagnosticsSource, /rendererDiagnosticTest/);
  assert.match(mainSource, /installRendererRuntimeDiagnostics\(\)/);
});
''')
PY
