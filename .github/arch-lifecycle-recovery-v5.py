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
        raise RuntimeError(f'{path}: expected one replacement, found {count}: {old[:160]!r}')
    write(path, text.replace(old, new, 1))


# The old render-settings test asserted the deprecated force/radius bridge that
# this recovery intentionally removes. Require the actual authoritative shape:
# renderSettingsRuntime installs the scheduler once, while render-distance changes
# call the explicit ordinary-streaming request.
replace_once(
    'tests/render-settings.test.mjs',
    "  assert.match(runtimeSource, /reconcileStreaming\\(this, force, radiusOverride\\)/);",
    """  assert.equal(runtimeSource.includes('reconcileStreaming(this, force, radiusOverride)'), false);
  assert.match(runtimeSource, /installStreamingScheduler\\(prototype\\)/);
  assert.match(runtimeSource, /state\\.updateStreaming\\(\\{ reason: 'ordinary-streaming' \\}\\)/);
  assert.match(streamingSource, /export interface StreamingRequest/);
  assert.match(streamingSource, /reason !== 'ordinary-streaming'/);"""
)

# Source-order is not execution-order: finishReconcile is defined before
# bulkReconcile. Assert the actual call graph instead: the bulk scene mutation
# closes, bulkReconcile calls finishReconcile, and finishReconcile updates fixture
# lighting before requesting the first frame.
replace_once(
    'tests/renderer-lifecycle.test.mjs',
    """  const transaction = streamingSource.indexOf('state.renderer.runCellSceneMutation(reason');
  const unload = streamingSource.indexOf('unloadCell(game, visual.descriptor.address.cellX', transaction);
  const load = streamingSource.indexOf('state.renderer!.loadCell(descriptor)', transaction);
  const fixture = streamingSource.indexOf('state.renderer.updateFixtureLighting(', transaction);
  const renderRequest = streamingSource.indexOf('rendering.renderNextFrame = true', transaction);
  assert.ok(transaction >= 0 && unload > transaction && load > unload);
  assert.ok(fixture > transaction && renderRequest > fixture);
  assert.match(streamingSource, /request\\.refreshUnchanged \\|\\| descriptorChanged/);
""",
    """  const transaction = streamingSource.indexOf('state.renderer.runCellSceneMutation(reason');
  const unload = streamingSource.indexOf('unloadCell(game, visual.descriptor.address.cellX', transaction);
  const load = streamingSource.indexOf('state.renderer!.loadCell(descriptor)', transaction);
  const bulkFinish = streamingSource.indexOf('finishReconcile(game);', transaction);
  const finishStart = streamingSource.indexOf('function finishReconcile');
  const fixture = streamingSource.indexOf('state.renderer.updateFixtureLighting(', finishStart);
  const renderRequest = streamingSource.indexOf('rendering.renderNextFrame = true', fixture);
  assert.ok(transaction >= 0 && unload > transaction && load > unload && bulkFinish > load);
  assert.ok(finishStart >= 0 && fixture > finishStart && renderRequest > fixture);
  assert.match(streamingSource, /request\\.refreshUnchanged \\|\\| descriptorChanged/);
"""
)

print('Arch lifecycle recovery v5 test-contract refinement applied successfully.')
