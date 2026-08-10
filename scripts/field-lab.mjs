import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

rmSync('.test-dist', { recursive: true, force: true });
const compile = spawnSync('tsc', ['-p', 'tsconfig.test.json'], { stdio: 'inherit' });
if (compile.status !== 0) process.exit(compile.status ?? 1);

const { WORLD_FIELD_NAMES, formatFieldDiagnostics, sampleWorldFields } = await import('../.test-dist/src/world/fields.js');
const seed = process.argv[2] ?? 'threshold-001';
const worldX = Number(process.argv[3] ?? 0);
const worldZ = Number(process.argv[4] ?? 0);
const sample = sampleWorldFields(seed, worldX, worldZ);
const west = sampleWorldFields(seed, 6.999, worldZ);
const east = sampleWorldFields(seed, 7.001, worldZ);
const maxBoundaryDelta = Math.max(...WORLD_FIELD_NAMES.map((name) => Math.abs(west[name] - east[name])));

console.log(`Project Noclip Generation 3 Field Lab`);
console.log(`seed          ${seed}`);
console.log(`position      ${worldX.toFixed(3)}, ${worldZ.toFixed(3)} metres`);
for (const line of formatFieldDiagnostics(sample)) console.log(line);
console.log(`boundary Δ    ${maxBoundaryDelta.toExponential(3)} across x=7m ±0.001m`);
