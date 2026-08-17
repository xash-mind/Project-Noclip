# Noclip Studio

Noclip Studio is Project Noclip's **local source-backed developer companion**. It consumes the Presentation Architecture Upgrade (PAU) contracts; it is not a second world model and it is not shipped as gameplay.

```text
WORLD LAB     = runtime inspection / QA / forcing
NOCLIP STUDIO = authoring / assets / structured edits / diffs / validation / context / receipts
```

## Start

Requirements are the same as the game (`Node >= 22.12`, `npm install`). From a working Project Noclip branch:

```bash
npm run studio
```

One command:

1. validates/generates the canonical PAU representation source used by Studio;
2. compiles the canonical PAU contracts for the local Studio backend;
3. starts the loopback Studio server at `http://127.0.0.1:4311`;
4. starts the existing Vite game dev server;
5. gives the game and Studio server one random per-run bridge token.

Use the loopback Vite URL (`localhost` / `127.0.0.1`) when using the bridge. A normal `npm run dev` still runs the game without Studio authoring authority.

## Security boundary

Studio privileged APIs exist only under `tools/studio/` and the server binds to `127.0.0.1`. The game-side bridge is dynamically imported only when `import.meta.env.DEV` is true and only activates when `VITE_NOCLIP_STUDIO_TOKEN` was provided by `npm run studio`.

Studio does not expose arbitrary shell/eval endpoints. Validation actions are a fixed whitelist. File writes are restricted to PAU/NAL authoring directories and `.noclip-studio/` local evidence. Path traversal is rejected.

`npm run build` finishes by scanning the production bundle for Studio bridge/write markers. A production bundle containing a privileged Studio marker fails the build.

## Git safety

Studio is deliberately conservative:

- project writes are blocked on `main`, `master`, and detached HEAD;
- the worktree is sampled when Studio starts;
- Studio refuses to overwrite a canonical file that was already dirty before Studio started;
- Studio-touched paths are tracked separately from pre-existing and other worktree changes;
- Studio never merges, pushes, deploys, opens a PR, or resets the worktree;
- targeted revert checks post-write file hashes and refuses if another operation changed the same file.

Use Git normally for commits/PRs after reviewing Studio's source diff.

## Canonical target flow

```text
npm run studio
  -> run game + Studio
  -> play / inspect in World Lab
  -> Open in Studio
  -> inspect DevelopmentContext
  -> edit PAU-owned fields
  -> Apply Runtime Preview
  -> Revert Preview or Save to Project
  -> review source diff
  -> targeted validation
  -> ChangeReceipt
  -> continue development
```

World Lab's Studio section contains semantic target selection plus **Inspect**, **Isolate**, and **Open in Studio**. It does not gain filesystem or Git authority.

## Design target vs runtime instance

Studio always names the semantic **design target**. When the running game can identify a real generated pilot Feature in the current Cell, the canonical `DevelopmentContext` adds a distinct **runtime instance** with stable generated ID, seed, generation version, Region, Conditions, Cell and world position.

Disposable World Lab showcase objects never pretend to be deterministic generated instances. If Studio cannot prove an instance identity it shows design-target context only.

## Semantic navigation

Run 2 initially exposes:

- `A-A1` — Arch Divider;
- `P-A1` — Pillar Pier;
- Medium Bucket;
- Small Grey Open Paint Can;
- `M-W1`, `M-A1`, `M-C1`, `M-CE1`, `M-F1`;
- `C-B1` — Blackout;
- `CV-H1` — Floor-hole Carver.

Bucket and Paint Can are structured PAU authoring targets. The other targets are intentionally read-only until their presentation is migrated; Studio still provides canonical source ownership, diagnostics, relevant tests and agent handoff instead of pretending they have safe sliders.

## Runtime preview

Preview data lives only in `src/presentation/previewOverrides.ts` memory in the running development page:

```text
canonical Representation Definition
+ temporary Studio parameter / binding override
= runtime preview
```

Preview never mutates `CellDescriptor`, `PropSpec`, Journey saves, world seeds or generated IDs. A forced presentation refresh rebuilds loaded deterministic Cell visuals using the same descriptors. Restarting the game clears preview state.

Studio marks active preview as **UNSAVED PREVIEW** and exposes **Revert Preview** and **Clear All Previews**.

## Structured project changes

PAU Run 2 makes the two Run 1 pilot definitions source-backed:

```text
src/presentation/definitions/level0-features.json
  -> npm run presentation:build
  -> src/presentation/generatedLevel0FeatureDefinitions.ts
  -> existing PAU Representation Registry
```

Studio reads editable controls from `RepresentationDefinition.editableParameters`. Save validates that every requested key is explicitly editable and obeys its metadata. It does not search TypeScript for matching numbers.

**Save to Project** writes the canonical JSON, regenerates the typed source, recompiles Studio's canonical PAU view, runs focused validation, refreshes runtime presentation, and creates a `change-receipt-v1` record.

If a request cannot be expressed by PAU metadata, Studio labels it **CODE CHANGE REQUIRED**. Use the context/prompt export rather than giving Studio arbitrary source-writing authority.

## DevelopmentContext exports

Studio uses `development-context-v1` from `src/presentation/developmentContext.ts`. Human packets and agent prompts are generated from the same object by `src/presentation/developmentContextExports.ts`.

Available exports:

- Copy Context;
- Copy Context JSON;
- Copy Context + Observation;
- Copy Context + Change Request;
- Copy Full Development Prompt.

Observation and Requested Change are development notes only. They do not enter canonical game/world data.

## ChangeReceipts and history

Persisted structured operations use `change-receipt-v1` from `src/presentation/changeReceipt.ts`. Human text and JSON are generated from the same canonical receipt.

A lightweight local envelope is written under:

```text
.noclip-studio/receipts/
```

The directory is gitignored and safe to delete. It stores convenience evidence and the hash-guarded targeted-revert plan; Git/source files remain authoritative.

Studio displays the saved target, before/after values, files and generated outputs, validation actually executed, deterministic/save result, warnings and source diff. It never marks an unexecuted check PASS.

## Validation

Slider/field preview performs no heavy test run.

A structured Save runs focused PAU/Studio validation. Explicit buttons provide:

- Validate Target;
- Run Typecheck;
- Run Tests;
- Run Build;
- Run Full Project Check.

Commands are whitelisted; Studio is not a general shell UI.

`npm test` also runs a Studio-specific smoke gate: tool/client syntax checks, canonical PAU compilation, loopback Studio server startup, UI shell/bootstrap verification and a canonical `development-context-v1` response for Medium Bucket.

## NAL Asset Library

The Asset Library has Images, Audio and Meshes views. It reads current NAL source/generated metadata and representation usages.

Import flow:

```text
choose local file
  -> Asset ID + PAU Asset Profile
  -> extension / size / path validation
  -> copy into assets/source/{images|audio|meshes}/
  -> update assets/definitions/studio-imports.json
  -> npm run assets:build
  -> SHA-256 + runtime registry/output
  -> ChangeReceipt
```

Supported v1 source extensions:

- images: PNG, JPEG, WebP;
- audio: MP3, OGG, WAV, M4A;
- meshes: GLB.

Images render in Studio. Audio uses browser play/stop controls. Mesh cards expose authoritative metadata (statistics when supplied, runtime status, pivot/collision/profile/usages). A true isolated GLB 3D viewport is intentionally deferred until imported-mesh runtime presentation is migrated; Studio does not fake one with a bounding box.

Asset import alone does not alter world identity. Run 2 does not automatically bind a newly imported GLB into an unsupported renderer path.

## Representation Binding

For PAU-migrated targets Studio shows the canonical semantic → Representation binding and compatible registered representations. Binding changes can be previewed through the same temporary override layer. Saving a rebind edits the canonical structured binding and generates a ChangeReceipt.

A missing/unavailable custom representation continues through PAU's deterministic fallback chain; world generation is not involved.

## Agent handoff

For a change that needs engineering work:

1. select the semantic target;
2. inspect a runtime instance when useful;
3. enter **Observation** and **Requested Change**;
4. choose **Copy Full Development Prompt**;
5. send that prompt to the coding agent;
6. let the agent reconcile current repository reality and implement the code change;
7. return to Studio/runtime to inspect the resulting presentation and evidence.

The future agent contract remains `DevelopmentContext + request -> structured PAU proposal OR code patch proposal`. Studio remains responsible for preview, diff, validation, approval and ChangeReceipt evidence.

## Current limitations

- Structured source authoring is intentionally limited to the Run 1 Bucket/Can pilot.
- A-A1, P-A1, Materials, M-F1, Blackout and CV-H1 are semantic read-only targets until PAU migration supplies safe editable presentation fields.
- Runtime-instance selection is currently reliable for a natural Bucket/Can in the current Cell; other scene geometry opens as a design target rather than inventing an instance ID.
- Imported GLB assets do not yet have an isolated Studio 3D viewport or generic runtime mesh adapter.
- Asset replacement and creating a new custom Representation from an import are foundations for later PAU migrations.
- Studio does not commit, push, merge, deploy, or open PRs.
