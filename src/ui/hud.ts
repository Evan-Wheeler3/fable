import { bus } from '../core/events';

/** Start overlay, toast line and the controls hint. */
export class Hud {
  private startEl: HTMLElement;
  private toastEl: HTMLElement;
  private toastTimer = 0;
  started = false;

  constructor(parent: HTMLElement, onStart: () => void, autostart: boolean) {
    this.startEl = document.createElement('div');
    this.startEl.className = 'start';
    this.startEl.innerHTML =
      '<h1>NEON <span>DRIZZLE</span></h1><p>CLICK TO STEP INTO THE RAIN</p>' +
      '<small>WASD move &middot; MOUSE look &middot; SHIFT run &middot; C crouch &middot; V first person<br>' +
      '1-4 quality &middot; M mute &middot; ESC release mouse</small>';
    parent.appendChild(this.startEl);

    this.toastEl = document.createElement('div');
    this.toastEl.className = 'toast';
    parent.appendChild(this.toastEl);

    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'WASD · SHIFT run · C crouch · V view · 1-4 quality · M mute';
    parent.appendChild(hint);

    const start = (): void => {
      this.started = true;
      this.startEl.classList.add('hidden');
      onStart();
    };
    this.startEl.addEventListener('click', start);
    if (autostart) {
      this.started = true;
      this.startEl.classList.add('hidden');
    }
    bus.on('toast', ({ text }) => this.toast(text));
  }

  toast(text: string): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), 1800);
  }
}
