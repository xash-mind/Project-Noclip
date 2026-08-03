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
