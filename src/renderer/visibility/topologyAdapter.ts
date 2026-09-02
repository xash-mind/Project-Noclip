import { archBayProfile, ARCH_PIER_WIDTH } from '../../world/gen3ArchitectureCore.js';
import {
  DOMAIN_FINE_SPANS,
  TOPOLOGY_GRID,
  generateTopologyDomain,
  topologyLinePosition,
  type DomainContext,
  type TopologyPortal,
  type TopologySpace,
  type TopologyWall
} from '../../world/gen3SpaceTopologyDomain.js';
import { routeReservationEnvelope, topologySeamWall } from '../../world/gen3SpaceTopologyBuild.js';
import { CELL_SIZE, type WorldTuning } from '../../world/types.js';
import { prepareVisibilityTopology } from './propagation.js';
import type {
  PreparedVisibilityTopology,
  VisibilityBounds2D,
  VisibilityCellRef,
  VisibilityOpeningKind,
  VisibilityOpeningRef,
  VisibilitySpaceRef,
  VisibilityTopologyConservativeReason
} from './types.js';

const ADJACENCY_EPSILON = 0.04;
const INTERVAL_EPSILON = 0.015;
const ARCH_TERMINATION_MAX = 0.56;

interface SpaceRecord {
  source: TopologySpace;
  bounds: VisibilityBounds2D;
  cellIds: string[];
  selected: boolean;
}

interface OpeningDescriptor {
  id: string;
  wall: TopologyWall;
  start: number;
  end: number;
  kind: VisibilityOpeningKind;
  mandatory: boolean;
  conservative: boolean;
  sourcePortalId?: string;
}

export interface Gen3VisibilityCellInput {
  x: number;
  z: number;
}

export interface BuildGen3VisibilityTopologyOptions {
  seed: string;
  worldDay: number;
  exposure: number;
  tuning: WorldTuning;
  /** Candidate loaded/topology Cells. They remain streaming units, not Spaces. */
  cells: readonly Gen3VisibilityCellInput[];
}

function cellId(x: number, z: number): string {
  return `${x}:${z}`;
}

function cellBounds(x: number, z: number): VisibilityBounds2D {
  const half = CELL_SIZE / 2;
  return {
    minX: x * CELL_SIZE - half,
    maxX: x * CELL_SIZE + half,
    minZ: z * CELL_SIZE - half,
    maxZ: z * CELL_SIZE + half
  };
}

function boundsOverlap(left: VisibilityBounds2D, right: VisibilityBounds2D): boolean {
  return left.maxX > right.minX + INTERVAL_EPSILON
    && left.minX < right.maxX - INTERVAL_EPSILON
    && left.maxZ > right.minZ + INTERVAL_EPSILON
    && left.minZ < right.maxZ - INTERVAL_EPSILON;
}

function spaceWorldBounds(seed: string, space: TopologySpace): VisibilityBounds2D {
  return {
    minX: topologyLinePosition(seed, 'x', space.rect.minX),
    maxX: topologyLinePosition(seed, 'x', space.rect.maxX),
    minZ: topologyLinePosition(seed, 'z', space.rect.minZ),
    maxZ: topologyLinePosition(seed, 'z', space.rect.maxZ)
  };
}

function domainIndex(seed: string, axis: 'x' | 'z', value: number): number {
  let domain = Math.floor(value / (TOPOLOGY_GRID * DOMAIN_FINE_SPANS));
  const boundary = (index: number): number => topologyLinePosition(seed, axis, index * DOMAIN_FINE_SPANS);
  while (boundary(domain) > value) domain -= 1;
  while (boundary(domain + 1) <= value) domain += 1;
  return domain;
}

function alignedPortal(wall: TopologyWall, portal: TopologyPortal): TopologyPortal {
  if (!wall.arch) return { ...portal };
  const pitch = archBayProfile(wall.id).pitch;
  const phase = wall.start + pitch / 2;
  const index = Math.round((portal.center - phase) / pitch);
  const center = Math.max(
    wall.start + portal.width / 2 + 0.35,
    Math.min(wall.end - portal.width / 2 - 0.35, phase + index * pitch)
  );
  return { ...portal, center };
}

function portalsForWall(wall: TopologyWall): TopologyPortal[] {
  return [...(wall.portal ? [wall.portal] : []), ...wall.extraPortals].map((portal) => alignedPortal(wall, portal));
}

function archApertureIntervals(wall: TopologyWall): Array<[number, number]> {
  if (!wall.arch) return [];
  const pitch = archBayProfile(wall.id).pitch;
  const termination = Math.min(ARCH_TERMINATION_MAX, (wall.end - wall.start) * 0.08);
  const limit = wall.end - termination;
  let cursor = wall.start + termination;
  const intervals: Array<[number, number]> = [];
  for (let center = wall.start + pitch; center < wall.end - 0.12; center += pitch) {
    const supportStart = Math.max(cursor, center - ARCH_PIER_WIDTH / 2);
    if (supportStart - cursor > INTERVAL_EPSILON) intervals.push([cursor, supportStart]);
    cursor = Math.max(cursor, center + ARCH_PIER_WIDTH / 2);
  }
  if (limit - cursor > INTERVAL_EPSILON) intervals.push([cursor, limit]);
  return intervals;
}

function reservationCutForWall(
  target: TopologyWall,
  reservation: ReturnType<typeof routeReservationEnvelope>
): [number, number] | undefined {
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

function recordContains(record: SpaceRecord, x: number, z: number, strict: boolean): boolean {
  const epsilon = strict ? 1e-5 : -1e-5;
  return x > record.bounds.minX + epsilon && x < record.bounds.maxX - epsilon
    && z > record.bounds.minZ + epsilon && z < record.bounds.maxZ - epsilon;
}

function findSpaceRecord(records: readonly SpaceRecord[], x: number, z: number): { record?: SpaceRecord; ambiguous: boolean } {
  let matches = records.filter((record) => recordContains(record, x, z, true));
  if (matches.length === 0) matches = records.filter((record) => recordContains(record, x, z, false));
  if (matches.length === 0) return { ambiguous: false };
  matches = [...matches].sort((left, right) => left.source.area - right.source.area || left.source.id.localeCompare(right.source.id));
  return { record: matches[0], ambiguous: matches.length > 1 };
}

function relevantBreakpoints(
  records: readonly SpaceRecord[],
  wall: TopologyWall,
  intervalStart: number,
  intervalEnd: number
): number[] {
  const points = [intervalStart, intervalEnd];
  for (const record of records) {
    const touchesWall = wall.runAxis === 'x'
      ? wall.fixed >= record.bounds.minZ - ADJACENCY_EPSILON && wall.fixed <= record.bounds.maxZ + ADJACENCY_EPSILON
      : wall.fixed >= record.bounds.minX - ADJACENCY_EPSILON && wall.fixed <= record.bounds.maxX + ADJACENCY_EPSILON;
    if (!touchesWall) continue;
    const start = wall.runAxis === 'x' ? record.bounds.minX : record.bounds.minZ;
    const end = wall.runAxis === 'x' ? record.bounds.maxX : record.bounds.maxZ;
    if (start > intervalStart + INTERVAL_EPSILON && start < intervalEnd - INTERVAL_EPSILON) points.push(start);
    if (end > intervalStart + INTERVAL_EPSILON && end < intervalEnd - INTERVAL_EPSILON) points.push(end);
  }
  points.sort((left, right) => left - right);
  return points.filter((point, index) => index === 0 || Math.abs(point - points[index - 1]!) > INTERVAL_EPSILON);
}

function openingSegment(wall: TopologyWall, start: number, end: number): VisibilityOpeningRef['segment'] {
  return wall.runAxis === 'x'
    ? { start: { x: start, z: wall.fixed }, end: { x: end, z: wall.fixed } }
    : { start: { x: wall.fixed, z: start }, end: { x: wall.fixed, z: end } };
}

function adjacentRecords(
  records: readonly SpaceRecord[],
  wall: TopologyWall,
  along: number
): [{ record?: SpaceRecord; ambiguous: boolean }, { record?: SpaceRecord; ambiguous: boolean }] {
  if (wall.runAxis === 'x') {
    return [
      findSpaceRecord(records, along, wall.fixed - ADJACENCY_EPSILON),
      findSpaceRecord(records, along, wall.fixed + ADJACENCY_EPSILON)
    ];
  }
  return [
    findSpaceRecord(records, wall.fixed - ADJACENCY_EPSILON, along),
    findSpaceRecord(records, wall.fixed + ADJACENCY_EPSILON, along)
  ];
}

function addConservativeReason(
  reasons: VisibilityTopologyConservativeReason[],
  keys: Set<string>,
  reason: VisibilityTopologyConservativeReason
): void {
  const key = `${reason.code}|${reason.wallId ?? ''}|${reason.openingId ?? ''}|${reason.detail}`;
  if (keys.has(key)) return;
  keys.add(key);
  reasons.push(reason);
}

function emitOpeningDescriptor(
  descriptor: OpeningDescriptor,
  records: readonly SpaceRecord[],
  openings: VisibilityOpeningRef[],
  conservativeReasons: VisibilityTopologyConservativeReason[],
  conservativeReasonKeys: Set<string>
): void {
  const breakpoints = relevantBreakpoints(records, descriptor.wall, descriptor.start, descriptor.end);
  let segmentIndex = 0;
  for (let index = 0; index < breakpoints.length - 1; index += 1) {
    const start = breakpoints[index]!;
    const end = breakpoints[index + 1]!;
    if (end - start <= INTERVAL_EPSILON) continue;
    const midpoint = (start + end) / 2;
    const [left, right] = adjacentRecords(records, descriptor.wall, midpoint);
    const leftSelected = Boolean(left.record?.selected);
    const rightSelected = Boolean(right.record?.selected);
    if (!left.record || !right.record) {
      if (leftSelected || rightSelected) {
        addConservativeReason(conservativeReasons, conservativeReasonKeys, {
          code: 'scope-edge',
          detail: `opening ${descriptor.id} reaches beyond the supplied topology scope`,
          openingId: descriptor.id,
          wallId: descriptor.wall.id
        });
      }
      continue;
    }
    if (left.record.source.id === right.record.source.id) continue;
    if (!leftSelected || !rightSelected) {
      if (leftSelected || rightSelected) {
        addConservativeReason(conservativeReasons, conservativeReasonKeys, {
          code: 'scope-edge',
          detail: `opening ${descriptor.id} connects a supplied Space to a guard-scope Space`,
          openingId: descriptor.id,
          wallId: descriptor.wall.id
        });
      }
      continue;
    }
    const ambiguous = left.ambiguous || right.ambiguous;
    const fromSpaceId = left.record.source.id < right.record.source.id ? left.record.source.id : right.record.source.id;
    const toSpaceId = left.record.source.id < right.record.source.id ? right.record.source.id : left.record.source.id;
    const id = `${descriptor.id}:segment:${segmentIndex++}:${fromSpaceId}:${toSpaceId}`;
    openings.push({
      id,
      wallId: descriptor.wall.id,
      fromSpaceId,
      toSpaceId,
      kind: descriptor.kind,
      segment: openingSegment(descriptor.wall, start, end),
      width: end - start,
      mandatory: descriptor.mandatory,
      arch: descriptor.wall.arch,
      conservative: descriptor.conservative || ambiguous,
      sourcePortalId: descriptor.sourcePortalId
    });
    if (ambiguous) {
      addConservativeReason(conservativeReasons, conservativeReasonKeys, {
        code: 'ambiguous-adjacency',
        detail: `opening ${id} resolved overlapping Space boundary evidence conservatively`,
        openingId: id,
        wallId: descriptor.wall.id
      });
    }
  }
}

function uniqueWalls(walls: readonly TopologyWall[]): TopologyWall[] {
  const byId = new Map<string, TopologyWall>();
  for (const wall of walls) if (!byId.has(wall.id)) byId.set(wall.id, wall);
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

export function buildGen3VisibilityTopology(options: BuildGen3VisibilityTopologyOptions): PreparedVisibilityTopology {
  const cells: VisibilityCellRef[] = [...options.cells]
    .map(({ x, z }) => ({ id: cellId(x, z), x, z, bounds: cellBounds(x, z) }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const uniqueCells = [...new Map(cells.map((cell) => [cell.id, cell] as const)).values()];
  if (uniqueCells.length === 0) {
    return prepareVisibilityTopology({
      metadata: { source: 'generation-3', seed: options.seed, worldDay: options.worldDay, exposure: options.exposure },
      spaces: [], openings: [], cells: [], conservativeReasons: []
    });
  }

  const scopeBounds = uniqueCells.reduce<VisibilityBounds2D>((bounds, cell) => ({
    minX: Math.min(bounds.minX, cell.bounds.minX),
    maxX: Math.max(bounds.maxX, cell.bounds.maxX),
    minZ: Math.min(bounds.minZ, cell.bounds.minZ),
    maxZ: Math.max(bounds.maxZ, cell.bounds.maxZ)
  }), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
  const minDomainX = domainIndex(options.seed, 'x', scopeBounds.minX) - 1;
  const maxDomainX = domainIndex(options.seed, 'x', scopeBounds.maxX) + 1;
  const minDomainZ = domainIndex(options.seed, 'z', scopeBounds.minZ) - 1;
  const maxDomainZ = domainIndex(options.seed, 'z', scopeBounds.maxZ) + 1;
  const ctx: DomainContext = {
    seed: options.seed,
    worldDay: options.worldDay,
    exposure: options.exposure,
    tuning: options.tuning
  };

  const domains = [];
  for (let domainX = minDomainX; domainX <= maxDomainX; domainX += 1) {
    for (let domainZ = minDomainZ; domainZ <= maxDomainZ; domainZ += 1) {
      domains.push(generateTopologyDomain(ctx, domainX, domainZ));
    }
  }
  const allSourceSpaces = domains.flatMap((domain) => domain.spaces);
  const records: SpaceRecord[] = allSourceSpaces.map((source) => {
    const bounds = spaceWorldBounds(options.seed, source);
    const overlappingCells = uniqueCells.filter((cell) => boundsOverlap(bounds, cell.bounds)).map((cell) => cell.id);
    return { source, bounds, cellIds: overlappingCells, selected: overlappingCells.length > 0 };
  });
  const spaces: VisibilitySpaceRef[] = records
    .filter((record) => record.selected)
    .map((record) => ({ id: record.source.id, bounds: { ...record.bounds }, cellIds: [...record.cellIds].sort() }));

  const internalWalls = domains.flatMap((domain) => domain.walls);
  const seamWalls: TopologyWall[] = [];
  const omittedSeams: TopologyWall[] = [];
  for (let line = minDomainX + 1; line <= maxDomainX; line += 1) {
    for (let along = minDomainZ; along <= maxDomainZ; along += 1) {
      const seam = topologySeamWall(ctx, 'x', line, along);
      if (seam.omitted) omittedSeams.push(seam);
      else seamWalls.push(seam);
    }
  }
  for (let line = minDomainZ + 1; line <= maxDomainZ; line += 1) {
    for (let along = minDomainX; along <= maxDomainX; along += 1) {
      const seam = topologySeamWall(ctx, 'z', line, along);
      if (seam.omitted) omittedSeams.push(seam);
      else seamWalls.push(seam);
    }
  }
  const walls = uniqueWalls([...internalWalls, ...seamWalls]);
  const reservations = walls.flatMap((wall) => portalsForWall(wall).map((portal) => ({
    portal,
    envelope: routeReservationEnvelope(wall, portal)
  })));
  const openings: VisibilityOpeningRef[] = [];
  const conservativeReasons: VisibilityTopologyConservativeReason[] = [];
  const conservativeReasonKeys = new Set<string>();

  for (const wall of walls) {
    for (const portal of portalsForWall(wall)) {
      emitOpeningDescriptor({
        id: portal.id,
        wall,
        start: portal.center - portal.width / 2,
        end: portal.center + portal.width / 2,
        kind: 'portal',
        mandatory: portal.mandatory,
        conservative: false,
        sourcePortalId: portal.id
      }, records, openings, conservativeReasons, conservativeReasonKeys);
    }
    const archIntervals = archApertureIntervals(wall);
    for (let index = 0; index < archIntervals.length; index += 1) {
      const [start, end] = archIntervals[index]!;
      emitOpeningDescriptor({
        id: `${wall.id}:arch-aperture:${index}`,
        wall,
        start,
        end,
        kind: 'arch-aperture',
        mandatory: false,
        // The 2D snapshot deliberately treats the semantic bay between supports
        // as open at observer eye height. This is conservative versus vertical
        // curve/shoulder detail and avoids false-negative A-A1 visibility.
        conservative: true
      }, records, openings, conservativeReasons, conservativeReasonKeys);
    }
    for (const reservation of reservations) {
      const cut = reservationCutForWall(wall, reservation.envelope);
      if (!cut) continue;
      emitOpeningDescriptor({
        id: `${wall.id}:route-clearance:${reservation.portal.id}`,
        wall,
        start: cut[0],
        end: cut[1],
        kind: 'route-clearance',
        mandatory: reservation.portal.mandatory,
        conservative: false,
        sourcePortalId: reservation.portal.id
      }, records, openings, conservativeReasons, conservativeReasonKeys);
    }
  }

  for (const seam of uniqueWalls(omittedSeams)) {
    emitOpeningDescriptor({
      id: `${seam.id}:open-seam`,
      wall: seam,
      start: seam.start,
      end: seam.end,
      kind: 'open-seam',
      mandatory: true,
      conservative: false
    }, records, openings, conservativeReasons, conservativeReasonKeys);
  }

  const deduplicatedOpenings = [...new Map(openings.map((opening) => {
    const start = opening.segment.start;
    const end = opening.segment.end;
    const key = [
      opening.fromSpaceId,
      opening.toSpaceId,
      opening.kind,
      start.x.toFixed(4), start.z.toFixed(4), end.x.toFixed(4), end.z.toFixed(4)
    ].join('|');
    return [key, opening] as const;
  })).values()];

  return prepareVisibilityTopology({
    metadata: {
      source: 'generation-3',
      seed: options.seed,
      worldDay: options.worldDay,
      exposure: options.exposure
    },
    spaces,
    openings: deduplicatedOpenings,
    cells: uniqueCells,
    conservativeReasons
  });
}
