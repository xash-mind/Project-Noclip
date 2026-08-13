import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ARCH_IRREGULAR_CHANCE, CELL_SIZE, cell, clean, DEFAULT_TUNING,
  gen3ArchDividerDiagnostic, gen3ArchSilhouetteDiagnostic,
  PILLAR_MAX_WIDTH, PILLAR_MIN_WIDTH, PILLAR_SPACING, PILLAR_WIDTH_SCALE,
  sampleGen3RegionInfluence, selectSpatialFixtureLights, WALL_HEIGHT
} from './dev5-world-coherence-helpers.mjs';

test('Pillar geography monotonically removes room partitions and fills the 7.2 m lattice toward the core', () => {
  assert.equal(PILLAR_WIDTH_SCALE, 0.9); assert.equal(PILLAR_SPACING, 7.2);
  assert.ok(Math.abs(PILLAR_MIN_WIDTH - 1.55 * 0.9) < 1e-12); assert.ok(Math.abs(PILLAR_MAX_WIDTH - 2.3 * 0.9) < 1e-12);
  const bins = [{ min: 0, max: 0.25, samples: [] }, { min: 0.25, max: 0.5, samples: [] }, { min: 0.5, max: 0.75, samples: [] }, { min: 0.75, max: 1.001, samples: [] }];
  for (let seedIndex = 0; seedIndex < 60 && bins.some((bin) => bin.samples.length < 18); seedIndex += 1) {
    const seed = `dev5-depth-${seedIndex}`;
    for (let x = -1500; x <= 1500 && bins.some((bin) => bin.samples.length < 18); x += 43) for (let z = -1500; z <= 1500; z += 47) {
      const influence = sampleGen3RegionInfluence(seed, x * CELL_SIZE, z * CELL_SIZE, 40, 10, { ...DEFAULT_TUNING, gateBypass: true });
      if (influence.pillar < 0.12 || influence.arch > 0.28) continue;
      const bin = bins.find((candidate) => influence.pillarDepth >= candidate.min && influence.pillarDepth < candidate.max && candidate.samples.length < 18);
      if (!bin) continue;
      const entry = cell(seed, x, z, { ...DEFAULT_TUNING, conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none', gateBypass: true });
      bin.samples.push({ walls: entry.walls.length, columns: entry.props.filter((prop) => prop.kind === 'column').length });
    }
  }
  const means = bins.map((bin) => ({ walls: bin.samples.reduce((sum, sample) => sum + sample.walls, 0) / bin.samples.length, columns: bin.samples.reduce((sum, sample) => sum + sample.columns, 0) / bin.samples.length }));
  assert.ok(bins.every((bin) => bin.samples.length >= 10), JSON.stringify(means));
  for (let index = 1; index < means.length; index += 1) {
    assert.ok(means[index].columns > means[index - 1].columns, JSON.stringify(means));
    assert.ok(means[index].walls < means[index - 1].walls, JSON.stringify(means));
  }
  assert.ok(means[0].columns < 1.1, JSON.stringify(means));
  assert.ok(means[3].columns >= 2.4 && means[3].walls <= means[0].walls * 0.55, JSON.stringify(means));
});

test('Arch topology emits stable complete divider runs instead of floating fragments', () => {
  assert.equal(ARCH_IRREGULAR_CHANCE, 0);
  const specs = []; const tuning = clean('arch-rooms');
  for (const axis of ['x', 'z']) for (let lineIndex = -20; lineIndex <= 20; lineIndex += 1) for (let groupIndex = -30; groupIndex <= 30; groupIndex += 1) {
    const spec = gen3ArchDividerDiagnostic({ seed: 'dev5-arch-diagnostic', axis, lineIndex, groupIndex, worldDay: 40, exposure: 10, tuning });
    if (!spec) continue;
    const silhouette = gen3ArchSilhouetteDiagnostic({ seed: 'dev5-arch-diagnostic', axis, lineIndex, groupIndex, worldDay: 40, exposure: 10, tuning });
    specs.push({ ...spec, ...silhouette });
  }
  assert.ok(specs.length > 1000, `only ${specs.length} divider samples`);
  assert.ok(specs.every((spec) => !spec.irregular && spec.symmetryDelta === 0));
  assert.ok(new Set(specs.map((spec) => spec.bayWidth.toFixed(3))).size >= 8);
  assert.ok(specs.every((spec) => spec.bayCount >= 4 && spec.pierCount >= 3 && spec.terminationCount === 2));
  const routed = specs.filter((spec) => spec.routeBayCount > 0);
  assert.ok(routed.length > specs.length * 0.8, 'too few topology-integrated route bays');
  assert.ok(routed.every((spec) => spec.minimumRouteWidth >= 1.95), `route width ${Math.min(...routed.map((spec) => spec.minimumRouteWidth))}`);
});

test('lighting ownership remains regression-safe', () => {
  const fixture = (id, x) => ({ cellX: 0, cellZ: 0, group: { id, fixtures: [{ x, y: WALL_HEIGHT - 0.08, z: 0 }], rotationY: 0, state: 'on', intensity: 1, temperature: 0.94, flickerRate: 4, phase: 0.2 } });
  const sources = [fixture('a', -8), fixture('b', -3), fixture('c', 3), fixture('d', 8), fixture('e', 14), fixture('f', 20)];
  let selected = selectSpatialFixtureLights(sources, 0, 0, 3, false, 4); const original = selected.map((entry) => entry.id);
  for (const x of [0.5, 1, 1.5, 2, 2.5, 3]) { selected = selectSpatialFixtureLights(sources, x, 0, 3, false, 4, selected.map((entry) => entry.id)); assert.deepEqual(selected.map((entry) => entry.id), original); }
});
