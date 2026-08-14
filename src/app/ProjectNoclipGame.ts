import * as pc from 'playcanvas';
import { CameraFrame } from 'playcanvas/build/playcanvas/src/extras/render-passes/camera-frame.js';
import { ProceduralAmbience } from '../audio/Ambience.js';
import { PlayerIntent } from '../input/PlayerIntent.js';
import { addToInventory, INVENTORY_CAPACITY, removeFromInventory, updateInventoryItem } from '../inventory/inventory.js';
import { ITEM_DEFINITIONS } from '../items/definitions.js';
import { createItemInstance, transferItem } from '../items/factory.js';
import { rollStarterDefinitions, simulateStarterRolls } from '../items/starterRoll.js';
import type { ItemInstance } from '../items/types.js';
import { IndexedDbSaveStore } from '../persistence/store.js';
import type { DroppedItemState, SaveData, SurfaceMark } from '../persistence/types.js';
import { WorldRenderer, type InteractionVisual, type WorldItemVisual } from '../renderer/WorldRenderer.js';
import { addStableTime, calculateExposureDay, calculateWorldDay, canonicalEdgeId, EMPTY_EXPOSURE, recordTraversal } from '../simulation/timeline.js';
import { canShift, shouldShift } from '../simulation/shifting.js';
import { GameUI } from '../ui/GameUI.js';
import { estimateBlackoutExtent, estimateRegionExtent, locateNearestBlackout, locateNearestHoleCluster, locateNearestRegion, sampleGen3Environment, type RegionExtentEstimate } from '../world/gen3.js';
import { formatFieldDiagnostics, formatGeographyDiagnostics } from '../world/fields.js';
import { generateCell } from '../world/generator.js';
import { stableId, unitFloat } from '../world/hash.js';
import { LIGHT_FIELD_UPDATE_INTERVAL, type LightFieldSample } from '../world/lighting.js';
import { manilaRoomCell } from '../world/structures.js';
import { CELL_SIZE, DEFAULT_TUNING, LEVEL0_FOG_END, LEVEL0_FOG_START, type CellDescriptor, type RegionId, type WorldTuning } from '../world/types.js';
import { ZONE_PROFILES } from '../world/zones.js';

const PLAYER_HEIGHT = 1.65;
const WALK_SPEED = 3.15;
const SPRINT_SPEED = 5.15;
const CROUCH_SPEED = 1.8;
const SAVE_INTERVAL = 1.5;
const TOUCH_LOOK_MULTIPLIER = 2.25;
const EMPTY_LIGHT_FIELD: LightFieldSample = { energy: 0, activeGroups: 0, flickerGroups: 0, nearbyGroups: 0, flickerPulse: 0, temperature: 0.94 };
const LEVEL0_AMBIENT = { r: 0.09, g: 0.084, b: 0.048 } as const;
const BLACKOUT_AMBIENT_FLOOR = { r: 0.009, g: 0.0085, b: 0.005 } as const;
const BASE_SCENE_EXPOSURE = 1;
const MAX_DARK_ADAPTED_EXPOSURE = 1.8;
const DARK_ADAPT_SECONDS = 8;
const LIGHT_ADAPT_SECONDS = 0.85;
const REGION_LABELS: Record<RegionId, string> = {
  'ordinary-level-0': 'Ordinary Level 0',
  'pillar-field': 'Pillar Field',
  'arch-rooms': 'Arch Rooms'
};

interface PlayCanvasRenderControl {
  autoRender: boolean;
  renderNextFrame: boolean;
}

function renderControl(app: pc.Application): PlayCanvasRenderControl {
  return app as unknown as PlayCanvasRenderControl;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function targetEyeExposure(lightEnergy: number, blackoutStrength: number): number {
  const darkness = Math.pow(1 - clamp01(lightEnergy), 1.6);
  const blackoutWeight = Math.pow(clamp01(blackoutStrength), 1.35);
  const gain = darkness * (0.42 + 0.38 * blackoutWeight);
  return Math.min(MAX_DARK_ADAPTED_EXPOSURE, BASE_SCENE_EXPOSURE + gain);
}

export function stepEyeExposure(current: number, target: number, dt: number): number {
  const timeConstant = target > current ? DARK_ADAPT_SECONDS : LIGHT_ADAPT_SECONDS;
  const alpha = 1 - Math.exp(-Math.max(0, dt) / timeConstant);
  return current + (target - current) * alpha;
}

export class ProjectNoclipGame {
  private readonly store = new IndexedDbSaveStore();
  private readonly ambience = new ProceduralAmbience();
  private readonly input = new PlayerIntent();
  private readonly canvas: HTMLCanvasElement;
  private readonly ui: GameUI;
  private app?: pc.Application;
  private camera?: pc.Entity;
  private cameraFrame?: CameraFrame;
  private blackoutGuideLight?: pc.Entity;
  private flashlight?: pc.Entity;
  private renderer?: WorldRenderer;
  private save?: SaveData;
  private tuning: WorldTuning = { ...DEFAULT_TUNING };
  private yaw = 0;
  private pitch = 0;
  private started = false;
  private paused = true;
  private mobileInputActive = false;
  private currentCellX = 0;
  private currentCellZ = 0;
  private currentCell?: CellDescriptor;
  private interaction?: InteractionVisual;
  private saveAccumulator = 0;
  private metricsAccumulator = 0;
  private hallucinationCooldown = 12;
  private markerMode = false;
  private drawing = false;
  private activeMark?: SurfaceMark;
  private markedPointCount = 0;
  private lightField: LightFieldSample = { ...EMPTY_LIGHT_FIELD };
  private journeyElapsed = 0;
  private lightFieldAccumulator = 0;
  private blackoutStrength = 0;
  private eyeExposure = BASE_SCENE_EXPOSURE;
  private regionExtent?: RegionExtentEstimate;
  private regionExtentKey = '';
  private streamWarmupToken = 0;

  constructor() {
    const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
    if (!canvas) throw new Error('Missing #game-canvas');
    this.canvas = canvas;
    this.ui = new GameUI({
      onNewGame: (seed) => void this.startNew(seed), onContinue: () => void this.continueGame(), onReset: () => void this.resetGame(),
      onResume: () => this.resumeInput(), onSelectItem: (id) => this.selectItem(id), onTuningChange: (patch) => this.updateTuning(patch),
      onSeedChange: (seed) => void this.startNew(seed), onSimulateStarter: () => this.simulateStarters(), onExportTuning: () => this.exportTuning(),
      onLocateRegion: (regionId) => this.locateRegion(regionId),
      onLocateBlackout: () => this.locateBlackout(), onLocateHoleCluster: () => this.locateHoleCluster(), onLocateManilaRoom: () => this.locateManilaRoom(),
      onTouchMove: (forward, strafe) => this.handleTouchMove(forward, strafe), onTouchSprint: (active) => this.handleTouchSprint(active),
      onTouchLook: (dx, dy) => this.handleTouchLook(dx, dy), onTouchPrimaryStart: () => this.handleTouchPrimaryStart(), onTouchPrimaryEnd: () => this.handleTouchPrimaryEnd(),
      onTouchInteract: () => this.handleTouchInteract(), onTouchUse: () => this.handleTouchUse(), onTouchMarker: () => this.handleTouchMarker(),
      onToggleLab: () => this.toggleWorldLab()
    });
  }

  async initialize(): Promise<void> {
    const existing = await this.store.load();
    this.ui.setContinueAvailable(Boolean(existing));
    this.installInput();
  }

  private async startNew(seed: string): Promise<void> {
    const createdAt = Date.now();
    const characterId = stableId('character', seed, createdAt);
    const inventory = rollStarterDefinitions(characterId).map((definitionId, index) => createItemInstance(definitionId, `starter:${characterId}:${index}`, 'starter', { type: 'character', id: characterId }, createdAt));
    const save: SaveData = {
      version: 2, characterId, seed, generationVersion: 'gen3-v1', createdAt, starterRolled: true,
      position: { x: 0, y: PLAYER_HEIGHT, z: 0, yaw: 0, pitch: 0 }, inventory, selectedItemId: inventory[0]?.instanceId,
      droppedItems: [], pickedLootNodeIds: [], marks: [], hydration: 0.76, exposure: structuredClone(EMPTY_EXPOSURE),
      shiftEpochs: {}, unloadCounts: {}, discoveredExits: [], readNoteIds: [], enteredZoneIds: [], enteredRegionIds: ['ordinary-level-0'],
      settings: { sensitivity: 0.095, reducedMotion: false, reducedFlicker: false, masterVolume: 0.68 }, savedAt: createdAt
    };
    await this.store.save(save); await this.launch(save);
    this.ui.toast(inventory.length === 0 ? 'You arrived with nothing.' : `You arrived with ${inventory.map((item) => ITEM_DEFINITIONS[item.definitionId].name).join(' and ')}.`, 5000);
  }

  private async continueGame(): Promise<void> {
    const save = await this.store.load();
    if (!save) { this.ui.toast('No readable local journey was found.'); this.ui.setContinueAvailable(false); return; }
    await this.launch(save);
  }

  private async launch(save: SaveData): Promise<void> {
    this.save = save; this.yaw = save.position.yaw; this.pitch = save.position.pitch; this.tuning = { ...DEFAULT_TUNING };
    this.lightField = { ...EMPTY_LIGHT_FIELD }; this.journeyElapsed = 0; this.lightFieldAccumulator = 0; this.blackoutStrength = 0; this.eyeExposure = BASE_SCENE_EXPOSURE; this.regionExtent = undefined; this.regionExtentKey = '';
    this.markerMode = false; this.ui.setMarkerMode(false); this.setupEngine();
    if (!this.app || !this.camera) throw new Error('Engine did not initialize');
    this.app.scene.exposure = BASE_SCENE_EXPOSURE;
    this.renderer = new WorldRenderer(this.app, save);
    this.camera.setPosition(save.position.x, save.position.y, save.position.z);
    this.currentCellX = worldToCell(save.position.x); this.currentCellZ = worldToCell(save.position.z);
    const startupRadius = Math.min(2, Math.max(1, Math.min(4, Math.round(this.tuning.activeRadius))));
    this.updateStreaming(true, startupRadius); this.updateCameraRotation(); this.started = true; this.paused = true;
    this.ui.showGame(); this.ui.updateInventory(save.inventory, save.selectedItemId); this.ui.setPaused(true);
    this.updateUI(); this.scheduleStreamingWarmup();
    await this.ambience.start(save.settings.masterVolume); this.ambience.setLightField(this.lightField); this.resumeInput();
  }

  private setupEngine(): void {
    if (this.app) { for (const id of [...(this.renderer?.loaded.keys() ?? [])]) this.renderer?.unloadCell(id); return; }
    const app = new pc.Application(this.canvas);
    app.setCanvasResolution(pc.RESOLUTION_AUTO); app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.scene.ambientLight = new pc.Color(LEVEL0_AMBIENT.r, LEVEL0_AMBIENT.g, LEVEL0_AMBIENT.b); app.scene.exposure = BASE_SCENE_EXPOSURE; app.scene.skyboxIntensity = 0;
    app.scene.fog = pc.FOG_LINEAR; app.scene.fogColor = new pc.Color(0.15, 0.135, 0.075); app.scene.fogStart = LEVEL0_FOG_START; app.scene.fogEnd = LEVEL0_FOG_END;
    const camera = new pc.Entity('player-camera');
    camera.addComponent('camera', { clearColor: new pc.Color(0.15, 0.135, 0.075), nearClip: 0.05, farClip: 125, fov: 73 }); app.root.addChild(camera);
    const cameraComponent = (camera as unknown as { camera?: ConstructorParameters<typeof CameraFrame>[1] }).camera;
    if (cameraComponent) {
      const cameraFrame = new CameraFrame(app as unknown as ConstructorParameters<typeof CameraFrame>[0], cameraComponent);
      cameraFrame.bloom.intensity = 0.024;
      cameraFrame.bloom.blurLevel = 6;
      cameraFrame.grading.enabled = true;
      cameraFrame.grading.brightness = 1.06;
      cameraFrame.grading.contrast = 0.96;
      cameraFrame.grading.saturation = 0.9;
      cameraFrame.update();
      this.cameraFrame = cameraFrame;
    }
    const blackoutGuideLight = new pc.Entity('blackout-external-glimmer');
    blackoutGuideLight.addComponent('light', { type: 'omni', color: new pc.Color(0.88, 0.84, 0.56), range: 22, intensity: 0, castShadows: false });
    blackoutGuideLight.enabled = false; app.root.addChild(blackoutGuideLight);
    const flashlight = new pc.Entity('flashlight');
    flashlight.addComponent('light', { type: 'spot', color: new pc.Color(0.93, 0.91, 0.72), range: 22, intensity: 2.4, innerConeAngle: 20, outerConeAngle: 36, castShadows: false });
    camera.addChild(flashlight); flashlight.setLocalPosition(0, -0.08, -0.2); flashlight.setLocalEulerAngles(90, 0, 0); flashlight.enabled = false;
    this.app = app; this.camera = camera; this.blackoutGuideLight = blackoutGuideLight; this.flashlight = flashlight;
    app.on('update', (dt) => this.update(Math.min(dt, 0.05))); app.start(); window.addEventListener('resize', () => app.resizeCanvas());
  }

  private installInput(): void {
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Backquote') {
        event.preventDefault();
        if (this.started) this.toggleWorldLab(); else this.ui.toggleLab();
        return;
      }
      if (!this.started) return;
      if (event.code === 'Escape' && this.ui.isNoteOpen()) { this.ui.hideNote(); return; }
      if (event.code === 'KeyE') this.interact(); else if (event.code === 'KeyF') this.useSelectedItem(); else if (event.code === 'KeyG') this.dropSelectedItem(); else if (event.code === 'KeyM') this.toggleMarkerMode();
      else if (/^Digit[1-6]$/.test(event.code)) { const item = this.save?.inventory[Number(event.code.slice(-1)) - 1]; if (item) this.selectItem(item.instanceId); }
      this.input.keyDown(event.code);
    });
    window.addEventListener('keyup', (event) => this.input.keyUp(event.code));
    window.addEventListener('mousemove', (event) => {
      if (this.mobileInputActive || document.pointerLockElement !== this.canvas || this.paused || this.ui.isLabOpen() || this.ui.isNoteOpen()) return;
      this.applyLookDelta(event.movementX, event.movementY);
      if (this.drawing) this.sampleMark();
    });
    window.addEventListener('mousedown', (event) => { if (event.button === 0 && this.markerMode && document.pointerLockElement === this.canvas) this.beginMark(); });
    window.addEventListener('mouseup', (event) => { if (event.button === 0 && this.drawing) this.finishMark(); });
    window.addEventListener('blur', () => this.pauseForFocusLoss());
    window.addEventListener('resize', () => this.syncTouchOrientation());
    document.addEventListener('pointerlockchange', () => {
      if (!this.started || this.mobileInputActive) return; this.paused = document.pointerLockElement !== this.canvas;
      this.ui.setPaused(this.paused && !this.ui.isLabOpen() && !this.ui.isNoteOpen()); if (this.paused) this.input.clearKeyboard();
    });
    this.canvas.addEventListener('click', () => { if (this.started && !this.mobileInputActive && !this.ui.isLabOpen() && !this.ui.isNoteOpen() && document.pointerLockElement !== this.canvas) this.requestPointerLock(); });
  }

  private resumeInput(): void {
    if (!this.started || this.ui.isLabOpen() || this.ui.isNoteOpen()) return;
    if (this.ui.prefersTouchControls()) {
      this.mobileInputActive = true; this.input.clearAll(); this.paused = !this.ui.isTouchLandscape(); this.ui.setPaused(false); return;
    }
    this.mobileInputActive = false; this.requestPointerLock();
  }

  private requestPointerLock(): void { if (this.started && !this.mobileInputActive && !this.ui.isLabOpen() && !this.ui.isNoteOpen()) void this.canvas.requestPointerLock(); }

  private toggleWorldLab(): void {
    if (this.drawing) this.finishMark();
    const open = this.ui.toggleLab();
    this.input.clearAll();
    if (open) {
      this.paused = true;
      this.ui.setPaused(false);
      if (this.app) {
        const rendering = renderControl(this.app);
        rendering.renderNextFrame = true;
        rendering.autoRender = false;
      }
      if (document.pointerLockElement === this.canvas) document.exitPointerLock();
      return;
    }
    if (this.app) {
      const rendering = renderControl(this.app);
      rendering.autoRender = true;
      rendering.renderNextFrame = true;
    }
    this.resumeInput();
  }

  private syncTouchOrientation(): void {
    if (!this.started || !this.mobileInputActive) return;
    this.input.clearTouch(); this.paused = !this.ui.isTouchLandscape(); this.ui.setPaused(false);
  }

  private pauseForFocusLoss(): void {
    if (!this.started) return;
    this.paused = true; this.input.clearAll();
    if (!this.ui.isLabOpen() && !this.ui.isNoteOpen()) this.ui.setPaused(true);
  }

  private touchActionAllowed(): boolean {
    return this.started && this.mobileInputActive && this.ui.isTouchLandscape() && !this.paused && !this.ui.isLabOpen() && !this.ui.isNoteOpen();
  }

  private handleTouchMove(forward: number, strafe: number): void {
    if (!this.touchActionAllowed()) { this.input.clearTouch(); return; }
    this.input.setTouchMovement(forward, strafe);
  }

  private handleTouchSprint(active: boolean): void {
    this.input.setTouchSprint(active && this.touchActionAllowed());
  }

  private handleTouchLook(deltaX: number, deltaY: number): void {
    if (!this.touchActionAllowed()) return;
    this.applyLookDelta(deltaX, deltaY, TOUCH_LOOK_MULTIPLIER);
    if (this.drawing) this.sampleMark();
  }

  private handleTouchPrimaryStart(): void {
    if (this.touchActionAllowed() && this.markerMode) this.beginMark();
  }

  private handleTouchPrimaryEnd(): void { if (this.drawing) this.finishMark(); }
  private handleTouchInteract(): void { if (this.touchActionAllowed()) this.interact(); }
  private handleTouchUse(): void { if (this.touchActionAllowed()) this.useSelectedItem(); }
  private handleTouchMarker(): void { if (this.touchActionAllowed()) this.toggleMarkerMode(); }

  private applyLookDelta(deltaX: number, deltaY: number, multiplier = 1): void {
    const sensitivity = this.save?.settings.sensitivity ?? 0.095;
    this.yaw -= deltaX * sensitivity * multiplier;
    this.pitch = Math.max(-84, Math.min(84, this.pitch - deltaY * sensitivity * multiplier));
    this.updateCameraRotation();
  }

  private update(dt: number): void {
    if (!this.started || !this.save || !this.camera || !this.renderer) return;
    const activeJourney = !this.paused && !this.ui.isLabOpen() && !this.ui.isNoteOpen() && document.hasFocus();
    if (!this.paused && !this.ui.isLabOpen() && !this.ui.isNoteOpen()) this.updateMovement(dt);
    if (activeJourney) {
      this.journeyElapsed += dt;
      this.lightFieldAccumulator += dt;
      if (this.lightFieldAccumulator >= LIGHT_FIELD_UPDATE_INTERVAL) {
        this.lightFieldAccumulator %= LIGHT_FIELD_UPDATE_INTERVAL;
        this.refreshLightField();
      }
    }
    const position = this.camera.getPosition();
    this.renderer.updateFixtureLighting(this.journeyElapsed, this.save.settings.reducedFlicker, position.x, position.z);
    this.updateEyeAdaptation(activeJourney ? dt : 0);
    this.updateSimulation(dt); this.updateInteraction(); this.renderer.updateDynamicItems(Date.now());
    this.saveAccumulator += dt; this.metricsAccumulator += dt;
    if (this.saveAccumulator >= SAVE_INTERVAL) { this.saveAccumulator = 0; void this.persist(); }
    if (this.metricsAccumulator >= 0.25) { this.metricsAccumulator = 0; this.updateUI(); }
  }

  private updateEyeAdaptation(dt: number): void {
    if (!this.app || dt <= 0) return;
    const target = targetEyeExposure(this.lightField.energy, this.blackoutStrength);
    this.eyeExposure = stepEyeExposure(this.eyeExposure, target, dt);
    this.app.scene.exposure = this.eyeExposure;
  }

  private updateMovement(dt: number): void {
    if (!this.camera || !this.renderer || !this.save) return;
    const intent = this.input.movement(); const forwardInput = intent.forward; const strafeInput = intent.strafe;
    if (forwardInput === 0 && strafeInput === 0) return;
    const speed = intent.crouching ? CROUCH_SPEED : intent.sprinting ? SPRINT_SPEED : WALK_SPEED;
    const length = Math.max(1, Math.hypot(forwardInput, strafeInput)); const radians = this.yaw * Math.PI / 180;
    const fx = -Math.sin(radians), fz = -Math.cos(radians), rx = Math.cos(radians), rz = -Math.sin(radians); const current = this.camera.getPosition();
    const desiredX = current.x + (fx * forwardInput / length + rx * strafeInput / length) * speed * dt; const desiredZ = current.z + (fz * forwardInput / length + rz * strafeInput / length) * speed * dt;
    const [x, z] = this.renderer.resolveMovement(current.x, current.z, desiredX, desiredZ);
    this.camera.setPosition(x, intent.crouching ? 1.12 : PLAYER_HEIGHT, z); this.ambience.step(speed / WALK_SPEED);
    const nextCellX = worldToCell(x), nextCellZ = worldToCell(z);
    if (nextCellX !== this.currentCellX || nextCellZ !== this.currentCellZ) {
      this.save.exposure = recordTraversal(this.save.exposure, canonicalEdgeId(this.currentCellX, this.currentCellZ, nextCellX, nextCellZ), 140);
      this.currentCellX = nextCellX; this.currentCellZ = nextCellZ; this.updateStreaming();
    }
  }

  private updateSimulation(dt: number): void {
    if (!this.save || !this.currentCell) return;
    this.save.hydration = Math.max(0, this.save.hydration - dt / 2400);
    if (this.currentCell.stability === 'stable' || this.currentCell.stability === 'rendezvous') this.save.exposure = addStableTime(this.save.exposure, dt);
    const flashlightItem = this.getFlashlight();
    if (this.flashlight?.enabled && flashlightItem?.charge !== undefined) {
      const updated = { ...flashlightItem, charge: Math.max(0, flashlightItem.charge - dt / 660), revision: flashlightItem.revision + 1 };
      this.save.inventory = updateInventoryItem(this.save.inventory, updated);
      if (updated.charge <= 0) { this.flashlight.enabled = false; this.ui.toast('The flashlight dies without ceremony.'); }
      else if (!this.save.settings.reducedFlicker && updated.charge < 0.12) this.flashlight.enabled = unitFloat(`${updated.instanceId}:${Math.floor(performance.now() / 120)}`) > 0.2;
    }
    this.hallucinationCooldown -= dt;
    if (this.hallucinationCooldown <= 0 && this.currentCell.hallucinationAnchor) { this.hallucinationCooldown = 24 + unitFloat(`${this.save.seed}:hallucination-time:${this.currentCell.id}:${this.save.savedAt}`) * 35; this.ambience.distantImpact(); this.ui.toast('Something shifts beyond the next opening.', 2400); }
  }

  private updateStreaming(force = false, radiusOverride?: number): void {
    if (!this.save || !this.renderer) return;
    if (radiusOverride === undefined) this.streamWarmupToken += 1;
    const exposure = this.tuning.exposureOverride ?? calculateExposureDay(this.save.exposure); const worldDay = this.tuning.worldDayOverride ?? calculateWorldDay(Date.now()); const desired = new Set<string>(); const targetRadius = Math.max(1, Math.min(4, Math.round(this.tuning.activeRadius))); const radius = Math.max(1, Math.min(targetRadius, radiusOverride ?? targetRadius));
    for (let x = this.currentCellX - radius; x <= this.currentCellX + radius; x += 1) for (let z = this.currentCellZ - radius; z <= this.currentCellZ + radius; z += 1) {
      const id = `${x}:${z}`; desired.add(id); const descriptor = generateCell({ seed: this.save.seed, x, z, worldDay, exposure, shiftEpoch: this.save.shiftEpochs[id] ?? 0, tuning: this.tuning, generationVersion: this.save.generationVersion });
      const existing = this.renderer.loaded.get(id)?.descriptor;
      if (!existing) this.renderer.loadCell(descriptor); else if (force || existing.address.shiftEpoch !== descriptor.address.shiftEpoch || existing.address.zoneId !== descriptor.address.zoneId || existing.roomArchetype !== descriptor.roomArchetype) this.renderer.refreshCell(descriptor);
      if (x === this.currentCellX && z === this.currentCellZ) this.currentCell = descriptor;
    }
    for (const [id, visual] of [...this.renderer.loaded.entries()]) {
      if (desired.has(id)) continue;
      const distance = Math.max(Math.abs(visual.descriptor.address.cellX - this.currentCellX), Math.abs(visual.descriptor.address.cellZ - this.currentCellZ)); const unloadCount = (this.save.unloadCounts[id] ?? 0) + 1; this.save.unloadCounts[id] = unloadCount;
      if (this.save.generationVersion === 'gen2' && canShift({ occupied: false, observed: false, distanceInCells: distance, stability: visual.descriptor.stability, protectedInteraction: false, preservesPath: true }) && shouldShift(this.save.seed, id, unloadCount, this.tuning.shiftChance)) this.save.shiftEpochs[id] = (this.save.shiftEpochs[id] ?? 0) + 1;
      this.renderer.unloadCell(id);
    }
    if (this.app) {
      const rendering = renderControl(this.app);
      if (!rendering.autoRender) rendering.renderNextFrame = true;
    }
    this.refreshRegionExtent(); this.refreshLightField(); this.notifyRegionEntry();
  }

  private scheduleStreamingWarmup(): void {
    const targetRadius = Math.max(1, Math.min(4, Math.round(this.tuning.activeRadius)));
    if (targetRadius <= 2) return;
    const token = ++this.streamWarmupToken;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (token !== this.streamWarmupToken || !this.started || !this.save || !this.renderer) return;
      this.updateStreaming(false, targetRadius);
    }));
  }

  private notifyRegionEntry(): void {
    if (!this.save || !this.currentCell) return;
    if (this.save.generationVersion === 'gen2') {
      const zone = this.currentCell.address.zoneId;
      if (!this.save.enteredZoneIds.includes(zone)) { this.save.enteredZoneIds.push(zone); this.ui.toast(`The legacy architecture changes: ${ZONE_PROFILES[zone].label}.`, 4200); void this.persist(); }
      return;
    }
    const region = this.currentCell.world.regionId;
    if (!this.save.enteredRegionIds.includes(region)) {
      this.save.enteredRegionIds.push(region);
      this.ui.toast(`The Region changes: ${REGION_LABELS[region]}.`, 4200);
      void this.persist();
    }
  }

  private refreshRegionExtent(): void {
    if (!this.save || !this.currentCell || this.save.generationVersion !== 'gen3-v1') return;
    const worldDay = this.tuning.worldDayOverride ?? calculateWorldDay(Date.now());
    const exposure = this.tuning.exposureOverride ?? calculateExposureDay(this.save.exposure);
    const key = `${this.currentCell.world.regionId}:${Math.floor(this.currentCellX / 16)}:${Math.floor(this.currentCellZ / 16)}:${worldDay}:${Math.floor(exposure * 4)}`;
    if (key === this.regionExtentKey) return;
    this.regionExtentKey = key;
    this.regionExtent = estimateRegionExtent({
      seed: this.save.seed, worldX: this.currentCellX * CELL_SIZE, worldZ: this.currentCellZ * CELL_SIZE,
      target: this.currentCell.world.regionId, worldDay, exposure, tuning: this.tuning
    });
  }

  private locateRegion(regionId: RegionId): void {
    if (!this.save || !this.camera || this.save.generationVersion !== 'gen3-v1') {
      this.ui.toast('Region locating is available for Generation 3 journeys.');
      return;
    }
    const worldDay = this.tuning.worldDayOverride ?? calculateWorldDay(Date.now());
    const exposure = this.tuning.exposureOverride ?? calculateExposureDay(this.save.exposure);
    const position = this.camera.getPosition();
    const occurrence = locateNearestRegion({ seed: this.save.seed, originX: position.x, originZ: position.z, target: regionId, worldDay, exposure, tuning: this.tuning });
    if (!occurrence) { this.ui.toast(`${REGION_LABELS[regionId]} was not found within 12 km. Check timeline gates or enable the local bypass.`, 5600); return; }
    this.camera.setPosition(occurrence.worldX, position.y, occurrence.worldZ);
    this.currentCellX = worldToCell(occurrence.worldX); this.currentCellZ = worldToCell(occurrence.worldZ);
    this.regionExtentKey = ''; this.updateStreaming(true);
    const walkingMinutes = occurrence.distanceMeters / WALK_SPEED / 60;
    this.ui.toast(`Located ${REGION_LABELS[regionId]} ${occurrence.distanceMeters.toFixed(0)} m away (about ${walkingMinutes.toFixed(1)} walking minutes).`, 6200);
    void this.persist();
  }

  private locateBlackout(): void {
    if (!this.save || !this.camera || this.save.generationVersion !== 'gen3-v1') { this.ui.toast('Blackout locating is available for Generation 3 journeys.'); return; }
    const worldDay = this.tuning.worldDayOverride ?? calculateWorldDay(Date.now());
    const exposure = this.tuning.exposureOverride ?? calculateExposureDay(this.save.exposure);
    const position = this.camera.getPosition();
    const occurrence = locateNearestBlackout({ seed: this.save.seed, originX: position.x, originZ: position.z, worldDay, exposure, tuning: this.tuning });
    if (!occurrence) { this.ui.toast('No natural Blackout core was found within 12 km. Check its Day 7 / Exposure 1.6 gate or enable the bypass.', 5600); return; }
    this.tuning = { ...this.tuning, conditionOverride: undefined };
    this.camera.setPosition(occurrence.worldX, position.y, occurrence.worldZ);
    this.currentCellX = worldToCell(occurrence.worldX); this.currentCellZ = worldToCell(occurrence.worldZ);
    this.updateStreaming(true);
    const extent = estimateBlackoutExtent({ seed: this.save.seed, worldX: occurrence.worldX, worldZ: occurrence.worldZ, worldDay, exposure, tuning: this.tuning });
    this.ui.toast(`Located a natural Blackout ${occurrence.distanceMeters.toFixed(0)} m away; this local crossing is about ${extent.crossingMinutes.toFixed(1)} walking minutes.`, 6500);
    void this.persist();
  }

  private locateHoleCluster(): void {
    if (!this.save || !this.camera || this.save.generationVersion !== 'gen3-v1') { this.ui.toast('Carver locating is available for Generation 3 journeys.'); return; }
    const worldDay = this.tuning.worldDayOverride ?? calculateWorldDay(Date.now());
    const exposure = this.tuning.exposureOverride ?? calculateExposureDay(this.save.exposure);
    const position = this.camera.getPosition();
    const occurrence = locateNearestHoleCluster({ seed: this.save.seed, originX: position.x, originZ: position.z, worldDay, exposure, tuning: this.tuning });
    if (!occurrence) { this.ui.toast('No natural floor-hole cluster was found within 12 km. Check its Day 10 / Exposure 2.2 gate or enable the bypass.', 5600); return; }
    this.tuning = { ...this.tuning, carverOverride: undefined };
    const safeX = occurrence.worldX + occurrence.radius + 5;
    this.camera.setPosition(safeX, position.y, occurrence.worldZ);
    this.currentCellX = worldToCell(safeX); this.currentCellZ = worldToCell(occurrence.worldZ);
    this.updateStreaming(true);
    this.ui.toast(`Located a natural ${occurrence.radius.toFixed(0)} m floor-hole cluster ${occurrence.distanceMeters.toFixed(0)} m away. You were placed on its outer bypass side.`, 6500);
    void this.persist();
  }

  private locateManilaRoom(): void {
    if (!this.save || !this.camera || this.save.generationVersion !== 'gen3-v1') { this.ui.toast('Structure locating is available for Generation 3 journeys.'); return; }
    const worldDay = this.tuning.worldDayOverride ?? calculateWorldDay(Date.now());
    const exposure = this.tuning.exposureOverride ?? calculateExposureDay(this.save.exposure);
    if (!this.tuning.gateBypass && (worldDay < 1 || exposure < 0.25)) { this.ui.toast('The Manila Room is gated until World Day 1 / Exposure 0.25. Enable the local bypass to inspect it now.', 5400); return; }
    const target = manilaRoomCell(this.save.seed); const position = this.camera.getPosition();
    const worldX = target.cellX * CELL_SIZE; const worldZ = target.cellZ * CELL_SIZE;
    const distance = Math.hypot(worldX - position.x, worldZ - position.z);
    this.tuning = { ...this.tuning, structureOverride: undefined };
    this.camera.setPosition(worldX, position.y, worldZ); this.currentCellX = target.cellX; this.currentCellZ = target.cellZ;
    this.updateStreaming(true);
    this.ui.toast(`Located the natural Manila Room ${distance.toFixed(0)} m away (about ${(distance / WALK_SPEED / 60).toFixed(1)} walking minutes).`, 6200);
    void this.persist();
  }

  private refreshLightField(): void {
    if (!this.save || !this.renderer || !this.camera || !this.currentCell || !this.app) return;
    const position = this.camera.getPosition();
    this.lightField = this.renderer.updateLightField(position.x, position.z, this.journeyElapsed, this.save.settings.reducedFlicker);
    this.ambience.setLightField(this.lightField);
    const worldDay = this.tuning.worldDayOverride ?? calculateWorldDay(Date.now());
    const exposure = this.tuning.exposureOverride ?? calculateExposureDay(this.save.exposure);
    const sampled = this.save.generationVersion === 'gen3-v1' ? sampleGen3Environment(this.save.seed, position.x, position.z, worldDay, exposure, this.tuning) : undefined;
    const blackoutStrength = sampled?.blackoutStrength ?? this.currentCell.world.blackoutStrength;
    const blackoutEscapeCue = sampled?.blackoutEscapeCue ?? this.currentCell.world.blackoutEscapeCue;
    this.blackoutStrength = blackoutStrength;
    this.ambience.setEnvironment(blackoutStrength, blackoutEscapeCue);

    const visibleAmbient = Math.pow(1 - blackoutStrength, 1.7);
    const atmosphericCue = Math.pow(blackoutStrength, 2.1);
    this.app.scene.ambientLight = new pc.Color(
      LEVEL0_AMBIENT.r * visibleAmbient + BLACKOUT_AMBIENT_FLOOR.r,
      LEVEL0_AMBIENT.g * visibleAmbient + BLACKOUT_AMBIENT_FLOOR.g,
      LEVEL0_AMBIENT.b * visibleAmbient + BLACKOUT_AMBIENT_FLOOR.b
    );
    const fogR = 0.15 * visibleAmbient + 0.018 * atmosphericCue;
    const fogG = 0.135 * visibleAmbient + 0.017 * atmosphericCue;
    const fogB = 0.075 * visibleAmbient + 0.011 * atmosphericCue;
    this.app.scene.fogColor = new pc.Color(fogR, fogG, fogB);
    this.app.scene.fogStart = LEVEL0_FOG_START - blackoutStrength * (LEVEL0_FOG_START - 7);
    this.app.scene.fogEnd = LEVEL0_FOG_END - blackoutStrength * (LEVEL0_FOG_END - 29);
    const cameraComponent = (this.camera as unknown as { camera?: { clearColor: pc.Color } }).camera;
    if (cameraComponent) cameraComponent.clearColor = new pc.Color(fogR, fogG, fogB);

    if (this.blackoutGuideLight?.light && sampled && blackoutStrength > 0.52) {
      this.blackoutGuideLight.enabled = true;
      this.blackoutGuideLight.setPosition(position.x + sampled.blackoutExitDirection.x * 18, 2.35, position.z + sampled.blackoutExitDirection.z * 18);
      this.blackoutGuideLight.light.intensity = 0.025 + blackoutEscapeCue * 0.24;
    } else if (this.blackoutGuideLight) this.blackoutGuideLight.enabled = false;
  }

  private updateInteraction(): void {
    if (!this.camera || !this.renderer) return; const position = this.camera.getPosition(); const forward = forwardFromAngles(this.yaw, this.pitch);
    this.interaction = this.renderer.closestInteraction(position.x, position.y, position.z, forward.x, forward.z);
    if (!this.interaction) this.ui.setInteraction();
    else if (this.interaction.kind === 'item') this.ui.setInteraction(`[E] Pick up ${ITEM_DEFINITIONS[this.interaction.item.definitionId].name}`);
    else if (this.interaction.kind === 'exit') this.ui.setInteraction(this.interaction.enabled ? `[E] Approach ${this.interaction.label}` : `${this.interaction.label} — requires World Day ${this.interaction.minimumWorldDay} / Exposure ${this.interaction.minimumExposure.toFixed(1)}`);
    else if (this.interaction.kind === 'note') this.ui.setInteraction(`[E] Read ${this.interaction.note.title}`); else this.ui.setInteraction('[E] Wait in the Manila Room');
  }

  private interact(): void {
    if (!this.save || !this.renderer || !this.interaction) return;
    if (this.interaction.kind === 'item') this.pickupItem(this.interaction);
    else if (this.interaction.kind === 'exit') {
      if (!this.interaction.enabled) { this.ui.toast(`The Transition remains inert. World Day ${this.interaction.minimumWorldDay} and Exposure ${this.interaction.minimumExposure.toFixed(1)} are required.`, 4800); return; }
      if (!this.save.discoveredExits.includes(this.interaction.destinationId)) this.save.discoveredExits.push(this.interaction.destinationId);
      this.save.pendingTransition = { destinationId: this.interaction.destinationId, exitId: this.interaction.id, discoveredAt: Date.now() }; this.ui.toast(`Transition recorded: ${this.interaction.destinationId}.`, 4200); void this.persist();
    } else if (this.interaction.kind === 'note') {
      this.ui.showNote(this.interaction.note.title, this.interaction.note.body, this.interaction.note.attribution); if (!this.save.readNoteIds.includes(this.interaction.note.id)) this.save.readNoteIds.push(this.interaction.note.id); document.exitPointerLock(); void this.persist();
    } else this.ui.toast('You wait. Here, the seconds behave normally.', 4200);
  }

  private pickupItem(visual: WorldItemVisual): void {
    if (!this.save || !this.renderer) return;
    if (this.save.inventory.length >= INVENTORY_CAPACITY) { this.ui.toast('Your inventory is full. Leave something behind.'); return; }
    try { this.save.inventory = addToInventory(this.save.inventory, visual.item, this.save.characterId); if (visual.lootNodeId) this.save.pickedLootNodeIds.push(visual.lootNodeId); this.save.droppedItems = this.save.droppedItems.filter((drop) => drop.item.instanceId !== visual.item.instanceId); this.renderer.removeInteraction(visual.id); this.save.selectedItemId ??= visual.item.instanceId; this.ui.toast(`Found: ${ITEM_DEFINITIONS[visual.item.definitionId].name}`); this.ui.updateInventory(this.save.inventory, this.save.selectedItemId); void this.persist(); }
    catch (error) { this.ui.toast(error instanceof Error ? error.message : 'Could not pick up item'); }
  }
  private selectItem(instanceId: string): void { if (!this.save?.inventory.some((item) => item.instanceId === instanceId)) return; this.save.selectedItemId = instanceId; this.ui.updateInventory(this.save.inventory, instanceId); }

  private useSelectedItem(): void {
    if (!this.save) return; const item = this.save.inventory.find((candidate) => candidate.instanceId === this.save?.selectedItemId); if (!item) { this.ui.toast('Nothing is selected.'); return; }
    switch (item.definitionId) {
      case 'flashlight': if ((item.charge ?? 0) <= 0) this.ui.toast('The flashlight has no charge.'); else if (this.flashlight) { this.flashlight.enabled = !this.flashlight.enabled; this.ui.toast(this.flashlight.enabled ? 'Flashlight on.' : 'Flashlight off.'); } break;
      case 'battery': this.useBattery(item); break;
      case 'almond-water': this.save.hydration = Math.min(1, this.save.hydration + 0.38 * item.condition); this.consumeItem(item.instanceId); this.ui.toast('The sweetness cuts through the fluorescent headache.'); break;
      case 'marker': this.toggleMarkerMode(); break;
      case 'glow-stick': this.activateGlowStick(item); break;
      case 'empty-can': this.dropItemInstance(item, 2.2); break;
      case 'string-spool': this.save.inventory = updateInventoryItem(this.save.inventory, { ...item, charge: Math.max(0, (item.charge ?? 1) - 0.08), revision: item.revision + 1 }); this.ui.toast('A short length of string is fixed behind you.'); break;
      case 'paper-note': this.ui.showNote('Blank Paper', 'The paper is blank. A safe note editor is planned; world-authored notes can already be read.', 'player note.'); break;
      case 'pry-tool': this.ui.toast(this.interaction?.kind === 'exit' ? 'The tool finds a seam, but this threshold still rejects you.' : 'There is nothing nearby that yields to it.'); break;
    }
    this.ui.updateInventory(this.save.inventory, this.save.selectedItemId); void this.persist();
  }

  private activateGlowStick(item: ItemInstance): void {
    if ((item.charge ?? 0) <= 0) { this.ui.toast('The glow stick is already spent.'); return; }
    const activated = { ...item, charge: 1, revision: item.revision + 1 };
    this.dropItemInstance(activated, 1.15, Date.now());
    this.ui.toast('The tube cracks. A green island of light settles onto the carpet.', 4200);
  }

  private useBattery(battery: ItemInstance): void {
    if (!this.save) return; const flashlight = this.getFlashlight();
    if (!flashlight) { this.ui.toast('A battery without a flashlight is only potential.'); return; }
    const updated = { ...flashlight, charge: Math.min(1, (flashlight.charge ?? 0) + (battery.charge ?? 0.5) * battery.condition * 0.78), revision: flashlight.revision + 1 };
    this.save.inventory = updateInventoryItem(this.save.inventory, updated).filter((candidate) => candidate.instanceId !== battery.instanceId);
    if (this.save.selectedItemId === battery.instanceId) this.save.selectedItemId = updated.instanceId; this.ui.toast('The flashlight accepts most of the remaining charge.');
  }
  private consumeItem(instanceId: string): void { if (!this.save) return; this.save.inventory = this.save.inventory.filter((item) => item.instanceId !== instanceId); if (this.save.selectedItemId === instanceId) this.save.selectedItemId = this.save.inventory[0]?.instanceId; }
  private dropSelectedItem(): void { const item = this.save?.inventory.find((candidate) => candidate.instanceId === this.save?.selectedItemId); if (item) this.dropItemInstance(item, 1.1); }

  private dropItemInstance(item: ItemInstance, distance: number, activatedAt?: number): void {
    if (!this.save || !this.camera || !this.renderer || !this.currentCell) return;
    this.save.inventory = removeFromInventory(this.save.inventory, item.instanceId).remaining;
    const position = this.camera.getPosition(); const forward = forwardFromAngles(this.yaw, 0); const x = position.x + forward.x * distance; const z = position.z + forward.z * distance;
    const dropped: DroppedItemState = { item: transferItem(item, { type: 'world', addressId: this.currentCell.id }), x, y: 0.28, z, ...(activatedAt ? { activatedAt } : {}) };
    this.save.droppedItems.push(dropped); this.renderer.addDroppedItem(dropped);
    if (this.save.selectedItemId === item.instanceId) this.save.selectedItemId = this.save.inventory[0]?.instanceId;
    this.ui.updateInventory(this.save.inventory, this.save.selectedItemId); if (!activatedAt) this.ui.toast(`Left behind: ${ITEM_DEFINITIONS[item.definitionId].name}`); void this.persist();
  }

  private toggleMarkerMode(): void {
    if (!this.save) return;
    if (this.drawing) this.finishMark();
    const selected = this.save.inventory.find((candidate) => candidate.instanceId === this.save?.selectedItemId);
    if (selected?.definitionId !== 'marker') { const marker = this.save.inventory.find((candidate) => candidate.definitionId === 'marker'); if (!marker) { this.ui.toast('You do not have a marker.'); return; } this.save.selectedItemId = marker.instanceId; }
    this.markerMode = !this.markerMode; this.ui.setMarkerMode(this.markerMode); this.ui.updateInventory(this.save.inventory, this.save.selectedItemId);
    const instruction = this.mobileInputActive ? 'Marker ready. Drag the Look area while aiming at a nearby wall.' : 'Marker ready. Hold the primary button while looking at a wall.';
    this.ui.toast(this.markerMode ? instruction : 'Marker capped.');
  }

  private beginMark(): void {
    if (!this.save || !this.renderer || !this.camera || !this.currentCell) return;
    if (this.save.marks.filter((mark) => mark.cellId === this.currentCell?.id).length >= 6) { this.ui.toast('This cell has reached your local mark limit.'); return; }
    const marker = this.save.inventory.find((item) => item.instanceId === this.save?.selectedItemId && item.definitionId === 'marker');
    if (!marker || (marker.charge ?? 0) <= 0.01) { this.ui.toast('The marker is dry.'); return; }
    const hit = this.renderer.raycastWall(this.camera.getPosition(), forwardFromAngles(this.yaw, this.pitch), 3.2);
    if (!hit) { this.ui.toast('Move closer and aim directly at a wall.'); return; }
    this.activeMark = { id: stableId('mark', this.save.characterId, Date.now(), this.save.marks.length), creatorId: this.save.characterId, surfaceId: hit.wall.id, cellId: hit.wall.cellId, shiftEpoch: hit.wall.shiftEpoch, points: [[hit.u, hit.v]], thickness: 1, ink: 'black', scope: this.currentCell.world.structureIds.includes('manila-room') ? 'encounter' : 'personal', faceSign: hit.faceSign, createdAt: Date.now(), revision: 1 };
    this.drawing = true; this.markedPointCount = 1; this.renderer.addMarkVisual(this.activeMark);
  }

  private sampleMark(): void {
    if (!this.activeMark || !this.camera || !this.renderer || !this.save || this.markedPointCount >= 256) return;
    const hit = this.renderer.raycastWall(this.camera.getPosition(), forwardFromAngles(this.yaw, this.pitch), 3.2);
    if (!hit || hit.wall.id !== this.activeMark.surfaceId || hit.faceSign !== this.activeMark.faceSign) return;
    const previous = this.activeMark.points[this.activeMark.points.length - 1]; if (previous && Math.hypot(hit.u - previous[0], hit.v - previous[1]) < 0.006) return;
    const segment: SurfaceMark = { ...this.activeMark, id: `${this.activeMark.id}:preview:${this.markedPointCount}`, points: [previous!, [hit.u, hit.v]] };
    this.activeMark.points.push([hit.u, hit.v]); this.markedPointCount += 1; this.renderer.addMarkVisual(segment);
  }

  private finishMark(): void {
    if (!this.activeMark || !this.save || !this.renderer) return;
    const cellId = this.activeMark.cellId;
    if (this.activeMark.points.length >= 2) {
      this.save.marks.push(this.activeMark);
      const marker = this.save.inventory.find((item) => item.instanceId === this.save?.selectedItemId && item.definitionId === 'marker');
      if (marker) this.save.inventory = updateInventoryItem(this.save.inventory, { ...marker, charge: Math.max(0, (marker.charge ?? 0.5) - this.activeMark.points.length / 1800), revision: marker.revision + 1 });
      this.ui.toast('The line holds—for now.'); void this.persist();
    }
    this.activeMark = undefined; this.drawing = false; this.renderer.rerenderMarks(cellId);
  }

  private getFlashlight(): ItemInstance | undefined { return this.save?.inventory.find((item) => item.definitionId === 'flashlight'); }
  private updateCameraRotation(): void { this.camera?.setEulerAngles(this.pitch, this.yaw, 0); }

  private updateUI(): void {
    if (!this.save || !this.renderer || !this.currentCell || !this.camera) return;
    const worldDay = this.tuning.worldDayOverride ?? calculateWorldDay(Date.now()); const exposureDay = this.tuning.exposureOverride ?? calculateExposureDay(this.save.exposure); const profile = ZONE_PROFILES[this.currentCell.address.zoneId]; const flashlight = this.getFlashlight();
    const regionLabel = this.save.generationVersion === 'gen3-v1' ? REGION_LABELS[this.currentCell.world.regionId] : `Legacy ${profile.label}`;
    this.ui.updateWatch({ worldDay, exposureDay }, `LEVEL 0 / ${regionLabel}`, this.currentCell.stability); this.ui.updateStatus(this.save.hydration, flashlight?.charge ?? 0); this.ui.updateInventory(this.save.inventory, this.save.selectedItemId);
    const position = this.camera.getPosition(); const drawCalls = this.app?.stats?.drawCalls?.total ?? 'n/a';
    const semantic = this.currentCell.world;
    const environment = sampleGen3Environment(this.save.seed, position.x, position.z, worldDay, exposureDay, this.tuning);
    const extent = this.regionExtent;
    const manilaTarget = manilaRoomCell(this.save.seed);
    const manilaDistance = Math.hypot(manilaTarget.cellX * CELL_SIZE - position.x, manilaTarget.cellZ * CELL_SIZE - position.z);
    const semanticLines = this.save.generationVersion === 'gen3-v1' ? [
      `generation     ${semantic.generationVersion}`,
      `level          Level 0`,
      `region         ${REGION_LABELS[semantic.regionId]} / strength ${semantic.regionStrength.toFixed(2)}`,
      `geometry       ${semantic.geometry}`,
      `materials      ${semantic.materialIds.join(', ')}`,
      `conditions     ${semantic.conditionIds.join(', ') || 'none'}`,
      `features       ${semantic.featureIds.length || 'none'}`,
      `structures     ${semantic.structureIds.join(', ') || 'none'}`,
      `carvers        ${semantic.carverIds.join(', ') || 'none'}`,
      `transitions    ${semantic.transitionIds.join(', ') || 'none'}`,
      `region extent  ${extent ? `${extent.eastWestMeters.toFixed(0)} m E/W · ${extent.northSouthMeters.toFixed(0)} m N/S · ${extent.capped ? '>' : ''}${extent.crossingMinutes.toFixed(1)} walking min` : 'sampling'}`,
      `blackout cue   strength ${environment.blackoutStrength.toFixed(2)} · exit cue ${environment.blackoutEscapeCue.toFixed(2)} · gate Day 7 / Exp 1.6`,
      `hole Carver    8% candidate rate per 900 m grid · gate Day 10 / Exp 2.2`,
      `Manila Room    ${manilaDistance.toFixed(0)} m / ${(manilaDistance / WALK_SPEED / 60).toFixed(1)} walking min · gate Day 1 / Exp 0.25`,
      `Item nodes     ${(this.tuning.lootChance * 100).toFixed(1)}% base chance · independent seed domain`,
      ...formatGeographyDiagnostics(environment.geography),
      ...formatFieldDiagnostics(environment.fields)
    ] : [
      `generation     gen2 (frozen save compatibility)`,
      `legacy zone    ${profile.label}`,
      `legacy room    ${this.currentCell.roomArchetype}`
    ];
    this.ui.updateMetrics([
      `seed           ${this.save.seed}`,
      ...semanticLines,
      `stream cell    ${this.currentCell.id} (cache only)`,
      `loaded cells   ${this.renderer.loadedCellCount}`,
      `colliders      ${this.renderer.wallCount}`,
      `interactions   ${this.renderer.interactionCount}`,
      `light groups   ${this.renderer.lightGroupCount} / fixtures ${this.renderer.lightFixtureCount}`,
      `fixture lights ${this.renderer.activeRealtimeFixtureLightCount}/${this.renderer.realtimeFixtureLightCount} active/real`,
      `light field    ${this.lightField.energy.toFixed(3)} / active ${this.lightField.activeGroups} / flicker ${this.lightField.flickerGroups} / nearby ${this.lightField.nearbyGroups}`,
      `eye exposure   ${this.eyeExposure.toFixed(3)} / blackout ${this.blackoutStrength.toFixed(3)}`,
      `draw calls     ${drawCalls}`,
      `position       ${position.x.toFixed(1)}, ${position.z.toFixed(1)}`,
      `inventory      ${this.save.inventory.length}/${INVENTORY_CAPACITY}`,
      `marks          ${this.save.marks.length}`,
      `notes read     ${this.save.readNoteIds.length}`,
      `exits found    ${this.save.discoveredExits.join(', ') || 'none'}`
    ].join('\n'));
  }

  private async persist(): Promise<void> { if (!this.save || !this.camera) return; const position = this.camera.getPosition(); this.save.position = { x: position.x, y: position.y, z: position.z, yaw: this.yaw, pitch: this.pitch }; this.save.savedAt = Date.now(); await this.store.save(this.save); this.ui.setContinueAvailable(true); }
  private updateTuning(patch: Partial<WorldTuning>): void {
    this.tuning = { ...this.tuning, ...patch };
    this.ui.setLabAudioMonitor(this.tuning.labAudioMonitor);
    this.regionExtentKey = '';
    if (this.started && this.camera && (patch.structureOverride === 'manila-room' || patch.carverOverride === 'floor-hole-cluster')) {
      const position = this.camera.getPosition();
      this.camera.setPosition(0, position.y, 0); this.currentCellX = 0; this.currentCellZ = 0;
      this.ui.toast(patch.structureOverride === 'manila-room' ? 'Moved to the isolated Manila Room test at the origin.' : 'Moved to the isolated floor-hole Carver preview at the origin.', 4600);
    }
    if (this.started) this.updateStreaming(true);
  }
  private simulateStarters(): void { const stats = simulateStarterRolls(this.save?.seed ?? 'threshold-001', 1000); this.ui.updateStarterStats(`1,000 deterministic rolls\nnone  ${stats.none} (${(stats.none / 10).toFixed(1)}%)\none   ${stats.one} (${(stats.one / 10).toFixed(1)}%)\ntwo   ${stats.two} (${(stats.two / 10).toFixed(1)}%)`); }
  private exportTuning(): void { const blob = new Blob([JSON.stringify({ version: 2, tuning: this.tuning }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'project-noclip-world-tuning.json'; anchor.click(); URL.revokeObjectURL(url); }
  private async resetGame(): Promise<void> { await this.store.clear(); window.location.reload(); }
}

function worldToCell(value: number): number { return Math.floor((value + CELL_SIZE / 2) / CELL_SIZE); }
function forwardFromAngles(yaw: number, pitch: number): { x: number; y: number; z: number } {
  const yawRadians = yaw * Math.PI / 180; const pitchRadians = pitch * Math.PI / 180; const cosPitch = Math.cos(pitchRadians);
  return { x: -Math.sin(yawRadians) * cosPitch, y: Math.sin(pitchRadians), z: -Math.cos(yawRadians) * cosPitch };
}
