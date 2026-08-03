# Project Noclip — Vision

**Status:** Foundational product vision  
**Last updated:** 2026-08-03  
**Target public client:** `https://project-noclip.vercel.app`  
**Primary initial release:** Project Noclip — Level 0 Alpha

## 1. Product thesis

Project Noclip is a living, persistent recreation of the Backrooms built around scale, uncertainty, isolation, environmental consistency, and rare human connection.

It is not primarily a monster-chase game. The world itself is the main antagonist: architecture shifts, routes become unreliable, resources are scarce, exits are uncertain, and long periods of emptiness make signs of another person emotionally significant.

The long-term aim is one connected Backrooms universe containing extremely large procedural levels, persistent discoveries, regional multiplayer presence, trading, chat, evolving world timelines, entities, communities, and an expanding network of exits. The first implementation is Level 0.

## 2. Core experience

A successful session should produce this emotional progression:

1. Nothing is happening.
2. I cannot tell whether I have already been here.
3. The environment has changed in a way I cannot prove.
4. I found evidence that another human may have passed through.
5. I found something useful that another player might not have.
6. I discovered an exit, but I do not know where it leads.
7. I reached a stable place and met a real person.
8. We may trade, communicate, wait, separate, or leave together.

Human contact must feel like an event rather than ordinary lobby population.

## 3. Design pillars

### 3.1 Vast but coherent

The world is effectively unbounded because it is generated and streamed from deterministic seeds. Repetition is controlled through procedural grammar, zone profiles, landmarks, environmental states, topology mutation, and rarity—not by placing endless unrelated random rooms.

### 3.2 Mostly empty

Most rooms contain no entity, player, or valuable object. Scarcity is necessary for discoveries to carry weight. Empty space is intentional content.

### 3.3 Consistent internal laws

Every anomaly follows defined rules. The game may be mysterious, but it must not feel arbitrary. Generation, shifting, item spawning, persistence, exits, and multiplayer phasing are deterministic or server-authoritative.

### 3.4 Rare human presence

Ordinary Level 0 is isolating. Players mainly encounter asynchronous traces. Realtime meetings occur at special stable or rendezvous spaces such as the Manila Room. Later levels can support different population densities.

### 3.5 Objects create stories

Players do not begin with a complete survival kit. A new character may begin with no object, one common object, or occasionally two compatible objects. Most equipment is found in the world. Unequal inventories create future reasons to trade, cooperate, wait, remember people, and make difficult choices.

### 3.6 Ambiguity before spectacle

Level 0 should initially contain no routine enemy chase. Distant silhouettes, misplaced sounds, environmental traces, and uncertain changes are preferable to constant confirmed entities. Hounds may later appear as extremely rare breach events. Facelings belong primarily to more populated levels such as Level 11.

### 3.7 Time changes the world

Project Noclip has a server-derived World Day and a character-specific Exposure Day. World Day unlocks shared content waves. Exposure Day represents subjective experience and gates personal discovery. In unstable spaces it advances mainly through validated novel traversal; in stable spaces it advances through authoritative elapsed time.

## 4. Game modes

### Offline World

- No subscription or server required.
- Local procedural world and local persistence.
- No authoritative online economy.
- No transfer of offline items or progression into Connected World.
- Useful for accessibility, experimentation, and permanent ownership.

### Connected World

- Authoritative character, inventory, timeline, exits, and trading.
- Regional encounter infrastructure.
- Anonymous or restrained identity presentation.
- Text chat in permitted spaces.
- Later: proximity voice, subscriptions, multi-region presence, communities, and shared events.
- Connected mode should feel like single-player until another human naturally appears.

## 5. Level 0 identity

Level 0 is Project Noclip’s foundational systems level.

It introduces:

- Yellow segmented backroom architecture.
- Damp carpet and fluorescent hum.
- Deterministic procedural generation.
- Chunk streaming.
- Peripheral topology shifts.
- Stable and unstable spatial classes.
- Sparse found objects.
- Marker drawings and human echoes.
- World Day and Exposure Day.
- The Manila Room rendezvous.
- Multiple exit families.
- Ambiguous hallucination events.
- No ordinary combat loop.

Primary zone families:

- Baseline Lobby.
- Arch Rooms.
- Pillar Fields.
- Blackout Zones.
- Hole Sections.
- Waterlogged Thresholds.
- Renovation Thresholds.
- Red Room hooks.
- Deep Regions.
- Manila Room.
- Exit Thresholds.

## 6. Objects, scarcity, and future trading

Objects are data-driven and have stable IDs, rarity, condition, ownership, and persistence rules.

Initial object set:

- Flashlight.
- Battery.
- Almond Water.
- Permanent marker.
- Paper note.
- Glow stick.
- String spool.
- Empty bottle or can.
- Pry tool.

New connected characters receive a server-generated starter roll. Initial tunable defaults:

- 15%: no object.
- 60%: one object.
- 25%: two compatible objects.
- Rare tools such as the pry tool must have low starter weight.
- A flashlight is not guaranteed.
- A battery may spawn without a flashlight.
- Duplicate items in the same starter roll should normally be prevented.
- Starter rolls are recorded once and cannot be rerolled by refreshing.

World loot is generated from deterministic loot nodes plus persistent deltas. Found objects should be uncommon, and valuable combinations should be rarer than individual pieces.

The data model must be trade-ready even before trading UI exists:

- Stable item instance ID.
- Item definition ID.
- Condition and charge.
- Current owner or world container.
- Origin record.
- Revision number.
- Bound or tradeable flag.
- Server-authoritative transfer history in Connected World.

## 7. Marker system

Markers allow limited freehand drawings on approved surfaces.

Principles:

- Store compressed vector strokes, not uploaded images.
- Limit points, size, marks per cell, and marks per account per day.
- Unstable Level 0 markings are mainly personal and may distort or vanish after shifts.
- Rare degraded traces from other players may bleed across phases as echoes.
- Stable spaces preserve markings longer.
- Manila Room marks are shared, reportable, and moderated.
- No unrestricted image uploads or pasted artwork.

## 8. Timeline system

### World Day

Calculated from an authoritative launch epoch. It controls shared content availability, world events, new zone families, and exit families.

### Exposure Day

Character-specific subjective progression.

In disorienting spaces:

- Advance mainly from validated novel topology traversal.
- Repeated loops count much less.
- Walking into a wall, automation, impossible speed, or client-written step totals do not count.

In stable spaces:

- Advance through authoritative elapsed time.
- Manila Room uses normal server time.
- Offline credit, if enabled, is capped and server-calculated.

Offline saves may display a local approximation, but they cannot become authoritative Connected World progression.

## 9. Multiplayer direction

Project Noclip is not designed as conventional two-player co-op.

The long-term model is a regional shared-world encounter mesh:

- Thousands of connected players may exist across a realm.
- Active realtime simulation is partitioned into encounter cells.
- Most players remain alone.
- Encounter density varies by level and location.
- Manila Room allows players to wait for others.
- Companion threads can preserve strangers who leave together.
- Players appear and disappear behind occlusion or transitions, never by visibly spawning in front of someone.
- Text chat is location-scoped.
- No global chat during Level 0 exploration.
- Voice uses a separate future service.
- Internally identifiable accounts support blocking, reporting, moderation, and bans even when public identity is restrained.

## 10. Technology direction

Initial repo-first client:

- TypeScript.
- Vite.
- PlayCanvas Engine installed as a package.
- DOM-based HUD and developer tools.
- Pure TypeScript world core with no PlayCanvas imports.
- IndexedDB/local persistence for the first vertical slice.
- Versioned protocol and persistence schemas.
- Vercel for the browser client.
- Unit tests for deterministic generation and persistence.
- Browser smoke testing.

Future connected services:

- Nakama and PostgreSQL for accounts, chat, authoritative encounter cells, storage, and social systems.
- Separate dedicated simulation services only when cell population or simulation cost requires them.
- LiveKit or an equivalent WebRTC service for later proximity voice.

The client must not depend directly on a specific backend. Use adapters.

## 11. Architectural invariants

These rules must remain true:

- Rendering never owns canonical world state.
- The procedural generator can run without rendering.
- Every location and persistent object has a stable ID.
- All meaningful randomness uses explicit seeded generators.
- Static geography is regenerated; only changes are persisted.
- Client actions are commands; authoritative simulation produces outcomes.
- Protocol and save formats are versioned.
- Level content is data-driven.
- PlayCanvas, Vercel, Nakama, billing, storage, and voice integrations sit behind boundaries.
- Offline and Connected World characters remain separate unless a future validated transfer system is intentionally designed.

## 12. Month-one target

A credible Level 0 Alpha should provide:

- Public browser build.
- Reliable first-person movement.
- Endless-feeling deterministic Level 0 streaming.
- Several zone profiles.
- Lighting and audio atmosphere.
- Found items and random starter rolls.
- Inventory and item persistence.
- Flashlight, batteries, Almond Water, marker, notes, glow sticks, string, empty containers, and pry tool.
- Limited wall drawing.
- Peripheral shifting.
- World Day and Exposure Day.
- Manila Room placeholder or functioning local rendezvous simulation.
- Several exit threshold families.
- Hallucination events.
- A world-tuning lab for rapid design.
- Tests, documentation, and a clean deployment pipeline.

## 13. Explicit non-goals for the first Level 0 month

- Routine combat.
- Crafting trees.
- Base building.
- Global chat.
- Production voice chat.
- Full Asia-wide infrastructure.
- Hundreds of visible players in one room.
- Common Hound encounters.
- Real Facelings in baseline Level 0.
- Full implementations of every destination level.
- Subscription billing.
- Native mobile and console clients.
- User-uploaded images.
- Arbitrary executable mods.
- Photorealism.

## 14. Quality standard

Project Noclip must prefer one finished vertical slice over many unfinished systems.

Every milestone should end with:

- A runnable build.
- Relevant tests.
- A meaningful commit.
- Updated `docs/CURRENT_STATE.md`.
- No knowingly broken main branch.
- Clear documentation of placeholders, missing assets, and deferred systems.

Every implementation iteration must also review this vision, update it only with durable lessons, and rewrite `MASTER_BUILD_PROMPT.md` so the next build session begins from verified reality rather than stale instructions.

## 15. Licensing and source policy

Backrooms community sources may use ShareAlike licences and individual media can have separate terms.

Project policy:

- Create original models, textures, sounds, UI, prose, and code.
- Do not copy wiki paragraphs.
- Record adapted concepts and source branches in a canon ledger.
- Record every third-party asset and exact licence.
- Do not assume a page-wide licence automatically covers every image.
- Complete a formal licensing review before commercial release.
