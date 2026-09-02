import type { CellDescriptor, GenerationVersion, ZoneId } from './types.js';

/** Persisted pre-GenerationVersion and non-Gen3 values remain frozen Gen2. */
export function generationVersionFromPersisted(value: unknown): GenerationVersion {
  return value === 'gen3-v1' ? 'gen3-v1' : 'gen2';
}

/** Runtime/generation guard for the supported frozen Gen2 compatibility path. */
export function isGen2Compatibility(version: GenerationVersion | undefined): version is 'gen2' {
  return version === 'gen2';
}

/** Legacy Zone identity is read only for a proven Gen2 descriptor. */
export function gen2ZoneForCell(descriptor: CellDescriptor): ZoneId {
  if (!isGen2Compatibility(descriptor.world.generationVersion)) {
    throw new Error('Gen2 Zone compatibility requested for a non-Gen2 Cell');
  }
  return descriptor.address.zoneId;
}
