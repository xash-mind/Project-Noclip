import {
  ARCH_HEADER_HEIGHT,
  ARCH_LOWER_HEIGHT,
  preservedArchCurveWidth
} from './gen3ArchitectureCore.js';
import {
  CELL_SIZE,
  WALL_HEIGHT,
  WALL_THICKNESS,
  type CellDescriptor,
  type WallSpec
} from './types.js';

export type ArchStructuralRole = 'pier' | 'upper' | 'lower-panel';
export type ArchInterval = readonly [number, number];

export interface ArchSemanticWall {
  id: string;
  cellId: string;
  orientation: WallSpec['orientation'];
  fixed: number;
  start: number;
  end: number;
  minY: number;
  maxY: number;
}

export interface ArchSemanticLine {
  key: string;
  orientation: WallSpec['orientation'];
  fixed: number;
  headers: ArchSemanticWall[];
  lowers: ArchSemanticWall[];
  solids: ArchSemanticWall[];
}

export interface ArchFrameBay {
  id: string;
  lineKey: string;
  orientation: WallSpec['orientation'];
  fixed: number;
  start: number;
  end: number;
  curveStart: number;
  curveEnd: number;
  route: boolean;
}

export interface ArchLowerPanelWorldVolume {
  bayId: string;
  lineKey: string;
  orientation: WallSpec['orientation'];
  fixed: number;
  start: number;
  end: number;
  minY: number;
  maxY: number;
  depth: number;
}

/** Accepted A-A1 Cell handoff used by both visible and gameplay lower-panel geometry. */
export const ARCH_FRAME_CELL_SEAM_HANDOFF = 0.012;
/** Accepted visible/gameplay lower-panel depth. */
export const ARCH_LOWER_PANEL_DEPTH = Math.max(0.14, WALL_THICKNESS - 0.10);
/** Accepted visible/gameplay lower-panel height. */
export const ARCH_LOWER_PANEL_HEIGHT = Math.min(ARCH_LOWER_HEIGHT - 0.06, 0.94);
/** Accepted end inset inside one non-route A-A1 bay. */
export const ARCH_LOWER_PANEL_END_INSET = 0.02;

function wallMinY(wall: WallSpec): number {
  return wall.cy - wall.sy / 2;
}

function wallMaxY(wall: WallSpec): number {
  return wall.cy + wall.sy / 2;
}

/**
 * The one authoritative A-A1 structural-role rule.
 *
 * This deliberately consumes existing deterministic WallSpec geometry instead
 * of adding persisted descriptor metadata. Generation output, stable IDs and
 * composition signatures therefore remain unchanged while every downstream
 * consumer shares one semantic decision.
 */
export function archStructuralRole(wall: WallSpec): ArchStructuralRole | undefined {
  if (wall.materialId !== 'arch-pale-wallpaper') return undefined;
  const minY = wallMinY(wall);
  const maxY = wallMaxY(wall);
  if (Math.abs(wall.sy - ARCH_HEADER_HEIGHT) < 0.055 && Math.abs(maxY - WALL_HEIGHT) < 0.045) return 'upper';
  if (Math.abs(wall.sy - ARCH_LOWER_HEIGHT) < 0.065 && minY <= 0.045) return 'lower-panel';
  if (
    wall.sy > 1.35
    && minY > 0.04
    && minY <= ARCH_LOWER_HEIGHT + 0.065
    && maxY >= WALL_HEIGHT - ARCH_HEADER_HEIGHT - 0.045
  ) return 'pier';
  return undefined;
}

/**
 * Canonical collision intent for generated semantic wall pieces.
 * Visible non-route lower panels are realized separately from canonical A-A1
 * bay geometry; semantic upper/lower pieces themselves never own final player
 * collision. Normal floor-reaching walls and A-A1 piers/terminations retain it.
 */
export function archSemanticWallOwnsFinalCollision(wall: WallSpec): boolean {
  const role = archStructuralRole(wall);
  if (role === 'upper' || role === 'lower-panel') return false;
  if (role === 'pier') return true;
  return wallMinY(wall) <= 0.04;
}

function longInterval(wall: WallSpec): ArchInterval {
  return wall.orientation === 'z'
    ? [wall.cx - wall.sx / 2, wall.cx + wall.sx / 2]
    : [wall.cz - wall.sz / 2, wall.cz + wall.sz / 2];
}

function fixedCoordinate(wall: WallSpec): number {
  return wall.orientation === 'z' ? wall.cz : wall.cx;
}

function toWorldArchWall(descriptor: CellDescriptor, wall: WallSpec): ArchSemanticWall {
  const baseX = descriptor.address.cellX * CELL_SIZE;
  const baseZ = descriptor.address.cellZ * CELL_SIZE;
  const interval = longInterval(wall);
  return {
    id: wall.id,
    cellId: descriptor.id,
    orientation: wall.orientation,
    fixed: fixedCoordinate(wall) + (wall.orientation === 'z' ? baseZ : baseX),
    start: interval[0] + (wall.orientation === 'z' ? baseX : baseZ),
    end: interval[1] + (wall.orientation === 'z' ? baseX : baseZ),
    minY: wallMinY(wall),
    maxY: wallMaxY(wall)
  };
}

export function mergeArchIntervals(intervals: readonly ArchInterval[]): ArchInterval[] {
  const sorted = [...intervals].sort((left, right) => left[0] - right[0]);
  const merged: Array<[number, number]> = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval[0] <= last[1] + 0.03) last[1] = Math.max(last[1], interval[1]);
    else merged.push([interval[0], interval[1]]);
  }
  return merged;
}

export function archIntervalsOverlap(left: ArchInterval, right: ArchInterval): boolean {
  return left[1] > right[0] + 0.01 && left[0] < right[1] - 0.01;
}

/**
 * Canonical world-space A-A1 semantic lines across the currently resident
 * descriptor set. Presentation and collision consume this same role grouping;
 * neither rediscover roles from renderer entities or materials.
 */
export function archDividerLinesForDescriptors(descriptors: readonly CellDescriptor[]): Map<string, ArchSemanticLine> {
  const lines = new Map<string, ArchSemanticLine>();
  for (const descriptor of descriptors) {
    if (descriptor.world.generationVersion !== 'gen3-v1') continue;
    for (const wall of descriptor.walls) {
      if (archStructuralRole(wall) !== 'upper') continue;
      const world = toWorldArchWall(descriptor, wall);
      const key = `${world.orientation}:${world.fixed.toFixed(3)}`;
      const line = lines.get(key) ?? {
        key,
        orientation: world.orientation,
        fixed: world.fixed,
        headers: [],
        lowers: [],
        solids: []
      };
      line.headers.push(world);
      lines.set(key, line);
    }
  }

  for (const descriptor of descriptors) {
    if (descriptor.world.generationVersion !== 'gen3-v1') continue;
    for (const wall of descriptor.walls) {
      const role = archStructuralRole(wall);
      if (role !== 'lower-panel' && role !== 'pier') continue;
      const world = toWorldArchWall(descriptor, wall);
      const key = `${world.orientation}:${world.fixed.toFixed(3)}`;
      const line = lines.get(key);
      if (!line) continue;
      const headerIntervals = mergeArchIntervals(line.headers.map((header) => [header.start, header.end] as const));
      if (!headerIntervals.some((header) => archIntervalsOverlap(header, [world.start, world.end]))) continue;
      if (role === 'lower-panel') line.lowers.push(world);
      else line.solids.push(world);
    }
  }
  return lines;
}

export function mergedArchHeaderRuns(line: ArchSemanticLine): ArchInterval[] {
  return mergeArchIntervals(line.headers.map((header) => [header.start, header.end] as const));
}

function intervalContains(intervals: readonly ArchInterval[], point: number, margin = 0.06): boolean {
  return intervals.some(([start, end]) => point >= start + margin && point <= end - margin);
}

/** Deterministic frame bays shared beneath presentation and runtime collision. */
export function archFrameBaysForLine(line: ArchSemanticLine): ArchFrameBay[] {
  const headers = mergedArchHeaderRuns(line);
  const solids = mergeArchIntervals(line.solids.map((wall) => [wall.start, wall.end] as const));
  const lowers = mergeArchIntervals(line.lowers.map((wall) => [wall.start, wall.end] as const));
  const bays: ArchFrameBay[] = [];
  let bayIndex = 0;
  for (const header of headers) {
    const supports = solids.filter((solid) => archIntervalsOverlap(solid, header));
    for (let index = 1; index < supports.length; index += 1) {
      const left = supports[index - 1];
      const right = supports[index];
      if (!left || !right) continue;
      const start = left[1];
      const end = right[0];
      const width = end - start;
      if (width < 1.7 || width > 6.4) continue;
      const center = (start + end) / 2;
      const curveWidth = preservedArchCurveWidth(width);
      bays.push({
        id: `${line.key}:${bayIndex++}`,
        lineKey: line.key,
        orientation: line.orientation,
        fixed: line.fixed,
        start,
        end,
        curveStart: center - curveWidth / 2,
        curveEnd: center + curveWidth / 2,
        route: !intervalContains(lowers, center)
      });
    }
  }
  return bays;
}

export function archFrameBaysForDescriptors(descriptors: readonly CellDescriptor[]): ArchFrameBay[] {
  return [...archDividerLinesForDescriptors(descriptors).values()].flatMap(archFrameBaysForLine);
}

function cellAlongBounds(descriptor: CellDescriptor, orientation: WallSpec['orientation']): ArchInterval {
  const center = orientation === 'z'
    ? descriptor.address.cellX * CELL_SIZE
    : descriptor.address.cellZ * CELL_SIZE;
  return [center - CELL_SIZE / 2, center + CELL_SIZE / 2];
}

function perpendicularCellOwner(fixed: number): number {
  return Math.floor((fixed + CELL_SIZE / 2) / CELL_SIZE);
}

export function archCellOwnsLine(
  descriptor: CellDescriptor,
  orientation: WallSpec['orientation'],
  fixed: number
): boolean {
  return orientation === 'z'
    ? descriptor.address.cellZ === perpendicularCellOwner(fixed)
    : descriptor.address.cellX === perpendicularCellOwner(fixed);
}

/** Exact accepted one-sided Cell clipping used by A-A1 reconstructed boxes. */
export function clipArchIntervalForCell(
  descriptor: CellDescriptor,
  orientation: WallSpec['orientation'],
  start: number,
  end: number
): ArchInterval | undefined {
  const [cellStart, cellEnd] = cellAlongBounds(descriptor, orientation);
  const entersFromPreviousCell = start < cellStart - 0.0005;
  const continuesIntoNextCell = end > cellEnd + 0.0005;
  const clippedStart = Math.max(start, cellStart + (entersFromPreviousCell ? ARCH_FRAME_CELL_SEAM_HANDOFF : 0));
  const clippedEnd = Math.min(end, cellEnd + (continuesIntoNextCell ? ARCH_FRAME_CELL_SEAM_HANDOFF : 0));
  return clippedEnd - clippedStart > 0.015 ? [clippedStart, clippedEnd] : undefined;
}

/**
 * Pure accepted lower-panel gameplay/visible volume for one Cell and one bay.
 * No renderer entity, entity name, transform or material participates.
 */
export function archLowerPanelWorldVolumeForCell(
  descriptor: CellDescriptor,
  bay: ArchFrameBay
): ArchLowerPanelWorldVolume | undefined {
  if (bay.route || !archCellOwnsLine(descriptor, bay.orientation, bay.fixed)) return undefined;
  const clip = clipArchIntervalForCell(
    descriptor,
    bay.orientation,
    bay.start + ARCH_LOWER_PANEL_END_INSET,
    bay.end - ARCH_LOWER_PANEL_END_INSET
  );
  if (!clip) return undefined;
  return {
    bayId: bay.id,
    lineKey: bay.lineKey,
    orientation: bay.orientation,
    fixed: bay.fixed,
    start: clip[0],
    end: clip[1],
    minY: 0,
    maxY: ARCH_LOWER_PANEL_HEIGHT,
    depth: ARCH_LOWER_PANEL_DEPTH
  };
}
