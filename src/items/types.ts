import type { ItemDefinitionId } from './definitions.js';

export type ItemInstanceId = string;

export type ItemOwner =
  | { type: 'character'; id: string }
  | { type: 'world'; addressId: string; containerId?: string }
  | { type: 'trade-escrow'; id: string };

export interface ItemOrigin {
  type: 'starter' | 'loot' | 'event' | 'trade' | 'split';
  sourceId: string;
  createdAt: number;
  parentInstanceId?: ItemInstanceId;
}

export interface ItemInstance {
  instanceId: ItemInstanceId;
  definitionId: ItemDefinitionId;
  condition: number;
  charge?: number;
  quantity: number;
  owner: ItemOwner;
  origin: ItemOrigin;
  revision: number;
}
