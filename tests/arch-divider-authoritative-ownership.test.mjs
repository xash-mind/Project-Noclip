import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { ARCH_HEADER_HEIGHT, ARCH_LOWER_HEIGHT } = await import('../.test-dist/src/world/gen3ArchitectureCore.js');
const { WALL_HEIGHT, WALL_THICKNESS, DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');
const {
  archFramePresentationProfile,
  archFrameVisibleVolumesForDescriptors,
  archSemanticSourceIdsForDescriptors,
  archStructuralSignatureForDescriptors
} = await import('../.test-dist/src/renderer/level0RegionPresentation.js');

const regionSource = await readFile(new URL('../src/renderer/level0RegionPresentation.ts', import.meta.url), 'utf8');
const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');

function tuning() {
  return {
    ...DEFAULT_TUNING,
    regionOverride: 'arch-rooms',
    conditionOverride: 'clear',
    carverOverride: 'none',
    structureOverride: 'none',
    gateBypass: true
  };
}
function baseCell(x = 0, z = 0, seed = 'aa1-authoritative') {
  return generateCell({ seed, x, z, worldDay: 40, exposure: 10, shiftEpoch: 0, tuning: tuning(), generationVersion: 'gen3-v1' });
}
function wall(id, start, end, kind, fixed = 0, orientation = 'z', materialId = 'arch-pale-wallpaper') {
  let cy; let sy;
  if (kind === 'header') { sy = ARCH_HEADER_HEIGHT; cy = WALL_HEIGHT - ARCH_HEADER_HEIGHT / 2; }
  else if (kind === 'pier') { sy = WALL_HEIGHT - ARCH_HEADER_HEIGHT - ARCH_LOWER_HEIGHT; cy = ARCH_LOWER_HEIGHT + sy / 2; }
  else if (kind === 'lower') { sy = ARCH_LOWER_HEIGHT; cy = ARCH_LOWER_HEIGHT / 2; }
  else { sy = WALL_HEIGHT; cy = WALL_HEIGHT / 2; }
  return orientation === 'z'
    ? { id, cx: (start + end) / 2, cy, cz: fixed, sx: end - start, sy, sz: WALL_THICKNESS, orientation, drawable: true, materialId, materialVariant: 0 }
    : { id, cx: fixed, cy, cz: (start + end) / 2, sx: WALL_THICKNESS, sy, sz: end - start, orientation, drawable: true, materialId, materialVariant: 0 };
}
function descriptorWithWalls(walls, x = 0, z = 0) {
  return { ...baseCell(x, z), walls };
}
function positive1d(left, right) {
  return left.end > right.start + 1e-6 && left.start < right.end - 1e-6;
}
function positiveVolume(left, right) {
  return left.lineKey === right.lineKey
    && positive1d(left, right)
    && left.maxY > right.minY + 1e-6 && left.minY < right.maxY - 1e-6;
}

function shuffled(values) {
  const output = [...values];
  let state = 0x9e3779b9;
  for (let index = output.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state ^ (state >>> 16), 0x45d9f3b) + 0x27100001) >>> 0;
    const swap = state % (index + 1);
    [output[index], output[swap]] = [output[swap], output[index]];
  }
  return output;
}

test('A-A1 internal TopologyWall ends cannot become final full-height terminations', () => {
  const descriptor = descriptorWithWalls([
    wall('header-left', -5, 0, 'header'),
    wall('header-right', 0, 5, 'header'),
    wall('left-pier', -2.22, -1.78, 'pier'),
    wall('right-pier', 1.78, 2.22, 'pier'),
    wall('term-real-start', -5, -4.5, 'full'),
    wall('term-internal-left', -0.5, 0, 'full'),
    wall('term-internal-right', 0, 0.5, 'full'),
    wall('term-real-end', 4.5, 5, 'full')
  ]);
  const terminations = archStructuralSignatureForDescriptors([descriptor]).filter((entry) => entry.role === 'termination');
  assert.equal(terminations.length, 2);
  assert.ok(terminations.some((entry) => Math.abs(entry.start + 5) < 1e-6));
  assert.ok(terminations.some((entry) => Math.abs(entry.end - 5) < 1e-6));
  assert.ok(terminations.every((entry) => entry.end <= -4.49 || entry.start >= 4.49));
});

test('A-A1 endpoint joined to an ordinary through-wall is a handoff, not a termination block', () => {
  const descriptor = descriptorWithWalls([
    wall('header', -5, 5, 'header'),
    wall('left-pier', -2.22, -1.78, 'pier'),
    wall('right-pier', 1.78, 2.22, 'pier'),
    wall('candidate-end', 4.5, 5, 'full'),
    wall('ordinary-through', -2, 2, 'full', 5, 'x', 'level-0-wallpaper')
  ]);
  const terminations = archStructuralSignatureForDescriptors([descriptor]).filter((entry) => entry.role === 'termination');
  assert.equal(terminations.some((entry) => entry.end > 4.49), false);
});

test('A-A1 visible roles have no unintended positive-volume ownership overlap', () => {
  const descriptor = descriptorWithWalls([
    wall('header', -5, 5, 'header'),
    wall('lower-left', -5, -0.9, 'lower'),
    wall('lower-right', 0.9, 5, 'lower'),
    wall('left-pier', -2.22, -1.78, 'pier'),
    wall('right-pier', 1.78, 2.22, 'pier'),
    wall('term-start', -5, -4.5, 'full'),
    wall('term-end', 4.5, 5, 'full')
  ]);
  const volumes = archFrameVisibleVolumesForDescriptors([descriptor]);
  for (let left = 0; left < volumes.length; left += 1) for (let right = left + 1; right < volumes.length; right += 1) {
    assert.equal(positiveVolume(volumes[left], volumes[right]), false, `${volumes[left].id} overlapped ${volumes[right].id}`);
  }
});

test('A-A1 route center stays clear of every canonical floor-blocking role', () => {
  const descriptor = descriptorWithWalls([
    wall('header', -5, 5, 'header'),
    wall('lower-left', -5, -0.9, 'lower'),
    wall('lower-right', 0.9, 5, 'lower'),
    wall('left-pier', -2.22, -1.78, 'pier'),
    wall('right-pier', 1.78, 2.22, 'pier')
  ]);
  const signature = archStructuralSignatureForDescriptors([descriptor]);
  const route = signature.find((entry) => entry.role === 'route');
  assert.ok(route);
  const center = (route.start + route.end) / 2;
  const blockers = signature.filter((entry) => entry.collision && entry.lineKey === route.lineKey);
  assert.equal(blockers.some((entry) => center > entry.start + 1e-6 && center < entry.end - 1e-6), false);
});

test('A-A1 final structural signature is independent of descriptor arrival order', () => {
  const descriptors = [];
  for (let x = -2; x <= 2; x += 1) for (let z = -2; z <= 2; z += 1) descriptors.push(baseCell(x, z, 'aa1-order'));
  const expected = JSON.stringify(archStructuralSignatureForDescriptors(descriptors));
  assert.equal(JSON.stringify(archStructuralSignatureForDescriptors([...descriptors].reverse())), expected);
  assert.equal(JSON.stringify(archStructuralSignatureForDescriptors(shuffled(descriptors))), expected);
});

test('generated Arch sweep has no orphan full-height mass and route centers remain clear', () => {
  const descriptors = [];
  for (let x = -3; x <= 3; x += 1) for (let z = -3; z <= 3; z += 1) descriptors.push(baseCell(x, z, 'aa1-sweep'));
  const signature = archStructuralSignatureForDescriptors(descriptors);
  const volumes = archFrameVisibleVolumesForDescriptors(descriptors);
  const validRoles = new Set(['pier', 'upper-mass', 'curve', 'lower-panel', 'termination', 'route']);
  assert.ok(signature.length > 0);
  assert.ok(signature.every((entry) => validRoles.has(entry.role)));
  for (const volume of volumes) {
    if (volume.minY <= 1e-6 && volume.maxY >= WALL_HEIGHT - 1e-6) assert.equal(volume.role, 'termination');
  }
  for (let left = 0; left < volumes.length; left += 1) for (let right = left + 1; right < volumes.length; right += 1) {
    assert.equal(positiveVolume(volumes[left], volumes[right]), false, `${volumes[left].id} overlapped ${volumes[right].id}`);
  }
  for (const route of signature.filter((entry) => entry.role === 'route')) {
    const center = (route.start + route.end) / 2;
    const blockers = signature.filter((entry) => entry.collision && entry.lineKey === route.lineKey);
    assert.equal(blockers.some((entry) => center > entry.start + 1e-6 && center < entry.end - 1e-6), false, `route blocked on ${route.runId}`);
  }
});

test('A-A1 silhouette contract remains frozen at the accepted Dev.8 values', () => {
  const profile = archFramePresentationProfile();
  assert.ok(Math.abs(profile.ceilingReveal - 0.24) < 1e-12);
  assert.ok(Math.abs(profile.upperTop - (WALL_HEIGHT - 0.24)) < 1e-12);
  assert.equal(profile.shoulderSpanScale, 0.5);
  assert.ok(profile.pierDepth > WALL_THICKNESS);
  assert.ok(profile.upperDepth > profile.pierDepth);
});

test('A-A1 has one final runtime owner and semantic sources are suppressed before queued reconciliation', async () => {
  assert.equal(batchingSource.includes('installArchDividerRuntimeCorrection'), false);
  assert.equal(regionSource.includes('resetSemanticArchMeshes'), false);
  assert.ok(regionSource.includes('suppressLocalArchSources(this, visual)'));
  assert.ok(regionSource.indexOf('suppressLocalArchSources(this, visual)') < regionSource.indexOf('markAffectedArchRuns(this, descriptor)'));
  assert.ok(regionSource.includes('arch-frame-collider:'));
  assert.ok(regionSource.includes('source WallSpecs remain deterministic world-generation evidence only'));
  await assert.rejects(access(new URL('../src/renderer/archDividerRuntimeCorrection.ts', import.meta.url)));
  await assert.rejects(access(new URL('../src/renderer/level0PresentationCloseout.ts', import.meta.url)));
});

test('semantic A-A1 source IDs remain available only as inputs to the authoritative model', () => {
  const descriptor = descriptorWithWalls([
    wall('header', -5, 5, 'header'),
    wall('lower', -5, 5, 'lower'),
    wall('left-pier', -2.22, -1.78, 'pier'),
    wall('right-pier', 1.78, 2.22, 'pier'),
    wall('term-start', -5, -4.5, 'full')
  ]);
  const ids = archSemanticSourceIdsForDescriptors([descriptor]);
  for (const id of ['header', 'lower', 'left-pier', 'right-pier', 'term-start']) assert.ok(ids.includes(id), id);
});
