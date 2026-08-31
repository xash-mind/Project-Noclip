# Project Noclip Verification Architecture

This document defines the current verification and evidence architecture. Verification is split into independent lanes so one browser, visual or profiling failure does not erase evidence already established in another category.

## Exact-head rule

Blocking acceptance evidence counts only for the exact candidate branch-head SHA being accepted.

Each GitHub Actions lane:

1. records or receives the branch-head SHA;
2. checks out that exact SHA rather than relying on a mutable branch ref;
3. verifies `git rev-parse HEAD` where required by the lane;
4. names uploaded evidence with the candidate SHA.

A result from an earlier SHA is historical evidence only. If a fix changes the candidate SHA, all required final acceptance lanes must be re-established for the new exact head.

## Verification categories

### A. Core Correctness

Authoritative workflow:

```text
.github/workflows/ci.yml
```

Current responsibilities:

```text
verification architecture contract
  -> python scripts/verification-contract-tests.py

presentation definitions / NAL build
  -> npm run presentation:build

Studio static check
  -> npm run studio:check

strict TypeScript
  -> npm run typecheck

full deterministic/system suite
  -> npm test
  -> artifacts/core-correctness/test.log

10,000-Cell benchmark
  -> npm run benchmark
  -> artifacts/core-correctness/benchmark.log

production build + Studio production security boundary
  -> npm run build
```

Core Correctness owns deterministic/system correctness, static architecture contracts that belong in the Node test suite, the deterministic 10,000-Cell benchmark, production build viability and the production Studio boundary.

### B. Feature Acceptance

Authoritative workflow:

```text
.github/workflows/feature-acceptance.yml
```

Current independent jobs:

```text
gameplay-functional
  -> scripts/version-smoke.py
  -> scripts/gameplay-functional-smoke.py

character-creator
  -> scripts/character-creator-smoke.py

inventory-ui
  -> scripts/inventory-ui-smoke.py when present on the candidate

studio-authoring
  -> tools/studio/browser-acceptance.py
```

Inventory UI acceptance is a current supported lane. The workflow still has an explicit `SKIPPED_NOT_PRESENT` evidence shape for a candidate that genuinely does not contain the Inventory acceptance script; candidates that contain the script run the independent Inventory job and must treat its result normally.

Studio authoring verifies the exact candidate commit even though its browser harness creates the disposable local branch label required by the Save-to-Project safety guard. The branch label is harness infrastructure; the checked-out commit SHA remains the acceptance identity.

### C. Visual Regression

Authoritative workflow:

```text
.github/workflows/visual-regression.yml
```

Current matrix:

```text
world
  -> scripts/run-character-aware-smoke.py
  -> scripts/visual-smoke.py

fidelity
  -> scripts/run-character-aware-smoke.py
  -> scripts/fidelity-smoke.py

wallpaper
  -> scripts/run-character-aware-smoke.py
  -> scripts/wallpaper-presentation-smoke.py

cvh1
  -> scripts/run-character-aware-smoke.py
  -> scripts/cvh1-floor-smoke.py

flashlight
  -> scripts/run-character-aware-smoke.py
  -> scripts/flashlight-smoke.py
  -> scripts/blackout-uniformity-smoke.py
```

The lane resolves deterministic visual targets before the browser checks. Screenshots in this category are blocking evidence, not merely diagnostic captures.

`run-character-aware-smoke.py` is a supported compatibility harness and must not be removed merely because newer browser scripts can also reach the world.

### D. Renderer / Performance Diagnostics

Authoritative workflow:

```text
.github/workflows/renderer-diagnostics.yml
```

Current independent jobs:

```text
renderer-profile
  -> scripts/renderer-diagnostics-smoke.py
  -> artifacts/renderer-diagnostics/current/renderer-diagnostics.json
  -> scripts/surface-fusion-diagnostic.py
  -> artifacts/renderer-diagnostics/surface-fusion/report.json

runtime-scenarios
  -> scripts/profile-runtime-scenarios.py
  -> artifacts/runtime-diagnostics/runtime-performance-evidence.json
```

The surface-fusion diagnostic is a functional-tolerant exact-head diagnostic inside the existing renderer-profile owner. It compares canonical Low, Low semantics with render scale temporarily forced to 1.0, and canonical High at the same deterministic Ordinary viewpoint, then captures representative Pillar Field, Arch Room and A-A1 evidence plus surface-assembly counters. It does not redefine preset values or visual acceptance policy.

This lane owns comparable runtime evidence, renderer diagnostics and performance-regression classification. It does not redefine world or presentation correctness.

## Browser verification runner

Authoritative wrapper:

```text
scripts/verification-browser-runner.py
```

Browser tasks declare:

- task name;
- verification category;
- artifact directory;
- screenshot policy;
- underlying smoke script(s).

The wrapper exists to standardize evidence shape and failure classification. A browser harness failure is not automatically a product failure.

## Failure taxonomy

Every blocking failure must be captured before editing with:

- file / script;
- test or task name;
- exact assertion/error;
- expected value/condition;
- actual value/condition;
- stack/location when available.

Then classify it as exactly one of the following.

### `PRODUCT_FAILURE`

Production behavior violates the accepted product/runtime contract.

Examples:

- deterministic world output changed unexpectedly;
- collision differs from the independent oracle;
- Character Creator or Inventory flow is functionally broken;
- accepted visual output materially changed;
- Studio production privilege leaked into the production build;
- accepted M-F1 physical-light behavior changed.

Fix the authoritative production owner. Do not weaken the test or label the failure legacy merely because the production fix is inconvenient.

### `TEST_HARNESS_FAILURE`

The verifier itself cannot correctly exercise or observe the product.

Examples:

- browser automation uses an invalid API/key;
- preview boot orchestration is broken while production behavior is intact;
- evidence serialization loses required output;
- harness assumptions do not match the supported browser/runtime interface.

Fix the harness. Preserve the product contract.

### `LEGACY_EXPECTATION_FAILURE`

Production conforms to the accepted current contract, but a test still requires a retired historical implementation mechanism or release-era shape.

A legacy expectation is not permission to delete coverage. Before changing the test, answer:

1. what contract was the assertion trying to protect?
2. who owns that contract now?
3. does production satisfy it?
4. is the assertion only freezing a retired mechanism?
5. does an equal-or-stronger durable behavioral/architecture assertion exist or need to be added?
6. would changing the test reduce coverage?

Only then migrate the test to the durable contract. Do not restore retired architecture to satisfy a stale assertion.

### `PERFORMANCE_REGRESSION`

Comparable matched evidence shows accepted performance has persistently regressed beyond the active threshold or a new repeatable hitch/scanning class has appeared.

Performance failures are not converted into harness or legacy failures merely because hosted browser measurements are noisy. Noise is handled with matched repeated samples.

## Behavioral vs source-shape verification

Source-shape assertions are divided into four classes.

### A. Behavioral contract

Verify observable or deterministic behavior. Prefer this class whenever mechanism is not the product/architecture contract.

Examples:

- indexed collision equals the independent brute-force oracle;
- Gen2 generation dispatch equals the frozen legacy path;
- visual/feature browser flows pass;
- stable presentation policy returns accepted values;
- save/reload preserves identity and state.

### B. Architecture contract

Source shape is appropriate when architecture shape itself is explicitly governed.

Examples:

- no direct semantic runtime prototype replacement;
- renderer Cell lifecycle is invoked directly rather than installed;
- derived indexes do not become semantic owners;
- targeted policy resolver ownership remains singular;
- the retained diagnostics wrapper count stays within the documented structural contract.

### C. Security / static contract

Preserve source/build shape where static absence/presence is the security contract.

Examples:

- Studio privileged bridge is absent from the production path;
- production boundary scan passes;
- DEV-only authoring code is not bundled as production privilege.

### D. Legacy mechanism assertion

Do not preserve assertions whose only purpose is to freeze a retired mechanism.

Examples:

- requiring an old pilot/correction module filename;
- requiring `queueMicrotask` as the exact spelling of a deferred stage;
- requiring a prototype wrapper because an older release installed one;
- requiring historical startup installer order after ownership became explicit;
- requiring wave/release filenames as correctness.

A D-class assertion may be removed or migrated only when equal-or-stronger behavioral/architecture coverage remains.

## Permanent post-cleanup contract tests

Cleanup-era permanent tests use durable contract names:

```text
tests/level0-cleanup-equivalence.test.mjs
tests/renderer-cell-lifecycle-contract.test.mjs
tests/level0-static-surface-assembly.test.mjs
tests/wall-junction-geometry.test.mjs
tests/aa1-ownership-contract.test.mjs
tests/level0-presentation-policy-contract.test.mjs
tests/presentation-runtime-integration-contract.test.mjs
tests/architecture-structural-metrics.test.mjs
tests/runtime-ownership-contract.test.mjs
tests/gen2-compatibility-boundary.test.mjs
tests/aa1-collision-architecture.test.mjs
tests/level0-wallpaper-contract.test.mjs
```

Historical seed strings inside deterministic tests are not renamed merely to make source text look newer; changing seed domains or fixture identities is unnecessary churn and can obscure equivalence.

## Structural architecture metrics

The durable structural contract is checked by:

```text
tests/architecture-structural-metrics.test.mjs
```

Current post-cleanup targets:

```text
DIRECT_RUNTIME_PROTOTYPE_REPLACEMENTS = 0
APPLICATION_RUNTIME_WRAPPERS          = 0
RUNTIME_INDEX_MUTATION_WRAPPERS       = 0
RETAINED_CALL_THROUGH_WRAPPERS        = 1
IMPLICIT_INSTALL_ORDER_DEPENDENCIES   = 0
DUPLICATE_POLICY_OWNER_GROUPS         = 0
ACTIVE_SEMANTIC_CORRECTION_LAYERS     = 0
```

The one permitted retained call-through wrapper is renderer diagnostics around engine setup. It is non-semantic instrumentation and must remain isolated from product policy/lifecycle authority.

Metric definitions must not be manipulated to improve the count. Combining wrappers, hiding callbacks behind another mechanism, or introducing a generic event/plugin framework is not acceptable closure.

## Renderer Cell lifecycle verification

Durable lifecycle contract:

```text
tests/renderer-cell-lifecycle-contract.test.mjs
```

It verifies:

- one explicit load order;
- one explicit unload order;
- direct `WorldRenderer` invocation of the lifecycle owner;
- synchronous canonical A-A1 collision before derived-index registration;
- explicit visible-Arch and final-material deferred stages;
- no participant renderer prototype installation;
- batching owns batching only;
- startup does not own lifecycle through installer order.

It intentionally does **not** require a particular microtask spelling when the contract is simply that a named convergence stage is deferred.

## Static surface / junction verification

Durable contracts include:

```text
tests/level0-static-surface-assembly.test.mjs
tests/wall-junction-geometry.test.mjs
```

They protect:

- compatible coplanar wallpaper surfaces fuse only within one streamed Cell;
- material, opening, corner, interaction and Region boundaries stop fusion;
- split wallpaper pieces are clipped independently inside the semantic T-junction envelope;
- world-space wallpaper UV phase is recomputed from the canonical wallpaper rule after consolidation;
- A-A1 and CV-H1 remain outside surface-fusion ownership;
- collision remains descriptor/canonical-collider owned;
- the standalone wall-junction correction lifecycle does not return.

## A-A1 collision verification

Durable contracts include:

```text
tests/aa1-ownership-contract.test.mjs
tests/aa1-collision-architecture.test.mjs
```

They protect:

- one world-domain structural-role/collision-intent owner;
- descriptor/bay-driven collision;
- no renderer-name-derived gameplay collision;
- synchronous collision realization before index registration;
- runtime index as derived state only;
- independent brute-force oracle equivalence elsewhere in the deterministic/system suite.

## Level 0 presentation verification

Durable contracts include:

```text
tests/level0-presentation-policy-contract.test.mjs
tests/presentation-runtime-integration-contract.test.mjs
tests/level0-wallpaper-contract.test.mjs
```

They protect one canonical owner for targeted policy, shared M-W1 wallpaper realization, accepted M-C1/M-A1/CV-H1/M-F1 policy values and the intentional distinction:

```text
M-F1 visible presentation != M-F1 physical lighting runtime
```

Multiple lifecycle consumers of one canonical resolver are allowed. Multiple independent definitions are not.

## Generation / compatibility verification

`gen2` remains LEGACY / SUPPORTED.

Durable compatibility contract:

```text
tests/gen2-compatibility-boundary.test.mjs
```

It verifies:

- absent/unknown persisted generation values remain Gen2 under the accepted migration rule;
- `gen2` and `gen3-v1` values remain stable;
- `generateCell(gen2)` dispatches to the frozen Gen2 generator;
- Gen3 construction does not consume Gen2 renderer-compatibility ownership;
- Gen2-specific fixture/CV-H1 render compatibility remains explicit and isolated.

No verification cleanup may expire Gen2, collapse Gen2 into Gen3 or silently regenerate an existing Journey.

## Save / identity verification

Acceptance must preserve:

- CharacterProfileId meaning;
- Journey identity;
- journey-local `characterId` meaning;
- Item `instanceId`;
- Item origin lineage;
- Cell IDs / world addresses;
- Gen2 shift components;
- deterministic seed-domain strings;
- stable presentation IDs;
- AssetIds / MaterialIds / RepresentationIds;
- persisted enums/strings.

Save/reload and old-save compatibility are product contracts, not migration-cleanup opportunities.

## Collision / interaction / dynamic Item equivalence

Runtime performance indexes are candidate selectors only.

Verification must preserve:

```text
indexed collision == independent brute-force collision oracle
indexed nearest interaction == canonical interaction semantics
dynamic Item candidate/ticking membership == canonical Item semantics
```

The brute-force collision oracle must remain independent of the runtime index implementation; sharing the indexed candidate selector with the oracle would invalidate the equivalence proof.

## Streaming / visibility equivalence

Streaming and visibility are distinct:

```text
streaming -> load/residency timing
visibility -> render participation of owned state
```

Verification must block broader scans, altered residency semantics, semantic destruction from visibility, or new ownership overlap between these mechanisms.

## M-F1 physical-light invariant

The accepted physical-light contract remains:

- Render Distance safety ceilings;
- distance-sorted fixture selection;
- retained selection behavior;
- `active Omni == shadowed Omni`;
- flicker behavior;
- Blackout suppression;
- accepted fixture light law.

The relevant runtime is `src/renderer/fixtureLighting.ts`; visible panel material policy remains `src/presentation/level0PresentationPolicy.ts`.

## Performance acceptance

Use a matched accepted base and candidate SHA. Do not compare unrelated machine/browser configurations as if they were controlled measurements.

For Cleanup Wave 6 the matched baseline is:

```text
4c16a3770d7f29476626062cda6dd13850aa805b
```

Blocking thresholds:

```text
10,000-Cell benchmark: > 5% persistent regression
scenario median:        > 5% persistent regression
scenario p95:           > 5% persistent regression
scenario p99:           > 10% persistent regression
```

Also block for:

- a new repeatable hitch class;
- sustained-running regression;
- rapid-turn regression;
- run+turn regression;
- repeated Cell-crossing regression;
- broader collision scans;
- broader interaction scans;
- broader dynamic Item scans;
- broader visibility scans;
- broader fixture-selection scans.

When hosted Chromium / SwiftShader variance is near a threshold, collect at least three matched samples per SHA and compare medians. A noisy single result is neither a regression nor a pass.

Matched percentile evidence must also resolve the percentile being enforced. Because p99 is a blocking metric, every matched candidate/baseline scenario evidence file must contain at least 100 measured rAF frame intervals. Fewer than 100 samples is `TEST_HARNESS_FAILURE`, not a performance pass or regression. Do not reduce the 45-second scenario workload, product graphics/workload, matched pairing, aggregation, or the 5% / 5% / 10% thresholds to satisfy this evidence floor.

## Screenshot policies

Browser runner screenshot policy expresses the evidence role:

```text
blocking
  -> visual-regression screenshots whose mismatch can fail acceptance

functional-tolerant
  -> functional/browser evidence where screenshot capture supports diagnosis but is not itself a pixel-identity contract
```

Do not convert a blocking visual contract to tolerant evidence merely to make a candidate pass.

## Studio security verification

Studio authoring and production security are separate contracts.

Authoring acceptance:

```text
.github/workflows/feature-acceptance.yml
  -> studio-authoring
```

Static/build boundary:

```text
npm run studio:check
npm run build
scripts/check-production-studio-boundary.mjs
```

Privileged Studio bridge code must remain DEV-only. Browser authoring success does not substitute for production-boundary proof, and production-boundary proof does not substitute for authoring acceptance.

## Verification failure procedure

For every failure:

1. capture the exact failure before editing;
2. classify it under the four-category taxonomy;
3. identify the current authoritative owner;
4. determine whether production violates the contract;
5. determine whether the test freezes a historical mechanism;
6. confirm equal-or-stronger coverage before migrating an expectation;
7. fix only the authoritative owner or harness implicated by the classification;
8. rerun focused verification;
9. establish all required exact-head final acceptance lanes for the resulting SHA.

Do not add a new correction layer, prototype installer, wrapper, reconciliation layer, migration, generic event bus or generic plugin framework to make verification green.

## Final acceptance evidence

A cleanup/closeout candidate is not accepted merely because one umbrella status is green. Its handoff must separately record the evidence required by the work request, including exact deterministic/system test count, feature/browser results, visual results, performance comparison, build/security results and exact-head workflow status.

When a required item is unresolved, report it as unresolved. Do not infer a pass from neighboring evidence.
