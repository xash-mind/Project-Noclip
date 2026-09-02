import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildGen3VisibilityTopology,
  createVisibilitySnapshot
} from '../.test-dist/src/renderer/visibility/index.js';
import { generateTopologyDomain } from '../.test-dist/src/world/gen3SpaceTopologyDomain.js';
import { DEFAULT_TUNING } from '../.test-dist/src/world/types.js';

const cells = (radius) => {
  const result = [];
  for (let x = -radius; x <= radius; x += 1) for (let z = -radius; z <= radius; z += 1) result.push({ x, z });
  return result;
};
const tuning = (regionOverride) => ({
  ...DEFAULT_TUNING,
  regionOverride,
  conditionOverride: 'clear',
  carverOverride: 'none',
  structureOverride: 'none'
});

test('Generation 3 adapter is deterministic and does not mutate topology descriptors', () => {
  const worldTuning = tuning('ordinary-level-0');
  const context = { seed: 'visibility-adapter-mutation', worldDay: 40, exposure: 10, tuning: worldTuning };
  const domain = generateTopologyDomain(context, 0, 0);
  const before = JSON.stringify(domain);
  const first = buildGen3VisibilityTopology({ ...context, cells: cells(3) });
  const after = JSON.stringify(domain);
  const second = buildGen3VisibilityTopology({ ...context, cells: cells(3) });

  assert.equal(after, before, 'adapter mutated a Generation 3 topology descriptor');
  assert.deepEqual(second.spaces, first.spaces);
  assert.deepEqual(second.openings, first.openings);
  assert.deepEqual(second.cells, first.cells);
  assert.deepEqual(second.conservativeReasons, first.conservativeReasons);
});

test('Generation 3 semantic Space visibility derives Cell participation without treating Cells as rooms', () => {
  const prepared = buildGen3VisibilityTopology({
    seed: 'visibility-cell-crossing', worldDay: 40, exposure: 10,
    tuning: tuning('ordinary-level-0'), cells: cells(4)
  });
  const spanning = prepared.spaces.find((space) => space.cellIds.length >= 2);
  assert.ok(spanning, 'expected at least one semantic Space spanning multiple streaming Cells');
  const observer = {
    x: (spanning.bounds.minX + spanning.bounds.maxX) / 2,
    z: (spanning.bounds.minZ + spanning.bounds.maxZ) / 2
  };
  const snapshot = createVisibilitySnapshot(prepared, { position: observer, expectedSpaceId: spanning.id }, { maxDistance: 80 });
  for (const id of spanning.cellIds) assert.ok(snapshot.visibleCells.includes(id), `visible Space did not participate in Cell ${id}`);
});

test('A-A1 uses semantic topology apertures and propagates through one without mesh-name inference', () => {
  const prepared = buildGen3VisibilityTopology({
    seed: 'visibility-arch-apertures', worldDay: 40, exposure: 10,
    tuning: tuning('arch-rooms'), cells: cells(5)
  });
  const aperture = prepared.openings.find((opening) => opening.kind === 'arch-aperture' && opening.arch);
  assert.ok(aperture, 'Generation 3 Arch Rooms produced no semantic A-A1 aperture evidence');
  const fromIndex = prepared.spaceIndexById.get(aperture.fromSpaceId);
  const from = fromIndex === undefined ? undefined : prepared.spaces[fromIndex];
  assert.ok(from, `missing aperture source Space ${aperture.fromSpaceId}`);
  const observer = {
    x: (from.bounds.minX + from.bounds.maxX) / 2,
    z: (from.bounds.minZ + from.bounds.maxZ) / 2
  };
  const snapshot = createVisibilitySnapshot(prepared, { position: observer, expectedSpaceId: from.id }, { maxDistance: 120 });
  assert.ok(snapshot.visibleSpaces.includes(aperture.toSpaceId), `A-A1 aperture did not propagate to ${aperture.toSpaceId}`);
  assert.ok(snapshot.conservativeInclusions.includes(aperture.toSpaceId), 'A-A1 eye-height aperture should remain explicitly conservative');
});

test('visibility adapter depends on world topology/shared A-A1 dimensions, never PlayCanvas presentation', () => {
  const source = readFileSync('src/renderer/visibility/topologyAdapter.ts', 'utf8');
  assert.match(source, /gen3SpaceTopologyDomain/);
  assert.match(source, /gen3SpaceTopologyBuild/);
  assert.match(source, /archBayProfile/);
  assert.doesNotMatch(source, /level0RegionPresentation|WorldRenderer|playcanvas|mesh/i);
});
