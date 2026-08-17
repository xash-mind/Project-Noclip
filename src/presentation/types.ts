export type RepresentationId = string & { readonly __representationId: unique symbol };
export type GeometryId = string & { readonly __geometryId: unique symbol };
export type AssetId = string & { readonly __assetId: unique symbol };
export type PresentationMaterialId = string & { readonly __presentationMaterialId: unique symbol };
export type SemanticPresentationTargetId = string & { readonly __semanticPresentationTargetId: unique symbol };

export type PresentationCategory =
  | 'Region'
  | 'Architecture Pattern'
  | 'Feature'
  | 'Material'
  | 'Condition'
  | 'Carver'
  | 'Structure'
  | 'Item'
  | 'Transition'
  | 'renderer/runtime subsystem';

export type LcgClassification = 'LCG-0' | 'LCG-1' | 'LCG-2' | 'LCG-3' | 'LCG-X';
export type CollisionMode = 'none' | 'box' | 'capsule' | 'simple-hull' | 'authored-simple';
export type PresentationValue = string | number | boolean;

export interface LcgProfile {
  classification: LcgClassification;
  rationale: string;
  recommendedTriangles?: number;
  warningTriangles?: number;
}

export interface DeterministicPresentationVariation {
  dimensionalVariation?: number;
  alignmentDrift?: readonly [number, number, number];
  profileBias?: number;
  depthVariation?: number;
  scaleVariation?: readonly [number, number, number];
  materialWearSeed?: string | number;
  minorSkewDegrees?: readonly [number, number, number];
}

export interface EditablePresentationParameter {
  key: string;
  label: string;
  kind: 'number' | 'boolean' | 'text' | 'enum';
  unit?: 'm' | 'ratio' | 'degrees' | 'count';
  min?: number;
  max?: number;
  step?: number;
  values?: readonly string[];
  description?: string;
}

export interface RepresentationDefinition {
  id: RepresentationId;
  humanName: string;
  category: PresentationCategory;
  geometryId?: GeometryId;
  materialIds: readonly PresentationMaterialId[];
  assetIds: readonly AssetId[];
  parameters: Readonly<Record<string, PresentationValue>>;
  editableParameters: readonly EditablePresentationParameter[];
  deterministicVariation?: DeterministicPresentationVariation;
  lcg?: LcgProfile;
  collisionMode: CollisionMode;
  fallback?: RepresentationId;
  owningModule: string;
  sourcePaths: readonly string[];
  relevantTests: readonly string[];
  diagnostics?: readonly string[];
}

export interface RepresentationBinding {
  semanticTargetId: SemanticPresentationTargetId;
  representationId: RepresentationId;
  fallbackRepresentationId?: RepresentationId;
  category: PresentationCategory;
  humanName: string;
}

export interface ResolvedRepresentation {
  binding: RepresentationBinding;
  definition: RepresentationDefinition;
  requestedRepresentationId: RepresentationId;
  fallbackDepth: number;
  warnings: readonly string[];
}

export interface RepresentationRegistrySnapshot {
  representations: readonly RepresentationDefinition[];
  bindings: readonly RepresentationBinding[];
}

export function representationId(value: string): RepresentationId { return value as RepresentationId; }
export function geometryId(value: string): GeometryId { return value as GeometryId; }
export function assetId(value: string): AssetId { return value as AssetId; }
export function presentationMaterialId(value: string): PresentationMaterialId { return value as PresentationMaterialId; }
export function semanticPresentationTargetId(value: string): SemanticPresentationTargetId { return value as SemanticPresentationTargetId; }
