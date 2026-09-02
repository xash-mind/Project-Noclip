import { CELL_SIZE, type FloorPatchSpec } from '../world/types.js';

export interface Cvh1FloorSurfaceMeshData {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  visibleArea: number;
}

export interface Cvh1FloorSurfaceProfile {
  strategy: 'single-indexed-planar-mesh';
  topY: number;
  carpetRepeatMeters: number;
  renderEntitiesPerHoleCell: 1;
  internalSideFaces: false;
  handoffGeometry: false;
}

interface Cvh1HoleBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const CVH1_FLOOR_TOP_Y = 0;
const CVH1_CARPET_REPEAT_METERS = CELL_SIZE / 5;

function cvh1HoleBounds(hole: FloorPatchSpec): Cvh1HoleBounds {
  const half = CELL_SIZE / 2;
  return {
    minX: Math.max(-half, hole.position.x - hole.scale.x / 2),
    maxX: Math.min(half, hole.position.x + hole.scale.x / 2),
    minZ: Math.max(-half, hole.position.z - hole.scale.z / 2),
    maxZ: Math.min(half, hole.position.z + hole.scale.z / 2)
  };
}

function cvh1PointInsideHole(x: number, z: number, holes: readonly Cvh1HoleBounds[]): boolean {
  return holes.some((hole) => x > hole.minX && x < hole.maxX && z > hole.minZ && z < hole.maxZ);
}

/** One watertight top surface using exact semantic Hole bounds. */
export function cvh1FloorSurfaceMesh(holes: readonly FloorPatchSpec[]): Cvh1FloorSurfaceMeshData {
  const half = CELL_SIZE / 2;
  const bounds = holes.map(cvh1HoleBounds);
  const xEdges = [...new Set([-half, half, ...bounds.flatMap((hole) => [hole.minX, hole.maxX])])].sort((a, b) => a - b);
  const zEdges = [...new Set([-half, half, ...bounds.flatMap((hole) => [hole.minZ, hole.maxZ])])].sort((a, b) => a - b);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const vertices = new Map<string, number>();
  let visibleArea = 0;

  const vertex = (xIndex: number, zIndex: number): number => {
    const key = `${xIndex}:${zIndex}`;
    const existing = vertices.get(key);
    if (existing !== undefined) return existing;
    const x = xEdges[xIndex]!;
    const z = zEdges[zIndex]!;
    const index = positions.length / 3;
    positions.push(x, CVH1_FLOOR_TOP_Y, z);
    normals.push(0, 1, 0);
    uvs.push((x + half) / CVH1_CARPET_REPEAT_METERS, (z + half) / CVH1_CARPET_REPEAT_METERS);
    vertices.set(key, index);
    return index;
  };

  for (let zIndex = 1; zIndex < zEdges.length; zIndex += 1) {
    const minZ = zEdges[zIndex - 1]!;
    const maxZ = zEdges[zIndex]!;
    if (maxZ - minZ <= 0.000001) continue;
    for (let xIndex = 1; xIndex < xEdges.length; xIndex += 1) {
      const minX = xEdges[xIndex - 1]!;
      const maxX = xEdges[xIndex]!;
      if (maxX - minX <= 0.000001) continue;
      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;
      if (cvh1PointInsideHole(centerX, centerZ, bounds)) continue;
      const southwest = vertex(xIndex - 1, zIndex - 1);
      const northwest = vertex(xIndex - 1, zIndex);
      const northeast = vertex(xIndex, zIndex);
      const southeast = vertex(xIndex, zIndex - 1);
      indices.push(southwest, northwest, northeast, southwest, northeast, southeast);
      visibleArea += (maxX - minX) * (maxZ - minZ);
    }
  }
  return { positions, normals, uvs, indices, visibleArea };
}

export function cvh1FloorSurfaceProfile(): Cvh1FloorSurfaceProfile {
  return {
    strategy: 'single-indexed-planar-mesh',
    topY: CVH1_FLOOR_TOP_Y,
    carpetRepeatMeters: CVH1_CARPET_REPEAT_METERS,
    renderEntitiesPerHoleCell: 1,
    internalSideFaces: false,
    handoffGeometry: false
  };
}
