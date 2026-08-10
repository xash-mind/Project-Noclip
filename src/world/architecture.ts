import { sampleWorldFields, type WorldFieldSample } from './fields.js';
import {
  CELL_SIZE,
  WALL_HEIGHT,
  WALL_THICKNESS,
  type PropSpec,
  type RoomComponentId,
  type SpatialProfile,
  type WallSpec
} from './types.js';

const PLAYER_CLEARANCE = 0.82;
const SUPPORT_CLEARANCE = 0.24;
const TRAVERSAL_RADIUS = 0.34;
const TRAVERSAL_STEP = 0.45;
const TRAVERSAL_LIMIT = CELL_SIZE / 2 - 1.35;
const INTERIOR_LIMIT = CELL_SIZE / 2 - 1.15;
const SUPPORT_GRID = [-4.7, -2.35, 0, 2.35, 4.7] as const;

interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface BaselineArchitecturePilotInput {
  seed: string;
  cellX: number;
  cellZ: number;
  legacyWallIds: readonly string[];
  legacySolidPropIds: readonly string[];
}

export interface BaselineArchitecturePilotResult {
  walls: WallSpec[];
  props: PropSpec[];
  label: string;
  spatialProfile: SpatialProfile;
  componentIds: RoomComponentId[];
  compositionSignature: string;
  fields: WorldFieldSample;
}

function wallBounds(wall: WallSpec): Bounds {
  return {
    minX: wall.cx - wall.sx / 2,
    maxX: wall.cx + wall.sx / 2,
    minZ: wall.cz - wall.sz / 2,
    maxZ: wall.cz + wall.sz / 2
  };
}

function propBounds(prop: PropSpec): Bounds {
  return {
    minX: prop.position.x - prop.scale.x / 2,
    maxX: prop.position.x + prop.scale.x / 2,
    minZ: prop.position.z - prop.scale.z / 2,
    maxZ: prop.position.z + prop.scale.z / 2
  };
}

function overlaps(left: Bounds, right: Bounds, clearance = 0): boolean {
  return left.minX < right.maxX + clearance
    && left.maxX > right.minX - clearance
    && left.minZ < right.maxZ + clearance
    && left.maxZ > right.minZ - clearance;
}

function overlapsArrival(bounds: Bounds): boolean {
  const nearestX = Math.max(bounds.minX, Math.min(0, bounds.maxX));
  const nearestZ = Math.max(bounds.minZ, Math.min(0, bounds.maxZ));
  return Math.hypot(nearestX, nearestZ) < PLAYER_CLEARANCE;
}

function pointBlocked(x: number, z: number, occupied: readonly Bounds[]): boolean {
  return occupied.some((bounds) => x > bounds.minX - TRAVERSAL_RADIUS
    && x < bounds.maxX + TRAVERSAL_RADIUS
    && z > bounds.minZ - TRAVERSAL_RADIUS
    && z < bounds.maxZ + TRAVERSAL_RADIUS);
}

function traversalReachabilityErrors(walls: readonly WallSpec[], props: readonly PropSpec[]): string[] {
  const occupied = [...walls.map(wallBounds), ...props.filter((prop) => prop.solid).map(propBounds)];
  const maxIndex = Math.floor(TRAVERSAL_LIMIT / TRAVERSAL_STEP);
  const bandIndex = Math.floor(maxIndex * 0.72);
  const encode = (gx: number, gz: number): string => `${gx}:${gz}`;
  const coordinate = (grid: number): number => grid * TRAVERSAL_STEP;
  if (pointBlocked(0, 0, occupied)) return ['Pilot traversal origin is blocked'];
  const visited = new Set<string>([encode(0, 0)]);
  const queue: Array<[number, number]> = [[0, 0]];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [gx, gz] = queue[cursor]!;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = gx + dx; const nz = gz + dz;
      if (Math.abs(nx) > maxIndex || Math.abs(nz) > maxIndex) continue;
      const key = encode(nx, nz);
      if (visited.has(key)) continue;
      if (pointBlocked(coordinate(nx), coordinate(nz), occupied)) continue;
      visited.add(key); queue.push([nx, nz]);
    }
  }
  const anyReachable = (points: Array<[number, number]>): boolean => points.some(([gx, gz]) => visited.has(encode(gx, gz)));
  const lateral = Array.from({ length: bandIndex * 2 + 1 }, (_, index) => index - bandIndex);
  const targets: Array<[string, Array<[number, number]>]> = [
    ['north', lateral.map((gx) => [gx, -maxIndex])],
    ['east', lateral.map((gz) => [maxIndex, gz])],
    ['south', lateral.map((gx) => [gx, maxIndex])],
    ['west', lateral.map((gz) => [-maxIndex, gz])]
  ];
  return targets.flatMap(([label, points]) => anyReachable(points) ? [] : [`Pilot traversal cannot reach ${label} interior edge band`]);
}

function quantize(value: number, buckets = 5): number {
  return Math.min(buckets - 1, Math.floor(Math.max(0, Math.min(0.999999, value)) * buckets));
}

function classifyProfile(fields: WorldFieldSample): SpatialProfile {
  if (fields.openness >= 0.68 && fields.partitionPressure <= 0.58) return 'sparse-vista';
  if (fields.roomScale <= 0.34 && fields.partitionPressure >= 0.56) return 'thin-channel';
  return 'standard';
}

function makeWall(id: string, index: number, count: number, fields: WorldFieldSample): WallSpec {
  const flowNorthSouth = fields.axisFlow >= 0.5;
  const partitionIndex = Math.floor(index / 2);
  const side = index % 2 === 0 ? -1 : 1;
  const pairCount = Math.max(1, Math.ceil(count / 2));
  const spacing = 2.05 + fields.roomScale * 1.45 + fields.partitionPressure * 0.45;
  const offsetMagnitude = pairCount === 1
    ? (fields.regularity - 0.5) * 1.8
    : (partitionIndex - (pairCount - 1) / 2) * spacing;
  const gapWidth = 3.05 + fields.connectivityPressure * 1.05 + fields.openness * 0.62 - fields.partitionPressure * 0.32;
  const gapDrift = (fields.regularity - 0.5) * 1.45;
  const extent = 5.18 + fields.partitionPressure * 0.26 - fields.openness * 0.24;
  const negativeLength = Math.max(0.75, extent + gapDrift - gapWidth / 2);
  const positiveLength = Math.max(0.75, extent - gapDrift - gapWidth / 2);
  const length = side < 0 ? negativeLength : positiveLength;
  const along = side < 0 ? -extent + length / 2 : extent - length / 2;
  const materialVariant = (quantize(fields.regularity) + index) % 5;

  if (flowNorthSouth) {
    return {
      id,
      cx: along,
      cy: WALL_HEIGHT / 2,
      cz: offsetMagnitude,
      sx: length,
      sy: WALL_HEIGHT,
      sz: WALL_THICKNESS,
      orientation: 'z',
      drawable: true,
      materialVariant
    };
  }
  return {
    id,
    cx: offsetMagnitude,
    cy: WALL_HEIGHT / 2,
    cz: along,
    sx: WALL_THICKNESS,
    sy: WALL_HEIGHT,
    sz: length,
    orientation: 'x',
    drawable: true,
    materialVariant
  };
}

function supportCandidates(fields: WorldFieldSample): Array<[number, number]> {
  const candidates: Array<[number, number]> = [];
  for (const x of SUPPORT_GRID) for (const z of SUPPORT_GRID) {
    if (Math.hypot(x, z) < 1.55) continue;
    candidates.push([x, z]);
  }
  const offset = Math.floor(fields.columnPressure * candidates.length);
  return candidates.map((_, index) => candidates[(index + offset) % candidates.length]!);
}

function makeSupports(ids: readonly string[], fields: WorldFieldSample, walls: readonly WallSpec[]): PropSpec[] {
  const retained: PropSpec[] = [];
  const occupied: Bounds[] = walls.map(wallBounds);
  const size = 0.46 + fields.columnPressure * 0.22;
  const candidates = supportCandidates(fields);

  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index]!;
    let selected: PropSpec | undefined;
    for (let attempt = 0; attempt < candidates.length; attempt += 1) {
      const candidateIndex = (index * 7 + attempt) % candidates.length;
      const [x, z] = candidates[candidateIndex]!;
      const prop: PropSpec = {
        id,
        kind: 'column',
        position: { x, y: WALL_HEIGHT / 2, z },
        scale: { x: size, y: WALL_HEIGHT, z: size },
        rotationY: 0,
        solid: true,
        materialVariant: (quantize(fields.columnPressure) + index) % 5
      };
      const bounds = propBounds(prop);
      if (overlapsArrival(bounds)) continue;
      if (occupied.some((entry) => overlaps(bounds, entry, SUPPORT_CLEARANCE))) continue;
      selected = prop;
      occupied.push(bounds);
      break;
    }
    if (!selected) throw new Error(`Generation 3 pilot could not place compatibility support ${id}`);
    retained.push(selected);
  }
  return retained;
}

/**
 * Slice-B pilot boundary: only ordinary baseline open-office cells consume the
 * Generation 3 architecture solver. The legacy archetype remains as migration
 * metadata while the generated geometry itself is Field-driven.
 */
export function isBaselineArchitecturePilot(zoneId: string, archetype: string): boolean {
  return zoneId === 'baseline' && archetype === 'open-office';
}

/**
 * Solve one Cell's internal Euclidean architecture from continuous Fields.
 *
 * `legacyWallIds` and `legacySolidPropIds` are compatibility identity slots
 * from the accepted Gen-2 layout. The new geometry reuses those exact IDs so
 * existing persisted SurfaceMarks remain addressable and collider cardinality
 * stays bounded while the recognizable module geometry is retired on this
 * pilot path.
 */
export function solveBaselineArchitecturePilot(input: BaselineArchitecturePilotInput): BaselineArchitecturePilotResult {
  const worldX = input.cellX * CELL_SIZE;
  const worldZ = input.cellZ * CELL_SIZE;
  const fields = sampleWorldFields(input.seed, worldX, worldZ);
  const walls = input.legacyWallIds.map((id, index) => makeWall(id, index, input.legacyWallIds.length, fields));
  const props = makeSupports(input.legacySolidPropIds, fields, walls);
  const flowLabel = fields.axisFlow >= 0.5 ? 'north–south flow' : 'east–west flow';
  const spatialProfile = classifyProfile(fields);
  const compositionSignature = [
    'gen3-field-pilot',
    fields.axisFlow >= 0.5 ? 'ns' : 'ew',
    `o${quantize(fields.openness)}`,
    `p${quantize(fields.partitionPressure)}`,
    `s${quantize(fields.roomScale)}`,
    `c${quantize(fields.columnPressure)}`,
    `w${walls.length}`,
    `k${props.length}`
  ].join(':');
  return {
    walls,
    props,
    label: `field-solved open office · ${flowLabel}`,
    spatialProfile,
    componentIds: [],
    compositionSignature,
    fields
  };
}

export function validateBaselineArchitecturePilot(walls: readonly WallSpec[], props: readonly PropSpec[]): string[] {
  const errors: string[] = [];
  const wallBoundsList = walls.map(wallBounds);
  const propBoundsList = props.map(propBounds);
  for (const wall of walls) {
    const bounds = wallBounds(wall);
    if (Math.max(Math.abs(bounds.minX), Math.abs(bounds.maxX), Math.abs(bounds.minZ), Math.abs(bounds.maxZ)) > INTERIOR_LIMIT + 0.01) errors.push(`Pilot wall ${wall.id} exceeds interior bound`);
    if (overlapsArrival(bounds)) errors.push(`Pilot wall ${wall.id} blocks arrival clearance`);
  }
  for (let index = 0; index < props.length; index += 1) {
    const prop = props[index]!;
    const bounds = propBoundsList[index]!;
    if (!prop.solid || prop.kind !== 'column') errors.push(`Pilot support ${prop.id} is not a solid column`);
    if (Math.max(Math.abs(bounds.minX), Math.abs(bounds.maxX), Math.abs(bounds.minZ), Math.abs(bounds.maxZ)) > INTERIOR_LIMIT + 0.01) errors.push(`Pilot support ${prop.id} exceeds interior bound`);
    if (overlapsArrival(bounds)) errors.push(`Pilot support ${prop.id} blocks arrival clearance`);
    for (const wallBoundsEntry of wallBoundsList) if (overlaps(bounds, wallBoundsEntry, SUPPORT_CLEARANCE)) errors.push(`Pilot support ${prop.id} overlaps wall`);
    for (let other = index + 1; other < props.length; other += 1) if (overlaps(bounds, propBoundsList[other]!, SUPPORT_CLEARANCE)) errors.push(`Pilot support ${prop.id} overlaps support ${props[other]!.id}`);
  }
  errors.push(...traversalReachabilityErrors(walls, props));
  return errors;
}
