import * as THREE from 'three';
import { DebugPanel } from './core/debug';
import { bus } from './core/events';
import { Input } from './core/input';
import { startLoop } from './core/loop';
import { QUALITY, QUALITY_ORDER, detectQuality, type QualityName } from './core/quality';
import { createRenderer, effectivePixelRatio } from './core/renderer';
import { saveSettings, settings } from './core/store';
import { Post } from './fx/post';
import { Hud } from './ui/hud';
import { buildTestScene } from './world/testScene';

const params = new URLSearchParams(location.search);
const debug = params.has('debug');
const seed = Number(params.get('seed') ?? 1337) || 1337;

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLElement;
const renderer = createRenderer(canvas);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
camera.position.set(0, 5, 14);
camera.lookAt(0, 2, 0);

const qParam = params.get('q') as QualityName | null;
let qName: QualityName =
  qParam && qParam in QUALITY ? qParam : settings.quality === 'auto' ? detectQuality(renderer.getContext()) : settings.quality;
let quality = QUALITY[qName];

const input = new Input(canvas);
const post = new Post(renderer, scene, camera, quality);
const panel = new DebugPanel(debug, ui);
const hud = new Hud(ui, () => input.requestLock(), debug || params.has('autostart'));
const tick = buildTestScene(scene);

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setPixelRatio(effectivePixelRatio(quality));
  renderer.setSize(w, h, false);
  post.setSize(w, h);
  camera.aspect = w / h;
  camera.far = quality.far;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

function setQuality(name: QualityName, persist = true): void {
  qName = name;
  quality = QUALITY[name];
  post.build(quality);
  resize();
  if (persist) {
    settings.quality = name;
    saveSettings();
  }
  bus.emit('quality', { name });
  bus.emit('toast', { text: `quality: ${name}` });
}

let time = 0;
function update(dt: number): void {
  time += dt;
  QUALITY_ORDER.forEach((n, i) => {
    if (input.pressed(`Digit${i + 1}`)) setQuality(n);
  });
  canvas.onclick = () => hud.started && input.requestLock();
  tick(time);
  input.endStep();
}

function render(dt: number): void {
  renderer.info.reset();
  post.render(dt);
  panel.frame(dt, renderer, () => `q     ${qName}\nseed  ${seed}`);
}

resize();
startLoop(update, render);

// Automation helpers (screenshots, tests). See scripts/screenshot.mjs.
const game = {
  ready: true,
  seed,
  scene,
  camera,
  renderer,
  setQuality: (n: QualityName) => setQuality(n, false),
  setCam(px: number, py: number, pz: number, tx: number, ty: number, tz: number): void {
    camera.position.set(px, py, pz);
    camera.lookAt(tx, ty, tz);
  },
  shots: { test: () => game.setCam(0, 5, 14, 0, 2, 0), low: () => game.setCam(9, 1.2, 9, 0, 2.5, 0) } as Record<string, () => void>,
  shot(name: string): void {
    game.shots[name]?.();
  },
  stats: () => ({ fps: panel.fps, ms: panel.ms, calls: panel.calls, tris: panel.tris, quality: qName }),
};
declare global {
  interface Window {
    __game: typeof game;
  }
}
window.__game = game;
