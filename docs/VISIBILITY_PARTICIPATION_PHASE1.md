# Visibility-Driven Render Participation — Phase 1

Phase 1 activates the Generation 3 Visibility Snapshot as a conservative renderer-participation input. It does **not** make topology visibility an authority for Cell residency, generation-cache eviction, persistent unloading, collision destruction, save identity, or world generation.

## Live model

`legacy distance envelope + all-direction Visibility Snapshot + safety core + hysteresis + existing streaming prediction + distance fallback -> final renderer participation`

The exact runtime hook is `src/renderer/visibility/runtime.ts`, installed after the existing render-settings/streaming scheduler and localized static batching lifecycle. A participating loaded Cell has its existing `CellVisual.root.enabled` set true. A non-participating loaded Cell keeps its descriptor, collision/runtime maps, and residency but has its render root disabled.

PlayCanvas camera frustum culling remains enabled. Visibility snapshots intentionally omit camera direction/FOV in Phase 1: topology answers which architectural Spaces/Cells may participate in any direction, while PlayCanvas answers which participating renderables are inside the current camera frustum. This keeps 180-degree turns and 360-degree spins from becoming topology visibility invalidations.

## Safety laws

- Current Cell plus the immediate one-Cell traversal neighborhood is the safety core, clipped to the current legacy distance envelope.
- A 500 ms runtime-only hysteresis window retains recently participating legacy Cells near Space/opening boundaries. It never changes deterministic world generation.
- Predictive participation reads the coordinates produced by the existing streaming predictor. Phase 1 does not add another movement predictor.
- Large displacement clears participation history immediately and temporarily suppresses predictive participation so stale pre-teleport direction cannot remain authoritative.
- Observer ambiguity, observer-outside-topology, depth-budget fallback, or frontier-state-budget fallback fail open to the legacy distance envelope.
- Missing required loaded Cells are reported diagnostically; visibility never fabricates residency.

## M-F1 and batching

The existing M-F1 selection law remains unchanged. `cellIsInsideActiveRenderScope` now applies the final visibility participation filter after the legacy distance check, so non-participating Cells do not remain eligible for active fixture Omnis/shadows. The invariant `active Omnis == shadowed Omnis` remains the accepted physical law.

Localized `StaticWorldBatching` remains unchanged. Participation changes do not call batch allocation/removal/dirty APIs. Visibility diagnostics expose current batch dirty/rebuild-request and reconcile counters so the later complete performance run can correlate participation transitions with batching behavior.

## Diagnostics

Runtime diagnostics are exposed at `window.__noclipVisibilityParticipationDiagnostics` and include:

- `legacyDistanceCells`, `visibilityCells`, `finalParticipatingCells`;
- `both`, `legacyOnly`, `visibilityOnly`, `safetyCore`, `hysteresisRetained`, `predictive`, `distanceFallback`, `nonParticipating`;
- suspicious legacy exclusions with observer Cell/Space, excluded Cell/Spaces, opening/frontier evidence, propagation depth, distance, reason, and prior state;
- topology-build, snapshot, and participation-decision timings;
- update rate, Cells changed, state transitions, missing required Cells;
- active M-F1 counts grouped by participation state plus actual active/shadowed totals and invariant status;
- localized batching dirty/rebuild-request and reconcile counters.

## Deferred work

Phase 1 does not implement visibility-driven Cell unloading, cache eviction, staged construction, collision/indexing changes, movement/input changes, M-F1 selection redesign, shadow budgeting, renderer-submission redesign, or broad GC/performance optimization. Those remain inputs to the later complete runtime performance run.
