import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const runtimeSource = await readFile(new URL('../src/renderer/renderSettingsRuntime.ts', import.meta.url), 'utf8');

test('non-distance graphics changes never force a Cell rebuild', () => {
  const applyStart = runtimeSource.indexOf('export function applyRenderSettingsToGame');
  const diagnosticsStart = runtimeSource.indexOf('export function renderSettingsDiagnostics');
  assert.ok(applyStart >= 0 && diagnosticsStart > applyStart);
  const applySource = runtimeSource.slice(applyStart, diagnosticsStart);
  assert.match(applySource, /const renderDistanceChanged = state\.tuning\.activeRadius !== nextActiveRadius/);
  assert.match(applySource, /if \(renderDistanceChanged && state\.save && state\.renderer\) state\.updateStreaming\(false\)/);
  assert.equal(applySource.includes('state.updateStreaming(true)'), false);
});
