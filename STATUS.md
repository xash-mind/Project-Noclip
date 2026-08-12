# Project Status

**Last verified runtime:** 2026-08-12 (Asia/Kolkata)  
**Canonical production:** https://project-noclip.vercel.app  
**Production release commit:** `b0a966bc28e2a44527f8112fcf66fa1d7cd821ca`  
**Visible deployed version:** `v0.3.0-dev.3`  
**Product change source:** PR #41 / merge commit `439ecb7392406aebf8a4fe9c813b26f5ca851174`, startup hotfix PR #42 / merge commit `b0a966bc28e2a44527f8112fcf66fa1d7cd821ca`  
**Save schema:** `v2`  
**New-journey generation:** `gen3-v1`  
**Current architecture direction:** Generation 3 — GitHub Issue #31  
**World vocabulary/catalog:** `WORLD.md`

## Health

**Canonical production is accepted at `v0.3.0-dev.3`.** The live site visibly reports dev.3 and the production desktop Chromium journey passed its complete functional path on release commit `b0a966bc28e2a44527f8112fcf66fa1d7cd821ca`: title/new journey, WebGL + HUD + Timeline Watch, schema-v2 persistence, World Lab diagnostics, floor-hole Carver preview, all implemented Item/Feature showcase objects, showcase clear, refresh/Continue restoration, and zero blocking browser-console errors.

The production evidence reports **49 loaded Cells, 524 colliders, 9 interactions and 64 draw calls** at the default spawn, inside explicit renderer budgets. The desktop run completed despite non-blocking headless screenshot timeouts from SwiftShader; functional assertions and browser-console checks remained green.

The overall production-smoke workflow is red only because the existing hosted-runner landscape-touch emulator again failed to deliver its synthetic look gesture (`yaw 0.0 -> 0.0`). In that same live dev.3 mobile run, touch mode/version, 44px-plus controls, normal movement and simultaneous Sprint+Move all passed before the synthetic-look assertion. This is retained as a test-harness limitation, not promoted as a product regression; physical-device mobile performance and ergonomics remain unverified.

The renderer-regression workflow consumes the exact `Production release commit` and `Visible deployed version` keys above. Keep those machine-readable fields stable when editing this document.

## Generation 3 accepted architecture

Generation 3 remains the active architecture for new journeys:

```text
seed
  -> multi-scale Fields
  -> continuous Region geography
  -> world-space architecture + Euclidean Geometry
  -> Materials + Conditions
  -> Carvers
  -> Structures
  -> Features / Items / Transitions
  -> runtime mutations + save deltas
```

Existing pre-versioned journeys remain on frozen `gen2`; new journeys persist `generationVersion: gen3-v1`. Cells are streaming/cache units only, never rooms. Playable Geometry remains Euclidean.

## `v0.3.0-dev.3` release — PR #41 + PR #42

PR #41 is the room-topology and lighting pass prompted by the dev.2 player audit:

- Ordinary Level 0 uses a denser world-space partition cadence, longer runs and deterministic orthogonal companion runs so architecture intersects into room/corridor boundaries instead of reading as scattered walls in one open hall.
- Long partitions use more meaningful deterministic openings so traversal can be shaped rather than every obstacle being globally bypassable at a nearby end.
- Arch Rooms now combine pale full-height room walls with shorter, rarer signature arch-divider walls; arch dividers no longer stand alone across otherwise empty halls.
- Pillar Fields retain the accepted 7.2 m world lattice while using broader piers to reduce the excessive effective gap.
- Real fluorescent fixture source energy no longer increases merely because the player approaches; PlayCanvas range/falloff owns physical distance response.
- Generation Field seed hashes/indices are cached so the denser architecture remains inside the existing generation-time budget.

PR #42 is a startup-only production hotfix. The final radius-3/49-Cell fog-safe streaming envelope is unchanged, but launch first submits the nearby radius-2/25-Cell world, publishes the first useful HUD state, then loads the fog-hidden outer 24 Cells after two animation frames. A radius-2 default was explicitly rejected because it would expose a 28 m stream edge before the 41 m fog end.

Verification evidence:

- TypeScript passed.
- **52/52 tests** passed, including dev.3 topology, Arch enclosure, Pillar width and fixture-proximity regressions.
- 10,000-Cell benchmark passed under the 500 us/Cell cap; representative accepted candidate measured ~484–486 us/Cell, max 63 walls/Cell, 0 placement errors and 0 forbidden ordinary motifs.
- Pillar P50/P90 crossings remained 17.78/29.04 minutes; Arch P50 remained 12.37 minutes.
- Production build passed.
- Renderer comparison against accepted dev.2 passed all draw/collider/interaction budgets and preserved schema `v2`, `gen3-v1`, seed, character and exact save position with zero browser errors.
- Canonical production desktop verification passed on the final startup-hotfix commit.

## Canonical world facts

- **Playable Level:** Level 0 only.
- **Registered exit destinations, not playable Levels:** Level 1, 2, 13, 14, 27, 483, 0.22, 0.23, 0.99, Red Rooms and Void.
- **Regions implemented for Gen3 new journeys:** Ordinary Level 0, Pillar Field, Arch Rooms.
- **Geometry:** Euclidean implemented; player-facing Non-Euclidean behavior remains unimplemented and requires explicit deterministic design.
- **Materials implemented:** Level 0 wallpaper, carpet, suspended ceiling, fluorescent panel; Arch pale wallpaper.
- **Conditions implemented:** damp carpet, deep wet carpet, shallow/dry carpet, Blackout.
- **Carver implemented:** floor-hole cluster.
- **Structures implemented:** Manila Room and exit structures.
- **Routine generated Entity system:** none in current scope.
- **Implemented Items:** Flashlight, Battery, Almond Water, Permanent Marker, Paper Note, Glow Stick, String Spool, Empty Can and Pry Tool.

## Current ready work

Generation 3 remains the active milestone under Issue #31, with Level 0 fidelity follow-up under Issue #37. The next player audit should judge whether dev.3's denser partition network actually creates convincing room-size variation, forced routing and Arch-room enclosure in normal play rather than only satisfying structural metrics.

Do not reopen the accepted startup change unless player evidence or profiling shows a new regression. Keep unrelated renderer/physics work separate.

## Separate deferred work

- Broad Issue #11 contains independently revalidatable renderer/presentation/physics claims; keep unrelated work separate from Generation 3.
- Draft PR #12 remains donor/reference material only and must not be resumed wholesale.
- Terminal falling/death physics remain unimplemented.
- Physical Android/iOS FPS, thermals, battery use and native-browser ergonomics remain unmeasured.
- Long-session memory growth remains unmeasured.
- Primitive geometry remains placeholder-quality in places.
- Hosted-runner synthetic touch-look delivery remains flaky and should be repaired as test infrastructure separately from product generation work.

## Decisions needed from Sash

**None.** The requested dev.3 room-density/topology, Arch enclosure, Pillar-spacing and lighting pass is deployed. The next useful input is a normal player audit of the live build.

## Version policy

Project Noclip remains opted into the manual-project version indicator policy. Accepted canonical production is `v0.3.0-dev.3` at release commit `b0a966bc28e2a44527f8112fcf66fa1d7cd821ca`.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Production: https://project-noclip.vercel.app
- Generation 3 architecture: https://github.com/xash-mind/Project-Noclip/issues/31
- Level 0 fidelity: https://github.com/xash-mind/Project-Noclip/issues/37
- Generation 3 cutover: https://github.com/xash-mind/Project-Noclip/pull/39
- Dev.2 perceptual-substrate release: https://github.com/xash-mind/Project-Noclip/pull/40
- Dev.3 room-topology/lighting release: https://github.com/xash-mind/Project-Noclip/pull/41
- Dev.3 startup hotfix: https://github.com/xash-mind/Project-Noclip/pull/42
- Dev.3 production verification: https://github.com/xash-mind/Project-Noclip/actions/runs/31572341358
- World vocabulary/catalog: `WORLD.md`
- Shared operations: https://github.com/xash-mind/project-operations
