# MASTER IMPLEMENTATION PROMPT — PROJECT NOCLIP ITERATION 2

You are the product director, game systems architect, procedural-generation engineer, PlayCanvas/rendering engineer, gameplay engineer, technical artist, QA engineer, performance engineer, security reviewer, multiplayer/economy architect, documentation owner, GitHub maintainer, and Vercel release owner for Project Noclip.

## Mission

Turn the verified systems-first Level 0 foundation into a visually credible and performance-conscious playable alpha without weakening deterministic world authority or sparse-object design.

Read `docs/CURRENT_STATE.md` first. It distinguishes complete, partial, deferred, and unverified systems. Do not rebuild verified world-core systems unless a measured defect requires it.

## Highest-value objectives

### 1. Verify and harden the real PlayCanvas renderer

- Install dependencies normally and run the actual Vite/PlayCanvas build.
- Test the deployed/public build in Chromium with console/page-error capture.
- Replace any API assumptions exposed by the real package.
- Verify pointer lock, camera movement, resize, pause, WebGL fallback, and direct refresh.
- Add a clear unsupported-WebGL failure screen rather than a blank canvas.

### 2. Reduce render cost

- Measure real draw calls, entities, triangles, frame time, and memory during a long traversal.
- Replace per-cell primitive duplication with shared meshes, batching, instancing, or a compact module renderer.
- Preserve stable surface IDs for collision and marker placement.
- Keep loaded render work bounded by active radius.
- Move deterministic cell generation to a Web Worker only if profiling proves main-thread stalls; do not add worker complexity without evidence.

Acceptance target: the default active radius remains playable on an ordinary integrated-GPU laptop and does not accumulate render entities or memory while walking continuously.

### 3. Improve Level 0 visual identity

- Add an original procedural/material-based wallpaper, damp carpet, ceiling grid, and fluorescent fixture treatment.
- Strengthen arch, pillar, blackout, Manila, and exit-threshold silhouettes.
- Use fog, exposure, light variation, and room-scale composition rather than heavy post-processing.
- Maintain reduced-flicker and reduced-motion safety.
- Do not add a routine monster.

### 4. Finish the object loop

Complete or substantially improve:

- Connected marker strokes rather than point-like dots.
- Safe note writing with strict length/HTML sanitization.
- Rendered limited string trails that can be invalidated by shifts.
- Glow-stick time decay and persistent remaining duration.
- Pry-tool interactions with explicitly tagged weak surfaces/containers.
- More legible pickup/drop object presentation.

Preserve stable item IDs, revisions, ownership, origin, persistence, and future atomic-trade boundaries.

### 5. Deepen navigation and exits

- Add a top-down debug topology view to World Lab.
- Add tuning-profile JSON import with schema validation and size limits.
- Make at least four exit threshold types visually distinct and testable through gate bypass.
- Create small transition capsules for Level 1 and one non-Level-1 destination while keeping full levels deferred.
- Verify saved pending transitions survive reload.

### 6. Persistence and robustness

- Add tests for restricted-origin fallback, malformed imported tuning, duplicate dropped items, and save recovery.
- Add schema migration fixtures.
- Prevent overlapping save writes or stale revisions.
- Verify a fresh save, reload, reset, and continued journey in the real browser.

## Multi-role review cadence

After each subsystem, review product fit, dependency direction, deterministic replay, persistence, gameplay feel, performance, abuse surface, accessibility, and tests. Fix material issues before expanding scope.

Testing remains continuous:

```text
npm install
npm run typecheck
npm test
npm run benchmark
npm run build
```

Also run an actual-browser smoke test and a long traversal. Capture fixed seeds for every generator defect. Never weaken tests merely to make them pass.

## Scope exclusions

Do not implement production Nakama multiplayer, subscriptions, voice, crafting, base building, routine Hound encounters, Facelings in Level 0, or full destination levels during this iteration.

## Git and deployment

Keep `main` runnable. Use focused commits for verified milestones. Deploy the client to the `project-noclip` Vercel project and verify the public deployment, direct refresh, console, and core interaction path. Vercel remains client-only.

## Mandatory closure

Before finishing:

1. Update `docs/CURRENT_STATE.md` with branch/commit, working commands, exact test and benchmark results, real-browser findings, deployment status, complete/partial/deferred systems, known defects, performance findings, and next three tasks.
2. Review `docs/VISION.md` and add only durable lessons.
3. Synchronize `docs/LEVEL_0_SPEC.md`, `docs/DECISIONS.md`, and `docs/CONTENT_NEEDED.md`.
4. Rewrite this file into the executable prompt for Iteration 3, grounded in verified final state.
5. Run final verification after documentation changes, then commit and push the handoff.

The repository is the project memory. No essential result may remain only in chat.
