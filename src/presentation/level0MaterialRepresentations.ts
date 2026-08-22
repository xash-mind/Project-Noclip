import { LEVEL0_MATERIAL_DEFINITION_SOURCE } from './generatedLevel0MaterialDefinitions.js';
import {
  assetId,
  geometryId,
  presentationMaterialId,
  representationId,
  semanticPresentationTargetId,
  type EditablePresentationAssetSlot,
  type EditablePresentationParameter,
  type LcgProfile,
  type PresentationCategory,
  type PresentationValue,
  type RepresentationBinding,
  type RepresentationDefinition,
  type RepresentationRegistrySnapshot,
  type SemanticPresentationTargetId
} from './types.js';

export const LEVEL0_WALLPAPER_TARGET = semanticPresentationTargetId('material.level-0-wallpaper');
export const ARCH_PALE_WALLPAPER_TARGET = semanticPresentationTargetId('material.arch-pale-wallpaper');
export const LEVEL0_CARPET_TARGET = semanticPresentationTargetId('material.level-0-carpet');
export const LEVEL0_CEILING_TARGET = semanticPresentationTargetId('material.level-0-ceiling');
export const LEVEL0_CASING_TARGET = semanticPresentationTargetId('material.level-0-casing');
export const LEVEL0_OUTLET_TARGET = semanticPresentationTargetId('material.level-0-outlet');
export const FLUORESCENT_PANEL_TARGET = semanticPresentationTargetId('material.fluorescent-panel');
export const CVH1_PRESENTATION_TARGET = semanticPresentationTargetId('carver.floor-hole-cluster');

type RawDefinition = {
  id: string;
  humanName: string;
  category: string;
  geometryId?: string;
  materialIds: readonly string[];
  assetIds: readonly string[];
  assetSlots?: readonly {
    key: string;
    label: string;
    assetType: 'image' | 'audio' | 'mesh';
    profile: string;
    roles: readonly string[];
    assetId?: string;
    optional?: boolean;
    editable: boolean;
    description?: string;
  }[];
  parameters: Readonly<Record<string, PresentationValue>>;
  editableParameters: readonly EditablePresentationParameter[];
  lcg?: LcgProfile;
  collisionMode: RepresentationDefinition['collisionMode'];
  fallback?: string;
  owningModule: string;
  sourcePaths: readonly string[];
  relevantTests: readonly string[];
  diagnostics?: readonly string[];
};
type RawBinding = {
  semanticTargetId: string;
  representationId: string;
  fallbackRepresentationId?: string;
  category: string;
  humanName: string;
};

const SOURCE = LEVEL0_MATERIAL_DEFINITION_SOURCE as unknown as {
  representations: readonly RawDefinition[];
  bindings: readonly RawBinding[];
};

function hydrateDefinition(raw: RawDefinition): RepresentationDefinition {
  const assetSlots: readonly EditablePresentationAssetSlot[] = (raw.assetSlots ?? []).map((slot) => ({
    key: slot.key,
    label: slot.label,
    assetType: slot.assetType,
    profile: slot.profile,
    roles: slot.roles,
    ...(slot.assetId ? { assetId: assetId(slot.assetId) } : {}),
    ...(slot.optional !== undefined ? { optional: slot.optional } : {}),
    editable: slot.editable,
    ...(slot.description ? { description: slot.description } : {})
  }));
  return {
    id: representationId(raw.id),
    humanName: raw.humanName,
    category: raw.category as PresentationCategory,
    ...(raw.geometryId ? { geometryId: geometryId(raw.geometryId) } : {}),
    materialIds: raw.materialIds.map(presentationMaterialId),
    assetIds: raw.assetIds.map(assetId),
    assetSlots,
    parameters: raw.parameters,
    editableParameters: raw.editableParameters,
    ...(raw.lcg ? { lcg: raw.lcg } : {}),
    collisionMode: raw.collisionMode,
    ...(raw.fallback ? { fallback: representationId(raw.fallback) } : {}),
    owningModule: raw.owningModule,
    sourcePaths: raw.sourcePaths,
    relevantTests: raw.relevantTests,
    ...(raw.diagnostics ? { diagnostics: raw.diagnostics } : {})
  };
}

function hydrateBinding(raw: RawBinding): RepresentationBinding {
  return {
    semanticTargetId: semanticPresentationTargetId(raw.semanticTargetId),
    representationId: representationId(raw.representationId),
    ...(raw.fallbackRepresentationId ? { fallbackRepresentationId: representationId(raw.fallbackRepresentationId) } : {}),
    category: raw.category as PresentationCategory,
    humanName: raw.humanName
  };
}

export const LEVEL0_MATERIAL_PRESENTATION_REGISTRY: RepresentationRegistrySnapshot = Object.freeze({
  representations: SOURCE.representations.map(hydrateDefinition),
  bindings: SOURCE.bindings.map(hydrateBinding)
});

export function isLevel0MaterialTarget(value: string): value is SemanticPresentationTargetId {
  return LEVEL0_MATERIAL_PRESENTATION_REGISTRY.bindings.some((binding) => binding.semanticTargetId === value);
}
