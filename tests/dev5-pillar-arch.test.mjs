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
  WALL_HEIGHT,
  window as cellWindow
} from './dev5-world-coherence-helpers.mjs';

const { sampleLightField } = await import('../.test-dist/src/world/lighting.js');
const { routeReservationEnvelopesForCell } = await import('../.test-dist/src/world/gen3SpaceTopologyBuild.js');
const {
  archCurveSegmentsForCell,
  archFrameBaysForDescriptors,
  carpetProfileForCell,
  holeDepthBands
} = await import('../.test-dist/src/renderer/level0RegionPresentation.js');
const { shouldGen3WallCollide } = await import('../.test-dist/src/renderer/level0Wallpaper.js');

function overlaps(left, right) {
  return left.maxX > right.minX
    && left.minX < right.maxX
    && left.maxZ > right.minZ
    && left.minZ < right.maxZ;
}

function tintEnergy(profile) {
  return profile.tint.reduce((sum, value) => sum + value, 0);
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
    const seed = `pillar-depth-${seedIndex}`;
    for (let x = -1500; x <= 1500 && bins.some((bin) => bin.samples.length < 18); x += 43) {
      for (let z = -1500; z <= 1500; z += 47) {
        const influence = sampleGen3RegionInfluence(seed, x * CELL_SIZE, z * CELL_SIZE, 40, 10, { ...DEFAULT_TUNING, gateBypass: true });
        if (influence.pillar < 0.12 || influence.arch > 0.28) continue;
        const bin = bins.find((candidate) => influence.pillarDepth >= candidate.min && influence.pillarDepth < candidate.max && candidate.samples.length < 18);
        if (!bin) continue;
        const entry = cell(seed, x, z, { ...DEFAULT_TUNING, conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none', gateBypass: true });
        bin.samples.push({ walls: entry.walls.length, columns: entry.props.filter((prop) => prop.kind === 'column').length });
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
  assert.ok(means[3].columns >= 2.4 && means[3].walls <= means[0].walls * 0.55, JSON.stringify(means));
});

test('Pillar route/opening reservation envelopes remain completely free of lattice props across multiple seeds', () => {
  const tuning = clean('pillar-field');
  let checkedPillars = 0;
  let checkedReservations = 0;
  for (let seedIndex = 0; seedIndex < 12; seedIndex += 1) {
    const seed = `pillar-clearance-${seedIndex}`;
    for (let x = -5; x <= 5; x += 1) {
      for (let z = -5; z <= 5; z += 1) {
        const entry = cell(seed, x, z, tuning);
        const reservations = routeReservationEnvelopesForCell({ seed, cellX: x, cellZ: z, worldDay: 40, exposure: 10, tuning });
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
            assert.equal(overlaps(bounds, reservation), false, `pillar ${prop.id} intersects route reservation ${reservation.portalId} at ${seed} ${x}:${z}`);
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
        const spec = gen3ArchDividerDiagnostic({ seed: 'arch-diagnostic', axis, lineIndex, groupIndex, worldDay: 40, exposure: 10, tuning });
        if (!spec) continue;
        const silhouette = gen3ArchSilhouetteDiagnostic({ seed: 'arch-diagnostic', axis, lineIndex, groupIndex, worldDay: 40, exposure: 10, tuning });
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
  assert.ok(routed.every((spec) => spec.minimumRouteWidth >= 1.95), `route width ${Math.min(...routed.map((spec) => spec.minimumRouteWidth))}`);
});

test('A-A1 renderer reconstructs heavy framed bays from world-space divider runs', () => {
  const tuning = clean('arch-rooms');
  let bayCount = 0;
  let routeCount = 0;
  let decorativeCount = 0;
  for (let seedIndex = 0; seedIndex < 5; seedIndex += 1) {
    const descriptors = cellWindow(`arch-frame-${seedIndex}`, 0, 0, 4, tuning);
    const bays = archFrameBaysForDescriptors(descriptors);
    bayCount += bays.length;
    routeCount += bays.filter((bay) => bay.route).length;
    decorativeCount += bays.filter((bay) => !bay.route).length;
    for (const bay of bays) {
      const center = (bay.start + bay.end) / 2;
      const curveCenter = (bay.curveStart + bay.curveEnd) / 2;
      const curveWidth = bay.curveEnd - bay.curveStart;
      assert.ok(Math.abs(center - curveCenter) < 1e-9, `off-center curve ${bay.id}`);
      assert.ok(curveWidth >= 0.71 && curveWidth <= 1.43, `curve width ${curveWidth} in ${bay.id}`);
      assert.ok(curveWidth <= (bay.end - bay.start) * 0.52 + 1e-9, `curve occupies too much of tightened bay ${bay.id}`);
    }
  }
  assert.ok(bayCount > 100, `only ${bayCount} framed bays`);
  assert.ok(routeCount > 10, `only ${routeCount} route bays`);
  assert.ok(decorativeCount > 20, `only ${decorativeCount} lower-panel bays`);
});

test('A-A1 frame reconstruction is stable when neighboring loaded Cells expand around the same interior', () => {
  const tuning = clean('arch-rooms');
  const seed = 'arch-frame-loaded-window';
  const small = archFrameBaysForDescriptors(cellWindow(seed, 0, 0, 4, tuning))
    .filter((bay) => Math.abs((bay.start + bay.end) / 2) < CELL_SIZE * 2.5 && Math.abs(bay.fixed) < CELL_SIZE * 2.5)
    .map((bay) => `${bay.lineKey}:${bay.start.toFixed(3)}:${bay.end.toFixed(3)}:${bay.route}`)
    .sort();
  const large = new Set(archFrameBaysForDescriptors(cellWindow(seed, 0, 0, 5, tuning))
    .map((bay) => `${bay.lineKey}:${bay.start.toFixed(3)}:${bay.end.toFixed(3)}:${bay.route}`));
  assert.ok(small.length > 20, `only ${small.length} interior bays`);
  assert.ok(small.every((key) => large.has(key)), 'interior divider reconstruction changed when neighboring Cells were loaded');
});

test('A-A1 pier collision follows the visible floor-to-ceiling frame while header/curve geometry stays non-colliding', () => {
  const tuning = clean('arch-rooms');
  let headers = 0;
  let midPiers = 0;
  let lowerPanels = 0;
  for (const descriptor of cellWindow('arch-collision', 0, 0, 4, tuning)) {
    for (const wall of descriptor.walls.filter((candidate) => candidate.materialId === 'arch-pale-wallpaper')) {
      const minY = wall.cy - wall.sy / 2;
      const maxY = wall.cy + wall.sy / 2;
      const header = Math.abs(wall.sy - 0.44) < 0.055 && Math.abs(maxY - WALL_HEIGHT) < 0.045;
      const lower = Math.abs(wall.sy - 1.0) < 0.065 && minY <= 0.045;
      const pier = minY > 0.04 && wall.sy > 1.35 && maxY >= WALL_HEIGHT - 0.485;
      if (header) {
        headers += 1;
        assert.equal(shouldGen3WallCollide(wall), false, `header ${wall.id} gained floor collision`);
      } else if (lower) {
        lowerPanels += 1;
        assert.equal(shouldGen3WallCollide(wall), true, `lower panel ${wall.id} lost collision`);
      } else if (pier) {
        midPiers += 1;
        assert.equal(shouldGen3WallCollide(wall), true, `frame pier ${wall.id} is visually floor-reaching but not colliding`);
      }
    }
  }
  assert.ok(headers > 20, `only ${headers} headers`);
  assert.ok(lowerPanels > 20, `only ${lowerPanels} lower pieces`);
  assert.ok(midPiers > 20, `only ${midPiers} mid-pier pieces`);
});

test('Arch curves remain render-only, small and centered rather than broad bay cut-outs', () => {
  const tuning = clean('arch-rooms');
  const curveBottoms = new Set();
  let curvedPieces = 0;
  let semanticCurvePieces = 0;
  let checkedCells = 0;
  let maxSemanticWalls = 0;
  for (let seedIndex = 0; seedIndex < 5; seedIndex += 1) {
    const seed = `arch-curve-${seedIndex}`;
    for (let x = -3; x <= 3; x += 1) {
      for (let z = -3; z <= 3; z += 1) {
        const entry = cell(seed, x, z, tuning);
        checkedCells += 1;
        maxSemanticWalls = Math.max(maxSemanticWalls, entry.walls.length);
        const segments = archCurveSegmentsForCell(entry);
        curvedPieces += segments.length;
        for (const segment of segments) curveBottoms.add((segment.position[1] - segment.scale[1] / 2).toFixed(3));
        for (const wall of entry.walls) {
          if (wall.materialId !== 'arch-pale-wallpaper') continue;
          const minY = wall.cy - wall.sy / 2;
          const maxY = wall.cy + wall.sy / 2;
          if (minY > 1.45 && minY < 2.72 && maxY >= WALL_HEIGHT - 0.46) semanticCurvePieces += 1;
        }
      }
    }
  }
  assert.equal(semanticCurvePieces, 0, 'curved intrados leaked back into semantic/collision walls');
  assert.ok(curvedPieces > 40, `only ${curvedPieces} render-only curved aperture segments`);
  assert.ok(curveBottoms.size >= 4, `arch aperture has only ${curveBottoms.size} distinct curve heights`);
  assert.ok(maxSemanticWalls <= 64, `Arch semantic wall budget reached ${maxSemanticWalls} across ${checkedCells} sampled cells`);
});

test('Region carpet presentation stays within Level 0 grammar and never changes ownership because a Hole exists', () => {
  const ordinary = carpetProfileForCell('ordinary-level-0');
  const pillar = carpetProfileForCell('pillar-field');
  const arch = carpetProfileForCell('arch-rooms');
  assert.notDeepEqual(pillar.tint, ordinary.tint, 'Pillar carpet collapsed to Ordinary carpet');
  assert.notDeepEqual(arch.tint, ordinary.tint, 'Arch carpet collapsed to Ordinary carpet');
  assert.ok(tintEnergy(pillar) > tintEnergy(ordinary), 'Pillar carpet is not lighter than ordinary Level 0');
  assert.ok(tintEnergy(arch) < tintEnergy(ordinary), 'Arch carpet is not darker than ordinary Level 0');
  assert.ok(tintEnergy(pillar) - tintEnergy(ordinary) < 0.15, 'Pillar carpet diverged too far from Level 0 grammar');
  assert.ok(tintEnergy(ordinary) - tintEnergy(arch) < 0.35, 'Arch carpet diverged too far from Level 0 grammar');
});

test('Hole presentation transitions from readable upper walls to full dark depth without per-hole light tiers', () => {
  const bands = holeDepthBands();
  assert.deepEqual(bands.map((band) => band.key), ['upper', 'middle', 'deep']);
  assert.ok(bands[0].top > -0.1, `upper hole wall starts too deep: ${bands[0].top}`);
  assert.equal(bands[0].bottom, bands[1].top);
  assert.equal(bands[1].bottom, bands[2].top);
  assert.ok(bands[2].bottom <= -4.4, `hole depth is only ${Math.abs(bands[2].bottom)} m`);
  const energies = bands.map((band) => band.tint.reduce((sum, value) => sum + value, 0));
  assert.ok(energies[0] > energies[1] && energies[1] > energies[2], `hole depth does not darken monotonically: ${energies.join(', ')}`);
  assert.ok(energies[2] < 0.02, `deep hole walls remain too readable: ${energies[2]}`);
});

test('sampled fluorescent field includes all nearby active groups for ambience and diagnostics', () => {
  const fixture = (id, x) => ({
    cellX: 0,
    cellZ: 0,
    group: { id, fixtures: [{ x, y: WALL_HEIGHT - 0.08, z: 0 }], rotationY: 0, state: 'on', intensity: 1, temperature: 0.94, flickerRate: 4, phase: 0.2 }
  });
  const sources = Array.from({ length: 12 }, (_value, index) => fixture(`field-${index}`, -11 + index * 2));
  const field = sampleLightField(sources, 0, 0, 3, false);
  assert.equal(field.activeGroups, 12);
  assert.equal(field.nearbyGroups, 12);
  assert.ok(field.energy > 0.7, `field energy ${field.energy}`);
});
