# PROJECT NOCLIP — ITERATION 3 EXECUTION BRIEF

Use this file as project-specific Iteration 3 context, not as a replacement for the shared operating system.

## Required orientation

1. Read `AGENTS.md`, `PROJECT.md`, and `STATUS.md`.
2. Read `docs/VISION.md` and relevant existing specs.
3. Read relevant open GitHub Issues and recent Pull Requests.
4. Read the implementation playbook, Engineering Standards, and Run Checklist in `xash-mind/project-operations`.
5. Verify the current repository, deployment, and browser state before trusting this brief.

## Mission

Turn Level 0 Alpha 0.2 into a performance-conscious exploration build with verified browser behaviour, meaningful transition foundations, and stronger spatial storytelling. Preserve verified systems and do not expand scope before release-critical uncertainty is resolved.

## Priority order

1. **Verify installed PlayCanvas in unrestricted Chromium:** pointer lock, textures, fog, spotlight, notes, marker lines, glow-stick lighting, save reload, direct refresh, and source-to-deployment parity. Fix real runtime failures before feature work.
2. **Renderer efficiency:** profile draw calls, entities, memory, and frame time during a sustained traversal. Batch or instance repeated geometry where this preserves stable surface IDs and collision data.
3. **Persistence confidence:** add migration fixtures, save recovery UI, queued revisions, duplicate-drop protection, and fresh-browser/corruption recovery tests.
4. **Planned exploration:** improve district landmarks, transition grammar, rarity budgets, controlled vistas, and repetition metrics without returning to per-cell random zones.
5. **Transition foundations:** build short Level 1 and Level 27 arrival capsules; pending transitions must survive reload without implementing full destination levels.
6. **Object stories:** persistent string trails, editable moderated-note foundations, pryable tagged surfaces, and better item models only after runtime, performance, and persistence are stable.
7. **World Lab:** topology map, district/landmark visualization, strictly validated tuning import, and generation repetition reporting.

## Constraints

- No routine monster or combat loop.
- Offline and future Connected World authority remain separate.
- Do not weaken World Day or Exposure gates to expose content; use World Lab bypasses for testing.
- No production multiplayer, voice, subscriptions, or user-uploaded images yet.
- Keep `main` runnable and promote only the same source that passed preview verification.
- Select coherent work based on priority, dependencies, risk, rollback, and verification scope; do not bundle unrelated features.

## Required workflow

- Represent selected work with GitHub Issues and acceptance criteria.
- Use an issue-specific branch and Pull Request.
- Run strict typecheck, deterministic/system tests, generator benchmark, production build, browser smoke, save/reload and relevant long-traversal profiling.
- Record exact evidence, remaining risk, preview/production source, and rollback in the Pull Request.
- Update `STATUS.md` with accepted verified state only.
- Add durable technical decisions to `docs/adr/` and full audits to `docs/audits/`.
- Create follow-up Issues for confirmed gaps rather than embedding an expanding task list here.
- At the very end, follow `xash-mind/project-operations/playbooks/final-notion-update.md` and update only Project Noclip's mapped Notion page.
- Do not automatically rewrite shared standards or playbooks. Create an evidence-backed proposal Issue in `project-operations` when a reusable improvement is proven.

## Completion for this iteration

Iteration 3 is complete only when:

- The deployed browser-critical journey is verified against an exact commit.
- No confirmed release-blocking runtime or persistence defect remains open.
- A useful renderer/performance baseline exists.
- Implemented scope has automated and real-browser evidence.
- GitHub Issues, Pull Requests, relevant docs, and `STATUS.md` agree on the accepted state.
- The mapped Notion project page contains the concise accepted result, blocker, next action, and any request for Sash.
- Any remaining work is represented as clear ready, blocked, or decision-needed Issues.
