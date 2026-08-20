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
import { makeMaterial, type CellVisual, type WorldCollider } from './support.js';

interface RendererAccess { app: pc.Application; }
interface RegionPresentationCache { materials: Map<string, pc.StandardMaterial>; }
interface CarpetProfile { key: 'ordinary' | 'pillar' | 'arch'; tint: readonly [number, number, number]; gloss?: number; }
type Vec3Tuple = readonly [number, number, number];
type Vec2Tuple = readonly [number, number];
type Interval = readonly [number, number];
type ArchRunClassification = 'normal' | 'termination' | 'handoff' | 'continuation';

type ArchDirtyRoot = pc.Entity & { __noclipArchPresentationDirty?: boolean };

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
  piers: WorldArchWall[];
  terminationCandidates: WorldArchWall[];
}
interface ArchStructuralRun {
  id: string;
  lineKey: string;
  orientation: WallSpec['orientation'];
  fixed: number;
  start: number;
  end: number;
  classification: ArchRunClassification;
  bays: ArchFrameBay[];
  pierIntervals: Interval[];
  upperIntervals: Interval[];
  lowerPanelIntervals: Interval[];
  terminationIntervals: Interval[];
  sourceWallIds: Set<string>;
}
export interface ArchStructuralRunSummary {
  id: string;
  lineKey: string;
  classification: ArchRunClassification;
  start: number;
  end: number;
  bays: number;
  pierIntervals: readonly Interval[];
  upperIntervals: readonly Interval[];
  lowerPanelIntervals: readonly Interval[];
  terminationIntervals: readonly Interval[];
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
export interface ArchFrameVisibleVolume {
  id: string;
  role: 'pier-lower' | 'upper-mass' | 'pier-upper' | 'lower-panel' | 'termination';
  lineKey: string;
  start: number;
  end: number;
  minY: number;
  maxY: number;
}
export interface ArchStructuralSignatureEntry {
  role: 'pier' | 'upper-mass' | 'curve' | 'lower-panel' | 'termination' | 'route';
  runId: string;
  lineKey: string;
  orientation: WallSpec['orientation'];
  fixed: number;
  start: number;
  end: number;
  collision: boolean;
  route: boolean;
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
const ARCH_UPPER_BOTTOM = 1.92;
const ARCH_UPPER_TOP = WALL_HEIGHT - 0.24;
const ARCH_CURVE_APEX = Math.min(ARCH_UPPER_TOP - 0.24, 2.46);
const ARCH_CELL_SEAM_HANDOFF = 0.012;
const ARCH_PIER_DEPTH = WALL_THICKNESS + 0.10;
const ARCH_UPPER_DEPTH = WALL_THICKNESS + 0.16;
const ARCH_LOWER_PANEL_DEPTH = Math.max(0.14, WALL_THICKNESS - 0.10);
const ARCH_LOWER_PANEL_HEIGHT = Math.min(ARCH_LOWER_HEIGHT - 0.06, 0.94);
const ARCH_FRAME_PREFIX = 'arch-frame:';
const ARCH_COLLIDER_PREFIX = 'arch-frame-collider:';
const ARCH_TERMINATION_MAX_LENGTH = 0.60;
const ARCH_SOURCE_MATCH_TOLERANCE = 0.05;
const ARCH_JUNCTION_TOLERANCE = WALL_THICKNESS / 2 + 0.08;
const ARCH_PIER_TINT: readonly [number, number, number] = [0.76, 0.735, 0.665];
const ARCH_UPPER_TINT: readonly [number, number, number] = [0.955, 0.945, 0.885];
const ARCH_PANEL_TINT: readonly [number, number, number] = [0.885, 0.872, 0.805];

function now(): number { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }
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
function wrap01(value: number): number { return ((value % 1) + 1) % 1; }
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
  if (fullFloor?.render) fullFloor.render.material = carpetClone(fullFloor.render.material as pc.StandardMaterial, profile, profile.key);
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
    { key: 'upper', top: -0.02, bottom: -0.82, tint: [0.145, 0.123, 0.072] },
    { key: 'middle', top: -0.82, bottom: -2.0, tint: [0.028, 0.022, 0.012] },
    { key: 'deep', top: -2.0, bottom: -8.4, tint: [0.0015, 0.0013, 0.001] }
  ];
}
function addHoleBand(root: pc.Entity, hole: FloorPatchSpec, band: HoleDepthBand, value: pc.StandardMaterial): void {
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
      `${hole.id}:void`, `${hole.id}:depth`, `${hole.id}:north-side`, `${hole.id}:south-side`, `${hole.id}:west-side`, `${hole.id}:east-side`
    ]) entityByName(visual.root, name)?.destroy();
    for (const child of childrenOf(visual.root)) {
      if (child.name.startsWith(`${hole.id}:depth-band:`) || child.name === `${hole.id}:depth-void` || child.name === `${hole.id}:depth-occluder`) child.destroy();
    }
    const bands = holeDepthBands();
    for (const band of bands) addHoleBand(visual.root, hole, band, material(cache, `hole:${band.key}`, band.tint));
    const deepBottom = bands[bands.length - 1]!.bottom;
    addBox(`${hole.id}:depth-occluder`, visual.root, [hole.position.x, deepBottom - 0.06, hole.position.z], [hole.scale.x * 2.6, 0.14, hole.scale.z * 2.6], lightlessBlackMaterial(cache));
  }
}

function wallMinY(wall: WallSpec): number { return wall.cy - wall.sy / 2; }
function wallMaxY(wall: WallSpec): number { return wall.cy + wall.sy / 2; }
function longInterval(wall: WallSpec): Interval {
  return wall.orientation === 'z' ? [wall.cx - wall.sx / 2, wall.cx + wall.sx / 2] : [wall.cz - wall.sz / 2, wall.cz + wall.sz / 2];
}
function wallLength(wall: WallSpec): number { return Math.max(wall.sx, wall.sz); }
function fixedCoordinate(wall: WallSpec): number { return wall.orientation === 'z' ? wall.cz : wall.cx; }
function isArchHeader(wall: WallSpec): boolean {
  return wall.materialId === 'arch-pale-wallpaper' && Math.abs(wall.sy - ARCH_HEADER_HEIGHT) < 0.055 && Math.abs(wallMaxY(wall) - WALL_HEIGHT) < 0.045;
}
function isArchLower(wall: WallSpec): boolean {
  return wall.materialId === 'arch-pale-wallpaper' && Math.abs(wall.sy - ARCH_LOWER_HEIGHT) < 0.065 && wallMinY(wall) <= 0.045;
}
function isArchPierSupport(wall: WallSpec): boolean {
  const headerBottom = WALL_HEIGHT - ARCH_HEADER_HEIGHT;
  return wall.materialId === 'arch-pale-wallpaper'
    && wallMinY(wall) > 0.04
    && wallMinY(wall) <= ARCH_LOWER_HEIGHT + 0.065
    && wallMaxY(wall) >= headerBottom - 0.045
    && wall.sy > 1.35;
}
function isFullHeightStructuralWall(wall: WallSpec): boolean {
  return wallMinY(wall) <= 0.04 && wallMaxY(wall) >= WALL_HEIGHT - 0.04 && wall.sy >= WALL_HEIGHT - 0.08;
}
function isArchTerminationShape(wall: WallSpec): boolean {
  return wall.materialId === 'arch-pale-wallpaper' && isFullHeightStructuralWall(wall) && wallLength(wall) <= ARCH_TERMINATION_MAX_LENGTH + 0.02;
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
function overlapsInterval(left: Interval, right: Interval): boolean { return left[1] > right[0] + 0.01 && left[0] < right[1] - 0.01; }
function intervalContainsCoordinate(interval: Interval, coordinate: number, tolerance = 0.03): boolean {
  return coordinate >= interval[0] - tolerance && coordinate <= interval[1] + tolerance;
}
function intersectIntervals(left: Interval, right: Interval): Interval | undefined {
  const start = Math.max(left[0], right[0]);
  const end = Math.min(left[1], right[1]);
  return end - start > 0.015 ? [start, end] : undefined;
}
function subtractInterval(source: Interval, cuts: readonly Interval[]): Interval[] {
  let pieces: Interval[] = [source];
  for (const cut of mergeIntervals(cuts)) {
    pieces = pieces.flatMap(([start, end]) => {
      if (cut[1] <= start + 0.005 || cut[0] >= end - 0.005) return [[start, end] as const];
      const next: Interval[] = [];
      if (cut[0] - start > 0.015) next.push([start, Math.min(end, cut[0])]);
      if (end - cut[1] > 0.015) next.push([Math.max(start, cut[1]), end]);
      return next;
    });
  }
  return pieces;
}
function subtractIntervals(sources: readonly Interval[], cuts: readonly Interval[]): Interval[] {
  return mergeIntervals(sources.flatMap((source) => subtractInterval(source, cuts)));
}
function candidateMatchesHeaderSource(candidate: WorldArchWall, header: WorldArchWall): boolean {
  if (!overlapsInterval([candidate.start, candidate.end], [header.start, header.end])) return false;
  if (candidate.start < header.start - ARCH_SOURCE_MATCH_TOLERANCE || candidate.end > header.end + ARCH_SOURCE_MATCH_TOLERANCE) return false;
  return Math.abs(candidate.start - header.start) <= ARCH_SOURCE_MATCH_TOLERANCE || Math.abs(candidate.end - header.end) <= ARCH_SOURCE_MATCH_TOLERANCE;
}
function archLineKeyForWall(descriptor: CellDescriptor, wall: WallSpec): string {
  const world = toWorldArchWall(descriptor, wall);
  return `${world.orientation}:${world.fixed.toFixed(3)}`;
}
function descriptorArchLineKeys(descriptor: CellDescriptor): Set<string> {
  const keys = new Set<string>();
  if (descriptor.world.generationVersion !== 'gen3-v1') return keys;
  for (const wall of descriptor.walls) if (isArchHeader(wall)) keys.add(archLineKeyForWall(descriptor, wall));
  return keys;
}
function localSemanticArchSourceIds(descriptor: CellDescriptor): Set<string> {
  const ids = new Set<string>();
  if (descriptor.world.generationVersion !== 'gen3-v1') return ids;
  for (const wall of descriptor.walls) {
    if (isArchHeader(wall) || isArchLower(wall) || isArchPierSupport(wall) || isArchTerminationShape(wall)) ids.add(wall.id);
  }
  return ids;
}
function archLinesForDescriptors(descriptors: readonly CellDescriptor[]): Map<string, WorldArchLine> {
  const lines = new Map<string, WorldArchLine>();
  for (const descriptor of descriptors) {
    if (descriptor.world.generationVersion !== 'gen3-v1') continue;
    for (const wall of descriptor.walls) {
      if (!isArchHeader(wall)) continue;
      const world = toWorldArchWall(descriptor, wall);
      const key = `${world.orientation}:${world.fixed.toFixed(3)}`;
      const line = lines.get(key) ?? { key, orientation: world.orientation, fixed: world.fixed, headers: [], lowers: [], piers: [], terminationCandidates: [] };
      line.headers.push(world);
      lines.set(key, line);
    }
  }
  for (const descriptor of descriptors) {
    if (descriptor.world.generationVersion !== 'gen3-v1') continue;
    for (const wall of descriptor.walls) {
      if (!isArchLower(wall) && !isArchPierSupport(wall) && !isArchTerminationShape(wall)) continue;
      const world = toWorldArchWall(descriptor, wall);
      const key = `${world.orientation}:${world.fixed.toFixed(3)}`;
      const line = lines.get(key);
      if (!line) continue;
      const headerIntervals = mergeIntervals(line.headers.map((header) => [header.start, header.end] as const));
      if (!headerIntervals.some((header) => overlapsInterval(header, [world.start, world.end]))) continue;
      if (isArchLower(wall)) line.lowers.push(world);
      if (isArchPierSupport(wall)) line.piers.push(world);
      if (isArchTerminationShape(wall) && line.headers.some((header) => candidateMatchesHeaderSource(world, header))) line.terminationCandidates.push(world);
    }
  }
  return lines;
}
function mergedHeaderRuns(line: WorldArchLine): Interval[] { return mergeIntervals(line.headers.map((header) => [header.start, header.end] as const)); }
function curveWidthForBay(width: number): number { return preservedArchCurveWidth(width); }
export function archFramePresentationProfile(): {
  upperBottom: number; upperTop: number; ceilingReveal: number; curveApex: number;
  curveJoinHandoff: number; cellSeamHandoff: number; pierDepth: number; upperDepth: number; shoulderSpanScale: number;
} {
  return {
    upperBottom: ARCH_UPPER_BOTTOM, upperTop: ARCH_UPPER_TOP, ceilingReveal: WALL_HEIGHT - ARCH_UPPER_TOP, curveApex: ARCH_CURVE_APEX,
    curveJoinHandoff: 0, cellSeamHandoff: ARCH_CELL_SEAM_HANDOFF, pierDepth: ARCH_PIER_DEPTH, upperDepth: ARCH_UPPER_DEPTH,
    shoulderSpanScale: ARCH_SHOULDER_SPAN_SCALE
  };
}
function intervalContains(intervals: readonly Interval[], point: number, margin = 0.06): boolean {
  return intervals.some(([start, end]) => point >= start + margin && point <= end - margin);
}
function frameBaysForHeaderRun(line: WorldArchLine, header: Interval, startingIndex: number): ArchFrameBay[] {
  const solids = mergeIntervals(line.piers.map((wall) => [wall.start, wall.end] as const)).filter((solid) => overlapsInterval(solid, header));
  const lowers = mergeIntervals(line.lowers.map((wall) => [wall.start, wall.end] as const));
  const bays: ArchFrameBay[] = [];
  let bayIndex = startingIndex;
  for (let index = 1; index < solids.length; index += 1) {
    const left = solids[index - 1];
    const right = solids[index];
    if (!left || !right) continue;
    const start = Math.max(header[0], left[1]);
    const end = Math.min(header[1], right[0]);
    const width = end - start;
    if (width < 1.7 || width > 6.4) continue;
    const center = (start + end) / 2;
    const curveWidth = curveWidthForBay(width);
    bays.push({ id: `${line.key}:${bayIndex++}`, lineKey: line.key, orientation: line.orientation, fixed: line.fixed, start, end, curveStart: center - curveWidth / 2, curveEnd: center + curveWidth / 2, route: !intervalContains(lowers, center) });
  }
  return bays;
}
function fullHeightWorldWalls(descriptors: readonly CellDescriptor[]): WorldArchWall[] {
  const walls: WorldArchWall[] = [];
  for (const descriptor of descriptors) {
    if (descriptor.world.generationVersion !== 'gen3-v1') continue;
    for (const wall of descriptor.walls) if (isFullHeightStructuralWall(wall)) walls.push(toWorldArchWall(descriptor, wall));
  }
  return walls;
}
function hasStructuralHandoff(
  line: WorldArchLine,
  endpoint: number,
  lines: ReadonlyMap<string, WorldArchLine>,
  fullHeightWalls: readonly WorldArchWall[]
): boolean {
  for (const wall of fullHeightWalls) {
    if (wall.orientation === line.orientation) continue;
    if (Math.abs(wall.fixed - endpoint) > ARCH_JUNCTION_TOLERANCE) continue;
    if (intervalContainsCoordinate([wall.start, wall.end], line.fixed, ARCH_JUNCTION_TOLERANCE)) return true;
  }
  for (const other of lines.values()) {
    if (other === line || other.orientation === line.orientation) continue;
    if (Math.abs(other.fixed - endpoint) > ARCH_JUNCTION_TOLERANCE) continue;
    if (mergedHeaderRuns(other).some((run) => intervalContainsCoordinate(run, line.fixed, ARCH_JUNCTION_TOLERANCE))) return true;
  }
  return false;
}
function trueTerminationIntervals(
  line: WorldArchLine,
  header: Interval,
  lines: ReadonlyMap<string, WorldArchLine>,
  fullHeightWalls: readonly WorldArchWall[]
): Interval[] {
  const candidates = mergeIntervals(line.terminationCandidates.map((candidate) => [candidate.start, candidate.end] as const));
  const accepted: Interval[] = [];
  const startCandidate = candidates.find((candidate) => Math.abs(candidate[0] - header[0]) <= ARCH_SOURCE_MATCH_TOLERANCE);
  if (startCandidate && !hasStructuralHandoff(line, header[0], lines, fullHeightWalls)) accepted.push(startCandidate);
  const endCandidate = candidates.find((candidate) => Math.abs(candidate[1] - header[1]) <= ARCH_SOURCE_MATCH_TOLERANCE);
  if (endCandidate && !hasStructuralHandoff(line, header[1], lines, fullHeightWalls)) accepted.push(endCandidate);
  return mergeIntervals(accepted);
}
function sourceIdsForRun(line: WorldArchLine, header: Interval): Set<string> {
  const ids = new Set<string>();
  for (const wall of [...line.headers, ...line.lowers, ...line.piers, ...line.terminationCandidates]) if (overlapsInterval([wall.start, wall.end], header)) ids.add(wall.id);
  return ids;
}
function classifyRun(
  line: WorldArchLine,
  header: Interval,
  lines: ReadonlyMap<string, WorldArchLine>,
  fullHeightWalls: readonly WorldArchWall[],
  terminationIntervals: readonly Interval[]
): ArchRunClassification {
  if (terminationIntervals.length > 0) return 'termination';
  if (hasStructuralHandoff(line, header[0], lines, fullHeightWalls) || hasStructuralHandoff(line, header[1], lines, fullHeightWalls)) return 'handoff';
  const headerCells = new Set(line.headers.filter((wall) => overlapsInterval([wall.start, wall.end], header)).map((wall) => wall.cellId));
  return headerCells.size > 1 ? 'continuation' : 'normal';
}
function deriveArchStructuralRuns(descriptors: readonly CellDescriptor[], targetLineKey?: string): ArchStructuralRun[] {
  const lines = archLinesForDescriptors(descriptors);
  const fullHeightWalls = fullHeightWorldWalls(descriptors);
  const runs: ArchStructuralRun[] = [];
  for (const line of lines.values()) {
    if (targetLineKey && line.key !== targetLineKey) continue;
    let bayIndex = 0;
    const headers = mergedHeaderRuns(line);
    for (let runIndex = 0; runIndex < headers.length; runIndex += 1) {
      const header = headers[runIndex]!;
      const bays = frameBaysForHeaderRun(line, header, bayIndex);
      bayIndex += bays.length;
      const terminationIntervals = trueTerminationIntervals(line, header, lines, fullHeightWalls);
      const candidatePiers = mergeIntervals(line.piers.map((wall) => [wall.start, wall.end] as const))
        .map((interval) => intersectIntervals(interval, header))
        .filter((interval): interval is Interval => Boolean(interval));
      const activePiers = subtractIntervals(
        candidatePiers.filter((support) => bays.some((bay) => Math.abs(support[1] - bay.start) < 0.08 || Math.abs(support[0] - bay.end) < 0.08)),
        terminationIntervals
      );
      const curveIntervals = bays.map((bay) => [bay.curveStart, bay.curveEnd] as const);
      const upperIntervals = subtractIntervals([header], [...curveIntervals, ...terminationIntervals]);
      const lowerSources = mergeIntervals(line.lowers.map((wall) => [wall.start, wall.end] as const))
        .map((interval) => intersectIntervals(interval, header))
        .filter((interval): interval is Interval => Boolean(interval));
      const lowerPanelIntervals = subtractIntervals(lowerSources, [...activePiers, ...terminationIntervals]);
      runs.push({
        id: `${line.key}:run:${runIndex}:${header[0].toFixed(3)}:${header[1].toFixed(3)}`,
        lineKey: line.key,
        orientation: line.orientation,
        fixed: line.fixed,
        start: header[0],
        end: header[1],
        classification: classifyRun(line, header, lines, fullHeightWalls, terminationIntervals),
        bays,
        pierIntervals: activePiers,
        upperIntervals,
        lowerPanelIntervals,
        terminationIntervals,
        sourceWallIds: sourceIdsForRun(line, header)
      });
    }
  }
  return runs.sort((left, right) => left.lineKey.localeCompare(right.lineKey) || left.start - right.start || left.end - right.end);
}
export function archStructuralRunsForDescriptors(descriptors: readonly CellDescriptor[]): ArchStructuralRunSummary[] {
  return deriveArchStructuralRuns(descriptors).map((run) => ({
    id: run.id,
    lineKey: run.lineKey,
    classification: run.classification,
    start: run.start,
    end: run.end,
    bays: run.bays.length,
    pierIntervals: run.pierIntervals.map((value) => [...value] as Interval),
    upperIntervals: run.upperIntervals.map((value) => [...value] as Interval),
    lowerPanelIntervals: run.lowerPanelIntervals.map((value) => [...value] as Interval),
    terminationIntervals: run.terminationIntervals.map((value) => [...value] as Interval)
  }));
}
export function archFrameVisibleVolumesForDescriptors(descriptors: readonly CellDescriptor[]): ArchFrameVisibleVolume[] {
  const volumes: ArchFrameVisibleVolume[] = [];
  for (const run of deriveArchStructuralRuns(descriptors)) {
    run.pierIntervals.forEach((support, index) => {
      volumes.push({ id: `${run.id}:pier-lower:${index}`, role: 'pier-lower', lineKey: run.lineKey, start: support[0], end: support[1], minY: 0, maxY: ARCH_UPPER_BOTTOM });
      volumes.push({ id: `${run.id}:pier-upper:${index}`, role: 'pier-upper', lineKey: run.lineKey, start: support[0], end: support[1], minY: ARCH_UPPER_TOP, maxY: WALL_HEIGHT });
    });
    run.upperIntervals.forEach((interval, index) => volumes.push({ id: `${run.id}:upper-mass:${index}`, role: 'upper-mass', lineKey: run.lineKey, start: interval[0], end: interval[1], minY: ARCH_UPPER_BOTTOM, maxY: ARCH_UPPER_TOP }));
    run.lowerPanelIntervals.forEach((interval, index) => volumes.push({ id: `${run.id}:lower-panel:${index}`, role: 'lower-panel', lineKey: run.lineKey, start: interval[0], end: interval[1], minY: 0, maxY: ARCH_LOWER_PANEL_HEIGHT }));
    run.terminationIntervals.forEach((interval, index) => volumes.push({ id: `${run.id}:termination:${index}`, role: 'termination', lineKey: run.lineKey, start: interval[0], end: interval[1], minY: 0, maxY: WALL_HEIGHT }));
  }
  return volumes;
}
export function archFrameBaysForDescriptors(descriptors: readonly CellDescriptor[]): ArchFrameBay[] { return deriveArchStructuralRuns(descriptors).flatMap((run) => run.bays); }
function signatureForRuns(runs: readonly ArchStructuralRun[]): ArchStructuralSignatureEntry[] {
  const signature: ArchStructuralSignatureEntry[] = [];
  for (const run of runs) {
    run.pierIntervals.forEach((interval) => signature.push({ role: 'pier', runId: run.id, lineKey: run.lineKey, orientation: run.orientation, fixed: run.fixed, start: interval[0], end: interval[1], collision: true, route: false }));
    run.upperIntervals.forEach((interval) => signature.push({ role: 'upper-mass', runId: run.id, lineKey: run.lineKey, orientation: run.orientation, fixed: run.fixed, start: interval[0], end: interval[1], collision: false, route: false }));
    run.lowerPanelIntervals.forEach((interval) => signature.push({ role: 'lower-panel', runId: run.id, lineKey: run.lineKey, orientation: run.orientation, fixed: run.fixed, start: interval[0], end: interval[1], collision: true, route: false }));
    run.terminationIntervals.forEach((interval) => signature.push({ role: 'termination', runId: run.id, lineKey: run.lineKey, orientation: run.orientation, fixed: run.fixed, start: interval[0], end: interval[1], collision: true, route: false }));
    for (const bay of run.bays) {
      signature.push({ role: 'curve', runId: run.id, lineKey: run.lineKey, orientation: run.orientation, fixed: run.fixed, start: bay.curveStart, end: bay.curveEnd, collision: false, route: bay.route });
      if (bay.route) signature.push({ role: 'route', runId: run.id, lineKey: run.lineKey, orientation: run.orientation, fixed: run.fixed, start: bay.start, end: bay.end, collision: false, route: true });
    }
  }
  return signature.sort((left, right) => left.lineKey.localeCompare(right.lineKey) || left.start - right.start || left.end - right.end || left.role.localeCompare(right.role));
}
export function archStructuralSignatureForDescriptors(descriptors: readonly CellDescriptor[]): ArchStructuralSignatureEntry[] { return signatureForRuns(deriveArchStructuralRuns(descriptors)); }
export function archSemanticSourceIdsForDescriptors(descriptors: readonly CellDescriptor[]): string[] {
  const ids = new Set<string>();
  for (const descriptor of descriptors) for (const id of localSemanticArchSourceIds(descriptor)) ids.add(id);
  return [...ids].sort();
}

function curveY(start: number, end: number, along: number): number {
  const center = (start + end) / 2;
  const halfWidth = (end - start) / 2;
  const normalized = Math.min(1, Math.abs(along - center) / Math.max(0.001, halfWidth));
  return ARCH_UPPER_BOTTOM + (ARCH_CURVE_APEX - ARCH_UPPER_BOTTOM) * Math.sqrt(Math.max(0, 1 - normalized * normalized));
}
export function archCurveSegmentsForCell(descriptor: CellDescriptor): ArchCurveSegment[] {
  const output: ArchCurveSegment[] = [];
  const baseX = descriptor.address.cellX * CELL_SIZE;
  const baseZ = descriptor.address.cellZ * CELL_SIZE;
  const localRuns = deriveArchStructuralRuns([descriptor]);
  for (const run of localRuns) {
    for (const bay of run.bays) {
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
          sourceWallId: [...run.sourceWallIds][0] ?? bay.id,
          position: bay.orientation === 'z' ? [along - baseX, bottom + height / 2, bay.fixed - baseZ] : [bay.fixed - baseX, bottom + height / 2, along - baseZ],
          scale: bay.orientation === 'z' ? [end - start, height, ARCH_UPPER_DEPTH] : [ARCH_UPPER_DEPTH, height, end - start]
        });
      }
    }
  }
  return output;
}
export function archHeaderBridgeSegmentsForCell(_descriptor: CellDescriptor): ArchCurveSegment[] { return []; }

function cellAlongBounds(descriptor: CellDescriptor, orientation: WallSpec['orientation']): Interval {
  const center = orientation === 'z' ? descriptor.address.cellX * CELL_SIZE : descriptor.address.cellZ * CELL_SIZE;
  return [center - CELL_SIZE / 2, center + CELL_SIZE / 2];
}
function perpendicularCellOwner(fixed: number): number { return Math.floor((fixed + CELL_SIZE / 2) / CELL_SIZE); }
function alongCellOwner(coordinate: number): number { return Math.floor((coordinate + CELL_SIZE / 2) / CELL_SIZE); }
function cellOwnsLine(descriptor: CellDescriptor, orientation: WallSpec['orientation'], fixed: number): boolean {
  return orientation === 'z' ? descriptor.address.cellZ === perpendicularCellOwner(fixed) : descriptor.address.cellX === perpendicularCellOwner(fixed);
}
function clippedInterval(descriptor: CellDescriptor, orientation: WallSpec['orientation'], start: number, end: number): Interval | undefined {
  const [cellStart, cellEnd] = cellAlongBounds(descriptor, orientation);
  const entersFromPreviousCell = start < cellStart - 0.0005;
  const continuesIntoNextCell = end > cellEnd + 0.0005;
  const clippedStart = Math.max(start, cellStart + (entersFromPreviousCell ? ARCH_CELL_SEAM_HANDOFF : 0));
  const clippedEnd = Math.min(end, cellEnd + (continuesIntoNextCell ? ARCH_CELL_SEAM_HANDOFF : 0));
  return clippedEnd - clippedStart > 0.015 ? [clippedStart, clippedEnd] : undefined;
}
function localBoxPosition(descriptor: CellDescriptor, orientation: WallSpec['orientation'], fixed: number, along: number, y: number): Vec3Tuple {
  const baseX = descriptor.address.cellX * CELL_SIZE;
  const baseZ = descriptor.address.cellZ * CELL_SIZE;
  return orientation === 'z' ? [along - baseX, y, fixed - baseZ] : [fixed - baseX, y, along - baseZ];
}
function localBoxScale(orientation: WallSpec['orientation'], length: number, height: number, depth: number): Vec3Tuple {
  return orientation === 'z' ? [length, height, depth] : [depth, height, length];
}
function subtract(left: Vec3Tuple, right: Vec3Tuple): Vec3Tuple { return [left[0] - right[0], left[1] - right[1], left[2] - right[2]]; }
function cross(left: Vec3Tuple, right: Vec3Tuple): Vec3Tuple {
  return [left[1] * right[2] - left[2] * right[1], left[2] * right[0] - left[0] * right[2], left[0] * right[1] - left[1] * right[0]];
}
function normalize(value: Vec3Tuple): Vec3Tuple {
  const length = Math.hypot(value[0], value[1], value[2]) || 1;
  return [value[0] / length, value[1] / length, value[2] / length];
}
function dot(left: Vec3Tuple, right: Vec3Tuple): number { return left[0] * right[0] + left[1] * right[1] + left[2] * right[2]; }
function pushQuad(
  positions: number[], normals: number[], indices: number[],
  points: readonly [Vec3Tuple, Vec3Tuple, Vec3Tuple, Vec3Tuple], desiredNormal: Vec3Tuple
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
function curvePoint(descriptor: CellDescriptor, orientation: WallSpec['orientation'], fixed: number, along: number, y: number, normalOffset: number): Vec3Tuple {
  const baseX = descriptor.address.cellX * CELL_SIZE;
  const baseZ = descriptor.address.cellZ * CELL_SIZE;
  return orientation === 'z' ? [along - baseX, y, fixed - baseZ + normalOffset] : [fixed - baseX + normalOffset, y, along - baseZ];
}
function curveEntityName(bay: ArchFrameBay, descriptor: CellDescriptor): string { return `${ARCH_FRAME_PREFIX}curve:${bay.lineKey}:${bay.id}:${descriptor.id}`; }
function addCurveMeshClipped(renderer: WorldRenderer, visual: CellVisual, bay: ArchFrameBay, value: pc.StandardMaterial): boolean {
  const descriptor = visual.descriptor;
  if (!cellOwnsLine(descriptor, bay.orientation, bay.fixed)) return false;
  const clip = clippedInterval(descriptor, bay.orientation, bay.curveStart, bay.curveEnd);
  if (!clip) return false;
  const name = curveEntityName(bay, descriptor);
  if (entityByName(visual.root, name)) return false;
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
  if (positions.length === 0) return false;
  const app = (renderer as unknown as RendererAccess).app;
  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(positions);
  mesh.setNormals(normals);
  mesh.setIndices(indices);
  mesh.update();
  const meshInstance = new pc.MeshInstance(mesh, value);
  const entity = new pc.Entity(name);
  entity.addComponent('render', { meshInstances: [meshInstance] });
  visual.root.addChild(entity);
  return true;
}

interface DesiredBox {
  name: string;
  position: Vec3Tuple;
  scale: Vec3Tuple;
  material: pc.StandardMaterial;
}
function desiredBox(
  visual: CellVisual,
  name: string,
  orientation: WallSpec['orientation'], fixed: number, start: number, end: number,
  y: number, height: number, depth: number, value: pc.StandardMaterial
): DesiredBox | undefined {
  if (!cellOwnsLine(visual.descriptor, orientation, fixed)) return undefined;
  const clip = clippedInterval(visual.descriptor, orientation, start, end);
  if (!clip) return undefined;
  const along = (clip[0] + clip[1]) / 2;
  return {
    name: `${ARCH_FRAME_PREFIX}${name}`,
    position: localBoxPosition(visual.descriptor, orientation, fixed, along, y),
    scale: localBoxScale(orientation, clip[1] - clip[0], height, depth),
    material: value
  };
}
function ensureBox(visual: CellVisual, spec: DesiredBox): boolean {
  if (entityByName(visual.root, spec.name)) return false;
  addBox(spec.name, visual.root, spec.position, spec.scale, spec.material);
  return true;
}
function suppressLocalArchSources(renderer: WorldRenderer, visual: CellVisual): void {
  for (const id of localSemanticArchSourceIds(visual.descriptor)) {
    const source = entityByName(visual.root, id);
    if (source?.render) source.render.enabled = false;
    renderer.walls.delete(id);
  }
}
function canonicalCollider(
  visual: CellVisual,
  run: ArchStructuralRun,
  role: 'pier' | 'lower-panel' | 'termination',
  index: number,
  source: Interval,
  height: number
): WorldCollider | undefined {
  const descriptor = visual.descriptor;
  if (!cellOwnsLine(descriptor, run.orientation, run.fixed)) return undefined;
  const clip = clippedInterval(descriptor, run.orientation, source[0], source[1]);
  if (!clip) return undefined;
  const along = (clip[0] + clip[1]) / 2;
  const length = clip[1] - clip[0];
  const cx = run.orientation === 'z' ? along : run.fixed;
  const cz = run.orientation === 'x' ? along : run.fixed;
  const sx = run.orientation === 'z' ? length : WALL_THICKNESS;
  const sz = run.orientation === 'x' ? length : WALL_THICKNESS;
  const cy = height / 2;
  return {
    id: `${ARCH_COLLIDER_PREFIX}${role}:${run.lineKey}:${run.id}:${index}:${descriptor.id}`,
    cellId: descriptor.id,
    shiftEpoch: descriptor.address.shiftEpoch,
    minX: cx - sx / 2,
    maxX: cx + sx / 2,
    minY: 0,
    maxY: height,
    minZ: cz - sz / 2,
    maxZ: cz + sz / 2,
    cx, cy, cz, sx, sy: height, sz,
    orientation: run.orientation,
    drawable: true
  };
}
function lineKeyFromOwnedName(name: string, lineKey: string): boolean { return name.includes(`:${lineKey}:`); }
function markArchPresentationDirty(visual: CellVisual): void { (visual.root as ArchDirtyRoot).__noclipArchPresentationDirty = true; }

function structuralSignatureJson(runs: readonly ArchStructuralRun[]): string { return JSON.stringify(signatureForRuns(runs)); }
function componentOwnerKey(descriptorId: string, epoch: number): string { return `${descriptorId}@${epoch}`; }

interface ArchRuntimeState {
  descriptors: Map<string, CellDescriptor>;
  descriptorLineKeys: Map<string, Set<string>>;
  descriptorCellKeys: Map<string, string>;
  cellDescriptorIds: Map<string, Set<string>>;
  lineDescriptorIds: Map<string, Set<string>>;
  descriptorEpochs: Map<string, number>;
  nextEpoch: number;
  lineStructuralSignatures: Map<string, string>;
  lineOwnerSignatures: Map<string, string>;
  lineOwnerDescriptorIds: Map<string, Set<string>>;
  pendingLines: Set<string>;
  scheduled: boolean;
}
const runtimeStates = new WeakMap<WorldRenderer, ArchRuntimeState>();
function runtimeState(renderer: WorldRenderer): ArchRuntimeState {
  const existing = runtimeStates.get(renderer);
  if (existing) return existing;
  const created: ArchRuntimeState = {
    descriptors: new Map(), descriptorLineKeys: new Map(), descriptorCellKeys: new Map(), cellDescriptorIds: new Map(), lineDescriptorIds: new Map(),
    descriptorEpochs: new Map(), nextEpoch: 1, lineStructuralSignatures: new Map(), lineOwnerSignatures: new Map(), lineOwnerDescriptorIds: new Map(),
    pendingLines: new Set(), scheduled: false
  };
  runtimeStates.set(renderer, created);
  return created;
}
function cellKey(x: number, z: number): string { return `${x}:${z}`; }
function removeDescriptorFromIndex(state: ArchRuntimeState, descriptorId: string): Set<string> {
  const priorKeys = state.descriptorLineKeys.get(descriptorId) ?? new Set<string>();
  const priorCell = state.descriptorCellKeys.get(descriptorId);
  if (priorCell) {
    const ids = state.cellDescriptorIds.get(priorCell);
    ids?.delete(descriptorId);
    if (ids?.size === 0) state.cellDescriptorIds.delete(priorCell);
  }
  for (const key of priorKeys) {
    const ids = state.lineDescriptorIds.get(key);
    ids?.delete(descriptorId);
    if (ids?.size === 0) state.lineDescriptorIds.delete(key);
  }
  state.descriptors.delete(descriptorId);
  state.descriptorLineKeys.delete(descriptorId);
  state.descriptorCellKeys.delete(descriptorId);
  state.descriptorEpochs.delete(descriptorId);
  return new Set(priorKeys);
}
function indexDescriptor(state: ArchRuntimeState, descriptor: CellDescriptor): Set<string> {
  const previous = removeDescriptorFromIndex(state, descriptor.id);
  const keys = descriptorArchLineKeys(descriptor);
  state.descriptors.set(descriptor.id, descriptor);
  state.descriptorLineKeys.set(descriptor.id, keys);
  const key = cellKey(descriptor.address.cellX, descriptor.address.cellZ);
  state.descriptorCellKeys.set(descriptor.id, key);
  const cellIds = state.cellDescriptorIds.get(key) ?? new Set<string>();
  cellIds.add(descriptor.id);
  state.cellDescriptorIds.set(key, cellIds);
  for (const lineKey of keys) {
    const lineIds = state.lineDescriptorIds.get(lineKey) ?? new Set<string>();
    lineIds.add(descriptor.id);
    state.lineDescriptorIds.set(lineKey, lineIds);
  }
  state.descriptorEpochs.set(descriptor.id, state.nextEpoch++);
  archPresentationDiagnostics.lineIndexUpdates += 1;
  return new Set([...previous, ...keys]);
}
function nearbyIndexedLineKeys(state: ArchRuntimeState, descriptor: CellDescriptor): Set<string> {
  const result = new Set<string>();
  for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) {
    const ids = state.cellDescriptorIds.get(cellKey(descriptor.address.cellX + dx, descriptor.address.cellZ + dz));
    if (!ids) continue;
    for (const id of ids) for (const key of state.descriptorLineKeys.get(id) ?? []) result.add(key);
  }
  return result;
}
function contextDescriptorsForLine(state: ArchRuntimeState, lineKey: string): CellDescriptor[] {
  const ids = state.lineDescriptorIds.get(lineKey);
  if (!ids || ids.size === 0) return [];
  const contextIds = new Set<string>(ids);
  for (const id of ids) {
    const descriptor = state.descriptors.get(id);
    if (!descriptor) continue;
    for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) {
      const nearby = state.cellDescriptorIds.get(cellKey(descriptor.address.cellX + dx, descriptor.address.cellZ + dz));
      if (nearby) for (const nearbyId of nearby) contextIds.add(nearbyId);
    }
  }
  return [...contextIds].map((id) => state.descriptors.get(id)).filter((value): value is CellDescriptor => Boolean(value));
}
function ownerDescriptorIdsForRuns(state: ArchRuntimeState, runs: readonly ArchStructuralRun[]): Set<string> {
  const owners = new Set<string>();
  for (const run of runs) {
    const perpendicular = perpendicularCellOwner(run.fixed);
    const startCell = alongCellOwner(run.start + 0.0001);
    const endCell = alongCellOwner(run.end - 0.0001);
    for (let along = startCell; along <= endCell; along += 1) {
      const key = run.orientation === 'z' ? cellKey(along, perpendicular) : cellKey(perpendicular, along);
      const ids = state.cellDescriptorIds.get(key);
      if (ids) for (const id of ids) owners.add(id);
    }
  }
  return owners;
}
function ownerSignature(state: ArchRuntimeState, ownerIds: ReadonlySet<string>): string {
  return [...ownerIds].sort().map((id) => componentOwnerKey(id, state.descriptorEpochs.get(id) ?? 0)).join('|');
}

interface DesiredLineState {
  entityNames: Set<string>;
  colliderIds: Set<string>;
  createEntities(): number;
  createColliders(): number;
}
function desiredLineState(renderer: WorldRenderer, visual: CellVisual, runs: readonly ArchStructuralRun[]): DesiredLineState {
  const cache = cacheFor(renderer);
  const pierMaterial = material(cache, 'arch-frame:pier', ARCH_PIER_TINT);
  const upperMaterial = material(cache, 'arch-frame:upper', ARCH_UPPER_TINT);
  const panelMaterial = material(cache, 'arch-frame:panel', ARCH_PANEL_TINT);
  const boxSpecs: DesiredBox[] = [];
  const curveBays: ArchFrameBay[] = [];
  const colliders: WorldCollider[] = [];
  const shoulderHeight = ARCH_UPPER_TOP - ARCH_UPPER_BOTTOM;
  for (const run of runs) {
    run.pierIntervals.forEach((support, index) => {
      const lower = desiredBox(visual, `pier-lower:${run.lineKey}:${run.id}:${index}`, run.orientation, run.fixed, support[0], support[1], ARCH_UPPER_BOTTOM / 2, ARCH_UPPER_BOTTOM, ARCH_PIER_DEPTH, pierMaterial);
      if (lower) boxSpecs.push(lower);
      const upperPierHeight = WALL_HEIGHT - ARCH_UPPER_TOP;
      const upper = desiredBox(visual, `pier-upper:${run.lineKey}:${run.id}:${index}`, run.orientation, run.fixed, support[0], support[1], ARCH_UPPER_TOP + upperPierHeight / 2, upperPierHeight, ARCH_PIER_DEPTH, pierMaterial);
      if (upper) boxSpecs.push(upper);
      const collider = canonicalCollider(visual, run, 'pier', index, support, WALL_HEIGHT);
      if (collider) colliders.push(collider);
    });
    run.upperIntervals.forEach((interval, index) => {
      const spec = desiredBox(visual, `upper-run:${run.lineKey}:${run.id}:${index}`, run.orientation, run.fixed, interval[0], interval[1], ARCH_UPPER_BOTTOM + shoulderHeight / 2, shoulderHeight, ARCH_UPPER_DEPTH, upperMaterial);
      if (spec) boxSpecs.push(spec);
    });
    run.lowerPanelIntervals.forEach((interval, index) => {
      const inset = interval[1] - interval[0] > 0.08 ? 0.02 : 0;
      const spec = desiredBox(visual, `lower-panel:${run.lineKey}:${run.id}:${index}`, run.orientation, run.fixed, interval[0] + inset, interval[1] - inset, ARCH_LOWER_PANEL_HEIGHT / 2, ARCH_LOWER_PANEL_HEIGHT, ARCH_LOWER_PANEL_DEPTH, panelMaterial);
      if (spec) boxSpecs.push(spec);
      const collider = canonicalCollider(visual, run, 'lower-panel', index, interval, ARCH_LOWER_HEIGHT);
      if (collider) colliders.push(collider);
    });
    run.terminationIntervals.forEach((interval, index) => {
      const spec = desiredBox(visual, `termination:${run.lineKey}:${run.id}:${index}`, run.orientation, run.fixed, interval[0], interval[1], WALL_HEIGHT / 2, WALL_HEIGHT, WALL_THICKNESS, pierMaterial);
      if (spec) boxSpecs.push(spec);
      const collider = canonicalCollider(visual, run, 'termination', index, interval, WALL_HEIGHT);
      if (collider) colliders.push(collider);
    });
    for (const bay of run.bays) if (cellOwnsLine(visual.descriptor, bay.orientation, bay.fixed) && clippedInterval(visual.descriptor, bay.orientation, bay.curveStart, bay.curveEnd)) curveBays.push(bay);
  }
  const entityNames = new Set([...boxSpecs.map((spec) => spec.name), ...curveBays.map((bay) => curveEntityName(bay, visual.descriptor))]);
  const colliderIds = new Set(colliders.map((collider) => collider.id));
  return {
    entityNames,
    colliderIds,
    createEntities: () => {
      let created = 0;
      for (const spec of boxSpecs) if (ensureBox(visual, spec)) created += 1;
      for (const bay of curveBays) if (addCurveMeshClipped(renderer, visual, bay, upperMaterial)) created += 1;
      return created;
    },
    createColliders: () => {
      let created = 0;
      const existing = new Set(visual.colliders.map((collider) => collider.id));
      for (const collider of colliders) {
        if (existing.has(collider.id)) continue;
        visual.colliders.push(collider);
        renderer.walls.set(collider.id, collider);
        created += 1;
      }
      return created;
    }
  };
}
function reconcileVisualLine(renderer: WorldRenderer, visual: CellVisual, lineKey: string, runs: readonly ArchStructuralRun[]): void {
  archPresentationDiagnostics.targetVisualsVisited += 1;
  const desired = desiredLineState(renderer, visual, runs);
  const presentationStart = now();
  let destroyed = 0;
  for (const child of childrenOf(visual.root)) {
    if (!child.name.startsWith(ARCH_FRAME_PREFIX) || !lineKeyFromOwnedName(child.name, lineKey)) continue;
    if (desired.entityNames.has(child.name)) continue;
    child.destroy();
    destroyed += 1;
  }
  const created = desired.createEntities();
  archPresentationDiagnostics.meshesDestroyed += destroyed;
  archPresentationDiagnostics.meshesCreated += created;
  archPresentationDiagnostics.presentationMutationMs += now() - presentationStart;

  const collisionStart = now();
  let removed = 0;
  visual.colliders = visual.colliders.filter((collider) => {
    if (!collider.id.startsWith(ARCH_COLLIDER_PREFIX) || !lineKeyFromOwnedName(collider.id, lineKey) || desired.colliderIds.has(collider.id)) return true;
    renderer.walls.delete(collider.id);
    removed += 1;
    return false;
  });
  const colliderCreated = desired.createColliders();
  archPresentationDiagnostics.collidersRemoved += removed;
  archPresentationDiagnostics.collidersCreated += colliderCreated;
  archPresentationDiagnostics.collisionMutationMs += now() - collisionStart;
  if (destroyed + created > 0) markArchPresentationDirty(visual);
}
function clearVisualLine(renderer: WorldRenderer, visual: CellVisual, lineKey: string): void {
  archPresentationDiagnostics.targetVisualsVisited += 1;
  const presentationStart = now();
  let destroyed = 0;
  for (const child of childrenOf(visual.root)) {
    if (!child.name.startsWith(ARCH_FRAME_PREFIX) || !lineKeyFromOwnedName(child.name, lineKey)) continue;
    child.destroy();
    destroyed += 1;
  }
  archPresentationDiagnostics.meshesDestroyed += destroyed;
  archPresentationDiagnostics.presentationMutationMs += now() - presentationStart;
  const collisionStart = now();
  let removed = 0;
  visual.colliders = visual.colliders.filter((collider) => {
    if (!collider.id.startsWith(ARCH_COLLIDER_PREFIX) || !lineKeyFromOwnedName(collider.id, lineKey)) return true;
    renderer.walls.delete(collider.id);
    removed += 1;
    return false;
  });
  archPresentationDiagnostics.collidersRemoved += removed;
  archPresentationDiagnostics.collisionMutationMs += now() - collisionStart;
  if (destroyed > 0) markArchPresentationDirty(visual);
}

export interface ArchPresentationDiagnostics {
  reconstructionCalls: number;
  reconstructedCells: number;
  reconstructionMs: number;
  maxReconstructionMs: number;
  loadHookCalls: number;
  unloadHookCalls: number;
  descriptorsInspected: number;
  wallsInspected: number;
  loadedVisualsScanned: number;
  lineIndexUpdates: number;
  structuralRunDerivations: number;
  structuralSignatureComparisons: number;
  unchangedSignatureSkips: number;
  targetVisualsVisited: number;
  meshesDestroyed: number;
  meshesCreated: number;
  collidersRemoved: number;
  collidersCreated: number;
  staticBatchDirtyCalls: number;
  discoveryMs: number;
  derivationMs: number;
  diffMs: number;
  presentationMutationMs: number;
  collisionMutationMs: number;
  totalLifecycleMs: number;
  maxLifecycleMs: number;
  scenarioMaxLifecycleMs: number;
  p50LifecycleMs: number;
  p95LifecycleMs: number;
}
const lifecycleSamples: number[] = [];
let scenarioLifecycleSamples: number[] = [];
const archPresentationDiagnostics: ArchPresentationDiagnostics = {
  reconstructionCalls: 0, reconstructedCells: 0, reconstructionMs: 0, maxReconstructionMs: 0,
  loadHookCalls: 0, unloadHookCalls: 0, descriptorsInspected: 0, wallsInspected: 0, loadedVisualsScanned: 0, lineIndexUpdates: 0,
  structuralRunDerivations: 0, structuralSignatureComparisons: 0, unchangedSignatureSkips: 0, targetVisualsVisited: 0,
  meshesDestroyed: 0, meshesCreated: 0, collidersRemoved: 0, collidersCreated: 0, staticBatchDirtyCalls: 0,
  discoveryMs: 0, derivationMs: 0, diffMs: 0, presentationMutationMs: 0, collisionMutationMs: 0,
  totalLifecycleMs: 0, maxLifecycleMs: 0, scenarioMaxLifecycleMs: 0, p50LifecycleMs: 0, p95LifecycleMs: 0
};
function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index] ?? 0;
}
function recordLifecycleSample(durationMs: number): void {
  archPresentationDiagnostics.totalLifecycleMs += durationMs;
  archPresentationDiagnostics.maxLifecycleMs = Math.max(archPresentationDiagnostics.maxLifecycleMs, durationMs);
  lifecycleSamples.push(durationMs);
  if (lifecycleSamples.length > 2048) lifecycleSamples.splice(0, lifecycleSamples.length - 2048);
  scenarioLifecycleSamples.push(durationMs);
  if (scenarioLifecycleSamples.length > 2048) scenarioLifecycleSamples.splice(0, scenarioLifecycleSamples.length - 2048);
  archPresentationDiagnostics.scenarioMaxLifecycleMs = Math.max(archPresentationDiagnostics.scenarioMaxLifecycleMs, durationMs);
  archPresentationDiagnostics.p50LifecycleMs = percentile(scenarioLifecycleSamples, 0.5);
  archPresentationDiagnostics.p95LifecycleMs = percentile(scenarioLifecycleSamples, 0.95);
}
export function resetArchPresentationDiagnosticsScenario(): void {
  scenarioLifecycleSamples = [];
  archPresentationDiagnostics.scenarioMaxLifecycleMs = 0;
  archPresentationDiagnostics.p50LifecycleMs = 0;
  archPresentationDiagnostics.p95LifecycleMs = 0;
}
export function recordArchStaticBatchDirtyCall(): void { archPresentationDiagnostics.staticBatchDirtyCalls += 1; }
export function archPresentationDiagnosticsSnapshot(): ArchPresentationDiagnostics { return { ...archPresentationDiagnostics }; }

function reconcileArchLine(renderer: WorldRenderer, lineKey: string): void {
  const lifecycleStart = now();
  const state = runtimeState(renderer);
  const derivationStart = now();
  const context = contextDescriptorsForLine(state, lineKey);
  archPresentationDiagnostics.descriptorsInspected += context.length;
  archPresentationDiagnostics.wallsInspected += context.reduce((sum, descriptor) => sum + descriptor.walls.length, 0);
  const runs = deriveArchStructuralRuns(context, lineKey);
  archPresentationDiagnostics.structuralRunDerivations += 1;
  archPresentationDiagnostics.derivationMs += now() - derivationStart;

  const diffStart = now();
  const structureSignature = structuralSignatureJson(runs);
  const ownerIds = ownerDescriptorIdsForRuns(state, runs);
  const ownersSignature = ownerSignature(state, ownerIds);
  const priorStructure = state.lineStructuralSignatures.get(lineKey);
  const priorOwnersSignature = state.lineOwnerSignatures.get(lineKey);
  const priorOwnerIds = state.lineOwnerDescriptorIds.get(lineKey) ?? new Set<string>();
  archPresentationDiagnostics.structuralSignatureComparisons += 1;
  const structureChanged = structureSignature !== priorStructure;
  const ownersChanged = ownersSignature !== priorOwnersSignature;
  archPresentationDiagnostics.diffMs += now() - diffStart;

  if (!structureChanged && !ownersChanged) {
    archPresentationDiagnostics.unchangedSignatureSkips += 1;
    const duration = now() - lifecycleStart;
    archPresentationDiagnostics.reconstructionCalls += 1;
    archPresentationDiagnostics.reconstructionMs += duration;
    archPresentationDiagnostics.maxReconstructionMs = Math.max(archPresentationDiagnostics.maxReconstructionMs, duration);
    recordLifecycleSample(duration);
    return;
  }

  const affectedOwnerIds = new Set<string>();
  if (structureChanged) {
    for (const id of priorOwnerIds) affectedOwnerIds.add(id);
    for (const id of ownerIds) affectedOwnerIds.add(id);
  } else {
    for (const id of priorOwnerIds) if (!ownerIds.has(id)) affectedOwnerIds.add(id);
    for (const id of ownerIds) if (!priorOwnerIds.has(id)) affectedOwnerIds.add(id);
  }
  for (const id of affectedOwnerIds) {
    const visual = renderer.loaded.get(id);
    if (!visual) continue;
    if (ownerIds.has(id)) reconcileVisualLine(renderer, visual, lineKey, runs);
    else clearVisualLine(renderer, visual, lineKey);
  }
  state.lineStructuralSignatures.set(lineKey, structureSignature);
  state.lineOwnerSignatures.set(lineKey, ownersSignature);
  state.lineOwnerDescriptorIds.set(lineKey, new Set(ownerIds));
  archPresentationDiagnostics.reconstructedCells += affectedOwnerIds.size;
  const duration = now() - lifecycleStart;
  archPresentationDiagnostics.reconstructionCalls += 1;
  archPresentationDiagnostics.reconstructionMs += duration;
  archPresentationDiagnostics.maxReconstructionMs = Math.max(archPresentationDiagnostics.maxReconstructionMs, duration);
  recordLifecycleSample(duration);
}
function scheduleAffectedLines(renderer: WorldRenderer, lineKeys: ReadonlySet<string>): void {
  if (lineKeys.size === 0) return;
  const state = runtimeState(renderer);
  for (const key of lineKeys) state.pendingLines.add(key);
  if (state.scheduled) return;
  state.scheduled = true;
  queueMicrotask(() => {
    state.scheduled = false;
    if (state.pendingLines.size === 0) return;
    const keys = [...state.pendingLines];
    state.pendingLines.clear();
    for (const key of keys) reconcileArchLine(renderer, key);
  });
}
function applyRegionPresentation(renderer: WorldRenderer, visual: CellVisual): void {
  if (visual.descriptor.world.generationVersion !== 'gen3-v1') return;
  replaceHoleDepth(renderer, visual);
  applyCarpetPresentation(visual);
}

/**
 * A-A1 source WallSpecs remain deterministic world-generation evidence only.
 * The indexed renderer-owned run model is the single final owner for A-A1
 * visible structure and player-facing collision. Cell events update bounded
 * semantic indexes; unchanged runs perform no presentation/collision mutation.
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
    if (alreadyLoaded || !visual) return;

    const lifecycleStart = now();
    archPresentationDiagnostics.loadHookCalls += 1;
    const discoveryStart = now();
    const state = runtimeState(this);
    const nearbyBefore = nearbyIndexedLineKeys(state, descriptor);
    const changedKeys = indexDescriptor(state, descriptor);
    for (const key of nearbyBefore) changedKeys.add(key);
    archPresentationDiagnostics.descriptorsInspected += 1;
    archPresentationDiagnostics.wallsInspected += descriptor.walls.length;
    suppressLocalArchSources(this, visual);
    archPresentationDiagnostics.discoveryMs += now() - discoveryStart;
    scheduleAffectedLines(this, changedKeys);
    recordLifecycleSample(now() - lifecycleStart);
  };

  const originalUnloadCell = WorldRenderer.prototype.unloadCell;
  WorldRenderer.prototype.unloadCell = function patchedRegionPresentationUnload(this: WorldRenderer, cellId: string): void {
    const descriptor = this.loaded.get(cellId)?.descriptor;
    if (!descriptor) {
      originalUnloadCell.call(this, cellId);
      return;
    }
    const lifecycleStart = now();
    archPresentationDiagnostics.unloadHookCalls += 1;
    const state = runtimeState(this);
    const discoveryStart = now();
    const affected = new Set<string>([...(state.descriptorLineKeys.get(cellId) ?? []), ...nearbyIndexedLineKeys(state, descriptor)]);
    originalUnloadCell.call(this, cellId);
    for (const key of removeDescriptorFromIndex(state, cellId)) affected.add(key);
    archPresentationDiagnostics.descriptorsInspected += 1;
    archPresentationDiagnostics.wallsInspected += descriptor.walls.length;
    archPresentationDiagnostics.lineIndexUpdates += 1;
    archPresentationDiagnostics.discoveryMs += now() - discoveryStart;
    scheduleAffectedLines(this, affected);
    recordLifecycleSample(now() - lifecycleStart);
  };
}
