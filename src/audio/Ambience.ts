export class ProceduralAmbience {
  private context?: AudioContext;
  private master?: GainNode;
  private humGain?: GainNode;
  private humOscillators: OscillatorNode[] = [];
  private lastStepAt = 0;

  async start(volume: number): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = Math.max(0, Math.min(1, volume)) * 0.28;
      this.master.connect(this.context.destination);
      this.humGain = this.context.createGain();
      this.humGain.gain.value = 0.16;
      this.humGain.connect(this.master);
      for (const frequency of [59.7, 119.8, 181.2]) {
        const oscillator = this.context.createOscillator();
        oscillator.type = frequency < 100 ? 'sine' : 'triangle';
        oscillator.frequency.value = frequency;
        oscillator.detune.value = (frequency % 7) - 3;
        oscillator.connect(this.humGain);
        oscillator.start();
        this.humOscillators.push(oscillator);
      }
    }
    if (this.context.state !== 'running') await this.context.resume();
  }

  setVolume(volume: number): void {
    if (this.master && this.context) this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)) * 0.28, this.context.currentTime, 0.05);
  }

  setZone(blackout: boolean, lightFailure: boolean): void {
    if (!this.humGain || !this.context) return;
    const target = blackout ? 0.006 : lightFailure ? 0.07 : 0.16;
    this.humGain.gain.setTargetAtTime(target, this.context.currentTime, 0.25);
  }

  step(speedRatio: number): void {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    if (now - this.lastStepAt < 0.48 / Math.max(0.65, speedRatio)) return;
    this.lastStepAt = now;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(72 + speedRatio * 14, now);
    oscillator.frequency.exponentialRampToValueAtTime(36, now + 0.09);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
  }

  distantImpact(): void {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(58, now);
    oscillator.frequency.exponentialRampToValueAtTime(24, now + 0.8);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 1.25);
  }
}
