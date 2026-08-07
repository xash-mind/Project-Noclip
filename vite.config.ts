import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const version = readFileSync(new URL('./VERSION', import.meta.url), 'utf8').trim();

export default defineConfig({
  define: { __NOCLIP_VERSION__: JSON.stringify(version) },
  build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 1800 },
  server: { host: true }
});
