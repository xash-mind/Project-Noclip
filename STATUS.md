# Project Status

**Last verified:** 2026-08-05  
**Verified renderer head:** `a957e075593530e34f06cc94f8a5afe2f7188a84` on PR #10  
**Environment:** GitHub CI and Chromium/WebGL evidence passed; Vercel preview rejected before build by account rate limit

## Health

**Watch.** Level 0 Alpha 0.2 now has materially clearer procedural surfaces, grounded notes and item silhouettes, discrete recessed Hole Sections, and a searchable World Lab object showcase. Deterministic generation, stable identities and save schema v2 remain compatible. Production is still stale because Vercel build capacity is unavailable.

## Current milestone

Merge the verified rendering-correctness work, then release current accepted `main` through Issue #8 once Vercel capacity resets. After production alignment, continue measured renderer optimization and native interaction QA rather than expanding content scope blindly.

## Working now

- Deterministic 5×5 district planning with sixteen room archetypes
- Procedural Level 0 materials with consistent wall density and brighter non-blackout carpet contrast
- Flush damp, worn, dark and dry carpet treatments without repeated raised black slabs
- Hole Sections rendered as distinct cut-through pits with visible rims, side depth and separated floor geometry
- Grounded ordinary notes with the Manila ledger retained on its table
- Recognizable deterministic primitive models for all current item definitions
- Searchable World Lab catalog covering all 23 current items and prop kinds, with selected, filtered, all and clear actions
- Disposable showcase models isolated from interactions, collisions, canonical generation and persistence
- Swept-circle collision, stable loot-node IDs, timeline gates and IndexedDB save schema v2 preserved
- Strict TypeScript, sixteen deterministic/system tests and the 10,000-cell benchmark passing
- Chromium 150 with software WebGL passing new journey, forced Hole Section, full object showcase, clear and save/reload
- No blocking browser-console errors in the accepted smoke

## Latest meaningful change

[PR #10](https://github.com/xash-mind/Project-Noclip/pull/10) fixes the visual defects recorded in [Issue #9](https://github.com/xash-mind/Project-Noclip/issues/9). Final run `30947402217` passed at `a957e075`. Browser evidence shows readable baseline carpet, discrete recessed holes and all 23 catalog objects on an intentional inspection shelf.

Initial observations:

- normal radius-3 baseline: 49 loaded cells, 550 colliders, 7 interactions and 519 draw calls
- forced Hole Section at radius 1 with showcase: 9 loaded cells, 59 colliders, 1 interaction and 292 draw calls
- final used JavaScript heap: approximately 45.9 MB

## Top blocker

Vercel rejected the commit-specific PR #10 preview before build execution because the account build-rate limit is active. Production at https://project-noclip.vercel.app still serves an older runtime. [Issue #8](https://github.com/xash-mind/Project-Noclip/issues/8) remains the single deployment follow-up.

## Next recommended action

After Vercel capacity resets, build current accepted `main` once, verify the hashed runtime assets and public browser journey, then close Issue #8. The new runtime-aware Vercel ignore rule should prevent future test and documentation-only commits from consuming preview builds.

## Decisions needed from Sash

Only a Vercel retry or capacity action if the rate limit remains blocked when release work resumes. No product-direction decision is required.

## Known risks and unverified claims

- Hole rendering now creates visible recesses, but falling and terminal-hole physics are not implemented in this renderer-correctness change.
- Headless Chromium grants pointer lock, but synthetic keyboard input still does not provide reliable native movement evidence.
- Native note pickup, marker drawing and glow-stick use remain manual regression checks.
- Primitive geometry is clearer but still placeholder-quality; imported art assets remain future work.
- Sustained frame time, GPU pressure and long-session memory growth remain unmeasured.
- Some generated props still use simple AABB collision.
- Clean installation is not fully reproducible because the repository lacks a committed lockfile and CI uses `npm install`.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Rendering PR: https://github.com/xash-mind/Project-Noclip/pull/10
- Rendering issue: https://github.com/xash-mind/Project-Noclip/issues/9
- Production release issue: https://github.com/xash-mind/Project-Noclip/issues/8
- Production target: https://project-noclip.vercel.app
- Shared operations: https://github.com/xash-mind/project-operations
