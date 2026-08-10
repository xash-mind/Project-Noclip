import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

rmSync('.test-dist', { recursive: true, force: true });
const compile = spawnSync('tsc', ['-p', 'tsconfig.test.json'], { stdio: 'inherit' });
if (compile.status !== 0) process.exit(compile.status ?? 1);

const { validateBaselineArchitecturePilot } = await import('../.test-dist/src/world/architecture.js');
const { generateCell, isEssentialSceneryProp, validateCellConnectivity, validateCellPlacement } = await import('../.test-dist/src/world/generator.js');
const { WORLD_FIELD_NAMES, sampleWorldFields } = await import('../.test-dist/src/world/fields.js');
const { DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');
const start = performance.now();
let walls = 0; let props = 0; let notes = 0; let loot = 0; let placementErrors = 0; let ordinaryCells = 0; let emptyOrdinaryCells = 0; let optionalSceneryProps = 0;
let lightGroups = 0; let lightFixtures = 0; let maxLightGroupsPerCell = 0; let maxLightFixturesPerCell = 0; let maxWallsPerCell = 0; let maxPropsPerCell = 0;
let gen3PilotCells = 0; let gen3PilotWalls = 0; let gen3PilotSupports = 0; let gen3PilotValidationErrors = 0; let gen3PilotLegacyModuleProps = 0; let gen3PilotValidationMs = 0;
const gen3PilotSignatures = new Set(); const gen3PilotValidationSamples = [];
const lightStates = { on: 0, off: 0, flicker: 0 }; const baselineLightStates = { on: 0, off: 0, flicker: 0 }; const placementSamples = [];
const archetypes = new Set(); const compositionSignatures = new Set(); const signaturesByZone = new Map(); const spatialProfiles = {}; const cells = 10000;

for (let x = -50; x < 50; x += 1) {
  for (let z = -50; z < 50; z += 1) {
    const cell = generateCell({ seed: 'benchmark-001', x, z, worldDay: 40, exposure: 10, shiftEpoch: 0, tuning: DEFAULT_TUNING });
    walls += cell.walls.length; props += cell.props.length; notes += cell.notes.length; loot += cell.lootNodes.filter((node) => node.spawnedDefinitionId).length;
    maxWallsPerCell = Math.max(maxWallsPerCell, cell.walls.length); maxPropsPerCell = Math.max(maxPropsPerCell, cell.props.length);
    const cellFixtures = cell.lightGroups.reduce((sum, group) => sum + group.fixtures.length, 0); lightGroups += cell.lightGroups.length; lightFixtures += cellFixtures;
    maxLightGroupsPerCell = Math.max(maxLightGroupsPerCell, cell.lightGroups.length); maxLightFixturesPerCell = Math.max(maxLightFixturesPerCell, cellFixtures);
    for (const group of cell.lightGroups) { lightStates[group.state] += 1; if (cell.address.zoneId === 'baseline' && cell.roomArchetype !== 'manila-room') baselineLightStates[group.state] += 1; }
    archetypes.add(cell.roomArchetype); compositionSignatures.add(cell.compositionSignature);
    const zoneSignatures = signaturesByZone.get(cell.address.zoneId) ?? new Set(); zoneSignatures.add(cell.compositionSignature); signaturesByZone.set(cell.address.zoneId, zoneSignatures);
    spatialProfiles[cell.spatialProfile] = (spatialProfiles[cell.spatialProfile] ?? 0) + 1;
    if (cell.roomArchetype !== 'manila-room' && cell.roomArchetype !== 'transition-foyer') { const optional = cell.props.filter((prop) => !isEssentialSceneryProp(cell.roomArchetype, prop)); ordinaryCells += 1; optionalSceneryProps += optional.length; if (optional.length === 0) emptyOrdinaryCells += 1; }

    if (cell.compositionSignature.startsWith('gen3-field-pilot:')) {
      gen3PilotCells += 1;
      gen3PilotSignatures.add(cell.compositionSignature);
      const internalWalls = cell.walls.filter((wall) => Math.abs(wall.cx) < 6.5 && Math.abs(wall.cz) < 6.5);
      gen3PilotWalls += internalWalls.length;
      gen3PilotSupports += cell.props.length;
      gen3PilotLegacyModuleProps += cell.props.filter((prop) => prop.kind !== 'column').length;
      const pilotValidationStart = performance.now();
      const errors = validateBaselineArchitecturePilot(internalWalls, cell.props);
      gen3PilotValidationMs += performance.now() - pilotValidationStart;
      gen3PilotValidationErrors += errors.length;
      if (gen3PilotValidationSamples.length < 10) for (const error of errors) {
        if (gen3PilotValidationSamples.length >= 10) break;
        gen3PilotValidationSamples.push(`${cell.address.worldSeed}@${cell.id}: ${error}`);
      }
    }

    const cellPlacementErrors = validateCellPlacement(cell); placementErrors += cellPlacementErrors.length;
    if (placementSamples.length < 10) for (const error of cellPlacementErrors) { if (placementSamples.length >= 10) break; placementSamples.push(`${cell.address.worldSeed}@${cell.id}: ${error}`); }
  }
}

const elapsedWithPilotValidation = performance.now() - start;
const elapsed = Math.max(0.001, elapsedWithPilotValidation - gen3PilotValidationMs);
const connectorErrors = validateCellConnectivity('benchmark-001', 28, DEFAULT_TUNING.extraOpeningChance);
const baselineLightTotal = baselineLightStates.on + baselineLightStates.off + baselineLightStates.flicker;
const signatureCountsByZone = Object.fromEntries([...signaturesByZone.entries()].map(([zone, signatures]) => [zone, signatures.size]));

const fieldRanges = Object.fromEntries(WORLD_FIELD_NAMES.map((name) => [name, { min: 1, max: 0 }]));
const fieldStart = performance.now();
for (let x = -50; x < 50; x += 1) {
  for (let z = -50; z < 50; z += 1) {
    const sample = sampleWorldFields('benchmark-001', x * 14, z * 14);
    for (const name of WORLD_FIELD_NAMES) {
      fieldRanges[name].min = Math.min(fieldRanges[name].min, sample[name]);
      fieldRanges[name].max = Math.max(fieldRanges[name].max, sample[name]);
    }
  }
}
const fieldElapsed = performance.now() - fieldStart;
const westBoundary = sampleWorldFields('benchmark-001', 6.999, 3.75);
const eastBoundary = sampleWorldFields('benchmark-001', 7.001, 3.75);
const fieldBoundaryMaxDelta = Math.max(...WORLD_FIELD_NAMES.map((name) => Math.abs(westBoundary[name] - eastBoundary[name])));
const narrowFieldRanges = WORLD_FIELD_NAMES.filter((name) => fieldRanges[name].max - fieldRanges[name].min < 0.15);

console.log(JSON.stringify({
  cells, walls, props, notes, loot, ordinaryCells, emptyOrdinaryCells, emptyOrdinaryRate: Number((emptyOrdinaryCells / Math.max(1, ordinaryCells)).toFixed(4)), optionalSceneryProps,
  compositionSignatures: compositionSignatures.size, signatureCountsByZone, spatialProfiles, maxWallsPerCell, maxPropsPerCell,
  lightGroups, lightFixtures, lightStates, baselineLightStates, baselineOffRate: Number((baselineLightStates.off / Math.max(1, baselineLightTotal)).toFixed(5)), maxLightGroupsPerCell, maxLightFixturesPerCell,
  archetypes: [...archetypes].sort(), connectorErrors: connectorErrors.length, placementErrors, placementSamples,
  gen3Pilot: {
    cells: gen3PilotCells,
    signatures: gen3PilotSignatures.size,
    internalWalls: gen3PilotWalls,
    supports: gen3PilotSupports,
    legacyModuleProps: gen3PilotLegacyModuleProps,
    validationErrors: gen3PilotValidationErrors,
    validationSamples: gen3PilotValidationSamples,
    validationMs: Number(gen3PilotValidationMs.toFixed(2)),
    validationMicrosecondsPerPilot: Number((gen3PilotValidationMs * 1000 / Math.max(1, gen3PilotCells)).toFixed(2))
  },
  elapsedMs: Number(elapsed.toFixed(2)), microsecondsPerCell: Number((elapsed * 1000 / cells).toFixed(2)), cellsPerSecond: Number((cells / (elapsed / 1000)).toFixed(2)), heapMb: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
  fields: {
    samples: cells,
    geometry: 'euclidean',
    elapsedMs: Number(fieldElapsed.toFixed(2)),
    microsecondsPerSample: Number((fieldElapsed * 1000 / cells).toFixed(2)),
    boundaryMaxDelta: Number(fieldBoundaryMaxDelta.toFixed(8)),
    narrowRanges: narrowFieldRanges,
    ranges: Object.fromEntries(WORLD_FIELD_NAMES.map((name) => [name, { min: Number(fieldRanges[name].min.toFixed(4)), max: Number(fieldRanges[name].max.toFixed(4)), span: Number((fieldRanges[name].max - fieldRanges[name].min).toFixed(4)) }]))
  }
}, null, 2));

if (
  connectorErrors.length
  || placementErrors
  || baselineLightStates.off / Math.max(1, baselineLightTotal) >= 0.01
  || compositionSignatures.size < 100
  || fieldBoundaryMaxDelta >= 0.001
  || narrowFieldRanges.length
  || gen3PilotCells < 400
  || gen3PilotSignatures.size < 20
  || gen3PilotValidationErrors
  || gen3PilotLegacyModuleProps
) process.exit(1);
