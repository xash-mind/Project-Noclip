import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const settingsModule = await import('../.test-dist/src/renderer/renderSettings.js');
const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { CELL_SIZE, DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');
const fixtureSource = await readFile(new URL('../src/renderer/fixtureLighting.ts', import.meta.url), 'utf8');
const runtimeSource = await readFile(new URL('../src/renderer/renderSettingsRuntime.ts', import.meta.url), 'utf8');
const streamingSource = await readFile(new URL('../src/renderer/streamingScheduler.ts', import.meta.url), 'utf8');
const streamingPolicySource = await readFile(new URL('../src/renderer/streamingPolicy.ts', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');

const {
  BLACKOUT_AMBIENT_FLOOR,
  DEEP_BLACKOUT_FOG,
  DEFAULT_RENDER_SETTINGS,
  LEVEL0_AMBIENT,
  ORDINARY_LEVEL0_FOG,
  RENDER_DISTANCE_PROFILES,
  RENDER_PRESETS,
  RENDER_SETTINGS_STORAGE_KEY,
  level0AmbientForBlackout,
  level0FogForSettings,
  loadRenderSettings,
  renderDistanceProfile,
  sanitizeRenderSettings,
  setRenderSettings,
  settingsForPreset,
  withCustomRenderSettings
} = settingsModule;

test('render presets are one renderer with whole-Cell distance increments and retention hysteresis', () => {
  assert.deepEqual(
    ['low', 'medium', 'high', 'ultra'].map((level) => RENDER_DISTANCE_PROFILES[level].loadRadius),
    [1, 2, 3, 4]
  );
  for (const level of ['low', 'medium', 'high', 'ultra']) {
    const profile = RENDER_DISTANCE_PROFILES[level];
    assert.equal(profile.retentionRadius, profile.loadRadius + 1);
    assert.ok(profile.retentionRadius > profile.loadRadius);
    assert.equal(profile.approximateRenderDistanceMeters, profile.loadRadius * CELL_SIZE);
    assert.ok(profile.fogStart < profile.fogEnd);
    assert.ok(profile.fogEnd < profile.approximateRenderDistanceMeters, `${level} fog must hide the actual Cell boundary`);
  }
  assert.deepEqual(
    ['low', 'medium', 'high', 'ultra'].map((level) => RENDER_DISTANCE_PROFILES[level].typicalActiveCells),
    [9, 25, 49, 81]
  );
  assert.deepEqual(
    ['low', 'medium', 'high', 'ultra'].map((level) => RENDER_DISTANCE_PROFILES[level].worstCaseRetainedCells),
    [25, 49, 81, 121]
  );
});

test('High preserves the accepted current renderer envelope while Low and Ultra materially diverge', () => {
  assert.equal(DEFAULT_RENDER_SETTINGS.preset, 'high');
  assert.equal(RENDER_PRESETS.high.renderDistance, 'high');
  assert.equal(RENDER_PRESETS.high.shadowResolution, 512);
  assert.equal(RENDER_PRESETS.high.renderScale, 1);
  assert.equal(RENDER_PRESETS.low.renderScale, 0.67);
  assert.equal(RENDER_PRESETS.low.postProcessing, 'off');
  assert.equal(RENDER_PRESETS.ultra.shadowResolution, 1024);
  assert.ok(RENDER_DISTANCE_PROFILES.low.typicalActiveCells < RENDER_DISTANCE_PROFILES.ultra.typicalActiveCells / 5);
});

test('individual render changes become Custom and exact bundles resolve back to their preset', () => {
  const high = settingsForPreset('high');
  const custom = withCustomRenderSettings(high, { renderScale: 0.75 });
  assert.equal(custom.preset, 'custom');
  assert.equal(custom.renderDistance, 'high');
  assert.equal(custom.shadowQuality, 'high');
  assert.equal(withCustomRenderSettings(custom, { renderScale: 1 }).preset, 'high');
  assert.equal(sanitizeRenderSettings({ ...RENDER_PRESETS.low, preset: 'custom' }).preset, 'low');
});

test('render settings persist device-locally without entering save-world identity', () => {
  const memory = new Map();
  const storage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => { memory.set(key, value); }
  };
  const custom = withCustomRenderSettings(settingsForPreset('high'), { renderDistance: 'medium', renderScale: 0.75 });
  setRenderSettings(custom, storage);
  assert.ok(memory.has(RENDER_SETTINGS_STORAGE_KEY));
  assert.deepEqual(loadRenderSettings(storage), custom);
});

test('graphics settings never enter deterministic generation inputs or alter world identity', () => {
  const input = {
    seed: 'render-settings-world-identity',
    x: 3,
    z: -2,
    worldDay: 18,
    exposure: 4.2,
    shiftEpoch: 0,
    generationVersion: 'gen3-v1',
    tuning: { ...DEFAULT_TUNING }
  };
  const before = generateCell(input);
  setRenderSettings(settingsForPreset('low'), undefined);
  const low = generateCell(input);
  setRenderSettings(settingsForPreset('ultra'), undefined);
  const ultra = generateCell(input);
  assert.deepEqual(low, before);
  assert.deepEqual(ultra, before);
});

test('accepted Level 0 ambient endpoints and bounded fog distances remain deterministic', () => {
  assert.deepEqual(level0AmbientForBlackout(0), LEVEL0_AMBIENT);
  assert.deepEqual(level0AmbientForBlackout(1), BLACKOUT_AMBIENT_FLOOR);
  assert.deepEqual(LEVEL0_AMBIENT, { r: 0.20, g: 0.187, b: 0.107 });
  assert.deepEqual(BLACKOUT_AMBIENT_FLOOR, { r: 0.09, g: 0.084, b: 0.048 });
  assert.deepEqual(DEEP_BLACKOUT_FOG, { r: 0, g: 0, b: 0 });
  assert.ok(ORDINARY_LEVEL0_FOG.r > LEVEL0_AMBIENT.r * 0.78);
  assert.ok(ORDINARY_LEVEL0_FOG.g > LEVEL0_AMBIENT.g * 0.78);
  assert.ok(ORDINARY_LEVEL0_FOG.b < LEVEL0_AMBIENT.b * 0.78);
  const ends = ['low', 'medium', 'high', 'ultra'].map((preset) => {
    const settings = settingsForPreset(preset);
    const fog = level0FogForSettings(settings, 0);
    assert.equal(fog.end, renderDistanceProfile(settings).fogEnd);
    assert.deepEqual(fog.color, ORDINARY_LEVEL0_FOG);
    return fog.end;
  });
  assert.deepEqual([...ends].sort((a, b) => a - b), ends);
  const blackoutFog = level0FogForSettings(settingsForPreset('high'), 1);
  const ordinaryFog = level0FogForSettings(settingsForPreset('high'), 0);
  assert.deepEqual(blackoutFog.color, DEEP_BLACKOUT_FOG);
  assert.equal(blackoutFog.end, ordinaryFog.end);
});

test('M-F1 uses one canonical continuous flicker pulse and a one-to-one light/shadow pool', () => {
  assert.match(fixtureSource, /const FIXTURE_LIGHT_RANGE = 12\.0/);
  assert.match(fixtureSource, /const FIXTURE_LIGHT_INTENSITY_MULTIPLIER = 2\.0/);
  assert.match(fixtureSource, /const FIXTURE_SHADOW_BIAS = 0\.4/);
  assert.match(fixtureSource, /return lightFlickerValue\(group, elapsedSeconds, reducedFlicker\)/);
  assert.equal(fixtureSource.includes('FIXTURE_FLICKER_LIT_THRESHOLD'), false);
  assert.equal(fixtureSource.includes('MAX_ACTIVE_SHADOW'), false);
  assert.match(fixtureSource, /shadowCountPolicy: 'one-to-one-with-active-lights'/);
  assert.match(fixtureSource, /runtime\.selected && runtime\.light\.enabled.*light\?\.castShadows/);
});

test('render runtime owns modern PlayCanvas FogParams and keeps camera clear color coupled to fog', () => {
  assert.match(runtimeSource, /scene\.fog\.type = pc\.FOG_LINEAR/);
  assert.match(runtimeSource, /scene\.fog\.start = fog\.start/);
  assert.match(runtimeSource, /scene\.fog\.end = fog\.end/);
  assert.match(runtimeSource, /cameraComponent\.clearColor = new pc\.Color\(fog\.color\.r, fog\.color\.g, fog\.color\.b\)/);
  assert.match(runtimeSource, /frustumCulling: true/);
  assert.match(runtimeSource, /reconcileStreaming\(this, force, radiusOverride\)/);
  assert.match(streamingSource, /visual\.root\.enabled = false/);
  assert.match(streamingSource, /distance <= profile\.retentionRadius/);
  assert.match(streamingSource, /predictiveWarmCoordinates/);
  assert.match(streamingPolicySource, /unloadGraceMs: 1200/);
  assert.equal(runtimeSource.includes('scene.fogStart'), false);
  assert.equal(runtimeSource.includes('scene.fogEnd'), false);
  assert.equal(mainSource.includes('installPlayCanvasFogCompatibility'), false);
});
