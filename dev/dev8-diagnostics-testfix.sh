#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
p = Path('tests/render-distance-light-ceilings.test.mjs')
text = p.read_text()
old = "  assert.ok(fixtureSource.includes('light.castShadows = true'));\n"
new = "  assert.ok(fixtureSource.includes('castShadows: true'));\n  assert.ok(fixtureSource.includes(\"shadowCountPolicy: 'one-to-one-with-active-lights'\"));\n"
if text.count(old) != 1:
    raise SystemExit(f'expected one stale per-frame castShadows assertion, found {text.count(old)}')
p.write_text(text.replace(old, new, 1))
PY
