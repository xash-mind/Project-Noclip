# Project Status

**Last verified:** 2026-08-06  
**Accepted runtime source:** `58389c13f7c35ed38e514d84c949e47d0368823c` from PR #10  
**Production release commit:** `c2d3cb38faacfc7e8e22dae67aa2e8e8af9ddfea`  
**Production deployment:** `dpl_C1FfCuvYVQ7aKaVG6bpUPT2o6Gmp` — READY and aliased to https://project-noclip.vercel.app  
**Verification:** GitHub CI, Chromium/WebGL production journey and public asset hashing passed

## Health

**Healthy.** Level 0 Alpha 0.2 is aligned in production. The accepted renderer work, deterministic world core, save schema v2, grounded notes and object silhouettes, discrete recessed Hole Sections and searchable 23-object World Lab showcase are all present on the public deployment.

## Current milestone

Level 0 Alpha 0.2 production alignment is complete and Issue #8 is closed. The next bounded milestone is [Issue #14](https://github.com/xash-mind/Project-Noclip/issues/14): measure the accepted production renderer and streaming baseline before making further runtime or world-composition changes.

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
- Strict TypeScript, sixteen deterministic/system tests, production build and the 10,000-cell benchmark

## Production parity evidence

Vercel cloned and built release commit [`c2d3cb38`](https://github.com/xash-mind/Project-Noclip/commit/c2d3cb38faacfc7e8e22dae67aa2e8e8af9ddfea) from `main`. Comparing accepted runtime `58389c13` with that release commit shows only `STATUS.md` and formatting-only `vercel.json` changes; no application runtime source, package, Vite, HTML or build-script change was introduced.

Public generated artifacts:

- HTML SHA-256: `bc4a59bbc5e5e6014e3268c187edfd8343510430a11c065ff6ca104e109cad97`
- `/assets/index-D5KeAnxQ.js` — 2,003,705 bytes — SHA-256 `a017e137be1b2dc2cbe115de49cef8865aaa3c5d159b68a458a6ffcd0f744d51`
- `/assets/index-DGo8Q-G_.css` — 5,713 bytes — SHA-256 `fc8777569e0ece857de46d415717c4b894e932d71b216702d0fdbd42aa22d104`

Production Chromium run [`31095089456`](https://github.com/xash-mind/Project-Noclip/actions/runs/31095089456) passed with artifact `8965151971`. It verified:

- HTTP 200 and generated asset access
- title screen and new local journey
- WebGL context, HUD, watch and six inventory slots
- save schema v2 creation in IndexedDB
- pointer lock on the game canvas
- World Lab diagnostics
- forced discrete Hole Section rendering and downward visual inspection
- all 23 World Lab showcase objects
- non-persistent showcase cleanup
- direct refresh and Continue restoring the same journey
- zero blocking browser-console errors

## Latest meaningful change

Merged [PR #13](https://github.com/xash-mind/Project-Noclip/pull/13) as [`19f24956`](https://github.com/xash-mind/Project-Noclip/commit/19f249569311f29354c6c3233cfc668085d997f5), preserving a reusable production Chromium smoke with public asset hashing. Vercel correctly ignored the workflow-only change, so it consumed no additional deployment.

## Top blocker

None for Level 0 Alpha 0.2 production alignment.

## Next recommended action

Execute [Issue #14](https://github.com/xash-mind/Project-Noclip/issues/14) as a profiling-only milestone. Record reproducible frame-time/FPS distributions, draw calls, loaded cells, colliders, interactions, heap observations, bounded traversal/streaming behavior and the 10,000-cell benchmark before selecting one small optimization.

[Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) and draft [PR #12](https://github.com/xash-mind/Project-Noclip/pull/12) combine input, audio, lighting, geometry, modular generation and versioning. They remain deferred and should be split or narrowed after the profiling evidence rather than merged as the immediate follow-up.

## Decisions needed from Sash

No product-direction decision is required. Native keyboard interaction and real-device/browser QA remain the next verification layer after measured performance work.

## Known risks and unverified claims

- Headless Chromium granted pointer lock, but synthetic `KeyW` did not produce reliable movement evidence; native keyboard movement remains a manual regression check.
- Native note pickup, marker drawing and glow-stick use remain manual regression checks.
- Hole rendering is visually recessed, but falling and terminal-hole physics are not implemented in this renderer-correctness milestone.
- Primitive geometry remains placeholder-quality; imported art assets are future work.
- Sustained frame time, GPU pressure and long-session memory growth still require measured profiling.
- Some generated props still use simple AABB collision.
- Clean installation is not fully reproducible because the repository lacks a committed lockfile and CI uses `npm install`.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Accepted rendering PR: https://github.com/xash-mind/Project-Noclip/pull/10
- Closed production release issue: https://github.com/xash-mind/Project-Noclip/issues/8
- Selected profiling issue: https://github.com/xash-mind/Project-Noclip/issues/14
- Deferred broad issue: https://github.com/xash-mind/Project-Noclip/issues/11
- Deferred draft PR: https://github.com/xash-mind/Project-Noclip/pull/12
- Production target: https://project-noclip.vercel.app
- Shared operations: https://github.com/xash-mind/project-operations
