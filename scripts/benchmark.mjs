import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { analyzeNavigation } from './coherence-metrics-lib.mjs';

rmSync('.test-dist', { recursive: true, force: true });
const compile = spawnSync('tsc', ['-p', 'tsconfig.test.json'], { stdio: 'inherit' });
if (compile.status !== 0) process.exit(compile.status ?? 1);

const { generateCell, validateCellPlacement } = await import('../.test-dist/src/world/generator.js');
const { GEOGRAPHY_FIELD_NAMES, sampleWorldGeography } = await import('../.test-dist/src/world/fields.js');
const {
  ARCH_IRREGULAR_CHANCE, PILLAR_MAX_WIDTH, PILLAR_MIN_WIDTH, PILLAR_WIDTH_SCALE,
  gen3ArchDividerDiagnostic, gen3ArchSilhouetteDiagnostic, sampleGen3RegionInfluence, sampleSpaceTopology
} = await import('../.test-dist/src/world/gen3Architecture.js');
const { DEFAULT_TUNING, CELL_SIZE } = await import('../.test-dist/src/world/types.js');

const generationOptions = (x, z, tuning = DEFAULT_TUNING, seed = 'gen3-benchmark-001') => ({
  seed, x, z, worldDay: 40, exposure: 10, shiftEpoch: 0, generationVersion: 'gen3-v1', tuning
});
const clean = (regionOverride) => ({ ...DEFAULT_TUNING, regionOverride, conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none', gateBypass: true });
const rounded = (value, digits = 3) => Number(value.toFixed(digits));
const mean = (items, key) => items.reduce((sum, item) => sum + item[key], 0) / Math.max(1, items.length);

let generationElapsed = 0; let validationElapsed = 0;
let cells = 0; let walls = 0; let props = 0; let holes = 0; let lightGroups = 0; let fixtures = 0;
let maxWalls = 0; let maxProps = 0; let maxFixtures = 0; let disorienting = 0; let hallucinations = 0; let offGroups = 0; let flickerGroups = 0;
const placementSamples = [];

for (let sampleX = -50; sampleX < 50; sampleX += 1) for (let sampleZ = -50; sampleZ < 50; sampleZ += 1) {
  const x = sampleX * 8; const z = sampleZ * 8; const generationStart = performance.now();
  const entry = generateCell(generationOptions(x, z)); generationElapsed += performance.now() - generationStart;
  cells += 1; walls += entry.walls.length; props += entry.props.length; holes += entry.floorPatches.length; lightGroups += entry.lightGroups.length;
  const fixtureCount = entry.lightGroups.reduce((sum, group) => sum + group.fixtures.length, 0);
  fixtures += fixtureCount; maxWalls = Math.max(maxWalls, entry.walls.length); maxProps = Math.max(maxProps, entry.props.length); maxFixtures = Math.max(maxFixtures, fixtureCount);
  if (entry.stability === 'disorienting') disorienting += 1; if (entry.hallucinationAnchor) hallucinations += 1;
  for (const group of entry.lightGroups) { if (group.state === 'off') offGroups += 1; if (group.state === 'flicker') flickerGroups += 1; }
  const validationStart = performance.now();
  for (const error of validateCellPlacement(entry)) if (placementSamples.length < 20) placementSamples.push(`${entry.id}: ${error}`);
  validationElapsed += performance.now() - validationStart;
}

const topology = ['coherence-a', 'coherence-b', 'coherence-c', 'coherence-d'].map((seed) => sampleSpaceTopology({
  seed, worldX: 0, worldZ: 0, worldDay: 40, exposure: 10, tuning: clean('ordinary-level-0'), radiusParcels: 12
}));

const ordinaryNavigation = [];
for (const [seed, centerX, centerZ] of [['nav-a', 0, 0], ['nav-b', 12, -7], ['nav-c', -20, 13], ['nav-d', 31, 24]]) {
  const navCells = [];
  for (let x = centerX - 7; x <= centerX + 7; x += 1) for (let z = centerZ - 7; z <= centerZ + 7; z += 1) navCells.push(generateCell(generationOptions(x, z, clean('ordinary-level-0'), seed)));
  ordinaryNavigation.push(analyzeNavigation(navCells, { startWorld: { x: centerX * CELL_SIZE, z: centerZ * CELL_SIZE }, step: 0.7, playerRadius: 0.42 }));
}

const pillarBins = [{ min: 0, max: 0.25, samples: [] }, { min: 0.25, max: 0.5, samples: [] }, { min: 0.5, max: 0.75, samples: [] }, { min: 0.75, max: 1.001, samples: [] }];
for (let seedIndex = 0; seedIndex < 60 && pillarBins.some((bin) => bin.samples.length < 18); seedIndex += 1) {
  const seed = `dev5-depth-${seedIndex}`;
  for (let x = -1500; x <= 1500 && pillarBins.some((bin) => bin.samples.length < 18); x += 43) for (let z = -1500; z <= 1500; z += 47) {
    const influence = sampleGen3RegionInfluence(seed, x * CELL_SIZE, z * CELL_SIZE, 40, 10, { ...DEFAULT_TUNING, gateBypass: true });
    if (influence.pillar < 0.12 || influence.arch > 0.28) continue;
    const bin = pillarBins.find((candidate) => influence.pillarDepth >= candidate.min && influence.pillarDepth < candidate.max && candidate.samples.length < 18); if (!bin) continue;
    const entry = generateCell(generationOptions(x, z, { ...DEFAULT_TUNING, conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none', gateBypass: true }, seed));
    bin.samples.push({ walls: entry.walls.length, columns: entry.props.filter((prop) => prop.kind === 'column').length });
  }
}
const pillarMeans = pillarBins.map((bin) => ({ samples: bin.samples.length, walls: bin.samples.reduce((sum, sample) => sum + sample.walls, 0) / Math.max(1, bin.samples.length), columns: bin.samples.reduce((sum, sample) => sum + sample.columns, 0) / Math.max(1, bin.samples.length) }));

const commonPillarCells = [];
for (let x = -20; x <= 20; x += 1) for (let z = -20; z <= 20; z += 1) commonPillarCells.push(generateCell(generationOptions(x, z, clean('pillar-field'), 'benchmark-common-pillar')));
const commonPillarWalls = commonPillarCells.reduce((sum, entry) => sum + entry.walls.length, 0) / commonPillarCells.length;
const commonPillarColumns = commonPillarCells.reduce((sum, entry) => sum + entry.props.filter((prop) => prop.kind === 'column').length, 0) / commonPillarCells.length;
const pillarWidths = commonPillarCells.flatMap((entry) => entry.props.filter((prop) => prop.kind === 'column').map((prop) => prop.scale.x));
// P-A1 room-interior offset removes wall splits that were caused only by pillar/boundary overlap.
// This proxy counts clipped wall fragments, not topology walls, so keep a narrow corrected floor
// while the unchanged topology/navigation and depth-progression guards remain authoritative.
const commonPillarWallFragmentFloor = 3.8;

let archDividerSamples = 0; let routeDividers = 0; let minArchRoute = Infinity; const archBayWidths = new Set();
for (const axis of ['x', 'z']) for (let lineIndex = -24; lineIndex <= 24; lineIndex += 1) for (let groupIndex = -36; groupIndex <= 36; groupIndex += 1) {
  const options = { seed: 'benchmark-arch-rarity', axis, lineIndex, groupIndex, worldDay: 40, exposure: 10, tuning: clean('arch-rooms') };
  const spec = gen3ArchDividerDiagnostic(options); if (!spec) continue; const silhouette = gen3ArchSilhouetteDiagnostic(options);
  archDividerSamples += 1; archBayWidths.add(spec.bayWidth.toFixed(3));
  if (silhouette?.routeBayCount) { routeDividers += 1; minArchRoute = Math.min(minArchRoute, silhouette.minimumRouteWidth); }
}

const blackout = generateCell(generationOptions(0, 0, { ...DEFAULT_TUNING, conditionOverride: 'blackout', structureOverride: 'none' }));
const holeCells = [];
for (let x = -3; x <= 3; x += 1) for (let z = -3; z <= 3; z += 1) holeCells.push(generateCell(generationOptions(x, z, { ...DEFAULT_TUNING, regionOverride: 'ordinary-level-0', carverOverride: 'floor-hole-cluster', structureOverride: 'none' })));
const forcedHoles = holeCells.flatMap((entry) => entry.floorPatches.map((patch) => ({ x: entry.address.cellX * CELL_SIZE + patch.position.x, z: entry.address.cellZ * CELL_SIZE + patch.position.z, sx: patch.scale.x, sz: patch.scale.z })));
let holeOverlaps = 0;
for (let left = 0; left < forcedHoles.length; left += 1) for (let right = left + 1; right < forcedHoles.length; right += 1) { const a = forcedHoles[left]; const b = forcedHoles[right]; if (Math.abs(a.x - b.x) < (a.sx + b.sx) / 2 && Math.abs(a.z - b.z) < (a.sz + b.sz) / 2) holeOverlaps += 1; }
const west = sampleWorldGeography('boundary-benchmark', 6.999, 91.25); const east = sampleWorldGeography('boundary-benchmark', 7.001, 91.25);
const geographyBoundaryDelta = Math.max(...GEOGRAPHY_FIELD_NAMES.map((name) => Math.abs(west[name] - east[name])));
const generationUs = generationElapsed * 1000 / cells; const validationUs = validationElapsed * 1000 / cells;

const result = {
  generation: { cells, runtimeMicrosecondsPerCell: rounded(generationUs, 2), validationMicrosecondsPerCell: rounded(validationUs, 2), walls, props, holes, lightGroups, fixtures, maxWalls, maxProps, maxFixtures, placementErrors: placementSamples.length, placementSamples },
  topology: { oneEntryRate: rounded(mean(topology, 'oneEntryRate'), 4), tightSpaceRate: rounded(mean(topology, 'tightSpaceRate'), 4), smallOrTightRate: rounded(mean(topology, 'smallOrTightRate'), 4), hugeSpaceRate: rounded(mean(topology, 'hugeSpaceRate'), 4), crossJunctionRate: rounded(mean(topology, 'crossJunctionRate'), 4), tightPortalRate: rounded(mean(topology, 'tightPortalRate'), 4), optionalLoopRate: rounded(mean(topology, 'optionalLoopRate'), 4), forcedPathRatio: rounded(mean(topology, 'forcedPathRatio'), 4), sealedSpaces: topology.reduce((sum, sample) => sum + sample.sealedSpaceCount, 0), areaP50: rounded(mean(topology, 'areaP50'), 2), areaP90: rounded(mean(topology, 'areaP90'), 2) },
  navigation: { reachableAreaRatio: rounded(mean(ordinaryNavigation, 'reachableAreaRatio'), 4), isolatedAreaRatio: rounded(mean(ordinaryNavigation, 'isolatedAreaRatio'), 4), openAreaP50: rounded(mean(ordinaryNavigation, 'openAreaP50'), 2), openAreaP90: rounded(mean(ordinaryNavigation, 'openAreaP90'), 2), cellsCrossed: rounded(mean(ordinaryNavigation, 'cellsCrossed'), 2), allBoundaryReached: ordinaryNavigation.every((sample) => sample.boundaryReached) },
  pillar: { widthScale: PILLAR_WIDTH_SCALE, minWidth: PILLAR_MIN_WIDTH, maxWidth: PILLAR_MAX_WIDTH, commonWallsPerCell: rounded(commonPillarWalls), commonColumnsPerCell: rounded(commonPillarColumns), depthBins: pillarMeans.map((sample) => ({ samples: sample.samples, walls: rounded(sample.walls), columns: rounded(sample.columns) })) },
  arch: { dividerSamples: archDividerSamples, irregularChance: ARCH_IRREGULAR_CHANCE, distinctBayWidths: archBayWidths.size, routeDividers, minimumRouteWidth: Number.isFinite(minArchRoute) ? rounded(minArchRoute, 4) : 0 },
  normalFirst: { disorientingRate: rounded(disorienting / cells, 5), hallucinationRate: rounded(hallucinations / cells, 5), offGroupRate: rounded(lightGroups ? offGroups / lightGroups : 0, 5), flickerGroupRate: rounded(lightGroups ? flickerGroups / lightGroups : 0, 5) },
  blackout: { localLightGroups: blackout.lightGroups.length }, holeCarver: { patches: forcedHoles.length, overlaps: holeOverlaps }, geographyBoundaryDelta: Number(geographyBoundaryDelta.toFixed(9))
};
console.log(JSON.stringify(result, null, 2));

const topologyPass = topology.every((sample) => sample.sealedSpaceCount === 0 && sample.spaceCount >= 70 && sample.oneEntryRate >= 0.18 && sample.oneEntryRate <= 0.36 && sample.hugeSpaceRate <= 0.12 && sample.crossJunctionRate <= 0.06 && sample.tightPortalRate >= 0.12 && sample.tightPortalRate <= 0.30 && sample.forcedPathRatio >= 0.30 && sample.forcedPathRatio <= 0.50 && sample.areaP50 >= 50 && sample.areaP50 <= 130 && sample.areaP90 >= 130 && sample.areaP90 <= 260)
  && mean(topology, 'tightSpaceRate') >= 0.08 && mean(topology, 'smallOrTightRate') >= 0.30 && mean(topology, 'optionalLoopRate') >= 0.02 && mean(topology, 'optionalLoopRate') <= 0.12;
const navPass = ordinaryNavigation.every((sample) => sample.reachableAreaRatio >= 0.95 && sample.isolatedAreaRatio <= 0.05 && sample.boundaryReached && sample.cellsCrossed >= 12);
const pillarPass = pillarMeans.every((sample) => sample.samples >= 10) && pillarMeans.slice(1).every((sample, index) => sample.columns > pillarMeans[index].columns && sample.walls < pillarMeans[index].walls) && pillarMeans[0].columns < 1.1 && pillarMeans[3].columns >= 2.4 && pillarMeans[3].walls <= pillarMeans[0].walls * 0.55;

if (placementSamples.length || generationUs > 500 || maxWalls > 64 || maxProps > 8 || maxFixtures > 6 || !topologyPass || !navPass || !pillarPass
  || commonPillarWalls < commonPillarWallFragmentFloor || commonPillarWalls > 12 || commonPillarColumns < 0.7 || commonPillarColumns > 2.2
  || PILLAR_WIDTH_SCALE !== 0.9 || pillarWidths.some((width) => width < PILLAR_MIN_WIDTH - 1e-9 || width > PILLAR_MAX_WIDTH + 1e-9)
  || ARCH_IRREGULAR_CHANCE !== 0 || archDividerSamples < 1000 || archBayWidths.size < 8 || routeDividers < archDividerSamples * 0.8 || minArchRoute < 1.95
  || disorienting / cells >= 0.01 || hallucinations / cells >= 0.003 || (lightGroups && offGroups / lightGroups >= 0.005) || (lightGroups && flickerGroups / lightGroups >= 0.025)
  || blackout.lightGroups.length || forcedHoles.length < 30 || holeOverlaps || geographyBoundaryDelta >= 0.0001) process.exit(1);
