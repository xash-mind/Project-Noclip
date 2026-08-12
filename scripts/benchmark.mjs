import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { analyzeNavigation } from './coherence-metrics-lib.mjs';

rmSync('.test-dist', { recursive: true, force: true });
const compile = spawnSync('tsc', ['-p', 'tsconfig.test.json'], { stdio: 'inherit' });
if (compile.status !== 0) process.exit(compile.status ?? 1);

const { generateCell, validateCellPlacement } = await import('../.test-dist/src/world/generator.js');
const { locateNearestRegion } = await import('../.test-dist/src/world/gen3.js');
const { GEOGRAPHY_FIELD_NAMES, sampleWorldGeography } = await import('../.test-dist/src/world/fields.js');
const {
  ARCH_IRREGULAR_CHANCE,
  PILLAR_MAX_WIDTH,
  PILLAR_MIN_WIDTH,
  PILLAR_WIDTH_SCALE,
  gen3ArchDividerDiagnostic,
  sampleGen3RegionInfluence
} = await import('../.test-dist/src/world/gen3Architecture.js');
const { DEFAULT_TUNING, CELL_SIZE } = await import('../.test-dist/src/world/types.js');

const generationOptions = (x, z, tuning = DEFAULT_TUNING, seed = 'gen3-benchmark-001') => ({
  seed, x, z, worldDay: 40, exposure: 10, shiftEpoch: 0,
  generationVersion: 'gen3-v1', tuning
});
const percentile = (values, fraction) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
};
const rounded = (value, digits = 3) => Number(value.toFixed(digits));

let generationElapsed = 0;
let validationElapsed = 0;
const regions = { 'ordinary-level-0': 0, 'pillar-field': 0, 'arch-rooms': 0 };
let cells = 0; let walls = 0; let props = 0; let holes = 0; let lightGroups = 0; let fixtures = 0;
let maxWalls = 0; let maxProps = 0; let maxFixtures = 0; let paleInOrdinaryLabel = 0;
let disorienting = 0; let hallucinations = 0; let offGroups = 0; let flickerGroups = 0;
const placementSamples = [];

// 10,000 wide-spaced Cell samples: time the actual runtime generator only; verify every result separately.
for (let sampleX = -50; sampleX < 50; sampleX += 1) for (let sampleZ = -50; sampleZ < 50; sampleZ += 1) {
  const x = sampleX * 8; const z = sampleZ * 8;
  const generationStart = performance.now();
  const cell = generateCell(generationOptions(x, z));
  generationElapsed += performance.now() - generationStart;

  cells += 1; regions[cell.world.regionId] += 1;
  walls += cell.walls.length; props += cell.props.length; holes += cell.floorPatches.length;
  lightGroups += cell.lightGroups.length;
  const fixtureCount = cell.lightGroups.reduce((sum, group) => sum + group.fixtures.length, 0);
  fixtures += fixtureCount; maxWalls = Math.max(maxWalls, cell.walls.length); maxProps = Math.max(maxProps, cell.props.length); maxFixtures = Math.max(maxFixtures, fixtureCount);
  if (cell.world.regionId === 'ordinary-level-0' && cell.walls.some((wall) => wall.materialId === 'arch-pale-wallpaper')) paleInOrdinaryLabel += 1;
  if (cell.stability === 'disorienting') disorienting += 1;
  if (cell.hallucinationAnchor) hallucinations += 1;
  for (const group of cell.lightGroups) { if (group.state === 'off') offGroups += 1; if (group.state === 'flicker') flickerGroups += 1; }

  const validationStart = performance.now();
  for (const error of validateCellPlacement(cell)) if (placementSamples.length < 20) placementSamples.push(`${cell.id}: ${error}`);
  validationElapsed += performance.now() - validationStart;
}

const commonPillarTuning = { ...DEFAULT_TUNING, regionOverride: 'pillar-field', conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none', gateBypass: true };
let commonPillarCells = 0; let commonPillarWalls = 0; let commonPillarColumns = 0;
const pillarWidths = [];
for (let x = -20; x <= 20; x += 1) for (let z = -20; z <= 20; z += 1) {
  const cell = generateCell(generationOptions(x, z, commonPillarTuning, 'benchmark-common-pillar'));
  commonPillarCells += 1; commonPillarWalls += cell.walls.length;
  for (const prop of cell.props) if (prop.kind === 'column') { commonPillarColumns += 1; pillarWidths.push(prop.scale.x); }
}

// Natural Pillar influence distribution: common blended territory vs rare deep-field extreme.
const commonSegments = [];
const deepSegments = [];
let commonSamples = 0; let deepSamples = 0;
const deepCells = [];
for (let seedIndex = 0; seedIndex < 24; seedIndex += 1) {
  const seed = `dev4-pillar-extent-${seedIndex}`;
  const occurrence = locateNearestRegion({ seed, originX: 0, originZ: 0, target: 'pillar-field', worldDay: 40, exposure: 10, tuning: DEFAULT_TUNING, maxDistanceMeters: 12_000 });
  if (!occurrence) continue;
  let commonRun = 0; let deepRun = 0;
  for (let offset = -5_600; offset <= 5_600; offset += 28) {
    const worldX = occurrence.worldX + offset; const worldZ = occurrence.worldZ;
    const influence = sampleGen3RegionInfluence(seed, worldX, worldZ, 40, 10, DEFAULT_TUNING);
    const common = influence.pillar > 0.18;
    const deep = influence.deepPillar > 0.55;
    if (common) { commonSamples += 1; commonRun += 28; } else if (commonRun) { commonSegments.push(commonRun); commonRun = 0; }
    if (deep) {
      deepSamples += 1; deepRun += 28;
      if (deepCells.length < 96) deepCells.push({ seed, x: Math.floor((worldX + CELL_SIZE / 2) / CELL_SIZE), z: Math.floor((worldZ + CELL_SIZE / 2) / CELL_SIZE) });
    } else if (deepRun) { deepSegments.push(deepRun); deepRun = 0; }
  }
  if (commonRun) commonSegments.push(commonRun);
  if (deepRun) deepSegments.push(deepRun);
}

let deepWalls = 0; let deepColumns = 0;
for (const sample of deepCells) {
  const cell = generateCell(generationOptions(sample.x, sample.z, { ...DEFAULT_TUNING, gateBypass: true, conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none' }, sample.seed));
  deepWalls += cell.walls.length;
  deepColumns += cell.props.filter((prop) => prop.kind === 'column').length;
}

// Explicit Arch irregularity budget and intentional scale variation.
let archDividerSamples = 0; let irregularArchDividers = 0;
const archBayWidths = new Set();
for (const axis of ['x', 'z']) for (let lineIndex = -24; lineIndex <= 24; lineIndex += 1) for (let groupIndex = -36; groupIndex <= 36; groupIndex += 1) {
  const spec = gen3ArchDividerDiagnostic({ seed: 'benchmark-arch-rarity', axis, lineIndex, groupIndex, worldDay: 40, exposure: 10, tuning: { ...DEFAULT_TUNING, regionOverride: 'arch-rooms', gateBypass: true } });
  if (!spec) continue;
  archDividerSamples += 1;
  if (spec.irregular) irregularArchDividers += 1;
  archBayWidths.add(spec.bayWidth.toFixed(3));
}

// Actual-collider navigation metrics over common Ordinary play.
const ordinaryNavigation = [];
const ordinaryTuning = { ...DEFAULT_TUNING, regionOverride: 'ordinary-level-0', conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none', gateBypass: true };
for (const [seed, centerX, centerZ] of [['nav-a', 0, 0], ['nav-b', 12, -7], ['nav-c', -20, 13], ['nav-d', 31, 24]]) {
  const navCells = [];
  for (let x = centerX - 5; x <= centerX + 5; x += 1) for (let z = centerZ - 5; z <= centerZ + 5; z += 1) navCells.push(generateCell(generationOptions(x, z, ordinaryTuning, seed)));
  ordinaryNavigation.push(analyzeNavigation(navCells, { startWorld: { x: centerX * CELL_SIZE, z: centerZ * CELL_SIZE }, step: 0.7, playerRadius: 0.42 }));
}
const navMean = (key) => ordinaryNavigation.reduce((sum, sample) => sum + sample[key], 0) / ordinaryNavigation.length;

const blackout = generateCell(generationOptions(0, 0, { ...DEFAULT_TUNING, conditionOverride: 'blackout', structureOverride: 'none' }));
const holeCells = [];
for (let x = -3; x <= 3; x += 1) for (let z = -3; z <= 3; z += 1) holeCells.push(generateCell(generationOptions(x, z, { ...DEFAULT_TUNING, regionOverride: 'ordinary-level-0', carverOverride: 'floor-hole-cluster', structureOverride: 'none' })));
const forcedHoles = holeCells.flatMap((cell) => cell.floorPatches.map((patch) => ({ x: cell.address.cellX * CELL_SIZE + patch.position.x, z: cell.address.cellZ * CELL_SIZE + patch.position.z, sx: patch.scale.x, sz: patch.scale.z })));
let holeOverlaps = 0;
for (let left = 0; left < forcedHoles.length; left += 1) for (let right = left + 1; right < forcedHoles.length; right += 1) {
  const a = forcedHoles[left]; const b = forcedHoles[right];
  if (Math.abs(a.x - b.x) < (a.sx + b.sx) / 2 && Math.abs(a.z - b.z) < (a.sz + b.sz) / 2) holeOverlaps += 1;
}

const west = sampleWorldGeography('boundary-benchmark', 6.999, 91.25);
const east = sampleWorldGeography('boundary-benchmark', 7.001, 91.25);
const geographyBoundaryDelta = Math.max(...GEOGRAPHY_FIELD_NAMES.map((name) => Math.abs(west[name] - east[name])));

const generationUs = generationElapsed * 1000 / cells;
const validationUs = validationElapsed * 1000 / cells;
const commonWallsPerCell = commonPillarWalls / commonPillarCells;
const commonColumnsPerCell = commonPillarColumns / commonPillarCells;
const deepWallsPerCell = deepCells.length ? deepWalls / deepCells.length : 0;
const deepColumnsPerCell = deepCells.length ? deepColumns / deepCells.length : 0;
const deepSampleRate = commonSamples ? deepSamples / commonSamples : 0;
const irregularRate = archDividerSamples ? irregularArchDividers / archDividerSamples : 0;

const result = {
  generation: {
    version: 'gen3-v1', cells,
    runtimeElapsedMs: rounded(generationElapsed, 2), runtimeMicrosecondsPerCell: rounded(generationUs, 2),
    validationElapsedMs: rounded(validationElapsed, 2), validationMicrosecondsPerCell: rounded(validationUs, 2),
    regions, walls, props, holes, lightGroups, fixtures, maxWalls, maxProps, maxFixtures,
    paleInOrdinaryLabel, placementErrors: placementSamples.length, placementSamples
  },
  navigation: {
    ordinaryReachableAreaRatio: rounded(navMean('reachableAreaRatio'), 4),
    ordinaryIsolatedAreaRatio: rounded(navMean('isolatedAreaRatio'), 4),
    ordinaryIsolatedPockets: rounded(navMean('isolatedPockets'), 2),
    ordinaryDeadEndDepthMeters: rounded(navMean('maxDeadEndDepth'), 2),
    ordinaryOpenAreaP50: rounded(navMean('openAreaP50'), 2),
    ordinaryOpenAreaP90: rounded(navMean('openAreaP90'), 2),
    ordinaryOpenAreaP99: rounded(navMean('openAreaP99'), 2),
    ordinaryCellsCrossed: rounded(navMean('cellsCrossed'), 2)
  },
  pillar: {
    widthScale: PILLAR_WIDTH_SCALE, minWidth: PILLAR_MIN_WIDTH, maxWidth: PILLAR_MAX_WIDTH,
    common: { cells: commonPillarCells, wallsPerCell: rounded(commonWallsPerCell), columnsPerCell: rounded(commonColumnsPerCell) },
    extentDistribution: {
      seeds: 24, commonSegments: commonSegments.length, deepSegments: deepSegments.length,
      commonP50Meters: rounded(percentile(commonSegments, 0.5), 1), commonP90Meters: rounded(percentile(commonSegments, 0.9), 1),
      deepP50Meters: rounded(percentile(deepSegments, 0.5), 1), deepP90Meters: rounded(percentile(deepSegments, 0.9), 1),
      maxDeepMeters: rounded(Math.max(0, ...deepSegments), 1), deepSampleRate: rounded(deepSampleRate, 4)
    },
    deepGeometry: { sampledCells: deepCells.length, wallsPerCell: rounded(deepWallsPerCell), columnsPerCell: rounded(deepColumnsPerCell) },
    generatedWidthRange: pillarWidths.length ? [rounded(Math.min(...pillarWidths), 4), rounded(Math.max(...pillarWidths), 4)] : []
  },
  arch: {
    dividerSamples: archDividerSamples, irregularDividers: irregularArchDividers,
    irregularRate: rounded(irregularRate, 4), configuredIrregularChance: ARCH_IRREGULAR_CHANCE,
    distinctBayWidths: archBayWidths.size
  },
  normalFirst: {
    sampledCells: cells, disorientingCells: disorienting, hallucinationAnchors: hallucinations,
    disorientingRate: rounded(disorienting / cells, 5), hallucinationRate: rounded(hallucinations / cells, 5),
    offGroupRate: rounded(lightGroups ? offGroups / lightGroups : 0, 5), flickerGroupRate: rounded(lightGroups ? flickerGroups / lightGroups : 0, 5)
  },
  blackout: { localLightGroups: blackout.lightGroups.length, localFixtures: blackout.lightGroups.reduce((sum, group) => sum + group.fixtures.length, 0) },
  holeCarver: { patches: forcedHoles.length, overlaps: holeOverlaps },
  geographyBoundaryDelta: Number(geographyBoundaryDelta.toFixed(9)),
  heapMb: rounded(process.memoryUsage().heapUsed / 1024 / 1024, 2)
};

console.log(JSON.stringify(result, null, 2));

if (
  placementSamples.length
  || generationUs > 500
  || maxWalls > 64
  || maxProps > 8
  || maxFixtures > 6
  || blackout.lightGroups.length
  || commonWallsPerCell < 4 || commonWallsPerCell > 12
  || commonColumnsPerCell < 0.7 || commonColumnsPerCell > 2.2
  || PILLAR_WIDTH_SCALE !== 0.9
  || pillarWidths.some((width) => width < PILLAR_MIN_WIDTH - 1e-9 || width > PILLAR_MAX_WIDTH + 1e-9)
  || commonSegments.length < 12
  || deepSegments.length === 0
  || deepSampleRate <= 0 || deepSampleRate >= 0.08
  || Math.max(0, ...deepSegments) < 84
  || (deepCells.length > 0 && deepWallsPerCell >= commonWallsPerCell * 0.72)
  || (deepCells.length > 0 && deepColumnsPerCell <= commonColumnsPerCell)
  || archDividerSamples < 1000
  || irregularRate <= 0 || irregularRate > ARCH_IRREGULAR_CHANCE * 2.2
  || archBayWidths.size < 8
  || navMean('reachableAreaRatio') < 0.99
  || navMean('isolatedAreaRatio') > 0.01
  || navMean('cellsCrossed') < 10
  || navMean('openAreaP50') < 100 || navMean('openAreaP50') > 320
  || navMean('openAreaP90') < 350 || navMean('openAreaP90') > 1100
  || disorienting / cells >= 0.01
  || hallucinations / cells >= 0.003
  || (lightGroups && offGroups / lightGroups >= 0.005)
  || (lightGroups && flickerGroups / lightGroups >= 0.025)
  || forcedHoles.length < 30
  || holeOverlaps
  || geographyBoundaryDelta >= 0.0001
) process.exit(1);
