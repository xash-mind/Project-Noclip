import { ITEM_DEFINITIONS, type ItemDefinitionId } from '../items/definitions.js';
import { isBaselineArchitecturePilot, solveBaselineArchitecturePilot } from './architecture.js';
import { exitsForCell } from './exits.js';
import { intInRange, stableId, unitFloat, weightedChoice } from './hash.js';
import { boundaryWallParts, chooseArchetype, layoutFor } from './layouts.js';
import { generateLightGroups, validateLightClearance } from './lighting.js';
import { isGen2Compatibility } from './gen2Compatibility.js';
import { generateGen3Layout, sampleGen3Environment } from './gen3.js';
import { sampleGen3RegionInfluence } from './gen3Architecture.js';
import { makeNote } from './notes.js';
import { generateManilaRoom, isManilaRoomAvailable, manilaRoomCell } from './structures.js';
import { chooseZone, districtId, isManilaRoomCell, ZONE_PROFILES } from './zones.js';
import {
  CELL_SIZE,
  cellId,
  type CellDescriptor,
  type Direction,
  type ExitDescriptor,
  type FloorPatchSpec,
  type GenerationVersion,
  type LootNode,
  type NoteSpec,
  type Openings,
  type PropSpec,
  type RoomArchetype,
  type WallSpec,
  type WorldAddress,
  type WorldTuning
} from './types.js';

const DIRECTIONS: Record<Direction, [number, number]> = {
  north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0]
};
const PLAYER_ARRIVAL_CLEARANCE = 0.82;
const LOOT_CLEARANCE = 0.38;
const LOOT_PLACEMENT_ATTEMPTS = 48;
const OPTIONAL_SCENERY_KEEP_CHANCE = 0.22;
const OPTIONAL_SCENERY_MAX_PER_CELL = 1;
const OPTIONAL_SCENERY_CLEARANCE = 0.08;

interface PlacementBounds { id: string; minX: number; maxX: number; minZ: number; maxZ: number; }

function parentOf(seed: string, x: number, z: number): [number, number] | undefined {
  if (x === 0 && z === 0) return undefined;
  if (x === 0) return [0, z - Math.sign(z)];
  if (z === 0) return [x - Math.sign(x), 0];
  const chooseX = unitFloat(`${seed}:parent:${x}:${z}`) < 0.5;
  return chooseX ? [x - Math.sign(x), z] : [x, z - Math.sign(z)];
}

function canonicalEdge(x1: number, z1: number, x2: number, z2: number): string {
  return x1 < x2 || (x1 === x2 && z1 <= z2) ? `${x1},${z1}|${x2},${z2}` : `${x2},${z2}|${x1},${z1}`;
}

export function isEdgeOpen(seed: string, x1: number, z1: number, x2: number, z2: number, extraOpeningChance: number): boolean {
  if (x1 === 0 && z1 === 0) return true;
  if (x2 === 0 && z2 === 0) return true;
  const p1 = parentOf(seed, x1, z1);
  const p2 = parentOf(seed, x2, z2);
  if (p1?.[0] === x2 && p1[1] === z2) return true;
  if (p2?.[0] === x1 && p2[1] === z1) return true;
  return unitFloat(`${seed}:edge:${canonicalEdge(x1, z1, x2, z2)}`) < extraOpeningChance;
}

export function generateOpenings(seed: string, x: number, z: number, extraOpeningChance: number): Openings {
  return {
    north: isEdgeOpen(seed, x, z, x, z - 1, extraOpeningChance),
    east: isEdgeOpen(seed, x, z, x + 1, z, extraOpeningChance),
    south: isEdgeOpen(seed, x, z, x, z + 1, extraOpeningChance),
    west: isEdgeOpen(seed, x, z, x - 1, z, extraOpeningChance)
  };
}

function maybeNotes(seed: string, x: number, z: number, archetype: RoomArchetype): NoteSpec[] {
  if (archetype === 'manila-room') return [];
  if (x === 1 && z === 0) return [makeNote(stableId('note', seed, 'first-memo'), 'wetFloor', -3.8, 2.8, 'office-memo')];
  const roll = unitFloat(`${seed}:note:${x}:${z}`);
  if (roll > 0.045) return [];
  const variants = ['wetFloor', 'margin', 'utility', 'warning'] as const;
  const key = variants[intInRange(`${seed}:note-kind:${x}:${z}`, 0, variants.length)]!;
  const source = key === 'utility' ? 'maintenance-note' : key === 'warning' ? 'warning' : 'office-memo';
  return [makeNote(stableId('note', seed, x, z), key, -4.4 + unitFloat(`${seed}:note-x:${x}:${z}`) * 8.8, -4.4 + unitFloat(`${seed}:note-z:${x}:${z}`) * 8.8, source)];
}

function wallBounds(wall: WallSpec): PlacementBounds {
  return { id: wall.id, minX: wall.cx - wall.sx / 2, maxX: wall.cx + wall.sx / 2, minZ: wall.cz - wall.sz / 2, maxZ: wall.cz + wall.sz / 2 };
}
function propBounds(prop: PropSpec): PlacementBounds {
  const rotated = Math.abs((prop.rotationY ?? 0) % 180) > 45;
  const sizeX = rotated ? prop.scale.z : prop.scale.x; const sizeZ = rotated ? prop.scale.x : prop.scale.z;
  return { id: prop.id, minX: prop.position.x - sizeX / 2, maxX: prop.position.x + sizeX / 2, minZ: prop.position.z - sizeZ / 2, maxZ: prop.position.z + sizeZ / 2 };
}
function boundsOverlap(left: PlacementBounds, right: PlacementBounds, clearance = 0): boolean {
  return left.minX < right.maxX + clearance && left.maxX > right.minX - clearance && left.minZ < right.maxZ + clearance && left.maxZ > right.minZ - clearance;
}
function filterGen3Props(walls: readonly WallSpec[], patches: readonly FloorPatchSpec[], props: readonly PropSpec[]): PropSpec[] {
  const occupied = walls.map(wallBounds);
  const holes: PlacementBounds[] = patches
    .filter((patch) => patch.kind === 'hole')
    .map((patch) => ({
      id: patch.id,
      minX: patch.position.x - patch.scale.x / 2,
      maxX: patch.position.x + patch.scale.x / 2,
      minZ: patch.position.z - patch.scale.z / 2,
      maxZ: patch.position.z + patch.scale.z / 2
    }));
  const retained: PropSpec[] = [];
  for (const prop of props) {
    if (!prop.solid) {
      retained.push(prop);
      continue;
    }
    const candidate = propBounds(prop);
    if (occupied.some((bounds) => boundsOverlap(candidate, bounds, 0.08))) continue;
    if (holes.some((bounds) => boundsOverlap(candidate, bounds, 0.16))) continue;
    retained.push(prop);
    occupied.push(candidate);
  }
  return retained;
}
function circleOverlapsBounds(x: number, z: number, radius: number, bounds: PlacementBounds): boolean {
  return x + radius > bounds.minX && x - radius < bounds.maxX && z + radius > bounds.minZ && z - radius < bounds.maxZ;
}
function isClear(x: number, z: number, radius: number, occupied: readonly PlacementBounds[]): boolean {
  return occupied.every((bounds) => !circleOverlapsBounds(x, z, radius, bounds));
}

export function isEssentialSceneryProp(archetype: RoomArchetype, prop: PropSpec): boolean {
  if (archetype === 'manila-room' || archetype === 'transition-foyer') return true;
  return prop.kind === 'divider' || prop.kind === 'pipe' || prop.kind === 'column' || prop.kind === 'wall-panel' || prop.kind === 'ceiling-gap' || prop.kind === 'sign';
}

function filterOptionalScenery(seed: string, x: number, z: number, archetype: RoomArchetype, walls: readonly WallSpec[], props: readonly PropSpec[]): PropSpec[] {
  const occupied: PlacementBounds[] = [...walls.map(wallBounds), ...props.filter((prop) => prop.solid && isEssentialSceneryProp(archetype, prop)).map(propBounds)];
  const retained: PropSpec[] = [];
  let optionalRetained = 0;
  for (const prop of props) {
    if (isEssentialSceneryProp(archetype, prop)) { retained.push(prop); continue; }
    if (optionalRetained >= OPTIONAL_SCENERY_MAX_PER_CELL) continue;
    if (unitFloat(`${seed}:scenery:${x}:${z}:${prop.id}`) >= OPTIONAL_SCENERY_KEEP_CHANCE) continue;
    if (prop.solid) {
      const candidate = propBounds(prop);
      if (occupied.some((bounds) => boundsOverlap(candidate, bounds, OPTIONAL_SCENERY_CLEARANCE))) continue;
      occupied.push(candidate);
    }
    retained.push(prop); optionalRetained += 1;
  }
  return retained;
}

function reserveOriginArrival(x: number, z: number, walls: readonly WallSpec[], props: readonly PropSpec[]): { walls: WallSpec[]; props: PropSpec[] } {
  if (x !== 0 || z !== 0) return { walls: [...walls], props: [...props] };
  return {
    walls: walls.filter((wall) => !circleOverlapsBounds(0, 0, PLAYER_ARRIVAL_CLEARANCE, wallBounds(wall))),
    props: props.filter((prop) => !prop.solid || !circleOverlapsBounds(0, 0, PLAYER_ARRIVAL_CLEARANCE, propBounds(prop)))
  };
}

function reserveGen3OriginArrival(x: number, z: number, walls: readonly WallSpec[], props: readonly PropSpec[]): { walls: WallSpec[]; props: PropSpec[] } {
  if (x !== 0 || z !== 0) return { walls: [...walls], props: [...props] };
  // New journeys face north. Preserve a short, deterministic first-walk lane
  // as well as the spawn disc so a valid origin cannot immediately read as a
  // trap on keyboard or touch. This applies only to gen3-v1; frozen Gen2
  // geometry remains byte-for-byte governed by its compatibility path.
  const forwardLane: PlacementBounds = {
    id: 'gen3-origin-forward-lane',
    minX: -0.82,
    maxX: 0.82,
    minZ: -3.6,
    maxZ: 0.82
  };
  const obstructsArrival = (bounds: PlacementBounds): boolean =>
    circleOverlapsBounds(0, 0, PLAYER_ARRIVAL_CLEARANCE, bounds) || boundsOverlap(bounds, forwardLane);
  return {
    walls: walls.filter((wall) => !obstructsArrival(wallBounds(wall))),
    props: props.filter((prop) => !prop.solid || !obstructsArrival(propBounds(prop)))
  };
}

function reserveTransitions(exits: readonly ExitDescriptor[], walls: readonly WallSpec[], props: readonly PropSpec[]): { walls: WallSpec[]; props: PropSpec[] } {
  if (exits.length === 0) return { walls: [...walls], props: [...props] };
  const overlapsTransition = (bounds: PlacementBounds): boolean => exits.some((exit) => {
    const radius = exit.trigger === 'floor-breach' ? 1.9 : exit.trigger === 'wall-breach' ? 1.55 : 1.7;
    return circleOverlapsBounds(exit.localPosition.x, exit.localPosition.z, radius, bounds);
  });
  return {
    walls: walls.filter((candidate) => !overlapsTransition(wallBounds(candidate))),
    props: props.filter((candidate) => !candidate.solid || !overlapsTransition(propBounds(candidate)))
  };
}
function solidBounds(walls: readonly WallSpec[], props: readonly PropSpec[]): PlacementBounds[] { return [...walls.map(wallBounds), ...props.filter((prop) => prop.solid).map(propBounds)]; }
function lootCandidate(id: string, attempt: number): { x: number; y: number; z: number } {
  const xKey = attempt === 0 ? `${id}:x` : `${id}:placement:${attempt}:x`;
  const zKey = attempt === 0 ? `${id}:z` : `${id}:placement:${attempt}:z`;
  return { x: -4.8 + unitFloat(xKey) * 9.6, y: 0.28, z: -4.8 + unitFloat(zKey) * 9.6 };
}
function findSafeLootPosition(id: string, occupied: readonly PlacementBounds[]): { x: number; y: number; z: number } | undefined {
  for (let attempt = 0; attempt < LOOT_PLACEMENT_ATTEMPTS; attempt += 1) { const candidate = lootCandidate(id, attempt); if (isClear(candidate.x, candidate.z, LOOT_CLEARANCE, occupied)) return candidate; }
  return undefined;
}
function lootForCell(seed: string, x: number, z: number, lootChance: number, archetype: RoomArchetype, walls: readonly WallSpec[], props: readonly PropSpec[]): LootNode[] {
  const nodes: LootNode[] = []; const occupied = solidBounds(walls, props);
  const weights = Object.values(ITEM_DEFINITIONS).map((definition) => ({ value: definition.id, weight: definition.worldWeight }));
  const count = archetype === 'wide-lobby' || archetype === 'maintenance-bay' ? 3 : 2;
  for (let index = 0; index < count; index += 1) {
    const id = stableId('loot', seed, x, z, index); const bonus = archetype === 'maintenance-bay' ? 1.2 : archetype === 'open-office' ? 1.05 : 0.85;
    const spawn = unitFloat(`${id}:spawn`) < lootChance * bonus * (index === 0 ? 1 : 0.42); const originalPosition = lootCandidate(id, 0); const safePosition = spawn ? findSafeLootPosition(id, occupied) : originalPosition;
    const node: LootNode = { id, localPosition: safePosition ?? originalPosition };
    if (spawn && safePosition) { node.spawnedDefinitionId = weightedChoice(`${id}:item`, weights).value as ItemDefinitionId; occupied.push({ id, minX: safePosition.x - LOOT_CLEARANCE, maxX: safePosition.x + LOOT_CLEARANCE, minZ: safePosition.z - LOOT_CLEARANCE, maxZ: safePosition.z + LOOT_CLEARANCE }); }
    nodes.push(node);
  }
  return nodes;
}

function lootForGen3Cell(seed: string, x: number, z: number, lootChance: number, walls: readonly WallSpec[], props: readonly PropSpec[]): LootNode[] {
  const nodes: LootNode[] = [];
  const occupied = solidBounds(walls, props);
  const weights = Object.values(ITEM_DEFINITIONS).map((definition) => ({ value: definition.id, weight: definition.worldWeight }));
  for (let index = 0; index < 2; index += 1) {
    const id = stableId('loot', seed, x, z, index);
    const spawn = unitFloat(`${id}:spawn`) < lootChance * (index === 0 ? 1 : 0.42);
    const originalPosition = lootCandidate(id, 0);
    const safePosition = spawn ? findSafeLootPosition(id, occupied) : originalPosition;
    const node: LootNode = { id, localPosition: safePosition ?? originalPosition };
    if (spawn && safePosition) {
      node.spawnedDefinitionId = weightedChoice(`${id}:item`, weights).value as ItemDefinitionId;
      occupied.push({
        id,
        minX: safePosition.x - LOOT_CLEARANCE,
        maxX: safePosition.x + LOOT_CLEARANCE,
        minZ: safePosition.z - LOOT_CLEARANCE,
        maxZ: safePosition.z + LOOT_CLEARANCE
      });
    }
    nodes.push(node);
  }
  return nodes;
}

export interface GenerateCellOptions {
  seed: string;
  x: number;
  z: number;
  worldDay: number;
  exposure: number;
  shiftEpoch: number;
  tuning: WorldTuning;
  generationVersion?: GenerationVersion;
}

export function generateLegacyCell(options: GenerateCellOptions): CellDescriptor {
  const { seed, x, z, worldDay, exposure, shiftEpoch, tuning } = options;
  const manilaRoom = isManilaRoomCell(seed, x, z, worldDay, exposure, tuning);
  let exits = manilaRoom ? [] : exitsForCell(seed, x, z, worldDay, exposure, tuning.gateBypass);
  let zoneId = manilaRoom ? 'baseline' as const : chooseZone(seed, x, z, worldDay, exposure, tuning);
  if (!manilaRoom && exits.length > 0) zoneId = 'exit-threshold';
  if (manilaRoom) exits = [];
  const profile = ZONE_PROFILES[zoneId]; const dId = districtId(x, z);
  const address: WorldAddress = { worldSeed: seed, levelId: 'level-0', generationVersion: 'gen2', cellX: x, cellZ: z, zoneId, districtId: dId, shiftEpoch };
  const openings = generateOpenings(seed, x, z, tuning.extraOpeningChance);
  const variant = intInRange(`${seed}:variant:${x}:${z}:${shiftEpoch}`, 0, Math.max(10, Math.round(18 * tuning.roomVariation)));
  const archetype: RoomArchetype = manilaRoom ? 'manila-room' : chooseArchetype(seed, x, z, zoneId, shiftEpoch);
  const materialVariant = intInRange(`${seed}:wall-material:${x}:${z}`, 0, 5);
  const boundaryWalls: WallSpec[] = [];
  for (const direction of Object.keys(DIRECTIONS) as Direction[]) boundaryWalls.push(...boundaryWallParts(seed, x, z, direction, openings[direction], materialVariant));

  const legacyLayout = layoutFor(seed, x, z, archetype, zoneId, shiftEpoch, variant, tuning.roomVariation);
  let roomLabel = legacyLayout.label;
  let spatialProfile = legacyLayout.spatialProfile;
  let componentIds = legacyLayout.componentIds;
  let compositionSignature = legacyLayout.compositionSignature;
  let arrivalSafe: { walls: WallSpec[]; props: PropSpec[] };

  if (isBaselineArchitecturePilot(zoneId, archetype)) {
    // Generate the accepted Gen-2 layout only to recover markable/collidable identity slots.
    // Its module geometry is not emitted on the pilot path.
    const legacyWalls = [...boundaryWalls, ...legacyLayout.walls];
    const legacyFilteredProps = filterOptionalScenery(seed, x, z, archetype, legacyWalls, legacyLayout.props);
    const legacySafe = reserveOriginArrival(x, z, legacyWalls, legacyFilteredProps);
    const boundaryIds = new Set(boundaryWalls.map((wall) => wall.id));
    const legacyWallIds = legacySafe.walls.filter((wall) => !boundaryIds.has(wall.id)).map((wall) => wall.id);
    const legacySolidPropIds = legacySafe.props.filter((prop) => prop.solid).map((prop) => prop.id);
    const pilot = solveBaselineArchitecturePilot({ seed, cellX: x, cellZ: z, legacyWallIds, legacySolidPropIds });
    arrivalSafe = { walls: [...boundaryWalls, ...pilot.walls], props: pilot.props };
    roomLabel = pilot.label;
    spatialProfile = pilot.spatialProfile;
    componentIds = pilot.componentIds;
    compositionSignature = pilot.compositionSignature;
  } else {
    const walls = [...boundaryWalls, ...legacyLayout.walls];
    const filteredProps = filterOptionalScenery(seed, x, z, archetype, walls, legacyLayout.props);
    arrivalSafe = reserveOriginArrival(x, z, walls, filteredProps);
  }

  const noteSpecs = [...legacyLayout.notes, ...maybeNotes(seed, x, z, archetype)]; const ceilingPattern = intInRange(`${seed}:ceiling:${x}:${z}`, 0, 4);
  const lightingZone = archetype === 'manila-room' ? 'manila' : zoneId;
  const lightGroups = generateLightGroups({ seed, x, z, shiftEpoch, zoneId: lightingZone, roomArchetype: archetype, ceilingPattern, walls: arrivalSafe.walls, props: arrivalSafe.props });
  const lightTemperature = lightGroups.length > 0 ? lightGroups.reduce((sum, group) => sum + group.temperature, 0) / lightGroups.length : 0.94;
  const effectiveStability = archetype === 'manila-room' ? ZONE_PROFILES.manila.stability : profile.stability;
  const regionId = zoneId === 'arch' ? 'arch-rooms' : zoneId === 'pillar' ? 'pillar-field' : 'ordinary-level-0';
  const conditionIds = zoneId === 'arch'
    ? ['deep-wet-carpet'] as const
    : zoneId === 'pillar'
      ? ['shallow-dry-carpet'] as const
      : zoneId === 'blackout'
        ? ['damp-carpet', 'blackout'] as const
        : ['damp-carpet'] as const;
  return {
    id: cellId(x, z), address,
    world: {
      generationVersion: 'gen2', levelId: 'level-0', regionId, geometry: 'euclidean',
      materialIds: ['level-0-wallpaper', 'level-0-carpet', 'level-0-ceiling', 'fluorescent-panel'],
      conditionIds: [...conditionIds], carverIds: zoneId === 'holes' ? ['floor-hole-cluster'] : [],
      structureIds: archetype === 'manila-room' ? ['manila-room'] : exits.length > 0 ? ['exit-structure'] : [],
      featureIds: [], transitionIds: exits.map((exit) => exit.id), regionStrength: 1,
      blackoutStrength: zoneId === 'blackout' ? 1 : 0, blackoutEscapeCue: 0
    },
    stability: effectiveStability, openings, variant, roomArchetype: archetype, roomLabel,
    spatialProfile, componentIds, compositionSignature,
    walls: arrivalSafe.walls, props: arrivalSafe.props, floorPatches: legacyLayout.patches.filter((patch) => patch.kind === 'hole'), notes: noteSpecs,
    lootNodes: archetype === 'manila-room' ? [] : lootForCell(seed, x, z, tuning.lootChance, archetype, arrivalSafe.walls, arrivalSafe.props), exits, lightGroups,
    lightFailure: lightGroups.length === 0 || lightGroups.every((group) => group.state === 'off'), lightTemperature, ceilingPattern,
    hallucinationAnchor: archetype !== 'manila-room' && profile.stability === 'disorienting' && unitFloat(`${seed}:hallucination:${x}:${z}`) < 0.032
  };
}

function gen3CompatibilityZone(regionId: CellDescriptor['world']['regionId']): CellDescriptor['address']['zoneId'] {
  if (regionId === 'arch-rooms') return 'arch';
  if (regionId === 'pillar-field') return 'pillar';
  return 'baseline';
}

function isGen3ManilaCell(options: GenerateCellOptions): boolean {
  const { seed, x, z, worldDay, exposure, tuning } = options;
  if (tuning.structureOverride === 'none') return false;
  if (tuning.structureOverride === 'manila-room') return x === 0 && z === 0;
  if (!isManilaRoomAvailable(worldDay, exposure, tuning.gateBypass)) return false;
  const target = manilaRoomCell(seed);
  return x === target.cellX && z === target.cellZ;
}

export function generateGen3Cell(options: GenerateCellOptions): CellDescriptor {
  const { seed, x, z, worldDay, exposure, shiftEpoch, tuning } = options;
  const worldX = x * CELL_SIZE;
  const worldZ = z * CELL_SIZE;
  const environment = sampleGen3Environment(seed, worldX, worldZ, worldDay, exposure, tuning);
  const manilaRoom = isGen3ManilaCell(options);
  const exits = manilaRoom ? [] : exitsForCell(seed, x, z, worldDay, exposure, tuning.gateBypass);
  const zoneId = gen3CompatibilityZone(environment.regionId);
  const address: WorldAddress = {
    worldSeed: seed,
    levelId: 'level-0',
    generationVersion: 'gen3-v1',
    cellX: x,
    cellZ: z,
    zoneId,
    districtId: `gen3:${Math.floor(x / 64)}:${Math.floor(z / 64)}`,
    shiftEpoch
  };
  const openings: Openings = { north: true, east: true, south: true, west: true };
  const variant = intInRange(`${seed}:gen3-variant:${x}:${z}`, 0, 32);
  const generated = generateGen3Layout({ seed, cellX: x, cellZ: z, worldDay, exposure, tuning, environment });

  let archetype: RoomArchetype = environment.regionId === 'arch-rooms'
    ? 'arch-gallery'
    : environment.regionId === 'pillar-field'
      ? 'pillar-grid'
      : 'open-office';
  let roomLabel = generated.label;
  let walls = generated.walls;
  let props = filterGen3Props(generated.walls, generated.patches, generated.props);
  let featureIds = generated.featureIds.filter((id) => props.some((prop) => prop.id === id));
  let carverIds = generated.carverIds;
  let patches = generated.patches;
  let notes = maybeNotes(seed, x, z, archetype);
  let componentIds: CellDescriptor['componentIds'] = [];
  let compositionSignature = generated.compositionSignature;
  const centerInfluence = sampleGen3RegionInfluence(seed, worldX, worldZ, worldDay, exposure, tuning);
  let spatialProfile: CellDescriptor['spatialProfile'] = centerInfluence.deepPillar > 0.72 ? 'pillar-expanse' : 'standard';
  const structureIds: CellDescriptor['world']['structureIds'] = [];

  if (manilaRoom) {
    archetype = 'manila-room';
    const structure = generateManilaRoom(seed, x, z, shiftEpoch);
    walls = structure.walls;
    props = structure.props;
    patches = structure.patches;
    notes = structure.notes;
    featureIds = [];
    carverIds = [];
    componentIds = [];
    compositionSignature = structure.compositionSignature;
    spatialProfile = 'standard';
    roomLabel = structure.label;
    structureIds.push('manila-room');
  } else if (exits.length > 0) {
    // Transitions remain overlays on the surrounding Region geometry. The
    // renderer owns their local door/breach visual; no "Threshold" geography
    // or legacy transition-foyer room replaces the generated world.
    archetype = 'open-office';
    componentIds = [];
    roomLabel = 'Transition structure';
    compositionSignature = `${generated.compositionSignature}:transition:${exits.map((exit) => exit.trigger).sort().join('+')}`;
    structureIds.push('exit-structure');
    const transitionSafe = reserveTransitions(exits, walls, props);
    walls = transitionSafe.walls;
    props = transitionSafe.props;
  }

  // Generation 3 Features already own their rarity and independent seed domain.
  // Do not pass them through Generation 2's room-scenery lottery a second time.
  const arrivalSafe = manilaRoom
    ? { walls: [...walls], props: [...props] }
    : reserveGen3OriginArrival(x, z, walls, props);
  featureIds = featureIds.filter((id) => arrivalSafe.props.some((prop) => prop.id === id));
  const ceilingPattern = intInRange(`${seed}:gen3-ceiling:${x}:${z}`, 0, 4);
  const lightingZone = manilaRoom ? 'manila' : 'baseline';
  const lightGroups = generateLightGroups({
    seed, x, z, shiftEpoch, zoneId: lightingZone, roomArchetype: archetype, ceilingPattern,
    walls: arrivalSafe.walls, props: arrivalSafe.props, blackoutStrength: environment.blackoutStrength
  });
  const lightTemperature = lightGroups.length > 0
    ? lightGroups.reduce((sum, group) => sum + group.temperature, 0) / lightGroups.length
    : 0.94;
  const intentionalIrregularity = !manilaRoom
  && environment.fields.abnormality > 0.84
  && environment.fields.stability < 0.3
  && unitFloat(`${seed}:gen3-v4:intentional-irregularity:${x}:${z}`) < 0.12;
const stability = manilaRoom
  ? ZONE_PROFILES.manila.stability
  : intentionalIrregularity
    ? 'disorienting'
    : centerInfluence.arch > 0.68
      ? 'stable'
      : 'semi-stable';
  return {
    id: cellId(x, z), address,
    world: {
      generationVersion: 'gen3-v1', levelId: 'level-0', regionId: environment.regionId, geometry: 'euclidean',
      materialIds: generated.materialIds, conditionIds: generated.conditionIds, carverIds,
      structureIds, featureIds, transitionIds: exits.map((exit) => exit.id),
      regionStrength: environment.regionStrength, blackoutStrength: environment.blackoutStrength,
      blackoutEscapeCue: environment.blackoutEscapeCue
    },
    stability, openings, variant, roomArchetype: archetype, roomLabel, spatialProfile, componentIds, compositionSignature,
    walls: arrivalSafe.walls, props: arrivalSafe.props, floorPatches: patches.filter((patch) => patch.kind === 'hole'), notes,
    lootNodes: manilaRoom ? [] : lootForGen3Cell(seed, x, z, tuning.lootChance, arrivalSafe.walls, arrivalSafe.props),
    exits, lightGroups, lightFailure: lightGroups.length === 0 || lightGroups.every((group) => group.state === 'off'),
    lightTemperature, ceilingPattern,
    hallucinationAnchor: !manilaRoom && intentionalIrregularity && unitFloat(`${seed}:gen3-v4:hallucination:${x}:${z}`) < 0.14
  };
}

export function generateCell(options: GenerateCellOptions): CellDescriptor {
  return isGen2Compatibility(options.generationVersion)
    ? generateLegacyCell(options)
    : generateGen3Cell(options);
}

export function validateSceneryPlacement(cell: CellDescriptor): string[] {
  const errors: string[] = []; const solidProps = cell.props.filter((prop) => prop.solid);
  for (const prop of solidProps) {
    if (isEssentialSceneryProp(cell.roomArchetype, prop)) continue;
    const bounds = propBounds(prop);
    for (const wall of cell.walls) if (boundsOverlap(bounds, wallBounds(wall))) errors.push(`Scenery ${prop.id} overlaps wall ${wall.id}`);
    for (const other of solidProps) if (other.id !== prop.id && boundsOverlap(bounds, propBounds(other))) errors.push(`Scenery ${prop.id} overlaps prop ${other.id}`);
  }
  return errors;
}

export function validateCellPlacement(cell: CellDescriptor): string[] {
  const errors: string[] = [...validateSceneryPlacement(cell), ...validateLightClearance(cell.lightGroups, cell.walls, cell.props)]; const occupied = solidBounds(cell.walls, cell.props);
  if (cell.address.cellX === 0 && cell.address.cellZ === 0) for (const bounds of occupied) if (circleOverlapsBounds(0, 0, PLAYER_ARRIVAL_CLEARANCE, bounds)) errors.push(`Arrival overlaps ${bounds.id}`);
  const spawned = cell.lootNodes.filter((node) => node.spawnedDefinitionId);
  for (const node of spawned) for (const bounds of occupied) if (circleOverlapsBounds(node.localPosition.x, node.localPosition.z, LOOT_CLEARANCE, bounds)) errors.push(`Loot ${node.id} overlaps ${bounds.id}`);
  for (let left = 0; left < spawned.length; left += 1) for (let right = left + 1; right < spawned.length; right += 1) { const a = spawned[left]!; const b = spawned[right]!; if (Math.hypot(a.localPosition.x - b.localPosition.x, a.localPosition.z - b.localPosition.z) < LOOT_CLEARANCE * 2) errors.push(`Loot ${a.id} overlaps loot ${b.id}`); }
  return errors;
}

export function validateCellConnectivity(seed: string, radius: number, extraOpeningChance: number): string[] {
  const errors: string[] = [];
  for (let x = -radius; x <= radius; x += 1) for (let z = -radius; z <= radius; z += 1) {
    const openings = generateOpenings(seed, x, z, extraOpeningChance);
    for (const [direction, [dx, dz]] of Object.entries(DIRECTIONS) as Array<[Direction, [number, number]]>) {
      const opposite: Record<Direction, Direction> = { north: 'south', south: 'north', east: 'west', west: 'east' }; const neighbor = generateOpenings(seed, x + dx, z + dz, extraOpeningChance);
      if (openings[direction] !== neighbor[opposite[direction]]) errors.push(`Mismatched edge ${x},${z} ${direction}`);
    }
  }
  return errors;
}
