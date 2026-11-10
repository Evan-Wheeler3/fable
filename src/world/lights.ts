import * as THREE from 'three';

/** A place that should cast light when the player is near (sign, lamp, holo panel). */
export interface LightSource {
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
  power: number;
}

interface Slot {
  light: THREE.PointLight;
  src: LightSource | null;
  level: number; // 0..1 fade
}

/** A small pool of real point lights that hop between the nearest light sources. */
export class LightPool {
  private slots: Slot[] = [];
  private timer = 0;
  private wanted: LightSource[] = [];
  intensity = 55;

  constructor(private scene: THREE.Scene, private sources: LightSource[], count: number) {
    this.resize(count);
  }

  resize(count: number): void {
    for (const s of this.slots) this.scene.remove(s.light);
    this.slots = [];
    for (let i = 0; i < count; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 34, 1.8);
      this.scene.add(light);
      this.slots.push({ light, src: null, level: 0 });
    }
    this.timer = 0;
  }

  update(dt: number, px: number, pz: number): void {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.25;
      const d = (s: LightSource): number => (s.x - px) ** 2 + (s.z - pz) ** 2 + s.y * s.y * 0.5 - s.power * 30;
      this.wanted = [...this.sources].sort((a, b) => d(a) - d(b)).slice(0, this.slots.length);
    }
    const free = this.wanted.filter((w) => !this.slots.some((s) => s.src === w));
    for (const s of this.slots) {
      const keep = s.src !== null && this.wanted.includes(s.src);
      s.level = Math.max(0, Math.min(1, s.level + (keep ? dt : -dt) * 3));
      if (!keep && s.level === 0 && free.length) {
        s.src = free.shift()!;
        s.light.position.set(s.src.x, s.src.y, s.src.z);
        s.light.color.copy(s.src.color);
      }
      s.light.intensity = s.src ? s.level * s.src.power * this.intensity : 0;
    }
  }
}
