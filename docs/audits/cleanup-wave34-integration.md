# Cleanup Waves 3 + 4 Integration Reconciliation

Base: `agent/cleanup-wave2-aa1-ownership` at `7fb745163ba7ad886fbb7b03eb73d9be4fc578c4`.

Locked sibling inputs:

- Wave 3: `2e81c7a3a4198f03df8645755bbba3f6ecc699e8` (`agent/cleanup-wave3-level0-policy`, PR #92)
- Wave 4: `d0bccf02051d6d67594aa6275d954e104cbf1662` (`agent/cleanup-wave4-runtime-ownership`, PR #93)

This integration preserves both accepted sibling results and closes only their shared M-F1 visible-panel seam. It does not begin Wave 5, change VERSION, make a product decision, alter save/world identity, or modify provenance/reference evidence.

## Integration order

1. The integration branch was created from the exact accepted Wave 2 base.
2. The accepted Wave 3 head was imported first and its base-to-head diff inspected.
3. The accepted Wave 4 disjoint files were reconstructed on top of Wave 3 in a merge commit carrying both sibling heads as parents.
4. The two actual sibling overlaps were reconciled semantically:
   - `docs/CODE_MAP.md` now describes both canonical Level 0 presentation policy and explicit runtime/application/index ownership;
   - `tests/arch-streaming-change.test.mjs` retains Wave 3's canonical A-A1/CV-H1 assertions and Wave 4's explicit `processOneJob(game)` scheduler ownership.
5. The previously blocked M-F1 cross-boundary seam was closed after both sibling heads were frozen.

## M-F1 final ownership

```text
WORLD FIXTURE IDENTITY / STATE
  -> src/presentation/level0PresentationPolicy.ts
       canonical visible panel color / emissive / emission-intensity policy
  -> src/renderer/fixtureVisualOwnership.ts
       canonical group/index fixture identity + visible panel name/dimensions
  -> src/renderer/WorldRenderer.ts
       base panel realization consuming canonical presentation
  -> src/renderer/fixtureLighting.ts
       steady/flicker panel update consuming the same canonical presentation

WORLD FIXTURE IDENTITY / STATE
  -> src/world/lighting.ts
  -> src/renderer/fixtureLighting.ts
       physical Omni / shadow / selection / flicker runtime
```

`WorldRenderer.replaceFixtureMeshes()` remains only as the existing narrow base realization seam. It still removes the older base `fixture:*` children and creates the canonical panel entities, but it no longer owns independent M-F1 color/emission values. Broader fixture fallback construction remains deferred to Wave 5.

`fixtureLighting.ts` continues to own physical light selection and runtime. The current Render Distance ceilings, nearest-selection retention, one-to-one active/shadow invariant, flicker, and Blackout suppression are unchanged. PD-3 remains unresolved/frozen.

## Product-decision firewall

No decision was made for:

- PD-1 casing eligibility;
- PD-2 outlet eligibility;
- PD-3 realtime M-F1 light law;
- PD-4 floor Condition visuals;
- PD-5 Gen2 expiry.

Current Ordinary-only casing/outlet eligibility remains unchanged. Wave 4's explicit outlet application dispatch coexists with that eligibility policy.

## Deferred Wave 5 work

This integration intentionally does not remove or redesign:

- PAU pilot;
- Gen2 compatibility;
- general CV-H1 create-then-replace fallback;
- general fixture fallback construction in `cellBuilder.ts`;
- masked historical Blackout implementations;
- other renderer fallback bridges.
