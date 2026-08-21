import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const {
  LEVEL0_AMBIENT,
  LEVEL0_FOG_COLOR,
  resolveBlackoutRenderState
} = await import('../.test-dist/src/app/blackoutRendering.js');
const { locateNearestBlackout, sampleGen3Environment } = await import('../.test-dist/src/world/gen3.js');
const { DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');

const NATURAL_CORE_SEED = 'dev9-black-2';
const ordinaryRuntimeAmbient = {
  r: LEVEL0_AMBIENT.r + 0.009,
  g: LEVEL0_AMBIENT.g + 0.0085,
  b: LEVEL0_AMBIENT.b + 0.005
};

function assertRgbExact(actual, expected, label) {
  assert.equal(actual.r, expected.r, `${label}.r`);
  assert.equal(actual.g, expected.g, `${label}.g`);
  assert.equal(actual.b, expected.b, `${label}.b`);
}

function assertRgbZero(actual, label) {
  assertRgbExact(actual, { r: 0, g: 0, b: 0 }, label);
}

test('ordinary Level 0 render endpoints remain unchanged', () => {
  const state = resolveBlackoutRenderState(0, 0);
  assertRgbExact(state.fog, LEVEL0_FOG_COLOR, 'ordinary fog');
  assertRgbExact(state.clear, LEVEL0_FOG_COLOR, 'ordinary clear');
  assertRgbExact(state.ambient, ordinaryRuntimeAmbient, 'ordinary ambient');
  assert.equal(state.guideLightEnabled, false);
  assert.equal(state.guideLightIntensity, 0);
});

test('partial Blackout remains a smooth nonzero interpolation', () => {
  const ordinary = resolveBlackoutRenderState(0, 0);
  const partial = resolveBlackoutRenderState(0.68, 0.45);
  for (const channel of ['r', 'g', 'b']) {
    assert.ok(partial.fog[channel] > 0 && partial.fog[channel] < ordinary.fog[channel], `partial fog ${channel}`);
    assert.ok(partial.ambient[channel] > 0 && partial.ambient[channel] < ordinary.ambient[channel], `partial ambient ${channel}`);
  }
  assert.deepEqual(partial.clear, partial.fog);
  assert.equal(partial.guideLightEnabled, true);
  assert.equal(partial.guideLightIntensity, 0.45 * 0.24);
});

test('full Blackout fog and camera clear reach exact absolute black', () => {
  const core = resolveBlackoutRenderState(1, 0);
  assertRgbZero(core.fog, 'core fog');
  assertRgbZero(core.clear, 'core clear');
});

test('full Blackout has no residual environmental render floor', () => {
  const core = resolveBlackoutRenderState(1, 0);
  assertRgbZero(core.ambient, 'core ambient');
  assert.equal(core.guideLightIntensity, 0);
  assert.equal(core.guideLightEnabled, false);

  // Eye adaptation is intentionally preserved. Even the accepted maximum scene
  // exposure cannot lift exact-zero environmental terms into navigable grey.
  const maxAcceptedEyeExposure = 1.8;
  assert.equal((core.ambient.r + core.ambient.g + core.ambient.b) * maxAcceptedEyeExposure, 0);
  assert.equal((core.fog.r + core.fog.g + core.fog.b) * maxAcceptedEyeExposure, 0);
});

test('exiting Blackout restores the exact ordinary render state', () => {
  const before = resolveBlackoutRenderState(0, 0);
  const core = resolveBlackoutRenderState(1, 0);
  const after = resolveBlackoutRenderState(0, 0);
  assert.notDeepEqual(core, before);
  assert.deepEqual(after, before);
});

test('the deterministic natural Blackout locator can reach an exact absolute-black core', () => {
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
  assert.equal(occurrence.strength, 1, 'natural locator must land at a true core for the browser-evidence seed');

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

  const state = resolveBlackoutRenderState(environment.blackoutStrength, environment.blackoutEscapeCue);
  assertRgbZero(state.fog, 'natural core fog');
  assertRgbZero(state.clear, 'natural core clear');
  assertRgbZero(state.ambient, 'natural core ambient');
  assert.equal(state.guideLightEnabled, false);
});

test('flashlight remains an allowed player-owned light independent of Blackout environmental state', async () => {
  const source = await readFile(new URL('../src/app/ProjectNoclipGame.ts', import.meta.url), 'utf8');
  assert.match(source, /new pc\.Entity\('flashlight'\)/);
  assert.match(source, /type: 'spot'.*range: 22, intensity: 2\.4/s);
  assert.match(source, /this\.flashlight\.enabled = !this\.flashlight\.enabled/);
  assert.doesNotMatch(source, /blackoutStrength[^\n;]*flashlight\.enabled/);
});
