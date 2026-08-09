# Project Status

**Last verified:** 2026-08-09 (Asia/Kolkata)  
**Accepted runtime source:** `c2a3b84761c09e499c313d361bce3db1650a66e6` from PR #25  
**Production release commit:** `c2a3b84761c09e499c313d361bce3db1650a66e6`  
**Production:** https://project-noclip.vercel.app — HTTP 200, desktop and landscape-touch journeys verified  
**Visible deployed version:** `v0.2.0-dev.5`  
**Verification:** final-head CI, focused audio lifecycle tests, deterministic 10k sweep, renderer comparison and canonical production smoke passed

## Health

**Healthy.** Level 0 Alpha 0.2 keeps the accepted sparse world-composition baseline and now has lifecycle-aware procedural ambience. Desktop pointer-lock pause, World Lab, note/modal state, focus/visibility loss and landscape-touch pause/orientation state smoothly mute ambience; active gameplay resumes the existing coarse ambience without rebuilding the Web Audio graph or advancing the movement-transient timer into an immediate resume burst.

The fluorescent bed is materially gentler while retaining its Level 0 identity: the legacy sawtooth / `0.28` master scale / `0.025` normal hum gain is now triangle / `0.22` / `0.014`, with proportionally lower failed-light and blackout levels. Web Audio unavailable or suspended states remain non-fatal.

Deterministic world laws, active-radius defaults, connector contracts, stable identities, collision behavior, timeline gates and IndexedDB save schema v2 were not changed. The root `VERSION` and removable development indicator are aligned on canonical production at **`v0.2.0-dev.5`**.

## Current milestone

[Issue #20](https://github.com/xash-mind/Project-Noclip/issues/20) is complete and deployed through [PR #25](https://github.com/xash-mind/Project-Noclip/pull/25).

There is no separate ready bounded successor issue. Broad [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) remains a backlog container and draft [PR #12](https://github.com/xash-mind/Project-Noclip/pull/12) must not be merged wholesale. The remaining sensory work in #11 — deterministic fixture light groups, fixture-linked flicker and clustered cross-cell acoustics — changes deterministic simulation contracts and should be extracted into its own bounded issue before implementation.

## Working now

- Browser-first TypeScript/Vite runtime using PlayCanvas Engine
- Renderer-independent deterministic world generation and stable identities
- Deterministic 5×5 district planning with sixteen current room archetypes
- Continuous ordinary Level 0 carpet presentation; explicit deterministic Hole Section breaches remain
- Deterministic optional-scenery rarity with structural/special props preserved
- Deterministic rejection of non-essential solid scenery overlap without rewriting retained prop IDs
- Arch posts/beams keep their existing stable IDs and render with 0.28 m ceiling clearance
- Swept-circle movement collision, timeline gates and IndexedDB save schema v2
- Static PlayCanvas batching for compatible streamed Level 0 geometry
- Shared desktop/touch `PlayerIntent`; landscape Move, Sprint, Look, Marker, Interact, Use and World Lab
- Coarse procedural ambience with centralized journey-lifecycle observation, smooth mute/resume and a single reused Web Audio graph
- Focused audio lifecycle/timer/timbre tests compiled into the existing deterministic test command
- Searchable World Lab object catalog covering all 23 current items and prop kinds
- Root `VERSION` plus isolated removable development-version indicator
- Strict TypeScript, deterministic/system tests, 10,000-cell benchmark, desktop/mobile Chromium journeys and dedicated world-cohesion browser evidence
- Generic renderer guard against the accepted production baseline, with exact loaded-cell/collider/interaction invariants and 5%/+2 draw-call tolerance
- Generic production evidence publisher resolving the product commit, merged PR and closing issue automatically

## Audio lifecycle release

[PR #25](https://github.com/xash-mind/Project-Noclip/pull/25) implements only bounded Issue #20. It does not add fixture groups, cross-cell acoustics, imported audio assets, modular generation, persistence fields or save migration.

Final-head CI run [`31314483662`](https://github.com/xash-mind/Project-Noclip/actions/runs/31314483662) passed:

- strict TypeScript
- **25 / 25** tests, including five focused audio lifecycle checks
- graph reuse across repeated starts/resumes
- World Lab, note/modal and focus-loss mute behavior
- desktop pointer-lock and landscape-touch lifecycle resolution
- no immediate movement-transient burst after a long paused audio interval
- suspended AudioContext recovery and unavailable-Web-Audio fallback
- measurable gentler hum configuration
- 10,000 deterministic cells with **0 connector errors** and **0 placement errors**
- production build and exact visible candidate **`v0.2.0-dev.5`**
- existing desktop Chromium/WebGL/save/reload journey
- existing landscape-touch journey
- existing world-cohesion browser regression

The deterministic benchmark stayed on the accepted world baseline: **33,671 props**, **8,203 / 9,994 ordinary cells empty of optional scenery (82.08%)**, all sixteen current archetypes reachable, and no generator placement/connector errors.

Renderer regression run [`31314483661`](https://github.com/xash-mind/Project-Noclip/actions/runs/31314483661) passed the accepted production comparison without a renderer/world exception.

## Accepted renderer baseline

The accepted normal `threshold-001` radius-3 scene remains **146 draw calls / 49 loaded cells / 485 colliders / 7 interactions**. The audio lifecycle release did not alter geometry, loaded-cell count, collider count, interaction count or the accepted draw-call baseline.

SwiftShader remains a relative renderer-regression signal, not a physical-GPU FPS claim.

## Production release evidence

Product-changing merge [PR #25](https://github.com/xash-mind/Project-Noclip/pull/25) produced release commit [`c2a3b847`](https://github.com/xash-mind/Project-Noclip/commit/c2a3b84761c09e499c313d361bce3db1650a66e6). GitHub's Vercel status for that exact merge commit completed successfully.

Canonical production run [`31314807224`](https://github.com/xash-mind/Project-Noclip/actions/runs/31314807224) verified:

- HTTP 200 at https://project-noclip.vercel.app
- exact visible version **`v0.2.0-dev.5`**
- HTML SHA-256 `df417b8075037d1302e4fe45a60fa914d8658ae3b25ca956968ad080b7da2020`
- live world metrics **49 loaded cells / 485 colliders / 7 interactions / 146 draw calls**
- desktop WebGL/HUD/World Lab/Hole/catalog/save/reload journey passed
- landscape mobile movement `[0.0, 0.0] → [0.0, -0.6]`
- landscape touch-look yaw `0.0 → -17.955°`
- save schema v2 and deterministic seed continuity remained intact
- desktop browser errors **0** and mobile browser errors **0**

Production evidence was published automatically to [Issue #20](https://github.com/xash-mind/Project-Noclip/issues/20#issuecomment-5231673224). Responsive/headless browser evidence is functional evidence, not a physical-device FPS, thermals or ergonomics claim.

## Latest meaningful change

Merged and deployed [PR #25](https://github.com/xash-mind/Project-Noclip/pull/25), closing [Issue #20](https://github.com/xash-mind/Project-Noclip/issues/20) and releasing lifecycle-aware, gentler coarse Level 0 ambience as **`v0.2.0-dev.5`**.

The release centralizes ambience activity around the existing UI/browser lifecycle, reuses one Web Audio graph, resets the audio-only movement cadence across pause/resume, softens the fluorescent bed and preserves deterministic world/save contracts.

## Top blocker

No release blocker is active.

The highest-impact unresolved product uncertainty is the remaining broad [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11): fixture light-group state, synchronized flicker acoustics, clustered cross-cell ambience and modular room composition are still mixed together. They should not be resumed through draft PR #12 without a new bounded extraction and explicit deterministic/performance acceptance criteria.

Physical Android/iOS performance, thermals and ergonomics also remain unverified.

## Next recommended action

Extract the next coherent sensory slice from [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) before coding. The safest likely candidate is deterministic fixture light-group state plus bounded clustered ambience/flicker acoustics, with stable IDs, connector/world laws, save v2 compatibility and per-frame/per-audio-tick work explicitly protected. Keep modular room grammar separate unless a new issue justifies coupling them.

## Decisions needed from Sash

None for the accepted `v0.2.0-dev.5` release. The next implementation should begin only after #11 is decomposed into a bounded issue rather than by merging or continuing draft PR #12 wholesale.

## Known risks and unverified claims

- Physical Android/iOS FPS, thermals, battery use and native browser ergonomics have not yet been measured.
- Headless Chromium grants pointer lock, but synthetic desktop `KeyW` movement remains nondeterministic; native keyboard movement remains a manual regression layer.
- Deterministic fixture light groups, synchronized flicker state and clustered cross-cell ambience are not yet implemented.
- Hole rendering is visually recessed, but falling and terminal-hole physics are not implemented yet.
- Primitive geometry remains placeholder-quality; imported art assets are future work.
- Long-session memory growth remains unmeasured.
- Some generated structural props still use simple AABB collision.

## Version policy state

Project Noclip is opted into the manual-project version indicator policy. The canonical root `VERSION` is **`0.2.0-dev.5`** and the removable indicator is visibly verified on canonical production as **`v0.2.0-dev.5`** through production run [`31314807224`](https://github.com/xash-mind/Project-Noclip/actions/runs/31314807224).

The mapped Notion project page and shared Projects version dashboard must carry this exact verified value after the final synchronization step.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Audio lifecycle PR: https://github.com/xash-mind/Project-Noclip/pull/25
- Closed audio lifecycle issue: https://github.com/xash-mind/Project-Noclip/issues/20
- Production release verification: https://github.com/xash-mind/Project-Noclip/actions/runs/31314807224
- Final-head CI: https://github.com/xash-mind/Project-Noclip/actions/runs/31314483662
- Renderer comparison: https://github.com/xash-mind/Project-Noclip/actions/runs/31314483661
- Broad deferred issue: https://github.com/xash-mind/Project-Noclip/issues/11
- Deferred draft PR: https://github.com/xash-mind/Project-Noclip/pull/12
- Production target: https://project-noclip.vercel.app
- Shared operations: https://github.com/xash-mind/project-operations
