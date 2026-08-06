import type { LightFieldSample } from '../world/lighting.js';

export interface AmbienceDebugState {
  started: boolean;
  paused: boolean;
  lightEnergy: number;
  masterGain: number;
  humGain: number;
  flickerEvents: number;
}

export class ProceduralAmbience {
  private context?: AudioContext;
  private master?: GainNode;
  private humGain?: GainNode;
  private primaryHum?: OscillatorNode;
  private secondaryHum?: OscillatorNode;
  private filter?: BiquadFilterNode;
  private lastStep = 0;
  private baseVolume = 0.68;
  private paused = true;
  private lastFlickerPulse = 0;
  private lightEnergy = 0;
  private flickerEvents = 0;

  async start(volume: number): Promise<void> {
    this.baseVolume = Math.max(0, Math.min(1, volume));
    if (this.context) {
      if (this.context.state === 'suspended') await this.context.resume();
      this.applyMasterGain();
      return;
    }
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.context.destination);

    this.filter = this.context.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 780;
    this.filter.Q.value = 0.38;
    this.filter.connect(this.master);

    this.humGain = this.context.createGain();
    this.humGain.gain.value = 0;
    this.humGain.connect(this.filter);

    this.primaryHum = this.context.createOscillator();
    this.primaryHum.type = 'sine';
    this.primaryHum.frequency.value = 59.65;
    const primaryGain = this.context.createGain();
    primaryGain.gain.value = 0.72;
    this.primaryHum.connect(primaryGain).connect(this.humGain);

    this.secondaryHum = this.context.createOscillator();
    this.secondaryHum.type = 'triangle';
    this.secondaryHum.frequency.value = 119.3;
    const secondaryGain = this.context.createGain();
    secondaryGain.gain.value = 0.12;
    this.secondaryHum.connect(secondaryGain).connect(this.humGain);

    this.primaryHum.start();
    this.secondaryHum.start();
    this.applyMasterGain();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.applyMasterGain();
  }

  setLightField(field: LightFieldSample): void {
    this.lightEnergy = field.energy;
    if (!this.context || !this.humGain || !this.primaryHum || !this.secondaryHum || !this.filter) return;
    const now = this.context.currentTime;
    const energyCurve = Math.pow(Math.max(0, Math.min(1, field.energy)), 0.72);
    const target = energyCurve * 0.017;
    this.humGain.gain.setTargetAtTime(target, now, 0.42);
    const temperatureOffset = (field.temperature - 0.94) * 2.6;
    this.primaryHum.frequency.setTargetAtTime(59.65 + temperatureOffset, now, 0.8);
    this.secondaryHum.frequency.setTargetAtTime(119.3 + temperatureOffset * 2, now, 0.8);
    this.filter.frequency.setTargetAtTime(560 + energyCurve * 420, now, 0.65);
    if (!this.paused && field.flickerPulse > 0.25 && this.lastFlickerPulse <= 0.25) this.flickerSnap(field.flickerPulse);
    this.lastFlickerPulse = field.flickerPulse;
  }

  private applyMasterGain(): void {
    if (!this.context || !this.master) return;
    const target = this.paused ? 0 : this.baseVolume * 0.17;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(target, this.context.currentTime, this.paused ? 0.025 : 0.18);
  }

  private flickerSnap(intensity: number): void {
    if (!this.context || !this.master) return;
    this.flickerEvents += 1;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(150 + intensity * 90, now);
    oscillator.frequency.exponentialRampToValueAtTime(68, now + 0.045);
    gain.gain.setValueAtTime(0.0035 + intensity * 0.004, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.06);
  }

  step(intensity: number): void {
    if (this.paused || !this.context || !this.master) return;
    const now = this.context.currentTime;
    if (now - this.lastStep < Math.max(0.27, 0.48 / Math.max(0.4, intensity))) return;
    this.lastStep = now;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 66 + Math.random() * 14;
    gain.gain.setValueAtTime(0.012, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.09);
  }

  distantImpact(): void {
    if (this.paused || !this.context || !this.master) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(82, now);
    oscillator.frequency.exponentialRampToValueAtTime(39, now + 0.75);
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.82);
  }

  getDebugState(): AmbienceDebugState {
    return {
      started: Boolean(this.context),
      paused: this.paused,
      lightEnergy: this.lightEnergy,
      masterGain: this.master?.gain.value ?? 0,
      humGain: this.humGain?.gain.value ?? 0,
      flickerEvents: this.flickerEvents
    };
  }
}
