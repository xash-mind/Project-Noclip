import './styles.css';
import { ProjectNoclipGame } from './app/ProjectNoclipGame.js';
import { installFixtureLighting } from './renderer/fixtureLighting.js';
import { prepareOrdinaryWallpaperAssets } from './renderer/ordinaryWallpaperAssets.js';
import { initializeRenderSettingsRuntime } from './renderer/renderSettingsRuntime.js';
import { installStaticWorldBatching } from './renderer/StaticWorldBatching.js';
import { installRendererRuntimeDiagnostics } from './renderer/rendererRuntimeDiagnostics.js';
import { initializeRuntimePerformanceDiagnostics } from './renderer/runtimePerformance.js';
import { mountDevelopmentVersionIndicator } from './ui/DevelopmentVersionIndicator.js';
import { installRegionDepthLab } from './ui/regionDepthLab.js';

initializeRenderSettingsRuntime();
installFixtureLighting();
installStaticWorldBatching();
initializeRuntimePerformanceDiagnostics();
installRendererRuntimeDiagnostics();
mountDevelopmentVersionIndicator();

void prepareOrdinaryWallpaperAssets().then(async () => {
  const game = new ProjectNoclipGame();
  installRegionDepthLab(game);
  if (import.meta.env.DEV) {
    void Promise.all([
      import('./ui/renderSettingsLab.js'),
      import('./dev/studioBridgeClient.js'),
      import('./dev/worldLabStudioIntegration.js')
    ]).then(([renderLab, bridge, worldLab]) => {
      renderLab.installRenderSettingsLab(game);
      bridge.installStudioBridgeClient(game);
      worldLab.installWorldLabStudioIntegration();
    }).catch((error) => console.warn('[Noclip Studio] local DEV tooling unavailable', error));
  }
  await game.initialize();
  const params = new URLSearchParams(window.location.search);
  if (params.has('autostart')) (document.querySelector('[data-action="new"]') as HTMLButtonElement | null)?.click();
}).catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="fatal"><h1>LEVEL 0 FAILED TO RESOLVE</h1><p>${String(error instanceof Error ? error.message : error)}</p></main>`;
});