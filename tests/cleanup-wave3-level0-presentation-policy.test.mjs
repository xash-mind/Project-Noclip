import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const {
  canonicalLevel0CarpetUv,
  resolveCvh1DepthPresentation,
  resolveLevel0ArchFinishPresentation,
  resolveLevel0CarpetPresentation
} = await import('../.test-dist/src/presentation/level0PresentationPolicy.js');
const { CELL_SIZE } = await import('../.test-dist/src/world/types.js');

const policySource = await readFile(new URL('../src/presentation/level0PresentationPolicy.ts', import.meta.url), 'utf8');
const surfaceSource = await readFile(new URL('../src/renderer/level0SurfacePresentation.ts', import.meta.url), 'utf8');
const regionSource = await readFile(new URL('../src/renderer/level0RegionPresentation.ts', import.meta.url), 'utf8');
const finalSource = await readFile(new URL('../src/renderer/finalLevel0MaterialPresentation.ts', import.meta.url), 'utf8');
const materialSource = await readFile(new URL('../src/renderer/level0PresentationMaterials.ts', import.meta.url), 'utf8');
const wallpaperSource = await readFile(new URL('../src/renderer/ordinaryWallpaperPresentation.ts', import.meta.url), 'utf8');
const casingSource = await readFile(new URL('../src/renderer/ordinaryCasingMaterialPresentation.ts', import.meta.url), 'utf8');
const fixtureSource = await readFile(new URL('../src/renderer/fixtureLighting.ts', import.meta.url), 'utf8');
const worldRendererSource = await readFile(new URL('../src/renderer/WorldRenderer.ts', import.meta.url), 'utf8');

function descriptor(regionId, conditionIds = []) {
  return {
    address: { cellX: 3, cellZ: -4 },
    world: { regionId, conditionIds }
  };
}

function close(left, right, epsilon = 1e-12) {
  return Math.abs(left - right) <= epsilon;
}

test('M-C1 has one policy resolver with explicit no-op Condition contribution and stable Region values', () => {
  const ordinaryClear = resolveLevel0CarpetPresentation(descriptor('ordinary-level-0', []));
  const ordinaryDamp = resolveLevel0CarpetPresentation(descriptor('ordinary-level-0', ['damp-carpet']));
  const pillar = resolveLevel0CarpetPresentation(descriptor('pillar-field', ['shallow-dry-carpet']));
  const arch = resolveLevel0CarpetPresentation(descriptor('arch-rooms', ['deep-wet-carpet']));

  assert.equal(ordinaryDamp.conditionSignature, 'damp-carpet');
  assert.deepEqual(ordinaryDamp.conditionModifier.tintScale, [1, 1, 1]);
  assert.equal(ordinaryDamp.conditionModifier.glossDelta, 0);
  assert.equal(ordinaryDamp.conditionModifier.patternScale, 1);
  assert.deepEqual(ordinaryDamp.color, ordinaryClear.color);
  assert.equal(ordinaryDamp.gloss, ordinaryClear.gloss);
  assert.notDeepEqual(pillar.color, ordinaryClear.color);
  assert.notDeepEqual(arch.color, ordinaryClear.color);
  assert.equal(arch.gloss, 0.11);

  assert.equal(surfaceSource.includes("'material.level-0-carpet'"), false);
  assert.equal(regionSource.includes('CARPET_REPEAT_METERS'), false);
  assert.equal(regionSource.includes('function applyCarpetPresentation'), false);
  assert.equal(finalSource.includes("'material.level-0-carpet'"), false);
  assert.match(surfaceSource, /applyLevel0CarpetMaterials/);
  assert.match(finalSource, /applyLevel0CarpetMaterial/);
  assert.match(materialSource, /resolveLevel0CarpetPresentation/);
});

test('M-C1 world phase remains continuous and CV-H1 remains only a UV-basis consumer', () => {
  const value = descriptor('pillar-field', ['shallow-dry-carpet']);
  const presentation = resolveLevel0CarpetPresentation(value);
  const full = canonicalLevel0CarpetUv(value, presentation.patternSizeMeters, 'full-floor');
  const cut = canonicalLevel0CarpetUv(value, presentation.patternSizeMeters, 'cvh1-indexed');
  const bakedRepeatsPerCell = 5;
  assert.deepEqual(cut.offset, full.offset);
  assert.ok(close(bakedRepeatsPerCell * cut.tiling[0], full.tiling[0]));
  assert.ok(close(bakedRepeatsPerCell * cut.tiling[1], full.tiling[1]));
  assert.ok(close(CELL_SIZE / 5 * bakedRepeatsPerCell, CELL_SIZE));
});

test('M-A1 and CV-H1 depth semantic values resolve only from canonical presentation policy', () => {
  const pier = resolveLevel0ArchFinishPresentation('pier');
  const upper = resolveLevel0ArchFinishPresentation('upper');
  const panel = resolveLevel0ArchFinishPresentation('lower-panel');
  const depth = resolveCvh1DepthPresentation();

  assert.notDeepEqual(pier.color, upper.color);
  assert.notDeepEqual(panel.color, upper.color);
  assert.equal(pier.gloss, upper.gloss);
  assert.deepEqual(depth.deep, [0, 0, 0]);
  assert.deepEqual(depth.void, [0, 0, 0]);

  for (const forbidden of ['ARCH_PIER_TINT', 'ARCH_UPPER_TINT', 'ARCH_PANEL_TINT']) assert.equal(regionSource.includes(forbidden), false);
  assert.equal(finalSource.includes('function archRole'), false);
  assert.match(regionSource, /bindLevel0ArchFinishRole/);
  assert.match(finalSource, /level0ArchFinishRoleForEntity/);
  assert.match(regionSource, /resolveCvh1DepthPresentation/);
  assert.match(finalSource, /cvh1DepthMaterial/);
});

test('Wave 3 preserves shared M-W1 and PD-1/PD-2 behavior while exposing the M-F1 write-boundary blocker', () => {
  assert.match(wallpaperSource, /pillar-field/);
  assert.match(wallpaperSource, /arch-rooms/);
  assert.match(wallpaperSource, /applyPillarWallpaper/);
  assert.match(wallpaperSource, /descriptor\.world\.regionId !== 'ordinary-level-0'/);
  assert.match(casingSource, /descriptor\.world\.regionId !== 'ordinary-level-0'/);

  // Do not fake M-F1 completion: WorldRenderer is outside the Wave 3 write
  // boundary and still constructs/assigns panel presentation independently.
  assert.match(worldRendererSource, /replaceFixtureMeshes/);
  assert.match(worldRendererSource, /fixtureMat/);
  assert.match(fixtureSource, /function fixtureMaterial/);
  assert.equal(policySource.includes('fluorescent-panel'), false);
});
