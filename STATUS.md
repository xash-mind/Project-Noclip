# Project Status

**Last verified:** 2026-08-04  
**Verified runtime base:** `e20237576794c12e4288e9c94d400048f4cb679f`  
**Verified browser-test head:** `38ccb89b05dd7a624a91ae6579a0e25dd3b1e49a` on PR #7  
**Environment:** repository CI and exact application-runtime preview verified; production promotion pending

## Health

**Watch.** The Level 0 Alpha 0.2 startup, deterministic systems and local persistence journey now have repeatable browser evidence. Production still needs to be aligned to the accepted runtime, and native keyboard/item interaction plus sustained performance remain manual or follow-up coverage.

## Current milestone

Merge the verified browser gate, promote the same application runtime once, verify production source/assets, then begin measured renderer and persistence hardening without expanding content scope prematurely.

## Working now

- Deterministic 5×5 district planning with sixteen room archetypes
- Procedural Level 0 materials and richer environmental silhouettes
- Swept-circle collision and diagonal wall sliding
- Deterministic origin-arrival clearance and collision-safe spawned-loot placement with stable loot-node IDs
- Persistent sparse loot, flashlight, batteries, Almond Water, glow sticks, markers and hardcoded notes
- World Day and Exposure gates
- Compact delayed Manila Room
- IndexedDB save schema v2 with v1 migration and queued writes
- Strict TypeScript, thirteen deterministic/system tests and a 10,000-cell benchmark passing in GitHub CI
- Production build exercised in headless Chromium 150 with software WebGL
- New journey, HUD, timeline, six-slot inventory, IndexedDB creation, pointer lock, World Lab, direct refresh and Continue restoration passing
- No blocking browser-console errors in the accepted smoke

## Latest meaningful change

[PR #7](https://github.com/xash-mind/Project-Noclip/pull/7) adds a durable browser-critical CI journey. Run `30916882993` passed against the accepted application runtime and uploaded screenshots plus a structured report. The READY Vercel preview at commit `76b75218` is runtime-identical to the passing browser-test head; the later diff contains test infrastructure only.

## Top blocker

Production at https://project-noclip.vercel.app has not yet been confirmed as serving the accepted runtime. The preview quota was consumed by test-only commits after the READY candidate, so production should reuse or rebuild the already-verified runtime rather than introduce another application change.

## Next recommended action

Merge PR #7, promote the same verified application runtime once, verify production deployment metadata and hashed assets, then record native keyboard/item interaction and sustained traversal performance as explicit follow-up evidence.

## Decisions needed from Sash

None unless Vercel build capacity remains unavailable when production promotion is attempted.

## Known risks and unverified claims

- Headless Chromium granted pointer lock, but synthetic keyboard input did not produce movement; native keyboard movement remains manual regression coverage.
- Notes, marker drawing and glow-stick use were not exercised by the new automated browser smoke.
- Primitive render entities remain expensive: the initial origin baseline showed 462 draw calls, 550 colliders and 49 loaded cells.
- Sustained frame time, GPU pressure and long-session memory growth are still unmeasured.
- Some generated props use simple AABB collision and placeholder geometry.
- Editable notes, persistent string trails, pry interactions and destination capsules remain partial or deferred.
- Clean installation is not fully reproducible because the repository still lacks a committed lockfile and CI uses `npm install`.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Browser release PR: https://github.com/xash-mind/Project-Noclip/pull/7
- Release-candidate issue: https://github.com/xash-mind/Project-Noclip/issues/3
- Placement safety issue: https://github.com/xash-mind/Project-Noclip/issues/5
- Production target: https://project-noclip.vercel.app
- Shared operations: https://github.com/xash-mind/project-operations
