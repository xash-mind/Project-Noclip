import type { ItemInstance } from '../items/types.js';
import { transferItem } from '../items/factory.js';
export const INVENTORY_CAPACITY = 6;
export function addToInventory(items: ItemInstance[], item: ItemInstance, characterId: string): ItemInstance[] {
  if (items.some((candidate) => candidate.instanceId === item.instanceId)) throw new Error('Item is already in inventory');
  if (items.length >= INVENTORY_CAPACITY) throw new Error('Inventory is full');
  return [...items, transferItem(item, { type: 'character', id: characterId })];
}
export function removeFromInventory(items: ItemInstance[], instanceId: string): { removed?: ItemInstance; remaining: ItemInstance[] } {
  return { removed: items.find((item) => item.instanceId === instanceId), remaining: items.filter((item) => item.instanceId !== instanceId) };
}
export function updateInventoryItem(items: ItemInstance[], updated: ItemInstance): ItemInstance[] {
  return items.map((item) => item.instanceId === updated.instanceId ? updated : item);
}
