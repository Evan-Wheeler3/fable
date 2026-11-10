export type QualityName = 'low' | 'medium' | 'high' | 'ultra';

export interface Quality {
  name: QualityName;
  pixelRatio: number; // cap on devicePixelRatio
  bloom: boolean;
  bloomScale: number; // bloom buffer height in px
  reflScale: number; // planar reflection resolution scale, 0 = off
  rainCount: number;
  splashCount: number;
  lights: number; // pooled dynamic point lights
  far: number; // draw distance
  aa: 'none' | 'fxaa' | 'smaa';
  grain: boolean;
}

export const QUALITY: Record<QualityName, Quality> = {
  low: { name: 'low', pixelRatio: 0.75, bloom: true, bloomScale: 240, reflScale: 0, rainCount: 1500, splashCount: 150, lights: 3, far: 350, aa: 'none', grain: false },
  medium: { name: 'medium', pixelRatio: 1, bloom: true, bloomScale: 360, reflScale: 0.5, rainCount: 4000, splashCount: 400, lights: 6, far: 500, aa: 'fxaa', grain: true },
  high: { name: 'high', pixelRatio: 1.5, bloom: true, bloomScale: 540, reflScale: 0.75, rainCount: 7000, splashCount: 700, lights: 8, far: 650, aa: 'smaa', grain: true },
  ultra: { name: 'ultra', pixelRatio: 2, bloom: true, bloomScale: 720, reflScale: 1, rainCount: 10000, splashCount: 1000, lights: 10, far: 800, aa: 'smaa', grain: true },
};

export const QUALITY_ORDER: QualityName[] = ['low', 'medium', 'high', 'ultra'];

/** Guess a sensible default from the GPU string. */
export function detectQuality(gl: WebGLRenderingContext | WebGL2RenderingContext): QualityName {
  let gpu = '';
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  if (ext) gpu = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)).toLowerCase();
  if (/swiftshader|llvmpipe|software/.test(gpu)) return 'low';
  if (/rtx|radeon rx|apple m\d|arc\b/.test(gpu)) return 'high';
  return 'medium';
}
