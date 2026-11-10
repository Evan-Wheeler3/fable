/** Axis-aligned boxes standing on the ground; enough for walking and camera rays. */
export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  h: number;
}

export class Colliders {
  boxes: Box[] = [];

  add(cx: number, cz: number, w: number, d: number, h: number): void {
    this.boxes.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, h });
  }

  /** Pushes a circle (x,z,r) out of every box. Mutates p. */
  resolveCircle(p: { x: number; z: number }, r: number): void {
    for (const b of this.boxes) {
      const nx = Math.max(b.minX, Math.min(p.x, b.maxX));
      const nz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
      const dx = p.x - nx;
      const dz = p.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        p.x = nx + (dx / d) * r;
        p.z = nz + (dz / d) * r;
      } else {
        // centre is inside the box: exit through the nearest face
        const l = p.x - b.minX, rr = b.maxX - p.x, n = p.z - b.minZ, f = b.maxZ - p.z;
        const m = Math.min(l, rr, n, f);
        if (m === l) p.x = b.minX - r;
        else if (m === rr) p.x = b.maxX + r;
        else if (m === n) p.z = b.minZ - r;
        else p.z = b.maxZ + r;
      }
    }
  }

  /** Distance along a ray to the first box hit, or max. */
  ray(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, max: number): number {
    let best = max;
    for (const b of this.boxes) {
      let t0 = 0;
      let t1 = best;
      const slab = (o: number, d: number, lo: number, hi: number): boolean => {
        if (Math.abs(d) < 1e-9) return o >= lo && o <= hi;
        let a = (lo - o) / d;
        let c = (hi - o) / d;
        if (a > c) [a, c] = [c, a];
        t0 = Math.max(t0, a);
        t1 = Math.min(t1, c);
        return t0 <= t1;
      };
      if (slab(ox, dx, b.minX, b.maxX) && slab(oy, dy, 0, b.h) && slab(oz, dz, b.minZ, b.maxZ)) best = t0;
    }
    return best;
  }
}
