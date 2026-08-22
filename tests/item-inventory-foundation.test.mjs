import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEM_DEFINITIONS } from '../.test-dist/src/items/definitions.js';
import { createItemInstance, transferItem } from '../.test-dist/src/items/factory.js';
import { rollStarterDefinitions } from '../.test-dist/src/items/starterRoll.js';
import {
  addInstance,
  addToInventory,
  createInventory,
  queryInstance,
  removeInstance,
  restoreInventory,
  serializeInventory,
  splitInstance,
  stackInstances,
  transferBetweenInventories
} from '../.test-dist/src/inventory/inventory.js';

const owner = { type: 'character', id: 'journey-a' };
const world = { type: 'world', addressId: 'cell:0:0' };
const make = (definitionId, sourceId, itemOwner = owner) => createItemInstance(definitionId, sourceId, 'event', itemOwner, 1000);

test('two copies of one Definition have distinct Instance IDs', () => {
  const left = make('flashlight', 'copy:left');
  const right = make('flashlight', 'copy:right');
  assert.notEqual(left.instanceId, right.instanceId);
  assert.equal(left.definitionId, right.definitionId);
});

test('stable identity survives serialize/restore', () => {
  let inventory = createInventory('player', owner);
  const item = make('flashlight', 'persisted');
  inventory = addInstance(inventory, item);
  const restored = restoreInventory(JSON.parse(JSON.stringify(serializeInventory(inventory))));
  assert.equal(restored.items[0]?.instanceId, item.instanceId);
  assert.deepEqual(restored, inventory);
});

test('pickup/drop ownership transition preserves identity', () => {
  const item = make('empty-can', 'world-can', world);
  const picked = transferItem(item, owner);
  const dropped = transferItem(picked, { type: 'world', addressId: 'cell:1:0' });
  assert.equal(picked.instanceId, item.instanceId);
  assert.equal(dropped.instanceId, item.instanceId);
  assert.equal(dropped.revision, item.revision + 2);
});

test('duplicate addition is rejected', () => {
  const item = make('flashlight', 'duplicate');
  const inventory = addInstance(createInventory('player', owner), item);
  assert.throws(() => addInstance(inventory, item), /already in inventory/);
});

test('removing an unknown instance is safe and explicit', () => {
  const inventory = createInventory('player', owner);
  const result = removeInstance(inventory, 'item-missing');
  assert.equal(result.status, 'not-found');
  assert.equal(result.inventory, inventory);
});

test('valid stack semantics preserve target identity and quantity', () => {
  const first = { ...make('empty-can', 'stack-a'), condition: 1, quantity: 2 };
  const second = { ...make('empty-can', 'stack-b'), condition: 1, quantity: 1 };
  let inventory = createInventory('player', owner);
  inventory = addInstance(addInstance(inventory, first), second);
  const result = stackInstances(inventory, first.instanceId, second.instanceId);
  assert.equal(result.target.instanceId, first.instanceId);
  assert.equal(result.target.quantity, 3);
  assert.equal(result.consumedInstanceId, second.instanceId);
  assert.equal(result.inventory.items.length, 1);
});

test('invalid stack operations are rejected', () => {
  const flashlight = make('flashlight', 'nonstack-a');
  const other = make('flashlight', 'nonstack-b');
  let inventory = createInventory('player', owner);
  inventory = addInstance(addInstance(inventory, flashlight), other);
  assert.equal(ITEM_DEFINITIONS.flashlight.maxStackQuantity, 1);
  assert.throws(() => stackInstances(inventory, flashlight.instanceId, other.instanceId), /cannot be stacked/);
});

test('split creates a new identity without changing the source identity', () => {
  const stack = { ...make('paper-note', 'notes'), condition: 1, quantity: 4 };
  let inventory = createInventory('player', owner);
  inventory = addInstance(inventory, stack);
  const result = splitInstance(inventory, stack.instanceId, 2, 'split-1');
  assert.equal(result.source.instanceId, stack.instanceId);
  assert.notEqual(result.split.instanceId, stack.instanceId);
  assert.equal(result.source.quantity, 2);
  assert.equal(result.split.quantity, 2);
  assert.equal(result.split.origin.parentInstanceId, stack.instanceId);
});

test('transfer does not duplicate Items', () => {
  const item = make('empty-can', 'transfer');
  const source = addInstance(createInventory('source', owner), item);
  const destination = createInventory('destination', { type: 'trade-escrow', id: 'escrow-a' });
  const result = transferBetweenInventories(source, destination, item.instanceId);
  assert.equal(queryInstance(result.source, item.instanceId), undefined);
  assert.equal(queryInstance(result.destination, item.instanceId)?.instanceId, item.instanceId);
  assert.equal(result.source.items.length + result.destination.items.length, 1);
});

test('starter-roll items use canonical Item Instance factory identity', () => {
  const characterId = 'starter-character';
  const rolled = rollStarterDefinitions(characterId);
  const items = rolled.map((definitionId, index) => createItemInstance(definitionId, `starter:${characterId}:${index}`, 'starter', owner, 1000));
  const inserted = items.reduce((current, item) => addToInventory(current, item, owner.id), []);
  assert.deepEqual(inserted.map((item) => item.instanceId), items.map((item) => item.instanceId));
  assert.ok(inserted.every((item) => item.origin.type === 'starter'));
});
