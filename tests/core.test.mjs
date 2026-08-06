import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCell, validateCellConnectivity, validateCellPlacement } from '../.test-dist/src/world/generator.js';
import { DEFAULT_TUNING, PROP_KINDS } from '../.test-dist/src/world/types.js';
import { chooseZone, districtId, isZoneUnlocked } from '../.test-dist/src/world/zones.js';
import { exitsForCell, validateExitRegistry } from '../.test-dist/src/world/exits.js';
import { resolveCircleAgainstAabbs } from '../.test-dist/src/physics/collision.js';
import { migrateSave } from '../.test-dist/src/persistence/types.js';
import { EMPTY_EXPOSURE } from '../.test-dist/src/simulation/timeline.js';
import { ITEM_DEFINITIONS } from '../.test-dist/src/items/definitions.js';
import { rollStarterDefinitions } from '../.test-dist/src/items/starterRoll.js';
import { OBJECT_CATALOG, validateObjectCatalog } from '../.test-dist/src/renderer/objectCatalog.js';
import { lightFlickerValue } from '../.test-dist/src/world/lighting.js';
import { applyLookDelta } from '../.test-dist/src/input/look.js';

const generate = (overrides = {}) => generateCell({
  seed: 'test-seed',
  x: 4,
  z: 4,
  worldDay: 40,
  exposure: 10,
  shiftEpoch: 0,
  tuning: DEFAULT_TUNING,
  ...overrides
});

const generateDayZeroOrigin = (seed) => generate({ seed, x: 0, z: 0, worldDay: 0, exposure: 0 });

test('fixed seed reproduces full room plan', () => assert.deepEqual(generate(), generate()));

test('connector contracts remain symmetric', () => assert.deepEqual(validateCellConnectivity('symmetry', 24, DEFAULT_TUNING.extraOpeningChance), []));

test('district planner produces coherent macro zones', () => {
  const cells = [];
  for (let x = 10; x < 15; x += 1) for (let z = 10; z < 15; z += 1) cells.push(chooseZone('district', x, z, 40, 10, DEFAULT_TUNING));
  const counts = Object.values(cells.reduce((map, zone) => (map[zone] = (map[zone] ?? 0) + 1, map), {}));
  assert.ok(Math.max(...counts) >= 18);
  assert.equal(districtId(10, 10), districtId(14, 14));
});

test('timeline gates prevent advanced zones at day zero', () => {
  for (let x = -20; x <= 20; x += 1) for (let z = -20; z <= 20; z += 1) assert.equal(chooseZone('gate', x, z, 0, 0, DEFAULT_TUNING), 'baseline');
  assert.equal(isZoneUnlocked('blackout', 6, 4, false), false);
  assert.equal(isZoneUnlocked('blackout', 7, 1.6, false), true);
});

test('Manila Room is delayed, small, and contains one table/book ledger', () => {
  assert.notEqual(generate({ x: 8, z: -6, worldDay: 0, exposure: 0 }).address.zoneId, 'manila');
  const room = generate({ x: 8, z: -6, worldDay: 3, exposure: 1 });
  assert.equal(room.address.zoneId, 'manila');
  assert.equal(room.props.filter((prop) => prop.kind === 'table').length, 1);
  assert.equal(room.props.filter((prop) => prop.kind === 'book').length, 1);
  assert.equal(room.notes.length, 1);
  const internal = room.walls.filter((wall) => wall.id.startsWith('manila-'));
  assert.ok(internal.every((wall) => Math.max(wall.sx, wall.sz) <= 6.4));
});

test('Level 1 exit cannot be enabled before required days/exposure', () => {
  assert.equal(exitsForCell('x', 12, 0, 0, 0, false)[0]?.enabled, false);
  assert.equal(exitsForCell('x', 12, 0, 3, 0.79, false)[0]?.enabled, false);
  assert.equal(exitsForCell('x', 12, 0, 3, 0.8, false)[0]?.enabled, true);
  assert.deepEqual(validateExitRegistry(), []);
});

test('collision stops at wall and slides cleanly along it', () => {
  const wall = { minX: 1, maxX: 1.3, minZ: -2, maxZ: 2 };
  const stopped = resolveCircleAgainstAabbs(0, 0, 2, 0, [wall], 0.3);
  assert.ok(stopped[0] < 0.701 && stopped[0] > 0.69);
  const slid = resolveCircleAgainstAabbs(0.69, 0, 2, 1.5, [wall], 0.3);
  assert.ok(slid[0] < 0.701);
  assert.ok(slid[1] > 1.45);
  const repeated = Array.from({ length: 20 }).reduce(([x, z]) => resolveCircleAgainstAabbs(x, z, x + 0.08, z + 0.08, [wall], 0.3), [0.69, 0]);
  assert.ok(Number.isFinite(repeated[0]) && Number.isFinite(repeated[1]));
});

test('v1 save migrates without deleting the journey', () => {
  const migrated = migrateSave({
    version: 1,
    characterId: 'c',
    seed: 's',
    createdAt: 1,
    starterRolled: true,
    position: { x: 0, y: 1.65, z: 0, yaw: 0, pitch: 0 },
    inventory: [],
    droppedItems: [],
    pickedLootNodeIds: [],
    marks: [],
    hydration: 0.5,
    exposure: EMPTY_EXPOSURE,
    shiftEpochs: {},
    unloadCounts: {},
    discoveredExits: [],
    settings: { sensitivity: 0.1, reducedMotion: false, reducedFlicker: false, masterVolume: 0.5 },
    savedAt: 1
  });
  assert.equal(migrated?.version, 2);
  assert.deepEqual(migrated?.readNoteIds, []);
  assert.deepEqual(migrated?.enteredZoneIds, []);
});

test('starter rolls are stable and bounded to two unique objects', () => {
  for (let index = 0; index < 500; index += 1) {
    const first = rollStarterDefinitions(`c:${index}`);
    assert.deepEqual(first, rollStarterDefinitions(`c:${index}`));
    assert.ok(first.length <= 2);
    assert.equal(new Set(first).size, first.length);
  }
});

test('generation includes a broad archetype vocabulary after gates unlock', () => {
  const found = new Set();
  for (let x = -30; x <= 30; x += 1) for (let z = -30; z <= 30; z += 1) found.add(generate({ x, z }).roomArchetype);
  assert.ok(found.size >= 12, `only ${found.size}: ${[...found].join(', ')}`);
});

test('origin arrival remains clear for the known alcove-ring reproduction', () => {
  const cell = generateDayZeroOrigin('spawn-5');
  assert.equal(cell.roomArchetype, 'alcove-ring');
  assert.deepEqual(validateCellPlacement(cell), []);
});

test('spawned loot is relocated out of solid geometry for the known reproduction', () => {
  const cell = generateDayZeroOrigin('lootbench-656');
  assert.ok(cell.lootNodes.some((node) => node.spawnedDefinitionId), 'reproduction should retain spawned loot');
  assert.deepEqual(validateCellPlacement(cell), []);
});

test('arrival and spawned-loot placement remain valid across deterministic sweeps', () => {
  const failures = [];
  for (let index = 0; index < 500; index += 1) {
    const cell = generateDayZeroOrigin(`arrival-sweep-${index}`);
    for (const error of validateCellPlacement(cell)) failures.push(`${cell.address.worldSeed}@${cell.id}: ${error}`);
  }
  for (let x = -15; x <= 15; x += 1) {
    for (let z = -15; z <= 15; z += 1) {
      const cell = generate({ seed: 'placement-sweep', x, z, worldDay: 40, exposure: 10 });
      for (const error of validateCellPlacement(cell)) failures.push(`${cell.address.worldSeed}@${cell.id}: ${error}`);
    }
  }
  assert.deepEqual(failures.slice(0, 20), []);
});

test('ordinary notes rest on the carpet while the Manila ledger remains on its table', () => {
  const ordinary = generate({ seed: 'note-grounding', x: 1, z: 0, worldDay: 0, exposure: 0 });
  assert.ok(ordinary.notes.length > 0);
  assert.ok(ordinary.notes.every((note) => note.localPosition.y < 0.08));
  const manila = generate({ x: 8, z: -6, worldDay: 3, exposure: 1 });
  assert.equal(manila.notes.length, 1);
  assert.ok(manila.notes[0].localPosition.y > 0.84);
});

test('forced Hole Sections use explicit hole patches instead of blackout floor patches', () => {
  const cell = generate({ tuning: { ...DEFAULT_TUNING, zoneOverride: 'holes', gateBypass: true } });
  assert.equal(cell.address.zoneId, 'holes');
  assert.ok(cell.floorPatches.length >= 4);
  assert.ok(cell.floorPatches.every((patch) => patch.kind === 'hole'));
});

test('World Lab object catalog covers every current item and prop kind exactly once', () => {
  assert.deepEqual(validateObjectCatalog(), []);
  const itemIds = OBJECT_CATALOG.flatMap((entry) => entry.itemDefinitionId ? [entry.itemDefinitionId] : []);
  const propKinds = OBJECT_CATALOG.flatMap((entry) => entry.propKind ? [entry.propKind] : []);
  assert.deepEqual(new Set(itemIds), new Set(Object.keys(ITEM_DEFINITIONS)));
  assert.deepEqual(new Set(propKinds), new Set(PROP_KINDS));
});


test('mouse look remains independent from movement state', () => {
  const base = { yaw: 12, pitch: -4 };
  const delta = { x: 80, y: -30 };
  const walking = applyLookDelta(base, delta, 0.1);
  const sprinting = applyLookDelta(base, delta, 0.1);
  assert.deepEqual(walking, sprinting);
  assert.equal(walking.yaw, 4);
  assert.equal(walking.pitch, -1);
});

test('modular composition produces deterministic cross-archetype diversity and bounded extremes', () => {
  const signatures = new Set();
  const profiles = new Set();
  const components = new Set();
  for (let x = -35; x <= 35; x += 1) {
    for (let z = -35; z <= 35; z += 1) {
      const cell = generate({ seed: 'modular-diversity', x, z, worldDay: 40, exposure: 10 });
      signatures.add(cell.compositionSignature);
      profiles.add(cell.spatialProfile);
      cell.componentIds.forEach((component) => components.add(component));
      assert.deepEqual(cell, generate({ seed: 'modular-diversity', x, z, worldDay: 40, exposure: 10 }));
    }
  }
  assert.ok(signatures.size > 500, `only ${signatures.size} composition signatures`);
  assert.deepEqual(profiles, new Set(['standard', 'sparse-vista', 'thin-channel', 'pillar-expanse']));
  for (const required of ['arch-run', 'pillar-lattice', 'thin-corridor', 'desk-cluster', 'service-bank']) assert.ok(components.has(required), `missing ${required}`);
});

test('zone weighting favors pillars without excluding shared modules', () => {
  let pillarModules = 0;
  let totalPillarComponents = 0;
  let baselinePillars = 0;
  let totalBaselineComponents = 0;
  for (let index = 0; index < 500; index += 1) {
    const pillar = generate({ seed: `pillar-weight-${index}`, x: index % 31, z: Math.floor(index / 31), tuning: { ...DEFAULT_TUNING, zoneOverride: 'pillar', gateBypass: true } });
    pillarModules += pillar.componentIds.filter((id) => id === 'pillar-lattice').length;
    totalPillarComponents += pillar.componentIds.length;
    const baseline = generate({ seed: `baseline-weight-${index}`, x: index % 31, z: Math.floor(index / 31), tuning: { ...DEFAULT_TUNING, zoneOverride: 'baseline', gateBypass: true } });
    baselinePillars += baseline.componentIds.filter((id) => id === 'pillar-lattice').length;
    totalBaselineComponents += baseline.componentIds.length;
  }
  assert.ok(pillarModules / totalPillarComponents > baselinePillars / totalBaselineComponents * 2.5);
});

test('light groups are deterministic, mixed-state, flicker-safe, and clear of solid props', () => {
  const states = new Set();
  let flicker;
  for (let x = -18; x <= 18; x += 1) for (let z = -18; z <= 18; z += 1) {
    const cell = generate({ seed: 'light-field', x, z, worldDay: 40, exposure: 10 });
    cell.lightGroups.forEach((group) => {
      states.add(group.state);
      if (!flicker && group.state === 'flicker') flicker = group;
    });
    assert.deepEqual(validateCellPlacement(cell), []);
  }
  assert.deepEqual(states, new Set(['on', 'off', 'flicker']));
  assert.ok(flicker);
  assert.equal(lightFlickerValue(flicker, 12.5, false), lightFlickerValue(flicker, 12.5, false));
  assert.equal(lightFlickerValue(flicker, 12.5, true), 1);
});

test('arch components remain below the ceiling and use curved segments', () => {
  let found;
  for (let index = 0; index < 400 && !found; index += 1) {
    const cell = generate({ seed: `arch-shape-${index}`, x: index % 20, z: Math.floor(index / 20), tuning: { ...DEFAULT_TUNING, zoneOverride: 'arch', gateBypass: true } });
    if (cell.props.some((prop) => prop.kind === 'arch-segment')) found = cell;
  }
  assert.ok(found);
  const segments = found.props.filter((prop) => prop.kind === 'arch-segment');
  assert.ok(segments.length >= 9);
  assert.ok(segments.every((segment) => segment.position.y + segment.scale.y / 2 < 3.18));
  assert.ok(segments.some((segment) => Math.abs(segment.rotationX ?? segment.rotationZ ?? 0) > 5));
});
