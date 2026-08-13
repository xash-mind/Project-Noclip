import assert from 'node:assert/strict';
import test from 'node:test';

const {
  FIXTURE_LIGHT_ACQUIRE_RADIUS,
  FIXTURE_LIGHT_RELEASE_RADIUS,
  FIXTURE_PHYSICAL_LIGHT_RANGE,
  selectSpatialFixtureLights
} = await import('../.test-dist/src/world/lighting.js');
const { locateRegionAtDepth, regionDepthTargetSupported } = await import('../.test-dist/src/world/regionInspection.js');
const {
  DEV5_SEPARATE_BASE_TRIM,
  LEVEL0_WALLPAPER_PALETTE,
  LEVEL0_WALLPAPER_TILE_METERS,
  shouldGen3WallCollide,
  wallpaperUvForWall
} = await import('../.test-dist/src/renderer/dev5Wallpaper.js');
const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { CELL_SIZE, DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');

function wrap(value) { return ((value % 1) + 1) % 1; }
function almostEqual(left, right, epsilon = 1e-6) { return Math.abs(left - right) <= epsilon; }

function lightSource(state = 'on') {
  return [{
    cellX: 0,
    cellZ: 0,
    group: {
      id: 'fixture-regression',
      fixtures: [{ x: 0, y: 3.12, z: 0 }],
      rotationY: 0,
      state,
      intensity: 1,
      temperature: 0.94,
      flickerRate: 3,
      phase: 0.25
    }
  }];
}

test('fixture physical lights pre-arm outside their visible range and retain stable ownership', () => {
  assert.equal(FIXTURE_PHYSICAL_LIGHT_RANGE, 23.5);
  assert.ok(FIXTURE_LIGHT_ACQUIRE_RADIUS >= FIXTURE_PHYSICAL_LIGHT_RANGE + 5);
  assert.ok(FIXTURE_LIGHT_RELEASE_RADIUS > FIXTURE_LIGHT_ACQUIRE_RADIUS);

  const sources = lightSource('on');
  assert.equal(selectSpatialFixtureLights(sources, 31, 0, 2, false, 8).length, 0);
  const acquired = selectSpatialFixtureLights(sources, 29.5, 0, 2, false, 8);
  assert.equal(acquired.length, 1);
  assert.ok(acquired[0].distance > FIXTURE_PHYSICAL_LIGHT_RANGE, 'fixture should be owned before physical falloff can become visible');
  const sourceIntensity = acquired[0].intensity;

  let owners = acquired.map((source) => source.id);
  for (const playerX of [24, 20, 12, 3, -3, -12, -20, -24, -29, -34.5]) {
    const selected = selectSpatialFixtureLights(sources, playerX, 0, 2, false, 8, owners);
    assert.deepEqual(selected.map((source) => source.id), owners);
    assert.equal(selected[0].intensity, sourceIntensity, 'source energy must not be multiplied by player approach distance');
    owners = selected.map((source) => source.id);
  }
  assert.equal(selectSpatialFixtureLights(sources, -35.1, 0, 2, false, 8, owners).length, 0);
  assert.equal(selectSpatialFixtureLights(lightSource('off'), 0, 0, 2, false, 8).length, 0);
});

test('wallpaper is world-phased across Cell and vertical split boundaries', () => {
  assert.ok(LEVEL0_WALLPAPER_TILE_METERS > 0.35 && LEVEL0_WALLPAPER_TILE_METERS < 0.8);
  assert.equal(DEV5_SEPARATE_BASE_TRIM, false, 'tiny base detail must not remain a separate protruding geometry motif');
  assert.notEqual(LEVEL0_WALLPAPER_PALETTE.paper, '#ffff00');

  const left = { id: 'left', cx: 3.5, cy: 1.6, cz: 0, sx: 7, sy: 3.2, sz: 0.18, orientation: 'z', drawable: true };
  const right = { ...left, id: 'right', cx: -3.5 };
  const leftUv = wallpaperUvForWall(0, 0, left);
  const rightUv = wallpaperUvForWall(1, 0, right);
  assert.ok(almostEqual(wrap(leftUv.offset[0] + leftUv.tiling[0]), wrap(rightUv.offset[0])), 'horizontal phase restarts at Cell seam');

  const lower = { id: 'lower', cx: 0, cy: 0.5, cz: 0, sx: 5, sy: 1, sz: 0.18, orientation: 'z', drawable: true };
  const upper = { ...lower, id: 'upper', cy: 1.88, sy: 1.76 };
  const lowerUv = wallpaperUvForWall(0, 0, lower);
  const upperUv = wallpaperUvForWall(0, 0, upper);
  assert.ok(almostEqual(wrap(lowerUv.offset[1] + lowerUv.tiling[1]), wrap(upperUv.offset[1])), 'vertical pattern phase restarts between architectural pieces');
});

const clean = (regionOverride) => ({
  ...DEFAULT_TUNING,
  regionOverride,
  conditionOverride: 'clear',
  carverOverride: 'none',
  structureOverride: 'none',
  gateBypass: true
});

function generationOptions(x, z, tuning, seed = 'dev5-fidelity-arch') {
  return { seed, x, z, worldDay: 40, exposure: 10, shiftEpoch: 0, generationVersion: 'gen3-v1', tuning };
}

function worldWall(cell, wall) {
  const originX = cell.address.cellX * CELL_SIZE;
  const originZ = cell.address.cellZ * CELL_SIZE;
  const horizontal = wall.orientation === 'z';
  return {
    wall,
    orientation: wall.orientation,
    fixed: horizontal ? originZ + wall.cz : originX + wall.cx,
    start: horizontal ? originX + wall.cx - wall.sx / 2 : originZ + wall.cz - wall.sz / 2,
    end: horizontal ? originX + wall.cx + wall.sx / 2 : originZ + wall.cz + wall.sz / 2,
    minX: originX + wall.cx - wall.sx / 2,
    maxX: originX + wall.cx + wall.sx / 2,
    minZ: originZ + wall.cz - wall.sz / 2,
    maxZ: originZ + wall.cz + wall.sz / 2,
    minY: wall.cy - wall.sy / 2,
    maxY: wall.cy + wall.sy / 2
  };
}

function propBounds(cell, prop) {
  const originX = cell.address.cellX * CELL_SIZE;
  const originZ = cell.address.cellZ * CELL_SIZE;
  const rotated = Math.abs((prop.rotationY ?? 0) % 180) > 45;
  const sx = rotated ? prop.scale.z : prop.scale.x;
  const sz = rotated ? prop.scale.x : prop.scale.z;
  return { minX: originX + prop.position.x - sx / 2, maxX: originX + prop.position.x + sx / 2, minZ: originZ + prop.position.z - sz / 2, maxZ: originZ + prop.position.z + sz / 2 };
}

function clearPoint(obstacles, x, z, radius = 0.43) {
  return obstacles.every((wall) => x + radius <= wall.minX || x - radius >= wall.maxX || z + radius <= wall.minZ || z - radius >= wall.maxZ);
}

function clearPath(obstacles, start, end) {
  const distance = Math.hypot(end.x - start.x, end.z - start.z);
  const steps = Math.ceil(distance / 0.2);
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    if (!clearPoint(obstacles, start.x + (end.x - start.x) * t, start.z + (end.z - start.z) * t)) return false;
  }
  return true;
}

test('Arch route bays are floor-open in the 2D collider model while decorative lower panels remain solid', () => {
  const cells = [];
  for (let x = -6; x <= 6; x += 1) for (let z = -6; z <= 6; z += 1) cells.push(generateCell(generationOptions(x, z, clean('arch-rooms'))));
  const walls = cells.flatMap((cell) => cell.walls.map((wall) => worldWall(cell, wall)));
  const headers = walls.filter(({ wall, minY }) => wall.materialId === 'arch-pale-wallpaper' && minY > 2.68 && wall.sy > 0.34 && wall.sy < 0.55);
  const lowerPanels = walls.filter(({ wall }) => wall.materialId === 'arch-pale-wallpaper' && wall.sy > 0.92 && wall.sy < 1.08 && wall.cy > 0.45 && wall.cy < 0.56);
  assert.ok(headers.length > 8, `expected repeated Arch headers, got ${headers.length}`);
  assert.ok(lowerPanels.length > 8, `expected decorative lower panels, got ${lowerPanels.length}`);
  assert.ok(headers.every(({ wall }) => !shouldGen3WallCollide(wall)), 'overhead headers must not own floor collision');
  assert.ok(lowerPanels.every(({ wall }) => shouldGen3WallCollide(wall)), 'decorative lower panels must remain solid');

  const floorWalls = walls.filter(({ wall }) => shouldGen3WallCollide(wall));
  const props = cells.flatMap((cell) => cell.props.filter((prop) => prop.solid).map((prop) => propBounds(cell, prop)));
  const obstacles = [...floorWalls, ...props];
  let traversableRoute = false;
  for (const header of headers) {
    for (let along = header.start + 1.05; along <= header.end - 1.05; along += 0.3) {
      const start = header.orientation === 'z' ? { x: along, z: header.fixed - 1.7 } : { x: header.fixed - 1.7, z: along };
      const end = header.orientation === 'z' ? { x: along, z: header.fixed + 1.7 } : { x: header.fixed + 1.7, z: along };
      if (clearPath(obstacles, start, end)) { traversableRoute = true; break; }
    }
    if (traversableRoute) break;
  }
  assert.ok(traversableRoute, 'no collider-clear route-bearing Arch bay was found');
});

async function locateAcrossSeeds(regionId, targetDepth) {
  for (let index = 0; index < 5; index += 1) {
    const result = locateRegionAtDepth({
      seed: `dev5-depth-inspection-${index}`,
      originX: 0,
      originZ: 0,
      targetRegion: regionId,
      targetDepth,
      worldDay: 40,
      exposure: 10,
      tuning: { ...DEFAULT_TUNING, gateBypass: true },
      maxDistanceMeters: 12_000
    });
    if (result) return result;
  }
  return undefined;
}

test('World Lab depth locator reaches the natural Pillar gradient without inventing Ordinary cores', async () => {
  assert.equal(regionDepthTargetSupported('ordinary-level-0', 'core'), false);
  assert.equal(regionDepthTargetSupported('pillar-field', 'deep-core'), true);
  assert.equal(regionDepthTargetSupported('arch-rooms', 'deep-core'), false);

  const depths = [];
  for (const target of ['edge', 'interior', 'core', 'deep-core']) {
    const occurrence = await locateAcrossSeeds('pillar-field', target);
    assert.ok(occurrence, `missing natural Pillar ${target} target`);
    depths.push(occurrence.depthValue);
  }
  assert.ok(depths[0] < depths[1] && depths[1] < depths[2] && depths[2] < depths[3], `Pillar targets were not monotonic: ${depths.join(', ')}`);

  const archEdge = await locateAcrossSeeds('arch-rooms', 'edge');
  const archCore = await locateAcrossSeeds('arch-rooms', 'core');
  assert.ok(archEdge && archCore, 'Arch edge/core inspection targets must remain locatable');
  assert.ok(archEdge.depthValue < archCore.depthValue, 'Arch locator should inspect affinity depth without Pillar density semantics');
});
