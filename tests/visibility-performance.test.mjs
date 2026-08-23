import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createVisibilitySnapshot, prepareVisibilityTopology } from '../.test-dist/src/renderer/visibility/index.js';

const cell = (id, x, z, minX, maxX, minZ, maxZ) => ({ id, x, z, bounds: { minX, maxX, minZ, maxZ } });
const space = (id, minX, maxX, minZ, maxZ, cellIds) => ({ id, bounds: { minX, maxX, minZ, maxZ }, cellIds });
const opening = (id, fromSpaceId, toSpaceId, start, end, kind = 'portal', conservative = false) => ({
  id, wallId: `wall:${id}`, fromSpaceId, toSpaceId, kind,
  segment: { start, end },
  width: Math.hypot(end.x - start.x, end.z - start.z),
  mandatory: true, arch: kind === 'arch-aperture', conservative
});
const prepared = (spaces, openings, cells) => prepareVisibilityTopology({
  metadata: { source: 'synthetic' }, spaces, openings, cells, conservativeReasons: []
});

function chain(count, kind = 'portal', width = 2) {
  const spaces = [], openings = [], cells = [];
  for (let index = 0; index < count; index += 1) {
    spaces.push(space(`S${index}`, index * 10, (index + 1) * 10, 0, 10, [`C${index}`]));
    cells.push(cell(`C${index}`, index, 0, index * 10, (index + 1) * 10, 0, 10));
    if (index > 0) openings.push(opening(
      `P${index}`, `S${index - 1}`, `S${index}`,
      { x: index * 10, z: 5 - width / 2 }, { x: index * 10, z: 5 + width / 2 },
      kind, kind === 'arch-aperture'
    ));
  }
  return prepared(spaces, openings, cells);
}

function grid(size) {
  const spaces = [], openings = [], cells = [];
  for (let x = 0; x < size; x += 1) for (let z = 0; z < size; z += 1) {
    const id = `${x}:${z}`;
    spaces.push(space(id, x * 10, (x + 1) * 10, z * 10, (z + 1) * 10, [`C${id}`]));
    cells.push(cell(`C${id}`, x, z, x * 10, (x + 1) * 10, z * 10, (z + 1) * 10));
    if (x > 0) openings.push(opening(`X${id}`, `${x - 1}:${z}`, id, { x: x * 10, z: z * 10 + 4 }, { x: x * 10, z: z * 10 + 6 }));
    if (z > 0) openings.push(opening(`Z${id}`, `${x}:${z - 1}`, id, { x: x * 10 + 4, z: z * 10 }, { x: x * 10 + 6, z: z * 10 }));
  }
  return prepared(spaces, openings, cells);
}

function pillarField(size) {
  const cells = [];
  const cellIds = [];
  for (let x = 0; x < size; x += 1) for (let z = 0; z < size; z += 1) {
    const id = `C${x}:${z}`;
    cellIds.push(id);
    cells.push(cell(id, x, z, x * 10, (x + 1) * 10, z * 10, (z + 1) * 10));
  }
  return prepared([space('pillar-expanse', 0, size * 10, 0, size * 10, cellIds)], [], cells);
}

function measure(name, topology, observer, options, iterations = 30) {
  for (let index = 0; index < 5; index += 1) createVisibilitySnapshot(topology, { position: observer }, options);
  const samples = [];
  for (let index = 0; index < iterations; index += 1) {
    const started = performance.now();
    createVisibilitySnapshot(topology, { position: observer }, options);
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  const averageMs = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const p95Ms = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))];
  return { name, averageMs, p95Ms };
}

test('visibility snapshot representative performance stays bounded', () => {
  const scenarios = [
    measure('ordinary-enclosed', chain(20), { x: 5, z: 5 }, { maxDistance: 80, captureFrontier: false }),
    measure('long-hallway', chain(64), { x: 5, z: 5 }, { maxDistance: 620, maxDepth: 80, captureFrontier: false }),
    measure('arch-rooms-apertures', chain(32, 'arch-aperture', 3.4), { x: 5, z: 5 }, { maxDistance: 300, maxDepth: 40, captureFrontier: false }),
    measure('pillar-field-expanse', pillarField(15), { x: 5, z: 5 }, { maxDistance: 120, captureFrontier: false }),
    measure('repeated-aligned-openings', chain(96, 'portal', 1.8), { x: 5, z: 5 }, { maxDistance: 900, maxDepth: 110, captureFrontier: false }),
    measure('large-conservative-scope', grid(20), { x: 5, z: 5 }, { maxDistance: 260, maxDepth: 2, captureFrontier: false }, 15)
  ];
  for (const result of scenarios) {
    console.log(`visibility benchmark ${result.name}: avg=${result.averageMs.toFixed(3)}ms p95=${result.p95Ms.toFixed(3)}ms`);
    assert.ok(result.averageMs < 75, `${result.name} average ${result.averageMs.toFixed(2)}ms exceeded 75ms safety ceiling`);
    assert.ok(result.p95Ms < 200, `${result.name} p95 ${result.p95Ms.toFixed(2)}ms exceeded 200ms safety ceiling`);
  }
});
