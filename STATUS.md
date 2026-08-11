# Project Status

**Last verified runtime:** 2026-08-11 (Asia/Kolkata)  
**Production release commit:** `39ec4e850a9bb95ce6e07ddede6825ed7e822872` from PR #38  
**Production:** https://project-noclip.vercel.app — Vercel production deployment succeeded and canonical browser evidence visibly reports the accepted version  
**Visible deployed version:** `v0.2.0-dev.9`  
**Save schema:** `v2`  
**Current architecture direction:** Generation 3 — GitHub Issue #31  
**World vocabulary/catalog:** `WORLD.md`

## Health

**Healthy.** Generation 3 Slice C continuity substrate is accepted in canonical production as `v0.2.0-dev.9`. The bounded `baseline` + `open-office` pilot now anchors partition cadence and supports to deterministic world-space lattices, with a slow Field-derived heading/corridor guide and validated matching across eligible natural Cell seams.

Current playable Geometry remains **Euclidean**. Cell identity, boundary connector laws, timeline gates, stable IDs, Manila/exits, loot identity and save schema `v2` remain compatible. All non-pilot generation paths remain on the accepted legacy implementation until migrated deliberately.

Accepted dev.9 renderer comparison against dev.8 showed **0% draw-call delta**: baseline **125**, Hole **34**, and World Lab **124**, with loaded Cells, colliders and interactions unchanged. Save reload preserved schema `v2`, character, seed and exact position with zero blocking application errors.

## Generation 3 progress

[Issue #31](https://github.com/xash-mind/Project-Noclip/issues/31) remains the primary world-generation architecture direction.

```text
seed
  -> multi-scale Fields                      [Slice A accepted]
  -> architecture + Geometry solver          [Slice B bounded pilot accepted]
  -> continuous cross-Cell Level 0           [Slice C bounded substrate accepted]
  -> Materials + Conditions
  -> Carvers
  -> Structures
  -> Features
  -> Anomalies / Entities / Items / Transitions
  -> runtime mutations + save deltas
```

### Slice A — deterministic Field framework

The 15 canonical Fields remain deterministic, multi-scale and continuous in world-space with independent seed domains. Current Geometry metadata remains `euclidean`. Field diagnostics and the 10,000-sample Field benchmark remain available.

### Slice B — bounded field-driven architecture pilot

Accepted via [PR #35](https://github.com/xash-mind/Project-Noclip/pull/35):

- only the legacy `baseline` + `open-office` ordinary path is migrated;
- pilot internal partitions/supports are solved from `axisFlow`, `openness`, `partitionPressure`, `roomScale`, `columnPressure`, `regularity` and `connectivityPressure`;
- existing deterministic Cell-boundary openings and Euclidean connector laws are preserved exactly;
- pilot output emits no legacy structural component IDs and uses a Field-derived composition signature;
- replacement geometry preserves the relevant markable/collidable identity slots so persisted `SurfaceMark.surfaceId` references remain addressable without a save migration;
- coarse player-radius reachability from the pilot centre to all four interior edge bands is validated;
- Cell IDs, loot IDs, Manila, transitions and non-baseline generators remain unchanged.

Final 10,000-Cell verification recorded **1,419 pilot Cells**, **736 pilot signatures**, **0 pilot traversal/validation errors**, **0 legacy module props on the pilot**, **0 connector errors** and **0 placement errors**. Total composition signatures increased to **2,535**. Representative accepted-runner generation timing remained in the existing broad range; the final live-transition rerun measured about **64 µs/Cell**, while the offline coarse reachability validator is measured separately and is not runtime workload.

### Slice C — bounded cross-Cell continuity substrate

Accepted via [PR #38](https://github.com/xash-mind/Project-Noclip/pull/38):

- pilot partition/support candidates use deterministic architecture-domain world-space lattices rather than restarting per Cell;
- a slow Field-derived heading/corridor guide reduces independent neighbor thresholding;
- compatible partition runs meet across eligible east/south pilot seams while protected connector corridors remain clear;
- existing Euclidean connector laws, stable IDs, SurfaceMark addresses, save schema v2, cardinality and non-pilot generation remain unchanged;
- lattice and seam validators run in representative tests and the normal 10,000-Cell benchmark.

Final verification recorded **1,419 pilot Cells**, **31 eligible natural seams**, **32/32 matched partition lines**, and **0 connector, placement, architecture or continuity errors**. Total output remained **74,649 walls / 23,059 props**, with maxima of **12 walls / 21 props per Cell**. The accepted performance comparison remained noise-level, and renderer counts were unchanged from dev.8.

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

Geometry has exactly two canonical values: **Euclidean** and **Non-Euclidean**. There is no separate Distorted Geometry. No player-facing Non-Euclidean behavior is implemented by Slice C.

## Current world catalog facts

- **Playable Level:** Level 0 only.
- **Registered exit destinations, not playable Levels:** Level 1, 2, 13, 14, 27, 483, 0.22, 0.23, 0.99, Red Rooms and Void.
- **Canonical Gen-3 Regions:** none implemented yet. Current `baseline`, `arch`, `pillar`, `blackout`, `holes`, `exit-threshold` remain legacy region-like `ZoneId`s; `manila` is compatibility tooling only.
- **Canonical Gen-3 Region Variants:** none implemented yet; legacy spatial profiles remain `standard`, `sparse-vista`, `thin-channel`, `pillar-expanse`.
- **Geometry:** Euclidean is current; Non-Euclidean remains planned and requires intentional behavior design before implementation.
- **Gen-3 Fields:** implemented and consumed by the bounded baseline/open-office architecture and Slice-C continuity pilot; other paths remain unmigrated.
- **Canonical Materials:** no semantic Material IDs are implemented; promoted ordinary-Level-0, Arch, Pillar, Hole, Blackout and Red Rooms finish/condition rules are documented in `WORLD.md`.
- **First-class Carvers:** none implemented yet; current holes remain legacy archetype/component output.
- **First-class Anomaly registry:** none implemented yet; `hallucinationAnchor` remains an internal precursor.
- **Routine generated Entity system:** none implemented in current scope.
- **Implemented Items:** Flashlight, Battery, Almond Water, Permanent Marker, Paper Note, Glow Stick, String Spool, Empty Can and Pry Tool.

## Next recommended action

Continue the largest safe coherent **Slice C cross-Cell continuity** step from Issue #31:

- reduce remaining visible Cell cadence from legacy shared-boundary walls and sparse pilot eligibility;
- expand only where the accepted world-space lattice and Field guide preserve deterministic Euclidean connector laws;
- preserve stable IDs, markable surface compatibility, spawn/loot clearance and save v2;
- verify long-range perceptual continuity, traversal and renderer/collider budgets before broadening beyond ordinary Level 0.

Do not broaden Slice C into Materials/Conditions, Features, Carvers, Structures or player-facing Non-Euclidean behavior unless a directly dependent piece is required for the continuity contract.

## Separate legacy / deferred work

- Broad [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) still contains independently revalidatable renderer/presentation/physics claims; do not bundle them into Generation 3 for volume.
- Draft [PR #12](https://github.com/xash-mind/Project-Noclip/pull/12) is donor/reference material only and must not be resumed wholesale.
- Hole rendering exists, but terminal falling/death physics remain unimplemented.
- Physical Android/iOS FPS, thermals, battery use and native-browser ergonomics remain unmeasured.
- Long-session memory growth remains unmeasured.
- Primitive geometry remains placeholder-quality and some structural props still use simple AABB collision.

## Decisions needed from Sash

**None for the next bounded Slice C continuity step.** Agents must still escalate before choosing exact player-facing Non-Euclidean behaviours rather than inventing them.

## Version policy

Project Noclip remains opted into the manual-project version indicator policy. Canonical root `VERSION` is **`0.2.0-dev.9`** and canonical production visibly reports **`v0.2.0-dev.9`**. This version was incremented exactly once for the accepted production-changing Slice-C continuity release.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Production: https://project-noclip.vercel.app
- Generation 3 architecture: https://github.com/xash-mind/Project-Noclip/issues/31
- Slice C implementation/release PR: https://github.com/xash-mind/Project-Noclip/pull/38
- Slice C final CI: https://github.com/xash-mind/Project-Noclip/actions/runs/31468115422
- Slice C renderer comparison: https://github.com/xash-mind/Project-Noclip/actions/runs/31468115441
- Slice C production profile: https://github.com/xash-mind/Project-Noclip/actions/runs/31468115411
- World vocabulary/catalog: `WORLD.md`
- Broad deferred issue: https://github.com/xash-mind/Project-Noclip/issues/11
- Deferred donor PR: https://github.com/xash-mind/Project-Noclip/pull/12
- Shared operations: https://github.com/xash-mind/project-operations
