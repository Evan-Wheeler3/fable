import * as THREE from 'three';
import type { Rng } from '../core/rng';
import { BLADE_WORDS, shopNames } from '../data/names';
import type { LightSource } from './lights';

export const NEON = ['#ff2d95', '#2ff3ff', '#ffae3b', '#7dff5a', '#a26bff', '#ff5a6e', '#9fd8ff'];
const FONTS = ['"Arial Narrow", "Helvetica Neue", Arial, sans-serif', '"Courier New", monospace', 'Georgia, serif', 'Impact, "Arial Black", sans-serif'];

const ATLAS = 2048;
const FLAT_W = 512, FLAT_H = 128, FLAT_COUNT = 32; // top half: 4 x 8
const BLADE_W = 128, BLADE_H = 512, BLADE_COUNT = 32; // bottom half: 16 x 2

interface Cell {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  color: THREE.Color;
}

function glowText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, outline: boolean): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  if (outline) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.strokeText(text, x, y);
    ctx.shadowBlur = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.strokeText(text, x, y);
  } else {
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(text, x, y);
  }
  ctx.shadowBlur = 0;
}

function frame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = '#07060d';
  ctx.fillRect(x, y, w, h);
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(x + 9, y + 9, w - 18, h - 18, 14);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function buildAtlas(rng: Rng): { tex: THREE.CanvasTexture; flat: Cell[]; blade: Cell[] } {
  const cv = document.createElement('canvas');
  cv.width = cv.height = ATLAS;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, ATLAS, ATLAS);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cell = (x: number, y: number, w: number, h: number, color: string): Cell => ({
    u0: x / ATLAS,
    u1: (x + w) / ATLAS,
    v0: 1 - (y + h) / ATLAS,
    v1: 1 - y / ATLAS,
    color: new THREE.Color(color),
  });

  const flat: Cell[] = [];
  shopNames(rng, FLAT_COUNT).forEach((name, i) => {
    const x = (i % 4) * FLAT_W;
    const y = Math.floor(i / 4) * FLAT_H;
    const color = rng.pick(NEON);
    frame(ctx, x, y, FLAT_W, FLAT_H, rng.chance(0.5) ? color : rng.pick(NEON));
    let size = 62;
    ctx.font = `bold ${size}px ${rng.pick(FONTS)}`;
    const w = ctx.measureText(name).width;
    if (w > FLAT_W - 70) {
      size *= (FLAT_W - 70) / w;
      ctx.font = ctx.font.replace(/\d+(\.\d+)?px/, `${size.toFixed(0)}px`);
    }
    glowText(ctx, name, x + FLAT_W / 2, y + FLAT_H / 2 + 3, color, rng.chance(0.4));
    flat.push(cell(x, y, FLAT_W, FLAT_H, color));
  });

  const blade: Cell[] = [];
  for (let i = 0; i < BLADE_COUNT; i++) {
    const x = (i % 16) * BLADE_W;
    const y = ATLAS / 2 + Math.floor(i / 16) * BLADE_H;
    const color = rng.pick(NEON);
    const word = BLADE_WORDS[i % BLADE_WORDS.length]!;
    frame(ctx, x, y, BLADE_W, BLADE_H, color);
    const step = (BLADE_H - 60) / word.length;
    const size = Math.min(84, step * 0.95);
    ctx.font = `bold ${size.toFixed(0)}px ${rng.pick(FONTS)}`;
    const outline = rng.chance(0.3);
    [...word].forEach((ch, k) => glowText(ctx, ch, x + BLADE_W / 2, y + 30 + step * (k + 0.5), color, outline));
    blade.push(cell(x, y, BLADE_W, BLADE_H, color));
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, flat, blade };
}

/** All neon signs in one draw call: merged quads sampling a generated atlas. */
export class SignBatch {
  private pos: number[] = [];
  private uv: number[] = [];
  private phase: number[] = [];
  private index: number[] = [];
  private atlas: ReturnType<typeof buildAtlas>;
  readonly uniforms = { map: { value: null as THREE.Texture | null }, uTime: { value: 0 }, uBoost: { value: 2.1 } };
  sources: LightSource[] = [];

  constructor(private rng: Rng) {
    this.atlas = buildAtlas(rng.fork());
    this.uniforms.map.value = this.atlas.tex;
  }

  private quad(c: Cell, x: number, y: number, z: number, rotY: number, w: number, h: number, phase: number): void {
    const cos = Math.cos(rotY), sin = Math.sin(rotY);
    const base = this.pos.length / 3;
    const corners: [number, number, number, number][] = [
      [-w / 2, -h / 2, c.u0, c.v0],
      [w / 2, -h / 2, c.u1, c.v0],
      [w / 2, h / 2, c.u1, c.v1],
      [-w / 2, h / 2, c.u0, c.v1],
    ];
    for (const [lx, ly, u, v] of corners) {
      this.pos.push(x + lx * cos, y + ly, z - lx * sin);
      this.uv.push(u, v);
      this.phase.push(phase);
    }
    this.index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  private source(c: Cell, x: number, y: number, z: number, rotY: number, out: number, power: number): void {
    this.sources.push({ x: x + Math.sin(rotY) * out, y, z: z + Math.cos(rotY) * out, color: c.color, power });
  }

  /** Flat sign on a wall. rotY is the direction the sign faces (0 = +Z). */
  addFlat(x: number, y: number, z: number, rotY: number, width: number): void {
    const c = this.rng.pick(this.atlas.flat);
    this.quad(c, x, y, z, rotY, width, width / 4, this.rng.next());
    this.source(c, x, y, z, rotY, 1.6, 1);
  }

  /** Vertical blade sign, readable from both sides. */
  addBlade(x: number, y: number, z: number, rotY: number, width: number): void {
    const c = this.rng.pick(this.atlas.blade);
    const ph = this.rng.next();
    const ox = Math.sin(rotY) * 0.06, oz = Math.cos(rotY) * 0.06;
    this.quad(c, x + ox, y, z + oz, rotY, width, width * 4, ph);
    this.quad(c, x - ox, y, z - oz, rotY + Math.PI, width, width * 4, ph);
    this.source(c, x, y - width, z, rotY, 0, 0.8);
  }

  build(): THREE.Mesh {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(this.phase, 1));
    geo.setIndex(this.index);
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]),
      fog: true,
      vertexShader: `attribute float aPhase;
varying vec2 vUv;
varying float vPhase;
#include <common>
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vPhase = aPhase;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
      fragmentShader: `uniform sampler2D map;
uniform float uTime;
uniform float uBoost;
varying vec2 vUv;
varying float vPhase;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec3 c = texture2D(map, vUv).rgb;
  float fl = 0.95 + 0.05 * sin(uTime * 3.0 + vPhase * 40.0);
  if (vPhase > 0.8) {
    float n = fract(sin(floor(uTime * 13.0) * 12.9898 + vPhase * 78.233) * 43758.5453);
    fl *= n > 0.22 ? 1.0 : 0.2;
  }
  gl_FragColor = vec4(c * uBoost * fl, 1.0);
  #include <fog_fragment>
}`,
    });
    Object.assign(mat.uniforms, this.uniforms);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    return mesh;
  }
}
