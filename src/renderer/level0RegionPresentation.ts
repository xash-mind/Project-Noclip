import * as pc from 'playcanvas';
import { resolveCvh1DepthPresentation, resolveLevel0CarpetPresentation, type Level0ArchFinishRole } from '../presentation/level0PresentationPolicy.js';
import { ARCH_SHOULDER_SPAN_SCALE } from '../world/gen3ArchitectureCore.js';
import {
  ARCH_FRAME_CELL_SEAM_HANDOFF,
  ARCH_LOWER_PANEL_DEPTH,
  ARCH_LOWER_PANEL_END_INSET,
  ARCH_LOWER_PANEL_HEIGHT,
  archCellOwnsLine as cellOwnsLine,
  archDividerLinesForDescriptors as archLinesForDescriptors,
  archFrameBaysForDescriptors as canonicalArchFrameBaysForDescriptors,
  archFrameBaysForLine as frameBaysForLine,
  archStructuralRole,
  clipArchIntervalForCell as clippedInterval,
  mergeArchIntervals as mergeIntervals,
  type ArchFrameBay,
  type ArchInterval as Interval,
  type ArchSemanticLine as WorldArchLine
} from '../world/gen3ArchDividerSemantics.js';
import {
  CELL_SIZE,
  WALL_HEIGHT,
  WALL_THICKNESS,
  type CellDescriptor,
  type FloorPatchSpec,
  type RegionId,
  type WallSpec
} from '../world/types.js';
import {
  bindLevel0ArchFinishRole,
  cvh1DepthMaterial,
  level0ArchFinishMaterial
} from './level0PresentationMaterials.js';
import { WorldRenderer } from './WorldRenderer.js';
import type { CellVisual } from './support.js';

interface RendererAccess { app: pc.Application; }
type Vec3Tuple = readonly [number, number, number];

export type { ArchFrameBay } from '../world/gen3ArchDividerSemantics.js';
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

const ARCH_CURVE_SEGMENTS = 18;
const ARCH_UPPER_BOTTOM = 1.92;
const ARCH_UPPER_TOP = WALL_HEIGHT - 0.24;
const ARCH_CURVE_APEX = Math.min(ARCH_UPPER_TOP - 0.24, 2.46);
const ARCH_PIER_DEPTH = WALL_THICKNESS + 0.10;
const ARCH_UPPER_DEPTH = WALL_THICKNESS + 0.16;
const ARCH_FRAME_PREFIX = 'arch-frame:';

function childrenOf(entity: pc.Entity): pc.Entity[] {
  return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children];
}
function entityByName(root: pc.Entity, name: string): pc.Entity | undefined {
  return childrenOf(root).find((child) => child.name === name);
}
function addBox(
  name: string,
  parent: pc.Entity,
  position: Vec3Tuple,
  scale: Vec3Tuple,
  value: pc.StandardMaterial,
  finishRole?: Level0ArchFinishRole
): pc.Entity {
  const entity = new pc.Entity(name);
  entity.addComponent('render', { type: 'box' });
  entity.setLocalPosition(position[0], position[1], position[2]);
  entity.setLocalScale(scale[0], scale[1], scale[2]);
  if (entity.render) entity.render.material = value;
  if (finishRole) bindLevel0ArchFinishRole(entity, finishRole);
  parent.addChild(entity);
  return entity;
}

/** Compatibility diagnostic view; M-C1 values now resolve only through presentation policy. */
export function carpetProfileForCell(regionId: RegionId): { key: 'ordinary' | 'pillar' | 'arch'; tint: readonly [number, number, number]; gloss?: number } {
  const descriptor = {
    world: { regionId, conditionIds: [] }
  } as unknown as CellDescriptor;
  const presentation = resolveLevel0CarpetPresentation(descriptor);
  return regionId === 'arch-rooms'
    ? { key: 'arch', tint: presentation.color, gloss: presentation.gloss }
    : regionId === 'pillar-field'
      ? { key: 'pillar', tint: presentation.color }
      : { key: 'ordinary', tint: presentation.color };
}

export function holeDepthBands(): readonly HoleDepthBand[] {
  const palette = resolveCvh1DepthPresentation();
  return [
    { key: 'upper', top: -0.02, bottom: -0.82, tint: palette.upper },
    { key: 'middle', top: -0.82, bottom: -2.0, tint: palette.middle },
    { key: 'deep', top: -2.0, bottom: -8.4, tint: palette.deep }
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
    for (const band of bands) addHoleBand(visual.root, hole, band, cvh1DepthMaterial(renderer, band.key));
    const deepBottom = bands[bands.length - 1]!.bottom;
    addBox(
      `${hole.id}:depth-occluder`,
      visual.root,
      [hole.position.x, deepBottom - 0.06, hole.position.z],
      [hole.scale.x * 2.6, 0.14, hole.scale.z * 2.6],
      cvh1DepthMaterial(renderer, 'void')
    );
  }
}

export function archFramePresentationProfile(): {
  upperBottom: number; upperTop: number; ceilingReveal: number; curveApex: number;
  curveJoinHandoff: number; cellSeamHandoff: number; pierDepth: number; upperDepth: number; shoulderSpanScale: number;
} {
  return {
    upperBottom: ARCH_UPPER_BOTTOM, upperTop: ARCH_UPPER_TOP, ceilingReveal: WALL_HEIGHT - ARCH_UPPER_TOP, curveApex: ARCH_CURVE_APEX,
    curveJoinHandoff: 0, cellSeamHandoff: ARCH_FRAME_CELL_SEAM_HANDOFF, pierDepth: ARCH_PIER_DEPTH, upperDepth: ARCH_UPPER_DEPTH,
    shoulderSpanScale: ARCH_SHOULDER_SPAN_SCALE
  };
}

function rectangularUpperRuns(bays: readonly ArchFrameBay[], supports: readonly Interval[]): Interval[] {
  const intervals: Interval[] = supports.map(([start, end]) => [start, end] as const);
  for (const bay of bays) intervals.push([bay.start, bay.curveStart], [bay.curveEnd, bay.end]);
  return mergeIntervals(intervals);
}

export interface ArchFrameVisibleVolume {
  id: string;
  role: 'pier-lower' | 'upper-mass' | 'pier-upper';
  lineKey: string;
  start: number;
  end: number;
  minY: number;
  maxY: number;
}

/** Pure presentation-geometry view used by regression tests and diagnostics. */
export function archFrameVisibleVolumesForDescriptors(descriptors: readonly CellDescriptor[]): ArchFrameVisibleVolume[] {
  const volumes: ArchFrameVisibleVolume[] = [];
  for (const line of archLinesForDescriptors(descriptors).values()) {
    const bays = frameBaysForLine(line);
    const supports = mergeIntervals(line.solids.map((wall) => [wall.start, wall.end] as const))
      .filter((support) => bays.some((bay) => Math.abs(support[1] - bay.start) < 0.08 || Math.abs(support[0] - bay.end) < 0.08));
    const upperRuns = rectangularUpperRuns(bays, supports);
    supports.forEach((support, index) => {
      volumes.push({ id: `${line.key}:pier-lower:${index}`, role: 'pier-lower', lineKey: line.key, start: support[0], end: support[1], minY: 0, maxY: ARCH_UPPER_BOTTOM });
      volumes.push({ id: `${line.key}:pier-upper:${index}`, role: 'pier-upper', lineKey: line.key, start: support[0], end: support[1], minY: ARCH_UPPER_TOP, maxY: WALL_HEIGHT });
    });
    upperRuns.forEach((run, index) => volumes.push({ id: `${line.key}:upper-mass:${index}`, role: 'upper-mass', lineKey: line.key, start: run[0], end: run[1], minY: ARCH_UPPER_BOTTOM, maxY: ARCH_UPPER_TOP }));
  }
  return volumes;
}

export function archFrameBaysForDescriptors(descriptors: readonly CellDescriptor[]): ArchFrameBay[] {
  return canonicalArchFrameBaysForDescriptors(descriptors);
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
  return orientation === 'z' ? [length, height, depth] : [depth, height, length];
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
  value: pc.StandardMaterial,
  finishRole: Level0ArchFinishRole
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
    value,
    finishRole
  );
}

function subtract(left: Vec3Tuple, right: Vec3Tuple): Vec3Tuple {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}
function cross(left: Vec3Tuple, right: Vec3Tuple): Vec3Tuple {
  return [left[1] * right[2] - left[2] * right[1], left[2] * right[0] - left[0] * right[2], left[0] * right[1] - left[1] * right[0]];
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
  bindLevel0ArchFinishRole(entity, 'upper');
  visual.root.addChild(entity);
}

function dividerSourceWallIds(lines: Map<string, WorldArchLine>): Set<string> {
  const ids = new Set<string>();
  for (const line of lines.values()) for (const wall of [...line.headers, ...line.lowers, ...line.solids]) ids.add(wall.id);
  return ids;
}

function clearArchFrameVisuals(visual: CellVisual): void {
  for (const child of childrenOf(visual.root)) {
    if (child.name.startsWith(ARCH_FRAME_PREFIX) || child.name.startsWith('arch-curve:') || child.name.startsWith('arch-header-bridge:')) child.destroy();
  }
}

function resetSemanticArchMeshes(visual: CellVisual): void {
  for (const wall of visual.descriptor.walls) {
    if (!archStructuralRole(wall)) continue;
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

function renderArchFrames(renderer: WorldRenderer, targetCellIds?: ReadonlySet<string>): void {
  const reconstructionStart = performance.now();
  const visuals = [...renderer.loaded.values()];
  const targetVisuals = targetCellIds ? visuals.filter((visual) => targetCellIds.has(visual.descriptor.id)) : visuals;
  const descriptors = visuals.map((visual) => visual.descriptor);
  const lines = archLinesForDescriptors(descriptors);
  const sourceIds = dividerSourceWallIds(lines);
  const pierMaterial = level0ArchFinishMaterial(renderer, 'pier');
  const upperMaterial = level0ArchFinishMaterial(renderer, 'upper');
  const panelMaterial = level0ArchFinishMaterial(renderer, 'lower-panel');

  for (const visual of targetVisuals) {
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
    const upperRuns = rectangularUpperRuns(bays, activeSupportIntervals);
    for (const visual of targetVisuals) {
      if (visual.descriptor.world.generationVersion !== 'gen3-v1') continue;
      for (let index = 0; index < activeSupportIntervals.length; index += 1) {
        const support = activeSupportIntervals[index]!;
        addWorldBoxClipped(
          visual, `pier-lower:${line.key}:${index}`, line.orientation, line.fixed, support[0], support[1],
          ARCH_UPPER_BOTTOM / 2, ARCH_UPPER_BOTTOM, ARCH_PIER_DEPTH, pierMaterial, 'pier'
        );
        const upperPierHeight = WALL_HEIGHT - ARCH_UPPER_TOP;
        addWorldBoxClipped(
          visual, `pier-upper:${line.key}:${index}`, line.orientation, line.fixed, support[0], support[1],
          ARCH_UPPER_TOP + upperPierHeight / 2, upperPierHeight, ARCH_PIER_DEPTH, pierMaterial, 'pier'
        );
      }
      const shoulderHeight = ARCH_UPPER_TOP - ARCH_UPPER_BOTTOM;
      for (let index = 0; index < upperRuns.length; index += 1) {
        const run = upperRuns[index]!;
        addWorldBoxClipped(
          visual, `upper-run:${line.key}:${index}`, line.orientation, line.fixed, run[0], run[1],
          ARCH_UPPER_BOTTOM + shoulderHeight / 2, shoulderHeight, ARCH_UPPER_DEPTH, upperMaterial, 'upper'
        );
      }
      for (const bay of bays) {
        addCurveMeshClipped(renderer, visual, bay, upperMaterial);
        if (!bay.route) {
          addWorldBoxClipped(
            visual, `lower-panel:${bay.id}`, bay.orientation, bay.fixed,
            bay.start + ARCH_LOWER_PANEL_END_INSET, bay.end - ARCH_LOWER_PANEL_END_INSET,
            ARCH_LOWER_PANEL_HEIGHT / 2, ARCH_LOWER_PANEL_HEIGHT, ARCH_LOWER_PANEL_DEPTH, panelMaterial, 'lower-panel'
          );
        }
      }
    }
  }
  const reconstructionMs = performance.now() - reconstructionStart;
  archPresentationDiagnostics.reconstructionCalls += 1;
  archPresentationDiagnostics.reconstructedCells += targetVisuals.length;
  archPresentationDiagnostics.reconstructionMs += reconstructionMs;
  archPresentationDiagnostics.maxReconstructionMs = Math.max(archPresentationDiagnostics.maxReconstructionMs, reconstructionMs);
}

/** Apply the existing synchronous Region presentation work for one newly resident Cell. */
export function applyLevel0RegionPresentation(renderer: WorldRenderer, visual: CellVisual): void {
  if (visual.descriptor.world.generationVersion !== 'gen3-v1') return;
  replaceHoleDepth(renderer, visual);
}

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

const pendingArchCells = new WeakMap<WorldRenderer, Set<string>>();
const scheduledArchFlush = new WeakSet<WorldRenderer>();

/** Preserve the accepted neighbor-aware visible Arch reconstruction boundary. */
export function scheduleNearbyArchPresentation(renderer: WorldRenderer, descriptor: CellDescriptor): void {
  const pending = pendingArchCells.get(renderer) ?? new Set<string>();
  for (const visual of renderer.loaded.values()) {
    if (Math.abs(visual.descriptor.address.cellX - descriptor.address.cellX) <= 1
      && Math.abs(visual.descriptor.address.cellZ - descriptor.address.cellZ) <= 1) pending.add(visual.descriptor.id);
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
