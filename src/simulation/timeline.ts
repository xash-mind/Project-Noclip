export const WORLD_LAUNCH_EPOCH_MS = Date.UTC(2026, 7, 3, 0, 0, 0);

export interface ExposureState {
  novelUnits: number;
  repeatedUnits: number;
  stableSeconds: number;
  recentEdges: string[];
}

export interface TimelineSnapshot {
  worldDay: number;
  exposureDay: number;
}

export function calculateWorldDay(nowMs: number, launchEpochMs = WORLD_LAUNCH_EPOCH_MS): number {
  return Math.max(0, Math.floor((nowMs - launchEpochMs) / 86_400_000));
}

export function calculateExposureDay(state: ExposureState): number {
  return state.novelUnits / 10_000 + state.repeatedUnits / 100_000 + state.stableSeconds / 86_400;
}

export function recordTraversal(state: ExposureState, edgeId: string, units: number): ExposureState {
  const alreadyRecent = state.recentEdges.includes(edgeId);
  const recentEdges = [...state.recentEdges.filter((entry) => entry !== edgeId), edgeId].slice(-500);
  return {
    novelUnits: state.novelUnits + (alreadyRecent ? 0 : units),
    repeatedUnits: state.repeatedUnits + (alreadyRecent ? units : 0),
    stableSeconds: state.stableSeconds,
    recentEdges
  };
}

export function addStableTime(state: ExposureState, seconds: number): ExposureState {
  if (!Number.isFinite(seconds) || seconds <= 0) return state;
  return { ...state, stableSeconds: state.stableSeconds + Math.min(seconds, 60) };
}

export function canonicalEdgeId(fromX: number, fromZ: number, toX: number, toZ: number): string {
  return fromX < toX || (fromX === toX && fromZ <= toZ)
    ? `${fromX},${fromZ}|${toX},${toZ}`
    : `${toX},${toZ}|${fromX},${fromZ}`;
}

export const EMPTY_EXPOSURE: ExposureState = { novelUnits: 0, repeatedUnits: 0, stableSeconds: 0, recentEdges: [] };
