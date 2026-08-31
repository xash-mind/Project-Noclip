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

function interval(box, orientation) {
  return orientation === 'z'
    ? [box.cx - box.sx / 2, box.cx + box.sx / 2]
    : [box.cz - box.sz / 2, box.cz + box.sz / 2];
}

function clipPiece(piece, semanticEnvelope, orientation) {
  const [pieceStart, pieceEnd] = interval(piece, orientation);
  const [envelopeStart, envelopeEnd] = interval(semanticEnvelope, orientation);
  return [Math.max(pieceStart, envelopeStart), Math.min(pieceEnd, envelopeEnd)];
}

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

test('split wallpaper pieces are clipped independently inside the semantic T-junction envelope', async () => {
  const through = zWall('through', -3, 3, 0);
  const semanticWall = xWall('semantic', -4, 0, 0);
  const envelope = wallPresentationBoxAtTJunction(semanticWall, [semanticWall, through]);
  const firstRenderedHalf = xWall('semantic', -4, -2, 0);
  const secondRenderedHalf = xWall('semantic:split-c', -2, 0, 0);

  const first = clipPiece(firstRenderedHalf, envelope, semanticWall.orientation);
  const second = clipPiece(secondRenderedHalf, envelope, semanticWall.orientation);

  close(first[0], -4);
  close(first[1], -2);
  close(second[0], -2);
  close(second[1], -thickness / 2);
  close(first[1], second[0]);
  assert.ok(first[1] <= second[0], 'split pieces must not overlap after junction clipping');

  const assemblySource = await readFile(new URL('../src/renderer/level0StaticSurfaceAssembly.ts', import.meta.url), 'utf8');
  assert.match(assemblySource, /const split = entityByName\(visual\.root, `\$\{wall\.id\}:split-c`\)/);
  assert.match(assemblySource, /const \[pieceStart, pieceEnd\] = intervalForBox\(wall\.orientation, currentBox\)/);
  assert.match(assemblySource, /const start = Math\.max\(pieceStart, junctionStart\)/);
  assert.match(assemblySource, /const end = Math\.min\(pieceEnd, junctionEnd\)/);
});

test('junction geometry is consumed by the canonical surface assembler, not a standalone correction lifecycle', async () => {
  const assemblySource = await readFile(new URL('../src/renderer/level0StaticSurfaceAssembly.ts', import.meta.url), 'utf8');
  const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');
  const lifecycleSource = await readFile(new URL('../src/renderer/rendererCellLifecycle.ts', import.meta.url), 'utf8');

  assert.ok(assemblySource.includes('wallPresentationBoxAtTJunction'));
  assert.ok(lifecycleSource.includes('assembleLevel0StaticSurfaces(visual)'));
  assert.equal(lifecycleSource.includes('applyWallJunctionPresentation'), false);
  assert.equal(lifecycleSource.includes('wall-junction-presentation'), false);
  assert.equal(assemblySource.includes('renderer.walls'), false);
  assert.equal(assemblySource.includes('WorldRenderer.prototype'), false);
  assert.equal(batchingSource.includes('installWallJunctionPresentation'), false);
});
