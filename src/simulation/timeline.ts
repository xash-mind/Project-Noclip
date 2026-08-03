export const WORLD_LAUNCH_EPOCH = Date.UTC(2026, 7, 3, 0, 0, 0);
export interface ExposureState { novelUnits: number; repeatedUnits: number; stableSeconds: number; traversedEdges: Record<string, number>; }
export interface TimelineSnapshot { worldDay: number; exposureDay: number; }
export const EMPTY_EXPOSURE: ExposureState = { novelUnits: 0, repeatedUnits: 0, stableSeconds: 0, traversedEdges: {} };
export function calculateWorldDay(now: number): number { return Math.max(0, Math.floor((now - WORLD_LAUNCH_EPOCH) / 86_400_000)); }
export function calculateExposureDay(state: ExposureState): number { return state.novelUnits / 10_000 + state.repeatedUnits / 100_000 + state.stableSeconds / 86_400; }
export function canonicalEdgeId(x1: number, z1: number, x2: number, z2: number): string {
  return x1 < x2 || (x1 === x2 && z1 <= z2) ? `${x1},${z1}|${x2},${z2}` : `${x2},${z2}|${x1},${z1}`;
}
export function recordTraversal(state: ExposureState, edgeId: string, units: number): ExposureState {
  const previous = state.traversedEdges[edgeId] ?? 0;
  return { ...state, novelUnits: state.novelUnits + (previous === 0 ? units : 0), repeatedUnits: state.repeatedUnits + (previous === 0 ? 0 : units), traversedEdges: { ...state.traversedEdges, [edgeId]: previous + 1 } };
}
export function addStableTime(state: ExposureState, seconds: number): ExposureState { return { ...state, stableSeconds: state.stableSeconds + Math.max(0, seconds) }; }
