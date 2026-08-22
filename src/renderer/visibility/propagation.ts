import type {
  PreparedVisibilityTopology,
  VisibilityFrontierEvidence,
  VisibilityObserver,
  VisibilityOpeningRef,
  VisibilitySnapshotOptions,
  VisibilitySpaceEvidence,
  VisibilityTopology,
  VisibilityTerminationReason
} from './types.js';

const TAU = Math.PI * 2;
const ANGLE_EPSILON = 1e-8;
const DISTANCE_EPSILON = 1e-6;

interface AngleRange {
  min: number;
  max: number;
}

interface FrontierState {
  spaceIndex: number;
  ranges: AngleRange[];
  depth: number;
}

export interface VisibilityPropagationResult {
  evidence: VisibilitySpaceEvidence[];
  frontier: VisibilityFrontierEvidence[];
  conservativeSpaceIds: Set<string>;
  terminationReasons: Set<VisibilityTerminationReason>;
  maxDepthReached: number;
  frontierStatesProcessed: number;
}

function normalizedAngle(value: number): number {
  const result = value % TAU;
  return result < 0 ? result + TAU : result;
}

function mergeRanges(ranges: readonly AngleRange[]): AngleRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges]
    .filter((range) => range.max - range.min > ANGLE_EPSILON)
    .sort((left, right) => left.min - right.min || left.max - right.max);
  const merged: AngleRange[] = [];
  for (const range of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || range.min > previous.max + ANGLE_EPSILON) {
      merged.push({ min: range.min, max: range.max });
    } else {
      previous.max = Math.max(previous.max, range.max);
    }
  }
  return merged;
}

function rangeLength(ranges: readonly AngleRange[]): number {
  return ranges.reduce((total, range) => total + range.max - range.min, 0);
}

function splitWrappedRange(start: number, end: number): AngleRange[] {
  const width = end - start;
  if (width >= TAU - ANGLE_EPSILON) return [{ min: 0, max: TAU }];
  if (width <= ANGLE_EPSILON) return [];
  const normalizedStart = normalizedAngle(start);
  const normalizedEnd = normalizedStart + width;
  if (normalizedEnd <= TAU + ANGLE_EPSILON) {
    return [{ min: normalizedStart, max: Math.min(TAU, normalizedEnd) }];
  }
  return [
    { min: normalizedStart, max: TAU },
    { min: 0, max: normalizedEnd - TAU }
  ];
}

function fovRanges(observer: VisibilityObserver): AngleRange[] {
  if (observer.horizontalFovRadians === undefined || observer.horizontalFovRadians >= TAU - ANGLE_EPSILON) {
    return [{ min: 0, max: TAU }];
  }
  const direction = observer.direction;
  if (!direction || Math.hypot(direction.x, direction.z) <= DISTANCE_EPSILON) {
    // Missing/degenerate orientation deliberately fails open. False-negative
    // visibility is more dangerous than conservative over-inclusion.
    return [{ min: 0, max: TAU }];
  }
  const fov = Math.max(0, Math.min(TAU, observer.horizontalFovRadians));
  const center = Math.atan2(direction.z, direction.x);
  return splitWrappedRange(center - fov / 2, center + fov / 2);
}

function pointToSegmentDistance(
  point: { x: number; z: number },
  opening: VisibilityOpeningRef
): number {
  const start = opening.segment.start;
  const end = opening.segment.end;
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq <= DISTANCE_EPSILON) return Math.hypot(point.x - start.x, point.z - start.z);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSq));
  return Math.hypot(point.x - (start.x + dx * t), point.z - (start.z + dz * t));
}

function openingRanges(observer: VisibilityObserver, opening: VisibilityOpeningRef): AngleRange[] {
  if (pointToSegmentDistance(observer.position, opening) <= 0.02) return [{ min: 0, max: TAU }];
  const start = Math.atan2(opening.segment.start.z - observer.position.z, opening.segment.start.x - observer.position.x);
  const end = Math.atan2(opening.segment.end.z - observer.position.z, opening.segment.end.x - observer.position.x);
  let delta = normalizedAngle(end - start);
  if (delta > Math.PI) {
    delta = TAU - delta;
    return splitWrappedRange(end, end + delta);
  }
  return splitWrappedRange(start, start + delta);
}

function intersectRanges(left: readonly AngleRange[], right: readonly AngleRange[]): AngleRange[] {
  const intersections: AngleRange[] = [];
  for (const a of left) {
    for (const b of right) {
      const min = Math.max(a.min, b.min);
      const max = Math.min(a.max, b.max);
      if (max - min > ANGLE_EPSILON) intersections.push({ min, max });
    }
  }
  return mergeRanges(intersections);
}

function addCoverage(coverage: AngleRange[], incoming: readonly AngleRange[]): { merged: AngleRange[]; expanded: boolean } {
  const previousLength = rangeLength(coverage);
  const merged = mergeRanges([...coverage, ...incoming]);
  return { merged, expanded: rangeLength(merged) > previousLength + ANGLE_EPSILON };
}

export function prepareVisibilityTopology(topology: VisibilityTopology): PreparedVisibilityTopology {
  const spaces = [...topology.spaces]
    .map((space) => ({ ...space, cellIds: [...space.cellIds].sort() }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const openings = [...topology.openings]
    .map((opening) => ({
      ...opening,
      segment: {
        start: { ...opening.segment.start },
        end: { ...opening.segment.end }
      }
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const cells = [...topology.cells].map((cell) => ({ ...cell })).sort((left, right) => left.id.localeCompare(right.id));
  const spaceIndexById = new Map(spaces.map((space, index) => [space.id, index] as const));
  const openingIndicesBySpace: number[][] = spaces.map(() => []);
  for (let openingIndex = 0; openingIndex < openings.length; openingIndex += 1) {
    const opening = openings[openingIndex]!;
    const fromIndex = spaceIndexById.get(opening.fromSpaceId);
    const toIndex = spaceIndexById.get(opening.toSpaceId);
    if (fromIndex === undefined || toIndex === undefined) continue;
    openingIndicesBySpace[fromIndex]!.push(openingIndex);
    openingIndicesBySpace[toIndex]!.push(openingIndex);
  }
  return {
    metadata: { ...topology.metadata },
    spaces,
    openings,
    cells,
    conservativeReasons: [...topology.conservativeReasons].sort((left, right) =>
      left.code.localeCompare(right.code) || left.detail.localeCompare(right.detail)),
    spaceIndexById,
    openingIndicesBySpace,
    cellById: new Map(cells.map((cell) => [cell.id, cell] as const))
  };
}

function targetSpaceIndex(
  topology: PreparedVisibilityTopology,
  currentSpaceId: string,
  opening: VisibilityOpeningRef
): number | undefined {
  const targetId = opening.fromSpaceId === currentSpaceId ? opening.toSpaceId : opening.fromSpaceId;
  return topology.spaceIndexById.get(targetId);
}

function conservativeFlood(
  topology: PreparedVisibilityTopology,
  observer: VisibilityObserver,
  options: Required<VisibilitySnapshotOptions>,
  seeds: readonly number[],
  evidenceByIndex: Array<VisibilitySpaceEvidence | undefined>,
  conservativeSpaceIds: Set<string>,
  reason: 'conservative-depth-safety' | 'conservative-state-budget'
): number {
  const queued = new Set<number>();
  const queue: Array<{ spaceIndex: number; depth: number }> = [];
  for (const seed of [...seeds].sort((a, b) => a - b)) {
    if (queued.has(seed)) continue;
    queued.add(seed);
    queue.push({ spaceIndex: seed, depth: evidenceByIndex[seed]?.depth ?? 0 });
  }
  let maxDepth = 0;
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor]!;
    const currentSpace = topology.spaces[current.spaceIndex]!;
    maxDepth = Math.max(maxDepth, current.depth);
    for (const openingIndex of topology.openingIndicesBySpace[current.spaceIndex] ?? []) {
      const opening = topology.openings[openingIndex]!;
      if (pointToSegmentDistance(observer.position, opening) > options.maxDistance + DISTANCE_EPSILON) continue;
      const targetIndex = targetSpaceIndex(topology, currentSpace.id, opening);
      if (targetIndex === undefined) continue;
      const target = topology.spaces[targetIndex]!;
      const depth = current.depth + 1;
      if (!evidenceByIndex[targetIndex]) {
        evidenceByIndex[targetIndex] = {
          spaceId: target.id,
          depth,
          reason,
          fromSpaceId: currentSpace.id,
          viaOpeningId: opening.id,
          conservative: true
        };
        conservativeSpaceIds.add(target.id);
      }
      if (!queued.has(targetIndex)) {
        queued.add(targetIndex);
        queue.push({ spaceIndex: targetIndex, depth });
      }
    }
  }
  return maxDepth;
}

export function propagateVisibility(
  topology: PreparedVisibilityTopology,
  observerSpaceIndex: number,
  observer: VisibilityObserver,
  requestedOptions: VisibilitySnapshotOptions
): VisibilityPropagationResult {
  const options: Required<VisibilitySnapshotOptions> = {
    maxDistance: Math.max(0, requestedOptions.maxDistance),
    maxDepth: Math.max(1, requestedOptions.maxDepth ?? 24),
    maxFrontierStates: Math.max(16, requestedOptions.maxFrontierStates ?? 4096),
    captureFrontier: requestedOptions.captureFrontier ?? true
  };
  const evidenceByIndex: Array<VisibilitySpaceEvidence | undefined> = topology.spaces.map(() => undefined);
  const coverage: AngleRange[][] = topology.spaces.map(() => []);
  const frontier: VisibilityFrontierEvidence[] = [];
  const conservativeSpaceIds = new Set<string>();
  const terminationReasons = new Set<VisibilityTerminationReason>();
  const observerSpace = topology.spaces[observerSpaceIndex]!;
  evidenceByIndex[observerSpaceIndex] = {
    spaceId: observerSpace.id,
    depth: 0,
    reason: 'observer-space',
    conservative: false
  };
  coverage[observerSpaceIndex] = fovRanges(observer);
  const queue: FrontierState[] = [{ spaceIndex: observerSpaceIndex, ranges: coverage[observerSpaceIndex]!, depth: 0 }];
  let frontierStatesProcessed = 0;
  let maxDepthReached = 0;
  let hitDepthBound = false;
  let hitDistanceBound = false;
  let hitStateBudget = false;

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    if (frontierStatesProcessed >= options.maxFrontierStates) {
      hitStateBudget = true;
      break;
    }
    const state = queue[cursor]!;
    frontierStatesProcessed += 1;
    maxDepthReached = Math.max(maxDepthReached, state.depth);
    const currentSpace = topology.spaces[state.spaceIndex]!;
    for (const openingIndex of topology.openingIndicesBySpace[state.spaceIndex] ?? []) {
      const opening = topology.openings[openingIndex]!;
      const targetIndex = targetSpaceIndex(topology, currentSpace.id, opening);
      if (targetIndex === undefined) continue;
      const target = topology.spaces[targetIndex]!;
      const nextDepth = state.depth + 1;
      const distance = pointToSegmentDistance(observer.position, opening);
      if (distance > options.maxDistance + DISTANCE_EPSILON) {
        hitDistanceBound = true;
        if (options.captureFrontier) frontier.push({
          openingId: opening.id,
          fromSpaceId: currentSpace.id,
          toSpaceId: target.id,
          depth: nextDepth,
          reason: 'max-distance'
        });
        continue;
      }
      if (nextDepth > options.maxDepth) {
        hitDepthBound = true;
        if (options.captureFrontier) frontier.push({
          openingId: opening.id,
          fromSpaceId: currentSpace.id,
          toSpaceId: target.id,
          depth: nextDepth,
          reason: 'max-depth'
        });
        continue;
      }
      const projected = openingRanges(observer, opening);
      const nextRanges = intersectRanges(state.ranges, projected);
      if (nextRanges.length === 0) {
        if (options.captureFrontier) frontier.push({
          openingId: opening.id,
          fromSpaceId: currentSpace.id,
          toSpaceId: target.id,
          depth: nextDepth,
          reason: 'angularly-occluded'
        });
        continue;
      }
      const updated = addCoverage(coverage[targetIndex]!, nextRanges);
      if (!updated.expanded) continue;
      coverage[targetIndex] = updated.merged;
      if (!evidenceByIndex[targetIndex]) {
        evidenceByIndex[targetIndex] = {
          spaceId: target.id,
          depth: nextDepth,
          reason: 'opening-chain',
          fromSpaceId: currentSpace.id,
          viaOpeningId: opening.id,
          conservative: opening.conservative
        };
        if (opening.conservative) conservativeSpaceIds.add(target.id);
      }
      queue.push({ spaceIndex: targetIndex, ranges: nextRanges, depth: nextDepth });
    }
  }

  if (hitStateBudget) {
    terminationReasons.add('state-budget-conservative');
    const seeds = evidenceByIndex.flatMap((evidence, index) => evidence ? [index] : []);
    maxDepthReached = Math.max(
      maxDepthReached,
      conservativeFlood(topology, observer, options, seeds, evidenceByIndex, conservativeSpaceIds, 'conservative-state-budget')
    );
  } else if (hitDepthBound) {
    terminationReasons.add('max-depth-conservative');
    const seeds = evidenceByIndex.flatMap((evidence, index) => evidence ? [index] : []);
    maxDepthReached = Math.max(
      maxDepthReached,
      conservativeFlood(topology, observer, options, seeds, evidenceByIndex, conservativeSpaceIds, 'conservative-depth-safety')
    );
  }
  if (hitDistanceBound) terminationReasons.add('max-distance');
  if (terminationReasons.size === 0) terminationReasons.add('frontier-exhausted');

  return {
    evidence: evidenceByIndex.filter((evidence): evidence is VisibilitySpaceEvidence => Boolean(evidence)),
    frontier,
    conservativeSpaceIds,
    terminationReasons,
    maxDepthReached,
    frontierStatesProcessed
  };
}
