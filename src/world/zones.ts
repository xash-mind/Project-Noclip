import { unitFloat } from './hash.js';
import type { StabilityClass, WorldTuning, ZoneId } from './types.js';

export interface ZoneProfile {
  id: ZoneId;
  label: string;
  stability: StabilityClass;
  minimumWorldDay: number;
  minimumExposure: number;
  wallTint: [number, number, number];
  floorTint: [number, number, number];
  ceilingTint: [number, number, number];
  fogDensity: number;
  lightMultiplier: number;
}

export const ZONE_PROFILES: Record<ZoneId, ZoneProfile> = {
  baseline: { id: 'baseline', label: 'Baseline Lobby', stability: 'disorienting', minimumWorldDay: 0, minimumExposure: 0, wallTint: [0.56, 0.49, 0.25], floorTint: [0.25, 0.22, 0.12], ceilingTint: [0.62, 0.6, 0.45], fogDensity: 0.015, lightMultiplier: 1 },
  arch: { id: 'arch', label: 'Arch Rooms', stability: 'semi-stable', minimumWorldDay: 3, minimumExposure: 1, wallTint: [0.6, 0.54, 0.33], floorTint: [0.28, 0.24, 0.15], ceilingTint: [0.68, 0.65, 0.5], fogDensity: 0.011, lightMultiplier: 1.08 },
  pillar: { id: 'pillar', label: 'Pillar Field', stability: 'disorienting', minimumWorldDay: 3, minimumExposure: 1, wallTint: [0.52, 0.47, 0.27], floorTint: [0.22, 0.2, 0.13], ceilingTint: [0.58, 0.57, 0.44], fogDensity: 0.021, lightMultiplier: 0.92 },
  blackout: { id: 'blackout', label: 'Blackout Zone', stability: 'disorienting', minimumWorldDay: 7, minimumExposure: 2, wallTint: [0.2, 0.18, 0.12], floorTint: [0.07, 0.07, 0.05], ceilingTint: [0.13, 0.13, 0.1], fogDensity: 0.035, lightMultiplier: 0.08 },
  holes: { id: 'holes', label: 'Hole Section', stability: 'terminal', minimumWorldDay: 7, minimumExposure: 2, wallTint: [0.43, 0.38, 0.21], floorTint: [0.13, 0.12, 0.08], ceilingTint: [0.48, 0.46, 0.34], fogDensity: 0.018, lightMultiplier: 0.76 },
  manila: { id: 'manila', label: 'Manila Room', stability: 'rendezvous', minimumWorldDay: 0, minimumExposure: 0, wallTint: [0.67, 0.59, 0.4], floorTint: [0.31, 0.27, 0.2], ceilingTint: [0.72, 0.69, 0.59], fogDensity: 0.004, lightMultiplier: 1.22 },
  'exit-threshold': { id: 'exit-threshold', label: 'Exit Threshold', stability: 'semi-stable', minimumWorldDay: 0, minimumExposure: 0, wallTint: [0.49, 0.44, 0.25], floorTint: [0.2, 0.18, 0.11], ceilingTint: [0.55, 0.53, 0.42], fogDensity: 0.012, lightMultiplier: 0.88 }
};

function isUnlocked(profile: ZoneProfile, worldDay: number, exposure: number, bypass: boolean): boolean {
  return bypass || (worldDay >= profile.minimumWorldDay && exposure >= profile.minimumExposure);
}

export function chooseZone(seed: string, cellX: number, cellZ: number, worldDay: number, exposure: number, tuning: WorldTuning): ZoneId {
  if (tuning.zoneOverride) return tuning.zoneOverride;
  if (cellX === 3 && cellZ === -2) return 'manila';
  if (Math.abs(cellX) + Math.abs(cellZ) > 3 && unitFloat(`${seed}:manila:${cellX}:${cellZ}`) < 0.0015) return 'manila';

  const candidates: Array<{ id: ZoneId; threshold: number }> = [
    { id: 'blackout', threshold: 0.025 },
    { id: 'holes', threshold: 0.045 },
    { id: 'arch', threshold: 0.12 },
    { id: 'pillar', threshold: 0.2 }
  ];
  const roll = unitFloat(`${seed}:zone:${cellX}:${cellZ}`);
  let cumulative = 0;
  for (const candidate of candidates) {
    cumulative += candidate.threshold;
    const profile = ZONE_PROFILES[candidate.id];
    if (roll < cumulative && isUnlocked(profile, worldDay, exposure, tuning.gateBypass)) return candidate.id;
  }
  return 'baseline';
}
