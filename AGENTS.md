# Agent Instructions — Project Noclip

## Required reading

1. `PROJECT.md`
2. `STATUS.md`
3. `docs/VISION.md`
4. Relevant open issues and recent pull requests
5. The relevant playbook and Engineering Standards in `xash-mind/project-operations`

`docs/CURRENT_STATE.md` remains a historical iteration snapshot. `STATUS.md` is the compact accepted current state going forward.

## Repository and product boundaries

- Repository: `xash-mind/Project-Noclip`
- Production target: https://project-noclip.vercel.app
- Runtime: browser-first TypeScript/Vite/PlayCanvas
- Current product: Level 0 exploration vertical slice
- Canonical world simulation and persistence logic should remain renderer-independent where practical.
- The environment, not routine combat, is the primary antagonist.
- Preserve deterministic district planning, stable IDs, persistence compatibility, timeline gates, ordinary player isolation, and the Manila Room rendezvous direction.

## Explicit non-goals for the current phase

- Hundreds of implemented levels
- Production-scale multiplayer
- Voice chat, subscriptions, or user-uploaded images
- Routine monster/combat loops
- Large content expansion before browser, persistence, performance, and release verification are stable

## Commands

```text
Install: npm install
Develop: npm run dev
Check: npm run check
Typecheck: npm run typecheck
Test: npm test
Benchmark: npm run benchmark
Build: npm run build
Preview: npm run preview
```

Node.js `>=22.12.0` is required.

## Work selection

Select the highest-value coherent work based on priority, dependencies, risk, context overlap, rollback, and verification scope.

Do not bundle unrelated features. Browser/runtime failures, save corruption, deterministic-generation regressions, performance instability, and release blockers take priority over content volume.

## Required verification

Run the layers relevant to the change, including:

- Strict TypeScript
- Deterministic/system tests
- Generator benchmark
- Production build
- Real-browser pointer-lock and gameplay smoke
- Save/reload, migration, and corruption recovery where persistence is affected
- Long traversal, memory, entity/draw-call, and frame-time checks where rendering/generation is affected
- Fresh-browser and direct-refresh checks for deployments
- First-time-user UX, readable feedback, keyboard/focus, reduced motion, and flashing/flicker safety where UI or presentation is affected

Do not weaken timeline gates or deterministic tests simply to expose content or make a failing change pass. Use developer tooling for controlled verification.

## GitHub records

- Technical work and confirmed findings belong in GitHub Issues.
- Use issue-specific branches and pull requests.
- Store full audits in `docs/audits/`.
- Store durable technical decisions in `docs/adr/`.
- Update `STATUS.md` only with verified accepted state.
- Do not update Notion during ordinary implementation, testing, review, or release work.
- Propose reusable shared standards/playbook improvements through issues in `xash-mind/project-operations`.

## Human escalation

Surface a clear decision instead of guessing when work requires product-direction changes, paid infrastructure, account ownership, destructive production data changes, moderation/privacy policy, official content, or acceptance of material security/data-loss risk.
