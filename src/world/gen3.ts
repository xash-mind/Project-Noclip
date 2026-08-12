import { sampleWorldFieldChannels, sampleWorldFields, sampleWorldGeography, type WorldFieldSample, type WorldGeographySample } from './fields.js';
import { stableId, unitFloat } from './hash.js';
import {
  CELL_SIZE,
  DOOR_WIDTH,
  WALL_HEIGHT,
  WALL_THICKNESS,
  type CarverId,
  type ConditionId,
  type FloorPatchSpec,
  type MaterialId,
  type PropSpec,
  type RegionId,
  type WallSpec,
  type WorldTuning
} from './types.js';

const ARCHITECTURE_GRID = 12.5;
const ARCH_ROOM_GRID = 14;
const ARCH_WALL_GRID = 52;
const PILLAR_SPACING = 7.2;
const HOLE_CLUSTER_GRID = 900;
const HOLE_SPACING = 3.45;

export interface Gen3Environment {
  regionId: RegionId;
  regionStrength: number;
  fields: WorldFieldSample;
  geography: WorldGeographySample;
  blackoutStrength: number;
  blackoutEscapeCue: number;
  blackoutExitDirection: { x: number; z: number };
}

export interface Gen3Layout {
  walls: WallSpec[];
  props: PropSpec[];
  patches: FloorPatchSpec[];
  featureIds: string[];
  carverIds: CarverId[];
  conditionIds: ConditionId[];
  materialIds: MaterialId[];
  label: string;
  compositionSignature: string;
}

export interface RegionOccurrence {
  worldX: number;
  worldZ: number;
  distanceMeters: number;
  strength: number;
}

export interface RegionExtentEstimate {
  eastWestMeters: number;
  northSouthMeters: number;
  crossingMinutes: number;
  capped: boolean;
}

export interface ConditionOccurrence extends RegionOccurrence {}
export interface CarverOccurrence extends RegionOccurrence { radius: number; }

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smooth01(value: number): number {
  const bounded = clamp01(value);
  return bounded * bounded * (3 - 2 * bounded);
}

function strength(value: number, start: number, full: number): number {
  return smooth01((value - start) / (full - start));
}

function gateOpen(worldDay: number, exposure: number, minimumWorldDay: number, minimumExposure: number, tuning: WorldTuning): boolean {
  return tuning.gateBypass || (worldDay >= minimumWorldDay && exposure >= minimumExposure);
}

function blackoutRaw(seed: string, worldX: number, worldZ: number): number {
  return sampleWorldGeography(seed, worldX, worldZ).blackoutPressure;
}

export function sampleGen3Environment(
  seed: string,
  worldX: number,
  worldZ: number,
  worldDay: number,
  exposure: number,
  tuning: WorldTuning
): Gen3Environment {
  const fields = sampleWorldFields(seed, worldX, worldZ);
  const geography = sampleWorldGeography(seed, worldX, worldZ);
  const pillarUnlocked = gateOpen(worldDay, exposure, 3, 0.6, tuning);
  const archUnlocked = gateOpen(worldDay, exposure, 3, 0.6, tuning);
  const blackoutUnlocked = gateOpen(worldDay, exposure, 7, 1.6, tuning);

  const pillarStrength = pillarUnlocked ? strength(geography.pillarAffinity, 0.58, 0.72) : 0;
  const archStrength = archUnlocked ? strength(geography.archAffinity, 0.6, 0.74) : 0;
  let regionId: RegionId = 'ordinary-level-0';
  let regionStrength = 1 - Math.max(pillarStrength, archStrength);
  if (pillarStrength > 0.52 && pillarStrength >= archStrength + 0.04) {
    regionId = 'pillar-field';
    regionStrength = pillarStrength;
  } else if (archStrength > 0.52 && archStrength > pillarStrength) {
    regionId = 'arch-rooms';
    regionStrength = archStrength;
  }
  if (tuning.regionOverride) {
    regionId = tuning.regionOverride;
    regionStrength = 1;
  }

  let blackoutStrength = blackoutUnlocked ? strength(geography.blackoutPressure, 0.63, 0.76) : 0;
  if (tuning.conditionOverride === 'blackout') blackoutStrength = 1;
  if (tuning.conditionOverride === 'clear') blackoutStrength = 0;
  const blackoutEscapeCue = blackoutStrength > 0
    ? smooth01(1 - Math.max(0, blackoutStrength - 0.08) / 0.92)
    : 0;

  const probe = 24;
  const gradientX = blackoutRaw(seed, worldX + probe, worldZ) - blackoutRaw(seed, worldX - probe, worldZ);
  const gradientZ = blackoutRaw(seed, worldX, worldZ + probe) - blackoutRaw(seed, worldX, worldZ - probe);
  const length = Math.hypot(gradientX, gradientZ);
  const blackoutExitDirection = length > 0.00001
    ? { x: -gradientX / length, z: -gradientZ / length }
    : { x: 0, z: -1 };

  return { regionId, regionStrength, fields, geography, blackoutStrength, blackoutEscapeCue, blackoutExitDirection };
}

function naturalTuning(tuning: WorldTuning): WorldTuning {
  return { ...tuning, regionOverride: undefined };
}

/** Approximate nearest natural occurrence for World Lab; never changes generation. */
export function locateNearestRegion(options: {
  seed: string;
  originX: number;
  originZ: number;
  target: RegionId;
  worldDay: number;
  exposure: number;
  tuning: WorldTuning;
  maxDistanceMeters?: number;
}): RegionOccurrence | undefined {
  const { seed, originX, originZ, target, worldDay, exposure } = options;
  const maxDistance = options.maxDistanceMeters ?? 12_000;
  const coarse = CELL_SIZE * 8;
  const tuning = naturalTuning(options.tuning);
  const minimumStrength = target === 'ordinary-level-0' ? 0.7 : 0.86;
  let best: RegionOccurrence | undefined;
  for (let dx = -maxDistance; dx <= maxDistance; dx += coarse) {
    for (let dz = -maxDistance; dz <= maxDistance; dz += coarse) {
      const distanceMeters = Math.hypot(dx, dz);
      if (distanceMeters > maxDistance || (best && distanceMeters >= best.distanceMeters)) continue;
      const environment = sampleGen3Environment(seed, originX + dx, originZ + dz, worldDay, exposure, tuning);
      if (environment.regionId !== target || environment.regionStrength < minimumStrength) continue;
      best = { worldX: originX + dx, worldZ: originZ + dz, distanceMeters, strength: environment.regionStrength };
    }
  }
  if (!best) return undefined;

  const refinement = CELL_SIZE * 10;
  let refined = best;
  for (let worldX = best.worldX - refinement; worldX <= best.worldX + refinement; worldX += CELL_SIZE) {
    for (let worldZ = best.worldZ - refinement; worldZ <= best.worldZ + refinement; worldZ += CELL_SIZE) {
      const distanceMeters = Math.hypot(worldX - originX, worldZ - originZ);
      if (distanceMeters >= refined.distanceMeters) continue;
      const environment = sampleGen3Environment(seed, worldX, worldZ, worldDay, exposure, tuning);
      if (environment.regionId === target && environment.regionStrength >= minimumStrength) refined = { worldX, worldZ, distanceMeters, strength: environment.regionStrength };
    }
  }
  return refined;
}

/** Local deterministic crossing estimate used by diagnostics, measured in world metres and walking time. */
export function estimateRegionExtent(options: {
  seed: string;
  worldX: number;
  worldZ: number;
  target: RegionId;
  worldDay: number;
  exposure: number;
  tuning: WorldTuning;
  maxExtentMeters?: number;
}): RegionExtentEstimate {
  const { seed, worldX, worldZ, target, worldDay, exposure } = options;
  const maxExtent = options.maxExtentMeters ?? 20_000;
  const step = CELL_SIZE * 2;
  const tuning = naturalTuning(options.tuning);
  const trace = (dx: number, dz: number): { distance: number; capped: boolean } => {
    for (let distance = step; distance <= maxExtent; distance += step) {
      const sample = sampleGen3Environment(seed, worldX + dx * distance, worldZ + dz * distance, worldDay, exposure, tuning);
      if (sample.regionId !== target) return { distance: distance - step, capped: false };
    }
    return { distance: maxExtent, capped: true };
  };
  const east = trace(1, 0); const west = trace(-1, 0);
  const north = trace(0, -1); const south = trace(0, 1);
  const eastWestMeters = east.distance + west.distance + step;
  const northSouthMeters = north.distance + south.distance + step;
  const representativeCrossing = (eastWestMeters + northSouthMeters) / 2;
  return {
    eastWestMeters,
    northSouthMeters,
    crossingMinutes: representativeCrossing / 3.15 / 60,
    capped: east.capped || west.capped || north.capped || south.capped
  };
}

export function locateNearestBlackout(options: {
  seed: string;
  originX: number;
  originZ: number;
  worldDay: number;
  exposure: number;
  tuning: WorldTuning;
  maxDistanceMeters?: number;
}): ConditionOccurrence | undefined {
  const { seed, originX, originZ, worldDay, exposure } = options;
  const maxDistance = options.maxDistanceMeters ?? 12_000;
  const coarse = CELL_SIZE * 8;
  const tuning = naturalTuning({ ...options.tuning, conditionOverride: undefined });
  let best: ConditionOccurrence | undefined;
  for (let dx = -maxDistance; dx <= maxDistance; dx += coarse) for (let dz = -maxDistance; dz <= maxDistance; dz += coarse) {
    const distanceMeters = Math.hypot(dx, dz);
    if (distanceMeters > maxDistance || (best && distanceMeters >= best.distanceMeters)) continue;
    const environment = sampleGen3Environment(seed, originX + dx, originZ + dz, worldDay, exposure, tuning);
    if (environment.blackoutStrength < 0.86) continue;
    best = { worldX: originX + dx, worldZ: originZ + dz, distanceMeters, strength: environment.blackoutStrength };
  }
  return best;
}

export function estimateBlackoutExtent(options: {
  seed: string;
  worldX: number;
  worldZ: number;
  worldDay: number;
  exposure: number;
  tuning: WorldTuning;
  maxExtentMeters?: number;
}): RegionExtentEstimate {
  const { seed, worldX, worldZ, worldDay, exposure } = options;
  const maxExtent = options.maxExtentMeters ?? 20_000;
  const step = CELL_SIZE * 2;
  const tuning = naturalTuning({ ...options.tuning, conditionOverride: undefined });
  const trace = (dx: number, dz: number): { distance: number; capped: boolean } => {
    for (let distance = step; distance <= maxExtent; distance += step) {
      if (sampleGen3Environment(seed, worldX + dx * distance, worldZ + dz * distance, worldDay, exposure, tuning).blackoutStrength <= 0.52) return { distance: distance - step, capped: false };
    }
    return { distance: maxExtent, capped: true };
  };
  const east = trace(1, 0); const west = trace(-1, 0); const north = trace(0, -1); const south = trace(0, 1);
  const eastWestMeters = east.distance + west.distance + step;
  const northSouthMeters = north.distance + south.distance + step;
  return {
    eastWestMeters, northSouthMeters,
    crossingMinutes: (eastWestMeters + northSouthMeters) / 2 / 3.15 / 60,
    capped: east.capped || west.capped || north.capped || south.capped
  };
}

function wall(
  id: string,
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  orientation: 'x' | 'z',
  materialId: MaterialId
): WallSpec {
  return { id, cx, cy, cz, sx, sy, sz, orientation, drawable: true, materialId, materialVariant: 0 };
}

function prop(
  id: string,
  kind: PropSpec['kind'],
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  solid: boolean,
  materialId?: MaterialId
): PropSpec {
  return { id, kind, position: { x, y, z }, scale: { x: sx, y: sy, z: sz }, solid, materialId };
}

function localPoint(cellX: number, cellZ: number, worldX: number, worldZ: number): { x: number; z: number } {
  return { x: worldX - cellX * CELL_SIZE, z: worldZ - cellZ * CELL_SIZE };
}

function subtractIntervals(start: number, end: number, cuts: readonly [number, number][]): Array<[number, number]> {
  let pieces: Array<[number, number]> = [[start, end]];
  for (const [cutStart, cutEnd] of cuts) {
    pieces = pieces.flatMap(([pieceStart, pieceEnd]) => {
      if (cutEnd <= pieceStart || cutStart >= pieceEnd) return [[pieceStart, pieceEnd] as [number, number]];
      const result: Array<[number, number]> = [];
      if (cutStart - pieceStart > 0.35) result.push([pieceStart, Math.min(pieceEnd, cutStart)]);
      if (pieceEnd - cutEnd > 0.35) result.push([Math.max(pieceStart, cutEnd), pieceEnd]);
      return result;
    });
  }
  return pieces;
}

function addOrdinaryRun(
  output: WallSpec[],
  seed: string,
  cellX: number,
  cellZ: number,
  runId: string,
  axis: 'x' | 'z',
  fixed: number,
  runStart: number,
  runEnd: number,
  materialId: MaterialId
): void {
  const half = CELL_SIZE / 2;
  const worldCenterX = cellX * CELL_SIZE;
  const worldCenterZ = cellZ * CELL_SIZE;
  const perpendicularCenter = axis === 'x' ? worldCenterZ : worldCenterX;
  if (fixed < perpendicularCenter - half - WALL_THICKNESS / 2 || fixed > perpendicularCenter + half + WALL_THICKNESS / 2) return;
  const cellStart = (axis === 'x' ? worldCenterX : worldCenterZ) - half;
  const cellEnd = cellStart + CELL_SIZE;
  const start = Math.max(runStart, cellStart);
  const end = Math.min(runEnd, cellEnd);
  if (end - start < 0.45) return;
  const cadence = 15 + unitFloat(`${runId}:door-cadence`) * 6;
  const offset = unitFloat(`${runId}:door-offset`) * cadence;
  const cuts: Array<[number, number]> = [];
  for (let index = Math.floor((start - offset) / cadence) - 1; index <= Math.ceil((end - offset) / cadence) + 1; index += 1) {
    const centre = index * cadence + offset;
    cuts.push([centre - DOOR_WIDTH / 2, centre + DOOR_WIDTH / 2]);
  }
  subtractIntervals(start, end, cuts).forEach(([pieceStart, pieceEnd], pieceIndex) => {
    const centre = (pieceStart + pieceEnd) / 2;
    const length = pieceEnd - pieceStart;
    const local = localPoint(cellX, cellZ, axis === 'x' ? centre : fixed, axis === 'x' ? fixed : centre);
    output.push(axis === 'x'
      ? wall(stableId('gen3-wall', seed, runId, cellX, cellZ, pieceIndex), local.x, WALL_HEIGHT / 2, local.z, length, WALL_HEIGHT, WALL_THICKNESS, 'z', materialId)
      : wall(stableId('gen3-wall', seed, runId, cellX, cellZ, pieceIndex), local.x, WALL_HEIGHT / 2, local.z, WALL_THICKNESS, WALL_HEIGHT, length, 'x', materialId));
  });
}

function addOrdinaryArchitecture(seed: string, cellX: number, cellZ: number, environment: Gen3Environment, output: WallSpec[]): void {
  const centreX = cellX * CELL_SIZE;
  const centreZ = cellZ * CELL_SIZE;
  const reach = 78;
  const minGridX = Math.floor((centreX - reach) / ARCHITECTURE_GRID);
  const maxGridX = Math.ceil((centreX + reach) / ARCHITECTURE_GRID);
  const minGridZ = Math.floor((centreZ - reach) / ARCHITECTURE_GRID);
  const maxGridZ = Math.ceil((centreZ + reach) / ARCHITECTURE_GRID);
  for (let gridX = minGridX; gridX <= maxGridX; gridX += 1) for (let gridZ = minGridZ; gridZ <= maxGridZ; gridZ += 1) {
    const runId = `${gridX}:${gridZ}`;
    const anchorX = gridX * ARCHITECTURE_GRID + (unitFloat(`${seed}:gen3-run:${runId}:x`) - 0.5) * 6.5;
    const anchorZ = gridZ * ARCHITECTURE_GRID + (unitFloat(`${seed}:gen3-run:${runId}:z`) - 0.5) * 6.5;
    const fields = sampleWorldFieldChannels(seed, anchorX, anchorZ, ['partitionPressure', 'openness', 'axisFlow', 'roomScale', 'regularity']);
    const threshold = 0.27 + fields.openness * 0.16;
    const keepChance = clamp01(0.88 + fields.partitionPressure * 0.1 - fields.openness * 0.08);
    if (fields.partitionPressure < threshold || unitFloat(`${seed}:gen3-run:${runId}:keep`) > keepChance) continue;
    if (environment.regionId === 'pillar-field' && unitFloat(`${seed}:gen3-run:${runId}:pillar-suppress`) < 0.87 + environment.regionStrength * 0.125) continue;
    const directionalStrength = 0.26 + fields.regularity * 0.46;
    const zProbability = clamp01(0.5 + (fields.axisFlow - 0.5) * 2 * directionalStrength);
    const axis: 'x' | 'z' = unitFloat(`${seed}:gen3-run:${runId}:axis`) < zProbability ? 'z' : 'x';
    const length = 30 + fields.roomScale * 46 + fields.partitionPressure * 8;
    const start = (axis === 'x' ? anchorX : anchorZ) - length / 2;
    const end = start + length;
    addOrdinaryRun(output, seed, cellX, cellZ, runId, axis, axis === 'x' ? anchorZ : anchorX, start, end, 'level-0-wallpaper');

    const crossChance = clamp01(0.3 + fields.partitionPressure * 0.34 + (1 - fields.openness) * 0.16);
    if (unitFloat(`${seed}:gen3-run:${runId}:cross-keep`) <= crossChance) {
      const crossAxis: 'x' | 'z' = axis === 'x' ? 'z' : 'x';
      const crossLength = 16 + fields.roomScale * 30 + fields.partitionPressure * 8;
      const crossStart = (crossAxis === 'x' ? anchorX : anchorZ) - crossLength / 2;
      const crossEnd = crossStart + crossLength;
      addOrdinaryRun(output, seed, cellX, cellZ, `${runId}:cross`, crossAxis, crossAxis === 'x' ? anchorZ : anchorX, crossStart, crossEnd, 'level-0-wallpaper');
    }
  }
}

function addArchBayPiece(
  output: WallSpec[], seed: string, cellX: number, cellZ: number, id: string, axis: 'x' | 'z', fixed: number,
  start: number, end: number, y: number, height: number
): void {
  if (end - start < 0.08 || height < 0.08) return;
  const centre = (start + end) / 2;
  const local = localPoint(cellX, cellZ, axis === 'x' ? centre : fixed, axis === 'x' ? fixed : centre);
  output.push(axis === 'x'
    ? wall(stableId('gen3-arch-wall', seed, id), local.x, y, local.z, end - start, height, WALL_THICKNESS, 'z', 'arch-pale-wallpaper')
    : wall(stableId('gen3-arch-wall', seed, id), local.x, y, local.z, WALL_THICKNESS, height, end - start, 'x', 'arch-pale-wallpaper'));
}

function addArchDivider(
  output: WallSpec[], seed: string, cellX: number, cellZ: number, runId: string, axis: 'x' | 'z', fixed: number, runStart: number, runEnd: number
): void {
  const half = CELL_SIZE / 2;
  const worldCentre = (axis === 'x' ? cellX : cellZ) * CELL_SIZE;
  const perpendicularCentre = (axis === 'x' ? cellZ : cellX) * CELL_SIZE;
  if (fixed < perpendicularCentre - half - WALL_THICKNESS / 2 || fixed > perpendicularCentre + half + WALL_THICKNESS / 2) return;
  const start = Math.max(runStart, worldCentre - half);
  const end = Math.min(runEnd, worldCentre + half);
  if (end - start < 0.3) return;
  const bay = 3.6;
  const firstBay = Math.floor(start / bay) - 1;
  const lastBay = Math.ceil(end / bay) + 1;
  addArchBayPiece(output, seed, cellX, cellZ, `${runId}:${cellX}:${cellZ}:continuous-lower`, axis, fixed, start, end, 0.5, 1.0);
  addArchBayPiece(output, seed, cellX, cellZ, `${runId}:${cellX}:${cellZ}:continuous-header`, axis, fixed, start, end, 2.96, 0.48);
  for (let bayIndex = firstBay; bayIndex <= lastBay; bayIndex += 1) {
    const bayStart = Math.max(start, bayIndex * bay);
    const bayEnd = Math.min(end, (bayIndex + 1) * bay);
    if (bayEnd <= bayStart) continue;
    const key = `${runId}:${cellX}:${cellZ}:bay:${bayIndex}`;
    const clippedWidth = bayEnd - bayStart;
    const outer = Math.min(0.52, clippedWidth * 0.22);
    const inner = Math.min(0.42, clippedWidth * 0.18);
    addArchBayPiece(output, seed, cellX, cellZ, `${key}:curve-la`, axis, fixed, bayStart, bayStart + outer, 2.34, 0.76);
    addArchBayPiece(output, seed, cellX, cellZ, `${key}:curve-ra`, axis, fixed, bayEnd - outer, bayEnd, 2.34, 0.76);
    addArchBayPiece(output, seed, cellX, cellZ, `${key}:curve-lb`, axis, fixed, bayStart + outer, bayStart + outer + inner, 2.54, 0.36);
    addArchBayPiece(output, seed, cellX, cellZ, `${key}:curve-rb`, axis, fixed, bayEnd - outer - inner, bayEnd - outer, 2.54, 0.36);
    addArchBayPiece(output, seed, cellX, cellZ, `${key}:pier`, axis, fixed, bayStart, Math.min(bayEnd, bayStart + 0.24), 1.84, 1.68);
  }
}

function addArchRoomWalls(seed: string, cellX: number, cellZ: number, output: WallSpec[]): void {
  const centreX = cellX * CELL_SIZE;
  const centreZ = cellZ * CELL_SIZE;
  const reach = 78;
  for (let gridX = Math.floor((centreX - reach) / ARCH_ROOM_GRID); gridX <= Math.ceil((centreX + reach) / ARCH_ROOM_GRID); gridX += 1) {
    for (let gridZ = Math.floor((centreZ - reach) / ARCH_ROOM_GRID); gridZ <= Math.ceil((centreZ + reach) / ARCH_ROOM_GRID); gridZ += 1) {
      const runId = `room:${gridX}:${gridZ}`;
      const anchorX = gridX * ARCH_ROOM_GRID + (unitFloat(`${seed}:gen3-arch-room:${runId}:x`) - 0.5) * 5;
      const anchorZ = gridZ * ARCH_ROOM_GRID + (unitFloat(`${seed}:gen3-arch-room:${runId}:z`) - 0.5) * 5;
      const fields = sampleWorldFieldChannels(seed, anchorX, anchorZ, ['partitionPressure', 'openness', 'axisFlow', 'roomScale', 'regularity']);
      const keepChance = clamp01(0.68 + fields.partitionPressure * 0.18 - fields.openness * 0.08);
      if (unitFloat(`${seed}:gen3-arch-room:${runId}:keep`) > keepChance) continue;
      const directionalStrength = 0.18 + fields.regularity * 0.34;
      const zProbability = clamp01(0.5 + (fields.axisFlow - 0.5) * 2 * directionalStrength);
      const axis: 'x' | 'z' = unitFloat(`${seed}:gen3-arch-room:${runId}:axis`) < zProbability ? 'z' : 'x';
      const length = 24 + fields.roomScale * 34 + fields.partitionPressure * 8;
      const start = (axis === 'x' ? anchorX : anchorZ) - length / 2;
      const end = start + length;
      addOrdinaryRun(output, seed, cellX, cellZ, `arch-${runId}`, axis, axis === 'x' ? anchorZ : anchorX, start, end, 'arch-pale-wallpaper');

      const crossChance = clamp01(0.24 + fields.partitionPressure * 0.28 + (1 - fields.openness) * 0.1);
      if (unitFloat(`${seed}:gen3-arch-room:${runId}:cross-keep`) <= crossChance) {
        const crossAxis: 'x' | 'z' = axis === 'x' ? 'z' : 'x';
        const crossLength = 15 + fields.roomScale * 24 + fields.partitionPressure * 5;
        const crossStart = (crossAxis === 'x' ? anchorX : anchorZ) - crossLength / 2;
        addOrdinaryRun(output, seed, cellX, cellZ, `arch-${runId}:cross`, crossAxis, crossAxis === 'x' ? anchorZ : anchorX, crossStart, crossStart + crossLength, 'arch-pale-wallpaper');
      }
    }
  }
}

function addArchArchitecture(seed: string, cellX: number, cellZ: number, environment: Gen3Environment, output: WallSpec[]): void {
  addArchRoomWalls(seed, cellX, cellZ, output);
  const centreX = cellX * CELL_SIZE;
  const centreZ = cellZ * CELL_SIZE;
  const reach = 84;
  for (let gridX = Math.floor((centreX - reach) / ARCH_WALL_GRID); gridX <= Math.ceil((centreX + reach) / ARCH_WALL_GRID); gridX += 1) {
    for (let gridZ = Math.floor((centreZ - reach) / ARCH_WALL_GRID); gridZ <= Math.ceil((centreZ + reach) / ARCH_WALL_GRID); gridZ += 1) {
      const runId = `${gridX}:${gridZ}`;
      if (unitFloat(`${seed}:gen3-arch:${runId}:keep`) > 0.62) continue;
      const anchorX = gridX * ARCH_WALL_GRID + (unitFloat(`${seed}:gen3-arch:${runId}:x`) - 0.5) * 12;
      const anchorZ = gridZ * ARCH_WALL_GRID + (unitFloat(`${seed}:gen3-arch:${runId}:z`) - 0.5) * 12;
      const flow = sampleWorldFieldChannels(seed, anchorX, anchorZ, ['axisFlow', 'roomScale', 'regularity']);
      const directionalStrength = 0.2 + flow.regularity * 0.38;
      const zProbability = clamp01(0.5 + (flow.axisFlow - 0.5) * 2 * directionalStrength);
      const axis: 'x' | 'z' = unitFloat(`${seed}:gen3-arch:${runId}:axis`) < zProbability ? 'z' : 'x';
      const length = 34 + flow.roomScale * 46;
      const runStart = (axis === 'x' ? anchorX : anchorZ) - length / 2;
      const runEnd = runStart + length;
      addArchDivider(output, seed, cellX, cellZ, runId, axis, axis === 'x' ? anchorZ : anchorX, runStart, runEnd);
    }
  }
  if (environment.regionStrength < 0.62) addOrdinaryArchitecture(seed, cellX, cellZ, environment, output);
}

function addPillars(seed: string, cellX: number, cellZ: number, environment: Gen3Environment, output: PropSpec[]): void {
  const half = CELL_SIZE / 2;
  const centreX = cellX * CELL_SIZE;
  const centreZ = cellZ * CELL_SIZE;
  const offsetX = unitFloat(`${seed}:gen3-pillar-offset:x`) * PILLAR_SPACING;
  const offsetZ = unitFloat(`${seed}:gen3-pillar-offset:z`) * PILLAR_SPACING;
  for (let gridX = Math.floor((centreX - half - offsetX) / PILLAR_SPACING); gridX <= Math.ceil((centreX + half - offsetX) / PILLAR_SPACING); gridX += 1) {
    for (let gridZ = Math.floor((centreZ - half - offsetZ) / PILLAR_SPACING); gridZ <= Math.ceil((centreZ + half - offsetZ) / PILLAR_SPACING); gridZ += 1) {
      const worldX = gridX * PILLAR_SPACING + offsetX;
      const worldZ = gridZ * PILLAR_SPACING + offsetZ;
      if (worldX < centreX - half + 0.8 || worldX > centreX + half - 0.8 || worldZ < centreZ - half + 0.8 || worldZ > centreZ + half - 0.8) continue;
      const key = `${gridX}:${gridZ}`;
      if (unitFloat(`${seed}:gen3-pillar:${key}:keep`) > 0.28 + environment.regionStrength * 0.72) continue;
      const local = localPoint(cellX, cellZ, worldX, worldZ);
      const size = 1.55 + unitFloat(`${seed}:gen3-pillar:${key}:size`) * 0.75;
      output.push(prop(stableId('gen3-pillar', seed, key), 'column', local.x, WALL_HEIGHT / 2, local.z, size, WALL_HEIGHT, size, true, 'level-0-wallpaper'));
    }
  }
}

function addOccasionalOrdinaryPillar(seed: string, cellX: number, cellZ: number, environment: Gen3Environment, output: PropSpec[]): void {
  if (environment.fields.columnPressure < 0.72 || unitFloat(`${seed}:gen3-ordinary-pillar:${cellX}:${cellZ}`) > 0.13) return;
  const x = -4.6 + unitFloat(`${seed}:gen3-ordinary-pillar:${cellX}:${cellZ}:x`) * 9.2;
  const z = -4.6 + unitFloat(`${seed}:gen3-ordinary-pillar:${cellX}:${cellZ}:z`) * 9.2;
  if (Math.hypot(x, z) < 1.5 && cellX === 0 && cellZ === 0) return;
  const size = 1 + environment.fields.columnPressure * 0.55;
  output.push(prop(stableId('gen3-ordinary-pillar', seed, cellX, cellZ), 'column', x, WALL_HEIGHT / 2, z, size, WALL_HEIGHT, size, true, 'level-0-wallpaper'));
}

interface HoleCluster { id: string; worldX: number; worldZ: number; radius: number; }

function naturalHoleCluster(seed: string, gridX: number, gridZ: number): HoleCluster | undefined {
  const id = `${gridX}:${gridZ}`;
  if (unitFloat(`${seed}:gen3-hole-cluster:${id}:active`) > 0.08) return undefined;
  const worldX = (gridX + 0.16 + unitFloat(`${seed}:gen3-hole-cluster:${id}:x`) * 0.68) * HOLE_CLUSTER_GRID;
  const worldZ = (gridZ + 0.16 + unitFloat(`${seed}:gen3-hole-cluster:${id}:z`) * 0.68) * HOLE_CLUSTER_GRID;
  if (sampleWorldGeography(seed, worldX, worldZ).holePressure < 0.5) return undefined;
  const radius = 24 + unitFloat(`${seed}:gen3-hole-cluster:${id}:radius`) * 24;
  return { id, worldX, worldZ, radius };
}

export function locateNearestHoleCluster(options: {
  seed: string;
  originX: number;
  originZ: number;
  worldDay: number;
  exposure: number;
  tuning: WorldTuning;
  maxDistanceMeters?: number;
}): CarverOccurrence | undefined {
  const { seed, originX, originZ, worldDay, exposure, tuning } = options;
  if (!gateOpen(worldDay, exposure, 10, 2.2, tuning)) return undefined;
  const maxDistance = options.maxDistanceMeters ?? 12_000;
  const originGridX = Math.floor(originX / HOLE_CLUSTER_GRID);
  const originGridZ = Math.floor(originZ / HOLE_CLUSTER_GRID);
  const gridRadius = Math.ceil(maxDistance / HOLE_CLUSTER_GRID) + 1;
  let best: CarverOccurrence | undefined;
  for (let dx = -gridRadius; dx <= gridRadius; dx += 1) for (let dz = -gridRadius; dz <= gridRadius; dz += 1) {
    const cluster = naturalHoleCluster(seed, originGridX + dx, originGridZ + dz);
    if (!cluster) continue;
    const distanceMeters = Math.hypot(cluster.worldX - originX, cluster.worldZ - originZ);
    if (distanceMeters > maxDistance || (best && distanceMeters >= best.distanceMeters)) continue;
    best = { worldX: cluster.worldX, worldZ: cluster.worldZ, distanceMeters, strength: 1, radius: cluster.radius };
  }
  return best;
}

function holeClusterForCell(seed: string, cellX: number, cellZ: number, worldDay: number, exposure: number, tuning: WorldTuning): HoleCluster | undefined {
  if (tuning.carverOverride === 'none') return undefined;
  if (tuning.carverOverride === 'floor-hole-cluster') return { id: 'lab', worldX: 0, worldZ: 0, radius: 46 };
  if (!gateOpen(worldDay, exposure, 10, 2.2, tuning)) return undefined;
  const centreX = cellX * CELL_SIZE;
  const centreZ = cellZ * CELL_SIZE;
  const gridX = Math.floor(centreX / HOLE_CLUSTER_GRID);
  const gridZ = Math.floor(centreZ / HOLE_CLUSTER_GRID);
  let nearest: HoleCluster | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) {
    const candidateX = gridX + dx;
    const candidateZ = gridZ + dz;
    const candidate = naturalHoleCluster(seed, candidateX, candidateZ);
    if (!candidate) continue;
    const distance = Math.hypot(candidate.worldX - centreX, candidate.worldZ - centreZ);
    if (distance <= candidate.radius + CELL_SIZE && distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function addHoleCluster(seed: string, cellX: number, cellZ: number, cluster: HoleCluster, output: FloorPatchSpec[]): void {
  const half = CELL_SIZE / 2;
  const centreX = cellX * CELL_SIZE;
  const centreZ = cellZ * CELL_SIZE;
  const originX = cluster.worldX - Math.floor(cluster.radius / HOLE_SPACING) * HOLE_SPACING;
  const originZ = cluster.worldZ - Math.floor(cluster.radius / HOLE_SPACING) * HOLE_SPACING;
  const minGridX = Math.floor((centreX - half - originX) / HOLE_SPACING) - 1;
  const maxGridX = Math.ceil((centreX + half - originX) / HOLE_SPACING) + 1;
  const minGridZ = Math.floor((centreZ - half - originZ) / HOLE_SPACING) - 1;
  const maxGridZ = Math.ceil((centreZ + half - originZ) / HOLE_SPACING) + 1;
  for (let gridX = minGridX; gridX <= maxGridX; gridX += 1) for (let gridZ = minGridZ; gridZ <= maxGridZ; gridZ += 1) {
    if (Math.abs(gridX) % 6 === 0 || Math.abs(gridZ) % 7 === 0) continue;
    const worldX = originX + gridX * HOLE_SPACING;
    const worldZ = originZ + gridZ * HOLE_SPACING;
    const size = 1.72 + unitFloat(`${seed}:gen3-hole:${cluster.id}:${gridX}:${gridZ}:size`) * 0.28;
    if (worldX < centreX - half + size / 2 || worldX > centreX + half - size / 2 || worldZ < centreZ - half + size / 2 || worldZ > centreZ + half - size / 2) continue;
    if (Math.hypot(worldX - cluster.worldX, worldZ - cluster.worldZ) > cluster.radius) continue;
    const local = localPoint(cellX, cellZ, worldX, worldZ);
    if (cellX === 0 && cellZ === 0 && Math.hypot(local.x, local.z) < 2.2) continue;
    output.push({
      id: stableId('gen3-hole', seed, cluster.id, gridX, gridZ),
      position: { x: local.x, y: 0.004, z: local.z },
      scale: { x: size, y: 0.008, z: size },
      kind: 'hole'
    });
  }
}

function addSparseFeature(seed: string, cellX: number, cellZ: number, environment: Gen3Environment, output: PropSpec[], featureIds: string[]): void {
  const key = `${seed}:gen3-feature:${cellX}:${cellZ}`;
  if (environment.fields.clutterPressure < 0.54 || unitFloat(`${key}:keep`) > 0.1) return;
  const kinds = ['table', 'chair', 'cabinet'] as const;
  const kind = kinds[Math.floor(unitFloat(`${key}:kind`) * kinds.length)]!;
  const x = -4.4 + unitFloat(`${key}:x`) * 8.8;
  const z = -4.4 + unitFloat(`${key}:z`) * 8.8;
  if (cellX === 0 && cellZ === 0 && Math.hypot(x, z) < 1.5) return;
  const dimensions: Record<typeof kind, [number, number, number]> = {
    table: [1.6, 0.84, 0.9], chair: [0.58, 0.9, 0.58], cabinet: [0.95, 1.8, 0.78]
  };
  const [sx, sy, sz] = dimensions[kind];
  const id = stableId('gen3-feature', seed, cellX, cellZ, kind);
  output.push(prop(id, kind, x, sy / 2, z, sx, sy, sz, true));
  featureIds.push(id);
}

export function generateGen3Layout(options: {
  seed: string;
  cellX: number;
  cellZ: number;
  worldDay: number;
  exposure: number;
  tuning: WorldTuning;
  environment: Gen3Environment;
}): Gen3Layout {
  const { seed, cellX, cellZ, worldDay, exposure, tuning, environment } = options;
  const walls: WallSpec[] = [];
  const props: PropSpec[] = [];
  const patches: FloorPatchSpec[] = [];
  const featureIds: string[] = [];
  const carverIds: CarverId[] = [];
  const conditionIds: ConditionId[] = [];
  const materialIds: MaterialId[] = ['level-0-wallpaper', 'level-0-carpet', 'level-0-ceiling', 'fluorescent-panel'];

  if (environment.regionId === 'arch-rooms') {
    addArchArchitecture(seed, cellX, cellZ, environment, walls);
    materialIds.push('arch-pale-wallpaper');
    conditionIds.push('deep-wet-carpet');
  } else {
    addOrdinaryArchitecture(seed, cellX, cellZ, environment, walls);
    if (environment.regionId === 'pillar-field') {
      addPillars(seed, cellX, cellZ, environment, props);
      conditionIds.push('shallow-dry-carpet');
    } else {
      addOccasionalOrdinaryPillar(seed, cellX, cellZ, environment, props);
      conditionIds.push('damp-carpet');
    }
  }

  if (environment.blackoutStrength > 0.52) conditionIds.push('blackout');
  // Natural pits are Carvers over ordinary Level 0, not a Region or an
  // architectural vocabulary shared by Pillar Fields and Arch Rooms. The
  // explicit Lab override may still isolate the Carver for inspection.
  const cluster = environment.regionId === 'ordinary-level-0' || tuning.carverOverride === 'floor-hole-cluster'
    ? holeClusterForCell(seed, cellX, cellZ, worldDay, exposure, tuning)
    : undefined;
  if (cluster) {
    addHoleCluster(seed, cellX, cellZ, cluster, patches);
    if (patches.length > 0) carverIds.push('floor-hole-cluster');
  }
  addSparseFeature(seed, cellX, cellZ, environment, props, featureIds);

  const label = environment.regionId === 'pillar-field'
    ? 'Pillar Field'
    : environment.regionId === 'arch-rooms'
      ? 'Arch Rooms'
      : 'Ordinary Level 0';
  const compositionSignature = [
    'gen3-v1',
    environment.regionId,
    `w${walls.length}`,
    `p${props.length}`,
    `c${carverIds.length}`,
    `b${Math.round(environment.blackoutStrength * 4)}`
  ].join(':');
  return { walls, props, patches, featureIds, carverIds, conditionIds, materialIds: [...new Set(materialIds)], label, compositionSignature };
}