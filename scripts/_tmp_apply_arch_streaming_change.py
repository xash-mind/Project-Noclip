from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    assert count == 1, f"{path}: expected one replacement, found {count}: {old[:80]!r}"
    write(path, text.replace(old, new, 1))


# ---------------------------------------------------------------------------
# Canonical A-A1 proportions.
# ---------------------------------------------------------------------------
replace_once(
    'src/world/gen3ArchitectureCore.ts',
    "export const ARCH_HEADER_HEIGHT = 0.44;\n",
    """export const ARCH_HEADER_HEIGHT = 0.44;
export const ARCH_LEGACY_BAY_MIN = 4.55;
export const ARCH_LEGACY_BAY_RANGE = 0.70;
export const ARCH_CURVE_MIN_WIDTH = 0.72;
export const ARCH_CURVE_MAX_WIDTH = 1.42;
export const ARCH_SHOULDER_SPAN_SCALE = 0.5;

export interface ArchBayProfile {
  legacyPitch: number;
  legacyOpening: number;
  curveWidth: number;
  legacyShoulderSpan: number;
  shoulderSpan: number;
  opening: number;
  pitch: number;
}

export function legacyArchCurveWidth(opening: number): number {
  return Math.min(ARCH_CURVE_MAX_WIDTH, Math.max(ARCH_CURVE_MIN_WIDTH, opening * 0.34), opening * 0.44);
}

/**
 * A-A1 keeps the accepted central curve but halves both rectangular shoulders.
 * Pier centres therefore move inward without changing the curve seed domain.
 */
export function archBayProfile(ownerId: string): ArchBayProfile {
  const legacyPitch = ARCH_LEGACY_BAY_MIN + unitFloat(`${ownerId}:bay`) * ARCH_LEGACY_BAY_RANGE;
  const legacyOpening = legacyPitch - ARCH_PIER_WIDTH;
  const curveWidth = legacyArchCurveWidth(legacyOpening);
  const legacyShoulderSpan = Math.max(0, (legacyOpening - curveWidth) / 2);
  const shoulderSpan = legacyShoulderSpan * ARCH_SHOULDER_SPAN_SCALE;
  const opening = curveWidth + shoulderSpan * 2;
  return {
    legacyPitch,
    legacyOpening,
    curveWidth,
    legacyShoulderSpan,
    shoulderSpan,
    opening,
    pitch: opening + ARCH_PIER_WIDTH
  };
}

/** Recover the preserved pre-tightening curve width from a reconstructed opening. */
export function preservedArchCurveWidth(opening: number): number {
  let legacyOpening = Math.max(opening, opening * 2 - ARCH_CURVE_MAX_WIDTH);
  for (let pass = 0; pass < 6; pass += 1) {
    const curve = legacyArchCurveWidth(legacyOpening);
    legacyOpening = opening * 2 - curve;
  }
  return legacyArchCurveWidth(legacyOpening);
}
"""
)

replace_once(
    'src/world/gen3SpaceTopologyBuild.ts',
    "  type MaterialId,\n  type PropSpec,\n  type WallSpec,\n",
    "  type MaterialId,\n  type PropSpec,\n  type RegionId,\n  type WallSpec,\n"
)
replace_once(
    'src/world/gen3SpaceTopologyBuild.ts',
    "  ARCH_PIER_WIDTH,\n  PILLAR_MAX_WIDTH,\n",
    "  ARCH_PIER_WIDTH,\n  archBayProfile,\n  PILLAR_MAX_WIDTH,\n"
)
replace_once(
    'src/world/gen3SpaceTopologyBuild.ts',
    "function alignArchPortal(wall: TopologyWall, portal: TopologyPortal): TopologyPortal {\n  const bay = 4.55 + unitFloat(`${wall.id}:bay`) * 0.70;\n",
    "function alignArchPortal(wall: TopologyWall, portal: TopologyPortal): TopologyPortal {\n  const bay = archBayProfile(wall.id).pitch;\n"
)
replace_once(
    'src/world/gen3SpaceTopologyBuild.ts',
    "  // Semantic/collision structure stays deliberately small. Curved intrados are\n  // render-only geometry in dev6FollowupPresentation.ts, so they cannot inflate\n",
    "  // Semantic/collision structure stays deliberately small. Curved intrados are\n  // render-only geometry in level0RegionPresentation.ts, so they cannot inflate\n"
)
replace_once(
    'src/world/gen3SpaceTopologyBuild.ts',
    "  const bay = 4.55 + unitFloat(`${wall.id}:bay`) * 0.70;\n",
    "  const bay = archBayProfile(wall.id).pitch;\n"
)

arch_prop_helpers = r'''

export const ARCH_ENVIRONMENT_PROP_PROFILE = Object.freeze({
  bucketChance: 0.12,
  paintCanChance: 0.09,
  placementAttempts: 6,
  routeClearance: 0.24
});

function sceneryBounds(worldX: number, worldZ: number, sx: number, sz: number, margin = 0): { minX: number; maxX: number; minZ: number; maxZ: number } {
  return {
    minX: worldX - sx / 2 - margin,
    maxX: worldX + sx / 2 + margin,
    minZ: worldZ - sz / 2 - margin,
    maxZ: worldZ + sz / 2 + margin
  };
}

function archSceneryPositionClear(
  worldX: number,
  worldZ: number,
  sx: number,
  sz: number,
  topologyWalls: readonly TopologyWall[],
  reservations: readonly RouteReservationEnvelope[],
  existing: readonly PropSpec[],
  cellX: number,
  cellZ: number
): boolean {
  const candidate = sceneryBounds(worldX, worldZ, sx, sz, ARCH_ENVIRONMENT_PROP_PROFILE.routeClearance);
  if (reservations.some((reservation) => boundsOverlap(candidate, reservation))) return false;
  if (topologyWalls.some((wall) => boundsOverlap(candidate, expandedTopologyWallBounds(wall)))) return false;
  const centerX = cellX * CELL_SIZE;
  const centerZ = cellZ * CELL_SIZE;
  for (const prop of existing) {
    const other = sceneryBounds(centerX + prop.position.x, centerZ + prop.position.z, prop.scale.x, prop.scale.z, 0.18);
    if (boundsOverlap(candidate, other)) return false;
  }
  return true;
}

function addOneArchSceneryProp(
  ctx: DomainContext,
  cellX: number,
  cellZ: number,
  kind: 'bucket' | 'paint-can',
  chance: number,
  topologyWalls: readonly TopologyWall[],
  reservations: readonly RouteReservationEnvelope[],
  output: PropSpec[]
): void {
  const key = `${ctx.seed}:gen3-arch-prop:${cellX}:${cellZ}:${kind}`;
  if (unitFloat(`${key}:spawn`) >= chance) return;
  const [sx, sy, sz] = kind === 'bucket' ? [0.62, 0.58, 0.62] : [0.34, 0.38, 0.34];
  const centerX = cellX * CELL_SIZE;
  const centerZ = cellZ * CELL_SIZE;
  const half = CELL_SIZE / 2 - 0.8;
  for (let attempt = 0; attempt < ARCH_ENVIRONMENT_PROP_PROFILE.placementAttempts; attempt += 1) {
    const worldX = centerX - half + unitFloat(`${key}:x:${attempt}`) * half * 2;
    const worldZ = centerZ - half + unitFloat(`${key}:z:${attempt}`) * half * 2;
    if (cellX === 0 && cellZ === 0 && Math.hypot(worldX, worldZ) < 1.8) continue;
    if (!archSceneryPositionClear(worldX, worldZ, sx, sz, topologyWalls, reservations, output, cellX, cellZ)) continue;
    output.push({
      id: stableId('gen3-arch-prop', ctx.seed, cellX, cellZ, kind),
      kind,
      position: { x: worldX - centerX, y: sy / 2, z: worldZ - centerZ },
      scale: { x: sx, y: sy, z: sz },
      rotationY: Math.floor(unitFloat(`${key}:rotation`) * 360),
      materialVariant: Math.floor(unitFloat(`${key}:material`) * 3),
      solid: false
    });
    return;
  }
}

function addArchRoomEnvironmentalProps(
  ctx: DomainContext,
  cellX: number,
  cellZ: number,
  regionId: RegionId | undefined,
  topologyWalls: readonly TopologyWall[],
  reservations: readonly RouteReservationEnvelope[],
  output: PropSpec[]
): void {
  if (regionId !== 'arch-rooms') return;
  addOneArchSceneryProp(ctx, cellX, cellZ, 'bucket', ARCH_ENVIRONMENT_PROP_PROFILE.bucketChance, topologyWalls, reservations, output);
  addOneArchSceneryProp(ctx, cellX, cellZ, 'paint-can', ARCH_ENVIRONMENT_PROP_PROFILE.paintCanChance, topologyWalls, reservations, output);
}
'''
replace_once(
    'src/world/gen3SpaceTopologyBuild.ts',
    "function relevantDomains(seed: string, cellX: number, cellZ: number): Array<{ x: number; z: number }> {\n",
    arch_prop_helpers + "\nfunction relevantDomains(seed: string, cellX: number, cellZ: number): Array<{ x: number; z: number }> {\n"
)
replace_once(
    'src/world/gen3SpaceTopologyBuild.ts',
    "  exposure: number;\n  tuning: WorldTuning;\n}): Gen3ArchitectureResult {\n",
    "  exposure: number;\n  tuning: WorldTuning;\n  regionId?: RegionId;\n}): Gen3ArchitectureResult {\n"
)
replace_once(
    'src/world/gen3SpaceTopologyBuild.ts',
    "  const pillar = addPillars(ctx, options.cellX, options.cellZ, topologyWalls, reservations, props);\n",
    "  const pillar = addPillars(ctx, options.cellX, options.cellZ, topologyWalls, reservations, props);\n  addArchRoomEnvironmentalProps(ctx, options.cellX, options.cellZ, options.regionId, topologyWalls, reservations, props);\n"
)
replace_once(
    'src/world/gen3.ts',
    "  const architecture = generateCoherentGen3Architecture({ seed, cellX, cellZ, worldDay, exposure, tuning });\n",
    "  const architecture = generateCoherentGen3Architecture({ seed, cellX, cellZ, worldDay, exposure, tuning, regionId: environment.regionId });\n"
)

# ---------------------------------------------------------------------------
# Prop kinds + canonical renderer / World Lab showcase.
# ---------------------------------------------------------------------------
replace_once(
    'src/world/types.ts',
    "  'carpet-patch',\n  'sign'\n",
    "  'carpet-patch',\n  'sign',\n  'bucket',\n  'paint-can'\n"
)
replace_once(
    'src/renderer/cellBuilder.ts',
    "  'carpet-patch': [1.2, 0.02, 1.0],\n  sign: [1.4, 0.65, 0.08]\n",
    "  'carpet-patch': [1.2, 0.02, 1.0],\n  sign: [1.4, 0.65, 0.08],\n  bucket: [0.62, 0.58, 0.62],\n  'paint-can': [0.34, 0.38, 0.34]\n"
)
replace_once(
    'src/renderer/cellBuilder.ts',
    "      'carpet-patch': this.getMaterial('prop:carpet', profile.floorTint, 'carpet', prop.materialVariant ?? 0),\n      sign: this.getMaterial('prop:sign', [0.15, 0.18, 0.13], undefined, 0, [1, 1], [0.08, 0.17, 0.07], 0.55)\n",
    "      'carpet-patch': this.getMaterial('prop:carpet', profile.floorTint, 'carpet', prop.materialVariant ?? 0),\n      sign: this.getMaterial('prop:sign', [0.15, 0.18, 0.13], undefined, 0, [1, 1], [0.08, 0.17, 0.07], 0.55),\n      bucket: this.getMaterial('prop:bucket', [0.37, 0.35, 0.29], 'concrete', prop.materialVariant ?? 0),\n      'paint-can': this.getMaterial('prop:paint-can', [0.46, 0.47, 0.45], 'concrete', prop.materialVariant ?? 0)\n"
)
open_vessel_branch = r'''    } else if (prop.kind === 'bucket' || prop.kind === 'paint-can') {
      const isPaintCan = prop.kind === 'paint-can';
      const sides = 8;
      const radiusX = sx * 0.46;
      const radiusZ = sz * 0.46;
      const sideWidth = Math.min(sx, sz) * (isPaintCan ? 0.34 : 0.32);
      const wallDepth = Math.max(0.025, Math.min(sx, sz) * 0.055);
      const rimHeight = Math.max(0.025, sy * 0.055);
      const rimMaterial = this.getMaterial(isPaintCan ? 'prop:paint-can-rim' : 'prop:bucket-rim', isPaintCan ? [0.58, 0.59, 0.56] : [0.43, 0.41, 0.34], 'concrete', 1);
      const cavity = this.getMaterial('prop:open-container-cavity', [0.025, 0.026, 0.023]);
      for (let index = 0; index < sides; index += 1) {
        const angle = index * 360 / sides;
        const radians = angle * Math.PI / 180;
        const x = Math.sin(radians) * radiusX;
        const z = Math.cos(radians) * radiusZ;
        this.box(`${prop.id}:side:${index}`, container, [x, -rimHeight / 2, z], [sideWidth, sy - rimHeight, wallDepth], material, angle);
        this.box(`${prop.id}:rim:${index}`, container, [x, sy / 2 - rimHeight / 2, z], [sideWidth * 1.08, rimHeight, wallDepth * 1.5], rimMaterial, angle);
      }
      this.box(`${prop.id}:interior`, container, [0, sy / 2 - rimHeight * 2.4, 0], [sx * 0.72, rimHeight * 0.55, sz * 0.72], cavity);
      if (isPaintCan) {
        const residue = this.getMaterial('prop:paint-can-label-residue', [0.57, 0.56, 0.49], 'paper', 0);
        this.box(`${prop.id}:label-residue`, container, [0.025, -sy * 0.03, -sz * 0.475], [sx * 0.48, sy * 0.34, 0.012], residue, -3);
        this.box(`${prop.id}:label-tear`, container, [-sx * 0.17, -sy * 0.18, -sz * 0.482], [sx * 0.12, sy * 0.08, 0.014], material, 7);
      } else {
        const handle = this.getMaterial('prop:bucket-handle', [0.24, 0.24, 0.21], 'concrete', 0);
        this.box(`${prop.id}:handle-top`, container, [0, sy * 0.34, 0], [sx * 0.72, 0.025, 0.025], handle);
        this.box(`${prop.id}:handle-left`, container, [-sx * 0.36, sy * 0.18, 0], [0.025, sy * 0.34, 0.025], handle);
        this.box(`${prop.id}:handle-right`, container, [sx * 0.36, sy * 0.18, 0], [0.025, sy * 0.34, 0.025], handle);
      }
'''
replace_once(
    'src/renderer/cellBuilder.ts',
    "    } else if (prop.kind === 'box') {\n      this.box(`${prop.id}:body`, container, [0, 0, 0], [sx, sy, sz], material);\n      const tape = this.getMaterial('prop:box-tape', [0.56, 0.49, 0.31]);\n      this.box(`${prop.id}:tape`, container, [0, sy / 2 + 0.008, 0], [sx * 0.16, 0.016, sz], tape);\n    } else {\n",
    "    } else if (prop.kind === 'box') {\n      this.box(`${prop.id}:body`, container, [0, 0, 0], [sx, sy, sz], material);\n      const tape = this.getMaterial('prop:box-tape', [0.56, 0.49, 0.31]);\n      this.box(`${prop.id}:tape`, container, [0, sy / 2 + 0.008, 0], [sx * 0.16, 0.016, sz], tape);\n" + open_vessel_branch + "    } else {\n"
)
replace_once(
    'src/renderer/objectCatalog.ts',
    "  { label: 'Cabinet Feature', categoryId: 'features', propKind: 'cabinet', searchTerms: ['locker', 'cupboard', 'sparse furniture'] }\n",
    "  { label: 'Cabinet Feature', categoryId: 'features', propKind: 'cabinet', searchTerms: ['locker', 'cupboard', 'sparse furniture'] },\n  { label: 'Medium Bucket', categoryId: 'features', propKind: 'bucket', searchTerms: ['utility bucket', 'open top', 'Arch Room dressing'] },\n  { label: 'Small Grey Open Paint Can', categoryId: 'features', propKind: 'paint-can', searchTerms: ['lidless', 'open paint can', 'peeled label', 'Arch Room dressing'] }\n"
)
replace_once(
    'src/renderer/objectCatalog.ts',
    "  for (const propKind of ['table', 'chair', 'cabinet'] as const) if (!OBJECT_CATALOG.some((entry) => entry.propKind === propKind)) errors.push(`Missing implemented Feature ${propKind}`);\n",
    "  for (const propKind of ['table', 'chair', 'cabinet', 'bucket', 'paint-can'] as const) if (!OBJECT_CATALOG.some((entry) => entry.propKind === propKind)) errors.push(`Missing implemented Feature ${propKind}`);\n"
)

# ---------------------------------------------------------------------------
# Visible A-A1 reconstruction: translated upper assembly, hidden overlaps, shared-pier bridge,
# and localized rebuilds rather than loaded-world rebuilds.
# ---------------------------------------------------------------------------
replace_once(
    'src/renderer/level0RegionPresentation.ts',
    "import { ARCH_HEADER_HEIGHT, ARCH_LOWER_HEIGHT } from '../world/gen3ArchitectureCore.js';\n",
    "import { ARCH_HEADER_HEIGHT, ARCH_LOWER_HEIGHT, ARCH_SHOULDER_SPAN_SCALE, preservedArchCurveWidth } from '../world/gen3ArchitectureCore.js';\n"
)
replace_once(
    'src/renderer/level0RegionPresentation.ts',
    "const ARCH_CURVE_MAX_WIDTH = 1.42;\nconst ARCH_CURVE_MIN_WIDTH = 0.72;\nconst ARCH_UPPER_BOTTOM = 2.02;\nconst ARCH_UPPER_TOP = WALL_HEIGHT - 0.14;\nconst ARCH_CURVE_APEX = Math.min(ARCH_UPPER_TOP - 0.24, 2.56);\nconst ARCH_JOIN_OVERLAP = 0.035;\n",
    "const ARCH_UPPER_BOTTOM = 1.92;\nconst ARCH_UPPER_TOP = WALL_HEIGHT - 0.24;\nconst ARCH_CURVE_APEX = Math.min(ARCH_UPPER_TOP - 0.24, 2.46);\nconst ARCH_JOIN_OVERLAP = 0.045;\nconst ARCH_CELL_SEAM_OVERLAP = 0.012;\n"
)
replace_once(
    'src/renderer/level0RegionPresentation.ts',
    "function curveWidthForBay(width: number): number {\n  return Math.min(ARCH_CURVE_MAX_WIDTH, Math.max(ARCH_CURVE_MIN_WIDTH, width * 0.34), width * 0.44);\n}\n",
    "function curveWidthForBay(width: number): number {\n  return preservedArchCurveWidth(width);\n}\n\nexport function archFramePresentationProfile(): {\n  upperBottom: number; upperTop: number; ceilingReveal: number; curveApex: number;\n  joinOverlap: number; cellSeamOverlap: number; pierDepth: number; upperDepth: number; shoulderSpanScale: number;\n} {\n  return {\n    upperBottom: ARCH_UPPER_BOTTOM, upperTop: ARCH_UPPER_TOP, ceilingReveal: WALL_HEIGHT - ARCH_UPPER_TOP, curveApex: ARCH_CURVE_APEX,\n    joinOverlap: ARCH_JOIN_OVERLAP, cellSeamOverlap: ARCH_CELL_SEAM_OVERLAP, pierDepth: ARCH_PIER_DEPTH, upperDepth: ARCH_UPPER_DEPTH,\n    shoulderSpanScale: ARCH_SHOULDER_SPAN_SCALE\n  };\n}\n"
)
replace_once(
    'src/renderer/level0RegionPresentation.ts',
    "  const clippedStart = Math.max(start, cellStart);\n  const clippedEnd = Math.min(end, cellEnd);\n",
    "  const clippedStart = Math.max(start, cellStart - ARCH_CELL_SEAM_OVERLAP);\n  const clippedEnd = Math.min(end, cellEnd + ARCH_CELL_SEAM_OVERLAP);\n"
)
replace_once(
    'src/renderer/level0RegionPresentation.ts',
    "function renderArchFrames(renderer: WorldRenderer): void {\n  const visuals = [...renderer.loaded.values()];\n",
    "function renderArchFrames(renderer: WorldRenderer, targetCellIds?: ReadonlySet<string>): void {\n  const visuals = [...renderer.loaded.values()];\n  const targetVisuals = targetCellIds ? visuals.filter((visual) => targetCellIds.has(visual.descriptor.id)) : visuals;\n"
)
replace_once(
    'src/renderer/level0RegionPresentation.ts',
    "  for (const visual of visuals) {\n    clearArchFrameVisuals(visual);\n",
    "  for (const visual of targetVisuals) {\n    clearArchFrameVisuals(visual);\n"
)
replace_once(
    'src/renderer/level0RegionPresentation.ts',
    "    for (const visual of visuals) {\n      if (visual.descriptor.world.generationVersion !== 'gen3-v1') continue;\n",
    "    for (const visual of targetVisuals) {\n      if (visual.descriptor.world.generationVersion !== 'gen3-v1') continue;\n"
)
replace_once(
    'src/renderer/level0RegionPresentation.ts',
    "      for (const bay of bays) {\n        const shoulderHeight = ARCH_UPPER_TOP - ARCH_UPPER_BOTTOM;\n",
    "      const shoulderHeight = ARCH_UPPER_TOP - ARCH_UPPER_BOTTOM;\n      for (let supportIndex = 0; supportIndex < activeSupportIntervals.length; supportIndex += 1) {\n        const support = activeSupportIntervals[supportIndex]!;\n        const connectsLeft = bays.some((bay) => Math.abs(bay.end - support[0]) < 0.08);\n        const connectsRight = bays.some((bay) => Math.abs(bay.start - support[1]) < 0.08);\n        if (!connectsLeft || !connectsRight) continue;\n        addWorldBoxClipped(\n          visual,\n          `upper-through-pier:${line.key}:${supportIndex}`,\n          line.orientation,\n          line.fixed,\n          support[0] - ARCH_JOIN_OVERLAP,\n          support[1] + ARCH_JOIN_OVERLAP,\n          ARCH_UPPER_BOTTOM + shoulderHeight / 2,\n          shoulderHeight,\n          ARCH_UPPER_DEPTH,\n          upperMaterial\n        );\n      }\n      for (const bay of bays) {\n"
)
old_install = r'''export function installLevel0RegionPresentation(): void {
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
'''
new_install = r'''const pendingArchCells = new WeakMap<WorldRenderer, Set<string>>();
const scheduledArchFlush = new WeakSet<WorldRenderer>();

function markNearbyArchCells(renderer: WorldRenderer, descriptor: CellDescriptor): void {
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

export function installLevel0RegionPresentation(): void {
  if (installed) return;
  installed = true;
  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function patchedRegionPresentationLoad(this: WorldRenderer, descriptor: CellDescriptor): void {
    const alreadyLoaded = this.loaded.has(descriptor.id);
    originalLoadCell.call(this, descriptor);
    const visual = this.loaded.get(descriptor.id);
    if (visual && !alreadyLoaded) applyRegionPresentation(this, visual);
    markNearbyArchCells(this, descriptor);
  };

  const originalUnloadCell = WorldRenderer.prototype.unloadCell;
  WorldRenderer.prototype.unloadCell = function patchedRegionPresentationUnload(this: WorldRenderer, cellId: string): void {
    const descriptor = this.loaded.get(cellId)?.descriptor;
    originalUnloadCell.call(this, cellId);
    if (descriptor) markNearbyArchCells(this, descriptor);
  };
}
'''
replace_once('src/renderer/level0RegionPresentation.ts', old_install, new_install)

# ---------------------------------------------------------------------------
# Frame-budgeted/predictive streaming scheduler.
# ---------------------------------------------------------------------------
streaming_scheduler = r'''import type * as pc from 'playcanvas';
import type { ProjectNoclipGame } from '../app/ProjectNoclipGame.js';
import type { SaveData } from '../persistence/types.js';
import { canShift, shouldShift } from '../simulation/shifting.js';
import { calculateExposureDay, calculateWorldDay } from '../simulation/timeline.js';
import { generateCell } from '../world/generator.js';
import type { CellDescriptor, WorldTuning } from '../world/types.js';
import type { WorldRenderer } from './WorldRenderer.js';
import { getRenderSettings, renderDistanceProfile, setRendererRenderScope } from './renderSettings.js';

export const STREAMING_SCHEDULER_PROFILE = Object.freeze({
  workBudgetMs: 2.25,
  maxHeavyJobsPerFrame: 1,
  unloadGraceMs: 1200,
  predictiveExtraRings: 1
});

export type StreamingRetentionDisposition = 'active' | 'retained' | 'unload';
export function streamingRetentionDisposition(distance: number, loadRadius: number, retentionRadius: number): StreamingRetentionDisposition {
  if (distance <= loadRadius) return 'active';
  if (distance <= retentionRadius) return 'retained';
  return 'unload';
}

export interface WarmCoordinate { x: number; z: number; priority: number; }
export function predictiveWarmCoordinates(
  centerX: number,
  centerZ: number,
  loadRadius: number,
  directionX: number,
  directionZ: number
): WarmCoordinate[] {
  if (Math.hypot(directionX, directionZ) < 0.08) return [];
  const retentionRadius = loadRadius + STREAMING_SCHEDULER_PROFILE.predictiveExtraRings;
  const length = Math.hypot(directionX, directionZ) || 1;
  const nx = directionX / length;
  const nz = directionZ / length;
  const result = new Map<string, WarmCoordinate>();
  const add = (x: number, z: number, priority: number): void => {
    const id = `${x}:${z}`;
    const existing = result.get(id);
    if (!existing || priority < existing.priority) result.set(id, { x, z, priority });
  };
  if (Math.abs(nx) >= 0.2) {
    const x = centerX + Math.sign(nx) * retentionRadius;
    for (let offset = -loadRadius; offset <= loadRadius; offset += 1) add(x, centerZ + offset, 10 + Math.abs(offset));
  }
  if (Math.abs(nz) >= 0.2) {
    const z = centerZ + Math.sign(nz) * retentionRadius;
    for (let offset = -loadRadius; offset <= loadRadius; offset += 1) add(centerX + offset, z, 10 + Math.abs(offset));
  }
  if (Math.abs(nx) >= 0.2 && Math.abs(nz) >= 0.2) {
    add(centerX + Math.sign(nx) * retentionRadius, centerZ + Math.sign(nz) * retentionRadius, 9);
  }
  return [...result.values()].sort((left, right) => left.priority - right.priority || left.x - right.x || left.z - right.z);
}

interface RenderControl { autoRender: boolean; renderNextFrame: boolean; }
interface CameraAccess { getPosition(): { x: number; z: number }; }
interface GameStreamingAccess {
  app?: pc.Application;
  camera?: CameraAccess;
  renderer?: WorldRenderer;
  save?: SaveData;
  tuning: WorldTuning;
  currentCellX: number;
  currentCellZ: number;
  currentCell?: CellDescriptor;
  streamWarmupToken: number;
  refreshRegionExtent(): void;
  refreshLightField(): void;
  notifyRegionEntry(): void;
}
interface RuntimePrototype { update(this: ProjectNoclipGame, dt: number): void; }
type JobKind = 'prepare' | 'refresh' | 'unload';
interface StreamJob { key: string; kind: JobKind; x: number; z: number; priority: number; serial: number; notBefore: number; }
export interface StreamingDiagnostics {
  queueDepth: number;
  predictiveWarmLoads: number;
  coldBoundaryLoads: number;
  generatedCells: number;
  loadedCells: number;
  refreshedCells: number;
  unloadedCells: number;
  lastBoundaryFrameMs: number;
  maxBoundaryFrameMs: number;
  generateMs: number;
  cellRendererMs: number;
  cellRefreshMs: number;
  cellUnloadMs: number;
  boundaryReconcileMs: number;
  regionRefreshMs: number;
}
interface SchedulerState {
  jobs: Map<string, StreamJob>;
  serial: number;
  lastX?: number;
  lastZ?: number;
  directionX: number;
  directionZ: number;
  lastCellX?: number;
  lastCellZ?: number;
  diagnostics: StreamingDiagnostics;
}

const states = new WeakMap<ProjectNoclipGame, SchedulerState>();
let installed = false;

function access(game: ProjectNoclipGame): GameStreamingAccess { return game as unknown as GameStreamingAccess; }
function now(): number { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }
function createDiagnostics(): StreamingDiagnostics {
  return { queueDepth: 0, predictiveWarmLoads: 0, coldBoundaryLoads: 0, generatedCells: 0, loadedCells: 0, refreshedCells: 0, unloadedCells: 0, lastBoundaryFrameMs: 0, maxBoundaryFrameMs: 0, generateMs: 0, cellRendererMs: 0, cellRefreshMs: 0, cellUnloadMs: 0, boundaryReconcileMs: 0, regionRefreshMs: 0 };
}
function stateFor(game: ProjectNoclipGame): SchedulerState {
  const existing = states.get(game);
  if (existing) return existing;
  const created: SchedulerState = { jobs: new Map(), serial: 0, directionX: 0, directionZ: 0, diagnostics: createDiagnostics() };
  states.set(game, created);
  return created;
}
function publish(game: ProjectNoclipGame): void {
  if (typeof window === 'undefined') return;
  const state = stateFor(game);
  state.diagnostics.queueDepth = state.jobs.size;
  (window as unknown as { __noclipStreamingDiagnostics?: StreamingDiagnostics }).__noclipStreamingDiagnostics = { ...state.diagnostics };
}
function cellDistance(state: GameStreamingAccess, x: number, z: number): number {
  return Math.max(Math.abs(x - state.currentCellX), Math.abs(z - state.currentCellZ));
}
function descriptorFor(state: GameStreamingAccess, x: number, z: number, diagnostics: StreamingDiagnostics): CellDescriptor {
  if (!state.save) throw new Error('Streaming descriptor requested without a save');
  const start = now();
  const id = `${x}:${z}`;
  const descriptor = generateCell({
    seed: state.save.seed,
    x,
    z,
    worldDay: state.tuning.worldDayOverride ?? calculateWorldDay(Date.now()),
    exposure: state.tuning.exposureOverride ?? calculateExposureDay(state.save.exposure),
    shiftEpoch: state.save.shiftEpochs[id] ?? 0,
    tuning: state.tuning,
    generationVersion: state.save.generationVersion
  });
  diagnostics.generateMs += now() - start;
  diagnostics.generatedCells += 1;
  return descriptor;
}
function descriptorChanged(existing: CellDescriptor, descriptor: CellDescriptor): boolean {
  return existing.address.shiftEpoch !== descriptor.address.shiftEpoch
    || existing.address.zoneId !== descriptor.address.zoneId
    || existing.roomArchetype !== descriptor.roomArchetype;
}
function enqueue(scheduler: SchedulerState, kind: JobKind, x: number, z: number, priority: number, delayMs = 0): void {
  const key = `${kind}:${x}:${z}`;
  const existing = scheduler.jobs.get(key);
  const notBefore = now() + delayMs;
  if (existing) {
    existing.priority = Math.min(existing.priority, priority);
    if (kind === 'unload') existing.notBefore = Math.max(existing.notBefore, notBefore);
    return;
  }
  scheduler.jobs.set(key, { key, kind, x, z, priority, serial: scheduler.serial++, notBefore });
}
function cancel(scheduler: SchedulerState, kind: JobKind, x: number, z: number): void {
  scheduler.jobs.delete(`${kind}:${x}:${z}`);
}
function enableForScope(game: ProjectNoclipGame, descriptor: CellDescriptor): void {
  const state = access(game);
  const visual = state.renderer?.loaded.get(descriptor.id);
  if (!visual) return;
  const loadRadius = renderDistanceProfile(getRenderSettings()).loadRadius;
  visual.root.enabled = cellDistance(state, descriptor.address.cellX, descriptor.address.cellZ) <= loadRadius;
}
function prepareCell(game: ProjectNoclipGame, x: number, z: number, predictive: boolean): void {
  const state = access(game);
  const scheduler = stateFor(game);
  if (!state.renderer || !state.save) return;
  const id = `${x}:${z}`;
  const existing = state.renderer.loaded.get(id)?.descriptor;
  if (existing) { enableForScope(game, existing); return; }
  const descriptor = descriptorFor(state, x, z, scheduler.diagnostics);
  const start = now();
  state.renderer.loadCell(descriptor);
  scheduler.diagnostics.cellRendererMs += now() - start;
  scheduler.diagnostics.loadedCells += 1;
  if (predictive) scheduler.diagnostics.predictiveWarmLoads += 1;
  enableForScope(game, descriptor);
}
function refreshCell(game: ProjectNoclipGame, x: number, z: number): void {
  const state = access(game);
  const scheduler = stateFor(game);
  if (!state.renderer || !state.save) return;
  const id = `${x}:${z}`;
  const existing = state.renderer.loaded.get(id)?.descriptor;
  if (!existing) { prepareCell(game, x, z, false); return; }
  const descriptor = descriptorFor(state, x, z, scheduler.diagnostics);
  if (!descriptorChanged(existing, descriptor)) return;
  const start = now();
  state.renderer.refreshCell(descriptor);
  scheduler.diagnostics.cellRefreshMs += now() - start;
  scheduler.diagnostics.refreshedCells += 1;
  enableForScope(game, descriptor);
}
function unloadCell(game: ProjectNoclipGame, x: number, z: number): void {
  const state = access(game);
  const scheduler = stateFor(game);
  if (!state.renderer || !state.save) return;
  const id = `${x}:${z}`;
  const visual = state.renderer.loaded.get(id);
  if (!visual) return;
  const profile = renderDistanceProfile(getRenderSettings());
  const distance = cellDistance(state, x, z);
  if (distance <= profile.retentionRadius) return;
  const unloadCount = (state.save.unloadCounts[id] ?? 0) + 1;
  state.save.unloadCounts[id] = unloadCount;
  if (state.save.generationVersion === 'gen2'
    && canShift({ occupied: false, observed: false, distanceInCells: distance, stability: visual.descriptor.stability, protectedInteraction: false, preservesPath: true })
    && shouldShift(state.save.seed, id, unloadCount, state.tuning.shiftChance)) {
    state.save.shiftEpochs[id] = (state.save.shiftEpochs[id] ?? 0) + 1;
  }
  const start = now();
  state.renderer.unloadCell(id);
  scheduler.diagnostics.cellUnloadMs += now() - start;
  scheduler.diagnostics.unloadedCells += 1;
}
function processOneJob(game: ProjectNoclipGame): void {
  const scheduler = stateFor(game);
  const timestamp = now();
  const eligible = [...scheduler.jobs.values()]
    .filter((job) => job.notBefore <= timestamp)
    .sort((left, right) => left.priority - right.priority || left.serial - right.serial);
  const job = eligible[0];
  if (!job) { publish(game); return; }
  scheduler.jobs.delete(job.key);
  if (job.kind === 'prepare') prepareCell(game, job.x, job.z, job.priority < 30);
  else if (job.kind === 'refresh') refreshCell(game, job.x, job.z);
  else unloadCell(game, job.x, job.z);
  publish(game);
}
function warmAhead(game: ProjectNoclipGame): void {
  const state = access(game);
  const scheduler = stateFor(game);
  if (!state.renderer || !state.save || !state.camera) return;
  const position = state.camera.getPosition();
  if (scheduler.lastX !== undefined && scheduler.lastZ !== undefined) {
    const dx = position.x - scheduler.lastX;
    const dz = position.z - scheduler.lastZ;
    if (Math.hypot(dx, dz) > 0.005) {
      scheduler.directionX = scheduler.directionX * 0.65 + dx * 0.35;
      scheduler.directionZ = scheduler.directionZ * 0.65 + dz * 0.35;
    }
  }
  scheduler.lastX = position.x;
  scheduler.lastZ = position.z;
  const profile = renderDistanceProfile(getRenderSettings());
  for (const coordinate of predictiveWarmCoordinates(state.currentCellX, state.currentCellZ, profile.loadRadius, scheduler.directionX, scheduler.directionZ)) {
    const id = `${coordinate.x}:${coordinate.z}`;
    if (!state.renderer.loaded.has(id)) enqueue(scheduler, 'prepare', coordinate.x, coordinate.z, coordinate.priority);
    cancel(scheduler, 'unload', coordinate.x, coordinate.z);
  }
}
function finishReconcile(game: ProjectNoclipGame): void {
  const state = access(game);
  const scheduler = stateFor(game);
  if (state.app) {
    const rendering = state.app as unknown as RenderControl;
    if (!rendering.autoRender) rendering.renderNextFrame = true;
  }
  const start = now();
  state.refreshRegionExtent();
  state.refreshLightField();
  state.notifyRegionEntry();
  scheduler.diagnostics.regionRefreshMs += now() - start;
  publish(game);
}
function forceReconcile(game: ProjectNoclipGame, radius: number, retentionRadius: number): void {
  const state = access(game);
  const scheduler = stateFor(game);
  if (!state.save || !state.renderer) return;
  scheduler.jobs.clear();
  const desired = new Set<string>();
  for (let x = state.currentCellX - radius; x <= state.currentCellX + radius; x += 1) {
    for (let z = state.currentCellZ - radius; z <= state.currentCellZ + radius; z += 1) {
      const id = `${x}:${z}`;
      desired.add(id);
      const descriptor = descriptorFor(state, x, z, scheduler.diagnostics);
      const existing = state.renderer.loaded.get(id)?.descriptor;
      if (!existing) {
        const start = now(); state.renderer.loadCell(descriptor); scheduler.diagnostics.cellRendererMs += now() - start; scheduler.diagnostics.loadedCells += 1;
      } else if (descriptorChanged(existing, descriptor)) {
        const start = now(); state.renderer.refreshCell(descriptor); scheduler.diagnostics.cellRefreshMs += now() - start; scheduler.diagnostics.refreshedCells += 1;
      }
      const visual = state.renderer.loaded.get(id); if (visual) visual.root.enabled = true;
      if (x === state.currentCellX && z === state.currentCellZ) state.currentCell = descriptor;
    }
  }
  for (const [id, visual] of [...state.renderer.loaded.entries()]) {
    if (desired.has(id)) continue;
    const distance = cellDistance(state, visual.descriptor.address.cellX, visual.descriptor.address.cellZ);
    if (distance <= retentionRadius) visual.root.enabled = false;
    else unloadCell(game, visual.descriptor.address.cellX, visual.descriptor.address.cellZ);
  }
  finishReconcile(game);
}

export function reconcileStreaming(game: ProjectNoclipGame, force = false, radiusOverride?: number): void {
  const state = access(game);
  const scheduler = stateFor(game);
  if (!state.save || !state.renderer) return;
  if (radiusOverride === undefined) state.streamWarmupToken += 1;
  const settings = getRenderSettings();
  const profile = renderDistanceProfile(settings);
  state.tuning = { ...state.tuning, activeRadius: profile.loadRadius };
  const radius = Math.max(1, Math.min(profile.loadRadius, Math.round(radiusOverride ?? profile.loadRadius)));
  setRendererRenderScope(state.renderer, { centerCellX: state.currentCellX, centerCellZ: state.currentCellZ, loadRadius: radius, retentionRadius: profile.retentionRadius });
  const reconcileStart = now();
  if (force) {
    forceReconcile(game, radius, profile.retentionRadius);
    scheduler.diagnostics.boundaryReconcileMs += now() - reconcileStart;
    return;
  }

  const desired = new Set<string>();
  const missing: Array<{ x: number; z: number; score: number }> = [];
  const currentDescriptor = descriptorFor(state, state.currentCellX, state.currentCellZ, scheduler.diagnostics);
  const currentExisting = state.renderer.loaded.get(currentDescriptor.id)?.descriptor;
  if (!currentExisting) prepareCell(game, state.currentCellX, state.currentCellZ, false);
  else if (descriptorChanged(currentExisting, currentDescriptor)) {
    const start = now(); state.renderer.refreshCell(currentDescriptor); scheduler.diagnostics.cellRefreshMs += now() - start; scheduler.diagnostics.refreshedCells += 1;
  }
  state.currentCell = currentDescriptor;

  for (let x = state.currentCellX - radius; x <= state.currentCellX + radius; x += 1) {
    for (let z = state.currentCellZ - radius; z <= state.currentCellZ + radius; z += 1) {
      const id = `${x}:${z}`;
      desired.add(id);
      cancel(scheduler, 'unload', x, z);
      const visual = state.renderer.loaded.get(id);
      if (visual) {
        visual.root.enabled = true;
        if (x !== state.currentCellX || z !== state.currentCellZ) enqueue(scheduler, 'refresh', x, z, 80 + cellDistance(state, x, z));
      } else {
        const score = -((x - state.currentCellX) * scheduler.directionX + (z - state.currentCellZ) * scheduler.directionZ);
        missing.push({ x, z, score });
        enqueue(scheduler, 'prepare', x, z, 35 + cellDistance(state, x, z));
      }
    }
  }

  if (missing.length > 0) {
    missing.sort((left, right) => left.score - right.score);
    const emergency = missing[0]!;
    cancel(scheduler, 'prepare', emergency.x, emergency.z);
    prepareCell(game, emergency.x, emergency.z, false);
    scheduler.diagnostics.coldBoundaryLoads += 1;
  }

  for (const [id, visual] of [...state.renderer.loaded.entries()]) {
    if (desired.has(id)) continue;
    const x = visual.descriptor.address.cellX;
    const z = visual.descriptor.address.cellZ;
    const distance = cellDistance(state, x, z);
    if (distance <= profile.retentionRadius) {
      visual.root.enabled = false;
      cancel(scheduler, 'unload', x, z);
    } else {
      visual.root.enabled = false;
      enqueue(scheduler, 'unload', x, z, 120 + distance, STREAMING_SCHEDULER_PROFILE.unloadGraceMs);
    }
  }
  scheduler.diagnostics.boundaryReconcileMs += now() - reconcileStart;
  finishReconcile(game);
}

export function installStreamingScheduler(prototype: RuntimePrototype): void {
  if (installed) return;
  installed = true;
  const originalUpdate = prototype.update;
  prototype.update = function streamingScheduledUpdate(this: ProjectNoclipGame, dt: number): void {
    const scheduler = stateFor(this);
    const state = access(this);
    const frameStart = now();
    processOneJob(this);
    originalUpdate.call(this, dt);
    warmAhead(this);
    const changedCell = scheduler.lastCellX !== undefined
      && (scheduler.lastCellX !== state.currentCellX || scheduler.lastCellZ !== state.currentCellZ);
    if (changedCell) {
      const frameMs = now() - frameStart;
      scheduler.diagnostics.lastBoundaryFrameMs = frameMs;
      scheduler.diagnostics.maxBoundaryFrameMs = Math.max(scheduler.diagnostics.maxBoundaryFrameMs, frameMs);
    }
    scheduler.lastCellX = state.currentCellX;
    scheduler.lastCellZ = state.currentCellZ;
    publish(this);
  };
}
'''
write('src/renderer/streamingScheduler.ts', streaming_scheduler)

replace_once(
    'src/renderer/renderSettingsRuntime.ts',
    "import { canShift, shouldShift } from '../simulation/shifting.js';\n",
    ""
)
replace_once(
    'src/renderer/renderSettingsRuntime.ts',
    "import { generateCell } from '../world/generator.js';\n",
    ""
)
replace_once(
    'src/renderer/renderSettingsRuntime.ts',
    "import type { CellDescriptor, WorldTuning } from '../world/types.js';\n",
    "import type { CellDescriptor, WorldTuning } from '../world/types.js';\nimport { installStreamingScheduler, reconcileStreaming } from './streamingScheduler.js';\n"
)
replace_once(
    'src/renderer/renderSettingsRuntime.ts',
    "type RuntimePrototype = {\n  setupEngine(this: ProjectNoclipGame): void;\n  updateStreaming(this: ProjectNoclipGame, force?: boolean, radiusOverride?: number): void;\n  refreshLightField(this: ProjectNoclipGame): void;\n};\n",
    "type RuntimePrototype = {\n  setupEngine(this: ProjectNoclipGame): void;\n  update(this: ProjectNoclipGame, dt: number): void;\n  updateStreaming(this: ProjectNoclipGame, force?: boolean, radiusOverride?: number): void;\n  refreshLightField(this: ProjectNoclipGame): void;\n};\n"
)
start = read('src/renderer/renderSettingsRuntime.ts').index('function updateStreaming(this: ProjectNoclipGame')
end = read('src/renderer/renderSettingsRuntime.ts').index('\nfunction refreshLightField', start)
text = read('src/renderer/renderSettingsRuntime.ts')
replacement = "function updateStreaming(this: ProjectNoclipGame, force = false, radiusOverride?: number): void {\n  reconcileStreaming(this, force, radiusOverride);\n}\n"
write('src/renderer/renderSettingsRuntime.ts', text[:start] + replacement + text[end:])
replace_once(
    'src/renderer/renderSettingsRuntime.ts',
    "  prototype.refreshLightField = refreshLightField;\n}\n",
    "  prototype.refreshLightField = refreshLightField;\n  installStreamingScheduler(prototype);\n}\n"
)

# ---------------------------------------------------------------------------
# Per-Cell batching: Cell lifecycle only dirties that Cell's static batch.
# ---------------------------------------------------------------------------
static_batching = r'''import * as pc from 'playcanvas';
import { CELL_SIZE } from '../world/types.js';
import { installArchDividerRuntimeCorrection } from './archDividerRuntimeCorrection.js';
import { isMFluorescentPanelVisualName } from './fixtureVisualOwnership.js';
import { installFixtureLighting } from './fixtureLighting.js';
import { installLevel0RegionPresentation } from './level0RegionPresentation.js';

const STATIC_WORLD_BATCH_GROUP_ID_START = 1601;
const STATIC_WORLD_BATCH_GROUP_NAME = 'level0-static-cell';
const RECONCILE_INTERVAL_MS = 100;
const EXCLUDED_SUBTREE_PREFIXES = ['item:', 'note:', 'exit:', 'exit-frame:', 'crack:'] as const;

export const STATIC_WORLD_BATCHING_PROFILE = Object.freeze({
  mode: 'per-cell' as const,
  reconcileIntervalMs: RECONCILE_INTERVAL_MS,
  maxAabbSize: CELL_SIZE * 1.5,
  excludesFluorescentPanels: true
});

type BatchRenderComponent = { batchGroupId: number };
type BatchEntity = pc.Entity & { name: string; guid: string; children: readonly unknown[]; render?: { material: pc.StandardMaterial } & BatchRenderComponent; };
type BatchManager = {
  addGroup(name: string, dynamic: boolean, maxAabbSize: number, id?: number): unknown;
  removeGroup(id: number): void;
  markGroupDirty(id: number): void;
};
type BatchApplication = pc.Application & { root: BatchEntity; batcher: BatchManager };
type ApplicationLookup = typeof pc.Application & { getApplication(id?: string): pc.Application | undefined; };
interface CellBatch { id: number; guid: string; }

function isBatchEntity(node: unknown): node is BatchEntity { return node instanceof pc.Entity; }
function isExcludedSubtree(entity: BatchEntity): boolean { return EXCLUDED_SUBTREE_PREFIXES.some((prefix) => entity.name.startsWith(prefix)); }
function assignStaticVisuals(entity: BatchEntity, batchGroupId: number): boolean {
  if (isExcludedSubtree(entity)) return false;
  if (isMFluorescentPanelVisualName(entity.name)) {
    if (entity.render && entity.render.batchGroupId !== -1) { entity.render.batchGroupId = -1; return true; }
    return false;
  }
  let changed = false;
  if (entity.render && entity.render.batchGroupId !== batchGroupId) { entity.render.batchGroupId = batchGroupId; changed = true; }
  for (const child of entity.children) if (isBatchEntity(child)) changed = assignStaticVisuals(child, batchGroupId) || changed;
  return changed;
}
function getRunningApplication(): BatchApplication | undefined {
  return (pc.Application as ApplicationLookup).getApplication('game-canvas') as BatchApplication | undefined;
}

/** Static geometry is batched per streamed Cell so one entering/leaving Cell never invalidates the whole Level 0 batch. */
export function installStaticWorldBatching(): void {
  installLevel0RegionPresentation();
  installArchDividerRuntimeCorrection();
  installFixtureLighting();
  let currentApp: BatchApplication | undefined;
  let nextGroupId = STATIC_WORLD_BATCH_GROUP_ID_START;
  let freeGroupIds: number[] = [];
  let cellBatches = new Map<string, CellBatch>();

  const reset = (app: BatchApplication): void => {
    currentApp = app;
    nextGroupId = STATIC_WORLD_BATCH_GROUP_ID_START;
    freeGroupIds = [];
    cellBatches = new Map();
  };
  const allocate = (app: BatchApplication, cell: BatchEntity): CellBatch => {
    const id = freeGroupIds.pop() ?? nextGroupId++;
    app.batcher.addGroup(`${STATIC_WORLD_BATCH_GROUP_NAME}:${cell.guid}`, false, STATIC_WORLD_BATCHING_PROFILE.maxAabbSize, id);
    const batch = { id, guid: cell.guid };
    cellBatches.set(cell.guid, batch);
    return batch;
  };
  const reconcile = (): void => {
    const app = getRunningApplication();
    if (!app) return;
    if (app !== currentApp) reset(app);
    const cells = app.root.children.filter(isBatchEntity).filter((entity) => entity.name.startsWith('cell:'));
    const present = new Set(cells.map((cell) => cell.guid));
    for (const [guid, batch] of [...cellBatches.entries()]) {
      if (present.has(guid)) continue;
      app.batcher.removeGroup(batch.id);
      freeGroupIds.push(batch.id);
      cellBatches.delete(guid);
    }
    for (const cell of cells) {
      const batch = cellBatches.get(cell.guid) ?? allocate(app, cell);
      if (assignStaticVisuals(cell, batch.id)) app.batcher.markGroupDirty(batch.id);
    }
  };
  reconcile();
  window.setInterval(reconcile, RECONCILE_INTERVAL_MS);
}
'''
write('src/renderer/StaticWorldBatching.ts', static_batching)

# ---------------------------------------------------------------------------
# Durable docs.
# ---------------------------------------------------------------------------
replace_once(
    'WORLD.md',
    "| **Arch Rooms** | `arch-rooms` | **Implemented** | A continuous modifier of the common Level 0 network. Pale finishes and world-owned divider spans emerge with affinity while ordinary enclosure walls remain connected through the transition. Each divider chooses one stable bay scale before Cell clipping; normal repeated bays are symmetrical with continuous lower panels/headers and solid terminations. Explicit irregular/asymmetrical dividers use a bounded rare gate; malformed Cell-clipped openings and overlapping pieces are forbidden defects. |\n",
    "| **Arch Rooms** | `arch-rooms` | **Implemented** | A continuous modifier of the common Level 0 network. Pale finishes and world-owned divider spans emerge with affinity while ordinary enclosure walls remain connected through the transition. A-A1 keeps its accepted small central curve while each rectangular shoulder is exactly half the previous span, moving the piers inward. The visible upper mass sits 0.24 m below the ceiling while piers remain floor-to-ceiling, and the deeper upper layer bridges shared piers continuously. Normal repeated bays are symmetrical with continuous lower panels/headers and solid terminations. Explicit irregular/asymmetrical dividers use a bounded rare gate; malformed Cell-clipped openings and overlapping pieces are forbidden defects. |\n"
)
replace_once(
    'WORLD.md',
    "| Occasional ordinary pillar | **Implemented** | Rare rectangular wallpaper-clad floor-to-ceiling support; not an Arch or alcove motif and not the Region-owned `P-A1` pattern. |\n",
    "| Occasional ordinary pillar | **Implemented** | Rare rectangular wallpaper-clad floor-to-ceiling support; not an Arch or alcove motif and not the Region-owned `P-A1` pattern. |\n| Medium bucket | **Implemented** | Sparse deterministic Arch-Room-only environmental dressing. Open utility-bucket silhouette, muted aged finish, non-solid and route-clear; never loot. |\n| Small grey open paint can | **Implemented** | Sparse deterministic Arch-Room-only environmental dressing. Smaller lidless grey can with visible rim/dark cavity and restrained peeled-label residue without text; non-solid and route-clear; never loot. |\n"
)
replace_once(
    'docs/CODE_MAP.md',
    "  .curve\n    render-only reconstruction -> src/renderer/level0RegionPresentation.ts\n\nArch surface finish\n",
    "  .curve\n    render-only reconstruction -> src/renderer/level0RegionPresentation.ts\n\nArch-only bucket / open paint-can Features\n  deterministic placement -> src/world/gen3SpaceTopologyBuild.ts\n  procedural prop geometry -> src/renderer/cellBuilder.ts\n  World Lab showcase       -> src/renderer/objectCatalog.ts\n\nArch surface finish\n"
)
replace_once(
    'docs/CODE_MAP.md',
    "## I want to change saves\n",
    """## I want to change Cell streaming

```text
movement/boundary detection -> src/app/ProjectNoclipGame.ts
Render Distance scope       -> src/renderer/renderSettingsRuntime.ts + src/renderer/renderSettings.ts
predictive/budgeted work    -> src/renderer/streamingScheduler.ts
Cell build/collider registry-> src/renderer/WorldRenderer.ts + src/renderer/cellBuilder.ts
retained fixture resources  -> src/renderer/fixtureLighting.ts
localized static batches    -> src/renderer/StaticWorldBatching.ts
```

Cells remain deterministic cache addresses. Streaming changes when a descriptor is prepared, never what that Cell is.

## I want to change saves
"""
)

# ---------------------------------------------------------------------------
# Focused regression coverage.
# ---------------------------------------------------------------------------
tests = r'''import assert from 'node:assert/strict';
import test from 'node:test';

const core = await import('../.test-dist/src/world/gen3ArchitectureCore.js');
const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');
const { routeReservationEnvelopesForCell } = await import('../.test-dist/src/world/gen3SpaceTopologyBuild.js');
const { archFramePresentationProfile } = await import('../.test-dist/src/renderer/level0RegionPresentation.js');
const { OBJECT_CATALOG, validateObjectCatalog } = await import('../.test-dist/src/renderer/objectCatalog.js');
const { predictiveWarmCoordinates, streamingRetentionDisposition, STREAMING_SCHEDULER_PROFILE } = await import('../.test-dist/src/renderer/streamingScheduler.js');
const { STATIC_WORLD_BATCHING_PROFILE } = await import('../.test-dist/src/renderer/StaticWorldBatching.js');

function tuning(regionOverride) {
  return { ...DEFAULT_TUNING, regionOverride, conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none', gateBypass: true };
}
function cell(seed, x, z, regionOverride) {
  return generateCell({ seed, x, z, worldDay: 40, exposure: 10, shiftEpoch: 0, tuning: tuning(regionOverride), generationVersion: 'gen3-v1' });
}
function overlaps(left, right) {
  return left.maxX > right.minX && left.minX < right.maxX && left.maxZ > right.minZ && left.minZ < right.maxZ;
}

test('A-A1 halves each shoulder while preserving the accepted central curve', () => {
  const profiles = Array.from({ length: 100 }, (_, index) => core.archBayProfile(`arch-profile-${index}`));
  for (const profile of profiles) {
    assert.ok(Math.abs(profile.curveWidth - core.legacyArchCurveWidth(profile.legacyOpening)) < 1e-12);
    assert.ok(Math.abs(profile.shoulderSpan - profile.legacyShoulderSpan * 0.5) < 1e-12);
    assert.ok(Math.abs(profile.opening - (profile.curveWidth + profile.shoulderSpan * 2)) < 1e-12);
    assert.ok(profile.pitch < profile.legacyPitch);
  }
  assert.ok(Math.min(...profiles.map((profile) => profile.pitch)) >= 3.19);
  assert.ok(Math.max(...profiles.map((profile) => profile.pitch)) <= 3.56);
});

test('A-A1 visible upper assembly is translated down 0.10 m and stays deeper than its piers', () => {
  const profile = archFramePresentationProfile();
  assert.ok(Math.abs(profile.upperBottom - 1.92) < 1e-12);
  assert.ok(Math.abs(profile.upperTop - 2.96) < 1e-12);
  assert.ok(Math.abs(profile.ceilingReveal - 0.24) < 1e-12);
  assert.ok(Math.abs(profile.curveApex - 2.46) < 1e-12);
  assert.equal(profile.shoulderSpanScale, 0.5);
  assert.ok(profile.upperDepth > profile.pierDepth);
  assert.ok(profile.joinOverlap >= 0.04);
  assert.ok(profile.cellSeamOverlap > 0);
});

test('Arch environmental props are deterministic, sparse, independent, exclusive, non-solid and route-clear', () => {
  let buckets = 0;
  let cans = 0;
  let bucketOnly = 0;
  let canOnly = 0;
  let sampledArch = 0;
  for (let seedIndex = 0; seedIndex < 8; seedIndex += 1) {
    const seed = `arch-props-${seedIndex}`;
    for (let x = -10; x <= 10; x += 1) for (let z = -10; z <= 10; z += 1) {
      const first = cell(seed, x, z, 'arch-rooms');
      const second = cell(seed, x, z, 'arch-rooms');
      const props = first.props.filter((prop) => prop.kind === 'bucket' || prop.kind === 'paint-can');
      assert.deepEqual(props, second.props.filter((prop) => prop.kind === 'bucket' || prop.kind === 'paint-can'));
      sampledArch += 1;
      const hasBucket = props.some((prop) => prop.kind === 'bucket');
      const hasCan = props.some((prop) => prop.kind === 'paint-can');
      buckets += hasBucket ? 1 : 0;
      cans += hasCan ? 1 : 0;
      bucketOnly += hasBucket && !hasCan ? 1 : 0;
      canOnly += hasCan && !hasBucket ? 1 : 0;
      const reservations = routeReservationEnvelopesForCell({ seed, cellX: x, cellZ: z, worldDay: 40, exposure: 10, tuning: tuning('arch-rooms') });
      for (const prop of props) {
        assert.equal(prop.solid, false);
        const cx = x * 14 + prop.position.x;
        const cz = z * 14 + prop.position.z;
        const bounds = { minX: cx - prop.scale.x / 2, maxX: cx + prop.scale.x / 2, minZ: cz - prop.scale.z / 2, maxZ: cz + prop.scale.z / 2 };
        assert.ok(reservations.every((reservation) => !overlaps(bounds, reservation)), `${prop.kind} intersected a route reservation`);
      }
      assert.equal(cell(seed, x, z, 'ordinary-level-0').props.some((prop) => prop.kind === 'bucket' || prop.kind === 'paint-can'), false);
      assert.equal(cell(seed, x, z, 'pillar-field').props.some((prop) => prop.kind === 'bucket' || prop.kind === 'paint-can'), false);
    }
  }
  assert.ok(buckets > sampledArch * 0.03 && buckets < sampledArch * 0.18, `bucket cells ${buckets}/${sampledArch}`);
  assert.ok(cans > sampledArch * 0.02 && cans < sampledArch * 0.15, `paint-can cells ${cans}/${sampledArch}`);
  assert.ok(bucketOnly > 10 && canOnly > 10, `independence ${bucketOnly}/${canOnly}`);
});

test('World Lab exposes both new Arch environmental prop visuals', () => {
  assert.deepEqual(validateObjectCatalog(), []);
  assert.ok(OBJECT_CATALOG.some((entry) => entry.propKind === 'bucket'));
  assert.ok(OBJECT_CATALOG.some((entry) => entry.propKind === 'paint-can'));
});

test('predictive warming stays inside the existing retention ring and covers forward edges', () => {
  for (const [dx, dz] of [[1, 0], [0, -1], [1, 1]]) {
    const coordinates = predictiveWarmCoordinates(4, -2, 3, dx, dz);
    assert.ok(coordinates.length >= 7);
    assert.ok(coordinates.every(({ x, z }) => Math.max(Math.abs(x - 4), Math.abs(z + 2)) <= 4));
    assert.ok(coordinates.some(({ x, z }) => (dx === 0 || x === 8) && (dz === 0 || z === -6)));
  }
  assert.equal(STREAMING_SCHEDULER_PROFILE.predictiveExtraRings, 1);
  assert.equal(streamingRetentionDisposition(3, 3, 4), 'active');
  assert.equal(streamingRetentionDisposition(4, 3, 4), 'retained');
  assert.equal(streamingRetentionDisposition(5, 3, 4), 'unload');
  assert.ok(STREAMING_SCHEDULER_PROFILE.unloadGraceMs >= 1000);
});

test('static world batching is localized per Cell rather than one global dirty group', () => {
  assert.equal(STATIC_WORLD_BATCHING_PROFILE.mode, 'per-cell');
  assert.equal(STATIC_WORLD_BATCHING_PROFILE.excludesFluorescentPanels, true);
  assert.ok(STATIC_WORLD_BATCHING_PROFILE.maxAabbSize <= 14 * 2);
});
'''
write('tests/arch-streaming-change.test.mjs', tests)

# Remove temporary staging files from the candidate commit.
for path in [
    ROOT / 'scripts/_tmp_apply_arch_streaming_change.py',
    ROOT / '.github/workflows/_tmp-arch-streaming-change.yml'
]:
    if path.exists():
        path.unlink()
