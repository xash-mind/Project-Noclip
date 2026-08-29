# Project Noclip Code Navigation Map

This map describes the architecture that exists in the repository now. Use it to find the authoritative owner before editing. Repository implementation remains authoritative if this document ever drifts.

## Ownership rule

The dependency direction is:

```text
WORLD DOMAIN
  -> PRESENTATION POLICY / DEFINITIONS
  -> RUNTIME / RENDERER
  -> PLAYCANVAS
```

For any behavior, distinguish four questions:

1. **Who owns the decision?** The semantic or policy authority.
2. **Who realizes it?** The code that creates runtime/PlayCanvas state.
3. **Who observes derived state?** Indexes, diagnostics, batching or visibility consumers.
4. **What is the lifecycle order?** Explicit orchestration, never hidden installer order.

Derived indexes do not own semantics. Runtime realization must consume canonical world/presentation decisions rather than recreate them.

## Application / runtime path

```text
src/main.ts
  -> initializeRenderSettingsRuntime()
  -> installFixtureLighting()
  -> installStaticWorldBatching()
  -> initializeRuntimePerformanceDiagnostics()
  -> installRendererRuntimeDiagnostics()       # non-semantic diagnostics wrapper only
  -> mountDevelopmentVersionIndicator()
  -> prepareOrdinaryWallpaperAssets()
  -> new ProjectNoclipGame()
  -> DEV-only Studio / World Lab bridges
  -> game.initialize()

src/app/ProjectNoclipGame.ts
  -> application orchestration
  -> GenerationVersion-aware journey/runtime coordination
  -> explicit render-settings operations
  -> explicit streaming operations
  -> explicit visibility participation
  -> interaction dispatch
  -> save/reload coordination

src/renderer/WorldRenderer.ts
  -> base Cell realization/destruction
  -> explicit invocation of renderer Cell lifecycle
  -> authoritative movement-collision operation
  -> authoritative nearest-interaction operation
  -> authoritative dynamic Item ticking operation
  -> supported Gen2 render-compatibility branches

src/renderer/rendererCellLifecycle.ts
  -> one explicit streamed Cell composition order
  -> no prototype installation
  -> no hidden startup-order authority
```

Do not restore application/runtime prototype replacement layers or renderer Cell lifecycle installers.

## Renderer Cell lifecycle

`WorldRenderer.loadCell()` invokes `runRendererCellLoadLifecycle()` directly. The accepted load order is:

```text
base-cell-realization
  -> level0-surface-presentation
  -> ordinary-casing-presentation
  -> level0-region-presentation
  -> schedule-nearby-arch-presentation
  -> wall-junction-presentation
  -> realize-canonical-arch-collision
  -> fixture-lighting-attach
  -> static-batching-dirty
  -> runtime-derived-state-register
  -> final-level0-materials
  -> schedule-final-material-convergence
```

`WorldRenderer.unloadCell()` invokes `runRendererCellUnloadLifecycle()` directly. The accepted unload order is:

```text
runtime-derived-state-unregister
  -> fixture-lighting-detach
  -> base-cell-destroy
  -> schedule-nearby-arch-presentation
  -> realize-neighbor-arch-collision
  -> static-batching-dirty
```

Neighbor-aware **visible** Arch reconstruction may remain deferred. Canonical A-A1 collision realization is synchronous before normal derived-index registration.

## GenerationVersion / generation dispatch

**Decision owner**

```text
src/world/types.ts
  -> GenerationVersion type / address representation

src/world/gen2Compatibility.ts
  -> generationVersionFromPersisted()
  -> isGen2Compatibility()
  -> gen2ZoneForCell()
```

**Persistence owner**

```text
src/persistence/types.ts
  -> save schema / migration
  -> persisted GenerationVersion parsing through generationVersionFromPersisted()
```

**Generation realization**

```text
src/world/generator.ts
  -> generateCell()
       gen2    -> generateLegacyCell()
       gen3-v1 -> generateGen3Cell()
```

`gen2` and `gen3-v1` are compatibility identities. Do not rename, collapse or reinterpret them.

## Gen2 compatibility boundary

Gen2 is **LEGACY / SUPPORTED**.

```text
src/world/gen2Compatibility.ts
  -> compatibility guards / persisted-value interpretation

src/world/generator.ts::generateLegacyCell()
  -> frozen Gen2 descriptor generation

src/world/architecture.ts
  -> frozen Gen2 compatibility architecture path
  -> historical BaselineArchitecturePilot* names are retained inside this frozen boundary

src/renderer/WorldRenderer.ts
  -> replaceLegacyFixtureMeshes()
  -> replaceLegacyHoleFloor()
  -> explicit Gen2 render compatibility only
```

New Gen3 behavior must not be routed through Gen2 compatibility. Gen2 compatibility must not become a second owner of Gen3 policy.

## Level 0 presentation policy

**Canonical decision owner**

```text
src/presentation/level0PresentationPolicy.ts
```

This owns migrated Level 0 policy decisions including:

- M-C1 carpet treatment;
- M-A1 structural finish;
- CV-H1 visible depth palette;
- M-F1 visible-panel appearance.

**Structured definitions / PAU**

```text
src/presentation/definitions/*
src/presentation/level0FeatureRepresentations.ts
src/presentation/level0MaterialRepresentations.ts
src/presentation/projectPresentationRegistry.ts
src/presentation/materialRuntime.ts
src/presentation/registry.ts
```

**Renderer-side policy realization/cache**

```text
src/renderer/level0PresentationMaterials.ts
```

Renderer stages may consume these resolvers repeatedly during lifecycle convergence; they must not independently redefine the policy.

## M-W1 — shared Level 0 wallpaper

**Decision / material source**

```text
src/presentation/definitions/level0-materials.json
src/presentation/materialRuntime.ts
src/renderer/ordinaryWallpaperRules.ts    # Ordinary-only A/B/C distribution, casing and outlet rules
```

**Visible realization**

```text
src/renderer/level0WallpaperPresentation.ts
```

The wallpaper presentation module is shared across eligible Ordinary, Pillar Field and Arch wall surfaces. Its durable filename reflects that responsibility. Ordinary-only casing/outlet eligibility remains intentionally separate and unchanged.

**Asset preparation / image pipeline**

```text
src/renderer/ordinaryWallpaperAssets.ts
src/renderer/presentationImageTextures.ts
assets/definitions/library.json
```

Existing AssetIds and diagnostic/evidence compatibility names remain stable.

## M-C1 — Level 0 carpet

**Decision owner**

```text
src/presentation/level0PresentationPolicy.ts
  -> resolveLevel0CarpetPresentation()
  -> canonicalLevel0CarpetUv()
```

**Realization**

```text
src/renderer/level0PresentationMaterials.ts
src/renderer/level0SurfacePresentation.ts
src/renderer/finalLevel0MaterialPresentation.ts
```

`finalLevel0MaterialPresentation.ts` is a deliberate late convergence stage, not a semantic correction owner. It reapplies canonical policy to geometry that may be reconstructed late.

Floor Condition visual contribution remains the accepted explicit no-op.

## M-A1 — A-A1 structural finish

**Decision owner**

```text
src/presentation/level0PresentationPolicy.ts
  -> resolveLevel0ArchFinishPresentation()
```

**Realization / binding**

```text
src/renderer/level0PresentationMaterials.ts
src/renderer/level0RegionPresentation.ts
src/renderer/finalLevel0MaterialPresentation.ts
```

M-A1 owns pale structural finish only. It does not own A-A1 semantic role or collision.

## A-A1 — Arch divider ownership

### Semantic role / collision intent

```text
src/world/gen3ArchDividerSemantics.ts
  -> ArchStructuralRole
  -> archStructuralRole()
  -> archSemanticWallOwnsFinalCollision()
```

This is the sole world-domain owner of A-A1 structural-role classification and semantic collision intent.

### Visible presentation

```text
src/renderer/level0RegionPresentation.ts
  -> neighbor-aware visible Arch-frame reconstruction

src/renderer/level0PresentationMaterials.ts
  -> consumes M-A1 finish policy

src/renderer/finalLevel0MaterialPresentation.ts
  -> late canonical material convergence after reconstruction
```

### Collision realization

```text
src/renderer/archDividerCollision.ts
  -> descriptor/bay-driven final collider realization
```

PlayCanvas entity names, transforms and materials are not collision truth.

### Derived collision indexing

```text
src/renderer/runtimePerformance.ts
src/renderer/runtimeSpatialIndex.ts
```

These index canonical collider state. They do not decide A-A1 collision policy.

The brute-force collision oracle in tests must remain independent of the runtime index.

## Collision index

**Semantic operation**

```text
src/renderer/WorldRenderer.ts::resolveMovement()
  -> movementCollisionQueryBounds()
  -> runtimeCollisionCandidates()
  -> resolveCircleAgainstAabbs()
```

**Derived candidate index**

```text
src/renderer/runtimeSpatialIndex.ts
src/renderer/runtimePerformance.ts
```

The index narrows candidates only. It must remain equivalent to the independent brute-force oracle.

## Interaction index

**Semantic operation**

```text
src/renderer/WorldRenderer.ts::closestInteraction()
```

**Canonical mutation points**

```text
WorldRenderer.addDroppedItem()
WorldRenderer.removeInteraction()
renderer Cell lifecycle registration/unregistration
```

**Derived index**

```text
src/renderer/runtimePerformance.ts
src/renderer/runtimeSpatialIndex.ts
```

The index does not own interaction eligibility or interaction meaning.

## Dynamic Item index / ticking

**Semantic owner**

```text
src/renderer/WorldRenderer.ts::updateDynamicItems()
```

**Derived ticking membership / diagnostics**

```text
src/renderer/runtimePerformance.ts
```

Item identity, `instanceId`, origin lineage and persistence remain owned by the Item/persistence domain, not the runtime index.

## CV-H1

### Semantic carver / aperture ownership

```text
src/world/gen3.ts
  -> Generation 3 hole/carver decisions and FloorPatchSpec aperture truth
```

### Visible depth policy

```text
src/presentation/level0PresentationPolicy.ts
  -> resolveCvh1DepthPresentation()
```

### Visible depth realization

```text
src/renderer/level0RegionPresentation.ts
src/renderer/level0PresentationMaterials.ts
src/renderer/finalLevel0MaterialPresentation.ts
```

### Gen3 surviving floor construction

```text
src/renderer/cellBuilder.ts
src/renderer/cvh1FloorSurface.ts
```

The indexed floor mesh consumes aperture truth and canonical M-C1 UV/material policy. It does not own carpet treatment.

### Gen2 compatibility

```text
src/renderer/WorldRenderer.ts::replaceLegacyHoleFloor()
```

This branch is frozen compatibility only.

## M-F1 visible panel

**Visible appearance decision**

```text
src/presentation/level0PresentationPolicy.ts
  -> resolveMFluorescentPanelPresentation()
```

**Stable visual identity / dimensions**

```text
src/renderer/fixtureVisualOwnership.ts
  -> M_F1_PANEL_DIMENSIONS
  -> mFluorescentFixtureIdentity()
```

**Gen3 base panel realization**

```text
src/renderer/cellBuilder.ts
```

**Gen2 visual compatibility**

```text
src/renderer/WorldRenderer.ts::replaceLegacyFixtureMeshes()
```

**Steady/flicker visual updates**

```text
src/renderer/fixtureLighting.ts
  -> consumes canonical visible-panel policy
```

M-F1 visible presentation is intentionally distinct from physical lighting runtime.

## M-F1 physical Omni / shadow / flicker runtime

**World fixture/light law**

```text
src/world/lighting.ts
```

**Physical runtime realization and selection**

```text
src/renderer/fixtureLighting.ts
```

This owns the accepted physical-light runtime: Render Distance ceilings, distance-sorted selection, retained selection behavior, one-to-one active/shadowed Omni invariant, flicker and Blackout suppression. Do not move visible-panel material policy into this runtime.

## Blackout

**World/environment decision**

```text
src/world/gen3.ts
src/world/lighting.ts
```

**Active runtime atmosphere / clear / fog / ambient application**

```text
src/renderer/renderSettings.ts
src/renderer/renderSettingsRuntime.ts
```

**Fixture suppression / physical-light participation**

```text
src/renderer/fixtureLighting.ts
```

Blackout world truth is not a material-presentation override and is not authored by Studio.

## Streaming

**Application orchestration**

```text
src/app/ProjectNoclipGame.ts
```

**Scheduler / residency operations**

```text
src/renderer/streamingScheduler.ts
```

Streaming decides load/residency timing, not Cell semantics.

## Visibility

**Application orchestration**

```text
src/app/ProjectNoclipGame.ts
```

**Participation runtime**

```text
src/renderer/visibility/runtime.ts
```

Visibility controls participation of already-owned render state. It must not destroy semantic state or become a second streaming owner.

## Static batching

```text
src/renderer/StaticWorldBatching.ts
```

Batching owns batching only. The renderer lifecycle marks batching dirty after canonical Cell presentation/collision/lights are composed. Batching must not install unrelated lifecycle behavior.

## Level 0 Feature presentation

```text
src/world/gen3.ts
  -> Feature generation / stable world identity

src/presentation/level0FeatureRepresentations.ts
src/presentation/registry.ts
src/presentation/previewOverrides.ts
  -> canonical / Studio-preview representation resolution

src/renderer/level0FeaturePresentation.ts
  -> PAU Feature representation -> PlayCanvas geometry/material adapter

src/renderer/cellBuilder.ts
  -> direct Feature dispatch during Cell construction
```

The removed `pauFeaturePresentationPilot.ts` installer architecture must not return. The remaining helper name `addLevel0PilotFeaturePresentation` is internal to the bounded Feature adapter and does not install runtime behavior; changing it would be local naming cleanup only, not an ownership change. Its module and responsibility are already durable.

## Application orchestration

```text
src/app/ProjectNoclipGame.ts
```

The application explicitly calls narrow runtime operations. It is not extended by semantic prototype installers.

Current operation modules include:

```text
src/renderer/renderSettingsRuntime.ts
src/renderer/streamingScheduler.ts
src/renderer/visibility/runtime.ts
src/renderer/outletInteractionRuntime.ts
```

## Renderer diagnostics

```text
src/renderer/rendererRuntimeDiagnostics.ts
```

This is the one retained call-through wrapper. It wraps engine setup only to attach diagnostics and owns no product semantics. It is permitted because it is isolated instrumentation, not lifecycle or policy authority.

Runtime counters / reconstructible derived state live in:

```text
src/renderer/runtimePerformance.ts
```

## Noclip Studio / privileged development path

```text
npm run studio
  -> tools/studio/runner.mjs
       -> Vite game dev server
       -> Studio authoring server/client

canonical compiled PAU access
  -> tools/studio/canonical-cli.mjs
  -> tools/studio/canonical-client.mjs

Studio UI
  -> tools/studio/client/index.html
  -> tools/studio/client/studio.js
  -> tools/studio/client/styles.css

DEV game bridge
  -> src/dev/studioBridgeClient.ts
  -> src/dev/worldLabStudioIntegration.ts

production boundary check
  -> scripts/check-production-studio-boundary.mjs
```

Studio privileged code is a DEV-only source-backed authoring path. It is not a production runtime path and never becomes a merge/push/deploy client.

World Lab = runtime QA/forcing. Studio = local presentation authoring/assets/diffs/validation.

## Verification / evidence ownership

**Architecture and evidence contract**

```text
docs/VERIFICATION.md
scripts/verification-browser-runner.py
scripts/verification-contract-tests.py
```

**Core Correctness**

```text
.github/workflows/ci.yml
  -> verification architecture contract
  -> presentation/NAL build
  -> Studio static check
  -> strict TypeScript
  -> deterministic/system suite
  -> 10,000-Cell benchmark
  -> production build / Studio production boundary
```

**Feature Acceptance**

```text
.github/workflows/feature-acceptance.yml
  -> gameplay functional journey
  -> Character Creator
  -> Inventory UI
  -> Studio authoring
```

**Visual Regression**

```text
.github/workflows/visual-regression.yml
  -> world
  -> fidelity
  -> wallpaper
  -> CV-H1
  -> flashlight + Blackout uniformity
```

**Renderer / Performance Diagnostics**

```text
.github/workflows/renderer-diagnostics.yml
  -> renderer profile
  -> comparable runtime scenarios
```

All blocking acceptance evidence must be tied to the exact candidate branch-head SHA.

## Permanent architecture / behavior contracts

Durable cleanup-era tests now use contract names rather than implementation-wave names:

```text
tests/level0-cleanup-equivalence.test.mjs
tests/renderer-cell-lifecycle-contract.test.mjs
tests/aa1-ownership-contract.test.mjs
tests/level0-presentation-policy-contract.test.mjs
tests/presentation-runtime-integration-contract.test.mjs
tests/architecture-structural-metrics.test.mjs
tests/runtime-ownership-contract.test.mjs
tests/gen2-compatibility-boundary.test.mjs
tests/aa1-collision-architecture.test.mjs
tests/level0-wallpaper-contract.test.mjs
```

Source-shape assertions are appropriate only where architecture/security/static shape is itself a governed contract. Historical mechanism spelling is not a correctness requirement.

## Stable compatibility surfaces

Do not rename or re-key stable identity/persistence surfaces merely to improve code aesthetics. This includes:

- `gen2`;
- `gen3-v1`;
- CharacterProfileId values/meaning;
- Journey identity and journey-local `characterId` meaning;
- Item `instanceId` and origin lineage;
- Cell IDs / world addresses;
- Gen2 shift components;
- deterministic seed-domain strings;
- stable presentation IDs;
- AssetIds / MaterialIds / RepresentationIds;
- persisted enum/string values;
- evidence-schema keys still consumed by supported tooling.

`run-character-aware-smoke.py` and supported legacy evidence aliases remain until concrete consumer inventory proves removal is safe and the compatibility contract explicitly allows it.
