import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const {
  M_F1_DIFFUSER_RECESS,
  M_F1_FIXTURE_LCG,
  M_F1_HOUSING_FRAME_WIDTH,
  M_F1_PANEL_DIMENSIONS,
  isMFluorescentHousingVisualName,
  isMFluorescentPanelVisualName,
  mFluorescentFixtureGeometryData,
  mFluorescentFixtureIdentity
} = await import('../.test-dist/src/renderer/fixtureVisualOwnership.js');
const { geometryIsFinite, hasDuplicateTriangles } = await import('../.test-dist/src/presentation/geometry.js');

const geometryRuntimeSource = await readFile(new URL('../src/renderer/fixtureVisualGeometry.ts', import.meta.url), 'utf8');
const rendererSource = await readFile(new URL('../src/renderer/WorldRenderer.ts', import.meta.url), 'utf8');
const fixtureLightingSource = await readFile(new URL('../src/renderer/fixtureLighting.ts', import.meta.url), 'utf8');
const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');
const worldLightingSource = await readFile(new URL('../src/world/lighting.ts', import.meta.url), 'utf8');

function close(actual, expected, epsilon = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${expected}, got ${actual}`);
}

function assertBounds(actual, expectedMin, expectedMax) {
  actual.min.forEach((value, index) => close(value, expectedMin[index]));
  actual.max.forEach((value, index) => close(value, expectedMax[index]));
}

test('M-F1 canonical housing and diffuser stay inside the accepted fixture envelope', () => {
  assert.deepEqual(M_F1_PANEL_DIMENSIONS, [2.2, 0.08, 0.38]);
  assert.equal(M_F1_FIXTURE_LCG, 'LCG-1');
  assert.ok(M_F1_HOUSING_FRAME_WIDTH > 0 && M_F1_HOUSING_FRAME_WIDTH < M_F1_PANEL_DIMENSIONS[2] / 2);
  assert.ok(M_F1_DIFFUSER_RECESS > 0 && M_F1_DIFFUSER_RECESS < M_F1_PANEL_DIMENSIONS[1]);

  const first = mFluorescentFixtureGeometryData();
  const second = mFluorescentFixtureGeometryData();
  assert.equal(first, second, 'canonical mesh data must be allocated once and reused');
  assert.equal(first.housing, second.housing);
  assert.equal(first.diffuser, second.diffuser);
  assert.equal(geometryIsFinite(first.housing), true);
  assert.equal(geometryIsFinite(first.diffuser), true);
  assert.equal(hasDuplicateTriangles(first.housing), false);
  assert.equal(hasDuplicateTriangles(first.diffuser), false);
  assert.equal(first.housing.indices.length / 3, 32, 'housing is one clean 16-quad ring/tray mesh');
  assert.equal(first.diffuser.indices.length / 3, 2, 'diffuser is one independently addressable quad');

  assertBounds(first.housing, [-1.1, -0.04, -0.19], [1.1, 0.04, 0.19]);
  assertBounds(
    first.diffuser,
    [-1.1 + M_F1_HOUSING_FRAME_WIDTH, -0.04 + M_F1_DIFFUSER_RECESS, -0.19 + M_F1_HOUSING_FRAME_WIDTH],
    [1.1 - M_F1_HOUSING_FRAME_WIDTH, -0.04 + M_F1_DIFFUSER_RECESS, 0.19 - M_F1_HOUSING_FRAME_WIDTH]
  );
});

test('each semantic fixture keeps independent panel identity while housing is separately addressable', () => {
  const first = mFluorescentFixtureIdentity('light-group-a', 0);
  const second = mFluorescentFixtureIdentity('light-group-a', 1);
  assert.notEqual(first.id, second.id);
  assert.notEqual(first.panelName, second.panelName);
  assert.notEqual(first.housingName, second.housingName);
  assert.equal(first.housingName, `${first.panelName}:housing`);
  assert.equal(isMFluorescentPanelVisualName(first.panelName), true);
  assert.equal(isMFluorescentPanelVisualName(first.housingName), false);
  assert.equal(isMFluorescentHousingVisualName(first.housingName), true);
  assert.equal(isMFluorescentPanelVisualName('fixture:0'), true, 'frozen Gen2 panel naming stays recognized');
  assert.equal(isMFluorescentHousingVisualName('fixture:0:housing'), true);
});

test('runtime builds two canonical GPU meshes per graphics device and reuses them across fixture instances', () => {
  assert.match(geometryRuntimeSource, /const resourcesByDevice = new WeakMap<object, MFluorescentFixtureResources>\(\)/);
  assert.match(geometryRuntimeSource, /const existing = resourcesByDevice\.get\(deviceKey\)/);
  assert.match(geometryRuntimeSource, /resourcesByDevice\.set\(deviceKey, created\)/);
  assert.match(geometryRuntimeSource, /housing: meshFromData\(app, geometry\.housing\)/);
  assert.match(geometryRuntimeSource, /diffuser: meshFromData\(app, geometry\.diffuser\)/);
  assert.match(geometryRuntimeSource, /new pc\.MeshInstance\(mesh, material\)/);
  assert.match(rendererSource, /isMFluorescentPanelVisualName\(name\)/);
  assert.match(rendererSource, /createMFluorescentFixtureVisual\(this\.app, parent, name, position, rotationY, boxMaterial\)\.panel/);
  assert.match(rendererSource, /M-F1 panel \$\{name\} requested non-canonical dimensions/);
});

test('static housing can batch while every diffuser stays outside static batching and flickers independently', () => {
  assert.match(batchingSource, /if \(isMFluorescentPanelVisualName\(entity\.name\)\)/);
  assert.match(batchingSource, /entity\.render\.batchGroupId = -1/);
  assert.equal(batchingSource.includes('isMFluorescentHousingVisualName'), false, 'housing must remain eligible for ordinary static batching');
  assert.match(fixtureLightingSource, /const mesh = panels\.get\(identity\.id\)/);
  assert.match(fixtureLightingSource, /runtime\.mesh\.render\.material = material/);
  assert.match(fixtureLightingSource, /const groupPulses = new Map<string, number>\(\)/);
  assert.match(fixtureLightingSource, /fixturePanelMaterial\(state, runtime\.descriptor, runtime\.group, pulse\)/);
  assert.equal(geometryRuntimeSource.includes("addComponent('light'"), false, 'visible geometry owner must not create physical lights');
});

test('physical Omni and Blackout world law stay outside the M-F1 geometry owner', () => {
  assert.equal(geometryRuntimeSource.includes("../world/lighting"), false);
  assert.equal(geometryRuntimeSource.includes('./fixtureLighting'), false);
  assert.match(fixtureLightingSource, /type: 'omni'/);
  assert.match(fixtureLightingSource, /const FIXTURE_LIGHT_RANGE = 12\.0/);
  assert.match(fixtureLightingSource, /const FIXTURE_LIGHT_INTENSITY_MULTIPLIER = 2\.0/);
  assert.match(worldLightingSource, /if \(blackoutStrength > 0\.52 \|\| zoneId === 'blackout'\) return \[\]/);
  assert.match(worldLightingSource, /lightFlickerValue/);
});

test('Gen3 and frozen Gen2 both route canonical panel realization through the same renderer factory', () => {
  assert.match(rendererSource, /new RendererCellBuilder\(app, save, this\.walls, this\.interactions, this\.getMaterial\.bind\(this\), this\.box\.bind\(this\)\)/);
  assert.match(rendererSource, /descriptor\.world\.generationVersion === 'gen2'/);
  assert.match(rendererSource, /replaceLegacyFixtureMeshes\(visual\)/);
  assert.match(rendererSource, /const identity = mFluorescentFixtureIdentity\(group\.id, index\)/);
  assert.match(rendererSource, /this\.box\(\s*identity\.panelName,/);
});
