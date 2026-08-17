import { CELL_SIZE, type CellDescriptor, type PropSpec } from '../world/types.js';
import { resolveRepresentation } from './registry.js';
import { semanticTargetForPropKind, LEVEL0_FEATURE_PRESENTATION_REGISTRY } from './level0FeatureRepresentations.js';
import { stableSerialize } from './stableSerialization.js';
import type { AssetId, CollisionMode, DeterministicPresentationVariation, GeometryId, LcgClassification, PresentationCategory, PresentationMaterialId, PresentationValue, RepresentationBinding, RepresentationId, SemanticPresentationTargetId } from './types.js';

export const DEVELOPMENT_CONTEXT_SCHEMA = 'development-context-v1' as const;

export interface DevelopmentContextDesignTarget {
  semanticTargetId: string;
  humanName: string;
  category: PresentationCategory;
}

export interface DevelopmentContextRuntimeInstance {
  stableRuntimeId: string;
  worldSeed: string;
  generationVersion: string;
  regionId: string;
  cell: { id: string; x: number; z: number };
  worldPosition: { x: number; y: number; z: number };
}

export interface DevelopmentContext {
  schema: typeof DEVELOPMENT_CONTEXT_SCHEMA;
  project: { id: 'project-noclip'; repository: 'xash-mind/Project-Noclip'; branchOrRef?: string };
  designTarget: DevelopmentContextDesignTarget;
  runtimeInstance?: DevelopmentContextRuntimeInstance;
  representation: {
    id: RepresentationId;
    geometryId?: GeometryId;
    materialIds: readonly PresentationMaterialId[];
    assetIds: readonly AssetId[];
    binding: RepresentationBinding;
    lcg?: LcgClassification;
    collisionMode: CollisionMode;
    editableParameters: readonly string[];
    canonicalValues: Readonly<Record<string, PresentationValue>>;
    activePreviewOverrides: Readonly<Record<string, PresentationValue>>;
    deterministicVariation?: DeterministicPresentationVariation;
    fallback?: RepresentationId;
  };
  ownership: { definitionModule: string; sourcePaths: readonly string[]; relevantTests: readonly string[] };
  diagnostics: readonly string[];
  invariants: readonly string[];
  validationWarnings: readonly string[];
  userObservation?: string;
  requestedChange?: string;
}

export interface DevelopmentContextOptions {
  branchOrRef?: string;
  activePreviewOverrides?: Readonly<Record<string, PresentationValue>>;
  userObservation?: string;
  requestedChange?: string;
}

function developmentContextForTarget(
  semanticTargetId: SemanticPresentationTargetId,
  options: DevelopmentContextOptions
): DevelopmentContext | undefined {
  const resolved = resolveRepresentation(semanticTargetId, LEVEL0_FEATURE_PRESENTATION_REGISTRY);
  if (!resolved) return undefined;
  return {
    schema: DEVELOPMENT_CONTEXT_SCHEMA,
    project: { id: 'project-noclip', repository: 'xash-mind/Project-Noclip', ...(options.branchOrRef ? { branchOrRef: options.branchOrRef } : {}) },
    designTarget: { semanticTargetId, humanName: resolved.binding.humanName, category: resolved.binding.category },
    representation: {
      id: resolved.definition.id,
      geometryId: resolved.definition.geometryId,
      materialIds: resolved.definition.materialIds,
      assetIds: resolved.definition.assetIds,
      binding: resolved.binding,
      lcg: resolved.definition.lcg?.classification,
      collisionMode: resolved.definition.collisionMode,
      editableParameters: resolved.definition.editableParameters.map((parameter) => parameter.key),
      canonicalValues: resolved.definition.parameters,
      activePreviewOverrides: options.activePreviewOverrides ?? {},
      deterministicVariation: resolved.definition.deterministicVariation,
      fallback: resolved.definition.fallback
    },
    ownership: { definitionModule: resolved.definition.owningModule, sourcePaths: resolved.definition.sourcePaths, relevantTests: resolved.definition.relevantTests },
    diagnostics: resolved.definition.diagnostics ?? [],
    invariants: [
      'world seed result unchanged by presentation edits',
      'stable generated ID unchanged by representation rebinding',
      'world position and topology unchanged by presentation edits',
      'generationVersion and save identity unchanged by presentation edits'
    ],
    validationWarnings: resolved.warnings,
    ...(options.userObservation ? { userObservation: options.userObservation } : {}),
    ...(options.requestedChange ? { requestedChange: options.requestedChange } : {})
  };
}

export function developmentContextForDesignTarget(
  semanticTargetId: SemanticPresentationTargetId,
  options: DevelopmentContextOptions = {}
): DevelopmentContext | undefined {
  return developmentContextForTarget(semanticTargetId, options);
}

export function developmentContextForProp(descriptor: CellDescriptor, prop: PropSpec, options: DevelopmentContextOptions = {}): DevelopmentContext | undefined {
  const semanticTargetId = semanticTargetForPropKind(prop.kind);
  if (!semanticTargetId) return undefined;
  const context = developmentContextForTarget(semanticTargetId, options);
  if (!context) return undefined;
  const worldPosition = {
    x: descriptor.address.cellX * CELL_SIZE + prop.position.x,
    y: prop.position.y,
    z: descriptor.address.cellZ * CELL_SIZE + prop.position.z
  };
  return {
    ...context,
    runtimeInstance: {
      stableRuntimeId: prop.id,
      worldSeed: descriptor.address.worldSeed,
      generationVersion: descriptor.address.generationVersion,
      regionId: descriptor.world.regionId,
      cell: { id: descriptor.id, x: descriptor.address.cellX, z: descriptor.address.cellZ },
      worldPosition
    }
  };
}

export function serializeDevelopmentContext(context: DevelopmentContext): string {
  return stableSerialize(context);
}
