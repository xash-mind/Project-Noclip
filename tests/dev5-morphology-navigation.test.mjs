import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyzeNavigation, ARCH_IRREGULAR_CHANCE, buildNavigationGrid, canNavigate, CELL_SIZE, cell, clean,
  DEFAULT_TUNING, gen3ArchDividerDiagnostic, gen3ArchSilhouetteDiagnostic, gen3JunctionDiagnostic,
  isCellBoundary, locateNearestRegion, lowerTailMetrics, PILLAR_MAX_WIDTH, PILLAR_MIN_WIDTH,
  PILLAR_SPACING, PILLAR_WIDTH_SCALE, sampleGen3RegionInfluence, selectSpatialFixtureLights,
  transitionCorridor, transitionSides, validateCellPlacement, wallWorld, WALL_HEIGHT, window
} from './dev5-world-coherence-helpers.mjs';

test('Ordinary morphology has a lower space-size tail while long-range actual-collider reachability remains healthy', () => {
  const samples = [['coherence-a', 0, 0], ['coherence-b', 12, -7], ['coherence-c', -20, 13], ['coherence-d', 31, 24]];
  const results = samples.map(([seed, x, z]) => {
    const cells = window(seed, x, z, 7, clean('ordinary-level-0'));
    return { nav: analyzeNavigation(cells, { startWorld: { x: x * CELL_SIZE, z: z * CELL_SIZE }, step: 0.7, playerRadius: 0.42 }), lower: lowerTailMetrics(cells, { x: x * CELL_SIZE, z: z * CELL_SIZE }) };
  });
  for (const { nav, lower } of results) {
    assert.ok(nav.reachableAreaRatio >= 0.985, JSON.stringify(nav));
    assert.ok(nav.isolatedAreaRatio <= 0.015, JSON.stringify(nav));
    assert.ok(nav.boundaryReached && nav.cellsCrossed >= 14, JSON.stringify(nav));
    assert.ok(nav.maxDeadEndDepth <= 9, JSON.stringify(nav));
    assert.ok(lower.openAreaP10 >= 24 && lower.openAreaP10 <= 110, JSON.stringify(lower));
    assert.ok(lower.openAreaP25 <= 190, JSON.stringify(lower));
    assert.ok(lower.maxDeadEnd <= 9, JSON.stringify(lower));
  }
  const mean = (selector) => results.reduce((sum, result) => sum + selector(result), 0) / results.length;
  assert.ok(mean((r) => r.nav.openAreaP50) >= 100 && mean((r) => r.nav.openAreaP50) <= 360);
  assert.ok(mean((r) => r.nav.openAreaP90) >= 350 && mean((r) => r.nav.openAreaP90) <= 1250);
  assert.ok(mean((r) => r.nav.openAreaP99) > mean((r) => r.nav.openAreaP90) * 1.12);
  const oneEntryTotal = results.reduce((sum, result) => sum + result.lower.oneEntryBranches, 0);
  assert.ok(oneEntryTotal >= 3 && oneEntryTotal <= 40, `one-entry branch count ${oneEntryTotal}`);
});

test('multi-seed junction morphology makes four-way crosses a bounded minority', () => {
  const histogram = { cross: 0, t: 0, corner: 0, straight: 0, termination: 0, open: 0 };
  const seeds = ['coherence-a', 'coherence-b', 'coherence-c', 'coherence-d', 'dev4-long-traversal', 'junction-alpha', 'junction-beta', 'junction-gamma'];
  for (const seed of seeds) for (let x = -24; x <= 24; x += 1) for (let z = -24; z <= 24; z += 1) {
    const diagnostic = gen3JunctionDiagnostic({ seed, junctionX: x, junctionZ: z, worldDay: 40, exposure: 10, tuning: clean('ordinary-level-0') });
    histogram[diagnostic.actualKind] += 1;
  }
  const total = Object.values(histogram).reduce((sum, value) => sum + value, 0); const rate = (key) => histogram[key] / total;
  assert.ok(rate('cross') > 0.005 && rate('cross') <= 0.09, JSON.stringify(histogram));
  assert.ok(rate('t') >= 0.15, JSON.stringify(histogram));
  assert.ok(rate('corner') >= 0.2, JSON.stringify(histogram));
  assert.ok(rate('termination') >= 0.15, JSON.stringify(histogram));
  assert.ok(rate('straight') >= 0.06, JSON.stringify(histogram));
  assert.ok(rate('open') <= 0.08, JSON.stringify(histogram));
});

test('forced World Lab Regions and natural Region seams remain navigable at player clearance', () => {
  for (const region of ['ordinary-level-0', 'pillar-field', 'arch-rooms']) {
    const cells = window(`forced-${region}`, 0, 0, 5, clean(region));
    const result = analyzeNavigation(cells, { startWorld: { x: 0, z: 0 }, step: 0.7, playerRadius: 0.42 });
    assert.ok(result.reachableAreaRatio >= 0.97, `${region}: ${JSON.stringify(result)}`);
    assert.ok(result.isolatedAreaRatio <= 0.03, `${region}: ${JSON.stringify(result)}`);
    assert.ok(result.boundaryReached && result.cellsCrossed >= 10, `${region}: ${JSON.stringify(result)}`);
    assert.ok(cells.every((entry) => validateCellPlacement(entry).length === 0), `${region} has placement overlap`);
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