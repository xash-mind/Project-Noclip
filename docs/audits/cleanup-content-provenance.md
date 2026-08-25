# Executive Summary

This is a factual provenance and external-source-separation audit of Project Noclip at:

- Base ref: `preview/cleanup-governance-baseline`
- Base SHA: `741414a0f9606f9fb9af06f85b6c601c275e266b`
- Version: `0.3.0-dev.9.8`
- Audit branch: `agent/cleanup-audit-provenance`

This document is not legal advice. It records repository evidence, source-page statements, explicit media/license metadata where available, and unresolved questions. It does not infer that public visibility grants reuse rights, that a page license necessarily governs every attachment, that modification cures an unresolved rights chain, or that one source/canon automatically defines Project Noclip world truth.

The repository's permanent provenance model is directionally correct and should be preserved. The strongest distinction is:

```text
BACKROOMS / EXTERNAL CONTENT IDENTITY
!=
PROJECT NOCLIP ACCEPTANCE / INTERPRETATION
!=
PROJECT NOCLIP SOFTWARE / ENGINEERING IMPLEMENTATION
```

For current Level 0, the recognizable source-derived layer includes the ordinary yellow-wallpaper / damp-carpet / suspended-ceiling / fluorescent-buzz identity, Pillar, Arch, Hole, Blackout and Red Rooms source concepts, plus the externally established item name/concept `Almond Water`. The current procedural geography, deterministic Fields, Region model, semantic topology, Generation 3 versioning, visibility architecture, Carver implementation, NAL/Studio authoring architecture, player-character identity model, Item Instance identity model, Inventory domain and renderer/runtime techniques are Project-Noclip-original engineering even when they implement source-derived content.

The largest provenance risk is not the code. It is the small committed media set. The repository contains three source wallpaper WebP derivatives under `assets/source/images/`. Their metadata and history establish that they were user-provided and prepared as game-ready derivatives, but do not establish the underlying source identity, creator, original license/permission chain, attribution requirement, or whether the asserted project-use authorization is sufficient for repository distribution. Their current safe documentation position remains `UNKNOWN / REVIEW REQUIRED`.

The audited tree contains no committed source audio, meshes, fonts, videos or reference screenshots. Current ambient sound is procedurally synthesized with Web Audio rather than copied from an external recording. Therefore the *fluorescent-buzz identity* is source-derived, while the waveform/tuning/runtime implementation is Project-Noclip-original.

External-source verification also produced a useful distinction between page-level and file-level licensing. The current Backrooms Wiki Level 0 page states CC BY-SA 3.0 for page text, while its license box gives separate media entries. The baseline photo and Arch photo are explicitly credited to Bob Mazza under CC0 1.0; the Pillar and Blackout images are explicitly credited to Alfarex under CC BY-SA 4.0. The current license box does not safely resolve the Hole `/4` attachment because one displayed media entry named `4` links to `/1`, and it does not show a file-specific entry for the Red Rooms `/6` image. Those gaps must remain `UNKNOWN / REVIEW REQUIRED` rather than inheriting page-level terms by assumption.

No substantial copied external prose was found in the audited current world/provenance/reference surfaces or implementation. Current reference notes use short factual paraphrases and extracted observations. Some phrasing is close to source terminology because it names factual characteristics; those passages should continue to be treated as concise evidence notes rather than a license to import source prose wholesale.

No product decision is made here. In particular this audit does not decide which Backrooms canon Project Noclip should adopt, whether any disputed content should be removed, whether a Region should visually change, or whether Project Noclip should stop using a source-derived concept.

# Provenance Model Validation

The permanent classes remain exactly:

- `SOURCE-DERIVED`
- `INTERPRETATION`
- `PROJECT-NOCLIP-ORIGINAL`
- `REAL-WORLD-INSPIRATION`
- `UNKNOWN / REVIEW REQUIRED`

The current governance model correctly separates evidence layers:

1. `docs/references/**` owns raw source/evidence history and fidelity extraction.
2. `docs/CONTENT_PROVENANCE.md` owns the concept-level provenance ledger.
3. `WORLD.md` owns accepted Project Noclip world truth.
4. `docs/VISION.md` owns product/creative direction.
5. Runtime and presentation code own implementation, not external canon.

This audit found no reason to invent another top-level class. Several concepts require more than one existing class because different layers of the same player-facing result have different provenance. Example:

```text
SOURCE-DERIVED
  Level 0 has yellow patterned wall identity and fluorescent buzz.

INTERPRETATION
  Project Noclip chooses continuous Region-aware procedural presentation
  and deterministic variation to express that identity.

PROJECT-NOCLIP-ORIGINAL
  Generation 3 fields/topology, wallpaper resolver, UV phase rules,
  PAU/NAL, Studio, renderer integration and performance architecture.
```

The principal model weakness is completeness, not taxonomy. Current content and engineering have grown faster than the canonical concept ledger. Synthesis should therefore extend the ledger rather than replace its structure.

# Current Concept Matrix

## CONCEPT: Level 0 / Ordinary Level 0

**CONCEPT:** Level 0 / Ordinary Level 0

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** The audited Backrooms Wiki Level 0 page presents a yellow-wallpaper, moist-carpet, suspended-ceiling, fluorescent-lit labyrinthine environment and describes the ordinary fluorescent buzz. The baseline photograph is externally sourced.

**PROJECT ACCEPTED INTERPRETATION:** Ordinary Level 0 is the shared continuous substrate from which current Regions and layered Conditions/Carvers emerge. The project deliberately does not reproduce every source-page anomaly or spatial claim literally.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Generation 3 connectivity-first topology, deterministic architecture solver, Field sampling, world-space semantic IDs, Cell-independent Region continuity, save/version compatibility, renderer/presentation ownership and performance implementation.

**SOURCE URLS:** `https://backrooms-wiki.wikidot.com/level-0`; baseline media recorded in `REF-L0-001`.

**REFERENCE PACK:** `docs/references/level-0/REFERENCES.md` — `REF-L0-001`.

**IMPLEMENTATION OWNER:** `src/world/gen3.ts`, `src/world/fields.ts`, `src/world/gen3SpaceTopology*.ts`, `src/world/gen3Architecture*.ts`, renderer/presentation owners from `docs/CODE_MAP.md`.

**MEDIA COPIED INTO REPO?** No baseline reference photograph was found as a committed repository copy.

**LICENSE/PERMISSION EVIDENCE:** Current source page media box explicitly credits the baseline image to Bob Mazza under CC0 1.0. Page text separately states CC BY-SA 3.0. These are recorded source statements; no project-wide licensing conclusion is made.

**ATTRIBUTION:** Source identity should remain recorded even where a media license does not require attribution. Page-text attribution requirements should be tracked separately from media terms.

**UNKNOWN QUESTIONS:** Scope/applicability of source-page terms to downstream Project Noclip content is a separate rights question; see `PROV-LEGAL-005`.

**RECOMMENDED LEDGER UPDATE:** Retain the source/interpretation/original split; add file-specific baseline media credit/license evidence and current source-page revision/access evidence.

## CONCEPT: Pillar Field

**CONCEPT:** Pillar Field

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** The source page recognizes a Pillar Variation with rectangular wallpaper-clad supports, grid/lattice characteristics and shallower/less-moist carpet; the source text also describes instability/path changes not currently adopted literally.

**PROJECT ACCEPTED INTERPRETATION:** Project Noclip makes Pillar Field a continuous Region modifier of Ordinary Level 0, preserves current Euclidean deterministic geometry and expresses deeper pillar affinity without treating a streaming Cell as a district.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Region affinity/depth implementation, deterministic lattice sampling, exact rarity/density blending, solver integration, compatibility/save behavior and rendering.

**SOURCE URLS:** `https://backrooms-wiki.wikidot.com/level-0`; attachment `/3` recorded in `REF-L0-002`.

**REFERENCE PACK:** `REF-L0-002`.

**IMPLEMENTATION OWNER:** `src/world/fields.ts`, `src/world/gen3.ts`, `src/world/gen3ArchitectureCore.ts`, `src/world/gen3SpaceTopologyBuild.ts`.

**MEDIA COPIED INTO REPO?** No.

**LICENSE/PERMISSION EVIDENCE:** Current Level 0 page media box explicitly lists media name `3`, creator Alfarex, CC BY-SA 4.0, with source link `/3`.

**ATTRIBUTION:** The source page states an attribution-bearing license for this attachment. Exact fulfillment belongs to later distribution/licensing review, not this audit.

**UNKNOWN QUESTIONS:** Whether older repo wording that referenced a more general CC BY-SA 3.0 render credit should be superseded by the current file-specific CC BY-SA 4.0 evidence.

**RECOMMENDED LEDGER UPDATE:** Record current file-specific creator/license evidence for `/3`; preserve source-described path-shift behavior as source fact but not implemented Project canon.

## CONCEPT: P-A1 — Pillar Pier

**CONCEPT:** P-A1 — Pillar Pier

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Rectangular floor-to-ceiling wallpaper-clad pillar/pier identity and repeated pillar spacing are source-supported.

**PROJECT ACCEPTED INTERPRETATION:** P-A1 is the named Region-owned architecture pattern for Project Noclip's Pillar Field rather than a claim that the external source defines this exact semantic architecture taxonomy.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Stable pattern ID, 7.2 m lattice, exact Project dimensions, depth-based expression, route-clearance law, generation address and renderer ownership.

**SOURCE URLS:** Level 0 page and `/3` attachment.

**REFERENCE PACK:** `REF-L0-002`.

**IMPLEMENTATION OWNER:** `src/world/gen3ArchitectureCore.ts`, `src/world/gen3SpaceTopologyBuild.ts`, `src/renderer/level0SurfacePresentation.ts`.

**MEDIA COPIED INTO REPO?** No.

**LICENSE/PERMISSION EVIDENCE:** Same external media evidence as Pillar Field; no source media copied into P-A1 implementation.

**ATTRIBUTION:** See Pillar Field evidence.

**UNKNOWN QUESTIONS:** None material to the software pattern itself; future source-media use remains asset-specific.

**RECOMMENDED LEDGER UPDATE:** Explicitly separate source-derived pier visual identity from Project-original P-A1 semantic ID, dimensions and deterministic implementation.

## CONCEPT: Arch Rooms

**CONCEPT:** Arch Rooms

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Source evidence supports a pale Arch Variation with repeated arch-shaped openings in a continuous divider/wall, deeper/wetter carpet and unusual spatial stability.

**PROJECT ACCEPTED INTERPRETATION:** Project Noclip models this as a continuous Arch Rooms Region modifier, keeps current geometry Euclidean/stable and treats the source image as a divider grammar rather than freestanding monuments.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Region affinity/depth, topology integration, exact divider dimensions, bounded irregularity rules, termination logic, collision reconstruction and renderer implementation.

**SOURCE URLS:** `https://backrooms-wiki.wikidot.com/level-0`; Arch media `/2` recorded in `REF-L0-007`.

**REFERENCE PACK:** `REF-L0-007`.

**IMPLEMENTATION OWNER:** `src/world/fields.ts`, `src/world/gen3SpaceTopologyDomain.ts`, `src/world/gen3SpaceTopologyBuild.ts`, `src/renderer/level0RegionPresentation.ts`, `src/renderer/archDividerRuntimeCorrection.ts`.

**MEDIA COPIED INTO REPO?** No.

**LICENSE/PERMISSION EVIDENCE:** Current source page media box lists the Arch image as “Arches,” creator Bob Mazza, CC0 1.0, with an archive source link.

**ATTRIBUTION:** Preserve creator/source recording even where the stated media license does not require attribution.

**UNKNOWN QUESTIONS:** No material file-level license ambiguity found for `/2` in the current source page; downstream project-license implications are outside this audit.

**RECOMMENDED LEDGER UPDATE:** Add the file-specific Bob Mazza / CC0 1.0 evidence; retain the existing warning that source identity does not prescribe exact Project divider dimensions or renderer construction.

## CONCEPT: A-A1 — Arch Divider

**CONCEPT:** A-A1 — Arch Divider

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** A continuous divider/wall with repeated arch-shaped openings is source-supported.

**PROJECT ACCEPTED INTERPRETATION:** A-A1 is Project Noclip's semantic architecture pattern for expressing that source direction inside the Arch Rooms Region.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** A-A1 stable ID and conceptual piece vocabulary, exact piers/header/curve/lower-panel/termination dimensions, topology ownership, continuity across Cells, collision correction and presentation reconstruction.

**SOURCE URLS:** Level 0 page, `/2` attachment.

**REFERENCE PACK:** `REF-L0-007`.

**IMPLEMENTATION OWNER:** `src/world/gen3ArchitectureCore.ts`, `src/world/gen3SpaceTopologyBuild.ts`, `src/renderer/level0RegionPresentation.ts`, `src/renderer/archDividerRuntimeCorrection.ts`, `src/renderer/finalLevel0MaterialPresentation.ts`.

**MEDIA COPIED INTO REPO?** No.

**LICENSE/PERMISSION EVIDENCE:** Same external Arch image evidence as above.

**ATTRIBUTION:** Same external Arch source record as above.

**UNKNOWN QUESTIONS:** None material to A-A1 engineering originality.

**RECOMMENDED LEDGER UPDATE:** Explicitly identify A-A1 taxonomy and dimensions as Project-original implementation/interpretation, not external canon.

## CONCEPT: M-W1 wallpaper identity

**CONCEPT:** M-W1 wallpaper identity

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Yellow/pale patterned wallpaper is a core source-supported Level 0 visual identity.

**PROJECT ACCEPTED INTERPRETATION:** Project Noclip uses a deterministic multi-family wallpaper treatment with controlled brightness/variation to reproduce the accepted identity procedurally across Region-owned wall surfaces.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** M-W1 semantic material ID, deterministic family resolver, family weights, world-space UV/phase rules, image-transform pipeline, typed Asset slots, Region-aware material ownership, fallback behavior and renderer cache integration.

**SOURCE URLS:** Level 0 page and baseline/variation references.

**REFERENCE PACK:** `REF-L0-001`, `REF-L0-002`, `REF-L0-003`, `REF-L0-004`, `REF-L0-007`.

**IMPLEMENTATION OWNER:** `src/presentation/definitions/level0-materials.json`, `src/renderer/ordinaryWallpaperRules.ts`, `src/renderer/ordinaryWallpaperAssets.ts`, `src/renderer/ordinaryWallpaperPresentation.ts`, `src/renderer/presentationImageTextures.ts`.

**MEDIA COPIED INTO REPO?** Yes, but only the three A/B/C derived wallpaper source assets identified separately below; source-reference photographs themselves are not committed.

**LICENSE/PERMISSION EVIDENCE:** Concept identity is externally evidenced. The committed A/B/C media chain is unresolved and must not inherit unrelated reference-image terms.

**ATTRIBUTION:** Unknown for A/B/C until their underlying source chain is identified.

**UNKNOWN QUESTIONS:** Underlying source/creator/license/permission chain for A/B/C; whether their visual motifs derive from a specific externally controlled image or independent/user-created source material.

**RECOMMENDED LEDGER UPDATE:** Keep M-W1 concept provenance separate from A/B/C file provenance; do not let source-backed wallpaper identity imply resolved rights for the committed textures.

## CONCEPT: M-W1 A/B/C committed assets

**CONCEPT:** `level0.wallpaper.a-chevron`, `level0.wallpaper.b-dots`, `level0.wallpaper.c-lines`

**CLASSIFICATION:** `UNKNOWN / REVIEW REQUIRED`

**EXTERNAL SOURCE FACT:** Repository metadata says each is a “User-provided Level 0 wallpaper reference prepared as a dev.9.1 game-ready derivative.” Git history further calls A/B “supplied ... source derivatives.” This proves provenance assertions inside the project, not the underlying rights chain.

**PROJECT ACCEPTED INTERPRETATION:** They are treated as current M-W1 source assets and consumed through NAL/presentation Asset slots.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** File preparation workflow, semantic Asset IDs, NAL definition/build validation, hashing, runtime resolution and material treatment are Project implementation. The image bytes themselves cannot be classified as Project-original from current evidence.

**SOURCE URLS:** No underlying external source URL is recorded in `assets/definitions/library.json`.

**REFERENCE PACK:** No dedicated asset-origin reference entry.

**IMPLEMENTATION OWNER:** `assets/source/images/`, `assets/definitions/library.json`, NAL build/runtime path.

**MEDIA COPIED INTO REPO?** Yes.

**LICENSE/PERMISSION EVIDENCE:** Metadata states “User-provided source; project-use authorization asserted in the development conversation.” No creator identity, original license/permission artifact, source URL, transfer/scope statement or attribution requirement is recorded.

**ATTRIBUTION:** Unknown.

**UNKNOWN QUESTIONS:** Original source bytes; creator; how the user obtained each source; whether the three are edits/crops/reconstructions of another work; exact authorization scope; redistribution rights; required notices/attribution; whether A/B/C share one source chain or three different chains.

**RECOMMENDED LEDGER UPDATE:** Keep `UNKNOWN / REVIEW REQUIRED` until evidence resolves `PROV-LEGAL-001`. Add per-file origin fields and immutable source hashes in the canonical ledger/intake record when known.

## CONCEPT: Floor / carpet identity

**CONCEPT:** M-C1 Level 0 carpet identity

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Brownish-beige tight-knit carpet, ordinarily damp/moist and visually affected by fluorescent cast, is supported by the audited Level 0 source and references.

**PROJECT ACCEPTED INTERPRETATION:** Carpet remains owned by the underlying Region/floor presentation even where a Hole Carver removes floor area; Project parameters approximate the source identity rather than claiming exact physical measurements from the source.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** M-C1 semantic material definition, shader/material parameters, Region-aware finalization, Hole-survivor ownership and renderer lifecycle.

**SOURCE URLS:** Level 0 page; relevant Level 0 reference entries.

**REFERENCE PACK:** `REF-L0-001` plus Region-specific references.

**IMPLEMENTATION OWNER:** `src/presentation/definitions/level0-materials.json`, `src/renderer/level0SurfacePresentation.ts`, `src/renderer/finalLevel0MaterialPresentation.ts`.

**MEDIA COPIED INTO REPO?** No dedicated carpet texture asset was found.

**LICENSE/PERMISSION EVIDENCE:** Source facts are textual/visual evidence; no copied carpet media exists in the repository.

**ATTRIBUTION:** Page/source attribution belongs to source-backed content documentation; there is no separate committed carpet media attribution.

**UNKNOWN QUESTIONS:** None material to current asset inventory.

**RECOMMENDED LEDGER UPDATE:** Explicitly separate source-derived carpet identity from Project-original shader/Condition implementation and CV-H1 floor-ownership law.

## CONCEPT: Current carpet Conditions

**CONCEPT:** `damp-carpet`, `deep-wet-carpet`, `shallow-dry-carpet`

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** The source distinguishes ordinary moist carpet, deeper/wetter Arch carpet and shallower/less-moist Pillar carpet.

**PROJECT ACCEPTED INTERPRETATION:** Project Noclip expresses these facts as named Conditions owned by current Region/floor policy.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Condition stable IDs, deterministic mapping, numeric material values, renderer parameters, Region thresholds and save/runtime representation.

**SOURCE URLS:** Level 0 page and `REF-L0-001`, `REF-L0-002`, `REF-L0-007`.

**REFERENCE PACK:** Level 0 pack.

**IMPLEMENTATION OWNER:** `src/world/gen3.ts`, presentation/material owners.

**MEDIA COPIED INTO REPO?** No.

**LICENSE/PERMISSION EVIDENCE:** No dedicated media.

**ATTRIBUTION:** Source-backed content notes should cite the Level 0 source/reference pack.

**UNKNOWN QUESTIONS:** Exact numeric wetness/depth values are not external facts and should remain documented as Project interpretation/implementation.

**RECOMMENDED LEDGER UPDATE:** Add the three Conditions as explicit split provenance entries if not already granularly represented.

## CONCEPT: M-CE1 ceiling identity

**CONCEPT:** M-CE1 suspended Level 0 ceiling

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Pale suspended/drop-ceiling tiles and repeated ceiling services/fixtures are source-supported.

**PROJECT ACCEPTED INTERPRETATION:** Project Noclip uses a stable suspended-ceiling material/geometry grammar across current Level 0 Regions unless a stronger content owner overrides it.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** M-CE1 material ID, exact dimensions, tile/grid construction, renderer ownership and performance implementation.

**SOURCE URLS:** Level 0 page and current Level 0 reference pack.

**REFERENCE PACK:** `REF-L0-001`, `REF-L0-002`, `REF-L0-007`.

**IMPLEMENTATION OWNER:** `src/presentation/definitions/level0-materials.json`, `src/renderer/level0SurfacePresentation.ts`.

**MEDIA COPIED INTO REPO?** No dedicated ceiling texture asset found.

**LICENSE/PERMISSION EVIDENCE:** No dedicated media.

**ATTRIBUTION:** Source documentation only.

**UNKNOWN QUESTIONS:** None material to current media.

**RECOMMENDED LEDGER UPDATE:** Explicitly separate source ceiling identity from Project exact material/geometry parameters.

## CONCEPT: M-F1 fluorescent identity

**CONCEPT:** M-F1 fluorescent panel / ordinary fluorescent ambience

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Repeated rectangular fluorescent fixtures and pervasive fluctuating fluorescent buzzing are source-supported Level 0 identity.

**PROJECT ACCEPTED INTERPRETATION:** Project Noclip synchronizes panel emission, physical light energy and procedural hum/flicker under a deterministic world-lighting law, with reduced-flicker accessibility behavior routed through the same ownership path.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** M-F1 semantic material, fixture ownership, physical-light allocation strategy, deterministic pulse law, Web Audio synthesis, light-field diagnostics, renderer integration and performance architecture.

**SOURCE URLS:** Level 0 page; relevant Level 0 references.

**REFERENCE PACK:** `REF-L0-001` and supporting entries.

**IMPLEMENTATION OWNER:** `src/world/lighting.ts`, `src/renderer/fixtureLighting.ts`, `src/renderer/level0SurfacePresentation.ts`, `src/audio/Ambience.ts`.

**MEDIA COPIED INTO REPO?** No external fluorescent audio recording or fixture texture was found.

**LICENSE/PERMISSION EVIDENCE:** No copied audio payload. Source-backed identity comes from text/reference evidence.

**ATTRIBUTION:** Source identity documentation only; procedural audio code is Project implementation.

**UNKNOWN QUESTIONS:** If future recorded buzz/audio is imported, it requires file-specific provenance independent of the source concept.

**RECOMMENDED LEDGER UPDATE:** Add explicit note that current sound is synthesized, not copied; preserve source-derived ambience identity versus Project-original waveform/runtime implementation.

## CONCEPT: C-B1 Blackout

**CONCEPT:** C-B1 Blackout

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** The source describes recognizable Level 0 architecture under full local fixture darkness, loss of local fluorescent buzz, rougher surfaces/possible recessed fluid and navigation toward external light/buzz cues.

**PROJECT ACCEPTED INTERPRETATION:** Blackout is a Condition over ordinary Level 0 rather than a separate Region/template. Project Noclip expresses boundaries continuously and keeps current geometry deterministic.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Blackout pressure Field, resolution thresholds, continuous escape-cue calculation, physical light suppression, renderer/audio blending, diagnostics and tests.

**SOURCE URLS:** Level 0 page; `/5` attachment.

**REFERENCE PACK:** `REF-L0-004`.

**IMPLEMENTATION OWNER:** `src/world/fields.ts`, `src/world/gen3.ts`, `src/world/lighting.ts`, `src/renderer/fixtureLighting.ts`, `src/app/blackoutRendering.ts`, `src/audio/Ambience.ts`.

**MEDIA COPIED INTO REPO?** No.

**LICENSE/PERMISSION EVIDENCE:** Current Level 0 media box explicitly lists media name `5`, creator Alfarex, CC BY-SA 4.0, source `/5`.

**ATTRIBUTION:** The source page states attribution-bearing terms for `/5`; exact downstream fulfillment is outside this audit.

**UNKNOWN QUESTIONS:** None material to current committed assets.

**RECOMMENDED LEDGER UPDATE:** Replace/generalize older page-level media wording with current file-specific `/5` evidence; retain source/interpretation/implementation split.

## CONCEPT: CV-H1 Holes

**CONCEPT:** CV-H1 floor-hole cluster

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`; `UNKNOWN / REVIEW REQUIRED`

**EXTERNAL SOURCE FACT:** Source text/image evidence supports close/grid groups of discrete square, very dark/deep floor openings with surrounding ordinary Level 0 surfaces and readable bypass space.

**PROJECT ACCEPTED INTERPRETATION:** Project Noclip implements Holes as a subtractive floor Carver over existing Region architecture/floor ownership instead of a separate room template. Exact density, collision, depth and fall behavior are Project decisions.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Carver stable ID, deterministic candidate/gate law, world-space lattice/cluster placement, bypass/overlap constraints, floor reconstruction, Region-aware surviving carpet ownership, collision/runtime implementation.

**SOURCE URLS:** Level 0 page; official attachment path `/4`; user-supplied Drive mirror recorded in `REF-L0-003`.

**REFERENCE PACK:** `REF-L0-003`.

**IMPLEMENTATION OWNER:** `src/world/gen3.ts`, `src/world/generator.ts`, `src/renderer/WorldRenderer.ts`, `src/renderer/level0RegionPresentation.ts`, `src/renderer/finalLevel0MaterialPresentation.ts`.

**MEDIA COPIED INTO REPO?** No Hole reference image found committed.

**LICENSE/PERMISSION EVIDENCE:** The current source page's visible media box contains an entry named `4` but its source link points to `/1`, creating a mapping mismatch. The audited evidence therefore does not safely establish file-specific terms for `/4`. The Drive mirror was previously visually matched, but byte identity and permission chain were not established.

**ATTRIBUTION:** Unknown for the exact `/4` file until mapping is resolved.

**UNKNOWN QUESTIONS:** Correct file-level creator/license for `/4`; whether the Drive mirror is byte-identical to the official attachment; mirror ownership/permission chain.

**RECOMMENDED LEDGER UPDATE:** Keep Hole concept source-derived but mark `/4` attachment terms and Drive mirror as `UNKNOWN / REVIEW REQUIRED`; create explicit legal/evidence records `PROV-LEGAL-002` and `PROV-LEGAL-003`.

## CONCEPT: S-R1 Red Rooms

**CONCEPT:** S-R1 Red Rooms

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`; `UNKNOWN / REVIEW REQUIRED`

**EXTERNAL SOURCE FACT:** The audited Level 0 source describes rare red/crimson sections, sticky/coarse/thick carpet, distress and disconnected/closed-loop escape difficulty. The authoritative `/6` visual supports a deep-red Level 0-like corridor presentation. The separate Scutoidbox image only supports its visible red-corridor pixels; its parent/canon/authorship/license remain unverified.

**PROJECT ACCEPTED INTERPRETATION:** Project Noclip plans Red Rooms as a rare Level 0 Structure with crimson Materials/Conditions and intentionally designed deterministic Non-Euclidean closed-loop behavior. Exact topology is design-gated.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** S-R1 classification, deterministic future topology/persistence design, rarity/placement rules, implementation architecture and save-safe Non-Euclidean mechanics will be Project work when approved.

**SOURCE URLS:** Level 0 page; official attachment `/6`; Drive mirror and Scutoidbox URLs recorded in `REF-L0-005` and `REF-L0-006`.

**REFERENCE PACK:** `REF-L0-005`, `REF-L0-006`.

**IMPLEMENTATION OWNER:** Design required; current registry references exist in `src/world/exits.ts`, but future Structure/topology ownership remains human-design-gated.

**MEDIA COPIED INTO REPO?** No Red Rooms reference image found committed.

**LICENSE/PERMISSION EVIDENCE:** No visible file-specific `/6` media entry was found in the current Level 0 license box. Drive mirror byte identity/permission chain is unresolved. Scutoidbox creator/canon/license is unresolved.

**ATTRIBUTION:** Unknown for `/6` and Scutoidbox media at file level from current evidence.

**UNKNOWN QUESTIONS:** `/6` creator/license; Drive mirror byte identity and permission chain; Scutoidbox parent page, creator, source, license, canon standing; exact source scope for any future Red Rooms behavior beyond the authoritative Level 0 page.

**RECOMMENDED LEDGER UPDATE:** Preserve authoritative Level 0 source facts separately from Scutoidbox evidence-only imagery; add unresolved media/legal records and do not promote unsupported mushrooms/radio claims.

## CONCEPT: Registered / planned transitions

**CONCEPT:** Current transition/destination registry

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`; `UNKNOWN / REVIEW REQUIRED`

**EXTERNAL SOURCE FACT:** The audited current Level 0 page explicitly describes one Level 1 route through a flickering wall. This audit did not establish dedicated source provenance for every other currently registered Project destination/trigger.

**PROJECT ACCEPTED INTERPRETATION:** Project Noclip has a deterministic registry of destination IDs, labels, triggers, timeline/exposure gates and test cells. Registration does not mean destination playability or exact source canon acceptance.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Registry schema, stable IDs, exact labels/gates, fixed test cells, timeline/exposure mechanics and deterministic generation integration.

**SOURCE URLS:** Level 0 page for the verified Level 1 source claim; other destinations require their own exact source records or an explicit Project-original design classification.

**REFERENCE PACK:** No complete current transition provenance pack was found.

**IMPLEMENTATION OWNER:** `src/world/exits.ts`, `src/world/generator.ts`, timeline/save systems.

**MEDIA COPIED INTO REPO?** No transition media identified.

**LICENSE/PERMISSION EVIDENCE:** Not applicable to code; content provenance for individual destination names/routes remains concept-specific.

**ATTRIBUTION:** Requires per-source provenance when source-derived content is accepted.

**UNKNOWN QUESTIONS:** Source provenance for Level 2, Level 27, Level 483, Level 13, Level 14, Void, Level 0.22, Level 0.23, Level 0.99 and any Red Rooms transition framing; whether each trigger label is source-derived, Project interpretation or wholly Project-original.

**RECOMMENDED LEDGER UPDATE:** Add a transition-by-transition provenance ledger instead of treating registry presence as evidence that “the wiki says this exact route.” Do not remove or reclassify gameplay in this audit.

## CONCEPT: Ambient / audio identity

**CONCEPT:** Level 0 ambient/audio identity

**CLASSIFICATION:** `SOURCE-DERIVED`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Fluorescent buzzing is directly source-supported; current Level 0 source text also mentions additional anomalous sounds. A still image never establishes audio.

**PROJECT ACCEPTED INTERPRETATION:** Project Noclip accepts fluorescent room tone and Blackout silence/escape-buzz behavior. Other source-page anomalous sound claims are not automatically accepted merely because they are present on the source page.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Current `src/audio/Ambience.ts` synthesizes hum harmonics, flicker snaps, steps and distant impacts with Web Audio; no external recording is required for the current implementation.

**SOURCE URLS:** Level 0 page.

**REFERENCE PACK:** `REF-L0-001`, `REF-L0-004`; other reference entries explicitly state where stills have no audio evidence.

**IMPLEMENTATION OWNER:** `src/audio/Ambience.ts`, `src/world/lighting.ts`.

**MEDIA COPIED INTO REPO?** No source audio files found.

**LICENSE/PERMISSION EVIDENCE:** No copied audio media to license in the current tree.

**ATTRIBUTION:** Source-derived identity should remain linked to the source page; generated audio implementation is Project code.

**UNKNOWN QUESTIONS:** Future recorded ambience/spatial audio must undergo separate per-file provenance intake.

**RECOMMENDED LEDGER UPDATE:** Add explicit “procedurally synthesized; no external recording committed” status to current audio provenance.

## CONCEPT: Player / character visual identity

**CONCEPT:** Player Character Profile appearance content

**CLASSIFICATION:** `REAL-WORLD-INSPIRATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** No audited Backrooms source was found to prescribe the current body-frame, skin-tone, hair, clothing-color or profile-identity schema.

**PROJECT ACCEPTED INTERPRETATION:** The creator uses ordinary human appearance categories and neutral clothing slots without claiming Backrooms-source ownership.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Profile schema, `CharacterProfileId`, profile persistence, profile/avatar identity boundary, semantic mapping and future avatar representation contract.

**SOURCE URLS:** None required for current generic human appearance categories.

**REFERENCE PACK:** None.

**IMPLEMENTATION OWNER:** `src/player-character/profile.ts`, `src/player-character/profileStore.ts`, `src/player-character/avatar.ts`, creator UI.

**MEDIA COPIED INTO REPO?** No avatar meshes/textures were found.

**LICENSE/PERMISSION EVIDENCE:** No external character media currently committed.

**ATTRIBUTION:** None identified for current generic appearance schema.

**UNKNOWN QUESTIONS:** Future avatar meshes/materials/animations require independent asset provenance.

**RECOMMENDED LEDGER UPDATE:** Add Character Profile/Avatar representation architecture as Project-original and generic appearance categories as real-world inspiration.

## CONCEPT: Item content names / identities

**CONCEPT:** Current item-definition content vocabulary

**CLASSIFICATION:** `SOURCE-DERIVED`; `REAL-WORLD-INSPIRATION`; `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** `Almond Water` is an externally established Backrooms object/name; the current Backrooms Wiki Object 1 page identifies “Object 1 — Almond Water” and describes the liquid. Flashlight, battery, marker, paper note, glow stick, string spool, empty can and pry tool are generic real-world object identities rather than source-specific concepts on current evidence.

**PROJECT ACCEPTED INTERPRETATION:** Project Noclip uses its own concise item descriptions, rarity/weight/value/trade properties and presentation labels. The current Almond Water “sealed bottle / faintly sweet” presentation is a Project implementation choice unless separately sourced.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Item-definition IDs, exact stats/weights, starter/world weighting, presentation metadata, deterministic placement, Item Instance creation and inventory integration.

**SOURCE URLS:** `https://backrooms-wiki.wikidot.com/object-1` for Almond Water; generic real-world items require no Backrooms source claim.

**REFERENCE PACK:** No dedicated current Almond Water/item provenance pack found.

**IMPLEMENTATION OWNER:** `src/items/definitions.ts`, `src/items/factory.ts`, `src/items/starterRoll.ts`.

**MEDIA COPIED INTO REPO?** No item media assets found.

**LICENSE/PERMISSION EVIDENCE:** Content-name/source provenance must be documented separately from code. No external item media exists in the current tree.

**ATTRIBUTION:** Almond Water source attribution should be recorded if the canonical ledger treats the name/concept as source-derived.

**UNKNOWN QUESTIONS:** Whether any other current item name/description was intentionally adopted from a Backrooms source; no evidence found in this audit.

**RECOMMENDED LEDGER UPDATE:** Add a dedicated Almond Water concept entry; classify other generic items as `REAL-WORLD-INSPIRATION` unless a specific external source is later identified.

## CONCEPT: Generation 3 architecture

**CONCEPT:** Generation 3 world architecture

**CLASSIFICATION:** `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Backrooms source content motivates a large, strange, changing environment but does not prescribe Project Noclip's Generation 3 software architecture.

**PROJECT ACCEPTED INTERPRETATION:** Source/world goals are expressed through a deterministic, versioned, continuous procedural system rather than literal source mechanics.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** `gen3-v1`; generation-version cutover; deterministic seed domains; connectivity substrate; local topology solver; continuous Regions/Conditions; Carvers/Structures/Features/Items/Transitions layering; Cell-as-cache law; stable world addresses and old-save compatibility.

**SOURCE URLS:** None required to establish software originality; world/source references remain content inputs only.

**REFERENCE PACK:** Not an external-content reference target.

**IMPLEMENTATION OWNER:** `src/world/gen3.ts`, `src/world/gen3Architecture*.ts`, `src/world/gen3SpaceTopology*.ts`, `src/world/generator.ts`, ADR 0001.

**MEDIA COPIED INTO REPO?** No.

**LICENSE/PERMISSION EVIDENCE:** Not a copied media asset.

**ATTRIBUTION:** Software dependencies retain their own package licenses; external world content remains separately attributed/provenanced.

**UNKNOWN QUESTIONS:** None identified for provenance classification itself.

**RECOMMENDED LEDGER UPDATE:** Add/strengthen an originality-map entry explicitly separating Generation 3 architecture from source-derived world concepts.

## CONCEPT: Deterministic Fields

**CONCEPT:** Continuous deterministic Field / affinity system

**CLASSIFICATION:** `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** No audited source defines Project Noclip's scalar Field implementation, wavelength choices, seed domains or affinity math.

**PROJECT ACCEPTED INTERPRETATION:** Fields are Project Noclip's method for converting broad environmental/source direction into continuous geography and Conditions without hard districts.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Field vocabulary, sampling, bounded values, Region/Condition affinities, deterministic seed separation and world-space continuity.

**SOURCE URLS:** None for implementation.

**REFERENCE PACK:** Not applicable.

**IMPLEMENTATION OWNER:** `src/world/fields.ts`, `src/world/gen3.ts`.

**MEDIA COPIED INTO REPO?** No.

**LICENSE/PERMISSION EVIDENCE:** Not applicable to content media.

**ATTRIBUTION:** None for the Project algorithm itself.

**UNKNOWN QUESTIONS:** None identified.

**RECOMMENDED LEDGER UPDATE:** Explicit Project-original entry.

## CONCEPT: Region system

**CONCEPT:** Region / Region affinity ownership model

**CLASSIFICATION:** `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** External sources describe variations/areas such as Pillar and Arch, not Project Noclip's exact Region taxonomy or continuous-affinity architecture.

**PROJECT ACCEPTED INTERPRETATION:** Project Noclip groups accepted continuous geography under stable Region identities and treats Ordinary, Pillar Field and Arch Rooms as modifiers of one Level 0 substrate.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Region stable IDs, continuous affinity/depth, hierarchy under Level, Cell independence, semantic ownership and renderer/presentation routing.

**SOURCE URLS:** Source pages only for the underlying variation identities.

**REFERENCE PACK:** Level 0 pack for content direction.

**IMPLEMENTATION OWNER:** `src/world/fields.ts`, `src/world/gen3.ts`, terminology/world types.

**MEDIA COPIED INTO REPO?** No.

**LICENSE/PERMISSION EVIDENCE:** Not a media asset.

**ATTRIBUTION:** Underlying source-derived content remains separately attributed.

**UNKNOWN QUESTIONS:** None identified for the software architecture.

**RECOMMENDED LEDGER UPDATE:** Distinguish source “variation” facts from Project-original Region taxonomy and continuity law.

## CONCEPT: Visibility architecture

**CONCEPT:** Visibility Snapshot / live render participation

**CLASSIFICATION:** `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** No audited Backrooms source defines Project Noclip's topology-aware render-participation architecture.

**PROJECT ACCEPTED INTERPRETATION:** Environmental occlusion/topology is used as a performance input while preserving conservative safety/fallback behavior.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Topology adapter, snapshot propagation, participation reasons, safety core, hysteresis, predictive integration, distance fallback, runtime adapter and diagnostics.

**SOURCE URLS:** None.

**REFERENCE PACK:** Not applicable.

**IMPLEMENTATION OWNER:** `src/renderer/visibility/*`.

**MEDIA COPIED INTO REPO?** No.

**LICENSE/PERMISSION EVIDENCE:** Not applicable.

**ATTRIBUTION:** None for this Project architecture.

**UNKNOWN QUESTIONS:** None identified.

**RECOMMENDED LEDGER UPDATE:** Add to originality map; do not conflate visibility engineering with any lore statement about sight/perception.

## CONCEPT: Carver architecture

**CONCEPT:** General Carver architecture

**CLASSIFICATION:** `INTERPRETATION`; `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** Source content may establish subtractive phenomena such as floor holes; it does not define Project Noclip's Carver software category/pass.

**PROJECT ACCEPTED INTERPRETATION:** Subtractive world changes are expressed after base Region architecture through a named Carver stage.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Carver world category, deterministic pass ordering, stable identity, ownership separation from Regions/materials and current CV-H1 implementation.

**SOURCE URLS:** Source-specific only for individual Carver content such as Holes.

**REFERENCE PACK:** Individual content packs only.

**IMPLEMENTATION OWNER:** `src/world/gen3.ts`, generator/renderer owners.

**MEDIA COPIED INTO REPO?** No.

**LICENSE/PERMISSION EVIDENCE:** Not applicable to architecture.

**ATTRIBUTION:** Underlying source-derived content only.

**UNKNOWN QUESTIONS:** None identified.

**RECOMMENDED LEDGER UPDATE:** Add general Carver architecture as Project-original while keeping individual content provenance separate.

## CONCEPT: Studio / NAL

**CONCEPT:** Noclip Studio + Noclip Asset Library

**CLASSIFICATION:** `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** No audited Backrooms source defines Project Noclip's authoring/asset architecture.

**PROJECT ACCEPTED INTERPRETATION:** External/user-provided content may enter only through explicit provenance-aware source/definition/build boundaries rather than being silently embedded into world generation.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** PAU representation architecture, typed Asset slots, NAL Asset IDs/content hashes/profiles, source-vs-runtime separation, generated registry, Studio structured authoring, DevelopmentContext/ChangeReceipt and production security boundary.

**SOURCE URLS:** None for engineering ownership.

**REFERENCE PACK:** Not applicable.

**IMPLEMENTATION OWNER:** `src/presentation/*`, `assets/*`, `scripts/build-assets.mjs`, `tools/studio/*`, `docs/PRESENTATION_ARCHITECTURE.md`, `docs/NOCLIP_STUDIO.md`.

**MEDIA COPIED INTO REPO?** The architecture contains three current wallpaper source files; those file rights remain separately unresolved.

**LICENSE/PERMISSION EVIDENCE:** NAL metadata can record provenance but current schema/entries do not yet prove the A/B/C underlying rights chain.

**ATTRIBUTION:** Asset-specific, not implied by NAL membership.

**UNKNOWN QUESTIONS:** Future intake must decide how provenance evidence is stored/validated before import.

**RECOMMENDED LEDGER UPDATE:** Add Studio/NAL as Project-original engineering and strengthen asset-intake requirements without treating pipeline validation as rights validation.

## CONCEPT: Character identity architecture

**CONCEPT:** PlayerCharacterProfile / CharacterProfileId / AvatarDefinition identity architecture

**CLASSIFICATION:** `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** No audited Backrooms source defines this identity model.

**PROJECT ACCEPTED INTERPRETATION:** Human character identity is kept separate from Journey/world-seed identity and from item identity.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Profile schema, stable profile ID, local profile persistence, pure avatar mapping, semantic asset-slot contract, humanoid rig vocabulary and first/third/cinematic/remote visibility rules.

**SOURCE URLS:** None.

**REFERENCE PACK:** None.

**IMPLEMENTATION OWNER:** `src/player-character/profile.ts`, `src/player-character/profileStore.ts`, `src/player-character/avatar.ts`, identity/avatar docs.

**MEDIA COPIED INTO REPO?** No avatar media currently committed.

**LICENSE/PERMISSION EVIDENCE:** Not applicable to current code-only contract.

**ATTRIBUTION:** None for Project architecture.

**UNKNOWN QUESTIONS:** Future imported avatar assets require separate per-file provenance.

**RECOMMENDED LEDGER UPDATE:** Add explicit Project-original identity-architecture entry.

## CONCEPT: Persistent Journey architecture

**CONCEPT:** Journey / generation-version / save identity

**CLASSIFICATION:** `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** External Backrooms content does not define Project Noclip's save/persistence identity model.

**PROJECT ACCEPTED INTERPRETATION:** A Journey is one deterministic world experience whose geography is stable for its generation version.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Save schema, journey identity, generation-version pinning, old-save Gen2 compatibility, stable world addresses and mutation/delta persistence.

**SOURCE URLS:** None.

**REFERENCE PACK:** Not applicable.

**IMPLEMENTATION OWNER:** `src/persistence/*`, `src/app/ProjectNoclipGame.ts`, world identity types, ADR 0001.

**MEDIA COPIED INTO REPO?** No.

**LICENSE/PERMISSION EVIDENCE:** Not applicable.

**ATTRIBUTION:** None for the Project architecture.

**UNKNOWN QUESTIONS:** None identified.

**RECOMMENDED LEDGER UPDATE:** Include in originality map because it is foundational to how source-derived geography is implemented without copying source mechanics.

## CONCEPT: Item Instance architecture

**CONCEPT:** Item Definition / Item Instance stable identity

**CLASSIFICATION:** `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** A source may define an item concept such as Almond Water; it does not define Project Noclip's persistent instance identity model.

**PROJECT ACCEPTED INTERPRETATION:** Item content identity is separated from a particular persistent object instance.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** `instanceId`, deterministic factory/origin/revision state, Definition/Instance separation, stable persistence and ownership semantics.

**SOURCE URLS:** Content-specific sources only; none for instance architecture.

**REFERENCE PACK:** Not applicable.

**IMPLEMENTATION OWNER:** `src/items/types.ts`, `src/items/factory.ts`, persistence.

**MEDIA COPIED INTO REPO?** No.

**LICENSE/PERMISSION EVIDENCE:** Not applicable.

**ATTRIBUTION:** Content-specific only.

**UNKNOWN QUESTIONS:** None identified.

**RECOMMENDED LEDGER UPDATE:** Add as Project-original architecture separate from source-derived item names/concepts.

## CONCEPT: Inventory architecture

**CONCEPT:** Inventory domain / UI identity preservation

**CLASSIFICATION:** `PROJECT-NOCLIP-ORIGINAL`

**EXTERNAL SOURCE FACT:** No audited Backrooms source defines Project Noclip's container ordering, selection persistence or UI contract.

**PROJECT ACCEPTED INTERPRETATION:** Inventory displays source-inspired or real-world item concepts without changing their persistent object identity.

**PROJECT-NOCLIP-ORIGINAL ELEMENTS:** Inventory operations, selection/reorder by `instanceId`, UI projection, six-slot presentation, persistence integration and accessibility interaction contract.

**SOURCE URLS:** None for architecture.

**REFERENCE PACK:** Not applicable.

**IMPLEMENTATION OWNER:** `src/inventory/inventory.ts`, `src/ui/inventoryPresentation.ts`, `src/ui/InventorySurface.ts`, `src/ui/GameUI.ts`, persistence/runtime adapter.

**MEDIA COPIED INTO REPO?** No dedicated inventory/item media assets found.

**LICENSE/PERMISSION EVIDENCE:** Not applicable to current code-only UI.

**ATTRIBUTION:** Content-specific only.

**UNKNOWN QUESTIONS:** None identified.

**RECOMMENDED LEDGER UPDATE:** Add to originality map.

# External Source Facts

The following facts are source facts only. They do not become Project Noclip runtime truth merely because the external source states them.

- The current Backrooms Wiki Level 0 page credits the original concept to 4chan and identifies later page adaptation/rewrite contributors. The exact current page revision inspected during this audit was revision 48, last edited 15 August 2026.
- Ordinary Level 0 source identity includes yellow/pale patterned wall treatment, moist carpet, suspended ceiling, fluorescent fixtures and buzzing.
- The page lists Arch, Pillar, Hole, Blackout and Red Rooms variations/areas and provides source-specific behavioral/material descriptions for them.
- The page also contains claims that Project Noclip has not necessarily adopted, including broader shifting/perceptual behavior, an “Isolation Effect,” additional anomalous sounds and source-specific exit behavior.
- The current source page explicitly describes a Level 1 exit through a flickering wall. This does not validate every destination/trigger currently present in Project Noclip's registry.
- The current Object 1 page identifies `Almond Water` as an externally established Backrooms object/name.

For provenance purposes, each source statement should be recorded against its exact page/source rather than against a generic claim that “Backrooms lore says X.” Different sources/canons may disagree.

# Project Noclip Interpretations

Project Noclip currently makes several deliberate interpretation choices that must remain visibly separate from external facts:

- Ordinary, Pillar Field and Arch Rooms are continuous Regions of one Level 0 substrate rather than Cell-sized districts or literal copies of source page section names.
- Pillar source instability/path-shift language is not currently implemented as arbitrary live geometry mutation. Current Generation 3 remains deterministic and Euclidean unless a human-approved Non-Euclidean design says otherwise.
- Arch evidence is interpreted as a continuous divider/wall grammar. The project explicitly corrected an earlier label-driven freestanding-arch reading.
- Blackout is a Condition layered over recognizable geometry, with deterministic continuous light/audio boundary behavior.
- Holes are implemented as a subtractive Carver; the source does not define Project Noclip's Carver taxonomy, exact lattice solver, floor reconstruction or collision law.
- Red Rooms are treated as a planned Structure with design-gated deterministic closed-loop Non-Euclidean behavior. The source establishes the content direction, not the exact topology implementation.
- Fluorescent buzz is accepted as core audio identity, but current audio is procedurally synthesized and other source-page anomalous sounds are not automatically accepted.
- Transition registry presence is implementation state, not proof of external canon. Each destination/trigger needs explicit provenance or an explicit Project-original design classification.
- Generic human appearance and generic real-world objects are not transformed into source-derived content merely because they exist in a Backrooms game.

# Project-Noclip-Original Work

The following systems/designs are strongly supported as Project-Noclip-original engineering or product architecture. This classification does not claim that underlying Backrooms concepts, names, photographs or externally sourced aesthetic facts are original.

- Generation 3 versioned geography and the `gen3-v1` cutover.
- Deterministic independent seed domains and stable world addresses.
- Continuous scalar Fields, Region affinity/depth and Cell-independent semantic geography.
- Connectivity-first semantic topology and world-space partition solving.
- Region semantic taxonomy and Architecture Pattern IDs (`O-A1`, `P-A1`, `A-A1`).
- Deterministic Carver pass architecture and current CV-H1 realization.
- Persistent Journey / generation-version compatibility architecture.
- Wallpaper family resolver, world-space UV/phase handling, Asset-slot material pipeline and Region-aware presentation ownership.
- M-F1 fixture ownership, deterministic light/pulse synchronization and renderer performance implementation.
- Procedural Web Audio ambience generation and current audio/runtime lifecycle.
- PAU representation architecture, LCG construction standard, NAL Asset IDs/profiles/content hashes/source-runtime split.
- Noclip Studio structured authoring, DevelopmentContext and ChangeReceipt contracts.
- Visibility Snapshot/topology adapter/propagation/live participation architecture.
- Character Profile identity and `CharacterProfileId` actor-ownership architecture.
- Avatar representation contract and semantic asset-slot mapping.
- Item Definition versus persistent Item Instance identity architecture.
- Inventory domain operations, stable instance-keyed UI projection and persistence behavior.
- Current performance/streaming/render-participation mechanisms.

# Asset / Media Inventory

Status vocabulary in this section is deliberately limited to `DOCUMENTED`, `UNKNOWN`, and `NEEDS REVIEW`. `DOCUMENTED` means provenance evidence was located and described; it does not mean “safe for commercial use.”

| PATH / IDENTIFIER | SOURCE | CREATOR if known | HOW OBTAINED | USER-PROVIDED? | LICENSE / PERMISSION EVIDENCE | ATTRIBUTION REQUIREMENT | MODIFIED / DERIVATIVE? | REPOSITORY COPY? | SAFE STATUS |
|---|---|---|---|---|---|---|---|---|---|
| `assets/source/images/level0-wallpaper-a-chevron.webp` | Underlying source not recorded | Unknown | User-provided source prepared as dev.9.1 game-ready derivative; history says supplied derivative | YES | Project metadata asserts project-use authorization; no underlying source/license/permission artifact | UNKNOWN | YES | YES | NEEDS REVIEW |
| `assets/source/images/level0-wallpaper-b-dots.webp` | Underlying source not recorded | Unknown | Same as A; history explicitly restores supplied A/B source derivatives | YES | Same limitation as A | UNKNOWN | YES | YES | NEEDS REVIEW |
| `assets/source/images/level0-wallpaper-c-lines.webp` | Underlying source not recorded | Unknown | User-provided source prepared as dev.9.1 game-ready derivative per metadata | YES | Project metadata asserts project-use authorization; no underlying chain | UNKNOWN | YES | YES | NEEDS REVIEW |
| `REF-L0-001` baseline / `OGLevel0.jpg` | Backrooms Wiki Level 0; archive source in current license box | Bob Mazza | External reference URL | NO | Current media box states CC0 1.0 | No attribution requirement stated by CC0; source should still be documented | Source page image/reference, not Project derivative | NO | DOCUMENTED |
| `REF-L0-007` Arch `/2` | Backrooms Wiki Level 0; archive source in current license box | Bob Mazza | External reference URL | NO | Current media box states CC0 1.0 | Same documentation note as baseline | No Project copy | NO | DOCUMENTED |
| `REF-L0-002` Pillar `/3` | Backrooms Wiki Level 0 | Alfarex | External reference URL | NO | Current media box states CC BY-SA 4.0 | Attribution-bearing license stated by source | No Project copy | NO | DOCUMENTED |
| `REF-L0-004` Blackout `/5` | Backrooms Wiki Level 0 | Alfarex | External reference URL | NO | Current media box states CC BY-SA 4.0 | Attribution-bearing license stated by source | No Project copy | NO | DOCUMENTED |
| `REF-L0-003` Hole official `/4` | Backrooms Wiki Level 0 | UNKNOWN | External reference URL | NO | Current media-box mapping is internally mismatched (`Name: 4` points to `/1`), so `/4` file terms are not established | UNKNOWN | No Project copy | NO | NEEDS REVIEW |
| `REF-L0-003` Hole Drive mirror | User-supplied public Drive mirror of visually matching source image | UNKNOWN | User-provided mirror link | YES | Visual/dimension match recorded; byte identity and permission chain not proved | UNKNOWN | UNKNOWN | NO | NEEDS REVIEW |
| `REF-L0-005` Red Rooms official `/6` | Backrooms Wiki Level 0 | UNKNOWN from current file-level evidence | External reference URL | NO | No visible `/6` file-specific media entry found in current license box | UNKNOWN | No Project copy | NO | NEEDS REVIEW |
| `REF-L0-005` Red Rooms Drive mirror | User-supplied public Drive mirror of visually matching source image | UNKNOWN | User-provided mirror link | YES | Visual/dimension match recorded; byte identity and permission chain not proved | UNKNOWN | UNKNOWN | NO | NEEDS REVIEW |
| `REF-L0-006` Scutoidbox Red Rooms image | Scutoidbox Wikidot file host; parent/source unresolved | UNKNOWN | User-supplied external reference URL | YES | Parent page/canon/creator/license could not be verified | UNKNOWN | UNKNOWN | NO | NEEDS REVIEW |
| `src/audio/Ambience.ts` current ambience | Project-generated Web Audio | Project Noclip | Procedural oscillators/gains at runtime | NO external recording | No copied recording; code-generated waveform | Not an external media attribution case | Generated, not derivative media on current evidence | Code only | DOCUMENTED |

Repository-wide media-tree observations at the audited SHA:

- committed source images: exactly the three M-W1 A/B/C WebP files above;
- committed source audio: none found;
- committed source meshes/GLBs: none found;
- committed project-specific fonts: none found;
- committed video: none found;
- committed reference screenshots/photos under reference packs: none found; references are URLs/text;
- `public/assets` contains no generated runtime media payload at this base beyond documentation structure;
- `assets/generated/registry.json` exists but does not itself resolve the missing underlying A/B/C rights chain.

# Wiki / Canon Separation Findings

## Finding 1 — Source page truth and Project world truth are different owners

The repo already states that reference packs promote evidence into `WORLD.md`, but synthesis should strengthen wording wherever a reader could infer:

```text
THE WIKI SAYS X
therefore
PROJECT NOCLIP MUST CONTAIN X EXACTLY THAT WAY
```

A source claim is evidence. Project acceptance is a separate decision. Implementation is a third layer.

## Finding 2 — Current Level 0 source contains unaccepted claims

The audited source page includes shifting/perceptual claims, an “Isolation Effect,” anomalous sound reports and exit details beyond the project's explicitly accepted fidelity contract. These should remain source facts unless `WORLD.md` or another accepted product owner deliberately adopts them.

## Finding 3 — Multiple canons/sources must not be merged implicitly

`REF-L0-006` demonstrates the risk: a Scutoidbox-hosted Red Rooms image was supplied alongside authoritative Level 0 material, but its parent page/canon/authorship/license could not be verified. Its lore authority must not be inherited from `REF-L0-005` merely because the images share a theme.

## Finding 4 — Registry state is not canon evidence

The current transition registry contains multiple named destinations and Project-specific trigger labels. Only the Level 1 route was directly re-verified against the currently audited Level 0 source. Registry presence must not be rewritten as “the wiki says this exact transition exists” without a dedicated source record.

## Finding 5 — Source-described instability conflicts with current deterministic law unless explicitly designed

Pillar/path-shift and broader Level 0 shifting language are external facts. Current Generation 3 intentionally rejects arbitrary non-deterministic geometry mutation. This is a Project interpretation/engineering choice, not evidence that the source lacks shifting behavior.

## Finding 6 — Source page media and page text can have different terms

The current Level 0 page itself demonstrates file-specific media licenses that differ from the page-text license. A source being wiki-hosted cannot be treated as evidence that every attachment is governed by the page's generic terms.

# Copied-Text Review

The audit checked the current provenance ledger, Level 0 reference pack, `WORLD.md`, relevant implementation comments/metadata and representative exact source phrases.

No substantial copied external prose was identified.

Observed repository practice is mostly concise factual paraphrase, for example descriptions of carpet being shallow/less moist, Red Rooms carpet being thick/sticky/coarse, or closed-loop escape difficulty. These are short evidence notes rather than copied source paragraphs on the audited surfaces.

Two exact-phrase searches for distinctive source wording did not return current repository matches:

- `tight-knit, Berber-style`
- `thick, sticky, and very coarse`

Potential copied-text concerns to keep under review are therefore process concerns rather than a currently identified copied passage:

- future reference updates should continue using concise factual paraphrase rather than pasting source prose;
- asset metadata should describe provenance facts and not embed copied lore text;
- implementation comments should link to a reference/ledger owner instead of reproducing source paragraphs;
- if a short direct quotation is genuinely required, record the exact source and keep the quote bounded to what is necessary.

No text was deleted or rewritten in this audit.

# Attribution / License Evidence

## Backrooms Wiki Level 0 page text

The current page license box states:

- page license: CC BY-SA 3.0;
- page authors listed in the current box: DivineAtlas, DrAkimoto and RobertGoerman;
- the page also credits earlier concept/adaptation contributors in its credit section.

This is a source-site statement. This audit does not decide the legal scope of that license as applied to Project Noclip.

## File-specific media evidence currently visible on the Level 0 page

The current license box materially improves several media records:

- baseline Backrooms photo: Bob Mazza — CC0 1.0;
- Arch image (“Arches”): Bob Mazza — CC0 1.0;
- Pillar image (`3`): Alfarex — CC BY-SA 4.0;
- Blackout image (`5`): Alfarex — CC BY-SA 4.0.

The current source-site licensing guide explicitly explains that images may have separate license information and asks uploaders to record media author/source/license data. This supports the repository's separation law but does not resolve every historical attachment.

## Hole `/4` ambiguity

The current Level 0 page displays a media entry named `4` with creator/license information, but its source link points to `/1`, while the current Hole reference is `/4`. Because the mapping is not clean, this audit does not transfer that license entry to `/4`.

## Red Rooms `/6` ambiguity

No visible file-specific `/6` media entry was found in the current Level 0 page license box during this audit. Page-level terms are not treated as automatic proof of `/6` file-level terms.

## M-W1 A/B/C

`assets/definitions/library.json` records user-provided/project-use authorization assertions, but the entries lack the underlying source, creator, original license/permission artifact and attribution terms. The evidence is not sufficient to upgrade these files beyond `UNKNOWN / REVIEW REQUIRED`.

# Unknown / Review Required

## PROV-LEGAL-001

**SUBJECT:** Underlying source/creator/license chain for M-W1 A/B/C committed wallpaper derivatives.

**KNOWN FACTS:** Three WebP files are committed. Project metadata calls them user-provided Level 0 wallpaper references prepared as game-ready derivatives. History independently describes A/B as supplied source derivatives. Metadata asserts project-use authorization from the development conversation.

**SOURCE:** `assets/source/images/*`, `assets/definitions/library.json`, Git history.

**WHAT IS UNKNOWN:** Original source(s), creator(s), original bytes, transformation chain, permission/license text, redistribution scope, attribution requirements and whether one permission covers all three files.

**WHY IT MATTERS:** These are the only current committed source-media payloads and are directly used by M-W1 presentation.

**WHAT EVIDENCE WOULD RESOLVE IT:** Original source URLs/files; creator identity; dated permission or license artifact; scope covering derivative creation and repository/runtime distribution; required attribution/notices; hashes tying the evidence to each source/derivative.

**CURRENT SAFE DOCUMENTATION POSITION:** `UNKNOWN / REVIEW REQUIRED`. Do not state commercial safety or infer that “user-provided” resolves the underlying chain.

## PROV-LEGAL-002

**SUBJECT:** File-level attachment licensing for Level 0 Hole `/4` and Red Rooms `/6`.

**KNOWN FACTS:** The source page has page-level CC BY-SA 3.0 terms and separate file-level media entries. The Hole reference uses `/4`; the currently visible media entry named `4` points to `/1`. No visible `/6` file-specific entry was found.

**SOURCE:** Current Backrooms Wiki Level 0 page/license box; `REF-L0-003`; `REF-L0-005`.

**WHAT IS UNKNOWN:** Correct creator/license/source mapping for `/4`; file-specific creator/license/source for `/6`.

**WHY IT MATTERS:** File-level media terms can differ from page-level terms.

**WHAT EVIDENCE WOULD RESOLVE IT:** Authoritative attachment metadata/history or source-page revision showing exact `/4` and `/6` mappings; creator/source records; explicit file licenses.

**CURRENT SAFE DOCUMENTATION POSITION:** Concept facts may remain source-derived, but the exact attachment terms stay `UNKNOWN / REVIEW REQUIRED`.

## PROV-LEGAL-003

**SUBJECT:** Hole and Red Rooms Google Drive mirror byte identity and permission chain.

**KNOWN FACTS:** The reference pack records public Drive mirrors whose visible content/dimensions matched official images. Direct byte equality was not established.

**SOURCE:** `REF-L0-003`, `REF-L0-005`.

**WHAT IS UNKNOWN:** Whether each mirror is byte-identical to the official attachment; who uploaded/controls the mirror; whether mirroring was authorized; whether the mirror has been modified.

**WHY IT MATTERS:** A visually matching mirror is not automatically the same file or a separate permission grant.

**WHAT EVIDENCE WOULD RESOLVE IT:** Downloadable bytes from both official attachment and mirror; SHA-256 equality; mirror owner/source statement; permission/license chain.

**CURRENT SAFE DOCUMENTATION POSITION:** Use the official source for factual provenance where possible; keep mirrors `UNKNOWN / REVIEW REQUIRED` and do not treat public Drive access as reuse permission.

## PROV-LEGAL-004

**SUBJECT:** Scutoidbox Red Rooms image provenance/canon/media terms.

**KNOWN FACTS:** The direct image was previously accessible/visually inspected and is hosted under a Scutoidbox Wikidot file path. The parent source/canon/creator/license could not be verified. It is already `EVIDENCE-ONLY` in the reference pack.

**SOURCE:** `REF-L0-006`.

**WHAT IS UNKNOWN:** Original creator, original source, parent-page authority/canon, license/permission, relationship to the authoritative Level 0 Red Rooms image/text.

**WHY IT MATTERS:** The image must not inherit authoritative Tier-A status or prose/license terms from a distinct source merely because it depicts a similar red corridor.

**WHAT EVIDENCE WOULD RESOLVE IT:** Accessible parent page/history/license metadata; creator/source link; permission/license evidence; independent evidence of canon/source standing.

**CURRENT SAFE DOCUMENTATION POSITION:** `UNKNOWN / REVIEW REQUIRED`; visual corroboration only; do not use it to establish lore or media rights.

## PROV-LEGAL-005

**SUBJECT:** Scope/applicability of source-site share-alike/game guidance to Project Noclip's mixed source-derived content and Project-original software.

**KNOWN FACTS:** The current Level 0 page states CC BY-SA 3.0 for page text and separate licenses for some media. The source site's licensing guide contains guidance directed at games and derivatives. Project Noclip combines original software/engineering with source-derived content facts/interpretations and separately sourced media.

**SOURCE:** Backrooms Wiki Level 0 license box; Backrooms Wiki licensing guide.

**WHAT IS UNKNOWN:** The legal scope and applicability of those source-site statements to the repository, compiled game, original code, adapted world content, separately licensed media and distribution model.

**WHY IT MATTERS:** The answer could affect notices, attribution, content licensing and distribution architecture, but it is a legal determination outside a provenance audit.

**WHAT EVIDENCE WOULD RESOLVE IT:** Qualified legal review of the actual source uses, repository/distribution structure, licenses, permissions and applicable jurisdiction; or a project-approved licensing policy grounded in such review.

**CURRENT SAFE DOCUMENTATION POSITION:** Record source/license statements and attribution evidence accurately; do not state a project-wide legal/license conclusion in this audit.

## PROV-LEGAL-006

**SUBJECT:** Future audio/texture/mesh/font/video import provenance rules.

**KNOWN FACTS:** Current NAL provides technical source/definition/build validation, but the current tree has only three source image payloads and no external audio/mesh/font/video payloads.

**SOURCE:** `assets/source/README.md`, `assets/definitions/library.json`, NAL implementation/governance.

**WHAT IS UNKNOWN:** Which future sources/creators/licenses/permissions will apply to imported content.

**WHY IT MATTERS:** Technical validation and content hashing do not prove authorization or attribution compliance.

**WHAT EVIDENCE WOULD RESOLVE IT:** Per-file source URL/original file, creator, acquisition method, permission/license artifact, attribution text, modification history and immutable hash before acceptance.

**CURRENT SAFE DOCUMENTATION POSITION:** Require provenance evidence before import/promotion; unresolved assets remain `UNKNOWN / REVIEW REQUIRED` and should not gain runtime trust merely by passing NAL technical validation.

## Additional provenance unknowns

- Source provenance for every current transition destination/trigger beyond the re-verified Level 1 source claim.
- Whether any current item description besides the `Almond Water` concept intentionally derives from external Backrooms prose; no such evidence was found.
- Exact provenance of any future avatar/body/clothing/animation Asset pack.
- Whether historical source-page revisions used different media licenses/credits than the current page; synthesis should record access date/revision with newly verified evidence.

# Canonical Ledger Updates Recommended

These are recommendations for the later centralized synthesis. This audit does not modify `docs/CONTENT_PROVENANCE.md`.

1. **Level 0 baseline media:** add current file-specific Bob Mazza / CC0 1.0 evidence and archive source reference.
2. **Arch `/2`:** add current file-specific Bob Mazza / CC0 1.0 evidence.
3. **Pillar `/3`:** replace any ambiguous/general render-license wording with current exact media-box evidence: Alfarex / CC BY-SA 4.0 / `/3`.
4. **Blackout `/5`:** add current exact media-box evidence: Alfarex / CC BY-SA 4.0 / `/5`.
5. **Hole `/4`:** retain source-derived concept facts but explicitly mark file-level media terms unknown because of the current `Name: 4` -> `/1` mapping mismatch.
6. **Red Rooms `/6`:** retain source-derived concept facts but explicitly mark file-level media terms unknown until `/6` creator/license mapping is verified.
7. **Drive mirrors:** record byte-identity and permission-chain status separately from the official attachment source; do not treat public accessibility as authorization.
8. **Scutoidbox:** preserve `EVIDENCE-ONLY`; make the unknown parent/canon/creator/license state prominent in the canonical ledger.
9. **M-W1 A/B/C:** retain `UNKNOWN / REVIEW REQUIRED`; add per-file source/creator/license/permission/attribution/hash fields when evidence exists.
10. **Audio:** add a current-status entry stating that fluorescent-buzz identity is source-derived but the current sound is procedurally synthesized with no external audio recording committed.
11. **Almond Water:** add an explicit source-derived item-concept/name entry linked to the exact source page, while classifying Project stats/description/Item Instance behavior separately.
12. **Generic items:** record current generic real-world item identities as `REAL-WORLD-INSPIRATION` unless a specific external source is later identified.
13. **Transitions:** add per-destination provenance rather than allowing the implementation registry to stand in for canon/source evidence. Re-verified Level 1 source evidence can be recorded now; others remain unresolved until sourced or explicitly classified as Project-original interpretation/design.
14. **Generation 3 originality:** explicitly map Gen3, deterministic Fields, Region system, topology, Carver architecture, persistence/versioning and visibility architecture as Project-original engineering.
15. **Presentation/tooling originality:** explicitly map PAU/NAL/Studio, wallpaper resolver/UV implementation, procedural ambience and material/runtime systems as Project-original engineering.
16. **Identity architecture originality:** add PlayerCharacterProfile/CharacterProfileId, AvatarDefinition, Journey identity, Item Instance and Inventory architecture as Project-original.
17. **Source-page drift:** where practical record source page revision/access date alongside verified evidence so later edits do not silently rewrite historical provenance.
18. **Copied text:** continue concise paraphrase practice; do not import source prose into WORLD/reference/code comments as a shortcut for evidence capture.

# Future Content Intake Recommendations

Future content intake should make provenance a prerequisite of promotion rather than a cleanup step after runtime integration.

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

Operational recommendations:

- Do not allow `assets:build` success to imply provenance/permission success. Technical validity and rights evidence are separate gates.
- Require exact file-level media terms when a source site distinguishes page and attachment licensing.
- Prefer the authoritative/original source URL over third-party mirrors. If a mirror is required, hash both files and record mirror ownership/permission separately.
- Treat user-provided assets as a provenance category, not a rights conclusion. Store the creator/source/permission evidence behind the user's authorization assertion.
- Record modifications without assuming they eliminate source obligations or uncertainty.
- Keep source facts, Project acceptance and implementation notes in separate fields even when they refer to the same concept.
- Do not promote an external concept into `WORLD.md` solely because it appears on a wiki page. Record the exact source/canon, then make the Project acceptance decision separately.
- Do not let one canon/source transfer authority to another source with similar imagery or terminology.
- For future audio, record whether it is an external recording, synthesized Project audio or a derivative mix. Current procedural Web Audio is a useful clean precedent.
- For future meshes/avatars, record mesh creator, rig/animation creator, texture creators and licenses separately where different contributors/assets are combined.
- For copied text, prefer concise factual paraphrase with source URL and reference ID. Use direct quotations only when necessary and bounded.
- When genuine licensing uncertainty remains, use the `PROV-LEGAL-###` format and keep the status `UNKNOWN / REVIEW REQUIRED` until evidence is obtained. Do not invent a conclusion to unblock implementation.

Audit completion position:

```text
PROVENANCE_IMPACT=REVIEWED

Reason:
the existing provenance record and source evidence were audited;
canonical ledger changes are deferred to synthesis.
```
