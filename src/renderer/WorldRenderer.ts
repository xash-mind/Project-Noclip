import * as pc from 'playcanvas';
import type { DroppedItemState, SaveData, SurfaceMark } from '../persistence/types.js';
import { resolveCircleAgainstAabbs } from '../physics/collision.js';
import { sampleLightField, type LightFieldSample } from '../world/lighting.js';
import { CELL_SIZE, type CellDescriptor, type FloorPatchSpec } from '../world/types.js';
import { ZONE_PROFILES } from '../world/zones.js';
import { registerObjectCatalogShowcaseHost, type ObjectCatalogEntry } from './objectCatalog.js';
import { canvasTexture, makeMaterial, markWorldPoint, clamp01, rayAabb, type CellVisual, type InteractionVisual, type TextureKind, type WorldItemVisual, type WorldWall } from './support.js';
import { RendererCellBuilder } from './cellBuilder.js';
export type { InteractionVisual, WorldItemVisual } from './support.js';

export interface Cvh1FloorSurfaceMeshData {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  visibleArea: number;
}

export interface Cvh1FloorSurfaceProfile {
  strategy: 'single-indexed-planar-mesh';
  topY: number;
  carpetRepeatMeters: number;
  materialTiling: readonly [number, number];
  renderEntitiesPerHoleCell: 1;
  internalSideFaces: false;
  handoffGeometry: false;
}

interface Cvh1HoleBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const CVH1_FLOOR_TOP_Y = 0;
const CVH1_CARPET_REPEAT_METERS = CELL_SIZE / 5;
const CVH1_ORDINARY_FLOOR_TINT: [number, number, number] = [0.79, 0.72, 0.55];

function cvh1HoleBounds(hole: FloorPatchSpec): Cvh1HoleBounds {
  const half = CELL_SIZE / 2;
  return {
    minX: Math.max(-half, hole.position.x - hole.scale.x / 2),
    maxX: Math.min(half, hole.position.x + hole.scale.x / 2),
    minZ: Math.max(-half, hole.position.z - hole.scale.z / 2),
    maxZ: Math.min(half, hole.position.z + hole.scale.z / 2)
  };
}

function cvh1PointInsideHole(x: number, z: number, holes: readonly Cvh1HoleBounds[]): boolean {
  return holes.some((hole) => x > hole.minX && x < hole.maxX && z > hole.minZ && z < hole.maxZ);
}

/**
 * One watertight top surface for a CV-H1 Cell. Hole bounds are the exact
 * semantic FloorPatchSpec bounds; the internal grid exists only to triangulate
 * rectangular apertures and never becomes visible geometry of its own.
 */
export function cvh1FloorSurfaceMesh(holes: readonly FloorPatchSpec[]): Cvh1FloorSurfaceMeshData {
  const half = CELL_SIZE / 2;
  const bounds = holes.map(cvh1HoleBounds);
  const xEdges = [...new Set([-half, half, ...bounds.flatMap((hole) => [hole.minX, hole.maxX])])].sort((a, b) => a - b);
  const zEdges = [...new Set([-half, half, ...bounds.flatMap((hole) => [hole.minZ, hole.maxZ])])].sort((a, b) => a - b);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const vertices = new Map<string, number>();
  let visibleArea = 0;

  const vertex = (xIndex: number, zIndex: number): number => {
    const key = `${xIndex}:${zIndex}`;
    const existing = vertices.get(key);
    if (existing !== undefined) return existing;
    const x = xEdges[xIndex]!;
    const z = zEdges[zIndex]!;
    const index = positions.length / 3;
    positions.push(x, CVH1_FLOOR_TOP_Y, z);
    normals.push(0, 1, 0);
    // A Cell is exactly five carpet repeats wide. Local UVs therefore meet the
    // ordinary full-floor [5,5] phase exactly at both Cell borders without a
    // per-piece material clone or large world-coordinate precision growth.
    uvs.push((x + half) / CVH1_CARPET_REPEAT_METERS, (z + half) / CVH1_CARPET_REPEAT_METERS);
    vertices.set(key, index);
    return index;
  };

  for (let zIndex = 1; zIndex < zEdges.length; zIndex += 1) {
    const minZ = zEdges[zIndex - 1]!;
    const maxZ = zEdges[zIndex]!;
    if (maxZ - minZ <= 0.000001) continue;
    for (let xIndex = 1; xIndex < xEdges.length; xIndex += 1) {
      const minX = xEdges[xIndex - 1]!;
      const maxX = xEdges[xIndex]!;
      if (maxX - minX <= 0.000001) continue;
      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;
      if (cvh1PointInsideHole(centerX, centerZ, bounds)) continue;

      const southwest = vertex(xIndex - 1, zIndex - 1);
      const northwest = vertex(xIndex - 1, zIndex);
      const northeast = vertex(xIndex, zIndex);
      const southeast = vertex(xIndex, zIndex - 1);
      indices.push(southwest, northwest, northeast, southwest, northeast, southeast);
      visibleArea += (maxX - minX) * (maxZ - minZ);
    }
  }

  return { positions, normals, uvs, indices, visibleArea };
}

export function cvh1FloorSurfaceProfile(): Cvh1FloorSurfaceProfile {
  return {
    strategy: 'single-indexed-planar-mesh',
    topY: CVH1_FLOOR_TOP_Y,
    carpetRepeatMeters: CVH1_CARPET_REPEAT_METERS,
    materialTiling: [1, 1],
    renderEntitiesPerHoleCell: 1,
    internalSideFaces: false,
    handoffGeometry: false
  };
}

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
  get lightGroupCount(): number { return [...this.loaded.values()].reduce((sum, visual) => sum + visual.descriptor.lightGroups.length, 0); }
  get lightFixtureCount(): number { return [...this.loaded.values()].reduce((sum, visual) => sum + visual.descriptor.lightGroups.reduce((groupSum, group) => groupSum + group.fixtures.length, 0), 0); }

  private texture(kind: TextureKind, variant = 0): pc.Texture {
    const key = `${kind}:${variant}`;
    const existing = this.textures.get(key);
    if (existing) return existing;
    const created = canvasTexture(this.app, kind, variant);
    this.textures.set(key, created);
    return created;
  }

  private getMaterial(key: string, diffuse: [number, number, number], textureKind?: TextureKind, variant = 0, tiling: [number, number] = [1, 1], emissive?: [number, number, number], emissiveIntensity = 1, uvOffset: [number, number] = [0, 0]): pc.StandardMaterial {
    const fullKey = `${key}:${variant}:${tiling.join(',')}:${emissiveIntensity}:${uvOffset.join(',')}`;
    const existing = this.materials.get(fullKey);
    if (existing) return existing;
    const created = makeMaterial(diffuse, textureKind ? this.texture(textureKind, variant) : undefined, tiling, emissive, emissiveIntensity, uvOffset);
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
    this.replaceFixtureMeshes(visual);
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

  private replaceFixtureMeshes(visual: CellVisual): void {
    const descriptor = visual.descriptor;
    const rootNode = visual.root as pc.Entity & { children?: pc.Entity[] };
    for (const child of [...(rootNode.children ?? [])]) {
      const name = (child as pc.Entity & { name?: string }).name;
      if (name?.startsWith('fixture:')) child.destroy();
    }
    const profile = descriptor.world.generationVersion === 'gen3-v1' ? ZONE_PROFILES.baseline : ZONE_PROFILES[descriptor.address.zoneId];
    for (const group of descriptor.lightGroups) {
      const active = group.state !== 'off';
      const fixtureMat = this.getMaterial(
        `fixture:${profile.id}:${group.state}`,
        active ? [0.98, 0.96, 0.76] : [0.32, 0.32, 0.27],
        undefined,
        0,
        [1, 1],
        active ? [1, 0.95, 0.68] : [0.01, 0.01, 0.008],
        active ? (group.state === 'flicker' ? 1.35 : 2.35) * profile.lightMultiplier : 0.02
      );
      group.fixtures.forEach((fixture, index) => {
        this.box(`${group.id}:fixture:${index}`, visual.root, [fixture.x, fixture.y, fixture.z], [2.2, 0.08, 0.38], fixtureMat, group.rotationY);
      });
    }
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
      if (name && (removableNames.has(name) || name.startsWith('floor-piece:') || name === 'cvh1-floor-surface')) child.destroy();
    }

    const legacyProfile = ZONE_PROFILES[descriptor.address.zoneId];
    const gen3 = descriptor.world.generationVersion === 'gen3-v1';
    const floorMat = gen3
      ? this.getMaterial('floor:cvh1-coherent', CVH1_ORDINARY_FLOOR_TINT, 'carpet', 0, [1, 1])
      : this.getMaterial(`floor:${legacyProfile.id}:cvh1-coherent`, legacyProfile.floorTint, 'carpet', descriptor.variant % 3, [1, 1]);
    this.addCvh1FloorSurface(visual.root, holes, floorMat);
    for (const hole of holes) this.addRecessedHole(visual.root, hole, legacyProfile.floorTint);
  }

  private addCvh1FloorSurface(root: pc.Entity, holes: readonly FloorPatchSpec[], floorMat: pc.StandardMaterial): void {
    const data = cvh1FloorSurfaceMesh(holes);
    if (data.indices.length === 0) return;
    const mesh = new pc.Mesh(this.app.graphicsDevice);
    mesh.setPositions(data.positions);
    mesh.setNormals(data.normals);
    mesh.setUvs(0, data.uvs);
    mesh.setIndices(data.indices);
    mesh.update();
    const entity = new pc.Entity('cvh1-floor-surface');
    entity.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, floorMat)] });
    root.addChild(entity);
  }

  private addRecessedHole(root: pc.Entity, hole: FloorPatchSpec, floorTint: [number, number, number]): void {
    void floorTint;
    const voidMat = this.getMaterial('hole:void:recessed', [0.002, 0.002, 0.001]);
    const sideMat = this.getMaterial('hole:side:recessed', [0.006, 0.006, 0.004]);
    const x = hole.position.x; const z = hole.position.z; const sx = hole.scale.x; const sz = hole.scale.z;
    this.box(`${hole.id}:depth`, root, [x, -4.6, z], [sx * 0.94, 0.04, sz * 0.94], voidMat);
    const sideDepth = 4.5; const sideY = -sideDepth / 2; const edge = 0.035;
    this.box(`${hole.id}:north-side`, root, [x, sideY, z - sz / 2], [sx, sideDepth, edge], sideMat);
    this.box(`${hole.id}:south-side`, root, [x, sideY, z + sz / 2], [sx, sideDepth, edge], sideMat);
    this.box(`${hole.id}:west-side`, root, [x - sx / 2, sideY, z], [edge, sideDepth, sz], sideMat);
    this.box(`${hole.id}:east-side`, root, [x + sx / 2, sideY, z], [edge, sideDepth, sz], sideMat);
  }

  clearLabShowcase(): void {
    this.labShowcaseRoot?.destroy();
    this.labShowcaseRoot = undefined;
    this.labShowcaseCount = 0;
  }

  updateLightField(playerX: number, playerZ: number, elapsedSeconds: number, reducedFlicker: boolean): LightFieldSample {
    return sampleLightField(this.lightSources(), playerX, playerZ, elapsedSeconds, reducedFlicker);
  }

  private lightSources() {
    return [...this.loaded.values()].flatMap((visual) => visual.descriptor.lightGroups.map((group) => ({
        cellX: visual.descriptor.address.cellX,
        cellZ: visual.descriptor.address.cellZ,
        group
      })));
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
