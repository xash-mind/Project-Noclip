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

### Explicitly excluded for now

- Hundreds of implemented levels
- Production multiplayer or authoritative trading
- Voice, subscriptions, or user-uploaded images
- Routine monsters, combat loops, or constant chase design
- Monetization
- Large content expansion before the Level 0 vertical slice is stable

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

## World vocabulary and catalog

`WORLD.md` is the canonical human-facing world bible.

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

`Field`, `Cell`, seed domains, cache radius, and generation version are engine vocabulary. `District`, `ZoneId`, room archetype, spatial profile, component, and generic Prop are Gen2 compatibility vocabulary rather than peer design categories.

Simplification rules:

- no separate `Distorted` Geometry category;
- use `Region` rather than parallel environment-regime/class terminology;
- use `Material` rather than `Material Family` in ordinary product language;
- use `Condition` rather than separate fixture/object-state world categories;
- `rare` is a Structure property, not a separate Structure type;
- purely spatial impossibility belongs under Non-Euclidean Geometry, not a duplicate Anomaly category.

Any accepted world-content or worldgen change that materially changes the catalog must update `WORLD.md` in the same pull request.

Generation 3 migration direction lives in GitHub Issue #31. `WORLD.md` is the catalog; Issue #31 is the implementation roadmap.

## Durable constraints

- Do not return to isolated per-cell random room generation.
- New journeys must not import hard district/Zone/archetype/component selection into Generation 3.
- Do not reintroduce alcoves, baseline arches, freestanding Arch motifs, framed hole recesses, or other prominent unsupported geometry for procedural variety.
- Cells are cache/streaming units only; no wall, light, Region, or architecture cadence may reset at their boundaries.
- Tune Regions against crossing-time distributions and player-visible fidelity, not raw Cell counts.
- Preserve save compatibility or provide tested migrations.
- Preserve deterministic topology/connectivity laws for Euclidean Geometry; define equally deterministic laws before introducing any Non-Euclidean behaviour.
- Keep offline and future connected-world authority separate.
- Do not weaken timeline gates for convenience; use developer bypasses for testing.
- Treat performance, persistence, and real-browser behaviour as product requirements.
- Never present registered exit destinations as implemented playable Levels.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Production target: https://project-noclip.vercel.app
- Generation 3 architecture issue: https://github.com/xash-mind/Project-Noclip/issues/31
- World vocabulary/catalog: `WORLD.md`
- Shared operations: https://github.com/xash-mind/project-operations
- Vision details: `docs/VISION.md`
