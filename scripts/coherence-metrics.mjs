import { analyzeNavigation } from './coherence-metrics-lib.mjs';

const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { DEFAULT_TUNING, CELL_SIZE } = await import('../.test-dist/src/world/types.js');

function generateWindow(seed, centerX, centerZ, radius, tuning) {
  const cells = [];
  for (let x = centerX - radius; x <= centerX + radius; x += 1) {
    for (let z = centerZ - radius; z <= centerZ + radius; z += 1) {
      cells.push(generateCell({
        seed,
        x,
        z,
        worldDay: 40,
        exposure: 10,
        shiftEpoch: 0,
        generationVersion: 'gen3-v1',
        tuning
      }));
    }
  }
  return cells;
}

function sampleScenario(label, seed, radius, tuning, centerX = 0, centerZ = 0) {
  const cells = generateWindow(seed, centerX, centerZ, radius, tuning);
  const navigation = analyzeNavigation(cells, {
    startWorld: { x: centerX * CELL_SIZE, z: centerZ * CELL_SIZE },
    step: 0.7,
    playerRadius: 0.42
  });
  const walls = cells.reduce((sum, cell) => sum + cell.walls.length, 0);
  const columns = cells.reduce((sum, cell) => sum + cell.props.filter((prop) => prop.kind === 'column').length, 0);
  return {
    label,
    seed,
    cellCount: cells.length,
    walls,
    wallsPerCell: Number((walls / cells.length).toFixed(3)),
    columns,
    columnsPerCell: Number((columns / cells.length).toFixed(3)),
    ...Object.fromEntries(Object.entries(navigation).map(([key, value]) => [key, typeof value === 'number' ? Number(value.toFixed(4)) : value]))
  };
}

const forced = (regionOverride) => ({
  ...DEFAULT_TUNING,
  regionOverride,
  conditionOverride: 'clear',
  carverOverride: 'none',
  structureOverride: 'none',
  gateBypass: true
});

const scenarios = [
  sampleScenario('spawn-default', 'threshold-001', 6, { ...DEFAULT_TUNING, gateBypass: true, conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none' }),
  ...['coherence-a', 'coherence-b', 'coherence-c', 'coherence-d'].map((seed) => sampleScenario(`ordinary-${seed}`, seed, 6, forced('ordinary-level-0'))),
  ...['pillar-a', 'pillar-b'].map((seed) => sampleScenario(`pillar-${seed}`, seed, 5, forced('pillar-field'))),
  ...['arch-a', 'arch-b'].map((seed) => sampleScenario(`arch-${seed}`, seed, 5, forced('arch-rooms')))
];

const ordinary = scenarios.filter((entry) => entry.label.startsWith('ordinary-'));
const mean = (key) => Number((ordinary.reduce((sum, entry) => sum + entry[key], 0) / ordinary.length).toFixed(4));
const summary = {
  ordinaryMean: {
    reachableAreaRatio: mean('reachableAreaRatio'),
    isolatedAreaRatio: mean('isolatedAreaRatio'),
    isolatedPockets: mean('isolatedPockets'),
    maxDeadEndDepth: mean('maxDeadEndDepth'),
    openAreaP50: mean('openAreaP50'),
    openAreaP90: mean('openAreaP90'),
    openAreaP99: mean('openAreaP99'),
    cellsCrossed: mean('cellsCrossed'),
    pathMeters: mean('pathMeters')
  },
  scenarios
};

console.log(JSON.stringify(summary, null, 2));
