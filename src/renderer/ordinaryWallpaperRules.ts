import { CELL_SIZE, type WallSpec } from '../world/types.js';
import { unitFloat } from '../world/hash.js';

export type OrdinaryWallpaperFamily = 'A' | 'B' | 'C';

// The committed A texture contains roughly ten motif lanes across its square.
// 1.3 m therefore presents the reference motif at roughly 13 cm lane spacing,
// close to the supplied Backrooms wall rather than treating the whole image as one motif.
export const ORDINARY_WALLPAPER_IMAGE_TILE_METERS = 1.3;
export const ORDINARY_WALLPAPER_B_PATCH_CHANCE = 0.08;
export const ORDINARY_WALLPAPER_SPLIT_C_CHANCE = 0.015;
export const ORDINARY_CASING_RUN_CHANCE = 0.35;
export const ORDINARY_OUTLET_WALL_CHANCE = 0.065;
export const ORDINARY_CASING_CENTER_Y = 0.48;
export const ORDINARY_OUTLET_CENTER_Y = 0.62;
export const ORDINARY_CASING_TERMINATION_SETBACK_FRACTION = 0.175;

export interface OrdinaryWallpaperDecision {
  primary: 'A' | 'B';
  splitWith?: 'C';
  splitFraction?: number;
  cOnPositiveSide?: boolean;
}

export interface OrdinaryOutletPlacement {
  enabled: boolean;
  u: number;
  faceSign: -1 | 1;
}

export interface OrdinaryCasingSpan {
  startU: number;
  endU: number;
  startConnected: boolean;
  endConnected: boolean;
}

function wrap01(value: number): number {
  return ((value % 1) + 1) % 1;
}

function floorReaching(wall: WallSpec): boolean {
  return wall.cy - wall.sy / 2 <= 0.04 && wall.sy >= 1.2;
}

function wallLength(wall: WallSpec): number {
  return wall.orientation === 'z' ? wall.sx : wall.sz;
}

function worldCenter(cellX: number, cellZ: number, wall: WallSpec): { x: number; z: number } {
  return {
    x: cellX * CELL_SIZE + wall.cx,
    z: cellZ * CELL_SIZE + wall.cz
  };
}

function stableWallKey(seed: string, cellX: number, cellZ: number, wall: WallSpec): string {
  const center = worldCenter(cellX, cellZ, wall);
  const fixed = wall.orientation === 'z' ? center.z : center.x;
  const along = wall.orientation === 'z' ? center.x : center.z;
  return `${seed}:${wall.orientation}:${Math.round(fixed * 4)}:${Math.round(along * 4)}:${Math.round(wallLength(wall) * 4)}`;
}

function patchKey(seed: string, cellX: number, cellZ: number, wall: WallSpec): string {
  const center = worldCenter(cellX, cellZ, wall);
  const patchMeters = CELL_SIZE * 2;
  return `${seed}:ordinary-wallpaper-patch:${Math.floor(center.x / patchMeters)}:${Math.floor(center.z / patchMeters)}`;
}

function runKey(seed: string, cellX: number, cellZ: number, wall: WallSpec): string {
  const center = worldCenter(cellX, cellZ, wall);
  const fixed = wall.orientation === 'z' ? center.z : center.x;
  const along = wall.orientation === 'z' ? center.x : center.z;
  return `${seed}:ordinary-wall-run:${wall.orientation}:${Math.round(fixed * 4)}:${Math.floor(along / CELL_SIZE)}`;
}

export function ordinaryWallpaperDecision(seed: string, cellX: number, cellZ: number, wall: WallSpec): OrdinaryWallpaperDecision {
  const primary: 'A' | 'B' = unitFloat(patchKey(seed, cellX, cellZ, wall)) < ORDINARY_WALLPAPER_B_PATCH_CHANCE ? 'B' : 'A';
  if (primary === 'B' || !floorReaching(wall) || wallLength(wall) < 2.4) return { primary };

  const key = stableWallKey(seed, cellX, cellZ, wall);
  if (unitFloat(`${key}:split-c`) >= ORDINARY_WALLPAPER_SPLIT_C_CHANCE) return { primary };
  return {
    primary,
    splitWith: 'C',
    splitFraction: 0.38 + unitFloat(`${key}:split-fraction`) * 0.24,
    cOnPositiveSide: unitFloat(`${key}:split-side`) < 0.5
  };
}

export function ordinaryCasingEnabled(seed: string, cellX: number, cellZ: number, wall: WallSpec): boolean {
  if (!floorReaching(wall) || wallLength(wall) < 1.2) return false;
  return unitFloat(`${runKey(seed, cellX, cellZ, wall)}:casing`) < ORDINARY_CASING_RUN_CHANCE;
}

function endpoint(wall: WallSpec, positive: boolean): { x: number; z: number } {
  if (wall.orientation === 'z') {
    return { x: wall.cx + (positive ? 1 : -1) * wall.sx / 2, z: wall.cz };
  }
  return { x: wall.cx, z: wall.cz + (positive ? 1 : -1) * wall.sz / 2 };
}

function verticalOverlap(left: WallSpec, right: WallSpec): boolean {
  const leftMin = left.cy - left.sy / 2;
  const leftMax = left.cy + left.sy / 2;
  const rightMin = right.cy - right.sy / 2;
  const rightMax = right.cy + right.sy / 2;
  return Math.min(leftMax, rightMax) - Math.max(leftMin, rightMin) > 0.2;
}

function wallTouchesPoint(wall: WallSpec, point: { x: number; z: number }): boolean {
  const tolerance = 0.045;
  return point.x >= wall.cx - wall.sx / 2 - tolerance
    && point.x <= wall.cx + wall.sx / 2 + tolerance
    && point.z >= wall.cz - wall.sz / 2 - tolerance
    && point.z <= wall.cz + wall.sz / 2 + tolerance;
}

function endpointConnected(walls: readonly WallSpec[], source: WallSpec, positive: boolean): boolean {
  const point = endpoint(source, positive);
  return walls.some((candidate) => candidate.id !== source.id
    && candidate.drawable
    && floorReaching(candidate)
    && verticalOverlap(source, candidate)
    && wallTouchesPoint(candidate, point));
}

/**
 * Presentation span for one casing run. A real architectural junction owns the
 * endpoint, so the run may reach it. An exposed wall end owns no adjoining
 * surface, so the casing is deliberately stopped 17.5% short instead of being
 * allowed to turn across the box end face.
 */
export function ordinaryCasingSpan(walls: readonly WallSpec[], wall: WallSpec): OrdinaryCasingSpan {
  const startConnected = endpointConnected(walls, wall, false);
  const endConnected = endpointConnected(walls, wall, true);
  const startU = startConnected ? 0 : ORDINARY_CASING_TERMINATION_SETBACK_FRACTION;
  const endU = endConnected ? 1 : 1 - ORDINARY_CASING_TERMINATION_SETBACK_FRACTION;
  return { startU, endU, startConnected, endConnected };
}

export function ordinaryOutletPlacement(seed: string, cellX: number, cellZ: number, wall: WallSpec): OrdinaryOutletPlacement {
  if (!floorReaching(wall) || wallLength(wall) < 1.8) return { enabled: false, u: 0.5, faceSign: 1 };
  const key = stableWallKey(seed, cellX, cellZ, wall);
  const enabled = unitFloat(`${key}:outlet`) < ORDINARY_OUTLET_WALL_CHANCE;
  return {
    enabled,
    u: 0.24 + unitFloat(`${key}:outlet-u`) * 0.52,
    faceSign: unitFloat(`${key}:outlet-face`) < 0.5 ? -1 : 1
  };
}

function outletSamplePoint(wall: WallSpec, u: number, faceSign: -1 | 1): { x: number; z: number } {
  const clearance = 0.42;
  const alongStart = wall.orientation === 'z' ? wall.cx - wall.sx / 2 : wall.cz - wall.sz / 2;
  const alongLength = wallLength(wall);
  const along = alongStart + alongLength * u;
  if (wall.orientation === 'z') return { x: along, z: wall.cz + faceSign * (wall.sz / 2 + clearance) };
  return { x: wall.cx + faceSign * (wall.sx / 2 + clearance), z: along };
}

function pointClearOfWalls(point: { x: number; z: number }, walls: readonly WallSpec[], source: WallSpec): boolean {
  const cellHalf = CELL_SIZE / 2;
  if (Math.abs(point.x) > cellHalf - 0.28 || Math.abs(point.z) > cellHalf - 0.28) return false;
  for (const candidate of walls) {
    if (candidate.id === source.id || !candidate.drawable || !floorReaching(candidate)) continue;
    const pad = 0.24;
    if (
      point.x >= candidate.cx - candidate.sx / 2 - pad
      && point.x <= candidate.cx + candidate.sx / 2 + pad
      && point.z >= candidate.cz - candidate.sz / 2 - pad
      && point.z <= candidate.cz + candidate.sz / 2 + pad
    ) return false;
  }
  return true;
}

/** Choose the locally traversable/presented side; never place the only outlet into a blocked wall face. */
export function ordinaryOutletFaceSign(
  walls: readonly WallSpec[],
  wall: WallSpec,
  u: number,
  preferred: -1 | 1
): -1 | 1 | undefined {
  const preferredClear = pointClearOfWalls(outletSamplePoint(wall, u, preferred), walls, wall);
  const opposite = preferred === 1 ? -1 : 1;
  const oppositeClear = pointClearOfWalls(outletSamplePoint(wall, u, opposite), walls, wall);
  if (preferredClear) return preferred;
  if (oppositeClear) return opposite;
  return undefined;
}

export function ordinaryWallpaperUv(cellX: number, cellZ: number, wall: WallSpec): { tiling: [number, number]; offset: [number, number] } {
  const horizontal = wall.orientation === 'z';
  const length = horizontal ? wall.sx : wall.sz;
  const worldStart = horizontal
    ? cellX * CELL_SIZE + wall.cx - wall.sx / 2
    : cellZ * CELL_SIZE + wall.cz - wall.sz / 2;
  const worldBottom = wall.cy - wall.sy / 2;
  return {
    tiling: [Math.max(0.02, length / ORDINARY_WALLPAPER_IMAGE_TILE_METERS), Math.max(0.02, wall.sy / ORDINARY_WALLPAPER_IMAGE_TILE_METERS)],
    offset: [wrap01(worldStart / ORDINARY_WALLPAPER_IMAGE_TILE_METERS), wrap01(worldBottom / ORDINARY_WALLPAPER_IMAGE_TILE_METERS)]
  };
}
