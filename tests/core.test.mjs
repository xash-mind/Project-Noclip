import test from 'node:test';
import assert from 'node:assert/strict';
import { hashString, stableId } from '../.test-dist/src/world/hash.js';
import { generateCell, generateOpenings, validateCellConnectivity } from '../.test-dist/src/world/generator.js';
import { DEFAULT_TUNING } from '../.test-dist/src/world/types.js';
import { rollStarterDefinitions, simulateStarterRolls, starterItemCount } from '../.test-dist/src/items/starterRoll.js';
import { createItemInstance } from '../.test-dist/src/items/factory.js';
import { addToInventory, removeFromInventory } from '../.test-dist/src/inventory/inventory.js';
import { calculateExposureDay, calculateWorldDay, canonicalEdgeId, EMPTY_EXPOSURE, recordTraversal } from '../.test-dist/src/simulation/timeline.js';
import { canShift, shouldShift } from '../.test-dist/src/simulation/shifting.js';
import { exitsForCell, validateExitRegistry } from '../.test-dist/src/world/exits.js';
import { migrateSave } from '../.test-dist/src/persistence/types.js';

const options = { seed: 'threshold-001', x: 4, z: -3, worldDay: 30, exposure: 6, shiftEpoch: 0, tuning: DEFAULT_TUNING };

test('hashing and stable IDs are deterministic', () => {
  assert.equal(hashString('same'), hashString('same'));
  assert.equal(stableId('cell', 4, -3), stableId('cell', 4, -3));
  assert.notEqual(stableId('cell', 4, -3), stableId('cell', 4, -2));
});

test('cell generation is deterministic and neighbor openings agree', () => {
  assert.deepEqual(generateCell(options), generateCell(options));
  const current = generateOpenings(options.seed, 4, -3, DEFAULT_TUNING.extraOpeningChance);
  const east = generateOpenings(options.seed, 5, -3, DEFAULT_TUNING.extraOpeningChance);
  assert.equal(current.east, east.west);
  assert.deepEqual(validateCellConnectivity(options.seed, 10, DEFAULT_TUNING.extraOpeningChance), []);
});

test('shift epoch changes mutable interior while retaining deterministic replay', () => {
  const shifted = generateCell({ ...options, shiftEpoch: 1 });
  assert.deepEqual(shifted, generateCell({ ...options, shiftEpoch: 1 }));
  assert.notDeepEqual(shifted.walls, generateCell(options).walls);
});

test('starter roll is stable, bounded, and compatible', () => {
  for (let index = 0; index < 2000; index += 1) {
    const seed = `traveller-${index}`;
    assert.equal(starterItemCount(seed), starterItemCount(seed));
    const items = rollStarterDefinitions(seed);
    assert.ok(items.length <= 2);
    assert.equal(new Set(items).size, items.length);
    assert.deepEqual(items, rollStarterDefinitions(seed));
  }
  const sample = simulateStarterRolls('distribution', 20_000);
  assert.ok(Math.abs(sample.none / 20_000 - 0.15) < 0.025);
  assert.ok(Math.abs(sample.one / 20_000 - 0.60) < 0.035);
  assert.ok(Math.abs(sample.two / 20_000 - 0.25) < 0.03);
});

test('item ownership revisions support future atomic transfer', () => {
  const item = createItemInstance('battery', 'loot-node-a', 'loot', { type: 'world', addressId: '0:0' }, 1);
  const inventory = addToInventory([], item, 'character-a');
  assert.equal(inventory[0].owner.type, 'character');
  assert.equal(inventory[0].revision, item.revision + 1);
  const removed = removeFromInventory(inventory, inventory[0].instanceId);
  assert.equal(removed.remaining.length, 0);
});

test('exposure rewards novel traversal more than loops', () => {
  const edge = canonicalEdgeId(0, 0, 1, 0);
  const novel = recordTraversal(EMPTY_EXPOSURE, edge, 100);
  const repeated = recordTraversal(novel, edge, 100);
  assert.equal(novel.novelUnits, 100);
  assert.equal(repeated.repeatedUnits, 100);
  assert.ok(calculateExposureDay(repeated) > calculateExposureDay(novel));
  assert.equal(calculateWorldDay(Date.UTC(2026, 7, 4)), 1);
});

test('shifting respects observation and stable spaces', () => {
  const base = { occupied: false, observed: false, distanceInCells: 4, stability: 'disorienting', protectedInteraction: false, preservesPath: true };
  assert.equal(canShift(base), true);
  assert.equal(canShift({ ...base, observed: true }), false);
  assert.equal(canShift({ ...base, stability: 'stable' }), false);
  assert.equal(shouldShift('seed', '2:2', 1, 0), false);
  assert.equal(shouldShift('seed', '2:2', 1, 1), true);
});

test('exit registry is valid and gates non-Level-1 destinations', () => {
  assert.deepEqual(validateExitRegistry(), []);
  assert.equal(exitsForCell('seed', -5, 2, 6, 2, false)[0]?.enabled, false);
  assert.equal(exitsForCell('seed', -5, 2, 7, 2, false)[0]?.enabled, true);
  assert.equal(exitsForCell('seed', 2, 6, 0, 0, true)[0]?.destinationId, 'level-483');
});

test('save migration rejects malformed data and accepts version 1', () => {
  assert.equal(migrateSave({}), undefined);
  const save = {
    version: 1, characterId: 'c', seed: 's', createdAt: 1, starterRolled: true,
    position: { x: 0, y: 1.65, z: 0, yaw: 0, pitch: 0 }, inventory: [], droppedItems: [],
    pickedLootNodeIds: [], marks: [], hydration: 1, exposure: structuredClone(EMPTY_EXPOSURE), shiftEpochs: {},
    unloadCounts: {}, discoveredExits: [], settings: { sensitivity: 0.18, reducedMotion: false, reducedFlicker: false, masterVolume: 0.7 }, savedAt: 1
  };
  assert.equal(migrateSave(save)?.characterId, 'c');
});
