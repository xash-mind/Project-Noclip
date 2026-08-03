import { ITEM_DEFINITIONS, type ItemDefinitionId } from '../items/definitions.js';
import { exitsForCell } from './exits.js';
import { intInRange, stableId, unitFloat, weightedChoice } from './hash.js';
import { boundaryWallParts, chooseArchetype, layoutFor } from './layouts.js';
import { makeNote } from './notes.js';
import { chooseZone, districtId, ZONE_PROFILES } from './zones.js';
import {
  CELL_SIZE,
  DOOR_WIDTH,
  WALL_HEIGHT,
  WALL_THICKNESS,
  addressId,
  cellId,
  type CellDescriptor,
  type Direction,
  type LootNode,
  type NoteSpec,
  type Openings,
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

function lootForCell(seed: string, x: number, z: number, lootChance: number, archetype: RoomArchetype): LootNode[] {
  const nodes: LootNode[] = [];
  const weights = Object.values(ITEM_DEFINITIONS).map((definition) => ({ value: definition.id, weight: definition.worldWeight }));
  const count = archetype === 'wide-lobby' || archetype === 'maintenance-bay' ? 3 : 2;
  for (let index = 0; index < count; index += 1) {
    const id = stableId('loot', seed, x, z, index);
    const bonus = archetype === 'maintenance-bay' ? 1.2 : archetype === 'open-office' ? 1.05 : 0.85;
    const spawn = unitFloat(`${id}:spawn`) < lootChance * bonus * (index === 0 ? 1 : 0.42);
    const node: LootNode = {
      id,
      localPosition: {
        x: -4.8 + unitFloat(`${id}:x`) * 9.6,
        y: 0.28,
        z: -4.8 + unitFloat(`${id}:z`) * 9.6
      }
    };
    if (spawn) node.spawnedDefinitionId = weightedChoice(`${id}:item`, weights).value as ItemDefinitionId;
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
  const noteSpecs = [...layout.notes, ...maybeNotes(seed, x, z, archetype)];

  return {
    id: cellId(x, z),
    address,
    stability: profile.stability,
    openings,
    variant,
    roomArchetype: archetype,
    roomLabel: layout.label,
    walls,
    props: layout.props,
    floorPatches: layout.patches,
    notes: noteSpecs,
    lootNodes: zoneId === 'manila' ? [] : lootForCell(seed, x, z, tuning.lootChance, archetype),
    exits,
    lightFailure: zoneId === 'blackout' || unitFloat(`${addressId(address)}:light`) < 0.045,
    lightTemperature: 0.82 + unitFloat(`${addressId(address)}:temperature`) * 0.24,
    ceilingPattern: intInRange(`${seed}:ceiling:${x}:${z}`, 0, 4),
    hallucinationAnchor: profile.stability === 'disorienting' && unitFloat(`${seed}:hallucination:${x}:${z}`) < 0.032
  };
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
