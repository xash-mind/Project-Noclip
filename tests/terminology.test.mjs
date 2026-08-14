import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCEPTANCE_STATES,
  ARCHITECTURE_PATTERNS,
  WORK_MODES,
  WORLD_SHORT_ADDRESSES,
  architecturePattern
} from '../.test-dist/src/world/terminology.js';

test('conversation short addresses are unique aliases and never runtime identity replacements', () => {
  const aliases = Object.keys(WORLD_SHORT_ADDRESSES);
  const stableIds = Object.values(WORLD_SHORT_ADDRESSES).map((entry) => entry.stableId);
  assert.equal(new Set(aliases).size, aliases.length);
  assert.equal(new Set(stableIds).size, stableIds.length);
  assert.equal(WORLD_SHORT_ADDRESSES.L0.stableId, 'level-0');
  assert.equal(WORLD_SHORT_ADDRESSES.O.stableId, 'ordinary-level-0');
  assert.equal(WORLD_SHORT_ADDRESSES.P.stableId, 'pillar-field');
  assert.equal(WORLD_SHORT_ADDRESSES.A.stableId, 'arch-rooms');
});

test('Architecture Patterns are Region-owned and expose stable piece addresses', () => {
  assert.deepEqual(ARCHITECTURE_PATTERNS.map((entry) => entry.id), ['O-A1', 'P-A1', 'A-A1']);
  assert.equal(architecturePattern('O-A1').regionId, 'ordinary-level-0');
  assert.equal(architecturePattern('P-A1').regionId, 'pillar-field');
  assert.equal(architecturePattern('A-A1').regionId, 'arch-rooms');
  const pieces = ARCHITECTURE_PATTERNS.flatMap((entry) => entry.pieces);
  assert.equal(new Set(pieces).size, pieces.length);
  assert.ok(pieces.includes('A-A1.lower-panel'));
  assert.ok(pieces.includes('A-A1.upper-mass'));
});

test('bounded work and acceptance vocabulary stays intentionally small', () => {
  assert.deepEqual(WORK_MODES, ['LOOK', 'AUDIT', 'CHANGE', 'RELEASE']);
  assert.deepEqual(ACCEPTANCE_STATES, ['PASS', 'PASS WITH GAP', 'FAIL', 'UNVERIFIED']);
});
