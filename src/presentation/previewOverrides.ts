import { PROJECT_PRESENTATION_REGISTRY } from './projectPresentationRegistry.js';
import { resolveRepresentation, withRepresentationBinding } from './registry.js';
import type { PresentationValue, RepresentationDefinition, RepresentationId, ResolvedRepresentation, SemanticPresentationTargetId } from './types.js';

const parameterOverrides = new Map<SemanticPresentationTargetId, Readonly<Record<string, PresentationValue>>>();
const bindingOverrides = new Map<SemanticPresentationTargetId, RepresentationId>();

export interface PresentationPreviewSnapshot {
  parameters: Readonly<Record<string, Readonly<Record<string, PresentationValue>>>>;
  bindings: Readonly<Record<string, RepresentationId>>;
}

export function setPresentationPreviewParameters(target: SemanticPresentationTargetId, patch: Readonly<Record<string, PresentationValue>>): void {
  parameterOverrides.set(target, Object.freeze({ ...(parameterOverrides.get(target) ?? {}), ...patch }));
}

export function setPresentationPreviewBinding(target: SemanticPresentationTargetId, representation: RepresentationId): void {
  bindingOverrides.set(target, representation);
}

export function clearPresentationPreview(target: SemanticPresentationTargetId): void {
  parameterOverrides.delete(target);
  bindingOverrides.delete(target);
}

export function clearAllPresentationPreviews(): void {
  parameterOverrides.clear();
  bindingOverrides.clear();
}

export function presentationPreviewParameters(target: SemanticPresentationTargetId): Readonly<Record<string, PresentationValue>> {
  return parameterOverrides.get(target) ?? {};
}

export function presentationPreviewSnapshot(): PresentationPreviewSnapshot {
  return {
    parameters: Object.fromEntries([...parameterOverrides].map(([target, values]) => [target, values])),
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
  const overrides = parameterOverrides.get(target);
  if (!overrides || Object.keys(overrides).length === 0) return resolved;
  return {
    ...resolved,
    definition: {
      ...resolved.definition,
      parameters: Object.freeze({ ...resolved.definition.parameters, ...overrides })
    }
  };
}
