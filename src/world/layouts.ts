import { intInRange, stableId, unitFloat, weightedChoice } from './hash.js';
import { makeNote } from './notes.js';
import { CELL_SIZE, DOOR_WIDTH, WALL_HEIGHT, WALL_THICKNESS, type Direction, type FloorPatchSpec, type NoteSpec, type PropSpec, type RoomArchetype, type WallSpec, type ZoneId } from './types.js';

export function wall(id: string, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, orientation: 'x' | 'z', drawable = true, materialVariant = 0): WallSpec {
  return { id, cx, cy, cz, sx, sy, sz, orientation, drawable, materialVariant };
}

function prop(id: string, kind: PropSpec['kind'], x: number, y: number, z: number, sx: number, sy: number, sz: number, rotationY = 0, solid = false, materialVariant = 0): PropSpec {
  return { id, kind, position: { x, y, z }, scale: { x: sx, y: sy, z: sz }, rotationY, solid, materialVariant };
}

function patch(id: string, kind: FloorPatchSpec['kind'], x: number, z: number, sx: number, sz: number): FloorPatchSpec {
  return { id, kind, position: { x, y: 0.015, z }, scale: { x: sx, y: 0.03, z: sz } };
}

export function boundaryWallParts(seed: string, x: number, z: number, direction: Direction, open: boolean, materialVariant: number): WallSpec[] {
  const half = CELL_SIZE / 2;
  const sideLength = open ? (CELL_SIZE - DOOR_WIDTH) / 2 : CELL_SIZE;
  const parts: WallSpec[] = [];
  const base = stableId('surface', seed, x, z, direction);
  if (direction === 'north' || direction === 'south') {
    const zPos = direction === 'north' ? -half : half;
    if (!open) parts.push(wall(base, 0, WALL_HEIGHT / 2, zPos, CELL_SIZE, WALL_HEIGHT, WALL_THICKNESS, 'z', true, materialVariant));
    else {
      const offset = DOOR_WIDTH / 2 + sideLength / 2;
      parts.push(wall(`${base}:a`, -offset, WALL_HEIGHT / 2, zPos, sideLength, WALL_HEIGHT, WALL_THICKNESS, 'z', true, materialVariant));
      parts.push(wall(`${base}:b`, offset, WALL_HEIGHT / 2, zPos, sideLength, WALL_HEIGHT, WALL_THICKNESS, 'z', true, materialVariant + 1));
    }
  } else {
    const xPos = direction === 'west' ? -half : half;
    if (!open) parts.push(wall(base, xPos, WALL_HEIGHT / 2, 0, WALL_THICKNESS, WALL_HEIGHT, CELL_SIZE, 'x', true, materialVariant));
    else {
      const offset = DOOR_WIDTH / 2 + sideLength / 2;
      parts.push(wall(`${base}:a`, xPos, WALL_HEIGHT / 2, -offset, WALL_THICKNESS, WALL_HEIGHT, sideLength, 'x', true, materialVariant));
      parts.push(wall(`${base}:b`, xPos, WALL_HEIGHT / 2, offset, WALL_THICKNESS, WALL_HEIGHT, sideLength, 'x', true, materialVariant + 1));
    }
  }
  return parts;
}

const ARCHETYPES_BY_ZONE: Record<ZoneId, ReadonlyArray<{ value: RoomArchetype; weight: number }>> = {
  baseline: [
    { value: 'open-office', weight: 18 },
    { value: 'split-suite', weight: 20 },
    { value: 'narrow-hall', weight: 15 },
    { value: 'alcove-ring', weight: 14 },
    { value: 'service-corner', weight: 15 },
    { value: 'wide-lobby', weight: 8 }
  ],
  arch: [{ value: 'arch-gallery', weight: 65 }, { value: 'arch-crossing', weight: 35 }],
  pillar: [{ value: 'pillar-grid', weight: 58 }, { value: 'pillar-aisle', weight: 42 }],
  blackout: [{ value: 'maintenance-bay', weight: 58 }, { value: 'flooded-corridor', weight: 42 }],
  holes: [{ value: 'hole-gallery', weight: 58 }, { value: 'broken-floor', weight: 42 }],
  manila: [{ value: 'manila-room', weight: 1 }],
  'exit-threshold': [{ value: 'transition-foyer', weight: 1 }]
};

export function chooseArchetype(seed: string, x: number, z: number, zoneId: ZoneId, shiftEpoch: number): RoomArchetype {
  return weightedChoice(`${seed}:archetype:${x}:${z}:${shiftEpoch}`, ARCHETYPES_BY_ZONE[zoneId]).value;
}

interface LayoutResult {
  walls: WallSpec[];
  props: PropSpec[];
  patches: FloorPatchSpec[];
  notes: NoteSpec[];
  label: string;
}

function addPartitionWithGap(result: WallSpec[], seed: string, x: number, z: number, key: string, horizontal: boolean, offset: number, gapCenter: number, materialVariant: number): void {
  const total = CELL_SIZE - 2;
  const gap = 2.25;
  const leftLength = Math.max(0.8, total / 2 + gapCenter - gap / 2);
  const rightLength = Math.max(0.8, total - leftLength - gap);
  const base = stableId('partition', seed, x, z, key);
  if (horizontal) {
    result.push(wall(`${base}:a`, -total / 2 + leftLength / 2, WALL_HEIGHT / 2, offset, leftLength, WALL_HEIGHT, WALL_THICKNESS, 'z', true, materialVariant));
    result.push(wall(`${base}:b`, total / 2 - rightLength / 2, WALL_HEIGHT / 2, offset, rightLength, WALL_HEIGHT, WALL_THICKNESS, 'z', true, materialVariant + 1));
  } else {
    result.push(wall(`${base}:a`, offset, WALL_HEIGHT / 2, -total / 2 + leftLength / 2, WALL_THICKNESS, WALL_HEIGHT, leftLength, 'x', true, materialVariant));
    result.push(wall(`${base}:b`, offset, WALL_HEIGHT / 2, total / 2 - rightLength / 2, WALL_THICKNESS, WALL_HEIGHT, rightLength, 'x', true, materialVariant + 1));
  }
}

export function layoutFor(seed: string, x: number, z: number, archetype: RoomArchetype, shiftEpoch: number, variant: number): LayoutResult {
  const walls: WallSpec[] = [];
  const props: PropSpec[] = [];
  const patches: FloorPatchSpec[] = [];
  const notes: NoteSpec[] = [];
  const key = `${seed}:${x}:${z}:${archetype}:${shiftEpoch}`;
  const mv = variant % 5;
  switch (archetype) {
    case 'open-office': {
      const columns = 2 + (variant % 2);
      for (let index = 0; index < columns; index += 1) {
        const px = -3.6 + index * (7.2 / Math.max(1, columns - 1));
        props.push(prop(stableId('divider', key, index), 'divider', px, 0.75, (index % 2 ? 2 : -2), 2.4, 1.5, 0.12, index % 2 ? 90 : 0, true, mv));
        props.push(prop(stableId('desk', key, index), 'table', px, 0.42, (index % 2 ? 3.2 : -3.2), 1.8, 0.84, 0.7, index % 2 ? 180 : 0, true, mv));
        if (index % 2 === 0) props.push(prop(stableId('chair', key, index), 'chair', px + 0.4, 0.45, (index % 2 ? 2.4 : -2.4), 0.55, 0.9, 0.55, 20 * index, true, mv));
      }
      patches.push(patch(stableId('patch', key, 0), 'worn', 0.4, 0.2, 6.8, 3.2));
      return { walls, props, patches, notes, label: 'Segmented office field' };
    }
    case 'split-suite':
      addPartitionWithGap(walls, seed, x, z, 'suite-a', true, -2.35, (variant % 3 - 1) * 1.5, mv);
      addPartitionWithGap(walls, seed, x, z, 'suite-b', false, 2.5, ((variant + 1) % 3 - 1) * 1.3, mv + 1);
      props.push(prop(stableId('cabinet', key), 'cabinet', -4.9, 0.9, 3.9, 0.85, 1.8, 1.2, 0, true, mv));
      props.push(prop(stableId('boxes', key), 'box', 4.6, 0.35, -4, 1.2, 0.7, 1.1, 12, true, mv + 1));
      return { walls, props, patches, notes, label: 'Offset suite junction' };
    case 'narrow-hall':
      walls.push(wall(stableId('hall', key, 'l'), -2.2, WALL_HEIGHT / 2, 0, WALL_THICKNESS, WALL_HEIGHT, 9.2, 'x', true, mv));
      walls.push(wall(stableId('hall', key, 'r'), 2.2, WALL_HEIGHT / 2, 0, WALL_THICKNESS, WALL_HEIGHT, 7.4, 'x', true, mv + 1));
      props.push(prop(stableId('sign', key), 'sign', -2.0, 1.8, -2.8, 0.08, 0.55, 1.5, 90, false, mv));
      patches.push(patch(stableId('damp', key), 'damp', 0, 2.5, 3.8, 4.2));
      return { walls, props, patches, notes, label: 'Narrow fluorescent channel' };
    case 'alcove-ring':
      for (const [index, [px, pz, rot]] of ([[-3.4, -3.4, 0], [3.4, -3.4, 90], [3.4, 3.4, 180], [-3.4, 3.4, 270]] as Array<[number, number, number]>).entries()) {
        props.push(prop(stableId('alcove-panel', key, index), 'wall-panel', px, 1.35, pz, 2.8, 2.7, 0.18, rot, true, mv + index));
      }
      props.push(prop(stableId('bench', key), 'bench', 0, 0.35, 0, 2.6, 0.7, 0.7, variant * 23, true, mv));
      return { walls, props, patches, notes, label: 'Four alcove room' };
    case 'service-corner':
      addPartitionWithGap(walls, seed, x, z, 'service', variant % 2 === 0, 1.8, -1.6, mv);
      for (let index = 0; index < 3; index += 1) props.push(prop(stableId('pipe', key, index), 'pipe', -5.4 + index * 0.35, 1.65, 3.5, 0.12, 3.0, 0.12, 0, false, index));
      props.push(prop(stableId('cabinet', key), 'cabinet', 4.5, 0.9, 4.5, 1.0, 1.8, 0.8, 45, true, mv));
      return { walls, props, patches, notes, label: 'Service access corner' };
    case 'wide-lobby':
      for (const [index, px] of [-3.8, 0, 3.8].entries()) props.push(prop(stableId('column', key, index), 'column', px, WALL_HEIGHT / 2, (index % 2 ? 1.6 : -1.6), 0.62, WALL_HEIGHT, 0.62, 0, true, mv));
      props.push(prop(stableId('table', key), 'table', 0, 0.42, 3.7, 2.1, 0.84, 0.9, variant * 17, true, mv));
      patches.push(patch(stableId('patch', key), 'dry', 0, 0, 8, 6));
      return { walls, props, patches, notes, label: 'Wide reception void' };
    case 'arch-gallery':
    case 'arch-crossing': {
      const axes: Array<'x' | 'z'> = archetype === 'arch-crossing' ? ['x', 'z'] : [variant % 2 ? 'x' : 'z'];
      for (const axis of axes) {
        for (const [index, offset] of [-3.4, 3.4].entries()) {
          if (axis === 'z') {
            props.push(prop(stableId('arch-post', key, axis, index, 'a'), 'column', -2.1, WALL_HEIGHT / 2, offset, 0.58, WALL_HEIGHT, 0.58, 0, true, mv));
            props.push(prop(stableId('arch-post', key, axis, index, 'b'), 'column', 2.1, WALL_HEIGHT / 2, offset, 0.58, WALL_HEIGHT, 0.58, 0, true, mv));
            props.push(prop(stableId('arch-beam', key, axis, index), 'wall-panel', 0, WALL_HEIGHT - 0.28, offset, 4.75, 0.55, 0.58, 0, false, mv));
          } else {
            props.push(prop(stableId('arch-post', key, axis, index, 'a'), 'column', offset, WALL_HEIGHT / 2, -2.1, 0.58, WALL_HEIGHT, 0.58, 0, true, mv));
            props.push(prop(stableId('arch-post', key, axis, index, 'b'), 'column', offset, WALL_HEIGHT / 2, 2.1, 0.58, WALL_HEIGHT, 0.58, 0, true, mv));
            props.push(prop(stableId('arch-beam', key, axis, index), 'wall-panel', offset, WALL_HEIGHT - 0.28, 0, 0.58, 0.55, 4.75, 0, false, mv));
          }
        }
      }
      patches.push(patch(stableId('arch-dry', key), 'dry', 0, 0, 7.2, 7.2));
      return { walls, props, patches, notes, label: archetype === 'arch-crossing' ? 'Crossed arch rotunda' : 'Long arch gallery' };
    }
    case 'pillar-grid':
    case 'pillar-aisle': {
      const positions = archetype === 'pillar-grid' ? [-4.2, 0, 4.2] : [-3.8, 3.8];
      let index = 0;
      for (const px of positions) for (const pz of positions) {
        if (archetype === 'pillar-aisle' && Math.abs(pz) < 1) continue;
        props.push(prop(stableId('pillar', key, index++), 'column', px, WALL_HEIGHT / 2, pz, 0.82, WALL_HEIGHT, 0.82, 0, true, mv + index));
      }
      patches.push(patch(stableId('pillar-worn', key), 'worn', 0, 0, 10, 10));
      return { walls, props, patches, notes, label: archetype === 'pillar-grid' ? 'Nine-pillar lattice' : 'Pillar aisle' };
    }
    case 'maintenance-bay':
      addPartitionWithGap(walls, seed, x, z, 'maintenance', true, 1.6, 1.4, mv);
      for (let index = 0; index < 4; index += 1) props.push(prop(stableId('pipe', key, index), 'pipe', -5.5 + index * 0.32, 1.65, -1.2, 0.1, 3.0, 0.1, 0, false, index));
      props.push(prop(stableId('cabinet', key), 'cabinet', 4.4, 0.9, 3.8, 1.0, 1.8, 1.1, 0, true, mv));
      patches.push(patch(stableId('dark', key), 'dark', 0, -2.2, 7.5, 3.4));
      return { walls, props, patches, notes, label: 'Unpowered maintenance bay' };
    case 'flooded-corridor':
      walls.push(wall(stableId('flood-l', key), -2.6, WALL_HEIGHT / 2, 0, WALL_THICKNESS, WALL_HEIGHT, 10, 'x', true, mv));
      walls.push(wall(stableId('flood-r', key), 2.6, WALL_HEIGHT / 2, 0, WALL_THICKNESS, WALL_HEIGHT, 10, 'x', true, mv));
      patches.push(patch(stableId('flood', key), 'dark', 0, 0, 4.8, 10.8));
      return { walls, props, patches, notes, label: 'Flooded service corridor' };
    case 'hole-gallery':
    case 'broken-floor':
      for (const [index, [px, pz]] of ([[-3.6, -2.8], [0.8, 2.4], [3.7, -0.7], [-1.4, 4.1]] as Array<[number, number]>).entries()) {
        patches.push(patch(stableId('hole', key, index), 'dark', px, pz, archetype === 'broken-floor' ? 2.2 : 1.45, archetype === 'broken-floor' ? 2.2 : 1.45));
      }
      if (archetype === 'hole-gallery') props.push(prop(stableId('rail', key, 0), 'wall-panel', 0, 0.55, -4.5, 8.2, 1.1, 0.1, 0, false, mv));
      return { walls, props, patches, notes, label: archetype === 'broken-floor' ? 'Broken floor field' : 'Hole gallery' };
    case 'manila-room': {
      const half = 3.15;
      const gap = 1.5;
      walls.push(wall(stableId('manila', key, 'south'), 0, WALL_HEIGHT / 2, half, half * 2, WALL_HEIGHT, WALL_THICKNESS, 'z', true, 1));
      walls.push(wall(stableId('manila', key, 'west'), -half, WALL_HEIGHT / 2, 0, WALL_THICKNESS, WALL_HEIGHT, half * 2, 'x', true, 1));
      walls.push(wall(stableId('manila', key, 'east'), half, WALL_HEIGHT / 2, 0, WALL_THICKNESS, WALL_HEIGHT, half * 2, 'x', true, 1));
      walls.push(wall(stableId('manila', key, 'north-a'), -(half + gap) / 2, WALL_HEIGHT / 2, -half, half - gap / 2, WALL_HEIGHT, WALL_THICKNESS, 'z', true, 1));
      walls.push(wall(stableId('manila', key, 'north-b'), (half + gap) / 2, WALL_HEIGHT / 2, -half, half - gap / 2, WALL_HEIGHT, WALL_THICKNESS, 'z', true, 1));
      props.push(prop(stableId('manila-table', key), 'table', 0, 0.42, 0, 1.8, 0.84, 1.0, 0, true, 0));
      props.push(prop(stableId('manila-book', key), 'book', 0, 0.89, 0, 0.5, 0.08, 0.72, -8, false, 0));
      patches.push(patch(stableId('manila-dry', key), 'dry', 0, 0, 6.1, 6.1));
      notes.push(makeNote(stableId('note', key, 'ledger'), 'manila', 0, 0, 'manila-book'));
      return { walls, props, patches, notes, label: 'The Manila Room' };
    }
    case 'transition-foyer':
      addPartitionWithGap(walls, seed, x, z, 'foyer', true, 2.2, 0, mv);
      props.push(prop(stableId('threshold-sign', key), 'sign', 0, 1.75, -5.5, 2.8, 0.7, 0.08, 0, false, mv));
      patches.push(patch(stableId('threshold-dry', key), 'dry', 0, -3.1, 5.8, 4.2));
      return { walls, props, patches, notes, label: 'Threshold foyer' };
  }
}
