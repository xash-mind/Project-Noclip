import { CELL_SIZE, type CellDescriptor } from '../world/types.js';

export type RenderPreset = 'low' | 'medium' | 'high' | 'ultra' | 'custom';
export type RenderDistanceLevel = 'low' | 'medium' | 'high' | 'ultra';
export type ShadowQuality = 'low' | 'medium' | 'high' | 'ultra';
export type ShadowResolution = 256 | 512 | 1024;
export type PostProcessingQuality = 'off' | 'low' | 'full';
export type FogBehavior = 'linked' | 'stronger';

export interface RenderSettings {
  preset: RenderPreset;
  renderDistance: RenderDistanceLevel;
  shadowQuality: ShadowQuality;
  shadowResolution: ShadowResolution;
  renderScale: number;
  postProcessing: PostProcessingQuality;
  fogBehavior: FogBehavior;
}

export interface RenderDistanceProfile {
  level: RenderDistanceLevel;
  loadRadius: number;
  retentionRadius: number;
  approximateRenderDistanceMeters: number;
  typicalActiveCells: number;
  worstCaseRetainedCells: number;
  fogStart: number;
  fogEnd: number;
  frontierConcealmentMargin: number;
  lightShadowSafetyCeiling: number;
}

export interface RendererRenderScope {
  centerCellX: number;
  centerCellZ: number;
  loadRadius: number;
  retentionRadius: number;
}

export interface Level0FogProfile {
  start: number;
  end: number;
  color: { r: number; g: number; b: number };
}

export const LEVEL0_AMBIENT = Object.freeze({ r: 0.20, g: 0.187, b: 0.107 });
export const BLACKOUT_AMBIENT_FLOOR = Object.freeze({ r: 0.09, g: 0.084, b: 0.048 });
export const ORDINARY_LEVEL0_FOG = Object.freeze({ r: 0.166, g: 0.157, b: 0.078 });
export const DEEP_BLACKOUT_FOG = Object.freeze({ r: 0, g: 0, b: 0 });
export const M_F1_LIGHT_SHADOW_SAFETY_CEILING = 128;
export const RENDER_SETTINGS_STORAGE_KEY = 'project-noclip:render-settings:v1';
export const RENDER_FRONTIER_CONCEALMENT_MARGIN_METERS = 1;

export const SHADOW_QUALITY_RESOLUTION: Readonly<Record<ShadowQuality, ShadowResolution>> = Object.freeze({
  low: 256,
  medium: 256,
  high: 512,
  ultra: 1024
});

const LOAD_RADII: Readonly<Record<RenderDistanceLevel, number>> = Object.freeze({
  low: 1,
  medium: 2,
  high: 3,
  ultra: 4
});

function squareCellCount(radius: number): number {
  const width = radius * 2 + 1;
  return width * width;
}

function lightShadowCeilingForRadius(loadRadius: number): number {
  // Render Distance owns one 32-light/shadow budget step per whole Cell-radius
  // tier, capped by the existing 128-light renderer safety ceiling. This keeps
  // Low/Medium/High/Ultra at 32/64/96/128 maximum active M-F1 Omnis while
  // preserving the hard one-light-to-one-shadow invariant at every tier.
  return Math.min(M_F1_LIGHT_SHADOW_SAFETY_CEILING, loadRadius * 32);
}

function distanceProfile(level: RenderDistanceLevel): RenderDistanceProfile {
  const loadRadius = LOAD_RADII[level];
  const retentionRadius = loadRadius + 1;
  const renderBoundary = loadRadius * CELL_SIZE;
  const fogEnd = Math.max(8, renderBoundary - RENDER_FRONTIER_CONCEALMENT_MARGIN_METERS);
  const fogStart = Math.max(7, fogEnd - (CELL_SIZE + 1));
  return Object.freeze({
    level,
    loadRadius,
    retentionRadius,
    approximateRenderDistanceMeters: renderBoundary,
    typicalActiveCells: squareCellCount(loadRadius),
    worstCaseRetainedCells: squareCellCount(retentionRadius),
    fogStart,
    fogEnd,
    frontierConcealmentMargin: RENDER_FRONTIER_CONCEALMENT_MARGIN_METERS,
    lightShadowSafetyCeiling: lightShadowCeilingForRadius(loadRadius)
  });
}

export const RENDER_DISTANCE_PROFILES: Readonly<Record<RenderDistanceLevel, RenderDistanceProfile>> = Object.freeze({
  low: distanceProfile('low'),
  medium: distanceProfile('medium'),
  high: distanceProfile('high'),
  ultra: distanceProfile('ultra')
});

export const RENDER_PRESETS: Readonly<Record<Exclude<RenderPreset, 'custom'>, Readonly<RenderSettings>>> = Object.freeze({
  low: Object.freeze({ preset: 'low', renderDistance: 'low', shadowQuality: 'low', shadowResolution: 256, renderScale: 0.67, postProcessing: 'off', fogBehavior: 'linked' }),
  medium: Object.freeze({ preset: 'medium', renderDistance: 'medium', shadowQuality: 'medium', shadowResolution: 256, renderScale: 0.75, postProcessing: 'low', fogBehavior: 'linked' }),
  high: Object.freeze({ preset: 'high', renderDistance: 'high', shadowQuality: 'high', shadowResolution: 512, renderScale: 1, postProcessing: 'full', fogBehavior: 'linked' }),
  ultra: Object.freeze({ preset: 'ultra', renderDistance: 'ultra', shadowQuality: 'ultra', shadowResolution: 1024, renderScale: 1, postProcessing: 'full', fogBehavior: 'linked' })
});

export const DEFAULT_RENDER_SETTINGS: Readonly<RenderSettings> = RENDER_PRESETS.high;

const renderDistanceValues: readonly RenderDistanceLevel[] = ['low', 'medium', 'high', 'ultra'];
const shadowQualityValues: readonly ShadowQuality[] = ['low', 'medium', 'high', 'ultra'];
const shadowResolutionValues: readonly ShadowResolution[] = [256, 512, 1024];
const renderScaleValues = [0.5, 0.67, 0.75, 1] as const;
const postProcessingValues: readonly PostProcessingQuality[] = ['off', 'low', 'full'];
const fogBehaviorValues: readonly FogBehavior[] = ['linked', 'stronger'];

function oneOf<T>(value: unknown, values: readonly T[], fallback: T): T {
  return values.includes(value as T) ? value as T : fallback;
}

function nearestRenderScale(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_RENDER_SETTINGS.renderScale;
  return renderScaleValues.reduce((best, candidate) => Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best, renderScaleValues[0]);
}

function settingsEqual(left: RenderSettings, right: RenderSettings): boolean {
  return left.renderDistance === right.renderDistance
    && left.shadowQuality === right.shadowQuality
    && left.shadowResolution === right.shadowResolution
    && Math.abs(left.renderScale - right.renderScale) < 0.0001
    && left.postProcessing === right.postProcessing
    && left.fogBehavior === right.fogBehavior;
}

export function matchingPreset(settings: RenderSettings): Exclude<RenderPreset, 'custom'> | undefined {
  for (const preset of ['low', 'medium', 'high', 'ultra'] as const) {
    if (settingsEqual(settings, RENDER_PRESETS[preset])) return preset;
  }
  return undefined;
}

export function sanitizeRenderSettings(input: unknown): RenderSettings {
  const candidate = input && typeof input === 'object' ? input as Partial<RenderSettings> : {};
  const sanitized: RenderSettings = {
    preset: 'custom',
    renderDistance: oneOf(candidate.renderDistance, renderDistanceValues, DEFAULT_RENDER_SETTINGS.renderDistance),
    shadowQuality: oneOf(candidate.shadowQuality, shadowQualityValues, DEFAULT_RENDER_SETTINGS.shadowQuality),
    shadowResolution: oneOf(candidate.shadowResolution, shadowResolutionValues, DEFAULT_RENDER_SETTINGS.shadowResolution),
    renderScale: nearestRenderScale(candidate.renderScale),
    postProcessing: oneOf(candidate.postProcessing, postProcessingValues, DEFAULT_RENDER_SETTINGS.postProcessing),
    fogBehavior: oneOf(candidate.fogBehavior, fogBehaviorValues, DEFAULT_RENDER_SETTINGS.fogBehavior)
  };
  sanitized.preset = matchingPreset(sanitized) ?? 'custom';
  return sanitized;
}

export function renderDistanceProfile(settingsOrLevel: RenderSettings | RenderDistanceLevel): RenderDistanceProfile {
  return RENDER_DISTANCE_PROFILES[typeof settingsOrLevel === 'string' ? settingsOrLevel : settingsOrLevel.renderDistance];
}

export function settingsForPreset(preset: Exclude<RenderPreset, 'custom'>): RenderSettings {
  return { ...RENDER_PRESETS[preset] };
}

export function withCustomRenderSettings(settings: RenderSettings, patch: Partial<Omit<RenderSettings, 'preset'>>): RenderSettings {
  const next = sanitizeRenderSettings({ ...settings, ...patch, preset: 'custom' });
  next.preset = matchingPreset(next) ?? 'custom';
  return next;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function fogEndForGuaranteedFrontier(
  settingsOrLevel: RenderSettings | RenderDistanceLevel,
  nearestGuaranteedFrontierMeters?: number
): number {
  const distance = renderDistanceProfile(settingsOrLevel);
  if (nearestGuaranteedFrontierMeters === undefined || !Number.isFinite(nearestGuaranteedFrontierMeters)) return distance.fogEnd;
  return Math.min(
    distance.fogEnd,
    Math.max(1, nearestGuaranteedFrontierMeters - distance.frontierConcealmentMargin)
  );
}

export function level0AmbientForBlackout(blackoutStrength: number): { r: number; g: number; b: number } {
  const visible = Math.pow(1 - clamp01(blackoutStrength), 1.7);
  return {
    r: BLACKOUT_AMBIENT_FLOOR.r + (LEVEL0_AMBIENT.r - BLACKOUT_AMBIENT_FLOOR.r) * visible,
    g: BLACKOUT_AMBIENT_FLOOR.g + (LEVEL0_AMBIENT.g - BLACKOUT_AMBIENT_FLOOR.g) * visible,
    b: BLACKOUT_AMBIENT_FLOOR.b + (LEVEL0_AMBIENT.b - BLACKOUT_AMBIENT_FLOOR.b) * visible
  };
}

export function level0FogForSettings(
  settings: RenderSettings,
  blackoutStrength: number,
  nearestGuaranteedFrontierMeters?: number
): Level0FogProfile {
  const distance = renderDistanceProfile(settings);
  const blackout = clamp01(blackoutStrength);
  const colorMix = Math.pow(blackout, 1.4);
  const end = fogEndForGuaranteedFrontier(settings, nearestGuaranteedFrontierMeters);
  const canonicalLinkedStart = settings.fogBehavior === 'stronger' ? distance.fogStart * 0.78 : distance.fogStart;
  const latestSafeStart = Math.max(0, end - 1);
  const linkedStart = Math.min(canonicalLinkedStart, latestSafeStart);
  const blackoutStart = Math.min(latestSafeStart, Math.max(4.5, linkedStart * 0.62));
  return {
    start: linkedStart + (blackoutStart - linkedStart) * blackout,
    end,
    color: {
      r: ORDINARY_LEVEL0_FOG.r + (DEEP_BLACKOUT_FOG.r - ORDINARY_LEVEL0_FOG.r) * colorMix,
      g: ORDINARY_LEVEL0_FOG.g + (DEEP_BLACKOUT_FOG.g - ORDINARY_LEVEL0_FOG.g) * colorMix,
      b: ORDINARY_LEVEL0_FOG.b + (DEEP_BLACKOUT_FOG.b - ORDINARY_LEVEL0_FOG.b) * colorMix
    }
  };
}

let currentSettings: RenderSettings = { ...DEFAULT_RENDER_SETTINGS };
const listeners = new Set<(settings: RenderSettings) => void>();
const rendererScopes = new WeakMap<object, RendererRenderScope>();
const rendererParticipatingCells = new WeakMap<object, ReadonlySet<string>>();

export function loadRenderSettings(storage: Pick<Storage, 'getItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): RenderSettings {
  if (!storage) return { ...DEFAULT_RENDER_SETTINGS };
  try {
    const raw = storage.getItem(RENDER_SETTINGS_STORAGE_KEY);
    return raw ? sanitizeRenderSettings(JSON.parse(raw)) : { ...DEFAULT_RENDER_SETTINGS };
  } catch {
    return { ...DEFAULT_RENDER_SETTINGS };
  }
}

export function initializeRenderSettings(): RenderSettings {
  currentSettings = loadRenderSettings();
  return { ...currentSettings };
}

export function getRenderSettings(): RenderSettings {
  return { ...currentSettings };
}

function publishRenderSettings(settings: RenderSettings): RenderSettings {
  currentSettings = sanitizeRenderSettings(settings);
  for (const listener of listeners) listener({ ...currentSettings });
  return { ...currentSettings };
}

export function setRenderSettings(settings: RenderSettings, storage: Pick<Storage, 'setItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): RenderSettings {
  const sanitized = sanitizeRenderSettings(settings);
  try { storage?.setItem(RENDER_SETTINGS_STORAGE_KEY, JSON.stringify(sanitized)); } catch { /* device-local persistence is best effort */ }
  return publishRenderSettings(sanitized);
}

/** Applies an ephemeral runtime/QA value without writing device settings or Journey state. */
export function setTransientRenderSettings(settings: RenderSettings): RenderSettings {
  return publishRenderSettings(settings);
}

export function applyRenderPreset(preset: Exclude<RenderPreset, 'custom'>): RenderSettings {
  return setRenderSettings(settingsForPreset(preset));
}

export function patchRenderSettings(patch: Partial<Omit<RenderSettings, 'preset'>>): RenderSettings {
  return setRenderSettings(withCustomRenderSettings(currentSettings, patch));
}

export function onRenderSettingsChanged(listener: (settings: RenderSettings) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setRendererRenderScope(renderer: object, scope: RendererRenderScope): void {
  rendererScopes.set(renderer, { ...scope });
}

export function rendererRenderScope(renderer: object): RendererRenderScope | undefined {
  const value = rendererScopes.get(renderer);
  return value ? { ...value } : undefined;
}

/**
 * Phase-1 visibility is an additive renderer-participation filter only. The
 * legacy distance scope remains authoritative for loading/retention and this
 * set never controls Cell residency.
 */
export function setRendererParticipatingCells(renderer: object, cellIds: readonly string[] | ReadonlySet<string> | undefined): void {
  if (!cellIds) {
    rendererParticipatingCells.delete(renderer);
    return;
  }
  rendererParticipatingCells.set(renderer, new Set(cellIds));
}

export function rendererParticipatingCellIds(renderer: object): readonly string[] | undefined {
  const value = rendererParticipatingCells.get(renderer);
  return value ? [...value].sort() : undefined;
}

export function cellIsInsideActiveRenderScope(renderer: object, descriptor: CellDescriptor): boolean {
  const scope = rendererScopes.get(renderer);
  const insideLegacyDistance = !scope || Math.max(
    Math.abs(descriptor.address.cellX - scope.centerCellX),
    Math.abs(descriptor.address.cellZ - scope.centerCellZ)
  ) <= scope.loadRadius;
  if (!insideLegacyDistance) return false;
  const participating = rendererParticipatingCells.get(renderer);
  return !participating || participating.has(descriptor.id);
}
