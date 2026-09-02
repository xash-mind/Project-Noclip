# Project Noclip Work Rules

This document is the detailed engineering-governance authority for Project Noclip `CHANGE` and `RELEASE` work.

`AGENTS.md` is the mandatory entrypoint and reading router. This file owns the durable engineering-purity, ownership, decision-challenge, cleanup, and handoff rules that would otherwise make `AGENTS.md` a large ritual checklist.

These rules govern **how** work is performed inside an approved target. They do not enlarge the target. A bounded prompt still defines what may change; everything outside that target remains preserved unless the user explicitly broadens it.

Use the repository's established authorities rather than creating parallel rule systems:

- `AGENTS.md` — mandatory entrypoint and dynamic work router;
- `docs/WORK_RULES.md` — detailed engineering purity, ownership, cleanup, decision-challenge, and workflow law;
- `docs/CODE_MAP.md` — implementation ownership and navigation;
- `docs/TERMINOLOGY.md` — code-facing vocabulary and short-address mapping;
- `WORLD.md` — accepted Project Noclip world truth and content catalog;
- `docs/VISION.md` — creative/product direction;
- `docs/CONTENT_PROVENANCE.md` — concept-level content provenance ledger and provenance-review routing;
- `docs/references/**` — source/reference evidence, fidelity extraction, and raw provenance history;
- `docs/VERIFICATION.md` — verification architecture and evidence ownership;
- `docs/adr/**` — durable technical decisions with meaningful alternatives.

The operating principle remains:

> **READ ONLY ENOUGH TO ESTABLISH SAFE OWNERSHIP AND CONSTRAINTS, THEN ACT.**

---

## 1. One semantic owner

Every meaningful concept should have one obvious authoritative owner.

Examples include:

- Region floor presentation;
- wallpaper treatment;
- collision candidate policy;
- streaming prediction;
- Item Instance identity;
- Character Profile identity;
- fixture-light selection.

Shared consumers may read or adapt the authoritative owner. They must not independently redefine the same semantic law.

When the same semantic constant, decision, or rule exists in multiple places:

**CONSOLIDATE** unless the duplication is intentionally required and documented.

Intentional duplication must state why the values cannot share one owner and what keeps them synchronized. Test thresholds, renderer tuning, developer-tool defaults, compatibility values, and product/world laws are not interchangeable merely because two numbers currently match.

A wrapper, cache, projection, generated file, renderer entity, or test fixture may mirror authoritative state for its own purpose without becoming a second semantic owner. Generated outputs must point back to their source owner.

Before adding a new module or rule, identify the current owner in `docs/CODE_MAP.md` and direct implementation. If ownership is ambiguous, resolve that ambiguity before adding another claimant.

---

## 2. No patch-on-patch architecture

Do not solve a requested change by adding:

```text
correction
  on top of
correction
  on top of
wrapper
  on top of
legacy behavior
```

when the authoritative owner can safely be corrected directly.

In particular:

- avoid new prototype wrappers when the owning lifecycle can be changed cleanly;
- avoid another post-processing pass solely to correct an earlier presentation pass;
- avoid independent runtime adapters for one semantic rule;
- avoid duplicate fallback systems;
- avoid a second predictor, resolver, identity map, or cache when one existing owner can be extended safely.

When work encounters an existing patch or corrective layer, classify it explicitly as one of:

- `KEEP` — correct current owner/boundary and still needed;
- `CLEAN` — correct responsibility but implementation can be simplified locally;
- `CONSOLIDATE` — overlaps another owner and should be folded into the canonical path;
- `REMOVE` — proven obsolete and safe to delete;
- `LEGACY` — required compatibility behavior that must remain isolated;
- `INVESTIGATE LATER` — suspicious, but removal/consolidation is not safely provable inside the current scope.

Do not hide architectural debt behind names such as `final`, `corrective`, `compat`, `new`, `temporary`, `v2`, or a release number.

If a new patch layer is genuinely required for compatibility, rollback safety, browser/platform isolation, migration, or a deliberately staged architecture change, document:

1. why direct authoritative ownership cannot currently be corrected;
2. the invariant the layer protects;
3. which supported state depends on it;
4. what evidence or future change would permit removal.

A compatibility bridge without a removal condition must be treated as durable architecture and reviewed accordingly.

---

## 3. Fix the owner, not the symptom

Before implementing a defect fix, answer:

```text
WHAT concept is wrong?
WHO owns that concept?
WHY is the wrong value/behavior reaching the player?
```

Prefer fixing the authoritative owner.

Do not correct a world-law defect by altering screenshots, a renderer-created duplicate, a copied constant, a verification expectation, or a downstream presentation entity when the actual defect originates upstream.

Examples:

- wrong Region floor appearance -> fix the Region/floor presentation owner, not every Carver or mesh fragment;
- wrong identity behavior -> fix the identity/domain owner, not UI keys or serialized symptoms;
- wrong collision candidate law -> fix collision ownership, not a visual mesh or browser harness;
- wrong world occurrence -> fix generation/world policy, not renderer visibility;
- wrong material binding -> fix canonical presentation/material ownership, not whichever mesh currently renders last.

Tests must describe the corrected contract. Do not change an assertion simply because the product currently violates it.

---

## 4. No dead code

When touched code exposes safely provable dead code, remove it.

Dead code includes:

- unreachable branches;
- obsolete replacement implementations;
- unused helpers whose historical purpose is complete;
- superseded correction layers;
- duplicate constants after consolidation;
- stale fallback paths that no supported state reaches;
- compatibility shims for data or workflows that are no longer in contract.

But **apparently unused is not proof of safe deletion**.

Before removing compatibility or migration code, prove it is not required by any supported:

- save schema or historical save;
- generation version;
- stable ID or deterministic seed-domain identity;
- migration/recovery path;
- persistence contract;
- verification fixture or workflow still in contract;
- developer tooling still in contract;
- explicitly supported browser/runtime fallback.

If safety cannot be proven inside the current run, classify it `LEGACY` or `INVESTIGATE LATER` rather than guessing.

A cleanup request is not permission to erase historical compatibility.

---

## 5. No god files / no abstraction theater

Cleanup is not measured by fewest files.

Do not combine unrelated concepts merely to reduce file count. Do not create layers, interfaces, factories, registries, managers, service classes, adapters, or dependency-injection structures solely to make the code appear architecturally sophisticated.

Prefer:

```text
few concepts
with
clear ownership
and
simple dependency flow
```

A small direct function is preferable to an unnecessary framework.

Split a file when distinct semantic owners, lifecycles, verification boundaries, or dependency directions are being forced together. Keep a file together when the pieces genuinely share one responsibility and splitting would only create navigation overhead.

Abstraction is justified when it removes real duplicated policy, enforces a useful contract, separates an unstable dependency, or makes a boundary testable. It is not justified by anticipated reuse alone.

---

## 6. Dependency direction

Prefer this dependency direction:

```text
WORLD DOMAIN
    ↓
PRESENTATION DEFINITIONS
    ↓
RUNTIME / RENDERER ADAPTERS
    ↓
PLAYCANVAS
```

Project-specific variations exist, but the authority direction must remain clear.

Rules:

- renderer state must not silently define deterministic world truth;
- PlayCanvas entities/materials must not become persistence identity;
- developer tools must not own canonical product state;
- verification must observe product contracts, not become their owner;
- generated files must not become the human-authored source when a structured source exists;
- derived runtime indexes, caches, batching state, visibility participation, texture derivatives, and diagnostics are reconstructible state, not persistence identity;
- presentation IDs and Asset IDs must not replace world/save identity;
- UI projections must not replace Item, Character, Journey, or Inventory domain ownership.

When a lower layer needs information from a higher-level semantic owner, pass or resolve that information explicitly instead of recreating the decision locally.

---

## 7. Data / policy over scattered conditions

When several Regions or systems make the same kind of decision, prefer one clear policy/owner over scattered conditionals such as:

```text
if region === X
if region !== Y
if arch...
if pillar...
```

across unrelated modules.

A policy may be data, a direct function, a typed mapping, or an explicit domain owner. Choose the smallest mechanism that makes ownership obvious.

Do not over-generalize when only one consumer exists. The objective is explicit ownership, not generic abstraction.

Repeated branching is a design signal when the same semantic question is answered in multiple places. It is not automatically a signal to invent a global framework.

---

## 8. Preserve behavior during cleanup

Architecture cleanup does **not** grant permission to redesign the product.

Unless explicitly approved, preserve:

- deterministic Generation 3 world behavior;
- existing Region / Condition / Feature occurrence;
- accepted appearance;
- collision and navigation;
- movement and camera behavior;
- save compatibility and migrations;
- stable IDs and deterministic seed domains;
- Character identity;
- Item identity;
- renderer visibility behavior;
- accepted performance improvements;
- Noclip Studio behavior/security boundary;
- UI behavior and accessibility contracts;
- timeline gates and Journey behavior.

Refactors require equivalence evidence proportional to the touched risk.

A cleanup that changes player-visible behavior is a product change and must be explicitly scoped as such.

If exact equivalence is impossible because the old behavior was itself inconsistent or undefined, surface the decision instead of silently choosing a new product rule.

---

## 9. User-instruction challenge protocol

Agents must not blindly implement a user instruction when direct implementation evidence shows that the instruction would materially create:

- duplicate semantic ownership;
- unnecessary permanent complexity;
- patch-on-patch behavior;
- wrong semantic ownership;
- save or identity risk;
- significant avoidable performance cost;
- contradiction with accepted world law;
- contradiction with Project Noclip Vision;
- material provenance or licensing risk.

In that situation:

- **do not** silently change the requested product/world decision;
- **do not** implement the harmful architecture merely because it was requested verbatim;
- **do not** refuse the entire run when unaffected work can proceed safely;
- continue unrelated safe work inside the approved target where practical;
- stop only the disputed decision boundary.

Surface exactly:

```text
REQUESTED DECISION:
<what the user asked>

CONFLICT:
<why current architecture/evidence makes that harmful>

CLEAN ALTERNATIVE:
<recommended architecture>

IMPACT:
<what changes between choices>

PERMISSION REQUIRED:
<exact decision needing user approval>
```

Do not alter the disputed product/world decision without explicit approval.

This protocol grants authority to challenge implementation direction, not authority to replace the user's product direction.

Minor implementation details that preserve the requested behavior and merely choose the cleanest existing owner do not require escalation.

---

## 10. Existing-rule challenge

Repository rules are durable, not infallible.

If an existing rule demonstrably creates:

- duplicate systems;
- unnecessary permanent complexity;
- architectural contradiction;
- a performance pathology;
- conflict with newer accepted architecture;
- impossible ownership boundaries;

then do not silently violate it and do not silently preserve it by adding more compensating layers.

Record:

```text
RULE IN QUESTION:
<current repository rule>

EVIDENCE:
<implementation/runtime evidence>

CONSEQUENCE:
<why preserving it is harmful>

PROPOSED REPLACEMENT:
<clean governance/architecture rule>
```

Request an explicit governance decision before changing the rule. Continue unrelated safe work where possible.

A historical prompt is not automatically a current rule. Current authoritative repository docs and accepted implementation state take precedence over superseded prompt wording unless stable identity/compatibility depends on the historical behavior.

---

## 11. Efficiency law

Optimize for:

- minimal semantic duplication;
- obvious ownership;
- short dependency paths;
- low hot-loop allocation;
- bounded runtime work;
- reconstructible caches;
- straightforward verification;
- understandable failure behavior;
- focused reading and tool use.

Do **not** optimize for:

- smallest diff;
- largest diff;
- line-count reduction;
- file-count reduction;
- cleverness;
- maximum abstraction;
- ceremonial reading or verification.

Choose the smallest coherent architecture that satisfies the actual contract and leaves the touched area clean.

Performance-sensitive code must prefer predictable bounded work over hidden convenience costs. A cleaner architecture that materially worsens hot-path behavior is not clean.

---

## 12. Cleanup completion law

A cleanup is not complete because code compiles or a diff looks smaller.

Require, as applicable:

- behavior equivalence established;
- stale implementation removed when safely provable;
- stale docs/comments removed in the touched area;
- `docs/CODE_MAP.md` updated when ownership or navigation changed;
- tests updated to assert canonical contracts rather than old implementation accidents;
- no temporary compatibility bridge left without a documented reason/removal condition;
- no new parallel semantic owner introduced;
- directly relevant verification passed;
- persistence/stable identity explicitly preserved where relevant;
- provenance impact reported as required below.

If a cleanup exposes unresolved legacy code that cannot safely be removed, record it honestly as `LEGACY` or `INVESTIGATE LATER`. Do not declare it gone because the new path no longer calls it in one test.

---

## Change workflow

For a normal `CHANGE` or `RELEASE`, use this sequence without turning it into ritual:

1. Read the mandatory routing set from `AGENTS.md`.
2. Identify the target's semantic owner in `docs/CODE_MAP.md` and implementation.
3. Read only the dynamic documents required by the target/risk.
4. Establish preservation constraints, especially save identity, world law, presentation ownership, performance, and verification boundaries.
5. Implement through the authoritative owner.
6. Remove or classify stale layers exposed by the change.
7. Run risk-proportional verification according to `docs/VERIFICATION.md` and directly relevant tests/harnesses.
8. Update navigation/terminology/world/provenance docs only when their owned truth changed.
9. Produce the final provenance-impact handoff.

When several directly related fixes share one semantic owner and verification boundary, one coherent change is preferable to serial patch layers. Do not bundle unrelated product decisions merely because the files are nearby.

---

## Content / provenance routing law

Every `CHANGE` and `RELEASE` final handoff must include:

```text
PROVENANCE_IMPACT=<NONE|REVIEWED|UPDATED|BLOCKED>
Reason: <short factual reason>
```

Use:

- `NONE` — no source-derived content, external reference, content identity, visual/audio/lore identity, or provenance record was materially changed;
- `REVIEWED` — provenance-triggering content was touched, the relevant ledger/reference evidence was reviewed, and no ledger update was necessary;
- `UPDATED` — `docs/CONTENT_PROVENANCE.md` and/or the relevant reference pack was updated because provenance facts changed;
- `BLOCKED` — provenance/license/source evidence is insufficient or conflicting and the disputed content change cannot safely proceed without resolution.

Engineering-only example:

```text
PROVENANCE_IMPACT=NONE
Reason: runtime collision indexing only; no source-derived content or external assets changed.
```

If work materially adds or changes any of the following, provenance review is mandatory:

- Level;
- Region;
- Material;
- Architecture Pattern;
- Condition;
- Feature;
- Structure;
- Carver;
- Anomaly;
- Entity;
- Item visual or lore identity;
- Transition;
- audio identity;
- source-derived naming;
- external text/image/audio reference;
- Backrooms canon/wiki interpretation.

For those targets, review:

1. `docs/CONTENT_PROVENANCE.md`;
2. `docs/references/README.md`;
3. the relevant `docs/references/**` pack;
4. `WORLD.md` / `docs/VISION.md` when world/design interpretation is involved.

Update provenance when the concept's classification, source family, external URL, direct support, interpretation/originality boundary, copied-media status, attribution/license evidence, implementation owner, or unresolved legal/provenance question materially changes.

Do not perform broad legal research for a purely engineering change just to produce a handoff line.

---

## Provenance/legal escalation

`docs/CONTENT_PROVENANCE.md` is factual documentation hygiene, not a legal opinion.

If evidence is unclear, use:

```text
UNKNOWN / REVIEW REQUIRED
```

and state the exact unresolved question.

Examples:

- source-page license unclear;
- asset attribution requirement unclear;
- copied text provenance unclear;
- multiple Backrooms canons conflict;
- community/wiki content origin unclear;
- user-provided asset authorization exists in project notes but the underlying license/attribution chain is not verified.

Never infer that material is public domain, Creative Commons, commercially usable, sublicensable, or otherwise legally cleared merely because it is publicly accessible, appears on a wiki, was supplied by a user, or was technically transformed into a new asset.

Do not treat implementation originality as proof that the underlying world/content idea is original. Likewise, do not label Project Noclip-original mechanics, algorithms, runtime architecture, or procedural implementation as external source material merely because they present source-derived content.

---

## Touched-area cleanliness

Every implementation run must leave the touched area at least as clean as it found it.

The practical consequences of the rules above include:

- extend existing authoritative modules instead of creating parallel owners;
- keep one obvious owner for meaningful world-law constants and distinguish them from renderer tuning/test thresholds/tool defaults;
- avoid permanent release-number or corrective names for accepted long-term systems unless the name is genuine compatibility/history;
- preserve Gen2 compatibility isolation from Gen3;
- never rename persisted IDs, seed-domain identities, save identity, or established short-address aliases merely for cosmetic consistency;
- keep deterministic world state renderer-independent where intended;
- use explicit domain types when they materially narrow contracts, without type complexity for its own sake;
- keep comments that explain law, ownership, determinism, compatibility, performance, fidelity, security, or non-obvious geometry/navigation; remove syntax narration and stale comments in touched code;
- never weaken tests merely to make a refactor pass;
- add regression coverage when correcting a defect likely to recur;
- update `docs/TERMINOLOGY.md` and `src/world/terminology.ts` together when durable short addresses or canonical code-facing terms change;
- update `WORLD.md` only when accepted world truth changes or stale documentation is corrected to accepted truth;
- run verification proportional to changed risk.

These are consequences of the semantic-owner and cleanup laws, not a second competing ruleset.