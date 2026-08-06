import * as pc from 'playcanvas';
import type { DroppedItemState, SaveData, SurfaceMark } from '../persistence/types.js';
import { resolveCircleAgainstAabbs } from '../physics/collision.js';
import { CELL_SIZE, type CellDescriptor, type FloorPatchSpec } from '../world/types.js';
import { LIGHT_AUDIO_RADIUS, lightFlickerValue, type LightFieldSample } from '../world/lighting.js';
import { ZONE_PROFILES } from '../world/zones.js';
import { registerObjectCatalogShowcaseHost, type ObjectCatalogEntry } from './objectCatalog.js';
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
    registerObjectCatalogShowcaseHost({ spawn: (entries) => this.spawnLabShowcase(entries), clear: () => this.clearLabShowcase() });
  }
  get loadedCellCount(): number { return this.loaded.size; }
  get wallCount(): number { return this.walls.size; }
  get interactionCount(): number { return this.interactions.size; }
  get labObjectCount(): number { return this.labShowcaseCount; }
  get lightGroupCount(): number { return [...this.loaded.values()].reduce((sum, visual) => sum + visual.lightGroups.length, 0); }

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
    if (descriptor.floorPatches.some((patch) => patch.kind === 'hole')) this.replaceHoleFloor(visual);
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

  spawnLabShowcase(entries: readonly ObjectCatalogEntry[]): number {
    this.clearLabShowcase();
    if (entries.length === 0) return 0;
    const rootNode = this.app.root as pc.Entity & { children?: pc.Entity[] };
    const camera = rootNode.children?.find((child) => (child as pc.Entity & { name?: string }).name === 'player-camera') ?? this.app.root;
    const root = new pc.Entity('world-lab-object-showcase');
    camera.addChild(root);
    this.labShowcaseRoot = root;

    const stageEntry = (entry: ObjectCatalogEntry, x: number, y: number, z: number, scale: number): void => {
      const wrapper = new pc.Entity(`lab-stage:${entry.id}`);
      wrapper.setLocalPosition(x, y, z);
      wrapper.setLocalScale(scale, scale, scale);
      wrapper.setLocalEulerAngles(0, 180, 0);
      root.addChild(wrapper);
      this.cellBuilder.addCatalogVisual(wrapper, entry, 0, 0);
    };

    if (entries.length === 1) {
      stageEntry(entries[0]!, 0, -1.62, -2.5, 1);
      this.labShowcaseCount = 1;
      return 1;
    }

    const columns = Math.min(6, entries.length);
    const spacingX = 0.92; const spacingY = 0.68; const z = -3.75; const scale = 0.3;
    const shelfMat = this.getMaterial('lab:shelf', [0.19, 0.18, 0.12], 'wood', 1, [2, 1], [0.14, 0.13, 0.07], 0.45);
    const rows = Math.ceil(entries.length / columns);
    for (let row = 0; row < rows; row += 1) {
      const rowCount = Math.min(columns, entries.length - row * columns);
      const width = Math.max(0.8, rowCount * spacingX);
      const shelfY = -1.48 + row * spacingY;
      this.box(`lab:shelf:${row}`, root, [0, shelfY, z], [width, 0.075, 0.46], shelfMat);
    }
    entries.forEach((entry, index) => {
      const row = Math.floor(index / columns); const column = index % columns;
      const rowCount = Math.min(columns, entries.length - row * columns);
      const x = (column - (rowCount - 1) / 2) * spacingX;
      const shelfTop = -1.42 + row * spacingY;
      stageEntry(entry, x, shelfTop, z, scale);
    });
    const light = new pc.Entity('lab:inspection-light');
    light.addComponent('light', { type: 'omni', color: new pc.Color(1, 0.93, 0.67), range: 6, intensity: 1.35, castShadows: false });
    light.setLocalPosition(0, -0.1, -2.7);
    root.addChild(light);
    this.labShowcaseCount = entries.length;
    return entries.length;
  }

  private replaceHoleFloor(visual: CellVisual): void {
    const descriptor = visual.descriptor;
    const holes = descriptor.floorPatches.filter((patch) => patch.kind === 'hole');
    if (holes.length === 0) return;
    const removableNames = new Set(['floor', ...holes.flatMap((hole) => [
      `${hole.id}:void`, `${hole.id}:north-rim`, `${hole.id}:south-rim`, `${hole.id}:west-rim`, `${hole.id}:east-rim`
    ])]);
    const rootNode = visual.root as pc.Entity & { children?: pc.Entity[] };
    for (const child of [...(rootNode.children ?? [])]) {
      const name = (child as pc.Entity & { name?: string }).name;
      if (name && removableNames.has(name)) child.destroy();
    }

    const profile = ZONE_PROFILES[descriptor.address.zoneId];
    const floorMat = this.getMaterial(`floor:${profile.id}`, profile.floorTint, 'carpet', descriptor.variant % 3, [5, 5]);
    this.addSegmentedFloor(visual.root, holes, floorMat);
    for (const hole of holes) this.addRecessedHole(visual.root, hole, profile.floorTint);
  }

  private addSegmentedFloor(root: pc.Entity, holes: readonly FloorPatchSpec[], floorMat: pc.StandardMaterial): void {
    const half = CELL_SIZE / 2;
    const normalized = holes.map((hole) => ({
      minX: Math.max(-half, hole.position.x - hole.scale.x / 2),
      maxX: Math.min(half, hole.position.x + hole.scale.x / 2),
      minZ: Math.max(-half, hole.position.z - hole.scale.z / 2),
      maxZ: Math.min(half, hole.position.z + hole.scale.z / 2)
    }));
    const zEdges = [...new Set([-half, half, ...normalized.flatMap((entry) => [entry.minZ, entry.maxZ])])].sort((a, b) => a - b);
    let pieceIndex = 0;
    for (let zIndex = 1; zIndex < zEdges.length; zIndex += 1) {
      const minZ = zEdges[zIndex - 1]!; const maxZ = zEdges[zIndex]!;
      if (maxZ - minZ < 0.01) continue;
      const centerZ = (minZ + maxZ) / 2;
      const active = normalized.filter((entry) => centerZ > entry.minZ && centerZ < entry.maxZ);
      const xEdges = [...new Set([-half, half, ...active.flatMap((entry) => [entry.minX, entry.maxX])])].sort((a, b) => a - b);
      for (let xIndex = 1; xIndex < xEdges.length; xIndex += 1) {
        const minX = xEdges[xIndex - 1]!; const maxX = xEdges[xIndex]!;
        if (maxX - minX < 0.01) continue;
        const centerX = (minX + maxX) / 2;
        if (active.some((entry) => centerX > entry.minX && centerX < entry.maxX)) continue;
        this.box(`floor-piece:${pieceIndex++}`, root, [centerX, -0.16, centerZ], [maxX - minX, 0.32, maxZ - minZ], floorMat);
      }
    }
  }

  private addRecessedHole(root: pc.Entity, hole: FloorPatchSpec, floorTint: [number, number, number]): void {
    const voidMat = this.getMaterial('hole:void:recessed', [0.002, 0.002, 0.001]);
    const sideMat = this.getMaterial('hole:side:recessed', [floorTint[0] * 0.28, floorTint[1] * 0.25, floorTint[2] * 0.18], 'concrete', hole.id.length % 3);
    const rimMat = this.getMaterial('hole:rim:recessed', [floorTint[0] * 0.86, floorTint[1] * 0.8, floorTint[2] * 0.62], 'carpet', hole.id.length % 3);
    const x = hole.position.x; const z = hole.position.z; const sx = hole.scale.x; const sz = hole.scale.z;
    this.box(`${hole.id}:depth`, root, [x, -0.72, z], [sx * 0.92, 0.04, sz * 0.92], voidMat);
    const sideDepth = 0.58; const sideY = -sideDepth / 2; const edge = 0.08;
    this.box(`${hole.id}:north-side`, root, [x, sideY, z - sz / 2], [sx, sideDepth, edge], sideMat);
    this.box(`${hole.id}:south-side`, root, [x, sideY, z + sz / 2], [sx, sideDepth, edge], sideMat);
    this.box(`${hole.id}:west-side`, root, [x - sx / 2, sideY, z], [edge, sideDepth, sz], sideMat);
    this.box(`${hole.id}:east-side`, root, [x + sx / 2, sideY, z], [edge, sideDepth, sz], sideMat);
    const rim = 0.12;
    this.box(`${hole.id}:north-rim`, root, [x, 0.028, z - sz / 2], [sx + rim, 0.056, rim], rimMat);
    this.box(`${hole.id}:south-rim`, root, [x, 0.028, z + sz / 2], [sx + rim, 0.056, rim], rimMat);
    this.box(`${hole.id}:west-rim`, root, [x - sx / 2, 0.028, z], [rim, 0.056, Math.max(0.1, sz - rim)], rimMat);
    this.box(`${hole.id}:east-rim`, root, [x + sx / 2, 0.028, z], [rim, 0.056, Math.max(0.1, sz - rim)], rimMat);
  }

  clearLabShowcase(): void {
    this.labShowcaseRoot?.destroy();
    this.labShowcaseRoot = undefined;
    this.labShowcaseCount = 0;
  }


  updateLightField(playerX: number, playerZ: number, elapsedSeconds: number, reducedFlicker: boolean): LightFieldSample {
    let energy = 0; let activeGroups = 0; let flickerGroups = 0; let flickerPulse = 0; let weightedTemperature = 0;
    for (const visual of this.loaded.values()) {
      const originX = visual.descriptor.address.cellX * CELL_SIZE;
      const originZ = visual.descriptor.address.cellZ * CELL_SIZE;
      for (const group of visual.lightGroups) {
        const value = lightFlickerValue(group.spec, elapsedSeconds, reducedFlicker);
        const worldX = originX + group.spec.position.x;
        const worldZ = originZ + group.spec.position.z;
        const distance = Math.hypot(worldX - playerX, worldZ - playerZ);
        const attenuation = Math.max(0, 1 - distance / LIGHT_AUDIO_RADIUS);
        const contribution = value * group.spec.intensity * attenuation * attenuation;
        const enabled = value > 0.08;
        const wasEnabled = group.lastValue > 0.08;
        const targetIntensity = value * group.spec.intensity * ZONE_PROFILES[visual.descriptor.address.zoneId].lightMultiplier;
        if (group.light.light && Math.abs(group.light.light.intensity - targetIntensity) > 0.015) group.light.light.intensity = targetIntensity;
        if (enabled !== wasEnabled) group.fixtures.forEach((fixture) => { fixture.enabled = enabled; });
        if (enabled) activeGroups += 1;
        if (group.spec.state === 'flicker') { flickerGroups += 1; flickerPulse = Math.max(flickerPulse, Math.max(0, group.lastValue - value)); }
        energy += contribution;
        weightedTemperature += contribution * group.spec.temperature;
        group.lastValue = value;
      }
    }
    const boundedEnergy = Math.max(0, Math.min(1, 1 - Math.exp(-energy * 0.72)));
    return {
      energy: boundedEnergy,
      activeGroups,
      flickerGroups,
      flickerPulse,
      temperature: energy > 0.001 ? weightedTemperature / energy : 0.94
    };
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
