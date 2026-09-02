const {
  buildGen3VisibilityTopology,
  createVisibilitySnapshot,
  prepareVisibilityTopology
} = await import('../.test-dist/src/renderer/visibility/index.js');
const {
  createSafetyCoreCellIds,
  decideVisibilityParticipation
} = await import('../.test-dist/src/renderer/visibility/participation.js');
const { DEFAULT_TUNING, CELL_SIZE } = await import('../.test-dist/src/world/types.js');

const rounded = (value, digits = 3) => Number(value.toFixed(digits));
const cell = (id, x, z) => ({ id, x, z, bounds: { minX: x * 10, maxX: x * 10 + 10, minZ: z * 10, maxZ: z * 10 + 10 } });
const space = (id, x, z, cellIds) => ({ id, bounds: { minX: x * 10, maxX: x * 10 + 10, minZ: z * 10, maxZ: z * 10 + 10 }, cellIds });
const opening = (id, x, fromSpaceId, toSpaceId, z = 5) => ({
  id, wallId: `wall:${id}`, fromSpaceId, toSpaceId, kind: 'portal',
  segment: { start: { x, z: z - 1 }, end: { x, z: z + 1 } }, width: 2, mandatory: true, arch: false, conservative: false
});

function syntheticCorridor(count, connected = true) {
  const cells = []; const spaces = []; const openings = [];
  for (let index = 0; index < count; index += 1) {
    const id = `${index}:0`;
    cells.push(cell(id, index, 0));
    spaces.push(space(`S${index}`, index, 0, [id]));
    if (connected && index > 0) openings.push(opening(`P${index}`, index * 10, `S${index - 1}`, `S${index}`));
  }
  return prepareVisibilityTopology({ metadata: { source: 'participation-benchmark' }, cells, spaces, openings, conservativeReasons: [] });
}

function priorFrom(decision, timestamp) {
  return new Map(Object.entries(decision.stateByCell).map(([id, state]) => [id, { state, lastParticipatingAtMs: timestamp }]));
}

function measureScenario(name, topology, observer, safetyCore, iterations = 80) {
  const legacy = topology.cells.map((entry) => entry.id).sort();
  let snapshotMs = 0; let decisionMs = 0; let lastDecision; let lastSnapshot;
  let prior = new Map();
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const snapshotStart = performance.now();
    lastSnapshot = createVisibilitySnapshot(topology, { position: observer }, { maxDistance: 500, maxDepth: 32, maxFrontierStates: 4096, captureFrontier: false });
    snapshotMs += performance.now() - snapshotStart;
    const decisionStart = performance.now();
    lastDecision = decideVisibilityParticipation({
      legacyDistanceCells: legacy,
      visibilityCells: lastSnapshot.visibleCells,
      safetyCoreCells: safetyCore,
      predictiveCells: [],
      loadedCells: legacy,
      prior,
      nowMs: iteration * 1000,
      fallbackToLegacyDistance: false,
      hysteresisMs: 0
    });
    decisionMs += performance.now() - decisionStart;
    prior = priorFrom(lastDecision, iteration * 1000);
  }
  const finalWithinLegacy = lastDecision.finalParticipatingCells.filter((id) => legacy.includes(id)).length;
  return {
    name,
    legacyCandidateCells: legacy.length,
    visibilityCells: lastSnapshot.visibleCells.length,
    finalParticipatingCells: lastDecision.finalParticipatingCells.length,
    reductionPercent: rounded(100 * (1 - finalWithinLegacy / Math.max(1, legacy.length)), 2),
    snapshotMs: rounded(snapshotMs / iterations, 4),
    participationDecisionMs: rounded(decisionMs / iterations, 4),
    stateTransitionsPerUpdate: lastDecision.stateTransitions
  };
}

const scenarios = [];
const enclosed = syntheticCorridor(9, false);
scenarios.push(measureScenario('enclosed-ordinary', enclosed, { x: 5, z: 5 }, ['0:0']));
const hallway = syntheticCorridor(9, true);
scenarios.push(measureScenario('long-hallway', hallway, { x: 5, z: 5 }, ['0:0']));
scenarios.push(measureScenario('aligned-openings', syntheticCorridor(6, true), { x: 5, z: 5 }, ['0:0']));

const coordinates = [];
for (let x = -3; x <= 3; x += 1) for (let z = -3; z <= 3; z += 1) coordinates.push({ x, z });
const actualScenario = (name, regionOverride) => {
  const tuning = { ...DEFAULT_TUNING, regionOverride, conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none', gateBypass: true };
  const topology = buildGen3VisibilityTopology({ seed: `visibility-${name}`, worldDay: 40, exposure: 10, tuning, cells: coordinates });
  const legacy = new Set(topology.cells.map((entry) => entry.id));
  return measureScenario(name, topology, { x: 0, z: 0 }, createSafetyCoreCellIds(0, 0, legacy));
};
scenarios.push(actualScenario('pillar-field', 'pillar-field'));
scenarios.push(actualScenario('arch-rooms', 'arch-rooms'));

const traversalTuning = { ...DEFAULT_TUNING, regionOverride: 'ordinary-level-0', conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none', gateBypass: true };
const traversalTopology = buildGen3VisibilityTopology({ seed: 'visibility-fast-traversal', worldDay: 40, exposure: 10, tuning: traversalTuning, cells: coordinates });
const traversalLegacy = traversalTopology.cells.map((entry) => entry.id).sort();
let traversalSnapshotMs = 0; let traversalDecisionMs = 0; let traversalTransitions = 0; let traversalFinal = 0; let traversalVisible = 0; let prior = new Map();
const traversalPositions = [0, 5, 10, 14, 19, 24, 28, 24, 19, 14, 10, 5, 0];
for (let index = 0; index < traversalPositions.length; index += 1) {
  const x = traversalPositions[index];
  const snapshotStart = performance.now();
  const snapshot = createVisibilitySnapshot(traversalTopology, { position: { x, z: 0 } }, { maxDistance: 120, maxDepth: 32, maxFrontierStates: 4096, captureFrontier: false });
  traversalSnapshotMs += performance.now() - snapshotStart;
  const currentCellX = Math.round(x / CELL_SIZE);
  const decisionStart = performance.now();
  const result = decideVisibilityParticipation({
    legacyDistanceCells: traversalLegacy,
    visibilityCells: snapshot.visibleCells,
    safetyCoreCells: createSafetyCoreCellIds(currentCellX, 0, new Set(traversalLegacy)),
    predictiveCells: [], loadedCells: traversalLegacy, prior, nowMs: index * 100, fallbackToLegacyDistance: false
  });
  traversalDecisionMs += performance.now() - decisionStart;
  traversalTransitions += result.stateTransitions;
  traversalFinal += result.finalParticipatingCells.length;
  traversalVisible += snapshot.visibleCells.length;
  prior = priorFrom(result, index * 100);
}
scenarios.push({
  name: 'fast-traversal-reversal',
  legacyCandidateCells: traversalLegacy.length,
  visibilityCells: rounded(traversalVisible / traversalPositions.length, 2),
  finalParticipatingCells: rounded(traversalFinal / traversalPositions.length, 2),
  reductionPercent: rounded(100 * (1 - traversalFinal / traversalPositions.length / traversalLegacy.length), 2),
  snapshotMs: rounded(traversalSnapshotMs / traversalPositions.length, 4),
  participationDecisionMs: rounded(traversalDecisionMs / traversalPositions.length, 4),
  stateTransitionsPerUpdate: rounded(traversalTransitions / traversalPositions.length, 2)
});

const result = {
  model: 'legacy distance + all-direction topology + safety core + hysteresis + existing predictive retention + distance fallback',
  scenarios
};
console.log(JSON.stringify({ visibilityParticipation: result }, null, 2));

if (!scenarios.some((scenario) => scenario.reductionPercent > 0)) {
  console.error('Visibility participation benchmark found no representative renderer-participation reduction.');
  process.exit(1);
}
if (scenarios.some((scenario) => !Number.isFinite(scenario.snapshotMs) || !Number.isFinite(scenario.participationDecisionMs))) process.exit(1);
