# Executive Summary

Audit base: `preview/cleanup-governance-baseline` at `741414a0f9606f9fb9af06f85b6c601c275e266b` (`VERSION` `0.3.0-dev.9.8`).

This audit maps current Level 0 world, generation, presentation, runtime, renderer, material and provenance ownership without changing product behaviour. The governing architectural direction is the repository's existing `WORLD DOMAIN -> PRESENTATION -> RUNTIME / RENDERER -> PLAYCANVAS` dependency law and the PAU invariant that world generation owns **what exists** while presentation owns **how it is represented**.

The broad result is mixed:

- **Region / Condition / Carver identity is generally correct.** Ordinary Level 0, Pillar Field and Arch Rooms are Regions; C-B1 Blackout remains a Condition over the underlying Region; CV-H1 remains a Carver over the Region floor. `tests/generation-3.test.mjs` explicitly proves that Blackout and CV-H1 do not replace Region architecture.
- **M-W1 wallpaper identity is intentionally shared.** Ordinary walls, Pillar walls/P-A1 columns and normal Arch walls resolve through one canonical Level 0 wallpaper identity. `ordinaryWallpaperPresentation.ts` therefore has a misleadingly narrow name: it is a Level 0 shared wallpaper presenter, not an Ordinary-only owner.
- **Casing and outlets are not cleanly owned.** Their deterministic placement mechanics are generic, but both become Ordinary-only because renderer presentation code checks `regionId` and exits/skips. The repository does not contain accepted evidence establishing Ordinary-only eligibility. Ordinary casing itself has source support, but its exclusion from Pillar/Arch does not. Outlet Region eligibility is likewise unsupported. Both require an explicit product decision before any behaviour change.
- **CV-H1 floor ownership is now conceptually correct.** The canonical law is `FINAL FLOOR = REGION FLOOR SURFACE - CV-H1 APERTURE`. CV-H1 owns aperture topology and void/side/depth presentation; M-C1 plus Region/Condition truth owns surviving carpet. Tests explicitly enforce this across Ordinary, Pillar and Arch.
- **A-A1 is behaviourally accepted but architecturally layered.** World topology owns the semantic divider, openings/routes and core supports. Renderer code hides the semantic visible pieces, reconstructs the accepted frame/curve/panel appearance, then a correction layer revises collision and a later final-material layer reasserts M-A1. The accepted silhouette should not change, but the correction stack is a strong consolidation seam.
- **M-C1 floor treatment has duplicated authority.** `level0SurfacePresentation.ts`, `level0RegionPresentation.ts` and `finalLevel0MaterialPresentation.ts` all participate in Region floor treatment. The final PAU owner is explicit, so earlier Region-specific material mutation is transitional duplication that should eventually be consolidated without changing appearance.
- **Floor Conditions are semantically explicit but presentation ownership is weak.** `damp-carpet`, `deep-wet-carpet` and `shallow-dry-carpet` exist as Conditions, yet the canonical carpet resolver selects colour/gloss from Region and only carries `conditionIds` into a cache signature. The current look can be preserved, but Condition-owned treatment should not remain semantically dependent on Region coincidence.
- **C-B1 mostly respects Condition ownership in the active runtime.** Blackout suppresses local fluorescent generation, changes ambient/fog/exposure and hum while leaving underlying Region architecture/material identity intact. Older Blackout code still exists underneath runtime method replacement and should be treated as legacy layering, not as current policy.
- **M-F1 physical-light runtime conflicts with an explicit world law.** `WORLD.md` says fixture ownership must not be reduced to a player-nearest allocator/arbitrary real-light cap, but the current runtime selects player-nearest fixtures under a 32/64/96/128 Render Distance ceiling. That is a separate policy discrepancy requiring a future behaviour-changing correction, not an audit-branch change.

The cleanup should therefore distinguish **ownership repair** from **product design**. Renderer gates are not evidence that a feature should be absent, but neither is an ownership defect evidence that a feature should be added.

# Level 0 Ownership Hierarchy

The accepted conceptual hierarchy is:

```text
LEVEL 0 WORLD IDENTITY
  |
  +-- Region
  |     +-- Ordinary Level 0
  |     +-- Pillar Field
  |     `-- Arch Rooms
  |
  +-- Architecture / topology
  |     +-- common O-A1 Level 0 enclosure/topology
  |     +-- P-A1 pillar participation in Pillar influence
  |     `-- A-A1 divider semantic pattern in Arch influence
  |
  +-- Material identities
  |     +-- M-W1 Level 0 wallpaper (shared identity)
  |     +-- M-A1 A-A1 pale structural finish
  |     +-- M-C1 Level 0 carpet
  |     +-- M-CE1 Level 0 ceiling
  |     `-- M-F1 fluorescent panel appearance
  |
  +-- Region presentation treatment
  |     +-- Ordinary treatment
  |     +-- Pillar treatment
  |     `-- Arch treatment
  |
  +-- Condition overlays
  |     +-- damp / wet / dry carpet conditions
  |     `-- C-B1 Blackout
  |
  +-- Carver overlay
  |     `-- CV-H1 floor-hole cluster
  |
  +-- Features / details
  |     +-- sparse Ordinary pillars
  |     +-- Arch bucket / paint-can features
  |     +-- casing / raceway (eligibility unresolved)
  |     `-- outlets (eligibility unresolved)
  |
  `-- Runtime / renderer realization
        +-- Cell residency remains cache/runtime only
        +-- PAU resolves visual materials/assets
        +-- renderer realizes meshes/lights/interactions
        `-- renderer must not invent world eligibility
```

For wallpaper specifically, the accepted hierarchy is not "Ordinary wallpaper versus other Region wallpaper". It is:

```text
M-W1 LEVEL 0 WALLPAPER IDENTITY
  |
  +-- deterministic A/B/C family decision
  +-- shared world-space phase and source assets
  |
  `-- Region treatment
        +-- Ordinary
        +-- Pillar / P-A1 (same M-W1 identity)
        `-- normal Arch wall treatment (including Arch brightness lift)

A-A1 STRUCTURAL SURFACE
  `-- excluded from M-W1 -> M-A1 pale structural finish
```

For CV-H1, the accepted hierarchy is:

```text
REGION + M-C1 + FLOOR CONDITION
  -> canonical surviving floor treatment

CV-H1 CARVER
  -> semantic aperture set
  -> floor topology subtraction
  -> void / side / depth presentation

FINAL FLOOR
  = canonical Region/Condition floor surface
    MINUS CV-H1 apertures
```

# Region/Condition Matrix

| State | Semantic classification | What it owns | What it must not own | Current implementation status | Policy status |
|---|---|---|---|---|---|
| Ordinary Level 0 | Region / base Level 0 presentation | Baseline Level 0 architecture character; ordinary Region treatment; baseline carpet/ceiling/wall treatment | Blackout, CV-H1, Arch A-A1, Pillar density as separate identities | Correct as Region; shared material presentation is layered | Explicit |
| Pillar Field | Region | Continuous Pillar influence/depth; P-A1 density/placement; wall/pillar coexistence; Pillar floor treatment | A separate wallpaper identity; a separate ceiling/fixture family; casing/outlet exclusion unless explicitly decided | World generation is clean; presentation shares M-W1 and ordinary ceiling/fixture grammar | Explicit except casing/outlet eligibility |
| Arch Rooms | Region | Arch influence; A-A1 occurrence/topology; Arch floor/ceiling treatment; Arch-only accepted Features | A separate generic Level 0 wallpaper identity; glass as a required signature; renderer-only topology invention | World semantics are explicit; visible A-A1 is correction-layered | Explicit |
| C-B1 Blackout | Condition | Local fluorescent absence, atmosphere/darkness, hum suppression/external cue behaviour | Region identity, wall topology, carpet identity, A-A1/P-A1 ownership | Active runtime preserves Region architecture; old masked runtime path remains | Explicit |
| CV-H1 Hole Cells | Carver overlay | Aperture positions/dimensions; removed floor area; void/sides/depth | Surviving carpet identity, Region treatment, floor Condition truth | Strongly enforced by current tests | Explicit |
| `damp-carpet` | Condition | Damp floor-state semantics | Ordinary Region identity itself | Generated explicitly, but final visible delta is not independently resolved from Condition | Semantic policy explicit; presentation ownership incomplete |
| `deep-wet-carpet` | Condition | Deep/wet floor-state semantics | Arch Region identity itself | Generated from Arch influence; final M-C1 values are selected by Region rather than Condition | Semantic policy explicit; presentation ownership incomplete |
| `shallow-dry-carpet` | Condition | Shallow/drier floor-state semantics | Pillar Region identity itself | Generated from Pillar influence; final M-C1 values are selected by Region rather than Condition | Semantic policy explicit; presentation ownership incomplete |

# Concept Ownership Matrix

| CONCEPT | WORLD/SEMANTIC OWNER | GENERATION OWNER | ELIGIBILITY OWNER | PRESENTATION OWNER | MATERIAL OWNER | RUNTIME OWNER | RENDERER OWNER | ORDINARY BEHAVIOR | PILLAR BEHAVIOR | ARCH BEHAVIOR | BLACKOUT MODIFICATION | CV-H1 MODIFICATION | CONDITION MODIFIERS | SOURCE / PROVENANCE CLASSIFICATION | EXPLICIT POLICY OR INCIDENTAL CODE? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| WALL GEOMETRY | Level 0 topology / Region influence | `gen3SpaceTopologyDomain.ts`, `gen3SpaceTopologyBuild.ts` | World topology + continuous Region influence | Base wall realization; A-A1 visible reconstruction separately | Wall MaterialId + PAU representation | Streaming/visibility only | `cellBuilder.ts`, Level 0 presentation adapters | Common topology | Common topology persists; deep Pillar influence can open/suppress walls | Common enclosure plus A-A1 dividers | None; architecture remains underlying Region | None | None | SOURCE-DERIVED grammar + INTERPRETATION/PROJECT-NOCLIP-ORIGINAL topology | Explicit |
| WALL MATERIAL IDENTITY | World semantic material target | Topology assigns `level-0-wallpaper` / `arch-pale-wallpaper` | Topology influence and A-A1 semantic role | M-W1 or M-A1 resolution | `level0-materials.json` | None beyond refresh | Wallpaper/final-material presenters | M-W1 | M-W1 on walls and columns | Normal walls use M-W1; A-A1 uses M-A1 | No ownership change | No ownership change | No wall Condition resolver today | SOURCE-DERIVED identity + INTERPRETATION | Mostly explicit; `arch-pale-wallpaper` is overloaded |
| WALLPAPER | M-W1 shared Level 0 material identity | Wall/column semantic material IDs | Wallpaper-bearing surface role; A-A1 excluded | `ordinaryWallpaperPresentation.ts` | `level0.wallpaper.default` + NAL A/B/C slots | Asset preload/refresh | Level 0 surface lifecycle | Shared M-W1 | Same M-W1 on walls/P-A1 | Same M-W1 on normal Arch walls | Darkness only | None | None | SOURCE-DERIVED identity; exact A/B/C selection PROJECT-NOCLIP-ORIGINAL; NAL origin chain has REVIEW items | Explicit shared policy; module name misleading |
| WALLPAPER PALENESS / REGION TREATMENT | Region presentation policy, not new wallpaper identity | Region ID/influence | Region | M-W1 Arch brightness/treatment | M-W1 parameters | None | Wallpaper presenter | Ordinary parameters | Shared/default Level 0 treatment | Normal Arch wallpaper receives Arch brightness treatment; A-A1 excluded | Atmosphere darkens result | None | None | SOURCE-DERIVED/INTERPRETATION | Explicit |
| CASING / BASEBOARD / TRIM | **Unresolved eligibility**; placement/frequency is declared code/world-owned by PAU | No world semantic casing record today | **Renderer early-return currently makes it Ordinary-only** | `ordinaryCasingMaterialPresentation.ts` | `level0.casing.default` | Static batching | Renderer-created strips | Present at deterministic 35% eligible runs | Absent because Region gate | Absent because Region gate | No special change | No special change | None | Ordinary shallow trim SOURCE-DERIVED; cross-Region eligibility UNKNOWN / REVIEW REQUIRED | **Incidental/ambiguous Region gate** |
| OUTLETS / WALL DETAILS | **Unresolved eligibility**; placement/frequency declared code/world-owned by PAU | No world semantic outlet record today | **Renderer loop currently makes it Ordinary-only** | `ordinaryWallpaperPresentation.ts` | `level0.outlet.default` | `outletInteractionRuntime.ts` | Renderer-created plate + interaction boundary | Sparse inert outlets | Absent because Region gate | Absent because Region gate | No special change | No special change | None | PROJECT-NOCLIP-ORIGINAL presentation/gameplay detail; Region eligibility UNKNOWN / REVIEW REQUIRED | **Incidental/ambiguous Region gate** |
| FLOOR MATERIAL | M-C1 Level 0 carpet identity + Region treatment | Descriptor Region/Condition truth | All Level 0 floor not removed by Carver | Base surface + Region pass + final PAU pass | `level0.carpet.default` | None | Final PAU material is canonical | Ordinary tint/gloss | Pillar tint | Arch tint/gloss | Underlying material remains | Surviving floor keeps same Region material | Conditions are carried but not independently visual-resolved | SOURCE-DERIVED identity and moisture differences + INTERPRETATION/exact values | Explicit target; duplicated presentation stages incidental |
| FLOOR CONDITIONS | Condition IDs | `gen3.ts` | Condition field/override | No dedicated Condition-to-M-C1 modifier layer | M-C1 cache signature includes conditions, values currently Region-selected | None | Final material presenter | `damp-carpet` semantic ID | `shallow-dry-carpet` semantic ID | `deep-wet-carpet` semantic ID | Blackout separate Condition | Preserved through CV-H1 | Condition truth survives but treatment is coupled to Region | SOURCE-DERIVED condition distinctions + INTERPRETATION | Semantic policy explicit; visual ownership incomplete |
| CEILING | M-CE1 Level 0 ceiling identity + Region treatment | Shared Cell ceiling | All Level 0 Regions | `level0SurfacePresentation.ts` | `level0.ceiling.default` | None | Base ceiling mesh | Ordinary treatment | Ordinary ceiling grammar | Arch ceiling tint/treatment | Atmosphere only; no architecture replacement | None | No floor Condition effect | SOURCE-DERIVED | Explicit |
| CEILING GRID | M-CE1 visual presentation | Shared ceiling | All Level 0 Regions | Procedural/NAL ceiling texture presentation | M-CE1 | None | Base ceiling mesh/material | Suspended-grid appearance | Same ordinary grid grammar | Arch treatment on same identity | Darkened by Blackout | None | None | SOURCE-DERIVED grid; exact texture treatment INTERPRETATION/ORIGINAL | Explicit |
| M-F1 FLUORESCENT FIXTURES | Fixture semantic groups + one-fixture/one-real-light law | `world/lighting.ts` via `generator.ts` | Geometry clearance + Blackout suppression | Visible panel material | `level0.fluorescent-panel.default` | `fixtureLighting.ts` | Fixture panels + Omni entities | Baseline fixture candidate grammar | Gen3 deliberately passes `baseline`, retaining ordinary fixture grammar | Same generation grammar, Arch panel treatment | Groups become absent/off in Blackout | Hole geometry does not own fixtures | Blackout only | SOURCE-DERIVED fixture/buzz identity; exact values ORIGINAL | Ownership explicit; active-light cap conflicts with policy |
| PILLAR / P-A1 | Pillar Field influence + P-A1 semantic Feature | `gen3ArchitectureCore.ts`, `gen3SpaceTopologyBuild.ts` | Continuous Pillar influence; sparse Ordinary exception separately | Shared M-W1 column presentation | M-W1 | Collision from solid prop | Base prop mesh + wallpaper presenter | Rare sparse columns | Dense/interrupted P-A1 according to Region depth; walls coexist | Suppressed by Arch influence | No ownership change | Hole filtering prevents invalid overlap | None | SOURCE-DERIVED pillar grammar + INTERPRETATION/ORIGINAL lattice/density | Explicit |
| A-A1 ARCH DIVIDER | Arch Region topology / A-A1 semantic pattern | Topology domain/build | Arch influence + topology decision | `level0RegionPresentation.ts` reconstructs accepted visible frame | M-A1 | Runtime correction for collision/rebuild | Semantic meshes hidden; frame meshes rebuilt | None | None | Repeated pale divider/openings | No ownership change | No ownership change | None | SOURCE-DERIVED silhouette + INTERPRETATION/ORIGINAL exact geometry | Explicit existence; implementation layering incidental |
| A-A1 SUBCOMPONENTS | Semantic lower/header/piers/terminations + portal/opening law | `gen3SpaceTopologyBuild.ts` | A-A1 semantic role | Curves, upper runs, visible piers/panels in Region presentation | M-A1 | `archDividerRuntimeCorrection.ts` | Region presentation + final material | N/A | N/A | Lower panel/header/pier/curve/frame; no required glass | No ownership change | No ownership change | None | SOURCE-DERIVED lower panel/header/openings; exact proportions ORIGINAL/INTERPRETATION; glass unsupported | Policy explicit; role inference/correction stack incidental |
| CV-H1 APERTURE | CV-H1 Carver | `gen3.ts` hole patches | Carver geography/gate | Floor topology subtraction only | **No carpet material ownership** | Movement uses resulting floor/opening semantics; fall outcome separate | `WorldRenderer.replaceHoleFloor` / indexed mesh | May occur over Ordinary | May occur over Pillar | May occur over Arch | Blackout can overlay independently | Owns removed area | Underlying floor Condition persists | SOURCE-DERIVED square pits + INTERPRETATION/ORIGINAL exact lattice | Explicit |
| CV-H1 VOID / SIDES / DEPTH | CV-H1 presentation target | Hole patch semantics | Existing hole aperture | `level0RegionPresentation.ts` depth bands | `level0.cvh1.default` final PAU material | None | Depth bands / occluder | Same Carver presentation | Same | Same | Lighting may alter visibility, not identity | CV-H1 owns | Floor Condition does not transfer ownership | SOURCE-DERIVED unreadable/deep pit + INTERPRETATION/ORIGINAL bands/colours | Explicit; staged renderer ownership can consolidate |
| LIGHTING | M-F1 fixture-owned physical light law + Level 0 atmosphere | Light groups generated from geometry | Fixture existence/clearance; Blackout suppresses | M-F1 panel + scene atmosphere | Panel PAU target; light colour/runtime parameters code-owned | Fixture runtime + render settings runtime | Omnis / shadows / scene fog/ambient | Normal | Same baseline fixture family | Same with Arch visible panel colour | Local fixture groups absent; scene darkens | Hole does not own lights | C-B1 modifies | SOURCE-DERIVED lighting identity + ORIGINAL exact falloff/values | Mostly explicit; allocator cap conflicts |
| BLACKOUT LIGHTING OWNERSHIP | C-B1 Condition | `sampleGen3Environment` + light generation | Blackout strength | Scene ambient/fog plus fixture absence | Underlying Region materials unchanged | `renderSettingsRuntime.ts` + `Ambience.ts` | Scene and existing fixture system | N/A overlay | N/A overlay | N/A overlay | Owns darkness/local fluorescent absence, not architecture | Can coexist | C-B1 | SOURCE-DERIVED local-off/no-buzz/external cues + ORIGINAL curves | Explicit in active runtime |
| AUDIO WHERE REGION IDENTITY AFFECTS IT | Level 0 ambience + C-B1 Condition | Light field/Blackout environment | Journey lifecycle + light/Condition state | Procedural ambience | N/A | `audio/Ambience.ts` | Web Audio graph | Fluorescent hum follows light field | Same shared hum law | Same shared hum law | Local hum falls away; external escape cue can contribute | No direct ownership | C-B1 modifies | SOURCE-DERIVED buzz/Blackout silence + ORIGINAL synthesis | Explicit; Region itself is not separately branching audio |
| INTERACTIONS / PROPS IF REGION-DEPENDENT | Feature/interaction semantic policy | Arch props in topology build; generic loot elsewhere | Arch bucket/paint-can check is generation-owned; outlet check is renderer-owned | Feature presenters / outlet presenter | Feature/material definitions | Outlet runtime for inspect action | Feature meshes/interactions | Generic sparse Features + outlet if gate permits | No Arch bucket/can; outlet absent by gate | Bucket/paint-can explicitly Arch-only; outlet absent by gate | No unrelated architectural ownership | Hole filters solid props | None | Arch props INTERPRETATION/PROJECT-NOCLIP-ORIGINAL; outlet ORIGINAL | Arch prop check explicit KEEP; outlet gate ambiguous |
| MATERIAL / ASSET RESOLUTION | Semantic target -> PAU Representation -> NAL Asset | World emits Material IDs only | Semantic surface role | PAU/material runtime + final presenters | Structured `level0-materials.json`; NAL registry | Asset preload / Studio refresh | PlayCanvas material application | Shared targets + Ordinary parameters | Shared targets + Pillar parameters | Shared M-W1 normal walls; M-A1 A-A1; Arch carpet/ceiling/panel params | Blackout changes lighting, not material identity | CV-H1 depth owns only hole material; floor remains M-C1 | Conditions should modify M-C1 without becoming a new material identity | Mixed by target; NAL source chain includes UNKNOWN/REVIEW entries | Explicit PAU policy |

# Ordinary Findings

## L0-OWN-001

**CONCEPT:** Shared M-W1 wallpaper identity and misleading `ordinaryWallpaper*` ownership naming.

**CURRENT BEHAVIOR:** Ordinary walls use M-W1 A/B/C wallpaper. The same implementation also finishes Pillar Field walls, P-A1 columns, sparse Ordinary columns and normal Arch Room walls. Arch normal-wall presentation can receive an Arch brightness treatment; A-A1 structural surfaces are excluded and delegated to M-A1.

**CURRENT OWNER:** Semantic material identity: M-W1 / PAU. Deterministic family rules and runtime application: `src/renderer/ordinaryWallpaperRules.ts` and `src/renderer/ordinaryWallpaperPresentation.ts`.

**EVIDENCE:** `docs/PRESENTATION_ARCHITECTURE.md` explicitly lists Ordinary, Pillar, sparse-column and normal Arch surfaces under one M-W1 identity; `docs/CONTENT_PROVENANCE.md` states the same canonical identity law; `tests/dev9-1-wallpaper-foundation.test.mjs` asserts Pillar and Arch handling and A-A1 delegation.

**INTENTIONAL OR INCIDENTAL:** INTENTIONAL shared behavior; INCIDENTAL naming/placement under `ordinary*` modules.

**PROVENANCE CLASS:** SOURCE-DERIVED material identity + PROJECT-NOCLIP-ORIGINAL deterministic family selection/treatment. NAL source-asset origin entries retain existing REVIEW status.

**CLEANUP CLASS:** CLEAN

**BEHAVIOR CHANGE REQUIRED?** NO

**USER DECISION REQUIRED?** NO

**RECOMMENDED FUTURE OWNER:** A neutrally named Level 0 M-W1 presentation owner. Keep Region treatment as a parameter of the shared identity rather than splitting wallpaper identities by Region.

## L0-OWN-002

**CONCEPT:** Casing/baseboard/raceway existence and Region eligibility.

**CURRENT BEHAVIOR:** Deterministic casing placement has no Region parameter, but `ordinaryCasingMaterialPresentation.ts` returns immediately unless `regionId === 'ordinary-level-0'`. Therefore Pillar and Arch currently have no casing because of renderer presentation control flow.

**CURRENT OWNER:** Placement mechanics currently live in renderer-side rules; Region eligibility lives only in the casing renderer early-return; material appearance lives in PAU.

**EVIDENCE:** `ordinaryWallpaperRules.ts` defines generic deterministic casing frequency/span; `ordinaryCasingMaterialPresentation.ts` imposes Ordinary-only eligibility; `docs/PRESENTATION_ARCHITECTURE.md` says casing placement/frequency/topology should remain code/world-owned; REF-L0-001 visibly supports shallow Ordinary base trim, while Pillar/Arch references do not establish an explicit presence/absence rule.

**INTENTIONAL OR INCIDENTAL:** AMBIGUOUS

**PROVENANCE CLASS:** SOURCE-DERIVED for Ordinary shallow trim; UNKNOWN / REVIEW REQUIRED for Pillar/Arch eligibility and exact cross-Region rule.

**CLEANUP CLASS:** INVESTIGATE LATER

**BEHAVIOR CHANGE REQUIRED?** UNKNOWN

**USER DECISION REQUIRED?** YES — decide whether casing is (a) Ordinary-only, (b) shared on M-W1-bearing Level 0 walls where geometrically valid, or (c) governed by another explicit Region/surface rule. The audit provides no evidence for adding casing to another Region.

**RECOMMENDED FUTURE OWNER:** After the product decision, a small world/semantic wall-detail eligibility owner should decide whether casing exists. The renderer/material presenter should only realize already-eligible casing.

## L0-OWN-003

**CONCEPT:** Outlet / wall-detail Region eligibility and interaction ownership.

**CURRENT BEHAVIOR:** Outlet position/frequency is deterministic and generic, but `ordinaryWallpaperPresentation.ts` skips outlet creation for every non-Ordinary Region. Ordinary outlets also register an inert `[E] Inspect outlet` interaction through `outletInteractionRuntime.ts`.

**CURRENT OWNER:** Placement rule: renderer-side wallpaper rules. Region eligibility: renderer presentation loop. Material: PAU outlet target. Interaction behavior: outlet runtime patch.

**EVIDENCE:** `ordinaryWallpaperRules.ts` contains no Region argument for outlet placement; `ordinaryWallpaperPresentation.ts` checks for Ordinary before creating outlets; `PRESENTATION_ARCHITECTURE.md` says outlet placement/frequency should be code/world-owned; no Level 0 reference or provenance entry establishes a Pillar/Arch presence/absence rule.

**INTENTIONAL OR INCIDENTAL:** AMBIGUOUS

**PROVENANCE CLASS:** PROJECT-NOCLIP-ORIGINAL outlet detail; UNKNOWN / REVIEW REQUIRED Region eligibility.

**CLEANUP CLASS:** INVESTIGATE LATER

**BEHAVIOR CHANGE REQUIRED?** UNKNOWN

**USER DECISION REQUIRED?** YES — outlet presence/absence in Ordinary/Pillar/Arch must be explicitly decided before ownership is moved.

**RECOMMENDED FUTURE OWNER:** A world/semantic wall-detail eligibility owner; outlet presentation and interaction code should consume that result rather than infer Region policy.

# Pillar Field Findings

## L0-OWN-004

**CONCEPT:** Pillar Field / P-A1 world ownership versus shared Level 0 presentation.

**CURRENT BEHAVIOR:** Pillar influence/depth changes P-A1 density and can thin the common wall network in deeper territory. P-A1 columns are floor-to-ceiling, avoid topology walls/routes and carry `level-0-wallpaper`. Gen3 deliberately passes `baseline` to fixture generation, so Pillar retains ordinary ceiling/fixture grammar instead of reviving a legacy Pillar lighting template.

**CURRENT OWNER:** Region influence/dimensions: `gen3ArchitectureCore.ts`; topology/P-A1 generation: `gen3SpaceTopologyBuild.ts`; M-W1 column finish: shared wallpaper presenter; ceiling/M-F1: shared Level 0 surface/lighting owners.

**EVIDENCE:** `WORLD.md` Pillar law; REF-L0-002; `tests/generation-3.test.mjs` asserts wallpaper-clad piers within the common wall network; `generator.ts` sets Gen3 lighting zone to `baseline` outside Manila.

**INTENTIONAL OR INCIDENTAL:** INTENTIONAL

**PROVENANCE CLASS:** SOURCE-DERIVED pillar/wallpaper/ceiling/fixture grammar + INTERPRETATION / PROJECT-NOCLIP-ORIGINAL continuous influence, exact lattice and density.

**CLEANUP CLASS:** KEEP

**BEHAVIOR CHANGE REQUIRED?** NO

**USER DECISION REQUIRED?** NO, except the separate casing/outlet questions.

**RECOMMENDED FUTURE OWNER:** Keep P-A1 eligibility/placement in world topology and keep M-W1/M-CE1/M-F1 presentation shared.

## L0-OWN-005

**CONCEPT:** Pillar Field casing/outlet absence.

**CURRENT BEHAVIOR:** Pillar geometry, wallpaper, floor and fixture rules are explicitly owned, but casing and outlets disappear only because the two presentation modules reject non-Ordinary Regions.

**CURRENT OWNER:** Renderer gate, not Pillar world policy.

**EVIDENCE:** Same code evidence as L0-OWN-002/003; Pillar reference material establishes wallpaper-clad pillars and ordinary ceiling/fixture grammar but does not establish a no-casing/no-outlet rule.

**INTENTIONAL OR INCIDENTAL:** AMBIGUOUS

**PROVENANCE CLASS:** UNKNOWN / REVIEW REQUIRED for eligibility.

**CLEANUP CLASS:** INVESTIGATE LATER

**BEHAVIOR CHANGE REQUIRED?** UNKNOWN

**USER DECISION REQUIRED?** YES — resolved jointly with L0-OWN-002/003, not as an independent inference that Pillar must gain either feature.

**RECOMMENDED FUTURE OWNER:** Explicit wall-detail eligibility policy after user decision.

# Arch Rooms / A-A1 Findings

## L0-OWN-006

**CONCEPT:** A-A1 semantic topology versus visible presentation ownership.

**CURRENT BEHAVIOR:** World topology emits semantic A-A1 lower/header/pier/termination pieces and owns portal/routes. `level0RegionPresentation.ts` then treats the accepted curved intrados, upper frame mass and visible lower-panel assembly as render representation: semantic divider meshes are hidden and a world-space frame is reconstructed across loaded Cells.

**CURRENT OWNER:** Semantic divider/topology: `gen3SpaceTopologyDomain.ts` and `gen3SpaceTopologyBuild.ts`; accepted visible A-A1 frame: `level0RegionPresentation.ts`; final surface finish: M-A1 in `finalLevel0MaterialPresentation.ts`.

**EVIDENCE:** `gen3SpaceTopologyBuild.ts` explicitly states curved intrados are render-only; `tests/arch-streaming-change.test.mjs` locks accepted A-A1 proportions, curve handoffs and single-surface upper mass; WORLD/REF-L0-007 lock the continuous pale divider/lower-panel/header/opening grammar.

**INTENTIONAL OR INCIDENTAL:** INTENTIONAL semantic/presentation split.

**PROVENANCE CLASS:** SOURCE-DERIVED silhouette/continuous-divider grammar + INTERPRETATION / PROJECT-NOCLIP-ORIGINAL exact dimensions and reconstructed curve implementation.

**CLEANUP CLASS:** KEEP

**BEHAVIOR CHANGE REQUIRED?** NO

**USER DECISION REQUIRED?** NO

**RECOMMENDED FUTURE OWNER:** Preserve world-owned semantic routes/supports and presentation-owned render geometry. Consolidation should not move topology into renderer or visual mesh into world truth unnecessarily.

## L0-OWN-007

**CONCEPT:** A-A1 collision correction and reconstruction stack.

**CURRENT BEHAVIOR:** Base Cell rendering creates semantic wall meshes/colliders; Level 0 surface presentation filters collision; Region presentation hides/rebuilds visible A-A1; `archDividerRuntimeCorrection.ts` removes inappropriate semantic collision and reconstructs lower-panel collision from visible frame entities; final material ownership then runs again after queued Arch reconstruction.

**CURRENT OWNER:** Split among `level0SurfacePresentation.ts`, `level0RegionPresentation.ts`, `archDividerRuntimeCorrection.ts`, `finalLevel0MaterialPresentation.ts` and install order in `StaticWorldBatching.ts` / `main.ts`.

**EVIDENCE:** The install chain monkey-patches `WorldRenderer.loadCell`; `archDividerRuntimeCorrection.ts` classifies structural roles, filters colliders and creates visible-panel colliders; final materials use a double microtask to converge after reconstruction.

**INTENTIONAL OR INCIDENTAL:** INCIDENTAL architecture around intentional accepted behavior.

**PROVENANCE CLASS:** PROJECT-NOCLIP-ORIGINAL runtime implementation of SOURCE-DERIVED/INTERPRETATION A-A1 presentation.

**CLEANUP CLASS:** CONSOLIDATE

**BEHAVIOR CHANGE REQUIRED?** NO — the accepted A-A1 geometry/collision result must remain invariant during cleanup.

**USER DECISION REQUIRED?** NO for consolidation; any geometry/product change would require separate approval.

**RECOMMENDED FUTURE OWNER:** One explicit A-A1 representation lifecycle consuming world semantic divider data, with collision derived from semantic collision intent rather than reconstructed renderer entity names wherever possible.

## L0-OWN-008

**CONCEPT:** A-A1 structural-role inference and overloaded `arch-pale-wallpaper` MaterialId.

**CURRENT BEHAVIOR:** `arch-pale-wallpaper` is used both on A-A1 semantic structural pieces and on pale normal Arch walls. Presentation code repeatedly infers whether a wall is truly A-A1 using MaterialId plus dimensions/position. M-W1 must inspect that inferred role to avoid painting A-A1; correction code repeats similar classification.

**CURRENT OWNER:** Semantic role is implicit in generated geometry/material rather than explicit in the descriptor contract.

**EVIDENCE:** `gen3SpaceTopologyDomain.ts` may assign `arch-pale-wallpaper` to non-A-A1 walls; `gen3SpaceTopologyBuild.ts` also assigns it to A-A1; `archDividerRuntimeCorrection.ts` and wallpaper/Region presentation classify roles from geometry/material.

**INTENTIONAL OR INCIDENTAL:** INCIDENTAL

**PROVENANCE CLASS:** PROJECT-NOCLIP-ORIGINAL implementation naming/contract.

**CLEANUP CLASS:** CONSOLIDATE

**BEHAVIOR CHANGE REQUIRED?** NO

**USER DECISION REQUIRED?** NO

**RECOMMENDED FUTURE OWNER:** Explicit A-A1 semantic role/owner metadata in world/presentation contract, with MaterialId representing surface identity rather than doubling as a structural-type discriminator.

## L0-OWN-009

**CONCEPT:** A-A1 glass/frames/panels and visibility-aperture semantics.

**CURRENT BEHAVIOR:** Frames/curves/lower panels are explicit visible A-A1 presentation. No glass signature is present or required. Traversable/visible apertures come from topology portals/openings and accepted divider silhouette; render-only curves do not independently create navigation semantics.

**CURRENT OWNER:** Aperture/topology: world; visible frame/panel geometry: A-A1 presentation; material: M-A1.

**EVIDENCE:** REF-L0-007 and Issue #37 explicitly warn against adding glass as a signature without evidence; topology owns portals; A-A1 render code owns visible curves/panels.

**INTENTIONAL OR INCIDENTAL:** INTENTIONAL

**PROVENANCE CLASS:** SOURCE-DERIVED frames/panels/openings; UNKNOWN / unsupported for required glass.

**CLEANUP CLASS:** KEEP

**BEHAVIOR CHANGE REQUIRED?** NO

**USER DECISION REQUIRED?** NO — absence of evidence is not permission to add glass.

**RECOMMENDED FUTURE OWNER:** Keep topology aperture semantics in world; keep frames/panels in A-A1 presentation; retain no-glass default until evidence/design explicitly changes it.

# CV-H1 Findings

## L0-OWN-010

**CONCEPT:** CV-H1 final floor ownership.

**CURRENT BEHAVIOR:** A Hole Cell replaces the full floor mesh with one indexed surface whose triangles exclude semantic Hole rectangles. The mesh owns only topology and a stable UV basis. It initially inherits the Region floor material, then the final M-C1 owner reapplies canonical Region carpet with identical world frequency/phase. Hole and non-Hole cells resolve the same canonical Region carpet treatment.

**CURRENT OWNER:** Apertures: CV-H1 world Carver; floor material: M-C1 + Region/Condition truth; floor topology subtraction: `WorldRenderer`; final carpet: `finalLevel0MaterialPresentation.ts`.

**EVIDENCE:** `tests/cvh1-hole-seam.test.mjs` explicitly asserts no CV-H1 material-tiling ownership, exact M-C1 UV equivalence, Region-specific floor preservation across Ordinary/Pillar/Arch and Condition preservation.

**INTENTIONAL OR INCIDENTAL:** INTENTIONAL

**PROVENANCE CLASS:** SOURCE-DERIVED square pits/surviving Level 0 finish + INTERPRETATION / PROJECT-NOCLIP-ORIGINAL indexed-mesh and world-phase implementation.

**CLEANUP CLASS:** KEEP

**BEHAVIOR CHANGE REQUIRED?** NO

**USER DECISION REQUIRED?** NO

**RECOMMENDED FUTURE OWNER:** Preserve the law exactly: `FINAL FLOOR = REGION/CONDITION M-C1 SURFACE - CV-H1 APERTURE`.

## L0-OWN-011

**CONCEPT:** CV-H1 void/side/depth presentation staging.

**CURRENT BEHAVIOR:** Base Cell/Hole visuals are created, `WorldRenderer` replaces the floor and adds provisional Hole geometry, `level0RegionPresentation.ts` destroys/rebuilds depth bands and occluder, and `finalLevel0MaterialPresentation.ts` applies canonical CV-H1 depth colours.

**CURRENT OWNER:** Carver semantics: world; depth geometry: Region presentation module; final colours: PAU CV-H1 target.

**EVIDENCE:** `WorldRenderer.ts`, `level0RegionPresentation.ts`, `finalLevel0MaterialPresentation.ts`, `tests/arch-streaming-change.test.mjs` depth-band assertions.

**INTENTIONAL OR INCIDENTAL:** INTENTIONAL result with INCIDENTAL staged renderer ownership.

**PROVENANCE CLASS:** SOURCE-DERIVED unreadable black depth / limited rim readability + INTERPRETATION / PROJECT-NOCLIP-ORIGINAL depth-band geometry and colours.

**CLEANUP CLASS:** CONSOLIDATE

**BEHAVIOR CHANGE REQUIRED?** NO

**USER DECISION REQUIRED?** NO

**RECOMMENDED FUTURE OWNER:** One CV-H1 presentation adapter should own side/depth mesh realization; PAU remains the final material owner. Do not move carpet authority into it.

# C-B1 Blackout Findings

## L0-OWN-012

**CONCEPT:** Blackout as Condition over Region architecture/material identity.

**CURRENT BEHAVIOR:** `sampleGen3Environment` resolves Region and Blackout strength independently. `generateCell` preserves identical walls/props when Blackout changes and produces no local light groups in Blackout. Active render settings change ambient/fog/clear state; ambience suppresses local hum and can use the continuous external escape cue. Underlying Ordinary/Pillar/Arch material identity remains unchanged.

**CURRENT OWNER:** Condition geography/state: world; fixture absence: world lighting generation; atmosphere: render settings runtime; audio: `Ambience.ts`.

**EVIDENCE:** `WORLD.md`, REF-L0-004, `tests/generation-3.test.mjs` domain-separation test, `tests/dev9-4-blackout-black.test.mjs`.

**INTENTIONAL OR INCIDENTAL:** INTENTIONAL

**PROVENANCE CLASS:** SOURCE-DERIVED recognizable underlying Level 0, local fluorescent absence/no buzz/external cues + PROJECT-NOCLIP-ORIGINAL exact strength/fog/audio curves.

**CLEANUP CLASS:** KEEP

**BEHAVIOR CHANGE REQUIRED?** NO

**USER DECISION REQUIRED?** NO

**RECOMMENDED FUTURE OWNER:** Keep C-B1 as a Condition modifier. It must never become an architecture/material Region owner.

## L0-OWN-013

**CONCEPT:** Masked legacy Blackout runtime implementation.

**CURRENT BEHAVIOR:** `ProjectNoclipGame.ts` still contains older direct setup/Blackout logic and imports `app/blackoutRendering.ts`, including a historical guide-light concept. Before game construction, `installRenderSettingsRuntime()` replaces the relevant prototype methods; current tests assert the active runtime has no synthetic Blackout guide light.

**CURRENT OWNER:** Active policy: `renderer/renderSettingsRuntime.ts` / `renderer/renderSettings.ts`. Historical masked implementation: `app/ProjectNoclipGame.ts` + `app/blackoutRendering.ts`.

**EVIDENCE:** `main.ts` install order, render-settings prototype replacement, and `tests/dev9-4-blackout-black.test.mjs` source assertions.

**INTENTIONAL OR INCIDENTAL:** INCIDENTAL legacy layering.

**PROVENANCE CLASS:** PROJECT-NOCLIP-ORIGINAL runtime history.

**CLEANUP CLASS:** LEGACY

**BEHAVIOR CHANGE REQUIRED?** NO if removal is proven to be fully masked and tests preserve current active behavior.

**USER DECISION REQUIRED?** NO for a future verified dead-path cleanup.

**RECOMMENDED FUTURE OWNER:** One active Blackout atmosphere/runtime path under the renderer/runtime boundary; remove or retire superseded method bodies only after direct call/reachability verification.

## L0-OWN-014

**CONCEPT:** M-F1 physical-light participation policy.

**CURRENT BEHAVIOR:** Each generated fixture has a corresponding runtime Omni entity, but active realtime fixtures are selected by player distance and capped by Render Distance at 32/64/96/128. This makes actual physical-light participation player-nearest within an otherwise fixture-owned system.

**CURRENT OWNER:** Selection/cap: `fixtureLighting.ts` + `renderSettings.ts`; generated fixture identity: `world/lighting.ts`.

**EVIDENCE:** `WORLD.md` explicitly states fixture real lights must not be reduced to a player-nearest allocator/arbitrary cap; `fixtureLighting.ts` sorts by player distance and slices to a ceiling; `renderSettings.ts` defines the per-tier ceiling.

**INTENTIONAL OR INCIDENTAL:** AMBIGUOUS relative to accepted policy: the optimization is deliberate code, but it conflicts with the authoritative world/presentation law.

**PROVENANCE CLASS:** PROJECT-NOCLIP-ORIGINAL runtime optimization layered over SOURCE-DERIVED M-F1 identity.

**CLEANUP CLASS:** INVESTIGATE LATER

**BEHAVIOR CHANGE REQUIRED?** YES to make runtime conform to the currently written world law, unless that law is separately revised through an explicit product/architecture decision.

**USER DECISION REQUIRED?** NO to record the conflict. A future CHANGE must explicitly surface the performance/visual tradeoff before altering either code or policy.

**RECOMMENDED FUTURE OWNER:** Fixture participation policy should be derived from visibility/render participation while preserving fixture-owned light identity, not from a nearest-N semantic substitution.

# Shared Material Findings

## L0-OWN-015

**CONCEPT:** M-C1 Region treatment is repeated across three presentation stages.

**CURRENT BEHAVIOR:** `level0SurfacePresentation.ts` chooses a Region floor material; `level0RegionPresentation.ts` clones/recolours floor entities by Region; `finalLevel0MaterialPresentation.ts` declares itself the final canonical M-C1 owner and again resolves Region tint/gloss/world-phase presentation.

**CURRENT OWNER:** Final canonical owner: PAU M-C1 / `finalLevel0MaterialPresentation.ts`. Earlier owners are provisional presentation stages.

**EVIDENCE:** `PRESENTATION_ARCHITECTURE.md` explicitly says final material ownership exists for reconstructed Region geometry; source modules independently branch on Region for carpet.

**INTENTIONAL OR INCIDENTAL:** INCIDENTAL duplication around an intentional final-owner design.

**PROVENANCE CLASS:** SOURCE-DERIVED carpet identity/Region moisture distinctions + INTERPRETATION / PROJECT-NOCLIP-ORIGINAL exact tints/gloss/UV implementation.

**CLEANUP CLASS:** CONSOLIDATE

**BEHAVIOR CHANGE REQUIRED?** NO

**USER DECISION REQUIRED?** NO

**RECOMMENDED FUTURE OWNER:** One canonical M-C1 resolver/material application path. Earlier stages should supply geometry/base material handles without independently deciding final Region treatment.

## L0-OWN-016

**CONCEPT:** Floor Condition presentation is coupled to Region instead of independently resolved.

**CURRENT BEHAVIOR:** World generation emits `damp-carpet`, `deep-wet-carpet` or `shallow-dry-carpet`. `resolveCanonicalLevel0CarpetPresentation()` records the `conditionSignature` in its return value/cache key, but colour/gloss is selected only from `regionId`. No dedicated Condition modifier changes M-C1 parameters.

**CURRENT OWNER:** Semantic Condition: world. Visible floor treatment: currently Region parameters in M-C1.

**EVIDENCE:** `gen3.ts` emits floor Condition IDs; `finalLevel0MaterialPresentation.ts` selects tint/gloss by Region only; `level0-materials.json` exposes Region tint fields but no Condition-specific floor modifier fields; CV-H1 tests prove Condition identity is preserved but do not establish a distinct visual delta.

**INTENTIONAL OR INCIDENTAL:** AMBIGUOUS implementation coupling, because current Region and floor Condition are correlated by generation.

**PROVENANCE CLASS:** SOURCE-DERIVED wet/dry distinctions + INTERPRETATION / PROJECT-NOCLIP-ORIGINAL exact visual treatment.

**CLEANUP CLASS:** CONSOLIDATE

**BEHAVIOR CHANGE REQUIRED?** NO for ownership separation if the present appearance is reproduced exactly; YES only if a new visual delta is introduced.

**USER DECISION REQUIRED?** NO for semantic ownership cleanup; YES before inventing new Condition appearance beyond accepted evidence/current output.

**RECOMMENDED FUTURE OWNER:** M-C1 base identity -> Region treatment -> explicit floor-Condition modifier. CV-H1 should continue consuming the final result unchanged.

## L0-OWN-017

**CONCEPT:** `arch-pale-wallpaper` naming versus actual M-A1 structural finish.

**CURRENT BEHAVIOR:** The MaterialId name suggests wallpaper, but A-A1 is explicitly a pale structural finish and is excluded from M-W1. The same ID can also occur on normal Arch walls that still resolve through M-W1, forcing structural-role inference.

**CURRENT OWNER:** World MaterialId plus presentation role inference.

**EVIDENCE:** PAU defines separate M-W1 and M-A1 targets and explicitly excludes A-A1 from wallpaper; generation and presentation use `arch-pale-wallpaper` in both structural and non-structural contexts.

**INTENTIONAL OR INCIDENTAL:** INCIDENTAL naming/semantic overload.

**PROVENANCE CLASS:** PROJECT-NOCLIP-ORIGINAL identifier design.

**CLEANUP CLASS:** CLEAN

**BEHAVIOR CHANGE REQUIRED?** NO

**USER DECISION REQUIRED?** NO

**RECOMMENDED FUTURE OWNER:** Surface IDs should express surface identity; A-A1 structural identity should be explicit independently. Any rename/migration must preserve deterministic/save contracts where Material IDs are persisted or externally addressed.

# Incidental-vs-Intentional Behaviour

| Behavior | Classification | Reason |
|---|---|---|
| Ordinary/Pillar/normal-Arch sharing M-W1 | INTENTIONAL | Explicit PAU/provenance law |
| Arch normal-wall brightness lift | INTENTIONAL | Explicit M-W1 Region treatment parameter |
| A-A1 exclusion from M-W1 and use of M-A1 | INTENTIONAL | Explicit PAU/world law |
| Casing Ordinary-only | AMBIGUOUS | Source supports Ordinary trim, but no accepted policy supports the cross-Region exclusion; renderer early-return supplies the distinction |
| Outlets Ordinary-only | AMBIGUOUS | No accepted Region eligibility policy found; renderer loop supplies the distinction |
| Pillar retaining common Level 0 wall network | INTENTIONAL | WORLD + generation tests |
| Pillar using shared Level 0 wallpaper | INTENTIONAL | WORLD/REF/provenance/PAU |
| Pillar using ordinary Gen3 ceiling/fixture grammar | INTENTIONAL | WORLD + `generator.ts` baseline lighting zone |
| Arch-only bucket/paint-can Features | INTENTIONAL | Generation owns one local eligibility check; test explicitly proves exclusivity |
| A-A1 visible reconstruction | INTENTIONAL | Accepted presentation architecture |
| A-A1 multiple patch/correction stages | INCIDENTAL | Result is accepted; lifecycle coupling is not a world policy |
| CV-H1 subtracting floor while preserving M-C1 | INTENTIONAL | Explicit tests and provenance |
| CV-H1 multiple provisional depth/material stages | INCIDENTAL | Final ownership is explicit but staged |
| Blackout leaving Region architecture unchanged | INTENTIONAL | Condition law + deterministic test |
| Blackout local fixture-group absence | INTENTIONAL | Condition law |
| Masked old Blackout guide-light/runtime path remaining in source | INCIDENTAL / LEGACY | Active runtime replaces it and tests reject synthetic guide light |
| Floor Region tint being applied in multiple modules | INCIDENTAL | Final M-C1 owner is already canonical |
| Floor Condition identity affecting cache signature but not independent values | AMBIGUOUS | Semantic Conditions are explicit but presentation is encoded through correlated Region treatment |
| Player-nearest capped M-F1 realtime light participation | POLICY CONFLICT | Deliberate optimization conflicts with explicit `WORLD.md` fixture-participation law |

# Scattered Region Policy

The audit does **not** recommend a generic "Region policy service". The repository rule is to consolidate only when multiple consumers independently decide the same semantic policy.

### KEEP — one local check is simplest and owns a real policy

- `gen3SpaceTopologyBuild.ts`: Arch-only bucket/paint-can environmental Feature eligibility. It is a generation-owned existence decision, has one direct consumer, and tests explicitly lock its Region exclusivity.
- `generator.ts`: Region-to-diagnostic `roomArchetype` label selection. In Gen3 this is descriptor/diagnostic compatibility rather than architecture ownership; it does not create the Region.
- M-CE1 and M-F1 Arch-vs-shared visible material treatment where the material resolver is the only consumer. A local branch inside the material owner is appropriate.
- Blackout suppression in `world/lighting.ts`. This is an explicit Condition-owned eligibility rule for local fluorescent generation.

### CONSOLIDATE — repeated modules are deciding or re-deciding the same policy

- **M-C1 Region floor treatment:** `level0SurfacePresentation.ts`, `level0RegionPresentation.ts` and `finalLevel0MaterialPresentation.ts` all branch on Region. Final PAU M-C1 should become the sole final material policy owner.
- **A-A1 structural role:** Region presentation, wallpaper presentation, surface/collision logic and Arch runtime correction infer structural role from the same material/dimension evidence. An explicit semantic/presentation role would remove repeated inference.
- **A-A1 lifecycle:** Region reconstruction, collision correction and final materials independently patch `WorldRenderer.loadCell` and coordinate via queued work. One explicit reconstruction lifecycle should expose stable hooks/results to material/collision owners.
- **CV-H1 presentation lifecycle:** base Hole visuals, floor replacement, depth replacement and final material application are sequential correction stages. Preserve the semantic boundaries but remove redundant provisional visuals/material decisions.
- **Casing + outlet Region eligibility, but only after the product decision:** these are two separate wall-detail presenters independently enforcing the same Ordinary-only distinction with no accepted policy owner. If the user decides a shared eligibility law exists, centralize that small eligibility decision; do not invent the abstraction before the decision.

### CLEAN / LEGACY

- Masked historical Blackout setup/render logic underneath `installRenderSettingsRuntime()` should be reachability-verified and then retired in a future cleanup if truly unused.
- Narrow `ordinaryWallpaperPresentation` naming should be cleaned so shared M-W1 ownership is legible.
- The overloaded `arch-pale-wallpaper` identifier/role relationship should be disentangled without changing appearance or topology.

# Provenance Questions

1. **Casing Region eligibility:** REF-L0-001 visibly supports shallow Ordinary base trim. No reviewed source entry found in the current Level 0 pack establishes whether equivalent trim is required, optional or absent in Pillar/Arch. Classification: `UNKNOWN / REVIEW REQUIRED` for cross-Region eligibility.
2. **Outlet presence:** no current reviewed Level 0 source/provenance rule was found establishing outlets as source-derived, nor any Ordinary/Pillar/Arch eligibility law. Treat current outlet system as `PROJECT-NOCLIP-ORIGINAL` unless a ledger entry says otherwise; cross-Region eligibility remains `UNKNOWN / REVIEW REQUIRED`.
3. **Wallpaper asset origin chain:** the provenance ledger already records review limitations for the supplied/NAL wallpaper image origin chain. This audit does not modify that status. The semantic M-W1 identity and cross-Region continuity are nevertheless explicitly accepted in current governance.
4. **A-A1 exact dimensions:** source supports the continuous pale divider, repeated arch openings, lower band and header. Exact pitch/shoulder/curve dimensions are Project Noclip interpretation/original implementation and should not be described as source-mandated.
5. **A-A1 glass:** current evidence does not establish glass as a signature requirement. Do not add or canonize it from label inference.
6. **P-A1 exact lattice/density:** source supports broad wallpaper-clad floor-to-ceiling pillars/piers and ordinary Level 0 continuity. Exact 7.2 m spacing, density gradients, nudge/clearance values and topology integration are Project Noclip implementation choices.
7. **Floor Conditions:** source supports damp Ordinary carpet, deep/wet Arch treatment and shallower/drier Pillar treatment. The exact division between Region parameter and Condition parameter is an implementation architecture choice; ownership should reflect the semantic Condition without inventing unsupported new visual details.
8. **CV-H1 depth:** source supports pitch-black pits with limited upper/rim readability and no visible destination. Exact depth-band dimensions/colours are Project Noclip interpretation/original presentation.
9. **Blackout curves:** source supports underlying recognizable Level 0, local lights/buzz absent and external escape cues. Exact strength thresholds, fog curves, ambient floor and audio gain curves are Project Noclip implementation choices.
10. **M-F1 cap:** the realtime-light cap is a Project Noclip performance implementation, not source-derived content. Its conflict is architectural/policy, not provenance.

Discrepancies above should feed the later provenance audit/synthesis stage. The canonical provenance ledger is intentionally unchanged on this branch.

# Decisions Requiring User Approval

## Decision D1 — Casing eligibility

**Question:** Is Level 0 casing/baseboard/raceway intentionally Ordinary-only, or should eligibility follow another explicit Level 0 wall/Region rule?

Current evidence is insufficient. The audit does **not** recommend adding casing to Pillar or Arch. It recommends deciding the semantic rule first, then moving eligibility out of renderer control flow.

Options that remain open for a later product decision include:

- Ordinary-only casing as explicit accepted policy;
- casing on wallpaper-bearing Level 0 walls across Regions when topology permits;
- a narrower Region/surface rule not inferable from current evidence.

## Decision D2 — Outlet / wall-detail eligibility

**Question:** Are outlets intentionally Ordinary-only, shared across some/all Level 0 wallpaper-bearing walls, or governed by another Region/surface rule?

Current code cannot answer this: the deterministic outlet rule is generic and the Ordinary-only distinction is a renderer condition. No source/provenance rule found in this audit resolves it. Do not alter spawn behavior until the decision is explicit.

## Decision D3 — Only if floor Condition appearance is expanded

No user decision is required to separate Condition ownership while preserving current pixels. A user decision **is** required before inventing new wet/dry visual deltas, new material effects or other product-visible Condition behavior not already accepted by evidence/current output.

No other ownership cleanup identified here requires a new product decision. In particular, A-A1 geometry, Pillar grammar, CV-H1 floor inheritance and Blackout-as-Condition are already governed by accepted repository policy and should be preserved.

# Candidate Cleanup Seams

Priority here means ownership leverage, not authorization to implement on this audit branch.

1. **High — Establish one final M-C1 floor presentation path.** Remove duplicate Region carpet material decisions from provisional surface/Region stages while preserving exact current output, world phase and CV-H1 inheritance.
2. **High — Make A-A1 semantic role explicit.** Stop using `arch-pale-wallpaper` plus geometry dimensions as a proxy for structural identity across multiple consumers. Preserve IDs/save contracts through any migration.
3. **High — Consolidate A-A1 reconstruction/collision/final-material lifecycle.** Keep world topology and presentation geometry separate, but replace patch-on-patch `loadCell` ordering/microtask convergence with one explicit representation lifecycle and clear collision handoff.
4. **Medium — Consolidate CV-H1 presentation staging.** Keep aperture topology, Region carpet and depth material ownership separate while avoiding create/destroy/recreate provisional visuals.
5. **Medium — Clarify floor Condition modifier ownership.** Resolve M-C1 as base identity -> Region treatment -> Condition modifier, initially reproducing current appearance exactly.
6. **Medium — Rename/re-home shared M-W1 presentation.** Make it obvious that M-W1 serves Ordinary, Pillar/P-A1 and normal Arch walls. This is an ownership/readability cleanup only.
7. **Medium — Resolve D1/D2, then move casing/outlet eligibility upstream.** Do not centralize or change behavior before user approval. Once decided, world/semantic eligibility should be consumed by presentation rather than invented there.
8. **Medium — Verify and remove masked legacy Blackout runtime.** Prove active call paths first; retain current render-settings behavior and tests.
9. **Investigate later — Reconcile M-F1 realtime-light allocation with `WORLD.md`.** This is not a behavior-preserving cleanup: current nearest-N cap conflicts with explicit policy. Treat it as a separate scoped architecture/performance change with visual/performance evidence.
10. **Low — Clean identifier semantics around `arch-pale-wallpaper`.** Separate structural-role naming from surface/material identity after authoritative role ownership exists.

The candidate cleanup target should remain the same accepted Level 0: no casing/outlet additions are implied; no Arch geometry changes are implied; no Pillar density/material changes are implied; no CV-H1 floor/material changes are implied; and no Blackout Region conversion is permitted.
