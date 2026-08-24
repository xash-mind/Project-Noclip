import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const {
  STREAMING_SCHEDULER_PROFILE,
  predictiveVelocitySample,
  predictiveWarmCoordinates
} = await import('../.test-dist/src/renderer/streamingPolicy.js');
const { SpatialAabbIndex, SpatialPointIndex } = await import('../.test-dist/src/renderer/runtimeSpatialIndex.js');
const { resolveCircleAgainstAabbs } = await import('../.test-dist/src/physics/collision.js');
const schedulerSource = await readFile(new URL('../src/renderer/streamingScheduler.ts', import.meta.url), 'utf8');
const runtimeSource = await readFile(new URL('../src/renderer/runtimePerformance.ts', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');

const RATES = [30, 60, 90, 120, 144, 240];

function predictionForRate(rate, velocityX, velocityZ) {
  const dt = 1 / rate;
  const sample = predictiveVelocitySample(10, -4, 10 + velocityX * dt, -4 + velocityZ * dt, dt);
  return predictiveWarmCoordinates(3, -2, 3, sample.x, sample.z).map(({ x, z }) => `${x}:${z}`).sort();
}

for (const [label, vx, vz] of [
  ['walk', 0, -3.15],
  ['sprint', 5.15, 0],
  ['crouch', 0, 1.8],
  ['diagonal', 3.15 / Math.SQRT2, -3.15 / Math.SQRT2],
  ['slow-start', 0.2, 0],
  ['rapid-turn-moving', 0, 5.15],
  ['reversal', -5.15, 0]
]) {
  test(`predictive warming is refresh-rate independent for ${label}`, () => {
    const expected = predictionForRate(RATES[0], vx, vz);
    assert.ok(expected.length > 0);
    for (const rate of RATES.slice(1)) assert.deepEqual(predictionForRate(rate, vx, vz), expected, `${rate} Hz diverged`);
  });
}

test('predictive motion stops, reverses, and invalidates discontinuities without stale direction', () => {
  const stopped = predictiveVelocitySample(2, 3, 2, 3, 1 / 240);
  assert.deepEqual(stopped, { x: 0, z: 0, discontinuity: false });
  assert.deepEqual(predictiveWarmCoordinates(0, 0, 3, stopped.x, stopped.z), []);

  const forward = predictiveWarmCoordinates(0, 0, 3, 5.15, 0);
  const reverse = predictiveWarmCoordinates(0, 0, 3, -5.15, 0);
  assert.ok(forward.every((coordinate) => coordinate.x === 4));
  assert.ok(reverse.every((coordinate) => coordinate.x === -4));

  const teleport = predictiveVelocitySample(0, 0, STREAMING_SCHEDULER_PROFILE.predictiveDiscontinuityMeters + 10, 0, 1 / 60);
  assert.equal(teleport.discontinuity, true);
  assert.equal(teleport.x, 0);
  assert.equal(teleport.z, 0);
  assert.ok(schedulerSource.includes('resetPrediction(game);'), 'force/Region Locate reconcile must reset predictive state');
  assert.ok(schedulerSource.includes('clearPredictiveJobs(scheduler);'), 'stale predictive queue work must be cancelled');
});

test('scheduler selects an eligible heavy job without constructing and globally sorting an eligible array', () => {
  assert.equal(schedulerSource.includes("const eligible = [...scheduler.jobs.values()]"), false);
  assert.ok(schedulerSource.includes('for (const candidate of scheduler.jobs.values())'));
  assert.ok(schedulerSource.includes('predictiveVelocitySample(scheduler.lastX, scheduler.lastZ, position.x, position.z, dt)'));
});

function collider(id, minX, minZ, maxX, maxZ) {
  return { id, minX, minZ, maxX, maxZ };
}

function indexedResolve(index, all, currentX, currentZ, nextX, nextZ, radius = 0.34) {
  const candidates = index.query(
    Math.min(currentX, nextX) - radius - 0.001,
    Math.min(currentZ, nextZ) - radius - 0.001,
    Math.max(currentX, nextX) + radius + 0.001,
    Math.max(currentZ, nextZ) + radius + 0.001
  );
  return {
    candidates,
    indexed: resolveCircleAgainstAabbs(currentX, currentZ, nextX, nextZ, candidates, radius),
    brute: resolveCircleAgainstAabbs(currentX, currentZ, nextX, nextZ, all, radius)
  };
}

function assertSamePosition(left, right, tolerance = 1e-9) {
  assert.ok(Math.abs(left[0] - right[0]) <= tolerance, `x ${left[0]} != ${right[0]}`);
  assert.ok(Math.abs(left[1] - right[1]) <= tolerance, `z ${left[1]} != ${right[1]}`);
}

test('indexed collision preserves canonical wall impact, slide, corner, T-junction and narrow-connector results', () => {
  const walls = [
    collider('east-wall', 2, -6, 2.25, 6),
    collider('north-wall', -6, -2.25, 6, -2),
    collider('t-stem', -0.15, -2, 0.15, 3),
    collider('connector-left', -2, 3, -0.7, 3.25),
    collider('connector-right', 0.7, 3, 2, 3.25),
    collider('remote-cell-wall', 42, 42, 45, 45)
  ];
  const index = new SpatialAabbIndex(14);
  walls.forEach((wall) => index.add(wall));
  const motions = [
    [0, 0, 3, 0],
    [1.4, 1.5, 3, 2.5],
    [1.4, -1.4, 3, -3],
    [-1, 1, 1, 1],
    [0, 4, 0, 2.5],
    [-4, -4, 4, 4]
  ];
  for (const motion of motions) {
    const result = indexedResolve(index, walls, ...motion);
    assertSamePosition(result.indexed, result.brute);
    assert.ok(result.candidates.length < walls.length, 'remote collider should not enter local movement query');
  }
});

test('indexed collision is equivalent to brute force across randomized generated-style samples', () => {
  let state = 0x51f15e;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const walls = [];
  for (let cellX = -4; cellX <= 4; cellX += 1) {
    for (let cellZ = -4; cellZ <= 4; cellZ += 1) {
      for (let n = 0; n < 5; n += 1) {
        const cx = cellX * 14 + (random() - 0.5) * 11;
        const cz = cellZ * 14 + (random() - 0.5) * 11;
        const sx = 0.2 + random() * 4;
        const sz = 0.2 + random() * 4;
        walls.push(collider(`${cellX}:${cellZ}:${n}`, cx - sx / 2, cz - sz / 2, cx + sx / 2, cz + sz / 2));
      }
    }
  }
  const index = new SpatialAabbIndex(14);
  walls.forEach((wall) => index.add(wall));
  for (let sample = 0; sample < 1000; sample += 1) {
    const currentX = (random() - 0.5) * 70;
    const currentZ = (random() - 0.5) * 70;
    const nextX = currentX + (random() - 0.5) * 1.2;
    const nextZ = currentZ + (random() - 0.5) * 1.2;
    const result = indexedResolve(index, walls, currentX, currentZ, nextX, nextZ);
    assertSamePosition(result.indexed, result.brute, 1e-8);
  }
});

test('spatial indexes update cleanly for Cell refresh/unload semantics and nearby interaction queries', () => {
  const bounds = new SpatialAabbIndex(14);
  bounds.add(collider('wall', -1, -1, 1, 1));
  assert.equal(bounds.query(-2, -2, 2, 2).length, 1);
  bounds.remove('wall');
  assert.equal(bounds.query(-2, -2, 2, 2).length, 0);
  bounds.add(collider('wall', 20, 20, 21, 21));
  assert.equal(bounds.query(-2, -2, 2, 2).length, 0);
  assert.equal(bounds.query(19, 19, 22, 22).length, 1);

  const points = new SpatialPointIndex(14);
  points.add({ id: 'near', x: 1, z: 1 });
  points.add({ id: 'far', x: 40, z: 40 });
  assert.deepEqual(points.queryRadius(0, 0, 2).map(({ id }) => id), ['near']);
  points.remove('near');
  assert.equal(points.queryRadius(0, 0, 2).length, 0);
});

test('production installs indexes over WorldRenderer hot paths without changing accepted quality controls', () => {
  assert.ok(mainSource.includes('installRuntimePerformance();'));
  assert.ok(runtimeSource.includes('SpatialAabbIndex<WorldWall>(CELL_SIZE)'));
  assert.ok(runtimeSource.includes('SpatialPointIndex<InteractionVisual>(CELL_SIZE)'));
  assert.ok(runtimeSource.includes('state.dynamicItems.values()'));
  assert.ok(runtimeSource.includes('resolveCircleAgainstAabbs(currentX, currentZ, nextX, nextZ, candidates, radius)'));
  for (const forbidden of ['renderScale', 'postProcessing', 'MAX_ACTIVE_FIXTURE_LIGHTS', 'movement speed', 'generationVersion']) {
    assert.equal(runtimeSource.includes(forbidden), false, `performance index layer must not tune ${forbidden}`);
  }
});
