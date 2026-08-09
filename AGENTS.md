# Agent Instructions — Project Noclip

## Required reading

For routine work, read only what is needed to orient accurately:

1. `PROJECT.md`
2. `STATUS.md`
3. Relevant open issues and recent pull requests
4. `docs/VISION.md` when product direction or world-law interpretation matters
5. Relevant shared playbook in `xash-mind/project-operations`
6. Applicable Shared Engineering Standards sections; use the Run Checklist at completion

Do not reread unrelated historical snapshots, all docs, or unrelated shared governance on every run. Perform a broader read when first orienting, changing architecture/governance, crossing a high-risk boundary, or when current instructions appear stale or contradictory.

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

## Work selection and iteration

- Maximize verified useful progress inside a safe coherent boundary; do not optimize for the smallest possible diff.
- Select the largest safe coherent work bundle based on priority, dependencies, player impact, risk, context overlap, rollback, and verification scope.
- Multiple related issues may share one bundle, branch, pull request, preview, and deployment when they share a subsystem, user journey, dependency chain, implementation context, verification setup, or release boundary.
- Verify each included problem before changing code.
- Use a bundle-specific branch and preserve links to every included issue.
- Continue iterating after the first completed issue or internal subtask when adjacent ready work is directly related and benefits from the loaded context.
- Do not bundle unrelated features merely for throughput. Browser/runtime failures, save corruption, deterministic-generation regressions, performance instability, and release blockers take priority over content volume.
- Stop at a blocker, human decision, materially different risk/rollback domain, material context switch, disproportionate verification cost, deployment/provider-action budget, or natural release boundary.
- Run cheap targeted checks during internal subtasks and the complete risk-proportional verification set at the coherent bundle boundary.

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

Do not weaken timeline gates or deterministic tests simply to expose content or make a failing change pass. Use developer tooling for controlled verification. Verification is proportional to changed risk; do not add unrelated test categories merely to increase ceremony.

## GitHub records and final Notion closure

- Technical work and material confirmed findings belong in GitHub.
- Create or update issues for actionable work, dependencies, decisions, or durable findings; do not create issue noise for every incidental observation.
- Use bundle-specific branches and pull requests; one coherent bundle may close multiple directly related issues.
- Store full audits in `docs/audits/`.
- Store durable technical decisions in `docs/adr/`.
- Update `STATUS.md` only with verified accepted state.
- Propose reusable shared standards/playbook improvements through issues in `xash-mind/project-operations` when they are agent/project-originated or need design discussion; an explicit Sash-requested shared change does not require a duplicate proposal issue solely for ceremony.
- Use `xash-mind/project-operations/playbooks/final-notion-update.md` only when the final accepted run materially changed a compact Project Noclip fact represented on the mapped Notion page; otherwise skip Notion.
- Never query a Notion database, search the workspace, or update another project's page during ordinary work.

## Human escalation

Surface a clear decision instead of guessing when work requires product-direction changes, paid infrastructure, account ownership, destructive production data changes, moderation/privacy policy, official content, or acceptance of material security/data-loss risk.
