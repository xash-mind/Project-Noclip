import * as pc from 'playcanvas';
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
const FIXTURE_PANEL_HALF_HEIGHT = 0.04;
const FIXTURE_PANEL_LENGTH = 2.2;
const FIXTURE_PANEL_WIDTH = 0.38;
const FIXTURE_EMITTER_CLEARANCE = 0.03;
const FIXTURE_SHADOW_BIAS = 0.4;
const FIXTURE_SHADOW_NORMAL_OFFSET = 0.04;
const FIXTURE_VIEW_PREVISIBILITY_MARGIN = 2.0;
const FIXTURE_VIEW_RETENTION_MARGIN = 4.0;
const FIXTURE_DISTANCE_BUCKET_METERS = 2.0;

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
}

interface CameraEntity extends pc.Entity {
  camera?: { frustum: pc.Frustum };
}

type ApplicationLookup = typeof pc.Application & {
  getApplication(id?: string): pc.Application | undefined;
};

const states = new WeakMap<WorldRenderer, RendererFixtureState>();
const fixtureInfluenceSphere = new pc.BoundingSphere(new pc.Vec3(), FIXTURE_LIGHT_RANGE + FIXTURE_VIEW_PREVISIBILITY_MARGIN);
let installed = false;

export interface FixtureLightingDiagnostics {
  lightsCreated: number;
  lightsDestroyed: number;
  shadowDirtyScans: number;
  shadowDirtyMarks: number;
  shadowUpdateRequests: number;
  selectionChanges: number;
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
  const created: RendererFixtureState = { fixtures: new Map(), materials: new Map() };
  states.set(renderer, created);
  return created;
}

function childrenOf(entity: pc.Entity): pc.Entity[] {
  return [...(entity as pc.Entity & { children: readonly pc.Entity[] }).children];
}

function entityByName(root: pc.Entity, name: string): pc.Entity | undefined {
  return childrenOf(root).find((child) => child.name === name);
}

function currentCameraFrustum(): pc.Frustum | undefined {
  const app = (pc.Application as ApplicationLookup).getApplication('game-canvas');
  if (!app) return undefined;
  const root = app.root as pc.Entity & { children: readonly pc.Entity[] };
  const camera = root.children.find((child) => child.name === 'player-camera') as CameraEntity | undefined;
  return camera?.camera?.frustum;
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
  const key = `fixture-owned:${arch ? 'arch' : 'ordinary'}:${group.state}:${level.toFixed(4)}`;
  const existing = state.materials.get(key);
  if (existing) return existing;

  const activeDiffuse: [number, number, number] = arch ? [0.99, 0.985, 0.83] : [0.98, 0.955, 0.76];
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
      arch ? [1, 0.985, 0.78] : [1, 0.95, 0.68],
      (arch ? 2.18 : 2.28) * level
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

/**
 * A fixture does not need to be on-screen to matter. Its whole Omni influence
 * sphere is tested against the camera frustum, so lights around corners or just
 * outside the view stay eligible whenever they can still illuminate visible
 * geometry. A larger radius for already-selected fixtures provides bounded
 * directional hysteresis and prevents camera-edge chatter.
 */
function fixtureInfluenceIntersectsView(runtime: FixtureRuntime, frustum: pc.Frustum): boolean {
  const position = fixtureWorldPosition(runtime);
  const fixture = runtime.group.fixtures[runtime.fixtureIndex];
  if (!position || !fixture) return false;
  fixtureInfluenceSphere.center.set(
    position.x,
    fixture.y - FIXTURE_PANEL_HALF_HEIGHT - FIXTURE_EMITTER_CLEARANCE,
    position.z
  );
  fixtureInfluenceSphere.radius = FIXTURE_LIGHT_RANGE
    + (runtime.selected ? FIXTURE_VIEW_RETENTION_MARGIN : FIXTURE_VIEW_PREVISIBILITY_MARGIN);
  return frustum.containsSphere(fixtureInfluenceSphere) !== 0;
}

function selectActiveFixtureIds(
  renderer: WorldRenderer,
  state: RendererFixtureState,
  playerX: number,
  playerZ: number,
  maxActiveLights: number
): Set<string> {
  const frustum = currentCameraFrustum();
  const candidates = [...state.fixtures.values()]
    .filter((runtime) => runtime.group.state !== 'off' && cellIsInsideActiveRenderScope(renderer, runtime.descriptor))
    .filter((runtime) => !frustum || fixtureInfluenceIntersectsView(runtime, frustum))
    .map((runtime) => ({ runtime, distance: fixtureDistanceTo(runtime, playerX, playerZ) }))
    .sort((a, b) => {
      if (a.runtime.selected !== b.runtime.selected) return a.runtime.selected ? -1 : 1;
      const distanceBucketDelta = Math.floor(a.distance / FIXTURE_DISTANCE_BUCKET_METERS)
        - Math.floor(b.distance / FIXTURE_DISTANCE_BUCKET_METERS);
      return distanceBucketDelta || a.runtime.id.localeCompare(b.runtime.id);
    })
    .slice(0, maxActiveLights);
  return new Set(candidates.map(({ runtime }) => runtime.id));
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

function attachFixtureLights(renderer: WorldRenderer, visual: CellVisual): void {
  const state = stateFor(renderer);
  const descriptor = visual.descriptor;
  const panels = reconcileFixturePanels(state, visual);
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
      fixtureDiagnostics.lightsCreated += 1;
    });
  }
  markFixtureShadowsDirtyNearCell(state, descriptor);
}

function detachCellFixtures(renderer: WorldRenderer, cellId: string, descriptor?: CellDescriptor): void {
  const state = states.get(renderer);
  if (!state) return;
  if (descriptor) markFixtureShadowsDirtyNearCell(state, descriptor);
  for (const [id, runtime] of state.fixtures) {
    if (runtime.cellId !== cellId) continue;
    state.fixtures.delete(id);
    fixtureDiagnostics.lightsDestroyed += 1;
  }
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
  const selectedIds = selectActiveFixtureIds(renderer, state, playerX, playerZ, maxActiveLights);
  const groupPulses = new Map<string, number>();

  const pulseFor = (group: LightGroupSpec): number => {
    const existing = groupPulses.get(group.id);
    if (existing !== undefined) return existing;
    const pulse = fixturePulse(group, elapsedSeconds, reducedFlicker);
    groupPulses.set(group.id, pulse);
    return pulse;
  };

  for (const runtime of state.fixtures.values()) {
    const pulse = pulseFor(runtime.group);
    const selected = selectedIds.has(runtime.id);
    if (selected !== runtime.selected) {
      fixtureDiagnostics.selectionChanges += 1;
      if (selected && !runtime.shadowDirty) {
        runtime.shadowDirty = true;
        fixtureDiagnostics.shadowDirtyMarks += 1;
      }
    }
    runtime.selected = selected;

    if (runtime.mesh?.render) {
      const material = fixtureMaterial(state, runtime.descriptor, runtime.group, pulse);
      if (runtime.mesh.render.material !== material) {
        runtime.mesh.render.material = material;
        fixtureDiagnostics.panelMaterialWrites += 1;
      }
    }
    const light = componentFor(runtime);
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
  emitterDrop: FIXTURE_PANEL_HALF_HEIGHT + FIXTURE_EMITTER_CLEARANCE,
  fixturePanelCastsShadows: false,
  castShadows: true,
  defaultShadowResolution: 512,
  shadowBias: FIXTURE_SHADOW_BIAS,
  normalOffsetBias: FIXTURE_SHADOW_NORMAL_OFFSET,
  shadowUpdateMode: 'cell-local-this-frame',
  shadowCountPolicy: 'one-to-one-with-active-lights',
  participationPolicy: 'camera-frustum-intersecting-influence-with-margin-and-retention',
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

export function installFixtureLighting(): void {
  if (installed) return;
  installed = true;

  const originalLoadCell = WorldRenderer.prototype.loadCell;
  WorldRenderer.prototype.loadCell = function patchedFixtureLoad(this: WorldRenderer, descriptor: CellDescriptor): void {
    const alreadyLoaded = this.loaded.has(descriptor.id);
    originalLoadCell.call(this, descriptor);
    if (alreadyLoaded) return;
    const visual = this.loaded.get(descriptor.id);
    if (visual) attachFixtureLights(this, visual);
  };

  const originalUnloadCell = WorldRenderer.prototype.unloadCell;
  WorldRenderer.prototype.unloadCell = function patchedFixtureUnload(this: WorldRenderer, cellId: string): void {
    const descriptor = this.loaded.get(cellId)?.descriptor;
    detachCellFixtures(this, cellId, descriptor);
    originalUnloadCell.call(this, cellId);
  };

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
