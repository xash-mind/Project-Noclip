import * as pc from 'playcanvas';
import { createItemInstance } from '../items/factory.js';
import { ITEM_DEFINITIONS, type ItemDefinitionId } from '../items/definitions.js';
import type { ItemInstance } from '../items/types.js';
import type { SaveData } from '../persistence/types.js';
import { CELL_SIZE, WALL_HEIGHT, type CellDescriptor, type FloorPatchSpec, type PropSpec, type WallSpec } from '../world/types.js';
import { ZONE_PROFILES, type ZoneProfile } from '../world/zones.js';
import { LEVEL0_SEPARATE_BASE_TRIM } from './level0Wallpaper.js';
import type { ObjectCatalogEntry } from './objectCatalog.js';
import { color, type CellVisual, type ExitVisual, type InteractionVisual, type NoteVisual, type SeatVisual, type TextureKind, type WorldCollider, type WorldItemVisual } from './support.js';

export type MaterialFactory = (key: string, diffuse: [number, number, number], textureKind?: TextureKind, variant?: number, tiling?: [number, number], emissive?: [number, number, number], emissiveIntensity?: number, uvOffset?: [number, number]) => pc.StandardMaterial;
export type BoxFactory = (name: string, parent: pc.Entity, position: [number, number, number], scale: [number, number, number], material: pc.StandardMaterial, rotationY?: number) => pc.Entity;

type MeshPoint = readonly [number, number, number];
interface SimpleMeshData {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}

function appendMeshQuad(
  data: SimpleMeshData,
  points: readonly [MeshPoint, MeshPoint, MeshPoint, MeshPoint],
  normal: MeshPoint
): void {
  const base = data.positions.length / 3;
  for (const point of points) data.positions.push(point[0], point[1], point[2]);
  for (let index = 0; index < 4; index += 1) data.normals.push(normal[0], normal[1], normal[2]);
  data.uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
  data.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

const CATALOG_PROP_SCALE: Record<PropSpec['kind'], [number, number, number]> = {
  table: [1.6, 0.78, 0.8],
  chair: [0.58, 0.9, 0.58],
  cabinet: [1.0, 1.8, 0.8],
  box: [1.0, 0.7, 0.9],
  divider: [1.8, 1.4, 0.12],
  pipe: [0.12, 2.2, 0.12],
  column: [0.65, 2.4, 0.65],
  bench: [1.8, 0.65, 0.6],
  book: [0.5, 0.08, 0.7],
  'wall-panel': [1.8, 1.6, 0.16],
  'ceiling-gap': [1.2, 0.06, 1.2],
  stain: [1.2, 0.02, 1.0],
  'carpet-patch': [1.2, 0.02, 1.0],
  sign: [1.4, 0.65, 0.08],
  bucket: [0.62, 0.58, 0.62],
  'paint-can': [0.34, 0.38, 0.34]
};

export class RendererCellBuilder {
  constructor(
    private readonly app: pc.Application,
    private readonly save: SaveData,
    private readonly walls: Map<string, WorldCollider>,
    private readonly interactions: Map<string, InteractionVisual>,
    private readonly getMaterial: MaterialFactory,
    private readonly box: BoxFactory
  ) {}

  buildCell(descriptor: CellDescriptor): CellVisual {
    const root = new pc.Entity(`cell:${descriptor.id}:${descriptor.roomArchetype}`);
    root.setPosition(descriptor.address.cellX * CELL_SIZE, 0, descriptor.address.cellZ * CELL_SIZE);
    this.app.root.addChild(root);
    const legacyExitFoyer = descriptor.world.generationVersion === 'gen2' && descriptor.world.structureIds.includes('exit-structure');
    const gen3 = descriptor.world.generationVersion === 'gen3-v1';
    const profile = descriptor.world.structureIds.includes('manila-room')
      ? ZONE_PROFILES.manila
      : legacyExitFoyer
        ? ZONE_PROFILES['exit-threshold']
        : gen3
          ? ZONE_PROFILES.baseline
          : ZONE_PROFILES[descriptor.address.zoneId];
    const floorMat = this.getMaterial(`floor:${profile.id}`, profile.floorTint, 'carpet', gen3 ? 0 : descriptor.variant % 3, [5, 5]);
    const ceilingMat = this.getMaterial(`ceiling:${profile.id}`, profile.ceilingTint, 'ceiling', gen3 ? 0 : descriptor.ceilingPattern, [4, 4]);
    const trimMat = this.getMaterial(`trim:${profile.id}`, profile.trimTint, 'wood', gen3 ? 0 : descriptor.variant % 2, [2, 2]);
    const concrete = this.getMaterial('concrete', [0.52, 0.52, 0.47], 'concrete', descriptor.variant % 3, [2, 2]);
    const fixtureMat = this.getMaterial(`fixture:${profile.id}`, [0.69, 0.68, 0.53], undefined, 0, [1, 1], [0.84, 0.82, 0.61], descriptor.lightFailure ? 0.03 : 1.3 * profile.lightMultiplier * descriptor.lightTemperature);

    this.box('floor', root, [0, -0.12, 0], [CELL_SIZE, 0.24, CELL_SIZE], floorMat);
    this.box('ceiling', root, [0, WALL_HEIGHT + 0.12, 0], [CELL_SIZE, 0.24, CELL_SIZE], ceilingMat);

    const colliders: WorldCollider[] = [];
    for (const wallSpec of descriptor.walls) {
      const wallLength = Math.max(wallSpec.sx, wallSpec.sz);
      const wallRepeats = Math.max(1, wallLength / 2.6);
      const longAxisIsX = wallSpec.orientation === 'z';
      const worldStart = longAxisIsX
        ? descriptor.address.cellX * CELL_SIZE + wallSpec.cx - wallSpec.sx / 2
        : descriptor.address.cellZ * CELL_SIZE + wallSpec.cz - wallSpec.sz / 2;
      const phase = ((worldStart / 2.6) % 1 + 1) % 1;
      const wallMat = legacyExitFoyer
        ? concrete
        : this.getMaterial(
          `wall:${wallSpec.materialId ?? profile.id}`,
          wallSpec.materialId === 'arch-pale-wallpaper' ? ZONE_PROFILES.arch.wallTint : profile.wallTint,
          'wall', wallSpec.materialVariant ?? descriptor.variant % 4, [wallRepeats, 1], undefined, 1, gen3 ? [phase, 0] : [0, 0]
        );
      this.box(wallSpec.id, root, [wallSpec.cx, wallSpec.cy, wallSpec.cz], [wallSpec.sx, wallSpec.sy, wallSpec.sz], wallMat);
      const collider = this.toWorldCollider(descriptor, wallSpec);
      colliders.push(collider); this.walls.set(collider.id, collider);
      if ((!gen3 || LEVEL0_SEPARATE_BASE_TRIM) && wallSpec.cy - wallSpec.sy / 2 < 0.04) {
        const horizontal = wallSpec.orientation === 'z';
        this.box(`${wallSpec.id}:skirting`, root, [wallSpec.cx, 0.11, wallSpec.cz], [horizontal ? wallSpec.sx : wallSpec.sx + 0.012, 0.22, horizontal ? wallSpec.sz + 0.012 : wallSpec.sz], trimMat);
      }
    }

    this.addLighting(descriptor, root, fixtureMat);
    for (const patch of descriptor.floorPatches) this.addFloorPatch(root, patch, profile);
    for (const prop of descriptor.props) this.addProp(descriptor, root, prop, colliders);
    const interactions = this.addInteractions(descriptor, root);
    return { descriptor, root, colliders, interactions };
  }

  private addLighting(descriptor: CellDescriptor, root: pc.Entity, fixtureMat: pc.StandardMaterial): void {
    const positions = descriptor.roomArchetype.includes('corridor') || descriptor.roomArchetype === 'narrow-hall'
      ? [[0, -3.8], [0, 0], [0, 3.8]]
      : descriptor.world.generationVersion === 'gen2' && descriptor.address.zoneId === 'pillar'
        ? [[-4.3, -4.3], [0, -4.3], [4.3, -4.3], [-4.3, 4.3], [0, 4.3], [4.3, 4.3]]
        : [[-3.4, -2.4], [3.4, 2.4], [-3.4, 2.4], [3.4, -2.4]];
    positions.forEach(([x, z], index) => this.box(`fixture:${index}`, root, [x!, WALL_HEIGHT - 0.08, z!], [2.2, 0.08, 0.38], fixtureMat, descriptor.ceilingPattern % 2 ? 90 : 0));
  }

  private addFloorPatch(root: pc.Entity, patch: FloorPatchSpec, profile: ZoneProfile): void {
    if (patch.kind === 'hole') { this.addHolePatch(root, patch, profile); return; }
    const tints: Record<Exclude<FloorPatchSpec['kind'], 'hole'>, [number, number, number]> = {
      damp: [profile.floorTint[0] * 0.66, profile.floorTint[1] * 0.68, profile.floorTint[2] * 0.72],
      worn: [profile.floorTint[0] * 1.12, profile.floorTint[1] * 1.08, profile.floorTint[2] * 0.96],
      dark: [profile.floorTint[0] * 0.52, profile.floorTint[1] * 0.54, profile.floorTint[2] * 0.58],
      dry: [profile.floorTint[0] * 1.18, profile.floorTint[1] * 1.14, profile.floorTint[2] * 1.08]
    };
    const mat = this.getMaterial(`patch:${profile.id}:${patch.kind}`, tints[patch.kind], 'carpet', patch.id.length % 3, [2.5, 2.5]);
    this.box(patch.id, root, [patch.position.x, 0.004, patch.position.z], [patch.scale.x, 0.008, patch.scale.z], mat);
  }

  private addHolePatch(root: pc.Entity, patch: FloorPatchSpec, profile: ZoneProfile): void {
    void profile;
    const voidMat = this.getMaterial('hole:void', [0.003, 0.003, 0.002], undefined);
    const x = patch.position.x; const z = patch.position.z; const sx = patch.scale.x; const sz = patch.scale.z;
    this.box(`${patch.id}:void`, root, [x, -0.08, z], [sx, 0.18, sz], voidMat);
  }

  private materialsForProp(profile: ZoneProfile, prop: PropSpec): Record<PropSpec['kind'], pc.StandardMaterial> {
    return {
      table: this.getMaterial('prop:wood', [0.31, 0.18, 0.095], 'wood', prop.materialVariant ?? 0, [2, 2]),
      chair: this.getMaterial('prop:chair', [0.24, 0.16, 0.09], 'wood', prop.materialVariant ?? 1),
      cabinet: this.getMaterial('prop:cabinet', [0.28, 0.29, 0.25], 'concrete', prop.materialVariant ?? 0),
      box: this.getMaterial('prop:box', [0.38, 0.28, 0.16], 'wood', prop.materialVariant ?? 0),
      divider: this.getMaterial('prop:divider', profile.wallTint, 'wall', prop.materialVariant ?? 0, [2, 1]),
      pipe: this.getMaterial('prop:pipe', [0.22, 0.23, 0.2], 'concrete', prop.materialVariant ?? 0),
      column: this.getMaterial('prop:column', profile.wallTint, 'wall', prop.materialVariant ?? 0, [1, 1]),
      bench: this.getMaterial('prop:bench', [0.31, 0.19, 0.1], 'wood', prop.materialVariant ?? 0),
      book: this.getMaterial('prop:book', [0.22, 0.045, 0.027], 'paper', 2),
      'wall-panel': this.getMaterial('prop:panel', profile.trimTint, 'wood', prop.materialVariant ?? 0),
      'ceiling-gap': this.getMaterial('prop:void', [0.005, 0.005, 0.004]),
      stain: this.getMaterial('prop:stain', [0.12, 0.09, 0.045], 'carpet', prop.materialVariant ?? 0),
      'carpet-patch': this.getMaterial('prop:carpet', profile.floorTint, 'carpet', prop.materialVariant ?? 0),
      sign: this.getMaterial('prop:sign', [0.15, 0.18, 0.13], undefined, 0, [1, 1], [0.08, 0.17, 0.07], 0.55),
      bucket: this.getMaterial('prop:bucket', [0.37, 0.35, 0.29], 'concrete', prop.materialVariant ?? 0),
      'paint-can': this.getMaterial('prop:paint-can', [0.46, 0.47, 0.45], 'concrete', prop.materialVariant ?? 0)
    };
  }

  private addProp(descriptor: CellDescriptor, root: pc.Entity, prop: PropSpec, colliders: WorldCollider[]): void {
    this.addPropGeometry(root, prop, descriptor.world.generationVersion === 'gen3-v1' ? ZONE_PROFILES.baseline : ZONE_PROFILES[descriptor.address.zoneId]);
    if (prop.solid) {
      const rotated = Math.abs((prop.rotationY ?? 0) % 180) > 45;
      const spec: WallSpec = {
        id: `solid:${prop.id}`, cx: prop.position.x, cy: prop.position.y, cz: prop.position.z,
        sx: rotated ? prop.scale.z : prop.scale.x, sy: prop.scale.y, sz: rotated ? prop.scale.x : prop.scale.z,
        orientation: (rotated ? prop.scale.z : prop.scale.x) < (rotated ? prop.scale.x : prop.scale.z) ? 'x' : 'z', drawable: false
      };
      const collider = this.toWorldCollider(descriptor, spec);
      colliders.push(collider); this.walls.set(collider.id, collider);
    }
  }

  private meshEntity(name: string, parent: pc.Entity, data: SimpleMeshData, material: pc.StandardMaterial): pc.Entity {
    const mesh = new pc.Mesh(this.app.graphicsDevice);
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

  private addOpenContainerGeometry(
    container: pc.Entity,
    prop: PropSpec,
    material: pc.StandardMaterial,
    isPaintCan: boolean
  ): void {
    const sx = prop.scale.x; const sy = prop.scale.y; const sz = prop.scale.z;
    const sides = 8;
    const step = Math.PI * 2 / sides;
    const rimHeight = Math.max(0.025, sy * 0.055);
    const bodyTop = sy / 2 - rimHeight;
    const bodyBottom = -sy / 2;
    const topRadiusX = sx * 0.455;
    const topRadiusZ = sz * 0.455;
    const bottomScale = isPaintCan ? 0.98 : 0.82;
    const bottomRadiusX = topRadiusX * bottomScale;
    const bottomRadiusZ = topRadiusZ * bottomScale;
    const body: SimpleMeshData = { positions: [], normals: [], uvs: [], indices: [] };

    for (let index = 0; index < sides; index += 1) {
      const a0 = index * step - step / 2;
      const a1 = index * step + step / 2;
      const mid = index * step;
      const p0: MeshPoint = [Math.sin(a0) * bottomRadiusX, bodyBottom, Math.cos(a0) * bottomRadiusZ];
      const p1: MeshPoint = [Math.sin(a1) * bottomRadiusX, bodyBottom, Math.cos(a1) * bottomRadiusZ];
      const p2: MeshPoint = [Math.sin(a1) * topRadiusX, bodyTop, Math.cos(a1) * topRadiusZ];
      const p3: MeshPoint = [Math.sin(a0) * topRadiusX, bodyTop, Math.cos(a0) * topRadiusZ];
      appendMeshQuad(body, [p0, p1, p2, p3], [Math.sin(mid), 0, Math.cos(mid)]);
    }
    this.meshEntity(`${prop.id}:body`, container, body, material);

    const rimMaterial = this.getMaterial(
      isPaintCan ? 'prop:paint-can-rim' : 'prop:bucket-rim',
      isPaintCan ? [0.58, 0.59, 0.56] : [0.43, 0.41, 0.34],
      'concrete',
      1
    );
    const outerRadiusX = sx * 0.49;
    const outerRadiusZ = sz * 0.49;
    const innerRadiusX = sx * (isPaintCan ? 0.405 : 0.40);
    const innerRadiusZ = sz * (isPaintCan ? 0.405 : 0.40);
    const rimTop = sy / 2;
    const rimBottom = bodyTop;
    const rim: SimpleMeshData = { positions: [], normals: [], uvs: [], indices: [] };
    for (let index = 0; index < sides; index += 1) {
      const a0 = index * step - step / 2;
      const a1 = index * step + step / 2;
      const mid = index * step;
      const outer0Top: MeshPoint = [Math.sin(a0) * outerRadiusX, rimTop, Math.cos(a0) * outerRadiusZ];
      const outer1Top: MeshPoint = [Math.sin(a1) * outerRadiusX, rimTop, Math.cos(a1) * outerRadiusZ];
      const outer0Bottom: MeshPoint = [Math.sin(a0) * outerRadiusX, rimBottom, Math.cos(a0) * outerRadiusZ];
      const outer1Bottom: MeshPoint = [Math.sin(a1) * outerRadiusX, rimBottom, Math.cos(a1) * outerRadiusZ];
      const inner0Top: MeshPoint = [Math.sin(a0) * innerRadiusX, rimTop, Math.cos(a0) * innerRadiusZ];
      const inner1Top: MeshPoint = [Math.sin(a1) * innerRadiusX, rimTop, Math.cos(a1) * innerRadiusZ];
      const inner0Bottom: MeshPoint = [Math.sin(a0) * innerRadiusX, rimBottom, Math.cos(a0) * innerRadiusZ];
      const inner1Bottom: MeshPoint = [Math.sin(a1) * innerRadiusX, rimBottom, Math.cos(a1) * innerRadiusZ];
      const radial: MeshPoint = [Math.sin(mid), 0, Math.cos(mid)];
      appendMeshQuad(rim, [outer0Bottom, outer1Bottom, outer1Top, outer0Top], radial);
      appendMeshQuad(rim, [inner1Bottom, inner0Bottom, inner0Top, inner1Top], [-radial[0], 0, -radial[2]]);
      appendMeshQuad(rim, [inner0Top, outer0Top, outer1Top, inner1Top], [0, 1, 0]);
    }
    this.meshEntity(`${prop.id}:rim`, container, rim, rimMaterial);

    const cavityMaterial = this.getMaterial('prop:open-container-cavity', [0.025, 0.026, 0.023]);
    const cavity = new pc.Entity(`${prop.id}:interior`);
    cavity.addComponent('render', { type: 'cylinder' });
    cavity.setLocalPosition(0, rimBottom - rimHeight * 0.5, 0);
    cavity.setLocalScale(innerRadiusX * 1.76, rimHeight * 0.18, innerRadiusZ * 1.76);
    if (cavity.render) cavity.render.material = cavityMaterial;
    container.addChild(cavity);

    if (isPaintCan) {
      const residue = this.getMaterial('prop:paint-can-label-residue', [0.57, 0.56, 0.49], 'paper', 0);
      const frontFacet = topRadiusZ * Math.cos(step / 2);
      const labelZ = -(frontFacet + 0.007);
      this.box(`${prop.id}:label-residue`, container, [sx * 0.03, -sy * 0.03, labelZ], [sx * 0.46, sy * 0.33, 0.006], residue);
      this.box(`${prop.id}:label-remnant`, container, [-sx * 0.18, -sy * 0.19, labelZ - 0.002], [sx * 0.10, sy * 0.07, 0.004], residue);
    } else {
      const handle = this.getMaterial('prop:bucket-handle', [0.24, 0.24, 0.21], 'concrete', 0);
      const handleX = sx * 0.43;
      this.box(`${prop.id}:handle-top`, container, [0, sy * 0.34, 0], [sx * 0.72, 0.025, 0.025], handle);
      this.box(`${prop.id}:handle-left`, container, [-handleX, sy * 0.18, 0], [0.025, sy * 0.34, 0.025], handle);
      this.box(`${prop.id}:handle-right`, container, [handleX, sy * 0.18, 0], [0.025, sy * 0.34, 0.025], handle);
      this.box(`${prop.id}:handle-anchor-left`, container, [-handleX, sy * 0.03, 0], [0.045, 0.055, 0.045], handle);
      this.box(`${prop.id}:handle-anchor-right`, container, [handleX, sy * 0.03, 0], [0.045, 0.055, 0.045], handle);
    }
  }

  private addPropGeometry(parent: pc.Entity, prop: PropSpec, profile: ZoneProfile): pc.Entity {
    const container = new pc.Entity(prop.id);
    container.setLocalPosition(prop.position.x, prop.position.y, prop.position.z);
    if (prop.rotationY) container.setLocalEulerAngles(0, prop.rotationY, 0);
    parent.addChild(container);
    const material = this.materialsForProp(profile, prop)[prop.kind];
    const sx = prop.scale.x; const sy = prop.scale.y; const sz = prop.scale.z;

    if (prop.kind === 'table') {
      const top = Math.min(0.14, sy * 0.22); const legHeight = Math.max(0.08, sy - top); const leg = Math.min(0.12, Math.min(sx, sz) * 0.16);
      this.box(`${prop.id}:top`, container, [0, sy / 2 - top / 2, 0], [sx, top, sz], material);
      for (const [index, [x, z]] of ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as Array<[number, number]>).entries()) this.box(`${prop.id}:leg:${index}`, container, [x * (sx / 2 - leg), -top / 2, z * (sz / 2 - leg)], [leg, legHeight, leg], material);
    } else if (prop.kind === 'chair') {
      const seat = Math.min(0.13, sy * 0.18); const seatY = -sy * 0.05;
      this.box(`${prop.id}:seat`, container, [0, seatY, 0], [sx, seat, sz], material);
      this.box(`${prop.id}:back`, container, [0, sy * 0.28, sz / 2 - 0.06], [sx, sy * 0.55, 0.12], material);
      const legHeight = sy * 0.45; const leg = 0.08;
      for (const [index, [x, z]] of ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as Array<[number, number]>).entries()) this.box(`${prop.id}:leg:${index}`, container, [x * (sx / 2 - leg), -sy / 2 + legHeight / 2, z * (sz / 2 - leg)], [leg, legHeight, leg], material);
    } else if (prop.kind === 'bench') {
      const seat = Math.min(0.14, sy * 0.24); const legHeight = Math.max(0.08, sy - seat);
      this.box(`${prop.id}:seat`, container, [0, sy / 2 - seat / 2, 0], [sx, seat, sz], material);
      this.box(`${prop.id}:leg:left`, container, [-sx * 0.32, -seat / 2, 0], [0.14, legHeight, sz * 0.75], material);
      this.box(`${prop.id}:leg:right`, container, [sx * 0.32, -seat / 2, 0], [0.14, legHeight, sz * 0.75], material);
    } else if (prop.kind === 'cabinet') {
      this.box(`${prop.id}:body`, container, [0, 0, 0], [sx, sy, sz], material);
      const seam = this.getMaterial('prop:cabinet-seam', [0.09, 0.1, 0.085]);
      this.box(`${prop.id}:seam`, container, [0, 0, -sz / 2 - 0.006], [0.025, sy * 0.9, 0.012], seam);
      this.box(`${prop.id}:handle:left`, container, [-sx * 0.16, 0, -sz / 2 - 0.025], [0.045, 0.16, 0.04], seam);
      this.box(`${prop.id}:handle:right`, container, [sx * 0.16, 0, -sz / 2 - 0.025], [0.045, 0.16, 0.04], seam);
    } else if (prop.kind === 'box') {
      this.box(`${prop.id}:body`, container, [0, 0, 0], [sx, sy, sz], material);
      const tape = this.getMaterial('prop:box-tape', [0.56, 0.49, 0.31]);
      this.box(`${prop.id}:tape`, container, [0, sy / 2 + 0.008, 0], [sx * 0.16, 0.016, sz], tape);
    } else if (prop.kind === 'bucket' || prop.kind === 'paint-can') {
      this.addOpenContainerGeometry(container, prop, material, prop.kind === 'paint-can');
    } else {
      this.box(`${prop.id}:body`, container, [0, 0, 0], [sx, sy, sz], material);
    }
    return container;
  }

  private addInteractions(descriptor: CellDescriptor, root: pc.Entity): InteractionVisual[] {
    const interactions: InteractionVisual[] = [];
    const worldX = descriptor.address.cellX * CELL_SIZE;
    const worldZ = descriptor.address.cellZ * CELL_SIZE;
    for (const node of descriptor.lootNodes) {
      if (!node.spawnedDefinitionId || this.save.pickedLootNodeIds.includes(node.id)) continue;
      if (this.save.droppedItems.some((drop) => drop.item.origin.sourceId === node.id)) continue;
      const definition = ITEM_DEFINITIONS[node.spawnedDefinitionId as keyof typeof ITEM_DEFINITIONS];
      const item = createItemInstance(definition.id, node.id, 'loot', { type: 'world', addressId: descriptor.id, containerId: node.id }, this.save.createdAt);
      interactions.push(this.addItemVisual(root, item, worldX + node.localPosition.x, node.localPosition.y, worldZ + node.localPosition.z, node.localPosition.x, node.localPosition.z, node.id));
    }
    for (const drop of this.save.droppedItems) {
      const dropCellX = Math.floor((drop.x + CELL_SIZE / 2) / CELL_SIZE);
      const dropCellZ = Math.floor((drop.z + CELL_SIZE / 2) / CELL_SIZE);
      if (dropCellX !== descriptor.address.cellX || dropCellZ !== descriptor.address.cellZ) continue;
      interactions.push(this.addItemVisual(root, drop.item, drop.x, drop.y, drop.z, drop.x - worldX, drop.z - worldZ, undefined, drop.activatedAt));
    }
    for (const note of descriptor.notes) {
      const paperMat = this.getMaterial('note-paper', [0.82, 0.78, 0.61], 'paper', note.id.length % 3);
      const entity = this.box(`note:${note.id}`, root, [note.localPosition.x, note.localPosition.y, note.localPosition.z], [0.46, 0.035, 0.62], paperMat, note.rotationY ?? 0);
      const visual: NoteVisual = { kind: 'note', id: note.id, entity, note, x: worldX + note.localPosition.x, y: note.localPosition.y + 0.08, z: worldZ + note.localPosition.z };
      interactions.push(visual); this.interactions.set(visual.id, visual);
    }
    for (const exit of descriptor.exits) {
      const visual = this.addExitVisual(descriptor, root, exit, worldX, worldZ);
      interactions.push(visual); this.interactions.set(visual.id, visual);
    }
    if (descriptor.world.structureIds.includes('manila-room')) {
      const visual: SeatVisual = { kind: 'seat', id: `manila-wait:${descriptor.id}`, entity: root, x: worldX + 2.3, y: 0.5, z: worldZ + 1.8 };
      interactions.push(visual); this.interactions.set(visual.id, visual);
    }
    return interactions;
  }

  addItemVisual(root: pc.Entity, item: ItemInstance, x: number, y: number, z: number, localX: number, localZ: number, lootNodeId?: string, activatedAt?: number): WorldItemVisual {
    const baseY = y <= 0.35 ? 0.015 : y;
    const entity = new pc.Entity(`item:${item.instanceId}`);
    entity.setLocalPosition(localX, baseY, localZ);
    root.addChild(entity);
    this.addItemGeometry(entity, item.definitionId, activatedAt);
    let light: pc.Entity | undefined;
    if (item.definitionId === 'glow-stick' && activatedAt) {
      light = new pc.Entity(`glow-light:${item.instanceId}`);
      light.addComponent('light', { type: 'omni', color: color(ITEM_DEFINITIONS['glow-stick'].color), range: 7, intensity: Math.max(0.05, (item.charge ?? 1) * 0.85), castShadows: false });
      light.setLocalPosition(localX, baseY + 0.18, localZ);
      root.addChild(light);
    }
    const visual: WorldItemVisual = { kind: 'item', id: item.instanceId, entity, light, item, x, y: baseY + 0.18, z, activatedAt, lootNodeId };
    this.interactions.set(visual.id, visual);
    return visual;
  }

  private addItemGeometry(root: pc.Entity, definitionId: ItemDefinitionId, activatedAt?: number): void {
    const definition = ITEM_DEFINITIONS[definitionId];
    const emissive = definitionId === 'glow-stick' && activatedAt ? definition.color : undefined;
    const main = this.getMaterial(`item:${definitionId}`, definition.color, definitionId === 'paper-note' ? 'paper' : undefined, 0, [1, 1], emissive, emissive ? 2.4 : 1);
    const dark = this.getMaterial('item:dark-detail', [0.035, 0.038, 0.035]);
    const metal = this.getMaterial('item:metal-detail', [0.48, 0.5, 0.47], 'concrete', 1);
    const cap = this.getMaterial('item:cap-detail', [0.18, 0.09, 0.035]);

    switch (definitionId) {
      case 'flashlight':
        this.box('body', root, [0, 0.09, 0.08], [0.16, 0.16, 0.5], main);
        this.box('head', root, [0, 0.1, -0.22], [0.25, 0.22, 0.18], dark);
        this.box('lens', root, [0, 0.1, -0.32], [0.19, 0.16, 0.025], metal);
        break;
      case 'battery':
        this.box('cell', root, [0, 0.14, 0], [0.16, 0.28, 0.16], main);
        this.box('terminal', root, [0, 0.3, 0], [0.08, 0.04, 0.08], metal);
        break;
      case 'almond-water':
        this.box('bottle', root, [0, 0.2, 0], [0.2, 0.4, 0.2], main);
        this.box('neck', root, [0, 0.43, 0], [0.12, 0.08, 0.12], main);
        this.box('cap', root, [0, 0.49, 0], [0.14, 0.045, 0.14], cap);
        break;
      case 'marker':
        this.box('barrel', root, [0, 0.065, 0], [0.09, 0.09, 0.56], main, 8);
        this.box('marker-cap', root, [0, 0.07, -0.31], [0.11, 0.11, 0.12], dark, 8);
        break;
      case 'paper-note':
        this.box('sheet', root, [0, 0.018, 0], [0.44, 0.035, 0.6], main, -7);
        break;
      case 'glow-stick':
        this.box('tube', root, [0, 0.055, 0], [0.075, 0.075, 0.7], main, 18);
        this.box('plug-a', root, [0, 0.058, -0.37], [0.1, 0.09, 0.06], dark, 18);
        this.box('plug-b', root, [0, 0.058, 0.37], [0.1, 0.09, 0.06], dark, 18);
        break;
      case 'string-spool':
        this.box('core', root, [0, 0.12, 0], [0.18, 0.24, 0.18], cap);
        this.box('flange-a', root, [0, 0.04, 0], [0.34, 0.06, 0.34], main);
        this.box('flange-b', root, [0, 0.2, 0], [0.34, 0.06, 0.34], main);
        break;
      case 'empty-can':
        this.box('can', root, [0, 0.18, 0], [0.2, 0.36, 0.2], metal, 12);
        this.box('label', root, [0, 0.18, -0.105], [0.16, 0.19, 0.018], main, 12);
        break;
      case 'pry-tool':
        this.box('shaft', root, [0, 0.07, 0], [0.09, 0.09, 0.78], main, -12);
        this.box('hook', root, [0.08, 0.08, -0.39], [0.24, 0.09, 0.09], main, -12);
        break;
    }
  }

  addCatalogVisual(root: pc.Entity, entry: ObjectCatalogEntry, x: number, z: number): pc.Entity {
    if (entry.kind === 'item' && entry.itemDefinitionId) {
      const entity = new pc.Entity(`catalog:${entry.id}`);
      entity.setLocalPosition(x, 0.015, z);
      root.addChild(entity);
      this.addItemGeometry(entity, entry.itemDefinitionId, entry.itemDefinitionId === 'glow-stick' ? Date.now() : undefined);
      return entity;
    }
    if (!entry.propKind) throw new Error(`Catalog prop ${entry.id} is missing propKind`);
    const [sx, sy, sz] = CATALOG_PROP_SCALE[entry.propKind];
    const prop: PropSpec = {
      id: `catalog:${entry.id}`,
      kind: entry.propKind,
      position: { x, y: entry.propKind === 'stain' || entry.propKind === 'carpet-patch' ? 0.01 : sy / 2, z },
      scale: { x: sx, y: sy, z: sz },
      materialVariant: entry.id.length % 4
    };
    return this.addPropGeometry(root, prop, ZONE_PROFILES.baseline);
  }

  private addExitVisual(descriptor: CellDescriptor, root: pc.Entity, exit: CellDescriptor['exits'][number], worldX: number, worldZ: number): ExitVisual {
    const enabledMat = this.getMaterial(`exit:${exit.trigger}:enabled`, exit.trigger === 'greenhouse-door' ? [0.12, 0.35, 0.2] : exit.trigger === 'emergency-door' ? [0.45, 0.08, 0.045] : [0.18, 0.28, 0.24], 'concrete', descriptor.variant % 3, [1, 2], [0.04, 0.12, 0.06], 0.55);
    const lockedMat = this.getMaterial(`exit:${exit.trigger}:locked`, [0.22, 0.14, 0.1], 'concrete', descriptor.variant % 3);
    let entity: pc.Entity;
    if (exit.trigger === 'floor-breach') {
      entity = this.box(`exit:${exit.destinationId}`, root, [exit.localPosition.x, 0.02, exit.localPosition.z], [2.8, 0.04, 2.2], exit.enabled ? enabledMat : lockedMat);
    } else if (exit.trigger === 'wall-breach') {
      entity = this.box(`exit:${exit.destinationId}`, root, [exit.localPosition.x, exit.localPosition.y, exit.localPosition.z], [0.16, 2.35, 2.45], exit.enabled ? enabledMat : lockedMat);
      for (let index = 0; index < 4; index += 1) this.box(`crack:${index}`, root, [exit.localPosition.x - 0.1, 0.5 + index * 0.42, exit.localPosition.z + (index % 2 ? 0.45 : -0.4)], [0.04, 0.6, 0.06], lockedMat, index % 2 ? 35 : -28);
    } else if (exit.trigger === 'manila-wait') {
      entity = root;
    } else {
      entity = this.box(`exit:${exit.destinationId}`, root, [exit.localPosition.x, exit.localPosition.y, exit.localPosition.z], [2.35, 2.25, 0.18], exit.enabled ? enabledMat : lockedMat);
      this.box(`exit-frame:${exit.destinationId}`, root, [exit.localPosition.x, 2.45, exit.localPosition.z], [2.75, 0.22, 0.28], lockedMat);
    }
    return { kind: 'exit', id: exit.id, entity, destinationId: exit.destinationId, label: exit.label, enabled: exit.enabled, minimumWorldDay: exit.minimumWorldDay, minimumExposure: exit.minimumExposure, x: worldX + exit.localPosition.x, y: exit.localPosition.y, z: worldZ + exit.localPosition.z };
  }

  private toWorldCollider(descriptor: CellDescriptor, wall: WallSpec): WorldCollider {
    const originX = descriptor.address.cellX * CELL_SIZE;
    const originZ = descriptor.address.cellZ * CELL_SIZE;
    const cx = originX + wall.cx; const cz = originZ + wall.cz;
    return { id: wall.id, cellId: descriptor.id, shiftEpoch: descriptor.address.shiftEpoch, minX: cx - wall.sx / 2, maxX: cx + wall.sx / 2, minY: wall.cy - wall.sy / 2, maxY: wall.cy + wall.sy / 2, minZ: cz - wall.sz / 2, maxZ: cz + wall.sz / 2, cx, cy: wall.cy, cz, sx: wall.sx, sy: wall.sy, sz: wall.sz, orientation: wall.orientation, drawable: wall.drawable };
  }
}