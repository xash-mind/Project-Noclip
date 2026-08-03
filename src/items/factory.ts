import { ITEM_DEFINITIONS, type ItemDefinitionId } from './definitions.js';
import type { ItemInstance, ItemOwner } from './types.js';
import { stableId, unitFloat } from '../world/hash.js';
export function createItemInstance(definitionId: ItemDefinitionId, sourceId: string, originType: ItemInstance['origin']['type'], owner: ItemOwner, createdAt: number): ItemInstance {
  const definition = ITEM_DEFINITIONS[definitionId];
  const condition = 0.58 + unitFloat(`${sourceId}:condition`) * 0.42;
  const charge = definitionId === 'flashlight' ? 0.28 + unitFloat(`${sourceId}:charge`) * 0.42
    : definitionId === 'battery' ? 0.25 + unitFloat(`${sourceId}:charge`) * 0.6
    : definitionId === 'marker' ? 0.42 + unitFloat(`${sourceId}:ink`) * 0.48
    : definitionId === 'string-spool' ? 0.7 + unitFloat(`${sourceId}:length`) * 0.3
    : definitionId === 'glow-stick' ? 1 : undefined;
  return {
    instanceId: stableId('item', definitionId, sourceId), definitionId, condition,
    ...(charge === undefined ? {} : { charge }), quantity: 1, owner,
    origin: { type: originType, sourceId, createdAt }, revision: 1, tradeable: definition.tradeable
  };
}
export function transferItem(item: ItemInstance, owner: ItemOwner): ItemInstance { return { ...item, owner, revision: item.revision + 1 }; }
