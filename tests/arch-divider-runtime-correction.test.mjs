import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const correctionSource = await readFile(new URL('../src/renderer/archDividerRuntimeCorrection.ts', import.meta.url), 'utf8');
const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');

test('A-A1 final renderer pass keeps structural fallback plain and collision aligned to visible floor blockers', () => {
  assert.ok(correctionSource.includes("type ArchStructuralRole = 'pier' | 'upper' | 'lower-panel'"));
  assert.ok(correctionSource.includes("if (role === 'upper' || role === 'pier' || role === 'lower-panel') return false"));
  assert.ok(correctionSource.includes("const ARCH_VISIBLE_COLLIDER_PREFIX = 'arch-visible-collider:'"));
  assert.ok(correctionSource.includes("const ARCH_PIER_LOWER_PREFIX = 'arch-frame:pier-lower:'"));
  assert.ok(correctionSource.includes("const ARCH_LOWER_PANEL_PREFIX = 'arch-frame:lower-panel:'"));
  assert.ok(correctionSource.includes('reconcileCollisionToVisibleArch'));
  assert.ok(correctionSource.includes('renderer.walls.set(collider.id, collider)'));
  assert.ok(correctionSource.includes('renderer.walls.delete(collider.id)'));
  assert.ok(correctionSource.includes('queueMicrotask'));
  assert.ok(correctionSource.includes('pier: makeMaterial([0.76, 0.735, 0.665])'));
  assert.ok(correctionSource.includes('upper: makeMaterial([0.955, 0.945, 0.885])'));
  assert.ok(correctionSource.includes('lowerPanel: makeMaterial([0.885, 0.872, 0.805])'));
  assert.equal(correctionSource.includes('wallpaperUvForWall'), false);
  assert.equal(correctionSource.includes('paintLevel0ChevronWallpaper'), false);

  const regionIndex = batchingSource.indexOf('installLevel0RegionPresentation()');
  const correctionIndex = batchingSource.indexOf('installArchDividerRuntimeCorrection()');
  const fixtureIndex = batchingSource.indexOf('installFixtureLighting()');
  assert.ok(regionIndex >= 0 && correctionIndex > regionIndex && fixtureIndex > correctionIndex);
});
