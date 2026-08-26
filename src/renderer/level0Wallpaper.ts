import { archSemanticWallOwnsFinalCollision } from '../world/gen3ArchDividerSemantics.js';
import { CELL_SIZE, type WallSpec } from '../world/types.js';

/**
 * Original procedural recreation informed by the source-supported 1990s Borden
 * southwestern/chevron grammar. No external scan or copyrighted pixels are used.
 * The neutral paper is intentionally not intrinsically Backrooms-yellow; the
 * fluorescent renderer supplies most of the sickly yellow cast.
 */
export const LEVEL0_WALLPAPER_TILE_METERS = 0.52;
export const LEVEL0_SEPARATE_BASE_TRIM = false;
export const LEVEL0_WALLPAPER_PALETTE = {
  paper: '#d8d2bd',
  paperWarm: '#cec5aa',
  teal: '#778883',
  dustyRose: '#aa8d84',
  tan: '#aa997b',
  olive: '#92927a',
  ink: '#827b68'
} as const;

export interface WallpaperUv {
  tiling: [number, number];
  offset: [number, number];
  worldStart: number;
  worldBottom: number;
}

function wrap01(value: number): number {
  return ((value % 1) + 1) % 1;
}

/** Keep pattern phase world-addressed across streamed Cell and split-wall pieces. */
export function wallpaperUvForWall(cellX: number, cellZ: number, wall: WallSpec): WallpaperUv {
  const horizontal = wall.orientation === 'z';
  const length = horizontal ? wall.sx : wall.sz;
  const worldStart = horizontal
    ? cellX * CELL_SIZE + wall.cx - wall.sx / 2
    : cellZ * CELL_SIZE + wall.cz - wall.sz / 2;
  const worldBottom = wall.cy - wall.sy / 2;
  return {
    tiling: [Math.max(0.02, length / LEVEL0_WALLPAPER_TILE_METERS), Math.max(0.02, wall.sy / LEVEL0_WALLPAPER_TILE_METERS)],
    offset: [wrap01(worldStart / LEVEL0_WALLPAPER_TILE_METERS), wrap01(worldBottom / LEVEL0_WALLPAPER_TILE_METERS)],
    worldStart,
    worldBottom
  };
}

function strokeSteppedChevron(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  stroke: string,
  lineWidth: number
): void {
  const half = width / 2;
  const quarter = width / 4;
  const step = height / 4;
  context.strokeStyle = stroke;
  context.lineWidth = lineWidth;
  context.lineJoin = 'miter';
  context.beginPath();
  context.moveTo(centerX - half, centerY - step * 2);
  context.lineTo(centerX - quarter, centerY - step * 2);
  context.lineTo(centerX - quarter, centerY - step);
  context.lineTo(centerX, centerY - step);
  context.lineTo(centerX, centerY);
  context.lineTo(centerX + quarter, centerY);
  context.lineTo(centerX + quarter, centerY + step);
  context.lineTo(centerX + half, centerY + step);
  context.stroke();

  context.beginPath();
  context.moveTo(centerX - half, centerY + step * 2);
  context.lineTo(centerX - quarter, centerY + step * 2);
  context.lineTo(centerX - quarter, centerY + step);
  context.lineTo(centerX, centerY + step);
  context.lineTo(centerX, centerY);
  context.stroke();
}

/** Paint one seamless, low-saturation source-derived wallpaper tile. */
export function paintLevel0ChevronWallpaper(context: CanvasRenderingContext2D, size: number): void {
  const palette = LEVEL0_WALLPAPER_PALETTE;
  context.fillStyle = palette.paper;
  context.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 4) {
    const alpha = 0.018 + ((y / 4) % 5) * 0.002;
    context.fillStyle = `rgba(94,84,61,${alpha.toFixed(3)})`;
    context.fillRect(0, y, size, 1);
  }

  const lane = size / 4;
  for (let laneIndex = -1; laneIndex <= 4; laneIndex += 1) {
    const x = laneIndex * lane;
    context.fillStyle = palette.paperWarm;
    context.fillRect(x - lane * 0.065, 0, lane * 0.13, size);
    context.fillStyle = palette.teal;
    context.fillRect(x - lane * 0.038, 0, lane * 0.022, size);
    context.fillStyle = palette.dustyRose;
    context.fillRect(x + lane * 0.008, 0, lane * 0.018, size);
    context.fillStyle = palette.tan;
    context.fillRect(x + lane * 0.034, 0, lane * 0.012, size);
  }

  const motifWidth = lane * 0.62;
  const motifHeight = size / 5.4;
  for (let column = -1; column < 4; column += 1) {
    const centerX = column * lane + lane * 0.5;
    for (let row = -1; row < 7; row += 1) {
      const centerY = row * motifHeight + (column % 2 === 0 ? motifHeight * 0.16 : motifHeight * 0.66);
      strokeSteppedChevron(context, centerX, centerY, motifWidth, motifHeight * 0.76, palette.olive, Math.max(1, size / 170));
      strokeSteppedChevron(context, centerX + motifWidth * 0.08, centerY + motifHeight * 0.08, motifWidth * 0.72, motifHeight * 0.54, palette.dustyRose, Math.max(1, size / 220));
      strokeSteppedChevron(context, centerX - motifWidth * 0.06, centerY - motifHeight * 0.08, motifWidth * 0.48, motifHeight * 0.36, palette.teal, Math.max(1, size / 240));
    }
  }

  context.globalAlpha = 0.16;
  context.strokeStyle = palette.ink;
  context.lineWidth = 1;
  for (let x = 3; x < size; x += 17) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + 1.5, size);
    context.stroke();
  }
  context.globalAlpha = 1;
}

/**
 * Compatibility surface for existing Level 0 callers. The semantic decision
 * is owned exclusively by the pure Generation 3 A-A1 resolver.
 */
export function shouldGen3WallCollide(wall: WallSpec): boolean {
  return archSemanticWallOwnsFinalCollision(wall);
}
