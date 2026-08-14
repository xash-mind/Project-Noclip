import type { WorldTuning } from './types.js';
import {
  ARCH_HEADER_HEIGHT,
  ARCH_IRREGULAR_CHANCE,
  ARCH_LOWER_HEIGHT,
  PILLAR_MAX_WIDTH,
  PILLAR_MIN_WIDTH,
  PILLAR_SPACING,
  PILLAR_WIDTH_SCALE,
  sampleGen3RegionInfluence,
  type Gen3ArchitectureResult,
  type Gen3RegionInfluence
} from './gen3ArchitectureCore.js';
import {
  generateSpaceTopologyArchitecture,
  sampleSpaceTopology,
  topologyArchDiagnostic,
  topologyJunctionDiagnostic,
  TOPOLOGY_ARCH_MAX_SHARE,
  TOPOLOGY_GRID,
  TOPOLOGY_LOOP_MAX,
  TOPOLOGY_LOOP_MIN,
  type SpaceTopologyDiagnostic
} from './gen3SpaceTopology.js';

export {
  ARCH_IRREGULAR_CHANCE,
  PILLAR_MAX_WIDTH,
  PILLAR_MIN_WIDTH,
  PILLAR_SPACING,
  PILLAR_WIDTH_SCALE,
  sampleGen3RegionInfluence,
  sampleSpaceTopology,
  TOPOLOGY_ARCH_MAX_SHARE,
  TOPOLOGY_GRID,
  TOPOLOGY_LOOP_MAX,
  TOPOLOGY_LOOP_MIN
};
export type JunctionKind = 'cross' | 't' | 'corner' | 'straight' | 'termination' | 'open';
export type { Gen3ArchitectureResult, Gen3RegionInfluence, SpaceTopologyDiagnostic };

/**
 * Space Topology owns the room graph, portal degree, and Region-shaped spatial
 * hierarchy first. This function realizes that intentional graph as streamed
 * Generation 3 geometry without making Cells architectural owners.
 */
export const generateCoherentGen3Architecture = generateSpaceTopologyArchitecture;

export function gen3JunctionDiagnostic(options: {
  seed: string;
  junctionX: number;
  junctionZ: number;
  worldDay: number;
  exposure: number;
  tuning: WorldTuning;
}): { selectedKind: Exclude<JunctionKind, 'open'>; actualKind: JunctionKind; arms: { west: boolean; east: boolean; north: boolean; south: boolean } } {
  const diagnostic = topologyJunctionDiagnostic(options);
  return {
    selectedKind: diagnostic.actualKind === 'open' ? 'termination' : diagnostic.actualKind,
    actualKind: diagnostic.actualKind,
    arms: diagnostic.arms
  };
}

export function gen3ArchDividerDiagnostic(options: {
  seed: string;
  axis: 'x' | 'z';
  lineIndex: number;
  groupIndex: number;
  worldDay: number;
  exposure: number;
  tuning: WorldTuning;
}): { id: string; bayWidth: number; bayCount: number; irregular: boolean; symmetryDelta: number; start: number; end: number } | undefined {
  const diagnostic = topologyArchDiagnostic(options);
  if (!diagnostic) return undefined;
  return {
    id: diagnostic.id,
    bayWidth: diagnostic.bayWidth,
    bayCount: diagnostic.bayCount,
    irregular: false,
    symmetryDelta: 0,
    start: diagnostic.start,
    end: diagnostic.end
  };
}

export function gen3ArchSilhouetteDiagnostic(options: {
  seed: string;
  axis: 'x' | 'z';
  lineIndex: number;
  groupIndex: number;
  worldDay: number;
  exposure: number;
  tuning: WorldTuning;
}): { bayCount: number; pierCount: number; terminationCount: number; routeBayCount: number; minimumRouteWidth: number; lowerBandHeight: number; headerHeight: number } | undefined {
  const diagnostic = topologyArchDiagnostic(options);
  if (!diagnostic) return undefined;
  return {
    bayCount: diagnostic.bayCount,
    pierCount: diagnostic.pierCount,
    terminationCount: diagnostic.terminationCount,
    routeBayCount: diagnostic.routeBayCount,
    minimumRouteWidth: diagnostic.minimumRouteWidth,
    lowerBandHeight: ARCH_LOWER_HEIGHT,
    headerHeight: ARCH_HEADER_HEIGHT
  };
}
