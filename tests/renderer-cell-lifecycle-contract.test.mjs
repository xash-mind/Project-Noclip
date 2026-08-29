import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const {
  RENDERER_CELL_LOAD_ORDER,
  RENDERER_CELL_UNLOAD_ORDER
} = await import('../.test-dist/src/renderer/rendererCellLifecycle.js');

const lifecycleSource = await readFile(new URL('../src/renderer/rendererCellLifecycle.ts', import.meta.url), 'utf8');
const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');
const surfaceSource = await readFile(new URL('../src/renderer/level0SurfacePresentation.ts', import.meta.url), 'utf8');
const casingSource = await readFile(new URL('../src/renderer/ordinaryCasingMaterialPresentation.ts', import.meta.url), 'utf8');
const regionSource = await readFile(new URL('../src/renderer/level0RegionPresentation.ts', import.meta.url), 'utf8');
const wallSource = await readFile(new URL('../src/renderer/wallJunctionPresentation.ts', import.meta.url), 'utf8');
const collisionSource = await readFile(new URL('../src/renderer/archDividerCollision.ts', import.meta.url), 'utf8');
const fixtureSource = await readFile(new URL('../src/renderer/fixtureLighting.ts', import.meta.url), 'utf8');
const finalMaterialSource = await readFile(new URL('../src/renderer/finalLevel0MaterialPresentation.ts', import.meta.url), 'utf8');
const runtimeSource = await readFile(new URL('../src/renderer/runtimePerformance.ts', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');

const retiredCellWrapperSources = [
  surfaceSource,
  casingSource,
  regionSource,
  wallSource,
  collisionSource,
  fixtureSource,
  finalMaterialSource,
  runtimeSource,
  batchingSource
];

test('one explicit renderer lifecycle owns the accepted synchronous Cell load order', () => {
  assert.deepEqual([...RENDERER_CELL_LOAD_ORDER], [
    'base-cell-realization',
    'level0-surface-presentation',
    'ordinary-casing-presentation',
    'level0-region-presentation',
    'schedule-nearby-arch-presentation',
    'wall-junction-presentation',
    'realize-canonical-arch-collision',
    'fixture-lighting-attach',
    'static-batching-dirty',
    'runtime-derived-state-register',
    'final-level0-materials',
    'schedule-final-material-convergence'
  ]);
  assert.ok(lifecycleSource.includes('baseLoadCell.call(this, descriptor)'));
  assert.ok(lifecycleSource.includes('applyLevel0SurfacePresentation(this, visual)'));
  assert.ok(lifecycleSource.includes('applyOrdinaryCasingMaterialPresentation(this, descriptor)'));
  assert.ok(lifecycleSource.includes('applyLevel0RegionPresentation(this, visual)'));
  assert.ok(lifecycleSource.includes('scheduleNearbyArchPresentation(this, descriptor)'));
  assert.ok(lifecycleSource.includes('applyWallJunctionPresentation(visual)'));
  assert.ok(lifecycleSource.includes('realizeNearbyArchCollision(this, descriptor)'));
  assert.ok(lifecycleSource.includes('syncAlreadyIndexedArchNeighbors(this, affectedArchCells, descriptor.id, alreadyLoaded)'));
  assert.ok(lifecycleSource.includes('attachFixtureLights(this, visual)'));
  assert.ok(lifecycleSource.includes('markStaticWorldBatchingDirty()'));
  assert.ok(lifecycleSource.includes('registerRuntimeCellState(this, descriptor)'));
  assert.ok(lifecycleSource.includes('applyFinalLevel0Materials(this, visual)'));
  assert.ok(lifecycleSource.includes('scheduleFinalLevel0MaterialsAfterArchReconstruction(this, descriptor)'));
});

test('one explicit renderer lifecycle owns unload cleanup and canonical neighbor collision refresh', () => {
  assert.deepEqual([...RENDERER_CELL_UNLOAD_ORDER], [
    'runtime-derived-state-unregister',
    'fixture-lighting-detach',
    'base-cell-destroy',
    'schedule-nearby-arch-presentation',
    'realize-neighbor-arch-collision',
    'static-batching-dirty'
  ]);
  const unindex = lifecycleSource.indexOf('unregisterRuntimeCellState(this, cellId)');
  const fixture = lifecycleSource.indexOf('detachCellFixtures(this, cellId, descriptor)');
  const base = lifecycleSource.indexOf('baseUnloadCell.call(this, cellId)');
  const archPresentation = lifecycleSource.indexOf('scheduleNearbyArchPresentation(this, descriptor)', base);
  const collision = lifecycleSource.indexOf('realizeNearbyArchCollision(this, descriptor)', base);
  const refresh = lifecycleSource.indexOf('refreshRuntimeCellCollisionState(this, affectedCellId)', collision);
  assert.ok(unindex >= 0 && fixture > unindex && base > fixture && archPresentation > base && collision > archPresentation && refresh > collision);
});

test('retired participants no longer stack WorldRenderer Cell prototype wrappers', () => {
  for (const source of retiredCellWrapperSources) {
    assert.equal(source.includes('WorldRenderer.prototype.loadCell ='), false);
    assert.equal(source.includes('WorldRenderer.prototype.unloadCell ='), false);
  }
  assert.equal((lifecycleSource.match(/WorldRenderer\.prototype\.loadCell =/g) ?? []).length, 1);
  assert.equal((lifecycleSource.match(/WorldRenderer\.prototype\.unloadCell =/g) ?? []).length, 1);
});

test('StaticWorldBatching owns batching only and is dirtied explicitly by the lifecycle', () => {
  for (const forbidden of [
    'installLevel0RegionPresentation',
    'installWallJunctionPresentation',
    'installArchDividerRuntimeCorrection',
    'installFixtureLighting',
    'WorldRenderer.prototype.loadCell',
    'WorldRenderer.prototype.unloadCell'
  ]) assert.equal(batchingSource.includes(forbidden), false, `batching retained unrelated lifecycle ownership: ${forbidden}`);
  assert.ok(batchingSource.includes('export function markStaticWorldBatchingDirty()'));
  assert.ok(batchingSource.includes('window.setInterval(reconcile, RECONCILE_INTERVAL_MS)'));
});

test('Wave 2 removes only A-A1 collision deferral while preserving visible Arch and final-material deferred boundaries', () => {
  assert.ok(regionSource.includes('queueMicrotask(() =>'));
  assert.equal(collisionSource.includes('queueMicrotask'), false);
  assert.ok(finalMaterialSource.includes('queueMicrotask(() => queueMicrotask(() =>'));
  assert.ok(lifecycleSource.includes('scheduleNearbyArchPresentation(this, descriptor)'));
  assert.equal(lifecycleSource.includes('scheduleNearbyArchCollisionReconciliation'), false);
  assert.ok(lifecycleSource.includes('scheduleFinalLevel0MaterialsAfterArchReconstruction(this, descriptor)'));
});

test('main composes facilities plus one Cell lifecycle owner rather than presentation installer order', () => {
  assert.ok(mainSource.includes('installRendererCellLifecycle();'));
  for (const retiredInstaller of [
    'installLevel0SurfacePresentation',
    'installOrdinaryCasingMaterialPresentation',
    'installLevel0RegionPresentation',
    'installWallJunctionPresentation',
    'installArchDividerRuntimeCorrection',
    'installFinalLevel0MaterialPresentation'
  ]) assert.equal(mainSource.includes(retiredInstaller), false);
});
