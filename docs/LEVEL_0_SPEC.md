# Project Noclip — Level 0 Game Specification

**Version:** 0.2  
**Status:** Implemented foundation with explicit partial systems  
**Last updated:** 2026-08-03


## 0. Iteration 1 implementation matrix

### Implemented and verified

- Seeded cell topology with symmetric connectors and fixed-seed replay.
- Streamed active cell radius with unloading and persistent shift epochs.
- Baseline, arch, pillar, blackout, hole, Manila, and exit-threshold profiles.
- Sparse deterministic loot nodes and one-time 15/60/25 starter rolls.
- Trade-ready item instances, six-slot inventory, pickup, drop, use, and revisions.
- Functional flashlight, batteries, Almond Water, and limited vector marker strokes.
- Data/minimal interactions for notes, glow sticks, string, empty cans, and pry tools.
- Version-1 local persistence with IndexedDB and restricted-origin fallback.
- World Day, traversal-weighted Exposure Day, stable-room time, content gates, and exit registry.
- Local Manila Room, several non-Level-1 thresholds, ambiguous hallucination anchors, and World Lab.
- Deterministic tests, 10,000-cell benchmark, production build path, and CI workflow.

### Partial or intentionally deferred

- Rendering currently uses primitive entities and shared materials rather than batching/instancing.
- Hole sections are visual-safe prototypes, not terminal falls.
- String is represented as resource use and narrative feedback, not a rendered trail.
- Note text editing, glow-stick decay, and pry-tool breach interactions are incomplete.
- Marker strokes render as sampled marks rather than connected stroke meshes.
- Exit destinations record pending transitions but do not contain full destination levels.
- Manila Room has local stable behaviour and protocol boundaries, not realtime multiplayer.
- Topology generation runs on the main thread; worker generation and topology prefetch remain future work.

## 1. Purpose

Level 0 is the first complete Project Noclip environment and the test bed for the systems required by every future level:

- Deterministic world generation.
- Streaming.
- Spatial stability.
- Persistent deltas.
- Sparse loot.
- Inventory.
- Timeline progression.
- Human traces.
- Multiplayer phasing.
- Rendezvous spaces.
- Exit graphs.
- Ambiguous anomalies.

Level 0 must be compelling without routine combat.

## 2. Experience rules

- The world is mostly empty.
- Useful objects are uncommon.
- Players do not all begin with the same gear.
- The environment is more important than visible enemies.
- Ordinary Level 0 does not expose realtime players.
- The Manila Room is a stable shared exception.
- Human traces may bleed asynchronously across phases.
- An exit may lead somewhere other than Level 1.
- The level evolves through World Day and Exposure Day gates.

## 3. Spatial classes

```ts
type StabilityClass =
  | "disorienting"
  | "semi-stable"
  | "stable"
  | "rendezvous"
  | "terminal";
```

### Disorienting

- Topology may shift outside observation.
- Exposure advances mainly through novel traversal.
- Markings are personal and unreliable.
- Realtime players are hidden.

### Semi-stable

- Lower shift rate.
- Some persistent props and traces.
- Useful rest and transition areas.

### Stable

- Topology fixed.
- Exposure advances through authoritative time.
- Long-lived traces.
- Safe logout may later be supported.

### Rendezvous

- Realtime player presence.
- Text chat.
- Item exchange.
- Shared marker visibility.
- Capacity and moderation controls.

### Terminal

- Forces an exit, trap, or irreversible journey state.

## 4. Zone catalogue

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

Each zone is a data profile controlling topology grammar, module weights, lighting, sound, wetness, stability, loot weights, hallucination rates, and exit affinities.

## 5. World addresses

Every generated location requires a stable logical address independent of temporary render coordinates.

```ts
interface WorldAddress {
  worldSeed: string;
  levelId: "level-0";
  regionX: number;
  regionZ: number;
  floor: number;
  cellX: number;
  cellZ: number;
  zoneProfileId: string;
  shiftEpoch: number;
}
```

Every persistent prop, loot node, surface, mark, and exit derives a stable ID from its address and local definition key.

## 6. Generation pipeline

1. Derive region seed.
2. Select zone profile.
3. Generate topology graph.
4. Resolve neighbour connector contracts.
5. Place room and corridor modules.
6. Validate connectivity and collision clearance.
7. Place lights, props, drawable surfaces, loot nodes, hallucination anchors, and exit candidates.
8. Build render instances and collision.
9. Apply persistent deltas.
10. Stream into the active world.

## 7. Streaming

- Full render, collision, audio, and interaction in the active radius.
- Topology-only data in the prefetch ring.
- Seed and delta only beyond it.
- Unload geometry, lights, colliders, audio emitters, and transient objects behind the player.
- Use pools and instancing for repeated architecture.
- Track generation time, loaded cells, draw calls, triangles, and memory estimates in the World Lab.

## 8. Peripheral shifting

A cell may shift only when:

- No player occupies it.
- No player can see it.
- It is outside the protected return radius.
- It is not stable or rendezvous space.
- No protected interaction is active.
- At least one viable path remains.

Possible shifts:

- Corridor length changes.
- Doorway moves or disappears.
- Junction becomes a dead end.
- Room module is replaced.
- Marker distorts or is displaced.
- Exit threshold is inserted.
- Lighting state changes.
- Zone contamination begins.

Never transform geometry visibly in ordinary shifting.

## 9. Starter roll

Default distribution:

- 15% no item.
- 60% one item.
- 25% two compatible items.

The roll is deterministic for offline characters and authoritative for connected characters.

Starter item weights should be configurable. Initial weighting guidance:

- Paper note: common.
- Empty bottle/can: common.
- Glow stick: common.
- Battery: uncommon.
- Marker: uncommon.
- Almond Water: uncommon.
- Flashlight: uncommon.
- String spool: uncommon.
- Pry tool: rare.

Compatibility rules:

- Avoid exact duplicates.
- Allow incomplete combinations.
- Avoid two high-value tools.
- A character never rerolls by refreshing or dying unless a future death model explicitly creates a new character.

## 10. World loot

Loot appears through deterministic loot nodes.

A loot node defines:

- Stable node ID.
- Loot table.
- Spawn probability.
- Visibility and occlusion requirements.
- Container or surface placement.
- Timeline gate.
- Once-only or respawn policy.
- Current persistent state.

Most nodes produce nothing.

Objects may appear:

- Behind loose ceiling tiles.
- Inside boxes or cabinets.
- Near abandoned furniture.
- Beside electrical outlets.
- In arch room recesses.
- Near failed lights.
- At dead ends.
- In threshold zones.
- In Manila Room supply traces.

World changes save only the node delta and item instance.

## 11. Item model

```ts
interface ItemInstance {
  instanceId: string;
  definitionId: string;
  condition: number;
  charge?: number;
  quantity: number;
  owner:
    | { type: "character"; id: string }
    | { type: "world"; address: WorldAddress; containerId?: string }
    | { type: "trade-escrow"; id: string };
  origin: {
    type: "starter" | "loot" | "event" | "trade";
    sourceId: string;
    createdAt: number;
  };
  revision: number;
  tradeable: boolean;
}
```

Initial item definitions:

### Flashlight

- Toggleable beam.
- Persistent charge and condition.
- Low-charge flicker.
- Can reveal exit hints and marks.
- Not a weapon.

### Battery

- Restores compatible flashlight charge.
- Condition affects useful energy.
- Tradeable.

### Almond Water

- Restores hydration.
- Mildly reduces distortion.
- Has condition/freshness.
- Does not fully heal the player.
- Tradeable and consumable.

### Permanent marker

- Enables limited vector strokes on tagged surfaces.
- Ink amount or stroke budget.
- Marks are scoped by spatial stability.

### Paper note

- Short text.
- Can be dropped.
- Shared fully only in rendezvous spaces.
- May appear degraded as an asynchronous echo.

### Glow stick

- Temporary light.
- Can be dropped as a breadcrumb.
- Degrades over time.

### String spool

- Leaves a physical route trail.
- Limited length.
- Can be cut or displaced by shifts.

### Empty bottle or can

- Throwable sound source.
- Breadcrumb.
- Low trade value.

### Pry tool

- Rare.
- Used for specific floor, wall, vent, or container interactions.
- Does not open every exit.

## 12. Inventory

Initial inventory should be intentionally small.

- Slot-based or weight-light hybrid.
- Object inspection.
- Pickup, drop, use, and combine only where meaningful.
- Stable item instance IDs.
- Persistence revisions.
- No crafting system in the first pass.
- Design ownership transfer so future server-side atomic trading does not require replacing item schemas.

## 13. Marker drawings

Store vector strokes:

```ts
interface SurfaceMark {
  id: string;
  creatorId: string;
  surfaceId: string;
  shiftEpoch: number;
  points: Array<[number, number]>;
  thickness: number;
  ink: "black" | "red" | "blue";
  scope: "personal" | "echo" | "encounter" | "canonical";
  createdAt: number;
  expiresAt?: number;
  revision: number;
}
```

Initial limits:

- 256 sampled points per mark.
- 2 KB compressed target per mark.
- 6 active marks per player per cell.
- 20 new marks per account per server day in Connected mode.
- No image uploads.
- Draw only on approved surfaces.
- Unstable marks may distort or disappear after a shift.
- Manila Room marks are shared and reportable.

## 14. Timeline

### World Day

Derived from an authoritative epoch in Connected mode. Local developer override may exist only in World Lab.

### Exposure Day

Prototype formula:

```text
novel topology steps / 10,000
+ repeated topology steps / 100,000
+ stable authoritative seconds / 86,400
```

Route novelty is determined from recently traversed topology edges, not raw client step count.

Connected mode hardening:

- Server clock.
- Server movement validation.
- Speed and teleport checks.
- Monotonic revisions.
- No client API for writing totals.
- Offline characters cannot upload authoritative exposure.

## 15. Content gates

Initial defaults:

- Day 0 / Exposure 0: Baseline Lobby, Manila Room, Level 1 transition.
- Day 3 / Exposure 1: Arch Rooms and Pillar Fields.
- Day 7 / Exposure 2: Blackout Zones, Hole Sections, Level 27 and Level 483 thresholds.
- Day 14 / Exposure 3: Level 13 and Level 14 thresholds.
- Day 21 / Exposure 4: Renovation thresholds and sublevel hooks.
- Day 28 / Exposure 5: Red Room hooks, deep regions, optional legacy breach events.

All gates must be data-driven and editable in World Lab.

## 16. Exit registry

Initial destination IDs:

- Level 1.
- Level 2 through Manila Room.
- Level 13.
- Level 14.
- Level 27.
- Level 483.
- The Void as heavily restricted failure state.
- Level 0.22 hook.
- Level 0.23 hook.
- Level 0.99 hook.
- Red Rooms hook.
- Additional disabled registry entries for later expansion.

Exit triggers:

- Gradual architectural transition.
- Long Manila Room wait or shared departure.
- Weak wall breach.
- Floor breach.
- Emergency exit.
- Greenhouse-style door.
- Labelled renovation door.
- Rare anomaly object.
- Deep-distance traversal gate.

Destination levels may begin as small transition capsules. Save the pending transition so full destination implementations can replace the capsule later.

## 17. Manila Room

Initial client vertical slice may implement it locally as a stable special room.

Future Connected behaviour:

- Encounter director prefers occupied rooms with waiting players.
- Soft population 1–3.
- Hard cap around 6.
- Text chat.
- Shared dropped items.
- Shared markers.
- Reconnection reservation.
- No visible matchmaking UI.
- Players enter and leave naturally through doors or occlusion events.
- Stable time advances normally.

## 18. Hallucination events

Baseline Level 0 has no routine physical entity.

Allowed events:

- Distant silhouette.
- Footsteps that copy the player.
- Brief movement beyond an opening.
- Growl without source.
- Familiar but non-actionable voice fragment.
- Shadow behind translucent material.
- Light failure suggesting movement.
- Object apparently moved after occlusion.

Never present a bot as a real player.

Hounds:

- Disabled by default.
- Future rare breach event.
- Deep or blackout zones only.
- Never required for progression.
- Not part of the ordinary gameplay loop.

Facelings:

- Do not spawn in baseline Level 0.
- Reserve real Facelings for later populated levels.

## 19. World Lab

Create an in-browser developer panel with:

- Seed input.
- Regenerate/reset.
- Zone override.
- World Day override in local development only.
- Exposure override in local development only.
- Room/corridor density.
- Loop and dead-end weights.
- Shift rate.
- Item spawn weights.
- Starter roll simulation.
- Exit affinity and gate controls.
- Lighting and fog parameters.
- Audio layer levels.
- Loaded cell visualization.
- Top-down topology graph.
- Performance counters.
- Save/export current content profile as JSON.
- Import profile JSON.
- Clearly prevent developer overrides in production Connected mode.

## 20. Definition of done for the first vertical slice

- Public browser-ready production build.
- Deterministic endless-feeling Level 0.
- Reliable movement and collision.
- Streaming and unloading.
- Sparse deterministic loot.
- Random one-time starter roll.
- Persistent inventory.
- Functional flashlight, battery, Almond Water, and marker.
- Data definitions for all initial objects.
- Limited vector drawing.
- World Day and Exposure Day prototype.
- Peripheral shift prototype.
- Manila Room special room.
- Exit registry and several threshold visuals.
- Hallucination system.
- World Lab.
- Tests for seed determinism, starter roll stability, save migration, and exit gate evaluation.
- Honest documentation of stubs and deferred systems.
