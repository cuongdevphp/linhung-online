import * as THREE from 'three';
import { makeHuman } from './human.js';
import { looksFor } from './avatar.js';

/* Xem trước nhân vật ở màn hình vào chùa: nhân vật xoay chậm, chắp tay chào, đổi ngay khi chọn giới tính, màu áo hoặc gõ tên (tên quyết định kiểu tóc). */
export function createPreview(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(0, 1.12, 5.3); camera.lookAt(0, 0.98, 0);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x8a6a4a, 1.7));
  const key = new THREE.DirectionalLight(0xffe8c8, 2.8); key.position.set(2.6, 3.6, 3.4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fc6ff, 1.4); rim.position.set(-3, 2.2, -2.6); scene.add(rim);
  // bệ tròn vàng dưới chân
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.06, 40), new THREE.MeshStandardMaterial({ color: 0xf6e3b4, roughness: 0.5, metalness: 0.2 }));
  base.position.y = -0.03; scene.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.018, 8, 48), new THREE.MeshStandardMaterial({ color: 0xe2b04a, roughness: 0.3, metalness: 0.7 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.005; scene.add(ring);

  const state = { gender: 'male', robe: '#c9772b', name: '' };
  let human = null, raf = 0, last = performance.now(), t = 0, alive = true, spin = 0.5;
  const rebuild = () => {
    if (human) scene.remove(human.root);
    human = makeHuman({ gender: state.gender, robe: state.robe, ...looksFor(state.name || (state.gender === 'female' ? 'Mai Anh' : 'Minh Khang'), state.gender) });
    human.root.rotation.y = spin;
    scene.add(human.root);
  };
  rebuild();

  const resize = () => {
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 400, dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.fov = w / h < 0.8 ? 30 : 26; camera.updateProjectionMatrix();
    }
  };
  const loop = now => {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    resize();
    spin += dt * 0.55; human.root.rotation.y = spin;
    human.anjali();
    const bow = Math.max(0, Math.sin(t * 0.9 - 1.2)) ** 6;                    // thỉnh thoảng cúi chào
    human.upper.rotation.x = bow * 0.5; human.neck.rotation.x = bow * 0.25;
    human.step(0, 0);
    human.idle(dt, t);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);

  return {
    set(patch) { Object.assign(state, patch); rebuild(); },
    stop() { alive = false; cancelAnimationFrame(raf); renderer.dispose(); renderer.forceContextLoss?.(); }
  };
}
