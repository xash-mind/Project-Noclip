import assert from 'node:assert/strict';
import test from 'node:test';
import { sampleSpaceTopology } from '../.test-dist/src/world/gen3Architecture.js';
import {
  analyzeNavigation, canNavigate, CELL_SIZE, clean, DEFAULT_TUNING,
  transitionCorridor, transitionSides, validateCellPlacement, window
} from './dev5-world-coherence-helpers.mjs';

const topology = (seed, regionOverride = 'ordinary-level-0') => sampleSpaceTopology({
  seed, worldX: 0, worldZ: 0, worldDay: 40, exposure: 10, tuning: clean(regionOverride), radiusParcels: 12
});
const mean = (items, key) => items.reduce((sum, item) => sum + item[key], 0) / items.length;

test('Ordinary Level 0 is a deterministic hierarchy of intentional spaces and deliberate portals', () => {
  const results = ['coherence-a', 'coherence-b', 'coherence-c', 'coherence-d'].map((seed) => topology(seed));
  for (const result of results) {
    assert.equal(result.sealedSpaceCount, 0, JSON.stringify(result));
    assert.ok(result.spaceCount >= 70, JSON.stringify(result));
    assert.ok(result.oneEntryRate >= 0.18 && result.oneEntryRate <= 0.36, JSON.stringify(result));
    assert.ok(result.hugeSpaceRate <= 0.12, JSON.stringify(result));
    assert.ok(result.crossJunctionRate <= 0.06, JSON.stringify(result));
    assert.ok(result.tightPortalRate >= 0.12 && result.tightPortalRate <= 0.30, JSON.stringify(result));
    assert.ok(result.forcedPathRatio >= 0.30 && result.forcedPathRatio <= 0.50, JSON.stringify(result));
    assert.ok(result.areaP50 >= 50 && result.areaP50 <= 130, JSON.stringify(result));
    assert.ok(result.areaP90 >= 130 && result.areaP90 <= 260, JSON.stringify(result));
  }
  assert.ok(mean(results, 'tightSpaceRate') >= 0.08, JSON.stringify(results));
  assert.ok(mean(results, 'smallOrTightRate') >= 0.30, JSON.stringify(results));
  assert.ok(mean(results, 'optionalLoopRate') >= 0.02 && mean(results, 'optionalLoopRate') <= 0.12, JSON.stringify(results));
});

test('space topology is exactly deterministic and actual collider traversal remains globally connected', () => {
  assert.deepEqual(topology('topology-determinism'), topology('topology-determinism'));
  for (const [seed, x, z] of [['coherence-a', 0, 0], ['coherence-b', 12, -7], ['coherence-c', -20, 13], ['coherence-d', 31, 24]]) {
    const cells = window(seed, x, z, 7, clean('ordinary-level-0'));
    const nav = analyzeNavigation(cells, { startWorld: { x: x * CELL_SIZE, z: z * CELL_SIZE }, step: 0.7, playerRadius: 0.42 });
    assert.ok(nav.reachableAreaRatio >= 0.95, JSON.stringify(nav));
    assert.ok(nav.isolatedAreaRatio <= 0.05, JSON.stringify(nav));
    assert.ok(nav.boundaryReached && nav.cellsCrossed >= 12, JSON.stringify(nav));
    assert.ok(cells.every((entry) => validateCellPlacement(entry).length === 0), `${seed} has placement overlap`);
  }
});

test('forced Regions and natural Region seams remain traversable in both directions', () => {
  for (const region of ['ordinary-level-0', 'pillar-field', 'arch-rooms']) {
    const cells = window(`forced-${region}`, 0, 0, 5, clean(region));
    const result = analyzeNavigation(cells, { startWorld: { x: 0, z: 0 }, step: 0.7, playerRadius: 0.42 });
    assert.ok(result.reachableAreaRatio >= 0.95, `${region}: ${JSON.stringify(result)}`);
    assert.ok(result.isolatedAreaRatio <= 0.05, `${region}: ${JSON.stringify(result)}`);
    assert.ok(result.boundaryReached && result.cellsCrossed >= 9, `${region}: ${JSON.stringify(result)}`);
  }
  for (const [target, seed] of [['pillar-field', 'dev5-transition-pillar'], ['arch-rooms', 'dev5-transition-arch']]) {
    for (const exit of transitionSides(seed, target)) {
      const tuning = { ...DEFAULT_TUNING, conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none', gateBypass: true };
      const cells = transitionCorridor(seed, exit.outside, exit.inside, tuning);
      assert.ok(canNavigate(cells, exit.outside, exit.inside), `${target} entry blocked`);
      assert.ok(canNavigate(cells, exit.inside, exit.outside), `${target} exit blocked`);
    }
  }
});
