import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

rmSync('.test-dist', { recursive: true, force: true });
let result = spawnSync('tsc', ['-p', 'tsconfig.test.json'], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
result = spawnSync(process.execPath, ['--test', 'tests/*.test.mjs'], { stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);
