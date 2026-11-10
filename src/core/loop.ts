/** Fixed-timestep update with a variable-rate render. */
export const STEP = 1 / 60;

export function startLoop(update: (dt: number) => void, render: (dt: number, alpha: number) => void): void {
  let last = performance.now();
  let acc = 0;
  const frame = (now: number): void => {
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      update(STEP);
      acc -= STEP;
      steps++;
    }
    if (acc > STEP) acc = 0; // drop backlog rather than spiral
    render(dt, acc / STEP);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
