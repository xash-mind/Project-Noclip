# Project Noclip — Vision

Project Noclip is a living, persistent recreation of the Backrooms built around scale, uncertainty, isolation, environmental consistency, scarce objects and rare human connection.

## Product thesis

The world—not a routine monster—is the main antagonist. Architecture changes, routes become unreliable, useful items are unevenly distributed, exits require lived exposure, and signs of another person matter because most of the world is empty.

## Durable principles

- **Vast but planned:** deterministic streaming creates scale; multi-scale spatial conditions, hidden laws, landmarks and rarity budgets create meaning.
- **Empty by design:** most spaces contain no valuable object, entity or player.
- **Consistent laws:** mystery comes from hidden rules, not arbitrary randomness.
- **Objects create relationships:** players find different objects, enabling future trade and cooperation.
- **Rare presence:** ordinary Level 0 isolates; the Manila Room is a future rendezvous exception.
- **Time changes access:** World Day and Exposure Day gate Regions, Transitions and events.
- **Renderer independence:** canonical world generation and state remain pure TypeScript data where practical.
- **Progressive fidelity:** richer materials and silhouettes matter, but never at the cost of world scale or stable performance.
- **Spatial law is content:** Geometry is **Euclidean or Non-Euclidean**. Non-Euclidean areas must follow deterministic, learnable world rules rather than one-off visual tricks.

## Current durable lesson

Cell-by-cell random variation and recognizable room-module selection can create technical infinity while remaining perceptually repetitive. Project Noclip therefore moves toward **Generation 3**: generate continuous multi-scale world conditions first, solve traversable architecture and Geometry second, then layer Materials, Conditions, Carvers, Structures, Features, Anomalies, Entities, Items and Transitions.

A `Cell` is only a streaming/computation unit. Player-visible architecture should be capable of crossing cell boundaries without exposing the grid.

Generation 3 is the new-journey model. Every new journey carries `generationVersion: gen3-v1`; existing and pre-versioned saves remain on a frozen Gen2 compatibility path so architecture is never silently regenerated beneath a player. Legacy `ZoneId`, district, archetype, profile, and component vocabulary must not steer new-world content.

Use `WORLD.md` for the canonical human-facing vocabulary/current content catalog, GitHub Issue #31 for Generation 3 architecture, and `STATUS.md` for the exact accepted production state.
