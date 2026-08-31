import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const settingsModule = await import('../.test-dist/src/renderer/renderSettings.js');
const runtimeModule = await import('../.test-dist/src/renderer/renderSettingsRuntime.js');
const { CELL_SIZE } = await import('../.test-dist/src/world/types.js');

const fixtureSource = await readFile(new URL('../src/renderer/fixtureLighting.ts', import.meta.url), 'utf8');
const runtimeSource = await readFile(new URL('../src/renderer/renderSettingsRuntime.ts', import.meta.url), 'utf8');
const labSource = await readFile(new URL('../src/ui/renderSettingsLab.ts', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
const persistenceSource = await readFile(new URL('../src/persistence/types.ts', import.meta.url), 'utf8');

const {
  DEEP_BLACKOUT_FOG,
  RENDER_DISTANCE_PROFILES,
  RENDER_FRONTIER_CONCEALMENT_MARGIN_METERS,
  RENDER_SETTINGS_STORAGE_KEY,
  fogEndForGuaranteedFrontier,
  getRenderSettings,
  level0FogForSettings,
  setRenderSettings,
  setTransientRenderSettings,
  settingsForPreset
} = settingsModule;
const { nearestGuaranteedRenderFrontierMeters } = runtimeModule;

function loadedSquare(radius, missing = []) {
  const excluded = new Set(missing.map(([x, z]) => `${x}:${z}`));
  const loaded = new Map();
  for (let x = -radius; x <= radius; x += 1) {
    for (let z = -radius; z <= radius; z += 1) {
      const id = `${x}:${z}`;
      if (!excluded.has(id)) loaded.set(id, { id });
    }
  }
  return { loaded };
}

test('visible fog horizons stay one metre inside whole-Cell active envelopes for every preset', () => {
  assert.equal(CELL_SIZE, 14);
  assert.equal(RENDER_FRONTIER_CONCEALMENT_MARGIN_METERS, 1);
  const levels = ['low', 'medium', 'high', 'ultra'];
  assert.deepEqual(levels.map((level) => RENDER_DISTANCE_PROFILES[level].loadRadius), [1, 2, 3, 4]);
  assert.deepEqual(levels.map((level) => RENDER_DISTANCE_PROFILES[level].fogEnd), [13, 27, 41, 55]);
  for (const level of levels) {
    const profile = RENDER_DISTANCE_PROFILES[level];
    assert.equal(profile.approximateRenderDistanceMeters, profile.loadRadius * CELL_SIZE);
    assert.equal(profile.fogEnd, profile.approximateRenderDistanceMeters - profile.frontierConcealmentMargin);
    assert.equal(profile.retentionRadius, profile.loadRadius + 1);
  }
});

test('camera-aware frontier safety clamps fog before missing requested coverage at representative positions', () => {
  for (const preset of ['low', 'medium', 'high', 'ultra']) {
    const settings = settingsForPreset(preset);
    const radius = RENDER_DISTANCE_PROFILES[preset].loadRadius;
    const missing = [[radius, 0]];
    const renderer = loadedSquare(radius, missing);
    for (const playerX of [0, CELL_SIZE / 2 - 1, CELL_SIZE / 2 - 0.1]) {
      const frontier = nearestGuaranteedRenderFrontierMeters(renderer, 0, 0, playerX, 0, settings);
      assert.equal(typeof frontier, 'number');
      const fog = level0FogForSettings(settings, 0, frontier);
      assert.ok(fog.end < frontier, `${preset} fog ${fog.end} must be opaque before missing Cell begins at ${frontier}`);
      assert.equal(fog.end, fogEndForGuaranteedFrontier(settings, frontier));
    }
  }
});

test('fully loaded requested coverage keeps canonical fog stable instead of pumping', () => {
  for (const preset of ['low', 'medium', 'high', 'ultra']) {
    const settings = settingsForPreset(preset);
    const radius = RENDER_DISTANCE_PROFILES[preset].loadRadius;
    const renderer = loadedSquare(radius);
    for (const [x, z] of [[0, 0], [6.5, 0], [-6.5, 6.5]]) {
      const frontier = nearestGuaranteedRenderFrontierMeters(renderer, 0, 0, x, z, settings);
      assert.equal(frontier, undefined);
      assert.equal(level0FogForSettings(settings, 0, frontier).end, RENDER_DISTANCE_PROFILES[preset].fogEnd);
    }
  }
});

test('Blackout keeps the same frontier clamp while atmosphere still reaches canonical deep black', () => {
  const settings = settingsForPreset('high');
  const frontier = 24;
  const ordinary = level0FogForSettings(settings, 0, frontier);
  const blackout = level0FogForSettings(settings, 1, frontier);
  assert.equal(ordinary.end, blackout.end);
  assert.ok(ordinary.end < frontier);
  assert.deepEqual(blackout.color, DEEP_BLACKOUT_FOG);
});

test('transient World Lab render experiments do not write the device-local canonical setting', () => {
  const memory = new Map();
  const storage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value)
  };
  const canonical = settingsForPreset('high');
  setRenderSettings(canonical, storage);
  const persisted = memory.get(RENDER_SETTINGS_STORAGE_KEY);
  setTransientRenderSettings(settingsForPreset('low'));
  assert.equal(getRenderSettings().renderDistance, 'low');
  assert.equal(memory.get(RENDER_SETTINGS_STORAGE_KEY), persisted);
  setTransientRenderSettings(canonical);
});

test('World Lab lighting experiments stay inside fixture participation and preserve canonical production policy', () => {
  assert.match(fixtureSource, /const canonicalActiveCeiling = Math\.min\(MAX_ACTIVE_FIXTURE_LIGHTS, renderDistanceCeiling\)/);
  assert.match(fixtureSource, /qaOverrides\.maxActiveLights \?\? canonicalActiveCeiling/);
  assert.match(fixtureSource, /Math\.min\(maxActiveLights, qaOverrides\.maxShadowCastingLights \?\? maxActiveLights\)/);
  assert.match(fixtureSource, /shadowCountPolicy: 'one-to-one-with-active-lights'/);
  assert.match(fixtureSource, /distanceCeilingPolicy: '32-per-cell-radius-tier-up-to-128'/);
  assert.doesNotMatch(fixtureSource, /runtime\.group\.(?:state|intensity|temperature)\s*=/);
  assert.doesNotMatch(fixtureSource, /descriptor\.lightGroups\s*=/);
});

test('performance lab overrides are DEV-only, ephemeral, resettable and outside save/generation contracts', () => {
  assert.match(mainSource, /if \(import\.meta\.env\.DEV\)[\s\S]*import\('\.\/ui\/renderSettingsLab\.js'\)/);
  assert.doesNotMatch(mainSource, /^import .*renderSettingsLab/m);
  assert.match(labSource, /setTransientRenderSettings/);
  assert.match(labSource, /resetFixtureLightingQaOverrides/);
  assert.match(labSource, /reset-render-experiment/);
  assert.match(labSource, /reset-lighting-experiment/);
  assert.match(labSource, /Max active M-F1 Omnis/);
  assert.match(labSource, /Max shadow-casting M-F1 Omnis/);
  assert.doesNotMatch(labSource, /setRenderSettings|patchRenderSettings|applyRenderPreset/);
  assert.doesNotMatch(labSource, /persistence|SaveData|generationVersion/);
  assert.doesNotMatch(persistenceSource, /maxActiveLights|maxShadowCastingLights|renderScale|shadowResolution/);
});

test('frontier concealment reads streaming coverage without taking streaming or visibility ownership', () => {
  assert.match(runtimeSource, /renderer\.loaded\.has\(`\$\{x\}:\$\{z\}`\)/);
  assert.match(runtimeSource, /nearestGuaranteedRenderFrontierMeters/);
  assert.match(runtimeSource, /level0FogForSettings\(settings, state\.blackoutStrength, guaranteedFrontier\)/);
  assert.doesNotMatch(runtimeSource, /loadCell\(|unloadCell\(|setRendererParticipatingCells\(/);
});
