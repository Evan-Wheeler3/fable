import * as THREE from 'three';
import type { Colliders } from './collision';
import type { LightSource } from './lights';

interface Lamp {
  x: number;
  z: number;
  side: number; // +1 = right sidewalk (arm reaches toward -x)
}

/** Street lamps (instanced pole/arm/bulb) and red rooftop beacons. */
export function buildLamps(lamps: Lamp[], baseY: number, colliders: Colliders, sources: LightSource[]): THREE.Group {
  const group = new THREE.Group();
  const H = 5.6, ARM = 1.7;
  const metal = new THREE.MeshStandardMaterial({ color: 0x15171f, roughness: 0.45, metalness: 0.7 });
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.1, H, 6, 1, true), metal, lamps.length);
  const arms = new THREE.InstancedMesh(new THREE.BoxGeometry(ARM, 0.07, 0.1), metal, lamps.length);
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.1, 1.0) });
  const bulbs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.06, 0.2), glow, lamps.length);
  const m = new THREE.Matrix4();
  const warm = new THREE.Color(1.0, 0.72, 0.42);
  lamps.forEach((l, i) => {
    poles.setMatrixAt(i, m.makeTranslation(l.x, baseY + H / 2, l.z));
    arms.setMatrixAt(i, m.makeTranslation(l.x - (l.side * ARM) / 2, baseY + H, l.z));
    const bx = l.x - l.side * (ARM - 0.3);
    bulbs.setMatrixAt(i, m.makeTranslation(bx, baseY + H - 0.07, l.z));
    colliders.add(l.x, l.z, 0.25, 0.25, H);
    sources.push({ x: bx, y: baseY + H - 0.6, z: l.z, color: warm, power: 0.75 });
  });
  for (const mesh of [poles, arms, bulbs]) {
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  return group;
}

export function buildBeacons(points: THREE.Vector3[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.45, 6, 4),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.3, 0.35), fog: false }),
    points.length,
  );
  const m = new THREE.Matrix4();
  points.forEach((p, i) => mesh.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
  mesh.frustumCulled = false;
  return mesh;
}
