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
  -> CellDescriptor / semantic world truth
  -> src/presentation/* when a migrated target has a PAU Representation Binding
       -> Representation Registry
       -> Geometry Registry / Asset Registry / Material Definitions
       -> resolved presentation data
  -> src/renderer/WorldRenderer.ts
  -> src/renderer/cellBuilder.ts
  -> Level 0 presentation adapters
  -> PlayCanvas scene
```

The PAU layer never participates in world generation. Presentation IDs are not generated world IDs.

Development-only Studio adds a second, isolated path:

```text
npm run studio
  -> tools/studio/runner.mjs
       -> existing Vite game dev server
       -> loopback tools/studio/server.mjs
       -> tools/studio/client/*
  -> src/dev/studioBridgeClient.ts (DEV only)
  <-> explicit bridge messages
  -> canonical src/presentation/* contracts
```

Studio privileged code is not part of the production game path.

## Canonical truth

```text
WORLD.md
  accepted human-facing world laws/content

PROJECT.md
  product/architecture invariants

src/world/types.ts
  canonical generated-data shapes and stable runtime IDs

src/world/terminology.ts
  short human addresses and Architecture Pattern registry

docs/TERMINOLOGY.md
  canonical code-facing glossary + implementation owners

docs/PRESENTATION_ARCHITECTURE.md
  PAU / LCG / NAL / DevelopmentContext / ChangeReceipt contracts

docs/NOCLIP_STUDIO.md
  local Studio workflow, security, Git and authoring boundary

docs/CODE_MAP.md
  navigation only
```

Short addresses, Representation IDs and Asset IDs never replace save/runtime identity.

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

If rooms feel architecturally wrong, start with Space Topology. If topology is right and only the visible surface is wrong, start in presentation.

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

P-A1 is not yet structured-editable through PAU. Studio exposes it as a read-only semantic target with source ownership and code-change handoff.

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

Arch-only Bucket / Open Paint Can Features
  deterministic placement + stable world IDs
    -> src/world/gen3SpaceTopologyBuild.ts
  canonical structured Representation source
    -> src/presentation/definitions/level0-features.json
    -> scripts/build-presentation-definitions.mjs
    -> src/presentation/generatedLevel0FeatureDefinitions.ts
  semantic bindings / hydrated definitions
    -> src/presentation/level0FeatureRepresentations.ts
    -> src/presentation/projectPresentationRegistry.ts
  temporary Studio preview overrides
    -> src/presentation/previewOverrides.ts
  reusable LCG mesh data
    -> src/presentation/geometry.ts
  presentation materials
    -> src/presentation/materials.ts
  PlayCanvas adapter
    -> src/renderer/level0FeaturePresentation.ts
  narrow PAU pilot bridge
    -> src/renderer/pauFeaturePresentationPilot.ts
  legacy/non-pilot base path
    -> src/renderer/cellBuilder.ts
  World Lab showcase catalog
    -> src/renderer/objectCatalog.ts

Arch surface finish
  -> src/renderer/level0SurfacePresentation.ts
  -> src/renderer/level0Wallpaper.ts
```

A-A1 itself remains read-only in Studio until its presentation is migrated. If a route exists visually but is blocked, inspect world-owned semantic collision before changing renderer-only presentation.

## I want to change PAU presentation metadata

```text
src/presentation/types.ts
  RepresentationId / GeometryId / AssetId / material IDs
  RepresentationDefinition / RepresentationBinding contracts
  LCG / collision / editable metadata vocabulary

src/presentation/registry.ts
  binding validation + deterministic representation fallbacks

src/presentation/definitions/level0-features.json
  human-authored PAU Run 1/2 pilot definitions and bindings

scripts/build-presentation-definitions.mjs
  schema validation + generated typed module

src/presentation/generatedLevel0FeatureDefinitions.ts
  generated source; do not hand-edit

src/presentation/level0FeatureRepresentations.ts
  hydrates the pilot registry from generated source

src/presentation/projectPresentationRegistry.ts
  Studio-facing project registry: migrated + read-only semantic metadata

src/presentation/readOnlyPresentationMetadata.ts
  source/test/diagnostic ownership for non-migrated Studio targets

src/presentation/previewOverrides.ts
  temporary runtime parameter / Representation Binding overlays

src/presentation/materials.ts
  presentation-owned material definitions

src/presentation/developmentContext.ts
  development-context-v1 design/runtime inspection contract

src/presentation/developmentContextExports.ts
  human packet / JSON / full development prompt from the canonical context

src/presentation/changeReceipt.ts
  change-receipt-v1 development evidence contract

src/presentation/changeReceiptExports.ts
  human receipt / JSON export from canonical receipt data

src/presentation/stableSerialization.ts
  canonical stable JSON serialization
```

Do not make Studio or agents scrape arbitrary TypeScript line numbers when this metadata can express the target directly.

## I want to use Noclip Studio

```text
npm run studio
  -> tools/studio/runner.mjs

Studio privileged local backend / Git / safe writes / validation
  -> tools/studio/server.mjs
  -> tools/studio/server-core.mjs
  -> tools/studio/canonical-cli.mjs

Studio UI
  -> tools/studio/client/index.html
  -> tools/studio/client/studio.js
  -> tools/studio/client/styles.css

Game <-> Studio structured bridge
  -> src/dev/studioBridgeProtocol.ts
  -> src/dev/studioBridgeClient.ts

World Lab semantic handoff
  -> src/dev/worldLabStudioIntegration.ts

Studio checks
  -> tools/studio/check.mjs
  -> tools/studio/smoke.mjs
  -> tools/studio/validate-target.mjs
  -> tests/studio-foundation.test.mjs

Production boundary scan
  -> scripts/check-production-studio-boundary.mjs

Workflow / limitations / security docs
  -> docs/NOCLIP_STUDIO.md
```

World Lab = runtime QA/forcing. Studio = local source-backed authoring, assets, diffs, validation, DevelopmentContext and ChangeReceipt. Studio is not a Git merge/push/deploy client and is not a production runtime.

## I want to change LCG geometry

```text
src/presentation/geometry.ts
  pure deterministic mesh-data builders + Geometry Registry
  bounds / UVs / normals / winding / duplicate-surface diagnostics

docs/PRESENTATION_ARCHITECTURE.md
  LCG class, seam, normal and bevel policies
```

Current reusable builders: box, plane, prism, cylinder, open cylinder, tapered open container, strip, extruded profile and Arch/profile extrusion foundation.

Do not use LCG to create a different Low-preset world geometry path.

## I want to add or replace an asset (NAL)

```text
assets/source/{images,audio,meshes}/
  source content only

assets/definitions/*.json
  small human-readable semantic definitions

scripts/build-assets.mjs
  definition validation + SHA-256 content hashing + runtime copy

assets/generated/registry.json
src/presentation/generatedAssetRegistry.ts
  generated runtime registry evidence

public/assets/runtime/
  generated runtime content; gitignored

src/presentation/assets.ts
  Asset IDs, profiles, image/audio/mesh contracts, GLB convention,
  source/runtime types, validation and runtime fallback resolution

tools/studio/server-core.mjs
  local import validation, canonical destination allowlist, NAL build + receipt

tools/studio/client/*
  Images / Audio / Meshes library and import UI
```

World/game code should bind semantic Asset IDs through presentation definitions. Do not import arbitrary `assets/source/...` paths from world generation.

## I want a Studio/agent context packet

```text
src/presentation/developmentContext.ts
  DevelopmentContext source of truth
  design target is explicit
  runtime instance is optional and separately explicit

src/presentation/developmentContextExports.ts
  signal-first human packet + full agent prompt

src/presentation/stableSerialization.ts
  stable versioned JSON packet serialization

tools/studio/canonical-cli.mjs
  backend consumer of the same compiled canonical PAU contract
```

Use source/test paths as references; do not dump whole source files into the context contract.

## I want a structured edit receipt

```text
src/presentation/changeReceipt.ts
  ChangeReceipt source of truth
  before/after values, binding/assets/files, validation,
  deterministic/save checks and optional commit/PR/preview/revert refs

src/presentation/changeReceiptExports.ts
  human/JSON view from the same canonical receipt

.noclip-studio/receipts/
  gitignored local convenience/evidence envelopes + safe targeted revert data
```

DevelopmentContext describes state before/during work. ChangeReceipt records evidence after an operation. Git/source remains authoritative.

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

Wrong location/density = generation. Flat/seamed/depthless appearance = presentation. Studio currently inspects CV-H1 but does not expose world-generation parameters as presentation sliders.

## I want to change C-B1

```text
C-B1 / Blackout Condition
  pressure/resolution  -> src/world/fields.ts + src/world/gen3.ts
  local fixture laws  -> src/world/lighting.ts
  real fixture lights -> src/renderer/fixtureLighting.ts
  flashlight/runtime  -> src/app/ProjectNoclipGame.ts
  ambience sample     -> src/renderer/WorldRenderer.ts -> src/world/lighting.ts
```

Blackout is a Condition over recognizable Level 0 Geometry, not a Region. Studio currently treats it as a read-only semantic target.

## I want to change fluorescent lighting/audio

```text
fixture generation/state/flicker
  -> src/world/lighting.ts

fixture mesh creation
  -> src/renderer/cellBuilder.ts

fixture mesh presentation
  -> src/renderer/level0SurfacePresentation.ts

accepted physical light ownership
  -> src/renderer/fixtureLighting.ts

procedural ambience/hum runtime
  -> src/audio/Ambience.ts

future file-backed audio Asset contract
  -> src/presentation/assets.ts

runtime update call / flashlight
  -> src/app/ProjectNoclipGame.ts
```

Current law: every rendered fluorescent fixture owns its real downward light/shadow behavior. The sampled light field is ambience/diagnostics only. PAU Run 2 does not convert the procedural hum to a source Asset.

## I want to change materials

```text
stable world Material vocabulary -> src/world/types.ts + src/world/catalog.ts + WORLD.md
PAU presentation materials       -> src/presentation/materials.ts
base renderer materials          -> src/renderer/support.ts + src/renderer/cellBuilder.ts
Level 0 wallpaper phase          -> src/renderer/level0Wallpaper.ts
base surfaces/pillar faces       -> src/renderer/level0SurfacePresentation.ts
Region carpet/Hole finish        -> src/renderer/level0RegionPresentation.ts
```

A world Material ID and a PAU presentation material ID are different layers. Do not silently use a presentation rename to change world semantics.

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

Do not start in presentation/renderer/Studio files for a topology problem.

## I want to change collision

```text
generated wall/prop collision intent
  -> src/world/gen3SpaceTopologyBuild.ts

renderer Cell collider registration
  -> src/renderer/cellBuilder.ts
  -> src/renderer/WorldRenderer.ts

PAU visual/import collision metadata
  -> src/presentation/types.ts
  -> src/presentation/assets.ts

Arch floor-reaching presentation filter
  -> src/renderer/level0Wallpaper.ts
  -> src/renderer/level0SurfacePresentation.ts

movement solver
  -> src/physics/*
  -> src/app/ProjectNoclipGame.ts
```

Imported render triangles are not automatic collision meshes.

## I want to change Cell streaming

```text
movement/boundary detection -> src/app/ProjectNoclipGame.ts
Render Distance scope       -> src/renderer/renderSettingsRuntime.ts + src/renderer/renderSettings.ts
predictive/budgeted work    -> src/renderer/streamingScheduler.ts
Cell build/collider registry-> src/renderer/WorldRenderer.ts + src/renderer/cellBuilder.ts
retained fixture resources  -> src/renderer/fixtureLighting.ts
localized static batches    -> src/renderer/StaticWorldBatching.ts
```

Cells remain deterministic cache addresses. Streaming changes when a descriptor is prepared, never what that Cell is. Studio preview may rebuild presentation for already-generated descriptors; it does not change their world truth.

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

Presentation definitions, Studio preview state, source Assets, runtime asset paths, DevelopmentContext and ChangeReceipt do not belong in ordinary save identity.

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

src/dev/worldLabStudioIntegration.ts
  DEV-only semantic target / Inspect / Isolate / Open in Studio handoff
```

World Lab remains runtime inspection / QA / forcing. Noclip Studio owns source-backed authoring; World Lab does not gain filesystem/Git/source-writing authority.

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
7. presentation binding only if the Region needs independent representation metadata
8. docs/TERMINOLOGY.md + docs/CODE_MAP.md
   navigation after ownership exists
9. tests
   deterministic geography/topology/navigation/regression coverage
```

Do not route new Regions through Gen2 `ZoneId`/district/archetype/component composition.

## I want to add a Carver

```text
1. WORLD.md
   define the Carver and allowed effects
2. src/world/types.ts
   stable generated representation if needed
3. src/world/gen3.ts / generator path
   deterministic placement/application
4. presentation/renderer only for representation of generated output
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

## Presentation ownership

```text
src/presentation/types.ts
  canonical PAU contracts and presentation identity types

src/presentation/registry.ts
  Representation Binding/Registry resolution + fallback

src/presentation/geometry.ts
  deterministic LCG Geometry Registry

src/presentation/materials.ts
  presentation Material Definitions

src/presentation/assets.ts
  NAL contracts/profiles/import convention + Asset Registry resolution

src/presentation/generatedAssetRegistry.ts
  generated runtime Asset registry

src/presentation/definitions/level0-features.json
  canonical source-backed Bucket/Can representation data

src/presentation/level0FeatureRepresentations.ts
  hydrated pilot bindings/definitions

src/presentation/readOnlyPresentationMetadata.ts
  semantic inspection metadata for not-yet-migrated Studio targets

src/presentation/projectPresentationRegistry.ts
  combined Studio-facing presentation registry

src/presentation/previewOverrides.ts
  dev runtime preview layer above canonical definitions

src/presentation/developmentContext.ts
  development-context-v1

src/presentation/changeReceipt.ts
  change-receipt-v1
```

## Renderer ownership

```text
src/renderer/WorldRenderer.ts
  streamed scene ownership, collision registry, Hole floor segmentation,
  sampled light-field bridge, interactions/marks/showcase

src/renderer/cellBuilder.ts
  CellDescriptor -> base PlayCanvas entities; legacy non-pilot prop presentation remains intact

src/renderer/pauFeaturePresentationPilot.ts
  bounded interception for Bucket/Can before legacy prop presentation

src/renderer/level0FeaturePresentation.ts
  PlayCanvas translation for canonical Bucket/Can PAU data + DEV Studio preview resolution

src/renderer/level0Wallpaper.ts
  Level 0 wallpaper palette/tile/world phase + floor-reaching Gen3 wall rule

src/renderer/level0SurfacePresentation.ts
  Level 0 surfaces, pillar faces, fixture mesh presentation, Arch collider filter

src/renderer/level0RegionPresentation.ts
  Region carpet presentation, Hole depth bands, render-only Arch curves/bridges

src/renderer/fixtureLighting.ts
  fixture-owned real fluorescent lights/shadows and pulse synchronization

src/renderer/StaticWorldBatching.ts
  installs Region presentation + fixture lighting, then batches static visuals per Cell

src/renderer/support.ts
  shared renderer helpers

src/renderer/objectCatalog.ts
  developer-only World Lab showcase
```

## World-generation ownership

```text
src/world/hash.ts                    deterministic hashing
src/world/types.ts                   generated-data types / stable IDs
src/world/fields.ts                  continuous Fields
src/world/gen3.ts                    Gen3 semantic environment resolution
src/world/gen3Architecture.ts        stable architecture public surface
src/world/gen3ArchitectureCore.ts    shared architecture constants/helpers
src/world/gen3SpaceTopology.ts       topology public surface
src/world/gen3SpaceTopologyDomain.ts world-space topology decisions
src/world/gen3SpaceTopologyBuild.ts  Cell realization / routes / Pillars / Arch semantic pieces
src/world/generator.ts               Gen3 + frozen Gen2 dispatcher
src/world/lighting.ts                deterministic fixture state + ambience light-field sampling
src/world/exits.ts                   Transitions
src/world/structures.ts              Structures
src/world/catalog.ts                 semantic World Lab catalog
src/world/terminology.ts             human short-address registry
```

Stable generated IDs containing historical strings such as `gen3-v5-*` are deterministic identity and are intentionally not cosmetic-renamed.

## Verification map

```text
npm run presentation:build -> PAU structured definition validation + generated typed source
npm run assets:build       -> NAL definition validation + content hashing + generated registries
npm run studio             -> local game + loopback Noclip Studio development companion
npm run studio:check       -> Studio syntax + canonical PAU compile + loopback smoke
npm run studio:validate    -> focused PAU/Studio target validation
npm run typecheck          -> strict TypeScript
npm test                   -> Studio smoke + all tests/*.test.mjs deterministic/system coverage
npm run benchmark          -> generation/performance/topology gates
npm run build              -> PAU/NAL build + production Vite build + Studio privilege-leak scan

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
