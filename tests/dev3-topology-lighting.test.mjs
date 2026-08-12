import assert from 'node:assert/strict';
import test from 'node:test';

const { generateCell, validateCellPlacement } = await import('../.test-dist/src/world/generator.js');
const { selectSpatialFixtureLights } = await import('../.test-dist/src/world/lighting.js');
const { DEFAULT_TUNING, WALL_HEIGHT } = await import('../.test-dist/src/world/types.js');

const generated = (seed, x, z, regionOverride) => generateCell({
  seed,
  x,
  z,
  worldDay: 40,
  exposure: 10,
  shiftEpoch: 0,
  generationVersion: 'gen3-v1',
  tuning: {
    ...DEFAULT_TUNING,
    regionOverride,
    conditionOverride: 'clear',
    carverOverride: 'none',
    structureOverride: 'none'
  }
});

test('dev.3 ordinary architecture forms a dense intersecting partition network instead of isolated wall runs', () => {
  const cells = [];
  for (let x = -10; x <= 10; x += 1) for (let z = -10; z <= 10; z += 1) {
    const cell = generated('dev3-ordinary-topology', x, z, 'ordinary-level-0');
    if (cell.world.structureIds.length === 0) cells.push(cell);
  }
  const wallCount = cells.reduce((sum, cell) => sum + cell.walls.length, 0);
  const emptyCells = cells.filter((cell) => cell.walls.length === 0).length;
  const mixedAxisCells = cells.filter((cell) => {
    const orientations = new Set(cell.walls.map((wall) => wall.orientation));
    return orientations.has('x') && orientations.has('z');
  }).length;
  assert.ok(wallCount / cells.length >= 2.2, `ordinary wall density was only ${(wallCount / cells.length).toFixed(2)} pieces per Cell`);
  assert.ok(emptyCells / cells.length <= 0.12, `${emptyCells}/${cells.length} ordinary Cells had no partitions`);
  assert.ok(mixedAxisCells / cells.length >= 0.18, `only ${mixedAxisCells}/${cells.length} Cells contained intersecting partition directions`);
  assert.ok(cells.every((cell) => validateCellPlacement(cell).length === 0));
});

test('dev.3 Arch Rooms contain full-height room walls around the repeated arch dividers', () => {
  const cells = [];
  for (let x = -8; x <= 8; x += 1) for (let z = -8; z <= 8; z += 1) {
    const cell = generated('dev3-arch-enclosure', x, z, 'arch-rooms');
    if (cell.world.structureIds.length === 0) cells.push(cell);
  }
  const walls = cells.flatMap((cell) => cell.walls);
  const fullHeight = walls.filter((wall) => Math.abs(wall.cy - WALL_HEIGHT / 2) < 0.001 && Math.abs(wall.sy - WALL_HEIGHT) < 0.001);
  const dividerParts = walls.filter((wall) => wall.sy < WALL_HEIGHT - 0.1);
  const cellsWithRoomWalls = cells.filter((cell) => cell.walls.some((wall) => Math.abs(wall.cy - WALL_HEIGHT / 2) < 0.001 && Math.abs(wall.sy - WALL_HEIGHT) < 0.001));
  assert.ok(fullHeight.length > cells.length * 0.7, `only ${fullHeight.length} full-height room-wall pieces across ${cells.length} Cells`);
  assert.ok(dividerParts.length > 100, `only ${dividerParts.length} shaped Arch divider pieces`);
  assert.ok(cellsWithRoomWalls.length / cells.length >= 0.55, `only ${cellsWithRoomWalls.length}/${cells.length} Arch Cells had surrounding full-height walls`);
  assert.ok(walls.every((wall) => wall.materialId === 'arch-pale-wallpaper'));
  assert.ok(cells.every((cell) => validateCellPlacement(cell).length === 0));
});

test('dev.3 Pillar Field keeps its continuous lattice but closes some of the excessive open gap', () => {
  const cells = [];
  for (let x = -8; x <= 8; x += 1) for (let z = -8; z <= 8; z += 1) cells.push(generated('dev3-pillar-width', x, z, 'pillar-field'));
  const pillars = cells.flatMap((cell) => cell.props.filter((prop) => prop.kind === 'column'));
  assert.ok(pillars.length > cells.length * 1.8);
  assert.ok(pillars.every((pillar) => pillar.scale.x >= 1.55 && pillar.scale.z >= 1.55), 'Pillar Field retained dev.2 narrow pier widths');
  assert.ok(cells.every((cell) => validateCellPlacement(cell).length === 0));
});

test('dev.3 fixture source intensity no longer brightens merely because the player approaches it', () => {
  const source = {
    cellX: 0,
    cellZ: 0,
    group: {
      id: 'stable-fixture',
      fixtures: [{ x: 10, y: WALL_HEIGHT - 0.08, z: 0 }],
      rotationY: 0,
      state: 'on',
      intensity: 1,
      temperature: 0.94,
      flickerRate: 4,
      phase: 0.25
    }
  };
  const far = selectSpatialFixtureLights([source], 0, 0, 5, false, 1);
  const near = selectSpatialFixtureLights([source], 7, 0, 5, false, 1);
  assert.equal(far.length, 1);
  assert.equal(near.length, 1);
  assert.equal(far[0].id, near[0].id);
  assert.equal(far[0].intensity, near[0].intensity);
  assert.ok(near[0].distance < far[0].distance);
});