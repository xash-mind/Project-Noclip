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

World generation defines **what exists**. PAU defines **how a semantic target is represented**. NAL provides optional source assets. Presentation edits must not silently alter world seeds, deterministic spawn decisions, generated IDs, Region/Condition/Carver/Structure identity, topology, world position, generation version, Journey identity, or save identity.

## Canonical pipeline

```text
WORLD TRUTH
  -> SEMANTIC TARGET
  -> REPRESENTATION BINDING
  -> REPRESENTATION DEFINITION
       -> parameters
       -> typed Asset slots
       -> geometry/material references
  -> RESOLVED PRESENTATION DATA
  -> RENDERER
```

The renderer consumes resolved presentation data. It must not become the canonical owner of arbitrary source paths, wallpaper file IDs, or authoring-scale constants.

## Structured definition sources

PAU structured authoring is source-backed and can span multiple explicit definition families:

```text
src/presentation/definitions/level0-features.json
src/presentation/definitions/level0-materials.json
        |
        v
scripts/build-presentation-definitions.mjs
        |
        +-> generatedLevel0FeatureDefinitions.ts
        +-> generatedLevel0MaterialDefinitions.ts
        |
        v
PROJECT_PRESENTATION_REGISTRY
```

Studio discovers the canonical source owning a semantic target instead of assuming every Representation lives in the original Feature pilot file.

Generated modules are never the human-authoring source.

## Representation definitions

A `RepresentationDefinition` may own:

- stable Presentation identity;
- geometry/material references;
- canonical scalar parameters;
- editable parameter metadata;
- typed editable Asset slots;
- LCG classification;
- presentation collision mode;
- deterministic presentation variation;
- fallback Representation;
- source/test ownership and diagnostics.

A `RepresentationBinding` maps a semantic design target to a Representation ID.

World/runtime IDs remain separate from Representation IDs.

## First-class Asset slots

Dev.9.6 adds first-class structured Asset slots so source content and material usage are not conflated.

An Asset slot declares:

- stable slot key;
- human label;
- Asset type;
- required NAL Asset Profile;
- allowed role(s);
- canonical bound Asset ID when present;
- optional/fallback semantics;
- whether Studio may edit the binding.

Example:

```text
M-W1 — Level 0 Wallpaper
  familyA -> Wall Texture -> level0.wallpaper.a-chevron
  familyB -> Wall Texture -> level0.wallpaper.b-dots
  familyC -> Wall Texture -> level0.wallpaper.c-lines
```

Asset choice is therefore canonical presentation data. Renderer code resolves the slot; it does not hard-code the three wallpaper Asset IDs.

When an Asset-slot binding changes, the Representation's canonical `assetIds` are synchronized so NAL usage reporting remains accurate.

## NAL — Noclip Asset Library

NAL separates source files from validated runtime assets:

```text
assets/source/
assets/definitions/
    -> npm run assets:build
    -> SHA-256 content hash
    -> public/assets/runtime/
    -> assets/generated/registry.json
    -> src/presentation/generatedAssetRegistry.ts
```

Game code addresses content by stable semantic `AssetId`, never arbitrary local paths.

Compatible binding is validated by:

- Asset type;
- Asset Profile;
- allowed role;
- runtime-ready status.

An imported image is immutable source content. Replacing or transforming its presentation does not destructively rewrite the imported bytes.

## Image-treatment layer

Image-backed Representations may apply presentation transforms such as:

- brightness;
- contrast;
- saturation;
- rotation;
- horizontal/vertical flip;
- use-specific world pattern scale;
- UV phase;
- material tint.

The source image remains immutable.

Runtime treatment follows:

```text
NAL runtime image
  -> hash-verified decoded image
  -> non-destructive transform
  -> cached derived PlayCanvas texture
  -> shared material
```

Derived texture cache keys include Asset content hash and transform signature. The cache is bounded and old derived GPU resources are released through the PlayCanvas compatibility boundary where available. No per-frame Canvas processing is used.

## Pattern scale ownership

NAL image metadata may provide an import/profile default such as `worldScaleMeters`, but a Representation using that image owns its actual runtime presentation scale.

For M-W1 the canonical value is `patternSizeMeters`.

```text
larger patternSizeMeters
= larger image in world space / more zoomed in
```

The old independent renderer wallpaper tile-size constant is not canonical ownership.

## Level 0 material targets

### M-W1 — Level 0 Wallpaper

M-W1 owns A/B/C image slots plus safe texture treatment. Ordinary walls, Pillar Field walls, sparse Ordinary wallpaper-bearing columns, Pillar Field wallpaper-bearing columns, and normal Arch Room walls resolve through the same canonical wallpaper inputs.

Deterministic A/B/C family decisions remain stable renderer/world-coordinate presentation decisions. C remains split-wall-only under the current law.

A-A1 structural geometry is excluded from M-W1.

### M-A1 — Arch Pale Structural Finish

M-A1 owns the presentation-only pale finish of the A-A1 divider, including both semantic wall entities and reconstructed `arch-frame:*` visible geometry. Geometry, dimensions, openings, topology and collision remain outside material authoring.

### M-C1 — Level 0 Carpet

M-C1 supports a truthful procedural source mode and an optional compatible NAL `Floor Texture` source. Region tint/gloss differences remain presentation parameters. World-continuous UV phase is preserved across segmented CV-H1 floor pieces.

### M-CE1 — Level 0 Ceiling

M-CE1 similarly supports procedural or compatible NAL `Ceiling Texture` presentation while preserving ceiling/world geometry.

### Casing and outlet presentation

Casing and outlet materials have structured visual controls. Their placement, frequency, topology, interaction, casing junction law, and casing termination setback remain code/world-owned.

### M-F1 visible panel

Only the panel's visible material appearance is structured. Real fixture generation, Omni intensity/range, flicker, shadow participation and one-fixture/one-real-light ownership remain lighting/runtime law.

### CV-H1 visible depth materials

Upper/middle/deep/void colours are presentation fields. Carver geography, Hole aperture dimensions/positions, lattice law and collision/navigation remain world-owned.

## Final presentation ownership

Some visible geometry is created after the base Cell surface pass, notably reconstructed A-A1 frame geometry and CV-H1 Region presentation. Dev.9.6 therefore has an explicit final material owner for renderer-created Level 0 Region geometry.

Its purpose is material ownership only. It does not reconstruct world semantics, modify `CellDescriptor`, add collision, or change topology.

The order is conceptually:

```text
Cell build
 -> base surface presentation
 -> M-W1 wall/column finish
 -> casing
 -> Region / Arch reconstruction
 -> final PAU material ownership for reconstructed Arch/CV-H1/floor surfaces
 -> static/runtime participation
```

Where asynchronous Arch reconstruction is queued, the material pass converges after reconstruction so M-A1 remains the final visual owner rather than depending on whichever hard-coded material ran last.

## Studio preview overrides

Preview is presentation-only memory state:

```text
canonical Representation
+ parameter overrides
+ Asset-slot overrides
+ optional Representation rebind
= resolved preview Representation
```

Preview never mutates world descriptors, saves, seeds, topology or generated IDs.

Asset preview preloads/hash-verifies the selected NAL image before loaded Cell presentation is refreshed.

## Structured Save and revert

Studio Save discovers the source owning the target, validates parameter and Asset-slot patches, writes only the explicit structured source, rebuilds generated definitions, recompiles canonical Studio state, runs focused validation, refreshes runtime presentation, and produces a `change-receipt-v1` record.

Safety invariants remain:

- no writes on protected branches or detached HEAD;
- files dirty before Studio startup are protected;
- no arbitrary `src/**` write authority;
- targeted revert checks post-write hashes;
- Studio does not commit/push/merge/deploy.

## Geometry Registry and LCG

`src/presentation/geometry.ts` remains the deterministic mesh-data foundation. LCG classes remain:

```text
LCG-0 simple planar / structural geometry
LCG-1 simple constructed object
LCG-2 curved or silhouette-sensitive object
LCG-3 distinctive / special object
LCG-X justified exception
```

The material-authoring expansion does not change LCG or move world/collision geometry into Studio sliders.

## Visual mesh vs collision

Visual representation and gameplay collision remain separate. Environmental Features default to `collisionMode = none`; imported render triangles never become gameplay collision automatically.

A presentation/material edit cannot silently alter collision.

## Fallbacks

Fallbacks must be explicit, deterministic and diagnosable. Missing optional custom content may fall back to a canonical procedural/material representation; world generation/loading must not depend on an authoring Asset being present.

M-W1's required A/B/C slots are hard startup requirements for the current supplied-wallpaper candidate and are prepared before the first Cell streams.

## DevelopmentContext

`development-context-v1` distinguishes design target from runtime instance and now carries:

- Representation/binding;
- material/Asset IDs;
- typed Asset-slot metadata;
- canonical parameter values;
- active parameter preview overrides;
- active Asset-slot preview overrides;
- ownership/source/test paths;
- invariants/warnings;
- optional observation/request.

## ChangeReceipt

`change-receipt-v1` remains development evidence, not save-game identity. Structured material saves record parameter values, Representation IDs, Asset IDs, source/generated files, executed validation, deterministic/save result, warnings, diff summary, and targeted revert information.

## Explicit non-goals

PAU/Studio material authoring does not expose:

- Region geography;
- topology;
- pillar density/placement;
- Arch dimensions;
- Hole/Carver geography;
- collision;
- movement;
- save schema;
- Cell streaming;
- Render Distance;
- Blackout world law;
- physical fluorescent light allocation/shadows;
- gameplay/item behavior.

Those remain read-only/contextual targets until a future scoped migration proves a safe structured ownership boundary.
