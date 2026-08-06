import * as pc from 'playcanvas';
import { createItemInstance } from '../items/factory.js';
import { ITEM_DEFINITIONS, type ItemDefinitionId } from '../items/definitions.js';
import type { ItemInstance } from '../items/types.js';
import type { SaveData } from '../persistence/types.js';
import { CELL_SIZE, WALL_HEIGHT, type CellDescriptor, type FloorPatchSpec, type PropSpec, type WallSpec } from '../world/types.js';
import { lightFixturePositions } from '../world/lighting.js';
import { ZONE_PROFILES, type ZoneProfile } from '../world/zones.js';
import type { ObjectCatalogEntry } from './objectCatalog.js';
import { color, type CellVisual, type ExitVisual, type InteractionVisual, type NoteVisual, type SeatVisual, type TextureKind, type LightGroupVisual, type WorldCollider, type WorldItemVisual } from './support.js';

export type MaterialFactory = (key: string, diffuse: [number, number, number], textureKind?: TextureKind, variant?: number, tiling?: [number, number], emissive?: [number, number, number], emissiveIntensity?: number) => pc.StandardMaterial;
export type BoxFactory = (name: string, parent: pc.Entity, position: [number, number, number], scale: [number, number, number], material: pc.StandardMaterial, rotationY?: number) => pc.Entity;

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
  'arch-segment': [0.62, 0.24, 0.48]
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
    const profile = ZONE_PROFILES[descriptor.address.zoneId];
    const floorMat = this.getMaterial(`floor:${profile.id}`, profile.floorTint, 'carpet', descriptor.variant % 3, [5, 5]);
    const ceilingMat = this.getMaterial(`ceiling:${profile.id}`, profile.ceilingTint, 'ceiling', descriptor.ceilingPattern, [4, 4]);
    const trimMat = this.getMaterial(`trim:${profile.id}`, profile.trimTint, 'wood', descriptor.variant % 2, [2, 2]);
    const concrete = this.getMaterial('concrete', [0.52, 0.52, 0.47], 'concrete', descriptor.variant % 3, [2, 2]);
    this.box('floor', root, [0, -0.12, 0], [CELL_SIZE, 0.24, CELL_SIZE], floorMat);
    this.box('ceiling', root, [0, WALL_HEIGHT + 0.12, 0], [CELL_SIZE, 0.24, CELL_SIZE], ceilingMat);

    const colliders: WorldCollider[] = [];
    for (const wallSpec of descriptor.walls) {
      const wallLength = Math.max(wallSpec.sx, wallSpec.sz);
      const wallMat = descriptor.address.zoneId === 'exit-threshold'
        ? concrete
        : this.getMaterial(`wall:${profile.id}`, profile.wallTint, 'wall', wallSpec.materialVariant ?? descriptor.variant % 4, [Math.max(1, wallLength / 2.6), Math.max(1, wallSpec.sy / WALL_HEIGHT)]);
      this.box(wallSpec.id, root, [wallSpec.cx, wallSpec.cy, wallSpec.cz], [wallSpec.sx, wallSpec.sy, wallSpec.sz], wallMat);
      const collider = this.toWorldCollider(descriptor, wallSpec);
      colliders.push(collider); this.walls.set(collider.id, collider);
      const horizontal = wallSpec.orientation === 'z';
      const trimLength = Math.max(0.08, wallLength - 0.045);
      this.box(`${wallSpec.id}:skirting`, root, [wallSpec.cx, 0.115, wallSpec.cz], horizontal ? [trimLength, 0.22, wallSpec.sz + 0.012] : [wallSpec.sx + 0.012, 0.22, trimLength], trimMat);
      this.box(`${wallSpec.id}:crown`, root, [wallSpec.cx, WALL_HEIGHT - 0.08, wallSpec.cz], horizontal ? [trimLength, 0.12, wallSpec.sz + 0.01] : [wallSpec.sx + 0.01, 0.12, trimLength], trimMat);
    }

    const lightGroups = this.addLighting(descriptor, root, profile);
    for (const patch of descriptor.floorPatches) this.addFloorPatch(root, patch, profile);
    for (const prop of descriptor.props) this.addProp(descriptor, root, prop, colliders);
    const interactions = this.addInteractions(descriptor, root);
    return { descriptor, root, colliders, interactions, lightGroups };
  }

  private addLighting(descriptor: CellDescriptor, root: pc.Entity, profile: ZoneProfile): LightGroupVisual[] {
    const visuals: LightGroupVisual[] = [];
    for (const group of descriptor.lightGroups) {
      const on = group.state !== 'off';
      const fixtureMat = this.getMaterial(
        `fixture:${profile.id}:${group.state}`,
        on ? [0.69, 0.68, 0.53] : [0.28, 0.28, 0.23],
        undefined,
        0,
        [1, 1],
        on ? [0.84, 0.82, 0.61] : [0.01, 0.01, 0.008],
        on ? 1.05 * profile.lightMultiplier * group.temperature : 0.02
      );
      const housingMat = this.getMaterial(`fixture-housing:${profile.id}`, [0.34, 0.34, 0.29], 'concrete', 0, [1, 1]);
      const fixtures = lightFixturePositions(group).map((position, index) => {
        this.box(
          `${group.id}:housing:${index}`,
          root,
          [position.x, group.position.y + 0.025, position.z],
          group.axis === 'x' ? [2.18, 0.105, 0.46] : [0.46, 0.105, 2.18],
          housingMat
        );
        const glow = this.box(
          `${group.id}:fixture:${index}`,
          root,
          [position.x, group.position.y - 0.035, position.z],
          group.axis === 'x' ? [1.96, 0.035, 0.27] : [0.27, 0.035, 1.96],
          fixtureMat
        );
        glow.enabled = on;
        return glow;
      });
      const light = new pc.Entity(`${group.id}:light`);
      light.addComponent('light', {
        type: 'omni',
        color: new pc.Color(0.82 * group.temperature, 0.79 * group.temperature, 0.56),
        range: 8.5,
        intensity: on ? group.intensity * profile.lightMultiplier : 0,
        castShadows: false
      });
      light.setLocalPosition(group.position.x, WALL_HEIGHT - 0.38, group.position.z);
      root.addChild(light);
      visuals.push({ spec: group, fixtures, light, lastValue: on ? 1 : 0 });
    }
    return visuals;
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
    const voidMat = this.getMaterial('hole:void', [0.003, 0.003, 0.002], undefined);
    const rimMat = this.getMaterial(`hole:rim:${profile.id}`, [profile.floorTint[0] * 0.72, profile.floorTint[1] * 0.68, profile.floorTint[2] * 0.58], 'carpet', patch.id.length % 3, [1, 1]);
    const x = patch.position.x; const z = patch.position.z; const sx = patch.scale.x; const sz = patch.scale.z;
    this.box(`${patch.id}:void`, root, [x, -0.08, z], [sx, 0.18, sz], voidMat);
    const rim = 0.14;
    this.box(`${patch.id}:north-rim`, root, [x, 0.035, z - sz / 2], [sx + rim, 0.07, rim], rimMat);
    this.box(`${patch.id}:south-rim`, root, [x, 0.035, z + sz / 2], [sx + rim, 0.07, rim], rimMat);
    this.box(`${patch.id}:west-rim`, root, [x - sx / 2, 0.035, z], [rim, 0.07, sz - rim], rimMat);
    this.box(`${patch.id}:east-rim`, root, [x + sx / 2, 0.035, z], [rim, 0.07, sz - rim], rimMat);
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
      'arch-segment': this.getMaterial('prop:arch', [profile.wallTint[0] * 0.92, profile.wallTint[1] * 0.91, profile.wallTint[2] * 0.86], 'concrete', prop.materialVariant ?? 0, [1, 1])
    };
  }

  private addProp(descriptor: CellDescriptor, root: pc.Entity, prop: PropSpec, colliders: WorldCollider[]): void {
    this.addPropGeometry(root, prop, ZONE_PROFILES[descriptor.address.zoneId]);
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

  private addPropGeometry(parent: pc.Entity, prop: PropSpec, profile: ZoneProfile): pc.Entity {
    const container = new pc.Entity(prop.id);
    container.setLocalPosition(prop.position.x, prop.position.y, prop.position.z);
    if (prop.rotationX || prop.rotationY || prop.rotationZ) container.setLocalEulerAngles(prop.rotationX ?? 0, prop.rotationY ?? 0, prop.rotationZ ?? 0);
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
    if (descriptor.address.zoneId === 'manila') {
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
