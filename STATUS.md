# Project Status

**Last verified:** 2026-08-07  
**Accepted runtime source:** `1b81d2d2bde086d13f61729d530d44b466c23710` from PR #18  
**Production release commit:** `1b81d2d2bde086d13f61729d530d44b466c23710`  
**Production:** https://project-noclip.vercel.app — HTTP 200, canonical journey verified  
**Visible deployed version:** `v0.2.0-dev.1`  
**Latest repository change before this status sync:** `590447c95ed97bb124b22b3000d6bd34a0eb463b` release-evidence workflow update  
**Verification:** final-head CI, same-run renderer comparison and canonical production browser/version smoke passed

## Health

**Healthy.** Level 0 Alpha 0.2 now runs the accepted static-geometry batching optimization in production. Deterministic world generation, stable identities, connector laws, timeline gates, collision truth and IndexedDB save schema v2 remain unchanged. The manual-project version indicator is installed as a small removable UI layer sourced from root `VERSION` and is visibly verified on canonical production as `v0.2.0-dev.1`.

## Current milestone

[Issue #16](https://github.com/xash-mind/Project-Noclip/issues/16) is complete and deployed. The next bounded milestone is [Issue #17](https://github.com/xash-mind/Project-Noclip/issues/17): add basic **landscape mobile touch playability** for device testing — left-side touch movement, right-side touch-drag camera look without pointer lock, and only the minimum actions needed to test a journey — while preserving the same simulation, deterministic world laws and save schema.

## Working now

- Browser-first TypeScript/Vite runtime using PlayCanvas Engine
- Renderer-independent deterministic world generation and stable identities
- Deterministic 5×5 district planning with sixteen room archetypes
- Procedural Level 0 materials with readable wall and carpet variation
- Hole Sections rendered as distinct recessed structures with visible rims, depth and separated floor geometry
- Grounded ordinary notes with the Manila ledger retained on its table
- Recognizable deterministic primitive models for all current item definitions
- Searchable World Lab catalog covering all 23 current items and prop kinds
- Disposable showcase models isolated from interactions, collisions, canonical generation and persistence
- Swept-circle collision, timeline gates and IndexedDB save schema v2
- Static PlayCanvas batching for compatible streamed Level 0 render geometry while interactive item/note/exit subtrees remain individually addressable
- Root `VERSION` plus isolated removable development-version indicator
- Strict TypeScript, deterministic/system tests, production build, Chromium journey and 10,000-cell deterministic benchmark
- Reproducible production profiler and same-run before/after renderer comparison
- Version-aware production smoke that waits for the exact visible canonical version before accepting a release

## Accepted renderer optimization

[PR #18](https://github.com/xash-mind/Project-Noclip/pull/18) was accepted after same-environment Chrome 150 / ANGLE SwiftShader comparison run [`31204466793`](https://github.com/xash-mind/Project-Noclip/actions/runs/31204466793).

Measured before/after at the normal `threshold-001` radius-3 baseline:

- draw calls: **519 → 174**, a **66.47% reduction**
- loaded cells: **49 → 49**
- colliders: **550 → 550**
- interactions: **7 → 7**
- save schema: **v2 → v2**, same character/seed and `0.0000 m` reload-position delta
- blocking browser-console errors: **0**

The World Lab 23-object scenario fell from **523 → 171 draw calls** while preserving 49 loaded cells, 555 colliders and 7 canonical interactions. The deterministic streaming cycle remained `49 → 25 → 9 → 25 → 49`. The 10,000-cell deterministic benchmark still reports zero connector and placement errors.

Absolute SwiftShader FPS/frame-time values remain software-renderer stress observations, not physical-GPU claims. The accepted optimization signal is the large draw-call reduction with unchanged canonical world metrics and passing visual/browser/save gates.

## Production release evidence

Product-changing merge [PR #18](https://github.com/xash-mind/Project-Noclip/pull/18) produced release commit [`1b81d2d2`](https://github.com/xash-mind/Project-Noclip/commit/1b81d2d2bde086d13f61729d530d44b466c23710). GitHub's Vercel status for that commit completed successfully.

Canonical production run [`31205504352`](https://github.com/xash-mind/Project-Noclip/actions/runs/31205504352), artifact `9004613203` (`sha256:fb335002d8fa3c460886757774129ae839dedd08898aea824b09e0f81cd83594`), then verified:

- HTTP 200 at https://project-noclip.vercel.app
- exact visible version **`v0.2.0-dev.1`**
- generated JS `/assets/index-BtdAKpjO.js` — 2,004,848 bytes — SHA-256 `8a7e8185ee8497421470563c73db23ad879b2387eac20483a60c620cfe1aeb78`
- generated CSS `/assets/index-CDHTlXM8.css` — 6,155 bytes — SHA-256 `28ab889cb290d8ea9a121ec754c8613dd91934ce39c2613db96df828a22ebba6`
- title/new journey, WebGL/HUD/watch/inventory, pointer lock, World Lab diagnostics, forced Hole Section, all 23 showcase objects, showcase cleanup, save schema v2 and direct refresh/Continue
- live normal-radius metrics **49 loaded cells / 550 colliders / 7 interactions / 174 draw calls**
- zero blocking browser-console errors

The connected Vercel API does not expose the provider deployment ID for this project, so no deployment ID is guessed here; the canonical URL, release commit status, generated asset hashes and visible-version/browser evidence are the accepted production identity.

## Latest meaningful change

Merged [PR #18](https://github.com/xash-mind/Project-Noclip/pull/18), closing Issue #16. It reduced normal-radius draw calls by 66.47% through isolated static render batching, added the canonical/manual version indicator path, and added same-run renderer and visible-production-version release gates without changing deterministic generation or persistence.

Follow-up commit [`590447c9`](https://github.com/xash-mind/Project-Noclip/commit/590447c95ed97bb124b22b3000d6bd34a0eb463b) made successful production version/browser evidence publish directly back to the release issue. That commit is workflow-only and does not change the deployed runtime.

## Top blocker

No release blocker is active. The next uncertainty is **real mobile/device input and physical-GPU behavior**: desktop/headless gates are strong, but landscape touch movement/look and actual phone performance have not yet been implemented or measured.

## Next recommended action

Execute [Issue #17](https://github.com/xash-mind/Project-Noclip/issues/17) as the next bounded product milestone. Introduce a shared player-intent seam where needed, then add landscape-only touch movement and touch-drag camera look without requiring pointer lock. Keep desktop WASD/mouse behavior unchanged, do not reduce canonical world radius as a mobile shortcut, and add a landscape mobile browser smoke plus real-device evidence when available.

[Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) and draft [PR #12](https://github.com/xash-mind/Project-Noclip/pull/12) remain deferred. They still combine input, audio, lighting, geometry and modular-generation work and should be rebased/split into bounded follow-ups rather than merged wholesale.

## Decisions needed from Sash

None for the next basic mobile-testing slice. A later decision may be needed if physical-device evidence justifies quality tiers or a broader mobile UX pass.

## Known risks and unverified claims

- SwiftShader CI identifies renderer pressure and validates relative draw-call improvements but does not establish physical-device/GPU FPS.
- Mobile landscape touch input and physical-phone performance are not yet implemented/verified; tracked in Issue #17.
- Headless Chromium grants pointer lock, but synthetic keyboard movement remains nondeterministic; native desktop movement is still a manual regression check.
- Native note pickup, marker drawing and glow-stick use remain manual regression checks.
- Hole rendering is visually recessed, but falling and terminal-hole physics are not implemented yet.
- Primitive geometry remains placeholder-quality; imported art assets are future work.
- Long-session memory growth remains unmeasured.
- Some generated props still use simple AABB collision.
- Clean installation is not fully reproducible because the repository lacks a committed lockfile and CI uses `npm install`.

## Version policy state

Project Noclip is opted into the manual-project version indicator policy. The canonical root `VERSION` is `0.2.0-dev.1`; the removable indicator is visibly verified on canonical production as **`v0.2.0-dev.1`** through production run `31205504352`. Project Noclip's mapped Notion page and the shared Projects version dashboard must therefore carry that exact verified value after the final synchronization step.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Renderer optimization PR: https://github.com/xash-mind/Project-Noclip/pull/18
- Closed renderer issue: https://github.com/xash-mind/Project-Noclip/issues/16
- Selected mobile playability issue: https://github.com/xash-mind/Project-Noclip/issues/17
- Production release verification: https://github.com/xash-mind/Project-Noclip/actions/runs/31205504352
- Final renderer comparison: https://github.com/xash-mind/Project-Noclip/actions/runs/31204466793
- Deferred broad issue: https://github.com/xash-mind/Project-Noclip/issues/11
- Deferred draft PR: https://github.com/xash-mind/Project-Noclip/pull/12
- Production target: https://project-noclip.vercel.app
- Shared operations: https://github.com/xash-mind/project-operations
