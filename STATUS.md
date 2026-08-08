# Project Status

**Last verified:** 2026-08-08 (Asia/Kolkata)  
**Accepted runtime source:** `7b09d0e01db53c4a704fcada48b6a4afd91140d0` from PR #24  
**Production release commit:** `7b09d0e01db53c4a704fcada48b6a4afd91140d0`  
**Production:** https://project-noclip.vercel.app — HTTP 200, desktop and landscape-touch journeys verified  
**Visible deployed version:** `v0.2.0-dev.4`  
**Verification:** final-head CI, deterministic 10k sweep, renderer comparison, cohesion screenshots and canonical production smoke passed

## Health

**Healthy.** Level 0 Alpha 0.2 now better matches the project’s “empty by design” direction while preserving deterministic world laws and IndexedDB save schema v2. Ordinary carpet renders as one continuous surface instead of repeated worn/dry/damp rectangular overlays; most ordinary cells contain no optional scenery; non-essential solid scenery is deterministically omitted when it overlaps accepted geometry; and existing arch IDs now render with visible ceiling separation.

Desktop and landscape-touch controls remain intact. The root `VERSION` and isolated removable development indicator are aligned on canonical production at **`v0.2.0-dev.4`**.

## Current milestone

[Issue #22](https://github.com/xash-mind/Project-Noclip/issues/22) is complete and deployed through [PR #24](https://github.com/xash-mind/Project-Noclip/pull/24).

The next bounded milestone is [Issue #20](https://github.com/xash-mind/Project-Noclip/issues/20): make procedural ambience follow pause/focus/modal lifecycle and soften the fluorescent hum without pulling in deterministic fixture groups or cross-cell acoustics yet.

Broad [Issue #11](https://github.com/xash-mind/Project-Noclip/issues/11) remains a backlog container and draft [PR #12](https://github.com/xash-mind/Project-Noclip/pull/12) must not be merged wholesale.

## Working now

- Browser-first TypeScript/Vite runtime using PlayCanvas Engine
- Renderer-independent deterministic world generation and stable identities
- Deterministic 5×5 district planning with sixteen current room archetypes
- Continuous ordinary Level 0 carpet presentation; explicit deterministic Hole Section breaches remain
- Deterministic optional-scenery rarity with structural/special props preserved
- Deterministic rejection of non-essential solid scenery overlap without rewriting retained prop IDs
- Arch posts/beams keep their existing stable IDs and render with 0.28 m ceiling clearance
- Swept-circle movement collision, timeline gates and IndexedDB save schema v2
- Static PlayCanvas batching for compatible streamed Level 0 geometry
- Shared desktop/touch `PlayerIntent`; landscape Move, Sprint, Look, Marker, Interact, Use and World Lab
- Searchable World Lab object catalog covering all 23 current items and prop kinds
- Root `VERSION` plus isolated removable development-version indicator
- Strict TypeScript, deterministic/system tests, 10,000-cell benchmark, desktop/mobile Chromium journeys and dedicated world-cohesion browser evidence
- Generic renderer guard against the accepted production baseline, with exact loaded-cell/collider/interaction invariants and 5%/+2 draw-call tolerance
- Generic production evidence publisher resolving the product commit, merged PR and closing issue automatically

## World-cohesion release

[PR #24](https://github.com/xash-mind/Project-Noclip/pull/24) implements only the bounded #22 composition correction. It does not change district or connector selection, world/cell addresses, timeline gates, active-radius defaults, loot identities, collision resolution, save types or migration.

The final 10,000-cell benchmark in CI run [`31271452264`](https://github.com/xash-mind/Project-Noclip/actions/runs/31271452264) recorded:

- **33,671 total props**, down from the prior 43,955 benchmark baseline
- **9,994 ordinary cells** sampled
- **8,203 ordinary cells (82.08%) with no optional scenery**
- **1,791 optional scenery props** across those ordinary cells
- all **16 current archetypes** still reachable
- **0 connector errors**
- **0 placement errors**
- Manila Room table/book semantics preserved
- ordinary non-hole carpet overlays absent while Hole descriptors remain explicit
- deterministic arch IDs preserved with enforced ceiling clearance

The fixed `sparse-1` Chromium scene and forced Arch Room were visually reviewed from artifact `9025781048`: the sparse open office retains architecture over one continuous carpet field without furniture clutter, and the arch beam is visibly separated from the ceiling. Responsive/headless browser evidence is not a physical-device visual-performance claim.

## Accepted renderer baseline

The accepted normal `threshold-001` radius-3 scene is now **146 draw calls / 49 loaded cells / 485 colliders / 7 interactions**.

PR #24 renderer run [`31271452259`](https://github.com/xash-mind/Project-Noclip/actions/runs/31271452259) compared accepted `v0.2.0-dev.3` production with the exact candidate on the same Chrome/SwiftShader runner:

- normal radius 3: **174 → 146 draw calls**, **550 → 485 colliders**, 49 loaded cells / 7 interactions unchanged
- forced Hole Section radius 1: **37 → 37 draw calls**, 9 / 59 / 1 unchanged
- World Lab showcase: **171 → 144 draw calls**, **555 → 486 colliders**, 49 loaded cells / 7 interactions unchanged
- save schema **v2**, character and seed preserved with **0.0 m** reload-position delta
- zero blocking browser-console errors

The temporary collider-reduction allowance used to review #24 is removed after acceptance; the generic guard now treats `v0.2.0-dev.4` / `7b09d0e…` as the accepted baseline and again requires exact loaded-cell/collider/interaction invariants unless a future bounded change explicitly justifies a reviewed exception. SwiftShader remains a relative renderer-regression signal, not a physical-GPU FPS claim.

## Production release evidence

Product-changing merge [PR #24](https://github.com/xash-mind/Project-Noclip/pull/24) produced release commit [`7b09d0e`](https://github.com/xash-mind/Project-Noclip/commit/7b09d0e01db53c4a704fcada48b6a4afd91140d0). GitHub's Vercel status for that exact merge commit completed successfully.

Canonical production run [`31271881048`](https://github.com/xash-mind/Project-Noclip/actions/runs/31271881048) verified:

- HTTP 200 at https://project-noclip.vercel.app
- exact visible version **`v0.2.0-dev.4`**
- HTML SHA-256 `bd110d3da6e74b9f43b59609e11b46bb92738d7e9ab52f6867e71393d3e99a68`
- live world metrics **49 loaded cells / 485 colliders / 7 interactions / 146 draw calls**
- desktop WebGL/HUD/World Lab/Hole/catalog/save/reload journey passed
- landscape mobile movement `[0.0, 0.0] → [0.0, -0.6]`
- landscape touch-look yaw `0.0 → -17.955°`
- persisted touch Marker path and save schema v2 continuity remained intact
- desktop browser errors **0** and mobile browser errors **0**

Production evidence was published automatically to [Issue #22](https://github.com/xash-mind/Project-Noclip/issues/22#issuecomment-5227509999). Release identity is grounded by the exact merge commit, successful Vercel commit status, canonical URL, visible version, public asset hash and browser evidence.

## Latest meaningful change

Merged and deployed [PR #24](https://github.com/xash-mind/Project-Noclip/pull/24), closing [Issue #22](https://github.com/xash-mind/Project-Noclip/issues/22) and releasing the sparse Level 0 world-cohesion pass as **`v0.2.0-dev.4`**.

The release removes ordinary carpet overlay descriptors from rendered generation output, makes optional scenery rare and overlap-safe, preserves required structural/special props and stable IDs, and lowers arch geometry below the ceiling without introducing the broader modular-generation rewrite.

## Top blocker

No release blocker is active.

The highest-value unresolved product defect is [Issue #20](https://github.com/xash-mind/Project-Noclip/issues/20): procedural ambience does not yet correctly follow pause, focus loss, World Lab and note/modal lifecycle, and the current fluorescent hum remains harsher than intended.

Physical Android/iOS performance, thermals and ergonomics also remain unverified.

## Next recommended action

Execute [Issue #20](https://github.com/xash-mind/Project-Noclip/issues/20) as the next bounded product slice: centralize ambience active/inactive lifecycle, smoothly mute/resume without timer bursts or duplicate audio graphs, and soften the existing fluorescent hum while preserving deterministic world/save contracts. Keep deterministic fixture groups, clustered acoustics and the modular room grammar as later independent slices.

## Decisions needed from Sash

None for Issue #20. Its scope and acceptance criteria are already specific enough to implement without new product direction.

## Known risks and unverified claims

- Physical Android/iOS FPS, thermals, battery use and native browser ergonomics have not yet been measured.
- Headless Chromium grants pointer lock, but synthetic desktop `KeyW` movement remains nondeterministic; native keyboard movement remains a manual regression layer.
- Procedural ambience pause/modal lifecycle and hum comfort remain unresolved; tracked in Issue #20.
- Deterministic fixture light groups and clustered cross-cell ambience are not yet implemented.
- Hole rendering is visually recessed, but falling and terminal-hole physics are not implemented yet.
- Primitive geometry remains placeholder-quality; imported art assets are future work.
- Long-session memory growth remains unmeasured.
- Some generated structural props still use simple AABB collision.

## Version policy state

Project Noclip is opted into the manual-project version indicator policy. The canonical root `VERSION` is **`0.2.0-dev.4`** and the removable indicator is visibly verified on canonical production as **`v0.2.0-dev.4`** through production run [`31271881048`](https://github.com/xash-mind/Project-Noclip/actions/runs/31271881048).

The mapped Notion project page and shared Projects version dashboard must carry this exact verified value after the final synchronization step.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- World-cohesion PR: https://github.com/xash-mind/Project-Noclip/pull/24
- Closed world-cohesion issue: https://github.com/xash-mind/Project-Noclip/issues/22
- Production release verification: https://github.com/xash-mind/Project-Noclip/actions/runs/31271881048
- Final-head CI: https://github.com/xash-mind/Project-Noclip/actions/runs/31271452264
- Renderer comparison: https://github.com/xash-mind/Project-Noclip/actions/runs/31271452259
- Next audio lifecycle issue: https://github.com/xash-mind/Project-Noclip/issues/20
- Broad deferred issue: https://github.com/xash-mind/Project-Noclip/issues/11
- Deferred draft PR: https://github.com/xash-mind/Project-Noclip/pull/12
- Production target: https://project-noclip.vercel.app
- Shared operations: https://github.com/xash-mind/project-operations
