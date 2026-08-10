# Project Status

**Last verified:** 2026-08-10 (Asia/Kolkata)  
**Accepted runtime source:** `d3ff02c4b19a316d15addcc55a8e164658af419b` from PR #30  
**Production release commit:** `d3ff02c4b19a316d15addcc55a8e164658af419b`  
**Production:** https://project-noclip.vercel.app — HTTP 200, desktop and landscape-touch journeys verified  
**Visible deployed version:** `v0.2.0-dev.7`  
**Verification:** final-head CI, deterministic modular/light sweeps, renderer comparison, desktop/mobile/cohesion journeys and canonical production smoke passed

## Health

**Healthy.** Level 0 Alpha 0.2 now composes ordinary rooms from deterministic zone-weighted structural modules instead of repeating one fixed layout body per archetype. Existing district identity, canonical cell coordinates, connector symmetry, timeline gates, active-radius behavior, save schema v2 and journey loading remain intact.

Baseline lighting now treats dead fixtures as exceptional rather than normal. The accepted 10,000-cell benchmark measured a **0.242% baseline off-group rate** at shift epoch 0; deterministic instability thresholds expand monotonically as world shift instability rises, so a given group can degrade `on → flicker → off` but does not become healthier as stability falls.

The generated green-emissive placeholder signs used by baseline/threshold composition are removed from those paths, Hole Gallery's wooden rail/board is now solid through the existing prop collider path, and the Manila Room is one delayed seed-derived far special room embedded in baseline Level 0 rather than a `manila` zone.

The root `VERSION` and removable development indicator are aligned on canonical production at **`v0.2.0-dev.7`**.

## Current milestone

[Issue #29](https://github.com/xash-mind/Project-Noclip/issues/29) is complete and deployed through [PR #30](https://github.com/xash-mind/Project-Noclip/pull/30).

Broad [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) remains the only open product container. Its major sensory/light and modular-composition goals have now been split and delivered through bounded releases. Remaining claims are a different renderer/presentation/physics risk class and should be revalidated before another extraction. Draft [PR #12](https://github.com/xash-mind/Project-Noclip/pull/12) remains donor/reference material only and must not be resumed or merged wholesale.

## Working now

- Browser-first TypeScript/Vite runtime using PlayCanvas Engine
- Renderer-independent deterministic world generation and stable identities
- Deterministic 5×5 district planning and existing room-archetype identity
- Deterministic modular room composition using reusable zone-weighted structural components
- Derived spatial profiles: standard, sparse vista, thin channel and pillar expanse
- Sparse ordinary optional scenery; 96.91% of benchmark ordinary cells contain no optional scenery
- One delayed seed-derived Manila Room far inside baseline Level 0, with compact table/book/ledger experience
- Extremely rare baseline fixture outages with deterministic monotonic degradation as instability rises
- Deterministic fixture groups and one 37.8 m clustered fluorescent field sampled at a maximum 10 Hz
- Hole Gallery wooden rail/board participating in the existing solid-prop collision path
- Swept-circle movement collision, timeline gates and IndexedDB save schema v2
- Static PlayCanvas batching for compatible streamed Level 0 geometry
- Shared desktop/touch `PlayerIntent`; landscape Move, Sprint, Look, Marker, Interact, Use and World Lab
- Root `VERSION` plus isolated removable development-version indicator
- Renderer guard dynamically resolving accepted production from `STATUS.md` with exact loaded-cell/collider/interaction invariants and 5%/+2 draw-call tolerance

## Modular Level 0 release

[PR #30](https://github.com/xash-mind/Project-Noclip/pull/30) implements bounded [Issue #29](https://github.com/xash-mind/Project-Noclip/issues/29). No save type, migration, canonical cell coordinate, district ID, edge/connectivity law, timeline gate, active-radius default or input/persistence path changed.

Final-head CI run [`31363004267`](https://github.com/xash-mind/Project-Noclip/actions/runs/31363004267) passed:

- strict TypeScript
- **36 / 36** deterministic/system/audio/light tests
- **1,823 composition signatures** across 10,000 generated cells
- zone signature counts: baseline **807**, arch **351**, pillar **318**, blackout **306**, holes **36**, exit threshold **5**
- spatial profiles: 8,811 standard / 324 sparse-vista / 565 thin-channel / 300 pillar-expanse
- **0 connector errors / 0 placement errors**
- **9,685 / 9,994 ordinary cells (96.91%)** with no optional scenery
- maximum 12 walls / 21 props per cell
- baseline light groups: **12,567 on / 31 off / 222 flicker** — **0.242% off**
- monotonic light degradation tests across rising instability
- production build and exact visible candidate **`v0.2.0-dev.7`**
- desktop Chromium/WebGL/save/reload, landscape-touch and world-cohesion journeys

Renderer comparison run [`31363004268`](https://github.com/xash-mind/Project-Noclip/actions/runs/31363004268) compared accepted `v0.2.0-dev.6` with the exact candidate on the same Chrome/SwiftShader runner:

- normal radius-3: **134 → 128 draw calls (-4.48%)**, **485 → 442 colliders**, 49 loaded cells / 7 interactions unchanged
- forced Hole Section radius 1: **36 → 34 draw calls**, **59 → 64 colliders**, 9 loaded / 1 interaction unchanged; the added collision reflects the now-solid wooden rail/board
- World Lab showcase: **133 → 127 draw calls**, **486 → 444 colliders**, 49 loaded / 7 interactions unchanged
- save schema **v2**, character and seed preserved with **0.0 m** reload-position delta
- zero blocking browser-console errors

The temporary reviewed collider/draw-call envelope used only for PR #30 was removed after production acceptance. Future renderer comparisons again require exact loaded-cell/collider/interaction invariants and the normal 5%/+2 draw-call tolerance against the accepted production baseline.

## Accepted renderer baseline

The accepted normal `threshold-001` radius-3 production scene is **128 draw calls / 49 loaded cells / 442 colliders / 7 interactions**.

SwiftShader remains a relative renderer-regression signal, not a physical-GPU FPS claim.

## Production release evidence

Product-changing merge [PR #30](https://github.com/xash-mind/Project-Noclip/pull/30) produced release commit [`d3ff02c4`](https://github.com/xash-mind/Project-Noclip/commit/d3ff02c4b19a316d15addcc55a8e164658af419b). GitHub's Vercel status for that exact merge commit completed successfully.

Canonical production run [`31363540975`](https://github.com/xash-mind/Project-Noclip/actions/runs/31363540975) verified:

- HTTP 200 at https://project-noclip.vercel.app
- exact visible version **`v0.2.0-dev.7`**
- HTML SHA-256 `ee5a88345ebbcf9593dd944f0c9514da0cef1ce426f0ae1c81715baed6160597`
- live world metrics **49 loaded cells / 442 colliders / 7 interactions / 128 draw calls**
- desktop WebGL/HUD/World Lab/Hole/catalog/save/reload journey passed
- landscape mobile movement `[0.0, 0.0] → [0.0, -0.6]`
- landscape touch-look yaw `0.0 → -17.955°`
- save schema v2 and deterministic seed continuity remained intact
- desktop browser errors **0** and mobile browser errors **0**

Production evidence was published automatically to [Issue #29](https://github.com/xash-mind/Project-Noclip/issues/29#issuecomment-5236867839). Responsive/headless browser evidence is functional evidence, not a physical-device FPS, thermals or ergonomics claim.

## Latest meaningful change

Merged and deployed [PR #30](https://github.com/xash-mind/Project-Noclip/pull/30), closing [Issue #29](https://github.com/xash-mind/Project-Noclip/issues/29) and releasing the modular Level 0 composition/cohesion pass as **`v0.2.0-dev.7`**.

The release directly addresses current production notes: off lights are now extremely rare in stable baseline Level 0 and worsen only with deterministic instability; ordinary rooms use reusable modular structural composition; generated green placeholder signs are removed from baseline/threshold paths; the Hole Gallery board is solid; and Manila is a rare far baseline room rather than its own zone.

## Top blocker

No release blocker is active.

The remaining broad [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) now contains a different class of work: any still-reproducible wall/trim presentation defects, terminal-hole physics and longer-horizon art/performance quality. Those claims should be revalidated against `v0.2.0-dev.7` before implementation rather than inferred from old draft PR #12.

Physical Android/iOS performance, thermals and ergonomics also remain unverified.

## Next recommended action

Re-audit the remaining claims in [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) against `v0.2.0-dev.7`. Extract only the largest currently reproducible renderer/presentation or hole-physics slice with a clean rollback boundary; do not continue draft PR #12 wholesale.

## Decisions needed from Sash

None for the accepted `v0.2.0-dev.7` release.

## Known risks and unverified claims

- Physical Android/iOS FPS, thermals, battery use and native browser ergonomics have not yet been measured.
- Headless Chromium grants pointer lock, but synthetic desktop `KeyW` movement remains nondeterministic; native keyboard movement remains a manual regression layer.
- Remaining wall/trim claims in broad Issue #11 have not yet been revalidated against this modular release.
- Hole rendering is visually recessed, but falling and terminal-hole physics are not implemented yet.
- Primitive geometry remains placeholder-quality; imported art assets are future work.
- Long-session memory growth remains unmeasured.
- Some generated structural props still use simple AABB collision.

## Version policy state

Project Noclip is opted into the manual-project version indicator policy. The canonical root `VERSION` is **`0.2.0-dev.7`** and the removable indicator is visibly verified on canonical production as **`v0.2.0-dev.7`** through production run [`31363540975`](https://github.com/xash-mind/Project-Noclip/actions/runs/31363540975).

The mapped Notion project page and shared Projects version dashboard must carry this exact verified value after the final synchronization step.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Modular composition PR: https://github.com/xash-mind/Project-Noclip/pull/30
- Closed modular composition issue: https://github.com/xash-mind/Project-Noclip/issues/29
- Production release verification: https://github.com/xash-mind/Project-Noclip/actions/runs/31363540975
- Final-head CI: https://github.com/xash-mind/Project-Noclip/actions/runs/31363004267
- Renderer comparison: https://github.com/xash-mind/Project-Noclip/actions/runs/31363004268
- Broad deferred issue: https://github.com/xash-mind/Project-Noclip/issues/11
- Deferred draft PR: https://github.com/xash-mind/Project-Noclip/pull/12
- Production target: https://project-noclip.vercel.app
- Shared operations: https://github.com/xash-mind/project-operations
