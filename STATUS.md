# Project Status

**Last reconciled:** 2026-08-14 (Asia/Kolkata)  
**Canonical production:** https://project-noclip.vercel.app  
**Production release commit:** `d3c32d146a1b05a9d64555d102749111abddc75d`  
**Visible deployed version:** `v0.3.0-dev.6`  
**Accepted production baseline before PR #54:** `v0.3.0-dev.6` / `d3c32d146a1b05a9d64555d102749111abddc75d`  
**Current bounded correction:** GitHub Issue #53 / PR #54 — fixture-owned fluorescent lighting  
**Save schema:** `v2`  
**New-journey generation:** `gen3-v1`  
**Architecture direction:** Generation 3 — GitHub Issue #31  
**World vocabulary/catalog:** `WORLD.md`

## Current release correction

Dev.6 is the accepted topology/Pillar/Arch/flashlight baseline, but its fluorescent lighting architecture is rejected as the final lighting model. It used a fixed player-nearest realtime-light pool while a Cell-center sampled light field changed floor/ceiling emission, which made illumination ownership player-relative and could expose Cell-scale brightness patches.

PR #54 is the bounded dev.7 lighting correction. It does not change Generation 3 topology, Region placement, Pillar/Arch geometry, holes, props, saves, movement, inventory or timeline laws.

The corrected runtime law is:

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

## Verification gate

Before dev.7 is declared released, PR #54 must pass the repository TypeScript/system checks and a real Vercel preview must demonstrate that rendered fixture count and real fixture-light count track together without the old fixed pool. After merge, canonical production must independently be checked for visible `v0.3.0-dev.7`; merge state alone is not release proof.

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
