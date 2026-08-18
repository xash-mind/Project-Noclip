from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one replacement, found {count}: {old[:120]!r}')
    write(path, text.replace(old, new, 1))


def replace_span(path: str, start: str, end: str, replacement: str) -> None:
    text = read(path)
    start_index = text.find(start)
    if start_index < 0:
        raise RuntimeError(f'{path}: missing start marker {start!r}')
    end_index = text.find(end, start_index)
    if end_index < 0:
        raise RuntimeError(f'{path}: missing end marker {end!r}')
    write(path, text[:start_index] + replacement + text[end_index:])


def insert_after(path: str, marker: str, content: str) -> None:
    text = read(path)
    index = text.find(marker)
    if index < 0:
        raise RuntimeError(f'{path}: missing marker {marker!r}')
    index += len(marker)
    write(path, text[:index] + content + text[index:])


# ProjectNoclipGame owns movement/locator intent; the existing scheduler remains
# the single Cell streaming implementation. The game method is only a delegate.
replace_once(
    'src/app/ProjectNoclipGame.ts',
    "import { WorldRenderer, type InteractionVisual, type WorldItemVisual } from '../renderer/WorldRenderer.js';\n",
    "import { reconcileStreaming, type StreamingRequest } from '../renderer/streamingScheduler.js';\nimport { WorldRenderer, type InteractionVisual, type WorldItemVisual } from '../renderer/WorldRenderer.js';\n"
)
replace_once(
    'src/app/ProjectNoclipGame.ts',
    """
interface StreamingRequest {
  reason?: 'ordinary-streaming' | 'startup' | 'presentation-refresh' | 'developer-teleport';
  radiusOverride?: number;
  refreshUnchanged?: boolean;
}
""",
    ''
)
replace_span(
    'src/app/ProjectNoclipGame.ts',
    '  private updateStreaming(request: StreamingRequest = {}): void {',
    '\n\n  private scheduleStreamingWarmup',
    """  private updateStreaming(request: StreamingRequest = {}): void {
    reconcileStreaming(this, request);
  }
"""
)

# Render-settings runtime must not replace updateStreaming with a second API.
# It keeps setup/atmosphere ownership and installs the scheduler update hook only.
replace_once(
    'src/renderer/renderSettingsRuntime.ts',
    "import { installStreamingScheduler, reconcileStreaming } from './streamingScheduler.js';",
    "import { installStreamingScheduler, type StreamingRequest } from './streamingScheduler.js';"
)
replace_once(
    'src/renderer/renderSettingsRuntime.ts',
    '  updateStreaming(force?: boolean, radiusOverride?: number): void;',
    '  updateStreaming(request?: StreamingRequest): void;'
)
replace_once(
    'src/renderer/renderSettingsRuntime.ts',
    """  update(this: ProjectNoclipGame, dt: number): void;
  updateStreaming(this: ProjectNoclipGame, force?: boolean, radiusOverride?: number): void;
  refreshLightField(this: ProjectNoclipGame): void;
""",
    """  update(this: ProjectNoclipGame, dt: number): void;
  refreshLightField(this: ProjectNoclipGame): void;
"""
)
replace_span(
    'src/renderer/renderSettingsRuntime.ts',
    'function updateStreaming(this: ProjectNoclipGame, force = false, radiusOverride?: number): void {',
    '\n\nfunction refreshLightField',
    ''
)
replace_once(
    'src/renderer/renderSettingsRuntime.ts',
    'if (renderDistanceChanged && state.save && state.renderer) state.updateStreaming(false);',
    "if (renderDistanceChanged && state.save && state.renderer) state.updateStreaming({ reason: 'ordinary-streaming' });"
)
replace_once(
    'src/renderer/renderSettingsRuntime.ts',
    "  prototype.setupEngine = setupEngine;\n  prototype.updateStreaming = updateStreaming;\n  prototype.refreshLightField = refreshLightField;",
    "  prototype.setupEngine = setupEngine;\n  prototype.refreshLightField = refreshLightField;"
)

# streamingScheduler is the one Cell-streaming implementation. Ordinary movement
# stays budgeted/predictive; startup, presentation refresh, and developer teleports
# use one explicit renderer transaction and request rendering only after fixture
# lighting has been reconciled against the final scene.
replace_once(
    'src/renderer/streamingScheduler.ts',
    "import type { WorldRenderer } from './WorldRenderer.js';",
    "import type { CellSceneMutationReason, WorldRenderer } from './WorldRenderer.js';"
)
insert_after(
    'src/renderer/streamingScheduler.ts',
    "export const STREAMING_SCHEDULER_PROFILE = Object.freeze({\n  workBudgetMs: 2.25,\n  maxHeavyJobsPerFrame: 1,\n  unloadGraceMs: 1200,\n  predictiveExtraRings: 1\n});\n",
    """

export interface StreamingRequest {
  reason?: CellSceneMutationReason;
  radiusOverride?: number;
  refreshUnchanged?: boolean;
}
"""
)
replace_once(
    'src/renderer/streamingScheduler.ts',
    """  streamWarmupToken: number;
  refreshRegionExtent(): void;
""",
    """  streamWarmupToken: number;
  journeyElapsed: number;
  refreshRegionExtent(): void;
"""
)
replace_span(
    'src/renderer/streamingScheduler.ts',
    'function finishReconcile(game: ProjectNoclipGame): void {',
    '\nfunction forceReconcile',
    """function finishReconcile(game: ProjectNoclipGame): void {
  const state = access(game);
  const scheduler = stateFor(game);
  const start = now();
  state.refreshRegionExtent();
  state.refreshLightField();
  state.notifyRegionEntry();
  if (state.renderer && state.save && state.camera) {
    const position = state.camera.getPosition();
    state.renderer.updateFixtureLighting(
      state.journeyElapsed,
      state.save.settings.reducedFlicker,
      position.x,
      position.z
    );
  }
  if (state.app) {
    const rendering = state.app as unknown as RenderControl;
    if (!rendering.autoRender) rendering.renderNextFrame = true;
  }
  scheduler.diagnostics.regionRefreshMs += now() - start;
  publish(game);
}
"""
)
replace_span(
    'src/renderer/streamingScheduler.ts',
    'function forceReconcile(game: ProjectNoclipGame, radius: number, retentionRadius: number): void {',
    '\n\nexport function reconcileStreaming',
    """function bulkReconcile(
  game: ProjectNoclipGame,
  radius: number,
  retentionRadius: number,
  request: StreamingRequest
): void {
  const state = access(game);
  const scheduler = stateFor(game);
  if (!state.save || !state.renderer) return;
  scheduler.jobs.clear();
  const desired = new Map<string, CellDescriptor>();
  for (let x = state.currentCellX - radius; x <= state.currentCellX + radius; x += 1) {
    for (let z = state.currentCellZ - radius; z <= state.currentCellZ + radius; z += 1) {
      const descriptor = descriptorFor(state, x, z, scheduler.diagnostics);
      desired.set(descriptor.id, descriptor);
    }
  }

  const reason = request.reason ?? 'startup';
  state.renderer.runCellSceneMutation(reason, () => {
    for (const [id, visual] of [...state.renderer!.loaded.entries()]) {
      if (desired.has(id)) continue;
      const distance = cellDistance(state, visual.descriptor.address.cellX, visual.descriptor.address.cellZ);
      if (distance <= retentionRadius) {
        visual.root.enabled = false;
      } else {
        unloadCell(game, visual.descriptor.address.cellX, visual.descriptor.address.cellZ);
      }
    }

    for (const [id, descriptor] of desired) {
      const existing = state.renderer!.loaded.get(id)?.descriptor;
      if (!existing) {
        const start = now();
        state.renderer!.loadCell(descriptor);
        scheduler.diagnostics.cellRendererMs += now() - start;
        scheduler.diagnostics.loadedCells += 1;
      } else if (request.refreshUnchanged || descriptorChanged(existing, descriptor)) {
        const start = now();
        state.renderer!.refreshCell(descriptor);
        scheduler.diagnostics.cellRefreshMs += now() - start;
        scheduler.diagnostics.refreshedCells += 1;
      }
      const visual = state.renderer!.loaded.get(id);
      if (visual) visual.root.enabled = true;
    }
  });

  state.currentCell = desired.get(`${state.currentCellX}:${state.currentCellZ}`);
  finishReconcile(game);
}
"""
)
replace_span(
    'src/renderer/streamingScheduler.ts',
    'export function reconcileStreaming(game: ProjectNoclipGame, force = false, radiusOverride?: number): void {',
    '\n\nexport function installStreamingScheduler',
    """export function reconcileStreaming(game: ProjectNoclipGame, request: StreamingRequest = {}): void {
  const state = access(game);
  const scheduler = stateFor(game);
  if (!state.save || !state.renderer) return;
  const radiusOverride = request.radiusOverride;
  if (radiusOverride === undefined) state.streamWarmupToken += 1;
  const settings = getRenderSettings();
  const profile = renderDistanceProfile(settings);
  state.tuning = { ...state.tuning, activeRadius: profile.loadRadius };
  const radius = Math.max(1, Math.min(profile.loadRadius, Math.round(radiusOverride ?? profile.loadRadius)));
  setRendererRenderScope(state.renderer, {
    centerCellX: state.currentCellX,
    centerCellZ: state.currentCellZ,
    loadRadius: radius,
    retentionRadius: profile.retentionRadius
  });
  const reconcileStart = now();
  const reason = request.reason ?? 'ordinary-streaming';
  if (reason !== 'ordinary-streaming' || request.refreshUnchanged) {
    bulkReconcile(game, radius, profile.retentionRadius, request);
    scheduler.diagnostics.boundaryReconcileMs += now() - reconcileStart;
    return;
  }

  const desired = new Set<string>();
  const missing: Array<{ x: number; z: number; score: number }> = [];
  const currentDescriptor = descriptorFor(state, state.currentCellX, state.currentCellZ, scheduler.diagnostics);
  const currentExisting = state.renderer.loaded.get(currentDescriptor.id)?.descriptor;
  if (!currentExisting) prepareCell(game, state.currentCellX, state.currentCellZ, false);
  else if (descriptorChanged(currentExisting, currentDescriptor)) {
    const start = now();
    state.renderer.refreshCell(currentDescriptor);
    scheduler.diagnostics.cellRefreshMs += now() - start;
    scheduler.diagnostics.refreshedCells += 1;
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
"""
)

# The lifecycle source test follows the actual scheduler owner instead of the
# game's delegating method.
replace_once(
    'tests/renderer-lifecycle.test.mjs',
    "const appSource = await readFile(new URL('../src/app/ProjectNoclipGame.ts', import.meta.url), 'utf8');\n",
    "const appSource = await readFile(new URL('../src/app/ProjectNoclipGame.ts', import.meta.url), 'utf8');\nconst streamingSource = await readFile(new URL('../src/renderer/streamingScheduler.ts', import.meta.url), 'utf8');\n"
)
replace_span(
    'tests/renderer-lifecycle.test.mjs',
    "test('streaming intent is explicit and developer teleport mutates one coherent Cell scene', () => {",
    "\n\ntest('dependent renderer owners reconcile at transaction completion rather than independent timers/microtasks'",
    """test('streaming intent is explicit and developer teleport mutates one coherent Cell scene', () => {
  assert.match(rendererSource, /runCellSceneMutation<T>/);
  assert.match(rendererSource, /onCellSceneMutationStart/);
  assert.match(rendererSource, /onCellSceneMutationComplete/);
  assert.match(appSource, /reason: 'developer-teleport'/);
  assert.match(appSource, /reason: 'presentation-refresh', refreshUnchanged: true/);
  assert.match(appSource, /reconcileStreaming\(this, request\)/);
  assert.equal(appSource.includes('private updateStreaming(force = false'), false);
  const transaction = streamingSource.indexOf('state.renderer.runCellSceneMutation(reason');
  const unload = streamingSource.indexOf('unloadCell(game, visual.descriptor.address.cellX', transaction);
  const load = streamingSource.indexOf('state.renderer!.loadCell(descriptor)', transaction);
  const fixture = streamingSource.indexOf('state.renderer.updateFixtureLighting(', transaction);
  const renderRequest = streamingSource.indexOf('rendering.renderNextFrame = true', transaction);
  assert.ok(transaction >= 0 && unload > transaction && load > unload);
  assert.ok(fixture > transaction && renderRequest > fixture);
  assert.match(streamingSource, /request\.refreshUnchanged \|\| descriptorChanged/);
});
"""
)

# Fix one v1 source assertion to match the authoritative prefix constant rather
# than a literal interpolation that does not exist in source.
replace_once(
    'tests/arch-smooth-presentation.test.mjs',
    "  assert.match(regionSource, /arch-frame:\\$\\{name\\}/);",
    "  assert.match(regionSource, /ARCH_FRAME_PREFIX/);"
)

print('Arch lifecycle recovery v2 scheduler-owner refinement applied successfully.')
