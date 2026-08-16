import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayerIntent } from '../.test-dist/src/input/PlayerIntent.js';
import { generateCell, generateLegacyCell, validateCellConnectivity, validateCellPlacement } from '../.test-dist/src/world/generator.js';
import { DEFAULT_TUNING } from '../.test-dist/src/world/types.js';
import { manilaRoomCell } from '../.test-dist/src/world/structures.js';
import { exitsForCell, validateExitRegistry } from '../.test-dist/src/world/exits.js';
import { resolveCircleAgainstAabbs } from '../.test-dist/src/physics/collision.js';
import { migrateSave } from '../.test-dist/src/persistence/types.js';
import { EMPTY_EXPOSURE } from '../.test-dist/src/simulation/timeline.js';
import { ITEM_DEFINITIONS } from '../.test-dist/src/items/definitions.js';
import { rollStarterDefinitions } from '../.test-dist/src/items/starterRoll.js';
import { OBJECT_CATALOG, validateObjectCatalog } from '../.test-dist/src/renderer/objectCatalog.js';
import { WORLD_CATALOG, WORLD_VOCABULARY_CATEGORIES } from '../.test-dist/src/world/catalog.js';

const generate = (overrides = {}) => generateCell({
  seed: 'test-seed', x: 4, z: 4, worldDay: 40, exposure: 10, shiftEpoch: 0,
  tuning: DEFAULT_TUNING, generationVersion: 'gen3-v1', ...overrides
});

test('Generation 3 reproduces exactly and treats Cells only as streaming addresses', () => {
  const first = generate();
  assert.deepEqual(first, generate());
  assert.equal(first.address.generationVersion, 'gen3-v1');
  assert.equal(first.world.generationVersion, 'gen3-v1');
  assert.equal(first.world.geometry, 'euclidean');
  assert.deepEqual(first.openings, { north: true, east: true, south: true, west: true });
  assert.ok(first.address.districtId.startsWith('gen3:'));
});

test('frozen Generation 2 remains deterministic for old saves', () => {
  const options = { seed: 'legacy-save', x: 7, z: -3, worldDay: 40, exposure: 10, shiftEpoch: 2, tuning: DEFAULT_TUNING, generationVersion: 'gen2' };
  const dispatched = generateCell(options);
  assert.deepEqual(dispatched, generateLegacyCell(options));
  assert.equal(dispatched.address.generationVersion, 'gen2');
  assert.deepEqual(validateCellConnectivity('legacy-save', 24, DEFAULT_TUNING.extraOpeningChance), []);
});

test('keyboard and touch share one bounded player movement intent', () => {
  const input = new PlayerIntent(); input.keyDown('KeyW'); input.keyDown('ShiftLeft');
  assert.deepEqual(input.movement(), { forward: 1, strafe: 0, sprinting: true, crouching: false });
  input.keyUp('KeyW'); input.keyUp('ShiftLeft'); input.setTouchMovement(0.8, 0.6); input.setTouchSprint(true);
  assert.deepEqual(input.movement(), { forward: 0.8, strafe: 0.6, sprinting: true, crouching: false });
  input.setTouchMovement(2, 2); assert.ok(Math.hypot(input.movement().forward, input.movement().strafe) <= 1.000001);
  input.keyDown('KeyC'); assert.equal(input.movement().sprinting, false); assert.equal(input.movement().crouching, true);
});

test('timeline gates keep advanced Regions and Conditions out of day-zero Generation 3', () => {
  for (let x = -180; x <= 180; x += 12) for (let z = -180; z <= 180; z += 12) {
    const cell = generate({ seed: 'gen3-gates', x, z, worldDay: 0, exposure: 0 });
    assert.equal(cell.world.regionId, 'ordinary-level-0');
    assert.equal(cell.world.conditionIds.includes('blackout'), false);
    assert.equal(cell.world.carverIds.includes('floor-hole-cluster'), false);
  }
});

test('Manila is one delayed deterministic Structure and never a Region override', () => {
  const target = manilaRoomCell('test-seed');
  const before = generate({ x: target.cellX, z: target.cellZ, worldDay: 0, exposure: 0 });
  assert.equal(before.world.structureIds.includes('manila-room'), false);
  const room = generate({ x: target.cellX, z: target.cellZ, worldDay: 3, exposure: 1 });
  assert.equal(room.world.structureIds.includes('manila-room'), true);
  assert.notEqual(room.world.regionId, 'manila');
  assert.equal(room.address.zoneId === 'manila', false);
  assert.equal(room.props.filter((prop) => prop.kind === 'table').length, 1);
  assert.equal(room.props.filter((prop) => prop.kind === 'book').length, 1);
  assert.equal(room.notes.length, 1);
  const forcedOrigin = generate({ x: 0, z: 0, tuning: { ...DEFAULT_TUNING, structureOverride: 'manila-room' } });
  const forcedNeighbor = generate({ x: 1, z: 0, tuning: { ...DEFAULT_TUNING, structureOverride: 'manila-room' } });
  assert.deepEqual(forcedOrigin.world.structureIds, ['manila-room']);
  assert.equal(forcedNeighbor.world.structureIds.includes('manila-room'), false);
});

test('exit architecture is a Structure plus Transition, not Threshold geography', () => {
  assert.equal(exitsForCell('x', 12, 0, 3, 0.79, false)[0]?.enabled, false);
  assert.equal(exitsForCell('x', 12, 0, 3, 0.8, false)[0]?.enabled, true);
  assert.deepEqual(validateExitRegistry(), []);
  const cell = generate({ seed: 'x', x: 12, z: 0, worldDay: 3, exposure: 0.8 });
  assert.equal(cell.world.structureIds.includes('exit-structure'), true);
  assert.ok(cell.world.transitionIds.length > 0);
  assert.notEqual(cell.address.zoneId, 'exit-threshold');
});

test('collision stops at a wall and slides cleanly along it', () => {
  const wall = { minX: 1, maxX: 1.3, minZ: -2, maxZ: 2 };
  const stopped = resolveCircleAgainstAabbs(0, 0, 2, 0, [wall], 0.3); assert.ok(stopped[0] < 0.701 && stopped[0] > 0.69);
  const slid = resolveCircleAgainstAabbs(0.69, 0, 2, 1.5, [wall], 0.3); assert.ok(slid[0] < 0.701); assert.ok(slid[1] > 1.45);
});

test('old saves freeze to Gen2 while explicit Generation 3 saves remain Gen3', () => {
  const common = { version: 1, characterId: 'c', seed: 's', createdAt: 1, starterRolled: true, position: { x: 0, y: 1.65, z: 0, yaw: 0, pitch: 0 }, inventory: [], droppedItems: [], pickedLootNodeIds: [], marks: [], hydration: 0.5, exposure: EMPTY_EXPOSURE, shiftEpochs: {}, unloadCounts: {}, discoveredExits: [], settings: { sensitivity: 0.1, reducedMotion: false, reducedFlicker: false, masterVolume: 0.5 }, savedAt: 1 };
  const old = migrateSave(common);
  assert.equal(old?.version, 2); assert.equal(old?.generationVersion, 'gen2'); assert.deepEqual(old?.enteredRegionIds, []);
  const modern = migrateSave({ ...common, version: 2, generationVersion: 'gen3-v1', readNoteIds: [], enteredZoneIds: [], enteredRegionIds: ['ordinary-level-0'] });
  assert.equal(modern?.generationVersion, 'gen3-v1'); assert.deepEqual(modern?.enteredRegionIds, ['ordinary-level-0']);
});

test('starter rolls remain stable and bounded to two unique Items', () => {
  for (let index = 0; index < 500; index += 1) {
    const first = rollStarterDefinitions(`c:${index}`); assert.deepEqual(first, rollStarterDefinitions(`c:${index}`));
    assert.ok(first.length <= 2); assert.equal(new Set(first).size, first.length);
  }
});

test('ordinary Generation 3 has no alcoves, dividers, or Arch motifs', () => {
  let columns = 0; let holes = 0;
  for (let x = -35; x <= 35; x += 1) for (let z = -35; z <= 35; z += 1) {
    const cell = generate({ seed: 'ordinary-cleanup', x, z, tuning: { ...DEFAULT_TUNING, regionOverride: 'ordinary-level-0', conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none' } });
    if (cell.world.structureIds.length > 0) continue;
    assert.deepEqual(cell.componentIds, []);
    assert.equal(cell.props.some((prop) => prop.kind === 'divider' || prop.kind === 'wall-panel'), false);
    assert.equal(cell.walls.some((wall) => wall.materialId === 'arch-pale-wallpaper'), false);
    assert.equal(cell.compositionSignature.includes('alcove'), false);
    columns += cell.props.filter((prop) => prop.kind === 'column').length;
    holes += cell.floorPatches.length;
  }
  assert.ok(columns > 0, 'ordinary Level 0 should retain occasional rectangular pillars');
  assert.equal(holes, 0);
});

test('Generation 3 placement is deterministic, clear at arrival, and bounded across a sweep', () => {
  const failures = [];
  for (let index = 0; index < 120; index += 1) {
    const cell = generate({ seed: `arrival-${index}`, x: 0, z: 0, worldDay: 0, exposure: 0 });
    for (const error of validateCellPlacement(cell)) failures.push(`${cell.address.worldSeed}: ${error}`);
  }
  for (let x = -20; x <= 20; x += 1) for (let z = -20; z <= 20; z += 1) {
    const cell = generate({ seed: 'placement-sweep', x, z });
    for (const error of validateCellPlacement(cell)) failures.push(`${cell.id}: ${error}`);
    assert.ok(cell.walls.length <= 28); assert.ok(cell.props.length <= 6);
  }
  assert.deepEqual(failures.slice(0, 20), []);
});

test('hole Carver produces discrete non-overlapping lattice pits with bypass lanes and no rail', () => {
  const cells = [];
  for (let x = -3; x <= 3; x += 1) for (let z = -3; z <= 3; z += 1) cells.push(generate({ x, z, tuning: { ...DEFAULT_TUNING, regionOverride: 'ordinary-level-0', carverOverride: 'floor-hole-cluster', structureOverride: 'none' } }));
  const patches = cells.flatMap((cell) => cell.floorPatches.map((patch) => ({ patch, worldX: cell.address.cellX * 14 + patch.position.x, worldZ: cell.address.cellZ * 14 + patch.position.z })));
  assert.ok(patches.length > 30);
  assert.ok(cells.some((cell) => cell.world.carverIds.includes('floor-hole-cluster')));
  assert.ok(cells.every((cell) => cell.address.zoneId !== 'holes'));
  assert.equal(cells.some((cell) => cell.props.some((prop) => prop.kind === 'wall-panel')), false);
  for (let left = 0; left < patches.length; left += 1) for (let right = left + 1; right < patches.length; right += 1) {
    const a = patches[left]; const b = patches[right];
    const separated = Math.abs(a.worldX - b.worldX) >= (a.patch.scale.x + b.patch.scale.x) / 2 || Math.abs(a.worldZ - b.worldZ) >= (a.patch.scale.z + b.patch.scale.z) / 2;
    assert.equal(separated, true, `overlap: ${a.patch.id} / ${b.patch.id}`);
  }
  const xBands = new Set(patches.map((entry) => entry.worldX.toFixed(2)));
  const zBands = new Set(patches.map((entry) => entry.worldZ.toFixed(2)));
  assert.ok(xBands.size > 6 && zBands.size > 6);
});

test('Blackout is a Condition with exactly zero local fixtures', () => {
  const cell = generate({ tuning: { ...DEFAULT_TUNING, regionOverride: 'ordinary-level-0', conditionOverride: 'blackout', structureOverride: 'none' } });
  assert.equal(cell.world.regionId, 'ordinary-level-0');
  assert.equal(cell.world.conditionIds.includes('blackout'), true);
  assert.equal(cell.world.blackoutStrength, 1);
  assert.deepEqual(cell.lightGroups, []);
  assert.equal(cell.lightFailure, true);
});

test('World Lab registries expose canonical categories and only spawn Items or implemented Features', () => {
  assert.deepEqual(validateObjectCatalog(), []);
  assert.deepEqual(new Set(OBJECT_CATALOG.flatMap((entry) => entry.itemDefinitionId ? [entry.itemDefinitionId] : [])), new Set(Object.keys(ITEM_DEFINITIONS)));
  assert.deepEqual(new Set(OBJECT_CATALOG.flatMap((entry) => entry.propKind ? [entry.propKind] : [])), new Set(['table', 'chair', 'cabinet', 'bucket', 'paint-can']));
  assert.deepEqual(WORLD_VOCABULARY_CATEGORIES, ['Levels', 'Regions', 'Variants', 'Geometry', 'Materials', 'Conditions', 'Features', 'Structures', 'Carvers', 'Anomalies', 'Entities', 'Items', 'Transitions']);
  assert.equal(WORLD_CATALOG.some((entry) => entry.id === 'threshold' || entry.label === 'Threshold'), false);
  assert.equal(WORLD_CATALOG.find((entry) => entry.id === 'manila-room')?.category, 'Structures');
  assert.equal(WORLD_CATALOG.find((entry) => entry.id === 'floor-hole-cluster')?.category, 'Carvers');
  assert.equal(WORLD_CATALOG.find((entry) => entry.id === 'blackout')?.category, 'Conditions');
});

test('Generation 3 Feature semantics exactly match retained Feature geometry', () => {
  const tuning = { ...DEFAULT_TUNING, structureOverride: 'none' };
  let featureCells = 0;
  for (let x = -24; x <= 24; x += 1) for (let z = -24; z <= 24; z += 1) {
    const cell = generate({ seed: 'feature-identity', x, z, tuning });
    const propIds = new Set(cell.props.map((prop) => prop.id));
    assert.ok(cell.world.featureIds.every((id) => propIds.has(id)), `${cell.id} advertises missing Feature geometry`);
    if (cell.world.featureIds.length > 0) featureCells += 1;
  }
  assert.ok(featureCells > 0, 'Feature sweep produced no retained sparse Features');
});
