import { PATCHES } from './audio/patches';

export const ROWS = 22; // piano-roll rows (scale degrees)
export const DRUM_COUNT = 8;
export const MAX_STEPS = 64;

export interface Note {
  s: number; // start step
  d: number; // scale degree row, 0 = lowest
  l: number; // length in steps
}

export interface TrackState {
  notes: Note[];
  vol: number;
  cutoff: number;
  res: number;
  attack: number;
  release: number;
  reverb: number;
  delay: number;
  pump: number;
  len: number; // length for newly drawn notes
  mute: boolean;
}

export interface Project {
  v: 1;
  bpm: number;
  swing: number;
  bars: number;
  root: number; // semitones above A
  scale: string;
  master: number;
  drums: number[][]; // [drum][step] 0/1
  drumVol: number[];
  drumMute: boolean[];
  tracks: TrackState[];
}

export const SCALES: Record<string, number[]> = {
  Minor: [0, 2, 3, 5, 7, 8, 10],
  Major: [0, 2, 4, 5, 7, 9, 11],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  'Minor pentatonic': [0, 3, 5, 7, 10],
  'Major pentatonic': [0, 2, 4, 7, 9],
};
export const ROOTS = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function degreeToMidi(p: Project, baseMidi: number, d: number): number {
  const sc = SCALES[p.scale] ?? SCALES.Minor!;
  return baseMidi + p.root + sc[d % sc.length]! + 12 * Math.floor(d / sc.length);
}
export function isRootDegree(p: Project, d: number): boolean {
  return d % (SCALES[p.scale] ?? SCALES.Minor!).length === 0;
}
export const midiName = (m: number): string => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`;

function blank(): Project {
  return {
    v: 1,
    bpm: 122,
    swing: 0.12,
    bars: 4,
    root: 0,
    scale: 'Minor',
    master: 0.8,
    drums: Array.from({ length: DRUM_COUNT }, () => new Array<number>(MAX_STEPS).fill(0)),
    drumVol: [0.95, 0.75, 0.6, 0.55, 0.5, 0.45, 0.5, 0.6],
    drumMute: new Array<boolean>(DRUM_COUNT).fill(false),
    tracks: PATCHES.map((p) => ({ notes: [], ...p.defaults })),
  };
}

/** A four-bar house loop over the game's chord progression (Am9, Fmaj7, Cmaj7, Em7). */
export function demo(): Project {
  const p = blank();
  const [kick, clap, snare, hat, open, shaker, rim, tom] = p.drums as [number[], number[], number[], number[], number[], number[], number[], number[]];
  for (let bar = 0; bar < 4; bar++) {
    const o = bar * 16;
    for (let s = 0; s < 16; s++) {
      if (s % 4 === 0) kick[o + s] = 1;
      if (s % 4 === 2) open[o + s] = 1;
      else if (s % 2 === 0 || s % 8 === 7) hat[o + s] = 1;
      if (s % 2 === 1) shaker[o + s] = 1;
    }
    clap[o + 4] = clap[o + 12] = 1;
    rim[o + 3] = rim[o + 10] = 1;
    if (bar % 2 === 1) tom[o + 7] = tom[o + 14] = 1;
  }
  snare[61] = snare[63] = 1;

  const pad = [[0, 4, 9, 11, 15], [5, 9, 11, 14], [2, 6, 8, 11, 13], [4, 8, 10, 13]];
  const bass = [0, 5, 2, 4];
  const stab = [[7, 9, 11], [5, 7, 9], [2, 4, 6], [4, 6, 8]];
  const arp = [[7, 9, 11, 14], [5, 7, 9, 12], [9, 11, 13, 16], [8, 11, 13, 15]];
  for (let bar = 0; bar < 4; bar++) {
    const o = bar * 16;
    pad[bar]!.forEach((d) => p.tracks[0]!.notes.push({ s: o, d, l: 16 }));
    for (const s of [2, 6, 10, 14]) p.tracks[1]!.notes.push({ s: o + s, d: bass[bar]!, l: 2 });
    p.tracks[1]!.notes.push({ s: o + 11, d: bass[bar]! + 7, l: 1 });
    for (const s of [3, 9, 14]) stab[bar]!.forEach((d) => p.tracks[2]!.notes.push({ s: o + s, d, l: 2 }));
    [0, 3, 6, 8, 11, 14].forEach((s, i) => p.tracks[3]!.notes.push({ s: o + s, d: arp[bar]![i % 4]!, l: 1 }));
  }
  return p;
}

export function empty(): Project {
  return blank();
}

const KEY = 'drizzle-synth:project:v1';

export function load(): Project {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Project;
      if (p.v === 1 && p.tracks?.length === PATCHES.length && p.drums?.length === DRUM_COUNT) return p;
    }
  } catch {
    /* fall through */
  }
  return demo();
}

let timer = 0;
export function save(p: Project): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }, 300);
}
