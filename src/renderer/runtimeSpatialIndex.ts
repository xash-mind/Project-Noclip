import { CELL_SIZE } from '../world/types.js';

export interface SpatialIdentity {
  id: string;
}

export interface SpatialBounds extends SpatialIdentity {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface SpatialPoint extends SpatialIdentity {
  x: number;
  z: number;
}

export interface SpatialQueryBounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

/**
 * Canonical candidate envelope for indexed player collision.
 *
 * The collision resolver can move the player again during axis sweeps and
 * repeated depenetration. Querying one neighboring Cell beyond the swept
 * circle keeps those chained corrections local while preserving the same
 * semantic collider set the production hot path is designed to cover.
 */
export function movementCollisionQueryBounds(
  currentX: number,
  currentZ: number,
  nextX: number,
  nextZ: number,
  radius = 0.34
): SpatialQueryBounds {
  const margin = radius + CELL_SIZE;
  return {
    minX: Math.min(currentX, nextX) - margin,
    minZ: Math.min(currentZ, nextZ) - margin,
    maxX: Math.max(currentX, nextX) + margin,
    maxZ: Math.max(currentZ, nextZ) + margin
  };
}

interface IndexedEntry<T> {
  item: T;
  bucketKeys: string[];
  order: number;
}

function bucketCoordinate(value: number, bucketSize: number): number {
  return Math.floor(value / bucketSize);
}

function bucketKey(x: number, z: number): string {
  return `${x}:${z}`;
}

function orderedUnique<T extends SpatialIdentity>(
  ids: Set<string>,
  entries: ReadonlyMap<string, IndexedEntry<T>>
): T[] {
  return [...ids]
    .map((id) => entries.get(id))
    .filter((entry): entry is IndexedEntry<T> => Boolean(entry))
    .sort((left, right) => left.order - right.order)
    .map((entry) => entry.item);
}

/**
 * Reconstructible runtime index for axis-aligned world geometry.
 *
 * Query results preserve insertion order so the canonical collision resolver
 * sees candidates in the same order as WorldRenderer.walls. This matters for
 * exact depenetration equivalence at corners while still avoiding a global
 * moving-frame wall scan.
 */
export class SpatialAabbIndex<T extends SpatialBounds> {
  private readonly buckets = new Map<string, Set<string>>();
  private readonly entries = new Map<string, IndexedEntry<T>>();
  private serial = 0;

  constructor(readonly bucketSize: number) {
    if (!(bucketSize > 0)) throw new Error('SpatialAabbIndex bucketSize must be positive');
  }

  get size(): number { return this.entries.size; }

  clear(): void {
    this.buckets.clear();
    this.entries.clear();
    this.serial = 0;
  }

  add(item: T): void {
    this.remove(item.id);
    const minBucketX = bucketCoordinate(item.minX, this.bucketSize);
    const maxBucketX = bucketCoordinate(item.maxX, this.bucketSize);
    const minBucketZ = bucketCoordinate(item.minZ, this.bucketSize);
    const maxBucketZ = bucketCoordinate(item.maxZ, this.bucketSize);
    const bucketKeys: string[] = [];
    for (let x = minBucketX; x <= maxBucketX; x += 1) {
      for (let z = minBucketZ; z <= maxBucketZ; z += 1) {
        const key = bucketKey(x, z);
        let members = this.buckets.get(key);
        if (!members) {
          members = new Set();
          this.buckets.set(key, members);
        }
        members.add(item.id);
        bucketKeys.push(key);
      }
    }
    this.entries.set(item.id, { item, bucketKeys, order: this.serial++ });
  }

  remove(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    for (const key of entry.bucketKeys) {
      const members = this.buckets.get(key);
      members?.delete(id);
      if (members?.size === 0) this.buckets.delete(key);
    }
    this.entries.delete(id);
  }

  query(minX: number, minZ: number, maxX: number, maxZ: number): T[] {
    const ids = new Set<string>();
    const minBucketX = bucketCoordinate(minX, this.bucketSize);
    const maxBucketX = bucketCoordinate(maxX, this.bucketSize);
    const minBucketZ = bucketCoordinate(minZ, this.bucketSize);
    const maxBucketZ = bucketCoordinate(maxZ, this.bucketSize);
    for (let x = minBucketX; x <= maxBucketX; x += 1) {
      for (let z = minBucketZ; z <= maxBucketZ; z += 1) {
        for (const id of this.buckets.get(bucketKey(x, z)) ?? []) ids.add(id);
      }
    }
    const candidates = orderedUnique(ids, this.entries);
    return candidates.filter((item) => item.maxX >= minX && item.minX <= maxX && item.maxZ >= minZ && item.minZ <= maxZ);
  }
}

/** Derived point index used for nearby interaction discovery. */
export class SpatialPointIndex<T extends SpatialPoint> {
  private readonly buckets = new Map<string, Set<string>>();
  private readonly entries = new Map<string, IndexedEntry<T>>();
  private serial = 0;

  constructor(readonly bucketSize: number) {
    if (!(bucketSize > 0)) throw new Error('SpatialPointIndex bucketSize must be positive');
  }

  get size(): number { return this.entries.size; }

  clear(): void {
    this.buckets.clear();
    this.entries.clear();
    this.serial = 0;
  }

  add(item: T): void {
    this.remove(item.id);
    const key = bucketKey(bucketCoordinate(item.x, this.bucketSize), bucketCoordinate(item.z, this.bucketSize));
    let members = this.buckets.get(key);
    if (!members) {
      members = new Set();
      this.buckets.set(key, members);
    }
    members.add(item.id);
    this.entries.set(item.id, { item, bucketKeys: [key], order: this.serial++ });
  }

  remove(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    for (const key of entry.bucketKeys) {
      const members = this.buckets.get(key);
      members?.delete(id);
      if (members?.size === 0) this.buckets.delete(key);
    }
    this.entries.delete(id);
  }

  queryRadius(x: number, z: number, radius: number): T[] {
    const ids = new Set<string>();
    const minBucketX = bucketCoordinate(x - radius, this.bucketSize);
    const maxBucketX = bucketCoordinate(x + radius, this.bucketSize);
    const minBucketZ = bucketCoordinate(z - radius, this.bucketSize);
    const maxBucketZ = bucketCoordinate(z + radius, this.bucketSize);
    for (let bx = minBucketX; bx <= maxBucketX; bx += 1) {
      for (let bz = minBucketZ; bz <= maxBucketZ; bz += 1) {
        for (const id of this.buckets.get(bucketKey(bx, bz)) ?? []) ids.add(id);
      }
    }
    const radiusSquared = radius * radius;
    return orderedUnique(ids, this.entries).filter((item) => {
      const dx = item.x - x;
      const dz = item.z - z;
      return dx * dx + dz * dz <= radiusSquared;
    });
  }
}
