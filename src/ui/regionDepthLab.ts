import * as pc from 'playcanvas';
import type { ProjectNoclipGame } from '../app/ProjectNoclipGame.js';
import type { SaveData } from '../persistence/types.js';
import type { CellVisual, WorldCollider } from '../renderer/support.js';
import type { WorldRenderer } from '../renderer/WorldRenderer.js';
import { calculateExposureDay, calculateWorldDay } from '../simulation/timeline.js';
import { CELL_SIZE, type RegionId, type WorldTuning } from '../world/types.js';
import { formatRegionDepth, locateRegionAtDepth, regionDepthTargetSupported, type RegionDepthTarget } from '../world/regionInspection.js';

const REGION_LABELS: Record<RegionId, string> = {
  'ordinary-level-0': 'Ordinary Level 0',
  'pillar-field': 'Pillar Field',
  'arch-rooms': 'Arch Rooms'
};

interface LabUiAccess { toast(message: string, duration?: number): void; }
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
  readonly ui: LabUiAccess;
  updateStreaming(force?: boolean): void;
  persist(): Promise<void>;
}

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

export interface ProjectNoclipQaBridge {
  locate(regionId: RegionId, depth: RegionDepthTarget): Promise<string | undefined>;
  placeAtArchRoute(): ArchRouteEvidence | undefined;
  placeAtFixtureApproach(): FixtureApproachEvidence | undefined;
  snapshot(): { x: number; y: number; z: number; yaw: number; pitch: number; sourceIds: string[] } | undefined;
}

declare global {
  interface Window { __projectNoclipQa?: ProjectNoclipQaBridge; }
}

function worldToCell(value: number): number {
  return Math.floor((value + CELL_SIZE / 2) / CELL_SIZE);
}

function gameAccess(game: ProjectNoclipGame): GameLabAccess {
  return game as unknown as GameLabAccess;
}

function playerClear(colliders: readonly WorldCollider[], x: number, z: number, radius = 0.43): boolean {
  return colliders.every((wall) => x + radius <= wall.minX || x - radius >= wall.maxX || z + radius <= wall.minZ || z - radius >= wall.maxZ);
}

function pathClear(colliders: readonly WorldCollider[], start: { x: number; z: number }, end: { x: number; z: number }): boolean {
  const distance = Math.hypot(end.x - start.x, end.z - start.z);
  const steps = Math.max(2, Math.ceil(distance / 0.24));
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    if (!playerClear(colliders, start.x + (end.x - start.x) * t, start.z + (end.z - start.z) * t)) return false;
  }
  return true;
}

function setInspectionPosition(access: GameLabAccess, x: number, z: number, yaw?: number): void {
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

async function locateForLab(access: GameLabAccess, regionId: RegionId, depth: RegionDepthTarget, status?: HTMLElement): Promise<string | undefined> {
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
  const occurrence = locateRegionAtDepth({
    seed: access.save.seed,
    originX: position.x,
    originZ: position.z,
    targetRegion: regionId,
    targetDepth: depth,
    worldDay,
    exposure,
    tuning: access.tuning
  });
  if (!occurrence) {
    const message = `${REGION_LABELS[regionId]} ${depth} was not found within 12 km. Check timeline gates or enable the local bypass.`;
    if (status) status.textContent = message;
    access.ui.toast(message, 5600);
    return undefined;
  }

  // QA navigation clears only a local Region override. It never changes the
  // deterministic geography being inspected.
  access.tuning = { ...access.tuning, regionOverride: undefined };
  setInspectionPosition(access, occurrence.worldX, occurrence.worldZ);
  const detail = formatRegionDepth(regionId, depth, occurrence);
  const message = `Located ${REGION_LABELS[regionId]} ${occurrence.distanceMeters.toFixed(0)} m away · ${detail}.`;
  if (status) status.textContent = message;
  access.ui.toast(message, 6500);
  await access.persist();
  return message;
}

function worldWall(visual: CellVisual, wall: CellVisual['descriptor']['walls'][number]): { orientation: 'x' | 'z'; fixed: number; start: number; end: number; minY: number; maxY: number } {
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

function findArchRoute(access: GameLabAccess): ArchRouteEvidence | undefined {
  const renderer = access.renderer;
  const camera = access.camera;
  if (!renderer || !camera) return undefined;
  const colliders = [...renderer.walls.values()];
  const position = camera.getPosition();
  const candidates: Array<{ evidence: ArchRouteEvidence; distance: number }> = [];

  for (const visual of renderer.loaded.values()) {
    if (visual.descriptor.world.regionId !== 'arch-rooms') continue;
    for (const wall of visual.descriptor.walls) {
      const geometry = worldWall(visual, wall);
      const overheadHeader = wall.materialId === 'arch-pale-wallpaper' && geometry.minY > 2.68 && wall.sy > 0.34 && wall.sy < 0.55;
      if (!overheadHeader || geometry.end - geometry.start < 2.5) continue;
      for (let along = geometry.start + 1.05; along <= geometry.end - 1.05; along += 0.34) {
        const crossing = geometry.orientation === 'z' ? { x: along, z: geometry.fixed } : { x: geometry.fixed, z: along };
        const start = geometry.orientation === 'z' ? { x: along, z: geometry.fixed - 1.75 } : { x: geometry.fixed - 1.75, z: along };
        const end = geometry.orientation === 'z' ? { x: along, z: geometry.fixed + 1.75 } : { x: geometry.fixed + 1.75, z: along };
        if (!pathClear(colliders, start, end)) continue;
        const evidence: ArchRouteEvidence = { orientation: geometry.orientation, fixed: geometry.fixed, crossingCoordinate: along, start, end };
        candidates.push({ evidence, distance: Math.hypot(crossing.x - position.x, crossing.z - position.z) });
        break;
      }
    }
  }
  const chosen = candidates.sort((left, right) => left.distance - right.distance)[0]?.evidence;
  if (!chosen) return undefined;
  const yaw = chosen.orientation === 'z' ? 180 : -90;
  setInspectionPosition(access, chosen.start.x, chosen.start.z, yaw);
  return chosen;
}

function findFixtureApproach(access: GameLabAccess): FixtureApproachEvidence | undefined {
  const renderer = access.renderer;
  const camera = access.camera;
  if (!renderer || !camera) return undefined;
  const colliders = [...renderer.walls.values()];
  const cameraPosition = camera.getPosition();
  const directions = Array.from({ length: 16 }, (_value, index) => {
    const angle = index / 16 * Math.PI * 2;
    return { x: Math.cos(angle), z: Math.sin(angle) };
  });
  const currentSourceIds = new Set((access as unknown as { fixtureLightSourceIds?: string[] }).fixtureLightSourceIds ?? []);
  const candidates: Array<{ evidence: FixtureApproachEvidence; distance: number; yaw: number; alreadyOwned: boolean }> = [];

  for (const visual of renderer.loaded.values()) {
    const originX = visual.descriptor.address.cellX * CELL_SIZE;
    const originZ = visual.descriptor.address.cellZ * CELL_SIZE;
    for (const group of visual.descriptor.lightGroups) {
      if (group.state === 'off') continue;
      group.fixtures.forEach((fixture, index) => {
        const point = { x: originX + fixture.x, z: originZ + fixture.z };
        for (const direction of directions) {
          const start = { x: point.x + direction.x * 25.5, z: point.z + direction.z * 25.5 };
          const end = { x: point.x + direction.x * 11.5, z: point.z + direction.z * 11.5 };
          if (!pathClear(colliders, start, end)) continue;
          const yaw = Math.atan2(-(point.x - start.x), -(point.z - start.z)) * 180 / Math.PI;
          candidates.push({
            evidence: { fixtureId: `${group.id}:${index}`, fixture: point, start, end },
            distance: Math.hypot(start.x - cameraPosition.x, start.z - cameraPosition.z),
            yaw,
            alreadyOwned: currentSourceIds.has(`${group.id}:${index}`)
          });
          break;
        }
      });
    }
  }
  const chosen = candidates.sort((left, right) => Number(right.alreadyOwned) - Number(left.alreadyOwned) || left.distance - right.distance)[0];
  if (!chosen) return undefined;
  setInspectionPosition(access, chosen.evidence.start.x, chosen.evidence.start.z, chosen.yaw);
  return chosen.evidence;
}

function installQaBridge(access: GameLabAccess): void {
  window.__projectNoclipQa = {
    locate: (regionId, depth) => locateForLab(access, regionId, depth),
    placeAtArchRoute: () => findArchRoute(access),
    placeAtFixtureApproach: () => findFixtureApproach(access),
    snapshot: () => {
      if (!access.camera) return undefined;
      const position = access.camera.getPosition();
      const sourceIds = (access as unknown as { fixtureLightSourceIds?: string[] }).fixtureLightSourceIds ?? [];
      return { x: position.x, y: position.y, z: position.z, yaw: access.yaw, pitch: access.pitch, sourceIds: [...sourceIds] };
    }
  };
}

function syncDepthOptions(regionSelect: HTMLSelectElement, depthSelect: HTMLSelectElement): void {
  const regionId = regionSelect.value as RegionId;
  for (const option of [...depthSelect.options]) {
    const supported = regionDepthTargetSupported(regionId, option.value as RegionDepthTarget);
    option.disabled = !supported;
    option.hidden = !supported;
  }
  if (!regionDepthTargetSupported(regionId, depthSelect.value as RegionDepthTarget)) depthSelect.value = 'nearest';
  depthSelect.disabled = regionId === 'ordinary-level-0';
}

/** Add QA-only Region-depth navigation beside the existing deterministic Region locator. */
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
  status.textContent = 'Depth sampling uses the natural continuous Region field; no Cell bands are created.';
  locateButton.after(status);

  syncDepthOptions(regionSelect, depthSelect);
  regionSelect.addEventListener('change', () => syncDepthOptions(regionSelect, depthSelect));
  locateButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    void locateForLab(access, regionSelect.value as RegionId, depthSelect.value as RegionDepthTarget, status);
  }, true);

  installQaBridge(access);
}
