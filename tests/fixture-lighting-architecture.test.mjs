import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSource = await readFile(new URL('../src/app/ProjectNoclipGame.ts', import.meta.url), 'utf8');
const correctionSource = await readFile(new URL('../src/renderer/fixtureCentricLightingCorrection.ts', import.meta.url), 'utf8');
const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');

const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');

test('runtime no longer owns a fixed player-nearest fluorescent light pool', () => {
  assert.equal(appSource.includes('spatial-fluorescent-light'), false);
  assert.equal(appSource.includes('fixtureLightSourceIds'), false);
  assert.equal(appSource.includes('Array.from({ length: 8'), false);
  assert.equal(appSource.includes('renderer.spatialFixtureLights('), false);
  assert.ok(appSource.includes('renderer.updateFixtureLighting('));
});

test('every rendered fixture is wired to one Cell-owned broad downward spot', () => {
  assert.ok(correctionSource.includes("type: 'spot'"));
  assert.ok(correctionSource.includes('const FIXTURE_SPOT_RANGE = 10.5'));
  assert.ok(correctionSource.includes('const FIXTURE_SPOT_INNER_CONE = 48'));
  assert.ok(correctionSource.includes('const FIXTURE_SPOT_OUTER_CONE = 68'));
  assert.ok(correctionSource.includes('castShadows: false'));
  assert.ok(correctionSource.includes('visual.root.addChild(light)'));
  assert.ok(correctionSource.includes('group.fixtures.forEach'));
  assert.ok(correctionSource.includes('light.setLocalEulerAngles(90, 0, 0)'));
  assert.ok(batchingSource.includes('installFixtureCentricLightingCorrection()'));
});

test('fixture mesh emission and emitted light use the same deterministic pulse', () => {
  assert.ok(correctionSource.includes('const pulse = quantizedPulse(runtime.group, elapsedSeconds, reducedFlicker)'));
  assert.ok(correctionSource.includes('fixtureMaterial(state, runtime.descriptor, runtime.group, pulse)'));
  assert.ok(correctionSource.includes('runtime.group.intensity * pulse * FIXTURE_SPOT_INTENSITY_MULTIPLIER'));
  assert.ok(correctionSource.includes("if (group.state === 'off') return 0"));
  assert.ok(correctionSource.includes('lightFlickerValue(group, elapsedSeconds, reducedFlicker)'));
});

test('Blackout core generates no local fluorescent fixtures', () => {
  const cell = generateCell({
    seed: 'fixture-lighting-blackout',
    x: 0,
    z: 0,
    worldDay: 40,
    exposure: 10,
    shiftEpoch: 0,
    generationVersion: 'gen3-v1',
    tuning: {
      ...DEFAULT_TUNING,
      regionOverride: 'blackout',
      conditionOverride: 'clear',
      carverOverride: 'none',
      structureOverride: 'none',
      gateBypass: true
    }
  });
  assert.equal(cell.lightGroups.length, 0);
});
