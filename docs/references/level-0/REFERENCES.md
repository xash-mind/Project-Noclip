# Level 0 Raw Reference Ledger

This is the append-only visual/audio evidence and provenance history for **Level 0**.

Do not manually pre-process references before adding them. A manual **Reference update** run may receive one or any number of reference groups, each with one or many URLs, one or many `Applies to` targets, context notes, and its own `Source tier`. The agent inspects the supplied media, reconciles related evidence against existing references for the affected targets, appends one or more complete provenance entries here, and finalizes every new entry as `PROMOTED`, `EVIDENCE-ONLY`, or `BLOCKED` in the same run.

Materially distinct sources should remain distinct entries. Several URLs may share one entry only when they genuinely represent alternate views/crops/media of the same source/reference group and preserving them together does not blur provenance or confidence.

Normal `Continue` runs should not traverse this ledger by default. Durable supported conclusions are promoted into the ordinary Project Noclip orientation surfaces that those runs already read, primarily `WORLD.md` and relevant GitHub issues/ADRs.

Do not delete processed entries; this file remains the source-evidence history.

---

