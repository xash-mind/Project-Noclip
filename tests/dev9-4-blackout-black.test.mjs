import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const {
  BLACKOUT_AMBIENT_FLOOR,
  DEEP_BLACKOUT_FOG,
  LEVEL0_AMBIENT,
  level0AmbientForBlackout,
  level0FogForSettings,
  renderDistanceProfile,
  settingsForPreset
} = await import('../.test-dist/src/renderer/renderSettings.js');
const { locateNearestBlackout, sampleGen3Environment } = await import('../.test-dist/src/world/gen3.js');
const { DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');

const NATURAL_CORE_SEED = 'dev9-black-2';

function channels(color) {
  return ['r', 'g', 'b'].map((channel) => color[channel]);
}

test('deep Blackout keeps the accepted tiny uniform ambient survival floor', () => {
  const ordinary = level0AmbientForBlackout(0);
  const core = level0AmbientForBlackout(1);
  assert.deepEqual(ordinary, LEVEL0_AMBIENT);
  assert.deepEqual(core, BLACKOUT_AMBIENT_FLOOR);
  assert.deepEqual(core, { r: 0.09, g: 0.084, b: 0.048 });
  for (const [index, channel] of ['r', 'g', 'b'].entries()) {
    assert.ok(channels(core)[index] > 0, `core ${channel} must retain the tiny unaided-navigation floor`);
    assert.ok(channels(core)[index] < channels(ordinary)[index], `core ${channel} must remain materially darker than Ordinary`);
  }
});

test('partial Blackout interpolates smoothly between Ordinary and the deep ambient floor', () => {
  const ordinary = level0AmbientForBlackout(0);
  const partial = level0AmbientForBlackout(0.68);
  const core = level0AmbientForBlackout(1);
  for (const channel of ['r', 'g', 'b']) {
    assert.ok(partial[channel] > core[channel], `partial ${channel} stays above the deep floor`);
    assert.ok(partial[channel] < ordinary[channel], `partial ${channel} stays below Ordinary`);
  }
});

test('leaving Blackout restores the exact ordinary active atmosphere', () => {
  const settings = settingsForPreset('high');
  const beforeAmbient = level0AmbientForBlackout(0);
  const beforeFog = level0FogForSettings(settings, 0);
  const coreAmbient = level0AmbientForBlackout(1);
  const coreFog = level0FogForSettings(settings, 1);
  const afterAmbient = level0AmbientForBlackout(0);
  const afterFog = level0FogForSettings(settings, 0);
  assert.notDeepEqual(coreAmbient, beforeAmbient);
  assert.notDeepEqual(coreFog, beforeFog);
  assert.deepEqual(afterAmbient, beforeAmbient);
  assert.deepEqual(afterFog, beforeFog);
});

test('deep Blackout atmosphere is independent of Render Distance while its black fog hides each renderer frontier', () => {
  const ambient = level0AmbientForBlackout(1);
  const fogEnds = [];
  for (const preset of ['low', 'medium', 'high', 'ultra']) {
    const settings = settingsForPreset(preset);
    const profile = renderDistanceProfile(settings);
    const fog = level0FogForSettings(settings, 1);
    assert.deepEqual(level0AmbientForBlackout(1), ambient, `${preset} must use the same deep ambient floor`);
    assert.deepEqual(fog.color, DEEP_BLACKOUT_FOG, `${preset} deep fog must resolve to black`);
    assert.ok(fog.start < fog.end, `${preset} fog must have a valid interval`);
    assert.ok(fog.end < profile.approximateRenderDistanceMeters, `${preset} fog must conceal the Cell/render boundary`);
    fogEnds.push(fog.end);
  }
  assert.deepEqual([...fogEnds].sort((a, b) => a - b), fogEnds, 'only the hidden fog frontier moves with Render Distance');
});

test('the deterministic natural Blackout locator reaches a true deep core without a synthetic visual escape light', async () => {
  const tuning = { ...DEFAULT_TUNING, gateBypass: true, conditionOverride: undefined };
  const occurrence = locateNearestBlackout({
    seed: NATURAL_CORE_SEED,
    originX: 0,
    originZ: 0,
    worldDay: 0,
    exposure: 0,
    tuning
  });
  assert.ok(occurrence, 'expected a natural Blackout occurrence');
  assert.equal(occurrence.strength, 1, 'browser-evidence seed must land at a true natural core');

  const environment = sampleGen3Environment(
    NATURAL_CORE_SEED,
    occurrence.worldX,
    occurrence.worldZ,
    0,
    0,
    tuning
  );
  assert.equal(environment.blackoutStrength, 1);
  assert.equal(environment.blackoutEscapeCue, 0);
  assert.deepEqual(level0AmbientForBlackout(environment.blackoutStrength), BLACKOUT_AMBIENT_FLOOR);

  const runtimeSource = await readFile(new URL('../src/renderer/renderSettingsRuntime.ts', import.meta.url), 'utf8');
  assert.match(runtimeSource, /level0AmbientForBlackout\(state\.blackoutStrength\)/);
  assert.doesNotMatch(runtimeSource, /blackout-external-glimmer/);
  assert.doesNotMatch(runtimeSource, /blackoutGuideLight/);
  assert.doesNotMatch(runtimeSource, /blackoutExitDirection/);
  assert.match(runtimeSource, /state\.ambience\.setEnvironment\(blackoutStrength, blackoutEscapeCue\)/, 'audio may still use the continuous boundary cue');
});

test('legitimate M-F1 lighting remains fixture-owned, shadowed and physically bounded', async () => {
  const fixtureSource = await readFile(new URL('../src/renderer/fixtureLighting.ts', import.meta.url), 'utf8');
  assert.match(fixtureSource, /const FIXTURE_LIGHT_RANGE = 12\.0/);
  assert.match(fixtureSource, /type: 'omni'/);
  assert.match(fixtureSource, /castShadows: true/);
  assert.match(fixtureSource, /cellIsInsideActiveRenderScope\(renderer, runtime\.descriptor\)/);
  assert.match(fixtureSource, /shadowCountPolicy: 'one-to-one-with-active-lights'/);
});

test('flashlight remains an independent player-owned light in Blackout', async () => {
  const gameSource = await readFile(new URL('../src/app/ProjectNoclipGame.ts', import.meta.url), 'utf8');
  const runtimeSource = await readFile(new URL('../src/renderer/renderSettingsRuntime.ts', import.meta.url), 'utf8');
  assert.match(runtimeSource, /new pc\.Entity\('flashlight'\)/);
  assert.match(runtimeSource, /type: 'spot'.*range: 22, intensity: 2\.4/s);
  assert.match(gameSource, /this\.flashlight\.enabled = !this\.flashlight\.enabled/);
  assert.doesNotMatch(gameSource, /blackoutStrength[^\n;]*flashlight\.enabled/);
  assert.doesNotMatch(runtimeSource, /blackoutStrength[^\n;]*flashlight\.enabled/);
});
