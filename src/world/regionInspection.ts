import { sampleGen3Environment, locateNearestRegion, type RegionOccurrence } from './gen3.js';
import { sampleGen3RegionInfluence } from './gen3Architecture.js';
import { CELL_SIZE, type RegionId, type WorldTuning } from './types.js';

export type RegionDepthTarget = 'nearest' | 'edge' | 'interior' | 'core' | 'deep-core';

export interface RegionInspectionOccurrence extends RegionOccurrence {
  target: RegionDepthTarget;
  depthValue: number;
  regionInfluence: number;
}

interface Band { min: number; max: number; ideal: number; }

const PILLAR_BANDS: Record<Exclude<RegionDepthTarget, 'nearest'>, Band> = {
  edge: { min: 0, max: 0.2, ideal: 0.08 },
  interior: { min: 0.27, max: 0.53, ideal: 0.4 },
  core: { min: 0.62, max: 0.83, ideal: 0.72 },
  'deep-core': { min: 0.88, max: 1.001, ideal: 0.96 }
};

const ARCH_BANDS: Partial<Record<Exclude<RegionDepthTarget, 'nearest'>, Band>> = {
  edge: { min: 0.36, max: 0.61, ideal: 0.49 },
  interior: { min: 0.64, max: 0.82, ideal: 0.73 },
  core: { min: 0.86, max: 1.001, ideal: 0.94 }
};

export function regionDepthTargetSupported(regionId: RegionId, target: RegionDepthTarget): boolean {
  if (target === 'nearest') return true;
  if (regionId === 'ordinary-level-0') return false;
  if (regionId === 'pillar-field') return true;
  return target !== 'deep-core';
}

function bandFor(regionId: RegionId, target: Exclude<RegionDepthTarget, 'nearest'>): Band | undefined {
  if (regionId === 'pillar-field') return PILLAR_BANDS[target];
  if (regionId === 'arch-rooms') return ARCH_BANDS[target];
  return undefined;
}

function naturalTuning(tuning: WorldTuning): WorldTuning {
  return { ...tuning, regionOverride: undefined };
}

function sampleDepth(
  seed: string,
  worldX: number,
  worldZ: number,
  regionId: RegionId,
  worldDay: number,
  exposure: number,
  tuning: WorldTuning
): { depthValue: number; regionInfluence: number; matchesRegion: boolean } {
  const environment = sampleGen3Environment(seed, worldX, worldZ, worldDay, exposure, tuning);
  const influence = sampleGen3RegionInfluence(seed, worldX, worldZ, worldDay, exposure, tuning);
  if (regionId === 'pillar-field') {
    return {
      depthValue: influence.pillarDepth,
      regionInfluence: influence.pillar,
      matchesRegion: environment.regionId === regionId && influence.arch < 0.3
    };
  }
  if (regionId === 'arch-rooms') {
    return {
      depthValue: influence.arch,
      regionInfluence: influence.arch,
      matchesRegion: environment.regionId === regionId
    };
  }
  return {
    depthValue: environment.regionStrength,
    regionInfluence: environment.regionStrength,
    matchesRegion: environment.regionId === regionId
  };
}

function occurrenceAt(
  seed: string,
  originX: number,
  originZ: number,
  worldX: number,
  worldZ: number,
  target: RegionDepthTarget,
  sampled: { depthValue: number; regionInfluence: number }
): RegionInspectionOccurrence {
  return {
    worldX,
    worldZ,
    distanceMeters: Math.hypot(worldX - originX, worldZ - originZ),
    strength: sampled.regionInfluence,
    target,
    depthValue: sampled.depthValue,
    regionInfluence: sampled.regionInfluence
  };
}

/**
 * Locate an inspection point inside the existing continuous Region geography.
 * This never changes Region generation and never invents Cell-distance bands.
 */
export function locateRegionAtDepth(options: {
  seed: string;
  originX: number;
  originZ: number;
  targetRegion: RegionId;
  targetDepth: RegionDepthTarget;
  worldDay: number;
  exposure: number;
  tuning: WorldTuning;
  maxDistanceMeters?: number;
}): RegionInspectionOccurrence | undefined {
  const { seed, originX, originZ, targetRegion, targetDepth, worldDay, exposure } = options;
  const tuning = naturalTuning(options.tuning);
  const maxDistance = options.maxDistanceMeters ?? 12_000;
  if (!regionDepthTargetSupported(targetRegion, targetDepth)) return undefined;

  if (targetDepth === 'nearest') {
    const nearest = locateNearestRegion({
      seed, originX, originZ, target: targetRegion, worldDay, exposure, tuning, maxDistanceMeters: maxDistance
    });
    if (!nearest) return undefined;
    const sampled = sampleDepth(seed, nearest.worldX, nearest.worldZ, targetRegion, worldDay, exposure, tuning);
    return { ...nearest, target: targetDepth, depthValue: sampled.depthValue, regionInfluence: sampled.regionInfluence };
  }

  const band = bandFor(targetRegion, targetDepth);
  if (!band) return undefined;
  const coarse = CELL_SIZE * 8;
  let best: RegionInspectionOccurrence | undefined;
  let bestDepthError = Number.POSITIVE_INFINITY;

  for (let dx = -maxDistance; dx <= maxDistance; dx += coarse) {
    for (let dz = -maxDistance; dz <= maxDistance; dz += coarse) {
      const distanceMeters = Math.hypot(dx, dz);
      if (distanceMeters > maxDistance) continue;
      const worldX = originX + dx;
      const worldZ = originZ + dz;
      const sampled = sampleDepth(seed, worldX, worldZ, targetRegion, worldDay, exposure, tuning);
      if (!sampled.matchesRegion || sampled.depthValue < band.min || sampled.depthValue >= band.max) continue;
      const depthError = Math.abs(sampled.depthValue - band.ideal);
      if (best && distanceMeters > best.distanceMeters + coarse * 1.5) continue;
      if (!best || distanceMeters < best.distanceMeters - coarse * 0.5 || depthError < bestDepthError) {
        best = occurrenceAt(seed, originX, originZ, worldX, worldZ, targetDepth, sampled);
        bestDepthError = depthError;
      }
    }
  }
  if (!best) return undefined;

  const refinement = CELL_SIZE * 10;
  let refined = best;
  let refinedScore = best.distanceMeters + Math.abs(best.depthValue - band.ideal) * CELL_SIZE * 2;
  for (let worldX = best.worldX - refinement; worldX <= best.worldX + refinement; worldX += CELL_SIZE) {
    for (let worldZ = best.worldZ - refinement; worldZ <= best.worldZ + refinement; worldZ += CELL_SIZE) {
      const sampled = sampleDepth(seed, worldX, worldZ, targetRegion, worldDay, exposure, tuning);
      if (!sampled.matchesRegion || sampled.depthValue < band.min || sampled.depthValue >= band.max) continue;
      const candidate = occurrenceAt(seed, originX, originZ, worldX, worldZ, targetDepth, sampled);
      const score = candidate.distanceMeters + Math.abs(sampled.depthValue - band.ideal) * CELL_SIZE * 2;
      if (score < refinedScore) { refined = candidate; refinedScore = score; }
    }
  }
  return refined;
}

export function formatRegionDepth(regionId: RegionId, target: RegionDepthTarget, occurrence: RegionInspectionOccurrence): string {
  if (regionId === 'ordinary-level-0') return `strength ${occurrence.regionInfluence.toFixed(3)}`;
  if (regionId === 'pillar-field') return `${target} · depth ${occurrence.depthValue.toFixed(3)} · influence ${occurrence.regionInfluence.toFixed(3)}`;
  return `${target} · interior strength ${occurrence.depthValue.toFixed(3)}`;
}
