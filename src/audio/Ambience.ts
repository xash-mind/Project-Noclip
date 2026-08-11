import type { LightFieldSample } from '../world/lighting.js';

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
  flickerStarts: number;
  lightEnergy: number;
  activeLightGroups: number;
  flickerGroups: number;
  targetMasterGain: number;
  actualMasterGain: number;
  targetHumGain: number;
  actualHumGain: number;
  humWaveform: OscillatorType;
  masterScale: number;
  normalHumGain: number;
  humLayers: number;
  blackoutStrength: number;
  blackoutEscapeCue: number;
}

export const AMBIENCE_TUNING = {
  masterScale: 0.24,
  normalHumGain: 0.042,
  failedHumGain: 0.018,
  blackoutHumGain: 0,
  externalEscapeHumGain: 0.034,
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
  const labVisible = lab?.classList.contains('visible') ?? false;
  const labMonitoring = labVisible && lab?.dataset?.audioMonitor === 'true';
  const paused = pauseOpen || (!labMonitoring && (touchCapable
    ? window.innerWidth <= window.innerHeight
    : document.pointerLockElement !== canvas));

  return {
    started: Boolean(title?.hidden && hud && !hud.hidden),
    paused,
    labOpen: labVisible && !labMonitoring,
    noteOpen: note?.classList.contains('visible') ?? false,
    focused: document.hasFocus() && !document.hidden
  };
}

export class ProceduralAmbience {
  private context?: AudioContext;
  private master?: GainNode;
  private hum?: OscillatorNode;
  private humOscillators: OscillatorNode[] = [];
  private humLayerGains: GainNode[] = [];
  private humGain?: GainNode;
  private lifecycleObserver?: MutationObserver;
  private lifecycleInstalled = false;
  private active = false;
  private unavailable = false;
  private baseVolume = 0.68;
  private targetMasterGain = 0;
  private targetHumGain: number = AMBIENCE_TUNING.normalHumGain;
  private lastStep = 0;
  private lastFlickerPulse = 0;
  private suppressNextFlicker = true;
  private lightEnergy = 0;
  private activeLightGroups = 0;
  private flickerGroups = 0;
  private graphStarts = 0;
  private stepStarts = 0;
  private impactStarts = 0;
  private flickerStarts = 0;
  private blackoutStrength = 0;
  private blackoutEscapeCue = 0;

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

      this.humGain = this.context.createGain();
      this.humGain.gain.value = this.targetHumGain;
      this.humGain.connect(this.master);
      const layers: Array<{ frequency: number; waveform: OscillatorType; level: number }> = [
        { frequency: 59.7, waveform: AMBIENCE_TUNING.humWaveform, level: 0.48 },
        { frequency: 119.4, waveform: 'sine', level: 0.34 },
        { frequency: 238.8, waveform: 'triangle', level: 0.18 }
      ];
      for (const layer of layers) {
        const oscillator = this.context.createOscillator();
        const layerGain = this.context.createGain();
        oscillator.type = layer.waveform;
        oscillator.frequency.value = layer.frequency;
        layerGain.gain.value = layer.level;
        oscillator.connect(layerGain).connect(this.humGain);
        oscillator.start();
        this.humOscillators.push(oscillator);
        this.humLayerGains.push(layerGain);
      }
      this.hum = this.humOscillators[0];
      this.graphStarts += 1;
      this.unavailable = false;
      this.applyMasterGain();
      if (this.active) await this.ensureContextRunning();
    } catch {
      this.context = undefined;
      this.master = undefined;
      this.hum = undefined;
      this.humOscillators = [];
      this.humLayerGains = [];
      this.humGain = undefined;
      this.unavailable = true;
    }

    this.publishDebugState();
    window.setTimeout(() => this.syncJourneyLifecycle(), 0);
  }

  setActive(active: boolean): void {
    const changed = this.active !== active;
    this.active = active;
    if (changed) {
      this.suppressNextFlicker = true;
      this.lastFlickerPulse = 0;
      if (this.context) this.lastStep = this.context.currentTime;
    }
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

  setEnvironment(blackoutStrength: number, blackoutEscapeCue: number): void {
    this.blackoutStrength = Math.max(0, Math.min(1, blackoutStrength));
    this.blackoutEscapeCue = Math.max(0, Math.min(1, blackoutEscapeCue));
    this.updateHumTarget();
    this.publishDebugState();
  }

  setLightField(field: LightFieldSample): void {
    this.lightEnergy = Math.max(0, Math.min(1, field.energy));
    this.activeLightGroups = field.activeGroups;
    this.flickerGroups = field.flickerGroups;
    this.updateHumTarget();

    if (this.context) {
      const now = this.context.currentTime;
      const drift = (field.temperature - 0.94) * 3;
      this.humOscillators.forEach((oscillator, index) => oscillator.frequency.setTargetAtTime((59.7 + drift) * (index + 1), now, 0.8));
    }

    const pulse = Math.max(0, Math.min(1, field.flickerPulse));
    if (this.suppressNextFlicker) {
      this.suppressNextFlicker = false;
    } else if (this.active && pulse > 0.18 && this.lastFlickerPulse <= 0.18) {
      this.flickerSnap(pulse);
    }
    this.lastFlickerPulse = pulse;
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
      flickerStarts: this.flickerStarts,
      lightEnergy: this.lightEnergy,
      activeLightGroups: this.activeLightGroups,
      flickerGroups: this.flickerGroups,
      targetMasterGain: this.targetMasterGain,
      actualMasterGain: this.master?.gain.value ?? 0,
      targetHumGain: this.targetHumGain,
      actualHumGain: this.humGain?.gain.value ?? this.targetHumGain,
      humWaveform: AMBIENCE_TUNING.humWaveform,
      masterScale: AMBIENCE_TUNING.masterScale,
      normalHumGain: AMBIENCE_TUNING.normalHumGain,
      humLayers: this.humOscillators.length,
      blackoutStrength: this.blackoutStrength,
      blackoutEscapeCue: this.blackoutEscapeCue
    };
  }

  private updateHumTarget(): void {
    this.targetHumGain = this.blackoutStrength > 0.52
      ? Math.pow(this.blackoutEscapeCue, 1.35) * AMBIENCE_TUNING.externalEscapeHumGain
      : Math.pow(this.lightEnergy, 0.58) * AMBIENCE_TUNING.normalHumGain;
    if (this.humGain && this.context) {
      this.humGain.gain.setTargetAtTime(this.targetHumGain, this.context.currentTime, AMBIENCE_TUNING.zoneTimeConstant);
    }
  }

  private flickerSnap(intensity: number): void {
    if (!this.context || !this.master || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(120 + intensity * 70, now);
    oscillator.frequency.exponentialRampToValueAtTime(70, now + 0.045);
    gain.gain.setValueAtTime(0.0015 + intensity * 0.0025, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.06);
    this.flickerStarts += 1;
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
