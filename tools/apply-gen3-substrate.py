from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:80]!r}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


# Denser ordinary Level 0: keep world-space generation, but stop making the
# default geography read as sparse long walls. axisFlow becomes a bias rather
# than a binary orientation command.
replace_once('src/world/gen3.ts', 'const ARCHITECTURE_GRID = 20;', 'const ARCHITECTURE_GRID = 15;')
replace_once(
    'src/world/gen3.ts',
    "  return { id, cx, cy, cz, sx, sy, sz, orientation, drawable: true, materialId };",
    "  return { id, cx, cy, cz, sx, sy, sz, orientation, drawable: true, materialId, materialVariant: 0 };"
)
replace_once(
    'src/world/gen3.ts',
    """  const reach = 88;\n  const minGridX = Math.floor((centreX - reach) / ARCHITECTURE_GRID);\n  const maxGridX = Math.ceil((centreX + reach) / ARCHITECTURE_GRID);\n  const minGridZ = Math.floor((centreZ - reach) / ARCHITECTURE_GRID);\n  const maxGridZ = Math.ceil((centreZ + reach) / ARCHITECTURE_GRID);\n  for (let gridX = minGridX; gridX <= maxGridX; gridX += 1) for (let gridZ = minGridZ; gridZ <= maxGridZ; gridZ += 1) {\n    const runId = `${gridX}:${gridZ}`;\n    const anchorX = gridX * ARCHITECTURE_GRID + (unitFloat(`${seed}:gen3-run:${runId}:x`) - 0.5) * 14;\n    const anchorZ = gridZ * ARCHITECTURE_GRID + (unitFloat(`${seed}:gen3-run:${runId}:z`) - 0.5) * 14;\n    const fields = sampleWorldFieldChannels(seed, anchorX, anchorZ, ['partitionPressure', 'openness', 'axisFlow', 'roomScale']);\n    const threshold = 0.38 + fields.openness * 0.18;\n    if (fields.partitionPressure < threshold || unitFloat(`${seed}:gen3-run:${runId}:keep`) > 0.78) continue;\n    if (environment.regionId === 'pillar-field' && unitFloat(`${seed}:gen3-run:${runId}:pillar-suppress`) < 0.82 + environment.regionStrength * 0.17) continue;\n    const axis: 'x' | 'z' = fields.axisFlow < 0.5 ? 'x' : 'z';\n    const length = 24 + fields.roomScale * 62;\n""",
    """  const reach = 72;\n  const minGridX = Math.floor((centreX - reach) / ARCHITECTURE_GRID);\n  const maxGridX = Math.ceil((centreX + reach) / ARCHITECTURE_GRID);\n  const minGridZ = Math.floor((centreZ - reach) / ARCHITECTURE_GRID);\n  const maxGridZ = Math.ceil((centreZ + reach) / ARCHITECTURE_GRID);\n  for (let gridX = minGridX; gridX <= maxGridX; gridX += 1) for (let gridZ = minGridZ; gridZ <= maxGridZ; gridZ += 1) {\n    const runId = `${gridX}:${gridZ}`;\n    const anchorX = gridX * ARCHITECTURE_GRID + (unitFloat(`${seed}:gen3-run:${runId}:x`) - 0.5) * 10;\n    const anchorZ = gridZ * ARCHITECTURE_GRID + (unitFloat(`${seed}:gen3-run:${runId}:z`) - 0.5) * 10;\n    const fields = sampleWorldFieldChannels(seed, anchorX, anchorZ, ['partitionPressure', 'openness', 'axisFlow', 'roomScale', 'regularity']);\n    const threshold = 0.34 + fields.openness * 0.18;\n    const keepChance = clamp01(0.8 + fields.partitionPressure * 0.12 - fields.openness * 0.1);\n    if (fields.partitionPressure < threshold || unitFloat(`${seed}:gen3-run:${runId}:keep`) > keepChance) continue;\n    if (environment.regionId === 'pillar-field' && unitFloat(`${seed}:gen3-run:${runId}:pillar-suppress`) < 0.82 + environment.regionStrength * 0.17) continue;\n    const directionalStrength = 0.28 + fields.regularity * 0.5;\n    const zProbability = clamp01(0.5 + (fields.axisFlow - 0.5) * 2 * directionalStrength);\n    const axis: 'x' | 'z' = unitFloat(`${seed}:gen3-run:${runId}:axis`) < zProbability ? 'z' : 'x';\n    const length = 20 + fields.roomScale * 50;\n"""
)

# Gen3 finishes must not reveal streaming Cell identity. Keep legacy variants
# frozen for Gen2, while Gen3 uses stable base finish variants. Integer repeat
# counts make clipped pieces of a continuous wall meet on a texture period.
replace_once(
    'src/renderer/cellBuilder.ts',
    """    const floorMat = this.getMaterial(`floor:${profile.id}`, profile.floorTint, 'carpet', descriptor.variant % 3, [5, 5]);\n    const ceilingMat = this.getMaterial(`ceiling:${profile.id}`, profile.ceilingTint, 'ceiling', descriptor.ceilingPattern, [4, 4]);\n    const trimMat = this.getMaterial(`trim:${profile.id}`, profile.trimTint, 'wood', descriptor.variant % 2, [2, 2]);\n""",
    """    const gen3 = descriptor.world.generationVersion === 'gen3-v1';\n    const floorMat = this.getMaterial(`floor:${profile.id}`, profile.floorTint, 'carpet', gen3 ? 0 : descriptor.variant % 3, [5, 5]);\n    const ceilingMat = this.getMaterial(`ceiling:${profile.id}`, profile.ceilingTint, 'ceiling', gen3 ? 0 : descriptor.ceilingPattern, [4, 4]);\n    const trimMat = this.getMaterial(`trim:${profile.id}`, profile.trimTint, 'wood', gen3 ? 0 : descriptor.variant % 2, [2, 2]);\n"""
)
replace_once(
    'src/renderer/cellBuilder.ts',
    """    for (const wallSpec of descriptor.walls) {\n      const wallLength = Math.max(wallSpec.sx, wallSpec.sz);\n      const wallMat = legacyExitFoyer\n""",
    """    for (const wallSpec of descriptor.walls) {\n      const wallLength = Math.max(wallSpec.sx, wallSpec.sz);\n      const wallRepeats = gen3 ? Math.max(1, Math.round(wallLength / 2.6)) : Math.max(1, wallLength / 2.6);\n      const wallMat = legacyExitFoyer\n"""
)
replace_once(
    'src/renderer/cellBuilder.ts',
    "          'wall', wallSpec.materialVariant ?? descriptor.variant % 4, [Math.max(1, wallLength / 2.6), 1]",
    "          'wall', wallSpec.materialVariant ?? descriptor.variant % 4, [wallRepeats, 1]"
)
replace_once(
    'src/renderer/WorldRenderer.ts',
    "    const floorMat = this.getMaterial(`floor:${profile.id}`, profile.floorTint, 'carpet', descriptor.variant % 3, [5, 5]);",
    "    const floorMat = this.getMaterial(`floor:${profile.id}`, profile.floorTint, 'carpet', descriptor.world.generationVersion === 'gen3-v1' ? 0 : descriptor.variant % 3, [5, 5]);"
)

# Make the rendered horizon disappear before the nearest default stream edge,
# and make the clear background match the fog so an unloaded void cannot show
# as a differently coloured band.
replace_once(
    'src/world/types.ts',
    "export const DOOR_WIDTH = 3.2;\n",
    "export const DOOR_WIDTH = 3.2;\nexport const LEVEL0_FOG_START = 26;\nexport const LEVEL0_FOG_END = 41;\n"
)
replace_once(
    'src/app/ProjectNoclipGame.ts',
    "import { CELL_SIZE, DEFAULT_TUNING, type CellDescriptor, type RegionId, type WorldTuning } from '../world/types.js';",
    "import { CELL_SIZE, DEFAULT_TUNING, LEVEL0_FOG_END, LEVEL0_FOG_START, type CellDescriptor, type RegionId, type WorldTuning } from '../world/types.js';"
)
replace_once(
    'src/app/ProjectNoclipGame.ts',
    "    app.scene.fog = pc.FOG_LINEAR; app.scene.fogColor = new pc.Color(0.15, 0.135, 0.075); app.scene.fogStart = 32; app.scene.fogEnd = 100;",
    "    app.scene.fog = pc.FOG_LINEAR; app.scene.fogColor = new pc.Color(0.15, 0.135, 0.075); app.scene.fogStart = LEVEL0_FOG_START; app.scene.fogEnd = LEVEL0_FOG_END;"
)
replace_once(
    'src/app/ProjectNoclipGame.ts',
    "    camera.addComponent('camera', { clearColor: new pc.Color(0.075, 0.068, 0.038), nearClip: 0.05, farClip: 125, fov: 73 }); app.root.addChild(camera);",
    "    camera.addComponent('camera', { clearColor: new pc.Color(0.15, 0.135, 0.075), nearClip: 0.05, farClip: 125, fov: 73 }); app.root.addChild(camera);"
)
replace_once(
    'src/app/ProjectNoclipGame.ts',
    """    this.app.scene.ambientLight = new pc.Color(0.26 * visibleAmbient + 0.002, 0.245 * visibleAmbient + 0.002, 0.135 * visibleAmbient + 0.001);\n    this.app.scene.fogStart = 32 - blackoutStrength * 25;\n    this.app.scene.fogEnd = 100 - blackoutStrength * 71;\n    const cameraComponent = (this.camera as unknown as { camera?: { clearColor: pc.Color } }).camera;\n    if (cameraComponent) cameraComponent.clearColor = new pc.Color(0.075 * visibleAmbient, 0.07 * visibleAmbient, 0.036 * visibleAmbient);\n""",
    """    this.app.scene.ambientLight = new pc.Color(0.26 * visibleAmbient + 0.002, 0.245 * visibleAmbient + 0.002, 0.135 * visibleAmbient + 0.001);\n    const fogR = 0.15 * visibleAmbient;\n    const fogG = 0.135 * visibleAmbient;\n    const fogB = 0.075 * visibleAmbient;\n    this.app.scene.fogColor = new pc.Color(fogR, fogG, fogB);\n    this.app.scene.fogStart = LEVEL0_FOG_START - blackoutStrength * (LEVEL0_FOG_START - 7);\n    this.app.scene.fogEnd = LEVEL0_FOG_END - blackoutStrength * (LEVEL0_FOG_END - 29);\n    const cameraComponent = (this.camera as unknown as { camera?: { clearColor: pc.Color } }).camera;\n    if (cameraComponent) cameraComponent.clearColor = new pc.Color(fogR, fogG, fogB);\n"""
)

# Regression gates for the exact perceptual leaks this bundle addresses.
replace_once(
    'tests/generation-3.test.mjs',
    "import { DEFAULT_TUNING, CELL_SIZE, WALL_HEIGHT } from '../.test-dist/src/world/types.js';",
    "import { DEFAULT_TUNING, CELL_SIZE, LEVEL0_FOG_END, WALL_HEIGHT } from '../.test-dist/src/world/types.js';"
)
replace_once(
    'tests/generation-3.test.mjs',
    """const generated = (overrides = {}) => generateCell({\n  seed: 'gen3-architecture', x: 0, z: 0, worldDay: 40, exposure: 10, shiftEpoch: 0,\n  tuning: DEFAULT_TUNING, generationVersion: 'gen3-v1', ...overrides\n});\n\n""",
    """const generated = (overrides = {}) => generateCell({\n  seed: 'gen3-architecture', x: 0, z: 0, worldDay: 40, exposure: 10, shiftEpoch: 0,\n  tuning: DEFAULT_TUNING, generationVersion: 'gen3-v1', ...overrides\n});\n\ntest('default streaming envelope extends beyond the ordinary Level 0 fog', () => {\n  const nearestCardinalStreamEdge = DEFAULT_TUNING.activeRadius * CELL_SIZE;\n  assert.ok(nearestCardinalStreamEdge >= LEVEL0_FOG_END + 1, `fog ends at ${LEVEL0_FOG_END} m but the nearest stream edge is ${nearestCardinalStreamEdge} m`);\n});\n\n"""
)
replace_once(
    'tests/generation-3.test.mjs',
    """  assert.ok(matchedSeams >= 80, `only ${matchedSeams} naturally continuing partition seams`);\n});\n\n""",
    """  assert.ok(matchedSeams >= 80, `only ${matchedSeams} naturally continuing partition seams`);\n  const ordinaryWalls = [...cells.values()].flatMap((cell) => cell.walls);\n  const xShare = ordinaryWalls.filter((wall) => wall.orientation === 'x').length / Math.max(1, ordinaryWalls.length);\n  assert.ok(ordinaryWalls.length > cells.size, `ordinary architecture is still too sparse: ${ordinaryWalls.length} wall pieces across ${cells.size} Cells`);\n  assert.ok(xShare > 0.2 && xShare < 0.8, `ordinary architecture still has a dominant cardinal direction: ${(xShare * 100).toFixed(1)}% x-oriented`);\n  assert.ok(ordinaryWalls.every((wall) => wall.materialVariant === 0), 'Gen3 wall finish variant leaked Cell-local identity');\n});\n\n"""
)

Path('VERSION').write_text('0.3.0-dev.2\n', encoding='utf-8')
print('Applied Generation 3 substrate density/material/horizon corrections.')
