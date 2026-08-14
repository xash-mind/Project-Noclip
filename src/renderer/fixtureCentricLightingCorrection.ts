import * as pc from 'playcanvas';
import { lightFlickerValue, type LightFieldSource } from '../world/lighting.js';
import { CELL_SIZE, type CellDescriptor, type LightGroupSpec } from '../world/types.js';
import { WorldRenderer } from './WorldRenderer.js';
import { makeMaterial, type CellVisual } from './support.js';

const FIXTURE_SPOT_RANGE = 10.5;
const FIXTURE_SPOT_INNER_CONE = 48;
const FIXTURE_SPOT_OUTER_CONE = 68;
const FIXTURE_SPOT_INTENSITY_MULTIPLIER = 1.55;
const FIXTURE_SHADOW_RESOLUTION = 128;
const FIXTURE_FLICKER_LIT_THRESHOLD = 0.5;

interface FixtureRuntime {
  id: string;
  cellId: string;
  group: LightGroupSpec;
  fixtureIndex: number;
  light: pc.Entity;
  mesh?: pc.Entity;
  descriptor: CellDescriptor;
  shadowDirty: boolean;
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
  const raw = lightFlickerValue(group, elapsedSeconds, reducedFlicker);
  if (group.state === 'flicker' && !reducedFlicker) return raw >= FIXTURE_FLICKER_LIT_THRESHOLD ? 1 : 0;
  return 1;
}

function fixtureMaterial(
  state: RendererFixtureState,
  descriptor: CellDescriptor,
  group: LightGroupSpec,
  pulse: number
): pc.StandardMaterial {
  const arch = descriptor.world.regionId === 'arch-rooms';
  const key = `fixture-owned:${arch ? 'arch' : 'ordinary'}:${group.state}:${pulse.toFixed(4)}`;
  const existing = state.materials.get(key);
  if (existing) return existing;

  const activeDiffuse: [number, number, number] = arch ? [0.99, 0.985, 0.83] : [0.98, 0.955, 0.76];
  const offDiffuse: [number, number, number] = [0.31, 0.31, 0.27];
  const diffuse: [number, number, number] = [
    offDiffuse[0] + (activeDiffuse[0] - offDiffuse[0]) * pulse,
    offDiffuse[1] + (activeDiffuse[1] - offDiffuse[1]) * pulse,
    offDiffuse[2] + (activeDiffuse[2] - offDiffuse[2]) * pulse
  ];

  const created = pulse <= 0.001
    ? makeMaterial(diffuse)
    : makeMaterial(
      diffuse,
      undefined,
      [1, 1],
      arch ? [1, 0.985, 0.78] : [1, 0.95, 0.68],
      arch ? 2.18 : 2.28
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

function fixtureRangeTouchesCell(runtime: FixtureRuntime, descriptor: CellDescriptor): boolean {
  const fixture = fixtureWorldPosition(runtime);
  if (!fixture) return false;
  const centerX = descriptor.address.cellX * CELL_SIZE;
  const centerZ = descriptor.address.cellZ * CELL_SIZE;
  const half = CELL_SIZE / 2;
  const dx = Math.max(0, Math.abs(fixture.x - centerX) - half);
  const dz = Math.max(0, Math.abs(fixture.z - centerZ) - half);
  return Math.hypot(dx, dz) <= FIXTURE_SPOT_RANGE;
}

function markFixtureShadowsDirtyNearCell(state: RendererFixtureState, descriptor: CellDescriptor): void {
  for (const runtime of state.fixtures.values()) {
    if (fixtureRangeTouchesCell(runtime, descriptor)) runtime.shadowDirty = true;
  }
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
        type: 'spot',
        color: lightColor(group),
        range: FIXTURE_SPOT_RANGE,
        intensity: 0,
        innerConeAngle: FIXTURE_SPOT_INNER_CONE,
        outerConeAngle: FIXTURE_SPOT_OUTER_CONE,
        castShadows: true,
        shadowResolution: FIXTURE_SHADOW_RESOLUTION,
        shadowUpdateMode: pc.SHADOWUPDATE_NONE
      });
      visual.root.addChild(light);
      light.setLocalPosition(fixture.x, fixture.y - 0.12, fixture.z);
      // PlayCanvas spot cones are centered on local -Y. Identity rotation therefore points straight down.
      light.setLocalEulerAngles(0, 0, 0);
      // Flicker changes energy, not component lifetime, so cached static shadows survive grey/lit pulses.
      light.enabled = group.state !== 'off';

      state.fixtures.set(id, {
        id,
        cellId: descriptor.id,
        group,
        fixtureIndex,
        light,
        mesh: entityByName(visual.root, `${group.id}:fixture:${fixtureIndex}`),
        descriptor,
        shadowDirty: true
      });
    });
  }
  // Only nearby retained fixtures can have this streamed Cell inside their spot range.
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

function updateFixtureLighting(renderer: WorldRenderer, elapsedSeconds: number, reducedFlicker: boolean): void {
  const state = stateFor(renderer);
  for (const runtime of state.fixtures.values()) {
    const pulse = fixturePulse(runtime.group, elapsedSeconds, reducedFlicker);
    if (runtime.mesh?.render) {
      runtime.mesh.render.material = fixtureMaterial(state, runtime.descriptor, runtime.group, pulse);
    }
    if (!runtime.light.light) continue;
    runtime.light.light.color = lightColor(runtime.group);
    runtime.light.light.intensity = runtime.group.intensity * pulse * FIXTURE_SPOT_INTENSITY_MULTIPLIER;
    runtime.light.enabled = runtime.group.state !== 'off';
    if (runtime.group.state !== 'off' && pulse > 0.5 && runtime.shadowDirty) {
      runtime.light.light.shadowUpdateMode = pc.SHADOWUPDATE_THISFRAME;
      runtime.shadowDirty = false;
    }
  }
}

function sourceList(renderer: WorldRenderer): LightFieldSource[] {
  return [...renderer.loaded.values()].flatMap((visual) => visual.descriptor.lightGroups.map((group) => ({
    cellX: visual.descriptor.address.cellX,
    cellZ: visual.descriptor.address.cellZ,
    group
  })));
}

export function fixtureLightIntensity(group: LightGroupSpec, elapsedSeconds: number, reducedFlicker: boolean): number {
  return group.intensity * fixturePulse(group, elapsedSeconds, reducedFlicker) * FIXTURE_SPOT_INTENSITY_MULTIPLIER;
}

export const FIXTURE_LIGHTING_PROFILE = Object.freeze({
  range: FIXTURE_SPOT_RANGE,
  innerConeAngle: FIXTURE_SPOT_INNER_CONE,
  outerConeAngle: FIXTURE_SPOT_OUTER_CONE,
  castShadows: true,
  shadowResolution: FIXTURE_SHADOW_RESOLUTION,
  shadowUpdateMode: 'cell-local-this-frame'
});

declare module './WorldRenderer.js' {
  interface WorldRenderer {
    updateFixtureLighting(elapsedSeconds: number, reducedFlicker: boolean): void;
    readonly realtimeFixtureLightCount: number;
    readonly activeRealtimeFixtureLightCount: number;
  }
}

/**
 * Render law: every rendered fluorescent fixture owns its own real downward spot.
 * Cells own lifetime only. Player position never selects, acquires or releases a
 * light. The same deterministic binary fixture pulse drives mesh appearance and
 * light energy. Cached static shadows survive flicker and refresh only when nearby
 * streamed geometry can affect the fixture cone.
 */
export function installFixtureCentricLightingCorrection(): void {
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
    reducedFlicker: boolean
  ): void {
    updateFixtureLighting(this, elapsedSeconds, reducedFlicker);
  };

  // The old player-nearest selector remains only as a compatibility method on the
  // renderer type. The corrected runtime never gives it ownership of real lights.
  WorldRenderer.prototype.spatialFixtureLights = function retiredSpatialFixtureLights(): [] {
    return [];
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
        if (runtime.light.enabled && (runtime.light.light?.intensity ?? 0) > 0.001) active += 1;
      }
      return active;
    }
  });

  // Keep the canonical sampler available for ambience/diagnostics. It has no
  // authority over floor/ceiling materials or real-light ownership.
  void sourceList;
}
