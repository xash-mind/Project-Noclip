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
        raise RuntimeError(f'{path}: expected one replacement, found {count}: {old[:140]!r}')
    write(path, text.replace(old, new, 1))


replace_once(
    'src/renderer/WorldRenderer.ts',
    "type CellSceneMutationListener = (summary: CellSceneMutationSummary) => void;",
    """type CellSceneMutationListener = (summary: CellSceneMutationSummary) => void;

export const CELL_SCENE_MUTATION_PHASE = Object.freeze({
  presentation: -100,
  resources: 0,
  batching: 100
});"""
)
replace_once(
    'src/renderer/WorldRenderer.ts',
    '  private readonly sceneMutationCompleteListeners = new Set<CellSceneMutationListener>();',
    '  private readonly sceneMutationCompleteListeners = new Map<CellSceneMutationListener, number>();'
)
replace_once(
    'src/renderer/WorldRenderer.ts',
    """  onCellSceneMutationComplete(listener: CellSceneMutationListener): () => void {
    this.sceneMutationCompleteListeners.add(listener);
    return () => this.sceneMutationCompleteListeners.delete(listener);
  }
""",
    """  onCellSceneMutationComplete(listener: CellSceneMutationListener, priority = 0): () => void {
    this.sceneMutationCompleteListeners.set(listener, priority);
    return () => this.sceneMutationCompleteListeners.delete(listener);
  }
"""
)
replace_once(
    'src/renderer/WorldRenderer.ts',
    '        for (const listener of [...this.sceneMutationCompleteListeners]) listener(summary);',
    """        const listeners = [...this.sceneMutationCompleteListeners.entries()]
          .sort((left, right) => left[1] - right[1]);
        for (const [listener] of listeners) listener(summary);"""
)

replace_once(
    'src/renderer/level0RegionPresentation.ts',
    "import { WorldRenderer } from './WorldRenderer.js';",
    "import { CELL_SCENE_MUTATION_PHASE, WorldRenderer } from './WorldRenderer.js';"
)
replace_once(
    'src/renderer/level0RegionPresentation.ts',
    '  renderer.onCellSceneMutationComplete(() => flushArchPresentation(renderer));',
    '  renderer.onCellSceneMutationComplete(() => flushArchPresentation(renderer), CELL_SCENE_MUTATION_PHASE.presentation);'
)

replace_once(
    'src/renderer/fixtureLighting.ts',
    "import { WorldRenderer } from './WorldRenderer.js';",
    "import { CELL_SCENE_MUTATION_PHASE, WorldRenderer } from './WorldRenderer.js';"
)
replace_once(
    'src/renderer/fixtureLighting.ts',
    '  renderer.onCellSceneMutationComplete(() => finalizeFixtureSceneMutation(renderer, created));',
    '  renderer.onCellSceneMutationComplete(() => finalizeFixtureSceneMutation(renderer, created), CELL_SCENE_MUTATION_PHASE.resources);'
)

replace_once(
    'src/renderer/StaticWorldBatching.ts',
    "import { WorldRenderer } from './WorldRenderer.js';",
    "import { CELL_SCENE_MUTATION_PHASE, WorldRenderer } from './WorldRenderer.js';"
)
replace_once(
    'src/renderer/StaticWorldBatching.ts',
    """  renderer.onCellSceneMutationComplete(() => {
    const state = states.get(renderer);
    if (!state) return;
    state.dirty = true;
    reconcile(renderer);
  });""",
    """  renderer.onCellSceneMutationComplete(() => {
    const state = states.get(renderer);
    if (!state) return;
    state.dirty = true;
    reconcile(renderer);
  }, CELL_SCENE_MUTATION_PHASE.batching);"""
)

replace_once(
    'tests/renderer-lifecycle.test.mjs',
    """test('dependent renderer owners reconcile at transaction completion rather than independent timers/microtasks', () => {
  assert.match(regionSource, /onCellSceneMutationComplete/);
  assert.equal(regionSource.includes('queueMicrotask'), false);
  assert.match(fixtureSource, /onCellSceneMutationStart/);
  assert.match(fixtureSource, /onCellSceneMutationComplete/);
  assert.match(batchingSource, /onCellSceneMutationComplete/);
  assert.equal(batchingSource.includes('setInterval'), false);
});""",
    """test('dependent renderer owners reconcile in explicit presentation -> resources -> batching phases', () => {
  assert.match(rendererSource, /presentation: -100/);
  assert.match(rendererSource, /resources: 0/);
  assert.match(rendererSource, /batching: 100/);
  assert.match(rendererSource, /sort\(\(left, right\) => left\[1\] - right\[1\]\)/);
  assert.match(regionSource, /CELL_SCENE_MUTATION_PHASE\.presentation/);
  assert.equal(regionSource.includes('queueMicrotask'), false);
  assert.match(fixtureSource, /onCellSceneMutationStart/);
  assert.match(fixtureSource, /CELL_SCENE_MUTATION_PHASE\.resources/);
  assert.match(batchingSource, /CELL_SCENE_MUTATION_PHASE\.batching/);
  assert.equal(batchingSource.includes('setInterval'), false);
});"""
)

print('Arch lifecycle recovery v3 explicit reconciliation phases applied successfully.')
