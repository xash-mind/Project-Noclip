# Agent Instructions — Project Noclip

## Required reading and automatic routing

Project Noclip uses targeted retrieval, not ritual reading.

For every `CHANGE` or `RELEASE`, always read:

1. `AGENTS.md`;
2. `docs/WORK_RULES.md`;
3. `docs/CODE_MAP.md`;
4. `docs/TERMINOLOGY.md`;
5. the named TARGET's authoritative implementation and directly relevant tests.

Then add **only** the documents required by the target and risk:

- **WORLD / GENERATION / CONTENT / REGION / MATERIAL / CONDITION / FEATURE:** read `WORLD.md`; read `docs/VISION.md` only when product direction or world-law interpretation matters.
- **VISUAL / AUDIO / CANON / WIKI / SOURCE / FIDELITY / EXTERNAL CONTENT:** read `docs/CONTENT_PROVENANCE.md`, `docs/references/README.md`, the relevant `docs/references/**` pack, `WORLD.md`, and `docs/VISION.md` when design interpretation matters.
- **PERSISTENCE / IDENTITY / SAVE:** read the relevant persistence/identity contracts and direct migration/save callers; add `STATUS.md` or `WORLD.md` only where accepted release/world state materially constrains the target.
- **ARCHITECTURE / CLEANUP / OWNERSHIP:** read the relevant sections of `docs/WORK_RULES.md`, `docs/CODE_MAP.md`, relevant ADRs, and direct callers/dependencies. Do not broaden into unrelated architecture.
- **VERIFICATION:** read `docs/VERIFICATION.md` and the directly relevant workflow/test/harness ownership.
- **PRODUCT / RELEASE STATE:** read `PROJECT.md` and/or `STATUS.md` only when the requested decision depends on those facts.
- **ISSUES / PR HISTORY:** read relevant Issues/PRs only when the target is tracked there, implementation intent is ambiguous, current code conflicts with recorded decisions, or historical reasoning is necessary.
- **SHARED OPERATIONS:** read a relevant playbook in `xash-mind/project-operations` only when it materially applies to the requested mode.

For `LOOK` and `AUDIT`, use the smallest subset needed to answer accurately; `docs/WORK_RULES.md` is required when the task evaluates ownership, architecture, cleanup, or governance even if no write is planned.

`docs/CURRENT_STATE.md` remains a historical iteration snapshot. `STATUS.md` is the compact accepted current state going forward. `WORLD.md` is the canonical human-facing world vocabulary/content catalog and must distinguish implemented, registered, legacy and planned content. `src/world/terminology.ts` is the typed registry for short human addresses; those aliases never replace runtime/save identity.

Normal Project Noclip work therefore follows this fast path:

- establish the TARGET's semantic owner from `docs/CODE_MAP.md` and direct implementation;
- load only the dynamic constraints relevant to that owner;
- do not inspect unrelated Issues, PRs, historical audits, raw reference ledgers, providers, or deployment state as routine ceremony;
- do not perform a whole-project reconciliation for a bounded `CHANGE`; `TARGET: PROJECT` is required for genuinely project-wide work;
- trust `docs/CODE_MAP.md` for navigation unless implementation evidence shows it is stale; if stale in the touched area, fix it with the change;
- reuse accepted world rules from `WORLD.md`; reopen raw reference evidence when the provenance/fidelity routing above requires it, sources conflict, or the user explicitly requests reference work;
- verify incrementally: cheapest TARGET-specific checks while editing, risk-proportional subsystem verification at the completed `CHANGE` boundary, and complete required release verification at `RELEASE`;
- do not query Vercel, Notion, or other providers unless the current MODE actually requires their state;
- Notion synchronization happens only after accepted facts change; it is not part of routine code navigation;
- prefer one coherent GitHub read/search covering several needed facts over serial one-file discovery when tooling permits;
- once ownership and constraints are established, act instead of continuing exploratory reading without a concrete unresolved question.

**Principle: READ ONLY ENOUGH TO ESTABLISH SAFE OWNERSHIP AND CONSTRAINTS, THEN ACT. Escalate to broader reconciliation only when evidence conflicts.**

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

**A bounded CHANGE prompt defines WHAT may change. `docs/WORK_RULES.md` defines HOW that changed area must be left.**

## Engineering governance

`docs/WORK_RULES.md` is the single detailed authority for Project Noclip engineering purity, semantic ownership, patch-on-patch avoidance, dead-code handling, dependency direction, cleanup equivalence, efficiency, decision challenges, existing-rule challenges, and cleanup completion.

Do not recreate those detailed laws in prompts or parallel repository documents. The mandatory consequences for every `CHANGE` and `RELEASE` are:

- establish the semantic owner before editing;
- change the authoritative owner rather than a downstream symptom where safely possible;
- do not introduce a parallel owner or permanent corrective stack;
- preserve supported compatibility, stable identity, accepted behavior, and risk-proportional verification;
- challenge a requested or existing rule when implementation evidence demonstrates material architectural/product/provenance harm, using the decision protocol in `docs/WORK_RULES.md` rather than silently changing product direction;
- update navigation, terminology, world truth, and provenance only when the truth owned by those documents changed;
- include the required `PROVENANCE_IMPACT=<NONE|REVIEWED|UPDATED|BLOCKED>` plus a short factual reason in the final handoff.

Content/source/fidelity work is automatically routed through `docs/CONTENT_PROVENANCE.md` and the relevant reference pack by the reading model above. Engineering-only work may report `PROVENANCE_IMPACT=NONE` without broad reference research when no provenance-triggering content changed.

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
- follow the content/provenance routing in `docs/WORK_RULES.md`; content/source changes cannot silently skip provenance review;
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

Do not weaken timeline gates or deterministic tests simply to expose content or make a failing change pass. Use developer tooling for controlled verification. Verification is proportional to changed risk; do not add unrelated test categories merely to increase ceremony. `docs/VERIFICATION.md` owns the detailed verification architecture and evidence boundaries.

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

Surface a clear decision instead of guessing when work requires product-direction changes, paid infrastructure, account ownership, destructive production data changes, moderation/privacy policy, official content, or acceptance of material security/data-loss risk. The engineering challenge protocols in `docs/WORK_RULES.md` do not authorize an agent to alter disputed product/world direction without explicit approval.
