import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const {
  fusedWallSpecForGroup,
  planStaticSurfaceFusion
} = await import('../.test-dist/src/renderer/level0StaticSurfaceAssembly.js');
const { ordinaryWallpaperUv } = await import('../.test-dist/src/renderer/ordinaryWallpaperRules.js');

const assemblySource = await readFile(new URL('../src/renderer/level0StaticSurfaceAssembly.ts', import.meta.url), 'utf8');
const lifecycleSource = await readFile(new URL('../src/renderer/rendererCellLifecycle.ts', import.meta.url), 'utf8');

function candidate(overrides = {}) {
  return {
    cellId: 'cell:0:0',
    regionId: 'ordinary-level-0',
    pieceId: 'piece-a',
    sourceWallId: 'wall-a',
    orientation: 'z',
    fixed: 1.25,
    start: -4,
    end: 0,
    cy: 1.6,
    height: 3.2,
    depth: 0.28,
    materialKey: 'ordinary-wallpaper:A|level-0-wallpaper|0|ordinary-level-0',
    fusable: true,
    ...overrides
  };
}

test('compatible coplanar static wall surfaces fuse into one renderer-owned run', () => {
  const groups = planStaticSurfaceFusion([
    candidate(),
    candidate({ pieceId: 'piece-b', sourceWallId: 'wall-b', start: 0, end: 3.5 })
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].members.length, 2);
  assert.equal(groups[0].start, -4);
  assert.equal(groups[0].end, 3.5);
});

test('material, opening and corner boundaries stop inappropriate fusion', () => {
  const materialBoundary = planStaticSurfaceFusion([
    candidate(),
    candidate({ pieceId: 'material-b', sourceWallId: 'wall-b', start: 0, end: 3, materialKey: 'ordinary-wallpaper:B|level-0-wallpaper|0|ordinary-level-0' })
  ]);
  assert.equal(materialBoundary.length, 2);

  const openingBoundary = planStaticSurfaceFusion([
    candidate(),
    candidate({ pieceId: 'gap-b', sourceWallId: 'wall-b', start: 0.8, end: 3.8 })
  ]);
  assert.equal(openingBoundary.length, 2);

  const cornerBoundary = planStaticSurfaceFusion([
    candidate(),
    candidate({ pieceId: 'corner-b', sourceWallId: 'wall-b', orientation: 'x', fixed: 0, start: 0, end: 3 })
  ]);
  assert.equal(cornerBoundary.length, 2);
});

test('interaction/structural barriers and Cell ownership remain hard fusion boundaries', () => {
  const interactionBoundary = planStaticSurfaceFusion([
    candidate(),
    candidate({ pieceId: 'outlet-wall', sourceWallId: 'wall-outlet', start: 0, end: 3, fusable: false })
  ]);
  assert.equal(interactionBoundary.length, 2);

  const streamedBoundary = planStaticSurfaceFusion([
    candidate(),
    candidate({ cellId: 'cell:1:0', pieceId: 'next-cell', sourceWallId: 'wall-next', start: 0, end: 3 })
  ]);
  assert.equal(streamedBoundary.length, 2);

  assert.match(assemblySource, /if \(!wall\.drawable \|\| archStructuralRole\(wall\)\) return \[\];/);
});

test('fused wallpaper surfaces retain canonical world-space UV phase', () => {
  const first = candidate();
  const second = candidate({ pieceId: 'piece-b', sourceWallId: 'wall-b', start: 0, end: 5 });
  const [group] = planStaticSurfaceFusion([first, second]);
  const sourceWall = {
    id: 'wall-a', cx: -2, cy: 1.6, cz: 1.25,
    sx: 4, sy: 3.2, sz: 0.28,
    orientation: 'z', drawable: true,
    materialId: 'level-0-wallpaper', materialVariant: 0
  };
  const fused = fusedWallSpecForGroup(group, sourceWall);
  const sourceUv = ordinaryWallpaperUv(0, 0, sourceWall, 1.3, [0.17, 0.09]);
  const fusedUv = ordinaryWallpaperUv(0, 0, fused, 1.3, [0.17, 0.09]);
  assert.ok(Math.abs(sourceUv.offset[0] - fusedUv.offset[0]) < 1e-9);
  assert.ok(Math.abs(fusedUv.tiling[0] - 9 / 1.3) < 1e-9);
  assert.equal(fused.cy, sourceWall.cy);
  assert.equal(fused.sz, sourceWall.sz);
});

test('surface assembly is render-only and leaves CV-H1/collision truth to existing owners', () => {
  for (const forbidden of [
    'archDividerCollision',
    'runtimePerformance',
    'WorldCollider',
    '.colliders',
    'floorPatches',
    'cvh1FloorSurface'
  ]) assert.equal(assemblySource.includes(forbidden), false, `surface assembler crossed ownership boundary: ${forbidden}`);

  const assembly = lifecycleSource.indexOf('assembleLevel0StaticSurfaces(visual)');
  const collision = lifecycleSource.indexOf('realizeNearbyArchCollision(renderer, descriptor)');
  const batching = lifecycleSource.indexOf('markStaticWorldBatchingDirty()');
  assert.ok(assembly >= 0 && collision > assembly && batching > collision);
});
