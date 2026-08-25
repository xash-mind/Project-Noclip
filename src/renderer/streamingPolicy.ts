export const STREAMING_SCHEDULER_PROFILE = Object.freeze({
  workBudgetMs: 2.25,
  maxHeavyJobsPerFrame: 1,
  unloadGraceMs: 1200,
  predictiveExtraRings: 1,
  predictiveMinimumSpeedMetersPerSecond: 0.08,
  predictiveDiscontinuityMeters: 2,
  maxQueueDepth: 256
});

export type StreamingRetentionDisposition = 'active' | 'retained' | 'unload';
export function streamingRetentionDisposition(distance: number, loadRadius: number, retentionRadius: number): StreamingRetentionDisposition {
  if (distance <= loadRadius) return 'active';
  if (distance <= retentionRadius) return 'retained';
  return 'unload';
}

export interface WarmCoordinate { x: number; z: number; priority: number; }
export interface PredictiveVelocitySample { x: number; z: number; discontinuity: boolean; }
let latestPrediction: readonly WarmCoordinate[] = [];

export function latestPredictiveWarmCoordinates(): readonly WarmCoordinate[] {
  return latestPrediction.map((coordinate) => ({ ...coordinate }));
}

/**
 * Converts world-space motion into the streaming scheduler's authoritative
 * prediction signal. Direction magnitude is metres/second rather than metres
 * per render frame, so the same movement has the same meaning at 30-240 Hz.
 */
export function predictiveVelocitySample(
  previousX: number,
  previousZ: number,
  nextX: number,
  nextZ: number,
  dtSeconds: number
): PredictiveVelocitySample {
  const dx = nextX - previousX;
  const dz = nextZ - previousZ;
  const displacement = Math.hypot(dx, dz);
  if (displacement > STREAMING_SCHEDULER_PROFILE.predictiveDiscontinuityMeters) {
    return { x: 0, z: 0, discontinuity: true };
  }
  if (!(dtSeconds > 0) || displacement <= 0.000001) return { x: 0, z: 0, discontinuity: false };
  return { x: dx / dtSeconds, z: dz / dtSeconds, discontinuity: false };
}

export function predictiveWarmCoordinates(
  centerX: number,
  centerZ: number,
  loadRadius: number,
  velocityX: number,
  velocityZ: number
): WarmCoordinate[] {
  if (Math.hypot(velocityX, velocityZ) < STREAMING_SCHEDULER_PROFILE.predictiveMinimumSpeedMetersPerSecond) {
    latestPrediction = [];
    return [];
  }
  const retentionRadius = loadRadius + STREAMING_SCHEDULER_PROFILE.predictiveExtraRings;
  const length = Math.hypot(velocityX, velocityZ) || 1;
  const nx = velocityX / length;
  const nz = velocityZ / length;
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
