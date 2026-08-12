const DEFAULT_STEP = 0.7;
const DEFAULT_RADIUS = 0.42;
const BUCKET_SIZE = 4.2;

function key(ix, iz) { return `${ix}:${iz}`; }
function percentile(values, fraction) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
}

function obstacleBounds(cell, spec) {
  const worldX = cell.address.cellX * 14;
  const worldZ = cell.address.cellZ * 14;
  return {
    minX: worldX + spec.cx - spec.sx / 2,
    maxX: worldX + spec.cx + spec.sx / 2,
    minZ: worldZ + spec.cz - spec.sz / 2,
    maxZ: worldZ + spec.cz + spec.sz / 2
  };
}

function propBounds(cell, prop) {
  const rotated = Math.abs((prop.rotationY ?? 0) % 180) > 45;
  const sx = rotated ? prop.scale.z : prop.scale.x;
  const sz = rotated ? prop.scale.x : prop.scale.z;
  const worldX = cell.address.cellX * 14 + prop.position.x;
  const worldZ = cell.address.cellZ * 14 + prop.position.z;
  return { minX: worldX - sx / 2, maxX: worldX + sx / 2, minZ: worldZ - sz / 2, maxZ: worldZ + sz / 2 };
}

export function collectObstacles(cells) {
  return cells.flatMap((cell) => [
    ...cell.walls.map((wall) => obstacleBounds(cell, wall)),
    ...cell.props.filter((prop) => prop.solid).map((prop) => propBounds(cell, prop))
  ]);
}

function bucketIndex(value) { return Math.floor(value / BUCKET_SIZE); }
function indexObstacles(obstacles) {
  const buckets = new Map();
  obstacles.forEach((obstacle, index) => {
    for (let bx = bucketIndex(obstacle.minX); bx <= bucketIndex(obstacle.maxX); bx += 1) {
      for (let bz = bucketIndex(obstacle.minZ); bz <= bucketIndex(obstacle.maxZ); bz += 1) {
        const bucketKey = key(bx, bz);
        const list = buckets.get(bucketKey) ?? [];
        list.push(index);
        buckets.set(bucketKey, list);
      }
    }
  });
  return buckets;
}

function blockedAt(x, z, radius, obstacles, buckets) {
  const seen = new Set();
  for (let bx = bucketIndex(x - radius); bx <= bucketIndex(x + radius); bx += 1) {
    for (let bz = bucketIndex(z - radius); bz <= bucketIndex(z + radius); bz += 1) {
      for (const index of buckets.get(key(bx, bz)) ?? []) {
        if (seen.has(index)) continue;
        seen.add(index);
        const obstacle = obstacles[index];
        if (x + radius > obstacle.minX && x - radius < obstacle.maxX && z + radius > obstacle.minZ && z - radius < obstacle.maxZ) return true;
      }
    }
  }
  return false;
}

function nearestWalkable(grid, x, z) {
  const ix = Math.round((x - grid.minX) / grid.step);
  const iz = Math.round((z - grid.minZ) / grid.step);
  for (let radius = 0; radius <= 8; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) for (let dz = -radius; dz <= radius; dz += 1) {
      const nx = ix + dx; const nz = iz + dz;
      if (nx < 0 || nz < 0 || nx >= grid.width || nz >= grid.height) continue;
      const index = nz * grid.width + nx;
      if (grid.walkable[index]) return index;
    }
  }
  return undefined;
}

function neighbors(grid, index) {
  const ix = index % grid.width; const iz = Math.floor(index / grid.width);
  const result = [];
  if (ix > 0 && grid.walkable[index - 1]) result.push(index - 1);
  if (ix + 1 < grid.width && grid.walkable[index + 1]) result.push(index + 1);
  if (iz > 0 && grid.walkable[index - grid.width]) result.push(index - grid.width);
  if (iz + 1 < grid.height && grid.walkable[index + grid.width]) result.push(index + grid.width);
  return result;
}

function flood(grid, start) {
  const visited = new Uint8Array(grid.walkable.length);
  const previous = new Int32Array(grid.walkable.length); previous.fill(-1);
  const queue = new Int32Array(grid.walkable.length);
  let head = 0; let tail = 0;
  visited[start] = 1; queue[tail++] = start;
  while (head < tail) {
    const current = queue[head++];
    for (const next of neighbors(grid, current)) {
      if (visited[next]) continue;
      visited[next] = 1; previous[next] = current; queue[tail++] = next;
    }
  }
  return { visited, previous, count: tail };
}

function componentSizes(grid) {
  const seen = new Uint8Array(grid.walkable.length);
  const sizes = [];
  const queue = new Int32Array(grid.walkable.length);
  for (let start = 0; start < grid.walkable.length; start += 1) {
    if (!grid.walkable[start] || seen[start]) continue;
    let head = 0; let tail = 0; seen[start] = 1; queue[tail++] = start;
    while (head < tail) {
      const current = queue[head++];
      for (const next of neighbors(grid, current)) {
        if (seen[next]) continue;
        seen[next] = 1; queue[tail++] = next;
      }
    }
    sizes.push(tail);
  }
  return sizes.sort((a, b) => b - a);
}

function maxDeadEndDepth(grid, visited) {
  let maximum = 0;
  for (let start = 0; start < grid.walkable.length; start += 1) {
    if (!visited[start]) continue;
    const sx = start % grid.width; const sz = Math.floor(start / grid.width);
    if (sx < 2 || sz < 2 || sx >= grid.width - 2 || sz >= grid.height - 2) continue;
    if (neighbors(grid, start).filter((node) => visited[node]).length !== 1) continue;
    let previous = -1; let current = start; let depth = 0;
    const guard = new Set([start]);
    while (true) {
      const options = neighbors(grid, current).filter((node) => visited[node] && node !== previous);
      if (options.length !== 1) break;
      previous = current; current = options[0]; depth += grid.step;
      if (guard.has(current) || depth > 80) break;
      guard.add(current);
      const degree = neighbors(grid, current).filter((node) => visited[node]).length;
      if (degree !== 2) break;
    }
    maximum = Math.max(maximum, depth);
  }
  return maximum;
}

function openAreaSamples(grid, visited) {
  const areas = [];
  const stride = 8;
  for (let iz = 2; iz < grid.height - 2; iz += stride) for (let ix = 2; ix < grid.width - 2; ix += stride) {
    const index = iz * grid.width + ix;
    if (!visited[index]) continue;
    let left = 0; while (ix - left - 1 >= 0 && grid.walkable[index - left - 1]) left += 1;
    let right = 0; while (ix + right + 1 < grid.width && grid.walkable[index + right + 1]) right += 1;
    let north = 0; while (iz - north - 1 >= 0 && grid.walkable[index - (north + 1) * grid.width]) north += 1;
    let south = 0; while (iz + south + 1 < grid.height && grid.walkable[index + (south + 1) * grid.width]) south += 1;
    const width = Math.min(42, (left + right + 1) * grid.step);
    const depth = Math.min(42, (north + south + 1) * grid.step);
    areas.push(width * depth);
  }
  return areas;
}

function pathToFarthestBoundary(grid, floodResult) {
  let target = -1; let bestDistance = -1;
  const startX = grid.startIndex % grid.width; const startZ = Math.floor(grid.startIndex / grid.width);
  for (let index = 0; index < grid.walkable.length; index += 1) {
    if (!floodResult.visited[index]) continue;
    const ix = index % grid.width; const iz = Math.floor(index / grid.width);
    if (ix !== 0 && iz !== 0 && ix !== grid.width - 1 && iz !== grid.height - 1) continue;
    const distance = Math.abs(ix - startX) + Math.abs(iz - startZ);
    if (distance > bestDistance) { bestDistance = distance; target = index; }
  }
  if (target < 0) return { boundaryReached: false, cellsCrossed: 0, pathMeters: 0 };
  let current = target; let steps = 0; const cells = new Set();
  while (current >= 0) {
    const ix = current % grid.width; const iz = Math.floor(current / grid.width);
    const worldX = grid.minX + ix * grid.step; const worldZ = grid.minZ + iz * grid.step;
    cells.add(`${Math.floor((worldX + 7) / 14)}:${Math.floor((worldZ + 7) / 14)}`);
    if (current === grid.startIndex) break;
    current = floodResult.previous[current]; steps += 1;
  }
  return { boundaryReached: true, cellsCrossed: cells.size, pathMeters: steps * grid.step };
}

export function buildNavigationGrid(cells, options = {}) {
  const step = options.step ?? DEFAULT_STEP;
  const radius = options.playerRadius ?? DEFAULT_RADIUS;
  const minCellX = Math.min(...cells.map((cell) => cell.address.cellX));
  const maxCellX = Math.max(...cells.map((cell) => cell.address.cellX));
  const minCellZ = Math.min(...cells.map((cell) => cell.address.cellZ));
  const maxCellZ = Math.max(...cells.map((cell) => cell.address.cellZ));
  const minX = minCellX * 14 - 7 + step / 2;
  const maxX = maxCellX * 14 + 7 - step / 2;
  const minZ = minCellZ * 14 - 7 + step / 2;
  const maxZ = maxCellZ * 14 + 7 - step / 2;
  const width = Math.floor((maxX - minX) / step) + 1;
  const height = Math.floor((maxZ - minZ) / step) + 1;
  const obstacles = collectObstacles(cells);
  const buckets = indexObstacles(obstacles);
  const walkable = new Uint8Array(width * height);
  let walkableCount = 0;
  for (let iz = 0; iz < height; iz += 1) for (let ix = 0; ix < width; ix += 1) {
    const worldX = minX + ix * step; const worldZ = minZ + iz * step;
    const index = iz * width + ix;
    if (!blockedAt(worldX, worldZ, radius, obstacles, buckets)) { walkable[index] = 1; walkableCount += 1; }
  }
  return { minX, minZ, maxX, maxZ, width, height, step, walkable, walkableCount, obstacles };
}

export function analyzeNavigation(cells, options = {}) {
  const grid = buildNavigationGrid(cells, options);
  const startWorld = options.startWorld ?? { x: 0, z: 0 };
  const startIndex = nearestWalkable(grid, startWorld.x, startWorld.z);
  if (startIndex === undefined) return { reachableAreaRatio: 0, isolatedPockets: 1, isolatedAreaRatio: 1, maxDeadEndDepth: 0, openAreaP50: 0, openAreaP90: 0, openAreaP99: 0, boundaryReached: false, cellsCrossed: 0, pathMeters: 0, walkableNodes: grid.walkableCount, reachableNodes: 0 };
  grid.startIndex = startIndex;
  const reached = flood(grid, startIndex);
  const components = componentSizes(grid);
  const isolatedNodes = components.slice(1).reduce((sum, size) => sum + size, 0);
  const openAreas = openAreaSamples(grid, reached.visited);
  const traversal = pathToFarthestBoundary(grid, reached);
  return {
    reachableAreaRatio: grid.walkableCount ? reached.count / grid.walkableCount : 0,
    isolatedPockets: Math.max(0, components.length - 1),
    isolatedAreaRatio: grid.walkableCount ? isolatedNodes / grid.walkableCount : 0,
    maxDeadEndDepth: maxDeadEndDepth(grid, reached.visited),
    openAreaP50: percentile(openAreas, 0.5),
    openAreaP90: percentile(openAreas, 0.9),
    openAreaP99: percentile(openAreas, 0.99),
    boundaryReached: traversal.boundaryReached,
    cellsCrossed: traversal.cellsCrossed,
    pathMeters: traversal.pathMeters,
    walkableNodes: grid.walkableCount,
    reachableNodes: reached.count
  };
}
