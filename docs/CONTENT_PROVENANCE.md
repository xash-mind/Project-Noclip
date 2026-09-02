# Project Noclip Content Provenance

This file is a factual provenance ledger and routing surface for Project Noclip content. It is **not legal advice or a legal opinion**.

Its purpose is to keep three things from being silently collapsed into one another:

```text
EXTERNAL SOURCE FACT
    !=
PROJECT NOCLIP INTERPRETATION
    !=
PROJECT NOCLIP ORIGINAL IMPLEMENTATION
```

A source can establish that a yellow patterned wallpaper, pillar variation, blackout, hole cluster, or arch-divider treatment exists. That does not make Project Noclip's deterministic generation, Region model, material resolver, UV continuity, renderer lifecycle, performance strategy, save identity, or tooling external source material.

Conversely, an original implementation does not make the underlying source-derived world/content identity original.

## Authority and relationship to other documents

- `WORLD.md` owns accepted Project Noclip world truth and the current content catalog.
- `docs/VISION.md` owns Project Noclip creative/product direction.
- `docs/CONTENT_PROVENANCE.md` records factual concept-level provenance, source/interpretation/originality boundaries, copied-media status, and unresolved provenance/license questions.
- `docs/references/README.md` owns the evidence-first visual/audio fidelity method.
- `docs/references/**` owns raw source/reference evidence, source tiers, observations, conflicts, and fidelity extraction.
- `assets/definitions/**` owns NAL Asset metadata for source files committed to the project.

This ledger must **link to evidence rather than duplicate full visual/audio reference packs**. Do not copy the detailed visual grammar from `docs/references/**` into this file.

## Classification vocabulary

### `SOURCE-DERIVED`

The concept, identity, name, visual/audio fact, lore fact, or other content fact is materially based on an external source recorded by the repository.

This classification does not state that Project Noclip copied source media or text. It also does not state a license conclusion.

### `INTERPRETATION`

Project Noclip makes a design/product mapping or inference from external evidence rather than reproducing a source fact directly.

Examples include mapping a source variation into the Project Noclip Region/Condition/Carver/Structure vocabulary or choosing a deterministic game-safe rule where the source does not specify one.

### `PROJECT-NOCLIP-ORIGINAL`

The concept or implementation is documented by current repository evidence as Project Noclip-created rather than source-derived.

Use this only where the repository provides enough evidence to make that distinction. Coexistence with source-derived content does not change the classification of the original mechanism.

### `REAL-WORLD-INSPIRATION`

The concept is informed by ordinary real-world architecture, materials, objects, acoustics, or engineering reference rather than Backrooms canon/source material.

Real-world inspiration cannot silently establish Backrooms canon.

### `UNKNOWN / REVIEW REQUIRED`

The evidence is insufficient, conflicting, inaccessible, or does not establish the origin/license/attribution question being asked.

This is the required classification when uncertainty is material. Do not guess.

## Legal/provenance discipline

Public accessibility is not a license conclusion.

Do not call material public domain, Creative Commons, commercially usable, sublicensable, copyright-free, or otherwise cleared unless the repository has evidence for that exact statement and context.

When the repository records a source page's credit/license statement, report it as a **recorded statement**, not as a new legal conclusion. If the mapping from a page-level license statement to an individual asset is unclear, mark the individual asset question `UNKNOWN / REVIEW REQUIRED`.

User-provided source material may have a project note asserting authorization. That assertion is provenance evidence, but it is not automatically a verified underlying license chain.

When evidence is unclear, record the exact unresolved question. Examples:

- source page license unclear;
- individual attachment not mapped to a page-level license credit;
- asset attribution requirement unclear;
- user-provided derivative's underlying source unknown;
- copied text provenance unclear;
- multiple Backrooms canons conflict;
- community/wiki content origin unclear.

## Reference-pack relationship

The current reference method in `docs/references/README.md` remains authoritative:

- distinguish **Source-supported**, **Interpretation**, and **Invented** observations;
- use multiple references where practical;
- record source URL/context;
- record uncertainty/conflict;
- do not copy/rehost copyrighted source media without appropriate permission;
- promote durable conclusions into ordinary world/orientation docs only when justified.

This ledger adds the cross-cutting question: **what is the provenance status of the Project Noclip concept or asset after that evidence has been interpreted?**

## When this ledger must be reviewed

Every `CHANGE` or `RELEASE` that materially adds or changes any of the following must review this file, `docs/references/README.md`, and the relevant reference pack:

- Level;
- Region;
- Material;
- Architecture Pattern;
- Condition;
- Feature;
- Structure;
- Carver;
- Anomaly;
- Entity;
- Item visual/lore identity;
- Transition;
- audio identity;
- source-derived naming;
- external text/image/audio reference;
- Backrooms canon/wiki interpretation.

Update this ledger when the concept's source family, classification, direct support, Project Noclip interpretation/originality boundary, copied-media status, attribution/license evidence, implementation owner, or unresolved question materially changes.

Engineering-only changes can cheaply declare `PROVENANCE_IMPACT=NONE` under `docs/WORK_RULES.md` without reopening reference packs.

## Ledger entry fields

A durable entry should record, where evidence permits:

- concept/address;
- current Project Noclip owner;
- classification;
- source/reference URL(s) already recorded by the repository;
- source/canon family;
- what is directly source-supported;
- what is Project Noclip interpretation;
- what is Project Noclip-original;
- whether source media/text is copied into the repository;
- known attribution/license information;
- exact unresolved provenance/license question when applicable;
- relevant reference pack;
- relevant implementation owner;
- last-reviewed commit/date where practical.

---

# Initial ledger — Level 0 and current source-backed content

The initial pass below is based on accepted repository evidence at commit `a65b011f5c8ef3863376d97e85bb2f0916c20954`, reviewed 2026-08-25. It deliberately does not infer facts beyond that evidence.

## L0 / Ordinary Level 0 baseline and shared finish identity

- **Concept/address:** `L0` / `level-0`; ordinary baseline `O` / `ordinary-level-0`.
- **Current Project Noclip owner:** `WORLD.md` for accepted world truth; `docs/VISION.md` for product direction.
- **Classification:** `SOURCE-DERIVED` for the recognizable Level 0 identity and baseline finish/audio facts; Project Noclip generation/renderer architecture is separate below.
- **Source/reference URL(s) recorded by repository:** `https://backrooms-wiki.wikidot.com/level-0`; `https://backrooms-wiki.wdfiles.com/local--files/level-0/OGLevel0.jpg`.
- **Source/canon family:** repository reference pack treats the Backrooms Wiki Level 0 page as Tier A authoritative/source material for this project.
- **Directly source-supported:** segmented empty yellow/pale Level 0 space; patterned wallpaper; brownish-beige tight-knit carpet that reads yellow under fluorescent cast; damp baseline; suspended ceiling; rectangular fluorescent lighting; fluctuating fluorescent buzz.
- **Project Noclip interpretation:** Ordinary Level 0 acts as the shared substrate from which current Regions/Conditions/Carvers modify local presentation and architecture.
- **Project Noclip-original:** deterministic Generation 3 topology, Region/Condition Fields, Cell streaming model, stable identity, renderer architecture, presentation resolver, UV continuity strategy, and performance systems are implementation architecture rather than facts supplied by the source page.
- **Source media/text copied into repository:** the reference pack records URLs and analysis rather than committing the `OGLevel0.jpg` reference image. Separate committed NAL wallpaper derivatives are tracked in the M-W1 Asset entry below.
- **Known attribution/license information:** `REF-L0-001` records that the parent page credits Bob Mazza with releasing the original Level 0 image into the public domain. This ledger records that repository statement; it does not independently re-adjudicate the legal status.
- **Unresolved question:** whether any future source media beyond the specifically recorded original image has compatible reuse/attribution terms must be verified per asset/reference rather than inferred from the page generally.
- **Relevant reference pack:** `docs/references/level-0/REFERENCES.md` — `REF-L0-001`.
- **Relevant implementation owner:** `src/world/gen3.ts`, `src/world/fields.ts`, `src/world/gen3SpaceTopology*.ts`; visible presentation routes through `src/presentation/**` and Level 0 renderer presentation modules mapped in `docs/CODE_MAP.md`.
- **Last reviewed:** `a65b011f5c8ef3863376d97e85bb2f0916c20954`, 2026-08-25.

## P / Pillar Field and P-A1 Pillar Pier

- **Concept/address:** `P` / `pillar-field`; `P-A1` / `pillar-a1-pier`.
- **Current Project Noclip owner:** `WORLD.md` for accepted Region/Architecture Pattern truth.
- **Classification:** `SOURCE-DERIVED` for the pillar-variation identity, rectangular wallpaper-clad supports, broad lattice/grid character, ordinary finish continuity, and shallower/drier carpet; `INTERPRETATION` for Project Noclip's Region model and deterministic implementation parameters.
- **Source/reference URL(s) recorded by repository:** `https://backrooms-wiki.wikidot.com/level-0`; `https://backrooms-wiki.wdfiles.com/local--files/level-0/3`.
- **Source/canon family:** Backrooms Wiki Level 0 Pillar Variation, Tier A in the current reference pack.
- **Directly source-supported:** large pillar rooms; repeated rectangular floor-to-ceiling wallpaper-clad supports; grid/lattice character; ordinary Level 0 ceiling/fluorescent grammar; shallower/less-moist carpet; source-described behind-the-wanderer path shifting.
- **Project Noclip interpretation:** Pillar Field is a continuous Region modifier over the common Level 0 substrate; currently shipped Geometry remains deterministic Euclidean; any path shift is deferred until a save-safe Non-Euclidean design exists.
- **Project Noclip-original:** exact 7.2 m world lattice, current pier width distribution, affinity/depth Fields, placement/clearance solver, Region crossing distributions, streaming representation, and performance implementation are Project Noclip design/engineering choices not established by `REF-L0-002`.
- **Source media/text copied into repository:** no Pillar reference image is recorded as copied into the repository; the pack stores the external URL and analysis.
- **Known attribution/license information:** `REF-L0-002` records page-level credits for CC-compliant Level 0 render work by Alfarex under CC BY-SA 3.0, but also records that the accessible credit text did not map individual render filenames one-by-one.
- **Unresolved question:** the specific attachment `/3` must not be assigned an individual license/attribution conclusion from the page-level credit unless that mapping is verified.
- **Relevant reference pack:** `docs/references/level-0/REFERENCES.md` — `REF-L0-002`.
- **Relevant implementation owner:** `src/world/fields.ts`, `src/world/gen3ArchitectureCore.ts`, `src/world/gen3SpaceTopologyBuild.ts`, with visible finish ownership under the Level 0 material/presentation modules in `docs/CODE_MAP.md`.
- **Last reviewed:** `a65b011f5c8ef3863376d97e85bb2f0916c20954`, 2026-08-25.

## A / Arch Rooms and A-A1 Arch Divider

- **Concept/address:** `A` / `arch-rooms`; `A-A1` / `arch-a1-divider`.
- **Current Project Noclip owner:** `WORLD.md` for accepted Region/Architecture Pattern truth.
- **Classification:** `SOURCE-DERIVED` for the pale Arch Variation, continuous divider/wall with repeated arch-crowned openings, deep wet carpet, and unusual stability; `INTERPRETATION` for Project Noclip's exact Region and procedural grammar.
- **Source/reference URL(s) recorded by repository:** `https://backrooms-wiki.wikidot.com/level-0`; `https://backrooms-wiki.wdfiles.com/local--files/level-0/2`.
- **Source/canon family:** Backrooms Wiki Level 0 Arch Variation, Tier A in the current reference pack.
- **Directly source-supported:** pale continuous divider/wall; solid lower rectangular panels; repeated vertical bays; continuous header; arch-crowned openings; deep wet carpet; source-described stable/no-behind-you-shift behavior.
- **Project Noclip interpretation:** Arch Rooms are a continuous Region modifier in the common Level 0 network; the source motif is implemented as divider treatment rather than freestanding arch monuments.
- **Project Noclip-original:** exact A-A1 dimensions, bay cadence, topology solver, bounded irregularity gate, renderer curve reconstruction, material ownership, collision cleanup, Cell-fragment handling, and performance implementation are Project Noclip engineering/design choices.
- **Source media/text copied into repository:** no Arch reference image is recorded as copied into the repository; the pack stores the external URL and analysis.
- **Known attribution/license information:** `REF-L0-007` records source provenance and Tier A status but does not establish an attachment-specific reuse license in the repository evidence reviewed here.
- **Unresolved question:** attachment-specific license/attribution terms for `/2` are `UNKNOWN / REVIEW REQUIRED` if Project Noclip ever proposes to copy/rehost the source media.
- **Relevant reference pack:** `docs/references/level-0/REFERENCES.md` — `REF-L0-007`.
- **Relevant implementation owner:** `src/world/gen3SpaceTopology*.ts`, `src/world/gen3ArchitectureCore.ts`, `src/renderer/level0RegionPresentation.ts`, `src/renderer/archDividerRuntimeCorrection.ts`, `src/renderer/finalLevel0MaterialPresentation.ts`.
- **Last reviewed:** `a65b011f5c8ef3863376d97e85bb2f0916c20954`, 2026-08-25.

## M-W1 / Level 0 wallpaper concept

- **Concept/address:** `M-W1` / `level-0-wallpaper`.
- **Current Project Noclip owner:** canonical presentation/material definition in `src/presentation/definitions/level0-materials.json`; world semantic identity is cataloged in `WORLD.md`.
- **Classification:** `SOURCE-DERIVED` for the Level 0 patterned-wallpaper identity and pale sickly-yellow visual grammar; exact Project Noclip family selection, parameterization, and resolver are `PROJECT-NOCLIP-ORIGINAL` implementation details.
- **Source/reference URL(s) recorded by repository:** Level 0 parent `https://backrooms-wiki.wikidot.com/level-0`; baseline attachment `https://backrooms-wiki.wdfiles.com/local--files/level-0/OGLevel0.jpg`; Pillar/Arch references also support wallpaper continuity.
- **Source/canon family:** Backrooms Wiki Level 0 baseline and variation evidence.
- **Directly source-supported:** patterned pale/yellow Level 0 wallpaper and its continuity across the ordinary baseline and supported variations.
- **Project Noclip interpretation:** one canonical M-W1 material identity supplies wallpaper-bearing Ordinary, Pillar, sparse-column, and normal Arch wall surfaces; image-backed A/B/C families are presentation inputs rather than world identity.
- **Project Noclip-original:** deterministic A/B family choice, split-wall-only C rule, pattern-size ownership, image-treatment controls, Asset-slot architecture, texture-cache strategy, world-continuous phase/UV handling, and renderer implementation.
- **Source media/text copied into repository:** **yes, separate NAL source assets exist** under `assets/source/images/`; their provenance is tracked in the next entry. The external reference images in `docs/references/**` are linked, not rehosted there.
- **Known attribution/license information:** concept-level source evidence includes the `REF-L0-001` recorded Bob Mazza/public-domain statement for the original baseline image, but that does **not** establish the provenance/license of the separate A/B/C NAL files.
- **Unresolved question:** exact origin/license/attribution chain for each committed A/B/C wallpaper derivative must be evaluated independently from the Level 0 baseline reference.
- **Relevant reference pack:** `docs/references/level-0/REFERENCES.md` — primarily `REF-L0-001`, plus `REF-L0-002` and `REF-L0-007` for variation continuity.
- **Relevant implementation owner:** `src/presentation/definitions/level0-materials.json`, `src/renderer/ordinaryWallpaperRules.ts`, `src/renderer/ordinaryWallpaperAssets.ts`, `src/renderer/ordinaryWallpaperPresentation.ts`.
- **Last reviewed:** `a65b011f5c8ef3863376d97e85bb2f0916c20954`, 2026-08-25.

## NAL wallpaper source assets A/B/C

- **Concept/address:** `level0.wallpaper.a-chevron`, `level0.wallpaper.b-dots`, `level0.wallpaper.c-lines`.
- **Current Project Noclip owner:** `assets/definitions/library.json` for Asset metadata; source bytes under `assets/source/images/`.
- **Classification:** `UNKNOWN / REVIEW REQUIRED` for the underlying origin/license chain of the three committed source derivatives. Their use as M-W1 presentation content is documented, but current repository evidence does not fully establish the external source/licensing chain.
- **Source/reference URL(s) recorded by repository:** the Asset definitions do not record an external origin URL for these three files. The Level 0 reference pack URLs above document the visual target, not necessarily the source bytes used to create the A/B/C derivatives.
- **Source/canon family:** user-provided Level 0 wallpaper references/derivatives according to NAL metadata.
- **Directly source-supported:** NAL metadata states each is a user-provided Level 0 wallpaper reference prepared as a game-ready derivative.
- **Project Noclip interpretation:** the three files are bound as semantic Wall Texture Assets for M-W1 and may receive non-destructive presentation treatment.
- **Project Noclip-original:** NAL Asset IDs, build pipeline, content hashing, typed Asset slots, runtime registry, texture treatment/cache, and deterministic use rules.
- **Source media/text copied into repository:** **yes** — `assets/source/images/level0-wallpaper-a-chevron.webp`, `assets/source/images/level0-wallpaper-b-dots.webp`, and `assets/source/images/level0-wallpaper-c-lines.webp` are committed source files; generated runtime copies/registry data are derived project outputs.
- **Known attribution/license information:** `assets/definitions/library.json` states: `User-provided source; project-use authorization asserted in the development conversation.` This is the repository's recorded authorization note. It is not an independently verified license/attribution chain.
- **Unresolved question:** identify the underlying source/creator for each derivative and record any required attribution/license terms or other permission evidence. Until then, do not characterize these files as public domain, CC-licensed, commercially usable, or otherwise broadly cleared.
- **Relevant reference pack:** Level 0 pack for visual target context; NAL metadata is the direct provenance record for the committed files.
- **Relevant implementation owner:** `assets/definitions/library.json`, `assets/source/images/**`, `scripts/build-assets.mjs`, generated NAL registry, M-W1 presentation modules.
- **Last reviewed:** `a65b011f5c8ef3863376d97e85bb2f0916c20954`, 2026-08-25.

## M-C1 / Level 0 carpet and wetness Conditions

- **Concept/address:** `M-C1` / `level-0-carpet`; `C-D1` damp carpet; `C-D2` deep wet carpet; `C-S1` shallow/dry carpet.
- **Current Project Noclip owner:** `WORLD.md` for semantic truth; `src/presentation/definitions/level0-materials.json` for canonical visual presentation.
- **Classification:** `SOURCE-DERIVED` for brownish-beige tight-knit carpet, ordinary dampness, deeper/wetter Arch carpet, and shallower/less-moist Pillar carpet; Project Noclip's exact shader/Region policy is implementation.
- **Source/reference URL(s) recorded by repository:** Level 0 parent `https://backrooms-wiki.wikidot.com/level-0`; relevant baseline/Pillar/Arch references from `REF-L0-001`, `REF-L0-002`, and `REF-L0-007`.
- **Source/canon family:** Backrooms Wiki Level 0 baseline and variations.
- **Directly source-supported:** ordinary persistently moist carpet; Pillar shallower/less-moist carpet; Arch deeper/fluid-laden carpet.
- **Project Noclip interpretation:** express these differences through semantic Conditions/Region-aware floor presentation while keeping floor ownership independent from CV-H1 Carver geometry.
- **Project Noclip-original:** exact tint/gloss values, procedural/texture source mode, world-continuous UV behavior, floor-fragment ownership, and renderer implementation.
- **Source media/text copied into repository:** no carpet source image is recorded in the current NAL source directory reviewed here; reference evidence is URL-based.
- **Known attribution/license information:** no carpet-specific copied media/license claim is required for the current procedural presentation; external reference-media reuse remains source-specific.
- **Unresolved question:** any future imported carpet texture requires its own provenance and permission record before runtime use.
- **Relevant reference pack:** `docs/references/level-0/REFERENCES.md` — `REF-L0-001`, `REF-L0-002`, `REF-L0-007`.
- **Relevant implementation owner:** `src/presentation/definitions/level0-materials.json`, `src/renderer/level0SurfacePresentation.ts`, `src/renderer/finalLevel0MaterialPresentation.ts`.
- **Last reviewed:** `a65b011f5c8ef3863376d97e85bb2f0916c20954`, 2026-08-25.

## M-CE1 and M-F1 / ceiling, fluorescent panel, and fluorescent buzz identity

- **Concept/address:** `M-CE1` / `level-0-ceiling`; `M-F1` / `fluorescent-panel`; ordinary fluorescent buzz identity.
- **Current Project Noclip owner:** `WORLD.md` for source-backed world identity; `src/presentation/definitions/level0-materials.json` for visible material definitions; `src/world/lighting.ts` for physical fixture/world law; `src/renderer/fixtureLighting.ts` for physical renderer lights.
- **Classification:** `SOURCE-DERIVED` for suspended ceiling tiles, repeated rectangular fluorescent panels, yellow-green fluorescent cast, and pervasive fluctuating buzz; Project Noclip fixture allocation/flicker/renderer behavior is original implementation.
- **Source/reference URL(s) recorded by repository:** `https://backrooms-wiki.wikidot.com/level-0` and baseline/variation attachment URLs recorded by the Level 0 pack.
- **Source/canon family:** Backrooms Wiki Level 0 baseline and variations.
- **Directly source-supported:** suspended ceiling, rectangular fluorescent panels, fluorescent illumination identity, baseline buzz; Blackout evidence separately establishes loss of local light/buzz.
- **Project Noclip interpretation:** visible panel material is separate from physical Omni selection/lighting law; fixture behavior remains deterministic runtime/world responsibility rather than Studio material ownership.
- **Project Noclip-original:** one-fixture/one-real-light ownership, physical light allocation, runtime flicker implementation, shadow participation, renderer/resource lifecycle, verification diagnostics, and performance tuning.
- **Source media/text copied into repository:** no external fluorescent audio recording or ceiling source image is recorded in the current NAL source directory reviewed here.
- **Known attribution/license information:** no copied audio/ceiling media is currently identified by this review; any future imported source requires its own provenance record.
- **Unresolved question:** future ambient/fluorescent recordings must identify origin, creator, license/permission, attribution needs, and whether they are source/canon evidence or only implementation audio.
- **Relevant reference pack:** `docs/references/level-0/REFERENCES.md` — especially `REF-L0-001`, with variation evidence as applicable.
- **Relevant implementation owner:** `src/presentation/definitions/level0-materials.json`, `src/world/lighting.ts`, `src/renderer/fixtureLighting.ts`, `src/renderer/level0SurfacePresentation.ts`.
- **Last reviewed:** `a65b011f5c8ef3863376d97e85bb2f0916c20954`, 2026-08-25.

## C-B1 / Blackout

- **Concept/address:** `C-B1` / `blackout`.
- **Current Project Noclip owner:** `WORLD.md` for accepted Condition truth.
- **Classification:** `SOURCE-DERIVED` for unlit ordinary Level 0 sections, absence of local fluorescent buzz, and escape cues from external light/buzz; `INTERPRETATION` for Project Noclip's continuous Field/Condition implementation.
- **Source/reference URL(s) recorded by repository:** `https://backrooms-wiki.wikidot.com/level-0`; `https://backrooms-wiki.wdfiles.com/local--files/level-0/5`.
- **Source/canon family:** Backrooms Wiki Level 0 Blackout Zone, Tier A in the reference pack.
- **Directly source-supported:** recognizable ordinary Level 0 architecture under total local fixture outage; missing local fluorescent buzz; rough-wall/possible recessed-fluid text; navigation toward external glimmer or buzzing.
- **Project Noclip interpretation:** Blackout is a Condition over ordinary Geometry driven by deterministic pressure; external light/buzz should vary continuously rather than snap at Cell boundaries.
- **Project Noclip-original:** Blackout Field/seed domain, exact transition curves, fixture participation implementation, renderer blackout behavior, diagnostics, and performance strategy.
- **Source media/text copied into repository:** no Blackout reference image is recorded as copied into the repository; the pack stores the external URL and analysis.
- **Known attribution/license information:** `REF-L0-004` does not establish an attachment-specific reuse license in the repository evidence reviewed here.
- **Unresolved question:** attachment `/5` reuse/attribution terms are `UNKNOWN / REVIEW REQUIRED` if source media is ever proposed for copying/rehosting.
- **Relevant reference pack:** `docs/references/level-0/REFERENCES.md` — `REF-L0-004`.
- **Relevant implementation owner:** `src/world/fields.ts`, `src/world/gen3.ts`, `src/world/lighting.ts`, `src/renderer/fixtureLighting.ts`, runtime blackout rendering path mapped in `docs/CODE_MAP.md`.
- **Last reviewed:** `a65b011f5c8ef3863376d97e85bb2f0916c20954`, 2026-08-25.

## CV-H1 / Floor-hole cluster

- **Concept/address:** `CV-H1` / `floor-hole-cluster`.
- **Current Project Noclip owner:** `WORLD.md` for Carver truth.
- **Classification:** `SOURCE-DERIVED` for discrete square pits in close/grid groups, darkness, limited light penetration, bypassability, and severe fall risk; `INTERPRETATION` for Project Noclip's Carver ownership and safe deterministic generation.
- **Source/reference URL(s) recorded by repository:** parent `https://backrooms-wiki.wikidot.com/level-0`; attachment `https://backrooms-wiki.wikidot.com/local--files/level-0/4`; user-supplied mirror `https://drive.google.com/file/d/1YNDQJO_nivstBK9e-sWXn90wMbXjdauu/view?usp=drivesdk`.
- **Source/canon family:** Backrooms Wiki Level 0 Hole Variation; Drive URL is recorded as a user-supplied mirror whose exact file-byte identity was not established.
- **Directly source-supported:** square floor openings; close/grid clustering; black pit interiors; limited light penetration; bypass lanes; serious fall hazard; ordinary Level 0 finishes continue around the cluster.
- **Project Noclip interpretation:** implement holes as a subtractive floor Carver over underlying Region/floor ownership rather than a separate room template.
- **Project Noclip-original:** exact aperture/lattice algorithm, rarity/density gates, bypass-lane solver, collision/navigation handling, visible depth materials, Region-aware surviving-floor finish, renderer reconstruction, and stable deterministic placement.
- **Source media/text copied into repository:** no Hole reference image is recorded as copied into the repository; the external/Drive sources are referenced by URL.
- **Known attribution/license information:** the current repository entry verifies source context but does not establish attachment/mirror reuse terms.
- **Unresolved question:** licensing/attribution for attachment `/4` and the user-supplied Drive mirror remains `UNKNOWN / REVIEW REQUIRED` for any future copying/rehosting.
- **Relevant reference pack:** `docs/references/level-0/REFERENCES.md` — `REF-L0-003`.
- **Relevant implementation owner:** `src/world/gen3.ts`, `src/world/generator.ts`, `src/renderer/WorldRenderer.ts`, `src/renderer/level0RegionPresentation.ts`, `src/renderer/finalLevel0MaterialPresentation.ts`.
- **Last reviewed:** `a65b011f5c8ef3863376d97e85bb2f0916c20954`, 2026-08-25.

## S-R1 / Red Rooms design target

- **Concept/address:** `S-R1` / Red Rooms.
- **Current Project Noclip owner:** `WORLD.md`; currently `Design required` rather than implemented content.
- **Classification:** `SOURCE-DERIVED` for the rare red/crimson Level 0 sections and source-described closed-loop/distress/material cues; `INTERPRETATION` for Project Noclip's planned classification as a Structure with deliberately designed Non-Euclidean Geometry.
- **Source/reference URL(s) recorded by repository:** parent `https://backrooms-wiki.wikidot.com/level-0`; attachment `https://backrooms-wiki.wikidot.com/local--files/level-0/6`; user-supplied Drive mirror `https://drive.google.com/file/d/1H2lN1fGx7HtitoW2m-H4q-lh-g0MpJZ3/view?usp=drivesdk`; additional evidence-only image `https://scutoidbox.wdfiles.com/local--files/red-rooms/eggrooms-red-2.png` with inferred parent `https://scutoidbox.wikidot.com/red-rooms`.
- **Source/canon family:** Backrooms Wiki Level 0 Red Rooms is Tier A in `REF-L0-005`; Scutoidbox image in `REF-L0-006` is explicitly unverified/evidence-only.
- **Directly source-supported:** rare red/crimson in-Level-0 sections, ordinary-Level-0 architectural resemblance, sticky/coarse/thick carpet, distress, disconnection, and a closed-loop escape problem. `REF-L0-006` supports only the visible red-lit image, not detailed lore.
- **Project Noclip interpretation:** planned rare Level 0 Structure carrying Material/Condition changes and deterministic save-safe Non-Euclidean loop Geometry; not a Region and not evidence that a separate playable Level exists.
- **Project Noclip-original:** exact topology, trigger, persistence reconstruction, generation rarity, communications effects, runtime implementation, and player-facing escape law remain unimplemented/design work.
- **Source media/text copied into repository:** no Red Rooms source image is recorded as copied into the repository; URLs and analysis are stored.
- **Known attribution/license information:** current repository evidence does not establish attachment/mirror-specific reuse licenses for the Red Rooms images; Scutoidbox parent provenance is unresolved.
- **Unresolved question:** exact media rights/attribution for each Red Rooms image and the authoritative origin of the Scutoidbox image remain `UNKNOWN / REVIEW REQUIRED`; implementation also requires a separate explicit product/topology decision.
- **Relevant reference pack:** `docs/references/level-0/REFERENCES.md` — `REF-L0-005`, `REF-L0-006`.
- **Relevant implementation owner:** no playable Red Rooms implementation; design gate is documented in `WORLD.md` and `docs/DECISIONS.md`.
- **Last reviewed:** `a65b011f5c8ef3863376d97e85bb2f0916c20954`, 2026-08-25.

## Generation 3 deterministic world architecture used to present source-derived Level 0 content

- **Concept/address:** Generation 3 `gen3-v1` continuous Fields, topology, deterministic Region/Condition expression, Cells-as-streaming/cache, stable generated identity, and renderer-independent world truth.
- **Current Project Noclip owner:** `PROJECT.md`, `WORLD.md`, `docs/adr/0001-generation-versioned-gen3-cutover.md`, and the implementation mapped by `docs/CODE_MAP.md`.
- **Classification:** `PROJECT-NOCLIP-ORIGINAL` as repository architecture/implementation. It is not a claim that the underlying Backrooms content it presents is original.
- **Source/reference URL(s) recorded by repository:** none required to establish the engineering architecture; source-derived Level 0 content consumed by the architecture is covered by the entries above.
- **Source/canon family:** Project Noclip engineering architecture.
- **Directly source-supported:** external sources can constrain what a Region/Condition/Feature should look or feel like, but do not define the project's TypeScript architecture, seed domains, Cell streaming, save identity, or renderer lifecycle.
- **Project Noclip interpretation:** source variations are mapped into Project Noclip's vocabulary and deterministic game-safe laws where appropriate.
- **Project Noclip-original:** generation-version cutover, continuous Fields, connectivity/topology solver, stable identity strategy, Region/Condition/Carver ownership, Cell streaming/cache role, presentation separation, verification architecture, and runtime performance mechanisms.
- **Source media/text copied into repository:** not applicable to the engineering architecture itself.
- **Known attribution/license information:** no external content-license conclusion is implied by this classification.
- **Unresolved question:** none for the classification itself; individual source-derived content and assets remain governed by their own ledger entries.
- **Relevant reference pack:** consult only when the architecture change also changes source-derived content or fidelity interpretation.
- **Relevant implementation owner:** `src/world/gen3.ts`, `src/world/fields.ts`, `src/world/gen3SpaceTopology*.ts`, persistence/runtime adapters, presentation and renderer boundaries documented in `docs/CODE_MAP.md`.
- **Last reviewed:** `a65b011f5c8ef3863376d97e85bb2f0916c20954`, 2026-08-25.

---

# Initial unresolved provenance/license questions

The initial ledger intentionally leaves these questions unresolved rather than inventing a legal conclusion:

1. **NAL wallpaper A/B/C origin chain:** `assets/definitions/library.json` records user-provided source and an asserted project-use authorization, but does not identify the underlying source/creator or externally verifiable license/attribution terms for each derivative.
2. **Attachment-specific wiki media terms:** several Level 0 reference entries verify authoritative parent-page context but do not establish that a page-level credit/license statement maps to each individual attachment.
3. **Drive mirrors:** the Hole and Red Rooms Drive files were visually matched to official page content in the raw ledger, but direct file-byte identity and separate mirror permission terms were not established.
4. **Scutoidbox Red Rooms image:** parent-page provenance/canon status and media terms remain unverified; it is evidence-only and cannot add canonical lore.
5. **Future source audio/textures/meshes:** no blanket conclusion exists. Every imported external source must carry its own provenance, attribution/license/permission evidence, and role classification.

Resolving one question must update the relevant entry rather than converting unrelated material to the same status by association.

# Handoff requirement

Every future `CHANGE` / `RELEASE` must report the provenance impact exactly as defined in `docs/WORK_RULES.md`:

```text
PROVENANCE_IMPACT=<NONE|REVIEWED|UPDATED|BLOCKED>
Reason: <short factual reason>
```

A content-related change that cannot establish the required provenance/source boundary must not silently ship by omitting this line.

---

# Cleanup provenance audit evidence update — 2026-08-25

This section records only stronger factual evidence established by `docs/audits/cleanup-content-provenance.md` at audit head `2069d0b8961449a15a32beb34ce6b5b3bbfda85f`. It does not alter `WORLD.md`, accepted product behavior, source media, or any project-wide legal conclusion. Where an earlier initial-ledger attribution/license field is narrower or unresolved, this section supersedes that factual field **only for the exact media identified below**.

## Evidence capture and mutable-source rule

- **Evidence access date:** 2026-08-25.
- **Source page:** `https://backrooms-wiki.wikidot.com/level-0` plus the exact attachment paths recorded below.
- The retrieved Level 0 page states **CC BY-SA 3.0 for page text** in its license box. Page-text terms are not treated as automatic attachment terms.
- Separate retrieval snapshots exposed changing external page metadata. A source revision/version must be recorded when reliably obtainable, but this synthesis does **not** invent or promote a stable revision identifier that the audit could not reliably establish.
- Future promoted evidence should record URL, access date, source revision/version when reliable, creator, and file-specific terms where available. A mutable live page is not immutable proof.

## Stronger file-specific media evidence

- **Ordinary baseline / `OGLevel0.jpg` (`REF-L0-001`):** the retrieved file-specific media evidence identifies **Bob Mazza** and states **CC0 1.0**, with an Archive source. This is a recorded source statement, not a new legal opinion.
- **Arch `/2` (`REF-L0-007`):** the retrieved file-specific media evidence identifies **Bob Mazza** and states **CC0 1.0**, with an Archive source.
- **Pillar `/3` (`REF-L0-002`):** the retrieved file-specific media evidence identifies **Alfarex** and states **CC BY-SA 4.0**. This supersedes the initial ledger's earlier page-level-only uncertainty for the exact `/3` media mapping.
- **Blackout `/5` (`REF-L0-004`):** the retrieved file-specific media evidence identifies **Alfarex** and states **CC BY-SA 4.0**. This supersedes the initial ledger's earlier attachment-specific uncertainty for the exact `/5` media mapping.

## Unresolved media remains unresolved

- **Hole `/4` (`REF-L0-003`):** `UNKNOWN / REVIEW REQUIRED`. The retrieved media box displayed an entry named `4` but linked it to `/1`; that inconsistent mapping is not transferred to the `/4` attachment.
- **Red `/6` (`REF-L0-005`):** `UNKNOWN / REVIEW REQUIRED`. No reliable file-specific `/6` entry was visible in the retrieved license box.
- **Hole/Red Drive mirrors:** visual/dimension matching does not prove byte identity, mirror ownership, modification history, or permission chain. Keep `UNKNOWN / REVIEW REQUIRED` unless hashes and source/permission evidence resolve those questions.
- **Scutoidbox Red Rooms image (`REF-L0-006`):** remains `EVIDENCE-ONLY` and `UNKNOWN / REVIEW REQUIRED` for parent/canon/creator/license.
- **M-W1 A/B/C committed WebPs:** remain `UNKNOWN / REVIEW REQUIRED`. Repository metadata/history establishes user-provided game-ready derivatives and an asserted project-use authorization, but not the underlying source(s), creator(s), original license/permission chain, redistribution scope, attribution/notices, or hashes connecting originals to derivatives. Do not infer commercial-use or ownership clearance.

## Audio evidence boundary

Current Level 0 ambience in `src/audio/Ambience.ts` is procedurally synthesized with Web Audio. Fluorescent-buzz **identity** is source-derived, while the current waveform/tuning/runtime implementation is `PROJECT-NOCLIP-ORIGINAL`. The audited tree contains no committed external source audio recording.

Future recorded ambience requires per-file source, creator, acquisition, license/permission, attribution, modification and hash evidence before promotion.

## Item provenance clarification

- **Almond Water:** the name/concept is `SOURCE-DERIVED` from the repository-recorded `https://backrooms-wiki.wikidot.com/object-1` source.
- Project Noclip's exact item ID, stats, description choices, placement/starter weighting, persistent Item Instance identity and inventory behavior remain separate `PROJECT-NOCLIP-ORIGINAL` implementation/design unless independently sourced.
- Flashlight, Battery, Permanent Marker, Paper Note, Glow Stick, String Spool, Empty Can and Pry Tool are ordinary real-world object identities on current evidence and should be treated as `REAL-WORLD-INSPIRATION` unless later provenance establishes a more specific external source.

## Expanded originality map

The provenance audit establishes the following as Project Noclip engineering/system design rather than external Backrooms source material, while the content they present may remain source-derived:

- Generation 3 and the `gen3-v1` cutover architecture;
- deterministic Fields, seed domains, Region affinity/depth and stable world addresses;
- connectivity-first semantic topology and Project Architecture Pattern taxonomy/IDs;
- general Carver pass architecture and deterministic realization;
- Journey persistence/generation-version compatibility architecture;
- Visibility Snapshot/topology adapter/live participation architecture;
- PAU/NAL/Studio source-definition-build-runtime architecture;
- M-W1 family resolver, UV/phase and runtime material system;
- procedural audio implementation;
- Player Character Profile / CharacterProfileId / Avatar representation architecture;
- Item Definition versus persistent Item Instance identity;
- Inventory domain and instance-keyed UI behavior;
- current renderer/runtime performance mechanisms.

These originality statements do not transfer originality to underlying Level 0, Pillar, Arch, Hole, Blackout, Red Rooms, Almond Water, photographs, wallpaper-source bytes, or other external content.

## Additional unresolved provenance from the audit

The following remain review items rather than implementation directives:

- per-transition source/classification beyond the re-verified Level 1 route claim;
- future avatar mesh/material/animation file provenance;
- whether any current item wording beyond the Almond Water concept intentionally derives from external prose; no evidence was found;
- project-wide legal scope/applicability of source-site share-alike/game guidance to mixed source-derived content and original software;
- future audio/texture/mesh/font/video intake evidence.

`PROVENANCE_IMPACT=UPDATED`

Reason: the canonical ledger gained stronger file-specific media creator/license statements, explicit page-text-versus-media separation, mutable-source evidence rules, current synthesized-audio status, an Almond Water concept boundary, and an expanded Project-original architecture map while preserving all unresolved media/asset questions.