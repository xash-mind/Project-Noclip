# Project Noclip Verification Architecture

This document defines the current verification architecture. Verification evidence is intentionally split so a late browser, visual, or profiling failure does not erase already-established evidence from another category.

## Verification categories

### A. Core correctness

Authoritative workflow: `.github/workflows/ci.yml`.

Core correctness is browser-independent and covers:

- presentation-definition / NAL generation;
- Noclip Studio static validation;
- strict TypeScript;
- full deterministic/system tests;
- 10,000-Cell benchmark;
- production build;
- production Studio security boundary.

Core correctness must not install Selenium, launch Chromium, capture screenshots, or run expensive visual acceptance.

### B. Feature acceptance

Authoritative workflow: `.github/workflows/feature-acceptance.yml`.

Independent jobs exist for:

- gameplay functional journey;
- Character Creator;
- Inventory UI;
- Noclip Studio authoring.

The Inventory UI job is deliberately present before the Inventory UI integration lands. When `scripts/inventory-ui-smoke.py` is absent it reports `SKIPPED_NOT_PRESENT`; it does not invent product behavior or fail an unrelated candidate. The Inventory UI worker can add that script without coupling its acceptance to Character Creator or Studio.

### C. Visual regression

Authoritative workflow: `.github/workflows/visual-regression.yml`.

The visual matrix independently runs current world/fidelity, wallpaper/material, CV-H1, and Blackout/flashlight-facing evidence. Matrix `fail-fast` is disabled so one visual failure cannot suppress the other visual artifacts.

Visual screenshots are blocking. A screenshot failure in this workflow is part of the acceptance target and is not downgraded to a headless warning.

### D. Renderer / performance diagnostics

Authoritative workflow: `.github/workflows/renderer-diagnostics.yml`.

Two independent jobs collect:

- the current renderer profile and renderer metrics;
- the reusable runtime scenario evidence contract.

These jobs observe current runtime behavior only. They must not tune movement, camera/input, collision, Cell streaming/construction, StaticWorldBatching, visibility update frequency, M-F1/shadows, or renderer submission.

## Failure classification

Shared constants and classification rules live in `scripts/verification_contract.py`. Browser tasks write a machine-readable `verification-result.json` through `scripts/verification-browser-runner.py`.

- `PRODUCT_FAILURE`: gameplay/state assertion, deterministic mismatch, missing required geometry, renderer/browser product error, failed touch-target assertion, or another product acceptance assertion.
- `TEST_HARNESS_FAILURE`: Python/import/type error, malformed harness invocation, driver/orchestration failure, missing required test script, or artifact/harness defect.
- `HEADLESS_RENDERER_LIMITATION`: a screenshot API timeout in a functional/diagnostic task after functional assertions can still be evaluated.
- `LEGACY_EXPECTATION_FAILURE`: an explicitly historical expectation that no longer describes the modern candidate, such as a hard-coded old VERSION assumption.
- `PERFORMANCE_REGRESSION`: reserved for an explicit comparable performance threshold/baseline failure. The Dev.9.7 consolidation records evidence but does not invent new optimization thresholds.

Classification never converts a real failing product assertion into a pass.

## Screenshot policy

`verification-browser-runner.py` has two explicit policies:

- `blocking`: no screenshot exception is swallowed; used by visual regression;
- `functional-tolerant`: only Selenium screenshot `TimeoutException` is recorded as `HEADLESS_RENDERER_LIMITATION`; functional assertions remain authoritative. Other task exceptions remain blocking.

This permits a Character Creator journey to pass its New Game -> Creator -> Begin Journey -> Continue assertions while separately recording a SwiftShader screenshot timeout.

## Exact-head law

Every modern workflow defines:

- `NOCLIP_BRANCH_HEAD_SHA = github.event.pull_request.head.sha || github.sha`;
- `NOCLIP_PR_MERGE_SHA = github.event.pull_request.merge_commit_sha || ''`.

Modern workflows explicitly checkout `NOCLIP_BRANCH_HEAD_SHA`, print the checked-out SHA, and assert `git rev-parse HEAD` equals it. `PR_MERGE_SHA` is recorded only as separate context. A synthetic pull-request merge commit is never silently reported as the worker branch head.

Studio browser acceptance currently requires the disposable branch label `agent/dev9-7-studio-completion` for its Save-to-Project safety guard. The feature workflow records and verifies the exact branch-head commit before and after applying that label; the commit itself is not changed.

## VERSION law

Modern verification derives candidate VERSION from the repository `VERSION` file. The modern workflow set contains no hard-coded `0.3.0-dev.9.5` expectation.

Historical Dev.8 / Dev.9.5 workflow files that encoded branch-era assumptions are removed from the current workflow directory because their useful coverage is consolidated here and their exact historical definitions remain available in Git history.

## Browser isolation

Modern browser work is not one Selenium chain:

1. gameplay functional acceptance;
2. Character Creator acceptance;
3. Inventory UI acceptance when present;
4. Studio authoring acceptance;
5. each visual-regression task;
6. renderer profile;
7. runtime performance scenarios.

A Chrome/SwiftShader failure in one job cannot erase reports uploaded by another job. The old `run-legacy-smoke-with-character-creator.py` remains in source only for historical/manual reproduction; modern workflows do not use its fake legacy title-copy behavior or its screenshot-tolerance patch.

`run-character-aware-smoke.py` contains only the compatibility action required to enter through the current Character Creator when older visual evidence scripts still start from the New Game button. It does not alter text assertions and does not modify screenshot behavior.

## Performance evidence contract

`scripts/profile-runtime-scenarios.py` writes `runtime-performance-evidence.json` with schema version 1.

Top-level evidence includes:

- exact commit SHA;
- repository VERSION;
- base URL/environment;
- per-scenario evidence;
- Region-locate timing;
- runtime/browser exceptions.

Where observable, every scenario records:

- median frame time;
- p95 frame time;
- p99 frame time;
- maximum / major hitch evidence;
- loaded Cells;
- participating Cells;
- draw calls;
- active Omnis;
- shadowed Omnis;
- renderer runtime diagnostic counters;
- browser exceptions.

The repeatable scenario IDs are:

1. `standing-ordinary`;
2. `sustained-running`;
3. `rapid-camera-rotation`;
4. `running-plus-turning`;
5. `repeated-cell-crossings`;
6. `pillar-field`;
7. `arch-rooms`;
8. `region-locate`.

Headless Chromium uses SwiftShader, so absolute CI FPS is diagnostic evidence, not a physical-device FPS claim. The later complete runtime performance run should compare like-for-like scenario JSON and then apply explicit regression thresholds.

## Workflow audit and disposition

| Workflow at required base | Base behavior / problem | Current disposition |
| --- | --- | --- |
| `ci.yml` | Core checks plus Studio plus Character/mobile/desktop/CV-H1/renderer/cohesion in one long browser chain | **Consolidated** into browser-free Core Correctness; browser work moved to independent workflows |
| `dev8-corrective-baseline.yml` | Dev.8 High traversal baseline, PR-gated against modern branches | **Removed as redundant historical workflow**; modern runtime scenarios supersede its current diagnostic role; Git history retains the original |
| `dev8-production-spike-baseline.yml` | Dev.8 canonical production traversal spike baseline | **Removed as redundant historical workflow**; current production profiling and runtime evidence cover the ongoing role |
| `dev9-6-integrated-browser-isolation.yml` | Good isolation direction but mixed old wrapper assumptions and duplicated CI work | **Consolidated/replaced** by `feature-acceptance.yml` plus renderer/visual workflows |
| `presentation-recovery-exact-candidate.yml` | Exact-head concept was useful, but hard-coded Dev.9.5 VERSION and all browser/visual/profile work in one chain | **Removed as redundant historical workflow**; exact-head law is generalized in every modern workflow |
| `production-region-locator-smoke.yml` | Production-only Region locator verification | **Retained** as production/release verification, not a generic PR correctness gate |
| `production-smoke.yml` | Production desktop/mobile release smoke and asset evidence | **Retained** as production/release verification |
| `profile-production.yml` | Production profiling, with a narrow PR trigger for profiler/benchmark changes | **Retained** as diagnostic/production evidence; it is not part of Core Correctness |
| `renderer-compare.yml` | Renderer comparison mixed canonical-production availability, old Dev.8 invariants and candidate caps | **Consolidated/replaced** by `renderer-diagnostics.yml`; future baseline comparison consumes the new evidence contract |
| `visual-coherence.yml` | Re-ran typecheck/tests/benchmark/build before visual work; mixed blocking visuals and `continue-on-error` legacy calibration | **Consolidated/replaced** by `visual-regression.yml`; core work is no longer repeated as a visual gate |

## Current verification matrix

| Surface | Browser? | Screenshot role | Failure blocks that surface? | Independent evidence |
| --- | --- | --- | --- | --- |
| Core correctness | No | None | Yes | Yes |
| Gameplay functional | Yes | Non-target evidence | Functional/product failures yes; screenshot timeout separately recorded | Yes |
| Character Creator | Yes | Non-target evidence | Functional/product failures yes; screenshot timeout separately recorded | Yes |
| Inventory UI | Yes when present | Feature-defined | Yes when present | Yes |
| Studio authoring | Yes | Non-target evidence | Functional/product failures yes; screenshot timeout separately recorded | Yes |
| Visual world/fidelity | Yes | Acceptance target | Yes | Yes |
| Wallpaper/material | Yes | Acceptance target | Yes | Yes |
| CV-H1 | Yes | Acceptance target | Yes | Yes |
| Blackout/flashlight | Yes | Acceptance target | Yes | Yes |
| Renderer profile | Yes | Diagnostic | Diagnostic job only | Yes |
| Runtime performance scenarios | Yes | Diagnostic | Diagnostic job only | Yes |
| Production release smoke | Yes | Release evidence | Production/release workflow only | Yes |

## Product/runtime ownership

This consolidation changes verification orchestration, reports, browser-entry helpers, and diagnostics only. It does not change Level 0 aesthetics, Character Creator product behavior, Inventory product behavior, world generation, movement/camera/collision, renderer participation semantics, visibility behavior, Cell streaming, M-F1/shadow behavior, or VERSION.
