import assert from 'node:assert/strict';
import { analyzeNavigation, buildNavigationGrid } from '../scripts/coherence-metrics-lib.mjs';
export { analyzeNavigation, buildNavigationGrid };

export const { generateCell, validateCellPlacement } = await import('../.test-dist/src/world/generator.js');
export const { locateNearestRegion } = await import('../.test-dist/src/world/gen3.js');
export const {
  ARCH_IRREGULAR_CHANCE,
  PILLAR_MAX_WIDTH,
  PILLAR_MIN_WIDTH,
  PILLAR_SPACING,
  PILLAR_WIDTH_SCALE,
  gen3ArchDividerDiagnostic,
  gen3ArchSilhouetteDiagnostic,
  gen3JunctionDiagnostic,
  sampleGen3RegionInfluence
} = await import('../.test-dist/src/world/gen3Architecture.js');
export const { CELL_SIZE, DEFAULT_TUNING, WALL_HEIGHT } = await import('../.test-dist/src/world/types.js');

export const clean = (regionOverride) => ({
  ...DEFAULT_TUNING,
  regionOverride,
  conditionOverride: 'clear',
  carverOverride: 'none',
  structureOverride: 'none',
  gateBypass: true
});

export function cell(seed, x, z, tuning = DEFAULT_TUNING) {
  return generateCell({ seed, x, z, worldDay: 40, exposure: 10, shiftEpoch: 0, generationVersion: 'gen3-v1', tuning });
}

export function window(seed, centerX, centerZ, radius, tuning = DEFAULT_TUNING) {
  const cells = [];
  for (let x = centerX - radius; x <= centerX + radius; x += 1) {
    for (let z = centerZ - radius; z <= centerZ + radius; z += 1) cells.push(cell(seed, x, z, tuning));
  }
  return cells;
}

export function percentile(values, fraction) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
}

export function lowerTailMetrics(cells, startWorld) {
  const grid = buildNavigationGrid(cells, { step: 0.7, playerRadius: 0.42 });
  const nearest = (worldX, worldZ) => {
    const ix = Math.round((worldX - grid.minX) / grid.step);
    const iz = Math.round((worldZ - grid.minZ) / grid.step);
    for (let radius = 0; radius <= 10; radius += 1) for (let dx = -radius; dx <= radius; dx += 1) for (let dz = -radius; dz <= radius; dz += 1) {
      const x = ix + dx; const z = iz + dz;
      if (x < 0 || z < 0 || x >= grid.width || z >= grid.height) continue;
      const index = z * grid.width + x;
      if (grid.walkable[index]) return index;
    }
  };
  const neighbors = (index) => {
    const x = index % grid.width; const z = Math.floor(index / grid.width); const result = [];
    if (x > 0 && grid.walkable[index - 1]) result.push(index - 1);
    if (x + 1 < grid.width && grid.walkable[index + 1]) result.push(index + 1);
    if (z > 0 && grid.walkable[index - grid.width]) result.push(index - grid.width);
    if (z + 1 < grid.height && grid.walkable[index + grid.width]) result.push(index + grid.width);
    return result;
  };
  const start = nearest(startWorld.x, startWorld.z);
  assert.notEqual(start, undefined, 'no walkable start');
  const seen = new Uint8Array(grid.walkable.length);
  const queue = new Int32Array(grid.walkable.length); let head = 0; let tail = 0;
  queue[tail++] = start; seen[start] = 1;
  while (head < tail) {
    const current = queue[head++];
    for (const next of neighbors(current)) if (!seen[next]) { seen[next] = 1; queue[tail++] = next; }
  }
  const areas = [];
  for (let iz = 2; iz < grid.height - 2; iz += 6) for (let ix = 2; ix < grid.width - 2; ix += 6) {
    const index = iz * grid.width + ix; if (!seen[index]) continue;
    let left = 0; while (ix - left - 1 >= 0 && grid.walkable[index - left - 1]) left += 1;
    let right = 0; while (ix + right + 1 < grid.width && grid.walkable[index + right + 1]) right += 1;
    let north = 0; while (iz - north - 1 >= 0 && grid.walkable[index - (north + 1) * grid.width]) north += 1;
    let south = 0; while (iz + south + 1 < grid.height && grid.walkable[index + (south + 1) * grid.width]) south += 1;
    areas.push(Math.min(42, (left + right + 1) * grid.step) * Math.min(42, (north + south + 1) * grid.step));
  }
  const deadEnds = [];
  for (let startIndex = 0; startIndex < grid.walkable.length; startIndex += 1) {
    if (!seen[startIndex]) continue;
    const sx = startIndex % grid.width; const sz = Math.floor(startIndex / grid.width);
    if (sx < 2 || sz < 2 || sx >= grid.width - 2 || sz >= grid.height - 2) continue;
    if (neighbors(startIndex).filter((node) => seen[node]).length !== 1) continue;
    let previous = -1; let current = startIndex; let depth = 0; const guard = new Set([startIndex]);
    while (true) {
      const options = neighbors(current).filter((node) => seen[node] && node !== previous);
      if (options.length !== 1) break;
      previous = current; current = options[0]; depth += grid.step;
      if (guard.has(current) || depth > 40) break;
      guard.add(current);
      if (neighbors(current).filter((node) => seen[node]).length !== 2) break;
    }
    if (depth >= 1.4) deadEnds.push(depth);
  }
  return {
    openAreaP10: percentile(areas, 0.1),
    openAreaP25: percentile(areas, 0.25),
    oneEntryBranches: deadEnds.length,
    deadEndP50: percentile(deadEnds, 0.5),
    deadEndP90: percentile(deadEnds, 0.9),
    maxDeadEnd: deadEnds.length ? Math.max(...deadEnds) : 0
  };
}

export function worldToCell(value) { return Math.floor((value + CELL_SIZE / 2) / CELL_SIZE); }
export function nearestWalkable(grid, worldX, worldZ) {
  const ix = Math.round((worldX - grid.minX) / grid.step);
  const iz = Math.round((worldZ - grid.minZ) / grid.step);
  for (let radius = 0; radius <= 10; radius += 1) for (let dx = -radius; dx <= radius; dx += 1) for (let dz = -radius; dz <= radius; dz += 1) {
    const x = ix + dx; const z = iz + dz;
    if (x < 0 || z < 0 || x >= grid.width || z >= grid.height) continue;
    const index = z * grid.width + x;
    if (grid.walkable[index]) return index;
  }
}
export function canNavigate(cells, start, end) {
  const grid = buildNavigationGrid(cells, { step: 0.7, playerRadius: 0.42 });
  const startIndex = nearestWalkable(grid, start.x, start.z); const endIndex = nearestWalkable(grid, end.x, end.z);
  if (startIndex === undefined || endIndex === undefined) return false;
  const queue = new Int32Array(grid.walkable.length); const seen = new Uint8Array(grid.walkable.length); let head = 0; let tail = 0;
  queue[tail++] = startIndex; seen[startIndex] = 1;
  while (head < tail) {
    const current = queue[head++]; if (current === endIndex) return true;
    const x = current % grid.width; const z = Math.floor(current / grid.width); const candidates = [];
    if (x > 0) candidates.push(current - 1); if (x + 1 < grid.width) candidates.push(current + 1);
    if (z > 0) candidates.push(current - grid.width); if (z + 1 < grid.height) candidates.push(current + grid.width);
    for (const next of candidates) if (grid.walkable[next] && !seen[next]) { seen[next] = 1; queue[tail++] = next; }
  }
  return false;
}

export function transitionSides(seed, target) {
  const occurrence = locateNearestRegion({ seed, originX: 0, originZ: 0, target, worldDay: 40, exposure: 10, tuning: DEFAULT_TUNING, maxDistanceMeters: 12_000 });
  assert.ok(occurrence, `missing ${target} occurrence for ${seed}`);
  const key = target === 'pillar-field' ? 'pillar' : 'arch'; const exits = [];
  for (let directionIndex = 0; directionIndex < 24 && exits.length < 2; directionIndex += 1) {
    const angle = directionIndex / 24 * Math.PI * 2; const direction = { x: Math.cos(angle), z: Math.sin(angle) };
    const startStrength = sampleGen3RegionInfluence(seed, occurrence.worldX, occurrence.worldZ, 40, 10, DEFAULT_TUNING)[key];
    let lastInside = startStrength >= 0.18 ? { x: occurrence.worldX, z: occurrence.worldZ, strength: startStrength } : undefined;
    for (let distance = 28; distance <= 16_000; distance += 28) {
      const point = { x: occurrence.worldX + direction.x * distance, z: occurrence.worldZ + direction.z * distance };
      const influence = sampleGen3RegionInfluence(seed, point.x, point.z, 40, 10, DEFAULT_TUNING);
      const regionStrength = influence[key];
      if (regionStrength >= 0.18) lastInside = { ...point, strength: regionStrength };
      if (regionStrength < 0.08 && lastInside) { exits.push({ inside: lastInside, outside: point }); break; }
    }
  }
  assert.ok(exits.length >= 2, `${target} did not expose two finite exits`);
  return exits.slice(0, 2);
}
export function transitionCorridor(seed, start, end, tuning) {
  const paddingCells = 3; const cells = [];
  const minCellX = Math.min(worldToCell(start.x), worldToCell(end.x)) - paddingCells;
  const maxCellX = Math.max(worldToCell(start.x), worldToCell(end.x)) + paddingCells;
  const minCellZ = Math.min(worldToCell(start.z), worldToCell(end.z)) - paddingCells;
  const maxCellZ = Math.max(worldToCell(start.z), worldToCell(end.z)) + paddingCells;
  for (let x = minCellX; x <= maxCellX; x += 1) for (let z = minCellZ; z <= maxCellZ; z += 1) cells.push(cell(seed, x, z, tuning));
  return cells;
}

export function wallWorld(cellDescriptor, wall) {
  const baseX = cellDescriptor.address.cellX * CELL_SIZE; const baseZ = cellDescriptor.address.cellZ * CELL_SIZE; const horizontal = wall.orientation === 'z';
  return { id: wall.id, orientation: wall.orientation, fixed: horizontal ? baseZ + wall.cz : baseX + wall.cx, start: horizontal ? baseX + wall.cx - wall.sx / 2 : baseZ + wall.cz - wall.sz / 2, end: horizontal ? baseX + wall.cx + wall.sx / 2 : baseZ + wall.cz + wall.sz / 2, minY: wall.cy - wall.sy / 2, maxY: wall.cy + wall.sy / 2, cy: wall.cy, sy: wall.sy, materialId: wall.materialId };
}
export function isCellBoundary(value) { return Math.abs((value - CELL_SIZE / 2) / CELL_SIZE - Math.round((value - CELL_SIZE / 2) / CELL_SIZE)) < 0.0002; }
