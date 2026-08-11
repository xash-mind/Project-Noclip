# Level 0 Reference Intake

This directory is the raw visual/audio evidence ledger for **Level 0**.

Normal implementation/continue runs should **not** read this directory by default. A manual **Reference update** run takes one supplied reference URL, inspects it, appends the evidence to `REFERENCES.md`, reconciles it against existing evidence for the same affected target, and promotes only justified durable conclusions into the normal Project Noclip orientation surfaces.

This keeps raw evidence rich without making every ordinary agent reread dozens of image analyses.

## Files

- `REFERENCES.md` — append-only Level 0 evidence/provenance ledger.
- `README.md` — this workflow and source hierarchy.

The user-facing **Reference update** prompt lives in the Project Noclip prompt page in Notion, not in this repository. There is intentionally no second per-image prompt/template file here.

## One-reference workflow

1. Run the Notion **Reference update** prompt.
2. Fill only:
   - URL
   - Applies to
   - Context
   - Source tier
3. The agent inspects the supplied media itself. If it cannot access or inspect it, it must not pretend otherwise.
4. The agent reads only the existing reference entries and canonical facts relevant to the same affected target unless broader comparison is genuinely required.
5. It appends one structured evidence entry to `REFERENCES.md`.
6. It promotes supported durable conclusions into `WORLD.md` first, plus a relevant Issue/ADR or other normal orientation surface only when appropriate.
7. If the new evidence exposes a mismatch in the accepted runtime, the agent creates or updates a concrete GitHub issue rather than silently treating the implementation as correct.
8. Ordinary `Continue` runs inherit the promoted rules through `WORLD.md` and the other docs/issues they already traverse. They do not need to revisit the raw ledger unless a specific fidelity question requires source evidence.

## Processing states

Each appended reference is finalized in the same Reference update run as one of:

- `PROMOTED` — the evidence was reviewed and any justified durable conclusions were propagated to the appropriate canonical/orientation surfaces.
- `EVIDENCE-ONLY` — useful evidence was recorded, but it did not independently justify a new canonical rule. A later reference for the same target may make the combined evidence strong enough to promote.
- `BLOCKED` — source conflict, inadequate provenance/access, or a human canon/design decision prevents safe promotion.

`PROMOTED` does **not** mean every observation becomes canon. It means the Reference update pass reviewed the entry and promoted only conclusions justified by the evidence hierarchy.

## Source tiers

- **A — authoritative/source material:** strongest evidence; may establish canonical visual/audio facts when consistent with project source policy.
- **B — strong secondary reference:** useful corroboration/interpretation; should not override conflicting Tier A evidence.
- **C — real-world inspiration:** may inform plausible implementation detail but cannot redefine Backrooms canon.
- **D — mood-only:** atmosphere inspiration only; never sufficient to establish geometry, Materials, Structures, lore, or other canonical facts.
- **Unverified:** provenance/access was not adequately established; do not promote as canonical fact.

## Efficiency rule

A Reference update should inspect the new URL plus existing references/canonical facts for the **same affected target**. It should not resynthesize unrelated Level 0 evidence. Normal Continue runs should use promoted knowledge from `WORLD.md`, relevant issues/ADRs, `PROJECT.md`, `STATUS.md`, and `AGENTS.md` as applicable, and consult raw references only when source-level fidelity evidence is specifically needed.

## Fidelity rule

Names are not geometry. Raw labels such as `arch`, `pillar`, `blackout`, etc. must never be literalized without evidence. The existing `arch` interpretation is specifically subject to Sash's correction: do not assume freestanding literal arches; verify the supported wall/divider, arch-shaped-opening and glass treatment from the reference corpus before promoting a canonical rule.
