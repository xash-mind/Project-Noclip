import * as pc from 'playcanvas';
import type { ItemInstance } from '../items/types.js';
import type { NoteSpec, CellDescriptor, LightGroupSpec } from '../world/types.js';

export type TextureKind = 'wall' | 'carpet' | 'ceiling' | 'concrete' | 'wood' | 'paper';

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


export interface LightGroupVisual {
  spec: LightGroupSpec;
  fixtures: pc.Entity[];
  light?: pc.Entity;
  lastValue: number;
}

export interface CellVisual {
  descriptor: CellDescriptor;
  root: pc.Entity;
  colliders: WorldCollider[];
  interactions: InteractionVisual[];
  lightGroups: LightGroupVisual[];
}

export function color(tuple: [number, number, number], multiplier = 1): pc.Color {
  return new pc.Color(tuple[0] * multiplier, tuple[1] * multiplier, tuple[2] * multiplier);
}

function noiseValue(x: number, y: number, variant: number): number {
  return ((x * 92837111 + y * 689287499 + variant * 283923481) >>> 0) % 255;
}

export function canvasTexture(app: pc.Application, kind: TextureKind, variant: number): pc.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas texture unavailable');
  const noise = (x: number, y: number) => noiseValue(x, y, variant);

  if (kind === 'wall') {
    context.fillStyle = variant % 3 === 0 ? '#d8ca82' : variant % 3 === 1 ? '#d1c47c' : '#c9bb70';
    context.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 4) for (let x = 0; x < 128; x += 4) {
      const n = noise(x, y);
      context.fillStyle = `rgba(${98 + n % 22},${86 + n % 18},${42 + n % 12},${0.018 + (n % 6) / 500})`;
      context.fillRect(x, y, 4, 4);
    }
    context.lineWidth = 1;
    for (let x = 0; x <= 128; x += 16) {
      context.strokeStyle = 'rgba(76,65,28,.16)';
      context.beginPath(); context.moveTo(x + 4, 0); context.lineTo(x + 4, 128); context.stroke();
      context.strokeStyle = 'rgba(255,244,177,.13)';
      context.beginPath(); context.moveTo(x + 11, 0); context.lineTo(x + 11, 128); context.stroke();
    }
  } else if (kind === 'carpet') {
    context.fillStyle = variant % 2 === 0 ? '#9b8b58' : '#91814f';
    context.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 2) for (let x = 0; x < 128; x += 2) {
      const n = noise(x, y);
      context.fillStyle = `rgba(${76 + n % 30},${66 + n % 25},${34 + n % 18},${0.08 + (n % 8) / 100})`;
      context.fillRect(x, y, 1 + n % 2, 2);
    }
    context.strokeStyle = 'rgba(228,205,129,.08)';
    context.lineWidth = 1;
    for (let y = 3 + variant; y < 128; y += 9) { context.beginPath(); context.moveTo(0, y); context.lineTo(128, y); context.stroke(); }
  } else if (kind === 'ceiling') {
    context.fillStyle = '#d5d2b4'; context.fillRect(0, 0, 128, 128);
    context.strokeStyle = 'rgba(47,48,38,.32)'; context.lineWidth = 2;
    for (let x = 0; x <= 128; x += 32) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 128); context.stroke(); }
    for (let y = 0; y <= 128; y += 32) { context.beginPath(); context.moveTo(0, y); context.lineTo(128, y); context.stroke(); }
  } else if (kind === 'concrete') {
    context.fillStyle = '#c1c0b5'; context.fillRect(0, 0, 128, 128);
    for (let index = 0; index < 250; index += 1) {
      const x = noise(index, 1) % 128; const y = noise(index, 2) % 128;
      context.fillStyle = `rgba(30,30,26,${0.025 + (noise(index, 3) % 8) / 150})`;
      context.fillRect(x, y, 2, 2);
    }
  } else if (kind === 'paper') {
    context.fillStyle = '#eee2ba'; context.fillRect(0, 0, 128, 128);
    for (let index = 0; index < 180; index += 1) {
      const x = noise(index, 4) % 128; const y = noise(index, 5) % 128;
      context.fillStyle = `rgba(70,55,26,${0.015 + (noise(index, 6) % 5) / 180})`;
      context.fillRect(x, y, 1, 1);
    }
  } else {
    context.fillStyle = '#b77e50'; context.fillRect(0, 0, 128, 128);
    context.strokeStyle = 'rgba(42,22,10,.25)';
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
