# Project Noclip Cleanup Plan

Authoritative synthesis base: `preview/cleanup-governance-baseline` at `741414a0f9606f9fb9af06f85b6c601c275e266b`.

Repository VERSION at the synthesis base: `0.3.0-dev.9.8`.

Authoritative audit inputs:

- Architecture / dependency: `docs/audits/cleanup-architecture-dependency.md` from `4bbd7f9d8121613870b3cd7a59a730fab688267f`.
- Level 0 ownership: `docs/audits/cleanup-level0-ownership.md` from `f0139b2d383c326d0d2d7ba64bd78cc825a60630`.
- Dead code / compatibility: `docs/audits/cleanup-deadcode-compatibility.md` from `7b33da2760b6b0400e3ebe9a5f504307731de4d1`.
- Content provenance: `docs/audits/cleanup-content-provenance.md` from `2069d0b8961449a15a32beb34ce6b5b3bbfda85f`.

Those audit documents are historical evidence. This document is the canonical implementation roadmap that reconciles them. Where an audit finding conflicts with a later product decision, the product decision must be recorded explicitly before implementation changes behavior.

# Executive Summary

Project Noclip does not need a project-wide rewrite. Its Generation 3 world/domain truth, GenerationVersion boundary, Journey identity, Character Profile identity, Item Instance identity, deterministic seed domains, and supported Gen2 save path already have recognizable owners. Cleanup must leave those clean domains alone unless a specific ownership seam requires a narrow adapter.

The primary debt is runtime/presentation composition. The exact synthesis base contains **23 call-through prototype/lifecycle wrappers** and **6 direct prototype method replacements**. `WorldRenderer.loadCell` has become an accidental extension bus, several accepted presentation layers create/correct/replace the output of earlier layers, and runtime correctness can depend on installation order plus queued microtasks. The objective is not to erase every hook. The objective is to remove semantic authority from installation order and make the finite lifecycle explicit.

The highest-risk seam is A-A1. World topology owns divider semantics, openings and routes; presentation owns the accepted visible silhouette; current collision correction partially derives gameplay collision from reconstructed renderer entity names; the derived collision spatial index can observe a different lifecycle moment. A-A1 therefore receives a dedicated serial wave before broad runtime-index consolidation.

Level 0 presentation has repeated semantic owners for M-C1 carpet, M-A1 structural finish, A-A1 structural-role classification, CV-H1 depth presentation, and M-F1 visible panels. Multiple lifecycle stages may legitimately consume the same resolved policy because geometry appears at different times. They must not independently define the policy.

The cleanup is explicitly behavior-preserving. Casing eligibility, outlet eligibility, and the M-F1 realtime-light allocation conflict are product decisions, not refactor decisions. Supported Gen2 saves remain supported. The canonical brute-force collision resolver remains both the semantic resolver and independent oracle. Dev.9.8 streaming, visibility, spatial indexes, dynamic Item ticking, batching and M-F1 selection-retention gains are protected performance baseline, not cleanup targets.

The minimum useful target is a finite explicit composition model, not a generic plugin/event framework. The intended result is one semantic owner per concept, explicit dependency flow, no correction layer whose only purpose is to repair another accepted owner, and derived indexes/caches that observe canonical state rather than create it.

# Cleanup Invariants

1. **One semantic owner.** A semantic rule is defined once and consumed by lifecycle-specific callers.
2. **Explicit dependency direction.** Preserve `WORLD DOMAIN -> PRESENTATION DEFINITIONS / POLICY -> RUNTIME / RENDERER ADAPTERS -> PLAYCANVAS`.
3. **No patch-on-patch authority.** A later layer may execute later because its geometry legitimately exists later; it may not become the permanent owner of values or semantics merely because it runs last.
4. **Behavior equivalence by default.** Current accepted visuals, collision, interaction, streaming, visibility, save behavior, IDs, UI flows and performance remain unchanged unless a separately approved product decision says otherwise.
5. **Minimal runtime work.** Do not introduce a generalized event bus, dependency-injection framework, plugin system, ECS migration, or interface hierarchy merely to replace a finite known lifecycle.
6. **Derived state stays derived.** Collision/interaction indexes, dynamic Item sets, visibility caches and batching caches observe canonical source state and are reconstructible.
7. **Compatibility is evidence-gated.** Legacy does not mean dead. Supported Gen2 behavior, persisted strings/enums, IDs, migrations and evidence-schema shims stay until their consumers are explicitly retired.
8. **Performance is a correctness constraint.** Cleanup must not replace localized indexes or retained sets with generic scans or extra per-frame traversal.
9. **Verification observes ownership.** Behavioral contract tests replace historical mechanism assertions where possible; source-shape tests remain only where source shape itself is the contract, such as Studio production security boundaries.
10. **Product decisions are firewalled.** Ambiguous eligibility or policy cannot become a behavior change through refactoring.
11. **Provenance uncertainty remains uncertainty.** `UNKNOWN / REVIEW REQUIRED` is not resolved by code cleanup.
12. **No identity re-keying.** CharacterProfileId, Journey identity, Item Instance identity, Cell/world IDs, GenerationVersion, seed-domain strings and persisted identities remain stable.

# Preserved Product Baseline

The following are baseline behavior, not cleanup opportunities:

- Generation 3 `gen3-v1` world generation and descriptor determinism.
- Existing pre-versioned / explicit Gen2 save compatibility and frozen Gen2 generation behavior.
- Character Profile identity distinct from Journey identity.
- Item Definition identity distinct from persistent Item Instance identity.
- Ordinary Level 0 visual grammar and shared M-W1 identity.
- Pillar Field architecture, density law, common Level 0 wall/ceiling/fixture grammar and current presentation.
- Arch Rooms/A-A1 accepted silhouette, dimensions, symmetry/irregularity rules, openings, topology and collision result.
- CV-H1 law: `FINAL FLOOR = REGION/CONDITION M-C1 SURFACE - CV-H1 APERTURE`.
- C-B1 Blackout as a Condition over underlying Region architecture, with local light/buzz suppression and external escape cues.
- Current casing and outlet spawn/eligibility behavior until explicit product decisions exist.
- Current floor-condition pixels; ownership may become explicit without inventing a new visible wet/dry delta.
- Current M-F1 visible panel appearance and current physical-light behavior until the M-F1 policy conflict is explicitly decided.
- Refresh-rate-independent predictive streaming.
- Streaming scheduler budgets and residency semantics.
- Visibility Snapshot topology cache, safety core, hysteresis, predictive participation and fail-open behavior.
- Collision spatial index and `movementCollisionQueryBounds` optimization.
- Canonical brute-force collision resolver/oracle.
- Interaction spatial index.
- Dedicated dynamic Item ticking set.
- M-F1 selection retention and active/shadow one-to-one invariant as currently implemented.
- StaticWorldBatching behavior and localized reconciliation.
- Studio production security boundary and DEV-only privileged bridge.
- Character Creator, Inventory, save/reload and existing gameplay journeys.

# Converged Audit Findings

## Clean foundations to preserve

Generation 3 domain ownership, deterministic identities, Character Profile identity, Item Instance identity, Journey persistence, explicit generation-version compatibility and the streaming-versus-visibility semantic split are not project-wide cleanup targets. The presence of broad files such as `generator.ts` or `ProjectNoclipGame.ts` is not by itself permission to split or rewrite them.

## Runtime/presentation composition is the main debt

The base contains 23 call-through wrappers plus 6 direct replacements. The same method, especially `WorldRenderer.loadCell`, is used to sequence unrelated presentation, correction, lighting, batching, index and finalization responsibilities. `StaticWorldBatching` also installs unrelated Region/Arch/fixture systems. This makes installer order an accidental architecture owner.

The replacement target is one explicit, finite composition point for known lifecycle participants. It may be a small renderer-owned lifecycle sequence or equivalent narrow mechanism. It must not become a generic framework.

## A-A1 is the highest-priority ownership seam

The accepted split is valid:

```text
WORLD / TOPOLOGY
  owns A-A1 semantic divider, openings, routes, stable identity and collision intent

PRESENTATION
  owns the accepted visible A-A1 frame / curve / panel representation

RUNTIME
  realizes gameplay collision from canonical semantic collision intent

DERIVED COLLISION INDEX
  indexes the final canonical runtime collision state
```

The current renderer-name-derived lower-panel reconciliation violates that direction. Cleanup must preserve the visible silhouette and final collision behavior while removing the renderer entity name as gameplay truth wherever semantic data can carry the role/intent directly.

## Level 0 presentation policy is duplicated

The targeted duplicate-owner groups are:

1. M-C1 Region carpet treatment and world-phase behavior.
2. M-A1 A-A1 structural finish.
3. A-A1 structural-role classification currently inferred in multiple renderer stages.
4. CV-H1 visible depth palette.
5. M-F1 visible panel creation/material ownership.

M-W1 is intentionally a shared Level 0 wallpaper identity across Ordinary, Pillar/P-A1 and normal Arch walls. The current `ordinaryWallpaperPresentation` name is narrower than its semantic responsibility. Naming should change only after ownership is stable and with no appearance change.

M-CE1 is already comparatively narrow; consolidation must not invent additional abstraction where one local owner is sufficient.

## Policy and lifecycle are different concerns

A material or role may be consumed at base Cell construction, reconstructed A-A1 geometry, CV-H1 geometry and final material refresh. That does not justify multiple semantic definitions. The target is one resolver/policy owner with multiple explicit consumers where lifecycle requires it.

For M-C1, the target semantic shape is:

```text
M-C1 base identity
  + Region treatment
  + explicit floor-Condition modifier
  = resolved carpet presentation
```

The initial Condition modifier must reproduce current pixels exactly. A new visible wet/dry effect is a product change, not cleanup.

## CV-H1 owns aperture/depth, not carpet

CV-H1 continues to own aperture topology and its visible void/side/depth presentation. The Region/Condition floor owner continues to own surviving carpet. Gen3 should eventually build the final intended Hole presentation without create/destroy/recreate fallback churn, but only after the semantic/material owners are stable and Gen2 fallback is clearly separated.

## M-F1 visible presentation and physical lighting must stay separate

A canonical M-F1 visible panel owner should create/stabilize one panel representation per fixture identity. `fixtureLighting.ts` should own physical Omni/shadow/flicker runtime, not destructive visible-panel reconciliation or an independent panel material policy.

The current nearest/capped realtime-light behavior is a separate product-law conflict and is not changed by this cleanup plan without approval.

## Derived performance indexes are valid but must not become semantic owners

The collision spatial index, interaction spatial index and dynamic Item set are accepted Dev.9.8 improvements. They should become first-class derived state maintained by the authoritative operation/lifecycle rather than a second implementation installed through method replacement. The canonical brute-force collision resolver remains the semantic algorithm and oracle.

## Legacy is live

Gen2 generation, save migration, Zone/shift compatibility, compatibility address fields, `run-character-aware-smoke.py` and evidence aliases are not dead merely because new journeys use Gen3 or new evidence names. Cleanup may isolate them; deletion requires consumer/retention proof and, for Gen2 saves, an explicit product/data decision.

## High-confidence dead code is small

Only these repository-owned files have high-confidence first-batch removal evidence:

- `scripts/dev8-corrective-profile.py`
- `scripts/dev8-production-spike-profile.py`

Their current workflow owners are gone and modern renderer/runtime profiling supersedes their repository role. The implementation worker must still repeat a caller/entrypoint search immediately before deletion.

# Product Decisions Required

Cleanup may finish while these decisions remain pending by preserving current behavior explicitly.

## PD-1 — Casing eligibility

**Question:** Is casing/baseboard/raceway intentionally Ordinary-only, shared across wallpaper-bearing Level 0 walls, or governed by another surface/Region rule?

Current Ordinary-only behavior is produced by presentation control flow, not accepted world law. Until a decision is recorded, preserve current Ordinary-only behavior. A cleanup may move that exact behavior into a clearly named **current-behavior eligibility adapter**, but must not describe it as settled world truth.

## PD-2 — Outlet eligibility

**Question:** Are outlets intentionally Ordinary-only, shared across some/all wallpaper-bearing Level 0 walls, or governed by another explicit rule?

Current Ordinary-only behavior is preserved. Interaction cleanup may move outlet action handling into the canonical interaction owner while keeping the current spawn set exactly unchanged.

## PD-3 — M-F1 realtime physical-light law

**Classification:** **D — explicit user decision required.**

The conflict is literal, not merely inferred:

- `WORLD.md` states that every rendered fluorescent fixture owns its real light for the streamed Cell lifetime and explicitly forbids a player-nearest allocator or arbitrary realtime fixture cap.
- Current accepted runtime creates one Omni entity per fixture, but activates a player-distance-sorted subset and slices it to Render Distance ceilings of 32 / 64 / 96 / 128.
- Current tests explicitly assert those ceilings and the selection mechanism.

Therefore the code currently does not satisfy the literal wording of the world law. Cleanup cannot determine whether the documentation is stale or the optimization is a product-law violation because changing either side has product/performance consequences.

The user must choose one of these directions before a behavior-changing M-F1 follow-up:

1. **World law remains authoritative as written.** A separate lighting/performance change must remove nearest-N/capped semantic participation while retaining acceptable performance through a different implementation.
2. **The capped participation model is accepted product behavior.** A separate governance/world-law change must redefine fixture ownership so identity remains fixture-owned while active physical representation may be visibility/performance bounded.
3. **A narrower distinction is intended.** Define exactly what “owns its real spot” means versus which real-light entities may be active, then update law and runtime to that explicit distinction.

This cleanup does **not** choose among them. Until the decision, preserve the current runtime behavior and tests.

## PD-4 — Floor Condition visual expansion, only if proposed

No decision is required to make Condition contribution an explicit no-op/equivalent modifier. User approval is required before adding a new visible wetness/dryness delta that changes accepted pixels.

## PD-5 — Gen2 expiry/removal, only if proposed

Gen2 isolation is refactor-only. Any expiry, export-only mode, migration into another generation, or deletion of supported Gen2 saves is a separate player-data/product decision under ADR 0001.

## Conditional decision — A-A1 collision behavior

The planned A-A1 wave is refactor-only. If focused equivalence work proves that current semantic collision intent and accepted player collision behavior are genuinely different, do not “fix” that discrepancy inside cleanup. Preserve the accepted result and raise the exact physical rule for user approval.

# Target Architecture

The target is the smallest architecture that removes duplicate authority and hidden ordering.

## Application Composition

`src/main.ts` remains the composition entrypoint, but it must stop deriving correctness from a sequence of prototype installers. It should construct or register explicit narrow runtime/renderer collaborators. `ProjectNoclipGame` remains the application orchestration root; accepted engine/render/streaming/interaction behavior should be implemented by the authoritative class or explicit collaborators it calls, not by replacing its methods after class definition.

A single composition point owns **ordering**, while subsystems own **behavior**.

## World Domain

World/domain code owns:

- GenerationVersion and generation dispatch;
- Region/Condition/Carver/Structure identity;
- deterministic topology and visibility-relevant openings;
- A-A1 semantic divider roles, openings/routes and collision intent;
- stable IDs/addresses and seed-domain behavior;
- Item/Character/Journey semantic identity in their existing domains.

Presentation must not infer gameplay semantics from PlayCanvas entity names when world descriptor data can carry the semantic role safely.

## Presentation Definitions / Policy

Structured presentation definitions and narrow resolvers own visual policy:

- M-W1 shared Level 0 wallpaper identity/family/treatment;
- M-C1 base + Region treatment + explicit Condition modifier;
- M-CE1 ceiling appearance;
- M-F1 visible panel appearance only;
- M-A1 structural finish;
- CV-H1 visible depth palette;
- accepted Region treatment parameters;
- current-behavior wall-detail eligibility adapter until PD-1/PD-2 are decided.

Presentation policy must not own topology, collision, save identity, fixture allocation, interaction actions or Region existence.

## Cell Renderer Lifecycle

Replace accidental prototype stacking with one explicit finite lifecycle for the known participants. The implementation may choose the smallest form that fits existing code; the plan does not prescribe a generalized event framework.

Required dependency order is conceptually:

```text
Cell descriptor becomes resident
  -> base renderer realization
  -> Level 0 surface/shared wallpaper realization
  -> Region / A-A1 / CV-H1 / fixture visual realization
  -> canonical presentation material application for all final geometry
  -> interaction/collision/runtime registration from canonical state
  -> static batching dirtiness/reconcile
  -> visibility/render-participation integration
```

Unload must have an explicit reverse/cleanup contract. Where neighbor-aware A-A1 reconstruction genuinely requires deferred work, the lifecycle must expose an explicit completion/result boundary rather than relying on unrelated wrappers to guess a microtask count.

Legitimate participants can remain distinct: base geometry, Level 0 surfaces, shared wallpaper, Region presentation, A-A1 presentation, fixture presentation/runtime, interactions, collision/interaction indexes, static batching and final resolved materials. Their order must be owned in one visible composition path.

## Runtime Services

Runtime services own accepted mutable behavior:

- render settings / atmosphere;
- streaming scheduling/residency;
- visibility participation;
- physical fixture lighting/shadows/flicker;
- interaction dispatch;
- movement collision query orchestration;
- dynamic Item ticking;
- persistence timing/application orchestration.

A performance service may optimize data access but cannot replace the semantic algorithm with a second behavioral owner.

## Derived Indexes / Caches

The collision spatial index, interaction spatial index, dynamic Item set, visibility topology cache, material/texture caches and batching state are derived data.

They must:

- be populated/invalidated from explicit canonical mutations;
- be reconstructible;
- never require scanning more state than the accepted Dev.9.8 path merely for architectural purity;
- never become the source of world/presentation semantics;
- expose parity/oracle verification where applicable.

The brute-force collision resolver stays independent enough to validate indexed candidate selection.

## Lighting

World lighting owns fixture identity/state/flicker semantics. Presentation owns the visible M-F1 panel. Physical lighting runtime owns Omni/shadow realization and performance behavior. The PD-3 allocation policy remains frozen at current behavior until explicitly decided.

Panel reconciliation should disappear once a canonical visible panel exists; physical lighting should bind to that stable identity rather than create/destroy a second visual representation.

## Interactions

Renderer/presentation may expose stable interaction targets and geometry. The application/interaction owner handles prompts/actions. Outlet behavior must leave `renderer/` application-method wrappers while preserving current target identity, prompt and result. PD-2 controls only where outlets exist, not how current outlet targets are dispatched.

## Development / Studio

Studio privileged code remains DEV-gated and non-canonical. World Lab, diagnostics and showcase hooks should attach through explicit diagnostic/development surfaces, not become world or renderer semantic owners. Do not weaken the Studio Save-to-Project security boundary while removing release-specific test coupling.

## Verification

Verification owns evidence, not product behavior. Behavioral invariants are preferred for lifecycle/collision/material/lighting equivalence. Source-string tests may remain for intentional static/security contracts but must not permanently require historical prototype ordering, `queueMicrotask` spelling, or correction-file names after those mechanisms cease to be architectural truth.

# Cleanup Dependency Graph

```text
SYNTHESIS ACCEPTED
    |
    v
WAVE 0  Baseline proof + two safe historical-script removals
    |
    v
WAVE 1  Explicit renderer/Cell lifecycle foundation                 [SERIAL]
    |
    v
WAVE 2  A-A1 semantic/presentation/collision ownership             [SERIAL]
    |
    +-------------------------------+
    |                               |
    v                               v
WAVE 3  Level 0 policy/presentation WAVE 4 Runtime/app/index ownership
        consolidation              consolidation
    |                               |
    +---------------+---------------+
                    |
                    v
WAVE 5  Compatibility isolation + post-consolidation bridge/fallback removal
                    |
                    v
WAVE 6  Naming/CODE_MAP/test-shape cleanup + complete equivalence closure
```

Waves 3 and 4 may run as parallel sibling workers only after Wave 2 is accepted, and only under the write boundaries below. Wave 5 begins only after both are integrated and reverified.

Product-decision work is **not** inserted into this graph. PD-1, PD-2, PD-3 and any Gen2 retention change receive separate future branches after explicit approval.

# Implementation Waves

## WAVE 0 — Baseline proof and high-confidence mechanical cleanup

**WAVE ID:** W0

**OBJECTIVE:** Capture cleanup-specific equivalence evidence before structural work and remove only the two proven historical profiling scripts.

**CURRENT OWNER(S):** Modern profiling is already owned by `renderer-diagnostics.yml`, `profile-production.yml`, `scripts/profile-runtime-scenarios.py` and current verification contracts. The two Dev.8 scripts have no current repository owner.

**TARGET OWNER(S):** Same modern verification owners; explicit architecture metrics recorded from the current code shape.

**EXACT AREAS / LIKELY FILES:**

- delete `scripts/dev8-corrective-profile.py` after a fresh caller/entrypoint search;
- delete `scripts/dev8-production-spike-profile.py` after a fresh caller/entrypoint search;
- focused behavioral/equivalence tests around A-A1 collision/index synchronization, M-F1 panel/light identity, final Level 0 material results and Cell load/unload outcomes;
- architecture-metric helper/test only if it is smaller than manual measurement and does not become a product runtime dependency;
- no product `src/**` behavior change.

**DEPENDENCIES:** Accepted synthesis head only.

**BEHAVIOR CHANGE?** NO.

**PRODUCT DECISION REQUIRED?** NO.

**CAN RUN IN PARALLEL?** NO. This is the proof baseline for every later structural worker.

**PARALLEL WRITE BOUNDARIES:** N/A.

**VERIFICATION:** strict TypeScript, full deterministic/system tests, verification-contract tests, current renderer diagnostics, 10,000-Cell benchmark, production build, and focused behavior baselines. Record CURRENT wrapper count = 23 and direct replacement count = 6 from source at the exact worker base.

**ROLLBACK POINT:** Exact accepted synthesis SHA. If deletion exposes an undocumented repository caller, restore the script and reclassify rather than adding a compatibility shim blindly.

**EXPECTED DEBT REMOVED:** 2 high-confidence dead files; stronger behavioral evidence that permits later mechanism tests to be retired safely.

## WAVE 1 — Explicit renderer/Cell lifecycle foundation

**WAVE ID:** W1

**OBJECTIVE:** Replace accidental `WorldRenderer.loadCell`/`unloadCell` prototype stacking and `StaticWorldBatching` installer-of-installers ownership with one explicit finite renderer lifecycle while preserving exact effective stage order and timing.

**CURRENT OWNER(S):** `src/main.ts`, `WorldRenderer.loadCell/unloadCell`, Level 0 presentation installers, `StaticWorldBatching`, fixture lighting, final material presentation, runtime-performance load/unload hooks; effective behavior partly owned by installation order.

**TARGET OWNER(S):** One renderer composition/lifecycle owner for ordering; each subsystem exposes a narrow explicit participant/action and retains its semantic responsibility.

**EXACT AREAS / LIKELY FILES:**

- `src/main.ts`;
- `src/renderer/WorldRenderer.ts`;
- `src/renderer/StaticWorldBatching.ts`;
- `src/renderer/level0SurfacePresentation.ts`;
- `src/renderer/ordinaryCasingMaterialPresentation.ts`;
- `src/renderer/level0RegionPresentation.ts`;
- `src/renderer/wallJunctionPresentation.ts`;
- `src/renderer/archDividerRuntimeCorrection.ts` only to expose its existing stage, not redesign A-A1 yet;
- `src/renderer/fixtureLighting.ts` only to expose attach/detach lifecycle entrypoints;
- `src/renderer/finalLevel0MaterialPresentation.ts`;
- `src/renderer/runtimePerformance.ts` only to expose current registration callbacks without changing query semantics;
- a small new renderer composition/lifecycle module only if it is materially clearer than placing the explicit sequence in an existing owner;
- relevant lifecycle/source-shape tests.

**DEPENDENCIES:** W0 accepted.

**BEHAVIOR CHANGE?** NO.

**PRODUCT DECISION REQUIRED?** NO.

**CAN RUN IN PARALLEL?** NO. This is the foundational ordering owner.

**PARALLEL WRITE BOUNDARIES:** No other worker may edit renderer lifecycle core, `src/main.ts`, `WorldRenderer` load/unload or the listed lifecycle participant entrypoints during W1.

**VERIFICATION:** all W0 evidence plus exact before/after loaded Cell entity/collider/interaction sets for representative Ordinary/Pillar/Arch/CV-H1/Blackout cells; A-A1 neighbor load/unload; M-F1 panel/light counts; batching and visibility participation. Preserve current deferred timing behavior first; only remove queued timing when an explicit lifecycle completion point proves equivalence.

**ROLLBACK POINT:** Accepted W0 SHA. If exact output/order cannot be preserved, revert the whole lifecycle conversion rather than adding a second compatibility wrapper around it.

**EXPECTED DEBT REMOVED:** hidden `loadCell`/`unloadCell` installer-order authority; `StaticWorldBatching` ownership of unrelated installers; a large share of the 23 wrappers. No hard interim wrapper number is required; semantic behavior must be migrated before a hook is removed.

## WAVE 2 — A-A1 semantic, presentation and collision ownership

**WAVE ID:** W2

**OBJECTIVE:** Make A-A1 structural role and gameplay collision derive from canonical semantic intent while preserving the accepted visible divider and exact player collision result. Ensure the collision spatial index observes the final canonical collision state.

**CURRENT OWNER(S):** topology in `gen3SpaceTopologyDomain/Build`; visible reconstruction in `level0RegionPresentation`; collision filtering/correction in `level0SurfacePresentation` and `archDividerRuntimeCorrection`; derived indexing in `runtimePerformance/runtimeSpatialIndex`; structural role inferred from material/dimensions in multiple places.

**TARGET OWNER(S):** world topology owns A-A1 semantic roles/openings/routes/collision intent; presentation owns visible frame/curve/panel meshes; runtime collision realizes semantic collision; derived index observes that canonical collider set.

**EXACT AREAS / LIKELY FILES:**

- `src/world/gen3SpaceTopologyDomain.ts`;
- `src/world/gen3SpaceTopologyBuild.ts`;
- `src/world/gen3ArchitectureCore.ts` only if shared semantic-role metadata belongs there;
- `src/world/types.ts` only for additive descriptor/role data that does not change persisted/stable IDs;
- `src/renderer/level0RegionPresentation.ts`;
- `src/renderer/level0SurfacePresentation.ts` collision mutation removal;
- `src/renderer/archDividerRuntimeCorrection.ts` absorption/retirement as ownership permits;
- `src/renderer/runtimeSpatialIndex.ts` and the narrow W1 registration boundary needed to observe canonical collision;
- A-A1, arch streaming, movement collision and indexed-vs-oracle tests.

**DEPENDENCIES:** W1 accepted. Do not begin from the pre-lifecycle patch stack.

**BEHAVIOR CHANGE?** NO. If current semantic and accepted physical behavior cannot be reconciled without choosing a new collision rule, stop that disputed portion and raise the conditional product decision.

**PRODUCT DECISION REQUIRED?** NO for ownership consolidation; YES only if a new physical rule is discovered to be necessary.

**CAN RUN IN PARALLEL?** NO. This is a serial high-risk seam and establishes the collision contract needed by W4.

**PARALLEL WRITE BOUNDARIES:** No concurrent worker may edit A-A1 topology descriptors, Arch reconstruction, collider construction or collision-index registration.

**VERIFICATION:** unchanged deterministic A-A1 descriptors/stable IDs; unchanged accepted silhouette/proportions; topology openings unchanged; exact collision equivalence at lower panels/piers/openings/terminations across load/unload boundaries; indexed candidate result equals brute-force oracle; no stale index after neighbor reconstruction; Arch visual acceptance and 10,000-Cell benchmark.

**ROLLBACK POINT:** Accepted W1 SHA. Keep the old correction path intact until canonical collision equivalence is proven in the same branch; then delete it, never before.

**EXPECTED DEBT REMOVED:** renderer-name-derived gameplay collision authority; duplicated A-A1 structural-role inference; A-A1 collision correction layer; async stale-index seam.

## WAVE 3 — Level 0 presentation policy consolidation

**WAVE ID:** W3

**OBJECTIVE:** Establish single policy/resolver owners for Level 0 materials and visible presentation while keeping legitimate lifecycle consumers and exact current pixels.

**CURRENT OWNER(S):** repeated M-C1/M-A1/CV-H1 values across surface/Region/final passes; M-F1 visible panel across builder/surface/fixture runtime; shared M-W1 presenter named as Ordinary-only; Condition identity not independently represented in final carpet values.

**TARGET OWNER(S):** structured presentation definitions plus narrow canonical resolvers; lifecycle stages consume resolved values; visible M-F1 panel has one owner; physical light remains lighting runtime.

**EXACT AREAS / LIKELY FILES:**

- `src/presentation/definitions/level0-materials.json` and existing presentation runtime helpers where required;
- `src/renderer/finalLevel0MaterialPresentation.ts` or a smaller successor canonical resolver module;
- `src/renderer/level0SurfacePresentation.ts` material policy removal;
- `src/renderer/level0RegionPresentation.ts` material/depth palette duplication removal;
- `src/renderer/ordinaryWallpaperRules.ts`, `ordinaryWallpaperPresentation.ts`, `ordinaryWallpaperAssets.ts` as shared M-W1 consumers;
- `src/renderer/ordinaryCasingMaterialPresentation.ts` only to consume an explicit current-behavior eligibility adapter; no eligibility change;
- `src/renderer/cellBuilder.ts`, `fixtureVisualOwnership.ts`, `fixtureLighting.ts` only for M-F1 visible-panel ownership and binding;
- CV-H1/M-C1/M-A1/M-W1/M-F1 presentation tests and Studio material/preview tests.

**DEPENDENCIES:** W2 accepted.

**BEHAVIOR CHANGE?** NO.

**PRODUCT DECISION REQUIRED?** NO for resolver consolidation. PD-1/PD-2/PD-3 and new Condition visuals remain frozen.

**CAN RUN IN PARALLEL?** YES, with W4 only, from the same accepted W2 head and under the write boundaries below.

**PARALLEL WRITE BOUNDARIES:** W3 owns `src/presentation/**` material definitions/resolution and Level 0 renderer presentation files including `fixtureLighting.ts` only for visible-panel binding. W3 must not edit `src/main.ts`, `src/app/ProjectNoclipGame.ts`, `src/renderer/WorldRenderer.ts`, `runtimePerformance.ts`, `runtimeSpatialIndex.ts`, streaming/visibility runtime, or application interaction dispatch. Gen3 base create-then-replace fallback removal that requires `WorldRenderer.ts` is deferred to W5.

**VERIFICATION:** pixel/material equivalence for Ordinary/Pillar/Arch; world-continuous M-W1 and M-C1 phase; CV-H1 surrounding floor exact Region/Condition inheritance; CV-H1 depth palette; A-A1 M-A1 finish; M-F1 panel identity/emission/flicker; Blackout panel/light behavior; Studio preview/save/revert; no new material/texture churn in diagnostics.

**ROLLBACK POINT:** Accepted W2 SHA for the W3 branch. Merge W3 only as a complete resolver migration; do not leave old and new semantic values independently active.

**EXPECTED DEBT REMOVED:** duplicate M-C1, M-A1 and CV-H1 semantic values; duplicate M-F1 visible-panel ownership; implicit Region-as-Condition presentation coupling; misleading M-W1 semantic ownership (naming may be finalized in W6).

## WAVE 4 — Runtime adapters, application lifecycle and derived-index ownership

**WAVE ID:** W4

**OBJECTIVE:** Remove the 6 direct prototype replacements and remaining application/runtime wrappers by making accepted behavior authoritative in the class or narrow explicit runtime services. Make spatial indexes and dynamic sets first-class derived state without weakening performance.

**CURRENT OWNER(S):** `renderSettingsRuntime` replaces `ProjectNoclipGame.setupEngine/updateStreaming/refreshLightField`; `runtimePerformance` replaces `WorldRenderer.resolveMovement/closestInteraction/updateDynamicItems`; streaming/visibility and outlet interaction wrap application methods.

**TARGET OWNER(S):** `ProjectNoclipGame` explicitly calls render/streaming/visibility/interaction services; `WorldRenderer`/narrow runtime owners expose one semantic movement/interaction/dynamic-Item operation backed by derived indexes; no replacement implementation remains hidden behind installation.

**EXACT AREAS / LIKELY FILES:**

- `src/app/ProjectNoclipGame.ts`;
- `src/renderer/renderSettingsRuntime.ts` and `renderSettings.ts` without changing M-F1 allocation policy;
- `src/renderer/streamingScheduler.ts`, `streamingPolicy.ts`;
- `src/renderer/visibility/runtime.ts` and existing visibility participation modules;
- `src/renderer/WorldRenderer.ts` query/dynamic-Item methods only;
- `src/renderer/runtimePerformance.ts`, `runtimeSpatialIndex.ts`;
- `src/renderer/outletInteractionRuntime.ts` and the canonical application interaction dispatch path;
- movement, interaction, dynamic Item, streaming and visibility tests.

**DEPENDENCIES:** W2 accepted. May run in parallel with W3 only under strict boundaries.

**BEHAVIOR CHANGE?** NO.

**PRODUCT DECISION REQUIRED?** NO. PD-2 does not block moving current outlet behavior to the correct interaction owner. PD-3 forbids changing light allocation while absorbing render-settings lifecycle ownership.

**CAN RUN IN PARALLEL?** YES, with W3 only.

**PARALLEL WRITE BOUNDARIES:** W4 owns application/runtime/index files above and `WorldRenderer.ts` query/index integration. W4 must not edit Level 0 presentation/material modules, `cellBuilder.ts`, `fixtureLighting.ts`, presentation definitions, A-A1 topology/collision contracts, or casing/outlet generation eligibility.

**VERIFICATION:** direct replacement count reaches 0; indexed movement equals brute-force oracle; interaction target equivalence; dynamic Item tick set equivalence; streaming residency/prediction unchanged; visibility participation reasons/counts unchanged; Blackout/render settings unchanged; outlet prompt/action unchanged; runtime scenario timing within cleanup tolerances.

**ROLLBACK POINT:** Accepted W2 SHA for the W4 branch. W3 and W4 integrate only after independent verification; conflicts in shared semantic behavior are resolved by returning to the owner boundary, not by reintroducing a wrapper.

**EXPECTED DEBT REMOVED:** all 6 direct prototype replacements; base-vs-installed duplicate implementations; renderer-to-application outlet wrappers; performance module as second semantic owner; hidden streaming/visibility installation dependency.

## WAVE 5 — Compatibility isolation and post-consolidation bridge/fallback removal

**WAVE ID:** W5

**OBJECTIVE:** After W3/W4 integration, isolate deliberate compatibility and remove only Gen3/historical bridge code whose authority has already been absorbed.

**CURRENT OWNER(S):** Gen2 compatibility spread across persistence/generator/shared address shapes/app runtime; PAU pilot interception; masked legacy Blackout bodies; Gen3 create-then-replace renderer fallbacks; historical correction names/helpers.

**TARGET OWNER(S):** explicit Gen2 compatibility boundary with frozen outputs; canonical Gen3 renderer construction; normal PAU representation dispatch; current Blackout runtime as single active owner; no historical bridge remains merely because installer order once required it.

**EXACT AREAS / LIKELY FILES:**

**Lane W5A — compatibility isolation**

- `src/persistence/types.ts` migration boundary;
- `src/world/generator.ts` generation dispatch;
- Gen2 collaborators such as `architecture.ts`, `layouts.ts`, `zones.ts` only where a clearer compatibility boundary can be created without changing outputs;
- `src/world/types.ts` only for explicit compatibility views/adapters, never persisted-string/ID re-keying;
- `src/app/ProjectNoclipGame.ts` Gen2 shift/Zone-entry branches.

**Lane W5B — renderer/historical bridge cleanup**

- `src/renderer/pauFeaturePresentationPilot.ts` absorption into normal representation dispatch;
- `src/renderer/cellBuilder.ts` migrated Feature fallback proof;
- `src/renderer/WorldRenderer.ts` Gen3 create-then-replace Hole/fixture fallback removal where W3 canonical owners now exist;
- masked superseded Blackout renderer/app implementation only after direct reachability proof and without touching W5A files;
- generic renderer helper duplication only after semantic consolidation;
- correction/pilot/final names only when responsibility has actually changed.

**DEPENDENCIES:** Integrated and accepted W3 + W4 head.

**BEHAVIOR CHANGE?** NO.

**PRODUCT DECISION REQUIRED?** NO for isolation. PD-5 is required for any Gen2 deletion/expiry and is explicitly outside this wave.

**CAN RUN IN PARALLEL?** YES, as W5A and W5B only if their file lists remain disjoint. If a required change crosses the boundary, serialize it after one lane lands rather than allowing concurrent edits to the same owner.

**PARALLEL WRITE BOUNDARIES:** W5A owns persistence/world-generation compatibility and Gen2-only app branches; W5B owns renderer/PAU/fallback cleanup. W5B may not edit persisted schemas, generation dispatch or stable world/address types. W5A may not edit renderer presentation/construction.

**VERIFICATION:** supported old-save fixtures load identically; Gen2 generated descriptors/world addresses/shift behavior unchanged; Gen3 descriptors unchanged; Character Creator/Inventory/save reload; PAU Feature visuals; CV-H1/fixtures after fallback removal; production build; Studio security; performance tolerance. Keep `run-character-aware-smoke.py` and evidence-schema aliases unless their consumers are separately proven gone.

**ROLLBACK POINT:** Accepted integrated W3+W4 SHA. Any compatibility mismatch reverts the lane; do not add a second migration or ID remap as a cleanup patch.

**EXPECTED DEBT REMOVED:** mixed current/legacy ownership; PAU pilot bridge; masked old runtime bodies proven unreachable; Gen3 provisional create-then-replace paths; post-consolidation generic helper duplication. Supported compatibility remains.

## WAVE 6 — Naming, CODE_MAP, verification-shape cleanup and full closure

**WAVE ID:** W6

**OBJECTIVE:** Make names/tests/docs describe the architecture that now exists, remove mechanism assertions that no longer represent contracts, and prove complete behavior/performance equivalence.

**CURRENT OWNER(S):** historical names/comments/tests and pre-cleanup CODE_MAP; release-era source-string assertions; remaining documented hooks.

**TARGET OWNER(S):** durable semantic names, accurate CODE_MAP, behavioral verification, only explicitly justified diagnostic/instrumentation hooks.

**EXACT AREAS / LIKELY FILES:**

- `docs/CODE_MAP.md` ownership map;
- `docs/VERIFICATION.md` current-state wording, including stale Inventory future tense if still present;
- renderer module names such as `ordinaryWallpaperPresentation` only if shared ownership is now fully established;
- historical `pilot` / `runtimeCorrection` / misleading `final` names only where implementation responsibility changed;
- release-named tests may be renamed by durable contract without reducing coverage;
- source-string architecture tests replaced by behavioral tests where mechanism is no longer the contract;
- explicit architecture metric verification.

**DEPENDENCIES:** W5 accepted and no pending integration conflict.

**BEHAVIOR CHANGE?** NO.

**PRODUCT DECISION REQUIRED?** NO. Product-decision items remain documented as pending if not separately resolved.

**CAN RUN IN PARALLEL?** NO. This is the serial closure/integration wave.

**PARALLEL WRITE BOUNDARIES:** N/A.

**VERIFICATION:** complete matrix in `Verification Strategy`; exact diff audit for no accidental product-law changes; wrapper/replacement/duplicate-owner metrics; CODE_MAP path verification; provenance impact review.

**ROLLBACK POINT:** Accepted W5 SHA. Documentation/naming/test-shape changes must not mask a failed equivalence check.

**EXPECTED DEBT REMOVED:** stale historical terminology; stale source-shape architecture ownership; inaccurate navigation; remaining undocumented wrapper/order dependencies.

# Parallelization Plan

The lifecycle core and A-A1 seam are serial by design.

- **W0 -> W1 -> W2 are strictly serial.** No parallel worker may change the lifecycle core or A-A1/collision contract while those owners are being established.
- **W3 and W4 are the first safe sibling waves.** Both branch from the same accepted W2 SHA. W3 owns presentation/policy and must not touch app/runtime/index core. W4 owns app/runtime/index core and must not touch Level 0 presentation/fixture files. They are integrated only after both pass independent verification.
- **W5 may use two internal parallel lanes** only if W5A compatibility and W5B renderer bridge files remain disjoint. Shared-file pressure converts the affected work to serial rather than weakening the boundary.
- **W6 is serial closure.** It is intentionally last so names/docs/tests describe accepted owners rather than anticipated ones.

No worker may use a broad “cleanup” remit to modify another worker's semantic owner. Each implementation prompt must name its exact base SHA and write boundary.

# Compatibility Strategy

## GEN2 LEGACY

Gen2 is **LEGACY / SUPPORTED**, not dead. `migrateSave()` maps supported missing/older generation metadata to `gen2`; generation dispatch reaches `generateLegacyCell()`; runtime retains Gen2 shift/Zone-entry behavior. W5 may isolate these paths, but outputs remain frozen.

## SUPPORTED SAVE COMPATIBILITY

No cleanup wave may silently regenerate an existing journey. Save schema interpretation, generation dispatch and old-save fixtures must be verified before/after any touched compatibility boundary.

## STABLE IDENTITY

Do not change:

- generation-version values `gen2` / `gen3-v1`;
- CharacterProfileId values/meaning;
- Journey identity or Journey-local `characterId` meaning;
- Item Instance `instanceId` or origin lineage;
- Cell IDs/world addresses/shift components used by supported paths;
- deterministic seed-domain strings;
- stable presentation/Asset IDs without an explicit compatibility migration.

A-A1 structural role should become explicit without re-keying stable IDs. If `arch-pale-wallpaper` naming is cleaned, separate role metadata from surface identity first and prove whether the MaterialId is externally/persistently addressed before any identifier rename.

## PERSISTED STRINGS / ENUMS

Treat persisted values and externally consumed diagnostics as compatibility surfaces until proven otherwise. Do not “clean up” enum/string names through bulk rename when serialization or evidence readers may depend on them.

## MIGRATION CODE

Migration code remains until the data it migrates is explicitly unsupported. Future GenerationVersion additions must replace broad fallback behavior deliberately; that future-version hazard is not a reason to rewrite current migration in this cleanup.

## REFERENCE / ORACLE CODE

`resolveCircleAgainstAabbs` remains canonical semantic collision logic and an independent brute-force oracle. Indexed candidate selection is an optimization around it. Do not collapse the oracle into the index implementation.

Verification compatibility shims such as `run-character-aware-smoke.py` and legacy runtime-evidence aliases remain until concrete consumers are inventoried and migrated.

# Provenance Actions

The provenance audit produced stronger factual evidence and the canonical ledger is updated in this synthesis only for those evidenced facts. The synthesis does not change `WORLD.md`, source assets, reference media or product canon.

Canonical evidence position:

- Backrooms Wiki Level 0 **page text** and file-specific media terms are separate evidence layers.
- Retrieved page-text license box states CC BY-SA 3.0; this is recorded as a source statement, not a project-wide license conclusion.
- Baseline `OGLevel0.jpg`: Bob Mazza, file-specific CC0 1.0 statement, Archive source.
- Arch `/2`: Bob Mazza, file-specific CC0 1.0 statement, Archive source.
- Pillar `/3`: Alfarex, file-specific CC BY-SA 4.0 statement.
- Blackout `/5`: Alfarex, file-specific CC BY-SA 4.0 statement.
- Hole `/4`: `UNKNOWN / REVIEW REQUIRED` because the observed media entry named `4` linked to `/1`; do not transfer that entry to `/4`.
- Red `/6`: `UNKNOWN / REVIEW REQUIRED`; no reliable file-specific entry was observed.
- Hole/Red Drive mirrors: byte identity/uploader/permission chain remain unresolved.
- Scutoidbox Red Rooms image: `EVIDENCE-ONLY` / `UNKNOWN / REVIEW REQUIRED`.
- M-W1 A/B/C committed WebPs: underlying source, creator, license/permission, attribution, redistribution scope and source-to-derivative chain remain `UNKNOWN / REVIEW REQUIRED`.
- Current ambience is procedurally synthesized Web Audio; fluorescent-buzz identity is source-derived, but no external audio recording is committed on the audited tree.
- Almond Water name/concept is source-derived from the recorded Backrooms object source; Project item stats, IDs, instances and inventory behavior remain Project-original.
- Generation 3, deterministic Fields/Regions/topology/Carver architecture, visibility, Journey versioning, PAU/NAL/Studio, Character Profile/Avatar architecture, Item Instance identity, Inventory architecture and current renderer/runtime mechanisms remain Project-original engineering.

Mutable external evidence must be canonicalized with:

- exact URL;
- access/evidence date;
- source revision/version when reliably obtainable;
- creator;
- file-specific terms when available;
- separation of page text terms from media terms.

The provenance audit observed source-page metadata drift across retrievals. A mutable live page is not immutable proof. Do not invent a stable revision identifier when one was not reliably captured.

# Verification Strategy

Every cleanup worker starts from an exact accepted SHA and records before/after evidence for its owned seam. A passing build alone is insufficient.

## Required product/system verification

Preserve and run, as applicable to every wave:

- strict TypeScript;
- full deterministic/system suite;
- Generation 3 descriptor determinism and world-domain tests;
- 10,000-Cell benchmark;
- production build;
- Studio production security boundary;
- gameplay functional journey;
- Character Creator journey;
- Inventory UI journey;
- Studio authoring acceptance;
- save/reload;
- supported old-save Gen2 compatibility;
- Ordinary visuals;
- Pillar visuals;
- Arch/A-A1 visuals;
- CV-H1 visuals and Region/Condition floor preservation;
- C-B1 Blackout;
- flashlight behavior;
- collision equivalence;
- streaming prediction/residency equivalence;
- visibility participation equivalence;
- current M-F1 active/shadow invariant;
- renderer/runtime diagnostics.

## Architecture-specific proof

Record at each applicable wave:

- call-through prototype wrapper count;
- direct prototype replacement count;
- targeted duplicate semantic-owner groups;
- implicit install-order dependencies;
- historical correction layers still active;
- high-confidence dead-code removals completed;
- compatibility paths touched and their explicit owners;
- CODE_MAP accuracy after W6.

Source-string tests that only freeze historical mechanism must not be deleted until a behavioral equivalent exists. Tests that enforce source shape as the actual security/static contract remain.

## Performance non-regression tolerance

Use like-for-like runtime scenario evidence on the same environment/configuration. Cleanup acceptance uses these conservative guardrails:

- 10,000-Cell benchmark: no persistent regression greater than **5%** versus the matched pre-wave baseline;
- scenario median frame time: no persistent regression greater than **5%**;
- scenario p95 frame time: no persistent regression greater than **5%**;
- scenario p99 frame time: no persistent regression greater than **10%**;
- no new repeatable major-hitch class in sustained running, rapid camera rotation, running-plus-turning or repeated Cell crossings;
- no increase in algorithmic scan scope for collision, interaction, dynamic Items, visibility or fixture selection merely because composition became more abstract;
- current resident/visibility/render-participating semantics remain distinct;
- current M-F1 active/shadow counts and selection behavior remain unchanged until PD-3 is separately decided.

Headless Chromium/SwiftShader is noisy and is not a physical-device FPS claim. If a threshold breach is near the boundary or run variance exceeds the apparent regression, repeat matched scenarios and use the median of at least three comparable runs. A persistent breach blocks the cleanup wave; it is not excused as “refactor-only.”

# Rollback Strategy

Each wave is a separate branch/PR from one exact accepted predecessor SHA. Record that SHA before editing.

- W0 rollback: restore a removed script if a real repository consumer appears; do not create a new shim.
- W1 rollback: revert the lifecycle conversion as one unit if ordering/output differs; do not wrap the new lifecycle with the old lifecycle.
- W2 rollback: keep/restore the old A-A1 correction until canonical collision equivalence is proven; never delete first and patch collision later.
- W3 rollback: restore the previous material owner set as a unit if visual/Studio equivalence fails; do not run both resolver policies indefinitely.
- W4 rollback: restore the prior runtime adapter implementation if query/streaming/visibility performance or behavior diverges; do not add another replacement layer.
- W5 rollback: compatibility mismatch reverts the lane; never compensate by changing persisted IDs, generation strings or save data.
- W6 rollback: naming/docs/test-shape changes cannot be used to make a failed product check disappear.

If a wave reveals a disputed product rule, stop that disputed behavior change at the last clean owner boundary and raise the decision. Continue only independent refactor work that does not depend on the decision.

# Completion Criteria

Cleanup is complete when all of the following are true:

1. Current call-through prototype/lifecycle wrappers: **23**. Completion target: **<= 2**, and every remaining wrapper is documented non-semantic instrumentation/compatibility with no hidden install-order authority. Zero is welcome but not required.
2. Current direct prototype method replacements: **6**. Completion target: **0**.
3. Targeted duplicate semantic-owner groups (M-C1, M-A1, A-A1 role, CV-H1 depth palette, M-F1 visible panel): completion target **0 duplicate policy owners**. Multiple lifecycle consumers of one resolver are allowed.
4. Targeted implicit install-order dependencies: completion target **0**. Required order is visible in one composition/lifecycle owner.
5. No active correction layer remains whose sole responsibility is to infer/correct semantic truth produced by another accepted owner. A legitimate final material stage may remain if late geometry still requires it, but it must consume canonical policy rather than redefine it.
6. Both high-confidence Dev.8 profiling files are removed after fresh caller verification.
7. Gen2 remains supported and is more clearly isolated; no Gen2 output/save identity is deleted or rewritten.
8. Canonical brute-force collision oracle remains independent and indexed-vs-oracle equivalence passes.
9. Current Dev.9.8 performance mechanisms remain present and meet the non-regression tolerance.
10. Ordinary/Pillar/Arch/A-A1/CV-H1/Blackout/flashlight visuals and collision behavior match the preserved baseline.
11. Character Creator, Inventory, Studio, save/reload and old-save compatibility pass.
12. Casing/outlet current behavior is explicit and preserved until PD-1/PD-2 decisions.
13. M-F1 current physical-light behavior is preserved until PD-3 is decided; cleanup does not silently change WORLD.md or runtime policy.
14. `docs/CODE_MAP.md` accurately maps the final owners after W6.
15. Provenance evidence remains separated from world/product truth; M-W1 A/B/C and unresolved `/4`/`/6` media remain `UNKNOWN / REVIEW REQUIRED`.
16. No new generic framework, scan-heavy event system or abstraction layer has replaced a finite direct dependency merely to reduce file count.

# Deferred Performance Work

The project owner reports Dev.9.8 as materially smoother. This cleanup protects that result but does not become another optimization run.

Keep these known hotspots visible for later dedicated performance work:

- Arch/A-A1 reconstruction cost;
- dense Arch/Pillar rendering pressure;
- lighting cost, including the separately decision-gated M-F1 participation policy;
- Visibility topology invalidation/rebuild spikes;
- occasional StaticWorldBatching reconcile spikes.

A cleanup wave may eliminate redundant entity/material churn when that churn is directly caused by duplicate ownership, but must not broaden into visual-quality reduction, geometry redesign, culling redesign or new performance policy.

# Explicit Non-Goals

This plan does not authorize:

- a Generation 3 world redesign;
- A-A1 silhouette, dimensions, geometry, opening or aesthetic changes;
- Pillar density/geometry redesign;
- CV-H1 aperture/floor behavior changes;
- new floor wet/dry visual effects;
- casing or outlet additions/removals across Regions before PD-1/PD-2;
- M-F1 nearest/cap behavior changes before PD-3;
- Gen2 deletion, save expiry or silent migration;
- Character/Journey/Item identity consolidation;
- stable ID, persisted enum/string or seed-domain renaming without explicit migration proof;
- removal of the brute-force collision oracle;
- removal of verification compatibility shims without consumer proof;
- deletion or replacement of M-W1 A/B/C assets merely because provenance is unresolved;
- world-law/governance edits such as `WORLD.md`, `docs/VISION.md`, `AGENTS.md` or `docs/WORK_RULES.md` inside an ordinary cleanup worker;
- a generalized event bus/plugin architecture;
- weakening tests, security boundaries or performance budgets to make cleanup pass;
- Ultra graphics work or the deferred full lighting/Arch performance project.

The desired end state is not “fewer files.” It is a codebase in which a maintainer can answer, for each behavior, **who owns the semantic decision, who realizes it, which derived systems observe it, and in what explicit lifecycle order** without relying on installer folklore.