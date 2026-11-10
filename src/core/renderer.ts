import * as THREE from 'three';
import type { Quality } from './quality';

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
    stencil: false,
    depth: false, // the post-processing composer owns depth
  });
  renderer.toneMapping = THREE.NoToneMapping; // tone mapping happens in post
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.info.autoReset = false; // we reset per frame so stats cover every pass
  return renderer;
}

/** Device pixel ratio capped by the quality preset (presets below 1 undersample). */
export function effectivePixelRatio(q: Quality): number {
  const dpr = window.devicePixelRatio || 1;
  return q.pixelRatio < 1 ? Math.min(dpr, 1) * q.pixelRatio : Math.min(dpr, q.pixelRatio);
}
