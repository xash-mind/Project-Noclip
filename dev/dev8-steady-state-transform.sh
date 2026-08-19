#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:100]!r}')
    p.write_text(text.replace(old, new, 1))

# ---------------------------------------------------------------------------
# Fixture runtime: suppress unchanged device/material writes and time the path.
# ---------------------------------------------------------------------------
path = 'src/renderer/fixtureLighting.ts'
replace_once(
    path,
    "  shadowResolutionChanges: number;\n}",
    "  shadowResolutionChanges: number;\n  panelMaterialWrites: number;\n  intensityWrites: number;\n  enabledWrites: number;\n  updateCalls: number;\n  updateMs: number;\n  maxUpdateMs: number;\n}"
)
replace_once(
    path,
    "  shadowResolutionChanges: 0\n};",
    "  shadowResolutionChanges: 0,\n  panelMaterialWrites: 0,\n  intensityWrites: 0,\n  enabledWrites: 0,\n  updateCalls: 0,\n  updateMs: 0,\n  maxUpdateMs: 0\n};"
)
replace_once(
    path,
    "): void {\n  const state = stateFor(renderer);\n  const settings = getRenderSettings();\n",
    "): void {\n  const updateStart = performance.now();\n  const state = stateFor(renderer);\n  const settings = getRenderSettings();\n"
)
replace_once(
    path,
    "    if (runtime.mesh?.render) runtime.mesh.render.material = fixtureMaterial(state, runtime.descriptor, runtime.group, pulse);\n    const light = componentFor(runtime);\n",
    "    if (runtime.mesh?.render) {\n      const material = fixtureMaterial(state, runtime.descriptor, runtime.group, pulse);\n      if (runtime.mesh.render.material !== material) {\n        runtime.mesh.render.material = material;\n        fixtureDiagnostics.panelMaterialWrites += 1;\n      }\n    }\n    const light = componentFor(runtime);\n"
)
replace_once(
    path,
    "    light.intensity = selected ? runtime.group.intensity * pulse * FIXTURE_LIGHT_INTENSITY_MULTIPLIER : 0;\n    runtime.light.enabled = selected && runtime.group.state !== 'off';\n",
    "    const intensity = selected ? runtime.group.intensity * pulse * FIXTURE_LIGHT_INTENSITY_MULTIPLIER : 0;\n    if (Math.abs(light.intensity - intensity) > 0.000001) {\n      light.intensity = intensity;\n      fixtureDiagnostics.intensityWrites += 1;\n    }\n    const enabled = selected && runtime.group.state !== 'off';\n    if (runtime.light.enabled !== enabled) {\n      runtime.light.enabled = enabled;\n      fixtureDiagnostics.enabledWrites += 1;\n    }\n"
)
replace_once(
    path,
    "    }\n  }\n}\n\nexport const FIXTURE_LIGHTING_PROFILE",
    "    }\n  }\n  const updateMs = performance.now() - updateStart;\n  fixtureDiagnostics.updateCalls += 1;\n  fixtureDiagnostics.updateMs += updateMs;\n  fixtureDiagnostics.maxUpdateMs = Math.max(fixtureDiagnostics.maxUpdateMs, updateMs);\n}\n\nexport const FIXTURE_LIGHTING_PROFILE"
)

# ---------------------------------------------------------------------------
# Static batching: retain the existing 100 ms cadence, but do no recursive
# reconciliation unless a Cell load/unload/refresh actually changed the visual
# ownership graph. Wrappers are installed after all presentation wrappers, so
# one dirty mark includes their synchronous reconstruction effects.
# ---------------------------------------------------------------------------
path = 'src/renderer/StaticWorldBatching.ts'
replace_once(
    path,
    "import { installLevel0RegionPresentation } from './level0RegionPresentation.js';\n",
    "import { installLevel0RegionPresentation } from './level0RegionPresentation.js';\nimport { WorldRenderer } from './WorldRenderer.js';\n"
)
replace_once(
    path,
    "  activeGroups: number;\n}",
    "  activeGroups: number;\n  skippedCleanPasses: number;\n  reconcileMs: number;\n  maxReconcileMs: number;\n}"
)
replace_once(
    path,
    "  activeGroups: 0\n};",
    "  activeGroups: 0,\n  skippedCleanPasses: 0,\n  reconcileMs: 0,\n  maxReconcileMs: 0\n};"
)
replace_once(
    path,
    "type ApplicationLookup = typeof pc.Application & { getApplication(id?: string): pc.Application | undefined; };\ninterface CellBatch",
    "type ApplicationLookup = typeof pc.Application & { getApplication(id?: string): pc.Application | undefined; };\nlet installed = false;\ninterface CellBatch"
)
replace_once(
    path,
    "export function installStaticWorldBatching(): void {\n  installLevel0RegionPresentation();\n",
    "export function installStaticWorldBatching(): void {\n  if (installed) return;\n  installed = true;\n  installLevel0RegionPresentation();\n"
)
replace_once(
    path,
    "  let freeGroupIds: number[] = [];\n  let cellBatches = new Map<string, CellBatch>();\n",
    "  let freeGroupIds: number[] = [];\n  let cellBatches = new Map<string, CellBatch>();\n  let dirty = true;\n"
)
replace_once(
    path,
    "    cellBatches = new Map();\n  };",
    "    cellBatches = new Map();\n    dirty = true;\n  };"
)
replace_once(
    path,
    "  const reconcile = (): void => {\n    batchingDiagnostics.reconcilePasses += 1;\n    const app = getRunningApplication();\n    if (!app) return;\n    if (app !== currentApp) reset(app);\n",
    "  const reconcile = (): void => {\n    if (!dirty) {\n      batchingDiagnostics.skippedCleanPasses += 1;\n      return;\n    }\n    const reconcileStart = performance.now();\n    batchingDiagnostics.reconcilePasses += 1;\n    const app = getRunningApplication();\n    if (!app) return;\n    if (app !== currentApp) reset(app);\n    dirty = false;\n"
)
replace_once(
    path,
    "    for (const cell of cells) {\n      const batch = cellBatches.get(cell.guid) ?? allocate(app, cell);\n      if (assignStaticVisuals(cell, batch.id)) {\n        app.batcher.markGroupDirty(batch.id);\n        batchingDiagnostics.dirtyCalls += 1;\n      }\n    }\n  };\n  reconcile();\n  window.setInterval(reconcile, RECONCILE_INTERVAL_MS);\n}",
    "    for (const cell of cells) {\n      const batch = cellBatches.get(cell.guid) ?? allocate(app, cell);\n      if (assignStaticVisuals(cell, batch.id)) {\n        app.batcher.markGroupDirty(batch.id);\n        batchingDiagnostics.dirtyCalls += 1;\n      }\n    }\n    const reconcileMs = performance.now() - reconcileStart;\n    batchingDiagnostics.reconcileMs += reconcileMs;\n    batchingDiagnostics.maxReconcileMs = Math.max(batchingDiagnostics.maxReconcileMs, reconcileMs);\n  };\n\n  const originalLoadCell = WorldRenderer.prototype.loadCell;\n  WorldRenderer.prototype.loadCell = function batchingLoadCell(this: WorldRenderer, descriptor): void {\n    const loadedBefore = this.loaded.has(descriptor.id);\n    originalLoadCell.call(this, descriptor);\n    if (!loadedBefore && this.loaded.has(descriptor.id)) dirty = true;\n  };\n  const originalUnloadCell = WorldRenderer.prototype.unloadCell;\n  WorldRenderer.prototype.unloadCell = function batchingUnloadCell(this: WorldRenderer, cellId): void {\n    const loadedBefore = this.loaded.has(cellId);\n    originalUnloadCell.call(this, cellId);\n    if (loadedBefore && !this.loaded.has(cellId)) dirty = true;\n  };\n\n  reconcile();\n  window.setInterval(reconcile, RECONCILE_INTERVAL_MS);\n}"
)

# ---------------------------------------------------------------------------
# Extend runtime regression checks around the new no-op suppression behavior.
# ---------------------------------------------------------------------------
path = 'tests/dev8-runtime-diagnostics.test.mjs'
replace_once(
    path,
    "  assert.match(updateBody, /light\\.intensity = selected/);\n",
    "  assert.match(updateBody, /const intensity = selected/);\n"
)
replace_once(
    path,
    "  assert.match(updateBody, /fixtureDiagnostics\\.shadowUpdateRequests \\+= 1/);\n});",
    "  assert.match(updateBody, /fixtureDiagnostics\\.shadowUpdateRequests \\+= 1/);\n  assert.match(updateBody, /runtime\\.mesh\\.render\\.material !== material/);\n  assert.match(updateBody, /Math\\.abs\\(light\\.intensity - intensity\\) > 0\\.000001/);\n  assert.match(updateBody, /runtime\\.light\\.enabled !== enabled/);\n  assert.match(updateBody, /fixtureDiagnostics\\.maxUpdateMs/);\n});"
)
replace_once(
    path,
    "  assert.match(batchingSource, /activeGroups/);\n});",
    "  assert.match(batchingSource, /activeGroups/);\n  assert.match(batchingSource, /if \\(!dirty\\)/);\n  assert.match(batchingSource, /skippedCleanPasses/);\n  assert.match(batchingSource, /WorldRenderer\\.prototype\\.loadCell/);\n  assert.match(batchingSource, /WorldRenderer\\.prototype\\.unloadCell/);\n  assert.match(batchingSource, /maxReconcileMs/);\n});"
)
PY
