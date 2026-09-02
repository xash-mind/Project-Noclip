# Visual & Audio Reference Gate

Project Noclip succeeds only if its spaces **look, sound, and feel recognizably like the intended Backrooms source material**. Technical correctness is necessary but not sufficient.

This directory stores reference packs and fidelity audits for Levels, Regions, Structures, Materials, Conditions, Features, Carvers, Transitions, and major audio identities.

## Mandatory evidence-first rule

Before implementing or materially redesigning a Level, Region, Structure, or other visually significant world element, agents must first create or update a reference pack.

A reference pack should use **multiple distinct references**, not one image and not a text-only interpretation, whenever visual material exists. Prefer roughly 8–20 useful visual references for a major Level/Region when enough credible material is available; use fewer only when the source corpus is genuinely sparse. More is appropriate when the appearance has important subtypes or conflicting depictions.

For audio-bearing content, collect multiple relevant audio references or source descriptions when available. Separate canonical/source-supported sound facts from ambient inspiration.

Do not copy or rehost copyrighted source media in the repository unless its license clearly permits that use. Store source links, attribution/context, observations, and user-supplied/licensed assets as appropriate.

## Source discipline

For every reference, record:

- source URL or repository/user-provided source;
- what the reference depicts or demonstrates;
- whether it is canonical/source-supported, secondary interpretation, or general real-world inspiration;
- any uncertainty or conflict with other sources.

If different Backrooms sources disagree and the project's accepted canon/source hierarchy does not resolve the conflict, **do not silently choose one**. Record the conflict and escalate the product decision.

Names are not geometry. Never literalize a label without checking references. A term such as `arch` must not automatically become freestanding architectural arches merely because of its name.

## Relationship to the concept provenance ledger

Reference packs answer **what the evidence says and how faithfully a target should be interpreted**. `docs/CONTENT_PROVENANCE.md` answers the related but different question **what part of the resulting Project Noclip concept is source-derived, interpreted, Project-Noclip-original, real-world-inspired, or still unknown**.

Do not move detailed image/audio analysis out of `docs/references/**` and do not duplicate it in the provenance ledger.

When a reference update materially changes a concept's source family, source URL, source-supported facts, interpretation boundary, copied-media status, attribution/license evidence, or unresolved provenance question, update `docs/CONTENT_PROVENANCE.md` in the same change.

When evidence/license/permission is unclear, record `UNKNOWN / REVIEW REQUIRED` rather than inferring a legal conclusion. Public accessibility, wiki hosting, user supply, or technical transformation of an asset does not by itself establish reuse rights.

The normal routing remains efficient: engineering-only work does not read raw reference packs merely to satisfy ceremony. `AGENTS.md` and `docs/WORK_RULES.md` define the provenance trigger and final `PROVENANCE_IMPACT` handoff.

## Visual grammar extraction

Each major visual pack should explicitly document, where relevant:

- overall spatial proportions and scale;
- wall layout and opening shapes;
- divider/partition construction;
- ceiling height, grid, fixtures, and services;
- floor and wall Materials;
- glass, trim, frames, columns, doors, windows, and other recurring details;
- lighting color/temperature, intensity, falloff, darkness, flicker, and shadow character;
- clutter density and object vocabulary;
- repetition versus variation;
- signs of wear, dampness, stains, damage, or age;
- camera/viewpoint cues that may distort apparent proportions;
- motifs that must be present for the space to read correctly;
- tempting but incorrect interpretations to avoid.

Reference packs should distinguish:

- **Source-supported** — directly evidenced by accepted source material;
- **Interpretation** — a reasonable game adaptation inferred from evidence;
- **Invented** — new material with no direct source support.

Major invented geometry or signature visual motifs require an explicit design reason. Agents must not invent prominent structures merely to make procedural generation more varied.

## Audio grammar extraction

Where audio materially contributes to identity, document:

- baseline room tone;
- fluorescent/electrical hum character;
- HVAC/mechanical sound;
- reverberation and perceived room size;
- footsteps by surface type;
- distant/occluded sound behavior;
- fixture buzz/flicker/transients;
- silence/dynamic-range expectations;
- source-supported exceptional sounds;
- sounds that would make the space feel too cinematic, game-like, or unlike the intended Backrooms atmosphere.

Use source descriptions and legally usable references. Do not commit copyrighted recordings without permission.

## Fidelity acceptance gate

A world-content PR is not accepted merely because deterministic tests, performance checks, and browser smoke pass.

For visually or sonically material changes, verification must also include:

1. the linked reference pack;
2. implementation screenshots or captured evidence from representative generated cases;
3. direct comparison against the extracted visual/audio grammar;
4. a check for invented or misread signature structures;
5. an explicit fidelity verdict: `PASS`, `PASS WITH KNOWN GAPS`, or `FAIL`.

A `FAIL` blocks acceptance of the affected world-content change. `PASS WITH KNOWN GAPS` must record the gaps and why they are acceptable for the current slice.

## Level 0 immediate audit priority

The existing Level 0 should be audited under this gate before it becomes the reference architecture.

In particular, re-check the legacy `arch` content against actual visual references. The current interpretation must not assume that “Arch Rooms” means standalone literal arches. Sash's correction is that the intended motif is closer to a wall/divider treatment incorporating arch-shaped openings and glass; this must be verified against the accepted reference corpus before the region is redesigned.

The same audit should identify any other geometry, props, Materials, lighting, or audio that were invented from labels/text without adequate visual or sonic evidence.

## Reference-ready consequence

Level 0 is not reference-ready only because its APIs, determinism, streaming, persistence, and performance are stable. Its representative visual and audio language must also have passed this fidelity gate strongly enough that future Levels can trust the shared rendering/audio/world-content conventions.
