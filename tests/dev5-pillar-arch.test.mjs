import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ARCH_IRREGULAR_CHANCE,
  CELL_SIZE,
  cell,
  clean,
  DEFAULT_TUNING,
  gen3ArchDividerDiagnostic,
  gen3ArchSilhouetteDiagnostic,
  PILLAR_MAX_WIDTH,
  PILLAR_MIN_WIDTH,
  PILLAR_SPACING,
  PILLAR_WIDTH_SCALE,
  sampleGen3RegionInfluence,
  selectSpatialFixtureLights,
  WALL_HEIGHT
} from './dev5-world-coherence-helpers.mjs';

const { lightFlickerValue, sampleLightField } = await import('../.test-dist/src/world/lighting.js');
const { routeReservationEnvelopesForCell } = await import('../.test-dist/src/world/gen3SpaceTopologyBuild.js');

function overlaps(left, right) {
  return left.maxX > right.minX
    && left.minX < right.maxX
    && left.maxZ > right.minZ
    && left.minZ < right.maxZ;
}

test('Pillar geography monotonically removes room partitions and fills the 7.2 m lattice toward the core', () => {
  assert.equal(PILLAR_WIDTH_SCALE, 0.9);
  assert.equal(PILLAR_SPACING, 7.2);
  assert.ok(Math.abs(PILLAR_MIN_WIDTH - 1.55 * 0.9) < 1e-12);
  assert.ok(Math.abs(PILLAR_MAX_WIDTH - 2.3 * 0.9) < 1e-12);
  const bins = [
    { min: 0, max: 0.25, samples: [] },
    { min: 0.25, max: 0.5, samples: [] },
    { min: 0.5, max: 0.75, samples: [] },
    { min: 0.75, max: 1.001, samples: [] }
  ];
  for (let seedIndex = 0; seedIndex < 60 && bins.some((bin) => bin.samples.length < 18); seedIndex += 1) {
    const seed = `dev5-depth-${seedIndex}`;
    for (let x = -1500; x <= 1500 && bins.some((bin) => bin.samples.length < 18); x += 43) {
      for (let z = -1500; z <= 1500; z += 47) {
        const influence = sampleGen3RegionInfluence(
          seed,
          x * CELL_SIZE,
          z * CELL_SIZE,
          40,
          10,
          { ...DEFAULT_TUNING, gateBypass: true }
        );
        if (influence.pillar < 0.12 || influence.arch > 0.28) continue;
        const bin = bins.find((candidate) => (
          influence.pillarDepth >= candidate.min
          && influence.pillarDepth < candidate.max
          && candidate.samples.length < 18
        ));
        if (!bin) continue;
        const entry = cell(seed, x, z, {
          ...DEFAULT_TUNING,
          conditionOverride: 'clear',
          carverOverride: 'none',
          structureOverride: 'none',
          gateBypass: true
        });
        bin.samples.push({
          walls: entry.walls.length,
          columns: entry.props.filter((prop) => prop.kind === 'column').length
        });
      }
    }
  }
  const means = bins.map((bin) => ({
    walls: bin.samples.reduce((sum, sample) => sum + sample.walls, 0) / bin.samples.length,
    columns: bin.samples.reduce((sum, sample) => sum + sample.columns, 0) / bin.samples.length
  }));
  assert.ok(bins.every((bin) => bin.samples.length >= 10), JSON.stringify(means));
  for (let index = 1; index < means.length; index += 1) {
    assert.ok(means[index].columns > means[index - 1].columns, JSON.stringify(means));
    assert.ok(means[index].walls < means[index - 1].walls, JSON.stringify(means));
  }
  assert.ok(means[0].columns < 1.1, JSON.stringify(means));
  assert.ok(
    means[3].columns >= 2.4 && means[3].walls <= means[0].walls * 0.55,
    JSON.stringify(means)
  );
});

test('Pillar route/opening reservation envelopes remain completely free of lattice props across multiple seeds', () => {
  const tuning = clean('pillar-field');
  let checkedPillars = 0;
  let checkedReservations = 0;
  for (let seedIndex = 0; seedIndex < 12; seedIndex += 1) {
    const seed = `dev6-pillar-clearance-${seedIndex}`;
    for (let x = -5; x <= 5; x += 1) {
      for (let z = -5; z <= 5; z += 1) {
        const entry = cell(seed, x, z, tuning);
        const reservations = routeReservationEnvelopesForCell({
          seed,
          cellX: x,
          cellZ: z,
          worldDay: 40,
          exposure: 10,
          tuning
        });
        checkedReservations += reservations.length;
        const originX = x * CELL_SIZE;
        const originZ = z * CELL_SIZE;
        for (const prop of entry.props.filter((candidate) => candidate.kind === 'column')) {
          checkedPillars += 1;
          const bounds = {
            minX: originX + prop.position.x - prop.scale.x / 2,
            maxX: originX + prop.position.x + prop.scale.x / 2,
            minZ: originZ + prop.position.z - prop.scale.z / 2,
            maxZ: originZ + prop.position.z + prop.scale.z / 2
          };
          for (const reservation of reservations) {
            assert.equal(
              overlaps(bounds, reservation),
              false,
              `pillar ${prop.id} intersects route reservation ${reservation.portalId} at ${seed} ${x}:${z}`
            );
          }
        }
      }
    }
  }
  assert.ok(checkedPillars > 200, `only ${checkedPillars} Pillars checked`);
  assert.ok(checkedReservations > 1000, `only ${checkedReservations} reservations checked`);
});

test('Arch topology emits stable complete divider runs instead of floating fragments', () => {
  assert.equal(ARCH_IRREGULAR_CHANCE, 0);
  const specs = [];
  const tuning = clean('arch-rooms');
  for (const axis of ['x', 'z']) {
    for (let lineIndex = -20; lineIndex <= 20; lineIndex += 1) {
      for (let groupIndex = -30; groupIndex <= 30; groupIndex += 1) {
        const spec = gen3ArchDividerDiagnostic({
          seed: 'dev5-arch-diagnostic',
          axis,
          lineIndex,
          groupIndex,
          worldDay: 40,
          exposure: 10,
          tuning
        });
        if (!spec) continue;
        const silhouette = gen3ArchSilhouetteDiagnostic({
          seed: 'dev5-arch-diagnostic',
          axis,
          lineIndex,
          groupIndex,
          worldDay: 40,
          exposure: 10,
          tuning
        });
        specs.push({ ...spec, ...silhouette });
      }
    }
  }
  assert.ok(specs.length > 1000, `only ${specs.length} divider samples`);
  assert.ok(specs.every((spec) => !spec.irregular && spec.symmetryDelta === 0));
  assert.ok(new Set(specs.map((spec) => spec.bayWidth.toFixed(3))).size >= 8);
  assert.ok(specs.every((spec) => spec.bayCount >= 4 && spec.pierCount >= 3 && spec.terminationCount === 2));
  const routed = specs.filter((spec) => spec.routeBayCount > 0);
  assert.ok(routed.length > specs.length * 0.8, 'too few topology-integrated route bays');
  assert.ok(
    routed.every((spec) => spec.minimumRouteWidth >= 1.95),
    `route width ${Math.min(...routed.map((spec) => spec.minimumRouteWidth))}`
  );
});

test('Arch dividers contain a multi-step curved aperture silhouette rather than rectangular shoulder boxes', () => {
  const tuning = clean('arch-rooms');
  const curveBottoms = new Set();
  let curvedPieces = 0;
  for (let seedIndex = 0; seedIndex < 5; seedIndex += 1) {
    const seed = `dev6-arch-curve-${seedIndex}`;
    for (let x = -3; x <= 3; x += 1) {
      for (let z = -3; z <= 3; z += 1) {
        const entry = cell(seed, x, z, tuning);
        for (const wall of entry.walls) {
          if (wall.materialId !== 'arch-pale-wallpaper') continue;
          const minY = wall.cy - wall.sy / 2;
          const maxY = wall.cy + wall.sy / 2;
          if (minY <= 1.45 || minY >= 2.72 || maxY < WALL_HEIGHT - 0.46) continue;
          curveBottoms.add(minY.toFixed(3));
          curvedPieces += 1;
        }
      }
    }
  }
  assert.ok(curvedPieces > 120, `only ${curvedPieces} curved aperture segments`);
  assert.ok(
    curveBottoms.size >= 4,
    `arch aperture has only ${curveBottoms.size} distinct upper-curve heights: ${[...curveBottoms].join(', ')}`
  );
});

test('bounded room light-field samples all active loaded groups while realtime local ownership remains capped', () => {
  const fixture = (id, x, state = 'on') => ({
    cellX: 0,
    cellZ: 0,
    group: {
      id,
      fixtures: [{ x, y: WALL_HEIGHT - 0.08, z: 0 }],
      rotationY: 0,
      state,
      intensity: 1,
      temperature: 0.94,
      flickerRate: 4,
      phase: 0.2
    }
  });
  const sources = Array.from({ length: 12 }, (_value, index) => fixture(`field-${index}`, -11 + index * 2));
  const field = sampleLightField(sources, 0, 0, 3, false);
  const local = selectSpatialFixtureLights(sources, 0, 0, 3, false, 8);
  assert.equal(field.activeGroups, 12);
  assert.equal(field.nearbyGroups, 12);
  assert.ok(field.energy > 0.7, `field energy ${field.energy}`);
  assert.equal(local.length, 8);
});

test('fixture mesh pulse contract matches emitted-light pulse including off and reduced-flicker states', () => {
  const source = {
    cellX: 0,
    cellZ: 0,
    group: {
      id: 'dev6-flicker-sync',
      fixtures: [{ x: 0, y: WALL_HEIGHT - 0.08, z: 0 }],
      rotationY: 0,
      state: 'flicker',
      intensity: 1,
      temperature: 0.94,
      flickerRate: 4,
      phase: 0.2
    }
  };
  let dimTime;
  let brightTime;
  for (let elapsed = 0; elapsed < 20 && (dimTime === undefined || brightTime === undefined); elapsed += 0.025) {
    const pulse = lightFlickerValue(source.group, elapsed, false);
    if (pulse <= 0.05) dimTime ??= elapsed;
    if (pulse >= 0.9) brightTime ??= elapsed;
  }
  assert.notEqual(dimTime, undefined, 'no deterministic off-like flicker pulse found');
  assert.notEqual(brightTime, undefined, 'no deterministic bright flicker pulse found');

  const dimPulse = lightFlickerValue(source.group, dimTime, false);
  const brightPulse = lightFlickerValue(source.group, brightTime, false);
  const dimLight = selectSpatialFixtureLights([source], 0, 0, dimTime, false, 1)[0];
  const brightLight = selectSpatialFixtureLights([source], 0, 0, brightTime, false, 1)[0];
  assert.ok(dimLight && brightLight);
  assert.ok(Math.abs(dimLight.intensity - dimPulse * 0.82) < 1e-10);
  assert.ok(Math.abs(brightLight.intensity - brightPulse * 0.82) < 1e-10);
  assert.equal(lightFlickerValue(source.group, brightTime, true), 1);

  const offSource = {
    ...source,
    group: { ...source.group, id: 'dev6-off-sync', state: 'off' }
  };
  assert.equal(lightFlickerValue(offSource.group, 5, false), 0);
  assert.equal(sampleLightField([offSource], 0, 0, 5, false).energy, 0);
});

test('lighting ownership remains regression-safe', () => {
  const fixture = (id, x) => ({
    cellX: 0,
    cellZ: 0,
    group: {
      id,
      fixtures: [{ x, y: WALL_HEIGHT - 0.08, z: 0 }],
      rotationY: 0,
      state: 'on',
      intensity: 1,
      temperature: 0.94,
      flickerRate: 4,
      phase: 0.2
    }
  });
  const sources = [
    fixture('a', -8),
    fixture('b', -3),
    fixture('c', 3),
    fixture('d', 8),
    fixture('e', 14),
    fixture('f', 20)
  ];
  let selected = selectSpatialFixtureLights(sources, 0, 0, 3, false, 4);
  const original = selected.map((entry) => entry.id);
  for (const x of [0.5, 1, 1.5, 2, 2.5, 3]) {
    selected = selectSpatialFixtureLights(
      sources,
      x,
      0,
      3,
      false,
      4,
      selected.map((entry) => entry.id)
    );
    assert.deepEqual(selected.map((entry) => entry.id), original);
  }
});
