# Level 0 Reference Intake

This directory is the raw visual/audio evidence ledger for **Level 0**.

Normal implementation/continue runs should **not** read this directory by default. The dedicated **Reference update** workflow promotes validated conclusions into the normal Project Noclip orientation surfaces (`WORLD.md` first, plus `AGENTS.md`, `PROJECT.md`, `STATUS.md`, relevant Issues/ADRs only when appropriate).

This keeps raw evidence rich without making every ordinary agent reread dozens of image analyses.

## Files

- `REFERENCE_PROMPT_TEMPLATE.md` — fill in four fields and give the prompt to any capable AI that can inspect the image URL. Its output is ready to append to `REFERENCES.md`.
- `REFERENCES.md` — append-only Level 0 evidence ledger. Each new entry starts as `UNPROCESSED`.

## Workflow

1. Find a useful Level 0 image/reference.
2. Copy `REFERENCE_PROMPT_TEMPLATE.md` and fill only:
   - URL
   - Applies to
   - Context
   - Source tier
3. Give it to an AI that can actually open/inspect the image.
4. Append the returned Markdown entry to `REFERENCES.md`.
5. Repeat freely. Do not manually maintain a separate visual-grammar summary.
6. When enough references have accumulated, run the **Reference update** prompt from the Notion Prompt Library.
7. That agent processes `UNPROCESSED` or changed entries, reconciles them against existing evidence, updates the normal canonical/orientation surfaces, and marks each handled reference `PROMOTED` or `BLOCKED`.
8. Ordinary `Continue` runs then inherit the promoted facts through the docs they already traverse.

## Processing states

- `UNPROCESSED` — raw analyzed reference has not yet been reconciled into canonical project knowledge.
- `PROMOTED` — the durable supported conclusions have been propagated to the appropriate canonical/orientation surfaces.
- `BLOCKED` — the reference conflicts with stronger evidence, has uncertain provenance, or needs a human source/canon decision before promotion.

`PROMOTED` does **not** mean every observation becomes canon. It means the Reference update pass reviewed the entry and promoted only the conclusions justified by the evidence hierarchy.

## Source tiers

- **A — authoritative/source material:** strongest evidence; may establish canonical visual facts when consistent with project source policy.
- **B — strong secondary reference:** useful corroboration/interpretation; should not override conflicting Tier A evidence.
- **C — real-world inspiration:** may inform implementation techniques or plausible detail but cannot redefine Backrooms canon.
- **D — mood-only:** atmosphere inspiration only; never sufficient to establish geometry, materials, structures, or lore.
- **Unverified:** provenance/access was not adequately established; do not promote as canonical fact.

## Efficiency rule

Reference update should normally process only `UNPROCESSED` or materially changed entries. It should still inspect the existing references and canonical facts relevant to the **same affected target** when necessary to detect conflicts or derive a multi-reference rule. It does not need to resynthesize unrelated Level 0 evidence every time.

## Fidelity rule

Names are not geometry. Raw labels such as `arch`, `pillar`, `blackout`, etc. must never be literalized without evidence. The existing `arch` interpretation is specifically subject to Sash's correction: do not assume freestanding literal arches; verify the supported wall/divider, arch-shaped-opening and glass treatment from the reference corpus before promoting a canonical rule.
