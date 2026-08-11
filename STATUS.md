# Project Status

**Last verified runtime:** 2026-08-11 (Asia/Kolkata)  
**Production release commit:** `00ad6dc0a268c99ed31fa654a815babe6421f2c4` from PR #39  
**Production:** https://project-noclip.vercel.app — Generation 3 cutover accepted in production  
**Visible deployed version:** `v0.3.0-dev.1`  
**Save schema:** `v2`  
**New-journey generation:** `gen3-v1`  
**Current architecture direction:** Generation 3 — GitHub Issue #31  
**World vocabulary/catalog:** `WORLD.md`

## Health

**Healthy.** Generation 3 is the accepted new-journey architecture in production. Existing pre-versioned journeys remain on frozen `gen2`; new journeys persist `generationVersion: gen3-v1`. Cells are streaming/cache units only and ordinary Level 0 architecture, Region geography, lighting and current semantic world layers are generated from deterministic world-space laws rather than Gen2 district/room-template selection.

Playable Geometry remains **Euclidean**. Save schema `v2`, timeline gates, stable identities, Manila/exit semantics and frozen Gen2 compatibility remain preserved.

The accepted `v0.3.0-dev.1` cutover passed typecheck, 47/47 tests, the 10,000-Cell benchmark, production build, desktop/touch functional journeys, renderer-budget checks and production profiling. The cutover benchmark recorded over **3,100 Cells/s**, **0 forbidden ordinary motifs**, **0 placement errors**, Pillar Field wall density of **0.027 walls/Cell**, Blackout with **0 local fixtures**, **215 non-overlapping hole patches**, and geography boundary continuity delta of **6e-9**.

## Generation 3 accepted state

The current new-journey pipeline is:

```text
seed
  -> multi-scale Fields
  -> continuous Region geography
  -> world-space architecture + Euclidean Geometry
  -> Materials + Conditions
  -> Carvers
  -> Structures
  -> Features / Items / Transitions
  -> runtime mutations + save deltas
```

Accepted via [PR #39](https://github.com/xash-mind/Project-Noclip/pull/39):

- ordinary Level 0 no longer generates Gen2 alcove/divider/freestanding-arch grammar;
- Pillar Fields use kilometre-capable Region geography and a persistent wallpaper-clad pillar lattice with strongly suppressed wall density;
- Arch Rooms use pale continuous divider walls with lower panels, repeated arch-shaped openings and headers;
- Blackout is a Condition over recognizable Level 0 architecture with zero local fixture light/hum and deterministic external escape cues;
- hole sections are rare deterministic floor-hole Carvers rather than room templates;
- Manila is a bounded Structure and exits are Structure/Transition overlays rather than Threshold geography;
- spatial fixture lighting crosses Cell boundaries;
- ordinary fluorescent ambience is layered and Blackout removes the local hum;
- new journeys reserve a deterministic first-walk lane;
- World Lab uses the canonical `WORLD.md` categories and locators rather than Gen2 district/room controls.

## Canonical world facts

- **Playable Level:** Level 0 only.
- **Registered exit destinations, not playable Levels:** Level 1, 2, 13, 14, 27, 483, 0.22, 0.23, 0.99, Red Rooms and Void.
- **Regions implemented for Gen3 new journeys:** Ordinary Level 0, Pillar Field, Arch Rooms.
- **Geometry:** Euclidean implemented; player-facing Non-Euclidean behaviour remains unimplemented and requires an explicit deterministic design before shipping.
- **Materials implemented:** Level 0 wallpaper, carpet, suspended ceiling, fluorescent panel; Arch pale wallpaper.
- **Conditions implemented:** damp carpet, deep wet carpet, shallow/dry carpet, Blackout.
- **Carver implemented:** floor-hole cluster.
- **Structures implemented:** Manila Room and exit structures.
- **Routine generated Entity system:** none in current scope.
- **Implemented Items:** Flashlight, Battery, Almond Water, Permanent Marker, Paper Note, Glow Stick, String Spool, Empty Can and Pry Tool.
- **Red Rooms:** source-backed target remains planned; deterministic closed-loop Non-Euclidean behaviour is not yet designed or implemented.

## Current ready work

[PR #40](https://github.com/xash-mind/Project-Noclip/pull/40) is the bounded post-cutover perceptual-substrate candidate prompted by the first player audit of Generation 3. It targets ordinary Level 0 spacing/density, cardinal-direction over-bias, Cell-visible finish discontinuities and the visible streaming horizon. It is **not accepted state until its browser, renderer and production gates pass and it is merged/deployed**.

## Separate deferred work

- Broad [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) contains independently revalidatable renderer/presentation/physics claims; do not bundle unrelated items into Generation 3 work for volume.
- Draft [PR #12](https://github.com/xash-mind/Project-Noclip/pull/12) remains donor/reference material only and must not be resumed wholesale.
- Terminal falling/death physics remain unimplemented.
- Physical Android/iOS FPS, thermals, battery use and native-browser ergonomics remain unmeasured.
- Long-session memory growth remains unmeasured.
- Primitive geometry remains placeholder-quality in places.

## Decisions needed from Sash

**None for the current bounded perceptual-substrate correction.** Escalate before choosing player-facing Non-Euclidean behaviours, paid infrastructure, destructive data changes or other product-direction decisions.

## Version policy

Project Noclip remains opted into the manual-project version indicator policy. Accepted production visibly reports **`v0.3.0-dev.1`**. Production-changing candidates increment the canonical root `VERSION` once and are only recorded here as accepted after live production verification.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Production: https://project-noclip.vercel.app
- Generation 3 architecture: https://github.com/xash-mind/Project-Noclip/issues/31
- Generation 3 cutover: https://github.com/xash-mind/Project-Noclip/pull/39
- Current perceptual-substrate candidate: https://github.com/xash-mind/Project-Noclip/pull/40
- World vocabulary/catalog: `WORLD.md`
- Shared operations: https://github.com/xash-mind/project-operations
