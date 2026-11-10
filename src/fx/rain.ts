import * as THREE from 'three';

const MAX_STREAKS = 10000;
const MAX_SPLASH = 1000;
const BOX = new THREE.Vector3(44, 32, 44);

/** Camera-local rain streaks (one line batch) and ground splash rings (one instanced batch). */
export class Rain {
  readonly streaks: THREE.LineSegments;
  readonly splashes: THREE.Mesh;
  private uniforms = {
    uTime: { value: 0 },
    uCam: { value: new THREE.Vector3() },
    uBox: { value: BOX },
    uRoadHalf: { value: 6 },
    uOpacity: { value: 0.5 },
  };

  constructor(roadHalf: number, seedRand: () => number) {
    this.uniforms.uRoadHalf.value = roadHalf;
    const pos = new Float32Array(MAX_STREAKS * 6);
    const end = new Float32Array(MAX_STREAKS * 2);
    for (let i = 0; i < MAX_STREAKS; i++) {
      const x = seedRand() * BOX.x, y = seedRand() * BOX.y, z = seedRand() * BOX.z;
      pos.set([x, y, z, x, y, z], i * 6);
      end[i * 2 + 1] = 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    this.streaks = new THREE.LineSegments(
      g,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `attribute float aEnd;
uniform float uTime;
uniform vec3 uCam;
uniform vec3 uBox;
varying float vA;
void main() {
  float r = fract(position.x * 7.31 + position.z * 3.17);
  float speed = 24.0 + r * 12.0;
  vec3 vel = vec3(-2.5, -speed, 1.2);
  vec3 p = position + vel * uTime;
  p = mod(p - uCam, uBox) - uBox * 0.5 + uCam;
  p += normalize(vel) * aEnd * (0.55 + r * 0.6);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  vA = (1.0 - aEnd * 0.8) * smoothstep(uBox.x * 0.5, uBox.x * 0.3, -mv.z) * smoothstep(0.4, 2.5, -mv.z);
  gl_Position = projectionMatrix * mv;
}`,
        fragmentShader: `uniform float uOpacity;
varying float vA;
void main() { gl_FragColor = vec4(vec3(0.55, 0.7, 1.0) * vA * uOpacity, 1.0); }`,
      }),
    );
    this.streaks.frustumCulled = false;

    const quad = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const ig = new THREE.InstancedBufferGeometry();
    ig.index = quad.index;
    ig.setAttribute('position', quad.getAttribute('position'));
    ig.setAttribute('uv', quad.getAttribute('uv'));
    const off = new Float32Array(MAX_SPLASH * 3);
    for (let i = 0; i < off.length; i++) off[i] = seedRand();
    ig.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3));
    this.splashes = new THREE.Mesh(
      ig,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `attribute vec3 aOff;
uniform float uTime;
uniform vec3 uCam;
uniform float uRoadHalf;
varying vec2 vUv;
varying float vPh;
float h(float n) { return fract(sin(n * 91.345) * 47453.5453); }
void main() {
  const float S = 34.0;
  float cyc = uTime * 1.7 + aOff.z * 10.0;
  float k = floor(cyc);
  vPh = fract(cyc);
  vec2 base = (aOff.xy + vec2(h(k + aOff.z), h(k * 1.3 + aOff.z * 7.0))) * S;
  vec2 w = mod(base - uCam.xz, S) - S * 0.5 + uCam.xz;
  float y = abs(w.x) > uRoadHalf ? 0.17 : 0.02;
  float size = 0.06 + vPh * 0.26;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * vec4(w.x + position.x * size, y, w.y + position.z * size, 1.0);
}`,
        fragmentShader: `uniform float uOpacity;
varying vec2 vUv;
varying float vPh;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float ring = smoothstep(0.55, 0.8, d) * smoothstep(1.0, 0.85, d);
  gl_FragColor = vec4(vec3(0.6, 0.75, 1.0) * ring * (1.0 - vPh) * uOpacity * 0.4, 1.0);
}`,
      }),
    );
    this.splashes.frustumCulled = false;
  }

  setCounts(streaks: number, splashes: number): void {
    this.streaks.geometry.setDrawRange(0, Math.min(streaks, MAX_STREAKS) * 2);
    (this.splashes.geometry as THREE.InstancedBufferGeometry).instanceCount = Math.min(splashes, MAX_SPLASH);
  }

  update(time: number, camera: THREE.Camera): void {
    this.uniforms.uTime.value = time;
    this.uniforms.uCam.value.copy(camera.position);
  }
}
