import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const fixtureSource = await readFile(new URL('../src/renderer/fixtureLighting.ts', import.meta.url), 'utf8');
const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');
const diagnosticsSource = await readFile(new URL('../src/renderer/rendererRuntimeDiagnostics.ts', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');

test('fixture runtime preserves light/shadow semantics without static per-frame property rewrites', () => {
  const updateBody = fixtureSource.slice(fixtureSource.indexOf('function updateFixtureLighting('), fixtureSource.indexOf('export const FIXTURE_LIGHTING_PROFILE'));
  assert.equal(updateBody.includes('light.color = lightColor'), false);
  assert.equal(updateBody.includes('light.range = FIXTURE_LIGHT_RANGE'), false);
  assert.equal(updateBody.includes('light.castShadows = true'), false);
  assert.equal(updateBody.includes('light.shadowBias = FIXTURE_SHADOW_BIAS'), false);
  assert.match(updateBody, /const intensity = selected/);
  assert.match(updateBody, /light\.shadowUpdateMode = pc\.SHADOWUPDATE_THISFRAME/);
  assert.match(updateBody, /fixtureDiagnostics\.shadowUpdateRequests \+= 1/);
  assert.match(updateBody, /runtime\.mesh\.render\.material !== material/);
  assert.match(updateBody, /Math\.abs\(light\.intensity - intensity\) > 0\.000001/);
  assert.match(updateBody, /runtime\.light\.enabled !== enabled/);
  assert.match(updateBody, /fixtureDiagnostics\.maxUpdateMs/);
});

test('static batching exposes per-Cell allocation, removal and dirty-call evidence', () => {
  assert.match(batchingSource, /batchingDiagnostics\.allocations \+= 1/);
  assert.match(batchingSource, /batchingDiagnostics\.removals \+= 1/);
  assert.match(batchingSource, /batchingDiagnostics\.dirtyCalls \+= 1/);
  assert.match(batchingSource, /activeGroups/);
  assert.match(batchingSource, /if \(!dirty\)/);
  assert.match(batchingSource, /skippedCleanPasses/);
  assert.match(batchingSource, /WorldRenderer\.prototype\.loadCell/);
  assert.match(batchingSource, /WorldRenderer\.prototype\.unloadCell/);
  assert.match(batchingSource, /maxReconcileMs/);
});

test('renderer diagnostics observe context/device loss locally without taking restoration ownership', () => {
  assert.match(diagnosticsSource, /webglcontextlost/);
  assert.match(diagnosticsSource, /webglcontextrestored/);
  assert.match(diagnosticsSource, /device\.on\('devicelost'/);
  assert.match(diagnosticsSource, /device\.on\('devicerestored'/);
  assert.equal(diagnosticsSource.includes('device.restoreContext?.()'), false);
  assert.match(diagnosticsSource, /window\.sessionStorage\.setItem/);
  assert.match(diagnosticsSource, /rendererDiagnosticTest/);
  assert.match(mainSource, /installRendererRuntimeDiagnostics\(\)/);
});
