# Dev.9.7 — Noclip Studio usability and authoring completion

This branch completes the local authoring workflow begun in Dev.9.6. It changes the editor and one proven presentation wiring defect; it does not retune Level 0 appearance or move world law into Studio.

## Authoring state model

Studio now names three states explicitly:

- **Saved Project Value** — the canonical structured source a fresh project restart reads.
- **Temporary Preview** — a runtime-only override delivered through the development bridge. It is never persisted automatically.
- **Unsaved Editor Change** — a local form change waiting for explicit Preview or Save.

Applying a preview clears the previous preview for that target first, then applies the complete staged parameter/Asset patch. Studio waits for the game bridge to report the requested override state before calling it active. Revert restores the canonical target state; Clear All Previews removes all runtime presentation overrides.

## Human target navigation

Targets are grouped as Materials, Features, Carvers, Architecture, and Conditions. The primary target view explains where the selected presentation appears and shows semantic IDs/source ownership only as secondary diagnostics.

Read-only targets are intentional. Studio explains the owning world/renderer law rather than presenting a disabled control as if it were broken. Generation 3 topology, Region geography, collision, movement, visibility/render-distance architecture, Blackout law, and physical M-F1 Omni behavior remain code/world owned.

## Controls

Structured metadata drives typed controls:

- colours: colour picker plus exact `#RRGGBB` input;
- bounded numbers: slider plus exact numeric input;
- booleans: checkbox;
- enums: dropdown;
- Asset slots: searchable compatible-Asset input with current thumbnail, friendly name, saved binding, temporary preview binding, and Asset ID as secondary information.

Common controls appear under **Basic** and specialized UV/finish/treatment controls are progressively disclosed under **Advanced**.

## Asset workflow

The Asset Library reports both current uses and compatible editable target/slot destinations. **Use for…** navigates to the exact target and Asset slot; it never stages or saves a replacement automatically.

Preview Asset commands are validated by the Studio server against slot editability, Asset type, Profile, role, and runtime-ready state before they enter the game bridge. Runtime Asset previews remain concrete typed Asset-ID replacements. Optional unbinding is validated only through the canonical Save-to-Project path rather than weakening the runtime bridge Asset-ID contract.

## M-F1 wiring correction

Dev.9.6 exposed M-F1 visible-panel colours and visual emissive scale as structured authoring values, but the steady fixture updater rebuilt panel materials from hard-coded presentation values. Dev.9.7 makes that updater read the canonical/previewed M-F1 presentation values.

The physical M-F1 law is unchanged: Omni range, intensity multiplier, light selection, shadows, shadow resolution policy, and flicker pulse continue to use the existing fixture-lighting path.

## Safety retained

Studio remains loopback-only and development-only. Save to Project remains limited to allowlisted structured presentation sources with protected-branch, detached-HEAD, dirty-file, generated-source, validation, receipt, and hash-guarded targeted-revert protections. The UI/API no longer offers arbitrary representation rebinding as an ordinary visual-editing operation.

There are no commit, push, merge, or deploy controls.

## Concurrent visual tuning boundary

This branch intentionally does not change the canonical values in `src/presentation/definitions/level0-materials.json` for M-W1 Level 0 Wallpaper or M-A1 Arch structural finish. A concurrent user tuning branch may change those values independently; later integration must preserve the user's final values while taking the Studio capability changes from this branch.

## Verification

Focused Dev.9.7 tests cover typed-control coverage, saved/preview/editor state semantics, target organization/read-only explanations, Asset navigation and compatibility validation, loaded-cell runtime refresh plumbing, M-W1/M-A1 ownership separation, and M-F1 visual-vs-physical ownership.

CI also executes a real headless Chromium Studio journey against the actual Studio UI. It uses a local bridge harness for deterministic preview acknowledgement, previews/reverts M-W1, M-A1, carpet, and an Asset replacement, inspects a read-only architecture target, then saves and hash-reverts a harmless Bucket presentation parameter. The journey asserts that the material source containing M-W1/M-A1 remains byte-identical and chooses its wallpaper replacement relative to the current canonical binding so concurrent user tuning is not normalized back to a fixed Asset.
