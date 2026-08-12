# Project Status

**Last verified runtime:** 2026-08-12 (Asia/Kolkata)  
**Canonical production:** https://project-noclip.vercel.app  
**Production release commit:** `9e73ef54975269461a5de0e282facfc2a0c27a3b`  
**Visible deployed version:** `v0.3.0-dev.2`  
**Product change source:** PR #40 / merge commit `5aadaf1700252a290c41d588c8f0d5944418f39e`  
**Save schema:** `v2`  
**New-journey generation:** `gen3-v1`  
**Current architecture direction:** Generation 3 — GitHub Issue #31  
**World vocabulary/catalog:** `WORLD.md`

## Health

**Canonical production is visibly running `v0.3.0-dev.2`.** The product-tracked retry commit `9e73ef54975269461a5de0e282facfc2a0c27a3b` completed successfully in Vercel after the earlier rolling deployment quota rejection, and the 2026-08-12 player feedback explicitly compares the live experience against dev.2. That observation closes the prior “visible confirmation pending” gap and restores dev.2 as the accepted renderer-comparison baseline.

The dev.2 product change came from PR #40 / merge commit `5aadaf1700252a290c41d588c8f0d5944418f39e`. Its clean-head verification passed typecheck, **48/48 tests**, the 10,000-Cell benchmark, production build, desktop/landscape-touch/world-cohesion Chromium journeys, save/reload, and renderer regression against dev.1.

The renderer-regression workflow consumes the exact `Production release commit` and `Visible deployed version` keys above. Keep those machine-readable fields stable when editing this document.

## Generation 3 accepted architecture

Generation 3 remains the active architecture for new journeys:

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

Existing pre-versioned journeys remain on frozen `gen2`; new journeys persist `generationVersion: gen3-v1`. Cells are streaming/cache units only, never rooms. Playable Geometry remains Euclidean.

## `v0.3.0-dev.2` release — PR #40

PR #40 corrected the first post-cutover perceptual problems:

- denser ordinary Level 0 architecture without returning to room templates;
- `axisFlow` as a deterministic directional bias rather than a hard cardinal command;
- Cell-independent Gen3 wallpaper/carpet/ceiling finish identity;
- complete wallpaper repeats on clipped continuous wall pieces;
- fog/background coverage that conceals the unloaded streaming horizon;
- regression gates for stream/fog coverage, orientation balance and finish continuity.

Verification before release:

- `npm run check` passed;
- **48/48 tests** passed;
- 10,000-Cell benchmark: **0 forbidden ordinary motifs**, **0 placement errors**, geography boundary delta `6e-9`;
- clean-head desktop, landscape-touch and world-cohesion Chromium journeys passed;
- save/reload preserved schema `v2`, `gen3-v1`, seed, character and exact position;
- renderer regression passed against accepted `v0.3.0-dev.1` production;
- fixed default-spawn comparison: **82 → 52 draw calls**, **95 → 163 colliders**, still comfortably inside explicit budgets;
- saved verification artifact reports candidate version **`v0.3.0-dev.2`** with 49 loaded Cells, 163 colliders, 9 interactions and 52 draw calls.

## Canonical world facts

- **Playable Level:** Level 0 only.
- **Registered exit destinations, not playable Levels:** Level 1, 2, 13, 14, 27, 483, 0.22, 0.23, 0.99, Red Rooms and Void.
- **Regions implemented for Gen3 new journeys:** Ordinary Level 0, Pillar Field, Arch Rooms.
- **Geometry:** Euclidean implemented; player-facing Non-Euclidean behavior remains unimplemented and requires explicit deterministic design.
- **Materials implemented:** Level 0 wallpaper, carpet, suspended ceiling, fluorescent panel; Arch pale wallpaper.
- **Conditions implemented:** damp carpet, deep wet carpet, shallow/dry carpet, Blackout.
- **Carver implemented:** floor-hole cluster.
- **Structures implemented:** Manila Room and exit structures.
- **Routine generated Entity system:** none in current scope.
- **Implemented Items:** Flashlight, Battery, Almond Water, Permanent Marker, Paper Note, Glow Stick, String Spool, Empty Can and Pry Tool.

## Current ready work

**PR #41 is the `v0.3.0-dev.3` density/topology candidate.** It must pass the full deterministic test suite, 10,000-Cell benchmark, production build, browser-cohesion journeys, renderer comparison, and preview playability before merge. The requested scope is tighter ordinary room topology, Arch-room enclosure walls, a less open Pillar reading, and fixture lighting that does not artificially brighten with player proximity.

Do not create no-op/status release triggers. Keep changes on the candidate branch until verification is green.

## Separate deferred work

- Broad Issue #11 contains independently revalidatable renderer/presentation/physics claims; keep unrelated work separate from Generation 3.
- Draft PR #12 remains donor/reference material only and must not be resumed wholesale.
- Terminal falling/death physics remain unimplemented.
- Physical Android/iOS FPS, thermals, battery use and native-browser ergonomics remain unmeasured.
- Long-session memory growth remains unmeasured.
- Primitive geometry remains placeholder-quality in places.

## Decisions needed from Sash

**None for the current dev.3 candidate.** Escalate only if verification exposes a real product-direction tradeoff rather than an implementation defect.

## Version policy

Project Noclip remains opted into the manual-project version indicator policy. Accepted canonical production is `v0.3.0-dev.2`; PR #41 carries root candidate `VERSION` `0.3.0-dev.3`. Do not label dev.3 accepted production until the merged deployment is visibly verified.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Production: https://project-noclip.vercel.app
- Generation 3 architecture: https://github.com/xash-mind/Project-Noclip/issues/31
- Generation 3 cutover: https://github.com/xash-mind/Project-Noclip/pull/39
- Perceptual-substrate release: https://github.com/xash-mind/Project-Noclip/pull/40
- Dev.3 density/topology candidate: https://github.com/xash-mind/Project-Noclip/pull/41
- PR #40 clean-head CI: https://github.com/xash-mind/Project-Noclip/actions/runs/31493658597
- PR #40 renderer regression: https://github.com/xash-mind/Project-Noclip/actions/runs/31493658583
- World vocabulary/catalog: `WORLD.md`
- Shared operations: https://github.com/xash-mind/project-operations
