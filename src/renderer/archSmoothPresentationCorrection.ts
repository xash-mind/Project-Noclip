import * as pc from 'playcanvas';
import { CELL_SIZE, WALL_HEIGHT, type CellDescriptor } from '../world/types.js';
import { WorldRenderer } from './WorldRenderer.js';
import {
  archFrameBaysForDescriptors,
  archFramePresentationProfile,
  type ArchFrameBay
} from './level0RegionPresentation.js';
import { makeMaterial, type CellVisual } from './support.js';

type Vec3Tuple = readonly [number, number, number];

type RendererAccess = WorldRenderer & { app: pc.Application };

interface SmoothCurveCache {
  mesh?: pc.Mesh;
  fallbackUpperMaterial?: pc.StandardMaterial;
}

const caches = new WeakMap<WorldRenderer, SmoothCurveCache>();
const scheduled = new WeakSet<WorldRenderer>();
let installed = false;

const SMOOTH_CURVE_SEGMENTS = 48;
const BLOCK_CURVE_PREFIX = 'arch-frame:curve-segment:';
const SMOOTH_CURVE_PREFIX = 'arch-frame:smooth-curve:';
const UPPER_PIER_STUB_PREFIX = 'arch-frame:pier-ceiling-stub:';
const PIER_PREFIX = 'arch-frame:pier:';
const UPPER_RUN_PREFIX = 'arch-frame:upper-run:';
const FALLBACK_UPPER_TINT: readonly [number, number, number] = [0.955, 0.945, 0.885];

function childrenOf(entity: pc.Entity): pc.Entity[] {
  return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children];
}

function cacheFor(renderer: WorldRenderer): SmoothCurveCache {
  const existing = caches.get(renderer);
  if (existing) return existing;
  const created: SmoothCurveCache = {};
  caches.set(renderer, created);
  return created;
}

function subtract(left: Vec3Tuple, right: Vec3Tuple): Vec3Tuple {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function cross(left: Vec3Tuple, right: Vec3Tuple): Vec3Tuple {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0]
  ];
}

function normalize(value: Vec3Tuple): Vec3Tuple {
  const length = Math.hypot(value[0], value[1], value[2]) || 1;
  return [value[0] / length, value[1] / length, value[2] / length];
}

function dot(left: Vec3Tuple, right: Vec3Tuple): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function pushQuad(
  positions: number[],
  normals: number[],
  indices: number[],
  points: readonly [Vec3Tuple, Vec3Tuple, Vec3Tuple, Vec3Tuple],
  desiredNormal: Vec3Tuple
): void {
  let ordered = [...points] as Vec3Tuple[];
  let normal = normalize(
    cross(
      subtract(ordered[1]!, ordered[0]!),
      subtract(ordered[2]!, ordered[0]!)
    )
  );
  if (dot(normal, desiredNormal) < 0) {
    ordered = [ordered[0]!, ordered[3]!, ordered[2]!, ordered[1]!];
    normal = normalize(
      cross(
        subtract(ordered[1]!, ordered[0]!),
        subtract(ordered[2]!, ordered[0]!)
      )
    );
  }

  const base = positions.length / 3;
  for (const point of ordered) {
    positions.push(point[0], point[1], point[2]);
    normals.push(normal[0], normal[1], normal[2]);
  }
  indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function normalizedCurveY(normalizedX: number): number {
  const profile = archFramePresentationProfile();
  const normalized = Math.min(1, Math.abs(normalizedX) * 2);
  return profile.upperBottom
    + (profile.curveApex - profile.upperBottom)
      * Math.sqrt(Math.max(0, 1 - normalized * normalized));
}

function smoothCurveMesh(renderer: WorldRenderer): pc.Mesh {
  const cache = cacheFor(renderer);
  if (cache.mesh) return cache.mesh;

  const profile = archFramePresentationProfile();
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const halfDepth = profile.upperDepth / 2;
  const frontNormal: Vec3Tuple = [0, 0, -1];
  const backNormal: Vec3Tuple = [0, 0, 1];

  for (let index = 0; index < SMOOTH_CURVE_SEGMENTS; index += 1) {
    const start = -0.5 + index / SMOOTH_CURVE_SEGMENTS;
    const end = -0.5 + (index + 1) / SMOOTH_CURVE_SEGMENTS;
    const startY = normalizedCurveY(start);
    const endY = normalizedCurveY(end);

    pushQuad(positions, normals, indices, [
      [start, startY, -halfDepth],
      [start, profile.upperTop, -halfDepth],
      [end, profile.upperTop, -halfDepth],
      [end, endY, -halfDepth]
    ], frontNormal);

    pushQuad(positions, normals, indices, [
      [start, startY, halfDepth],
      [end, endY, halfDepth],
      [end, profile.upperTop, halfDepth],
      [start, profile.upperTop, halfDepth]
    ], backNormal);

    pushQuad(positions, normals, indices, [
      [start, startY, -halfDepth],
      [end, endY, -halfDepth],
      [end, endY, halfDepth],
      [start, startY, halfDepth]
    ], [0, -1, 0]);
  }

  pushQuad(positions, normals, indices, [
    [-0.5, profile.upperTop, -halfDepth],
    [-0.5, profile.upperTop, halfDepth],
    [0.5, profile.upperTop, halfDepth],
    [0.5, profile.upperTop, -halfDepth]
  ], [0, 1, 0]);

  const app = (renderer as RendererAccess).app;
  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(positions);
  mesh.setNormals(normals);
  mesh.setIndices(indices);
  mesh.update();
  cache.mesh = mesh;
  return mesh;
}

function upperMaterial(renderer: WorldRenderer): pc.StandardMaterial {
  for (const visual of renderer.loaded.values()) {
    for (const child of childrenOf(visual.root)) {
      if (child.name.startsWith(UPPER_RUN_PREFIX) && child.render?.material) {
        return child.render.material as pc.StandardMaterial;
      }
    }
  }

  const cache = cacheFor(renderer);
  if (!cache.fallbackUpperMaterial) {
    cache.fallbackUpperMaterial = makeMaterial(FALLBACK_UPPER_TINT);
  }
  return cache.fallbackUpperMaterial;
}

function cellIndexForWorld(value: number): number {
  return Math.floor((value + CELL_SIZE / 2) / CELL_SIZE);
}

function ownerAddress(bay: ArchFrameBay): readonly [number, number] {
  const center = (bay.curveStart + bay.curveEnd) / 2;
  return bay.orientation === 'z'
    ? [cellIndexForWorld(center), cellIndexForWorld(bay.fixed)]
    : [cellIndexForWorld(bay.fixed), cellIndexForWorld(center)];
}

function visualForBay(visuals: readonly CellVisual[], bay: ArchFrameBay): CellVisual | undefined {
  const [targetX, targetZ] = ownerAddress(bay);
  const exact = visuals.find((visual) =>
    visual.descriptor.address.cellX === targetX
    && visual.descriptor.address.cellZ === targetZ
  );
  if (exact) return exact;

  let best: CellVisual | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const visual of visuals) {
    const distance = Math.abs(visual.descriptor.address.cellX - targetX)
      + Math.abs(visual.descriptor.address.cellZ - targetZ);
    if (distance < bestDistance) {
      best = visual;
      bestDistance = distance;
    }
  }
  return bestDistance <= 1 ? best : undefined;
}

function addSmoothCurve(
  renderer: WorldRenderer,
  visual: CellVisual,
  bay: ArchFrameBay,
  value: pc.StandardMaterial
): void {
  const width = bay.curveEnd - bay.curveStart;
  if (width <= 0.05) return;

  const center = (bay.curveStart + bay.curveEnd) / 2;
  const baseX = visual.descriptor.address.cellX * CELL_SIZE;
  const baseZ = visual.descriptor.address.cellZ * CELL_SIZE;
  const entity = new pc.Entity(`${SMOOTH_CURVE_PREFIX}${bay.id}`);
  const meshInstance = new pc.MeshInstance(smoothCurveMesh(renderer), value);
  entity.addComponent('render', { meshInstances: [meshInstance] });

  if (bay.orientation === 'z') {
    entity.setLocalPosition(center - baseX, 0, bay.fixed - baseZ);
  } else {
    entity.setLocalPosition(bay.fixed - baseX, 0, center - baseZ);
    entity.setLocalEulerAngles(0, 90, 0);
  }
  entity.setLocalScale(width, 1, 1);
  visual.root.addChild(entity);
}

function removeOldCorrections(visual: CellVisual): void {
  for (const child of childrenOf(visual.root)) {
    if (
      child.name.startsWith(SMOOTH_CURVE_PREFIX)
      || child.name.startsWith(UPPER_PIER_STUB_PREFIX)
    ) child.destroy();
  }
}

function removeBlockCurves(visual: CellVisual): void {
  for (const child of childrenOf(visual.root)) {
    if (child.name.startsWith(BLOCK_CURVE_PREFIX)) child.destroy();
  }
}

function splitPiersAtUpperMass(visual: CellVisual): void {
  const profile = archFramePresentationProfile();
  const lowerHeight = profile.upperBottom;
  const upperHeight = WALL_HEIGHT - profile.upperTop;

  for (const child of childrenOf(visual.root)) {
    if (!child.name.startsWith(PIER_PREFIX) || child.name.startsWith(UPPER_PIER_STUB_PREFIX)) continue;
    const position = child.getLocalPosition();
    const scale = child.getLocalScale();

    child.setLocalPosition(position.x, lowerHeight / 2, position.z);
    child.setLocalScale(scale.x, lowerHeight, scale.z);

    if (upperHeight <= 0.01) continue;
    const stub = new pc.Entity(`${UPPER_PIER_STUB_PREFIX}${child.name}`);
    stub.addComponent('render', { type: 'box' });
    stub.setLocalPosition(
      position.x,
      profile.upperTop + upperHeight / 2,
      position.z
    );
    stub.setLocalScale(scale.x, upperHeight, scale.z);
    if (stub.render && child.render) stub.render.material = child.render.material as pc.StandardMaterial;
    visual.root.addChild(stub);
  }
}

function descriptorTouchesArchPresentation(descriptor: CellDescriptor): boolean {
  return descriptor.world.generationVersion === 'gen3-v1'
    && (
      descriptor.world.regionId === 'arch-rooms'
      || descriptor.walls.some((wall) => wall.materialId === 'arch-pale-wallpaper')
    );
}

function descriptorIsNearArchPresentation(
  renderer: WorldRenderer,
  descriptor: CellDescriptor
): boolean {
  if (descriptorTouchesArchPresentation(descriptor)) return true;
  return [...renderer.loaded.values()].some((visual) =>
    descriptorTouchesArchPresentation(visual.descriptor)
    && Math.abs(visual.descriptor.address.cellX - descriptor.address.cellX) <= 1
    && Math.abs(visual.descriptor.address.cellZ - descriptor.address.cellZ) <= 1
  );
}

function applySmoothArchCorrection(renderer: WorldRenderer): void {
  const visuals = [...renderer.loaded.values()];
  for (const visual of visuals) {
    removeOldCorrections(visual);
    removeBlockCurves(visual);
    splitPiersAtUpperMass(visual);
  }

  const bays = archFrameBaysForDescriptors(visuals.map((visual) => visual.descriptor));
  if (bays.length === 0) return;
  const value = upperMaterial(renderer);
  for (const bay of bays) {
    const visual = visualForBay(visuals, bay);
    if (visual) addSmoothCurve(renderer, visual, bay, value);
  }
}

function scheduleSmoothArchCorrection(renderer: WorldRenderer): void {
  if (scheduled.has(renderer)) return;
  scheduled.add(renderer);
  queueMicrotask(() => {
    scheduled.delete(renderer);
    applySmoothArchCorrection(renderer);
  });
}

/**
 * Final A-A1 visual correction after the legacy Region presentation flush.
 * The central arch is one smooth shared mesh instance per bay, while the pier is
 * split below and above the thicker shoulder/header mass so no full-height pier
 * occupies the shoulder joint. World descriptors, topology and collision remain
 * owned by the existing generator/runtime layers.
 */
export function installArchSmoothPresentationCorrection(): void {
  if (installed) return;
  installed = true;

  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function patchedSmoothArchLoad(
    this: WorldRenderer,
    descriptor: CellDescriptor
  ): void {
    originalLoadCell.call(this, descriptor);
    if (descriptorIsNearArchPresentation(this, descriptor)) {
      scheduleSmoothArchCorrection(this);
    }
  };

  const originalUnloadCell = WorldRenderer.prototype.unloadCell;
  WorldRenderer.prototype.unloadCell = function patchedSmoothArchUnload(
    this: WorldRenderer,
    cellId: string
  ): void {
    const descriptor = this.loaded.get(cellId)?.descriptor;
    originalUnloadCell.call(this, cellId);
    if (descriptor && descriptorIsNearArchPresentation(this, descriptor)) {
      scheduleSmoothArchCorrection(this);
    }
  };
}
