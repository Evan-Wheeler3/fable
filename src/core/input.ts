/** Keyboard, mouse (pointer lock) and basic gamepad input. */
export class Input {
  private keys = new Set<string>();
  private pressedKeys = new Set<string>();
  private mdx = 0;
  private mdy = 0;
  locked = false;

  constructor(private el: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
      if (!e.repeat) this.pressedKeys.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.el;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mdx += e.movementX;
      this.mdy += e.movementY;
    });
  }

  requestLock(): void {
    // Rejects in headless/automation; that is fine.
    const p = this.el.requestPointerLock() as unknown as Promise<void> | undefined;
    p?.catch?.(() => undefined);
  }

  down(code: string): boolean {
    return this.keys.has(code);
  }

  /** True once per key press. Cleared by endStep(). */
  pressed(code: string): boolean {
    return this.pressedKeys.has(code);
  }

  private pad(): Gamepad | null {
    const pads = navigator.getGamepads?.() ?? [];
    for (const p of pads) if (p && p.connected) return p;
    return null;
  }

  padButton(i: number): boolean {
    return this.pad()?.buttons[i]?.pressed ?? false;
  }

  /** Movement axes: x = strafe right, y = forward. Length <= 1. */
  move(): { x: number; y: number } {
    let x = (this.down('KeyD') || this.down('ArrowRight') ? 1 : 0) - (this.down('KeyA') || this.down('ArrowLeft') ? 1 : 0);
    let y = (this.down('KeyW') || this.down('ArrowUp') ? 1 : 0) - (this.down('KeyS') || this.down('ArrowDown') ? 1 : 0);
    const p = this.pad();
    if (p) {
      const dz = (v: number): number => (Math.abs(v) < 0.15 ? 0 : v);
      x += dz(p.axes[0] ?? 0);
      y -= dz(p.axes[1] ?? 0);
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  /** Look delta in radians since last call (mouse + right stick). */
  look(dt: number): { x: number; y: number } {
    let x = this.mdx * 0.0022;
    let y = this.mdy * 0.0022;
    this.mdx = this.mdy = 0;
    const p = this.pad();
    if (p) {
      const dz = (v: number): number => (Math.abs(v) < 0.15 ? 0 : v);
      x += dz(p.axes[2] ?? 0) * 2.6 * dt;
      y += dz(p.axes[3] ?? 0) * 1.8 * dt;
    }
    return { x, y };
  }

  endStep(): void {
    this.pressedKeys.clear();
  }
}
