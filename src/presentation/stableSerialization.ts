function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
    return Object.fromEntries(entries.map(([key, child]) => [key, normalize(child)]));
  }
  return value;
}

export function stableSerialize(value: unknown): string {
  return JSON.stringify(normalize(value), null, 2);
}
