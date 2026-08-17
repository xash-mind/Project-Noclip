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
  { semanticTargetId: 'architecture.a-a1', representationId: 'legacy.a-a1', humanName: 'A-A1 — Arch Divider', category: 'Architecture Pattern', sourcePaths: ['src/world/gen3SpaceTopologyBuild.ts','src/world/gen3ArchitectureCore.ts','src/renderer/level0RegionPresentation.ts','src/renderer/level0SurfacePresentation.ts'], relevantTests: ['tests/arch-streaming-change.test.mjs'], diagnostics: ['Read-only Studio metadata: A-A1 is not yet PAU-migrated for structured authoring.'] },
  { semanticTargetId: 'architecture.p-a1', representationId: 'legacy.p-a1', humanName: 'P-A1 — Pillar Pier', category: 'Architecture Pattern', sourcePaths: ['src/world/gen3ArchitectureCore.ts','src/world/gen3SpaceTopologyBuild.ts','src/renderer/level0SurfacePresentation.ts','src/renderer/level0Wallpaper.ts'], relevantTests: ['tests/presentation-corrections.test.mjs'], diagnostics: ['Read-only Studio metadata: P-A1 remains renderer-owned presentation.'] },
  { semanticTargetId: 'material.level-0-wallpaper', representationId: 'legacy.m-w1', humanName: 'M-W1 — Level 0 Wallpaper', category: 'Material', sourcePaths: ['src/renderer/level0Wallpaper.ts','src/renderer/level0SurfacePresentation.ts'], relevantTests: ['tests/gen3-world-laws.test.mjs'], diagnostics: ['Read-only Studio metadata: wallpaper source/material binding is not yet PAU-migrated.'] },
  { semanticTargetId: 'material.arch-pale-wallpaper', representationId: 'legacy.m-a1', humanName: 'M-A1 — Arch Pale Wallpaper', category: 'Material', sourcePaths: ['src/world/gen3SpaceTopologyBuild.ts','src/renderer/level0SurfacePresentation.ts'], relevantTests: ['tests/arch-streaming-change.test.mjs'], diagnostics: ['Read-only Studio metadata: Arch finish is not yet PAU-migrated.'] },
  { semanticTargetId: 'material.level-0-carpet', representationId: 'legacy.m-c1', humanName: 'M-C1 — Level 0 Carpet', category: 'Material', sourcePaths: ['src/renderer/level0SurfacePresentation.ts','src/renderer/level0RegionPresentation.ts'], relevantTests: ['tests/level0-visual-presentation.test.mjs'], diagnostics: ['Read-only Studio metadata: carpet presentation is not yet PAU-migrated.'] },
  { semanticTargetId: 'material.level-0-ceiling', representationId: 'legacy.m-ce1', humanName: 'M-CE1 — Level 0 Ceiling', category: 'Material', sourcePaths: ['src/renderer/level0SurfacePresentation.ts'], relevantTests: ['tests/level0-visual-presentation.test.mjs'], diagnostics: ['Read-only Studio metadata: ceiling presentation is not yet PAU-migrated.'] },
  { semanticTargetId: 'material.fluorescent-panel', representationId: 'legacy.m-f1', humanName: 'M-F1 — Fluorescent Panel', category: 'Material', sourcePaths: ['src/world/lighting.ts','src/renderer/fixtureLighting.ts','src/renderer/level0SurfacePresentation.ts','src/audio/Ambience.ts'], relevantTests: ['tests/lighting-finalization.test.mjs'], diagnostics: ['Read-only Studio metadata: fixture lighting/audio remain outside structured PAU authoring.'] },
  { semanticTargetId: 'condition.blackout', representationId: 'legacy.c-b1', humanName: 'C-B1 — Blackout', category: 'Condition', sourcePaths: ['src/world/gen3.ts','src/world/lighting.ts','src/renderer/fixtureLighting.ts','src/app/ProjectNoclipGame.ts'], relevantTests: ['tests/gen3-world-laws.test.mjs','tests/lighting-finalization.test.mjs'], diagnostics: ['Read-only Studio metadata: Blackout is a world Condition, not a presentation slider surface.'] },
  { semanticTargetId: 'carver.floor-hole-cluster', representationId: 'legacy.cv-h1', humanName: 'CV-H1 — Floor-hole Cluster', category: 'Carver', sourcePaths: ['src/world/gen3.ts','src/world/generator.ts','src/renderer/level0RegionPresentation.ts'], relevantTests: ['tests/gen3-world-laws.test.mjs','tests/level0-visual-presentation.test.mjs'], diagnostics: ['Read-only Studio metadata: CV-H1 generation is world-owned; only future PAU presentation fields may become editable.'] },
  { semanticTargetId: 'subsystem.nal', representationId: 'studio.nal', humanName: 'NAL — Noclip Asset Library', category: 'renderer/runtime subsystem', sourcePaths: ['src/presentation/assets.ts','assets/definitions','assets/source','scripts/build-assets.mjs'], relevantTests: ['tests/presentation-architecture.test.mjs','tests/studio-foundation.test.mjs'], diagnostics: ['Studio asset authoring surface; this target is development metadata, not generated world identity.'] }
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
