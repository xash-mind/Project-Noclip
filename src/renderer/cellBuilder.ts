import * as pc from 'playcanvas';
import { createItemInstance } from '../items/factory.js';
import { ITEM_DEFINITIONS } from '../items/definitions.js';
import type { ItemInstance } from '../items/types.js';
import type { SaveData } from '../persistence/types.js';
import { CELL_SIZE, WALL_HEIGHT, type CellDescriptor, type PropSpec, type WallSpec } from '../world/types.js';
import { ZONE_PROFILES } from '../world/zones.js';
import { color, type CellVisual, type ExitVisual, type InteractionVisual, type NoteVisual, type SeatVisual, type WorldCollider, type WorldItemVisual } from './support.js';

export type MaterialFactory = (key: string, diffuse: [number, number, number], textureKind?: 'wall' | 'carpet' | 'ceiling' | 'concrete' | 'wood', variant?: number, tiling?: [number, number], emissive?: [number, number, number], emissiveIntensity?: number) => pc.StandardMaterial;
export type BoxFactory = (name: string, parent: pc.Entity, position: [number, number, number], scale: [number, number, number], material: pc.StandardMaterial, rotationY?: number) => pc.Entity;

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
    const fixtureMat = this.getMaterial(`fixture:${profile.id}`, [0.69, 0.68, 0.53], undefined, 0, [1, 1], [0.84, 0.82, 0.61], descriptor.lightFailure ? 0.03 : 1.3 * profile.lightMultiplier * descriptor.lightTemperature);

    this.box('floor', root, [0, -0.12, 0], [CELL_SIZE, 0.24, CELL_SIZE], floorMat);
    this.box('ceiling', root, [0, WALL_HEIGHT + 0.12, 0], [CELL_SIZE, 0.24, CELL_SIZE], ceilingMat);

    const colliders: WorldCollider[] = [];
    for (const wallSpec of descriptor.walls) {
      const wallMat = descriptor.address.zoneId === 'exit-threshold'
        ? concrete
        : this.getMaterial(`wall:${profile.id}`, profile.wallTint, 'wall', wallSpec.materialVariant ?? descriptor.variant % 4, [Math.max(1, wallSpec.sx / 2.4), Math.max(1, wallSpec.sy / 2.4)]);
      this.box(wallSpec.id, root, [wallSpec.cx, wallSpec.cy, wallSpec.cz], [wallSpec.sx, wallSpec.sy, wallSpec.sz], wallMat);
      const collider = this.toWorldCollider(descriptor, wallSpec);
      colliders.push(collider); this.walls.set(collider.id, collider);
      const horizontal = wallSpec.orientation === 'z';
      this.box(`${wallSpec.id}:skirting`, root, [wallSpec.cx, 0.12, wallSpec.cz], [horizontal ? wallSpec.sx : wallSpec.sx + 0.035, 0.23, horizontal ? wallSpec.sz + 0.035 : wallSpec.sz], trimMat);
    }

    this.addLighting(descriptor, root, fixtureMat);
    for (const patch of descriptor.floorPatches) this.addFloorPatch(root, patch, profile.floorTint);
    for (const prop of descriptor.props) this.addProp(descriptor, root, prop, colliders);
    const interactions = this.addInteractions(descriptor, root);
    return { descriptor, root, colliders, interactions };
  }

  private addLighting(descriptor: CellDescriptor, root: pc.Entity, fixtureMat: pc.StandardMaterial): void {
    const positions = descriptor.roomArchetype.includes('corridor') || descriptor.roomArchetype === 'narrow-hall'
      ? [[0, -3.8], [0, 0], [0, 3.8]]
      : descriptor.address.zoneId === 'pillar'
        ? [[-4.3, -4.3], [0, -4.3], [4.3, -4.3], [-4.3, 4.3], [0, 4.3], [4.3, 4.3]]
        : [[-3.4, -2.4], [3.4, 2.4], [-3.4, 2.4], [3.4, -2.4]];
    positions.forEach(([x, z], index) => this.box(`fixture:${index}`, root, [x!, WALL_HEIGHT - 0.08, z!], [2.2, 0.08, 0.38], fixtureMat, descriptor.ceilingPattern % 2 ? 90 : 0));
  }

  private addFloorPatch(root: pc.Entity, patch: CellDescriptor['floorPatches'][number], floorTint: [number, number, number]): void {
    const tints: Record<typeof patch.kind, [number, number, number]> = {
      damp: [0.12, 0.115, 0.075], worn: [floorTint[0] * 1.18, floorTint[1] * 1.1, floorTint[2] * 0.9], dark: [0.008, 0.009, 0.007], dry: [floorTint[0] * 1.25, floorTint[1] * 1.18, floorTint[2] * 1.05]
    };
    const mat = this.getMaterial(`patch:${patch.kind}`, tints[patch.kind], patch.kind === 'dark' ? undefined : 'carpet', patch.id.length % 3, [2.5, 2.5]);
    this.box(patch.id, root, [patch.position.x, patch.position.y, patch.position.z], [patch.scale.x, patch.scale.y, patch.scale.z], mat);
  }

  private addProp(descriptor: CellDescriptor, root: pc.Entity, prop: PropSpec, colliders: WorldCollider[]): void {
    const profile = ZONE_PROFILES[descriptor.address.zoneId];
    const mats: Record<PropSpec['kind'], pc.StandardMaterial> = {
      table: this.getMaterial('prop:wood', [0.31, 0.18, 0.095], 'wood', prop.materialVariant ?? 0, [2, 2]),
      chair: this.getMaterial('prop:chair', [0.24, 0.16, 0.09], 'wood', prop.materialVariant ?? 1),
      cabinet: this.getMaterial('prop:cabinet', [0.28, 0.29, 0.25], 'concrete', prop.materialVariant ?? 0),
      box: this.getMaterial('prop:box', [0.38, 0.28, 0.16], 'wood', prop.materialVariant ?? 0),
      divider: this.getMaterial('prop:divider', profile.wallTint, 'wall', prop.materialVariant ?? 0, [2, 2]),
      pipe: this.getMaterial('prop:pipe', [0.22, 0.23, 0.2], 'concrete', prop.materialVariant ?? 0),
      column: this.getMaterial('prop:column', profile.wallTint, 'wall', prop.materialVariant ?? 0, [1, 2]),
      bench: this.getMaterial('prop:bench', [0.31, 0.19, 0.1], 'wood', prop.materialVariant ?? 0),
      book: this.getMaterial('prop:book', [0.22, 0.045, 0.027], 'wood', 2),
      'wall-panel': this.getMaterial('prop:panel', profile.trimTint, 'wood', prop.materialVariant ?? 0),
      'ceiling-gap': this.getMaterial('prop:void', [0.005, 0.005, 0.004]),
      stain: this.getMaterial('prop:stain', [0.12, 0.09, 0.045]),
      'carpet-patch': this.getMaterial('prop:carpet', profile.floorTint, 'carpet', prop.materialVariant ?? 0),
      sign: this.getMaterial('prop:sign', [0.15, 0.18, 0.13], undefined, 0, [1, 1], [0.08, 0.17, 0.07], 0.55)
    };
    this.box(prop.id, root, [prop.position.x, prop.position.y, prop.position.z], [prop.scale.x, prop.scale.y, prop.scale.z], mats[prop.kind], prop.rotationY ?? 0);
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
      const bookMat = this.getMaterial('note-paper', [0.72, 0.68, 0.48], 'wood', 1);
      const entity = this.box(`note:${note.id}`, root, [note.localPosition.x, note.localPosition.y, note.localPosition.z], [0.42, 0.045, 0.58], bookMat, note.rotationY ?? 0);
      const visual: NoteVisual = { kind: 'note', id: note.id, entity, note, x: worldX + note.localPosition.x, y: note.localPosition.y, z: worldZ + note.localPosition.z };
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
    const definition = ITEM_DEFINITIONS[item.definitionId];
    const emissive = definition.id === 'glow-stick' && activatedAt ? definition.color : undefined;
    const mat = this.getMaterial(`item:${definition.id}`, definition.color, undefined, 0, [1, 1], emissive, emissive ? 2.4 : 1);
    const scale: [number, number, number] = definition.id === 'glow-stick' ? [0.08, 0.08, 0.68] : definition.id === 'paper-note' ? [0.38, 0.04, 0.5] : [0.25, 0.25, 0.25];
    const entity = this.box(`item:${item.instanceId}`, root, [localX, y, localZ], scale, mat, definition.id === 'glow-stick' ? 18 : 0);
    let light: pc.Entity | undefined;
    if (definition.id === 'glow-stick' && activatedAt) {
      light = new pc.Entity(`glow-light:${item.instanceId}`);
      light.addComponent('light', { type: 'omni', color: color(definition.color), range: 7, intensity: Math.max(0.05, (item.charge ?? 1) * 0.85), castShadows: false });
      light.setLocalPosition(localX, y + 0.18, localZ);
      root.addChild(light);
    }
    const visual: WorldItemVisual = { kind: 'item', id: item.instanceId, entity, light, item, x, y, z, activatedAt, lootNodeId };
    this.interactions.set(visual.id, visual);
    return visual;
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
