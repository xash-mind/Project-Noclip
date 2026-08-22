import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createVisibilitySnapshot,
  prepareVisibilityTopology,
  visibilityDiagnosticReport
} from '../.test-dist/src/renderer/visibility/index.js';

const cell = (id, x, z, minX, maxX, minZ, maxZ) => ({ id, x, z, bounds: { minX, maxX, minZ, maxZ } });
const space = (id, minX, maxX, minZ, maxZ, cellIds) => ({ id, bounds: { minX, maxX, minZ, maxZ }, cellIds });
const verticalOpening = (id, x, minZ, maxZ, fromSpaceId, toSpaceId, kind = 'portal', conservative = false) => ({
  id,
  wallId: `wall:${id}`,
  fromSpaceId,
  toSpaceId,
  kind,
  segment: { start: { x, z: minZ }, end: { x, z: maxZ } },
  width: maxZ - minZ,
  mandatory: true,
  arch: kind === 'arch-aperture',
  conservative
});
const horizontalOpening = (id, z, minX, maxX, fromSpaceId, toSpaceId) => ({
  id,
  wallId: `wall:${id}`,
  fromSpaceId,
  toSpaceId,
  kind: 'portal',
  segment: { start: { x: minX, z }, end: { x: maxX, z } },
  width: maxX - minX,
  mandatory: true,
  arch: false,
  conservative: false
});
const topology = (spaces, openings, cells) => prepareVisibilityTopology({
  metadata: { source: 'synthetic' }, spaces, openings, cells, conservativeReasons: []
});
const snapshot = (prepared, position = { x: 5, z: 5 }, options = {}) => createVisibilitySnapshot(
  prepared,
  { position },
  { maxDistance: 200, maxDepth: 24, captureFrontier: true, ...options }
);

function corridor(count, openingWidth = 2) {
  const spaces = [];
  const openings = [];
  const cells = [];
  for (let index = 0; index < count; index += 1) {
    spaces.push(space(`S${index}`, index * 10, (index + 1) * 10, 0, 10, [`C${index}`]));
    cells.push(cell(`C${index}`, index, 0, index * 10, (index + 1) * 10, 0, 10));
    if (index > 0) openings.push(verticalOpening(
      `P${index}`,
      index * 10,
      5 - openingWidth / 2,
      5 + openingWidth / 2,
      `S${index - 1}`,
      `S${index}`
    ));
  }
  return topology(spaces, openings, cells);
}

test('solid wall blocks visibility propagation', () => {
  const prepared = topology(
    [space('A', 0, 10, 0, 10, ['C0']), space('B', 10, 20, 0, 10, ['C1'])],
    [],
    [cell('C0', 0, 0, 0, 10, 0, 10), cell('C1', 1, 0, 10, 20, 0, 10)]
  );
  assert.deepEqual(snapshot(prepared).visibleSpaces, ['A']);
});

test('ordinary opening permits propagation', () => {
  const prepared = topology(
    [space('A', 0, 10, 0, 10, ['C0']), space('B', 10, 20, 0, 10, ['C1'])],
    [verticalOpening('ordinary-opening', 10, 4, 6, 'A', 'B')],
    [cell('C0', 0, 0, 0, 10, 0, 10), cell('C1', 1, 0, 10, 20, 0, 10)]
  );
  assert.deepEqual(snapshot(prepared).visibleSpaces, ['A', 'B']);
});

test('Cell boundary is not an occluder and a visible Space participates in every supplied Cell it overlaps', () => {
  const prepared = topology(
    [space('wide-space', 0, 20, 0, 10, ['0:0', '1:0'])],
    [],
    [cell('0:0', 0, 0, 0, 10, 0, 10), cell('1:0', 1, 0, 10, 20, 0, 10)]
  );
  assert.deepEqual(snapshot(prepared).visibleCells, ['0:0', '1:0']);
});

test('long hallway propagates through repeated aligned openings', () => {
  const result = snapshot(corridor(12));
  assert.equal(result.visibleSpaces.length, 12);
  assert.ok(result.visibleSpaces.includes('S11'));
  const report = visibilityDiagnosticReport(result);
  assert.equal(report.spaces.find((entry) => entry.spaceId === 'S11')?.openingChain.length, 11);
});

test('L-shaped connectivity does not see indefinitely around a solid corner', () => {
  const prepared = topology(
    [
      space('A', 0, 10, 0, 10, ['C0']),
      space('B', 10, 20, 0, 10, ['C1']),
      space('C', 10, 20, 10, 20, ['C2'])
    ],
    [
      verticalOpening('east-opening', 10, 4, 6, 'A', 'B'),
      horizontalOpening('north-turn', 10, 14, 16, 'B', 'C')
    ],
    [
      cell('C0', 0, 0, 0, 10, 0, 10),
      cell('C1', 1, 0, 10, 20, 0, 10),
      cell('C2', 1, 1, 10, 20, 10, 20)
    ]
  );
  const result = snapshot(prepared);
  assert.deepEqual(result.visibleSpaces, ['A', 'B']);
  assert.ok(result.frontier.some((entry) => entry.openingId === 'north-turn' && entry.reason === 'angularly-occluded'));
});

test('narrow connector remains visible when it has a valid sightline', () => {
  const prepared = topology(
    [space('A', 0, 10, 0, 10, ['C0']), space('B', 10, 20, 0, 10, ['C1'])],
    [verticalOpening('tight-opening', 10, 4.85, 5.15, 'A', 'B')],
    [cell('C0', 0, 0, 0, 10, 0, 10), cell('C1', 1, 0, 10, 20, 0, 10)]
  );
  assert.deepEqual(snapshot(prepared).visibleSpaces, ['A', 'B']);
});

test('A-A1 semantic aperture kind propagates conservatively without renderer evidence', () => {
  const prepared = topology(
    [space('arch-left', 0, 10, 0, 10, ['C0']), space('arch-right', 10, 20, 0, 10, ['C1'])],
    [verticalOpening('A-A1:aperture', 10, 3, 7, 'arch-left', 'arch-right', 'arch-aperture', true)],
    [cell('C0', 0, 0, 0, 10, 0, 10), cell('C1', 1, 0, 10, 20, 0, 10)]
  );
  const result = snapshot(prepared);
  assert.deepEqual(result.visibleSpaces, ['arch-left', 'arch-right']);
  assert.deepEqual(result.conservativeInclusions, ['arch-right']);
});

test('unrelated closed Space remains excluded', () => {
  const prepared = topology(
    [
      space('A', 0, 10, 0, 10, ['C0']),
      space('B', 10, 20, 0, 10, ['C1']),
      space('closed', 0, 10, 20, 30, ['CX'])
    ],
    [verticalOpening('ordinary-opening', 10, 4, 6, 'A', 'B')],
    [
      cell('C0', 0, 0, 0, 10, 0, 10),
      cell('C1', 1, 0, 10, 20, 0, 10),
      cell('CX', 0, 2, 0, 10, 20, 30)
    ]
  );
  assert.ok(!snapshot(prepared).visibleSpaces.includes('closed'));
});

test('same inputs produce byte-for-byte equivalent snapshot data', () => {
  const prepared = corridor(8);
  const first = snapshot(prepared);
  const second = snapshot(prepared);
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify(second), JSON.stringify(first));
});

test('depth safety bound fails open through connected topology instead of creating false negatives', () => {
  const result = snapshot(corridor(8), { x: 5, z: 5 }, { maxDepth: 2 });
  assert.equal(result.termination.primaryReason, 'max-depth-conservative');
  assert.ok(result.visibleSpaces.includes('S7'));
  assert.ok(result.conservativeInclusions.length > 0);
});

test('explicit camera FOV can constrain the first opening while omitted FOV remains conservative', () => {
  const prepared = topology(
    [
      space('A', 0, 10, 0, 10, ['C0']),
      space('east', 10, 20, 0, 10, ['CE']),
      space('west', -10, 0, 0, 10, ['CW'])
    ],
    [
      verticalOpening('east-opening', 10, 4, 6, 'A', 'east'),
      verticalOpening('west-opening', 0, 4, 6, 'A', 'west')
    ],
    [
      cell('C0', 0, 0, 0, 10, 0, 10),
      cell('CE', 1, 0, 10, 20, 0, 10),
      cell('CW', -1, 0, -10, 0, 0, 10)
    ]
  );
  const allDirection = snapshot(prepared);
  assert.deepEqual(allDirection.visibleSpaces, ['A', 'east', 'west']);
  const eastFacing = createVisibilitySnapshot(
    prepared,
    { position: { x: 5, z: 5 }, direction: { x: 1, z: 0 }, horizontalFovRadians: Math.PI / 2 },
    { maxDistance: 200, captureFrontier: true }
  );
  assert.deepEqual(eastFacing.visibleSpaces, ['A', 'east']);
});

test('live renderer and streaming owners remain unactivated by the snapshot foundation', () => {
  const protectedFiles = [
    'src/renderer/WorldRenderer.ts',
    'src/renderer/streamingScheduler.ts',
    'src/renderer/StaticWorldBatching.ts',
    'src/renderer/fixtureLighting.ts',
    'src/app/ProjectNoclipGame.ts'
  ];
  for (const path of protectedFiles) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /VisibilitySnapshot|buildGen3VisibilityTopology|renderer\/visibility|visibility\/snapshot/,
      `${path} unexpectedly activates the visibility foundation`);
  }
});
