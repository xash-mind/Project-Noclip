# ADR 0001: Generation-versioned Generation 3 cutover

- Status: Proposed
- Date: 2026-08-11
- Owners: Project Noclip
- Related issues/PRs: [Issue #31](https://github.com/xash-mind/Project-Noclip/issues/31), [Issue #37](https://github.com/xash-mind/Project-Noclip/issues/37)

## Context

Generation 2 encodes Level 0 as hard 5×5 districts, Zones, room archetypes, and modular components. Those laws conflict with the promoted continuous-world vocabulary and Level 0 reference rules. Silently replacing generation for an existing save would move architecture, SurfaceMark targets, Items, and Transitions beneath a player.

## Decision

Persist a `generationVersion` with every journey.

- Every new journey uses `gen3-v1`.
- Existing saves without a generation version migrate to `gen2`.
- `gen2` generation remains frozen for old-save loading.
- Generation 3 uses continuous world-space Fields, Regions, Materials/Conditions, Carvers, Structures, Features, Items, and Transitions. Cells remain cache units.
- Stable world addresses include the generation version.
- World Lab and ordinary new-world code cannot select legacy districts, Zones, archetypes, or components.
- Legacy generation can be deleted only after an explicit save-retention/release decision.

## Alternatives considered

### Regenerate every existing save into Generation 3

This produces the cleanest code immediately but invalidates spatial memory, marks, dropped Items, and route continuity. It is rejected.

### Continue incremental hidden pilots inside Generation 2

This limits migration risk, but the hard district/archetype/test structure keeps pulling work toward stale behaviour and makes player-visible progress negligible. It is rejected for new journeys.

### Maintain two generation versions

This preserves old journeys while allowing a coherent new-world architecture. It adds a temporary maintenance cost but makes the compatibility boundary explicit and testable. This is the chosen approach.

## Consequences

### Positive

- Existing journeys never silently move.
- New worlds can remove stale districts, alcoves, freestanding arches, framed holes, and room-light snapping coherently.
- Tests can enforce both new-world laws and old-save loading without conflating them.
- Future generation changes can use explicit version migrations instead of accidental hash drift.

### Negative and risks

- Gen2 code remains bundled and maintained until the retention policy permits deletion.
- Bugs fixed only in Generation 3 may remain visible in old saves unless a safe compatibility fix is separately justified.
- Save, renderer, and diagnostics paths must continue carrying generation version metadata.

## Reversal or review condition

Review when the project adopts an explicit old-save expiry/export policy, or when a later Generation version needs a migration. Removing Gen2 requires a separately approved player-data decision and verification that no supported save depends on it.
