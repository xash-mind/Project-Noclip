import type { ChangeReceipt } from './changeReceipt.js';
import { serializeChangeReceipt } from './changeReceipt.js';

export function formatChangeReceipt(receipt: ChangeReceipt): string {
  const changes = new Set([...Object.keys(receipt.beforeValues), ...Object.keys(receipt.afterValues)]);
  const changedLines = [...changes].filter((key) => receipt.beforeValues[key] !== receipt.afterValues[key]).map((key) => `${key}: ${String(receipt.beforeValues[key])} -> ${String(receipt.afterValues[key])}`);
  const validation = receipt.validation.map((entry) => `${entry.name}: ${entry.status}${entry.detail ? ` — ${entry.detail}` : ''}`);
  return [
    'PROJECT NOCLIP — CHANGE RECEIPT',
    '',
    `Schema: ${receipt.schema}`,
    `Target: ${receipt.semanticTarget.humanName} (${receipt.semanticTarget.semanticTargetId})`,
    `Mode: ${receipt.changeMode}`,
    `Persisted: ${receipt.persisted ? 'yes' : 'no'}`,
    `Representation: ${receipt.representationBefore ?? 'n/a'} -> ${receipt.representationAfter ?? 'n/a'}`,
    `Changes:\n${changedLines.join('\n') || 'none'}`,
    `Files changed:\n${receipt.filesChanged.join('\n') || 'none'}`,
    `Generated outputs:\n${receipt.generatedFilesChanged.join('\n') || 'none'}`,
    `Validation:\n${validation.join('\n') || 'none executed'}`,
    `Deterministic world identity: ${receipt.deterministicIdentity}`,
    `Save compatibility: ${receipt.saveCompatibility ?? 'UNVERIFIED'}`,
    `Warnings:\n${receipt.warnings.join('\n') || 'none'}`,
    `Diff summary: ${receipt.diffSummary}`
  ].join('\n\n');
}

export function changeReceiptJson(receipt: ChangeReceipt): string {
  return serializeChangeReceipt(receipt);
}
