import { unitFloat } from './hash.js';
import { WALL_HEIGHT, type MaterialId, type WallSpec, type WorldTuning } from './types.js';
import {
  ARCH_GROUP_SEGMENTS, ARCH_HEADER_HEIGHT, ARCH_IRREGULAR_CHANCE, ARCH_LOWER_HEIGHT,
  ARCH_MIN_INFLUENCE, ARCH_PIER_WIDTH, type ArchDividerSpec, type DividerPassage,
  clamp01, linePosition, passageForSegment, pushClippedWall, sampleArchitectureFields, segmentMidpoint,
  sampleGen3RegionInfluence, subtractIntervals
} from './gen3ArchitectureCore.js';

export function archDividerForGroup(
  seed: string,
  axis: 'x' | 'z',
  lineIndex: number,
  groupIndex: number,
  worldDay: number,
  exposure: number,
  tuning: WorldTuning
): ArchDividerSpec | undefined {
  const firstAlong = groupIndex * ARCH_GROUP_SEGMENTS;
  const start = linePosition(seed, axis === 'x' ? 'x' : 'z', firstAlong);
  const end = linePosition(seed, axis === 'x' ? 'x' : 'z', firstAlong + ARCH_GROUP_SEGMENTS);
  const fixed = linePosition(seed, axis === 'x' ? 'z' : 'x', lineIndex);
  const center = (start + end) / 2;
  const worldX = axis === 'x' ? center : fixed;
  const worldZ = axis === 'x' ? fixed : center;
  const influence = sampleGen3RegionInfluence(seed, worldX, worldZ, worldDay, exposure, tuning);
  if (influence.arch < ARCH_MIN_INFLUENCE) return undefined;
  const keepChance = clamp01((influence.arch - ARCH_MIN_INFLUENCE) * 0.72);
  const id = `divider:${axis}:${lineIndex}:${groupIndex}`;
  if (unitFloat(`${seed}:gen3-v4:arch-divider:${id}:keep`) > keepChance) return undefined;
  const length = end - start;
  // Slightly larger bays make the promoted repeated-opening silhouette readable at
  // normal gameplay distance and leave enough clear width for integrated route bays.
  const desiredBay = 4.4 + unitFloat(`${seed}:gen3-v4:arch-divider:${id}:scale`) * 1.2;
  const bayCount = Math.max(5, Math.round(length / desiredBay));
  return {
    id,
    axis,
    fixed,
    start,
    end,
    bayWidth: length / bayCount,
    bayCount,
    irregular: unitFloat(`${seed}:gen3-v4:arch-divider:${id}:irregular`) < ARCH_IRREGULAR_CHANCE,
    lineIndex,
    groupIndex
  };
}

function dividerPassages(seed: string, spec: ArchDividerSpec): DividerPassage[] {
  const passages: DividerPassage[] = [];
  const firstAlong = spec.groupIndex * ARCH_GROUP_SEGMENTS;
  for (let offset = 0; offset < ARCH_GROUP_SEGMENTS; offset += 1) {
    const alongIndex = firstAlong + offset;
    const boundaryAxis: 'x' | 'z' = spec.axis === 'x' ? 'z' : 'x';
    const midpoint = segmentMidpoint(seed, boundaryAxis, spec.lineIndex, alongIndex);
    const fields = sampleArchitectureFields(seed, midpoint.x, midpoint.z);
    const passage = passageForSegment(seed, boundaryAxis, spec.lineIndex, alongIndex, fields, midpoint.span);
    if (passage) passages.push({ ...passage, segmentStart: midpoint.span.start, segmentEnd: midpoint.span.end });
  }
  return passages;
}

function routeBayIndices(seed: string, spec: ArchDividerSpec): number[] {
  const chosen = new Set<number>();
  for (const passage of dividerPassages(seed, spec)) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let bayIndex = 0; bayIndex < spec.bayCount; bayIndex += 1) {
      const bayStart = spec.start + bayIndex * spec.bayWidth;
      const bayEnd = bayStart + spec.bayWidth;
      const bayCenter = (bayStart + bayEnd) / 2;
      // Keep the route in the same connectivity substrate segment whenever a full
      // bay center is available there; this changes the architectural rhythm, not
      // which logical boundary the route crosses.
      const insideSegment = bayCenter >= passage.segmentStart + 0.35 && bayCenter <= passage.segmentEnd - 0.35;
      const distance = Math.abs(bayCenter - passage.center) + (insideSegment ? 0 : 1000);
      if (distance < bestDistance) { bestDistance = distance; bestIndex = bayIndex; }
    }
    chosen.add(bestIndex);
  }
  return [...chosen].sort((a, b) => a - b);
}

export function archRouteOpenings(seed: string, spec: ArchDividerSpec): Array<[number, number]> {
  const termination = Math.min(0.58, spec.bayWidth * 0.13);
  return routeBayIndices(seed, spec).map((bayIndex) => {
    const bayStart = spec.start + bayIndex * spec.bayWidth;
    const bayEnd = bayStart + spec.bayWidth;
    const leftInset = bayIndex === 0 ? termination : ARCH_PIER_WIDTH / 2 + 0.05;
    const rightInset = bayIndex === spec.bayCount - 1 ? termination : ARCH_PIER_WIDTH / 2 + 0.05;
    return [bayStart + leftInset, bayEnd - rightInset];
  });
}

export function addArchDivider(
  output: WallSpec[],
  seed: string,
  cellX: number,
  cellZ: number,
  spec: ArchDividerSpec
): void {
  const material: MaterialId = 'arch-pale-wallpaper';
  const axis = spec.axis;
  const asymmetry = spec.irregular ? (unitFloat(`${seed}:gen3-v4:arch-divider:${spec.id}:asymmetry`) - 0.5) * 0.14 : 0;
  const termination = Math.min(0.58, spec.bayWidth * 0.13);
  const leftTermination = termination * (1 + asymmetry);
  const rightTermination = termination * (1 - asymmetry);
  const headerBottom = WALL_HEIGHT - ARCH_HEADER_HEIGHT;
  const pierHeight = headerBottom - ARCH_LOWER_HEIGHT;
  const pierY = ARCH_LOWER_HEIGHT + pierHeight / 2;
  const routeOpenings = archRouteOpenings(seed, spec);

  const add = (pieceId: string, start: number, end: number, y: number, height: number): void => {
    pushClippedWall(output, seed, cellX, cellZ, `${spec.id}:${pieceId}`, axis, spec.fixed, start, end, y, height, material);
  };

  // The lower band is continuous except where a deterministic connectivity route is
  // deliberately promoted to a complete bay opening. Header, piers and terminations
  // are never arbitrarily subtracted by route cuts.
  for (const [start, end] of subtractIntervals(spec.start + leftTermination, spec.end - rightTermination, routeOpenings)) {
    add(`lower:${start.toFixed(3)}`, start, end, ARCH_LOWER_HEIGHT / 2, ARCH_LOWER_HEIGHT);
  }
  add('header', spec.start + leftTermination, spec.end - rightTermination, WALL_HEIGHT - ARCH_HEADER_HEIGHT / 2, ARCH_HEADER_HEIGHT);
  add('left-termination', spec.start, spec.start + leftTermination, WALL_HEIGHT / 2, WALL_HEIGHT);
  add('right-termination', spec.end - rightTermination, spec.end, WALL_HEIGHT / 2, WALL_HEIGHT);

  for (let boundary = 1; boundary < spec.bayCount; boundary += 1) {
    const center = spec.start + boundary * spec.bayWidth;
    const width = ARCH_PIER_WIDTH * (spec.irregular ? 1 + asymmetry * (boundary % 2 === 0 ? 1 : -1) : 1);
    add(`pier:${boundary}`, center - width / 2, center + width / 2, pierY, pierHeight);
  }

  // Two shallow shoulder steps per bay keep the primitive-box implementation
  // reading as repeated arch-shaped openings rather than a row of rectangles.
  const shoulderDepth = Math.min(0.48, spec.bayWidth * 0.105);
  const shoulderHeight = 0.42;
  const shoulderY = headerBottom - shoulderHeight / 2;
  for (let bayIndex = 0; bayIndex < spec.bayCount; bayIndex += 1) {
    const bayStart = spec.start + bayIndex * spec.bayWidth;
    const bayEnd = bayStart + spec.bayWidth;
    const leftEdge = bayIndex === 0 ? spec.start + leftTermination : bayStart + ARCH_PIER_WIDTH / 2;
    const rightEdge = bayIndex === spec.bayCount - 1 ? spec.end - rightTermination : bayEnd - ARCH_PIER_WIDTH / 2;
    if (rightEdge - leftEdge <= shoulderDepth * 2 + 0.5) continue;
    add(`shoulder:${bayIndex}:left`, leftEdge, leftEdge + shoulderDepth, shoulderY, shoulderHeight);
    add(`shoulder:${bayIndex}:right`, rightEdge - shoulderDepth, rightEdge, shoulderY, shoulderHeight);
  }
}