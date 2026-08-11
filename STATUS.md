# Project Status

**Last verified runtime:** 2026-08-11 (Asia/Kolkata)  
**Production release commit:** `00ad6dc0a268c99ed31fa654a815babe6421f2c4` from PR #39  
**Production:** https://project-noclip.vercel.app — Generation 3 cutover accepted in production; `v0.3.0-dev.2` deployment retry triggered from current `main`  
**Visible deployed version:** `v0.3.0-dev.1` until the new production deployment is visibly verified  
**Repository version:** `v0.3.0-dev.2`  
**Current main:** PR #40 merged; perceptual-substrate correction is verified and awaiting production acceptance  
**Save schema:** `v2`  
**New-journey generation:** `gen3-v1`  
**Current architecture direction:** Generation 3 — GitHub Issue #31  
**World vocabulary/catalog:** `WORLD.md`

## Health

**Healthy, deployment pending.** Generation 3 is the accepted new-journey architecture in production. Existing pre-versioned journeys remain on frozen `gen2`; new journeys persist `generationVersion: gen3-v1`. Cells are streaming/cache units only and ordinary Level 0 architecture, Region geography, lighting and current semantic world layers are generated from deterministic world-space laws rather than Gen2 district/room-template selection.

Playable Geometry remains **Euclidean**. Save schema `v2`, timeline gates, stable identities, Manila/exit semantics and frozen Gen2 compatibility remain preserved.

The accepted `v0.3.0-dev.1` cutover passed typecheck, 47/47 tests, the 10,000-Cell benchmark, production build, desktop/touch functional journeys, renderer-budget checks and production profiling. The cutover benchmark recorded over **3,100 Cells/s**, **0 forbidden ordinary motifs**, **0 placement errors**, Pillar Field wall density of **0.027 walls/Cell**, Blackout with **0 local fixtures**, **215 non-overlapping hole patches**, and geography boundary continuity delta of **6e-9**.

The merged `v0.3.0-dev.2` perceptual-substrate correction from [PR #40](https://github.com/xash-mind/Project-Noclip/pull/40) is fully verified before production acceptance: **48/48 tests**, **0 forbidden ordinary motifs**, **0 placement errors**, clean-head mobile/desktop/world-cohesion Chromium journeys passed, save/reload preserved schema `v2` + `gen3-v1` with exact position, and renderer regression passed against accepted `v0.3.0-dev.1` production. At default spawn, draw calls improved **82 → 52** while colliders rose **95 → 163**, still far below the explicit budget.

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

## Merged perceptual-substrate correction

[PR #40](https://github.com/xash-mind/Project-Noclip/pull/40) is merged into `main` as the `v0.3.0-dev.2` candidate and is awaiting only live production acceptance:

- ordinary Level 0 architecture is denser by default without returning to room templates;
- `axisFlow` acts as a deterministic directional bias rather than forcing one cardinal direction across a local Field area;
- Gen3 wallpaper/carpet/ceiling finish identity no longer leaks streaming Cell boundaries;
- clipped continuous wall pieces end on complete wallpaper repeats instead of arbitrary partial-pattern phase changes;
- ordinary Level 0 fog/clear colour now conceal the unloaded streaming edge coherently;
- regression gates cover stream/fog coverage, orientation balance and Gen3 finish continuity.

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

No unmerged Generation 3 implementation candidate is currently in flight. The immediate release action is to verify `v0.3.0-dev.2` on canonical production after the fresh Vercel deployment trigger. Once accepted, the next world-generation work should build on the corrected density/orientation/material/streaming substrate rather than reopen Generation 2 room-template logic.

## Separate deferred work

- Broad [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) contains independently revalidatable renderer/presentation/physics claims; do not bundle unrelated items into Generation 3 work for volume.
- Draft [PR #12](https://github.com/xash-mind/Project-Noclip/pull/12) remains donor/reference material only and must not be resumed wholesale.
- Terminal falling/death physics remain unimplemented.
- Physical Android/iOS FPS, thermals, battery use and native-browser ergonomics remain unmeasured.
- Long-session memory growth remains unmeasured.
- Primitive geometry remains placeholder-quality in places.

## Decisions needed from Sash

**None for the current release acceptance.** Escalate before choosing player-facing Non-Euclidean behaviours, paid infrastructure, destructive data changes or other product-direction decisions.

## Version policy

Project Noclip remains opted into the manual-project version indicator policy. Canonical root `VERSION` is **`0.3.0-dev.2`**. Accepted production still visibly reports **`v0.3.0-dev.1`** until the new deployment is independently verified; only then should this status record `v0.3.0-dev.2` as accepted production.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Production: https://project-noclip.vercel.app
- Generation 3 architecture: https://github.com/xash-mind/Project-Noclip/issues/31
- Generation 3 cutover: https://github.com/xash-mind/Project-Noclip/pull/39
- Perceptual-substrate correction: https://github.com/xash-mind/Project-Noclip/pull/40
- World vocabulary/catalog: `WORLD.md`
- Shared operations: https://github.com/xash-mind/project-operations
