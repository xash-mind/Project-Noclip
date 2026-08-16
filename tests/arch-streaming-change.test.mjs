import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const core = await import('../.test-dist/src/world/gen3ArchitectureCore.js');
const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');
const { routeReservationEnvelopesForCell } = await import('../.test-dist/src/world/gen3SpaceTopologyBuild.js');
const { archFramePresentationProfile } = await import('../.test-dist/src/renderer/level0RegionPresentation.js');
const { OBJECT_CATALOG, validateObjectCatalog } = await import('../.test-dist/src/renderer/objectCatalog.js');
const streamingSource = await readFile(new URL('../src/renderer/streamingScheduler.ts', import.meta.url), 'utf8');
const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');
const archPresentationSource = await readFile(new URL('../src/renderer/level0RegionPresentation.ts', import.meta.url), 'utf8');

function tuning(regionOverride) {
  return { ...DEFAULT_TUNING, regionOverride, conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none', gateBypass: true };
}
function cell(seed, x, z, regionOverride) {
  return generateCell({ seed, x, z, worldDay: 40, exposure: 10, shiftEpoch: 0, tuning: tuning(regionOverride), generationVersion: 'gen3-v1' });
}
function overlaps(left, right) {
  return left.maxX > right.minX && left.minX < right.maxX && left.maxZ > right.minZ && left.minZ < right.maxZ;
}

test('A-A1 halves each shoulder while preserving the accepted central curve', () => {
  const profiles = Array.from({ length: 100 }, (_, index) => core.archBayProfile(`arch-profile-${index}`));
  for (const profile of profiles) {
    assert.ok(Math.abs(profile.curveWidth - core.legacyArchCurveWidth(profile.legacyOpening)) < 1e-12);
    assert.ok(Math.abs(profile.shoulderSpan - profile.legacyShoulderSpan * 0.5) < 1e-12);
    assert.ok(Math.abs(profile.opening - (profile.curveWidth + profile.shoulderSpan * 2)) < 1e-12);
    assert.ok(profile.pitch < profile.legacyPitch);
  }
  assert.ok(Math.min(...profiles.map((profile) => profile.pitch)) >= 3.19);
  assert.ok(Math.max(...profiles.map((profile) => profile.pitch)) <= 3.56);
});

test('A-A1 visible upper assembly is translated down 0.10 m and stays deeper than its piers', () => {
  const profile = archFramePresentationProfile();
  assert.ok(Math.abs(profile.upperBottom - 1.92) < 1e-12);
  assert.ok(Math.abs(profile.upperTop - 2.96) < 1e-12);
  assert.ok(Math.abs(profile.ceilingReveal - 0.24) < 1e-12);
  assert.ok(Math.abs(profile.curveApex - 2.46) < 1e-12);
  assert.equal(profile.shoulderSpanScale, 0.5);
  assert.ok(profile.upperDepth > profile.pierDepth);
  assert.ok(profile.joinOverlap >= 0.015 && profile.joinOverlap <= 0.02);
  assert.ok(profile.cellSeamOverlap > 0);
});

test('Arch environmental props are deterministic, sparse, independent, exclusive, non-solid and route-clear', () => {
  let buckets = 0;
  let cans = 0;
  let bucketOnly = 0;
  let canOnly = 0;
  let sampledArch = 0;
  for (let seedIndex = 0; seedIndex < 8; seedIndex += 1) {
    const seed = `arch-props-${seedIndex}`;
    for (let x = -10; x <= 10; x += 1) for (let z = -10; z <= 10; z += 1) {
      const first = cell(seed, x, z, 'arch-rooms');
      const second = cell(seed, x, z, 'arch-rooms');
      const props = first.props.filter((prop) => prop.kind === 'bucket' || prop.kind === 'paint-can');
      assert.deepEqual(props, second.props.filter((prop) => prop.kind === 'bucket' || prop.kind === 'paint-can'));
      sampledArch += 1;
      const hasBucket = props.some((prop) => prop.kind === 'bucket');
      const hasCan = props.some((prop) => prop.kind === 'paint-can');
      buckets += hasBucket ? 1 : 0;
      cans += hasCan ? 1 : 0;
      bucketOnly += hasBucket && !hasCan ? 1 : 0;
      canOnly += hasCan && !hasBucket ? 1 : 0;
      const reservations = routeReservationEnvelopesForCell({ seed, cellX: x, cellZ: z, worldDay: 40, exposure: 10, tuning: tuning('arch-rooms') });
      for (const prop of props) {
        assert.equal(prop.solid, false);
        const cx = x * 14 + prop.position.x;
        const cz = z * 14 + prop.position.z;
        const bounds = { minX: cx - prop.scale.x / 2, maxX: cx + prop.scale.x / 2, minZ: cz - prop.scale.z / 2, maxZ: cz + prop.scale.z / 2 };
        assert.ok(reservations.every((reservation) => !overlaps(bounds, reservation)), `${prop.kind} intersected a route reservation`);
      }
      assert.equal(cell(seed, x, z, 'ordinary-level-0').props.some((prop) => prop.kind === 'bucket' || prop.kind === 'paint-can'), false);
      assert.equal(cell(seed, x, z, 'pillar-field').props.some((prop) => prop.kind === 'bucket' || prop.kind === 'paint-can'), false);
    }
  }
  assert.ok(buckets > sampledArch * 0.03 && buckets < sampledArch * 0.18, `bucket cells ${buckets}/${sampledArch}`);
  assert.ok(cans > sampledArch * 0.02 && cans < sampledArch * 0.15, `paint-can cells ${cans}/${sampledArch}`);
  assert.ok(bucketOnly > 10 && canOnly > 10, `independence ${bucketOnly}/${canOnly}`);
});

test('World Lab exposes both new Arch environmental prop visuals', () => {
  assert.deepEqual(validateObjectCatalog(), []);
  assert.ok(OBJECT_CATALOG.some((entry) => entry.propKind === 'bucket'));
  assert.ok(OBJECT_CATALOG.some((entry) => entry.propKind === 'paint-can'));
});

test('streaming scheduler predicts into only the existing retention ring and budgets heavy work', () => {
  assert.match(streamingSource, /predictiveExtraRings: 1/);
  assert.match(streamingSource, /workBudgetMs: 2\.25/);
  assert.match(streamingSource, /maxHeavyJobsPerFrame: 1/);
  assert.match(streamingSource, /unloadGraceMs: 1200/);
  assert.match(streamingSource, /const retentionRadius = loadRadius \+ STREAMING_SCHEDULER_PROFILE\.predictiveExtraRings/);
  assert.match(streamingSource, /for \(let offset = -loadRadius; offset <= loadRadius; offset \+= 1\)/);
  assert.match(streamingSource, /processOneJob\(this\)/);
  assert.equal(streamingSource.includes("enqueue(scheduler, 'refresh', x, z"), false);
  assert.match(streamingSource, /visual\.root\.enabled = false/);
});

test('A-A1 seam handoffs avoid coplanar duplicate faces', () => {
  assert.match(archPresentationSource, /entersFromPreviousCell/);
  assert.match(archPresentationSource, /continuesIntoNextCell/);
  assert.match(archPresentationSource, /bay\.curveStart \+ ARCH_CURVE_JOIN_HANDOFF/);
  assert.match(archPresentationSource, /bay\.curveEnd - ARCH_CURVE_JOIN_HANDOFF/);
  assert.match(archPresentationSource, /support\[0\] - ARCH_PIER_BRIDGE_OVERLAP/);
  assert.equal(archPresentationSource.includes('ARCH_JOIN_OVERLAP'), false);
});

test('static world batching is localized per Cell rather than one global dirty group', () => {
  assert.match(batchingSource, /mode: 'per-cell'/);
  assert.match(batchingSource, /excludesFluorescentPanels: true/);
  assert.match(batchingSource, /app\.batcher\.markGroupDirty\(batch\.id\)/);
  assert.equal(batchingSource.includes('markGroupDirty(STATIC_WORLD_BATCH_GROUP_ID)'), false);
});
