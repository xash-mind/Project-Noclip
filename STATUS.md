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

Canonical production now serves `v0.3.0-dev.5`. The dev.5 Space Topology direction is a material improvement and must be preserved: Ordinary Level 0 now reads as intentional spaces rather than an airy wall network, Pillar territory has continuous edge→core depth, Ordinary walls use the accepted chevron presentation, the separate protruding brown skirting geometry is gone, and World Lab can inspect Region depth.

Dev.5 is **not** accepted as completion of Level 0 fidelity. The first post-release human audit plus the project’s own current release artifacts confirm a coherent presentation gap: fixture illumination still behaves perceptually like a player-local resource, off/flicker fixture glow is not synchronized correctly with illumination state, Pillar props still render through the legacy wall-material path, Pillar/opening clearance is split across separate rules, and Arch dividers are built from rectangular boxes that read as T-shaped frames rather than actual arch-shaped openings.

The current corrective objective is [Issue #50](https://github.com/xash-mind/Project-Noclip/issues/50), under Generation 3 #31 and Level 0 fidelity #37. Issue #46 is closed after its dev.4→dev.5 topology/Pillar-depth objective was delivered; unresolved Arch fidelity was explicitly carried into #50. Legacy Alpha-era Issue #11 is closed as superseded.

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

For current main commit `e6f5c7246d2d574e62c2ef4ec2738d1b3822f4e1`:

- main CI: **PASS**;
- strict TypeScript/system tests/benchmark/build on the dev.5 candidate: **PASS**;
- Renderer Regression: **PASS**;
- Production Profile: **PASS**;
- canonical Production Smoke desktop Chromium journey: **PASS**;
- canonical Production Smoke landscape-touch journey: **PASS**;
- Production Smoke overall workflow: **FAIL only in the final GitHub evidence-publishing step** after both runtime journeys passed; the evidence artifact was uploaded;
- Visual Coherence workflow: **FAIL at the dedicated close-range dev.5 fidelity capture step** after typecheck/tests/benchmark/build succeeded;
- physical Android/iOS performance remains unmeasured;
- perceptual audio quality was not genuinely listened to in the current audit and remains **unverified**.

The failed Visual Coherence gate matters: structural metrics and generic browser smoke did not protect the player-facing lighting/Pillar/Arch requirements. Dev.6 must make that close-range fidelity evidence a real release gate rather than treating it as optional evidence.

## Current ready work

**Issue #50 — dev.6 fixture-state lighting, Pillar finish/clearance and true Arch openings.** This is the largest safe coherent next objective because all current high-impact complaints are presentation/geometry integration defects around an otherwise successful dev.5 architecture.

1. Make already-on visible fluorescent fixtures and room illumination perceptually coherent without creating an unbounded realtime light per fixture.
2. Make off panels visibly grey/non-emissive; drive flicker panel emission and illumination from the same deterministic pulse/state while preserving reduced-flicker behavior.
3. Route Gen3 pillars through the same accepted Level 0 wallpaper grammar/scale as surrounding walls.
4. Unify route/opening/landing reservation so route-bearing openings cannot be obstructed by pillars without globally reducing Pillar density.
5. Replace rectangular Arch shoulders/T-frame silhouettes with genuine arch-shaped openings while preserving the continuous pale divider, lower panel where source-backed, header, vertical bay rhythm and complete terminations.
6. Preserve route-bearing Arch collision clearance; decorative lower-panel apertures may remain solid only when they clearly read as non-doorways per #37.
7. Require completed representative visual/runtime evidence before the dev.6 release boundary.

## Remaining known gaps

- Hole Carver border→core density and terminal-fall behavior remain separate work and are not part of dev.6.
- Perceptual fluorescent/HVAC/footstep/reverb quality remains unverified in this audit; no claim is made that audio fidelity is complete.
- Physical Android/iOS FPS, thermals, battery use and native-browser ergonomics remain unmeasured.
- Long-session memory growth remains unmeasured.
- Primitive/placeholder geometry remains in parts of the project; Arch is the current player-facing priority because its primitive construction directly violates the promoted source silhouette.
- Deployment-storm prevention remains process debt; implementation runs must keep to one preview and one deploy maximum.

## Decisions needed from Sash

**None for the next bounded run.** The current player report, source-backed #37 contract and implementation evidence are sufficient to execute #50 without inventing new world behavior.

## Version policy

Project Noclip remains opted into the manual-project version indicator policy. Canonical production is `v0.3.0-dev.5` at `e6f5c7246d2d574e62c2ef4ec2738d1b3822f4e1`. The next accepted product release should be `v0.3.0-dev.6`; do not bump the visible version merely for an audit/docs change.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Production: https://project-noclip.vercel.app
- Generation 3 architecture: https://github.com/xash-mind/Project-Noclip/issues/31
- Level 0 fidelity: https://github.com/xash-mind/Project-Noclip/issues/37
- Dev.6 player-facing objective: https://github.com/xash-mind/Project-Noclip/issues/50
- Dev.5 Space Topology release: https://github.com/xash-mind/Project-Noclip/pull/49
- World vocabulary/catalog: `WORLD.md`
