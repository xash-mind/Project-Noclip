# Project Status

**Last verified:** 2026-08-03  
**Verified against main commit:** `809579ad9d9b7251722af24ee6713fc5de22d4c2`  
**Environment:** local checks verified; preview/production browser verification pending

## Health

**Watch.** The Level 0 Alpha 0.2 systems are implemented and local quality checks passed, but unrestricted Chromium and Vercel deployment behaviour remain the main release uncertainty.

## Current milestone

Verify the current PlayCanvas build in a real deployed browser, establish a performance baseline, and promote one known-good source commit without expanding scope prematurely.

## Working now

- Deterministic 5×5 district planning with sixteen room archetypes
- Procedural Level 0 materials and richer environmental silhouettes
- Swept-circle collision and diagonal wall sliding
- Persistent sparse loot, flashlight, batteries, Almond Water, glow sticks, markers, and hardcoded notes
- World Day and Exposure gates
- Compact delayed Manila Room
- IndexedDB save schema v2 with v1 migration and queued writes
- Strict TypeScript, deterministic/system tests, generator benchmark, and production build passing locally

## Latest meaningful change

Commit [`809579a`](https://github.com/xash-mind/Project-Noclip/commit/809579ad9d9b7251722af24ee6713fc5de22d4c2) restored journey startup on PlayCanvas 2.21.

## Top blocker

Real installed PlayCanvas/WebGL behaviour has not yet been verified in an unrestricted Chromium session on a Vercel preview. Pointer lock, textures, fog, lights, notes, marker lines, glow-stick lighting, save reload, and direct refresh still require deployed-browser evidence.

## Next recommended action

Deploy one preview candidate from the current main source, run the complete browser smoke and save/reload journey, capture draw-call/entity/frame-time observations during traversal, then either fix confirmed runtime failures or promote the same verified source once.

## Decisions needed from Sash

None for the current verification milestone unless account access, deployment ownership, paid infrastructure, or a material product-direction change becomes necessary.

## Known risks and unverified claims

- Primitive render entities are not yet proven to meet long-traversal performance expectations.
- Some generated props still use simple AABB collision and placeholder geometry.
- Editable notes, persistent string trails, pry interactions, and destination capsules remain partial or deferred.
- GitHub Actions and Git-integrated Vercel behaviour need verification.
- Production at https://project-noclip.vercel.app has not been accepted as matching the current verified source.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Issues: https://github.com/xash-mind/Project-Noclip/issues
- Pull requests: https://github.com/xash-mind/Project-Noclip/pulls
- Production target: https://project-noclip.vercel.app
- Shared operations: https://github.com/xash-mind/project-operations
