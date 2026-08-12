# Project Status

**Last verified runtime:** 2026-08-12 (Asia/Kolkata)  
**Canonical production:** https://project-noclip.vercel.app  
**Production release commit:** `5b8c95e19ea3104d21e218229c9bd2d25277d8c0`  
**Visible deployed version:** `v0.3.0-dev.4`  
**Product change source:** PR #43 / squash merge `c17da1ef81e96a7d46cf75b221f189925dae4628`, release commit `5b8c95e19ea3104d21e218229c9bd2d25277d8c0`  
**Save schema:** `v2`  
**New-journey generation:** `gen3-v1`  
**Current architecture direction:** Generation 3 — GitHub Issue #31  
**World vocabulary/catalog:** `WORLD.md`

## Health

**Canonical production is accepted at `v0.3.0-dev.4`.** Vercel reports the exact release commit `5b8c95e19ea3104d21e218229c9bd2d25277d8c0` as a completed/Ready production deployment and points the deployment to `https://project-noclip.vercel.app`.

The release commit changes only `VERSION` from `0.3.0-dev.3` to `0.3.0-dev.4`. Its parent is the PR #43 squash merge. The squash merge and the accepted PR head share the exact Git tree `52e83fb9623970ef6f84556b6dabc9e1215e1adc`, so merge did not alter the accepted candidate runtime.

### Verification exception

GitHub Actions is currently unable to allocate any runner for this repository because the account reports a billing/spending-limit block. Consequently, a new canonical-production Chromium journey could not execute after the final Vercel deployment. This is an external verification-infrastructure failure, not a test or runtime failure, and must not be presented as a green fresh-production browser run.

Production acceptance therefore rests on all of the following together:

- Vercel completed/Ready status for the exact release SHA and canonical production route.
- The release commit is VERSION-only relative to the accepted main runtime tree.
- **56/56 deterministic/system tests** passed repeatedly on the candidate runtime before the Actions account block.
- The rewritten 10,000-Cell benchmark passed repeatedly with zero placement errors and runtime generation safely below the 500 us/Cell budget.
- Renderer regression passed on the candidate runtime with schema-v2 / `gen3-v1` save-reload preservation and zero browser errors.
- The close-range Visual Coherence browser run passed on the runtime-equivalent candidate and produced deterministic captures for Ordinary joins/seams, mixed Pillar territory, Arch seams and lighting appearance.

Once GitHub Actions billing is restored, rerun canonical production smoke and Visual Coherence as confirmation. Do not change product behavior merely to clear the infrastructure failure.

## `v0.3.0-dev.4` — Generation 3 world-coherence release

Dev.4 is the material response to the dev.3 player audit. It is not another density-tuning pass.

### Root causes corrected

- Dev.3 still generated blocking architecture first and only had a legacy logical connectivity concept; actual Gen3 wall/solid colliders were never flood-filled before acceptance.
- Ordinary Level 0 still relied on independent long partition runs plus optional orthogonal companions, producing both sealed/clumped spaces and globally bypassable halls.
- Region identity was sampled too coarsely and could still behave like a Cell-level generator switch rather than a continuous local modifier.
- Pillar Field defaults strongly suppressed Ordinary partitions, making the median experience a near-pure enormous lattice.
- Arch bay geometry could be shaped after streaming clipping, allowing Cell fragments to influence visible divider rhythm.
- Gen3 wallpaper repeats restarted/rounded per rendered wall fragment and skirting extended beyond solved wall spans.
- Realtime fixture lights were selected by nearest-N order, allowing ownership churn while walking.
- Routine instability/presentation budgets were too broad, weakening the contrast between normal Level 0 and true anomalies.

### Architecture now accepted

Generation 3 now follows this world-first order:

```text
seed + generation version
  -> kilometre-scale Region / Condition affinity Fields
  -> deterministic world-space walkable/connectivity substrate
  -> local partition-segment solver + continuous Region modifiers
  -> Euclidean Geometry + Materials + Conditions
  -> Carvers
  -> Structures
  -> Features / Items / Transitions
  -> runtime mutations + save deltas
  -> Cells as streaming/cache ownership only
```

Ordinary candidate wall/opening segments use stable world coordinates, continuous architecture Fields, local neighboring segment state, room-scale/sightline pressure and the reserved passage graph. Walls shape already-valid space rather than accidentally deciding connectivity after the fact.

Regions now modify that same substrate spatially. Compatibility `zoneId` remains metadata and is not the player-visible Gen3 generation authority. Cell boundaries do not decide room shape, wall rhythm, Arch shape, wallpaper phase or Region transitions.

## Player-facing coherence evidence

### Navigation: dev.3 baseline -> dev.4

The new actual-collider flood-fill exposed why dev.3 could pass structural counts while normal play failed:

- Dev.3 four-sample forced-Ordinary average reachable area: **~1.37%**.
- Dev.3 average isolated pockets: **~308**.
- Dev.3 sampled Cell-boundary traversal: **0 Cells crossed**.
- Dev.3 canonical `threshold-001` spawn: **35 / 46,794 walkable nodes reachable (~0.07%)**.

Accepted dev.4 benchmark:

- Ordinary reachable-area ratio: **0.9974**.
- Ordinary isolated-area ratio: **0.0026**.
- Isolated pockets across the large sampled windows: **3**.
- Dead-end depth: **0.52 m**.
- Mean Cells crossed: **11.5**.
- Estimated local open-space distribution: **P50 218.54 m² / P90 792.57 m² / P99 1646.4 m²**.

The permanent system tests also require forced World Lab Ordinary/Pillar/Arch areas to remain navigable at player clearance and generate the full natural Ordinary↔Pillar and Ordinary↔Arch transition corridors to prove collider paths in both directions.

### Pillar Fields

- World lattice spacing remains **7.2 m**.
- Generated pier width is exactly **90% of dev.3**, measured **1.395–2.0695 m**.
- Common Pillar territory: **7.925 Ordinary walls/Cell + 1.297 columns/Cell**.
- Rare deep-field territory: **4.978 walls/Cell + 2.283 columns/Cell**.
- Across 24 natural-region samples, deep-field occupancy was **1.84%** of sampled Pillar traversal.
- Deep runs: **P50 56 m / P90 112 m / maximum 224 m**.

Common Pillar therefore remains recognizably Level 0 with walls/rooms plus interrupted pillar groups and medium open sections; huge regular wall-sparse fields remain an exceptional deterministic extreme.

### Arch Rooms

- Divider/span ownership is solved in world space before streaming clipping.
- Normal repeated bays are exactly symmetrical within their divider rhythm.
- Across **2,565** sampled dividers, **48** were explicit irregular variants: **1.87%**.
- The diagnostic observed **380** intentional bay widths while normal symmetry delta remained zero.
- Seam reconstruction and overlap tests reject Cell-sliced malformed openings and overlapping Arch pieces.
- The Visual Coherence browser evidence showed the selected cross-Cell pale span without a Cell edge slicing the opening; surrounding pale enclosure walls remain part of the same navigation network.

### Normal-first anomaly budget

Across the accepted 10,000-Cell sweep:

- disorienting Cells: **2 / 10,000 = 0.02%**;
- hallucination anchors: **0** in that sweep;
- OFF light-group rate: **0.077%**;
- flicker-group rate: **0.668%**.

Rendering seams, clipping, UV resets and lighting swaps remain defects, never anomaly content.

## Renderer / wall-base correction

For Gen3 wallpaper walls, UV phase now derives from stable world-space wall coordinates/orientation rather than each streaming fragment. Repeat length is no longer independently rounded per clipped renderer piece. Skirting follows the exact solved wall span instead of deliberately protruding beyond fragment ends.

The successful close-range Visual Coherence artifact was manually inspected:

- T-junction/skirting termination showed no obvious doubled or protruding trim.
- The selected cross-Cell continuous Ordinary wall showed continuous wallpaper phase without an obvious texture restart.
- Common Pillar capture visibly contained both Ordinary partitions and wallpaper-clad columns.
- The selected Arch seam did not visibly slice an opening at the Cell boundary.

The dedicated `wallBase` camera target was subsequently corrected to pitch downward because its first successful artifact looked upward and was not valid wall-bottom evidence. That target correction changes QA only; the wall renderer did not change afterward. A fresh capture of that corrected target remains pending the GitHub Actions billing restoration. T-junction and cross-Cell captures already include visible wall/skirting bases and are retained as the accepted visual evidence available in this run.

## Lighting correction

Realtime fixture source energy remains independent of player distance. Bounded PlayCanvas realtime slots now use stable acquire/release hysteresis so a fixture does not disappear merely because another fixture becomes fractionally nearer.

A deterministic movement regression walks through fixture-order crossings and requires ownership to stay stable until sources genuinely leave the release range. Blackout continues to require exactly zero local fixture work.

The successful browser Visual Coherence artifact captured before/after lighting appearance without an obvious fixture/source pop. Its hosted synthetic keyboard movement did not move the player, so those images are appearance evidence only; the deterministic movement test is the authoritative motion-based lighting gate.

## Performance and browser evidence

Accepted candidate evidence includes:

- strict TypeScript passed;
- **56/56 tests passed**;
- production build passed;
- representative 10,000-Cell runtime-generation run: **~295 us/Cell**, validation **~3 us/Cell** separately, max **48 walls/Cell**, max **5 props**, max **4 fixtures**, **0 placement errors**;
- renderer regression default spawn: **49 loaded Cells, 386 colliders, 9 interactions, 142 draw calls**, below explicit caps of 1,200 colliders / 160 interactions / 220 draw calls;
- renderer save/reload preserved schema `v2`, `gen3-v1`, seed, character and exact save position with zero browser errors;
- Visual Coherence browser capture workflow completed successfully on the candidate runtime after replacing unreliable full-page SwiftShader screenshots with direct WebGL-canvas capture;
- hosted mobile look delivery was identified as a CDP/device-pixel-ratio test-harness issue; the permanent harness now expresses the gesture in CSS-pixel semantics while compensating only the injected CDP coordinates. A final full mobile rerun is pending Actions billing restoration.

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

Existing pre-versioned journeys remain on frozen `gen2`; new journeys persist `generationVersion: gen3-v1`. Cells remain streaming/cache units only. Playable Geometry remains Euclidean.

## Current ready work

The next meaningful acceptance input is a normal human player audit of live dev.4, focusing on:

- whether Ordinary now reads as believable continuously varying rooms/connectors rather than cages or scattered halls;
- whether routes genuinely force local commitment without creating traps;
- whether Pillar and Arch territory feel like changing Level 0 rather than separate Levels;
- whether Arch rhythm reads ordered in ordinary cases;
- whether the wall base/skirting defect is perceptually gone in normal play;
- whether lighting remains stable while walking.

Do not tune wall count merely to satisfy historical dev.3 density metrics. Player-facing navigability/coherence gates are now authoritative.

## Remaining known gaps

- GitHub Actions account billing/spending limits currently prevent fresh runner allocation. Rerun production smoke, Visual Coherence and the corrected mobile gesture harness once that account issue is resolved.
- Physical Android/iOS FPS, thermals, battery use and native-browser ergonomics remain unmeasured.
- Long-session memory growth remains unmeasured.
- Primitive geometry remains placeholder-quality in places.
- The corrected dedicated wall-base close-up screenshot remains pending the Actions runner restoration, although T-junction/cross-Cell base evidence passed visual inspection.
- Human play remains the final judge of Level 0 perceptual fidelity; automated navigability metrics cannot prove that the world feels correct.

## Decisions needed from Sash

**None for this release.** `v0.3.0-dev.4` is deployed. The next useful product input is a normal player audit of the live build; the separate GitHub Actions billing problem only blocks additional automated confirmation.

## Version policy

Project Noclip remains opted into the manual-project version indicator policy. Canonical production is `v0.3.0-dev.4` at release commit `5b8c95e19ea3104d21e218229c9bd2d25277d8c0`.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Production: https://project-noclip.vercel.app
- Generation 3 architecture: https://github.com/xash-mind/Project-Noclip/issues/31
- Level 0 fidelity: https://github.com/xash-mind/Project-Noclip/issues/37
- Dev.4 world-coherence release: https://github.com/xash-mind/Project-Noclip/pull/43
- Dev.4 squash merge: https://github.com/xash-mind/Project-Noclip/commit/c17da1ef81e96a7d46cf75b221f189925dae4628
- Dev.4 release commit: https://github.com/xash-mind/Project-Noclip/commit/5b8c95e19ea3104d21e218229c9bd2d25277d8c0
- Dev.4 Vercel deployment inspector: https://vercel.com/xash-mind0/project-noclip/KhVmpkxBrBez3UrVx6VwV5ScGGbA
- Dev.4 successful Visual Coherence run: https://github.com/xash-mind/Project-Noclip/actions/runs/31597450947
- Dev.4 successful renderer regression: https://github.com/xash-mind/Project-Noclip/actions/runs/31586037320
- World vocabulary/catalog: `WORLD.md`
- Shared operations: https://github.com/xash-mind/project-operations
