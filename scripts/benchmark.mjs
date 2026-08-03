import { rmSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

if (!readFileSync('package.json', 'utf8').includes('project-noclip')) throw new Error('Run benchmark from the Project Noclip root.');
rmSync('.benchmark-dist', { recursive: true, force: true });
const compiled = spawnSync('tsc', ['-p', 'tsconfig.test.json', '--outDir', '.benchmark-dist'], { stdio: 'inherit' });
if (compiled.status !== 0) process.exit(compiled.status ?? 1);
const { generateCell, validateCellConnectivity } = await import('../.benchmark-dist/src/world/generator.js');
const { DEFAULT_TUNING } = await import('../.benchmark-dist/src/world/types.js');
const started = performance.now();
let walls = 0;
let spawnedLoot = 0;
for (let x = -50; x < 50; x += 1) {
  for (let z = -50; z < 50; z += 1) {
    const cell = generateCell({ seed: 'threshold-stress', x, z, worldDay: 30, exposure: 6, shiftEpoch: 0, tuning: DEFAULT_TUNING });
    walls += cell.walls.length;
    spawnedLoot += cell.lootNodes.filter((node) => node.spawnedDefinitionId).length;
  }
}
const totalMs = performance.now() - started;
const result = {
  cells: 10_000,
  walls,
  spawnedLoot,
  totalMs: Number(totalMs.toFixed(2)),
  microsecondsPerCell: Number((totalMs * 1000 / 10_000).toFixed(2)),
  connectivityErrors: validateCellConnectivity('threshold-stress', 30, DEFAULT_TUNING.extraOpeningChance).length,
  heapUsedMb: Number((process.memoryUsage().heapUsed / 1_048_576).toFixed(2))
};
console.log(JSON.stringify(result, null, 2));
if (result.connectivityErrors !== 0 || result.totalMs > 3000) process.exit(1);
