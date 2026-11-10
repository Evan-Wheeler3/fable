/** Fully procedural WebAudio bed: rain, city rumble, slow synth pad, footsteps, UI blips. */
const CHORDS = [
  [110.0, 164.81, 261.63, 329.63, 493.88], // Am9
  [87.31, 174.61, 261.63, 329.63, 440.0], // Fmaj7
  [130.81, 196.0, 246.94, 329.63, 392.0], // Cmaj7
  [82.41, 164.81, 246.94, 293.66, 392.0], // Em7
];

export class AudioBed {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;
  private volume = 0.7;

  start(volume: number): void {
    this.volume = volume;
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = (this.ctx = new Ctor());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.gain.setTargetAtTime(volume, ctx.currentTime, 1.2);
    this.master.connect(ctx.destination);

    const len = ctx.sampleRate * 3;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // Rain: bright hiss + a mid band that swells like gusts.
    this.noiseLayer('highpass', 2500, 0.3, 0.1);
    const gust = this.noiseLayer('bandpass', 900, 0.6, 0.1);
    this.lfo(0.13, 0.05, gust.gain);
    // Distant city rumble.
    const rumble = this.noiseLayer('lowpass', 85, 0.7, 0.75);
    this.lfo(0.07, 0.25, rumble.gain);
    this.pad();
  }

  private noiseLayer(type: BiquadFilterType, freq: number, q: number, gain: number): GainNode {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(this.master!);
    src.start();
    return g;
  }

  private lfo(rate: number, depth: number, target: AudioParam): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.value = rate;
    const g = ctx.createGain();
    g.gain.value = depth;
    o.connect(g).connect(target);
    o.start();
  }

  private pad(): void {
    const ctx = this.ctx!;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 650;
    filter.Q.value = 0.8;
    this.lfo(0.05, 260, filter.frequency);
    const out = ctx.createGain();
    out.gain.value = 0.085;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.47;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    filter.connect(out).connect(this.master!);
    out.connect(delay).connect(fb).connect(delay);
    fb.connect(this.master!);

    const voices: OscillatorNode[][] = CHORDS[0]!.map((f) =>
      [-6, 7].map((detune) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = detune;
        const g = ctx.createGain();
        g.gain.value = 0.18;
        o.connect(g).connect(filter);
        o.start();
        return o;
      }),
    );
    let step = 0;
    window.setInterval(() => {
      step = (step + 1) % CHORDS.length;
      const t = ctx.currentTime;
      CHORDS[step]!.forEach((f, i) => voices[i]!.forEach((o) => o.frequency.setTargetAtTime(f, t, 0.6)));
    }, 9000);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.1);
    return this.muted;
  }

  private burst(freq: number, q: number, gain: number, dur: number): void {
    if (!this.ctx || !this.master || !this.noise) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(ctx.currentTime, Math.random() * 2, dur + 0.02);
  }

  /** Wet footstep: a low thud plus a short splashy tick. */
  footstep(run: boolean): void {
    this.burst(180 + Math.random() * 60, 1.2, run ? 0.5 : 0.32, 0.09);
    this.burst(2600 + Math.random() * 900, 0.8, run ? 0.14 : 0.08, 0.06);
  }

  blip(freq = 880): void {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);
    o.connect(g).connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + 0.15);
  }
}
