import * as THREE from 'three';
import {
  BloomEffect,
  BrightnessContrastEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  FXAAEffect,
  HueSaturationEffect,
  NoiseEffect,
  BlendFunction,
  RenderPass,
  SMAAEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing';
import type { Quality } from '../core/quality';

/** Post stack: render -> bloom -> grade/vignette/grain/tonemap -> chromatic aberration -> AA. */
export class Post {
  composer: EffectComposer;

  constructor(
    renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    q: Quality,
  ) {
    this.composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
    this.build(q);
  }

  build(q: Quality): void {
    this.composer.removeAllPasses();
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const fx = [];
    if (q.bloom) {
      fx.push(
        new BloomEffect({
          mipmapBlur: true,
          luminanceThreshold: 0.55,
          luminanceSmoothing: 0.35,
          intensity: 1.15,
          radius: 0.8,
          resolutionY: q.bloomScale,
        }),
      );
    }
    fx.push(new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }));
    fx.push(new HueSaturationEffect({ saturation: 0.12 }));
    fx.push(new BrightnessContrastEffect({ brightness: 0.0, contrast: 0.1 }));
    fx.push(new VignetteEffect({ offset: 0.28, darkness: 0.62 }));
    if (q.grain) {
      const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
      noise.blendMode.opacity.value = 0.22;
      fx.push(noise);
    }
    this.composer.addPass(new EffectPass(this.camera, ...fx));

    if (q.name !== 'low') {
      const ca = new ChromaticAberrationEffect({
        offset: new THREE.Vector2(0.0011, 0.0007),
        radialModulation: true,
        modulationOffset: 0.25,
      });
      this.composer.addPass(new EffectPass(this.camera, ca));
    }
    if (q.aa === 'smaa') this.composer.addPass(new EffectPass(this.camera, new SMAAEffect()));
    else if (q.aa === 'fxaa') this.composer.addPass(new EffectPass(this.camera, new FXAAEffect()));
  }

  setSize(w: number, h: number): void {
    this.composer.setSize(w, h);
  }

  render(dt: number): void {
    this.composer.render(dt);
  }
}
