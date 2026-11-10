/** Audio graph shared by everything: mix bus, reverb, tempo delay, compressor, analyser. */
export class Engine {
  readonly ctx: AudioContext;
  readonly bus: GainNode;
  readonly reverbIn: GainNode;
  readonly delayIn: GainNode;
  readonly master: GainNode;
  /** Final output after the limiter; the recorder taps this. */
  readonly out: DynamicsCompressorNode;
  readonly analyser: AnalyserNode;
  readonly noise: AudioBuffer;
  private delay: DelayNode;

  constructor() {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = (this.ctx = new Ctor({ latencyHint: 'interactive' }));
    this.bus = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 3;
    comp.attack.value = 0.005;
    comp.release.value = 0.16;
    this.master = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.bus.gain.value = 0.5;
    this.out = ctx.createDynamicsCompressor(); // limiter so recordings never clip
    this.out.threshold.value = -3;
    this.out.knee.value = 0;
    this.out.ratio.value = 20;
    this.out.attack.value = 0.002;
    this.out.release.value = 0.1;
    this.bus.connect(comp).connect(this.master).connect(this.out).connect(ctx.destination);
    this.out.connect(this.analyser);

    // White noise, reused by drums.
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // Reverb: generated impulse response.
    const irLen = Math.floor(ctx.sampleRate * 2.6);
    const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      for (let i = 0; i < irLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3.2);
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    this.reverbIn = ctx.createGain();
    const revOut = ctx.createGain();
    revOut.gain.value = 0.7;
    this.reverbIn.connect(conv).connect(revOut).connect(this.bus);

    // Feedback delay, synced to tempo (dotted eighth).
    this.delayIn = ctx.createGain();
    this.delay = ctx.createDelay(2);
    const fb = ctx.createGain();
    fb.gain.value = 0.4;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2800;
    this.delayIn.connect(this.delay).connect(tone).connect(fb).connect(this.delay);
    tone.connect(this.bus);
    this.setBpm(122);
  }

  resume(): void {
    if (this.ctx.state !== 'running') void this.ctx.resume();
  }

  setBpm(bpm: number): void {
    this.delay.delayTime.setTargetAtTime((60 / bpm) * 0.75, this.ctx.currentTime, 0.05);
  }

  setMaster(v: number): void {
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }
}

/** Channel strip: sidechain duck -> volume -> bus, with reverb and delay sends. */
export class Strip {
  readonly input: GainNode;
  private vol: GainNode;
  private rev: GainNode;
  private dly: GainNode;

  constructor(private e: Engine) {
    const ctx = e.ctx;
    this.input = ctx.createGain();
    this.vol = ctx.createGain();
    this.rev = ctx.createGain();
    this.dly = ctx.createGain();
    this.input.connect(this.vol).connect(e.bus);
    this.vol.connect(this.rev).connect(e.reverbIn);
    this.vol.connect(this.dly).connect(e.delayIn);
  }

  set(vol: number, reverb: number, delay: number): void {
    const t = this.e.ctx.currentTime;
    this.vol.gain.setTargetAtTime(vol, t, 0.02);
    this.rev.gain.setTargetAtTime(reverb, t, 0.02);
    this.dly.gain.setTargetAtTime(delay, t, 0.02);
  }

  /** Sidechain-style pump: dip at time t, recover over dur seconds. */
  duck(t: number, amount: number, dur: number): void {
    if (amount <= 0) return;
    const g = this.input.gain;
    g.setTargetAtTime(1 - amount, t, 0.004);
    g.setTargetAtTime(1, t + 0.025, dur / 3);
  }
}
