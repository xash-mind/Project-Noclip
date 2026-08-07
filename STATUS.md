# Project Status

**Last verified:** 2026-08-07  
**Accepted runtime source:** `58389c13f7c35ed38e514d84c949e47d0368823c` from PR #10  
**Production release commit:** `c2d3cb38faacfc7e8e22dae67aa2e8e8af9ddfea`  
**Production deployment:** `dpl_C1FfCuvYVQ7aKaVG6bpUPT2o6Gmp` at https://project-noclip.vercel.app  
**Latest accepted repository change:** profiling PR #15 merged as `3467e6069896ff34c11cd818bd7500f14b5870cc`  
**Verification:** final-head repository CI and accepted-production Chromium profiling both passed

## Health

**Healthy.** Level 0 Alpha 0.2 remains the unchanged production runtime. Deterministic world generation, stable identities, timeline gates, save schema v2, grounded notes, recessed Hole Sections and the 23-object World Lab showcase remain intact. Issue #14 established the first reproducible production renderer/streaming baseline without changing application runtime source or consuming a Vercel deployment.

## Current milestone

[Issue #14](https://github.com/xash-mind/Project-Noclip/issues/14) is complete. The next bounded milestone is [Issue #16](https://github.com/xash-mind/Project-Noclip/issues/16): reduce measured draw-call pressure by batching or instancing compatible static, non-interactive Level 0 visual geometry while preserving collision truth, interaction identities, deterministic world laws and save schema v2.

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
- Strict TypeScript, deterministic/system tests, production build and 10,000-cell deterministic benchmark
- Reproducible accepted-production Chromium profiler committed through PR #15

## Accepted production profiling baseline

Production profiling run [`31186924282`](https://github.com/xash-mind/Project-Noclip/actions/runs/31186924282), artifact `8997223891` (`sha256:417c49df68de1edb84f7a08d3c6a5d1770b96c737aec71e39b0ab3365d51f7a3`), measured Chrome 150 / WebGL2 / ANGLE SwiftShader at 1440×900 against the accepted public deployment.

Fixed scenarios:

- `threshold-001`, normal radius 3: **49 loaded cells, 550 colliders, 7 interactions, 519 draw calls**
- forced Hole Section, radius 1: **9 loaded cells, 59 colliders, 1 interaction, 238 draw calls**
- World Lab 23-object showcase, radius 3: **49 loaded cells, 555 colliders, 7 interactions, 523 draw calls**
- static main-thread busy stayed below 1% in all three samples
- observed CDP JS heap was approximately 16.8–26.3 MB across the fixed scenarios

Absolute CI frame rates were only 0.48–0.74 median FPS because the runner uses software WebGL/SwiftShader. These are stress observations, **not physical-GPU FPS claims**. The useful signal is that draw-call/load pressure scales strongly with world-cell geometry while main-thread occupancy remains low; the 23-object showcase adds only about four draw calls over the normal baseline.

Deterministic streaming evidence used non-persistent World Lab controls so CI keyboard injection could not contaminate the measurement. The loaded-cell sequence `49 → 25 → 9 → 25 → 49` unloaded and reloaded 40 cells without changing journey save data. Final radius transition settle observations were 5.29 s, 6.71 s, 6.20 s and 7.88 s on the same software-rendered runner.

The corrected 10,000-cell benchmark reported **801.25 ms total, 80.13 µs/cell and 12,480.42 cells/s**, with zero connector errors, zero placement errors and 6.64 MB benchmark heap. The benchmark per-cell calculation was corrected in PR #15; prior reported values from the old formula were 1,000× too large.

Refresh/Continue preserved save schema v2, character, seed and position exactly (`0.0000 m` position delta), and the production profiling run recorded zero blocking browser-console errors.

## Production parity evidence

The accepted production runtime remains release commit [`c2d3cb38`](https://github.com/xash-mind/Project-Noclip/commit/c2d3cb38faacfc7e8e22dae67aa2e8e8af9ddfea). Production Chromium run [`31095089456`](https://github.com/xash-mind/Project-Noclip/actions/runs/31095089456) previously established public asset and browser parity, and Issue #14 re-profiled that same public target successfully on 2026-08-07.

PR #15 changed only `.github/workflows/profile-production.yml`, `scripts/profile-production.py` and `scripts/benchmark.mjs`. Vercel Git integration reported the PR deployment as **Ignored**, so no application runtime, production deployment or deployed product version changed.

## Latest meaningful change

Merged [PR #15](https://github.com/xash-mind/Project-Noclip/pull/15) as [`3467e606`](https://github.com/xash-mind/Project-Noclip/commit/3467e6069896ff34c11cd818bd7500f14b5870cc), closing Issue #14. The repository now has repeatable production profiling for fixed renderer scenarios, deterministic streaming-band changes, memory/main-thread observations, save/reload continuity and the corrected 10,000-cell benchmark units.

## Top blocker

No release blocker is active. The highest measured technical pressure is static renderer/draw-call cost: the normal radius-3 world presents 519 draw calls even before content expansion. Hardware-GPU performance and long-session memory growth remain unmeasured.

## Next recommended action

Execute [Issue #16](https://github.com/xash-mind/Project-Noclip/issues/16) as the next product-changing milestone. Establish same-environment before numbers from the committed profiler, batch or instance only compatible static/non-interactive visual geometry, then require same-environment before/after evidence plus the existing deterministic, browser and save gates.

Because #16 changes the product, it must also install the opted-in removable manual-project version indicator if still missing, establish/update the canonical version source, increment the version only for the accepted production release, verify that exact value visibly on production, then sync Project Noclip's mapped Notion page and the shared Projects version dashboard.

[Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) and draft [PR #12](https://github.com/xash-mind/Project-Noclip/pull/12) remain deferred. They still combine input, audio, light simulation, geometry correction, modular generation and versioning; after #16 they should be rebased and split/narrowed rather than merged as one broad release.

## Decisions needed from Sash

No product-direction decision is required for #16. Native keyboard interaction and real-device/browser QA remain manual verification layers in addition to automation.

## Known risks and unverified claims

- SwiftShader CI results identify renderer pressure but do not establish physical-device/GPU FPS.
- Headless Chromium grants pointer lock, but synthetic keyboard movement remains nondeterministic; native movement is a manual regression check.
- Native note pickup, marker drawing and glow-stick use remain manual regression checks.
- Hole rendering is visually recessed, but falling and terminal-hole physics are not implemented yet.
- Primitive geometry remains placeholder-quality; imported art assets are future work.
- Long-session memory growth remains unmeasured.
- Some generated props still use simple AABB collision.
- Clean installation is not fully reproducible because the repository lacks a committed lockfile and CI uses `npm install`.

## Version policy state

Project Noclip is opted into the manual-project version indicator policy. PR #15 was instrumentation-only, so it intentionally did **not** add/bump a product version or update the shared Projects version dashboard. The removable indicator/canonical-version work is required on the next accepted product-changing release (#16) if it is still missing.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Accepted rendering PR: https://github.com/xash-mind/Project-Noclip/pull/10
- Production profiling PR: https://github.com/xash-mind/Project-Noclip/pull/15
- Closed profiling issue: https://github.com/xash-mind/Project-Noclip/issues/14
- Selected renderer optimization: https://github.com/xash-mind/Project-Noclip/issues/16
- Deferred broad issue: https://github.com/xash-mind/Project-Noclip/issues/11
- Deferred draft PR: https://github.com/xash-mind/Project-Noclip/pull/12
- Production target: https://project-noclip.vercel.app
- Shared operations: https://github.com/xash-mind/project-operations
