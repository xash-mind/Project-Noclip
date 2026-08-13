import * as pc from 'playcanvas';
import { CELL_SIZE, type CellDescriptor, type LightState, type PropSpec, type WallSpec } from '../world/types.js';
import {
  lightFlickerValue,
  sampleLightField,
  type LightFieldSource,
  type SpatialFixtureLight
} from '../world/lighting.js';
import { WorldRenderer } from './WorldRenderer.js';
import {
  canvasTexture,
  makeMaterial,
  type CellVisual
} from './support.js';
import {
  paintLevel0ChevronWallpaper,
  shouldGen3WallCollide,
  wallpaperUvForWall
} from './dev5Wallpaper.js';

interface RendererAccess {
  app: pc.Application;
}

interface PresentationCache {
  wallpaper: pc.Texture;
  carpet: pc.Texture;
  ceiling: pc.Texture;
  materials: Map<string, pc.StandardMaterial>;
}

const caches = new WeakMap<WorldRenderer, PresentationCache>();
let installed = false;

function childrenOf(entity: pc.Entity): pc.Entity[] {
  return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children];
}

function entityByName(root: pc.Entity, name: string): pc.Entity | undefined {
  return childrenOf(root).find((child) => child.name === name);
}

function createWallpaperTexture(app: pc.Application): pc.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas texture unavailable');
  paintLevel0ChevronWallpaper(context, 256);
  const texture = new pc.Texture(app.graphicsDevice, { mipmaps: true });
  texture.addressU = pc.ADDRESS_REPEAT;
  texture.addressV = pc.ADDRESS_REPEAT;
  texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
  texture.magFilter = pc.FILTER_LINEAR;
  texture.setSource(canvas);
  return texture;
}

function cacheFor(renderer: WorldRenderer): PresentationCache {
  const existing = caches.get(renderer);
  if (existing) return existing;
  const app = (renderer as unknown as RendererAccess).app;
  const created: PresentationCache = {
    wallpaper: createWallpaperTexture(app),
    carpet: canvasTexture(app, 'carpet', 0),
    ceiling: canvasTexture(app, 'ceiling', 0),
    materials: new Map()
  };
  caches.set(renderer, created);
  return created;
}

function material(
  cache: PresentationCache,
  key: string,
  factory: () => pc.StandardMaterial
): pc.StandardMaterial {
  const existing = cache.materials.get(key);
  if (existing) return existing;
  const created = factory();
  cache.materials.set(key, created);
  return created;
}

function setMaterial(entity: pc.Entity | undefined, value: pc.StandardMaterial): void {
  if (entity?.render) entity.render.material = value;
}

function addBox(
  name: string,
  parent: pc.Entity,
  position: [number, number, number],
  scale: [number, number, number],
  value: pc.StandardMaterial
): pc.Entity {
  const entity = new pc.Entity(name);
  entity.addComponent('render', { type: 'box' });
  entity.setLocalPosition(position[0], position[1], position[2]);
  entity.setLocalScale(scale[0], scale[1], scale[2]);
  if (entity.render) entity.render.material = value;
  parent.addChild(entity);
  return entity;
}

function wallMaterial(
  cache: PresentationCache,
  descriptor: CellDescriptor,
  wall: WallSpec
): pc.StandardMaterial {
  const arch = wall.materialId === 'arch-pale-wallpaper';
  const lowerPanel = arch && wall.sy > 0.92 && wall.sy < 1.08 && wall.cy > 0.45 && wall.cy < 0.56;
  const uv = wallpaperUvForWall(descriptor.address.cellX, descriptor.address.cellZ, wall);
  const tint: [number, number, number] = lowerPanel
    ? [0.89, 0.885, 0.82]
    : arch
      ? [0.98, 0.975, 0.93]
      : [0.94, 0.925, 0.86];
  const key = `wall:${arch ? 'arch' : 'ordinary'}:${lowerPanel ? 'panel' : 'field'}:${uv.tiling.map((value) => value.toFixed(4)).join(',')}:${uv.offset.map((value) => value.toFixed(4)).join(',')}`;
  return material(cache, key, () => makeMaterial(tint, cache.wallpaper, uv.tiling, undefined, 1, uv.offset));
}

function floorMaterial(cache: PresentationCache, descriptor: CellDescriptor): pc.StandardMaterial {
  const arch = descriptor.world.regionId === 'arch-rooms';
  const key = `floor:${arch ? 'arch' : 'ordinary'}`;
  return material(cache, key, () => {
    const result = makeMaterial(arch ? [0.67, 0.625, 0.51] : [0.79, 0.72, 0.55], cache.carpet, [5, 5]);
    if (arch) {
      result.gloss = 0.11;
      result.update();
    }
    return result;
  });
}

function ceilingMaterial(cache: PresentationCache, descriptor: CellDescriptor): pc.StandardMaterial {
  const arch = descriptor.world.regionId === 'arch-rooms';
  const key = `ceiling:${arch ? 'arch' : 'ordinary'}`;
  return material(cache, key, () => makeMaterial(arch ? [0.98, 0.975, 0.91] : [0.93, 0.91, 0.81], cache.ceiling, [4, 4]));
}

function quantizedPulse(state: LightState, pulse: number): number {
  if (state === 'off') return 0;
  return Math.max(0, Math.min(1, Math.round(pulse * 16) / 16));
}

function fixtureMaterial(
  cache: PresentationCache,
  descriptor: CellDescriptor,
  state: LightState,
  pulse: number
): pc.StandardMaterial {
  const arch = descriptor.world.regionId === 'arch-rooms';
  const level = quantizedPulse(state, pulse);
  const key = `fixture:${arch ? 'arch' : 'ordinary'}:${state}:${level.toFixed(4)}`;
  return material(cache, key, () => {
    const activeDiffuse: [number, number, number] = arch ? [0.99, 0.985, 0.83] : [0.98, 0.955, 0.76];
    const offDiffuse: [number, number, number] = [0.31, 0.31, 0.27];
    const diffuse: [number, number, number] = [
      offDiffuse[0] + (activeDiffuse[0] - offDiffuse[0]) * level,
      offDiffuse[1] + (activeDiffuse[1] - offDiffuse[1]) * level,
      offDiffuse[2] + (activeDiffuse[2] - offDiffuse[2]) * level
    ];
    if (level <= 0.001) return makeMaterial(diffuse);
    const emissive: [number, number, number] = arch ? [1, 0.985, 0.78] : [1, 0.95, 0.68];
    return makeMaterial(diffuse, undefined, [1, 1], emissive, (arch ? 2.18 : 2.28) * level);
  });
}

function surfaceFieldMaterial(
  cache: PresentationCache,
  descriptor: CellDescriptor,
  kind: 'floor' | 'ceiling',
  energy: number,
  temperature: number
): pc.StandardMaterial {
  const arch = descriptor.world.regionId === 'arch-rooms';
  const energyBucket = Math.max(0, Math.min(12, Math.round(energy * 12)));
  if (energyBucket === 0) return kind === 'floor' ? floorMaterial(cache, descriptor) : ceilingMaterial(cache, descriptor);
  const temperatureBucket = Math.max(0, Math.min(6, Math.round((temperature - 0.78) / 0.05)));
  const normalizedEnergy = energyBucket / 12;
  const normalizedTemperature = 0.78 + temperatureBucket * 0.05;
  const key = `surface-field:${kind}:${arch ? 'arch' : 'ordinary'}:${energyBucket}:${temperatureBucket}`;
  return material(cache, key, () => {
    const diffuse: [number, number, number] = kind === 'floor'
      ? (arch ? [0.67, 0.625, 0.51] : [0.79, 0.72, 0.55])
      : (arch ? [0.98, 0.975, 0.91] : [0.93, 0.91, 0.81]);
    const texture = kind === 'floor' ? cache.carpet : cache.ceiling;
    const tiling: [number, number] = kind === 'floor' ? [5, 5] : [4, 4];
    const emissive: [number, number, number] = [
      Math.min(1, 0.82 * normalizedTemperature),
      Math.min(1, 0.73 * normalizedTemperature),
      Math.min(1, 0.34 * normalizedTemperature)
    ];
    const intensity = normalizedEnergy * (kind === 'floor' ? 0.46 : 0.34);
    const result = makeMaterial(diffuse, texture, tiling, emissive, intensity);
    if (arch && kind === 'floor') result.gloss = 0.11;
    result.update();
    return result;
  });
}

function pillarFaceWall(
  prop: PropSpec,
  face: 'north' | 'south' | 'west' | 'east'
): WallSpec {
  const thickness = 0.035;
  if (face === 'north' || face === 'south') {
    return {
      id: `${prop.id}:wallpaper:${face}`,
      cx: prop.position.x,
      cy: prop.position.y,
      cz: prop.position.z + (face === 'north' ? -prop.scale.z / 2 : prop.scale.z / 2),
      sx: prop.scale.x,
      sy: prop.scale.y,
      sz: thickness,
      orientation: 'z',
      drawable: true,
      materialId: 'level-0-wallpaper',
      materialVariant: 0
    };
  }
  return {
    id: `${prop.id}:wallpaper:${face}`,
    cx: prop.position.x + (face === 'west' ? -prop.scale.x / 2 : prop.scale.x / 2),
    cy: prop.position.y,
    cz: prop.position.z,
    sx: thickness,
    sy: prop.scale.y,
    sz: prop.scale.z,
    orientation: 'x',
    drawable: true,
    materialId: 'level-0-wallpaper',
    materialVariant: 0
  };
}

function replacePillarPresentation(
  cache: PresentationCache,
  descriptor: CellDescriptor,
  root: pc.Entity,
  prop: PropSpec
): void {
  const container = entityByName(root, prop.id);
  if (!container) return;
  entityByName(container, `${prop.id}:body`)?.destroy();

  const thickness = 0.035;
  const faces = ['north', 'south', 'west', 'east'] as const;
  for (const face of faces) {
    const wall = pillarFaceWall(prop, face);
    const value = wallMaterial(cache, descriptor, wall);
    if (face === 'north' || face === 'south') {
      addBox(
        `${prop.id}:wallpaper:${face}`,
        container,
        [0, 0, face === 'north' ? -prop.scale.z / 2 : prop.scale.z / 2],
        [prop.scale.x, prop.scale.y, thickness],
        value
      );
    } else {
      addBox(
        `${prop.id}:wallpaper:${face}`,
        container,
        [face === 'west' ? -prop.scale.x / 2 : prop.scale.x / 2, 0, 0],
        [thickness, prop.scale.y, prop.scale.z],
        value
      );
    }
  }
}

function setSurfaceMaterial(root: pc.Entity, kind: 'floor' | 'ceiling', value: pc.StandardMaterial): void {
  if (kind === 'ceiling') {
    setMaterial(entityByName(root, 'ceiling'), value);
    return;
  }
  setMaterial(entityByName(root, 'floor'), value);
  for (const child of childrenOf(root)) {
    if (child.name.startsWith('floor-piece:')) setMaterial(child, value);
  }
}

function applyGen3Presentation(renderer: WorldRenderer, visual: CellVisual): void {
  const descriptor = visual.descriptor;
  if (descriptor.world.generationVersion !== 'gen3-v1') return;
  const cache = cacheFor(renderer);
  const root = visual.root;

  const wallSpecs = new Map(descriptor.walls.map((wall) => [wall.id, wall]));
  visual.colliders = visual.colliders.filter((collider) => {
    const wall = wallSpecs.get(collider.id);
    if (!wall || shouldGen3WallCollide(wall)) return true;
    renderer.walls.delete(collider.id);
    return false;
  });

  for (const child of childrenOf(root)) {
    if (child.name.endsWith(':skirting')) child.destroy();
  }

  setSurfaceMaterial(root, 'floor', floorMaterial(cache, descriptor));
  setSurfaceMaterial(root, 'ceiling', ceilingMaterial(cache, descriptor));
  for (const wall of descriptor.walls) setMaterial(entityByName(root, wall.id), wallMaterial(cache, descriptor, wall));
  for (const prop of descriptor.props) {
    if (prop.kind === 'column' && prop.materialId === 'level-0-wallpaper') {
      replacePillarPresentation(cache, descriptor, root, prop);
    }
  }
  for (const group of descriptor.lightGroups) {
    const pulse = group.state === 'off' ? 0 : 1;
    const value = fixtureMaterial(cache, descriptor, group.state, pulse);
    group.fixtures.forEach((_position, index) => setMaterial(entityByName(root, `${group.id}:fixture:${index}`), value));
  }
}

function lightSources(renderer: WorldRenderer): LightFieldSource[] {
  return [...renderer.loaded.values()].flatMap((visual) => visual.descriptor.lightGroups.map((group) => ({
    cellX: visual.descriptor.address.cellX,
    cellZ: visual.descriptor.address.cellZ,
    group
  })));
}

function syncGen3Lighting(
  renderer: WorldRenderer,
  elapsedSeconds: number,
  reducedFlicker: boolean
): void {
  const cache = cacheFor(renderer);
  const sources = lightSources(renderer);

  for (const visual of renderer.loaded.values()) {
    const descriptor = visual.descriptor;
    if (descriptor.world.generationVersion !== 'gen3-v1') continue;

    for (const group of descriptor.lightGroups) {
      const pulse = lightFlickerValue(group, elapsedSeconds, reducedFlicker);
      const value = fixtureMaterial(cache, descriptor, group.state, pulse);
      group.fixtures.forEach((_position, index) => {
        setMaterial(entityByName(visual.root, `${group.id}:fixture:${index}`), value);
      });
    }

    const centerX = descriptor.address.cellX * CELL_SIZE;
    const centerZ = descriptor.address.cellZ * CELL_SIZE;
    const sampled = sampleLightField(sources, centerX, centerZ, elapsedSeconds, reducedFlicker);
    const blackoutSuppression = Math.pow(Math.max(0, 1 - descriptor.world.blackoutStrength), 1.7);
    const fixedFieldEnergy = sampled.energy * blackoutSuppression;
    setSurfaceMaterial(
      visual.root,
      'floor',
      surfaceFieldMaterial(cache, descriptor, 'floor', fixedFieldEnergy, sampled.temperature)
    );
    setSurfaceMaterial(
      visual.root,
      'ceiling',
      surfaceFieldMaterial(cache, descriptor, 'ceiling', fixedFieldEnergy, sampled.temperature)
    );
  }
}

/**
 * Install the bounded dev.6 presentation correction without changing geography or
 * dev.5 Space Topology. Rendered fixtures and the fixed Cell-surface light field
 * are driven from the same deterministic LightGroup pulse used by the bounded
 * realtime source pool.
 */
export function installDev5FidelityPresentation(): void {
  if (installed) return;
  installed = true;

  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function patchedLoadCell(
    this: WorldRenderer,
    descriptor: CellDescriptor
  ): void {
    originalLoadCell.call(this, descriptor);
    const visual = this.loaded.get(descriptor.id);
    if (visual) applyGen3Presentation(this, visual);
  };

  const originalSpatialFixtureLights = WorldRenderer.prototype.spatialFixtureLights;
  WorldRenderer.prototype.spatialFixtureLights = function patchedSpatialFixtureLights(
    this: WorldRenderer,
    playerX: number,
    playerZ: number,
    elapsedSeconds: number,
    reducedFlicker: boolean,
    limit = 4,
    previousIds: readonly string[] = []
  ): SpatialFixtureLight[] {
    syncGen3Lighting(this, elapsedSeconds, reducedFlicker);
    return originalSpatialFixtureLights.call(
      this,
      playerX,
      playerZ,
      elapsedSeconds,
      reducedFlicker,
      limit,
      previousIds
    );
  };
}
