# Project Noclip — Current State

**Last updated:** 2026-08-03 — Iteration 1 implementation complete locally  
**Repository:** `xash-mind/Project-Noclip`  
**Branch target:** `main`  
**Target deployment:** `https://project-noclip.vercel.app`

## Executive state

A runnable Level 0 systems vertical slice now exists. It is no longer a documentation-only repository.

The local build has passed strict typechecking, nine deterministic/system tests, a 10,000-cell generation benchmark, static production build, and a browser smoke path using an API-compatible PlayCanvas test module because this execution environment could not install the npm package or allow browser access to local network URLs. The real PlayCanvas/Vite bundle must therefore be validated by the Vercel build and public deployment before renderer verification is considered complete.

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
- GitHub Actions verification workflow.

## Partial/stubbed

- Primitive PlayCanvas entities are not yet batched or instanced; real draw-call cost requires deployed verification.
- Generator has an active ring but no separate topology-prefetch ring or worker.
- Hole sections are safe visual prototypes.
- Marker renderer uses sampled marks rather than connected stroke geometry.
- String does not render a physical trail.
- Note editor is deferred.
- Glow-stick decay is not yet simulated over persisted time.
- Pry tool only reports contextual readiness.
- Exit destinations are recorded but full destination levels/capsules are not built.
- Manila Room is local only; no realtime presence/chat/trading.
- World Lab does not yet include a top-down graph or JSON import.
- Audio and geometry are original procedural placeholders rather than final assets.

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
- Build: pass through the TypeScript static fallback because the environment npm registry did not expose Vite/PlayCanvas packages.
- Browser smoke: title, new journey, persisted starter creation, six inventory slots, timeline HUD, 49 loaded cells, and World Lab opened with no page or console errors under the test renderer.

## Known defects/risks

- Actual installed PlayCanvas runtime and real WebGL output are not yet verified in this environment.
- Default radius creates hundreds of primitive render entities; optimisation is the next priority.
- Collision is intentionally simple and may snag around complex future modules.
- Save writes are periodic but not yet queued against overlapping asynchronous writes.
- Local mode is modifiable and must never be treated as Connected World authority.
- Final media/licensing review remains outstanding.

## Deployment

Pending Vercel creation/deployment and real-browser verification. Replace this section with the exact deployment URL, build result, and public smoke test before closing the release handoff.

## Next three tasks

1. Verify the real PlayCanvas/Vite deployment and correct renderer/API issues.
2. Batch/instance the modular environment and measure long-traversal performance.
3. Finish marker/note/string/glow/pry interactions and add transition capsules.

## Mandatory handoff

Every iteration must replace stale facts here, review the vision, synchronize the specification/decisions/content ledger, rewrite `MASTER_BUILD_PROMPT.md` for the next iteration, rerun verification, and commit/push the complete handoff.
