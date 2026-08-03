import { ITEM_DEFINITIONS, type ItemDefinitionId } from './definitions.js';
import { unitFloat, weightedChoice } from '../world/hash.js';
export function rollStarterDefinitions(characterSeed: string): ItemDefinitionId[] {
  const countRoll = unitFloat(`${characterSeed}:starter-count`);
  const count = countRoll < 0.15 ? 0 : countRoll < 0.75 ? 1 : 2;
  if (!count) return [];
  const entries = Object.values(ITEM_DEFINITIONS).map((definition) => ({ value: definition.id, weight: definition.starterWeight }));
  const selected: ItemDefinitionId[] = [];
  for (let index = 0; index < count; index += 1) {
    const available = entries.filter((entry) => !selected.includes(entry.value)
      && !(selected.some((id) => ITEM_DEFINITIONS[id].highValue) && ITEM_DEFINITIONS[entry.value].highValue));
    selected.push(weightedChoice(`${characterSeed}:starter:${index}`, available.length ? available : entries).value);
  }
  return selected;
}
export function simulateStarterRolls(seed: string, count: number): { none: number; one: number; two: number } {
  const result = { none: 0, one: 0, two: 0 };
  for (let index = 0; index < count; index += 1) {
    const length = rollStarterDefinitions(`${seed}:${index}`).length;
    if (length === 0) result.none += 1; else if (length === 1) result.one += 1; else result.two += 1;
  }
  return result;
}
