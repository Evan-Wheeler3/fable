import { DRUMS, type DrumKit } from '../audio/drums';
import type { Engine } from '../audio/engine';
import { save, type Project } from '../state';
import { h } from './dom';

/** Step grid for the drum kit. Returns the element and a playhead setter. */
export function drumGrid(p: Project, e: Engine, kit: DrumKit): { el: HTMLElement; playhead: (step: number) => void } {
  const steps = p.bars * 16;
  const cols: HTMLElement[][] = Array.from({ length: steps }, () => []);
  let drag: number | null = null; // value being painted while the pointer is down
  window.addEventListener('pointerup', () => (drag = null));

  const rows = DRUMS.map((name, i) => {
    const apply = (): void => kit.setLevel(i, p.drumVol[i]!, p.drumMute[i]!);
    apply();
    const mute = h('button', { class: `mini ${p.drumMute[i] ? 'on' : ''}`, title: `Mute ${name}`, onclick: () => {
      p.drumMute[i] = !p.drumMute[i];
      mute.classList.toggle('on', p.drumMute[i]!);
      apply();
      save(p);
    } }, 'M');
    const vol = h('input', { type: 'range', min: '0', max: '1.2', step: '0.01', class: 'rowvol', 'aria-label': `${name} volume`, oninput: () => {
      p.drumVol[i] = Number(vol.value);
      apply();
      save(p);
    } });
    vol.value = String(p.drumVol[i]);
    const head = h('div', { class: 'rowhead' },
      h('button', { class: 'pad', title: `Play ${name} (key ${i + 1})`, onclick: () => {
        e.resume();
        kit.trigger(i, e.ctx.currentTime + 0.01);
      } }, h('span', { class: 'key' }, String(i + 1)), name),
      mute, vol);
    const cells = h('div', { class: 'cells' });
    for (let s = 0; s < steps; s++) {
      const set = (v: number): void => {
        p.drums[i]![s] = v;
        cell.classList.toggle('on', !!v);
        save(p);
      };
      const cell = h('button', {
        class: `cell ${p.drums[i]![s] ? 'on' : ''} ${Math.floor(s / 4) % 2 ? 'alt' : ''} ${s % 16 === 0 ? 'bar' : ''}`,
        'aria-label': `${name} step ${s + 1}`,
        onpointerdown: (ev: PointerEvent) => {
          ev.preventDefault();
          drag = p.drums[i]![s] ? 0 : 1;
          set(drag);
          if (drag) {
            e.resume();
            kit.trigger(i, e.ctx.currentTime + 0.01);
          }
        },
        onpointerenter: () => drag !== null && set(drag),
      });
      cols[s]!.push(cell);
      cells.append(cell);
    }
    return h('div', { class: 'drow' }, head, cells);
  });

  let last = -1;
  return {
    el: h('div', { class: 'grid drums', style: `--steps:${steps}` }, ...rows),
    playhead: (step) => {
      if (step === last) return;
      cols[last]?.forEach((c) => c.classList.remove('ph'));
      cols[step]?.forEach((c) => c.classList.add('ph'));
      last = step;
    },
  };
}
