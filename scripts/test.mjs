import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

rmSync('.test-dist', { recursive: true, force: true });
const compile = spawnSync('tsc', ['-p', 'tsconfig.test.json'], { stdio: 'inherit' });
if (compile.status !== 0) process.exit(compile.status ?? 1);

const test = spawnSync(process.execPath, [
  '--test',
  'tests/core.test.mjs',
  'tests/audio-lifecycle.test.mjs',
  'tests/audio-light-field.test.mjs',
  'tests/light-field.test.mjs',
  'tests/fields.test.mjs',
  'tests/generation-3.test.mjs',
  'tests/dev5-morphology-navigation.test.mjs',
  'tests/dev5-pillar-arch.test.mjs',
  'tests/dev5-fidelity-regressions.test.mjs',
  'tests/terminology.test.mjs'
], { stdio: 'inherit' });
process.exit(test.status ?? 1);
