# Project Noclip — Current State

**Updated:** 2026-08-03 — Iteration 2 implementation candidate
**Repository:** `xash-mind/Project-Noclip`
**Production target:** https://project-noclip.vercel.app

## Implemented this iteration

- Replaced isolated per-cell zone rolls with deterministic 5×5 district planning.
- Added sixteen room archetypes, room labels, planned partitions, props, floor states and environmental notes.
- Added procedural wallpaper, carpet, ceiling, concrete and wood textures, trims and richer zone silhouettes.
- Replaced wall-order snapping with sub-stepped swept-circle collision and diagonal sliding.
- Added functional persistent glow-stick lights with ten-minute decay.
- Added connected marker strokes, wall-face tracking and clearer marker feedback.
- Added hardcoded notes and a safe document-reading overlay; one early facilities memo is guaranteed near spawn.
- Rebuilt Manila as a delayed compact room with one table and a central ledger book.
- Gated advanced zones and exits by World Day and Exposure; moved Level 1 farther from spawn.
- Added save schema v2 and migration from v1 without resetting existing journeys.
- Added queued persistence writes.

## Verification completed locally

- Strict TypeScript: passed.
- Tests: 10 passed, 0 failed.
- 10,000-cell benchmark: 0 connector errors; 16 archetypes represented.
- Static fallback production build: passed.
- Chromium visual smoke remains environment-blocked by unavailable GPU initialization; deployment/browser verification is pending preview.

## Remaining risks

- Real installed PlayCanvas/WebGL behavior must be verified on the Vercel preview.
- Primitive render entities are not batched or instanced; draw-call profiling remains priority.
- Some generated props use simple AABB collision and placeholder boxes.
- String, editable notes, pry interactions and destination capsules remain partial/deferred.
- GitHub Actions and Git-integrated Vercel builds need verification.

## Exact next action

Deploy one preview candidate, test title/new journey, movement/wall sliding, notes, marker, glow stick, gated content and save reload in an unrestricted browser, then promote the same verified source to production once.
