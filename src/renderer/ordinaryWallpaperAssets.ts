import { GENERATED_ASSET_REGISTRY } from '../presentation/generatedAssetRegistry.js';
import type { OrdinaryWallpaperFamily } from './ordinaryWallpaperRules.js';

export const ORDINARY_WALLPAPER_ASSET_IDS: Readonly<Record<OrdinaryWallpaperFamily, string>> = Object.freeze({
  A: 'level0.wallpaper.a-chevron',
  B: 'level0.wallpaper.b-dots',
  C: 'level0.wallpaper.c-lines'
});

export interface OrdinaryWallpaperAssetState {
  family: OrdinaryWallpaperFamily;
  id: string;
  runtimePath?: string;
  ready: boolean;
  fetched: boolean;
  hashVerified: boolean;
  decoded: boolean;
  width: number;
  height: number;
  error?: string;
}

export interface OrdinaryWallpaperAssetDiagnostics {
  prepared: boolean;
  fallbackUsed: number;
  assets: Readonly<Record<OrdinaryWallpaperFamily, OrdinaryWallpaperAssetState>>;
}

const FAMILIES: readonly OrdinaryWallpaperFamily[] = ['A', 'B', 'C'];
const images = new Map<OrdinaryWallpaperFamily, HTMLImageElement>();
const states = new Map<OrdinaryWallpaperFamily, OrdinaryWallpaperAssetState>();
let preparePromise: Promise<void> | undefined;
let prepared = false;
let fallbackUsed = 0;

for (const family of FAMILIES) {
  states.set(family, {
    family,
    id: ORDINARY_WALLPAPER_ASSET_IDS[family],
    ready: false,
    fetched: false,
    hashVerified: false,
    decoded: false,
    width: 0,
    height: 0
  });
}

function assetFor(family: OrdinaryWallpaperFamily) {
  const id = ORDINARY_WALLPAPER_ASSET_IDS[family];
  return GENERATED_ASSET_REGISTRY.find((candidate) => candidate.id === id && candidate.runtimeStatus === 'ready');
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function decodeFamily(family: OrdinaryWallpaperFamily): Promise<void> {
  const state = states.get(family)!;
  const asset = assetFor(family);
  if (!asset) {
    state.error = `NAL runtime asset missing: ${state.id}`;
    throw new Error(`[Level 0 wallpaper] ${state.error}`);
  }
  state.runtimePath = asset.runtimePath;
  try {
    const response = await fetch(asset.runtimePath, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    state.fetched = true;
    const bytes = await response.arrayBuffer();
    const digest = await sha256Hex(bytes);
    if (digest !== asset.contentHash) throw new Error(`content hash mismatch: expected ${asset.contentHash}, got ${digest}`);
    state.hashVerified = true;

    const blob = new Blob([bytes], { type: response.headers.get('content-type') ?? 'image/webp' });
    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.decoding = 'async';
      image.src = objectUrl;
      await image.decode();
      if (image.naturalWidth <= 0 || image.naturalHeight <= 0) throw new Error('decoded image has no dimensions');
      images.set(family, image);
      state.decoded = true;
      state.width = image.naturalWidth;
      state.height = image.naturalHeight;
      state.ready = true;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (error) {
    state.error = String(error instanceof Error ? error.message : error);
    console.error(`[Level 0 wallpaper] ${family}/${state.id} failed: ${state.error}`);
    throw error;
  }
}

/**
 * Hard preview boundary: the real NAL wallpaper bytes must be fetched, hash-verified
 * and browser-decoded before any journey can stream its first Ordinary Cell.
 */
export function prepareOrdinaryWallpaperAssets(): Promise<void> {
  if (prepared) return Promise.resolve();
  preparePromise ??= Promise.all(FAMILIES.map((family) => decodeFamily(family))).then(() => {
    prepared = true;
  });
  return preparePromise;
}

export function ordinaryWallpaperImage(family: OrdinaryWallpaperFamily): HTMLImageElement | undefined {
  return images.get(family);
}

export function noteOrdinaryWallpaperFallback(): void {
  fallbackUsed += 1;
}

export function ordinaryWallpaperAssetDiagnostics(): OrdinaryWallpaperAssetDiagnostics {
  return {
    prepared,
    fallbackUsed,
    assets: Object.freeze(Object.fromEntries(FAMILIES.map((family) => [family, { ...states.get(family)! }])) as Record<OrdinaryWallpaperFamily, OrdinaryWallpaperAssetState>)
  };
}
