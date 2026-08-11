# Project Status

**Last verified runtime:** 2026-08-11 (Asia/Kolkata)  
**Canonical production:** https://project-noclip.vercel.app  
**Production deployment commit:** `9e73ef54975269461a5de0e282facfc2a0c27a3b`  
**Product change source:** PR #40 / merge commit `5aadaf1700252a290c41d588c8f0d5944418f39e`  
**Production target version:** `v0.3.0-dev.2`  
**Last independently observed production version before retry:** `v0.3.0-dev.1`  
**Independent visible/browser confirmation of retry:** pending  
**Save schema:** `v2`  
**New-journey generation:** `gen3-v1`  
**Current architecture direction:** Generation 3 — GitHub Issue #31  
**World vocabulary/catalog:** `WORLD.md`

## Health

**Product-tracked `v0.3.0-dev.2` production deployment succeeded in Vercel.** The first PR #40 merge deployment was rejected by the account's `api-deployments-free-per-day` limit, which is why canonical production remained on `v0.3.0-dev.1` when Sash checked it.

A deliberate release retry then changed only the formatting of the already-canonical `VERSION` file (`0.3.0-dev.2` remains semantically unchanged). Commit `9e73ef54975269461a5de0e282facfc2a0c27a3b` touched a production-tracked path, entered Vercel as **pending**, and then completed **successfully** at deployment `EmKRdFxkRixJhECP7zTALjHZYviq`.

This is materially different from the earlier docs-only green statuses: `vercel.json` explicitly ignores docs-only changes via `ignoreCommand`, so those statuses were not evidence that production moved. The release retry changed `VERSION`, which is included in the product deployment path set and imported into the app by `src/version.ts`.

The connected Vercel OAuth surface still cannot fetch this project's canonical public `/VERSION`, so provider deployment success and independent visible/browser confirmation remain separate. Do not mark the release fully accepted until canonical production visibly reports `v0.3.0-dev.2` and the production browser/touch smoke passes.

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

## `v0.3.0-dev.2` release — PR #40

PR #40 corrects the first post-cutover perceptual problems:

- denser ordinary Level 0 architecture without returning to room templates;
- `axisFlow` as a deterministic directional bias rather than a hard cardinal command;
- Cell-independent Gen3 wallpaper/carpet/ceiling finish identity;
- complete wallpaper repeats on clipped continuous wall pieces;
- fog/background coverage that conceals the unloaded streaming horizon;
- regression gates for stream/fog coverage, orientation balance and finish continuity.

Verification before release:

- `npm run check` passed;
- **48/48 tests** passed;
- 10,000-Cell benchmark: **0 forbidden ordinary motifs**, **0 placement errors**, geography boundary delta `6e-9`;
- clean-head desktop, landscape-touch and world-cohesion Chromium journeys passed;
- save/reload preserved schema `v2`, `gen3-v1`, seed, character and exact position;
- renderer regression passed against accepted `v0.3.0-dev.1` production;
- fixed default-spawn comparison: **82 → 52 draw calls**, **95 → 163 colliders**, still comfortably inside explicit budgets;
- saved verification artifact reports candidate version **`v0.3.0-dev.2`** with 49 loaded Cells, 163 colliders, 9 interactions and 52 draw calls.

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

**Verify the canonical production surface now reports `v0.3.0-dev.2`, then run the repository's production desktop/touch smoke.** No additional deployment or product-code change is needed unless that verification fails.

Do not create further no-op/status release triggers.

## Separate deferred work

- Broad Issue #11 contains independently revalidatable renderer/presentation/physics claims; keep unrelated work separate from Generation 3.
- Draft PR #12 remains donor/reference material only and must not be resumed wholesale.
- Terminal falling/death physics remain unimplemented.
- Physical Android/iOS FPS, thermals, battery use and native-browser ergonomics remain unmeasured.
- Long-session memory growth remains unmeasured.
- Primitive geometry remains placeholder-quality in places.

## Decisions needed from Sash

**None for the release itself.** Escalate only if the canonical site still fails to move to dev.2 after the successful product-tracked deployment.

## Version policy

Project Noclip remains opted into the manual-project version indicator policy. Root `VERSION` is `0.3.0-dev.2`. Record dev.2 as fully accepted production only after visible/browser verification of the successful release retry.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Production: https://project-noclip.vercel.app
- Generation 3 architecture: https://github.com/xash-mind/Project-Noclip/issues/31
- Generation 3 cutover: https://github.com/xash-mind/Project-Noclip/pull/39
- Perceptual-substrate release: https://github.com/xash-mind/Project-Noclip/pull/40
- Ready PR #40 preview: https://project-noclip-git-agent-gen3-substrate-densi-7f6ccd-xash-mind0.vercel.app
- PR #40 clean-head CI: https://github.com/xash-mind/Project-Noclip/actions/runs/31493658597
- PR #40 renderer regression: https://github.com/xash-mind/Project-Noclip/actions/runs/31493658583
- World vocabulary/catalog: `WORLD.md`
- Shared operations: https://github.com/xash-mind/project-operations
