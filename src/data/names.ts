import type { Rng } from '../core/rng';

/** Fictional brand and shop-name generator. Nothing here refers to a real brand. */
const FIXED = [
  'KAIJU BURGER', 'VAPOR', 'LUCKY MOTH RAMEN', 'NOODLE-9', 'ZEN CLINIC', 'PIXEL ARCADE', 'GOLDFISH PAWN',
  'MOON TEA', 'NEON LOTUS', 'HOTEL UMBRA', 'SYNTH & SOUP', 'ONI ELECTRIC', 'DRIFT BAR', 'BYTE BAZAAR',
  'LANTERN DUMPLINGS', 'CHROME DENTAL', 'KOI KARAOKE', '24HR NOODLES', 'STATIC RECORDS', 'OPEN LATE',
];
const A = ['NEO', 'HOLO', 'LUCKY', 'MIDNIGHT', 'ELECTRIC', 'VELVET', 'TURBO', 'LITTLE', 'GOLDEN', 'PLASMA', 'RAINY', 'COSMO', 'JADE', 'ULTRA'];
const B = ['RAMEN', 'NOODLES', 'ARCADE', 'PAWN', 'CLINIC', 'TEA', 'BAR', 'DINER', 'PARTS', 'OPTICS', 'SUSHI', 'LOUNGE', 'MARKET', 'CYBERWARE', 'CAFE', 'DUMPLINGS'];
export const BLADE_WORDS = ['RAMEN', 'NOODLE', 'BAR', 'ARCADE', 'PAWN', 'CLINIC', 'HOTEL', 'VAPOR', 'TEA', 'SYNTH', 'KAIJU', '24HR', 'OPEN', 'DATA', 'LOTUS', 'ONI', 'DRIFT', 'BYTE', 'SOUP', 'KOI'];
export const HOLO_ADS: [string, string][] = [
  ['NEBULA TEA', 'sip the stars'],
  ['HOSHI AIR', 'above the rain'],
  ['MIRAI BANK', 'tomorrow, on credit'],
  ['KAIJU BURGER', 'monstrously good'],
];

export function shopNames(rng: Rng, count: number): string[] {
  const out = new Set<string>();
  const fixed = [...FIXED];
  while (out.size < count) {
    if (fixed.length && rng.chance(0.6)) out.add(fixed.splice(rng.int(0, fixed.length - 1), 1)[0]!);
    else out.add(`${rng.pick(A)} ${rng.pick(B)}`);
  }
  return [...out];
}
