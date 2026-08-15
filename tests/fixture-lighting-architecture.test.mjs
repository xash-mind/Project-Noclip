import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSource = await readFile(new URL('../src/app/ProjectNoclipGame.ts', import.meta.url), 'utf8');
const fixtureLightingSource = await readFile(new URL('../src/renderer/fixtureLighting.ts', import.meta.url), 'utf8');
const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');
const runtimeSource = await readFile(new URL('../src/renderer/renderSettingsRuntime.ts', import.meta.url), 'utf8');

const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');

function numericConstant(source, name) {
  const match = source.match(new RegExp(`const ${name} = ([0-9.]+);`));
  assert.ok(match, `missing numeric constant ${name}`);
  return Number(match[1]);
}

test('runtime keeps fixture identities but bounds realtime Omni participation to active Render Distance and 128', () => {
  assert.equal(appSource.includes('spatial-fluorescent-light'), false);
  assert.equal(appSource.includes('fixtureLightSourceIds'), false);
  assert.equal(appSource.includes('Array.from({ length: 8'), false);
  assert.equal(appSource.includes('renderer.spatialFixtureLights('), false);
  assert.ok(appSource.includes('renderer.updateFixtureLighting(this.journeyElapsed, this.save.settings.reducedFlicker, position.x, position.z)'));
  assert.ok(fixtureLightingSource.includes('const MAX_ACTIVE_FIXTURE_LIGHTS = 128'));
  assert.ok(fixtureLightingSource.includes('.slice(0, maxActiveLights)'));
  assert.ok(fixtureLightingSource.includes('renderDistanceProfile(settings).lightShadowSafetyCeiling'));
  assert.ok(fixtureLightingSource.includes('cellIsInsideActiveRenderScope(renderer, runtime.descriptor)'));
  assert.ok(fixtureLightingSource.includes('group.fixtures.forEach'));
  assert.ok(fixtureLightingSource.includes('state.fixtures.set(id'));
  assert.ok(fixtureLightingSource.includes('a.distance - b.distance || a.runtime.id.localeCompare(b.runtime.id)'));
  assert.equal(fixtureLightingSource.includes('MAX_ACTIVE_FIXTURE_LIGHTS = 8'), false);
});

test('every active M-F1 Omni retains its own shadow while its luminous diffuser does not self-shadow', () => {
  assert.ok(fixtureLightingSource.includes("type: 'omni'"));
  assert.equal(fixtureLightingSource.includes("type: 'spot'"), false);
  assert.ok(fixtureLightingSource.includes('const FIXTURE_LIGHT_RANGE = 12.0'));
  assert.ok(fixtureLightingSource.includes('const FIXTURE_LIGHT_INTENSITY_MULTIPLIER = 2.0'));
  assert.equal(fixtureLightingSource.includes('innerConeAngle:'), false);
  assert.equal(fixtureLightingSource.includes('outerConeAngle:'), false);
  assert.ok(fixtureLightingSource.includes('castShadows: true'));
  assert.ok(fixtureLightingSource.includes('if (mesh?.render) mesh.render.castShadows = false'));
  assert.ok(fixtureLightingSource.includes('fixturePanelCastsShadows: false'));
  assert.ok(fixtureLightingSource.includes('shadowResolution: getRenderSettings().shadowResolution'));
  assert.ok(fixtureLightingSource.includes('const FIXTURE_SHADOW_BIAS = 0.4'));
  assert.ok(fixtureLightingSource.includes('const FIXTURE_SHADOW_NORMAL_OFFSET = 0.04'));
  assert.ok(fixtureLightingSource.includes('shadowUpdateMode: pc.SHADOWUPDATE_NONE'));
  assert.ok(fixtureLightingSource.includes('pc.SHADOWUPDATE_THISFRAME'));
  assert.ok(fixtureLightingSource.includes('shadowedRealtimeFixtureLightCount'));
  assert.ok(fixtureLightingSource.includes("shadowCountPolicy: 'one-to-one-with-active-lights'"));
  assert.ok(fixtureLightingSource.includes('FIXTURE_PANEL_HALF_HEIGHT'));
  assert.ok(fixtureLightingSource.includes('FIXTURE_EMITTER_CLEARANCE'));
  assert.ok(fixtureLightingSource.includes('markFixtureShadowsDirtyNearCell'));
  assert.equal(fixtureLightingSource.includes('markFixtureShadowsDirty(state)'), false);
  assert.ok(batchingSource.includes('installFixtureLighting()'));
});

test('M-F1 diffuser and Omni consume one canonical continuous pulse in the same per-frame update', () => {
  const flickerCalls = fixtureLightingSource.match(/lightFlickerValue\(/g) ?? [];
  assert.equal(flickerCalls.length, 1, 'fixture renderer must have one flicker sampling path');
  assert.ok(fixtureLightingSource.includes('const groupPulses = new Map<string, number>()'));
  assert.ok(fixtureLightingSource.includes('const pulse = pulseFor(runtime.group)'));
  assert.ok(fixtureLightingSource.includes('fixtureMaterial(state, runtime.descriptor, runtime.group, pulse)'));
  assert.ok(fixtureLightingSource.includes('runtime.group.intensity * pulse * FIXTURE_LIGHT_INTENSITY_MULTIPLIER'));
  assert.ok(fixtureLightingSource.includes("if (group.state === 'off') return 0"));
  assert.ok(fixtureLightingSource.includes('return lightFlickerValue(group, elapsedSeconds, reducedFlicker)'));
  assert.equal(fixtureLightingSource.includes('FIXTURE_FLICKER_LIT_THRESHOLD'), false);
  assert.equal(fixtureLightingSource.includes('raw >='), false);
  assert.equal(fixtureLightingSource.includes('export function fixtureLightIntensity'), false);
  assert.ok(appSource.includes('this.renderer.updateFixtureLighting('));
});

test('eye adaptation stays bounded and recovers from light much faster than darkness', () => {
  const base = numericConstant(appSource, 'BASE_SCENE_EXPOSURE');
  const max = numericConstant(appSource, 'MAX_DARK_ADAPTED_EXPOSURE');
  const darkSeconds = numericConstant(appSource, 'DARK_ADAPT_SECONDS');
  const lightSeconds = numericConstant(appSource, 'LIGHT_ADAPT_SECONDS');
  assert.equal(base, 1);
  assert.equal(max, 1.8);
  assert.ok(darkSeconds >= 6 && darkSeconds <= 12);
  assert.ok(lightSeconds > 0 && lightSeconds <= 1.5);
  assert.ok(darkSeconds / lightSeconds >= 5, 'dark adaptation should be substantially slower than bright recovery');
  assert.ok(appSource.includes('Math.min(MAX_DARK_ADAPTED_EXPOSURE, BASE_SCENE_EXPOSURE + gain)'));
  assert.ok(appSource.includes('target > current ? DARK_ADAPT_SECONDS : LIGHT_ADAPT_SECONDS'));
  assert.ok(appSource.includes('this.app.scene.exposure = this.eyeExposure'));
  assert.ok(runtimeSource.includes('state.blackoutStrength = blackoutStrength'));
  assert.ok(runtimeSource.includes('level0AmbientForBlackout(state.blackoutStrength)'));
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
