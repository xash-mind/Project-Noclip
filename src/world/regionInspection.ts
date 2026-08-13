import { sampleWorldGeography } from './fields.js';
import { locateNearestRegion, type RegionOccurrence } from './gen3.js';
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

/** Depth QA can range farther than the ordinary nearest-Region locator without changing geography. */
export const REGION_DEPTH_SEARCH_RADIUS_METERS = 48_000;

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

function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
function smooth01(value: number): number { const x = clamp01(value); return x * x * (3 - 2 * x); }
function strength(value: number, start: number, full: number): number { return smooth01((value - start) / (full - start)); }
function regionGateOpen(worldDay: number, exposure: number, tuning: WorldTuning): boolean {
  return tuning.gateBypass || (worldDay >= 3 && exposure >= 0.6);
}

/**
 * Depth inspection samples only the canonical kilometre-scale geography channels.
 * This mirrors the Region classification/depth laws without calculating unrelated
 * local room Fields twice for tens of thousands of QA probes.
 */
function sampleDepth(
  seed: string,
  worldX: number,
  worldZ: number,
  regionId: RegionId,
  worldDay: number,
  exposure: number,
  tuning: WorldTuning
): { depthValue: number; regionInfluence: number; matchesRegion: boolean } {
  const geography = sampleWorldGeography(seed, worldX, worldZ);
  const unlocked = regionGateOpen(worldDay, exposure, tuning);
  const pillarRegionStrength = unlocked ? strength(geography.pillarAffinity, 0.58, 0.72) : 0;
  const archRegionStrength = unlocked ? strength(geography.archAffinity, 0.6, 0.74) : 0;
  let naturalRegion: RegionId = 'ordinary-level-0';
  if (pillarRegionStrength > 0.52 && pillarRegionStrength >= archRegionStrength + 0.04) naturalRegion = 'pillar-field';
  else if (archRegionStrength > 0.52 && archRegionStrength > pillarRegionStrength) naturalRegion = 'arch-rooms';

  const pillarInfluence = unlocked ? strength(geography.pillarAffinity, 0.54, 0.8) : 0;
  const pillarDepth = unlocked ? strength(geography.pillarAffinity, 0.64, 0.86) : 0;
  const archInfluence = unlocked ? strength(geography.archAffinity, 0.56, 0.8) : 0;

  if (regionId === 'pillar-field') {
    return {
      depthValue: pillarDepth,
      regionInfluence: pillarInfluence,
      matchesRegion: naturalRegion === regionId && archInfluence < 0.3
    };
  }
  if (regionId === 'arch-rooms') {
    return { depthValue: archInfluence, regionInfluence: archInfluence, matchesRegion: naturalRegion === regionId };
  }
  return {
    depthValue: 1 - Math.max(pillarRegionStrength, archRegionStrength),
    regionInfluence: 1 - Math.max(pillarRegionStrength, archRegionStrength),
    matchesRegion: naturalRegion === regionId
  };
}

function occurrenceAt(
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

function scoreOccurrence(occurrence: RegionInspectionOccurrence, ideal: number, depthWeight: number): number {
  return occurrence.distanceMeters + Math.abs(occurrence.depthValue - ideal) * depthWeight;
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
  if (!regionDepthTargetSupported(targetRegion, targetDepth)) return undefined;

  if (targetDepth === 'nearest') {
    const maxDistance = options.maxDistanceMeters ?? 12_000;
    const nearest = locateNearestRegion({
      seed, originX, originZ, target: targetRegion, worldDay, exposure, tuning, maxDistanceMeters: maxDistance
    });
    if (!nearest) return undefined;
    const sampled = sampleDepth(seed, nearest.worldX, nearest.worldZ, targetRegion, worldDay, exposure, tuning);
    return { ...nearest, target: targetDepth, depthValue: sampled.depthValue, regionInfluence: sampled.regionInfluence };
  }

  const band = bandFor(targetRegion, targetDepth);
  if (!band) return undefined;
  const maxDistance = options.maxDistanceMeters ?? REGION_DEPTH_SEARCH_RADIUS_METERS;
  // Preserve the old close-range precision for explicitly bounded tests/searches,
  // but use a coarse kilometre-scale pass for deliberate deep-Region QA.
  const coarse = maxDistance <= 12_000 ? CELL_SIZE * 8 : CELL_SIZE * 32;
  let best: RegionInspectionOccurrence | undefined;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let dx = -maxDistance; dx <= maxDistance; dx += coarse) {
    for (let dz = -maxDistance; dz <= maxDistance; dz += coarse) {
      const distanceMeters = Math.hypot(dx, dz);
      if (distanceMeters > maxDistance) continue;
      if (best && distanceMeters > best.distanceMeters + coarse * 2) continue;
      const worldX = originX + dx;
      const worldZ = originZ + dz;
      const sampled = sampleDepth(seed, worldX, worldZ, targetRegion, worldDay, exposure, tuning);
      if (!sampled.matchesRegion || sampled.depthValue < band.min || sampled.depthValue >= band.max) continue;
      const candidate = occurrenceAt(originX, originZ, worldX, worldZ, targetDepth, sampled);
      const score = scoreOccurrence(candidate, band.ideal, coarse);
      if (!best || score < bestScore) { best = candidate; bestScore = score; }
    }
  }
  if (!best) return undefined;

  const refine = (center: RegionInspectionOccurrence, radius: number, step: number): RegionInspectionOccurrence => {
    let refined = center;
    let refinedScore = scoreOccurrence(center, band.ideal, coarse);
    for (let worldX = center.worldX - radius; worldX <= center.worldX + radius; worldX += step) {
      for (let worldZ = center.worldZ - radius; worldZ <= center.worldZ + radius; worldZ += step) {
        const distanceMeters = Math.hypot(worldX - originX, worldZ - originZ);
        if (distanceMeters > maxDistance + step) continue;
        const sampled = sampleDepth(seed, worldX, worldZ, targetRegion, worldDay, exposure, tuning);
        if (!sampled.matchesRegion || sampled.depthValue < band.min || sampled.depthValue >= band.max) continue;
        const candidate = occurrenceAt(originX, originZ, worldX, worldZ, targetDepth, sampled);
        const score = scoreOccurrence(candidate, band.ideal, coarse);
        if (score < refinedScore) { refined = candidate; refinedScore = score; }
      }
    }
    return refined;
  };

  best = refine(best, coarse, CELL_SIZE * 4);
  return refine(best, CELL_SIZE * 8, CELL_SIZE);
}

export function formatRegionDepth(regionId: RegionId, target: RegionDepthTarget, occurrence: RegionInspectionOccurrence): string {
  if (regionId === 'ordinary-level-0') return `strength ${occurrence.regionInfluence.toFixed(3)}`;
  if (regionId === 'pillar-field') return `${target} · depth ${occurrence.depthValue.toFixed(3)} · influence ${occurrence.regionInfluence.toFixed(3)}`;
  return `${target} · interior strength ${occurrence.depthValue.toFixed(3)}`;
}
