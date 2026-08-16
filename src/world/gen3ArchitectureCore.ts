import { sampleWorldGeography } from './fields.js';
import { stableId, unitFloat } from './hash.js';
import {
  CELL_SIZE,
  WALL_HEIGHT,
  WALL_THICKNESS,
  type MaterialId,
  type PropSpec,
  type WallSpec,
  type WorldTuning
} from './types.js';

/** The accepted dev.4 major structural lattice remains the stable world-space skeleton. */
export const SUBSTRATE_GRID = 8.4;
export const LINE_JITTER = 1.4;
export const PILLAR_SPACING = 7.2;
export const ARCH_IRREGULAR_CHANCE = 0;
export const ARCH_PIER_WIDTH = 0.44;
export const ARCH_LOWER_HEIGHT = 1.0;
export const ARCH_HEADER_HEIGHT = 0.44;
export const ARCH_LEGACY_BAY_MIN = 4.55;
export const ARCH_LEGACY_BAY_RANGE = 0.70;
export const ARCH_CURVE_MIN_WIDTH = 0.72;
export const ARCH_CURVE_MAX_WIDTH = 1.42;
export const ARCH_SHOULDER_SPAN_SCALE = 0.5;

export interface ArchBayProfile {
  legacyPitch: number;
  legacyOpening: number;
  curveWidth: number;
  legacyShoulderSpan: number;
  shoulderSpan: number;
  opening: number;
  pitch: number;
}

export function legacyArchCurveWidth(opening: number): number {
  return Math.min(ARCH_CURVE_MAX_WIDTH, Math.max(ARCH_CURVE_MIN_WIDTH, opening * 0.34), opening * 0.44);
}

/**
 * A-A1 keeps the accepted central curve but halves both rectangular shoulders.
 * Pier centres therefore move inward without changing the curve seed domain.
 */
export function archBayProfile(ownerId: string): ArchBayProfile {
  const legacyPitch = ARCH_LEGACY_BAY_MIN + unitFloat(`${ownerId}:bay`) * ARCH_LEGACY_BAY_RANGE;
  const legacyOpening = legacyPitch - ARCH_PIER_WIDTH;
  const curveWidth = legacyArchCurveWidth(legacyOpening);
  const legacyShoulderSpan = Math.max(0, (legacyOpening - curveWidth) / 2);
  const shoulderSpan = legacyShoulderSpan * ARCH_SHOULDER_SPAN_SCALE;
  const opening = curveWidth + shoulderSpan * 2;
  return {
    legacyPitch,
    legacyOpening,
    curveWidth,
    legacyShoulderSpan,
    shoulderSpan,
    opening,
    pitch: opening + ARCH_PIER_WIDTH
  };
}

/** Recover the preserved pre-tightening curve width from a reconstructed opening. */
export function preservedArchCurveWidth(opening: number): number {
  let legacyOpening = Math.max(opening, opening * 2 - ARCH_CURVE_MAX_WIDTH);
  for (let pass = 0; pass < 6; pass += 1) {
    const curve = legacyArchCurveWidth(legacyOpening);
    legacyOpening = opening * 2 - curve;
  }
  return legacyArchCurveWidth(legacyOpening);
}

export const PILLAR_WIDTH_SCALE = 0.9;
export const PILLAR_MIN_WIDTH = 1.55 * PILLAR_WIDTH_SCALE;
export const PILLAR_MAX_WIDTH = 2.3 * PILLAR_WIDTH_SCALE;

export type JunctionKind = 'cross' | 't' | 'corner' | 'straight' | 'termination' | 'open';

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

export function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
function smooth01(value: number): number { const x = clamp01(value); return x * x * (3 - 2 * x); }
export function strength(value: number, start: number, full: number): number { return smooth01((value - start) / (full - start)); }
function unlocked(worldDay: number, exposure: number, minimumWorldDay: number, minimumExposure: number, tuning: WorldTuning): boolean {
  return tuning.gateBypass || (worldDay >= minimumWorldDay && exposure >= minimumExposure);
}

/**
 * Region influence is independent of local room fields. Pillar depth is derived
 * only from continuous kilometre-scale geography so a geographic core cannot be
 * created or erased by local partition noise.
 */
export function sampleGen3RegionInfluence(
  seed: string,
  worldX: number,
  worldZ: number,
  worldDay: number,
  exposure: number,
  tuning: WorldTuning
): Gen3RegionInfluence {
  if (tuning.regionOverride === 'ordinary-level-0') return { pillar: 0, arch: 0, pillarDepth: 0, deepPillar: 0 };
  if (tuning.regionOverride === 'pillar-field') return { pillar: 0.72, arch: 0, pillarDepth: 0.30, deepPillar: 0 };
  if (tuning.regionOverride === 'arch-rooms') return { pillar: 0, arch: 0.86, pillarDepth: 0, deepPillar: 0 };
  const geography = sampleWorldGeography(seed, worldX, worldZ);
  const pillarUnlocked = unlocked(worldDay, exposure, 3, 0.6, tuning);
  const pillar = pillarUnlocked ? strength(geography.pillarAffinity, 0.54, 0.8) : 0;
  const arch = unlocked(worldDay, exposure, 3, 0.6, tuning) ? strength(geography.archAffinity, 0.56, 0.8) : 0;
  const pillarDepth = pillarUnlocked ? strength(geography.pillarAffinity, 0.64, 0.86) : 0;
  const deepPillar = strength(pillarDepth, 0.72, 0.96);
  return { pillar, arch, pillarDepth, deepPillar };
}

export function linePosition(seed: string, axis: 'x' | 'z', index: number): number {
  return index * SUBSTRATE_GRID + (unitFloat(`${seed}:gen3-v4:line:${axis}:${index}`) * 2 - 1) * LINE_JITTER;
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

/** Emit a world-space wall piece into its deterministic 14 m streaming owner Cell. */
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
      id: stableId('gen3-v5-wall', seed, ownerId, cellX, cellZ, clippedStart.toFixed(3), clippedEnd.toFixed(3)),
      cx: localX, cy: y, cz: localZ,
      sx: clippedEnd - clippedStart, sy: height, sz: WALL_THICKNESS,
      orientation: 'z', drawable: true, materialId, materialVariant: 0
    }
    : {
      id: stableId('gen3-v5-wall', seed, ownerId, cellX, cellZ, clippedStart.toFixed(3), clippedEnd.toFixed(3)),
      cx: localX, cy: y, cz: localZ,
      sx: WALL_THICKNESS, sy: height, sz: clippedEnd - clippedStart,
      orientation: 'x', drawable: true, materialId, materialVariant: 0
    });
}
