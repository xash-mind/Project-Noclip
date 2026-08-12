# Project Status

**Last verified runtime:** 2026-08-12 (Asia/Kolkata)  
**Canonical production:** https://project-noclip.vercel.app  
**Production release commit:** `5b8c95e19ea3104d21e218229c9bd2d25277d8c0`  
**Visible deployed version:** `v0.3.0-dev.4`  
**Product change source:** PR #43 / squash merge `c17da1ef81e96a7d46cf75b221f189925dae4628`, release commit `5b8c95e19ea3104d21e218229c9bd2d25277d8c0`  
**Save schema:** `v2`  
**New-journey generation:** `gen3-v1`  
**Current architecture direction:** Generation 3 — GitHub Issue #31  
**World vocabulary/catalog:** `WORLD.md`

## Health

**Canonical production remains accepted at `v0.3.0-dev.4`, but the first normal human dev.4 play audit found material player-facing Generation 3 gaps.** Dev.4 fixed dev.3's catastrophic navigability failure and is a clear step in the right direction; it is not yet the accepted end-state for Level 0 spatial/fidelity work.

The current corrective objective is [Issue #46](https://github.com/xash-mind/Project-Noclip/issues/46), under the Generation 3 architecture in #31 and Level 0 fidelity contract in #37.

### Fresh audit conclusions

- **Ordinary Level 0:** broad reachability is fixed, but normal space is too airy. The current solver lacks enough bounded one-entry rooms, short constrained connectors and genuinely claustrophobic pockets.
- **Junction morphology:** four-way top-down `+` wall intersections are structurally overrepresented. Both orthogonal substrate axes are solved independently on the same world lattice; there is no perpendicular junction-type resolver/budget.
- **Pillar Field:** dev.4 overcorrected away from the near-pure dev.3 lattice. Common Pillar territory can read as wall rooms with occasional pillars because the wall substrate is generated first, normal Pillar influence suppresses walls only mildly, and pillar candidates are then discarded when they intersect walls or reserved passages.
- **Region depth:** the existing continuous affinity Fields are the correct foundation, but Pillar identity needs a clearer monotonic blend-edge → mixed → pillar-dominant → rare near-pure-lattice progression. Do not replace this with hard Cell bands.
- **Hole Carver:** natural clusters currently use a hard radius and near-uniform candidate lattice. The validated follow-up direction is sparse outer pits → denser core while retaining bypass lanes; Hole remains a Carver, not a Region.
- **Arch Rooms:** current mathematical symmetry/seam tests do not guarantee source fidelity in normal play. The runtime can fail to read as the promoted continuous pale divider with repeated arch-shaped openings, visible vertical bay/end structure, solid lower band and continuous header. This is a source-fidelity and implementation-quality regression tracked by #46/#37.

## Accepted dev.4 baseline that must be preserved

Generation 3 remains world-first:

```text
seed + generation version
  -> kilometre-scale Region / Condition affinity Fields
  -> deterministic world-space walkable/connectivity substrate
  -> local partition-segment solver + continuous Region modifiers
  -> Euclidean Geometry + Materials + Conditions
  -> Carvers
  -> Structures
  -> Features / Items / Transitions
  -> runtime mutations + save deltas
  -> Cells as streaming/cache ownership only
```

Preserve `gen3-v1`, schema-v2 save compatibility, Euclidean Geometry, stable semantic identities where possible, seed-domain separation, Manila/Transition rules, renderer budgets and frozen Gen2 old-save isolation.

The dev.4 candidate evidence before release remains valid technical baseline evidence: 56/56 deterministic/system tests, healthy 10,000-Cell generation benchmark, renderer/save-reload regression, and candidate Visual Coherence captures. The post-release GitHub Actions billing/spending-limit block still prevents a fresh canonical-production workflow run from being claimed as green.

## Verification interpretation

The dev.4 automated gates successfully detected dev.3's sealed-world failure, but they are incomplete as player-facing acceptance:

- Ordinary tests emphasize very high reachable-area ratio and broad P50/P90/P99 open-space ranges, but do not require a lower-tail frequency of claustrophobic one-entry spaces.
- No permanent gate currently budgets four-way `+` junctions against corners, T-junctions, terminations and straight spans.
- Pillar tests accept a broad mixed range of walls and columns but do not require monotonic density by Region depth or a source-like core progression.
- Arch diagnostics prove world ownership, symmetry rarity and non-overlap, but not the complete rendered REF-L0-007 silhouette.

Human play therefore remains authoritative for these perceptual requirements.

## Current ready work

**Issue #46 — restore spatial hierarchy, Region depth and Arch fidelity.** This is the largest safe coherent next objective because all three high-impact findings live in the Generation 3 architecture/Region-modifier layer:

1. add deterministic junction morphology so four-way crosses become an intentional minority;
2. add a bounded lower tail of claustrophobic/one-entry spaces without recreating sealed-world failures;
3. make Pillar density and wall suppression vary monotonically with Region depth, ending in rare near-pure lattice cores;
4. restore rendered Arch divider fidelity against the promoted source grammar.

Treat the Hole border-to-core density gradient as the immediate Carver follow-up unless it remains a small, safely verifiable extension of the same run.

Do not tune only to historical wall-count or reachable-area metrics. Add morphology, Region-depth and rendered-silhouette acceptance evidence.

## Remaining known gaps

- Fresh canonical-production automation is still affected by the GitHub Actions billing/spending-limit runner block recorded during dev.4 acceptance.
- This audit environment could not independently capture the live Vercel runtime, so current visual findings rely on direct human play evidence plus code/test reconciliation. Do not pretend perceptual audio was heard; audio quality remains unverified in this audit.
- Physical Android/iOS FPS, thermals, battery use and native-browser ergonomics remain unmeasured.
- Long-session memory growth remains unmeasured.
- Primitive geometry remains placeholder-quality in places.

## Decisions needed from Sash

**None for the next run.** The dev.4 player audit supplies enough direction to execute Issue #46 within the existing world laws.

## Version policy

Project Noclip remains opted into the manual-project version indicator policy. Canonical production remains `v0.3.0-dev.4` at release commit `5b8c95e19ea3104d21e218229c9bd2d25277d8c0`. This audit does not change the visible version and must not deploy.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Production: https://project-noclip.vercel.app
- Generation 3 architecture: https://github.com/xash-mind/Project-Noclip/issues/31
- Level 0 fidelity: https://github.com/xash-mind/Project-Noclip/issues/37
- Dev.4 player audit / next objective: https://github.com/xash-mind/Project-Noclip/issues/46
- Dev.4 world-coherence release: https://github.com/xash-mind/Project-Noclip/pull/43
- World vocabulary/catalog: `WORLD.md`
