# Project Noclip Code Navigation Map

Plain-text map for finding the part of the code that owns what you see. No Mermaid is used so this stays readable on a phone.

## Start here

```text
Browser starts
  -> src/main.ts
  -> src/app/ProjectNoclipGame.ts
       owns main runtime loop, player/camera, streaming coordination,
       renderer integration, save/runtime orchestration

World requested
  -> src/world/generator.ts
  -> Generation 3 path
       -> src/world/gen3.ts
       -> src/world/fields.ts
       -> src/world/gen3SpaceTopology.ts
       -> src/world/gen3SpaceTopologyDomain.ts
       -> src/world/gen3SpaceTopologyBuild.ts
       -> src/world/gen3ArchitectureCore.ts
  -> CellDescriptor
  -> src/renderer/WorldRenderer.ts
  -> src/renderer/cellBuilder.ts
  -> PlayCanvas scene
```

## Canonical terminology and world truth

```text
WORLD.md
  human-facing world laws/catalog

src/world/terminology.ts
  short conversation IDs
  Architecture Pattern IDs
  work modes / acceptance words

src/world/types.ts
  canonical TypeScript world data shapes and stable runtime ID unions

src/world/catalog.ts
  World Lab/runtime semantic catalog

docs/TERMINOLOGY.md
  complete code-facing glossary
```

Use these before inventing a new name.

## I want to change Ordinary Level 0 / O / O-A1

```text
O / ordinary-level-0
  -> src/world/fields.ts
       continuous Field values
  -> src/world/gen3.ts
       Region/environment resolution
  -> src/world/gen3SpaceTopologyDomain.ts
       world-space partition/topology decisions
  -> src/world/gen3SpaceTopologyBuild.ts
       walls, openings and final Cell fragments
  -> src/world/gen3ArchitectureCore.ts
       shared Gen3 architecture constants/helpers

O-A1 Default Wall
  -> gen3SpaceTopologyDomain.ts
  -> gen3SpaceTopologyBuild.ts
  -> renderer/cellBuilder.ts
  -> renderer/dev5Wallpaper.ts
```

If the complaint is “rooms feel wrong”, begin with Space Topology. If the topology is correct and only the visible wall is wrong, begin with renderer/material presentation instead.

## I want to change Pillar Field / P / P-A1

```text
P / pillar-field
  -> src/world/fields.ts
       pillarAffinity
  -> src/world/gen3ArchitectureCore.ts
       Pillar dimensions/lattice constants
  -> src/world/gen3SpaceTopologyBuild.ts
       Pillar placement + route clearance + Region-depth expression
  -> src/renderer/dev5FidelityPresentation.ts
       Pillar visible presentation
  -> src/renderer/dev5Wallpaper.ts
       Level 0 wallpaper mapping / world-space phase

P-A1.pier
  generation/collision -> gen3SpaceTopologyBuild.ts
  visible finish       -> dev5FidelityPresentation.ts + dev5Wallpaper.ts
```

## I want to change Arch Rooms / A / A-A1

```text
A / arch-rooms
  -> src/world/fields.ts
       archAffinity
  -> src/world/gen3ArchitectureCore.ts
       shared Arch dimensions
  -> src/world/gen3SpaceTopologyDomain.ts
       divider/topology ownership
  -> src/world/gen3SpaceTopologyBuild.ts
       semantic divider walls, route openings, collision structure
  -> src/renderer/dev6FollowupPresentation.ts
       curved/render-only Arch presentation
```

Piece map:

```text
A-A1 Arch Divider
  .pier
  .upper-mass
  .curve
  .lower-panel
  .termination

Collision/route question
  -> gen3SpaceTopologyBuild.ts first

Silhouette/material/depth question
  -> dev6FollowupPresentation.ts first

Cell seam/floating-piece question
  -> inspect both world-owned span/clipping in gen3SpaceTopologyBuild.ts
     and reconstruction/bridging in dev6FollowupPresentation.ts
```

## I want to change hole clusters / CV-H1

```text
CV-H1 / floor-hole-cluster
  -> src/world/gen3.ts
       environment/Carver decision path
  -> src/world/gen3ArchitectureCore.ts or related Gen3 helpers
       shared generation constraints where referenced
  -> generated FloorPatchSpec(kind='hole')
  -> src/renderer/cellBuilder.ts
       base floor cutting/presentation
  -> src/renderer/dev6FollowupPresentation.ts
       upper/middle/deep hole interior bands and void presentation
```

If holes are in the wrong places, investigate generation. If they look flat, discolored, seamed, or depthless, investigate presentation first.

## I want to change Blackout / C-B1

```text
C-B1 / blackout
  -> src/world/fields.ts
       blackoutPressure
  -> src/world/gen3.ts
       Condition resolution / escape cue
  -> src/world/lighting.ts
       fixture/light-state laws and light-field helpers
  -> src/renderer/fixtureCentricLightingCorrection.ts
       current dev.7 physical fixture-light ownership
  -> src/app/ProjectNoclipGame.ts
       flashlight/player runtime coordination
  -> src/renderer/WorldRenderer.ts
       scene-level lighting/fog presentation
```

Blackout is a Condition over recognizable Level 0 Geometry, not a Region.

## I want to change fluorescent lighting / M-F1

```text
fixture generation/state
  -> src/world/lighting.ts

fixture mesh / Cell render creation
  -> src/renderer/cellBuilder.ts

current accepted real fixture spots
  -> src/renderer/fixtureCentricLightingCorrection.ts

world renderer integration
  -> src/renderer/WorldRenderer.ts

player/camera flashlight
  -> src/app/ProjectNoclipGame.ts
```

Current production dev.7: each rendered active fluorescent fixture owns a real downward PlayCanvas spot; there is no player-nearest eight-light ownership pool.

## I want to change carpet/wall/ceiling materials

```text
stable material vocabulary
  -> src/world/types.ts
  -> src/world/catalog.ts
  -> WORLD.md

base render materials
  -> src/renderer/support.ts
  -> src/renderer/cellBuilder.ts

wallpaper phase/tiling
  -> src/renderer/dev5Wallpaper.ts

Region carpet profiles / hole presentation
  -> src/renderer/dev6FollowupPresentation.ts
```

Do not confuse a Material change with topology or Region-generation work.

## I want to change Regions or Fields

```text
src/world/fields.ts
  deterministic multi-scale scalar Fields

src/world/gen3.ts
  samples Fields and resolves semantic environment

src/world/gen3Architecture.ts
  public Gen3 architecture surface/adapter

src/world/gen3ArchitectureCore.ts
  shared architecture constants + helpers

src/world/gen3ArchitectureV5.ts
  accepted Generation 3 architecture implementation slice retained by current path

src/world/gen3SpaceTopology*.ts
  connectivity and partition architecture
```

After a durable world rule changes, update `WORLD.md` and the terminology surfaces when applicable.

## I want to change a Structure

```text
Manila Room / S-M1
  -> src/world/structures.ts
  -> src/world/generator.ts

Exit Structure / S-E1
  -> src/world/exits.ts
  -> src/world/generator.ts

Red Rooms / S-R1
  -> design required; do not implement Non-Euclidean behavior without approved deterministic design
```

## I want to change Transitions / exits

```text
src/world/exits.ts
  destination registry + trigger rules

src/world/generator.ts
  attaches Transition/Structure data to generated world

src/app/ProjectNoclipGame.ts
  runtime trigger/journey handling
```

A registered destination is not automatically a playable Level.

## I want to change items or inventory

```text
src/items/definitions.ts
  stable Item definition IDs and metadata

src/items/*
  item-specific generation/use helpers

src/inventory/*
  carried Item state/operations

src/renderer/objectCatalog.ts
  developer visual showcase models

src/app/ProjectNoclipGame.ts
  runtime use/drop/interact behavior
```

## I want to change movement or collision

```text
src/input/PlayerIntent.ts
  normalized keyboard/touch player intent

src/physics/*
  collision math / movement resolution

src/app/ProjectNoclipGame.ts
  player controller integration

src/ui/mobile-controls.css
  touch control presentation
```

If a route exists visually but cannot be crossed, compare generated collision geometry with renderer-only geometry before changing topology.

## I want to change saves

```text
src/persistence/*
  save schema, IndexedDB storage, migrations, recovery

src/world/types.ts
  generation identity carried by world data

src/app/ProjectNoclipGame.ts
  save/reload orchestration
```

Rules:

```text
old unversioned save -> frozen gen2
new journey          -> gen3-v1
current schema       -> v2
```

Do not silently regenerate an old journey into Gen3.

## I want to change timeline behavior

```text
src/simulation/*
  World Day / Exposure progression and timeline state

src/world/gen3.ts
  Region/Condition gates using timeline inputs

src/world/exits.ts
  Transition gates

src/world/structures.ts
  Structure availability gates
```

## I want to change audio

```text
src/audio/*
  ambience / fluorescent bed / lifecycle

src/world/lighting.ts
  deterministic light-state inputs that may affect electrical audio

src/app/ProjectNoclipGame.ts
  runtime audio integration
```

Never claim perceptual audio is verified unless it was actually listened to.

## I want to change UI or World Lab

```text
src/ui/GameUI.ts
  main DOM UI + World Lab controls + canonical vocabulary display

src/ui/regionDepthLab.ts
  Region-depth / visual QA bridge and deterministic target helpers

src/ui/*.css
  UI/mobile/World Lab presentation

src/renderer/objectCatalog.ts
  disposable World Lab object showcase

src/world/catalog.ts
  canonical World Lab world-category registry
```

## Renderer map

```text
src/renderer/WorldRenderer.ts
  top-level streamed scene renderer

src/renderer/cellBuilder.ts
  CellDescriptor -> PlayCanvas entities

src/renderer/support.ts
  shared material/mesh/render helpers

src/renderer/StaticWorldBatching.ts
  static render batching

src/renderer/dev5Wallpaper.ts
  Level 0 wallpaper UV/phase

src/renderer/dev5FidelityPresentation.ts
  dev.5 Pillar/fixture presentation corrections

src/renderer/dev6FollowupPresentation.ts
  Region carpet + holes + Arch curve follow-up presentation

src/renderer/fixtureCentricLightingCorrection.ts
  current dev.7 fixture-owned physical lighting

src/renderer/objectCatalog.ts
  developer showcase objects
```

## World-generation map

```text
src/world/types.ts
  shared generated-data types

src/world/hash.ts
  deterministic hash/random helpers

src/world/fields.ts
  continuous Fields

src/world/gen3.ts
  Generation 3 environment/layout entry

src/world/gen3Architecture*.ts
  architecture helpers/accepted slices

src/world/gen3SpaceTopology.ts
  topology public surface

src/world/gen3SpaceTopologyDomain.ts
  world-space topology domains/walls/portals

src/world/gen3SpaceTopologyBuild.ts
  clips/builds topology into Cell wall/prop fragments

src/world/generator.ts
  main generation dispatcher; Gen3 + frozen Gen2 paths

src/world/lighting.ts
  deterministic fixture/light data

src/world/exits.ts
  Transitions

src/world/structures.ts
  special Structures

src/world/catalog.ts
  semantic World Lab catalog

src/world/terminology.ts
  human short-address registry
```

## Repository-level truth

```text
AGENTS.md
  rules for agents working in this repo

PROJECT.md
  product purpose, scope and durable constraints

STATUS.md
  accepted production state only

WORLD.md
  canonical human-facing world bible

docs/TERMINOLOGY.md
  code-facing glossary and short IDs

docs/CODE_MAP.md
  this navigation map

docs/references/level-0/REFERENCES.md
  raw reference provenance ledger

docs/adr/*
  durable engineering decisions

docs/audits/*
  stored full audits
```

## Verification map

```text
npm run typecheck
  TypeScript correctness

npm test
  deterministic/system tests

npm run benchmark
  10,000-Cell generation/performance/topology gates

npm run build
  production build

.github/workflows/ci.yml
  primary CI

.github/workflows/renderer-compare.yml
  renderer regression comparison

.github/workflows/visual-coherence.yml
  close-range player-facing visual evidence

.github/workflows/production-smoke.yml
  production browser smoke

.github/workflows/profile-production.yml
  production profiling/evidence
```

## Fast conversation examples

```text
“A-A1.lower-panel is too thick.”
  -> Arch visual geometry only.

“P-A1 is blocking solved openings.”
  -> Pillar placement / route reservation.

“O-A1 rooms are too airy.”
  -> Ordinary Space Topology, not wallpaper.

“CV-H1 looks flat.”
  -> Hole presentation before Carver placement.

“C-B1 has no escape indication.”
  -> Blackout Condition / escape cue / lighting presentation.

“M-F1 turns on when I approach.”
  -> fixture-light ownership/presentation, not room topology.
```
