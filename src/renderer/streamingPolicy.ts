export const STREAMING_SCHEDULER_PROFILE = Object.freeze({
  workBudgetMs: 2.25,
  maxHeavyJobsPerFrame: 1,
  unloadGraceMs: 1200,
  predictiveExtraRings: 1,
  maxQueueDepth: 256
});

export type StreamingRetentionDisposition = 'active' | 'retained' | 'unload';
export function streamingRetentionDisposition(distance: number, loadRadius: number, retentionRadius: number): StreamingRetentionDisposition {
  if (distance <= loadRadius) return 'active';
  if (distance <= retentionRadius) return 'retained';
  return 'unload';
}

export interface WarmCoordinate { x: number; z: number; priority: number; }
let latestPrediction: readonly WarmCoordinate[] = [];

export function latestPredictiveWarmCoordinates(): readonly WarmCoordinate[] {
  return latestPrediction.map((coordinate) => ({ ...coordinate }));
}

export function predictiveWarmCoordinates(
  centerX: number,
  centerZ: number,
  loadRadius: number,
  directionX: number,
  directionZ: number
): WarmCoordinate[] {
  if (Math.hypot(directionX, directionZ) < 0.08) {
    latestPrediction = [];
    return [];
  }
  const retentionRadius = loadRadius + STREAMING_SCHEDULER_PROFILE.predictiveExtraRings;
  const length = Math.hypot(directionX, directionZ) || 1;
  const nx = directionX / length;
  const nz = directionZ / length;
  const result = new Map<string, WarmCoordinate>();
  const add = (x: number, z: number, priority: number): void => {
    const id = `${x}:${z}`;
    const existing = result.get(id);
    if (!existing || priority < existing.priority) result.set(id, { x, z, priority });
  };
  if (Math.abs(nx) >= 0.2) {
    const x = centerX + Math.sign(nx) * retentionRadius;
    for (let offset = -loadRadius; offset <= loadRadius; offset += 1) add(x, centerZ + offset, 10 + Math.abs(offset));
  }
  if (Math.abs(nz) >= 0.2) {
    const z = centerZ + Math.sign(nz) * retentionRadius;
    for (let offset = -loadRadius; offset <= loadRadius; offset += 1) add(centerX + offset, z, 10 + Math.abs(offset));
  }
  if (Math.abs(nx) >= 0.2 && Math.abs(nz) >= 0.2) {
    add(centerX + Math.sign(nx) * retentionRadius, centerZ + Math.sign(nz) * retentionRadius, 9);
  }
  const coordinates = [...result.values()].sort((left, right) => left.priority - right.priority || left.x - right.x || left.z - right.z);
  latestPrediction = coordinates.map((coordinate) => ({ ...coordinate }));
  return coordinates;
}

export function streamingFrameCanRunHeavyWork(heavyOperations: number, heavyMs: number): boolean {
  return heavyOperations < STREAMING_SCHEDULER_PROFILE.maxHeavyJobsPerFrame
    && heavyMs < STREAMING_SCHEDULER_PROFILE.workBudgetMs;
}
