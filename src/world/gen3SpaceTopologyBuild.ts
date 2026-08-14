import { stableId, unitFloat } from './hash.js';
import {
  CELL_SIZE,
  WALL_HEIGHT,
  WALL_THICKNESS,
  type MaterialId,
  type PropSpec,
  type WallSpec,
  type WorldTuning
} from './types.js';
import {
  ARCH_HEADER_HEIGHT,
  ARCH_LOWER_HEIGHT,
  ARCH_PIER_WIDTH,
  PILLAR_MAX_WIDTH,
  PILLAR_MIN_WIDTH,
  PILLAR_SPACING,
  pushClippedWall,
  sampleGen3RegionInfluence,
  subtractIntervals,
  type Gen3ArchitectureResult
} from './gen3ArchitectureCore.js';
import {
  DOMAIN_FINE_SPANS,
  DOMAIN_MAJOR_SPANS,
  domainParent,
  domainWorldBounds,
  generateTopologyDomainSlice,
  sameDomain,
  topologyLinePosition,
  type DomainContext,
  type TopologyPortal,
  type TopologyWall
} from './gen3SpaceTopologyDomain.js';

interface SeamWall extends TopologyWall { omitted: boolean; }

export interface RouteReservationEnvelope {
  wallId: string;
  portalId: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * One route envelope is shared by perpendicular wall carving and Pillar
 * exclusion. The landing depth is intentionally close to the accepted dev.5
 * 2 m landing while the lateral margin is only just beyond the 0.42 m player
 * radius; the envelope protects traversal without hollowing common Pillar
 * territory into another open hall.
 */
export const ROUTE_RESERVATION_LANDING_DEPTH = 1.9;
export const ROUTE_RESERVATION_PLAYER_MARGIN = 0.46;
/** P-A1 piers remain visibly independent of O-A1 partition boundaries. */
export const PILLAR_WALL_CLEARANCE = 0.62;
const PILLAR_ROOM_NUDGE_MARGIN = 0.04;
const PILLAR_ROOM_NUDGE_PASSES = 4;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function portalWidth(seed: string, key: string, length: number): { kind: TopologyPortal['kind']; width: number } {
  const roll = unitFloat(`${seed}:seam-kind:${key}`);
  const widthRoll = unitFloat(`${seed}:seam-width:${key}`);
  let kind: TopologyPortal['kind'];
  let width: number;
  if (roll < 0.2) {
    kind = 'tight';
    width = 2.0 + widthRoll * 0.25;
  } else if (roll < 0.75) {
    kind = 'normal';
    width = 2.25 + widthRoll * 0.60;
  } else if (roll < 0.85) {
    kind = 'wide';
    width = 2.85 + widthRoll * 0.60;
  } else {
    kind = 'exceptional';
    width = 3.45 + widthRoll * 0.75;
  }
  return { kind, width: Math.min(width, Math.max(1.45, length - 0.9)) };
}

export function topologySeamWall(
  ctx: DomainContext,
  boundaryAxis: 'x' | 'z',
  line: number,
  alongDomain: number
): SeamWall {
  const vertical = boundaryAxis === 'x';
  const left = vertical ? { x: line - 1, z: alongDomain } : { x: alongDomain, z: line - 1 };
  const right = vertical ? { x: line, z: alongDomain } : { x: alongDomain, z: line };
  const fixed = topologyLinePosition(ctx.seed, vertical ? 'x' : 'z', line * DOMAIN_FINE_SPANS);
  const start = topologyLinePosition(ctx.seed, vertical ? 'z' : 'x', alongDomain * DOMAIN_FINE_SPANS);
  const end = topologyLinePosition(ctx.seed, vertical ? 'z' : 'x', (alongDomain + 1) * DOMAIN_FINE_SPANS);
  const mid = (start + end) / 2;
  const worldX = vertical ? fixed : mid;
  const worldZ = vertical ? mid : fixed;
  const influence = sampleGen3RegionInfluence(ctx.seed, worldX, worldZ, ctx.worldDay, ctx.exposure, ctx.tuning);
  const key = `seam:${boundaryAxis}:${line}:${alongDomain}`;
  const parentLeft = domainParent(ctx.seed, left);
  const parentRight = domainParent(ctx.seed, right);
  const mandatory = sameDomain(parentLeft, right) || sameDomain(parentRight, left);
  const omitted = influence.pillarDepth > 0.55
    && unitFloat(`${ctx.seed}:gen3-v5:pillar-seam-open:${key}`) < clamp01((influence.pillarDepth - 0.55) / 0.45 * 0.94);
  const length = end - start;
  const connected = mandatory || unitFloat(`${ctx.seed}:gen3-v5:seam-connect:${key}`) < 0.85;
  const selected = portalWidth(ctx.seed, key, length);
  const margin = selected.width / 2 + 0.7;
  const available = Math.max(0, length - margin * 2);
  const center = available > 0
    ? start + margin + available * (0.18 + unitFloat(`${ctx.seed}:gen3-v5:seam-center:${key}`) * 0.64)
    : (start + end) / 2;
  const portal: TopologyPortal | undefined = connected
    ? { id: stableId('gen3-v5-seam-portal', ctx.seed, key), kind: selected.kind, width: selected.width, center, mandatory }
    : undefined;
  const extraPortals: TopologyPortal[] = [];
  const optionalChance = mandatory ? 0.22 : 0.14;
  if (connected && portal && unitFloat(`${ctx.seed}:gen3-v5:seam-extra:${key}`) < optionalChance) {
    const extraWidth = portalWidth(ctx.seed, `${key}:extra`, length);
    const extraCenter = start + length * (unitFloat(`${ctx.seed}:gen3-v5:seam-extra-center:${key}`) < 0.5 ? 0.30 : 0.70);
    if (Math.abs(extraCenter - center) > extraWidth.width + selected.width / 2 + 1.5) {
      extraPortals.push({
        id: stableId('gen3-v5-seam-portal', ctx.seed, `${key}:extra`),
        kind: extraWidth.kind,
        width: extraWidth.width,
        center: Math.max(start + extraWidth.width / 2 + 0.5, Math.min(end - extraWidth.width / 2 - 0.5, extraCenter)),
        mandatory: false
      });
    }
  }
  const materialId: MaterialId = influence.arch > 0.28 ? 'arch-pale-wallpaper' : 'level-0-wallpaper';
  return {
    id: stableId('gen3-v5-seam', ctx.seed, key),
    runAxis: vertical ? 'z' : 'x',
    fixed,
    start,
    end,
    portal,
    extraPortals,
    arch: false,
    materialId,
    omitted: omitted && !mandatory
  };
}

function alignArchPortal(wall: TopologyWall, portal: TopologyPortal): TopologyPortal {
  const bay = 4.55 + unitFloat(`${wall.id}:bay`) * 0.70;
  const phase = wall.start + bay / 2;
  const index = Math.round((portal.center - phase) / bay);
  const center = Math.max(
    wall.start + portal.width / 2 + 0.35,
    Math.min(wall.end - portal.width / 2 - 0.35, phase + index * bay)
  );
  return { ...portal, center };
}

export function routeReservationEnvelope(wall: TopologyWall, portal: TopologyPortal): RouteReservationEnvelope {
  const alongHalf = portal.width / 2 + ROUTE_RESERVATION_PLAYER_MARGIN;
  if (wall.runAxis === 'x') {
    return {
      wallId: wall.id,
      portalId: portal.id,
      minX: portal.center - alongHalf,
      maxX: portal.center + alongHalf,
      minZ: wall.fixed - ROUTE_RESERVATION_LANDING_DEPTH,
      maxZ: wall.fixed + ROUTE_RESERVATION_LANDING_DEPTH
    };
  }
  return {
    wallId: wall.id,
    portalId: portal.id,
    minX: wall.fixed - ROUTE_RESERVATION_LANDING_DEPTH,
    maxX: wall.fixed + ROUTE_RESERVATION_LANDING_DEPTH,
    minZ: portal.center - alongHalf,
    maxZ: portal.center + alongHalf
  };
}

function portalsForWall(wall: TopologyWall): TopologyPortal[] {
  const portals = [...(wall.portal ? [wall.portal] : []), ...wall.extraPortals];
  return wall.arch ? portals.map((portal) => alignArchPortal(wall, portal)) : portals;
}

function reservationsForWalls(walls: readonly TopologyWall[]): RouteReservationEnvelope[] {
  return walls.flatMap((wall) => portalsForWall(wall).map((portal) => routeReservationEnvelope(wall, portal)));
}

function reservationCutForWall(target: TopologyWall, reservation: RouteReservationEnvelope): [number, number] | undefined {
  if (reservation.wallId === target.id) return undefined;
  if (target.runAxis === 'x') {
    if (target.fixed < reservation.minZ || target.fixed > reservation.maxZ) return undefined;
    const start = Math.max(target.start, reservation.minX);
    const end = Math.min(target.end, reservation.maxX);
    return end - start > 0.02 ? [start, end] : undefined;
  }
  if (target.fixed < reservation.minX || target.fixed > reservation.maxX) return undefined;
  const start = Math.max(target.start, reservation.minZ);
  const end = Math.min(target.end, reservation.maxZ);
  return end - start > 0.02 ? [start, end] : undefined;
}

function ownPortalCuts(portals: readonly TopologyPortal[]): Array<[number, number]> {
  return portals.map((portal) => [portal.center - portal.width / 2, portal.center + portal.width / 2]);
}

function addArchWall(
  output: WallSpec[],
  ctx: DomainContext,
  cellX: number,
  cellZ: number,
  wall: TopologyWall,
  externalCuts: readonly [number, number][]
): void {
  const portals = portalsForWall(wall);
  const routeCuts = ownPortalCuts(portals);
  const add = (
    id: string,
    start: number,
    end: number,
    y: number,
    height: number,
    cuts: readonly [number, number][]
  ): void => {
    for (const [a, b] of subtractIntervals(start, end, [...cuts, ...externalCuts])) {
      pushClippedWall(output, ctx.seed, cellX, cellZ, `${wall.id}:${id}`, wall.runAxis, wall.fixed, a, b, y, height, 'arch-pale-wallpaper');
    }
  };

  // Semantic/collision structure stays deliberately small. Curved intrados are
  // render-only geometry in dev6FollowupPresentation.ts, so they cannot inflate
  // wall/collider budgets again.
  add('lower', wall.start, wall.end, ARCH_LOWER_HEIGHT / 2, ARCH_LOWER_HEIGHT, routeCuts);
  add('header', wall.start, wall.end, WALL_HEIGHT - ARCH_HEADER_HEIGHT / 2, ARCH_HEADER_HEIGHT, []);

  const bay = 4.55 + unitFloat(`${wall.id}:bay`) * 0.70;
  const pierHeight = WALL_HEIGHT - ARCH_HEADER_HEIGHT - ARCH_LOWER_HEIGHT;
  const pierY = ARCH_LOWER_HEIGHT + pierHeight / 2;
  let pierIndex = 0;
  for (let center = wall.start + bay; center < wall.end - 0.12; center += bay) {
    add(`pier:${pierIndex++}`, center - ARCH_PIER_WIDTH / 2, center + ARCH_PIER_WIDTH / 2, pierY, pierHeight, []);
  }

  const termination = Math.min(0.56, (wall.end - wall.start) * 0.08);
  add('term-start', wall.start, wall.start + termination, WALL_HEIGHT / 2, WALL_HEIGHT, []);
  add('term-end', wall.end - termination, wall.end, WALL_HEIGHT / 2, WALL_HEIGHT, []);
}

function pillarCutsForWall(
  cellX: number,
  cellZ: number,
  wall: TopologyWall,
  pillars: readonly PropSpec[]
): Array<[number, number]> {
  const centerX = cellX * CELL_SIZE;
  const centerZ = cellZ * CELL_SIZE;
  const cuts: Array<[number, number]> = [];
  for (const prop of pillars) {
    if (prop.kind !== 'column') continue;
    const worldX = centerX + prop.position.x;
    const worldZ = centerZ + prop.position.z;
    const halfX = prop.scale.x / 2 + WALL_THICKNESS / 2 + 0.12;
    const halfZ = prop.scale.z / 2 + WALL_THICKNESS / 2 + 0.12;
    if (wall.runAxis === 'x') {
      if (Math.abs(worldZ - wall.fixed) > halfZ || worldX + halfX <= wall.start || worldX - halfX >= wall.end) continue;
      cuts.push([worldX - halfX, worldX + halfX]);
    } else {
      if (Math.abs(worldX - wall.fixed) > halfX || worldZ + halfZ <= wall.start || worldZ - halfZ >= wall.end) continue;
      cuts.push([worldZ - halfZ, worldZ + halfZ]);
    }
  }
  return cuts;
}

function portalLandingCuts(
  target: TopologyWall,
  reservations: readonly RouteReservationEnvelope[]
): Array<[number, number]> {
  const cuts: Array<[number, number]> = [];
  for (const reservation of reservations) {
    const cut = reservationCutForWall(target, reservation);
    if (cut) cuts.push(cut);
  }
  return cuts;
}

function addNormalWall(
  output: WallSpec[],
  ctx: DomainContext,
  cellX: number,
  cellZ: number,
  wall: TopologyWall,
  externalCuts: readonly [number, number][]
): void {
  const cuts = [...ownPortalCuts(portalsForWall(wall)), ...externalCuts];
  for (const [a, b] of subtractIntervals(wall.start, wall.end, cuts)) {
    pushClippedWall(output, ctx.seed, cellX, cellZ, wall.id, wall.runAxis, wall.fixed, a, b, WALL_HEIGHT / 2, WALL_HEIGHT, wall.materialId);
  }
}

function boundsOverlap(
  left: { minX: number; maxX: number; minZ: number; maxZ: number },
  right: { minX: number; maxX: number; minZ: number; maxZ: number }
): boolean {
  return left.maxX > right.minX && left.minX < right.maxX && left.maxZ > right.minZ && left.minZ < right.maxZ;
}

function pillarBounds(worldX: number, worldZ: number, size: number): { minX: number; maxX: number; minZ: number; maxZ: number } {
  return {
    minX: worldX - size / 2,
    maxX: worldX + size / 2,
    minZ: worldZ - size / 2,
    maxZ: worldZ + size / 2
  };
}

function expandedTopologyWallBounds(wall: TopologyWall): { minX: number; maxX: number; minZ: number; maxZ: number } {
  if (wall.runAxis === 'x') {
    return {
      minX: wall.start - PILLAR_WALL_CLEARANCE,
      maxX: wall.end + PILLAR_WALL_CLEARANCE,
      minZ: wall.fixed - WALL_THICKNESS / 2 - PILLAR_WALL_CLEARANCE,
      maxZ: wall.fixed + WALL_THICKNESS / 2 + PILLAR_WALL_CLEARANCE
    };
  }
  return {
    minX: wall.fixed - WALL_THICKNESS / 2 - PILLAR_WALL_CLEARANCE,
    maxX: wall.fixed + WALL_THICKNESS / 2 + PILLAR_WALL_CLEARANCE,
    minZ: wall.start - PILLAR_WALL_CLEARANCE,
    maxZ: wall.end + PILLAR_WALL_CLEARANCE
  };
}

function pillarClearOfTopologyWalls(worldX: number, worldZ: number, size: number, walls: readonly TopologyWall[]): boolean {
  const bounds = pillarBounds(worldX, worldZ, size);
  return walls.every((wall) => !boundsOverlap(bounds, expandedTopologyWallBounds(wall)));
}

function nudgePillarIntoRoom(
  ctx: DomainContext,
  key: string,
  baseWorldX: number,
  baseWorldZ: number,
  size: number,
  walls: readonly TopologyWall[]
): { worldX: number; worldZ: number } {
  let worldX = baseWorldX;
  let worldZ = baseWorldZ;
  const required = size / 2 + WALL_THICKNESS / 2 + PILLAR_WALL_CLEARANCE;

  for (let pass = 0; pass < PILLAR_ROOM_NUDGE_PASSES; pass += 1) {
    let moved = false;
    for (const wall of walls) {
      const bounds = pillarBounds(worldX, worldZ, size);
      if (!boundsOverlap(bounds, expandedTopologyWallBounds(wall))) continue;
      if (wall.runAxis === 'x') {
        const distance = worldZ - wall.fixed;
        const direction = Math.abs(distance) > 0.0001
          ? Math.sign(distance)
          : (unitFloat(`${ctx.seed}:gen3-pillar-room-side:${key}:z:${wall.id}`) < 0.5 ? -1 : 1);
        worldZ += direction * (Math.max(0, required - Math.abs(distance)) + PILLAR_ROOM_NUDGE_MARGIN);
      } else {
        const distance = worldX - wall.fixed;
        const direction = Math.abs(distance) > 0.0001
          ? Math.sign(distance)
          : (unitFloat(`${ctx.seed}:gen3-pillar-room-side:${key}:x:${wall.id}`) < 0.5 ? -1 : 1);
        worldX += direction * (Math.max(0, required - Math.abs(distance)) + PILLAR_ROOM_NUDGE_MARGIN);
      }
      moved = true;
    }
    if (!moved) break;
  }
  return { worldX, worldZ };
}

function addPillars(
  ctx: DomainContext,
  cellX: number,
  cellZ: number,
  topologyWalls: readonly TopologyWall[],
  reservations: readonly RouteReservationEnvelope[],
  output: PropSpec[]
): { count: number; deepSamples: number } {
  const half = CELL_SIZE / 2;
  const centerX = cellX * CELL_SIZE;
  const centerZ = cellZ * CELL_SIZE;
  const offsetX = unitFloat(`${ctx.seed}:gen3-pillar-offset:x`) * PILLAR_SPACING;
  const offsetZ = unitFloat(`${ctx.seed}:gen3-pillar-offset:z`) * PILLAR_SPACING;
  let count = 0;
  let deepSamples = 0;

  for (let gridX = Math.floor((centerX - half - offsetX) / PILLAR_SPACING) - 1; gridX <= Math.ceil((centerX + half - offsetX) / PILLAR_SPACING) + 1; gridX += 1) {
    for (let gridZ = Math.floor((centerZ - half - offsetZ) / PILLAR_SPACING) - 1; gridZ <= Math.ceil((centerZ + half - offsetZ) / PILLAR_SPACING) + 1; gridZ += 1) {
      const baseWorldX = gridX * PILLAR_SPACING + offsetX;
      const baseWorldZ = gridZ * PILLAR_SPACING + offsetZ;
      if (
        baseWorldX < centerX - half + 0.75 || baseWorldX > centerX + half - 0.75
        || baseWorldZ < centerZ - half + 0.75 || baseWorldZ > centerZ + half - 0.75
      ) continue;
      const influence = sampleGen3RegionInfluence(ctx.seed, baseWorldX, baseWorldZ, ctx.worldDay, ctx.exposure, ctx.tuning);
      if (influence.arch > 0.28) continue;
      const key = `${gridX}:${gridZ}`;
      const ordinary = influence.pillar < 0.08;
      if (ordinary && unitFloat(`${ctx.seed}:gen3-v4:ordinary-pillar:${key}`) > 0.018) continue;
      if (influence.pillarDepth > 0.78) deepSamples += 1;
      const keepChance = ordinary
        ? 0.8
        : clamp01(
          0.015
          + influence.pillar * 0.08
          + influence.pillarDepth * 0.88
          + influence.deepPillar * 0.20
          + Math.max(unitFloat(`${ctx.seed}:row:${gridZ}`), unitFloat(`${ctx.seed}:col:${gridX}`)) * 0.05
        );
      if (unitFloat(`${ctx.seed}:gen3-v5:pillar:${key}`) > keepChance) continue;
      const size = PILLAR_MIN_WIDTH + unitFloat(`${ctx.seed}:gen3-pillar:${key}:size`) * (PILLAR_MAX_WIDTH - PILLAR_MIN_WIDTH);
      const resolved = ordinary
        ? { worldX: baseWorldX, worldZ: baseWorldZ }
        : nudgePillarIntoRoom(ctx, key, baseWorldX, baseWorldZ, size, topologyWalls);
      const { worldX, worldZ } = resolved;
      if (
        worldX < centerX - half + 0.75 || worldX > centerX + half - 0.75
        || worldZ < centerZ - half + 0.75 || worldZ > centerZ + half - 0.75
      ) continue;
      const bounds = pillarBounds(worldX, worldZ, size);
      if (reservations.some((reservation) => boundsOverlap(bounds, reservation))) continue;
      if (!ordinary && !pillarClearOfTopologyWalls(worldX, worldZ, size, topologyWalls)) continue;
      output.push({
        id: stableId('gen3-pillar', ctx.seed, key),
        kind: 'column',
        position: { x: worldX - centerX, y: WALL_HEIGHT / 2, z: worldZ - centerZ },
        scale: { x: size, y: WALL_HEIGHT, z: size },
        solid: true,
        materialId: 'level-0-wallpaper'
      });
      count += 1;
    }
  }
  return { count, deepSamples };
}

function relevantDomains(seed: string, cellX: number, cellZ: number): Array<{ x: number; z: number }> {
  const centerX = cellX * CELL_SIZE;
  const centerZ = cellZ * CELL_SIZE;
  const approximateX = Math.floor(centerX / (8.4 * DOMAIN_MAJOR_SPANS));
  const approximateZ = Math.floor(centerZ / (8.4 * DOMAIN_MAJOR_SPANS));
  const half = CELL_SIZE / 2;
  const result: Array<{ x: number; z: number }> = [];
  for (let domainX = approximateX - 2; domainX <= approximateX + 2; domainX += 1) {
    for (let domainZ = approximateZ - 2; domainZ <= approximateZ + 2; domainZ += 1) {
      const bounds = domainWorldBounds(seed, domainX, domainZ);
      if (
        bounds.maxX < centerX - half - 0.5 || bounds.minX > centerX + half + 0.5
        || bounds.maxZ < centerZ - half - 0.5 || bounds.minZ > centerZ + half + 0.5
      ) continue;
      result.push({ x: domainX, z: domainZ });
    }
  }
  return result;
}

function collectTopologyWalls(ctx: DomainContext, cellX: number, cellZ: number): TopologyWall[] {
  const domains = relevantDomains(ctx.seed, cellX, cellZ);
  const half = CELL_SIZE / 2;
  const clip = {
    minX: cellX * CELL_SIZE - half - 0.35,
    maxX: cellX * CELL_SIZE + half + 0.35,
    minZ: cellZ * CELL_SIZE - half - 0.35,
    maxZ: cellZ * CELL_SIZE + half + 0.35
  };
  const topologyWalls: TopologyWall[] = [];
  for (const domain of domains) topologyWalls.push(...generateTopologyDomainSlice(ctx, domain.x, domain.z, clip));

  const seamKeys = new Set<string>();
  for (const domain of domains) {
    seamKeys.add(`x:${domain.x}:${domain.z}`);
    seamKeys.add(`x:${domain.x + 1}:${domain.z}`);
    seamKeys.add(`z:${domain.z}:${domain.x}`);
    seamKeys.add(`z:${domain.z + 1}:${domain.x}`);
  }
  for (const key of seamKeys) {
    const [axisRaw, lineRaw, alongRaw] = key.split(':');
    const seam = topologySeamWall(ctx, axisRaw as 'x' | 'z', Number(lineRaw), Number(alongRaw));
    if (!seam.omitted) topologyWalls.push(seam);
  }
  const unique = new Map<string, TopologyWall>();
  for (const wall of topologyWalls) unique.set(wall.id, wall);
  return [...unique.values()];
}

export function routeReservationEnvelopesForCell(options: {
  seed: string;
  cellX: number;
  cellZ: number;
  worldDay: number;
  exposure: number;
  tuning: WorldTuning;
}): RouteReservationEnvelope[] {
  const ctx: DomainContext = {
    seed: options.seed,
    worldDay: options.worldDay,
    exposure: options.exposure,
    tuning: options.tuning
  };
  return reservationsForWalls(collectTopologyWalls(ctx, options.cellX, options.cellZ));
}

export function generateSpaceTopologyArchitecture(options: {
  seed: string;
  cellX: number;
  cellZ: number;
  worldDay: number;
  exposure: number;
  tuning: WorldTuning;
}): Gen3ArchitectureResult {
  const ctx: DomainContext = {
    seed: options.seed,
    worldDay: options.worldDay,
    exposure: options.exposure,
    tuning: options.tuning
  };
  const walls: WallSpec[] = [];
  const props: PropSpec[] = [];
  const topologyWalls = collectTopologyWalls(ctx, options.cellX, options.cellZ);
  const reservations = reservationsForWalls(topologyWalls);
  const archIds = new Set<string>();
  const pillar = addPillars(ctx, options.cellX, options.cellZ, topologyWalls, reservations, props);
  for (const wall of topologyWalls) {
    const externalCuts = [
      ...pillarCutsForWall(options.cellX, options.cellZ, wall, props),
      ...portalLandingCuts(wall, reservations)
    ];
    if (wall.arch) {
      archIds.add(wall.id);
      addArchWall(walls, ctx, options.cellX, options.cellZ, wall, externalCuts);
    } else {
      addNormalWall(walls, ctx, options.cellX, options.cellZ, wall, externalCuts);
    }
  }
  return {
    walls,
    props,
    archDividerIds: [...archIds].sort(),
    irregularArchDividerIds: [],
    pillarCount: pillar.count,
    deepPillarSamples: pillar.deepSamples
  };
}
