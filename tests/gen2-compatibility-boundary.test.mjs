import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const { generationVersionFromPersisted, gen2ZoneForCell, isGen2Compatibility } = await import('../.test-dist/src/world/gen2Compatibility.js');
const { generateCell, generateLegacyCell } = await import('../.test-dist/src/world/generator.js');
const { migrateSave } = await import('../.test-dist/src/persistence/types.js');
const { DEFAULT_TUNING, addressId } = await import('../.test-dist/src/world/types.js');
const { EMPTY_EXPOSURE } = await import('../.test-dist/src/simulation/timeline.js');

const builderSource = await readFile(new URL('../src/renderer/cellBuilder.ts', import.meta.url), 'utf8');
const rendererSource = await readFile(new URL('../src/renderer/WorldRenderer.ts', import.meta.url), 'utf8');
const fixtureSource = await readFile(new URL('../src/renderer/fixtureLighting.ts', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');

test('frozen persisted Generation boundary preserves supported values', () => {
  assert.equal(generationVersionFromPersisted(undefined), 'gen2');
  assert.equal(generationVersionFromPersisted('gen2'), 'gen2');
  assert.equal(generationVersionFromPersisted('gen3-v1'), 'gen3-v1');
  assert.equal(generationVersionFromPersisted('future-unknown'), 'gen2');
  assert.equal(isGen2Compatibility('gen2'), true);
  assert.equal(isGen2Compatibility('gen3-v1'), false);
});

test('old-save migration and frozen Gen2 dispatch remain byte-equivalent contracts', () => {
  const common = { version: 1, characterId: 'wave5-c', seed: 'wave5-s', createdAt: 1, starterRolled: true, position: { x: 0, y: 1.65, z: 0, yaw: 0, pitch: 0 }, inventory: [], droppedItems: [], pickedLootNodeIds: [], marks: [], hydration: 0.5, exposure: EMPTY_EXPOSURE, shiftEpochs: {}, unloadCounts: {}, discoveredExits: [], settings: { sensitivity: 0.1, reducedMotion: false, reducedFlicker: false, masterVolume: 0.5 }, savedAt: 1 };
  const migrated = migrateSave(common);
  assert.equal(migrated?.generationVersion, 'gen2');
  const options = { seed: 'wave5-legacy', x: 2, z: -4, worldDay: 40, exposure: 10, shiftEpoch: 3, tuning: DEFAULT_TUNING, generationVersion: 'gen2' };
  const legacy = generateLegacyCell(options);
  assert.deepEqual(generateCell(options), legacy);
  assert.equal(gen2ZoneForCell(legacy), legacy.address.zoneId);
  assert.equal(addressId(legacy.address), `level-0:gen2:2:-4:${legacy.address.zoneId}:${legacy.address.districtId}:s3`);
});

test('Gen3 uses direct Feature, M-F1 and CV-H1 construction while frozen Gen2 keeps explicit renderer compatibility', () => {
  assert.match(builderSource, /if \(presentation\) return presentation/);
  assert.match(builderSource, /descriptor\.world\.generationVersion === 'gen3-v1'/);
  assert.match(builderSource, /mFluorescentFixtureIdentity/);
  assert.match(builderSource, /addCvh1FloorSurface/);
  assert.match(rendererSource, /descriptor\.world\.generationVersion === 'gen2'/);
  assert.match(rendererSource, /replaceLegacyFixtureMeshes/);
  assert.match(rendererSource, /replaceLegacyHoleFloor/);
  assert.doesNotMatch(rendererSource, /inheritedFloorMaterial/);
  assert.match(fixtureSource, /canonicalFixturePanels/);
  assert.match(fixtureSource, /reconcileFixturePanels/);
  assert.doesNotMatch(mainSource, /PauFeaturePresentationPilot|installPauFeaturePresentationPilot/);
});
