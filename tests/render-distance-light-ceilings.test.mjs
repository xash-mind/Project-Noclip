import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const { RENDER_DISTANCE_PROFILES } = await import('../.test-dist/src/renderer/renderSettings.js');
const fixtureSource = await readFile(new URL('../src/renderer/fixtureLighting.ts', import.meta.url), 'utf8');

test('Render Distance scales the maximum M-F1 light and shadow budget in whole Cell tiers', () => {
  assert.deepEqual(
    ['low', 'medium', 'high', 'ultra'].map((level) => RENDER_DISTANCE_PROFILES[level].lightShadowSafetyCeiling),
    [32, 64, 96, 128]
  );
  assert.ok(fixtureSource.includes('renderDistanceProfile(settings).lightShadowSafetyCeiling'));
  assert.ok(fixtureSource.includes('Math.min(MAX_ACTIVE_FIXTURE_LIGHTS, renderDistanceCeiling)'));
  assert.ok(fixtureSource.includes('.slice(0, maxActiveLights)'));
  assert.ok(fixtureSource.includes("distanceCeilingPolicy: '32-per-cell-radius-tier-up-to-128'"));
});

test('distance-scaled M-F1 budgets never create a smaller independent shadow pool', () => {
  assert.equal(fixtureSource.includes('MAX_ACTIVE_SHADOW'), false);
  assert.equal(fixtureSource.includes('shadowCandidates'), false);
  assert.ok(fixtureSource.includes("shadowCountPolicy: 'one-to-one-with-active-lights'"));
  assert.ok(fixtureSource.includes('light.castShadows = true'));
});
