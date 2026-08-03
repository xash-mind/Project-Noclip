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
  faceSign?: -1 | 1;
  createdAt: number;
  expiresAt?: number;
  revision: number;
}

export interface DroppedItemState {
  item: ItemInstance;
  x: number;
  y: number;
  z: number;
  activatedAt?: number;
}

export interface CharacterSettings {
  sensitivity: number;
  reducedMotion: boolean;
  reducedFlicker: boolean;
  masterVolume: number;
}

interface SaveCommon {
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

export interface SaveDataV1 extends SaveCommon { version: 1; }
export interface SaveDataV2 extends SaveCommon {
  version: 2;
  readNoteIds: string[];
  enteredZoneIds: string[];
}
export type SaveData = SaveDataV2;

function validPosition(value: unknown): value is SaveCommon['position'] {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return ['x', 'y', 'z', 'yaw', 'pitch'].every((key) => typeof candidate[key] === 'number' && Number.isFinite(candidate[key]));
}

export function migrateSave(input: unknown): SaveData | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const candidate = input as Partial<SaveDataV1> & Partial<SaveDataV2> & Record<string, unknown>;
  if ((candidate.version !== 1 && candidate.version !== 2) || typeof candidate.characterId !== 'string' || typeof candidate.seed !== 'string') return undefined;
  if (!validPosition(candidate.position) || !Array.isArray(candidate.inventory) || !candidate.exposure || !Array.isArray(candidate.droppedItems)) return undefined;
  const settings: CharacterSettings = {
    sensitivity: typeof candidate.settings?.sensitivity === 'number' ? candidate.settings.sensitivity : 0.095,
    reducedMotion: Boolean(candidate.settings?.reducedMotion),
    reducedFlicker: Boolean(candidate.settings?.reducedFlicker),
    masterVolume: typeof candidate.settings?.masterVolume === 'number' ? candidate.settings.masterVolume : 0.68
  };
  return {
    ...(candidate as SaveDataV1),
    version: 2,
    inventory: candidate.inventory.filter((item): item is ItemInstance => Boolean(item && typeof item === 'object' && typeof (item as ItemInstance).instanceId === 'string')),
    droppedItems: candidate.droppedItems.filter((drop): drop is DroppedItemState => Boolean(drop && typeof drop === 'object' && (drop as DroppedItemState).item)),
    pickedLootNodeIds: Array.isArray(candidate.pickedLootNodeIds) ? candidate.pickedLootNodeIds.filter((id): id is string => typeof id === 'string') : [],
    marks: Array.isArray(candidate.marks) ? candidate.marks.filter((mark): mark is SurfaceMark => Boolean(mark && typeof mark === 'object' && Array.isArray((mark as SurfaceMark).points))) : [],
    shiftEpochs: candidate.shiftEpochs ?? {},
    unloadCounts: candidate.unloadCounts ?? {},
    discoveredExits: Array.isArray(candidate.discoveredExits) ? candidate.discoveredExits : [],
    readNoteIds: Array.isArray(candidate.readNoteIds) ? candidate.readNoteIds.filter((id): id is string => typeof id === 'string') : [],
    enteredZoneIds: Array.isArray(candidate.enteredZoneIds) ? candidate.enteredZoneIds.filter((id): id is string => typeof id === 'string') : [],
    hydration: typeof candidate.hydration === 'number' ? Math.max(0, Math.min(1, candidate.hydration)) : 0.76,
    settings,
    savedAt: typeof candidate.savedAt === 'number' ? candidate.savedAt : Date.now()
  };
}
