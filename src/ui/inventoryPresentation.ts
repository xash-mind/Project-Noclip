import { ITEM_DEFINITIONS, type ItemDefinition } from '../items/definitions.js';
import type { ItemInstance, ItemInstanceId } from '../items/types.js';

export interface InventoryItemPresentation {
  key: ItemInstanceId;
  definition: ItemDefinition;
  quantityLabel: string;
  primaryState: string;
  conditionLabel: string;
  selectionLabel: 'Selected' | 'Stored';
  originLabel: string;
}

function percent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function inventoryItemKey(item: ItemInstance): ItemInstanceId {
  return item.instanceId;
}

export function itemPrimaryState(item: ItemInstance): string {
  if (item.charge !== undefined) return `${ITEM_DEFINITIONS[item.definitionId].presentation.stateLabel} ${percent(item.charge)}`;
  return `Condition ${percent(item.condition)}`;
}

export function presentInventoryItem(item: ItemInstance, selectedItemId?: ItemInstanceId): InventoryItemPresentation {
  const definition = ITEM_DEFINITIONS[item.definitionId];
  return {
    key: inventoryItemKey(item),
    definition,
    quantityLabel: item.quantity > 1 ? `×${item.quantity}` : '×1',
    primaryState: itemPrimaryState(item),
    conditionLabel: `Condition ${percent(item.condition)}`,
    selectionLabel: item.instanceId === selectedItemId ? 'Selected' : 'Stored',
    originLabel: item.origin.type === 'starter' ? 'Starter item' : `${item.origin.type[0]?.toUpperCase() ?? ''}${item.origin.type.slice(1)} item`
  };
}

export function selectedInventoryItem(items: readonly ItemInstance[], selectedItemId?: ItemInstanceId): ItemInstance | undefined {
  return selectedItemId ? items.find((item) => item.instanceId === selectedItemId) : undefined;
}
