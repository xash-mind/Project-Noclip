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

interface WorldArchWall {
  id: string;
  cellId: string;
  orientation: WallSpec['orientation'];
  fixed: number;
  start: number;
  end: number;
  minY: number;
  maxY: number;
}
interface WorldArchLine {
  key: string;
  orientation: WallSpec['orientation'];
  fixed: number;
  headers: WorldArchWall[];
  lowers: WorldArchWall[];
  solids: WorldArchWall[];
}
export interface ArchFrameBay {
  id: string;
  lineKey: string;
  orientation: WallSpec['orientation'];
  fixed: number;
  start: number;
  end: number;
  curveStart: number;
  curveEnd: number;
  route: boolean;
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
const ARCH_CURVE_SEGMENTS = 18;
const ARCH_HEADER_BRIDGE_MAX_GAP = 4.1;
const ARCH_CURVE_MAX_WIDTH = 1.62;
const ARCH_CURVE_MIN_WIDTH = 1.28;
const ARCH_UPPER_BOTTOM = 2.02;
const ARCH_UPPER_TOP = WALL_HEIGHT - 0.14;
const ARCH_CURVE_APEX = Math.min(ARCH_UPPER_TOP - 0.24, 2.56);
const ARCH_JOIN_OVERLAP = 0.035;
const ARCH_PIER_DEPTH = WALL_THICKNESS + 0.10;
const ARCH_UPPER_DEPTH = WALL_THICKNESS + 0.16;
const ARCH_LOWER_PANEL_DEPTH = Math.max(0.14, WALL_THICKNESS - 0.10);
const ARCH_LOWER_PANEL_HEIGHT = Math.min(ARCH_LOWER_HEIGHT - 0.06, 0.94);
const ARCH_FRAME_PREFIX = 'arch-frame:';
const ARCH_PIER_TINT: readonly [number, number, number] = [0.76, 0.735, 0.665];
const ARCH_UPPER_TINT: readonly [number, number, number] = [0.955, 0.945, 0.885];
const ARCH_PANEL_TINT: readonly [number, number, number] = [0.885, 0.872, 0.805];

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
function isArchLower(wall: WallSpec): boolean {
  return wall.materialId === 'arch-pale-wallpaper'
    && Math.abs(wall.sy - ARCH_LOWER_HEIGHT) < 0.065
    && wallMinY(wall) <= 0.045;
}
function isArchVerticalSolid(wall: WallSpec): boolean {
  const headerBottom = WALL_HEIGHT - ARCH_HEADER_HEIGHT;
  return wall.materialId === 'arch-pale-wallpaper'
    && wallMinY(wall) <= ARCH_LOWER_HEIGHT + 0.065
    && wallMaxY(wall) >= headerBottom - 0.045
    && wall.sy > 1.35;
}

function toWorldArchWall(descriptor: CellDescriptor, wall: WallSpec): WorldArchWall {
  const baseX = descriptor.address.cellX * CELL_SIZE;
  const baseZ = descriptor.address.cellZ * CELL_SIZE;
  const interval = longInterval(wall);
  return {
    id: wall.id,
    cellId: descriptor.id,
    orientation: wall.orientation,
    fixed: fixedCoordinate(wall) + (wall.orientation === 'z' ? baseZ : baseX),
    start: interval[0] + (wall.orientation === 'z' ? baseX : baseZ),
    end: interval[1] + (wall.orientation === 'z' ? baseX : baseZ),
    minY: wallMinY(wall),
    maxY: wallMaxY(wall)
  };
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

function overlapsInterval(left: Interval, right: Interval): boolean {
  return left[1] > right[0] + 0.01 && left[0] < right[1] - 0.01;
}

function archLinesForDescriptors(descriptors: readonly CellDescriptor[]): Map<string, WorldArchLine> {
  const lines = new Map<string, WorldArchLine>();
  for (const descriptor of descriptors) {
    if (descriptor.world.generationVersion !== 'gen3-v1') continue;
    for (const wall of descriptor.walls) {
      if (!isArchHeader(wall)) continue;
      const world = toWorldArchWall(descriptor, wall);
      const key = `${world.orientation}:${world.fixed.toFixed(3)}`;
      const line = lines.get(key) ?? { key, orientation: world.orientation, fixed: world.fixed, headers: [], lowers: [], solids: [] };
      line.headers.push(world);
      lines.set(key, line);
    }
  }
  for (const descriptor of descriptors) {
    if (descriptor.world.generationVersion !== 'gen3-v1') continue;
    for (const wall of descriptor.walls) {
      if (!isArchLower(wall) && !isArchVerticalSolid(wall)) continue;
      const world = toWorldArchWall(descriptor, wall);
      const key = `${world.orientation}:${world.fixed.toFixed(3)}`;
      const line = lines.get(key);
      if (!line) continue;
      const headerIntervals = mergeIntervals(line.headers.map((header) => [header.start, header.end] as const));
      if (!headerIntervals.some((header) => overlapsInterval(header, [world.start, world.end]))) continue;
      if (isArchLower(wall)) line.lowers.push(world);
      if (isArchVerticalSolid(wall)) line.solids.push(world);
    }
  }
  return lines;
}

function mergedHeaderRuns(line: WorldArchLine): Interval[] {
  const raw = mergeIntervals(line.headers.map((header) => [header.start, header.end] as const));
  if (raw.length < 2) return raw;
  const bridged: Array<[number, number]> = [];
  for (const interval of raw) {
    const previous = bridged[bridged.length - 1];
    const gap = previous ? interval[0] - previous[1] : Number.POSITIVE_INFINITY;
    if (previous && gap > 0.03 && gap <= ARCH_HEADER_BRIDGE_MAX_GAP) previous[1] = interval[1];
    else bridged.push([interval[0], interval[1]]);
  }
  return bridged;
}

function curveWidthForBay(width: number): number {
  return Math.min(ARCH_CURVE_MAX_WIDTH, Math.max(ARCH_CURVE_MIN_WIDTH, width * 0.34));
}

function intervalContains(intervals: readonly Interval[], point: number, margin = 0.06): boolean {
  return intervals.some(([start, end]) => point >= start + margin && point <= end - margin);
}

function frameBaysForLine(line: WorldArchLine): ArchFrameBay[] {
  const headers = mergedHeaderRuns(line);
  const solids = mergeIntervals(line.solids.map((wall) => [wall.start, wall.end] as const));
  const lowers = mergeIntervals(line.lowers.map((wall) => [wall.start, wall.end] as const));
  const bays: ArchFrameBay[] = [];
  let bayIndex = 0;
  for (const header of headers) {
    const supports = solids.filter((solid) => overlapsInterval(solid, header));
    for (let index = 1; index < supports.length; index += 1) {
      const left = supports[index - 1];
      const right = supports[index];
      if (!left || !right) continue;
      const start = left[1];
      const end = right[0];
      const width = end - start;
      if (width < 1.7 || width > 6.4) continue;
      const center = (start + end) / 2;
      const curveWidth = curveWidthForBay(width);
      bays.push({
        id: `${line.key}:${bayIndex++}`,
        lineKey: line.key,
        orientation: line.orientation,
        fixed: line.fixed,
        start,
        end,
        curveStart: center - curveWidth / 2,
        curveEnd: center + curveWidth / 2,
        route: !intervalContains(lowers, center)
      });
    }
  }
  return bays;
}

export function archFrameBaysForDescriptors(descriptors: readonly CellDescriptor[]): ArchFrameBay[] {
  return [...archLinesForDescriptors(descriptors).values()].flatMap(frameBaysForLine);
}

function localArchLines(descriptor: CellDescriptor): Map<string, WorldArchLine> {
  return archLinesForDescriptors([descriptor]);
}

function curveY(start: number, end: number, along: number): number {
  const center = (start + end) / 2;
  const halfWidth = (end - start) / 2;
  const normalized = Math.min(1, Math.abs(along - center) / Math.max(0.001, halfWidth));
  return ARCH_UPPER_BOTTOM
    + (ARCH_CURVE_APEX - ARCH_UPPER_BOTTOM) * Math.sqrt(Math.max(0, 1 - normalized * normalized));
}

export function archCurveSegmentsForCell(descriptor: CellDescriptor): ArchCurveSegment[] {
  const output: ArchCurveSegment[] = [];
  const baseX = descriptor.address.cellX * CELL_SIZE;
  const baseZ = descriptor.address.cellZ * CELL_SIZE;
  for (const line of localArchLines(descriptor).values()) {
    for (const bay of frameBaysForLine(line)) {
      const width = bay.curveEnd - bay.curveStart;
      for (let index = 0; index < ARCH_CURVE_SEGMENTS; index += 1) {
        const start = bay.curveStart + width * index / ARCH_CURVE_SEGMENTS;
        const end = bay.curveStart + width * (index + 1) / ARCH_CURVE_SEGMENTS;
        const bottom = Math.min(curveY(bay.curveStart, bay.curveEnd, start), curveY(bay.curveStart, bay.curveEnd, end));
        const height = ARCH_UPPER_TOP - bottom;
        if (height < 0.025) continue;
        const along = (start + end) / 2;
        output.push({
          id: `arch-frame:curve-segment:${bay.id}:${index}`,
          sourceWallId: line.headers[0]?.id ?? bay.id,
          position: bay.orientation === 'z'
            ? [along - baseX, bottom + height / 2, bay.fixed - baseZ]
            : [bay.fixed - baseX, bottom + height / 2, along - baseZ],
          scale: bay.orientation === 'z'
            ? [end - start, height, ARCH_UPPER_DEPTH]
            : [ARCH_UPPER_DEPTH, height, end - start]
        });
      }
    }
  }
  return output;
}

export function archHeaderBridgeSegmentsForCell(_descriptor: CellDescriptor): ArchCurveSegment[] {
  return [];
}

function cellAlongBounds(descriptor: CellDescriptor, orientation: WallSpec['orientation']): Interval {
  const center = orientation === 'z'
    ? descriptor.address.cellX * CELL_SIZE
    : descriptor.address.cellZ * CELL_SIZE;
  return [center - CELL_SIZE / 2, center + CELL_SIZE / 2];
}
function perpendicularCellOwner(fixed: number): number {
  return Math.floor((fixed + CELL_SIZE / 2) / CELL_SIZE);
}
function cellOwnsLine(descriptor: CellDescriptor, orientation: WallSpec['orientation'], fixed: number): boolean {
  return orientation === 'z'
    ? descriptor.address.cellZ === perpendicularCellOwner(fixed)
    : descriptor.address.cellX === perpendicularCellOwner(fixed);
}
function clippedInterval(descriptor: CellDescriptor, orientation: WallSpec['orientation'], start: number, end: number): Interval | undefined {
  const [cellStart, cellEnd] = cellAlongBounds(descriptor, orientation);
  const clippedStart = Math.max(start, cellStart);
  const clippedEnd = Math.min(end, cellEnd);
  return clippedEnd - clippedStart > 0.015 ? [clippedStart, clippedEnd] : undefined;
}
function localBoxPosition(
  descriptor: CellDescriptor,
  orientation: WallSpec['orientation'],
  fixed: number,
  along: number,
  y: number
): Vec3Tuple {
  const baseX = descriptor.address.cellX * CELL_SIZE;
  const baseZ = descriptor.address.cellZ * CELL_SIZE;
  return orientation === 'z'
    ? [along - baseX, y, fixed - baseZ]
    : [fixed - baseX, y, along - baseZ];
}
function localBoxScale(orientation: WallSpec['orientation'], length: number, height: number, depth: number): Vec3Tuple {
  return orientation === 'z'
    ? [length, height, depth]
    : [depth, height, length];
}

function addWorldBoxClipped(
  visual: CellVisual,
  name: string,
  orientation: WallSpec['orientation'],
  fixed: number,
  start: number,
  end: number,
  y: number,
  height: number,
  depth: number,
  value: pc.StandardMaterial
): void {
  const descriptor = visual.descriptor;
  if (!cellOwnsLine(descriptor, orientation, fixed)) return;
  const clip = clippedInterval(descriptor, orientation, start, end);
  if (!clip) return;
  const along = (clip[0] + clip[1]) / 2;
  addBox(
    `${ARCH_FRAME_PREFIX}${name}`,
    visual.root,
    localBoxPosition(descriptor, orientation, fixed, along, y),
    localBoxScale(orientation, clip[1] - clip[0], height, depth),
    value
  );
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
  let normal = normalize(cross(subtract(ordered[1]!, ordered[0]!), subtract(ordered[2]!, ordered[0]!)));
  if (dot(normal, desiredNormal) < 0) {
    ordered = [ordered[0]!, ordered[3]!, ordered[2]!, ordered[1]!];
    normal = normalize(cross(subtract(ordered[1]!, ordered[0]!), subtract(ordered[2]!, ordered[0]!)));
  }
  const base = positions.length / 3;
  for (const point of ordered) {
    positions.push(point[0], point[1], point[2]);
    normals.push(normal[0], normal[1], normal[2]);
  }
  indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function curvePoint(
  descriptor: CellDescriptor,
  orientation: WallSpec['orientation'],
  fixed: number,
  along: number,
  y: number,
  normalOffset: number
): Vec3Tuple {
  const baseX = descriptor.address.cellX * CELL_SIZE;
  const baseZ = descriptor.address.cellZ * CELL_SIZE;
  return orientation === 'z'
    ? [along - baseX, y, fixed - baseZ + normalOffset]
    : [fixed - baseX + normalOffset, y, along - baseZ];
}

function addCurveMeshClipped(
  renderer: WorldRenderer,
  visual: CellVisual,
  bay: ArchFrameBay,
  value: pc.StandardMaterial
): void {
  const descriptor = visual.descriptor;
  if (!cellOwnsLine(descriptor, bay.orientation, bay.fixed)) return;
  const clip = clippedInterval(descriptor, bay.orientation, bay.curveStart, bay.curveEnd);
  if (!clip) return;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const halfDepth = ARCH_UPPER_DEPTH / 2;
  const fullWidth = bay.curveEnd - bay.curveStart;
  const step = fullWidth / ARCH_CURVE_SEGMENTS;
  const startIndex = Math.max(0, Math.floor((clip[0] - bay.curveStart) / step));
  const endIndex = Math.min(ARCH_CURVE_SEGMENTS, Math.ceil((clip[1] - bay.curveStart) / step));
  const frontNormal: Vec3Tuple = bay.orientation === 'z' ? [0, 0, -1] : [-1, 0, 0];
  const backNormal: Vec3Tuple = bay.orientation === 'z' ? [0, 0, 1] : [1, 0, 0];

  for (let index = startIndex; index < endIndex; index += 1) {
    const start = Math.max(clip[0], bay.curveStart + step * index);
    const end = Math.min(clip[1], bay.curveStart + step * (index + 1));
    if (end - start <= 0.005) continue;
    const startY = curveY(bay.curveStart, bay.curveEnd, start);
    const endY = curveY(bay.curveStart, bay.curveEnd, end);
    pushQuad(positions, normals, indices, [
      curvePoint(descriptor, bay.orientation, bay.fixed, start, startY, -halfDepth),
      curvePoint(descriptor, bay.orientation, bay.fixed, start, ARCH_UPPER_TOP, -halfDepth),
      curvePoint(descriptor, bay.orientation, bay.fixed, end, ARCH_UPPER_TOP, -halfDepth),
      curvePoint(descriptor, bay.orientation, bay.fixed, end, endY, -halfDepth)
    ], frontNormal);
    pushQuad(positions, normals, indices, [
      curvePoint(descriptor, bay.orientation, bay.fixed, start, startY, halfDepth),
      curvePoint(descriptor, bay.orientation, bay.fixed, end, endY, halfDepth),
      curvePoint(descriptor, bay.orientation, bay.fixed, end, ARCH_UPPER_TOP, halfDepth),
      curvePoint(descriptor, bay.orientation, bay.fixed, start, ARCH_UPPER_TOP, halfDepth)
    ], backNormal);
    pushQuad(positions, normals, indices, [
      curvePoint(descriptor, bay.orientation, bay.fixed, start, startY, -halfDepth),
      curvePoint(descriptor, bay.orientation, bay.fixed, end, endY, -halfDepth),
      curvePoint(descriptor, bay.orientation, bay.fixed, end, endY, halfDepth),
      curvePoint(descriptor, bay.orientation, bay.fixed, start, startY, halfDepth)
    ], [0, -1, 0]);
  }
  if (positions.length === 0) return;
  const app = (renderer as unknown as RendererAccess).app;
  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(positions);
  mesh.setNormals(normals);
  mesh.setIndices(indices);
  mesh.update();
  const meshInstance = new pc.MeshInstance(mesh, value);
  const entity = new pc.Entity(`${ARCH_FRAME_PREFIX}curve:${bay.id}:${descriptor.id}`);
  entity.addComponent('render', { meshInstances: [meshInstance] });
  visual.root.addChild(entity);
}

function dividerSourceWallIds(lines: Map<string, WorldArchLine>): Set<string> {
  const ids = new Set<string>();
  for (const line of lines.values()) {
    for (const wall of [...line.headers, ...line.lowers, ...line.solids]) ids.add(wall.id);
  }
  return ids;
}

function clearArchFrameVisuals(visual: CellVisual): void {
  for (const child of childrenOf(visual.root)) {
    if (
      child.name.startsWith(ARCH_FRAME_PREFIX)
      || child.name.startsWith('arch-curve:')
      || child.name.startsWith('arch-header-bridge:')
    ) child.destroy();
  }
}

function resetSemanticArchMeshes(visual: CellVisual): void {
  for (const wall of visual.descriptor.walls) {
    if (wall.materialId !== 'arch-pale-wallpaper') continue;
    if (!isArchHeader(wall) && !isArchLower(wall) && !isArchVerticalSolid(wall)) continue;
    const source = entityByName(visual.root, wall.id);
    if (source?.render) source.render.enabled = true;
  }
}

function hideSemanticDividerMeshes(visual: CellVisual, ids: Set<string>): void {
  for (const id of ids) {
    const source = entityByName(visual.root, id);
    if (source?.render) source.render.enabled = false;
  }
}

function renderArchFrames(renderer: WorldRenderer): void {
  const visuals = [...renderer.loaded.values()];
  const descriptors = visuals.map((visual) => visual.descriptor);
  const lines = archLinesForDescriptors(descriptors);
  const sourceIds = dividerSourceWallIds(lines);
  const cache = cacheFor(renderer);
  const pierMaterial = material(cache, 'arch-frame:pier', ARCH_PIER_TINT);
  const upperMaterial = material(cache, 'arch-frame:upper', ARCH_UPPER_TINT);
  const panelMaterial = material(cache, 'arch-frame:panel', ARCH_PANEL_TINT);

  for (const visual of visuals) {
    clearArchFrameVisuals(visual);
    if (visual.descriptor.world.generationVersion === 'gen3-v1') {
      resetSemanticArchMeshes(visual);
      hideSemanticDividerMeshes(visual, sourceIds);
    }
  }

  for (const line of lines.values()) {
    const bays = frameBaysForLine(line);
    const activeSupportIntervals = mergeIntervals(line.solids.map((wall) => [wall.start, wall.end] as const))
      .filter((support) => bays.some((bay) => Math.abs(support[1] - bay.start) < 0.08 || Math.abs(support[0] - bay.end) < 0.08));
    for (const visual of visuals) {
      if (visual.descriptor.world.generationVersion !== 'gen3-v1') continue;
      for (let index = 0; index < activeSupportIntervals.length; index += 1) {
        const support = activeSupportIntervals[index]!;
        addWorldBoxClipped(
          visual,
          `pier:${line.key}:${index}`,
          line.orientation,
          line.fixed,
          support[0],
          support[1],
          WALL_HEIGHT / 2,
          WALL_HEIGHT,
          ARCH_PIER_DEPTH,
          pierMaterial
        );
      }
      for (const bay of bays) {
        const shoulderHeight = ARCH_UPPER_TOP - ARCH_UPPER_BOTTOM;
        addWorldBoxClipped(
          visual,
          `shoulder-left:${bay.id}`,
          bay.orientation,
          bay.fixed,
          bay.start - ARCH_JOIN_OVERLAP,
          bay.curveStart + ARCH_JOIN_OVERLAP,
          ARCH_UPPER_BOTTOM + shoulderHeight / 2,
          shoulderHeight,
          ARCH_UPPER_DEPTH,
          upperMaterial
        );
        addWorldBoxClipped(
          visual,
          `shoulder-right:${bay.id}`,
          bay.orientation,
          bay.fixed,
          bay.curveEnd - ARCH_JOIN_OVERLAP,
          bay.end + ARCH_JOIN_OVERLAP,
          ARCH_UPPER_BOTTOM + shoulderHeight / 2,
          shoulderHeight,
          ARCH_UPPER_DEPTH,
          upperMaterial
        );
        addCurveMeshClipped(renderer, visual, bay, upperMaterial);
        if (!bay.route) {
          addWorldBoxClipped(
            visual,
            `lower-panel:${bay.id}`,
            bay.orientation,
            bay.fixed,
            bay.start + 0.02,
            bay.end - 0.02,
            ARCH_LOWER_PANEL_HEIGHT / 2,
            ARCH_LOWER_PANEL_HEIGHT,
            ARCH_LOWER_PANEL_DEPTH,
            panelMaterial
          );
        }
      }
    }
  }
}

function applyRegionPresentation(renderer: WorldRenderer, visual: CellVisual): void {
  if (visual.descriptor.world.generationVersion !== 'gen3-v1') return;
  replaceHoleDepth(renderer, visual);
  applyCarpetPresentation(visual);
}

/**
 * Installs renderer-only Level 0 Region presentation. World descriptors retain
 * topology/collision ownership; A-A1 is reconstructed from those world-space
 * divider runs so streaming Cells only clip one continuous heavy frame.
 */
export function installLevel0RegionPresentation(): void {
  if (installed) return;
  installed = true;
  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function patchedRegionPresentationLoad(this: WorldRenderer, descriptor: CellDescriptor): void {
    const alreadyLoaded = this.loaded.has(descriptor.id);
    originalLoadCell.call(this, descriptor);
    const visual = this.loaded.get(descriptor.id);
    if (visual && !alreadyLoaded) applyRegionPresentation(this, visual);
    renderArchFrames(this);
  };

  const originalUnloadCell = WorldRenderer.prototype.unloadCell;
  WorldRenderer.prototype.unloadCell = function patchedRegionPresentationUnload(this: WorldRenderer, cellId: string): void {
    originalUnloadCell.call(this, cellId);
    renderArchFrames(this);
  };
}
