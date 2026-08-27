import './styles.css';
import { ProjectNoclipGame } from './app/ProjectNoclipGame.js';
import { installFixtureLighting } from './renderer/fixtureLighting.js';
import { prepareOrdinaryWallpaperAssets } from './renderer/ordinaryWallpaperAssets.js';
import { initializeRenderSettingsRuntime } from './renderer/renderSettingsRuntime.js';
import { installPauFeaturePresentationPilot } from './renderer/pauFeaturePresentationPilot.js';
import { installRendererCellLifecycle } from './renderer/rendererCellLifecycle.js';
import { installStaticWorldBatching } from './renderer/StaticWorldBatching.js';
import { installRendererRuntimeDiagnostics } from './renderer/rendererRuntimeDiagnostics.js';
import { initializeRuntimePerformanceDiagnostics } from './renderer/runtimePerformance.js';
import { mountDevelopmentVersionIndicator } from './ui/DevelopmentVersionIndicator.js';
import { installRegionDepthLab } from './ui/regionDepthLab.js';
import { installRenderSettingsLab } from './ui/renderSettingsLab.js';

initializeRenderSettingsRuntime();
installPauFeaturePresentationPilot();
installFixtureLighting();
installStaticWorldBatching();
initializeRuntimePerformanceDiagnostics();
// Wave 1: one explicit owner defines streamed Cell load/unload ordering.
installRendererCellLifecycle();
installRendererRuntimeDiagnostics();
mountDevelopmentVersionIndicator();

void prepareOrdinaryWallpaperAssets().then(async () => {
  const game = new ProjectNoclipGame();
  installRegionDepthLab(game);
  installRenderSettingsLab(game);
  if (import.meta.env.DEV) {
    void Promise.all([
      import('./dev/studioBridgeClient.js'),
      import('./dev/worldLabStudioIntegration.js')
    ]).then(([bridge, worldLab]) => {
      bridge.installStudioBridgeClient(game);
      worldLab.installWorldLabStudioIntegration();
    }).catch((error) => console.warn('[Noclip Studio] local bridge unavailable', error));
  }
  await game.initialize();
  const params = new URLSearchParams(window.location.search);
  if (params.has('autostart')) (document.querySelector('[data-action="new"]') as HTMLButtonElement | null)?.click();
}).catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="fatal"><h1>LEVEL 0 FAILED TO RESOLVE</h1><p>${String(error instanceof Error ? error.message : error)}</p></main>`;
});
