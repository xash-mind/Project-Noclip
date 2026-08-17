import { assetId, type AssetId, type CollisionMode } from './types.js';

export type AssetType = 'image' | 'audio' | 'mesh';
export type ImageAssetRole = 'wall-texture' | 'floor-texture' | 'ceiling-texture' | 'prop-texture' | 'decal' | 'ui' | 'reference-only';
export type AudioAssetRole = 'ambient-loop' | 'spatial-loop' | 'one-shot' | 'fixture' | 'entity' | 'footstep' | 'transition' | 'ui';
export type MeshAssetRole = 'feature-mesh' | 'structure-mesh' | 'item-mesh' | 'entity-mesh';
export type AssetRole = ImageAssetRole | AudioAssetRole | MeshAssetRole;
export type AssetRuntimeStatus = 'ready' | 'missing-source' | 'invalid' | 'disabled';

export type AssetProfileId =
  | 'Wall Texture'
  | 'Floor Texture'
  | 'Ceiling Texture'
  | 'Prop Texture'
  | 'UI Image'
  | 'Reference Image'
  | 'Ambient Audio'
  | 'Spatial Audio'
  | 'UI Audio'
  | 'Feature Mesh'
  | 'Structure Mesh'
  | 'Item Mesh'
  | 'Entity Mesh';

export interface AssetValidationResult {
  valid: boolean;
  warnings: readonly string[];
  errors: readonly string[];
}

export interface SourceAssetDefinition {
  id: AssetId;
  type: AssetType;
  role: AssetRole;
  profile: AssetProfileId;
  source: string;
  fallback?: AssetId;
  provenance?: string;
  author?: string;
  licensingNote?: string;
  image?: {
    width?: number;
    height?: number;
    colorSpace?: 'srgb' | 'linear';
    wrap?: 'repeat' | 'clamp';
    worldScaleMeters?: number;
    materialBinding?: string;
  };
  audio?: {
    durationSeconds?: number;
    loop?: boolean;
    spatial?: boolean;
    volume?: number;
    rangeMeters?: number;
    falloff?: 'linear' | 'inverse' | 'exponential';
    ownership?: string;
    variationGroup?: string;
  };
  mesh?: {
    triangles?: number;
    vertices?: number;
    collision?: CollisionMode;
    pivot?: 'floor-contact' | 'mounting-point' | 'structural-anchor' | 'origin';
  };
}

export interface RuntimeAssetDefinition extends SourceAssetDefinition {
  contentHash: string;
  runtimePath: string;
  runtimeStatus: AssetRuntimeStatus;
  validation: AssetValidationResult;
}

export interface AssetProfile {
  id: AssetProfileId;
  type: AssetType;
  roles: readonly AssetRole[];
  defaults: Readonly<Record<string, string | number | boolean>>;
}

export const CANONICAL_MESH_IMPORT_CONVENTION = Object.freeze({
  format: 'glb',
  unit: 'metre',
  up: '+Y',
  forward: '-Z',
  scale: 1,
  transforms: 'baked-at-source',
  materialPolicy: 'representation-owned',
  collisionPolicy: 'render-mesh-is-not-collision'
} as const);

export const ASSET_PROFILES: readonly AssetProfile[] = [
  { id: 'Wall Texture', type: 'image', roles: ['wall-texture'], defaults: { wrap: 'repeat', colorSpace: 'srgb', worldScaleMeters: 2.6 } },
  { id: 'Floor Texture', type: 'image', roles: ['floor-texture'], defaults: { wrap: 'repeat', colorSpace: 'srgb', worldScaleMeters: 2.8 } },
  { id: 'Ceiling Texture', type: 'image', roles: ['ceiling-texture'], defaults: { wrap: 'repeat', colorSpace: 'srgb', worldScaleMeters: 2.4 } },
  { id: 'Prop Texture', type: 'image', roles: ['prop-texture', 'decal'], defaults: { wrap: 'clamp', colorSpace: 'srgb' } },
  { id: 'UI Image', type: 'image', roles: ['ui'], defaults: { wrap: 'clamp', colorSpace: 'srgb' } },
  { id: 'Reference Image', type: 'image', roles: ['reference-only'], defaults: { wrap: 'clamp', colorSpace: 'srgb' } },
  { id: 'Ambient Audio', type: 'audio', roles: ['ambient-loop'], defaults: { loop: true, spatial: false, volume: 1 } },
  { id: 'Spatial Audio', type: 'audio', roles: ['spatial-loop', 'one-shot', 'fixture', 'entity', 'footstep', 'transition'], defaults: { spatial: true, volume: 1, falloff: 'inverse' } },
  { id: 'UI Audio', type: 'audio', roles: ['ui'], defaults: { spatial: false, volume: 1 } },
  { id: 'Feature Mesh', type: 'mesh', roles: ['feature-mesh'], defaults: { collision: 'none', pivot: 'floor-contact' } },
  { id: 'Structure Mesh', type: 'mesh', roles: ['structure-mesh'], defaults: { collision: 'none', pivot: 'structural-anchor' } },
  { id: 'Item Mesh', type: 'mesh', roles: ['item-mesh'], defaults: { collision: 'none', pivot: 'floor-contact' } },
  { id: 'Entity Mesh', type: 'mesh', roles: ['entity-mesh'], defaults: { collision: 'none', pivot: 'origin' } }
];

const PROFILE_BY_ID = new Map(ASSET_PROFILES.map((profile) => [profile.id, profile]));
const ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)+$/;

export function validateAssetDefinitions(definitions: readonly SourceAssetDefinition[]): AssetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<AssetId>();
  for (const definition of definitions) {
    if (!ID_PATTERN.test(definition.id)) errors.push(`Invalid Asset ID ${definition.id}`);
    if (ids.has(definition.id)) errors.push(`Duplicate Asset ID ${definition.id}`);
    ids.add(definition.id);
    const profile = PROFILE_BY_ID.get(definition.profile);
    if (!profile) errors.push(`Unknown asset profile ${definition.profile} for ${definition.id}`);
    else {
      if (profile.type !== definition.type) errors.push(`Profile ${definition.profile} does not accept ${definition.type} asset ${definition.id}`);
      if (!profile.roles.includes(definition.role)) errors.push(`Profile ${definition.profile} does not accept role ${definition.role} for ${definition.id}`);
    }
    if (!definition.source.startsWith('assets/source/')) errors.push(`Asset ${definition.id} source must live under assets/source/`);
    if (definition.type === 'mesh' && definition.mesh?.collision === undefined) warnings.push(`Mesh ${definition.id} relies on profile collision default`);
    if (definition.type === 'image' && definition.image?.worldScaleMeters !== undefined && definition.image.worldScaleMeters <= 0) errors.push(`Image ${definition.id} worldScaleMeters must be positive`);
    if (definition.type === 'audio' && definition.audio?.volume !== undefined && (definition.audio.volume < 0 || definition.audio.volume > 2)) errors.push(`Audio ${definition.id} volume must be between 0 and 2`);
  }
  for (const definition of definitions) {
    if (definition.fallback && !ids.has(definition.fallback)) errors.push(`Asset ${definition.id} fallback ${definition.fallback} is not defined`);
  }
  return { valid: errors.length === 0, warnings, errors };
}

export function resolveAsset(
  requestedId: AssetId,
  definitions: readonly RuntimeAssetDefinition[],
  available: (asset: RuntimeAssetDefinition) => boolean = (asset) => asset.runtimeStatus === 'ready'
): RuntimeAssetDefinition | undefined {
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  const seen = new Set<AssetId>();
  let current: AssetId | undefined = requestedId;
  while (current && !seen.has(current)) {
    seen.add(current);
    const candidate = byId.get(current);
    if (!candidate) return undefined;
    if (available(candidate)) return candidate;
    current = candidate.fallback;
  }
  return undefined;
}

export function asAssetId(value: string): AssetId { return assetId(value); }
