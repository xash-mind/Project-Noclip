from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def replace(path,old,new):
 p=ROOT/path;t=p.read_text();c=t.count(old);assert c==1,f'{path}: {c} matches for {old[:80]!r}';p.write_text(t.replace(old,new,1))

replace('src/renderer/streamingScheduler.ts',
"""      if (visual) {
        visual.root.enabled = true;
        if (x !== state.currentCellX || z !== state.currentCellZ) enqueue(scheduler, 'refresh', x, z, 80 + cellDistance(state, x, z));
      } else {
""",
"""      if (visual) {
        // A retained/active Cell descriptor cannot change while it remains loaded:
        // shift epochs advance only on actual unload. Reusing it avoids flooding the
        // per-frame queue with 48 deterministic no-op descriptor refreshes per step.
        visual.root.enabled = true;
      } else {
""")

replace('src/renderer/level0RegionPresentation.ts',
"""const ARCH_JOIN_OVERLAP = 0.045;
const ARCH_CELL_SEAM_OVERLAP = 0.012;
""",
"""const ARCH_CURVE_JOIN_HANDOFF = 0.018;
const ARCH_PIER_BRIDGE_OVERLAP = 0.045;
const ARCH_CELL_SEAM_HANDOFF = 0.012;
""")
replace('src/renderer/level0RegionPresentation.ts',
"""    joinOverlap: ARCH_JOIN_OVERLAP, cellSeamOverlap: ARCH_CELL_SEAM_OVERLAP, pierDepth: ARCH_PIER_DEPTH, upperDepth: ARCH_UPPER_DEPTH,
""",
"""    joinOverlap: ARCH_CURVE_JOIN_HANDOFF, cellSeamOverlap: ARCH_CELL_SEAM_HANDOFF, pierDepth: ARCH_PIER_DEPTH, upperDepth: ARCH_UPPER_DEPTH,
""")
replace('src/renderer/level0RegionPresentation.ts',
"""  const clippedStart = Math.max(start, cellStart - ARCH_CELL_SEAM_OVERLAP);
  const clippedEnd = Math.min(end, cellEnd + ARCH_CELL_SEAM_OVERLAP);
""",
"""  // One-sided Cell handoff: the preceding Cell owns the small overlap distance,
  // and the following Cell begins exactly where that extension ends. This moves
  // the join away from the Cell root boundary without drawing coplanar duplicate
  // faces (which would z-fight).
  const entersFromPreviousCell = start < cellStart - 0.0005;
  const continuesIntoNextCell = end > cellEnd + 0.0005;
  const clippedStart = Math.max(start, cellStart + (entersFromPreviousCell ? ARCH_CELL_SEAM_HANDOFF : 0));
  const clippedEnd = Math.min(end, cellEnd + (continuesIntoNextCell ? ARCH_CELL_SEAM_HANDOFF : 0));
""")
replace('src/renderer/level0RegionPresentation.ts',
"""  const clip = clippedInterval(descriptor, bay.orientation, bay.curveStart, bay.curveEnd);
""",
"""  // Shoulder and curve surfaces hand off at one exact world coordinate rather
  // than overlapping coplanar faces. The 18 mm inset is visually negligible but
  // keeps the join hidden inside the shoulder footprint and eliminates z-fighting.
  const clip = clippedInterval(
    descriptor,
    bay.orientation,
    bay.curveStart + ARCH_CURVE_JOIN_HANDOFF,
    bay.curveEnd - ARCH_CURVE_JOIN_HANDOFF
  );
""")
# Shoulder ends hand off exactly to the inset curve mesh.
p=ROOT/'src/renderer/level0RegionPresentation.ts';t=p.read_text();t=t.replace('bay.start - ARCH_JOIN_OVERLAP','bay.start - ARCH_PIER_BRIDGE_OVERLAP').replace('bay.curveStart + ARCH_JOIN_OVERLAP','bay.curveStart + ARCH_CURVE_JOIN_HANDOFF').replace('bay.curveEnd - ARCH_JOIN_OVERLAP','bay.curveEnd - ARCH_CURVE_JOIN_HANDOFF').replace('bay.end + ARCH_JOIN_OVERLAP','bay.end + ARCH_PIER_BRIDGE_OVERLAP').replace('support[0] - ARCH_JOIN_OVERLAP','support[0] - ARCH_PIER_BRIDGE_OVERLAP').replace('support[1] + ARCH_JOIN_OVERLAP','support[1] + ARCH_PIER_BRIDGE_OVERLAP');assert 'ARCH_JOIN_OVERLAP' not in t;p.write_text(t)

# Update focused contracts: visible join inset is intentionally small/non-coplanar,
# while shared-pier bridge keeps the larger hidden penetration.
p=ROOT/'tests/arch-streaming-change.test.mjs';t=p.read_text();t=t.replace("  assert.ok(profile.joinOverlap >= 0.04);\n", "  assert.ok(profile.joinOverlap >= 0.015 && profile.joinOverlap <= 0.02);\n");t=t.replace("  assert.match(streamingSource, /processOneJob\\(this\\)/);\n", "  assert.match(streamingSource, /processOneJob\\(this\\)/);\n  assert.equal(streamingSource.includes(\"enqueue(scheduler, 'refresh', x, z\"), false);\n");p.write_text(t)

# Source-level seam contract: one-sided handoff, curve inset, and deeper shared-pier bridge.
p=ROOT/'tests/arch-streaming-change.test.mjs';t=p.read_text();needle="const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');\n";assert needle in t;t=t.replace(needle,needle+"const archPresentationSource = await readFile(new URL('../src/renderer/level0RegionPresentation.ts', import.meta.url), 'utf8');\n",1)
anchor="""test('static world batching is localized per Cell rather than one global dirty group', () => {
""";assert anchor in t
extra="""test('A-A1 seam handoffs avoid coplanar duplicate faces', () => {
  assert.match(archPresentationSource, /entersFromPreviousCell/);
  assert.match(archPresentationSource, /continuesIntoNextCell/);
  assert.match(archPresentationSource, /bay\.curveStart \+ ARCH_CURVE_JOIN_HANDOFF/);
  assert.match(archPresentationSource, /bay\.curveEnd - ARCH_CURVE_JOIN_HANDOFF/);
  assert.match(archPresentationSource, /support\[0\] - ARCH_PIER_BRIDGE_OVERLAP/);
  assert.equal(archPresentationSource.includes('ARCH_JOIN_OVERLAP'), false);
});

""";p.write_text(t.replace(anchor,extra+anchor,1))

for temp in [ROOT/'scripts/_tmp_finalize_arch_streaming.py',ROOT/'.github/workflows/_tmp-finalize-arch-streaming.yml']:
 if temp.exists():temp.unlink()
