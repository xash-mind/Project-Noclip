# Project Noclip Terminology Map

Code-facing glossary for conversation, Issues, prompts, and implementation. `WORLD.md` is the canonical world bible; `src/world/terminology.ts` is the typed short-address registry; `docs/CODE_MAP.md` maps these concepts to files.

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

Piece addresses name conceptual parts even when the renderer builds them from multiple meshes/segments.

## Canonical world categories

- **Level** — major destination. Current playable Level: `L0` / `level-0`.
- **Region** — continuous geography inside a Level, driven by affinity Fields rather than Cells/hard districts. Current: `O`, `P`, `A`.
- **Architecture Pattern** — reusable architectural grammar owned by a Region.
- **Variant** — named subtype of a Region when stable identity is useful. Current named Variant: `O-V1`.
- **Geometry** — spatial law only: Euclidean or Non-Euclidean.
- **Material** — semantic surface/construction finish.
- **Condition** — state layered over geography/materials/fixtures/objects. Blackout is a Condition, never a Region.
- **Feature** — small generated scenery; not a Region Architecture Pattern.
- **Structure** — special generated location with standalone identity.
- **Carver** — subtractive generation pass. `CV-H1` is a Carver, not a Region.
- **Anomaly** — localized non-spatial rule-breaking phenomenon. No first-class Gen3 Anomaly is currently implemented.
- **Entity** — active/living actor. No routine Level 0 Entity is currently approved.
- **Item** — collectible/useful object.
- **Transition** — route/trigger toward another destination; distinct from an Exit Structure.

Stable Item definition IDs remain: `flashlight`, `battery`, `almond-water`, `marker`, `paper-note`, `glow-stick`, `string-spool`, `empty-can`, `pry-tool`.

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
- `PropSpec` — implementation object/scenery representation. Prefer canonical design vocabulary when one exists.
- `FloorPatchSpec` — generated floor-local patch/Carver fragment such as damp/worn/dry/hole.
- `LightState` — on/off/flicker deterministic fixture state.
- `LightGroupSpec` — deterministic fixture group, placement, state and flicker data.
- `WorldSemanticDescriptor` — Gen3 semantic classification attached to generated Cell fragments.
- `CellDescriptor` — complete generated streaming payload consumed by runtime/renderer.
- `WorldTuning` — developer/testing overrides, not player-facing canon.

## Renderer vocabulary and ownership

- **WorldRenderer** — streamed scene ownership, collision registry, Hole floor segmentation, interactions/marks, and sampled-light-field bridge.
- **cellBuilder** — converts `CellDescriptor` into base PlayCanvas entities.
- **Level 0 surface presentation** — `src/renderer/level0SurfacePresentation.ts`; owns wallpaper-based surfaces, pillar faces, fixture mesh material presentation, and the current floor-reaching Arch collider filter.
- **Level 0 Region presentation** — `src/renderer/level0RegionPresentation.ts`; owns Region carpet finish, Hole depth bands, and render-only Arch curves/bridges.
- **Fixture lighting** — `src/renderer/fixtureLighting.ts`; every rendered fluorescent fixture owns one real downward PlayCanvas spot. Cells own lifetime only; player position does not select lights.
- **Sampled light field** — `sampleLightField` in `src/world/lighting.ts`; ambience/diagnostics only, not physical light allocation.
- **Static batching** — `src/renderer/StaticWorldBatching.ts`; render-only batching after presentation/lighting installers.
- **Wallpaper phase** — world-space UV phase that must not reset at Cell seams.
- **Arch render curve** — render-only geometry for `A-A1.curve`; semantic/collision pieces remain world-owned.
- **Hole depth bands** — upper/middle/deep renderer presentation for `CV-H1`.

## Persistence vocabulary

- **schema-v2** — current save schema.
- **gen3-v1** — new-journey generation identity.
- **gen2** — frozen compatibility generation for old/unversioned saves.
- **migration** — schema conversion while preserving generation identity.
- **save delta/runtime mutation** — persisted changes layered over deterministic generated baseline.

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
