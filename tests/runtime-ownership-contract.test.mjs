import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const {
  registerRuntimeInteraction,
  retireRuntimeDynamicItem,
  runtimeDynamicItemCandidates,
  runtimeInteractionCandidates,
  runtimePerformanceDiagnosticsSnapshot,
  unregisterRuntimeInteraction
} = await import('../.test-dist/src/renderer/runtimePerformance.js');

const gameSource = await readFile(new URL('../src/app/ProjectNoclipGame.ts', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
const rendererSource = await readFile(new URL('../src/renderer/WorldRenderer.ts', import.meta.url), 'utf8');
const renderSettingsSource = await readFile(new URL('../src/renderer/renderSettingsRuntime.ts', import.meta.url), 'utf8');
const streamingSource = await readFile(new URL('../src/renderer/streamingScheduler.ts', import.meta.url), 'utf8');
const visibilitySource = await readFile(new URL('../src/renderer/visibility/runtime.ts', import.meta.url), 'utf8');
const performanceSource = await readFile(new URL('../src/renderer/runtimePerformance.ts', import.meta.url), 'utf8');
const outletSource = await readFile(new URL('../src/renderer/outletInteractionRuntime.ts', import.meta.url), 'utf8');
const lifecycleSource = await readFile(new URL('../src/renderer/rendererCellLifecycle.ts', import.meta.url), 'utf8');
const cellBuilderSource = await readFile(new URL('../src/renderer/cellBuilder.ts', import.meta.url), 'utf8');
const diagnosticsSource = await readFile(new URL('../src/renderer/rendererRuntimeDiagnostics.ts', import.meta.url), 'utf8');

function assignmentCount(source, pattern) {
  return (source.match(pattern) ?? []).length;
}

test('Wave 4 removes all six direct prototype replacements', () => {
  const applicationDirect = [
    /ProjectNoclipGame\.prototype\.setupEngine\s*=/g,
    /ProjectNoclipGame\.prototype\.updateStreaming\s*=/g,
    /ProjectNoclipGame\.prototype\.refreshLightField\s*=/g
  ].reduce((sum, pattern) => sum + assignmentCount(`${gameSource}\n${renderSettingsSource}\n${streamingSource}\n${visibilitySource}\n${mainSource}`, pattern), 0);
  const rendererDirect = [
    /WorldRenderer\.prototype\.resolveMovement\s*=/g,
    /WorldRenderer\.prototype\.closestInteraction\s*=/g,
    /WorldRenderer\.prototype\.updateDynamicItems\s*=/g
  ].reduce((sum, pattern) => sum + assignmentCount(`${rendererSource}\n${performanceSource}\n${mainSource}`, pattern), 0);
  assert.equal(applicationDirect + rendererDirect, 0);
});

test('ProjectNoclipGame explicitly orchestrates render setup, streaming frame lifecycle, visibility and outlet dispatch', () => {
  assert.match(gameSource, /setupRenderSettingsEngine\(this\)/);
  assert.match(gameSource, /beginStreamingFrame\(this\)/);
  assert.match(gameSource, /finishStreamingFrame\(this, dt\);\s*updateVisibilityParticipation\(this, false\);/);
  assert.match(gameSource, /reconcileStreaming\(this, force, radiusOverride\);\s*updateVisibilityParticipation\(this, true\);/);
  assert.match(gameSource, /isOutletInteraction\(this\.interaction\).*Inspect outlet/s);
  assert.match(gameSource, /isOutletInteraction\(this\.interaction\).*The outlet is inert\./s);
  assert.doesNotMatch(outletSource, /ProjectNoclipGame\.prototype|originalUpdateInteraction|originalInteract/);
});

test('render settings, streaming and visibility expose narrow operations without application prototype installation', () => {
  assert.match(renderSettingsSource, /export function initializeRenderSettingsRuntime/);
  assert.match(renderSettingsSource, /export function setupRenderSettingsEngine/);
  assert.match(renderSettingsSource, /export function refreshRenderSettingsLightField/);
  assert.doesNotMatch(renderSettingsSource, /ProjectNoclipGame\.prototype|prototype\.setupEngine|prototype\.updateStreaming|prototype\.refreshLightField/);

  assert.match(streamingSource, /export function beginStreamingFrame/);
  assert.match(streamingSource, /export function finishStreamingFrame/);
  assert.match(streamingSource, /export function reconcileStreaming/);
  assert.doesNotMatch(streamingSource, /prototype\.update\s*=|installStreamingScheduler/);

  assert.match(visibilitySource, /export function updateVisibilityParticipation/);
  assert.doesNotMatch(visibilitySource, /prototype\.update\s*=|prototype\.updateStreaming\s*=|installVisibilityParticipationRuntime/);
  assert.doesNotMatch(visibilitySource, /\.unloadCell\s*\(|\.destroy\s*\(/);
});

test('WorldRenderer owns collision, nearest interaction and dynamic ticking semantics while derived indexes only select candidates', () => {
  assert.match(rendererSource, /resolveMovement\([^)]*\)[^{]*\{[\s\S]*movementCollisionQueryBounds[\s\S]*runtimeCollisionCandidates[\s\S]*resolveCircleAgainstAabbs/);
  assert.match(rendererSource, /closestInteraction\([^)]*\)[^{]*\{[\s\S]*runtimeInteractionCandidates[\s\S]*Math\.hypot/);
  assert.match(rendererSource, /updateDynamicItems\([^)]*\)[^{]*\{[\s\S]*runtimeDynamicItemCandidates[\s\S]*600_000/);
  assert.match(rendererSource, /removeInteraction\([^)]*\)[^{]*\{\s*unregisterRuntimeInteraction\(this, id\)/);
  assert.match(rendererSource, /addDroppedItem\([^)]*\)[^{]*\{[\s\S]*registerRuntimeInteraction\(this, interaction\)/);
  assert.doesNotMatch(performanceSource, /WorldRenderer\.prototype/);
  assert.match(performanceSource, /const states = new WeakMap<WorldRenderer, RuntimeIndexState>\(\)/);
  assert.match(performanceSource, /Derived state is reconstructible from canonical renderer state/);
});

test('interaction index and dynamic ticking membership follow explicit canonical mutations without stale entries', () => {
  const renderer = { walls: new Map(), interactions: new Map(), loaded: new Map() };
  const ordinary = { id: 'ordinary', kind: 'note', x: 1, y: 0, z: 0 };
  const ticking = {
    id: 'glow',
    kind: 'item',
    x: 0.5,
    y: 0,
    z: 0.5,
    item: { definitionId: 'glow-stick' },
    activatedAt: 1000
  };
  const far = { id: 'far', kind: 'note', x: 40, y: 0, z: 40 };

  renderer.interactions.set(ordinary.id, ordinary);
  renderer.interactions.set(ticking.id, ticking);
  renderer.interactions.set(far.id, far);

  assert.deepEqual(runtimeInteractionCandidates(renderer, 0, 0, 2).map(({ id }) => id), ['ordinary', 'glow']);
  assert.deepEqual(runtimeDynamicItemCandidates(renderer).map(({ id }) => id), ['glow']);
  assert.equal(runtimePerformanceDiagnosticsSnapshot(renderer).indexedInteractions, 3);
  assert.equal(runtimePerformanceDiagnosticsSnapshot(renderer).tickingWorldItems, 1);

  registerRuntimeInteraction(renderer, ticking);
  assert.equal(runtimePerformanceDiagnosticsSnapshot(renderer).indexedInteractions, 3, 'duplicate registration must not duplicate index membership');
  assert.equal(runtimeDynamicItemCandidates(renderer).length, 1, 'duplicate registration must not duplicate ticking membership');

  retireRuntimeDynamicItem(renderer, ticking.id);
  assert.deepEqual(runtimeDynamicItemCandidates(renderer), []);
  assert.equal(runtimeInteractionCandidates(renderer, 0, 0, 2).some(({ id }) => id === ticking.id), true, 'expiry retires ticking only, not canonical interaction');

  unregisterRuntimeInteraction(renderer, ticking.id);
  assert.equal(runtimeInteractionCandidates(renderer, 0, 0, 2).some(({ id }) => id === ticking.id), false);
  assert.equal(runtimePerformanceDiagnosticsSnapshot(renderer).tickingWorldItems, 0);
});

test('main composition keeps out-of-scope owners while removing Wave 4 installer order', () => {
  assert.doesNotMatch(mainSource, /installRenderSettingsRuntime|installRuntimePerformance|installVisibilityParticipationRuntime|installOutletInteractionRuntime/);
  assert.match(mainSource, /installRendererCellLifecycle\(\)/);
  assert.doesNotMatch(mainSource, /installPauFeaturePresentationPilot/);
  assert.match(cellBuilderSource, /addLevel0PilotFeaturePresentation/);
  assert.match(cellBuilderSource, /if \(presentation\) return presentation/);
  assert.match(mainSource, /installRendererRuntimeDiagnostics\(\)/);
  assert.match(mainSource, /initializeRuntimePerformanceDiagnostics\(\)/);

  const lifecycleWrappers = assignmentCount(lifecycleSource, /WorldRenderer\.prototype\.(?:loadCell|unloadCell)\s*=/g);
  const diagnosticWrappers = assignmentCount(diagnosticsSource, /prototype\.[A-Za-z0-9_]+\s*=/g);
  assert.equal(lifecycleWrappers, 2, 'Wave 1 Cell lifecycle owner must remain intact');
  assert.equal(diagnosticWrappers, 1, 'renderer diagnostics stays isolated and out of Wave 4 scope');
  assert.equal(lifecycleWrappers + diagnosticWrappers, 3, 'Wave 5 removes the PAU bridge while preserving the three legitimate call-through wrappers');
});
