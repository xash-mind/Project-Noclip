# Level 0 Raw Reference Ledger

This is the append-only visual/audio evidence and provenance history for **Level 0**.

Do not manually pre-process references before adding them. A manual **Reference update** run may receive one or any number of reference groups, each with one or many URLs, one or many `Applies to` targets, context notes, and its own `Source tier`. The agent inspects the supplied media, reconciles related evidence against existing references for the affected targets, appends one or more complete provenance entries here, and finalizes every new entry as `PROMOTED`, `EVIDENCE-ONLY`, or `BLOCKED` in the same run.

Materially distinct sources should remain distinct entries. Several URLs may share one entry only when they genuinely represent alternate views/crops/media of the same source/reference group and preserving them together does not blur provenance or confidence.

Normal `Continue` runs should not traverse this ledger by default. Durable supported conclusions are promoted into the ordinary Project Noclip orientation surfaces that those runs already read, primarily `WORLD.md` and relevant GitHub issues/ADRs.

Do not delete processed entries; this file remains the source-evidence history.

---

## REF-L0-001 — Ordinary Level 0 baseline image and shared finish grammar

- **Processing status:** PROMOTED
- **URL(s):**
  - Supplied media: https://backrooms-wiki.wdfiles.com/local--files/level-0/OGLevel0.jpg
  - Verified parent source: https://backrooms-wiki.wikidot.com/level-0
- **Applies to target(s):**
  - **Level 0 default / ordinary baseline:** direct visual and textual evidence.
  - **Pillar rooms:** shared wallpaper, carpet, ceiling and fluorescent identity only; pillar-specific geometry comes from REF-L0-002.
  - **Hole sections:** shared wallpaper, carpet, ceiling and fluorescent identity only; hole-specific geometry comes from REF-L0-003.
- **Context:** User supplied this as the principal wallpaper, carpet, lighting and ambience reference for ordinary Level 0 and for the ordinary finishes surrounding Pillar and Hole variations.
- **Verified source/provenance:** The accessible official Backrooms Wiki page “Level 0 — Threshold” embeds this exact attachment as the first known Level 0 image, describes it as yellow segmented hallways with fluorescent lighting, credits Bob Mazza for releasing the original image into the public domain, and supplies the accompanying Level 0 surface/audio text.
- **Source tier:** A — authoritative/source material, confirmed.
- **Confidence:** High for visible composition, finish colors and fixture type; high for the parent page’s written carpet and fluorescent-buzz rules.
- **Directly supported observations:**
  - The photograph shows empty, repeatedly segmented office/retail-back-room-like space rather than furnished rooms.
  - Broad wall planes and offset openings create overlapping sight lines and monotonous navigation.
  - Long rectangular ceiling lights form a repeated directional rhythm through the space.
  - The parent source identifies a pervasive fluorescent buzz and a damp carpet baseline.
- **Spatial/architectural evidence:** Low suspended ceiling; full-height partitions; offset wall openings; long empty floor runs; shallow base trim; no doors, windows or furniture visible in the photographed view.
- **Materials / Conditions / lighting evidence:** Pale sickly-yellow patterned wallpaper; beige/brown carpet that appears yellow under harsh fluorescent cast; pale ceiling tiles; bright rectangular fluorescent panels; weak shadows and yellow-green color contamination. The parent source specifies tight-knit Berber-style carpet, brownish-beige when isolated, seamless across the Level, abrasive and persistently moist.
- **Audio evidence:** The still image has no audio. The authoritative parent text, not the image, establishes fluctuating buzzing fluorescent lights as the ordinary room tone.
- **Signature details:** Repeating wallpaper pattern, continuous carpet, rectangular fluorescent panels, empty segmented wall planes, low ceiling and yellow-green photographic cast.
- **What this evidence does NOT support:** Uniformly bright-yellow carpet as an intrinsic Material color; a fixed numeric color temperature or luminance; furniture/clutter; audio derived from the photograph; identical wallpaper on every future Level.
- **Source-supported / interpretation / invented classification:**
  - **Source-supported:** visible finishes, segmentation, fixture shape, empty presentation, carpet description and fluorescent buzz.
  - **Project Noclip interpretation:** ordinary Level 0 is the shared finish/ambience substrate inherited by Pillar and Hole variations unless stronger target evidence overrides it.
  - **Invented/unsupported:** exact texture files, RGB values, ceiling dimensions and light spacing remain implementation choices.
- **Caveats/conflicts:** The user described “yellow bright lighting”; the source supports a strong sickly yellow cast and bright fixtures, but not uniformly high illumination everywhere. Photograph exposure and white balance affect apparent color.
- **Promotion outcome:** Promoted to the source-backed Level 0 fidelity contract in WORLD.md and to the implementation requirements in [Issue #37](https://github.com/xash-mind/Project-Noclip/issues/37).

---

## REF-L0-002 — Pillar-room architecture, ceiling services and source rules

- **Processing status:** PROMOTED
- **URL(s):**
  - Supplied media: https://backrooms-wiki.wdfiles.com/local--files/level-0/3
  - Verified parent source: https://backrooms-wiki.wikidot.com/level-0
- **Applies to target(s):**
  - **Level 0:** confirms the variation retains ordinary Level 0 finishes.
  - **Pillar rooms / legacy pillar path:** direct target evidence.
- **Context:** User supplied the image and the world-bible passage describing very large pillar rooms, lattice/grid placement, shallower carpet and paths shifting behind the wanderer.
- **Verified source/provenance:** The official Level 0 page embeds this exact attachment with alt text identifying an abnormal yellow room with pillars. The accessible page text independently matches the supplied Pillar Variation passage. The page-level credits identify CC-compliant Level 0 render work by Alfarex under CC BY-SA 3.0, although the accessible credit text does not map individual render filenames one by one.
- **Source tier:** A — authoritative/source material, confirmed.
- **Confidence:** High for geometry, finish continuity, ceiling fixtures and the written grid/scale/shift rules; medium for the frequency of ceiling vents because only a few are visible.
- **Directly supported observations:**
  - Broad rectangular floor-to-ceiling pillars/piers repeat in rows through a large open space.
  - The pillars use the same patterned wallpaper finish as surrounding walls.
  - Rectangular fluorescent panels and at least one square ceiling vent/service grille are visible in the suspended ceiling.
  - The authoritative text says the rooms can be extremely large, use a lattice/grid, have shallower and less-moist carpet, and may leave previously traversed paths shifted and pillar placement apparently asymmetric.
- **Spatial/architectural evidence:** Long sight lines; multiple parallel/offset aisles; repeated rectangular supports rather than round columns; grid/lattice cadence with local occlusion; open space continues beyond the frame.
- **Materials / Conditions / lighting evidence:** Ordinary yellow patterned wallpaper, beige carpet and pale ceiling grid continue into the variation. Lighting remains yellow-green and fluorescent. Source text distinguishes the carpet here as shallower and relatively less wet.
- **Audio evidence:** The still has no audio. The official page’s general Level 0 fluorescent buzz may be inherited, but no Pillar-specific acoustic or HVAC sound is established.
- **Signature details:** Wallpaper-clad rectangular piers; long grid/lattice repetition; suspended fluorescent panels; visible ceiling vent/service grille; sparse empty floor.
- **What this evidence does NOT support:** Round classical columns; decorative capitals; a precise pillar cross-section/spacing; a vent above every bay; audio from the still; visible real-time popping or random non-deterministic geometry changes.
- **Source-supported / interpretation / invented classification:**
  - **Source-supported:** pillar grid/lattice, potentially vast scale, ordinary finish continuity, shallower/drier carpet and behind-the-wanderer path shifting.
  - **Project Noclip interpretation:** keep pillar-heavy geography under the legacy path until Gen 3 decides whether it deserves a Region label; any path shift is a future intentionally designed deterministic Non-Euclidean behavior.
  - **Invented/unsupported:** the exact solver, shift trigger, streaming implementation and grid dimensions are not specified by the source.
- **Caveats/conflicts:** Current runtime Geometry is Euclidean only. Recording the source-described shift does not claim it is implemented or authorize random geometry mutation.
- **Promotion outcome:** Promoted to WORLD.md and [Issue #37](https://github.com/xash-mind/Project-Noclip/issues/37); no STATUS.md change because accepted runtime did not change.

---

## REF-L0-003 — Hole-section grid image and authoritative Hole Variation text

- **Processing status:** PROMOTED
- **URL(s):**
  - Supplied public Drive media: https://drive.google.com/file/d/1YNDQJO_nivstBK9e-sWXn90wMbXjdauu/view?usp=drivesdk
  - Verified parent source: https://backrooms-wiki.wikidot.com/level-0
  - Parent page’s corresponding attachment path: https://backrooms-wiki.wikidot.com/local--files/level-0/4
- **Applies to target(s):**
  - **Level 0:** confirms pits interrupt otherwise ordinary Level 0 architecture.
  - **Hole sections / legacy holes path:** direct target evidence.
- **Context:** User supplied this image with the source passage describing deep pitch-black pits in close grid-pattern groups, limited light penetration, bypassable lanes and potentially dense hazardous clusters.
- **Verified source/provenance:** The supplied Drive viewer was publicly accessible and exposed a 640×480 image titled “4.” Its visible content and dimensions match the official Level 0 page’s embedded Hole Variation image and alt description of a yellow room with a grid of square holes. The official page text independently matches the supplied Hole Variation passage. Direct binary equality between the Drive copy and official attachment was not established.
- **Source tier:** A — authoritative/source material for the underlying Level 0 image/text, confirmed through the official page; the Drive copy itself is a user-supplied mirror.
- **Confidence:** High for square-grid pit geometry and written darkness/grouping rules; medium-high for mirror provenance because exact file-byte identity was not verified.
- **Directly supported observations:**
  - Multiple discrete square floor openings form a close, regular grid.
  - Narrow but readable carpet lanes remain between pits and around the cluster.
  - Pit interiors are effectively black at the visible depth.
  - Ordinary wallpaper partitions, carpet, ceiling tiles and fluorescent fixtures continue around the cluster.
  - The authoritative text describes deep pits, light penetration of only a few feet, close groups/grids, dense hazardous clusters and no reported survivor of a fall.
- **Spatial/architectural evidence:** Subtractive square breaches through the floor; clustered rather than isolated placement; grid-aligned openings; approach and bypass space around/between holes; no railings in the reference image.
- **Materials / Conditions / lighting evidence:** Ordinary Level 0 finishes surround the holes. Fluorescent room light reads the rims and nearby carpet but does not reveal the interiors.
- **Audio evidence:** No audio is present and the parent text establishes no Hole-specific sound.
- **Signature details:** Sharp square rims, repeated pitch-black voids, close grid grouping, ordinary Level 0 continuing uninterrupted around the cluster.
- **What this evidence does NOT support:** A visible destination; blue light or voices inside; exact depth; survivable falling; a full black floor; mandatory guardrails; terminal fall physics inferred from the photograph alone.
- **Source-supported / interpretation / invented classification:**
  - **Source-supported:** discrete square pits, grid/close-group clustering, darkness, limited light penetration, bypassability and severe fall risk.
  - **Project Noclip interpretation:** future Hole content should be a floor/void Carver over ordinary architecture, not a complete unrelated room template.
  - **Invented/unsupported:** exact pit depth, fall outcome implementation, density algorithm and collision/game-over behavior remain design work.
- **Caveats/conflicts:** Accepted runtime already has recessed Hole rendering, but terminal falling/death physics is still absent. This reference update records the target and creates follow-up work; it does not change runtime truth.
- **Promotion outcome:** Promoted to WORLD.md and [Issue #37](https://github.com/xash-mind/Project-Noclip/issues/37); no STATUS.md change.

---

## REF-L0-004 — Blackout-zone image, light boundary and silence rule

- **Processing status:** PROMOTED
- **URL(s):**
  - Supplied media: https://backrooms-wiki.wdfiles.com/local--files/level-0/5
  - Verified parent source: https://backrooms-wiki.wikidot.com/level-0
- **Applies to target(s):**
  - **Level 0:** confirms blackout is ordinary Level 0 architecture under exceptional Conditions.
  - **Blackout zones / legacy blackout path:** direct target evidence.
- **Context:** User supplied this as the Blackout reference and highlighted source rules for total fixture darkness, lost fluorescent buzz, rough walls, recessed fluid, and escape by distant light or buzzing.
- **Verified source/provenance:** The official Level 0 page embeds this exact attachment with alt text describing an unlit hallway using architecture similar to the rest of Level 0. The accessible page text independently matches the supplied Blackout Zone passage.
- **Source tier:** A — authoritative/source material, confirmed.
- **Confidence:** High for the unlit ordinary-architecture visual and written light/silence/escape rules; medium for rough-wall/fluid appearance because those details are not legible in the still.
- **Directly supported observations:**
  - Recognizable ordinary Level 0 partitions and suspended ceiling remain present.
  - Ceiling fixtures are dark/off and the room rapidly falls into near-blackness.
  - Limited foreground illumination/exposure reveals only nearby surfaces.
  - The authoritative text describes entire unlit sections, shifting under low visibility, intense silence from absent buzzing, rough wall texture, sometimes recessed ankle-deep fluid, and navigation toward an external glimmer or buzzing source.
- **Spatial/architectural evidence:** Same segmented partition grammar as ordinary Level 0; deep occluded sight line; no source-supported special standalone blackout architecture.
- **Materials / Conditions / lighting evidence:** Total local fixture outage is the defining Condition. Near surfaces remain yellow/pale when externally illuminated; distant surfaces disappear. Roughness and recessed fluid are textual source facts, not clearly visible image facts.
- **Audio evidence:** The image has no audio. The authoritative text directly establishes absence of local fluorescent buzz and the possible use of buzz heard from outside/toward an exit.
- **Signature details:** Off ceiling panels, abrupt darkness over familiar partitions, severe falloff from limited foreground illumination, loss of ordinary fluorescent sound bed.
- **What this evidence does NOT support:** A mandatory flashlight/torch item; glowing blackout fixtures; a self-illuminated exit; visible fluid in this frame; a new acoustic drone inside the blackout; audio inferred from the still.
- **Source-supported / interpretation / invented classification:**
  - **Source-supported:** unlit ordinary Level 0, missing local buzz, rough walls, possible recessed fluid and distant light/buzz escape cues.
  - **Project Noclip interpretation:** model blackout mainly through Light/Material/Condition and Field changes over ordinary architecture rather than as a hard room template.
  - **Invented/unsupported:** exact darkness curve, fluid simulation, wall shader and directional-audio implementation are not prescribed.
- **Caveats/conflicts:** The limited foreground visibility could come from a torch, camera exposure or another off-frame source; the still does not settle that question. Current legacy blackout content may not yet satisfy the full audio/material contract.
- **Promotion outcome:** Promoted to WORLD.md and [Issue #37](https://github.com/xash-mind/Project-Noclip/issues/37).

---

## REF-L0-005 — Authoritative Red Rooms image and in-Level-0 closed-loop source rules

- **Processing status:** PROMOTED
- **URL(s):**
  - Supplied public Drive media: https://drive.google.com/file/d/1H2lN1fGx7HtitoW2m-H4q-lh-g0MpJZ3/view?usp=drivesdk
  - Verified parent source: https://backrooms-wiki.wikidot.com/level-0
  - Parent page’s corresponding attachment path: https://backrooms-wiki.wikidot.com/local--files/level-0/6
- **Applies to target(s):**
  - **Level 0:** source presents Red Rooms as rare sections within Level 0.
  - **Red Rooms:** direct visual and textual evidence; classification evaluated independently from the current disabled Transition registry.
- **Context:** User grouped this image with a second Red Rooms image and supplied prose about red finishes, sticky carpet, mold/mushrooms, deteriorating radio contact, distress and inability to escape. Only the claims verified against the authoritative Level 0 page are promoted here.
- **Verified source/provenance:** The supplied Drive viewer was publicly accessible and exposed an 800×600 image titled “6.” Its visible content and dimensions match the official Level 0 page’s embedded Red Rooms image and alt description of a segmented hallway with a deep red hue. The official page directly describes rare in-Level-0 sections that disconnect into a closed loop, are extremely difficult or impossible to escape, cause distress near them, shift toward red, expose crimson under peeling wallpaper, and have thick sticky coarse carpet. Direct file-byte identity was not established.
- **Source tier:** A — authoritative/source material for the underlying Level 0 image/text, confirmed through the official page; the Drive copy itself is a user-supplied mirror.
- **Confidence:** High for red lighting/finish transformation, ordinary-Level-0 architectural continuity and the closed-loop/in-Level-0 source claim; medium-high for mirror provenance.
- **Directly supported observations:**
  - The image retains segmented Level 0 partitions and rectangular ceiling fixtures but saturates walls, carpet and ceiling in deep red.
  - Bright ceiling panels remain visible through the red cast while openings and recesses fall toward black.
  - The official text describes a progressive red color cue, peeling wallpaper revealing crimson, thick sticky coarse carpet, severe claustrophobia/paranoia near the area and a disconnected closed loop that is extremely difficult or impossible to escape.
- **Spatial/architectural evidence:** The visible architecture resembles ordinary Level 0 rather than a wholly separate architectural Level. Source text establishes disconnection/looping, but not the exact topology, trigger, extent or reversal rules.
- **Materials / Conditions / lighting evidence:** Deep red/crimson color shift across the space; red-lit fluorescent panels; sticky/coarse/thick carpet and peeling wallpaper with crimson beneath are source-text facts. The image is too blurred/grainy to resolve wallpaper pattern, mold or carpet fibers.
- **Audio evidence:** No audio is present. The authoritative Level 0 page section does not establish Red Rooms radio degradation or a unique sound bed.
- **Signature details:** Ordinary segmented hallway transformed by pervasive crimson/red light and finish color, bright rectangular ceiling panels, dark recesses, strong claustrophobic compression and a closed-loop threat.
- **What this evidence does NOT support:** Mushrooms; black mold; radio degradation; exact communications behavior; a separate playable Level; a gradual Transition trigger; visible entities; a specific loop topology; audio from the still.
- **Source-supported / interpretation / invented classification:**
  - **Source-supported:** rare in-Level-0 sections, red/crimson cues, sticky/coarse/thick carpet, distress, disconnection and closed-loop escape failure.
  - **Project Noclip interpretation:** classify the future target as a rare Level 0 Structure carrying Material/Condition changes and intentionally designed Non-Euclidean loop Geometry; it is not a Region.
  - **Invented/unsupported:** exact generation rarity, streaming map, save reconstruction, loop behavior and communications effects remain unspecified.
- **Caveats/conflicts:** WORLD.md currently records Red Rooms as a registered disabled Transition destination. The source-backed planned classification conflicts with treating that registry as canon for a separate destination, but does not change accepted runtime state. Exact player-facing Non-Euclidean behavior requires explicit design before implementation.
- **Promotion outcome:** Promoted to WORLD.md. [Issue #37](https://github.com/xash-mind/Project-Noclip/issues/37) tracks classification/runtime reconciliation and the required deterministic design; STATUS.md remains unchanged.

---

## REF-L0-006 — Scutoidbox Red Rooms image with unresolved parent-page provenance

- **Processing status:** EVIDENCE-ONLY
- **URL(s):**
  - Supplied media: https://scutoidbox.wdfiles.com/local--files/red-rooms/eggrooms-red-2.png
  - Inferred parent path from the attachment URL: https://scutoidbox.wikidot.com/red-rooms
- **Applies to target(s):**
  - **Red Rooms:** visual corroboration only.
- **Context:** User grouped this image with REF-L0-005 and attributed the same detailed Red Rooms prose and Tier A status to both URLs.
- **Verified source/provenance:** The direct 330×280 PNG was accessible and visually inspected. It is hosted on a Wikidot file domain under a page path named “red-rooms.” The cloud browser’s URL policy blocked the inferred parent page, and web lookup returned no inspectable parent-page result. The host could not be verified as the authoritative Backrooms Wiki or the detailed prose’s origin.
- **Source tier:** Unverified. The user supplied “Tier A,” but that tier was not independently confirmed for this materially distinct host/source.
- **Confidence:** Medium for the visible pixels; low for authorship, canon status, context and any associated prose.
- **Directly supported observations:** A heavily blurred/grainy red corridor or segmented room; several bright warm rectangular ceiling lights; dark openings/recesses; pervasive deep red color.
- **Spatial/architectural evidence:** Too blurred and small to establish exact wall topology, room scale, loop geometry or relationship to ordinary Level 0 beyond a loose segmented-hall resemblance.
- **Materials / Conditions / lighting evidence:** Deep red lighting/color cast is visible. Wallpaper pattern, carpet texture, mold, mushrooms, peeling surfaces and material stickiness are not visually resolvable.
- **Audio evidence:** None; this is a still image.
- **Signature details:** Deep-red blur, bright ceiling-light sequence and a central dark opening.
- **What this evidence does NOT support:** Tier A provenance; the supplied lore text; mushrooms; black mold; radio degradation; sticky carpet; impossible escape; closed-loop Geometry; audio; exact architecture.
- **Source-supported / interpretation / invented classification:**
  - **Source-supported:** only the visible red-lit corridor image from the supplied URL.
  - **Project Noclip interpretation:** it loosely corroborates the already authoritative red-light mood in REF-L0-005 but cannot add a canonical rule.
  - **Invented/unsupported:** all detailed lore/material/audio claims remain unsupported by this entry.
- **Caveats/conflicts:** Parent-page access/provenance is unresolved. This entry is kept separate from REF-L0-005 so the authoritative source does not silently transfer to a distinct host.
- **Promotion outcome:** EVIDENCE-ONLY. No new WORLD.md rule came from this image; unsupported mushrooms, mold and radio claims were explicitly excluded from [Issue #37](https://github.com/xash-mind/Project-Noclip/issues/37) pending stronger evidence.

---

## REF-L0-007 — Arch-room continuous divider/wall with repeated arch-shaped openings

- **Processing status:** PROMOTED
- **URL(s):**
  - Supplied media: https://backrooms-wiki.wdfiles.com/local--files/level-0/2
  - Verified parent source: https://backrooms-wiki.wikidot.com/level-0
- **Applies to target(s):**
  - **Level 0:** establishes one source-recognized structural variation.
  - **Arch Rooms / legacy arch path:** direct target evidence.
- **Context:** User clarified that Arch Rooms contain dividing walls with this repeated Arch pattern, paler walls/lights and stable Euclidean behavior. The user explicitly warned against literalizing the name into standalone arches.
- **Verified source/provenance:** The official Level 0 page embeds this exact attachment with alt text describing a yellowish-beige room with a wall of archways. Its accessible Arch Variation text independently matches the supplied passage about pale walls, archway holes, deep wet carpet, dead-end/transition placement and unusual stability.
- **Source tier:** A — authoritative/source material, confirmed.
- **Confidence:** High for the continuous divider/wall construction, repeated opening rhythm, pale finish and written stability/carpet rules; low for glass because none is visibly established.
- **Directly supported observations:**
  - A long continuous divider/wall occupies one side of a broad empty room.
  - The divider has solid lower rectangular panels, repeated vertical bays, a continuous top/header band and repeated openings whose upper edges are semicircular/arched.
  - The openings are part of the divider/wall; the image does not show freestanding arch monuments.
  - The source text describes pale walls, common dead-end or transition-room placement, unusually deep fluid-laden carpet, rest-width openings and the most stable/no-behind-you-shift behavior among the listed variations.
- **Spatial/architectural evidence:** One continuous linear partition rhythm; repeated arched cutouts/openings; lower opaque panel band; vertical posts/bays; ceiling-connected header/supports; large empty room beside the divider; stable ordinary spatial relationships.
- **Materials / Conditions / lighting evidence:** Paler wall/divider finish than ordinary baseline; standard beige carpet with visible darkening/stains; rectangular fluorescent panels; pale yellow-green illumination. Source text establishes deeper/wetter carpet.
- **Audio evidence:** No audio is present and the source section does not establish an Arch-specific sound.
- **Signature details:** Continuous pale divider, solid lower panels, repeated arch-crowned openings, continuous header, empty adjoining floor and ordinary suspended fluorescent ceiling.
- **What this evidence does NOT support:** Freestanding arches; a colonnade of standalone curved beams; glass infill; ornate trim; a third “Distorted” Geometry type; target-specific audio; exact dimensions from perspective.
- **Source-supported / interpretation / invented classification:**
  - **Source-supported:** wall/divider with repeated archway holes, pale finish, deep wet carpet, dead-end/transition association and unusual stability.
  - **Project Noclip interpretation:** keep the current legacy Arch path Euclidean and stable; redesign its signature as the continuous divider treatment rather than label-driven standalone arches.
  - **Invented/unsupported:** glass, exact bay dimensions, procedural cadence and fixture layout remain unproven.
- **Caveats/conflicts:** Open Issue #11 previously required curved/open standalone arch structures, and closed Issue #22 treated arch tops as separate ceiling-clear geometry. That implementation framing materially misread the Tier A source. The reference image also does not verify the glass suggestion recorded as a question in the general reference-gate README.
- **Promotion outcome:** Promoted to WORLD.md. Issue #11 was corrected in place, and [Issue #37](https://github.com/xash-mind/Project-Noclip/issues/37) now carries the implementation fidelity contract.

---
