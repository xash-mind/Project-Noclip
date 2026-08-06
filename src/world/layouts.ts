import { floorDiv, intInRange, stableId, unitFloat, weightedChoice } from './hash.js';
import { makeNote } from './notes.js';
import {
  CELL_SIZE, DOOR_WIDTH, WALL_HEIGHT, WALL_THICKNESS,
  type Direction, type FloorPatchSpec, type NoteSpec, type PropSpec,
  type RoomArchetype, type RoomComponentId, type SpatialProfile,
  type WallSpec, type ZoneId
} from './types.js';

export function wall(id: string, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, orientation: 'x' | 'z', drawable = true, materialVariant = 0): WallSpec {
  return { id, cx, cy, cz, sx, sy, sz, orientation, drawable, materialVariant };
}

function prop(id: string, kind: PropSpec['kind'], x: number, y: number, z: number, sx: number, sy: number, sz: number, rotationY = 0, solid = false, materialVariant = 0, rotationX = 0, rotationZ = 0): PropSpec {
  return { id, kind, position: { x, y, z }, scale: { x: sx, y: sy, z: sz }, rotationY, rotationX, rotationZ, solid, materialVariant };
}

function patch(id: string, kind: FloorPatchSpec['kind'], x: number, z: number, sx: number, sz: number): FloorPatchSpec {
  return { id, kind, position: { x, y: 0.004, z }, scale: { x: sx, y: 0.008, z: sz } };
}

export function boundaryWallParts(seed: string, x: number, z: number, direction: Direction, open: boolean, materialVariant: number, openingWidth = DOOR_WIDTH): WallSpec[] {
  const half = CELL_SIZE / 2;
  const boundedOpening = Math.max(DOOR_WIDTH, Math.min(CELL_SIZE - 0.5, openingWidth));
  const sideLength = open ? (CELL_SIZE - boundedOpening) / 2 : CELL_SIZE;
  const parts: WallSpec[] = [];
  const base = stableId('surface', seed, x, z, direction);
  if (direction === 'north' || direction === 'south') {
    const zPos = direction === 'north' ? -half : half;
    if (!open) parts.push(wall(base, 0, WALL_HEIGHT / 2, zPos, CELL_SIZE, WALL_HEIGHT, WALL_THICKNESS, 'z', true, materialVariant));
    else {
      const offset = boundedOpening / 2 + sideLength / 2;
      parts.push(wall(`${base}:a`, -offset, WALL_HEIGHT / 2, zPos, sideLength, WALL_HEIGHT, WALL_THICKNESS, 'z', true, materialVariant));
      parts.push(wall(`${base}:b`, offset, WALL_HEIGHT / 2, zPos, sideLength, WALL_HEIGHT, WALL_THICKNESS, 'z', true, materialVariant + 1));
    }
  } else {
    const xPos = direction === 'west' ? -half : half;
    if (!open) parts.push(wall(base, xPos, WALL_HEIGHT / 2, 0, WALL_THICKNESS, WALL_HEIGHT, CELL_SIZE, 'x', true, materialVariant));
    else {
      const offset = boundedOpening / 2 + sideLength / 2;
      parts.push(wall(`${base}:a`, xPos, WALL_HEIGHT / 2, -offset, WALL_THICKNESS, WALL_HEIGHT, sideLength, 'x', true, materialVariant));
      parts.push(wall(`${base}:b`, xPos, WALL_HEIGHT / 2, offset, WALL_THICKNESS, WALL_HEIGHT, sideLength, 'x', true, materialVariant + 1));
    }
  }
  return parts;
}

const ARCHETYPES_BY_ZONE: Record<ZoneId, ReadonlyArray<{ value: RoomArchetype; weight: number }>> = {
  baseline: [
    { value: 'open-office', weight: 18 }, { value: 'split-suite', weight: 20 }, { value: 'narrow-hall', weight: 15 },
    { value: 'alcove-ring', weight: 14 }, { value: 'service-corner', weight: 15 }, { value: 'wide-lobby', weight: 8 }
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

function addPartitionWithGap(result: WallSpec[], base: string, horizontal: boolean, offset: number, gapCenter: number, materialVariant: number, span = CELL_SIZE - 2): void {
  const gap = 2.25;
  const leftLength = Math.max(0.8, span / 2 + gapCenter - gap / 2);
  const rightLength = Math.max(0.8, span - leftLength - gap);
  if (horizontal) {
    result.push(wall(`${base}:a`, -span / 2 + leftLength / 2, WALL_HEIGHT / 2, offset, leftLength, WALL_HEIGHT, WALL_THICKNESS, 'z', true, materialVariant));
    result.push(wall(`${base}:b`, span / 2 - rightLength / 2, WALL_HEIGHT / 2, offset, rightLength, WALL_HEIGHT, WALL_THICKNESS, 'z', true, materialVariant + 1));
  } else {
    result.push(wall(`${base}:a`, offset, WALL_HEIGHT / 2, -span / 2 + leftLength / 2, WALL_THICKNESS, WALL_HEIGHT, leftLength, 'x', true, materialVariant));
    result.push(wall(`${base}:b`, offset, WALL_HEIGHT / 2, span / 2 - rightLength / 2, WALL_THICKNESS, WALL_HEIGHT, rightLength, 'x', true, materialVariant + 1));
  }
}

const COMPONENT_WEIGHTS: Record<ZoneId, ReadonlyArray<{ value: RoomComponentId; weight: number }>> = {
  baseline: [
    { value: 'open-void', weight: 10 }, { value: 'partition-cross', weight: 13 }, { value: 'partition-offset', weight: 16 },
    { value: 'thin-corridor', weight: 8 }, { value: 'desk-cluster', weight: 16 }, { value: 'storage-corner', weight: 10 },
    { value: 'alcove-pair', weight: 8 }, { value: 'service-bank', weight: 5 }, { value: 'pillar-lattice', weight: 3 },
    { value: 'arch-run', weight: 2 }, { value: 'bench-island', weight: 7 }, { value: 'floor-wear', weight: 8 }, { value: 'floor-damp', weight: 4 }
  ],
  arch: [
    { value: 'arch-run', weight: 38 }, { value: 'open-void', weight: 12 }, { value: 'partition-offset', weight: 8 },
    { value: 'pillar-lattice', weight: 8 }, { value: 'bench-island', weight: 8 }, { value: 'alcove-pair', weight: 8 },
    { value: 'floor-wear', weight: 7 }, { value: 'desk-cluster', weight: 3 }, { value: 'storage-corner', weight: 3 }
  ],
  pillar: [
    { value: 'pillar-lattice', weight: 44 }, { value: 'open-void', weight: 14 }, { value: 'thin-corridor', weight: 6 },
    { value: 'arch-run', weight: 5 }, { value: 'partition-offset', weight: 6 }, { value: 'bench-island', weight: 4 },
    { value: 'floor-wear', weight: 9 }, { value: 'service-bank', weight: 4 }, { value: 'storage-corner', weight: 3 }
  ],
  blackout: [
    { value: 'service-bank', weight: 24 }, { value: 'thin-corridor', weight: 18 }, { value: 'partition-offset', weight: 14 },
    { value: 'storage-corner', weight: 12 }, { value: 'floor-damp', weight: 14 }, { value: 'open-void', weight: 6 },
    { value: 'pillar-lattice', weight: 4 }, { value: 'desk-cluster', weight: 3 }
  ],
  holes: [{ value: 'hole-field', weight: 55 }, { value: 'open-void', weight: 18 }, { value: 'pillar-lattice', weight: 8 }, { value: 'arch-run', weight: 6 }, { value: 'floor-wear', weight: 5 }],
  manila: [{ value: 'open-void', weight: 1 }],
  'exit-threshold': [{ value: 'partition-offset', weight: 18 }, { value: 'open-void', weight: 12 }, { value: 'storage-corner', weight: 4 }, { value: 'floor-wear', weight: 6 }]
};

function chooseSpatialProfile(seed: string, x: number, z: number, key: string, zoneId: ZoneId, archetype: RoomArchetype): SpatialProfile {
  if (zoneId === 'manila' || zoneId === 'exit-threshold' || zoneId === 'holes') return 'standard';
  const districtKey = `${floorDiv(x, 5)}:${floorDiv(z, 5)}`;
  const districtRoll = unitFloat(`${seed}:district-spatial:${districtKey}:${zoneId}`);
  if (zoneId === 'pillar' && districtRoll < 0.24) return 'pillar-expanse';
  if (districtRoll < 0.018) return 'sparse-vista';
  if (districtRoll < 0.038 && (zoneId === 'blackout' || archetype === 'narrow-hall')) return 'thin-channel';
  const roll = unitFloat(`${key}:spatial-profile`);
  if (zoneId === 'pillar' && roll < 0.14) return 'pillar-expanse';
  if ((archetype === 'narrow-hall' || zoneId === 'blackout') && roll < 0.16) return 'thin-channel';
  if (roll < 0.028) return 'sparse-vista';
  if (roll < 0.065) return 'thin-channel';
  if (roll < 0.1) return 'pillar-expanse';
  return 'standard';
}

function anchorComponent(archetype: RoomArchetype): RoomComponentId {
  if (archetype === 'open-office') return 'desk-cluster';
  if (archetype === 'split-suite') return 'partition-offset';
  if (archetype === 'narrow-hall' || archetype === 'flooded-corridor') return 'thin-corridor';
  if (archetype === 'alcove-ring') return 'alcove-pair';
  if (archetype === 'service-corner' || archetype === 'maintenance-bay') return 'service-bank';
  if (archetype === 'wide-lobby') return 'open-void';
  if (archetype.startsWith('arch-')) return 'arch-run';
  if (archetype.startsWith('pillar-')) return 'pillar-lattice';
  if (archetype === 'hole-gallery' || archetype === 'broken-floor') return 'hole-field';
  return 'partition-offset';
}

function selectComponents(key: string, zoneId: ZoneId, archetype: RoomArchetype, profile: SpatialProfile, variation: number): RoomComponentId[] {
  if (zoneId === 'manila') return ['open-void'];
  if (zoneId === 'holes') return ['hole-field', unitFloat(`${key}:hole-extra`) < 0.45 ? 'pillar-lattice' : 'open-void'];
  const desired = profile === 'sparse-vista' ? 1 : profile === 'thin-channel' ? 2 : profile === 'pillar-expanse' ? 2 : Math.max(2, Math.min(5, 2 + Math.round(variation) + intInRange(`${key}:count`, 0, 3)));
  const selected: RoomComponentId[] = [profile === 'thin-channel' ? 'thin-corridor' : profile === 'pillar-expanse' ? 'pillar-lattice' : anchorComponent(archetype)];
  const weights = COMPONENT_WEIGHTS[zoneId];
  for (let index = 1; index < desired; index += 1) {
    const choice = weightedChoice(`${key}:component:${index}`, weights).value;
    if (!selected.includes(choice) || choice === 'floor-wear' || choice === 'floor-damp') selected.push(choice);
  }
  if (profile === 'sparse-vista') return ['open-void'];
  return selected;
}

function addArchRun(props: PropSpec[], key: string, axis: 'x' | 'z', offset: number, variant: number, indexBase = 0): void {
  const radius = 1.7;
  const postHeight = 1.18;
  const thickness = 0.48;
  const segmentCount = 9;
  const postY = postHeight / 2;
  if (axis === 'z') {
    props.push(prop(stableId('arch-post', key, indexBase, 'l'), 'column', -radius, postY, offset, thickness, postHeight, thickness, 0, true, variant));
    props.push(prop(stableId('arch-post', key, indexBase, 'r'), 'column', radius, postY, offset, thickness, postHeight, thickness, 0, true, variant));
  } else {
    props.push(prop(stableId('arch-post', key, indexBase, 'l'), 'column', offset, postY, -radius, thickness, postHeight, thickness, 0, true, variant));
    props.push(prop(stableId('arch-post', key, indexBase, 'r'), 'column', offset, postY, radius, thickness, postHeight, thickness, 0, true, variant));
  }
  for (let index = 0; index < segmentCount; index += 1) {
    const t = Math.PI - (Math.PI * index) / (segmentCount - 1);
    const tangentDegrees = (t * 180 / Math.PI) - 90;
    const horizontal = Math.cos(t) * radius;
    const y = postHeight + Math.sin(t) * radius;
    if (axis === 'z') props.push(prop(stableId('arch-curve', key, indexBase, index), 'arch-segment', horizontal, y, offset, 0.62, 0.24, thickness, 0, false, variant, 0, tangentDegrees));
    else props.push(prop(stableId('arch-curve', key, indexBase, index), 'arch-segment', offset, y, horizontal, thickness, 0.24, 0.62, 0, false, variant, tangentDegrees, 0));
  }
}

function applyComponent(component: RoomComponentId, index: number, key: string, variant: number, profile: SpatialProfile, walls: WallSpec[], props: PropSpec[], patches: FloorPatchSpec[]): void {
  const mv = (variant + index) % 5;
  const sign = unitFloat(`${key}:${component}:${index}:side`) < 0.5 ? -1 : 1;
  const axis = unitFloat(`${key}:${component}:${index}:axis`) < 0.5 ? 'x' : 'z';
  switch (component) {
    case 'open-void':
      if (profile !== 'sparse-vista' && unitFloat(`${key}:void-bench:${index}`) < 0.35) props.push(prop(stableId('void-bench', key, index), 'bench', sign * 2.8, 0.35, -sign * 2.1, 2.4, 0.7, 0.68, variant * 17, true, mv));
      break;
    case 'partition-cross':
      addPartitionWithGap(walls, stableId('component', key, component, index, 'a'), true, -1.8 + unitFloat(`${key}:pc:a:${index}`) * 3.6, (unitFloat(`${key}:pc:ga:${index}`) - 0.5) * 3.4, mv);
      addPartitionWithGap(walls, stableId('component', key, component, index, 'b'), false, -1.8 + unitFloat(`${key}:pc:b:${index}`) * 3.6, (unitFloat(`${key}:pc:gb:${index}`) - 0.5) * 3.4, mv + 1);
      break;
    case 'partition-offset':
      addPartitionWithGap(walls, stableId('component', key, component, index), axis === 'x', sign * (1.4 + unitFloat(`${key}:po:${index}`) * 2.1), (unitFloat(`${key}:pog:${index}`) - 0.5) * 4.4, mv);
      break;
    case 'thin-corridor': {
      const halfWidth = profile === 'thin-channel' ? 1.35 + unitFloat(`${key}:corridor-width:${index}`) * 0.45 : 2 + unitFloat(`${key}:corridor-width:${index}`) * 0.65;
      const length = 10.5 + unitFloat(`${key}:corridor-length:${index}`) * 1.6;
      if (axis === 'z') {
        walls.push(wall(stableId('corridor', key, index, 'l'), -halfWidth, WALL_HEIGHT / 2, 0, WALL_THICKNESS, WALL_HEIGHT, length, 'x', true, mv));
        walls.push(wall(stableId('corridor', key, index, 'r'), halfWidth, WALL_HEIGHT / 2, 0, WALL_THICKNESS, WALL_HEIGHT, length, 'x', true, mv + 1));
      } else {
        walls.push(wall(stableId('corridor', key, index, 'l'), 0, WALL_HEIGHT / 2, -halfWidth, length, WALL_HEIGHT, WALL_THICKNESS, 'z', true, mv));
        walls.push(wall(stableId('corridor', key, index, 'r'), 0, WALL_HEIGHT / 2, halfWidth, length, WALL_HEIGHT, WALL_THICKNESS, 'z', true, mv + 1));
      }
      break;
    }
    case 'desk-cluster': {
      const count = 1 + intInRange(`${key}:desks:${index}`, 0, profile === 'sparse-vista' ? 2 : 4);
      for (let desk = 0; desk < count; desk += 1) {
        const px = -4 + unitFloat(`${key}:desk-x:${index}:${desk}`) * 8;
        const pz = -4 + unitFloat(`${key}:desk-z:${index}:${desk}`) * 8;
        const rotation = intInRange(`${key}:desk-r:${index}:${desk}`, 0, 4) * 90;
        props.push(prop(stableId('desk', key, index, desk), 'table', px, 0.42, pz, 1.6 + unitFloat(`${key}:desk-w:${index}:${desk}`) * 0.8, 0.84, 0.72, rotation, true, mv));
        if (unitFloat(`${key}:chair:${index}:${desk}`) < 0.72) props.push(prop(stableId('chair', key, index, desk), 'chair', px + (rotation % 180 === 0 ? 0.3 : 0.8), 0.45, pz + (rotation % 180 === 0 ? 0.8 : 0.3), 0.55, 0.9, 0.55, rotation + 180, true, mv));
      }
      break;
    }
    case 'storage-corner':
      props.push(prop(stableId('cabinet', key, index), 'cabinet', sign * 4.8, 0.9, (axis === 'x' ? -1 : 1) * 4.35, 0.9, 1.8, 0.85, axis === 'x' ? 90 : 0, true, mv));
      if (unitFloat(`${key}:boxes:${index}`) < 0.7) props.push(prop(stableId('boxes', key, index), 'box', sign * 3.9, 0.34, (axis === 'x' ? -1 : 1) * 4.2, 1.0, 0.68, 0.9, variant * 13, true, mv + 1));
      break;
    case 'alcove-pair':
      for (let alcove = 0; alcove < 2; alcove += 1) {
        const px = axis === 'z' ? (alcove ? 4.6 : -4.6) : sign * (2.5 + alcove * 2.0);
        const pz = axis === 'z' ? sign * (2.4 + alcove * 1.8) : (alcove ? 4.6 : -4.6);
        props.push(prop(stableId('alcove', key, index, alcove), 'wall-panel', px, 1.25, pz, 2.2, 2.5, 0.16, axis === 'z' ? 90 : 0, true, mv + alcove));
      }
      break;
    case 'service-bank':
      for (let pipeIndex = 0; pipeIndex < 3 + intInRange(`${key}:pipes:${index}`, 0, 3); pipeIndex += 1) {
        props.push(prop(stableId('pipe', key, index, pipeIndex), 'pipe', sign * (5.05 - pipeIndex * 0.28), 1.55, axis === 'x' ? -3.4 : 3.4, 0.1, 2.9, 0.1, 0, false, pipeIndex));
      }
      break;
    case 'pillar-lattice': {
      const spacing = profile === 'pillar-expanse' ? 2.7 : 3.5;
      const positions = profile === 'pillar-expanse' ? [-4.2, -1.4, 1.4, 4.2] : [-3.7, 0, 3.7];
      let pillar = 0;
      for (const px of positions) for (const pz of positions) {
        if (unitFloat(`${key}:pillar-skip:${index}:${pillar}`) < (profile === 'pillar-expanse' ? 0.06 : 0.28)) { pillar += 1; continue; }
        const jitter = profile === 'pillar-expanse' ? 0.08 : 0.28;
        props.push(prop(stableId('pillar', key, index, pillar), 'column', px + (unitFloat(`${key}:pillar-x:${index}:${pillar}`) - 0.5) * jitter, WALL_HEIGHT / 2, pz + (unitFloat(`${key}:pillar-z:${index}:${pillar}`) - 0.5) * jitter, 0.68 + unitFloat(`${key}:pillar-s:${index}:${pillar}`) * 0.18, WALL_HEIGHT, 0.68 + unitFloat(`${key}:pillar-t:${index}:${pillar}`) * 0.18, 0, true, mv + pillar));
        pillar += 1;
      }
      void spacing;
      break;
    }
    case 'arch-run': {
      const count = 1 + (unitFloat(`${key}:arch-count:${index}`) < 0.4 ? 1 : 0);
      for (let arch = 0; arch < count; arch += 1) addArchRun(props, key, axis, (arch - (count - 1) / 2) * 4.6, mv, index * 3 + arch);
      break;
    }
    case 'bench-island':
      props.push(prop(stableId('bench', key, index), 'bench', sign * (0.7 + unitFloat(`${key}:bench-x:${index}`) * 2.3), 0.35, (unitFloat(`${key}:bench-z:${index}`) - 0.5) * 5, 2.2 + unitFloat(`${key}:bench-w:${index}`), 0.7, 0.68, variant * 19, true, mv));
      break;
    case 'floor-wear':
      patches.push(patch(stableId('wear', key, index), 'worn', (unitFloat(`${key}:wear-x:${index}`) - 0.5) * 3.5, (unitFloat(`${key}:wear-z:${index}`) - 0.5) * 3.5, 4 + unitFloat(`${key}:wear-w:${index}`) * 4, 3 + unitFloat(`${key}:wear-h:${index}`) * 4));
      break;
    case 'floor-damp':
      patches.push(patch(stableId('damp', key, index), 'damp', (unitFloat(`${key}:damp-x:${index}`) - 0.5) * 5, (unitFloat(`${key}:damp-z:${index}`) - 0.5) * 5, 2.5 + unitFloat(`${key}:damp-w:${index}`) * 4, 2.5 + unitFloat(`${key}:damp-h:${index}`) * 4));
      break;
    case 'hole-field': {
      const count = 3 + intInRange(`${key}:holes:${index}`, 0, 4);
      for (let hole = 0; hole < count; hole += 1) patches.push(patch(stableId('hole', key, index, hole), 'hole', -4.2 + unitFloat(`${key}:hole-x:${index}:${hole}`) * 8.4, -4.2 + unitFloat(`${key}:hole-z:${index}:${hole}`) * 8.4, 1.2 + unitFloat(`${key}:hole-w:${index}:${hole}`) * 1.4, 1.2 + unitFloat(`${key}:hole-h:${index}:${hole}`) * 1.4));
      break;
    }
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

export function layoutFor(seed: string, x: number, z: number, archetype: RoomArchetype, zoneId: ZoneId, shiftEpoch: number, variant: number, roomVariation = 1): LayoutResult {
  if (archetype === 'manila-room') return specialManila(seed, x, z, shiftEpoch);
  const walls: WallSpec[] = []; const props: PropSpec[] = []; const patches: FloorPatchSpec[] = []; const notes: NoteSpec[] = [];
  const key = `${seed}:${x}:${z}:${zoneId}:${archetype}:${shiftEpoch}`;
  const spatialProfile = chooseSpatialProfile(seed, x, z, key, zoneId, archetype);
  const componentIds = selectComponents(key, zoneId, archetype, spatialProfile, roomVariation);
  if (archetype === 'transition-foyer') componentIds.splice(0, componentIds.length, 'partition-offset', 'floor-wear');
  componentIds.forEach((component, index) => applyComponent(component, index, key, variant, spatialProfile, walls, props, patches));
  if (archetype === 'transition-foyer') props.push(prop(stableId('threshold-sign', key), 'sign', 0, 1.75, -5.5, 2.8, 0.7, 0.08, 0, false, variant % 5));
  const profileLabel: Record<SpatialProfile, string> = { standard: 'composite room', 'sparse-vista': 'sparse fluorescent vista', 'thin-channel': 'compressed channel', 'pillar-expanse': 'extended pillar lattice' };
  const label = `${profileLabel[spatialProfile]} · ${componentIds.join(' / ')}`;
  return { walls, props, patches, notes, label, spatialProfile, componentIds, compositionSignature: `${spatialProfile}:${componentIds.join('+')}` };
}
