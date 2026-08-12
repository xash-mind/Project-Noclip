import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeNavigation, buildNavigationGrid } from '../scripts/coherence-metrics-lib.mjs';

const { generateCell, validateCellPlacement } = await import('../.test-dist/src/world/generator.js');
const { locateNearestRegion } = await import('../.test-dist/src/world/gen3.js');
const {
  ARCH_IRREGULAR_CHANCE,
  PILLAR_MAX_WIDTH,
  PILLAR_MIN_WIDTH,
  PILLAR_SPACING,
  PILLAR_WIDTH_SCALE,
  gen3ArchDividerDiagnostic,
  sampleGen3RegionInfluence
} = await import('../.test-dist/src/world/gen3Architecture.js');
const { selectSpatialFixtureLights } = await import('../.test-dist/src/world/lighting.js');
const { CELL_SIZE, DEFAULT_TUNING, WALL_HEIGHT } = await import('../.test-dist/src/world/types.js');

const clean = (regionOverride) => ({
  ...DEFAULT_TUNING,
  regionOverride,
  conditionOverride: 'clear',
  carverOverride: 'none',
  structureOverride: 'none',
  gateBypass: true
});

function cell(seed, x, z, tuning = DEFAULT_TUNING) {
  return generateCell({ seed, x, z, worldDay: 40, exposure: 10, shiftEpoch: 0, generationVersion: 'gen3-v1', tuning });
}

function window(seed, centerX, centerZ, radius, tuning = DEFAULT_TUNING) {
  const cells = [];
  for (let x = centerX - radius; x <= centerX + radius; x += 1) {
    for (let z = centerZ - radius; z <= centerZ + radius; z += 1) cells.push(cell(seed, x, z, tuning));
  }
  return cells;
}

function worldToCell(value) { return Math.floor((value + CELL_SIZE / 2) / CELL_SIZE); }

function nearestWalkable(grid, worldX, worldZ) {
  const ix = Math.round((worldX - grid.minX) / grid.step);
  const iz = Math.round((worldZ - grid.minZ) / grid.step);
  for (let radius = 0; radius <= 10; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) for (let dz = -radius; dz <= radius; dz += 1) {
      const x = ix + dx; const z = iz + dz;
      if (x < 0 || z < 0 || x >= grid.width || z >= grid.height) continue;
      const index = z * grid.width + x;
      if (grid.walkable[index]) return index;
    }
  }
  return undefined;
}

function canNavigate(cells, start, end) {
  const grid = buildNavigationGrid(cells, { step: 0.7, playerRadius: 0.42 });
  const startIndex = nearestWalkable(grid, start.x, start.z);
  const endIndex = nearestWalkable(grid, end.x, end.z);
  if (startIndex === undefined || endIndex === undefined) return false;
  const queue = new Int32Array(grid.walkable.length); const seen = new Uint8Array(grid.walkable.length);
  let head = 0; let tail = 0; queue[tail++] = startIndex; seen[startIndex] = 1;
  while (head < tail) {
    const current = queue[head++];
    if (current === endIndex) return true;
    const x = current % grid.width; const z = Math.floor(current / grid.width);
    const candidates = [];
    if (x > 0) candidates.push(current - 1);
    if (x + 1 < grid.width) candidates.push(current + 1);
    if (z > 0) candidates.push(current - grid.width);
    if (z + 1 < grid.height) candidates.push(current + grid.width);
    for (const next of candidates) if (grid.walkable[next] && !seen[next]) { seen[next] = 1; queue[tail++] = next; }
  }
  return false;
}

function transitionSides(seed, target) {
  const occurrence = locateNearestRegion({ seed, originX: 0, originZ: 0, target, worldDay: 40, exposure: 10, tuning: DEFAULT_TUNING, maxDistanceMeters: 12_000 });
  assert.ok(occurrence, `missing ${target} occurrence for ${seed}`);
  const key = target === 'pillar-field' ? 'pillar' : 'arch';
  const exits = [];
  for (const direction of [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }]) {
    let previous = { x: occurrence.worldX, z: occurrence.worldZ, strength: sampleGen3RegionInfluence(seed, occurrence.worldX, occurrence.worldZ, 40, 10, DEFAULT_TUNING)[key] };
    for (let distance = 28; distance <= 8_000; distance += 28) {
      const point = { x: occurrence.worldX + direction.x * distance, z: occurrence.worldZ + direction.z * distance };
      const strength = sampleGen3RegionInfluence(seed, point.x, point.z, 40, 10, DEFAULT_TUNING)[key];
      if (strength < 0.08 && previous.strength > 0.18) {
        exits.push({ inside: { x: previous.x, z: previous.z }, outside: point, insideStrength: previous.strength, outsideStrength: strength });
        break;
      }
      previous = { ...point, strength };
    }
  }
  assert.ok(exits.length >= 2, `${target} did not expose two finite blend exits`);
  return exits.slice(0, 2);
}

function wallWorld(cellDescriptor, wall) {
  const baseX = cellDescriptor.address.cellX * CELL_SIZE;
  const baseZ = cellDescriptor.address.cellZ * CELL_SIZE;
  const horizontal = wall.orientation === 'z';
  return {
    id: wall.id,
    orientation: wall.orientation,
    fixed: horizontal ? baseZ + wall.cz : baseX + wall.cx,
    start: horizontal ? baseX + wall.cx - wall.sx / 2 : baseZ + wall.cz - wall.sz / 2,
    end: horizontal ? baseX + wall.cx + wall.sx / 2 : baseZ + wall.cz + wall.sz / 2,
    minY: wall.cy - wall.sy / 2,
    maxY: wall.cy + wall.sy / 2,
    cy: wall.cy,
    sy: wall.sy,
    materialId: wall.materialId
  };
}

function isCellBoundary(value) {
  return Math.abs((value - CELL_SIZE / 2) / CELL_SIZE - Math.round((value - CELL_SIZE / 2) / CELL_SIZE)) < 0.0002;
}

test('Ordinary Level 0 actual colliders remain broadly reachable with bounded local space sizes', () => {
  const samples = [
    ['coherence-a', 0, 0], ['coherence-b', 12, -7], ['coherence-c', -20, 13], ['coherence-d', 31, 24]
  ];
  const results = samples.map(([seed, x, z]) => analyzeNavigation(window(seed, x, z, 5, clean('ordinary-level-0')), {
    startWorld: { x: x * CELL_SIZE, z: z * CELL_SIZE }, step: 0.7, playerRadius: 0.42
  }));
  for (const result of results) {
    assert.ok(result.reachableAreaRatio >= 0.99, JSON.stringify(result));
    assert.ok(result.isolatedAreaRatio <= 0.01, JSON.stringify(result));
    assert.ok(result.boundaryReached && result.cellsCrossed >= 10, JSON.stringify(result));
    assert.ok(result.maxDeadEndDepth <= 7, JSON.stringify(result));
  }
  const mean = (key) => results.reduce((sum, result) => sum + result[key], 0) / results.length;
  assert.ok(mean('openAreaP50') >= 100 && mean('openAreaP50') <= 320, `P50 ${mean('openAreaP50')}`);
  assert.ok(mean('openAreaP90') >= 350 && mean('openAreaP90') <= 1100, `P90 ${mean('openAreaP90')}`);
  assert.ok(mean('openAreaP99') > mean('openAreaP90') * 1.15, `large-space tail disappeared: ${JSON.stringify(results)}`);
});

test('World Lab forced Ordinary, Pillar and Arch territories remain locally navigable at player clearance', () => {
  for (const region of ['ordinary-level-0', 'pillar-field', 'arch-rooms']) {
    const cells = window(`forced-${region}`, 0, 0, 4, clean(region));
    const result = analyzeNavigation(cells, { startWorld: { x: 0, z: 0 }, step: 0.7, playerRadius: 0.42 });
    assert.ok(result.reachableAreaRatio >= 0.98, `${region}: ${JSON.stringify(result)}`);
    assert.ok(result.isolatedAreaRatio <= 0.02, `${region}: ${JSON.stringify(result)}`);
    assert.ok(result.boundaryReached && result.cellsCrossed >= 9, `${region}: ${JSON.stringify(result)}`);
    assert.ok(cells.every((entry) => validateCellPlacement(entry).length === 0), `${region} has placement overlap`);
  }
});

test('natural Ordinary-Pillar and Ordinary-Arch blend boundaries are traversable in both directions', () => {
  for (const [target, seed] of [['pillar-field', 'dev4-transition-pillar'], ['arch-rooms', 'dev4-transition-arch']]) {
    const exits = transitionSides(seed, target);
    for (const exit of exits) {
      const center = { x: (exit.inside.x + exit.outside.x) / 2, z: (exit.inside.z + exit.outside.z) / 2 };
      const centerCellX = worldToCell(center.x); const centerCellZ = worldToCell(center.z);
      const cells = window(seed, centerCellX, centerCellZ, 5, { ...DEFAULT_TUNING, conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none', gateBypass: true });
      assert.ok(canNavigate(cells, exit.outside, exit.inside), `${target} entry is blocked: ${JSON.stringify(exit)}`);
      assert.ok(canNavigate(cells, exit.inside, exit.outside), `${target} exit is blocked: ${JSON.stringify(exit)}`);
      if (target === 'pillar-field') {
        assert.ok(cells.some((entry) => entry.props.some((prop) => prop.kind === 'column')), 'Pillar blend has no pillars');
        assert.ok(cells.reduce((sum, entry) => sum + entry.walls.length, 0) > cells.length * 3, 'Pillar blend discarded ordinary partitions');
      } else {
        const walls = cells.flatMap((entry) => entry.walls);
        assert.ok(walls.some((wall) => wall.materialId === 'arch-pale-wallpaper'), 'Arch blend has no pale geometry');
        assert.ok(walls.some((wall) => wall.materialId === 'level-0-wallpaper'), 'Arch blend discarded ordinary geometry');
      }
    }
  }
});

test('Pillar width is exactly ten percent below dev.3 while common Pillar territory remains mixed', () => {
  assert.equal(PILLAR_WIDTH_SCALE, 0.9);
  assert.ok(Math.abs(PILLAR_MIN_WIDTH - 1.55 * 0.9) < 1e-12);
  assert.ok(Math.abs(PILLAR_MAX_WIDTH - 2.3 * 0.9) < 1e-12);
  assert.equal(PILLAR_SPACING, 7.2);
  const cells = window('dev4-pillar-width', 0, 0, 8, clean('pillar-field'));
  const columns = cells.flatMap((entry) => entry.props.filter((prop) => prop.kind === 'column').map((prop) => ({ entry, prop })));
  const wallsPerCell = cells.reduce((sum, entry) => sum + entry.walls.length, 0) / cells.length;
  const columnsPerCell = columns.length / cells.length;
  assert.ok(wallsPerCell >= 4 && wallsPerCell <= 12, `wall density ${wallsPerCell}`);
  assert.ok(columnsPerCell >= 0.7 && columnsPerCell <= 2.2, `pillar density ${columnsPerCell}`);
  assert.ok(columns.every(({ prop }) => prop.scale.x >= PILLAR_MIN_WIDTH - 1e-9 && prop.scale.x <= PILLAR_MAX_WIDTH + 1e-9));
  assert.ok(columns.every(({ prop }) => Math.abs(prop.scale.x - prop.scale.z) < 1e-12 && prop.scale.y === WALL_HEIGHT && prop.materialId === 'level-0-wallpaper'));
  const xs = [...new Set(columns.map(({ entry, prop }) => Number((entry.address.cellX * CELL_SIZE + prop.position.x).toFixed(4))))].sort((a, b) => a - b);
  const deltas = xs.slice(1).map((value, index) => value - xs[index]).filter((value) => value > 0.01);
  assert.ok(deltas.every((value) => Math.abs(value / PILLAR_SPACING - Math.round(value / PILLAR_SPACING)) < 0.001));
});

test('Arch dividers own stable world-scale rhythm, normal symmetry and rare explicit irregularity', () => {
  const specs = [];
  const tuning = clean('arch-rooms');
  for (const axis of ['x', 'z']) for (let lineIndex = -20; lineIndex <= 20; lineIndex += 1) for (let groupIndex = -30; groupIndex <= 30; groupIndex += 1) {
    const spec = gen3ArchDividerDiagnostic({ seed: 'dev4-arch-diagnostic', axis, lineIndex, groupIndex, worldDay: 40, exposure: 10, tuning });
    if (spec) specs.push(spec);
  }
  assert.ok(specs.length > 1000, `only ${specs.length} divider samples`);
  const irregular = specs.filter((spec) => spec.irregular);
  const irregularRate = irregular.length / specs.length;
  assert.ok(irregularRate > 0 && irregularRate <= ARCH_IRREGULAR_CHANCE * 2.2, `irregular rate ${(irregularRate * 100).toFixed(2)}%`);
  assert.ok(specs.filter((spec) => !spec.irregular).every((spec) => spec.symmetryDelta === 0));
  assert.ok(irregular.every((spec) => Math.abs(spec.symmetryDelta) <= 0.07 + 1e-9));
  assert.ok(new Set(specs.map((spec) => spec.bayWidth.toFixed(3))).size >= 8, 'Arch divider scale no longer varies intentionally');
});

test('Arch world pieces do not overlap and pale spans reconstruct across streaming seams', () => {
  const cells = window('dev4-arch-seams', 0, 0, 6, clean('arch-rooms'));
  const walls = cells.flatMap((entry) => entry.walls.map((wall) => wallWorld(entry, wall)));
  for (let left = 0; left < walls.length; left += 1) for (let right = left + 1; right < walls.length; right += 1) {
    const a = walls[left]; const b = walls[right];
    if (a.orientation !== b.orientation || Math.abs(a.fixed - b.fixed) > 0.002) continue;
    const alongOverlap = Math.min(a.end, b.end) - Math.max(a.start, b.start);
    const yOverlap = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
    assert.ok(alongOverlap <= 0.005 || yOverlap <= 0.005, `overlap ${a.id} / ${b.id}: along ${alongOverlap}, y ${yOverlap}`);
  }
  let paleSeams = 0;
  for (let left = 0; left < walls.length; left += 1) for (let right = left + 1; right < walls.length; right += 1) {
    const a = walls[left]; const b = walls[right];
    if (a.materialId !== 'arch-pale-wallpaper' || b.materialId !== 'arch-pale-wallpaper') continue;
    if (a.orientation !== b.orientation || Math.abs(a.fixed - b.fixed) > 0.002 || Math.abs(a.cy - b.cy) > 0.002 || Math.abs(a.sy - b.sy) > 0.002) continue;
    const touch = Math.abs(a.end - b.start) < 0.002 ? a.end : Math.abs(b.end - a.start) < 0.002 ? b.end : undefined;
    if (touch !== undefined && isCellBoundary(touch)) paleSeams += 1;
  }
  assert.ok(paleSeams >= 12, `only ${paleSeams} cross-Cell pale seam reconstructions`);
});

test('realtime fixture selection keeps ownership stable while walking through nearest-order crossings', () => {
  const fixture = (id, x) => ({ cellX: 0, cellZ: 0, group: { id, fixtures: [{ x, y: WALL_HEIGHT - 0.08, z: 0 }], rotationY: 0, state: 'on', intensity: 1, temperature: 0.94, flickerRate: 4, phase: 0.2 } });
  const sources = [fixture('a', -8), fixture('b', -3), fixture('c', 3), fixture('d', 8), fixture('e', 14), fixture('f', 20)];
  let selected = selectSpatialFixtureLights(sources, 0, 0, 3, false, 4);
  const original = selected.map((entry) => entry.id);
  for (const x of [0.5, 1, 1.5, 2, 2.5, 3]) {
    selected = selectSpatialFixtureLights(sources, x, 0, 3, false, 4, selected.map((entry) => entry.id));
    assert.deepEqual(selected.map((entry) => entry.id), original, `fixture ownership churned at x=${x}`);
  }
  const intensityBefore = selected.find((entry) => entry.id === original[0])?.intensity;
  selected = selectSpatialFixtureLights(sources, 5, 0, 3, false, 4, selected.map((entry) => entry.id));
  const intensityAfter = selected.find((entry) => entry.id === original[0])?.intensity;
  assert.equal(intensityAfter, intensityBefore, 'retained fixture source energy changed with player distance');
  selected = selectSpatialFixtureLights(sources, 31, 0, 3, false, 4, selected.map((entry) => entry.id));
  assert.ok(selected.some((entry) => !original.includes(entry.id)), 'fixture slots never replace sources after release radius');
});

test('normal traversal spends a small explicit budget on instability and hallucination events', () => {
  let disorienting = 0; let hallucinations = 0; let groups = 0; let flicker = 0; let off = 0;
  const total = 2200;
  for (let index = 0; index < total; index += 1) {
    const x = index - Math.floor(total / 2);
    const z = Math.round(Math.sin(index * 0.037) * 9);
    const entry = cell('dev4-long-traversal', x, z, { ...DEFAULT_TUNING, gateBypass: true });
    if (entry.stability === 'disorienting') disorienting += 1;
    if (entry.hallucinationAnchor) hallucinations += 1;
    for (const group of entry.lightGroups) { groups += 1; if (group.state === 'flicker') flicker += 1; if (group.state === 'off') off += 1; }
  }
  assert.ok(disorienting / total < 0.01, `disorienting ${(disorienting / total * 100).toFixed(2)}%`);
  assert.ok(hallucinations / total < 0.003, `hallucinations ${(hallucinations / total * 100).toFixed(2)}%`);
  assert.ok(groups > 1000);
  assert.ok(flicker / groups < 0.025, `flicker ${(flicker / groups * 100).toFixed(2)}%`);
  assert.ok(off / groups < 0.005, `off ${(off / groups * 100).toFixed(2)}%`);
});
