import { geometryId, presentationMaterialId, representationId, semanticPresentationTargetId, type RepresentationDefinition, type RepresentationRegistrySnapshot, type SemanticPresentationTargetId } from './types.js';

export const MEDIUM_BUCKET_TARGET = semanticPresentationTargetId('feature.medium-bucket');
export const SMALL_GREY_OPEN_PAINT_CAN_TARGET = semanticPresentationTargetId('feature.small-grey-open-paint-can');

const DEBUG: RepresentationDefinition = {
  id: representationId('debug.neutral'),
  humanName: 'Safe debug representation',
  category: 'Feature',
  geometryId: geometryId('geometry.box'),
  materialIds: [presentationMaterialId('material.debug.neutral')],
  assetIds: [],
  parameters: {},
  editableParameters: [],
  lcg: { classification: 'LCG-0', rationale: 'Safe visible fallback used only when canonical/custom presentation cannot resolve.', recommendedTriangles: 12, warningTriangles: 24 },
  collisionMode: 'none',
  owningModule: 'src/presentation/level0FeatureRepresentations.ts',
  sourcePaths: ['src/presentation/level0FeatureRepresentations.ts'],
  relevantTests: ['tests/presentation-architecture.test.mjs']
};

const BUCKET: RepresentationDefinition = {
  id: representationId('bucket.default'),
  humanName: 'Medium Bucket — canonical procedural',
  category: 'Feature',
  geometryId: geometryId('geometry.tapered-open-container'),
  materialIds: [presentationMaterialId('material.bucket.aged-neutral'), presentationMaterialId('material.bucket.handle')],
  assetIds: [],
  parameters: {
    segments: 12,
    rimHeightRatio: 0.055,
    topRadiusRatio: 0.455,
    bottomRadiusScale: 0.82,
    outerRimRatio: 0.49,
    innerRimRatio: 0.40,
    interiorDepthRatio: 0.16,
    handleWidthRatio: 0.72,
    handleHeightRatio: 0.34
  },
  editableParameters: [
    { key: 'segments', label: 'Circumference segments', kind: 'number', unit: 'count', min: 8, max: 24, step: 1, description: 'Use the lowest count that preserves the intended silhouette.' },
    { key: 'topRadiusRatio', label: 'Upper radius', kind: 'number', unit: 'ratio', min: 0.40, max: 0.49, step: 0.005 },
    { key: 'bottomRadiusScale', label: 'Lower taper', kind: 'number', unit: 'ratio', min: 0.70, max: 1, step: 0.01 },
    { key: 'rimHeightRatio', label: 'Rim height', kind: 'number', unit: 'ratio', min: 0.035, max: 0.09, step: 0.005 }
  ],
  lcg: { classification: 'LCG-2', rationale: 'Small curved silhouette needs controlled segmentation, an open top, deliberate hard rim and smooth circumference.', recommendedTriangles: 180, warningTriangles: 320 },
  collisionMode: 'none',
  fallback: representationId('debug.neutral'),
  owningModule: 'src/presentation/level0FeatureRepresentations.ts',
  sourcePaths: ['src/presentation/level0FeatureRepresentations.ts', 'src/presentation/geometry.ts', 'src/renderer/level0FeaturePresentation.ts'],
  relevantTests: ['tests/presentation-architecture.test.mjs', 'tests/arch-streaming-change.test.mjs']
};

const PAINT_CAN: RepresentationDefinition = {
  id: representationId('paint-can.grey-open'),
  humanName: 'Small Grey Open Paint Can — canonical procedural',
  category: 'Feature',
  geometryId: geometryId('geometry.tapered-open-container'),
  materialIds: [presentationMaterialId('material.paint-can.grey'), presentationMaterialId('material.paint-can.label-residue')],
  assetIds: [],
  parameters: {
    segments: 12,
    rimHeightRatio: 0.055,
    topRadiusRatio: 0.455,
    bottomRadiusScale: 0.98,
    outerRimRatio: 0.49,
    innerRimRatio: 0.405,
    interiorDepthRatio: 0.14,
    labelWidthRatio: 0.46,
    labelHeightRatio: 0.33
  },
  editableParameters: [
    { key: 'segments', label: 'Circumference segments', kind: 'number', unit: 'count', min: 8, max: 24, step: 1, description: 'Use the lowest count that preserves the intended silhouette.' },
    { key: 'topRadiusRatio', label: 'Upper radius', kind: 'number', unit: 'ratio', min: 0.42, max: 0.49, step: 0.005 },
    { key: 'bottomRadiusScale', label: 'Body taper', kind: 'number', unit: 'ratio', min: 0.9, max: 1, step: 0.01 },
    { key: 'rimHeightRatio', label: 'Rim height', kind: 'number', unit: 'ratio', min: 0.035, max: 0.09, step: 0.005 }
  ],
  lcg: { classification: 'LCG-2', rationale: 'Small cylindrical silhouette needs a clean open rim and smooth circumference without decorative modelling.', recommendedTriangles: 180, warningTriangles: 320 },
  collisionMode: 'none',
  fallback: representationId('debug.neutral'),
  owningModule: 'src/presentation/level0FeatureRepresentations.ts',
  sourcePaths: ['src/presentation/level0FeatureRepresentations.ts', 'src/presentation/geometry.ts', 'src/renderer/level0FeaturePresentation.ts'],
  relevantTests: ['tests/presentation-architecture.test.mjs', 'tests/arch-streaming-change.test.mjs']
};

export const LEVEL0_FEATURE_PRESENTATION_REGISTRY: RepresentationRegistrySnapshot = {
  representations: [BUCKET, PAINT_CAN, DEBUG],
  bindings: [
    { semanticTargetId: MEDIUM_BUCKET_TARGET, representationId: BUCKET.id, fallbackRepresentationId: DEBUG.id, category: 'Feature', humanName: 'Medium Bucket' },
    { semanticTargetId: SMALL_GREY_OPEN_PAINT_CAN_TARGET, representationId: PAINT_CAN.id, fallbackRepresentationId: DEBUG.id, category: 'Feature', humanName: 'Small Grey Open Paint Can' }
  ]
};

export function semanticTargetForPropKind(kind: string): SemanticPresentationTargetId | undefined {
  if (kind === 'bucket') return MEDIUM_BUCKET_TARGET;
  if (kind === 'paint-can') return SMALL_GREY_OPEN_PAINT_CAN_TARGET;
  return undefined;
}
