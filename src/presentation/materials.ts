import { presentationMaterialId, type PresentationMaterialId } from './types.js';

export type PresentationTextureKind = 'wall' | 'carpet' | 'ceiling' | 'wood' | 'concrete' | 'paper';

export interface PresentationMaterialDefinition {
  id: PresentationMaterialId;
  humanName: string;
  diffuse: readonly [number, number, number];
  textureKind?: PresentationTextureKind;
  variant: number;
  tiling: readonly [number, number];
  emissive?: readonly [number, number, number];
  emissiveIntensity?: number;
}

const DEFINITIONS: readonly PresentationMaterialDefinition[] = [
  { id: presentationMaterialId('material.bucket.aged-neutral'), humanName: 'Bucket — aged neutral', diffuse: [0.37, 0.35, 0.29], textureKind: 'concrete', variant: 0, tiling: [1, 1] },
  { id: presentationMaterialId('material.bucket.handle'), humanName: 'Bucket — handle metal', diffuse: [0.24, 0.24, 0.21], textureKind: 'concrete', variant: 0, tiling: [1, 1] },
  { id: presentationMaterialId('material.paint-can.grey'), humanName: 'Paint can — grey', diffuse: [0.46, 0.47, 0.45], textureKind: 'concrete', variant: 0, tiling: [1, 1] },
  { id: presentationMaterialId('material.paint-can.label-residue'), humanName: 'Paint can — label residue', diffuse: [0.57, 0.56, 0.49], textureKind: 'paper', variant: 0, tiling: [1, 1] },
  { id: presentationMaterialId('material.debug.neutral'), humanName: 'Debug neutral', diffuse: [0.5, 0.1, 0.5], variant: 0, tiling: [1, 1] }
];

export const PRESENTATION_MATERIALS: ReadonlyMap<PresentationMaterialId, PresentationMaterialDefinition> = new Map(DEFINITIONS.map((definition) => [definition.id, definition]));

export function presentationMaterial(id: PresentationMaterialId): PresentationMaterialDefinition {
  const definition = PRESENTATION_MATERIALS.get(id);
  if (!definition) return PRESENTATION_MATERIALS.get(presentationMaterialId('material.debug.neutral'))!;
  return definition;
}
