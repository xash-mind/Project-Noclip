import { prepareVisibilityTopology, propagateVisibility } from './propagation.js';
import type {
  PreparedVisibilityTopology,
  VisibilityBounds2D,
  VisibilityObserver,
  VisibilityResolvedObserver,
  VisibilitySnapshot,
  VisibilitySnapshotOptions,
  VisibilityTerminationReason,
  VisibilityTopology
} from './types.js';

const POSITION_EPSILON = 1e-5;

function boundsContain(bounds: VisibilityBounds2D, x: number, z: number, epsilon = POSITION_EPSILON): boolean {
  return x >= bounds.minX - epsilon && x <= bounds.maxX + epsilon
    && z >= bounds.minZ - epsilon && z <= bounds.maxZ + epsilon;
}

function area(bounds: VisibilityBounds2D): number {
  return Math.max(0, bounds.maxX - bounds.minX) * Math.max(0, bounds.maxZ - bounds.minZ);
}

function resolveSpaceIndex(topology: PreparedVisibilityTopology, observer: VisibilityObserver): { index?: number; conservative: boolean } {
  const strict = topology.spaces.filter((space) =>
    observer.position.x > space.bounds.minX + POSITION_EPSILON
    && observer.position.x < space.bounds.maxX - POSITION_EPSILON
    && observer.position.z > space.bounds.minZ + POSITION_EPSILON
    && observer.position.z < space.bounds.maxZ - POSITION_EPSILON
  );
  const candidates = strict.length > 0
    ? strict
    : topology.spaces.filter((space) => boundsContain(space.bounds, observer.position.x, observer.position.z));
  if (candidates.length === 0) return { conservative: false };
  candidates.sort((left, right) => area(left.bounds) - area(right.bounds) || left.id.localeCompare(right.id));
  return {
    index: topology.spaceIndexById.get(candidates[0]!.id),
    conservative: strict.length === 0 || candidates.length > 1
  };
}

function resolveCellId(topology: PreparedVisibilityTopology, observer: VisibilityObserver): string {
  const cells = topology.cells
    .filter((cell) => boundsContain(cell.bounds, observer.position.x, observer.position.z))
    .sort((left, right) => left.id.localeCompare(right.id));
  return cells[0]?.id ?? 'outside-scope';
}

function terminationPrimary(reasons: ReadonlySet<VisibilityTerminationReason>): VisibilityTerminationReason {
  if (reasons.has('state-budget-conservative')) return 'state-budget-conservative';
  if (reasons.has('max-depth-conservative')) return 'max-depth-conservative';
  if (reasons.has('max-distance')) return 'max-distance';
  return 'frontier-exhausted';
}

export function createVisibilitySnapshot(
  topologyInput: VisibilityTopology | PreparedVisibilityTopology,
  observer: VisibilityObserver,
  options: VisibilitySnapshotOptions
): VisibilitySnapshot {
  const topology = 'spaceIndexById' in topologyInput ? topologyInput : prepareVisibilityTopology(topologyInput);
  const resolvedSpace = resolveSpaceIndex(topology, observer);
  const resolvedObserver: VisibilityResolvedObserver = {
    position: { ...observer.position },
    direction: observer.direction ? { ...observer.direction } : undefined,
    horizontalFovRadians: observer.horizontalFovRadians,
    spaceId: resolvedSpace.index === undefined ? undefined : topology.spaces[resolvedSpace.index]!.id,
    cellId: resolveCellId(topology, observer),
    conservative: resolvedSpace.conservative
      || (observer.expectedSpaceId !== undefined
        && resolvedSpace.index !== undefined
        && topology.spaces[resolvedSpace.index]!.id !== observer.expectedSpaceId)
  };

  if (resolvedSpace.index === undefined) {
    return {
      topology: { ...topology.metadata },
      observer: resolvedObserver,
      visibleSpaces: [],
      visibleCells: resolvedObserver.cellId === 'outside-scope' ? [] : [resolvedObserver.cellId],
      evidence: [],
      frontier: [],
      conservativeInclusions: [],
      topologyConservativeReasons: [...topology.conservativeReasons],
      termination: {
        primaryReason: 'observer-outside-topology',
        reasons: ['observer-outside-topology'],
        maxDepthReached: 0,
        frontierStatesProcessed: 0
      }
    };
  }

  const propagated = propagateVisibility(topology, resolvedSpace.index, observer, options);
  const evidence = [...propagated.evidence].sort((left, right) =>
    left.depth - right.depth || left.spaceId.localeCompare(right.spaceId));
  const visibleSpaces = evidence.map((item) => item.spaceId).sort();
  const cellIds = new Set<string>();
  for (const evidenceItem of evidence) {
    const spaceIndex = topology.spaceIndexById.get(evidenceItem.spaceId);
    if (spaceIndex === undefined) continue;
    for (const cellId of topology.spaces[spaceIndex]!.cellIds) {
      if (topology.cellById.has(cellId)) cellIds.add(cellId);
    }
  }
  if (resolvedObserver.cellId !== 'outside-scope') cellIds.add(resolvedObserver.cellId);
  const reasons = [...propagated.terminationReasons].sort();

  return {
    topology: { ...topology.metadata },
    observer: resolvedObserver,
    visibleSpaces,
    visibleCells: [...cellIds].sort(),
    evidence,
    frontier: [...propagated.frontier].sort((left, right) =>
      left.depth - right.depth || left.openingId.localeCompare(right.openingId) || left.fromSpaceId.localeCompare(right.fromSpaceId)),
    conservativeInclusions: [...propagated.conservativeSpaceIds].sort(),
    topologyConservativeReasons: [...topology.conservativeReasons],
    termination: {
      primaryReason: terminationPrimary(propagated.terminationReasons),
      reasons,
      maxDepthReached: propagated.maxDepthReached,
      frontierStatesProcessed: propagated.frontierStatesProcessed
    }
  };
}
