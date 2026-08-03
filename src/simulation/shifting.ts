import { unitFloat } from '../world/hash.js';
import type { StabilityClass } from '../world/types.js';

export interface ShiftEligibility {
  occupied: boolean;
  observed: boolean;
  distanceInCells: number;
  stability: StabilityClass;
  protectedInteraction: boolean;
  preservesPath: boolean;
}

export function canShift(input: ShiftEligibility): boolean {
  if (input.occupied || input.observed || input.protectedInteraction || !input.preservesPath) return false;
  if (input.distanceInCells <= 2) return false;
  return input.stability === 'disorienting' || input.stability === 'semi-stable';
}

export function shouldShift(seed: string, cellId: string, unloadCount: number, chance: number): boolean {
  return unitFloat(`${seed}:shift:${cellId}:${unloadCount}`) < Math.max(0, Math.min(1, chance));
}
