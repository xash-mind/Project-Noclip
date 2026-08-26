import assert from 'node:assert/strict';
import test from 'node:test';

const { locateRegionAtDepth, regionDepthTargetSupported } = await import('../.test-dist/src/world/regionInspection.js');
const {
  LEVEL0_SEPARATE_BASE_TRIM,
  LEVEL0_WALLPAPER_PALETTE,
  LEVEL0_WALLPAPER_TILE_METERS,
  wallpaperUvForWall
} = await import('../.test-dist/src/renderer/level0Wallpaper.js');
const {
  archFrameBaysForDescriptors,
  archLowerPanelWorldVolumeForCell,
  archSemanticWallOwnsFinalCollision,
  archStructuralRole
} = await import('../.test-dist/src/world/gen3ArchDividerSemantics.js');
const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { CELL_SIZE, DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');

function wrap(value) { return ((value % 1) + 1) % 1; }
function almostEqual(left, right, epsilon = 1e-6) { return Math.abs(left - right) <= epsilon; }

test('wallpaper is world-phased across Cell and vertical split boundaries', () => {
  assert.ok(LEVEL0_WALLPAPER_TILE_METERS > 0.35 && LEVEL0_WALLPAPER_TILE_METERS < 0.8);
  assert.equal(LEVEL0_SEPARATE_BASE_TRIM, false, 'tiny base detail must not remain a separate protruding geometry motif');
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

function generationOptions(x, z, tuning, seed = 'level0-fidelity-arch') {
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

function lowerPanelBounds(volume) {
  if (volume.orientation === 'z') {
    return {
      orientation: volume.orientation,
      fixed: volume.fixed,
      minX: volume.start,
      maxX: volume.end,
      minZ: volume.fixed - volume.depth / 2,
      maxZ: volume.fixed + volume.depth / 2
    };
  }
  return {
    orientation: volume.orientation,
    fixed: volume.fixed,
    minX: volume.fixed - volume.depth / 2,
    maxX: volume.fixed + volume.depth / 2,
    minZ: volume.start,
    maxZ: volume.end
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
  const headers = walls.filter(({ wall }) => archStructuralRole(wall) === 'upper');
  const semanticLowers = walls.filter(({ wall }) => archStructuralRole(wall) === 'lower-panel');
  const bays = archFrameBaysForDescriptors(cells);
  const routeBays = bays.filter((bay) => bay.route);
  const decorativeBays = bays.filter((bay) => !bay.route);
  const lowerPanelVolumes = cells.flatMap((cell) => decorativeBays
    .map((bay) => archLowerPanelWorldVolumeForCell(cell, bay))
    .filter(Boolean));
  const lowerPanels = lowerPanelVolumes.map(lowerPanelBounds);

  assert.ok(headers.length > 8, `expected repeated Arch headers, got ${headers.length}`);
  assert.ok(semanticLowers.length > 8, `expected semantic lower-panel inputs, got ${semanticLowers.length}`);
  assert.ok(routeBays.length > 8, `expected repeated route-bearing Arch bays, got ${routeBays.length}`);
  assert.ok(decorativeBays.length > 8, `expected repeated decorative Arch bays, got ${decorativeBays.length}`);
  assert.ok(lowerPanels.length > 8, `expected canonical decorative lower-panel colliders, got ${lowerPanels.length}`);
  assert.ok(headers.every(({ wall }) => !archSemanticWallOwnsFinalCollision(wall)), 'overhead headers must not own floor collision');
  assert.ok(semanticLowers.every(({ wall }) => !archSemanticWallOwnsFinalCollision(wall)), 'semantic lower WallSpecs must not duplicate canonical lower-panel collision');
  assert.ok(routeBays.every((bay) => cells.every((cell) => archLowerPanelWorldVolumeForCell(cell, bay) === undefined)), 'route bays must not receive lower-panel collision');
  assert.ok(lowerPanels.every((panel) => panel.maxX > panel.minX && panel.maxZ > panel.minZ), 'canonical lower-panel collision lost positive 2D volume');

  let solidDecorativePanel = false;
  for (const panel of lowerPanels) {
    const centerX = (panel.minX + panel.maxX) / 2;
    const centerZ = (panel.minZ + panel.maxZ) / 2;
    const start = panel.orientation === 'z'
      ? { x: centerX, z: panel.minZ - 0.7 }
      : { x: panel.minX - 0.7, z: centerZ };
    const end = panel.orientation === 'z'
      ? { x: centerX, z: panel.maxZ + 0.7 }
      : { x: panel.maxX + 0.7, z: centerZ };
    if (!clearPath([panel], start, end)) { solidDecorativePanel = true; break; }
  }
  assert.ok(solidDecorativePanel, 'decorative lower panels no longer form solid canonical 2D obstacles');

  const floorWalls = walls.filter(({ wall }) => archSemanticWallOwnsFinalCollision(wall));
  const props = cells.flatMap((cell) => cell.props.filter((prop) => prop.solid).map((prop) => propBounds(cell, prop)));
  const obstacles = [...floorWalls, ...lowerPanels, ...props];
  let traversableRoute = false;
  for (const bay of routeBays) {
    const along = (bay.start + bay.end) / 2;
    const start = bay.orientation === 'z' ? { x: along, z: bay.fixed - 1.7 } : { x: bay.fixed - 1.7, z: along };
    const end = bay.orientation === 'z' ? { x: along, z: bay.fixed + 1.7 } : { x: bay.fixed + 1.7, z: along };
    if (clearPath(obstacles, start, end)) { traversableRoute = true; break; }
  }
  assert.ok(traversableRoute, 'no collider-clear route-bearing Arch bay was found');
});

async function locateAcrossSeeds(regionId, targetDepth) {
  for (let index = 0; index < 5; index += 1) {
    const result = locateRegionAtDepth({
      seed: `region-depth-inspection-${index}`,
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
