import * as pc from 'playcanvas';
import type { PropSpec } from '../world/types.js';
import { resolveGeometry, type GeometryMeshData } from '../presentation/geometry.js';
import { semanticTargetForPropKind, LEVEL0_FEATURE_PRESENTATION_REGISTRY, MEDIUM_BUCKET_TARGET, SMALL_GREY_OPEN_PAINT_CAN_TARGET } from '../presentation/level0FeatureRepresentations.js';
import { presentationMaterial } from '../presentation/materials.js';
import { resolveRepresentation } from '../presentation/registry.js';
import type { PresentationMaterialId, PresentationValue } from '../presentation/types.js';
import type { TextureKind } from './support.js';

export type PresentationMaterialFactory = (key: string, diffuse: [number, number, number], textureKind?: TextureKind, variant?: number, tiling?: [number, number], emissive?: [number, number, number], emissiveIntensity?: number, uvOffset?: [number, number]) => pc.StandardMaterial;
export type PresentationBoxFactory = (name: string, parent: pc.Entity, position: [number, number, number], scale: [number, number, number], material: pc.StandardMaterial, rotationY?: number) => pc.Entity;

export interface Level0FeaturePresentationHost {
  app: pc.Application;
  getMaterial: PresentationMaterialFactory;
  box: PresentationBoxFactory;
}

function numberParameter(parameters: Readonly<Record<string, PresentationValue>>, key: string, fallback: number): number {
  const value = parameters[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function meshEntity(app: pc.Application, name: string, parent: pc.Entity, data: GeometryMeshData, material: pc.StandardMaterial): pc.Entity {
  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(data.positions);
  mesh.setNormals(data.normals);
  mesh.setUvs(0, data.uvs);
  mesh.setIndices(data.indices);
  mesh.update();
  const entity = new pc.Entity(name);
  entity.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, material)] });
  parent.addChild(entity);
  return entity;
}

function resolveMaterial(host: Level0FeaturePresentationHost, id: PresentationMaterialId, variant = 0): pc.StandardMaterial {
  const definition = presentationMaterial(id);
  return host.getMaterial(
    `presentation:${definition.id}`,
    [...definition.diffuse] as [number, number, number],
    definition.textureKind,
    variant || definition.variant,
    [...definition.tiling] as [number, number],
    definition.emissive ? [...definition.emissive] as [number, number, number] : undefined,
    definition.emissiveIntensity
  );
}

function addBucketHandle(
  container: pc.Entity,
  prop: PropSpec,
  parameters: Readonly<Record<string, PresentationValue>>,
  material: pc.StandardMaterial,
  box: PresentationBoxFactory
): void {
  const sx = prop.scale.x;
  const sy = prop.scale.y;
  const handleWidth = sx * numberParameter(parameters, 'handleWidthRatio', 0.72);
  const handleHalf = handleWidth / 2;
  const verticalHeight = sy * numberParameter(parameters, 'handleHeightRatio', 0.34);
  const bar = Math.max(0.018, Math.min(0.025, sx * 0.045));
  const topY = sy * 0.34;
  const lowerY = topY - verticalHeight / 2;
  box(`${prop.id}:handle-top`, container, [0, topY, 0], [handleWidth, bar, bar], material);
  box(`${prop.id}:handle-left`, container, [-handleHalf + bar / 2, lowerY, 0], [bar, verticalHeight, bar], material);
  box(`${prop.id}:handle-right`, container, [handleHalf - bar / 2, lowerY, 0], [bar, verticalHeight, bar], material);
}

function addPaintCanLabel(
  container: pc.Entity,
  prop: PropSpec,
  parameters: Readonly<Record<string, PresentationValue>>,
  material: pc.StandardMaterial,
  box: PresentationBoxFactory
): void {
  const sx = prop.scale.x;
  const sy = prop.scale.y;
  const sz = prop.scale.z;
  const segments = Math.max(8, Math.round(numberParameter(parameters, 'segments', 12)));
  const topRadius = sz * numberParameter(parameters, 'topRadiusRatio', 0.455);
  const frontFacet = topRadius * Math.cos(Math.PI / segments);
  const labelZ = -(frontFacet + 0.007);
  const width = sx * numberParameter(parameters, 'labelWidthRatio', 0.46);
  const height = sy * numberParameter(parameters, 'labelHeightRatio', 0.33);
  box(`${prop.id}:label-residue`, container, [sx * 0.03, -sy * 0.03, labelZ], [width, height, 0.006], material);
  box(`${prop.id}:label-remnant`, container, [-sx * 0.18, -sy * 0.19, labelZ - 0.002], [sx * 0.10, sy * 0.07, 0.004], material);
}

/**
 * PAU Run 1 pilot adapter. It resolves semantic Feature -> Representation ->
 * Geometry/Material data and translates only the resolved presentation into
 * PlayCanvas entities. It never mutates PropSpec or world identity.
 */
export function addLevel0PilotFeaturePresentation(
  parent: pc.Entity,
  prop: PropSpec,
  host: Level0FeaturePresentationHost
): pc.Entity | undefined {
  const semanticTarget = semanticTargetForPropKind(prop.kind);
  if (!semanticTarget) return undefined;
  const resolved = resolveRepresentation(
    semanticTarget,
    LEVEL0_FEATURE_PRESENTATION_REGISTRY,
    (definition) => Boolean(definition.geometryId)
  );
  if (!resolved?.definition.geometryId) return undefined;

  const container = new pc.Entity(prop.id);
  container.setLocalPosition(prop.position.x, prop.position.y, prop.position.z);
  if (prop.rotationY) container.setLocalEulerAngles(0, prop.rotationY, 0);
  parent.addChild(container);

  const meshData = resolveGeometry(resolved.definition.geometryId, {
    dimensions: [prop.scale.x, prop.scale.y, prop.scale.z],
    parameters: resolved.definition.parameters
  });
  const surfaceMaterialId = resolved.definition.materialIds[0];
  if (!surfaceMaterialId) throw new Error(`Representation ${resolved.definition.id} has no surface material`);
  const surfaceMaterial = resolveMaterial(host, surfaceMaterialId, prop.materialVariant ?? 0);
  meshEntity(host.app, `${prop.id}:surface`, container, meshData, surfaceMaterial);

  if (semanticTarget === MEDIUM_BUCKET_TARGET) {
    const handleMaterialId = resolved.definition.materialIds[1];
    if (handleMaterialId) addBucketHandle(container, prop, resolved.definition.parameters, resolveMaterial(host, handleMaterialId), host.box);
  } else if (semanticTarget === SMALL_GREY_OPEN_PAINT_CAN_TARGET) {
    const residueMaterialId = resolved.definition.materialIds[1];
    if (residueMaterialId) addPaintCanLabel(container, prop, resolved.definition.parameters, resolveMaterial(host, residueMaterialId), host.box);
  }
  return container;
}
