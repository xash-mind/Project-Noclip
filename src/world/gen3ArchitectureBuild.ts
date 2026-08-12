import { stableId, unitFloat } from './hash.js';
import { CELL_SIZE, WALL_HEIGHT, WALL_THICKNESS, type PropSpec, type WallSpec, type WorldTuning } from './types.js';
import { archDividerForGroup } from './gen3ArchitectureArch.js';
import {
  ARCH_GROUP_SEGMENTS, JUNCTION_RECESS, LINE_JITTER, PILLAR_MAX_WIDTH, PILLAR_MIN_WIDTH, PILLAR_SPACING, PILLAR_WIDTH_SCALE, SUBSTRATE_GRID, type ArchDividerSpec,
  type ReservedPassage, chooseWallMaterial, clamp01, junctionEndpointAllowance, linePosition,
  passageForSegment, pushClippedWall, regionInfluenceFromLocal, sampleArchitectureFields, sampleGen3RegionInfluence,
  segmentKept, segmentMidpoint, subtractIntervals
} from './gen3ArchitectureCore.js';

export function candidateRanges(_seed: string, cellX: number, cellZ: number): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const centerX = cellX * CELL_SIZE;
  const centerZ = cellZ * CELL_SIZE;
  const padding = LINE_JITTER + WALL_THICKNESS;
  return {
    minX: Math.floor((centerX - CELL_SIZE / 2 - padding) / SUBSTRATE_GRID),
    maxX: Math.ceil((centerX + CELL_SIZE / 2 + padding) / SUBSTRATE_GRID),
    minZ: Math.floor((centerZ - CELL_SIZE / 2 - padding) / SUBSTRATE_GRID),
    maxZ: Math.ceil((centerZ + CELL_SIZE / 2 + padding) / SUBSTRATE_GRID)
  };
}

export function collectReservedPassages(
  seed: string,
  cellX: number,
  cellZ: number,
  reservedPassages: Map<string, ReservedPassage>
): void {
  const ranges = candidateRanges(seed, cellX, cellZ);
  const collect = (boundaryAxis: 'x' | 'z', lineIndex: number, alongIndex: number): void => {
    const midpoint = segmentMidpoint(seed, boundaryAxis, lineIndex, alongIndex);
    const fields = sampleArchitectureFields(seed, midpoint.x, midpoint.z);
    const passage = passageForSegment(seed, boundaryAxis, lineIndex, alongIndex, fields, midpoint.span);
    if (!passage) return;
    const passageId = `${boundaryAxis}:${lineIndex}:${alongIndex}`;
    reservedPassages.set(passageId, { axis: boundaryAxis, fixed: midpoint.span.fixed, center: passage.center, width: passage.width });
  };
  for (let lineZ = ranges.minZ; lineZ <= ranges.maxZ; lineZ += 1) for (let alongX = ranges.minX; alongX < ranges.maxX; alongX += 1) collect('z', lineZ, alongX);
  for (let lineX = ranges.minX; lineX <= ranges.maxX; lineX += 1) for (let alongZ = ranges.minZ; alongZ < ranges.maxZ; alongZ += 1) collect('x', lineX, alongZ);
}

function nearReservedPassage(worldX: number, worldZ: number, passages: Iterable<ReservedPassage>): boolean {
  for (const passage of passages) {
    if (passage.axis === 'x') {
      if (Math.abs(worldX - passage.fixed) < 1.25 && Math.abs(worldZ - passage.center) < passage.width / 2 + 1.0) return true;
    } else if (Math.abs(worldZ - passage.fixed) < 1.25 && Math.abs(worldX - passage.center) < passage.width / 2 + 1.0) return true;
  }
  return false;
}

export function addPillars(
  seed: string,
  cellX: number,
  cellZ: number,
  worldDay: number,
  exposure: number,
  tuning: WorldTuning,
  reservedPassages: Iterable<ReservedPassage>,
  output: PropSpec[]
): { count: number; deepSamples: number } {
  const half = CELL_SIZE / 2;
  const centerX = cellX * CELL_SIZE;
  const centerZ = cellZ * CELL_SIZE;
  const offsetX = unitFloat(`${seed}:gen3-pillar-offset:x`) * PILLAR_SPACING;
  const offsetZ = unitFloat(`${seed}:gen3-pillar-offset:z`) * PILLAR_SPACING;
  let count = 0;
  let deepSamples = 0;
  for (let gridX = Math.floor((centerX - half - offsetX) / PILLAR_SPACING) - 1; gridX <= Math.ceil((centerX + half - offsetX) / PILLAR_SPACING) + 1; gridX += 1) {
    for (let gridZ = Math.floor((centerZ - half - offsetZ) / PILLAR_SPACING) - 1; gridZ <= Math.ceil((centerZ + half - offsetZ) / PILLAR_SPACING) + 1; gridZ += 1) {
      const worldX = gridX * PILLAR_SPACING + offsetX;
      const worldZ = gridZ * PILLAR_SPACING + offsetZ;
      if (worldX < centerX - half + 0.75 || worldX > centerX + half - 0.75 || worldZ < centerZ - half + 0.75 || worldZ > centerZ + half - 0.75) continue;
      const influence = sampleGen3RegionInfluence(seed, worldX, worldZ, worldDay, exposure, tuning);
      if (influence.arch > 0.28) continue; // Arch stays comparatively ordered and pillar-free.
      const key = `${gridX}:${gridZ}`;
      const ordinaryRare = influence.pillar < 0.08;
      if (ordinaryRare && unitFloat(`${seed}:gen3-v4:ordinary-pillar:${key}`) > 0.018) continue;
      if (influence.pillarDepth > 0.78) deepSamples += 1;
      const rowBias = unitFloat(`${seed}:gen3-v4:pillar-row:${gridZ}`);
      const columnBias = unitFloat(`${seed}:gen3-v4:pillar-column:${gridX}`);
      const grouping = Math.max(rowBias, columnBias) * 0.12;
      const keepChance = ordinaryRare
        ? 0.8
        : clamp01(0.035 + influence.pillar * 0.25 + influence.pillarDepth * 0.55 + influence.deepPillar * 0.24 + grouping);
      if (unitFloat(`${seed}:gen3-v5:pillar:${key}:keep`) > keepChance) continue;
      const size = (1.55 + unitFloat(`${seed}:gen3-pillar:${key}:size`) * 0.75) * PILLAR_WIDTH_SCALE;
      if (nearReservedPassage(worldX, worldZ, reservedPassages)) continue;
      output.push({
        id: stableId('gen3-pillar', seed, key),
        kind: 'column',
        position: { x: worldX - centerX, y: WALL_HEIGHT / 2, z: worldZ - centerZ },
        scale: { x: size, y: WALL_HEIGHT, z: size },
        solid: true,
        materialId: 'level-0-wallpaper'
      });
      count += 1;
    }
  }
  return { count, deepSamples };
}

function pillarCutsForSpan(
  cellX: number,
  cellZ: number,
  runAxis: 'x' | 'z',
  fixed: number,
  start: number,
  end: number,
  pillars: readonly PropSpec[]
): Array<[number, number]> {
  const centerX = cellX * CELL_SIZE;
  const centerZ = cellZ * CELL_SIZE;
  const cuts: Array<[number, number]> = [];
  for (const pillar of pillars) {
    if (pillar.kind !== 'column') continue;
    const worldX = centerX + pillar.position.x;
    const worldZ = centerZ + pillar.position.z;
    const halfX = pillar.scale.x / 2 + WALL_THICKNESS / 2 + 0.12;
    const halfZ = pillar.scale.z / 2 + WALL_THICKNESS / 2 + 0.12;
    if (runAxis === 'x') {
      if (Math.abs(worldZ - fixed) > halfZ || worldX + halfX <= start || worldX - halfX >= end) continue;
      cuts.push([worldX - halfX, worldX + halfX]);
    } else {
      if (Math.abs(worldX - fixed) > halfX || worldZ + halfZ <= start || worldZ - halfZ >= end) continue;
      cuts.push([worldZ - halfZ, worldZ + halfZ]);
    }
  }
  return cuts;
}

export function addSubstrate(
  seed: string,
  cellX: number,
  cellZ: number,
  worldDay: number,
  exposure: number,
  tuning: WorldTuning,
  output: WallSpec[],
  archGroups: Map<string, ArchDividerSpec>,
  reservedPassages: Map<string, ReservedPassage>,
  pillars: readonly PropSpec[]
): void {
  const ranges = candidateRanges(seed, cellX, cellZ);
  const dividerCache = new Map<string, ArchDividerSpec | null>();
  const process = (boundaryAxis: 'x' | 'z', lineIndex: number, alongIndex: number): void => {
    const midpoint = segmentMidpoint(seed, boundaryAxis, lineIndex, alongIndex);
    const fields = sampleArchitectureFields(seed, midpoint.x, midpoint.z);
    const influence = regionInfluenceFromLocal(seed, midpoint.x, midpoint.z, worldDay, exposure, tuning, fields);
    const runAxis: 'x' | 'z' = boundaryAxis === 'z' ? 'x' : 'z';
    const groupIndex = Math.floor(alongIndex / ARCH_GROUP_SEGMENTS);
    const dividerKey = `${runAxis}:${lineIndex}:${groupIndex}`;
    if (!dividerCache.has(dividerKey)) dividerCache.set(dividerKey, archDividerForGroup(seed, runAxis, lineIndex, groupIndex, worldDay, exposure, tuning) ?? null);
    const divider = dividerCache.get(dividerKey) ?? undefined;
    if (divider) {
      archGroups.set(divider.id, divider);
      return;
    }
    if (!segmentKept(seed, boundaryAxis, lineIndex, alongIndex, fields, influence)) return;
    const allowance = junctionEndpointAllowance(seed, boundaryAxis, lineIndex, alongIndex);
    const start = midpoint.span.start + (allowance.start ? 0 : JUNCTION_RECESS);
    const end = midpoint.span.end - (allowance.end ? 0 : JUNCTION_RECESS);
    if (end - start < 0.35) return;
    const passage = reservedPassages.get(`${boundaryAxis}:${lineIndex}:${alongIndex}`);
    const cuts: Array<[number, number]> = passage
      ? [[passage.center - passage.width / 2, passage.center + passage.width / 2]]
      : [];
    cuts.push(...pillarCutsForSpan(cellX, cellZ, runAxis, midpoint.span.fixed, start, end, pillars));
    const material = chooseWallMaterial(seed, boundaryAxis, lineIndex, alongIndex, influence);
    for (const [pieceStart, pieceEnd] of subtractIntervals(start, end, cuts)) {
      pushClippedWall(output, seed, cellX, cellZ, `substrate:${boundaryAxis}:${lineIndex}:${alongIndex}`, runAxis, midpoint.span.fixed, pieceStart, pieceEnd, WALL_HEIGHT / 2, WALL_HEIGHT, material);
    }
  };

  for (let lineZ = ranges.minZ; lineZ <= ranges.maxZ; lineZ += 1) for (let alongX = ranges.minX; alongX < ranges.maxX; alongX += 1) process('z', lineZ, alongX);
  for (let lineX = ranges.minX; lineX <= ranges.maxX; lineX += 1) for (let alongZ = ranges.minZ; alongZ < ranges.maxZ; alongZ += 1) process('x', lineX, alongZ);
}