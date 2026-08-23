import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createSafetyCoreCellIds,
  decideVisibilityParticipation,
  visibilityDiscontinuity,
  visibilityParticipationNeedsDistanceFallback
} from '../.test-dist/src/renderer/visibility/participation.js';
import {
  cellIsInsideActiveRenderScope,
  setRendererParticipatingCells,
  setRendererRenderScope
} from '../.test-dist/src/renderer/renderSettings.js';
import {
  latestPredictiveWarmCoordinates,
  predictiveWarmCoordinates
} from '../.test-dist/src/renderer/streamingPolicy.js';

const legacy = ['-1:-1', '-1:0', '-1:1', '0:-1', '0:0', '0:1', '1:-1', '1:0', '1:1', '2:0'];
const loaded = [...legacy, '3:0'];
const decision = (overrides = {}) => decideVisibilityParticipation({
  legacyDistanceCells: legacy,
  visibilityCells: ['0:0', '1:0'],
  safetyCoreCells: createSafetyCoreCellIds(0, 0, new Set(legacy)),
  predictiveCells: [],
  loadedCells: loaded,
  prior: new Map(),
  nowMs: 1000,
  fallbackToLegacyDistance: false,
  ...overrides
});

test('current Cell and immediate traversal safety core always participate', () => {
  const result = decision({ visibilityCells: [] });
  assert.equal(result.stateByCell['0:0'], 'SAFETY_CORE');
  assert.equal(result.finalParticipatingCells.includes('0:0'), true);
  assert.equal(result.finalParticipatingCells.includes('1:1'), true);
});

test('visibility drives participation beyond the safety core while closed legacy Cells can stop participating', () => {
  const result = decision({ visibilityCells: ['0:0', '2:0'] });
  assert.equal(result.stateByCell['2:0'], 'CAMERA_VISIBLE');
  assert.equal(result.stateByCell['3:0'], 'NON_PARTICIPATING');
  assert.ok(result.categories.legacyOnly.includes('1:-1'));
});

test('hysteresis retains a previously participating legacy Cell briefly and then expires', () => {
  const prior = new Map([['2:0', { state: 'CAMERA_VISIBLE', lastParticipatingAtMs: 1000 }]]);
  const retained = decision({ visibilityCells: [], safetyCoreCells: ['0:0'], prior, nowMs: 1300 });
  assert.equal(retained.stateByCell['2:0'], 'HYSTERESIS_RETAINED');
  const expired = decision({ visibilityCells: [], safetyCoreCells: ['0:0'], prior, nowMs: 1600 });
  assert.equal(expired.stateByCell['2:0'], 'NON_PARTICIPATING');
});

test('existing streaming predictor output can retain a loaded prewarmed Cell without a competing predictor', () => {
  const predicted = predictiveWarmCoordinates(0, 0, 2, 1, 0);
  assert.deepEqual(latestPredictiveWarmCoordinates(), predicted);
  const predictiveId = `${predicted[0].x}:${predicted[0].z}`;
  const result = decision({ predictiveCells: [predictiveId], loadedCells: [...loaded, predictiveId] });
  assert.equal(result.stateByCell[predictiveId], 'PREDICTIVE');
});

test('distance fallback fails open across the legacy envelope when snapshot confidence is unsafe', () => {
  const result = decision({ visibilityCells: [], safetyCoreCells: ['0:0'], fallbackToLegacyDistance: true });
  for (const id of legacy) assert.ok(result.finalParticipatingCells.includes(id), `${id} should fail open`);
  assert.ok(result.categories.distanceFallback.length > 0);
  assert.equal(visibilityParticipationNeedsDistanceFallback({ observerCellId: 'outside-scope', observerConservative: false, terminationReason: 'observer-outside-topology' }), true);
  assert.equal(visibilityParticipationNeedsDistanceFallback({ observerCellId: '0:0', observerConservative: false, terminationReason: 'frontier-exhausted' }), false);
});

test('missing visible/safety Cells are diagnosed rather than pretending residency was created', () => {
  const result = decision({ visibilityCells: ['0:0', '9:9'], safetyCoreCells: ['0:0'] });
  assert.deepEqual(result.missingRequiredCells, ['9:9']);
  assert.equal(result.finalParticipatingCells.includes('9:9'), false);
});

test('large displacement is an immediate visibility discontinuity while ordinary sprint motion is not', () => {
  assert.equal(visibilityDiscontinuity({ x: 0, z: 0 }, { x: 1000, z: -800 }), true);
  assert.equal(visibilityDiscontinuity({ x: 0, z: 0 }, { x: 1, z: 0.5 }), false);
});

test('fixture render-scope predicate keeps legacy distance as envelope and applies final visibility participation', () => {
  const renderer = {};
  setRendererRenderScope(renderer, { centerCellX: 0, centerCellZ: 0, loadRadius: 2, retentionRadius: 3 });
  setRendererParticipatingCells(renderer, new Set(['0:0']));
  const descriptor = (id, x, z) => ({ id, address: { cellX: x, cellZ: z } });
  assert.equal(cellIsInsideActiveRenderScope(renderer, descriptor('0:0', 0, 0)), true);
  assert.equal(cellIsInsideActiveRenderScope(renderer, descriptor('1:0', 1, 0)), false);
  assert.equal(cellIsInsideActiveRenderScope(renderer, descriptor('3:0', 3, 0)), false);
  setRendererParticipatingCells(renderer, undefined);
  assert.equal(cellIsInsideActiveRenderScope(renderer, descriptor('1:0', 1, 0)), true);
});

test('runtime activation stays renderer-participation-only and preserves PlayCanvas frustum authority', () => {
  const runtime = readFileSync('src/renderer/visibility/runtime.ts', 'utf8');
  const settingsRuntime = readFileSync('src/renderer/renderSettingsRuntime.ts', 'utf8');
  assert.match(runtime, /\{ position: nextObserver \}/);
  assert.doesNotMatch(runtime, /direction:\s*\{/);
  assert.doesNotMatch(runtime, /\.unloadCell\s*\(/);
  assert.doesNotMatch(runtime, /\.destroy\s*\(/);
  assert.doesNotMatch(runtime, /src\/items|src\/inventory|player-character/);
  assert.match(settingsRuntime, /frustumCulling:\s*true/);
});

test('Phase-1 activation is installed after streaming and localized batching without changing VERSION', () => {
  const main = readFileSync('src/main.ts', 'utf8');
  const version = readFileSync('VERSION', 'utf8').trim();
  assert.match(main, /installRenderSettingsRuntime\(\);[\s\S]*installStaticWorldBatching\(\);[\s\S]*installVisibilityParticipationRuntime\(\);/);
  assert.equal(version, '0.3.0-dev.9.5');
});
