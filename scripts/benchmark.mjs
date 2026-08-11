import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

rmSync('.test-dist', { recursive: true, force: true });
const compile = spawnSync('tsc', ['-p', 'tsconfig.test.json'], { stdio: 'inherit' });
if (compile.status !== 0) process.exit(compile.status ?? 1);

const { generateCell, validateCellPlacement } = await import('../.test-dist/src/world/generator.js');
const { estimateRegionExtent, locateNearestRegion } = await import('../.test-dist/src/world/gen3.js');
const { GEOGRAPHY_FIELD_NAMES, sampleWorldGeography } = await import('../.test-dist/src/world/fields.js');
const { DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');

const generationOptions = (x, z, tuning = DEFAULT_TUNING) => ({
  seed: 'gen3-benchmark-001', x, z, worldDay: 40, exposure: 10, shiftEpoch: 0,
  generationVersion: 'gen3-v1', tuning
});

const start = performance.now();
const regions = { 'ordinary-level-0': 0, 'pillar-field': 0, 'arch-rooms': 0 };
let cells = 0; let walls = 0; let props = 0; let holes = 0; let lightGroups = 0; let fixtures = 0;
let maxWalls = 0; let maxProps = 0; let maxFixtures = 0; let blackoutCells = 0; let forbiddenOrdinary = 0;
const placementSamples = [];

// Wide-spaced samples exercise kilometres of geography while preserving real Cell generation costs.
for (let sampleX = -50; sampleX < 50; sampleX += 1) for (let sampleZ = -50; sampleZ < 50; sampleZ += 1) {
  const x = sampleX * 8; const z = sampleZ * 8;
  const cell = generateCell(generationOptions(x, z));
  cells += 1; regions[cell.world.regionId] += 1;
  walls += cell.walls.length; props += cell.props.length; holes += cell.floorPatches.length;
  lightGroups += cell.lightGroups.length;
  const fixtureCount = cell.lightGroups.reduce((sum, group) => sum + group.fixtures.length, 0);
  fixtures += fixtureCount; maxWalls = Math.max(maxWalls, cell.walls.length); maxProps = Math.max(maxProps, cell.props.length); maxFixtures = Math.max(maxFixtures, fixtureCount);
  if (cell.world.conditionIds.includes('blackout')) { blackoutCells += 1; if (cell.lightGroups.length !== 0) placementSamples.push(`${cell.id}: Blackout emitted local fixtures`); }
  if (cell.world.regionId === 'ordinary-level-0' && cell.world.structureIds.length === 0) {
    if (cell.componentIds.length > 0 || cell.props.some((prop) => prop.kind === 'divider' || prop.kind === 'wall-panel') || cell.walls.some((wall) => wall.materialId === 'arch-pale-wallpaper')) forbiddenOrdinary += 1;
  }
  for (const error of validateCellPlacement(cell)) if (placementSamples.length < 20) placementSamples.push(`${cell.id}: ${error}`);
}
const generationElapsed = performance.now() - start;

const pillarTuning = { ...DEFAULT_TUNING, regionOverride: 'pillar-field', conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none' };
let pillarCells = 0; let pillarWalls = 0; let pillarColumns = 0;
for (let x = -20; x <= 20; x += 1) for (let z = -20; z <= 20; z += 1) {
  const cell = generateCell(generationOptions(x, z, pillarTuning));
  pillarCells += 1; pillarWalls += cell.walls.length; pillarColumns += cell.props.filter((prop) => prop.kind === 'column').length;
}

const blackout = generateCell(generationOptions(0, 0, { ...DEFAULT_TUNING, conditionOverride: 'blackout', structureOverride: 'none' }));
const holeCells = [];
for (let x = -3; x <= 3; x += 1) for (let z = -3; z <= 3; z += 1) holeCells.push(generateCell(generationOptions(x, z, { ...DEFAULT_TUNING, regionOverride: 'ordinary-level-0', carverOverride: 'floor-hole-cluster', structureOverride: 'none' })));
const forcedHoles = holeCells.flatMap((cell) => cell.floorPatches.map((patch) => ({ x: cell.address.cellX * 14 + patch.position.x, z: cell.address.cellZ * 14 + patch.position.z, sx: patch.scale.x, sz: patch.scale.z })));
let holeOverlaps = 0;
for (let left = 0; left < forcedHoles.length; left += 1) for (let right = left + 1; right < forcedHoles.length; right += 1) {
  const a = forcedHoles[left]; const b = forcedHoles[right];
  if (Math.abs(a.x - b.x) < (a.sx + b.sx) / 2 && Math.abs(a.z - b.z) < (a.sz + b.sz) / 2) holeOverlaps += 1;
}

const durations = { 'pillar-field': [], 'arch-rooms': [] };
for (let index = 0; index < 12; index += 1) for (const target of Object.keys(durations)) {
  const seed = `benchmark-duration-${index}`;
  const occurrence = locateNearestRegion({ seed, originX: 0, originZ: 0, target, worldDay: 40, exposure: 10, tuning: DEFAULT_TUNING });
  if (!occurrence) continue;
  durations[target].push(estimateRegionExtent({ seed, worldX: occurrence.worldX, worldZ: occurrence.worldZ, target, worldDay: 40, exposure: 10, tuning: DEFAULT_TUNING }).crossingMinutes);
}
for (const values of Object.values(durations)) values.sort((a, b) => a - b);

const west = sampleWorldGeography('boundary-benchmark', 6.999, 91.25);
const east = sampleWorldGeography('boundary-benchmark', 7.001, 91.25);
const geographyBoundaryDelta = Math.max(...GEOGRAPHY_FIELD_NAMES.map((name) => Math.abs(west[name] - east[name])));
const percentile = (values, fraction) => values[Math.min(values.length - 1, Math.floor(values.length * fraction))] ?? 0;

const result = {
  generation: {
    version: 'gen3-v1', cells, elapsedMs: Number(generationElapsed.toFixed(2)),
    microsecondsPerCell: Number((generationElapsed * 1000 / cells).toFixed(2)), cellsPerSecond: Number((cells / generationElapsed * 1000).toFixed(1)),
    regions, walls, props, holes, lightGroups, fixtures, maxWalls, maxProps, maxFixtures,
    blackoutCells, forbiddenOrdinary, placementErrors: placementSamples.length, placementSamples
  },
  pillarField: {
    cells: pillarCells, columns: pillarColumns, walls: pillarWalls,
    columnsPerCell: Number((pillarColumns / pillarCells).toFixed(3)), wallsPerCell: Number((pillarWalls / pillarCells).toFixed(3))
  },
  blackout: { localLightGroups: blackout.lightGroups.length, localFixtures: blackout.lightGroups.reduce((sum, group) => sum + group.fixtures.length, 0) },
  holeCarver: { patches: forcedHoles.length, overlaps: holeOverlaps },
  regionCrossingMinutes: {
    pillarP50: Number(percentile(durations['pillar-field'], 0.5).toFixed(2)),
    pillarP90: Number(percentile(durations['pillar-field'], 0.9).toFixed(2)),
    archP50: Number(percentile(durations['arch-rooms'], 0.5).toFixed(2)),
    samples: Object.fromEntries(Object.entries(durations).map(([key, values]) => [key, values.length]))
  },
  geographyBoundaryDelta: Number(geographyBoundaryDelta.toFixed(9)),
  heapMb: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2))
};

console.log(JSON.stringify(result, null, 2));

if (
  placementSamples.length
  || forbiddenOrdinary
  || generationElapsed * 1000 / cells > 500
  || maxWalls > 64
  || maxProps > 8
  || blackout.lightGroups.length
  || pillarWalls / pillarCells >= 0.35
  || pillarColumns / pillarCells <= 1.8
  || forcedHoles.length < 30
  || holeOverlaps
  || percentile(durations['pillar-field'], 0.5) < 8
  || percentile(durations['pillar-field'], 0.9) < 20
  || percentile(durations['arch-rooms'], 0.5) < 5
  || geographyBoundaryDelta >= 0.0001
) process.exit(1);
