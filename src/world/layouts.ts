/**
 * FROZEN GENERATION 2 COMPATIBILITY ONLY.
 *
 * District-era room archetypes/components are retained for old saves. New
 * journeys must use gen3.ts plus canonical Structures, Carvers and Conditions.
 */
import { intInRange, stableId, unitFloat, weightedChoice } from './hash.js';
import { makeNote } from './notes.js';
import {
  CELL_SIZE,
  DOOR_WIDTH,
  WALL_HEIGHT,
  WALL_THICKNESS,
  type Direction,
  type FloorPatchSpec,
  type NoteSpec,
  type PropSpec,
  type RoomArchetype,
  type RoomComponentId,
  type SpatialProfile,
  type WallSpec,
  type ZoneId
} from './types.js';

export function wall(id: string, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, orientation: 'x' | 'z', drawable = true, materialVariant = 0): WallSpec {
  return { id, cx, cy, cz, sx, sy, sz, orientation, drawable, materialVariant };
}

function prop(id: string, kind: PropSpec['kind'], x: number, y: number, z: number, sx: number, sy: number, sz: number, rotationY = 0, solid = false, materialVariant = 0): PropSpec {
  return { id, kind, position: { x, y, z }, scale: { x: sx, y: sy, z: sz }, rotationY, solid, materialVariant };
}

function patch(id: string, kind: FloorPatchSpec['kind'], x: number, z: number, sx: number, sz: number): FloorPatchSpec {
  return { id, kind, position: { x, y: 0.004, z }, scale: { x: sx, y: 0.008, z: sz } };
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

export interface LayoutResult {
  walls: WallSpec[];
  props: PropSpec[];
  patches: FloorPatchSpec[];
  notes: NoteSpec[];
  label: string;
  spatialProfile: SpatialProfile;
  componentIds: RoomComponentId[];
  compositionSignature: string;
}

function addPartitionWithGap(result: WallSpec[], key: string, horizontal: boolean, offset: number, gapCenter: number, materialVariant: number): void {
  const total = CELL_SIZE - 2;
  const gap = 2.25;
  const boundedGapCenter = Math.max(-2.1, Math.min(2.1, gapCenter));
  const leftLength = Math.max(0.8, total / 2 + boundedGapCenter - gap / 2);
  const rightLength = Math.max(0.8, total - leftLength - gap);
  if (horizontal) {
    result.push(wall(`${key}:a`, -total / 2 + leftLength / 2, WALL_HEIGHT / 2, offset, leftLength, WALL_HEIGHT, WALL_THICKNESS, 'z', true, materialVariant));
    result.push(wall(`${key}:b`, total / 2 - rightLength / 2, WALL_HEIGHT / 2, offset, rightLength, WALL_HEIGHT, WALL_THICKNESS, 'z', true, materialVariant + 1));
  } else {
    result.push(wall(`${key}:a`, offset, WALL_HEIGHT / 2, -total / 2 + leftLength / 2, WALL_THICKNESS, WALL_HEIGHT, leftLength, 'x', true, materialVariant));
    result.push(wall(`${key}:b`, offset, WALL_HEIGHT / 2, total / 2 - rightLength / 2, WALL_THICKNESS, WALL_HEIGHT, rightLength, 'x', true, materialVariant + 1));
  }
}

const PRIMARY_COMPONENTS: Record<Exclude<ZoneId, 'manila' | 'holes' | 'exit-threshold'>, ReadonlyArray<{ value: RoomComponentId; weight: number }>> = {
  baseline: [
    { value: 'open-void', weight: 15 },
    { value: 'offset-partition', weight: 24 },
    { value: 'cross-partition', weight: 15 },
    { value: 'thin-corridor', weight: 13 },
    { value: 'alcove-pair', weight: 13 },
    { value: 'pillar-scatter', weight: 8 },
    { value: 'arch-run', weight: 3 }
  ],
  arch: [
    { value: 'arch-run', weight: 44 },
    { value: 'open-void', weight: 13 },
    { value: 'offset-partition', weight: 12 },
    { value: 'alcove-pair', weight: 13 },
    { value: 'pillar-scatter', weight: 8 },
    { value: 'thin-corridor', weight: 5 }
  ],
  pillar: [
    { value: 'pillar-lattice', weight: 44 },
    { value: 'pillar-scatter', weight: 20 },
    { value: 'open-void', weight: 12 },
    { value: 'thin-corridor', weight: 9 },
    { value: 'offset-partition', weight: 8 },
    { value: 'arch-run', weight: 3 }
  ],
  blackout: [
    { value: 'thin-corridor', weight: 30 },
    { value: 'offset-partition', weight: 24 },
    { value: 'cross-partition', weight: 12 },
    { value: 'open-void', weight: 10 },
    { value: 'pillar-scatter', weight: 8 },
    { value: 'alcove-pair', weight: 7 }
  ]
};

const ACCENT_COMPONENTS: Record<Exclude<ZoneId, 'manila' | 'holes' | 'exit-threshold'>, ReadonlyArray<{ value: RoomComponentId; weight: number }>> = {
  baseline: [
    { value: 'divider-run', weight: 24 },
    { value: 'service-bank', weight: 15 },
    { value: 'bench-island', weight: 18 },
    { value: 'storage-corner', weight: 18 },
    { value: 'alcove-pair', weight: 9 },
    { value: 'pillar-scatter', weight: 7 }
  ],
  arch: [
    { value: 'divider-run', weight: 15 },
    { value: 'bench-island', weight: 22 },
    { value: 'alcove-pair', weight: 22 },
    { value: 'pillar-scatter', weight: 14 },
    { value: 'service-bank', weight: 8 }
  ],
  pillar: [
    { value: 'divider-run', weight: 10 },
    { value: 'bench-island', weight: 10 },
    { value: 'service-bank', weight: 12 },
    { value: 'pillar-scatter', weight: 30 },
    { value: 'storage-corner', weight: 8 }
  ],
  blackout: [
    { value: 'service-bank', weight: 35 },
    { value: 'storage-corner', weight: 20 },
    { value: 'divider-run', weight: 16 },
    { value: 'pillar-scatter', weight: 9 },
    { value: 'bench-island', weight: 5 }
  ]
};

function anchorComponent(archetype: RoomArchetype): RoomComponentId {
  if (archetype === 'open-office') return 'open-void';
  if (archetype === 'split-suite') return 'offset-partition';
  if (archetype === 'narrow-hall' || archetype === 'flooded-corridor') return 'thin-corridor';
  if (archetype === 'alcove-ring') return 'alcove-pair';
  if (archetype === 'service-corner' || archetype === 'maintenance-bay') return 'offset-partition';
  if (archetype === 'wide-lobby') return 'open-void';
  if (archetype.startsWith('arch-')) return 'arch-run';
  if (archetype === 'pillar-grid') return 'pillar-lattice';
  if (archetype === 'pillar-aisle') return 'pillar-scatter';
  return 'open-void';
}

function chooseSpatialProfile(key: string, zoneId: ZoneId): SpatialProfile {
  if (zoneId === 'manila' || zoneId === 'holes' || zoneId === 'exit-threshold') return 'standard';
  const roll = unitFloat(`${key}:spatial-profile`);
  if (zoneId === 'pillar' && roll < 0.18) return 'pillar-expanse';
  if (zoneId === 'blackout' && roll < 0.16) return 'thin-channel';
  if (roll < 0.04) return 'sparse-vista';
  if (roll < 0.10) return 'thin-channel';
  if (zoneId === 'pillar' && roll < 0.28) return 'pillar-expanse';
  return 'standard';
}

function chooseComponents(key: string, zoneId: ZoneId, archetype: RoomArchetype, profile: SpatialProfile, roomVariation: number): RoomComponentId[] {
  if (zoneId === 'holes') return ['hole-field', 'hole-rail'];
  if (zoneId === 'manila') return ['open-void'];
  if (zoneId === 'exit-threshold') return ['offset-partition'];
  if (profile === 'sparse-vista') return ['open-void'];
  if (profile === 'thin-channel') return ['thin-corridor', unitFloat(`${key}:thin-accent`) < 0.5 ? 'service-bank' : 'divider-run'];
  if (profile === 'pillar-expanse') return ['pillar-lattice', unitFloat(`${key}:pillar-accent`) < 0.5 ? 'service-bank' : 'bench-island'];

  const ordinaryZone = zoneId as Exclude<ZoneId, 'manila' | 'holes' | 'exit-threshold'>;
  const primaryWeights = [{ value: anchorComponent(archetype), weight: 30 }, ...PRIMARY_COMPONENTS[ordinaryZone]];
  const components: RoomComponentId[] = [weightedChoice(`${key}:primary`, primaryWeights).value];
  const accentCount = Math.max(0, Math.min(2, Math.round(roomVariation) + intInRange(`${key}:accent-count`, 0, 2) - 1));
  for (let index = 0; index < accentCount; index += 1) {
    const accent = weightedChoice(`${key}:accent:${index}`, ACCENT_COMPONENTS[ordinaryZone]).value;
    if (!components.includes(accent)) components.push(accent);
  }
  return components;
}

function addArchRun(props: PropSpec[], key: string, index: number, variant: number): void {
  const alongX = unitFloat(`${key}:arch-axis:${index}`) < 0.5;
  const offset = (unitFloat(`${key}:arch-offset:${index}`) - 0.5) * 4.2;
  const beamHeight = 0.46;
  const ceilingClearance = 0.28;
  const postHeight = WALL_HEIGHT - ceilingClearance - beamHeight;
  const span = 4.4 + unitFloat(`${key}:arch-span:${index}`) * 0.7;
  const half = span / 2;
  if (alongX) {
    props.push(prop(stableId('arch-post', key, index, 'a'), 'column', -half, postHeight / 2, offset, 0.56, postHeight, 0.56, 0, true, variant));
    props.push(prop(stableId('arch-post', key, index, 'b'), 'column', half, postHeight / 2, offset, 0.56, postHeight, 0.56, 0, true, variant + 1));
    props.push(prop(stableId('arch-beam', key, index), 'wall-panel', 0, postHeight + beamHeight / 2, offset, span + 0.55, beamHeight, 0.56, 0, false, variant));
  } else {
    props.push(prop(stableId('arch-post', key, index, 'a'), 'column', offset, postHeight / 2, -half, 0.56, postHeight, 0.56, 0, true, variant));
    props.push(prop(stableId('arch-post', key, index, 'b'), 'column', offset, postHeight / 2, half, 0.56, postHeight, 0.56, 0, true, variant + 1));
    props.push(prop(stableId('arch-beam', key, index), 'wall-panel', offset, postHeight + beamHeight / 2, 0, 0.56, beamHeight, span + 0.55, 0, false, variant));
  }
}

function applyComponent(component: RoomComponentId, index: number, key: string, variant: number, profile: SpatialProfile, walls: WallSpec[], props: PropSpec[]): void {
  const mv = (variant + index) % 5;
  const sign = unitFloat(`${key}:${component}:${index}:sign`) < 0.5 ? -1 : 1;
  const horizontal = unitFloat(`${key}:${component}:${index}:axis`) < 0.5;
  switch (component) {
    case 'open-void': return;
    case 'offset-partition':
      addPartitionWithGap(walls, stableId('component-wall', key, component, index), horizontal, sign * (1.25 + unitFloat(`${key}:partition-offset:${index}`) * 2.15), (unitFloat(`${key}:partition-gap:${index}`) - 0.5) * 4.0, mv);
      return;
    case 'cross-partition':
      addPartitionWithGap(walls, stableId('component-wall', key, component, index, 'a'), true, -1.6 + unitFloat(`${key}:cross-a:${index}`) * 3.2, (unitFloat(`${key}:cross-gap-a:${index}`) - 0.5) * 3.6, mv);
      addPartitionWithGap(walls, stableId('component-wall', key, component, index, 'b'), false, -1.6 + unitFloat(`${key}:cross-b:${index}`) * 3.2, (unitFloat(`${key}:cross-gap-b:${index}`) - 0.5) * 3.6, mv + 1);
      return;
    case 'thin-corridor': {
      const halfWidth = profile === 'thin-channel' ? 1.3 + unitFloat(`${key}:corridor-width:${index}`) * 0.55 : 1.8 + unitFloat(`${key}:corridor-width:${index}`) * 0.75;
      const length = 8.6 + unitFloat(`${key}:corridor-length:${index}`) * 2.2;
      if (horizontal) {
        walls.push(wall(stableId('corridor', key, index, 'a'), 0, WALL_HEIGHT / 2, -halfWidth, length, WALL_HEIGHT, WALL_THICKNESS, 'z', true, mv));
        walls.push(wall(stableId('corridor', key, index, 'b'), 0, WALL_HEIGHT / 2, halfWidth, length, WALL_HEIGHT, WALL_THICKNESS, 'z', true, mv + 1));
      } else {
        walls.push(wall(stableId('corridor', key, index, 'a'), -halfWidth, WALL_HEIGHT / 2, 0, WALL_THICKNESS, WALL_HEIGHT, length, 'x', true, mv));
        walls.push(wall(stableId('corridor', key, index, 'b'), halfWidth, WALL_HEIGHT / 2, 0, WALL_THICKNESS, WALL_HEIGHT, length, 'x', true, mv + 1));
      }
      return;
    }
    case 'alcove-pair': {
      const offset = 4.9;
      const lateral = 2.1 + unitFloat(`${key}:alcove-lateral:${index}`) * 1.1;
      if (horizontal) {
        props.push(prop(stableId('alcove', key, index, 'a'), 'wall-panel', -lateral, 1.25, sign * offset, 2.1, 2.5, 0.16, 0, true, mv));
        props.push(prop(stableId('alcove', key, index, 'b'), 'wall-panel', lateral, 1.25, sign * offset, 2.1, 2.5, 0.16, 0, true, mv + 1));
      } else {
        props.push(prop(stableId('alcove', key, index, 'a'), 'wall-panel', sign * offset, 1.25, -lateral, 2.1, 2.5, 0.16, 90, true, mv));
        props.push(prop(stableId('alcove', key, index, 'b'), 'wall-panel', sign * offset, 1.25, lateral, 2.1, 2.5, 0.16, 90, true, mv + 1));
      }
      return;
    }
    case 'pillar-scatter': {
      const count = 2 + intInRange(`${key}:pillar-count:${index}`, 0, 4);
      for (let pillar = 0; pillar < count; pillar += 1) {
        const px = -4.3 + unitFloat(`${key}:pillar-x:${index}:${pillar}`) * 8.6;
        const pz = -4.3 + unitFloat(`${key}:pillar-z:${index}:${pillar}`) * 8.6;
        if (Math.hypot(px, pz) < 1.25) continue;
        props.push(prop(stableId('pillar', key, index, pillar), 'column', px, WALL_HEIGHT / 2, pz, 0.68, WALL_HEIGHT, 0.68, 0, true, mv + pillar));
      }
      return;
    }
    case 'pillar-lattice': {
      const positions = profile === 'pillar-expanse' ? [-4.35, -1.45, 1.45, 4.35] : [-3.8, 0, 3.8];
      let pillar = 0;
      for (const px of positions) for (const pz of positions) {
        if (Math.hypot(px, pz) < 1.15 || unitFloat(`${key}:pillar-skip:${index}:${pillar}`) < (profile === 'pillar-expanse' ? 0.08 : 0.22)) { pillar += 1; continue; }
        props.push(prop(stableId('pillar', key, index, pillar), 'column', px, WALL_HEIGHT / 2, pz, 0.72, WALL_HEIGHT, 0.72, 0, true, mv + pillar));
        pillar += 1;
      }
      return;
    }
    case 'arch-run': addArchRun(props, key, index, mv); return;
    case 'service-bank': {
      const count = 3 + intInRange(`${key}:pipes:${index}`, 0, 3);
      for (let pipeIndex = 0; pipeIndex < count; pipeIndex += 1) {
        const spacing = pipeIndex * 0.28;
        props.push(prop(stableId('pipe', key, index, pipeIndex), 'pipe', horizontal ? -5.35 + spacing : sign * 4.65, 1.5, horizontal ? sign * 4.65 : -5.35 + spacing, 0.1, 2.85, 0.1, 0, false, pipeIndex));
      }
      return;
    }
    case 'divider-run': {
      const count = 1 + intInRange(`${key}:divider-count:${index}`, 0, 3);
      for (let divider = 0; divider < count; divider += 1) {
        const lateral = -2.6 + divider * 2.6;
        props.push(prop(stableId('divider', key, index, divider), 'divider', horizontal ? lateral : sign * 3.4, 0.75, horizontal ? sign * 3.4 : lateral, 2.0, 1.5, 0.12, horizontal ? 0 : 90, true, mv + divider));
      }
      return;
    }
    case 'bench-island':
      props.push(prop(stableId('bench', key, index), 'bench', sign * (1.8 + unitFloat(`${key}:bench-x:${index}`) * 2), 0.35, (unitFloat(`${key}:bench-z:${index}`) - 0.5) * 5, 2.2, 0.7, 0.68, variant * 17, true, mv));
      return;
    case 'storage-corner':
      props.push(prop(stableId('cabinet', key, index), 'cabinet', sign * 4.7, 0.9, horizontal ? -4.45 : 4.45, 0.95, 1.8, 0.82, horizontal ? 0 : 90, true, mv));
      return;
    case 'hole-field':
    case 'hole-rail': return;
  }
}

function specialManila(seed: string, x: number, z: number, shiftEpoch: number): LayoutResult {
  const walls: WallSpec[] = []; const props: PropSpec[] = []; const patches: FloorPatchSpec[] = []; const notes: NoteSpec[] = [];
  const key = `${seed}:${x}:${z}:manila-room:${shiftEpoch}`; const half = 3.15; const gap = 1.5;
  walls.push(wall(stableId('manila', key, 'south'), 0, WALL_HEIGHT / 2, half, half * 2, WALL_HEIGHT, WALL_THICKNESS, 'z', true, 1));
  walls.push(wall(stableId('manila', key, 'west'), -half, WALL_HEIGHT / 2, 0, WALL_THICKNESS, WALL_HEIGHT, half * 2, 'x', true, 1));
  walls.push(wall(stableId('manila', key, 'east'), half, WALL_HEIGHT / 2, 0, WALL_THICKNESS, WALL_HEIGHT, half * 2, 'x', true, 1));
  walls.push(wall(stableId('manila', key, 'north-a'), -(half + gap) / 2, WALL_HEIGHT / 2, -half, half - gap / 2, WALL_HEIGHT, WALL_THICKNESS, 'z', true, 1));
  walls.push(wall(stableId('manila', key, 'north-b'), (half + gap) / 2, WALL_HEIGHT / 2, -half, half - gap / 2, WALL_HEIGHT, WALL_THICKNESS, 'z', true, 1));
  props.push(prop(stableId('manila-table', key), 'table', 0, 0.42, 0, 1.8, 0.84, 1.0, 0, true, 0));
  props.push(prop(stableId('manila-book', key), 'book', 0, 0.89, 0, 0.5, 0.08, 0.72, -8, false, 0));
  patches.push(patch(stableId('manila-dry', key), 'dry', 0, 0, 6.1, 6.1));
  notes.push(makeNote(stableId('note', key, 'ledger'), 'manila', 0, 0, 'manila-book'));
  return { walls, props, patches, notes, label: 'The Manila Room', spatialProfile: 'standard', componentIds: ['open-void'], compositionSignature: 'manila-room' };
}

function specialHoles(seed: string, x: number, z: number, archetype: RoomArchetype, shiftEpoch: number, variant: number): LayoutResult {
  const walls: WallSpec[] = []; const props: PropSpec[] = []; const patches: FloorPatchSpec[] = []; const notes: NoteSpec[] = [];
  const key = `${seed}:${x}:${z}:${archetype}:${shiftEpoch}`;
  const count = archetype === 'broken-floor' ? 5 : 4;
  for (let index = 0; index < count; index += 1) {
    const px = -4.2 + unitFloat(`${key}:hole-x:${index}`) * 8.4;
    const pz = -4.2 + unitFloat(`${key}:hole-z:${index}`) * 8.4;
    const size = archetype === 'broken-floor' ? 1.8 + unitFloat(`${key}:hole-size:${index}`) * 0.7 : 1.25 + unitFloat(`${key}:hole-size:${index}`) * 0.45;
    patches.push(patch(stableId('hole', key, index), 'hole', px, pz, size, size));
  }
  if (archetype === 'hole-gallery') props.push(prop(stableId('rail', key, 0), 'wall-panel', 0, 0.55, -4.5, 8.2, 1.1, 0.1, 0, true, variant % 5));
  return { walls, props, patches, notes, label: archetype === 'broken-floor' ? 'Broken floor field' : 'Hole gallery', spatialProfile: 'standard', componentIds: archetype === 'hole-gallery' ? ['hole-field', 'hole-rail'] : ['hole-field'], compositionSignature: `${archetype}:holes:v${variant}` };
}

function specialThreshold(seed: string, x: number, z: number, shiftEpoch: number, variant: number): LayoutResult {
  const walls: WallSpec[] = []; const props: PropSpec[] = []; const patches: FloorPatchSpec[] = []; const notes: NoteSpec[] = [];
  const key = `${seed}:${x}:${z}:transition-foyer:${shiftEpoch}`;
  addPartitionWithGap(walls, stableId('foyer', key), true, 2.2, 0, variant % 5);
  // Intentional weathered plaque rendered by the existing non-emissive wood-panel path, replacing the green sign fallback cube.
  props.push(prop(stableId('threshold-plaque', key), 'wall-panel', 0, 1.75, -5.5, 2.8, 0.7, 0.08, 0, false, variant % 5));
  return { walls, props, patches, notes, label: 'Threshold foyer', spatialProfile: 'standard', componentIds: ['offset-partition'], compositionSignature: `threshold:v${variant}` };
}

export function layoutFor(seed: string, x: number, z: number, archetype: RoomArchetype, zoneId: ZoneId, shiftEpoch: number, variant: number, roomVariation = 1): LayoutResult {
  if (archetype === 'manila-room') return specialManila(seed, x, z, shiftEpoch);
  if (zoneId === 'holes') return specialHoles(seed, x, z, archetype, shiftEpoch, variant);
  if (archetype === 'transition-foyer') return specialThreshold(seed, x, z, shiftEpoch, variant);

  const walls: WallSpec[] = []; const props: PropSpec[] = []; const patches: FloorPatchSpec[] = []; const notes: NoteSpec[] = [];
  const key = `${seed}:${x}:${z}:${zoneId}:${archetype}:${shiftEpoch}`;
  const spatialProfile = chooseSpatialProfile(key, zoneId);
  const componentIds = chooseComponents(key, zoneId, archetype, spatialProfile, roomVariation);
  componentIds.forEach((component, index) => applyComponent(component, index, key, variant, spatialProfile, walls, props));
  const profileLabel: Record<SpatialProfile, string> = { standard: 'composite room', 'sparse-vista': 'sparse fluorescent vista', 'thin-channel': 'compressed channel', 'pillar-expanse': 'extended pillar lattice' };
  return { walls, props, patches, notes, label: `${profileLabel[spatialProfile]} · ${componentIds.join(' / ')}`, spatialProfile, componentIds, compositionSignature: `${zoneId}:${spatialProfile}:${componentIds.join('+')}:v${variant}` };
}
