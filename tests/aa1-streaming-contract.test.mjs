import assert from 'node:assert/strict';
import test from 'node:test';

const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { ARCH_HEADER_HEIGHT, ARCH_LOWER_HEIGHT } = await import('../.test-dist/src/world/gen3ArchitectureCore.js');
const { WALL_HEIGHT, WALL_THICKNESS, DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');
const { archFrameBaysForDescriptors, archFrameVisibleVolumesForDescriptors } = await import('../.test-dist/src/renderer/level0RegionPresentation.js');
const { STREAMING_SCHEDULER_PROFILE, predictiveWarmCoordinates, streamingFrameCanRunHeavyWork } = await import('../.test-dist/src/renderer/streamingPolicy.js');

function tuning() {
  return { ...DEFAULT_TUNING, regionOverride: 'arch-rooms', conditionOverride: 'clear', carverOverride: 'none', structureOverride: 'none', gateBypass: true };
}
function baseCell(x = 0, z = 0) {
  return generateCell({ seed: 'dev8-corrective', x, z, worldDay: 40, exposure: 10, shiftEpoch: 0, tuning: tuning(), generationVersion: 'gen3-v1' });
}
function wall(id, start, end, kind, fixed = 0) {
  let cy; let sy;
  if (kind === 'header') { sy = ARCH_HEADER_HEIGHT; cy = WALL_HEIGHT - ARCH_HEADER_HEIGHT / 2; }
  else if (kind === 'pier') { sy = WALL_HEIGHT - ARCH_HEADER_HEIGHT - ARCH_LOWER_HEIGHT; cy = ARCH_LOWER_HEIGHT + sy / 2; }
  else if (kind === 'lower') { sy = ARCH_LOWER_HEIGHT; cy = ARCH_LOWER_HEIGHT / 2; }
  else { sy = WALL_HEIGHT; cy = WALL_HEIGHT / 2; }
  return { id, cx: (start + end) / 2, cy, cz: fixed, sx: end - start, sy, sz: WALL_THICKNESS, orientation: 'z', drawable: true, materialId: 'arch-pale-wallpaper', materialVariant: 0 };
}
function descriptorWithWalls(walls, x = 0, z = 0) { return { ...baseCell(x, z), walls }; }
function positiveOverlap(left, right) {
  return left.lineKey === right.lineKey
    && left.end > right.start + 1e-6 && left.start < right.end - 1e-6
    && left.maxY > right.minY + 1e-6 && left.minY < right.maxY - 1e-6;
}

test('A-A1 visible rectangular volumes have one positive-volume owner', () => {
  const descriptor = descriptorWithWalls([wall('header', -5, 5, 'header'), wall('left-pier', -2.22, -1.78, 'pier'), wall('right-pier', 1.78, 2.22, 'pier')]);
  assert.equal(archFrameBaysForDescriptors([descriptor]).length, 1);
  const volumes = archFrameVisibleVolumesForDescriptors([descriptor]);
  assert.ok(volumes.some((volume) => volume.role === 'pier-lower'));
  assert.ok(volumes.some((volume) => volume.role === 'pier-upper'));
  assert.ok(volumes.some((volume) => volume.role === 'upper-mass'));
  for (let i = 0; i < volumes.length; i += 1) for (let j = i + 1; j < volumes.length; j += 1) {
    assert.equal(positiveOverlap(volumes[i], volumes[j]), false, `${volumes[i].id} overlapped ${volumes[j].id}`);
  }
});

test('full-height Arch termination cannot become a reconstructed bay support', () => {
  const descriptor = descriptorWithWalls([wall('header', -5, 5, 'header'), wall('termination', -2.22, -1.78, 'full'), wall('right-pier', 1.78, 2.22, 'pier')]);
  assert.equal(archFrameBaysForDescriptors([descriptor]).length, 0);
});

test('unrelated full-height pale wall cannot become a reconstructed bay support', () => {
  const descriptor = descriptorWithWalls([wall('header', -5, 5, 'header'), wall('left-pier', -2.22, -1.78, 'pier'), wall('unrelated-pale-wall', 1.78, 2.22, 'full')]);
  assert.equal(archFrameBaysForDescriptors([descriptor]).length, 0);
});

test('semantic header gaps are not bridged into an unintended upper connector', () => {
  const descriptor = descriptorWithWalls([wall('header-left', -5, -0.8, 'header'), wall('header-right', 0.8, 5, 'header'), wall('left-pier', -2.22, -1.78, 'pier'), wall('right-pier', 1.78, 2.22, 'pier')]);
  assert.equal(archFrameBaysForDescriptors([descriptor]).length, 0);
});

test('real Cell-seam adjacency still reconstructs without a wide bridge heuristic', () => {
  const left = descriptorWithWalls([wall('header-left', 2, 7, 'header'), wall('left-pier', 3.78, 4.22, 'pier')], 0, 0);
  const right = descriptorWithWalls([wall('header-right', -7, -2, 'header'), wall('right-pier', -4.22, -3.78, 'pier')], 1, 0);
  assert.equal(archFrameBaysForDescriptors([left, right]).length, 1);
});

test('streaming heavy-work admission enforces both per-frame count and measured budget', () => {
  assert.equal(streamingFrameCanRunHeavyWork(0, 0), true);
  assert.equal(streamingFrameCanRunHeavyWork(STREAMING_SCHEDULER_PROFILE.maxHeavyJobsPerFrame, 0), false);
  assert.equal(streamingFrameCanRunHeavyWork(0, STREAMING_SCHEDULER_PROFILE.workBudgetMs), false);
  assert.equal(STREAMING_SCHEDULER_PROFILE.maxHeavyJobsPerFrame, 1);
});

test('predictive warming remains one retention ring ahead of the current square scope', () => {
  const forward = predictiveWarmCoordinates(4, -2, 3, 1, 0);
  assert.ok(forward.length > 0);
  assert.ok(forward.every((coordinate) => coordinate.x === 8));
  assert.ok(forward.every((coordinate) => Math.abs(coordinate.z + 2) <= 3));
});
