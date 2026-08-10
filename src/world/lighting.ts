import { stableId, unitFloat } from './hash.js';
import {
  CELL_SIZE,
  WALL_HEIGHT,
  type LightGroupSpec,
  type LightState,
  type PropSpec,
  type RoomArchetype,
  type WallSpec,
  type ZoneId
} from './types.js';

const FIXTURE_LENGTH = 2.2;
const FIXTURE_WIDTH = 0.38;
const FIXTURE_CLEARANCE = 0.08;
const CEILING_REACH_MARGIN = 0.48;

export const LIGHT_FIELD_RADIUS = CELL_SIZE * 2.7;
export const LIGHT_FIELD_UPDATE_INTERVAL = 0.1;
export const BASELINE_OFF_CHANCE = 0.002;
export const BASELINE_FLICKER_CHANCE = 0.018;

interface Bounds { minX: number; maxX: number; minZ: number; maxZ: number; }

export interface LightFieldSource {
  cellX: number;
  cellZ: number;
  group: LightGroupSpec;
}

export interface LightFieldSample {
  energy: number;
  activeGroups: number;
  flickerGroups: number;
  nearbyGroups: number;
  flickerPulse: number;
  temperature: number;
}

function wallBounds(wall: WallSpec): Bounds {
  return {
    minX: wall.cx - wall.sx / 2 - FIXTURE_CLEARANCE,
    maxX: wall.cx + wall.sx / 2 + FIXTURE_CLEARANCE,
    minZ: wall.cz - wall.sz / 2 - FIXTURE_CLEARANCE,
    maxZ: wall.cz + wall.sz / 2 + FIXTURE_CLEARANCE
  };
}

function propBounds(prop: PropSpec): Bounds {
  const rotated = Math.abs((prop.rotationY ?? 0) % 180) > 45;
  const sx = rotated ? prop.scale.z : prop.scale.x;
  const sz = rotated ? prop.scale.x : prop.scale.z;
  return {
    minX: prop.position.x - sx / 2 - FIXTURE_CLEARANCE,
    maxX: prop.position.x + sx / 2 + FIXTURE_CLEARANCE,
    minZ: prop.position.z - sz / 2 - FIXTURE_CLEARANCE,
    maxZ: prop.position.z + sz / 2 + FIXTURE_CLEARANCE
  };
}

function fixtureBounds(position: { x: number; z: number }, rotationY: 0 | 90): Bounds {
  const sx = rotationY === 90 ? FIXTURE_WIDTH : FIXTURE_LENGTH;
  const sz = rotationY === 90 ? FIXTURE_LENGTH : FIXTURE_WIDTH;
  return {
    minX: position.x - sx / 2,
    maxX: position.x + sx / 2,
    minZ: position.z - sz / 2,
    maxZ: position.z + sz / 2
  };
}

function overlaps(a: Bounds, b: Bounds): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

function reachesCeiling(prop: PropSpec): boolean {
  if (prop.kind === 'ceiling-gap') return true;
  return prop.position.y + prop.scale.y / 2 >= WALL_HEIGHT - CEILING_REACH_MARGIN;
}

export function fixturePositionClear(
  position: { x: number; z: number },
  rotationY: 0 | 90,
  walls: readonly WallSpec[],
  props: readonly PropSpec[]
): boolean {
  const candidate = fixtureBounds(position, rotationY);
  if (walls.some((wall) => overlaps(candidate, wallBounds(wall)))) return false;
  return props.filter(reachesCeiling).every((prop) => !overlaps(candidate, propBounds(prop)));
}

export function lightInstability(zoneId: ZoneId, shiftEpoch: number): number {
  const zoneBase: Record<ZoneId, number> = {
    baseline: 0,
    arch: 0.04,
    pillar: 0.18,
    blackout: 0.82,
    holes: 0.48,
    manila: 0,
    'exit-threshold': 0.08
  };
  return Math.max(0, Math.min(1, zoneBase[zoneId] + Math.max(0, shiftEpoch) * 0.11));
}

export function lightStateThresholds(instability: number): { off: number; unstable: number } {
  const bounded = Math.max(0, Math.min(1, instability));
  const off = BASELINE_OFF_CHANCE + 0.48 * bounded * bounded;
  const flicker = BASELINE_FLICKER_CHANCE + 0.26 * bounded;
  return { off, unstable: Math.min(0.96, off + flicker) };
}

export function lightStateForInstability(key: string, instability: number): LightState {
  const roll = unitFloat(`${key}:state`);
  const thresholds = lightStateThresholds(instability);
  if (roll < thresholds.off) return 'off';
  if (roll < thresholds.unstable) return 'flicker';
  return 'on';
}

function fixtureCandidates(archetype: RoomArchetype, zoneId: ZoneId): Array<Array<{ x: number; z: number }>> {
  if (archetype.includes('corridor') || archetype === 'narrow-hall') {
    return [
      [{ x: 0, z: -3.8 }, { x: 0, z: 0 }],
      [{ x: 0, z: 3.8 }]
    ];
  }
  if (zoneId === 'pillar') {
    return [
      [{ x: -4.3, z: -4.3 }, { x: 0, z: -4.3 }, { x: 4.3, z: -4.3 }],
      [{ x: -4.3, z: 4.3 }, { x: 0, z: 4.3 }, { x: 4.3, z: 4.3 }]
    ];
  }
  return [
    [{ x: -3.4, z: -2.4 }, { x: -3.4, z: 2.4 }],
    [{ x: 3.4, z: -2.4 }, { x: 3.4, z: 2.4 }]
  ];
}

export function generateLightGroups(options: {
  seed: string;
  x: number;
  z: number;
  shiftEpoch: number;
  zoneId: ZoneId;
  roomArchetype: RoomArchetype;
  ceilingPattern: number;
  walls: readonly WallSpec[];
  props: readonly PropSpec[];
}): LightGroupSpec[] {
  const { seed, x, z, shiftEpoch, zoneId, roomArchetype, ceilingPattern, walls, props } = options;
  const rotationY: 0 | 90 = ceilingPattern % 2 === 0 ? 0 : 90;
  const groups: LightGroupSpec[] = [];
  const instability = lightInstability(zoneId, shiftEpoch);

  fixtureCandidates(roomArchetype, zoneId).forEach((candidates, groupIndex) => {
    const fixtures = candidates
      .filter((position) => fixturePositionClear(position, rotationY, walls, props))
      .map((position) => ({ x: position.x, y: WALL_HEIGHT - 0.08, z: position.z }));
    if (fixtures.length === 0) return;
    const id = stableId('light-group', seed, x, z, shiftEpoch, zoneId, roomArchetype, groupIndex);
    // Deliberately exclude shiftEpoch from the stability roll. When instability rises, thresholds expand over
    // the same deterministic roll, so a group may degrade on -> flicker -> off but never become healthier.
    const stabilityKey = stableId('light-stability', seed, x, z, zoneId, roomArchetype, groupIndex);
    groups.push({
      id,
      fixtures,
      rotationY,
      state: lightStateForInstability(stabilityKey, instability),
      intensity: 0.78 + unitFloat(`${id}:intensity`) * 0.34,
      temperature: 0.86 + unitFloat(`${id}:temperature`) * 0.18,
      flickerRate: 2.2 + unitFloat(`${id}:flicker-rate`) * 3.8,
      phase: unitFloat(`${id}:phase`)
    });
  });

  return groups;
}

export function lightFlickerValue(group: LightGroupSpec, elapsedSeconds: number, reducedFlicker: boolean): number {
  if (group.state === 'off') return 0;
  if (group.state === 'on' || reducedFlicker) return 1;
  const tick = Math.floor((elapsedSeconds + group.phase * 5) * group.flickerRate);
  const value = unitFloat(`${group.id}:flicker:${tick}`);
  if (value < 0.13) return 0.04;
  if (value < 0.27) return 0.36;
  return 0.88 + unitFloat(`${group.id}:bright:${tick}`) * 0.12;
}

function groupDistance(source: LightFieldSource, playerX: number, playerZ: number): number {
  const originX = source.cellX * CELL_SIZE;
  const originZ = source.cellZ * CELL_SIZE;
  let best = Number.POSITIVE_INFINITY;
  for (const fixture of source.group.fixtures) {
    best = Math.min(best, Math.hypot(originX + fixture.x - playerX, originZ + fixture.z - playerZ));
  }
  return best;
}

export function sampleLightField(
  sources: readonly LightFieldSource[],
  playerX: number,
  playerZ: number,
  elapsedSeconds: number,
  reducedFlicker: boolean
): LightFieldSample {
  let rawEnergy = 0;
  let activeGroups = 0;
  let flickerGroups = 0;
  let nearbyGroups = 0;
  let flickerPulse = 0;
  let weightedTemperature = 0;

  for (const source of sources) {
    const distance = groupDistance(source, playerX, playerZ);
    if (distance >= LIGHT_FIELD_RADIUS) continue;
    nearbyGroups += 1;
    const attenuation = Math.max(0, 1 - distance / LIGHT_FIELD_RADIUS);
    const value = lightFlickerValue(source.group, elapsedSeconds, reducedFlicker);
    const contribution = value * source.group.intensity * attenuation * attenuation;
    if (value > 0.08) activeGroups += 1;
    if (source.group.state === 'flicker') {
      flickerGroups += 1;
      if (!reducedFlicker) flickerPulse = Math.max(flickerPulse, (1 - value) * attenuation);
    }
    rawEnergy += contribution;
    weightedTemperature += contribution * source.group.temperature;
  }

  const energy = Math.max(0, Math.min(1, 1 - Math.exp(-rawEnergy * 0.42)));
  return {
    energy,
    activeGroups,
    flickerGroups,
    nearbyGroups,
    flickerPulse: Math.max(0, Math.min(1, flickerPulse)),
    temperature: rawEnergy > 0.0001 ? weightedTemperature / rawEnergy : 0.94
  };
}

export function validateLightClearance(groups: readonly LightGroupSpec[], walls: readonly WallSpec[], props: readonly PropSpec[]): string[] {
  const errors: string[] = [];
  for (const group of groups) {
    for (const fixture of group.fixtures) {
      if (!fixturePositionClear(fixture, group.rotationY, walls, props)) errors.push(`Light ${group.id} intersects ceiling-reaching geometry`);
    }
  }
  return errors;
}
