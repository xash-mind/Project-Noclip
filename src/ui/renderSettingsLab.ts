import type { ProjectNoclipGame } from '../app/ProjectNoclipGame.js';
import {
  fixtureLightingQaOverridesSnapshot,
  resetFixtureLightingQaOverrides,
  setFixtureLightingQaOverrides,
  type FixtureLightingQaOverrides
} from '../renderer/fixtureLighting.js';
import {
  getRenderSettings,
  onRenderSettingsChanged,
  renderDistanceProfile,
  setTransientRenderSettings,
  settingsForPreset,
  withCustomRenderSettings,
  type FogBehavior,
  type PostProcessingQuality,
  type RenderDistanceLevel,
  type RenderPreset,
  type ShadowResolution
} from '../renderer/renderSettings.js';
import { applyRenderSettingsToGame, renderSettingsDiagnostics } from '../renderer/renderSettingsRuntime.js';
import './render-settings.css';

export interface RenderSettingsQaBridge {
  get(): ReturnType<typeof getRenderSettings>;
  preset(preset: Exclude<RenderPreset, 'custom'>): ReturnType<typeof getRenderSettings>;
  patch(patch: Parameters<typeof withCustomRenderSettings>[1]): ReturnType<typeof getRenderSettings>;
  lighting(patch: FixtureLightingQaOverrides): FixtureLightingQaOverrides;
  resetRender(): ReturnType<typeof getRenderSettings>;
  resetLighting(): FixtureLightingQaOverrides;
  diagnostics(): ReturnType<typeof renderSettingsDiagnostics>;
  enterLive(): boolean;
  exitLive(): boolean;
  live(): boolean;
}

declare global {
  interface Window {
    __projectNoclipRenderSettings?: RenderSettingsQaBridge;
  }
}

function option(value: string, label: string): string {
  return `<option value="${value}">${label}</option>`;
}

function labelPreset(value: RenderPreset): string {
  return `${value[0]!.toUpperCase()}${value.slice(1)}`;
}

function cycleSelect(select: HTMLSelectElement, values: readonly string[]): void {
  const index = Math.max(0, values.indexOf(select.value));
  select.value = values[(index + 1) % values.length]!;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

export function installRenderSettingsLab(game: ProjectNoclipGame): void {
  const lab = document.querySelector<HTMLElement>('[data-ui="lab"]');
  const uiRoot = document.querySelector<HTMLElement>('#ui-root');
  if (!lab || !uiRoot || lab.querySelector('[data-lab-panel="render-settings"]')) return;

  // The baseline is the device-local canonical renderer setting at runtime-QA
  // installation time. All controls below are transient overlays and reset to
  // this value without writing Journey state or localStorage.
  const canonicalSettings = getRenderSettings();

  const heading = lab.querySelector('h2');
  const tabs = document.createElement('nav');
  tabs.className = 'lab-tabs';
  tabs.setAttribute('aria-label', 'World Lab sections');
  tabs.innerHTML = `
    <button type="button" class="active" data-render-tab="world" aria-pressed="true">WORLD LAB</button>
    <button type="button" data-render-tab="render" aria-pressed="false">PERFORMANCE LAB</button>`;
  heading?.insertAdjacentElement('afterend', tabs);

  const legacyRadius = lab.querySelector<HTMLInputElement>('[data-lab="radius"]');
  const legacyRadiusLabel = legacyRadius?.closest('label');
  if (legacyRadius && legacyRadiusLabel) {
    legacyRadius.disabled = true;
    legacyRadiusLabel.hidden = true;
  }

  const worldSections = [...lab.querySelectorAll<HTMLElement>(':scope > .lab-section, :scope > .metrics')];
  const panel = document.createElement('section');
  panel.className = 'lab-section render-settings-panel';
  panel.dataset.labPanel = 'render-settings';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="lab-section-heading"><h3>Runtime graphics / performance</h3><span>runtime QA · ephemeral</span></div>
    <p class="lab-copy render-settings-intro">These controls experiment with presentation and M-F1 runtime participation only. They do not change world generation, fixture identity, Blackout truth, Journey saves, or the device's canonical renderer settings.</p>
    <div class="render-settings-grid">
      <label class="full">Preset / Custom
        <select data-render-setting="preset">
          ${option('low', 'Low')}${option('medium', 'Medium')}${option('high', 'High')}${option('ultra', 'Ultra')}${option('custom', 'Custom')}
        </select>
      </label>
      <label>Render Distance
        <select data-render-setting="distance">
          ${option('low', 'Low · 1 Cell')}${option('medium', 'Medium · 2 Cells')}${option('high', 'High · 3 Cells')}${option('ultra', 'Ultra · 4 Cells')}
        </select>
      </label>
      <label>Render Scale
        <select data-render-setting="render-scale">
          ${option('0.5', '50%')}${option('0.67', '67%')}${option('0.75', '75%')}${option('1', '100%')}
        </select>
      </label>
      <label>Shadow Resolution
        <select data-render-setting="shadow-resolution">
          ${option('256', '256')}${option('512', '512')}${option('1024', '1024')}
        </select>
      </label>
      <label>Post Processing
        <select data-render-setting="post-processing">
          ${option('off', 'Off')}${option('low', 'Low')}${option('full', 'Full')}
        </select>
      </label>
      <label>Max active M-F1 Omnis
        <select data-render-setting="active-lights">
          ${option('', 'Canonical from Render Distance')}${option('32', '32')}${option('64', '64')}${option('96', '96')}${option('128', '128')}
        </select>
      </label>
      <label>Max shadow-casting M-F1 Omnis
        <select data-render-setting="shadow-lights">
          ${option('', 'Canonical · 1:1 with active')}${option('0', '0')}${option('16', '16')}${option('32', '32')}${option('48', '48')}${option('64', '64')}${option('96', '96')}${option('128', '128')}
        </select>
      </label>
      <label>Fog start diagnostic
        <select data-render-setting="fog">
          ${option('linked', 'Canonical linkage')}${option('stronger', 'Earlier / stronger haze')}
        </select>
      </label>
      <button type="button" data-action="reset-render-experiment">Reset canonical render settings</button>
      <button type="button" data-action="reset-lighting-experiment">Reset lighting experiment</button>
      <button type="button" class="full live-performance-enter" data-action="enter-live-performance">Enter Live Performance Test</button>
    </div>
    <p class="render-settings-note">Render Distance remains whole-Cell based. Fog owns atmosphere; streaming owns residency; visibility owns participation. If streamed coverage ever falls behind the requested envelope, the existing fog path clamps before the nearest unguaranteed Cell rather than revealing void.</p>
    <pre class="metrics render-diagnostics" data-ui="render-diagnostics"></pre>`;
  lab.appendChild(panel);
  const panelAnchor = document.createComment('render-performance-panel-home');
  panel.before(panelAnchor);

  const liveOverlay = document.createElement('aside');
  liveOverlay.className = 'render-live-overlay ui-panel';
  liveOverlay.dataset.ui = 'render-live-overlay';
  liveOverlay.hidden = true;
  liveOverlay.innerHTML = `
    <div class="render-live-header">
      <div><strong>LIVE PERFORMANCE TEST</strong><small>World Lab QA · gameplay active</small></div>
      <button type="button" data-action="exit-live-performance">Exit Live Test</button>
    </div>
    <p class="render-live-shortcuts">Desktop while pointer-locked: 1–4 distance · L active lights · K shadows · R render scale · H shadow resolution · P post · \` exit. WASD / Shift / mouse remain gameplay.</p>`;
  uiRoot.appendChild(liveOverlay);

  const preset = panel.querySelector<HTMLSelectElement>('[data-render-setting="preset"]')!;
  const distance = panel.querySelector<HTMLSelectElement>('[data-render-setting="distance"]')!;
  const shadowResolution = panel.querySelector<HTMLSelectElement>('[data-render-setting="shadow-resolution"]')!;
  const renderScale = panel.querySelector<HTMLSelectElement>('[data-render-setting="render-scale"]')!;
  const postProcessing = panel.querySelector<HTMLSelectElement>('[data-render-setting="post-processing"]')!;
  const activeLights = panel.querySelector<HTMLSelectElement>('[data-render-setting="active-lights"]')!;
  const shadowLights = panel.querySelector<HTMLSelectElement>('[data-render-setting="shadow-lights"]')!;
  const fog = panel.querySelector<HTMLSelectElement>('[data-render-setting="fog"]')!;
  const diagnostics = panel.querySelector<HTMLElement>('[data-ui="render-diagnostics"]')!;
  let livePerformanceTest = false;

  const transientPreset = (value: Exclude<RenderPreset, 'custom'>): ReturnType<typeof getRenderSettings> =>
    setTransientRenderSettings(settingsForPreset(value));
  const transientPatch = (patch: Parameters<typeof withCustomRenderSettings>[1]): ReturnType<typeof getRenderSettings> =>
    setTransientRenderSettings(withCustomRenderSettings(getRenderSettings(), patch));
  const resetRender = (): ReturnType<typeof getRenderSettings> => setTransientRenderSettings(canonicalSettings);

  const syncControls = (): void => {
    const settings = getRenderSettings();
    const lighting = fixtureLightingQaOverridesSnapshot();
    preset.value = settings.preset;
    distance.value = settings.renderDistance;
    shadowResolution.value = String(settings.shadowResolution);
    renderScale.value = String(settings.renderScale);
    postProcessing.value = settings.postProcessing;
    fog.value = settings.fogBehavior;
    activeLights.value = lighting.maxActiveLights === undefined ? '' : String(lighting.maxActiveLights);
    shadowLights.value = lighting.maxShadowCastingLights === undefined ? '' : String(lighting.maxShadowCastingLights);
  };

  const refreshDiagnostics = (): void => {
    const settings = getRenderSettings();
    const profile = renderDistanceProfile(settings);
    const runtime = renderSettingsDiagnostics(game);
    const lighting = fixtureLightingQaOverridesSnapshot();
    diagnostics.textContent = [
      `Canonical preset: ${labelPreset(canonicalSettings.preset)}`,
      `Current preset: ${labelPreset(settings.preset)}${settings.preset === 'custom' ? ' (QA Custom)' : ''}`,
      `Live test: ${livePerformanceTest ? 'ACTIVE · gameplay input enabled' : 'off'}`,
      `FPS: ${runtime.fps?.toFixed(1) ?? 'sampling'}`,
      `Frame time: ${runtime.frameTimeMs?.toFixed(2) ?? 'sampling'} ms`,
      `Draw calls: ${runtime.drawCalls ?? 'n/a'}`,
      `Current Cell: ${runtime.currentCell ?? 'n/a'}`,
      `Cells: ${runtime.activeCells} active · ${runtime.retainedCells} retained${runtime.participatingCells === undefined ? '' : ` · ${runtime.participatingCells} participating · ${runtime.loadedButNotParticipatingCells} loaded/not participating`}`,
      `M-F1 Omnis: ${runtime.activeOmnis} active · ${runtime.shadowedOmnis} shadowed`,
      `QA light ceilings: active ${lighting.maxActiveLights ?? 'canonical'} · shadow ${lighting.maxShadowCastingLights ?? 'canonical 1:1'}`,
      `Render Distance: ${settings.renderDistance} · ${profile.loadRadius} Cell active radius · ~${profile.approximateRenderDistanceMeters} m`,
      `Retention: ${profile.retentionRadius} Cell radius · worst ${profile.worstCaseRetainedCells} Cells`,
      `Render Scale: ${Math.round(settings.renderScale * 100)}%`,
      `Shadow Resolution: ${settings.shadowResolution}`,
      `Post Processing: ${settings.postProcessing}`,
      `Fog: ${runtime.fogStart?.toFixed(1) ?? profile.fogStart.toFixed(1)} m → ${runtime.fogEnd?.toFixed(1) ?? profile.fogEnd.toFixed(1)} m`,
      `Canonical fog horizon: ${runtime.canonicalFogEnd.toFixed(1)} m · concealment margin ${profile.frontierConcealmentMargin.toFixed(1)} m`,
      `Nearest unguaranteed frontier: ${runtime.nearestGuaranteedFrontierMeters?.toFixed(1) ?? 'none inside active envelope'}`,
      `Frontier safety clamp: ${runtime.frontierSafetyClamped ? 'ACTIVE' : 'not needed'}`,
      `Residency guard: existing ${profile.retentionRadius - profile.loadRadius}-Cell retention / predictive ring; no extra Dev.9.9 residency tier`
    ].join('\n');
  };

  preset.addEventListener('change', () => {
    if (preset.value !== 'custom') transientPreset(preset.value as Exclude<RenderPreset, 'custom'>);
  });
  distance.addEventListener('change', () => transientPatch({ renderDistance: distance.value as RenderDistanceLevel }));
  shadowResolution.addEventListener('change', () => transientPatch({ shadowResolution: Number(shadowResolution.value) as ShadowResolution }));
  renderScale.addEventListener('change', () => transientPatch({ renderScale: Number(renderScale.value) }));
  postProcessing.addEventListener('change', () => transientPatch({ postProcessing: postProcessing.value as PostProcessingQuality }));
  fog.addEventListener('change', () => transientPatch({ fogBehavior: fog.value as FogBehavior }));
  activeLights.addEventListener('change', () => {
    const current = fixtureLightingQaOverridesSnapshot();
    setFixtureLightingQaOverrides({ ...current, maxActiveLights: activeLights.value === '' ? undefined : Number(activeLights.value) });
    syncControls(); refreshDiagnostics();
  });
  shadowLights.addEventListener('change', () => {
    const current = fixtureLightingQaOverridesSnapshot();
    setFixtureLightingQaOverrides({ ...current, maxShadowCastingLights: shadowLights.value === '' ? undefined : Number(shadowLights.value) });
    syncControls(); refreshDiagnostics();
  });
  panel.querySelector('[data-action="reset-render-experiment"]')?.addEventListener('click', () => resetRender());
  panel.querySelector('[data-action="reset-lighting-experiment"]')?.addEventListener('click', () => {
    resetFixtureLightingQaOverrides(); syncControls(); refreshDiagnostics();
  });

  const selectTab = (selected: 'world' | 'render'): void => {
    const renderOpen = selected === 'render';
    for (const section of worldSections) section.hidden = renderOpen;
    if (!livePerformanceTest) panel.hidden = !renderOpen;
    for (const button of tabs.querySelectorAll<HTMLButtonElement>('[data-render-tab]')) {
      const active = button.dataset.renderTab === selected;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    refreshDiagnostics();
  };

  const enterLive = (): boolean => {
    if (livePerformanceTest) return true;
    livePerformanceTest = true;
    panel.hidden = false;
    panel.classList.add('live-performance-panel');
    liveOverlay.hidden = false;
    liveOverlay.appendChild(panel);
    document.body.classList.add('performance-live-test');
    // Close World Lab through its existing UI operation. ProjectNoclipGame then
    // restores ordinary auto-render/input exactly as it does for a player close;
    // the compact panel is outside World Lab and therefore does not change its
    // canonical pause contract.
    if (lab.classList.contains('visible')) lab.querySelector<HTMLButtonElement>('[data-action="close-lab"]')?.click();
    refreshDiagnostics();
    return livePerformanceTest && !lab.classList.contains('visible');
  };

  const exitLive = (): boolean => {
    if (!livePerformanceTest) return false;
    livePerformanceTest = false;
    document.body.classList.remove('performance-live-test');
    panel.classList.remove('live-performance-panel');
    panelAnchor.parentNode?.insertBefore(panel, panelAnchor.nextSibling);
    liveOverlay.hidden = true;
    // Re-open World Lab via its existing input operation, restoring its normal
    // paused inspection semantics, then return directly to Performance Lab.
    if (!lab.classList.contains('visible')) document.querySelector<HTMLButtonElement>('[data-action="touch-lab"]')?.click();
    selectTab('render');
    return !livePerformanceTest && lab.classList.contains('visible');
  };

  panel.querySelector('[data-action="enter-live-performance"]')?.addEventListener('click', () => enterLive());
  liveOverlay.querySelector('[data-action="exit-live-performance"]')?.addEventListener('click', () => exitLive());
  tabs.querySelector<HTMLButtonElement>('[data-render-tab="world"]')?.addEventListener('click', () => selectTab('world'));
  tabs.querySelector<HTMLButtonElement>('[data-render-tab="render"]')?.addEventListener('click', () => selectTab('render'));

  // Pointer lock intentionally leaves the mouse unavailable for desktop UI.
  // Live-test shortcuts keep the same canonical controls usable while WASD,
  // Shift and mouse-look remain untouched gameplay inputs. Touch users can tap
  // the compact controls directly while the normal touch HUD remains active.
  window.addEventListener('keydown', (event) => {
    if (!livePerformanceTest) return;
    if (event.code === 'Backquote') {
      event.preventDefault(); event.stopImmediatePropagation(); exitLive(); return;
    }
    const distanceByDigit: Partial<Record<string, RenderDistanceLevel>> = {
      Digit1: 'low', Digit2: 'medium', Digit3: 'high', Digit4: 'ultra'
    };
    const renderDistance = distanceByDigit[event.code];
    if (renderDistance) {
      event.preventDefault(); event.stopImmediatePropagation(); transientPatch({ renderDistance }); return;
    }
    const cycles: Partial<Record<string, [HTMLSelectElement, readonly string[]]>> = {
      KeyL: [activeLights, ['', '32', '64', '96', '128']],
      KeyK: [shadowLights, ['', '0', '16', '32', '48', '64', '96', '128']],
      KeyR: [renderScale, ['0.5', '0.67', '0.75', '1']],
      KeyH: [shadowResolution, ['256', '512', '1024']],
      KeyP: [postProcessing, ['off', 'low', 'full']]
    };
    const cycle = cycles[event.code];
    if (!cycle) return;
    event.preventDefault(); event.stopImmediatePropagation(); cycleSelect(cycle[0], cycle[1]);
  }, true);

  onRenderSettingsChanged((settings) => {
    applyRenderSettingsToGame(game, settings);
    syncControls();
    refreshDiagnostics();
  });

  window.__projectNoclipRenderSettings = {
    get: () => getRenderSettings(),
    preset: (value) => transientPreset(value),
    patch: (value) => transientPatch(value),
    lighting: (value) => setFixtureLightingQaOverrides(value),
    resetRender,
    resetLighting: () => resetFixtureLightingQaOverrides(),
    diagnostics: () => renderSettingsDiagnostics(game),
    enterLive,
    exitLive,
    live: () => livePerformanceTest
  };

  syncControls();
  applyRenderSettingsToGame(game);
  refreshDiagnostics();
  window.setInterval(() => {
    if (!panel.hidden) refreshDiagnostics();
  }, 250);
}
