# Executive Summary

Audit target:

- base: `preview/cleanup-governance-baseline`
- base SHA: `741414a0f9606f9fb9af06f85b6c601c275e266b`
- VERSION: `0.3.0-dev.9.8`
- branch: `agent/cleanup-audit-provenance`

This is factual provenance hygiene, not legal advice. It does not infer that public visibility grants reuse rights, that a wiki page license automatically governs every attachment, that modification removes an unresolved rights question, or that one Backrooms source/canon automatically defines Project Noclip world truth.

The repository's permanent provenance model is sound. The key separation is:

```text
EXTERNAL SOURCE FACT
!=
PROJECT NOCLIP INTERPRETATION / ACCEPTANCE
!=
PROJECT-NOCLIP-ORIGINAL IMPLEMENTATION
```

The strongest source-derived layer is recognizable Level 0 content identity: ordinary yellow/pale wallpaper, damp carpet, suspended ceiling, fluorescent fixtures/buzz, Pillars, Arches, Holes, Blackout and Red Rooms. `Almond Water` is also an externally established Backrooms item concept/name. By contrast, Generation 3, deterministic Fields, Region affinity, semantic topology, the Carver pass, Visibility Snapshot/participation, Journey persistence/versioning, PAU/NAL/Studio, Character Profile identity, Item Instance identity, Inventory behavior and renderer/runtime techniques are Project-Noclip-original engineering even where they implement source-derived content.

The largest unresolved provenance risk is the three committed M-W1 source wallpaper WebPs. Repository metadata/history establishes that they were user-provided and prepared as derivatives, but does not establish the underlying source(s), creator(s), original license/permission chain, attribution obligations or redistribution scope. They remain `UNKNOWN / REVIEW REQUIRED`.

The audited tree contains no committed source audio, meshes, fonts, videos or reference screenshots. Current ambience is procedurally synthesized in `src/audio/Ambience.ts`; therefore fluorescent-buzz *identity* is source-derived while the actual waveform/tuning/runtime implementation is Project-Noclip-original and contains no copied audio recording.

External-source inspection also confirms that page-level and file-level terms must stay separate. The retrieved Backrooms Wiki Level 0 license box states CC BY-SA 3.0 for page text, while listing separate media terms: baseline and Arch photographs are credited to Bob Mazza under CC0 1.0; Pillar `/3` and Blackout `/5` are credited to Alfarex under CC BY-SA 4.0. Hole `/4` is not safely resolved because the displayed media entry named `4` links to `/1`, and no file-specific `/6` Red Rooms entry was visible in the retrieved license box. Those media questions remain `UNKNOWN / REVIEW REQUIRED`.

Source-page revision metadata was not treated as a stable provenance fact because separate retrieval snapshots exposed drift. Later canonicalization should record the exact access date/revision alongside any evidence promoted from a changing external page.

No substantial copied external prose was found in the audited current world/provenance/reference surfaces or relevant implementation. No product/canon/removal decision is made here.

# Provenance Model Validation

Use exactly the permanent classes already established by governance:

- `SOURCE-DERIVED`
- `INTERPRETATION`
- `PROJECT-NOCLIP-ORIGINAL`
- `REAL-WORLD-INSPIRATION`
- `UNKNOWN / REVIEW REQUIRED`

Current ownership boundaries are correct:

1. `docs/references/**` owns raw source/evidence history and fidelity observations.
2. `docs/CONTENT_PROVENANCE.md` owns the canonical concept ledger.
3. `WORLD.md` owns accepted Project Noclip world truth.
4. `docs/VISION.md` owns creative/product direction.
5. Runtime/presentation code owns implementation, not external canon.

The taxonomy does not need another top-level class. The gap is ledger completeness. Mixed player-facing concepts should use multiple existing classes for their different layers rather than collapsing content identity, project interpretation and software implementation into one provenance claim.

# Current Concept Matrix

## Level 0 / Ordinary

**CONCEPT:** Level 0 / Ordinary Level 0

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** The recorded Level 0 source presents yellow/pale wallpaper, moist carpet, suspended/drop ceiling, fluorescent lighting/buzz and labyrinthine office/retail-like space.

**PROJECT ACCEPTED INTERPRETATION:** Ordinary Level 0 is the continuous substrate under current Regions/Conditions/Carvers. Source claims such as arbitrary shifting, Isolation Effect or anomalous voices are not automatically Project world truth.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Generation 3 topology/solver, deterministic semantic addresses, continuous Fields/Regions, save/version rules, renderer ownership and performance implementation.

**SOURCE URLS:** `https://backrooms-wiki.wikidot.com/level-0`

**REFERENCE PACK:** `REF-L0-001`

**IMPLEMENTATION OWNER:** `src/world/gen3.ts`, `src/world/fields.ts`, `src/world/gen3SpaceTopology*.ts`, `src/world/gen3Architecture*.ts`, renderer/presentation owners.

**MEDIA COPIED INTO REPO?** NO for the baseline photograph.

**LICENSE/PERMISSION EVIDENCE:** Retrieved media box credits the baseline image to Bob Mazza under CC0 1.0; page text separately states CC BY-SA 3.0.

**ATTRIBUTION:** Keep source/creator records separate for page text and media; no project-wide license conclusion here.

**UNKNOWN QUESTIONS:** Scope/applicability of source-site terms to Project Noclip distribution; see `PROV-LEGAL-005`.

**RECOMMENDED LEDGER UPDATE:** Preserve the three-layer split and add current file-specific baseline media evidence plus evidence-capture date/revision.

## Pillar Field

**CONCEPT:** Pillar Field

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Pillar Variation is source-supported, including rectangular wallpaper-clad pillars, grid/lattice character and shallower/less-moist carpet; the source also reports path shifting.

**PROJECT ACCEPTED INTERPRETATION:** A continuous Region modifier of Ordinary Level 0 with deterministic Euclidean geometry; source-described live path shifting is not adopted literally.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Region affinity/depth, deterministic lattice sampling, density/rarity blending, route-clearance and topology integration.

**SOURCE URLS:** Level 0 page; attachment `/3`.

**REFERENCE PACK:** `REF-L0-002`

**IMPLEMENTATION OWNER:** `src/world/fields.ts`, `src/world/gen3.ts`, `src/world/gen3ArchitectureCore.ts`, `src/world/gen3SpaceTopologyBuild.ts`.

**MEDIA COPIED INTO REPO?** NO.

**LICENSE/PERMISSION EVIDENCE:** Retrieved file-specific media entry: `3`, Alfarex, CC BY-SA 4.0, source `/3`.

**ATTRIBUTION:** Attribution-bearing media terms are explicitly stated by the source; downstream fulfillment is outside this audit.

**UNKNOWN QUESTIONS:** Whether older repository wording using a general CC BY-SA 3.0 render credit should be superseded by this file-specific evidence.

**RECOMMENDED LEDGER UPDATE:** Record exact `/3` creator/license evidence and keep source-described shifting separate from Project acceptance.

## P-A1

**CONCEPT:** P-A1 — Pillar Pier

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Rectangular floor-to-ceiling wallpaper-clad supports and repeated pillar spacing are source-supported.

**PROJECT ACCEPTED INTERPRETATION:** P-A1 is Project Noclip's named Region-owned architecture pattern for that direction.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Stable P-A1 ID, exact dimensions/lattice, depth expression, deterministic generation address and renderer ownership.

**SOURCE URLS:** Level 0 page; `/3`.

**REFERENCE PACK:** `REF-L0-002`

**IMPLEMENTATION OWNER:** `src/world/gen3ArchitectureCore.ts`, `src/world/gen3SpaceTopologyBuild.ts`, `src/renderer/level0SurfacePresentation.ts`.

**MEDIA COPIED INTO REPO?** NO.

**LICENSE/PERMISSION EVIDENCE:** Same external `/3` evidence as Pillar Field; no source image is embedded in P-A1 code.

**ATTRIBUTION:** See Pillar Field.

**UNKNOWN QUESTIONS:** None material to the software pattern itself.

**RECOMMENDED LEDGER UPDATE:** Explicitly separate source pier identity from Project-original taxonomy/dimensions/solver.

## Arch Rooms

**CONCEPT:** Arch Rooms

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Source evidence supports pale archway sections, repeated openings, deeper/wetter carpet and comparatively stable spatial behavior.

**PROJECT ACCEPTED INTERPRETATION:** A continuous Arch Rooms Region modifier; the visual is interpreted as a divider/wall grammar rather than freestanding monuments.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Region affinity/depth, exact divider dimensions, bounded irregularity/termination, topology/collision reconstruction and rendering.

**SOURCE URLS:** Level 0 page; attachment `/2`.

**REFERENCE PACK:** `REF-L0-007`

**IMPLEMENTATION OWNER:** `src/world/fields.ts`, `src/world/gen3SpaceTopology*.ts`, `src/renderer/level0RegionPresentation.ts`, `src/renderer/archDividerRuntimeCorrection.ts`.

**MEDIA COPIED INTO REPO?** NO.

**LICENSE/PERMISSION EVIDENCE:** Retrieved media box credits “Arches” to Bob Mazza under CC0 1.0 with an Archive source.

**ATTRIBUTION:** Preserve creator/source record even where the stated media license does not require attribution.

**UNKNOWN QUESTIONS:** No material file-level ambiguity found for `/2`; downstream legal scope is separate.

**RECOMMENDED LEDGER UPDATE:** Add Bob Mazza / CC0 1.0 file-specific evidence; retain interpretation warning.

## A-A1

**CONCEPT:** A-A1 — Arch Divider

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** A repeated arch-opening wall/divider identity is source-supported.

**PROJECT ACCEPTED INTERPRETATION:** A-A1 is the semantic Project architecture pattern used to express that source direction.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Stable ID, exact piers/header/curve/lower-panel/termination vocabulary, topology ownership, Cell continuity, collision and material reconstruction.

**SOURCE URLS:** Level 0 page; `/2`.

**REFERENCE PACK:** `REF-L0-007`

**IMPLEMENTATION OWNER:** Gen3 architecture/topology plus Arch renderer owners.

**MEDIA COPIED INTO REPO?** NO.

**LICENSE/PERMISSION EVIDENCE:** Same `/2` evidence as Arch Rooms.

**ATTRIBUTION:** Same source record as Arch Rooms.

**UNKNOWN QUESTIONS:** None material to A-A1 engineering originality.

**RECOMMENDED LEDGER UPDATE:** Mark exact A-A1 taxonomy/dimensions/implementation as Project-original.

## M-W1 wallpaper identity

**CONCEPT:** M-W1 wallpaper identity

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Yellow/pale patterned wallpaper is a core recognizable Level 0 visual identity.

**PROJECT ACCEPTED INTERPRETATION:** Deterministic multi-family wallpaper variation with Region-aware presentation and controlled brightness/scale.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** M-W1 semantic ID, family resolver/weights, world-space UV/phase rules, Asset slots, fallback/cache/material runtime.

**SOURCE URLS:** Level 0 source/reference URLs.

**REFERENCE PACK:** `REF-L0-001`, `REF-L0-002`, `REF-L0-003`, `REF-L0-004`, `REF-L0-007`

**IMPLEMENTATION OWNER:** `src/presentation/definitions/level0-materials.json`, `src/renderer/ordinaryWallpaper*.ts`, `src/renderer/presentationImageTextures.ts`.

**MEDIA COPIED INTO REPO?** YES only for the separate A/B/C wallpaper derivative files below.

**LICENSE/PERMISSION EVIDENCE:** Source-backed wallpaper identity does not resolve the rights chain of the committed A/B/C files.

**ATTRIBUTION:** UNKNOWN for A/B/C until their source chain is established.

**UNKNOWN QUESTIONS:** Origin/creator/license/permission chain for A/B/C.

**RECOMMENDED LEDGER UPDATE:** Keep concept provenance and file provenance as separate ledger records.

## M-W1 A/B/C committed assets

**CONCEPT:** `level0.wallpaper.a-chevron`, `level0.wallpaper.b-dots`, `level0.wallpaper.c-lines`

**CLASSIFICATION:** `UNKNOWN / REVIEW REQUIRED`

**EXTERNAL SOURCE FACT:** Project metadata calls each a user-provided Level 0 wallpaper reference prepared as a game-ready derivative; history independently calls A/B supplied source derivatives.

**PROJECT ACCEPTED INTERPRETATION:** Current M-W1 source assets consumed through NAL/presentation Asset slots.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Asset IDs, technical preparation/build validation, hashes, runtime resolution and material application. The image bytes themselves cannot be classified as original from current evidence.

**SOURCE URLS:** No underlying source URL recorded in `assets/definitions/library.json`.

**REFERENCE PACK:** No dedicated origin reference.

**IMPLEMENTATION OWNER:** `assets/source/images/`, `assets/definitions/library.json`, NAL.

**MEDIA COPIED INTO REPO?** YES.

**LICENSE/PERMISSION EVIDENCE:** Metadata only states that project-use authorization was asserted in the development conversation; no creator/source/license/permission artifact is recorded.

**ATTRIBUTION:** UNKNOWN.

**UNKNOWN QUESTIONS:** Original source(s), creator(s), modification chain, permission scope, redistribution rights, attribution/notices, original hashes.

**RECOMMENDED LEDGER UPDATE:** Keep `UNKNOWN / REVIEW REQUIRED` until `PROV-LEGAL-001` is evidenced per file.

## Floor / carpet identity

**CONCEPT:** M-C1 Level 0 carpet identity

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Brownish-beige/tan tight-knit carpet with persistent moisture is source-supported.

**PROJECT ACCEPTED INTERPRETATION:** The Region/floor presentation owns surviving carpet even where a Hole Carver removes floor area.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** M-C1 ID, numeric material values, shader/presentation implementation and CV-H1 ownership law.

**SOURCE URLS:** Level 0 page.

**REFERENCE PACK:** `REF-L0-001` plus Region references.

**IMPLEMENTATION OWNER:** material definitions, `level0SurfacePresentation.ts`, `finalLevel0MaterialPresentation.ts`.

**MEDIA COPIED INTO REPO?** NO dedicated carpet asset.

**LICENSE/PERMISSION EVIDENCE:** No copied carpet media.

**ATTRIBUTION:** Source-backed content documentation only.

**UNKNOWN QUESTIONS:** None material to current asset inventory.

**RECOMMENDED LEDGER UPDATE:** Split source carpet identity from Project numeric/shader/ownership choices.

## Carpet Conditions

**CONCEPT:** `damp-carpet`, `deep-wet-carpet`, `shallow-dry-carpet`

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Ordinary moisture, deeper/wetter Arch carpet and shallower/less-moist Pillar carpet are source-supported.

**PROJECT ACCEPTED INTERPRETATION:** Expressed as named semantic Conditions driven by Region policy.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Stable Condition IDs, deterministic mapping, thresholds and material values.

**SOURCE URLS:** Level 0 page.

**REFERENCE PACK:** `REF-L0-001`, `REF-L0-002`, `REF-L0-007`

**IMPLEMENTATION OWNER:** Gen3 Condition resolution and material presentation.

**MEDIA COPIED INTO REPO?** NO.

**LICENSE/PERMISSION EVIDENCE:** No dedicated media.

**ATTRIBUTION:** Source facts only.

**UNKNOWN QUESTIONS:** Exact numeric wetness/depth values are not external facts.

**RECOMMENDED LEDGER UPDATE:** Add granular Condition split if synthesis wants per-condition entries.

## M-CE1 ceiling

**CONCEPT:** M-CE1 suspended ceiling identity

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Suspended/drop-ceiling tiles and repeated fluorescent fixture rhythm are source-supported.

**PROJECT ACCEPTED INTERPRETATION:** Shared ceiling grammar across current Level 0 unless a stronger semantic owner overrides it.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** M-CE1 ID, exact geometry/material values, renderer ownership/performance.

**SOURCE URLS:** Level 0 page.

**REFERENCE PACK:** current Level 0 pack.

**IMPLEMENTATION OWNER:** level0 material/surface presentation.

**MEDIA COPIED INTO REPO?** NO dedicated ceiling asset.

**LICENSE/PERMISSION EVIDENCE:** No copied ceiling media.

**ATTRIBUTION:** Source documentation only.

**UNKNOWN QUESTIONS:** None material to media.

**RECOMMENDED LEDGER UPDATE:** Split source ceiling identity from Project exact construction.

## M-F1 fluorescent

**CONCEPT:** M-F1 fluorescent panel / ambience identity

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Repeated rectangular fluorescent lights and pervasive fluctuating buzzing are source-supported.

**PROJECT ACCEPTED INTERPRETATION:** Panel emission, physical light energy and procedural hum/flicker are synchronized under deterministic lighting law.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** M-F1 ID, fixture ownership, light allocation, pulse law, Web Audio synthesis, diagnostics and performance implementation.

**SOURCE URLS:** Level 0 page.

**REFERENCE PACK:** `REF-L0-001` and supporting entries.

**IMPLEMENTATION OWNER:** `src/world/lighting.ts`, `src/renderer/fixtureLighting.ts`, `src/audio/Ambience.ts`.

**MEDIA COPIED INTO REPO?** NO external fluorescent audio recording or fixture texture.

**LICENSE/PERMISSION EVIDENCE:** No copied audio payload.

**ATTRIBUTION:** Source identity separately; procedural implementation is Project code.

**UNKNOWN QUESTIONS:** Future recorded audio requires independent file-level intake.

**RECOMMENDED LEDGER UPDATE:** State explicitly that current ambience is synthesized rather than externally recorded.

## C-B1 Blackout

**CONCEPT:** C-B1 Blackout

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Source supports unlit Level 0-like sections, loss of local buzz, rough surfaces, possible recessed fluid and navigation toward light/buzz.

**PROJECT ACCEPTED INTERPRETATION:** A Condition over recognizable Level 0, with continuous deterministic boundary behavior rather than a separate room template.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Blackout Field/thresholds, escape cue, physical-light suppression, renderer/audio blending and diagnostics.

**SOURCE URLS:** Level 0 page; `/5`.

**REFERENCE PACK:** `REF-L0-004`

**IMPLEMENTATION OWNER:** world Fields/lighting, fixture renderer, blackout runtime, ambience.

**MEDIA COPIED INTO REPO?** NO.

**LICENSE/PERMISSION EVIDENCE:** Retrieved file-specific entry: `5`, Alfarex, CC BY-SA 4.0, source `/5`.

**ATTRIBUTION:** Attribution-bearing terms stated by source; no legal conclusion here.

**UNKNOWN QUESTIONS:** None material to committed media.

**RECOMMENDED LEDGER UPDATE:** Add exact `/5` creator/license evidence.

## CV-H1 Holes

**CONCEPT:** CV-H1 floor-hole cluster

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`; `UNKNOWN / REVIEW REQUIRED`

**EXTERNAL SOURCE FACT:** Source supports dark/deep floor openings in close/grid groups with bypassable surrounding Level 0 floor.

**PROJECT ACCEPTED INTERPRETATION:** Implemented as a subtractive Carver over Region-owned floor/architecture rather than a separate template.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Carver ID/pass, deterministic gate/lattice/cluster placement, bypass constraints, floor reconstruction, collision and Region-aware surviving carpet.

**SOURCE URLS:** Level 0 page; official `/4`; user-provided Drive mirror recorded in the reference pack.

**REFERENCE PACK:** `REF-L0-003`

**IMPLEMENTATION OWNER:** Gen3/generator plus WorldRenderer/Region/final-material presentation.

**MEDIA COPIED INTO REPO?** NO Hole reference image.

**LICENSE/PERMISSION EVIDENCE:** Retrieved license box contains a media entry named `4` but links it to `/1`; the `/4` attachment therefore cannot safely inherit that entry. Drive mirror is visually matched but byte identity/permission chain is unproved.

**ATTRIBUTION:** UNKNOWN for exact `/4` from current evidence.

**UNKNOWN QUESTIONS:** `/4` creator/license mapping; mirror byte identity and permission chain.

**RECOMMENDED LEDGER UPDATE:** Keep concept source-derived; keep `/4` and mirror media `UNKNOWN / REVIEW REQUIRED`; see `PROV-LEGAL-002`/`003`.

## S-R1 Red Rooms

**CONCEPT:** S-R1 Red Rooms

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`; `UNKNOWN / REVIEW REQUIRED`

**EXTERNAL SOURCE FACT:** Source supports rare red/crimson Level 0 sections, coarse/sticky/thick carpet, distress and closed-loop/disconnected escape difficulty. The Scutoidbox image can support only its visible red-corridor cue until its source/canon is verified.

**PROJECT ACCEPTED INTERPRETATION:** Planned rare Level 0 Structure with crimson Materials/Conditions and human-designed deterministic Non-Euclidean closed-loop behavior.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** S-R1 taxonomy plus future deterministic topology/persistence/placement implementation.

**SOURCE URLS:** Level 0 page; official `/6`; Drive and Scutoidbox URLs in `REF-L0-005`/`006`.

**REFERENCE PACK:** `REF-L0-005`, `REF-L0-006`

**IMPLEMENTATION OWNER:** Design required; registry reference exists, future Structure/topology remains human-design-gated.

**MEDIA COPIED INTO REPO?** NO Red Rooms reference image.

**LICENSE/PERMISSION EVIDENCE:** No visible file-specific `/6` entry was found in the retrieved license box; Drive mirror identity/permission unresolved; Scutoidbox parent/creator/license unresolved.

**ATTRIBUTION:** UNKNOWN for `/6` and Scutoidbox at file level.

**UNKNOWN QUESTIONS:** `/6` creator/license; Drive byte identity; Scutoidbox creator/license/canon; exact future source scope.

**RECOMMENDED LEDGER UPDATE:** Keep authoritative Level 0 evidence separate from Scutoidbox `EVIDENCE-ONLY`; see `PROV-LEGAL-002`/`003`/`004`.

## Registered / planned transitions

**CONCEPT:** Current transition/destination registry

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`; `UNKNOWN / REVIEW REQUIRED`

**EXTERNAL SOURCE FACT:** The audited Level 0 source explicitly supports a Level 1 route through a flickering wall. This audit did not establish dedicated source provenance for every other registered destination/trigger.

**PROJECT ACCEPTED INTERPRETATION:** Deterministic destination registry with labels, trigger kinds, timeline/exposure gates and fixed test cells; registration does not equal source canon or destination playability.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Registry schema, stable IDs, exact labels/gates/test cells and deterministic integration.

**SOURCE URLS:** Level 0 page for Level 1; others need exact sources or explicit Project-original design classification.

**REFERENCE PACK:** No complete current transition provenance pack.

**IMPLEMENTATION OWNER:** `src/world/exits.ts`, generator/timeline/save systems.

**MEDIA COPIED INTO REPO?** NO.

**LICENSE/PERMISSION EVIDENCE:** Not a media question; concept provenance remains per destination.

**ATTRIBUTION:** Per source where source-derived.

**UNKNOWN QUESTIONS:** Provenance/classification of Level 2, 27, 483, 13, 14, Void, 0.22, 0.23, 0.99 and Red Rooms transition framing.

**RECOMMENDED LEDGER UPDATE:** Add per-transition provenance; do not treat registry presence as “the wiki says this exact route.”

## Ambient / audio identity

**CONCEPT:** Level 0 ambient/audio identity

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Fluorescent buzzing is directly source-supported; the source page also reports additional anomalous sounds.

**PROJECT ACCEPTED INTERPRETATION:** Fluorescent room tone and Blackout silence/escape-buzz are accepted; other reported sounds are not automatically adopted.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Web Audio hum harmonics, flicker snaps, steps, distant impacts, lifecycle and light-field coupling.

**SOURCE URLS:** Level 0 page.

**REFERENCE PACK:** `REF-L0-001`, `REF-L0-004`; still-image references explicitly do not establish audio.

**IMPLEMENTATION OWNER:** `src/audio/Ambience.ts`, `src/world/lighting.ts`.

**MEDIA COPIED INTO REPO?** NO source audio files.

**LICENSE/PERMISSION EVIDENCE:** No copied recording exists in the audited tree.

**ATTRIBUTION:** Source identity separately; generated implementation is Project code.

**UNKNOWN QUESTIONS:** Future recorded ambience/spatial audio requires new per-file provenance.

**RECOMMENDED LEDGER UPDATE:** Add “procedurally synthesized; no external recording committed.”

## Player / character content identity

**CONCEPT:** Player Character Profile appearance content

**CLASSIFICATION:** `REAL-WORLD-INSPIRATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** No audited Backrooms source prescribes the current body-frame, skin-tone, hair, clothing-color or profile schema.

**PROJECT ACCEPTED INTERPRETATION:** Ordinary human appearance categories and neutral clothing slots.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Profile schema, `CharacterProfileId`, profile persistence, avatar mapping/boundary and semantic asset slots.

**SOURCE URLS:** None required for generic appearance categories.

**REFERENCE PACK:** None.

**IMPLEMENTATION OWNER:** `src/player-character/profile.ts`, `profileStore.ts`, `avatar.ts`, Character Creator UI.

**MEDIA COPIED INTO REPO?** NO avatar meshes/textures.

**LICENSE/PERMISSION EVIDENCE:** No external character media committed.

**ATTRIBUTION:** None identified for generic schema.

**UNKNOWN QUESTIONS:** Future avatar meshes/materials/animations need independent provenance.

**RECOMMENDED LEDGER UPDATE:** Record generic appearance as real-world inspiration and identity/representation architecture as Project-original.

## Item names / visual identities

**CONCEPT:** Current item-definition content vocabulary

**CLASSIFICATION:** `SOURCE-DERIVED`; `REAL-WORLD-INSPIRATION`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** `Almond Water` is an externally established Backrooms object/name. Flashlight, battery, marker, paper note, glow stick, string spool, empty can and pry tool are generic real-world identities on current evidence.

**PROJECT ACCEPTED INTERPRETATION:** Project descriptions, weights, rarity/value/trade properties and presentation are separate choices unless individually sourced.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Item IDs/stats, placement/starter weighting, factories, persistent instances and inventory integration.

**SOURCE URLS:** `https://backrooms-wiki.wikidot.com/object-1` for Almond Water.

**REFERENCE PACK:** No dedicated current item provenance pack.

**IMPLEMENTATION OWNER:** `src/items/definitions.ts`, `factory.ts`, `starterRoll.ts`.

**MEDIA COPIED INTO REPO?** NO item media assets.

**LICENSE/PERMISSION EVIDENCE:** No external item media committed; name/content provenance remains separate from code.

**ATTRIBUTION:** Almond Water source should be recorded if canonically treated as source-derived.

**UNKNOWN QUESTIONS:** Whether any other current item wording was intentionally copied/adapted from an external source; no evidence found.

**RECOMMENDED LEDGER UPDATE:** Add explicit Almond Water entry; classify generic items as `REAL-WORLD-INSPIRATION` unless later evidence says otherwise.

## Generation 3 architecture

**CONCEPT:** Generation 3 world architecture

**CLASSIFICATION:** `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** External lore does not prescribe Project Noclip's Generation 3 software architecture.

**PROJECT ACCEPTED INTERPRETATION:** Source/world goals are expressed through a deterministic, versioned, continuous procedural system rather than copied mechanics.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** `gen3-v1`, version cutover, connectivity substrate, topology solver, continuous layers, stable addresses, Cell-as-cache law and old-save compatibility.

**SOURCE URLS:** None for implementation ownership.

**REFERENCE PACK:** Not applicable.

**IMPLEMENTATION OWNER:** `src/world/gen3.ts`, `gen3Architecture*.ts`, `gen3SpaceTopology*.ts`, `generator.ts`, ADR 0001.

**MEDIA COPIED INTO REPO?** NO.

**LICENSE/PERMISSION EVIDENCE:** Not media.

**ATTRIBUTION:** External content remains separately attributed; software dependencies keep their own licenses.

**UNKNOWN QUESTIONS:** None identified for provenance classification.

**RECOMMENDED LEDGER UPDATE:** Explicit originality-map entry.

## Deterministic Fields

**CONCEPT:** Continuous deterministic Field / affinity system

**CLASSIFICATION:** `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** No audited source defines the Project field math, wavelength choices or seed domains.

**PROJECT ACCEPTED INTERPRETATION:** Fields turn broad environmental direction into continuous geography/Conditions without hard districts.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Field vocabulary/sampling, bounded values, seed separation and Region/Condition affinities.

**SOURCE URLS:** None.

**REFERENCE PACK:** Not applicable.

**IMPLEMENTATION OWNER:** `src/world/fields.ts`, `src/world/gen3.ts`.

**MEDIA COPIED INTO REPO?** NO.

**LICENSE/PERMISSION EVIDENCE:** Not applicable.

**ATTRIBUTION:** None for Project algorithm.

**UNKNOWN QUESTIONS:** None identified.

**RECOMMENDED LEDGER UPDATE:** Explicit Project-original entry.

## Region system

**CONCEPT:** Region / Region-affinity ownership model

**CLASSIFICATION:** `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** External sources describe areas/variations, not Project Noclip's Region taxonomy or continuous-affinity architecture.

**PROJECT ACCEPTED INTERPRETATION:** Ordinary, Pillar Field and Arch Rooms are stable semantic Regions/modifiers of one Level.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Stable Region IDs, affinity/depth, hierarchy, Cell independence and ownership routing.

**SOURCE URLS:** Source pages only for underlying content identities.

**REFERENCE PACK:** Level 0 pack.

**IMPLEMENTATION OWNER:** world fields/gen3/types/terminology.

**MEDIA COPIED INTO REPO?** NO.

**LICENSE/PERMISSION EVIDENCE:** Not media.

**ATTRIBUTION:** Underlying source content separately.

**UNKNOWN QUESTIONS:** None identified.

**RECOMMENDED LEDGER UPDATE:** Distinguish source “variation” facts from Project Region architecture.

## Visibility architecture

**CONCEPT:** Visibility Snapshot / live render participation

**CLASSIFICATION:** `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** No audited lore/source defines this renderer architecture.

**PROJECT ACCEPTED INTERPRETATION:** Topology/occlusion becomes conservative performance input without changing semantic world truth.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Topology adapter, snapshot, propagation, safety core, hysteresis/predictive logic, participation reasons, runtime adapter and diagnostics.

**SOURCE URLS:** None.

**REFERENCE PACK:** Not applicable.

**IMPLEMENTATION OWNER:** `src/renderer/visibility/*`.

**MEDIA COPIED INTO REPO?** NO.

**LICENSE/PERMISSION EVIDENCE:** Not applicable.

**ATTRIBUTION:** None for Project architecture.

**UNKNOWN QUESTIONS:** None identified.

**RECOMMENDED LEDGER UPDATE:** Add to originality map; do not conflate with source perception/sight lore.

## Carver architecture

**CONCEPT:** General Carver architecture

**CLASSIFICATION:** `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** A source can establish subtractive phenomena such as Holes; it does not define the Project Carver software pass.

**PROJECT ACCEPTED INTERPRETATION:** Subtractive world changes run after base Region architecture under named Carver ownership.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Carver category/pass ordering, stable IDs, deterministic application and Region/material separation.

**SOURCE URLS:** Source-specific only for individual Carvers.

**REFERENCE PACK:** Individual content references.

**IMPLEMENTATION OWNER:** Gen3/generator/renderer.

**MEDIA COPIED INTO REPO?** NO.

**LICENSE/PERMISSION EVIDENCE:** Not architecture media.

**ATTRIBUTION:** Individual source content only.

**UNKNOWN QUESTIONS:** None identified.

**RECOMMENDED LEDGER UPDATE:** Add general Carver architecture as Project-original; keep CV-H1 content provenance separate.

## Studio / NAL

**CONCEPT:** Noclip Studio + Noclip Asset Library

**CLASSIFICATION:** `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** No audited Backrooms source defines this authoring/asset architecture.

**PROJECT ACCEPTED INTERPRETATION:** Human/external assets enter through explicit source/definition/build/runtime boundaries rather than silently owning world semantics.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** PAU, typed Asset slots, NAL Asset IDs/profiles/content hashes, source-runtime split, registry, Studio structured authoring, DevelopmentContext/ChangeReceipt and production security boundary.

**SOURCE URLS:** None for engineering ownership.

**REFERENCE PACK:** Not applicable.

**IMPLEMENTATION OWNER:** `src/presentation/*`, `assets/*`, `scripts/build-assets.mjs`, `tools/studio/*`.

**MEDIA COPIED INTO REPO?** The pipeline currently contains the three A/B/C source images; their rights remain separately unresolved.

**LICENSE/PERMISSION EVIDENCE:** Technical NAL metadata does not by itself prove rights/attribution.

**ATTRIBUTION:** Per asset.

**UNKNOWN QUESTIONS:** How future provenance evidence should be enforced/stored before promotion.

**RECOMMENDED LEDGER UPDATE:** Add Studio/NAL originality entry and strengthen intake evidence requirements.

## Character identity architecture

**CONCEPT:** PlayerCharacterProfile / CharacterProfileId / AvatarDefinition architecture

**CLASSIFICATION:** `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** No audited Backrooms source defines this identity model.

**PROJECT ACCEPTED INTERPRETATION:** Character identity remains separate from Journey/world seed and Item Instance identity.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Profile schema/ID, local persistence, pure avatar mapping, asset-slot contract, rig/animation vocabulary and visibility rules.

**SOURCE URLS:** None.

**REFERENCE PACK:** None.

**IMPLEMENTATION OWNER:** `src/player-character/profile.ts`, `profileStore.ts`, `avatar.ts`, identity/avatar docs.

**MEDIA COPIED INTO REPO?** NO avatar media.

**LICENSE/PERMISSION EVIDENCE:** Code-only contract at this base.

**ATTRIBUTION:** None for Project architecture.

**UNKNOWN QUESTIONS:** Future avatar assets require per-file provenance.

**RECOMMENDED LEDGER UPDATE:** Explicit Project-original entry.

## Journey architecture

**CONCEPT:** Persistent Journey / generation-version identity

**CLASSIFICATION:** `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** External content does not define the Project save identity model.

**PROJECT ACCEPTED INTERPRETATION:** A Journey is one deterministic world experience pinned to generation rules.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Save schema, journey identity, generation-version compatibility, stable addresses and deltas.

**SOURCE URLS:** None.

**REFERENCE PACK:** Not applicable.

**IMPLEMENTATION OWNER:** `src/persistence/*`, app/world identity owners, ADR 0001.

**MEDIA COPIED INTO REPO?** NO.

**LICENSE/PERMISSION EVIDENCE:** Not applicable.

**ATTRIBUTION:** None for architecture.

**UNKNOWN QUESTIONS:** None identified.

**RECOMMENDED LEDGER UPDATE:** Add to originality map.

## Item Instance architecture

**CONCEPT:** Item Definition / Item Instance identity

**CLASSIFICATION:** `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** External content may define an item concept; it does not define Project persistent instance identity.

**PROJECT ACCEPTED INTERPRETATION:** Item content definition remains separate from one concrete persistent object.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** `instanceId`, deterministic factory/origin/revision state and persistence semantics.

**SOURCE URLS:** Content-specific only.

**REFERENCE PACK:** Not applicable.

**IMPLEMENTATION OWNER:** item types/factory and persistence.

**MEDIA COPIED INTO REPO?** NO.

**LICENSE/PERMISSION EVIDENCE:** Not applicable.

**ATTRIBUTION:** Content-specific only.

**UNKNOWN QUESTIONS:** None identified.

**RECOMMENDED LEDGER UPDATE:** Add as Project-original separate from item-content provenance.

## Inventory architecture

**CONCEPT:** Inventory domain / UI identity preservation

**CLASSIFICATION:** `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** No audited Backrooms source defines Project container ordering, selection persistence or UI contract.

**PROJECT ACCEPTED INTERPRETATION:** Inventory presents source-derived or real-world item concepts without changing persistent object identity.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Inventory operations, reorder/selection by `instanceId`, six-slot projection, persistence and accessibility interaction behavior.

**SOURCE URLS:** None for architecture.

**REFERENCE PACK:** Not applicable.

**IMPLEMENTATION OWNER:** `src/inventory/inventory.ts`, `src/ui/inventoryPresentation.ts`, `InventorySurface.ts`, `GameUI.ts`.

**MEDIA COPIED INTO REPO?** NO dedicated inventory/item media.

**LICENSE/PERMISSION EVIDENCE:** Not applicable to code-only UI.

**ATTRIBUTION:** Content-specific only.

**UNKNOWN QUESTIONS:** None identified.

**RECOMMENDED LEDGER UPDATE:** Add to originality map.

# External Source Facts

The audit re-verified only already-recorded/relevant sources rather than expanding canon.

- The Backrooms Wiki Level 0 page credits an original 4chan concept and identifies later adaptation/rewrite contributors.
- It describes Ordinary Level 0 plus Arches, Pillars, Holes, Blackout Zones and Red Rooms.
- It describes fluorescent buzzing, carpet characteristics, shifting/perceptual behavior, an Isolation Effect and an explicit Level 1 exit route.
- These are source claims. Only what Project Noclip deliberately accepts in `WORLD.md`/governance is Project world truth.
- The Backrooms Wiki Object 1 page supports the `Almond Water` name/concept.
- Source-page retrieval snapshots can drift. Provenance promotion should record access date/revision instead of assuming the page remains unchanged.

# Project Noclip Interpretations

- Ordinary, Pillar Field and Arch Rooms are continuous Regions of one Level 0 substrate rather than Cell-sized districts.
- Pillar/path-shift language is not implemented as arbitrary live geometry mutation; current geometry remains deterministic/Euclidean unless a human-approved Non-Euclidean design says otherwise.
- Arch evidence is interpreted as divider/wall grammar; earlier freestanding-arch inference was corrected.
- Blackout is a Condition, not a separate Region/template.
- Holes are a subtractive Carver; the source does not define Project Carver taxonomy or exact geometry/collision.
- Red Rooms are planned as a rare Structure with design-gated deterministic Non-Euclidean behavior; the source does not define the exact topology algorithm.
- Fluorescent buzz is accepted; anomalous voices/scratching reported by the source are not automatically accepted.
- Transition registry presence is implementation state, not source/canon evidence.
- Generic human appearance and real-world object identities are not source-derived merely because they appear in a Backrooms game.

# Project-Noclip-Original Work

Strongly evidenced Project-original systems/designs:

- Generation 3 versioned geography and `gen3-v1` cutover.
- Deterministic seed domains and stable world addresses.
- Continuous Fields and Region affinity/depth.
- Connectivity-first semantic topology and partition solving.
- Region taxonomy and Architecture Pattern IDs such as `O-A1`, `P-A1`, `A-A1`.
- Deterministic Carver pass architecture and current CV-H1 realization.
- Journey/save/generation-version compatibility architecture.
- Wallpaper family resolver, UV/phase rules, Region-aware material ownership and Asset-slot runtime.
- M-F1 fixture/light synchronization and renderer performance implementation.
- Procedural Web Audio ambience.
- PAU/NAL source-definition-build-runtime architecture and Noclip Studio.
- Visibility Snapshot/topology adapter/propagation/live participation.
- Character Profile / `CharacterProfileId` and Avatar representation architecture.
- Item Definition versus persistent Item Instance identity.
- Inventory domain and instance-keyed UI projection.
- Current streaming/render-performance mechanisms.

These originality claims apply to implementation/system design, not to underlying Backrooms concepts, names, photographs or source-derived aesthetic facts.

# Asset / Media Inventory

`DOCUMENTED` means evidence was found and described. It does **not** mean “safe for commercial use.”

| PATH / IDENTIFIER | SOURCE | CREATOR | HOW OBTAINED | USER-PROVIDED? | LICENSE / PERMISSION EVIDENCE | ATTRIBUTION REQUIREMENT | MODIFIED / DERIVATIVE? | REPOSITORY COPY? | SAFE STATUS |
|---|---|---|---|---|---|---|---|---|---|
| `assets/source/images/level0-wallpaper-a-chevron.webp` | underlying source not recorded | UNKNOWN | user-provided, prepared as game-ready derivative | YES | project-use authorization asserted only; underlying chain absent | UNKNOWN | YES | YES | NEEDS REVIEW |
| `assets/source/images/level0-wallpaper-b-dots.webp` | underlying source not recorded | UNKNOWN | user-provided; history calls A/B supplied derivatives | YES | same limitation | UNKNOWN | YES | YES | NEEDS REVIEW |
| `assets/source/images/level0-wallpaper-c-lines.webp` | underlying source not recorded | UNKNOWN | user-provided, prepared as game-ready derivative | YES | project-use authorization asserted only; underlying chain absent | UNKNOWN | YES | YES | NEEDS REVIEW |
| `REF-L0-001` baseline photo | Backrooms Wiki + Archive source | Bob Mazza | external reference | NO | retrieved media box: CC0 1.0 | no attribution requirement stated by CC0; retain source record | NO Project derivative | NO | DOCUMENTED |
| `REF-L0-007` Arch `/2` | Backrooms Wiki + Archive source | Bob Mazza | external reference | NO | retrieved media box: CC0 1.0 | same documentation position | NO Project derivative | NO | DOCUMENTED |
| `REF-L0-002` Pillar `/3` | Backrooms Wiki | Alfarex | external reference | NO | retrieved media box: CC BY-SA 4.0 | attribution-bearing terms stated | NO Project derivative | NO | DOCUMENTED |
| `REF-L0-004` Blackout `/5` | Backrooms Wiki | Alfarex | external reference | NO | retrieved media box: CC BY-SA 4.0 | attribution-bearing terms stated | NO Project derivative | NO | DOCUMENTED |
| `REF-L0-003` Hole `/4` | Backrooms Wiki | UNKNOWN for exact `/4` mapping | external reference | NO | media-box `Name: 4` links `/1`; `/4` terms not safely established | UNKNOWN | NO Project derivative | NO | NEEDS REVIEW |
| Hole Drive mirror | user-supplied Drive mirror | UNKNOWN | user-provided mirror link | YES | visual/dimension match only; byte identity/permission unproved | UNKNOWN | UNKNOWN | NO | NEEDS REVIEW |
| `REF-L0-005` Red `/6` | Backrooms Wiki | UNKNOWN from retrieved file-level evidence | external reference | NO | no visible file-specific `/6` entry found | UNKNOWN | NO Project derivative | NO | NEEDS REVIEW |
| Red Drive mirror | user-supplied Drive mirror | UNKNOWN | user-provided mirror link | YES | visual/dimension match only; byte identity/permission unproved | UNKNOWN | UNKNOWN | NO | NEEDS REVIEW |
| `REF-L0-006` Scutoidbox red image | Scutoidbox Wikidot file host | UNKNOWN | user-provided external reference | YES | parent/canon/creator/license unresolved | UNKNOWN | UNKNOWN | NO | NEEDS REVIEW |
| current ambience (`src/audio/Ambience.ts`) | Project-generated Web Audio | Project Noclip | runtime synthesis | NO external recording | no copied recording | not an external-media attribution case | generated, not derivative media on current evidence | code only | DOCUMENTED |

Tree-level inventory at the pinned base:

- source images committed: exactly the three M-W1 WebPs above;
- source audio committed: none found;
- source meshes/GLBs committed: none found;
- project-specific font files committed: none found;
- video committed: none found;
- reference screenshots/photos copied under `docs/references`: none found; references are textual/URL records;
- current NAL technical metadata does not resolve the missing A/B/C underlying rights chain.

# Wiki / Canon Separation Findings

## Source claim is not Project acceptance

Repository language should never imply `the wiki says X -> Project Noclip contains X exactly this way`. Reference evidence, accepted world truth and implementation must remain separate owners.

## Current Level 0 source includes claims not automatically adopted

Examples include arbitrary shifting/Peripheral Shift, Isolation Effect, anomalous voices/scratching and source-specific traversal/exit behavior. These remain external facts unless deliberately accepted by Project world/product ownership.

## Multiple sources/canons must not inherit authority from each other

`REF-L0-006` is the clearest example. A Scutoidbox red-corridor image cannot inherit the authoritative Level 0 page's canon standing or media terms merely because the visual theme is similar.

## Registry state is not canon evidence

The current transition registry contains multiple destinations and Project-specific triggers. Only the Level 1 route was re-verified against the audited Level 0 source. Every other source-derived transition claim needs its own evidence; alternatively it must be explicitly classified as Project interpretation/original design.

## Deterministic law can intentionally differ from source behavior

Pillar/path shifting and broader Level 0 shifting are external source facts. Project Noclip's deterministic geometry is an explicit interpretation/engineering choice, not evidence that the external source lacks those claims.

## Page and attachment terms differ

The retrieved Level 0 page itself lists file-specific media licenses that differ from page-text licensing. “Wiki-hosted” is not a sufficient file-level provenance statement.

# Copied-Text Review

Audited surfaces included the current provenance ledger, Level 0 reference pack, `WORLD.md`, relevant source/asset metadata and relevant implementation/comments.

No substantial copied external prose was identified.

Two representative exact-phrase searches for distinctive source wording returned no current repository match:

- `tight-knit, Berber-style`
- `thick, sticky, and very coarse`

Current references mostly use concise factual paraphrases such as shallower/less-moist carpet, coarse/sticky Red Rooms carpet or escape difficulty. These should remain evidence notes rather than a precedent for importing source paragraphs.

Future rule: prefer concise factual paraphrase + exact source URL/reference ID; keep direct quotation bounded and attributable when genuinely necessary. No text was deleted or rewritten during this audit.

# Attribution / License Evidence

## Page text

The retrieved Level 0 license box states CC BY-SA 3.0 for the page and names DivineAtlas, DrAkimoto and RobertGoerman in its citation block; the page's credit section separately records the original 4chan concept and earlier adaptation/rewrite history. This audit records those source statements without deciding their project-wide legal scope.

## File-specific media

Retrieved file-specific evidence:

- baseline “Backrooms” photo — Bob Mazza — CC0 1.0 — Archive source;
- “Arches” photo — Bob Mazza — CC0 1.0 — Archive source;
- media `3` / Pillar — Alfarex — CC BY-SA 4.0 — `/3` source;
- media `5` / Blackout — Alfarex — CC BY-SA 4.0 — `/5` source.

## Hole `/4`

A visible media entry named `4` gives Alfarex/CC BY-SA 4.0 but links to `/1`, while the Hole reference uses `/4`. Because the mapping is inconsistent, this audit does not transfer that license entry to the `/4` file.

## Red `/6`

No visible file-specific `/6` entry was found in the retrieved license box. Page-level terms are not treated as automatic proof of `/6` file-level terms.

## M-W1 A/B/C

`assets/definitions/library.json` records a user-provided/project-use-authorization assertion but no underlying creator/source/license/permission artifact. That is not enough evidence to upgrade any A/B/C file beyond `UNKNOWN / REVIEW REQUIRED`.

# Unknown / Review Required

## PROV-LEGAL-001

**SUBJECT:** M-W1 A/B/C underlying source/creator/license chain.

**KNOWN FACTS:** Three WebPs are committed; metadata calls them user-provided game-ready derivatives; history calls A/B supplied source derivatives; project-use authorization was asserted.

**SOURCE:** `assets/source/images/*`, `assets/definitions/library.json`, repository history.

**WHAT IS UNKNOWN:** Original source(s)/bytes, creator(s), transformation chain, permission/license text, redistribution scope, attribution/notices and whether one authorization covers all files.

**WHY IT MATTERS:** They are the only committed source-media payloads and are used by M-W1.

**WHAT EVIDENCE WOULD RESOLVE IT:** Original files/URLs, creator identity, dated license/permission artifact, allowed use/distribution scope, required attribution/notices and hashes connecting source to derivatives.

**CURRENT SAFE DOCUMENTATION POSITION:** `UNKNOWN / REVIEW REQUIRED`; do not infer commercial safety or treat “user-provided” as a complete rights chain.

## PROV-LEGAL-002

**SUBJECT:** Exact file-level terms for Hole `/4` and Red `/6`.

**KNOWN FACTS:** Page text has page-level terms and separate media entries. Hole uses `/4`, but displayed `Name: 4` links to `/1`. No visible `/6` entry was found.

**SOURCE:** Retrieved Level 0 license box; `REF-L0-003`; `REF-L0-005`.

**WHAT IS UNKNOWN:** Correct creator/license/source mapping for `/4` and file-specific creator/license/source for `/6`.

**WHY IT MATTERS:** Attachment terms may differ from page terms.

**WHAT EVIDENCE WOULD RESOLVE IT:** Authoritative attachment history/metadata tying exact file paths/hashes to creator/source/license.

**CURRENT SAFE DOCUMENTATION POSITION:** Content concepts remain source-derived; exact attachment status stays `UNKNOWN / REVIEW REQUIRED`.

## PROV-LEGAL-003

**SUBJECT:** Hole/Red Google Drive mirror byte identity and permission chain.

**KNOWN FACTS:** Reference pack records public user-provided Drive mirrors that visually/dimensionally match official images.

**SOURCE:** `REF-L0-003`, `REF-L0-005`.

**WHAT IS UNKNOWN:** Byte equality, mirror owner/uploader, authorization, modification history.

**WHY IT MATTERS:** Visual match/public access does not prove identical bytes or reuse permission.

**WHAT EVIDENCE WOULD RESOLVE IT:** Official + mirror bytes, SHA-256 equality, mirror ownership/source statement and permission/license evidence.

**CURRENT SAFE DOCUMENTATION POSITION:** Prefer official source for factual provenance; keep mirrors `UNKNOWN / REVIEW REQUIRED`.

## PROV-LEGAL-004

**SUBJECT:** Scutoidbox Red Rooms image provenance/canon/media terms.

**KNOWN FACTS:** A Scutoidbox-hosted red corridor image is recorded as `EVIDENCE-ONLY`; parent/canon/authorship/license could not be verified.

**SOURCE:** `REF-L0-006`.

**WHAT IS UNKNOWN:** Original creator/source, parent-page canon/authority, license/permission and relationship to authoritative Level 0 material.

**WHY IT MATTERS:** Similar imagery must not transfer canon authority or rights terms between sources.

**WHAT EVIDENCE WOULD RESOLVE IT:** Accessible parent/history/license metadata, creator/source link and independent canon/source evidence.

**CURRENT SAFE DOCUMENTATION POSITION:** `UNKNOWN / REVIEW REQUIRED`; visual corroboration only.

## PROV-LEGAL-005

**SUBJECT:** Scope/applicability of source-site share-alike/game guidance to Project Noclip's mixed source-derived content and original software.

**KNOWN FACTS:** Retrieved Level 0 page states CC BY-SA 3.0 for page text and separate terms for some media; the source site's licensing material includes game/derivative guidance; Project Noclip combines original engineering, adapted content facts/interpretations and separately sourced media.

**SOURCE:** Backrooms Wiki Level 0 license box and licensing guidance.

**WHAT IS UNKNOWN:** Legal scope/applicability to repository code, compiled game, adapted world content, separately licensed media and distribution model.

**WHY IT MATTERS:** It may affect notices, attribution, content licensing and distribution, but requires legal analysis outside this audit.

**WHAT EVIDENCE WOULD RESOLVE IT:** Qualified legal review of actual uses, licenses/permissions, repository/distribution structure and applicable jurisdiction; or a project-approved licensing policy grounded in such review.

**CURRENT SAFE DOCUMENTATION POSITION:** Record source/license statements accurately; make no project-wide legal/license conclusion here.

## PROV-LEGAL-006

**SUBJECT:** Future audio/texture/mesh/font/video import rules.

**KNOWN FACTS:** NAL validates technical source/definition/build constraints. Current source-media payloads are limited to the three wallpaper images.

**SOURCE:** NAL/source-asset governance and current tree.

**WHAT IS UNKNOWN:** Future creator/source/license/permission terms.

**WHY IT MATTERS:** Technical validation/hashing does not prove authorization or attribution compliance.

**WHAT EVIDENCE WOULD RESOLVE IT:** Per-file source URL/original, creator, acquisition method, permission/license artifact, attribution, modification history and immutable hashes before promotion.

**CURRENT SAFE DOCUMENTATION POSITION:** Unresolved external assets remain `UNKNOWN / REVIEW REQUIRED`; NAL acceptance must not be treated as rights validation.

Additional unresolved provenance:

- transition sources/classification beyond the re-verified Level 1 source claim;
- any future avatar mesh/material/animation provenance;
- whether any current item wording besides the Almond Water concept intentionally derives from external prose; no evidence found;
- source-page revision drift: later ledger promotion should record exact evidence-capture date/revision.

# Canonical Ledger Updates Recommended

For the later centralized synthesis only; this audit does not edit `docs/CONTENT_PROVENANCE.md`.

1. Add file-specific Bob Mazza / CC0 1.0 evidence for baseline and Arch reference images.
2. Record exact Alfarex / CC BY-SA 4.0 evidence for Pillar `/3` and Blackout `/5`.
3. Keep Hole `/4` file terms unresolved because of the `Name: 4` -> `/1` mismatch.
4. Keep Red `/6` file terms unresolved until exact creator/license mapping is verified.
5. Track Drive mirrors separately from official attachments, including hashes and permission chain.
6. Preserve Scutoidbox as `EVIDENCE-ONLY` / `UNKNOWN / REVIEW REQUIRED` until parent/canon/creator/license is verified.
7. Keep A/B/C `UNKNOWN / REVIEW REQUIRED` and add per-file origin/creator/license/permission/attribution/hash fields when evidence exists.
8. Add current audio status: source-derived fluorescent-buzz identity, Project-original procedural synthesis, no copied recording committed.
9. Add an explicit Almond Water source-derived concept/name entry; keep Project stats/descriptions/instance behavior separate.
10. Classify generic current item identities as `REAL-WORLD-INSPIRATION` unless specific external provenance is later found.
11. Add per-transition provenance rather than treating registry state as canon evidence; the currently re-verified Level 1 route can be recorded separately from unresolved others.
12. Expand the originality map for Generation 3, deterministic Fields, Region system, topology, Carver architecture, Journey persistence/versioning and visibility.
13. Expand the originality map for PAU/NAL/Studio, procedural material/audio implementation, Character Profile/Avatar architecture, Item Instance and Inventory.
14. Record exact external source access date/revision with promoted evidence so future wiki edits do not silently rewrite provenance history.
15. Preserve concise paraphrase practice; do not use source prose as a substitute for a source record.

# Future Content Intake Recommendations

For every external or user-provided media file, capture before repository/runtime promotion:

```text
ASSET ID / intended role
ORIGINAL SOURCE URL or acquisition record
ORIGINAL FILE NAME
CREATOR / AUTHOR
HOW OBTAINED
USER-PROVIDED? YES / NO / UNKNOWN
SOURCE PAGE / SOURCE CANON
LICENSE or PERMISSION EVIDENCE
ATTRIBUTION / NOTICE TEXT
FILE-LEVEL TERMS vs PAGE-LEVEL TERMS
MODIFIED / DERIVATIVE? YES / NO / UNKNOWN
MODIFICATION CHAIN
ORIGINAL SHA-256
PROJECT SOURCE SHA-256
REPOSITORY COPY? YES / NO
STATUS: DOCUMENTED / UNKNOWN / NEEDS REVIEW
```

Operational rules recommended for synthesis/governance:

- Technical NAL/build success must never imply provenance/permission success.
- Require file-level terms where a source distinguishes page and attachment licensing.
- Prefer authoritative/original URLs over mirrors; if a mirror is necessary, hash both and record mirror ownership/permission separately.
- Treat “user-provided” as provenance information, not a rights conclusion.
- Record modifications without assuming they remove source obligations or uncertainty.
- Keep source fact, Project acceptance and implementation in separate fields.
- Do not promote a wiki claim into `WORLD.md` solely because it exists on a source page.
- Do not transfer authority/license between different canons/sources because imagery is similar.
- For future audio, distinguish external recording, Project synthesis and derivative mix.
- For future meshes/avatars, record mesh, rig/animation and texture creators/licenses separately where applicable.
- Prefer concise factual paraphrase with exact source URL/reference ID; use bounded direct quotation only where necessary.
- When genuine licensing uncertainty remains, use `PROV-LEGAL-###` and keep `UNKNOWN / REVIEW REQUIRED` until evidence resolves it.

```text
PROVENANCE_IMPACT=REVIEWED

Reason:
the existing provenance record and source evidence were audited;
canonical ledger changes are deferred to synthesis.
```
