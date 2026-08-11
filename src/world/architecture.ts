import { sampleWorldFieldChannels, sampleWorldFields, type WorldFieldSample } from './fields.js';
import { unitFloat } from './hash.js';
import {
  CELL_SIZE,
  DOOR_WIDTH,
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
const CELL_LIMIT = CELL_SIZE / 2;
const CONTINUITY_SAMPLE_OFFSET = CELL_SIZE * 1.5;
const CONNECTOR_LINE_CLEARANCE = DOOR_WIDTH / 2 + TRAVERSAL_RADIUS + WALL_THICKNESS / 2;
const SUPPORT_SPACING = 2.35;
const LATTICE_EPSILON = 0.002;
const CONTINUITY_FIELD_NAMES = ['axisFlow', 'regularity'] as const;

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

export interface BaselineArchitectureContinuitySample {
  flowNorthSouth: boolean;
  heading: number;
  corridorCenter: number;
  partitionCadence: number;
  partitionPhaseX: number;
  partitionPhaseZ: number;
  supportPhaseX: number;
  supportPhaseZ: number;
}

export interface BaselineArchitectureSeamMetrics {
  expectedLines: number;
  matchingLines: number;
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

function latticePhase(seed: string, domain: string, spacing: number): number {
  return unitFloat(`${seed}:gen3-architecture:${domain}`) * spacing;
}

function latticeOffsets(worldCenter: number, phase: number, spacing: number, limit: number): number[] {
  const first = Math.ceil((worldCenter - limit - phase) / spacing);
  const last = Math.floor((worldCenter + limit - phase) / spacing);
  const offsets: number[] = [];
  for (let index = first; index <= last; index += 1) offsets.push(phase + index * spacing - worldCenter);
  return offsets;
}

function partitionOffsets(worldCenter: number, phase: number, spacing: number, count: number): number[] {
  const candidates = latticeOffsets(worldCenter, phase, spacing, INTERIOR_LIMIT - WALL_THICKNESS / 2);
  const edgeReady = candidates.filter((offset) => Math.abs(offset) >= CONNECTOR_LINE_CLEARANCE);
  const nearConnector = candidates.filter((offset) => Math.abs(offset) < CONNECTOR_LINE_CLEARANCE);
  const ordered: number[] = [];
  const appendBalanced = (values: readonly number[]): void => {
    const negative = values.filter((value) => value < 0).sort((left, right) => Math.abs(left) - Math.abs(right));
    const positive = values.filter((value) => value >= 0).sort((left, right) => Math.abs(left) - Math.abs(right));
    while (negative.length > 0 || positive.length > 0) {
      const closestNegative = negative[0];
      const closestPositive = positive[0];
      if (closestNegative === undefined) ordered.push(positive.shift()!);
      else if (closestPositive === undefined) ordered.push(negative.shift()!);
      else if (Math.abs(closestNegative) <= Math.abs(closestPositive)) ordered.push(negative.shift()!);
      else ordered.push(positive.shift()!);
    }
  };
  appendBalanced(edgeReady);
  appendBalanced(nearConnector);
  if (ordered.length < count) throw new Error(`Generation 3 continuity lattice only supplied ${ordered.length} of ${count} partition lines`);
  return ordered.slice(0, count);
}

/**
 * Sample the slow world-space guide used by the Slice-C baseline pilot.
 *
 * The centre Field sample still controls local character. Four wider samples
 * low-pass the heading and corridor drift so neighboring Cells inherit one
 * architectural tendency instead of independently thresholding at each Cell
 * centre. Lattice phases live in their own seed domain and never reset at a
 * streaming boundary.
 */
export function sampleBaselineArchitectureContinuity(
  seed: string,
  worldX: number,
  worldZ: number,
  centerFields = sampleWorldFields(seed, worldX, worldZ)
): BaselineArchitectureContinuitySample {
  const west = sampleWorldFieldChannels(seed, worldX - CONTINUITY_SAMPLE_OFFSET, worldZ, CONTINUITY_FIELD_NAMES);
  const east = sampleWorldFieldChannels(seed, worldX + CONTINUITY_SAMPLE_OFFSET, worldZ, CONTINUITY_FIELD_NAMES);
  const north = sampleWorldFieldChannels(seed, worldX, worldZ - CONTINUITY_SAMPLE_OFFSET, CONTINUITY_FIELD_NAMES);
  const south = sampleWorldFieldChannels(seed, worldX, worldZ + CONTINUITY_SAMPLE_OFFSET, CONTINUITY_FIELD_NAMES);
  const heading = centerFields.axisFlow * 0.4
    + (west.axisFlow + east.axisFlow + north.axisFlow + south.axisFlow) * 0.15;
  const flowNorthSouth = heading >= 0.5;
  const lateralRegularity = flowNorthSouth
    ? centerFields.regularity * 0.5 + (north.regularity + south.regularity) * 0.25
    : centerFields.regularity * 0.5 + (west.regularity + east.regularity) * 0.25;
  const corridorCenter = Math.max(-1.2, Math.min(1.2, (lateralRegularity - 0.5) * 2.4));
  const partitionCadence = 3.65 + unitFloat(`${seed}:gen3-architecture:partition-cadence`) * 0.75;
  return {
    flowNorthSouth,
    heading,
    corridorCenter,
    partitionCadence,
    partitionPhaseX: latticePhase(seed, 'partition-phase:x', partitionCadence),
    partitionPhaseZ: latticePhase(seed, 'partition-phase:z', partitionCadence),
    supportPhaseX: latticePhase(seed, 'support-phase:x', SUPPORT_SPACING),
    supportPhaseZ: latticePhase(seed, 'support-phase:z', SUPPORT_SPACING)
  };
}

function makeWall(
  id: string,
  index: number,
  fields: WorldFieldSample,
  continuity: BaselineArchitectureContinuitySample,
  offsets: readonly number[]
): WallSpec {
  const flowNorthSouth = continuity.flowNorthSouth;
  const partitionIndex = Math.floor(index / 2);
  const side = index % 2 === 0 ? -1 : 1;
  const offsetMagnitude = offsets[partitionIndex]!;
  const gapWidth = 3.05 + fields.connectivityPressure * 1.05 + fields.openness * 0.62 - fields.partitionPressure * 0.32;
  const gapDrift = continuity.corridorCenter;
  const extent = Math.abs(offsetMagnitude) >= CONNECTOR_LINE_CLEARANCE
    ? CELL_LIMIT
    : 5.18 + fields.partitionPressure * 0.26 - fields.openness * 0.24;
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

function supportCandidates(
  worldX: number,
  worldZ: number,
  limit: number,
  fields: WorldFieldSample,
  continuity: BaselineArchitectureContinuitySample
): Array<[number, number]> {
  const candidates: Array<[number, number]> = [];
  const xOffsets = latticeOffsets(worldX, continuity.supportPhaseX, SUPPORT_SPACING, limit);
  const zOffsets = latticeOffsets(worldZ, continuity.supportPhaseZ, SUPPORT_SPACING, limit);
  for (const x of xOffsets) for (const z of zOffsets) {
    if (Math.hypot(x, z) < 1.55) continue;
    candidates.push([x, z]);
  }
  const offset = Math.floor(fields.columnPressure * candidates.length);
  return candidates.map((_, index) => candidates[(index + offset) % candidates.length]!);
}

function makeSupports(
  ids: readonly string[],
  worldX: number,
  worldZ: number,
  fields: WorldFieldSample,
  continuity: BaselineArchitectureContinuitySample,
  walls: readonly WallSpec[]
): PropSpec[] {
  const retained: PropSpec[] = [];
  const occupied: Bounds[] = walls.map(wallBounds);
  const size = 0.46 + fields.columnPressure * 0.22;
  const candidates = supportCandidates(worldX, worldZ, INTERIOR_LIMIT - size / 2, fields, continuity);

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
 * Bounded pilot boundary: only ordinary baseline open-office cells consume the
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
  const continuity = sampleBaselineArchitectureContinuity(input.seed, worldX, worldZ, fields);
  const pairCount = Math.ceil(input.legacyWallIds.length / 2);
  const perpendicularWorldCenter = continuity.flowNorthSouth ? worldZ : worldX;
  const perpendicularPhase = continuity.flowNorthSouth ? continuity.partitionPhaseZ : continuity.partitionPhaseX;
  const offsets = partitionOffsets(perpendicularWorldCenter, perpendicularPhase, continuity.partitionCadence, pairCount);
  const walls = input.legacyWallIds.map((id, index) => makeWall(id, index, fields, continuity, offsets));
  const props = makeSupports(input.legacySolidPropIds, worldX, worldZ, fields, continuity, walls);
  const flowLabel = continuity.flowNorthSouth ? 'north–south flow' : 'east–west flow';
  const spatialProfile = classifyProfile(fields);
  const compositionSignature = [
    'gen3-field-pilot',
    continuity.flowNorthSouth ? 'ns' : 'ew',
    `h${quantize(continuity.heading)}`,
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
    label: `field-solved open office · continuous ${flowLabel}`,
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
    const longExtent = wall.orientation === 'z'
      ? Math.max(Math.abs(bounds.minX), Math.abs(bounds.maxX))
      : Math.max(Math.abs(bounds.minZ), Math.abs(bounds.maxZ));
    const shortExtent = wall.orientation === 'z'
      ? Math.max(Math.abs(bounds.minZ), Math.abs(bounds.maxZ))
      : Math.max(Math.abs(bounds.minX), Math.abs(bounds.maxX));
    if (longExtent > CELL_LIMIT + 0.01 || shortExtent > INTERIOR_LIMIT + 0.01) errors.push(`Pilot wall ${wall.id} exceeds continuity-safe bound`);
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

function latticeDistance(value: number, phase: number, spacing: number): number {
  const index = Math.round((value - phase) / spacing);
  return Math.abs(value - (phase + index * spacing));
}

/** Verify that emitted pilot geometry is anchored to its world-space domains. */
export function validateBaselineArchitectureContinuity(
  seed: string,
  cellX: number,
  cellZ: number,
  walls: readonly WallSpec[],
  props: readonly PropSpec[]
): string[] {
  const worldX = cellX * CELL_SIZE;
  const worldZ = cellZ * CELL_SIZE;
  const continuity = sampleBaselineArchitectureContinuity(seed, worldX, worldZ);
  const expectedOrientation = continuity.flowNorthSouth ? 'z' : 'x';
  const partitionPhase = continuity.flowNorthSouth ? continuity.partitionPhaseZ : continuity.partitionPhaseX;
  const errors: string[] = [];
  for (const wall of walls) {
    if (wall.orientation !== expectedOrientation) errors.push(`Pilot wall ${wall.id} breaks continuity heading`);
    const perpendicular = continuity.flowNorthSouth ? worldZ + wall.cz : worldX + wall.cx;
    if (latticeDistance(perpendicular, partitionPhase, continuity.partitionCadence) > LATTICE_EPSILON) errors.push(`Pilot wall ${wall.id} resets partition cadence at Cell boundary`);
  }
  for (const prop of props) {
    if (latticeDistance(worldX + prop.position.x, continuity.supportPhaseX, SUPPORT_SPACING) > LATTICE_EPSILON
      || latticeDistance(worldZ + prop.position.z, continuity.supportPhaseZ, SUPPORT_SPACING) > LATTICE_EPSILON) {
      errors.push(`Pilot support ${prop.id} resets support lattice at Cell boundary`);
    }
  }
  return errors;
}

function uniqueCoordinates(values: readonly number[]): number[] {
  const unique: number[] = [];
  for (const value of [...values].sort((left, right) => left - right)) {
    if (unique.length === 0 || Math.abs(value - unique[unique.length - 1]!) > LATTICE_EPSILON) unique.push(value);
  }
  return unique;
}

/**
 * Measure partition lines that physically meet across one east/south Cell seam.
 * A zero expected count means the local heading does not run a wall through
 * that seam; it is not a continuity failure.
 */
export function measureBaselineArchitectureSeam(
  left: { cellX: number; cellZ: number; walls: readonly WallSpec[] },
  right: { cellX: number; cellZ: number; walls: readonly WallSpec[] },
  direction: 'east' | 'south'
): BaselineArchitectureSeamMetrics {
  const east = direction === 'east';
  if ((east && (right.cellX !== left.cellX + 1 || right.cellZ !== left.cellZ))
    || (!east && (right.cellX !== left.cellX || right.cellZ !== left.cellZ + 1))) {
    throw new Error(`Generation 3 continuity seam is not adjacent toward ${direction}`);
  }
  const leftCoordinates = uniqueCoordinates(left.walls.flatMap((wall) => {
    const bounds = wallBounds(wall);
    if (east && wall.orientation === 'z' && bounds.maxX >= CELL_LIMIT - LATTICE_EPSILON) return [left.cellZ * CELL_SIZE + wall.cz];
    if (!east && wall.orientation === 'x' && bounds.maxZ >= CELL_LIMIT - LATTICE_EPSILON) return [left.cellX * CELL_SIZE + wall.cx];
    return [];
  }));
  const rightCoordinates = uniqueCoordinates(right.walls.flatMap((wall) => {
    const bounds = wallBounds(wall);
    if (east && wall.orientation === 'z' && bounds.minX <= -CELL_LIMIT + LATTICE_EPSILON) return [right.cellZ * CELL_SIZE + wall.cz];
    if (!east && wall.orientation === 'x' && bounds.minZ <= -CELL_LIMIT + LATTICE_EPSILON) return [right.cellX * CELL_SIZE + wall.cx];
    return [];
  }));
  const matchingLines = leftCoordinates.filter((coordinate) => rightCoordinates.some((candidate) => Math.abs(candidate - coordinate) <= LATTICE_EPSILON)).length;
  return { expectedLines: Math.min(leftCoordinates.length, rightCoordinates.length), matchingLines };
}
