import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

rmSync('.test-dist', { recursive: true, force: true });
const compile = spawnSync('tsc', ['-p', 'tsconfig.test.json'], { stdio: 'inherit' });
if (compile.status !== 0) process.exit(compile.status ?? 1);

const { generateCell, isEssentialSceneryProp, validateCellConnectivity, validateCellPlacement } = await import('../.test-dist/src/world/generator.js');
const { DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');
const start = performance.now();
let walls = 0;
let props = 0;
let notes = 0;
let loot = 0;
let placementErrors = 0;
let ordinaryCells = 0;
let emptyOrdinaryCells = 0;
let optionalSceneryProps = 0;
let lightGroups = 0;
let lightFixtures = 0;
let maxLightGroupsPerCell = 0;
let maxLightFixturesPerCell = 0;
const lightStates = { on: 0, off: 0, flicker: 0 };
const placementSamples = [];
const archetypes = new Set();
const cells = 10000;

for (let x = -50; x < 50; x += 1) {
  for (let z = -50; z < 50; z += 1) {
    const cell = generateCell({ seed: 'benchmark-001', x, z, worldDay: 40, exposure: 10, shiftEpoch: 0, tuning: DEFAULT_TUNING });
    walls += cell.walls.length;
    props += cell.props.length;
    notes += cell.notes.length;
    loot += cell.lootNodes.filter((node) => node.spawnedDefinitionId).length;
    const cellFixtures = cell.lightGroups.reduce((sum, group) => sum + group.fixtures.length, 0);
    lightGroups += cell.lightGroups.length;
    lightFixtures += cellFixtures;
    maxLightGroupsPerCell = Math.max(maxLightGroupsPerCell, cell.lightGroups.length);
    maxLightFixturesPerCell = Math.max(maxLightFixturesPerCell, cellFixtures);
    for (const group of cell.lightGroups) lightStates[group.state] += 1;
    archetypes.add(cell.roomArchetype);
    if (cell.roomArchetype !== 'manila-room' && cell.roomArchetype !== 'transition-foyer') {
      const optional = cell.props.filter((prop) => !isEssentialSceneryProp(cell.roomArchetype, prop));
      ordinaryCells += 1;
      optionalSceneryProps += optional.length;
      if (optional.length === 0) emptyOrdinaryCells += 1;
    }
    const cellPlacementErrors = validateCellPlacement(cell);
    placementErrors += cellPlacementErrors.length;
    if (placementSamples.length < 10) {
      for (const error of cellPlacementErrors) {
        if (placementSamples.length >= 10) break;
        placementSamples.push(`${cell.address.worldSeed}@${cell.id}: ${error}`);
      }
    }
  }
}

const elapsed = performance.now() - start;
const connectorErrors = validateCellConnectivity('benchmark-001', 28, DEFAULT_TUNING.extraOpeningChance);
console.log(JSON.stringify({
  cells,
  walls,
  props,
  notes,
  loot,
  ordinaryCells,
  emptyOrdinaryCells,
  emptyOrdinaryRate: Number((emptyOrdinaryCells / Math.max(1, ordinaryCells)).toFixed(4)),
  optionalSceneryProps,
  lightGroups,
  lightFixtures,
  lightStates,
  maxLightGroupsPerCell,
  maxLightFixturesPerCell,
  archetypes: [...archetypes].sort(),
  connectorErrors: connectorErrors.length,
  placementErrors,
  placementSamples,
  elapsedMs: Number(elapsed.toFixed(2)),
  microsecondsPerCell: Number((elapsed * 1000 / cells).toFixed(2)),
  cellsPerSecond: Number((cells / (elapsed / 1000)).toFixed(2)),
  heapMb: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2))
}, null, 2));

if (connectorErrors.length || placementErrors) process.exit(1);
