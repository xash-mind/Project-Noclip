import { floorDiv, intInRange, unitFloat, weightedChoice } from './hash.js';
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
  trimTint: [number, number, number];
  fogDensity: number;
  lightMultiplier: number;
}

export const ZONE_PROFILES: Record<ZoneId, ZoneProfile> = {
  baseline: { id: 'baseline', label: 'Baseline Lobby', stability: 'disorienting', minimumWorldDay: 0, minimumExposure: 0, wallTint: [0.56, 0.49, 0.25], floorTint: [0.58, 0.5, 0.3], ceilingTint: [0.62, 0.6, 0.45], trimTint: [0.29, 0.25, 0.13], fogDensity: 0.015, lightMultiplier: 1 },
  arch: { id: 'arch', label: 'Arch Rooms', stability: 'semi-stable', minimumWorldDay: 3, minimumExposure: 0.6, wallTint: [0.63, 0.57, 0.35], floorTint: [0.62, 0.53, 0.33], ceilingTint: [0.7, 0.67, 0.52], trimTint: [0.36, 0.31, 0.18], fogDensity: 0.01, lightMultiplier: 1.08 },
  pillar: { id: 'pillar', label: 'Pillar Field', stability: 'disorienting', minimumWorldDay: 3, minimumExposure: 0.6, wallTint: [0.5, 0.46, 0.27], floorTint: [0.5, 0.44, 0.29], ceilingTint: [0.58, 0.56, 0.43], trimTint: [0.25, 0.23, 0.14], fogDensity: 0.024, lightMultiplier: 0.9 },
  blackout: { id: 'blackout', label: 'Blackout Zone', stability: 'disorienting', minimumWorldDay: 7, minimumExposure: 1.6, wallTint: [0.19, 0.17, 0.115], floorTint: [0.055, 0.06, 0.045], ceilingTint: [0.12, 0.12, 0.09], trimTint: [0.08, 0.08, 0.06], fogDensity: 0.04, lightMultiplier: 0.06 },
  holes: { id: 'holes', label: 'Hole Section', stability: 'terminal', minimumWorldDay: 10, minimumExposure: 2.2, wallTint: [0.42, 0.37, 0.2], floorTint: [0.48, 0.41, 0.25], ceilingTint: [0.48, 0.46, 0.34], trimTint: [0.2, 0.18, 0.1], fogDensity: 0.02, lightMultiplier: 0.72 },
  // Retained as a render/theme profile and World Lab compatibility value. Ordinary generation never emits a Manila zone.
  manila: { id: 'manila', label: 'Manila Room', stability: 'rendezvous', minimumWorldDay: 1, minimumExposure: 0.25, wallTint: [0.68, 0.6, 0.42], floorTint: [0.65, 0.56, 0.42], ceilingTint: [0.73, 0.7, 0.61], trimTint: [0.37, 0.27, 0.17], fogDensity: 0.003, lightMultiplier: 1.22 },
  'exit-threshold': { id: 'exit-threshold', label: 'Exit Threshold', stability: 'semi-stable', minimumWorldDay: 3, minimumExposure: 0.8, wallTint: [0.48, 0.43, 0.24], floorTint: [0.46, 0.4, 0.25], ceilingTint: [0.54, 0.52, 0.41], trimTint: [0.25, 0.22, 0.12], fogDensity: 0.014, lightMultiplier: 0.84 }
};

export const MANILA_MIN_MANHATTAN_DISTANCE = 42;
export const MANILA_MAX_MANHATTAN_DISTANCE = 72;

export function isZoneUnlocked(zoneId: ZoneId, worldDay: number, exposure: number, bypass: boolean): boolean {
  const profile = ZONE_PROFILES[zoneId];
  return bypass || (worldDay >= profile.minimumWorldDay && exposure >= profile.minimumExposure);
}

export function districtId(cellX: number, cellZ: number): string {
  return `${floorDiv(cellX, 5)}:${floorDiv(cellZ, 5)}`;
}

export function manilaRoomCell(seed: string): { cellX: number; cellZ: number } {
  const distance = intInRange(`${seed}:manila:distance`, MANILA_MIN_MANHATTAN_DISTANCE, MANILA_MAX_MANHATTAN_DISTANCE + 1);
  const xMagnitude = intInRange(`${seed}:manila:x-magnitude`, 7, distance - 6);
  const zMagnitude = distance - xMagnitude;
  const xSign = unitFloat(`${seed}:manila:x-sign`) < 0.5 ? -1 : 1;
  const zSign = unitFloat(`${seed}:manila:z-sign`) < 0.5 ? -1 : 1;
  return { cellX: xSign * xMagnitude, cellZ: zSign * zMagnitude };
}

export function isManilaRoomCell(seed: string, cellX: number, cellZ: number, worldDay: number, exposure: number, tuning: WorldTuning): boolean {
  if (tuning.zoneOverride === 'manila') return true;
  if (!isZoneUnlocked('manila', worldDay, exposure, tuning.gateBypass)) return false;
  const target = manilaRoomCell(seed);
  return cellX === target.cellX && cellZ === target.cellZ;
}

export function chooseZone(seed: string, cellX: number, cellZ: number, worldDay: number, exposure: number, tuning: WorldTuning): ZoneId {
  if (tuning.zoneOverride) return tuning.zoneOverride === 'manila' ? 'baseline' : tuning.zoneOverride;

  const dId = districtId(cellX, cellZ);
  const dx = floorDiv(cellX, 5);
  const dz = floorDiv(cellZ, 5);
  const distance = Math.abs(dx) + Math.abs(dz);
  const choices: Array<{ value: ZoneId; weight: number }> = [
    { value: 'baseline', weight: 65 },
    { value: 'arch', weight: distance > 0 ? 12 : 4 },
    { value: 'pillar', weight: distance > 0 ? 11 : 3 },
    { value: 'blackout', weight: distance > 1 ? 7 : 1 },
    { value: 'holes', weight: distance > 2 ? 3 : 0.2 }
  ];
  const unlocked = choices.filter((choice) => isZoneUnlocked(choice.value, worldDay, exposure, tuning.gateBypass));
  const chosen = weightedChoice(`${seed}:district-zone:${dId}`, unlocked.length ? unlocked : [choices[0]!]).value;
  const edgeNoise = unitFloat(`${seed}:district-edge:${cellX}:${cellZ}`);
  if (chosen !== 'baseline' && edgeNoise < 0.11) return 'baseline';
  return chosen;
}
