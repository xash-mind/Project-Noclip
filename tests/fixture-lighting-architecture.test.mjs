import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSource = await readFile(new URL('../src/app/ProjectNoclipGame.ts', import.meta.url), 'utf8');
const fixtureLightingSource = await readFile(new URL('../src/renderer/fixtureLighting.ts', import.meta.url), 'utf8');
const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');

const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');

test('runtime owns no fixed player-nearest fluorescent light pool', () => {
  assert.equal(appSource.includes('spatial-fluorescent-light'), false);
  assert.equal(appSource.includes('fixtureLightSourceIds'), false);
  assert.equal(appSource.includes('Array.from({ length: 8'), false);
  assert.equal(appSource.includes('renderer.spatialFixtureLights('), false);
  assert.ok(appSource.includes('renderer.updateFixtureLighting('));
});

test('every rendered fixture is wired to one Cell-owned broad downward spot', () => {
  assert.ok(fixtureLightingSource.includes("type: 'spot'"));
  assert.ok(fixtureLightingSource.includes('const FIXTURE_SPOT_RANGE = 10.5'));
  assert.ok(fixtureLightingSource.includes('const FIXTURE_SPOT_INNER_CONE = 48'));
  assert.ok(fixtureLightingSource.includes('const FIXTURE_SPOT_OUTER_CONE = 68'));
  assert.ok(fixtureLightingSource.includes('castShadows: false'));
  assert.ok(fixtureLightingSource.includes('visual.root.addChild(light)'));
  assert.ok(fixtureLightingSource.includes('group.fixtures.forEach'));
  assert.ok(fixtureLightingSource.includes('light.setLocalEulerAngles(90, 0, 0)'));
  assert.ok(batchingSource.includes('installFixtureLighting()'));
});

test('fixture mesh emission and emitted light use the same deterministic pulse', () => {
  assert.ok(fixtureLightingSource.includes('const pulse = quantizedPulse(runtime.group, elapsedSeconds, reducedFlicker)'));
  assert.ok(fixtureLightingSource.includes('fixtureMaterial(state, runtime.descriptor, runtime.group, pulse)'));
  assert.ok(fixtureLightingSource.includes('runtime.group.intensity * pulse * FIXTURE_SPOT_INTENSITY_MULTIPLIER'));
  assert.ok(fixtureLightingSource.includes("if (group.state === 'off') return 0"));
  assert.ok(fixtureLightingSource.includes('lightFlickerValue(group, elapsedSeconds, reducedFlicker)'));
});

test('Blackout Condition generates no local fluorescent fixtures', () => {
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
      regionOverride: 'ordinary-level-0',
      conditionOverride: 'blackout',
      carverOverride: 'none',
      structureOverride: 'none',
      gateBypass: true
    }
  });
  assert.equal(cell.lightGroups.length, 0);
});
