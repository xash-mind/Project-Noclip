# MASTER IMPLEMENTATION PROMPT — PROJECT NOCLIP LEVEL 0 FOUNDATION

You are the delivery engineer, game systems architect, procedural-generation engineer, gameplay engineer, technical artist, multiplayer/economy architect, QA engineer, performance engineer, security reviewer, documentation owner, GitHub maintainer, and deployment owner for **Project Noclip**.

Today is August 3, 2026.

Your job is to perform the largest safe, high-quality first implementation pass possible in `xash-mind/Project-Noclip` without losing the architecture required for future multiplayer, trading, additional levels, and regional infrastructure.

Do not merely recommend or plan. Inspect the repository, implement a runnable vertical slice, test while building, commit verified milestones, push the work, and deploy the client when access permits.

## 1. Read project memory first

Read these files before changing code:

1. `docs/CURRENT_STATE.md`
2. `docs/VISION.md`
3. `docs/LEVEL_0_SPEC.md`
4. `docs/DECISIONS.md`
5. `docs/CONTENT_NEEDED.md`
6. `START_BUILD_PROMPT.md`

Treat them as authority. Resolve contradictions by prioritizing current verified state, then locked decisions, then the Level 0 specification, then the long-term vision.

Preserve valid existing work. Never claim a build, test, push, browser verification, or deployment succeeded unless it was actually verified.

## 2. Delivery target

Repository:

```text
xash-mind/Project-Noclip
```

Target browser deployment:

```text
https://project-noclip.vercel.app
```

If the exact Vercel slug is unavailable, record the conflict. Do not silently choose a different public identity.

Vercel hosts the browser client only. Do not attempt to host a future authoritative Nakama server on Vercel.

## 3. Product objective

Build the first playable **Project Noclip — Level 0 Alpha**.

The experience must prioritize:

- Vast deterministic procedural space.
- Internal consistency.
- Long periods of emptiness.
- Sparse found objects.
- Unequal inventories and future reasons to trade.
- Environmental uncertainty.
- Persistent traces and object state.
- World evolution through World Day and Exposure Day.
- Rare human connection centered on the Manila Room.
- Multiple possible exits.
- Browser accessibility over photorealism.

Level 0 is not a routine monster chase or combat tutorial. The environment is the primary antagonist.

## 4. Scope strategy

Produce a polished local/offline vertical slice that is:

- Playable.
- Deterministic.
- Streamed.
- Persistent.
- Sparse in objects.
- Trade-ready at the item schema level.
- Multiplayer-ready at command, event, and authority boundaries.
- Deployable to Vercel.

Create clean future Nakama boundaries and documentation, but do not make the client depend on a deployed backend.

Do not spend this iteration on production Asia-wide multiplayer, subscriptions, proximity voice, crafting, base building, routine combat, or full destination levels.

## 5. Technology direction

Use:

- TypeScript.
- Vite.
- PlayCanvas Engine installed from npm.
- DOM-based menus, HUD, inventory, and developer tools.
- Vitest or an equivalent lightweight test runner.
- IndexedDB behind a typed persistence adapter.
- Explicit seeded random generators.
- Vercel-compatible static production output.

Use strict TypeScript.

Never use `Math.random()` for world generation, starter rolls, loot, exits, stable IDs, or persistent events.

Do not make PlayCanvas scene objects the canonical world state.

Create a pure TypeScript world core with no imports from PlayCanvas, browser DOM APIs, Vercel, Nakama, IndexedDB, or a particular renderer/backend provider.

Use boundaries such as:

```ts
interface GameAuthority {
  createOrLoadCharacter(): Promise<CharacterSnapshot>;
  submitCommand(command: ClientCommand): Promise<void>;
  subscribe(listener: (event: ServerEvent) => void): () => void;
}
```

Implement a local authority adapter now. Preserve a future Nakama adapter boundary.

## 6. Multi-role execution model

Work as one accountable delivery agent while deliberately rotating through these roles. Do not produce disconnected plans; apply each role as a review lens over the same implementation.

### Product director

- Protect emptiness, uncertainty, scarce objects, and rare human connection.
- Reject scope that weakens the Level 0 vertical slice.
- Prefer one complete loop over many unfinished systems.

### Game systems architect

- Protect deterministic seeds, stable IDs, versioned schemas, renderer independence, persistence deltas, and future server authority.
- Review dependency direction after every major subsystem.

### Procedural world engineer

- Own topology, connector contracts, module grammar, zone profiles, streaming, shifting, landmarks, and exits.
- Add deterministic tests before increasing generator complexity.

### Gameplay engineer

- Own movement, collision, interactions, inventory, item use, marker drawing, and timeline feedback.
- Keep a playable path after every meaningful change.

### Technical artist and atmosphere designer

- Tune room scale, materials, lighting, fog, audio, and repetition.
- Prefer original procedural or licence-safe temporary assets.
- Expose tuning in World Lab rather than burying constants.

### Multiplayer and economy architect

- Protect commands/events, item ownership, encounter-cell data, chat boundaries, and atomic future trades.
- Do not prematurely implement production multiplayer.

### QA and reliability engineer

- Define observable acceptance conditions before each subsystem.
- Test during implementation, not only at the end.
- Reproduce generator and persistence failures with fixed seeds.

### Performance engineer

- Monitor draw calls, triangles, loaded cells, generation time, disposal, memory growth, and long-walk stability.
- Reject work that scales each frame with total generated history.

### Security and abuse reviewer

- Treat future Connected World clients as untrusted.
- Bound marker data, note text, imported settings, save parsing, and developer overrides.
- Keep secrets out of the client bundle.

### Documentation and release owner

- Keep repository memory truthful.
- Commit verified states only.
- Complete the deployment and next-iteration handoff.

After every significant subsystem, perform a brief cross-role review covering product fit, architecture, deterministic behavior, persistence, gameplay, performance, abuse surface, tests, and documentation. Fix material problems before expanding scope.

## 7. Suggested code organization

Prefer a simple structure with strict dependency direction:

```text
src/
  app/
  engine/
  renderer/
  world/
  generation/
  simulation/
  items/
  inventory/
  interactions/
  persistence/
  protocol/
  content/
  audio/
  ui/
  developer/
  adapters/
  tests/
content/
services/
  nakama/
docs/
```

A monorepo is not required for the first pass. Do not spend the day constructing empty workspace packages. Conceptual boundaries matter more than folder ceremony.

## 8. Boot and controls

Create a restrained title/start flow:

- New local character.
- Continue existing character.
- Optional explicit seed for development.
- Essential controls only.
- Fast entry into Level 0.
- No large lore dump.

Implement reliable first-person controls:

- Pointer lock.
- WASD.
- Mouse look.
- Walk.
- Sprint.
- Crouch if stable.
- Gravity and collision.
- Basic step handling.
- Pause on pointer unlock.
- Configurable sensitivity.
- Subtle optional head bob.
- Reduced-motion and reduced-flicker options.

Movement quality takes priority over spectacle.

## 9. Procedural Level 0

Build an endless-feeling deterministic streamed world.

Minimum reusable module vocabulary:

- Small, medium, and long rooms.
- Straight and corner corridors.
- T-junction and four-way junction.
- Dead end.
- Offset opening.
- Pillar room.
- Arch landmark.
- Rare large chamber.
- Manila Room special module.
- Exit threshold modules.

Implement data-driven zone profiles for at least:

- Baseline Lobby.
- Arch Rooms.
- Pillar Fields.
- Blackout prototype.
- Hole Section visual/safe prototype.
- Manila Room.
- Exit Threshold.

Add disabled or partial hooks for:

- Waterlogged Threshold.
- Renovation Threshold.
- Red Rooms.
- Deep Regions.

Zone profiles control topology weights, scale, loops/dead ends, lighting, fog, wetness, audio, shift rate, loot weights, hallucination rate, exit affinity, and timeline gates.

The same seed must reproduce the same untouched topology.

## 10. Streaming and performance

Use an active cell/chunk radius plus a topology prefetch ring.

Unload distant:

- Render entities.
- Colliders.
- Lights.
- Audio emitters.
- Temporary interactions.

Regenerate static world data from seeds. Persist only deltas.

Use shared geometry, materials, batching, or instancing for repeated architecture.

Expose in World Lab:

- Loaded cell count.
- Generation time.
- Draw calls.
- Triangle count.
- Approximate memory or object counts.

Include a fixed-seed long-walk diagnostic and batch generator validation.

## 11. Objects are found, not universally granted

### One-time starter roll

A new character receives:

- 15% chance: no object.
- 60% chance: one random object.
- 25% chance: two compatible random objects.

Make all values and weights data-driven.

Starter pool:

- Flashlight.
- Battery.
- Almond Water.
- Permanent marker.
- Paper note.
- Glow stick.
- String spool.
- Empty bottle or can.
- Pry tool at very low weight.

Rules:

- Persist the roll immediately.
- Refreshing cannot reroll the character.
- Avoid exact duplicates.
- Allow incomplete combinations such as battery without flashlight.
- Avoid two high-value tools together.
- Do not present this as a loot-box animation.

### Sparse world loot

All starter objects must also be discoverable through deterministic loot nodes.

Most candidate nodes should yield nothing.

Possible locations:

- Cardboard boxes.
- Empty cabinets.
- Loose ceiling tiles.
- Failed lights.
- Plastic chairs.
- Dead ends.
- Arch recesses.
- Threshold anomalies.
- Manila Room supply traces.

Each spawned object is a persistent stable item instance.

## 12. Trade-ready item model

Use an item instance schema equivalent to:

```ts
interface ItemInstance {
  instanceId: string;
  definitionId: string;
  condition: number;
  charge?: number;
  quantity: number;
  owner:
    | { type: "character"; id: string }
    | { type: "world"; addressId: string; containerId?: string }
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

Implement pickup, drop, inspect, equip/use where relevant, and persistence.

Do not build trading UI yet. Document that future Connected World trades require atomic server-side ownership transfer or escrow.

## 13. Initial item behavior

### Flashlight

- Toggleable beam.
- Persistent charge and condition.
- Low-charge flicker.
- Can reveal selected marks or exit hints.
- Not a weapon.

### Battery

- Restores compatible flashlight charge.
- Condition affects useful energy.

### Almond Water

- Restores hydration.
- Mildly reduces distortion.
- Has condition/freshness.
- Does not fully heal every state.

### Marker

- Enables limited freehand vector strokes on tagged surfaces.
- Has an ink/stroke budget.

### Paper note

- Short editable text.
- Can be dropped.
- Local in this iteration, but scope-ready for future echoes/encounters.

### Glow stick

- One-time activation.
- Temporary light.
- Droppable breadcrumb.

### String spool

- Simple limited route trail or anchor-to-anchor line.
- May be invalidated by topology shifts.

### Empty bottle/can

- Throwable positional sound source and breadcrumb.

### Pry tool

- Rare.
- Enables selected wall, floor, vent, or container interactions.
- Does not open every exit.

If time is constrained, fully complete flashlight, battery, Almond Water, marker, pickup/drop, and persistence first. Keep the remaining item definitions architecturally complete and minimally interactable.

## 14. Inventory

Create a compact scarcity-oriented inventory:

- Small capacity.
- Pickup/drop.
- Inspection.
- Condition/charge.
- Equipped item.
- Stable item IDs.
- Save revisions.
- No crafting tree.

World Lab may include developer-only spawning; production UI must not.

## 15. Marker drawing

Allow drawing only on surfaces with stable drawable-surface IDs.

Store limited vector strokes, not images.

Initial limits:

- 256 sampled points per mark.
- About 2 KB compressed target.
- Six active marks per character per cell.
- Three ink colors.
- Limited interaction distance.
- No image uploads, pasted images, or arbitrary HTML.

Unstable marks bind to shift epoch and may distort, move, or disappear when their surface changes. Manila Room surfaces must be schema-ready for shared encounter marks.

## 16. Persistence

Use IndexedDB behind a typed adapter.

Persist:

- Character ID and seed.
- One-time starter roll.
- Position and logical address.
- Inventory and item instances.
- Loot node deltas.
- Dropped objects.
- Flashlight state.
- Marker strokes.
- World Day authority snapshot/configuration.
- Exposure progress and traversal summary.
- Shift history.
- Exit discoveries.
- Save/content version.

Add migration infrastructure from version 1.

Test fresh save, reload, reset, migration, malformed data handling, and duplicate-item prevention.

## 17. World Day and Exposure Day

### World Day

Create a configurable launch epoch and authority interface.

Local mode may calculate from UTC and expose a development-only override. Connected mode will later use server time.

### Exposure Day

Use a hybrid prototype:

```text
novel traversal units / 10,000
+ repeated traversal units / 100,000
+ stable seconds / 86,400
```

In disorienting space, count topology edge/cell novelty rather than trusting a raw step counter. Recent loops count much less. Impossible speed or unauthorized teleports count nothing.

In stable space such as Manila Room, use elapsed authority time.

Display a restrained status:

```text
PROJECT NOCLIP
WORLD AGE: DAY ####
EXPOSURE: DAY ####.##
LOCATION: LEVEL 0 / UNRESOLVED
STABILITY: LOW | VARIABLE | STABLE
```

Do not imply local progression is cheat-proof. Document that Connected World enforcement requires server authority and separate characters.

## 18. Content gates

Implement data-driven defaults:

- World Day 0 / Exposure 0: Baseline Lobby, Manila Room, Level 1 transition.
- Day 3 / Exposure 1: Arch Rooms and Pillar Fields.
- Day 7 / Exposure 2: Blackout and Hole prototypes, Level 27 and 483 thresholds.
- Day 14 / Exposure 3: Level 13 and 14 thresholds.
- Day 21 / Exposure 4: Renovation hooks.
- Day 28 / Exposure 5: Red Room/deep-region hooks and optional legacy breach flags.

World Lab may bypass these locally.

## 19. Peripheral shifting

Implement a credible first topology-shift system.

A cell can shift only when:

- Unoccupied.
- Outside direct view.
- Outside the protected return radius.
- Not stable, rendezvous, or locked.
- No protected interaction is active.
- A viable continuation path remains.

Possible first shifts:

- Compatible corridor replacement.
- Corridor length change.
- Unobserved doorway move.
- Junction variant replacement.
- Lighting-state change.
- Exit candidate insertion.
- Marker distortion/invalidation on replaced surfaces.

Never visibly pop ordinary geometry in front of the player.

Persist shift epochs and events so reload reproduces altered history.

## 20. Manila Room

Implement the Manila Room as a rare stable special module.

This iteration should include:

- Stable geometry.
- Normal time-based Exposure advancement.
- Reduced ambience.
- Shared-space-ready item drop points.
- Shared-marker-ready surfaces.
- A waiting/seat interaction.
- Exit hooks toward Level 1 and Level 2.
- A stable encounter-cell ID in data.

Do not fake other players.

Create protocol/service interfaces for future waiting status, presence, text chat, shared drops, shared marks, companion departure, and reconnection.

## 21. Exits

Create a data-driven exit registry containing:

- Level 1.
- Level 2 through Manila Room.
- Level 13.
- Level 14.
- Level 27.
- Level 483.
- The Void, disabled or heavily restricted.
- Level 0.22 hook.
- Level 0.23 hook.
- Level 0.99 hook.
- Red Rooms hook.

Threshold forms should include:

- Gradual architectural transition.
- Weak wall breach.
- Floor breach.
- Emergency exit.
- Greenhouse-style door.
- Labelled renovation door.
- Flickering/collision-anomalous wall.
- Manila Room wait/departure.

In development mode, make at least three non-Level-1 thresholds testable.

Destinations may begin as transition capsules or clearly marked unavailable boundaries, but discovered exits and pending transitions must persist in a future-compatible format.

## 22. Hallucinations and entities

Baseline Level 0 has:

- No routine Hound.
- No routine Faceling.
- No required combat.
- No bot masquerading as a human player.

Implement ambiguous anchors such as:

- Distant silhouette.
- Synchronized footsteps.
- Brief movement through an opening.
- Growl without source.
- Shadow behind translucent material.
- Light failure implying movement.
- Non-instructional familiar voice placeholder.
- Object apparently displaced after occlusion.

Define a disabled Hound feature flag and future entity policy for rare deep/blackout breach events. Actual Facelings are reserved for later populated levels.

## 23. Audio and atmosphere

Use original or licence-safe temporary assets.

Implement layered fluorescent hum, fixture variation, damp footsteps, room-size ambience differences, rare distant impacts/scratches, blackout silence, exit muffling, volume controls, and mute.

Avoid constant VHS effects, heavy chromatic aberration, unavoidable intense flicker, and excessive camera shake.

Record missing final assets in `docs/CONTENT_NEEDED.md`.

## 24. World Lab

Build an in-browser developer overlay for instant iteration:

- Seed entry and regeneration.
- New character/reset.
- Zone override.
- Development World Day and Exposure overrides.
- Starter-roll simulation and distribution statistics.
- Item/loot testing.
- Room/corridor density.
- Loop/dead-end weights.
- Shift rate.
- Exit affinity and gate bypass.
- Lighting/fog/audio tuning.
- Loaded-cell visualization.
- Top-down topology graph.
- Current address and seed.
- Performance counters.
- Export/import content settings JSON.

Hide behind a development flag or shortcut. Future Connected authority must ignore all client developer overrides.

## 25. UI

Create a restrained non-shooter interface:

- Start/continue.
- Pause.
- Small interaction reticle.
- Interaction prompt.
- Compact inventory.
- Item inspection.
- Contextual flashlight/battery indicator.
- Subtle hydration/distortion feedback.
- Timeline watch.
- Settings.
- Save reset with confirmation.
- Development World Lab.

Ensure overlays prevent gameplay input leakage and work after pointer unlock/resize.

## 26. Protocol and future backend skeleton

Create versioned shared command/event types for movement, interaction, drawing, pickup/drop/use, exit entry, waiting status, and local chat, plus snapshots, timeline, inventory, ownership, shift, trace, presence, chat, exit, and transition events.

Create `services/nakama/README.md` describing:

- Nakama + PostgreSQL roles.
- Why Vercel does not host the authoritative server.
- Future Docker Compose development.
- Character and item authority.
- Atomic trade escrow/transfer.
- Manila Room encounter match.
- Server World Day and Exposure validation.
- Chat/moderation.
- Regional routing later.

Do not add fragile fake backend code simply to appear complete.

## 27. Test continuously

For every major subsystem:

1. Define its observable acceptance condition.
2. Add or update a focused automated test first when practical.
3. Implement the smallest complete path.
4. Run focused tests.
5. Run and inspect the game in a browser.
6. Check deterministic replay, save/reload, performance, and regressions.
7. Commit only when the milestone is runnable.

Mandatory cadence:

- After scaffold: install, typecheck, test, build, and boot.
- After movement: collision, pointer lock, pause, resize, long walk.
- After generation: fixed-seed tests and batch seed validator.
- After persistence: fresh save, reload, migration, reset, malformed data.
- After items: ownership, pickup/drop, condition/charge, save/reload, starter-roll permanence.
- After shifting: observation guard, stable immunity, path preservation, deterministic replay.
- After UI: input isolation, resize, pause, settings.
- Before meaningful commits: focused tests and production build.
- Before handoff: full typecheck, tests, build, browser smoke test, and long procedural traversal.

Minimum automated coverage:

- Seed determinism.
- Stable ID derivation.
- Starter distribution logic and no reroll.
- Duplicate compatibility rules.
- Loot node determinism.
- Save serialization and migration.
- Item ownership transitions.
- Timeline gate evaluation.
- Exposure novelty weighting.
- Exit registry validation.
- Shift eligibility.
- World core has no renderer imports.

Fix root causes. Do not weaken tests to obtain green output. Record genuine deferred failures honestly.

## 28. Git and deployment

Keep `main` runnable.

Use a focused branch such as `agent/level-0-foundation` when practical. Preserve unrelated changes. Use meaningful commits for complete milestones.

Run at minimum:

```text
npm install
npm run typecheck
npm test
npm run build
```

Configure Vercel static deployment, SPA fallback if required, hashed asset caching, environment documentation, and no embedded secrets.

Verify the deployed page loads, starts, and survives direct refresh. Record the exact URL.

When Vercel access is unavailable, verify the local production output and document the exact blocker and next step. Do not claim deployment.

## 29. Priority order

When tradeoffs are required:

1. Reliable movement and rendering.
2. Deterministic generation and streaming.
3. Persistence and stable IDs.
4. Sparse found items and starter rolls.
5. Flashlight, Almond Water, marker, and inventory.
6. World Lab.
7. Timeline and shifting.
8. Manila Room and exits.
9. Additional object polish.
10. Backend documentation/skeleton.

## 30. Definition of done

The first pass is complete only when:

- The production build runs.
- The player can explore an endless-feeling Level 0.
- Fixed seeds reproduce untouched geography.
- Distant cells unload.
- Starter objects roll once with zero/one/two-item scarcity.
- World objects can be found.
- Inventory and key item states persist.
- Flashlight, battery, Almond Water, and marker function.
- Remaining initial objects exist in data and have useful minimal interactions.
- Marker strokes are limited and persistent.
- World Day and Exposure Day work with stable/unstable differences.
- Topology shifts outside observation.
- Manila Room exists as stable architecture.
- Multiple exits are represented and not all lead to Level 1.
- Hallucinations exist without routine entities.
- World Lab speeds design.
- Tests pass or deferred failures are explicitly documented.
- Git state is clean and pushed when access exists.
- Vercel deployment is verified when access exists.

## 31. Mandatory iteration closure

Before the final commit and response:

1. Update `docs/CURRENT_STATE.md` from verified facts.
   - Branch and latest commit.
   - Commands that work.
   - Test/build/browser results.
   - Complete, partial, stubbed, deferred, and broken systems.
   - Deployment URL/status.
   - Known defects and performance findings.
   - Next three highest-value tasks.

2. Review and update `docs/VISION.md`.
   - Preserve the thesis.
   - Add durable lessons only.
   - Correct assumptions disproven by implementation.
   - Do not turn it into a changelog.

3. Update `docs/LEVEL_0_SPEC.md`, `docs/DECISIONS.md`, and `docs/CONTENT_NEEDED.md` wherever implementation changed their truth.

4. Rewrite this `MASTER_BUILD_PROMPT.md` for the **next iteration**.
   - Preserve enduring product constraints, architecture, and quality requirements.
   - Remove completed instructions that are no longer useful.
   - Replace them with the next highest-value concrete objective.
   - Ground the new prompt in final `CURRENT_STATE.md`.
   - Include acceptance criteria, continuous testing, Git/deployment work, and this same closure requirement.
   - Make it executable by a fresh build chat without this conversation.

5. Update `START_BUILD_PROMPT.md` only if the launcher needs to change.

6. Run final verification after documentation and prompt updates, then commit and push the complete handoff.

The repository is the durable project memory. No important decision, blocker, result, or next step may exist only in chat.

Begin now by inspecting the repository, establishing the runnable client, and completing the largest verified Level 0 vertical slice possible without sacrificing architectural integrity.
