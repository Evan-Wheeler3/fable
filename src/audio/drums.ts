import type { Engine } from './engine';

export const DRUMS = ['Kick', 'Clap', 'Snare', 'Closed Hat', 'Open Hat', 'Shaker', 'Rim', 'Tom'] as const;
export const KICK = 0;
const REVERB = [0, 0.3, 0.2, 0.03, 0.08, 0.05, 0.25, 0.2];

/** Synthesised house kit. Every hit is built from oscillators and filtered noise. */
export class DrumKit {
  private outs: GainNode[] = [];

  constructor(private e: Engine) {
    DRUMS.forEach((_, i) => {
      const g = e.ctx.createGain();
      g.connect(e.bus);
      const send = e.ctx.createGain();
      send.gain.value = REVERB[i]!;
      g.connect(send).connect(e.reverbIn);
      this.outs.push(g);
    });
  }

  setLevel(i: number, vol: number, mute: boolean): void {
    this.outs[i]!.gain.setTargetAtTime(mute ? 0 : vol, this.e.ctx.currentTime, 0.02);
  }

  private noise(out: AudioNode, t: number, type: BiquadFilterType, freq: number, q: number, gain: number, decay: number, attack = 0.001): void {
    const ctx = this.e.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.e.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + attack + decay);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 1.5);
    src.stop(t + attack + decay + 0.02);
  }

  private tone(out: AudioNode, t: number, type: OscillatorType, f0: number, f1: number, sweep: number, gain: number, decay: number): void {
    const ctx = this.e.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + decay);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + decay + 0.02);
  }

  trigger(i: number, t: number, vel = 1): void {
    const out = this.outs[i]!;
    switch (i) {
      case 0: // kick: pitch-swept sine + click
        this.tone(out, t, 'sine', 155, 46, 0.11, 1.0 * vel, 0.42);
        this.tone(out, t, 'triangle', 900, 120, 0.02, 0.35 * vel, 0.03);
        break;
      case 1: // clap: three quick bursts and a tail
        for (const d of [0, 0.011, 0.023]) this.noise(out, t + d, 'bandpass', 1300, 1.1, 0.5 * vel, 0.02);
        this.noise(out, t + 0.03, 'bandpass', 1200, 0.9, 0.55 * vel, 0.19);
        break;
      case 2: // snare
        this.tone(out, t, 'triangle', 230, 170, 0.05, 0.4 * vel, 0.11);
        this.noise(out, t, 'highpass', 1800, 0.7, 0.45 * vel, 0.16);
        break;
      case 3:
        this.noise(out, t, 'highpass', 7500, 0.8, 0.3 * vel, 0.045);
        break;
      case 4:
        this.noise(out, t, 'highpass', 6800, 0.8, 0.28 * vel, 0.3);
        break;
      case 5:
        this.noise(out, t, 'bandpass', 5200, 1.4, 0.22 * vel, 0.07, 0.018);
        break;
      case 6: // rim
        this.tone(out, t, 'square', 1750, 1650, 0.01, 0.22 * vel, 0.03);
        this.noise(out, t, 'bandpass', 2400, 3, 0.25 * vel, 0.025);
        break;
      default: // tom / conga
        this.tone(out, t, 'sine', 250, 165, 0.09, 0.6 * vel, 0.22);
    }
  }
}
