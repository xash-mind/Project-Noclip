# Project Noclip dev.5 Release Audit — 2026-08-13

## Scope

Fresh independent post-release audit of `xash-mind/Project-Noclip`, focused on the accepted Level 0 Generation 3 experience after PR #49 and the player report supplied on 2026-08-13.

Reconciled sources included `AGENTS.md`, `PROJECT.md`, `STATUS.md`, `WORLD.md`, `docs/VISION.md`, Generation 3 #31, Level 0 fidelity #37, dev.4 audit #46, dev.5 preview audit #50, legacy #11, PRs #49/#51, current main, current GitHub Actions evidence, current Vercel production identity, the actual lighting/renderer/Space-Topology implementation, and the current release artifacts/screenshots.

No product code was modified and no preview/production deployment was created by this audit.

## Source and deployment

- Repository/branch audited: `xash-mind/Project-Noclip` / `main`
- Tested/current production commit: `e6f5c7246d2d574e62c2ef4ec2738d1b3822f4e1`
- Visible version: `v0.3.0-dev.5`
- Deployment: `https://project-noclip.vercel.app`
- Provider evidence: current production deployment is Ready at the same main SHA
- Save schema: `v2`
- New-journey generation: `gen3-v1`
- Roles/accounts tested: public game journey only; no role model applies

## Executive result

**PASS WITH MATERIAL PLAYER-FACING GAPS.**

The dev.5 Space Topology architecture is a strong improvement and should be preserved. Production browser and landscape-touch journeys pass, current main CI is healthy, and the core Generation 3 direction is substantially closer to the project vision than dev.4.

However, dev.5 should not be treated as fidelity-complete. The current release artifacts reproduce three highly visible defects reported by the player:

1. bright fluorescent fixture meshes can exist in rooms whose actual illumination remains dark/flat until realtime source allocation catches up;
2. Pillar cores use a visibly different legacy stretched/wavy wall treatment instead of the accepted Level 0 chevron wallpaper path;
3. Arch dividers are rectangular box assemblies that read as repeated T-shaped frames rather than actual arch-shaped openings.

Additional code reconciliation confirms off fixture panels retain nonzero emission, flicker changes physical-light energy without updating fixture-mesh glow through the same pulse, and Pillar/opening clearance is split across multiple reservation/cut rules.

These are implementation-quality/source-fidelity failures around an otherwise successful architecture, not justification for another generator rewrite.

## Quality scores

| Category | Score | Evidence |
|---|---:|---|
| Functionality | 8/10 | Desktop and landscape-touch production journeys pass; representative Arch route crossing works; no current browser errors in release artifacts. |
| Reliability | 7/10 | Main CI/renderer/profile healthy, but Visual Coherence failed at its dedicated fidelity capture and release evidence publishing also failed. |
| UI consistency | 7/10 | Core journey/version/World Lab are coherent; visual material/state inconsistency between walls, pillars and fixtures is conspicuous. |
| UX / immersion | 5/10 | Space Topology is substantially better, but lighting pop/dark rooms, mismatched pillars and fake-looking arches directly expose the procedural implementation. |
| Learnability | 8/10 | Existing journey controls/tooling remain available and browser smoke passes. |
| Accessibility | 6/10 | Reduced-flicker path exists and must be preserved; physical mobile and perceptual flicker verification remain incomplete. |
| Responsiveness | 7/10 | Browser/touch journeys pass; physical-device behavior remains unmeasured. |
| Performance | 8/10 | Current benchmark/renderer budgets are healthy; lighting remains intentionally bounded to avoid unbounded per-fixture realtime work. |
| Release readiness | 5/10 | dev.5 is mechanically live/playable but fails the intended close-range visual/fidelity standard; dev.6 should correct these before Region/content expansion. |

## Feature matrix

| Area | Result | Evidence | Issue |
|---|---|---|---|
| Generation 3 Space Topology | Passed | Current main/PR #49; player directionally approves intentional rooms/spaces | #31 / completed #46 |
| Ordinary Level 0 wall finish | Passed directionally | Current walls use dev.5 chevron presentation; separate protruding brown skirting removed | #37 / #50 |
| Fluorescent room illumination | Failed | Production release screenshot shows bright fixture panels over dark/flat room; runtime has only 8 realtime omni slots | #50 |
| Off/flicker fixture visual state | Failed | Off material retains emission; flicker mesh does not share the physical-light pulse | #50 |
| Pillar Region depth/lattice | Passed directionally | Natural edge/interior/core/deep-core captures and 7.2 m lattice exist | #31 / #37 |
| Pillar wallpaper fidelity | Failed | Deep-core captures visibly use legacy stretched/wavy prop-wall material path | #50 |
| Pillar/opening clearance | Failed / intermittent | Explicit portal exclusion exists, but later opening/landing cuts use separate clearance logic | #50 |
| Arch visual silhouette | Failed | Current capture is a rectangular lower-band/header/pier/shoulder assembly rather than true arches | #37 / #50 |
| Arch route collision | Passed with readability risk | Representative before/after route capture crosses a route-bearing bay; overhead pieces are filtered from 2D nav colliders | #50 |
| Save/browser baseline | Passed | Renderer/save regression and production desktop/touch journeys pass | #31 / #50 |
| Perceptual audio fidelity | Untested | Audio was not genuinely listened to in this audit | later focused audit |
| Physical Android/iOS performance | Untested | No physical-device FPS/thermal/battery measurements | later |

## Confirmed findings

### Vision Gap — fluorescent illumination still exposes player-local light allocation

- Affected user: every player traversing ordinary/Pillar/Arch territory.
- Reproduction: walk toward already-visible bright fixtures in current dev.5; production release artifact already shows multiple bright panels over a dark room.
- Expected: active visible fluorescent fixtures read as already lighting the environment according to source-centric falloff and world state.
- Actual: fixture meshes can be bright while room illumination is missing/flat; lighting contribution can appear later as nearby realtime source ownership changes.
- Evidence: `src/world/lighting.ts` uses 23.5 m physical range with 30 m acquire / 35 m release; `ProjectNoclipGame.ts` owns only eight realtime omni lights; production smoke artifact shows the resulting perceptual mismatch.
- Likely root cause: the dev.5 fix moved the acquisition threshold outward but did not remove the underlying visible-fixture → bounded-player-local-source virtualization mismatch.
- Fix direction: preserve bounded realtime work but give active visible/loaded fluorescent fields a coherent clustered/light-field/static contribution, reserving the small realtime pool for local/high-frequency detail and flicker where appropriate.
- Acceptance: approach/pass/retreat capture shows no obvious active-fixture illumination pop; performance/budget remains healthy.
- Regression test: perceptual capture/measurement must inspect actual fixture mesh + surrounding illumination, not merely source ownership distances.
- GitHub issue: #50.

### Regression — off and flicker fixture glow are not state-coherent

- Expected: off panel is grey/non-emissive; flicker panel glow and emitted illumination switch together.
- Actual: off materials retain a small emissive value; flicker illumination pulse varies while the mesh remains on a static bright flicker material.
- Root cause: generated Light Group state/pulse drives the physical light but fixture material emission is chosen at cell-load time rather than updated from the same runtime pulse.
- Fix direction: one deterministic runtime fixture-state value must drive both illumination and mesh emission; preserve reduced-flicker behavior.
- GitHub issue: #50.

### Source-fidelity failure — Pillar props do not use the accepted Level 0 wallpaper rendering path

- Expected: broad rectangular wallpaper-clad floor-to-ceiling piers using ordinary Level 0 finishes per #37/WORLD.
- Actual: current deep-Pillar captures show old stretched/wavy yellow treatment on pillars beside accepted chevron walls.
- Root cause: Gen3 pillar props carry `materialId: level-0-wallpaper`, but column props are still rendered through the legacy prop material/UV path; the dev.5 fidelity pass replaces structural walls only.
- Fix direction: share the accepted wallpaper grammar/scale/material path across structural walls and pillar faces with deterministic orientation/phase.
- GitHub issue: #50.

### Quality — Pillar and opening clearance use duplicated reservation logic

- Expected: route-bearing portals/openings/landings are deterministically clear.
- Actual: pillar placement excludes explicit portals, but additional landing/opening cuts are derived separately, allowing occasional pillars to read as sitting inside openings.
- Root cause: no single canonical reserved-route/opening envelope is consumed by both wall carving and pillar placement.
- Fix direction: unify deterministic route/opening/landing reservation and use it everywhere; do not globally reduce Pillar density.
- GitHub issue: #50.

### Vision Gap / source-fidelity failure — Arch geometry is not an arch

- Expected: continuous pale divider/wall with repeated actual arch-shaped openings, solid lower panel where source-backed, continuous header, vertical bays and complete end terminations.
- Actual: rectangular lower bands + headers + vertical piers + rectangular shoulders form repeated T-like frames.
- Root cause: `addArchWall`/`ARCH_*` geometry is constructed entirely from rectangular boxes; structural tests prove alignment/clearance but never require a curved intrados/silhouette.
- Fix direction: deterministic curved or sufficiently smooth segmented/mesh arch-opening geometry integrated into the continuous divider; preserve the accepted Space Topology and Region presentation.
- Acceptance: representative whole-divider captures compare against #37 / REF-L0-007 and visibly read as arches at normal play distance.
- GitHub issue: #50.

### Quality — Arch collision rule needs route/decorative distinction, not “all holes are doorways”

- Current positive evidence: dev.5 removes overhead Arch pieces from the 2D navigation collider set and a representative route before/after capture shows traversal through a route-bearing bay.
- Source constraint: #37 intentionally supports solid lower panels below decorative arch apertures.
- Required rule: every topology route bay is floor-clear/player-radius-clear and collision-free; decorative apertures may remain solid below only when the lower panel visibly reads as a wall/panel rather than a doorway.
- GitHub issue: #50.

### Debt / release-process regression — visual acceptance failed but the release proceeded

- Current main CI: pass.
- Renderer Regression: pass.
- Production Profile: pass.
- Production Smoke desktop journey: pass.
- Production Smoke landscape-touch journey: pass.
- Production Smoke overall: fail only after those journeys, in the evidence-publishing step.
- Visual Coherence: fails in the dedicated close-range dev.5 fidelity capture after typecheck/tests/benchmark/build pass.
- PR #49 was merged/deployed while its body still described missing perceptual evidence and production as dev.4.
- Impact: automation proved mechanical health but did not protect exactly the visual requirements the human immediately rejected.
- Fix direction: dev.6 release must require the dedicated close-range evidence to complete and explicitly classify lighting/Pillar/Arch as PASS / PASS WITH KNOWN GAPS / FAIL.
- GitHub issue: #50.

## First-time-user and time-waste analysis

The main player time-waste is perceptual rather than navigational. Dev.5’s Space Topology now creates more intentional rooms, so the player is less likely to immediately dismiss the generator as empty/open. But the remaining defects reveal the implementation in high-frequency cues the player constantly sees: fluorescent fixtures, wallpaper continuity and Arch silhouettes. That damages trust faster than a rare content defect because every room repeatedly teaches the player that visuals are approximations rather than a coherent place.

World Lab Region-depth tooling is useful and should be preserved. The next run should use it deliberately to inspect Pillar edge/interior/core/deep-core rather than relying on random traversal.

## Untested areas

- Perceptual audio was not genuinely played/listened to. Fluorescent/HVAC/footstep/reverb quality is therefore unverified; no claim is made that audio fidelity passes.
- Physical Android/iOS FPS, thermals, battery behavior and native browser ergonomics remain unmeasured.
- Long-session memory growth remains unmeasured.
- This audit did not perform new product-code instrumentation or create a new deployment; it relied on current production/runtime/provider identity plus current release artifacts and implementation evidence.

## Backlog reconciliation

- **#31 — keep open.** Still the correct Generation 3 target architecture.
- **#37 — keep open.** Still the authoritative Level 0 fidelity umbrella; the Pillar wallpaper and true-Arch failures directly violate it.
- **#46 — close as completed/superseded at the implementation boundary.** Its dev.4→dev.5 Space Topology/Pillar-depth objective landed; unresolved Arch fidelity is explicitly carried into #50.
- **#50 — rewrite/keep open as the dev.6 bounded objective.** Now captures lighting-state coherence, Pillar finish/clearance, true Arch silhouette and visual-release acceptance.
- **#11 — close not-planned/superseded.** Its Alpha-era modular-room architecture conflicts with #31 and should not remain an active target; still-valid sensory concerns can be tracked separately when verified.
- **PR #51 — close without merge.** Its snapshot says production remains dev.4 and is stale after the live dev.5 release.
- **WORLD.md — no change.** The audit found defects against existing durable world rules; it did not establish a new world rule.

## Repair order

1. Fix lighting-state coherence at the correct abstraction: bounded but visually coherent active fixture field; off/flicker mesh state synchronized with illumination.
2. Unify Pillar material path and route/opening reservation without changing accepted Region density/topology.
3. Replace rectangular Arch shoulders with actual arch-opening geometry while preserving source-backed divider structure and collision semantics.
4. Run deterministic/system/benchmark/build/renderer/save/browser gates and the dedicated close-range fidelity capture.
5. Only if those pass, bump to `v0.3.0-dev.6`, merge and perform the single production deploy.
6. Leave Hole, audio redesign, Region variants and later content for separate boundaries.

## Release or handover verdict

**Do not expand into Region variants/content yet.** The correct next release is a bounded dev.6 fidelity correction. The architecture beneath it is now good enough that another broad generator rewrite would be counterproductive.

## Decisions needed from Sash

None for the next bounded run. The player report, current implementation evidence and existing #37 world rules are sufficient.
