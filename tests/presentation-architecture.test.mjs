import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');
const {
  asAssetId,
  resolveAsset,
  validateAssetDefinitions
} = await import('../.test-dist/src/presentation/assets.js');
const { createChangeReceipt, serializeChangeReceipt, CHANGE_RECEIPT_SCHEMA } = await import('../.test-dist/src/presentation/changeReceipt.js');
const { developmentContextForDesignTarget, developmentContextForProp, serializeDevelopmentContext, DEVELOPMENT_CONTEXT_SCHEMA } = await import('../.test-dist/src/presentation/developmentContext.js');
const { geometryIsFinite, hasDuplicateTriangles, resolveGeometry, triangleCount } = await import('../.test-dist/src/presentation/geometry.js');
const {
  LEVEL0_FEATURE_PRESENTATION_REGISTRY,
  MEDIUM_BUCKET_TARGET,
  SMALL_GREY_OPEN_PAINT_CAN_TARGET
} = await import('../.test-dist/src/presentation/level0FeatureRepresentations.js');
const { validateRepresentationRegistry, resolveRepresentation, withRepresentationBinding } = await import('../.test-dist/src/presentation/registry.js');
const { geometryId, representationId } = await import('../.test-dist/src/presentation/types.js');

const generatorSource = await readFile(new URL('../src/world/gen3SpaceTopologyBuild.ts', import.meta.url), 'utf8');
const saveSource = await readFile(new URL('../src/persistence/types.ts', import.meta.url), 'utf8');
const featureRendererSource = await readFile(new URL('../src/renderer/level0FeaturePresentation.ts', import.meta.url), 'utf8');

function archTuning() {
  return { ...DEFAULT_TUNING, regionOverride: 'arch-rooms', conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none', gateBypass: true };
}

const pilotSampleCache = new Map();

function findPilotProp(kind) {
  const cached = pilotSampleCache.get(kind);
  if (cached) return cached;
  for (let seedIndex = 0; seedIndex < 12; seedIndex += 1) {
    for (let x = -8; x <= 8; x += 1) for (let z = -8; z <= 8; z += 1) {
      const descriptor = generateCell({ seed: `pau-pilot-${seedIndex}`, x, z, worldDay: 40, exposure: 10, shiftEpoch: 0, generationVersion: 'gen3-v1', tuning: archTuning() });
      const prop = descriptor.props.find((candidate) => candidate.kind === kind);
      if (prop) {
        const sample = { descriptor, prop };
        pilotSampleCache.set(kind, sample);
        return sample;
      }
    }
  }
  throw new Error(`Unable to find deterministic ${kind} pilot sample`);
}

function runtimeAsset(id, status, fallback) {
  return {
    id: asAssetId(id),
    type: 'mesh',
    role: 'feature-mesh',
    profile: 'Feature Mesh',
    source: `assets/source/meshes/${id}.glb`,
    ...(fallback ? { fallback: asAssetId(fallback) } : {}),
    mesh: { collision: 'none', pivot: 'floor-contact' },
    contentHash: `hash-${id}`,
    runtimePath: `/assets/runtime/meshes/${id}.glb`,
    runtimeStatus: status,
    validation: { valid: status === 'ready', warnings: [], errors: status === 'ready' ? [] : ['missing'] }
  };
}

test('PAU representation registry is valid and pilot targets resolve canonical LCG metadata', () => {
  assert.deepEqual(validateRepresentationRegistry(LEVEL0_FEATURE_PRESENTATION_REGISTRY), []);
  const bucket = resolveRepresentation(MEDIUM_BUCKET_TARGET, LEVEL0_FEATURE_PRESENTATION_REGISTRY);
  const can = resolveRepresentation(SMALL_GREY_OPEN_PAINT_CAN_TARGET, LEVEL0_FEATURE_PRESENTATION_REGISTRY);
  assert.equal(bucket?.definition.id, 'bucket.default');
  assert.equal(bucket?.definition.lcg?.classification, 'LCG-2');
  assert.equal(bucket?.definition.collisionMode, 'none');
  assert.equal(can?.definition.id, 'paint-can.grey-open');
  assert.equal(can?.definition.lcg?.classification, 'LCG-2');
  assert.equal(can?.definition.collisionMode, 'none');
});

test('representation rebinding and missing custom representations preserve generated world identity', () => {
  const before = findPilotProp('bucket');
  const customId = representationId('bucket.custom-test');
  const rebound = withRepresentationBinding(LEVEL0_FEATURE_PRESENTATION_REGISTRY, MEDIUM_BUCKET_TARGET, customId);
  const fallback = resolveRepresentation(MEDIUM_BUCKET_TARGET, rebound);
  assert.equal(fallback?.requestedRepresentationId, customId);
  assert.equal(fallback?.definition.id, 'bucket.default');
  assert.ok((fallback?.fallbackDepth ?? 0) >= 1);
  const debugOnly = resolveRepresentation(MEDIUM_BUCKET_TARGET, LEVEL0_FEATURE_PRESENTATION_REGISTRY, (definition) => definition.id === 'debug.neutral');
  assert.equal(debugOnly?.definition.id, 'debug.neutral');

  const after = generateCell({
    seed: before.descriptor.address.worldSeed,
    x: before.descriptor.address.cellX,
    z: before.descriptor.address.cellZ,
    worldDay: 40,
    exposure: 10,
    shiftEpoch: 0,
    generationVersion: 'gen3-v1',
    tuning: archTuning()
  });
  assert.deepEqual(after, before.descriptor);
  assert.equal(after.props.find((prop) => prop.kind === 'bucket')?.id, before.prop.id);
  assert.equal(generatorSource.includes('/presentation/'), false, 'world generation must not depend on PAU modules');
});

test('asset validation separates semantic IDs from content and rejects invalid metadata', () => {
  const valid = [{
    id: asAssetId('mesh.bucket.rusty01'),
    type: 'mesh',
    role: 'feature-mesh',
    profile: 'Feature Mesh',
    source: 'assets/source/meshes/bucket-rusty01.glb',
    mesh: { collision: 'none', pivot: 'floor-contact' }
  }];
  assert.equal(validateAssetDefinitions(valid).valid, true);
  const duplicate = validateAssetDefinitions([...valid, { ...valid[0] }]);
  assert.equal(duplicate.valid, false);
  assert.ok(duplicate.errors.some((error) => error.includes('Duplicate Asset ID')));
  const invalid = validateAssetDefinitions([{ ...valid[0], id: asAssetId('BAD PATH'), source: '../bucket.glb' }]);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((error) => error.includes('Invalid Asset ID')));
  assert.ok(invalid.errors.some((error) => error.includes('assets/source/')));
});

test('asset substitution is presentation-only and cannot alter generated world identity', () => {
  const sample = findPilotProp('paint-can');
  const before = structuredClone(sample.descriptor);
  const custom = runtimeAsset('mesh.paint-can.custom01', 'ready');
  const replacement = runtimeAsset('mesh.paint-can.custom02', 'ready');
  assert.equal(resolveAsset(custom.id, [custom])?.id, custom.id);
  assert.equal(resolveAsset(replacement.id, [replacement])?.id, replacement.id);
  const after = generateCell({
    seed: sample.descriptor.address.worldSeed,
    x: sample.descriptor.address.cellX,
    z: sample.descriptor.address.cellZ,
    worldDay: 40,
    exposure: 10,
    shiftEpoch: 0,
    generationVersion: 'gen3-v1',
    tuning: archTuning()
  });
  assert.deepEqual(after, before);
  assert.equal(after.props.find((prop) => prop.kind === 'paint-can')?.id, sample.prop.id);
});

test('missing assets follow explicit deterministic fallback chains', () => {
  const assets = [
    runtimeAsset('mesh.bucket.custom01', 'missing-source', 'mesh.bucket.canonical'),
    runtimeAsset('mesh.bucket.canonical', 'ready')
  ];
  assert.equal(resolveAsset(asAssetId('mesh.bucket.custom01'), assets)?.id, 'mesh.bucket.canonical');
  assert.equal(resolveAsset(asAssetId('mesh.bucket.custom01'), assets)?.contentHash, 'hash-mesh.bucket.canonical');
});

test('LCG open-container builder is deterministic, finite, duplicate-free and within pilot guidance', () => {
  for (const sample of [
    { dimensions: [0.62, 0.58, 0.62], target: MEDIUM_BUCKET_TARGET },
    { dimensions: [0.34, 0.38, 0.34], target: SMALL_GREY_OPEN_PAINT_CAN_TARGET }
  ]) {
    const representation = resolveRepresentation(sample.target, LEVEL0_FEATURE_PRESENTATION_REGISTRY);
    assert.ok(representation?.definition.geometryId);
    const first = resolveGeometry(representation.definition.geometryId, { dimensions: sample.dimensions, parameters: representation.definition.parameters });
    const second = resolveGeometry(representation.definition.geometryId, { dimensions: sample.dimensions, parameters: representation.definition.parameters });
    assert.deepEqual(first, second);
    assert.equal(geometryIsFinite(first), true);
    assert.equal(hasDuplicateTriangles(first), false);
    assert.ok(triangleCount(first) > 0);
    assert.ok(triangleCount(first) <= (representation.definition.lcg?.warningTriangles ?? Infinity));
  }
  assert.match(featureRendererSource, /resolveRepresentation\(\s*semanticTarget,\s*LEVEL0_FEATURE_PRESENTATION_REGISTRY,/);
  assert.match(featureRendererSource, /resolveGeometry\(resolved\.definition\.geometryId/);
  assert.equal(featureRendererSource.includes("addComponent('render', { type: 'cylinder' })"), false);
});

test('DevelopmentContext explicitly distinguishes design target from deterministic runtime instance and serializes stably', () => {
  const { descriptor, prop } = findPilotProp('paint-can');
  const designOnly = developmentContextForDesignTarget(SMALL_GREY_OPEN_PAINT_CAN_TARGET, { branchOrRef: 'pau/run-1-foundation' });
  assert.ok(designOnly);
  assert.equal(designOnly.designTarget.semanticTargetId, SMALL_GREY_OPEN_PAINT_CAN_TARGET);
  assert.equal(designOnly.runtimeInstance, undefined);
  const context = developmentContextForProp(descriptor, prop, { branchOrRef: 'pau/run-1-foundation', requestedChange: 'inspect pilot representation' });
  assert.ok(context);
  assert.equal(context.schema, DEVELOPMENT_CONTEXT_SCHEMA);
  assert.equal(context.designTarget.semanticTargetId, SMALL_GREY_OPEN_PAINT_CAN_TARGET);
  assert.equal(context.runtimeInstance?.stableRuntimeId, prop.id);
  assert.equal(context.runtimeInstance?.worldSeed, descriptor.address.worldSeed);
  assert.notEqual(context.designTarget.semanticTargetId, context.runtimeInstance?.stableRuntimeId);
  assert.equal(context.representation.id, 'paint-can.grey-open');
  assert.equal(context.representation.collisionMode, 'none');
  assert.ok(context.representation.editableParameters.includes('topRadiusRatio'));
  assert.equal(serializeDevelopmentContext(context), serializeDevelopmentContext(structuredClone(context)));
  assert.match(serializeDevelopmentContext(context), /"schema": "development-context-v1"/);
});

test('ChangeReceipt is versioned, stable and records a structured presentation-only edit', () => {
  const { descriptor, prop } = findPilotProp('bucket');
  const context = developmentContextForProp(descriptor, prop);
  assert.ok(context);
  const receipt = createChangeReceipt(context, {
    timestamp: '2026-08-17T10:45:00.000Z',
    mode: 'structured-project-change',
    beforeValues: { topRadiusRatio: 0.455 },
    afterValues: { topRadiusRatio: 0.47 },
    persisted: true,
    filesChanged: ['src/presentation/level0FeatureRepresentations.ts'],
    validation: [{ name: 'geometry', status: 'PASS' }, { name: 'deterministic identity', status: 'PASS' }],
    targetedTests: ['tests/presentation-architecture.test.mjs'],
    deterministicIdentity: 'PASS',
    saveCompatibility: 'PASS',
    diffSummary: 'Medium Bucket upper radius presentation parameter 0.455 -> 0.47'
  });
  assert.equal(receipt.schema, CHANGE_RECEIPT_SCHEMA);
  assert.equal(receipt.semanticTarget.semanticTargetId, MEDIUM_BUCKET_TARGET);
  assert.equal(receipt.runtimeInstance?.stableRuntimeId, prop.id);
  assert.equal(receipt.deterministicIdentity, 'PASS');
  assert.deepEqual(receipt.beforeValues, { topRadiusRatio: 0.455 });
  assert.deepEqual(receipt.afterValues, { topRadiusRatio: 0.47 });
  assert.equal(serializeChangeReceipt(receipt), serializeChangeReceipt(structuredClone(receipt)));
  assert.match(serializeChangeReceipt(receipt), /"schema": "change-receipt-v1"/);
});

test('save contract contains world/gameplay state but no raw PAU source asset payloads', () => {
  assert.equal(saveSource.includes('SourceAssetDefinition'), false);
  assert.equal(saveSource.includes('RuntimeAssetDefinition'), false);
  assert.equal(saveSource.includes('sourceAsset'), false);
  assert.equal(saveSource.includes('runtimePath'), false);
  assert.equal(saveSource.includes('.glb'), false);
});

test('Gen2 generation remains deterministic and independent of presentation registry', () => {
  const options = { seed: 'pau-gen2-compat', x: 1, z: -2, worldDay: 40, exposure: 10, shiftEpoch: 0, generationVersion: 'gen2', tuning: DEFAULT_TUNING };
  const first = generateCell(options);
  const second = generateCell(options);
  assert.deepEqual(first, second);
  resolveGeometry(geometryId('geometry.box'), { dimensions: [1, 1, 1] });
  assert.deepEqual(generateCell(options), first);
});
