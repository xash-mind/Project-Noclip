# Project Status

**Last reconciled:** 2026-08-14 (Asia/Kolkata)  
**Canonical production:** https://project-noclip.vercel.app  
**Production release commit:** `8fe71c43b6050ab69b00711116c896f3e52a9337`  
**Visible deployed version:** `v0.3.0-dev.7`  
**Accepted production baseline:** `v0.3.0-dev.7` / `8fe71c43b6050ab69b00711116c896f3e52a9337`  
**Completed bounded correction:** GitHub Issue #53 / PR #54 — fixture-owned fluorescent lighting  
**Save schema:** `v2`  
**New-journey generation:** `gen3-v1`  
**Architecture direction:** Generation 3 — GitHub Issue #31  
**World vocabulary/catalog:** `WORLD.md`

## Current accepted release

Dev.7 keeps the accepted dev.6 topology/Pillar/Arch/flashlight baseline and replaces only its rejected fluorescent-light ownership model. Dev.6 used a fixed player-nearest realtime-light pool while a Cell-center sampled light field changed floor/ceiling emission, which made illumination ownership player-relative and could expose Cell-scale brightness patches.

PR #54 is merged and Issue #53 is closed. Canonical Vercel production is READY from runtime release commit `8fe71c43b6050ab69b00711116c896f3e52a9337`.

The accepted runtime law is:

- every rendered fluorescent fixture owns one real broad downward PlayCanvas spot for the lifetime of its streamed Cell;
- there is no app-level fixed eight-light pool and no player-nearest light ownership loop;
- fixture `off` means zero mesh emission and zero emitted light;
- fixture `flicker` uses the same deterministic pulse for the visible panel and its real spot;
- Reduced Flicker makes that pulse steady through the existing `lightFlickerValue` law;
- Blackout cores still generate no local fluorescent groups;
- the camera flashlight remains an independent spot light;
- ambient Level 0 light is reduced so real fixture falloff carries more of the room illumination;
- the existing sampled light field remains available for ambience/diagnostics but no longer owns visible surface illumination in the corrected runtime path.

Fixture spot profile for dev.7: 10.5 m range, 48° inner cone, 68° outer cone, shadows disabled initially. No arbitrary realtime fixture cap is introduced.

## Release evidence

- TypeScript/typecheck, full deterministic/system tests, 10,000-Cell generation benchmark and production build passed on the runtime candidate.
- Renderer comparison at the default 49-Cell scene observed 160 rendered fixtures and 160 real fixture lights; draw calls improved from 148 on dev.6 to 138 on dev.7.
- World Lab comparison observed 160/160 fixture lights and draw calls improved from 185 to 173.
- Hole-carver radius-1 inspection observed 9 Cells and 25/25 fixture lights.
- Browser/runtime evidence recorded no severe browser errors and preserved schema-v2/gen3-v1 save identity and position across reload.
- Flashlight remained independently effective in ordinary and Blackout scenes.
- The visual traversal harness was corrected to stop asserting the deleted player-owned `sourceIds` model and to use reachable capture milestones; these were test-harness corrections, not runtime lighting changes.
- Release discipline produced one useful PR preview and one production deployment; documentation/test-only follow-up pushes were skipped/canceled by the repository Vercel ignore policy.

## Preserved accepted direction

- `gen3-v1` and schema-v2 save compatibility;
- player-approved dev.5 Space Topology and intentional small/one-entry spaces;
- continuous Pillar Region depth and accepted Arch correction from dev.6;
- Euclidean Geometry unless explicitly scoped otherwise;
- deterministic stable identities and world laws;
- Cells as streaming/cache units only, never player-visible room or illumination units;
- Manila/Transition laws, frozen Gen2 save isolation and existing flashlight behavior.

## Remaining known gaps

- Physical Android/iOS GPU cost for one real spot per rendered fixture still requires real-device playtesting.
- Fixture shadows remain disabled, so wall-light leakage must be judged in the player test before enabling costly shadowing or another occlusion strategy.
- Dormant legacy spatial-light selection helpers remain source-level compatibility/test code, but the accepted runtime no longer calls them or gives them light ownership.
- Hole Carver density/terminal-fall work, content variants and all other non-lighting expansion remain outside this correction.
- Perceptual audio quality remains unverified unless actually listened to.

## Player acceptance checklist

1. Visible active fixtures illuminate their surroundings before the player approaches.
2. Walking through ordinary Level 0 produces smooth falloff rather than room-wide slot pops.
3. Carpet/ceiling illumination does not reveal 14 m Cell squares.
4. Dead fixtures are genuinely dark with no panel/light disagreement.
5. Flickering panels and surrounding illumination pulse together; Reduced Flicker is steady.
6. Blackout cores have no local fluorescent contribution and the flashlight remains useful independently.
7. Watch specifically for wall bleed and sustained frame-time degradation while Cells load/unload.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Production: https://project-noclip.vercel.app
- Generation 3 architecture: https://github.com/xash-mind/Project-Noclip/issues/31
- Level 0 fidelity: https://github.com/xash-mind/Project-Noclip/issues/37
- Dev.6 baseline correction: https://github.com/xash-mind/Project-Noclip/issues/50
- Fixture lighting correction: https://github.com/xash-mind/Project-Noclip/issues/53
- Fixture lighting PR: https://github.com/xash-mind/Project-Noclip/pull/54
