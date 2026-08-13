import * as pc from 'playcanvas';
import type { ProjectNoclipGame } from '../app/ProjectNoclipGame.js';
import type { SaveData } from '../persistence/types.js';
import type { CellVisual, WorldCollider } from '../renderer/support.js';
import type { WorldRenderer } from '../renderer/WorldRenderer.js';
import { calculateExposureDay, calculateWorldDay } from '../simulation/timeline.js';
import { generateCell } from '../world/generator.js';
import { lightFlickerValue } from '../world/lighting.js';
import { CELL_SIZE, type LightState, type RegionId, type WorldTuning } from '../world/types.js';
import {
  formatRegionDepth,
  locateRegionAtDepth,
  REGION_DEPTH_SEARCH_RADIUS_METERS,
  regionDepthTargetSupported,
  type RegionDepthTarget
} from '../world/regionInspection.js';

const REGION_LABELS: Record<RegionId, string> = {
  'ordinary-level-0': 'Ordinary Level 0',
  'pillar-field': 'Pillar Field',
  'arch-rooms': 'Arch Rooms'
};

interface LabUiAccess {
  toast(message: string, duration?: number): void;
}

interface GameLabAccess {
  readonly save?: SaveData;
  readonly camera?: pc.Entity;
  readonly renderer?: WorldRenderer;
  tuning: WorldTuning;
  currentCellX: number;
  currentCellZ: number;
  regionExtentKey: string;
  yaw: number;
  pitch: number;
  journeyElapsed: number;
  readonly ui: LabUiAccess;
  updateStreaming(force?: boolean): void;
  persist(): Promise<void>;
}

interface InspectionOrigin { x: number; z: number; }
interface InspectionAnchor extends InspectionOrigin { seed: string; regionId: RegionId; }

export interface ArchRouteEvidence {
  orientation: 'x' | 'z';
  fixed: number;
  crossingCoordinate: number;
  start: { x: number; z: number };
  end: { x: number; z: number };
}

export interface FixtureApproachEvidence {
  fixtureId: string;
  fixture: { x: number; z: number };
  start: { x: number; z: number };
  end: { x: number; z: number };
}

export interface FixtureStateEvidence {
  groupId: string;
  fixtureId: string;
  state: LightState;
  fixture: { x: number; z: number };
  view: { x: number; z: number };
}

export interface FixtureStateSnapshot {
  groupId: string;
  state: LightState;
  pulse: number;
  reducedFlicker: boolean;
  sourceOwned: boolean;
}

export interface ArchViewEvidence {
  kind: 'overview' | 'decorative';
  orientation: 'x' | 'z';
  fixed: number;
  start: number;
  end: number;
  view: { x: number; z: number };
}

export interface MarkerWallEvidence {
  wallId: string;
  start: { x: number; z: number };
  yaw: number;
  distanceToSurface: number;
}

export interface ProjectNoclipQaBridge {
  locate(regionId: RegionId, depth: RegionDepthTarget): Promise<string | undefined>;
  placeAtArchRoute(): ArchRouteEvidence | undefined;
  placeAtArchOverview(): ArchViewEvidence | undefined;
  placeAtDecorativeArch(): ArchViewEvidence | undefined;
  placeAtFixtureApproach(): FixtureApproachEvidence | undefined;
  placeAtFixtureState(state: LightState): FixtureStateEvidence | undefined;
  fixtureStateSnapshot(groupId: string): FixtureStateSnapshot | undefined;
  placeAtMarkerWall(): MarkerWallEvidence | undefined;
  snapshot(): {
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    sourceIds: string[];
  } | undefined;
}

declare global {
  interface Window {
    __projectNoclipQa?: ProjectNoclipQaBridge;
  }
}

function worldToCell(value: number): number {
  return Math.floor((value + CELL_SIZE / 2) / CELL_SIZE);
}

function gameAccess(game: ProjectNoclipGame): GameLabAccess {
  return game as unknown as GameLabAccess;
}

function sourceIds(access: GameLabAccess): string[] {
  return [...((access as unknown as { fixtureLightSourceIds?: string[] }).fixtureLightSourceIds ?? [])];
}

function playerClear(
  colliders: readonly WorldCollider[],
  x: number,
  z: number,
  radius = 0.43
): boolean {
  return colliders.every((wall) => (
    x + radius <= wall.minX
    || x - radius >= wall.maxX
    || z + radius <= wall.minZ
    || z - radius >= wall.maxZ
  ));
}

function pathClear(
  colliders: readonly WorldCollider[],
  start: { x: number; z: number },
  end: { x: number; z: number },
  radius = 0.43
): boolean {
  const distance = Math.hypot(end.x - start.x, end.z - start.z);
  const steps = Math.max(2, Math.ceil(distance / 0.24));
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    if (!playerClear(
      colliders,
      start.x + (end.x - start.x) * t,
      start.z + (end.z - start.z) * t,
      radius
    )) return false;
  }
  return true;
}

function runtimePathClear(
  renderer: WorldRenderer,
  start: { x: number; z: number },
  end: { x: number; z: number },
  radius = 0.34
): boolean {
  const distance = Math.hypot(end.x - start.x, end.z - start.z);
  const steps = Math.max(2, Math.ceil(distance / 0.15));
  let currentX = start.x;
  let currentZ = start.z;
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    const targetX = start.x + (end.x - start.x) * t;
    const targetZ = start.z + (end.z - start.z) * t;
    const [resolvedX, resolvedZ] = renderer.resolveMovement(
      currentX,
      currentZ,
      targetX,
      targetZ,
      radius
    );
    if (Math.hypot(resolvedX - targetX, resolvedZ - targetZ) > 0.025) return false;
    currentX = resolvedX;
    currentZ = resolvedZ;
  }
  return Math.hypot(currentX - end.x, currentZ - end.z) <= 0.06;
}

function setInspectionPosition(
  access: GameLabAccess,
  x: number,
  z: number,
  yaw?: number
): void {
  const camera = access.camera;
  if (!camera) return;
  const position = camera.getPosition();
  if (yaw !== undefined) access.yaw = yaw;
  access.pitch = 0;
  camera.setPosition(x, position.y, z);
  camera.setEulerAngles(0, access.yaw, 0);
  access.currentCellX = worldToCell(x);
  access.currentCellZ = worldToCell(z);
  access.regionExtentKey = '';
  access.updateStreaming(true);
}

async function locateForLab(
  access: GameLabAccess,
  regionId: RegionId,
  depth: RegionDepthTarget,
  status?: HTMLElement,
  inspectionOrigin?: InspectionOrigin
): Promise<string | undefined> {
  if (!access.save || !access.camera || access.save.generationVersion !== 'gen3-v1') {
    access.ui.toast('Region-depth inspection is available for Generation 3 journeys.');
    return undefined;
  }
  if (!regionDepthTargetSupported(regionId, depth)) {
    access.ui.toast(`${REGION_LABELS[regionId]} does not define a ${depth} inspection law.`, 4800);
    return undefined;
  }
  const worldDay = access.tuning.worldDayOverride ?? calculateWorldDay(Date.now());
  const exposure = access.tuning.exposureOverride ?? calculateExposureDay(access.save.exposure);
  const position = access.camera.getPosition();
  const origin = inspectionOrigin ?? { x: position.x, z: position.z };
  const occurrence = locateRegionAtDepth({
    seed: access.save.seed,
    originX: origin.x,
    originZ: origin.z,
    targetRegion: regionId,
    targetDepth: depth,
    worldDay,
    exposure,
    tuning: access.tuning
  });
  if (!occurrence) {
    const radiusKm = depth === 'nearest' ? 12 : REGION_DEPTH_SEARCH_RADIUS_METERS / 1000;
    const message = `${REGION_LABELS[regionId]} ${depth} was not found within ${radiusKm.toFixed(0)} km of the inspection anchor. Check timeline gates or enable the local bypass.`;
    if (status) status.textContent = message;
    access.ui.toast(message, 5600);
    return undefined;
  }
  access.tuning = { ...access.tuning, regionOverride: undefined };
  setInspectionPosition(access, occurrence.worldX, occurrence.worldZ);
  const detail = formatRegionDepth(regionId, depth, occurrence);
  const message = `Located ${REGION_LABELS[regionId]} ${occurrence.distanceMeters.toFixed(0)} m from inspection anchor · ${detail}.`;
  if (status) status.textContent = message;
  access.ui.toast(message, 6500);
  await access.persist();
  return message;
}

function worldWall(
  visual: CellVisual,
  wall: CellVisual['descriptor']['walls'][number]
): {
  orientation: 'x' | 'z';
  fixed: number;
  start: number;
  end: number;
  minY: number;
  maxY: number;
} {
  const originX = visual.descriptor.address.cellX * CELL_SIZE;
  const originZ = visual.descriptor.address.cellZ * CELL_SIZE;
  const horizontal = wall.orientation === 'z';
  return {
    orientation: wall.orientation,
    fixed: horizontal ? originZ + wall.cz : originX + wall.cx,
    start: horizontal ? originX + wall.cx - wall.sx / 2 : originZ + wall.cz - wall.sz / 2,
    end: horizontal ? originX + wall.cx + wall.sx / 2 : originZ + wall.cz + wall.sz / 2,
    minY: wall.cy - wall.sy / 2,
    maxY: wall.cy + wall.sy / 2
  };
}

interface ArchRouteCandidate {
  key: string;
  evidence: ArchRouteEvidence;
  distance: number;
  yaw: number;
}

function archRouteCandidates(
  renderer: WorldRenderer,
  camera: pc.Entity,
  rejected: ReadonlySet<string>
): ArchRouteCandidate[] {
  const colliders = [...renderer.walls.values()];
  const position = camera.getPosition();
  const candidates: ArchRouteCandidate[] = [];
  for (const visual of renderer.loaded.values()) {
    if (visual.descriptor.world.regionId !== 'arch-rooms') continue;
    for (const wall of visual.descriptor.walls) {
      const geometry = worldWall(visual, wall);
      const overheadHeader = wall.materialId === 'arch-pale-wallpaper'
        && geometry.minY > 2.68
        && wall.sy > 0.34
        && wall.sy < 0.55;
      if (!overheadHeader || geometry.end - geometry.start < 2.5) continue;
      for (let along = geometry.start + 1.05; along <= geometry.end - 1.05; along += 0.28) {
        const key = `${wall.id}:${along.toFixed(2)}`;
        if (rejected.has(key)) continue;
        const crossing = geometry.orientation === 'z'
          ? { x: along, z: geometry.fixed }
          : { x: geometry.fixed, z: along };
        const start = geometry.orientation === 'z'
          ? { x: along, z: geometry.fixed - 1.75 }
          : { x: geometry.fixed - 1.75, z: along };
        const end = geometry.orientation === 'z'
          ? { x: along, z: geometry.fixed + 1.75 }
          : { x: geometry.fixed + 1.75, z: along };
        if (!pathClear(colliders, start, end, 0.43)) continue;
        candidates.push({
          key,
          evidence: {
            orientation: geometry.orientation,
            fixed: geometry.fixed,
            crossingCoordinate: along,
            start,
            end
          },
          distance: Math.hypot(crossing.x - position.x, crossing.z - position.z),
          yaw: geometry.orientation === 'z' ? 180 : -90
        });
        break;
      }
    }
  }
  return candidates.sort((left, right) => left.distance - right.distance);
}

function findArchRoute(access: GameLabAccess): ArchRouteEvidence | undefined {
  const renderer = access.renderer;
  const camera = access.camera;
  if (!renderer || !camera) return undefined;
  const rejected = new Set<string>();
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const candidate = archRouteCandidates(renderer, camera, rejected)[0];
    if (!candidate) return undefined;
    rejected.add(candidate.key);
    setInspectionPosition(access, candidate.evidence.start.x, candidate.evidence.start.z, candidate.yaw);
    const freshColliders = [...renderer.walls.values()];
    if (!pathClear(freshColliders, candidate.evidence.start, candidate.evidence.end, 0.43)) continue;
    if (!runtimePathClear(renderer, candidate.evidence.start, candidate.evidence.end)) continue;
    return candidate.evidence;
  }
  return undefined;
}

function findArchView(
  access: GameLabAccess,
  kind: 'overview' | 'decorative'
): ArchViewEvidence | undefined {
  const renderer = access.renderer;
  const camera = access.camera;
  if (!renderer || !camera) return undefined;
  const colliders = [...renderer.walls.values()];
  const cameraPosition = camera.getPosition();
  const candidates: Array<{ evidence: ArchViewEvidence; yaw: number; distance: number }> = [];

  for (const visual of renderer.loaded.values()) {
    if (visual.descriptor.world.regionId !== 'arch-rooms') continue;
    for (const wall of visual.descriptor.walls) {
      if (wall.materialId !== 'arch-pale-wallpaper') continue;
      const geometry = worldWall(visual, wall);
      const isHeader = geometry.minY > 2.68 && wall.sy > 0.34 && wall.sy < 0.55;
      const isCurve = geometry.minY > 1.45 && geometry.minY < 2.72 && geometry.maxY > 2.70;
      if (kind === 'overview' ? !isHeader : !isCurve) continue;
      const length = geometry.end - geometry.start;
      if (length < (kind === 'overview' ? 4.2 : 0.18)) continue;
      const along = (geometry.start + geometry.end) / 2;
      if (kind === 'decorative') {
        const hasLowerPanel = [...renderer.loaded.values()].some((candidateVisual) => (
          candidateVisual.descriptor.world.regionId === 'arch-rooms'
          && candidateVisual.descriptor.walls.some((candidateWall) => {
            if (candidateWall.materialId !== 'arch-pale-wallpaper') return false;
            const candidateGeometry = worldWall(candidateVisual, candidateWall);
            if (candidateGeometry.orientation !== geometry.orientation || Math.abs(candidateGeometry.fixed - geometry.fixed) > 0.03) return false;
            const lower = candidateGeometry.minY < 0.03 && candidateGeometry.maxY > 0.92 && candidateGeometry.maxY < 1.08;
            return lower && along > candidateGeometry.start + 0.03 && along < candidateGeometry.end - 0.03;
          })
        ));
        if (!hasLowerPanel) continue;
      }
      for (const side of [-1, 1] as const) {
        const viewDistance = kind === 'overview' ? 7.2 : 4.8;
        const view = geometry.orientation === 'z'
          ? { x: along, z: geometry.fixed + side * viewDistance }
          : { x: geometry.fixed + side * viewDistance, z: along };
        if (!playerClear(colliders, view.x, view.z, 0.43)) continue;
        const target = geometry.orientation === 'z'
          ? { x: along, z: geometry.fixed }
          : { x: geometry.fixed, z: along };
        if (!pathClear(colliders, view, {
          x: view.x + (target.x - view.x) * 0.45,
          z: view.z + (target.z - view.z) * 0.45
        }, 0.43)) continue;
        const yaw = Math.atan2(-(target.x - view.x), -(target.z - view.z)) * 180 / Math.PI;
        candidates.push({
          evidence: {
            kind,
            orientation: geometry.orientation,
            fixed: geometry.fixed,
            start: geometry.start,
            end: geometry.end,
            view
          },
          yaw,
          distance: Math.hypot(view.x - cameraPosition.x, view.z - cameraPosition.z)
        });
      }
    }
  }

  const chosen = candidates.sort((left, right) => left.distance - right.distance)[0];
  if (!chosen) return undefined;
  setInspectionPosition(access, chosen.evidence.view.x, chosen.evidence.view.z, chosen.yaw);
  return chosen.evidence;
}

interface FixtureCandidate {
  key: string;
  evidence: FixtureApproachEvidence;
  distance: number;
  yaw: number;
  alreadyOwned: boolean;
}

function fixtureCandidates(
  access: GameLabAccess,
  rejected: ReadonlySet<string>
): FixtureCandidate[] {
  const renderer = access.renderer;
  const camera = access.camera;
  if (!renderer || !camera) return [];
  const colliders = [...renderer.walls.values()];
  const cameraPosition = camera.getPosition();
  const directions = Array.from({ length: 32 }, (_value, index) => {
    const angle = index / 32 * Math.PI * 2;
    return { x: Math.cos(angle), z: Math.sin(angle) };
  });
  const currentSourceIds = new Set(sourceIds(access));
  const candidates: FixtureCandidate[] = [];

  for (const visual of renderer.loaded.values()) {
    const originX = visual.descriptor.address.cellX * CELL_SIZE;
    const originZ = visual.descriptor.address.cellZ * CELL_SIZE;
    for (const group of visual.descriptor.lightGroups) {
      if (group.state === 'off') continue;
      group.fixtures.forEach((fixture, index) => {
        const fixtureId = `${group.id}:${index}`;
        const point = { x: originX + fixture.x, z: originZ + fixture.z };
        for (let directionIndex = 0; directionIndex < directions.length; directionIndex += 1) {
          const direction = directions[directionIndex]!;
          const key = `${fixtureId}:${directionIndex}`;
          if (rejected.has(key)) continue;
          const start = {
            x: point.x + direction.x * 23.9,
            z: point.z + direction.z * 23.9
          };
          const end = {
            x: point.x - direction.x * 6.2,
            z: point.z - direction.z * 6.2
          };
          if (!pathClear(colliders, start, end, 0.43)) continue;
          const yaw = Math.atan2(-(point.x - start.x), -(point.z - start.z)) * 180 / Math.PI;
          candidates.push({
            key,
            evidence: { fixtureId, fixture: point, start, end },
            distance: Math.hypot(start.x - cameraPosition.x, start.z - cameraPosition.z),
            yaw,
            alreadyOwned: currentSourceIds.has(fixtureId)
          });
          break;
        }
      });
    }
  }
  return candidates.sort((left, right) => (
    Number(right.alreadyOwned) - Number(left.alreadyOwned)
    || left.distance - right.distance
  ));
}

function findFixtureApproach(access: GameLabAccess): FixtureApproachEvidence | undefined {
  const renderer = access.renderer;
  const camera = access.camera;
  if (!renderer || !camera) return undefined;
  const rejected = new Set<string>();
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidate = fixtureCandidates(access, rejected)[0];
    if (!candidate) return undefined;
    rejected.add(candidate.key);
    setInspectionPosition(access, candidate.evidence.start.x, candidate.evidence.start.z, candidate.yaw);
    const freshColliders = [...renderer.walls.values()];
    if (!pathClear(freshColliders, candidate.evidence.start, candidate.evidence.end, 0.43)) continue;
    if (!runtimePathClear(renderer, candidate.evidence.start, candidate.evidence.end)) continue;
    return candidate.evidence;
  }
  return undefined;
}

function perimeterCells(originX: number, originZ: number, radius: number): Array<{ x: number; z: number }> {
  if (radius === 0) return [{ x: originX, z: originZ }];
  const result: Array<{ x: number; z: number }> = [];
  for (let dx = -radius; dx <= radius; dx += 1) {
    result.push({ x: originX + dx, z: originZ - radius });
    result.push({ x: originX + dx, z: originZ + radius });
  }
  for (let dz = -radius + 1; dz <= radius - 1; dz += 1) {
    result.push({ x: originX - radius, z: originZ + dz });
    result.push({ x: originX + radius, z: originZ + dz });
  }
  return result;
}

function findFixtureState(
  access: GameLabAccess,
  state: LightState
): FixtureStateEvidence | undefined {
  if (!access.save || !access.renderer || !access.camera || access.save.generationVersion !== 'gen3-v1') return undefined;
  const worldDay = access.tuning.worldDayOverride ?? calculateWorldDay(Date.now());
  const exposure = access.tuning.exposureOverride ?? calculateExposureDay(access.save.exposure);
  const tuning: WorldTuning = {
    ...access.tuning,
    conditionOverride: 'clear',
    carverOverride: 'none',
    structureOverride: 'none',
    regionOverride: undefined,
    gateBypass: true
  };
  let found: { cellX: number; cellZ: number; groupId: string; fixtureIndex: number } | undefined;

  outer:
  for (let radius = 0; radius <= 72; radius += 1) {
    for (const address of perimeterCells(access.currentCellX, access.currentCellZ, radius)) {
      const descriptor = generateCell({
        seed: access.save.seed,
        x: address.x,
        z: address.z,
        worldDay,
        exposure,
        shiftEpoch: access.save.shiftEpochs[`${address.x}:${address.z}`] ?? 0,
        tuning,
        generationVersion: 'gen3-v1'
      });
      const group = descriptor.lightGroups.find((candidate) => candidate.state === state && candidate.fixtures.length > 0);
      if (!group) continue;
      found = {
        cellX: address.x,
        cellZ: address.z,
        groupId: group.id,
        fixtureIndex: 0
      };
      break outer;
    }
  }
  if (!found) return undefined;

  access.tuning = tuning;
  setInspectionPosition(access, found.cellX * CELL_SIZE, found.cellZ * CELL_SIZE);
  const visual = access.renderer.loaded.get(`${found.cellX}:${found.cellZ}`);
  const group = visual?.descriptor.lightGroups.find((candidate) => candidate.id === found.groupId);
  const fixture = group?.fixtures[found.fixtureIndex];
  if (!visual || !group || !fixture) return undefined;

  const point = {
    x: found.cellX * CELL_SIZE + fixture.x,
    z: found.cellZ * CELL_SIZE + fixture.z
  };
  const colliders = [...access.renderer.walls.values()];
  for (let directionIndex = 0; directionIndex < 32; directionIndex += 1) {
    const angle = directionIndex / 32 * Math.PI * 2;
    const direction = { x: Math.cos(angle), z: Math.sin(angle) };
    const view = {
      x: point.x + direction.x * 4.2,
      z: point.z + direction.z * 4.2
    };
    if (!playerClear(colliders, view.x, view.z, 0.43)) continue;
    const yaw = Math.atan2(-(point.x - view.x), -(point.z - view.z)) * 180 / Math.PI;
    setInspectionPosition(access, view.x, view.z, yaw);
    return {
      groupId: group.id,
      fixtureId: `${group.id}:${found.fixtureIndex}`,
      state: group.state,
      fixture: point,
      view
    };
  }
  return undefined;
}

function fixtureStateSnapshot(
  access: GameLabAccess,
  groupId: string
): FixtureStateSnapshot | undefined {
  const renderer = access.renderer;
  if (!access.save || !renderer) return undefined;
  for (const visual of renderer.loaded.values()) {
    const group = visual.descriptor.lightGroups.find((candidate) => candidate.id === groupId);
    if (!group) continue;
    return {
      groupId,
      state: group.state,
      pulse: lightFlickerValue(group, access.journeyElapsed, access.save.settings.reducedFlicker),
      reducedFlicker: access.save.settings.reducedFlicker,
      sourceOwned: group.fixtures.some((_fixture, index) => sourceIds(access).includes(`${group.id}:${index}`))
    };
  }
  return undefined;
}

function findMarkerWall(access: GameLabAccess): MarkerWallEvidence | undefined {
  const renderer = access.renderer;
  const camera = access.camera;
  if (!renderer || !camera) return undefined;
  const colliders = [...renderer.walls.values()];
  const position = camera.getPosition();
  const candidates: Array<{ evidence: MarkerWallEvidence; distance: number }> = [];
  for (const wall of colliders) {
    if (!wall.drawable || wall.minY > 1.5 || wall.maxY < 1.8) continue;
    const normalHalf = wall.orientation === 'x' ? wall.sx / 2 : wall.sz / 2;
    const wallLength = wall.orientation === 'x' ? wall.sz : wall.sx;
    if (wallLength < 1.6) continue;
    for (const side of [-1, 1] as const) {
      const surfaceGap = 1.75;
      const start = wall.orientation === 'x'
        ? { x: wall.cx + side * (normalHalf + surfaceGap), z: wall.cz }
        : { x: wall.cx, z: wall.cz + side * (normalHalf + surfaceGap) };
      const near = wall.orientation === 'x'
        ? { x: wall.cx + side * (normalHalf + 0.62), z: wall.cz }
        : { x: wall.cx, z: wall.cz + side * (normalHalf + 0.62) };
      if (!playerClear(colliders, start.x, start.z) || !pathClear(colliders, start, near)) continue;
      const yaw = Math.atan2(-(wall.cx - start.x), -(wall.cz - start.z)) * 180 / Math.PI;
      candidates.push({
        evidence: { wallId: wall.id, start, yaw, distanceToSurface: surfaceGap },
        distance: Math.hypot(start.x - position.x, start.z - position.z)
      });
    }
  }
  const chosen = candidates.sort((left, right) => left.distance - right.distance)[0]?.evidence;
  if (!chosen) return undefined;
  setInspectionPosition(access, chosen.start.x, chosen.start.z, chosen.yaw);
  return chosen;
}

function installQaBridge(
  access: GameLabAccess,
  locate: (
    regionId: RegionId,
    depth: RegionDepthTarget,
    status?: HTMLElement
  ) => Promise<string | undefined>
): void {
  window.__projectNoclipQa = {
    locate: (regionId, depth) => locate(regionId, depth),
    placeAtArchRoute: () => findArchRoute(access),
    placeAtArchOverview: () => findArchView(access, 'overview'),
    placeAtDecorativeArch: () => findArchView(access, 'decorative'),
    placeAtFixtureApproach: () => findFixtureApproach(access),
    placeAtFixtureState: (state) => findFixtureState(access, state),
    fixtureStateSnapshot: (groupId) => fixtureStateSnapshot(access, groupId),
    placeAtMarkerWall: () => findMarkerWall(access),
    snapshot: () => {
      if (!access.camera) return undefined;
      const position = access.camera.getPosition();
      return {
        x: position.x,
        y: position.y,
        z: position.z,
        yaw: access.yaw,
        pitch: access.pitch,
        sourceIds: sourceIds(access)
      };
    }
  };
}

function syncDepthOptions(
  regionSelect: HTMLSelectElement,
  depthSelect: HTMLSelectElement
): void {
  const regionId = regionSelect.value as RegionId;
  for (const option of [...depthSelect.options]) {
    const supported = regionDepthTargetSupported(regionId, option.value as RegionDepthTarget);
    option.disabled = !supported;
    option.hidden = !supported;
  }
  if (!regionDepthTargetSupported(regionId, depthSelect.value as RegionDepthTarget)) {
    depthSelect.value = 'nearest';
  }
  depthSelect.disabled = regionId === 'ordinary-level-0';
}

export function installRegionDepthLab(game: ProjectNoclipGame): void {
  const access = gameAccess(game);
  const regionSelect = document.querySelector<HTMLSelectElement>('[data-lab="region"]');
  const locateButton = document.querySelector<HTMLButtonElement>('[data-action="locate-region"]');
  if (!regionSelect || !locateButton) return;

  const depthLabel = document.createElement('label');
  depthLabel.dataset.dev5RegionDepth = 'true';
  depthLabel.textContent = 'Region depth';
  const depthSelect = document.createElement('select');
  depthSelect.dataset.lab = 'region-depth';
  const labels: Array<[RegionDepthTarget, string]> = [
    ['nearest', 'Nearest natural Region'],
    ['edge', 'Blend edge'],
    ['interior', 'Interior / mixed territory'],
    ['core', 'Core'],
    ['deep-core', 'Deep core / rare lattice endpoint']
  ];
  for (const [value, label] of labels) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    depthSelect.appendChild(option);
  }
  depthLabel.appendChild(depthSelect);
  locateButton.before(depthLabel);

  const status = document.createElement('small');
  status.dataset.ui = 'region-depth-status';
  status.className = 'region-depth-status';
  status.style.gridColumn = '1 / -1';
  status.style.color = 'var(--muted)';
  status.textContent = 'Depth sampling uses one stable inspection anchor over the natural continuous Region field; no Cell bands are created.';
  locateButton.after(status);

  let anchor: InspectionAnchor | undefined;
  const locate = async (
    regionId: RegionId,
    depth: RegionDepthTarget,
    targetStatus?: HTMLElement
  ): Promise<string | undefined> => {
    const save = access.save;
    const camera = access.camera;
    if (!save || !camera) return locateForLab(access, regionId, depth, targetStatus);
    const position = camera.getPosition();
    if (
      depth === 'nearest'
      || !anchor
      || anchor.seed !== save.seed
      || anchor.regionId !== regionId
    ) {
      anchor = { seed: save.seed, regionId, x: position.x, z: position.z };
    }
    return locateForLab(
      access,
      regionId,
      depth,
      targetStatus,
      { x: anchor.x, z: anchor.z }
    );
  };

  syncDepthOptions(regionSelect, depthSelect);
  regionSelect.addEventListener('change', () => {
    anchor = undefined;
    syncDepthOptions(regionSelect, depthSelect);
  });
  locateButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    void locate(
      regionSelect.value as RegionId,
      depthSelect.value as RegionDepthTarget,
      status
    );
  }, true);
  installQaBridge(access, locate);
}
