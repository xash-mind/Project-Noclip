import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const projectVersion = readFileSync(new URL('./VERSION', import.meta.url), 'utf8').trim();

export default defineConfig({
  define: { 'globalThis.__PROJECT_VERSION__': JSON.stringify(projectVersion) },
  build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 1800 },
  server: { host: true }
});
