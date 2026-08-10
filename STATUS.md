# Project Status

**Last verified runtime:** 2026-08-10 (Asia/Kolkata)  
**Accepted runtime source / production release:** `d3ff02c4b19a316d15addcc55a8e164658af419b` from PR #30  
**Production:** https://project-noclip.vercel.app — HTTP 200, desktop and landscape-touch journeys verified  
**Visible deployed version:** `v0.2.0-dev.7`  
**Save schema:** `v2`  
**Current architecture direction:** Generation 3 — GitHub Issue #31  
**World vocabulary/catalog:** `WORLD.md`

## Health

**Healthy.** The accepted production runtime remains `v0.2.0-dev.7`; the world-vocabulary simplification is documentation/orientation only and does not change product code, deployment, save data or the canonical version.

Level 0 currently uses the accepted deterministic Gen-2 modular composition release: canonical cell coordinates, connector symmetry, timeline gates, district identity, stable IDs, save v2 and journey loading remain intact. Baseline dead-light groups remain exceptional and degrade monotonically with instability. Manila remains one delayed seed-derived far special room embedded in baseline Level 0, not a Manila Region.

Accepted normal production scene: **49 loaded cells / 442 colliders / 7 interactions / 128 draw calls**. Final-head CI for the accepted release measured **1,823 composition signatures**, **0 connector errors**, **0 placement errors**, and a **0.242% baseline off-group rate**.

## Current direction

[Issue #31](https://github.com/xash-mind/Project-Noclip/issues/31) is the primary world-generation architecture direction: **Generation 3 field-driven continuous Level 0 generation**.

Target model:

```text
seed
  -> multi-scale Fields                      [engine]
  -> architecture + Geometry solver          [world]
  -> continuous Level 0
  -> Materials + Conditions
  -> Carvers
  -> Structures
  -> Features
  -> Anomalies / Entities / Items / Transitions
  -> runtime mutations + save deltas
```

`Cell != room`: cells remain deterministic streaming/computation units. Player-visible architecture should increasingly cross cell boundaries without exposing the grid.

Generation 3 is an incremental migration, **not** permission for a one-shot rewrite. Current Gen-2 `ZoneId`, room-archetype, spatial-profile and structural-component systems remain accepted runtime behaviour until bounded verified slices replace them.

## Canonical vocabulary

`WORLD.md` now separates **everyday design vocabulary** from **engine/legacy vocabulary**.

Use these design terms:

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

Key simplifications:

- **Geometry has only two canonical values:** Euclidean and Non-Euclidean.
- There is **no separate Distorted Geometry**. Metric distortion, impossible adjacency, loops, asymmetric routes and spatial discontinuities are named Non-Euclidean behaviours.
- Use **Region**, not parallel `environment regime/class` vocabulary.
- Use **Material**, not `Material Family`, in ordinary product language.
- Use **Condition** for object/fixture/environment state instead of separate state categories.
- `rare` is a property of a **Structure**, not a separate structure category.
- Pure spatial impossibility belongs under **Non-Euclidean Geometry**, not a duplicate Anomaly category.
- `Field`, `Cell`, `District`, seed domains, room archetypes, spatial profiles, components and props remain engine/legacy terms rather than peer design categories.

## Current world catalog facts

- **Playable Level:** Level 0 only.
- **Registered exit destinations, not playable Levels:** Level 1, 2, 13, 14, 27, 483, 0.22, 0.23, 0.99, Red Rooms and Void.
- **Canonical Gen-3 Regions:** none implemented yet. Current `baseline`, `arch`, `pillar`, `blackout`, `holes`, `exit-threshold` are legacy region-like `ZoneId`s; `manila` is compatibility/render tooling only and Manila itself is a Structure.
- **Canonical Gen-3 Region Variants:** none implemented yet; legacy spatial profiles remain `standard`, `sparse-vista`, `thin-channel`, `pillar-expanse`.
- **Geometry:** Euclidean is the current playable law; Non-Euclidean is planned Gen 3.
- **Canonical Materials:** none named yet.
- **First-class Gen-3 Fields:** none implemented yet; Issue #31/`WORLD.md` contain the candidate field vocabulary.
- **First-class Carvers:** none implemented yet; current holes still come from explicit legacy archetypes/components.
- **First-class Anomaly registry:** none implemented yet; `hallucinationAnchor` is an internal precursor.
- **Routine generated Entity system:** none implemented in the current scope.
- **Implemented Items:** Flashlight, Battery, Almond Water, Permanent Marker, Paper Note, Glow Stick, String Spool, Empty Can and Pry Tool.

Any accepted change to the world catalog must update `WORLD.md` in the same PR and mirror material catalog changes to the mapped Project Noclip Notion page.

## Next recommended action

Fresh-orient on `WORLD.md`, [Issue #31](https://github.com/xash-mind/Project-Noclip/issues/31), current production and the remaining relevant issues. For worldgen work, prefer the first safe Generation 3 migration slice: **Field framework + World Lab diagnostics**, while keeping current Euclidean Geometry unchanged.

The framework should reserve deterministic Non-Euclidean extension points without implementing player-facing Non-Euclidean behaviour until that behaviour is intentionally specified and separately verified.

Do not bundle unrelated renderer/presentation or terminal-hole physics work from broad [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) into Generation 3 merely for volume. Revalidate those claims independently when selected.

## Separate legacy / deferred work

- Broad [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) still contains independently revalidatable renderer/presentation/physics claims.
- Draft [PR #12](https://github.com/xash-mind/Project-Noclip/pull/12) is donor/reference material only and must not be resumed or merged wholesale.
- Hole rendering exists, but terminal falling/death physics remain unimplemented.
- Physical Android/iOS FPS, thermals, battery use and native-browser ergonomics remain unmeasured.
- Long-session memory growth remains unmeasured.
- Primitive geometry remains placeholder-quality and some structural props still use simple AABB collision.

## Decisions needed from Sash

None for the next bounded Generation 3 framework slice. Agents must escalate before choosing exact player-facing Non-Euclidean behaviours rather than inventing them.

## Version policy

Project Noclip remains opted into the manual-project version indicator policy. Canonical root `VERSION` remains **`0.2.0-dev.7`** and canonical production remains visibly verified as **`v0.2.0-dev.7`**. This documentation/vocabulary change does **not** increment the version.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Production: https://project-noclip.vercel.app
- Generation 3 architecture: https://github.com/xash-mind/Project-Noclip/issues/31
- World vocabulary/catalog: `WORLD.md`
- Accepted modular release PR: https://github.com/xash-mind/Project-Noclip/pull/30
- Production release verification: https://github.com/xash-mind/Project-Noclip/actions/runs/31363540975
- Broad deferred issue: https://github.com/xash-mind/Project-Noclip/issues/11
- Deferred draft PR: https://github.com/xash-mind/Project-Noclip/pull/12
- Shared operations: https://github.com/xash-mind/project-operations
