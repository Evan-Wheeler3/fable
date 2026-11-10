import type * as THREE from 'three';

/** `?debug` stats panel: fps, frame time, draw calls, triangles. */
export class DebugPanel {
  private el: HTMLElement | null = null;
  private frames = 0;
  private acc = 0;
  private worst = 0;
  fps = 0;
  ms = 0;
  calls = 0;
  tris = 0;

  constructor(enabled: boolean, parent: HTMLElement) {
    if (!enabled) return;
    this.el = document.createElement('pre');
    this.el.className = 'debug-panel';
    parent.appendChild(this.el);
  }

  /** Call once per rendered frame, after rendering. */
  frame(dt: number, renderer: THREE.WebGLRenderer, extra: () => string): void {
    this.frames++;
    this.acc += dt;
    this.worst = Math.max(this.worst, dt);
    this.calls = renderer.info.render.calls;
    this.tris = renderer.info.render.triangles;
    if (this.acc < 0.5) return;
    this.fps = this.frames / this.acc;
    this.ms = (this.acc / this.frames) * 1000;
    if (this.el) {
      this.el.textContent =
        `fps   ${this.fps.toFixed(0)}  (${this.ms.toFixed(1)} ms, worst ${(this.worst * 1000).toFixed(0)})\n` +
        `calls ${this.calls}\n` +
        `tris  ${(this.tris / 1000).toFixed(0)}k\n` +
        `tex   ${renderer.info.memory.textures}  geo ${renderer.info.memory.geometries}\n` +
        extra();
    }
    this.frames = 0;
    this.acc = 0;
    this.worst = 0;
  }
}
