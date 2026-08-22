# Generation 3 Visibility Snapshot Foundation

Status: Dev.9.7 pure computation foundation. It is intentionally **not activated** in `WorldRenderer`, streaming, fixture lighting, static batching, or the game camera loop.

## Ownership

`src/renderer/visibility/` owns a renderer-independent visibility computation that reads Generation 3 topology truth and returns semantic Space visibility first, then derives streaming Cell participation.

- `types.ts` — snapshot/topology/evidence contracts.
- `topologyAdapter.ts` — read-only adapter from Generation 3 domains, portals, route clearances, omitted seams, and semantic A-A1 arch dimensions.
- `propagation.ts` — prepared adjacency plus bounded portal-chain angular propagation.
- `snapshot.ts` — observer resolution, visible Space set, and derived Cell set.
- `diagnostics.ts` — deterministic opening-chain/frontier report formatting.
- `index.ts` — isolated public surface.

Generation 3 topology modules remain authoritative and unchanged.

## Propagation law

1. Resolve the observer to a semantic Generation 3 Space from world position.
2. Seed that Space as visible.
3. Project each real opening to a horizontal angular interval at the observer.
4. Propagate into a neighboring Space only when the opening overlaps the angular interval that survived the preceding opening chain.
5. Repeat through actual topology openings until the frontier is exhausted or an explicit safety bound is reached.
6. Bound normal propagation by world-space `maxDistance`, graph `maxDepth`, and a frontier-state budget.
7. If depth/state safety is reached, fail open: conservatively flood only the connected topology inside the distance envelope. Solid barriers still have no edge and remain excluded.
8. Derive visible Cells from the Cells overlapped by visible Spaces. Cell and Region boundaries are never visibility barriers by themselves.

Omitting `horizontalFovRadians` deliberately evaluates all directions. Supplying it with a direction activates camera-facing angular clipping. A missing/degenerate direction fails open rather than creating a false negative.

## Generation 3 topology inputs

The adapter uses:

- `generateTopologyDomain` Space rectangles and partition walls;
- semantic `TopologyPortal` openings;
- `topologySeamWall`, including omitted seams as open architecture;
- `routeReservationEnvelope` to recover route-clearance cuts made by the current topology build;
- `wall.arch`, `archBayProfile`, and `ARCH_PIER_WIDTH` to derive A-A1 eye-height bay apertures.

A-A1 visibility does not inspect PlayCanvas entities, mesh names, reconstructed visible volumes, or `level0RegionPresentation.ts`.

## Conservative policy

False-negative visibility is treated as the dangerous failure mode.

- A-A1 bay apertures are intentionally conservative in the 2D snapshot because vertical curve/shoulder occlusion is not modeled yet.
- Ambiguous Space-boundary sampling selects a deterministic neighbor and marks the evidence conservative.
- A supplied topology scope that ends at a real opening emits `scope-edge` diagnostics rather than pretending the edge is a wall.
- Depth/state limits trigger connected fallback inside the distance envelope rather than silently dropping potentially visible Spaces.

## Diagnostics

`visibilityDiagnosticReport(snapshot)` and `formatVisibilityDiagnostic(snapshot)` report:

- seed/topology source;
- resolved observer Cell and Space;
- visible Space IDs and visible Cell IDs;
- per-Space propagation depth and opening chain;
- conservative inclusions;
- rejected frontier evidence when capture is enabled;
- termination reason and processed frontier-state count.

All collections are deterministically sorted before handoff.

## Performance shape

Callers that evaluate frequently should prepare topology once and reuse the returned `PreparedVisibilityTopology`. `captureFrontier: false` suppresses rejected-frontier allocations for the future hot path. The current branch does not schedule snapshots per frame.

## Limitations before renderer activation

- Visibility is horizontal/2D; vertical occlusion is not authoritative yet.
- A-A1 apertures are modeled conservatively at ordinary observer eye height.
- The caller must supply a topology/loaded-Cell scope covering at least the desired distance envelope; `scope-edge` evidence flags incomplete scope.
- The foundation computes camera visibility only. Shadow support, predictive/prewarmed, retained, and unloaded lifecycle states remain future work.
- No runtime Cell residency, renderer participation, fixture-light, shadow, M-F1, StaticWorldBatching, Render Distance, or game-loop behavior is changed here.
