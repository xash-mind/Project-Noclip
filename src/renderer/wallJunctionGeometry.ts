import type { WallSpec } from '../world/types.js';

const JUNCTION_EPSILON = 0.001;
const MIN_PRESENTATION_SPAN = 0.08;

export interface WallPresentationBox {
  cx: number;
  cy: number;
  cz: number;
  sx: number;
  sy: number;
  sz: number;
}

function sameVerticalSpan(left: WallSpec, right: WallSpec): boolean {
  return Math.abs(left.cy - right.cy) <= JUNCTION_EPSILON
    && Math.abs(left.sy - right.sy) <= JUNCTION_EPSILON;
}

function strictlyInside(value: number, start: number, end: number): boolean {
  return value > start + JUNCTION_EPSILON && value < end - JUNCTION_EPSILON;
}

function unchanged(wall: WallSpec): WallPresentationBox {
  return { cx: wall.cx, cy: wall.cy, cz: wall.cz, sx: wall.sx, sy: wall.sy, sz: wall.sz };
}

/**
 * Presentation-only T-junction cleanup.
 *
 * Topology and collision keep the canonical centerline span. If wall A terminates
 * on the middle of perpendicular wall B, only A's visible box is shortened to
 * B's near face. Crossings and L-corners remain untouched.
 */
export function wallPresentationBoxAtTJunction(wall: WallSpec, walls: readonly WallSpec[]): WallPresentationBox {
  if (!wall.drawable) return unchanged(wall);

  if (wall.orientation === 'z') {
    let start = wall.cx - wall.sx / 2;
    let end = wall.cx + wall.sx / 2;
    for (const other of walls) {
      if (other.id === wall.id || !other.drawable || other.orientation !== 'x' || !sameVerticalSpan(wall, other)) continue;
      const otherStart = other.cz - other.sz / 2;
      const otherEnd = other.cz + other.sz / 2;
      if (!strictlyInside(wall.cz, otherStart, otherEnd)) continue;
      if (Math.abs(start - other.cx) <= JUNCTION_EPSILON) start = Math.max(start, other.cx + other.sx / 2);
      if (Math.abs(end - other.cx) <= JUNCTION_EPSILON) end = Math.min(end, other.cx - other.sx / 2);
    }
    if (end - start < MIN_PRESENTATION_SPAN) return unchanged(wall);
    return { cx: (start + end) / 2, cy: wall.cy, cz: wall.cz, sx: end - start, sy: wall.sy, sz: wall.sz };
  }

  let start = wall.cz - wall.sz / 2;
  let end = wall.cz + wall.sz / 2;
  for (const other of walls) {
    if (other.id === wall.id || !other.drawable || other.orientation !== 'z' || !sameVerticalSpan(wall, other)) continue;
    const otherStart = other.cx - other.sx / 2;
    const otherEnd = other.cx + other.sx / 2;
    if (!strictlyInside(wall.cx, otherStart, otherEnd)) continue;
    if (Math.abs(start - other.cz) <= JUNCTION_EPSILON) start = Math.max(start, other.cz + other.sz / 2);
    if (Math.abs(end - other.cz) <= JUNCTION_EPSILON) end = Math.min(end, other.cz - other.sz / 2);
  }
  if (end - start < MIN_PRESENTATION_SPAN) return unchanged(wall);
  return { cx: wall.cx, cy: wall.cy, cz: (start + end) / 2, sx: wall.sx, sy: wall.sy, sz: end - start };
}
