import { intInRange, stableId, unitFloat } from './hash.js';
import { makeNote } from './notes.js';
import {
  WALL_HEIGHT,
  WALL_THICKNESS,
  type FloorPatchSpec,
  type NoteSpec,
  type PropSpec,
  type WallSpec
} from './types.js';

export interface Gen3StructureLayout {
  walls: WallSpec[];
  props: PropSpec[];
  patches: FloorPatchSpec[];
  notes: NoteSpec[];
  label: string;
  compositionSignature: string;
}

export const MANILA_MIN_MANHATTAN_DISTANCE = 42;
export const MANILA_MAX_MANHATTAN_DISTANCE = 72;

/** Stable Manila locator shared by Generation 3, diagnostics, and frozen saves. */
export function manilaRoomCell(seed: string): { cellX: number; cellZ: number } {
  const distance = intInRange(`${seed}:manila:distance`, MANILA_MIN_MANHATTAN_DISTANCE, MANILA_MAX_MANHATTAN_DISTANCE + 1);
  const xMagnitude = intInRange(`${seed}:manila:x-magnitude`, 7, distance - 6);
  const zMagnitude = distance - xMagnitude;
  const xSign = unitFloat(`${seed}:manila:x-sign`) < 0.5 ? -1 : 1;
  const zSign = unitFloat(`${seed}:manila:z-sign`) < 0.5 ? -1 : 1;
  return { cellX: xSign * xMagnitude, cellZ: zSign * zMagnitude };
}

export function isManilaRoomAvailable(worldDay: number, exposure: number, bypass: boolean): boolean {
  return bypass || (worldDay >= 1 && exposure >= 0.25);
}

function wall(id: string, cx: number, cz: number, sx: number, sz: number, orientation: 'x' | 'z'): WallSpec {
  return {
    id,
    cx,
    cy: WALL_HEIGHT / 2,
    cz,
    sx,
    sy: WALL_HEIGHT,
    sz,
    orientation,
    drawable: true,
    materialId: 'level-0-wallpaper'
  };
}

/**
 * Generation 3 Manila Room structure.
 *
 * This is deliberately a single bounded Structure, never a Region override. It
 * owns no legacy room components and therefore cannot expand to fill World Lab.
 */
export function generateManilaRoom(seed: string, cellX: number, cellZ: number, shiftEpoch: number): Gen3StructureLayout {
  const key = `${seed}:gen3-v1:manila-room:${cellX}:${cellZ}:${shiftEpoch}`;
  const half = 3.15;
  const doorway = 1.5;
  const side = half - doorway / 2;
  const walls: WallSpec[] = [
    wall(stableId('manila-wall', key, 'south'), 0, half, half * 2, WALL_THICKNESS, 'z'),
    wall(stableId('manila-wall', key, 'west'), -half, 0, WALL_THICKNESS, half * 2, 'x'),
    wall(stableId('manila-wall', key, 'east'), half, 0, WALL_THICKNESS, half * 2, 'x'),
    wall(stableId('manila-wall', key, 'north-west'), -(doorway / 2 + side / 2), -half, side, WALL_THICKNESS, 'z'),
    wall(stableId('manila-wall', key, 'north-east'), doorway / 2 + side / 2, -half, side, WALL_THICKNESS, 'z')
  ];
  const props: PropSpec[] = [
    {
      id: stableId('manila-table', key),
      kind: 'table',
      position: { x: 0, y: 0.42, z: 0 },
      scale: { x: 1.8, y: 0.84, z: 1 },
      rotationY: 0,
      solid: true
    },
    {
      id: stableId('manila-book', key),
      kind: 'book',
      position: { x: 0, y: 0.89, z: 0 },
      scale: { x: 0.5, y: 0.08, z: 0.72 },
      rotationY: -8,
      solid: false
    }
  ];
  const patches: FloorPatchSpec[] = [{
    id: stableId('manila-dry-carpet', key),
    position: { x: 0, y: 0.004, z: 0 },
    scale: { x: 6.1, y: 0.008, z: 6.1 },
    kind: 'dry'
  }];
  const notes = [makeNote(stableId('note', key, 'ledger'), 'manila', 0, 0, 'manila-book')];
  return {
    walls,
    props,
    patches,
    notes,
    label: 'The Manila Room',
    compositionSignature: 'gen3-v1:structure:manila-room'
  };
}
