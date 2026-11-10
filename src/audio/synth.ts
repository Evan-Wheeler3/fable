import type { TrackState } from '../state';
import { Engine, Strip } from './engine';

export interface Patch {
  name: string;
  hint: string;
  color: string;
  baseMidi: number; // pitch of the lowest piano-roll row at root A
  oscs: { type: OscillatorType; ratio: number; detune: number; gain: number }[];
  level: number;
  filterEnv: number; // how far the filter opens on each note (x cutoff)
  filterDecay: number;
  decay: number;
  sustain: number;
  lfo?: { rate: number; depth: number }; // slow cutoff drift
  defaults: Omit<TrackState, 'notes'>;
}

export interface Held {
  release(): void;
}

const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** Polyphonic subtractive synth driven by a Patch plus the live TrackState knobs. */
export class Synth {
  readonly strip: Strip;
  private lfoGain: GainNode | null = null;

  constructor(private e: Engine, readonly patch: Patch, public params: TrackState) {
    this.strip = new Strip(e);
    if (patch.lfo) {
      const o = e.ctx.createOscillator();
      o.frequency.value = patch.lfo.rate;
      this.lfoGain = e.ctx.createGain();
      this.lfoGain.gain.value = patch.lfo.depth;
      o.connect(this.lfoGain);
      o.start();
    }
    this.apply();
  }

  /** Push volume / sends from params into the strip. */
  apply(): void {
    const p = this.params;
    this.strip.set(p.mute ? 0 : p.vol, p.reverb, p.delay);
  }

  /** Play a note. With dur it stops itself; without, it holds until release(). */
  play(midi: number, t: number, dur?: number, vel = 1): Held {
    const ctx = this.e.ctx;
    const p = this.params;
    const patch = this.patch;
    const f = mtof(midi);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = p.res;
    const cutoff = Math.min(p.cutoff, 18000);
    if (patch.filterEnv > 0) {
      filter.frequency.setValueAtTime(Math.min(cutoff * (1 + patch.filterEnv), 18000), t);
      filter.frequency.setTargetAtTime(cutoff, t, patch.filterDecay / 3);
    } else filter.frequency.setValueAtTime(cutoff, t);
    this.lfoGain?.connect(filter.frequency);

    const amp = ctx.createGain();
    const peak = patch.level * vel;
    const attack = dur === undefined ? p.attack : Math.min(p.attack, dur * 0.7);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(peak, t + attack);
    amp.gain.setTargetAtTime(peak * patch.sustain, t + attack, patch.decay / 3);
    filter.connect(amp).connect(this.strip.input);

    const oscs = patch.oscs.map((o) => {
      const osc = ctx.createOscillator();
      osc.type = o.type;
      osc.frequency.value = f * o.ratio;
      osc.detune.value = o.detune;
      const g = ctx.createGain();
      g.gain.value = o.gain;
      osc.connect(g).connect(filter);
      osc.start(t);
      return osc;
    });
    oscs[0]!.onended = () => {
      this.lfoGain?.disconnect(filter.frequency);
      amp.disconnect();
    };
    const end = (at: number, cancel: boolean): void => {
      if (cancel) amp.gain.cancelScheduledValues(at);
      amp.gain.setTargetAtTime(0, at, p.release / 4);
      oscs.forEach((o) => o.stop(at + p.release * 1.6 + 0.05));
    };
    if (dur !== undefined) end(t + dur, false);
    let done = dur !== undefined;
    return {
      release: () => {
        if (done) return;
        done = true;
        end(Math.max(ctx.currentTime, t + 0.01), true);
      },
    };
  }
}
