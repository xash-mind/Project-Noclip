# Project Status

**Last verified:** 2026-08-04  
**Verified generation implementation:** `a079a37c8919b424967023863a4c1fc15f5cdfb9` on PR #6  
**Environment:** GitHub CI passed; Vercel preview/browser acceptance remains pending

## Health

**Watch.** The Level 0 Alpha 0.2 systems and deterministic placement safety pass repository checks, but unrestricted Chromium and commit-specific Vercel verification remain the main release uncertainty.

## Current milestone

Verify the current PlayCanvas build in a real deployed browser, establish a performance baseline, and promote one known-good source commit without expanding scope prematurely.

## Working now

- Deterministic 5×5 district planning with sixteen room archetypes
- Procedural Level 0 materials and richer environmental silhouettes
- Swept-circle collision and diagonal wall sliding
- Deterministic origin-arrival clearance and collision-safe spawned-loot placement with stable loot-node IDs
- Persistent sparse loot, flashlight, batteries, Almond Water, glow sticks, markers, and hardcoded notes
- World Day and Exposure gates
- Compact delayed Manila Room
- IndexedDB save schema v2 with v1 migration and queued writes
- Strict TypeScript, thirteen deterministic/system tests, generator benchmark, and production build passing in GitHub CI

## Latest meaningful change

[PR #6](https://github.com/xash-mind/Project-Noclip/pull/6) prevents deterministic player-arrival and spawned-loot overlap. Exact regressions for seeds `spawn-5` and `lootbench-656` pass, and the 10,000-cell benchmark reports zero connector or placement errors.

## Top blocker

The release-candidate browser journey in [Issue #3](https://github.com/xash-mind/Project-Noclip/issues/3) is still unaccepted. The PR #6 Vercel preview was blocked by the account build-rate limit rather than a source build failure, so pointer lock, textures, fog, lights, notes, marker lines, glow-stick lighting, save reload, direct refresh, runtime frame time and memory still require deployed-browser evidence.

## Next recommended action

Restore commit-specific Vercel preview capacity, run the complete Issue #3 browser smoke and save/reload journey against one exact source, capture draw-call/entity/frame-time/memory observations, then either fix confirmed runtime failures or promote the same verified source once.

## Decisions needed from Sash

Vercel plan or build-capacity action is needed only if the current build-rate limit does not reset in time for Issue #3 verification. No product-direction decision is needed.

## Known risks and unverified claims

- Primitive render entities are not yet proven to meet long-traversal performance expectations.
- Some generated props still use simple AABB collision and placeholder geometry.
- Editable notes, persistent string trails, pry interactions, and destination capsules remain partial or deferred.
- Clean installation is not fully reproducible because the repository still lacks a committed lockfile and CI uses `npm install`.
- Production at https://project-noclip.vercel.app has not been accepted as matching the latest verified source.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Placement safety issue: https://github.com/xash-mind/Project-Noclip/issues/5
- Pull request: https://github.com/xash-mind/Project-Noclip/pull/6
- Release-candidate issue: https://github.com/xash-mind/Project-Noclip/issues/3
- Production target: https://project-noclip.vercel.app
- Shared operations: https://github.com/xash-mind/project-operations
