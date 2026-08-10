import assert from 'node:assert/strict';
import test from 'node:test';

const { generateCell, validateCellPlacement } = await import('../.test-dist/src/world/generator.js');
const {
  LIGHT_FIELD_RADIUS,
  LIGHT_FIELD_UPDATE_INTERVAL,
  generateLightGroups,
  lightFlickerValue,
  sampleLightField,
  validateLightClearance
} = await import('../.test-dist/src/world/lighting.js');
const { DEFAULT_TUNING, WALL_HEIGHT } = await import('../.test-dist/src/world/types.js');

function generated(x, z, shiftEpoch = 0) {
  return generateCell({ seed: 'light-field-test', x, z, worldDay: 40, exposure: 10, shiftEpoch, tuning: DEFAULT_TUNING });
}

function group(overrides = {}) {
  return {
    id: 'group-test',
    fixtures: [{ x: 0, y: WALL_HEIGHT - 0.08, z: 0 }],
    rotationY: 0,
    state: 'on',
    intensity: 1,
    temperature: 0.94,
    flickerRate: 4,
    phase: 0.25,
    ...overrides
  };
}

test('generated light groups are deterministic derived state and shift without changing cell addresses', () => {
  const first = generated(3, -2, 0);
  const repeat = generated(3, -2, 0);
  const shifted = generated(3, -2, 1);

  assert.equal(first.id, '3:-2');
  assert.equal(shifted.id, first.id);
  assert.deepEqual(first.lightGroups, repeat.lightGroups);
  assert.ok(first.lightGroups.length <= 2);
  const pure = { seed: 'light-field-test', x: 3, z: -2, zoneId: 'baseline', roomArchetype: 'open-office', ceilingPattern: 0, walls: [], props: [] };
  const pureBefore = generateLightGroups({ ...pure, shiftEpoch: 0 });
  const pureAfter = generateLightGroups({ ...pure, shiftEpoch: 1 });
  assert.ok(pureBefore.length > 0);
  assert.notDeepEqual(pureBefore.map((entry) => entry.id), pureAfter.map((entry) => entry.id));
  assert.equal(first.address.cellX, shifted.address.cellX);
  assert.equal(first.address.cellZ, shifted.address.cellZ);
});

test('flicker sampling is deterministic and reduced-flicker mode holds groups steadily on', () => {
  const flicker = group({ state: 'flicker', id: 'flicker-a' });
  const first = lightFlickerValue(flicker, 12.345, false);
  assert.equal(lightFlickerValue(flicker, 12.345, false), first);
  assert.ok(first >= 0 && first <= 1);
  assert.equal(lightFlickerValue(flicker, 12.345, true), 1);
  assert.equal(lightFlickerValue(group({ state: 'off' }), 12.345, false), 0);
});

test('clustered field includes neighboring active groups, excludes off/far groups and stays bounded', () => {
  const active = { cellX: 1, cellZ: 0, group: group({ id: 'neighbor-active' }) };
  const off = { cellX: 0, cellZ: 0, group: group({ id: 'local-off', state: 'off' }) };
  const far = { cellX: 20, cellZ: 20, group: group({ id: 'far-active' }) };
  const sample = sampleLightField([active, off, far], 0, 0, 4, false);

  assert.ok(sample.energy > 0 && sample.energy <= 1);
  assert.equal(sample.nearbyGroups, 2);
  assert.equal(sample.activeGroups, 1);
  assert.equal(sample.flickerPulse, 0);
  assert.ok(sample.temperature > 0.85 && sample.temperature < 1.05);
  assert.ok(Math.abs(LIGHT_FIELD_RADIUS - 37.8) < 1e-9);
  assert.equal(LIGHT_FIELD_UPDATE_INTERVAL, 0.1);

  const onlyOff = sampleLightField([off], 0, 0, 4, false);
  assert.equal(onlyOff.energy, 0);
  assert.equal(onlyOff.activeGroups, 0);
});

test('fixture generation rejects only conflicting ceiling-reaching geometry', () => {
  const props = [{
    id: 'column-conflict',
    kind: 'column',
    position: { x: -3.4, y: WALL_HEIGHT / 2, z: -2.4 },
    scale: { x: 0.8, y: WALL_HEIGHT, z: 0.8 },
    solid: true
  }];
  const groups = generateLightGroups({
    seed: 'clearance', x: 0, z: 0, shiftEpoch: 0, zoneId: 'baseline', roomArchetype: 'open-office', ceilingPattern: 0,
    walls: [], props
  });
  assert.equal(groups.length, 2);
  assert.equal(groups.flatMap((entry) => entry.fixtures).length, 3);
  assert.deepEqual(validateLightClearance(groups, [], props), []);
});

test('deterministic generation sweep keeps fixture work bounded and placement valid', () => {
  const states = new Set();
  let maxGroups = 0;
  let maxFixtures = 0;
  for (let x = -20; x < 20; x += 1) {
    for (let z = -20; z < 20; z += 1) {
      const cell = generated(x, z);
      const errors = validateCellPlacement(cell);
      assert.deepEqual(errors, [], `${cell.id}: ${errors.join(', ')}`);
      maxGroups = Math.max(maxGroups, cell.lightGroups.length);
      maxFixtures = Math.max(maxFixtures, cell.lightGroups.reduce((sum, entry) => sum + entry.fixtures.length, 0));
      for (const entry of cell.lightGroups) states.add(entry.state);
    }
  }
  assert.deepEqual([...states].sort(), ['flicker', 'off', 'on']);
  assert.ok(maxGroups <= 2);
  assert.ok(maxFixtures <= 6);
});
