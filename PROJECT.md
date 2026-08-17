# Project Noclip

## Purpose

Project Noclip is a living, persistent browser-first recreation of the Backrooms built around scale, uncertainty, isolation, environmental consistency, scarce objects, evolving timelines, and rare human connection.

## Users and primary outcome

- Primary users: players seeking slow, unsettling exploration rather than routine combat.
- Primary outcome: a stable, replayable Level 0 vertical slice where the environment itself creates tension, navigation uncertainty, persistence, and meaningful discovery.
- Secondary outcome: establish portable systems for future levels, multiplayer rendezvous, item exchange, and world evolution without sacrificing deterministic behaviour or performance.

## Product principles

- Vast but planned: deterministic streaming creates scale; multi-scale spatial conditions, hidden laws, landmarks and rarity budgets create meaning.
- Empty by design: most spaces contain no valuable item, entity, or player.
- Consistent hidden laws: mystery comes from systems the player learns, not arbitrary randomness.
- Objects create relationships: uneven item distribution prepares future cooperation and trade.
- Rare human presence: ordinary Level 0 isolates; the Manila Room is the intended rendezvous exception.
- Time changes access: World Day and Exposure Day gate Regions, Transitions and events.
- Renderer-independent world state: canonical generation and persistence remain pure TypeScript data where practical.
- Presentation-independent identity: changing a Representation, material, image, audio source or mesh must not silently change generated world identity, seed results, topology, stable IDs, Journey identity or save identity.
- Progressive fidelity: visual richness must not compromise world scale, deterministic identity, or stable performance.
- Spatial law is part of world generation: **Geometry is either Euclidean or Non-Euclidean**. Non-Euclidean behaviour must be deterministic and save-safe rather than a one-off visual trick.

## Current scope

### Included

- Deterministic multi-scale Level 0 generation
- Browser movement, collision, pointer lock, and environmental presentation
- Persistent limited items, marker strokes, notes, and timeline state
- World Day and Exposure Day progression
- Manila Room as a delayed compact special Structure
- Transition foundations and future destination capsules
- IndexedDB persistence with migrations and recovery
- Developer diagnostics and World Lab tooling
- Performance-conscious streaming and rendering
- Presentation Architecture Upgrade (PAU) foundations for Representation bindings, Low-Complexity Geometry, the Noclip Asset Library, DevelopmentContext and ChangeReceipt contracts

### Explicitly excluded for now

- Hundreds of implemented levels
- Production multiplayer or authoritative trading
- Voice, subscriptions, or player-facing user-uploaded images
- Routine monsters, combat loops, or constant chase design
- Monetization
- Large content expansion before the Level 0 vertical slice is stable
- Noclip Studio until its dedicated PAU Run 2 foundation

## Architecture summary

- TypeScript/Vite browser application using PlayCanvas for rendering.
- Canonical deterministic world generation and state are designed to remain renderer-independent.
- Stable world/surface/item identities support persistence, markers, Transitions, and future multiplayer authority.
- IndexedDB stores journey state and supports schema migration.
- Vercel is the intended deployment target.
- New journeys use the Generation 3 `gen3-v1` path: **seed + generation version → kilometre-scale Region/Condition Fields → world-space architecture + Euclidean Geometry solver → Materials/Conditions → Carvers → Structures → Features/Items/Transitions → runtime mutations/save deltas**.
- Existing pre-versioned journeys migrate to a frozen `gen2` compatibility path and are never silently regenerated.
- `ZoneId`, room archetypes, spatial profiles, and structural components are no longer new-world design inputs; they remain compatibility metadata for Gen2 saves and a narrow renderer adapter only.
- Cells remain streaming/computation units and must not become player-visible room boundaries.
- PAU establishes the presentation pipeline **World Truth → Semantic Object → Representation Binding → Representation Definition → Geometry/Asset Registries + Material Definitions → Presentation Data → Renderer**. See `docs/PRESENTATION_ARCHITECTURE.md`.
- The renderer should increasingly consume resolved presentation information instead of deciding semantic world design or hard-coding arbitrary source-asset paths.

## World vocabulary and catalog

`WORLD.md` is the canonical human-facing world bible. `docs/TERMINOLOGY.md` is the code-facing glossary and `src/world/terminology.ts` is the typed short-address registry.

Preferred everyday design vocabulary:

- **Level**
- **Region**
- **Variant**
- **Geometry** — `Euclidean` or `Non-Euclidean`
- **Material**
- **Condition**
- **Feature**
- **Structure**
- **Carver**
- **Anomaly**
- **Entity**
- **Item**
- **Transition**

**Architecture Pattern** is subordinate vocabulary beneath Region: a named reusable architectural grammar made from geometry pieces, Materials, and traversal/collision rules. It does not become a peer World Lab category and must not be confused with a standalone `Structure`.

Current high-frequency Architecture Patterns:

- `O-A1` — Default Wall (`ordinary-a1-default-wall`) owned by Ordinary Level 0.
- `P-A1` — Pillar Pier (`pillar-a1-pier`) owned by Pillar Field.
- `A-A1` — Arch Divider (`arch-a1-divider`) owned by Arch Rooms.

Conceptual subpieces use dot addresses such as `A-A1.pier`, `A-A1.upper-mass`, `A-A1.curve`, `A-A1.lower-panel`, and `A-A1.termination`.

High-frequency short addresses such as `L0`, `O`, `P`, `A`, `C-B1`, `CV-H1`, and the Architecture Pattern IDs exist only to make human conversation/issues/prompts precise. Stable runtime IDs remain authoritative for generation, persistence, and semantic identity.

`Field`, `Cell`, seed domains, cache radius, and generation version are engine vocabulary. `District`, `ZoneId`, room archetype, spatial profile, component, and generic Prop are Gen2 compatibility vocabulary rather than peer design categories.

Presentation vocabulary such as PAU, Representation, Representation Binding, LCG, NAL, Asset ID, DevelopmentContext and ChangeReceipt describes how semantic world truth is presented or edited. It never replaces world identity.

Simplification rules:

- no separate `Distorted` Geometry category;
- use `Region` rather than parallel environment-regime/class terminology;
- use `Material` rather than `Material Family` in ordinary product language;
- use `Condition` rather than separate fixture/object-state world categories;
- `rare` is a Structure property, not a separate Structure type;
- purely spatial impossibility belongs under Non-Euclidean Geometry, not a duplicate Anomaly category;
- short addresses are aliases, never save/runtime identity;
- presentation IDs and Asset IDs are presentation/content identity, never generated world/save identity;
- do not assign permanent IDs to every render primitive; use an Architecture Pattern piece address only when humans need to refer to that conceptual part independently.

Any accepted world-content or worldgen change that materially changes the catalog must update `WORLD.md` in the same pull request. Durable short-address or Architecture Pattern changes must also update `src/world/terminology.ts` and `docs/TERMINOLOGY.md`. Presentation-only changes do not require `WORLD.md` churn when world laws and semantic identity are unchanged.

Generation 3 migration direction lives in GitHub Issue #31. `WORLD.md` is the catalog; Issue #31 is the implementation roadmap.

## Work communication

Noclip work uses four bounded modes: `LOOK`, `AUDIT`, `CHANGE`, and `RELEASE`. A normal request names `TARGET`, optional `OBSERVATIONS`, `CHANGE` when applicable, `PRESERVE`, and `VERIFY`. Everything outside the named target is preserved by default. Acceptance uses `PASS`, `PASS WITH GAP`, `FAIL`, and `UNVERIFIED`.

This keeps design conversation small while repository instructions carry the permanent engineering/release rules. See `AGENTS.md` and `docs/TERMINOLOGY.md`.

## Durable constraints

- Do not return to isolated per-cell random room generation.
- New journeys must not import hard district/Zone/archetype/component selection into Generation 3.
- Do not reintroduce alcoves, baseline arches, freestanding Arch motifs, framed hole recesses, or other prominent unsupported geometry for procedural variety.
- Cells are cache/streaming units only; no wall, light, Region, or architecture cadence may reset at their boundaries.
- Tune Regions against crossing-time distributions and player-visible fidelity, not raw Cell counts.
- Preserve save compatibility or provide tested migrations.
- Preserve deterministic topology/connectivity laws for Euclidean Geometry; define equally deterministic laws before introducing any Non-Euclidean behaviour.
- A presentation rebind or Asset replacement must not alter world seed outcomes, semantic world IDs, Region/Condition/Carver/Structure identity, topology, world position, stable generated IDs, Journey identity, or save identity.
- Source assets must pass through NAL definitions/validation before becoming runtime content; world/game code must not depend on arbitrary source-file paths.
- Canonical ordinary geometry should remain identical across Low/Medium/High/Ultra; render presets scale rendering cost rather than silently changing the world.
- Keep offline and future connected-world authority separate.
- Do not weaken timeline gates for convenience; use developer bypasses for testing.
- Treat performance, persistence, and real-browser behaviour as product requirements.
- Never present registered exit destinations as implemented playable Levels.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Production target: https://project-noclip.vercel.app
- Generation 3 architecture issue: https://github.com/xash-mind/Project-Noclip/issues/31
- World vocabulary/catalog: `WORLD.md`
- Code-facing terminology: `docs/TERMINOLOGY.md`
- Code navigation: `docs/CODE_MAP.md`
- Presentation architecture: `docs/PRESENTATION_ARCHITECTURE.md`
- Typed short-address registry: `src/world/terminology.ts`
- Shared operations: https://github.com/xash-mind/project-operations
- Vision details: `docs/VISION.md`
