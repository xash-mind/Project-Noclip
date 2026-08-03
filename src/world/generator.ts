import { exitsForCell } from './exits.js';
import { stableId, unitFloat, intInRange, weightedChoice } from './hash.js';
import { chooseZone, ZONE_PROFILES } from './zones.js';
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
  type Openings,
  type WallSpec,
  type WorldAddress,
  type WorldTuning
} from './types.js';
import { ITEM_DEFINITIONS, type ItemDefinitionId } from '../items/definitions.js';

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

function wall(id: string, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, orientation: 'x' | 'z', drawable = true): WallSpec {
  return { id, cx, cy, cz, sx, sy, sz, orientation, drawable };
}

function boundaryWallParts(seed: string, x: number, z: number, direction: Direction, open: boolean): WallSpec[] {
  const half = CELL_SIZE / 2;
  const sideLength = open ? (CELL_SIZE - DOOR_WIDTH) / 2 : CELL_SIZE;
  const parts: WallSpec[] = [];
  const base = stableId('surface', seed, x, z, direction);
  if (direction === 'north' || direction === 'south') {
    const zPos = direction === 'north' ? -half : half;
    if (!open) parts.push(wall(base, 0, WALL_HEIGHT / 2, zPos, CELL_SIZE, WALL_HEIGHT, WALL_THICKNESS, 'z'));
    else {
      const offset = DOOR_WIDTH / 2 + sideLength / 2;
      parts.push(wall(`${base}:a`, -offset, WALL_HEIGHT / 2, zPos, sideLength, WALL_HEIGHT, WALL_THICKNESS, 'z'));
      parts.push(wall(`${base}:b`, offset, WALL_HEIGHT / 2, zPos, sideLength, WALL_HEIGHT, WALL_THICKNESS, 'z'));
    }
  } else {
    const xPos = direction === 'west' ? -half : half;
    if (!open) parts.push(wall(base, xPos, WALL_HEIGHT / 2, 0, WALL_THICKNESS, WALL_HEIGHT, CELL_SIZE, 'x'));
    else {
      const offset = DOOR_WIDTH / 2 + sideLength / 2;
      parts.push(wall(`${base}:a`, xPos, WALL_HEIGHT / 2, -offset, WALL_THICKNESS, WALL_HEIGHT, sideLength, 'x'));
      parts.push(wall(`${base}:b`, xPos, WALL_HEIGHT / 2, offset, WALL_THICKNESS, WALL_HEIGHT, sideLength, 'x'));
    }
  }
  return parts;
}

function splitInteriorWall(seed: string, x: number, z: number, variant: number, shiftEpoch: number): WallSpec[] {
  if (variant % 4 === 0) return [];
  const horizontal = (variant + shiftEpoch) % 2 === 0;
  const offset = ((variant % 3) - 1) * 2.2;
  const length = CELL_SIZE - 2.4;
  const segment = (length - DOOR_WIDTH) / 2;
  const gapOffset = ((variant + shiftEpoch) % 3 - 1) * 2.1;
  const leftCenter = -length / 2 + segment / 2 + Math.max(0, gapOffset);
  const rightCenter = length / 2 - segment / 2 + Math.min(0, gapOffset);
  const id = stableId('partition', seed, x, z, variant, shiftEpoch);
  if (horizontal) {
    return [
      wall(`${id}:a`, leftCenter, WALL_HEIGHT / 2, offset, segment, WALL_HEIGHT, WALL_THICKNESS, 'z'),
      wall(`${id}:b`, rightCenter, WALL_HEIGHT / 2, offset, segment, WALL_HEIGHT, WALL_THICKNESS, 'z')
    ];
  }
  return [
    wall(`${id}:a`, offset, WALL_HEIGHT / 2, leftCenter, WALL_THICKNESS, WALL_HEIGHT, segment, 'x'),
    wall(`${id}:b`, offset, WALL_HEIGHT / 2, rightCenter, WALL_THICKNESS, WALL_HEIGHT, segment, 'x')
  ];
}

function lootForCell(seed: string, x: number, z: number, lootChance: number): LootNode[] {
  const nodes: LootNode[] = [];
  const weights = Object.values(ITEM_DEFINITIONS).map((definition) => ({ value: definition.id, weight: definition.worldWeight }));
  for (let index = 0; index < 2; index += 1) {
    const id = stableId('loot', seed, x, z, index);
    const spawn = unitFloat(`${id}:spawn`) < lootChance * (index === 0 ? 1 : 0.45);
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
  const zoneId = chooseZone(seed, x, z, worldDay, exposure, tuning);
  const profile = ZONE_PROFILES[zoneId];
  const address: WorldAddress = { worldSeed: seed, levelId: 'level-0', cellX: x, cellZ: z, zoneId, shiftEpoch };
  const openings = generateOpenings(seed, x, z, tuning.extraOpeningChance);
  const variant = intInRange(`${seed}:variant:${x}:${z}`, 0, 9);
  const walls: WallSpec[] = [];
  for (const direction of Object.keys(DIRECTIONS) as Direction[]) walls.push(...boundaryWallParts(seed, x, z, direction, openings[direction]));
  walls.push(...splitInteriorWall(seed, x, z, variant, shiftEpoch));

  const exits = exitsForCell(seed, x, z, worldDay, exposure, tuning.gateBypass);
  return {
    id: cellId(x, z),
    address,
    stability: profile.stability,
    openings,
    variant,
    walls,
    lootNodes: zoneId === 'manila' ? [] : lootForCell(seed, x, z, tuning.lootChance),
    exits,
    lightFailure: zoneId === 'blackout' || unitFloat(`${addressId(address)}:light`) < 0.055,
    hallucinationAnchor: profile.stability === 'disorienting' && unitFloat(`${seed}:hallucination:${x}:${z}`) < 0.035
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
