import { DRUMS, DrumKit } from './audio/drums';
import { Engine } from './audio/engine';
import { PATCHES } from './audio/patches';
import { Recorder } from './audio/recorder';
import { Synth, type Held } from './audio/synth';
import { Sequencer } from './seq';
import { ROOTS, ROWS, SCALES, degreeToMidi, demo, empty, load, save, type Project } from './state';
import { h, select, slider } from './ui/dom';
import { drumGrid } from './ui/drumgrid';
import { pianoRoll } from './ui/roll';

const engine = new Engine();
let project: Project = load();
const kit = new DrumKit(engine);
const synths = PATCHES.map((p, i) => new Synth(engine, p, project.tracks[i]!));
const seq = new Sequencer(engine, kit, synths, project);
const rec = new Recorder(engine);
const app = document.getElementById('app')!;

let selected = 0;
let capture = false;
let keyShift = 0;
let playheads: ((step: number) => void)[] = [];
let redrawRoll = (): void => undefined;
const takes: { url: string; name: string; seconds: number }[] = [];

const playBtn = h('button', { class: 'btn play', onclick: () => togglePlay() }, '▶ Play');
const recBtn = h('button', { class: 'btn rec', onclick: () => void toggleRec() }, '● Rec');
const scope = h('canvas', { class: 'scope', width: 260, height: 54 });
const takesEl = h('div', { class: 'takes' });
const body = h('div', { class: 'body' });

function togglePlay(): void {
  if (seq.playing) seq.stop();
  else seq.start();
  playBtn.textContent = seq.playing ? '■ Stop' : '▶ Play';
  playBtn.classList.toggle('on', seq.playing);
}

async function toggleRec(): Promise<void> {
  engine.resume();
  if (!rec.recording) {
    await rec.start();
    if (!seq.playing) togglePlay();
    recBtn.classList.add('on');
    return;
  }
  const take = rec.stop();
  recBtn.classList.remove('on');
  recBtn.textContent = '● Rec';
  if (!take) return;
  takes.unshift({ url: URL.createObjectURL(take.blob), name: `drizzle-take-${takes.length + 1}.wav`, seconds: take.seconds });
  renderTakes();
}

const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function renderTakes(): void {
  takesEl.replaceChildren(
    h('h2', {}, 'Takes'),
    ...(takes.length
      ? takes.map((t, i) =>
          h('div', { class: 'take' },
            h('span', { class: 'tname' }, `${t.name} · ${mmss(t.seconds)}`),
            h('audio', { controls: true, src: t.url }),
            h('a', { class: 'btn small', href: t.url, download: t.name }, '⬇ Download WAV'),
            h('button', { class: 'btn small ghost', onclick: () => {
              URL.revokeObjectURL(t.url);
              takes.splice(i, 1);
              renderTakes();
            } }, 'Delete'),
          ),
        )
      : [h('p', { class: 'hint' }, 'Press ● Rec to record everything you hear. Press it again to stop, then download the WAV here.')]),
  );
}

function setProject(p: Project): void {
  project = p;
  seq.project = p;
  synths.forEach((s, i) => {
    s.params = p.tracks[i]!;
    s.apply();
  });
  save(p);
  render();
}

function header(): HTMLElement {
  const p = project;
  const change = (fn: () => void, rebuild = false) => (): void => {
    fn();
    save(p);
    if (rebuild) renderBody();
  };
  const cap = h('button', { class: `btn small ${capture ? 'on' : ''}`, title: 'While playing, notes you play on the keyboard are written into the pattern', onclick: () => {
    capture = !capture;
    cap.classList.toggle('on', capture);
  } }, 'Capture keys');
  return h('header', {},
    h('div', { class: 'brand' }, h('h1', {}, 'DRIZZLE ', h('span', {}, 'SYNTH')), h('p', {}, 'neon house workstation')),
    h('div', { class: 'transport' }, playBtn, recBtn, scope),
    h('div', { class: 'globals' },
      slider('Tempo', 80, 150, 1, p.bpm, (v) => change(() => {
        p.bpm = v;
        engine.setBpm(v);
      })(), (v) => `${v} bpm`),
      slider('Swing', 0, 0.6, 0.01, p.swing, (v) => change(() => (p.swing = v))(), (v) => `${Math.round(v * 100)}%`),
      slider('Master', 0, 1, 0.01, p.master, (v) => change(() => {
        p.master = v;
        engine.setMaster(v);
      })(), (v) => `${Math.round(v * 100)}%`),
      select('Bars', ['1', '2', '4'], String(p.bars), (v) => change(() => (p.bars = Number(v)), true)()),
      select('Key', ROOTS, ROOTS[p.root]!, (v) => change(() => (p.root = ROOTS.indexOf(v)), true)()),
      select('Scale', Object.keys(SCALES), p.scale, (v) => change(() => (p.scale = v), true)()),
      cap,
      h('button', { class: 'btn small ghost', onclick: () => setProject(demo()) }, 'Load demo'),
      h('button', { class: 'btn small ghost', onclick: () => confirm('Clear every pattern?') && setProject(empty()) }, 'Clear all'),
    ),
  );
}

function instrumentPanel(): HTMLElement {
  const synth = synths[selected]!;
  const t = synth.params;
  const set = (fn: (v: number) => void) => (v: number): void => {
    fn(v);
    synth.apply();
    save(project);
  };
  const tabs = h('div', { class: 'tabs' }, ...synths.map((s, i) =>
    h('button', { class: `tab ${i === selected ? 'on' : ''}`, style: `--color:${s.patch.color}`, onclick: () => {
      selected = i;
      renderBody();
    } }, h('b', {}, s.patch.name), h('small', {}, s.params.mute ? 'muted' : s.patch.hint)),
  ));
  const roll = pianoRoll(project, engine, synth);
  playheads.push(roll.playhead);
  redrawRoll = roll.redraw;
  const lens: Record<string, number> = { '1/16': 1, '1/8': 2, '1/4': 4, '1/2': 8, '1 bar': 16 };
  const mute = h('button', { class: `btn small ${t.mute ? 'on' : ''}`, onclick: () => {
    t.mute = !t.mute;
    synth.apply();
    save(project);
    renderBody();
  } }, 'Mute');
  const knobs = h('div', { class: 'knobs', style: `--color:${synth.patch.color}` },
    slider('Volume', 0, 1.2, 0.01, t.vol, set((v) => (t.vol = v))),
    slider('Cutoff', 0, 1, 0.001, Math.log(t.cutoff / 80) / Math.log(100), set((v) => (t.cutoff = 80 * 100 ** v)), (v) => `${Math.round(80 * 100 ** v)} Hz`),
    slider('Resonance', 0.1, 12, 0.1, t.res, set((v) => (t.res = v)), (v) => v.toFixed(1)),
    slider('Attack', 0.001, 1.5, 0.001, t.attack, set((v) => (t.attack = v)), (v) => `${v.toFixed(2)} s`),
    slider('Release', 0.03, 3, 0.01, t.release, set((v) => (t.release = v)), (v) => `${v.toFixed(2)} s`),
    slider('Reverb', 0, 1, 0.01, t.reverb, set((v) => (t.reverb = v))),
    slider('Delay', 0, 1, 0.01, t.delay, set((v) => (t.delay = v))),
    slider('Pump', 0, 0.9, 0.01, t.pump, set((v) => (t.pump = v))),
    select('Draw length', Object.keys(lens), Object.keys(lens).find((k) => lens[k] === t.len) ?? '1/8', (v) => {
      t.len = lens[v]!;
      save(project);
    }),
    mute,
    h('button', { class: 'btn small ghost', onclick: () => {
      t.notes = [];
      save(project);
      roll.redraw();
    } }, 'Clear notes'),
  );
  return h('section', { class: 'panel', style: `--color:${synth.patch.color}` }, h('h2', {}, 'Instruments'), tabs, knobs, roll.el,
    h('p', { class: 'hint' }, 'Click the grid to draw or erase notes. Keyboard: A S D F G H J K L play notes, Q–P the octave above, Z / X shift octave, 1–8 drums, Space play/stop.'));
}

function renderBody(): void {
  playheads = [];
  const drums = drumGrid(project, engine, kit);
  playheads.push(drums.playhead);
  body.replaceChildren(h('section', { class: 'panel', style: '--color:#4df3ff' }, h('h2', {}, 'Drums'), drums.el), instrumentPanel(), takesEl);
}

function render(): void {
  engine.setBpm(project.bpm);
  engine.setMaster(project.master);
  app.replaceChildren(header(), body);
  renderBody();
  renderTakes();
}

// Live keyboard: rows of keys map to scale degrees so you cannot hit a wrong note.
const LOW = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'];
const HIGH = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'];
const held = new Map<string, Held>();
window.addEventListener('keydown', (ev) => {
  const tag = (ev.target as HTMLElement).tagName;
  if (tag === 'SELECT' || ev.metaKey || ev.ctrlKey || ev.altKey) return;
  if (ev.code === 'Space') {
    ev.preventDefault();
    if (!ev.repeat) togglePlay();
    return;
  }
  if (ev.repeat) return;
  engine.resume();
  const n = (SCALES[project.scale] ?? SCALES.Minor!).length;
  if (ev.code === 'KeyZ') keyShift = Math.max(0, keyShift - n);
  if (ev.code === 'KeyX') keyShift = Math.min(n, keyShift + n);
  const drum = /^Digit([1-8])$/.exec(ev.code);
  if (drum) kit.trigger(Number(drum[1]) - 1, engine.ctx.currentTime + 0.005);
  const lo = LOW.indexOf(ev.code);
  const hi = HIGH.indexOf(ev.code);
  if (lo < 0 && hi < 0) return;
  const d = (lo >= 0 ? lo : hi + n) + keyShift;
  if (d >= ROWS || held.has(ev.code)) return;
  const synth = synths[selected]!;
  held.set(ev.code, synth.play(degreeToMidi(project, synth.patch.baseMidi, d), engine.ctx.currentTime + 0.005));
  if (capture && seq.playing && seq.current >= 0) {
    const t = synth.params;
    if (!t.notes.some((x) => x.s === seq.current && x.d === d)) t.notes.push({ s: seq.current, d, l: Math.min(t.len, seq.steps - seq.current) });
    redrawRoll();
    save(project);
  }
});
window.addEventListener('keyup', (ev) => {
  held.get(ev.code)?.release();
  held.delete(ev.code);
});
window.addEventListener('blur', () => {
  held.forEach((v) => v.release());
  held.clear();
});
window.addEventListener('pointerdown', () => engine.resume());

// Playhead, record timer and oscilloscope.
const wave = new Uint8Array(engine.analyser.fftSize);
const g = scope.getContext('2d')!;
function frame(): void {
  const step = seq.poll();
  playheads.forEach((fn) => fn(step));
  if (rec.recording) recBtn.textContent = `■ ${mmss(rec.elapsed())}`;
  engine.analyser.getByteTimeDomainData(wave);
  g.clearRect(0, 0, scope.width, scope.height);
  g.strokeStyle = '#4df3ff';
  g.shadowColor = '#4df3ff';
  g.shadowBlur = 8;
  g.lineWidth = 1.6;
  g.beginPath();
  for (let x = 0; x < scope.width; x++) {
    const y = (wave[Math.floor((x / scope.width) * wave.length)]! / 255) * scope.height;
    if (x) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
  requestAnimationFrame(frame);
}

render();
requestAnimationFrame(frame);

// Handles for automated checks.
Object.assign(window, { __synth: { engine, seq, rec, takes, drums: DRUMS, project: () => project } });
