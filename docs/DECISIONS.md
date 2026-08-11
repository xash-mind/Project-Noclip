# Durable decisions index

Architecture decisions with meaningful alternatives belong in `docs/adr/`. This file is a compact index, not a parallel specification.

1. Renderer-independent deterministic world state remains the authority.
2. Geometry has only Euclidean and Non-Euclidean canonical values.
3. Cells are streaming/cache units, never rooms or geography.
4. New journeys use `gen3-v1`; existing/unversioned saves remain on frozen `gen2`.
5. Generation 3 derives Regions and Blackout pressure from continuous kilometre-scale Fields.
6. Ordinary architecture is world-space partition generation, not hard district/Zone/archetype/component composition.
7. Pillar Field and Arch Rooms are Regions; Blackout is a Condition; holes are Carvers; Manila and Red Rooms are Structures; exits are Transitions. Threshold is not geography.
8. Region tuning is accepted through crossing-time distributions and browser-visible fidelity, not Cell counts.
9. Non-Euclidean behaviour requires an explicit deterministic, save-safe design. Red Rooms remain blocked until their closed loop is approved.
10. World Lab and runtime diagnostics share the canonical `WORLD.md` vocabulary registry.

See `docs/adr/0001-generation-versioned-gen3-cutover.md` for the Generation 3 compatibility decision.
