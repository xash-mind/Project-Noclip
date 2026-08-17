import { spawnSync } from 'node:child_process';

const files = [
  'tools/studio/runner.mjs',
  'tools/studio/canonical-cli.mjs',
  'tools/studio/canonical-client.mjs',
  'tools/studio/server-core.mjs',
  'tools/studio/server.mjs',
  'tools/studio/validate-target.mjs',
  'tools/studio/smoke.mjs',
  'tools/studio/client/studio.js',
  'scripts/build-presentation-definitions.mjs',
  'scripts/check-production-studio-boundary.mjs'
];
for (const file of files) {
  const check = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (check.status !== 0) process.exit(check.status ?? 1);
}
const build = spawnSync(process.execPath, ['scripts/build-presentation-definitions.mjs'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
const compile = spawnSync('npx', ['tsc', '-p', 'tsconfig.studio.json'], { stdio: 'inherit', shell: process.platform === 'win32' });
if (compile.status !== 0) process.exit(compile.status ?? 1);
const smoke = spawnSync(process.execPath, ['tools/studio/smoke.mjs'], { stdio: 'inherit' });
process.exit(smoke.status ?? 1);
