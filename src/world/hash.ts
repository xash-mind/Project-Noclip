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

export function unitFloat(key: string): number {
  return hashString(key) / 0xffffffff;
}

export function intInRange(key: string, min: number, maxInclusive: number): number {
  const span = maxInclusive - min + 1;
  return min + (hashString(key) % span);
}

export function stableId(namespace: string, ...parts: Array<string | number>): string {
  const raw = `${namespace}:${parts.join(':')}`;
  return `${namespace}_${hashString(raw).toString(36).padStart(7, '0')}`;
}

export function weightedChoice<T extends { weight: number }>(key: string, entries: readonly T[]): T {
  if (entries.length === 0) throw new Error('weightedChoice requires at least one entry');
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  if (total <= 0) return entries[0]!;
  let cursor = unitFloat(key) * total;
  for (const entry of entries) {
    cursor -= Math.max(0, entry.weight);
    if (cursor <= 0) return entry;
  }
  return entries[entries.length - 1]!;
}
