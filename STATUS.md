# Project Status

**Last reconciled:** 2026-08-18 (Asia/Kolkata)  
**Canonical production:** https://project-noclip.vercel.app  
**Visible release version:** `v0.3.0-dev.8`  
**Release checkpoint:** **DEV.8 — POST-PAU CLEAN RECOVERY CHECKPOINT**  
**Recovery anchor:** `4e96157bb9a85564ff9ab381ce19370fe0f3373d`  
**Release PR:** GitHub PR #61 — `release/dev8-post-pau-recovery`  
**Previous production baseline:** `v0.3.0-dev.7` / `8fe71c43b6050ab69b00711116c896f3e52a9337`  
**Production release evidence:** the exact promoted commit and deployment verification are recorded on PR #61 by the release/production-smoke path after promotion  
**Save schema:** `v2`  
**New-journey generation:** `gen3-v1`  
**Architecture direction:** Generation 3 — GitHub Issue #31  
**World vocabulary/catalog:** `WORLD.md`

## Current accepted release

Dev.8 is an intentionally conservative recovery checkpoint. It restores Project Noclip to the clean post-PAU / Noclip Studio architecture at `4e96157bb9a85564ff9ab381ce19370fe0f3373d`, then adds only release-verification/documentation compatibility work that does not alter deterministic world truth or the recovered renderer runtime.

Dev.8 deliberately **does not preserve the latest A-A1 visual redesign**. The later Arch repair/reconstruction chain is abandoned for this checkpoint because it introduced overlapping presentation ownership and eventually reproduced a real PlayCanvas shadow/render-target failure under World Lab Region relocation.

The recovered release keeps:

- PAU Run 1 presentation architecture and Representation bindings;
- PAU Run 2 / Noclip Studio foundation;
- DevelopmentContext and ChangeReceipt contracts;
- asset validation/fallback architecture and production Studio bridge exclusion;
- deterministic Generation 3 world identity and frozen Generation 2 save compatibility;
- the clean anchor's Arch presentation/collision behavior;
- the clean post-PAU streaming/static-batching implementation;
- the retained fixture-light architecture in which active M-F1 Omnis and active shadow-casting M-F1 Omnis remain one-to-one.

The discarded post-anchor A-A1 chain includes the reconstruction/correction sequence beginning at `f3fd36e1a527ebb6cd1ec98802526a2bbda4daa3`, through `dd841f747cb3f028bd3c15d366589e945ec2be5e`, `dd0d919f3f5935f1ddc0ef2d832bccb55f012775`, `6c17f6789dd3023083dedfa33c2425de2327ef2e`, `ee3be744e6557b29d1299042aea1b4b4d75ec781`, and the later `studio-test` repair work. `archSmoothPresentationCorrection.ts` is not part of Dev.8.

## Recovery evidence

- Exact recovery anchor `4e96157` passed the real Chromium Region-locator journey that exposed the regression: Ordinary → Arch → Pillar → Arch → Ordinary → Arch.
- That anchor run preserved ordinary loaded Cell geometry/colliders through the transitions and produced no blocking PlayCanvas ShadowRenderer/render-target exception.
- Representative generated descriptor snapshots for the Dev.8 recovery candidate are byte-identical to the recovery anchor, including the located Arch occurrence and surrounding Cells.
- World seed outcomes, `generationVersion`, save schema, Cell identities, Region geography, generated wall/Feature identity and topology remain unchanged by the recovery.
- No renderer, world-generation, lighting, movement, gameplay, save, static-batching or A-A1 runtime implementation is changed from the recovery anchor by the release-record work itself.

## Verification contract

Dev.8 release acceptance requires the exact final release candidate to pass:

- strict TypeScript;
- the full deterministic/system test suite;
- PAU validation;
- Studio validation and bridge/security checks;
- Generation 2 deterministic/save compatibility tests;
- Generation 3 deterministic/world-identity tests;
- Region generation/locator and Arch route/collision tests;
- fixture-light, render-settings and streaming/static-batching tests;
- the 10,000-Cell generator benchmark;
- production build and production Studio-boundary check;
- real Chromium desktop/mobile/world-cohesion journeys, including repeated Arch/Pillar/Ordinary Region relocation with no severe browser errors;
- Renderer Regression under the post-PAU shadow-aware budget, explicitly requiring `activeOmnis == shadowedOmnis`;
- blocking World/Region + fidelity browser evidence;
- main-branch CI and bounded production smoke after promotion.

The exact Actions/deployment evidence is kept on PR #61 and its release artifacts so the repository does not need a post-release code commit merely to backfill a deployment SHA.

## Verification calibration retained for Dev.8

Dev.7-era renderer and visual workflows contained assumptions that predated the retained post-PAU renderer. Dev.8 keeps the useful checks while avoiding unrelated visual redesign during recovery:

- Renderer Regression uses bounded post-PAU draw-call budgets and blocks any violation of the active-light/shadow one-to-one invariant rather than disabling shadows to match the older Dev.7 budget.
- World/Region and fidelity browser evidence remains blocking.
- Legacy headless luminance, pulse-timing and screenshot calibration is retained as diagnostic evidence rather than a reason to retune Level 0 during this recovery checkpoint.

## Preserved accepted direction

- `gen3-v1` and schema-v2 save compatibility;
- deterministic stable identities and world laws;
- Euclidean Geometry unless explicitly scoped otherwise;
- Cells as streaming/cache units only, never player-visible room or illumination units;
- Presentation truth separated from deterministic world identity;
- PAU as the canonical representation/asset architecture;
- Noclip Studio foundation retained behind development/security boundaries;
- Manila/Transition laws, frozen Gen2 isolation and existing movement/gameplay behavior.

## Remaining known gaps

- The latest accepted smooth A-A1 appearance is intentionally deferred. Future Arch work must rebuild it directly in the authoritative A-A1 presentation owner from Dev.8 rather than restoring the discarded correction chain.
- Noclip Studio continuous-sync remains future work and is not part of Dev.8.
- Physical Android/iOS GPU cost for the retained shadowed fixture-light architecture still requires real-device playtesting.
- Legacy headless visual-calibration diagnostics can remain runner-sensitive; they are evidence aids, not substitutes for the blocking world/fidelity and production browser journeys.
- Perceptual audio quality remains unverified unless actually listened to.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Dev.8 release PR: https://github.com/xash-mind/Project-Noclip/pull/61
- Superseded forward-recovery PR: https://github.com/xash-mind/Project-Noclip/pull/60
- Production: https://project-noclip.vercel.app
- Generation 3 architecture: https://github.com/xash-mind/Project-Noclip/issues/31
- Level 0 fidelity: https://github.com/xash-mind/Project-Noclip/issues/37
- Presentation architecture: `docs/PRESENTATION_ARCHITECTURE.md`
