import type { ItemInstance } from '../items/types.js';
import type { ExposureState } from '../simulation/timeline.js';

export interface SurfaceMark {
  id: string;
  creatorId: string;
  surfaceId: string;
  cellId: string;
  shiftEpoch: number;
  points: Array<[number, number]>;
  thickness: number;
  ink: 'black' | 'red' | 'blue';
  scope: 'personal' | 'echo' | 'encounter' | 'canonical';
  createdAt: number;
  expiresAt?: number;
  revision: number;
}

export interface DroppedItemState {
  item: ItemInstance;
  x: number;
  y: number;
  z: number;
}

export interface CharacterSettings {
  sensitivity: number;
  reducedMotion: boolean;
  reducedFlicker: boolean;
  masterVolume: number;
}

export interface SaveDataV1 {
  version: 1;
  characterId: string;
  seed: string;
  createdAt: number;
  starterRolled: true;
  position: { x: number; y: number; z: number; yaw: number; pitch: number };
  inventory: ItemInstance[];
  selectedItemId?: string;
  droppedItems: DroppedItemState[];
  pickedLootNodeIds: string[];
  marks: SurfaceMark[];
  hydration: number;
  exposure: ExposureState;
  shiftEpochs: Record<string, number>;
  unloadCounts: Record<string, number>;
  discoveredExits: string[];
  pendingTransition?: { destinationId: string; exitId: string; discoveredAt: number };
  settings: CharacterSettings;
  savedAt: number;
}

export type SaveData = SaveDataV1;

export function migrateSave(input: unknown): SaveData | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const candidate = input as Partial<SaveDataV1>;
  if (candidate.version !== 1 || typeof candidate.characterId !== 'string' || typeof candidate.seed !== 'string') return undefined;
  if (!candidate.position || !Array.isArray(candidate.inventory) || !candidate.exposure) return undefined;
  return candidate as SaveDataV1;
}
