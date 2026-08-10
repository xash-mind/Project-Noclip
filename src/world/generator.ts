import { ITEM_DEFINITIONS, type ItemDefinitionId } from '../items/definitions.js';
import { exitsForCell } from './exits.js';
import { intInRange, stableId, unitFloat, weightedChoice } from './hash.js';
import { boundaryWallParts, chooseArchetype, layoutFor } from './layouts.js';
import { generateLightGroups, validateLightClearance } from './lighting.js';
import { makeNote } from './notes.js';
import { chooseZone, districtId, ZONE_PROFILES } from './zones.js';
import {
  CELL_SIZE,
  DOOR_WIDTH,
  WALL_HEIGHT,
  WALL_THICKNESS,
  cellId,
  type CellDescriptor,
  type Direction,
  type LootNode,
  type NoteSpec,
  type Openings,
  type PropSpec,
  type RoomArchetype,
  type WallSpec,
  type WorldAddress,
  type WorldTuning,
  type ZoneId
} from './types.js';

const DIRECTIONS: Record<Direction, [number, number]> = {
  north: [0, -1],
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0]
};

const PLAYER_ARRIVAL_CLEARANCE = 0.82;
const LOOT_CLEARANCE = 0.38;
const LOOT_PLACEMENT_ATTEMPTS = 48;
const OPTIONAL_SCENERY_KEEP_CHANCE = 0.22;
const OPTIONAL_SCENERY_MAX_PER_CELL = 1;
const OPTIONAL_SCENERY_CLEARANCE = 0.08;
const ARCH_CEILING_CLEARANCE = 0.28;
const ARCH_BEAM_HEIGHT = 0.46;

interface PlacementBounds {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

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
  return {
    id: wall.id,
    minX: wall.cx - wall.sx / 2,
    maxX: wall.cx + wall.sx / 2,
    minZ: wall.cz - wall.sz / 2,
    maxZ: wall.cz + wall.sz / 2
  };
}

function propBounds(prop: PropSpec): PlacementBounds {
  const rotated = Math.abs((prop.rotationY ?? 0) % 180) > 45;
  const sizeX = rotated ? prop.scale.z : prop.scale.x;
  const sizeZ = rotated ? prop.scale.x : prop.scale.z;
  return {
    id: prop.id,
    minX: prop.position.x - sizeX / 2,
    maxX: prop.position.x + sizeX / 2,
    minZ: prop.position.z - sizeZ / 2,
    maxZ: prop.position.z + sizeZ / 2
  };
}

function boundsOverlap(left: PlacementBounds, right: PlacementBounds, clearance = 0): boolean {
  return left.minX < right.maxX + clearance
    && left.maxX > right.minX - clearance
    && left.minZ < right.maxZ + clearance
    && left.maxZ > right.minZ - clearance;
}

function circleOverlapsBounds(x: number, z: number, radius: number, bounds: PlacementBounds): boolean {
  return x + radius > bounds.minX && x - radius < bounds.maxX && z + radius > bounds.minZ && z - radius < bounds.maxZ;
}

function isClear(x: number, z: number, radius: number, occupied: readonly PlacementBounds[]): boolean {
  return occupied.every((bounds) => !circleOverlapsBounds(x, z, radius, bounds));
}

export function isEssentialSceneryProp(archetype: RoomArchetype, prop: PropSpec): boolean {
  if (archetype === 'manila-room' || archetype === 'transition-foyer') return true;
  return prop.kind === 'divider'
    || prop.kind === 'pipe'
    || prop.kind === 'column'
    || prop.kind === 'wall-panel'
    || prop.kind === 'ceiling-gap'
    || prop.kind === 'sign';
}

function applyArchClearance(archetype: RoomArchetype, props: readonly PropSpec[]): PropSpec[] {
  if (archetype !== 'arch-gallery' && archetype !== 'arch-crossing') return [...props];
  const beamBottom = WALL_HEIGHT - ARCH_CEILING_CLEARANCE - ARCH_BEAM_HEIGHT;
  return props.map((prop) => {
    if (prop.kind === 'column') {
      return {
        ...prop,
        position: { ...prop.position, y: beamBottom / 2 },
        scale: { ...prop.scale, y: beamBottom }
      };
    }
    if (prop.kind === 'wall-panel') {
      return {
        ...prop,
        position: { ...prop.position, y: beamBottom + ARCH_BEAM_HEIGHT / 2 },
        scale: { ...prop.scale, y: ARCH_BEAM_HEIGHT }
      };
    }
    return prop;
  });
}

function filterOptionalScenery(seed: string, x: number, z: number, archetype: RoomArchetype, walls: readonly WallSpec[], props: readonly PropSpec[]): PropSpec[] {
  const occupied: PlacementBounds[] = [
    ...walls.map(wallBounds),
    ...props.filter((prop) => prop.solid && isEssentialSceneryProp(archetype, prop)).map(propBounds)
  ];
  const retained: PropSpec[] = [];
  let optionalRetained = 0;

  for (const prop of props) {
    if (isEssentialSceneryProp(archetype, prop)) {
      retained.push(prop);
      continue;
    }
    if (optionalRetained >= OPTIONAL_SCENERY_MAX_PER_CELL) continue;
    if (unitFloat(`${seed}:scenery:${x}:${z}:${prop.id}`) >= OPTIONAL_SCENERY_KEEP_CHANCE) continue;
    if (prop.solid) {
      const candidate = propBounds(prop);
      if (occupied.some((bounds) => boundsOverlap(candidate, bounds, OPTIONAL_SCENERY_CLEARANCE))) continue;
      occupied.push(candidate);
    }
    retained.push(prop);
    optionalRetained += 1;
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

function solidBounds(walls: readonly WallSpec[], props: readonly PropSpec[]): PlacementBounds[] {
  return [
    ...walls.map(wallBounds),
    ...props.filter((prop) => prop.solid).map(propBounds)
  ];
}

function lootCandidate(id: string, attempt: number): { x: number; y: number; z: number } {
  const xKey = attempt === 0 ? `${id}:x` : `${id}:placement:${attempt}:x`;
  const zKey = attempt === 0 ? `${id}:z` : `${id}:placement:${attempt}:z`;
  return {
    x: -4.8 + unitFloat(xKey) * 9.6,
    y: 0.28,
    z: -4.8 + unitFloat(zKey) * 9.6
  };
}

function findSafeLootPosition(id: string, occupied: readonly PlacementBounds[]): { x: number; y: number; z: number } | undefined {
  for (let attempt = 0; attempt < LOOT_PLACEMENT_ATTEMPTS; attempt += 1) {
    const candidate = lootCandidate(id, attempt);
    if (isClear(candidate.x, candidate.z, LOOT_CLEARANCE, occupied)) return candidate;
  }
  return undefined;
}

function lootForCell(seed: string, x: number, z: number, lootChance: number, archetype: RoomArchetype, walls: readonly WallSpec[], props: readonly PropSpec[]): LootNode[] {
  const nodes: LootNode[] = [];
  const occupied = solidBounds(walls, props);
  const weights = Object.values(ITEM_DEFINITIONS).map((definition) => ({ value: definition.id, weight: definition.worldWeight }));
  const count = archetype === 'wide-lobby' || archetype === 'maintenance-bay' ? 3 : 2;
  for (let index = 0; index < count; index += 1) {
    const id = stableId('loot', seed, x, z, index);
    const bonus = archetype === 'maintenance-bay' ? 1.2 : archetype === 'open-office' ? 1.05 : 0.85;
    const spawn = unitFloat(`${id}:spawn`) < lootChance * bonus * (index === 0 ? 1 : 0.42);
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
}

export function generateCell(options: GenerateCellOptions): CellDescriptor {
  const { seed, x, z, worldDay, exposure, shiftEpoch, tuning } = options;
  const exits = exitsForCell(seed, x, z, worldDay, exposure, tuning.gateBypass);
  let zoneId = chooseZone(seed, x, z, worldDay, exposure, tuning);
  if (exits.length > 0 && zoneId !== 'manila') zoneId = 'exit-threshold';
  const profile = ZONE_PROFILES[zoneId];
  const dId = districtId(x, z);
  const address: WorldAddress = { worldSeed: seed, levelId: 'level-0', cellX: x, cellZ: z, zoneId, districtId: dId, shiftEpoch };
  const openings = generateOpenings(seed, x, z, tuning.extraOpeningChance);
  const variant = intInRange(`${seed}:variant:${x}:${z}:${shiftEpoch}`, 0, Math.max(10, Math.round(18 * tuning.roomVariation)));
  const archetype = chooseArchetype(seed, x, z, zoneId, shiftEpoch);
  const materialVariant = intInRange(`${seed}:wall-material:${x}:${z}`, 0, 5);
  const walls: WallSpec[] = [];
  for (const direction of Object.keys(DIRECTIONS) as Direction[]) walls.push(...boundaryWallParts(seed, x, z, direction, openings[direction], materialVariant));
  const layout = layoutFor(seed, x, z, archetype, shiftEpoch, variant);
  walls.push(...layout.walls);
  const archClearedProps = applyArchClearance(archetype, layout.props);
  const filteredProps = filterOptionalScenery(seed, x, z, archetype, walls, archClearedProps);
  const arrivalSafe = reserveOriginArrival(x, z, walls, filteredProps);
  const noteSpecs = [...layout.notes, ...maybeNotes(seed, x, z, archetype)];
  const ceilingPattern = intInRange(`${seed}:ceiling:${x}:${z}`, 0, 4);
  const lightGroups = generateLightGroups({
    seed,
    x,
    z,
    shiftEpoch,
    zoneId,
    roomArchetype: archetype,
    ceilingPattern,
    walls: arrivalSafe.walls,
    props: arrivalSafe.props
  });
  const lightTemperature = lightGroups.length > 0
    ? lightGroups.reduce((sum, group) => sum + group.temperature, 0) / lightGroups.length
    : 0.94;

  return {
    id: cellId(x, z),
    address,
    stability: profile.stability,
    openings,
    variant,
    roomArchetype: archetype,
    roomLabel: layout.label,
    walls: arrivalSafe.walls,
    props: arrivalSafe.props,
    floorPatches: layout.patches.filter((patch) => patch.kind === 'hole'),
    notes: noteSpecs,
    lootNodes: zoneId === 'manila' ? [] : lootForCell(seed, x, z, tuning.lootChance, archetype, arrivalSafe.walls, arrivalSafe.props),
    exits,
    lightGroups,
    lightFailure: lightGroups.length === 0 || lightGroups.every((group) => group.state === 'off'),
    lightTemperature,
    ceilingPattern,
    hallucinationAnchor: profile.stability === 'disorienting' && unitFloat(`${seed}:hallucination:${x}:${z}`) < 0.032
  };
}

export function validateSceneryPlacement(cell: CellDescriptor): string[] {
  const errors: string[] = [];
  const solidProps = cell.props.filter((prop) => prop.solid);
  for (const prop of solidProps) {
    if (isEssentialSceneryProp(cell.roomArchetype, prop)) continue;
    const bounds = propBounds(prop);
    for (const wall of cell.walls) {
      if (boundsOverlap(bounds, wallBounds(wall))) errors.push(`Scenery ${prop.id} overlaps wall ${wall.id}`);
    }
    for (const other of solidProps) {
      if (other.id === prop.id) continue;
      if (boundsOverlap(bounds, propBounds(other))) errors.push(`Scenery ${prop.id} overlaps prop ${other.id}`);
    }
  }
  return errors;
}

export function validateCellPlacement(cell: CellDescriptor): string[] {
  const errors: string[] = [...validateSceneryPlacement(cell), ...validateLightClearance(cell.lightGroups, cell.walls, cell.props)];
  const occupied = solidBounds(cell.walls, cell.props);
  if (cell.address.cellX === 0 && cell.address.cellZ === 0) {
    for (const bounds of occupied) {
      if (circleOverlapsBounds(0, 0, PLAYER_ARRIVAL_CLEARANCE, bounds)) errors.push(`Arrival overlaps ${bounds.id}`);
    }
  }
  const spawned = cell.lootNodes.filter((node) => node.spawnedDefinitionId);
  for (const node of spawned) {
    for (const bounds of occupied) {
      if (circleOverlapsBounds(node.localPosition.x, node.localPosition.z, LOOT_CLEARANCE, bounds)) errors.push(`Loot ${node.id} overlaps ${bounds.id}`);
    }
  }
  for (let left = 0; left < spawned.length; left += 1) {
    for (let right = left + 1; right < spawned.length; right += 1) {
      const a = spawned[left]!;
      const b = spawned[right]!;
      if (Math.hypot(a.localPosition.x - b.localPosition.x, a.localPosition.z - b.localPosition.z) < LOOT_CLEARANCE * 2) errors.push(`Loot ${a.id} overlaps loot ${b.id}`);
    }
  }
  return errors;
}

export function validateCellConnectivity(seed: string, radius: number, extraOpeningChance: number): string[] {
  const errors: string[] = [];
  for (let x = -radius; x <= radius; x += 1) {
    for (let z = -radius; z <= radius; z += 1) {
      const openings = generateOpenings(seed, x, z, extraOpeningChance);
      for (const [direction, [dx, dz]] of Object.entries(DIRECTIONS) as Array<[Direction, [number, number]]>) {
        const opposite: Record<Direction, Direction> = { north: 'south', south: 'north', east: 'west', west: 'east' };
        const neighbor = generateOpenings(seed, x + dx, z + dz, extraOpeningChance);
        if (openings[direction] !== neighbor[opposite[direction]]) errors.push(`Mismatched edge ${x},${z} ${direction}`);
      }
    }
  }
  return errors;
}
