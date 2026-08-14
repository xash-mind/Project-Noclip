# Project Noclip Terminology Map

This document is the code-facing glossary for conversation, issues, prompts, and implementation work. `WORLD.md` remains the canonical world bible; `src/world/terminology.ts` is the typed short-address registry.

## Identity rule

Short addresses are human aliases. They never replace stable runtime IDs, semantic IDs, save IDs, or generation addresses.

Example:

```text
Conversation: A-A1.lower-panel
Architecture Pattern: A-A1 — Arch Divider
Owning Region alias: A
Stable Region ID: arch-rooms
Generation version: gen3-v1
```

## World hierarchy

```text
Level
  Region
    Architecture Pattern
      Geometry pieces
      Materials / Conditions
  Carvers
  Structures
  Features
  Items
  Transitions

Geometry = spatial law: Euclidean or Non-Euclidean
Cell = streaming/cache ownership only; never a room or Region boundary
```

**Architecture Pattern** is subordinate to a Region. It is a named reusable architectural grammar. It is not a `Structure` and it is not the world `Geometry` category.

## High-frequency short addresses

| Short | Stable ID | Meaning |
|---|---|---|
| `L0` | `level-0` | Level 0 |
| `O` | `ordinary-level-0` | Ordinary Level 0 Region |
| `P` | `pillar-field` | Pillar Field Region |
| `A` | `arch-rooms` | Arch Rooms Region |
| `O-V1` | `ordinary-default` | Default Variant |
| `G-E` | `euclidean` | Euclidean Geometry |
| `G-N` | `non-euclidean` | Non-Euclidean Geometry |
| `M-W1` | `level-0-wallpaper` | Level 0 wallpaper |
| `M-A1` | `arch-pale-wallpaper` | Current code ID for the Arch pale finish |
| `M-C1` | `level-0-carpet` | Level 0 carpet |
| `M-CE1` | `level-0-ceiling` | Level 0 ceiling |
| `M-F1` | `fluorescent-panel` | Fluorescent panel |
| `C-D1` | `damp-carpet` | Damp carpet Condition |
| `C-D2` | `deep-wet-carpet` | Deep wet carpet Condition |
| `C-S1` | `shallow-dry-carpet` | Shallow carpet Condition |
| `C-B1` | `blackout` | Blackout Condition |
| `CV-H1` | `floor-hole-cluster` | Floor-hole Carver |
| `S-M1` | `manila-room` | Manila Room Structure |
| `S-E1` | `exit-structure` | Exit Structure |
| `S-R1` | `red-rooms` | Red Rooms Structure/design target |

Do not invent short IDs casually. Add durable aliases to `src/world/terminology.ts` and this document together.

## Architecture Patterns

### O-A1 — Default Wall

Stable pattern ID: `ordinary-a1-default-wall`  
Owner: `O` / `ordinary-level-0`

Pieces:

- `O-A1.wall-span` — solved Ordinary Level 0 partition span.
- `O-A1.solved-opening` — opening accepted by the connectivity/topology solution.

Primary implementation: `src/world/gen3SpaceTopologyDomain.ts`, `src/world/gen3SpaceTopologyBuild.ts`, `src/world/gen3ArchitectureCore.ts`.

### P-A1 — Pillar Pier

Stable pattern ID: `pillar-a1-pier`  
Owner: `P` / `pillar-field`

Pieces:

- `P-A1.pier` — canonical rectangular wallpaper-clad floor-to-ceiling Pillar Field pier.

Key laws: 7.2 m world lattice; Region-depth progression controls how strongly the pattern expresses.

Primary implementation: `src/world/gen3SpaceTopologyBuild.ts`, `src/renderer/dev5FidelityPresentation.ts`, `src/renderer/dev5Wallpaper.ts`.

### A-A1 — Arch Divider

Stable pattern ID: `arch-a1-divider`  
Owner: `A` / `arch-rooms`

Pieces:

- `A-A1.pier` — vertical support/pier.
- `A-A1.upper-mass` — heavy upper divider/header/shoulder mass.
- `A-A1.curve` — curved central arch geometry.
- `A-A1.lower-panel` — lower panel where the bay is not a floor-clear route opening.
- `A-A1.termination` — complete end of a divider run.

Primary implementation: `src/world/gen3SpaceTopologyBuild.ts` for semantic/collision structure and `src/renderer/dev6FollowupPresentation.ts` for curved visual presentation.

Piece addresses describe the conceptual part even when a renderer builds that part from many vertices/segments.

## Canonical world categories

### Level

A major Backrooms destination. Current playable Level: `L0` / `level-0`.

### Region

Large continuous geography inside a Level. Regions are driven by continuous affinity Fields; they are not Cells or hard districts.

Current Regions:

- `O` — `ordinary-level-0`
- `P` — `pillar-field`
- `A` — `arch-rooms`

### Variant

Named subtype of a Region when it deserves stable identity. Current named Variant: `O-V1` / `ordinary-default`.

### Geometry

Spatial law only:

- `G-E` / `euclidean` — implemented for Gen3 Level 0.
- `G-N` / `non-euclidean` — design-required where explicitly approved.

### Material

Semantic surface/construction finish. Current code IDs:

- `level-0-wallpaper`
- `arch-pale-wallpaper`
- `level-0-carpet`
- `level-0-ceiling`
- `fluorescent-panel`

### Condition

State layered over geography/materials/fixtures/objects:

- `damp-carpet`
- `deep-wet-carpet`
- `shallow-dry-carpet`
- `blackout`

`Blackout` is a Condition, never a Region.

### Feature

Small generated scenery. Current accepted examples: sparse furniture and occasional ordinary rectangular pillar. A Feature is not a Region Architecture Pattern.

### Structure

Special generated location with standalone identity:

- `manila-room`
- `exit-structure`
- `red-rooms` — design required

### Carver

Subtractive generation pass:

- `floor-hole-cluster`

A hole cluster is a Carver, not a Region.

### Anomaly

Localized non-spatial rule-breaking phenomenon. No first-class Generation 3 Anomaly is currently implemented. Spatial impossibility belongs under Non-Euclidean Geometry.

### Entity

Active/living actor. No routine Level 0 Entity is currently approved.

### Item

Collectible/useful object. Stable item definition IDs:

- `flashlight`
- `battery`
- `almond-water`
- `marker`
- `paper-note`
- `glow-stick`
- `string-spool`
- `empty-can`
- `pry-tool`

### Transition

Route/trigger toward another destination. Exit architecture may use an `exit-structure`, but Transition and Structure remain different concepts.

## Generation 3 Fields

A **Field** is a deterministic continuous scalar sampled from world-space metres. Fields stay continuous across Cell boundaries.

Local architecture/condition Fields:

- `openness`
- `partitionPressure`
- `axisFlow`
- `roomScale`
- `columnPressure`
- `ceilingVariation`
- `regularity`
- `connectivityPressure`
- `dampness`
- `decay`
- `stability`
- `abnormality`
- `voidPressure`
- `clutterPressure`
- `electricalReliability`

Kilometre-scale geography Fields:

- `pillarAffinity`
- `archAffinity`
- `blackoutPressure`
- `holePressure`

**Affinity** means how strongly that world location tends toward a Region/Condition expression. **Region depth** is the local intensity/interiority of that Region expression, not a hard boundary.

## Generation and topology terms

- **World seed** — deterministic root input for a journey.
- **Generation version** — generation ruleset. `gen3-v1` for new journeys; `gen2` for frozen old-save compatibility.
- **Seed domain** — independent deterministic randomness channel for a subsystem.
- **Cell** — 14 m streaming/cache/computation unit; not a room.
- **WorldAddress** — stable address containing seed/level/generation version/Cell coordinates plus compatibility metadata.
- **Space Topology** — world-space connectivity and partition solution before local presentation.
- **Topology wall** — world-space candidate/accepted partition span.
- **Topology portal** — solved traversable opening in a topology wall.
- **Route reservation envelope** — deterministic clearance volume shared by route/opening landing logic and blocking architecture exclusion.
- **Partition pressure** — Field influence encouraging/discouraging local partitioning.
- **Room scale** — Field influence on local spatial scale; not a discrete room archetype in Gen3.
- **Cell clipping** — slicing world-owned geometry into streamed Cell fragments. It must not create visible seams or reset cadence.
- **Stable semantic ID** — deterministic identity for generated world content.

## Core data terms from `src/world/types.ts`

- `Direction` — north/east/south/west.
- `StabilityClass` — disorienting, semi-stable, stable, rendezvous, terminal.
- `GenerationVersion` — `gen2` or `gen3-v1`.
- `GeometryKind` — Euclidean or Non-Euclidean.
- `RegionId` — stable Region identifier.
- `MaterialId` — stable Material identifier.
- `ConditionId` — stable Condition identifier.
- `CarverId` — stable Carver identifier.
- `StructureId` — stable implemented Structure identifier.
- `Openings` — north/east/south/west Cell-edge connectivity representation.
- `LocalPoint` — local x/y/z coordinate.
- `WallSpec` — renderer-independent wall/partition fragment data: position, scale, orientation, material and stable ID.
- `PropSpec` — generated object/scenery data. `Prop` is implementation vocabulary; use Feature/Architecture Pattern/Item/etc. in design conversation when a canonical concept exists.
- `FloorPatchSpec` — floor-local patch/carver fragment data such as damp/worn/dry/hole.
- `LightState` — on/off/flicker fixture state.
- `LightGroupSpec` — deterministic fixture group, placement, state and flicker data.
- `NoteSpec` — placed readable note/document data.
- `LootNode` — deterministic possible item-spawn node.
- `ExitDescriptor` — Transition trigger/destination data.
- `WorldSemanticDescriptor` — Gen3 semantic classification attached to generated Cell fragments: Level, Region, Geometry, Materials, Conditions, Carvers, Structures, Features, Transitions and strengths.
- `CellDescriptor` — complete generated streaming payload consumed by renderer/runtime.
- `WorldTuning` — developer/testing controls and overrides, not player-facing canon.

## Renderer terms

- **WorldRenderer** — owns streamed visual Cell presentation.
- **CellVisual** — rendered representation of one `CellDescriptor` fragment.
- **cellBuilder** — converts semantic/generated data into PlayCanvas entities/materials.
- **Static batching** — merges stable render work where safe to reduce draw cost.
- **Fixture panel** — visible fluorescent mesh (`M-F1`).
- **Fixture light / real fixture spot** — physical PlayCanvas spot owned by a rendered active fixture in dev.7.
- **Emissive** — material output that makes a surface itself appear luminous.
- **Light group** — deterministic generation grouping of fluorescent fixtures/state.
- **Wallpaper phase** — world-space UV phase; must not reset at Cell seams.
- **Arch render curve** — render-only curved geometry for `A-A1.curve`; semantic collision structure remains bounded separately.
- **Hole depth bands** — renderer presentation of `CV-H1` upper/middle/deep interior darkness.

## Gameplay/runtime terms

- **Journey** — one persistent local playthrough/world identity.
- **World Day** — timeline progression dimension used by gates.
- **Exposure** / **Exposure Day** — player/world exposure progression used by gates.
- **Timeline gate** — deterministic rule delaying Regions/Conditions/Transitions/Structures until requirements are met.
- **Flashlight** — Item plus independent camera-owned spot light when active.
- **Marker stroke** — persistent player wall marking.
- **World Lab** — developer-only inspection/control surface. It locates/samples/previews canonical world concepts rather than redefining them.

## Persistence terms

- **schema-v2** — current save schema.
- **gen3-v1** — new-journey generation identity.
- **gen2** — frozen compatibility generation for old/unversioned saves.
- **migration** — explicit conversion of older save schema while preserving old generation identity.
- **save delta/runtime mutation** — persisted changes layered over deterministic generated baseline.

## Legacy Generation 2 vocabulary

Do not use these to describe new Gen3 world design unless discussing compatibility code:

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

They remain in source because old saves and narrow adapters still require them.

## Work vocabulary

### Modes

- `LOOK` — inspect/explain only; no writes.
- `AUDIT` — investigate named target(s), reconcile reality, report/capture findings; no product implementation.
- `CHANGE` — modify only explicitly named target(s).
- `RELEASE` — verify already-completed change, then merge/deploy only if acceptable.

### Prompt fields

- `TARGET` — exact short/stable ID or subsystem being worked on.
- `OBSERVATIONS` — what the player/user saw; may be informal.
- `CHANGE` — desired outcome, only for CHANGE mode.
- `PRESERVE` — explicit invariants; everything outside TARGET is preserved by default.
- `VERIFY` — evidence needed to judge the change.

### Acceptance

- `PASS`
- `PASS WITH GAP`
- `FAIL`
- `UNVERIFIED`

A Release stops on `FAIL` or `UNVERIFIED` for a required target.

### Temporary defect IDs

During an audit, temporary defect addresses may use `<target>-D#`, for example `A-A1-D2`. They are disposable tracking labels, not permanent world IDs.
