import * as pc from 'playcanvas';
import type { DroppedItemState, SaveData, SurfaceMark } from '../persistence/types.js';
import { resolveCircleAgainstAabbs } from '../physics/collision.js';
import { CELL_SIZE, type CellDescriptor } from '../world/types.js';
import type { ObjectCatalogEntry } from './objectCatalog.js';
import { canvasTexture, makeMaterial, markWorldPoint, clamp01, rayAabb, type CellVisual, type InteractionVisual, type TextureKind, type WorldItemVisual, type WorldWall } from './support.js';
import { RendererCellBuilder } from './cellBuilder.js';
export type { InteractionVisual, WorldItemVisual } from './support.js';

export class WorldRenderer {
  readonly walls = new Map<string, WorldWall>();
  readonly interactions = new Map<string, InteractionVisual>();
  readonly loaded = new Map<string, CellVisual>();
  private readonly materials = new Map<string, pc.StandardMaterial>();
  private readonly textures = new Map<string, pc.Texture>();
  private readonly markRoots = new Map<string, pc.Entity>();
  private readonly cellBuilder: RendererCellBuilder;
  private labShowcaseRoot?: pc.Entity;
  private labShowcaseCount = 0;

  constructor(private readonly app: pc.Application, private readonly save: SaveData) {
    this.cellBuilder = new RendererCellBuilder(app, save, this.walls, this.interactions, this.getMaterial.bind(this), this.box.bind(this));
  }
  get loadedCellCount(): number { return this.loaded.size; }
  get wallCount(): number { return this.walls.size; }
  get interactionCount(): number { return this.interactions.size; }
  get labObjectCount(): number { return this.labShowcaseCount; }

  private texture(kind: TextureKind, variant = 0): pc.Texture {
    const key = `${kind}:${variant}`;
    const existing = this.textures.get(key);
    if (existing) return existing;
    const created = canvasTexture(this.app, kind, variant);
    this.textures.set(key, created);
    return created;
  }

  private getMaterial(key: string, diffuse: [number, number, number], textureKind?: TextureKind, variant = 0, tiling: [number, number] = [1, 1], emissive?: [number, number, number], emissiveIntensity = 1): pc.StandardMaterial {
    const fullKey = `${key}:${variant}:${tiling.join(',')}:${emissiveIntensity}`;
    const existing = this.materials.get(fullKey);
    if (existing) return existing;
    const created = makeMaterial(diffuse, textureKind ? this.texture(textureKind, variant) : undefined, tiling, emissive, emissiveIntensity);
    this.materials.set(fullKey, created);
    return created;
  }

  private box(name: string, parent: pc.Entity, position: [number, number, number], scale: [number, number, number], boxMaterial: pc.StandardMaterial, rotationY = 0): pc.Entity {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type: 'box' });
    entity.setLocalPosition(position[0], position[1], position[2]);
    entity.setLocalScale(scale[0], scale[1], scale[2]);
    if (rotationY) entity.setLocalEulerAngles(0, rotationY, 0);
    if (entity.render) entity.render.material = boxMaterial;
    parent.addChild(entity);
    return entity;
  }

  loadCell(descriptor: CellDescriptor): void {
    if (this.loaded.has(descriptor.id)) return;
    const visual = this.cellBuilder.buildCell(descriptor);
    this.loaded.set(descriptor.id, visual);
    this.renderMarksForCell(descriptor.id);
  }

  unloadCell(cellId: string): void {
    const visual = this.loaded.get(cellId); if (!visual) return;
    for (const collider of visual.colliders) this.walls.delete(collider.id);
    for (const interaction of visual.interactions) this.interactions.delete(interaction.id);
    this.markRoots.get(cellId)?.destroy(); this.markRoots.delete(cellId);
    visual.root.destroy(); this.loaded.delete(cellId);
  }
  refreshCell(descriptor: CellDescriptor): void { this.unloadCell(descriptor.id); this.loadCell(descriptor); }
  removeInteraction(id: string): void {
    const visual = this.interactions.get(id); if (!visual) return;
    if (visual.kind === 'item') visual.light?.destroy(); visual.entity.destroy(); this.interactions.delete(id);
    for (const cell of this.loaded.values()) cell.interactions = cell.interactions.filter((candidate) => candidate.id !== id);
  }

  addDroppedItem(drop: DroppedItemState): void {
    const cellX = Math.floor((drop.x + CELL_SIZE / 2) / CELL_SIZE); const cellZ = Math.floor((drop.z + CELL_SIZE / 2) / CELL_SIZE);
    const visual = this.loaded.get(`${cellX}:${cellZ}`); if (!visual) return;
    const interaction = this.cellBuilder.addItemVisual(visual.root, drop.item, drop.x, drop.y, drop.z, drop.x - cellX * CELL_SIZE, drop.z - cellZ * CELL_SIZE, undefined, drop.activatedAt);
    visual.interactions.push(interaction);
  }

  spawnLabShowcase(entries: readonly ObjectCatalogEntry[], origin: { x: number; z: number }, yaw: number): number {
    this.clearLabShowcase();
    if (entries.length === 0) return 0;
    const root = new pc.Entity('world-lab-object-showcase');
    this.app.root.addChild(root);
    this.labShowcaseRoot = root;
    const columns = Math.min(6, Math.max(1, entries.length));
    const spacingX = 2.05;
    const spacingZ = 2.1;
    const radians = yaw * Math.PI / 180;
    const forward = { x: -Math.sin(radians), z: -Math.cos(radians) };
    const right = { x: Math.cos(radians), z: -Math.sin(radians) };
    const firstRowCenter = { x: origin.x + forward.x * 5.2, z: origin.z + forward.z * 5.2 };
    entries.forEach((entry, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const rowCount = Math.min(columns, entries.length - row * columns);
      const lateral = (column - (rowCount - 1) / 2) * spacingX;
      const depth = row * spacingZ;
      const x = firstRowCenter.x + right.x * lateral + forward.x * depth;
      const z = firstRowCenter.z + right.z * lateral + forward.z * depth;
      this.cellBuilder.addCatalogVisual(root, entry, x, z);
    });
    this.labShowcaseCount = entries.length;
    return entries.length;
  }

  clearLabShowcase(): void {
    this.labShowcaseRoot?.destroy();
    this.labShowcaseRoot = undefined;
    this.labShowcaseCount = 0;
  }

  updateDynamicItems(now: number): void {
    for (const interaction of this.interactions.values()) {
      if (interaction.kind !== 'item' || interaction.item.definitionId !== 'glow-stick' || !interaction.activatedAt) continue;
      const remaining = Math.max(0, 1 - (now - interaction.activatedAt) / 600_000);
      if (interaction.light?.light) { interaction.light.light.intensity = remaining * 0.85; interaction.light.light.range = 2 + remaining * 6; }
      interaction.entity.enabled = remaining > 0.002;
    }
  }

  closestInteraction(x: number, y: number, z: number, fx: number, fz: number, maxDistance = 2.75): InteractionVisual | undefined {
    let best: InteractionVisual | undefined; let bestDistance = maxDistance;
    for (const interaction of this.interactions.values()) {
      const dx = interaction.x - x; const dz = interaction.z - z; const distance = Math.hypot(dx, interaction.y - y, dz);
      if (distance >= bestDistance || distance < 0.001) continue;
      const horizontal = Math.max(0.001, Math.hypot(dx, dz));
      if ((dx * fx + dz * fz) / horizontal < 0.15) continue;
      best = interaction; bestDistance = distance;
    }
    return best;
  }

  resolveMovement(currentX: number, currentZ: number, nextX: number, nextZ: number, radius = 0.34): [number, number] {
    return resolveCircleAgainstAabbs(currentX, currentZ, nextX, nextZ, [...this.walls.values()], radius);
  }

  raycastWall(origin: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }, maxDistance = 3): { wall: WorldWall; distance: number; x: number; y: number; z: number; u: number; v: number; faceSign: -1 | 1 } | undefined {
    let closest: ReturnType<WorldRenderer['raycastWall']>; let closestDistance = maxDistance;
    for (const wall of this.walls.values()) {
      if (!wall.drawable) continue;
      const distance = rayAabb(origin, direction, wall); if (distance === undefined || distance >= closestDistance) continue;
      const x = origin.x + direction.x * distance; const y = origin.y + direction.y * distance; const z = origin.z + direction.z * distance;
      const u = wall.orientation === 'x' ? (z - wall.minZ) / wall.sz : (x - wall.minX) / wall.sx;
      const v = (y - wall.minY) / wall.sy;
      const faceSign: -1 | 1 = wall.orientation === 'x' ? (origin.x < wall.cx ? -1 : 1) : (origin.z < wall.cz ? -1 : 1);
      closest = { wall, distance, x, y, z, u: clamp01(u), v: clamp01(v), faceSign }; closestDistance = distance;
    }
    return closest;
  }

  addMarkVisual(mark: SurfaceMark): void {
    const wall = this.walls.get(mark.surfaceId); if (!wall || wall.shiftEpoch !== mark.shiftEpoch || mark.points.length === 0) return;
    let root = this.markRoots.get(mark.cellId);
    if (!root) { root = new pc.Entity(`marks:${mark.cellId}`); this.app.root.addChild(root); this.markRoots.set(mark.cellId, root); }
    const inkColor: [number, number, number] = mark.ink === 'red' ? [0.28, 0.025, 0.018] : mark.ink === 'blue' ? [0.02, 0.05, 0.18] : [0.008, 0.008, 0.006];
    const ink = this.getMaterial(`ink:${mark.ink}`, inkColor);
    const sign = mark.faceSign ?? 1;
    const points = mark.points.map(([u, v]) => markWorldPoint(wall, u, v, sign));
    if (points.length === 1) this.markSegment(root, `${mark.id}:dot`, wall, points[0]!, points[0]!, ink, mark.thickness);
    for (let index = 1; index < points.length; index += 1) this.markSegment(root, `${mark.id}:${index}`, wall, points[index - 1]!, points[index]!, ink, mark.thickness);
  }

  private markSegment(root: pc.Entity, id: string, wall: WorldWall, a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }, ink: pc.StandardMaterial, thickness: number): void {
    const dx = b.x - a.x; const dy = b.y - a.y; const dz = b.z - a.z;
    const length = Math.max(0.035, Math.hypot(dx, dy, dz));
    const entity = this.box(id, root, [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2], wall.orientation === 'x' ? [0.026, length, 0.035 * thickness] : [length, 0.035 * thickness, 0.026], ink);
    if (wall.orientation === 'x') entity.setEulerAngles(Math.atan2(dz, dy) * 180 / Math.PI, 0, 0);
    else entity.setEulerAngles(0, 0, Math.atan2(dy, dx) * 180 / Math.PI);
  }

  rerenderMarks(cellId: string): void {
    this.markRoots.get(cellId)?.destroy();
    this.markRoots.delete(cellId);
    this.renderMarksForCell(cellId);
  }

  private renderMarksForCell(cellId: string): void { for (const mark of this.save.marks.filter((candidate) => candidate.cellId === cellId)) this.addMarkVisual(mark); }
}
