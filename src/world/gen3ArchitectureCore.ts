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

export const SUBSTRATE_GRID = 8.4;
export const LINE_JITTER = 1.4;
export const PILLAR_SPACING = 7.2;
export const ARCH_GROUP_SEGMENTS = 4;
export const ARCH_MIN_INFLUENCE = 0.36;
export const ARCH_IRREGULAR_CHANCE = 0.015;
export const PASSAGE_CLEARANCE = DOOR_WIDTH + 0.34;
export const JUNCTION_RECESS = 0.82;
export const ARCH_PIER_WIDTH = 0.44;
export const ARCH_LOWER_HEIGHT = 0.92;
export const ARCH_HEADER_HEIGHT = 0.52;

export const PILLAR_WIDTH_SCALE = 0.9;
export const PILLAR_MIN_WIDTH = 1.55 * PILLAR_WIDTH_SCALE;
export const PILLAR_MAX_WIDTH = 2.3 * PILLAR_WIDTH_SCALE;

export type JunctionKind = 'cross' | 't' | 'corner' | 'straight' | 'termination' | 'open';
export type JunctionArm = 'west' | 'east' | 'north' | 'south';

export interface Gen3RegionInfluence {
  pillar: number;
  arch: number;
  pillarDepth: number;
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

export interface Fields {
  openness: number;
  partitionPressure: number;
  axisFlow: number;
  roomScale: number;
  regularity: number;
  connectivityPressure: number;
  columnPressure: number;
}

interface RoomNode { x: number; z: number; }
export interface Passage { center: number; width: number; }
export interface DividerPassage extends Passage { segmentStart: number; segmentEnd: number; }
export interface ReservedPassage { axis: 'x' | 'z'; fixed: number; center: number; width: number; }
export interface ArchDividerSpec {
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
export interface JunctionMorphology { kind: Exclude<JunctionKind, 'open'>; arms: ReadonlySet<JunctionArm>; }

export function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
function smooth01(value: number): number { const x = clamp01(value); return x * x * (3 - 2 * x); }
function strength(value: number, start: number, full: number): number { return smooth01((value - start) / (full - start)); }
function unlocked(worldDay: number, exposure: number, minimumWorldDay: number, minimumExposure: number, tuning: WorldTuning): boolean {
  return tuning.gateBypass || (worldDay >= minimumWorldDay && exposure >= minimumExposure);
}

export function regionInfluenceFromLocal(
  seed: string,
  worldX: number,
  worldZ: number,
  worldDay: number,
  exposure: number,
  tuning: WorldTuning,
  _local: Pick<Fields, 'openness' | 'regularity' | 'columnPressure'>
): Gen3RegionInfluence {
  if (tuning.regionOverride === 'ordinary-level-0') return { pillar: 0, arch: 0, pillarDepth: 0, deepPillar: 0 };
  if (tuning.regionOverride === 'pillar-field') return { pillar: 0.68, arch: 0, pillarDepth: 0.34, deepPillar: 0 };
  if (tuning.regionOverride === 'arch-rooms') return { pillar: 0, arch: 0.86, pillarDepth: 0, deepPillar: 0 };
  const geography = sampleWorldGeography(seed, worldX, worldZ);
  const pillarUnlocked = unlocked(worldDay, exposure, 3, 0.6, tuning);
  const pillar = pillarUnlocked ? strength(geography.pillarAffinity, 0.54, 0.8) : 0;
  const arch = unlocked(worldDay, exposure, 3, 0.6, tuning) ? strength(geography.archAffinity, 0.56, 0.8) : 0;
  // Region depth is derived only from the same continuous kilometre-scale Pillar
  // geography. Local room Fields no longer decide whether a geographic core exists.
  const pillarDepth = pillarUnlocked ? strength(geography.pillarAffinity, 0.64, 0.86) : 0;
  const deepPillar = strength(pillarDepth, 0.72, 0.96);
  return { pillar, arch, pillarDepth, deepPillar };
}

export function sampleGen3RegionInfluence(
  seed: string,
  worldX: number,
  worldZ: number,
  worldDay: number,
  exposure: number,
  tuning: WorldTuning
): Gen3RegionInfluence {
  const local = sampleWorldFieldChannels(seed, worldX, worldZ, ['openness', 'regularity', 'columnPressure']);
  return regionInfluenceFromLocal(seed, worldX, worldZ, worldDay, exposure, tuning, local);
}

export function linePosition(seed: string, axis: 'x' | 'z', index: number): number {
  // Keep the dev.4 line domain so stable world addresses and existing wall identity
  // remain intact wherever morphology does not change the visible segment.
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

export function segmentMidpoint(seed: string, axis: 'x' | 'z', lineIndex: number, alongIndex: number): { x: number; z: number; span: { fixed: number; start: number; end: number } } {
  const span = segmentWorldSpan(seed, axis, lineIndex, alongIndex);
  const center = (span.start + span.end) / 2;
  return axis === 'z' ? { x: center, z: span.fixed, span } : { x: span.fixed, z: center, span };
}

export function sampleArchitectureFields(seed: string, x: number, z: number): Fields {
  return sampleWorldFieldChannels(seed, x, z, ['openness', 'partitionPressure', 'axisFlow', 'roomScale', 'regularity', 'connectivityPressure', 'columnPressure']);
}

export function passageForSegment(
  seed: string,
  axis: 'x' | 'z',
  lineIndex: number,
  alongIndex: number,
  fields: Fields,
  span: { start: number; end: number }
): Passage | undefined {
  const [a, b] = boundaryRooms(axis, lineIndex, alongIndex);
  const treePassage = sameNode(parentOfRoom(seed, a), b) || sameNode(parentOfRoom(seed, b), a);
  // The deterministic tree remains the hard global reachability substrate. A bounded
  // extra-opening budget retains robust local alternatives; morphology, not passage
  // starvation, supplies constrained turns and dead-end pockets.
  const extraChance = 0.24 + fields.connectivityPressure * 0.32 + (1 - fields.regularity) * 0.08;
  const extraPassage = unitFloat(`${seed}:gen3-v5:nav-extra:${axis}:${lineIndex}:${alongIndex}`) < extraChance;
  if (!treePassage && !extraPassage) return undefined;
  const length = span.end - span.start;
  if (length <= PASSAGE_CLEARANCE + 1.0) return { center: (span.start + span.end) / 2, width: length + 0.1 };
  const fraction = 0.38 + unitFloat(`${seed}:gen3-v4:door:${axis}:${lineIndex}:${alongIndex}`) * 0.24;
  return { center: span.start + length * fraction, width: PASSAGE_CLEARANCE };
}

function baseKeepChance(fields: Fields, axis: 'x' | 'z', influence: Gen3RegionInfluence): number {
  const ordinaryMerge = fields.openness * 0.08 + fields.roomScale * 0.06;
  const rareLargeSpace = strength(fields.openness, 0.78, 0.94) * strength(fields.roomScale, 0.72, 0.92) * 0.32;
  const pressure = fields.partitionPressure * 0.16;
  const flow = (fields.axisFlow - 0.5) * (axis === 'z' ? 0.08 : -0.08);
  // Pillar Region depth participates before walls exist. Deep territory therefore
  // becomes wall-sparse by geographic rule rather than hoping pillars survive a
  // wall-first rejection pass later.
  const pillarSuppression = influence.pillar * 0.1 + influence.pillarDepth * 0.5 + influence.deepPillar * 0.28;
  const archOrder = influence.arch * fields.regularity * 0.05;
  return clamp01(0.76 + pressure - ordinaryMerge - rareLargeSpace + flow + archOrder - pillarSuppression);
}

export function segmentKept(
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

export function junctionMorphology(seed: string, junctionX: number, junctionZ: number): JunctionMorphology {
  const worldX = linePosition(seed, 'x', junctionX);
  const worldZ = linePosition(seed, 'z', junctionZ);
  const fields = sampleArchitectureFields(seed, worldX, worldZ);
  const roll = unitFloat(`${seed}:gen3-v5:junction:${junctionX}:${junctionZ}:kind`);
  // Crosses are explicitly capped to a small selected minority. The remaining
  // vocabulary is biased toward T-junctions and corners with enough straight and
  // terminating walls to break the dev.4 '+' default.
  const crossLimit = 0.055 + fields.regularity * 0.035;
  const tLimit = crossLimit + 0.40;
  const cornerLimit = tLimit + 0.28;
  const straightLimit = cornerLimit + 0.12;
  const rotation = Math.floor(unitFloat(`${seed}:gen3-v5:junction:${junctionX}:${junctionZ}:rotation`) * 4) % 4;
  const arms: JunctionArm[] = ['west', 'east', 'north', 'south'];
  if (roll < crossLimit) return { kind: 'cross', arms: new Set(arms) };
  if (roll < tLimit) return { kind: 't', arms: new Set(arms.filter((_, index) => index !== rotation)) };
  if (roll < cornerLimit) {
    const corners: JunctionArm[][] = [
      ['west', 'north'], ['east', 'north'], ['east', 'south'], ['west', 'south']
    ];
    return { kind: 'corner', arms: new Set(corners[rotation]!) };
  }
  if (roll < straightLimit) {
    return rotation % 2 === 0
      ? { kind: 'straight', arms: new Set<JunctionArm>(['west', 'east']) }
      : { kind: 'straight', arms: new Set<JunctionArm>(['north', 'south']) };
  }
  return { kind: 'termination', arms: new Set<JunctionArm>([arms[rotation]!]) };
}

export function junctionEndpointAllowance(seed: string, boundaryAxis: 'x' | 'z', lineIndex: number, alongIndex: number): { start: boolean; end: boolean } {
  if (boundaryAxis === 'z') {
    return {
      start: junctionMorphology(seed, alongIndex, lineIndex).arms.has('east'),
      end: junctionMorphology(seed, alongIndex + 1, lineIndex).arms.has('west')
    };
  }
  return {
    start: junctionMorphology(seed, lineIndex, alongIndex).arms.has('south'),
    end: junctionMorphology(seed, lineIndex, alongIndex + 1).arms.has('north')
  };
}

export function chooseWallMaterial(seed: string, axis: 'x' | 'z', lineIndex: number, alongIndex: number, influence: Gen3RegionInfluence): MaterialId {
  const paleChance = strength(influence.arch, 0.16, 0.9);
  return unitFloat(`${seed}:gen3-v4:arch-finish:${axis}:${lineIndex}:${alongIndex}`) < paleChance
    ? 'arch-pale-wallpaper'
    : 'level-0-wallpaper';
}

export function subtractIntervals(start: number, end: number, cuts: readonly [number, number][]): Array<[number, number]> {
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

export function pushClippedWall(
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
