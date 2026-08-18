from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected exactly one replacement, found {count}: {old[:120]!r}')
    write(path, text.replace(old, new, 1))


def replace_span(path: str, start: str, end: str, replacement: str) -> None:
    text = read(path)
    start_index = text.find(start)
    if start_index < 0:
        raise RuntimeError(f'{path}: missing start marker {start!r}')
    end_index = text.find(end, start_index)
    if end_index < 0:
        raise RuntimeError(f'{path}: missing end marker {end!r}')
    write(path, text[:start_index] + replacement + text[end_index:])


def insert_before(path: str, marker: str, content: str) -> None:
    text = read(path)
    index = text.find(marker)
    if index < 0:
        raise RuntimeError(f'{path}: missing marker {marker!r}')
    write(path, text[:index] + content + text[index:])


def insert_after(path: str, marker: str, content: str) -> None:
    text = read(path)
    index = text.find(marker)
    if index < 0:
        raise RuntimeError(f'{path}: missing marker {marker!r}')
    index += len(marker)
    write(path, text[:index] + content + text[index:])


# ---------------------------------------------------------------------------
# WorldRenderer: explicit coherent Cell-scene transaction owner.
# ---------------------------------------------------------------------------
insert_after(
    'src/renderer/WorldRenderer.ts',
    "export type { InteractionVisual, WorldItemVisual } from './support.js';\n",
    """

export type CellSceneMutationReason = 'ordinary-streaming' | 'startup' | 'presentation-refresh' | 'developer-teleport';

export interface CellSceneMutationSummary {
  reason: CellSceneMutationReason;
  loadedCellIds: readonly string[];
  unloadedCellIds: readonly string[];
  refreshedCellIds: readonly string[];
}

type CellSceneMutationListener = (summary: CellSceneMutationSummary) => void;
"""
)
replace_once(
    'src/renderer/WorldRenderer.ts',
    """  private readonly cellBuilder: RendererCellBuilder;
  private labShowcaseRoot?: pc.Entity;
  private labShowcaseCount = 0;
""",
    """  private readonly cellBuilder: RendererCellBuilder;
  private readonly sceneMutationStartListeners = new Set<CellSceneMutationListener>();
  private readonly sceneMutationCompleteListeners = new Set<CellSceneMutationListener>();
  private sceneMutationDepth = 0;
  private sceneMutationReason: CellSceneMutationReason = 'ordinary-streaming';
  private sceneMutationLoadedCellIds = new Set<string>();
  private sceneMutationUnloadedCellIds = new Set<string>();
  private sceneMutationRefreshedCellIds = new Set<string>();
  private labShowcaseRoot?: pc.Entity;
  private labShowcaseCount = 0;
"""
)
insert_after(
    'src/renderer/WorldRenderer.ts',
    "  get lightFixtureCount(): number { return [...this.loaded.values()].reduce((sum, visual) => sum + visual.descriptor.lightGroups.reduce((groupSum, group) => groupSum + group.fixtures.length, 0), 0); }\n",
    """
  get cellSceneMutationActive(): boolean { return this.sceneMutationDepth > 0; }

  onCellSceneMutationStart(listener: CellSceneMutationListener): () => void {
    this.sceneMutationStartListeners.add(listener);
    return () => this.sceneMutationStartListeners.delete(listener);
  }

  onCellSceneMutationComplete(listener: CellSceneMutationListener): () => void {
    this.sceneMutationCompleteListeners.add(listener);
    return () => this.sceneMutationCompleteListeners.delete(listener);
  }

  runCellSceneMutation<T>(reason: CellSceneMutationReason, mutation: () => T): T {
    const outermost = this.sceneMutationDepth === 0;
    if (outermost) {
      this.sceneMutationReason = reason;
      this.sceneMutationLoadedCellIds = new Set();
      this.sceneMutationUnloadedCellIds = new Set();
      this.sceneMutationRefreshedCellIds = new Set();
      const startSummary: CellSceneMutationSummary = {
        reason,
        loadedCellIds: [],
        unloadedCellIds: [],
        refreshedCellIds: []
      };
      for (const listener of [...this.sceneMutationStartListeners]) listener(startSummary);
    }

    this.sceneMutationDepth += 1;
    try {
      return mutation();
    } finally {
      this.sceneMutationDepth -= 1;
      if (outermost && this.sceneMutationDepth === 0) {
        const summary: CellSceneMutationSummary = {
          reason: this.sceneMutationReason,
          loadedCellIds: [...this.sceneMutationLoadedCellIds],
          unloadedCellIds: [...this.sceneMutationUnloadedCellIds],
          refreshedCellIds: [...this.sceneMutationRefreshedCellIds]
        };
        for (const listener of [...this.sceneMutationCompleteListeners]) listener(summary);
      }
    }
  }
"""
)
replace_once(
    'src/renderer/WorldRenderer.ts',
    """  loadCell(descriptor: CellDescriptor): void {
    if (this.loaded.has(descriptor.id)) return;
    const visual = this.cellBuilder.buildCell(descriptor);
    this.replaceFixtureMeshes(visual);
    if (descriptor.floorPatches.some((patch) => patch.kind === 'hole')) this.replaceHoleFloor(visual);
    this.loaded.set(descriptor.id, visual);
    this.renderMarksForCell(descriptor.id);
  }

  unloadCell(cellId: string): void {
    const visual = this.loaded.get(cellId); if (!visual) return;
    for (const collider of visual.colliders) this.walls.delete(collider.id);
    for (const interaction of visual.interactions) this.interactions.delete(interaction.id);
    this.markRoots.get(cellId)?.destroy(); this.markRoots.delete(cellId);
    visual.root.destroy(); this.loaded.delete(cellId);
  }
  refreshCell(descriptor: CellDescriptor): void { this.unloadCell(descriptor.id); this.loadCell(descriptor); }
""",
    """  loadCell(descriptor: CellDescriptor): void {
    if (this.loaded.has(descriptor.id)) return;
    const visual = this.cellBuilder.buildCell(descriptor);
    this.replaceFixtureMeshes(visual);
    if (descriptor.floorPatches.some((patch) => patch.kind === 'hole')) this.replaceHoleFloor(visual);
    this.loaded.set(descriptor.id, visual);
    if (this.cellSceneMutationActive) this.sceneMutationLoadedCellIds.add(descriptor.id);
    this.renderMarksForCell(descriptor.id);
  }

  unloadCell(cellId: string): void {
    const visual = this.loaded.get(cellId); if (!visual) return;
    for (const collider of visual.colliders) this.walls.delete(collider.id);
    for (const interaction of visual.interactions) this.interactions.delete(interaction.id);
    this.markRoots.get(cellId)?.destroy(); this.markRoots.delete(cellId);
    visual.root.destroy(); this.loaded.delete(cellId);
    if (this.cellSceneMutationActive) this.sceneMutationUnloadedCellIds.add(cellId);
  }
  refreshCell(descriptor: CellDescriptor): void {
    if (this.cellSceneMutationActive) this.sceneMutationRefreshedCellIds.add(descriptor.id);
    this.unloadCell(descriptor.id);
    this.loadCell(descriptor);
  }
"""
)

# ---------------------------------------------------------------------------
# ProjectNoclipGame: replace force=true with explicit streaming intent and make
# developer relocation one synchronous scene transaction.
# ---------------------------------------------------------------------------
insert_after(
    'src/app/ProjectNoclipGame.ts',
    """interface PlayCanvasRenderControl {
  autoRender: boolean;
  renderNextFrame: boolean;
}
""",
    """

interface StreamingRequest {
  reason?: 'ordinary-streaming' | 'startup' | 'presentation-refresh' | 'developer-teleport';
  radiusOverride?: number;
  refreshUnchanged?: boolean;
}
"""
)
replace_once(
    'src/app/ProjectNoclipGame.ts',
    "    this.updateStreaming(true, startupRadius); this.updateCameraRotation(); this.started = true; this.paused = true;",
    "    this.updateStreaming({ reason: 'startup', radiusOverride: startupRadius }); this.updateCameraRotation(); this.started = true; this.paused = true;"
)
replace_span(
    'src/app/ProjectNoclipGame.ts',
    '  private updateStreaming(',
    '\n\n  private scheduleStreamingWarmup',
    """  private updateStreaming(request: StreamingRequest = {}): void {
    if (!this.save || !this.renderer) return;
    const reason = request.reason ?? 'ordinary-streaming';
    const radiusOverride = request.radiusOverride;
    if (radiusOverride === undefined) this.streamWarmupToken += 1;
    const exposure = this.tuning.exposureOverride ?? calculateExposureDay(this.save.exposure);
    const worldDay = this.tuning.worldDayOverride ?? calculateWorldDay(Date.now());
    const targetRadius = Math.max(1, Math.min(4, Math.round(this.tuning.activeRadius)));
    const radius = Math.max(1, Math.min(targetRadius, radiusOverride ?? targetRadius));
    const desired = new Map<string, CellDescriptor>();

    for (let x = this.currentCellX - radius; x <= this.currentCellX + radius; x += 1) {
      for (let z = this.currentCellZ - radius; z <= this.currentCellZ + radius; z += 1) {
        const id = `${x}:${z}`;
        desired.set(id, generateCell({
          seed: this.save.seed,
          x,
          z,
          worldDay,
          exposure,
          shiftEpoch: this.save.shiftEpochs[id] ?? 0,
          tuning: this.tuning,
          generationVersion: this.save.generationVersion
        }));
      }
    }

    this.renderer.runCellSceneMutation(reason, () => {
      for (const [id, visual] of [...this.renderer!.loaded.entries()]) {
        if (desired.has(id)) continue;
        const distance = Math.max(
          Math.abs(visual.descriptor.address.cellX - this.currentCellX),
          Math.abs(visual.descriptor.address.cellZ - this.currentCellZ)
        );
        const unloadCount = (this.save!.unloadCounts[id] ?? 0) + 1;
        this.save!.unloadCounts[id] = unloadCount;
        if (
          this.save!.generationVersion === 'gen2'
          && canShift({ occupied: false, observed: false, distanceInCells: distance, stability: visual.descriptor.stability, protectedInteraction: false, preservesPath: true })
          && shouldShift(this.save!.seed, id, unloadCount, this.tuning.shiftChance)
        ) this.save!.shiftEpochs[id] = (this.save!.shiftEpochs[id] ?? 0) + 1;
        this.renderer!.unloadCell(id);
      }

      for (const [id, descriptor] of desired) {
        const existing = this.renderer!.loaded.get(id)?.descriptor;
        if (!existing) this.renderer!.loadCell(descriptor);
        else if (
          request.refreshUnchanged
          || existing.address.shiftEpoch !== descriptor.address.shiftEpoch
          || existing.address.zoneId !== descriptor.address.zoneId
          || existing.roomArchetype !== descriptor.roomArchetype
        ) this.renderer!.refreshCell(descriptor);
      }
    });

    this.currentCell = desired.get(`${this.currentCellX}:${this.currentCellZ}`);
    const position = this.camera?.getPosition();
    if (position) {
      this.renderer.updateFixtureLighting(
        this.journeyElapsed,
        this.save.settings.reducedFlicker,
        position.x,
        position.z
      );
    }
    if (this.app) {
      const rendering = renderControl(this.app);
      if (!rendering.autoRender) rendering.renderNextFrame = true;
    }
    this.refreshRegionExtent(); this.refreshLightField(); this.notifyRegionEntry();
  }
"""
)
replace_once(
    'src/app/ProjectNoclipGame.ts',
    "      this.updateStreaming(true, targetRadius);",
    "      this.updateStreaming({ reason: 'startup', radiusOverride: targetRadius });"
)
replace_once(
    'src/app/ProjectNoclipGame.ts',
    "    this.regionExtentKey = ''; this.updateStreaming(true);",
    "    this.regionExtentKey = ''; this.updateStreaming({ reason: 'developer-teleport' });"
)
replace_once(
    'src/app/ProjectNoclipGame.ts',
    "    this.updateStreaming(true);\n    const extent = estimateBlackoutExtent",
    "    this.updateStreaming({ reason: 'developer-teleport' });\n    const extent = estimateBlackoutExtent"
)
replace_once(
    'src/app/ProjectNoclipGame.ts',
    "    this.updateStreaming(true);\n    this.ui.toast(`Located a natural ${occurrence.radius.toFixed(0)} m floor-hole cluster",
    "    this.updateStreaming({ reason: 'developer-teleport' });\n    this.ui.toast(`Located a natural ${occurrence.radius.toFixed(0)} m floor-hole cluster"
)
replace_once(
    'src/app/ProjectNoclipGame.ts',
    "    this.updateStreaming(true);\n    this.ui.toast(`Located the natural Manila Room",
    "    this.updateStreaming({ reason: 'developer-teleport' });\n    this.ui.toast(`Located the natural Manila Room"
)
replace_once(
    'src/app/ProjectNoclipGame.ts',
    "    if (this.started) this.updateStreaming(true);",
    "    if (this.started) this.updateStreaming({ reason: 'presentation-refresh', refreshUnchanged: true });"
)
replace_once(
    'src/app/ProjectNoclipGame.ts',
    "      `fixture lights ${this.renderer.activeRealtimeFixtureLightCount}/${this.renderer.realtimeFixtureLightCount} active/real`,",
    "      `fixture lights ${this.renderer.activeRealtimeFixtureLightCount}/${this.renderer.realtimeFixtureLightCount} active/real`,\n      `fixture shadows ${this.renderer.shadowedRealtimeFixtureLightCount} shadow-casting active`,"
)
insert_before(
    'src/app/ProjectNoclipGame.ts',
    '  private async persist(): Promise<void>',
    """  rendererLifecycleDiagnostics(): Record<string, unknown> {
    if (!this.renderer) return { ready: false };
    let attachedCellRootCount = 0;
    let floorCellCount = 0;
    let ceilingCellCount = 0;
    let staticRenderableCellCount = 0;
    let archSmoothCurveCount = 0;
    let archBlockCurveCount = 0;

    for (const visual of this.renderer.loaded.values()) {
      if (visual.root.parent) attachedCellRootCount += 1;
      const children = [...(visual.root as pc.Entity & { children: readonly pc.Entity[] }).children];
      if (children.some((child) => child.name === 'floor' || child.name.startsWith('floor-piece:'))) floorCellCount += 1;
      if (children.some((child) => child.name === 'ceiling')) ceilingCellCount += 1;
      if (children.some((child) => child.render && !child.name.startsWith('fixture-owned-light:'))) staticRenderableCellCount += 1;
      archSmoothCurveCount += children.filter((child) => child.name.startsWith('arch-frame:smooth-curve:')).length;
      archBlockCurveCount += children.filter((child) => child.name.startsWith('arch-frame:curve-segment:')).length;
    }

    return {
      ready: true,
      currentCellId: this.currentCell?.id,
      currentRegion: this.currentCell?.world.regionId,
      loadedCellCount: this.renderer.loadedCellCount,
      attachedCellRootCount,
      floorCellCount,
      ceilingCellCount,
      staticRenderableCellCount,
      archSmoothCurveCount,
      archBlockCurveCount,
      fixture: this.renderer.fixtureLifecycleDiagnostics(),
      batching: this.renderer.staticBatchLifecycleDiagnostics()
    };
  }

"""
)

# ---------------------------------------------------------------------------
# Fixture lighting: stale lights are explicitly neutralized before Cell root
# destruction; shadow refresh is deferred until coherent transaction completion.
# ---------------------------------------------------------------------------
replace_span(
    'src/renderer/fixtureLighting.ts',
    'function stateFor(renderer: WorldRenderer): RendererFixtureState {',
    '\n\nfunction childrenOf',
    """function stateFor(renderer: WorldRenderer): RendererFixtureState {
  const existing = states.get(renderer);
  if (existing) return existing;
  const created: RendererFixtureState = { fixtures: new Map(), materials: new Map() };
  states.set(renderer, created);
  renderer.onCellSceneMutationStart(() => suspendFixtureLighting(created));
  renderer.onCellSceneMutationComplete(() => finalizeFixtureSceneMutation(renderer, created));
  return created;
}
"""
)
insert_after(
    'src/renderer/fixtureLighting.ts',
    """function componentFor(runtime: FixtureRuntime): FixtureLightComponent | undefined {
  return runtime.light.light as unknown as FixtureLightComponent | undefined;
}
""",
    """

function suspendFixtureRuntime(runtime: FixtureRuntime): void {
  runtime.selected = false;
  runtime.shadowDirty = false;
  const light = componentFor(runtime);
  if (light) {
    light.intensity = 0;
    light.shadowUpdateMode = pc.SHADOWUPDATE_NONE;
  }
  runtime.light.enabled = false;
}

function suspendFixtureLighting(state: RendererFixtureState): void {
  for (const runtime of state.fixtures.values()) suspendFixtureRuntime(runtime);
}

function finalizeFixtureSceneMutation(renderer: WorldRenderer, state: RendererFixtureState): void {
  for (const [id, runtime] of [...state.fixtures.entries()]) {
    const visual = renderer.loaded.get(runtime.cellId);
    if (!visual || runtime.light.parent !== visual.root) {
      suspendFixtureRuntime(runtime);
      if (runtime.light.parent) runtime.light.destroy();
      state.fixtures.delete(id);
      continue;
    }
    runtime.selected = false;
    runtime.shadowDirty = true;
  }
}
"""
)
replace_span(
    'src/renderer/fixtureLighting.ts',
    'function detachCellFixtures(renderer: WorldRenderer, cellId: string, descriptor?: CellDescriptor): void {',
    '\n\nfunction updateFixtureLighting',
    """function detachCellFixtures(renderer: WorldRenderer, cellId: string, descriptor?: CellDescriptor): void {
  const state = states.get(renderer);
  if (!state) return;
  if (descriptor) markFixtureShadowsDirtyNearCell(state, descriptor);
  for (const [id, runtime] of [...state.fixtures.entries()]) {
    if (runtime.cellId !== cellId) continue;
    suspendFixtureRuntime(runtime);
    runtime.light.destroy();
    state.fixtures.delete(id);
  }
}
"""
)
replace_once(
    'src/renderer/fixtureLighting.ts',
    """function updateFixtureLighting(
  renderer: WorldRenderer,
  elapsedSeconds: number,
  reducedFlicker: boolean,
  playerX: number,
  playerZ: number
): void {
  const state = stateFor(renderer);
""",
    """function updateFixtureLighting(
  renderer: WorldRenderer,
  elapsedSeconds: number,
  reducedFlicker: boolean,
  playerX: number,
  playerZ: number
): void {
  const state = stateFor(renderer);
  if (renderer.cellSceneMutationActive) return;
"""
)
replace_once(
    'src/renderer/fixtureLighting.ts',
    """    light.shadowBias = FIXTURE_SHADOW_BIAS;
    light.normalOffsetBias = FIXTURE_SHADOW_NORMAL_OFFSET;
    light.intensity = selected ? runtime.group.intensity * pulse * FIXTURE_LIGHT_INTENSITY_MULTIPLIER : 0;
""",
    """    light.shadowBias = FIXTURE_SHADOW_BIAS;
    light.normalOffsetBias = FIXTURE_SHADOW_NORMAL_OFFSET;
    light.shadowUpdateMode = pc.SHADOWUPDATE_NONE;
    light.intensity = selected ? runtime.group.intensity * pulse * FIXTURE_LIGHT_INTENSITY_MULTIPLIER : 0;
"""
)
insert_before(
    'src/renderer/fixtureLighting.ts',
    'export const FIXTURE_LIGHTING_PROFILE',
    """export interface FixtureLifecycleDiagnostics {
  runtimeCount: number;
  activeCount: number;
  shadowedCount: number;
  staleCellIds: readonly string[];
  detachedLightIds: readonly string[];
  invalidSelectedIds: readonly string[];
}

function fixtureLifecycleDiagnostics(renderer: WorldRenderer): FixtureLifecycleDiagnostics {
  const state = states.get(renderer);
  if (!state) return { runtimeCount: 0, activeCount: 0, shadowedCount: 0, staleCellIds: [], detachedLightIds: [], invalidSelectedIds: [] };
  const staleCellIds = new Set<string>();
  const detachedLightIds: string[] = [];
  const invalidSelectedIds: string[] = [];
  let activeCount = 0;
  let shadowedCount = 0;

  for (const runtime of state.fixtures.values()) {
    const visual = renderer.loaded.get(runtime.cellId);
    const light = componentFor(runtime);
    if (!visual) staleCellIds.add(runtime.cellId);
    if (!visual || runtime.light.parent !== visual.root) detachedLightIds.push(runtime.id);
    if (runtime.selected && runtime.light.enabled && runtime.group.state !== 'off') {
      activeCount += 1;
      if (light?.castShadows) shadowedCount += 1;
      else invalidSelectedIds.push(runtime.id);
    }
  }

  return {
    runtimeCount: state.fixtures.size,
    activeCount,
    shadowedCount,
    staleCellIds: [...staleCellIds],
    detachedLightIds,
    invalidSelectedIds
  };
}

"""
)
replace_once(
    'src/renderer/fixtureLighting.ts',
    """    readonly realtimeFixtureLightCount: number;
    readonly activeRealtimeFixtureLightCount: number;
    readonly shadowedRealtimeFixtureLightCount: number;
""",
    """    readonly realtimeFixtureLightCount: number;
    readonly activeRealtimeFixtureLightCount: number;
    readonly shadowedRealtimeFixtureLightCount: number;
    fixtureLifecycleDiagnostics(): FixtureLifecycleDiagnostics;
"""
)
insert_before(
    'src/renderer/fixtureLighting.ts',
    "  Object.defineProperty(WorldRenderer.prototype, 'realtimeFixtureLightCount', {",
    """  WorldRenderer.prototype.fixtureLifecycleDiagnostics = function patchedFixtureLifecycleDiagnostics(
    this: WorldRenderer
  ): FixtureLifecycleDiagnostics {
    return fixtureLifecycleDiagnostics(this);
  };

"""
)

# ---------------------------------------------------------------------------
# Static batching: explicit per-renderer, per-Cell reconciliation at the scene
# transaction boundary. No independent interval can observe a half-built scene.
# ---------------------------------------------------------------------------
write('src/renderer/StaticWorldBatching.ts', """import * as pc from 'playcanvas';
import { CELL_SIZE, type CellDescriptor } from '../world/types.js';
import { installArchDividerRuntimeCorrection } from './archDividerRuntimeCorrection.js';
import { isMFluorescentPanelVisualName } from './fixtureVisualOwnership.js';
import { installFixtureLighting } from './fixtureLighting.js';
import { installLevel0RegionPresentation } from './level0RegionPresentation.js';
import { WorldRenderer } from './WorldRenderer.js';

const STATIC_WORLD_BATCH_GROUP_ID_START = 1601;
const STATIC_WORLD_BATCH_GROUP_NAME = 'level0-static-cell';
const EXCLUDED_SUBTREE_PREFIXES = ['item:', 'note:', 'exit:', 'exit-frame:', 'crack:'] as const;

export const STATIC_WORLD_BATCHING_PROFILE = Object.freeze({
  mode: 'per-cell' as const,
  reconcileMode: 'scene-mutation-boundary' as const,
  maxAabbSize: CELL_SIZE * 1.5,
  excludesFluorescentPanels: true
});

type BatchRenderComponent = { batchGroupId: number };
type BatchEntity = pc.Entity & { name: string; guid: string; children: readonly unknown[]; render?: { material: pc.StandardMaterial } & BatchRenderComponent; };
type BatchManager = {
  addGroup(name: string, dynamic: boolean, maxAabbSize: number, id?: number): unknown;
  removeGroup(id: number): void;
  markGroupDirty(id: number): void;
};
type BatchApplication = pc.Application & { batcher: BatchManager };
interface RendererAccess { app: BatchApplication; }
interface CellBatch { id: number; guid: string; }
interface RendererBatchState {
  app: BatchApplication;
  nextGroupId: number;
  freeGroupIds: number[];
  cellBatches: Map<string, CellBatch>;
  dirty: boolean;
}

export interface StaticBatchLifecycleDiagnostics {
  batchCount: number;
  loadedCellCount: number;
  missingCellIds: readonly string[];
  staleCellIds: readonly string[];
  mismatchedRootIds: readonly string[];
}

const states = new WeakMap<WorldRenderer, RendererBatchState>();
let installed = false;

function isBatchEntity(node: unknown): node is BatchEntity { return node instanceof pc.Entity; }
function isExcludedSubtree(entity: BatchEntity): boolean { return EXCLUDED_SUBTREE_PREFIXES.some((prefix) => entity.name.startsWith(prefix)); }
function assignStaticVisuals(entity: BatchEntity, batchGroupId: number): boolean {
  if (isExcludedSubtree(entity)) return false;
  if (isMFluorescentPanelVisualName(entity.name)) {
    if (entity.render && entity.render.batchGroupId !== -1) { entity.render.batchGroupId = -1; return true; }
    return false;
  }
  let changed = false;
  if (entity.render && entity.render.batchGroupId !== batchGroupId) { entity.render.batchGroupId = batchGroupId; changed = true; }
  for (const child of entity.children) if (isBatchEntity(child)) changed = assignStaticVisuals(child, batchGroupId) || changed;
  return changed;
}

function stateFor(renderer: WorldRenderer): RendererBatchState {
  const existing = states.get(renderer);
  if (existing) return existing;
  const app = (renderer as unknown as RendererAccess).app;
  const created: RendererBatchState = {
    app,
    nextGroupId: STATIC_WORLD_BATCH_GROUP_ID_START,
    freeGroupIds: [],
    cellBatches: new Map(),
    dirty: true
  };
  states.set(renderer, created);
  renderer.onCellSceneMutationComplete(() => {
    const state = states.get(renderer);
    if (!state) return;
    state.dirty = true;
    reconcile(renderer);
  });
  return created;
}

function releaseBatch(state: RendererBatchState, cellId: string, batch: CellBatch): void {
  state.app.batcher.removeGroup(batch.id);
  state.freeGroupIds.push(batch.id);
  state.cellBatches.delete(cellId);
}

function allocateBatch(state: RendererBatchState, cellId: string, cell: BatchEntity): CellBatch {
  const id = state.freeGroupIds.pop() ?? state.nextGroupId++;
  state.app.batcher.addGroup(`${STATIC_WORLD_BATCH_GROUP_NAME}:${cell.guid}`, false, STATIC_WORLD_BATCHING_PROFILE.maxAabbSize, id);
  const batch = { id, guid: cell.guid };
  state.cellBatches.set(cellId, batch);
  return batch;
}

function reconcile(renderer: WorldRenderer): void {
  const state = stateFor(renderer);
  if (!state.dirty) return;
  const loaded = new Map<string, BatchEntity>(
    [...renderer.loaded.entries()].map(([cellId, visual]) => [cellId, visual.root as BatchEntity])
  );

  for (const [cellId, batch] of [...state.cellBatches.entries()]) {
    const root = loaded.get(cellId);
    if (!root || root.guid !== batch.guid) releaseBatch(state, cellId, batch);
  }

  for (const [cellId, cell] of loaded) {
    const batch = state.cellBatches.get(cellId) ?? allocateBatch(state, cellId, cell);
    if (assignStaticVisuals(cell, batch.id)) state.app.batcher.markGroupDirty(batch.id);
  }
  state.dirty = false;
}

function markDirty(renderer: WorldRenderer): void {
  const state = stateFor(renderer);
  state.dirty = true;
  if (!renderer.cellSceneMutationActive) reconcile(renderer);
}

function staticBatchLifecycleDiagnostics(renderer: WorldRenderer): StaticBatchLifecycleDiagnostics {
  const state = states.get(renderer);
  if (!state) return { batchCount: 0, loadedCellCount: renderer.loaded.size, missingCellIds: [...renderer.loaded.keys()], staleCellIds: [], mismatchedRootIds: [] };
  const missingCellIds: string[] = [];
  const staleCellIds: string[] = [];
  const mismatchedRootIds: string[] = [];
  for (const [cellId, visual] of renderer.loaded) {
    const batch = state.cellBatches.get(cellId);
    if (!batch) missingCellIds.push(cellId);
    else if (batch.guid !== (visual.root as BatchEntity).guid) mismatchedRootIds.push(cellId);
  }
  for (const cellId of state.cellBatches.keys()) if (!renderer.loaded.has(cellId)) staleCellIds.push(cellId);
  return { batchCount: state.cellBatches.size, loadedCellCount: renderer.loaded.size, missingCellIds, staleCellIds, mismatchedRootIds };
}

declare module './WorldRenderer.js' {
  interface WorldRenderer {
    staticBatchLifecycleDiagnostics(): StaticBatchLifecycleDiagnostics;
  }
}

/** Static geometry is batched per streamed Cell and reconciled only after coherent scene mutation. */
export function installStaticWorldBatching(): void {
  if (installed) return;
  installed = true;
  installLevel0RegionPresentation();
  installArchDividerRuntimeCorrection();
  installFixtureLighting();

  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function patchedStaticBatchLoad(this: WorldRenderer, descriptor: CellDescriptor): void {
    originalLoadCell.call(this, descriptor);
    markDirty(this);
  };

  const originalUnloadCell = WorldRenderer.prototype.unloadCell;
  WorldRenderer.prototype.unloadCell = function patchedStaticBatchUnload(this: WorldRenderer, cellId: string): void {
    originalUnloadCell.call(this, cellId);
    markDirty(this);
  };

  WorldRenderer.prototype.staticBatchLifecycleDiagnostics = function patchedStaticBatchLifecycleDiagnostics(
    this: WorldRenderer
  ): StaticBatchLifecycleDiagnostics {
    if (!this.cellSceneMutationActive) reconcile(this);
    return staticBatchLifecycleDiagnostics(this);
  };
}
""")

# ---------------------------------------------------------------------------
# A-A1 presentation: one authoritative owner in level0RegionPresentation.
# ---------------------------------------------------------------------------
replace_once(
    'src/renderer/level0RegionPresentation.ts',
    'interface RegionPresentationCache { materials: Map<string, pc.StandardMaterial>; }',
    'interface RegionPresentationCache { materials: Map<string, pc.StandardMaterial>; smoothCurveMesh?: pc.Mesh; }'
)
replace_span(
    'src/renderer/level0RegionPresentation.ts',
    'export interface ArchCurveSegment {',
    'export interface HoleDepthBand',
    ''
)
replace_once(
    'src/renderer/level0RegionPresentation.ts',
    """// Keep the accepted A-A1 silhouette, but use a small fixed set of shared box
// primitives instead of allocating one-off custom GPU meshes while streaming.
const ARCH_CURVE_SEGMENTS = 12;
""",
    """// The central A-A1 curve is one shared smooth mesh. Rectangular structural
// pieces remain Cell-local so streaming ownership stays localized.
const SMOOTH_CURVE_SEGMENTS = 48;
"""
)
replace_once(
    'src/renderer/level0RegionPresentation.ts',
    "  const created = { materials: new Map<string, pc.StandardMaterial>() };",
    "  const created: RegionPresentationCache = { materials: new Map<string, pc.StandardMaterial>() };"
)
insert_before(
    'src/renderer/level0RegionPresentation.ts',
    'export function carpetProfileForCell',
    """function subtract(left: Vec3Tuple, right: Vec3Tuple): Vec3Tuple {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function cross(left: Vec3Tuple, right: Vec3Tuple): Vec3Tuple {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0]
  ];
}

function normalize(value: Vec3Tuple): Vec3Tuple {
  const length = Math.hypot(value[0], value[1], value[2]) || 1;
  return [value[0] / length, value[1] / length, value[2] / length];
}

function dot(left: Vec3Tuple, right: Vec3Tuple): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function pushQuad(
  positions: number[],
  normals: number[],
  indices: number[],
  points: readonly [Vec3Tuple, Vec3Tuple, Vec3Tuple, Vec3Tuple],
  desiredNormal: Vec3Tuple
): void {
  let ordered = [...points] as Vec3Tuple[];
  let normal = normalize(cross(subtract(ordered[1]!, ordered[0]!), subtract(ordered[2]!, ordered[0]!)));
  if (dot(normal, desiredNormal) < 0) {
    ordered = [ordered[0]!, ordered[3]!, ordered[2]!, ordered[1]!];
    normal = normalize(cross(subtract(ordered[1]!, ordered[0]!), subtract(ordered[2]!, ordered[0]!)));
  }
  const base = positions.length / 3;
  for (const point of ordered) {
    positions.push(point[0], point[1], point[2]);
    normals.push(normal[0], normal[1], normal[2]);
  }
  indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function normalizedCurveY(normalizedX: number): number {
  const normalized = Math.min(1, Math.abs(normalizedX) * 2);
  return ARCH_UPPER_BOTTOM
    + (ARCH_CURVE_APEX - ARCH_UPPER_BOTTOM) * Math.sqrt(Math.max(0, 1 - normalized * normalized));
}

function smoothCurveMesh(renderer: WorldRenderer): pc.Mesh {
  const cache = cacheFor(renderer);
  if (cache.smoothCurveMesh) return cache.smoothCurveMesh;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const halfDepth = ARCH_UPPER_DEPTH / 2;

  for (let index = 0; index < SMOOTH_CURVE_SEGMENTS; index += 1) {
    const start = -0.5 + index / SMOOTH_CURVE_SEGMENTS;
    const end = -0.5 + (index + 1) / SMOOTH_CURVE_SEGMENTS;
    const startY = normalizedCurveY(start);
    const endY = normalizedCurveY(end);
    pushQuad(positions, normals, indices, [
      [start, startY, -halfDepth], [start, ARCH_UPPER_TOP, -halfDepth],
      [end, ARCH_UPPER_TOP, -halfDepth], [end, endY, -halfDepth]
    ], [0, 0, -1]);
    pushQuad(positions, normals, indices, [
      [start, startY, halfDepth], [end, endY, halfDepth],
      [end, ARCH_UPPER_TOP, halfDepth], [start, ARCH_UPPER_TOP, halfDepth]
    ], [0, 0, 1]);
    pushQuad(positions, normals, indices, [
      [start, startY, -halfDepth], [end, endY, -halfDepth],
      [end, endY, halfDepth], [start, startY, halfDepth]
    ], [0, -1, 0]);
  }
  pushQuad(positions, normals, indices, [
    [-0.5, ARCH_UPPER_TOP, -halfDepth], [-0.5, ARCH_UPPER_TOP, halfDepth],
    [0.5, ARCH_UPPER_TOP, halfDepth], [0.5, ARCH_UPPER_TOP, -halfDepth]
  ], [0, 1, 0]);

  const app = (renderer as unknown as { app: pc.Application }).app;
  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(positions);
  mesh.setNormals(normals);
  mesh.setIndices(indices);
  mesh.update();
  cache.smoothCurveMesh = mesh;
  return mesh;
}

"""
)
replace_span(
    'src/renderer/level0RegionPresentation.ts',
    'function localArchLines(descriptor: CellDescriptor): Map<string, WorldArchLine> {',
    'function cellAlongBounds(',
    ''
)
replace_span(
    'src/renderer/level0RegionPresentation.ts',
    'function addCurveSegmentsClipped(',
    'function dividerSourceWallIds',
    """function cellIndexForWorld(value: number): number {
  return Math.floor((value + CELL_SIZE / 2) / CELL_SIZE);
}

function visualForBay(visuals: readonly CellVisual[], bay: ArchFrameBay): CellVisual | undefined {
  const center = (bay.curveStart + bay.curveEnd) / 2;
  const targetX = bay.orientation === 'z' ? cellIndexForWorld(center) : cellIndexForWorld(bay.fixed);
  const targetZ = bay.orientation === 'z' ? cellIndexForWorld(bay.fixed) : cellIndexForWorld(center);
  const exact = visuals.find((visual) =>
    visual.descriptor.address.cellX === targetX && visual.descriptor.address.cellZ === targetZ
  );
  if (exact) return exact;
  let best: CellVisual | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const visual of visuals) {
    const distance = Math.abs(visual.descriptor.address.cellX - targetX) + Math.abs(visual.descriptor.address.cellZ - targetZ);
    if (distance < bestDistance) { best = visual; bestDistance = distance; }
  }
  return bestDistance <= 1 ? best : undefined;
}

function addSmoothCurve(renderer: WorldRenderer, visual: CellVisual, bay: ArchFrameBay, value: pc.StandardMaterial): void {
  const width = bay.curveEnd - bay.curveStart;
  if (width <= 0.05) return;
  const center = (bay.curveStart + bay.curveEnd) / 2;
  const baseX = visual.descriptor.address.cellX * CELL_SIZE;
  const baseZ = visual.descriptor.address.cellZ * CELL_SIZE;
  const entity = new pc.Entity(`${ARCH_FRAME_PREFIX}smooth-curve:${bay.id}`);
  entity.addComponent('render', { meshInstances: [new pc.MeshInstance(smoothCurveMesh(renderer), value)] });
  if (bay.orientation === 'z') entity.setLocalPosition(center - baseX, 0, bay.fixed - baseZ);
  else {
    entity.setLocalPosition(bay.fixed - baseX, 0, center - baseZ);
    entity.setLocalEulerAngles(0, 90, 0);
  }
  entity.setLocalScale(width, 1, 1);
  visual.root.addChild(entity);
}

"""
)
replace_span(
    'src/renderer/level0RegionPresentation.ts',
    '    const upperRuns = rectangularUpperRuns(bays, activeSupportIntervals);',
    '\nfunction applyRegionPresentation',
    """    const upperRuns = rectangularUpperRuns(bays, activeSupportIntervals);

    for (const visual of targetVisuals) {
      if (visual.descriptor.world.generationVersion !== 'gen3-v1') continue;

      const lowerPierHeight = ARCH_UPPER_BOTTOM;
      const upperStubHeight = WALL_HEIGHT - ARCH_UPPER_TOP;
      for (let index = 0; index < activeSupportIntervals.length; index += 1) {
        const support = activeSupportIntervals[index]!;
        addWorldBoxClipped(
          visual,
          `pier-lower:${line.key}:${index}`,
          line.orientation,
          line.fixed,
          support[0],
          support[1],
          lowerPierHeight / 2,
          lowerPierHeight,
          ARCH_PIER_DEPTH,
          pierMaterial
        );
        if (upperStubHeight > 0.01) {
          addWorldBoxClipped(
            visual,
            `pier-ceiling-stub:${line.key}:${index}`,
            line.orientation,
            line.fixed,
            support[0],
            support[1],
            ARCH_UPPER_TOP + upperStubHeight / 2,
            upperStubHeight,
            ARCH_PIER_DEPTH,
            pierMaterial
          );
        }
      }

      const shoulderHeight = ARCH_UPPER_TOP - ARCH_UPPER_BOTTOM;
      for (let index = 0; index < upperRuns.length; index += 1) {
        const run = upperRuns[index]!;
        addWorldBoxClipped(
          visual,
          `upper-run:${line.key}:${index}`,
          line.orientation,
          line.fixed,
          run[0],
          run[1],
          ARCH_UPPER_BOTTOM + shoulderHeight / 2,
          shoulderHeight,
          ARCH_UPPER_DEPTH,
          upperMaterial
        );
      }

      for (const bay of bays) {
        if (!bay.route) {
          addWorldBoxClipped(
            visual,
            `lower-panel:${bay.id}`,
            bay.orientation,
            bay.fixed,
            bay.start + 0.02,
            bay.end - 0.02,
            ARCH_LOWER_PANEL_HEIGHT / 2,
            ARCH_LOWER_PANEL_HEIGHT,
            ARCH_LOWER_PANEL_DEPTH,
            panelMaterial
          );
        }
      }
    }

    for (const bay of bays) {
      const owner = visualForBay(visuals, bay);
      if (!owner) continue;
      if (targetCellIds && !targetCellIds.has(owner.descriptor.id)) continue;
      addSmoothCurve(renderer, owner, bay, upperMaterial);
    }
  }
}

"""
)
replace_once(
    'src/renderer/level0RegionPresentation.ts',
    """ * runs. Curves use shared primitive geometry and retain the accepted 0.24 m
 * ceiling reveal.
""",
    """ * runs. The accepted smooth curve and split lower-pier/upper-stub joint are
 * produced directly here and retain the accepted 0.24 m ceiling reveal.
"""
)
replace_span(
    'src/renderer/level0RegionPresentation.ts',
    'const pendingArchCells = new WeakMap<WorldRenderer, Set<string>>();',
    'export function installLevel0RegionPresentation(): void {',
    """interface ArchPresentationState { pendingCellIds: Set<string>; }
const archStates = new WeakMap<WorldRenderer, ArchPresentationState>();

function flushArchPresentation(renderer: WorldRenderer): void {
  const state = archStates.get(renderer);
  if (!state || state.pendingCellIds.size === 0) return;
  const targets = state.pendingCellIds;
  state.pendingCellIds = new Set();
  renderArchFrames(renderer, targets);
}

function archStateFor(renderer: WorldRenderer): ArchPresentationState {
  const existing = archStates.get(renderer);
  if (existing) return existing;
  const created: ArchPresentationState = { pendingCellIds: new Set() };
  archStates.set(renderer, created);
  renderer.onCellSceneMutationComplete(() => flushArchPresentation(renderer));
  return created;
}

function markNearbyArchCells(renderer: WorldRenderer, descriptor: CellDescriptor): void {
  if (!descriptorIsInArchRebuildNeighborhood(renderer, descriptor)) return;
  const state = archStateFor(renderer);
  for (const visual of renderer.loaded.values()) {
    if (
      Math.abs(visual.descriptor.address.cellX - descriptor.address.cellX) <= 1
      && Math.abs(visual.descriptor.address.cellZ - descriptor.address.cellZ) <= 1
    ) state.pendingCellIds.add(visual.descriptor.id);
  }
  if (!renderer.cellSceneMutationActive) flushArchPresentation(renderer);
}

"""
)

smooth_path = ROOT / 'src/renderer/archSmoothPresentationCorrection.ts'
if not smooth_path.exists():
    raise RuntimeError('expected archSmoothPresentationCorrection.ts before consolidation')
smooth_path.unlink()

# ---------------------------------------------------------------------------
# Diagnostics bridge used only in DEV or explicit browser-regression query.
# ---------------------------------------------------------------------------
insert_before(
    'src/main.ts',
    'installLevel0SurfacePresentation();',
    """declare global {
  interface Window {
    __projectNoclipRendererDiagnostics?: () => Record<string, unknown>;
  }
}

"""
)
insert_after(
    'src/main.ts',
    'const game = new ProjectNoclipGame();\n',
    """const rendererDiagnosticsRequested = import.meta.env.DEV || new URLSearchParams(window.location.search).has('noclipDiagnostics');
if (rendererDiagnosticsRequested) window.__projectNoclipRendererDiagnostics = () => game.rendererLifecycleDiagnostics();
"""
)

# ---------------------------------------------------------------------------
# Persistent browser regression + descriptor evidence helper.
# ---------------------------------------------------------------------------
write('scripts/arch-locator-smoke.py', r'''from __future__ import annotations

import json
import os
import shutil
import time
from pathlib import Path
from typing import Any, Callable
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = os.environ.get('NOCLIP_BASE_URL', 'http://127.0.0.1:4173')
ARTIFACT_DIR = Path(os.environ.get('NOCLIP_ARCH_LOCATOR_ARTIFACTS', 'artifacts/arch-locator-smoke'))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
SEED = 'sparse-1'


def with_diagnostics(url: str) -> str:
    parsed = urlsplit(url)
    query = dict(parse_qsl(parsed.query))
    query['noclipDiagnostics'] = '1'
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(query), parsed.fragment))


def wait_for(driver: webdriver.Chrome, predicate: Callable[[webdriver.Chrome], Any], timeout: float = 30.0, message: str = 'condition') -> Any:
    try:
        return WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as error:
        raise AssertionError(f'Timed out waiting for {message}') from error


def text_content(driver: webdriver.Chrome, selector: str) -> str:
    return str(driver.execute_script("const e=document.querySelector(arguments[0]); return e ? e.textContent || '' : '';", selector) or '')


def wait_for_text(driver: webdriver.Chrome, selector: str, fragment: str, timeout: float = 30.0) -> str:
    return str(wait_for(driver, lambda current: (value := text_content(current, selector)) if fragment in value else False, timeout=timeout, message=fragment))


def build_driver() -> webdriver.Chrome:
    options = webdriver.ChromeOptions()
    options.add_argument('--headless=new')
    options.add_argument('--window-size=1440,900')
    options.add_argument('--use-angle=swiftshader')
    options.add_argument('--enable-webgl')
    options.add_argument('--ignore-gpu-blocklist')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--no-sandbox')
    options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
    chrome_binary = shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
    if chrome_binary:
        options.binary_location = chrome_binary
    return webdriver.Chrome(options=options)


def toggle_lab(driver: webdriver.Chrome) -> None:
    driver.execute_script("window.dispatchEvent(new KeyboardEvent('keydown', {key:'`', code:'Backquote', bubbles:true}));")


def lab_visible(driver: webdriver.Chrome) -> bool:
    return 'visible' in driver.find_element(By.CSS_SELECTOR, '[data-ui="lab"]').get_attribute('class').split()


def dispatch_change(driver: webdriver.Chrome, selector: str, value: str | bool) -> None:
    driver.execute_script("""
      const element=document.querySelector(arguments[0]);
      if (!element) throw new Error(`Missing ${arguments[0]}`);
      if (element.type === 'checkbox') element.checked=arguments[1]; else element.value=arguments[1];
      element.dispatchEvent(new Event('change', {bubbles:true}));
    """, selector, value)


def browser_errors(driver: webdriver.Chrome) -> list[dict[str, Any]]:
    ignored = ('favicon.ico', 'AudioContext was not allowed to start')
    return [entry for entry in driver.get_log('browser') if entry.get('level') == 'SEVERE' and not any(fragment in entry.get('message', '') for fragment in ignored)]


def snapshot(driver: webdriver.Chrome) -> dict[str, Any]:
    value = driver.execute_script("return window.__projectNoclipRendererDiagnostics ? window.__projectNoclipRendererDiagnostics() : null;")
    assert isinstance(value, dict) and value.get('ready'), f'missing renderer diagnostics: {value}'
    return value


def assert_snapshot(value: dict[str, Any], region_id: str, require_arch: bool) -> None:
    loaded = int(value['loadedCellCount'])
    assert loaded > 0
    assert value['currentRegion'] == region_id, value
    assert int(value['attachedCellRootCount']) == loaded, value
    assert int(value['floorCellCount']) == loaded, value
    assert int(value['ceilingCellCount']) == loaded, value
    assert int(value['staticRenderableCellCount']) == loaded, value
    if require_arch:
        assert int(value['archSmoothCurveCount']) > 0, value
        assert int(value['archBlockCurveCount']) == 0, value
    fixture = value['fixture']
    assert fixture['staleCellIds'] == [], fixture
    assert fixture['detachedLightIds'] == [], fixture
    assert fixture['invalidSelectedIds'] == [], fixture
    assert int(fixture['activeCount']) == int(fixture['shadowedCount']), fixture
    batching = value['batching']
    assert batching['missingCellIds'] == [], batching
    assert batching['staleCellIds'] == [], batching
    assert batching['mismatchedRootIds'] == [], batching
    assert int(batching['batchCount']) == loaded, batching


def locate(driver: webdriver.Chrome, region_id: str, label: str, require_arch: bool = False) -> dict[str, Any]:
    dispatch_change(driver, '[data-lab="region"]', region_id)
    driver.execute_script("arguments[0].click();", driver.find_element(By.CSS_SELECTOR, '[data-action="locate-region"]'))
    wait_for_text(driver, '[data-ui="metrics"]', f'region         {label}', timeout=40)
    time.sleep(1.0)
    value = snapshot(driver)
    assert_snapshot(value, region_id, require_arch)
    errors = browser_errors(driver)
    assert not errors, f'blocking browser errors after locating {label}: {errors}'
    return value


def main() -> None:
    report: dict[str, Any] = {'baseUrl': BASE_URL, 'seed': SEED, 'transitions': []}
    driver = build_driver()
    driver.set_page_load_timeout(60)
    try:
        driver.get(with_diagnostics(BASE_URL))
        wait_for(driver, lambda current: current.execute_script('return document.readyState') == 'complete', message='document load')
        seed_input = wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, '[data-ui="seed"]'), message='seed input')
        driver.execute_script('arguments[0].value=arguments[1];', seed_input, SEED)
        driver.find_element(By.CSS_SELECTOR, '[data-action="new"]').click()
        wait_for(driver, lambda current: current.execute_script("return document.querySelector('[data-ui=title]').hidden && !document.querySelector('[data-ui=hud]').hidden"), timeout=30, message='journey HUD')
        time.sleep(1.0)
        resume = driver.find_element(By.CSS_SELECTOR, '[data-action="resume"]')
        if resume.is_displayed():
            driver.execute_script('arguments[0].click();', resume)
            time.sleep(0.8)

        toggle_lab(driver)
        wait_for(driver, lambda current: lab_visible(current), message='World Lab open')
        dispatch_change(driver, '[data-lab="bypass"]', True)
        driver.execute_script("window.__projectNoclipRenderSettings.patch({renderDistance:'medium', shadowQuality:'ultra', shadowResolution:1024, renderScale:0.5, postProcessing:'off'});")
        time.sleep(1.0)

        ordinary = snapshot(driver)
        assert_snapshot(ordinary, 'ordinary-level-0', False)
        report['initial'] = ordinary

        sequence = [
            ('arch-rooms', 'Arch Rooms', True),
            ('pillar-field', 'Pillar Field', False),
            ('arch-rooms', 'Arch Rooms', True),
            ('ordinary-level-0', 'Ordinary Level 0', False),
            ('arch-rooms', 'Arch Rooms', True),
        ]
        for index, (region_id, label, require_arch) in enumerate(sequence, start=1):
            value = locate(driver, region_id, label, require_arch)
            report['transitions'].append({'index': index, 'region': region_id, 'snapshot': value})
            if index == 1:
                toggle_lab(driver)
                wait_for(driver, lambda current: not lab_visible(current), message='World Lab close after first Arch locate')
                time.sleep(2.0)
                errors = browser_errors(driver)
                assert not errors, f'blocking browser errors across subsequent Arch frames: {errors}'
                driver.save_screenshot(str(ARTIFACT_DIR / 'arch-after-subsequent-frames.png'))
                toggle_lab(driver)
                wait_for(driver, lambda current: lab_visible(current), message='World Lab reopen')

        report['browserErrors'] = browser_errors(driver)
        assert report['browserErrors'] == [], report['browserErrors']
        driver.save_screenshot(str(ARTIFACT_DIR / 'final-arch-locator-state.png'))
    except Exception as error:
        report['failure'] = f'{type(error).__name__}: {error}'
        try:
            driver.save_screenshot(str(ARTIFACT_DIR / 'failure.png'))
            report['browserErrors'] = browser_errors(driver)
            report['failureSnapshot'] = snapshot(driver)
        except Exception:
            pass
        raise
    finally:
        (ARTIFACT_DIR / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        driver.quit()


if __name__ == '__main__':
    main()
''')

write('scripts/arch-descriptor-snapshot.mjs', """import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = (path) => pathToFileURL(resolve(process.cwd(), '.test-dist', path)).href;
const { locateNearestRegion } = await import(moduleUrl('src/world/gen3.js'));
const { generateCell } = await import(moduleUrl('src/world/generator.js'));
const { CELL_SIZE, DEFAULT_TUNING } = await import(moduleUrl('src/world/types.js'));

const seed = 'sparse-1';
const worldDay = 40;
const exposure = 10;
const tuning = { ...DEFAULT_TUNING, gateBypass: true };
const occurrence = locateNearestRegion({ seed, originX: 0, originZ: 0, target: 'arch-rooms', worldDay, exposure, tuning });
if (!occurrence) throw new Error('Arch Rooms not found for descriptor evidence seed');
const worldToCell = (value) => Math.floor((value + CELL_SIZE / 2) / CELL_SIZE);
const originX = worldToCell(occurrence.worldX);
const originZ = worldToCell(occurrence.worldZ);
const offsets = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]];
const descriptors = offsets.map(([dx, dz]) => generateCell({
  seed,
  x: originX + dx,
  z: originZ + dz,
  worldDay,
  exposure,
  shiftEpoch: 0,
  tuning,
  generationVersion: 'gen3-v1'
}));
process.stdout.write(JSON.stringify({ seed, occurrence, originX, originZ, descriptors }, null, 2));
""")

# CI permanently runs the real locator regression and archives its evidence.
replace_once(
    '.github/workflows/ci.yml',
    "          python scripts/world-cohesion-smoke.py\n",
    "          python scripts/world-cohesion-smoke.py\n          NOCLIP_ARCH_LOCATOR_ARTIFACTS=\"artifacts/arch-locator-smoke\" python scripts/arch-locator-smoke.py\n"
)
replace_once(
    '.github/workflows/ci.yml',
    "            artifacts/world-cohesion-smoke\n",
    "            artifacts/world-cohesion-smoke\n            artifacts/arch-locator-smoke\n"
)

# ---------------------------------------------------------------------------
# Tests: replace correction-layer assertions with final-owner/lifecycle invariants.
# ---------------------------------------------------------------------------
write('tests/arch-smooth-presentation.test.mjs', """import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const { archFramePresentationProfile } = await import('../.test-dist/src/renderer/level0RegionPresentation.js');
const regionSource = await readFile(new URL('../src/renderer/level0RegionPresentation.ts', import.meta.url), 'utf8');
const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');

test('A-A1 authoritative Region presentation directly owns the accepted smooth silhouette', () => {
  const profile = archFramePresentationProfile();
  assert.ok(Math.abs(profile.upperBottom - 1.92) < 1e-12);
  assert.ok(Math.abs(profile.upperTop - 2.96) < 1e-12);
  assert.ok(Math.abs(profile.ceilingReveal - 0.24) < 1e-12);
  assert.ok(Math.abs(profile.curveApex - 2.46) < 1e-12);
  assert.ok(profile.upperDepth > profile.pierDepth);
  assert.match(regionSource, /const SMOOTH_CURVE_SEGMENTS = 48/);
  assert.match(regionSource, /function smoothCurveMesh/);
  assert.match(regionSource, /new pc\.MeshInstance\(smoothCurveMesh\(renderer\), value\)/);
  assert.match(regionSource, /arch-frame:\$\{name\}/);
  assert.match(regionSource, /smooth-curve:/);
  assert.equal(regionSource.includes('curve-segment:'), false);
});

test('A-A1 shared-pier joint is constructed lower pier -> header -> upper stub -> ceiling', () => {
  assert.match(regionSource, /const lowerPierHeight = ARCH_UPPER_BOTTOM/);
  assert.match(regionSource, /const upperStubHeight = WALL_HEIGHT - ARCH_UPPER_TOP/);
  assert.match(regionSource, /pier-lower:/);
  assert.match(regionSource, /pier-ceiling-stub:/);
  assert.match(regionSource, /ARCH_UPPER_TOP \+ upperStubHeight \/ 2/);
});

test('A-A1 has one runtime presentation owner and no post-hoc smooth correction install', () => {
  assert.equal(regionSource.includes('queueMicrotask'), false);
  assert.match(regionSource, /renderer\.onCellSceneMutationComplete\(\(\) => flushArchPresentation\(renderer\)\)/);
  assert.equal(batchingSource.includes('archSmoothPresentationCorrection'), false);
  assert.equal(batchingSource.includes('installArchSmoothPresentationCorrection'), false);
});
""")

write('tests/arch-divider-runtime-correction.test.mjs', """import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const correctionSource = await readFile(new URL('../src/renderer/archDividerRuntimeCorrection.ts', import.meta.url), 'utf8');
const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');

test('A-A1 runtime correction is collision-only and preserves route accessibility', () => {
  assert.ok(correctionSource.includes(\"type ArchStructuralRole = 'pier' | 'upper' | 'lower-panel'\"));
  assert.ok(correctionSource.includes(\"if (role === 'upper') return false\"));
  assert.ok(correctionSource.includes(\"if (role === 'pier') return true\"));
  assert.ok(correctionSource.includes('return wallMinY(wall) <= 0.04'));
  assert.ok(correctionSource.includes('renderer.walls.delete(collider.id)'));
  assert.equal(correctionSource.includes('makeMaterial'), false);
  assert.equal(correctionSource.includes('pc.StandardMaterial'), false);
  assert.match(correctionSource, /collision compatibility only/);

  const regionIndex = batchingSource.indexOf('installLevel0RegionPresentation();');
  const collisionIndex = batchingSource.indexOf('installArchDividerRuntimeCorrection();');
  const fixtureIndex = batchingSource.indexOf('installFixtureLighting();');
  assert.ok(regionIndex >= 0 && collisionIndex > regionIndex && fixtureIndex > collisionIndex);
});
""")

replace_once(
    'tests/arch-streaming-change.test.mjs',
    """test('A-A1 shared-pier upper mass has canonical single-surface ownership', () => {
  assert.match(archPresentationSource, /function rectangularUpperRuns/);
  assert.match(archPresentationSource, /const upperRuns = rectangularUpperRuns\\(bays, activeSupportIntervals\\)/);
  assert.match(archPresentationSource, /function addCurveSegmentsClipped/);
  assert.match(archPresentationSource, /addWorldBoxClipped\\(/);
  assert.match(archPresentationSource, /entersFromPreviousCell/);
  assert.match(archPresentationSource, /continuesIntoNextCell/);
  assert.equal(archPresentationSource.includes('ARCH_PIER_BRIDGE_OVERLAP'), false);
  assert.equal(archPresentationSource.includes('ARCH_CURVE_JOIN_HANDOFF'), false);
  assert.equal(archPresentationSource.includes('upper-through-pier'), false);
});

test('A-A1 streaming reconstruction avoids transient custom meshes and unrelated Cell churn', () => {
  assert.match(archPresentationSource, /const ARCH_CURVE_SEGMENTS = 12/);
  assert.match(archPresentationSource, /function descriptorTouchesArchFrame/);
  assert.match(archPresentationSource, /function descriptorIsInArchRebuildNeighborhood/);
  assert.match(archPresentationSource, /if \\(!descriptorIsInArchRebuildNeighborhood\\(renderer, descriptor\\)\\) return/);
  assert.match(archPresentationSource, /descriptorTouchesArchFrame\\(visual\\.descriptor\\)/);
  assert.equal(archPresentationSource.includes('new pc.Mesh('), false);
  assert.equal(archPresentationSource.includes('new pc.MeshInstance('), false);
});

test('static world batching is localized per Cell rather than one global dirty group', () => {
  assert.match(batchingSource, /mode: 'per-cell'/);
  assert.match(batchingSource, /excludesFluorescentPanels: true/);
  assert.match(batchingSource, /app\\.batcher\\.markGroupDirty\\(batch\\.id\\)/);
  assert.equal(batchingSource.includes('markGroupDirty(STATIC_WORLD_BATCH_GROUP_ID)'), false);
});
""",
    """test('A-A1 shared-pier upper mass has canonical single-surface ownership', () => {
  assert.match(archPresentationSource, /function rectangularUpperRuns/);
  assert.match(archPresentationSource, /const upperRuns = rectangularUpperRuns\\(bays, activeSupportIntervals\\)/);
  assert.match(archPresentationSource, /function smoothCurveMesh/);
  assert.match(archPresentationSource, /function addSmoothCurve/);
  assert.match(archPresentationSource, /pier-lower:/);
  assert.match(archPresentationSource, /pier-ceiling-stub:/);
  assert.match(archPresentationSource, /entersFromPreviousCell/);
  assert.match(archPresentationSource, /continuesIntoNextCell/);
  assert.equal(archPresentationSource.includes('curve-segment:'), false);
  assert.equal(archPresentationSource.includes('upper-through-pier'), false);
});

test('A-A1 streaming reconstruction is final at the scene mutation boundary', () => {
  assert.match(archPresentationSource, /const SMOOTH_CURVE_SEGMENTS = 48/);
  assert.match(archPresentationSource, /function descriptorTouchesArchFrame/);
  assert.match(archPresentationSource, /function descriptorIsInArchRebuildNeighborhood/);
  assert.match(archPresentationSource, /renderer\\.onCellSceneMutationComplete/);
  assert.equal(archPresentationSource.includes('queueMicrotask'), false);
  assert.match(archPresentationSource, /new pc\\.Mesh\\(/);
  assert.match(archPresentationSource, /new pc\\.MeshInstance\\(/);
});

test('static world batching is localized per Cell and reconciles only after coherent scene mutation', () => {
  assert.match(batchingSource, /mode: 'per-cell'/);
  assert.match(batchingSource, /reconcileMode: 'scene-mutation-boundary'/);
  assert.match(batchingSource, /excludesFluorescentPanels: true/);
  assert.match(batchingSource, /onCellSceneMutationComplete/);
  assert.match(batchingSource, /state\\.app\\.batcher\\.markGroupDirty\\(batch\\.id\\)/);
  assert.equal(batchingSource.includes('setInterval'), false);
});
"""
)

insert_before(
    'tests/fixture-lighting-architecture.test.mjs',
    "test('M-F1 diffuser and Omni consume one canonical continuous pulse in the same per-frame update', () => {",
    """test('fixture teardown neutralizes stale shadow work and transaction completion re-dirties only valid lights', () => {
  assert.match(fixtureLightingSource, /renderer\.onCellSceneMutationStart/);
  assert.match(fixtureLightingSource, /renderer\.onCellSceneMutationComplete/);
  assert.match(fixtureLightingSource, /runtime\.selected = false/);
  assert.match(fixtureLightingSource, /light\.shadowUpdateMode = pc\.SHADOWUPDATE_NONE/);
  assert.match(fixtureLightingSource, /runtime\.light\.destroy\(\)/);
  assert.match(fixtureLightingSource, /runtime\.light\.parent !== visual\.root/);
  assert.match(fixtureLightingSource, /runtime\.shadowDirty = true/);
  assert.match(fixtureLightingSource, /fixtureLifecycleDiagnostics/);
});

"""
)

write('tests/renderer-lifecycle.test.mjs', """import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rendererSource = await readFile(new URL('../src/renderer/WorldRenderer.ts', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../src/app/ProjectNoclipGame.ts', import.meta.url), 'utf8');
const regionSource = await readFile(new URL('../src/renderer/level0RegionPresentation.ts', import.meta.url), 'utf8');
const fixtureSource = await readFile(new URL('../src/renderer/fixtureLighting.ts', import.meta.url), 'utf8');
const batchingSource = await readFile(new URL('../src/renderer/StaticWorldBatching.ts', import.meta.url), 'utf8');

test('streaming intent is explicit and developer teleport mutates one coherent Cell scene', () => {
  assert.match(rendererSource, /runCellSceneMutation<T>/);
  assert.match(rendererSource, /onCellSceneMutationStart/);
  assert.match(rendererSource, /onCellSceneMutationComplete/);
  assert.match(appSource, /reason: 'developer-teleport'/);
  assert.match(appSource, /reason: 'presentation-refresh', refreshUnchanged: true/);
  assert.equal(appSource.includes('private updateStreaming(force = false'), false);
  const transaction = appSource.indexOf('this.renderer.runCellSceneMutation(reason');
  const unload = appSource.indexOf('this.renderer!.unloadCell(id)', transaction);
  const load = appSource.indexOf('this.renderer!.loadCell(descriptor)', transaction);
  const fixture = appSource.indexOf('this.renderer.updateFixtureLighting(', transaction);
  const renderRequest = appSource.indexOf('rendering.renderNextFrame = true', transaction);
  assert.ok(transaction >= 0 && unload > transaction && load > unload && fixture > load && renderRequest > fixture);
});

test('dependent renderer owners reconcile at transaction completion rather than independent timers/microtasks', () => {
  assert.match(regionSource, /onCellSceneMutationComplete/);
  assert.equal(regionSource.includes('queueMicrotask'), false);
  assert.match(fixtureSource, /onCellSceneMutationStart/);
  assert.match(fixtureSource, /onCellSceneMutationComplete/);
  assert.match(batchingSource, /onCellSceneMutationComplete/);
  assert.equal(batchingSource.includes('setInterval'), false);
});
""")

# Code Map already names the correct A-A1 owner; make the new lifecycle boundary explicit.
replace_once(
    'docs/CODE_MAP.md',
    """movement/boundary detection -> src/app/ProjectNoclipGame.ts
Render Distance scope       -> src/renderer/renderSettingsRuntime.ts + src/renderer/renderSettings.ts
predictive/budgeted work    -> src/renderer/streamingScheduler.ts
Cell build/collider registry-> src/renderer/WorldRenderer.ts + src/renderer/cellBuilder.ts
retained fixture resources  -> src/renderer/fixtureLighting.ts
localized static batches    -> src/renderer/StaticWorldBatching.ts
""",
    """movement/boundary detection -> src/app/ProjectNoclipGame.ts
bulk/teleport scene transaction -> src/app/ProjectNoclipGame.ts -> src/renderer/WorldRenderer.ts
Render Distance scope       -> src/renderer/renderSettingsRuntime.ts + src/renderer/renderSettings.ts
predictive/budgeted work    -> src/renderer/streamingScheduler.ts
Cell build/collider registry-> src/renderer/WorldRenderer.ts + src/renderer/cellBuilder.ts
retained fixture resources  -> src/renderer/fixtureLighting.ts
localized static batches    -> src/renderer/StaticWorldBatching.ts (scene-mutation completion)
"""
)

print('Arch lifecycle recovery transform applied successfully.')
