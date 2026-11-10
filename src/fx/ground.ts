import * as THREE from 'three';

const NOISE = `
float gHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(gHash(i), gHash(i + vec2(1, 0)), f.x), mix(gHash(i + vec2(0, 1)), gHash(i + vec2(1, 1)), f.x), f.y);
}
float gFbm(vec2 p) { return gNoise(p) * 0.5 + gNoise(p * 2.03 + 7.1) * 0.3 + gNoise(p * 4.1 + 3.3) * 0.2; }
`;

/**
 * Wet street: a standard material (so pooled lights give real highlights) plus a
 * low-res planar reflection of the scene, smeared and masked by noise puddles.
 */
export class WetGround {
  readonly material: THREE.MeshStandardMaterial;
  private rt: THREE.WebGLRenderTarget;
  private refCam = new THREE.PerspectiveCamera();
  private uniforms = {
    uRefl: { value: null as THREE.Texture | null },
    uReflMatrix: { value: new THREE.Matrix4() },
    uReflOn: { value: 1 },
    uTime: { value: 0 },
    uRoadHalf: { value: 6 },
  };
  private scale = 0.5;
  /** Objects hidden while rendering the reflection (the ground itself, rain, ...). */
  hide: THREE.Object3D[] = [];

  constructor(roadHalf: number) {
    this.uniforms.uRoadHalf.value = roadHalf;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: true });
    this.uniforms.uRefl.value = this.rt.texture;
    this.material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0 });
    this.material.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>\nuniform mat4 uReflMatrix;\nvarying vec4 vReflUv;\nvarying vec3 vWPos;\nvarying float vUp;`)
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
vec4 gWp = modelMatrix * vec4(transformed, 1.0);
vWPos = gWp.xyz;
vReflUv = uReflMatrix * gWp;
vUp = step(0.5, normalize(mat3(modelMatrix) * normal).y);`,
        );
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform sampler2D uRefl;
uniform float uReflOn;
uniform float uTime;
uniform float uRoadHalf;
varying vec4 vReflUv;
varying vec3 vWPos;
varying float vUp;
float gPud = 0.0;
${NOISE}`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
{
  vec2 wp = vWPos.xz;
  float road = step(abs(wp.x), uRoadHalf);
  gPud = smoothstep(0.52, 0.62, gFbm(wp * 0.21 + 3.0)) * vUp * mix(0.7, 1.0, road);
  vec3 asphalt = vec3(0.03, 0.032, 0.04) * (0.7 + 0.6 * gNoise(wp * 9.0));
  float wear = 0.4 + 0.6 * gNoise(wp * 2.5);
  float dash = step(abs(wp.x), 0.1) * step(fract(wp.y / 7.0), 0.45);
  float edge = step(abs(abs(wp.x) - (uRoadHalf - 0.6)), 0.07);
  asphalt = mix(asphalt, vec3(0.42, 0.34, 0.1), dash * wear * 0.8);
  asphalt = mix(asphalt, vec3(0.3, 0.3, 0.32), edge * wear * 0.6);
  vec2 tile = fract(wp / 1.6);
  float grout = min(1.0, step(tile.x, 0.03) + step(tile.y, 0.03));
  vec3 walk = vec3(0.06, 0.06, 0.075) * (0.75 + 0.5 * gHash(floor(wp / 1.6))) * (1.0 - 0.55 * grout);
  walk = mix(walk, vec3(0.1, 0.1, 0.12), 1.0 - vUp); // curb face
  diffuseColor.rgb = mix(walk, asphalt, road) * mix(1.0, 0.45, gPud);
}`,
        )
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n roughnessFactor = mix(0.4, 0.13, gPud);`)
        .replace(
          '#include <opaque_fragment>',
          `if (uReflOn > 0.5 && vUp > 0.5) {
  vec3 gV = normalize(cameraPosition - vWPos);
  float fres = pow(1.0 - clamp(gV.y, 0.0, 1.0), 3.0);
  float rough = 1.0 - gPud;
  vec2 ruv = vReflUv.xy / vReflUv.w;
  vec2 wob = vec2(gNoise(vWPos.xz * 5.0 + uTime * 0.9), gNoise(vWPos.xz * 5.0 + 11.0 - uTime * 0.8)) - 0.5;
  vec2 grit = vec2(gNoise(vWPos.xz * 31.0), gNoise(vWPos.xz * 31.0 + 5.0)) - 0.5;
  ruv += wob * 0.006 + grit * 0.03 * rough;
  float smear = mix(0.012, 0.05, rough);
  vec3 r = vec3(0.0);
  for (int i = 0; i < 7; i++) {
    r += texture2D(uRefl, ruv + vec2(0.0, (float(i) - 2.0) * smear)).rgb;
  }
  r /= 7.0;
  float breakup = mix(0.45 + 0.55 * gNoise(vWPos.xz * 14.0), 1.0, gPud);
  outgoingLight += r * mix(0.16, 0.8, gPud) * mix(0.35, 1.0, fres) * breakup;
} else if (vUp > 0.5) {
  // no reflection pass (Low): a cheap fog-coloured sheen so the street still reads as wet
  float fres = pow(1.0 - clamp(normalize(cameraPosition - vWPos).y, 0.0, 1.0), 3.0);
  outgoingLight += vec3(0.06, 0.03, 0.1) * fres * (0.25 + 0.75 * gPud);
}
#include <opaque_fragment>`,
        );
    };
  }

  setQuality(scale: number, w: number, h: number): void {
    this.scale = scale;
    this.uniforms.uReflOn.value = scale > 0 ? 1 : 0;
    if (scale > 0) this.rt.setSize(Math.max(4, Math.floor(w * scale)), Math.max(4, Math.floor(h * scale)));
  }

  /** Renders the mirrored scene. Call before the main render. */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, time: number): void {
    this.uniforms.uTime.value = time;
    if (this.scale <= 0) return;
    const c = this.refCam;
    c.fov = camera.fov;
    c.aspect = camera.aspect;
    c.near = camera.near;
    c.far = camera.far;
    c.updateProjectionMatrix();
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    c.position.set(camera.position.x, -camera.position.y, camera.position.z);
    c.up.set(up.x, -up.y, up.z);
    c.lookAt(fwd.x, -fwd.y, fwd.z);
    c.updateMatrixWorld();
    this.uniforms.uReflMatrix.value
      .set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
      .multiply(c.projectionMatrix)
      .multiply(c.matrixWorldInverse);
    const vis = this.hide.map((o) => o.visible);
    this.hide.forEach((o) => (o.visible = false));
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(scene, c);
    renderer.setRenderTarget(prev);
    this.hide.forEach((o, i) => (o.visible = vis[i]!));
  }
}
