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
  bays: ArchFrameBay[];
  pierIntervals: Interval[];
  upperIntervals: Interval[];
  lowerPanelIntervals: Interval[];
  terminationIntervals: Interval[];
  sourceWallIds: Set<string>;
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
      `${hole.id}:void`, `${hole.id}:depth`, `${hole.id}:north-side`, `${hole.id}:south-side`, `${hole.id}:west-side`, `${hole.id}:east-side`
    ]) entityByName(visual.root, name)?.destroy();
    for (const child of childrenOf(visual.root)) {
      if (
        child.name.startsWith(`${hole.id}:depth-band:`)
        || child.name === `${hole.id}:depth-void`
        || child.name === `${hole.id}:depth-occluder`
      ) child.destroy();
    }
    const bands = holeDepthBands();
    for (const band of bands) addHoleBand(visual.root, hole, band, material(cache, `hole:${band.key}`, band.tint));
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
function wallLength(wall: WallSpec): number { return Math.max(wall.sx, wall.sz); }
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
function isArchPierSupport(wall: WallSpec): boolean {
  const headerBottom = WALL_HEIGHT - ARCH_HEADER_HEIGHT;
  return wall.materialId === 'arch-pale-wallpaper'
    && wallMinY(wall) > 0.04
    && wallMinY(wall) <= ARCH_LOWER_HEIGHT + 0.065
    && wallMaxY(wall) >= headerBottom - 0.045
    && wall.sy > 1.35;
}
function isFullHeightStructuralWall(wall: WallSpec): boolean {
  return wallMinY(wall) <= 0.04
    && wallMaxY(wall) >= WALL_HEIGHT - 0.04
    && wall.sy >= WALL_HEIGHT - 0.08;
}
function isArchTerminationShape(wall: WallSpec): boolean {
  return wall.materialId === 'arch-pale-wallpaper'
    && isFullHeightStructuralWall(wall)
    && wallLength(wall) <= ARCH_TERMINATION_MAX_LENGTH + 0.02;
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
  return Math.abs(candidate.start - header.start) <= ARCH_SOURCE_MATCH_TOLERANCE
    || Math.abs(candidate.end - header.end) <= ARCH_SOURCE_MATCH_TOLERANCE;
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
        piers: [],
        terminationCandidates: []
      };
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
      if (isArchTerminationShape(wall) && line.headers.some((header) => candidateMatchesHeaderSource(world, header))) {
        line.terminationCandidates.push(world);
      }
    }
  }
  return lines;
}

function mergedHeaderRuns(line: WorldArchLine): Interval[] {
  return mergeIntervals(line.headers.map((header) => [header.start, header.end] as const));
}

function curveWidthForBay(width: number): number {
  return preservedArchCurveWidth(width);
}

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
  const solids = mergeIntervals(line.piers.map((wall) => [wall.start, wall.end] as const))
    .filter((solid) => overlapsInterval(solid, header));
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
  return bays;
}

function rectangularUpperRuns(bays: readonly ArchFrameBay[], supports: readonly Interval[]): Interval[] {
  const intervals: Interval[] = supports.map(([start, end]) => [start, end] as const);
  for (const bay of bays) intervals.push([bay.start, bay.curveStart], [bay.curveEnd, bay.end]);
  return mergeIntervals(intervals);
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
  for (const wall of [...line.headers, ...line.lowers, ...line.piers, ...line.terminationCandidates]) {
    if (overlapsInterval([wall.start, wall.end], header)) ids.add(wall.id);
  }
  return ids;
}

function deriveArchStructuralRuns(descriptors: readonly CellDescriptor[]): ArchStructuralRun[] {
  const lines = archLinesForDescriptors(descriptors);
  const fullHeightWalls = fullHeightWorldWalls(descriptors);
  const runs: ArchStructuralRun[] = [];
  for (const line of lines.values()) {
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
      const upperIntervals = subtractIntervals(rectangularUpperRuns(bays, activePiers), terminationIntervals);
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

export function archFrameBaysForDescriptors(descriptors: readonly CellDescriptor[]): ArchFrameBay[] {
  return deriveArchStructuralRuns(descriptors).flatMap((run) => run.bays);
}

export function archStructuralSignatureForDescriptors(descriptors: readonly CellDescriptor[]): ArchStructuralSignatureEntry[] {
  const signature: ArchStructuralSignatureEntry[] = [];
  for (const run of deriveArchStructuralRuns(descriptors)) {
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

export function archSemanticSourceIdsForDescriptors(descriptors: readonly CellDescriptor[]): string[] {
  const ids = new Set<string>();
  for (const run of deriveArchStructuralRuns(descriptors)) for (const id of run.sourceWallIds) ids.add(id);
  return [...ids].sort();
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
  const entersFromPreviousCell = start < cellStart - 0.0005;
  const continuesIntoNextCell = end > cellEnd + 0.0005;
  const clippedStart = Math.max(start, cellStart + (entersFromPreviousCell ? ARCH_CELL_SEAM_HANDOFF : 0));
  const clippedEnd = Math.min(end, cellEnd + (continuesIntoNextCell ? ARCH_CELL_SEAM_HANDOFF : 0));
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

function lineKeyFromChildName(name: string, lineKey: string): boolean {
  return name.includes(`:${lineKey}:`);
}
function clearArchFrameVisualsForLines(visual: CellVisual, lineKeys: ReadonlySet<string>): void {
  for (const child of childrenOf(visual.root)) {
    if (!child.name.startsWith(ARCH_FRAME_PREFIX)) continue;
    if ([...lineKeys].some((lineKey) => lineKeyFromChildName(child.name, lineKey))) child.destroy();
  }
}
function clearCanonicalCollidersForLines(renderer: WorldRenderer, visual: CellVisual, lineKeys: ReadonlySet<string>): void {
  visual.colliders = visual.colliders.filter((collider) => {
    if (!collider.id.startsWith(ARCH_COLLIDER_PREFIX)) return true;
    const targeted = [...lineKeys].some((lineKey) => lineKeyFromChildName(collider.id, lineKey));
    if (!targeted) return true;
    renderer.walls.delete(collider.id);
    return false;
  });
}
function suppressSourceIds(renderer: WorldRenderer, visual: CellVisual, sourceIds: ReadonlySet<string>): void {
  for (const id of sourceIds) {
    const source = entityByName(visual.root, id);
    if (source?.render) source.render.enabled = false;
    renderer.walls.delete(id);
  }
}
function localSourceIds(descriptor: CellDescriptor): Set<string> {
  return new Set(archSemanticSourceIdsForDescriptors([descriptor]));
}
function suppressLocalArchSources(renderer: WorldRenderer, visual: CellVisual): void {
  suppressSourceIds(renderer, visual, localSourceIds(visual.descriptor));
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
    cx,
    cy,
    cz,
    sx,
    sy: height,
    sz,
    orientation: run.orientation,
    drawable: true
  };
}
function addCanonicalCollider(renderer: WorldRenderer, visual: CellVisual, collider: WorldCollider | undefined): void {
  if (!collider) return;
  visual.colliders.push(collider);
  renderer.walls.set(collider.id, collider);
}

function renderStructuralRun(
  renderer: WorldRenderer,
  visuals: readonly CellVisual[],
  run: ArchStructuralRun,
  pierMaterial: pc.StandardMaterial,
  upperMaterial: pc.StandardMaterial,
  panelMaterial: pc.StandardMaterial
): void {
  const shoulderHeight = ARCH_UPPER_TOP - ARCH_UPPER_BOTTOM;
  for (const visual of visuals) {
    if (visual.descriptor.world.generationVersion !== 'gen3-v1') continue;
    run.pierIntervals.forEach((support, index) => {
      addWorldBoxClipped(visual, `pier-lower:${run.lineKey}:${run.id}:${index}`, run.orientation, run.fixed, support[0], support[1], ARCH_UPPER_BOTTOM / 2, ARCH_UPPER_BOTTOM, ARCH_PIER_DEPTH, pierMaterial);
      const upperPierHeight = WALL_HEIGHT - ARCH_UPPER_TOP;
      addWorldBoxClipped(visual, `pier-upper:${run.lineKey}:${run.id}:${index}`, run.orientation, run.fixed, support[0], support[1], ARCH_UPPER_TOP + upperPierHeight / 2, upperPierHeight, ARCH_PIER_DEPTH, pierMaterial);
      addCanonicalCollider(renderer, visual, canonicalCollider(visual, run, 'pier', index, support, WALL_HEIGHT));
    });
    run.upperIntervals.forEach((interval, index) => addWorldBoxClipped(visual, `upper-run:${run.lineKey}:${run.id}:${index}`, run.orientation, run.fixed, interval[0], interval[1], ARCH_UPPER_BOTTOM + shoulderHeight / 2, shoulderHeight, ARCH_UPPER_DEPTH, upperMaterial));
    run.lowerPanelIntervals.forEach((interval, index) => {
      const inset = interval[1] - interval[0] > 0.08 ? 0.02 : 0;
      addWorldBoxClipped(visual, `lower-panel:${run.lineKey}:${run.id}:${index}`, run.orientation, run.fixed, interval[0] + inset, interval[1] - inset, ARCH_LOWER_PANEL_HEIGHT / 2, ARCH_LOWER_PANEL_HEIGHT, ARCH_LOWER_PANEL_DEPTH, panelMaterial);
      addCanonicalCollider(renderer, visual, canonicalCollider(visual, run, 'lower-panel', index, interval, ARCH_LOWER_HEIGHT));
    });
    run.terminationIntervals.forEach((interval, index) => {
      addWorldBoxClipped(visual, `termination:${run.lineKey}:${run.id}:${index}`, run.orientation, run.fixed, interval[0], interval[1], WALL_HEIGHT / 2, WALL_HEIGHT, WALL_THICKNESS, pierMaterial);
      addCanonicalCollider(renderer, visual, canonicalCollider(visual, run, 'termination', index, interval, WALL_HEIGHT));
    });
    for (const bay of run.bays) addCurveMeshClipped(renderer, visual, bay, upperMaterial);
  }
}

function parseLineKey(lineKey: string): { orientation: WallSpec['orientation']; fixed: number } | undefined {
  const separator = lineKey.indexOf(':');
  if (separator < 0) return undefined;
  const orientation = lineKey.slice(0, separator);
  const fixed = Number(lineKey.slice(separator + 1));
  if ((orientation !== 'x' && orientation !== 'z') || !Number.isFinite(fixed)) return undefined;
  return { orientation, fixed };
}
function descriptorArchLineKeys(descriptor: CellDescriptor): Set<string> {
  return new Set([...localArchLines(descriptor).keys()]);
}
function visualCouldOwnLine(visual: CellVisual, lineKey: string): boolean {
  const parsed = parseLineKey(lineKey);
  if (!parsed) return false;
  return cellOwnsLine(visual.descriptor, parsed.orientation, parsed.fixed);
}

function reconcileArchRuns(renderer: WorldRenderer, lineKeys: ReadonlySet<string>): void {
  if (lineKeys.size === 0) return;
  const reconstructionStart = performance.now();
  const visuals = [...renderer.loaded.values()];
  const descriptors = visuals.map((visual) => visual.descriptor);
  const runs = deriveArchStructuralRuns(descriptors).filter((run) => lineKeys.has(run.lineKey));
  const sourceIds = new Set(runs.flatMap((run) => [...run.sourceWallIds]));
  const targetVisuals = visuals.filter((visual) => [...lineKeys].some((lineKey) => visualCouldOwnLine(visual, lineKey)) || [...descriptorArchLineKeys(visual.descriptor)].some((lineKey) => lineKeys.has(lineKey)));

  for (const visual of targetVisuals) {
    clearArchFrameVisualsForLines(visual, lineKeys);
    clearCanonicalCollidersForLines(renderer, visual, lineKeys);
    suppressSourceIds(renderer, visual, sourceIds);
  }

  const cache = cacheFor(renderer);
  const pierMaterial = material(cache, 'arch-frame:pier', ARCH_PIER_TINT);
  const upperMaterial = material(cache, 'arch-frame:upper', ARCH_UPPER_TINT);
  const panelMaterial = material(cache, 'arch-frame:panel', ARCH_PANEL_TINT);
  for (const run of runs) renderStructuralRun(renderer, targetVisuals, run, pierMaterial, upperMaterial, panelMaterial);

  const reconstructionMs = performance.now() - reconstructionStart;
  archPresentationDiagnostics.reconstructionCalls += 1;
  archPresentationDiagnostics.reconstructedCells += targetVisuals.length;
  archPresentationDiagnostics.reconstructionMs += reconstructionMs;
  archPresentationDiagnostics.maxReconstructionMs = Math.max(archPresentationDiagnostics.maxReconstructionMs, reconstructionMs);
}

function applyRegionPresentation(renderer: WorldRenderer, visual: CellVisual): void {
  if (visual.descriptor.world.generationVersion !== 'gen3-v1') return;
  replaceHoleDepth(renderer, visual);
  applyCarpetPresentation(visual);
}

/**
 * A-A1 source WallSpecs remain deterministic world-generation evidence only.
 * This renderer-owned run model is the single final owner for A-A1 visible
 * structure and player-facing collision, so no semantic fallback is painted
 * first and no later compatibility layer can invent another termination.
 */
export interface ArchPresentationDiagnostics {
  reconstructionCalls: number;
  reconstructedCells: number;
  reconstructionMs: number;
  maxReconstructionMs: number;
}

const archPresentationDiagnostics: ArchPresentationDiagnostics = {
  reconstructionCalls: 0,
  reconstructedCells: 0,
  reconstructionMs: 0,
  maxReconstructionMs: 0
};

export function archPresentationDiagnosticsSnapshot(): ArchPresentationDiagnostics {
  return { ...archPresentationDiagnostics };
}

const pendingArchLines = new WeakMap<WorldRenderer, Set<string>>();
const scheduledArchFlush = new WeakSet<WorldRenderer>();

function markAffectedArchRuns(renderer: WorldRenderer, descriptor: CellDescriptor, explicitKeys?: ReadonlySet<string>): void {
  const pending = pendingArchLines.get(renderer) ?? new Set<string>();
  for (const key of explicitKeys ?? descriptorArchLineKeys(descriptor)) pending.add(key);
  for (const visual of renderer.loaded.values()) {
    const nearby = Math.abs(visual.descriptor.address.cellX - descriptor.address.cellX) <= 1
      && Math.abs(visual.descriptor.address.cellZ - descriptor.address.cellZ) <= 1;
    if (!nearby) continue;
    for (const key of descriptorArchLineKeys(visual.descriptor)) pending.add(key);
  }
  pendingArchLines.set(renderer, pending);
  if (scheduledArchFlush.has(renderer)) return;
  scheduledArchFlush.add(renderer);
  queueMicrotask(() => {
    scheduledArchFlush.delete(renderer);
    const keys = pendingArchLines.get(renderer);
    if (!keys || keys.size === 0) return;
    pendingArchLines.set(renderer, new Set());
    reconcileArchRuns(renderer, keys);
  });
}

export function installLevel0RegionPresentation(): void {
  if (installed) return;
  installed = true;
  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function patchedRegionPresentationLoad(this: WorldRenderer, descriptor: CellDescriptor): void {
    const alreadyLoaded = this.loaded.has(descriptor.id);
    originalLoadCell.call(this, descriptor);
    const visual = this.loaded.get(descriptor.id);
    if (visual && !alreadyLoaded) {
      applyRegionPresentation(this, visual);
      // Suppress semantic A-A1 source boxes and their provisional colliders in
      // the same JavaScript turn as Cell construction. The queued run reconcile
      // therefore becomes the first player-visible A-A1 state, not a later fix.
      suppressLocalArchSources(this, visual);
    }
    markAffectedArchRuns(this, descriptor);
  };

  const originalUnloadCell = WorldRenderer.prototype.unloadCell;
  WorldRenderer.prototype.unloadCell = function patchedRegionPresentationUnload(this: WorldRenderer, cellId: string): void {
    const descriptor = this.loaded.get(cellId)?.descriptor;
    const keys = descriptor ? descriptorArchLineKeys(descriptor) : undefined;
    originalUnloadCell.call(this, cellId);
    if (descriptor) markAffectedArchRuns(this, descriptor, keys);
  };
}
