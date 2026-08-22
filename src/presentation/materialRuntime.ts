import { resolvePreviewRepresentation } from './previewOverrides.js';
import { semanticPresentationTargetId, type EditablePresentationAssetSlot, type PresentationValue, type SemanticPresentationTargetId } from './types.js';

export function materialTarget(value: string): SemanticPresentationTargetId {
  return semanticPresentationTargetId(value);
}

export function resolvedMaterialDefinition(targetId: string) {
  return resolvePreviewRepresentation(materialTarget(targetId))?.definition;
}

export function materialParameter(targetId: string, key: string, fallback: PresentationValue): PresentationValue {
  return resolvedMaterialDefinition(targetId)?.parameters[key] ?? fallback;
}

export function materialNumber(targetId: string, key: string, fallback: number): number {
  const value = materialParameter(targetId, key, fallback);
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function materialBoolean(targetId: string, key: string, fallback: boolean): boolean {
  const value = materialParameter(targetId, key, fallback);
  return typeof value === 'boolean' ? value : fallback;
}

export function materialString(targetId: string, key: string, fallback: string): string {
  const value = materialParameter(targetId, key, fallback);
  return typeof value === 'string' ? value : fallback;
}

export function materialAssetSlot(targetId: string, key: string): EditablePresentationAssetSlot | undefined {
  return resolvedMaterialDefinition(targetId)?.assetSlots?.find((slot) => slot.key === key);
}

export function materialAssetId(targetId: string, key: string): string | undefined {
  return materialAssetSlot(targetId, key)?.assetId;
}

export function hexColor(value: string, fallback: readonly [number, number, number]): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) return [fallback[0], fallback[1], fallback[2]];
  const raw = match[1]!;
  return [
    Number.parseInt(raw.slice(0, 2), 16) / 255,
    Number.parseInt(raw.slice(2, 4), 16) / 255,
    Number.parseInt(raw.slice(4, 6), 16) / 255
  ];
}

export function materialColor(targetId: string, key: string, fallback: readonly [number, number, number]): [number, number, number] {
  return hexColor(materialString(targetId, key, ''), fallback);
}

export function blendColor(base: readonly [number, number, number], tint: readonly [number, number, number], amount: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, amount));
  return [
    base[0] + (tint[0] - base[0]) * t,
    base[1] + (tint[1] - base[1]) * t,
    base[2] + (tint[2] - base[2]) * t
  ];
}
