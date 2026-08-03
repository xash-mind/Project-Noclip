import * as pc from 'playcanvas';
import { ProceduralAmbience } from '../audio/Ambience.js';
import { addToInventory, INVENTORY_CAPACITY, removeFromInventory, updateInventoryItem } from '../inventory/inventory.js';
import { ITEM_DEFINITIONS } from '../items/definitions.js';
import { createItemInstance, transferItem } from '../items/factory.js';
import { rollStarterDefinitions, simulateStarterRolls } from '../items/starterRoll.js';
import type { ItemInstance } from '../items/types.js';
import { IndexedDbSaveStore } from '../persistence/store.js';
import type { SaveData, SurfaceMark } from '../persistence/types.js';
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
  private keys = new Set<string>();
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
  private lastPosition = { x: 0, z: 0 };

  constructor() {
    const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
    if (!canvas) throw new Error('Missing #game-canvas');
    this.canvas = canvas;
    this.ui = new GameUI({
      onNewGame: (seed) => void this.startNew(seed),
      onContinue: () => void this.continueGame(),
      onReset: () => void this.resetGame(),
      onResume: () => this.requestPointerLock(),
      onSelectItem: (id) => this.selectItem(id),
      onTuningChange: (patch) => this.updateTuning(patch),
      onSeedChange: (seed) => void this.startNew(seed),
      onSimulateStarter: () => this.simulateStarters(),
      onExportTuning: () => this.exportTuning()
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
    const starterDefinitions = rollStarterDefinitions(characterId);
    const inventory = starterDefinitions.map((definitionId, index) => createItemInstance(
      definitionId,
      `starter:${characterId}:${index}`,
      'starter',
      { type: 'character', id: characterId },
      createdAt
    ));
    const save: SaveData = {
      version: 1,
      characterId,
      seed,
      createdAt,
      starterRolled: true,
      position: { x: 0, y: PLAYER_HEIGHT, z: 0, yaw: 0, pitch: 0 },
      inventory,
      selectedItemId: inventory[0]?.instanceId,
      droppedItems: [],
      pickedLootNodeIds: [],
      marks: [],
      hydration: 0.76,
      exposure: structuredClone(EMPTY_EXPOSURE),
      shiftEpochs: {},
      unloadCounts: {},
      discoveredExits: [],
      settings: { sensitivity: 0.095, reducedMotion: false, reducedFlicker: false, masterVolume: 0.68 },
      savedAt: createdAt
    };
    await this.store.save(save);
    await this.launch(save);
    const message = inventory.length === 0
      ? 'You arrived with nothing.'
      : `You arrived with ${inventory.map((item) => ITEM_DEFINITIONS[item.definitionId].name).join(' and ')}.`;
    this.ui.toast(message, 5000);
  }

  private async continueGame(): Promise<void> {
    const save = await this.store.load();
    if (!save) {
      this.ui.toast('No readable local journey was found.');
      this.ui.setContinueAvailable(false);
      return;
    }
    await this.launch(save);
  }

  private async launch(save: SaveData): Promise<void> {
    this.save = save;
    this.yaw = save.position.yaw;
    this.pitch = save.position.pitch;
    this.tuning = { ...DEFAULT_TUNING };
    this.markerMode = false;
    this.ui.setMarkerMode(false);
    this.setupEngine();
    if (!this.app || !this.camera) throw new Error('Engine did not initialize');
    this.renderer = new WorldRenderer(this.app, save);
    this.camera.setPosition(save.position.x, save.position.y, save.position.z);
    this.lastPosition = { x: save.position.x, z: save.position.z };
    this.currentCellX = worldToCell(save.position.x);
    this.currentCellZ = worldToCell(save.position.z);
    this.updateStreaming(true);
    this.updateCameraRotation();
    this.started = true;
    this.paused = true;
    this.ui.showGame();
    this.ui.updateInventory(save.inventory, save.selectedItemId);
    this.ui.setPaused(true);
    await this.ambience.start(save.settings.masterVolume);
    this.requestPointerLock();
  }

  private setupEngine(): void {
    if (this.app) {
      for (const id of [...(this.renderer?.loaded.keys() ?? [])]) this.renderer?.unloadCell(id);
      return;
    }
    const app = new pc.Application(this.canvas);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.scene.ambientLight = new pc.Color(0.46, 0.43, 0.27);
    app.scene.skyboxIntensity = 0;

    const camera = new pc.Entity('player-camera');
    camera.addComponent('camera', {
      clearColor: new pc.Color(0.075, 0.068, 0.038),
      nearClip: 0.05,
      farClip: 105,
      fov: 73
    });
    app.root.addChild(camera);

    const localLight = new pc.Entity('local-fluorescent-light');
    localLight.addComponent('light', { type: 'omni', color: new pc.Color(0.78, 0.75, 0.5), range: 16, intensity: 0.82, castShadows: false });
    app.root.addChild(localLight);

    const flashlight = new pc.Entity('flashlight');
    flashlight.addComponent('light', { type: 'omni', color: new pc.Color(0.93, 0.91, 0.72), range: 13, intensity: 1.25, castShadows: false });
    camera.addChild(flashlight);
    flashlight.setLocalPosition(0, -0.08, -2.5);
    flashlight.enabled = false;

    this.app = app;
    this.camera = camera;
    this.localLight = localLight;
    this.flashlight = flashlight;
    app.on('update', (dt) => this.update(Math.min(dt, 0.05)));
    app.start();
    window.addEventListener('resize', () => app.resizeCanvas());
  }

  private installInput(): void {
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Backquote') {
        event.preventDefault();
        this.ui.toggleLab();
        if (this.ui.isLabOpen()) document.exitPointerLock();
        return;
      }
      if (!this.started) return;
      if (event.code === 'KeyE') this.interact();
      else if (event.code === 'KeyF') this.useSelectedItem();
      else if (event.code === 'KeyG') this.dropSelectedItem();
      else if (event.code === 'KeyM') this.toggleMarkerMode();
      else if (/^Digit[1-6]$/.test(event.code)) {
        const index = Number(event.code.slice(-1)) - 1;
        const item = this.save?.inventory[index];
        if (item) this.selectItem(item.instanceId);
      }
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('mousemove', (event) => {
      if (document.pointerLockElement !== this.canvas || this.paused || this.ui.isLabOpen()) return;
      const sensitivity = this.save?.settings.sensitivity ?? 0.095;
      this.yaw -= event.movementX * sensitivity;
      this.pitch = Math.max(-84, Math.min(84, this.pitch - event.movementY * sensitivity));
      this.updateCameraRotation();
      if (this.drawing) this.sampleMark();
    });
    window.addEventListener('mousedown', (event) => {
      if (event.button === 0 && this.markerMode && document.pointerLockElement === this.canvas) this.beginMark();
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0 && this.drawing) this.finishMark();
    });
    document.addEventListener('pointerlockchange', () => {
      if (!this.started) return;
      this.paused = document.pointerLockElement !== this.canvas;
      this.ui.setPaused(this.paused && !this.ui.isLabOpen());
      if (this.paused) this.keys.clear();
    });
    this.canvas.addEventListener('click', () => {
      if (this.started && !this.ui.isLabOpen() && document.pointerLockElement !== this.canvas) this.requestPointerLock();
    });
  }

  private requestPointerLock(): void {
    if (!this.started || this.ui.isLabOpen()) return;
    void this.canvas.requestPointerLock();
  }

  private update(dt: number): void {
    if (!this.started || !this.save || !this.camera || !this.renderer) return;
    if (!this.paused && !this.ui.isLabOpen()) this.updateMovement(dt);
    this.updateSimulation(dt);
    this.updateInteraction();
    this.saveAccumulator += dt;
    this.metricsAccumulator += dt;
    if (this.saveAccumulator >= SAVE_INTERVAL) {
      this.saveAccumulator = 0;
      void this.persist();
    }
    if (this.metricsAccumulator >= 0.25) {
      this.metricsAccumulator = 0;
      this.updateUI();
    }
  }

  private updateMovement(dt: number): void {
    if (!this.camera || !this.renderer || !this.save) return;
    const forwardInput = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const strafeInput = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    if (forwardInput === 0 && strafeInput === 0) return;
    const crouching = this.keys.has('ControlLeft') || this.keys.has('KeyC');
    const sprinting = this.keys.has('ShiftLeft') && !crouching;
    const speed = crouching ? CROUCH_SPEED : sprinting ? SPRINT_SPEED : WALK_SPEED;
    const length = Math.max(1, Math.hypot(forwardInput, strafeInput));
    const forward = forwardInput / length;
    const strafe = strafeInput / length;
    const radians = this.yaw * Math.PI / 180;
    const fx = -Math.sin(radians);
    const fz = -Math.cos(radians);
    const rx = Math.cos(radians);
    const rz = -Math.sin(radians);
    const current = this.camera.getPosition();
    const nextX = current.x + (fx * forward + rx * strafe) * speed * dt;
    const nextZ = current.z + (fz * forward + rz * strafe) * speed * dt;
    const [x, z] = this.renderer.resolveMovement(current.x, current.z, nextX, nextZ);
    const targetHeight = crouching ? 1.12 : PLAYER_HEIGHT;
    this.camera.setPosition(x, targetHeight, z);
    this.localLight?.setPosition(x, 2.6, z);
    this.ambience.step(speed / WALK_SPEED);

    const nextCellX = worldToCell(x);
    const nextCellZ = worldToCell(z);
    if (nextCellX !== this.currentCellX || nextCellZ !== this.currentCellZ) {
      const edge = canonicalEdgeId(this.currentCellX, this.currentCellZ, nextCellX, nextCellZ);
      this.save.exposure = recordTraversal(this.save.exposure, edge, 140);
      this.currentCellX = nextCellX;
      this.currentCellZ = nextCellZ;
      this.updateStreaming();
    }
    this.lastPosition = { x, z };
  }

  private updateSimulation(dt: number): void {
    if (!this.save || !this.currentCell) return;
    this.save.hydration = Math.max(0, this.save.hydration - dt / 2400);
    if (this.currentCell.stability === 'stable' || this.currentCell.stability === 'rendezvous') this.save.exposure = addStableTime(this.save.exposure, dt);

    const flashlightItem = this.getFlashlight();
    if (this.flashlight?.enabled && flashlightItem?.charge !== undefined) {
      const drain = dt / 660;
      const updated = { ...flashlightItem, charge: Math.max(0, flashlightItem.charge - drain), revision: flashlightItem.revision + 1 };
      this.save.inventory = updateInventoryItem(this.save.inventory, updated);
      if (updated.charge <= 0) {
        this.flashlight.enabled = false;
        this.ui.toast('The flashlight dies without ceremony.');
      } else if (!this.save.settings.reducedFlicker && updated.charge < 0.12) {
        this.flashlight.enabled = unitFloat(`${updated.instanceId}:${Math.floor(performance.now() / 120)}`) > 0.2;
      }
    }

    this.hallucinationCooldown -= dt;
    if (this.hallucinationCooldown <= 0 && this.currentCell.hallucinationAnchor) {
      this.hallucinationCooldown = 24 + unitFloat(`${this.save.seed}:hallucination-time:${this.currentCell.id}:${this.save.savedAt}`) * 35;
      this.ambience.distantImpact();
      this.ui.toast('Something shifts beyond the next opening.', 2400);
    }
  }

  private updateStreaming(force = false): void {
    if (!this.save || !this.renderer) return;
    const exposure = this.tuning.exposureOverride ?? calculateExposureDay(this.save.exposure);
    const worldDay = this.tuning.worldDayOverride ?? calculateWorldDay(Date.now());
    const desired = new Set<string>();
    const radius = Math.max(1, Math.min(4, Math.round(this.tuning.activeRadius)));
    for (let x = this.currentCellX - radius; x <= this.currentCellX + radius; x += 1) {
      for (let z = this.currentCellZ - radius; z <= this.currentCellZ + radius; z += 1) {
        const id = `${x}:${z}`;
        desired.add(id);
        const descriptor = generateCell({
          seed: this.save.seed,
          x,
          z,
          worldDay,
          exposure,
          shiftEpoch: this.save.shiftEpochs[id] ?? 0,
          tuning: this.tuning
        });
        const existing = this.renderer.loaded.get(id)?.descriptor;
        if (!existing) this.renderer.loadCell(descriptor);
        else if (force || existing.address.shiftEpoch !== descriptor.address.shiftEpoch || existing.address.zoneId !== descriptor.address.zoneId) this.renderer.refreshCell(descriptor);
        if (x === this.currentCellX && z === this.currentCellZ) this.currentCell = descriptor;
      }
    }

    for (const [id, visual] of [...this.renderer.loaded.entries()]) {
      if (desired.has(id)) continue;
      const distance = Math.max(Math.abs(visual.descriptor.address.cellX - this.currentCellX), Math.abs(visual.descriptor.address.cellZ - this.currentCellZ));
      const unloadCount = (this.save.unloadCounts[id] ?? 0) + 1;
      this.save.unloadCounts[id] = unloadCount;
      if (canShift({ occupied: false, observed: false, distanceInCells: distance, stability: visual.descriptor.stability, protectedInteraction: false, preservesPath: true })
        && shouldShift(this.save.seed, id, unloadCount, this.tuning.shiftChance)) {
        this.save.shiftEpochs[id] = (this.save.shiftEpochs[id] ?? 0) + 1;
      }
      this.renderer.unloadCell(id);
    }
    this.updateZoneAtmosphere();
  }

  private updateZoneAtmosphere(): void {
    if (!this.app || !this.currentCell) return;
    const profile = ZONE_PROFILES[this.currentCell.address.zoneId];
    this.app.scene.ambientLight = new pc.Color(
      0.44 * profile.lightMultiplier,
      0.42 * profile.lightMultiplier,
      0.25 * profile.lightMultiplier
    );
    if (this.localLight?.light) this.localLight.light.intensity = this.currentCell.lightFailure ? 0.12 : 0.82 * profile.lightMultiplier;
    this.ambience.setZone(this.currentCell.address.zoneId === 'blackout', this.currentCell.lightFailure);
  }

  private updateInteraction(): void {
    if (!this.camera || !this.renderer) return;
    const position = this.camera.getPosition();
    const forward = forwardFromAngles(this.yaw, this.pitch);
    this.interaction = this.renderer.closestInteraction(position.x, position.y, position.z, forward.x, forward.z);
    if (!this.interaction) this.ui.setInteraction();
    else if (this.interaction.kind === 'item') this.ui.setInteraction(`[E] Pick up ${ITEM_DEFINITIONS[this.interaction.item.definitionId].name}`);
    else if (this.interaction.kind === 'exit') this.ui.setInteraction(this.interaction.enabled ? `[E] Approach ${this.interaction.label}` : `${this.interaction.label} — timeline unresolved`);
    else this.ui.setInteraction('[E] Wait in the Manila Room');
  }

  private interact(): void {
    if (!this.save || !this.renderer || !this.interaction) return;
    if (this.interaction.kind === 'item') this.pickupItem(this.interaction);
    else if (this.interaction.kind === 'exit') {
      if (!this.interaction.enabled) {
        this.ui.toast('The threshold does not accept this version of you.');
        return;
      }
      if (!this.save.discoveredExits.includes(this.interaction.destinationId)) this.save.discoveredExits.push(this.interaction.destinationId);
      this.save.pendingTransition = { destinationId: this.interaction.destinationId, exitId: this.interaction.id, discoveredAt: Date.now() };
      this.ui.toast(`Transition recorded: ${this.interaction.destinationId}. The destination capsule is not built yet.`, 5200);
      void this.persist();
    } else {
      this.ui.toast('You wait. Here, the seconds behave normally.', 4200);
    }
  }

  private pickupItem(visual: WorldItemVisual): void {
    if (!this.save || !this.renderer) return;
    if (this.save.inventory.length >= INVENTORY_CAPACITY) {
      this.ui.toast('Your inventory is full. Leave something behind.');
      return;
    }
    try {
      this.save.inventory = addToInventory(this.save.inventory, visual.item, this.save.characterId);
      if (visual.lootNodeId) this.save.pickedLootNodeIds.push(visual.lootNodeId);
      this.save.droppedItems = this.save.droppedItems.filter((drop) => drop.item.instanceId !== visual.item.instanceId);
      this.renderer.removeInteraction(visual.id);
      this.save.selectedItemId ??= visual.item.instanceId;
      this.ui.toast(`Found: ${ITEM_DEFINITIONS[visual.item.definitionId].name}`);
      this.ui.updateInventory(this.save.inventory, this.save.selectedItemId);
      void this.persist();
    } catch (error) {
      this.ui.toast(error instanceof Error ? error.message : 'Could not pick up item');
    }
  }

  private selectItem(instanceId: string): void {
    if (!this.save?.inventory.some((item) => item.instanceId === instanceId)) return;
    this.save.selectedItemId = instanceId;
    this.ui.updateInventory(this.save.inventory, instanceId);
  }

  private useSelectedItem(): void {
    if (!this.save) return;
    const item = this.save.inventory.find((candidate) => candidate.instanceId === this.save?.selectedItemId);
    if (!item) {
      this.ui.toast('Nothing is selected.');
      return;
    }
    const definition = ITEM_DEFINITIONS[item.definitionId];
    switch (item.definitionId) {
      case 'flashlight': {
        if ((item.charge ?? 0) <= 0) this.ui.toast('The flashlight has no charge.');
        else if (this.flashlight) {
          this.flashlight.enabled = !this.flashlight.enabled;
          this.ui.toast(this.flashlight.enabled ? 'Flashlight on.' : 'Flashlight off.');
        }
        break;
      }
      case 'battery': this.useBattery(item); break;
      case 'almond-water': {
        this.save.hydration = Math.min(1, this.save.hydration + 0.38 * item.condition);
        this.consumeItem(item.instanceId);
        this.ui.toast('The sweetness cuts through the fluorescent headache.');
        break;
      }
      case 'marker': this.toggleMarkerMode(); break;
      case 'glow-stick': {
        const activated = { ...item, charge: 0.92, revision: item.revision + 1 };
        this.dropItemInstance(activated, 1.1);
        this.ui.toast('The chemical light wakes with a dull snap.');
        break;
      }
      case 'empty-can': this.dropItemInstance(item, 2.2); break;
      case 'string-spool': {
        const charge = Math.max(0, (item.charge ?? 1) - 0.08);
        this.save.inventory = updateInventoryItem(this.save.inventory, { ...item, charge, revision: item.revision + 1 });
        this.ui.toast('A short length of string is fixed behind you. The world makes no promise to preserve it.');
        break;
      }
      case 'paper-note': this.ui.toast('Note writing is data-ready; the safe text editor is scheduled for the next iteration.'); break;
      case 'pry-tool': this.ui.toast(this.interaction?.kind === 'exit' ? 'The tool finds a seam, but the destination is still sealed.' : 'There is nothing nearby that yields to it.'); break;
      default: this.ui.toast(`${definition.name} has no current use.`);
    }
    this.ui.updateInventory(this.save.inventory, this.save.selectedItemId);
    void this.persist();
  }

  private useBattery(battery: ItemInstance): void {
    if (!this.save) return;
    const flashlight = this.getFlashlight();
    if (!flashlight) {
      this.ui.toast('A battery without a flashlight is only potential.');
      return;
    }
    const energy = (battery.charge ?? 0.5) * battery.condition;
    const updated = { ...flashlight, charge: Math.min(1, (flashlight.charge ?? 0) + energy * 0.78), revision: flashlight.revision + 1 };
    this.save.inventory = updateInventoryItem(this.save.inventory, updated).filter((item) => item.instanceId !== battery.instanceId);
    if (this.save.selectedItemId === battery.instanceId) this.save.selectedItemId = updated.instanceId;
    this.ui.toast('The flashlight accepts most of the remaining charge.');
  }

  private consumeItem(instanceId: string): void {
    if (!this.save) return;
    this.save.inventory = this.save.inventory.filter((item) => item.instanceId !== instanceId);
    if (this.save.selectedItemId === instanceId) this.save.selectedItemId = this.save.inventory[0]?.instanceId;
  }

  private dropSelectedItem(): void {
    if (!this.save) return;
    const item = this.save.inventory.find((candidate) => candidate.instanceId === this.save?.selectedItemId);
    if (!item) return;
    this.dropItemInstance(item, 1.1);
  }

  private dropItemInstance(item: ItemInstance, distance: number): void {
    if (!this.save || !this.camera || !this.renderer || !this.currentCell) return;
    const removal = removeFromInventory(this.save.inventory, item.instanceId);
    this.save.inventory = removal.remaining;
    const position = this.camera.getPosition();
    const forward = forwardFromAngles(this.yaw, 0);
    const x = position.x + forward.x * distance;
    const z = position.z + forward.z * distance;
    const dropped = transferItem(item, { type: 'world', addressId: this.currentCell.id });
    this.save.droppedItems.push({ item: dropped, x, y: 0.28, z });
    this.renderer.addDroppedItem(dropped, x, 0.28, z);
    if (this.save.selectedItemId === item.instanceId) this.save.selectedItemId = this.save.inventory[0]?.instanceId;
    this.ui.updateInventory(this.save.inventory, this.save.selectedItemId);
    this.ui.toast(`Left behind: ${ITEM_DEFINITIONS[item.definitionId].name}`);
    void this.persist();
  }

  private toggleMarkerMode(): void {
    if (!this.save) return;
    const item = this.save.inventory.find((candidate) => candidate.instanceId === this.save?.selectedItemId);
    if (item?.definitionId !== 'marker') {
      const marker = this.save.inventory.find((candidate) => candidate.definitionId === 'marker');
      if (!marker) {
        this.ui.toast('You do not have a marker.');
        return;
      }
      this.save.selectedItemId = marker.instanceId;
    }
    this.markerMode = !this.markerMode;
    this.ui.setMarkerMode(this.markerMode);
    this.ui.updateInventory(this.save.inventory, this.save.selectedItemId);
  }

  private beginMark(): void {
    if (!this.save || !this.renderer || !this.camera || this.save.marks.filter((mark) => mark.cellId === this.currentCell?.id).length >= 6) {
      this.ui.toast('This cell has reached your local mark limit.');
      return;
    }
    const marker = this.save.inventory.find((item) => item.instanceId === this.save?.selectedItemId && item.definitionId === 'marker');
    if (!marker || (marker.charge ?? 0) <= 0.01) {
      this.ui.toast('The marker is dry.');
      return;
    }
    const origin = this.camera.getPosition();
    const direction = forwardFromAngles(this.yaw, this.pitch);
    const hit = this.renderer.raycastWall(origin, direction, 3.2);
    if (!hit || !this.currentCell) return;
    this.activeMark = {
      id: stableId('mark', this.save.characterId, Date.now(), this.save.marks.length),
      creatorId: this.save.characterId,
      surfaceId: hit.wall.id,
      cellId: hit.wall.cellId,
      shiftEpoch: hit.wall.shiftEpoch,
      points: [[hit.u, hit.v]],
      thickness: 1,
      ink: 'black',
      scope: this.currentCell.address.zoneId === 'manila' ? 'encounter' : 'personal',
      createdAt: Date.now(),
      revision: 1
    };
    this.drawing = true;
    this.markedPointCount = 1;
    this.renderer.addMarkVisual({ ...this.activeMark, id: `${this.activeMark.id}:0` });
  }

  private sampleMark(): void {
    if (!this.activeMark || !this.camera || !this.renderer || !this.save || this.markedPointCount >= 256) return;
    const origin = this.camera.getPosition();
    const direction = forwardFromAngles(this.yaw, this.pitch);
    const hit = this.renderer.raycastWall(origin, direction, 3.2);
    if (!hit || hit.wall.id !== this.activeMark.surfaceId) return;
    const previous = this.activeMark.points[this.activeMark.points.length - 1];
    if (previous && Math.hypot(hit.u - previous[0], hit.v - previous[1]) < 0.008) return;
    this.activeMark.points.push([hit.u, hit.v]);
    this.markedPointCount += 1;
    this.renderer.addMarkVisual({ ...this.activeMark, id: `${this.activeMark.id}:${this.markedPointCount}`, points: [[hit.u, hit.v]] });
  }

  private finishMark(): void {
    if (!this.activeMark || !this.save) return;
    if (this.activeMark.points.length >= 2) {
      this.save.marks.push(this.activeMark);
      const marker = this.save.inventory.find((item) => item.instanceId === this.save?.selectedItemId && item.definitionId === 'marker');
      if (marker) {
        const updated = { ...marker, charge: Math.max(0, (marker.charge ?? 0.5) - this.activeMark.points.length / 1800), revision: marker.revision + 1 };
        this.save.inventory = updateInventoryItem(this.save.inventory, updated);
      }
      this.ui.toast('The mark holds—for now.');
      void this.persist();
    }
    this.activeMark = undefined;
    this.drawing = false;
  }

  private getFlashlight(): ItemInstance | undefined {
    return this.save?.inventory.find((item) => item.definitionId === 'flashlight');
  }

  private updateCameraRotation(): void {
    this.camera?.setEulerAngles(this.pitch, this.yaw, 0);
  }

  private updateUI(): void {
    if (!this.save || !this.renderer || !this.currentCell || !this.camera) return;
    const worldDay = this.tuning.worldDayOverride ?? calculateWorldDay(Date.now());
    const exposureDay = this.tuning.exposureOverride ?? calculateExposureDay(this.save.exposure);
    const profile = ZONE_PROFILES[this.currentCell.address.zoneId];
    const flashlight = this.getFlashlight();
    this.ui.updateWatch({ worldDay, exposureDay }, `LEVEL 0 / ${profile.label}`, profile.stability);
    this.ui.updateStatus(this.save.hydration, flashlight?.charge ?? 0);
    this.ui.updateInventory(this.save.inventory, this.save.selectedItemId);
    const position = this.camera.getPosition();
    const drawCalls = this.app?.stats?.drawCalls?.total ?? 'n/a';
    this.ui.updateMetrics([
      `seed          ${this.save.seed}`,
      `cell          ${this.currentCell.id} / shift ${this.currentCell.address.shiftEpoch}`,
      `zone          ${profile.label}`,
      `loaded cells  ${this.renderer.loadedCellCount}`,
      `walls         ${this.renderer.wallCount}`,
      `interactions  ${this.renderer.interactionCount}`,
      `draw calls    ${drawCalls}`,
      `position      ${position.x.toFixed(1)}, ${position.z.toFixed(1)}`,
      `inventory     ${this.save.inventory.length}/${INVENTORY_CAPACITY}`,
      `marks         ${this.save.marks.length}`,
      `exits found   ${this.save.discoveredExits.join(', ') || 'none'}`
    ].join('\n'));
  }

  private async persist(): Promise<void> {
    if (!this.save || !this.camera) return;
    const position = this.camera.getPosition();
    this.save.position = { x: position.x, y: position.y, z: position.z, yaw: this.yaw, pitch: this.pitch };
    this.save.savedAt = Date.now();
    await this.store.save(this.save);
    this.ui.setContinueAvailable(true);
  }

  private updateTuning(patch: Partial<WorldTuning>): void {
    this.tuning = { ...this.tuning, ...patch };
    if (this.started) this.updateStreaming(true);
  }

  private simulateStarters(): void {
    const stats = simulateStarterRolls(this.save?.seed ?? 'threshold-001', 1000);
    this.ui.updateStarterStats(`1,000 deterministic rolls\nnone  ${stats.none} (${(stats.none / 10).toFixed(1)}%)\none   ${stats.one} (${(stats.one / 10).toFixed(1)}%)\ntwo   ${stats.two} (${(stats.two / 10).toFixed(1)}%)`);
  }

  private exportTuning(): void {
    const blob = new Blob([JSON.stringify({ version: 1, tuning: this.tuning }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'project-noclip-world-tuning.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private async resetGame(): Promise<void> {
    await this.store.clear();
    window.location.reload();
  }
}

function worldToCell(value: number): number {
  return Math.floor((value + CELL_SIZE / 2) / CELL_SIZE);
}

function forwardFromAngles(yaw: number, pitch: number): { x: number; y: number; z: number } {
  const yawRadians = yaw * Math.PI / 180;
  const pitchRadians = pitch * Math.PI / 180;
  const cosPitch = Math.cos(pitchRadians);
  return {
    x: -Math.sin(yawRadians) * cosPitch,
    y: Math.sin(pitchRadians),
    z: -Math.cos(yawRadians) * cosPitch
  };
}
