import * as THREE from 'three';

/** M0 placeholder: a small lit scene to prove the render loop and post stack. */
export function buildTestScene(scene: THREE.Scene): (t: number) => void {
  scene.background = new THREE.Color(0x05040c);
  scene.fog = new THREE.FogExp2(0x0a0618, 0.02);
  scene.add(new THREE.HemisphereLight(0x3344aa, 0x110818, 0.6));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x0c0c14, roughness: 0.25, metalness: 0.4 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const colors = [0xff3fa4, 0x4df3ff, 0xffb347, 0x9d6bff];
  const spinners: THREE.Mesh[] = [];
  colors.forEach((c, i) => {
    const a = (i / colors.length) * Math.PI * 2;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 4 + i, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x111118, emissive: c, emissiveIntensity: 2.2 }),
    );
    box.position.set(Math.cos(a) * 6, (4 + i) / 2, Math.sin(a) * 6);
    scene.add(box);
    spinners.push(box);
    const light = new THREE.PointLight(c, 60, 25);
    light.position.copy(box.position);
    scene.add(light);
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 1), new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.3, metalness: 0.8 }));
  core.position.y = 2;
  scene.add(core);

  return (t) => {
    core.rotation.set(t * 0.4, t * 0.6, 0);
    core.position.y = 2 + Math.sin(t) * 0.3;
  };
}
