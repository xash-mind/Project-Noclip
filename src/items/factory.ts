import { stableId, unitFloat } from '../world/hash.js';
import { ITEM_DEFINITIONS, type ItemDefinitionId } from './definitions.js';
import type { ItemInstance, ItemOwner } from './types.js';

export function createItemInstance(definitionId: ItemDefinitionId, sourceId: string, originType: ItemInstance['origin']['type'], owner: ItemOwner, createdAt: number): ItemInstance {
  const definition = ITEM_DEFINITIONS[definitionId];
  const condition = 0.58 + unitFloat(`${sourceId}:condition`) * 0.42;
  const instance: ItemInstance = {
    instanceId: stableId('item', sourceId, definitionId),
    definitionId,
    condition,
    quantity: 1,
    owner,
    origin: { type: originType, sourceId, createdAt },
    revision: 1,
    tradeable: definition.tradeable
  };
  if (definitionId === 'flashlight') instance.charge = 0.15 + unitFloat(`${sourceId}:charge`) * 0.55;
  if (definitionId === 'battery') instance.charge = 0.35 + unitFloat(`${sourceId}:charge`) * 0.65;
  if (definitionId === 'marker') instance.charge = 0.45 + unitFloat(`${sourceId}:ink`) * 0.55;
  if (definitionId === 'glow-stick') instance.charge = 1;
  if (definitionId === 'string-spool') instance.charge = 0.6 + unitFloat(`${sourceId}:length`) * 0.4;
  return instance;
}

export function transferItem(item: ItemInstance, owner: ItemOwner): ItemInstance {
  return { ...item, owner, revision: item.revision + 1 };
}
