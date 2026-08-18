try {
  const vite = await import('vite');
  const server = await vite.createServer({
    resolve: {
      // Vite resolves the package root through PlayCanvas' `development` export
      // (`playcanvas.dbg`) but legacy CameraFrame imports still point at the
      // release tree. Redirect those deep imports to the same debug tree so a
      // local dev page never mixes two PlayCanvas module graphs.
      alias: [
        {
          find: /^playcanvas\/build\/playcanvas\/src\//,
          replacement: 'playcanvas/build/playcanvas.dbg/src/'
        }
      ]
    },
    server: { host: true }
  });
  await server.listen();
  server.printUrls?.();
} catch {
  await import('./build-local.mjs');
  await import('./preview.mjs');
}
