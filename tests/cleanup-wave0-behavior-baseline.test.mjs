import assert from 'node:assert/strict';
import test from 'node:test';

const { resolveCircleAgainstAabbs } = await import('../.test-dist/src/physics/collision.js');
const {
  archSemanticWallOwnsFinalCollision,
  archStructuralRole
} = await import('../.test-dist/src/renderer/archDividerRuntimeCorrection.js');
const { resolveCanonicalLevel0CarpetPresentation } = await import('../.test-dist/src/renderer/finalLevel0MaterialPresentation.js');
const { FIXTURE_LIGHTING_PROFILE } = await import('../.test-dist/src/renderer/fixtureLighting.js');
const {
  findMFluorescentPanelVisualIndex,
  isMFluorescentPanelVisualName
} = await import('../.test-dist/src/renderer/fixtureVisualOwnership.js');
const { RENDER_DISTANCE_PROFILES } = await import('../.test-dist/src/renderer/renderSettings.js');
const { movementCollisionQueryBounds, SpatialAabbIndex } = await import('../.test-dist/src/renderer/runtimeSpatialIndex.js');
const { ARCH_HEADER_HEIGHT, ARCH_LOWER_HEIGHT } = await import('../.test-dist/src/world/gen3ArchitectureCore.js');
const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { CELL_SIZE, DEFAULT_TUNING, WALL_HEIGHT } = await import('../.test-dist/src/world/types.js');

function wall(overrides = {}) {
  return {
    id: 'wall',
    cx: 0,
    cy: WALL_HEIGHT / 2,
    cz: 0,
    sx: 2,
    sy: WALL_HEIGHT,
    sz: 0.28,
    orientation: 'z',
    drawable: true,
    materialId: 'arch-pale-wallpaper',
    ...overrides
  };
}

function collider(id, minX, minZ, maxX, maxZ) {
  return { id, minX, minZ, maxX, maxZ };
}

function forcedCell(seed, x, z, region, condition = 'clear') {
  return generateCell({
    seed,
    x,
    z,
    worldDay: 40,
    exposure: 10,
    shiftEpoch: 0,
    generationVersion: 'gen3-v1',
    tuning: {
      ...DEFAULT_TUNING,
      regionOverride: region,
      conditionOverride: condition,
      carverOverride: 'none',
      structureOverride: 'none',
      gateBypass: true
    }
  });
}

function findFixtureCell(region) {
  const seed = `cleanup-wave0-fixtures:${region}`;
  for (let x = -4; x <= 4; x += 1) {
    for (let z = -4; z <= 4; z += 1) {
      const descriptor = forcedCell(seed, x, z, region);
      if (descriptor.lightGroups.some((group) => group.fixtures.length > 0)) return descriptor;
    }
  }
  assert.fail(`No fixture-bearing ${region} Cell found in deterministic Wave 0 sample`);
}

test('A-A1 semantic structural roles preserve the current final collision contract independently of renderer entity names', () => {
  const upper = wall({
    id: 'semantic-upper',
    cy: WALL_HEIGHT - ARCH_HEADER_HEIGHT / 2,
    sy: ARCH_HEADER_HEIGHT
  });
  const lower = wall({
    id: 'semantic-lower',
    cy: ARCH_LOWER_HEIGHT / 2,
    sy: ARCH_LOWER_HEIGHT
  });
  const pierMinY = 0.1;
  const pierMaxY = WALL_HEIGHT - 0.05;
  const pier = wall({
    id: 'semantic-pier',
    cy: (pierMinY + pierMaxY) / 2,
    sy: pierMaxY - pierMinY
  });
  const normal = wall({ id: 'normal-level0-wall', materialId: 'level-0-wallpaper' });

  assert.equal(archStructuralRole(upper), 'upper');
  assert.equal(archStructuralRole(lower), 'lower-panel');
  assert.equal(archStructuralRole(pier), 'pier');
  assert.equal(archStructuralRole(normal), undefined);

  assert.equal(archSemanticWallOwnsFinalCollision(upper), false);
  assert.equal(archSemanticWallOwnsFinalCollision(lower), false);
  assert.equal(archSemanticWallOwnsFinalCollision(pier), true);
  assert.equal(archSemanticWallOwnsFinalCollision(normal), true);
});

test('A-A1-derived collision index replacement removes stale bounds and remains equivalent to the canonical brute-force resolver', () => {
  const index = new SpatialAabbIndex(CELL_SIZE);
  const lowerPanelId = 'arch-visible-lower-collider:0:0:arch-frame:lower-panel:z:wave0';
  const oldPanel = collider(lowerPanelId, -1.2, -0.25, 1.2, 0.25);
  const stablePier = collider('semantic-pier', 4.0, -1.0, 4.35, 1.0);
  index.add(oldPanel);
  index.add(stablePier);

  assert.deepEqual(index.query(-2, -1, 2, 1).map(({ id }) => id), [lowerPanelId]);

  index.remove(lowerPanelId);
  assert.equal(index.query(-2, -1, 2, 1).some(({ id }) => id === lowerPanelId), false);

  const replacement = collider(lowerPanelId, CELL_SIZE + 1.0, -0.25, CELL_SIZE + 3.0, 0.25);
  index.add(replacement);
  assert.equal(index.query(-2, -1, 2, 1).some(({ id }) => id === lowerPanelId), false);
  assert.deepEqual(index.query(CELL_SIZE, -1, CELL_SIZE + 4, 1).map(({ id }) => id), [lowerPanelId]);

  const all = [stablePier, replacement];
  const currentX = CELL_SIZE - 0.5;
  const currentZ = 0;
  const nextX = CELL_SIZE + 2.5;
  const nextZ = 0;
  const bounds = movementCollisionQueryBounds(currentX, currentZ, nextX, nextZ, 0.34);
  const candidates = index.query(bounds.minX, bounds.minZ, bounds.maxX, bounds.maxZ);
  const indexed = resolveCircleAgainstAabbs(currentX, currentZ, nextX, nextZ, candidates, 0.34);
  const brute = resolveCircleAgainstAabbs(currentX, currentZ, nextX, nextZ, all, 0.34);
  assert.deepEqual(indexed, brute);
});

test('M-F1 current fixture identity, nearest-selection budget surface, and active/shadow invariant stay characterized without changing policy', () => {
  assert.deepEqual(
    ['low', 'medium', 'high', 'ultra'].map((level) => RENDER_DISTANCE_PROFILES[level].lightShadowSafetyCeiling),
    [32, 64, 96, 128]
  );
  assert.equal(FIXTURE_LIGHTING_PROFILE.type, 'omni');
  assert.equal(FIXTURE_LIGHTING_PROFILE.maxActiveLights, 128);
  assert.equal(FIXTURE_LIGHTING_PROFILE.selectionMovementMeters, 0.25);
  assert.equal(FIXTURE_LIGHTING_PROFILE.castShadows, true);
  assert.equal(FIXTURE_LIGHTING_PROFILE.shadowCountPolicy, 'one-to-one-with-active-lights');
  assert.equal(FIXTURE_LIGHTING_PROFILE.distanceCeilingPolicy, '32-per-cell-radius-tier-up-to-128');

  for (const region of ['ordinary-level-0', 'pillar-field', 'arch-rooms']) {
    const descriptor = findFixtureCell(region);
    const panelAddresses = [];
    const expectedIds = [];
    for (const group of descriptor.lightGroups) {
      group.fixtures.forEach((fixture, fixtureIndex) => {
        const name = `${group.id}:fixture:${fixtureIndex}`;
        assert.equal(isMFluorescentPanelVisualName(name), true);
        panelAddresses.push({ name, x: fixture.x, z: fixture.z });
        expectedIds.push(`${group.id}:${fixtureIndex}`);
      });
    }
    assert.equal(new Set(expectedIds).size, expectedIds.length, `${region} fixture identity collision`);
    panelAddresses.forEach((panel, index) => {
      assert.equal(findMFluorescentPanelVisualIndex(panelAddresses, panel.x, panel.z), index);
    });

    const blackout = forcedCell(
      `cleanup-wave0-fixtures:${region}`,
      descriptor.address.cellX,
      descriptor.address.cellZ,
      region,
      'blackout'
    );
    assert.equal(blackout.lightGroups.length, 0, `${region} Blackout retained local M-F1 groups`);
  }
});

test('current Level 0 carpet resolver keeps distinct Ordinary, Pillar, and Arch presentation while carrying Condition identity', () => {
  const ordinary = forcedCell('cleanup-wave0-carpet', 0, 0, 'ordinary-level-0');
  const pillar = forcedCell('cleanup-wave0-carpet', 0, 0, 'pillar-field');
  const arch = forcedCell('cleanup-wave0-carpet', 0, 0, 'arch-rooms');

  const ordinaryPresentation = resolveCanonicalLevel0CarpetPresentation(ordinary);
  const pillarPresentation = resolveCanonicalLevel0CarpetPresentation(pillar);
  const archPresentation = resolveCanonicalLevel0CarpetPresentation(arch);

  assert.equal(ordinaryPresentation.region, 'ordinary-level-0');
  assert.equal(pillarPresentation.region, 'pillar-field');
  assert.equal(archPresentation.region, 'arch-rooms');
  assert.notDeepEqual(ordinaryPresentation.color, pillarPresentation.color);
  assert.notDeepEqual(ordinaryPresentation.color, archPresentation.color);
  assert.notDeepEqual(pillarPresentation.color, archPresentation.color);
  assert.equal(archPresentation.gloss, 0.11);
  assert.ok(ordinaryPresentation.conditionSignature.length > 0);
  assert.ok(pillarPresentation.conditionSignature.length > 0);
  assert.ok(archPresentation.conditionSignature.length > 0);
});
