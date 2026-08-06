import { stableId, unitFloat } from './hash.js';
import { CELL_SIZE, WALL_HEIGHT, type LightGroupSpec, type LightState, type PropSpec, type SpatialProfile, type ZoneId } from './types.js';

interface Bounds { minX: number; maxX: number; minZ: number; maxZ: number; }

function propBounds(prop: PropSpec, padding = 0.75): Bounds {
  const rotated = Math.abs((prop.rotationY ?? 0) % 180) > 45;
  const sx = rotated ? prop.scale.z : prop.scale.x;
  const sz = rotated ? prop.scale.x : prop.scale.z;
  return {
    minX: prop.position.x - sx / 2 - padding,
    maxX: prop.position.x + sx / 2 + padding,
    minZ: prop.position.z - sz / 2 - padding,
    maxZ: prop.position.z + sz / 2 + padding
  };
}

export function lightFixturePositions(group: LightGroupSpec): Array<{ x: number; z: number }> {
  const result: Array<{ x: number; z: number }> = [];
  const start = -((group.fixtureCount - 1) * group.spacing) / 2;
  for (let index = 0; index < group.fixtureCount; index += 1) {
    const offset = start + index * group.spacing;
    result.push(group.axis === 'x'
      ? { x: group.position.x + offset, z: group.position.z }
      : { x: group.position.x, z: group.position.z + offset });
  }
  return result;
}

function positionClear(group: LightGroupSpec, props: readonly PropSpec[]): boolean {
  const occupied = props.filter((prop) => prop.solid || prop.kind === 'column' || prop.kind === 'arch-segment').map((prop) => propBounds(prop));
  return lightFixturePositions(group).every((fixture) => occupied.every((bounds) => fixture.x < bounds.minX || fixture.x > bounds.maxX || fixture.z < bounds.minZ || fixture.z > bounds.maxZ));
}

function chooseState(key: string, zoneId: ZoneId): LightState {
  const roll = unitFloat(`${key}:state`);
  if (zoneId === 'manila') return roll < 0.08 ? 'flicker' : 'on';
  if (zoneId === 'blackout') return roll < 0.68 ? 'off' : roll < 0.92 ? 'flicker' : 'on';
  if (zoneId === 'holes') return roll < 0.2 ? 'off' : roll < 0.43 ? 'flicker' : 'on';
  return roll < 0.08 ? 'off' : roll < 0.24 ? 'flicker' : 'on';
}

export function generateLightGroups(options: {
  seed: string;
  x: number;
  z: number;
  shiftEpoch: number;
  zoneId: ZoneId;
  spatialProfile: SpatialProfile;
  ceilingPattern: number;
  props: readonly PropSpec[];
}): LightGroupSpec[] {
  const { seed, x, z, shiftEpoch, zoneId, spatialProfile, ceilingPattern, props } = options;
  const key = `${seed}:lights:${x}:${z}:${shiftEpoch}`;
  const axis: 'x' | 'z' = ceilingPattern % 2 === 0 ? 'x' : 'z';
  const desired = spatialProfile === 'thin-channel' ? 2 : spatialProfile === 'pillar-expanse' ? 4 : spatialProfile === 'sparse-vista' ? 2 : 3;
  const candidates: Array<{ x: number; z: number }> = spatialProfile === 'thin-channel'
    ? [{ x: 0, z: -3.7 }, { x: 0, z: 3.7 }, { x: 0, z: 0 }]
    : spatialProfile === 'pillar-expanse'
      ? [{ x: -3.8, z: -3.8 }, { x: 3.8, z: -3.8 }, { x: -3.8, z: 3.8 }, { x: 3.8, z: 3.8 }, { x: 0, z: 0 }]
      : [{ x: -3.5, z: -2.5 }, { x: 3.5, z: 2.5 }, { x: -3.5, z: 2.5 }, { x: 3.5, z: -2.5 }, { x: 0, z: 0 }];
  const result: LightGroupSpec[] = [];
  for (let index = 0; index < candidates.length && result.length < desired; index += 1) {
    const base = candidates[index]!;
    const groupKey = `${key}:${index}`;
    const group: LightGroupSpec = {
      id: stableId('light-group', seed, x, z, shiftEpoch, index),
      position: { x: base.x, y: WALL_HEIGHT - 0.09, z: base.z },
      axis: spatialProfile === 'thin-channel' ? 'z' : axis,
      fixtureCount: spatialProfile === 'thin-channel' ? 1 : spatialProfile === 'sparse-vista' ? 2 : 1 + (unitFloat(`${groupKey}:fixtures`) > 0.7 ? 1 : 0),
      spacing: 2.15,
      state: chooseState(groupKey, zoneId),
      intensity: 0.7 + unitFloat(`${groupKey}:intensity`) * 0.45,
      temperature: 0.84 + unitFloat(`${groupKey}:temperature`) * 0.22,
      flickerRate: 2.2 + unitFloat(`${groupKey}:rate`) * 4.2,
      phase: unitFloat(`${groupKey}:phase`)
    };
    if (positionClear(group, props)) result.push(group);
  }
  return result;
}

export function lightFlickerValue(group: LightGroupSpec, elapsedSeconds: number, reducedFlicker: boolean): number {
  if (group.state === 'off') return 0;
  if (group.state === 'on' || reducedFlicker) return 1;
  const tick = Math.floor((elapsedSeconds + group.phase * 7) * group.flickerRate);
  const value = unitFloat(`${group.id}:flicker:${tick}`);
  if (value < 0.16) return 0.04;
  if (value < 0.29) return 0.35;
  return 0.86 + unitFloat(`${group.id}:flicker-bright:${tick}`) * 0.14;
}

export function validateLightClearance(groups: readonly LightGroupSpec[], props: readonly PropSpec[]): string[] {
  const errors: string[] = [];
  for (const group of groups) if (!positionClear(group, props)) errors.push(`Light ${group.id} intersects room geometry`);
  return errors;
}

export interface LightFieldSample {
  energy: number;
  activeGroups: number;
  flickerGroups: number;
  flickerPulse: number;
  temperature: number;
}

export const LIGHT_AUDIO_RADIUS = CELL_SIZE * 2.7;
