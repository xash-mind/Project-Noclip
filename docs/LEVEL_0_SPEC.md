# Level 0 Generation 3 specification

`WORLD.md` is canonical for names and content. This document is the compact implementation contract.

## Pipeline

```text
seed + generationVersion
  → kilometre-scale Region/Condition Fields
  → world-space Euclidean architecture
  → Materials and Conditions
  → Carvers
  → Structures
  → Features, Items, and Transitions
  → persistent deltas
```

Cells are 14 m streaming/cache units only. No Region, wall, room, light, or content cadence may reset at Cell boundaries.

## Generation versions

- `gen3-v1`: every new journey.
- `gen2`: frozen compatibility for existing/unversioned saves.
- Never silently regenerate an existing save into another version.

## Geography and timeline gates

- Ordinary Level 0: always available.
- Pillar Field and Arch Rooms: World Day 3 / Exposure 0.6.
- Blackout Condition: World Day 7 / Exposure 1.6.
- Floor-hole Carver: World Day 10 / Exposure 2.2.
- Manila Room Structure: World Day 1 / Exposure 0.25.
- Developer bypass may expose gated content locally without changing the canonical gates.

## Fidelity rules

- Ordinary: continuous segmented partitions; no alcoves, divider modules, or Arch motifs; sparse rectangular wallpaper-clad pillars; extremely rare independent hole Carvers.
- Pillar Field: persistent 7.2 m world-space pillar lattice, wallpaper finish, shallow carpet, and strong wall suppression. Benchmark P50 crossing must remain at least 8 minutes and P90 at least 20 minutes.
- Arch Rooms: stable pale continuous divider walls with lower panels, repeated arch-shaped openings, and headers. Never freestanding arch props.
- Blackout: ordinary Geometry plus zero local fixture emission and zero local hum; continuous external glimmer/buzz toward a lit boundary.
- Holes: default non-overlapping lattice/near-lattice square voids with bypass lanes; no raised frame, rail, shallow plate, or visible destination.
- Manila: one deterministic Structure or one isolated World Lab test, never a Region fill.
- Exit architecture: Transition/Structure overlay, never Threshold geography.
- Red Rooms: blocked on an approved deterministic Non-Euclidean loop design.

## Required gates

- determinism and independent seed domains;
- stable semantic IDs and generation-version addresses;
- old-save loading on frozen Gen2;
- no visible Cell cadence;
- Region crossing-time P50/P90;
- ordinary forbidden-motif checks;
- Pillar wall-density and lattice checks;
- hole non-overlap/lattice/bypass checks;
- Blackout local fixture/hum exactly zero;
- actual fixture positions and light continuity across Cell boundaries;
- bounded spatial-light work and restrained fluorescent bloom;
- audible layered fluorescent spectrum/gain checks;
- benchmark, production build, and representative browser traversal.
