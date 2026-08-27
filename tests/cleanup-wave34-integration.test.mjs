import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const {
  resolveLevel0CarpetPresentation,
  resolveLevel0ArchFinishPresentation,
  resolveCvh1DepthPresentation,
  resolveMFluorescentPanelPresentation
} = await import('../.test-dist/src/presentation/level0PresentationPolicy.js');

const policySource = await readFile(new URL('../src/presentation/level0PresentationPolicy.ts', import.meta.url), 'utf8');
const presentationMaterialsSource = await readFile(new URL('../src/renderer/level0PresentationMaterials.ts', import.meta.url), 'utf8');
const surfaceSource = await readFile(new URL('../src/renderer/level0SurfacePresentation.ts', import.meta.url), 'utf8');
const regionSource = await readFile(new URL('../src/renderer/level0RegionPresentation.ts', import.meta.url), 'utf8');
const finalSource = await readFile(new URL('../src/renderer/finalLevel0MaterialPresentation.ts', import.meta.url), 'utf8');
const worldRendererSource = await readFile(new URL('../src/renderer/WorldRenderer.ts', import.meta.url), 'utf8');
const fixtureSource = await readFile(new URL('../src/renderer/fixtureLighting.ts', import.meta.url), 'utf8');
const fixtureVisualSource = await readFile(new URL('../src/renderer/fixtureVisualOwnership.ts', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../src/app/ProjectNoclipGame.ts', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
const renderRuntimeSource = await readFile(new URL('../src/renderer/renderSettingsRuntime.ts', import.meta.url), 'utf8');
const streamingSource = await readFile(new URL('../src/renderer/streamingScheduler.ts', import.meta.url), 'utf8');
const visibilityRuntimeSource = await readFile(new URL('../src/renderer/visibility/runtime.ts', import.meta.url), 'utf8');
const runtimePerformanceSource = await readFile(new URL('../src/renderer/runtimePerformance.ts', import.meta.url), 'utf8');
const outletRuntimeSource = await readFile(new URL('../src/renderer/outletInteractionRuntime.ts', import.meta.url), 'utf8');
const lifecycleSource = await readFile(new URL('../src/renderer/rendererCellLifecycle.ts', import.meta.url), 'utf8');

function descriptor(regionId, conditionIds = []) {
  return {
    address: { cellX: 1, cellZ: -2 },
    world: { regionId, conditionIds }
  };
}

test('Wave 3 canonical Level 0 policy survives Wave 4 runtime integration', () => {
  const carpet = resolveLevel0CarpetPresentation(descriptor('pillar-field', ['shallow-dry-carpet']));
  const arch = resolveLevel0ArchFinishPresentation('lower-panel');
  const depth = resolveCvh1DepthPresentation();

  assert.deepEqual(carpet.conditionModifier.tintScale, [1, 1, 1]);
  assert.equal(carpet.conditionModifier.glossDelta, 0);
  assert.equal(arch.role, 'lower-panel');
  assert.deepEqual(depth.deep, [0, 0, 0]);

  assert.match(presentationMaterialsSource, /resolveLevel0CarpetPresentation/);
  assert.match(surfaceSource, /applyLevel0CarpetMaterials/);
  assert.match(regionSource, /bindLevel0ArchFinishRole/);
  assert.match(finalSource, /level0ArchFinishRoleForEntity/);
  assert.match(regionSource, /cvh1DepthMaterial/);
  assert.match(worldRendererSource, /inheritedFloorMaterial/);
  assert.match(worldRendererSource, /cvh1-floor-surface/);
});

test('M-F1 has one visible-panel policy owner and one shared fixture identity', () => {
  const ordinary = resolveMFluorescentPanelPresentation(descriptor('ordinary-level-0'), 'on', 1);
  const arch = resolveMFluorescentPanelPresentation(descriptor('arch-rooms'), 'on', 1);
  const off = resolveMFluorescentPanelPresentation(descriptor('ordinary-level-0'), 'off', 1);

  assert.deepEqual(ordinary.diffuse, [250 / 255, 244 / 255, 194 / 255]);
  assert.deepEqual(ordinary.emissive, [1, 242 / 255, 173 / 255]);
  assert.equal(ordinary.emissiveIntensity, 2.28);
  assert.deepEqual(arch.diffuse, [252 / 255, 251 / 255, 212 / 255]);
  assert.deepEqual(arch.emissive, [1, 251 / 255, 199 / 255]);
  assert.equal(arch.emissiveIntensity, 2.18);
  assert.deepEqual(off.diffuse, [0.31, 0.31, 0.27]);
  assert.equal(off.emissiveIntensity, 0);

  assert.equal((policySource.match(/material\.fluorescent-panel/g) ?? []).length, 1);
  assert.equal(surfaceSource.includes('material.fluorescent-panel'), false);
  assert.equal(worldRendererSource.includes('material.fluorescent-panel'), false);
  assert.equal(fixtureSource.includes('material.fluorescent-panel'), false);
  assert.match(worldRendererSource, /resolveMFluorescentPanelPresentation/);
  assert.match(fixtureSource, /resolveMFluorescentPanelPresentation/);
  assert.match(worldRendererSource, /mFluorescentFixtureIdentity/);
  assert.match(fixtureSource, /mFluorescentFixtureIdentity/);
  assert.match(fixtureVisualSource, /M_F1_PANEL_DIMENSIONS = Object\.freeze\(\[2\.2, 0\.08, 0\.38\]/);
});

test('M-F1 physical Omni shadow flicker runtime remains the accepted PD-3-frozen implementation', () => {
  assert.match(fixtureSource, /MAX_ACTIVE_FIXTURE_LIGHTS = 128/);
  assert.match(fixtureSource, /FIXTURE_SELECTION_MOVEMENT_METERS = 0\.25/);
  assert.match(fixtureSource, /renderDistanceProfile\(settings\)\.lightShadowSafetyCeiling/);
  assert.match(fixtureSource, /selectActiveFixtureIds/);
  assert.match(fixtureSource, /lightFlickerValue/);
  assert.match(fixtureSource, /castShadows: true/);
  assert.match(fixtureSource, /shadowCountPolicy: 'one-to-one-with-active-lights'/);
  assert.match(fixtureSource, /distanceCeilingPolicy: '32-per-cell-radius-tier-up-to-128'/);
  assert.equal(fixtureSource.includes('materialColor('), false);
  assert.equal(fixtureSource.includes('materialNumber('), false);
});

test('Wave 4 explicit runtime ownership coexists with Wave 3 presentation without direct replacements', () => {
  assert.match(appSource, /setupRenderSettingsEngine\(this\)/);
  assert.match(appSource, /beginStreamingFrame\(this/);
  assert.match(appSource, /finishStreamingFrame\(this/);
  assert.match(appSource, /reconcileStreaming\(this/);
  assert.match(appSource, /updateVisibilityParticipation\(this/);
  assert.match(worldRendererSource, /runtimeCollisionCandidates\(this, bounds\)/);
  assert.match(worldRendererSource, /runtimeInteractionCandidates\(this, x, z, maxDistance\)/);
  assert.match(worldRendererSource, /runtimeDynamicItemCandidates\(this\)/);
  assert.equal(renderRuntimeSource.includes('ProjectNoclipGame.prototype.setupEngine ='), false);
  assert.equal(runtimePerformanceSource.includes('WorldRenderer.prototype.resolveMovement ='), false);
  assert.equal(runtimePerformanceSource.includes('WorldRenderer.prototype.closestInteraction ='), false);
  assert.equal(runtimePerformanceSource.includes('WorldRenderer.prototype.updateDynamicItems ='), false);
  assert.equal(visibilityRuntimeSource.includes('ProjectNoclipGame.prototype'), false);
  assert.equal(mainSource.includes('installVisibilityParticipationRuntime'), false);
});

test('outlet dispatch and the sole Cell lifecycle owner retain their separate responsibilities', () => {
  assert.match(appSource, /isOutletInteraction/);
  assert.match(appSource, /\[E\] Inspect outlet/);
  assert.match(appSource, /The outlet is inert\./);
  assert.match(outletRuntimeSource, /isOutletInteraction/);
  assert.equal(outletRuntimeSource.includes('ProjectNoclipGame.prototype'), false);
  assert.match(streamingSource, /processOneJob\(game\)/);
  assert.match(visibilityRuntimeSource, /export function updateVisibilityParticipation/);

  const loadWrappers = lifecycleSource.match(/const baseLoadCell = WorldRenderer\.prototype\.loadCell/g) ?? [];
  const unloadWrappers = lifecycleSource.match(/const baseUnloadCell = WorldRenderer\.prototype\.unloadCell/g) ?? [];
  assert.equal(loadWrappers.length, 1);
  assert.equal(unloadWrappers.length, 1);
});
