# Agent Instructions — Project Noclip

## Required reading

For routine work, read only what is needed to orient accurately:

1. `PROJECT.md`
2. `STATUS.md`
3. Relevant open issues and recent pull requests
4. `WORLD.md` when work touches world generation, Levels, Regions, Architecture Patterns, Variants, Geometry, Materials, Conditions, Features, Structures, Carvers, Anomalies, Entities, Items, Transitions, or world terminology
5. `docs/TERMINOLOGY.md` when a target is referred to by a short address such as `A-A1`, when introducing/renaming terminology, or when code vocabulary is unclear
6. `docs/CODE_MAP.md` when locating an unfamiliar subsystem; use it as a navigation aid, not as authority over current code
7. `docs/VISION.md` when product direction or world-law interpretation matters
8. Relevant shared playbook in `xash-mind/project-operations`
9. Applicable Shared Engineering Standards sections; use the Run Checklist at completion

Do not reread unrelated historical snapshots, all docs, or unrelated shared governance on every run. Perform a broader read when first orienting, changing architecture/governance, crossing a high-risk boundary, or when current instructions appear stale or contradictory.

`docs/CURRENT_STATE.md` remains a historical iteration snapshot. `STATUS.md` is the compact accepted current state going forward. `WORLD.md` is the canonical human-facing world vocabulary/content catalog and must distinguish implemented, registered, legacy and planned content. `src/world/terminology.ts` is the typed registry for short human addresses; those aliases never replace runtime/save identity.

## Repository and product boundaries

- Repository: `xash-mind/Project-Noclip`
- Production target: https://project-noclip.vercel.app
- Runtime: browser-first TypeScript/Vite/PlayCanvas
- Current product: Level 0 exploration vertical slice
- Canonical world simulation and persistence logic should remain renderer-independent where practical.
- The environment, not routine combat, is the primary antagonist.
- Preserve deterministic Region/Condition Fields, stable IDs, generation-version save compatibility, timeline gates, ordinary player isolation, and the Manila Room rendezvous direction.
- Generation 3 is the new-journey architecture: world geography/spatial laws first, ordinary content second. Treat GitHub Issue #31 and `WORLD.md` as the current architecture/vocabulary references when relevant; do not use legacy prompts/specs to steer new generation.
- A `Cell` is a streaming/computation unit, never a synonym for a room.

## Vocabulary discipline

Prefer the simple design vocabulary in `WORLD.md`:

- `Level`, `Region`, `Variant`, `Geometry`, `Material`, `Condition`, `Feature`, `Structure`, `Carver`, `Anomaly`, `Entity`, `Item`, `Transition`.
- `Architecture Pattern` is subordinate vocabulary for a named reusable architectural grammar owned by a Region. It is not a peer world category, not a `Structure`, and not the `Geometry` category.
- Current high-frequency Architecture Pattern addresses are `O-A1` (Default Wall), `P-A1` (Pillar Pier), and `A-A1` (Arch Divider). Address conceptual pieces with dot notation such as `A-A1.lower-panel`.
- Short addresses such as `L0`, `O`, `P`, `A`, `C-B1`, `CV-H1`, and `A-A1` are human conversation/documentation aliases only. Never write them into save identity or silently replace stable runtime IDs.
- `Geometry` has only two canonical values: `Euclidean` and `Non-Euclidean`. Do not create a third `Distorted` geometry category; use a named Non-Euclidean behaviour when space itself is impossible.
- Use `Region` rather than inventing parallel human-facing terms such as environment regime/class.
- Use `Material` rather than `Material Family` in ordinary product language.
- Use `Condition` rather than separate object-state/fixture-state world categories.
- `Rare` is a Structure property, not a separate Structure category.
- Pure spatial impossibility belongs under Non-Euclidean Geometry, not a duplicate Anomaly classification.

Treat `Field`, `Cell`, seed domains, cache radius, and generation version as engine vocabulary. Treat `District`, `ZoneId`, room archetypes, spatial profiles, components, and generic props as Gen2 compatibility vocabulary unless old-save implementation detail is specifically needed.

## Prompt and work-mode discipline

Normal Noclip work should be addressable and bounded. Use one of four modes:

- `LOOK` — inspect/explain only; no writes.
- `AUDIT` — investigate named target(s), reconcile reality, and capture/report findings; no product implementation.
- `CHANGE` — modify only explicitly named target(s).
- `RELEASE` — verify an already-completed change and merge/deploy only when required acceptance is satisfied.

Use `TARGET`, optional `OBSERVATIONS`, `CHANGE` (CHANGE mode), `PRESERVE`, and `VERIFY`. Everything outside `TARGET` is preserved by default. A broad project audit must explicitly use a project-wide target; do not turn a narrow complaint into a whole-project implementation run.

Acceptance vocabulary is intentionally small: `PASS`, `PASS WITH GAP`, `FAIL`, `UNVERIFIED`. A required `FAIL` or `UNVERIFIED` blocks RELEASE. Temporary defect IDs may use `<target>-D#`; they are disposable tracking labels, not permanent world IDs.

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
- Select the largest safe coherent work bundle **inside the named TARGET boundary** based on priority, dependencies, player impact, risk, context overlap, rollback, and verification scope.
- Multiple related issues may share one bundle, branch, pull request, preview, and deployment when they share a subsystem, user journey, dependency chain, implementation context, verification setup, or release boundary.
- Verify each included problem before changing code.
- Use a bundle-specific branch and preserve links to every included issue.
- Continue iterating after the first completed issue or internal subtask only when adjacent ready work is directly related to the same named target/bundle and benefits from the loaded context.
- Do not bundle unrelated features merely for throughput. Browser/runtime failures, save corruption, deterministic-generation regressions, performance instability, and release blockers take priority over content volume.
- Stop at a blocker, human decision, materially different risk/rollback domain, material context switch, disproportionate verification cost, deployment/provider-action budget, or natural release boundary.
- Run cheap targeted checks during internal subtasks and the complete risk-proportional verification set at the coherent bundle boundary.

## World-catalog maintenance

When accepted work adds, removes, renames, reclassifies, or materially changes a Level, Region, Architecture Pattern, Variant, Geometry, Material, Condition, Feature, Structure, Carver, Anomaly, Entity, Item, Transition, or related engine/legacy worldgen concept:

- update `WORLD.md` in the same pull request;
- update `src/world/terminology.ts` and `docs/TERMINOLOGY.md` when a durable short address, Architecture Pattern, or code-facing term changes;
- preserve explicit status (`Implemented`, `Registered`, `Legacy`, `Planned`, or `None implemented`);
- never claim a registered exit destination is a playable Level;
- never silently relabel legacy `ZoneId`/archetype/component implementation as completed Gen-3 Regions/Variants/Fields;
- never route a new journey through Gen2 districts, Zones, archetypes, or component composition;
- preserve `generationVersion`; pre-versioned saves resolve to frozen `gen2`, while new journeys use `gen3-v1`;
- keep useful empty categories visible when their absence matters;
- mirror material catalog changes to the standalone Project Noclip Notion terminology page during the normal final Notion sync when represented there.

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
- Use `xash-mind/project-operations/playbooks/final-notion-update.md` only when the final accepted run materially changed a compact Project Noclip fact represented on the standalone Project Noclip Notion page; otherwise skip Notion.
- Never query a Notion database, search the workspace, or update another project's page during ordinary work.

## Human escalation

Surface a clear decision instead of guessing when work requires product-direction changes, paid infrastructure, account ownership, destructive production data changes, moderation/privacy policy, official content, or acceptance of material security/data-loss risk.

## Vercel deployment hygiene

- Keep LoopForge work on `agent/*` branches. Vercel intentionally does not auto-deploy those branches, so fine-grained protocol commits remain safe and cheap.
- Continue running local and GitHub verification at the normal risk-appropriate boundaries.
- When a coherent bundle needs a hosted exact-head preview, create or update `preview/<bundle>` to the candidate SHA only after the relevant checks pass. Do not advance a preview branch for protocol-only state or evidence commits.
- Merge an approved candidate to `main`; that merge remains the normal production deployment.
- For any other deploy-enabled branch, batch pushes at coherent verification boundaries and avoid protocol-only pushes.
