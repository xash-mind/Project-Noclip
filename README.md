# Project Noclip

A browser-first living Backrooms project focused on immense deterministic spaces, environmental consistency, scarce found objects, evolving timelines, and rare human connection.

**Production target:** https://project-noclip.vercel.app

## Start here

Agents and contributors should read, in order:

1. [`AGENTS.md`](AGENTS.md) — repository-specific operating and verification rules
2. [`PROJECT.md`](PROJECT.md) — durable product scope, principles, architecture, and non-goals
3. [`STATUS.md`](STATUS.md) — compact verified current state and exact next action
4. [`docs/VISION.md`](docs/VISION.md) — deeper product thesis
5. Relevant GitHub Issues and Pull Requests
6. The shared playbook and Engineering Standards in [`xash-mind/project-operations`](https://github.com/xash-mind/project-operations)

`docs/CURRENT_STATE.md` is retained as the Iteration 2 historical snapshot. `STATUS.md` is the current accepted-state record going forward.

## Level 0 Generation 3 / 0.3 development

- Continuous world-space Level 0 architecture driven by deterministic multi-scale Fields; Cells are streaming/cache units, never rooms.
- Kilometre-capable Ordinary Level 0, Pillar Field, and Arch Rooms Regions with measured travel-time budgets.
- Blackout Conditions with zero local light/buzz, rare floor-hole Carvers, Manila as one Structure, and exits as Transitions rather than geography.
- Reference-calibrated wallpaper, carpet, suspended ceiling, spatial fixture lighting with restrained bloom, and layered fluorescent ambience.
- Generation-versioned saves: new journeys use `gen3-v1`; existing journeys remain on frozen `gen2` generation.
- Smooth swept-circle wall collision and diagonal sliding.
- Sparse persistent loot and one-time starter rolls.
- Flashlight, batteries, Almond Water, working glow sticks and limited marker strokes.
- Hardcoded environmental notes with a readable document interface.
- World Day + Exposure gates for Regions, Conditions, Carvers, Structures, and Transitions.
- Small Manila Room with one table and a central ledger book.
- IndexedDB persistence with v1→v2 and generation-version migration.
- World Lab controls and locators using the canonical `WORLD.md` vocabulary.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run benchmark
npm run build
npm run preview
```

Use `npm run check` for the complete local quality gate. Node.js `>=22.12.0` is required.

## Work tracking

- Technical tasks and confirmed findings: [GitHub Issues](https://github.com/xash-mind/Project-Noclip/issues)
- Implementation and review: [Pull Requests](https://github.com/xash-mind/Project-Noclip/pulls)
- Full audits: `docs/audits/`
- Durable technical decisions: `docs/adr/`
- Current accepted state: `STATUS.md`

Ordinary project agents do not update Notion. A dedicated portfolio sync copies only meaningful summary changes later.
