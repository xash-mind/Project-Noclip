import './styles.css';
import { ProjectNoclipGame } from './app/ProjectNoclipGame.js';
import { installLevel0SurfacePresentation } from './renderer/level0SurfacePresentation.js';
import { prepareOrdinaryWallpaperAssets } from './renderer/ordinaryWallpaperAssets.js';
import { installOrdinaryCasingMaterialPresentation } from './renderer/ordinaryCasingMaterialPresentation.js';
import { installOrdinaryWallpaperPresentation } from './renderer/ordinaryWallpaperPresentation.js';
import { installOutletInteractionRuntime } from './renderer/outletInteractionRuntime.js';
import { installRenderSettingsRuntime } from './renderer/renderSettingsRuntime.js';
import { installPauFeaturePresentationPilot } from './renderer/pauFeaturePresentationPilot.js';
import { installStaticWorldBatching } from './renderer/StaticWorldBatching.js';
import { installRendererRuntimeDiagnostics } from './renderer/rendererRuntimeDiagnostics.js';
import { mountDevelopmentVersionIndicator } from './ui/DevelopmentVersionIndicator.js';
import { installRegionDepthLab } from './ui/regionDepthLab.js';
import { installRenderSettingsLab } from './ui/renderSettingsLab.js';

installLevel0SurfacePresentation();
installRenderSettingsRuntime();
installPauFeaturePresentationPilot();
// Supplied A/B/C wallpaper and the accepted casing finish are resolved before
// static batching sees a newly loaded Cell. A-A1 remains under the authoritative
// pale Arch presentation owner rather than being repainted by the wallpaper pass.
installOrdinaryWallpaperPresentation();
installOrdinaryCasingMaterialPresentation();
installStaticWorldBatching();
installOutletInteractionRuntime();
installRendererRuntimeDiagnostics();
mountDevelopmentVersionIndicator();

// Do not even construct the interactive title/game callbacks until A/B/C bytes
// resolve, hash-match and browser-decode. This makes preload a hard first-Cell gate.
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