# Project Noclip — Decisions

**Last updated:** 2026-08-03 — Iteration 1 closure

## Locked foundation

1. Browser-first TypeScript + Vite client.
2. PlayCanvas Engine remains the renderer, used in a repo-first npm workflow.
3. World generation, items, timeline, exits, and persistence schemas remain renderer-independent.
4. Vercel hosts the client only; future Nakama/PostgreSQL services own Connected World authority.
5. Offline and Connected World characters remain separate.
6. Level 0 stays mostly empty and has no routine combat.
7. Hounds are disabled future breach events; Facelings do not physically inhabit baseline Level 0.
8. Objects are found, with a tunable one-time 15% none / 60% one / 25% two starter roll.
9. Item instances use stable IDs, revisions, ownership, origin, and future escrow-compatible owners.
10. All meaningful generation and persistent events use explicit seeded randomness; `Math.random()` is forbidden in world systems.
11. Static geography regenerates from seed; persistent changes are deltas.
12. Marker drawings are bounded vector data, never uploaded images.
13. World Day and Exposure Day are distinct; unstable exposure is traversal-driven and stable exposure is time-driven.
14. Manila Room remains the primary Level 0 rendezvous and multiple exits do not all lead to Level 1.
15. World Lab and fixed-seed tests are first-class production tools.
16. IndexedDB is primary local persistence, with a safe local/in-memory fallback when browser policy blocks it.
17. Primitive renderer entities are accepted only as the first vertical-slice implementation; the next iteration must reduce draw-object cost without moving authority into scenes.
18. Every iteration tests continuously and ends by updating project memory and rewriting the next build prompt.
