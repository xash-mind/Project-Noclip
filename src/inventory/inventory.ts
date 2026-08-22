import { ITEM_DEFINITIONS, type ItemDefinitionId } from '../items/definitions.js';
import { splitItemInstance, transferItem } from '../items/factory.js';
import type { ItemInstance, ItemInstanceId, ItemOwner } from '../items/types.js';

export const INVENTORY_CAPACITY = 6;
export const INVENTORY_SNAPSHOT_VERSION = 1 as const;

export interface InventoryState {
  containerId: string;
  owner: ItemOwner;
  capacity: number;
  items: ItemInstance[];
}

export interface InventorySnapshot {
  version: typeof INVENTORY_SNAPSHOT_VERSION;
  containerId: string;
  owner: ItemOwner;
  capacity: number;
  items: ItemInstance[];
}

export type RemoveInstanceResult =
  | { status: 'removed'; removed: ItemInstance; inventory: InventoryState }
  | { status: 'not-found'; inventory: InventoryState };

function ownersEqual(left: ItemOwner, right: ItemOwner): boolean {
  if (left.type !== right.type) return false;
  if (left.type === 'character' && right.type === 'character') return left.id === right.id;
  if (left.type === 'trade-escrow' && right.type === 'trade-escrow') return left.id === right.id;
  if (left.type === 'world' && right.type === 'world') return left.addressId === right.addressId && left.containerId === right.containerId;
  return false;
}

function isItemOwner(value: unknown): value is ItemOwner {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.type === 'character' || candidate.type === 'trade-escrow') return typeof candidate.id === 'string' && candidate.id.length > 0;
  if (candidate.type === 'world') return typeof candidate.addressId === 'string' && candidate.addressId.length > 0
    && (candidate.containerId === undefined || typeof candidate.containerId === 'string');
  return false;
}

function copyOwner(owner: ItemOwner): ItemOwner {
  return owner.type === 'world'
    ? { type: 'world', addressId: owner.addressId, ...(owner.containerId === undefined ? {} : { containerId: owner.containerId }) }
    : { ...owner };
}

function copyItem(item: ItemInstance): ItemInstance {
  return { ...item, owner: copyOwner(item.owner), origin: { ...item.origin } };
}

function assertDefinitionId(value: unknown): asserts value is ItemDefinitionId {
  if (typeof value !== 'string' || !(value in ITEM_DEFINITIONS)) throw new Error('Inventory contains an unknown Item Definition');
}

function validateItemInstance(item: ItemInstance, expectedOwner?: ItemOwner): void {
  assertDefinitionId(item.definitionId);
  const definition = ITEM_DEFINITIONS[item.definitionId];
  if (!item.instanceId || !item.origin?.sourceId) throw new Error('Inventory Item Instance identity/provenance is incomplete');
  if (!Number.isFinite(item.condition) || item.condition < 0 || item.condition > 1) throw new Error(`Invalid condition for ${item.instanceId}`);
  if (item.charge !== undefined && (!Number.isFinite(item.charge) || item.charge < 0 || item.charge > 1)) throw new Error(`Invalid charge for ${item.instanceId}`);
  if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > definition.maxStackQuantity) throw new Error(`Invalid quantity for ${item.instanceId}`);
  if (!Number.isInteger(item.revision) || item.revision < 1) throw new Error(`Invalid revision for ${item.instanceId}`);
  if (!Number.isFinite(item.origin.createdAt)) throw new Error(`Invalid origin timestamp for ${item.instanceId}`);
  if (expectedOwner && !ownersEqual(item.owner, expectedOwner)) throw new Error(`Item ${item.instanceId} is not owned by inventory ${expectedOwner.type}`);
}

function validateInventory(inventory: InventoryState): void {
  if (!inventory.containerId.trim()) throw new Error('Inventory containerId must be non-empty');
  if (!Number.isInteger(inventory.capacity) || inventory.capacity < 0) throw new Error('Inventory capacity must be a non-negative integer');
  if (inventory.items.length > inventory.capacity) throw new Error('Inventory exceeds capacity');
  const ids = new Set<ItemInstanceId>();
  for (const item of inventory.items) {
    validateItemInstance(item, inventory.owner);
    if (ids.has(item.instanceId)) throw new Error(`Duplicate Item Instance ${item.instanceId}`);
    ids.add(item.instanceId);
  }
}

export function createInventory(containerId: string, owner: ItemOwner, capacity = INVENTORY_CAPACITY): InventoryState {
  const inventory = { containerId, owner: copyOwner(owner), capacity, items: [] } satisfies InventoryState;
  validateInventory(inventory);
  return inventory;
}

export function queryInstance(inventory: InventoryState, instanceId: ItemInstanceId): ItemInstance | undefined {
  return inventory.items.find((item) => item.instanceId === instanceId);
}

export function addInstance(inventory: InventoryState, item: ItemInstance): InventoryState {
  validateInventory(inventory);
  validateItemInstance(item);
  if (queryInstance(inventory, item.instanceId)) throw new Error(`Item Instance ${item.instanceId} is already in inventory`);
  if (inventory.items.length >= inventory.capacity) throw new Error('Inventory is full');
  const adopted = ownersEqual(item.owner, inventory.owner) ? copyItem(item) : transferItem(item, copyOwner(inventory.owner));
  const next = { ...inventory, items: [...inventory.items, adopted] };
  validateInventory(next);
  return next;
}

export function removeInstance(inventory: InventoryState, instanceId: ItemInstanceId): RemoveInstanceResult {
  validateInventory(inventory);
  const index = inventory.items.findIndex((item) => item.instanceId === instanceId);
  if (index < 0) return { status: 'not-found', inventory };
  const removed = inventory.items[index]!;
  return { status: 'removed', removed, inventory: { ...inventory, items: inventory.items.filter((_, itemIndex) => itemIndex !== index) } };
}

export function moveInstance(inventory: InventoryState, instanceId: ItemInstanceId, targetIndex: number): InventoryState {
  validateInventory(inventory);
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= inventory.items.length) throw new Error('Inventory target index is out of range');
  const currentIndex = inventory.items.findIndex((item) => item.instanceId === instanceId);
  if (currentIndex < 0) throw new Error(`Unknown Item Instance ${instanceId}`);
  if (currentIndex === targetIndex) return inventory;
  const items = [...inventory.items];
  const [item] = items.splice(currentIndex, 1);
  items.splice(targetIndex, 0, item!);
  return { ...inventory, items };
}

function stackStateMatches(left: ItemInstance, right: ItemInstance): boolean {
  return left.definitionId === right.definitionId
    && left.condition === right.condition
    && left.charge === right.charge
    && ownersEqual(left.owner, right.owner);
}

export function stackInstances(
  inventory: InventoryState,
  targetInstanceId: ItemInstanceId,
  sourceInstanceId: ItemInstanceId,
  quantity?: number
): { inventory: InventoryState; target: ItemInstance; consumedInstanceId?: ItemInstanceId } {
  validateInventory(inventory);
  if (targetInstanceId === sourceInstanceId) throw new Error('Cannot stack an Item Instance onto itself');
  const target = queryInstance(inventory, targetInstanceId);
  const source = queryInstance(inventory, sourceInstanceId);
  if (!target || !source) throw new Error('Both Item Instances must exist in the inventory');
  const definition = ITEM_DEFINITIONS[target.definitionId];
  if (definition.maxStackQuantity <= 1 || target.definitionId !== source.definitionId) throw new Error('These Item Instances cannot be stacked');
  if (!stackStateMatches(target, source)) throw new Error('Only equivalent Item Instance state can be stacked');
  const movedQuantity = quantity ?? source.quantity;
  if (!Number.isInteger(movedQuantity) || movedQuantity <= 0 || movedQuantity > source.quantity) throw new Error('Stack quantity is invalid');
  if (target.quantity + movedQuantity > definition.maxStackQuantity) throw new Error('Stack would exceed the Item Definition limit');
  const nextTarget = { ...target, quantity: target.quantity + movedQuantity, revision: target.revision + 1 };
  const items = inventory.items.map((item) => item.instanceId === target.instanceId ? nextTarget : item);
  if (movedQuantity === source.quantity) {
    return { inventory: { ...inventory, items: items.filter((item) => item.instanceId !== source.instanceId) }, target: nextTarget, consumedInstanceId: source.instanceId };
  }
  const nextSource = { ...source, quantity: source.quantity - movedQuantity, revision: source.revision + 1 };
  return { inventory: { ...inventory, items: items.map((item) => item.instanceId === source.instanceId ? nextSource : item) }, target: nextTarget };
}

export function splitInstance(
  inventory: InventoryState,
  instanceId: ItemInstanceId,
  quantity: number,
  splitSourceId: string
): { inventory: InventoryState; source: ItemInstance; split: ItemInstance } {
  validateInventory(inventory);
  if (inventory.items.length >= inventory.capacity) throw new Error('Inventory is full');
  const item = queryInstance(inventory, instanceId);
  if (!item) throw new Error(`Unknown Item Instance ${instanceId}`);
  const result = splitItemInstance(item, quantity, splitSourceId);
  if (queryInstance(inventory, result.split.instanceId)) throw new Error(`Split would duplicate Item Instance ${result.split.instanceId}`);
  const index = inventory.items.findIndex((candidate) => candidate.instanceId === instanceId);
  const items = [...inventory.items];
  items.splice(index, 1, result.source, result.split);
  const next = { ...inventory, items };
  validateInventory(next);
  return { inventory: next, ...result };
}

export function transferBetweenInventories(
  source: InventoryState,
  destination: InventoryState,
  instanceId: ItemInstanceId
): { source: InventoryState; destination: InventoryState; item: ItemInstance } {
  validateInventory(source);
  validateInventory(destination);
  if (source.containerId === destination.containerId) throw new Error('Source and destination inventory must be different');
  const removed = removeInstance(source, instanceId);
  if (removed.status === 'not-found') throw new Error(`Unknown Item Instance ${instanceId}`);
  if (queryInstance(destination, instanceId)) throw new Error(`Destination already contains Item Instance ${instanceId}`);
  if (destination.items.length >= destination.capacity) throw new Error('Destination inventory is full');
  const item = transferItem(removed.removed, copyOwner(destination.owner));
  const nextDestination = { ...destination, items: [...destination.items, item] };
  validateInventory(nextDestination);
  return { source: removed.inventory, destination: nextDestination, item };
}

export function serializeInventory(inventory: InventoryState): InventorySnapshot {
  validateInventory(inventory);
  return {
    version: INVENTORY_SNAPSHOT_VERSION,
    containerId: inventory.containerId,
    owner: copyOwner(inventory.owner),
    capacity: inventory.capacity,
    items: inventory.items.map(copyItem)
  };
}

export function restoreInventory(snapshot: unknown): InventoryState {
  if (!snapshot || typeof snapshot !== 'object') throw new Error('Inventory snapshot must be an object');
  const candidate = snapshot as Partial<InventorySnapshot>;
  if (candidate.version !== INVENTORY_SNAPSHOT_VERSION || typeof candidate.containerId !== 'string' || !isItemOwner(candidate.owner) || !Array.isArray(candidate.items)) throw new Error('Unsupported or malformed inventory snapshot');
  if (!Number.isInteger(candidate.capacity) || (candidate.capacity ?? -1) < 0) throw new Error('Inventory snapshot has invalid capacity');
  const inventory: InventoryState = {
    containerId: candidate.containerId,
    owner: copyOwner(candidate.owner),
    capacity: candidate.capacity!,
    items: candidate.items.map(copyItem)
  };
  validateInventory(inventory);
  return inventory;
}

function characterInventory(items: ItemInstance[], characterId: string): InventoryState {
  return { containerId: `character:${characterId}`, owner: { type: 'character', id: characterId }, capacity: INVENTORY_CAPACITY, items };
}

export function addToInventory(items: ItemInstance[], item: ItemInstance, characterId: string): ItemInstance[] {
  return addInstance(characterInventory(items, characterId), item).items;
}

export function removeFromInventory(items: ItemInstance[], instanceId: string): { removed?: ItemInstance; remaining: ItemInstance[] } {
  const owner = items[0]?.owner;
  const inventory: InventoryState = {
    containerId: 'legacy-runtime-inventory',
    owner: owner ?? { type: 'character', id: 'unknown' },
    capacity: Math.max(INVENTORY_CAPACITY, items.length),
    items
  };
  const result = removeInstance(inventory, instanceId);
  return result.status === 'removed' ? { removed: result.removed, remaining: result.inventory.items } : { remaining: items };
}

export function updateInventoryItem(items: ItemInstance[], updated: ItemInstance): ItemInstance[] {
  const index = items.findIndex((item) => item.instanceId === updated.instanceId);
  if (index < 0) throw new Error(`Unknown Item Instance ${updated.instanceId}`);
  validateItemInstance(updated);
  return items.map((item, itemIndex) => itemIndex === index ? updated : item);
}
