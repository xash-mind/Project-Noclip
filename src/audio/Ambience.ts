export class ProceduralAmbience {
  private context?: AudioContext;
  private master?: GainNode;
  private hum?: OscillatorNode;
  private humGain?: GainNode;
  private lastStep = 0;

  async start(volume: number): Promise<void> {
    if (this.context) {
      this.master!.gain.value = volume;
      if (this.context.state === 'suspended') await this.context.resume();
      return;
    }
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = volume * 0.28;
    this.master.connect(this.context.destination);
    this.hum = this.context.createOscillator();
    this.hum.type = 'sawtooth';
    this.hum.frequency.value = 59.7;
    this.humGain = this.context.createGain();
    this.humGain.gain.value = 0.025;
    this.hum.connect(this.humGain).connect(this.master);
    this.hum.start();
  }

  setZone(blackout: boolean, failed: boolean): void {
    if (!this.humGain || !this.context) return;
    const target = blackout ? 0.001 : failed ? 0.008 : 0.025;
    this.humGain.gain.setTargetAtTime(target, this.context.currentTime, 0.35);
  }

  step(intensity: number): void {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    if (now - this.lastStep < Math.max(0.27, 0.48 / Math.max(0.4, intensity))) return;
    this.lastStep = now;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 70 + Math.random() * 18;
    gain.gain.setValueAtTime(0.018, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.09);
  }

  distantImpact(): void {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(82, now);
    oscillator.frequency.exponentialRampToValueAtTime(39, now + 0.75);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.82);
  }
}
