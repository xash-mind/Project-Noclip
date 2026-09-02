import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const materialSource = JSON.parse(readFileSync('src/presentation/definitions/level0-materials.json', 'utf8'));
const readOnlySource = readFileSync('src/presentation/readOnlyPresentationMetadata.ts', 'utf8');
const wallpaperAssetsSource = readFileSync('src/renderer/ordinaryWallpaperAssets.ts', 'utf8');
const wallpaperRulesSource = readFileSync('src/renderer/ordinaryWallpaperRules.ts', 'utf8');
const wallpaperPresentationSource = readFileSync('src/renderer/level0WallpaperPresentation.ts', 'utf8');
const surfaceSource = readFileSync('src/renderer/level0SurfacePresentation.ts', 'utf8');
const studioServerSource = readFileSync('tools/studio/server.mjs', 'utf8');
const studioClientSource = readFileSync('tools/studio/client/studio.js', 'utf8');

const { PROJECT_PRESENTATION_REGISTRY } = await import('../.test-dist/src/presentation/projectPresentationRegistry.js');
const { STUDIO_TARGETS } = await import('../.test-dist/src/presentation/studioTargets.js');
const {
  clearAllPresentationPreviews,
  presentationPreviewAssetSlots,
  resolvePreviewRepresentation,
  setPresentationPreviewAssetSlots,
  setPresentationPreviewParameters
} = await import('../.test-dist/src/presentation/previewOverrides.js');
const { semanticPresentationTargetId } = await import('../.test-dist/src/presentation/types.js');

function binding(targetId) {
  return materialSource.bindings.find((item) => item.semanticTargetId === targetId);
}
function definition(targetId) {
  const found = binding(targetId);
  return materialSource.representations.find((item) => item.id === found?.representationId);
}

test('Studio has an independent canonical material source with editable visual targets', () => {
  assert.equal(materialSource.schema, 'representation-source-v1');
  for (const targetId of [
    'material.level-0-wallpaper',
    'material.arch-pale-wallpaper',
    'material.level-0-carpet',
    'material.level-0-ceiling',
    'material.level-0-casing',
    'material.level-0-outlet',
    'material.fluorescent-panel',
    'carver.floor-hole-cluster'
  ]) {
    const item = definition(targetId);
    assert.ok(item, `${targetId} has a canonical material representation`);
    assert.ok((item.editableParameters?.length ?? 0) > 0 || (item.assetSlots?.some((slot) => slot.editable) ?? false));
    assert.equal(STUDIO_TARGETS.find((target) => target.semanticTargetId === targetId)?.structuredEditable, true);
  }
  assert.doesNotMatch(readOnlySource, /semanticTargetId: 'material\.level-0-wallpaper'/);
  assert.doesNotMatch(readOnlySource, /semanticTargetId: 'material\.level-0-carpet'/);
  assert.doesNotMatch(readOnlySource, /semanticTargetId: 'material\.fluorescent-panel'/);
});

test('M-W1 owns typed A/B/C Asset slots and canonical pattern scale instead of renderer hardcodes', () => {
  const mw1 = definition('material.level-0-wallpaper');
  assert.deepEqual(mw1.assetSlots.map((slot) => [slot.key, slot.profile, slot.assetType, slot.editable]), [
    ['familyA', 'Wall Texture', 'image', true],
    ['familyB', 'Wall Texture', 'image', true],
    ['familyC', 'Wall Texture', 'image', true]
  ]);
  for (const slot of mw1.assetSlots) assert.equal(typeof slot.assetId, 'string', `${slot.key} has a canonical Asset binding`);
  assert.equal(typeof mw1.parameters.patternSizeMeters, 'number');
  assert.ok(mw1.parameters.patternSizeMeters > 0);
  assert.doesNotMatch(wallpaperAssetsSource, /ORDINARY_WALLPAPER_ASSET_IDS/);
  assert.doesNotMatch(wallpaperRulesSource, /ORDINARY_WALLPAPER_IMAGE_TILE_METERS/);
  assert.match(wallpaperAssetsSource, /materialAssetId\('material\.level-0-wallpaper'/);
  assert.match(wallpaperRulesSource, /patternSizeMeters/);
});

test('Studio preview overrides support material parameters and first-class Asset slots without world mutation', () => {
  const target = semanticPresentationTargetId('material.level-0-wallpaper');
  clearAllPresentationPreviews();
  const before = resolvePreviewRepresentation(target);
  const baselineSaturation = before.definition.parameters.saturation;
  const baselinePatternSize = before.definition.parameters.patternSizeMeters;
  const baselineFamilyA = before.definition.assetSlots.find((slot) => slot.key === 'familyA').assetId;
  const replacementAsset = before.definition.assetSlots.map((slot) => slot.assetId).find((id) => id && id !== baselineFamilyA);
  assert.ok(replacementAsset, 'M-W1 exposes another compatible wallpaper Asset for preview testing');
  const previewSaturation = baselineSaturation === 0.72 ? 0.73 : 0.72;
  const previewPatternSize = baselinePatternSize === 1.8 ? 1.7 : 1.8;

  setPresentationPreviewParameters(target, { saturation: previewSaturation, patternSizeMeters: previewPatternSize });
  setPresentationPreviewAssetSlots(target, { familyA: replacementAsset });
  const preview = resolvePreviewRepresentation(target);
  assert.equal(preview.definition.parameters.saturation, previewSaturation);
  assert.equal(preview.definition.parameters.patternSizeMeters, previewPatternSize);
  assert.equal(preview.definition.assetSlots.find((slot) => slot.key === 'familyA').assetId, replacementAsset);
  assert.equal(presentationPreviewAssetSlots(target).familyA, replacementAsset);
  clearAllPresentationPreviews();
  assert.equal(resolvePreviewRepresentation(target).definition.parameters.saturation, baselineSaturation);
  assert.equal(resolvePreviewRepresentation(target).definition.parameters.patternSizeMeters, baselinePatternSize);
  assert.equal(resolvePreviewRepresentation(target).definition.assetSlots.find((slot) => slot.key === 'familyA').assetId, baselineFamilyA);
});

test('Ordinary sparse pillars and Pillar Field pillars share the exact M-W1 resolver', () => {
  assert.match(wallpaperPresentationSource, /function applyPillarWallpaper/);
  assert.doesNotMatch(wallpaperPresentationSource, /if \(descriptor\.world\.regionId !== 'pillar-field'\) return/);
  assert.match(wallpaperPresentationSource, /prop\.kind !== 'column' \|\| prop\.materialId !== 'level-0-wallpaper'/);
  assert.match(wallpaperPresentationSource, /ordinaryWallpaperDecision\(seed, descriptor\.address\.cellX, descriptor\.address\.cellZ, reference\)/);
  assert.match(wallpaperPresentationSource, /wallpaperMaterial\(cache, descriptor, reference, decision\.primary\)/);
  assert.doesNotMatch(surfaceSource, /setMaterial\(core, wallMaterial/);
});

test('A-A1 remains M-A1 while normal Arch walls remain M-W1', () => {
  assert.match(wallpaperPresentationSource, /archStructuralRole\(wall\)\) continue/);
  const ma1 = definition('material.arch-pale-wallpaper');
  assert.deepEqual(ma1.assetSlots, []);
  assert.ok(ma1.editableParameters.some((parameter) => parameter.key === 'upperColor'));
  assert.ok(PROJECT_PRESENTATION_REGISTRY.bindings.some((item) => item.semanticTargetId === 'material.arch-pale-wallpaper'));
});

test('Studio client exposes typed visual controls and Asset-slot preview/save flows', () => {
  assert.match(studioClientSource, /type=\"color\"/);
  assert.match(studioClientSource, /data-asset-slot/);
  assert.match(studioClientSource, /preview-assets/);
  assert.match(studioClientSource, /assetSlotPatch/);
  assert.match(studioClientSource, /Use for/);
  assert.match(studioServerSource, /structured-authoring\.mjs/);
  assert.match(studioServerSource, /saveStructuredSourceChange/);
});

test('physical world and lighting ownership are not moved into the material authoring source', () => {
  const serialized = JSON.stringify(materialSource);
  for (const forbidden of ['pillarChance', 'pillarDensity', 'shadowParticipation', 'omniIntensity', 'fixtureRange', 'holeSize', 'holePosition', 'movementSpeed', 'renderDistance']) {
    assert.equal(serialized.includes(forbidden), false, `${forbidden} must stay outside Studio material authoring`);
  }
});
