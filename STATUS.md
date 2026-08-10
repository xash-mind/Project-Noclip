# Project Status

**Last verified:** 2026-08-10 (Asia/Kolkata)  
**Accepted runtime source:** `1fc056b84fb1361872bb965b6df44c058f4b114e` from PR #28  
**Production release commit:** `1fc056b84fb1361872bb965b6df44c058f4b114e`  
**Production:** https://project-noclip.vercel.app — HTTP 200, desktop and landscape-touch journeys verified  
**Visible deployed version:** `v0.2.0-dev.6`  
**Verification:** final-head CI, focused deterministic light/audio tests, 10,000-cell sweep, renderer comparison and canonical production smoke passed

## Health

**Healthy.** Level 0 Alpha 0.2 now derives fluorescent fixture groups deterministically from canonical cell state and aggregates nearby loaded groups into one bounded fluorescent field. On/off/flicker state, intensity, temperature and phase remain renderer-independent derived state; fixture placement rejects wall and ceiling-reaching structural overlap; `reducedFlicker` holds flicker groups steadily lit and suppresses flicker transients.

The field is sampled at no more than 10 Hz within a 37.8 m radius and drives the existing single player-local fluorescent light plus the existing single reused Web Audio graph. No per-fixture PlayCanvas lights or persistent audio graphs were added. Deterministic district/connector laws, canonical cell addresses, room-archetype selection, timeline gates, stable world/item/surface identities, collision behavior and IndexedDB save schema v2 remain unchanged.

The root `VERSION` and removable development indicator are aligned on canonical production at **`v0.2.0-dev.6`**.

## Current milestone

[Issue #27](https://github.com/xash-mind/Project-Noclip/issues/27) is complete and deployed through [PR #28](https://github.com/xash-mind/Project-Noclip/pull/28).

There is no separate ready bounded successor issue. Broad [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) is now the only open product issue and still mixes spatial work such as modular room composition with renderer-geometry claims. Draft [PR #12](https://github.com/xash-mind/Project-Noclip/pull/12) remains reference/donor material and must not be resumed or merged wholesale.

## Working now

- Browser-first TypeScript/Vite runtime using PlayCanvas Engine
- Renderer-independent deterministic world generation and stable identities
- Deterministic 5×5 district planning with sixteen current room archetypes
- Continuous ordinary Level 0 carpet presentation and sparse overlap-safe optional scenery
- Deterministic fixture light groups with stable IDs and bounded on/off/flicker state
- Fixture clearance against walls and ceiling-reaching structural geometry
- One 37.8 m clustered fluorescent field sampled at a maximum 10 Hz from already-loaded group descriptors
- Shared field driving the existing player-local fluorescent light and single reused procedural Web Audio graph
- Reduced-flicker mode that preserves steady illumination without synchronized flicker transients
- Swept-circle movement collision, timeline gates and IndexedDB save schema v2
- Static PlayCanvas batching for compatible streamed Level 0 geometry
- Shared desktop/touch `PlayerIntent`; landscape Move, Sprint, Look, Marker, Interact, Use and World Lab
- Searchable World Lab object catalog covering all 23 current items and prop kinds
- World Lab diagnostics for loaded light groups/fixtures and current field energy/active/flicker/nearby counts
- Root `VERSION` plus isolated removable development-version indicator
- Strict TypeScript, deterministic/system tests, 10,000-cell benchmark, desktop/mobile Chromium journeys and world-cohesion browser evidence
- Renderer guard resolving the accepted production baseline dynamically from `STATUS.md`, with exact loaded-cell/collider/interaction invariants and 5%/+2 draw-call tolerance
- Generic production evidence publisher resolving the product commit, merged PR and closing issue automatically

## Clustered fluorescent field release

[PR #28](https://github.com/xash-mind/Project-Noclip/pull/28) implements only bounded Issue #27 plus the directly related renderer-evidence identity repair. It does not introduce modular room grammar, unrelated geometry rewrites, persistence fields, save migration, imported audio assets, per-fixture runtime lights or per-fixture audio graphs.

Final-head CI run [`31357155836`](https://github.com/xash-mind/Project-Noclip/actions/runs/31357155836) passed:

- strict TypeScript
- **32 / 32** deterministic/system/audio/light-field tests
- 10,000-cell benchmark with **0 connector errors** and **0 placement errors**
- all **16 current archetypes** still reachable
- **16,514 light groups / 26,769 retained fixtures** across the benchmark
- light-group states: **9,582 on / 4,081 off / 2,851 flicker**
- maximum **2 groups / 4 retained fixtures per cell** in the sweep
- production build and exact visible candidate **`v0.2.0-dev.6`**
- existing desktop Chromium/WebGL/save/reload journey
- existing landscape-touch journey
- existing world-cohesion browser regression

The final-head browser job passed after one bounded rerun of a runner-sensitive raw mobile Look injection miss. The identical product code had already passed that gesture on the immediately preceding head; no gameplay code was changed for the rerun.

Renderer regression run [`31357155847`](https://github.com/xash-mind/Project-Noclip/actions/runs/31357155847) resolved the accepted production baseline from this file as `c2a3b84761c09e499c313d361bce3db1650a66e6 / v0.2.0-dev.5` and verified:

- normal radius-3 scene: **146 → 134 draw calls (-8.22%)**, 49 loaded cells / 485 colliders / 7 interactions unchanged
- forced Hole Section radius 1: **37 → 36 draw calls**, 9 / 59 / 1 unchanged
- World Lab 23-object showcase: **144 → 133 draw calls**, 49 / 486 / 7 unchanged
- save schema **v2**, character and seed preserved with **0.0 m** reload-position delta
- zero blocking browser-console errors

The renderer workflow no longer hardcodes a historical production commit/version; future comparisons resolve the accepted baseline from `STATUS.md`.

## Accepted renderer baseline

The accepted normal `threshold-001` radius-3 production scene is now **134 draw calls / 49 loaded cells / 485 colliders / 7 interactions**.

SwiftShader remains a relative renderer-regression signal, not a physical-GPU FPS claim.

## Production release evidence

Product-changing merge [PR #28](https://github.com/xash-mind/Project-Noclip/pull/28) produced release commit [`1fc056b8`](https://github.com/xash-mind/Project-Noclip/commit/1fc056b84fb1361872bb965b6df44c058f4b114e). GitHub's Vercel status for that exact merge commit completed successfully.

Canonical production run [`31357578899`](https://github.com/xash-mind/Project-Noclip/actions/runs/31357578899) verified:

- HTTP 200 at https://project-noclip.vercel.app
- exact visible version **`v0.2.0-dev.6`**
- HTML SHA-256 `3c3f6cde592fc5bb90488af875e3f96dd70c55ea7996782feb8ecf28df936113`
- live world metrics **49 loaded cells / 485 colliders / 7 interactions / 134 draw calls**
- desktop WebGL/HUD/World Lab/Hole/catalog/save/reload journey passed
- landscape mobile movement `[0.0, 0.0] → [0.0, -0.6]`
- landscape touch-look yaw `0.0 → -17.955°`
- save schema v2 and deterministic seed continuity remained intact
- desktop browser errors **0** and mobile browser errors **0**

Production evidence was published automatically to [Issue #27](https://github.com/xash-mind/Project-Noclip/issues/27#issuecomment-5236144148). Responsive/headless browser evidence is functional evidence, not a physical-device FPS, thermals or ergonomics claim.

## Latest meaningful change

Merged and deployed [PR #28](https://github.com/xash-mind/Project-Noclip/pull/28), closing [Issue #27](https://github.com/xash-mind/Project-Noclip/issues/27) and releasing deterministic fixture groups plus the clustered cross-cell fluorescent field as **`v0.2.0-dev.6`**.

The release synchronizes coarse local lighting and ambience from the same bounded deterministic field, prevents fixture/ceiling-structure overlap, preserves save v2 and canonical world laws, and lowers the accepted normal-scene renderer cost from 146 to 134 draw calls.

## Top blocker

No release blocker is active.

The remaining [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) is a different spatial-composition risk class. Its unresolved claims and modular-room work should be revalidated and extracted into a bounded successor before implementation rather than continuing draft PR #12 wholesale.

Physical Android/iOS performance, thermals and ergonomics also remain unverified.

## Next recommended action

Extract one bounded spatial successor from [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11). The highest-value likely slice is deterministic modular room composition with explicit diversity, connector-symmetry, stable-ID, spawn/loot-safety, save-v2 and renderer-performance acceptance criteria. Keep isolated wall/trim or other presentation fixes separate unless current evidence demonstrates they share the same implementation and rollback boundary.

## Decisions needed from Sash

None for the accepted `v0.2.0-dev.6` release.

## Known risks and unverified claims

- Physical Android/iOS FPS, thermals, battery use and native browser ergonomics have not yet been measured.
- Headless Chromium grants pointer lock, but synthetic desktop `KeyW` movement remains nondeterministic; native keyboard movement remains a manual regression layer.
- Remaining spatial claims in broad Issue #11 were not revalidated in this release and require decomposition before implementation.
- Hole rendering is visually recessed, but falling and terminal-hole physics are not implemented yet.
- Primitive geometry remains placeholder-quality; imported art assets are future work.
- Long-session memory growth remains unmeasured.
- Some generated structural props still use simple AABB collision.

## Version policy state

Project Noclip is opted into the manual-project version indicator policy. The canonical root `VERSION` is **`0.2.0-dev.6`** and the removable indicator is visibly verified on canonical production as **`v0.2.0-dev.6`** through production run [`31357578899`](https://github.com/xash-mind/Project-Noclip/actions/runs/31357578899).

The mapped Notion project page and shared Projects version dashboard must carry this exact verified value after the final synchronization step.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Clustered light-field PR: https://github.com/xash-mind/Project-Noclip/pull/28
- Closed clustered light-field issue: https://github.com/xash-mind/Project-Noclip/issues/27
- Production release verification: https://github.com/xash-mind/Project-Noclip/actions/runs/31357578899
- Final-head CI: https://github.com/xash-mind/Project-Noclip/actions/runs/31357155836
- Renderer comparison: https://github.com/xash-mind/Project-Noclip/actions/runs/31357155847
- Broad deferred issue: https://github.com/xash-mind/Project-Noclip/issues/11
- Deferred draft PR: https://github.com/xash-mind/Project-Noclip/pull/12
- Production target: https://project-noclip.vercel.app
- Shared operations: https://github.com/xash-mind/project-operations
