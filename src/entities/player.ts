import * as THREE from 'three';
import { bus } from '../core/events';
import type { Input } from '../core/input';
import type { Colliders } from '../world/collision';

const WALK = 3.1, RUN = 6.4, CROUCH = 1.5, RADIUS = 0.36;

/** Capsule-ish character with a procedural walk cycle. */
export class Player {
  readonly group = new THREE.Group();
  readonly pos = new THREE.Vector3();
  private prev = new THREE.Vector3();
  private vel = new THREE.Vector3();
  private facing = Math.PI;
  private phase = 0;
  private legs: THREE.Object3D[] = [];
  private arms: THREE.Object3D[] = [];
  private body = new THREE.Group();
  crouching = false;
  running = false;
  speed = 0;

  constructor() {
    const coat = new THREE.MeshStandardMaterial({ color: 0x27304a, roughness: 0.55, metalness: 0.1 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x12141c, roughness: 0.7 });
    const skin = new THREE.MeshStandardMaterial({ color: 0x8a6a5a, roughness: 0.8 });
    const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.6, 3.0) });
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = this.body): THREE.Mesh => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };
    add(new THREE.CapsuleGeometry(0.25, 0.42, 4, 10), coat, 0, 1.2, 0);
    add(new THREE.CylinderGeometry(0.25, 0.34, 0.5, 10, 1, true), coat, 0, 0.82, 0); // coat skirt
    add(new THREE.SphereGeometry(0.16, 12, 10), skin, 0, 1.68, 0.02);
    add(new THREE.SphereGeometry(0.19, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), coat, 0, 1.7, -0.03); // hood
    add(new THREE.BoxGeometry(0.3, 0.36, 0.14), dark, 0, 1.25, -0.27); // backpack
    add(new THREE.BoxGeometry(0.22, 0.03, 0.02), glow, 0, 1.36, -0.345);
    add(new THREE.BoxGeometry(0.03, 0.2, 0.02), glow, 0.11, 1.22, -0.345);
    for (const s of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(s * 0.12, 0.82, 0);
      add(new THREE.CapsuleGeometry(0.09, 0.56, 3, 8), dark, 0, -0.4, 0, leg);
      this.body.add(leg);
      this.legs.push(leg);
      const arm = new THREE.Group();
      arm.position.set(s * 0.33, 1.44, 0);
      add(new THREE.CapsuleGeometry(0.07, 0.46, 3, 8), coat, 0, -0.3, 0, arm);
      this.body.add(arm);
      this.arms.push(arm);
    }
    this.group.add(this.body);
  }

  teleport(x: number, z: number, y = 0): void {
    this.pos.set(x, y, z);
    this.prev.copy(this.pos);
    this.vel.set(0, 0, 0);
  }

  /** Fixed-step simulation. camYaw orients movement to the camera. */
  update(dt: number, input: Input, camYaw: number, colliders: Colliders, groundY: (x: number, z: number) => number): void {
    this.prev.copy(this.pos);
    if (input.pressed('KeyC') ) this.crouching = !this.crouching;
    const mv = input.move();
    const moving = Math.hypot(mv.x, mv.y) > 0.05;
    this.running = moving && !this.crouching && (input.down('ShiftLeft') || input.down('ShiftRight') || input.padButton(10) || input.padButton(0));
    const max = this.crouching ? CROUCH : this.running ? RUN : WALK;
    const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
    const tx = (mv.x * cos - mv.y * sin) * max;
    const tz = (-mv.x * sin - mv.y * cos) * max;
    const k = Math.min(1, dt * (moving ? 10 : 14));
    this.vel.x += (tx - this.vel.x) * k;
    this.vel.z += (tz - this.vel.z) * k;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    colliders.resolveCircle(this.pos, RADIUS);
    const gy = groundY(this.pos.x, this.pos.z);
    this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 18);

    this.speed = Math.hypot(this.vel.x, this.vel.z);
    if (this.speed > 0.3) {
      const want = Math.atan2(this.vel.x, this.vel.z);
      let d = want - this.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.facing += d * Math.min(1, dt * 10);
    }
    const before = Math.floor(this.phase / Math.PI);
    this.phase += this.speed * dt * (this.crouching ? 3.4 : 2.5);
    if (this.speed > 0.5 && Math.floor(this.phase / Math.PI) !== before) bus.emit('footstep', { run: this.running });
  }

  /** Per-frame visuals, interpolated between fixed steps. */
  render(alpha: number, dt: number): void {
    this.group.position.lerpVectors(this.prev, this.pos, alpha);
    this.group.rotation.y = this.facing;
    const amt = Math.min(1, this.speed / WALK);
    const swing = Math.sin(this.phase) * 0.65 * amt * (this.running ? 1.25 : 1);
    this.legs[0]!.rotation.x = swing;
    this.legs[1]!.rotation.x = -swing;
    this.arms[0]!.rotation.x = -swing * 0.8;
    this.arms[1]!.rotation.x = swing * 0.8;
    const targetScale = this.crouching ? 0.72 : 1;
    this.body.scale.y += (targetScale - this.body.scale.y) * Math.min(1, dt * 12);
    this.body.position.y = Math.abs(Math.sin(this.phase)) * 0.05 * amt;
    this.body.rotation.z = Math.sin(this.phase) * 0.03 * amt;
    this.body.rotation.x = (this.running ? 0.16 : 0.04) * amt;
  }

  eyeHeight(): number {
    return 1.62 * this.body.scale.y;
  }
}
