import * as THREE from 'three';
import { HOLO_ADS } from '../data/names';
import { FOG_DENSITY } from '../fx/atmosphere';
import type { LightSource } from './lights';

const COLORS: [string, string][] = [
  ['#2ff3ff', '#a26bff'],
  ['#ff2d95', '#ffae3b'],
  ['#7dff5a', '#2ff3ff'],
  ['#ffae3b', '#ff2d95'],
];

function drawAds(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1024;
  const ctx = cv.getContext('2d')!;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  HOLO_ADS.forEach(([title, tag], i) => {
    const x = (i % 2) * 512, y = Math.floor(i / 2) * 512;
    const [a, b] = COLORS[i]!;
    const g = ctx.createLinearGradient(x, y, x + 512, y + 512);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, 512, 512);
    ctx.clip();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = g;
    ctx.fillRect(x, y, 512, 512);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = g;
    ctx.shadowColor = a;
    ctx.shadowBlur = 20;
    // abstract emblem: nested rings + bars
    ctx.lineWidth = 10;
    for (let r = 50; r <= 130; r += 40) {
      ctx.beginPath();
      ctx.arc(x + 256, y + 190, r, i * 0.7 + r * 0.02, i * 0.7 + r * 0.02 + Math.PI * 1.5);
      ctx.stroke();
    }
    ctx.lineWidth = 6;
    ctx.strokeRect(x + 16, y + 16, 480, 480);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px "Arial Narrow", Arial, sans-serif';
    ctx.fillText(title, x + 256, y + 380, 440);
    ctx.shadowBlur = 8;
    ctx.fillStyle = g;
    ctx.font = '30px "Courier New", monospace';
    ctx.fillText(tag, x + 256, y + 445, 440);
    ctx.restore();
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Big translucent holographic ad panels (additive, scanlined), one draw call. */
export class HoloBatch {
  private pos: number[] = [];
  private uv: number[] = [];
  private index: number[] = [];
  readonly uniforms = { map: { value: null as THREE.Texture | null }, uTime: { value: 0 } };
  sources: LightSource[] = [];

  add(ad: number, x: number, y: number, z: number, rotY: number, size: number): void {
    const cos = Math.cos(rotY), sin = Math.sin(rotY);
    const u0 = (ad % 2) * 0.5, v1 = 1 - Math.floor(ad / 2) * 0.5;
    const base = this.pos.length / 3;
    const h = size / 2;
    for (const [lx, ly, u, v] of [[-h, -h, u0, v1 - 0.5], [h, -h, u0 + 0.5, v1 - 0.5], [h, h, u0 + 0.5, v1], [-h, h, u0, v1]] as const) {
      this.pos.push(x + lx * cos, y + ly, z - lx * sin);
      this.uv.push(u, v);
    }
    this.index.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.sources.push({ x: x + sin * 3, y: y - size * 0.3, z: z + cos * 3, color: new THREE.Color(COLORS[ad % 4]![0]), power: 1.4 });
  }

  build(): THREE.Mesh {
    this.uniforms.map.value = drawAds();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    geo.setIndex(this.index);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv;
varying float vDepth;
varying float vY;
void main() {
  vUv = uv;
  vY = position.y;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`,
      fragmentShader: `uniform sampler2D map;
uniform float uTime;
varying vec2 vUv;
varying float vDepth;
varying float vY;
void main() {
  float band = step(0.985, fract(sin(floor(uTime * 9.0) * 91.7 + floor(vY * 2.0) * 7.3) * 43758.5));
  vec4 t = texture2D(map, vUv + vec2(band * 0.02, 0.0));
  float scan = 0.7 + 0.3 * sin(vY * 28.0 - uTime * 5.0);
  float flick = 0.9 + 0.1 * sin(uTime * 23.0) * sin(uTime * 3.1);
  float fog = exp(-pow(vDepth * ${(FOG_DENSITY * 0.8).toFixed(5)}, 2.0));
  gl_FragColor = vec4(t.rgb * t.a * scan * flick * fog * 1.5, 1.0);
}`,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    return mesh;
  }
}
