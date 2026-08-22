import './character-creator.css';
import {
  BODY_FRAME_OPTIONS,
  DEFAULT_PLAYER_CHARACTER_APPEARANCE,
  HAIR_COLOR_OPTIONS,
  HAIR_PRESET_OPTIONS,
  LOWER_CLOTHING_OPTIONS,
  LOWER_COLOR_OPTIONS,
  PLAYER_CHARACTER_NAME_MAX_LENGTH,
  SKIN_TONE_OPTIONS,
  UPPER_CLOTHING_OPTIONS,
  UPPER_COLOR_OPTIONS,
  createDefaultPlayerCharacterProfile,
  randomizePlayerCharacterAppearance,
  type PlayerCharacterAppearance,
  type PlayerCharacterProfile
} from './profile.js';
import { beginJourneyWithCharacterProfile } from './newGameFlow.js';
import { LocalPlayerCharacterProfileStore } from './profileStore.js';

export interface CharacterCreatorCallbacks {
  onBack(): void;
  onBeginJourney(seed: string): void;
}

function optionMarkup(options: readonly { id: string; label: string }[]): string {
  return options.map((option) => `<option value="${option.id}">${option.label}</option>`).join('');
}

function swatch(options: readonly { id: string; swatch: string }[], id: string): string {
  return options.find((option) => option.id === id)?.swatch ?? '#777';
}

export class CharacterCreator {
  private readonly screen: HTMLElement;
  private readonly nameInput: HTMLInputElement;
  private readonly error: HTMLElement;
  private readonly seedLabel: HTMLElement;
  private readonly preview: HTMLElement;
  private readonly previewName: HTMLElement;
  private readonly store = new LocalPlayerCharacterProfileStore();
  private profile = createDefaultPlayerCharacterProfile();
  private seed = 'threshold-001';

  constructor(host: HTMLElement, private readonly callbacks: CharacterCreatorCallbacks) {
    this.screen = document.createElement('section');
    this.screen.className = 'character-creator-screen';
    this.screen.dataset.ui = 'character-creator';
    this.screen.hidden = true;
    this.screen.innerHTML = `
      <div class="character-creator-card ui-panel" role="dialog" aria-modal="true" aria-labelledby="character-creator-title">
        <header class="character-creator-heading">
          <div><p class="eyebrow">New Game / Player identity</p><h2 id="character-creator-title">Character Creator</h2></div>
          <p class="character-creator-seed" data-character="seed"></p>
        </header>
        <div class="character-creator-layout">
          <div class="character-creator-controls">
            <label class="character-name">Character name<input data-character="name" maxlength="${PLAYER_CHARACTER_NAME_MAX_LENGTH}" autocomplete="off" /></label>
            <div class="character-control-grid">
              <label>Body / frame<select data-character="body-frame">${optionMarkup(BODY_FRAME_OPTIONS)}</select></label>
              <label>Skin tone<select data-character="skin-tone">${optionMarkup(SKIN_TONE_OPTIONS)}</select></label>
              <label>Hair<select data-character="hair-preset">${optionMarkup(HAIR_PRESET_OPTIONS)}</select></label>
              <label>Hair colour<select data-character="hair-color">${optionMarkup(HAIR_COLOR_OPTIONS)}</select></label>
              <label>Upper clothing<select data-character="upper-clothing">${optionMarkup(UPPER_CLOTHING_OPTIONS)}</select></label>
              <label>Upper colour<select data-character="upper-color">${optionMarkup(UPPER_COLOR_OPTIONS)}</select></label>
              <label>Lower clothing<select data-character="lower-clothing">${optionMarkup(LOWER_CLOTHING_OPTIONS)}</select></label>
              <label>Lower colour<select data-character="lower-color">${optionMarkup(LOWER_COLOR_OPTIONS)}</select></label>
            </div>
            <p class="character-creator-note">Appearance is presentation identity only. It does not alter height, collision, seed, Regions, Cells, Features, or world laws.</p>
            <div class="character-creator-actions secondary-actions">
              <button type="button" data-action="character-randomize">Randomize</button>
              <button type="button" data-action="character-reset">Reset</button>
            </div>
          </div>
          <aside class="character-preview-panel" aria-label="Character appearance preview">
            <p class="eyebrow">Preview / mannequin</p>
            <div class="character-preview" data-character="preview" data-frame="standard">
              <div class="preview-hair"></div>
              <div class="preview-head"></div>
              <div class="preview-neck"></div>
              <div class="preview-torso"></div>
              <div class="preview-legs"><span></span><span></span></div>
            </div>
            <strong data-character="preview-name">Wanderer</strong>
            <small>In-world 3D avatar rendering is intentionally deferred.</small>
          </aside>
        </div>
        <p class="character-creator-error" data-character="error" role="status" aria-live="polite"></p>
        <div class="character-creator-actions final-actions">
          <button type="button" data-action="character-back">Back</button>
          <button type="button" class="primary" data-action="character-begin">Begin Journey</button>
        </div>
      </div>`;
    host.appendChild(this.screen);

    this.nameInput = this.required<HTMLInputElement>('[data-character="name"]');
    this.error = this.required('[data-character="error"]');
    this.seedLabel = this.required('[data-character="seed"]');
    this.preview = this.required('[data-character="preview"]');
    this.previewName = this.required('[data-character="preview-name"]');

    this.required('[data-action="character-back"]').addEventListener('click', () => this.back());
    this.required('[data-action="character-begin"]').addEventListener('click', () => this.begin());
    this.required('[data-action="character-randomize"]').addEventListener('click', () => this.randomize());
    this.required('[data-action="character-reset"]').addEventListener('click', () => this.reset());
    this.screen.addEventListener('input', () => this.updatePreview());
    this.screen.addEventListener('change', () => this.updatePreview());
    this.screen.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); this.back(); }
    });
  }

  open(seed: string): void {
    this.seed = seed;
    this.profile = this.store.loadActive() ?? createDefaultPlayerCharacterProfile();
    this.applyProfile(this.profile);
    this.seedLabel.textContent = `Journey seed: ${seed}`;
    this.error.textContent = '';
    this.screen.hidden = false;
    window.setTimeout(() => this.nameInput.focus(), 0);
  }

  hide(): void { this.screen.hidden = true; }

  private back(): void {
    this.hide();
    this.callbacks.onBack();
  }

  private begin(): void {
    const result = beginJourneyWithCharacterProfile(this.seed, this.readProfile(), this.store, (seed) => this.callbacks.onBeginJourney(seed));
    if (!result.ok) { this.error.textContent = result.error; return; }
    this.profile = result.profile;
    this.error.textContent = '';
    this.hide();
  }

  private randomize(): void {
    const current = this.readProfile();
    this.profile = { ...current, appearance: randomizePlayerCharacterAppearance() };
    this.applyProfile(this.profile);
  }

  private reset(): void {
    const current = this.readProfile();
    this.profile = {
      ...current,
      displayName: 'Wanderer',
      appearance: { ...DEFAULT_PLAYER_CHARACTER_APPEARANCE }
    };
    this.applyProfile(this.profile);
  }

  private applyProfile(profile: PlayerCharacterProfile): void {
    this.nameInput.value = profile.displayName;
    this.select('body-frame').value = profile.appearance.bodyFrame;
    this.select('skin-tone').value = profile.appearance.skinTone;
    this.select('hair-preset').value = profile.appearance.hairPreset;
    this.select('hair-color').value = profile.appearance.hairColor;
    this.select('upper-clothing').value = profile.appearance.upperClothing;
    this.select('upper-color').value = profile.appearance.upperColor;
    this.select('lower-clothing').value = profile.appearance.lowerClothing;
    this.select('lower-color').value = profile.appearance.lowerColor;
    this.updatePreview();
  }

  private readProfile(): PlayerCharacterProfile {
    const appearance: PlayerCharacterAppearance = {
      bodyFrame: this.select('body-frame').value as PlayerCharacterAppearance['bodyFrame'],
      skinTone: this.select('skin-tone').value as PlayerCharacterAppearance['skinTone'],
      hairPreset: this.select('hair-preset').value as PlayerCharacterAppearance['hairPreset'],
      hairColor: this.select('hair-color').value as PlayerCharacterAppearance['hairColor'],
      upperClothing: this.select('upper-clothing').value as PlayerCharacterAppearance['upperClothing'],
      upperColor: this.select('upper-color').value as PlayerCharacterAppearance['upperColor'],
      lowerClothing: this.select('lower-clothing').value as PlayerCharacterAppearance['lowerClothing'],
      lowerColor: this.select('lower-color').value as PlayerCharacterAppearance['lowerColor']
    };
    return { ...this.profile, displayName: this.nameInput.value, appearance };
  }

  private updatePreview(): void {
    const profile = this.readProfile();
    this.preview.dataset.frame = profile.appearance.bodyFrame;
    this.preview.style.setProperty('--creator-skin', swatch(SKIN_TONE_OPTIONS, profile.appearance.skinTone));
    this.preview.style.setProperty('--creator-hair', swatch(HAIR_COLOR_OPTIONS, profile.appearance.hairColor));
    this.preview.style.setProperty('--creator-upper', swatch(UPPER_COLOR_OPTIONS, profile.appearance.upperColor));
    this.preview.style.setProperty('--creator-lower', swatch(LOWER_COLOR_OPTIONS, profile.appearance.lowerColor));
    this.preview.dataset.hair = profile.appearance.hairPreset;
    this.previewName.textContent = profile.displayName.trim() || 'Unnamed character';
  }

  private select(name: string): HTMLSelectElement {
    return this.required<HTMLSelectElement>(`[data-character="${name}"]`);
  }

  private required<T extends Element = HTMLElement>(selector: string): T {
    const element = this.screen.querySelector<T>(selector);
    if (!element) throw new Error(`Missing Character Creator element: ${selector}`);
    return element;
  }
}
