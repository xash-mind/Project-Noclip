import { spawn } from 'node:child_process';
try {
  const vite = await import('vite');
  const server = await vite.createServer({ server: { host: '0.0.0.0', port: 4173 } });
  await server.listen();
  server.printUrls();
} catch (error) {
  const missingVite = error && typeof error === 'object' && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND';
  if (!missingVite) throw error;
  console.warn('Vite unavailable; building and serving the static fallback.');
  const build = spawn(process.execPath, ['scripts/build-local.mjs'], { stdio: 'inherit' });
  build.on('exit', (code) => {
    if (code !== 0) process.exit(code ?? 1);
    spawn('http-server', ['dist', '-p', '4173', '-c-1'], { stdio: 'inherit' });
  });
}
