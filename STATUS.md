# Project Status

**Last verified:** 2026-08-08 (Asia/Kolkata)  
**Accepted runtime source:** `b100a13b88b4c6478bcb10d033a729212fca2d26` from PR #23  
**Production release commit:** `b100a13b88b4c6478bcb10d033a729212fca2d26`  
**Production:** https://project-noclip.vercel.app — HTTP 200, desktop and landscape-touch journeys verified  
**Visible deployed version:** `v0.2.0-dev.3`  
**Verification:** final-head CI, renderer regression and canonical production desktop/mobile/version smoke passed

## Health

**Healthy.** Level 0 Alpha 0.2 is playable on desktop and has a complete basic landscape-touch testing surface: Move, hold Sprint, Look, Marker, Interact, Use and World Lab. Desktop keyboard/mouse/pointer-lock behavior remains intact. Deterministic world laws, active-radius defaults, connector contracts, timeline gates, stable identities, collision behavior and IndexedDB save schema v2 were not changed by the mobile-controls release.

The root `VERSION` and isolated removable development indicator are aligned on canonical production at **`v0.2.0-dev.3`**.

## Current milestone

[Issue #21](https://github.com/xash-mind/Project-Noclip/issues/21) is complete and deployed through [PR #23](https://github.com/xash-mind/Project-Noclip/pull/23).

The next bounded milestone is [Issue #22](https://github.com/xash-mind/Project-Noclip/issues/22): restore Level 0 world cohesion by removing mismatched carpet patches, reducing and spacing scenery so emptiness/atmosphere drives curiosity, preventing ordinary prop overlap, and correcting arch tops that clip into the ceiling. This work must preserve deterministic generation contracts and save compatibility.

[Issue #20](https://github.com/xash-mind/Project-Noclip/issues/20) remains the next audio-focused slice after that. Broad [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) remains a backlog container and draft [PR #12](https://github.com/xash-mind/Project-Noclip/pull/12) must not be merged wholesale.

## Working now

- Browser-first TypeScript/Vite runtime using PlayCanvas Engine
- Renderer-independent deterministic world generation and stable identities
- Deterministic 5×5 district planning with sixteen current room archetypes
- Swept-circle movement collision, timeline gates and IndexedDB save schema v2
- Static PlayCanvas batching for compatible streamed Level 0 geometry
- Shared device-neutral `PlayerIntent` for desktop keyboard and mobile touch movement/sprint
- Landscape touch Move, hold Sprint, faster Look, Marker, Interact, Use and World Lab controls
- Marker drawing on touch through the same persisted `SurfaceMark` path used by desktop
- Touch-specific marker copy with no undefined “primary button” instruction
- Portrait rotate-to-landscape notice and safe-area-aware compact mobile HUD
- Searchable World Lab object catalog covering all 23 current items and prop kinds
- Root `VERSION` plus isolated removable development-version indicator
- Strict TypeScript, deterministic/system tests, 10,000-cell benchmark, production build and desktop/mobile Chromium journeys
- Renderer regression guard with exact loaded-cell/collider/interaction invariants and 5%/+2 draw-call tolerance
- Generic production evidence publisher that resolves the product commit, merged PR and closing issue automatically

## Accepted renderer baseline

The accepted normal `threshold-001` radius-3 scene remains **174 draw calls / 49 loaded cells / 550 colliders / 7 interactions**.

Final PR #23 renderer regression run [`31253811095`](https://github.com/xash-mind/Project-Noclip/actions/runs/31253811095) compared accepted production and the exact candidate on the same Chrome/SwiftShader runner:

- normal radius 3: **174 → 174 draw calls**, 49 / 550 / 7 unchanged
- forced Hole Section radius 1: **37 → 37 draw calls**, 9 / 59 / 1 unchanged
- World Lab 23-object showcase: **225 → 225 draw calls**, 49 / 555 / 7 unchanged
- save schema v2, character and seed preserved with `0.0 m` reload-position delta
- zero blocking browser-console errors

SwiftShader remains a relative renderer-regression signal, not a physical-device FPS claim.

## Mobile controls release

[PR #23](https://github.com/xash-mind/Project-Noclip/pull/23) completed the mobile testing surface without introducing a parallel mobile simulation path.

Final-head CI run [`31253811085`](https://github.com/xash-mind/Project-Noclip/actions/runs/31253811085) passed strict TypeScript, all deterministic/system tests, the 10,000-cell benchmark, production build, exact version smoke, desktop Chromium journey and landscape-touch journey.

The 900×450 coarse/no-hover touch journey verified:

- Move changes canonical player position through the existing collision path
- Sprint can be held simultaneously with Move and releases cleanly through `PlayerIntent`
- the fixed 84px Look drag changed persisted yaw **`0.0° → -17.955°`**, confirming the faster touch-only look response
- World Lab opens and closes from the mobile UI and restores touch input without pointer lock
- Marker can be armed from touch and a raw Look gesture persisted **1 `SurfaceMark`** through the existing save path
- Interact and Use remain operable
- all action targets are at least 44px and avoid essential HUD/version overlap
- save schema remained **v2** with seed `threshold-001`
- zero blocking mobile browser-console errors

The final Lab test correction distinguishes the panel’s canonical `.visible` state from its off-screen CSS transform; the panel remains dimensioned while closed, so generic `displayed()` was not a valid closure assertion. The product-side Close Lab control was also simplified to standard HTML button activation instead of custom touch/pointer/click deduplication.

Responsive emulation proves browser behavior only; it does **not** establish physical-phone FPS, thermals or ergonomics.

## Production release evidence

Product-changing merge [PR #23](https://github.com/xash-mind/Project-Noclip/pull/23) produced release commit [`b100a13b`](https://github.com/xash-mind/Project-Noclip/commit/b100a13b88b4c6478bcb10d033a729212fca2d26). GitHub's Vercel status for that exact merge commit completed successfully.

Canonical production run [`31254007059`](https://github.com/xash-mind/Project-Noclip/actions/runs/31254007059) verified:

- HTTP 200 at https://project-noclip.vercel.app
- exact visible version **`v0.2.0-dev.3`**
- HTML SHA-256 `ab46deccecfb17834c99913279de19e3efbbf48f75f4e3c0dc2e4beac7185a79`
- live world metrics **49 loaded cells / 550 colliders / 7 interactions / 174 draw calls**
- landscape mobile movement `[0.0, 0.0] → [0.0, -0.6]`
- landscape touch-look yaw `0.0 → -17.955°`
- persisted touch Marker stroke and save schema v2 continuity
- desktop browser errors **0** and mobile browser errors **0**

Production evidence was published automatically to [Issue #21](https://github.com/xash-mind/Project-Noclip/issues/21#issuecomment-5225817509). The connected Vercel API still cannot list/fetch this project’s deployments directly, so no provider deployment ID is guessed; release identity is grounded by the exact merge commit, Vercel commit status, canonical URL, visible version, asset hash and browser evidence.

## Latest meaningful change

Merged and deployed [PR #23](https://github.com/xash-mind/Project-Noclip/pull/23), closing [Issue #21](https://github.com/xash-mind/Project-Noclip/issues/21) and releasing complete basic landscape mobile testing controls as **`v0.2.0-dev.3`**.

The release adds Sprint, Marker and World Lab access, makes Marker drawing work through the touch Look region, removes ambiguous mobile input wording and increases only the touch-look multiplier from `1.65` to `2.25`. Desktop sensitivity and deterministic/save contracts are unchanged.

## Top blocker

No release blocker is active.

The highest-value unresolved product problem is world cohesion tracked in [Issue #22](https://github.com/xash-mind/Project-Noclip/issues/22): visible carpet patches do not read as one continuous Level 0 carpet, scenery is too common and can overlap, and arch tops can clip into the ceiling. The intended correction is not to add more curiosity objects; it is to make architecture, light, emptiness and atmosphere carry more of the experience while objects become scarce discoveries.

Physical Android/iOS performance and ergonomics also remain unverified.

## Next recommended action

Execute [Issue #22](https://github.com/xash-mind/Project-Noclip/issues/22) as one bounded deterministic world-cohesion milestone:

1. eliminate ordinary mismatched carpet patch rendering while preserving explicit special floor states;
2. reduce ordinary prop/object frequency and add deterministic spacing/overlap rejection;
3. correct arch vertical dimensions so tops remain below the ceiling;
4. add deterministic sweeps/regressions proving connector/world/save invariants remain intact;
5. verify renderer impact and desktop/mobile journeys before release.

Keep [Issue #20](https://github.com/xash-mind/Project-Noclip/issues/20) independent as the subsequent ambience lifecycle/timbre slice.

## Decisions needed from Sash

None for Issue #22. Existing playtest feedback is specific enough to implement the bounded correction without inventing new art direction.

## Known risks and unverified claims

- Physical Android/iOS FPS, thermals, battery use and native browser ergonomics have not yet been measured.
- Headless Chromium grants pointer lock, but synthetic desktop `KeyW` movement remains nondeterministic; native keyboard movement remains a manual regression layer.
- Procedural ambience pause/modal lifecycle and hum comfort remain unresolved; tracked in Issue #20.
- Deterministic fixture light groups and clustered cross-cell ambience are not yet implemented.
- Hole rendering is visually recessed, but falling and terminal-hole physics are not implemented yet.
- Primitive geometry remains placeholder-quality; imported art assets are future work.
- Long-session memory growth remains unmeasured.
- Some generated props still use simple AABB collision.
- World-cohesion defects around carpet continuity, prop scarcity/overlap and arch clearance are open in Issue #22.

## Version policy state

Project Noclip is opted into the manual-project version indicator policy. The canonical root `VERSION` is **`0.2.0-dev.3`** and the removable indicator is visibly verified on canonical production as **`v0.2.0-dev.3`** through production run [`31254007059`](https://github.com/xash-mind/Project-Noclip/actions/runs/31254007059).

The mapped Notion project page and shared Projects version dashboard must carry this exact verified value after the final synchronization step.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Mobile-controls PR: https://github.com/xash-mind/Project-Noclip/pull/23
- Closed mobile-controls issue: https://github.com/xash-mind/Project-Noclip/issues/21
- Production release verification: https://github.com/xash-mind/Project-Noclip/actions/runs/31254007059
- Final-head CI: https://github.com/xash-mind/Project-Noclip/actions/runs/31253811085
- Renderer regression verification: https://github.com/xash-mind/Project-Noclip/actions/runs/31253811095
- Next world-cohesion issue: https://github.com/xash-mind/Project-Noclip/issues/22
- Audio lifecycle issue: https://github.com/xash-mind/Project-Noclip/issues/20
- Broad deferred issue: https://github.com/xash-mind/Project-Noclip/issues/11
- Deferred draft PR: https://github.com/xash-mind/Project-Noclip/pull/12
- Production target: https://project-noclip.vercel.app
- Shared operations: https://github.com/xash-mind/project-operations
