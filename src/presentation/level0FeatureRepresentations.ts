import { LEVEL0_FEATURE_DEFINITION_SOURCE } from './generatedLevel0FeatureDefinitions.js';
import {
  assetId,
  geometryId,
  presentationMaterialId,
  representationId,
  semanticPresentationTargetId,
  type EditablePresentationParameter,
  type LcgProfile,
  type PresentationCategory,
  type PresentationValue,
  type RepresentationBinding,
  type RepresentationDefinition,
  type RepresentationRegistrySnapshot,
  type SemanticPresentationTargetId
} from './types.js';

export const MEDIUM_BUCKET_TARGET = semanticPresentationTargetId('feature.medium-bucket');
export const SMALL_GREY_OPEN_PAINT_CAN_TARGET = semanticPresentationTargetId('feature.small-grey-open-paint-can');

type RawDefinition = typeof LEVEL0_FEATURE_DEFINITION_SOURCE.representations[number];
type RawBinding = typeof LEVEL0_FEATURE_DEFINITION_SOURCE.bindings[number];

function hydrateDefinition(raw: RawDefinition): RepresentationDefinition {
  return {
    id: representationId(raw.id),
    humanName: raw.humanName,
    category: raw.category as PresentationCategory,
    ...(raw.geometryId ? { geometryId: geometryId(raw.geometryId) } : {}),
    materialIds: raw.materialIds.map(presentationMaterialId),
    assetIds: raw.assetIds.map(assetId),
    parameters: raw.parameters as Readonly<Record<string, PresentationValue>>,
    editableParameters: raw.editableParameters as readonly EditablePresentationParameter[],
    ...(raw.lcg ? { lcg: raw.lcg as LcgProfile } : {}),
    collisionMode: raw.collisionMode,
    ...('fallback' in raw && raw.fallback ? { fallback: representationId(raw.fallback) } : {}),
    owningModule: raw.owningModule,
    sourcePaths: raw.sourcePaths,
    relevantTests: raw.relevantTests
  };
}

function hydrateBinding(raw: RawBinding): RepresentationBinding {
  return {
    semanticTargetId: semanticPresentationTargetId(raw.semanticTargetId),
    representationId: representationId(raw.representationId),
    ...('fallbackRepresentationId' in raw && raw.fallbackRepresentationId ? { fallbackRepresentationId: representationId(raw.fallbackRepresentationId) } : {}),
    category: raw.category as PresentationCategory,
    humanName: raw.humanName
  };
}

export const LEVEL0_FEATURE_PRESENTATION_REGISTRY: RepresentationRegistrySnapshot = Object.freeze({
  representations: LEVEL0_FEATURE_DEFINITION_SOURCE.representations.map(hydrateDefinition),
  bindings: LEVEL0_FEATURE_DEFINITION_SOURCE.bindings.map(hydrateBinding)
});

export function semanticTargetForPropKind(kind: string): SemanticPresentationTargetId | undefined {
  if (kind === 'bucket') return MEDIUM_BUCKET_TARGET;
  if (kind === 'paint-can') return SMALL_GREY_OPEN_PAINT_CAN_TARGET;
  return undefined;
}
