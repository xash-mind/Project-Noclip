# Level 0 Reference Intake

This directory is the raw visual/audio evidence ledger for **Level 0**.

Normal implementation/continue runs should **not** read this directory by default. A manual **Reference update** run may receive one or any number of reference groups, inspect all supplied media, append the resulting provenance entries to `REFERENCES.md`, reconcile them against existing evidence for the same affected targets, and promote only justified durable conclusions into the normal Project Noclip orientation surfaces.

This keeps raw evidence rich without making every ordinary agent reread dozens of image analyses.

## Files

- `REFERENCES.md` — append-only Level 0 evidence/provenance ledger.
- `README.md` — this workflow and source hierarchy.

The user-facing **Reference update** prompt lives in the Project Noclip prompt page in Notion, not in this repository. There is intentionally no second per-image prompt/template file here.

## Batch reference workflow

1. Run the Notion **Reference update** prompt.
2. Add as many `REFERENCE` blocks as useful in one run.
3. Each block may contain:
   - one or many URLs;
   - one or many `Applies to` targets;
   - any number of context notes;
   - its own Source tier.
4. Keep multiple URLs in one block when they are alternate views/crops/media of the same source claim and share the same metadata. Split them into separate blocks when provenance, target, context or source tier differs materially.
5. The agent inspects every supplied media URL itself. If it cannot access or inspect one, it must not pretend otherwise.
6. The agent reads only existing reference entries and canonical facts relevant to the affected targets unless broader comparison is genuinely required.
7. It creates separate provenance entries for materially distinct sources; a single entry may retain several URLs when they genuinely form one reference group.
8. It cross-correlates related references in the same batch before promoting conclusions.
9. It promotes supported durable conclusions into `WORLD.md` first, plus a relevant Issue/ADR or other normal orientation surface only when appropriate.
10. If new evidence exposes a mismatch in the accepted runtime, the agent creates or updates a concrete GitHub issue rather than silently treating the implementation as correct.
11. Ordinary `Continue` runs inherit the promoted rules through `WORLD.md` and the other docs/issues they already traverse. They do not need to revisit the raw ledger unless a specific fidelity question requires source evidence.

## Processing states

Each appended reference entry is finalized in the same Reference update run as one of:

- `PROMOTED` — the evidence was reviewed and any justified durable conclusions were propagated to the appropriate canonical/orientation surfaces.
- `EVIDENCE-ONLY` — useful evidence was recorded, but it did not independently justify a new canonical rule. Later evidence for the same target may make the combined evidence strong enough to promote.
- `BLOCKED` — source conflict, inadequate provenance/access, or a human canon/design decision prevents safe promotion.

`PROMOTED` does **not** mean every observation becomes canon. It means the Reference update pass reviewed the entry and promoted only conclusions justified by the evidence hierarchy.

## Source tiers

- **A — authoritative/source material:** strongest evidence; may establish canonical visual/audio facts when consistent with project source policy.
- **B — strong secondary reference:** useful corroboration/interpretation; should not override conflicting Tier A evidence.
- **C — real-world inspiration:** may inform plausible implementation detail but cannot redefine Backrooms canon.
- **D — mood-only:** atmosphere inspiration only; never sufficient to establish geometry, Materials, Structures, lore, or other canonical facts.
- **Unverified:** provenance/access was not adequately established; do not promote as canonical fact.

## Efficiency rule

A Reference update should inspect the supplied batch plus existing references/canonical facts for the **affected targets only**. It should not resynthesize unrelated Level 0 evidence. Related references in the same batch should be evaluated together so corroboration or contradictions are resolved once rather than in repeated runs.

Normal Continue runs should use promoted knowledge from `WORLD.md`, relevant issues/ADRs, `PROJECT.md`, `STATUS.md`, and `AGENTS.md` as applicable, and consult raw references only when source-level fidelity evidence is specifically needed.

## Fidelity rule

Names are not geometry. Raw labels such as `arch`, `pillar`, `blackout`, etc. must never be literalized without evidence. The existing `arch` interpretation is specifically subject to Sash's correction: do not assume freestanding literal arches; verify the supported wall/divider, arch-shaped-opening and glass treatment from the reference corpus before promoting a canonical rule.
