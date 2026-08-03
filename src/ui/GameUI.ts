import { ITEM_DEFINITIONS } from '../items/definitions.js';
import type { ItemInstance } from '../items/types.js';
import type { TimelineSnapshot } from '../simulation/timeline.js';
import type { WorldTuning, ZoneId } from '../world/types.js';

export interface UIHandlers {
  onNewGame(seed: string): void;
  onContinue(): void;
  onReset(): void;
  onResume(): void;
  onSelectItem(instanceId: string): void;
  onTuningChange(patch: Partial<WorldTuning>): void;
  onSeedChange(seed: string): void;
  onSimulateStarter(): void;
  onExportTuning(): void;
}

export class GameUI {
  private readonly root: HTMLElement;
  private title!: HTMLElement;
  private continueButton!: HTMLButtonElement;
  private seedInput!: HTMLInputElement;
  private hud!: HTMLElement;
  private watch!: HTMLElement;
  private interaction!: HTMLElement;
  private inventory!: HTMLElement;
  private hydrationFill!: HTMLElement;
  private batteryFill!: HTMLElement;
  private pause!: HTMLElement;
  private lab!: HTMLElement;
  private metrics!: HTMLElement;
  private markerMode!: HTMLElement;
  private toasts!: HTMLElement;
  private starterStats!: HTMLElement;
  private noteOverlay!: HTMLElement;
  private noteTitle!: HTMLElement;
  private noteBody!: HTMLElement;

  constructor(private readonly handlers: UIHandlers) {
    const root = document.querySelector<HTMLElement>('#ui-root');
    if (!root) throw new Error('Missing #ui-root');
    this.root = root;
    this.build();
  }

  private build(): void {
    this.root.innerHTML = `
      <section class="title-screen" data-ui="title">
        <div class="title-card ui-panel">
          <p class="eyebrow">Project Noclip / Level 0 Alpha 0.2</p>
          <h1>NOCLIP</h1>
          <p class="subtitle">An empty place with consistent rules. Objects are scarce. Routes are not.</p>
          <div class="menu-grid">
            <label>World seed<input data-ui="seed" maxlength="48" value="threshold-001" /></label>
            <button class="primary" data-action="new">Begin new local journey</button>
            <button data-action="continue">Continue saved journey</button>
            <small>WASD move · Shift sprint · E interact · F use · G drop · M marker · &#96; World Lab</small>
          </div>
        </div>
      </section>
      <section class="hud" data-ui="hud" hidden>
        <div class="crosshair"></div>
        <div class="interaction" data-ui="interaction"></div>
        <div class="watch" data-ui="watch"></div>
        <div class="status-bars">
          <div class="status-row"><span>Hydration</span><div class="bar"><span data-ui="hydration"></span></div></div>
          <div class="status-row"><span>Charge</span><div class="bar"><span data-ui="battery"></span></div></div>
        </div>
        <div class="inventory" data-ui="inventory"></div>
        <div class="toast-stack" data-ui="toasts"></div>
        <div class="marker-mode" data-ui="marker-mode">MARKER READY — hold primary button while looking at a nearby wall</div>
        <div class="help">E interact · F use · G drop · M marker · &#96; World Lab · Esc pause</div>
      </section>
      <section class="pause" data-ui="pause">
        <div class="pause-card ui-panel">
          <p class="eyebrow">Simulation paused</p><h2>Pointer released</h2>
          <div class="menu-grid"><button class="primary" data-action="resume">Return</button><button class="danger" data-action="reset">Erase local journey</button></div>
        </div>
      </section>
      <section class="note-overlay" data-ui="note" aria-modal="true" role="dialog">
        <article class="note-paper">
          <p class="eyebrow">Recovered document</p>
          <h2 data-ui="note-title"></h2>
          <pre data-ui="note-body"></pre>
          <button class="primary" data-action="close-note">Put it down</button>
        </article>
      </section>
      <aside class="world-lab ui-panel" data-ui="lab">
        <p class="eyebrow">Development authority / local only</p><h2>World Lab</h2>
        <div class="lab-grid">
          <label class="full">Seed<input data-lab="seed" value="threshold-001" /></label>
          <label>Zone<select data-lab="zone"><option value="">Procedural districts</option><option value="baseline">Baseline</option><option value="arch">Arch</option><option value="pillar">Pillar</option><option value="blackout">Blackout</option><option value="holes">Holes</option><option value="manila">Manila</option><option value="exit-threshold">Threshold</option></select></label>
          <label>Active radius<input data-lab="radius" type="number" min="1" max="4" value="3" /></label>
          <label>Room variation<input data-lab="variation" type="number" min=".25" max="2" step=".05" value="1" /></label>
          <label>World Day<input data-lab="world-day" type="number" min="0" max="9999" placeholder="Authority" /></label>
          <label>Exposure<input data-lab="exposure" type="number" min="0" max="999" step=".25" placeholder="Authority" /></label>
          <label>Loot chance<input data-lab="loot" type="number" min="0" max=".5" step=".01" value=".085" /></label>
          <label>Shift chance<input data-lab="shift" type="number" min="0" max="1" step=".01" value=".18" /></label>
          <label class="full"><span><input data-lab="bypass" type="checkbox" /> Bypass timeline gates locally</span></label>
          <button data-action="apply-seed">Regenerate with seed</button>
          <button data-action="simulate">Simulate 1,000 starters</button>
          <button class="full" data-action="export">Export tuning JSON</button>
        </div>
        <pre class="metrics" data-ui="metrics"></pre>
        <pre class="metrics" data-ui="starter-stats">Starter simulation not run.</pre>
      </aside>`;

    this.title = this.required('[data-ui="title"]');
    this.continueButton = this.required<HTMLButtonElement>('[data-action="continue"]');
    this.seedInput = this.required<HTMLInputElement>('[data-ui="seed"]');
    this.hud = this.required('[data-ui="hud"]');
    this.watch = this.required('[data-ui="watch"]');
    this.interaction = this.required('[data-ui="interaction"]');
    this.inventory = this.required('[data-ui="inventory"]');
    this.hydrationFill = this.required('[data-ui="hydration"]');
    this.batteryFill = this.required('[data-ui="battery"]');
    this.pause = this.required('[data-ui="pause"]');
    this.lab = this.required('[data-ui="lab"]');
    this.metrics = this.required('[data-ui="metrics"]');
    this.markerMode = this.required('[data-ui="marker-mode"]');
    this.toasts = this.required('[data-ui="toasts"]');
    this.starterStats = this.required('[data-ui="starter-stats"]');
    this.noteOverlay = this.required('[data-ui="note"]');
    this.noteTitle = this.required('[data-ui="note-title"]');
    this.noteBody = this.required('[data-ui="note-body"]');

    this.required('[data-action="new"]').addEventListener('click', () => this.handlers.onNewGame(this.seedInput.value.trim() || 'threshold-001'));
    this.continueButton.addEventListener('click', () => this.handlers.onContinue());
    this.required('[data-action="resume"]').addEventListener('click', () => this.handlers.onResume());
    this.required('[data-action="reset"]').addEventListener('click', () => this.handlers.onReset());
    this.required('[data-action="close-note"]').addEventListener('click', () => this.hideNote());
    this.required('[data-action="apply-seed"]').addEventListener('click', () => this.handlers.onSeedChange(this.required<HTMLInputElement>('[data-lab="seed"]').value.trim() || 'threshold-001'));
    this.required('[data-action="simulate"]').addEventListener('click', () => this.handlers.onSimulateStarter());
    this.required('[data-action="export"]').addEventListener('click', () => this.handlers.onExportTuning());

    const bindNumber = (selector: string, key: keyof WorldTuning) => this.required<HTMLInputElement>(selector).addEventListener('change', (event) => this.handlers.onTuningChange({ [key]: Number((event.target as HTMLInputElement).value) }));
    bindNumber('[data-lab="radius"]', 'activeRadius');
    bindNumber('[data-lab="variation"]', 'roomVariation');
    bindNumber('[data-lab="loot"]', 'lootChance');
    bindNumber('[data-lab="shift"]', 'shiftChance');
    this.required<HTMLSelectElement>('[data-lab="zone"]').addEventListener('change', (event) => {
      const value = (event.target as HTMLSelectElement).value;
      this.handlers.onTuningChange({ zoneOverride: value ? value as ZoneId : undefined });
    });
    this.required<HTMLInputElement>('[data-lab="world-day"]').addEventListener('change', (event) => {
      const value = (event.target as HTMLInputElement).value;
      this.handlers.onTuningChange({ worldDayOverride: value === '' ? undefined : Number(value) });
    });
    this.required<HTMLInputElement>('[data-lab="exposure"]').addEventListener('change', (event) => {
      const value = (event.target as HTMLInputElement).value;
      this.handlers.onTuningChange({ exposureOverride: value === '' ? undefined : Number(value) });
    });
    this.required<HTMLInputElement>('[data-lab="bypass"]').addEventListener('change', (event) => this.handlers.onTuningChange({ gateBypass: (event.target as HTMLInputElement).checked }));
  }

  private required<T extends Element = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing UI element: ${selector}`);
    return element;
  }

  setContinueAvailable(available: boolean): void { this.continueButton.disabled = !available; }
  showGame(): void { this.title.hidden = true; this.hud.hidden = false; }
  setPaused(paused: boolean): void { this.pause.classList.toggle('visible', paused); }
  toggleLab(): void { this.lab.classList.toggle('visible'); }
  isLabOpen(): boolean { return this.lab.classList.contains('visible'); }
  isNoteOpen(): boolean { return this.noteOverlay.classList.contains('visible'); }
  setMarkerMode(active: boolean): void { this.markerMode.classList.toggle('visible', active); }

  showNote(title: string, body: string): void {
    this.noteTitle.textContent = title.slice(0, 120);
    this.noteBody.textContent = body.slice(0, 4000);
    this.noteOverlay.classList.add('visible');
    document.exitPointerLock();
  }

  hideNote(): void { this.noteOverlay.classList.remove('visible'); }

  setInteraction(text?: string): void {
    this.interaction.textContent = text ?? '';
    this.interaction.classList.toggle('visible', Boolean(text));
  }

  updateWatch(snapshot: TimelineSnapshot, location: string, stability: string): void {
    this.watch.textContent = `PROJECT NOCLIP\nWORLD AGE: DAY ${String(snapshot.worldDay).padStart(4, '0')}\nEXPOSURE: DAY ${snapshot.exposureDay.toFixed(2).padStart(7, '0')}\nLOCATION: ${location}\nSTABILITY: ${stability.toUpperCase()}`;
  }

  updateStatus(hydration: number, battery: number): void {
    this.hydrationFill.style.width = `${Math.max(0, Math.min(1, hydration)) * 100}%`;
    this.batteryFill.style.width = `${Math.max(0, Math.min(1, battery)) * 100}%`;
  }

  updateInventory(items: readonly ItemInstance[], selectedItemId?: string): void {
    this.inventory.innerHTML = '';
    for (let index = 0; index < 6; index += 1) {
      const item = items[index];
      const button = document.createElement('button');
      button.className = `slot${item?.instanceId === selectedItemId ? ' selected' : ''}${item ? '' : ' empty'}`;
      if (item) {
        const definition = ITEM_DEFINITIONS[item.definitionId];
        const state = item.charge === undefined ? `Condition ${Math.round(item.condition * 100)}%` : `Charge ${Math.round(item.charge * 100)}%`;
        button.innerHTML = `<strong>${index + 1}. ${definition.name}</strong><small>${state}</small>`;
        button.title = definition.description;
        button.addEventListener('click', () => this.handlers.onSelectItem(item.instanceId));
      } else button.textContent = `${index + 1}. Empty`;
      this.inventory.appendChild(button);
    }
  }

  updateMetrics(text: string): void { this.metrics.textContent = text; }
  updateStarterStats(text: string): void { this.starterStats.textContent = text; }

  toast(message: string, duration = 3200): void {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.toasts.appendChild(toast);
    window.setTimeout(() => toast.remove(), duration);
  }
}
