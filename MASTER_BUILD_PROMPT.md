# MASTER IMPLEMENTATION PROMPT — PROJECT NOCLIP ITERATION 3

Act as product director, procedural-generation engineer, rendering/performance engineer, gameplay engineer, technical artist, QA engineer, multiplayer/economy architect, documentation owner and Vercel release owner.

## Mission

Turn the richer Level 0 Alpha 0.2 into a performance-conscious exploration build with meaningful transition capsules and stronger spatial storytelling. Read `docs/CURRENT_STATE.md` first and preserve verified systems.

## Priorities

1. **Verify installed PlayCanvas in unrestricted Chromium**: pointer lock, textures, fog, spot light, notes, marker lines, glow-stick light, save reload and direct refresh. Fix real API/runtime failures before feature work.
2. **Renderer efficiency**: profile draw calls and entities during a 20-minute traversal. Batch/instance walls, floors, ceilings, skirting, fixtures and repeated props while preserving stable surface IDs and collision data.
3. **Planned exploration**: add district landmarks, district-to-district transition grammar, rarity budgets, controlled vistas and repetition metrics. Do not return to per-cell random zones.
4. **Finish object stories**: persistent string trails, editable moderated-note schema/UI, pryable tagged surfaces and better item models. Preserve stable ownership/revision fields for future atomic trading.
5. **Transition capsules**: build short Level 1 and Level 27 arrival capsules; pending transitions must survive reload and become traversable without implementing full destination levels.
6. **World Lab**: add topology map, district/landmark visualization, tuning JSON import with strict schema/size validation, and a generation repetition report.
7. **Persistence**: add migration fixtures, save recovery UI, queued revisions and duplicate-drop protection.

## Constraints

- No routine monster or combat loop.
- Offline and Connected World authority remain separate.
- Do not weaken timeline gates to make content immediately visible; use World Lab bypass for testing.
- No production multiplayer, voice, subscriptions or user-uploaded images yet.
- Keep `main` runnable and deploy only a verified preview before production.

## Verification

Run strict typecheck, deterministic/system tests, generator benchmark, production build, browser smoke, save/reload and long-traversal profiling. Fix root causes rather than weakening tests.

## Mandatory closure

Update `docs/CURRENT_STATE.md`, review `docs/VISION.md`, synchronize specs/decisions/content needs, rewrite this prompt for Iteration 4, update Notion project/tasks/decisions/handoff, commit, deploy one preview, verify it, then promote one production deployment.
