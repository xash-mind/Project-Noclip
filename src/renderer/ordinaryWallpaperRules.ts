import { CELL_SIZE, type WallSpec } from '../world/types.js';
import { unitFloat } from '../world/hash.js';

export type OrdinaryWallpaperFamily = 'A' | 'B' | 'C';

export const ORDINARY_WALLPAPER_IMAGE_TILE_METERS = 2.6;
export const ORDINARY_WALLPAPER_B_PATCH_CHANCE = 0.08;
export const ORDINARY_WALLPAPER_SPLIT_C_CHANCE = 0.015;
export const ORDINARY_CASING_RUN_CHANCE = 0.35;
export const ORDINARY_OUTLET_WALL_CHANCE = 0.065;
export const ORDINARY_CASING_CENTER_Y = 0.48;
export const ORDINARY_OUTLET_CENTER_Y = 0.62;

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
