import { materialAssetId } from '../presentation/materialRuntime.js';
import type { OrdinaryWallpaperFamily } from './ordinaryWallpaperRules.js';
import { preparePresentationImageAsset, presentationImageDimensions, presentationImageReady, presentationImageRuntimePath } from './presentationImageTextures.js';

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
export interface OrdinaryWallpaperAssetDiagnostics { prepared: boolean; fallbackUsed: number; assets: Readonly<Record<OrdinaryWallpaperFamily, OrdinaryWallpaperAssetState>>; }
const FAMILIES: readonly OrdinaryWallpaperFamily[] = ['A','B','C'];
const SLOT_BY_FAMILY: Readonly<Record<OrdinaryWallpaperFamily,string>> = Object.freeze({A:'familyA',B:'familyB',C:'familyC'});
let preparePromise: Promise<void>|undefined;
let prepared=false;
let fallbackUsed=0;
const errors=new Map<OrdinaryWallpaperFamily,string>();

export function ordinaryWallpaperAssetId(family: OrdinaryWallpaperFamily): string {
  const id=materialAssetId('material.level-0-wallpaper',SLOT_BY_FAMILY[family]);
  if(!id)throw new Error(`[Level 0 wallpaper] canonical M-W1 Asset slot ${SLOT_BY_FAMILY[family]} is unbound`);
  return id;
}
async function prepareFamily(family: OrdinaryWallpaperFamily): Promise<void> {
  const id=ordinaryWallpaperAssetId(family);
  try{await preparePresentationImageAsset(id);errors.delete(family);}catch(error){const message=String(error instanceof Error?error.message:error);errors.set(family,message);throw error;}
}
export function prepareOrdinaryWallpaperAssets(): Promise<void> {
  if(prepared)return Promise.resolve();
  preparePromise??=Promise.all(FAMILIES.map(prepareFamily)).then(()=>{prepared=true;});
  return preparePromise;
}
export async function prepareCurrentOrdinaryWallpaperAssets(): Promise<void> { await Promise.all(FAMILIES.map(prepareFamily)); }
export function noteOrdinaryWallpaperFallback(): void { fallbackUsed+=1; }
function stateFor(family: OrdinaryWallpaperFamily): OrdinaryWallpaperAssetState {
  const id=ordinaryWallpaperAssetId(family),ready=presentationImageReady(id),dimensions=presentationImageDimensions(id),runtimePath=presentationImageRuntimePath(id);
  return {family,id,...(runtimePath?{runtimePath}:{}),ready,fetched:ready,hashVerified:ready,decoded:ready,width:dimensions?.width??0,height:dimensions?.height??0,...(errors.get(family)?{error:errors.get(family)}:{})};
}
export function ordinaryWallpaperAssetDiagnostics(): OrdinaryWallpaperAssetDiagnostics {
  return {prepared,fallbackUsed,assets:Object.freeze(Object.fromEntries(FAMILIES.map((family)=>[family,stateFor(family)])) as Record<OrdinaryWallpaperFamily,OrdinaryWallpaperAssetState>)};
}
