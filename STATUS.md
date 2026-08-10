# Project Status

**Last verified runtime:** 2026-08-10 (Asia/Kolkata)  
**Accepted runtime source / production release:** `d3ff02c4b19a316d15addcc55a8e164658af419b` from PR #30  
**Production:** https://project-noclip.vercel.app — HTTP 200, desktop and landscape-touch journeys verified  
**Visible deployed version:** `v0.2.0-dev.7`  
**Save schema:** `v2`  
**Current architecture direction:** Generation 3 — GitHub Issue #31  
**World vocabulary/catalog:** `WORLD.md`

## Health

**Healthy.** The accepted production runtime is still `v0.2.0-dev.7`; this documentation update does not change product code, deployment, provider state, save data or the canonical version.

Level 0 currently uses the accepted deterministic Gen-2 modular composition release: canonical cell coordinates, connector symmetry, timeline gates, district identity, stable IDs, save v2 and journey loading remain intact. Baseline dead-light groups remain exceptional and degrade monotonically with instability. Manila remains one delayed seed-derived far special room embedded in baseline Level 0, not a Manila zone.

Accepted normal production scene: **49 loaded cells / 442 colliders / 7 interactions / 128 draw calls**. Final-head CI for the accepted release measured **1,823 composition signatures**, **0 connector errors**, **0 placement errors**, and a **0.242% baseline off-group rate**.

## Current direction

[Issue #31](https://github.com/xash-mind/Project-Noclip/issues/31) is now the primary world-generation architecture direction: **Generation 3 field-driven continuous Level 0 generation**.

The target model is:

```text
seed
  -> multi-scale continuous world fields
  -> architectural / topology constraint solver
  -> continuous Level 0 substrate
  -> materials + conditions
  -> carvers
  -> rare structures
  -> features
  -> anomalies / entities / items / transitions
  -> runtime mutations + save deltas
```

`Cell != room`: cells remain deterministic streaming/computation units. Player-visible architecture should increasingly cross cell boundaries without exposing the grid.

Generation 3 is an incremental migration, **not** permission for a one-shot rewrite. Current Gen-2 `ZoneId`, room-archetype, spatial-profile and structural-component systems remain accepted runtime behaviour until bounded verified slices replace them.

## World vocabulary / content control

`WORLD.md` is the canonical human-facing world bible and current catalog.

It distinguishes:

- **Implemented** playable/runtime content;
- **Registered** transition/destination foundations that are not playable content;
- **Legacy** Gen-2 systems still present in accepted runtime;
- **Planned** Gen-3 direction;
- explicit **None implemented** categories where absence matters.

Current key catalog facts:

- **Playable Level:** Level 0 only.
- **Registered exit destinations, not playable Levels:** Level 1, 2, 13, 14, 27, 483, 0.22, 0.23, 0.99, Red Rooms and Void.
- **Legacy region-like `ZoneId`s:** baseline, arch, pillar, blackout, holes and exit-threshold; `manila` is compatibility/render tooling only and is not a generated Region.
- **Canonical Gen-3 Region Variants:** none implemented yet.
- **Geometry Regimes:** Euclidean is the current playable topology law; Distorted and Non-Euclidean are planned Gen-3 spatial-law regimes.
- **First-class Gen-3 continuous Fields:** none implemented yet; Issue #31 defines the candidate field vocabulary.
- **Named Material Families:** none implemented yet.
- **First-class Carvers:** none implemented yet; current holes still come from explicit legacy archetypes/components.
- **First-class Anomaly registry:** none implemented yet; `hallucinationAnchor` is an internal precursor.
- **Routine generated Entity system:** none implemented in the current scope.
- **Implemented Items:** Flashlight, Battery, Almond Water, Permanent Marker, Paper Note, Glow Stick, String Spool, Empty Can and Pry Tool.

Any accepted change to Levels, Regions, Variants, Geometry Regimes, Fields, Material Families, Conditions, Features, Structures, Carvers, Anomalies, Entities, Items, Transitions or related legacy worldgen vocabulary must update `WORLD.md` in the same PR.

## Next recommended action

Fresh-orient on `WORLD.md`, [Issue #31](https://github.com/xash-mind/Project-Noclip/issues/31), current production and the remaining relevant issues. For worldgen work, prefer the first safe Generation 3 migration slice: **field framework + World Lab diagnostics**, including a geometry-regime/topology contract that keeps current Euclidean behavior unchanged while reserving deterministic Distorted/Non-Euclidean semantics for later slices.

Do not bundle unrelated renderer/presentation or terminal-hole physics work from broad [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) into Generation 3 merely for volume. Revalidate those claims independently when selected.

## Separate legacy / deferred work

- Broad [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) still contains independently revalidatable renderer/presentation/physics claims.
- Draft [PR #12](https://github.com/xash-mind/Project-Noclip/pull/12) is donor/reference material only and must not be resumed or merged wholesale.
- Hole rendering exists, but terminal falling/death physics remain unimplemented.
- Physical Android/iOS FPS, thermals, battery use and native-browser ergonomics remain unmeasured.
- Long-session memory growth remains unmeasured.
- Primitive geometry remains placeholder-quality and some structural props still use simple AABB collision.

## Decisions needed from Sash

None for the next bounded Generation 3 framework slice. Geometry vocabulary is now defined as **Euclidean / Distorted / Non-Euclidean**; agents must escalate if a future implementation needs a product decision about exact non-Euclidean player behavior rather than inventing it.

## Version policy

Project Noclip remains opted into the manual-project version indicator policy. Canonical root `VERSION` remains **`0.2.0-dev.7`** and canonical production remains visibly verified as **`v0.2.0-dev.7`**. This documentation/world-bible change does **not** increment the version.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Production: https://project-noclip.vercel.app
- Generation 3 architecture: https://github.com/xash-mind/Project-Noclip/issues/31
- World vocabulary/catalog: `WORLD.md`
- Accepted modular release PR: https://github.com/xash-mind/Project-Noclip/pull/30
- Production release verification: https://github.com/xash-mind/Project-Noclip/actions/runs/31363540975
- Final-head CI: https://github.com/xash-mind/Project-Noclip/actions/runs/31363004267
- Renderer comparison: https://github.com/xash-mind/Project-Noclip/actions/runs/31363004268
- Broad deferred issue: https://github.com/xash-mind/Project-Noclip/issues/11
- Deferred draft PR: https://github.com/xash-mind/Project-Noclip/pull/12
- Shared operations: https://github.com/xash-mind/project-operations
