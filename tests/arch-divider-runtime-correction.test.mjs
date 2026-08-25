import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const correctionSource = await readFile(new URL('../src/renderer/archDividerRuntimeCorrection.ts', import.meta.url), 'utf8');
const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');
const lifecycleSource = await readFile(new URL('../src/renderer/rendererCellLifecycle.ts', import.meta.url), 'utf8');

test('A-A1 final renderer pass keeps structural fallback presentation-owned and removes hidden lower-panel collision tails', () => {
  assert.ok(correctionSource.includes("type ArchStructuralRole = 'pier' | 'upper' | 'lower-panel'"));
  assert.ok(correctionSource.includes("if (role === 'upper' || role === 'lower-panel') return false"));
  assert.ok(correctionSource.includes("if (role === 'pier') return true"));
  assert.ok(correctionSource.includes("const ARCH_VISIBLE_LOWER_COLLIDER_PREFIX = 'arch-visible-lower-collider:'"));
  assert.ok(correctionSource.includes("const ARCH_LOWER_PANEL_PREFIX = 'arch-frame:lower-panel:'"));
  assert.ok(correctionSource.includes('reconcileVisibleLowerPanelCollision'));
  assert.ok(correctionSource.includes('renderer.walls.set(collider.id, collider)'));
  assert.ok(correctionSource.includes('renderer.walls.delete(collider.id)'));
  assert.ok(correctionSource.includes('queueMicrotask'));
  assert.ok(correctionSource.includes("const ARCH_TARGET = 'material.arch-pale-wallpaper'"));
  assert.ok(correctionSource.includes("materialColor(ARCH_TARGET, keyName, fallback)"));
  assert.ok(correctionSource.includes("materialNumber(ARCH_TARGET, 'gloss', 0.07)"));
  assert.ok(correctionSource.includes("role === 'pier' ? [0.76,0.735,0.665]"));
  assert.ok(correctionSource.includes("role === 'lower-panel' ? [0.885,0.872,0.805]"));
  assert.ok(correctionSource.includes('[0.955,0.945,0.885]'));
  assert.equal(correctionSource.includes('ARCH_PIER_LOWER_PREFIX'), false);
  assert.equal(correctionSource.includes('wallpaperUvForWall'), false);
  assert.equal(correctionSource.includes('paintLevel0ChevronWallpaper'), false);

  assert.ok(lifecycleSource.includes('applyArchDividerRuntimeCorrection(this, visual)'));
  assert.ok(lifecycleSource.includes('scheduleNearbyArchCollisionReconciliation(this, descriptor)'));
  assert.equal(correctionSource.includes('WorldRenderer.prototype.loadCell'), false);
  assert.equal(correctionSource.includes('WorldRenderer.prototype.unloadCell'), false);
  assert.equal(batchingSource.includes('installArchDividerRuntimeCorrection'), false);
});
