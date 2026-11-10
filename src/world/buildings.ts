import * as THREE from 'three';

interface Spec {
  cx: number;
  cz: number;
  w: number;
  d: number;
  h: number;
  color: THREE.Color;
  seed: number;
}

/** Collects boxes and emits one InstancedMesh with a procedural lit-window facade. */
export class BuildingBatch {
  private specs: Spec[] = [];

  add(cx: number, cz: number, w: number, d: number, h: number, color: THREE.Color, seed: number): void {
    this.specs.push({ cx, cz, w, d, h, color, seed });
  }

  build(litFraction = 0.3): THREE.InstancedMesh {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    // Drop the bottom face (indices 18..23) so the planar reflection camera can see up past it.
    const idx = Array.from(geo.index!.array);
    idx.splice(18, 6);
    geo.setIndex(idx);
    const seeds = new Float32Array(this.specs.length);
    const mesh = new THREE.InstancedMesh(geo, makeFacadeMaterial(litFraction), this.specs.length);
    const m = new THREE.Matrix4();
    this.specs.forEach((s, i) => {
      m.makeScale(s.w, s.h, s.d).setPosition(s.cx, s.h / 2, s.cz);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, s.color);
      seeds[i] = s.seed;
    });
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    mesh.frustumCulled = false;
    return mesh;
  }
}

function makeFacadeMaterial(lit: number): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.25 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aSeed;
varying vec2 vBuv;
varying vec2 vBdim;
varying float vWall;
varying float vSeed;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vec3 bScl = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
vec3 bPos = (position + 0.5) * bScl;
float bIsX = step(0.5, abs(normal.x));
vBuv = vec2(mix(bPos.x, bPos.z, bIsX), bPos.y);
vBdim = vec2(mix(bScl.x, bScl.z, bIsX), bScl.y);
vWall = 1.0 - step(0.5, abs(normal.y));
vSeed = aSeed + bIsX * 17.0 + step(0.0, normal.x + normal.z) * 31.0;`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec2 vBuv;
varying vec2 vBdim;
varying float vWall;
varying float vSeed;
float bHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 bEmit = vec3(0.0);
float bSeed = 0.0;
float bGlass = 0.0;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  bSeed = floor(vSeed + 0.5);
  vec2 cell = vec2(1.9, 3.3);
  float inX = step(0.7, vBuv.x) * step(vBuv.x, vBdim.x - 0.7);
  if (vBuv.y > 4.2) {
    vec2 g = vec2(vBuv.x, vBuv.y - 4.2) / cell;
    vec2 id = floor(g);
    vec2 f = fract(g);
    float win = step(0.16, f.x) * step(f.x, 0.84) * step(0.3, f.y) * step(f.y, 0.76);
    win *= inX * step(vBuv.y, vBdim.y - 1.6) * vWall;
    float h1 = bHash(id + bSeed);
    float h2 = bHash(id * 1.7 + bSeed + 3.1);
    float rowBias = bHash(vec2(id.y, bSeed)) * 0.3 - 0.15;
    float on = step(1.0 - ${lit.toFixed(2)} - rowBias, h1);
    vec3 warm = mix(vec3(1.0, 0.55, 0.2), vec3(1.0, 0.75, 0.42), bHash(id + 9.0));
    vec3 cool = vec3(0.4, 0.75, 1.0);
    vec3 wc = mix(warm, cool, step(0.68, h2));
    wc = mix(wc, vec3(1.0, 0.25, 0.65), step(0.95, h2));
    // blinds / interior variation inside each pane
    float shade = mix(0.55, 1.0, smoothstep(0.2, 0.75, f.y + bHash(id + 5.0) * 0.4));
    bEmit = wc * win * on * (0.18 + 0.75 * bHash(id + bSeed * 2.0)) * shade;
    bGlass = win;
    diffuseColor.rgb *= 0.75 + 0.25 * step(0.12, f.y); // floor ledges
  } else {
    // ground-floor shopfronts
    float gx = vBuv.x / 5.5;
    float id = floor(gx);
    float fx = fract(gx);
    float win = step(0.07, fx) * step(fx, 0.93) * step(0.35, vBuv.y) * step(vBuv.y, 3.3) * inX * vWall;
    float h = bHash(vec2(id, bSeed));
    vec3 sc = mix(vec3(1.0, 0.62, 0.28), vec3(0.45, 0.95, 1.0), step(0.72, h));
    sc = mix(sc, vec3(1.0, 0.3, 0.7), step(0.9, h));
    float mull = step(0.04, fract(fx * 3.0)); // window mullions
    bEmit = sc * win * step(0.22, h) * mull * (0.45 + 0.55 * smoothstep(0.3, 3.3, vBuv.y)) * (0.6 + 0.4 * step(0.25, fract(vBuv.y * 1.4 + h))) * (0.55 + 0.45 * sin(fx * 3.14159)) * 0.5;
    bGlass = win;
  }
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.012, 0.016, 0.03), bGlass);
}`,
      )
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.12, bGlass);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n totalEmissiveRadiance += bEmit;`);
  };
  return mat;
}
