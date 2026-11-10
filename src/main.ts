import * as THREE from 'three';
import { AudioBed } from './core/audio';
import { FollowCamera } from './core/camera';
import { DebugPanel } from './core/debug';
import { bus } from './core/events';
import { Input } from './core/input';
import { startLoop } from './core/loop';
import { QUALITY, QUALITY_ORDER, detectQuality, type QualityName } from './core/quality';
import { createRenderer, effectivePixelRatio } from './core/renderer';
import { Rng } from './core/rng';
import { saveSettings, settings } from './core/store';
import { Player } from './entities/player';
import { buildAtmosphere, installHeightFog } from './fx/atmosphere';
import { WetGround } from './fx/ground';
import { Post } from './fx/post';
import { Rain } from './fx/rain';
import { Hud } from './ui/hud';
import { LightPool } from './world/lights';
import { ROAD_HALF, buildStreet, groundY } from './world/street';

const params = new URLSearchParams(location.search);
const debug = params.has('debug');
const seed = Number(params.get('seed') ?? 1337) || 1337;

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLElement;
const renderer = createRenderer(canvas);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);

const qParam = params.get('q') as QualityName | null;
let qName: QualityName =
  qParam && qParam in QUALITY ? qParam : settings.quality === 'auto' ? detectQuality(renderer.getContext()) : settings.quality;
let quality = QUALITY[qName];

// World
installHeightFog();
buildAtmosphere(scene);
const wet = new WetGround(ROAD_HALF);
const street = buildStreet(seed, wet);
scene.add(street.group);
const rainRng = new Rng(seed ^ 0x9e37);
const rain = new Rain(ROAD_HALF, () => rainRng.next());
scene.add(rain.streaks, rain.splashes);
wet.hide.push(...street.ground, rain.streaks, rain.splashes);
const lights = new LightPool(scene, street.sources, quality.lights);

const player = new Player();
player.teleport(8.6, 70, groundY(8.6));
scene.add(player.group);
const follow = new FollowCamera(camera);

const input = new Input(canvas);
const audio = new AudioBed();
const post = new Post(renderer, scene, camera, quality);
const panel = new DebugPanel(debug, ui);
const hud = new Hud(
  ui,
  () => {
    input.requestLock();
    audio.start(settings.volume);
  },
  debug || params.has('autostart'),
);
canvas.addEventListener('click', () => {
  if (!hud.started) return;
  input.requestLock();
  audio.start(settings.volume);
});
bus.on('footstep', ({ run }) => audio.footstep(run));
bus.on('toast', () => audio.blip());

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pr = effectivePixelRatio(quality);
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  post.setSize(w, h);
  wet.setQuality(quality.reflScale, w * pr, h * pr);
  camera.aspect = w / h;
  camera.far = quality.far;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

function applyQuality(name: QualityName, persist: boolean): void {
  qName = name;
  quality = QUALITY[name];
  post.build(quality);
  lights.resize(quality.lights);
  rain.setCounts(quality.rainCount * settings.rain, quality.splashCount * settings.rain);
  resize();
  if (persist) {
    settings.quality = name;
    saveSettings();
  }
  bus.emit('quality', { name });
}

let time = 0;
function update(dt: number): void {
  time += dt;
  QUALITY_ORDER.forEach((n, i) => {
    if (!input.pressed(`Digit${i + 1}`)) return;
    applyQuality(n, true);
    bus.emit('toast', { text: `quality: ${n}` });
  });
  if (input.pressed('KeyV')) follow.first = !follow.first;
  if (input.pressed('KeyM')) bus.emit('toast', { text: audio.toggleMute() ? 'muted' : 'sound on' });
  if (hud.started) player.update(dt, input, follow.yaw, street.colliders, groundY);
  lights.update(dt, player.pos.x, player.pos.z);
  input.endStep();
}

function render(dt: number, alpha: number): void {
  const l = input.look(dt);
  follow.look(l.x, l.y);
  player.render(alpha, dt);
  follow.update(dt, player, street.colliders);
  street.tick(time);
  rain.update(time, camera);
  renderer.info.reset();
  wet.render(renderer, scene, camera, time);
  post.render(dt);
  panel.frame(
    dt,
    renderer,
    () => `q     ${qName}\nseed  ${seed}\npos   ${player.pos.x.toFixed(1)}, ${player.pos.z.toFixed(1)}`,
  );
}

applyQuality(qName, false);
startLoop(update, render);

// Automation helpers (screenshots, tests). See scripts/screenshot.mjs.
const game = {
  ready: true,
  seed,
  scene,
  camera,
  renderer,
  player,
  follow,
  lights,
  setQuality: (n: QualityName) => applyQuality(n, false),
  /** Free camera at a fixed pose. The light pool follows `focus` (defaults to the look target). */
  setCam(px: number, py: number, pz: number, tx: number, ty: number, tz: number): void {
    follow.free = true;
    player.group.visible = true;
    camera.position.set(px, py, pz);
    camera.lookAt(tx, ty, tz);
  },
  /** Hand the camera back to the player. */
  followCam(yaw = 0, pitch = 0.1): void {
    follow.free = false;
    follow.yaw = yaw;
    follow.pitch = pitch;
  },
  teleport(x: number, z: number): void {
    player.teleport(x, z, groundY(x));
  },
  shots: {
    street: () => (game.teleport(3, 52), game.setCam(-1.5, 1.7, 62, 1, 7, 0)),
    sidewalk: () => (game.teleport(8.2, 20), game.setCam(9.4, 1.75, 27, 5, 3.5, -20)),
    puddle: () => (game.teleport(2, 4), game.setCam(-2.5, 0.45, 12, 1.5, 4, -30)),
    high: () => (game.teleport(0, 40), game.setCam(-4, 38, 105, 2, 18, -30)),
    player: () => (game.teleport(7.6, -20), game.followCam(0.3, 0.08)),
  } as Record<string, () => void>,
  shot(name: string): void {
    game.shots[name]?.();
  },
  stats: () => ({ fps: +panel.fps.toFixed(1), ms: +panel.ms.toFixed(1), calls: panel.calls, tris: panel.tris, quality: qName }),
};
declare global {
  interface Window {
    __game: typeof game;
  }
}
window.__game = game;
