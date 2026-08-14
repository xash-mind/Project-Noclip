import * as pc from 'playcanvas';
import { ARCH_HEADER_HEIGHT, ARCH_LOWER_HEIGHT } from '../world/gen3ArchitectureCore.js';
import {
  CELL_SIZE,
  WALL_HEIGHT,
  WALL_THICKNESS,
  type CellDescriptor,
  type FloorPatchSpec,
  type RegionId,
  type WallSpec
} from '../world/types.js';
import { WorldRenderer } from './WorldRenderer.js';
import { makeMaterial, type CellVisual } from './support.js';

interface RendererAccess { app: pc.Application; }
interface RegionPresentationCache { materials: Map<string, pc.StandardMaterial>; }
interface CarpetProfile { key: 'ordinary' | 'pillar' | 'arch'; tint: readonly [number, number, number]; gloss?: number; }
type Vec3Tuple = readonly [number, number, number];
type Vec2Tuple = readonly [number, number];
type Interval = readonly [number, number];

interface ArchLine {
  orientation: WallSpec['orientation'];
  fixed: number;
  headers: WallSpec[];
  solids: Interval[];
}
interface ArchCurveOpening {
  id: string;
  sourceWallId: string;
  orientation: WallSpec['orientation'];
  fixed: number;
  start: number;
  end: number;
  springY: number;
  apexY: number;
  headerBottom: number;
}

export interface ArchCurveSegment {
  id: string;
  sourceWallId: string;
  position: Vec3Tuple;
  scale: Vec3Tuple;
}
export interface HoleDepthBand {
  key: 'upper' | 'middle' | 'deep';
  top: number;
  bottom: number;
  tint: readonly [number, number, number];
}

const caches = new WeakMap<WorldRenderer, RegionPresentationCache>();
const carpetClones = new WeakMap<pc.StandardMaterial, Map<string, pc.StandardMaterial>>();
let installed = false;
const CARPET_REPEAT_METERS = CELL_SIZE / 5;
const ARCH_CURVE_SEGMENTS = 24;
const ARCH_HEADER_BRIDGE_MAX_GAP = 4.1;
const ARCH_UV_REPEAT_METERS = 2.8;

function childrenOf(entity: pc.Entity): pc.Entity[] {
  return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children];
}
function entityByName(root: pc.Entity, name: string): pc.Entity | undefined {
  return childrenOf(root).find((child) => child.name === name);
}
function cacheFor(renderer: WorldRenderer): RegionPresentationCache {
  const existing = caches.get(renderer);
  if (existing) return existing;
  const created = { materials: new Map<string, pc.StandardMaterial>() };
  caches.set(renderer, created);
  return created;
}
function material(cache: RegionPresentationCache, key: string, tint: readonly [number, number, number]): pc.StandardMaterial {
  const existing = cache.materials.get(key);
  if (existing) return existing;
  const created = makeMaterial([tint[0], tint[1], tint[2]]);
  cache.materials.set(key, created);
  return created;
}
function addBox(
  name: string,
  parent: pc.Entity,
  position: Vec3Tuple,
  scale: Vec3Tuple,
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

export function carpetProfileForCell(regionId: RegionId, hasHole: boolean): CarpetProfile {
  if (hasHole || regionId === 'ordinary-level-0') return { key: 'ordinary', tint: [0.79, 0.72, 0.55] };
  if (regionId === 'pillar-field') return { key: 'pillar', tint: [0.825, 0.755, 0.585] };
  return { key: 'arch', tint: [0.65, 0.60, 0.49], gloss: 0.11 };
}

function wrap01(value: number): number {
  return ((value % 1) + 1) % 1;
}

function carpetClone(
  source: pc.StandardMaterial,
  profile: CarpetProfile,
  key: string,
  tiling?: Vec2Tuple,
  offset?: Vec2Tuple
): pc.StandardMaterial {
  let variants = carpetClones.get(source);
  if (!variants) {
    variants = new Map<string, pc.StandardMaterial>();
    carpetClones.set(source, variants);
  }
  const existing = variants.get(key);
  if (existing) return existing;
  const clone = source.clone();
  clone.diffuse = new pc.Color(profile.tint[0], profile.tint[1], profile.tint[2]);
  if (profile.gloss !== undefined) clone.gloss = profile.gloss;
  if (tiling) clone.diffuseMapTiling = new pc.Vec2(tiling[0], tiling[1]);
  if (offset) (clone as unknown as { diffuseMapOffset: pc.Vec2 }).diffuseMapOffset = new pc.Vec2(offset[0], offset[1]);
  clone.update();
  variants.set(key, clone);
  return clone;
}

function applyCarpetPresentation(visual: CellVisual): void {
  const descriptor = visual.descriptor;
  if (descriptor.world.generationVersion !== 'gen3-v1') return;
  const hasHole = descriptor.floorPatches.some((patch) => patch.kind === 'hole');
  const profile = carpetProfileForCell(descriptor.world.regionId, hasHole);
  const fullFloor = entityByName(visual.root, 'floor');
  if (fullFloor?.render) {
    fullFloor.render.material = carpetClone(fullFloor.render.material as pc.StandardMaterial, profile, profile.key);
  }
  for (const child of childrenOf(visual.root)) {
    if (!child.name.startsWith('floor-piece:') || !child.render) continue;
    const position = child.getLocalPosition();
    const scale = child.getLocalScale();
    const minWorldX = descriptor.address.cellX * CELL_SIZE + position.x - scale.x / 2;
    const minWorldZ = descriptor.address.cellZ * CELL_SIZE + position.z - scale.z / 2;
    const tiling: Vec2Tuple = [scale.x / CARPET_REPEAT_METERS, scale.z / CARPET_REPEAT_METERS];
    const offset: Vec2Tuple = [wrap01(minWorldX / CARPET_REPEAT_METERS), wrap01(minWorldZ / CARPET_REPEAT_METERS)];
    const uvKey = `${profile.key}:${tiling[0].toFixed(4)}:${tiling[1].toFixed(4)}:${offset[0].toFixed(4)}:${offset[1].toFixed(4)}`;
    child.render.material = carpetClone(child.render.material as pc.StandardMaterial, profile, uvKey, tiling, offset);
  }
}

export function holeDepthBands(): readonly HoleDepthBand[] {
  return [
    { key: 'upper', top: -0.02, bottom: -0.72, tint: [0.10, 0.085, 0.052] },
    { key: 'middle', top: -0.72, bottom: -1.72, tint: [0.028, 0.024, 0.016] },
    { key: 'deep', top: -1.72, bottom: -4.48, tint: [0.0045, 0.0042, 0.0035] }
  ];
}

function addHoleBand(
  root: pc.Entity,
  hole: FloorPatchSpec,
  band: HoleDepthBand,
  value: pc.StandardMaterial
): void {
  const x = hole.position.x;
  const z = hole.position.z;
  const sx = hole.scale.x;
  const sz = hole.scale.z;
  const height = band.top - band.bottom;
  const y = (band.top + band.bottom) / 2;
  const edge = 0.05;
  addBox(`${hole.id}:depth-band:${band.key}:north`, root, [x, y, z - sz / 2], [sx, height, edge], value);
  addBox(`${hole.id}:depth-band:${band.key}:south`, root, [x, y, z + sz / 2], [sx, height, edge], value);
  addBox(`${hole.id}:depth-band:${band.key}:west`, root, [x - sx / 2, y, z], [edge, height, sz], value);
  addBox(`${hole.id}:depth-band:${band.key}:east`, root, [x + sx / 2, y, z], [edge, height, sz], value);
}

function replaceHoleDepth(renderer: WorldRenderer, visual: CellVisual): void {
  const holes = visual.descriptor.floorPatches.filter((patch) => patch.kind === 'hole');
  if (holes.length === 0) return;
  const cache = cacheFor(renderer);
  for (const hole of holes) {
    for (const name of [
      `${hole.id}:depth`, `${hole.id}:north-side`, `${hole.id}:south-side`, `${hole.id}:west-side`, `${hole.id}:east-side`
    ]) entityByName(visual.root, name)?.destroy();
    for (const child of childrenOf(visual.root)) {
      if (child.name.startsWith(`${hole.id}:depth-band:`) || child.name === `${hole.id}:depth-void`) child.destroy();
    }
    for (const band of holeDepthBands()) addHoleBand(visual.root, hole, band, material(cache, `hole:${band.key}`, band.tint));
    addBox(
      `${hole.id}:depth-void`,
      visual.root,
      [hole.position.x, -4.52, hole.position.z],
      [hole.scale.x * 0.96, 0.04, hole.scale.z * 0.96],
      material(cache, 'hole:void', [0.0015, 0.0015, 0.0012])
    );
  }
}

function wallMinY(wall: WallSpec): number { return wall.cy - wall.sy / 2; }
function wallMaxY(wall: WallSpec): number { return wall.cy + wall.sy / 2; }
function longInterval(wall: WallSpec): Interval {
  return wall.orientation === 'z'
    ? [wall.cx - wall.sx / 2, wall.cx + wall.sx / 2]
    : [wall.cz - wall.sz / 2, wall.cz + wall.sz / 2];
}
function fixedCoordinate(wall: WallSpec): number { return wall.orientation === 'z' ? wall.cz : wall.cx; }
function isArchHeader(wall: WallSpec): boolean {
  return wall.materialId === 'arch-pale-wallpaper'
    && Math.abs(wall.sy - ARCH_HEADER_HEIGHT) < 0.055
    && Math.abs(wallMaxY(wall) - WALL_HEIGHT) < 0.045;
}
function isArchVerticalSolid(wall: WallSpec): boolean {
  const headerBottom = WALL_HEIGHT - ARCH_HEADER_HEIGHT;
  return wall.materialId === 'arch-pale-wallpaper'
    && wallMinY(wall) <= ARCH_LOWER_HEIGHT + 0.065
    && wallMaxY(wall) >= headerBottom - 0.045
    && wall.sy > 1.35;
}
function archLines(descriptor: CellDescriptor): Map<string, ArchLine> {
  const lines = new Map<string, ArchLine>();
  for (const header of descriptor.walls.filter(isArchHeader)) {
    const fixed = fixedCoordinate(header);
    const key = `${header.orientation}:${fixed.toFixed(3)}`;
    const line = lines.get(key) ?? { orientation: header.orientation, fixed, headers: [], solids: [] };
    line.headers.push(header);
    lines.set(key, line);
  }
  for (const wall of descriptor.walls.filter(isArchVerticalSolid)) {
    const key = `${wall.orientation}:${fixedCoordinate(wall).toFixed(3)}`;
    const line = lines.get(key);
    if (line) line.solids.push(longInterval(wall));
  }
  return lines;
}
function mergeIntervals(intervals: readonly Interval[]): Interval[] {
  const sorted = [...intervals].sort((left, right) => left[0] - right[0]);
  const merged: Array<[number, number]> = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval[0] <= last[1] + 0.03) last[1] = Math.max(last[1], interval[1]);
    else merged.push([interval[0], interval[1]]);
  }
  return merged;
}
function subtractSolids(interval: Interval, solids: readonly Interval[]): Interval[] {
  let pieces: Interval[] = [interval];
  for (const solid of solids) {
    pieces = pieces.flatMap(([start, end]) => {
      if (solid[1] <= start || solid[0] >= end) return [[start, end] as const];
      const next: Interval[] = [];
      if (solid[0] - start > 0.04) next.push([start, Math.min(end, solid[0])]);
      if (end - solid[1] > 0.04) next.push([Math.max(start, solid[1]), end]);
      return next;
    });
  }
  return pieces;
}

function archCurveOpeningsForCell(descriptor: CellDescriptor): ArchCurveOpening[] {
  if (descriptor.world.generationVersion !== 'gen3-v1' || descriptor.world.regionId !== 'arch-rooms') return [];
  const output: ArchCurveOpening[] = [];
  const headerBottom = WALL_HEIGHT - ARCH_HEADER_HEIGHT;
  const springY = Math.max(ARCH_LOWER_HEIGHT + 0.52, 1.52);
  const apexY = headerBottom - 0.035;
  for (const [lineKey, line] of archLines(descriptor)) {
    const solids = mergeIntervals(line.solids);
    let openingIndex = 0;
    for (const header of line.headers) {
      for (const opening of subtractSolids(longInterval(header), solids)) {
        const width = opening[1] - opening[0];
        if (width < 1.7 || width > 6.4) continue;
        output.push({
          id: `arch-curve:${lineKey}:${openingIndex++}`,
          sourceWallId: header.id,
          orientation: line.orientation,
          fixed: line.fixed,
          start: opening[0],
          end: opening[1],
          springY,
          apexY,
          headerBottom
        });
      }
    }
  }
  return output;
}

function archCurveY(opening: ArchCurveOpening, along: number): number {
  const center = (opening.start + opening.end) / 2;
  const halfWidth = (opening.end - opening.start) / 2;
  const normalized = Math.min(1, Math.abs(along - center) / halfWidth);
  return opening.springY
    + (opening.apexY - opening.springY) * Math.sqrt(Math.max(0, 1 - normalized * normalized));
}

export function archCurveSegmentsForCell(descriptor: CellDescriptor): ArchCurveSegment[] {
  const output: ArchCurveSegment[] = [];
  for (const opening of archCurveOpeningsForCell(descriptor)) {
    const width = opening.end - opening.start;
    for (let index = 0; index < ARCH_CURVE_SEGMENTS; index += 1) {
      const start = opening.start + width * index / ARCH_CURVE_SEGMENTS;
      const end = opening.start + width * (index + 1) / ARCH_CURVE_SEGMENTS;
      const bottom = Math.min(archCurveY(opening, start), archCurveY(opening, end));
      const height = opening.headerBottom - bottom;
      if (height < 0.025) continue;
      const along = (start + end) / 2;
      output.push({
        id: `${opening.id}:${index}`,
        sourceWallId: opening.sourceWallId,
        position: opening.orientation === 'z'
          ? [along, bottom + height / 2, opening.fixed]
          : [opening.fixed, bottom + height / 2, along],
        scale: opening.orientation === 'z'
          ? [end - start, height, WALL_THICKNESS + 0.008]
          : [WALL_THICKNESS + 0.008, height, end - start]
      });
    }
  }
  return output;
}

export function archHeaderBridgeSegmentsForCell(descriptor: CellDescriptor): ArchCurveSegment[] {
  if (descriptor.world.generationVersion !== 'gen3-v1' || descriptor.world.regionId !== 'arch-rooms') return [];
  const output: ArchCurveSegment[] = [];
  for (const [lineKey, line] of archLines(descriptor)) {
    const headers = [...line.headers].sort((left, right) => longInterval(left)[0] - longInterval(right)[0]);
    for (let index = 1; index < headers.length; index += 1) {
      const previous = headers[index - 1];
      const current = headers[index];
      if (!previous || !current) continue;
      const previousInterval = longInterval(previous);
      const currentInterval = longInterval(current);
      const gap = currentInterval[0] - previousInterval[1];
      if (gap <= 0.035 || gap > ARCH_HEADER_BRIDGE_MAX_GAP) continue;
      const along = (previousInterval[1] + currentInterval[0]) / 2;
      output.push({
        id: `arch-header-bridge:${lineKey}:${index}`,
        sourceWallId: previous.id,
        position: line.orientation === 'z'
          ? [along, WALL_HEIGHT - ARCH_HEADER_HEIGHT / 2, line.fixed]
          : [line.fixed, WALL_HEIGHT - ARCH_HEADER_HEIGHT / 2, along],
        scale: line.orientation === 'z'
          ? [gap, ARCH_HEADER_HEIGHT, WALL_THICKNESS + 0.008]
          : [WALL_THICKNESS + 0.008, ARCH_HEADER_HEIGHT, gap]
      });
    }
  }
  return output;
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
function curvePoint(opening: ArchCurveOpening, along: number, y: number, normalOffset: number): Vec3Tuple {
  return opening.orientation === 'z'
    ? [along, y, opening.fixed + normalOffset]
    : [opening.fixed + normalOffset, y, along];
}
function curveUv(along: number, y: number): Vec2Tuple {
  return [along / ARCH_UV_REPEAT_METERS, y / ARCH_UV_REPEAT_METERS];
}
function pushQuad(
  positions: number[],
  normals: number[],
  uvs: number[],
  indices: number[],
  points: readonly [Vec3Tuple, Vec3Tuple, Vec3Tuple, Vec3Tuple],
  texcoords: readonly [Vec2Tuple, Vec2Tuple, Vec2Tuple, Vec2Tuple],
  desiredNormal: Vec3Tuple
): void {
  let orderedPoints = [...points] as Vec3Tuple[];
  let orderedUvs = [...texcoords] as Vec2Tuple[];
  let normal = normalize(cross(subtract(orderedPoints[1]!, orderedPoints[0]!), subtract(orderedPoints[2]!, orderedPoints[0]!)));
  if (dot(normal, desiredNormal) < 0) {
    orderedPoints = [orderedPoints[0]!, orderedPoints[3]!, orderedPoints[2]!, orderedPoints[1]!];
    orderedUvs = [orderedUvs[0]!, orderedUvs[3]!, orderedUvs[2]!, orderedUvs[1]!];
    normal = normalize(cross(subtract(orderedPoints[1]!, orderedPoints[0]!), subtract(orderedPoints[2]!, orderedPoints[0]!)));
  }
  const base = positions.length / 3;
  for (let index = 0; index < 4; index += 1) {
    const point = orderedPoints[index]!;
    const uv = orderedUvs[index]!;
    positions.push(point[0], point[1], point[2]);
    normals.push(normal[0], normal[1], normal[2]);
    uvs.push(uv[0], uv[1]);
  }
  indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function addArchCurveMesh(
  renderer: WorldRenderer,
  root: pc.Entity,
  opening: ArchCurveOpening,
  value: pc.StandardMaterial
): void {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const halfThickness = (WALL_THICKNESS + 0.01) / 2;
  const width = opening.end - opening.start;
  const frontNormal: Vec3Tuple = opening.orientation === 'z' ? [0, 0, -1] : [-1, 0, 0];
  const backNormal: Vec3Tuple = opening.orientation === 'z' ? [0, 0, 1] : [1, 0, 0];

  for (let index = 0; index < ARCH_CURVE_SEGMENTS; index += 1) {
    const start = opening.start + width * index / ARCH_CURVE_SEGMENTS;
    const end = opening.start + width * (index + 1) / ARCH_CURVE_SEGMENTS;
    const startY = archCurveY(opening, start);
    const endY = archCurveY(opening, end);
    const startUvBottom = curveUv(start, startY);
    const endUvBottom = curveUv(end, endY);
    const startUvTop = curveUv(start, opening.headerBottom);
    const endUvTop = curveUv(end, opening.headerBottom);

    pushQuad(
      positions, normals, uvs, indices,
      [
        curvePoint(opening, start, startY, -halfThickness),
        curvePoint(opening, start, opening.headerBottom, -halfThickness),
        curvePoint(opening, end, opening.headerBottom, -halfThickness),
        curvePoint(opening, end, endY, -halfThickness)
      ],
      [startUvBottom, startUvTop, endUvTop, endUvBottom],
      frontNormal
    );
    pushQuad(
      positions, normals, uvs, indices,
      [
        curvePoint(opening, start, startY, halfThickness),
        curvePoint(opening, end, endY, halfThickness),
        curvePoint(opening, end, opening.headerBottom, halfThickness),
        curvePoint(opening, start, opening.headerBottom, halfThickness)
      ],
      [startUvBottom, endUvBottom, endUvTop, startUvTop],
      backNormal
    );
    pushQuad(
      positions, normals, uvs, indices,
      [
        curvePoint(opening, start, startY, -halfThickness),
        curvePoint(opening, end, endY, -halfThickness),
        curvePoint(opening, end, endY, halfThickness),
        curvePoint(opening, start, startY, halfThickness)
      ],
      [[start / ARCH_UV_REPEAT_METERS, 0], [end / ARCH_UV_REPEAT_METERS, 0], [end / ARCH_UV_REPEAT_METERS, 0.16], [start / ARCH_UV_REPEAT_METERS, 0.16]],
      [0, -1, 0]
    );
  }

  const app = (renderer as unknown as RendererAccess).app;
  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(positions);
  mesh.setNormals(normals);
  mesh.setUvs(0, uvs);
  mesh.setIndices(indices);
  mesh.update();
  const meshInstance = new pc.MeshInstance(mesh, value);
  const entity = new pc.Entity(`${opening.id}:mesh`);
  entity.addComponent('render', { meshInstances: [meshInstance] });
  root.addChild(entity);
}

function renderArchPresentation(renderer: WorldRenderer, visual: CellVisual): void {
  for (const child of childrenOf(visual.root)) {
    if (child.name.startsWith('arch-curve:') || child.name.startsWith('arch-header-bridge:')) child.destroy();
  }
  for (const segment of archHeaderBridgeSegmentsForCell(visual.descriptor)) {
    const source = entityByName(visual.root, segment.sourceWallId);
    if (!source?.render) continue;
    addBox(segment.id, visual.root, segment.position, segment.scale, source.render.material as pc.StandardMaterial);
  }
  for (const opening of archCurveOpeningsForCell(visual.descriptor)) {
    const source = entityByName(visual.root, opening.sourceWallId);
    if (!source?.render) continue;
    addArchCurveMesh(renderer, visual.root, opening, source.render.material as pc.StandardMaterial);
  }
}

function applyRegionPresentation(renderer: WorldRenderer, visual: CellVisual): void {
  if (visual.descriptor.world.generationVersion !== 'gen3-v1') return;
  replaceHoleDepth(renderer, visual);
  renderArchPresentation(renderer, visual);
  applyCarpetPresentation(visual);
}

/**
 * Installs renderer-only Level 0 Region presentation. World descriptors keep
 * authoritative topology/material identities; this layer owns Arch curve meshes,
 * Hole depth visuals, and Region carpet finish/UV presentation.
 */
export function installLevel0RegionPresentation(): void {
  if (installed) return;
  installed = true;
  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function patchedRegionPresentationLoad(this: WorldRenderer, descriptor: CellDescriptor): void {
    originalLoadCell.call(this, descriptor);
    const visual = this.loaded.get(descriptor.id);
    if (visual) applyRegionPresentation(this, visual);
  };
}
