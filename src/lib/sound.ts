export class RitualSound {
  private context: AudioContext | null = null;
  enabled = false;
  async enable(value: boolean) {
    this.enabled = value;
    if (value) {
      this.context ??= new AudioContext();
      await this.context.resume();
      this.play('start');
    } else if (this.context) await this.context.suspend();
  }
  play(kind: 'start' | 'select' | 'reveal' | 'burst' | 'browse') {
    if (!this.enabled || !this.context) return;
    const ctx = this.context;
    const notes = kind === 'browse' ? [520] : kind === 'reveal' ? [130.81, 196, 261.63, 392, 523.25] : kind === 'burst' ? [65.41, 98, 196, 783.99] : [196, 293.66, 440];
    notes.forEach((hz, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      const t = ctx.currentTime + i * .065; const duration = kind === 'browse' ? .12 : 1.9;
      osc.type = 'sine'; osc.frequency.setValueAtTime(hz, t);
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(kind === 'browse' ? .025 : .055, t + .025);
      gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + duration + .02);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }
  destroy() { void this.context?.close(); this.context = null; }
}
