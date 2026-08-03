import type { ItemInstance } from '../items/types.js';
import type { SurfaceMark } from '../persistence/types.js';

export const PROTOCOL_VERSION = 1;

export type ClientCommand =
  | { version: 1; type: 'move'; sequence: number; x: number; z: number; yaw: number }
  | { version: 1; type: 'interact'; targetId: string }
  | { version: 1; type: 'draw'; mark: SurfaceMark }
  | { version: 1; type: 'pickup-item'; instanceId: string }
  | { version: 1; type: 'drop-item'; instanceId: string }
  | { version: 1; type: 'use-item'; instanceId: string }
  | { version: 1; type: 'enter-exit'; exitId: string }
  | { version: 1; type: 'set-waiting'; waiting: boolean }
  | { version: 1; type: 'send-local-chat'; body: string };

export type ServerEvent =
  | { version: 1; type: 'character-snapshot'; characterId: string }
  | { version: 1; type: 'timeline'; worldDay: number; exposureDay: number }
  | { version: 1; type: 'inventory'; items: ItemInstance[] }
  | { version: 1; type: 'item-ownership-changed'; item: ItemInstance }
  | { version: 1; type: 'shift'; cellId: string; shiftEpoch: number }
  | { version: 1; type: 'trace'; mark: SurfaceMark }
  | { version: 1; type: 'presence'; playerIds: string[] }
  | { version: 1; type: 'chat'; senderAlias: string; body: string }
  | { version: 1; type: 'exit-discovered'; destinationId: string }
  | { version: 1; type: 'transition'; destinationId: string; status: 'pending' | 'available' };

export interface GameAuthority {
  createOrLoadCharacter(): Promise<{ characterId: string }>;
  submitCommand(command: ClientCommand): Promise<void>;
  subscribe(listener: (event: ServerEvent) => void): () => void;
}
