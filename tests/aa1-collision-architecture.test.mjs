import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const semanticSource = await readFile(new URL('../src/world/gen3ArchDividerSemantics.ts', import.meta.url), 'utf8');
const collisionSource = await readFile(new URL('../src/renderer/archDividerCollision.ts', import.meta.url), 'utf8');
const regionSource = await readFile(new URL('../src/renderer/level0RegionPresentation.ts', import.meta.url), 'utf8');
const surfaceSource = await readFile(new URL('../src/renderer/level0SurfacePresentation.ts', import.meta.url), 'utf8');
const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');
const lifecycleSource = await readFile(new URL('../src/renderer/rendererCellLifecycle.ts', import.meta.url), 'utf8');

test('A-A1 has one world-domain structural-role and collision-intent owner', () => {
  assert.ok(semanticSource.includes("export type ArchStructuralRole = 'pier' | 'upper' | 'lower-panel'"));
  assert.ok(semanticSource.includes('export function archStructuralRole(wall: WallSpec)'));
  assert.ok(semanticSource.includes('export function archSemanticWallOwnsFinalCollision(wall: WallSpec)'));
  assert.ok(semanticSource.includes("if (role === 'upper' || role === 'lower-panel') return false"));
  assert.ok(semanticSource.includes("if (role === 'pier') return true"));
  assert.equal(regionSource.includes('function isArchHeader'), false);
  assert.equal(regionSource.includes('function isArchLower'), false);
  assert.equal(regionSource.includes('function isArchPierSupport'), false);
  assert.ok(regionSource.includes("from '../world/gen3ArchDividerSemantics.js'"));
  assert.ok(surfaceSource.includes("from '../world/gen3ArchDividerSemantics.js'"));
});

test('A-A1 gameplay collision is descriptor-driven and never renderer-name-derived', () => {
  assert.ok(collisionSource.includes('archFrameBaysForDescriptors'));
  assert.ok(collisionSource.includes('archLowerPanelWorldVolumeForCell'));
  assert.ok(collisionSource.includes('renderer.walls.set(collider.id, collider)'));
  assert.ok(collisionSource.includes('renderer.walls.delete(collider.id)'));
  for (const forbidden of ['entity.name', 'getLocalPosition', 'getLocalScale', 'childrenOf(', 'render.enabled']) {
    assert.equal(collisionSource.includes(forbidden), false, `collision retained renderer dependency: ${forbidden}`);
  }
  assert.equal(collisionSource.includes('scheduleNearbyArchCollisionReconciliation'), false);
});

test('A-A1 canonical collision is composed synchronously before derived-index registration', () => {
  const collision = lifecycleSource.indexOf('realizeNearbyArchCollision(renderer, descriptor)');
  const register = lifecycleSource.indexOf('registerRuntimeCellState(renderer, descriptor)');
  assert.ok(collision >= 0 && register > collision);
  assert.ok(lifecycleSource.includes('refreshRuntimeCellCollisionState'));
  assert.equal(lifecycleSource.includes('scheduleNearbyArchCollisionReconciliation'), false);
  assert.equal(collisionSource.includes('WorldRenderer.prototype.loadCell'), false);
  assert.equal(collisionSource.includes('WorldRenderer.prototype.unloadCell'), false);
  assert.equal(batchingSource.includes('installArchDividerRuntimeCorrection'), false);
});
