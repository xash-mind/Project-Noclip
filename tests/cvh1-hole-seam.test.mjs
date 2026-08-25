import assert from 'node:assert/strict';
import test from 'node:test';

const { cvh1FloorSurfaceMesh, cvh1FloorSurfaceProfile } = await import('../.test-dist/src/renderer/WorldRenderer.js');
const { canonicalLevel0CarpetUv, resolveCanonicalLevel0CarpetPresentation } = await import('../.test-dist/src/renderer/finalLevel0MaterialPresentation.js');
const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { CELL_SIZE, DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');

const EPSILON = 1e-7;

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

function forcedCell(seed, x, z, region = 'ordinary-level-0', carverOverride = 'floor-hole-cluster') {
  return generateCell({
    seed,
    x,
    z,
    worldDay: 40,
    exposure: 10,
    shiftEpoch: 0,
    tuning: {
      ...DEFAULT_TUNING,
      regionOverride: region,
      conditionOverride: 'clear',
      carverOverride,
      structureOverride: 'none',
      gateBypass: true
    },
    generationVersion: 'gen3-v1'
  });
}

function forcedHoleCell(seed, x, z, region = 'ordinary-level-0') {
  return forcedCell(seed, x, z, region, 'floor-hole-cluster');
}

function findForcedHoleCell(region) {
  const seed = `cvh1-region-floor:${region}`;
  for (let x = -3; x <= 3; x += 1) for (let z = -3; z <= 3; z += 1) {
    const descriptor = forcedHoleCell(seed, x, z, region);
    if (descriptor.floorPatches.some((patch) => patch.kind === 'hole')) return { seed, x, z, descriptor };
  }
  assert.fail(`forced CV-H1 ${region} sample emitted no Hole patches`);
}

function vertex(mesh, index) {
  return {
    x: mesh.positions[index * 3],
    y: mesh.positions[index * 3 + 1],
    z: mesh.positions[index * 3 + 2],
    u: mesh.uvs[index * 2],
    v: mesh.uvs[index * 2 + 1]
  };
}

function triangleArea(mesh, aIndex, bIndex, cIndex) {
  const a = vertex(mesh, aIndex);
  const b = vertex(mesh, bIndex);
  const c = vertex(mesh, cIndex);
  return Math.abs(
    a.x * (b.z - c.z)
    + b.x * (c.z - a.z)
    + c.x * (a.z - b.z)
  ) / 2;
}

function edgeKey(left, right) {
  return left < right ? `${left}:${right}` : `${right}:${left}`;
}

function close(left, right) {
  return Math.abs(left - right) <= EPSILON;
}

function wrap01(value) {
  return ((value % 1) + 1) % 1;
}

function segmentWithin(valueA, valueB, min, max) {
  return Math.min(valueA, valueB) >= min - EPSILON && Math.max(valueA, valueB) <= max + EPSILON;
}

function edgeOnAllowedBoundary(mesh, leftIndex, rightIndex, patches) {
  const half = CELL_SIZE / 2;
  const left = vertex(mesh, leftIndex);
  const right = vertex(mesh, rightIndex);
  if ((close(left.x, -half) && close(right.x, -half)) || (close(left.x, half) && close(right.x, half))) return true;
  if ((close(left.z, -half) && close(right.z, -half)) || (close(left.z, half) && close(right.z, half))) return true;
  for (const patch of patches) {
    const box = bounds(patch);
    if (
      ((close(left.x, box.minX) && close(right.x, box.minX)) || (close(left.x, box.maxX) && close(right.x, box.maxX)))
      && segmentWithin(left.z, right.z, box.minZ, box.maxZ)
    ) return true;
    if (
      ((close(left.z, box.minZ) && close(right.z, box.minZ)) || (close(left.z, box.maxZ) && close(right.z, box.maxZ)))
      && segmentWithin(left.x, right.x, box.minX, box.maxX)
    ) return true;
  }
  return false;
}

function assertWatertightTop(mesh, patches) {
  const edgeCounts = new Map();
  for (let index = 0; index < mesh.indices.length; index += 3) {
    const triangle = [mesh.indices[index], mesh.indices[index + 1], mesh.indices[index + 2]];
    for (const [left, right] of [[triangle[0], triangle[1]], [triangle[1], triangle[2]], [triangle[2], triangle[0]]]) {
      const key = edgeKey(left, right);
      const existing = edgeCounts.get(key) ?? { count: 0, left, right };
      existing.count += 1;
      edgeCounts.set(key, existing);
    }
  }
  for (const edge of edgeCounts.values()) {
    assert.ok(edge.count === 1 || edge.count === 2, `unexpected edge multiplicity ${edge.count}`);
    if (edge.count === 1) {
      assert.equal(
        edgeOnAllowedBoundary(mesh, edge.left, edge.right, patches),
        true,
        `unpaired internal floor edge ${edge.left}:${edge.right} could expose a render-grid seam`
      );
    }
  }
}

test('CV-H1 non-Hole carpet is one coplanar watertight indexed surface with no handoff, side or material-tiling ownership', () => {
  const patches = [
    hole('northwest', -2.2, -1.8, 1.8, 2.0),
    hole('southeast', 2.1, 2.0, 2.2, 1.6)
  ];
  const mesh = cvh1FloorSurfaceMesh(patches);
  const profile = cvh1FloorSurfaceProfile();
  const expectedArea = CELL_SIZE * CELL_SIZE - patches.reduce((sum, patch) => sum + patch.scale.x * patch.scale.z, 0);

  assert.equal(profile.strategy, 'single-indexed-planar-mesh');
  assert.equal(profile.topY, 0);
  assert.equal(profile.renderEntitiesPerHoleCell, 1);
  assert.equal(profile.internalSideFaces, false);
  assert.equal(profile.handoffGeometry, false);
  assert.equal('materialTiling' in profile, false, 'CV-H1 must not own canonical carpet material tiling');
  assert.ok(mesh.indices.length > 0);
  assert.equal(mesh.positions.length % 3, 0);
  assert.equal(mesh.normals.length, mesh.positions.length);
  assert.equal(mesh.uvs.length, mesh.positions.length / 3 * 2);
  assert.ok(Math.abs(mesh.visibleArea - expectedArea) <= 1e-8, `${mesh.visibleArea} != ${expectedArea}`);

  let triangleAreaSum = 0;
  for (let index = 0; index < mesh.indices.length; index += 3) {
    triangleAreaSum += triangleArea(mesh, mesh.indices[index], mesh.indices[index + 1], mesh.indices[index + 2]);
  }
  assert.ok(Math.abs(triangleAreaSum - expectedArea) <= 1e-8, `${triangleAreaSum} != ${expectedArea}`);
  for (let index = 0; index < mesh.positions.length / 3; index += 1) {
    const point = vertex(mesh, index);
    assert.equal(point.y, 0, `floor vertex ${index} left the common top plane`);
    assert.deepEqual(mesh.normals.slice(index * 3, index * 3 + 3), [0, 1, 0]);
  }
  assertWatertightTop(mesh, patches);
});

test('CV-H1 mesh UV basis is continuous through internal triangulation and exactly periodic at Cell borders', () => {
  const patches = [hole('center', 0, 0, 2.4, 2.0)];
  const mesh = cvh1FloorSurfaceMesh(patches);
  const profile = cvh1FloorSurfaceProfile();
  const half = CELL_SIZE / 2;

  for (let index = 0; index < mesh.positions.length / 3; index += 1) {
    const point = vertex(mesh, index);
    const expectedU = (point.x + half) / profile.carpetRepeatMeters;
    const expectedV = (point.z + half) / profile.carpetRepeatMeters;
    assert.ok(Math.abs(point.u - expectedU) <= EPSILON);
    assert.ok(Math.abs(point.v - expectedV) <= EPSILON);
  }

  const west = [...Array(mesh.positions.length / 3).keys()].map((index) => vertex(mesh, index)).filter((point) => close(point.x, -half));
  const east = [...Array(mesh.positions.length / 3).keys()].map((index) => vertex(mesh, index)).filter((point) => close(point.x, half));
  const north = [...Array(mesh.positions.length / 3).keys()].map((index) => vertex(mesh, index)).filter((point) => close(point.z, -half));
  const south = [...Array(mesh.positions.length / 3).keys()].map((index) => vertex(mesh, index)).filter((point) => close(point.z, half));
  assert.ok(west.length > 0 && east.length > 0 && north.length > 0 && south.length > 0);
  for (const point of west) assert.ok(close(wrap01(point.u), 0));
  for (const point of east) assert.ok(close(wrap01(point.u), 0));
  for (const point of north) assert.ok(close(wrap01(point.v), 0));
  for (const point of south) assert.ok(close(wrap01(point.v), 0));
});

test('canonical M-C1 UV transform gives CV-H1 exactly the same world frequency and phase as a full Region floor', () => {
  const { descriptor } = findForcedHoleCell('pillar-field');
  const presentation = resolveCanonicalLevel0CarpetPresentation(descriptor);
  const profile = cvh1FloorSurfaceProfile();
  const full = canonicalLevel0CarpetUv(descriptor, presentation.patternSizeMeters, 'full-floor');
  const cut = canonicalLevel0CarpetUv(descriptor, presentation.patternSizeMeters, 'cvh1-indexed');
  const bakedRepeatsPerCell = CELL_SIZE / profile.carpetRepeatMeters;

  assert.deepEqual(cut.offset, full.offset);
  assert.ok(close(bakedRepeatsPerCell * cut.tiling[0], full.tiling[0]));
  assert.ok(close(bakedRepeatsPerCell * cut.tiling[1], full.tiling[1]));

  const half = CELL_SIZE / 2;
  for (const local of [-half, -3.1, 0, 2.75, half]) {
    const cutBasis = (local + half) / profile.carpetRepeatMeters;
    const fullBasis = (local + half) / CELL_SIZE;
    assert.ok(close(wrap01(cutBasis * cut.tiling[0] + cut.offset[0]), wrap01(fullBasis * full.tiling[0] + full.offset[0])));
    assert.ok(close(wrap01(cutBasis * cut.tiling[1] + cut.offset[1]), wrap01(fullBasis * full.tiling[1] + full.offset[1])));
  }

  const eastDescriptor = {
    ...descriptor,
    address: { ...descriptor.address, cellX: descriptor.address.cellX + 1 }
  };
  const eastCut = canonicalLevel0CarpetUv(eastDescriptor, presentation.patternSizeMeters, 'cvh1-indexed');
  const currentEastPhase = wrap01(bakedRepeatsPerCell * cut.tiling[0] + cut.offset[0]);
  const neighborWestPhase = wrap01(eastCut.offset[0]);
  assert.ok(close(currentEastPhase, neighborWestPhase), `${currentEastPhase} != ${neighborWestPhase}`);
});

test('CV-H1 floor presentation stays owned by Ordinary, Pillar and Arch Region truth', () => {
  const evidence = new Map();
  for (const region of ['ordinary-level-0', 'pillar-field', 'arch-rooms']) {
    const { seed, x, z, descriptor: holeDescriptor } = findForcedHoleCell(region);
    const plainDescriptor = forcedCell(seed, x, z, region, 'none');
    const holePresentation = resolveCanonicalLevel0CarpetPresentation(holeDescriptor);
    const plainPresentation = resolveCanonicalLevel0CarpetPresentation(plainDescriptor);

    assert.ok(holeDescriptor.floorPatches.some((patch) => patch.kind === 'hole'));
    assert.equal(plainDescriptor.floorPatches.some((patch) => patch.kind === 'hole'), false);
    assert.equal(holeDescriptor.world.regionId, region);
    assert.equal(plainDescriptor.world.regionId, region);
    assert.deepEqual(holePresentation, plainPresentation, `${region} Hole changed its underlying floor presentation`);
    evidence.set(region, holePresentation);
  }

  assert.notDeepEqual(evidence.get('pillar-field').color, evidence.get('ordinary-level-0').color, 'Pillar Hole leaked Ordinary carpet tint');
  assert.notDeepEqual(evidence.get('arch-rooms').color, evidence.get('ordinary-level-0').color, 'Arch Hole leaked Ordinary carpet tint');
  assert.equal(evidence.get('arch-rooms').gloss, 0.11);
});

test('CV-H1 uses the same canonical Condition-bearing floor path instead of replacing Condition truth', () => {
  const { descriptor } = findForcedHoleCell('arch-rooms');
  for (const conditionId of ['damp-carpet', 'deep-wet-carpet', 'shallow-dry-carpet']) {
    const conditionedHole = {
      ...descriptor,
      world: { ...descriptor.world, conditionIds: [conditionId] }
    };
    const conditionedPlain = {
      ...descriptor,
      floorPatches: descriptor.floorPatches.filter((patch) => patch.kind !== 'hole'),
      world: { ...descriptor.world, carverIds: [], conditionIds: [conditionId] }
    };
    const holePresentation = resolveCanonicalLevel0CarpetPresentation(conditionedHole);
    const plainPresentation = resolveCanonicalLevel0CarpetPresentation(conditionedPlain);
    assert.deepEqual(holePresentation, plainPresentation);
    assert.equal(holePresentation.conditionSignature, conditionId);
  }
});

test('CV-H1 touching semantic apertures remain one continuous opening without carpet triangles on their shared join', () => {
  const patches = [
    hole('left', -1, 0, 2),
    hole('right', 1, 0, 2)
  ];
  const mesh = cvh1FloorSurfaceMesh(patches);
  const expectedArea = CELL_SIZE * CELL_SIZE - 8;
  assert.ok(Math.abs(mesh.visibleArea - expectedArea) <= 1e-8);
  assertWatertightTop(mesh, patches);

  for (let index = 0; index < mesh.indices.length; index += 3) {
    const points = [
      vertex(mesh, mesh.indices[index]),
      vertex(mesh, mesh.indices[index + 1]),
      vertex(mesh, mesh.indices[index + 2])
    ];
    const centerX = points.reduce((sum, point) => sum + point.x, 0) / 3;
    const centerZ = points.reduce((sum, point) => sum + point.z, 0) / 3;
    for (const patch of patches) {
      const box = bounds(patch);
      const inside = centerX > box.minX + EPSILON && centerX < box.maxX - EPSILON
        && centerZ > box.minZ + EPSILON && centerZ < box.maxZ - EPSILON;
      assert.equal(inside, false, `carpet triangle entered semantic Hole ${patch.id}`);
    }
  }
});

test('current CV-H1 grammar remains deterministic, Cell-local and geometrically unchanged by the coherent floor mesh', () => {
  const half = CELL_SIZE / 2;
  let sampledHoles = 0;
  for (let cellX = -2; cellX <= 2; cellX += 1) for (let cellZ = -2; cellZ <= 2; cellZ += 1) {
    const first = forcedHoleCell('cvh1-floor-coherence', cellX, cellZ);
    const second = forcedHoleCell('cvh1-floor-coherence', cellX, cellZ);
    const holes = first.floorPatches.filter((patch) => patch.kind === 'hole');
    assert.deepEqual(holes, second.floorPatches.filter((patch) => patch.kind === 'hole'));
    sampledHoles += holes.length;

    let semanticHoleArea = 0;
    for (const patch of holes) {
      const box = bounds(patch);
      assert.ok(box.minX >= -half - EPSILON && box.maxX <= half + EPSILON);
      assert.ok(box.minZ >= -half - EPSILON && box.maxZ <= half + EPSILON);
      semanticHoleArea += patch.scale.x * patch.scale.z;
    }
    for (let leftIndex = 0; leftIndex < holes.length; leftIndex += 1) {
      const left = bounds(holes[leftIndex]);
      for (let rightIndex = leftIndex + 1; rightIndex < holes.length; rightIndex += 1) {
        const right = bounds(holes[rightIndex]);
        const separatedX = left.maxX < right.minX - EPSILON || right.maxX < left.minX - EPSILON;
        const separatedZ = left.maxZ < right.minZ - EPSILON || right.maxZ < left.minZ - EPSILON;
        assert.ok(separatedX || separatedZ, 'generator unexpectedly changed CV-H1 Hole spacing');
      }
    }

    const mesh = cvh1FloorSurfaceMesh(holes);
    assert.ok(Math.abs(mesh.visibleArea - (CELL_SIZE * CELL_SIZE - semanticHoleArea)) <= 1e-8);
    assertWatertightTop(mesh, holes);
  }
  assert.ok(sampledHoles > 0, 'forced CV-H1 sample emitted no Hole patches');
});
