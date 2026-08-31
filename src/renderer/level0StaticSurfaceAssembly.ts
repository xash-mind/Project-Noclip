import * as pc from 'playcanvas';
import { materialNumber } from '../presentation/materialRuntime.js';
import { archStructuralRole } from '../world/gen3ArchDividerSemantics.js';
import type { RegionId, WallSpec } from '../world/types.js';
import { ordinaryWallpaperUv } from './ordinaryWallpaperRules.js';
import type { CellVisual } from './support.js';
import { wallPresentationBoxAtTJunction, type WallPresentationBox } from './wallJunctionGeometry.js';

const FUSION_EPSILON = 0.001;
const MIN_SURFACE_SPAN = 0.02;
const WALLPAPER_TARGET = 'material.level-0-wallpaper';

type NamedMaterial = pc.StandardMaterial & { name?: string };
type MutableWallpaperMaterial = pc.StandardMaterial & { diffuseMapOffset: pc.Vec2 };

export interface StaticSurfaceFusionCandidate {
  cellId: string;
  regionId: RegionId;
  pieceId: string;
  sourceWallId: string;
  orientation: WallSpec['orientation'];
  fixed: number;
  start: number;
  end: number;
  cy: number;
  height: number;
  depth: number;
  materialKey: string;
  fusable: boolean;
}

export interface StaticSurfaceFusionGroup {
  members: StaticSurfaceFusionCandidate[];
  start: number;
  end: number;
}

export interface StaticSurfaceAssemblyRegionDiagnostics {
  inputSurfaces: number;
  outputSurfaces: number;
  fusedGroups: number;
  removedSurfaces: number;
}

export interface StaticSurfaceAssemblyDiagnostics {
  cells: number;
  inputSurfaces: number;
  outputSurfaces: number;
  fusedGroups: number;
  removedSurfaces: number;
  buildMs: number;
  maxBuildMs: number;
  byRegion: Record<'ordinary-level-0' | 'pillar-field' | 'arch-rooms', StaticSurfaceAssemblyRegionDiagnostics>;
}

interface RuntimeCandidate extends StaticSurfaceFusionCandidate {
  entity: pc.Entity;
  material: pc.StandardMaterial;
  sourceWall: WallSpec;
  currentBox: WallPresentationBox;
}

interface SurfaceFusionQaBridge {
  diagnostics(): StaticSurfaceAssemblyDiagnostics;
}

declare global {
  interface Window {
    __projectNoclipSurfaceFusion?: SurfaceFusionQaBridge;
  }
}

function emptyRegionDiagnostics(): StaticSurfaceAssemblyRegionDiagnostics {
  return { inputSurfaces: 0, outputSurfaces: 0, fusedGroups: 0, removedSurfaces: 0 };
}

const diagnostics: StaticSurfaceAssemblyDiagnostics = {
  cells: 0,
  inputSurfaces: 0,
  outputSurfaces: 0,
  fusedGroups: 0,
  removedSurfaces: 0,
  buildMs: 0,
  maxBuildMs: 0,
  byRegion: {
    'ordinary-level-0': emptyRegionDiagnostics(),
    'pillar-field': emptyRegionDiagnostics(),
    'arch-rooms': emptyRegionDiagnostics()
  }
};

function cloneDiagnostics(): StaticSurfaceAssemblyDiagnostics {
  return {
    ...diagnostics,
    byRegion: {
      'ordinary-level-0': { ...diagnostics.byRegion['ordinary-level-0'] },
      'pillar-field': { ...diagnostics.byRegion['pillar-field'] },
      'arch-rooms': { ...diagnostics.byRegion['arch-rooms'] }
    }
  };
}

export function staticSurfaceAssemblyDiagnosticsSnapshot(): StaticSurfaceAssemblyDiagnostics {
  return cloneDiagnostics();
}

function ensureQaBridge(): void {
  if (typeof window === 'undefined' || window.__projectNoclipSurfaceFusion) return;
  window.__projectNoclipSurfaceFusion = { diagnostics: () => staticSurfaceAssemblyDiagnosticsSnapshot() };
}

function approximately(left: number, right: number): boolean {
  return Math.abs(left - right) <= FUSION_EPSILON;
}

function sameRun(left: StaticSurfaceFusionCandidate, right: StaticSurfaceFusionCandidate): boolean {
  return left.fusable
    && right.fusable
    && left.cellId === right.cellId
    && left.regionId === right.regionId
    && left.orientation === right.orientation
    && approximately(left.fixed, right.fixed)
    && approximately(left.cy, right.cy)
    && approximately(left.height, right.height)
    && approximately(left.depth, right.depth)
    && left.materialKey === right.materialKey;
}

function candidateOrder(left: StaticSurfaceFusionCandidate, right: StaticSurfaceFusionCandidate): number {
  return left.cellId.localeCompare(right.cellId)
    || left.regionId.localeCompare(right.regionId)
    || left.orientation.localeCompare(right.orientation)
    || left.fixed - right.fixed
    || left.cy - right.cy
    || left.height - right.height
    || left.depth - right.depth
    || left.materialKey.localeCompare(right.materialKey)
    || left.start - right.start
    || left.end - right.end
    || left.pieceId.localeCompare(right.pieceId);
}

/**
 * Pure grouping contract. Fusion is limited to exact, contiguous, compatible
 * presentation spans inside one streamed Cell. Gaps/openings, corners, material
 * changes, policy changes, interaction barriers and Cell boundaries split runs.
 */
export function planStaticSurfaceFusion(candidates: readonly StaticSurfaceFusionCandidate[]): StaticSurfaceFusionGroup[] {
  const ordered = [...candidates].sort(candidateOrder);
  const groups: StaticSurfaceFusionGroup[] = [];
  for (const candidate of ordered) {
    const current = groups.at(-1);
    const previous = current?.members.at(-1);
    if (current && previous && sameRun(previous, candidate) && approximately(current.end, candidate.start)) {
      current.members.push(candidate);
      current.end = candidate.end;
    } else {
      groups.push({ members: [candidate], start: candidate.start, end: candidate.end });
    }
  }
  return groups;
}

export function fusedWallSpecForGroup(group: StaticSurfaceFusionGroup, source: WallSpec): WallSpec {
  const length = group.end - group.start;
  return source.orientation === 'z'
    ? { ...source, cx: (group.start + group.end) / 2, cy: group.members[0]!.cy, sx: length, sy: group.members[0]!.height, sz: group.members[0]!.depth }
    : { ...source, cz: (group.start + group.end) / 2, cy: group.members[0]!.cy, sx: group.members[0]!.depth, sy: group.members[0]!.height, sz: length };
}

function childrenOf(entity: pc.Entity): pc.Entity[] {
  return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children];
}

function entityByName(root: pc.Entity, name: string): pc.Entity | undefined {
  return childrenOf(root).find((child) => child.name === name);
}

function materialName(material: pc.StandardMaterial): string {
  return (material as unknown as NamedMaterial).name ?? '';
}

function wallHasInteraction(visual: CellVisual, wallId: string): boolean {
  return visual.interactions.some((interaction) => (interaction as unknown as { wallId?: string }).wallId === wallId);
}

function currentEntityBox(entity: pc.Entity): WallPresentationBox {
  const position = entity.getLocalPosition();
  const scale = entity.getLocalScale();
  return { cx: position.x, cy: position.y, cz: position.z, sx: scale.x, sy: scale.y, sz: scale.z };
}

function intervalForBox(orientation: WallSpec['orientation'], box: WallPresentationBox): readonly [number, number] {
  return orientation === 'z'
    ? [box.cx - box.sx / 2, box.cx + box.sx / 2]
    : [box.cz - box.sz / 2, box.cz + box.sz / 2];
}

function boxForInterval(
  orientation: WallSpec['orientation'],
  start: number,
  end: number,
  reference: WallPresentationBox
): WallPresentationBox {
  return orientation === 'z'
    ? { ...reference, cx: (start + end) / 2, sx: end - start }
    : { ...reference, cz: (start + end) / 2, sz: end - start };
}

function pieceCandidatesForWall(visual: CellVisual, wall: WallSpec): RuntimeCandidate[] {
  if (!wall.drawable || archStructuralRole(wall)) return [];
  const primary = entityByName(visual.root, wall.id);
  if (!primary?.render || primary.render.enabled === false) return [];
  const entities = [primary];
  const split = entityByName(visual.root, `${wall.id}:split-c`);
  if (split?.render && split.render.enabled !== false) entities.push(split);

  const junctionBox = wallPresentationBoxAtTJunction(wall, visual.descriptor.walls);
  const [junctionStart, junctionEnd] = intervalForBox(wall.orientation, junctionBox);
  const interactionBearing = wallHasInteraction(visual, wall.id);
  const candidates: RuntimeCandidate[] = [];

  for (const entity of entities) {
    const material = entity.render?.material as pc.StandardMaterial | undefined;
    if (!material) continue;
    const currentBox = currentEntityBox(entity);
    const [pieceStart, pieceEnd] = intervalForBox(wall.orientation, currentBox);
    const start = Math.max(pieceStart, junctionStart);
    const end = Math.min(pieceEnd, junctionEnd);
    if (end - start < MIN_SURFACE_SPAN) {
      entity.destroy();
      continue;
    }
    const clipped = boxForInterval(wall.orientation, start, end, {
      ...junctionBox,
      cy: currentBox.cy,
      sy: currentBox.sy,
      sx: wall.orientation === 'z' ? junctionBox.sx : currentBox.sx,
      sz: wall.orientation === 'x' ? junctionBox.sz : currentBox.sz
    });
    const name = materialName(material);
    const materialKey = [
      name,
      wall.materialId ?? 'implicit',
      String(wall.materialVariant ?? 0),
      visual.descriptor.world.regionId
    ].join('|');
    candidates.push({
      cellId: visual.descriptor.id,
      regionId: visual.descriptor.world.regionId,
      pieceId: entity.name,
      sourceWallId: wall.id,
      orientation: wall.orientation,
      fixed: wall.orientation === 'z' ? clipped.cz : clipped.cx,
      start,
      end,
      cy: clipped.cy,
      height: clipped.sy,
      depth: wall.orientation === 'z' ? clipped.sz : clipped.sx,
      materialKey,
      fusable: !interactionBearing && name.startsWith('ordinary-wallpaper:'),
      entity,
      material,
      sourceWall: wall,
      currentBox
    });
  }
  return candidates;
}

function targetBoxForGroup(group: StaticSurfaceFusionGroup): WallPresentationBox {
  const first = group.members[0]!;
  const length = group.end - group.start;
  return first.orientation === 'z'
    ? { cx: (group.start + group.end) / 2, cy: first.cy, cz: first.fixed, sx: length, sy: first.height, sz: first.depth }
    : { cx: first.fixed, cy: first.cy, cz: (group.start + group.end) / 2, sx: first.depth, sy: first.height, sz: length };
}

function boxDiffers(left: WallPresentationBox, right: WallPresentationBox): boolean {
  return !approximately(left.cx, right.cx)
    || !approximately(left.cy, right.cy)
    || !approximately(left.cz, right.cz)
    || !approximately(left.sx, right.sx)
    || !approximately(left.sy, right.sy)
    || !approximately(left.sz, right.sz);
}

function wallpaperMaterialForSurface(
  source: pc.StandardMaterial,
  descriptor: CellVisual['descriptor'],
  wall: WallSpec
): pc.StandardMaterial {
  const cloned = source.clone() as pc.StandardMaterial;
  (cloned as unknown as NamedMaterial).name = materialName(source);
  if (cloned.diffuseMap) {
    const repeat = materialNumber(WALLPAPER_TARGET, 'patternSizeMeters', 1.3);
    const phase: [number, number] = [
      materialNumber(WALLPAPER_TARGET, 'uvOffsetU', 0),
      materialNumber(WALLPAPER_TARGET, 'uvOffsetV', 0)
    ];
    const uv = ordinaryWallpaperUv(descriptor.address.cellX, descriptor.address.cellZ, wall, repeat, phase);
    cloned.diffuseMapTiling = new pc.Vec2(uv.tiling[0], uv.tiling[1]);
    (cloned as unknown as MutableWallpaperMaterial).diffuseMapOffset = new pc.Vec2(uv.offset[0], uv.offset[1]);
  }
  cloned.update();
  return cloned;
}

function applyGroup(visual: CellVisual, group: StaticSurfaceFusionGroup, fusionIndex: number, runtime: Map<string, RuntimeCandidate>): void {
  const representative = runtime.get(group.members[0]!.pieceId);
  if (!representative) return;
  const target = targetBoxForGroup(group);
  const sourceSpec = fusedWallSpecForGroup(group, representative.sourceWall);
  const changed = group.members.length > 1 || boxDiffers(representative.currentBox, target);

  representative.entity.setLocalPosition(target.cx, target.cy, target.cz);
  representative.entity.setLocalScale(target.sx, target.sy, target.sz);
  if (changed && materialName(representative.material).startsWith('ordinary-wallpaper:') && representative.entity.render) {
    representative.entity.render.material = wallpaperMaterialForSurface(representative.material, visual.descriptor, sourceSpec);
  }
  if (group.members.length > 1) {
    representative.entity.name = `surface:wall:${visual.descriptor.id}:${fusionIndex}`;
    for (const member of group.members.slice(1)) runtime.get(member.pieceId)?.entity.destroy();
  }
}

/**
 * Canonical Gen3 render-topology assembly for compatible static wall surfaces.
 * It does not read or mutate collider ownership, runtime collision indexes,
 * world descriptors, save identity, or any geometry outside the current Cell.
 */
export function assembleLevel0StaticSurfaces(visual: CellVisual): void {
  if (visual.descriptor.world.generationVersion !== 'gen3-v1') return;
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const runtimeCandidates = visual.descriptor.walls.flatMap((wall) => pieceCandidatesForWall(visual, wall));
  const publicCandidates: StaticSurfaceFusionCandidate[] = runtimeCandidates.map((candidate) => ({
    cellId: candidate.cellId,
    regionId: candidate.regionId,
    pieceId: candidate.pieceId,
    sourceWallId: candidate.sourceWallId,
    orientation: candidate.orientation,
    fixed: candidate.fixed,
    start: candidate.start,
    end: candidate.end,
    cy: candidate.cy,
    height: candidate.height,
    depth: candidate.depth,
    materialKey: candidate.materialKey,
    fusable: candidate.fusable
  }));
  const groups = planStaticSurfaceFusion(publicCandidates);
  const runtime = new Map(runtimeCandidates.map((candidate) => [candidate.pieceId, candidate] as const));
  groups.forEach((group, index) => applyGroup(visual, group, index, runtime));

  const fusedGroups = groups.filter((group) => group.members.length > 1).length;
  const removed = publicCandidates.length - groups.length;
  const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started;
  const region = diagnostics.byRegion[visual.descriptor.world.regionId];
  diagnostics.cells += 1;
  diagnostics.inputSurfaces += publicCandidates.length;
  diagnostics.outputSurfaces += groups.length;
  diagnostics.fusedGroups += fusedGroups;
  diagnostics.removedSurfaces += removed;
  diagnostics.buildMs += elapsed;
  diagnostics.maxBuildMs = Math.max(diagnostics.maxBuildMs, elapsed);
  region.inputSurfaces += publicCandidates.length;
  region.outputSurfaces += groups.length;
  region.fusedGroups += fusedGroups;
  region.removedSurfaces += removed;
  ensureQaBridge();
}
