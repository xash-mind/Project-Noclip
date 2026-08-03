# Project Noclip — Current State

**Last updated:** 2026-08-03 — Iteration 1 closed  
**Repository:** `xash-mind/Project-Noclip`  
**Branch:** `main`  
**Production:** `https://project-noclip.vercel.app`

## Executive state

Project Noclip now has a runnable Level 0 systems vertical slice, a deterministic test suite, a documented future authority boundary, and a live Vercel production deployment.

The implementation commit is:

```text
8899462c390d05a503baef254c25458375e41e81
feat: build Level 0 systems vertical slice
```

The production deployment is:

```text
Vercel project: project-noclip
Project ID: prj_JPn7GUYOaAOfNrAcVzkyP0loo8JO
Deployment ID: dpl_Ft6UAFTygVtseb6NUjVxk3R2uJrc
Production alias: https://project-noclip.vercel.app
State: READY
```

Vercel returned HTTP 200 for the production shell and both compressed runtime payloads. The execution sandbox blocked Chromium from navigating to public URLs with `ERR_BLOCKED_BY_ADMINISTRATOR`, so the production WebGL interaction path is not claimed as browser-verified. Local browser logic was smoke-tested with an API-compatible PlayCanvas test module; real installed PlayCanvas/runtime verification is the first Iteration 2 objective.

## Implemented

- Vite/TypeScript browser project and Vercel configuration.
- Repo-first PlayCanvas client boundary.
- First-person pointer-lock controls, walk, sprint, crouch, pause, resize hook, and axis-separated wall collision.
- Deterministic connected cell topology, symmetric openings, stable IDs, zone selection, interior variants, and fixed-seed replay.
- Active-radius streaming/unloading with persistent shift epochs on distant unloads.
- Baseline, arch, pillar, blackout, hole, Manila, and exit-threshold profiles.
- Sparse deterministic loot nodes.
- One-time deterministic starter roll: 15% none, 60% one, 25% two compatible items.
- Trade-ready item instances with ownership, origin, condition/charge, revision, and escrow-ready owner type.
- Six-slot inventory, pickup, drop, inspect presentation, selection, and use.
- Functional flashlight, battery recharge, Almond Water consumption, marker mode/strokes.
- Minimal/data-ready glow stick, string, can, note, and pry-tool behaviour.
- IndexedDB persistence with restricted-origin local/in-memory fallback and version-1 migration guard.
- World Day, traversal-weighted Exposure Day, stable-space elapsed time, content gates, and timeline HUD.
- Multiple exit registry entries and saved pending transition records.
- Local Manila Room stable module and future encounter protocol boundaries.
- Ambiguous hallucination anchors and procedural Web Audio ambience.
- World Lab controls for seed, zones, gates, days, exposure, loot, shifting, starter simulation, export, and runtime metrics.
- Future Nakama/PostgreSQL authority document.
- GitHub Actions verification workflow committed to the repository.
- Production Vercel deployment on the exact requested domain.

## Partial or stubbed

- Primitive PlayCanvas entities are not yet batched or instanced; real draw-call cost requires production-browser profiling.
- Generator has an active ring but no separate topology-prefetch ring or worker.
- Hole sections are safe visual prototypes.
- Marker renderer uses sampled marks rather than connected stroke geometry.
- String does not render a physical trail.
- Note editor is deferred.
- Glow-stick decay is not yet simulated over persisted time.
- Pry tool only reports contextual readiness.
- Exit destinations are recorded but full destination levels/capsules are not built.
- Manila Room is local only; no realtime presence, chat, or trading.
- World Lab does not yet include a top-down graph or JSON import.
- Audio and geometry are original procedural placeholders rather than final assets.
- Production was deployed as a verified compiled static artifact; Git-to-Vercel automatic deployment is not yet configured.

## Verification

Commands passed locally:

```text
npm run typecheck
npm test
npm run benchmark
npm run build
```

Results:

- TypeScript: pass.
- Tests: 9 passed, 0 failed.
- Generator benchmark: 10,000 cells, 78,718 walls, 1,471 spawned loot items, 0 connector errors, 242.87 ms total (24.29 μs/cell), approximately 5.25 MB heap in the benchmark process.
- Build: pass through the TypeScript static fallback because the execution environment's package registry did not expose Vite/PlayCanvas packages.
- Local browser smoke: title, new journey, persisted starter creation, six inventory slots, timeline HUD, 49 loaded cells, and World Lab opened without page or console errors under the test renderer.
- Production deployment: READY; shell, payload A, and payload B each returned HTTP 200 through Vercel.
- Production Chromium interaction test: blocked by sandbox network policy, not passed or failed.
- GitHub Actions: workflow is committed, but no workflow run was visible after the implementation push; CI status is therefore unverified.

## Known defects and risks

- Actual installed PlayCanvas runtime and public WebGL output still require an external-browser verification pass.
- Default radius creates hundreds of primitive render entities; batching/instancing is the next performance priority.
- Collision is intentionally simple and may snag around complex future modules.
- Save writes are periodic but not yet queued against overlapping asynchronous writes.
- The production artifact currently loads PlayCanvas from jsDelivr; the normal repository build should bundle the dependency once Git-based Vercel deployment is configured.
- Local mode is modifiable and must never be treated as Connected World authority.
- Final media/licensing review remains outstanding.

## Next three tasks

1. Verify the production game in an unrestricted Chromium browser and correct any real PlayCanvas/WebGL API issues.
2. Configure Git-integrated Vercel builds, bundle PlayCanvas, batch/instance environment modules, and measure long-traversal performance.
3. Finish connected marker rendering, note/string/glow/pry interactions, topology map/import, and transition capsules.

## Iteration prompt

`MASTER_BUILD_PROMPT.md` has been rewritten as the executable Iteration 2 prompt. It preserves the product constraints, continuous testing, Git/deployment duties, and mandatory project-memory handoff.

## Mandatory handoff

Every iteration must replace stale facts here, review the vision, synchronize the specification/decisions/content ledger, rewrite `MASTER_BUILD_PROMPT.md` for the next iteration, rerun verification, and commit/push the complete handoff.
