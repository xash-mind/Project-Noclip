import { PROJECT_PRESENTATION_REGISTRY } from './projectPresentationRegistry.js';
import { resolveRepresentation, withRepresentationBinding } from './registry.js';
import { assetId, type AssetId, type PresentationValue, type RepresentationDefinition, type RepresentationId, type ResolvedRepresentation, type SemanticPresentationTargetId } from './types.js';

const parameterOverrides = new Map<SemanticPresentationTargetId, Readonly<Record<string, PresentationValue>>>();
const assetSlotOverrides = new Map<SemanticPresentationTargetId, Readonly<Record<string, AssetId | null>>>();
const bindingOverrides = new Map<SemanticPresentationTargetId, RepresentationId>();

export interface PresentationPreviewSnapshot {
  parameters: Readonly<Record<string, Readonly<Record<string, PresentationValue>>>>;
  assetSlots: Readonly<Record<string, Readonly<Record<string, string>>>>;
  bindings: Readonly<Record<string, RepresentationId>>;
}

export function setPresentationPreviewParameters(target: SemanticPresentationTargetId, patch: Readonly<Record<string, PresentationValue>>): void {
  parameterOverrides.set(target, Object.freeze({ ...(parameterOverrides.get(target) ?? {}), ...patch }));
}

export function setPresentationPreviewAssetSlots(target: SemanticPresentationTargetId, patch: Readonly<Record<string, string>>): void {
  assetSlotOverrides.set(target, Object.freeze({
    ...(assetSlotOverrides.get(target) ?? {}),
    ...Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, value === '' ? null : assetId(value)]))
  }));
}

export function setPresentationPreviewBinding(target: SemanticPresentationTargetId, representation: RepresentationId): void {
  bindingOverrides.set(target, representation);
}

export function clearPresentationPreview(target: SemanticPresentationTargetId): void {
  parameterOverrides.delete(target);
  assetSlotOverrides.delete(target);
  bindingOverrides.delete(target);
}

export function clearAllPresentationPreviews(): void {
  parameterOverrides.clear();
  assetSlotOverrides.clear();
  bindingOverrides.clear();
}

export function presentationPreviewParameters(target: SemanticPresentationTargetId): Readonly<Record<string, PresentationValue>> {
  return parameterOverrides.get(target) ?? {};
}

export function presentationPreviewAssetSlots(target: SemanticPresentationTargetId): Readonly<Record<string, string>> {
  return Object.fromEntries(Object.entries(assetSlotOverrides.get(target) ?? {}).map(([key, value]) => [key, value ?? '']));
}

export function presentationPreviewSnapshot(): PresentationPreviewSnapshot {
  return {
    parameters: Object.fromEntries([...parameterOverrides].map(([target, values]) => [target, values])),
    assetSlots: Object.fromEntries([...assetSlotOverrides].map(([target, values]) => [target, Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value ?? '']))])),
    bindings: Object.fromEntries(bindingOverrides)
  };
}

export function resolvePreviewRepresentation(
  target: SemanticPresentationTargetId,
  available: (definition: RepresentationDefinition) => boolean = () => true
): ResolvedRepresentation | undefined {
  const binding = bindingOverrides.get(target);
  const snapshot = binding ? withRepresentationBinding(PROJECT_PRESENTATION_REGISTRY, target, binding) : PROJECT_PRESENTATION_REGISTRY;
  const resolved = resolveRepresentation(target, snapshot, available);
  if (!resolved) return undefined;
  const parameterPatch = parameterOverrides.get(target);
  const assetPatch = assetSlotOverrides.get(target);
  if ((!parameterPatch || Object.keys(parameterPatch).length === 0) && (!assetPatch || Object.keys(assetPatch).length === 0)) return resolved;
  const assetSlots = resolved.definition.assetSlots?.map((slot) => {
    if (!assetPatch || !(slot.key in assetPatch)) return slot;
    const override = assetPatch[slot.key];
    if (override === null) {
      const { assetId: _assetId, ...withoutAsset } = slot;
      return withoutAsset;
    }
    return override ? { ...slot, assetId: override } : slot;
  });
  const assetIds = assetSlots
    ? [...new Set(assetSlots.flatMap((slot) => slot.assetId ? [slot.assetId] : []))]
    : resolved.definition.assetIds;
  return {
    ...resolved,
    definition: {
      ...resolved.definition,
      parameters: Object.freeze({ ...resolved.definition.parameters, ...(parameterPatch ?? {}) }),
      ...(assetSlots ? { assetSlots } : {}),
      assetIds
    }
  };
}
