# Project Noclip — Dev.5 Preview Player Audit

Date: 2026-08-13 (Asia/Kolkata)  
Accepted production baseline: `v0.3.0-dev.4`  
Preview candidate audited: PR #49 / `87a6b6e7805fde6c2c6b154e92f853e52f8b07b4` / `v0.3.0-dev.5` candidate  
Architecture target: #31  
Existing architecture/fidelity correction: #46 / #37  
New focused follow-up: #50

## Scope and evidence limits

Fresh independent reconciliation of current `main`, accepted dev.4 production state, the PR #49 dev.5 Space Topology candidate, open Issues, implementation, CI evidence, promoted Level 0 reference rules and the 2026-08-13 human dev.5 preview playtest. No product code or deployment was changed.

The Vercel bot records the current PR #49 preview as Ready, but this audit environment could not independently render the deployment: connected Vercel fetches returned upstream errors and direct external access was unavailable. Player-facing observations therefore use the supplied human preview test as direct runtime evidence and reconcile it against implementation. Audio was not genuinely heard and remains unverified.

GitHub Actions is also still externally blocked: all four workflows associated with PR #49 head `87a6b6e` conclude failure before executing any job step. The CI job reports an empty step list, consistent with the existing account billing/spending-limit runner allocation blocker. Local deterministic evidence in PR #49 is useful but is not equivalent to hosted release acceptance.

## Current reality

Accepted production remains `v0.3.0-dev.4`; `main` remains at documentation head `43f33addc1377602a5c338fe6e526c63b14cd8dd`. PR #49 is open/draft and is not production.

The current dev.5 candidate is materially different from the earlier Issue #46 wall-morphology experiment. It now implements an explicit Space Topology layer: roughly 33.6 m deterministic topology domains are subdivided into spaces first; mandatory/optional portals define connectivity; visible walls are then emitted from those intentional partitions and seams. Pillar depth can merge spaces before geometry. Arch grammar attaches to long intentional partitions.

The supplied human preview provides the strongest perceptual signal so far: Ordinary Level 0 finally reads well, and the additional architecture/topology layer is the change that made it feel intentional. This is a successful root-cause correction and should be preserved.

The same playtest exposes a coherent set of inherited presentation and QA-tooling defects. PR #49 does not touch renderer lighting, wall texture generation, wall skirting, World Lab UI or audio, so these are not evidence that the topology architecture is wrong.

## Player observation reconciliation

### Ordinary dev.5 finally feels good / the third generation layer makes the difference

**Confirmed — Vision-aligned improvement.** The candidate now generates architectural spaces and portal topology before wall realization. That is much closer to #31's architecture-first rule than the previous wall-first probability/morphology approach. Local PR evidence also reports zero sealed spaces in four sampled seeds, 20.2–26.4% one-entry spaces, 23.8–45.5% spaces <=55 m², 3.7–7.7% spaces >250 m², and 0% four-way BSP partition crosses. The player response indicates these metrics are now pointing toward the correct perceptual optimum rather than merely improving an abstract navigation score.

Classification: **PASS directionally / preserve this architecture.** Hosted and wider visual verification remain blocked.

### Fluorescent lights behave like proximity sensors

**Confirmed mechanism — Regression of player-facing intent / Quality.** The previous player-distance intensity multiplier is gone, but the current renderer still creates only eight realtime omni-light entities. Active fixture meshes remain emissive, while `selectSpatialFixtureLights` acquires a physical fixture light only within 21.5 m and retains it until 27.5 m. PlayCanvas light range is 23.5 m.

That produces the exact perceptual symptom described by the player: a ceiling panel can visibly look on while contributing no local realtime illumination, then gain a physical light contribution when the player approaches the acquisition envelope. The source energy itself is no longer multiplied by proximity, but physical-light allocation remains player-local.

Root problem: **visible source state and rendered illumination state are decoupled by a small player-centred realtime-light pool.**

The next implementation should preserve bounded GPU work while eliminating obvious approach-triggered illumination popping. This is tracked in #50.

### Add Region depth under Locate Region in World Lab

**Confirmed tooling gap / Quality.** World Lab currently exposes a Region selector plus `Locate nearest Region`; there is no depth/interior target. The dev.5 generator now exposes a continuous `pillarDepth` derived solely from kilometre-scale Pillar geography, while forced Pillar inspection intentionally returns only `pillarDepth: 0.30`. Natural deep Pillar is therefore implemented but difficult to deliberately inspect.

A Region-depth locator is the correct QA tool provided it searches natural continuous geography rather than creating Cell bands or mutating the Region into a template. For Pillar it should expose edge → mixed → core → deep-core samples. Arch may expose interior/affinity strength for navigation, but must not gain Pillar-style density escalation. Ordinary should not be given an invented false core law.

This is tracked in #50 because it is directly required to visually verify the dev.5 Pillar contract.

### Arch Rooms look poor

**Confirmed — Vision Gap / source-fidelity failure.** PR #49 greatly improves structural Arch diagnostics, but the human preview still rejects the actual rendered result. This repeats the exact acceptance lesson already recorded in #46: geometry diagnostics cannot substitute for silhouette/readability in the running game.

The dev.5 generator does emit a continuous header, solid lower band, vertical piers/shoulders and end terminations. It also aligns topology route portals to Arch bays. Structurally that is closer to REF-L0-007, but the current presentation still does not sell the source grammar to the player.

The Arch Region also receives only partial presentation differentiation in Gen3: the renderer forces the baseline profile for Gen3 floor, ceiling, trim and base fixture treatment; `arch-pale-wallpaper` changes selected wall tint only. This explains why the Region can remain visually too similar/yellow even when divider geometry is pale.

Root problem: **Arch acceptance is still geometry-led instead of whole-scene/player-led, and Gen3 presentation lacks a clean Region-aware Material/Condition path.**

### Some Arch openings look walkable but have collision; remove collision from hollow parts

**Confirmed as a player-facing affordance/collision problem; requested fix qualified.** Source inspection does not show one invisible collider spanning an entire Arch divider. Each emitted Arch wall piece receives a matching box collider. The current grammar intentionally contains two different things that can look similar:

- decorative arch-shaped apertures above a source-supported solid lower panel; and
- actual topology route bays where the lower band is cut so the route should be floor-clear.

Therefore wholesale removal of collision from every apparent arch aperture would violate REF-L0-007's solid lower-panel grammar. The correct requirement is stronger:

1. every actual topology route bay must be visibly floor-open and collider-clear;
2. decorative apertures with a lower panel must visually read as panelled openings, not doorways;
3. if runtime inspection finds a route bay blocked by an overlapping/hidden collider, that is a true regression and must be fixed.

This is tracked in #50 and must be verified in the rendered game, not inferred from diagnostics.

### Replace the Ordinary wallpaper with the original Backrooms wallpaper

**Confirmed — Vision Gap / source-fidelity failure.** The current `wall` texture is a hand-generated yellow canvas texture using noise, vertical wave lines, highlights and arc motifs. It is not a faithful recreation of the original wallpaper pattern.

Fresh source research identifies the real pattern as a 1990s Borden Home Wallcoverings southwestern/chevron wallpaper. Modern scans/recreations also show that the underlying material is substantially less yellow than the iconic photograph; the famous sickly cast is strongly affected by ageing, fluorescent illumination, camera response/white balance and print chemistry. This reinforces, rather than contradicts, the already-promoted REF-L0-001 rule that Level 0 should not literalize the photographic yellow cast into uniformly saturated intrinsic Materials.

The next implementation should reproduce the real chevron grammar and scale while preserving Gen3's accepted world-space texture phase continuity. Exact Material wording should be promoted to `WORLD.md` only after the replacement is visually verified against the source.

Tracked in #50.

### Remove the brown bottom part because the original does not have it / it has always been glitchy

**Partially rejected on source claim; confirmed on implementation failure.** REF-L0-001 explicitly records **shallow base trim** in the original visual evidence, so “the original has no trim at all” is not supported by the current authoritative project ledger.

However, the current renderer does not implement a subtle photographic base treatment. It adds a 0.22 m high wood-textured brown skirting box to every floor-touching wall piece, including small geometric extensions intended to hide seams. That universal brown band is visually prominent and structurally prone to the long-reported protrusion/join/clipping failures.

Root problem: **the renderer over-literalizes trim as a repeated wood geometry layer instead of a shallow source-faithful wall finish/join treatment.**

The correct next direction is to remove the current ubiquitous brown wood-skirt implementation or replace it with a much subtler source-faithful shallow trim system, with no doubled ends, z-fighting, protrusions or trim through openings. Do not change `WORLD.md` to “no base trim” without stronger source evidence.

Tracked in #50.

### Make Arch Rooms paler and adjust their lighting slightly

**Confirmed as a requested accepted presentation direction, constrained by source fidelity.** Current Gen3 architecture can tag pale walls but the renderer deliberately collapses most Gen3 presentation to the baseline profile. A minimal Region-aware Material/Condition/presentation path is therefore required if Arch territory is to read as coherently pale rather than as Ordinary rooms with isolated pale divider pieces.

The adjustment should remain subtle and source-led: pale divider/wall architecture, ordinary suspended ceiling identity, deep/wet carpet, and stable Euclidean navigation. It must not become a cinematic color grade, glass motif or unrelated horror-lighting effect.

Tracked in #50.

## Additional audit findings

### Release blocker — GitHub Actions still executes zero steps

**Critical / release blocker, not a product defect.** All four PR #49 workflows fail before actual test execution. The CI job has no recorded steps. Until account billing/spending-limit runner allocation is restored, the project cannot honestly claim the required hosted deterministic/system/benchmark/renderer/save/browser gates for dev.5.

The human preview is valuable evidence but does not replace those release gates.

### PR #49 should not be discarded or restarted

**Vision protection.** The player-positive Space Topology result is now the most important architectural fact in the project. Starting another generic wall-density rewrite would repeat the project’s earlier oscillation between sealed, airy and visually random layouts.

Future work should extend the topology candidate, not replace it, unless a new verified failure directly implicates the topology model.

### Audio remains unverified

**Debt.** No new audio observation was supplied and this audit could not genuinely listen to the runtime. Fluorescent buzz, HVAC/mechanical bed, footsteps, reverb, distance/occlusion, silence and dynamic range must remain explicitly unverified. Do not mark them PASS from code/tests alone.

### Hole border-to-core density remains valid but should not be pulled forward

**Later / ready after dev.5 finish.** #46’s Hole Carver gradient remains a valid source-compatible follow-up. It should not displace the current presentation/fidelity work while dev.5 itself is still draft and Arch/material/lighting acceptance is unresolved.

## Backlog reconciliation

- **#31 Generation 3 — keep open.** Still the correct strategic architecture. Dev.5 Space Topology is a strong implementation of its world-first architecture rule, not a reason to close the strategic issue.
- **#46 Dev.4 player audit — keep open, narrow to completion of the topology/Region-depth/Arch architecture correction.** Ordinary now has positive player evidence. Pillar core still lacks deliberate player inspection. Arch is still player-facing FAIL. The new inherited renderer/material/tooling defects should not bloat #46.
- **#50 Dev.5 player audit presentation/tooling — new active follow-up.** Owns fixture illumination popping, authentic wall finish/skirting, Arch readability/presentation and Region-depth World Lab tooling.
- **#37 Level 0 fidelity — keep open.** Directly governs wallpaper, Arch visual grammar, Pillar/Hole/Blackout source contracts and acceptance evidence.
- **#11 sensory/modular umbrella — stale as a work-selection surface.** Its old modular-room direction is superseded by #31 and much of its implementation scope has shipped. Keep it only as historical/sensory debt until remaining audio/renderer claims are explicitly split/revalidated; do not select #11 wholesale.
- **Hole Carver depth gradient — remains immediate later work after dev.5 finish; do not bundle it into #50 by default.**

## Recommended next objective

Finish dev.5 as a **presentation/fidelity and verification pass on top of the successful Space Topology candidate**, rather than beginning Region variants.

The highest-leverage bounded objective is #50:

1. remove perceptible player-distance fixture-light activation while preserving a bounded light budget;
2. replace the invented Ordinary wall pattern with a source-faithful Borden chevron treatment and eliminate the current prominent/glitchy brown wood skirt;
3. make Arch route bays collider-clear/readable, make decorative apertures visually honest, and give Arch the minimal source-supported pale/lighting presentation it currently lacks;
4. add Region-depth World Lab inspection so natural Pillar core can finally be deliberately tested;
5. run full deterministic/renderer/browser/save/performance/visual gates when GitHub Actions is available and obtain representative Ordinary/Pillar/Arch captures before merge/release.

Out of scope: new Regions/Variants, Hole density implementation unless separately authorized, new Non-Euclidean behaviour, entities/combat, save-schema changes, unrelated audio redesign, new signature motifs, or replacing Space Topology.

## Tracking outcome

- Created Issue #50 for the newly verified coherent follow-up.
- Added the dev.5 human preview acceptance/failure evidence to Issue #46.
- `STATUS.md` intentionally unchanged: accepted production remains dev.4 and dev.5 is still an unmerged draft candidate.
- `WORLD.md` intentionally unchanged: the audit identifies a stronger wallpaper source and implementation defects, but no newly shipped Material/Region rule exists yet.
- Notion intentionally unchanged because no accepted release/project-state fact changed.
- No product code or deployment changed.
