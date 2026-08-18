import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const { archFramePresentationProfile } = await import('../.test-dist/src/renderer/level0RegionPresentation.js');
const smoothSource = await readFile(new URL('../src/renderer/archSmoothPresentationCorrection.ts', import.meta.url), 'utf8');
const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');

test('A-A1 keeps the accepted silhouette while restoring one smooth central mesh', () => {
  const profile = archFramePresentationProfile();
  assert.ok(Math.abs(profile.upperBottom - 1.92) < 1e-12);
  assert.ok(Math.abs(profile.upperTop - 2.96) < 1e-12);
  assert.ok(Math.abs(profile.ceilingReveal - 0.24) < 1e-12);
  assert.ok(Math.abs(profile.curveApex - 2.46) < 1e-12);
  assert.ok(profile.upperDepth > profile.pierDepth);

  assert.match(smoothSource, /const SMOOTH_CURVE_SEGMENTS = 48/);
  assert.match(smoothSource, /function smoothCurveMesh/);
  assert.match(smoothSource, /if \(cache\.mesh\) return cache\.mesh/);
  assert.match(smoothSource, /new pc\.Mesh\(/);
  assert.match(smoothSource, /new pc\.MeshInstance\(smoothCurveMesh\(renderer\), value\)/);
  assert.match(smoothSource, /child\.name\.startsWith\(BLOCK_CURVE_PREFIX\)/);
  assert.match(smoothSource, /child\.destroy\(\)/);
});

test('A-A1 shared shoulder joint is owned by the upper mass rather than a full-height pier', () => {
  assert.match(smoothSource, /const lowerHeight = profile\.upperBottom/);
  assert.match(smoothSource, /const upperHeight = WALL_HEIGHT - profile\.upperTop/);
  assert.match(smoothSource, /child\.setLocalScale\(scale\.x, lowerHeight, scale\.z\)/);
  assert.match(smoothSource, /UPPER_PIER_STUB_PREFIX/);
  assert.match(smoothSource, /stub\.setLocalScale\(scale\.x, upperHeight, scale\.z\)/);
});

test('smooth A-A1 correction runs after Region, collision and fixture presentation installation', () => {
  const regionIndex = batchingSource.indexOf('installLevel0RegionPresentation();');
  const collisionIndex = batchingSource.indexOf('installArchDividerRuntimeCorrection();');
  const fixtureIndex = batchingSource.indexOf('installFixtureLighting();');
  const smoothIndex = batchingSource.indexOf('installArchSmoothPresentationCorrection();');
  assert.ok(regionIndex >= 0);
  assert.ok(collisionIndex > regionIndex);
  assert.ok(fixtureIndex > collisionIndex);
  assert.ok(smoothIndex > fixtureIndex);
});
