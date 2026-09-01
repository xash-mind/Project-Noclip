import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const settingsModule = await import('../.test-dist/src/renderer/renderSettings.js');
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
  nearestGuaranteedRenderFrontierMeters,
  setRenderSettings,
  setTransientRenderSettings,
  settingsForPreset
} = settingsModule;

function loadedSquare(radius, missing = []) {
  const excluded = new Set(missing.map(([x, z]) => `${x}:${z}`));
  const loaded = new Set();
  for (let x = -radius; x <= radius; x += 1) {
    for (let z = -radius; z <= radius; z += 1) {
      const id = `${x}:${z}`;
      if (!excluded.has(id)) loaded.add(id);
    }
  }
  return loaded;
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
    const loaded = loadedSquare(radius, [[radius, 0]]);
    for (const playerX of [0, CELL_SIZE / 2 - 1, CELL_SIZE / 2 - 0.1]) {
      const frontier = nearestGuaranteedRenderFrontierMeters(
        settings,
        0,
        0,
        playerX,
        0,
        (cellX, cellZ) => loaded.has(`${cellX}:${cellZ}`)
      );
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
    const loaded = loadedSquare(radius);
    for (const [x, z] of [[0, 0], [6.5, 0], [-6.5, 6.5]]) {
      const frontier = nearestGuaranteedRenderFrontierMeters(
        settings,
        0,
        0,
        x,
        z,
        (cellX, cellZ) => loaded.has(`${cellX}:${cellZ}`)
      );
      assert.equal(frontier, undefined);
      assert.equal(level0FogForSettings(settings, 0, frontier).end, RENDER_DISTANCE_PROFILES[preset].fogEnd);
    }
  }
});

test('startup/partial residency safety is camera-aware without changing whole-Cell preset meaning', () => {
  const settings = settingsForPreset('ultra');
  const loaded = loadedSquare(2);
  const centerFrontier = nearestGuaranteedRenderFrontierMeters(settings, 0, 0, 0, 0, (x, z) => loaded.has(`${x}:${z}`));
  const boundaryFrontier = nearestGuaranteedRenderFrontierMeters(settings, 0, 0, 6.9, 0, (x, z) => loaded.has(`${x}:${z}`));
  assert.equal(centerFrontier, 35);
  assert.equal(boundaryFrontier, 28.1);
  assert.equal(RENDER_DISTANCE_PROFILES.ultra.loadRadius, 4);
  assert.ok(fogEndForGuaranteedFrontier(settings, centerFrontier) < centerFrontier);
  assert.ok(fogEndForGuaranteedFrontier(settings, boundaryFrontier) < boundaryFrontier);
});

test('Blackout keeps the same frontier clamp while atmosphere still reaches canonical deep black', () => {
  const settings = settingsForPreset('high');
  const frontier = 24;
  const ordinary = level0FogForSettings(settings, 0, frontier);
  const partial = level0FogForSettings(settings, 0.55, frontier);
  const blackout = level0FogForSettings(settings, 1, frontier);
  assert.equal(ordinary.end, partial.end);
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

test('runtime QA bridge remains available to accepted production-preview verification while privileged Studio stays DEV-only', () => {
  assert.match(mainSource, /^import \{ installRenderSettingsLab \} from '\.\/ui\/renderSettingsLab\.js';/m);
  assert.match(mainSource, /installRegionDepthLab\(game\);[\s\S]*installRenderSettingsLab\(game\);/);
  assert.match(mainSource, /if \(import\.meta\.env\.DEV\)[\s\S]*studioBridgeClient[\s\S]*worldLabStudioIntegration/);
  assert.match(labSource, /setTransientRenderSettings/);
  assert.match(labSource, /resetFixtureLightingQaOverrides/);
  assert.match(labSource, /reset-render-experiment/);
  assert.match(labSource, /reset-lighting-experiment/);
  assert.match(labSource, /Max active M-F1 Omnis/);
  assert.match(labSource, /Max shadow-casting M-F1 Omnis/);
  assert.doesNotMatch(labSource, /studioBridgeClient|ChangeReceipt|preview-parameters|Save-to-Project/);
  assert.doesNotMatch(labSource, /setRenderSettings|patchRenderSettings|applyRenderPreset/);
  assert.doesNotMatch(labSource, /persistence|SaveData|generationVersion/);
  assert.doesNotMatch(persistenceSource, /maxActiveLights|maxShadowCastingLights|renderScale|shadowResolution/);
});

test('Live Performance Test reuses one control panel and restores normal World Lab semantics on exit', () => {
  assert.match(labSource, /data-action="enter-live-performance"/);
  assert.match(labSource, /dataset\.ui = 'render-live-overlay'/);
  assert.match(labSource, /liveOverlay\.appendChild\(panel\)/);
  assert.match(labSource, /data-action="close-lab"/);
  assert.match(labSource, /panelAnchor\.parentNode\?\.insertBefore\(panel, panelAnchor\.nextSibling\)/);
  assert.match(labSource, /data-action="touch-lab"/);
  assert.match(labSource, /Digit1: 'low'.*Digit4: 'ultra'/s);
  assert.match(labSource, /KeyL:[\s\S]*KeyK:[\s\S]*KeyR:[\s\S]*KeyH:[\s\S]*KeyP:/);
  assert.doesNotMatch(labSource, /prototype|ProjectNoclipGame as unknown as|toggleLab\s*=|paused\s*=/);
});

test('frontier concealment reads streaming coverage without taking streaming or visibility ownership', () => {
  const frontierReader = runtimeSource.match(/function currentGuaranteedFrontier[\s\S]*?\n}\n\nfunction applyLevel0Atmosphere/)?.[0];
  assert.ok(frontierReader, 'missing canonical runtime frontier reader');
  assert.match(frontierReader, /nearestGuaranteedRenderFrontierMeters\([\s\S]*renderer\.loaded\.has\(`\$\{cellX\}:\$\{cellZ\}`\)/);
  assert.doesNotMatch(frontierReader, /\.loadCell\(|\.unloadCell\(|setRendererParticipatingCells\(/);
  assert.match(runtimeSource, /level0FogForSettings\(settings, state\.blackoutStrength, guaranteedFrontier\)/);
  assert.match(runtimeSource, /state\.updateStreaming\(false\)/);
});
