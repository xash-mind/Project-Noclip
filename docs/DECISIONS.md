# Project Noclip — Decisions

**Updated:** 2026-08-03

1. Browser-first TypeScript + Vite + PlayCanvas client.
2. Canonical generation/simulation remain renderer-independent.
3. Vercel hosts the client; future Nakama/PostgreSQL services run separately.
4. Offline and Connected World characters remain separate.
5. Level 0 is mostly empty and has no routine combat.
6. Items are found; starter rolls remain 15% none, 60% one, 25% two.
7. Stable item IDs/ownership/revisions remain trade-ready.
8. Static geography regenerates from seeds; saves store deltas.
9. Markers store bounded vector strokes, not images.
10. World Day and Exposure Day are separate authority concepts.
11. Zones and exits are timeline-gated; developer bypass exists only in World Lab.
12. Level 1 is not available at world start and is positioned farther from spawn.
13. Level 0 uses 5×5 deterministic district planning plus room archetypes; per-cell random zone selection is rejected.
14. The Manila Room is a delayed small room containing one table and one central ledger book.
15. Existing v1 local journeys migrate to save schema v2 rather than being erased.
16. Collision uses sub-stepped swept-circle/AABB response and sliding; wall-order snapping is rejected.
17. Activated glow sticks are persistent world lights with a ten-minute decay model.
18. Hardcoded notes are temporary worldbuilding/UI validation content, not final lore lock.
19. Only one verified preview should be produced before each production promotion.
