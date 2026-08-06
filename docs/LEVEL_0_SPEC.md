# Project Noclip — Level 0 Specification

**Version:** 0.2

## Spatial hierarchy

World seed → 5×5 district → zone profile → room archetype → deterministic layout/props/notes/loot → persistent deltas.

Implemented room archetypes include open offices, split suites, narrow halls, alcove rings, service corners, wide lobbies, arch galleries/crossings, pillar grids/aisles, maintenance bays, flooded corridors, hole galleries/broken floors, Manila Room and transition foyers.

## Timeline gates

- Baseline: Day 0 / Exposure 0.
- Manila Room: Day 1 / Exposure 0.25.
- Arch and Pillar districts: Day 3 / Exposure 0.6.
- Exit thresholds and Level 1: Day 3 / Exposure 0.8.
- Blackout: Day 7 / Exposure 1.6.
- Level 483: Day 7 / Exposure 1.8.
- Holes and Level 27: Day 10 / Exposure 2.2.
- Level 13/14: Day 14 / Exposure 3.

World Lab can bypass gates locally for QA.

## Manila Room

Fixed test address: cell `8:-6`. It is a compact internal 6.3m square room with one central table, one book, dry carpet and stable/rendezvous time behavior. The ledger demonstrates the document interface. No fabricated players are shown.

## Interaction systems

- Glow sticks crack and drop as actual green omni lights, decaying over ten minutes.
- Markers draw connected bounded lines on the raycast wall face and persist by surface/shift epoch.
- Hardcoded notes open a safe text-only reading overlay.
- Locked exits state their World Day and Exposure requirement.
- Collision supports stable wall sliding without iteration-order snapping.

## Remaining

Destination capsules, editable player notes, string geometry, pryable surfaces, renderer batching, topology map and production multiplayer remain deferred.

## Modular room composition

The hierarchy is now:

`world seed → 5×5 district → zone profile → compatibility archetype → spatial profile → ordered component set → deterministic props/walls/lights → persistent deltas`

Compatibility archetypes remain stable labels for analysis and tuning. They no longer define one complete fixed layout. Reusable components may appear across archetype families, while zone weights strongly favor appropriate components such as pillars in Pillar Fields and arches in Arch Rooms.

Spatial profiles:

- `standard`: bounded mixed composition.
- `sparse-vista`: rare district-coherent open rooms with very wide already-valid connectors.
- `thin-channel`: unusually narrow corridor compositions.
- `pillar-expanse`: district-coherent aligned pillar fields with wider valid connectors.

No spatial profile changes whether a canonical edge is open. It may only widen an edge already declared open by the topology law.

## Fluorescent light groups

Each cell deterministically derives zero or more fixture groups. A group has stable derived identity, position, axis, fixture count, temperature, intensity and state: `on`, `off` or `flicker`.

- Solid-prop clearance is validated before a group is accepted.
- One PlayCanvas light represents a group, not every individual tube.
- Nearby loaded groups are reduced into one bounded light-field sample for procedural ambience.
- Off groups contribute neither light nor hum.
- Flicker groups use deterministic time slices; reduced-flicker mode forces a stable on value.
- Light groups are regenerated from canonical state and are not persisted, so save schema v2 remains compatible.

## Pause and input lifecycle

- Mouse deltas are accumulated independently from keyboard movement state and applied once per frame.
- Shift changes speed only and cannot gate camera look.
- Pointer-lock loss, focus loss, notes, World Lab and explicit pause mute ambience and freeze journey simulation.
- Resume restores the clustered ambience smoothly without restarting the journey.
