import { unitFloat } from './hash.js';
import type { PropSpec, WallSpec, WorldTuning } from './types.js';
import { archDividerForGroup, addArchDivider, archRouteOpenings } from './gen3ArchitectureArch.js';
import { addPillars, addSubstrate, collectReservedPassages } from './gen3ArchitectureBuild.js';
import {
  ARCH_HEADER_HEIGHT, ARCH_LOWER_HEIGHT, ARCH_IRREGULAR_CHANCE,
  PILLAR_MAX_WIDTH, PILLAR_MIN_WIDTH, PILLAR_SPACING, PILLAR_WIDTH_SCALE,
  type ArchDividerSpec, type Gen3ArchitectureResult, type JunctionArm, type JunctionKind, type ReservedPassage,
  junctionMorphology, linePosition, regionInfluenceFromLocal, sampleArchitectureFields, sampleGen3RegionInfluence,
  segmentKept, segmentMidpoint
} from './gen3ArchitectureCore.js';

export {
  ARCH_IRREGULAR_CHANCE, PILLAR_MAX_WIDTH, PILLAR_MIN_WIDTH, PILLAR_SPACING,
  PILLAR_WIDTH_SCALE, sampleGen3RegionInfluence
} from './gen3ArchitectureCore.js';
export type { Gen3ArchitectureResult, Gen3RegionInfluence, JunctionKind } from './gen3ArchitectureCore.js';

function classifyArms(arms: readonly boolean[]): JunctionKind {
  const count = arms.filter(Boolean).length;
  if (count === 4) return 'cross';
  if (count === 3) return 't';
  if (count === 2) return (arms[0] && arms[1]) || (arms[2] && arms[3]) ? 'straight' : 'corner';
  if (count === 1) return 'termination';
  return 'open';
}

export function gen3JunctionDiagnostic(options: {
  seed: string;
  junctionX: number;
  junctionZ: number;
  worldDay: number;
  exposure: number;
  tuning: WorldTuning;
}): { selectedKind: Exclude<JunctionKind, 'open'>; actualKind: JunctionKind; arms: Record<JunctionArm, boolean> } {
  const { seed, junctionX, junctionZ, worldDay, exposure, tuning } = options;
  const morphology = junctionMorphology(seed, junctionX, junctionZ);
  const candidates: Array<[JunctionArm, 'x' | 'z', number, number]> = [
    ['west', 'z', junctionZ, junctionX - 1],
    ['east', 'z', junctionZ, junctionX],
    ['north', 'x', junctionX, junctionZ - 1],
    ['south', 'x', junctionX, junctionZ]
  ];
  const result = { west: false, east: false, north: false, south: false };
  for (const [arm, axis, lineIndex, alongIndex] of candidates) {
    if (!morphology.arms.has(arm)) continue;
    const midpoint = segmentMidpoint(seed, axis, lineIndex, alongIndex);
    const fields = sampleArchitectureFields(seed, midpoint.x, midpoint.z);
    const influence = regionInfluenceFromLocal(seed, midpoint.x, midpoint.z, worldDay, exposure, tuning, fields);
    result[arm] = segmentKept(seed, axis, lineIndex, alongIndex, fields, influence);
  }
  return { selectedKind: morphology.kind, actualKind: classifyArms([result.west, result.east, result.north, result.south]), arms: result };
}

export function generateCoherentGen3Architecture(options: {
  seed: string;
  cellX: number;
  cellZ: number;
  worldDay: number;
  exposure: number;
  tuning: WorldTuning;
}): Gen3ArchitectureResult {
  const { seed, cellX, cellZ, worldDay, exposure, tuning } = options;
  const walls: WallSpec[] = [];
  const props: PropSpec[] = [];
  const archGroups = new Map<string, ArchDividerSpec>();
  const reservedPassages = new Map<string, ReservedPassage>();
  collectReservedPassages(seed, cellX, cellZ, reservedPassages);
  // Pillars now claim deterministic Region-owned space before Ordinary wall pieces
  // are emitted; the wall solver cuts around those claims while preserving the
  // reserved navigation graph.
  const pillar = addPillars(seed, cellX, cellZ, worldDay, exposure, tuning, reservedPassages.values(), props);
  addSubstrate(seed, cellX, cellZ, worldDay, exposure, tuning, walls, archGroups, reservedPassages, props);
  for (const spec of archGroups.values()) addArchDivider(walls, seed, cellX, cellZ, spec);
  return {
    walls,
    props,
    archDividerIds: [...archGroups.keys()].sort(),
    irregularArchDividerIds: [...archGroups.values()].filter((spec) => spec.irregular).map((spec) => spec.id).sort(),
    pillarCount: pillar.count,
    deepPillarSamples: pillar.deepSamples
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
  const spec = archDividerForGroup(options.seed, options.axis, options.lineIndex, options.groupIndex, options.worldDay, options.exposure, options.tuning);
  if (!spec) return undefined;
  const symmetryDelta = spec.irregular ? (unitFloat(`${options.seed}:gen3-v4:arch-divider:${spec.id}:asymmetry`) - 0.5) * 0.14 : 0;
  return { id: spec.id, bayWidth: spec.bayWidth, bayCount: spec.bayCount, irregular: spec.irregular, symmetryDelta, start: spec.start, end: spec.end };
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
  const spec = archDividerForGroup(options.seed, options.axis, options.lineIndex, options.groupIndex, options.worldDay, options.exposure, options.tuning);
  if (!spec) return undefined;
  const openings = archRouteOpenings(options.seed, spec);
  return {
    bayCount: spec.bayCount,
    pierCount: Math.max(0, spec.bayCount - 1),
    terminationCount: 2,
    routeBayCount: openings.length,
    minimumRouteWidth: openings.length ? Math.min(...openings.map(([start, end]) => end - start)) : 0,
    lowerBandHeight: ARCH_LOWER_HEIGHT,
    headerHeight: ARCH_HEADER_HEIGHT
  };
}