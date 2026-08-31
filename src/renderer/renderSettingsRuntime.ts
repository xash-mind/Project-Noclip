import * as pc from 'playcanvas';
import { CameraFrame } from 'playcanvas/build/playcanvas/src/extras/render-passes/camera-frame.js';
import type { ProjectNoclipGame } from '../app/ProjectNoclipGame.js';
import type { SaveData } from '../persistence/types.js';
import { calculateExposureDay, calculateWorldDay } from '../simulation/timeline.js';
import { sampleGen3Environment } from '../world/gen3.js';
import type { LightFieldSample } from '../world/lighting.js';
import { CELL_SIZE, type CellDescriptor, type WorldTuning } from '../world/types.js';
import type { WorldRenderer } from './WorldRenderer.js';
import {
  getRenderSettings,
  initializeRenderSettings,
  level0AmbientForBlackout,
  level0FogForSettings,
  rendererParticipatingCellIds,
  renderDistanceProfile,
  type RenderDistanceLevel,
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
  flashlight?: pc.Entity;
  renderer?: WorldRenderer;
  save?: SaveData;
  tuning: WorldTuning;
  currentCell?: CellDescriptor;
  journeyElapsed: number;
  lightField: LightFieldSample;
  blackoutStrength: number;
  ambience: AmbienceAccess;
  update(dt: number): void;
  updateStreaming(force?: boolean, radiusOverride?: number): void;
}

interface RuntimeFrameTiming {
  frameTimeMs: number;
  fps: number;
}

const frameTimings = new WeakMap<ProjectNoclipGame, RuntimeFrameTiming>();

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

function distanceToCellBounds(cellX: number, cellZ: number, playerX: number, playerZ: number): number {
  const half = CELL_SIZE / 2;
  const minX = cellX * CELL_SIZE - half;
  const maxX = cellX * CELL_SIZE + half;
  const minZ = cellZ * CELL_SIZE - half;
  const maxZ = cellZ * CELL_SIZE + half;
  const dx = playerX < minX ? minX - playerX : playerX > maxX ? playerX - maxX : 0;
  const dz = playerZ < minZ ? minZ - playerZ : playerZ > maxZ ? playerZ - maxZ : 0;
  return Math.hypot(dx, dz);
}

/**
 * Returns the nearest boundary at which canonical active coverage is not yet
 * guaranteed. Streaming remains the residency owner: this is a read-only
 * atmosphere safety query over its already-loaded Cell set.
 */
export function nearestGuaranteedRenderFrontierMeters(
  renderer: Pick<WorldRenderer, 'loaded'>,
  centerCellX: number,
  centerCellZ: number,
  playerX: number,
  playerZ: number,
  settings: RenderSettings
): number | undefined {
  const radius = renderDistanceProfile(settings).loadRadius;
  let nearest = Number.POSITIVE_INFINITY;
  for (let x = centerCellX - radius; x <= centerCellX + radius; x += 1) {
    for (let z = centerCellZ - radius; z <= centerCellZ + radius; z += 1) {
      if (renderer.loaded.has(`${x}:${z}`)) continue;
      nearest = Math.min(nearest, distanceToCellBounds(x, z, playerX, playerZ));
    }
  }
  return Number.isFinite(nearest) ? nearest : undefined;
}

function currentGuaranteedFrontier(game: ProjectNoclipGame, settings: RenderSettings): number | undefined {
  const state = access(game);
  if (!state.renderer || !state.camera || !state.currentCell) return undefined;
  const position = state.camera.getPosition();
  return nearestGuaranteedRenderFrontierMeters(
    state.renderer,
    state.currentCell.address.cellX,
    state.currentCell.address.cellZ,
    position.x,
    position.z,
    settings
  );
}

function applyLevel0Atmosphere(game: ProjectNoclipGame, settings: RenderSettings): void {
  const state = access(game);
  if (!state.app) return;
  const ambient = level0AmbientForBlackout(state.blackoutStrength);
  const guaranteedFrontier = currentGuaranteedFrontier(game, settings);
  const fog = level0FogForSettings(settings, state.blackoutStrength, guaranteedFrontier);
  const scene = modernScene(state.app);
  scene.ambientLight = new pc.Color(ambient.r, ambient.g, ambient.b);
  scene.fog.type = pc.FOG_LINEAR;
  scene.fog.color = new pc.Color(fog.color.r, fog.color.g, fog.color.b);
  scene.fog.start = fog.start;
  scene.fog.end = fog.end;
  const cameraComponent = (state.camera as unknown as { camera?: CameraAccess } | undefined)?.camera;
  if (cameraComponent) {
    cameraComponent.clearColor = new pc.Color(fog.color.r, fog.color.g, fog.color.b);
    cameraComponent.farClip = fog.end + 0.5;
  }
}

function applyRenderQuality(game: ProjectNoclipGame, settings: RenderSettings): void {
  const state = access(game);
  if (!state.app) return;
  applyRenderScale(state.app, settings);
  applyPostProcessing(state.cameraFrame, settings);
}

function recordFrameTiming(game: ProjectNoclipGame, dt: number): void {
  if (!(dt > 0) || !Number.isFinite(dt)) return;
  const sample = dt * 1000;
  const previous = frameTimings.get(game)?.frameTimeMs;
  const frameTimeMs = previous === undefined ? sample : previous * 0.85 + sample * 0.15;
  frameTimings.set(game, { frameTimeMs, fps: 1000 / frameTimeMs });
}

/** Device-local render settings initialization. Installs no application methods. */
export function initializeRenderSettingsRuntime(): void {
  initializeRenderSettings();
}

/** Accepted modern PlayCanvas setup, explicitly invoked by ProjectNoclipGame. */
export function setupRenderSettingsEngine(game: ProjectNoclipGame): void {
  const state = access(game);
  const settings = getRenderSettings();
  state.tuning = { ...state.tuning, activeRadius: renderDistanceProfile(settings).loadRadius };
  if (state.app) {
    for (const id of [...(state.renderer?.loaded.keys() ?? [])]) state.renderer?.unloadCell(id);
    applyLevel0Atmosphere(game, settings);
    applyRenderQuality(game, settings);
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
    farClip: fog.end + 0.5,
    fov: 73,
    frustumCulling: true
  });
  app.root.addChild(camera);
  const cameraComponent = (camera as unknown as { camera?: ConstructorParameters<typeof CameraFrame>[1] }).camera;
  let cameraFrame: CameraFrame | undefined;
  if (cameraComponent) {
    cameraFrame = new CameraFrame(app as unknown as ConstructorParameters<typeof CameraFrame>[0], cameraComponent);
    state.cameraFrame = cameraFrame;
  }

  // Deep-Blackout unaided navigation is owned by the uniform ambient floor.
  // Do not add a player-relative or exit-direction guide light here: legitimate
  // extra illumination must come from fixture-owned lights or player/world items.
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
  state.flashlight = flashlight;
  applyRenderQuality(game, settings);
  app.on('update', (dt) => {
    recordFrameTiming(game, dt);
    state.update(Math.min(dt, 0.05));
  });
  app.start();
  window.addEventListener('resize', () => app.resizeCanvas());
}

/** Accepted light-field/Blackout atmosphere path, explicitly invoked by the app. */
export function refreshRenderSettingsLightField(game: ProjectNoclipGame): void {
  const state = access(game);
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
  applyLevel0Atmosphere(game, getRenderSettings());
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
  fps?: number;
  frameTimeMs?: number;
  activeCells: number;
  retainedCells: number;
  participatingCells?: number;
  loadedButNotParticipatingCells?: number;
  currentCell?: string;
  activeOmnis: number;
  shadowedOmnis: number;
  drawCalls?: number;
  renderDistance: RenderDistanceLevel;
  renderScale: number;
  fogStart?: number;
  fogEnd?: number;
  canonicalFogEnd: number;
  nearestGuaranteedFrontierMeters?: number;
  frontierSafetyClamped: boolean;
} {
  const state = access(game);
  const settings = getRenderSettings();
  const profile = renderDistanceProfile(settings);
  const renderer = state.renderer as (WorldRenderer & {
    activeRealtimeFixtureLightCount?: number;
    shadowedRealtimeFixtureLightCount?: number;
  }) | undefined;
  let activeCells = 0;
  for (const visual of renderer?.loaded.values() ?? []) if (visual.root.enabled) activeCells += 1;
  const drawCalls = (state.app as unknown as { stats?: { drawCalls?: { total?: number } } } | undefined)?.stats?.drawCalls?.total;
  const fog = state.app ? modernScene(state.app).fog : undefined;
  const timing = frameTimings.get(game);
  const participatingIds = renderer ? rendererParticipatingCellIds(renderer) : undefined;
  const participatingCells = participatingIds?.length;
  const retainedCells = renderer?.loadedCellCount ?? 0;
  const position = state.camera?.getPosition();
  const nearestGuaranteedFrontierMeters = renderer && state.currentCell && position
    ? nearestGuaranteedRenderFrontierMeters(
      renderer,
      state.currentCell.address.cellX,
      state.currentCell.address.cellZ,
      position.x,
      position.z,
      settings
    )
    : undefined;
  return {
    ...(timing ? { fps: timing.fps, frameTimeMs: timing.frameTimeMs } : {}),
    activeCells,
    retainedCells,
    ...(participatingCells === undefined ? {} : {
      participatingCells,
      loadedButNotParticipatingCells: Math.max(0, retainedCells - participatingCells)
    }),
    ...(state.currentCell ? { currentCell: state.currentCell.id } : {}),
    activeOmnis: renderer?.activeRealtimeFixtureLightCount ?? 0,
    shadowedOmnis: renderer?.shadowedRealtimeFixtureLightCount ?? 0,
    ...(typeof drawCalls === 'number' ? { drawCalls } : {}),
    renderDistance: settings.renderDistance,
    renderScale: settings.renderScale,
    ...(fog ? { fogStart: fog.start, fogEnd: fog.end } : {}),
    canonicalFogEnd: profile.fogEnd,
    ...(nearestGuaranteedFrontierMeters === undefined ? {} : { nearestGuaranteedFrontierMeters }),
    frontierSafetyClamped: Boolean(fog && fog.end < profile.fogEnd - 0.0001)
  };
}
