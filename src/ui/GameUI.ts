import './mobile-controls.css';
import { ITEM_DEFINITIONS } from '../items/definitions.js';
import type { ItemInstance } from '../items/types.js';
import { clearObjectCatalogShowcase, filterObjectCatalog, OBJECT_CATALOG, OBJECT_CATALOG_CATEGORIES, spawnObjectCatalogEntries } from '../renderer/objectCatalog.js';
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
  onTouchMove(forward: number, strafe: number): void;
  onTouchLook(deltaX: number, deltaY: number): void;
  onTouchInteract(): void;
  onTouchUse(): void;
}

export class GameUI {
  private readonly root: HTMLElement;
  private readonly touchCapable: boolean;
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
  private objectSearch!: HTMLInputElement;
  private objectCategory!: HTMLSelectElement;
  private objectSelect!: HTMLSelectElement;
  private catalogStatus!: HTMLElement;

  constructor(private readonly handlers: UIHandlers) {
    const root = document.querySelector<HTMLElement>('#ui-root');
    if (!root) throw new Error('Missing #ui-root');
    this.root = root;
    this.touchCapable = navigator.maxTouchPoints > 0 && (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches);
    this.root.classList.toggle('touch-capable', this.touchCapable);
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
            <small class="desktop-help">WASD move · Shift sprint · E interact · F use · G drop · M marker · &#96; World Lab</small>
            <small class="touch-help">Landscape touch: left pad move · drag right side look · Interact / Use</small>
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
        <div class="touch-controls" data-ui="touch-controls" aria-label="Touch gameplay controls">
          <div class="touch-move" data-touch="move" aria-label="Movement control"><div class="touch-stick" data-touch="stick"></div><span>Move</span></div>
          <div class="touch-look" data-touch="look" aria-label="Camera look area"><span>Look</span></div>
          <div class="touch-actions">
            <button class="touch-action" data-action="touch-interact" aria-label="Interact">Interact</button>
            <button class="touch-action" data-action="touch-use" aria-label="Use selected item">Use</button>
          </div>
        </div>
        <div class="touch-orientation" data-ui="touch-orientation" role="status" aria-live="polite">
          <div class="touch-orientation-card"><strong>Rotate to landscape</strong><span>Basic touch play is currently designed for a wide screen.</span></div>
        </div>
      </section>
      <section class="pause" data-ui="pause">
        <div class="pause-card ui-panel">
          <p class="eyebrow">Simulation paused</p><h2><span class="desktop-pause-label">Pointer released</span><span class="touch-pause-label">Journey paused</span></h2>
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
        <section class="lab-section">
          <h3>World controls</h3>
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
        </section>
        <section class="lab-section object-catalog">
          <div class="lab-section-heading"><h3>Object showcase</h3><span>${OBJECT_CATALOG.length} registered</span></div>
          <p class="lab-copy">Disposable local models for visual QA. Spawning here never changes the journey save or canonical world generation.</p>
          <div class="catalog-controls">
            <label>Search<input type="search" data-lab="object-search" placeholder="flashlight, chair, pipe…" autocomplete="off" /></label>
            <label>Category<select data-lab="object-category"><option value="">All categories</option></select></label>
            <label class="full">Object<select data-lab="object-select"></select></label>
          </div>
          <div class="catalog-actions">
            <button data-action="spawn-selected-object">Spawn selected</button>
            <button data-action="spawn-filtered-objects">Spawn filtered</button>
            <button data-action="spawn-all-objects">Spawn all</button>
            <button class="danger" data-action="clear-lab-objects">Clear showcase</button>
          </div>
          <p class="catalog-status" data-ui="catalog-status" aria-live="polite">No showcase objects spawned.</p>
        </section>
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
    this.objectSearch = this.required<HTMLInputElement>('[data-lab="object-search"]');
    this.objectCategory = this.required<HTMLSelectElement>('[data-lab="object-category"]');
    this.objectSelect = this.required<HTMLSelectElement>('[data-lab="object-select"]');
    this.catalogStatus = this.required('[data-ui="catalog-status"]');

    for (const category of OBJECT_CATALOG_CATEGORIES) {
      const option = document.createElement('option'); option.value = category.id; option.textContent = category.label; this.objectCategory.appendChild(option);
    }
    this.refreshCatalogOptions();

    this.required('[data-action="new"]').addEventListener('click', () => this.handlers.onNewGame(this.seedInput.value.trim() || 'threshold-001'));
    this.continueButton.addEventListener('click', () => this.handlers.onContinue());
    this.required('[data-action="resume"]').addEventListener('click', () => this.handlers.onResume());
    this.required('[data-action="reset"]').addEventListener('click', () => this.handlers.onReset());
    this.required('[data-action="close-note"]').addEventListener('click', () => this.hideNote());
    this.required('[data-action="touch-interact"]').addEventListener('click', () => this.handlers.onTouchInteract());
    this.required('[data-action="touch-use"]').addEventListener('click', () => this.handlers.onTouchUse());
    this.required('[data-action="apply-seed"]').addEventListener('click', () => this.handlers.onSeedChange(this.required<HTMLInputElement>('[data-lab="seed"]').value.trim() || 'threshold-001'));
    this.required('[data-action="simulate"]').addEventListener('click', () => this.handlers.onSimulateStarter());
    this.required('[data-action="export"]').addEventListener('click', () => this.handlers.onExportTuning());
    this.objectSearch.addEventListener('input', () => this.refreshCatalogOptions());
    this.objectCategory.addEventListener('change', () => this.refreshCatalogOptions());
    this.required('[data-action="spawn-selected-object"]').addEventListener('click', () => {
      if (this.objectSelect.value) this.spawnCatalogEntries([this.objectSelect.value]);
    });
    this.required('[data-action="spawn-filtered-objects"]').addEventListener('click', () => {
      this.spawnCatalogEntries(this.filteredCatalogIds());
    });
    this.required('[data-action="spawn-all-objects"]').addEventListener('click', () => {
      this.spawnCatalogEntries(OBJECT_CATALOG.map((entry) => entry.id));
    });
    this.required('[data-action="clear-lab-objects"]').addEventListener('click', () => {
      const cleared = clearObjectCatalogShowcase();
      this.updateCatalogStatus(cleared ? 'Showcase cleared. Canonical world state was not changed.' : 'Start or continue a journey before clearing the showcase.');
    });

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
    this.installTouchControls();
  }

  private installTouchControls(): void {
    if (!this.touchCapable) return;
    const move = this.required<HTMLElement>('[data-touch="move"]');
    const stick = this.required<HTMLElement>('[data-touch="stick"]');
    const look = this.required<HTMLElement>('[data-touch="look"]');
    let movePointer: number | undefined;
    let lookPointer: number | undefined;
    let lookX = 0;
    let lookY = 0;

    const updateMove = (event: PointerEvent): void => {
      const rect = move.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.34);
      let dx = event.clientX - centerX;
      let dy = event.clientY - centerY;
      const length = Math.hypot(dx, dy);
      if (length > radius) { const scale = radius / length; dx *= scale; dy *= scale; }
      stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.handlers.onTouchMove(-dy / radius, dx / radius);
    };
    const stopMove = (event?: PointerEvent): void => {
      if (event && movePointer !== event.pointerId) return;
      movePointer = undefined;
      stick.style.transform = 'translate(-50%,-50%)';
      this.handlers.onTouchMove(0, 0);
    };

    move.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      event.preventDefault(); movePointer = event.pointerId; move.setPointerCapture(event.pointerId); updateMove(event);
    });
    move.addEventListener('pointermove', (event) => { if (movePointer === event.pointerId) { event.preventDefault(); updateMove(event); } });
    move.addEventListener('pointerup', stopMove);
    move.addEventListener('pointercancel', stopMove);
    move.addEventListener('lostpointercapture', () => stopMove());

    look.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      event.preventDefault(); lookPointer = event.pointerId; lookX = event.clientX; lookY = event.clientY; look.setPointerCapture(event.pointerId);
    });
    look.addEventListener('pointermove', (event) => {
      if (lookPointer !== event.pointerId) return;
      event.preventDefault();
      const dx = event.clientX - lookX; const dy = event.clientY - lookY;
      lookX = event.clientX; lookY = event.clientY;
      if (dx !== 0 || dy !== 0) this.handlers.onTouchLook(dx, dy);
    });
    const stopLook = (event: PointerEvent): void => { if (lookPointer === event.pointerId) lookPointer = undefined; };
    look.addEventListener('pointerup', stopLook);
    look.addEventListener('pointercancel', stopLook);
    this.required('[data-ui="touch-controls"]').addEventListener('contextmenu', (event) => event.preventDefault());
  }

  private required<T extends Element = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing UI element: ${selector}`);
    return element;
  }

  private filteredCatalogIds(): string[] {
    return filterObjectCatalog(this.objectSearch.value, this.objectCategory.value).map((entry) => entry.id);
  }

  private spawnCatalogEntries(entryIds: readonly string[]): void {
    const count = spawnObjectCatalogEntries(entryIds);
    this.updateCatalogStatus(count === 0 ? 'Start or continue a journey, or choose at least one matching object.' : `Spawned ${count} local showcase object${count === 1 ? '' : 's'} in front of the player.`);
  }

  private refreshCatalogOptions(): void {
    const previous = this.objectSelect.value;
    const entries = filterObjectCatalog(this.objectSearch.value, this.objectCategory.value);
    this.objectSelect.replaceChildren();
    for (const entry of entries) {
      const option = document.createElement('option'); option.value = entry.id; option.textContent = entry.label; this.objectSelect.appendChild(option);
    }
    if (entries.some((entry) => entry.id === previous)) this.objectSelect.value = previous;
    this.objectSelect.disabled = entries.length === 0;
    this.updateCatalogStatus(entries.length === 0 ? 'No objects match this filter.' : `${entries.length} object${entries.length === 1 ? '' : 's'} match this filter.`);
  }

  prefersTouchControls(): boolean { return this.touchCapable; }
  isTouchLandscape(): boolean { return this.touchCapable && window.innerWidth > window.innerHeight; }
  setContinueAvailable(available: boolean): void { this.continueButton.disabled = !available; }
  showGame(): void { this.title.hidden = true; this.hud.hidden = false; }
  setPaused(paused: boolean): void { this.pause.classList.toggle('visible', paused); }
  toggleLab(): void { this.lab.classList.toggle('visible'); }
  isLabOpen(): boolean { return this.lab.classList.contains('visible'); }
  isNoteOpen(): boolean { return this.noteOverlay.classList.contains('visible'); }
  setMarkerMode(active: boolean): void { this.markerMode.classList.toggle('visible', active); }
  updateCatalogStatus(text: string): void { this.catalogStatus.textContent = text; }

  showNote(title: string, body: string, attribution?: string): void {
    this.noteTitle.textContent = title.slice(0, 120);
    const text = attribution ? `${body}\n\n— ${attribution}` : body;
    this.noteBody.textContent = text.slice(0, 4000);
    this.noteOverlay.classList.add('visible');
    document.exitPointerLock();
  }

  hideNote(): void { this.noteOverlay.classList.remove('visible'); }

  setInteraction(text?: string): void {
    const visibleText = this.touchCapable ? text?.replace('[E]', '[INTERACT]') : text;
    this.interaction.textContent = visibleText ?? '';
    this.interaction.classList.toggle('visible', Boolean(visibleText));
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
        const strong = document.createElement('strong'); strong.textContent = `${index + 1}. ${definition.name}`;
        const small = document.createElement('small'); small.textContent = state;
        button.append(strong, small); button.title = definition.description;
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
