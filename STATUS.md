# Project Status

**Last verified:** 2026-08-08 (Asia/Kolkata)  
**Accepted runtime source:** `06ea36bdcdf2da28718fdcc7b582028d5a2955d4` from PR #19  
**Production release commit:** `06ea36bdcdf2da28718fdcc7b582028d5a2955d4`  
**Production:** https://project-noclip.vercel.app — HTTP 200, desktop and landscape-touch journeys verified  
**Visible deployed version:** `v0.2.0-dev.2`  
**Latest repository change before this status sync:** `3164288ff21af49399edaf2c0c8423a147c6d5ba` generic production-evidence workflow update  
**Verification:** final-head CI, renderer regression guard and canonical production desktop/mobile/version smoke passed

## Health

**Healthy.** Level 0 Alpha 0.2 is now minimally playable on a coarse/no-hover touch device in landscape while preserving the accepted deterministic world, static-render batching, collision path and IndexedDB save schema v2. Desktop keyboard/mouse/pointer-lock behavior remains in place. The root `VERSION` and removable development indicator are visibly aligned on canonical production at `v0.2.0-dev.2`.

## Current milestone

[Issue #17](https://github.com/xash-mind/Project-Noclip/issues/17) is complete and deployed through [PR #19](https://github.com/xash-mind/Project-Noclip/pull/19).

The next bounded milestone is [Issue #20](https://github.com/xash-mind/Project-Noclip/issues/20): make procedural ambience follow journey pause/focus/modal lifecycle and soften the fluorescent hum without introducing deterministic fixture-group acoustics yet. Broad [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) remains a backlog container and draft [PR #12](https://github.com/xash-mind/Project-Noclip/pull/12) must not be merged wholesale.

## Working now

- Browser-first TypeScript/Vite runtime using PlayCanvas Engine
- Renderer-independent deterministic world generation and stable identities
- Deterministic 5×5 district planning with sixteen current room archetypes
- Procedural Level 0 materials, recessed Hole Sections and grounded notes
- Recognizable deterministic primitive models for all current item definitions
- Searchable World Lab catalog covering all 23 current items and prop kinds
- Swept-circle collision, timeline gates and IndexedDB save schema v2
- Static PlayCanvas batching for compatible streamed Level 0 render geometry
- Shared device-neutral `PlayerIntent` for desktop keyboard and mobile touch movement
- Landscape touch movement pad, right-side touch-drag look without pointer lock, and minimum Interact/Use actions
- Portrait rotate-to-landscape notice and safe-area-aware compact mobile HUD
- Root `VERSION` plus isolated removable development-version indicator
- Strict TypeScript, deterministic/system tests, 10,000-cell benchmark, production build and desktop/mobile Chromium journeys
- Current-production renderer regression guard rather than the obsolete one-time Issue #16 optimization target
- Generic production release evidence publisher that resolves the product commit/merged PR/closing issue instead of hardcoding an issue number

## Accepted renderer baseline

The [Issue #16](https://github.com/xash-mind/Project-Noclip/issues/16) optimization remains intact. Normal `threshold-001` radius 3 is **174 draw calls / 49 loaded cells / 550 colliders / 7 interactions**, down from the original 519-draw-call production baseline.

Final Issue #17 renderer regression run [`31219214552`](https://github.com/xash-mind/Project-Noclip/actions/runs/31219214552) compared the current accepted production and the mobile candidate on the same Chrome/SwiftShader runner:

- normal radius 3: **174 → 174 draw calls**, 49 / 550 / 7 unchanged
- forced Hole Section radius 1: **37 → 37 draw calls**, 9 / 59 / 1 unchanged
- save schema v2, character and seed preserved with `0.0000 m` reload-position delta
- zero blocking browser-console errors

The regression guard now permits only a small 5%/+2 draw-call tolerance while still requiring exact loaded-cell/collider/interaction invariants. SwiftShader remains a relative renderer-stress signal, not a physical-GPU FPS claim.

## Mobile playability release

[PR #19](https://github.com/xash-mind/Project-Noclip/pull/19) introduced a shared input-intent seam instead of a mobile-specific simulation path. Keyboard and touch therefore feed the same movement/collision logic; generation, active radius, timeline gates, stable IDs and persistence were untouched.

Final-head CI run [`31219214726`](https://github.com/xash-mind/Project-Noclip/actions/runs/31219214726) passed typecheck, deterministic/system tests, 10,000-cell benchmark, build, existing desktop Chromium journey, exact version smoke and the new landscape touch journey. The first CI attempt exposed only a test-build boundary omission; `tsconfig.test.json` was corrected to compile the new input module rather than weakening the test.

The mobile browser smoke uses trusted Chrome touch events at a 900×450 coarse/no-hover emulated device. It verifies:

- left touch pad changes canonical player position
- right-side touch drag changes and persists camera yaw
- no pointer lock is required in touch mode
- Interact and Use controls meet the 44px minimum target and essential HUD/version regions do not overlap
- save schema v2 and seed `threshold-001` remain intact
- zero blocking browser-console errors

Responsive emulation proves browser behavior only; it does **not** establish physical-phone FPS or thermals.

## Production release evidence

Product-changing merge [PR #19](https://github.com/xash-mind/Project-Noclip/pull/19) produced release commit [`06ea36bd`](https://github.com/xash-mind/Project-Noclip/commit/06ea36bdcdf2da28718fdcc7b582028d5a2955d4). GitHub's Vercel status for that commit completed successfully.

Canonical production run [`31219837678`](https://github.com/xash-mind/Project-Noclip/actions/runs/31219837678), artifact `9010014248` (`sha256:0290f9a01a4863c7fcd23810ab0fbc3a485b8dc22fc39b14433d2852ff5c604d`), verified:

- HTTP 200 at https://project-noclip.vercel.app
- exact visible version **`v0.2.0-dev.2`**
- HTML SHA-256 `69a9d2c8a21b89d2b0300b7e9836c495db063dc8cded4ac7e0c7436b2a74a925`
- desktop title/new journey, WebGL/HUD/watch/inventory, pointer lock, World Lab diagnostics, forced Hole Section, all 23 showcase objects, save v2 and Continue/reload
- live world metrics **49 loaded cells / 550 colliders / 7 interactions / 174 draw calls**
- landscape mobile touch movement `[0.0, 0.0] → [0.0, -0.8]`
- landscape mobile touch-look yaw `0.0 → -13.167°`
- desktop browser errors **0** and mobile browser errors **0**

The connected Vercel API does not expose a reliable provider deployment ID for this project, so none is guessed. Release identity is grounded by the merge commit, Vercel commit status, canonical URL, exact visible version, public asset hash and browser evidence.

## Latest meaningful change

Merged [PR #19](https://github.com/xash-mind/Project-Noclip/pull/19), closing Issue #17 and deploying basic landscape touch playability as `v0.2.0-dev.2` without changing deterministic world laws or save compatibility.

Follow-up workflow-only commit [`3164288f`](https://github.com/xash-mind/Project-Noclip/commit/3164288ff21af49399edaf2c0c8423a147c6d5ba) made production release evidence generic: the smoke resolves the most recent deployment-significant product commit, its merged PR and closing issue, then publishes exact desktop/mobile/version evidence automatically. It does not change product runtime.

## Top blocker

No release blocker is active. The highest-value unresolved product defect is the procedural ambience lifecycle: the fluorescent hum should silence/mute correctly when the journey is paused, unfocused, in World Lab or in a modal, and should resume smoothly with a gentler tone. Physical Android/iOS performance remains unverified.

## Next recommended action

Execute [Issue #20](https://github.com/xash-mind/Project-Noclip/issues/20) as the next bounded product milestone. Fix pause/focus/modal audio lifecycle and soften the existing hum first; keep deterministic fixture on/off/flicker groups, clustered cross-cell acoustics, geometry corrections and modular room composition as later independent slices.

[Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) and draft [PR #12](https://github.com/xash-mind/Project-Noclip/pull/12) remain deferred. PR #12 currently combines too many risk classes and is not the release path.

## Decisions needed from Sash

None for Issue #20. A later decision may be useful after real physical-phone testing if device evidence justifies quality tiers or a broader mobile UX pass.

## Known risks and unverified claims

- Physical Android/iOS FPS, thermals, battery use and native browser ergonomics have not yet been measured; responsive emulation is functional evidence only.
- Headless Chromium grants pointer lock, but synthetic desktop `KeyW` movement remains nondeterministic; native keyboard movement remains a manual regression layer.
- Native note pickup, marker drawing and glow-stick use remain manual regression checks.
- Procedural ambience pause/modal lifecycle and hum comfort remain unresolved; tracked in Issue #20.
- Deterministic fixture light groups and clustered cross-cell ambience are not yet implemented.
- Hole rendering is visually recessed, but falling and terminal-hole physics are not implemented yet.
- Primitive geometry remains placeholder-quality; imported art assets are future work.
- Long-session memory growth remains unmeasured.
- Some generated props still use simple AABB collision.
- Clean installation is not fully reproducible because the repository lacks a committed lockfile and CI uses `npm install`.

## Version policy state

Project Noclip is opted into the manual-project version indicator policy. The canonical root `VERSION` is `0.2.0-dev.2`; the removable indicator is visibly verified on canonical production as **`v0.2.0-dev.2`** through production run `31219837678`. The mapped Notion project page and shared Projects version dashboard must carry this exact verified value after the final synchronization step.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Mobile playability PR: https://github.com/xash-mind/Project-Noclip/pull/19
- Closed mobile playability issue: https://github.com/xash-mind/Project-Noclip/issues/17
- Production release verification: https://github.com/xash-mind/Project-Noclip/actions/runs/31219837678
- Renderer regression verification: https://github.com/xash-mind/Project-Noclip/actions/runs/31219214552
- Next audio lifecycle issue: https://github.com/xash-mind/Project-Noclip/issues/20
- Broad deferred issue: https://github.com/xash-mind/Project-Noclip/issues/11
- Deferred draft PR: https://github.com/xash-mind/Project-Noclip/pull/12
- Production target: https://project-noclip.vercel.app
- Shared operations: https://github.com/xash-mind/project-operations
