# Project Noclip

## Purpose

Project Noclip is a living, persistent browser-first recreation of the Backrooms built around scale, uncertainty, isolation, environmental consistency, scarce objects, evolving timelines, and rare human connection.

## Users and primary outcome

- Primary users: players seeking slow, unsettling exploration rather than routine combat.
- Primary outcome: a stable, replayable Level 0 vertical slice where the environment itself creates tension, navigation uncertainty, persistence, and meaningful discovery.
- Secondary outcome: establish portable systems for future levels, multiplayer rendezvous, item exchange, and world evolution without sacrificing deterministic behaviour or performance.

## Product principles

- Vast but planned: deterministic streaming creates scale; district grammars, archetypes, landmarks, and rarity budgets create meaning.
- Empty by design: most spaces contain no valuable item, entity, or player.
- Consistent hidden laws: mystery comes from systems the player learns, not arbitrary randomness.
- Objects create relationships: uneven item distribution prepares future cooperation and trade.
- Rare human presence: ordinary Level 0 isolates; the Manila Room is the intended rendezvous exception.
- Time changes access: World Day and Exposure Day gate zones, exits, and events.
- Renderer-independent world state: canonical generation and persistence remain pure TypeScript data where practical.
- Progressive fidelity: visual richness must not compromise world scale, deterministic identity, or stable performance.

## Current scope

### Included

- Deterministic multi-scale Level 0 district and room generation
- Browser movement, collision, pointer lock, and environmental presentation
- Persistent limited items, marker strokes, notes, and timeline state
- World Day and Exposure Day progression
- Manila Room as a delayed compact special space
- Exit/transition foundations and future destination capsules
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
- Stable world/surface/item identities support persistence, markers, transitions, and future multiplayer authority.
- IndexedDB stores journey state and supports schema migration.
- Vercel is the intended deployment target.

## Durable constraints

- Do not return to isolated per-cell random room generation.
- Preserve save compatibility or provide tested migrations.
- Keep offline and future connected-world authority separate.
- Do not weaken timeline gates for convenience; use developer bypasses for testing.
- Treat performance, persistence, and real-browser behaviour as product requirements.

## Important links

- Repository: https://github.com/xash-mind/Project-Noclip
- Production target: https://project-noclip.vercel.app
- Shared operations: https://github.com/xash-mind/project-operations
- Vision details: `docs/VISION.md`
