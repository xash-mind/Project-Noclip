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

# Render-distance changes still reconcile Cells, but through the explicit ordinary
# streaming intent rather than the removed boolean false flag.
replace_once(
    'tests/render-settings-runtime-application.test.mjs',
    "  assert.match(applySource, /if \\(renderDistanceChanged && state\\.save && state\\.renderer\\) state\\.updateStreaming\\(false\\)/);",
    "  assert.match(applySource, /if \\(renderDistanceChanged && state\\.save && state\\.renderer\\) state\\.updateStreaming\\(\\{ reason: 'ordinary-streaming' \\}\\)/);"
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

# The explicit completion phase is part of the consolidated ownership contract.
replace_once(
    'tests/arch-smooth-presentation.test.mjs',
    "  assert.match(regionSource, /renderer\\.onCellSceneMutationComplete\\(\\(\\) => flushArchPresentation\\(renderer\\)\\)/);",
    "  assert.match(regionSource, /renderer\\.onCellSceneMutationComplete\\(\\(\\) => flushArchPresentation\\(renderer\\), CELL_SCENE_MUTATION_PHASE\\.presentation\\)/);"
)

# Strict PlayCanvas typing uses a tiny parent accessor rather than touching the
# runtime-only parent property directly; test the lifecycle rule, not syntax.
replace_once(
    'tests/fixture-lighting-architecture.test.mjs',
    "  assert.match(fixtureLightingSource, /runtime\\.light\\.parent !== visual\\.root/);",
    "  assert.match(fixtureLightingSource, /entityParent\\(runtime\\.light\\) !== visual\\.root/);"
)

# The old fidelity test called the deleted 12-box curve helper. Inspect the final
# authoritative bay reconstruction instead: each curve is render-only, centered,
# narrower than its bay, and the semantic world still contains no curved pieces.
replace_once(
    'tests/dev5-pillar-arch.test.mjs',
    """const {
  archCurveSegmentsForCell,
  archFrameBaysForDescriptors,
  carpetProfileForCell,
  holeDepthBands
} = await import('../.test-dist/src/renderer/level0RegionPresentation.js');""",
    """const {
  archFrameBaysForDescriptors,
  archFramePresentationProfile,
  carpetProfileForCell,
  holeDepthBands
} = await import('../.test-dist/src/renderer/level0RegionPresentation.js');"""
)
replace_once(
    'tests/dev5-pillar-arch.test.mjs',
    """test('Arch curves remain render-only, small and centered rather than broad bay cut-outs', () => {
  const tuning = clean('arch-rooms');
  const curveBottoms = new Set();
  let curvedPieces = 0;
  let semanticCurvePieces = 0;
  let checkedCells = 0;
  let maxSemanticWalls = 0;
  for (let seedIndex = 0; seedIndex < 5; seedIndex += 1) {
    const seed = `arch-curve-${seedIndex}`;
    for (let x = -3; x <= 3; x += 1) {
      for (let z = -3; z <= 3; z += 1) {
        const entry = cell(seed, x, z, tuning);
        checkedCells += 1;
        maxSemanticWalls = Math.max(maxSemanticWalls, entry.walls.length);
        const segments = archCurveSegmentsForCell(entry);
        curvedPieces += segments.length;
        for (const segment of segments) curveBottoms.add((segment.position[1] - segment.scale[1] / 2).toFixed(3));
        for (const wall of entry.walls) {
          if (wall.materialId !== 'arch-pale-wallpaper') continue;
          const minY = wall.cy - wall.sy / 2;
          const maxY = wall.cy + wall.sy / 2;
          if (minY > 1.45 && minY < 2.72 && maxY >= WALL_HEIGHT - 0.46) semanticCurvePieces += 1;
        }
      }
    }
  }
  assert.equal(semanticCurvePieces, 0, 'curved intrados leaked back into semantic/collision walls');
  assert.ok(curvedPieces > 40, `only ${curvedPieces} render-only curved aperture segments`);
  assert.ok(curveBottoms.size >= 4, `arch aperture has only ${curveBottoms.size} distinct curve heights`);
  assert.ok(maxSemanticWalls <= 64, `Arch semantic wall budget reached ${maxSemanticWalls} across ${checkedCells} sampled cells`);
});""",
    """test('Arch curves remain render-only, small and centered rather than broad bay cut-outs', () => {
  const tuning = clean('arch-rooms');
  const profile = archFramePresentationProfile();
  let curvedBays = 0;
  let semanticCurvePieces = 0;
  let checkedCells = 0;
  let maxSemanticWalls = 0;
  for (let seedIndex = 0; seedIndex < 5; seedIndex += 1) {
    const seed = `arch-curve-${seedIndex}`;
    const descriptors = [];
    for (let x = -3; x <= 3; x += 1) {
      for (let z = -3; z <= 3; z += 1) {
        const entry = cell(seed, x, z, tuning);
        descriptors.push(entry);
        checkedCells += 1;
        maxSemanticWalls = Math.max(maxSemanticWalls, entry.walls.length);
        for (const wall of entry.walls) {
          if (wall.materialId !== 'arch-pale-wallpaper') continue;
          const minY = wall.cy - wall.sy / 2;
          const maxY = wall.cy + wall.sy / 2;
          if (minY > 1.45 && minY < 2.72 && maxY >= WALL_HEIGHT - 0.46) semanticCurvePieces += 1;
        }
      }
    }
    const bays = archFrameBaysForDescriptors(descriptors);
    curvedBays += bays.length;
    for (const bay of bays) {
      const bayWidth = bay.end - bay.start;
      const curveWidth = bay.curveEnd - bay.curveStart;
      assert.ok(curveWidth > 0.05 && curveWidth < bayWidth, `curve ${bay.id} is not a compact central span`);
      assert.ok(Math.abs((bay.curveStart + bay.curveEnd) / 2 - (bay.start + bay.end) / 2) < 1e-9, `curve ${bay.id} is off-center`);
    }
  }
  assert.equal(semanticCurvePieces, 0, 'curved intrados leaked back into semantic/collision walls');
  assert.ok(curvedBays > 8, `only ${curvedBays} render-only Arch bays`);
  assert.ok(profile.curveApex > profile.upperBottom, 'smooth render profile lost its curved aperture');
  assert.ok(maxSemanticWalls <= 64, `Arch semantic wall budget reached ${maxSemanticWalls} across ${checkedCells} sampled cells`);
});"""
)

print('Arch lifecycle recovery v5 test-contract refinement applied successfully.')
