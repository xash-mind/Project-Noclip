import * as pc from 'playcanvas';
import { GENERATED_ASSET_REGISTRY } from '../presentation/generatedAssetRegistry.js';

export interface PresentationImageTransform {
  brightness: number;
  contrast: number;
  saturation: number;
  rotationDegrees: number;
  flipU: boolean;
  flipV: boolean;
}

interface DecodedAsset { id: string; contentHash: string; image: HTMLImageElement; width: number; height: number; }
interface TextureCacheEntry { key: string; texture: pc.Texture; touched: number; }
const decoded = new Map<string, DecodedAsset>();
const pending = new Map<string, Promise<DecodedAsset>>();
const textureCaches = new WeakMap<pc.Application, Map<string, TextureCacheEntry>>();
const MAX_DERIVED_TEXTURES_PER_APP = 72;
let touchCounter = 0;

function runtimeAsset(assetId: string) { return GENERATED_ASSET_REGISTRY.find((asset) => asset.id === assetId && asset.type === 'image' && asset.runtimeStatus === 'ready'); }
async function sha256Hex(bytes: ArrayBuffer): Promise<string> { const digest = await crypto.subtle.digest('SHA-256', bytes); return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join(''); }

export async function preparePresentationImageAsset(assetId: string): Promise<DecodedAsset> {
  const existing = decoded.get(assetId), asset = runtimeAsset(assetId);
  if (!asset) throw new Error(`[Presentation image] NAL image Asset unavailable: ${assetId}`);
  if (existing?.contentHash === asset.contentHash) return existing;
  const inFlight = pending.get(assetId); if (inFlight) return inFlight;
  const promise = (async () => {
    const response = await fetch(asset.runtimePath, { cache: 'no-store' }); if (!response.ok) throw new Error(`[Presentation image] ${assetId} fetch failed: HTTP ${response.status}`);
    const bytes = await response.arrayBuffer(), digest = await sha256Hex(bytes); if (digest !== asset.contentHash) throw new Error(`[Presentation image] ${assetId} content hash mismatch`);
    const blob = new Blob([bytes], { type: response.headers.get('content-type') ?? 'image/webp' }), objectUrl = URL.createObjectURL(blob);
    try {
      const image = new Image(); image.decoding = 'async'; image.src = objectUrl; await image.decode(); if (image.naturalWidth <= 0 || image.naturalHeight <= 0) throw new Error(`[Presentation image] ${assetId} decoded with invalid dimensions`);
      const value: DecodedAsset = { id: assetId, contentHash: asset.contentHash, image, width: image.naturalWidth, height: image.naturalHeight }; decoded.set(assetId, value); return value;
    } finally { URL.revokeObjectURL(objectUrl); }
  })().finally(() => pending.delete(assetId));
  pending.set(assetId, promise); return promise;
}

export function presentationImageReady(assetId: string): boolean { const asset = runtimeAsset(assetId); return Boolean(asset && decoded.get(assetId)?.contentHash === asset.contentHash); }
export function presentationImageDimensions(assetId: string): { width: number; height: number } | undefined { const value = decoded.get(assetId); return value ? { width: value.width, height: value.height } : undefined; }
export function presentationImageRuntimePath(assetId: string): string | undefined { return runtimeAsset(assetId)?.runtimePath; }
function normalizedRotation(value: number): 0|90|180|270 { const normalized = ((Math.round(value / 90) * 90) % 360 + 360) % 360; return (normalized === 90 || normalized === 180 || normalized === 270 ? normalized : 0) as 0|90|180|270; }
function transformKey(transform: PresentationImageTransform): string { return [Math.max(0,transform.brightness).toFixed(4),Math.max(0,transform.contrast).toFixed(4),Math.max(0,transform.saturation).toFixed(4),normalizedRotation(transform.rotationDegrees),transform.flipU?1:0,transform.flipV?1:0].join(':'); }
function transformedCanvas(asset: DecodedAsset, transform: PresentationImageTransform): HTMLCanvasElement {
  const rotation = normalizedRotation(transform.rotationDegrees), swapped = rotation === 90 || rotation === 270, canvas = document.createElement('canvas'); canvas.width = swapped ? asset.height : asset.width; canvas.height = swapped ? asset.width : asset.height;
  const context = canvas.getContext('2d'); if (!context) throw new Error('Presentation image transform canvas unavailable');
  context.save(); context.translate(canvas.width/2,canvas.height/2); context.rotate(rotation*Math.PI/180); context.scale(transform.flipU?-1:1,transform.flipV?-1:1); context.filter=`brightness(${Math.max(0,transform.brightness)}) contrast(${Math.max(0,transform.contrast)}) saturate(${Math.max(0,transform.saturation)})`; context.drawImage(asset.image,-asset.width/2,-asset.height/2,asset.width,asset.height); context.restore(); return canvas;
}
function trimCache(cache: Map<string, TextureCacheEntry>): void {
  if (cache.size <= MAX_DERIVED_TEXTURES_PER_APP) return;
  const excess = [...cache.values()].sort((a,b)=>a.touched-b.touched).slice(0,cache.size-MAX_DERIVED_TEXTURES_PER_APP);
  for (const entry of excess) { cache.delete(entry.key); (entry.texture as pc.Texture & { destroy?: () => void }).destroy?.(); }
}
export function derivedPresentationTexture(app: pc.Application, assetId: string, transform: PresentationImageTransform): pc.Texture | undefined {
  const asset = decoded.get(assetId), runtime = runtimeAsset(assetId);
  if (!asset || !runtime || asset.contentHash !== runtime.contentHash) { void preparePresentationImageAsset(assetId).catch((error)=>console.error(error)); return undefined; }
  let cache = textureCaches.get(app); if (!cache) { cache = new Map(); textureCaches.set(app,cache); }
  const key = `${assetId}:${asset.contentHash}:${transformKey(transform)}`, existing = cache.get(key); if (existing) { existing.touched=++touchCounter; return existing.texture; }
  const texture = new pc.Texture(app.graphicsDevice,{mipmaps:true}); texture.addressU=pc.ADDRESS_REPEAT; texture.addressV=pc.ADDRESS_REPEAT; texture.minFilter=pc.FILTER_LINEAR_MIPMAP_LINEAR; texture.magFilter=pc.FILTER_LINEAR; texture.setSource(transformedCanvas(asset,transform)); cache.set(key,{key,texture,touched:++touchCounter}); trimCache(cache); return texture;
}
export function presentationTextureCacheSize(app: pc.Application): number { return textureCaches.get(app)?.size ?? 0; }
