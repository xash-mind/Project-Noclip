import * as pc from 'playcanvas';
import { ProceduralAmbience } from '../audio/Ambience.js';
import { applyLookDelta, MOVEMENT_CODES } from '../input/look.js';
import { PROJECT_VERSION } from '../config/version.js';
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
import { generateCell } from '../world/generator.js';
import { stableId, unitFloat } from '../world/hash.js';
import { CELL_SIZE, DEFAULT_TUNING, type CellDescriptor, type WorldTuning } from '../world/types.js';
import { ZONE_PROFILES } from '../world/zones.js';

const PLAYER_HEIGHT = 1.65;
const WALK_SPEED = 3.15;
const SPRINT_SPEED = 5.15;
const CROUCH_SPEED = 1.8;
const SAVE_INTERVAL = 1.5;

export class ProjectNoclipGame {
  private readonly store = new IndexedDbSaveStore();
  private readonly ambience = new ProceduralAmbience();
  private readonly canvas: HTMLCanvasElement;
  private readonly ui: GameUI;
  private app?: pc.Application;
  private camera?: pc.Entity;
  private localLight?: pc.Entity;
  private flashlight?: pc.Entity;
  private renderer?: WorldRenderer;
  private save?: SaveData;
  private tuning: WorldTuning = { ...DEFAULT_TUNING };
  private readonly keys = new Set<string>();
  private yaw = 0;
  private pitch = 0;
  private started = false;
  private paused = true;
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
  private pendingMouseX = 0;
  private pendingMouseY = 0;
  private lightField = { energy: 0, activeGroups: 0, flickerGroups: 0, flickerPulse: 0, temperature: 0.94 };
  private sessionElapsed = 0;
  private lightFieldAccumulator = 0;

  constructor() {
    const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
    if (!canvas) throw new Error('Missing #game-canvas');
    this.canvas = canvas;
    this.ui = new GameUI({
      onNewGame: (seed) => void this.startNew(seed), onContinue: () => void this.continueGame(), onReset: () => void this.resetGame(),
      onResume: () => this.requestPointerLock(), onSelectItem: (id) => this.selectItem(id), onTuningChange: (patch) => this.updateTuning(patch),
      onSeedChange: (seed) => void this.startNew(seed), onSimulateStarter: () => this.simulateStarters(), onExportTuning: () => this.exportTuning()
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
      version: 2, characterId, seed, createdAt, starterRolled: true,
      position: { x: 0, y: PLAYER_HEIGHT, z: 0, yaw: 0, pitch: 0 }, inventory, selectedItemId: inventory[0]?.instanceId,
      droppedItems: [], pickedLootNodeIds: [], marks: [], hydration: 0.76, exposure: structuredClone(EMPTY_EXPOSURE),
      shiftEpochs: {}, unloadCounts: {}, discoveredExits: [], readNoteIds: [], enteredZoneIds: ['baseline'],
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
    this.markerMode = false; this.ui.setMarkerMode(false); this.setupEngine();
    if (!this.app || !this.camera) throw new Error('Engine did not initialize');
    this.renderer = new WorldRenderer(this.app, save);
    this.camera.setPosition(save.position.x, save.position.y, save.position.z);
    this.currentCellX = worldToCell(save.position.x); this.currentCellZ = worldToCell(save.position.z);
    this.updateStreaming(true); this.updateCameraRotation(); this.started = true; this.paused = true;
    this.ui.showGame(); this.ui.updateInventory(save.inventory, save.selectedItemId); this.ui.setPaused(true);
    await this.ambience.start(save.settings.masterVolume); this.ambience.setPaused(true); this.requestPointerLock();
  }

  private setupEngine(): void {
    if (this.app) { for (const id of [...(this.renderer?.loaded.keys() ?? [])]) this.renderer?.unloadCell(id); return; }
    const app = new pc.Application(this.canvas);
    app.setCanvasResolution(pc.RESOLUTION_AUTO); app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.scene.ambientLight = new pc.Color(0.46, 0.43, 0.27); app.scene.skyboxIntensity = 0;
    app.scene.fog = pc.FOG_LINEAR; app.scene.fogColor = new pc.Color(0.15, 0.135, 0.075); app.scene.fogStart = 28; app.scene.fogEnd = 78;
    const camera = new pc.Entity('player-camera');
    camera.addComponent('camera', { clearColor: new pc.Color(0.075, 0.068, 0.038), nearClip: 0.05, farClip: 105, fov: 73 }); app.root.addChild(camera);
    const localLight = new pc.Entity('local-fluorescent-light');
    localLight.addComponent('light', { type: 'omni', color: new pc.Color(0.78, 0.75, 0.5), range: 16, intensity: 0.82, castShadows: false }); app.root.addChild(localLight);
    const flashlight = new pc.Entity('flashlight');
    flashlight.addComponent('light', { type: 'spot', color: new pc.Color(0.93, 0.91, 0.72), range: 18, intensity: 1.35, innerConeAngle: 24, outerConeAngle: 38, castShadows: false });
    camera.addChild(flashlight); flashlight.setLocalPosition(0, -0.08, -0.2); flashlight.setLocalEulerAngles(0, 180, 0); flashlight.enabled = false;
    this.app = app; this.camera = camera; this.localLight = localLight; this.flashlight = flashlight;
    app.on('update', (dt) => this.update(Math.min(dt, 0.05))); app.start(); window.addEventListener('resize', () => app.resizeCanvas());
  }

  private installInput(): void {
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Backquote') { event.preventDefault(); this.ui.toggleLab(); if (this.ui.isLabOpen()) document.exitPointerLock(); this.ambience.setPaused(true); return; }
      if (!this.started) return;
      if (MOVEMENT_CODES.has(event.code) && document.pointerLockElement === this.canvas) event.preventDefault();
      if (event.code === 'Escape' && this.ui.isNoteOpen()) { this.ui.hideNote(); return; }
      if (event.code === 'KeyE') this.interact(); else if (event.code === 'KeyF') this.useSelectedItem(); else if (event.code === 'KeyG') this.dropSelectedItem(); else if (event.code === 'KeyM') this.toggleMarkerMode();
      else if (/^Digit[1-6]$/.test(event.code)) { const item = this.save?.inventory[Number(event.code.slice(-1)) - 1]; if (item) this.selectItem(item.instanceId); }
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    const collectMouseDelta = (event: MouseEvent) => {
      if (document.pointerLockElement !== this.canvas || this.paused || this.ui.isLabOpen() || this.ui.isNoteOpen()) return;
      this.pendingMouseX += event.movementX;
      this.pendingMouseY += event.movementY;
    };
    window.addEventListener('mousemove', collectMouseDelta, { passive: true });
    window.addEventListener('mousedown', (event) => { if (event.button === 0 && this.markerMode && document.pointerLockElement === this.canvas) this.beginMark(); });
    window.addEventListener('mouseup', (event) => { if (event.button === 0 && this.drawing) this.finishMark(); });
    document.addEventListener('pointerlockchange', () => {
      if (!this.started) return; this.paused = document.pointerLockElement !== this.canvas;
      this.ui.setPaused(this.paused && !this.ui.isLabOpen() && !this.ui.isNoteOpen());
      this.ambience.setPaused(this.paused || this.ui.isLabOpen() || this.ui.isNoteOpen());
      if (this.paused) { this.keys.clear(); this.pendingMouseX = 0; this.pendingMouseY = 0; }
    });
    this.canvas.addEventListener('click', () => { if (this.started && !this.ui.isLabOpen() && !this.ui.isNoteOpen() && document.pointerLockElement !== this.canvas) this.requestPointerLock(); });
    window.addEventListener('blur', () => { this.keys.clear(); this.pendingMouseX = 0; this.pendingMouseY = 0; this.ambience.setPaused(true); if (document.pointerLockElement === this.canvas) document.exitPointerLock(); });
  }

  private requestPointerLock(): void { if (this.started && !this.ui.isLabOpen() && !this.ui.isNoteOpen()) void this.canvas.requestPointerLock(); }

  private update(dt: number): void {
    if (!this.started || !this.save || !this.camera || !this.renderer) return;
    const active = !this.paused && !this.ui.isLabOpen() && !this.ui.isNoteOpen() && document.hasFocus();
    if (active) {
      this.sessionElapsed += dt;
      if (this.pendingMouseX !== 0 || this.pendingMouseY !== 0) {
        const next = applyLookDelta({ yaw: this.yaw, pitch: this.pitch }, { x: this.pendingMouseX, y: this.pendingMouseY }, this.save.settings.sensitivity);
        this.yaw = next.yaw; this.pitch = next.pitch; this.pendingMouseX = 0; this.pendingMouseY = 0;
        this.updateCameraRotation(); if (this.drawing) this.sampleMark();
      }
      this.updateMovement(dt);
      this.updateSimulation(dt);
      this.updateInteraction();
      this.renderer.updateDynamicItems(Date.now());
      this.lightFieldAccumulator += dt;
      if (this.lightFieldAccumulator >= 0.1) {
        this.lightFieldAccumulator %= 0.1;
        const position = this.camera.getPosition();
        this.lightField = this.renderer.updateLightField(position.x, position.z, this.sessionElapsed, this.save.settings.reducedFlicker);
        this.ambience.setLightField(this.lightField);
        if (this.localLight?.light) {
          const energy = Math.max(0, Math.min(1, this.lightField.energy));
          this.localLight.light.intensity = 0.08 + energy * 0.74;
          this.localLight.light.color = new pc.Color(0.78 * this.lightField.temperature, 0.75 * this.lightField.temperature, 0.5);
        }
      }
      this.saveAccumulator += dt;
      if (this.saveAccumulator >= SAVE_INTERVAL) { this.saveAccumulator = 0; void this.persist(); }
    }
    this.metricsAccumulator += dt;
    if (this.metricsAccumulator >= 0.25) { this.metricsAccumulator = 0; this.updateUI(); }
    this.publishDebugState(active);
  }

  private updateMovement(dt: number): void {
    if (!this.camera || !this.renderer || !this.save) return;
    const forwardInput = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0); const strafeInput = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    if (forwardInput === 0 && strafeInput === 0) return;
    const crouching = this.keys.has('ControlLeft') || this.keys.has('KeyC'); const sprinting = this.keys.has('ShiftLeft') && !crouching; const speed = crouching ? CROUCH_SPEED : sprinting ? SPRINT_SPEED : WALK_SPEED;
    const length = Math.max(1, Math.hypot(forwardInput, strafeInput)); const radians = this.yaw * Math.PI / 180;
    const fx = -Math.sin(radians), fz = -Math.cos(radians), rx = Math.cos(radians), rz = -Math.sin(radians); const current = this.camera.getPosition();
    const desiredX = current.x + (fx * forwardInput / length + rx * strafeInput / length) * speed * dt; const desiredZ = current.z + (fz * forwardInput / length + rz * strafeInput / length) * speed * dt;
    const [x, z] = this.renderer.resolveMovement(current.x, current.z, desiredX, desiredZ);
    this.camera.setPosition(x, crouching ? 1.12 : PLAYER_HEIGHT, z); this.localLight?.setPosition(x, 2.6, z); this.ambience.step(speed / WALK_SPEED);
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

  private updateStreaming(force = false): void {
    if (!this.save || !this.renderer) return;
    const exposure = this.tuning.exposureOverride ?? calculateExposureDay(this.save.exposure); const worldDay = this.tuning.worldDayOverride ?? calculateWorldDay(Date.now()); const desired = new Set<string>(); const radius = Math.max(1, Math.min(4, Math.round(this.tuning.activeRadius)));
    for (let x = this.currentCellX - radius; x <= this.currentCellX + radius; x += 1) for (let z = this.currentCellZ - radius; z <= this.currentCellZ + radius; z += 1) {
      const id = `${x}:${z}`; desired.add(id); const descriptor = generateCell({ seed: this.save.seed, x, z, worldDay, exposure, shiftEpoch: this.save.shiftEpochs[id] ?? 0, tuning: this.tuning });
      const existing = this.renderer.loaded.get(id)?.descriptor;
      if (!existing) this.renderer.loadCell(descriptor); else if (force || existing.address.shiftEpoch !== descriptor.address.shiftEpoch || existing.address.zoneId !== descriptor.address.zoneId || existing.roomArchetype !== descriptor.roomArchetype || existing.compositionSignature !== descriptor.compositionSignature) this.renderer.refreshCell(descriptor);
      if (x === this.currentCellX && z === this.currentCellZ) this.currentCell = descriptor;
    }
    for (const [id, visual] of [...this.renderer.loaded.entries()]) {
      if (desired.has(id)) continue;
      const distance = Math.max(Math.abs(visual.descriptor.address.cellX - this.currentCellX), Math.abs(visual.descriptor.address.cellZ - this.currentCellZ)); const unloadCount = (this.save.unloadCounts[id] ?? 0) + 1; this.save.unloadCounts[id] = unloadCount;
      if (canShift({ occupied: false, observed: false, distanceInCells: distance, stability: visual.descriptor.stability, protectedInteraction: false, preservesPath: true }) && shouldShift(this.save.seed, id, unloadCount, this.tuning.shiftChance)) this.save.shiftEpochs[id] = (this.save.shiftEpochs[id] ?? 0) + 1;
      this.renderer.unloadCell(id);
    }
    this.updateZoneAtmosphere(); this.notifyZoneEntry();
  }

  private notifyZoneEntry(): void {
    if (!this.save || !this.currentCell) return; const zone = this.currentCell.address.zoneId;
    if (!this.save.enteredZoneIds.includes(zone)) { this.save.enteredZoneIds.push(zone); this.ui.toast(`The architecture changes: ${ZONE_PROFILES[zone].label}.`, 4200); void this.persist(); }
  }

  private updateZoneAtmosphere(): void {
    if (!this.app || !this.currentCell) return; const profile = ZONE_PROFILES[this.currentCell.address.zoneId];
    this.app.scene.ambientLight = new pc.Color(0.44 * profile.lightMultiplier, 0.42 * profile.lightMultiplier, 0.25 * profile.lightMultiplier);
    this.app.scene.fogStart = profile.id === 'pillar' ? 18 : profile.id === 'blackout' ? 8 : 26; this.app.scene.fogEnd = profile.id === 'pillar' ? 54 : profile.id === 'blackout' ? 28 : 78;
    if (this.localLight?.light) this.localLight.light.intensity = this.currentCell.lightFailure ? 0.12 : 0.82 * profile.lightMultiplier;
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
      if (!this.interaction.enabled) { this.ui.toast(`The threshold remains inert. World Day ${this.interaction.minimumWorldDay} and Exposure ${this.interaction.minimumExposure.toFixed(1)} are required.`, 4800); return; }
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
    const selected = this.save.inventory.find((candidate) => candidate.instanceId === this.save?.selectedItemId);
    if (selected?.definitionId !== 'marker') { const marker = this.save.inventory.find((candidate) => candidate.definitionId === 'marker'); if (!marker) { this.ui.toast('You do not have a marker.'); return; } this.save.selectedItemId = marker.instanceId; }
    this.markerMode = !this.markerMode; this.ui.setMarkerMode(this.markerMode); this.ui.updateInventory(this.save.inventory, this.save.selectedItemId);
    this.ui.toast(this.markerMode ? 'Marker ready. Hold the primary button while looking at a wall.' : 'Marker capped.');
  }

  private beginMark(): void {
    if (!this.save || !this.renderer || !this.camera || !this.currentCell) return;
    if (this.save.marks.filter((mark) => mark.cellId === this.currentCell?.id).length >= 6) { this.ui.toast('This cell has reached your local mark limit.'); return; }
    const marker = this.save.inventory.find((item) => item.instanceId === this.save?.selectedItemId && item.definitionId === 'marker');
    if (!marker || (marker.charge ?? 0) <= 0.01) { this.ui.toast('The marker is dry.'); return; }
    const hit = this.renderer.raycastWall(this.camera.getPosition(), forwardFromAngles(this.yaw, this.pitch), 3.2);
    if (!hit) { this.ui.toast('Move closer and aim directly at a wall.'); return; }
    this.activeMark = { id: stableId('mark', this.save.characterId, Date.now(), this.save.marks.length), creatorId: this.save.characterId, surfaceId: hit.wall.id, cellId: hit.wall.cellId, shiftEpoch: hit.wall.shiftEpoch, points: [[hit.u, hit.v]], thickness: 1, ink: 'black', scope: this.currentCell.address.zoneId === 'manila' ? 'encounter' : 'personal', faceSign: hit.faceSign, createdAt: Date.now(), revision: 1 };
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
    this.ui.updateWatch({ worldDay, exposureDay }, `LEVEL 0 / ${profile.label}\n${this.currentCell.roomLabel}`, profile.stability); this.ui.updateStatus(this.save.hydration, flashlight?.charge ?? 0); this.ui.updateInventory(this.save.inventory, this.save.selectedItemId);
    const position = this.camera.getPosition(); const drawCalls = this.app?.stats?.drawCalls?.total ?? 'n/a';
    this.ui.updateMetrics([`seed          ${this.save.seed}`, `cell          ${this.currentCell.id} / district ${this.currentCell.address.districtId}`, `room          ${this.currentCell.roomArchetype} / ${this.currentCell.spatialProfile}`, `components    ${this.currentCell.componentIds.join(', ')}`, `zone          ${profile.label}`, `loaded cells  ${this.renderer.loadedCellCount}`, `colliders     ${this.renderer.wallCount}`, `interactions  ${this.renderer.interactionCount}`, `light groups  ${this.renderer.lightGroupCount} / active ${this.lightField.activeGroups} / flicker ${this.lightField.flickerGroups}`, `light energy  ${this.lightField.energy.toFixed(3)}`, `draw calls    ${drawCalls}`, `position      ${position.x.toFixed(1)}, ${position.z.toFixed(1)}`, `look          yaw ${this.yaw.toFixed(1)} / pitch ${this.pitch.toFixed(1)}`, `inventory     ${this.save.inventory.length}/${INVENTORY_CAPACITY}`, `marks         ${this.save.marks.length}`, `notes read    ${this.save.readNoteIds.length}`, `exits found   ${this.save.discoveredExits.join(', ') || 'none'}`].join('\n'));
  }

  private publishDebugState(active: boolean): void {
    (window as unknown as { __NOCLIP_DEBUG__?: unknown }).__NOCLIP_DEBUG__ = {
      started: this.started,
      active,
      paused: this.paused,
      yaw: this.yaw,
      pitch: this.pitch,
      heldKeys: [...this.keys],
      lightField: this.lightField,
      audio: this.ambience.getDebugState(),
      composition: this.currentCell?.compositionSignature,
      version: PROJECT_VERSION
    };
  }

  private async persist(): Promise<void> { if (!this.save || !this.camera) return; const position = this.camera.getPosition(); this.save.position = { x: position.x, y: position.y, z: position.z, yaw: this.yaw, pitch: this.pitch }; this.save.savedAt = Date.now(); await this.store.save(this.save); this.ui.setContinueAvailable(true); }
  private updateTuning(patch: Partial<WorldTuning>): void { this.tuning = { ...this.tuning, ...patch }; if (this.started) this.updateStreaming(true); }
  private simulateStarters(): void { const stats = simulateStarterRolls(this.save?.seed ?? 'threshold-001', 1000); this.ui.updateStarterStats(`1,000 deterministic rolls\nnone  ${stats.none} (${(stats.none / 10).toFixed(1)}%)\none   ${stats.one} (${(stats.one / 10).toFixed(1)}%)\ntwo   ${stats.two} (${(stats.two / 10).toFixed(1)}%)`); }
  private exportTuning(): void { const blob = new Blob([JSON.stringify({ version: 2, tuning: this.tuning }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'project-noclip-world-tuning.json'; anchor.click(); URL.revokeObjectURL(url); }
  private async resetGame(): Promise<void> { await this.store.clear(); window.location.reload(); }
}

function worldToCell(value: number): number { return Math.floor((value + CELL_SIZE / 2) / CELL_SIZE); }
function forwardFromAngles(yaw: number, pitch: number): { x: number; y: number; z: number } {
  const yawRadians = yaw * Math.PI / 180; const pitchRadians = pitch * Math.PI / 180; const cosPitch = Math.cos(pitchRadians);
  return { x: -Math.sin(yawRadians) * cosPitch, y: Math.sin(pitchRadians), z: -Math.cos(yawRadians) * cosPitch };
}
