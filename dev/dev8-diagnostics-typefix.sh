#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
p = Path('src/renderer/rendererRuntimeDiagnostics.ts')
text = p.read_text()
old = "  const canvas = app.graphicsDevice.canvas as HTMLCanvasElement;\n"
new = "  const graphicsDevice = (app as unknown as { graphicsDevice: unknown }).graphicsDevice;\n  const canvas = (graphicsDevice as { canvas: HTMLCanvasElement }).canvas;\n"
if text.count(old) != 1:
    raise SystemExit(f'expected one graphicsDevice canvas access, found {text.count(old)}')
text = text.replace(old, new, 1)
old = "  const device = app.graphicsDevice as unknown as GraphicsDeviceEvents;\n"
new = "  const device = graphicsDevice as GraphicsDeviceEvents;\n"
if text.count(old) != 1:
    raise SystemExit(f'expected one graphicsDevice event cast, found {text.count(old)}')
p.write_text(text.replace(old, new, 1))
PY
