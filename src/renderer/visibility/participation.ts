export type RendererParticipationState =
  | 'CAMERA_VISIBLE'
  | 'SAFETY_CORE'
  | 'HYSTERESIS_RETAINED'
  | 'PREDICTIVE'
  | 'DISTANCE_FALLBACK'
  | 'NON_PARTICIPATING';

export interface PriorRendererParticipation {
  state: RendererParticipationState;
  lastParticipatingAtMs: number;
}

export interface VisibilityParticipationInput {
  legacyDistanceCells: readonly string[];
  visibilityCells: readonly string[];
  safetyCoreCells: readonly string[];
  predictiveCells: readonly string[];
  loadedCells: readonly string[];
  prior: ReadonlyMap<string, PriorRendererParticipation>;
  nowMs: number;
  fallbackToLegacyDistance: boolean;
  hysteresisMs?: number;
}

export interface VisibilityParticipationCategories {
  both: readonly string[];
  legacyOnly: readonly string[];
  visibilityOnly: readonly string[];
  safetyCore: readonly string[];
  hysteresisRetained: readonly string[];
  predictive: readonly string[];
  distanceFallback: readonly string[];
  nonParticipating: readonly string[];
}

export interface VisibilityParticipationDecision {
  finalParticipatingCells: readonly string[];
  missingRequiredCells: readonly string[];
  stateByCell: Readonly<Record<string, RendererParticipationState>>;
  categories: VisibilityParticipationCategories;
  stateTransitions: number;
}

export const VISIBILITY_PARTICIPATION_PROFILE = Object.freeze({
  safetyCoreRadiusCells: 1,
  hysteresisMs: 500,
  movementThresholdMeters: 0.4,
  minimumUpdateIntervalMs: 50,
  maximumUpdateIntervalMs: 250,
  teleportDiscontinuityMeters: 21,
  predictiveSuppressionAfterDiscontinuityMs: 500,
  snapshotMaxDepth: 32,
  snapshotMaxFrontierStates: 4096
});

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

function difference(left: ReadonlySet<string>, right: ReadonlySet<string>): string[] {
  return [...left].filter((value) => !right.has(value)).sort();
}

function intersection(left: ReadonlySet<string>, right: ReadonlySet<string>): string[] {
  return [...left].filter((value) => right.has(value)).sort();
}

export function createSafetyCoreCellIds(
  currentCellX: number,
  currentCellZ: number,
  allowedCellIds?: ReadonlySet<string>,
  radius = VISIBILITY_PARTICIPATION_PROFILE.safetyCoreRadiusCells
): string[] {
  const result: string[] = [];
  for (let x = currentCellX - radius; x <= currentCellX + radius; x += 1) {
    for (let z = currentCellZ - radius; z <= currentCellZ + radius; z += 1) {
      const id = `${x}:${z}`;
      if (!allowedCellIds || allowedCellIds.has(id)) result.push(id);
    }
  }
  return result.sort();
}

export function visibilityParticipationNeedsDistanceFallback(input: {
  observerCellId: string;
  observerConservative: boolean;
  terminationReason: string;
}): boolean {
  return input.observerCellId === 'outside-scope'
    || input.observerConservative
    || input.terminationReason === 'observer-outside-topology'
    || input.terminationReason === 'max-depth-conservative'
    || input.terminationReason === 'state-budget-conservative';
}

export function visibilityDiscontinuity(
  previous: { x: number; z: number } | undefined,
  next: { x: number; z: number },
  thresholdMeters = VISIBILITY_PARTICIPATION_PROFILE.teleportDiscontinuityMeters
): boolean {
  if (!previous) return false;
  return Math.hypot(next.x - previous.x, next.z - previous.z) >= thresholdMeters;
}

export function decideVisibilityParticipation(input: VisibilityParticipationInput): VisibilityParticipationDecision {
  const hysteresisMs = input.hysteresisMs ?? VISIBILITY_PARTICIPATION_PROFILE.hysteresisMs;
  const legacy = new Set(input.legacyDistanceCells);
  const visible = new Set(input.visibilityCells);
  const safety = new Set(input.safetyCoreCells);
  const predictive = new Set(input.predictiveCells);
  const loaded = new Set(input.loadedCells);
  const stateByCell: Record<string, RendererParticipationState> = {};
  const final = new Set<string>();
  const hysteresisRetained = new Set<string>();
  const distanceFallback = new Set<string>();
  const required = new Set<string>([...visible, ...safety, ...predictive]);
  if (input.fallbackToLegacyDistance) for (const id of legacy) required.add(id);

  for (const id of sortedUnique(new Set([...loaded, ...input.prior.keys()]))) {
    if (!loaded.has(id)) continue;
    let state: RendererParticipationState = 'NON_PARTICIPATING';
    if (visible.has(id)) state = 'CAMERA_VISIBLE';
    else if (safety.has(id)) state = 'SAFETY_CORE';
    else if (predictive.has(id)) state = 'PREDICTIVE';
    else if (input.fallbackToLegacyDistance && legacy.has(id)) {
      state = 'DISTANCE_FALLBACK';
      distanceFallback.add(id);
    } else {
      const prior = input.prior.get(id);
      if (legacy.has(id)
        && prior
        && prior.state !== 'NON_PARTICIPATING'
        && input.nowMs - prior.lastParticipatingAtMs <= hysteresisMs) {
        state = 'HYSTERESIS_RETAINED';
        hysteresisRetained.add(id);
      }
    }
    stateByCell[id] = state;
    if (state !== 'NON_PARTICIPATING') final.add(id);
  }

  let stateTransitions = 0;
  for (const id of sortedUnique(new Set([...loaded, ...input.prior.keys()]))) {
    const previous = input.prior.get(id)?.state ?? 'NON_PARTICIPATING';
    const next = stateByCell[id] ?? 'NON_PARTICIPATING';
    if (previous !== next) stateTransitions += 1;
  }

  return {
    finalParticipatingCells: [...final].sort(),
    missingRequiredCells: [...required].filter((id) => !loaded.has(id)).sort(),
    stateByCell,
    categories: {
      both: intersection(legacy, visible),
      legacyOnly: difference(legacy, visible),
      visibilityOnly: difference(visible, legacy),
      safetyCore: [...safety].filter((id) => final.has(id)).sort(),
      hysteresisRetained: [...hysteresisRetained].sort(),
      predictive: [...predictive].filter((id) => final.has(id)).sort(),
      distanceFallback: [...distanceFallback].sort(),
      nonParticipating: [...loaded].filter((id) => !final.has(id)).sort()
    },
    stateTransitions
  };
}
