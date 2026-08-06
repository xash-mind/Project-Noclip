export const CELL_SIZE = 14;
export const WALL_HEIGHT = 3.2;
export const WALL_THICKNESS = 0.28;
export const DOOR_WIDTH = 3.2;

export type Direction = 'north' | 'east' | 'south' | 'west';
export type StabilityClass = 'disorienting' | 'semi-stable' | 'stable' | 'rendezvous' | 'terminal';
export type ZoneId = 'baseline' | 'arch' | 'pillar' | 'blackout' | 'holes' | 'manila' | 'exit-threshold';
export type RoomArchetype =
  | 'open-office'
  | 'split-suite'
  | 'narrow-hall'
  | 'alcove-ring'
  | 'service-corner'
  | 'wide-lobby'
  | 'arch-gallery'
  | 'arch-crossing'
  | 'pillar-grid'
  | 'pillar-aisle'
  | 'maintenance-bay'
  | 'flooded-corridor'
  | 'hole-gallery'
  | 'broken-floor'
  | 'manila-room'
  | 'transition-foyer';

export const PROP_KINDS = [
  'table',
  'chair',
  'cabinet',
  'box',
  'divider',
  'pipe',
  'column',
  'bench',
  'book',
  'wall-panel',
  'ceiling-gap',
  'stain',
  'carpet-patch',
  'sign',
  'arch-segment'
] as const;
export type PropKind = typeof PROP_KINDS[number];

export const FLOOR_PATCH_KINDS = ['damp', 'worn', 'dark', 'dry', 'hole'] as const;
export type FloorPatchKind = typeof FLOOR_PATCH_KINDS[number];

export type SpatialProfile = 'standard' | 'sparse-vista' | 'thin-channel' | 'pillar-expanse';
export type RoomComponentId =
  | 'open-void'
  | 'partition-cross'
  | 'partition-offset'
  | 'thin-corridor'
  | 'desk-cluster'
  | 'storage-corner'
  | 'alcove-pair'
  | 'service-bank'
  | 'pillar-lattice'
  | 'arch-run'
  | 'bench-island'
  | 'floor-wear'
  | 'floor-damp'
  | 'hole-field';
export type LightState = 'on' | 'off' | 'flicker';

export interface WorldAddress {
  worldSeed: string;
  levelId: 'level-0';
  cellX: number;
  cellZ: number;
  zoneId: ZoneId;
  districtId: string;
  shiftEpoch: number;
}

export interface Openings {
  north: boolean;
  east: boolean;
  south: boolean;
  west: boolean;
}

export interface LocalPoint {
  x: number;
  y: number;
  z: number;
}

export interface WallSpec {
  id: string;
  cx: number;
  cy: number;
  cz: number;
  sx: number;
  sy: number;
  sz: number;
  orientation: 'x' | 'z';
  drawable: boolean;
  materialVariant?: number;
}

export interface PropSpec {
  id: string;
  kind: PropKind;
  position: LocalPoint;
  scale: LocalPoint;
  rotationY?: number;
  rotationX?: number;
  rotationZ?: number;
  solid?: boolean;
  materialVariant?: number;
}

export interface FloorPatchSpec {
  id: string;
  position: LocalPoint;
  scale: LocalPoint;
  kind: FloorPatchKind;
}

export interface NoteSpec {
  id: string;
  title: string;
  body: string;
  attribution?: string;
  localPosition: LocalPoint;
  rotationY?: number;
  source: 'manila-book' | 'office-memo' | 'maintenance-note' | 'warning';
}


export interface LightGroupSpec {
  id: string;
  position: LocalPoint;
  axis: 'x' | 'z';
  fixtureCount: number;
  spacing: number;
  state: LightState;
  intensity: number;
  temperature: number;
  flickerRate: number;
  phase: number;
}

export interface LootNode {
  id: string;
  localPosition: LocalPoint;
  spawnedDefinitionId?: string;
}

export interface ExitDescriptor {
  id: string;
  destinationId: string;
  label: string;
  trigger: 'gradual' | 'wall-breach' | 'floor-breach' | 'emergency-door' | 'greenhouse-door' | 'manila-wait' | 'anomalous-wall';
  localPosition: LocalPoint;
  minimumWorldDay: number;
  minimumExposure: number;
  enabled: boolean;
}

export interface CellDescriptor {
  id: string;
  address: WorldAddress;
  stability: StabilityClass;
  openings: Openings;
  variant: number;
  roomArchetype: RoomArchetype;
  roomLabel: string;
  spatialProfile: SpatialProfile;
  componentIds: RoomComponentId[];
  compositionSignature: string;
  walls: WallSpec[];
  props: PropSpec[];
  floorPatches: FloorPatchSpec[];
  notes: NoteSpec[];
  lootNodes: LootNode[];
  exits: ExitDescriptor[];
  lightGroups: LightGroupSpec[];
  lightFailure: boolean;
  lightTemperature: number;
  ceilingPattern: number;
  hallucinationAnchor: boolean;
}

export interface WorldTuning {
  activeRadius: number;
  extraOpeningChance: number;
  lootChance: number;
  shiftChance: number;
  roomVariation: number;
  zoneOverride?: ZoneId;
  worldDayOverride?: number;
  exposureOverride?: number;
  gateBypass: boolean;
}

export const DEFAULT_TUNING: WorldTuning = {
  activeRadius: 3,
  extraOpeningChance: 0.16,
  lootChance: 0.085,
  shiftChance: 0.18,
  roomVariation: 1,
  gateBypass: false
};

export function cellId(x: number, z: number): string { return `${x}:${z}`; }
export function addressId(address: WorldAddress): string {
  return `level-0:${address.cellX}:${address.cellZ}:${address.zoneId}:${address.districtId}:s${address.shiftEpoch}`;
}
