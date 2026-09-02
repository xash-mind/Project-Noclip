export interface VisibilityPoint2D {
  x: number;
  z: number;
}

export interface VisibilityBounds2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface VisibilitySegment2D {
  start: VisibilityPoint2D;
  end: VisibilityPoint2D;
}

export interface VisibilityCellRef {
  id: string;
  x: number;
  z: number;
  bounds: VisibilityBounds2D;
}

export interface VisibilitySpaceRef {
  id: string;
  bounds: VisibilityBounds2D;
  cellIds: readonly string[];
}

export type VisibilityOpeningKind =
  | 'portal'
  | 'arch-aperture'
  | 'route-clearance'
  | 'open-seam';

export interface VisibilityOpeningRef {
  id: string;
  wallId: string;
  fromSpaceId: string;
  toSpaceId: string;
  kind: VisibilityOpeningKind;
  segment: VisibilitySegment2D;
  width: number;
  mandatory: boolean;
  arch: boolean;
  conservative: boolean;
  sourcePortalId?: string;
}

export interface VisibilityTopologyConservativeReason {
  code: 'scope-edge' | 'ambiguous-adjacency' | 'derived-open-seam';
  detail: string;
  openingId?: string;
  wallId?: string;
}

export interface VisibilityTopologyMetadata {
  source: 'generation-3' | 'synthetic';
  seed?: string;
  worldDay?: number;
  exposure?: number;
}

export interface VisibilityTopology {
  metadata: VisibilityTopologyMetadata;
  spaces: readonly VisibilitySpaceRef[];
  openings: readonly VisibilityOpeningRef[];
  cells: readonly VisibilityCellRef[];
  conservativeReasons: readonly VisibilityTopologyConservativeReason[];
}

export interface PreparedVisibilityTopology extends VisibilityTopology {
  readonly spaceIndexById: ReadonlyMap<string, number>;
  readonly openingIndicesBySpace: readonly (readonly number[])[];
  readonly cellById: ReadonlyMap<string, VisibilityCellRef>;
}

export interface VisibilityObserver {
  position: VisibilityPoint2D;
  direction?: VisibilityPoint2D;
  /**
   * Omit for conservative all-direction topology visibility. Supplying a value
   * activates camera-facing angular clipping around direction.
   */
  horizontalFovRadians?: number;
  /** Optional diagnostic assertion. The snapshot still resolves world truth from position. */
  expectedSpaceId?: string;
}

export interface VisibilitySnapshotOptions {
  /** World-space radius bounding propagation. */
  maxDistance: number;
  /** Hard graph-depth safety bound before conservative connected fallback. */
  maxDepth?: number;
  /** Hard processing budget before conservative connected fallback. */
  maxFrontierStates?: number;
  /** Keep rejected-frontier diagnostics. Disable for the eventual frequent runtime path. */
  captureFrontier?: boolean;
}

export type VisibilitySpaceReason =
  | 'observer-space'
  | 'opening-chain'
  | 'conservative-depth-safety'
  | 'conservative-state-budget';

export interface VisibilitySpaceEvidence {
  spaceId: string;
  depth: number;
  reason: VisibilitySpaceReason;
  fromSpaceId?: string;
  viaOpeningId?: string;
  conservative: boolean;
}

export type VisibilityFrontierReason =
  | 'max-distance'
  | 'max-depth'
  | 'angularly-occluded'
  | 'already-covered';

export interface VisibilityFrontierEvidence {
  openingId: string;
  fromSpaceId: string;
  toSpaceId: string;
  depth: number;
  reason: VisibilityFrontierReason;
}

export type VisibilityTerminationReason =
  | 'observer-outside-topology'
  | 'frontier-exhausted'
  | 'max-distance'
  | 'max-depth-conservative'
  | 'state-budget-conservative';

export interface VisibilityTermination {
  primaryReason: VisibilityTerminationReason;
  reasons: readonly VisibilityTerminationReason[];
  maxDepthReached: number;
  frontierStatesProcessed: number;
}

export interface VisibilityResolvedObserver {
  position: VisibilityPoint2D;
  direction?: VisibilityPoint2D;
  horizontalFovRadians?: number;
  spaceId?: string;
  cellId: string;
  conservative: boolean;
}

export interface VisibilitySnapshot {
  topology: VisibilityTopologyMetadata;
  observer: VisibilityResolvedObserver;
  visibleSpaces: readonly string[];
  visibleCells: readonly string[];
  evidence: readonly VisibilitySpaceEvidence[];
  frontier: readonly VisibilityFrontierEvidence[];
  conservativeInclusions: readonly string[];
  topologyConservativeReasons: readonly VisibilityTopologyConservativeReason[];
  termination: VisibilityTermination;
}

export interface VisibilitySpaceDiagnostic {
  spaceId: string;
  depth: number;
  reason: VisibilitySpaceReason;
  conservative: boolean;
  openingChain: readonly string[];
}

export interface VisibilityDiagnosticReport {
  topology: VisibilityTopologyMetadata;
  observer: VisibilityResolvedObserver;
  visibleSpaceIds: readonly string[];
  visibleCellIds: readonly string[];
  spaces: readonly VisibilitySpaceDiagnostic[];
  frontier: readonly VisibilityFrontierEvidence[];
  conservativeInclusions: readonly string[];
  topologyConservativeReasons: readonly VisibilityTopologyConservativeReason[];
  termination: VisibilityTermination;
}
