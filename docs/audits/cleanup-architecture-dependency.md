# Executive Summary

Audit base: `preview/cleanup-governance-baseline` at `741414a0f9606f9fb9af06f85b6c601c275e266b` (`VERSION` `0.3.0-dev.9.8`).

This audit finds that Project Noclip's deterministic world/identity foundations are substantially cleaner than its runtime/presentation composition. Generation 3 topology, stable world identity, explicit Gen2 save compatibility, Character Profile identity, and Item Instance identity have recognizable owners. The main architecture debt is concentrated in the browser runtime: `src/main.ts` installs a stack of prototype mutations whose correctness depends on installer order, `WorldRenderer.loadCell` has become the de facto extension bus for unrelated systems, and several renderer passes create/correct/replace the output of earlier renderer passes instead of consuming one authoritative representation.

The highest-risk ownership conflict is A-A1 collision. `src/world/gen3SpaceTopologyBuild.ts` creates semantic/collision pieces, but `src/renderer/archDividerRuntimeCorrection.ts` removes semantic lower-panel collision and later reconstructs collision from renderer-created `arch-frame:lower-panel:*` entities. That asynchronous reconciliation runs after `src/renderer/runtimePerformance.ts` synchronously indexes a newly loaded Cell, creating a plausible stale-index seam. This is evidence of an architectural hazard; whether it currently produces a player-visible collision defect requires focused behavioral verification before implementation.

The second major cluster is Level 0 presentation. M-C1 carpet, M-A1 Arch finish, M-F1 panel visuals, and CV-H1 depth/floor presentation each pass through multiple owners. `level0SurfacePresentation`, `level0RegionPresentation`, `archDividerRuntimeCorrection`, `fixtureLighting`, and `finalLevel0MaterialPresentation` often mutate the same entities or materials. The final-material layer is an explicit accepted Dev.9.6 mechanism, not accidental by definition, but it has become a downstream convergence/correction stage and should be consolidated only after its current behavior is characterized.

The audit found **23 call-through prototype/lifecycle wrappers** across the runtime/presentation path, plus **6 direct prototype method replacements**. The wrappers are not all wrong: renderer diagnostics is legitimate instrumentation, and visibility/streaming adaptation has valid semantic purpose. The cleanup target is the composition mechanism and duplicate authority, not a blanket ban on hooks.

No product code, tests, governance files, VERSION, package files, workflows, WORLD/VISION, or provenance material were changed by this audit.

# Current Architecture Map

Observed dominant flow:

```text
src/main.ts
  -> installs runtime/presentation mutations in a specific order
  -> ProjectNoclipGame
       -> Journey/save/timeline/input/UI/movement orchestration
       -> renderer-facing engine lifecycle (partly replaced at runtime)
       -> streaming entrypoint (replaced + wrapped)
       -> interaction path (wrapped)
  -> Generation 3 world domain
       fields/gen3
       -> topology domain
       -> topology Cell realization
       -> generator CellDescriptor
  -> WorldRenderer / RendererCellBuilder
       -> base PlayCanvas Cell entities/colliders/interactions
       -> Level 0 presentation wrappers
       -> Region/Arch reconstruction wrappers
       -> fixture runtime wrapper
       -> batching wrapper
       -> performance indexes wrapper/replacements
       -> final material wrapper
  -> Visibility participation
  -> PlayCanvas
```

Canonical intended dependency law from repository governance:

```text
WORLD DOMAIN
    ↓
PRESENTATION DEFINITIONS
    ↓
RUNTIME / RENDERER ADAPTERS
    ↓
PLAYCANVAS
```

The world side mostly follows this direction. The most important inversions are renderer presentation mutating collision truth, runtime/performance modules replacing semantic renderer methods, and renderer modules wrapping application interaction/engine lifecycle.

## Effective installation order

`src/main.ts` currently installs:

1. `installLevel0SurfacePresentation()`
2. `installRenderSettingsRuntime()` (also installs streaming scheduler)
3. `installPauFeaturePresentationPilot()`
4. `installOrdinaryCasingMaterialPresentation()`
5. `installStaticWorldBatching()`, which internally installs, in order:
   1. `installLevel0RegionPresentation()`
   2. `installWallJunctionPresentation()`
   3. `installArchDividerRuntimeCorrection()`
   4. `installFixtureLighting()`
   5. Static batching's own wrappers
6. `installRuntimePerformance()`
7. `installVisibilityParticipationRuntime()`
8. `installFinalLevel0MaterialPresentation()`
9. `installOutletInteractionRuntime()`
10. `installRendererRuntimeDiagnostics()`

Consequently, the effective `WorldRenderer.loadCell` call-through chain is approximately:

```text
final material
  -> runtime performance
    -> static batching
      -> fixture lighting
        -> Arch correction
          -> wall-junction presentation
            -> Level 0 Region presentation
              -> ordinary casing
                -> Level 0 surface presentation
                  -> WorldRenderer.loadCell base
```

Each wrapper then performs post-call behavior while the stack unwinds. Region/Arch work additionally schedules microtasks, so source order and asynchronous order both participate in correctness.

# Semantic Ownership Matrix

| Concept | Expected owner | Actual primary owner(s) | Additional patch/adaptation | Direction / status |
| --- | --- | --- | --- | --- |
| Generation 3 Region selection | `fields.ts` / `gen3.ts` | `fields.ts`, `gen3.ts` | generator projection | Clean; KEEP |
| Generation 3 topology | topology domain/build | `gen3SpaceTopologyDomain.ts`, `gen3SpaceTopologyBuild.ts` | generator clipping/projection | Clean overall; KEEP |
| A-A1 dimensions/topology | world architecture/topology | `gen3ArchitectureCore.ts`, `gen3SpaceTopologyBuild.ts` | `level0RegionPresentation`, `archDividerRuntimeCorrection` | Mixed: presentation valid, collision ownership not clean |
| Region floor appearance / M-C1 | PAU presentation definition + one resolved renderer material owner | `level0SurfacePresentation` + `level0RegionPresentation` + `finalLevel0MaterialPresentation` | CV-H1 floor reconstruction | Duplicate authority; CONSOLIDATE |
| M-W1 wallpaper | PAU material definition + wallpaper rules/presentation | `ordinaryWallpaperRules.ts`, `ordinaryWallpaperPresentation.ts` | base/fallback wall material in `cellBuilder` and `level0SurfacePresentation` | Mostly clean final owner, but redundant fallback stages |
| Ordinary casing eligibility | code rule owner | `ordinaryWallpaperRules.ts` | `ordinaryCasingMaterialPresentation.ts` | Clean semantic rule; wrapper mechanism CLEAN |
| CV-H1 aperture | world Carver | `gen3.ts` / generated `FloorPatchSpec` | renderer floor mesh | Clean semantic owner; KEEP |
| CV-H1 surrounding carpet | Region/M-C1 | base Cell material + final M-C1 resolver | Region pass / CV-H1 mesh inheritance | Duplicate application; CONSOLIDATE |
| CV-H1 depth appearance | PAU presentation definition | `level0RegionPresentation` then `finalLevel0MaterialPresentation` | `WorldRenderer` first creates recessed fallback depth | Create/replace/correct chain; CONSOLIDATE |
| M-F1 fixture generation/flicker | world lighting | `world/lighting.ts` | fixture runtime | Clean world identity |
| M-F1 visible panel | presentation owner | base `cellBuilder` + `WorldRenderer.replaceFixtureMeshes` + `level0SurfacePresentation` + `fixtureLighting` | final per-frame material updates in fixture runtime | Strong duplicate ownership; CONSOLIDATE |
| M-F1 physical Omni/shadows | fixture runtime | `fixtureLighting.ts` | render-distance/visibility scope | Reasonable runtime owner; KEEP semantics |
| Collision query semantics | physics/runtime collision owner | base `WorldRenderer.resolveMovement` + replacement in `runtimePerformance.ts` | presentation removes/adds colliders | Duplicate/inverted; CONSOLIDATE |
| Interaction lookup | runtime interaction owner | base `WorldRenderer.closestInteraction` + performance replacement | outlet special-case wraps game interaction | Duplicate; CONSOLIDATE |
| Streaming residency | runtime streaming | `streamingScheduler.ts` / render settings runtime | visibility wraps `updateStreaming` | Semantics clear, lifecycle coupling fragile |
| Visibility participation | visibility runtime | `renderer/visibility/**` | wraps scheduler/game lifecycle | Semantics clear; CLEAN composition |
| Static batching | renderer performance adapter | `StaticWorldBatching.ts` | also installs Region/Arch/fixture systems | Ownership scope too broad; CLEAN |
| Render settings / atmosphere | renderer settings/runtime | `renderSettingsRuntime.ts` | replaces app lifecycle methods | Semantic function valid; integration CONSOLIDATE |
| Item Definition | item definition registry | `items/definitions.ts` | UI reads presentation metadata | Clean; KEEP |
| Item Instance identity | item domain | `items/types.ts`, `items/factory.ts`, persistence | inventory/runtime adapters | Clean; KEEP |
| Character Profile identity | player-character domain | `player-character/profile.ts`, `profileStore.ts` | new-game flow | Clean; KEEP |
| Journey persistence | persistence | `persistence/types.ts`, `store.ts` | app adapter | Clean boundary; KEEP |
| Gen2 compatibility | persistence + legacy generator boundary | `persistence/types.ts`, generator legacy path | renderer carries generation metadata | Explicit compatibility; LEGACY |
| Studio canonical state | PAU/NAL sources, local Studio | structured definitions + Studio | DEV-only bridge imports | Clean boundary overall; KEEP |
| World Lab object showcase | development tooling | `WorldRenderer` plus object-catalog registration | UI/dev tooling | Production renderer pressure; CLEAN |
| Verification semantics | product owners, observed by tests | mostly product owners | several source-string tests assert implementation/order | Risk of tests becoming owner; CLEAN |

# Patch / Wrapper Inventory

The count below includes call-through wrappers that capture an existing method and invoke it. It does not count newly added prototype methods/getters, nor the six direct method replacements listed afterward.

| Patch ID / file | Method wrapped | Effective install order | Purpose | Same-method chain / order dependency | Classification |
| --- | --- | ---: | --- | --- | --- |
| P-01 `level0SurfacePresentation.ts` | `WorldRenderer.loadCell` | 1 | Apply Gen3 surfaces/materials and collision filtering | Inner layer of nine `loadCell` wrappers | CONSOLIDATE |
| P-02 `streamingScheduler.ts` | `ProjectNoclipGame.update` | 2a | Budget streaming jobs after frame update | Later wrapped again by visibility | CLEAN |
| P-03 `pauFeaturePresentationPilot.ts` | `RendererCellBuilder.addPropGeometry` | 3 | Intercept Bucket/Paint Can PAU pilot before legacy builder | Depends on legacy fallback path | CONSOLIDATE |
| P-04 `ordinaryCasingMaterialPresentation.ts` | `WorldRenderer.loadCell` | 4 | Add casing after base surface exists | Same `loadCell` chain | CLEAN |
| P-05 `level0RegionPresentation.ts` | `WorldRenderer.loadCell` | 5.1 | Region carpet/Hole/Arch post-build work | Same chain; queues Arch reconstruction | CONSOLIDATE |
| P-06 `level0RegionPresentation.ts` | `WorldRenderer.unloadCell` | 5.1 | Reconstruct neighboring Arch presentation | Same unload chain; async | CLEAN |
| P-07 `wallJunctionPresentation.ts` | `WorldRenderer.loadCell` | 5.2 | Visual T-junction cleanup | Same load chain; expects existing wall entities | CLEAN |
| P-08 `archDividerRuntimeCorrection.ts` | `WorldRenderer.loadCell` | 5.3 | Arch material/collision correction | Same load chain; queues collision reconciliation | CONSOLIDATE |
| P-09 `archDividerRuntimeCorrection.ts` | `WorldRenderer.unloadCell` | 5.3 | Reconcile neighboring visible lower-panel collision | Same unload chain; async | CONSOLIDATE |
| P-10 `fixtureLighting.ts` | `WorldRenderer.loadCell` | 5.4 | Reconcile panels and attach real Omnis | Same load chain; depends on prior panel entities | CONSOLIDATE |
| P-11 `fixtureLighting.ts` | `WorldRenderer.unloadCell` | 5.4 | Detach fixture runtime | Same unload chain | CLEAN |
| P-12 `StaticWorldBatching.ts` | `WorldRenderer.loadCell` | 5.5 | Mark Cell batch state dirty | Same load chain | CLEAN |
| P-13 `StaticWorldBatching.ts` | `WorldRenderer.unloadCell` | 5.5 | Mark Cell batch state dirty | Same unload chain | CLEAN |
| P-14 `runtimePerformance.ts` | `WorldRenderer.loadCell` | 6 | Populate derived spatial indexes | Same load chain; timing-sensitive relative to async corrections | CONSOLIDATE |
| P-15 `runtimePerformance.ts` | `WorldRenderer.unloadCell` | 6 | Remove derived index entries | Same unload chain | CONSOLIDATE |
| P-16 `runtimePerformance.ts` | `WorldRenderer.removeInteraction` | 6 | Keep interaction index synchronized | Depends on mutation path coverage | CONSOLIDATE |
| P-17 `runtimePerformance.ts` | `WorldRenderer.addDroppedItem` | 6 | Keep interaction/dynamic-item index synchronized | Depends on mutation path coverage | CONSOLIDATE |
| P-18 `visibility/runtime.ts` | `ProjectNoclipGame.updateStreaming` | 7 | Recompute participation after residency changes | Must wrap scheduler-backed streaming entrypoint | CLEAN |
| P-19 `visibility/runtime.ts` | `ProjectNoclipGame.update` | 7 | Update participation each frame | Wraps the already wrapped streaming update | CLEAN |
| P-20 `finalLevel0MaterialPresentation.ts` | `WorldRenderer.loadCell` | 8 | Converge final PAU materials after reconstructed geometry | Outermost load wrapper; double-microtask convergence | CONSOLIDATE |
| P-21 `outletInteractionRuntime.ts` | `ProjectNoclipGame.updateInteraction` | 9 | Override outlet interaction prompt | Renderer module modifies app/game interaction | CONSOLIDATE |
| P-22 `outletInteractionRuntime.ts` | `ProjectNoclipGame.interact` | 9 | Handle outlet observation | Renderer module modifies app/game interaction | CONSOLIDATE |
| P-23 `rendererRuntimeDiagnostics.ts` | `ProjectNoclipGame.setupEngine` | 10 | Attach context-loss/performance diagnostics after engine setup | Must run after render-settings replacement | KEEP |

## Direct prototype replacements / additions

These are not counted in the 23 call-through wrappers:

- `renderSettingsRuntime.ts` replaces `ProjectNoclipGame.setupEngine`, `updateStreaming`, and `refreshLightField` (3 replacements), then installs the streaming wrapper.
- `runtimePerformance.ts` replaces `WorldRenderer.resolveMovement`, `closestInteraction`, and `updateDynamicItems` (3 replacements).
- `fixtureLighting.ts` adds `updateFixtureLighting` plus three prototype getters for light counts.

The six replacements are architecture-relevant because the original implementations remain in the classes while the installed runtime uses different implementations.

# Correction-Layer Inventory

| Layer | Evidence-based role | Assessment |
| --- | --- | --- |
| `WorldRenderer` base Cell construction | Creates generic floor/ceiling/walls, fallback fixture meshes, Hole fallback geometry and colliders | Legitimate base/legacy adapter, but Gen3 creates several objects later replaced |
| `level0SurfacePresentation.ts` | Applies modern Level 0 surfaces and also removes selected colliders | Material role legitimate; collision mutation is downstream correction |
| `ordinaryWallpaperPresentation.ts` | Replaces/splits visible wall entities and adds outlets while preserving semantic wall descriptor | Legitimate presentation specialization, though outlet gameplay handling is elsewhere |
| `level0RegionPresentation.ts` | Applies Region carpet tint, replaces Hole depth, reconstructs A-A1 visible frames | Multiple legitimate concerns; high-pressure module and correction stage |
| `wallJunctionPresentation.ts` | Adjusts only visible T-junction wall boxes, descriptors/collision untouched | Legitimate presentation correction; KEEP behavior |
| `archDividerRuntimeCorrection.ts` | Re-materializes semantic Arch pieces, removes semantic colliders, then recreates lower-panel colliders from visible Arch entities | Historical corrective layer now owning gameplay collision; high-priority consolidation |
| `fixtureLighting.ts` panel reconciliation | Finds legacy/base panel objects, renames/destroys/recreates them before attaching real lights | Migration/correction behavior now permanent; duplicate visible-panel authority |
| `finalLevel0MaterialPresentation.ts` | Re-applies M-A1, M-C1 and Hole materials after all earlier creation/reconstruction, with double microtask after Arch rebuild | Explicit accepted final owner, but functionally a convergence/correction layer |
| `pauFeaturePresentationPilot.ts` | Intercepts only pilot Feature kinds before legacy builder | Explicit migration bridge; no longer desirable as permanent prototype architecture |
| `renderSettingsRuntime.ts` | Replaces application engine/streaming/light-field methods without removing old class implementations | Permanent runtime replacement layer; consolidate ownership, not behavior |
| `runtimePerformance.ts` | Replaces global-scan semantic methods with indexed equivalents and mirrors mutation lifecycle | Valid optimization, but parallel authority must be collapsed |
| `rendererRuntimeDiagnostics.ts` | Wraps engine setup for observation only | Legitimate instrumentation; KEEP, preferably via explicit hook later |

# Dependency-Direction Findings

## ARCH-001

**ID:** ARCH-001  
**AREA:** Application / entrypoint / global initialization  
**CURRENT STATE:** `src/main.ts` is an ordered installer script. Several installers wrap methods installed by earlier installers, and `StaticWorldBatching` is itself an installer-of-installers for unrelated Region/Arch/fixture behavior.  
**EVIDENCE:** `src/main.ts`; `src/renderer/StaticWorldBatching.ts`; patch inventory P-01..P-23.  
**SEMANTIC OWNER TODAY:** Distributed among installer modules; effective behavior is partly owned by call order.  
**EXPECTED OWNER:** Each subsystem owns its behavior; one explicit composition point owns lifecycle ordering.  
**CLASSIFICATION:** CONSOLIDATE  
**WHY:** Current order is executable architecture rather than merely startup wiring. Reordering imports/install calls can change semantics.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** HIGH if consolidation changes order accidentally.  
**PERFORMANCE RISK:** MEDIUM; lifecycle timing affects batching/indexing/visibility.  
**CONFLICT SURFACE:** Renderer Cell lifecycle, streaming, visibility, Arch reconstruction, fixtures, diagnostics.  
**RECOMMENDED FUTURE ACTION:** Replace prototype-chain composition with one explicit lifecycle composition seam while preserving the current sequence first; only then collapse duplicate stages. Do not introduce a general framework.  
**USER DECISION REQUIRED?** NO

## ARCH-002

**ID:** ARCH-002  
**AREA:** Renderer / Cell lifecycle  
**CURRENT STATE:** `WorldRenderer.loadCell` is wrapped nine times and `unloadCell` five times. It functions as a global extension bus for surfaces, casing, Region presentation, wall joins, Arch correction, fixtures, batching, performance indexing, and final materials.  
**EVIDENCE:** `level0SurfacePresentation.ts`, `ordinaryCasingMaterialPresentation.ts`, `level0RegionPresentation.ts`, `wallJunctionPresentation.ts`, `archDividerRuntimeCorrection.ts`, `fixtureLighting.ts`, `StaticWorldBatching.ts`, `runtimePerformance.ts`, `finalLevel0MaterialPresentation.ts`.  
**SEMANTIC OWNER TODAY:** Base lifecycle in `WorldRenderer`, post-build lifecycle implicitly shared by all wrappers.  
**EXPECTED OWNER:** `WorldRenderer`/a narrow renderer composition owner with explicit post-build/unload stages.  
**CLASSIFICATION:** CONSOLIDATE  
**WHY:** The mechanism obscures which representation is final and makes local changes reason about the full chain.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** HIGH  
**PERFORMANCE RISK:** HIGH  
**CONFLICT SURFACE:** All streamed Cell construction/destruction.  
**RECOMMENDED FUTURE ACTION:** First express the existing sequence explicitly with no semantic changes. Then remove redundant stages one owner at a time.  
**USER DECISION REQUIRED?** NO

## ARCH-003

**ID:** ARCH-003  
**AREA:** A-A1 collision / runtime performance  
**CURRENT STATE:** World topology emits semantic lower/header/pier walls. The Arch correction removes lower-panel semantic colliders, waits for renderer reconstruction, then creates `arch-visible-lower-collider:*` bounds from the position/scale of `arch-frame:lower-panel:*` PlayCanvas entities. Runtime performance indexes a Cell's current `visual.colliders` synchronously during its `loadCell` wrapper.  
**EVIDENCE:** `src/world/gen3SpaceTopologyBuild.ts`; `src/renderer/archDividerRuntimeCorrection.ts`; `src/renderer/runtimePerformance.ts`. The correction test explicitly asserts the microtask-based collider reconciliation and installer order.  
**SEMANTIC OWNER TODAY:** Split between world semantic walls, renderer-visible geometry, `renderer.walls`, and the performance spatial index.  
**EXPECTED OWNER:** World/runtime collision geometry independent of presentation entities; performance index derives from that runtime collision owner.  
**CLASSIFICATION:** CLEAN  
**WHY:** Renderer state currently defines gameplay collision after world generation. There is also a plausible timing gap: a collider added in the Arch microtask is not obviously added to the already-created performance index. This timing gap is an audit inference and must be behaviorally verified.  
**BEHAVIOR CHANGE REQUIRED?** UNKNOWN  
**COMPATIBILITY RISK:** HIGH  
**PERFORMANCE RISK:** HIGH  
**CONFLICT SURFACE:** A-A1 lower panels, movement collision, streaming across Arch Cells, performance index.  
**RECOMMENDED FUTURE ACTION:** Before refactoring, add focused runtime evidence proving visible lower-panel collision and index synchronization after load/reconstruction. Then move final collision bounds to a presentation-independent owner and let both renderer and index consume them.  
**USER DECISION REQUIRED?** NO unless preserving current behavior proves impossible because current behavior is defective/ambiguous.

## ARCH-004

**ID:** ARCH-004  
**AREA:** Level 0 surface presentation / collision  
**CURRENT STATE:** `level0SurfacePresentation.ts` is named/purposed as presentation but filters `visual.colliders` and deletes entries from `renderer.walls` according to `shouldGen3WallCollide`.  
**EVIDENCE:** `applyGen3SurfacePresentation()` in `src/renderer/level0SurfacePresentation.ts`; PAU contract states material edits cannot alter collision.  
**SEMANTIC OWNER TODAY:** Presentation layer partially owns collision cleanup.  
**EXPECTED OWNER:** World/runtime collision policy; presentation consumes it.  
**CLASSIFICATION:** CLEAN  
**WHY:** This is a direct violation of the preferred dependency direction and PAU's visual/collision separation.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** HIGH  
**PERFORMANCE RISK:** MEDIUM  
**CONFLICT SURFACE:** Gen3 walls, A-A1, movement/raycast indexes.  
**RECOMMENDED FUTURE ACTION:** Move collision eligibility out of the surface material pass while retaining identical resulting collider sets.  
**USER DECISION REQUIRED?** NO

## ARCH-005

**ID:** ARCH-005  
**AREA:** M-C1 carpet / CV-H1 floor presentation  
**CURRENT STATE:** Carpet appearance is established in `level0SurfacePresentation`, modified in `level0RegionPresentation`, inherited during `WorldRenderer.replaceHoleFloor`, and then canonically re-resolved/reapplied in `finalLevel0MaterialPresentation`.  
**EVIDENCE:** `floorMaterial()` in `level0SurfacePresentation.ts`; `applyCarpetPresentation()`/Region load path in `level0RegionPresentation.ts`; Gen3 material inheritance in `WorldRenderer.replaceHoleFloor`; `resolveCanonicalLevel0CarpetPresentation()` in `finalLevel0MaterialPresentation.ts`.  
**SEMANTIC OWNER TODAY:** Multiple renderer stages; final material module claims final truth.  
**EXPECTED OWNER:** One M-C1 presentation resolver plus geometry-specific UV application.  
**CLASSIFICATION:** CONSOLIDATE  
**WHY:** The same Region/material decision is encoded repeatedly, including duplicated tint/gloss fallbacks.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** MEDIUM  
**PERFORMANCE RISK:** MEDIUM; avoid creating extra material/texture churn.  
**CONFLICT SURFACE:** Ordinary/Pillar/Arch carpet, CV-H1 cut floor, Studio M-C1 preview.  
**RECOMMENDED FUTURE ACTION:** Preserve `resolveCanonicalLevel0CarpetPresentation`-equivalent semantics as the single material decision and have full-floor/CV-H1 geometry consume it once.  
**USER DECISION REQUIRED?** NO

## ARCH-006

**ID:** ARCH-006  
**AREA:** M-A1 Arch finish  
**CURRENT STATE:** Arch structural colors/gloss are independently resolved in `level0SurfacePresentation`, `archDividerRuntimeCorrection`, and `finalLevel0MaterialPresentation`, while reconstructed frames are created in `level0RegionPresentation`.  
**EVIDENCE:** repeated `material.arch-pale-wallpaper` lookups and fallback values in those modules; PAU names M-A1 as the finish owner.  
**SEMANTIC OWNER TODAY:** Final PAU module is intended final owner, but earlier modules still encode the same policy.  
**EXPECTED OWNER:** M-A1 presentation definition/resolver; geometry creators request the resolved finish.  
**CLASSIFICATION:** CONSOLIDATE  
**WHY:** Duplicate values currently agree but constitute duplicate authority and correction-on-correction.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** MEDIUM  
**PERFORMANCE RISK:** LOW to MEDIUM  
**CONFLICT SURFACE:** A-A1 semantic walls, reconstructed frames, Studio M-A1 preview.  
**RECOMMENDED FUTURE ACTION:** Retain one resolver and remove hard-coded/duplicate Arch material fallback ownership from correction/geometry stages.  
**USER DECISION REQUIRED?** NO

## ARCH-007

**ID:** ARCH-007  
**AREA:** M-F1 visible panel / physical fixture ownership  
**CURRENT STATE:** `RendererCellBuilder` creates generic `fixture:*` panels; `WorldRenderer.replaceFixtureMeshes` destroys/recreates them from `LightGroupSpec`; `level0SurfacePresentation` assigns panel material; `fixtureLighting` locates/renames/destroys/creates panels again and updates their material each frame while also owning physical Omnis.  
**EVIDENCE:** `cellBuilder.ts`; `WorldRenderer.replaceFixtureMeshes`; `level0SurfacePresentation.ts`; `fixtureLighting.ts`; `fixture-lighting-architecture.test.mjs` explicitly tests the reconciliation bridge.  
**SEMANTIC OWNER TODAY:** Visible panel split across builder/surface/fixture runtime; physical light in fixture runtime.  
**EXPECTED OWNER:** One visible M-F1 presentation owner; fixture runtime owns only physical light allocation/flicker/shadows and references the canonical panel.  
**CLASSIFICATION:** CONSOLIDATE  
**WHY:** A migration bridge has become normal runtime behavior.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** MEDIUM, especially Gen2 fixture presentation.  
**PERFORMANCE RISK:** MEDIUM; panel recreation/material writes are hot-path adjacent.  
**CONFLICT SURFACE:** Gen2/Gen3 fixture visuals, batching exclusions, Blackout, Studio M-F1 preview.  
**RECOMMENDED FUTURE ACTION:** Establish one stable panel entity creation path keyed to fixture identity, then let fixture runtime bind physical light state without destructive visual reconciliation.  
**USER DECISION REQUIRED?** NO

## ARCH-008

**ID:** ARCH-008  
**AREA:** CV-H1 Hole renderer construction  
**CURRENT STATE:** Base builder creates a simple Hole void; `WorldRenderer.replaceHoleFloor` destroys floor/pieces and creates a cut mesh plus recessed side/depth fallback; Region presentation then replaces Hole depth with presentation-specific bands/occluder; final material pass re-materializes those bands.  
**EVIDENCE:** `cellBuilder.ts`, `WorldRenderer.ts`, `level0RegionPresentation.ts`, `finalLevel0MaterialPresentation.ts`.  
**SEMANTIC OWNER TODAY:** Aperture is world-owned; visible depth/floor are a three-stage renderer correction chain.  
**EXPECTED OWNER:** World owns aperture; one renderer geometry adapter owns the final cut floor/depth geometry; PAU material owner supplies materials.  
**CLASSIFICATION:** CONSOLIDATE  
**WHY:** Gen3 constructs visible fallback geometry chiefly to replace it moments later.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** MEDIUM; Gen2 fallback must remain isolated.  
**PERFORMANCE RISK:** MEDIUM due entity churn at Cell load.  
**CONFLICT SURFACE:** CV-H1 floor mesh, depth bands, materials, Gen2 Hole compatibility.  
**RECOMMENDED FUTURE ACTION:** Separate Gen2 fallback from Gen3 canonical construction and build the Gen3 final geometry once.  
**USER DECISION REQUIRED?** NO

## ARCH-009

**ID:** ARCH-009  
**AREA:** Application engine lifecycle / render settings  
**CURRENT STATE:** `ProjectNoclipGame` contains implementations of `setupEngine`, `updateStreaming`, and `refreshLightField`, but `renderSettingsRuntime.ts` replaces all three on the prototype before a game instance is created.  
**EVIDENCE:** `ProjectNoclipGame.ts`; `installRenderSettingsRuntime()` in `renderSettingsRuntime.ts`.  
**SEMANTIC OWNER TODAY:** Source class and renderer runtime both appear authoritative; installed renderer runtime wins.  
**EXPECTED OWNER:** One application/runtime owner with render-settings services injected/called explicitly.  
**CLASSIFICATION:** CONSOLIDATE  
**WHY:** Dead-at-runtime original methods are misleading and make ownership/search/navigation unreliable.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** HIGH  
**PERFORMANCE RISK:** MEDIUM  
**CONFLICT SURFACE:** PlayCanvas setup, atmosphere, streaming, Blackout, renderer diagnostics.  
**RECOMMENDED FUTURE ACTION:** Move the accepted installed behavior into the authoritative lifecycle owner (or explicit narrow collaborators) and remove duplicate original implementations only after parity tests.  
**USER DECISION REQUIRED?** NO

## ARCH-010

**ID:** ARCH-010  
**AREA:** Streaming + visibility  
**CURRENT STATE:** `installStreamingScheduler` wraps `ProjectNoclipGame.update`; visibility later wraps that already-wrapped `update` and the renderer-runtime replacement of `updateStreaming`. Visibility correctness therefore assumes scheduler installation happened first.  
**EVIDENCE:** `renderSettingsRuntime.ts` installs scheduler; `streamingScheduler.ts`; `visibility/runtime.ts`; `src/main.ts` order.  
**SEMANTIC OWNER TODAY:** Residency belongs to streaming; participation belongs to visibility; composition belongs to installer order.  
**EXPECTED OWNER:** Same semantic split, but explicit sequencing at one runtime composition point.  
**CLASSIFICATION:** CLEAN  
**WHY:** The conceptual architecture is correct; the hook mechanism is fragile.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** MEDIUM  
**PERFORMANCE RISK:** HIGH because update frequency/order affects traversal.  
**CONFLICT SURFACE:** traversal, visibility invalidation, retained/resident/participating Cell semantics.  
**RECOMMENDED FUTURE ACTION:** Preserve `streaming residency -> visibility participation` ordering explicitly; do not merge the concepts.  
**USER DECISION REQUIRED?** NO

## ARCH-011

**ID:** ARCH-011  
**AREA:** Runtime performance / collision / interaction / dynamic Items  
**CURRENT STATE:** `runtimePerformance.ts` mirrors load/unload/interaction mutation into derived indexes, then directly replaces three `WorldRenderer` semantic methods with indexed equivalents. Base global-scan methods remain in `WorldRenderer`.  
**EVIDENCE:** `runtimePerformance.ts`; base methods in `WorldRenderer.ts`.  
**SEMANTIC OWNER TODAY:** Two implementations per operation; installed performance implementation wins.  
**EXPECTED OWNER:** One semantic operation with an internal/indexed data source that is explicitly maintained.  
**CLASSIFICATION:** CONSOLIDATE  
**WHY:** Performance should optimize an owner, not become a second behavioral owner. Mutation-path interception can miss out-of-band changes, as the Arch async collider seam illustrates.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** HIGH  
**PERFORMANCE RISK:** HIGH  
**CONFLICT SURFACE:** movement, interaction targeting, dynamic glow sticks, Cell lifecycle, renderer walls/interactions.  
**RECOMMENDED FUTURE ACTION:** Make spatial indexes first-class derived state inside the authoritative runtime owner and keep semantic algorithms single-sourced.  
**USER DECISION REQUIRED?** NO

## ARCH-012

**ID:** ARCH-012  
**AREA:** PAU Feature presentation pilot  
**CURRENT STATE:** `pauFeaturePresentationPilot.ts` still monkey-patches `RendererCellBuilder.addPropGeometry` to intercept only the two PAU pilot Features, falling back to the legacy builder for everything else.  
**EVIDENCE:** explicit “narrow PAU Run 1 migration bridge” comment and method wrapper in that file; structured PAU definitions are now canonical per presentation architecture/Studio docs.  
**SEMANTIC OWNER TODAY:** PAU Feature presentation plus legacy builder interception.  
**EXPECTED OWNER:** Builder dispatch consumes the canonical Representation pipeline explicitly.  
**CLASSIFICATION:** CONSOLIDATE  
**WHY:** The bridge was intentionally temporary/migratory and now survives beside a mature PAU registry.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** LOW to MEDIUM  
**PERFORMANCE RISK:** LOW  
**CONFLICT SURFACE:** Bucket/Paint Can visual presentation, future PAU Feature migrations.  
**RECOMMENDED FUTURE ACTION:** Fold pilot dispatch into the normal representation-aware prop presentation path; retain legacy behavior for non-PAU props without prototype mutation.  
**USER DECISION REQUIRED?** NO

## ARCH-013

**ID:** ARCH-013  
**AREA:** Outlet interaction  
**CURRENT STATE:** Outlet visual/interaction instances are created by wallpaper presentation, while `outletInteractionRuntime.ts` (under `renderer/`) wraps `ProjectNoclipGame.updateInteraction` and `interact` to own prompt/gameplay response.  
**EVIDENCE:** `ordinaryWallpaperPresentation.ts`; `outletInteractionRuntime.ts`.  
**SEMANTIC OWNER TODAY:** Renderer presentation produces interaction target; renderer runtime owns app interaction special case.  
**EXPECTED OWNER:** Presentation may expose a stable interaction target; application/interaction domain owns behavior.  
**CLASSIFICATION:** CONSOLIDATE  
**WHY:** Renderer-to-application dependency direction is inverted and each new special interaction would encourage another wrapper.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** LOW  
**PERFORMANCE RISK:** LOW  
**CONFLICT SURFACE:** interaction prompt/action routing.  
**RECOMMENDED FUTURE ACTION:** Move outlet behavior into the existing interaction dispatch owner while preserving the same `kind: 'outlet'` target and response.  
**USER DECISION REQUIRED?** NO

## ARCH-014

**ID:** ARCH-014  
**AREA:** Verification architecture  
**CURRENT STATE:** Several tests inspect TypeScript source text and assert exact implementation details/installer order rather than only observable contracts. `arch-divider-runtime-correction.test.mjs` explicitly asserts `queueMicrotask`, renderer-wall mutations, fallback material code, and that Region -> correction -> fixture installers occur in a fixed source order. `fixture-lighting-architecture.test.mjs` similarly asserts implementation strings.  
**EVIDENCE:** those tests; `docs/VERIFICATION.md` states verification observes product/runtime ownership and must not redefine it.  
**SEMANTIC OWNER TODAY:** Product code formally owns behavior, but some tests freeze historical implementation form.  
**EXPECTED OWNER:** Product contracts/owners; tests observe behavior/invariants. Source-shape tests only for intentional static/security boundaries.  
**CLASSIFICATION:** CLEAN  
**WHY:** Cleanup can be blocked by tests that canonize the very patch chain being removed, allowing tests to become accidental architecture owners.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** MEDIUM; replacing tests can reduce coverage if behavioral equivalents are not added first.  
**PERFORMANCE RISK:** NONE  
**CONFLICT SURFACE:** A-A1, M-F1, render settings, presentation architecture.  
**RECOMMENDED FUTURE ACTION:** For each cleanup seam, first add/retain behavioral contract tests, then retire source-string assertions that only enforce historical mechanism. Keep source scanning where the source shape itself is the contract (for example production Studio security boundaries).  
**USER DECISION REQUIRED?** NO

## ARCH-015

**ID:** ARCH-015  
**AREA:** Static batching ownership  
**CURRENT STATE:** `installStaticWorldBatching()` installs Region presentation, wall-junction presentation, Arch correction, and fixture lighting before installing batching.  
**EVIDENCE:** `src/renderer/StaticWorldBatching.ts`.  
**SEMANTIC OWNER TODAY:** Static batching owns startup ordering for four unrelated renderer concerns.  
**EXPECTED OWNER:** Static batching owns batching only; renderer composition owns installation.  
**CLASSIFICATION:** CLEAN  
**WHY:** Removing/disabling batching would unexpectedly suppress required presentation/lighting installation.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** MEDIUM  
**PERFORMANCE RISK:** MEDIUM  
**CONFLICT SURFACE:** Level 0 presentation, fixtures, batching.  
**RECOMMENDED FUTURE ACTION:** Hoist those installer calls to the explicit renderer composition point without changing their relative order as the first mechanical cleanup.  
**USER DECISION REQUIRED?** NO

## ARCH-016

**ID:** ARCH-016  
**AREA:** `ProjectNoclipGame` module pressure  
**CURRENT STATE:** The class coordinates persistence, New Game/Journey state, input, movement, simulation, Item actions, UI, World Lab locating/teleport, PlayCanvas setup, light/Blackout atmosphere, streaming, Region notifications, interactions, marks and periodic saves. Some of those methods are then replaced/wrapped externally.  
**EVIDENCE:** `src/app/ProjectNoclipGame.ts` and external runtime installers.  
**SEMANTIC OWNER TODAY:** Application class is the integration root plus several domain implementations.  
**EXPECTED OWNER:** Application remains orchestration root; distinct world/render/runtime domains retain their own logic behind narrow calls.  
**CLASSIFICATION:** CLEAN  
**WHY:** High fan-out and externally replaced private lifecycle methods make the class a pressure point. Splitting everything would be abstraction theater; the valuable seams are lifecycle/rendering, streaming, and interaction dispatch already evidenced by external patches.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** HIGH  
**PERFORMANCE RISK:** MEDIUM  
**CONFLICT SURFACE:** nearly all runtime systems.  
**RECOMMENDED FUTURE ACTION:** Extract only seams already proven by duplicate/external ownership. Do not split movement/simulation merely for file size.  
**USER DECISION REQUIRED?** NO

## ARCH-017

**ID:** ARCH-017  
**AREA:** `WorldRenderer` module pressure  
**CURRENT STATE:** `WorldRenderer` owns PlayCanvas caches, Cell construction/lifecycle, wall/interaction maps, CV-H1 mesh replacement, fixture replacement, collision/raycast/interaction queries, dynamic Item visuals, marks, and a World Lab object showcase host. Multiple installed modules then replace/wrap its methods.  
**EVIDENCE:** `src/renderer/WorldRenderer.ts`; `runtimePerformance.ts`; presentation wrappers.  
**SEMANTIC OWNER TODAY:** Renderer is both facade and implementation owner for many unrelated renderer/runtime/dev concerns.  
**EXPECTED OWNER:** Renderer remains the facade for rendered Cells; collision/query/index and dev showcase behavior need clear subordinate owners.  
**CLASSIFICATION:** CLEAN  
**WHY:** Responsibility breadth plus patch fan-in is the problem, not raw size. The lab showcase is especially development-oriented pressure inside the production renderer.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** HIGH  
**PERFORMANCE RISK:** HIGH  
**CONFLICT SURFACE:** Cell construction, collision, interactions, Items, marks, World Lab.  
**RECOMMENDED FUTURE ACTION:** Split only along evidenced ownership seams after lifecycle consolidation; keep a small renderer facade if that reduces caller churn.  
**USER DECISION REQUIRED?** NO

## ARCH-018

**ID:** ARCH-018  
**AREA:** Generation 3 world domain  
**CURRENT STATE:** Continuous Fields/Region influence feed topology-domain construction, topology Cell realization, and finally `CellDescriptor` generation. Cells remain clipping/cache units. Shared A-A1/P-A1 dimensions and route reservations are world-owned.  
**EVIDENCE:** `WORLD.md`; `gen3.ts`; `gen3SpaceTopologyDomain.ts`; `gen3SpaceTopologyBuild.ts`; `generator.ts`.  
**SEMANTIC OWNER TODAY:** World domain.  
**EXPECTED OWNER:** World domain.  
**CLASSIFICATION:** KEEP  
**WHY:** The dependency direction is coherent and matches the Generation 3 law. Renderer correction debt should not be “fixed” by moving presentation decisions back into generation.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** HIGH if unnecessarily disturbed.  
**PERFORMANCE RISK:** HIGH if unnecessarily disturbed.  
**CONFLICT SURFACE:** entire deterministic world.  
**RECOMMENDED FUTURE ACTION:** Treat world topology/data contracts as the stable upstream boundary; change only where a concrete renderer/runtime ownership defect proves missing world/runtime data.  
**USER DECISION REQUIRED?** NO

## ARCH-019

**ID:** ARCH-019  
**AREA:** Gen2 compatibility  
**CURRENT STATE:** Save migration maps pre-versioned/other supported legacy saves to `gen2`; generator keeps an explicit legacy path; Generation 3 new journeys are separate.  
**EVIDENCE:** `persistence/types.ts`; `generator.ts`; ADR 0001; WORLD/VISION.  
**SEMANTIC OWNER TODAY:** Persistence generation version + legacy generator boundary.  
**EXPECTED OWNER:** Same until retention policy changes.  
**CLASSIFICATION:** LEGACY  
**WHY:** This is intentional compatibility debt, not stale code eligible for routine cleanup.  
**BEHAVIOR CHANGE REQUIRED?** YES if removed.  
**COMPATIBILITY RISK:** CRITICAL  
**PERFORMANCE RISK:** LOW for keeping it.  
**CONFLICT SURFACE:** old saves, marks, dropped Items, spatial memory, routes.  
**RECOMMENDED FUTURE ACTION:** Keep frozen and isolate more clearly where cleanup touches shared renderer paths. Delete only under an explicit save-retention/export decision and dedicated verification.  
**USER DECISION REQUIRED?** YES for any deletion/expiry policy.

## ARCH-020

**ID:** ARCH-020  
**AREA:** Character / Item identity and persistence  
**CURRENT STATE:** `CharacterProfileId` is a dedicated profile identity; Journey persistence separately stores character/Journey/world state; Item definitions and Item instances have separate modules and persisted instances retain stable `instanceId`. Runtime/UI adapters operate on those identities rather than deriving them from renderer entities.  
**EVIDENCE:** `player-character/profile.ts`, `player-character/newGameFlow.ts`, `persistence/types.ts`, `items/definitions.ts`, `items/types.ts`, `items/factory.ts`, inventory owner paths in CODE_MAP.  
**SEMANTIC OWNER TODAY:** Player-character domain, Item domain, persistence.  
**EXPECTED OWNER:** Same.  
**CLASSIFICATION:** KEEP  
**WHY:** These are examples of the clean one-owner model the cleanup should preserve.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** HIGH if identity is merged/rekeyed.  
**PERFORMANCE RISK:** LOW  
**CONFLICT SURFACE:** Character Creator, avatar contract, inventory, save data.  
**RECOMMENDED FUTURE ACTION:** Do not use architecture cleanup as an excuse to collapse Character Profile/Journey/Item identities or re-key UI/runtime caches.  
**USER DECISION REQUIRED?** NO

## ARCH-021

**ID:** ARCH-021  
**AREA:** Development / Studio / diagnostics  
**CURRENT STATE:** Privileged Studio bridge modules are dynamically imported only under `import.meta.env.DEV`, consistent with the Studio security boundary. Renderer diagnostics, development version indicator, Region Depth Lab and Render Settings Lab are installed from the normal entrypoint; `WorldRenderer` also registers an object-catalog showcase host.  
**EVIDENCE:** `src/main.ts`; `docs/NOCLIP_STUDIO.md`; `WorldRenderer.ts`; `rendererRuntimeDiagnostics.ts`.  
**SEMANTIC OWNER TODAY:** Studio privileged path is cleanly DEV-gated; non-privileged diagnostics/lab hooks span production/runtime modules.  
**EXPECTED OWNER:** Development tooling observes/controls explicit dev surfaces without owning canonical product state.  
**CLASSIFICATION:** CLEAN  
**WHY:** No evidence that Studio owns product truth, but dev/showcase integration contributes to production renderer/application pressure.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** MEDIUM for existing browser/verification hooks.  
**PERFORMANCE RISK:** LOW to MEDIUM.  
**CONFLICT SURFACE:** World Lab, diagnostics globals, production bundle boundaries.  
**RECOMMENDED FUTURE ACTION:** Preserve DEV-gated Studio exactly; during renderer cleanup, move showcase/diagnostic attachment behind explicit non-canonical hooks rather than private/prototype access.  
**USER DECISION REQUIRED?** NO unless an existing public diagnostic hook is proposed for removal.

## ARCH-022

**ID:** ARCH-022  
**AREA:** Historical/stale architecture markers  
**CURRENT STATE:** `src/main.ts` calls the active `installLevel0SurfacePresentation()` immediately after a comment describing a “no-op marker”; the function is not a no-op. Several modules still describe themselves as pilot/correction/final migration mechanisms.  
**EVIDENCE:** `src/main.ts`; `pauFeaturePresentationPilot.ts`; `archDividerRuntimeCorrection.ts`; `finalLevel0MaterialPresentation.ts`.  
**SEMANTIC OWNER TODAY:** Historical comments/names coexist with active behavior.  
**EXPECTED OWNER:** Names/comments describe current responsibility; historical rationale lives in Git/ADR/audit rather than misleading runtime labels.  
**CLASSIFICATION:** CLEAN  
**WHY:** Stale language hides which layers are still essential and encourages preserving obsolete architecture by folklore.  
**BEHAVIOR CHANGE REQUIRED?** NO  
**COMPATIBILITY RISK:** NONE  
**PERFORMANCE RISK:** NONE  
**CONFLICT SURFACE:** code navigation/maintenance.  
**RECOMMENDED FUTURE ACTION:** Rename/remove historical markers only in the implementation cleanup that actually resolves their architecture; do not do cosmetic renames first.  
**USER DECISION REQUIRED?** NO

# High-Pressure Modules

## `src/app/ProjectNoclipGame.ts`

Approximate responsibilities: application orchestration, save lifecycle, input/movement, simulation, Item actions, UI actions, Region/Carver/Structure locating, PlayCanvas lifecycle, streaming, light/Blackout state, interaction dispatch, marks, persistence timers.

Incoming pressure: entrypoint, renderer runtime patches, visibility, diagnostics, outlet interaction, UI/dev tooling.

Outgoing pressure: persistence, world generation, timeline, audio, input, UI, renderer, items/inventory, PlayCanvas.

Assessment: real god-file pressure exists because external modules replace/wrap its private lifecycle. Recommended split seams are only the already-proven duplicated owners: engine/render settings, streaming lifecycle, interaction dispatch. Splitting every helper would create abstraction theater.

## `src/renderer/WorldRenderer.ts`

Approximate responsibilities: renderer facade, Cell build/unload, material/texture helpers, CV-H1 mesh, fixture replacement, wall/collision/interactions caches, spatial queries, dynamic Items, marks, World Lab showcase.

Incoming pressure: application + nine `loadCell` wrappers + performance/diagnostic modules.

Outgoing pressure: PlayCanvas, persistence, physics, world types/lighting/zones, cell builder, object catalog.

Assessment: highest-pressure renderer module. Keep a facade if useful, but move/absorb responsibilities only where duplicate ownership is already proven.

## `src/renderer/level0RegionPresentation.ts`

Approximate responsibilities: Region carpet adjustment, CV-H1 depth replacement, A-A1 world-span discovery/reconstruction, mesh/box generation, reconstruction diagnostics, neighboring Cell invalidation.

Incoming pressure: installed by static batching; final material layer depends on its reconstructed entity names/timing; Arch correction depends on its visible lower panels.

Outgoing pressure: world descriptors, materials, PlayCanvas, `WorldRenderer` loaded Cells.

Assessment: high responsibility breadth. A-A1 reconstruction and CV-H1 depth are both legitimate Region presentation but have separate change reasons. Split only after lifecycle/material ownership is explicit; otherwise a file split would preserve the same hidden coupling.

## `src/renderer/fixtureLighting.ts`

Approximate responsibilities: visible panel reconciliation, M-F1 material updates, physical Omni lifecycle, active-light selection, shadow invalidation, render-scope participation, diagnostics.

Assessment: physical lighting/performance concerns belong together. Visible panel creation/destruction/material ownership is the part that does not belong and should be removed from this module after a canonical panel owner exists.

## `src/world/generator.ts`

Approximate responsibilities: explicit Gen2 legacy generation plus Gen3 Cell descriptor assembly, safe placement, loot, structures/transitions, compatibility zone projection.

Assessment: broad, but much of the breadth is the deliberate compatibility boundary. Do not split or delete Gen2 merely to reduce file size. A later cleanup may isolate legacy assembly more sharply if it reduces accidental shared policy without changing old-save output.

# Duplicate Ownership Findings

Strongest duplicates, ordered by cleanup value:

1. **A-A1 collision:** world semantic walls vs presentation-derived lower-panel collision vs performance spatial index.
2. **M-C1 carpet:** surface pass vs Region pass vs final-material resolver; CV-H1 additionally inherits/reapplies it.
3. **M-A1 finish:** surface pass vs Arch correction vs final-material pass.
4. **M-F1 visible panel:** `cellBuilder` -> `WorldRenderer.replaceFixtureMeshes` -> surface presentation -> fixture runtime reconciliation/material update.
5. **Movement collision algorithm:** base `WorldRenderer.resolveMovement` vs runtime-performance replacement.
6. **Interaction query:** base `WorldRenderer.closestInteraction` vs runtime-performance replacement.
7. **Dynamic Item ticking:** base `WorldRenderer.updateDynamicItems` vs runtime-performance replacement.
8. **Application engine/streaming/light-field lifecycle:** class implementations vs renderer-runtime replacements.
9. **CV-H1 depth geometry:** builder fallback -> `WorldRenderer` recessed fallback -> Region depth replacement -> final material pass.
10. **Interaction behavior specialization:** game interaction owner vs renderer-level outlet wrappers.

Duplicated constants/rules that currently agree are still duplicate authority. Notable examples include Arch color/gloss fallbacks across three renderer modules, carpet Region tints/gloss across multiple stages, and fixture-panel visual defaults across builder/renderer/fixture modules.

# Legacy / Compatibility Boundaries

## Gen2

**Classification: LEGACY / KEEP until explicit approval.** ADR 0001 makes the retention decision explicit: pre-versioned saves migrate to Gen2 and must not silently regenerate. Cleanup may isolate Gen2 code, but may not delete or modernize its generated output without a separately approved save policy.

## PAU Feature pilot

**Classification: CONSOLIDATE, not save LEGACY.** `pauFeaturePresentationPilot.ts` is an explicit migration bridge from the legacy builder to canonical PAU Feature representation. Its behavior should survive while its prototype interception mechanism is removed.

## Base renderer fallbacks

`cellBuilder` and `WorldRenderer` still contain fallback visual construction that serves Gen2 and/or pre-final Gen3 stages. Cleanup must distinguish true Gen2 compatibility from Gen3 create-then-replace behavior before deleting code.

## Verification compatibility shims

`docs/VERIFICATION.md` documents narrow compatibility readers/shims (for example old evidence aliases and Character-aware browser entry). Those are verification compatibility, not product semantics. Remove only when their consumers are proven gone.

# Candidate Cleanup Seams

These are seams, not a replacement framework design.

1. **Explicit Cell lifecycle composition:** expose the existing post-build/unload sequence in one place without changing any subsystem logic. This removes prototype-order ambiguity and makes later deletions measurable.
2. **Collision authority seam:** make final wall/A-A1 collision geometry presentation-independent, then have both renderer wall maps and spatial index consume the same data.
3. **Canonical Level 0 material resolution:** one resolver per M-W1/M-A1/M-C1/M-CE1/CV-H1 presentation target; geometry creation should not encode competing final values.
4. **M-F1 panel/light split:** stable visible panel owner separate from physical Omni/shadow owner.
5. **Derived runtime indexes:** keep indexes as derived state inside the authoritative query/mutation lifecycle rather than method-replacement adapters.
6. **Application lifecycle absorption:** move accepted render-settings engine/streaming/light-field behavior into explicit application/runtime ownership; remove dead duplicate class implementations afterward.
7. **Interaction dispatch seam:** move outlet behavior out of renderer prototype wrappers into the application's existing interaction routing.
8. **PAU pilot absorption:** normal builder/representation dispatch instead of `addPropGeometry` monkey-patch.
9. **Development hooks:** keep Studio DEV-only; move World Lab showcase/diagnostic attachment behind explicit hooks when touching renderer composition.
10. **Verification de-coupling:** behavioral tests first, then remove source-string assertions that canonize historical installer shape.

# Risks

- **Behavioral regression:** the current wrapper order encodes real behavior. A “clean” rewrite that changes order can alter visible materials, collision, fixture ownership, batching and visibility.
- **Hidden async regression:** A-A1 reconstruction and final material convergence use microtasks. Consolidation must characterize when neighbor Cells and colliders become valid.
- **Collision compatibility:** A-A1 lower-panel behavior is especially sensitive; current presentation-derived collision may already diverge from the performance index.
- **Gen2 save breakage:** deleting or changing legacy generator/render fallback behavior can move old worlds and invalidate saved identity.
- **Performance regression:** moving batching/index/visibility lifecycle calls may recreate traversal spikes even if output is visually identical.
- **Studio regression:** material-owner consolidation must preserve structured preview/save/revert and must not move collision/topology into PAU controls.
- **Test false confidence:** source-string tests can pass while an integrated runtime index is stale; replacing them without behavioral coverage is also unsafe.
- **Over-abstraction:** introducing generic event buses/plugin frameworks to replace a finite known lifecycle chain would violate the project's efficiency law.

Known deferred performance items (A-A1 reconstruction spikes, dense Arch/Pillar draw-call pressure, Visibility topology invalidation spikes, localized batching spikes) are relationships, not blockers for this cleanup audit. They should be remeasured after ownership changes but are not implementation targets here.

# Decisions Requiring User Approval

1. **Gen2 retention/removal policy — REQUIRED only if deletion is proposed.** Current repository law requires frozen Gen2 support. Any expiry, export-only mode, migration, or deletion is a product/data decision and cannot be inferred by cleanup work.
2. **Any intentional A-A1/CV-H1 collision behavior change — REQUIRED if investigation shows current visible geometry and intended semantic collision differ.** Cleanup may consolidate identical behavior without approval; choosing a new physical rule requires approval.
3. **Removal of externally consumed diagnostic/dev browser globals — REQUIRED if they are treated as a supported development interface.** Internal rewiring that preserves the same verification surface does not require a product decision.

No other finding currently requires a product decision. Material, fixture, lifecycle and interaction recommendations are intended to preserve accepted behavior while restoring ownership.

# Recommended Cleanup Ordering

1. **Characterize current behavior before structural change.** Add focused behavioral evidence for A-A1 lower-panel collision/index synchronization, current load/unload stage outcomes, M-F1 panel/light identity, and final Level 0 material ownership. Do not add tests that merely assert more source strings.
2. **Make installer order explicit without changing behavior.** Hoist Region/junction/Arch/fixture installs out of `StaticWorldBatching`; replace the prototype `loadCell`/`unloadCell` chain with one explicit finite composition sequence while retaining exact ordering and microtask behavior.
3. **Correct collision dependency direction.** Resolve ARCH-003/004 first because presentation-derived collision can invalidate runtime indexes and because later renderer cleanup depends on a stable collision contract.
4. **Integrate derived performance indexes with the authoritative lifecycle.** Remove duplicate base-vs-replacement query implementations only after parity/performance evidence.
5. **Consolidate Level 0 material ownership.** Collapse M-C1/M-A1/CV-H1 final-material duplication while preserving Studio PAU behavior and world-continuous UV phase.
6. **Consolidate M-F1 visible-panel ownership.** Build one stable panel representation; keep physical light/shadow logic in fixture runtime.
7. **Remove Gen3 create-then-replace fallback paths.** Separate true Gen2 compatibility from obsolete Gen3 fallback geometry in `cellBuilder`/`WorldRenderer`.
8. **Absorb application lifecycle replacements.** Make the accepted render-settings/streaming/light-field implementation authoritative and remove dead originals; express streaming -> visibility sequencing explicitly.
9. **Remove narrow historical prototype bridges.** Absorb PAU Feature pilot dispatch and outlet interaction into their canonical owners; retain diagnostic instrumentation through an explicit hook.
10. **Reduce high-pressure modules only along proven seams.** Split `ProjectNoclipGame`, `WorldRenderer`, `level0RegionPresentation`, or `fixtureLighting` only where earlier steps establish a real owner boundary.
11. **Retire historical source-shape tests after behavioral replacements exist.** Keep source/security checks only where source shape itself is the contract.
12. **Re-run architecture/performance verification and update CODE_MAP only in the later implementation/synthesis work.** This audit intentionally does not modify governance or code maps.

---

Audit verification intent:

- product code changed: **NO**
- tests changed: **NO**
- governance files changed: **NO**
- `VERSION` changed: **NO**
- audit distinguishes observed evidence from inferred risk: **YES**
- user product decision changed: **NO**
- allowed write target: **only `docs/audits/cleanup-architecture-dependency.md`**

`PROVENANCE_IMPACT=NONE` — architecture audit only; no source-derived content changed.
