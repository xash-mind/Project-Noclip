# Project Noclip Code Navigation Map

Phone-friendly plain-text ownership map. Use this to find the authoritative file before editing; current implementation wins if this map is ever stale.

## Runtime path

```text
browser
  -> src/main.ts
  -> src/app/ProjectNoclipGame.ts
       runtime loop, player/camera, streaming, save/runtime coordination

world request
  -> src/world/generator.ts
  -> Generation 3
       -> src/world/gen3.ts
       -> src/world/fields.ts
       -> src/world/gen3SpaceTopology.ts
       -> src/world/gen3SpaceTopologyDomain.ts
       -> src/world/gen3SpaceTopologyBuild.ts
       -> src/world/gen3Architecture.ts
       -> src/world/gen3ArchitectureCore.ts
  -> CellDescriptor
  -> src/renderer/WorldRenderer.ts
  -> src/renderer/cellBuilder.ts
  -> Level 0 presentation layers
  -> PlayCanvas scene
```

## Canonical truth

```text
WORLD.md
  accepted human-facing world laws/content

src/world/types.ts
  canonical generated-data shapes and stable runtime IDs

src/world/terminology.ts
  short human addresses and Architecture Pattern registry

docs/TERMINOLOGY.md
  canonical code-facing glossary + implementation owners

docs/CODE_MAP.md
  navigation only
```

Short addresses never replace save/runtime identity.

## I want to change O-A1

```text
O / ordinary-level-0
  Fields/Region resolution -> src/world/fields.ts + src/world/gen3.ts
  topology ownership       -> src/world/gen3SpaceTopologyDomain.ts
  walls/openings/fragments -> src/world/gen3SpaceTopologyBuild.ts
  shared dimensions        -> src/world/gen3ArchitectureCore.ts

O-A1 Default Wall
  semantic wall/opening -> src/world/gen3SpaceTopologyBuild.ts
  base entity creation  -> src/renderer/cellBuilder.ts
  wallpaper/UV/collision presentation rule -> src/renderer/level0Wallpaper.ts
  visible surface presentation             -> src/renderer/level0SurfacePresentation.ts
```

If rooms feel architecturally wrong, start with Space Topology. If topology is right and only the visible surface is wrong, start in renderer presentation.

## I want to change P-A1

```text
P / pillar-field
  affinity/depth       -> src/world/fields.ts
  lattice dimensions  -> src/world/gen3ArchitectureCore.ts
  placement/clearance -> src/world/gen3SpaceTopologyBuild.ts

P-A1.pier
  generation/collision -> src/world/gen3SpaceTopologyBuild.ts
  visible finish       -> src/renderer/level0SurfacePresentation.ts
  wallpaper phase      -> src/renderer/level0Wallpaper.ts
```

## I want to change A-A1 or A-A1.curve

```text
A / arch-rooms
  affinity             -> src/world/fields.ts
  shared dimensions    -> src/world/gen3ArchitectureCore.ts
  divider/topology     -> src/world/gen3SpaceTopologyDomain.ts
  semantic walls/routes-> src/world/gen3SpaceTopologyBuild.ts

A-A1 pieces
  .pier / .upper-mass / .lower-panel / .termination
    semantic ownership -> src/world/gen3SpaceTopologyBuild.ts

  .curve
    render-only reconstruction -> src/renderer/level0RegionPresentation.ts

Arch-only bucket / open paint-can Features
  deterministic placement -> src/world/gen3SpaceTopologyBuild.ts
  procedural prop geometry -> src/renderer/cellBuilder.ts
  World Lab showcase       -> src/renderer/objectCatalog.ts

Arch surface finish
  -> src/renderer/level0SurfacePresentation.ts
  -> src/renderer/level0Wallpaper.ts
```

If a route exists visually but is blocked, inspect world-owned semantic collision before changing renderer-only curves.

## I want to change CV-H1

```text
CV-H1 / floor-hole-cluster
  Carver decision / generated FloorPatchSpec
    -> src/world/gen3.ts
    -> src/world/generator.ts

  base segmented floor
    -> src/renderer/WorldRenderer.ts
    -> src/renderer/cellBuilder.ts

  upper/middle/deep Hole presentation + void
    -> src/renderer/level0RegionPresentation.ts
```

Wrong location/density = generation. Flat/seamed/depthless appearance = presentation.

## I want to change C-B1

```text
C-B1 / Blackout Condition
  pressure/resolution  -> src/world/fields.ts + src/world/gen3.ts
  local fixture laws  -> src/world/lighting.ts
  real fixture lights -> src/renderer/fixtureLighting.ts
  flashlight/runtime  -> src/app/ProjectNoclipGame.ts
  ambience sample     -> src/renderer/WorldRenderer.ts -> src/world/lighting.ts
```

Blackout is a Condition over recognizable Level 0 Geometry, not a Region.

## I want to change fluorescent lighting

```text
fixture generation/state/flicker
  -> src/world/lighting.ts

fixture mesh creation
  -> src/renderer/cellBuilder.ts

fixture mesh presentation
  -> src/renderer/level0SurfacePresentation.ts

accepted physical light ownership
  -> src/renderer/fixtureLighting.ts

runtime update call / flashlight
  -> src/app/ProjectNoclipGame.ts
```

Current law: every rendered fluorescent fixture owns its real downward spot. The sampled light field is ambience/diagnostics only; no player-nearest realtime-light allocator exists.

## I want to change materials

```text
stable Material vocabulary -> src/world/types.ts + src/world/catalog.ts + WORLD.md
base renderer materials     -> src/renderer/support.ts + src/renderer/cellBuilder.ts
Level 0 wallpaper phase     -> src/renderer/level0Wallpaper.ts
base surfaces/pillar faces  -> src/renderer/level0SurfacePresentation.ts
Region carpet/Hole finish   -> src/renderer/level0RegionPresentation.ts
```

## I want to change topology

```text
src/world/gen3SpaceTopology.ts
  stable public topology surface

src/world/gen3SpaceTopologyDomain.ts
  world-space domains, partitions, portals

src/world/gen3SpaceTopologyBuild.ts
  realizes topology into Cell wall/prop fragments

src/world/gen3Architecture.ts
  stable Generation 3 architecture public surface

src/world/gen3ArchitectureCore.ts
  shared Architecture Pattern dimensions/helpers
```

Do not start in renderer files for a topology problem.

## I want to change collision

```text
generated wall/prop collision intent
  -> src/world/gen3SpaceTopologyBuild.ts

renderer Cell collider registration
  -> src/renderer/cellBuilder.ts
  -> src/renderer/WorldRenderer.ts

Arch floor-reaching presentation filter
  -> src/renderer/level0Wallpaper.ts
  -> src/renderer/level0SurfacePresentation.ts

movement solver
  -> src/physics/*
  -> src/app/ProjectNoclipGame.ts
```

## I want to change Cell streaming

```text
movement/boundary detection -> src/app/ProjectNoclipGame.ts
Render Distance scope       -> src/renderer/renderSettingsRuntime.ts + src/renderer/renderSettings.ts
predictive/budgeted work    -> src/renderer/streamingScheduler.ts
Cell build/collider registry-> src/renderer/WorldRenderer.ts + src/renderer/cellBuilder.ts
retained fixture resources  -> src/renderer/fixtureLighting.ts
localized static batches    -> src/renderer/StaticWorldBatching.ts
```

Cells remain deterministic cache addresses. Streaming changes when a descriptor is prepared, never what that Cell is.

## I want to change saves

```text
src/persistence/*
  schema, IndexedDB, migrations, corruption recovery

src/world/types.ts
  generation identity carried by world data

src/app/ProjectNoclipGame.ts
  save/reload orchestration
```

```text
old unversioned save -> frozen gen2
new journey          -> gen3-v1
current schema       -> v2
```

Never regenerate an old journey into Gen3 merely for cleanup.

## I want to change World Lab

```text
src/ui/GameUI.ts
  controls and canonical vocabulary display

src/ui/regionDepthLab.ts
  deterministic Region-depth/visual QA bridge

src/world/catalog.ts
  semantic catalog

src/renderer/objectCatalog.ts
  disposable visual showcase
```

## I want to add a Region

```text
1. WORLD.md
   define accepted world rule/status
2. src/world/types.ts
   stable runtime type/ID only if approved
3. src/world/fields.ts
   geography Field when applicable
4. src/world/gen3.ts
   semantic resolution
5. src/world/gen3SpaceTopology*.ts / gen3ArchitectureCore.ts
   architecture only if the Region owns it
6. src/world/catalog.ts + src/world/terminology.ts
   catalog/short address when useful
7. docs/TERMINOLOGY.md + docs/CODE_MAP.md
   navigation after ownership exists
8. tests
   deterministic geography/topology/navigation/regression coverage
```

Do not route new Regions through Gen2 `ZoneId`/district/archetype composition.

## I want to add a Carver

```text
1. WORLD.md
   define the Carver and allowed effects
2. src/world/types.ts
   stable generated representation if needed
3. src/world/gen3.ts / generator path
   deterministic placement/application
4. renderer files only for presentation of generated output
5. tests
   deterministic placement + topology/collision/save invariants
6. terminology/CODE_MAP only if the Carver deserves a durable human address
```

## Structures and Transitions

```text
Manila Room / S-M1 -> src/world/structures.ts + src/world/generator.ts
Exit Structure / S-E1 -> src/world/exits.ts + src/world/generator.ts
Transitions -> src/world/exits.ts + src/app/ProjectNoclipGame.ts
```

A registered destination is not automatically a playable Level.

## Renderer ownership

```text
src/renderer/WorldRenderer.ts
  streamed scene ownership, collision registry, Hole floor segmentation,
  sampled light-field bridge, interactions/marks/showcase

src/renderer/cellBuilder.ts
  CellDescriptor -> base PlayCanvas entities

src/renderer/level0Wallpaper.ts
  Level 0 wallpaper palette/tile/world phase + floor-reaching Gen3 wall rule

src/renderer/level0SurfacePresentation.ts
  Level 0 surfaces, pillar faces, fixture mesh presentation, Arch collider filter

src/renderer/level0RegionPresentation.ts
  Region carpet presentation, Hole depth bands, render-only Arch curves/bridges

src/renderer/fixtureLighting.ts
  fixture-owned real fluorescent spots and pulse synchronization

src/renderer/StaticWorldBatching.ts
  installs Region presentation + fixture lighting, then batches static visuals

src/renderer/support.ts
  shared renderer helpers

src/renderer/objectCatalog.ts
  developer-only World Lab showcase
```

## World-generation ownership

```text
src/world/hash.ts                 deterministic hashing
src/world/types.ts                generated-data types / stable IDs
src/world/fields.ts               continuous Fields
src/world/gen3.ts                 Gen3 semantic environment resolution
src/world/gen3Architecture.ts     stable architecture public surface
src/world/gen3ArchitectureCore.ts shared architecture constants/helpers
src/world/gen3SpaceTopology.ts    topology public surface
src/world/gen3SpaceTopologyDomain.ts world-space topology decisions
src/world/gen3SpaceTopologyBuild.ts  Cell realization / routes / Pillars / Arch semantic pieces
src/world/generator.ts            Gen3 + frozen Gen2 dispatcher
src/world/lighting.ts             deterministic fixture state + ambience light-field sampling
src/world/exits.ts                Transitions
src/world/structures.ts           Structures
src/world/catalog.ts              semantic World Lab catalog
src/world/terminology.ts          human short-address registry
```

Stable generated IDs containing historical strings such as `gen3-v5-*` are deterministic identity and are intentionally not cosmetic-renamed.

## Verification map

```text
npm run typecheck -> strict TypeScript
npm test          -> all tests/*.test.mjs deterministic/system coverage
npm run benchmark -> generation/performance/topology gates
npm run build     -> production build

.github/workflows/ci.yml
  primary CI

.github/workflows/visual-coherence.yml
  browser/mobile/visual coherence + benchmark/build

.github/workflows/renderer-compare.yml
  renderer regression comparison

.github/workflows/production-smoke.yml
  production browser smoke

.github/workflows/profile-production.yml
  production profiling evidence
```
