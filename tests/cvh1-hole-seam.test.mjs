import assert from 'node:assert/strict';
import test from 'node:test';

const { cvh1FloorSeamHandoffProfile, cvh1SegmentedFloorLayout } = await import('../.test-dist/src/renderer/WorldRenderer.js');
const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { CELL_SIZE, DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');

function hole(id, x, z, sx, sz = sx) {
  return {
    id,
    position: { x, y: 0.004, z },
    scale: { x: sx, y: 0.008, z: sz },
    kind: 'hole'
  };
}

function bounds(patch) {
  return {
    minX: patch.position.x - patch.scale.x / 2,
    maxX: patch.position.x + patch.scale.x / 2,
    minZ: patch.position.z - patch.scale.z / 2,
    maxZ: patch.position.z + patch.scale.z / 2
  };
}

function pointInsideHole(x, z, patch, epsilon = 1e-7) {
  const box = bounds(patch);
  return x > box.minX + epsilon && x < box.maxX - epsilon && z > box.minZ + epsilon && z < box.maxZ - epsilon;
}

function seamCrossesHoleInterior(seam, patch) {
  const box = bounds(patch);
  if (seam.axis === 'x') {
    if (!(seam.fixed > box.minX + 1e-7 && seam.fixed < box.maxX - 1e-7)) return false;
    return Math.min(seam.end, box.maxZ) - Math.max(seam.start, box.minZ) > 1e-7;
  }
  if (!(seam.fixed > box.minZ + 1e-7 && seam.fixed < box.maxZ - 1e-7)) return false;
  return Math.min(seam.end, box.maxX) - Math.max(seam.start, box.minX) > 1e-7;
}

function forcedHoleCell(seed, x, z) {
  return generateCell({
    seed,
    x,
    z,
    worldDay: 40,
    exposure: 10,
    shiftEpoch: 0,
    tuning: {
      ...DEFAULT_TUNING,
      regionOverride: 'ordinary-level-0',
      conditionOverride: 'clear',
      carverOverride: 'floor-hole-cluster',
      structureOverride: 'none',
      gateBypass: true
    },
    generationVersion: 'gen3-v1'
  });
}

test('CV-H1 segmented carpet gives every render-grid join a recessed deterministic handoff', () => {
  const patches = [hole('center', 0, 0, 2)];
  const layout = cvh1SegmentedFloorLayout(patches);
  const profile = cvh1FloorSeamHandoffProfile();

  assert.ok(layout.pieces.length > 1);
  assert.ok(layout.seams.length > 0);
  assert.equal(profile.width, 0.012);
  assert.ok(profile.topInset > 0);
  assert.ok(profile.topInset < 0.01);

  for (const seam of layout.seams) {
    const midpoint = (seam.start + seam.end) / 2;
    const x = seam.axis === 'x' ? seam.fixed : midpoint;
    const z = seam.axis === 'z' ? seam.fixed : midpoint;
    assert.equal(pointInsideHole(x, z, patches[0]), false, `handoff crossed the semantic Hole at ${seam.axis}:${seam.fixed}`);
  }
  assert.ok(layout.seams.length <= layout.pieces.length * 4, `${layout.seams.length} handoffs for ${layout.pieces.length} floor pieces`);
});

test('CV-H1 touching semantic openings do not regain a floor sliver or seam filler at their join', () => {
  const patches = [
    hole('left', -1, 0, 2),
    hole('right', 1, 0, 2)
  ];
  const layout = cvh1SegmentedFloorLayout(patches);

  for (const piece of layout.pieces) {
    for (const patch of patches) {
      const box = bounds(patch);
      const overlapX = Math.min(piece.maxX, box.maxX) - Math.max(piece.minX, box.minX);
      const overlapZ = Math.min(piece.maxZ, box.maxZ) - Math.max(piece.minZ, box.minZ);
      assert.ok(overlapX <= 1e-7 || overlapZ <= 1e-7, `${patch.id} regained a floor piece`);
    }
  }
  for (const seam of layout.seams) {
    assert.equal(seamCrossesHoleInterior(seam, patches[0]), false);
    assert.equal(seamCrossesHoleInterior(seam, patches[1]), false);
    const crossesSharedJoin = seam.axis === 'x'
      && Math.abs(seam.fixed) <= 1e-7
      && Math.min(seam.end, 1) - Math.max(seam.start, -1) > 1e-7;
    assert.equal(crossesSharedJoin, false, 'renderer seam filler bridged the continuous opening');
  }
});

test('current CV-H1 grammar keeps semantic Hole patches Cell-local and intentionally separated', () => {
  const half = CELL_SIZE / 2;
  let sampledHoles = 0;
  for (let cellX = -2; cellX <= 2; cellX += 1) for (let cellZ = -2; cellZ <= 2; cellZ += 1) {
    const first = forcedHoleCell('cvh1-seam-grammar', cellX, cellZ);
    const second = forcedHoleCell('cvh1-seam-grammar', cellX, cellZ);
    const holes = first.floorPatches.filter((patch) => patch.kind === 'hole');
    assert.deepEqual(holes, second.floorPatches.filter((patch) => patch.kind === 'hole'));
    sampledHoles += holes.length;

    for (const patch of holes) {
      const box = bounds(patch);
      assert.ok(box.minX >= -half - 1e-9 && box.maxX <= half + 1e-9);
      assert.ok(box.minZ >= -half - 1e-9 && box.maxZ <= half + 1e-9);
    }
    for (let leftIndex = 0; leftIndex < holes.length; leftIndex += 1) {
      const left = bounds(holes[leftIndex]);
      for (let rightIndex = leftIndex + 1; rightIndex < holes.length; rightIndex += 1) {
        const right = bounds(holes[rightIndex]);
        const separatedX = left.maxX < right.minX - 1e-6 || right.maxX < left.minX - 1e-6;
        const separatedZ = left.maxZ < right.minZ - 1e-6 || right.maxZ < left.minZ - 1e-6;
        assert.ok(separatedX || separatedZ, 'current generator unexpectedly emitted touching/overlapping Hole patches');
      }
    }

    const layout = cvh1SegmentedFloorLayout(holes);
    for (const seam of layout.seams) for (const patch of holes) {
      assert.equal(seamCrossesHoleInterior(seam, patch), false, `handoff crossed generated Hole ${patch.id}`);
    }
    assert.ok(layout.seams.length <= Math.max(4, layout.pieces.length * 4));
  }
  assert.ok(sampledHoles > 0, 'forced CV-H1 sample emitted no Hole patches');
});
