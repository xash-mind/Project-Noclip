import type { StabilityClass } from '../world/types.js';
import { unitFloat } from '../world/hash.js';
export interface ShiftEligibility { occupied: boolean; observed: boolean; distanceInCells: number; stability: StabilityClass; protectedInteraction: boolean; preservesPath: boolean; }
export function canShift(input: ShiftEligibility): boolean {
  return !input.occupied && !input.observed && input.distanceInCells >= 2 && input.stability !== 'stable' && input.stability !== 'rendezvous' && !input.protectedInteraction && input.preservesPath;
}
export function shouldShift(seed: string, cellId: string, unloadCount: number, chance: number): boolean {
  return unitFloat(`${seed}:shift:${cellId}:${unloadCount}`) < Math.max(0, Math.min(1, chance));
}
