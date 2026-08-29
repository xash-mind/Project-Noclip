import type { ProjectNoclipGame } from '../app/ProjectNoclipGame.js';
import { ordinaryWallpaperPresentationDiagnostics } from '../renderer/level0WallpaperPresentation.js';
import {
  applyRenderPreset,
  getRenderSettings,
  onRenderSettingsChanged,
  patchRenderSettings,
  renderDistanceProfile,
  SHADOW_QUALITY_RESOLUTION,
  type FogBehavior,
  type PostProcessingQuality,
  type RenderDistanceLevel,
  type RenderPreset,
  type ShadowQuality,
  type ShadowResolution
} from '../renderer/renderSettings.js';
import { applyRenderSettingsToGame, renderSettingsDiagnostics } from '../renderer/renderSettingsRuntime.js';
import './render-settings.css';

export interface RenderSettingsQaBridge {
  get(): ReturnType<typeof getRenderSettings>;
  preset(preset: Exclude<RenderPreset, 'custom'>): ReturnType<typeof getRenderSettings>;
  patch(patch: Parameters<typeof patchRenderSettings>[0]): ReturnType<typeof getRenderSettings>;
  diagnostics(): ReturnType<typeof renderSettingsDiagnostics>;
}

declare global {
  interface Window {
    __projectNoclipRenderSettings?: RenderSettingsQaBridge;
  }
}

function option(value: string, label: string): string {
  return `<option value="${value}">${label}</option>`;
}

export function installRenderSettingsLab(game: ProjectNoclipGame): void {
  const lab = document.querySelector<HTMLElement>('[data-ui="lab"]');
  if (!lab || lab.querySelector('[data-lab-panel="render-settings"]')) return;

  const heading = lab.querySelector('h2');
  const tabs = document.createElement('nav');
  tabs.className = 'lab-tabs';
  tabs.setAttribute('aria-label', 'World Lab sections');
  tabs.innerHTML = `
    <button type="button" class="active" data-render-tab="world" aria-pressed="true">WORLD LAB</button>
    <button type="button" data-render-tab="render" aria-pressed="false">RENDER SETTINGS</button>`;
  heading?.insertAdjacentElement('afterend', tabs);

  const legacyRadius = lab.querySelector<HTMLInputElement>('[data-lab="radius"]');
  const legacyRadiusLabel = legacyRadius?.closest('label');
  if (legacyRadius && legacyRadiusLabel) {
    legacyRadius.disabled = true;
    legacyRadiusLabel.hidden = true;
    const qaRadiusToDistance: Record<string, RenderDistanceLevel> = {
      '1': 'low',
      '2': 'medium',
      '3': 'high',
      '4': 'ultra'
    };
    legacyRadius.addEventListener('change', () => {
      const renderDistance = qaRadiusToDistance[legacyRadius.value];
      if (renderDistance) patchRenderSettings({ renderDistance });
    });
  }

  const worldSections = [...lab.querySelectorAll<HTMLElement>(':scope > .lab-section, :scope > .metrics')];
  const panel = document.createElement('section');
  panel.className = 'lab-section render-settings-panel';
  panel.dataset.labPanel = 'render-settings';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="lab-section-heading"><h3>Render Settings</h3><span>presentation only / local device</span></div>
    <p class="lab-copy">Presets are bundles over one renderer. Render Distance changes streamed participation; Shadow Quality changes every active M-F1 shadow together; Render Scale changes pixel cost; Post Processing changes optional final-image work.</p>
    <div class="render-settings-grid">
      <label class="full">Preset
        <select data-render-setting="preset">
          ${option('low', 'Low')}${option('medium', 'Medium')}${option('high', 'High')}${option('ultra', 'Ultra')}${option('custom', 'Custom')}
        </select>
      </label>
      <label>Render Distance
        <select data-render-setting="distance">
          ${option('low', 'Low · 1 Cell')}${option('medium', 'Medium · 2 Cells')}${option('high', 'High · 3 Cells')}${option('ultra', 'Ultra · 4 Cells')}
        </select>
      </label>
      <label>Shadow Quality
        <select data-render-setting="shadow-quality">
          ${option('low', 'Low')}${option('medium', 'Medium')}${option('high', 'High')}${option('ultra', 'Ultra')}
        </select>
      </label>
      <label>Shadow Resolution
        <select data-render-setting="shadow-resolution">
          ${option('256', '256')}${option('512', '512')}${option('1024', '1024')}
        </select>
      </label>
      <label>Render Scale
        <select data-render-setting="render-scale">
          ${option('0.5', '50%')}${option('0.67', '67%')}${option('0.75', '75%')}${option('1', '100%')}
        </select>
      </label>
      <label>Post Processing
        <select data-render-setting="post-processing">
          ${option('off', 'Off')}${option('low', 'Low')}${option('full', 'Full')}
        </select>
      </label>
      <label>Fog linkage / visibility
        <select data-render-setting="fog">
          ${option('linked', 'Linked to Render Distance')}${option('stronger', 'Linked · Stronger haze')}
        </select>
      </label>
    </div>
    <p class="render-settings-note">Fog cannot be disabled independently: it remains tied to the real Cell boundary so geometry and fixture streaming stay concealed. Shadow count is never reduced independently of M-F1 light count.</p>
    <pre class="metrics render-diagnostics" data-ui="render-diagnostics"></pre>`;
  lab.appendChild(panel);

  const preset = panel.querySelector<HTMLSelectElement>('[data-render-setting="preset"]')!;
  const distance = panel.querySelector<HTMLSelectElement>('[data-render-setting="distance"]')!;
  const shadowQuality = panel.querySelector<HTMLSelectElement>('[data-render-setting="shadow-quality"]')!;
  const shadowResolution = panel.querySelector<HTMLSelectElement>('[data-render-setting="shadow-resolution"]')!;
  const renderScale = panel.querySelector<HTMLSelectElement>('[data-render-setting="render-scale"]')!;
  const postProcessing = panel.querySelector<HTMLSelectElement>('[data-render-setting="post-processing"]')!;
  const fog = panel.querySelector<HTMLSelectElement>('[data-render-setting="fog"]')!;
  const diagnostics = panel.querySelector<HTMLElement>('[data-ui="render-diagnostics"]')!;

  const syncControls = (): void => {
    const settings = getRenderSettings();
    preset.value = settings.preset;
    distance.value = settings.renderDistance;
    shadowQuality.value = settings.shadowQuality;
    shadowResolution.value = String(settings.shadowResolution);
    renderScale.value = String(settings.renderScale);
    postProcessing.value = settings.postProcessing;
    fog.value = settings.fogBehavior;
  };

  const refreshDiagnostics = (): void => {
    const settings = getRenderSettings();
    const profile = renderDistanceProfile(settings);
    const runtime = renderSettingsDiagnostics(game);
    const wallpaper = ordinaryWallpaperPresentationDiagnostics();
    const wallpaperLines = (['A', 'B', 'C'] as const).map((family) => {
      const asset = wallpaper.assets.assets[family];
      const status = asset.ready ? 'READY' : 'NOT READY';
      const dimensions = asset.decoded ? `${asset.width}×${asset.height}` : 'not decoded';
      return `Wallpaper ${family}: ${status} · ${dimensions} · ${asset.runtimePath ?? 'no runtime path'}`;
    });
    diagnostics.textContent = [
      `Preset: ${settings.preset[0]!.toUpperCase()}${settings.preset.slice(1)}`,
      `Render Distance: ${settings.renderDistance} · ${profile.loadRadius} Cell radius · ~${profile.approximateRenderDistanceMeters} m`,
      `Loaded Cells: ${runtime.retainedCells} retained · ${runtime.activeCells} active`,
      `Active M-F1 Omnis: ${runtime.activeOmnis}`,
      `Shadowed M-F1 Omnis: ${runtime.shadowedOmnis}`,
      `Shadow Resolution: ${settings.shadowResolution}`,
      `Render Scale: ${Math.round(settings.renderScale * 100)}%`,
      `Fog: ${runtime.fogStart?.toFixed(1) ?? profile.fogStart.toFixed(1)} m → ${runtime.fogEnd?.toFixed(1) ?? profile.fogEnd.toFixed(1)} m`,
      ...(runtime.drawCalls === undefined ? [] : [`Draw Calls: ${runtime.drawCalls}`]),
      '',
      ...wallpaperLines,
      `Wallpaper fallback: ${wallpaper.assets.fallbackUsed}`,
      `Ordinary wallpaper surfaces: A ${wallpaper.wallA} · B ${wallpaper.wallB} · split C ${wallpaper.splitC}`,
      `Wallpaper scale: ${wallpaper.worldScaleMeters.toFixed(2)} m/image`,
      `Casing runs: ${wallpaper.casingRuns} · Outlets: ${wallpaper.outlets}`
    ].join('\n');
  };

  preset.addEventListener('change', () => {
    if (preset.value !== 'custom') applyRenderPreset(preset.value as Exclude<RenderPreset, 'custom'>);
  });
  distance.addEventListener('change', () => patchRenderSettings({ renderDistance: distance.value as RenderDistanceLevel }));
  shadowQuality.addEventListener('change', () => {
    const quality = shadowQuality.value as ShadowQuality;
    patchRenderSettings({ shadowQuality: quality, shadowResolution: SHADOW_QUALITY_RESOLUTION[quality] });
  });
  shadowResolution.addEventListener('change', () => patchRenderSettings({ shadowResolution: Number(shadowResolution.value) as ShadowResolution }));
  renderScale.addEventListener('change', () => patchRenderSettings({ renderScale: Number(renderScale.value) }));
  postProcessing.addEventListener('change', () => patchRenderSettings({ postProcessing: postProcessing.value as PostProcessingQuality }));
  fog.addEventListener('change', () => patchRenderSettings({ fogBehavior: fog.value as FogBehavior }));

  const selectTab = (selected: 'world' | 'render'): void => {
    const renderOpen = selected === 'render';
    for (const section of worldSections) section.hidden = renderOpen;
    panel.hidden = !renderOpen;
    for (const button of tabs.querySelectorAll<HTMLButtonElement>('[data-render-tab]')) {
      const active = button.dataset.renderTab === selected;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    refreshDiagnostics();
  };
  tabs.querySelector<HTMLButtonElement>('[data-render-tab="world"]')?.addEventListener('click', () => selectTab('world'));
  tabs.querySelector<HTMLButtonElement>('[data-render-tab="render"]')?.addEventListener('click', () => selectTab('render'));

  onRenderSettingsChanged((settings) => {
    applyRenderSettingsToGame(game, settings);
    syncControls();
    refreshDiagnostics();
  });

  window.__projectNoclipRenderSettings = {
    get: () => getRenderSettings(),
    preset: (value) => applyRenderPreset(value),
    patch: (value) => patchRenderSettings(value),
    diagnostics: () => renderSettingsDiagnostics(game)
  };

  syncControls();
  applyRenderSettingsToGame(game);
  refreshDiagnostics();
  window.setInterval(() => {
    if (!panel.hidden) refreshDiagnostics();
  }, 250);
}
