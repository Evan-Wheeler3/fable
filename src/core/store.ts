import type { QualityName } from './quality';

/** Small typed store persisted to localStorage. Grows with later milestones. */
export interface Settings {
  quality: QualityName | 'auto';
  volume: number;
  rain: number; // 0..1 rain intensity
}

const KEY = 'neon-drizzle:settings:v1';
const defaults: Settings = { quality: 'auto', volume: 0.7, rain: 1 };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* storage unavailable: fall through to defaults */
  }
  return { ...defaults };
}

export const settings: Settings = load();

export function saveSettings(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}
