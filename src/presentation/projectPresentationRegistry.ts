import { LEVEL0_FEATURE_PRESENTATION_REGISTRY } from './level0FeatureRepresentations.js';
import { READ_ONLY_PRESENTATION_REGISTRY } from './readOnlyPresentationMetadata.js';
import { validateRepresentationRegistry } from './registry.js';
import type { RepresentationRegistrySnapshot } from './types.js';

export const PROJECT_PRESENTATION_REGISTRY: RepresentationRegistrySnapshot = Object.freeze({
  representations: [...LEVEL0_FEATURE_PRESENTATION_REGISTRY.representations, ...READ_ONLY_PRESENTATION_REGISTRY.representations],
  bindings: [...LEVEL0_FEATURE_PRESENTATION_REGISTRY.bindings, ...READ_ONLY_PRESENTATION_REGISTRY.bindings]
});

const errors = validateRepresentationRegistry(PROJECT_PRESENTATION_REGISTRY);
if (errors.length > 0) throw new Error(`Invalid Project Noclip presentation registry: ${errors.join('; ')}`);
