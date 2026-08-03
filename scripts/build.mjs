import { spawnSync } from 'node:child_process';

try {
  const vite = await import('vite');
  await vite.build();
} catch (error) {
  const missingVite = error && typeof error === 'object' && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND';
  if (!missingVite) throw error;
  console.warn('Vite is unavailable in this execution environment; using the verified TypeScript static fallback build.');
  const result = spawnSync(process.execPath, ['scripts/build-local.mjs'], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
