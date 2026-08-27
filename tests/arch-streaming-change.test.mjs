import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const core = await import('../.test-dist/src/world/gen3ArchitectureCore.js');
const {
  ARCH_FRAME_CELL_SEAM_HANDOFF,
  archFrameBaysForDescriptors: canonicalArchFrameBaysForDescriptors,
  clipArchIntervalForCell
} = await import('../.test-dist/src/world/gen3ArchDividerSemantics.js');
const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { CELL_SIZE, DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');
const { routeReservationEnvelopesForCell } = await import('../.test-dist/src/world/gen3SpaceTopologyBuild.js');
const {
  archFramePresentationProfile,
  archFrameVisibleVolumesForDescriptors,
  holeDepthBands
} = await import('../.test-dist/src/renderer/level0RegionPresentation.js');
const { OBJECT_CATALOG, validateObjectCatalog } = await import('../.test-dist/src/renderer/objectCatalog.js');
const { resolveGeometry, geometryIsFinite, hasDuplicateTriangles } = await import('../.test-dist/src/presentation/geometry.js');
const { LEVEL0_FEATURE_PRESENTATION_REGISTRY, MEDIUM_BUCKET_TARGET, SMALL_GREY_OPEN_PAINT_CAN_TARGET } = await import('../.test-dist/src/presentation/level0FeatureRepresentations.js');
const { resolveRepresentation } = await import('../.test-dist/src/presentation/registry.js');
const streamingSource = await readFile(new URL('../src/renderer/streamingScheduler.ts', import.meta.url), 'utf8');
const streamingPolicySource = await readFile(new URL('../src/renderer/streamingPolicy.ts', import.meta.url), 'utf8');
const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');
const archPresentationSource = await readFile(new URL('../src/renderer/level0RegionPresentation.ts', import.meta.url), 'utf8');
const featurePresentationSource = await readFile(new URL('../src/renderer/level0FeaturePresentation.ts', import.meta.url), 'utf8');
const pauPilotSource = await readFile(new URL('../src/renderer/pauFeaturePresentationPilot.ts', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');

function tuning(regionOverride) {
  return { ...DEFAULT_TUNING, regionOverride, conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none', gateBypass: true };
}
function cell(seed, x, z, regionOverride) {
  return generateCell({ seed, x, z, worldDay: 40, exposure: 10, shiftEpoch: 0, tuning: tuning(regionOverride), generationVersion: 'gen3-v1' });
}
function overlaps(left, right) {
  return left.maxX > right.minX && left.minX < right.maxX && left.maxZ > right.minZ && left.minZ < right.maxZ;
}

function tintEnergy(tint) {
  return tint[0] + tint[1] + tint[2];
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

test('A-A1 visible upper assembly keeps accepted proportions with exact curve handoffs', () => {
  const profile = archFramePresentationProfile();
  assert.ok(Math.abs(profile.upperBottom - 1.92) < 1e-12);
  assert.ok(Math.abs(profile.upperTop - 2.96) < 1e-12);
  assert.ok(Math.abs(profile.ceilingReveal - 0.24) < 1e-12);
  assert.ok(Math.abs(profile.curveApex - 2.46) < 1e-12);
  assert.equal(profile.shoulderSpanScale, 0.5);
  assert.ok(profile.upperDepth > profile.pierDepth);
  assert.equal(profile.curveJoinHandoff, 0);
  assert.ok(profile.cellSeamHandoff > 0);
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

test('Medium Bucket and Small Grey Open Paint Can use the PAU registry and continuous LCG surface meshes', () => {
  for (const [target, dimensions] of [
    [MEDIUM_BUCKET_TARGET, [0.62, 0.58, 0.62]],
    [SMALL_GREY_OPEN_PAINT_CAN_TARGET, [0.34, 0.38, 0.34]]
  ]) {
    const resolved = resolveRepresentation(target, LEVEL0_FEATURE_PRESENTATION_REGISTRY);
    assert.ok(resolved?.definition.geometryId);
    const mesh = resolveGeometry(resolved.definition.geometryId, { dimensions, parameters: resolved.definition.parameters });
    assert.equal(geometryIsFinite(mesh), true);
    assert.equal(hasDuplicateTriangles(mesh), false);
  }
  assert.match(pauPilotSource, /addLevel0PilotFeaturePresentation/);
  assert.match(pauPilotSource, /original\.call\(this, parent, prop, profile\)/);
  assert.match(mainSource, /installPauFeaturePresentationPilot\(\)/);
  assert.match(featurePresentationSource, /resolveRepresentation\(\s*semanticTarget,\s*LEVEL0_FEATURE_PRESENTATION_REGISTRY,/);
  assert.match(featurePresentationSource, /resolveGeometry\(resolved\.definition\.geometryId/);
  assert.match(featurePresentationSource, /`\$\{prop\.id\}:surface`/);
  assert.equal(featurePresentationSource.includes("addComponent('render', { type: 'cylinder' })"), false);
  assert.match(pauPilotSource, /before the legacy cellBuilder presentation path runs/);
});

test('CV-H1 depth bands preserve an illuminated upper shaft and hide the deep terminator', () => {
  const bands = holeDepthBands();
  assert.deepEqual(bands.map((band) => band.key), ['upper', 'middle', 'deep']);
  assert.equal(bands[0].top, -0.02);
  assert.ok(bands[2].bottom <= -8);
  assert.ok(tintEnergy(bands[0].tint) > tintEnergy(bands[1].tint));
  assert.ok(tintEnergy(bands[1].tint) > tintEnergy(bands[2].tint));
  assert.match(archPresentationSource, /`\$\{hole\.id\}:void`/);
  assert.match(archPresentationSource, /depth-occluder/);
  assert.match(archPresentationSource, /hole\.scale\.x \* 2\.6/);
  assert.match(archPresentationSource, /cvh1DepthMaterial\(renderer, 'void'\)/);
  assert.match(archPresentationSource, /resolveCvh1DepthPresentation/);
  assert.equal(archPresentationSource.includes('lightlessBlackMaterial'), false);
});

test('streaming scheduler predicts into only the existing retention ring and budgets heavy work', () => {
  assert.match(streamingPolicySource, /predictiveExtraRings: 1/);
  assert.match(streamingPolicySource, /workBudgetMs: 2\.25/);
  assert.match(streamingPolicySource, /maxHeavyJobsPerFrame: 1/);
  assert.match(streamingPolicySource, /unloadGraceMs: 1200/);
  assert.match(streamingPolicySource, /const retentionRadius = loadRadius \+ STREAMING_SCHEDULER_PROFILE\.predictiveExtraRings/);
  assert.match(streamingPolicySource, /for \(let offset = -loadRadius; offset <= loadRadius; offset \+= 1\)/);
  assert.match(streamingSource, /processOneJob\(game\)/);
  assert.equal(streamingSource.includes("enqueue(scheduler, 'refresh', x, z"), false);
  assert.match(streamingSource, /visual\.root\.enabled = false/);
});

test('A-A1 shared-pier upper mass has canonical single-surface ownership', () => {
  const seed = 'arch-shared-upper-owner';
  const descriptors = [];
  for (let x = -2; x <= 2; x += 1) {
    for (let z = -2; z <= 2; z += 1) descriptors.push(cell(seed, x, z, 'arch-rooms'));
  }

  const bays = canonicalArchFrameBaysForDescriptors(descriptors);
  const upperVolumes = archFrameVisibleVolumesForDescriptors(descriptors)
    .filter((volume) => volume.role === 'upper-mass');
  assert.ok(bays.length > 8, `expected repeated canonical A-A1 bays, got ${bays.length}`);
  assert.ok(upperVolumes.length > 8, `expected repeated visible upper volumes, got ${upperVolumes.length}`);

  const volumesByLine = new Map();
  for (const volume of upperVolumes) {
    assert.ok(volume.end > volume.start, `non-positive upper volume ${volume.id}`);
    const line = volumesByLine.get(volume.lineKey) ?? [];
    line.push(volume);
    volumesByLine.set(volume.lineKey, line);
  }
  for (const volumes of volumesByLine.values()) {
    volumes.sort((left, right) => left.start - right.start);
    for (let index = 1; index < volumes.length; index += 1) {
      assert.ok(
        volumes[index].start >= volumes[index - 1].end - 1e-9,
        `overlapping positive-volume upper ownership ${volumes[index - 1].id} / ${volumes[index].id}`
      );
    }
  }

  const left = cell(seed, 0, 0, 'arch-rooms');
  const right = cell(seed, 1, 0, 'arch-rooms');
  const seam = CELL_SIZE / 2;
  const leftClip = clipArchIntervalForCell(left, 'z', seam - 1, seam + 1);
  const rightClip = clipArchIntervalForCell(right, 'z', seam - 1, seam + 1);
  assert.ok(leftClip && rightClip, 'canonical Cell seam clipping removed a real continuation');
  assert.ok(Math.abs(leftClip[1] - (seam + ARCH_FRAME_CELL_SEAM_HANDOFF)) < 1e-12);
  assert.ok(Math.abs(rightClip[0] - (seam + ARCH_FRAME_CELL_SEAM_HANDOFF)) < 1e-12);
  assert.ok(Math.abs(leftClip[1] - rightClip[0]) < 1e-12, 'adjacent Cell ownership no longer meets at one canonical handoff');

  assert.equal(archPresentationSource.includes('ARCH_PIER_BRIDGE_OVERLAP'), false);
  assert.equal(archPresentationSource.includes('ARCH_CURVE_JOIN_HANDOFF'), false);
  assert.equal(archPresentationSource.includes('upper-through-pier'), false);
});

test('static world batching is localized per Cell rather than one global dirty group', () => {
  assert.match(batchingSource, /mode: 'per-cell'/);
  assert.match(batchingSource, /excludesFluorescentPanels: true/);
  assert.match(batchingSource, /app\.batcher\.markGroupDirty\(batch\.id\)/);
  assert.equal(batchingSource.includes('markGroupDirty(STATIC_WORLD_BATCH_GROUP_ID)'), false);
});
