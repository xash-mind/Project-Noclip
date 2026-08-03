import * as pc from 'playcanvas';
import { createItemInstance } from '../items/factory.js';
import { ITEM_DEFINITIONS } from '../items/definitions.js';
import type { ItemInstance } from '../items/types.js';
import type { SaveData, SurfaceMark } from '../persistence/types.js';
import { CELL_SIZE, WALL_HEIGHT, type CellDescriptor, type WallSpec } from '../world/types.js';
import { ZONE_PROFILES } from '../world/zones.js';

export interface WorldWall {
  id: string;
  cellId: string;
  shiftEpoch: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  cx: number;
  cy: number;
  cz: number;
  sx: number;
  sy: number;
  sz: number;
  orientation: 'x' | 'z';
  drawable: boolean;
}

export interface WorldItemVisual {
  kind: 'item';
  id: string;
  entity: pc.Entity;
  item: ItemInstance;
  x: number;
  y: number;
  z: number;
  lootNodeId?: string;
}

export interface ExitVisual {
  kind: 'exit';
  id: string;
  entity: pc.Entity;
  destinationId: string;
  label: string;
  enabled: boolean;
  x: number;
  y: number;
  z: number;
}

export interface SeatVisual {
  kind: 'seat';
  id: string;
  entity: pc.Entity;
  x: number;
  y: number;
  z: number;
}

export type InteractionVisual = WorldItemVisual | ExitVisual | SeatVisual;

interface CellVisual {
  descriptor: CellDescriptor;
  root: pc.Entity;
  walls: WorldWall[];
  interactions: InteractionVisual[];
}

function color(tuple: [number, number, number]): pc.Color {
  return new pc.Color(tuple[0], tuple[1], tuple[2]);
}

function material(diffuse: [number, number, number], emissive?: [number, number, number], emissiveIntensity = 1): pc.StandardMaterial {
  const result = new pc.StandardMaterial();
  result.diffuse = color(diffuse);
  result.gloss = 0.12;
  if (emissive) {
    result.emissive = color(emissive);
    result.emissiveIntensity = emissiveIntensity;
  }
  result.update();
  return result;
}

export class WorldRenderer {
  readonly walls = new Map<string, WorldWall>();
  readonly interactions = new Map<string, InteractionVisual>();
  readonly loaded = new Map<string, CellVisual>();
  private readonly materials = new Map<string, pc.StandardMaterial>();
  private readonly markRoots = new Map<string, pc.Entity>();

  constructor(private readonly app: pc.Application, private readonly save: SaveData) {}

  get loadedCellCount(): number { return this.loaded.size; }
  get wallCount(): number { return this.walls.size; }
  get interactionCount(): number { return this.interactions.size; }

  private getMaterial(key: string, diffuse: [number, number, number], emissive?: [number, number, number], emissiveIntensity = 1): pc.StandardMaterial {
    const existing = this.materials.get(key);
    if (existing) return existing;
    const created = material(diffuse, emissive, emissiveIntensity);
    this.materials.set(key, created);
    return created;
  }

  private box(name: string, parent: pc.Entity, position: [number, number, number], scale: [number, number, number], boxMaterial: pc.StandardMaterial): pc.Entity {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type: 'box' });
    entity.setLocalPosition(position[0], position[1], position[2]);
    entity.setLocalScale(scale[0], scale[1], scale[2]);
    if (entity.render) entity.render.material = boxMaterial;
    parent.addChild(entity);
    return entity;
  }

  loadCell(descriptor: CellDescriptor): void {
    if (this.loaded.has(descriptor.id)) return;
    const root = new pc.Entity(`cell:${descriptor.id}`);
    root.setPosition(descriptor.address.cellX * CELL_SIZE, 0, descriptor.address.cellZ * CELL_SIZE);
    this.app.root.addChild(root);
    const profile = ZONE_PROFILES[descriptor.address.zoneId];
    const wallMat = this.getMaterial(`wall:${profile.id}`, profile.wallTint);
    const floorMat = this.getMaterial(`floor:${profile.id}`, profile.floorTint);
    const ceilingMat = this.getMaterial(`ceiling:${profile.id}`, profile.ceilingTint);
    const fixtureMat = this.getMaterial('fixture', [0.66, 0.65, 0.51], [0.75, 0.74, 0.55], descriptor.lightFailure ? 0.05 : 1.2 * profile.lightMultiplier);

    this.box('floor', root, [0, -0.12, 0], [CELL_SIZE, 0.24, CELL_SIZE], floorMat);
    this.box('ceiling', root, [0, WALL_HEIGHT + 0.12, 0], [CELL_SIZE, 0.24, CELL_SIZE], ceilingMat);

    const worldWalls: WorldWall[] = [];
    for (const wallSpec of descriptor.walls) {
      this.box(wallSpec.id, root, [wallSpec.cx, wallSpec.cy, wallSpec.cz], [wallSpec.sx, wallSpec.sy, wallSpec.sz], wallMat);
      const wall = this.toWorldWall(descriptor, wallSpec);
      worldWalls.push(wall);
      this.walls.set(wall.id, wall);
    }

    const fixtureCount = descriptor.address.zoneId === 'pillar' ? 3 : 2;
    for (let index = 0; index < fixtureCount; index += 1) {
      const x = fixtureCount === 2 ? (index === 0 ? -3.2 : 3.2) : (index - 1) * 3.7;
      this.box(`fixture:${index}`, root, [x, WALL_HEIGHT - 0.09, 0], [2.4, 0.08, 0.42], fixtureMat);
    }

    this.addZoneGeometry(descriptor, root, wallMat, floorMat);
    const interactions = this.addInteractions(descriptor, root);
    this.loaded.set(descriptor.id, { descriptor, root, walls: worldWalls, interactions });
    this.renderMarksForCell(descriptor.id);
  }

  private addZoneGeometry(descriptor: CellDescriptor, root: pc.Entity, wallMat: pc.StandardMaterial, floorMat: pc.StandardMaterial): void {
    if (descriptor.address.zoneId === 'pillar') {
      for (const x of [-4.2, 0, 4.2]) for (const z of [-4.2, 0, 4.2]) this.box('pillar', root, [x, WALL_HEIGHT / 2, z], [0.75, WALL_HEIGHT, 0.75], wallMat);
    }
    if (descriptor.address.zoneId === 'arch') {
      for (const z of [-3.5, 3.5]) {
        this.box('arch-post', root, [-2.1, WALL_HEIGHT / 2, z], [0.55, WALL_HEIGHT, 0.55], wallMat);
        this.box('arch-post', root, [2.1, WALL_HEIGHT / 2, z], [0.55, WALL_HEIGHT, 0.55], wallMat);
        this.box('arch-beam', root, [0, WALL_HEIGHT - 0.32, z], [4.75, 0.55, 0.55], wallMat);
      }
    }
    if (descriptor.address.zoneId === 'holes') {
      const voidMat = this.getMaterial('void', [0.005, 0.005, 0.003]);
      for (const [x, z] of [[-3.2, -2.8], [0.6, 2.2], [3.6, -0.8]] as Array<[number, number]>) this.box('safe-hole-visual', root, [x, 0.015, z], [1.55, 0.03, 1.55], voidMat);
    }
    if (descriptor.address.zoneId === 'blackout') {
      const dampMat = this.getMaterial('damp', [0.06, 0.07, 0.055]);
      this.box('damp-recess', root, [0, 0.015, 0], [7, 0.035, 5.5], dampMat);
    }
    if (descriptor.address.zoneId === 'manila') {
      const wood = this.getMaterial('manila-wood', [0.27, 0.17, 0.1]);
      this.box('table-top', root, [0, 0.78, 0], [2.5, 0.12, 1.3], wood);
      this.box('table-leg', root, [-0.9, 0.4, -0.42], [0.12, 0.8, 0.12], wood);
      this.box('table-leg', root, [0.9, 0.4, 0.42], [0.12, 0.8, 0.12], wood);
      this.box('chair-seat', root, [2.3, 0.48, 0], [0.85, 0.12, 0.85], wood);
      this.box('chair-back', root, [2.68, 0.95, 0], [0.12, 1.05, 0.85], wood);
      this.box('dry-carpet', root, [0, 0.02, 0], [5.2, 0.04, 4.2], floorMat);
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
      const mat = this.getMaterial(`item:${definition.id}`, definition.color, definition.id === 'glow-stick' ? definition.color : undefined, definition.id === 'glow-stick' ? 1.5 : 1);
      const entity = this.box(`item:${item.instanceId}`, root, [node.localPosition.x, node.localPosition.y, node.localPosition.z], [0.25, 0.25, 0.25], mat);
      const visual: WorldItemVisual = { kind: 'item', id: item.instanceId, entity, item, x: worldX + node.localPosition.x, y: node.localPosition.y, z: worldZ + node.localPosition.z, lootNodeId: node.id };
      interactions.push(visual);
      this.interactions.set(visual.id, visual);
    }

    for (const drop of this.save.droppedItems) {
      const dropCellX = Math.round(drop.x / CELL_SIZE);
      const dropCellZ = Math.round(drop.z / CELL_SIZE);
      if (dropCellX !== descriptor.address.cellX || dropCellZ !== descriptor.address.cellZ) continue;
      const definition = ITEM_DEFINITIONS[drop.item.definitionId];
      const mat = this.getMaterial(`item:${definition.id}`, definition.color, definition.id === 'glow-stick' ? definition.color : undefined, definition.id === 'glow-stick' ? 1.5 : 1);
      const entity = this.box(`drop:${drop.item.instanceId}`, root, [drop.x - worldX, drop.y, drop.z - worldZ], [0.28, 0.28, 0.28], mat);
      const visual: WorldItemVisual = { kind: 'item', id: drop.item.instanceId, entity, item: drop.item, x: drop.x, y: drop.y, z: drop.z };
      interactions.push(visual);
      this.interactions.set(visual.id, visual);
    }

    const exitMat = this.getMaterial('exit-enabled', [0.18, 0.31, 0.23], [0.05, 0.17, 0.08], 0.8);
    const lockedMat = this.getMaterial('exit-locked', [0.25, 0.12, 0.09], [0.15, 0.03, 0.015], 0.3);
    for (const exit of descriptor.exits) {
      const entity = this.box(`exit:${exit.destinationId}`, root, [exit.localPosition.x, exit.localPosition.y, exit.localPosition.z], [2.4, 2.2, 0.18], exit.enabled ? exitMat : lockedMat);
      const visual: ExitVisual = { kind: 'exit', id: exit.id, entity, destinationId: exit.destinationId, label: exit.label, enabled: exit.enabled, x: worldX + exit.localPosition.x, y: exit.localPosition.y, z: worldZ + exit.localPosition.z };
      interactions.push(visual);
      this.interactions.set(visual.id, visual);
    }

    if (descriptor.address.zoneId === 'manila') {
      const entity = root;
      const visual: SeatVisual = { kind: 'seat', id: 'manila-seat', entity, x: worldX + 2.3, y: 0.5, z: worldZ };
      interactions.push(visual);
      this.interactions.set(visual.id, visual);
    }
    return interactions;
  }

  private toWorldWall(descriptor: CellDescriptor, wall: WallSpec): WorldWall {
    const originX = descriptor.address.cellX * CELL_SIZE;
    const originZ = descriptor.address.cellZ * CELL_SIZE;
    const cx = originX + wall.cx;
    const cz = originZ + wall.cz;
    return {
      id: wall.id,
      cellId: descriptor.id,
      shiftEpoch: descriptor.address.shiftEpoch,
      minX: cx - wall.sx / 2,
      maxX: cx + wall.sx / 2,
      minY: wall.cy - wall.sy / 2,
      maxY: wall.cy + wall.sy / 2,
      minZ: cz - wall.sz / 2,
      maxZ: cz + wall.sz / 2,
      cx,
      cy: wall.cy,
      cz,
      sx: wall.sx,
      sy: wall.sy,
      sz: wall.sz,
      orientation: wall.orientation,
      drawable: wall.drawable
    };
  }

  unloadCell(cellId: string): void {
    const visual = this.loaded.get(cellId);
    if (!visual) return;
    for (const wall of visual.walls) this.walls.delete(wall.id);
    for (const interaction of visual.interactions) this.interactions.delete(interaction.id);
    this.markRoots.get(cellId)?.destroy();
    this.markRoots.delete(cellId);
    visual.root.destroy();
    this.loaded.delete(cellId);
  }

  refreshCell(descriptor: CellDescriptor): void {
    this.unloadCell(descriptor.id);
    this.loadCell(descriptor);
  }

  removeInteraction(id: string): void {
    const visual = this.interactions.get(id);
    if (!visual) return;
    visual.entity.destroy();
    this.interactions.delete(id);
    for (const cell of this.loaded.values()) cell.interactions = cell.interactions.filter((candidate) => candidate.id !== id);
  }

  addDroppedItem(item: ItemInstance, x: number, y: number, z: number): void {
    const cellX = Math.round(x / CELL_SIZE);
    const cellZ = Math.round(z / CELL_SIZE);
    const visual = this.loaded.get(`${cellX}:${cellZ}`);
    if (!visual) return;
    const definition = ITEM_DEFINITIONS[item.definitionId];
    const mat = this.getMaterial(`item:${definition.id}`, definition.color, definition.id === 'glow-stick' ? definition.color : undefined, definition.id === 'glow-stick' ? 1.5 : 1);
    const entity = this.box(`drop:${item.instanceId}`, visual.root, [x - cellX * CELL_SIZE, y, z - cellZ * CELL_SIZE], [0.28, 0.28, 0.28], mat);
    const interaction: WorldItemVisual = { kind: 'item', id: item.instanceId, entity, item, x, y, z };
    visual.interactions.push(interaction);
    this.interactions.set(interaction.id, interaction);
  }

  closestInteraction(x: number, y: number, z: number, fx: number, fz: number, maxDistance = 2.6): InteractionVisual | undefined {
    let best: InteractionVisual | undefined;
    let bestDistance = maxDistance;
    for (const interaction of this.interactions.values()) {
      const dx = interaction.x - x;
      const dz = interaction.z - z;
      const distance = Math.hypot(dx, interaction.y - y, dz);
      if (distance >= bestDistance || distance < 0.001) continue;
      const facing = (dx * fx + dz * fz) / Math.max(0.001, Math.hypot(dx, dz));
      if (facing < 0.2) continue;
      best = interaction;
      bestDistance = distance;
    }
    return best;
  }

  resolveMovement(currentX: number, currentZ: number, nextX: number, nextZ: number, radius = 0.34): [number, number] {
    let x = nextX;
    let z = currentZ;
    for (const wall of this.walls.values()) {
      if (z < wall.minZ - radius || z > wall.maxZ + radius || x < wall.minX - radius || x > wall.maxX + radius) continue;
      x = nextX > currentX ? wall.minX - radius : wall.maxX + radius;
    }
    z = nextZ;
    for (const wall of this.walls.values()) {
      if (x < wall.minX - radius || x > wall.maxX + radius || z < wall.minZ - radius || z > wall.maxZ + radius) continue;
      z = nextZ > currentZ ? wall.minZ - radius : wall.maxZ + radius;
    }
    return [x, z];
  }

  raycastWall(origin: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }, maxDistance = 3): { wall: WorldWall; distance: number; x: number; y: number; z: number; u: number; v: number } | undefined {
    let closest: ReturnType<WorldRenderer['raycastWall']>;
    let closestDistance = maxDistance;
    for (const wall of this.walls.values()) {
      if (!wall.drawable) continue;
      const distance = rayAabb(origin, direction, wall);
      if (distance === undefined || distance >= closestDistance) continue;
      const x = origin.x + direction.x * distance;
      const y = origin.y + direction.y * distance;
      const z = origin.z + direction.z * distance;
      const u = wall.orientation === 'x' ? (z - (wall.cz - wall.sz / 2)) / wall.sz : (x - (wall.cx - wall.sx / 2)) / wall.sx;
      const v = (y - wall.minY) / wall.sy;
      closest = { wall, distance, x, y, z, u: clamp01(u), v: clamp01(v) };
      closestDistance = distance;
    }
    return closest;
  }

  addMarkVisual(mark: SurfaceMark): void {
    const wall = this.walls.get(mark.surfaceId);
    if (!wall || wall.shiftEpoch !== mark.shiftEpoch) return;
    let root = this.markRoots.get(mark.cellId);
    if (!root) {
      root = new pc.Entity(`marks:${mark.cellId}`);
      this.app.root.addChild(root);
      this.markRoots.set(mark.cellId, root);
    }
    const inkColor: [number, number, number] = mark.ink === 'red' ? [0.28, 0.025, 0.018] : mark.ink === 'blue' ? [0.02, 0.05, 0.18] : [0.008, 0.008, 0.006];
    const ink = this.getMaterial(`ink:${mark.ink}`, inkColor);
    for (const [u, v] of mark.points) {
      const horizontal = wall.orientation === 'x' ? wall.cz - wall.sz / 2 + u * wall.sz : wall.cx - wall.sx / 2 + u * wall.sx;
      const y = wall.minY + v * wall.sy;
      if (wall.orientation === 'x') this.box(`mark:${mark.id}`, root, [wall.cx + (wall.cx < 0 ? 0.02 : -0.02), y, horizontal], [0.035 * mark.thickness, 0.035 * mark.thickness, 0.02], ink);
      else this.box(`mark:${mark.id}`, root, [horizontal, y, wall.cz + (wall.cz < 0 ? 0.02 : -0.02)], [0.02, 0.035 * mark.thickness, 0.035 * mark.thickness], ink);
    }
  }

  private renderMarksForCell(cellId: string): void {
    for (const mark of this.save.marks.filter((candidate) => candidate.cellId === cellId)) this.addMarkVisual(mark);
  }
}

function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }

function rayAabb(origin: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }, wall: WorldWall): number | undefined {
  let tMin = 0;
  let tMax = Number.POSITIVE_INFINITY;
  for (const axis of ['x', 'y', 'z'] as const) {
    const min = axis === 'x' ? wall.minX : axis === 'y' ? wall.minY : wall.minZ;
    const max = axis === 'x' ? wall.maxX : axis === 'y' ? wall.maxY : wall.maxZ;
    const value = origin[axis];
    const delta = direction[axis];
    if (Math.abs(delta) < 1e-7) {
      if (value < min || value > max) return undefined;
      continue;
    }
    const inverse = 1 / delta;
    let near = (min - value) * inverse;
    let far = (max - value) * inverse;
    if (near > far) [near, far] = [far, near];
    tMin = Math.max(tMin, near);
    tMax = Math.min(tMax, far);
    if (tMin > tMax) return undefined;
  }
  return tMin >= 0 ? tMin : tMax >= 0 ? tMax : undefined;
}
