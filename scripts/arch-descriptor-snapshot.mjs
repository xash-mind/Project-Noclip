import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = (path) => pathToFileURL(resolve(process.cwd(), '.test-dist', path)).href;
const { locateNearestRegion } = await import(moduleUrl('src/world/gen3.js'));
const { generateCell } = await import(moduleUrl('src/world/generator.js'));
const { CELL_SIZE, DEFAULT_TUNING } = await import(moduleUrl('src/world/types.js'));

const seed = 'sparse-1';
const worldDay = 40;
const exposure = 10;
const tuning = { ...DEFAULT_TUNING, gateBypass: true };
const occurrence = locateNearestRegion({
  seed,
  originX: 0,
  originZ: 0,
  target: 'arch-rooms',
  worldDay,
  exposure,
  tuning
});
if (!occurrence) throw new Error('Arch Rooms not found for descriptor evidence seed');

const worldToCell = (value) => Math.floor((value + CELL_SIZE / 2) / CELL_SIZE);
const originX = worldToCell(occurrence.worldX);
const originZ = worldToCell(occurrence.worldZ);
const offsets = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]];
const descriptors = offsets.map(([dx, dz]) => generateCell({
  seed,
  x: originX + dx,
  z: originZ + dz,
  worldDay,
  exposure,
  shiftEpoch: 0,
  tuning,
  generationVersion: 'gen3-v1'
}));

process.stdout.write(`${JSON.stringify({ seed, worldDay, exposure, occurrence, originX, originZ, descriptors }, null, 2)}\n`);
