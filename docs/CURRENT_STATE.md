# Project Noclip — Current State

**Last updated:** 2026-08-03  
**Repository:** `xash-mind/Project-Noclip`  
**Default branch:** `main`  
**Target client domain:** `https://project-noclip.vercel.app`

## 1. Verified repository state

- The GitHub repository is accessible and writable.
- The repository was created empty and has now been initialized with the complete planning, specification, launcher, and iterative build-handoff documentation.
- `MASTER_BUILD_PROMPT.md` is committed and ready to drive the first implementation iteration.
- No game client, package manifest, runtime code, tests, assets, or Vercel deployment have been created yet.
- No implementation, build, browser test, performance result, or deployment should be treated as complete.

## 2. Documents currently established

- `README.md`
- `START_BUILD_PROMPT.md`
- `MASTER_BUILD_PROMPT.md`
- `docs/VISION.md`
- `docs/LEVEL_0_SPEC.md`
- `docs/DECISIONS.md`
- `docs/CONTENT_NEEDED.md`
- `docs/CURRENT_STATE.md`

## 3. Product decisions already made

- Project Noclip is a long-term living Backrooms game.
- Level 0 is the first implementation.
- Browser delivery is the initial platform.
- The game prioritizes consistency, detailed worldbuilding, scale, atmosphere, persistence, and rare human encounters over high-end graphics.
- The initial client stack is TypeScript, Vite, and PlayCanvas Engine in a repo-first workflow.
- Core world generation and simulation must remain independent of PlayCanvas.
- The future connected backend direction is Nakama plus PostgreSQL, but the first client must remain runnable without a deployed backend.
- Vercel hosts the browser client, not the eventual authoritative game server.
- Offline and Connected World characters will be separate.
- Level 0 normally isolates players; the Manila Room is the primary realtime rendezvous.
- Ordinary Level 0 should not use routine Hound or Faceling encounters.
- Items are primarily found rather than granted universally.
- A new character has a tunable chance to begin with no item, one item, or two compatible random items.
- Inventory and item instances must be designed for future trading.
- Project Noclip uses World Day and Exposure Day progression.
- Marker drawings are limited, vector-based, persistent according to spatial stability, and moderation-ready.
- Every build iteration must test continuously and end by updating project memory and rewriting the next build prompt.

## 4. Intended starter item probabilities

These are initial tunable defaults:

- 15% no starter object.
- 60% one starter object.
- 25% two compatible starter objects.

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

- Starter selection is deterministic from the character seed or authoritative server roll.
- Refreshing cannot reroll a connected or persisted local character.
- Duplicate starter objects are normally prevented.
- Some combinations are intentionally incomplete, such as receiving a battery without a flashlight.
- All objects also exist as discoverable world loot.
- Valuable objects remain scarce.

## 5. Immediate milestone

Create the first polished Level 0 vertical slice and deployable foundation.

The first implementation pass should include:

- Vite + TypeScript project.
- PlayCanvas Engine client.
- First-person movement and pointer lock.
- Procedural deterministic Level 0.
- Chunk streaming and unloading.
- Basic collision.
- Fluorescent lighting and spatial ambience.
- Baseline room, corridor, junction, and rare landmark modules.
- Seeded sparse item nodes.
- Random one-time starter roll.
- Inventory and item persistence.
- Flashlight and battery.
- Almond Water.
- Marker drawing on approved surfaces.
- Notes, glow sticks, string, empty containers, and pry tool as data-driven objects.
- IndexedDB or equivalent local persistence.
- World Day and Exposure Day prototype.
- Peripheral shifting outside observation.
- Exit threshold registry and visual stubs.
- Manila Room placeholder or local special room.
- Hallucination event system.
- World Lab developer panel.
- Unit tests, browser smoke testing, and build verification.
- Vercel-ready configuration.
- Updated documentation and next-iteration prompt.

## 6. Acceptance criteria for the first pass

- `npm install`, `npm run typecheck`, `npm test`, and `npm run build` work.
- A player can enter first person and explore.
- The world continues generating without a visible hard boundary.
- The same seed recreates the same untouched topology.
- Distant cells unload and ordinary traversal does not create unbounded memory growth.
- A new character receives the starter roll only once.
- Items can be discovered, picked up, dropped, inspected, and restored after reload.
- Flashlight charge persists.
- Marker strokes are limited and persist according to the current shift epoch.
- World Day uses an authority abstraction rather than trusting arbitrary client writes.
- Exposure progress is derived from route novelty in unstable zones and elapsed authority time in stable zones.
- Architecture shifts only outside observation and protected stable regions.
- Several exits exist in the registry, even when destinations are transition capsules.
- Production output is suitable for Vercel static deployment.
- No routine enemy chase is introduced.
- Documentation distinguishes complete, partial, stubbed, deferred, and broken systems honestly.

## 7. Recommended initial structure

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
docs/
content/
services/
  nakama/
```

A simpler structure is acceptable when it preserves dependency direction and increases delivery speed.

## 8. Known risks

- The exact Vercel project slug may be unavailable.
- Browser memory and draw calls can become limiting if modules are not instanced and unloaded correctly.
- Freehand marker data can become abusive or too large without strict quotas.
- Procedural generation may look repetitive if topology, material variation, and landmarks are not independently controlled.
- Client-only progression is modifiable; Connected World authority must eventually live on the server.
- ShareAlike and third-party asset licensing requires a canon and asset ledger.
- Attempting production multiplayer during the first vertical slice will reduce world quality.
- PlayCanvas editor-cloud workflows and a repo-first npm client are different; the first pass intentionally chooses repo-first.

## 9. Deferred systems

- Production Nakama deployment.
- Real accounts and entitlement checks.
- Realtime Manila Room matching.
- Trading UI and atomic server-side trades.
- Regional encounter mesh.
- Proximity voice.
- Subscription billing.
- Full destination levels.
- Hound breach event.
- Facelings.
- Production moderation tools.
- Native client.
- User-created content.

## 10. Latest verified commit

- Branch: `main`
- Latest verified documentation bundle commit before this state update: `fadd98a4a2d6b0b14e19e36aad5ff26b581992bb`
- That commit added `MASTER_BUILD_PROMPT.md` after the remaining project documents were committed.
- No implementation commit exists yet.

## 11. Working commands

None yet. No package manifest exists.

## 12. Current deployment

Not deployed or verified.

## 13. Implemented systems

None. Documentation only.

## 14. Partial or stubbed systems

None in code. Architecture and requirements are specified in documentation.

## 15. Known defects

- No runnable game exists yet.
- No automated tests exist yet.
- No deployment exists yet.

## 16. Next three tasks

1. Execute `START_BUILD_PROMPT.md` and `MASTER_BUILD_PROMPT.md` against this repository.
2. Establish the runnable TypeScript/PlayCanvas foundation, deterministic world core, and continuous test loop.
3. Produce and verify the first Vercel-deployable Level 0 vertical slice, then rewrite the build prompt for the next iteration.

## 17. Mandatory handoff protocol

At the end of every implementation iteration:

- Replace stale statements in this file with verified facts.
- Review `docs/VISION.md` and update only durable product learning.
- Update specifications, decisions, and content requirements where reality changed.
- Rewrite `MASTER_BUILD_PROMPT.md` for the next implementation objective.
- Preserve continuous testing, Git, deployment, and documentation closure in every future prompt.
