import * as pc from 'playcanvas';
import type { ItemInstance } from '../items/types.js';
import type { NoteSpec, CellDescriptor } from '../world/types.js';

export interface WorldCollider {
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
export type WorldWall = WorldCollider;

export interface WorldItemVisual {
  kind: 'item';
  id: string;
  entity: pc.Entity;
  light?: pc.Entity;
  item: ItemInstance;
  x: number;
  y: number;
  z: number;
  activatedAt?: number;
  lootNodeId?: string;
}
export interface ExitVisual {
  kind: 'exit';
  id: string;
  entity: pc.Entity;
  destinationId: string;
  label: string;
  enabled: boolean;
  minimumWorldDay: number;
  minimumExposure: number;
  x: number;
  y: number;
  z: number;
}
export interface SeatVisual { kind: 'seat'; id: string; entity: pc.Entity; x: number; y: number; z: number; }
export interface NoteVisual { kind: 'note'; id: string; entity: pc.Entity; note: NoteSpec; x: number; y: number; z: number; }
export type InteractionVisual = WorldItemVisual | ExitVisual | SeatVisual | NoteVisual;

export interface CellVisual {
  descriptor: CellDescriptor;
  root: pc.Entity;
  colliders: WorldCollider[];
  interactions: InteractionVisual[];
}

export function color(tuple: [number, number, number], multiplier = 1): pc.Color {
  return new pc.Color(tuple[0] * multiplier, tuple[1] * multiplier, tuple[2] * multiplier);
}

export function canvasTexture(app: pc.Application, kind: 'wall' | 'carpet' | 'ceiling' | 'concrete' | 'wood', variant: number): pc.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas texture unavailable');
  const noise = (x: number, y: number) => ((x * 92837111 + y * 689287499 + variant * 283923481) >>> 0) % 255;
  if (kind === 'wall') {
    context.fillStyle = variant % 3 === 0 ? '#9d8c45' : variant % 3 === 1 ? '#a89753' : '#948342';
    context.fillRect(0, 0, 128, 128);
    context.strokeStyle = 'rgba(76,63,22,.22)';
    context.lineWidth = 2;
    for (let x = 7 + variant; x < 128; x += 17) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x + (variant % 2 ? 3 : -2), 128); context.stroke(); }
    context.strokeStyle = 'rgba(235,218,130,.16)';
    context.lineWidth = 1;
    for (let y = 5; y < 128; y += 11) { context.beginPath(); context.moveTo(0, y); context.lineTo(128, y + Math.sin(y) * 2); context.stroke(); }
  } else if (kind === 'carpet') {
    context.fillStyle = '#3d351d'; context.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 2) for (let x = 0; x < 128; x += 2) {
      const n = noise(x, y); context.fillStyle = `rgba(${70 + n % 25},${58 + n % 18},${28 + n % 13},.35)`; context.fillRect(x, y, 2, 2);
    }
  } else if (kind === 'ceiling') {
    context.fillStyle = '#a7a483'; context.fillRect(0, 0, 128, 128);
    context.strokeStyle = 'rgba(47,48,38,.45)'; context.lineWidth = 3;
    for (let x = 0; x <= 128; x += 32) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 128); context.stroke(); }
    for (let y = 0; y <= 128; y += 32) { context.beginPath(); context.moveTo(0, y); context.lineTo(128, y); context.stroke(); }
  } else if (kind === 'concrete') {
    context.fillStyle = '#56564e'; context.fillRect(0, 0, 128, 128);
    for (let index = 0; index < 250; index += 1) { const x = noise(index, 1) % 128; const y = noise(index, 2) % 128; context.fillStyle = `rgba(20,20,18,${0.04 + (noise(index, 3) % 9) / 100})`; context.fillRect(x, y, 2, 2); }
  } else {
    context.fillStyle = '#53331c'; context.fillRect(0, 0, 128, 128);
    context.strokeStyle = 'rgba(22,10,4,.35)';
    for (let y = 8; y < 128; y += 14) { context.beginPath(); context.moveTo(0, y); context.bezierCurveTo(30, y - 3, 70, y + 4, 128, y); context.stroke(); }
  }
  const texture = new pc.Texture(app.graphicsDevice, { mipmaps: true });
  texture.addressU = pc.ADDRESS_REPEAT;
  texture.addressV = pc.ADDRESS_REPEAT;
  texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
  texture.magFilter = pc.FILTER_LINEAR;
  texture.setSource(canvas);
  return texture;
}

export function makeMaterial(diffuse: [number, number, number], texture?: pc.Texture, tiling: [number, number] = [1, 1], emissive?: [number, number, number], emissiveIntensity = 1): pc.StandardMaterial {
  const result = new pc.StandardMaterial();
  result.diffuse = color(diffuse);
  result.gloss = 0.08;
  result.metalness = 0;
  if (texture) { result.diffuseMap = texture; result.diffuseMapTiling = new pc.Vec2(tiling[0], tiling[1]); }
  if (emissive) { result.emissive = color(emissive); result.emissiveIntensity = emissiveIntensity; }
  result.update();
  return result;
}

export function markWorldPoint(wall: WorldWall, u: number, v: number, faceSign: -1 | 1): { x: number; y: number; z: number } {
  const offset = faceSign * ((wall.orientation === 'x' ? wall.sx : wall.sz) / 2 + 0.018);
  return wall.orientation === 'x'
    ? { x: wall.cx + offset, y: wall.minY + v * wall.sy, z: wall.minZ + u * wall.sz }
    : { x: wall.minX + u * wall.sx, y: wall.minY + v * wall.sy, z: wall.cz + offset };
}
export function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }

export function rayAabb(origin: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }, wall: WorldWall): number | undefined {
  let tMin = 0; let tMax = Number.POSITIVE_INFINITY;
  for (const axis of ['x', 'y', 'z'] as const) {
    const min = axis === 'x' ? wall.minX : axis === 'y' ? wall.minY : wall.minZ;
    const max = axis === 'x' ? wall.maxX : axis === 'y' ? wall.maxY : wall.maxZ;
    const value = origin[axis]; const delta = direction[axis];
    if (Math.abs(delta) < 1e-7) { if (value < min || value > max) return undefined; continue; }
    const inverse = 1 / delta; let near = (min - value) * inverse; let far = (max - value) * inverse;
    if (near > far) [near, far] = [far, near]; tMin = Math.max(tMin, near); tMax = Math.min(tMax, far); if (tMin > tMax) return undefined;
  }
  return tMin >= 0 ? tMin : tMax >= 0 ? tMax : undefined;
}
