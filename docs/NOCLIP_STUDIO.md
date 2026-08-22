# Noclip Studio

Noclip Studio is Project Noclip's **local source-backed developer companion**. It consumes Presentation Architecture Upgrade (PAU) and Noclip Asset Library (NAL) contracts; it is not a second world model and it is not shipped as gameplay.

```text
WORLD LAB     = runtime inspection / QA / forcing
NOCLIP STUDIO = authoring / assets / structured edits / diffs / validation / receipts
```

## Start

```bash
npm install
npm run studio
```

Studio binds to `127.0.0.1:4311`, starts the normal Vite development game, and gives the game/Studio bridge one random per-run token. The privileged bridge exists only in development builds started through `npm run studio`.

## Security and Git boundary

Studio remains deliberately narrow:

- privileged APIs bind to loopback only;
- production bundles are scanned for Studio bridge/write markers;
- project writes are blocked on `main`, `master`, and detached HEAD;
- files already dirty when Studio starts are protected from Studio overwrite;
- Studio-touched paths are tracked separately;
- targeted revert is hash-guarded and refuses if a file changed after the Studio operation;
- validation commands are whitelisted;
- there is no arbitrary shell/eval/source-writing endpoint;
- Studio never commits, pushes, merges, deploys, or opens PRs.

Use Git normally after reviewing Studio's source diff.

## Canonical authoring sources

Structured authoring is no longer tied to the Bucket/Can pilot file.

```text
src/presentation/definitions/level0-features.json
  -> src/presentation/generatedLevel0FeatureDefinitions.ts

src/presentation/definitions/level0-materials.json
  -> src/presentation/generatedLevel0MaterialDefinitions.ts
```

`scripts/build-presentation-definitions.mjs` validates and generates both sources. Studio discovers the source that owns the selected semantic target, edits only that canonical JSON, regenerates its typed output, recompiles the canonical Studio view, validates, refreshes runtime presentation, and records a ChangeReceipt.

Studio's structured write authority is limited to explicitly known presentation-definition sources/generated outputs and NAL authoring paths. It is not permission to edit arbitrary `src/**` code.

## Source Asset vs material usage

Dev.9.6 makes the distinction explicit:

```text
NAL SOURCE ASSET
  immutable imported file + metadata + content hash

ASSET SLOT
  which compatible Asset a Representation currently uses

PRESENTATION PARAMETERS
  how that Asset/use is presented
```

Changing brightness, contrast, saturation, pattern size, tint, UV phase, rotation, or flip does **not** rewrite the source image bytes. The source Asset remains immutable.

A Representation can expose typed editable Asset slots such as:

- Wallpaper A -> Wall Texture;
- Wallpaper B -> Wall Texture;
- Wallpaper C -> Wall Texture;
- Carpet image -> Floor Texture;
- Ceiling image -> Ceiling Texture.

Studio only offers Assets compatible with the slot's type, Asset Profile, and allowed role. Invalid or non-runtime-ready bindings are rejected on Save.

## Image treatment

Image-backed materials may expose non-destructive controls including:

- Image Asset;
- Pattern size / metres per source-image repeat;
- Brightness;
- Contrast;
- Saturation;
- Tint colour and tint amount;
- UV phase where relevant;
- 0/90/180/270 rotation where relevant;
- horizontal/vertical flip where relevant.

Runtime image treatment uses a cached derived-texture path. Derived textures are keyed by source Asset content hash plus the transform signature, shared across users of that signature, and bounded so repeated Studio previews do not grow GPU texture count without limit. No per-frame Canvas processing is used.

## Editable Level 0 visual targets

### M-W1 — Level 0 Wallpaper

M-W1 owns the canonical supplied wallpaper family inputs:

- Family A Asset;
- Family B Asset;
- Family C Asset;
- pattern size;
- image treatment;
- tint/phase controls;
- slightly paler Arch Room normal-wall treatment.

Deterministic A/B/C family selection remains renderer/world-coordinate derived and does not enter Journey saves.

Normal Ordinary Level 0 walls, Pillar Field walls, sparse Ordinary Level 0 wallpaper-bearing pillars, and Pillar Field wallpaper-bearing pillars consume the same M-W1 inputs. The old split where sparse Ordinary pillars retained procedural wallpaper is removed.

A-A1 is deliberately excluded from M-W1.

### M-A1 — Arch Pale Structural Finish

M-A1 owns the non-wallpaper structural finish of A-A1, including the authoritative semantic and reconstructed visible Arch pieces. Safe colour/gloss fields are editable. Arch geometry/topology is not.

### M-C1 — Level 0 Carpet

M-C1 owns safe carpet presentation fields. The existing procedural carpet remains a truthful `Procedural` source mode. A compatible NAL `Floor Texture` may be selected as an image source without changing world identity or CV-H1 geometry.

### M-CE1 — Level 0 Ceiling

M-CE1 follows the same model: procedural source remains supported; a compatible NAL `Ceiling Texture` may be bound; safe tint/image-treatment fields are structured.

### Casing / Raceway

The accepted casing geometry, junction behavior, occurrence law, and wall-end setback remain code-owned. Studio edits presentation-only base/highlight/shadow colours and gloss.

### Outlet presentation

Outlet placement/frequency/interaction remain code-owned. Studio edits the plate/slot appearance only.

### M-F1 fluorescent panel appearance

Studio edits only the visible panel material fields, such as diffuse/emissive presentation and a visual panel-glow multiplier.

It does **not** edit:

- fluorescent fixture generation;
- real Omni intensity/range;
- flicker law;
- shadow participation;
- the one-fixture/one-real-light ownership law.

### CV-H1 visible Hole materials

Studio may edit presentation-only upper/middle/deep/void colours. Hole aperture position, dimensions, lattice grammar, Carver occurrence, collision/navigation, and deterministic identity remain world-owned.

### Bucket / Paint Can

The existing structured PAU geometry pilot remains supported through `level0-features.json` and continues using the same preview/save/revert workflow.

## What remains read-only

Studio intentionally does not make every game variable a slider.

Read-only/code-owned areas include:

- A-A1 geometry/topology/dimensions;
- P-A1 geometry/placement/density;
- world topology and Region geography;
- Carver geography/aperture law;
- collision and navigation;
- movement;
- save schema / stable generated IDs;
- Cell streaming and Render Distance;
- C-B1 Blackout world law;
- M-F1 physical lighting/shadow allocation;
- fixture generation;
- gameplay/item behavior.

Studio should surface ownership/context for these targets and generate an engineering handoff rather than pretending they have safe structured controls.

## Runtime preview

Preview state lives only in the running development page.

```text
canonical Representation
+ temporary parameter overrides
+ temporary Asset-slot overrides
= runtime preview
```

Preview never mutates `CellDescriptor`, `PropSpec`, Journey saves, seeds, generated IDs, topology, or world geography.

For image Asset swaps, the selected NAL image is fetched/hash-verified/decoded before the forced presentation refresh. Already loaded deterministic Cells are rebuilt/refreshed from the same descriptors so visual changes can be inspected immediately.

`Revert Preview` restores the selected target's canonical values. `Clear All Previews` clears all temporary presentation overrides. Restarting the game also clears preview state.

## Save to Project

For a structured target:

```text
Edit fields / Asset slots
  -> Apply Runtime Preview
  -> inspect real game renderer
  -> Save to Project
  -> canonical JSON change
  -> typed source regeneration
  -> Studio canonical compile
  -> focused validation
  -> runtime refresh
  -> ChangeReceipt
```

Save records parameter and Asset-ID before/after state, source/generated files, validation actually executed, deterministic/save compatibility result, and a source diff. Asset-slot Save also synchronizes the Representation's canonical `assetIds`, so NAL usage reporting remains truthful.

## NAL Asset Library

The Asset Library supports Images, Audio, and Meshes. It shows source/runtime metadata, hash/status, current Representation usages, and compatible `Use for…` actions where a structured Asset slot can consume an Asset.

Import flow remains:

```text
choose local file
  -> Asset ID + Asset Profile
  -> validation
  -> assets/source/{images|audio|meshes}/
  -> assets/definitions/studio-imports.json
  -> npm run assets:build
  -> generated registry/runtime output
  -> ChangeReceipt
```

Import alone does not change world identity and does not automatically replace a material. Binding an imported image is a separate explicit structured edit.

## DevelopmentContext and ChangeReceipt

Studio uses canonical `development-context-v1` packets and `change-receipt-v1` evidence. Material contexts now include Asset-slot metadata and active Asset-slot preview overrides in addition to parameter preview values.

Observation and Requested Change fields remain development notes only; they do not enter game/world data.

## Validation

Preview performs no heavy test run. Save runs focused Studio/PAU validation. Explicit actions provide targeted validation, typecheck, tests, build, and full project checks.

Project verification also includes the production Studio-boundary scan so privileged local-authoring code cannot silently ship in the gameplay bundle.
