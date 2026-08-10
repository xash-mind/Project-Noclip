import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayerIntent } from '../.test-dist/src/input/PlayerIntent.js';
import { generateCell, isEssentialSceneryProp, validateCellConnectivity, validateCellPlacement } from '../.test-dist/src/world/generator.js';
import { DEFAULT_TUNING, PROP_KINDS, WALL_HEIGHT } from '../.test-dist/src/world/types.js';
import { chooseZone, districtId, isZoneUnlocked, manilaRoomCell, MANILA_MIN_MANHATTAN_DISTANCE } from '../.test-dist/src/world/zones.js';
import { exitsForCell, validateExitRegistry } from '../.test-dist/src/world/exits.js';
import { resolveCircleAgainstAabbs } from '../.test-dist/src/physics/collision.js';
import { migrateSave } from '../.test-dist/src/persistence/types.js';
import { EMPTY_EXPOSURE } from '../.test-dist/src/simulation/timeline.js';
import { ITEM_DEFINITIONS } from '../.test-dist/src/items/definitions.js';
import { rollStarterDefinitions } from '../.test-dist/src/items/starterRoll.js';
import { OBJECT_CATALOG, validateObjectCatalog } from '../.test-dist/src/renderer/objectCatalog.js';

const generate = (overrides = {}) => generateCell({ seed: 'test-seed', x: 4, z: 4, worldDay: 40, exposure: 10, shiftEpoch: 0, tuning: DEFAULT_TUNING, ...overrides });
const generateDayZeroOrigin = (seed) => generate({ seed, x: 0, z: 0, worldDay: 0, exposure: 0 });

test('fixed seed reproduces full room plan', () => assert.deepEqual(generate(), generate()));

test('keyboard and touch share one bounded player movement intent', () => {
  const input = new PlayerIntent(); input.keyDown('KeyW'); input.keyDown('ShiftLeft');
  assert.deepEqual(input.movement(), { forward: 1, strafe: 0, sprinting: true, crouching: false });
  input.keyUp('KeyW'); input.keyUp('ShiftLeft'); input.setTouchMovement(0.8, 0.6); input.setTouchSprint(true);
  assert.deepEqual(input.movement(), { forward: 0.8, strafe: 0.6, sprinting: true, crouching: false });
  input.setTouchMovement(2, 2); const bounded = input.movement(); assert.ok(Math.hypot(bounded.forward, bounded.strafe) <= 1.000001);
  input.keyDown('KeyC'); assert.equal(input.movement().sprinting, false); assert.equal(input.movement().crouching, true);
  input.keyUp('KeyC'); input.setTouchSprint(false); assert.equal(input.movement().sprinting, false); input.clearAll();
  assert.deepEqual(input.movement(), { forward: 0, strafe: 0, sprinting: false, crouching: false });
});

test('connector contracts remain symmetric', () => assert.deepEqual(validateCellConnectivity('symmetry', 24, DEFAULT_TUNING.extraOpeningChance), []));

test('district planner produces coherent macro zones', () => {
  const cells = []; for (let x = 10; x < 15; x += 1) for (let z = 10; z < 15; z += 1) cells.push(chooseZone('district', x, z, 40, 10, DEFAULT_TUNING));
  const counts = Object.values(cells.reduce((map, zone) => (map[zone] = (map[zone] ?? 0) + 1, map), {}));
  assert.ok(Math.max(...counts) >= 18); assert.equal(districtId(10, 10), districtId(14, 14));
});

test('timeline gates prevent advanced zones at day zero', () => {
  for (let x = -20; x <= 20; x += 1) for (let z = -20; z <= 20; z += 1) assert.equal(chooseZone('gate', x, z, 0, 0, DEFAULT_TUNING), 'baseline');
  assert.equal(isZoneUnlocked('blackout', 6, 4, false), false); assert.equal(isZoneUnlocked('blackout', 7, 1.6, false), true);
});

test('Manila Room is one delayed far room embedded in baseline rather than a zone', () => {
  const target = manilaRoomCell('test-seed'); assert.deepEqual(target, manilaRoomCell('test-seed'));
  assert.ok(Math.abs(target.cellX) + Math.abs(target.cellZ) >= MANILA_MIN_MANHATTAN_DISTANCE); assert.notDeepEqual(target, { cellX: 8, cellZ: -6 });
  const before = generate({ x: target.cellX, z: target.cellZ, worldDay: 0, exposure: 0 }); assert.notEqual(before.roomArchetype, 'manila-room');
  const room = generate({ x: target.cellX, z: target.cellZ, worldDay: 3, exposure: 1 }); assert.equal(room.address.zoneId, 'baseline'); assert.equal(room.roomArchetype, 'manila-room');
  assert.equal(room.props.filter((prop) => prop.kind === 'table').length, 1); assert.equal(room.props.filter((prop) => prop.kind === 'book').length, 1); assert.equal(room.notes.length, 1); assert.equal(room.exits.length, 0);
  assert.notEqual(generate({ x: 8, z: -6, worldDay: 3, exposure: 1 }).roomArchetype, 'manila-room');
});

test('Level 1 exit cannot be enabled before required days/exposure', () => {
  assert.equal(exitsForCell('x', 12, 0, 0, 0, false)[0]?.enabled, false); assert.equal(exitsForCell('x', 12, 0, 3, 0.79, false)[0]?.enabled, false); assert.equal(exitsForCell('x', 12, 0, 3, 0.8, false)[0]?.enabled, true); assert.deepEqual(validateExitRegistry(), []);
});

test('collision stops at wall and slides cleanly along it', () => {
  const wall = { minX: 1, maxX: 1.3, minZ: -2, maxZ: 2 }; const stopped = resolveCircleAgainstAabbs(0, 0, 2, 0, [wall], 0.3); assert.ok(stopped[0] < 0.701 && stopped[0] > 0.69);
  const slid = resolveCircleAgainstAabbs(0.69, 0, 2, 1.5, [wall], 0.3); assert.ok(slid[0] < 0.701); assert.ok(slid[1] > 1.45);
  const repeated = Array.from({ length: 20 }).reduce(([x, z]) => resolveCircleAgainstAabbs(x, z, x + 0.08, z + 0.08, [wall], 0.3), [0.69, 0]); assert.ok(Number.isFinite(repeated[0]) && Number.isFinite(repeated[1]));
});

test('v1 save migrates without deleting the journey', () => {
  const migrated = migrateSave({ version: 1, characterId: 'c', seed: 's', createdAt: 1, starterRolled: true, position: { x: 0, y: 1.65, z: 0, yaw: 0, pitch: 0 }, inventory: [], droppedItems: [], pickedLootNodeIds: [], marks: [], hydration: 0.5, exposure: EMPTY_EXPOSURE, shiftEpochs: {}, unloadCounts: {}, discoveredExits: [], settings: { sensitivity: 0.1, reducedMotion: false, reducedFlicker: false, masterVolume: 0.5 }, savedAt: 1 });
  assert.equal(migrated?.version, 2); assert.deepEqual(migrated?.readNoteIds, []); assert.deepEqual(migrated?.enteredZoneIds, []);
});

test('starter rolls are stable and bounded to two unique objects', () => {
  for (let index = 0; index < 500; index += 1) { const first = rollStarterDefinitions(`c:${index}`); assert.deepEqual(first, rollStarterDefinitions(`c:${index}`)); assert.ok(first.length <= 2); assert.equal(new Set(first).size, first.length); }
});

test('generation includes a broad archetype vocabulary after gates unlock', () => {
  const found = new Set(); for (let x = -30; x <= 30; x += 1) for (let z = -30; z <= 30; z += 1) found.add(generate({ x, z }).roomArchetype); assert.ok(found.size >= 12, `only ${found.size}: ${[...found].join(', ')}`);
});

test('modular composition materially exceeds the fixed archetype vocabulary within zones', () => {
  const signatures = new Set(); const byZone = new Map();
  for (let x = -30; x <= 30; x += 1) for (let z = -30; z <= 30; z += 1) {
    const cell = generate({ seed: 'composition-diversity', x, z, worldDay: 40, exposure: 10 }); signatures.add(cell.compositionSignature);
    const zoneSet = byZone.get(cell.address.zoneId) ?? new Set(); zoneSet.add(cell.compositionSignature); byZone.set(cell.address.zoneId, zoneSet);
    assert.deepEqual(cell.componentIds, generate({ seed: 'composition-diversity', x, z, worldDay: 40, exposure: 10 }).componentIds);
  }
  assert.ok(signatures.size >= 100, `only ${signatures.size} composition signatures`);
  for (const zone of ['baseline', 'arch', 'pillar', 'blackout', 'holes']) assert.ok((byZone.get(zone)?.size ?? 0) >= 8, `${zone} only had ${byZone.get(zone)?.size ?? 0} signatures`);
});

test('origin arrival remains clear for deterministic modular reproductions', () => {
  for (let index = 0; index < 100; index += 1) { const cell = generateDayZeroOrigin(`spawn-${index}`); assert.deepEqual(validateCellPlacement(cell), [], `${cell.address.worldSeed}: ${validateCellPlacement(cell).join(', ')}`); }
});

test('spawned loot is relocated out of solid geometry for deterministic reproductions', () => {
  let spawned = 0; for (let index = 0; index < 200; index += 1) { const cell = generateDayZeroOrigin(`lootbench-${index}`); if (cell.lootNodes.some((node) => node.spawnedDefinitionId)) spawned += 1; assert.deepEqual(validateCellPlacement(cell), []); } assert.ok(spawned > 0);
});

test('arrival and spawned-loot placement remain valid across deterministic sweeps', () => {
  const failures = []; for (let index = 0; index < 500; index += 1) { const cell = generateDayZeroOrigin(`arrival-sweep-${index}`); for (const error of validateCellPlacement(cell)) failures.push(`${cell.address.worldSeed}@${cell.id}: ${error}`); }
  for (let x = -15; x <= 15; x += 1) for (let z = -15; z <= 15; z += 1) { const cell = generate({ seed: 'placement-sweep', x, z, worldDay: 40, exposure: 10 }); for (const error of validateCellPlacement(cell)) failures.push(`${cell.address.worldSeed}@${cell.id}: ${error}`); }
  assert.deepEqual(failures.slice(0, 20), []);
});

test('ordinary scenery is sparse, deterministic and non-overlapping', () => {
  let ordinaryCells = 0; let emptyOrdinaryCells = 0; let optionalProps = 0; const failures = [];
  for (let x = -25; x <= 25; x += 1) for (let z = -25; z <= 25; z += 1) {
    const cell = generate({ seed: 'scenery-sweep', x, z, worldDay: 40, exposure: 10 }); if (cell.roomArchetype === 'manila-room' || cell.roomArchetype === 'transition-foyer') continue;
    const optional = cell.props.filter((prop) => !isEssentialSceneryProp(cell.roomArchetype, prop)); ordinaryCells += 1; optionalProps += optional.length; if (optional.length === 0) emptyOrdinaryCells += 1;
    assert.ok(optional.length <= 1, `${cell.id} retained ${optional.length} optional scenery props`); for (const error of validateCellPlacement(cell)) if (error.startsWith('Scenery ')) failures.push(`${cell.id}: ${error}`);
  }
  assert.deepEqual(failures.slice(0, 20), []); assert.ok(emptyOrdinaryCells / ordinaryCells >= 0.72, `only ${emptyOrdinaryCells}/${ordinaryCells} ordinary cells were scenery-empty`); assert.ok(optionalProps / ordinaryCells <= 0.28, `optional scenery remained too common: ${optionalProps}/${ordinaryCells}`);
  const browserSeed = generateDayZeroOrigin('threshold-001'); assert.ok(browserSeed.props.filter((prop) => !isEssentialSceneryProp(browserSeed.roomArchetype, prop)).length <= 1);
});

test('arch components keep visible ceiling clearance', () => {
  const cells = Array.from({ length: 80 }, (_, index) => generate({ seed: `arch-clearance-${index}`, x: 4, z: 4, worldDay: 40, exposure: 10, shiftEpoch: 0, tuning: { ...DEFAULT_TUNING, zoneOverride: 'arch', gateBypass: true } }));
  const archParts = cells.flatMap((cell) => cell.props.filter((prop) => prop.id.startsWith('arch-post-') || prop.id.startsWith('arch-beam-'))); assert.ok(archParts.length > 0); assert.ok(archParts.every((prop) => prop.position.y + prop.scale.y / 2 <= WALL_HEIGHT - 0.279));
});

test('ordinary floor variation no longer becomes carpet overlays while Hole Sections stay explicit', () => {
  const ordinary = generateDayZeroOrigin('threshold-001'); assert.deepEqual(ordinary.floorPatches, []);
  const holes = generate({ tuning: { ...DEFAULT_TUNING, zoneOverride: 'holes', gateBypass: true } }); assert.equal(holes.address.zoneId, 'holes'); assert.ok(holes.floorPatches.length >= 4); assert.ok(holes.floorPatches.every((entry) => entry.kind === 'hole'));
});

test('Hole Gallery wooden board is solid generated collision geometry', () => {
  let gallery; for (let index = 0; index < 100 && !gallery; index += 1) { const cell = generate({ seed: `hole-rail-${index}`, tuning: { ...DEFAULT_TUNING, zoneOverride: 'holes', gateBypass: true } }); if (cell.roomArchetype === 'hole-gallery') gallery = cell; }
  assert.ok(gallery); const rail = gallery.props.find((prop) => prop.id.startsWith('rail-')); assert.ok(rail); assert.equal(rail.solid, true); assert.equal(rail.kind, 'wall-panel');
});

test('ordinary notes rest on the carpet while the Manila ledger remains on its table', () => {
  const ordinary = generate({ seed: 'note-grounding', x: 1, z: 0, worldDay: 0, exposure: 0 }); assert.ok(ordinary.notes.length > 0); assert.ok(ordinary.notes.every((note) => note.localPosition.y < 0.08));
  const target = manilaRoomCell('test-seed'); const manila = generate({ x: target.cellX, z: target.cellZ, worldDay: 3, exposure: 1 }); assert.equal(manila.notes.length, 1); assert.ok(manila.notes[0].localPosition.y > 0.84);
});

test('forced Hole Sections use explicit hole patches instead of blackout floor patches', () => {
  const cell = generate({ tuning: { ...DEFAULT_TUNING, zoneOverride: 'holes', gateBypass: true } }); assert.equal(cell.address.zoneId, 'holes'); assert.ok(cell.floorPatches.length >= 4); assert.ok(cell.floorPatches.every((entry) => entry.kind === 'hole'));
});

test('World Lab object catalog covers every current item and prop kind exactly once', () => {
  assert.deepEqual(validateObjectCatalog(), []); const itemIds = OBJECT_CATALOG.flatMap((entry) => entry.itemDefinitionId ? [entry.itemDefinitionId] : []); const propKinds = OBJECT_CATALOG.flatMap((entry) => entry.propKind ? [entry.propKind] : []);
  assert.deepEqual(new Set(itemIds), new Set(Object.keys(ITEM_DEFINITIONS))); assert.deepEqual(new Set(propKinds), new Set(PROP_KINDS));
});
