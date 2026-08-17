import { stableSerialize } from './stableSerialization.js';
import type { DevelopmentContext } from './developmentContext.js';
import type { AssetId, PresentationValue, RepresentationId } from './types.js';

export const CHANGE_RECEIPT_SCHEMA = 'change-receipt-v1' as const;
export type ChangeMode = 'runtime-preview' | 'structured-project-change' | 'code-patch' | 'representation-rebind' | 'asset-import' | 'asset-replacement';
export type ValidationStatus = 'PASS' | 'PASS WITH GAP' | 'FAIL' | 'UNVERIFIED';

export interface ChangeReceipt {
  schema: typeof CHANGE_RECEIPT_SCHEMA;
  project: { id: 'project-noclip'; repository: 'xash-mind/Project-Noclip'; branchOrRef?: string };
  timestamp: string;
  actor?: { identity: string; tool?: string };
  semanticTarget: DevelopmentContext['designTarget'];
  runtimeInstance?: DevelopmentContext['runtimeInstance'];
  changeMode: ChangeMode;
  beforeValues: Readonly<Record<string, PresentationValue>>;
  afterValues: Readonly<Record<string, PresentationValue>>;
  representationBefore?: RepresentationId;
  representationAfter?: RepresentationId;
  assetIdsBefore: readonly AssetId[];
  assetIdsAfter: readonly AssetId[];
  filesChanged: readonly string[];
  generatedFilesChanged: readonly string[];
  sourceDefinitionsChanged: readonly string[];
  activePreviewState: Readonly<Record<string, PresentationValue>>;
  persisted: boolean;
  validation: readonly { name: string; status: ValidationStatus; detail?: string }[];
  targetedTests: readonly string[];
  typecheck?: ValidationStatus;
  build?: ValidationStatus;
  deterministicIdentity: ValidationStatus;
  saveCompatibility?: ValidationStatus;
  warnings: readonly string[];
  diffSummary: string;
  commitSha?: string;
  prNumber?: number;
  previewReference?: string;
  revert?: { kind: 'values' | 'commit'; reference: string };
}

export interface StructuredPresentationChange {
  timestamp: string;
  mode?: ChangeMode;
  beforeValues: Readonly<Record<string, PresentationValue>>;
  afterValues: Readonly<Record<string, PresentationValue>>;
  representationBefore?: RepresentationId;
  representationAfter?: RepresentationId;
  assetIdsBefore?: readonly AssetId[];
  assetIdsAfter?: readonly AssetId[];
  filesChanged?: readonly string[];
  generatedFilesChanged?: readonly string[];
  sourceDefinitionsChanged?: readonly string[];
  activePreviewState?: Readonly<Record<string, PresentationValue>>;
  persisted: boolean;
  validation?: ChangeReceipt['validation'];
  targetedTests?: readonly string[];
  typecheck?: ValidationStatus;
  build?: ValidationStatus;
  deterministicIdentity?: ValidationStatus;
  saveCompatibility?: ValidationStatus;
  warnings?: readonly string[];
  diffSummary: string;
  actor?: ChangeReceipt['actor'];
  commitSha?: string;
  prNumber?: number;
  previewReference?: string;
  revert?: ChangeReceipt['revert'];
}

export function createChangeReceipt(context: DevelopmentContext, change: StructuredPresentationChange): ChangeReceipt {
  return {
    schema: CHANGE_RECEIPT_SCHEMA,
    project: context.project,
    timestamp: change.timestamp,
    actor: change.actor,
    semanticTarget: context.designTarget,
    runtimeInstance: context.runtimeInstance,
    changeMode: change.mode ?? 'structured-project-change',
    beforeValues: change.beforeValues,
    afterValues: change.afterValues,
    representationBefore: change.representationBefore ?? context.representation.id,
    representationAfter: change.representationAfter ?? context.representation.id,
    assetIdsBefore: change.assetIdsBefore ?? context.representation.assetIds,
    assetIdsAfter: change.assetIdsAfter ?? context.representation.assetIds,
    filesChanged: change.filesChanged ?? [],
    generatedFilesChanged: change.generatedFilesChanged ?? [],
    sourceDefinitionsChanged: change.sourceDefinitionsChanged ?? [],
    activePreviewState: change.activePreviewState ?? {},
    persisted: change.persisted,
    validation: change.validation ?? [],
    targetedTests: change.targetedTests ?? [],
    typecheck: change.typecheck,
    build: change.build,
    deterministicIdentity: change.deterministicIdentity ?? 'UNVERIFIED',
    saveCompatibility: change.saveCompatibility,
    warnings: change.warnings ?? [],
    diffSummary: change.diffSummary,
    commitSha: change.commitSha,
    prNumber: change.prNumber,
    previewReference: change.previewReference,
    revert: change.revert
  };
}

export function serializeChangeReceipt(receipt: ChangeReceipt): string {
  return stableSerialize(receipt);
}
