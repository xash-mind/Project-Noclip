import { CELL_SIZE, type CellDescriptor, type LightState } from '../world/types.js';
import { materialAssetId, materialColor, materialNumber, materialString } from './materialRuntime.js';

const ARCH_TARGET = 'material.arch-pale-wallpaper';
const CARPET_TARGET = 'material.level-0-carpet';
const HOLE_TARGET = 'carver.floor-hole-cluster';
const FLUORESCENT_PANEL_TARGET = 'material.fluorescent-panel';

export type Level0ArchFinishRole = 'pier' | 'upper' | 'lower-panel';
export type Cvh1DepthKey = 'upper' | 'middle' | 'deep' | 'void';

export interface Level0CarpetConditionModifier {
  signature: string;
  tintScale: readonly [1, 1, 1];
  glossDelta: 0;
  patternScale: 1;
}

export interface CanonicalLevel0CarpetPresentation {
  region: CellDescriptor['world']['regionId'];
  conditionSignature: string;
  conditionModifier: Level0CarpetConditionModifier;
  sourceMode: string;
  color: [number, number, number];
  gloss: number;
  patternSizeMeters: number;
  assetId?: string;
  brightness: number;
  contrast: number;
  saturation: number;
}

export interface Level0CarpetUvTransform {
  tiling: [number, number];
  offset: [number, number];
}

export interface Level0ArchFinishPresentation {
  role: Level0ArchFinishRole;
  color: [number, number, number];
  gloss: number;
}

export interface Cvh1DepthPresentation {
  upper: [number, number, number];
  middle: [number, number, number];
  deep: [number, number, number];
  void: [number, number, number];
}

export interface MFluorescentPanelPresentation {
  state: LightState;
  pulseLevel: number;
  diffuse: [number, number, number];
  emissive?: [number, number, number];
  emissiveIntensity: number;
}

function wrap01(value: number): number {
  return ((value % 1) + 1) % 1;
}

/**
 * PD-4 is deliberately frozen. Conditions participate explicitly in M-C1
 * resolution while reproducing the accepted pixels exactly: no condition adds
 * tint, gloss or pattern changes in Cleanup Wave 3.
 */
export function resolveLevel0CarpetConditionModifier(descriptor: CellDescriptor): Level0CarpetConditionModifier {
  return {
    signature: descriptor.world.conditionIds.join('+'),
    tintScale: [1, 1, 1],
    glossDelta: 0,
    patternScale: 1
  };
}

/** Canonical M-C1 policy: base definition + Region treatment + Condition modifier. */
export function resolveLevel0CarpetPresentation(descriptor: CellDescriptor): CanonicalLevel0CarpetPresentation {
  const region = descriptor.world.regionId;
  const conditionModifier = resolveLevel0CarpetConditionModifier(descriptor);
  const sourceMode = materialString(CARPET_TARGET, 'sourceMode', 'procedural');
  const baseColor = region === 'arch-rooms'
    ? materialColor(CARPET_TARGET, 'archTint', [0.65, 0.60, 0.49])
    : region === 'pillar-field'
      ? materialColor(CARPET_TARGET, 'pillarTint', [0.825, 0.755, 0.585])
      : materialColor(CARPET_TARGET, 'ordinaryTint', [0.79, 0.72, 0.55]);
  const baseGloss = region === 'arch-rooms' ? materialNumber(CARPET_TARGET, 'archGloss', 0.11) : 0.07;
  const basePatternSizeMeters = Math.max(0.05, materialNumber(CARPET_TARGET, 'patternSizeMeters', CELL_SIZE / 5));
  const assetId = sourceMode === 'nal-image' ? materialAssetId(CARPET_TARGET, 'texture') : undefined;

  return {
    region,
    conditionSignature: conditionModifier.signature,
    conditionModifier,
    sourceMode,
    color: [
      baseColor[0] * conditionModifier.tintScale[0],
      baseColor[1] * conditionModifier.tintScale[1],
      baseColor[2] * conditionModifier.tintScale[2]
    ],
    gloss: baseGloss + conditionModifier.glossDelta,
    patternSizeMeters: basePatternSizeMeters * conditionModifier.patternScale,
    assetId,
    brightness: materialNumber(CARPET_TARGET, 'brightness', 1),
    contrast: materialNumber(CARPET_TARGET, 'contrast', 1),
    saturation: materialNumber(CARPET_TARGET, 'saturation', 1)
  };
}

/**
 * Canonical world-phase policy for M-C1. The CV-H1 indexed mesh owns only its
 * stable UV basis; M-C1 owns the visible pattern frequency and world phase.
 */
export function canonicalLevel0CarpetUv(
  descriptor: CellDescriptor,
  patternSizeMeters: number,
  surface: 'full-floor' | 'cvh1-indexed',
  cvh1UvBasisMeters: number = CELL_SIZE / 5
): Level0CarpetUvTransform {
  const pattern = Math.max(0.05, patternSizeMeters);
  const minWorldX = descriptor.address.cellX * CELL_SIZE - CELL_SIZE / 2;
  const minWorldZ = descriptor.address.cellZ * CELL_SIZE - CELL_SIZE / 2;
  const multiplier = surface === 'cvh1-indexed'
    ? cvh1UvBasisMeters / pattern
    : CELL_SIZE / pattern;
  return {
    tiling: [multiplier, multiplier],
    offset: [wrap01(minWorldX / pattern), wrap01(minWorldZ / pattern)]
  };
}

export function canonicalLevel0CarpetRectUv(
  descriptor: CellDescriptor,
  patternSizeMeters: number,
  positionX: number,
  positionZ: number,
  sizeX: number,
  sizeZ: number
): Level0CarpetUvTransform {
  const pattern = Math.max(0.05, patternSizeMeters);
  const minWorldX = descriptor.address.cellX * CELL_SIZE + positionX - sizeX / 2;
  const minWorldZ = descriptor.address.cellZ * CELL_SIZE + positionZ - sizeZ / 2;
  return {
    tiling: [sizeX / pattern, sizeZ / pattern],
    offset: [wrap01(minWorldX / pattern), wrap01(minWorldZ / pattern)]
  };
}

/** M-A1 visual finish policy; A-A1 semantic roles are supplied by the world owner. */
export function resolveLevel0ArchFinishPresentation(role: Level0ArchFinishRole): Level0ArchFinishPresentation {
  const field = role === 'pier' ? 'pierColor' : role === 'lower-panel' ? 'panelColor' : 'upperColor';
  const fallback: [number, number, number] = role === 'pier'
    ? [0.76, 0.735, 0.665]
    : role === 'lower-panel'
      ? [0.885, 0.872, 0.805]
      : [0.955, 0.945, 0.885];
  return {
    role,
    color: materialColor(ARCH_TARGET, field, fallback),
    gloss: materialNumber(ARCH_TARGET, 'gloss', 0.07)
  };
}

/** Canonical CV-H1 visible depth palette. Geometry/depth extents remain renderer-owned. */
export function resolveCvh1DepthPresentation(): Cvh1DepthPresentation {
  return {
    upper: materialColor(HOLE_TARGET, 'upperColor', [0.145, 0.123, 0.072]),
    middle: materialColor(HOLE_TARGET, 'middleColor', [0.028, 0.022, 0.012]),
    deep: materialColor(HOLE_TARGET, 'deepColor', [0, 0, 0]),
    void: materialColor(HOLE_TARGET, 'voidColor', [0, 0, 0])
  };
}

/**
 * Canonical M-F1 visible-panel policy. World fixture identity/state supplies the
 * inputs; presentation owns only the panel's pixels. Physical light selection,
 * shadows and flicker runtime remain fixtureLighting responsibilities.
 */
export function resolveMFluorescentPanelPresentation(
  descriptor: CellDescriptor,
  state: LightState,
  pulse: number
): MFluorescentPanelPresentation {
  const arch = descriptor.world.regionId === 'arch-rooms';
  const pulseLevel = state === 'off' ? 0 : Math.max(0, Math.min(1, Math.round(pulse * 16) / 16));
  const activeDiffuse = arch
    ? materialColor(FLUORESCENT_PANEL_TARGET, 'archDiffuse', [0.99, 0.985, 0.83])
    : materialColor(FLUORESCENT_PANEL_TARGET, 'ordinaryDiffuse', [0.98, 0.955, 0.76]);
  const offDiffuse: [number, number, number] = [0.31, 0.31, 0.27];
  const diffuse: [number, number, number] = [
    offDiffuse[0] + (activeDiffuse[0] - offDiffuse[0]) * pulseLevel,
    offDiffuse[1] + (activeDiffuse[1] - offDiffuse[1]) * pulseLevel,
    offDiffuse[2] + (activeDiffuse[2] - offDiffuse[2]) * pulseLevel
  ];
  if (pulseLevel <= 0.001) return { state, pulseLevel, diffuse, emissiveIntensity: 0 };
  const emissive = arch
    ? materialColor(FLUORESCENT_PANEL_TARGET, 'archEmissive', [1, 0.985, 0.78])
    : materialColor(FLUORESCENT_PANEL_TARGET, 'ordinaryEmissive', [1, 0.95, 0.68]);
  const visualEmissiveScale = materialNumber(FLUORESCENT_PANEL_TARGET, 'visualEmissiveScale', 1);
  return {
    state,
    pulseLevel,
    diffuse,
    emissive,
    emissiveIntensity: (arch ? 2.18 : 2.28) * pulseLevel * visualEmissiveScale
  };
}
