/**
 * Synthesizes institutional audio feedback using the native Web Audio API
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Sound for 4x sub-lot order dispatch (4 crisp high-frequency ticks)
   */
  public playOrderExecution() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const baseTime = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880 + i * 110, baseTime + i * 0.08); // Ascending nano-trade chord
      
      gain.gain.setValueAtTime(0.12, baseTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, baseTime + i * 0.08 + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(baseTime + i * 0.08);
      osc.stop(baseTime + i * 0.08 + 0.07);
    }
  }

  /**
   * Sound for Risk Balancer batch liquidation (descending resolving chord)
   */
  public playRiskBalancerLiquidation() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const baseTime = this.ctx.currentTime;
    const freqs = [659.25, 523.25, 440.0, 329.63]; // E5, C5, A4, E4
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, baseTime + idx * 0.09);
      gain.gain.setValueAtTime(0.15, baseTime + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, baseTime + idx * 0.09 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(baseTime + idx * 0.09);
      osc.stop(baseTime + idx * 0.09 + 0.25);
    });
  }

  /**
   * Sound for 10% Profit Target Hit (major triad victory chime)
   */
  public playTargetHit() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const baseTime = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    chords.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, baseTime + idx * 0.12);
      gain.gain.setValueAtTime(0.2, baseTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, baseTime + idx * 0.12 + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(baseTime + idx * 0.12);
      osc.stop(baseTime + idx * 0.12 + 0.6);
    });
  }

  /**
   * Sound for Asian Session Opened (temple bell / harmonic chime)
   */
  public playAsianSessionAlert() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const baseTime = this.ctx.currentTime;
    [440, 880, 1320].forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, baseTime);
      gain.gain.setValueAtTime(0.08, baseTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, baseTime + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(baseTime);
      osc.stop(baseTime + 1.2);
    });
  }

  /**
   * Crisp UI interaction click
   */
  public playClick() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.03);
  }
}

export const soundEngine = new SoundEngine();
