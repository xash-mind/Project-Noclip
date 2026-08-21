import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rules = await import('../.test-dist/src/renderer/ordinaryWallpaperRules.js');
const {
  ORDINARY_CASING_RUN_CHANCE,
  ORDINARY_OUTLET_WALL_CHANCE,
  ORDINARY_WALLPAPER_B_PATCH_CHANCE,
  ORDINARY_WALLPAPER_IMAGE_TILE_METERS,
  ORDINARY_WALLPAPER_SPLIT_C_CHANCE,
  ordinaryCasingEnabled,
  ordinaryOutletFaceSign,
  ordinaryOutletPlacement,
  ordinaryWallpaperDecision
} = rules;

const sourceDefinitions = JSON.parse(await readFile(new URL('../assets/definitions/library.json', import.meta.url), 'utf8'));
const presentationSource = await readFile(new URL('../src/renderer/ordinaryWallpaperPresentation.ts', import.meta.url), 'utf8');
const assetSource = await readFile(new URL('../src/renderer/ordinaryWallpaperAssets.ts', import.meta.url), 'utf8');
const casingSource = await readFile(new URL('../src/renderer/ordinaryCasingMaterialPresentation.ts', import.meta.url), 'utf8');
const interactionSource = await readFile(new URL('../src/renderer/outletInteractionRuntime.ts', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
const version = (await readFile(new URL('../VERSION', import.meta.url), 'utf8')).trim();

function wall(id, cx = 0, cz = 0, orientation = 'z', sx = 6, sz = 6) {
  return {
    id,
    cx,
    cy: 1.6,
    cz,
    sx: orientation === 'z' ? sx : 0.28,
    sy: 3.2,
    sz: orientation === 'z' ? 0.28 : sz,
    orientation,
    drawable: true,
    materialId: 'level-0-wallpaper',
    materialVariant: 0
  };
}

test('wallpaper, casing and outlet decisions are deterministic from stable world inputs', () => {
  const target = wall('ordinary-wall');
  const first = {
    wallpaper: ordinaryWallpaperDecision('wallpaper-seed', 4, -3, target),
    casing: ordinaryCasingEnabled('wallpaper-seed', 4, -3, target),
    outlet: ordinaryOutletPlacement('wallpaper-seed', 4, -3, target)
  };
  for (let index = 0; index < 10; index += 1) {
    assert.deepEqual(ordinaryWallpaperDecision('wallpaper-seed', 4, -3, target), first.wallpaper);
    assert.equal(ordinaryCasingEnabled('wallpaper-seed', 4, -3, target), first.casing);
    assert.deepEqual(ordinaryOutletPlacement('wallpaper-seed', 4, -3, target), first.outlet);
  }
});

test('B is clustered, C is split-only, casing is common and outlets are materially rarer', () => {
  assert.equal(ORDINARY_WALLPAPER_IMAGE_TILE_METERS, 1.3);
  assert.equal(ORDINARY_WALLPAPER_B_PATCH_CHANCE, 0.08);
  assert.equal(ORDINARY_WALLPAPER_SPLIT_C_CHANCE, 0.015);
  assert.equal(ORDINARY_CASING_RUN_CHANCE, 0.35);
  assert.equal(ORDINARY_OUTLET_WALL_CHANCE, 0.065);

  let total = 0;
  let b = 0;
  let splitC = 0;
  let casing = 0;
  let outlets = 0;
  for (let cellX = -40; cellX <= 40; cellX += 1) {
    for (let cellZ = -40; cellZ <= 40; cellZ += 1) {
      const target = wall(`w:${cellX}:${cellZ}`, (cellX % 3) * 0.7, (cellZ % 5) * 0.35, (cellX + cellZ) % 2 === 0 ? 'z' : 'x');
      const decision = ordinaryWallpaperDecision('distribution-seed', cellX, cellZ, target);
      total += 1;
      if (decision.primary === 'B') b += 1;
      if (decision.splitWith === 'C') splitC += 1;
      assert.notEqual(decision.primary, 'C', 'Wallpaper C must never become the primary family');
      if (ordinaryCasingEnabled('distribution-seed', cellX, cellZ, target)) casing += 1;
      if (ordinaryOutletPlacement('distribution-seed', cellX, cellZ, target).enabled) outlets += 1;
    }
  }

  const bRate = b / total;
  const splitRate = splitC / total;
  const casingRate = casing / total;
  const outletRate = outlets / total;
  assert.ok(bRate > 0.03 && bRate < 0.14, `B occurrence drifted to ${(bRate * 100).toFixed(1)}%`);
  assert.ok(splitRate > 0.003 && splitRate < 0.035, `C split occurrence drifted to ${(splitRate * 100).toFixed(1)}%`);
  assert.ok(casingRate > 0.27 && casingRate < 0.43, `casing occurrence drifted to ${(casingRate * 100).toFixed(1)}%`);
  assert.ok(outletRate > 0.025 && outletRate < 0.11, `outlet occurrence drifted to ${(outletRate * 100).toFixed(1)}%`);
  assert.ok(outletRate < casingRate / 2, 'outlets should remain substantially rarer than casing');
});

test('outlet face ownership prefers a clear traversable side and rejects a wall blocked on both sides', () => {
  const target = wall('target', 0, 0, 'z');
  const plusBlocker = wall('plus-blocker', 0, 0.58, 'z');
  assert.equal(ordinaryOutletFaceSign([target, plusBlocker], target, 0.5, 1), -1);

  const minusBlocker = wall('minus-blocker', 0, -0.58, 'z');
  assert.equal(ordinaryOutletFaceSign([target, plusBlocker, minusBlocker], target, 0.5, 1), undefined);
  assert.equal(ordinaryOutletFaceSign([target], target, 0.5, -1), -1);
});

test('three uploaded-source wallpaper derivatives are registered through NAL', () => {
  assert.equal(sourceDefinitions.schema, 'nal-asset-definitions-v1');
  const ids = sourceDefinitions.assets.map((asset) => asset.id).sort();
  assert.deepEqual(ids, [
    'level0.wallpaper.a-chevron',
    'level0.wallpaper.b-dots',
    'level0.wallpaper.c-lines'
  ]);
  for (const asset of sourceDefinitions.assets) {
    assert.equal(asset.type, 'image');
    assert.equal(asset.role, 'wall-texture');
    assert.equal(asset.profile, 'Wall Texture');
    assert.equal(asset.image.wrap, 'repeat');
    assert.equal(asset.image.materialBinding, 'level-0-wallpaper');
    assert.match(asset.source, /^assets\/source\/images\/level0-wallpaper-[abc]-/);
  }
});

test('dev.9.2 removes the old wallpaper fallback and preloads real NAL bytes before streaming', () => {
  assert.equal(version, '0.3.0-dev.9.2');
  assert.doesNotMatch(presentationSource, /paintLevel0ChevronWallpaper|fallbackCanvas/);
  assert.match(presentationSource, /ordinaryWallpaperImage\(family\)/);
  assert.match(presentationSource, /diagnostic magenta fallback/);
  assert.match(assetSource, /fetch\(asset\.runtimePath/);
  assert.match(assetSource, /crypto\.subtle\.digest/);
  assert.match(assetSource, /content hash mismatch/);
  assert.match(assetSource, /await image\.decode\(\)/);
  assert.match(assetSource, /fallbackUsed/);
  assert.match(mainSource, /prepareOrdinaryWallpaperAssets\(\)\.then\(\(\) => game\.initialize\(\)\)/);
  assert.ok(
    mainSource.indexOf('installStaticWorldBatching();') < mainSource.indexOf('installOrdinaryWallpaperPresentation();'),
    'Ordinary wallpaper must own the final presentation boundary after static/Region wrapper installation'
  );
  assert.ok(
    mainSource.indexOf('installOrdinaryWallpaperPresentation();') < mainSource.indexOf('installOrdinaryCasingMaterialPresentation();'),
    'casing must decorate the final uploaded wallpaper material'
  );
});

test('casing remains material-backed and outlet uses the existing interaction path', () => {
  assert.match(casingSource, /ORDINARY_CASING_HEIGHT_METERS = 0\.09/);
  assert.match(casingSource, /ordinaryCasingEnabled/);
  assert.match(casingSource, /diffuseDetailMap/);
  assert.doesNotMatch(casingSource, /new pc\.Entity\(|addComponent\('render'/);
  assert.match(presentationSource, /ordinaryOutletFaceSign/);
  assert.match(presentationSource, /renderer\.interactions\.set\(id, boundary\)/);
  assert.match(interactionSource, /\[E\] Inspect outlet/);
  assert.match(interactionSource, /The outlet is inert\./);
  assert.match(mainSource, /installOutletInteractionRuntime\(\)/);
});
