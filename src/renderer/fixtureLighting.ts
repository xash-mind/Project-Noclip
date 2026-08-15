import * as pc from 'playcanvas';
import { lightFlickerValue } from '../world/lighting.js';
import { CELL_SIZE, type CellDescriptor, type LightGroupSpec } from '../world/types.js';
import { cellIsInsideActiveRenderScope, getRenderSettings } from './renderSettings.js';
import { WorldRenderer } from './WorldRenderer.js';
import { makeMaterial, type CellVisual } from './support.js';

const FIXTURE_LIGHT_RANGE = 12.0;
const FIXTURE_LIGHT_INTENSITY_MULTIPLIER = 2.0;
const MAX_ACTIVE_FIXTURE_LIGHTS = 128;
const FIXTURE_PANEL_HALF_HEIGHT = 0.04;
const FIXTURE_EMITTER_CLEARANCE = 0.03;
const FIXTURE_SHADOW_BIAS = 0.4;
const FIXTURE_SHADOW_NORMAL_OFFSET = 0.04;

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

const states = new WeakMap<WorldRenderer, RendererFixtureState>();
let installed = false;

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

function selectActiveFixtureIds(
  renderer: WorldRenderer,
  state: RendererFixtureState,
  playerX: number,
  playerZ: number
): Set<string> {
  const candidates = [...state.fixtures.values()]
    .filter((runtime) => runtime.group.state !== 'off' && cellIsInsideActiveRenderScope(renderer, runtime.descriptor))
    .map((runtime) => ({ runtime, distance: fixtureDistanceTo(runtime, playerX, playerZ) }))
    .sort((a, b) => a.distance - b.distance || a.runtime.id.localeCompare(b.runtime.id))
    .slice(0, MAX_ACTIVE_FIXTURE_LIGHTS);
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
  for (const runtime of state.fixtures.values()) {
    if (fixtureRangeTouchesCell(runtime, descriptor)) runtime.shadowDirty = true;
  }
}

function componentFor(runtime: FixtureRuntime): FixtureLightComponent | undefined {
  return runtime.light.light as unknown as FixtureLightComponent | undefined;
}

function attachFixtureLights(renderer: WorldRenderer, visual: CellVisual): void {
  const state = stateFor(renderer);
  const descriptor = visual.descriptor;
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

      const mesh = entityByName(visual.root, `${group.id}:fixture:${fixtureIndex}`);
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
    });
  }
  markFixtureShadowsDirtyNearCell(state, descriptor);
}

function detachCellFixtures(renderer: WorldRenderer, cellId: string, descriptor?: CellDescriptor): void {
  const state = states.get(renderer);
  if (!state) return;
  if (descriptor) markFixtureShadowsDirtyNearCell(state, descriptor);
  for (const [id, runtime] of state.fixtures) {
    if (runtime.cellId === cellId) state.fixtures.delete(id);
  }
}

function updateFixtureLighting(
  renderer: WorldRenderer,
  elapsedSeconds: number,
  reducedFlicker: boolean,
  playerX: number,
  playerZ: number
): void {
  const state = stateFor(renderer);
  const selectedIds = selectActiveFixtureIds(renderer, state, playerX, playerZ);
  const groupPulses = new Map<string, number>();
  const settings = getRenderSettings();

  const pulseFor = (group: LightGroupSpec): number => {
    const existing = groupPulses.get(group.id);
    if (existing !== undefined) return existing;
    const pulse = fixturePulse(group, elapsedSeconds, reducedFlicker);
    groupPulses.set(group.id, pulse);
    return pulse;
  };

  for (const runtime of state.fixtures.values()) {
    // Exactly one deterministic pulse is sampled per M-F1 group each frame. The
    // panel presentation and corresponding Omni consume that same value.
    const pulse = pulseFor(runtime.group);
    const selected = selectedIds.has(runtime.id);
    if (selected && !runtime.selected) runtime.shadowDirty = true;
    runtime.selected = selected;

    if (runtime.mesh?.render) runtime.mesh.render.material = fixtureMaterial(state, runtime.descriptor, runtime.group, pulse);
    const light = componentFor(runtime);
    if (!light) continue;
    light.color = lightColor(runtime.group);
    light.range = FIXTURE_LIGHT_RANGE;
    light.castShadows = true;
    light.shadowResolution = settings.shadowResolution;
    light.shadowBias = FIXTURE_SHADOW_BIAS;
    light.normalOffsetBias = FIXTURE_SHADOW_NORMAL_OFFSET;
    light.intensity = selected ? runtime.group.intensity * pulse * FIXTURE_LIGHT_INTENSITY_MULTIPLIER : 0;
    runtime.light.enabled = selected && runtime.group.state !== 'off';

    // Shadow maps describe static occlusion, not flicker brightness. Refresh only
    // when the streamed geometry or light participation changed; never create a
    // separate shadow-only selection pool.
    if (selected && runtime.group.state !== 'off' && pulse > 0.001 && runtime.shadowDirty) {
      light.shadowUpdateMode = pc.SHADOWUPDATE_THISFRAME;
      runtime.shadowDirty = false;
    }
  }
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
  shadowCountPolicy: 'one-to-one-with-active-lights'
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
