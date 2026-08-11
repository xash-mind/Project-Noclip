# Project Noclip World Bible

This is the canonical human-facing vocabulary and world-content catalog for Project Noclip.

GitHub code and accepted `STATUS.md` remain authoritative for exact runtime behaviour. This file answers: **what kinds of things exist in the game, what are they called, and what state are they in?**

## Maintenance contract

When accepted work adds, removes, renames, reclassifies, or materially changes a **Level, Region, Variant, Geometry, Material, Condition, Feature, Structure, Carver, Anomaly, Entity, Item, Transition**, or a related engine/legacy world-generation concept, update this file in the same pull request.

Rules:

- Never present planned content as implemented.
- Keep useful empty categories visible as `None implemented`.
- Keep legacy implementation vocabulary documented until the migration that removes it is accepted.
- If code and this catalog disagree, resolve the mismatch before claiming the catalog is current.
- Material catalog changes should be mirrored to the mapped Project Noclip Notion page during the normal material Notion sync.
- A `Cell` is a technical streaming/computation unit, **not a room**.
- Generation 3 target architecture is tracked by GitHub Issue #31. This file records vocabulary/current content; Issue #31 records migration work.

## Status vocabulary

| Status | Meaning |
|---|---|
| **Implemented** | Exists in the accepted playable/runtime build or accepted engine/tooling framework where explicitly stated. |
| **Registered** | Exists in data/transition registries but is not playable content yet. |
| **Legacy** | Exists in the current Gen-2 implementation but is intended to be replaced/reclassified by Gen 3. |
| **Planned** | Accepted direction, not implemented runtime behaviour yet. |
| **None implemented** | The category exists conceptually but has no first-class implementation yet. |

---

# 1. Everyday design vocabulary

These are the terms Sash should normally use when describing world content to agents.

```mermaid
flowchart TD
    L["LEVEL\nA Backrooms world/destination"] --> R["REGION\nBiome-like geography"]
    R --> V["VARIANT\nOptional named subtype"]
    R --> G["GEOMETRY\nEuclidean / Non-Euclidean"]
    R --> A["ARCHITECTURE\nTraversable built space"]
    A --> M["MATERIAL\nWallpaper / carpet / ceiling type"]
    M --> C["CONDITION\nDamp / worn / damaged / dark etc."]
    A --> CV["CARVER\nSubtracts floor / wall / ceiling / shafts"]
    A --> S["STRUCTURE\nSpecial generated location"]
    A --> FT["FEATURE\nSmall generated object/scenery"]
    A --> AN["ANOMALY\nNon-spatial rule-breaking phenomenon"]
    A --> E["ENTITY\nActive/living actor"]
    A --> I["ITEM\nCollectible/useful object"]
    A --> T["TRANSITION\nRoute to another Level/destination"]
```

| Term | Simple meaning | Minecraft-ish analogy | Project Noclip rule |
|---|---|---|---|
| **Level** | A major Backrooms world/destination. | Dimension | Level 0 is the only playable Level today. |
| **Region** | A large coherent geographic/environmental area inside a Level. | Biome | Preferred Gen-3 geography term. Regions should usually emerge from continuous conditions rather than hard room templates. |
| **Variant** | An optional named subtype of a Region. | Biome variant | Use only when a subtype deserves a stable name. Continuous changes do not automatically become Variants. |
| **Geometry** | The spatial law of an area. | World/terrain law | Only two canonical values: **Euclidean** and **Non-Euclidean**. |
| **Material** | A named construction/finish type. | Wood/block family | Wallpaper, carpet, ceiling or other semantic finish type. |
| **Condition** | A state layered onto architecture, materials, fixtures or objects. | Block state | Damp, worn, damaged, dark, flickering, missing, etc. |
| **Feature** | Small generated object/scenery placed into the world. | Tree, ore, plant | Chairs, desks, papers and similar non-structural content belong here. |
| **Structure** | A special generated location/discovery. | Village, temple, stronghold | Manila Room is the clearest current example. `Rare` is an attribute of a Structure, not a separate category. |
| **Carver** | A subtractive generator that removes ordinary architecture. | Cave carver | Used for holes, shafts, missing walls/floors/ceilings. |
| **Anomaly** | A localized rule-breaking phenomenon that is not merely spatial geometry. | Rare world phenomenon | Purely spatial impossibility belongs under **Geometry**, not Anomaly. |
| **Entity** | Active/living actor in the world. | Mob | None implemented as a routine world population system yet. |
| **Item** | Collectible/useful world object. | Item | Implemented registry. |
| **Transition** | Route/trigger toward another Level or destination. | Portal/exit | Exit foundations exist even when destination Levels are not playable. |

## Geometry: only Euclidean or Non-Euclidean

`Distorted` is **not** a separate Geometry category.

- **Euclidean** — ordinary spatial relationships. Routes reverse normally and local dimensions/connectivity obey expected geometry.
- **Non-Euclidean** — space itself violates ordinary geometry/topology in a deterministic, save-safe way.

Useful **Non-Euclidean behaviours** are descriptions, not separate top-level Geometry values:

- **metric distortion** — internal distance/scale cannot reconcile with surrounding space;
- **impossible adjacency** — spaces connect in mutually incompatible ways;
- **loop** — continued travel returns to an impossible prior location/relationship;
- **asymmetric route** — A → B does not imply the same B → A path;
- **spatial discontinuity** — a boundary/door/path maps to a location that ordinary continuous space cannot explain.

Crooked walls, strange proportions, changing ceiling height or unsettling visuals remain **Euclidean** unless the spatial law itself becomes impossible.

## Simplification rules

To avoid vocabulary bloat:

- Use **Region**, not `environment regime`, `environment class`, or `biome class`, for the human-facing geographic label.
- Use **Geometry**, not `Geometry Regime`.
- Use **Material**, not `Material Family`, in ordinary discussion.
- Use **Condition** for fixture/object/environment state; do not create separate `Object State` or `Fixture State` world categories.
- Use **Structure** for special locations; `rare`, `unique`, `common`, etc. are properties of Structures, not new categories.
- Use **Anomaly** only for exceptional non-spatial phenomena. Spatial impossibility belongs under **Non-Euclidean Geometry**.
- `Field`, `Cell`, `District`, `Archetype`, `Spatial Profile`, `Component` and `Prop` are engine/legacy vocabulary, not equal top-level design categories.

---

# 2. Engine vocabulary

These terms remain important to agents/code, but Sash does not need to use them for ordinary design requests.

| Engine term | Meaning | Current state |
|---|---|---|
| **Field** | Smooth deterministic value sampled from seed/world coordinates that can drive generation. | **Implemented and partially consumed.** `src/world/fields.ts` samples all canonical Gen-3 Fields continuously; the bounded baseline `open-office` architecture pilot now consumes structural Fields while most Level 0 generation remains legacy. |
| **Cell** | Streaming/computation unit. | Implemented. **Never a room.** |
| **District** | Coarse deterministic planning grouping. | Current generator groups cells into 5×5 districts for legacy zone selection. |
| **Seed domain** | Independent deterministic namespace for a generation layer. | **Implemented for the Field sampler and bounded architecture-continuity lattice**; broader layer-by-layer separation remains Generation 3 direction. |

### Implemented Gen-3 Field framework

The accepted Slice-A framework exposes these deterministic scalar Fields:

- `openness`
- `partitionPressure`
- `axisFlow`
- `roomScale`
- `columnPressure`
- `ceilingVariation`
- `regularity`
- `connectivityPressure`
- `dampness`
- `decay`
- `stability`
- `abnormality`
- `voidPressure`
- `clutterPressure`
- `electricalReliability`

Framework laws:

- sampling uses **world-space metres**, not Cell-local coordinates;
- each Field combines **168 m, 56 m and 21 m** deterministic scales so geography exists at multiple distances;
- interpolation is continuous across Cell boundaries;
- values are bounded to `0..1`;
- deterministic domains are separated from current generator hashes and from one another;
- current Geometry metadata is **Euclidean** only;
- the bounded ordinary baseline `open-office` pilot consumes structural Fields, including selective structural-channel probes for its wider continuity guide; other ordinary paths remain on accepted legacy generation until later migrations.

### Implemented Gen-3 architecture and continuity pilot

One bounded ordinary-Level-0 path now uses `src/world/architecture.ts` instead of emitting recognizable Gen-2 structural modules:

- scope: legacy `baseline` cells classified as `open-office`;
- `axisFlow`, `openness`, `partitionPressure`, `roomScale`, `columnPressure`, `regularity` and `connectivityPressure` solve internal partitions/supports;
- a slow heading/corridor guide blends the centre sample with wider world-space probes so neighboring pilot Cells do not independently threshold the same architecture decision;
- partition cadence and support candidates are anchored to seed-domain world-space lattices rather than restarting from each Cell centre;
- compatible partition runs can meet at east/south pilot seams, while any run that would cross the protected connector corridor remains inset;
- Cell boundary openings remain the existing deterministic Euclidean connector law;
- legacy `open-office` remains migration metadata, not proof that the new geometry is still room-template driven;
- emitted pilot `componentIds` are empty and its composition signature is Field-derived;
- legacy markable/collidable wall and solid-prop IDs are reused as compatibility identity slots so existing saved marker evidence remains addressable without a save-schema migration;
- non-structural legacy module decoration is not emitted on the pilot path;
- a coarse player-radius reachability validator requires the centre to reach all four interior edge bands;
- lattice and seam validators require emitted geometry to retain world-space cadence and require every eligible representative partition line to match its neighbor;
- this is a bounded Slice-C continuity substrate, **not complete continuous-Level-0 migration**: legacy boundary-wall representation, sparse pilot eligibility and non-pilot architecture can still reveal Cell cadence and remain later work.

Developer diagnostics:

```text
npm run fields:lab -- [seed] [worldX] [worldZ]
```

The normal 10,000-cell benchmark also reports a separate 10,000-sample Field timing/range/Cell-boundary continuity section plus bounded architecture-pilot coverage, world-lattice validation and eligible seam matching. Human-facing output should still usually be discussed as Regions, Geometry, Materials, Conditions, Features, Structures, etc.

---

# 3. Current world catalog

## Levels

### Playable

| Level | Status | Notes |
|---|---|---|
| **Level 0** | **Implemented** | Current browser-first vertical slice and only playable Level. |

### Registered transition destinations — not playable Levels

| Destination | Status | Current transition label | Enabled exit foundation |
|---|---|---|---|
| **Level 1** | **Registered** | Garage-like transition | Yes |
| **Level 2** | **Registered** | Manila departure | Yes |
| **Level 27** | **Registered** | Carpet breach | Yes |
| **Level 483** | **Registered** | Weak wall breach | Yes |
| **Level 13** | **Registered** | Greenhouse doors | Yes |
| **Level 14** | **Registered** | Emergency exit | Yes |
| **Level 0.22** | **Registered** | Second Attempt | No |
| **Level 0.23** | **Registered** | Next Project | No |
| **Level 0.99** | **Registered** | Deep-distance fracture | No |
| **Red Rooms** | **Registered** | Crimson contamination | No |
| **Void** | **Registered** | Unresolved floor failure | No |

A registered destination means its ID/exit exists. It does **not** mean the destination is implemented as a playable Level.

## Source-backed Level 0 fidelity contract

The first Level 0 reference batch establishes these durable source targets. They are **not** claims that every accepted legacy path already satisfies them; `STATUS.md` remains authoritative for current runtime state. Raw provenance and evidence boundaries live in `docs/references/level-0/REFERENCES.md`.

| Target | Durable source rule | Project classification / guardrail | Evidence |
|---|---|---|---|
| **Ordinary Level 0** | Empty segmented spaces use sickly-yellow patterned wallpaper, tight-knit brownish-beige Berber-style carpet that reads yellow under harsh fluorescent light, a seamless persistently damp floor, suspended ceiling tiles, repeated rectangular fluorescent panels and a pervasive fluctuating buzz. | This is the shared finish/audio substrate for ordinary Level 0 and for Pillar/Hole variations unless stronger target evidence overrides it. Do not literalize photographic yellow cast into uniformly bright-yellow carpet. | REF-L0-001 |
| **Arch Rooms** | Paler continuous divider/wall treatment with solid lower panels, repeated arch-shaped holes/openings and a continuous header; deep wet carpet; commonly associated with dead ends/transitions; unusually stable with no behind-the-wanderer shift. | Legacy `arch` remains Euclidean. The signature is **not** freestanding arches, and the current evidence does not establish glass. | REF-L0-007 |
| **Pillar rooms** | Potentially vast open rooms use broad rectangular wallpaper-clad floor-to-ceiling pillars/piers in grid/lattice arrangements, ordinary suspended fluorescent ceilings with occasional vent/service grilles, and shallower/less-moist carpet. Source text says unseen paths may shift and later make placement appear asymmetric. | Keep legacy `pillar` until Gen 3 decides whether a stable Region label is useful. Any path shift must be an intentionally designed deterministic, save-safe Non-Euclidean behavior, not random visible popping. | REF-L0-002 |
| **Hole sections** | Close groups/grids of discrete square floor pits interrupt otherwise ordinary Level 0; black interiors reveal only their rims/upper few feet, and carpet lanes can permit bypass while dense clusters remain dangerous. | Target a floor/void **Carver**, not an unrelated complete room template. Do not invent a visible destination or survivable fall; terminal fall behavior remains separately designed work. | REF-L0-003 |
| **Blackout zones** | Entire sections retain recognizable Level 0 architecture but lose local fixture light and local fluorescent buzz; source text also permits rougher walls and recessed ankle-deep fluid. Escape cues come from external/distant glimmers or buzz. | Model mainly through Fields/Conditions over ordinary architecture. The still does not establish a mandatory flashlight/torch or self-lit blackout fixtures. | REF-L0-004 |
| **Red Rooms** | Rare in-Level-0 sections retain the segmented grammar under a deep red/crimson shift, thick sticky coarse carpet and peeling wallpaper revealing crimson; proximity causes severe distress, and full entry disconnects into an extremely difficult/impossible closed loop. | Planned rare **Structure**, not a Region, carrying Material/Condition changes plus an intentionally designed **Non-Euclidean loop**. The current disabled Transition registration is runtime/legacy state, not proof of a separate playable destination. Mold, mushrooms and radio degradation remain unverified. | REF-L0-005; REF-L0-006 is evidence-only |

Still images do not establish audio. The ordinary fluorescent buzz and Blackout silence/distant-buzz rules above come from the verified authoritative Level 0 text paired with the images.

Detailed corrective implementation and fidelity acceptance are tracked in [Issue #37](https://github.com/xash-mind/Project-Noclip/issues/37).

## Regions

### Canonical Gen-3 Regions

**None implemented yet.**

The accepted runtime still uses legacy `ZoneId`s as the nearest region-like implementation:

| Legacy ID | Human label | Status | Gen-3 direction |
|---|---|---|---|
| `baseline` | Baseline Lobby / ordinary Level 0 | **Legacy with bounded Gen-3 pilot** | Baseline `open-office` geometry is now Field-solved; broader ordinary Level 0 should continue migrating away from hard room templates. |
| `arch` | Arch Rooms | **Legacy implemented** | Source-backed target is a continuous pale divider/wall with repeated arch-shaped openings, not freestanding arches; reclassify only if coherent geography remains after field-driven architecture lands. |
| `pillar` | Pillar Field | **Legacy implemented** | Source backs vast grid/lattice geography of wallpaper-clad rectangular supports; reclassify only if that pillar-heavy geography deserves a stable Region label. |
| `blackout` | Blackout Zone | **Legacy implemented** | Source backs total local light/buzz loss over recognizable ordinary architecture; represent mainly through Conditions/Fields rather than a hard zone. |
| `holes` | Hole Section | **Legacy implemented** | Source backs close grid/cluster groups of discrete square black pits; future void/Carver pressure should generate the effect over ordinary Level 0. |
| `exit-threshold` | Exit Threshold | **Legacy implemented** | Better modeled as a Transition/Structure than ordinary geography. |
| `manila` | Manila compatibility profile | **Legacy compatibility only** | **Not a Region.** Manila is a Structure. |

## Variants

### Canonical Gen-3 Region Variants

**None implemented yet.**

Current legacy spatial profiles are implementation metadata, not canonical Variants:

- `standard`
- `sparse-vista`
- `thin-channel`
- `pillar-expanse`

## Geometry

| Geometry | Status | Meaning |
|---|---|---|
| **Euclidean** | **Implemented baseline law** | Current playable topology/connectivity law and the only Geometry used by the Field framework and bounded architecture pilot. |
| **Non-Euclidean** | **Planned Gen 3** | Deterministic impossible spatial relationships. Exact player-facing behaviours must be intentionally designed and verified. |

There is no separate `Distorted` Geometry.

Tier-A Level 0 text describes unseen path shifting in Pillar rooms and a closed loop in Red Rooms. Those are source evidence for future Non-Euclidean behaviors, not implemented behavior. Before either ships, define deterministic topology, identity, reversal, streaming and save/reload rules; visible random geometry popping is not an acceptable substitute.

## Materials

**No semantic Material IDs are implemented yet.**

The source-backed fidelity contract above nevertheless defines the ordinary Level 0 finish target: sickly-yellow patterned wallpaper, brownish-beige tight-knit carpet whose photographic yellow cast comes from harsh fluorescent light, a seamless damp floor, and a suspended tile ceiling. These remain implementation targets rather than claims that named Material content already exists.

Current runtime has unnamed wall material variant indices, zone-specific tints, ceiling pattern indices and floor-patch kinds. Named wallpaper/carpet/ceiling Materials should be added here only after they actually exist as semantic content.

## Conditions

Current implemented condition-like state includes:

| Condition system | Values/state |
|---|---|
| **Stability** | `disorienting`, `semi-stable`, `stable`, `rendezvous`, `terminal` |
| **Light** | `on`, `flicker`, `off` |
| **Floor patch vocabulary** | `damp`, `worn`, `dark`, `dry`, `hole` |
| **World shift** | deterministic `shiftEpoch` participates in some generated state |

A unified semantic Condition layer is **planned**, not yet first-class.

## Features

A first-class Gen-3 Feature layer is **not implemented yet**. The current legacy prop system mixes structure, service elements and scenery.

Current feature-like prop vocabulary includes:

- table
- chair
- cabinet
- box
- bench
- book
- stain
- carpet-patch

Current prop vocabulary that may instead become Architecture/service content includes:

- divider
- pipe
- column
- wall-panel
- ceiling-gap
- sign

Do not automatically classify every legacy `PropKind` as a future Feature.

## Structures

| Structure | Status | Notes |
|---|---|---|
| **Manila Room** | **Implemented** | One delayed seed-derived far special room inside baseline Level 0; not a Region. |
| **Exit Threshold** | **Legacy implemented** | Current exit-bearing cell state; Gen 3 should model threshold architecture as a Transition/Structure. |
| **Red Rooms** | **Planned Structure; current registry is a disabled Transition destination** | Tier-A Level 0 source presents rare in-Level-0 sections with red Material/Condition changes and a closed loop. Treat as a rare Structure, not a Region; exact deterministic Non-Euclidean behavior requires design before implementation. |
| **Maintenance/service complex** | **Planned candidate** | Add only when accepted as actual content. |
| **Special stairwell/elevator** | **Planned candidate** | Add only when accepted as actual content. |

`Rare Structure` is not a separate vocabulary category. A Structure may simply be rare/unique/common.

## Carvers

**None implemented as a first-class carver pass.**

Planned examples:

- floor/void carver
- wall-opening carver
- shaft carver
- ceiling/service-cavity carver
- localized damage/degradation carver

Current holes still come from explicit legacy archetypes/components. Their source-backed target is a Carver-produced close grid/cluster of discrete square pitch-black pits through otherwise ordinary Level 0, with readable bypass lanes and no invented visible destination.

## Anomalies

**None implemented as a first-class anomaly registry.**

Current precursor: deterministic `hallucinationAnchor` on eligible generated cells.

Rule: if the phenomenon is only spatially impossible, classify it under **Non-Euclidean Geometry** instead of creating an Anomaly duplicate.

## Entities

**None implemented as a routine generated world population system.**

Routine monsters/combat remain outside the current Level 0 phase.

## Items

| Item | ID | Status |
|---|---|---|
| Flashlight | `flashlight` | **Implemented** |
| Battery | `battery` | **Implemented** |
| Almond Water | `almond-water` | **Implemented** |
| Permanent Marker | `marker` | **Implemented** |
| Paper Note | `paper-note` | **Implemented** |
| Glow Stick | `glow-stick` | **Implemented** |
| String Spool | `string-spool` | **Implemented** |
| Empty Can | `empty-can` | **Implemented** |
| Pry Tool | `pry-tool` | **Implemented** |

## Transitions

| Destination | Trigger | State |
|---|---|---|
| Level 1 | `gradual` | Registered + enabled when gate is met |
| Level 2 | `manila-wait` | Registered + enabled when gate is met |
| Level 27 | `floor-breach` | Registered + enabled when gate is met |
| Level 483 | `wall-breach` | Registered + enabled when gate is met |
| Level 13 | `greenhouse-door` | Registered + enabled when gate is met |
| Level 14 | `emergency-door` | Registered + enabled when gate is met |
| Void | `floor-breach` | Registered, disabled |
| Level 0.22 | `emergency-door` | Registered, disabled |
| Level 0.23 | `emergency-door` | Registered, disabled |
| Level 0.99 | `anomalous-wall` | Registered, disabled |
| Red Rooms | `gradual` | Registered, disabled; source-fidelity target is a planned rare in-Level-0 Structure with explicitly designed Non-Euclidean loop behavior, not a playable destination |

---

# 4. Legacy Gen-2 translation

These terms remain in code/issues until Gen 3 actually replaces them. They are translation aids, not preferred design vocabulary.

## Legacy `ZoneId`s

`baseline`, `arch`, `pillar`, `blackout`, `holes`, `manila`, `exit-threshold`

## Legacy room archetypes

`open-office`, `split-suite`, `narrow-hall`, `alcove-ring`, `service-corner`, `wide-lobby`, `arch-gallery`, `arch-crossing`, `pillar-grid`, `pillar-aisle`, `maintenance-bay`, `flooded-corridor`, `hole-gallery`, `broken-floor`, `manila-room`, `transition-foyer`

`open-office` remains a legacy classifier/migration label, but baseline `open-office` internal geometry is now Field-solved by the bounded pilot instead of being emitted from its Gen-2 structural modules. Its current partitions/supports use the Slice-C world-space continuity substrate while legacy Cell boundary walls remain intact.

## Legacy spatial profiles

`standard`, `sparse-vista`, `thin-channel`, `pillar-expanse`

## Legacy structural components

`open-void`, `offset-partition`, `cross-partition`, `thin-corridor`, `alcove-pair`, `pillar-scatter`, `pillar-lattice`, `arch-run`, `service-bank`, `divider-run`, `bench-island`, `storage-corner`, `hole-field`, `hole-rail`

`alcove-pair` and `divider-run` remain accepted legacy implementation on non-pilot paths but are not emitted as ordinary structural modules by the baseline `open-office` pilot.

## Legacy prop vocabulary

`table`, `chair`, `cabinet`, `box`, `divider`, `pipe`, `column`, `bench`, `book`, `wall-panel`, `ceiling-gap`, `stain`, `carpet-patch`, `sign`

---

# 5. Generation 3 target model

```text
WORLD SEED
  -> MULTI-SCALE FIELDS                 [engine]  <- Slice A framework implemented; bounded pilot consumes structural Fields
  -> ARCHITECTURE + GEOMETRY SOLVER    [world]   <- bounded baseline open-office pilot implemented
  -> CONTINUOUS LEVEL 0                           <- Slice C world-lattice/seam substrate implemented on pilot; broader migration remains
  -> MATERIALS + CONDITIONS
  -> CARVERS
  -> STRUCTURES
  -> FEATURES
  -> ANOMALIES / ENTITIES / ITEMS / TRANSITIONS
  -> RUNTIME MUTATIONS + SAVE DELTAS
```

Geometry is part of the world law. Current Euclidean behaviour stays unchanged until a bounded verified slice intentionally adds Non-Euclidean behaviour.

Generation layers should use independent deterministic seed domains where useful so changing a stain, fixture or feature does not unnecessarily move architecture, Manila or other unrelated world facts. Slice A establishes this rule for the Field framework; later slices should extend it deliberately rather than sharing one accidental RNG stream.

---

# 6. How Sash can phrase requests

Examples:

> Add a damp **Variant** of an ordinary **Region**. Keep its **Geometry Euclidean**, use darker carpet **Materials**, stronger damp **Conditions**, sparse pipe/desk **Features**, and no new **Structures**.

> Add a rare **Non-Euclidean** area to Level 0 using a deterministic **loop** behaviour, while keeping its Materials visually ordinary.

> Make the Hole area emerge from stronger void conditions and a floor **Carver** instead of explicit hole-room templates.

> Add a new **Structure** with one Transition to Level 1. Do not create a new Region just for that Structure.

Agents may translate these requests into Fields/Cells/seed domains internally without requiring Sash to specify engine vocabulary.
