# Project Noclip Terminology Map

Code-facing glossary for conversation, Issues, prompts, developer tooling, and implementation. `WORLD.md` is the canonical world bible; `src/world/terminology.ts` is the typed short-address registry; `docs/CODE_MAP.md` maps concepts to files; `docs/PRESENTATION_ARCHITECTURE.md` is the canonical PAU/LCG/NAL architecture reference; `docs/NOCLIP_STUDIO.md` owns the local Studio workflow.

## Identity rule

Short addresses are human aliases. They never replace stable runtime IDs, semantic IDs, save IDs, deterministic seed-domain IDs, or generation addresses.

```text
Conversation: A-A1.lower-panel
Architecture Pattern: A-A1 — Arch Divider
Owning Region alias: A
Stable Region ID: arch-rooms
Generation version: gen3-v1
```

Historical-looking generated IDs such as `gen3-v5-*` are intentionally retained when they participate in deterministic identity. Stable identity is not cosmetic naming.

PAU adds a second mandatory identity separation:

```text
WORLD IDENTITY
!=
VISUAL / AUDIO REPRESENTATION
!=
SOURCE ASSET
```

A generated Bucket remains the same Bucket when its Representation or source mesh changes. A wallpaper source image may change without changing the wall. An audio source may change without changing fixture/world identity.

## World hierarchy

```text
Level
  Region
    Architecture Pattern
      pieces
      Materials / Conditions
  Carvers
  Structures
  Features
  Items
  Transitions

Geometry = Euclidean or Non-Euclidean spatial law
Cell = streaming/cache/computation ownership only; never a room or Region boundary
```

Architecture Pattern is subordinate to Region. It is a reusable architectural grammar, not a Structure and not the world Geometry category.

## High-frequency short addresses

| Short | Stable ID | Canonical concept | Primary implementation owner |
|---|---|---|---|
| `L0` | `level-0` | Level 0 | `src/world/types.ts`, `src/world/generator.ts` |
| `O` | `ordinary-level-0` | Ordinary Level 0 Region | `src/world/fields.ts`, `src/world/gen3.ts`, `src/world/gen3SpaceTopology*.ts` |
| `P` | `pillar-field` | Pillar Field Region | `src/world/gen3ArchitectureCore.ts`, `src/world/gen3SpaceTopologyBuild.ts` |
| `A` | `arch-rooms` | Arch Rooms Region | `src/world/gen3SpaceTopology*.ts`, `src/renderer/level0RegionPresentation.ts` |
| `O-V1` | `ordinary-default` | Default Variant | `src/world/gen3.ts` |
| `G-E` | `euclidean` | Euclidean Geometry | `src/world/types.ts` |
| `G-N` | `non-euclidean` | Non-Euclidean Geometry | design-gated; no routine Gen3 implementation |
| `M-W1` | `level-0-wallpaper` | Level 0 wallpaper Material | `src/renderer/level0Wallpaper.ts`, `src/renderer/level0SurfacePresentation.ts` |
| `M-A1` | `arch-pale-wallpaper` | Arch pale finish Material | `src/world/gen3SpaceTopologyBuild.ts`, renderer presentation |
| `M-C1` | `level-0-carpet` | Level 0 carpet Material | `src/renderer/level0SurfacePresentation.ts`, `src/renderer/level0RegionPresentation.ts` |
| `M-CE1` | `level-0-ceiling` | Level 0 ceiling Material | `src/renderer/level0SurfacePresentation.ts` |
| `M-F1` | `fluorescent-panel` | fluorescent panel Material | `src/world/lighting.ts`, `src/renderer/fixtureLighting.ts` |
| `C-D1` | `damp-carpet` | Damp carpet Condition | `src/world/gen3.ts` |
| `C-D2` | `deep-wet-carpet` | Deep wet carpet Condition | `src/world/gen3.ts` |
| `C-S1` | `shallow-dry-carpet` | Shallow carpet Condition | `src/world/gen3.ts` |
| `C-B1` | `blackout` | Blackout Condition | `src/world/gen3.ts`, `src/world/lighting.ts`, `src/renderer/fixtureLighting.ts` |
| `CV-H1` | `floor-hole-cluster` | Floor-hole Carver | `src/world/gen3.ts`, `src/renderer/level0RegionPresentation.ts` |
| `S-M1` | `manila-room` | Manila Room Structure | `src/world/structures.ts` |
| `S-E1` | `exit-structure` | Exit Structure | `src/world/exits.ts`, `src/world/generator.ts` |
| `S-R1` | `red-rooms` | Red Rooms design target | design required |

Do not invent short IDs for insignificant implementation details. Add durable aliases to `src/world/terminology.ts` and this document together.

## Architecture Patterns

### O-A1 — Default Wall

Stable pattern ID: `ordinary-a1-default-wall`  
Owner: `O` / `ordinary-level-0`

Pieces:
- `O-A1.wall-span` — solved Ordinary Level 0 partition span.
- `O-A1.solved-opening` — opening accepted by Space Topology.

Implementation ownership:
```text
semantic topology -> src/world/gen3SpaceTopologyDomain.ts
Cell realization  -> src/world/gen3SpaceTopologyBuild.ts
base render       -> src/renderer/cellBuilder.ts
wallpaper/phase   -> src/renderer/level0Wallpaper.ts
visible surface   -> src/renderer/level0SurfacePresentation.ts
```

### P-A1 — Pillar Pier

Stable pattern ID: `pillar-a1-pier`  
Owner: `P` / `pillar-field`

Piece:
- `P-A1.pier` — canonical rectangular wallpaper-clad floor-to-ceiling Pillar Field pier.

Key law: 7.2 m world lattice; Region depth controls expression.

Implementation ownership:
```text
lattice/dimensions   -> src/world/gen3ArchitectureCore.ts
placement/clearance  -> src/world/gen3SpaceTopologyBuild.ts
visible pillar faces -> src/renderer/level0SurfacePresentation.ts
wallpaper phase      -> src/renderer/level0Wallpaper.ts
```

### A-A1 — Arch Divider

Stable pattern ID: `arch-a1-divider`  
Owner: `A` / `arch-rooms`

Pieces:
- `A-A1.pier`
- `A-A1.upper-mass`
- `A-A1.curve`
- `A-A1.lower-panel`
- `A-A1.termination`

Implementation ownership:
```text
semantic/collision pieces -> src/world/gen3SpaceTopologyBuild.ts
shared dimensions          -> src/world/gen3ArchitectureCore.ts
render-only curve/bridges  -> src/renderer/level0RegionPresentation.ts
surface/wallpaper finish   -> src/renderer/level0SurfacePresentation.ts + level0Wallpaper.ts
```

Piece addresses name conceptual parts even when the renderer builds them from multiple meshes/segments. A-A1 itself is not yet structured-editable through PAU; Studio exposes semantic read-only inspection and code-change handoff.

## Canonical world categories

- **Level** — major destination. Current playable Level: `L0` / `level-0`.
- **Region** — continuous geography inside a Level, driven by affinity Fields rather than Cells/hard districts. Current: `O`, `P`, `A`.
- **Architecture Pattern** — reusable architectural grammar owned by a Region.
- **Variant** — named subtype of a Region when stable identity is useful. Current named Variant: `O-V1`.
- **Geometry** — spatial law only: Euclidean or Non-Euclidean. Do not confuse this world category with a PAU Geometry ID/builder.
- **Material** — semantic surface/construction finish. A PAU presentation material definition may resolve how it looks without replacing this world identity.
- **Condition** — state layered over geography/materials/fixtures/objects. Blackout is a Condition, never a Region.
- **Feature** — small generated scenery; not a Region Architecture Pattern.
- **Structure** — special generated location with standalone identity.
- **Carver** — subtractive generation pass. `CV-H1` is a Carver, not a Region.
- **Anomaly** — localized non-spatial rule-breaking phenomenon. No first-class Gen3 Anomaly is currently implemented.
- **Entity** — active/living actor. No routine Level 0 Entity is currently approved.
- **Item** — collectible/useful object.
- **Transition** — route/trigger toward another destination; distinct from an Exit Structure.

Stable Item definition IDs remain: `flashlight`, `battery`, `almond-water`, `marker`, `paper-note`, `glow-stick`, `string-spool`, `empty-can`, `pry-tool`.

## PAU — Presentation Architecture Upgrade

**PAU** is the architectural program that separates generated world identity from visual/audio representation and optional source content.

Canonical flow:

```text
WORLD TRUTH
  -> SEMANTIC OBJECT
  -> REPRESENTATION BINDING
  -> REPRESENTATION DEFINITION
  -> GEOMETRY REGISTRY / ASSET REGISTRY / MATERIAL DEFINITIONS
  -> PRESENTATION DATA
  -> RENDERER
```

The renderer should consume resolved presentation data rather than make semantic world-design decisions.

### Representation

A **Representation** is a presentation identity describing how a semantic target should be represented. Its `RepresentationId` is presentation identity only.

```text
Medium Bucket                         semantic design target
  -> bucket.default                  Representation ID
  -> geometry.tapered-open-container Geometry ID
  -> material.bucket.aged-neutral    presentation material ID
```

Changing `bucket.default` to a custom mesh Representation must not create a new generated Bucket.

### Representation Definition

A **RepresentationDefinition** is machine-readable metadata for one Representation: human name/category, Geometry ID, material IDs, Asset IDs, parameters, editable metadata, LCG class, collision mode, fallback, owner/source/test references and diagnostics.

For PAU Run 2's structured pilot, the human-authored source lives in `src/presentation/definitions/level0-features.json`; `scripts/build-presentation-definitions.mjs` validates it and generates the typed source consumed by the existing registry.

### Representation Binding

A **RepresentationBinding** maps a semantic design target to a Representation ID. Rebinding is a presentation-only operation.

### Representation Registry

The **Representation Registry** is the canonical collection/resolution surface for RepresentationDefinitions and RepresentationBindings, including deterministic fallbacks.

### Geometry ID / Geometry Registry

A PAU **Geometry ID** identifies a reusable deterministic mesh builder/definition. The **Geometry Registry** resolves Geometry IDs to mesh-data builders. This is presentation construction vocabulary and must not be confused with the world `Geometry = Euclidean | Non-Euclidean` spatial-law category.

### Presentation Material

A **presentation material definition** is renderer-facing visual material metadata owned by PAU. It may correspond to a world Material but does not replace world semantic Material identity.

## LCG — Low-Complexity Geometry

**LCG** is the canonical Project Noclip procedural geometry construction standard. It is not the Low graphics preset, not a separate renderer and not a deliberately crude low-poly style.

Core rule: use the fewest geometric elements required to preserve silhouette, structure, physical readability and atmosphere.

Classes:
- **LCG-0** — simple planar / structural geometry.
- **LCG-1** — simple constructed object.
- **LCG-2** — curved or silhouette-sensitive object.
- **LCG-3** — distinctive / special object.
- **LCG-X** — explicit justified exception.

Use profile-specific recommended/warning budgets rather than one global triangle cap.

LCG design rules:
- few large shapes; very few tiny shapes;
- clean silhouettes;
- simple material structure;
- lighting/materials carry most surface detail;
- one physical object should own one canonical visible surface where practical;
- no coplanar overlap patches, duplicate visible faces or z-fighting as a substitute for modelling;
- hard structural edges stay hard; intentional curves may smooth;
- architecture normally gets no explicit bevel geometry;
- controlled irregularity must come from explicit deterministic presentation parameters, not broken geometry.

## NAL — Noclip Asset Library

**NAL** is the source/definition/build/runtime asset architecture for images, audio and meshes.

### Asset / Asset ID

An **Asset** is optional presentation content addressed by stable semantic `AssetId`. Asset identity is content/presentation identity, not generated world identity.

### Content hash

A **content hash** identifies the current source bytes for caching, duplicate/change detection, diagnostics and synchronization. It is deliberately separate from `AssetId`: replacing the source content may change the hash while preserving semantic Asset ID.

### Source Asset vs Runtime Asset

- **Source Asset** — human-provided content under `assets/source/`; never automatically trusted as runtime content.
- **Asset Definition** — small human-readable metadata under `assets/definitions/`.
- **Runtime Asset** — validated/generated runtime content under `public/assets/runtime/` plus generated registry metadata.

Build flow:

```text
SOURCE FILE + DEFINITION
  -> npm run assets:build
  -> validation + SHA-256
  -> generated runtime file + generated registry
```

### Asset Registry

The **Asset Registry** resolves stable Asset IDs to validated runtime asset definitions and explicit fallback chains. World generation must not depend on arbitrary source-file paths.

### Asset Profile

An **Asset Profile** provides defaults/validation expectations for a recurring authoring role. Initial profiles: Wall Texture, Floor Texture, Ceiling Texture, Prop Texture, UI Image, Reference Image, Ambient Audio, Spatial Audio, UI Audio, Feature Mesh, Structure Mesh, Item Mesh, Entity Mesh.

### Mesh import convention

Canonical imported mesh format starts with GLB; project units metres; `+Y` up; `-Z` forward; normalized scale `1`; authored transforms baked at source; materials representation-owned; render triangles never automatic gameplay collision.

### Collision mode

PAU collision vocabulary: `none`, `box`, `capsule`, `simple-hull`, `authored-simple`. Environmental Features default to `none` unless gameplay explicitly needs collision.

## DevelopmentContext

**DevelopmentContext** is versioned structured engineering state for a PAU-controlled target. Current schema: `development-context-v1`.

It explicitly distinguishes:
- **design target** — semantic target such as Medium Bucket;
- **runtime instance** — optional specific generated object at one deterministic location.

It may carry repository/ref, category, stable runtime ID, seed/generation version/Region/Cell/world position, Representation/Geometry/material/Asset IDs, binding, LCG, collision, editable/current/preview values, ownership/source/test refs, diagnostics, deterministic/save invariants, warnings and optional user observation/requested change.

Structured JSON is canonical. Human-readable packets are generated from the same object. Source dumps are not the contract.

## ChangeReceipt

**ChangeReceipt** is versioned machine-readable evidence of a development/Studio operation, not save data and not world identity. Current schema: `change-receipt-v1`.

It records what changed, before/after values/bindings/assets, source/generated/files affected, preview/persistence state, validation/tests/typecheck/build, deterministic/save checks, warnings/diff summary and optional commit/PR/preview/revert references.

Canonical relation:

```text
DevelopmentContext = state before/during engineering work
ChangeReceipt       = evidence of what changed after an operation
```

## Noclip Studio / World Lab

- **World Lab** — in-game runtime inspection, QA and forcing surface. It is not a filesystem editor, Git client, source editor or asset build system.
- **Noclip Studio** — local source-backed development/authoring companion implemented as the PAU Run 2 candidate under `tools/studio/`. It consumes PAU machine-readable metadata and canonical DevelopmentContext/ChangeReceipt contracts. It is not gameplay and is excluded from production privileged runtime.

### Studio change modes

- **Runtime Preview** — temporary in-memory parameter or Representation Binding override above canonical PAU values. No source write; no world/save persistence.
- **Structured Project Change** — PAU-controlled edit that writes only the canonical structured owner, regenerates required outputs, runs focused validation, exposes a source diff, and produces a ChangeReceipt.
- **Code Change** — requested behavior that current PAU contracts cannot express. Studio does not perform arbitrary autonomous code edits; it produces high-signal DevelopmentContext / Full Development Prompt handoff.

### Studio design target vs runtime instance

Studio always selects a semantic **design target**. A **runtime instance** is added only when the running game can supply a real stable generated instance identity. A disposable showcase or ambiguous scene primitive must not be presented as a deterministic runtime instance.

### Unsaved Preview

**UNSAVED PREVIEW** is visible Studio state where one or more runtime-only PAU overrides differ from canonical source. Revert Preview or Clear All Previews returns presentation resolution to canonical values without changing generated world descriptors or Journey saves.

### Studio local history

`.noclip-studio/receipts/` is a gitignored developer-convenience log of Studio ChangeReceipt envelopes and targeted-revert evidence. It is safe to delete and is never the source of truth; Git and canonical PAU/NAL sources remain authoritative.

## Generation 3 engine vocabulary

- **Field** — deterministic continuous scalar sampled from world-space metres and continuous across Cell boundaries.
- **Affinity** — how strongly a location tends toward a Region/Condition expression.
- **Region depth** — local intensity/interiority of Region expression, not a hard boundary.
- **World seed** — deterministic root journey input.
- **Generation version** — ruleset identity: `gen3-v1` for new journeys; `gen2` for frozen old-save compatibility.
- **Seed domain** — independent deterministic randomness channel.
- **Cell** — 14 m streaming/cache/computation unit; not a room.
- **WorldAddress** — seed/Level/generation version/Cell coordinates plus compatibility metadata.
- **Space Topology** — world-space connectivity/partition solution before local presentation.
- **Topology wall** — world-space candidate/accepted partition span.
- **Topology portal** — solved traversable opening.
- **Route reservation envelope** — deterministic clearance volume shared by route/opening landing logic and blocking-architecture exclusion.
- **Cell clipping** — slicing world-owned geometry into streamed fragments without changing world cadence or creating seams.
- **Stable semantic ID** — deterministic generated-content identity.
- **Streaming/cache ownership** — runtime lifetime responsibility; never a world-design category.

High-frequency Fields include `openness`, `partitionPressure`, `axisFlow`, `roomScale`, `columnPressure`, `ceilingVariation`, `regularity`, `connectivityPressure`, `dampness`, `decay`, `stability`, `abnormality`, `voidPressure`, `clutterPressure`, `electricalReliability`, `pillarAffinity`, `archAffinity`, `blackoutPressure`, and `holePressure`.

## Core data terms

From `src/world/types.ts`:

- `GenerationVersion` — `gen2` or `gen3-v1`.
- `GeometryKind` — Euclidean or Non-Euclidean.
- `RegionId`, `MaterialId`, `ConditionId`, `CarverId`, `StructureId` — stable semantic identifiers.
- `WallSpec` — renderer-independent generated wall/partition fragment.
- `PropSpec` — implementation object/scenery representation. Prefer canonical design vocabulary when one exists. `PropSpec.id` remains world/runtime identity; it is not a PAU Representation ID.
- `FloorPatchSpec` — generated floor-local patch/Carver fragment such as damp/worn/dry/hole.
- `LightState` — on/off/flicker deterministic fixture state.
- `LightGroupSpec` — deterministic fixture group, placement, state and flicker data.
- `WorldSemanticDescriptor` — Gen3 semantic classification attached to generated Cell fragments.
- `CellDescriptor` — complete generated streaming payload consumed by runtime/renderer.
- `WorldTuning` — developer/testing overrides, not player-facing canon.

## Renderer vocabulary and ownership

- **WorldRenderer** — streamed scene ownership, collision registry, Hole floor segmentation, interactions/marks, and sampled-light-field bridge.
- **cellBuilder** — converts `CellDescriptor` into base PlayCanvas entities; legacy prop path remains for non-pilot objects and compatibility.
- **Level 0 Feature presentation** — `src/renderer/level0FeaturePresentation.ts`; PlayCanvas adapter for the PAU Bucket/Can pilot and the development-only Studio preview overlay.
- **PAU Feature presentation pilot bridge** — `src/renderer/pauFeaturePresentationPilot.ts`; intercepts only Bucket/Can before the legacy `cellBuilder` prop presentation path.
- **Level 0 surface presentation** — `src/renderer/level0SurfacePresentation.ts`; wallpaper-based surfaces, pillar faces, fixture mesh material presentation and current floor-reaching Arch collider filter.
- **Level 0 Region presentation** — `src/renderer/level0RegionPresentation.ts`; Region carpet finish, Hole depth bands and render-only Arch curves/bridges.
- **Fixture lighting** — `src/renderer/fixtureLighting.ts`; every rendered fluorescent fixture owns its real light/shadow behavior. Cells own lifetime only; player position does not select lights.
- **Sampled light field** — `sampleLightField` in `src/world/lighting.ts`; ambience/diagnostics only, not physical light allocation.
- **Static batching** — `src/renderer/StaticWorldBatching.ts`; per-Cell render-only batching after presentation/lighting installers.
- **Wallpaper phase** — world-space UV phase that must not reset at Cell seams.
- **Arch render curve** — render-only geometry for `A-A1.curve`; semantic/collision pieces remain world-owned.
- **Hole depth bands** — upper/middle/deep renderer presentation for `CV-H1`.

## Persistence vocabulary

- **schema-v2** — current save schema.
- **gen3-v1** — new-journey generation identity.
- **gen2** — frozen compatibility generation for old/unversioned saves.
- **migration** — schema conversion while preserving generation identity.
- **save delta/runtime mutation** — persisted changes layered over deterministic generated baseline.

Source Assets, runtime asset paths, Studio preview state, DevelopmentContext and ChangeReceipt are development/presentation data and are not embedded into ordinary save identity.

## Legacy Generation 2 vocabulary

Use only for compatibility implementation, never as new Gen3 design language:

- `ZoneId`
- district / 5×5 district
- `RoomArchetype`
- `SpatialProfile`
- `RoomComponentId` / component
- generic `Prop` as a design category
- alcove composition
- freestanding arch run
- hole rail
- unload-count shifting

These remain only where old-save/compatibility code genuinely requires them.

## Work vocabulary

Modes: `LOOK`, `AUDIT`, `CHANGE`, `RELEASE`.

Prompt fields: `TARGET`, optional `OBSERVATIONS`, `CHANGE` for CHANGE mode, `PRESERVE`, `VERIFY`.

Acceptance: `PASS`, `PASS WITH GAP`, `FAIL`, `UNVERIFIED`.

Temporary audit defect IDs may use `<target>-D#`; they are disposable tracking labels, not permanent world IDs.
