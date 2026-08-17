import { geometryId, type GeometryId, type LcgClassification, type PresentationValue } from './types.js';

export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];

export interface GeometryBounds {
  min: Vec3;
  max: Vec3;
}

export interface GeometryMeshData {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  bounds: GeometryBounds;
}

export interface GeometryBuildContext {
  dimensions: Vec3;
  parameters?: Readonly<Record<string, PresentationValue>>;
}

export interface GeometryDefinition {
  id: GeometryId;
  name: string;
  lcg: LcgClassification;
  builder: (context: GeometryBuildContext) => GeometryMeshData;
}

const EPSILON = 1e-8;

function emptyMesh(): GeometryMeshData {
  return {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
    bounds: { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
  };
}

function includePoint(data: GeometryMeshData, point: Vec3): void {
  data.bounds = {
    min: [Math.min(data.bounds.min[0], point[0]), Math.min(data.bounds.min[1], point[1]), Math.min(data.bounds.min[2], point[2])],
    max: [Math.max(data.bounds.max[0], point[0]), Math.max(data.bounds.max[1], point[1]), Math.max(data.bounds.max[2], point[2])]
  };
}

function appendVertex(data: GeometryMeshData, point: Vec3, normal: Vec3, uv: Vec2): number {
  const index = data.positions.length / 3;
  data.positions.push(point[0], point[1], point[2]);
  data.normals.push(normal[0], normal[1], normal[2]);
  data.uvs.push(uv[0], uv[1]);
  includePoint(data, point);
  return index;
}

function appendQuad(
  data: GeometryMeshData,
  points: readonly [Vec3, Vec3, Vec3, Vec3],
  normals: readonly [Vec3, Vec3, Vec3, Vec3],
  uvs: readonly [Vec2, Vec2, Vec2, Vec2] = [[0, 0], [1, 0], [1, 1], [0, 1]]
): void {
  const a = appendVertex(data, points[0], normals[0], uvs[0]);
  const b = appendVertex(data, points[1], normals[1], uvs[1]);
  const c = appendVertex(data, points[2], normals[2], uvs[2]);
  const d = appendVertex(data, points[3], normals[3], uvs[3]);
  data.indices.push(a, b, c, a, c, d);
}

function appendTriangle(data: GeometryMeshData, points: readonly [Vec3, Vec3, Vec3], normal: Vec3, uvs: readonly [Vec2, Vec2, Vec2]): void {
  const a = appendVertex(data, points[0], normal, uvs[0]);
  const b = appendVertex(data, points[1], normal, uvs[1]);
  const c = appendVertex(data, points[2], normal, uvs[2]);
  data.indices.push(a, b, c);
}

function normalize(point: Vec3): Vec3 {
  const length = Math.hypot(point[0], point[1], point[2]);
  return length <= EPSILON ? [0, 1, 0] : [point[0] / length, point[1] / length, point[2] / length];
}

function finitePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parameterNumber(context: GeometryBuildContext, key: string, fallback: number): number {
  const value = context.parameters?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parameterInteger(context: GeometryBuildContext, key: string, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(parameterNumber(context, key, fallback))));
}

export function triangleCount(data: GeometryMeshData): number { return data.indices.length / 3; }

export function geometryIsFinite(data: GeometryMeshData): boolean {
  return [...data.positions, ...data.normals, ...data.uvs].every(Number.isFinite)
    && data.indices.every((index) => Number.isInteger(index) && index >= 0 && index < data.positions.length / 3);
}

function positionKey(data: GeometryMeshData, vertexIndex: number): string {
  const offset = vertexIndex * 3;
  return [data.positions[offset]!, data.positions[offset + 1]!, data.positions[offset + 2]!]
    .map((value) => Math.round(value * 1e8) / 1e8)
    .join(',');
}

export function hasDuplicateTriangles(data: GeometryMeshData): boolean {
  const seen = new Set<string>();
  for (let index = 0; index < data.indices.length; index += 3) {
    const tri = [
      positionKey(data, data.indices[index]!),
      positionKey(data, data.indices[index + 1]!),
      positionKey(data, data.indices[index + 2]!)
    ].sort().join('|');
    if (seen.has(tri)) return true;
    seen.add(tri);
  }
  return false;
}

export function buildBox(context: GeometryBuildContext): GeometryMeshData {
  const [rawX, rawY, rawZ] = context.dimensions;
  const x = finitePositive(rawX, 1) / 2;
  const y = finitePositive(rawY, 1) / 2;
  const z = finitePositive(rawZ, 1) / 2;
  const data = emptyMesh();
  appendQuad(data, [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]], [[0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1]]);
  appendQuad(data, [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]], [[0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]]);
  appendQuad(data, [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]], [[1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0]]);
  appendQuad(data, [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]], [[-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0]]);
  appendQuad(data, [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]], [[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]]);
  appendQuad(data, [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]], [[0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0]]);
  return data;
}

export function buildPlane(context: GeometryBuildContext): GeometryMeshData {
  const [rawX, , rawZ] = context.dimensions;
  const x = finitePositive(rawX, 1) / 2;
  const z = finitePositive(rawZ, 1) / 2;
  const data = emptyMesh();
  appendQuad(data, [[-x, 0, z], [x, 0, z], [x, 0, -z], [-x, 0, -z]], [[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]]);
  return data;
}

export function buildPrism(context: GeometryBuildContext): GeometryMeshData {
  const [width, height, depth] = context.dimensions;
  const halfW = finitePositive(width, 1) / 2;
  const halfH = finitePositive(height, 1) / 2;
  const halfD = finitePositive(depth, 1) / 2;
  const data = emptyMesh();
  const front: readonly [Vec3, Vec3, Vec3] = [[-halfW, -halfH, halfD], [halfW, -halfH, halfD], [0, halfH, halfD]];
  const back: readonly [Vec3, Vec3, Vec3] = [[halfW, -halfH, -halfD], [-halfW, -halfH, -halfD], [0, halfH, -halfD]];
  appendTriangle(data, front, [0, 0, 1], [[0, 0], [1, 0], [0.5, 1]]);
  appendTriangle(data, back, [0, 0, -1], [[0, 0], [1, 0], [0.5, 1]]);
  appendQuad(data, [front[0], back[1], back[2], front[2]], [[-0.8, 0.6, 0], [-0.8, 0.6, 0], [-0.8, 0.6, 0], [-0.8, 0.6, 0]]);
  appendQuad(data, [front[2], back[2], back[0], front[1]], [[0.8, 0.6, 0], [0.8, 0.6, 0], [0.8, 0.6, 0], [0.8, 0.6, 0]]);
  appendQuad(data, [front[1], back[0], back[1], front[0]], [[0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0]]);
  return data;
}

interface CylinderOptions {
  openTop: boolean;
  openBottom: boolean;
  tapered: boolean;
}

function buildCylinderLike(context: GeometryBuildContext, options: CylinderOptions): GeometryMeshData {
  const [rawX, rawY, rawZ] = context.dimensions;
  const width = finitePositive(rawX, 1);
  const height = finitePositive(rawY, 1);
  const depth = finitePositive(rawZ, 1);
  const segments = parameterInteger(context, 'segments', 12, 6, 64);
  const topScale = options.tapered ? parameterNumber(context, 'topScale', 1) : 1;
  const bottomScale = options.tapered ? parameterNumber(context, 'bottomScale', 0.8) : 1;
  const data = emptyMesh();
  const y0 = -height / 2;
  const y1 = height / 2;
  for (let index = 0; index < segments; index += 1) {
    const a0 = index / segments * Math.PI * 2;
    const a1 = (index + 1) / segments * Math.PI * 2;
    const n0 = normalize([Math.sin(a0) / Math.max(width, EPSILON), 0, Math.cos(a0) / Math.max(depth, EPSILON)]);
    const n1 = normalize([Math.sin(a1) / Math.max(width, EPSILON), 0, Math.cos(a1) / Math.max(depth, EPSILON)]);
    const p0: Vec3 = [Math.sin(a0) * width * 0.5 * bottomScale, y0, Math.cos(a0) * depth * 0.5 * bottomScale];
    const p1: Vec3 = [Math.sin(a1) * width * 0.5 * bottomScale, y0, Math.cos(a1) * depth * 0.5 * bottomScale];
    const p2: Vec3 = [Math.sin(a1) * width * 0.5 * topScale, y1, Math.cos(a1) * depth * 0.5 * topScale];
    const p3: Vec3 = [Math.sin(a0) * width * 0.5 * topScale, y1, Math.cos(a0) * depth * 0.5 * topScale];
    appendQuad(data, [p0, p1, p2, p3], [n0, n1, n1, n0], [[index / segments, 0], [(index + 1) / segments, 0], [(index + 1) / segments, 1], [index / segments, 1]]);
    if (!options.openTop) appendTriangle(data, [[0, y1, 0], p3, p2], [0, 1, 0], [[0.5, 0.5], [0, 0], [1, 0]]);
    if (!options.openBottom) appendTriangle(data, [[0, y0, 0], p1, p0], [0, -1, 0], [[0.5, 0.5], [1, 0], [0, 0]]);
  }
  return data;
}

export function buildCylinder(context: GeometryBuildContext): GeometryMeshData {
  return buildCylinderLike(context, { openTop: false, openBottom: false, tapered: false });
}

export function buildOpenCylinder(context: GeometryBuildContext): GeometryMeshData {
  return buildCylinderLike(context, { openTop: true, openBottom: false, tapered: false });
}

/**
 * Builds one visible open-container mesh: tapered outer wall, structural rim,
 * inner wall and recessed interior floor. Hard rim transitions duplicate edge
 * vertices only for normals; there are no overlapping/coplanar visible faces.
 */
export function buildTaperedOpenContainer(context: GeometryBuildContext): GeometryMeshData {
  const [rawX, rawY, rawZ] = context.dimensions;
  const sx = finitePositive(rawX, 0.5);
  const sy = finitePositive(rawY, 0.5);
  const sz = finitePositive(rawZ, 0.5);
  const segments = parameterInteger(context, 'segments', 12, 8, 32);
  const rimHeight = Math.max(0.008, sy * parameterNumber(context, 'rimHeightRatio', 0.055));
  const rimTop = sy / 2;
  const rimBottom = rimTop - rimHeight;
  const bodyBottom = -sy / 2;
  const topRadiusX = sx * parameterNumber(context, 'topRadiusRatio', 0.455);
  const topRadiusZ = sz * parameterNumber(context, 'topRadiusRatio', 0.455);
  const bottomScale = parameterNumber(context, 'bottomRadiusScale', 0.82);
  const bottomRadiusX = topRadiusX * bottomScale;
  const bottomRadiusZ = topRadiusZ * bottomScale;
  const outerRadiusX = sx * parameterNumber(context, 'outerRimRatio', 0.49);
  const outerRadiusZ = sz * parameterNumber(context, 'outerRimRatio', 0.49);
  const innerRadiusX = sx * parameterNumber(context, 'innerRimRatio', 0.40);
  const innerRadiusZ = sz * parameterNumber(context, 'innerRimRatio', 0.40);
  const innerDepth = Math.min(sy * 0.38, Math.max(rimHeight * 2.2, sy * parameterNumber(context, 'interiorDepthRatio', 0.16)));
  const innerBottom = rimBottom - innerDepth;
  const data = emptyMesh();

  for (let index = 0; index < segments; index += 1) {
    const a0 = index / segments * Math.PI * 2;
    const a1 = (index + 1) / segments * Math.PI * 2;
    const u0 = index / segments;
    const u1 = (index + 1) / segments;
    const bodyHeight = Math.max(EPSILON, rimBottom - bodyBottom);
    const slopeX = (topRadiusX - bottomRadiusX) / bodyHeight;
    const slopeZ = (topRadiusZ - bottomRadiusZ) / bodyHeight;
    const bodyNormal = (angle: number): Vec3 => normalize([
      topRadiusZ * Math.sin(angle),
      -(slopeZ * topRadiusX * Math.cos(angle) ** 2 + slopeX * topRadiusZ * Math.sin(angle) ** 2),
      topRadiusX * Math.cos(angle)
    ]);
    const outerNormal0 = bodyNormal(a0);
    const outerNormal1 = bodyNormal(a1);
    const rimNormal0 = normalize([Math.sin(a0) / Math.max(sx, EPSILON), 0, Math.cos(a0) / Math.max(sz, EPSILON)]);
    const rimNormal1 = normalize([Math.sin(a1) / Math.max(sx, EPSILON), 0, Math.cos(a1) / Math.max(sz, EPSILON)]);
    const body0: Vec3 = [Math.sin(a0) * bottomRadiusX, bodyBottom, Math.cos(a0) * bottomRadiusZ];
    const body1: Vec3 = [Math.sin(a1) * bottomRadiusX, bodyBottom, Math.cos(a1) * bottomRadiusZ];
    const body2: Vec3 = [Math.sin(a1) * topRadiusX, rimBottom, Math.cos(a1) * topRadiusZ];
    const body3: Vec3 = [Math.sin(a0) * topRadiusX, rimBottom, Math.cos(a0) * topRadiusZ];
    appendQuad(data, [body0, body1, body2, body3], [outerNormal0, outerNormal1, outerNormal1, outerNormal0], [[u0, 0], [u1, 0], [u1, 0.88], [u0, 0.88]]);

    const outer0Bottom: Vec3 = [Math.sin(a0) * outerRadiusX, rimBottom, Math.cos(a0) * outerRadiusZ];
    const outer1Bottom: Vec3 = [Math.sin(a1) * outerRadiusX, rimBottom, Math.cos(a1) * outerRadiusZ];
    const outer0Top: Vec3 = [Math.sin(a0) * outerRadiusX, rimTop, Math.cos(a0) * outerRadiusZ];
    const outer1Top: Vec3 = [Math.sin(a1) * outerRadiusX, rimTop, Math.cos(a1) * outerRadiusZ];
    appendQuad(data, [outer0Bottom, outer1Bottom, outer1Top, outer0Top], [rimNormal0, rimNormal1, rimNormal1, rimNormal0], [[u0, 0.88], [u1, 0.88], [u1, 0.94], [u0, 0.94]]);

    const inner0Top: Vec3 = [Math.sin(a0) * innerRadiusX, rimTop, Math.cos(a0) * innerRadiusZ];
    const inner1Top: Vec3 = [Math.sin(a1) * innerRadiusX, rimTop, Math.cos(a1) * innerRadiusZ];
    appendQuad(data, [inner0Top, outer0Top, outer1Top, inner1Top], [[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]], [[u0, 0], [u0, 1], [u1, 1], [u1, 0]]);

    const innerNormal0: Vec3 = [-rimNormal0[0], 0, -rimNormal0[2]];
    const innerNormal1: Vec3 = [-rimNormal1[0], 0, -rimNormal1[2]];
    const inner0Bottom: Vec3 = [Math.sin(a0) * innerRadiusX * 0.96, innerBottom, Math.cos(a0) * innerRadiusZ * 0.96];
    const inner1Bottom: Vec3 = [Math.sin(a1) * innerRadiusX * 0.96, innerBottom, Math.cos(a1) * innerRadiusZ * 0.96];
    appendQuad(data, [inner1Bottom, inner0Bottom, inner0Top, inner1Top], [innerNormal1, innerNormal0, innerNormal0, innerNormal1], [[u1, 0], [u0, 0], [u0, 1], [u1, 1]]);
    appendTriangle(data, [[0, innerBottom, 0], inner0Bottom, inner1Bottom], [0, 1, 0], [[0.5, 0.5], [0, 0], [1, 0]]);
  }
  return data;
}

export function buildStrip(context: GeometryBuildContext): GeometryMeshData {
  const [width, height, depth] = context.dimensions;
  const data = buildBox({ dimensions: [width, height, depth] });
  return data;
}

export function extrudeProfile(profile: readonly Vec2[], depth: number): GeometryMeshData {
  if (profile.length < 3) throw new Error('Extruded profile requires at least three points');
  const halfDepth = finitePositive(depth, 0.1) / 2;
  const data = emptyMesh();
  for (let index = 1; index < profile.length - 1; index += 1) {
    const a = profile[0]!; const b = profile[index]!; const c = profile[index + 1]!;
    appendTriangle(data, [[a[0], a[1], halfDepth], [b[0], b[1], halfDepth], [c[0], c[1], halfDepth]], [0, 0, 1], [[0, 0], [1, 0], [1, 1]]);
    appendTriangle(data, [[a[0], a[1], -halfDepth], [c[0], c[1], -halfDepth], [b[0], b[1], -halfDepth]], [0, 0, -1], [[0, 0], [1, 1], [1, 0]]);
  }
  for (let index = 0; index < profile.length; index += 1) {
    const a = profile[index]!;
    const b = profile[(index + 1) % profile.length]!;
    const edgeX = b[0] - a[0];
    const edgeY = b[1] - a[1];
    const normal = normalize([edgeY, -edgeX, 0]);
    appendQuad(data, [[a[0], a[1], -halfDepth], [b[0], b[1], -halfDepth], [b[0], b[1], halfDepth], [a[0], a[1], halfDepth]], [normal, normal, normal, normal]);
  }
  return data;
}

export function buildArchProfileExtrusion(context: GeometryBuildContext): GeometryMeshData {
  const [width, height, depth] = context.dimensions;
  const halfWidth = finitePositive(width, 2) / 2;
  const totalHeight = finitePositive(height, 1);
  const segments = parameterInteger(context, 'segments', 10, 6, 32);
  const intradosRatio = Math.max(0.2, Math.min(0.9, parameterNumber(context, 'intradosRatio', 0.55)));
  const springY = totalHeight * (1 - intradosRatio);
  const points: Vec2[] = [[-halfWidth, 0], [halfWidth, 0], [halfWidth, totalHeight]];
  for (let index = 0; index <= segments; index += 1) {
    const angle = index / segments * Math.PI;
    points.push([Math.cos(angle) * halfWidth, springY + Math.sin(angle) * (totalHeight - springY)]);
  }
  points.push([-halfWidth, totalHeight]);
  return extrudeProfile(points, depth);
}

const DEFINITIONS: readonly GeometryDefinition[] = [
  { id: geometryId('geometry.box'), name: 'Box', lcg: 'LCG-0', builder: buildBox },
  { id: geometryId('geometry.plane'), name: 'Plane', lcg: 'LCG-0', builder: buildPlane },
  { id: geometryId('geometry.prism'), name: 'Prism', lcg: 'LCG-1', builder: buildPrism },
  { id: geometryId('geometry.cylinder'), name: 'Cylinder', lcg: 'LCG-2', builder: buildCylinder },
  { id: geometryId('geometry.open-cylinder'), name: 'Open Cylinder', lcg: 'LCG-2', builder: buildOpenCylinder },
  { id: geometryId('geometry.tapered-open-container'), name: 'Tapered Open Container', lcg: 'LCG-2', builder: buildTaperedOpenContainer },
  { id: geometryId('geometry.strip'), name: 'Strip', lcg: 'LCG-1', builder: buildStrip },
  { id: geometryId('geometry.arch-profile-extrusion'), name: 'Arch Profile Extrusion', lcg: 'LCG-2', builder: buildArchProfileExtrusion }
];

export const GEOMETRY_REGISTRY: ReadonlyMap<GeometryId, GeometryDefinition> = new Map(DEFINITIONS.map((definition) => [definition.id, definition]));

export function resolveGeometry(id: GeometryId, context: GeometryBuildContext): GeometryMeshData {
  const definition = GEOMETRY_REGISTRY.get(id);
  if (!definition) throw new Error(`Unknown Geometry ID: ${id}`);
  const mesh = definition.builder(context);
  if (!geometryIsFinite(mesh)) throw new Error(`Geometry ${id} produced invalid mesh data`);
  if (hasDuplicateTriangles(mesh)) throw new Error(`Geometry ${id} produced duplicate triangles`);
  return mesh;
}
