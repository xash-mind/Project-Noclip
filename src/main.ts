import './styles.css';
import { ProjectNoclipGame } from './app/ProjectNoclipGame.js';
import { installFinalLevel0MaterialPresentation } from './renderer/finalLevel0MaterialPresentation.js';
import { installLevel0SurfacePresentation } from './renderer/level0SurfacePresentation.js';
import { prepareOrdinaryWallpaperAssets } from './renderer/ordinaryWallpaperAssets.js';
import { installOrdinaryCasingMaterialPresentation } from './renderer/ordinaryCasingMaterialPresentation.js';
import { installOutletInteractionRuntime } from './renderer/outletInteractionRuntime.js';
import { installRenderSettingsRuntime } from './renderer/renderSettingsRuntime.js';
import { installPauFeaturePresentationPilot } from './renderer/pauFeaturePresentationPilot.js';
import { installStaticWorldBatching } from './renderer/StaticWorldBatching.js';
import { installRendererRuntimeDiagnostics } from './renderer/rendererRuntimeDiagnostics.js';
import { installVisibilityParticipationRuntime } from './renderer/visibility/runtime.js';
import { mountDevelopmentVersionIndicator } from './ui/DevelopmentVersionIndicator.js';
import { installRegionDepthLab } from './ui/regionDepthLab.js';
import { installRenderSettingsLab } from './ui/renderSettingsLab.js';

installLevel0SurfacePresentation();
installRenderSettingsRuntime();
installPauFeaturePresentationPilot();
installOrdinaryCasingMaterialPresentation();
installStaticWorldBatching();
installVisibilityParticipationRuntime();
// Region reconstruction happens inside StaticWorldBatching's installed lifecycle.
// This outer pass is the final material owner for renderer-created Arch/CV-H1 geometry.
installFinalLevel0MaterialPresentation();
installOutletInteractionRuntime();
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
