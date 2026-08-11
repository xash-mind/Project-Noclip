import { hashString } from './hash.js';

export const WORLD_FIELD_NAMES = [
  'openness',
  'partitionPressure',
  'axisFlow',
  'roomScale',
  'columnPressure',
  'ceilingVariation',
  'regularity',
  'connectivityPressure',
  'dampness',
  'decay',
  'stability',
  'abnormality',
  'voidPressure',
  'clutterPressure',
  'electricalReliability'
] as const;

export type WorldFieldName = typeof WORLD_FIELD_NAMES[number];
export type GeometryKind = 'euclidean' | 'non-euclidean';

export interface WorldFieldSample extends Record<WorldFieldName, number> {
  geometry: GeometryKind;
}

interface OctaveSpec {
  scaleMeters: number;
  weight: number;
}

const OCTAVES: readonly OctaveSpec[] = [
  { scaleMeters: 168, weight: 0.52 },
  { scaleMeters: 56, weight: 0.31 },
  { scaleMeters: 21, weight: 0.17 }
];

const UINT32_RANGE = 0x100000000;
const X_PRIME = 0x9e3779b1;
const Z_PRIME = 0x85ebca77;
const FIELD_PRIME = 0xc2b2ae3d;
const OCTAVE_PRIME = 0x27d4eb2f;

function mix32(value: number): number {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

function latticeValue(seedHash: number, fieldIndex: number, octaveIndex: number, x: number, z: number): number {
  const mixed = mix32(
    seedHash
      ^ Math.imul(x, X_PRIME)
      ^ Math.imul(z, Z_PRIME)
      ^ Math.imul(fieldIndex + 1, FIELD_PRIME)
      ^ Math.imul(octaveIndex + 1, OCTAVE_PRIME)
  );
  return mixed / UINT32_RANGE;
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function valueNoise(seedHash: number, fieldIndex: number, octaveIndex: number, worldX: number, worldZ: number, scaleMeters: number): number {
  const scaledX = worldX / scaleMeters;
  const scaledZ = worldZ / scaleMeters;
  const x0 = Math.floor(scaledX);
  const z0 = Math.floor(scaledZ);
  const x1 = x0 + 1;
  const z1 = z0 + 1;
  const tx = smoothstep(scaledX - x0);
  const tz = smoothstep(scaledZ - z0);
  const north = lerp(
    latticeValue(seedHash, fieldIndex, octaveIndex, x0, z0),
    latticeValue(seedHash, fieldIndex, octaveIndex, x1, z0),
    tx
  );
  const south = lerp(
    latticeValue(seedHash, fieldIndex, octaveIndex, x0, z1),
    latticeValue(seedHash, fieldIndex, octaveIndex, x1, z1),
    tx
  );
  return lerp(north, south, tz);
}

function sampleScalarField(seedHash: number, fieldIndex: number, worldX: number, worldZ: number): number {
  let value = 0;
  let totalWeight = 0;
  for (let octaveIndex = 0; octaveIndex < OCTAVES.length; octaveIndex += 1) {
    const octave = OCTAVES[octaveIndex]!;
    value += valueNoise(seedHash, fieldIndex, octaveIndex, worldX, worldZ, octave.scaleMeters) * octave.weight;
    totalWeight += octave.weight;
  }
  return Math.max(0, Math.min(1, value / totalWeight));
}

/**
 * Deterministic Generation 3 field sampler.
 *
 * Coordinates are world-space metres rather than Cell coordinates so sampling
 * remains continuous across streaming boundaries. The bounded Generation 3
 * architecture pilot consumes structural channels; other generation paths can
 * continue treating the full sample as read-only diagnostics until migrated.
 */
export function sampleWorldFields(seed: string, worldX: number, worldZ: number): WorldFieldSample {
  const seedHash = hashString(`${seed}:gen3-fields`);
  const values = {} as Record<WorldFieldName, number>;
  for (let fieldIndex = 0; fieldIndex < WORLD_FIELD_NAMES.length; fieldIndex += 1) {
    const name = WORLD_FIELD_NAMES[fieldIndex]!;
    values[name] = sampleScalarField(seedHash, fieldIndex, worldX, worldZ);
  }
  return { ...values, geometry: 'euclidean' };
}

/**
 * Sample only the channels required by a downstream generation layer.
 *
 * This preserves the exact canonical Field values while avoiding the cost of
 * calculating all 15 channels for wider continuity probes that only need a
 * small structural subset.
 */
export function sampleWorldFieldChannels<const Names extends readonly WorldFieldName[]>(
  seed: string,
  worldX: number,
  worldZ: number,
  names: Names
): Record<Names[number], number> {
  const seedHash = hashString(`${seed}:gen3-fields`);
  const values: Partial<Record<WorldFieldName, number>> = {};
  for (const name of names) {
    const fieldIndex = WORLD_FIELD_NAMES.indexOf(name);
    values[name] = sampleScalarField(seedHash, fieldIndex, worldX, worldZ);
  }
  return values as Record<Names[number], number>;
}

export function formatFieldDiagnostics(sample: WorldFieldSample): string[] {
  return [
    `geometry      ${sample.geometry}`,
    `fields A      open ${sample.openness.toFixed(2)} / partition ${sample.partitionPressure.toFixed(2)} / flow ${sample.axisFlow.toFixed(2)} / scale ${sample.roomScale.toFixed(2)}`,
    `fields B      columns ${sample.columnPressure.toFixed(2)} / ceiling ${sample.ceilingVariation.toFixed(2)} / regularity ${sample.regularity.toFixed(2)} / connect ${sample.connectivityPressure.toFixed(2)}`,
    `fields C      damp ${sample.dampness.toFixed(2)} / decay ${sample.decay.toFixed(2)} / stability ${sample.stability.toFixed(2)} / abnormal ${sample.abnormality.toFixed(2)}`,
    `fields D      void ${sample.voidPressure.toFixed(2)} / clutter ${sample.clutterPressure.toFixed(2)} / electric ${sample.electricalReliability.toFixed(2)}`
  ];
}
