import { DrumKit, KICK } from './audio/drums';
import type { Engine } from './audio/engine';
import type { Synth } from './audio/synth';
import { DRUM_COUNT, degreeToMidi, type Project } from './state';

/** Look-ahead step sequencer: a timer schedules notes slightly ahead on the audio clock. */
export class Sequencer {
  playing = false;
  /** Step currently audible (for the playhead and live note capture). */
  current = -1;
  private step = 0;
  private nextTime = 0;
  private timer = 0;
  private queue: { step: number; time: number }[] = [];

  constructor(private e: Engine, private kit: DrumKit, private synths: Synth[], public project: Project) {}

  get steps(): number {
    return this.project.bars * 16;
  }
  get stepDur(): number {
    return 60 / this.project.bpm / 4;
  }

  start(): void {
    if (this.playing) return;
    this.e.resume();
    this.playing = true;
    this.step = 0;
    this.queue = [];
    this.nextTime = this.e.ctx.currentTime + 0.08;
    this.timer = window.setInterval(() => this.tick(), 25);
    this.tick();
  }

  stop(): void {
    this.playing = false;
    window.clearInterval(this.timer);
    this.queue = [];
    this.current = -1;
  }

  private tick(): void {
    while (this.nextTime < this.e.ctx.currentTime + 0.14) {
      const swing = this.step % 2 === 1 ? this.project.swing * this.stepDur * 0.5 : 0;
      this.schedule(this.step, this.nextTime + swing);
      this.nextTime += this.stepDur;
      this.step = (this.step + 1) % this.steps;
    }
  }

  private schedule(step: number, t: number): void {
    const p = this.project;
    for (let i = 0; i < DRUM_COUNT; i++) {
      if (!p.drums[i]![step] || p.drumMute[i]) continue;
      this.kit.trigger(i, t, step % 4 === 0 || i === KICK ? 1 : 0.8);
      if (i === KICK) this.synths.forEach((s) => s.strip.duck(t, s.params.pump, this.stepDur * 3));
    }
    this.synths.forEach((s) => {
      if (s.params.mute) return;
      for (const n of s.params.notes) {
        if (n.s === step) s.play(degreeToMidi(p, s.patch.baseMidi, n.d), t, Math.max(0.04, n.l * this.stepDur * 0.94));
      }
    });
    this.queue.push({ step, time: t });
  }

  /** Call every animation frame; returns the step that is sounding now. */
  poll(): number {
    const now = this.e.ctx.currentTime;
    while (this.queue.length && this.queue[0]!.time <= now) this.current = this.queue.shift()!.step;
    return this.playing ? this.current : -1;
  }
}
