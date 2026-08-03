import { stableId } from './hash.js';
import type { ExitDescriptor, LocalPoint } from './types.js';

export interface ExitDefinition {
  destinationId: string;
  label: string;
  trigger: ExitDescriptor['trigger'];
  minimumWorldDay: number;
  minimumExposure: number;
  fixedCell?: [number, number];
  enabled: boolean;
}

export const EXIT_REGISTRY: readonly ExitDefinition[] = [
  { destinationId: 'level-1', label: 'Garage-like transition', trigger: 'gradual', minimumWorldDay: 0, minimumExposure: 0, fixedCell: [5, 0], enabled: true },
  { destinationId: 'level-2', label: 'Manila departure', trigger: 'manila-wait', minimumWorldDay: 0, minimumExposure: 0, fixedCell: [3, -2], enabled: true },
  { destinationId: 'level-27', label: 'Carpet breach', trigger: 'floor-breach', minimumWorldDay: 7, minimumExposure: 2, fixedCell: [-5, 2], enabled: true },
  { destinationId: 'level-483', label: 'Weak wall breach', trigger: 'wall-breach', minimumWorldDay: 7, minimumExposure: 2, fixedCell: [2, 6], enabled: true },
  { destinationId: 'level-13', label: 'Greenhouse doors', trigger: 'greenhouse-door', minimumWorldDay: 14, minimumExposure: 3, fixedCell: [-7, -2], enabled: true },
  { destinationId: 'level-14', label: 'Emergency exit', trigger: 'emergency-door', minimumWorldDay: 14, minimumExposure: 3, fixedCell: [7, 4], enabled: true },
  { destinationId: 'void', label: 'Unresolved floor failure', trigger: 'floor-breach', minimumWorldDay: 28, minimumExposure: 5, enabled: false },
  { destinationId: 'level-0.22', label: 'Second Attempt', trigger: 'emergency-door', minimumWorldDay: 21, minimumExposure: 4, enabled: false },
  { destinationId: 'level-0.23', label: 'Next Project', trigger: 'emergency-door', minimumWorldDay: 21, minimumExposure: 4, enabled: false },
  { destinationId: 'level-0.99', label: 'Deep-distance fracture', trigger: 'anomalous-wall', minimumWorldDay: 28, minimumExposure: 5, enabled: false },
  { destinationId: 'red-rooms', label: 'Crimson contamination', trigger: 'gradual', minimumWorldDay: 28, minimumExposure: 5, enabled: false }
] as const;

export function exitsForCell(seed: string, cellX: number, cellZ: number, worldDay: number, exposure: number, gateBypass: boolean): ExitDescriptor[] {
  const localPosition: LocalPoint = { x: 0, y: 1.1, z: -5.8 };
  return EXIT_REGISTRY.filter((definition) => definition.fixedCell?.[0] === cellX && definition.fixedCell?.[1] === cellZ)
    .map((definition) => ({
      id: stableId('exit', seed, cellX, cellZ, definition.destinationId),
      destinationId: definition.destinationId,
      label: definition.label,
      trigger: definition.trigger,
      localPosition,
      minimumWorldDay: definition.minimumWorldDay,
      minimumExposure: definition.minimumExposure,
      enabled: definition.enabled && (gateBypass || (worldDay >= definition.minimumWorldDay && exposure >= definition.minimumExposure))
    }));
}

export function validateExitRegistry(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const definition of EXIT_REGISTRY) {
    if (ids.has(definition.destinationId)) errors.push(`Duplicate destination: ${definition.destinationId}`);
    ids.add(definition.destinationId);
    if (definition.minimumWorldDay < 0 || definition.minimumExposure < 0) errors.push(`Negative gate: ${definition.destinationId}`);
  }
  return errors;
}
