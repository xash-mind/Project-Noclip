import test from 'node:test';
import assert from 'node:assert/strict';
import { GEOGRAPHY_FIELD_NAMES, WORLD_FIELD_NAMES, formatFieldDiagnostics, formatGeographyDiagnostics, sampleWorldFieldChannels, sampleWorldFields, sampleWorldGeography } from '../.test-dist/src/world/fields.js';

const valuesOnly = (sample) => WORLD_FIELD_NAMES.map((name) => sample[name]);

test('Generation 3 fields reproduce exactly for identical seed and coordinates', () => {
  const first = sampleWorldFields('field-seed', 123.45, -67.89);
  const second = sampleWorldFields('field-seed', 123.45, -67.89);
  assert.deepEqual(first, second);
  assert.equal(first.geometry, 'euclidean');
});

test('selective Field sampling exactly matches the canonical full sample', () => {
  const full = sampleWorldFields('selective-field-seed', -314.25, 808.75);
  const selective = sampleWorldFieldChannels('selective-field-seed', -314.25, 808.75, ['axisFlow', 'regularity']);
  assert.deepEqual(selective, { axisFlow: full.axisFlow, regularity: full.regularity });
});

test('Generation 3 fields remain bounded and vary by seed and geography', () => {
  const origin = sampleWorldFields('field-seed-a', 0, 0);
  const distant = sampleWorldFields('field-seed-a', 420, -280);
  const alternateSeed = sampleWorldFields('field-seed-b', 0, 0);
  for (const sample of [origin, distant, alternateSeed]) {
    for (const name of WORLD_FIELD_NAMES) assert.ok(sample[name] >= 0 && sample[name] <= 1, `${name}=${sample[name]}`);
  }
  assert.notDeepEqual(valuesOnly(origin), valuesOnly(distant));
  assert.notDeepEqual(valuesOnly(origin), valuesOnly(alternateSeed));
});

test('field sampling is continuous across a Cell boundary', () => {
  const justWest = sampleWorldFields('boundary-seed', 6.999, 2.25);
  const justEast = sampleWorldFields('boundary-seed', 7.001, 2.25);
  for (const name of WORLD_FIELD_NAMES) {
    assert.ok(Math.abs(justWest[name] - justEast[name]) < 0.001, `${name} jumped from ${justWest[name]} to ${justEast[name]}`);
  }
});

test('multi-scale fields develop meaningful long-range variation without Cell cadence', () => {
  const ranges = new Map(WORLD_FIELD_NAMES.map((name) => [name, { min: 1, max: 0 }]));
  for (let step = -80; step <= 80; step += 1) {
    const sample = sampleWorldFields('geography-seed', step * 14 + 3.7, step * -9.1 + 1.25);
    for (const name of WORLD_FIELD_NAMES) {
      const range = ranges.get(name);
      range.min = Math.min(range.min, sample[name]);
      range.max = Math.max(range.max, sample[name]);
    }
  }
  for (const [name, range] of ranges) assert.ok(range.max - range.min >= 0.18, `${name} range was only ${range.max - range.min}`);
});

test('field diagnostics expose current Euclidean Geometry and every canonical field group', () => {
  const lines = formatFieldDiagnostics(sampleWorldFields('diagnostic-seed', 14, -28));
  assert.equal(lines[0], 'geometry      euclidean');
  assert.equal(lines.length, 5);
  for (const marker of ['open', 'partition', 'flow', 'scale', 'columns', 'ceiling', 'regularity', 'connect', 'damp', 'decay', 'stability', 'abnormal', 'void', 'clutter', 'electric']) {
    assert.ok(lines.some((line) => line.includes(marker)), `missing ${marker}`);
  }
});

test('kilometre-scale Region affinity Fields are deterministic, continuous, and separately seeded', () => {
  const first = sampleWorldGeography('geography-a', 4321.5, -876.25);
  assert.deepEqual(first, sampleWorldGeography('geography-a', 4321.5, -876.25));
  assert.notDeepEqual(first, sampleWorldGeography('geography-b', 4321.5, -876.25));
  const west = sampleWorldGeography('geography-a', 6.999, 42);
  const east = sampleWorldGeography('geography-a', 7.001, 42);
  for (const name of GEOGRAPHY_FIELD_NAMES) {
    assert.ok(first[name] >= 0 && first[name] <= 1);
    assert.ok(Math.abs(west[name] - east[name]) < 0.0001, `${name} snapped at a Cell boundary`);
  }
  const diagnostics = formatGeographyDiagnostics(first).join('\n');
  for (const marker of ['pillar', 'arch', 'blackout', 'holes']) assert.ok(diagnostics.includes(marker));
});
