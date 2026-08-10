# Project Status

**Last verified runtime:** 2026-08-10 (Asia/Kolkata)  
**Production release commit:** `d3ff02c4b19a316d15addcc55a8e164658af419b` from PR #30  
**Production:** https://project-noclip.vercel.app — HTTP 200, desktop and landscape-touch journeys verified  
**Visible deployed version:** `v0.2.0-dev.7`  
**Save schema:** `v2`  
**Current architecture direction:** Generation 3 — GitHub Issue #31  
**World vocabulary/catalog:** `WORLD.md`

## Health

**Healthy.** Canonical production remains the accepted `v0.2.0-dev.7` runtime. Generation 3 Slice A adds deterministic Field infrastructure and diagnostics only; it does not change the playable Level 0 generator, renderer, Geometry, persistence or version.

Level 0 therefore still uses the accepted deterministic Gen-2 modular composition release: canonical Cell coordinates, connector symmetry, timeline gates, district identity, stable IDs, save v2 and journey loading remain intact. Manila remains one delayed seed-derived far Structure embedded in ordinary Level 0 rather than a Region. Current playable Geometry remains **Euclidean**.

Accepted normal production scene remains **49 loaded Cells / 442 colliders / 7 interactions / 128 draw calls**. The accepted Gen-2 benchmark baseline remains **1,823 composition signatures**, **0 connector errors**, **0 placement errors**, and a **0.242% baseline off-group rate**.

## Generation 3 progress

[Issue #31](https://github.com/xash-mind/Project-Noclip/issues/31) remains the primary world-generation architecture direction.

```text
seed
  -> multi-scale Fields                      [Slice A framework implemented]
  -> architecture + Geometry solver          [next bounded migration]
  -> continuous Level 0
  -> Materials + Conditions
  -> Carvers
  -> Structures
  -> Features
  -> Anomalies / Entities / Items / Transitions
  -> runtime mutations + save deltas
```

### Slice A — deterministic Field framework

The repository now contains a renderer-independent `src/world/fields.ts` framework for the 15 canonical Generation 3 Fields:

- structural: `openness`, `partitionPressure`, `axisFlow`, `roomScale`, `columnPressure`, `ceilingVariation`, `regularity`, `connectivityPressure`;
- environmental: `dampness`, `decay`, `stability`, `abnormality`, `voidPressure`, `clutterPressure`, `electricalReliability`.

Field laws now established:

- deterministic from world seed + independent Field domains;
- sampled in world-space metres rather than Cell-local coordinates;
- overlapping **168 m / 56 m / 21 m** scales;
- smooth interpolation across Cell boundaries;
- bounded scalar values in `0..1`;
- Geometry metadata remains `euclidean` only;
- diagnostic/read-only: **current Gen-2 zone/layout/connector generation does not consume the Fields yet**.

Developer diagnostics are available through `npm run fields:lab -- [seed] [worldX] [worldZ]`. The standard benchmark now includes an independent 10,000-sample Field section covering range, timing and boundary continuity in addition to the existing 10,000-Cell generator checks.

A representative CI measurement for the Slice-A sampler recorded **10,000 Field samples at ~4.53 µs/sample**, maximum sampled Cell-boundary delta **0.0000143**, no narrow Field ranges, and no change to the existing 10,000-Cell connector/placement baseline. Exact runner timing remains evidence rather than a permanent performance guarantee.

### Verification infrastructure repair

Two stale production-profile assumptions exposed during this work were repaired in the same verification domain:

- renderer regression again consumes the stable `**Production release commit:**` STATUS contract;
- the production-profile workflow now resolves accepted commit/version from STATUS by default instead of hardcoded historical deployment metadata and verifies the visible production version indicator before treating a profile as accepted-production evidence.

## Canonical vocabulary

Use the human-facing terms from `WORLD.md`:

- Level
- Region
- Variant
- Geometry
- Material
- Condition
- Feature
- Structure
- Carver
- Anomaly
- Entity
- Item
- Transition

`Field`, `Cell`, `District`, seed domains, room archetypes, spatial profiles, components and props remain engine/legacy vocabulary.

Geometry has exactly two canonical values: **Euclidean** and **Non-Euclidean**. There is no separate Distorted Geometry. No player-facing Non-Euclidean behavior is implemented by Slice A.

## Current world catalog facts

- **Playable Level:** Level 0 only.
- **Registered exit destinations, not playable Levels:** Level 1, 2, 13, 14, 27, 483, 0.22, 0.23, 0.99, Red Rooms and Void.
- **Canonical Gen-3 Regions:** none implemented yet. Current `baseline`, `arch`, `pillar`, `blackout`, `holes`, `exit-threshold` remain legacy region-like `ZoneId`s; `manila` is compatibility tooling only.
- **Canonical Gen-3 Region Variants:** none implemented yet; legacy spatial profiles remain `standard`, `sparse-vista`, `thin-channel`, `pillar-expanse`.
- **Geometry:** Euclidean is current; Non-Euclidean remains planned and requires intentional behavior design before implementation.
- **Gen-3 Fields:** framework implemented; not yet consumed by architecture generation.
- **Canonical Materials:** none named yet.
- **First-class Carvers:** none implemented yet; current holes remain legacy archetype/component output.
- **First-class Anomaly registry:** none implemented yet; `hallucinationAnchor` remains an internal precursor.
- **Routine generated Entity system:** none implemented in current scope.
- **Implemented Items:** Flashlight, Battery, Almond Water, Permanent Marker, Paper Note, Glow Stick, String Spool, Empty Can and Pry Tool.

## Next recommended action

Begin the largest safe coherent **Slice B architecture-substrate pilot** from Issue #31:

- choose one bounded ordinary-Level-0 generation path;
- consume the accepted Fields to solve architecture instead of recognizable alcove/divider modules;
- keep current Euclidean connector/connectivity laws exact;
- preserve spawn/loot clearance, stable IDs and save v2;
- compare old/new traversal, long-range perceptual continuity and renderer/collider budgets before expanding the pilot.

Do not turn Slice B into a whole-generator rewrite. Cross-Cell continuity, Materials/Conditions, Features, Carvers and Structure-placement remain later slices unless a directly dependent part is required for a safe pilot.

## Separate legacy / deferred work

- Broad [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) still contains independently revalidatable renderer/presentation/physics claims; do not bundle them into Generation 3 for volume.
- Draft [PR #12](https://github.com/xash-mind/Project-Noclip/pull/12) is donor/reference material only and must not be resumed wholesale.
- Hole rendering exists, but terminal falling/death physics remain unimplemented.
- Physical Android/iOS FPS, thermals, battery use and native-browser ergonomics remain unmeasured.
- Long-session memory growth remains unmeasured.
- Primitive geometry remains placeholder-quality and some structural props still use simple AABB collision.

## Decisions needed from Sash

**None for the next bounded Slice B architecture pilot.** Agents must still escalate before choosing exact player-facing Non-Euclidean behaviours rather than inventing them.

## Version policy

Project Noclip remains opted into the manual-project version indicator policy. Canonical root `VERSION` remains **`0.2.0-dev.7`** and canonical production remains **`v0.2.0-dev.7`** because Slice A is engine/tooling infrastructure that is not consumed by the shipped Level 0 runtime. No production version bump is warranted for this bundle.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Production: https://project-noclip.vercel.app
- Generation 3 architecture: https://github.com/xash-mind/Project-Noclip/issues/31
- Slice A implementation PR: https://github.com/xash-mind/Project-Noclip/pull/34
- World vocabulary/catalog: `WORLD.md`
- Accepted runtime PR: https://github.com/xash-mind/Project-Noclip/pull/30
- Accepted production verification: https://github.com/xash-mind/Project-Noclip/actions/runs/31363540975
- Broad deferred issue: https://github.com/xash-mind/Project-Noclip/issues/11
- Deferred donor PR: https://github.com/xash-mind/Project-Noclip/pull/12
- Shared operations: https://github.com/xash-mind/project-operations
