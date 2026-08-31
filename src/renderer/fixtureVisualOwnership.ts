import type { GeometryMeshData, Vec3 } from '../presentation/geometry.js';

export interface MFluorescentPanelVisualAddress {
  name: string;
  x: number;
  z: number;
}

export interface MFluorescentFixtureIdentity {
  id: string;
  panelName: string;
  housingName: string;
}

export interface MFluorescentFixtureGeometryData {
  housing: GeometryMeshData;
  diffuser: GeometryMeshData;
}

export const M_F1_PANEL_POSITION_TOLERANCE = 0.035;
export const M_F1_PANEL_DIMENSIONS = Object.freeze([2.2, 0.08, 0.38] as const);
export const M_F1_FIXTURE_LCG = 'LCG-1' as const;
export const M_F1_HOUSING_FRAME_WIDTH = 0.025;
export const M_F1_DIFFUSER_RECESS = 0.003;
export const M_F1_HOUSING_DIFFUSE = Object.freeze([0.64, 0.63, 0.56] as const);

function meshData(min: Vec3, max: Vec3): GeometryMeshData {
  return {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
    bounds: { min, max }
  };
}

function appendQuad(
  data: GeometryMeshData,
  points: readonly [Vec3, Vec3, Vec3, Vec3],
  normal: Vec3
): void {
  const base = data.positions.length / 3;
  for (const point of points) data.positions.push(point[0], point[1], point[2]);
  for (let index = 0; index < 4; index += 1) data.normals.push(normal[0], normal[1], normal[2]);
  data.uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
  data.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

/**
 * One clean rectangular tray/frame mesh inside the accepted M-F1 envelope.
 * The ring is modelled as one indexed mesh with no overlapping primitive bars.
 */
function buildHousingGeometry(): GeometryMeshData {
  const outerX = M_F1_PANEL_DIMENSIONS[0] / 2;
  const halfHeight = M_F1_PANEL_DIMENSIONS[1] / 2;
  const outerZ = M_F1_PANEL_DIMENSIONS[2] / 2;
  const innerX = outerX - M_F1_HOUSING_FRAME_WIDTH;
  const innerZ = outerZ - M_F1_HOUSING_FRAME_WIDTH;
  const bottomY = -halfHeight;
  const topY = halfHeight;
  const data = meshData([-outerX, bottomY, -outerZ], [outerX, topY, outerZ]);

  // Bottom-facing manufactured frame lip: four non-overlapping ring segments.
  appendQuad(data, [[-outerX, bottomY, -outerZ], [outerX, bottomY, -outerZ], [innerX, bottomY, -innerZ], [-innerX, bottomY, -innerZ]], [0, -1, 0]);
  appendQuad(data, [[outerX, bottomY, outerZ], [-outerX, bottomY, outerZ], [-innerX, bottomY, innerZ], [innerX, bottomY, innerZ]], [0, -1, 0]);
  appendQuad(data, [[-outerX, bottomY, outerZ], [-outerX, bottomY, -outerZ], [-innerX, bottomY, -innerZ], [-innerX, bottomY, innerZ]], [0, -1, 0]);
  appendQuad(data, [[outerX, bottomY, -outerZ], [outerX, bottomY, outerZ], [innerX, bottomY, innerZ], [innerX, bottomY, -innerZ]], [0, -1, 0]);

  // Outer shell walls.
  appendQuad(data, [[-outerX, bottomY, outerZ], [outerX, bottomY, outerZ], [outerX, topY, outerZ], [-outerX, topY, outerZ]], [0, 0, 1]);
  appendQuad(data, [[outerX, bottomY, -outerZ], [-outerX, bottomY, -outerZ], [-outerX, topY, -outerZ], [outerX, topY, -outerZ]], [0, 0, -1]);
  appendQuad(data, [[outerX, bottomY, outerZ], [outerX, bottomY, -outerZ], [outerX, topY, -outerZ], [outerX, topY, outerZ]], [1, 0, 0]);
  appendQuad(data, [[-outerX, bottomY, -outerZ], [-outerX, bottomY, outerZ], [-outerX, topY, outerZ], [-outerX, topY, -outerZ]], [-1, 0, 0]);

  // Inner aperture walls face the diffuser opening.
  appendQuad(data, [[innerX, bottomY, innerZ], [-innerX, bottomY, innerZ], [-innerX, topY, innerZ], [innerX, topY, innerZ]], [0, 0, -1]);
  appendQuad(data, [[-innerX, bottomY, -innerZ], [innerX, bottomY, -innerZ], [innerX, topY, -innerZ], [-innerX, topY, -innerZ]], [0, 0, 1]);
  appendQuad(data, [[innerX, bottomY, -innerZ], [innerX, bottomY, innerZ], [innerX, topY, innerZ], [innerX, topY, -innerZ]], [-1, 0, 0]);
  appendQuad(data, [[-innerX, bottomY, innerZ], [-innerX, bottomY, -innerZ], [-innerX, topY, -innerZ], [-innerX, topY, innerZ]], [1, 0, 0]);

  // Top ring closes the housing cleanly against the ceiling side.
  appendQuad(data, [[-innerX, topY, -innerZ], [innerX, topY, -innerZ], [outerX, topY, -outerZ], [-outerX, topY, -outerZ]], [0, 1, 0]);
  appendQuad(data, [[innerX, topY, innerZ], [-innerX, topY, innerZ], [-outerX, topY, outerZ], [outerX, topY, outerZ]], [0, 1, 0]);
  appendQuad(data, [[-innerX, topY, innerZ], [-innerX, topY, -innerZ], [-outerX, topY, -outerZ], [-outerX, topY, outerZ]], [0, 1, 0]);
  appendQuad(data, [[innerX, topY, -innerZ], [innerX, topY, innerZ], [outerX, topY, outerZ], [outerX, topY, -outerZ]], [0, 1, 0]);

  return data;
}

/** One independently material-addressable luminous surface, recessed behind the frame lip. */
function buildDiffuserGeometry(): GeometryMeshData {
  const halfHeight = M_F1_PANEL_DIMENSIONS[1] / 2;
  const halfX = M_F1_PANEL_DIMENSIONS[0] / 2 - M_F1_HOUSING_FRAME_WIDTH;
  const halfZ = M_F1_PANEL_DIMENSIONS[2] / 2 - M_F1_HOUSING_FRAME_WIDTH;
  const y = -halfHeight + M_F1_DIFFUSER_RECESS;
  const data = meshData([-halfX, y, -halfZ], [halfX, y, halfZ]);
  appendQuad(data, [[-halfX, y, -halfZ], [halfX, y, -halfZ], [halfX, y, halfZ], [-halfX, y, halfZ]], [0, -1, 0]);
  return data;
}

const CANONICAL_M_F1_GEOMETRY: MFluorescentFixtureGeometryData = Object.freeze({
  housing: buildHousingGeometry(),
  diffuser: buildDiffuserGeometry()
});

/** Pure deterministic canonical geometry data; runtime GPU resources are cached by the realization helper. */
export function mFluorescentFixtureGeometryData(): MFluorescentFixtureGeometryData {
  return CANONICAL_M_F1_GEOMETRY;
}

export function mFluorescentFixtureHousingName(panelName: string): string {
  return `${panelName}:housing`;
}

export function mFluorescentFixtureIdentity(groupId: string, fixtureIndex: number): MFluorescentFixtureIdentity {
  const panelName = `${groupId}:fixture:${fixtureIndex}`;
  return {
    id: `${groupId}:${fixtureIndex}`,
    panelName,
    housingName: mFluorescentFixtureHousingName(panelName)
  };
}

export function isMFluorescentPanelVisualName(name: string): boolean {
  return /^fixture:\d+$/.test(name) || /:fixture:\d+$/.test(name);
}

export function isMFluorescentHousingVisualName(name: string): boolean {
  return /^fixture:\d+:housing$/.test(name) || /:fixture:\d+:housing$/.test(name);
}

export function findMFluorescentPanelVisualIndex(
  candidates: readonly MFluorescentPanelVisualAddress[],
  fixtureX: number,
  fixtureZ: number
): number {
  return candidates.findIndex((candidate) =>
    isMFluorescentPanelVisualName(candidate.name)
    && Math.abs(candidate.x - fixtureX) <= M_F1_PANEL_POSITION_TOLERANCE
    && Math.abs(candidate.z - fixtureZ) <= M_F1_PANEL_POSITION_TOLERANCE
  );
}
