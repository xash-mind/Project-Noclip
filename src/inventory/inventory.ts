import { transferItem } from '../items/factory.js';
import type { ItemInstance } from '../items/types.js';

export const INVENTORY_CAPACITY = 6;

export function addToInventory(items: readonly ItemInstance[], item: ItemInstance, characterId: string): ItemInstance[] {
  if (items.length >= INVENTORY_CAPACITY) throw new Error('Inventory is full');
  if (items.some((existing) => existing.instanceId === item.instanceId)) throw new Error('Item already in inventory');
  return [...items, transferItem(item, { type: 'character', id: characterId })];
}

export function removeFromInventory(items: readonly ItemInstance[], instanceId: string): { remaining: ItemInstance[]; item: ItemInstance } {
  const item = items.find((candidate) => candidate.instanceId === instanceId);
  if (!item) throw new Error('Item not found');
  return { remaining: items.filter((candidate) => candidate.instanceId !== instanceId), item };
}

export function updateInventoryItem(items: readonly ItemInstance[], updated: ItemInstance): ItemInstance[] {
  return items.map((item) => item.instanceId === updated.instanceId ? updated : item);
}
