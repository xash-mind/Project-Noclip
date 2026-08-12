# Project Noclip — Dev.4 Player Audit

Date: 2026-08-12 (Asia/Kolkata)  
Accepted production baseline audited: `v0.3.0-dev.4`  
Primary tracking: Issue #46  
Architecture target: Issue #31  
Fidelity contract: Issue #37 / `WORLD.md`

## Scope

Fresh independent reconciliation of current `main`, accepted dev.4 state, Generation 3 world laws, player observations, current implementation and permanent tests. No product code or deployment changed in this audit.

A fresh independent browser/audio capture could not be obtained from the audit environment: direct production browser access was blocked and the connected Vercel surface could not enumerate the project. Current player-facing observations therefore use the human dev.4 playtest as direct runtime evidence, reconciled against source, implementation and existing verification. Audio quality is explicitly unverified.

## Current reality

Dev.4 is the accepted production baseline and remains technically healthier than dev.3. PR #43 replaced dev.3's accidental wall-defined connectivity with a connectivity-first world-space substrate, added continuous Region modifiers, narrowed Pillar piers by 10%, made Arch spans world-owned, added world-space wall-surface continuity and stabilized realtime fixture ownership.

The first normal human dev.4 playtest now demonstrates that those fixes solved the catastrophic failure mode but did not yet satisfy the real perceptual target. The next work is not another generic density pass; it is a spatial-hierarchy and fidelity correction.

## Player observation reconciliation

### Ordinary Level 0 is better than dev.3

**Confirmed.** Dev.4's actual-collider reachability work is a genuine architectural improvement. The accepted benchmark moved Ordinary from the sealed dev.3 failure toward broadly traversable space. This is meaningful progress and should be preserved.

### Ordinary spaces are too airy; claustrophobic lower tail is missing

**Confirmed / Vision Gap.** The current solver reserves a world connectivity tree and allows additional passages, while wall segment acceptance still removes many complete boundaries. Permanent tests require extremely high reachable-area ratios and broad open-space percentiles, but do not require a controlled frequency of small one-entry rooms, short constrained connectors or compact dead-end pockets.

The result can be globally correct yet emotionally flat. Level 0 should alternate breathing space with local commitment and confinement without returning to sealed-world failure.

### Four-way `+` wall intersections are effectively the default grammar

**Confirmed mechanism / Regression.** Both orthogonal substrate axes are generated independently on the same jittered world lattice. Along-axis neighbor coherence exists, but there is no perpendicular junction classifier or budget. Consequently, when both axes survive around a lattice intersection the generator naturally produces cross-through wall junctions.

A four-way cross is not itself a defect. The defect is distribution: corners, T-junctions, terminations and straight spans need to be the normal architectural vocabulary, with full crosses an intentional minority.

### Pillar Fields lost their Pillar identity

**Confirmed / Regression.** Dev.4 deliberately moved away from dev.3's near-pure lattice, but the implementation order now overweights Ordinary architecture. The wall substrate is generated first; common Pillar influence only mildly suppresses walls; the Pillar pass runs afterward and discards candidates that intersect existing walls or reserved passages.

The permanent Pillar acceptance gate permits 4–12 walls/Cell and only 0.7–2.2 columns/Cell. That proves “mixed” territory but not a convincing Region progression. The player-facing result can therefore satisfy tests while reading primarily as wall rooms with scattered supports.

### Border-to-core Region density map

**Qualified and recommended.** Generation 3 already has the correct foundation: continuous world-space `pillarAffinity`, plus a derived `deepPillar` influence. A second hard Region map or Cell-band system is unnecessary and would pull the design backward.

The missing contract is monotonic *regional depth/intensity*: as Pillar affinity moves away from a blend edge and toward a core, pillar density should rise while ordinary partition density falls. The target progression is:

`Ordinary blend → occasional pillars → mixed wall/pillar rooms → pillar-dominant territory → rare near-pure lattice core`.

This should be measured across affinity/depth bins, not inferred from one average Pillar sample.

### Apply the idea to Holes

**Confirmed with classification correction.** Hole is correctly a Carver, not a Region. Current natural Hole clusters have a deterministic radius and a near-uniform pit lattice inside that radius, apart from fixed skipped rows/columns used as bypass lanes.

The useful version of the idea is a within-cluster depth function: sparse outer pits, increasing density toward the cluster core, while preserving readable deterministic bypass lanes and source-supported close groups/grids.

This is a distinct Carver-risk boundary and should follow the architecture correction unless it remains a small isolated extension.

### Arch Rooms should remain more stable

**Confirmed / Vision aligned.** The promoted source grammar and `WORLD.md` already treat Arch Rooms as comparatively stable, ordered Euclidean architecture. Do not force Pillar-style density escalation onto Arch dividers.

### Arches no longer read like the reference; vertical ends appear missing/floating

**Confirmed as player-facing fidelity regression; implementation nuance matters.** The data generator does create full-height left/right termination pieces and mathematically symmetrical bay diagnostics. However, the current acceptance suite only proves ownership, symmetry rarity, seam reconstruction and non-overlap — not that the rendered result still reads as the reference silhouette.

Current divider passages are subtracted across divider pieces, and divider appearance is relatively sparse. A build can therefore satisfy structural tests while losing the visually complete grammar: repeated readable arch-shaped openings, vertical bay/end structure, continuous lower band, continuous header and full terminations within surrounding pale room walls.

This is both a **source-fidelity failure** and an **implementation-quality failure**, not an intentional game adaptation.

## Source-fidelity check

The promoted Level 0 evidence remains coherent with the player's feedback:

- Ordinary Level 0 uses broad partition planes, offset openings, changing segmentation and empty floor runs; the source does not prescribe globally airy grid intersections.
- Pillar source evidence shows broad rectangular wallpaper-clad floor-to-ceiling piers repeating in rows/lattice through potentially very large spaces. Exact spacing/density algorithm remains an implementation choice.
- Hole evidence shows close square pit groups/grids with readable lanes; a core-density gradient is compatible as an implementation choice so long as the resulting cluster still matches that grammar.
- Arch promoted evidence requires a continuous pale divider/wall with repeated arch-shaped openings, solid lower panels, vertical bays and a continuous header. Normal player-visible floating fragments fail that target.

No new prominent motif is authorized by this audit.

## Test and acceptance gap

Dev.4 demonstrates a repeated project lesson: a technically stronger metric can still encode the wrong perceptual optimum.

Current tests successfully protect world-scale reachability, but they do not yet protect:

- frequency of claustrophobic one-entry rooms / compact constrained spaces;
- wall-junction morphology distribution;
- Pillar density as a monotonic function of regional depth;
- source-like Pillar core presentation;
- complete rendered Arch silhouette against REF-L0-007.

Those must become permanent gates so future Continues cannot simply swing between “sealed” and “airy,” or between “pure pillars” and “almost no pillars.”

## Audio / lighting / renderer note

No new audio complaint was supplied in this player audit. Repository audio lifecycle/light-field tests exist, but perceptual audio could not be genuinely heard in this audit environment and is therefore **unverified**. Do not infer that hum, HVAC/reverb, footsteps or dynamic range are correct.

The prior dev.4 wall-base and light-ownership work remains accepted technical baseline unless new player evidence reopens it; the corrected dedicated wall-base screenshot and some hosted mobile confirmation remain verification debt recorded in accepted state.

## Backlog reconciliation

- **#31 — Generation 3:** remains the correct strategic architecture. Its early migration slices are historical/partially completed; its world-first principle remains authoritative.
- **#37 — Level 0 fidelity:** remains valid and is directly active for the Arch regression and Pillar/Hole fidelity constraints.
- **#11 — sensory/modular umbrella:** stale as a work-selection surface. Multiple items have been implemented or superseded, and its modular-room direction conflicts with current Gen3. Keep it open only until remaining sensory/audio claims are explicitly revalidated or split; do not select it wholesale.
- **#46 — dev.4 player audit:** new active objective. It consolidates the current root causes and acceptance gates so follow-up work does not repeat symptom tuning.

## Recommended next objective

Implement Issue #46 as a bounded Generation 3 architecture correction:

1. introduce deterministic junction morphology and a controlled claustrophobic lower tail while preserving dev.4 connectivity;
2. make Pillar density/wall suppression monotonic with Region depth, preserving rare near-pure cores;
3. restore complete rendered Arch fidelity against the promoted source grammar;
4. leave Hole core-density as the immediate follow-up unless it remains safely isolated inside the same verified release boundary.

Do not change Geometry, save schema, generation version, Manila/Transition rules or source vocabulary merely to accomplish this.

## Tracking outcome

- Issue #46 created for the next objective.
- `STATUS.md` updated to record the completed player audit and current focus.
- `WORLD.md` intentionally unchanged: the audit identifies defects and implementation direction, but no newly shipped world rule exists yet. Promote any materially changed Region/Carver rule only in the implementation PR once verified.
- Project Noclip Notion page, Command Centre snapshot and manual version line synchronized to dev.4 / Issue #46.
