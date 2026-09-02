# Project Noclip Dead Code + Duplication + Compatibility Audit

Base: `preview/cleanup-governance-baseline` @ `741414a0f9606f9fb9af06f85b6c601c275e266b`

Version: `0.3.0-dev.9.8`

Mode: AUDIT only. No deletion or implementation change is performed by this report.

## Executive Summary

This audit found a small amount of safely provable dead historical tooling and a much larger amount of live code that merely *looks* historical because Project Noclip intentionally carries compatibility, semantic-oracle, presentation-finalization, or development-tool responsibilities.

The highest-confidence deletions are the two standalone Dev.8 profiling scripts whose workflow owners were already removed and whose roles are now covered by the consolidated renderer/runtime-scenario verification architecture. They have no runtime, save, generation-version, stable-ID, Studio, package-script, or current workflow ownership.

The largest cleanup opportunity is not deletion. It is semantic consolidation in Level 0 presentation. Arch structural finish, Arch structural-role detection, Region carpet presentation, and CV-H1 depth material values are encoded in multiple renderer stages. Some of those stages are legitimately distinct because reconstructed geometry appears after the base Cell surface pass, but the *values and classification rules* should have one canonical owner and be consumed by each lifecycle stage.

Gen2 is not dead. Save migration maps any supported pre-Gen3/missing generation-version save to `gen2`, `generateCell()` dispatches those journeys through `generateLegacyCell()`, and the live game preserves Gen2-specific shifting and Zone-entry behavior. Gen2 vocabulary also remains embedded in shared descriptor/address shapes (`zoneId`, `districtId`, `roomArchetype`, `zoneOverride`) and in persisted journey fields. Those boundaries can be isolated later, but they cannot be deleted without a supported-save migration strategy and stable-address proof.

Several apparent duplicates are intentional and should remain separate: the canonical brute-force collision resolver is both the production semantic resolver and the oracle used to prove the indexed candidate path; world stable hashing is not the same concept as continuous field noise; Character Profile IDs, Journey-local character IDs, and Item Instance IDs intentionally have different identity laws; and streaming residency/prediction is not the same policy as visibility-driven renderer participation.

Audit method:

- pinned every authoritative read to the required base SHA;
- followed `AGENTS.md`, `docs/WORK_RULES.md`, `docs/CODE_MAP.md`, `docs/TERMINOLOGY.md`, persistence/generation contracts, the Gen3 cutover ADR, `WORLD.md` where world truth was needed, and `docs/VERIFICATION.md`;
- inspected the complete repository tree at the base commit;
- traced current package/workflow entrypoints, browser compatibility wrappers, persistence migration, Gen2 dispatch, stable identity, collision oracle coverage, PAU/NAL presentation layers, static batching, streaming and visibility participation;
- treated repository code/history policy as authoritative and did not classify by filename alone.

No candidate touching persistence, generation version, Cell/address identity, CharacterProfileId, Journey identity, Item Instance identity, timeline state, registered content, or persisted enum/string values is classified REMOVE without explicit compatibility proof.

## Safe Removal Candidates

### DEAD-001

FILE / SYMBOL: `scripts/dev8-corrective-profile.py` (entire file)

CLASSIFICATION: REMOVE

WHY IT LOOKS SUSPICIOUS: Standalone Dev.8 corrective profiler with historical artifact names and fixed Dev.8 renderer expectations, including the former High/49-Cell style baseline.

REFERENCE SEARCH RESULT: No package-script owner and no current workflow owner were found at the required base. `docs/VERIFICATION.md` records the Dev.8 corrective workflow as removed and its useful role as superseded by modern renderer/runtime-scenario diagnostics.

RUNTIME CALLER? NO

TEST CALLER? NO

DEV TOOL CALLER? NO current registered/package entrypoint found.

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? NO

STABLE-ID DEPENDENCY? NO

SAFE TO REMOVE? YES

PROOF: Current verification is owned by `.github/workflows/renderer-diagnostics.yml`, `.github/workflows/profile-production.yml`, and `scripts/profile-runtime-scenarios.py`; the old Dev.8 workflow owner is already absent from the exact-base workflow directory. This script does not participate in game imports or persistence.

RECOMMENDED ACTION: Delete the file in the first implementation cleanup batch, then run verification-contract checks plus current renderer diagnostics to prove no hidden CI/manual dependency has been reintroduced.

RISK: LOW. The only residual risk is undocumented manual invocation outside repository-owned entrypoints.

### DEAD-002

FILE / SYMBOL: `scripts/dev8-production-spike-profile.py` (entire file)

CLASSIFICATION: REMOVE

WHY IT LOOKS SUSPICIOUS: Historical Dev.8 production traversal-spike profiler whose workflow owner and branch-era assumptions were superseded.

REFERENCE SEARCH RESULT: No package-script owner and no current workflow owner were found at the required base. `docs/VERIFICATION.md` records the Dev.8 production-spike workflow as removed and replaced by current production profiling/runtime evidence.

RUNTIME CALLER? NO

TEST CALLER? NO

DEV TOOL CALLER? NO current registered/package entrypoint found.

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? NO

STABLE-ID DEPENDENCY? NO

SAFE TO REMOVE? YES

PROOF: Ongoing production evidence is provided by `.github/workflows/profile-production.yml`, `scripts/profile-production.py`, and the reusable runtime scenario evidence contract rather than this standalone Dev.8 script.

RECOMMENDED ACTION: Delete with DEAD-001 in the first cleanup batch; do not alter modern profiling thresholds or evidence schema as part of that deletion.

RISK: LOW. Same undocumented-manual-use caveat as DEAD-001.

## Consolidation Candidates

### DEAD-016

FILE / SYMBOL: Arch structural material values in `src/renderer/level0SurfacePresentation.ts`, `src/renderer/archDividerRuntimeCorrection.ts`, `src/renderer/level0RegionPresentation.ts`, and `src/renderer/finalLevel0MaterialPresentation.ts`

CLASSIFICATION: CONSOLIDATE

WHY IT LOOKS SUSPICIOUS: The same M-A1 concept is represented by repeated target IDs, role mappings, pale tint fallbacks, and gloss defaults across multiple lifecycle stages.

REFERENCE SEARCH RESULT: All modules are live. `docs/PRESENTATION_ARCHITECTURE.md` explicitly requires a final material owner after reconstructed Region/Arch geometry, so the stages are not duplicates merely because the values repeat.

RUNTIME CALLER? YES

TEST CALLER? YES

DEV TOOL CALLER? Indirectly through Studio/preview material resolution.

SAVE / PERSISTENCE DEPENDENCY? NO world/save mutation, but presentation target IDs are canonical authoring identifiers.

GENERATION-VERSION DEPENDENCY? Gen3 presentation only.

STABLE-ID DEPENDENCY? Presentation target/representation IDs must remain stable.

SAFE TO REMOVE? NO

PROOF: The lifecycle passes are necessary, but M-A1 color/gloss semantics should not be independently encoded in each pass. Structured presentation is the accepted owner.

RECOMMENDED ACTION: Create one runtime M-A1 resolver/helper fed by structured presentation data; make base surface, correction/reconstruction, and finalization consume it. Preserve lifecycle ordering.

RISK: MEDIUM. Incorrect consolidation could make reconstructed Arch geometry use stale/fallback materials or break Studio preview refresh.

### DEAD-017

FILE / SYMBOL: Arch structural classification in `src/renderer/archDividerRuntimeCorrection.ts::archStructuralRole` and `src/renderer/level0RegionPresentation.ts::{isArchHeader,isArchLower,isArchPierSupport,...}`

CLASSIFICATION: CONSOLIDATE

WHY IT LOOKS SUSPICIOUS: Separate implementations infer the same semantic A-A1 structural roles from wall material, height, vertical bounds, and geometry tolerances.

REFERENCE SEARCH RESULT: Both paths are active and are tested by Arch reconstruction/correction tests.

RUNTIME CALLER? YES

TEST CALLER? YES

DEV TOOL CALLER? NO direct owner.

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? Gen3-v1 Arch geometry.

STABLE-ID DEPENDENCY? Structural wall IDs are consumed but should not be changed by consolidation.

SAFE TO REMOVE? NO

PROOF: This is semantic duplication, not merely similar syntax: two modules independently decide which generated wall volume means header/lower/pier support.

RECOMMENDED ACTION: Move structural-role classification to one shared Arch semantic/presentation boundary and have reconstruction/correction consume the result. Do not move world topology ownership into renderer presentation.

RISK: HIGH. Tolerance changes can alter visible geometry or collision if consolidation changes classification behavior.

### DEAD-018

FILE / SYMBOL: Region carpet profile/material/UV rules in `src/renderer/level0SurfacePresentation.ts`, `src/renderer/level0RegionPresentation.ts`, and `src/renderer/finalLevel0MaterialPresentation.ts`

CLASSIFICATION: CONSOLIDATE

WHY IT LOOKS SUSPICIOUS: Ordinary/Pillar/Arch carpet tints, Arch gloss, pattern scale and world-continuous segmented-floor handling are represented in multiple renderer modules.

REFERENCE SEARCH RESULT: The modules all participate in current Gen3 rendering; `docs/PRESENTATION_ARCHITECTURE.md` assigns M-C1 carpet parameters to structured presentation and requires final ownership for reconstructed/CV-H1 floor surfaces.

RUNTIME CALLER? YES

TEST CALLER? YES, including CV-H1 floor/seam coverage.

DEV TOOL CALLER? YES indirectly through Studio preview/material authoring.

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? Gen3-v1 presentation.

STABLE-ID DEPENDENCY? NO world ID mutation permitted.

SAFE TO REMOVE? NO

PROOF: Separate lifecycle passes are justified; duplicated carpet semantics are not. The Region/floor presentation is the semantic owner of carpet, while CV-H1 owns apertures/depth.

RECOMMENDED ACTION: Centralize resolved M-C1 region profile + UV calculation and call it from every lifecycle stage. Keep CV-H1 geometry independent of carpet ownership.

RISK: MEDIUM-HIGH. A careless merge can reintroduce the historical defect where Hole presentation overwrites the underlying Region carpet.

### DEAD-019

FILE / SYMBOL: CV-H1 depth material values in `src/renderer/level0RegionPresentation.ts` and `src/renderer/finalLevel0MaterialPresentation.ts`

CLASSIFICATION: CONSOLIDATE

WHY IT LOOKS SUSPICIOUS: Upper/middle/deep/void visual depth values are encoded both during Region reconstruction and in the final PAU material ownership pass.

REFERENCE SEARCH RESULT: Both are live by design; PAU documentation says CV-H1 visible depth colours are presentation fields while carver geography/collision remains world-owned.

RUNTIME CALLER? YES

TEST CALLER? YES

DEV TOOL CALLER? YES indirectly through material authoring.

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? Gen3-v1 CV-H1 only.

STABLE-ID DEPENDENCY? Hole entity IDs must remain unchanged.

SAFE TO REMOVE? NO

PROOF: Final material ownership is required after generated/reconstructed geometry. The duplicated *values* can be centralized without removing either lifecycle stage.

RECOMMENDED ACTION: Resolve CV-H1 depth palette once from canonical presentation data; reconstruction should consume bootstrap/resolved materials without owning an independent palette.

RISK: MEDIUM.

### DEAD-020

FILE / SYMBOL: Repeated renderer helpers such as `childrenOf()` / `entityByName()` across Level 0 presentation modules

CLASSIFICATION: CONSOLIDATE

WHY IT LOOKS SUSPICIOUS: Identical entity-child traversal/name lookup helpers are copied into multiple renderer patch layers.

REFERENCE SEARCH RESULT: Textual duplication is widespread in the active presentation modules; unlike DEAD-016 through DEAD-019, this is primarily helper duplication rather than duplicated world/presentation semantics.

RUNTIME CALLER? YES

TEST CALLER? Indirectly.

DEV TOOL CALLER? NO

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? NO

STABLE-ID DEPENDENCY? Entity names are lookup keys but persisted identity is not involved.

SAFE TO REMOVE? NO, not until callers are migrated.

PROOF: The helper behavior is generic and has no separate semantic ownership justification.

RECOMMENDED ACTION: Consolidate into renderer support utilities only after checking import-cycle risk. Do this after semantic consolidation, not before.

RISK: LOW-MEDIUM.

## Required Legacy Compatibility

### DEAD-003

FILE / SYMBOL: `src/persistence/types.ts::migrateSave` generation-version normalization

CLASSIFICATION: LEGACY

WHY IT LOOKS SUSPICIOUS: It maps any supported save that is not explicitly `gen3-v1` to `gen2`, which can look like an obsolete fallback after the Gen3 cutover.

REFERENCE SEARCH RESULT: Live `SaveStore.load()` calls migration for IndexedDB, localStorage, and memory fallback data.

RUNTIME CALLER? YES

TEST CALLER? YES through persistence/core coverage.

DEV TOOL CALLER? NO

SAVE / PERSISTENCE DEPENDENCY? YES — primary owner.

GENERATION-VERSION DEPENDENCY? YES — primary compatibility gate.

STABLE-ID DEPENDENCY? YES indirectly because the selected generation path determines historical generated world identity.

SAFE TO REMOVE? NO

PROOF: Pre-Gen3/missing-version saves must be frozen to Gen2 rather than reinterpreted as Gen3 at the same coordinates.

RECOMMENDED ACTION: Keep. If future generation versions are added, replace the broad fallback with explicit schema/version migration logic while preserving the Gen2 mapping for existing supported saves.

RISK: CRITICAL if removed or changed casually.

### DEAD-004

FILE / SYMBOL: `src/world/generator.ts::generateLegacyCell` and `generateCell()` Gen2 dispatch

CLASSIFICATION: LEGACY

WHY IT LOOKS SUSPICIOUS: Large pre-Gen3 generation path remains next to current `generateGen3Cell()`.

REFERENCE SEARCH RESULT: `ProjectNoclipGame.updateStreaming()` passes `save.generationVersion` into `generateCell()`. Migrated old saves can therefore reach `generateLegacyCell()` in normal Continue gameplay.

RUNTIME CALLER? YES

TEST CALLER? YES

DEV TOOL CALLER? World Lab/diagnostics can inspect generated Cells.

SAVE / PERSISTENCE DEPENDENCY? YES

GENERATION-VERSION DEPENDENCY? YES

STABLE-ID DEPENDENCY? YES — old world outputs must not be regenerated with new semantics.

SAFE TO REMOVE? NO

PROOF: Supported Gen2 journeys remain reachable. New journeys explicitly write `gen3-v1`, so the legacy path is isolated by persisted generation version rather than globally obsolete.

RECOMMENDED ACTION: Keep behavior frozen. Later isolate the function and its Gen2-only collaborators behind an explicit compatibility module boundary without rewriting outputs.

RISK: CRITICAL.

### DEAD-005

FILE / SYMBOL: `src/world/types.ts::{WorldAddress.zoneId,WorldAddress.districtId,WorldTuning.zoneOverride,RoomArchetype compatibility fields}`

CLASSIFICATION: LEGACY

WHY IT LOOKS SUSPICIOUS: Gen3 world truth is Region/Condition/Carver/Structure based, yet shared Cell descriptors still carry Zone/District/room-era vocabulary.

REFERENCE SEARCH RESULT: `generateGen3Cell()` deliberately fills a compatibility Zone (`baseline`/`arch`/`pillar`) and `gen3:x:z` district string; `zoneOverride` is explicitly documented in code as legacy save/diagnostic compatibility.

RUNTIME CALLER? YES

TEST CALLER? YES

DEV TOOL CALLER? YES — diagnostics/World Lab compatibility.

SAVE / PERSISTENCE DEPENDENCY? `generationVersion` and legacy tuning/save interpretation are related; not every descriptor field is itself persisted.

GENERATION-VERSION DEPENDENCY? YES

STABLE-ID DEPENDENCY? YES for `addressId()`, which embeds generation version, zone, district and shift epoch.

SAFE TO REMOVE? NO

PROOF: Current Gen3 code still produces these fields to satisfy the shared contract and diagnostics. Removing them requires a descriptor/address schema separation plus proof that no persisted/diagnostic identity relies on them.

RECOMMENDED ACTION: Keep now. Later introduce a clean Gen3-native address/semantic view while keeping a compatibility adapter for Gen2/old diagnostics.

RISK: HIGH.

### DEAD-006

FILE / SYMBOL: `src/app/ProjectNoclipGame.ts` Gen2 shifting and legacy Zone-entry branches; persisted `shiftEpochs`, `unloadCounts`, `enteredZoneIds`

CLASSIFICATION: LEGACY

WHY IT LOOKS SUSPICIOUS: New Gen3 journeys use Region entry and do not run the old shifting branch, but the save schema still initializes/carries the historical fields.

REFERENCE SEARCH RESULT: Live runtime explicitly checks `save.generationVersion === 'gen2'` before shifting unloaded Cells and before announcing/persisting first Zone entry.

RUNTIME CALLER? YES for Gen2 saves.

TEST CALLER? YES indirectly through save/world tests.

DEV TOOL CALLER? NO direct owner.

SAVE / PERSISTENCE DEPENDENCY? YES

GENERATION-VERSION DEPENDENCY? YES

STABLE-ID DEPENDENCY? YES — shift epoch participates in historical address/generation behavior.

SAFE TO REMOVE? NO

PROOF: These paths are reachable by supported migrated Gen2 saves. New-journey non-use is not deletion proof.

RECOMMENDED ACTION: Keep frozen. When Gen2 is isolated, move these runtime branches behind a generation-specific compatibility policy rather than scattering checks through the main game class.

RISK: CRITICAL for old saves.

### DEAD-007

FILE / SYMBOL: `scripts/run-character-aware-smoke.py`

CLASSIFICATION: LEGACY

WHY IT LOOKS SUSPICIOUS: Compatibility wrapper around older browser scripts after Character Creator changed the New Game entry flow.

REFERENCE SEARCH RESULT: `docs/VERIFICATION.md` explicitly states that obsolete broader wrappers were removed and this one remains intentionally as the narrow compatibility shim for older visual evidence scripts.

RUNTIME CALLER? NO product runtime.

TEST CALLER? Browser verification caller.

DEV TOOL CALLER? YES — verification tooling.

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? NO

STABLE-ID DEPENDENCY? NO

SAFE TO REMOVE? NO

PROOF: Repository verification policy names this script as intentionally retained compatibility infrastructure.

RECOMMENDED ACTION: Keep until every remaining legacy visual script enters through the Character Creator itself; then remove wrapper and documentation together.

RISK: MEDIUM — premature deletion can break independent visual evidence without changing product behavior.

### DEAD-008

FILE / SYMBOL: `scripts/profile-runtime-scenarios.py` fields `loadedCells` and `participatingCells`

CLASSIFICATION: LEGACY

WHY IT LOOKS SUSPICIOUS: Old metric names duplicate the explicit `RESIDENT_CELLS` / `RENDER_PARTICIPATING_CELLS` vocabulary.

REFERENCE SEARCH RESULT: `docs/VERIFICATION.md` explicitly calls them compatibility aliases for old evidence readers.

RUNTIME CALLER? Diagnostic runtime only.

TEST CALLER? Verification/diagnostic consumers.

DEV TOOL CALLER? YES.

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? NO direct dependency.

STABLE-ID DEPENDENCY? NO

SAFE TO REMOVE? NO

PROOF: The aliases are deliberately retained for historical evidence compatibility; new analysis is instructed to use the explicit labels.

RECOMMENDED ACTION: Keep until downstream evidence readers are inventoried and versioned off schema aliases; remove only with an evidence-schema compatibility decision.

RISK: MEDIUM.

## Gen2 Boundary Findings

Gen2 support is reachable and must remain frozen for supported historical journeys:

1. `SaveStore.load()` reads current IndexedDB, localStorage fallback, or memory state and feeds it through `migrateSave()`.
2. `migrateSave()` preserves `gen3-v1` only when explicitly present; supported older/missing-version saves become `gen2`.
3. `ProjectNoclipGame.launch()` preserves the loaded save.
4. `ProjectNoclipGame.updateStreaming()` passes the persisted `generationVersion` into `generateCell()`.
5. `generateCell()` dispatches `gen2` to `generateLegacyCell()` and all other current journeys to `generateGen3Cell()`.
6. Runtime behavior also branches for Gen2 Cell shifting and Zone-entry persistence.

New journeys are cleanly Gen3 at creation: `startNew()` writes `version: 2` and `generationVersion: 'gen3-v1'` before first launch.

Compatibility-bearing modules/units identified:

- `src/persistence/types.ts` — save schemas and migration gate;
- `src/world/generator.ts` — generation dispatch and frozen legacy generation;
- `src/world/architecture.ts` — legacy architecture collaborators used by the Gen2 branch;
- `src/world/layouts.ts` — legacy archetype/layout collaborators used by the Gen2 branch;
- `src/world/zones.ts` — legacy Zone profile/selection vocabulary, with some legitimate shared use by current code;
- `src/app/ProjectNoclipGame.ts` — Gen2 runtime shifting/Zone-entry compatibility;
- `scripts/run-character-aware-smoke.py` — browser-entry compatibility;
- `scripts/profile-runtime-scenarios.py` — evidence-schema aliases.

The boundary is therefore only partly isolated. The generation dispatch itself is clear, but legacy concepts leak through shared `CellDescriptor`/`WorldAddress` shapes and through the main game runtime. A future cleanup should isolate *interfaces* first, not delete implementations first.

Shared helpers that are legitimately shared across generations include deterministic hash/ID helpers, exits/notes/lighting/Manila structure primitives where current Gen3 code explicitly calls them, and generic `CellDescriptor` geometry data. Shared use must be evaluated symbol-by-symbol; modules such as `zones.ts` are not safe whole-file deletion candidates simply because their name is Gen2-era vocabulary.

Frozen compatibility surfaces include at minimum:

- `GenerationVersion` persisted values `gen2` and `gen3-v1`;
- historical Cell coordinates and `cellId(x,z)` addressing;
- address generation/Zone/district/shift components consumed by `addressId()`;
- Gen2 Zone IDs and Zone-entry history;
- Gen2 shift epochs/unload counts where historical journeys can reach shifting;
- Journey-local `characterId` and its starter/inventory ownership lineage;
- persisted Item Instance IDs and their origin/source lineage;
- existing CharacterProfileId values in the separate profile store;
- any seed-domain strings already participating in deterministic world decisions.

High-risk boundary concern: current migration treats every value other than literal `gen3-v1` as Gen2. That is safe for the currently supported historical schemas but is a future-version hazard: a future generation string must not be silently downgraded by this logic. Address that when introducing a new generation/save schema, not in mechanical cleanup.

## Duplicate Semantic Rules

The four high-confidence semantic-duplication groups are:

1. **M-A1 Arch structural finish** — repeated role colors/gloss/target handling across base surface, Arch correction/reconstruction and final material ownership.
2. **A-A1 structural-role classification** — independent header/lower/pier classification logic in correction and Region reconstruction.
3. **M-C1 Region carpet presentation** — repeated Region tint/gloss/pattern/segmented-floor UV behavior across multiple renderer stages.
4. **CV-H1 visible depth material palette** — repeated upper/middle/deep/void presentation values between reconstruction and final PAU ownership.

These should be consolidated by semantic owner while retaining lifecycle-specific callers. The cleanup should not turn the final material pass into the geometry owner or move world topology into renderer presentation.

Not semantic duplication:

- `src/world/hash.ts` deterministic string/stable-ID utilities versus `src/world/fields.ts` local integer mixing/interpolation for continuous world fields;
- CharacterProfileId creation versus deterministic Item Instance ID creation versus Journey-local `characterId` creation;
- streaming residency/prediction versus visibility participation;
- canonical collision resolution versus indexed collision candidate selection.

## Duplicate Helpers / Constants

DEAD-016 through DEAD-020 capture the main repeated constants/helpers.

The priority order is semantic constants first, generic helpers second. Replacing repeated `childrenOf()`/`entityByName()` functions is useful but materially less important than making M-A1/M-C1/CV-H1 parameters resolve from one canonical owner.

No recommendation is made to unify random/hash functions merely because their implementation includes similar integer mixing. Their domains differ and determinism is part of world identity.

### DEAD-009

FILE / SYMBOL: `src/physics/collision.ts::resolveCircleAgainstAabbs`, `src/renderer/runtimeSpatialIndex.ts`, `src/renderer/runtimePerformance.ts`, `tests/dev9-8-runtime-performance.test.mjs`

CLASSIFICATION: KEEP

WHY IT LOOKS SUSPICIOUS: The brute-force resolver can look superseded once production has a spatial index.

REFERENCE SEARCH RESULT: Production still invokes the canonical resolver on indexed candidates. Tests also invoke the same resolver on the complete wall set as an oracle and assert indexed/brute equivalence over fixed and deterministic randomized cases.

RUNTIME CALLER? YES

TEST CALLER? YES — both production-path and oracle-path usage.

DEV TOOL CALLER? Diagnostics indirectly.

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? NO

STABLE-ID DEPENDENCY? Collider ordering/IDs are observable by tests but not persisted save identity.

SAFE TO REMOVE? NO

PROOF: PRODUCTION OWNER: runtime spatial index narrows candidate AABBs; canonical resolver preserves collision semantics on those candidates. REFERENCE/ORACLE OWNER: tests run the canonical resolver against the full set and compare results, proving the optimization does not alter collision behavior.

RECOMMENDED ACTION: Keep both owners. If refactored, retain a clearly named reference/oracle route independent of indexed candidate selection.

RISK: HIGH if oracle independence is lost.

### DEAD-010

FILE / SYMBOL: `src/world/hash.ts` versus `src/world/fields.ts` local hash/mix helpers

CLASSIFICATION: KEEP

WHY IT LOOKS SUSPICIOUS: Both contain deterministic integer/string mixing and can appear to be duplicate random/hash utilities.

REFERENCE SEARCH RESULT: `hash.ts` owns stable string-based IDs/RNG decisions; `fields.ts` owns continuous spatial field sampling/interpolation.

RUNTIME CALLER? YES

TEST CALLER? YES

DEV TOOL CALLER? YES indirectly through world inspection.

SAVE / PERSISTENCE DEPENDENCY? Stable IDs/world outputs depend on `hash.ts` semantics.

GENERATION-VERSION DEPENDENCY? Shared across generation/world logic.

STABLE-ID DEPENDENCY? YES for `hash.ts`.

SAFE TO REMOVE? NO

PROOF: Similar arithmetic serves different semantic contracts. Unifying them risks changing stable IDs or spatial field continuity.

RECOMMENDED ACTION: Keep separate; document the distinction if future contributors repeatedly flag them as duplicates.

RISK: CRITICAL if deterministic outputs change.

### DEAD-011

FILE / SYMBOL: `src/player-character/profile.ts::createCharacterProfileId`, `src/app/ProjectNoclipGame.ts` Journey `characterId`, `src/items/factory.ts::createItemInstanceId`

CLASSIFICATION: KEEP

WHY IT LOOKS SUSPICIOUS: Three ID factories exist around player/item identity.

REFERENCE SEARCH RESULT: `docs/PLAYER_CHARACTER_IDENTITY.md` explicitly separates Character Profile identity from Journey identity. Item Instance IDs derive deterministically from definition/source provenance and are persisted independently.

RUNTIME CALLER? YES

TEST CALLER? YES

DEV TOOL CALLER? NO special owner.

SAVE / PERSISTENCE DEPENDENCY? YES

GENERATION-VERSION DEPENDENCY? Journey/world identity is separate from profile identity.

STABLE-ID DEPENDENCY? YES

SAFE TO REMOVE? NO

PROOF: CharacterProfileId is local actor identity; Journey `characterId` owns Journey-local starter/inventory lineage; ItemInstanceId identifies one exact persistent object. They are not interchangeable semantic concepts.

RECOMMENDED ACTION: Keep distinct. Never consolidate them behind one generic ID factory unless the API forces callers to declare the identity domain and preserves existing serialized IDs exactly.

RISK: CRITICAL.

### DEAD-012

FILE / SYMBOL: `src/presentation/generatedAssetRegistry.ts`

CLASSIFICATION: KEEP

WHY IT LOOKS SUSPICIOUS: The checked-in generated registry can be nearly empty before asset build and is generated rather than hand-authored.

REFERENCE SEARCH RESULT: PAU/NAL documentation and package build tooling define `assets/definitions/* -> build-assets -> generated registry/runtime assets`; current verification explicitly builds the NAL registry for Studio acceptance.

RUNTIME CALLER? YES after build through presentation asset resolution.

TEST CALLER? YES via presentation/Studio checks.

DEV TOOL CALLER? YES — NAL/Studio.

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? NO

STABLE-ID DEPENDENCY? Stable AssetIds/content hashes are canonical presentation identity.

SAFE TO REMOVE? NO

PROOF: Empty generated output is a build-state artifact, not dead code. The generated module is part of the source-backed registry pipeline.

RECOMMENDED ACTION: Keep generated file and generation checks; never hand-edit it as cleanup.

RISK: HIGH if removed without changing the build pipeline.

### DEAD-013

FILE / SYMBOL: `src/presentation/changeReceiptExports.ts`, `src/presentation/developmentContextExports.ts`

CLASSIFICATION: KEEP

WHY IT LOOKS SUSPICIOUS: Thin formatting/export wrappers have little product-runtime use.

REFERENCE SEARCH RESULT: Studio foundation tests consume receipt formatting, and the files are development/Studio handoff surfaces rather than gameplay modules.

RUNTIME CALLER? Not normal production gameplay owner.

TEST CALLER? YES

DEV TOOL CALLER? YES

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? Development context reports generation but does not own it.

STABLE-ID DEPENDENCY? It reports semantic/runtime IDs but does not generate them.

SAFE TO REMOVE? NO

PROOF: The dead-code law explicitly protects development-tool and verification entrypoints. These files have such ownership.

RECOMMENDED ACTION: Keep; consider clearer `dev/` placement only as a later architecture move with Studio import updates.

RISK: MEDIUM.

### DEAD-014

FILE / SYMBOL: `src/renderer/finalLevel0MaterialPresentation.ts` final material stage

CLASSIFICATION: KEEP

WHY IT LOOKS SUSPICIOUS: A file named `final` and a late monkey-patched pass can look like patch-on-patch corrective residue.

REFERENCE SEARCH RESULT: `docs/PRESENTATION_ARCHITECTURE.md` explicitly defines a final presentation owner because reconstructed A-A1/CV-H1 geometry is created after the base Cell surface pass, including queued asynchronous Arch reconstruction.

RUNTIME CALLER? YES from `src/main.ts`.

TEST CALLER? YES through presentation/material acceptance.

DEV TOOL CALLER? YES indirectly through Studio preview refresh.

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? Gen3 Level 0 presentation.

STABLE-ID DEPENDENCY? No world identity ownership.

SAFE TO REMOVE? NO

PROOF: The stage exists for an accepted lifecycle reason. Its duplicated values should be consolidated, but the lifecycle owner itself is current architecture.

RECOMMENDED ACTION: Keep the stage while reducing duplicated material logic through DEAD-016/018/019.

RISK: HIGH if removed before reconstruction ordering changes.

### DEAD-015

FILE / SYMBOL: `src/renderer/streamingPolicy.ts` versus `src/renderer/visibility/participation.ts`

CLASSIFICATION: KEEP

WHY IT LOOKS SUSPICIOUS: Both reason about Cell sets, prediction, radii and fallback.

REFERENCE SEARCH RESULT: Streaming owns residency, prediction and heavy-work budget. Visibility participation consumes resident/legacy-distance/visibility/safety/predictive sets to decide renderer participation and fail-open fallback.

RUNTIME CALLER? YES

TEST CALLER? YES

DEV TOOL CALLER? Diagnostics observe both.

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? Visibility topology is Gen3-aware but residency remains separate.

STABLE-ID DEPENDENCY? Cell IDs are shared keys, not redefined.

SAFE TO REMOVE? NO

PROOF: `docs/VERIFICATION.md` explicitly states streaming retains Cell residency ownership while visibility owns final renderer participation. Combining them would collapse independent safety/evidence concepts.

RECOMMENDED ACTION: Keep separate; continue sharing only explicit predictive/fallback inputs.

RISK: HIGH.

### DEAD-016A

FILE / SYMBOL: `src/presentation/materialRuntime.ts`, `src/renderer/presentationImageTextures.ts`, `src/renderer/ordinaryWallpaperAssets.ts`

CLASSIFICATION: KEEP

WHY IT LOOKS SUSPICIOUS: Multiple Asset/material helpers participate in NAL resolution.

REFERENCE SEARCH RESULT: `materialRuntime.ts` resolves canonical/preview representation parameters and Asset slots; image-texture infrastructure owns verified decoded runtime textures; wallpaper asset code is a feature-specific preload/diagnostic adapter that asks the canonical material target for family Asset IDs.

RUNTIME CALLER? YES

TEST CALLER? YES

DEV TOOL CALLER? YES through Studio preview/NAL.

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? NO

STABLE-ID DEPENDENCY? Stable Presentation/Asset IDs are preserved.

SAFE TO REMOVE? NO

PROOF: This is layered resolution, not duplicate NAL ownership. The feature adapter does not independently hard-code source paths; it asks `materialAssetId()` for the canonical slot.

RECOMMENDED ACTION: Keep. Consolidate only duplicated semantic material values, not the NAL pipeline layers.

RISK: MEDIUM-HIGH if collapsed incorrectly.

## Historical Corrective Layers

### DEAD-021

FILE / SYMBOL: `src/renderer/pauFeaturePresentationPilot.ts`

CLASSIFICATION: CLEAN

WHY IT LOOKS SUSPICIOUS: File and comments still describe a narrow PAU “pilot”/migration bridge, and it monkey-patches `RendererCellBuilder.addPropGeometry` for the initially migrated Feature set.

REFERENCE SEARCH RESULT: `src/main.ts` actively installs it; the target feature representation path remains live.

RUNTIME CALLER? YES

TEST CALLER? YES through presentation acceptance.

DEV TOOL CALLER? YES indirectly through PAU preview.

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? Gen3 presentation target path.

STABLE-ID DEPENDENCY? Feature/Representation IDs must remain stable.

SAFE TO REMOVE? NO

PROOF: Active installation means it is not dead. The concern is architectural naming/layering: a pilot bridge has become part of current runtime composition.

RECOMMENDED ACTION: Fold the interception into the canonical feature-presentation/cell-builder ownership boundary, then rename/remove the pilot layer only after equivalent current behavior is tested.

RISK: MEDIUM-HIGH.

### DEAD-022

FILE / SYMBOL: `src/renderer/archDividerRuntimeCorrection.ts`

CLASSIFICATION: CLEAN

WHY IT LOOKS SUSPICIOUS: “RuntimeCorrection” naming and prototype patching signal historical corrective architecture.

REFERENCE SEARCH RESULT: `StaticWorldBatching` installs it; Arch tests directly exercise its semantics; it currently reconciles visible reconstructed lower-panel collision and structural material roles.

RUNTIME CALLER? YES

TEST CALLER? YES

DEV TOOL CALLER? NO direct owner.

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? Gen3 Arch presentation/collision.

STABLE-ID DEPENDENCY? Collider/wall IDs must remain stable through cleanup.

SAFE TO REMOVE? NO

PROOF: It is an active semantic/collision layer, not abandoned corrective code.

RECOMMENDED ACTION: After DEAD-017 classification consolidation, move the remaining collision reconciliation into the authoritative reconstructed-Arch runtime owner and retire the corrective name/patch boundary.

RISK: HIGH because collision safety is involved.

### DEAD-023

FILE / SYMBOL: Release-named active tests including `tests/dev5-*`, `tests/dev8-*`, and `tests/dev9-*`

CLASSIFICATION: CLEAN

WHY IT LOOKS SUSPICIOUS: Historical milestone names make current contract tests look obsolete.

REFERENCE SEARCH RESULT: `scripts/test.mjs` executes every `tests/*.test.mjs`; inspected Dev.8 tests assert current Arch reconstruction, streaming budgets, batching/fixture diagnostics and main runtime installation.

RUNTIME CALLER? NO

TEST CALLER? YES — active full deterministic/system test suite.

DEV TOOL CALLER? CI.

SAVE / PERSISTENCE DEPENDENCY? Some test files cover persistence/identity; classification is file-by-file before any rename.

GENERATION-VERSION DEPENDENCY? Several explicitly protect current Gen3/compatibility contracts.

STABLE-ID DEPENDENCY? Some tests may protect deterministic IDs.

SAFE TO REMOVE? NO

PROOF: Historical filename is not evidence of obsolete behavior; current test runner includes them.

RECOMMENDED ACTION: Rename/group by durable contract only when doing so improves ownership clarity and after checking workflow/path references. Do not reduce independent coverage merely to remove version labels.

RISK: MEDIUM.

### DEAD-024

FILE / SYMBOL: `src/main.ts` comment describing `installLevel0SurfacePresentation()` as a retained Dev.9.7 “no-op marker”

CLASSIFICATION: CLEAN

WHY IT LOOKS SUSPICIOUS: The comment narrates a completed closeout state and is factually stale.

REFERENCE SEARCH RESULT: `installLevel0SurfacePresentation()` is not a no-op; it patches `WorldRenderer.loadCell` and applies current Gen3 floor/ceiling/wall/fixture surface presentation.

RUNTIME CALLER? YES

TEST CALLER? Indirectly.

DEV TOOL CALLER? YES indirectly via presentation refresh.

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? Gen3 presentation.

STABLE-ID DEPENDENCY? NO

SAFE TO REMOVE? NO — code must remain; stale comment can be corrected.

PROOF: Current implementation has active behavior inconsistent with the comment.

RECOMMENDED ACTION: Delete/rewrite only the obsolete comment in a later cleanup; describe actual surface-presentation ownership instead of release closeout history.

RISK: LOW.

### DEAD-025

FILE / SYMBOL: `docs/VERIFICATION.md` Inventory UI “before integration lands” paragraph

CLASSIFICATION: CLEAN

WHY IT LOOKS SUSPICIOUS: Documentation says the Inventory job is reserved before `scripts/inventory-ui-smoke.py` exists.

REFERENCE SEARCH RESULT: At the required base the script exists, and `.github/workflows/feature-acceptance.yml` detects it and runs the Inventory UI acceptance job.

RUNTIME CALLER? NO

TEST CALLER? Documentation of active CI.

DEV TOOL CALLER? YES — contributor/verification guidance.

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? NO

STABLE-ID DEPENDENCY? NO

SAFE TO REMOVE? NO — only the stale prose is safe to update.

PROOF: Exact-base repository state contradicts the future-tense statement.

RECOMMENDED ACTION: Rewrite the paragraph to describe current independent Inventory acceptance and retain the optional-detection guard only if it is still intentionally useful for branch isolation.

RISK: LOW.

### DEAD-026

FILE / SYMBOL: `.github/workflows/feature-acceptance.yml` hard-coded disposable Studio branch label `agent/dev9-7-studio-completion`

CLASSIFICATION: CLEAN

WHY IT LOOKS SUSPICIOUS: Current generic feature acceptance still depends on a release-specific historical branch name to satisfy the Studio Save-to-Project safety guard.

REFERENCE SEARCH RESULT: `docs/VERIFICATION.md` documents the coupling as intentional current behavior; workflow verifies the exact commit before/after applying the disposable label.

RUNTIME CALLER? NO product runtime.

TEST CALLER? YES — Studio browser acceptance.

DEV TOOL CALLER? YES — Studio safety infrastructure.

SAVE / PERSISTENCE DEPENDENCY? NO game-save dependency.

GENERATION-VERSION DEPENDENCY? NO

STABLE-ID DEPENDENCY? NO

SAFE TO REMOVE? NO

PROOF: The branch label is still operationally required by the current Studio write guard, so deleting it would break acceptance. The issue is release-specific architecture surviving inside a generic workflow.

RECOMMENDED ACTION: Replace the Studio safety predicate with a durable disposable-test-branch capability/policy, then remove the Dev.9.7 literal from workflow and docs together.

RISK: MEDIUM-HIGH because Studio write protections must not be weakened.

## Test / Harness Cleanup Candidates

Primary removals: DEAD-001 and DEAD-002.

Compatibility harness to retain: DEAD-007.

Historical active tests to clean by durable contract rather than delete: DEAD-023.

The modern verification architecture is intentionally split into independent Core Correctness, Feature Acceptance, Visual Regression, Renderer/Performance Diagnostics, and production/release surfaces. Consolidation must not recombine them simply to reduce file/job count.

The Inventory UI optional-detection branch in `feature-acceptance.yml` is not classified REMOVE. It currently handles the exact-base script as present and may still be useful for feature-branch isolation. Its surrounding documentation, not the guard itself, is the proven stale element.

## Stale Comments / Documentation

Confirmed drift:

- DEAD-024 — `src/main.ts` says an active surface-presentation installer is a Dev.9.7 “no-op marker”.
- DEAD-025 — `docs/VERIFICATION.md` describes Inventory acceptance as waiting for a script that is already present and executed.
- DEAD-026 — generic Studio acceptance carries a Dev.9.7 branch-era label. The code is currently required; the historical coupling should be cleaned only after the guard is generalized.

Historical documents with explicit dated/release intent are not automatically stale. `docs/releases/**`, `docs/release-candidates/**`, and completion/audit records should remain historical evidence unless they are falsely presented as current authority.

## High-Risk Unknowns

### DEAD-027

FILE / SYMBOL: `src/presentation/index.ts`

CLASSIFICATION: INVESTIGATE LATER

WHY IT LOOKS SUSPICIOUS: Barrel module re-exports many presentation APIs; no internal exact-base import owner was established during this audit.

REFERENCE SEARCH RESULT: Repository code search did not surface a normal internal `presentation/index.js` caller, but absence of an internal caller does not prove absence of external/dev-tool/public-contract use.

RUNTIME CALLER? UNKNOWN

TEST CALLER? UNKNOWN as a barrel; underlying exports are heavily tested.

DEV TOOL CALLER? UNKNOWN

SAVE / PERSISTENCE DEPENDENCY? NO direct save owner.

GENERATION-VERSION DEPENDENCY? NO direct owner.

STABLE-ID DEPENDENCY? Re-exported APIs expose stable presentation IDs/contracts.

SAFE TO REMOVE? UNKNOWN

PROOF: Insufficient. Barrel/public API surfaces are specifically unsafe to delete based only on internal reference search.

RECOMMENDED ACTION: Check package/public import contracts, Studio scripts, docs/examples and any external tooling before deciding. If truly internal-only and unused, remove only the barrel, not underlying modules.

RISK: MEDIUM.

### DEAD-028

FILE / SYMBOL: `src/renderer/visibility/index.ts`

CLASSIFICATION: INVESTIGATE LATER

WHY IT LOOKS SUSPICIOUS: Small barrel re-exporting visibility contracts while runtime modules may import concrete files directly.

REFERENCE SEARCH RESULT: No authoritative external/public ownership was established in this audit.

RUNTIME CALLER? UNKNOWN as a barrel.

TEST CALLER? UNKNOWN as a barrel; underlying visibility functions are actively tested.

DEV TOOL CALLER? UNKNOWN

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? Re-exported topology adapter is Gen3-aware.

STABLE-ID DEPENDENCY? Cell IDs are exposed but not generated here.

SAFE TO REMOVE? UNKNOWN

PROOF: Unreferenced barrel is not sufficient deletion proof because it may be an intended API boundary.

RECOMMENDED ACTION: Verify external/import-contract intent. If no contract exists, either remove it or make it the deliberate visibility public surface and migrate internal imports consistently.

RISK: LOW-MEDIUM.

### DEAD-029

FILE / SYMBOL: `src/world/types.ts::addressId`

CLASSIFICATION: INVESTIGATE LATER

WHY IT LOOKS SUSPICIOUS: Code search surfaced the definition without an obvious current caller.

REFERENCE SEARCH RESULT: No runtime caller was proven, but the function serializes generation version, Cell coordinates, Zone, district and shift epoch into one address string.

RUNTIME CALLER? UNKNOWN / no proven current caller.

TEST CALLER? UNKNOWN

DEV TOOL CALLER? UNKNOWN

SAVE / PERSISTENCE DEPENDENCY? Potentially high because its inputs are compatibility-sensitive world address fields.

GENERATION-VERSION DEPENDENCY? YES

STABLE-ID DEPENDENCY? YES by semantics even if currently uncalled; it is an address identity formatter.

SAFE TO REMOVE? UNKNOWN

PROOF: Stable-address semantics make “unused export” evidence insufficient. It may be reserved as a contract, test helper, future-facing API, or external diagnostic utility.

RECOMMENDED ACTION: Search consumers outside TypeScript imports (tools/docs/generated evidence) and inspect Git history/ADR intent. If no contract exists, deprecate first rather than silently deleting.

RISK: HIGH.

### DEAD-030

FILE / SYMBOL: `src/types/playcanvas.d.ts` and `src/playcanvas-compat.d.ts`

CLASSIFICATION: INVESTIGATE LATER

WHY IT LOOKS SUSPICIOUS: Two PlayCanvas declaration surfaces overlap: a broad ambient type model and a narrow module augmentation for methods used by current renderer code.

REFERENCE SEARCH RESULT: Both are included in current TypeScript compilation contexts; the compatibility augmentation supplies `StandardMaterial.clone()` and local-position/scale methods used by active presentation code.

RUNTIME CALLER? Type-only; active source depends on the declared APIs.

TEST CALLER? Typecheck/test compilation.

DEV TOOL CALLER? Typecheck/Studio compilation.

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? NO

STABLE-ID DEPENDENCY? NO

SAFE TO REMOVE? UNKNOWN

PROOF: Overlap exists, but it is not established that the installed PlayCanvas package declarations fully replace the broad ambient declarations under every tsconfig. Removing either without a strict typecheck matrix is unsafe.

RECOMMENDED ACTION: In a dedicated type-boundary cleanup, compare upstream PlayCanvas typings against both local declarations, remove only declarations now provided upstream, retain minimal augmentations, and run app/test/Studio strict TypeScript builds.

RISK: MEDIUM.

### DEAD-031

FILE / SYMBOL: `src/renderer/cellBuilder.ts` legacy prop rendering branches for PAU-pilot Feature kinds such as bucket/paint-can

CLASSIFICATION: INVESTIGATE LATER

WHY IT LOOKS SUSPICIOUS: `pauFeaturePresentationPilot.ts` intercepts migrated Feature kinds before the base builder, suggesting matching fallback branches may be unreachable in the fully installed runtime.

REFERENCE SEARCH RESULT: The main entrypoint installs the PAU pilot, but `RendererCellBuilder` is also a direct class boundary and tests/dev tools may instantiate/use it without the main installer chain.

RUNTIME CALLER? Possibly shadowed for migrated kinds in normal main startup; not proven globally unreachable.

TEST CALLER? UNKNOWN for the exact fallback branches.

DEV TOOL CALLER? POSSIBLE.

SAVE / PERSISTENCE DEPENDENCY? NO

GENERATION-VERSION DEPENDENCY? Base builder also supports Gen2/current generic rendering, so whole module is not a candidate.

STABLE-ID DEPENDENCY? Prop IDs/Feature IDs must remain stable.

SAFE TO REMOVE? UNKNOWN

PROOF: Prototype interception is not sufficient proof that every direct builder consumer installs the interceptor first.

RECOMMENDED ACTION: Add/reference tests around direct builder ownership, then either make canonical feature presentation an explicit dependency of the builder or retain the fallback as documented compatibility. Do not delete the whole prop path by inspection alone.

RISK: MEDIUM-HIGH.

## Recommended Deletion Order

1. **Delete only DEAD-001 and DEAD-002 first.** They are the only high-confidence file removals. Verify current renderer diagnostics, production profiling and verification-contract checks still resolve all registered entrypoints.
2. **Consolidate semantic presentation rules before removing renderer layers.** Address DEAD-016 through DEAD-019 with equivalence tests and Studio preview/material tests. Keep final/reconstruction lifecycle stages until ordering is deliberately redesigned.
3. **Consolidate generic renderer helpers.** DEAD-020 is low-risk after semantic owners are clear.
4. **Clean active historical layers without behavior changes.** Fold/rename DEAD-021 and DEAD-022 only after their current responsibilities have explicit owners.
5. **Rename historical tests by durable contract.** DEAD-023 is naming/organization cleanup, not coverage deletion.
6. **Fix stale release prose/coupling.** DEAD-024 and DEAD-025 are safe documentation/comment cleanup; DEAD-026 requires preserving Studio write-safety before removing the Dev.9.7 branch literal.
7. **Isolate Gen2; do not delete it.** Move DEAD-003 through DEAD-006 behind clearer compatibility boundaries only after byte-/behavior-equivalence evidence for supported saves. Keep DEAD-007/008 until their consumers are retired.
8. **Resolve unknowns last.** DEAD-027 through DEAD-031 require explicit consumer/public-contract/typecheck evidence before deletion.

Deletion must never be sequenced by LOC payoff. The order above prioritizes certainty, compatibility safety, and semantic ownership.

## Numerical Summary

Counts below are counts of classified audit findings in this report, not counts of every file/symbol in the repository.

KEEP=8

CLEAN=6

CONSOLIDATE=5

REMOVE=2

LEGACY=6

INVESTIGATE_LATER=5

HIGH-CONFIDENCE removable files=2

HIGH-CONFIDENCE removable symbols=0

DUPLICATE semantic-rule groups=4

LEGACY compatibility modules=8

`LEGACY compatibility modules` counts compatibility-bearing modules/entrypoint units listed in the Gen2 Boundary section; several are mixed current/legacy modules and are **not** whole-file deletion candidates.

## Verification

- source files modified: **NO**
- tests modified: **NO**
- compatibility code removed: **NO**
- governance changed: **NO**
- `VERSION` changed: **NO** (`0.3.0-dev.9.8`)
- audit write scope: **only `docs/audits/cleanup-deadcode-compatibility.md` added**

This is a static exact-base audit. No runtime/product implementation was changed, so no product test result is claimed by this report.

PROVENANCE_IMPACT=NONE

Reason: mechanical/compatibility audit only; no content provenance changed.
