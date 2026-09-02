import { ITEM_DEFINITIONS, type ItemDefinitionId } from './definitions.js';
import type { ItemInstance, ItemInstanceId, ItemOwner } from './types.js';
import { stableId, unitFloat } from '../world/hash.js';

export function createItemInstanceId(definitionId: ItemDefinitionId, sourceId: string): ItemInstanceId {
  if (!sourceId.trim()) throw new Error('Item creation sourceId must be non-empty');
  return stableId('item', definitionId, sourceId);
}

export function createItemInstance(
  definitionId: ItemDefinitionId,
  sourceId: string,
  originType: ItemInstance['origin']['type'],
  owner: ItemOwner,
  createdAt: number
): ItemInstance {
  if (originType === 'split') throw new Error('Split Item Instances must be created from an existing stack');
  const condition = 0.58 + unitFloat(`${sourceId}:condition`) * 0.42;
  const charge = definitionId === 'flashlight' ? 0.28 + unitFloat(`${sourceId}:charge`) * 0.42
    : definitionId === 'battery' ? 0.25 + unitFloat(`${sourceId}:charge`) * 0.6
    : definitionId === 'marker' ? 0.42 + unitFloat(`${sourceId}:ink`) * 0.48
    : definitionId === 'string-spool' ? 0.7 + unitFloat(`${sourceId}:length`) * 0.3
    : definitionId === 'glow-stick' ? 1 : undefined;
  return {
    instanceId: createItemInstanceId(definitionId, sourceId), definitionId, condition,
    ...(charge === undefined ? {} : { charge }), quantity: 1, owner,
    origin: { type: originType, sourceId, createdAt }, revision: 1
  };
}

export function transferItem(item: ItemInstance, owner: ItemOwner): ItemInstance {
  return { ...item, owner, revision: item.revision + 1 };
}

export function splitItemInstance(item: ItemInstance, quantity: number, splitSourceId: string): { source: ItemInstance; split: ItemInstance } {
  const definition = ITEM_DEFINITIONS[item.definitionId];
  if (definition.maxStackQuantity <= 1) throw new Error(`${definition.name} cannot be split`);
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity >= item.quantity) throw new Error('Split quantity must be a positive integer smaller than the stack');
  if (!splitSourceId.trim()) throw new Error('Split sourceId must be non-empty');
  const source = { ...item, quantity: item.quantity - quantity, revision: item.revision + 1 };
  const splitSource = `${item.instanceId}:split:${splitSourceId}`;
  const split: ItemInstance = {
    ...item,
    instanceId: createItemInstanceId(item.definitionId, splitSource),
    quantity,
    origin: { type: 'split', sourceId: splitSource, createdAt: item.origin.createdAt, parentInstanceId: item.instanceId },
    revision: 1
  };
  return { source, split };
}
