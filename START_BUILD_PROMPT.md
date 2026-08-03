# START BUILD PROMPT — PROJECT NOCLIP

Open the GitHub repository `xash-mind/Project-Noclip` and begin the first Project Noclip implementation iteration now.

Treat the repository as the source of truth. Before changing code, read these files in order:

1. `docs/CURRENT_STATE.md`
2. `docs/VISION.md`
3. `docs/LEVEL_0_SPEC.md`
4. `docs/DECISIONS.md`
5. `docs/CONTENT_NEEDED.md`
6. `MASTER_BUILD_PROMPT.md`

Then execute `MASTER_BUILD_PROMPT.md` fully. Do not stop at planning or scaffolding. Inspect the actual repository, preserve valid existing work, implement the largest complete and polished Level 0 vertical slice that can be safely finished, run it, test it continuously, commit it, push it, and deploy the browser client to the Vercel project `project-noclip` when access permits.

Operate as one accountable delivery agent while rotating through these roles:

- Product director protecting emptiness, uncertainty, scarce objects, and rare human connection.
- Game systems architect protecting deterministic seeds, stable IDs, persistence deltas, renderer independence, and future server authority.
- Procedural-generation engineer building topology, module grammar, streaming, shifting, zones, landmarks, and exit insertion.
- Gameplay engineer building movement, interactions, items, inventory, marker drawing, and timeline feedback.
- Technical artist and atmosphere designer tuning scale, materials, lighting, fog, sound, and repetition.
- Multiplayer/economy architect preserving encounter-cell, chat, item-ownership, and atomic-trade boundaries without prematurely building production multiplayer.
- QA engineer defining acceptance tests before each subsystem and testing during implementation.
- Performance engineer checking draw calls, generation cost, disposal, memory growth, and long traversal.
- Security/abuse reviewer bounding client input, marker data, save parsing, developer overrides, and future Connected World trust.
- Documentation and release owner maintaining a truthful repo, Git history, deployment, and next-iteration handoff.

Do not let these roles produce separate competing plans. Use them as review lenses over the same implementation. After each significant subsystem, perform a brief cross-role review and fix material problems before expanding scope.

Testing is continuous, not an end phase. For every major subsystem:

1. Define the observable acceptance condition.
2. Add or update a focused automated test when practical.
3. Implement the smallest complete path.
4. Run focused tests and inspect the game in a browser.
5. Check deterministic replay, save/reload, performance, and regressions.
6. Commit only a runnable verified state.

At minimum, repeatedly run the relevant subset of:

```text
npm install
npm run typecheck
npm test
npm run build
```

Before completion, run the full suite, a browser smoke test, and a long procedural traversal. Never weaken tests merely to obtain green output. Record genuine deferred failures honestly.

The implementation must preserve the core constraints:

- Level 0 is mostly empty and is not a routine combat game.
- Objects are found; new characters receive a one-time tunable chance of zero, one, or two random starter objects.
- All meaningful randomness is seeded.
- Item instances are trade-ready.
- Offline and future Connected World authority remain separate.
- Rendering does not own canonical state.
- Static world geometry is regenerated; persistent changes are deltas.
- Marker drawings are limited vector data.
- World Day and Exposure Day remain distinct.
- Exposure uses novel traversal in disorienting spaces and authoritative elapsed time in stable spaces.
- Manila Room is the primary Level 0 rendezvous.
- Multiple exits exist; they do not all lead to Level 1.
- Hounds are disabled rare-future breach events and Facelings do not physically inhabit baseline Level 0.
- The client must remain Vercel-deployable.

Do not fake completion. Do not claim a GitHub push, test result, browser verification, or Vercel deployment unless it has actually been verified.

## Mandatory final handoff

Before the final commit and response:

1. Update `docs/CURRENT_STATE.md` with verified commit/branch, working commands, exact completed/partial/stubbed/deferred systems, test results, build results, deployment status, known defects, performance findings, and the next three tasks.
2. Review and update `docs/VISION.md` with durable lessons or decisions from the build while preserving the product thesis.
3. Update `docs/LEVEL_0_SPEC.md`, `docs/DECISIONS.md`, and `docs/CONTENT_NEEDED.md` wherever implementation changed their truth.
4. Rewrite `MASTER_BUILD_PROMPT.md` so it becomes the executable build prompt for the **next iteration**. Preserve enduring constraints, remove completed work that no longer needs instruction, and replace it with the next highest-value objective grounded in the final current state. Include acceptance criteria, continuous testing, Git/deployment duties, and this same handoff requirement.
5. Update this `START_BUILD_PROMPT.md` only if its launcher instructions must change.
6. Run final verification after the documents are updated, then commit and push the complete handoff.

The repository is the project memory. Nothing essential may be left only in chat.
