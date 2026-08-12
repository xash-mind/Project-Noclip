export const CELL_SIZE = 14;
export const WALL_HEIGHT = 3.2;
export const WALL_THICKNESS = 0.28;
export const DOOR_WIDTH = 3.2;
export const LEVEL0_FOG_START = 26;
export const LEVEL0_FOG_END = 41;

export type Direction = 'north' | 'east' | 'south' | 'west';
export type StabilityClass = 'disorienting' | 'semi-stable' | 'stable' | 'rendezvous' | 'terminal';
export type GenerationVersion = 'gen2' | 'gen3-v1';
export type GeometryKind = 'euclidean' | 'non-euclidean';
export type RegionId = 'ordinary-level-0' | 'arch-rooms' | 'pillar-field';
export type MaterialId =
  | 'level-0-wallpaper'
  | 'level-0-carpet'
  | 'level-0-ceiling'
  | 'fluorescent-panel'
  | 'arch-pale-wallpaper';
export type ConditionId = 'damp-carpet' | 'deep-wet-carpet' | 'shallow-dry-carpet' | 'blackout';
export type CarverId = 'floor-hole-cluster';
export type StructureId = 'manila-room' | 'exit-structure';
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
  'sign'
] as const;
export type PropKind = typeof PROP_KINDS[number];

export const FLOOR_PATCH_KINDS = ['damp', 'worn', 'dark', 'dry', 'hole'] as const;
export type FloorPatchKind = typeof FLOOR_PATCH_KINDS[number];
export type LightState = 'on' | 'off' | 'flicker';
export type SpatialProfile = 'standard' | 'sparse-vista' | 'thin-channel' | 'pillar-expanse';
export type RoomComponentId =
  | 'open-void'
  | 'offset-partition'
  | 'cross-partition'
  | 'thin-corridor'
  | 'alcove-pair'
  | 'pillar-scatter'
  | 'pillar-lattice'
  | 'arch-run'
  | 'service-bank'
  | 'divider-run'
  | 'bench-island'
  | 'storage-corner'
  | 'hole-field'
  | 'hole-rail';

export interface WorldAddress {
  worldSeed: string;
  levelId: 'level-0';
  generationVersion: GenerationVersion;
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
  materialId?: MaterialId;
}

export interface PropSpec {
  id: string;
  kind: PropKind;
  position: LocalPoint;
  scale: LocalPoint;
  rotationY?: number;
  solid?: boolean;
  materialVariant?: number;
  materialId?: MaterialId;
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
  fixtures: LocalPoint[];
  rotationY: 0 | 90;
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

export interface WorldSemanticDescriptor {
  generationVersion: GenerationVersion;
  levelId: 'level-0';
  regionId: RegionId;
  geometry: GeometryKind;
  materialIds: MaterialId[];
  conditionIds: ConditionId[];
  carverIds: CarverId[];
  structureIds: StructureId[];
  featureIds: string[];
  transitionIds: string[];
  regionStrength: number;
  blackoutStrength: number;
  blackoutEscapeCue: number;
}

export interface CellDescriptor {
  id: string;
  address: WorldAddress;
  world: WorldSemanticDescriptor;
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
  regionOverride?: RegionId;
  conditionOverride?: 'clear' | 'blackout';
  carverOverride?: 'none' | CarverId;
  structureOverride?: 'none' | 'manila-room';
  labAudioMonitor: boolean;
  /** Legacy save/diagnostic compatibility only. New World Lab controls use canonical categories. */
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
  labAudioMonitor: true,
  gateBypass: false
};

export function cellId(x: number, z: number): string { return `${x}:${z}`; }
export function addressId(address: WorldAddress): string {
  return `level-0:${address.generationVersion}:${address.cellX}:${address.cellZ}:${address.zoneId}:${address.districtId}:s${address.shiftEpoch}`;
}
