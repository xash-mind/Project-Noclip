import { defineConfig } from 'vite';

export default defineConfig({
  build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 1800 },
  server: { host: true }
});
