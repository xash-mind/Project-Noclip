import * as pc from 'playcanvas';
import { materialColor, materialNumber } from '../presentation/materialRuntime.js';
import { lightFlickerValue } from '../world/lighting.js';
import { CELL_SIZE, type CellDescriptor, type LightGroupSpec } from '../world/types.js';
import {
  findMFluorescentPanelVisualIndex,
  isMFluorescentPanelVisualName,
  type MFluorescentPanelVisualAddress
} from './fixtureVisualOwnership.js';
import { cellIsInsideActiveRenderScope, getRenderSettings, renderDistanceProfile } from './renderSettings.js';
import { WorldRenderer } from './WorldRenderer.js';
import { makeMaterial, type CellVisual } from './support.js';

const FIXTURE_LIGHT_RANGE = 12.0;
const FIXTURE_LIGHT_INTENSITY_MULTIPLIER = 2.0;
const MAX_ACTIVE_FIXTURE_LIGHTS = 128;
const FIXTURE_SELECTION_MOVEMENT_METERS = 0.25;
const FIXTURE_PANEL_HALF_HEIGHT = 0.04;
const FIXTURE_PANEL_LENGTH = 2.2;
const FIXTURE_PANEL_WIDTH = 0.38;
const FIXTURE_EMITTER_CLEARANCE = 0.03;
const FIXTURE_SHADOW_BIAS = 0.4;
const FIXTURE_SHADOW_NORMAL_OFFSET = 0.04;
const PANEL_TARGET = 'material.fluorescent-panel';

interface FixtureLightComponent {
  intensity: number;
  range: number;
  color: pc.Color;
  castShadows: boolean;
  shadowResolution: number;
  shadowBias: number;
  normalOffsetBias: number;
  shadowUpdateMode: number;
}

interface FixtureRuntime {
  id: string;
  cellId: string;
  group: LightGroupSpec;
  fixtureIndex: number;
  light: pc.Entity;
  mesh?: pc.Entity;
  descriptor: CellDescriptor;
  shadowDirty: boolean;
  selected: boolean;
}

interface RendererFixtureState {
  fixtures: Map<string, FixtureRuntime>;
  materials: Map<string, pc.StandardMaterial>;
  selectedIds: Set<string>;
  fixtureVersion: number;
  lastSelectionFixtureVersion: number;
  lastSelectionPlayerX?: number;
  lastSelectionPlayerZ?: number;
  lastSelectionScopeSignature?: string;
  lastSelectionCeiling?: number;
}

const states = new WeakMap<WorldRenderer, RendererFixtureState>();
let installed = false;

export interface FixtureLightingDiagnostics {
  lightsCreated: number;
  lightsDestroyed: number;
  shadowDirtyScans: number;
  shadowDirtyMarks: number;
  shadowUpdateRequests: number;
  selectionChanges: number;
  selectionRecomputes: number;
  selectionRetainedUpdates: number;
  selectionCandidateScans: number;
  inactiveFixtureSkips: number;
  shadowResolutionChanges: number;
  panelMaterialWrites: number;
  intensityWrites: number;
  enabledWrites: number;
  updateCalls: number;
  updateMs: number;
  maxUpdateMs: number;
}

const fixtureDiagnostics: FixtureLightingDiagnostics = {
  lightsCreated: 0,
  lightsDestroyed: 0,
  shadowDirtyScans: 0,
  shadowDirtyMarks: 0,
  shadowUpdateRequests: 0,
  selectionChanges: 0,
  selectionRecomputes: 0,
  selectionRetainedUpdates: 0,
  selectionCandidateScans: 0,
  inactiveFixtureSkips: 0,
  shadowResolutionChanges: 0,
  panelMaterialWrites: 0,
  intensityWrites: 0,
  enabledWrites: 0,
  updateCalls: 0,
  updateMs: 0,
  maxUpdateMs: 0
};

export function fixtureLightingDiagnosticsSnapshot(): FixtureLightingDiagnostics {
  return { ...fixtureDiagnostics };
}

function stateFor(renderer: WorldRenderer): RendererFixtureState {
  const existing = states.get(renderer);
  if (existing) return existing;
  const created: RendererFixtureState = {
    fixtures: new Map(),
    materials: new Map(),
    selectedIds: new Set(),
    fixtureVersion: 0,
    lastSelectionFixtureVersion: -1
  };
  states.set(renderer, created);
  return created;
}

function childrenOf(entity: pc.Entity): pc.Entity[] {
  return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children];
}

function entityByName(root: pc.Entity, name: string): pc.Entity | undefined {
  return childrenOf(root).find((child) => child.name === name);
}

function addFixturePanelVisual(
  state: RendererFixtureState,
  visual: CellVisual,
  group: LightGroupSpec,
  fixtureIndex: number
): pc.Entity | undefined {
  const fixture = group.fixtures[fixtureIndex];
  if (!fixture) return undefined;
  const entity = new pc.Entity(`${group.id}:fixture:${fixtureIndex}`);
  entity.addComponent('render', { type: 'box' });
  entity.setLocalPosition(fixture.x, fixture.y, fixture.z);
  entity.setLocalScale(FIXTURE_PANEL_LENGTH, FIXTURE_PANEL_HALF_HEIGHT * 2, FIXTURE_PANEL_WIDTH);
  entity.setLocalEulerAngles(0, group.rotationY, 0);
  if (entity.render) {
    entity.render.material = fixtureMaterial(state, visual.descriptor, group, group.state === 'off' ? 0 : 1);
    entity.render.castShadows = false;
  }
  visual.root.addChild(entity);
  return entity;
}

function reconcileFixturePanels(state: RendererFixtureState, visual: CellVisual): Map<string, pc.Entity> {
  const root = visual.root;
  const available = childrenOf(root).filter((child) => child.render && isMFluorescentPanelVisualName(child.name));
  const claimed = new Set<pc.Entity>();
  const resolved = new Map<string, pc.Entity>();

  for (const group of visual.descriptor.lightGroups) {
    group.fixtures.forEach((fixture, fixtureIndex) => {
      const id = `${group.id}:${fixtureIndex}`;
      const direct = entityByName(root, `${group.id}:fixture:${fixtureIndex}`);
      if (direct?.render) {
        direct.render.castShadows = false;
        claimed.add(direct);
        resolved.set(id, direct);
        return;
      }
      const candidates = available.filter((candidate) => !claimed.has(candidate));
      const addresses: MFluorescentPanelVisualAddress[] = candidates.map((candidate) => {
        const position = candidate.getLocalPosition();
        return { name: candidate.name, x: position.x, z: position.z };
      });
      const matchIndex = findMFluorescentPanelVisualIndex(addresses, fixture.x, fixture.z);
      const matched = matchIndex >= 0 ? candidates[matchIndex] : undefined;
      const panel = matched ?? addFixturePanelVisual(state, visual, group, fixtureIndex);
      if (!panel) return;
      panel.name = `${group.id}:fixture:${fixtureIndex}`;
      if (panel.render) panel.render.castShadows = false;
      claimed.add(panel);
      resolved.set(id, panel);
    });
  }

  for (const candidate of available) {
    if (!claimed.has(candidate)) candidate.destroy();
  }
  return resolved;
}

function fixturePulse(group: LightGroupSpec, elapsedSeconds: number, reducedFlicker: boolean): number {
  if (group.state === 'off') return 0;
  return lightFlickerValue(group, elapsedSeconds, reducedFlicker);
}

function fixtureMaterial(
  state: RendererFixtureState,
  descriptor: CellDescriptor,
  group: LightGroupSpec,
  pulse: number
): pc.StandardMaterial {
  const arch = descriptor.world.regionId === 'arch-rooms';
  const level = Math.max(0, Math.min(1, Math.round(pulse * 16) / 16));
  const activeDiffuse = arch
    ? materialColor(PANEL_TARGET, 'archDiffuse', [0.99, 0.985, 0.83])
    : materialColor(PANEL_TARGET, 'ordinaryDiffuse', [0.98, 0.955, 0.76]);
  const emissive = arch
    ? materialColor(PANEL_TARGET, 'archEmissive', [1, 0.985, 0.78])
    : materialColor(PANEL_TARGET, 'ordinaryEmissive', [1, 0.95, 0.68]);
  const visualEmissiveScale = materialNumber(PANEL_TARGET, 'visualEmissiveScale', 1);
  const key = `fixture-owned:${arch ? 'arch' : 'ordinary'}:${group.state}:${level.toFixed(4)}:${activeDiffuse.join(',')}:${emissive.join(',')}:${visualEmissiveScale.toFixed(4)}`;
  const existing = state.materials.get(key);
  if (existing) return existing;

  const offDiffuse: [number, number, number] = [0.31, 0.31, 0.27];
  const diffuse: [number, number, number] = [
    offDiffuse[0] + (activeDiffuse[0] - offDiffuse[0]) * level,
    offDiffuse[1] + (activeDiffuse[1] - offDiffuse[1]) * level,
    offDiffuse[2] + (activeDiffuse[2] - offDiffuse[2]) * level
  ];
  const created = level <= 0.001
    ? makeMaterial(diffuse)
    : makeMaterial(
      diffuse,
      undefined,
      [1, 1],
      emissive,
      (arch ? 2.18 : 2.28) * level * visualEmissiveScale
    );
  state.materials.set(key, created);
  return created;
}

function lightColor(group: LightGroupSpec): pc.Color {
  return new pc.Color(
    Math.min(1, 0.98 * group.temperature),
    Math.min(1, 0.93 * group.temperature),
    0.62
  );
}

function fixtureWorldPosition(runtime: FixtureRuntime): { x: number; z: number } | undefined {
  const fixture = runtime.group.fixtures[runtime.fixtureIndex];
  if (!fixture) return undefined;
  return {
    x: runtime.descriptor.address.cellX * CELL_SIZE + fixture.x,
    z: runtime.descriptor.address.cellZ * CELL_SIZE + fixture.z
  };
}

function fixtureDistanceTo(runtime: FixtureRuntime, playerX: number, playerZ: number): number {
  const position = fixtureWorldPosition(runtime);
  return position ? Math.hypot(position.x - playerX, position.z - playerZ) : Number.POSITIVE_INFINITY;
}

function selectActiveFixtureIds(
  renderer: WorldRenderer,
  state: RendererFixtureState,
  playerX: number,
  playerZ: number,
  maxActiveLights: number
): Set<string> {
  const candidates = [...state.fixtures.values()]
    .filter((runtime) => runtime.group.state !== 'off' && cellIsInsideActiveRenderScope(renderer, runtime.descriptor))
    .map((runtime) => ({ runtime, distance: fixtureDistanceTo(runtime, playerX, playerZ) }))
    .sort((a, b) => a.distance - b.distance || a.runtime.id.localeCompare(b.runtime.id))
    .slice(0, maxActiveLights);
  fixtureDiagnostics.selectionCandidateScans += state.fixtures.size;
  return new Set(candidates.map(({ runtime }) => runtime.id));
}

function activeScopeSignature(renderer: WorldRenderer): string {
  const ids: string[] = [];
  for (const visual of renderer.loaded.values()) {
    if (cellIsInsideActiveRenderScope(renderer, visual.descriptor)) ids.push(visual.descriptor.id);
  }
  return ids.sort().join('|');
}

function selectedFixtureIds(
  renderer: WorldRenderer,
  state: RendererFixtureState,
  playerX: number,
  playerZ: number,
  maxActiveLights: number
): Set<string> {
  const signature = activeScopeSignature(renderer);
  const moved = state.lastSelectionPlayerX === undefined || state.lastSelectionPlayerZ === undefined
    ? Number.POSITIVE_INFINITY
    : Math.hypot(playerX - state.lastSelectionPlayerX, playerZ - state.lastSelectionPlayerZ);
  const needsSelection = moved >= FIXTURE_SELECTION_MOVEMENT_METERS
    || state.lastSelectionScopeSignature !== signature
    || state.lastSelectionCeiling !== maxActiveLights
    || state.lastSelectionFixtureVersion !== state.fixtureVersion;
  if (!needsSelection) {
    fixtureDiagnostics.selectionRetainedUpdates += 1;
    return state.selectedIds;
  }
  state.selectedIds = selectActiveFixtureIds(renderer, state, playerX, playerZ, maxActiveLights);
  state.lastSelectionPlayerX = playerX;
  state.lastSelectionPlayerZ = playerZ;
  state.lastSelectionScopeSignature = signature;
  state.lastSelectionCeiling = maxActiveLights;
  state.lastSelectionFixtureVersion = state.fixtureVersion;
  fixtureDiagnostics.selectionRecomputes += 1;
  return state.selectedIds;
}

function fixtureRangeTouchesCell(runtime: FixtureRuntime, descriptor: CellDescriptor): boolean {
  const fixture = fixtureWorldPosition(runtime);
  if (!fixture) return false;
  const centerX = descriptor.address.cellX * CELL_SIZE;
  const centerZ = descriptor.address.cellZ * CELL_SIZE;
  const half = CELL_SIZE / 2;
  const dx = Math.max(0, Math.abs(fixture.x - centerX) - half);
  const dz = Math.max(0, Math.abs(fixture.z - centerZ) - half);
  return Math.hypot(dx, dz) <= FIXTURE_LIGHT_RANGE;
}

function markFixtureShadowsDirtyNearCell(state: RendererFixtureState, descriptor: CellDescriptor): void {
  fixtureDiagnostics.shadowDirtyScans += 1;
  for (const runtime of state.fixtures.values()) {
    if (!fixtureRangeTouchesCell(runtime, descriptor) || runtime.shadowDirty) continue;
    runtime.shadowDirty = true;
    fixtureDiagnostics.shadowDirtyMarks += 1;
  }
}

function componentFor(runtime: FixtureRuntime): FixtureLightComponent | undefined {
  return runtime.light.light as unknown as FixtureLightComponent | undefined;
}

export function attachFixtureLights(renderer: WorldRenderer, visual: CellVisual): void {
  const state = stateFor(renderer);
  const descriptor = visual.descriptor;
  const panels = reconcileFixturePanels(state, visual);
  let added = false;
  for (const group of descriptor.lightGroups) {
    group.fixtures.forEach((fixture, fixtureIndex) => {
      const id = `${group.id}:${fixtureIndex}`;
      if (state.fixtures.has(id)) return;

      const light = new pc.Entity(`fixture-owned-light:${id}`);
      light.addComponent('light', {
        type: 'omni',
        color: lightColor(group),
        range: FIXTURE_LIGHT_RANGE,
        intensity: 0,
        castShadows: true,
        shadowResolution: getRenderSettings().shadowResolution,
        shadowBias: FIXTURE_SHADOW_BIAS,
        normalOffsetBias: FIXTURE_SHADOW_NORMAL_OFFSET,
        shadowUpdateMode: pc.SHADOWUPDATE_NONE
      });
      visual.root.addChild(light);
      light.setLocalPosition(
        fixture.x,
        fixture.y - FIXTURE_PANEL_HALF_HEIGHT - FIXTURE_EMITTER_CLEARANCE,
        fixture.z
      );
      light.enabled = false;

      const mesh = panels.get(id);
      if (mesh?.render) mesh.render.castShadows = false;

      state.fixtures.set(id, {
        id,
        cellId: descriptor.id,
        group,
        fixtureIndex,
        light,
        mesh,
        descriptor,
        shadowDirty: true,
        selected: false
      });
      added = true;
      fixtureDiagnostics.lightsCreated += 1;
    });
  }
  if (added) state.fixtureVersion += 1;
  markFixtureShadowsDirtyNearCell(state, descriptor);
}

export function detachCellFixtures(renderer: WorldRenderer, cellId: string, descriptor?: CellDescriptor): void {
  const state = states.get(renderer);
  if (!state) return;
  if (descriptor) markFixtureShadowsDirtyNearCell(state, descriptor);
  let removed = false;
  for (const [id, runtime] of state.fixtures) {
    if (runtime.cellId !== cellId) continue;
    state.fixtures.delete(id);
    state.selectedIds.delete(id);
    removed = true;
    fixtureDiagnostics.lightsDestroyed += 1;
  }
  if (removed) state.fixtureVersion += 1;
}

function updateFixtureLighting(
  renderer: WorldRenderer,
  elapsedSeconds: number,
  reducedFlicker: boolean,
  playerX: number,
  playerZ: number
): void {
  const updateStart = performance.now();
  const state = stateFor(renderer);
  const settings = getRenderSettings();
  const renderDistanceCeiling = renderDistanceProfile(settings).lightShadowSafetyCeiling;
  const maxActiveLights = Math.min(MAX_ACTIVE_FIXTURE_LIGHTS, renderDistanceCeiling);
  const selectedIds = selectedFixtureIds(renderer, state, playerX, playerZ, maxActiveLights);
  const groupPulses = new Map<string, number>();

  const pulseFor = (group: LightGroupSpec): number => {
    const existing = groupPulses.get(group.id);
    if (existing !== undefined) return existing;
    const pulse = fixturePulse(group, elapsedSeconds, reducedFlicker);
    groupPulses.set(group.id, pulse);
    return pulse;
  };

  for (const runtime of state.fixtures.values()) {
    const participates = cellIsInsideActiveRenderScope(renderer, runtime.descriptor);
    const selected = participates && selectedIds.has(runtime.id);
    if (selected !== runtime.selected) {
      fixtureDiagnostics.selectionChanges += 1;
      if (selected && !runtime.shadowDirty) {
        runtime.shadowDirty = true;
        fixtureDiagnostics.shadowDirtyMarks += 1;
      }
    }
    runtime.selected = selected;

    const light = componentFor(runtime);
    if (!participates) {
      fixtureDiagnostics.inactiveFixtureSkips += 1;
      if (light && Math.abs(light.intensity) > 0.000001) {
        light.intensity = 0;
        fixtureDiagnostics.intensityWrites += 1;
      }
      if (runtime.light.enabled) {
        runtime.light.enabled = false;
        fixtureDiagnostics.enabledWrites += 1;
      }
      continue;
    }

    const pulse = pulseFor(runtime.group);
    if (runtime.mesh?.render) {
      const material = fixtureMaterial(state, runtime.descriptor, runtime.group, pulse);
      if (runtime.mesh.render.material !== material) {
        runtime.mesh.render.material = material;
        fixtureDiagnostics.panelMaterialWrites += 1;
      }
    }
    if (!light) continue;
    // Color/range/cast/bias/normal-offset are invariant for this runtime and
    // are set once at creation. Rewriting them for every fixture every frame
    // created steady-state CPU/device churn without changing visible output.
    if (light.shadowResolution !== settings.shadowResolution) {
      light.shadowResolution = settings.shadowResolution;
      fixtureDiagnostics.shadowResolutionChanges += 1;
      if (!runtime.shadowDirty) {
        runtime.shadowDirty = true;
        fixtureDiagnostics.shadowDirtyMarks += 1;
      }
    }
    const intensity = selected ? runtime.group.intensity * pulse * FIXTURE_LIGHT_INTENSITY_MULTIPLIER : 0;
    if (Math.abs(light.intensity - intensity) > 0.000001) {
      light.intensity = intensity;
      fixtureDiagnostics.intensityWrites += 1;
    }
    const enabled = selected && runtime.group.state !== 'off';
    if (runtime.light.enabled !== enabled) {
      runtime.light.enabled = enabled;
      fixtureDiagnostics.enabledWrites += 1;
    }

    if (selected && runtime.group.state !== 'off' && pulse > 0.001 && runtime.shadowDirty) {
      light.shadowUpdateMode = pc.SHADOWUPDATE_THISFRAME;
      fixtureDiagnostics.shadowUpdateRequests += 1;
      runtime.shadowDirty = false;
    }
  }
  const updateMs = performance.now() - updateStart;
  fixtureDiagnostics.updateCalls += 1;
  fixtureDiagnostics.updateMs += updateMs;
  fixtureDiagnostics.maxUpdateMs = Math.max(fixtureDiagnostics.maxUpdateMs, updateMs);
}

export const FIXTURE_LIGHTING_PROFILE = Object.freeze({
  type: 'omni',
  range: FIXTURE_LIGHT_RANGE,
  intensityMultiplier: FIXTURE_LIGHT_INTENSITY_MULTIPLIER,
  maxActiveLights: MAX_ACTIVE_FIXTURE_LIGHTS,
  selectionMovementMeters: FIXTURE_SELECTION_MOVEMENT_METERS,
  emitterDrop: FIXTURE_PANEL_HALF_HEIGHT + FIXTURE_EMITTER_CLEARANCE,
  fixturePanelCastsShadows: false,
  castShadows: true,
  defaultShadowResolution: 512,
  shadowBias: FIXTURE_SHADOW_BIAS,
  normalOffsetBias: FIXTURE_SHADOW_NORMAL_OFFSET,
  shadowUpdateMode: 'cell-local-this-frame',
  shadowCountPolicy: 'one-to-one-with-active-lights',
  distanceCeilingPolicy: '32-per-cell-radius-tier-up-to-128'
});

declare module './WorldRenderer.js' {
  interface WorldRenderer {
    updateFixtureLighting(
      elapsedSeconds: number,
      reducedFlicker: boolean,
      playerX: number,
      playerZ: number
    ): void;
    readonly realtimeFixtureLightCount: number;
    readonly activeRealtimeFixtureLightCount: number;
    readonly shadowedRealtimeFixtureLightCount: number;
  }
}

/** Installs only the steady-state fixture runtime API; Cell attach/detach is owned by rendererCellLifecycle. */
export function installFixtureLighting(): void {
  if (installed) return;
  installed = true;

  WorldRenderer.prototype.updateFixtureLighting = function patchedFixtureUpdate(
    this: WorldRenderer,
    elapsedSeconds: number,
    reducedFlicker: boolean,
    playerX: number,
    playerZ: number
  ): void {
    updateFixtureLighting(this, elapsedSeconds, reducedFlicker, playerX, playerZ);
  };

  Object.defineProperty(WorldRenderer.prototype, 'realtimeFixtureLightCount', {
    configurable: true,
    get(this: WorldRenderer): number {
      return states.get(this)?.fixtures.size ?? 0;
    }
  });

  Object.defineProperty(WorldRenderer.prototype, 'activeRealtimeFixtureLightCount', {
    configurable: true,
    get(this: WorldRenderer): number {
      const state = states.get(this);
      if (!state) return 0;
      let active = 0;
      for (const runtime of state.fixtures.values()) {
        if (runtime.selected && runtime.light.enabled && runtime.group.state !== 'off') active += 1;
      }
      return active;
    }
  });

  Object.defineProperty(WorldRenderer.prototype, 'shadowedRealtimeFixtureLightCount', {
    configurable: true,
    get(this: WorldRenderer): number {
      const state = states.get(this);
      if (!state) return 0;
      let shadowed = 0;
      for (const runtime of state.fixtures.values()) {
        const light = componentFor(runtime);
        if (runtime.selected && runtime.light.enabled && runtime.group.state !== 'off' && light?.castShadows) shadowed += 1;
      }
      return shadowed;
    }
  });
}
