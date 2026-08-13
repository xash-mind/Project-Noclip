# Project Status

**Last verified runtime:** 2026-08-13 (Asia/Kolkata)  
**Canonical production:** https://project-noclip.vercel.app  
**Production release commit:** `e6f5c7246d2d574e62c2ef4ec2738d1b3822f4e1`  
**Visible deployed version:** `v0.3.0-dev.5`  
**Product change source:** PR #49 / merge commit `e6f5c7246d2d574e62c2ef4ec2738d1b3822f4e1`  
**Save schema:** `v2`  
**New-journey generation:** `gen3-v1`  
**Current architecture direction:** Generation 3 — GitHub Issue #31  
**Current bounded player-facing objective:** GitHub Issue #50 — dev.6 lighting/Pillar/Arch correction  
**World vocabulary/catalog:** `WORLD.md`

## Health

Canonical production serves `v0.3.0-dev.5`. The dev.5 Space Topology direction is accepted and must be preserved: Ordinary Level 0 reads as intentional spaces rather than an airy wall network, Pillar territory has continuous edge→core depth, Ordinary walls use the accepted chevron presentation, the separate protruding brown skirting geometry is gone, and World Lab can inspect Region depth.

Dev.6 is implemented on PR #52 and is the current release candidate. It keeps the accepted dev.5 topology while correcting fixture-state lighting, Pillar finish/clearance, curved Arch openings, Blackout visibility and the existing flashlight item behavior. The current candidate passes strict TypeScript, deterministic/system tests and the 10,000-Cell benchmark. Hosted Visual Coherence is still unreliable at the long software-rendered fixture traversal, so release acceptance must distinguish product failures from harness/runtime timing failures rather than blocking indefinitely on SwiftShader wall-clock movement.

The current corrective objective remains [Issue #50](https://github.com/xash-mind/Project-Noclip/issues/50), under Generation 3 #31 and Level 0 fidelity #37. Issue #46 is closed after its dev.4→dev.5 topology/Pillar-depth objective was delivered; unresolved Arch fidelity was explicitly carried into #50. Legacy Alpha-era Issue #11 is closed as superseded.

## Accepted dev.5 direction that must be preserved

Generation 3 remains world-first:

```text
seed + generation version
  -> kilometre-scale Region / Condition affinity Fields
  -> deterministic world-space Space Topology / walkable substrate
  -> architecture + continuous Region modifiers
  -> Euclidean Geometry + Materials + Conditions
  -> Carvers
  -> Structures
  -> Features / Items / Transitions
  -> runtime mutations + save deltas
  -> Cells as streaming/cache ownership only
```

Preserve:

- `gen3-v1` and schema-v2 save compatibility;
- Euclidean Geometry until explicitly scoped otherwise;
- stable semantic identities where possible and independent seed domains;
- the player-approved Space Topology architecture and its controlled small/one-entry spaces;
- Pillar continuous Region depth and the 7.2 m lattice;
- the accepted Ordinary chevron wall direction and removal of separate protruding brown skirting geometry;
- Region-depth QA tooling;
- Manila/Transition laws, renderer budgets and frozen Gen2 old-save isolation.

Do **not** solve dev.6 by returning to wall-probability tuning, Cell-authored rooms, fixed room templates, globally reducing pillar density, or widening into unsupported content.

## Current verification reality

For accepted production main commit `e6f5c7246d2d574e62c2ef4ec2738d1b3822f4e1`:

- main CI: **PASS**;
- Renderer Regression: **PASS**;
- Production Profile: **PASS**;
- canonical Production Smoke desktop Chromium journey: **PASS**;
- canonical Production Smoke landscape-touch journey: **PASS**;
- dev.5 Visual Coherence: **FAIL at the dedicated close-range fidelity capture step**, which correctly motivated #50.

For dev.6 PR #52:

- strict TypeScript/system tests: **PASS**;
- deterministic/system suite: **65/65 PASS** on the latest verified candidate;
- 10,000-Cell benchmark: **PASS**, including 0 placement errors and 0 sealed spaces;
- Pillar route/opening reservations: **PASS across multiple seeds**;
- curved Arch representation and route clearance regressions: **PASS**;
- bounded room light-field and fixture pulse synchronization regressions: **PASS**;
- Visual Coherence currently reaches the final long fixture traversal before failing to attain an exact 0.98 path-progress threshold under headless SwiftShader; this is treated as a harness/performance limitation unless reproduced as an actual gameplay collision;
- Renderer Regression on the prior candidate failed because this file still declared dev.4 as production. This STATUS reconciliation restores the correct dev.5 comparison baseline;
- perceptual audio quality remains **unverified** unless actually listened to;
- physical Android/iOS performance remains unmeasured.

## Current ready work

**Issue #50 — dev.6 fixture-state lighting, Pillar finish/clearance, true Arch openings and flashlight usability.**

The candidate implements:

1. coherent illumination from already-on visible fluorescent fixtures while retaining a bounded realtime-light budget;
2. synchronized off/on/flicker panel emission and emitted illumination, including truly non-emissive off fixtures;
3. Gen3 Pillars through the accepted Level 0 wallpaper grammar/scale;
4. one shared route/opening/landing reservation envelope so route-bearing openings cannot be obstructed by Pillars;
5. genuine curved Arch silhouettes while preserving continuous pale divider structure, lower panels where source-backed, headers, bay rhythm and complete ends;
6. route-bearing Arch collision clearance;
7. a functioning camera-mounted light for the existing flashlight item, preserving battery/charge behavior and Blackout use.

## Remaining known gaps

- Hole Carver border→core density and terminal-fall behavior remain separate work and are not part of dev.6.
- Perceptual fluorescent/HVAC/footstep/reverb quality remains unverified; no claim is made that audio fidelity is complete.
- Physical Android/iOS FPS, thermals, battery use and native-browser ergonomics remain unmeasured.
- Long-session memory growth remains unmeasured.
- Automated long-path visual capture under SwiftShader remains slower and less reliable than the product implementation itself; do not confuse harness wall-clock timeouts with proven gameplay regressions.

## Decisions needed from Sash

**None for this release.** The user explicitly requested continuation and production deployment of dev.6, with testing kept proportional to implementation risk rather than waiting indefinitely for flaky hosted visual traversal.

## Version policy

Project Noclip remains opted into the manual-project version indicator policy. Canonical production is currently `v0.3.0-dev.5` at `e6f5c7246d2d574e62c2ef4ec2738d1b3822f4e1`. PR #52 carries `v0.3.0-dev.6`; after merge and verified canonical production deployment, STATUS should advance its production release commit to the merged dev.6 SHA.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Production: https://project-noclip.vercel.app
- Generation 3 architecture: https://github.com/xash-mind/Project-Noclip/issues/31
- Level 0 fidelity: https://github.com/xash-mind/Project-Noclip/issues/37
- Dev.6 player-facing objective: https://github.com/xash-mind/Project-Noclip/issues/50
- Dev.6 implementation: https://github.com/xash-mind/Project-Noclip/pull/52
- Dev.5 Space Topology release: https://github.com/xash-mind/Project-Noclip/pull/49
- World vocabulary/catalog: `WORLD.md`
