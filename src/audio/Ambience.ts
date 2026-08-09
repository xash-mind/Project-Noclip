export interface JourneyAudioLifecycleSnapshot {
  started: boolean;
  paused: boolean;
  labOpen: boolean;
  noteOpen: boolean;
  focused: boolean;
}

export interface AmbienceDebugState {
  active: boolean;
  contextState: string;
  graphStarts: number;
  stepStarts: number;
  impactStarts: number;
  targetMasterGain: number;
  actualMasterGain: number;
  targetHumGain: number;
  actualHumGain: number;
  humWaveform: OscillatorType;
  masterScale: number;
  normalHumGain: number;
}

export const AMBIENCE_TUNING = {
  masterScale: 0.22,
  normalHumGain: 0.014,
  failedHumGain: 0.0055,
  blackoutHumGain: 0.0008,
  muteTimeConstant: 0.025,
  resumeTimeConstant: 0.16,
  zoneTimeConstant: 0.4,
  humWaveform: 'triangle' as OscillatorType
} as const;

export function shouldProceduralAmbienceBeActive(snapshot: JourneyAudioLifecycleSnapshot): boolean {
  return snapshot.started && !snapshot.paused && !snapshot.labOpen && !snapshot.noteOpen && snapshot.focused;
}

export function readJourneyAudioLifecycle(): JourneyAudioLifecycleSnapshot {
  const title = document.querySelector<HTMLElement>('[data-ui="title"]');
  const hud = document.querySelector<HTMLElement>('[data-ui="hud"]');
  const pause = document.querySelector<HTMLElement>('[data-ui="pause"]');
  const lab = document.querySelector<HTMLElement>('[data-ui="lab"]');
  const note = document.querySelector<HTMLElement>('[data-ui="note"]');
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
  const touchCapable = navigator.maxTouchPoints > 0
    && (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches);
  const pauseOpen = pause?.classList.contains('visible') ?? false;
  const paused = pauseOpen || (touchCapable
    ? window.innerWidth <= window.innerHeight
    : document.pointerLockElement !== canvas);

  return {
    started: Boolean(title?.hidden && hud && !hud.hidden),
    paused,
    labOpen: lab?.classList.contains('visible') ?? false,
    noteOpen: note?.classList.contains('visible') ?? false,
    focused: document.hasFocus() && !document.hidden
  };
}

export class ProceduralAmbience {
  private context?: AudioContext;
  private master?: GainNode;
  private hum?: OscillatorNode;
  private humGain?: GainNode;
  private lifecycleObserver?: MutationObserver;
  private lifecycleInstalled = false;
  private active = false;
  private unavailable = false;
  private baseVolume = 0.68;
  private targetMasterGain = 0;
  private targetHumGain = AMBIENCE_TUNING.normalHumGain;
  private lastStep = 0;
  private graphStarts = 0;
  private stepStarts = 0;
  private impactStarts = 0;

  async start(volume: number): Promise<void> {
    this.baseVolume = Math.max(0, Math.min(1, volume));
    this.installLifecycleObservers();

    if (this.context) {
      this.applyMasterGain();
      if (this.active) await this.ensureContextRunning();
      this.publishDebugState();
      return;
    }

    const AudioContextClass = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      this.unavailable = true;
      this.publishDebugState();
      window.setTimeout(() => this.syncJourneyLifecycle(), 0);
      return;
    }

    try {
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.context.destination);

      this.hum = this.context.createOscillator();
      this.hum.type = AMBIENCE_TUNING.humWaveform;
      this.hum.frequency.value = 59.7;
      this.humGain = this.context.createGain();
      this.humGain.gain.value = this.targetHumGain;
      this.hum.connect(this.humGain).connect(this.master);
      this.hum.start();
      this.graphStarts += 1;
      this.unavailable = false;
      this.applyMasterGain();
      if (this.active) await this.ensureContextRunning();
    } catch {
      this.context = undefined;
      this.master = undefined;
      this.hum = undefined;
      this.humGain = undefined;
      this.unavailable = true;
    }

    this.publishDebugState();
    window.setTimeout(() => this.syncJourneyLifecycle(), 0);
  }

  setActive(active: boolean): void {
    const changed = this.active !== active;
    this.active = active;
    if (changed && this.context) this.lastStep = this.context.currentTime;
    this.applyMasterGain();
    if (active) void this.ensureContextRunning();
    this.publishDebugState();
  }

  setZone(blackout: boolean, failed: boolean): void {
    this.targetHumGain = blackout
      ? AMBIENCE_TUNING.blackoutHumGain
      : failed
        ? AMBIENCE_TUNING.failedHumGain
        : AMBIENCE_TUNING.normalHumGain;
    if (this.humGain && this.context) {
      this.humGain.gain.setTargetAtTime(this.targetHumGain, this.context.currentTime, AMBIENCE_TUNING.zoneTimeConstant);
    }
    this.publishDebugState();
  }

  step(intensity: number): void {
    this.syncJourneyLifecycle();
    if (!this.active || !this.context || !this.master || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    if (now - this.lastStep < Math.max(0.27, 0.48 / Math.max(0.4, intensity))) return;
    this.lastStep = now;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 68 + Math.random() * 14;
    gain.gain.setValueAtTime(0.012, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.09);
    this.stepStarts += 1;
    this.publishDebugState();
  }

  distantImpact(): void {
    this.syncJourneyLifecycle();
    if (!this.active || !this.context || !this.master || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(82, now);
    oscillator.frequency.exponentialRampToValueAtTime(39, now + 0.75);
    gain.gain.setValueAtTime(0.028, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.82);
    this.impactStarts += 1;
    this.publishDebugState();
  }

  getDebugState(): AmbienceDebugState {
    return {
      active: this.active,
      contextState: this.unavailable ? 'unavailable' : this.context?.state ?? 'uninitialized',
      graphStarts: this.graphStarts,
      stepStarts: this.stepStarts,
      impactStarts: this.impactStarts,
      targetMasterGain: this.targetMasterGain,
      actualMasterGain: this.master?.gain.value ?? 0,
      targetHumGain: this.targetHumGain,
      actualHumGain: this.humGain?.gain.value ?? this.targetHumGain,
      humWaveform: AMBIENCE_TUNING.humWaveform,
      masterScale: AMBIENCE_TUNING.masterScale,
      normalHumGain: AMBIENCE_TUNING.normalHumGain
    };
  }

  private installLifecycleObservers(): void {
    if (this.lifecycleInstalled) return;
    this.lifecycleInstalled = true;
    const sync = () => this.syncJourneyLifecycle();
    const mute = () => this.setActive(false);

    document.addEventListener('pointerlockchange', sync);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('blur', mute);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    window.addEventListener('pagehide', mute);

    this.lifecycleObserver = new MutationObserver(sync);
    for (const selector of ['[data-ui="pause"]', '[data-ui="lab"]', '[data-ui="note"]']) {
      const element = document.querySelector(selector);
      if (element) this.lifecycleObserver.observe(element, { attributes: true, attributeFilter: ['class', 'hidden'] });
    }
  }

  private syncJourneyLifecycle(): void {
    this.setActive(shouldProceduralAmbienceBeActive(readJourneyAudioLifecycle()));
  }

  private applyMasterGain(): void {
    this.targetMasterGain = this.active ? this.baseVolume * AMBIENCE_TUNING.masterScale : 0;
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(
      this.targetMasterGain,
      now,
      this.active ? AMBIENCE_TUNING.resumeTimeConstant : AMBIENCE_TUNING.muteTimeConstant
    );
  }

  private async ensureContextRunning(): Promise<void> {
    if (!this.context || this.context.state !== 'suspended') return;
    try {
      await this.context.resume();
    } catch {
      // Browsers may keep Web Audio suspended until a later trusted gesture.
    }
    this.publishDebugState();
  }

  private publishDebugState(): void {
    (window as unknown as { __NOCLIP_AUDIO_DEBUG__?: AmbienceDebugState }).__NOCLIP_AUDIO_DEBUG__ = this.getDebugState();
  }
}
