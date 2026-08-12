import { sampleWorldFieldChannels, sampleWorldGeography } from './fields.js';
import { stableId, unitFloat } from './hash.js';
import {
  CELL_SIZE,
  DOOR_WIDTH,
  WALL_HEIGHT,
  WALL_THICKNESS,
  type MaterialId,
  type PropSpec,
  type WallSpec,
  type WorldTuning
} from './types.js';

const SUBSTRATE_GRID = 8.4;
const LINE_JITTER = 1.4;
const PILLAR_SPACING = 7.2;
const ARCH_GROUP_SEGMENTS = 4;
const ARCH_MIN_INFLUENCE = 0.36;
const ARCH_IRREGULAR_CHANCE = 0.015;
const PASSAGE_CLEARANCE = DOOR_WIDTH + 0.34;

export const PILLAR_WIDTH_SCALE = 0.9;
export const PILLAR_MIN_WIDTH = 1.55 * PILLAR_WIDTH_SCALE;
export const PILLAR_MAX_WIDTH = 2.3 * PILLAR_WIDTH_SCALE;

export interface Gen3RegionInfluence {
  pillar: number;
  arch: number;
  deepPillar: number;
}

export interface Gen3ArchitectureResult {
  walls: WallSpec[];
  props: PropSpec[];
  archDividerIds: string[];
  irregularArchDividerIds: string[];
  pillarCount: number;
  deepPillarSamples: number;
}

interface Fields {
  openness: number;
  partitionPressure: number;
  axisFlow: number;
  roomScale: number;
  regularity: number;
  connectivityPressure: number;
  columnPressure: number;
}

interface RoomNode { x: number; z: number; }
interface Passage { center: number; width: number; }
interface ReservedPassage { axis: 'x' | 'z'; fixed: number; center: number; width: number; }
interface ArchDividerSpec {
  id: string;
  axis: 'x' | 'z';
  fixed: number;
  start: number;
  end: number;
  bayWidth: number;
  bayCount: number;
  irregular: boolean;
  lineIndex: number;
  groupIndex: number;
}

function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
function smooth01(value: number): number { const x = clamp01(value); return x * x * (3 - 2 * x); }
function strength(value: number, start: number, full: number): number { return smooth01((value - start) / (full - start)); }
function unlocked(worldDay: number, exposure: number, minimumWorldDay: number, minimumExposure: number, tuning: WorldTuning): boolean {
  return tuning.gateBypass || (worldDay >= minimumWorldDay && exposure >= minimumExposure);
}

function regionInfluenceFromLocal(
  seed: string,
  worldX: number,
  worldZ: number,
  worldDay: number,
  exposure: number,
  tuning: WorldTuning,
  local: Pick<Fields, 'openness' | 'regularity' | 'columnPressure'>
): Gen3RegionInfluence {
  if (tuning.regionOverride === 'ordinary-level-0') return { pillar: 0, arch: 0, deepPillar: 0 };
  if (tuning.regionOverride === 'pillar-field') return { pillar: 0.8, arch: 0, deepPillar: 0 };
  if (tuning.regionOverride === 'arch-rooms') return { pillar: 0, arch: 0.86, deepPillar: 0 };
  const geography = sampleWorldGeography(seed, worldX, worldZ);
  const pillar = unlocked(worldDay, exposure, 3, 0.6, tuning) ? strength(geography.pillarAffinity, 0.54, 0.8) : 0;
  const arch = unlocked(worldDay, exposure, 3, 0.6, tuning) ? strength(geography.archAffinity, 0.56, 0.8) : 0;
  const deepPillar = pillar
    * strength(pillar, 0.82, 0.98)
    * strength(local.openness, 0.66, 0.9)
    * strength(local.regularity, 0.68, 0.9)
    * strength(local.columnPressure, 0.62, 0.88);
  return { pillar, arch, deepPillar: clamp01(deepPillar) };
}

export function sampleGen3RegionInfluence(
  seed: string,
  worldX: number,
  worldZ: number,
  worldDay: number,
  exposure: number,
  tuning: WorldTuning
): Gen3RegionInfluence {
  if (tuning.regionOverride === 'ordinary-level-0') return { pillar: 0, arch: 0, deepPillar: 0 };
  if (tuning.regionOverride === 'pillar-field') return { pillar: 0.8, arch: 0, deepPillar: 0 };
  if (tuning.regionOverride === 'arch-rooms') return { pillar: 0, arch: 0.86, deepPillar: 0 };
  const local = sampleWorldFieldChannels(seed, worldX, worldZ, ['openness', 'regularity', 'columnPressure']);
  return regionInfluenceFromLocal(seed, worldX, worldZ, worldDay, exposure, tuning, local);
}

function linePosition(seed: string, axis: 'x' | 'z', index: number): number {
  return index * SUBSTRATE_GRID + (unitFloat(`${seed}:gen3-v4:line:${axis}:${index}`) * 2 - 1) * LINE_JITTER;
}

function parentOfRoom(seed: string, node: RoomNode): RoomNode | undefined {
  if (node.x === 0 && node.z === 0) return undefined;
  if (node.x === 0) return { x: 0, z: node.z - Math.sign(node.z) };
  if (node.z === 0) return { x: node.x - Math.sign(node.x), z: 0 };
  const chooseX = unitFloat(`${seed}:gen3-v4:nav-parent:${node.x}:${node.z}`) < 0.5;
  return chooseX
    ? { x: node.x - Math.sign(node.x), z: node.z }
    : { x: node.x, z: node.z - Math.sign(node.z) };
}

function sameNode(left: RoomNode | undefined, right: RoomNode): boolean {
  return Boolean(left && left.x === right.x && left.z === right.z);
}

function boundaryRooms(axis: 'x' | 'z', lineIndex: number, alongIndex: number): [RoomNode, RoomNode] {
  return axis === 'z'
    ? [{ x: alongIndex, z: lineIndex - 1 }, { x: alongIndex, z: lineIndex }]
    : [{ x: lineIndex - 1, z: alongIndex }, { x: lineIndex, z: alongIndex }];
}

function segmentWorldSpan(seed: string, axis: 'x' | 'z', lineIndex: number, alongIndex: number): { fixed: number; start: number; end: number } {
  if (axis === 'z') {
    return {
      fixed: linePosition(seed, 'z', lineIndex),
      start: linePosition(seed, 'x', alongIndex),
      end: linePosition(seed, 'x', alongIndex + 1)
    };
  }
  return {
    fixed: linePosition(seed, 'x', lineIndex),
    start: linePosition(seed, 'z', alongIndex),
    end: linePosition(seed, 'z', alongIndex + 1)
  };
}

function segmentMidpoint(seed: string, axis: 'x' | 'z', lineIndex: number, alongIndex: number): { x: number; z: number; span: { fixed: number; start: number; end: number } } {
  const span = segmentWorldSpan(seed, axis, lineIndex, alongIndex);
  const center = (span.start + span.end) / 2;
  return axis === 'z' ? { x: center, z: span.fixed, span } : { x: span.fixed, z: center, span };
}

function sampleArchitectureFields(seed: string, x: number, z: number): Fields {
  return sampleWorldFieldChannels(seed, x, z, ['openness', 'partitionPressure', 'axisFlow', 'roomScale', 'regularity', 'connectivityPressure', 'columnPressure']);
}

function passageForSegment(
  seed: string,
  axis: 'x' | 'z',
  lineIndex: number,
  alongIndex: number,
  fields: Fields,
  span: { start: number; end: number }
): Passage | undefined {
  const [a, b] = boundaryRooms(axis, lineIndex, alongIndex);
  const treePassage = sameNode(parentOfRoom(seed, a), b) || sameNode(parentOfRoom(seed, b), a);
  const extraChance = 0.14 + fields.connectivityPressure * 0.3 + (1 - fields.regularity) * 0.08;
  const extraPassage = unitFloat(`${seed}:gen3-v4:nav-extra:${axis}:${lineIndex}:${alongIndex}`) < extraChance;
  if (!treePassage && !extraPassage) return undefined;
  const length = span.end - span.start;
  if (length <= PASSAGE_CLEARANCE + 1.0) return { center: (span.start + span.end) / 2, width: length + 0.1 };
  const fraction = 0.38 + unitFloat(`${seed}:gen3-v4:door:${axis}:${lineIndex}:${alongIndex}`) * 0.24;
  const center = span.start + length * fraction;
  return { center, width: PASSAGE_CLEARANCE };
}

function baseKeepChance(fields: Fields, axis: 'x' | 'z', influence: Gen3RegionInfluence): number {
  const ordinaryMerge = fields.openness * 0.08 + fields.roomScale * 0.06;
  const rareLargeSpace = strength(fields.openness, 0.78, 0.94) * strength(fields.roomScale, 0.72, 0.92) * 0.32;
  const pressure = fields.partitionPressure * 0.16;
  const flow = (fields.axisFlow - 0.5) * (axis === 'z' ? 0.08 : -0.08);
  const pillarSuppression = influence.pillar * 0.12 + influence.deepPillar * 0.5;
  const archOrder = influence.arch * fields.regularity * 0.05;
  return clamp01(0.76 + pressure - ordinaryMerge - rareLargeSpace + flow + archOrder - pillarSuppression);
}

function segmentKept(
  seed: string,
  axis: 'x' | 'z',
  lineIndex: number,
  alongIndex: number,
  fields: Fields,
  influence: Gen3RegionInfluence
): boolean {
  const base = baseKeepChance(fields, axis, influence);
  const previous = unitFloat(`${seed}:gen3-v4:wall:${axis}:${lineIndex}:${alongIndex - 1}`) < base;
  const next = unitFloat(`${seed}:gen3-v4:wall:${axis}:${lineIndex}:${alongIndex + 1}`) < base;
  const neighborCount = Number(previous) + Number(next);
  const runBreaker = neighborCount === 0 ? 0.14 : neighborCount === 2 ? -0.06 : 0;
  const coherent = clamp01(base + runBreaker * (0.7 + fields.regularity * 0.3));
  return unitFloat(`${seed}:gen3-v4:wall:${axis}:${lineIndex}:${alongIndex}`) < coherent;
}

function chooseWallMaterial(seed: string, axis: 'x' | 'z', lineIndex: number, alongIndex: number, influence: Gen3RegionInfluence): MaterialId {
  const paleChance = strength(influence.arch, 0.16, 0.9);
  return unitFloat(`${seed}:gen3-v4:arch-finish:${axis}:${lineIndex}:${alongIndex}`) < paleChance
    ? 'arch-pale-wallpaper'
    : 'level-0-wallpaper';
}

function subtractIntervals(start: number, end: number, cuts: readonly [number, number][]): Array<[number, number]> {
  let pieces: Array<[number, number]> = [[start, end]];
  for (const [cutStart, cutEnd] of cuts) {
    pieces = pieces.flatMap(([pieceStart, pieceEnd]) => {
      if (cutEnd <= pieceStart || cutStart >= pieceEnd) return [[pieceStart, pieceEnd] as [number, number]];
      const result: Array<[number, number]> = [];
      if (cutStart - pieceStart > 0.18) result.push([pieceStart, Math.min(pieceEnd, cutStart)]);
      if (pieceEnd - cutEnd > 0.18) result.push([Math.max(pieceStart, cutEnd), pieceEnd]);
      return result;
    });
  }
  return pieces;
}

function pushClippedWall(
  output: WallSpec[],
  seed: string,
  cellX: number,
  cellZ: number,
  ownerId: string,
  axis: 'x' | 'z',
  fixed: number,
  start: number,
  end: number,
  y: number,
  height: number,
  materialId: MaterialId
): void {
  if (end - start < 0.08 || height < 0.08) return;
  const half = CELL_SIZE / 2;
  const centerX = cellX * CELL_SIZE;
  const centerZ = cellZ * CELL_SIZE;
  const perpendicularOwner = Math.floor((fixed + half) / CELL_SIZE);
  if ((axis === 'x' ? cellZ : cellX) !== perpendicularOwner) return;
  const cellStart = (axis === 'x' ? centerX : centerZ) - half;
  const cellEnd = cellStart + CELL_SIZE;
  const clippedStart = Math.max(start, cellStart);
  const clippedEnd = Math.min(end, cellEnd);
  if (clippedEnd - clippedStart < 0.08) return;
  const center = (clippedStart + clippedEnd) / 2;
  const localX = (axis === 'x' ? center : fixed) - centerX;
  const localZ = (axis === 'x' ? fixed : center) - centerZ;
  output.push(axis === 'x'
    ? {
      id: stableId('gen3-v4-wall', seed, ownerId, cellX, cellZ, clippedStart.toFixed(3), clippedEnd.toFixed(3)),
      cx: localX, cy: y, cz: localZ,
      sx: clippedEnd - clippedStart, sy: height, sz: WALL_THICKNESS,
      orientation: 'z', drawable: true, materialId, materialVariant: 0
    }
    : {
      id: stableId('gen3-v4-wall', seed, ownerId, cellX, cellZ, clippedStart.toFixed(3), clippedEnd.toFixed(3)),
      cx: localX, cy: y, cz: localZ,
      sx: WALL_THICKNESS, sy: height, sz: clippedEnd - clippedStart,
      orientation: 'x', drawable: true, materialId, materialVariant: 0
    });
}

function archDividerForGroup(
  seed: string,
  axis: 'x' | 'z',
  lineIndex: number,
  groupIndex: number,
  worldDay: number,
  exposure: number,
  tuning: WorldTuning
): ArchDividerSpec | undefined {
  const firstAlong = groupIndex * ARCH_GROUP_SEGMENTS;
  const start = linePosition(seed, axis === 'x' ? 'x' : 'z', firstAlong);
  const end = linePosition(seed, axis === 'x' ? 'x' : 'z', firstAlong + ARCH_GROUP_SEGMENTS);
  const fixed = linePosition(seed, axis === 'x' ? 'z' : 'x', lineIndex);
  const center = (start + end) / 2;
  const worldX = axis === 'x' ? center : fixed;
  const worldZ = axis === 'x' ? fixed : center;
  const influence = sampleGen3RegionInfluence(seed, worldX, worldZ, worldDay, exposure, tuning);
  if (influence.arch < ARCH_MIN_INFLUENCE) return undefined;
  const keepChance = clamp01((influence.arch - ARCH_MIN_INFLUENCE) * 0.72);
  const id = `divider:${axis}:${lineIndex}:${groupIndex}`;
  if (unitFloat(`${seed}:gen3-v4:arch-divider:${id}:keep`) > keepChance) return undefined;
  const length = end - start;
  const desiredBay = 3.35 + unitFloat(`${seed}:gen3-v4:arch-divider:${id}:scale`) * 1.1;
  const bayCount = Math.max(4, Math.round(length / desiredBay));
  return {
    id,
    axis,
    fixed,
    start,
    end,
    bayWidth: length / bayCount,
    bayCount,
    irregular: unitFloat(`${seed}:gen3-v4:arch-divider:${id}:irregular`) < ARCH_IRREGULAR_CHANCE,
    lineIndex,
    groupIndex
  };
}

function archDividerForSegment(
  seed: string,
  axis: 'x' | 'z',
  lineIndex: number,
  alongIndex: number,
  worldDay: number,
  exposure: number,
  tuning: WorldTuning
): ArchDividerSpec | undefined {
  return archDividerForGroup(seed, axis, lineIndex, Math.floor(alongIndex / ARCH_GROUP_SEGMENTS), worldDay, exposure, tuning);
}

function dividerPassages(seed: string, spec: ArchDividerSpec): Passage[] {
  const passages: Passage[] = [];
  const firstAlong = spec.groupIndex * ARCH_GROUP_SEGMENTS;
  for (let offset = 0; offset < ARCH_GROUP_SEGMENTS; offset += 1) {
    const alongIndex = firstAlong + offset;
    const midpoint = segmentMidpoint(seed, spec.axis === 'x' ? 'z' : 'x', spec.lineIndex, alongIndex);
    const fields = sampleArchitectureFields(seed, midpoint.x, midpoint.z);
    const passage = passageForSegment(seed, spec.axis === 'x' ? 'z' : 'x', spec.lineIndex, alongIndex, fields, midpoint.span);
    if (passage) passages.push(passage);
  }
  return passages;
}

function addArchDivider(
  output: WallSpec[],
  seed: string,
  cellX: number,
  cellZ: number,
  spec: ArchDividerSpec
): void {
  const cuts = dividerPassages(seed, spec).map((passage) => [passage.center - passage.width / 2, passage.center + passage.width / 2] as [number, number]);
  const material: MaterialId = 'arch-pale-wallpaper';
  const axis = spec.axis;

  const add = (pieceId: string, start: number, end: number, y: number, height: number): void => {
    for (const [a, b] of subtractIntervals(start, end, cuts)) pushClippedWall(output, seed, cellX, cellZ, `${spec.id}:${pieceId}`, axis, spec.fixed, a, b, y, height, material);
  };

  const asymmetry = spec.irregular ? (unitFloat(`${seed}:gen3-v4:arch-divider:${spec.id}:asymmetry`) - 0.5) * 0.14 : 0;
  const terminationSide = Math.min(0.54, spec.bayWidth * 0.16);
  const leftTermination = terminationSide * (1 + asymmetry);
  const rightTermination = terminationSide * (1 - asymmetry);
  add('lower', spec.start + leftTermination, spec.end - rightTermination, 0.5, 1.0);
  add('header', spec.start + leftTermination, spec.end - rightTermination, 2.98, 0.44);
  add('left-termination', spec.start, spec.start + leftTermination, WALL_HEIGHT / 2, WALL_HEIGHT);
  add('right-termination', spec.end - rightTermination, spec.end, WALL_HEIGHT / 2, WALL_HEIGHT);

  for (let bayIndex = 0; bayIndex < spec.bayCount; bayIndex += 1) {
    const bayStart = spec.start + bayIndex * spec.bayWidth;
    const bayEnd = bayStart + spec.bayWidth;
    if (cuts.some(([cutStart, cutEnd]) => cutStart < bayEnd && cutEnd > bayStart)) continue;
    const side = Math.min(0.54, spec.bayWidth * 0.16);
    const shoulder = Math.min(0.42, spec.bayWidth * 0.12);
    const leftSide = side * (1 + asymmetry);
    const rightSide = side * (1 - asymmetry);
    const leftShoulder = shoulder * (1 + asymmetry);
    const rightShoulder = shoulder * (1 - asymmetry);
    if (bayIndex > 0) {
      add(`bay:${bayIndex}:left-a`, bayStart, bayStart + leftSide, 2.08, 1.16);
      add(`bay:${bayIndex}:left-b`, bayStart + leftSide, bayStart + leftSide + leftShoulder, 2.48, 0.38);
    }
    if (bayIndex < spec.bayCount - 1) {
      add(`bay:${bayIndex}:right-a`, bayEnd - rightSide, bayEnd, 2.08, 1.16);
      add(`bay:${bayIndex}:right-b`, bayEnd - rightSide - rightShoulder, bayEnd - rightSide, 2.48, 0.38);
    }
  }
}

function candidateRanges(seed: string, cellX: number, cellZ: number): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const centerX = cellX * CELL_SIZE;
  const centerZ = cellZ * CELL_SIZE;
  const padding = LINE_JITTER + WALL_THICKNESS;
  return {
    minX: Math.floor((centerX - CELL_SIZE / 2 - padding) / SUBSTRATE_GRID) - 1,
    maxX: Math.ceil((centerX + CELL_SIZE / 2 + padding) / SUBSTRATE_GRID) + 1,
    minZ: Math.floor((centerZ - CELL_SIZE / 2 - padding) / SUBSTRATE_GRID) - 1,
    maxZ: Math.ceil((centerZ + CELL_SIZE / 2 + padding) / SUBSTRATE_GRID) + 1
  };
}

function addSubstrate(
  seed: string,
  cellX: number,
  cellZ: number,
  worldDay: number,
  exposure: number,
  tuning: WorldTuning,
  output: WallSpec[],
  archGroups: Map<string, ArchDividerSpec>,
  reservedPassages: Map<string, ReservedPassage>
): void {
  const ranges = candidateRanges(seed, cellX, cellZ);
  const dividerCache = new Map<string, ArchDividerSpec | null>();
  const process = (boundaryAxis: 'x' | 'z', lineIndex: number, alongIndex: number): void => {
    const midpoint = segmentMidpoint(seed, boundaryAxis, lineIndex, alongIndex);
    const fields = sampleArchitectureFields(seed, midpoint.x, midpoint.z);
    const influence = regionInfluenceFromLocal(seed, midpoint.x, midpoint.z, worldDay, exposure, tuning, fields);
    const runAxis: 'x' | 'z' = boundaryAxis === 'z' ? 'x' : 'z';
    const groupIndex = Math.floor(alongIndex / ARCH_GROUP_SEGMENTS);
    const dividerKey = `${runAxis}:${lineIndex}:${groupIndex}`;
    if (!dividerCache.has(dividerKey)) dividerCache.set(dividerKey, archDividerForGroup(seed, runAxis, lineIndex, groupIndex, worldDay, exposure, tuning) ?? null);
    const divider = dividerCache.get(dividerKey) ?? undefined;
    if (divider) {
      archGroups.set(divider.id, divider);
      return;
    }
    if (!segmentKept(seed, boundaryAxis, lineIndex, alongIndex, fields, influence)) return;
    const passage = passageForSegment(seed, boundaryAxis, lineIndex, alongIndex, fields, midpoint.span);
    if (passage) {
      const passageId = `${boundaryAxis}:${lineIndex}:${alongIndex}`;
      reservedPassages.set(passageId, { axis: boundaryAxis, fixed: midpoint.span.fixed, center: passage.center, width: passage.width });
    }
    const cuts = passage ? [[passage.center - passage.width / 2, passage.center + passage.width / 2] as [number, number]] : [];
    const material = chooseWallMaterial(seed, boundaryAxis, lineIndex, alongIndex, influence);
    for (const [start, end] of subtractIntervals(midpoint.span.start, midpoint.span.end, cuts)) {
      pushClippedWall(output, seed, cellX, cellZ, `substrate:${boundaryAxis}:${lineIndex}:${alongIndex}`, runAxis, midpoint.span.fixed, start, end, WALL_HEIGHT / 2, WALL_HEIGHT, material);
    }
  };

  for (let lineZ = ranges.minZ; lineZ <= ranges.maxZ; lineZ += 1) {
    for (let alongX = ranges.minX; alongX < ranges.maxX; alongX += 1) process('z', lineZ, alongX);
  }
  for (let lineX = ranges.minX; lineX <= ranges.maxX; lineX += 1) {
    for (let alongZ = ranges.minZ; alongZ < ranges.maxZ; alongZ += 1) process('x', lineX, alongZ);
  }
}

function localWallBounds(wall: WallSpec): { minX: number; maxX: number; minZ: number; maxZ: number } {
  return { minX: wall.cx - wall.sx / 2, maxX: wall.cx + wall.sx / 2, minZ: wall.cz - wall.sz / 2, maxZ: wall.cz + wall.sz / 2 };
}

function pillarIntersectsWall(localX: number, localZ: number, size: number, walls: readonly WallSpec[]): boolean {
  const half = size / 2 + 0.12;
  return walls.some((wall) => {
    const bounds = localWallBounds(wall);
    return localX + half > bounds.minX && localX - half < bounds.maxX && localZ + half > bounds.minZ && localZ - half < bounds.maxZ;
  });
}

function nearReservedPassage(worldX: number, worldZ: number, passages: Iterable<ReservedPassage>): boolean {
  for (const passage of passages) {
    if (passage.axis === 'x') {
      if (Math.abs(worldX - passage.fixed) < 1.25 && Math.abs(worldZ - passage.center) < passage.width / 2 + 1.0) return true;
    } else if (Math.abs(worldZ - passage.fixed) < 1.25 && Math.abs(worldX - passage.center) < passage.width / 2 + 1.0) return true;
  }
  return false;
}

function addPillars(
  seed: string,
  cellX: number,
  cellZ: number,
  worldDay: number,
  exposure: number,
  tuning: WorldTuning,
  walls: readonly WallSpec[],
  reservedPassages: Iterable<ReservedPassage>,
  output: PropSpec[]
): { count: number; deepSamples: number } {
  const half = CELL_SIZE / 2;
  const centerX = cellX * CELL_SIZE;
  const centerZ = cellZ * CELL_SIZE;
  const offsetX = unitFloat(`${seed}:gen3-pillar-offset:x`) * PILLAR_SPACING;
  const offsetZ = unitFloat(`${seed}:gen3-pillar-offset:z`) * PILLAR_SPACING;
  let count = 0; let deepSamples = 0;
  for (let gridX = Math.floor((centerX - half - offsetX) / PILLAR_SPACING) - 1; gridX <= Math.ceil((centerX + half - offsetX) / PILLAR_SPACING) + 1; gridX += 1) {
    for (let gridZ = Math.floor((centerZ - half - offsetZ) / PILLAR_SPACING) - 1; gridZ <= Math.ceil((centerZ + half - offsetZ) / PILLAR_SPACING) + 1; gridZ += 1) {
      const worldX = gridX * PILLAR_SPACING + offsetX;
      const worldZ = gridZ * PILLAR_SPACING + offsetZ;
      if (worldX < centerX - half + 0.75 || worldX > centerX + half - 0.75 || worldZ < centerZ - half + 0.75 || worldZ > centerZ + half - 0.75) continue;
      const influence = sampleGen3RegionInfluence(seed, worldX, worldZ, worldDay, exposure, tuning);
      const key = `${gridX}:${gridZ}`;
      const ordinaryRare = influence.pillar < 0.08;
      if (ordinaryRare && unitFloat(`${seed}:gen3-v4:ordinary-pillar:${key}`) > 0.018) continue;
      if (influence.deepPillar > 0.55) deepSamples += 1;
      const rowBias = unitFloat(`${seed}:gen3-v4:pillar-row:${gridZ}`);
      const columnBias = unitFloat(`${seed}:gen3-v4:pillar-column:${gridX}`);
      const grouping = Math.max(rowBias, columnBias) * 0.18;
      const keepChance = ordinaryRare ? 0.8 : clamp01(0.04 + influence.pillar * 0.62 + influence.deepPillar * 0.3 + grouping);
      if (unitFloat(`${seed}:gen3-v4:pillar:${key}:keep`) > keepChance) continue;
      const size = (1.55 + unitFloat(`${seed}:gen3-pillar:${key}:size`) * 0.75) * PILLAR_WIDTH_SCALE;
      const localX = worldX - centerX;
      const localZ = worldZ - centerZ;
      if (nearReservedPassage(worldX, worldZ, reservedPassages) || pillarIntersectsWall(localX, localZ, size, walls)) continue;
      output.push({
        id: stableId('gen3-pillar', seed, key),
        kind: 'column',
        position: { x: localX, y: WALL_HEIGHT / 2, z: localZ },
        scale: { x: size, y: WALL_HEIGHT, z: size },
        solid: true,
        materialId: 'level-0-wallpaper'
      });
      count += 1;
    }
  }
  return { count, deepSamples };
}

export function generateCoherentGen3Architecture(options: {
  seed: string;
  cellX: number;
  cellZ: number;
  worldDay: number;
  exposure: number;
  tuning: WorldTuning;
}): Gen3ArchitectureResult {
  const { seed, cellX, cellZ, worldDay, exposure, tuning } = options;
  const walls: WallSpec[] = [];
  const props: PropSpec[] = [];
  const archGroups = new Map<string, ArchDividerSpec>();
  const reservedPassages = new Map<string, ReservedPassage>();
  addSubstrate(seed, cellX, cellZ, worldDay, exposure, tuning, walls, archGroups, reservedPassages);
  for (const spec of archGroups.values()) addArchDivider(walls, seed, cellX, cellZ, spec);
  const pillar = addPillars(seed, cellX, cellZ, worldDay, exposure, tuning, walls, reservedPassages.values(), props);
  return {
    walls,
    props,
    archDividerIds: [...archGroups.keys()].sort(),
    irregularArchDividerIds: [...archGroups.values()].filter((spec) => spec.irregular).map((spec) => spec.id).sort(),
    pillarCount: pillar.count,
    deepPillarSamples: pillar.deepSamples
  };
}

export function gen3ArchDividerDiagnostic(options: {
  seed: string;
  axis: 'x' | 'z';
  lineIndex: number;
  groupIndex: number;
  worldDay: number;
  exposure: number;
  tuning: WorldTuning;
}): { id: string; bayWidth: number; bayCount: number; irregular: boolean; start: number; end: number } | undefined {
  const spec = archDividerForGroup(options.seed, options.axis, options.lineIndex, options.groupIndex, options.worldDay, options.exposure, options.tuning);
  if (!spec) return undefined;
  return { id: spec.id, bayWidth: spec.bayWidth, bayCount: spec.bayCount, irregular: spec.irregular, start: spec.start, end: spec.end };
}
