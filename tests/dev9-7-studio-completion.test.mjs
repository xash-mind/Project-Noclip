import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const materials = JSON.parse(readFileSync('src/presentation/definitions/level0-materials.json', 'utf8'));
const features = JSON.parse(readFileSync('src/presentation/definitions/level0-features.json', 'utf8'));
const studioHtml = readFileSync('tools/studio/client/index.html', 'utf8');
const studioClient = readFileSync('tools/studio/client/studio.js', 'utf8');
const studioServer = readFileSync('tools/studio/server.mjs', 'utf8');
const bridgeClient = readFileSync('src/dev/studioBridgeClient.ts', 'utf8');
const fixtureLighting = readFileSync('src/renderer/fixtureLighting.ts', 'utf8');
const surfacePresentation = readFileSync('src/renderer/level0SurfacePresentation.ts', 'utf8');
const finalPresentation = readFileSync('src/renderer/finalLevel0MaterialPresentation.ts', 'utf8');

const { STUDIO_TARGETS } = await import('../.test-dist/src/presentation/studioTargets.js');

function definitionFor(source, targetId) {
  const binding = source.bindings.find((item) => item.semanticTargetId === targetId);
  return source.representations.find((item) => item.id === binding?.representationId);
}

test('every structured Studio target maps to a rendered typed control surface', () => {
  const supportedKinds = new Set(['number', 'boolean', 'color', 'enum', 'text']);
  for (const source of [features, materials]) {
    for (const binding of source.bindings) {
      const definition = definitionFor(source, binding.semanticTargetId);
      const target = STUDIO_TARGETS.find((item) => item.semanticTargetId === binding.semanticTargetId);
      assert.ok(target, `${binding.semanticTargetId} is visible in Studio`);
      const hasAuthoring = (definition.editableParameters?.length ?? 0) > 0 || definition.assetSlots?.some((slot) => slot.editable);
      assert.equal(target.structuredEditable, hasAuthoring, `${binding.semanticTargetId} editability is truthful`);
      for (const meta of definition.editableParameters ?? []) assert.ok(supportedKinds.has(meta.kind), `${binding.semanticTargetId}.${meta.key} uses a supported widget kind`);
    }
  }
  assert.match(studioClient, /data-param-range/);
  assert.match(studioClient, /data-param-number/);
  assert.match(studioClient, /data-param-color-text/);
  assert.match(studioClient, /data-param-boolean/);
  assert.match(studioClient, /data-param-enum/);
  assert.match(studioClient, /data-asset-slot/);
});

test('Studio exposes human target organization, usage context, and explicit saved/preview/editor state', () => {
  const wallpaper = STUDIO_TARGETS.find((item) => item.semanticTargetId === 'material.level-0-wallpaper');
  const arch = STUDIO_TARGETS.find((item) => item.semanticTargetId === 'material.arch-pale-wallpaper');
  const blackout = STUDIO_TARGETS.find((item) => item.semanticTargetId === 'condition.blackout');
  assert.equal(wallpaper.group, 'Materials');
  assert.ok(wallpaper.whereUsed.includes('Ordinary sparse pillars'));
  assert.match(wallpaper.scopeNote, /A-A1/);
  assert.match(arch.scopeNote, /does not change normal Arch Room wallpaper/);
  assert.equal(blackout.structuredEditable, false);
  assert.match(blackout.readOnlyReason, /world and renderer law/);
  for (const label of ['Saved Project Value', 'Temporary Preview', 'Unsaved Editor Change', 'Where does it appear?', 'Current source', 'Basic', 'Advanced controls']) assert.ok(studioHtml.includes(label), `Studio shell contains ${label}`);
});

test('Asset Library navigation is informative and never stages a binding implicitly', () => {
  assert.match(studioClient, /function usedBindings\(asset\)/);
  assert.match(studioClient, /Compatible use targets/);
  assert.match(studioClient, /No binding was changed/);
  const useHandler = studioClient.slice(studioClient.indexOf("$$('[data-use-target]')"), studioClient.indexOf('function renderHistory'));
  assert.doesNotMatch(useHandler, /editorAssets\[/);
  assert.match(useHandler, /selectTarget\(button\.dataset\.useTarget/);
  assert.match(studioHtml, /id="asset-search"/);
  assert.match(studioClient, /datalist/);
});

test('preview API validates typed parameters and compatible Assets and blocks arbitrary Representation rebinding', () => {
  assert.match(studioServer, /validateParameterPreview/);
  assert.match(studioServer, /meta\.kind==='color'/);
  assert.match(studioServer, /validateAssetPreview/);
  assert.match(studioServer, /runtime-ready/);
  assert.match(studioServer, /does not permit arbitrary Representation rebinding/);
  assert.match(studioServer, /Save to Project does not accept arbitrary Representation rebinding/);
});

test('runtime preview refreshes already-loaded presentation cells rather than waiting for Region re-entry', () => {
  assert.match(bridgeClient, /const refresh=\(\):void=>access\.updateStreaming\(true\)/);
  for (const command of ['preview-parameters', 'preview-assets', 'clear-preview', 'clear-all-previews', 'refresh-presentation']) {
    assert.match(bridgeClient, new RegExp(`case'${command}'.*?refresh\\(\\)`, 's'), `${command} forces a loaded-cell presentation refresh`);
  }
  assert.match(surfacePresentation, /installLevel0SurfacePresentation/);
  assert.match(finalPresentation, /installFinalLevel0MaterialPresentation/);
});

test('M-F1 Studio values now own steady panel presentation without changing physical Omni law', () => {
  assert.match(fixtureLighting, /materialColor\(PANEL_TARGET, 'ordinaryDiffuse'/);
  assert.match(fixtureLighting, /materialColor\(PANEL_TARGET, 'archDiffuse'/);
  assert.match(fixtureLighting, /materialColor\(PANEL_TARGET, 'ordinaryEmissive'/);
  assert.match(fixtureLighting, /materialColor\(PANEL_TARGET, 'archEmissive'/);
  assert.match(fixtureLighting, /materialNumber\(PANEL_TARGET, 'visualEmissiveScale', 1\)/);
  assert.match(fixtureLighting, /const FIXTURE_LIGHT_RANGE = 12\.0/);
  assert.match(fixtureLighting, /const FIXTURE_LIGHT_INTENSITY_MULTIPLIER = 2\.0/);
  assert.match(fixtureLighting, /castShadows: true/);
  assert.match(fixtureLighting, /runtime\.group\.intensity \* pulse \* FIXTURE_LIGHT_INTENSITY_MULTIPLIER/);
  assert.match(STUDIO_TARGETS.find((item) => item.semanticTargetId === 'material.fluorescent-panel').scopeNote, /do not alter the physical Omni intensity, range, shadow participation, fixture allocation, or flicker law/);
});

test('M-W1 and M-A1 remain distinct authoring targets with no semantic ownership crossover', () => {
  const mw1 = definitionFor(materials, 'material.level-0-wallpaper');
  const ma1 = definitionFor(materials, 'material.arch-pale-wallpaper');
  assert.ok(mw1.assetSlots.some((slot) => slot.key === 'familyA'));
  assert.deepEqual(ma1.assetSlots, []);
  assert.ok(mw1.editableParameters.some((item) => item.key === 'archBrightness'));
  assert.ok(ma1.editableParameters.some((item) => item.key === 'pierColor'));
  assert.match(STUDIO_TARGETS.find((item) => item.semanticTargetId === 'material.level-0-wallpaper').scopeNote, /normal Arch Room wallpaper/i);
  assert.match(STUDIO_TARGETS.find((item) => item.semanticTargetId === 'material.arch-pale-wallpaper').scopeNote, /A-A1 structural finish/);
});
