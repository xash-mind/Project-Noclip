import * as pc from 'playcanvas';
import { CameraFrame } from 'playcanvas/build/playcanvas/src/extras/render-passes/camera-frame.js';
import { ProjectNoclipGame } from '../app/ProjectNoclipGame.js';
import type { SaveData } from '../persistence/types.js';
import { canShift, shouldShift } from '../simulation/shifting.js';
import { calculateExposureDay, calculateWorldDay } from '../simulation/timeline.js';
import { generateCell } from '../world/generator.js';
import { sampleGen3Environment } from '../world/gen3.js';
import type { LightFieldSample } from '../world/lighting.js';
import type { CellDescriptor, WorldTuning } from '../world/types.js';
import type { WorldRenderer } from './WorldRenderer.js';
import {
  getRenderSettings,
  initializeRenderSettings,
  level0AmbientForBlackout,
  level0FogForSettings,
  renderDistanceProfile,
  setRendererRenderScope,
  type RenderSettings
} from './renderSettings.js';

interface RenderControl {
  autoRender: boolean;
  renderNextFrame: boolean;
}

interface ModernFogScene {
  ambientLight: pc.Color;
  exposure: number;
  skyboxIntensity: number;
  fog: {
    type: string;
    color: pc.Color;
    start: number;
    end: number;
  };
}

interface CameraAccess {
  clearColor: pc.Color;
  farClip: number;
}

interface AmbienceAccess {
  setLightField(sample: LightFieldSample): void;
  setEnvironment(blackoutStrength: number, escapeCue: number): void;
}

interface GameRuntimeAccess {
  canvas: HTMLCanvasElement;
  app?: pc.Application;
  camera?: pc.Entity;
  cameraFrame?: CameraFrame;
  blackoutGuideLight?: pc.Entity;
  flashlight?: pc.Entity;
  renderer?: WorldRenderer;
  save?: SaveData;
  tuning: WorldTuning;
  currentCellX: number;
  currentCellZ: number;
  currentCell?: CellDescriptor;
  streamWarmupToken: number;
  journeyElapsed: number;
  lightField: LightFieldSample;
  blackoutStrength: number;
  ambience: AmbienceAccess;
  update(dt: number): void;
  refreshRegionExtent(): void;
  refreshLightField(): void;
  notifyRegionEntry(): void;
  updateStreaming(force?: boolean, radiusOverride?: number): void;
}

type RuntimePrototype = {
  setupEngine(this: ProjectNoclipGame): void;
  updateStreaming(this: ProjectNoclipGame, force?: boolean, radiusOverride?: number): void;
  refreshLightField(this: ProjectNoclipGame): void;
};

let installed = false;

function access(game: ProjectNoclipGame): GameRuntimeAccess {
  return game as unknown as GameRuntimeAccess;
}

function modernScene(app: pc.Application): ModernFogScene {
  return app.scene as unknown as ModernFogScene;
}

function renderControl(app: pc.Application): RenderControl {
  return app as unknown as RenderControl;
}

function applyRenderScale(app: pc.Application, settings: RenderSettings): void {
  const device = app.graphicsDevice as { maxPixelRatio: number };
  // The accepted renderer previously used PlayCanvas' default 1x pixel-ratio cap.
  // Treat 100% as that baseline and only scale downward to avoid hidden supersampling.
  device.maxPixelRatio = Math.max(0.5, Math.min(1, settings.renderScale));
  app.resizeCanvas();
}

function applyPostProcessing(frame: CameraFrame | undefined, settings: RenderSettings): void {
  if (!frame) return;
  if (settings.postProcessing === 'off') {
    frame.bloom.intensity = 0;
    frame.bloom.blurLevel = 4;
    frame.grading.enabled = false;
  } else if (settings.postProcessing === 'low') {
    frame.bloom.intensity = 0.012;
    frame.bloom.blurLevel = 4;
    frame.grading.enabled = true;
    frame.grading.brightness = 1.03;
    frame.grading.contrast = 0.98;
    frame.grading.saturation = 0.94;
  } else {
    frame.bloom.intensity = 0.024;
    frame.bloom.blurLevel = 6;
    frame.grading.enabled = true;
    frame.grading.brightness = 1.06;
    frame.grading.contrast = 0.96;
    frame.grading.saturation = 0.9;
  }
  frame.update();
}

function applyLevel0Atmosphere(game: ProjectNoclipGame, settings: RenderSettings): void {
  const state = access(game);
  if (!state.app) return;
  const ambient = level0AmbientForBlackout(state.blackoutStrength);
  const fog = level0FogForSettings(settings, state.blackoutStrength);
  const scene = modernScene(state.app);
  scene.ambientLight = new pc.Color(ambient.r, ambient.g, ambient.b);
  scene.fog.type = pc.FOG_LINEAR;
  scene.fog.color = new pc.Color(fog.color.r, fog.color.g, fog.color.b);
  scene.fog.start = fog.start;
  scene.fog.end = fog.end;
  const cameraComponent = (state.camera as unknown as { camera?: CameraAccess } | undefined)?.camera;
  if (cameraComponent) {
    cameraComponent.clearColor = new pc.Color(fog.color.r, fog.color.g, fog.color.b);
    cameraComponent.farClip = fog.end + 2;
  }
}

function applyRenderQuality(game: ProjectNoclipGame, settings: RenderSettings): void {
  const state = access(game);
  if (!state.app) return;
  applyRenderScale(state.app, settings);
  applyPostProcessing(state.cameraFrame, settings);
}

function setupEngine(this: ProjectNoclipGame): void {
  const state = access(this);
  const settings = getRenderSettings();
  state.tuning = { ...state.tuning, activeRadius: renderDistanceProfile(settings).loadRadius };
  if (state.app) {
    for (const id of [...(state.renderer?.loaded.keys() ?? [])]) state.renderer?.unloadCell(id);
    applyLevel0Atmosphere(this, settings);
    applyRenderQuality(this, settings);
    return;
  }

  const app = new pc.Application(state.canvas);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  const scene = modernScene(app);
  scene.skyboxIntensity = 0;
  scene.exposure = 1;
  state.blackoutStrength = 0;
  const ambient = level0AmbientForBlackout(0);
  const fog = level0FogForSettings(settings, 0);
  scene.ambientLight = new pc.Color(ambient.r, ambient.g, ambient.b);
  scene.fog.type = pc.FOG_LINEAR;
  scene.fog.color = new pc.Color(fog.color.r, fog.color.g, fog.color.b);
  scene.fog.start = fog.start;
  scene.fog.end = fog.end;

  const camera = new pc.Entity('player-camera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(fog.color.r, fog.color.g, fog.color.b),
    nearClip: 0.05,
    farClip: fog.end + 2,
    fov: 73
  });
  app.root.addChild(camera);
  const cameraComponent = (camera as unknown as { camera?: ConstructorParameters<typeof CameraFrame>[1] }).camera;
  let cameraFrame: CameraFrame | undefined;
  if (cameraComponent) {
    cameraFrame = new CameraFrame(app as unknown as ConstructorParameters<typeof CameraFrame>[0], cameraComponent);
    state.cameraFrame = cameraFrame;
  }

  const blackoutGuideLight = new pc.Entity('blackout-external-glimmer');
  blackoutGuideLight.addComponent('light', {
    type: 'omni', color: new pc.Color(0.88, 0.84, 0.56), range: 22, intensity: 0, castShadows: false
  });
  blackoutGuideLight.enabled = false;
  app.root.addChild(blackoutGuideLight);

  const flashlight = new pc.Entity('flashlight');
  flashlight.addComponent('light', {
    type: 'spot', color: new pc.Color(0.93, 0.91, 0.72), range: 22, intensity: 2.4,
    innerConeAngle: 20, outerConeAngle: 36, castShadows: false
  });
  camera.addChild(flashlight);
  flashlight.setLocalPosition(0, -0.08, -0.2);
  flashlight.setLocalEulerAngles(90, 0, 0);
  flashlight.enabled = false;

  state.app = app;
  state.camera = camera;
  state.cameraFrame = cameraFrame;
  state.blackoutGuideLight = blackoutGuideLight;
  state.flashlight = flashlight;
  applyRenderQuality(this, settings);
  app.on('update', (dt) => state.update(Math.min(dt, 0.05)));
  app.start();
  window.addEventListener('resize', () => app.resizeCanvas());
}

function updateStreaming(this: ProjectNoclipGame, force = false, radiusOverride?: number): void {
  const state = access(this);
  if (!state.save || !state.renderer) return;
  if (radiusOverride === undefined) state.streamWarmupToken += 1;

  const settings = getRenderSettings();
  const profile = renderDistanceProfile(settings);
  state.tuning = { ...state.tuning, activeRadius: profile.loadRadius };
  const targetRadius = profile.loadRadius;
  const radius = Math.max(1, Math.min(targetRadius, Math.round(radiusOverride ?? targetRadius)));
  const retentionRadius = profile.retentionRadius;
  setRendererRenderScope(state.renderer, {
    centerCellX: state.currentCellX,
    centerCellZ: state.currentCellZ,
    loadRadius: radius,
    retentionRadius
  });

  const exposure = state.tuning.exposureOverride ?? calculateExposureDay(state.save.exposure);
  const worldDay = state.tuning.worldDayOverride ?? calculateWorldDay(Date.now());
  const desired = new Set<string>();
  for (let x = state.currentCellX - radius; x <= state.currentCellX + radius; x += 1) {
    for (let z = state.currentCellZ - radius; z <= state.currentCellZ + radius; z += 1) {
      const id = `${x}:${z}`;
      desired.add(id);
      const descriptor = generateCell({
        seed: state.save.seed,
        x,
        z,
        worldDay,
        exposure,
        shiftEpoch: state.save.shiftEpochs[id] ?? 0,
        tuning: state.tuning,
        generationVersion: state.save.generationVersion
      });
      const existing = state.renderer.loaded.get(id)?.descriptor;
      if (!existing) state.renderer.loadCell(descriptor);
      else if (
        force
        || existing.address.shiftEpoch !== descriptor.address.shiftEpoch
        || existing.address.zoneId !== descriptor.address.zoneId
        || existing.roomArchetype !== descriptor.roomArchetype
      ) state.renderer.refreshCell(descriptor);
      const visual = state.renderer.loaded.get(id);
      if (visual) visual.root.enabled = true;
      if (x === state.currentCellX && z === state.currentCellZ) state.currentCell = descriptor;
    }
  }

  for (const [id, visual] of [...state.renderer.loaded.entries()]) {
    if (desired.has(id)) continue;
    const distance = Math.max(
      Math.abs(visual.descriptor.address.cellX - state.currentCellX),
      Math.abs(visual.descriptor.address.cellZ - state.currentCellZ)
    );
    if (distance <= retentionRadius) {
      // Retain one Cell ring for hysteresis, but remove it from renderer participation.
      visual.root.enabled = false;
      continue;
    }
    const unloadCount = (state.save.unloadCounts[id] ?? 0) + 1;
    state.save.unloadCounts[id] = unloadCount;
    if (
      state.save.generationVersion === 'gen2'
      && canShift({
        occupied: false,
        observed: false,
        distanceInCells: distance,
        stability: visual.descriptor.stability,
        protectedInteraction: false,
        preservesPath: true
      })
      && shouldShift(state.save.seed, id, unloadCount, state.tuning.shiftChance)
    ) state.save.shiftEpochs[id] = (state.save.shiftEpochs[id] ?? 0) + 1;
    state.renderer.unloadCell(id);
  }

  if (state.app) {
    const rendering = renderControl(state.app);
    if (!rendering.autoRender) rendering.renderNextFrame = true;
  }
  state.refreshRegionExtent();
  state.refreshLightField();
  state.notifyRegionEntry();
}

function refreshLightField(this: ProjectNoclipGame): void {
  const state = access(this);
  if (!state.save || !state.renderer || !state.camera || !state.currentCell || !state.app) return;
  const position = state.camera.getPosition();
  state.lightField = state.renderer.updateLightField(position.x, position.z, state.journeyElapsed, state.save.settings.reducedFlicker);
  state.ambience.setLightField(state.lightField);
  const worldDay = state.tuning.worldDayOverride ?? calculateWorldDay(Date.now());
  const exposure = state.tuning.exposureOverride ?? calculateExposureDay(state.save.exposure);
  const sampled = state.save.generationVersion === 'gen3-v1'
    ? sampleGen3Environment(state.save.seed, position.x, position.z, worldDay, exposure, state.tuning)
    : undefined;
  const blackoutStrength = sampled?.blackoutStrength ?? state.currentCell.world.blackoutStrength;
  const blackoutEscapeCue = sampled?.blackoutEscapeCue ?? state.currentCell.world.blackoutEscapeCue;
  state.blackoutStrength = blackoutStrength;
  state.ambience.setEnvironment(blackoutStrength, blackoutEscapeCue);
  applyLevel0Atmosphere(this, getRenderSettings());

  if (state.blackoutGuideLight?.light && sampled && blackoutStrength > 0.52) {
    state.blackoutGuideLight.enabled = true;
    state.blackoutGuideLight.setPosition(
      position.x + sampled.blackoutExitDirection.x * 18,
      2.35,
      position.z + sampled.blackoutExitDirection.z * 18
    );
    state.blackoutGuideLight.light.intensity = 0.025 + blackoutEscapeCue * 0.24;
  } else if (state.blackoutGuideLight) state.blackoutGuideLight.enabled = false;
}

export function applyRenderSettingsToGame(game: ProjectNoclipGame, settings = getRenderSettings()): void {
  const state = access(game);
  const nextActiveRadius = renderDistanceProfile(settings).loadRadius;
  const renderDistanceChanged = state.tuning.activeRadius !== nextActiveRadius;
  state.tuning = { ...state.tuning, activeRadius: nextActiveRadius };
  applyRenderQuality(game, settings);
  applyLevel0Atmosphere(game, settings);
  // Image-quality controls must never rebuild/reseed streamed Cells. Only an
  // actual Render Distance change is allowed to reconcile the Cell envelope,
  // and it uses the non-forced path so already-loaded descriptors stay intact.
  if (renderDistanceChanged && state.save && state.renderer) state.updateStreaming(false);
  if (state.app) renderControl(state.app).renderNextFrame = true;
}

export function renderSettingsDiagnostics(game: ProjectNoclipGame): {
  activeCells: number;
  retainedCells: number;
  activeOmnis: number;
  shadowedOmnis: number;
  drawCalls?: number;
  fogStart?: number;
  fogEnd?: number;
} {
  const state = access(game);
  const renderer = state.renderer as (WorldRenderer & {
    activeRealtimeFixtureLightCount?: number;
    shadowedRealtimeFixtureLightCount?: number;
  }) | undefined;
  let activeCells = 0;
  for (const visual of renderer?.loaded.values() ?? []) if (visual.root.enabled) activeCells += 1;
  const drawCalls = (state.app as unknown as { stats?: { drawCalls?: { total?: number } } } | undefined)?.stats?.drawCalls?.total;
  const fog = state.app ? modernScene(state.app).fog : undefined;
  return {
    activeCells,
    retainedCells: renderer?.loadedCellCount ?? 0,
    activeOmnis: renderer?.activeRealtimeFixtureLightCount ?? 0,
    shadowedOmnis: renderer?.shadowedRealtimeFixtureLightCount ?? 0,
    ...(typeof drawCalls === 'number' ? { drawCalls } : {}),
    ...(fog ? { fogStart: fog.start, fogEnd: fog.end } : {})
  };
}

export function installRenderSettingsRuntime(): void {
  if (installed) return;
  installed = true;
  initializeRenderSettings();
  const prototype = ProjectNoclipGame.prototype as unknown as RuntimePrototype;
  prototype.setupEngine = setupEngine;
  prototype.updateStreaming = updateStreaming;
  prototype.refreshLightField = refreshLightField;
}
