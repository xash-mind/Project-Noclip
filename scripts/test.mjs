import { readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

rmSync('.test-dist', { recursive: true, force: true });
const compile = spawnSync('tsc', ['-p', 'tsconfig.test.json'], { stdio: 'inherit' });
if (compile.status !== 0) process.exit(compile.status ?? 1);

const testFiles = readdirSync('tests')
  .filter((name) => name.endsWith('.test.mjs'))
  .sort()
  .map((name) => `tests/${name}`);

if (testFiles.length === 0) {
  console.error('No tests/*.test.mjs files found.');
  process.exit(1);
}

const test = spawnSync(process.execPath, ['--test', ...testFiles], { stdio: 'inherit' });
process.exit(test.status ?? 1);
