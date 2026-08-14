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

test('every rendered fixture owns one broad downward shadowed spot', () => {
  assert.ok(fixtureLightingSource.includes("type: 'spot'"));
  assert.ok(fixtureLightingSource.includes('const FIXTURE_SPOT_RANGE = 12.5'));
  assert.ok(fixtureLightingSource.includes('const FIXTURE_SPOT_INNER_CONE = 64'));
  assert.ok(fixtureLightingSource.includes('const FIXTURE_SPOT_OUTER_CONE = 84'));
  assert.ok(fixtureLightingSource.includes('const FIXTURE_SPOT_INTENSITY_MULTIPLIER = 2.9'));
  assert.ok(fixtureLightingSource.includes('castShadows: true'));
  assert.ok(fixtureLightingSource.includes('const FIXTURE_SHADOW_RESOLUTION = 512'));
  assert.ok(fixtureLightingSource.includes('const FIXTURE_SHADOW_BIAS = 0.08'));
  assert.ok(fixtureLightingSource.includes('const FIXTURE_SHADOW_NORMAL_OFFSET = 0.03'));
  assert.ok(fixtureLightingSource.includes('shadowUpdateMode: pc.SHADOWUPDATE_NONE'));
  assert.ok(fixtureLightingSource.includes('pc.SHADOWUPDATE_THISFRAME'));
  assert.ok(fixtureLightingSource.includes('visual.root.addChild(light)'));
  assert.ok(fixtureLightingSource.includes('group.fixtures.forEach'));
  assert.ok(fixtureLightingSource.includes('light.setLocalEulerAngles(0, 0, 0)'));
  assert.equal(fixtureLightingSource.includes('light.setLocalEulerAngles(90, 0, 0)'), false);
  assert.ok(fixtureLightingSource.includes('FIXTURE_PANEL_HALF_HEIGHT'));
  assert.ok(fixtureLightingSource.includes('FIXTURE_EMITTER_CLEARANCE'));
  assert.ok(fixtureLightingSource.includes('markFixtureShadowsDirtyNearCell'));
  assert.equal(fixtureLightingSource.includes('markFixtureShadowsDirty(state)'), false);
  assert.ok(batchingSource.includes('installFixtureLighting()'));
});

test('fixture mesh and emitted light share one binary grey/lit pulse without rebuilding light lifetime', () => {
  assert.ok(fixtureLightingSource.includes('const pulse = fixturePulse(runtime.group, elapsedSeconds, reducedFlicker)'));
  assert.ok(fixtureLightingSource.includes('fixtureMaterial(state, runtime.descriptor, runtime.group, pulse)'));
  assert.ok(fixtureLightingSource.includes('runtime.group.intensity * pulse * FIXTURE_SPOT_INTENSITY_MULTIPLIER'));
  assert.ok(fixtureLightingSource.includes("if (group.state === 'off') return 0"));
  assert.ok(fixtureLightingSource.includes('lightFlickerValue(group, elapsedSeconds, reducedFlicker)'));
  assert.ok(fixtureLightingSource.includes('raw >= FIXTURE_FLICKER_LIT_THRESHOLD ? 1 : 0'));
  assert.ok(fixtureLightingSource.includes("runtime.light.enabled = runtime.group.state !== 'off'"));
  assert.equal(fixtureLightingSource.includes('runtime.light.enabled = lit'), false);
  assert.ok(fixtureLightingSource.includes("runtime.group.state !== 'off' && pulse > 0.5 && runtime.shadowDirty"));
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
  assert.equal(cell.world.blackoutStrength, 1);
});
