import * as pc from 'playcanvas';
import {
  M_F1_HOUSING_DIFFUSE,
  mFluorescentFixtureGeometryData,
  mFluorescentFixtureHousingName
} from './fixtureVisualOwnership.js';
import { makeMaterial } from './support.js';

interface MFluorescentFixtureResources {
  housing: pc.Mesh;
  diffuser: pc.Mesh;
  housingMaterial: pc.StandardMaterial;
}

export interface MFluorescentFixtureVisual {
  housing: pc.Entity;
  panel: pc.Entity;
}

export interface MFluorescentFixtureGeometryDiagnostics {
  resourceBuilds: number;
  resourceReuseHits: number;
  fixtureVisualsCreated: number;
  housingMeshInstancesCreated: number;
  diffuserMeshInstancesCreated: number;
}

const resourcesByDevice = new WeakMap<object, MFluorescentFixtureResources>();
const diagnostics: MFluorescentFixtureGeometryDiagnostics = {
  resourceBuilds: 0,
  resourceReuseHits: 0,
  fixtureVisualsCreated: 0,
  housingMeshInstancesCreated: 0,
  diffuserMeshInstancesCreated: 0
};

export function fixtureVisualGeometryDiagnosticsSnapshot(): MFluorescentFixtureGeometryDiagnostics {
  return { ...diagnostics };
}

function meshFromData(app: pc.Application, data: ReturnType<typeof mFluorescentFixtureGeometryData>['housing']): pc.Mesh {
  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(data.positions);
  mesh.setNormals(data.normals);
  mesh.setUvs(0, data.uvs);
  mesh.setIndices(data.indices);
  mesh.update();
  return mesh;
}

function fixtureResources(app: pc.Application): MFluorescentFixtureResources {
  const deviceKey = app.graphicsDevice as object;
  const existing = resourcesByDevice.get(deviceKey);
  if (existing) {
    diagnostics.resourceReuseHits += 1;
    return existing;
  }

  const geometry = mFluorescentFixtureGeometryData();
  const created: MFluorescentFixtureResources = {
    housing: meshFromData(app, geometry.housing),
    diffuser: meshFromData(app, geometry.diffuser),
    housingMaterial: makeMaterial([...M_F1_HOUSING_DIFFUSE] as [number, number, number])
  };
  resourcesByDevice.set(deviceKey, created);
  diagnostics.resourceBuilds += 1;
  return created;
}

function meshEntity(
  name: string,
  parent: pc.Entity,
  mesh: pc.Mesh,
  material: pc.StandardMaterial,
  position: readonly [number, number, number],
  rotationY: number
): pc.Entity {
  const entity = new pc.Entity(name);
  entity.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, material)] });
  entity.setLocalPosition(position[0], position[1], position[2]);
  if (rotationY) entity.setLocalEulerAngles(0, rotationY, 0);
  if (entity.render) entity.render.castShadows = false;
  parent.addChild(entity);
  return entity;
}

/**
 * Realizes one semantic fixture as two renderer siblings sharing canonical GPU
 * mesh resources: static housing and independently material-addressable diffuser.
 */
export function createMFluorescentFixtureVisual(
  app: pc.Application,
  parent: pc.Entity,
  panelName: string,
  position: readonly [number, number, number],
  rotationY: number,
  panelMaterial: pc.StandardMaterial
): MFluorescentFixtureVisual {
  const resources = fixtureResources(app);
  const housing = meshEntity(
    mFluorescentFixtureHousingName(panelName),
    parent,
    resources.housing,
    resources.housingMaterial,
    position,
    rotationY
  );
  const panel = meshEntity(panelName, parent, resources.diffuser, panelMaterial, position, rotationY);
  diagnostics.fixtureVisualsCreated += 1;
  diagnostics.housingMeshInstancesCreated += 1;
  diagnostics.diffuserMeshInstancesCreated += 1;
  return { housing, panel };
}
