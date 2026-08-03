export function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash += hash << 13;
  hash ^= hash >>> 7;
  hash += hash << 3;
  hash ^= hash >>> 17;
  hash += hash << 5;
  return hash >>> 0;
}
export function unitFloat(input: string): number { return hashString(input) / 0x100000000; }
export function intInRange(input: string, min: number, maxExclusive: number): number {
  return min + Math.floor(unitFloat(input) * Math.max(1, maxExclusive - min));
}
export function stableId(...parts: Array<string | number>): string {
  const raw = parts.join(':');
  return `${String(parts[0] ?? 'id')}-${hashString(raw).toString(36)}-${hashString(`${raw}:b`).toString(36)}`;
}
export function weightedChoice<T>(seed: string, entries: ReadonlyArray<{ value: T; weight: number }>): { value: T; weight: number } {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  if (!entries.length || total <= 0) throw new Error('weightedChoice requires positive entries');
  let roll = unitFloat(seed) * total;
  for (const entry of entries) {
    roll -= Math.max(0, entry.weight);
    if (roll <= 0) return entry;
  }
  return entries[entries.length - 1]!;
}
export function floorDiv(value: number, divisor: number): number { return Math.floor(value / divisor); }
