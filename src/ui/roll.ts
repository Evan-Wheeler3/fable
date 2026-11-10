import type { Engine } from '../audio/engine';
import type { Synth } from '../audio/synth';
import { ROWS, degreeToMidi, isRootDegree, midiName, save, type Note, type Project } from '../state';
import { h } from './dom';

const ROW_H = 18;

/** Piano roll for one instrument. Rows are scale degrees, so everything stays in key. */
export function pianoRoll(p: Project, e: Engine, synth: Synth): { el: HTMLElement; playhead: (step: number) => void; redraw: () => void } {
  const steps = p.bars * 16;
  const track = synth.params;
  const midi = (d: number): number => degreeToMidi(p, synth.patch.baseMidi, d);
  const preview = (d: number, len = 0.3): void => {
    e.resume();
    synth.play(midi(d), e.ctx.currentTime + 0.01, len);
  };

  const labels = h('div', { class: 'rowhead keys' });
  for (let d = ROWS - 1; d >= 0; d--) {
    labels.append(h('button', { class: `keylabel ${isRootDegree(p, d) ? 'root' : ''}`, onpointerdown: () => preview(d, 0.5) }, midiName(midi(d))));
  }

  const notesEl = h('div', { class: 'notes' });
  const head = h('div', { class: 'playhead' });
  const stripes = h('div', {});
  for (let d = 0; d < ROWS; d++) {
    if (isRootDegree(p, d)) stripes.append(h('div', { class: 'rootrow', style: `top:${(ROWS - 1 - d) * ROW_H}px` }));
  }
  const redraw = (): void => {
    notesEl.replaceChildren(
      ...track.notes
        .filter((n) => n.s < steps)
        .map((n) => h('div', { class: 'note', style: `left:${(n.s / steps) * 100}%;width:calc(${(Math.min(n.l, steps - n.s) / steps) * 100}% - 2px);top:${(ROWS - 1 - n.d) * ROW_H + 1}px` })),
    );
  };
  const grid = h('div', {
    class: 'rollgrid',
    style: `height:${ROWS * ROW_H}px;--color:${synth.patch.color}`,
    onpointerdown: (ev: PointerEvent) => {
      const r = grid.getBoundingClientRect();
      const s = Math.max(0, Math.min(steps - 1, Math.floor(((ev.clientX - r.left) / r.width) * steps)));
      const d = ROWS - 1 - Math.max(0, Math.min(ROWS - 1, Math.floor((ev.clientY - r.top) / ROW_H)));
      const hit = track.notes.findIndex((n: Note) => n.d === d && s >= n.s && s < n.s + n.l);
      if (hit >= 0) track.notes.splice(hit, 1);
      else {
        track.notes.push({ s, d, l: Math.min(track.len, steps - s) });
        preview(d);
      }
      redraw();
      save(p);
    },
  }, stripes, notesEl, head);
  redraw();

  return {
    el: h('div', { class: 'grid roll', style: `--steps:${steps}` }, h('div', { class: 'drow' }, labels, h('div', { class: 'cells' }, grid))),
    playhead: (step) => {
      head.style.display = step < 0 ? 'none' : 'block';
      head.style.left = `${(step / steps) * 100}%`;
      head.style.width = `${100 / steps}%`;
    },
    redraw,
  };
}
