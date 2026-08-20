import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { wallPresentationBoxAtTJunction } from '../.test-dist/src/renderer/wallJunctionGeometry.js';

const thickness = 0.28;
const height = 3.2;
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

const xWall = (id, start, end, z = 0) => ({
  id, cx: (start + end) / 2, cy: height / 2, cz: z,
  sx: end - start, sy: height, sz: thickness,
  orientation: 'z', drawable: true, materialId: 'level-0-wallpaper'
});
const zWall = (id, start, end, x = 0) => ({
  id, cx: x, cy: height / 2, cz: (start + end) / 2,
  sx: thickness, sy: height, sz: end - start,
  orientation: 'x', drawable: true, materialId: 'level-0-wallpaper'
});

test('terminating wall stops at the near face of the through-wall at a T junction', () => {
  const through = zWall('through', -3, 3, 0);
  const approachingFromLeft = xWall('left', -4, 0, 0);
  const approachingFromRight = xWall('right', 0, 4, 0);

  const left = wallPresentationBoxAtTJunction(approachingFromLeft, [approachingFromLeft, through]);
  close(left.cx + left.sx / 2, -thickness / 2);
  close(left.cx - left.sx / 2, -4);

  const right = wallPresentationBoxAtTJunction(approachingFromRight, [approachingFromRight, through]);
  close(right.cx - right.sx / 2, thickness / 2);
  close(right.cx + right.sx / 2, 4);
});

test('cross intersections and L corners keep their original presentation spans', () => {
  const through = zWall('through', -3, 3, 0);
  const crossing = xWall('crossing', -4, 4, 0);
  assert.deepEqual(wallPresentationBoxAtTJunction(crossing, [crossing, through]), {
    cx: crossing.cx, cy: crossing.cy, cz: crossing.cz,
    sx: crossing.sx, sy: crossing.sy, sz: crossing.sz
  });

  const cornerA = xWall('corner-a', -4, 0, 0);
  const cornerB = zWall('corner-b', 0, 4, 0);
  assert.deepEqual(wallPresentationBoxAtTJunction(cornerA, [cornerA, cornerB]), {
    cx: cornerA.cx, cy: cornerA.cy, cz: cornerA.cz,
    sx: cornerA.sx, sy: cornerA.sy, sz: cornerA.sz
  });
});

test('wall junction cleanup is wired as presentation-only Gen3 runtime work', async () => {
  const presentationSource = await readFile(new URL('../src/renderer/wallJunctionPresentation.ts', import.meta.url), 'utf8');
  const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');

  assert.ok(presentationSource.includes("generationVersion !== 'gen3-v1'"));
  assert.ok(presentationSource.includes('wallPresentationBoxAtTJunction'));
  assert.ok(presentationSource.includes('entity.setLocalScale'));
  assert.equal(presentationSource.includes('renderer.walls'), false);
  assert.ok(batchingSource.includes('installWallJunctionPresentation();'));
});
