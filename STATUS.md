# Project Status

**Last reconciled:** 2026-08-19 (Asia/Kolkata)  
**Canonical production:** https://project-noclip.vercel.app  
**Visible release version:** `v0.3.0-dev.8`  
**Release checkpoint:** **DEV.8 — POST-PAU CLEAN RECOVERY CHECKPOINT**  
**Recovery anchor:** `4e96157bb9a85564ff9ab381ce19370fe0f3373d`  
**Release PR:** GitHub PR #61 — `release/dev8-post-pau-recovery`  
**Dev.8 corrective candidate:** draft PR #64 — `dev8-traversal-aa1-ownership`  
**Previous production baseline:** `v0.3.0-dev.7` / `8fe71c43b6050ab69b00711116c896f3e52a9337`  
**Production release evidence:** the exact promoted commit and deployment verification are recorded on PR #61 by the release/production-smoke path after promotion  
**Save schema:** `v2`  
**New-journey generation:** `gen3-v1`  
**Architecture direction:** Generation 3 — GitHub Issue #31  
**World vocabulary/catalog:** `WORLD.md`

## Current accepted release

Canonical production remains `v0.3.0-dev.8`. Draft PR #64 is a bounded post-release Dev.8 corrective candidate and is **not** merged or production-deployed.

Dev.8 remains an intentionally conservative post-PAU recovery checkpoint. It retains PAU/Noclip Studio foundations, deterministic Generation 3 identity, frozen Generation 2 compatibility, schema-v2 saves, existing world laws and the one-to-one M-F1 active-light/shadow rule.

The discarded post-PAU correction chain remains discarded. `archSmoothPresentationCorrection.ts` is not restored. The corrective candidate does not begin Dev.9, Noclip Studio continuous-sync or the planned visibility-driven renderer architecture.

## Dev.8 corrective candidate — physical-device failure reconciliation

Physical testing has now supplied real failure evidence and must no longer be described as merely unverified:

- Device A is playable but substantially slow/laggy and exposed visible A-A1 pier/upper-mass overlap plus selective unintended Arch-head/neighbor-wall connector geometry.
- Device B can begin smoothly, then under fast traversal stop updating the rendered image, develop blue/grey dot-like corruption and subsequently crash.
- These observations are treated as separate geometry-ownership, steady-render cost, traversal-spike and possible GPU/WebGL/device-failure questions rather than one assumed cause.

Draft PR #64 confirms and corrects two A-A1 presentation-ownership defects without changing generated world truth or accepted Arch dimensions:

- reconstructed visible piers previously occupied the same upper volume as the reconstructed upper mass; visible presentation now gives the upper mass sole ownership of that intersection while preserving the continuous semantic/collision pier footprint;
- broad pale-wall support inference plus a 4.1 m header-gap bridge could selectively admit a full-height termination or unrelated pale wall into A-A1 reconstruction; those inference paths are removed while real touching/cross-Cell continuity remains supported.

The same candidate confirms a Dev.8 streaming scheduling defect:

- the advertised `2.25 ms` / one-heavy-job contract was not actually enforced;
- one queued synchronous heavy Cell operation could run before the ordinary update and a boundary reconciliation could then synchronously perform another Cell build in the same rendered frame;
- the candidate now measures frame-scoped heavy work, admits at most one heavy Cell operation in a rendered update, gives current/directional safety work priority, bounds the queue, recalculates predictive work after direction changes and removes the arbitrary extra missing-Cell emergency build.

A single synchronous Cell operation is still indivisible and may itself exceed 2.25 ms; this is recorded as a budget overrun and prevents any second heavy operation in that frame rather than pretending the operation was pre-empted.

The candidate also removes proven redundant renderer work without changing participation semantics:

- invariant M-F1 light properties are no longer rewritten for every resident fixture every frame;
- unchanged panel material/intensity/enabled values are not rewritten;
- per-Cell static batching no longer recursively scans a clean residency/presentation graph every 100 ms, but retains the same grouping/output and becomes dirty on actual Cell ownership changes.

Local-only diagnostics now record streaming queue/heavy-work timing, A-A1 reconstruction, fixture/shadow lifecycle, static batching, rendered-frame distributions and bounded failure context. `webglcontextlost` / `webglcontextrestored` and PlayCanvas device-loss/restoration signals are observed without creating a second renderer lifecycle owner or sending external telemetry.

## Corrective verification state

The corrective source has passed strict TypeScript, the full 123-test suite, PAU validation, Studio validation/security-boundary smoke, Generation 2/Generation 3 identity coverage, Arch route/collision and A-A1 reconstruction tests, fixture/render-settings/streaming/static-batching tests, the 10,000-Cell benchmark and production build before final browser evidence is accepted.

The corrected scheduler evidence proves one heavy Cell operation maximum per rendered update in the measured stress scenarios, bounded queue depth and zero measured cold-boundary emergency loads. The measured heavy Cell work is in millisecond-scale territory while full High-preset SwiftShader rendered frames can still reach multi-second stalls. That means the original scheduling defect was real and corrected, but it is not sufficient to explain or eliminate all High-preset rendering cost.

Canonical production Dev.8 showed multi-second High-preset traversal frames under software Chromium/SwiftShader while its old boundary metric reported only single-digit milliseconds, proving that the old metric materially underrepresented the whole rendered-frame failure path. The corrected candidate materially improves some stress samples and removes the double-heavy/cold-emergency path, but High remains expensive on the software renderer and therefore is **not** being declared safe for all physical-device classes from headless evidence.

Natural WebGL/context loss has not been reproduced automatically. The bounded forced device-loss diagnostic path has been exercised successfully. The physical blue/grey corruption/crash therefore remains compatible with a GPU/context/device failure hypothesis but is not proven to have that cause until the candidate is retested on the affected physical devices.

## Verification contract

Dev.8 corrective acceptance requires the exact final candidate to pass:

- strict TypeScript;
- the full deterministic/system test suite;
- PAU validation;
- Studio validation and bridge/security checks;
- Generation 2 deterministic/save compatibility tests;
- Generation 3 deterministic/world-identity tests;
- Region generation/locator and Arch route/collision tests;
- A-A1 ownership/reconstruction regressions;
- fixture-light, render-settings and streaming/static-batching tests;
- the 10,000-Cell generator benchmark;
- production build and production Studio-boundary check;
- real Chromium desktop/mobile/world-cohesion journeys, including repeated Arch/Pillar/Ordinary Region relocation with no severe browser errors;
- Renderer Regression, explicitly requiring `activeOmnis == shadowedOmnis`;
- blocking World/Region + fidelity browser evidence;
- corrected High-preset deterministic traversal baselines covering Ordinary enclosed/long-sightline, Arch, normal Pillar and deep/open Pillar cases;
- physical-device retest before the Device A / Device B failures can be called accepted as resolved.

The candidate remains a distance-based square-radius renderer. It does **not** implement camera-frustum optimization, portal/topology visibility, visibility-driven Cell scope, visibility-driven light selection, a Visibility Snapshot architecture or Non-Euclidean observer rendering.

## Verification calibration retained for Dev.8

Dev.7-era renderer and visual workflows contained assumptions that predated the retained post-PAU renderer. Dev.8 keeps the useful checks while avoiding unrelated visual redesign during recovery:

- Renderer Regression uses bounded post-PAU draw-call budgets and blocks any violation of the active-light/shadow one-to-one invariant rather than disabling shadows to match the older Dev.7 budget.
- Canonical-production comparison failures caused by the known Dev.8 traversal stall are preserved as evidence but do not prevent the candidate from being checked against absolute renderer, save, Cell-cardinality and browser-error budgets.
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
- Manila/Transition laws, frozen Gen2 isolation and existing movement/gameplay behavior;
- active M-F1 Omnis and active shadow-casting M-F1 Omnis remain one-to-one.

## Remaining known gaps

- Physical acceptance is pending on both reported devices. Desktop/headless/software-renderer success cannot close that gate.
- High remains a costly current-renderer baseline on software Chromium/SwiftShader even after the confirmed streaming and redundant-work corrections. A later device-quality decision may still be required for weaker hardware, but the default preset is not changed in this corrective run.
- The separate visibility-driven renderer pilot is planned but not implemented here. It must compare against the corrected distance-based Dev.8 baseline rather than being smuggled into this corrective run.
- Noclip Studio continuous-sync remains future work and is not part of Dev.8.
- Legacy headless visual-calibration diagnostics can remain runner-sensitive; they are evidence aids, not substitutes for the blocking world/fidelity and physical-device journeys.
- Perceptual audio quality remains unverified unless actually listened to.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Dev.8 release PR: https://github.com/xash-mind/Project-Noclip/pull/61
- Dev.8 corrective PR: https://github.com/xash-mind/Project-Noclip/pull/64
- Superseded forward-recovery PR: https://github.com/xash-mind/Project-Noclip/pull/60
- Production: https://project-noclip.vercel.app
- Generation 3 architecture/performance tracking: https://github.com/xash-mind/Project-Noclip/issues/31
- Level 0 fidelity/A-A1 tracking: https://github.com/xash-mind/Project-Noclip/issues/37
- Presentation architecture: `docs/PRESENTATION_ARCHITECTURE.md`