import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const files = {
  app: await readFile(new URL('../src/app/ProjectNoclipGame.ts', import.meta.url), 'utf8'),
  main: await readFile(new URL('../src/main.ts', import.meta.url), 'utf8'),
  worldRenderer: await readFile(new URL('../src/renderer/WorldRenderer.ts', import.meta.url), 'utf8'),
  lifecycle: await readFile(new URL('../src/renderer/rendererCellLifecycle.ts', import.meta.url), 'utf8'),
  runtimePerformance: await readFile(new URL('../src/renderer/runtimePerformance.ts', import.meta.url), 'utf8'),
  renderSettingsRuntime: await readFile(new URL('../src/renderer/renderSettingsRuntime.ts', import.meta.url), 'utf8'),
  streamingScheduler: await readFile(new URL('../src/renderer/streamingScheduler.ts', import.meta.url), 'utf8'),
  visibilityRuntime: await readFile(new URL('../src/renderer/visibility/runtime.ts', import.meta.url), 'utf8'),
  outletRuntime: await readFile(new URL('../src/renderer/outletInteractionRuntime.ts', import.meta.url), 'utf8'),
  diagnostics: await readFile(new URL('../src/renderer/rendererRuntimeDiagnostics.ts', import.meta.url), 'utf8'),
  presentationPolicy: await readFile(new URL('../src/presentation/level0PresentationPolicy.ts', import.meta.url), 'utf8'),
  presentationMaterials: await readFile(new URL('../src/renderer/level0PresentationMaterials.ts', import.meta.url), 'utf8'),
  surface: await readFile(new URL('../src/renderer/level0SurfacePresentation.ts', import.meta.url), 'utf8'),
  region: await readFile(new URL('../src/renderer/level0RegionPresentation.ts', import.meta.url), 'utf8'),
  final: await readFile(new URL('../src/renderer/finalLevel0MaterialPresentation.ts', import.meta.url), 'utf8'),
  wallpaper: await readFile(new URL('../src/renderer/level0WallpaperPresentation.ts', import.meta.url), 'utf8'),
  fixture: await readFile(new URL('../src/renderer/fixtureLighting.ts', import.meta.url), 'utf8')
};

function matches(source, pattern) {
  return source.match(pattern) ?? [];
}

test('runtime architecture stays within the final structural metric contract', () => {
  const directReplacementPatterns = [
    /ProjectNoclipGame\.prototype\.setupEngine\s*=/g,
    /ProjectNoclipGame\.prototype\.updateStreaming\s*=/g,
    /ProjectNoclipGame\.prototype\.refreshLightField\s*=/g,
    /WorldRenderer\.prototype\.resolveMovement\s*=/g,
    /WorldRenderer\.prototype\.closestInteraction\s*=/g,
    /WorldRenderer\.prototype\.updateDynamicItems\s*=/g
  ];
  const directReplacements = directReplacementPatterns.reduce(
    (sum, pattern) => sum + Object.values(files).reduce((inner, source) => inner + matches(source, pattern).length, 0),
    0
  );
  assert.equal(directReplacements, 0);

  const retainedCallThroughWrappers = matches(files.diagnostics, /const originalSetupEngine = prototype\.setupEngine/g).length;
  assert.equal(retainedCallThroughWrappers, 1);
  assert.equal(matches(files.lifecycle, /WorldRenderer\.prototype\.(?:loadCell|unloadCell)/g).length, 0);
  assert.match(files.worldRenderer, /runRendererCellLoadLifecycle\(this, descriptor/);
  assert.match(files.worldRenderer, /runRendererCellUnloadLifecycle\(this, cellId/);

  const applicationRuntimeWrappers =
    matches(files.renderSettingsRuntime, /ProjectNoclipGame\.prototype/g).length
    + matches(files.streamingScheduler, /ProjectNoclipGame\.prototype/g).length
    + matches(files.visibilityRuntime, /ProjectNoclipGame\.prototype/g).length
    + matches(files.outletRuntime, /ProjectNoclipGame\.prototype/g).length;
  assert.equal(applicationRuntimeWrappers, 0);

  const runtimeIndexMutationWrappers = matches(files.runtimePerformance, /WorldRenderer\.prototype\.(?:loadCell|unloadCell|removeInteraction|addDroppedItem)\s*=/g).length;
  assert.equal(runtimeIndexMutationWrappers, 0);

  assert.equal(files.main.includes('installRendererCellLifecycle'), false);
  assert.equal(files.runtimePerformance.includes('baseResolveMovement'), false);
  assert.equal(files.runtimePerformance.includes('baseClosestInteraction'), false);
  assert.equal(files.runtimePerformance.includes('baseUpdateDynamicItems'), false);
});

test('targeted Level 0 semantic policy owners remain singular', () => {
  assert.equal(matches(files.presentationPolicy, /export function resolveLevel0CarpetPresentation/g).length, 1);
  assert.equal(matches(files.presentationPolicy, /export function resolveLevel0ArchFinishPresentation/g).length, 1);
  assert.equal(matches(files.presentationPolicy, /export function resolveCvh1DepthPresentation/g).length, 1);
  assert.equal(matches(files.presentationPolicy, /export function resolveMFluorescentPanelPresentation/g).length, 1);
  assert.equal(matches(files.wallpaper, /function resolveWallpaperMaterial/g).length <= 1, true);

  assert.equal(files.surface.includes('material.fluorescent-panel'), false);
  assert.equal(files.region.includes('material.fluorescent-panel'), false);
  assert.equal(files.final.includes('material.fluorescent-panel'), false);
  assert.equal(files.worldRenderer.includes('material.fluorescent-panel'), false);
  assert.equal(files.fixture.includes('material.fluorescent-panel'), false);

  assert.equal(files.final.includes('ARCH_PIER_TINT'), false);
  assert.equal(files.final.includes('CARPET_REPEAT_METERS'), false);
  assert.equal(files.final.includes('lightlessBlackMaterial'), false);
  assert.match(files.final, /applyLevel0CarpetMaterial/);
  assert.match(files.final, /level0ArchFinishRoleForEntity/);
  assert.match(files.final, /cvh1DepthMaterial/);
});
