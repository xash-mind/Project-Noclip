# Project Status

**Last verified runtime:** 2026-08-11 (Asia/Kolkata)  
**Canonical production:** https://project-noclip.vercel.app  
**Production release commit:** `00ad6dc0a268c99ed31fa654a815babe6421f2c4` from PR #39  
**Visible production version:** `v0.3.0-dev.1`  
**Repository version:** `v0.3.0-dev.2`  
**Ready production candidate:** PR #40 / product merge commit `5aadaf1700252a290c41d588c8f0d5944418f39e`  
**Verified PR #40 preview head:** `62be4bfdd0e8a75de9760a7acca419981ec65af8`  
**Save schema:** `v2`  
**New-journey generation:** `gen3-v1`  
**Current architecture direction:** Generation 3 — GitHub Issue #31  
**World vocabulary/catalog:** `WORLD.md`

## Health

**Product code healthy; production promotion blocked by Vercel deployment quota.** Canonical production is still `v0.3.0-dev.1`. PR #40 is merged and its `v0.3.0-dev.2` build is fully verified, but the merge deployment was rejected by Vercel with `api-deployments-free-per-day` after the account exceeded 100 deployments in the rolling day.

Do not treat later docs-only green Vercel commit statuses as evidence that `v0.3.0-dev.2` reached production. The user's live version indicator and live behavior correctly reveal that production never moved from PR #39.

The PR #40 preview itself reached **Ready** before the quota failure. No additional product-code change is required to obtain the intended `v0.3.0-dev.2` release; the remaining release action is to promote/deploy that already-verified candidate once Vercel accepts another production deployment, then rerun the canonical production browser/touch smoke.

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

## `v0.3.0-dev.2` candidate — PR #40

The candidate is merged and verified but **not yet canonical production**. It corrects the first post-cutover perceptual problems:

- denser ordinary Level 0 architecture without returning to room templates;
- `axisFlow` as a deterministic directional bias rather than a hard cardinal command;
- Cell-independent Gen3 wallpaper/carpet/ceiling finish identity;
- complete wallpaper repeats on clipped continuous wall pieces;
- fog/background coverage that conceals the unloaded streaming horizon;
- regression gates for stream/fog coverage, orientation balance and finish continuity.

Verification before merge/promotion:

- `npm run check` passed;
- **48/48 tests** passed;
- 10,000-Cell benchmark: **0 forbidden ordinary motifs**, **0 placement errors**, geography boundary delta `6e-9`;
- clean-head desktop, landscape-touch and world-cohesion Chromium journeys passed;
- save/reload preserved schema `v2`, `gen3-v1`, seed, character and exact position;
- renderer regression passed against accepted `v0.3.0-dev.1` production;
- fixed default-spawn comparison: **82 → 52 draw calls**, **95 → 163 colliders**, still comfortably inside explicit budgets;
- saved verification artifact reports visible candidate version **`v0.3.0-dev.2`** with 49 loaded Cells, 163 colliders, 9 interactions and 52 draw calls.

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

**Release PR #40 to canonical production without changing product code.** Prefer promoting the already-built Ready preview if an authenticated Vercel promotion path is available; otherwise wait for the deployment quota to admit a production deployment. After promotion, verify the visible `v0.3.0-dev.2` indicator and run the repository's canonical production desktop/touch smoke before recording dev.2 as accepted production.

Do not create repeated no-op/status commits merely to probe Vercel capacity. They add deployment churn and do not advance the release.

## Separate deferred work

- Broad Issue #11 contains independently revalidatable renderer/presentation/physics claims; keep unrelated work separate from Generation 3.
- Draft PR #12 remains donor/reference material only and must not be resumed wholesale.
- Terminal falling/death physics remain unimplemented.
- Physical Android/iOS FPS, thermals, battery use and native-browser ergonomics remain unmeasured.
- Long-session memory growth remains unmeasured.
- Primitive geometry remains placeholder-quality in places.

## Decisions needed from Sash

**None for the release itself.** The blocker is provider capacity/access, not product direction.

## Version policy

Project Noclip remains opted into the manual-project version indicator policy. Root `VERSION` is `0.3.0-dev.2`, but canonical production remains `v0.3.0-dev.1` until the candidate is actually promoted and visibly verified.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Production: https://project-noclip.vercel.app
- Generation 3 architecture: https://github.com/xash-mind/Project-Noclip/issues/31
- Generation 3 cutover: https://github.com/xash-mind/Project-Noclip/pull/39
- Perceptual-substrate candidate: https://github.com/xash-mind/Project-Noclip/pull/40
- Ready PR #40 preview: https://project-noclip-git-agent-gen3-substrate-densi-7f6ccd-xash-mind0.vercel.app
- PR #40 clean-head CI: https://github.com/xash-mind/Project-Noclip/actions/runs/31493658597
- PR #40 renderer regression: https://github.com/xash-mind/Project-Noclip/actions/runs/31493658583
- World vocabulary/catalog: `WORLD.md`
- Shared operations: https://github.com/xash-mind/project-operations
