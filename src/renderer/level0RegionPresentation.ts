import * as pc from 'playcanvas';
import { ARCH_HEADER_HEIGHT, ARCH_LOWER_HEIGHT, ARCH_SHOULDER_SPAN_SCALE, preservedArchCurveWidth } from '../world/gen3ArchitectureCore.js';
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

// Keep the accepted A-A1 silhouette, but use a small fixed set of shared box
// primitives instead of allocating one-off custom GPU meshes while streaming.
const ARCH_CURVE_SEGMENTS = 12;
const ARCH_HEADER_BRIDGE_MAX_GAP = 4.1;
const ARCH_UPPER_BOTTOM = 1.92;
const ARCH_UPPER_TOP = WALL_HEIGHT - 0.24;
const ARCH_CURVE_APEX = Math.min(ARCH_UPPER_TOP - 0.24, 2.46);
const ARCH_CELL_SEAM_HANDOFF = 0.012;
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

function material(
  cache: RegionPresentationCache,
  key: string,
  tint: readonly [number, number, number]
): pc.StandardMaterial {
  const existing = cache.materials.get(key);
  if (existing) return existing;
  const created = makeMaterial([tint[0], tint[1], tint[2]]);
  cache.materials.set(key, created);
  return created;
}

function lightlessBlackMaterial(cache: RegionPresentationCache): pc.StandardMaterial {
  const existing = cache.materials.get('hole:deep-occluder');
  if (existing) return existing;
  const created = makeMaterial([0, 0, 0]);
  created.gloss = 0;
  created.update();
  cache.materials.set('hole:deep-occluder', created);
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
    const offset: Vec2Tuple = [
      wrap01(minWorldX / CARPET_REPEAT_METERS),
      wrap01(minWorldZ / CARPET_REPEAT_METERS)
    ];
    const uvKey = `${profile.key}:${tiling[0].toFixed(4)}:${tiling[1].toFixed(4)}:${offset[0].toFixed(4)}:${offset[1].toFixed(4)}`;
    child.render.material = carpetClone(
      child.render.material as pc.StandardMaterial,
      profile,
      uvKey,
      tiling,
      offset
    );
  }
}

export function holeDepthBands(): readonly HoleDepthBand[] {
  return [
    { key: 'upper', top: -0.02, bottom: -0.82, tint: [0.145, 0.123, 0.072] },
    { key: 'middle', top: -0.82, bottom: -2.0, tint: [0.028, 0.022, 0.012] },
    { key: 'deep', top: -2.0, bottom: -8.4, tint: [0.0015, 0.0013, 0.001] }
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
      `${hole.id}:void`,
      `${hole.id}:depth`,
      `${hole.id}:north-side`,
      `${hole.id}:south-side`,
      `${hole.id}:west-side`,
      `${hole.id}:east-side`
    ]) entityByName(visual.root, name)?.destroy();

    for (const child of childrenOf(visual.root)) {
      if (
        child.name.startsWith(`${hole.id}:depth-band:`)
        || child.name === `${hole.id}:depth-void`
        || child.name === `${hole.id}:depth-occluder`
      ) child.destroy();
    }

    const bands = holeDepthBands();
    for (const band of bands) {
      addHoleBand(visual.root, hole, band, material(cache, `hole:${band.key}`, band.tint));
    }
    const deepBottom = bands[bands.length - 1]!.bottom;
    addBox(
      `${hole.id}:depth-occluder`,
      visual.root,
      [hole.position.x, deepBottom - 0.06, hole.position.z],
      [hole.scale.x * 2.6, 0.14, hole.scale.z * 2.6],
      lightlessBlackMaterial(cache)
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

function fixedCoordinate(wall: WallSpec): number {
  return wall.orientation === 'z' ? wall.cz : wall.cx;
}

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

function descriptorTouchesArchFrame(descriptor: CellDescriptor): boolean {
  return descriptor.world.generationVersion === 'gen3-v1'
    && descriptor.walls.some((wall) => isArchHeader(wall) || isArchLower(wall) || isArchVerticalSolid(wall));
}

function descriptorIsInArchRebuildNeighborhood(
  renderer: WorldRenderer,
  descriptor: CellDescriptor
): boolean {
  if (descriptorTouchesArchFrame(descriptor)) return true;
  return [...renderer.loaded.values()].some((visual) =>
    descriptorTouchesArchFrame(visual.descriptor)
    && Math.abs(visual.descriptor.address.cellX - descriptor.address.cellX) <= 1
    && Math.abs(visual.descriptor.address.cellZ - descriptor.address.cellZ) <= 1
  );
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
      const line = lines.get(key) ?? {
        key,
        orientation: world.orientation,
        fixed: world.fixed,
        headers: [],
        lowers: [],
        solids: []
      };
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
      const headerIntervals = mergeIntervals(
        line.headers.map((header) => [header.start, header.end] as const)
      );
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
  return preservedArchCurveWidth(width);
}

export function archFramePresentationProfile(): {
  upperBottom: number;
  upperTop: number;
  ceilingReveal: number;
  curveApex: number;
  curveJoinHandoff: number;
  cellSeamHandoff: number;
  pierDepth: number;
  upperDepth: number;
  shoulderSpanScale: number;
} {
  return {
    upperBottom: ARCH_UPPER_BOTTOM,
    upperTop: ARCH_UPPER_TOP,
    ceilingReveal: WALL_HEIGHT - ARCH_UPPER_TOP,
    curveApex: ARCH_CURVE_APEX,
    curveJoinHandoff: 0,
    cellSeamHandoff: ARCH_CELL_SEAM_HANDOFF,
    pierDepth: ARCH_PIER_DEPTH,
    upperDepth: ARCH_UPPER_DEPTH,
    shoulderSpanScale: ARCH_SHOULDER_SPAN_SCALE
  };
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

function rectangularUpperRuns(bays: readonly ArchFrameBay[], supports: readonly Interval[]): Interval[] {
  const intervals: Interval[] = supports.map(([start, end]) => [start, end] as const);
  for (const bay of bays) {
    intervals.push([bay.start, bay.curveStart], [bay.curveEnd, bay.end]);
  }
  return mergeIntervals(intervals);
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
        const bottom = Math.min(
          curveY(bay.curveStart, bay.curveEnd, start),
          curveY(bay.curveStart, bay.curveEnd, end)
        );
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

function cellAlongBounds(
  descriptor: CellDescriptor,
  orientation: WallSpec['orientation']
): Interval {
  const center = orientation === 'z'
    ? descriptor.address.cellX * CELL_SIZE
    : descriptor.address.cellZ * CELL_SIZE;
  return [center - CELL_SIZE / 2, center + CELL_SIZE / 2];
}

function perpendicularCellOwner(fixed: number): number {
  return Math.floor((fixed + CELL_SIZE / 2) / CELL_SIZE);
}

function cellOwnsLine(
  descriptor: CellDescriptor,
  orientation: WallSpec['orientation'],
  fixed: number
): boolean {
  return orientation === 'z'
    ? descriptor.address.cellZ === perpendicularCellOwner(fixed)
    : descriptor.address.cellX === perpendicularCellOwner(fixed);
}

function clippedInterval(
  descriptor: CellDescriptor,
  orientation: WallSpec['orientation'],
  start: number,
  end: number
): Interval | undefined {
  const [cellStart, cellEnd] = cellAlongBounds(descriptor, orientation);
  const entersFromPreviousCell = start < cellStart - 0.0005;
  const continuesIntoNextCell = end > cellEnd + 0.0005;
  const clippedStart = Math.max(
    start,
    cellStart + (entersFromPreviousCell ? ARCH_CELL_SEAM_HANDOFF : 0)
  );
  const clippedEnd = Math.min(
    end,
    cellEnd + (continuesIntoNextCell ? ARCH_CELL_SEAM_HANDOFF : 0)
  );
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

function localBoxScale(
  orientation: WallSpec['orientation'],
  length: number,
  height: number,
  depth: number
): Vec3Tuple {
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

function addCurveSegmentsClipped(
  visual: CellVisual,
  bay: ArchFrameBay,
  value: pc.StandardMaterial
): void {
  const width = bay.curveEnd - bay.curveStart;
  const step = width / ARCH_CURVE_SEGMENTS;

  for (let index = 0; index < ARCH_CURVE_SEGMENTS; index += 1) {
    const start = bay.curveStart + step * index;
    const end = bay.curveStart + step * (index + 1);
    const bottom = Math.min(
      curveY(bay.curveStart, bay.curveEnd, start),
      curveY(bay.curveStart, bay.curveEnd, end)
    );
    const height = ARCH_UPPER_TOP - bottom;
    if (height < 0.025) continue;

    addWorldBoxClipped(
      visual,
      `curve-segment:${bay.id}:${index}`,
      bay.orientation,
      bay.fixed,
      start,
      end,
      bottom + height / 2,
      height,
      ARCH_UPPER_DEPTH,
      value
    );
  }
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

function renderArchFrames(
  renderer: WorldRenderer,
  targetCellIds?: ReadonlySet<string>
): void {
  const visuals = [...renderer.loaded.values()];
  const targetVisuals = targetCellIds
    ? visuals.filter((visual) => targetCellIds.has(visual.descriptor.id))
    : visuals;
  const descriptors = visuals.map((visual) => visual.descriptor);
  const lines = archLinesForDescriptors(descriptors);
  const sourceIds = dividerSourceWallIds(lines);
  const cache = cacheFor(renderer);
  const pierMaterial = material(cache, 'arch-frame:pier', ARCH_PIER_TINT);
  const upperMaterial = material(cache, 'arch-frame:upper', ARCH_UPPER_TINT);
  const panelMaterial = material(cache, 'arch-frame:panel', ARCH_PANEL_TINT);

  for (const visual of targetVisuals) {
    clearArchFrameVisuals(visual);
    if (visual.descriptor.world.generationVersion === 'gen3-v1') {
      resetSemanticArchMeshes(visual);
      hideSemanticDividerMeshes(visual, sourceIds);
    }
  }

  for (const line of lines.values()) {
    const bays = frameBaysForLine(line);
    if (bays.length === 0) continue;

    const activeSupportIntervals = mergeIntervals(
      line.solids.map((wall) => [wall.start, wall.end] as const)
    ).filter((support) =>
      bays.some((bay) =>
        Math.abs(support[1] - bay.start) < 0.08
        || Math.abs(support[0] - bay.end) < 0.08
      )
    );

    const upperRuns = rectangularUpperRuns(bays, activeSupportIntervals);

    for (const visual of targetVisuals) {
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

      const shoulderHeight = ARCH_UPPER_TOP - ARCH_UPPER_BOTTOM;
      for (let index = 0; index < upperRuns.length; index += 1) {
        const run = upperRuns[index]!;
        addWorldBoxClipped(
          visual,
          `upper-run:${line.key}:${index}`,
          line.orientation,
          line.fixed,
          run[0],
          run[1],
          ARCH_UPPER_BOTTOM + shoulderHeight / 2,
          shoulderHeight,
          ARCH_UPPER_DEPTH,
          upperMaterial
        );
      }

      for (const bay of bays) {
        addCurveSegmentsClipped(visual, bay, upperMaterial);

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
 * topology/collision ownership; A-A1 is reconstructed from world-space divider
 * runs. Curves use shared primitive geometry and retain the accepted 0.24 m
 * ceiling reveal.
 */
const pendingArchCells = new WeakMap<WorldRenderer, Set<string>>();
const scheduledArchFlush = new WeakSet<WorldRenderer>();

function markNearbyArchCells(renderer: WorldRenderer, descriptor: CellDescriptor): void {
  // Rebuild only when the changed Cell carries A-A1 semantics or sits directly
  // beside loaded A-A1 geometry that can clip into it. This preserves cross-Cell
  // handoff ownership without making every ordinary Cell stream event rescan A-A1.
  if (!descriptorIsInArchRebuildNeighborhood(renderer, descriptor)) return;

  const pending = pendingArchCells.get(renderer) ?? new Set<string>();
  for (const visual of renderer.loaded.values()) {
    if (
      Math.abs(visual.descriptor.address.cellX - descriptor.address.cellX) <= 1
      && Math.abs(visual.descriptor.address.cellZ - descriptor.address.cellZ) <= 1
    ) pending.add(visual.descriptor.id);
  }
  pendingArchCells.set(renderer, pending);

  if (scheduledArchFlush.has(renderer)) return;
  scheduledArchFlush.add(renderer);

  queueMicrotask(() => {
    scheduledArchFlush.delete(renderer);
    const targets = pendingArchCells.get(renderer);
    if (!targets || targets.size === 0) return;
    pendingArchCells.set(renderer, new Set());
    renderArchFrames(renderer, targets);
  });
}

export function installLevel0RegionPresentation(): void {
  if (installed) return;
  installed = true;

  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function patchedRegionPresentationLoad(
    this: WorldRenderer,
    descriptor: CellDescriptor
  ): void {
    const alreadyLoaded = this.loaded.has(descriptor.id);
    originalLoadCell.call(this, descriptor);
    const visual = this.loaded.get(descriptor.id);
    if (visual && !alreadyLoaded) applyRegionPresentation(this, visual);
    markNearbyArchCells(this, descriptor);
  };

  const originalUnloadCell = WorldRenderer.prototype.unloadCell;
  WorldRenderer.prototype.unloadCell = function patchedRegionPresentationUnload(
    this: WorldRenderer,
    cellId: string
  ): void {
    const descriptor = this.loaded.get(cellId)?.descriptor;
    originalUnloadCell.call(this, cellId);
    if (descriptor) markNearbyArchCells(this, descriptor);
  };
}
