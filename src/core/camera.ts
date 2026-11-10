import * as THREE from 'three';
import type { Player } from '../entities/player';
import type { Colliders } from '../world/collision';

/** Third-person follow camera with collision and soft follow, plus a first-person toggle. */
export class FollowCamera {
  yaw = 0;
  pitch = 0.1;
  first = false;
  /** When true the camera is left alone (screenshots / debug). */
  free = false;
  private pivot = new THREE.Vector3();
  private dist = 4.4;
  private inited = false;

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  look(dx: number, dy: number): void {
    this.yaw -= dx;
    this.pitch = Math.max(this.first ? -1.3 : -0.45, Math.min(1.25, this.pitch + dy));
  }

  update(dt: number, player: Player, colliders: Colliders): void {
    if (this.free) return;
    const cam = this.camera;
    const eye = player.eyeHeight();
    const p = player.group.position;
    const target = new THREE.Vector3(p.x, p.y + eye, p.z);
    if (!this.inited) {
      this.pivot.copy(target);
      this.inited = true;
    }
    this.pivot.lerp(target, 1 - Math.exp(-dt * 14));
    cam.rotation.set(-this.pitch, this.yaw, 0, 'YXZ');
    const fov = 60 + (player.running ? 5 : 0) * Math.min(1, player.speed / 6);
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov += (fov - cam.fov) * Math.min(1, dt * 4);
      cam.updateProjectionMatrix();
    }
    player.group.visible = !this.first;
    if (this.first) {
      cam.position.copy(target);
      return;
    }
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw), sp = Math.sin(this.pitch), cp = Math.cos(this.pitch);
    // shoulder offset to the right, pulled in if a wall is there
    const side = Math.min(0.55, colliders.ray(this.pivot.x, this.pivot.y, this.pivot.z, cy, 0, -sy, 0.9) - 0.3);
    const ox = this.pivot.x + cy * side, oy = this.pivot.y + 0.1, oz = this.pivot.z - sy * side;
    const dx = sy * cp, dy = sp, dz = cy * cp;
    const want = 4.4;
    let hit = colliders.ray(ox, oy, oz, dx, dy, dz, want + 0.3) - 0.3;
    if (dy < 0) hit = Math.min(hit, (oy - 0.35) / -dy); // stay above the ground
    hit = Math.max(0.5, Math.min(want, hit));
    this.dist = hit < this.dist ? hit : this.dist + (hit - this.dist) * Math.min(1, dt * 4);
    cam.position.set(ox + dx * this.dist, oy + dy * this.dist, oz + dz * this.dist);
  }
}
