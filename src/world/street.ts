import * as THREE from 'three';
import { Rng } from '../core/rng';
import type { WetGround } from '../fx/ground';
import { BuildingBatch } from './buildings';
import { Colliders } from './collision';
import { HoloBatch } from './holo';
import type { LightSource } from './lights';
import { buildBeacons, buildLamps } from './props';
import { SignBatch } from './signs';

export const ROAD_HALF = 6;
export const WALK_W = 5;
export const CURB_H = 0.15;
export const STREET_LEN = 260;
const FACADE = ROAD_HALF + WALK_W; // x where building fronts sit

export function groundY(x: number): number {
  return Math.abs(x) > ROAD_HALF ? CURB_H : 0;
}

export interface Street {
  group: THREE.Group;
  ground: THREE.Object3D[];
  colliders: Colliders;
  sources: LightSource[];
  tick: (time: number) => void;
}

/** M1: one long street. Buildings both sides, back-row towers, signs, lamps, holo panels. */
export function buildStreet(seed: number, wet: WetGround): Street {
  const rng = new Rng(seed);
  const group = new THREE.Group();
  const colliders = new Colliders();
  const sources: LightSource[] = [];
  const half = STREET_LEN / 2;

  // Ground: road plane + raised sidewalks (their side faces are the curbs).
  const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, STREET_LEN + 80).rotateX(-Math.PI / 2), wet.material);
  const walks = [-1, 1].map((s) => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(WALK_W + 1, CURB_H, STREET_LEN + 80), wet.material);
    w.position.set(s * (ROAD_HALF + (WALK_W + 1) / 2), CURB_H / 2, 0);
    return w;
  });
  const ground = [road, ...walks];
  group.add(...ground);

  const buildings = new BuildingBatch();
  const signs = new SignBatch(rng.fork());
  const holo = new HoloBatch();
  const beacons: THREE.Vector3[] = [];
  const tint = (): THREE.Color => new THREE.Color().setHSL(rng.range(0.58, 0.78), rng.range(0.15, 0.4), rng.range(0.05, 0.11));
  let adIdx = 0;

  for (const side of [-1, 1]) {
    // Front row with shopfronts and signs.
    let z = -half;
    while (z < half) {
      const w = Math.min(rng.range(12, 26), half - z + 0.01);
      const d = rng.range(18, 28);
      const h = rng.chance(0.25) ? rng.range(70, 130) : rng.range(22, 60);
      const cz = z + w / 2;
      buildings.add(side * (FACADE + d / 2), cz, d, w, h, tint(), rng.range(0, 100));
      colliders.add(side * (FACADE + d / 2), cz, d, w, h);
      const face = -side * (Math.PI / 2); // facade normal points toward the road
      const wallX = side * (FACADE - 0.12);
      if (w > 7) {
        const sw = Math.min(rng.range(3.6, 6.5), w - 2);
        signs.addFlat(wallX, rng.range(4.5, 5.4), cz + rng.range(-1, 1) * (w - sw) * 0.3, face, sw);
        if (rng.chance(0.45)) signs.addFlat(wallX, rng.range(8, 16), cz + rng.range(-0.3, 0.3) * w, face, rng.range(4, 8));
      }
      const blades = rng.int(0, 2);
      for (let i = 0; i < blades; i++) {
        const bw = rng.range(0.9, 1.5);
        signs.addBlade(side * (FACADE - 0.35 - bw / 2), rng.range(6.5, Math.min(h - 4, 22)), cz + rng.range(-0.42, 0.42) * w, 0, bw);
      }
      if (h > 60 && rng.chance(0.7)) {
        const size = rng.range(9, 13);
        holo.add(adIdx++ % 4, side * (FACADE - 0.6), rng.range(26, Math.min(h - 10, 48)), cz, face, Math.min(size, w - 1));
      }
      if (h > 80) beacons.push(new THREE.Vector3(side * (FACADE + d / 2), h + 0.6, cz));
      z += w;
    }
    // Back row: taller towers for depth.
    z = -half - 30;
    while (z < half + 30) {
      const w = rng.range(22, 40);
      const h = rng.range(90, 230);
      const d = rng.range(26, 40);
      buildings.add(side * (FACADE + 34 + d / 2), z + w / 2, d, w - 3, h, tint(), rng.range(0, 100));
      if (rng.chance(0.5)) beacons.push(new THREE.Vector3(side * (FACADE + 34 + d / 2), h + 0.6, z + w / 2));
      z += w;
    }
  }

  // End caps close the street with a tower and a big holo panel.
  for (const end of [-1, 1]) {
    const h = rng.range(90, 140);
    buildings.add(0, end * (half + 14), FACADE * 2 + 8, 28, h, tint(), rng.range(0, 100));
    colliders.add(0, end * (half + 14), FACADE * 2 + 60, 28, h);
    holo.add(adIdx++ % 4, 0, 24, end * (half - 0.6), end > 0 ? Math.PI : 0, 16);
    signs.addFlat(0, 6.2, end * (half - 0.12), end > 0 ? Math.PI : 0, 9);
    beacons.push(new THREE.Vector3(0, h + 0.6, end * (half + 14)));
  }

  // Far skyline ring, mostly swallowed by fog.
  for (let i = 0; i < 70; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(210, 420);
    const x = Math.cos(a) * r, zz = Math.sin(a) * r * 1.3;
    if (Math.abs(x) < FACADE + 90) continue;
    buildings.add(x, zz, rng.range(24, 50), rng.range(24, 50), rng.range(120, 300), tint(), rng.range(0, 100));
  }

  const lamps = [];
  for (let z = -half + 12, i = 0; z < half; z += 22, i++) {
    const side = i % 2 ? 1 : -1;
    lamps.push({ x: side * (ROAD_HALF + 0.7), z, side });
  }
  group.add(buildLamps(lamps, CURB_H, colliders, sources));
  group.add(buildings.build(), signs.build(), holo.build(), buildBeacons(beacons));
  sources.push(...signs.sources, ...holo.sources);

  return {
    group,
    ground,
    colliders,
    sources,
    tick: (time) => {
      signs.uniforms.uTime.value = time;
      holo.uniforms.uTime.value = time;
    },
  };
}
