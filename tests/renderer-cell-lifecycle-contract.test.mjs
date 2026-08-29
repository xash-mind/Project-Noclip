import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const {
  RENDERER_CELL_LOAD_ORDER,
  RENDERER_CELL_UNLOAD_ORDER
} = await import('../.test-dist/src/renderer/rendererCellLifecycle.js');

const lifecycleSource = await readFile(new URL('../src/renderer/rendererCellLifecycle.ts', import.meta.url), 'utf8');
const rendererSource = await readFile(new URL('../src/renderer/WorldRenderer.ts', import.meta.url), 'utf8');
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

const lifecycleParticipants = [
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
  assert.ok(lifecycleSource.includes('realizeBaseCell();'));
  assert.ok(lifecycleSource.includes('applyLevel0SurfacePresentation(renderer, visual)'));
  assert.ok(lifecycleSource.includes('applyOrdinaryCasingMaterialPresentation(renderer, descriptor)'));
  assert.ok(lifecycleSource.includes('applyLevel0RegionPresentation(renderer, visual)'));
  assert.ok(lifecycleSource.includes('scheduleNearbyArchPresentation(renderer, descriptor)'));
  assert.ok(lifecycleSource.includes('applyWallJunctionPresentation(visual)'));
  assert.ok(lifecycleSource.includes('realizeNearbyArchCollision(renderer, descriptor)'));
  assert.ok(lifecycleSource.includes('syncAlreadyIndexedArchNeighbors(renderer, affectedArchCells, descriptor.id, alreadyLoaded)'));
  assert.ok(lifecycleSource.includes('attachFixtureLights(renderer, visual)'));
  assert.ok(lifecycleSource.includes('markStaticWorldBatchingDirty()'));
  assert.ok(lifecycleSource.includes('registerRuntimeCellState(renderer, descriptor)'));
  assert.ok(lifecycleSource.includes('applyFinalLevel0Materials(renderer, visual)'));
  assert.ok(lifecycleSource.includes('scheduleFinalLevel0MaterialsAfterArchReconstruction(renderer, descriptor)'));
  assert.match(rendererSource, /loadCell\(descriptor: CellDescriptor\)[^{]*\{\s*runRendererCellLoadLifecycle\(this, descriptor, \(\) => this\.realizeBaseCell\(descriptor\)\);\s*\}/);
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
  const unindex = lifecycleSource.indexOf('unregisterRuntimeCellState(renderer, cellId)');
  const fixture = lifecycleSource.indexOf('detachCellFixtures(renderer, cellId, descriptor)');
  const base = lifecycleSource.indexOf('destroyBaseCell();');
  const archPresentation = lifecycleSource.indexOf('scheduleNearbyArchPresentation(renderer, descriptor)', base);
  const collision = lifecycleSource.indexOf('realizeNearbyArchCollision(renderer, descriptor)', base);
  const refresh = lifecycleSource.indexOf('refreshRuntimeCellCollisionState(renderer, affectedCellId)', collision);
  assert.ok(unindex >= 0 && fixture > unindex && base > fixture && archPresentation > base && collision > archPresentation && refresh > collision);
  assert.match(rendererSource, /unloadCell\(cellId: string\)[^{]*\{\s*runRendererCellUnloadLifecycle\(this, cellId, \(\) => this\.destroyBaseCell\(cellId\)\);\s*\}/);
});

test('Cell lifecycle ownership is direct and no participant installs renderer prototype wrappers', () => {
  for (const source of [lifecycleSource, ...lifecycleParticipants]) {
    assert.equal(source.includes('WorldRenderer.prototype.loadCell ='), false);
    assert.equal(source.includes('WorldRenderer.prototype.unloadCell ='), false);
  }
  assert.equal(lifecycleSource.includes('installRendererCellLifecycle'), false);
  assert.equal(lifecycleSource.includes('let installed'), false);
  assert.match(rendererSource, /runRendererCellLoadLifecycle/);
  assert.match(rendererSource, /runRendererCellUnloadLifecycle/);
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
});

test('A-A1 collision is synchronous while visible Arch and final-material convergence retain explicit deferred stages', () => {
  assert.match(regionSource, /export function scheduleNearbyArchPresentation/);
  assert.match(finalMaterialSource, /export function scheduleFinalLevel0MaterialsAfterArchReconstruction/);
  assert.equal(collisionSource.includes('scheduleNearbyArchCollisionReconciliation'), false);
  assert.equal(collisionSource.includes('WorldRenderer.prototype'), false);
  const collision = lifecycleSource.indexOf('realizeNearbyArchCollision(renderer, descriptor)');
  const register = lifecycleSource.indexOf('registerRuntimeCellState(renderer, descriptor)');
  const finalSchedule = lifecycleSource.indexOf('scheduleFinalLevel0MaterialsAfterArchReconstruction(renderer, descriptor)');
  assert.ok(collision >= 0 && register > collision && finalSchedule > register);
});

test('application startup installs facilities only; renderer lifecycle is a direct dependency', () => {
  assert.equal(mainSource.includes('installRendererCellLifecycle'), false);
  for (const retiredInstaller of [
    'installLevel0SurfacePresentation',
    'installOrdinaryCasingMaterialPresentation',
    'installLevel0RegionPresentation',
    'installWallJunctionPresentation',
    'installArchDividerRuntimeCorrection',
    'installFinalLevel0MaterialPresentation'
  ]) assert.equal(mainSource.includes(retiredInstaller), false);
});
