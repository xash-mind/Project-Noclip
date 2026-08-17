import type { DevelopmentContext } from './developmentContext.js';
import { serializeDevelopmentContext } from './developmentContext.js';

export type DevelopmentMode = 'LOOK' | 'AUDIT' | 'CHANGE';

function linesForRecord(record: Readonly<Record<string, unknown>>): string[] {
  return Object.entries(record).map(([key, value]) => `${key}: ${String(value)}`);
}

export function formatDevelopmentContext(context: DevelopmentContext, mode: DevelopmentMode = 'CHANGE'): string {
  const instance = context.runtimeInstance;
  const chunks = [
    'PROJECT NOCLIP DEVELOPMENT CONTEXT',
    '',
    `SCHEMA\n${context.schema}`,
    `MODE\n${mode}`,
    `PROJECT\n${context.project.repository}${context.project.branchOrRef ? `\nref: ${context.project.branchOrRef}` : ''}`,
    `TARGET\n${context.designTarget.humanName}\nsemantic: ${context.designTarget.semanticTargetId}\ncategory: ${context.designTarget.category}`
  ];
  if (instance) chunks.push(`INSTANCE\n${instance.stableRuntimeId}\nseed: ${instance.worldSeed}\ngeneration: ${instance.generationVersion}\nRegion: ${instance.regionId}\nConditions: ${instance.conditionIds?.join(', ') || 'none'}\nCell: ${instance.cell.id} (${instance.cell.x}, ${instance.cell.z})\nposition: ${instance.worldPosition.x}, ${instance.worldPosition.y}, ${instance.worldPosition.z}`);
  chunks.push(
    `PRESENTATION\nRepresentation: ${context.representation.id}\nBinding: ${context.representation.binding.semanticTargetId} -> ${context.representation.binding.representationId}\nGeometry: ${context.representation.geometryId ?? 'not PAU-migrated'}\nMaterials: ${context.representation.materialIds.join(', ') || 'none'}\nAssets: ${context.representation.assetIds.join(', ') || 'none'}\nLCG: ${context.representation.lcg ?? 'n/a'}\nCollision: ${context.representation.collisionMode}\nFallback: ${context.representation.fallback ?? 'none'}`,
    `CURRENT EDITABLE VALUES\n${linesForRecord(context.representation.canonicalValues).join('\n') || 'none'}`,
    `PREVIEW OVERRIDES\n${linesForRecord(context.representation.activePreviewOverrides).join('\n') || 'none'}`,
    `SOURCE OWNERSHIP\ndefinition: ${context.ownership.definitionModule}\n${context.ownership.sourcePaths.join('\n')}`,
    `RELEVANT TESTS\n${context.ownership.relevantTests.join('\n') || 'none'}`,
    `INVARIANTS\n${context.invariants.join('\n')}`,
    `DIAGNOSTICS\n${[...context.diagnostics, ...context.validationWarnings].join('\n') || 'none'}`
  );
  if (context.userObservation) chunks.push(`USER OBSERVATION\n${context.userObservation}`);
  if (context.requestedChange) chunks.push(`REQUEST\n${context.requestedChange}`);
  return chunks.join('\n\n');
}

export function fullDevelopmentPrompt(context: DevelopmentContext, mode: DevelopmentMode = 'CHANGE'): string {
  return `PROJECT NOCLIP — LOCALIZED DEVELOPMENT HANDOFF\n\nWork on: ${context.project.repository}\n\nMODE: ${mode}\n\nFreshly reconcile the selected target against current repository reality before editing. Use the DevelopmentContext below as structured starting evidence, not as permission to skip current code inspection. Preserve all listed invariants. Keep world identity, deterministic generation, topology, stable IDs and save identity unchanged unless the request explicitly requires a world-law change.\n\nDo not merge. Do not production deploy.\n\n${formatDevelopmentContext(context, mode)}\n\nVALIDATION\nRun the target-relevant tests first. Run broader typecheck/tests/build only where proportional to the final change. Never claim validation that was not executed.`;
}

export function developmentContextJson(context: DevelopmentContext): string {
  return serializeDevelopmentContext(context);
}
