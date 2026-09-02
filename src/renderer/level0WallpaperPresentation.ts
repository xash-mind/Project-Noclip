import * as pc from 'playcanvas';
import { materialAssetId, materialBoolean, materialColor, materialNumber } from '../presentation/materialRuntime.js';
import { archStructuralRole } from '../world/gen3ArchDividerSemantics.js';
import { CELL_SIZE, type CellDescriptor, type PropSpec, type WallSpec } from '../world/types.js';
import { ordinaryCasingPresentationDiagnostics } from './ordinaryCasingMaterialPresentation.js';
import { noteOrdinaryWallpaperFallback, ordinaryWallpaperAssetDiagnostics } from './ordinaryWallpaperAssets.js';
import {
  ORDINARY_CASING_RUN_CHANCE,
  ORDINARY_OUTLET_CENTER_Y,
  ordinaryOutletFaceSign,
  ordinaryOutletPlacement,
  ordinaryWallpaperDecision,
  ordinaryWallpaperUv,
  type OrdinaryWallpaperFamily
} from './ordinaryWallpaperRules.js';
import { derivedPresentationTexture, type PresentationImageTransform } from './presentationImageTextures.js';
import { WorldRenderer } from './WorldRenderer.js';
import { makeMaterial, type CellVisual, type InteractionVisual } from './support.js';

interface RendererAccess { app: pc.Application; save: { seed: string }; }
type NamedMaterial = pc.StandardMaterial & { name?: string };
type WallpaperRegion = 'ordinary-level-0' | 'pillar-field' | 'arch-rooms';

interface OrdinaryPresentationCache {
  app: pc.Application;
  materials: Map<string, pc.StandardMaterial>;
  fallbacks: Map<OrdinaryWallpaperFamily, pc.Texture>;
  showcase?: pc.Entity;
}

export interface OutletInteractionVisual {
  kind: 'outlet'; id: string; entity: pc.Entity; wallId: string; x: number; y: number; z: number;
}
export interface WallpaperRegionDiagnostics { wallA: number; wallB: number; splitC: number; suppliedTextureBindings: number; paleBindings: number; }
export interface OrdinaryWallpaperPresentationDiagnostics {
  assets: ReturnType<typeof ordinaryWallpaperAssetDiagnostics>;
  wallA: number; wallB: number; splitC: number;
  casingRuns: number; casingStrips: number; casingTerminatingEnds: number; casingJunctionEnds: number; casingSetbackFraction: number;
  outlets: number; worldScaleMeters: number; casingChance: number; regions: Record<WallpaperRegion, WallpaperRegionDiagnostics>;
}
export interface OrdinaryWallpaperQaBridge { diagnostics(): OrdinaryWallpaperPresentationDiagnostics; showcase(): OrdinaryWallpaperPresentationDiagnostics; clearShowcase(): void; }

declare global { interface Window { __projectNoclipWallpaper?: OrdinaryWallpaperQaBridge; } }

const TARGET = 'material.level-0-wallpaper';
const OUTLET_TARGET = 'material.level-0-outlet';
const SLOT_BY_FAMILY: Readonly<Record<OrdinaryWallpaperFamily, string>> = Object.freeze({ A: 'familyA', B: 'familyB', C: 'familyC' });
const caches = new WeakMap<WorldRenderer, OrdinaryPresentationCache>();
let latestRenderer: WorldRenderer | undefined;

function childrenOf(entity: pc.Entity): pc.Entity[] { return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children]; }
function walkEntities(root: pc.Entity): pc.Entity[] { const output: pc.Entity[] = []; const visit = (entity: pc.Entity): void => { output.push(entity); for (const child of childrenOf(entity)) visit(child); }; visit(root); return output; }
function entityByName(root: pc.Entity, name: string): pc.Entity | undefined { return childrenOf(root).find((child) => child.name === name); }
function descendantByName(root: pc.Entity, name: string): pc.Entity | undefined { return walkEntities(root).find((entity) => entity.name === name); }
function materialName(material: pc.StandardMaterial | undefined): string { return material ? ((material as unknown as NamedMaterial).name ?? '') : ''; }
function setMaterialName(material: pc.StandardMaterial, name: string): void { (material as unknown as NamedMaterial).name = name; }
function clamp(value: number, min = 0, max = 1): number { return Math.max(min, Math.min(max, value)); }

function diagnosticCanvas(family: OrdinaryWallpaperFamily): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
  const context = canvas.getContext('2d'); if (!context) throw new Error('Wallpaper diagnostic canvas unavailable');
  context.fillStyle = '#ff00ff'; context.fillRect(0, 0, 128, 128); context.fillStyle = '#101010';
  for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) if ((x + y) % 2 === 0) context.fillRect(x * 32, y * 32, 32, 32);
  context.fillStyle = '#ffffff'; context.font = 'bold 28px sans-serif'; context.fillText(family, 52, 74); return canvas;
}

function cacheFor(renderer: WorldRenderer): OrdinaryPresentationCache {
  const existing = caches.get(renderer); if (existing) return existing;
  const app = (renderer as unknown as RendererAccess).app;
  const created: OrdinaryPresentationCache = { app, materials: new Map(), fallbacks: new Map() };
  caches.set(renderer, created); latestRenderer = renderer; installQaBridge(renderer); return created;
}

function fallbackTexture(cache: OrdinaryPresentationCache, family: OrdinaryWallpaperFamily): pc.Texture {
  const existing = cache.fallbacks.get(family); if (existing) return existing;
  noteOrdinaryWallpaperFallback();
  const texture = new pc.Texture(cache.app.graphicsDevice, { mipmaps: true });
  texture.addressU = pc.ADDRESS_REPEAT; texture.addressV = pc.ADDRESS_REPEAT; texture.setSource(diagnosticCanvas(family));
  cache.fallbacks.set(family, texture); return texture;
}

function material(cache: OrdinaryPresentationCache, key: string, factory: () => pc.StandardMaterial): pc.StandardMaterial {
  const existing = cache.materials.get(key); if (existing) return existing;
  const created = factory(); cache.materials.set(key, created); return created;
}

function wallpaperTransform(): PresentationImageTransform {
  return {
    brightness: materialNumber(TARGET, 'brightness', 1),
    contrast: materialNumber(TARGET, 'contrast', 1),
    saturation: materialNumber(TARGET, 'saturation', 1),
    rotationDegrees: materialNumber(TARGET, 'rotationDegrees', 0),
    flipU: materialBoolean(TARGET, 'flipU', false),
    flipV: materialBoolean(TARGET, 'flipV', false)
  };
}

function wallpaperAsset(family: OrdinaryWallpaperFamily): string {
  const id = materialAssetId(TARGET, SLOT_BY_FAMILY[family]);
  if (!id) throw new Error(`M-W1 ${SLOT_BY_FAMILY[family]} Asset slot is unbound`);
  return id;
}

function wallpaperMaterialForUv(
  cache: OrdinaryPresentationCache,
  family: OrdinaryWallpaperFamily,
  tiling: readonly [number, number],
  offset: readonly [number, number],
  pale: boolean
): pc.StandardMaterial {
  const assetId = wallpaperAsset(family);
  const transform = wallpaperTransform();
  const tintAmount = clamp(materialNumber(TARGET, 'tintAmount', 0.04));
  const tint = materialColor(TARGET, 'tintColor', [0.96, 0.95, 0.92]);
  const archBrightness = pale ? materialNumber(TARGET, 'archBrightness', 1.04) : 1;
  const diffuse: [number, number, number] = [
    (1 + (tint[0] - 1) * tintAmount) * archBrightness,
    (1 + (tint[1] - 1) * tintAmount) * archBrightness,
    (1 + (tint[2] - 1) * tintAmount) * archBrightness
  ];
  const texture = derivedPresentationTexture(cache.app, assetId, transform) ?? fallbackTexture(cache, family);
  const key = `ordinary-wallpaper:${family}:${assetId}:${transform.brightness.toFixed(3)}:${transform.contrast.toFixed(3)}:${transform.saturation.toFixed(3)}:${transform.rotationDegrees}:${transform.flipU ? 1 : 0}:${transform.flipV ? 1 : 0}:${pale ? 'arch' : 'standard'}:${tint.join(',')}:${tintAmount.toFixed(3)}:${archBrightness.toFixed(3)}:${tiling.map((value) => value.toFixed(4)).join(',')}:${offset.map((value) => value.toFixed(4)).join(',')}`;
  return material(cache, key, () => {
    const result = makeMaterial(diffuse, texture, [tiling[0], tiling[1]], undefined, 1, [offset[0], offset[1]]);
    setMaterialName(result, `ordinary-wallpaper:${family}:${pale ? 'arch-pale' : 'standard'}:${assetId}`); result.update(); return result;
  });
}

function wallpaperMaterial(cache: OrdinaryPresentationCache, descriptor: CellDescriptor, wall: WallSpec, family: OrdinaryWallpaperFamily): pc.StandardMaterial {
  const repeat = materialNumber(TARGET, 'patternSizeMeters', 1.3);
  const phase: [number, number] = [materialNumber(TARGET, 'uvOffsetU', 0), materialNumber(TARGET, 'uvOffsetV', 0)];
  const uv = ordinaryWallpaperUv(descriptor.address.cellX, descriptor.address.cellZ, wall, repeat, phase);
  return wallpaperMaterialForUv(cache, family, uv.tiling, uv.offset, descriptor.world.regionId === 'arch-rooms');
}

function setMaterial(entity: pc.Entity | undefined, value: pc.StandardMaterial): void { if (entity?.render) entity.render.material = value; }
function box(name: string, parent: pc.Entity, position: readonly [number, number, number], scale: readonly [number, number, number], value: pc.StandardMaterial): pc.Entity {
  const entity = new pc.Entity(name); entity.addComponent('render', { type: 'box' }); entity.setLocalPosition(position[0], position[1], position[2]); entity.setLocalScale(scale[0], scale[1], scale[2]); if (entity.render) entity.render.material = value; parent.addChild(entity); return entity;
}

function splitWallSpecs(wall: WallSpec, fraction: number): [WallSpec, WallSpec] {
  const clamped = Math.max(0.25, Math.min(0.75, fraction));
  if (wall.orientation === 'z') {
    const firstLength = wall.sx * clamped, secondLength = wall.sx - firstLength, start = wall.cx - wall.sx / 2;
    return [{ ...wall, id: wall.id, cx: start + firstLength / 2, sx: firstLength }, { ...wall, id: `${wall.id}:split-c`, cx: start + firstLength + secondLength / 2, sx: secondLength }];
  }
  const firstLength = wall.sz * clamped, secondLength = wall.sz - firstLength, start = wall.cz - wall.sz / 2;
  return [{ ...wall, id: wall.id, cz: start + firstLength / 2, sz: firstLength }, { ...wall, id: `${wall.id}:split-c`, cz: start + firstLength + secondLength / 2, sz: secondLength }];
}

function renderUnsplitWallpaper(cache: OrdinaryPresentationCache, descriptor: CellDescriptor, root: pc.Entity, wall: WallSpec, family: OrdinaryWallpaperFamily): void {
  setMaterial(entityByName(root, wall.id), wallpaperMaterial(cache, descriptor, wall, family));
}
function renderSplitWallpaper(cache: OrdinaryPresentationCache, descriptor: CellDescriptor, root: pc.Entity, wall: WallSpec, fraction: number, cOnPositiveSide: boolean): void {
  const existing = entityByName(root, wall.id); if (!existing) return; existing.destroy();
  const [negative, positive] = splitWallSpecs(wall, fraction);
  const negativeFamily: OrdinaryWallpaperFamily = cOnPositiveSide ? 'A' : 'C'; const positiveFamily: OrdinaryWallpaperFamily = cOnPositiveSide ? 'C' : 'A';
  box(negative.id, root, [negative.cx, negative.cy, negative.cz], [negative.sx, negative.sy, negative.sz], wallpaperMaterial(cache, descriptor, negative, negativeFamily));
  box(positive.id, root, [positive.cx, positive.cy, positive.cz], [positive.sx, positive.sy, positive.sz], wallpaperMaterial(cache, descriptor, positive, positiveFamily));
}

function outletPlateMaterial(cache: OrdinaryPresentationCache): pc.StandardMaterial {
  const color = materialColor(OUTLET_TARGET, 'plateColor', [0.61, 0.58, 0.36]); const gloss = materialNumber(OUTLET_TARGET, 'gloss', 0.035);
  return material(cache, `ordinary-outlet-plate:${color.join(',')}:${gloss}`, () => { const result = makeMaterial(color); setMaterialName(result, 'ordinary-outlet-plate'); result.gloss = gloss; result.update(); return result; });
}
function outletSlotMaterial(cache: OrdinaryPresentationCache): pc.StandardMaterial {
  const color = materialColor(OUTLET_TARGET, 'slotColor', [0.16, 0.14, 0.065]);
  return material(cache, `ordinary-outlet-slot:${color.join(',')}`, () => { const result = makeMaterial(color); setMaterialName(result, 'ordinary-outlet-slot'); return result; });
}

function addOutlet(renderer: WorldRenderer, cache: OrdinaryPresentationCache, visual: CellVisual, wall: WallSpec, u: number, faceSign: -1 | 1): void {
  const descriptor = visual.descriptor; const halfSurface = wall.orientation === 'z' ? wall.sz / 2 : wall.sx / 2; const surfaceOffset = faceSign * (halfSurface + 0.022);
  const alongStart = wall.orientation === 'z' ? wall.cx - wall.sx / 2 : wall.cz - wall.sz / 2; const alongLength = wall.orientation === 'z' ? wall.sx : wall.sz; const along = alongStart + alongLength * u;
  const localX = wall.orientation === 'z' ? along : wall.cx + surfaceOffset; const localZ = wall.orientation === 'z' ? wall.cz + surfaceOffset : along;
  const plateScale: [number, number, number] = wall.orientation === 'z' ? [0.13, 0.18, 0.025] : [0.025, 0.18, 0.13]; const id = `${wall.id}:outlet`;
  const plate = box(id, visual.root, [localX, ORDINARY_OUTLET_CENTER_Y, localZ], plateScale, outletPlateMaterial(cache)); const slotSurface = faceSign * 0.017;
  for (const side of [-1, 1] as const) {
    if (wall.orientation === 'z') box(`${id}:slot:${side}`, visual.root, [localX + side * 0.026, ORDINARY_OUTLET_CENTER_Y + 0.012, localZ + slotSurface], [0.012, 0.048, 0.008], outletSlotMaterial(cache));
    else box(`${id}:slot:${side}`, visual.root, [localX + slotSurface, ORDINARY_OUTLET_CENTER_Y + 0.012, localZ + side * 0.026], [0.008, 0.048, 0.012], outletSlotMaterial(cache));
  }
  const interaction: OutletInteractionVisual = { kind: 'outlet', id, entity: plate, wallId: wall.id, x: descriptor.address.cellX * CELL_SIZE + localX, y: ORDINARY_OUTLET_CENTER_Y, z: descriptor.address.cellZ * CELL_SIZE + localZ };
  const boundary = interaction as unknown as InteractionVisual; visual.interactions.push(boundary); renderer.interactions.set(id, boundary);
}

function wallpaperRegion(descriptor: CellDescriptor): WallpaperRegion | undefined { const region = descriptor.world.regionId; return region === 'ordinary-level-0' || region === 'pillar-field' || region === 'arch-rooms' ? region : undefined; }
function eligibleLevel0WallpaperWall(descriptor: CellDescriptor, wall: WallSpec): boolean { return Boolean(wallpaperRegion(descriptor)) && wall.drawable && (wall.materialId === 'level-0-wallpaper' || wall.materialId === 'arch-pale-wallpaper' || wall.materialId === undefined); }
function pillarWallpaperReferenceWall(prop: PropSpec): WallSpec { return { id: `${prop.id}:wallpaper`, cx: prop.position.x, cy: prop.position.y, cz: prop.position.z - prop.scale.z / 2, sx: prop.scale.x, sy: prop.scale.y, sz: 0.04, orientation: 'z', drawable: true, materialId: 'level-0-wallpaper', materialVariant: 0 }; }

function applyPillarWallpaper(renderer: WorldRenderer, cache: OrdinaryPresentationCache, visual: CellVisual): void {
  const descriptor = visual.descriptor; const seed = (renderer as unknown as RendererAccess).save.seed;
  if (!wallpaperRegion(descriptor)) return;
  for (const prop of descriptor.props) {
    if (prop.kind !== 'column' || prop.materialId !== 'level-0-wallpaper') continue;
    const reference = pillarWallpaperReferenceWall(prop); const decision = ordinaryWallpaperDecision(seed, descriptor.address.cellX, descriptor.address.cellZ, reference);
    setMaterial(descendantByName(visual.root, `${prop.id}:body`), wallpaperMaterial(cache, descriptor, reference, decision.primary));
  }
}

export function applyLevel0WallpaperPresentation(renderer: WorldRenderer, visual: CellVisual): void {
  const descriptor = visual.descriptor; if (descriptor.world.generationVersion !== 'gen3-v1' || !wallpaperRegion(descriptor)) return;
  const cache = cacheFor(renderer); const seed = (renderer as unknown as RendererAccess).save.seed;
  for (const wall of descriptor.walls) {
    if (!eligibleLevel0WallpaperWall(descriptor, wall)) continue;
    if (descriptor.world.regionId === 'arch-rooms' && archStructuralRole(wall)) continue;
    const decision = ordinaryWallpaperDecision(seed, descriptor.address.cellX, descriptor.address.cellZ, wall);
    if (decision.splitWith === 'C' && decision.splitFraction !== undefined) renderSplitWallpaper(cache, descriptor, visual.root, wall, decision.splitFraction, decision.cOnPositiveSide ?? true);
    else renderUnsplitWallpaper(cache, descriptor, visual.root, wall, decision.primary);
    if (descriptor.world.regionId !== 'ordinary-level-0') continue;
    const outlet = ordinaryOutletPlacement(seed, descriptor.address.cellX, descriptor.address.cellZ, wall); if (!outlet.enabled) continue;
    const faceSign = ordinaryOutletFaceSign(descriptor.walls, wall, outlet.u, outlet.faceSign); if (faceSign !== undefined) addOutlet(renderer, cache, visual, wall, outlet.u, faceSign);
  }
  // Sparse Ordinary Level 0 pillars and Pillar Field pillars share this exact M-W1 resolver.
  applyPillarWallpaper(renderer, cache, visual);
}

function emptyRegionDiagnostics(): WallpaperRegionDiagnostics { return { wallA: 0, wallB: 0, splitC: 0, suppliedTextureBindings: 0, paleBindings: 0 }; }
function materialFamily(value: pc.StandardMaterial | undefined): OrdinaryWallpaperFamily | undefined { const match = materialName(value).match(/^ordinary-wallpaper:([ABC]):/); const family = match?.[1]; return family === 'A' || family === 'B' || family === 'C' ? family : undefined; }

export function ordinaryWallpaperPresentationDiagnostics(renderer: WorldRenderer | undefined = latestRenderer): OrdinaryWallpaperPresentationDiagnostics {
  const assets = ordinaryWallpaperAssetDiagnostics(); const casing = ordinaryCasingPresentationDiagnostics(renderer);
  const regions: Record<WallpaperRegion, WallpaperRegionDiagnostics> = { 'ordinary-level-0': emptyRegionDiagnostics(), 'pillar-field': emptyRegionDiagnostics(), 'arch-rooms': emptyRegionDiagnostics() };
  const patternSize = materialNumber(TARGET, 'patternSizeMeters', 1.3);
  if (!renderer) return { assets, wallA: 0, wallB: 0, splitC: 0, casingRuns: casing.runs, casingStrips: casing.strips, casingTerminatingEnds: casing.terminatingEnds, casingJunctionEnds: casing.junctionEnds, casingSetbackFraction: casing.setbackFraction, outlets: 0, worldScaleMeters: patternSize, casingChance: ORDINARY_CASING_RUN_CHANCE, regions };
  const outletIds = new Set<string>();
  for (const visual of renderer.loaded.values()) {
    const region = wallpaperRegion(visual.descriptor); if (!region) continue; const counts = regions[region];
    for (const entity of walkEntities(visual.root)) {
      const value = entity.render?.material as pc.StandardMaterial | undefined; const family = materialFamily(value); if (!family) continue;
      if (family === 'A') counts.wallA += 1; else if (family === 'B') counts.wallB += 1; else counts.splitC += 1;
      if (value?.diffuseMap) counts.suppliedTextureBindings += 1; if (materialName(value).includes(':arch-pale')) counts.paleBindings += 1;
    }
    for (const interaction of visual.interactions) if ((interaction as unknown as { kind?: string }).kind === 'outlet') outletIds.add(interaction.id);
  }
  const ordinary = regions['ordinary-level-0'];
  return { assets, wallA: ordinary.wallA, wallB: ordinary.wallB, splitC: ordinary.splitC, casingRuns: casing.runs, casingStrips: casing.strips, casingTerminatingEnds: casing.terminatingEnds, casingJunctionEnds: casing.junctionEnds, casingSetbackFraction: casing.setbackFraction, outlets: outletIds.size, worldScaleMeters: patternSize, casingChance: ORDINARY_CASING_RUN_CHANCE, regions };
}

function clearShowcase(renderer: WorldRenderer): void { const cache = caches.get(renderer); cache?.showcase?.destroy(); if (cache) cache.showcase = undefined; }
function showShowcase(renderer: WorldRenderer): void {
  const cache = cacheFor(renderer); clearShowcase(renderer); const app = (renderer as unknown as RendererAccess).app; const camera = childrenOf(app.root).find((child) => child.name === 'player-camera'); if (!camera) throw new Error('Wallpaper inspection requires player-camera');
  const root = new pc.Entity('wallpaper-inspection-showcase'); camera.addChild(root); root.setLocalPosition(0, -0.25, -5.4); cache.showcase = root;
  const panelWidth = 1.08, panelHeight = 1.8, repeat = materialNumber(TARGET, 'patternSizeMeters', 1.3); const panelTiling: [number, number] = [panelWidth / repeat, panelHeight / repeat];
  const a = wallpaperMaterialForUv(cache, 'A', panelTiling, [0, 0], false), b = wallpaperMaterialForUv(cache, 'B', panelTiling, [0, 0], false), c = wallpaperMaterialForUv(cache, 'C', panelTiling, [0, 0], false), paleA = wallpaperMaterialForUv(cache, 'A', panelTiling, [0, 0], true);
  box('qa-wall-a', root, [-2.5, 0, 0], [panelWidth, panelHeight, 0.06], a); box('qa-wall-b', root, [-1.25, 0, 0], [panelWidth, panelHeight, 0.06], b); box('qa-wall-split-a', root, [-0.27, 0, 0], [0.54, panelHeight, 0.06], a); box('qa-wall-split-c', root, [0.27, 0, 0], [0.54, panelHeight, 0.06], c); box('qa-wall-arch-pale', root, [1.25, 0, 0], [panelWidth, panelHeight, 0.06], paleA); box('qa-wall-outlet', root, [2.5, 0, 0], [panelWidth, panelHeight, 0.06], a); box('qa-outlet-plate', root, [2.5, -0.46, 0.055], [0.13, 0.18, 0.025], outletPlateMaterial(cache));
  for (const side of [-1, 1] as const) box(`qa-outlet-slot:${side}`, root, [2.5 + side * 0.026, -0.45, 0.073], [0.012, 0.048, 0.008], outletSlotMaterial(cache));
}
function installQaBridge(renderer: WorldRenderer): void { window.__projectNoclipWallpaper = { diagnostics: () => ordinaryWallpaperPresentationDiagnostics(renderer), showcase: () => { showShowcase(renderer); return ordinaryWallpaperPresentationDiagnostics(renderer); }, clearShowcase: () => clearShowcase(renderer) }; }
