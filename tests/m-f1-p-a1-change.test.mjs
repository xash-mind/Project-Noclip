import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const presentationSource = await readFile(new URL('../src/renderer/level0SurfacePresentation.ts', import.meta.url), 'utf8');
const { generateCell } = await import('../.test-dist/src/world/generator.js');
const { CELL_SIZE, DEFAULT_TUNING } = await import('../.test-dist/src/world/types.js');
const { PILLAR_WALL_CLEARANCE } = await import('../.test-dist/src/world/gen3SpaceTopologyBuild.js');

function boundsForWall(entry, wall) {
  const originX = entry.address.cellX * CELL_SIZE;
  const originZ = entry.address.cellZ * CELL_SIZE;
  const cx = originX + wall.cx;
  const cz = originZ + wall.cz;
  return {
    minX: cx - wall.sx / 2,
    maxX: cx + wall.sx / 2,
    minZ: cz - wall.sz / 2,
    maxZ: cz + wall.sz / 2,
    sx: wall.sx,
    sz: wall.sz
  };
}

function boundsForPillar(entry, prop) {
  const originX = entry.address.cellX * CELL_SIZE;
  const originZ = entry.address.cellZ * CELL_SIZE;
  const cx = originX + prop.position.x;
  const cz = originZ + prop.position.z;
  return {
    minX: cx - prop.scale.x / 2,
    maxX: cx + prop.scale.x / 2,
    minZ: cz - prop.scale.z / 2,
    maxZ: cz + prop.scale.z / 2
  };
}

function intervalOverlap(aMin, aMax, bMin, bMax) {
  return aMax > bMin && aMin < bMax;
}

function edgeGap(firstMin, firstMax, secondMin, secondMax) {
  if (firstMax <= secondMin) return secondMin - firstMax;
  if (secondMax <= firstMin) return firstMin - secondMax;
  return 0;
}

test('P-A1 wallpaper presentation uses one rectangular visible solid without corner skins', () => {
  assert.match(presentationSource, /function pillarWallpaperReferenceWall/);
  assert.match(presentationSource, /setMaterial\(core, wallMaterial\(cache, descriptor, pillarWallpaperReferenceWall\(prop\)\)\)/);
  assert.match(presentationSource, /child\.name\.startsWith\(`\$\{prop\.id\}:wallpaper:`\)/);
  assert.equal(presentationSource.includes('cornerOverlap'), false);
  assert.equal(presentationSource.includes("const faces = ['north', 'south', 'west', 'east']"), false);
  assert.equal(presentationSource.includes('function addBox('), false);
  assert.equal(presentationSource.includes("entityByName(container, `${prop.id}:body`)?.destroy()"), false);
});

test('P-A1 piers are nudged into room interiors instead of hugging partition boundaries', () => {
  const tuning = {
    ...DEFAULT_TUNING,
    regionOverride: 'pillar-field',
    conditionOverride: 'clear',
    carverOverride: 'none',
    structureOverride: 'none',
    gateBypass: true
  };
  const entries = [];
  for (let x = -4; x <= 4; x += 1) {
    for (let z = -4; z <= 4; z += 1) {
      entries.push(generateCell({
        seed: 'p-a1-room-offset-regression',
        x,
        z,
        worldDay: 40,
        exposure: 10,
        shiftEpoch: 0,
        generationVersion: 'gen3-v1',
        tuning
      }));
    }
  }

  const walls = entries.flatMap((entry) => entry.walls.map((wall) => boundsForWall(entry, wall)));
  const interiorEntries = entries.filter((entry) => Math.abs(entry.address.cellX) <= 3 && Math.abs(entry.address.cellZ) <= 3);
  let checkedPillars = 0;
  let minimumGap = Infinity;

  for (const entry of interiorEntries) {
    for (const prop of entry.props.filter((candidate) => candidate.kind === 'column')) {
      checkedPillars += 1;
      const pillar = boundsForPillar(entry, prop);
      for (const wall of walls) {
        if (wall.sx >= wall.sz) {
          if (!intervalOverlap(pillar.minX, pillar.maxX, wall.minX, wall.maxX)) continue;
          minimumGap = Math.min(minimumGap, edgeGap(pillar.minZ, pillar.maxZ, wall.minZ, wall.maxZ));
        } else {
          if (!intervalOverlap(pillar.minZ, pillar.maxZ, wall.minZ, wall.maxZ)) continue;
          minimumGap = Math.min(minimumGap, edgeGap(pillar.minX, pillar.maxX, wall.minX, wall.maxX));
        }
      }
    }
  }

  assert.ok(checkedPillars > 20, `only ${checkedPillars} P-A1 piers checked`);
  assert.ok(Number.isFinite(minimumGap), 'no Pillar-to-wall clearance sample was found');
  assert.ok(
    minimumGap >= PILLAR_WALL_CLEARANCE - 1e-6,
    `minimum P-A1 wall clearance ${minimumGap.toFixed(3)} m < ${PILLAR_WALL_CLEARANCE.toFixed(3)} m`
  );
});