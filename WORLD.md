# Project Noclip World Bible

This is the canonical human-facing vocabulary and world-content catalog for Project Noclip. GitHub code and accepted `STATUS.md` remain authoritative for exact production state.

## Maintenance contract

When accepted work adds, removes, renames, reclassifies, or materially changes a Level, Region, Architecture Pattern, Variant, Geometry, Material, Condition, Feature, Structure, Carver, Anomaly, Entity, Item, or Transition, update this file in the same pull request.

- Never present planned content as implemented.
- A `Cell` is a streaming/cache unit, never a room or geographic boundary.
- New journeys use `gen3-v1`; old saves without an explicit generation version remain frozen on `gen2`.
- Generation 3 architecture is tracked by [Issue #31](https://github.com/xash-mind/Project-Noclip/issues/31). Level 0 fidelity corrections are tracked by [Issue #37](https://github.com/xash-mind/Project-Noclip/issues/37).
- Raw reference provenance stays in `docs/references/level-0/REFERENCES.md`; ordinary implementation runs should use the promoted rules here.
- Human short addresses and Architecture Pattern IDs are registered in `src/world/terminology.ts` and explained in `docs/TERMINOLOGY.md`; they never replace stable runtime/save IDs.

## Status vocabulary

| Status | Meaning |
|---|---|
| **Implemented** | Present in the accepted runtime or accepted engine/tooling. |
| **Registered** | Addressable in a registry, but not playable content. |
| **Reference-approved** | Source direction is clear, but implementation is incomplete. |
| **Design required** | Evidence exists, but deterministic player-facing behaviour still needs a human-approved design. |
| **Legacy compatibility** | Retained only so old `gen2` saves load without silent regeneration. |
| **None implemented** | The category is intentionally visible but currently empty. |

---

# 1. Everyday design vocabulary

| Term | Meaning | Project Noclip rule |
|---|---|---|
| **Level** | A major Backrooms world/destination. | Level 0 is the only playable Level. |
| **Region** | Large coherent geography inside a Level. | Derived from continuous kilometre-scale affinity Fields, never hard streaming districts. |
| **Architecture Pattern** | A named reusable architectural grammar owned by a Region. | Subordinate to Region; names recurring architecture such as the Default Wall, Pillar Pier, or Arch Divider without misclassifying it as a Structure or Geometry category. |
| **Variant** | A named subtype of a Region. | Use only when a subtype deserves a stable identity. |
| **Geometry** | The spatial law. | Only **Euclidean** and **Non-Euclidean** are canonical. |
| **Material** | A semantic construction/finish. | Wallpaper, carpet, ceiling, and fixture finish are named content. |
| **Condition** | A state layered over geography, Materials, fixtures, or objects. | Blackout is a Condition, not a Region. |
| **Feature** | Small generated scenery. | Sparse furniture is a Feature; prominent unsupported motifs are forbidden. |
| **Structure** | A special generated location. | Manila Room and Red Rooms are Structures, not Regions. |
| **Carver** | A subtractive generation pass. | Floor-hole clusters cut ordinary Level 0 floors. |
| **Anomaly** | A localized non-spatial rule-breaking phenomenon. | Spatial impossibility belongs under Non-Euclidean Geometry. |
| **Entity** | An active/living actor. | None routinely generated in Level 0. |
| **Item** | A collectible/useful object. | Implemented registry with independent deterministic placement. |
| **Transition** | A route or trigger toward another destination. | Exit architecture belongs to a Transition and optional local Structure, never Threshold geography. |

Architecture Pattern is intentionally **not** a new peer World Lab category. It sits under Region so humans can address recurring Region architecture precisely. Conceptual pieces use dot notation when useful, for example `A-A1.lower-panel`.

`Field`, `Cell`, seed domain, cache radius, and generation version are engine terms. `District`, `ZoneId`, room archetype, spatial profile, component, and generic Prop are `gen2` compatibility vocabulary only.

## Conversation/address aliases

Short addresses are compact human aliases for conversation, issues, and bounded prompts. Stable runtime IDs remain authoritative.

| Short address | Stable meaning |
|---|---|
| `L0` | Level 0 / `level-0` |
| `O` | Ordinary Level 0 / `ordinary-level-0` |
| `P` | Pillar Field / `pillar-field` |
| `A` | Arch Rooms / `arch-rooms` |
| `O-A1` | Default Wall / `ordinary-a1-default-wall` |
| `P-A1` | Pillar Pier / `pillar-a1-pier` |
| `A-A1` | Arch Divider / `arch-a1-divider` |
| `C-B1` | Blackout / `blackout` |
| `CV-H1` | Floor-hole cluster / `floor-hole-cluster` |

Use `docs/TERMINOLOGY.md` for the complete map. Never persist these aliases in place of stable semantic/world addresses.

## Geometry

- **Euclidean — Implemented.** All `gen3-v1` Level 0 geography currently obeys ordinary deterministic topology.
- **Non-Euclidean — Design required.** Red Rooms need a deterministic closed-loop design before they can ship. Pillar path-shifting evidence also requires an explicit save-safe design. Random popping or silently moving visible geometry is not acceptable.

---

# 2. Generation 3 world laws

```text
WORLD SEED + GENERATION VERSION
  -> KILOMETRE-SCALE REGION/CONDITION AFFINITY FIELDS
  -> WORLD-SPACE WALKABLE / CONNECTIVITY SUBSTRATE
  -> LOCAL PARTITION SEGMENT SOLVER + CONTINUOUS REGION MODIFIERS
  -> REGION ARCHITECTURE PATTERNS
  -> EUCLIDEAN GEOMETRY + MATERIALS + CONDITIONS
  -> CARVERS
  -> STRUCTURES
  -> FEATURES / ITEMS / TRANSITIONS
  -> RUNTIME MUTATIONS + SAVE DELTAS
  -> CELLS AS STREAMING/CACHE UNITS ONLY
```

Durable laws:

- New journeys use `gen3-v1`; pre-versioned and explicit `gen2` saves never silently regenerate.
- Region affinity Fields use kilometre-scale wavelengths; local architecture Fields use smaller scales.
- Region affinity, Blackout pressure, architecture, Carvers, Structures, Features, Items, and Transitions use independent deterministic seed domains.
- Generation 3 reserves a deterministic world-space connectivity graph before accepting blocking partitions. Candidate wall/opening segments then make stable local decisions from world coordinates, continuous Fields, neighboring segment state, room-scale pressure and the reserved route network.
- Small and medium rooms, narrow connectors and interrupted sightlines are the normal Ordinary texture. Larger rooms remain occasional and very large spaces require an explicit rare high-openness/high-room-scale conjunction.
- Regions are continuous modifiers of the same Level 0 substrate. A Region affinity may change partition acceptance, pillar frequency, divider grammar, Materials and Conditions locally, but never swaps a whole Cell to a separate generator.
- Architecture Pattern IDs name recurring Region grammar for humans; they do not create a separate generator or change stable save identity.
- Streaming Cell edges do not place walls, reset architecture cadence, choose Region grammar, change Arch dimensions, or reset texture phase. Cells own streaming fragments only.
- Ordinary-looking geometry is the default. Intentional instability, hallucination anchors, fixture failure/flicker and irregular Arch geometry each have explicit sparse budgets; rendering seams, clipping, broken UVs and light-source swaps are always defects.
- Stable semantic IDs and world addresses include the generation version.
- Geometry stays Euclidean unless an explicitly scoped, tested design changes it.
- Generation 3 does not apply legacy unload-count shifting. Any future topology change must be deliberate, deterministic, observable, and save-safe.

## Implemented Fields

Local architecture/condition Fields:

`openness`, `partitionPressure`, `axisFlow`, `roomScale`, `columnPressure`, `ceilingVariation`, `regularity`, `connectivityPressure`, `dampness`, `decay`, `stability`, `abnormality`, `voidPressure`, `clutterPressure`, `electricalReliability`.

Kilometre-scale geography Fields:

`pillarAffinity`, `archAffinity`, `blackoutPressure`, `holePressure`.

All Fields sample world-space metres, reproduce exactly for a seed, remain continuous across Cell boundaries, and stay bounded to `0..1`.

---

# 3. Current Level 0 catalog

## Levels

| Level | Status | Notes |
|---|---|---|
| **Level 0** | **Implemented** | Browser-first vertical slice and only playable Level. |

Registered Transition destinations are not playable Levels: Level 1, Level 2, Level 27, Level 483, Level 13, Level 14, Level 0.22, Level 0.23, Level 0.99, Red Rooms, and Void.

## Regions

| Region | ID | Status | Generation rule |
|---|---|---|---|
| **Ordinary Level 0** | `ordinary-level-0` | **Implemented** | The underlying Level 0 grammar everywhere: a connectivity-first world-space partition network with small/medium rooms and narrow connectors as the common texture, occasional larger rooms, and rare very large spaces. Local segment acceptance shapes movement without recurrent sealed boxes or a dominant Cell/orientation cadence. Sparse wallpaper-clad rectangular pillars may occur. |
| **Pillar Field** | `pillar-field` | **Implemented** | A continuous modifier of Ordinary Level 0. Common Pillar territory retains ordinary wall/room networks while partial/interrupted rows of rectangular wallpaper-clad piers become more frequent and medium open sections appear. Pier spacing remains 7.2 m and generated width is exactly 90% of the dev.3 distribution (`1.395–2.07 m`). Rare deep-field cores suppress most ordinary partitions and intensify the regular lattice, preserving very large near-pure fields as an exceptional deterministic extreme rather than the median experience. |
| **Arch Rooms** | `arch-rooms` | **Implemented** | A continuous modifier of the common Level 0 network. Pale finishes and world-owned divider spans emerge with affinity while ordinary enclosure walls remain connected through the transition. A-A1 keeps its accepted small central curve while each rectangular shoulder is exactly half the previous span, moving the piers inward. The visible upper mass sits 0.24 m below the ceiling while piers remain floor-to-ceiling, and the deeper upper layer bridges shared piers continuously. Normal repeated bays are symmetrical with continuous lower panels/headers and solid terminations. Explicit irregular/asymmetrical dividers use a bounded rare gate; malformed Cell-clipped openings and overlapping pieces are forbidden defects. |

## Architecture Patterns

| Pattern | Stable ID | Owner | Status | Meaning |
|---|---|---|---|---|
| **O-A1 — Default Wall** | `ordinary-a1-default-wall` | Ordinary Level 0 | **Implemented** | Normal solved Level 0 partition wall and its topology-owned openings. |
| **P-A1 — Pillar Pier** | `pillar-a1-pier` | Pillar Field | **Implemented** | Canonical rectangular wallpaper-clad floor-to-ceiling pier on the persistent 7.2 m lattice. |
| **A-A1 — Arch Divider** | `arch-a1-divider` | Arch Rooms | **Implemented** | Repeated Region divider grammar composed conceptually from piers, upper mass/curve, lower panel where applicable, and complete terminations. |

Current conceptual piece addresses:

```text
O-A1.wall-span
O-A1.solved-opening
P-A1.pier
A-A1.pier
A-A1.upper-mass
A-A1.curve
A-A1.lower-panel
A-A1.termination
```

A renderer may construct one conceptual piece from multiple mesh segments/vertices. Those are implementation primitives, not additional Architecture Patterns.

## Variants

| Variant | Status | Notes |
|---|---|---|
| **Default** | **Implemented** | Ordinary Level 0 without an overriding Condition, Carver, or Structure. |

Continuous Field variation does not automatically create more named Variants.

## Materials

| Material | ID | Status |
|---|---|---|
| Level 0 patterned wallpaper | `level-0-wallpaper` | **Implemented** |
| Pale Arch wallpaper | `arch-pale-wallpaper` | **Implemented** |
| Brown-beige Level 0 carpet | `level-0-carpet` | **Implemented** |
| Suspended Level 0 ceiling | `level-0-ceiling` | **Implemented** |
| Fluorescent panel | `fluorescent-panel` | **Implemented** |

The yellow photographic cast comes primarily from harsh fluorescent lighting. Do not turn every surface into uniformly dark or saturated yellow.

## Conditions

| Condition | ID | Status | Rule |
|---|---|---|---|
| Damp carpet | `damp-carpet` | **Implemented** | Ordinary persistent wet-floor reading. |
| Deep wet carpet | `deep-wet-carpet` | **Implemented** | Arch Rooms. |
| Shallow carpet | `shallow-dry-carpet` | **Implemented** | Pillar Fields; less moisture and shallower pile. |
| Blackout | `blackout` | **Implemented** | Region-scale Condition over recognizable ordinary Geometry. Local fixture emission and local buzz are exactly zero. External glimmer and fluorescent buzz rise continuously toward a lit boundary. |

## Features

| Feature | Status | Rule |
|---|---|---|
| Sparse furniture | **Implemented** | Rare tables, chairs, or cabinets from an independent seed domain. Most space remains empty. |
| Occasional ordinary pillar | **Implemented** | Rare rectangular wallpaper-clad floor-to-ceiling support; not an Arch or alcove motif and not the Region-owned `P-A1` pattern. |
| Medium bucket | **Implemented** | Sparse deterministic Arch-Room-only environmental dressing. Open utility-bucket silhouette, muted aged finish, non-solid and route-clear; never loot. |
| Small grey open paint can | **Implemented** | Sparse deterministic Arch-Room-only environmental dressing. Smaller lidless grey can with visible rim/dark cavity and restrained peeled-label residue without text; non-solid and route-clear; never loot. |

## Structures

| Structure | Status | Rule |
|---|---|---|
| **Manila Room** | **Implemented** | One delayed deterministic Structure. World Lab locates it or places one isolated origin test; it never fills a Region. |
| **Exit Structure** | **Implemented** | Local architecture attached to a Transition; there is no Threshold Region. |
| **Red Rooms** | **Design required** | Rare Level 0 Structure with crimson Materials/Conditions and deterministic Non-Euclidean closed-loop behaviour. Do not implement until that topology is approved. |

## Carvers

| Carver | ID | Status | Rule |
|---|---|---|---|
| Floor-hole cluster | `floor-hole-cluster` | **Implemented** | Extremely rare lattice/near-lattice square black pits through ordinary Level 0. Default pits do not overlap, preserve bypass lanes, have no carpet frame, wooden rail, shallow plate, or visible destination. |

Dense/clumped pits may become an explicitly rare variant later; accidental overlap is not variety.

## Anomalies

**None implemented as first-class Generation 3 content.** A legacy hallucination anchor remains runtime flavour, not a new Geometry category.

## Entities

**None implemented as routine Level 0 population.** Routine monsters/combat remain out of scope.

## Items

Implemented Items: Flashlight, Battery, Almond Water, Permanent Marker, Paper Note, Glow Stick, String Spool, Empty Can, and Pry Tool.

## Transitions

Enabled foundations exist for Level 1, Level 2, Level 27, Level 483, Level 13, and Level 14 when their timeline gates are met. Other registered destinations remain disabled. A registration never means its destination is playable.

---

# 4. Level 0 visual and audio fidelity contract

Promoted Tier-A reference conclusions:

- **Ordinary Level 0:** pale sickly-yellow patterned wallpaper, tight-knit brownish-beige carpet that reads yellow under fluorescent light, persistently damp floor, suspended ceiling tiles, repeated rectangular panels, and pervasive fluctuating fluorescent buzz. Architecture should form changing rooms, narrow connectors, interrupted sightlines, and larger spaces without degrading into isolated walls scattered across a globally open floor.
- **Pillar Fields:** rectangular wallpaper-clad floor-to-ceiling piers in the persistent 7.2 m world lattice, ordinary suspended ceiling/fixture grammar, occasional vents and shallower carpet. Normal territory mixes the Level 0 wall network with partial/interrupted pillar groups and medium open sections. Only rare deep-field cores become highly regular, wall-sparse and extremely open. Current Gen3 pier widths are exactly 10% narrower than dev.3 (`1.395–2.07 m`).
- **Arch Rooms:** pale full-height room walls surround continuous dividing walls with solid lower panels, repeated arch-shaped holes/openings, continuous headers, deep wet carpet, and unusually stable Euclidean layout. Divider dimensions belong to the complete world-space span, not a Cell fragment. Normal bay rhythms are symmetrical; rare explicit irregularity is intentional content. Names do not justify freestanding arches, and the dividers must not be the only architecture present.
- **Blackouts:** recognizable Level 0 Geometry with no local light and no local buzz. Fixtures disappear into the dark ceiling. External light and buzz provide gradual escape cues; lighting must not snap at Cell boundaries.
- **Hole clusters:** close grids/groups of discrete square pitch-black floor pits with readable bypass lanes. Only the rim and upper depth are readable; no framed recess, shallow destination plate, or unsupported rail.
- **Red Rooms:** rare distressing crimson Structure with difficult/impossible escape. Exact deterministic closed-loop Geometry remains a human design decision.

Still images do not establish audio. Audio rules above come from verified authoritative text paired with the promoted image evidence.

## Presentation rules

- Ceiling fixtures are emissive panels plus real broad downward spatial lights at their actual world positions, with restrained HDR bloom so panels read as luminous rather than painted white boxes.
- Every rendered fluorescent fixture owns its real spot for the lifetime of the streamed Cell. There is no player-nearest fixture-light allocator or arbitrary realtime fixture cap; player position never acquires/releases fluorescent lights.
- Neighboring fixture light crosses walls/Cell boundaries continuously; no player-following room light.
- The deterministic fixture pulse owns both panel emission and real-light energy. `off` means zero contribution; Reduced Flicker makes flicker steady through the same world law.
- The sampled light field is for ambience/diagnostics only and must never become physical-light allocation or visible Cell-surface illumination ownership.
- Renderer fixture source energy must not be multiplied merely because the player approaches. Engine light range/falloff owns the physical distance response.
- Gen3 wallpaper phase derives from stable world-space wall coordinates/orientation rather than each renderer fragment. Skirting follows the solved wall span and terminates at joins/openings without deliberate end protrusion; Cell clipping must not reset either surface.
- Global ambient contribution stays low enough that fixtures shape the room.
- The fluorescent bed uses audible fundamental/harmonic energy suitable for browser/laptop playback while remaining subtle.
- World Lab may keep ambience audible for inspection; users can disable its audio monitor.
- World Lab pauses obscured continuous rendering and requests only inspection frames while open, so its diagnostics do not hide their own rendering cost.

---

# 5. World Lab contract

World Lab uses the same canonical peer registry as runtime diagnostics:

`Levels`, `Regions`, `Variants`, `Geometry`, `Materials`, `Conditions`, `Features`, `Structures`, `Carvers`, `Anomalies`, `Entities`, `Items`, `Transitions`.

Architecture Patterns remain subordinate to Regions and therefore do not add another top-level World Lab category.

- Regions and natural Blackouts are located, not spawned.
- Fields and Conditions are sampled.
- Materials and Carvers are previewed.
- Manila may be located naturally or placed once in an isolated test.
- Features and Items may be spawned as disposable visual QA objects.
- Transitions are triggered/tested, not mislabeled as geography.
- Fields, Cell/cache state, seed domains, travel estimates, and generation version belong under engine diagnostics.
- World Lab exposes Region extent/walking estimates, current affinities, natural Manila distance, hole candidate rate/gates, and Item-node base chance.

Forbidden World Lab geography labels: `Procedural districts`, `Room variation`, Manila-as-Zone, and Threshold-as-Zone.

---

# 6. Legacy Generation 2 compatibility

`ZoneId`, 5×5 districts, room archetypes, spatial profiles, components, alcoves, freestanding arch runs, hole rails, and old lighting are frozen behind `generationVersion: gen2` for old saves only.

- Existing unversioned saves migrate to `gen2`.
- New journeys are created as `gen3-v1`.
- No existing journey silently changes world generation.
- Generation 3 tests must not reward legacy archetype/component diversity.
- Legacy files may be deleted only after an explicit save-retention decision permits it.

Future implementation requests should use the everyday vocabulary and short addresses above. Agents may translate them into Fields, Cells, seed domains, stable IDs, and implementation files internally without asking the user to speak in engine terms.
