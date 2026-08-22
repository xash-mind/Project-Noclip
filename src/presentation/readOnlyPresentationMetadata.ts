import {
  representationId,
  semanticPresentationTargetId,
  type PresentationCategory,
  type RepresentationBinding,
  type RepresentationDefinition,
  type RepresentationRegistrySnapshot
} from './types.js';

interface ReadOnlyTargetSpec {
  semanticTargetId: string;
  representationId: string;
  humanName: string;
  category: PresentationCategory;
  sourcePaths: readonly string[];
  relevantTests: readonly string[];
  diagnostics: readonly string[];
}

const READ_ONLY_TARGETS: readonly ReadOnlyTargetSpec[] = [
  {
    semanticTargetId: 'architecture.a-a1',
    representationId: 'legacy.a-a1',
    humanName: 'A-A1 — Arch Divider',
    category: 'Architecture Pattern',
    sourcePaths: ['src/world/gen3SpaceTopologyBuild.ts','src/world/gen3ArchitectureCore.ts','src/renderer/level0RegionPresentation.ts','src/renderer/level0SurfacePresentation.ts'],
    relevantTests: ['tests/arch-streaming-change.test.mjs'],
    diagnostics: ['Read-only Studio metadata: A-A1 geometry/topology remains code-owned. Its safe visual finish is authored through M-A1.']
  },
  {
    semanticTargetId: 'architecture.p-a1',
    representationId: 'legacy.p-a1',
    humanName: 'P-A1 — Pillar Pier',
    category: 'Architecture Pattern',
    sourcePaths: ['src/world/gen3ArchitectureCore.ts','src/world/gen3SpaceTopologyBuild.ts','src/renderer/level0SurfacePresentation.ts','src/renderer/level0Wallpaper.ts'],
    relevantTests: ['tests/presentation-corrections.test.mjs'],
    diagnostics: ['Read-only Studio metadata: P-A1 geometry/placement remains world-owned. Its wallpaper-bearing surfaces consume M-W1.']
  },
  {
    semanticTargetId: 'condition.blackout',
    representationId: 'legacy.c-b1',
    humanName: 'C-B1 — Blackout',
    category: 'Condition',
    sourcePaths: ['src/world/gen3.ts','src/world/lighting.ts','src/renderer/fixtureLighting.ts','src/app/ProjectNoclipGame.ts'],
    relevantTests: ['tests/gen3-world-laws.test.mjs','tests/lighting-finalization.test.mjs'],
    diagnostics: ['Read-only Studio metadata: Blackout is a world Condition. Dev.9.6 does not expose its world law as material sliders.']
  },
  {
    semanticTargetId: 'subsystem.nal',
    representationId: 'studio.nal',
    humanName: 'NAL — Noclip Asset Library',
    category: 'renderer/runtime subsystem',
    sourcePaths: ['src/presentation/assets.ts','assets/definitions','assets/source','scripts/build-assets.mjs'],
    relevantTests: ['tests/presentation-architecture.test.mjs','tests/studio-foundation.test.mjs'],
    diagnostics: ['Studio asset authoring surface; this target is development metadata, not generated world identity.']
  }
];

function definition(spec: ReadOnlyTargetSpec): RepresentationDefinition {
  return {
    id: representationId(spec.representationId),
    humanName: `${spec.humanName} — current implementation`,
    category: spec.category,
    materialIds: [],
    assetIds: [],
    parameters: {},
    editableParameters: [],
    collisionMode: 'none',
    owningModule: 'src/presentation/readOnlyPresentationMetadata.ts',
    sourcePaths: spec.sourcePaths,
    relevantTests: spec.relevantTests,
    diagnostics: spec.diagnostics
  };
}

function binding(spec: ReadOnlyTargetSpec): RepresentationBinding {
  return {
    semanticTargetId: semanticPresentationTargetId(spec.semanticTargetId),
    representationId: representationId(spec.representationId),
    category: spec.category,
    humanName: spec.humanName
  };
}

export const READ_ONLY_PRESENTATION_REGISTRY: RepresentationRegistrySnapshot = Object.freeze({
  representations: READ_ONLY_TARGETS.map(definition),
  bindings: READ_ONLY_TARGETS.map(binding)
});
