import { PROJECT_PRESENTATION_REGISTRY } from './projectPresentationRegistry.js';

const SHORT_ADDRESSES: Readonly<Record<string, string>> = Object.freeze({
  'architecture.a-a1': 'A-A1',
  'architecture.p-a1': 'P-A1',
  'material.level-0-wallpaper': 'M-W1',
  'material.arch-pale-wallpaper': 'M-A1',
  'material.level-0-carpet': 'M-C1',
  'material.level-0-ceiling': 'M-CE1',
  'material.fluorescent-panel': 'M-F1',
  'condition.blackout': 'C-B1',
  'carver.floor-hole-cluster': 'CV-H1'
});

export interface StudioTargetMetadata {
  semanticTargetId: string;
  humanName: string;
  category: string;
  representationId: string;
  shortAddress?: string;
  structuredEditable: boolean;
}

export const STUDIO_TARGETS: readonly StudioTargetMetadata[] = PROJECT_PRESENTATION_REGISTRY.bindings
  .filter((binding) => binding.semanticTargetId !== 'subsystem.nal')
  .map((binding) => {
    const definition = PROJECT_PRESENTATION_REGISTRY.representations.find((candidate) => candidate.id === binding.representationId);
    const shortAddress = SHORT_ADDRESSES[binding.semanticTargetId];
    return {
      semanticTargetId: binding.semanticTargetId,
      humanName: binding.humanName,
      category: binding.category,
      representationId: binding.representationId,
      ...(shortAddress ? { shortAddress } : {}),
      structuredEditable: Boolean(definition?.editableParameters.length)
    };
  });
