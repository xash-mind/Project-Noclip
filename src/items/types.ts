import type { ItemDefinitionId } from './definitions.js';
export type ItemOwner =
  | { type: 'character'; id: string }
  | { type: 'world'; addressId: string; containerId?: string }
  | { type: 'trade-escrow'; id: string };
export interface ItemInstance {
  instanceId: string; definitionId: ItemDefinitionId; condition: number; charge?: number;
  quantity: number; owner: ItemOwner;
  origin: { type: 'starter' | 'loot' | 'event' | 'trade'; sourceId: string; createdAt: number };
  revision: number; tradeable: boolean;
}
