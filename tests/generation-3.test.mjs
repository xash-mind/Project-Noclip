import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCell, validateCellPlacement } from '../.test-dist/src/world/generator.js';
import { estimateRegionExtent, locateNearestRegion, sampleGen3Environment } from '../.test-dist/src/world/gen3.js';
import { DEFAULT_TUNING, CELL_SIZE, WALL_HEIGHT } from '../.test-dist/src/world/types.js';

const generated = (overrides = {}) => generateCell({
  seed: 'gen3-architecture', x: 0, z: 0, worldDay: 40, exposure: 10, shiftEpoch: 0,
  tuning: DEFAULT_TUNING, generationVersion: 'gen3-v1', ...overrides
});

test('new Generation 3 journeys reserve a meaningful forward arrival lane', () => {
  const cell = generated({
    seed: 'threshold-001',
    x: 0,
    z: 0,
    tuning: { ...DEFAULT_TUNING, structureOverride: 'none', carverOverride: 'none' }
  });
  const lane = { minX: -0.82, maxX: 0.82, minZ: -3.6, maxZ: 0.82 };
  const overlapsLane = (bounds) => bounds.minX < lane.maxX && bounds.maxX > lane.minX && bounds.minZ < lane.maxZ && bounds.maxZ > lane.minZ;
  const wallBounds = cell.walls.map((wall) => ({
    id: wall.id,
    minX: wall.cx - wall.sx / 2,
    maxX: wall.cx + wall.sx / 2,
    minZ: wall.cz - wall.sz / 2,
    maxZ: wall.cz + wall.sz / 2
  }));
  const propBounds = cell.props.filter((prop) => prop.solid).map((prop) => {
    const rotated = Math.abs((prop.rotationY ?? 0) % 180) > 45;
    const sizeX = rotated ? prop.scale.z : prop.scale.x;
    const sizeZ = rotated ? prop.scale.x : prop.scale.z;
    return {
      id: prop.id,
      minX: prop.position.x - sizeX / 2,
      maxX: prop.position.x + sizeX / 2,
      minZ: prop.position.z - sizeZ / 2,
      maxZ: prop.position.z + sizeZ / 2
    };
  });
  const obstruction = [...wallBounds, ...propBounds].find(overlapsLane);
  assert.equal(obstruction, undefined, `arrival lane obstructed by ${obstruction?.id}`);
});

test('ordinary architecture is world-space continuous and has no Cell boundary wall cadence', () => {
  const cells = new Map();
  const tuning = { ...DEFAULT_TUNING, regionOverride: 'ordinary-level-0', conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none' };
  for (let x = -12; x <= 12; x += 1) for (let z = -12; z <= 12; z += 1) {
    const cell = generated({ seed: 'gen3-seams', x, z, tuning });
    if (cell.world.structureIds.length > 0) continue;
    cells.set(cell.id, cell);
    assert.equal(cell.walls.some((wall) => (Math.abs(Math.abs(wall.cx) - 7) < 0.01 && wall.sx < 0.5) || (Math.abs(Math.abs(wall.cz) - 7) < 0.01 && wall.sz < 0.5)), false, `${cell.id} emitted a Cell boundary wall`);
    assert.deepEqual(cell.openings, { north: true, east: true, south: true, west: true });
  }

  let matchedSeams = 0;
  for (const cell of cells.values()) {
    const east = cells.get(`${cell.address.cellX + 1}:${cell.address.cellZ}`);
    if (east) {
      const boundary = (cell.address.cellX + 0.5) * CELL_SIZE;
      const leftEnds = cell.walls.filter((wall) => wall.orientation === 'z' && Math.abs(cell.address.cellX * CELL_SIZE + wall.cx + wall.sx / 2 - boundary) < 0.001);
      const rightStarts = east.walls.filter((wall) => wall.orientation === 'z' && Math.abs(east.address.cellX * CELL_SIZE + wall.cx - wall.sx / 2 - boundary) < 0.001);
      for (const left of leftEnds) if (rightStarts.some((right) => Math.abs(cell.address.cellZ * CELL_SIZE + left.cz - (east.address.cellZ * CELL_SIZE + right.cz)) < 0.001)) matchedSeams += 1;
    }
    const south = cells.get(`${cell.address.cellX}:${cell.address.cellZ + 1}`);
    if (south) {
      const boundary = (cell.address.cellZ + 0.5) * CELL_SIZE;
      const northEnds = cell.walls.filter((wall) => wall.orientation === 'x' && Math.abs(cell.address.cellZ * CELL_SIZE + wall.cz + wall.sz / 2 - boundary) < 0.001);
      const southStarts = south.walls.filter((wall) => wall.orientation === 'x' && Math.abs(south.address.cellZ * CELL_SIZE + wall.cz - wall.sz / 2 - boundary) < 0.001);
      for (const north of northEnds) if (southStarts.some((candidate) => Math.abs(cell.address.cellX * CELL_SIZE + north.cx - (south.address.cellX * CELL_SIZE + candidate.cx)) < 0.001)) matchedSeams += 1;
    }
  }
  assert.ok(matchedSeams >= 80, `only ${matchedSeams} naturally continuing partition seams`);
});

test('Region geography is continuous across Cell boundaries and has kilometre-capable cores', () => {
  for (const seed of ['continuity-a', 'continuity-b', 'continuity-c']) {
    const west = sampleGen3Environment(seed, 6.999, 123.45, 40, 10, DEFAULT_TUNING);
    const east = sampleGen3Environment(seed, 7.001, 123.45, 40, 10, DEFAULT_TUNING);
    assert.ok(Math.abs(west.regionStrength - east.regionStrength) < 0.001);
    assert.ok(Math.abs(west.blackoutStrength - east.blackoutStrength) < 0.001);
  }

  const pillarDurations = [];
  const archDurations = [];
  for (let index = 0; index < 12; index += 1) {
    const seed = `region-duration-${index}`;
    for (const [target, output] of [['pillar-field', pillarDurations], ['arch-rooms', archDurations]]) {
      const occurrence = locateNearestRegion({ seed, originX: 0, originZ: 0, target, worldDay: 40, exposure: 10, tuning: DEFAULT_TUNING });
      assert.ok(occurrence, `${target} missing for ${seed}`);
      const extent = estimateRegionExtent({ seed, worldX: occurrence.worldX, worldZ: occurrence.worldZ, target, worldDay: 40, exposure: 10, tuning: DEFAULT_TUNING });
      output.push(extent.crossingMinutes);
    }
  }
  pillarDurations.sort((a, b) => a - b); archDurations.sort((a, b) => a - b);
  assert.ok(pillarDurations[6] >= 8, `Pillar median ${pillarDurations[6].toFixed(1)} min`);
  assert.ok(pillarDurations[10] >= 20, `Pillar long tail ${pillarDurations[10].toFixed(1)} min`);
  assert.ok(archDurations[6] >= 5, `Arch median ${archDurations[6].toFixed(1)} min`);
});

test('Pillar Field is an open persistent wallpaper-clad world lattice with rare walls', () => {
  const cells = [];
  const tuning = { ...DEFAULT_TUNING, regionOverride: 'pillar-field', conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none' };
  for (let x = -10; x <= 10; x += 1) for (let z = -10; z <= 10; z += 1) cells.push(generated({ seed: 'pillar-core', x, z, tuning }));
  const regionCells = cells.filter((cell) => cell.world.structureIds.length === 0);
  const columns = regionCells.flatMap((cell) => cell.props.filter((prop) => prop.kind === 'column').map((prop) => ({ cell, prop })));
  const wallCount = regionCells.reduce((sum, cell) => sum + cell.walls.length, 0);
  assert.ok(columns.length > regionCells.length * 1.8, `only ${columns.length} pillars across ${regionCells.length} Cells`);
  assert.ok(wallCount / regionCells.length < 0.35, `wall density ${wallCount / regionCells.length} per Cell`);
  assert.ok(columns.every(({ prop }) => prop.materialId === 'level-0-wallpaper' && prop.scale.y === WALL_HEIGHT && prop.scale.x >= 1.18));
  assert.ok(regionCells.every((cell) => cell.world.regionId === 'pillar-field' && cell.world.conditionIds.includes('shallow-dry-carpet')));
  assert.ok(regionCells.every((cell) => cell.componentIds.length === 0));
  assert.ok(regionCells.every((cell) => validateCellPlacement(cell).length === 0));
  const worldXs = [...new Set(columns.map(({ cell, prop }) => Number((cell.address.cellX * CELL_SIZE + prop.position.x).toFixed(4))))].sort((a, b) => a - b);
  const deltas = worldXs.slice(1).map((value, index) => value - worldXs[index]).filter((value) => value > 0.01);
  assert.ok(deltas.every((value) => Math.abs(value / 7.2 - Math.round(value / 7.2)) < 0.001), `non-lattice delta ${deltas.find((value) => Math.abs(value / 7.2 - Math.round(value / 7.2)) >= 0.001)}`);
});

test('Arch Rooms use continuous pale divider walls with lower panels, openings, and headers', () => {
  const cells = [];
  const tuning = { ...DEFAULT_TUNING, regionOverride: 'arch-rooms', conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none' };
  for (let x = -8; x <= 8; x += 1) for (let z = -8; z <= 8; z += 1) cells.push(generated({ seed: 'arch-core', x, z, tuning }));
  const regionCells = cells.filter((cell) => cell.world.structureIds.length === 0);
  const parts = regionCells.flatMap((cell) => cell.walls);
  assert.ok(parts.length > 300);
  assert.ok(parts.every((wall) => wall.materialId === 'arch-pale-wallpaper'));
  assert.ok(parts.some((wall) => Math.abs(wall.cy - 0.5) < 0.001 && Math.abs(wall.sy - 1) < 0.001), 'missing solid lower panels');
  assert.ok(parts.some((wall) => Math.abs(wall.cy - 2.96) < 0.001 && Math.abs(wall.sy - 0.48) < 0.001), 'missing continuous headers');
  assert.ok(parts.some((wall) => wall.cy > 2.3 && wall.sy < 0.8), 'missing shaped opening shoulders');
  assert.ok(regionCells.every((cell) => cell.props.every((prop) => !prop.id.includes('arch-post') && !prop.id.includes('arch-beam'))));
  assert.ok(regionCells.every((cell) => cell.componentIds.length === 0 && cell.stability === 'stable' && cell.world.conditionIds.includes('deep-wet-carpet')));
});

test('independent seed domains keep architecture fixed when Conditions or Carvers change', () => {
  const baseTuning = { ...DEFAULT_TUNING, regionOverride: 'ordinary-level-0', conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none' };
  const base = generated({ seed: 'domain-separation', x: 3, z: -6, tuning: baseTuning });
  const blackout = generated({ seed: 'domain-separation', x: 3, z: -6, tuning: { ...baseTuning, conditionOverride: 'blackout' } });
  const holes = generated({ seed: 'domain-separation', x: 3, z: -6, tuning: { ...baseTuning, carverOverride: 'floor-hole-cluster' } });
  assert.deepEqual(blackout.walls, base.walls); assert.deepEqual(blackout.props, base.props);
  assert.deepEqual(holes.walls, base.walls); assert.deepEqual(holes.props, base.props);
  assert.equal(blackout.lightGroups.length, 0);
});

test('Manila remains a bounded Structure and never imports legacy room components', () => {
  const tuning = {
    ...DEFAULT_TUNING,
    regionOverride: 'ordinary-level-0',
    conditionOverride: 'clear',
    carverOverride: 'none',
    structureOverride: 'manila-room'
  };
  const centre = generated({ seed: 'manila-structure', x: 0, z: 0, tuning });
  const neighbour = generated({ seed: 'manila-structure', x: 1, z: 0, tuning });
  assert.deepEqual(centre.world.structureIds, ['manila-room']);
  assert.equal(centre.roomLabel, 'The Manila Room');
  assert.equal(centre.compositionSignature, 'gen3-v1:structure:manila-room');
  assert.deepEqual(centre.componentIds, []);
  assert.equal(centre.walls.length, 5);
  assert.ok(centre.notes.some((note) => note.source === 'manila-book'));
  assert.deepEqual(neighbour.world.structureIds, []);
  assert.notEqual(neighbour.roomArchetype, 'manila-room');
});

test('exits are Transition overlays, not Threshold geography or legacy foyers', () => {
  const tuning = {
    ...DEFAULT_TUNING,
    regionOverride: 'ordinary-level-0',
    conditionOverride: 'clear',
    carverOverride: 'none',
    structureOverride: 'none',
    gateBypass: true
  };
  const cell = generated({ seed: 'transition-overlay', x: 12, z: 0, tuning });
  assert.equal(cell.address.zoneId, 'baseline');
  assert.equal(cell.world.regionId, 'ordinary-level-0');
  assert.deepEqual(cell.world.structureIds, ['exit-structure']);
  assert.equal(cell.world.transitionIds.length, 1);
  assert.equal(cell.roomLabel, 'Transition structure');
  assert.notEqual(cell.roomArchetype, 'transition-foyer');
  assert.deepEqual(cell.componentIds, []);
  assert.ok(!cell.compositionSignature.includes('threshold'));
  const exit = cell.exits[0];
  assert.ok(cell.walls.every((wall) => {
    const nearestX = Math.max(wall.cx - wall.sx / 2, Math.min(exit.localPosition.x, wall.cx + wall.sx / 2));
    const nearestZ = Math.max(wall.cz - wall.sz / 2, Math.min(exit.localPosition.z, wall.cz + wall.sz / 2));
    return Math.hypot(exit.localPosition.x - nearestX, exit.localPosition.z - nearestZ) >= 1.65;
  }), 'Transition visual is obstructed by Region geometry');
});
