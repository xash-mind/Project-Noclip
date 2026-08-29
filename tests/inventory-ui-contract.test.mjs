import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createInventory, addInstance, moveInstance, restoreInventory, serializeInventory } from '../.test-dist/src/inventory/inventory.js';
import { ITEM_DEFINITIONS } from '../.test-dist/src/items/definitions.js';
import { createItemInstance } from '../.test-dist/src/items/factory.js';
import { inventoryItemKey, presentInventoryItem, selectedInventoryItem } from '../.test-dist/src/ui/inventoryPresentation.js';

const owner = { type: 'character', id: 'inventory-ui-character' };
const make = (definitionId, sourceId) => createItemInstance(definitionId, sourceId, 'starter', owner, 1000);

test('Item Definition presentation metadata is canonical and complete', () => {
  for (const definition of Object.values(ITEM_DEFINITIONS)) {
    assert.ok(definition.presentation.iconLabel.length >= 1);
    assert.ok(definition.presentation.categoryLabel.length >= 1);
    assert.ok(definition.presentation.stateLabel.length >= 1);
    assert.ok(definition.description.length >= 1);
  }
});

test('UI presentation keys exact Item Instances rather than Definitions', () => {
  const left = make('empty-can', 'same-definition:left');
  const right = make('empty-can', 'same-definition:right');
  assert.equal(left.definitionId, right.definitionId);
  assert.notEqual(left.instanceId, right.instanceId);
  assert.equal(inventoryItemKey(left), left.instanceId);
  assert.equal(inventoryItemKey(right), right.instanceId);
  assert.notEqual(inventoryItemKey(left), inventoryItemKey(right));
});

test('stack quantity and selected state are presentation only', () => {
  const stack = { ...make('paper-note', 'stack-ui'), condition: 1, quantity: 6 };
  const before = structuredClone(stack);
  const presentation = presentInventoryItem(stack, stack.instanceId);
  assert.equal(presentation.quantityLabel, '×6');
  assert.equal(presentation.selectionLabel, 'Selected');
  assert.equal(presentation.definition.maxStackQuantity, 8);
  assert.deepEqual(stack, before, 'rendering presentation must not mutate or recreate the Item Instance');
});

test('canonical reorder preserves every Item Instance identity and selection', () => {
  const first = make('flashlight', 'reorder:first');
  const second = make('battery', 'reorder:second');
  const third = make('empty-can', 'reorder:third');
  let inventory = createInventory('character:inventory-ui-character', owner);
  inventory = addInstance(addInstance(addInstance(inventory, first), second), third);
  const beforeIds = inventory.items.map((item) => item.instanceId).sort();
  const moved = moveInstance(inventory, third.instanceId, 0);
  assert.deepEqual(moved.items.map((item) => item.instanceId), [third.instanceId, first.instanceId, second.instanceId]);
  assert.deepEqual(moved.items.map((item) => item.instanceId).sort(), beforeIds);
  assert.equal(selectedInventoryItem(moved.items, second.instanceId)?.instanceId, second.instanceId);
});

test('reordered canonical inventory survives serialize/restore unchanged', () => {
  const first = make('paper-note', 'persist:first');
  const second = make('empty-can', 'persist:second');
  let inventory = createInventory('character:inventory-ui-character', owner);
  inventory = addInstance(addInstance(inventory, first), second);
  inventory = moveInstance(inventory, second.instanceId, 0);
  const restored = restoreInventory(JSON.parse(JSON.stringify(serializeInventory(inventory))));
  assert.deepEqual(restored.items.map((item) => item.instanceId), [second.instanceId, first.instanceId]);
  assert.deepEqual(restored.items, inventory.items);
});

test('Inventory controls meet the 44 CSS-pixel accessibility floor without drag-only UI', () => {
  const css = readFileSync('src/ui/inventory.css', 'utf8');
  const surface = readFileSync('src/ui/InventorySurface.ts', 'utf8');
  assert.match(css, /inventory-close\{[^}]*min-height:44px/);
  assert.match(css, /inventory-detail-actions button\{[^}]*min-height:44px/);
  assert.match(css, /touch-capable \.slot\{height:46px;min-height:46px/);
  assert.match(css, /inventory-grid-slot\{[^}]*min-height:64px/);
  assert.doesNotMatch(surface, /dragstart|draggable|dropzone/);
  assert.match(surface, /Move earlier/);
  assert.match(surface, /Move later/);
});
