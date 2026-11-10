import type { Patch } from './synth';

/**
 * The first patch is the pad from Neon Drizzle: two detuned saws through a
 * slowly drifting low-pass, with a long feedback delay.
 */
export const PATCHES: Patch[] = [
  {
    name: 'Drizzle Pad',
    hint: 'the game pad',
    color: '#ff3fa4',
    baseMidi: 45,
    oscs: [
      { type: 'sawtooth', ratio: 1, detune: -6, gain: 0.5 },
      { type: 'sawtooth', ratio: 1, detune: 7, gain: 0.5 },
    ],
    level: 0.2,
    filterEnv: 0,
    filterDecay: 0.3,
    decay: 1.2,
    sustain: 0.85,
    lfo: { rate: 0.05, depth: 260 },
    defaults: { vol: 0.8, cutoff: 650, res: 0.8, attack: 0.5, release: 1.4, reverb: 0.3, delay: 0.38, pump: 0.55, len: 16, mute: false },
  },
  {
    name: 'Sub Bass',
    hint: 'round house bass',
    color: '#4df3ff',
    baseMidi: 33,
    oscs: [
      { type: 'sawtooth', ratio: 1, detune: 0, gain: 0.5 },
      { type: 'sine', ratio: 1, detune: 0, gain: 0.8 },
      { type: 'square', ratio: 2, detune: 4, gain: 0.12 },
    ],
    level: 0.42,
    filterEnv: 3,
    filterDecay: 0.16,
    decay: 0.25,
    sustain: 0.65,
    defaults: { vol: 0.8, cutoff: 380, res: 4, attack: 0.004, release: 0.09, reverb: 0, delay: 0, pump: 0.6, len: 2, mute: false },
  },
  {
    name: 'House Organ',
    hint: 'chord stabs',
    color: '#ffb347',
    baseMidi: 57,
    oscs: [
      { type: 'sine', ratio: 1, detune: 0, gain: 0.6 },
      { type: 'sine', ratio: 2, detune: 3, gain: 0.45 },
      { type: 'sine', ratio: 3, detune: -2, gain: 0.25 },
      { type: 'triangle', ratio: 4, detune: 0, gain: 0.08 },
    ],
    level: 0.2,
    filterEnv: 0.6,
    filterDecay: 0.1,
    decay: 0.3,
    sustain: 0.35,
    defaults: { vol: 0.7, cutoff: 3200, res: 0.7, attack: 0.003, release: 0.14, reverb: 0.25, delay: 0.15, pump: 0.25, len: 2, mute: false },
  },
  {
    name: 'Glass Pluck',
    hint: 'arps and melodies',
    color: '#7dff5a',
    baseMidi: 57,
    oscs: [
      { type: 'triangle', ratio: 1, detune: 0, gain: 0.7 },
      { type: 'sawtooth', ratio: 1, detune: 9, gain: 0.35 },
    ],
    level: 0.26,
    filterEnv: 5,
    filterDecay: 0.12,
    decay: 0.3,
    sustain: 0.06,
    defaults: { vol: 0.6, cutoff: 900, res: 3, attack: 0.002, release: 0.25, reverb: 0.3, delay: 0.45, pump: 0.2, len: 1, mute: false },
  },
  {
    name: 'Neon Lead',
    hint: 'play it live',
    color: '#a26bff',
    baseMidi: 57,
    oscs: [
      { type: 'square', ratio: 1, detune: -5, gain: 0.4 },
      { type: 'sawtooth', ratio: 1, detune: 6, gain: 0.45 },
      { type: 'sine', ratio: 0.5, detune: 0, gain: 0.3 },
    ],
    level: 0.2,
    filterEnv: 1.2,
    filterDecay: 0.25,
    decay: 0.4,
    sustain: 0.7,
    defaults: { vol: 0.7, cutoff: 1800, res: 2, attack: 0.02, release: 0.3, reverb: 0.3, delay: 0.35, pump: 0.2, len: 2, mute: false },
  },
];
