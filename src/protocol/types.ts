import type { ItemInstance } from '../items/types.js';
import type { SurfaceMark } from '../persistence/types.js';
export const PROTOCOL_VERSION = 1;
export type ClientCommand =
  | { version: 1; type: 'move'; x: number; z: number; tick: number }
  | { version: 1; type: 'interact'; targetId: string; tick: number }
  | { version: 1; type: 'draw'; mark: SurfaceMark; tick: number }
  | { version: 1; type: 'pickup'; itemId: string; tick: number }
  | { version: 1; type: 'drop'; itemId: string; tick: number }
  | { version: 1; type: 'use'; itemId: string; tick: number }
  | { version: 1; type: 'wait'; waiting: boolean; tick: number }
  | { version: 1; type: 'chat'; message: string; tick: number };
export type ServerEvent =
  | { version: 1; type: 'inventory'; items: ItemInstance[] }
  | { version: 1; type: 'mark'; mark: SurfaceMark }
  | { version: 1; type: 'presence'; playerIds: string[] }
  | { version: 1; type: 'chat'; alias: string; message: string }
  | { version: 1; type: 'transition'; destinationId: string };
