import * as THREE from 'three';

/** Street-level haze and the glowing mist the towers fade into. */
export const FOG_LOW = new THREE.Color(0x3b2160);
export const FOG_HIGH = new THREE.Color(0x1b3766);
export const FOG_DENSITY = 0.0105;
const FOG_TOP = 170; // height (m) where fog is fully "high"

const glsl = (c: THREE.Color): string => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;

/**
 * Patches three's fog shader chunks so every fogged material gets a height gradient:
 * fog colour shifts and density rises with world height. Call before any material compiles.
 */
export function installHeightFog(): void {
  const C = THREE.ShaderChunk;
  C.fog_pars_vertex = `#ifdef USE_FOG\n varying float vFogDepth;\n varying float vFogY;\n#endif`;
  C.fog_vertex = `#ifdef USE_FOG
  vFogDepth = -mvPosition.z;
  vFogY = dot(viewMatrix[1].xyz, mvPosition.xyz) + cameraPosition.y;
#endif`;
  C.fog_pars_fragment = `#ifdef USE_FOG
  uniform vec3 fogColor;
  uniform float fogDensity;
  varying float vFogDepth;
  varying float vFogY;
#endif`;
  C.fog_fragment = `#ifdef USE_FOG
  float fogH = clamp(vFogY / ${FOG_TOP.toFixed(1)}, 0.0, 1.0);
  float fogD = fogDensity * mix(1.0, 2.2, fogH);
  float fogFactor = 1.0 - exp(-fogD * fogD * vFogDepth * vFogDepth);
  vec3 fogC = mix(fogColor, ${glsl(FOG_HIGH)}, smoothstep(0.0, 0.8, fogH));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogC, fogFactor);
#endif`;
}

export function buildAtmosphere(scene: THREE.Scene): void {
  scene.fog = new THREE.FogExp2(FOG_LOW, FOG_DENSITY);
  scene.background = null;
  scene.add(new THREE.HemisphereLight(0x3a4a9a, 0x1a0c26, 0.85));

  // Sky dome: rotation-only, drawn first, matches the fog gradient.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthTest: false,
      depthWrite: false,
      fog: false,
      vertexShader: `varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
  gl_Position.z = gl_Position.w;
}`,
      fragmentShader: `varying vec3 vDir;
void main() {
  float y = normalize(vDir).y;
  vec3 c = mix(${glsl(FOG_LOW)}, ${glsl(FOG_HIGH)}, smoothstep(-0.05, 0.45, y));
  c *= 1.0 + 0.5 * exp(-abs(y) * 5.0); // city glow near the horizon
  gl_FragColor = vec4(c, 1.0);
}`,
    }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  scene.add(sky);
}
