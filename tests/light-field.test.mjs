import assert from 'node:assert/strict';
import test from 'node:test';

const { generateCell, validateCellPlacement } = await import('../.test-dist/src/world/generator.js');
const {
  BASELINE_OFF_CHANCE,
  LIGHT_FIELD_RADIUS,
  LIGHT_FIELD_UPDATE_INTERVAL,
  generateLightGroups,
  lightFlickerValue,
  lightInstability,
  lightStateForInstability,
  lightStateThresholds,
  sampleLightField,
  selectSpatialFixtureLights,
  validateLightClearance
} = await import('../.test-dist/src/world/lighting.js');
const { DEFAULT_TUNING, WALL_HEIGHT } = await import('../.test-dist/src/world/types.js');

function generated(x, z, shiftEpoch = 0) { return generateCell({ seed: 'light-field-test', x, z, worldDay: 40, exposure: 10, shiftEpoch, generationVersion: 'gen3-v1', tuning: { ...DEFAULT_TUNING, regionOverride: 'ordinary-level-0', conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none' } }); }
function group(overrides = {}) { return { id: 'group-test', fixtures: [{ x: 0, y: WALL_HEIGHT - 0.08, z: 0 }], rotationY: 0, state: 'on', intensity: 1, temperature: 0.94, flickerRate: 4, phase: 0.25, ...overrides }; }

test('generated light groups are deterministic derived state and shift without changing cell addresses', () => {
  const first = generated(3, -2, 0); const repeat = generated(3, -2, 0); const shifted = generated(3, -2, 1);
  assert.equal(first.id, '3:-2'); assert.equal(shifted.id, first.id); assert.deepEqual(first.lightGroups, repeat.lightGroups); assert.ok(first.lightGroups.length <= 2);
  const pure = { seed: 'light-field-test', x: 3, z: -2, zoneId: 'baseline', roomArchetype: 'open-office', ceilingPattern: 0, walls: [], props: [] };
  const pureBefore = generateLightGroups({ ...pure, shiftEpoch: 0 }); const pureAfter = generateLightGroups({ ...pure, shiftEpoch: 1 }); assert.ok(pureBefore.length > 0); assert.notDeepEqual(pureBefore.map((entry) => entry.id), pureAfter.map((entry) => entry.id));
  assert.equal(first.address.cellX, shifted.address.cellX); assert.equal(first.address.cellZ, shifted.address.cellZ);
});

test('baseline outages are extremely rare and instability can only degrade a group state', () => {
  assert.ok(BASELINE_OFF_CHANCE < 0.01); const levels = [0, 0.15, 0.35, 0.65, 1];
  for (let index = 1; index < levels.length; index += 1) { const before = lightStateThresholds(levels[index - 1]); const after = lightStateThresholds(levels[index]); assert.ok(after.off >= before.off); assert.ok(after.unstable >= before.unstable); }
  const severity = { on: 0, flicker: 1, off: 2 };
  for (let key = 0; key < 5000; key += 1) { let previous = lightStateForInstability(`monotonic-${key}`, levels[0]); for (let index = 1; index < levels.length; index += 1) { const next = lightStateForInstability(`monotonic-${key}`, levels[index]); assert.ok(severity[next] >= severity[previous], `${key}: ${previous} -> ${next}`); previous = next; } }
  let off = 0; let total = 0;
  for (let x = -80; x < 80; x += 1) for (let z = -20; z < 20; z += 1) { const cell = generateCell({ seed: 'baseline-outage-rate', x, z, worldDay: 0, exposure: 0, shiftEpoch: 0, tuning: { ...DEFAULT_TUNING, zoneOverride: 'baseline' } }); for (const entry of cell.lightGroups) { total += 1; if (entry.state === 'off') off += 1; } }
  assert.ok(total > 5000); assert.ok(off / total < 0.01, `baseline off rate was ${(off / total * 100).toFixed(2)}%`);
});

test('baseline outage counts rise monotonically as shift instability increases', () => {
  const counts = [];
  for (const epoch of [0, 1, 2, 4, 7]) { let off = 0; let unstable = 0; for (let x = -35; x < 35; x += 1) for (let z = -8; z < 8; z += 1) { const cell = generateCell({ seed: 'shift-light-monotonic', x, z, worldDay: 0, exposure: 0, shiftEpoch: epoch, tuning: { ...DEFAULT_TUNING, zoneOverride: 'baseline' } }); for (const entry of cell.lightGroups) { if (entry.state === 'off') off += 1; if (entry.state !== 'on') unstable += 1; } } counts.push({ epoch, off, unstable, instability: lightInstability('baseline', epoch) }); }
  for (let index = 1; index < counts.length; index += 1) { assert.ok(counts[index].off >= counts[index - 1].off, JSON.stringify(counts)); assert.ok(counts[index].unstable >= counts[index - 1].unstable, JSON.stringify(counts)); assert.ok(counts[index].instability >= counts[index - 1].instability); }
});

test('flicker sampling is deterministic and reduced-flicker mode holds groups steadily on', () => {
  const flicker = group({ state: 'flicker', id: 'flicker-a' }); const first = lightFlickerValue(flicker, 12.345, false); assert.equal(lightFlickerValue(flicker, 12.345, false), first); assert.ok(first >= 0 && first <= 1); assert.equal(lightFlickerValue(flicker, 12.345, true), 1); assert.equal(lightFlickerValue(group({ state: 'off' }), 12.345, false), 0);
});

test('clustered field includes neighboring active groups, excludes off/far groups and stays bounded', () => {
  const active = { cellX: 1, cellZ: 0, group: group({ id: 'neighbor-active' }) }; const off = { cellX: 0, cellZ: 0, group: group({ id: 'local-off', state: 'off' }) }; const far = { cellX: 20, cellZ: 20, group: group({ id: 'far-active' }) };
  const sample = sampleLightField([active, off, far], 0, 0, 4, false); assert.ok(sample.energy > 0 && sample.energy <= 1); assert.equal(sample.nearbyGroups, 2); assert.equal(sample.activeGroups, 1); assert.equal(sample.flickerPulse, 0); assert.ok(sample.temperature > 0.85 && sample.temperature < 1.05); assert.ok(Math.abs(LIGHT_FIELD_RADIUS - 37.8) < 1e-9); assert.equal(LIGHT_FIELD_UPDATE_INTERVAL, 0.1);
  const onlyOff = sampleLightField([off], 0, 0, 4, false); assert.equal(onlyOff.energy, 0); assert.equal(onlyOff.activeGroups, 0);
});

test('fixture generation rejects only conflicting ceiling-reaching geometry', () => {
  const props = [{ id: 'column-conflict', kind: 'column', position: { x: -3.4, y: WALL_HEIGHT / 2, z: -2.4 }, scale: { x: 0.8, y: WALL_HEIGHT, z: 0.8 }, solid: true }];
  const groups = generateLightGroups({ seed: 'clearance', x: 0, z: 0, shiftEpoch: 0, zoneId: 'baseline', roomArchetype: 'open-office', ceilingPattern: 0, walls: [], props }); assert.equal(groups.length, 2); assert.equal(groups.flatMap((entry) => entry.fixtures).length, 3); assert.deepEqual(validateLightClearance(groups, [], props), []);
});

test('renderer fixture selection uses actual ceiling positions across Cell boundaries', () => {
  const sources = [
    { cellX: 0, cellZ: 0, group: group({ id: 'west', fixtures: [{ x: 6.2, y: WALL_HEIGHT - 0.08, z: 0 }] }) },
    { cellX: 1, cellZ: 0, group: group({ id: 'east', fixtures: [{ x: -6.2, y: WALL_HEIGHT - 0.08, z: 0 }] }) }
  ];
  const selected = selectSpatialFixtureLights(sources, 7, 0, 0, false, 4);
  assert.deepEqual(selected.map((entry) => entry.id), ['east:0', 'west:0']);
  assert.deepEqual(selected.map((entry) => entry.worldX), [7.8, 6.2]);
  assert.ok(selected.every((entry) => entry.intensity > 0));
});

test('Blackout generation has exactly zero local fixture work', () => {
  const blackout = generateCell({ seed: 'blackout-zero', x: 0, z: 0, worldDay: 40, exposure: 10, shiftEpoch: 0, generationVersion: 'gen3-v1', tuning: { ...DEFAULT_TUNING, conditionOverride: 'blackout', structureOverride: 'none' } });
  assert.deepEqual(blackout.lightGroups, []);
  assert.equal(blackout.world.blackoutStrength, 1);
});

test('deterministic generation sweep keeps fixture work bounded and placement valid', () => {
  const states = new Set(); let maxGroups = 0; let maxFixtures = 0;
  for (let x = -20; x < 20; x += 1) for (let z = -20; z < 20; z += 1) { const cell = generated(x, z); const errors = validateCellPlacement(cell); assert.deepEqual(errors, [], `${cell.id}: ${errors.join(', ')}`); maxGroups = Math.max(maxGroups, cell.lightGroups.length); maxFixtures = Math.max(maxFixtures, cell.lightGroups.reduce((sum, entry) => sum + entry.fixtures.length, 0)); for (const entry of cell.lightGroups) states.add(entry.state); }
  assert.ok(states.has('on')); assert.ok(states.has('flicker')); assert.ok([...states].every((state) => ['on', 'flicker', 'off'].includes(state))); assert.ok(maxGroups <= 2); assert.ok(maxFixtures <= 6);
});
