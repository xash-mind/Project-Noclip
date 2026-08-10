import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isBaselineArchitecturePilot,
  solveBaselineArchitecturePilot,
  validateBaselineArchitecturePilot
} from '../.test-dist/src/world/architecture.js';
import { generateCell, isEssentialSceneryProp, validateCellConnectivity, validateCellPlacement } from '../.test-dist/src/world/generator.js';
import { intInRange, stableId } from '../.test-dist/src/world/hash.js';
import { layoutFor } from '../.test-dist/src/world/layouts.js';
import { DEFAULT_TUNING } from '../.test-dist/src/world/types.js';

const pilotCell = (overrides = {}) => generateCell({
  seed: 'sparse-1',
  x: 0,
  z: 0,
  worldDay: 0,
  exposure: 0,
  shiftEpoch: 0,
  tuning: DEFAULT_TUNING,
  ...overrides
});

const internalWalls = (cell) => cell.walls.filter((wall) => Math.abs(wall.cx) < 6.5 && Math.abs(wall.cz) < 6.5);

test('Generation 3 pilot preserves supplied markable identity slots while replacing module geometry', () => {
  const input = {
    seed: 'identity-slots',
    cellX: 7,
    cellZ: -4,
    legacyWallIds: ['legacy-wall-a', 'legacy-wall-b', 'legacy-wall-c', 'legacy-wall-d'],
    legacySolidPropIds: ['legacy-divider', 'legacy-bench', 'legacy-pillar']
  };
  const first = solveBaselineArchitecturePilot(input);
  const second = solveBaselineArchitecturePilot(input);
  assert.deepEqual(first, second);
  assert.deepEqual(first.walls.map((wall) => wall.id), input.legacyWallIds);
  assert.deepEqual(first.props.map((prop) => prop.id), input.legacySolidPropIds);
  assert.ok(first.props.every((prop) => prop.kind === 'column' && prop.solid === true));
  assert.deepEqual(first.componentIds, []);
  assert.match(first.compositionSignature, /^gen3-field-pilot:/);
  assert.deepEqual(validateBaselineArchitecturePilot(first.walls, first.props), []);
  // Renderer collider IDs for solid props remain `solid:${prop.id}`, so persisted
  // SurfaceMark references remain addressable after the geometry migration.
  assert.deepEqual(first.props.map((prop) => `solid:${prop.id}`), ['solid:legacy-divider', 'solid:legacy-bench', 'solid:legacy-pillar']);
});

test('fixed sparse-1 origin now exercises the bounded field-solved open-office path', () => {
  const cell = pilotCell();
  assert.equal(cell.address.zoneId, 'baseline');
  assert.equal(cell.roomArchetype, 'open-office');
  assert.equal(isBaselineArchitecturePilot(cell.address.zoneId, cell.roomArchetype), true);
  assert.match(cell.roomLabel, /^field-solved open office/);
  assert.match(cell.compositionSignature, /^gen3-field-pilot:/);
  assert.deepEqual(cell.componentIds, []);
  assert.ok(cell.props.every((prop) => prop.kind === 'column'));
  assert.deepEqual(validateBaselineArchitecturePilot(internalWalls(cell), cell.props), []);
  assert.deepEqual(validateCellPlacement(cell), []);
  assert.deepEqual(cell.lootNodes.map((node, index) => node.id), cell.lootNodes.map((_node, index) => stableId('loot', 'sparse-1', 0, 0, index)));
});

test('pilot sweep remains deterministic, traversable and materially field-varied', () => {
  const signatures = new Set();
  let pilots = 0;
  const failures = [];
  let legacyIdentityChecked = false;

  for (let x = -18; x <= 18; x += 1) for (let z = -18; z <= 18; z += 1) {
    const options = {
      seed: 'gen3-pilot-sweep',
      x,
      z,
      worldDay: 40,
      exposure: 10,
      shiftEpoch: 0,
      tuning: { ...DEFAULT_TUNING, zoneOverride: 'baseline', gateBypass: true }
    };
    const cell = generateCell(options);
    if (!cell.compositionSignature.startsWith('gen3-field-pilot:')) continue;
    pilots += 1;
    signatures.add(cell.compositionSignature);
    assert.deepEqual(cell, generateCell(options));
    assert.ok(cell.props.every((prop) => prop.kind === 'column'));
    for (const error of validateBaselineArchitecturePilot(internalWalls(cell), cell.props)) failures.push(`${cell.id}: ${error}`);
    for (const error of validateCellPlacement(cell)) failures.push(`${cell.id}: ${error}`);

    if (!legacyIdentityChecked && (x !== 0 || z !== 0)) {
      const variant = intInRange(`${options.seed}:variant:${x}:${z}:0`, 0, Math.max(10, Math.round(18 * options.tuning.roomVariation)));
      const legacy = layoutFor(options.seed, x, z, 'open-office', 'baseline', 0, variant, options.tuning.roomVariation);
      const emittedIds = new Set(cell.walls.map((wall) => wall.id));
      for (const wall of legacy.walls) assert.ok(emittedIds.has(wall.id), `legacy markable wall id ${wall.id} was not preserved`);
      const emittedPropIds = new Set(cell.props.map((prop) => prop.id));
      for (const prop of legacy.props.filter((entry) => entry.solid && isEssentialSceneryProp('open-office', entry))) {
        assert.ok(emittedPropIds.has(prop.id), `legacy markable prop id ${prop.id} was not preserved`);
      }
      legacyIdentityChecked = true;
    }
  }

  assert.ok(pilots >= 100, `only ${pilots} pilot cells found`);
  assert.ok(signatures.size >= 20, `only ${signatures.size} field-driven pilot signatures`);
  assert.equal(legacyIdentityChecked, true);
  assert.deepEqual(failures.slice(0, 20), []);
  assert.deepEqual(validateCellConnectivity('gen3-pilot-sweep', 28, DEFAULT_TUNING.extraOpeningChance), []);
});
