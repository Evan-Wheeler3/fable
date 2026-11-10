import type { Engine } from './engine';

const WORKLET = `class Rec extends AudioWorkletProcessor {
  process(inputs) {
    const i = inputs[0];
    if (i && i.length) this.port.postMessage(i.map((c) => c.slice()));
    return true;
  }
}
registerProcessor('rec-tap', Rec);`;

/** Records the master output to a 16-bit stereo WAV. */
export class Recorder {
  private node: AudioWorkletNode | null = null;
  private chunks: Float32Array[][] = [];
  private startedAt = 0;
  recording = false;

  constructor(private e: Engine) {}

  async start(): Promise<void> {
    if (this.recording) return;
    if (!this.node) {
      const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
      await this.e.ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      this.node = new AudioWorkletNode(this.e.ctx, 'rec-tap', { numberOfInputs: 1, numberOfOutputs: 0, channelCount: 2, channelCountMode: 'explicit' });
      this.node.port.onmessage = (ev: MessageEvent<Float32Array[]>) => {
        if (this.recording) this.chunks.push(ev.data);
      };
    }
    this.chunks = [];
    this.e.out.connect(this.node);
    this.startedAt = this.e.ctx.currentTime;
    this.recording = true;
  }

  elapsed(): number {
    return this.recording ? this.e.ctx.currentTime - this.startedAt : 0;
  }

  stop(): { blob: Blob; seconds: number } | null {
    if (!this.recording || !this.node) return null;
    this.recording = false;
    this.e.out.disconnect(this.node);
    const frames = this.chunks.reduce((n, c) => n + c[0]!.length, 0);
    if (!frames) return null;
    const rate = this.e.ctx.sampleRate;
    const buf = new ArrayBuffer(44 + frames * 4);
    const v = new DataView(buf);
    const str = (o: number, s: string): void => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
    str(0, 'RIFF');
    v.setUint32(4, 36 + frames * 4, true);
    str(8, 'WAVEfmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 2, true);
    v.setUint32(24, rate, true);
    v.setUint32(28, rate * 4, true);
    v.setUint16(32, 4, true);
    v.setUint16(34, 16, true);
    str(36, 'data');
    v.setUint32(40, frames * 4, true);
    let o = 44;
    for (const c of this.chunks) {
      const l = c[0]!;
      const r = c[1] ?? l;
      for (let i = 0; i < l.length; i++, o += 4) {
        v.setInt16(o, Math.max(-1, Math.min(1, l[i]!)) * 32767, true);
        v.setInt16(o + 2, Math.max(-1, Math.min(1, r[i]!)) * 32767, true);
      }
    }
    this.chunks = [];
    return { blob: new Blob([buf], { type: 'audio/wav' }), seconds: frames / rate };
  }
}
