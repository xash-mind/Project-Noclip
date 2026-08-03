import { weightedChoice, unitFloat } from '../world/hash.js';
import { ITEM_DEFINITIONS, type ItemDefinitionId } from './definitions.js';

export interface StarterRollConfig {
  noneChance: number;
  oneChance: number;
  twoChance: number;
}

export const DEFAULT_STARTER_ROLL: StarterRollConfig = { noneChance: 0.15, oneChance: 0.6, twoChance: 0.25 };

export function starterItemCount(characterSeed: string, config = DEFAULT_STARTER_ROLL): 0 | 1 | 2 {
  const total = config.noneChance + config.oneChance + config.twoChance;
  if (Math.abs(total - 1) > 0.0001) throw new Error('Starter roll probabilities must sum to 1');
  const roll = unitFloat(`${characterSeed}:starter-count`);
  if (roll < config.noneChance) return 0;
  if (roll < config.noneChance + config.oneChance) return 1;
  return 2;
}

export function rollStarterDefinitions(characterSeed: string, config = DEFAULT_STARTER_ROLL): ItemDefinitionId[] {
  const count = starterItemCount(characterSeed, config);
  if (count === 0) return [];
  const pool = Object.values(ITEM_DEFINITIONS).map((definition) => ({ value: definition.id, weight: definition.starterWeight, highValue: definition.highValue }));
  const first = weightedChoice(`${characterSeed}:starter:0`, pool);
  if (count === 1) return [first.value];
  const compatible = pool.filter((entry) => entry.value !== first.value && !(first.highValue && entry.highValue));
  const second = weightedChoice(`${characterSeed}:starter:1`, compatible);
  return [first.value, second.value];
}

export function simulateStarterRolls(seed: string, sampleCount: number): Record<'none' | 'one' | 'two', number> {
  const result = { none: 0, one: 0, two: 0 };
  for (let index = 0; index < sampleCount; index += 1) {
    const count = starterItemCount(`${seed}:${index}`);
    if (count === 0) result.none += 1;
    else if (count === 1) result.one += 1;
    else result.two += 1;
  }
  return result;
}
