import {
  representationId,
  type RepresentationBinding,
  type RepresentationDefinition,
  type RepresentationId,
  type RepresentationRegistrySnapshot,
  type ResolvedRepresentation,
  type SemanticPresentationTargetId
} from './types.js';

export const SAFE_DEBUG_REPRESENTATION_ID = representationId('debug.neutral');

export function validateRepresentationRegistry(snapshot: RepresentationRegistrySnapshot): string[] {
  const errors: string[] = [];
  const representationIds = new Set<RepresentationId>();
  for (const definition of snapshot.representations) {
    if (representationIds.has(definition.id)) errors.push(`Duplicate Representation ID ${definition.id}`);
    representationIds.add(definition.id);
  }
  const bindingIds = new Set<SemanticPresentationTargetId>();
  for (const binding of snapshot.bindings) {
    if (bindingIds.has(binding.semanticTargetId)) errors.push(`Duplicate Representation Binding ${binding.semanticTargetId}`);
    bindingIds.add(binding.semanticTargetId);
    if (!representationIds.has(binding.representationId) && !binding.fallbackRepresentationId) {
      errors.push(`Binding ${binding.semanticTargetId} targets missing representation ${binding.representationId} without fallback`);
    }
  }
  for (const definition of snapshot.representations) {
    if (definition.fallback && !representationIds.has(definition.fallback)) errors.push(`Representation ${definition.id} fallback ${definition.fallback} is not defined`);
  }
  return errors;
}

export function resolveRepresentation(
  semanticTargetId: SemanticPresentationTargetId,
  snapshot: RepresentationRegistrySnapshot,
  available: (definition: RepresentationDefinition) => boolean = () => true
): ResolvedRepresentation | undefined {
  const binding = snapshot.bindings.find((candidate) => candidate.semanticTargetId === semanticTargetId);
  if (!binding) return undefined;
  const byId = new Map(snapshot.representations.map((definition) => [definition.id, definition]));
  const requestedRepresentationId = binding.representationId;
  const warnings: string[] = [];
  const seen = new Set<RepresentationId>();
  let current: RepresentationId | undefined = binding.representationId;
  let fallbackDepth = 0;
  while (current && !seen.has(current)) {
    seen.add(current);
    const definition = byId.get(current);
    if (definition && available(definition)) {
      return { binding, definition, requestedRepresentationId, fallbackDepth, warnings };
    }
    warnings.push(definition ? `Representation ${current} unavailable` : `Representation ${current} missing`);
    current = definition?.fallback ?? (fallbackDepth === 0 ? binding.fallbackRepresentationId : undefined);
    fallbackDepth += 1;
  }
  const debug = byId.get(SAFE_DEBUG_REPRESENTATION_ID);
  if (debug && available(debug)) {
    warnings.push(`Resolved ${semanticTargetId} to safe debug representation`);
    return { binding, definition: debug, requestedRepresentationId, fallbackDepth, warnings };
  }
  return undefined;
}

export function withRepresentationBinding(
  snapshot: RepresentationRegistrySnapshot,
  semanticTargetId: SemanticPresentationTargetId,
  representation: RepresentationId,
  fallbackRepresentationId?: RepresentationId
): RepresentationRegistrySnapshot {
  return {
    representations: snapshot.representations,
    bindings: snapshot.bindings.map((binding): RepresentationBinding => binding.semanticTargetId === semanticTargetId
      ? {
        ...binding,
        representationId: representation,
        fallbackRepresentationId: fallbackRepresentationId ?? binding.representationId
      }
      : binding)
  };
}
