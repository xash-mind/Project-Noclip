# Project Noclip

A browser-first living Backrooms project focused on immense deterministic spaces, environmental consistency, scarce found objects, evolving timelines, and rare human connection.

## Current playable foundation

The first Level 0 vertical slice includes:

- First-person browser controls and collision.
- Deterministic streamed Level 0 cells.
- Baseline, arch, pillar, blackout, hole, Manila, and exit-threshold profiles.
- Sparse deterministic loot and one-time 0/1/2-item starter rolls.
- Trade-ready item instances, compact inventory, pickup/drop/use, and local persistence.
- Flashlight, battery, Almond Water, marker strokes, glow sticks, string, cans, notes, and pry-tool hooks.
- World Day, Exposure Day, peripheral shift epochs, multiple exits, hallucination anchors, and World Lab.
- No routine combat or fake multiplayer.

## Run

```bash
npm install
npm run dev
```

Then open the displayed local URL and choose **Begin new local journey**.

## Verify

```bash
npm run typecheck
npm test
node scripts/benchmark.mjs
npm run build
npm run preview
```

## Controls

- `WASD`: move
- `Shift`: sprint
- `C` or `Ctrl`: crouch
- Mouse: look
- `E`: interact/pick up/approach exit
- `F`: use selected object
- `G`: drop selected object
- `M`: marker mode
- `1–6`: select inventory slot
- Backquote: World Lab
- `Esc`: release pointer/pause

## Project memory

Start implementation sessions with [`START_BUILD_PROMPT.md`](START_BUILD_PROMPT.md). The authoritative handoff is [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md), followed by the vision, Level 0 specification, decisions, and content ledger.

Target browser deployment: `https://project-noclip.vercel.app`
