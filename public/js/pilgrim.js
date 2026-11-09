import * as THREE from 'three';
import { UP } from '/shared/layout.js';
import { PILGRIM, LEG, RISE, STAIR_LEGS, STAIR_LANDINGS, STAIR_ROUTE, SUMMIT } from '/shared/stairs.js';
import { mesh, box, cyl, sph, textPlate, canvasTex, softDot, smoothstep, lerp } from './util.js';
import { M } from './materials.js';
import { roof, column } from './parts.js';
import { blockCircle } from './collision.js';

/* =====================================================================
   ĐƯỜNG MÂY — 1.080 bậc hành hương lên núi, phía sau chùa, bên trái (phía tây) khi đi từ cổng Tam Quan vào.
   Mười chặng x 108 bậc, mỗi chặng kết thúc ở một sân nghỉ tròn có bia ghi số bậc, ghế đá và đèn lồng.
   Lên cao dần vào sương, qua biển mây, tới Đình Mây trên đỉnh.
   Hình học (đường đi, độ cao, va chạm) nằm ở shared/stairs.js để server và client dùng chung.
   ===================================================================== */
const { perStage, riser, tread, width, landingR } = PILGRIM;
const HALF = width / 2;
const CLOUD_Y = SUMMIT.h * 0.58;      // tầng mây nằm quanh chặng 6, các chặng trên nhìn xuống thấy biển mây
const START_Z = STAIR_LANDINGS[0].z;

/* Mặt cắt một chặng: 108 bậc (s dọc theo hướng lên, y so với mặt sân nghỉ dưới), thân đặc dày 2 m song song mặt bậc. */
function legGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -2);
  shape.lineTo(0, 0);
  for (let k = 0; k < perStage; k++) {
    shape.lineTo(k * tread, (k + 1) * riser);
    shape.lineTo((k + 1) * tread, (k + 1) * riser);
  }
  shape.lineTo(LEG, RISE - 2);
  const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, steps: 1 });
  g.translate(0, 0, -HALF);
  return g;
}

/* Bia chặng, ghế đá, đèn lồng đặt ở nửa sân nghỉ không nằm trên lối đi. Trả về nhóm đã dựng. */
function landingBuild(scene, L, entry, exit, label) {
  const g = new THREE.Group(); g.position.set(L.x, L.h, L.z); scene.add(g);
  cyl(landingR + 0.35, landingR + 0.35, 3, M.STONE, 0, -1.5, 0, g, 48);
  cyl(landingR - 0.5, landingR - 0.5, 0.1, M.PAVE, 0, 0, 0, g, 48, false);          // mặt lát sáng hơn viền
  const mx = exit ? (entry[0] + exit[0]) / 2 : entry[0], mz = exit ? (entry[1] + exit[1]) / 2 : entry[1];
  const ml = Math.hypot(mx, mz) || 1, dx = mx / ml, dz = mz / ml;                  // hướng từ tâm ra phía lối đi
  const ry = Math.atan2(dx, dz), c = Math.cos(ry), s = Math.sin(ry);
  const place = (lx, lz, r) => { blockCircle(L.x - dx * 2.2 + lx * c + lz * s, L.z - dz * 2.2 - lx * s + lz * c, r); };
  const pg = new THREE.Group(); pg.position.set(-dx * 2.2, 0, -dz * 2.2); pg.rotation.y = ry; g.add(pg);
  box(2.5, 2.6, 0.5, M.STONE, 0, 1.3, 0, pg);
  box(2.9, 0.24, 0.9, M.RIDGE, 0, 2.72, 0, pg);
  textPlate(label, 2.2, 0.72, 0, 1.55, 0.27, pg, 0, { size: 0.4 });
  sph(0.3, M.LANTERN, 0, 3.12, 0, pg, false, 12, 10).scale.y = 1.25;
  place(0, 0, 1.4);
  for (const sx of [-1, 1]) { box(1.5, 0.45, 0.5, M.STONE, sx * 2.8, 0.22, 0.7, pg); place(sx * 2.8, 0.7, 0.8); }
  return g;
}

/* Cổng mở ở tường tây sân sau: dẫn ra sân nghỉ số 0, chân Đường Mây. */
function buildGate(scene) {
  const g = new THREE.Group(); g.position.set(-39.9, UP, START_Z); scene.add(g);
  for (const sz of [-1, 1]) {
    box(1.4, 0.5, 1.4, M.STONE, 0, 0.25, sz * 3.95, g);
    column(g, 0, 0.5, sz * 3.95, 5.0, 0.38);
    blockCircle(-39.9, START_Z + sz * 3.95, 0.6);
  }
  box(1.6, 0.8, 8.9, M.RED, 0, 5.8, 0, g);
  box(1.7, 0.12, 9.0, M.GOLD, 0, 5.38, 0, g, false);
  const rg = new THREE.Group(); rg.rotation.y = Math.PI / 2; rg.position.y = 6.2; g.add(rg);
  roof(rg, { w: 11.4, d: 4.0, h: 1.7, s: 0.55, ridge: 7.4 });
  textPlate('ĐƯỜNG MÂY · 1.080 BẬC', 5.4, 0.95, 0.85, 4.65, 0, g, Math.PI / 2);        // mặt trong sân
  textPlate('ĐƯỜNG MÂY · 1.080 BẬC', 5.4, 0.95, -0.85, 4.65, 0, g, -Math.PI / 2);     // mặt ngoài
  for (const sz of [-1, 1]) sph(0.3, M.LANTERN, 0, 4.7, sz * 2.1, g, false, 12, 10).scale.y = 1.25;
  return g;
}

/* Đỉnh Đường Mây: sân nghỉ cuối cùng có Đình Mây (bốn cột, mái nhỏ) và bia đá ghi lại hành trình. */
function buildSummit(scene, L, entry) {
  const g = new THREE.Group(); g.position.set(L.x, L.h, L.z); scene.add(g);
  cyl(landingR + 0.35, landingR + 0.35, 3, M.STONE, 0, -1.5, 0, g, 48);
  cyl(landingR - 0.5, landingR - 0.5, 0.1, M.PAVE, 0, 0, 0, g, 48, false);
  const cx = -entry[0] / landingR * 2.3, cz = -entry[1] / landingR * 2.3;              // phía đối diện lối lên
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    column(g, cx + sx * 1.9, 0, cz + sz * 1.9, 3.3, 0.2);
    blockCircle(L.x + cx + sx * 1.9, L.z + cz + sz * 1.9, 0.35);
  }
  roof(g, { w: 6.4, d: 6.4, h: 1.8, y: 3.3, s: 0.55, x: cx, z: cz });
  const sg = new THREE.Group(); sg.position.set(cx, 0, cz - 0.4); sg.rotation.y = Math.atan2(-cx, -cz); g.add(sg);   // bia quay mặt về lối lên
  box(1.5, 1.9, 0.4, M.STONE, 0, 0.95, 0, sg);
  textPlate('ĐỈNH ĐƯỜNG MÂY', 1.3, 0.6, 0, 1.2, 0.22, sg, 0, { size: 0.36 });
  blockCircle(L.x + cx, L.z + cz - 0.4, 0.9);
  return g;
}

export function buildPilgrimStairs(scene, W) {
  const legGeo = legGeometry();
  const alpha = Math.atan2(RISE, LEG), railLen = Math.hypot(LEG, RISE);

  for (const gdef of STAIR_LEGS) {
    const g = new THREE.Group(); g.position.set(gdef.ax, gdef.h0, gdef.az); g.rotation.y = Math.atan2(-gdef.uz, gdef.ux); scene.add(g);
    mesh(legGeo, M.STONE, 0, 0, 0, g, true);
    for (const side of [-1, 1]) {
      const lat = side * (HALF + 0.16);
      box(railLen, 0.2, 0.32, M.WHITE, LEG / 2, RISE / 2 + 1.0, lat, g).rotation.z = alpha;      // lan can: tay vịn + thanh dưới + trụ
      box(railLen, 0.14, 0.24, M.WHITE, LEG / 2, RISE / 2 + 0.4, lat, g).rotation.z = alpha;
      for (let k = 0; k <= 7; k++) {
        const s = k * (LEG / 7), y = RISE * s / LEG;
        box(0.32, 1.1, 0.32, M.WHITE, s, y + 0.55, lat, g);
        sph(0.2, M.WHITE, s, y + 1.2, lat, g, false, 10, 8);
      }
    }
    for (let j = 0; j < 3; j++) {                                  // đèn đá ngoài lan can, xen kẽ hai bên
      const s = LEG * (0.17 + 0.33 * j), y = RISE * s / LEG, lat = ((gdef.i + j) % 2 ? 1 : -1) * (HALF + 0.95);
      cyl(0.16, 0.2, 2.9, M.STONE, s, y + 0.5, lat, g, 8);
      sph(0.36, M.LANTERN, s, y + 2.15, lat, g, false, 12, 10).scale.y = 1.25;
      mesh(new THREE.ConeGeometry(0.46, 0.42, 8), M.RIDGE, s, y + 2.7, lat, g, false);
    }
  }

  const tx = (a) => [a.ux * landingR, a.uz * landingR];
  STAIR_LANDINGS.forEach((L, i) => {
    const entry = i === 0 ? [landingR, 0] : tx({ ux: -STAIR_LEGS[i - 1].ux, uz: -STAIR_LEGS[i - 1].uz });
    const exit = i < STAIR_LEGS.length ? tx(STAIR_LEGS[i]) : null;
    if (i === STAIR_LANDINGS.length - 1) {
      buildSummit(scene, L, entry);
    } else {
      const label = i === 0 ? 'CHÂN ĐƯỜNG MÂY' : `CHẶNG ${i} · BẬC ${i * perStage}`;
      landingBuild(scene, L, entry, exit, label);
    }
  });
  buildGate(scene);

  /* ---------- tầng mây và sương: động nên không gộp vào mesh tĩnh ---------- */
  const group = new THREE.Group(); group.userData.dynamic = true; scene.add(group);
  const tex = canvasTex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w, y = rnd() * h, r = 35 + rnd() * 80, a = 0.1 + rnd() * 0.22;
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
  }, [11, 11]);
  const edgeFade = (() => {            // mây mờ dần về mép tấm, không lộ đường biên thẳng
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 36, 128, 128, 128);
    gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const layers = [0, 1].map(k => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2800, 2800), new THREE.MeshBasicMaterial({ map: tex.clone(), alphaMap: edgeFade, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    m.material.map.needsUpdate = true; m.material.map.repeat.set(11 - k * 3, 11 - k * 3);
    m.rotation.x = -Math.PI / 2; m.position.set(-60, CLOUD_Y - k * 14, -220); m.renderOrder = 2 + k;
    group.add(m); return m;
  });

  const mistTex = softDot('rgba(255,255,255,0.55)', 128);
  const wisps = [];
  for (let i = 0; i < 26; i++) {
    const r = STAIR_ROUTE[2 + Math.floor(i / 26 * (STAIR_ROUTE.length - 3))];
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0.2 }));
    const h = i / 26 * (SUMMIT.h - 10) + 8;
    sp.userData = { x0: r[0] + Math.sin(i * 7.3) * 26, z0: r[1] + Math.cos(i * 4.1) * 26, y: h + 6 + (i % 3) * 4, ph: i * 1.7, v: 0.6 + (i % 5) * 0.2 };
    sp.scale.set(46 + (i % 4) * 10, 18 + (i % 3) * 6, 1);
    group.add(sp); wisps.push(sp);
  }

  const col = new THREE.Color();
  W.anim.pilgrim = {
    update(camera, env, t, dt) {
      const y = camera.position.y;
      const k = smoothstep(CLOUD_Y - 70, CLOUD_Y - 6, y) * (y < CLOUD_Y ? 0.5 : 0.9) * (1 - env.mist * 0.2);
      col.setRGB(1, 1, 1).lerp(env.fog, 0.35).multiplyScalar(1 - env.night * 0.75);
      layers.forEach((m, i) => {
        m.material.opacity = k * (i ? 0.7 : 1);
        m.material.color.copy(col);
        m.material.map.offset.x += dt * 0.0016 * (i + 1);
        m.material.map.offset.y += dt * 0.0009;
      });
      for (const s of wisps) {
        const u = s.userData;
        s.position.set(u.x0 + Math.sin(t * 0.05 * u.v + u.ph) * 16, u.y + Math.sin(t * 0.07 + u.ph) * 2, u.z0 + Math.cos(t * 0.04 * u.v + u.ph) * 10);
        s.material.opacity = lerp(0.1, 0.24, 0.5 + 0.5 * Math.sin(t * 0.2 + u.ph)) * (1 - env.night * 0.5);
        s.material.color.copy(col);
      }
    }
  };
  return W.anim.pilgrim;
}
