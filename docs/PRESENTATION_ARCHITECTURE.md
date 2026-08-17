# Presentation Architecture Upgrade (PAU)

This document is the canonical developer-facing foundation for Project Noclip presentation architecture. It does not redefine `WORLD.md`; world generation remains authoritative for what exists.

## Core invariant

```text
WORLD IDENTITY
!=
VISUAL / AUDIO REPRESENTATION
!=
SOURCE ASSET
```

World generation defines **what exists**. PAU defines **how a semantic target is represented**. NAL source assets provide optional content to a representation.

Presentation edits must not silently alter world seeds, deterministic spawn decisions, semantic/generated IDs, Region/Condition/Carver/Structure identity, topology, world position, generation version, Journey identity, or save identity. A generated Medium Bucket remains the same generated Bucket when its representation changes.

## Canonical pipeline

```text
WORLD TRUTH
  -> SEMANTIC OBJECT
  -> REPRESENTATION BINDING
  -> REPRESENTATION DEFINITION
  -> GEOMETRY REGISTRY / ASSET REGISTRY / MATERIAL DEFINITIONS
  -> PRESENTATION DATA
  -> RENDERER
```

The renderer translates resolved presentation data into PlayCanvas objects. It should not decide semantic world content or hard-code arbitrary source paths.

## Representation layer

Canonical code lives under `src/presentation/`.

- `RepresentationId` is presentation identity, never generated world identity.
- `RepresentationDefinition` owns geometry/material/asset references, editable parameters, LCG class, collision mode, fallbacks, source/test references and diagnostics.
- `RepresentationBinding` maps a semantic design target to a Representation ID.
- `resolveRepresentation(...)` follows explicit fallback chains and ends at a safe debug representation when configured.
- `withRepresentationBinding(...)` creates a presentation-only rebind snapshot and preserves the prior representation as the default fallback.

PAU Run 1 introduces presentation design-target IDs for the pilot Features:

```text
feature.medium-bucket
  -> bucket.default
  -> geometry.tapered-open-container
  -> material.bucket.aged-neutral

feature.small-grey-open-paint-can
  -> paint-can.grey-open
  -> geometry.tapered-open-container
  -> material.paint-can.grey
```

These are **PAU design-target identifiers**. They do not replace `PropSpec.id`, world addresses, `prop:bucket` / `prop:paint-can` World Lab catalog addresses, or save IDs.

## LCG — Low-Complexity Geometry

LCG is the canonical geometry construction standard. It is not a graphics preset and does not imply visibly faceted silhouettes.

```text
LCG-0  simple planar / structural geometry
LCG-1  simple constructed object
LCG-2  curved or silhouette-sensitive object
LCG-3  distinctive / special object
LCG-X  explicit justified exception
```

Use the fewest geometric elements required to preserve silhouette, structure, physical readability and atmosphere. Prefer few large shapes; avoid decorative micro-geometry, hidden surfaces, overlap patches, coplanar duplicates and geometry detail better represented by materials/textures/lighting.

Profile-specific `recommendedTriangles` and `warningTriangles` are guidance, not one global cap.

### Seamlessness

Where practical:

```text
ONE PHYSICAL OBJECT = ONE CANONICAL VISIBLE SURFACE
```

Use continuous generated meshes, exact edge handoffs and explicit trimming. Duplicate visible faces, z-fighting and overlap patches are defects, not Backrooms irregularity.

### Normals

- Structural 90-degree edges stay hard.
- Intentional curves use smooth circumference/curve normals.
- Hard rim/material transitions may duplicate edge vertices for normal discontinuity without duplicating visible surfaces.
- Do not smooth structural corners merely to conceal low complexity.

### Bevels

Architecture normally has no explicit bevel geometry. Small prominent Features may use a minimal edge break only when silhouette or lighting clearly benefits. Background objects normally have none.

### Controlled imperfection

The desired model is:

```text
CLEAN GEOMETRY + CONTROLLED DETERMINISTIC IMPERFECTION
```

Representation parameters may expose deterministic dimensional variation, alignment/profile/depth bias, scale variation, wear seed or minor skew. Broken/overlapping geometry is never the mechanism for imperfection.

## Geometry Registry

`src/presentation/geometry.ts` owns deterministic mesh-data builders independent of PlayCanvas:

- box;
- plane;
- prism;
- cylinder;
- open cylinder;
- tapered open container;
- strip;
- convex profile extrusion helper;
- Arch/profile extrusion foundation.

Builders own vertices, indices, winding, UVs, normals, pivot/origin, bounds and visible-face selection. Generated meshes are validated for finite values, valid indices and exact duplicate triangles.

The PAU Run 1 Bucket/Can pilot uses one continuous tapered-open-container mesh for outer body, rim, inner wall and recessed cavity floor. The visible dimensions and world transform still come from the existing generated `PropSpec`; generation is not rewritten. A narrow startup bridge in `src/renderer/pauFeaturePresentationPilot.ts` intercepts only these two Features before the legacy `cellBuilder` prop presentation path. That bridge is deliberately bounded migration scaffolding, not a second presentation architecture; future migrations should move more renderer consumers directly onto resolved PAU data and retire bypassed legacy object-specific code when safe.

## NAL — Noclip Asset Library

NAL separates human source files from validated runtime assets:

```text
assets/source/
  human-provided images/audio/meshes

assets/definitions/
  small human-readable definitions

npm run assets:build
  validation + SHA-256 content hash + runtime copy

public/assets/runtime/
  generated runtime files

assets/generated/registry.json
src/presentation/generatedAssetRegistry.ts
  generated registries
```

Game/world code must address content by stable semantic `AssetId`, not arbitrary file paths. `AssetId` and `contentHash` are intentionally separate: replacing the content of `level0.wallpaper.default` changes its hash but does not require a new semantic Asset ID.

### Asset definitions

Definitions support stable ID, type, role/profile, source, fallback, provenance, author/licensing notes and role-specific image/audio/mesh metadata. The build rejects duplicate/invalid IDs, wrong profile/type combinations, missing sources, source-path escapes and broken fallbacks.

### Profiles

Initial reusable profiles are:

- Wall Texture
- Floor Texture
- Ceiling Texture
- Prop Texture
- UI Image
- Reference Image
- Ambient Audio
- Spatial Audio
- UI Audio
- Feature Mesh
- Structure Mesh
- Item Mesh
- Entity Mesh

Profiles provide sensible defaults rather than forcing every import to specify every field.

### Image contract

Image roles include wall/floor/ceiling/prop texture, decal, UI and reference-only. Metadata may define wrap/repeat, colour space, world-space scale and material binding. World-scale texture continuity must not reset because a mesh or Cell has a different size.

### Audio contract

Audio roles include ambient loop, spatial loop, one-shot, fixture, entity, footstep, transition and UI. Metadata may define looping, spatial mode, volume, range/falloff, Region/Condition ownership and variation group. Replacing an audio source cannot change world identity.

The current fluorescent ambience remains procedural WebAudio; PAU Run 1 establishes the file-backed contract without converting that subsystem.

### Imported mesh contract

Initial canonical imported mesh format is **GLB**.

```text
units: metres
up: +Y
forward: -Z
scale: 1.0 at import
transforms: baked at source
materials: representation-owned
render triangles: never automatic gameplay collision
```

Pivot defaults by profile:

- floor Feature/Item: footprint centre at floor contact;
- ceiling fixture: mounting point;
- wall/Structure object: predictable structural anchor;
- Entity: authored origin unless its profile says otherwise.

Do not scatter `scale = 0.01`, `rotation = 90` or corrective position offsets through renderer code. If a representation requires a deliberate transform, it belongs in the representation definition.

## Visual mesh vs collision

Visual representation and gameplay collision are separate. Environmental Features default to `collisionMode = none`. Supported PAU collision vocabulary is `none`, `box`, `capsule`, `simple-hull`, `authored-simple`. Arbitrary imported render triangles are not collision meshes.

## Fallbacks

Fallbacks are explicit, deterministic and diagnosable.

```text
custom Feature representation
  -> canonical procedural representation
  -> safe debug representation

custom material/image
  -> canonical representation/material
  -> neutral fallback

custom audio
  -> canonical audio/procedural source
  -> silence
```

Missing custom content must not prevent world generation/loading.

## Device / quality invariant

Ordinary world geometry is canonical across Low / Medium / High / Ultra. Render presets scale cost through Render Distance, Render Scale, shadow quality/resolution, post-processing and runtime texture quality where appropriate. LOD remains an exception for genuinely expensive future meshes/Structures/Entities.

## DevelopmentContext

`DevelopmentContext` is versioned structured state for PAU-controlled engineering targets. Canonical schema: `development-context-v1`.

It explicitly distinguishes:

- **design target** — e.g. Medium Bucket;
- **runtime instance** — e.g. generated Bucket `prop.id` at one deterministic world location.

It carries project/repository/ref, semantic target/category, optional runtime ID/seed/generation version/Region/Cell/world position, representation/binding/geometry/material/asset IDs, LCG class, collision, editable/current/preview values, owning module, source/test paths, diagnostics, invariants, warnings and optional user observation/requested change.

Canonical internal serialization is stable sorted JSON. Human packets must be generated from the same object; source dumps are not the contract.

## ChangeReceipt

`ChangeReceipt` is versioned development evidence, not save-game identity. Canonical schema: `change-receipt-v1`.

It records the semantic target and optional runtime instance; change mode; before/after values; representation and Asset IDs before/after; source/generated/files changed; preview/persistence state; validations/tests/typecheck/build; deterministic/save checks; warnings; diff summary; and optional commit/PR/preview/revert references.

Canonical flow:

```text
DevelopmentContext
  -> proposed change
  -> runtime preview / source patch
  -> validation
  -> ChangeReceipt
```

A persisted structured presentation edit should be explainable from its receipt without reverse-engineering Git history.

## World Lab and Noclip Studio boundary

**World Lab** remains the in-game runtime inspection / QA / forcing surface. It is not a filesystem editor, Git client, source editor or asset builder.

**Noclip Studio** is the source-backed local authoring/development companion. PAU Run 2 implements its first candidate foundation under `tools/studio/`; it consumes PAU machine-readable metadata instead of scraping TypeScript line numbers. Studio is development-only and is not ordinary gameplay or production runtime.

The local development bridge is explicit and bounded:

```text
running local game
  <-> structured Studio bridge messages
  <-> loopback Studio server/client
  <-> canonical PAU source / NAL / Git diff / validation
```

The game-side bridge is loaded only in Vite development mode. Privileged Studio code binds to loopback, receives a per-run token from `npm run studio`, exposes no arbitrary `eval`/source execution surface, and is excluded from production game bundles. `npm run build` verifies that privileged Studio bridge/write markers are absent from `dist/`.

World Lab may select, inspect, isolate, locate, and **Open in Studio**. It does not gain filesystem, Git, asset-build, or arbitrary source-write authority.

### PAU source-backed authoring

PAU Run 2 makes the Run 1 pilot Representation definitions structured authoring sources:

```text
src/presentation/definitions/level0-features.json
  -> npm run presentation:build
  -> src/presentation/generatedLevel0FeatureDefinitions.ts
  -> existing Representation Registry
```

Studio derives editable controls from `RepresentationDefinition.editableParameters`. A preview is an in-memory overlay above the canonical Representation definition; it never mutates a `CellDescriptor`, `PropSpec`, Journey save, seed, or stable generated ID. `SAVE TO PROJECT` validates the canonical owner, writes only PAU-controlled definitions/bindings, regenerates outputs, runs focused validation, and creates a canonical `change-receipt-v1`.

Three development change modes remain distinct:

- **runtime-preview** — temporary presentation override; no project write;
- **structured-project-change / representation-rebind / asset-import** — canonical PAU/NAL source-backed operation with diff and ChangeReceipt;
- **code change** — outside current PAU metadata; Studio produces DevelopmentContext/agent handoff rather than gaining arbitrary coding authority.

Git safety is conservative: Studio blocks project writes on protected `main`/`master` or detached HEAD, refuses to overwrite canonical files that were already dirty when Studio started, separates Studio-touched paths from other worktree changes, and only performs a targeted revert when the receipt's post-write hashes still match. Studio does not commit, push, merge, deploy, or open PRs.

### Studio-facing semantic coverage

The first Studio candidate exposes semantic inspection for `A-A1`, `P-A1`, Medium Bucket, Small Grey Open Paint Can, `M-W1`, `M-A1`, `M-C1`, `M-CE1`, `M-F1`, `C-B1`, and `CV-H1`.

Only the Bucket/Can pilot is structured-editable in PAU Run 2. Non-migrated targets remain read-only semantic context with source ownership/tests/diagnostics and a **CODE CHANGE REQUIRED** handoff rather than unsafe fake controls.

The canonical Studio workflow and current limitations live in `docs/NOCLIP_STUDIO.md`.

## PAU Run 1 / Run 2 pilot boundary

Migrated presentation targets:

- Medium Bucket;
- Small Grey Open Paint Can.

Preserved world facts:

- spawn rules and independent deterministic seed domains;
- stable generated IDs;
- Arch Rooms exclusivity;
- world positions/rotations/scales;
- non-solid route-clear behavior;
- generation versions and save schema.

PAU Run 2 adds authoring and preview tooling around those migrated representations; it does not widen world-generation ownership. A-A1, P-A1, topology, Regions, streaming architecture, static batching, lighting architecture, audio runtime and the rest of the renderer are intentionally not migrated wholesale in this run.