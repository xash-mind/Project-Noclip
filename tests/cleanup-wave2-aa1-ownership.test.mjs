import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const { resolveCircleAgainstAabbs } = await import('../.test-dist/src/physics/collision.js');
const {
  ARCH_LOWER_PANEL_COLLIDER_PREFIX,
  realizeNearbyArchCollision
} = await import('../.test-dist/src/renderer/archDividerCollision.js');
const {
  installRuntimePerformance,
  refreshRuntimeCellCollisionState,
  registerRuntimeCellState,
  runtimePerformanceDiagnosticsSnapshot,
  unregisterRuntimeCellState
} = await import('../.test-dist/src/renderer/runtimePerformance.js');
const { WorldRenderer } = await import('../.test-dist/src/renderer/WorldRenderer.js');
const {
  ARCH_LOWER_PANEL_DEPTH,
  ARCH_LOWER_PANEL_HEIGHT,
  archFrameBaysForDescriptors,
  archLowerPanelWorldVolumeForCell,
  archSemanticWallOwnsFinalCollision,
  archStructuralRole
} = await import('../.test-dist/src/world/gen3ArchDividerSemantics.js');
const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { CELL_SIZE, DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');

const semanticSource = await readFile(new URL('../src/world/gen3ArchDividerSemantics.ts', import.meta.url), 'utf8');
const presentationSource = await readFile(new URL('../src/renderer/level0RegionPresentation.ts', import.meta.url), 'utf8');
const collisionSource = await readFile(new URL('../src/renderer/archDividerCollision.ts', import.meta.url), 'utf8');

function archCell(seed, x, z) {
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
      regionOverride: 'arch-rooms',
      conditionOverride: 'clear',
      carverOverride: 'none',
      structureOverride: 'none',
      gateBypass: true
    }
  });
}

function archWindow(seed, radius = 3) {
  const descriptors = [];
  for (let x = -radius; x <= radius; x += 1) {
    for (let z = -radius; z <= radius; z += 1) descriptors.push(archCell(seed, x, z));
  }
  return descriptors;
}

function representativeArchWindow() {
  for (let index = 0; index < 12; index += 1) {
    const descriptors = archWindow(`cleanup-wave2-aa1-${index}`);
    const bays = archFrameBaysForDescriptors(descriptors);
    if (bays.some((bay) => !bay.route) && bays.some((bay) => bay.route)) return { descriptors, bays };
  }
  assert.fail('no deterministic representative Arch window contained both route and lower-panel bays');
}

function colliderFromWall(descriptor, wall) {
  const originX = descriptor.address.cellX * CELL_SIZE;
  const originZ = descriptor.address.cellZ * CELL_SIZE;
  const cx = originX + wall.cx;
  const cz = originZ + wall.cz;
  return {
    id: wall.id,
    cellId: descriptor.id,
    shiftEpoch: descriptor.address.shiftEpoch,
    minX: cx - wall.sx / 2,
    maxX: cx + wall.sx / 2,
    minY: wall.cy - wall.sy / 2,
    maxY: wall.cy + wall.sy / 2,
    minZ: cz - wall.sz / 2,
    maxZ: cz + wall.sz / 2,
    cx,
    cy: wall.cy,
    cz,
    sx: wall.sx,
    sy: wall.sy,
    sz: wall.sz,
    orientation: wall.orientation,
    drawable: wall.drawable
  };
}

function visualFromDescriptor(descriptor) {
  return {
    descriptor,
    colliders: descriptor.walls.map((wall) => colliderFromWall(descriptor, wall)),
    interactions: [],
    get root() {
      throw new Error('A-A1 canonical collision must not inspect presentation root/entity state');
    }
  };
}

function rendererFor(descriptors) {
  const loaded = new Map();
  const walls = new Map();
  for (const descriptor of descriptors) {
    const visual = visualFromDescriptor(descriptor);
    loaded.set(descriptor.id, visual);
    for (const collider of visual.colliders) walls.set(collider.id, collider);
  }
  return { loaded, walls, interactions: new Map() };
}

function canonicalizeAll(renderer, descriptors) {
  for (const descriptor of descriptors) realizeNearbyArchCollision(renderer, descriptor);
}

function colliderSignature(collider) {
  return {
    id: collider.id,
    cellId: collider.cellId,
    minX: collider.minX,
    maxX: collider.maxX,
    minY: collider.minY,
    maxY: collider.maxY,
    minZ: collider.minZ,
    maxZ: collider.maxZ,
    orientation: collider.orientation,
    drawable: collider.drawable
  };
}

function expectedLowerColliderSignature(descriptor, volume) {
  const along = (volume.start + volume.end) / 2;
  const length = volume.end - volume.start;
  const cx = volume.orientation === 'z' ? along : volume.fixed;
  const cz = volume.orientation === 'z' ? volume.fixed : along;
  const sx = volume.orientation === 'z' ? length : volume.depth;
  const sz = volume.orientation === 'z' ? volume.depth : length;
  return {
    id: `${ARCH_LOWER_PANEL_COLLIDER_PREFIX}${descriptor.id}:arch-frame:lower-panel:${volume.bayId}`,
    cellId: descriptor.id,
    minX: cx - sx / 2,
    maxX: cx + sx / 2,
    minY: volume.minY,
    maxY: volume.maxY,
    minZ: cz - sz / 2,
    maxZ: cz + sz / 2,
    orientation: volume.orientation,
    drawable: true
  };
}

function samePoint(left, right, epsilon = 1e-10) {
  return Math.abs(left[0] - right[0]) <= epsilon && Math.abs(left[1] - right[1]) <= epsilon;
}

function indexedAndBrute(renderer, currentX, currentZ, nextX, nextZ, radius = 0.34) {
  const indexed = WorldRenderer.prototype.resolveMovement.call(renderer, currentX, currentZ, nextX, nextZ, radius);
  const brute = resolveCircleAgainstAabbs(currentX, currentZ, nextX, nextZ, [...renderer.walls.values()], radius);
  assert.deepEqual(indexed, brute, `indexed/brute mismatch ${currentX},${currentZ} -> ${nextX},${nextZ}`);
  return indexed;
}

function crossingFor(collider, overshoot = 0.55) {
  const radius = 0.34;
  if (collider.orientation === 'z') {
    return {
      start: [collider.cx, collider.minZ - radius - 0.20],
      next: [collider.cx, collider.maxZ + radius + overshoot]
    };
  }
  return {
    start: [collider.minX - radius - 0.20, collider.cz],
    next: [collider.maxX + radius + overshoot, collider.cz]
  };
}

function routeCrossing(bay) {
  const center = (bay.start + bay.end) / 2;
  if (bay.orientation === 'z') return { start: [center, bay.fixed - 0.62], next: [center, bay.fixed + 0.62] };
  return { start: [bay.fixed - 0.62, center], next: [bay.fixed + 0.62, center] };
}

test('one canonical world A-A1 owner supplies structural roles and presentation consumes it without descriptor mutation', () => {
  const { descriptors } = representativeArchWindow();
  const before = JSON.stringify(descriptors);
  let upper = 0;
  let lower = 0;
  let pier = 0;
  for (const descriptor of descriptors) {
    for (const wall of descriptor.walls) {
      const role = archStructuralRole(wall);
      if (role === 'upper') upper += 1;
      else if (role === 'lower-panel') lower += 1;
      else if (role === 'pier') pier += 1;
    }
  }
  assert.ok(upper > 0 && lower > 0 && pier > 0, `role sample ${upper}/${lower}/${pier}`);
  assert.equal(JSON.stringify(descriptors), before, 'canonical A-A1 semantic reads mutated generated descriptors');
  assert.equal(presentationSource.includes('function isArchHeader'), false);
  assert.equal(presentationSource.includes('function isArchLower'), false);
  assert.equal(presentationSource.includes('function isArchPierSupport'), false);
  assert.match(presentationSource, /gen3ArchDividerSemantics\.js/);
  assert.equal((semanticSource.match(/export function archStructuralRole/g) ?? []).length, 1);
});

test('canonical lower-panel collider set exactly follows pure bay geometry and never reads renderer names or transforms', () => {
  const { descriptors, bays } = representativeArchWindow();
  const renderer = rendererFor(descriptors);
  canonicalizeAll(renderer, descriptors);

  const expected = [];
  for (const descriptor of descriptors) {
    for (const bay of bays) {
      const volume = archLowerPanelWorldVolumeForCell(descriptor, bay);
      if (volume) expected.push(expectedLowerColliderSignature(descriptor, volume));
    }
  }
  expected.sort((left, right) => left.id.localeCompare(right.id));
  const actual = [...renderer.walls.values()]
    .filter((collider) => collider.id.startsWith(ARCH_LOWER_PANEL_COLLIDER_PREFIX))
    .map(colliderSignature)
    .sort((left, right) => left.id.localeCompare(right.id));

  assert.ok(expected.length > 0, 'representative Arch window had no canonical lower-panel colliders');
  assert.deepEqual(actual, expected);
  assert.ok(actual.every((collider) => Math.abs(collider.maxY - ARCH_LOWER_PANEL_HEIGHT) < 1e-12));
  assert.ok(actual.every((collider) => {
    const depth = collider.orientation === 'z' ? collider.maxZ - collider.minZ : collider.maxX - collider.minX;
    return Math.abs(depth - ARCH_LOWER_PANEL_DEPTH) < 1e-12;
  }));
  for (const forbidden of ['entity.name', 'getLocalPosition', 'getLocalScale', '.root', 'render.enabled']) {
    assert.equal(collisionSource.includes(forbidden), false, `collision source retained renderer-derived truth: ${forbidden}`);
  }
});

test('upper semantic walls are non-colliding, piers/terminations remain colliding, and route bays stay traversable', () => {
  const { descriptors, bays } = representativeArchWindow();
  const renderer = rendererFor(descriptors);
  canonicalizeAll(renderer, descriptors);

  const uppers = descriptors.flatMap((descriptor) => descriptor.walls.filter((wall) => archStructuralRole(wall) === 'upper'));
  const lowers = descriptors.flatMap((descriptor) => descriptor.walls.filter((wall) => archStructuralRole(wall) === 'lower-panel'));
  const piers = descriptors.flatMap((descriptor) => descriptor.walls.filter((wall) => archStructuralRole(wall) === 'pier'));
  const archFloorWalls = descriptors.flatMap((descriptor) => descriptor.walls.filter((wall) =>
    wall.materialId === 'arch-pale-wallpaper'
      && !archStructuralRole(wall)
      && wall.cy - wall.sy / 2 <= 0.04));

  assert.ok(uppers.length > 0 && lowers.length > 0 && piers.length > 0 && archFloorWalls.length > 0);
  for (const wall of uppers) {
    assert.equal(archSemanticWallOwnsFinalCollision(wall), false);
    assert.equal(renderer.walls.has(wall.id), false, `upper ${wall.id} remained in final collision`);
  }
  for (const wall of lowers) {
    assert.equal(archSemanticWallOwnsFinalCollision(wall), false);
    assert.equal(renderer.walls.has(wall.id), false, `semantic lower ${wall.id} remained in final collision`);
  }
  for (const wall of piers) {
    assert.equal(archSemanticWallOwnsFinalCollision(wall), true);
    assert.equal(renderer.walls.has(wall.id), true, `pier ${wall.id} lost final collision`);
  }
  assert.ok(archFloorWalls.some((wall) => archSemanticWallOwnsFinalCollision(wall) && renderer.walls.has(wall.id)), 'A-A1 termination/floor-reaching collision disappeared');

  let traversableRoute;
  for (const bay of bays.filter((candidate) => candidate.route)) {
    const crossing = routeCrossing(bay);
    const resolved = resolveCircleAgainstAabbs(crossing.start[0], crossing.start[1], crossing.next[0], crossing.next[1], [...renderer.walls.values()], 0.34);
    if (samePoint(resolved, crossing.next, 1e-7)) {
      traversableRoute = { bay, crossing };
      break;
    }
  }
  assert.ok(traversableRoute, 'no representative canonical A-A1 route bay remained traversable');
});

test('indexed movement matches brute-force around lower faces/corners, piers, openings and randomized A-A1 approaches', () => {
  const { descriptors, bays } = representativeArchWindow();
  const renderer = rendererFor(descriptors);
  canonicalizeAll(renderer, descriptors);
  installRuntimePerformance();
  for (const descriptor of descriptors) registerRuntimeCellState(renderer, descriptor);
  assert.equal(runtimePerformanceDiagnosticsSnapshot(renderer).indexedColliders, renderer.walls.size);

  const lower = [...renderer.walls.values()].find((collider) => collider.id.startsWith(ARCH_LOWER_PANEL_COLLIDER_PREFIX));
  assert.ok(lower, 'no canonical lower-panel collider found');
  const lowerFace = crossingFor(lower);
  const lowerFaceResolved = indexedAndBrute(renderer, ...lowerFace.start, ...lowerFace.next);
  assert.equal(samePoint(lowerFaceResolved, lowerFace.next, 1e-7), false, 'lower-panel face stopped blocking movement');
  indexedAndBrute(renderer, lower.minX - 0.55, lower.minZ - 0.55, lower.cx, lower.cz);

  let pier;
  for (const descriptor of descriptors) {
    const wall = descriptor.walls.find((candidate) => archStructuralRole(candidate) === 'pier' && renderer.walls.has(candidate.id));
    if (wall) {
      pier = renderer.walls.get(wall.id);
      break;
    }
  }
  assert.ok(pier, 'no canonical A-A1 pier collider found');
  const pierFace = crossingFor(pier);
  const pierResolved = indexedAndBrute(renderer, ...pierFace.start, ...pierFace.next);
  assert.equal(samePoint(pierResolved, pierFace.next, 1e-7), false, 'pier stopped blocking movement');
  if (pier.orientation === 'z') indexedAndBrute(renderer, pier.minX - 0.34, pier.minZ - 0.5, pier.maxX + 0.8, pier.minZ - 0.5);
  else indexedAndBrute(renderer, pier.minX - 0.5, pier.minZ - 0.34, pier.minX - 0.5, pier.maxZ + 0.8);

  const route = bays.find((bay) => {
    if (!bay.route) return false;
    const crossing = routeCrossing(bay);
    const resolved = resolveCircleAgainstAabbs(crossing.start[0], crossing.start[1], crossing.next[0], crossing.next[1], [...renderer.walls.values()], 0.34);
    return samePoint(resolved, crossing.next, 1e-7);
  });
  assert.ok(route, 'no traversable route bay found for indexed oracle check');
  const routeMove = routeCrossing(route);
  const routeResolved = indexedAndBrute(renderer, ...routeMove.start, ...routeMove.next);
  assert.ok(samePoint(routeResolved, routeMove.next, 1e-7), 'indexed path blocked a canonical route opening');

  const targets = [lower, pier];
  for (const target of targets) {
    for (let index = 0; index < 24; index += 1) {
      const angle = index * Math.PI * 2 / 24;
      const startX = target.cx + Math.cos(angle) * 1.2;
      const startZ = target.cz + Math.sin(angle) * 1.2;
      const nextX = target.cx + Math.cos(angle + Math.PI) * 0.2;
      const nextZ = target.cz + Math.sin(angle + Math.PI) * 0.2;
      indexedAndBrute(renderer, startX, startZ, nextX, nextZ);
    }
  }

  let current = lowerFace.start;
  for (let index = 0; index < 20; index += 1) {
    const target = index % 2 === 0 ? lowerFace.next : lowerFace.start;
    current = indexedAndBrute(renderer, current[0], current[1], target[0], target[1]);
  }
});

test('neighbor unload/reload recomputes canonical A-A1 collision and keeps the derived index exact', () => {
  const { descriptors, bays } = representativeArchWindow();
  const renderer = rendererFor(descriptors);
  canonicalizeAll(renderer, descriptors);
  installRuntimePerformance();
  for (const descriptor of descriptors) registerRuntimeCellState(renderer, descriptor);

  let targetDescriptor;
  for (const descriptor of descriptors) {
    if (bays.some((bay) => archLowerPanelWorldVolumeForCell(descriptor, bay))) {
      targetDescriptor = descriptor;
      break;
    }
  }
  assert.ok(targetDescriptor, 'no Cell owned a canonical lower panel');
  const before = renderer.loaded.get(targetDescriptor.id).colliders
    .filter((collider) => collider.id.startsWith(ARCH_LOWER_PANEL_COLLIDER_PREFIX))
    .map(colliderSignature)
    .sort((left, right) => left.id.localeCompare(right.id));
  assert.ok(before.length > 0);

  unregisterRuntimeCellState(renderer, targetDescriptor.id);
  const removedVisual = renderer.loaded.get(targetDescriptor.id);
  for (const collider of removedVisual.colliders) renderer.walls.delete(collider.id);
  renderer.loaded.delete(targetDescriptor.id);
  const affectedAfterUnload = realizeNearbyArchCollision(renderer, targetDescriptor);
  for (const cellId of affectedAfterUnload) refreshRuntimeCellCollisionState(renderer, cellId);
  assert.equal(runtimePerformanceDiagnosticsSnapshot(renderer).indexedColliders, renderer.walls.size, 'unload left stale indexed colliders');

  const surviving = [...renderer.walls.values()].find((collider) => collider.cellId !== targetDescriptor.id);
  assert.ok(surviving);
  indexedAndBrute(renderer, surviving.cx - 0.7, surviving.cz - 0.7, surviving.cx + 0.2, surviving.cz + 0.2);

  const reloaded = visualFromDescriptor(targetDescriptor);
  renderer.loaded.set(targetDescriptor.id, reloaded);
  for (const collider of reloaded.colliders) renderer.walls.set(collider.id, collider);
  const affectedAfterReload = realizeNearbyArchCollision(renderer, targetDescriptor);
  for (const cellId of affectedAfterReload) {
    if (cellId !== targetDescriptor.id) refreshRuntimeCellCollisionState(renderer, cellId);
  }
  registerRuntimeCellState(renderer, targetDescriptor);
  assert.equal(runtimePerformanceDiagnosticsSnapshot(renderer).indexedColliders, renderer.walls.size, 'reload left stale/missing indexed colliders');

  const after = renderer.loaded.get(targetDescriptor.id).colliders
    .filter((collider) => collider.id.startsWith(ARCH_LOWER_PANEL_COLLIDER_PREFIX))
    .map(colliderSignature)
    .sort((left, right) => left.id.localeCompare(right.id));
  assert.deepEqual(after, before, 'A-A1 lower-panel collision changed after unload/reload');

  const probe = after[0];
  const centerX = (probe.minX + probe.maxX) / 2;
  const centerZ = (probe.minZ + probe.maxZ) / 2;
  indexedAndBrute(renderer, centerX - 0.8, centerZ - 0.8, centerX + 0.1, centerZ + 0.1);
});
