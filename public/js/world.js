import * as THREE from 'three';
import { UP, BURNER, BELL, DRUM, POND, BODHI, STATUE, SPOTS } from '/shared/layout.js';
import { mesh, box, cyl, textPlate, setRoot, mat, rng, bake } from './util.js';
import { M } from './materials.js';
import { roof, column, balustrade, createLanternField } from './parts.js';
import { blockBox, blockCircle, blockLine, STAIR_RUN } from './collision.js';
import { buildQuanAm } from './statues.js';
import { makeArhat } from './arhat.js';
import { buildHall } from './hall.js';
import { buildKitchen } from './kitchen.js';
import { buildDining } from './dining.js';
import { buildPilgrimStairs } from './pilgrim.js';
import { buildSummit } from './summit.js';
import { buildCable } from './cable.js';

const flatRot = m => { m.rotation.x = -Math.PI / 2; return m; };

/* Dựng toàn bộ khuôn viên chùa Linh Ứng (cách điệu). Trả về các điểm tham chiếu cho hoạt cảnh. */
export function buildWorld(scene) {
  const stat = new THREE.Group(); scene.add(stat);   // mọi thứ tĩnh nằm trong nhóm này để gộp mesh
  setRoot(stat);
  const R = rng(2026);
  const W = { lights: [], anim: {}, spots: SPOTS, flagSpots: [], incense: null, smokeOrigin: null };
  W.lanterns = createLanternField(scene, 200);
  W.lanternAt = (parent, x, y, z, s = 1) => { const v = new THREE.Vector3(x, y, z); parent.localToWorld(v); W.lanterns.add(v.x, v.y, v.z, s); };
  W.light = (parent, x, y, z, color, dist, decay, base, always = 0) => {
    const l = new THREE.PointLight(color, 0, dist, decay); l.position.set(x, y, z);
    l.userData.base = base; l.userData.always = always; parent.add(l); W.lights.push(l); return l;
  };
  for (const m of [M.GRASS, M.BRICK]) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2; }

  const wall = (x, z, w, d, h = 2.6, y = 0) => {
    box(w, h, d, M.WALL, x, y + h / 2, z);
    box(w + 0.5, 0.3, d + 0.6, M.RIDGE, x, y + h + 0.15, z);
  };
  const roofZ = (parent, opt) => {      // mái có nóc chạy theo trục z
    const g = new THREE.Group(); g.rotation.y = Math.PI / 2; g.position.set(opt.x || 0, 0, opt.z || 0); parent.add(g);
    roof(g, { ...opt, x: 0, z: 0, w: opt.len, d: opt.wid });
    return g;
  };

  /* ================= SÂN DƯỚI ================= */
  flatRot(mesh(new THREE.PlaneGeometry(135, 60.5), M.PAVE, 26, 0, 29.75, stat, false));
  box(8, 0.08, 46, M.BRICK, 0, 0.04, 33.5, stat, false);                    // lối chính Tam Quan -> đại bậc thang
  box(42, 0.08, 5, M.BRICK, 25, 0.04, 47.5, stat, false);                   // lối sang đài Quán Thế Âm
  flatRot(mesh(new THREE.CircleGeometry(12.5, 40), M.GRASS, POND.x, 0.05, POND.z, stat, false));
  flatRot(mesh(new THREE.CircleGeometry(15, 40), M.GRASS, BODHI.x + 3, 0.05, BODHI.z - 4, stat, false));
  flatRot(mesh(new THREE.CircleGeometry(23.5, 72), M.WHITE, STATUE.x, 0.06, STATUE.z, stat, false));

  // tường rào
  wall(-39.9, 28.4, 0.8, 56.6);
  wall(-24.5, 56.2, 31, 0.8); wall(16.5, 56.2, 15, 0.8);
  balustrade(stat, 24, 56.3, 91.2, 56.3, 0, 2.2);                           // mặt tiền hướng biển: lan can thoáng
  balustrade(stat, 91.2, 56.3, 91.2, 8, 0, 2.2);
  box(53, 3.2, 0.8, M.STONE, 65.5, 1.6, -0.4);                              // tường chắn phía bắc đài Quán Thế Âm
  box(53.6, 0.3, 1.4, M.RIDGE, 65.5, 3.35, -0.4);
  /* Va chạm cho tường rào, lan can mặt tiền, tường chắn ở z = 0 (thân người cộng thêm ở collision.js, nên người không xuyên qua tường / lan can) */
  blockBox(-40.3, -39.5, 0, 56.8);                                                   // tường tây sân dưới
  blockBox(-40.3, -9, 55.8, 56.6); blockBox(9, 24, 55.8, 56.6);                       // tường nam, hai bên cổng Tam Quan
  blockLine(24, 56.3, 91.2, 56.3, 0.34); blockLine(91.2, 56.3, 91.2, 8, 0.34);        // lan can hướng biển
  blockBox(-40.3, -7.9, -0.1, 0); blockBox(7.9, 92, -0.1, 0);                         // tường chắn giữa sân dưới và sân trên (mặt tường ở z = 0), trừ đại bậc thang
  blockLine(-38.2, -0.3, -7.9, -0.3, 0.34); blockLine(7.9, -0.3, 38.2, -0.3, 0.34);  // lan can mép sân trên
  blockBox(-40.3, -39.5, -64.5, 0); blockBox(-40.3, -39.5, -74.6, -71.5);             // tường tây sân sau, chừa cổng Đường Mây
  blockBox(39.5, 40.3, -74.6, 0); blockBox(-40.3, 40.3, -74.6, -73.8);                // tường đông và tường sau

  /* ================= CỔNG TAM QUAN ================= */
  {
    const g = new THREE.Group(); g.position.set(0, 0, 56); stat.add(g);
    box(18, 0.5, 4.8, M.STONE, 0, 0.25, 0, g);
    for (const x of [-6.6, -2.6, 2.6, 6.6]) for (const z of [-1.2, 1.2]) column(g, x, 0.5, z, 6.2, 0.38);
    for (const sx of [-1, 1]) {
      box(4, 5.4, 2.4, M.WALL, sx * 4.6, 3.2, 0, g);                         // gian bên: tường kín
      box(2, 4.2, 2.4, M.WALL, sx * 7.7, 2.6, 0, g);
      for (const side of [-1, 1]) mesh(new THREE.PlaneGeometry(2.8, 3.4), M.LATTICE, sx * 4.6, 2.4, side * 1.22, g, false).rotation.y = side > 0 ? 0 : Math.PI;
      roof(g, { w: 8.4, d: 5, h: 1.7, x: sx * 7.2, y: 5.5, s: 0.7, ridge: 3.4 });
    }
    box(15.2, 0.5, 3.4, M.RED, 0, 6.95, 0, g);
    roof(g, { w: 12, d: 6.6, h: 2.4, y: 7.2, s: 0.9, ridge: 7, dragons: true });
    box(6.4, 1.7, 3.6, M.WALL, 0, 10.3, 0, g);
    roof(g, { w: 9, d: 5, h: 2.2, y: 11.1, s: 0.8, ridge: 5, dragons: true });
    for (const side of [-1, 1]) {
      textPlate('LINH ỨNG TỰ', 4.8, 1.15, 0, 10.3, side * 1.82, g, side > 0 ? 0 : Math.PI);
      textPlate('LINH ỨNG SỞ CẦU NHƯ Ý NGUYỆN', 3.7, 0.72, -4.6, 5.3, side * 1.23, g, side > 0 ? 0 : Math.PI, { size: 0.4 });
      textPlate('SƠN TRÀ BÃI BỤT THẬT HIỂN LINH', 3.7, 0.72, 4.6, 5.3, side * 1.23, g, side > 0 ? 0 : Math.PI, { size: 0.4 });
    }
    blockBox(-9, -2.7, 54.6, 57.6); blockBox(2.7, 9, 54.6, 57.6);
  }

  /* ================= DÃY ĐÈN, 18 LA HÁN, CHẬU CẢNH, CỜ ================= */
  for (let z = 14, i = 0; z <= 50; z += 6, i++) for (const sx of [-1, 1]) {
    const x = sx * 5.3;
    box(0.7, 0.4, 0.7, M.WHITE, x, 0.2, z); cyl(0.12, 0.16, 3.4, M.DARK, x, 2, z, stat, 8);
    box(1.4, 0.12, 0.14, M.WOOD, x - sx * 0.55, 3.55, z);
    W.lanternAt(stat, x - sx * 1.05, 3.55, z, 0.75);
    blockCircle(x, z, 0.4);
  }
  for (const z of [20, 32, 44]) W.light(stat, 0, 3.2, z, 0xff8a40, 16, 1.6, 9);

  for (let i = 0; i < 18; i++) {                                           // vườn La Hán: 9 vị mỗi bên lối đi
    const side = i < 9 ? -1 : 1, z = 16 + (i % 9) * 4;
    const a = makeArhat(i); a.position.set(side * 8.8, 0, z); a.rotation.y = -side * Math.PI / 2; stat.add(a);
    blockCircle(side * 8.8, z, 0.75);
  }

  const potTrunk = mat('trunk', 0x4e3322, { roughness: 1 });
  const bonsai = (x, z, y = 0, s = 1) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); stat.add(g);
    cyl(0.75, 0.55, 0.9, M.POT, 0, 0.45, 0, g, 14);
    const trunk = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.8, 0), new THREE.Vector3(0.25, 1.4, 0.1), new THREE.Vector3(-0.1, 2.0, -0.1), new THREE.Vector3(0.3, 2.6, 0.1)
    ]), 16, 0.13, 6);
    mesh(trunk, potTrunk, 0, 0, 0, g);
    const leaf = mat('bonsai', 0x3f7a35, { flatShading: true });
    for (const [bx, by, bz, br] of [[0.3, 2.9, 0.1, 0.8], [-0.7, 2.3, 0.3, 0.6], [0.9, 2.2, -0.2, 0.55], [-0.2, 3.3, -0.3, 0.55]]) {
      const b = mesh(new THREE.IcosahedronGeometry(br, 1), leaf, bx, by, bz, g); b.scale.y = 0.7;
    }
    blockCircle(x, z, 0.8);
  };
  for (const z of [22, 34, 46]) for (const sx of [-1, 1]) bonsai(sx * 13.5, z);
  for (const x of [-30, -22, 36, 44]) bonsai(x, 52);
  for (const sx of [-1, 1]) for (const z of [-20, -8]) bonsai(sx * 28, z, UP);
  for (const z of [17, 29, 41]) for (const sx of [-1, 1]) W.flagSpots.push({ x: sx * 11.5, z, y: 0 });
  for (const sx of [-1, 1]) W.flagSpots.push({ x: sx * 12, z: -9, y: UP });

  /* ================= HỒ SEN ================= */
  {
    flatRot(mesh(new THREE.CircleGeometry(POND.r, 40), mat('pondbot', 0x1f3a33), POND.x, 0.06, POND.z, stat, false));
    flatRot(mesh(new THREE.CircleGeometry(POND.r, 40), new THREE.MeshStandardMaterial({ color: 0x3f8f99, transparent: true, opacity: 0.6, roughness: 0.05, metalness: 0.3 }), POND.x, 0.2, POND.z, stat, false));
    const rim = mesh(new THREE.TorusGeometry(POND.r + 0.1, 0.4, 10, 64), M.WHITE, POND.x, 0.24, POND.z, stat); rim.rotation.x = Math.PI / 2;
    const pad = new THREE.CircleGeometry(0.6, 16, 0.3, Math.PI * 1.8); pad.rotateX(-Math.PI / 2);
    const padM = mat('pad', 0x3f7d33), pink = mat('pink', 0xf3a6bd, { emissive: 0x5a1a2a, emissiveIntensity: 0.3 });
    const petal = new THREE.SphereGeometry(0.22, 8, 6);
    for (let i = 0; i < 24; i++) {
      const a = R() * 6.28, r = 1.2 + R() * (POND.r - 2.4), x = POND.x + Math.cos(a) * r, z = POND.z + Math.sin(a) * r;
      mesh(pad, padM, x, 0.23, z, stat, false).rotation.y = R() * 6;
      if (i % 3 === 0) {
        const f = new THREE.Group(); f.position.set(x, 0.27, z); stat.add(f);
        for (let k = 0; k < 8; k++) {
          const p = mesh(petal, pink, Math.cos(k * 0.785) * 0.13, 0.15, Math.sin(k * 0.785) * 0.13, f, false);
          p.scale.set(0.6, 1.3, 0.45); p.rotation.set(Math.sin(k * 0.785) * 0.5, 0, -Math.cos(k * 0.785) * 0.5);
        }
      }
    }
    blockCircle(POND.x, POND.z, POND.r + 0.3);
  }

  /* ================= CÂY BỒ ĐỀ ================= */
  {
    const g = new THREE.Group(); g.position.set(BODHI.x, 0, BODHI.z); stat.add(g);
    const bark = mat('bark', 0x5a4636, { roughness: 1 });
    cyl(2.4, 2.6, 0.4, M.STONE, 0, 0.2, 0, g, 18);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, t = cyl(0.55, 0.9, 9, bark, Math.cos(a) * 0.7, 4.5, Math.sin(a) * 0.7, g, 8);
      t.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
    }
    for (let i = 0; i < 8; i++) { const a = R() * 6.28, b = cyl(0.25, 0.45, 6, bark, Math.cos(a) * 3, 8.4, Math.sin(a) * 3, g, 6); b.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); }
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28, r = mesh(new THREE.SphereGeometry(0.8, 8, 6), bark, Math.cos(a) * 1.8, 0.45, Math.sin(a) * 1.8, g); r.scale.set(1.6, 0.35, 0.6); r.rotation.y = -a; }
    for (let i = 0; i < 46; i++) { const a = R() * 6.28, d = 2.5 + R() * 7, hh = 4 + R() * 5; const r = cyl(0.04, 0.07, hh, bark, Math.cos(a) * d, 9.5 - hh / 2, Math.sin(a) * d, g, 4, false); r.rotation.z = (R() - 0.5) * 0.1; }
    const leaf = [0x4f8a3c, 0x5c9a45, 0x437a35].map(c => mat('bodhi' + c, c, { flatShading: true }));
    for (let i = 0; i < 36; i++) {
      const a = R() * 6.28, d = R() * 8.5;
      const b = mesh(new THREE.IcosahedronGeometry(1, 1), leaf[i % 3], Math.cos(a) * d, 10.2 + R() * 4.5 - d * 0.25, Math.sin(a) * d, g);
      b.scale.set(2.6 + R() * 1.4, 1.6 + R() * 0.8, 2.6 + R() * 1.4);
    }
    box(1.4, 0.9, 1, M.STONE, 2.8, 0.45, -1.2, g); box(1, 0.7, 0.7, M.RED, 2.8, 1.25, -1.2, g);   // miếu nhỏ dưới gốc
    blockCircle(BODHI.x, BODHI.z, 2.2);
  }

  /* ================= ĐÀI QUÁN THẾ ÂM ================= */
  {
    const qa = buildQuanAm();
    qa.root.position.set(STATUE.x, 0, STATUE.z);          // mặt tượng quay về +z: ra biển Đông
    stat.add(qa.root);
    W.quanAm = qa;
    blockCircle(STATUE.x, STATUE.z, 18.4);
    // đèn đá hình đài sen quanh vòng đi
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 + 0.26, x = STATUE.x + Math.cos(a) * 21.8, z = STATUE.z + Math.sin(a) * 21.8;
      if (z > 54.3 || x > 89.3 || z < 3) continue;
      cyl(0.35, 0.45, 1.1, M.WHITE, x, 0.55, z, stat, 10); mesh(new THREE.SphereGeometry(0.42, 12, 8), M.PEARL, x, 1.35, z, stat, false).scale.y = 0.8;
      blockCircle(x, z, 0.5);
    }
    // đèn pha ban đêm rọi lên tượng
    W.light(stat, STATUE.x - 10, 7, STATUE.z + 22, 0xfff0d8, 60, 1.4, 45);
    W.light(stat, STATUE.x + 12, 7, STATUE.z + 22, 0xfff0d8, 60, 1.4, 45);
  }

  /* ================= SÂN TRÊN ================= */
  const ZB = 74;      // sân trên sâu 74 m (sân sau nới thêm 18 m so với bản đầu)
  box(80, UP, ZB, M.STONE, 0, UP / 2, -ZB / 2);
  flatRot(mesh(new THREE.PlaneGeometry(79.4, ZB - 0.4), M.PAVE, 0, UP + 0.01, -(ZB - 0.4) / 2, stat, false));
  wall(0, -ZB - 0.2, 80, 0.8, 3, UP);
  wall(39.9, -ZB / 2, 0.8, ZB, 3, UP);                   // tường đông
  wall(-39.9, -32.25, 0.8, 64.5, 3, UP);                 // tường tây, chừa cổng Đường Mây ở z = -64,5 … -71,5
  wall(-39.9, -72.75, 0.8, 2.5, 3, UP);

  // đại bậc thang 21 bậc, lan can rồng, thềm rồng ở giữa
  {
    const N = 21, tread = STAIR_RUN / N;
    for (let i = 0; i < N; i++) box(14, (UP / N) * (i + 1), tread, M.STONE, 0, (UP / N) * (i + 1) / 2, STAIR_RUN - tread / 2 - i * tread);
    const slope = Math.atan(UP / STAIR_RUN), L = Math.hypot(STAIR_RUN, UP);
    for (const sx of [-1, 1]) {
      const r = box(0.9, 1.2, L, M.WHITE, sx * 7.4, UP / 2 + 0.55, STAIR_RUN / 2); r.rotation.x = slope;
      const hd = mesh(new THREE.SphereGeometry(0.55, 14, 10), M.WHITE, sx * 7.4, 1.0, STAIR_RUN + 0.2); hd.scale.set(0.8, 1, 1.4);
      mesh(new THREE.ConeGeometry(0.12, 0.7, 6), M.WHITE, sx * 7.4, 1.6, STAIR_RUN - 0.1).rotation.x = -0.5;
      blockBox(sx * 7.4 - 0.5, sx * 7.4 + 0.5, 0, STAIR_RUN + 0.6);
    }
    const slab = box(2.4, 0.4, L, mat('carve', 0xcfc6b6), 0, UP / 2 + 0.05, STAIR_RUN / 2); slab.rotation.x = slope;
    const dp = [];
    for (let i = 0; i <= 24; i++) { const k = i / 24, z = STAIR_RUN - k * STAIR_RUN, y = UP * (STAIR_RUN - z) / STAIR_RUN; dp.push(new THREE.Vector3(Math.sin(k * Math.PI * 4) * 0.6, y + 0.45, z)); }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(dp), 90, 0.2, 8), mat('carve2', 0xbdb3a1), 0, 0, 0);
    blockBox(-1.2, 1.2, 0, STAIR_RUN);
    balustrade(stat, -38.2, -0.3, -7.9, -0.3, UP); balustrade(stat, 7.9, -0.3, 38.2, -0.3, UP);
  }

  // lư hương lớn
  {
    const g = new THREE.Group(); g.position.set(BURNER.x, UP, BURNER.z); stat.add(g);
    cyl(2.8, 3, 0.5, M.STONE, 0, 0.25, 0, g, 8); cyl(2.2, 2.4, 0.6, M.WHITE, 0, 0.8, 0, g, 8);
    for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28; const leg = cyl(0.18, 0.28, 1.3, M.BRONZE, Math.cos(a) * 1.3, 1.6, Math.sin(a) * 1.3, g, 8); leg.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); }
    const prof = [[0.01, 2], [1.4, 2], [1.9, 2.3], [2.05, 2.9], [1.85, 3.4], [1.55, 3.6], [1.75, 3.75], [1.6, 3.85]].map(p => new THREE.Vector2(...p));
    const bz = M.BRONZE.clone(); bz.side = THREE.DoubleSide;
    mesh(new THREE.LatheGeometry(prof, 40), bz, 0, 0, 0, g);
    flatRot(mesh(new THREE.CircleGeometry(1.55, 32), mat('ash', 0x9c958a), 0, 3.55, 0, g));
    for (const sx of [-1, 1]) { const ear = mesh(new THREE.TorusGeometry(0.5, 0.12, 8, 20, Math.PI), M.BRONZE, sx * 1.95, 3.9, 0, g); ear.rotation.y = Math.PI / 2; }
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + 0.78; cyl(0.06, 0.06, 1.6, M.BRONZE, Math.cos(a) * 1.4, 4.5, Math.sin(a) * 1.4, g, 6); }
    roof(g, { w: 3.6, d: 3.6, h: 1.1, y: 5.3, s: 0.4 });
    W.incense = new THREE.Group(); W.incense.position.y = 3.55; g.add(W.incense); W.incense.userData.dynamic = true;
    W.smokeOrigin = new THREE.Vector3(BURNER.x, UP + 4.6, BURNER.z);
    W.light(g, 0, 5, 0, 0xffa050, 12, 1.8, 6);
    blockCircle(BURNER.x, BURNER.z, 2.6);
  }

  // gác chuông và gác trống
  const pavilion = (cx, cz) => {
    const g = new THREE.Group(); g.position.set(cx, UP, cz); stat.add(g);
    box(8, 0.5, 8, M.STONE, 0, 0.25, 0, g);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { column(g, sx * 3, 0.5, sz * 3, 6.4, 0.3); blockCircle(cx + sx * 3, cz + sz * 3, 0.4); }
    box(7, 0.4, 7, M.RED, 0, 7.1, 0, g);
    roof(g, { w: 10.5, d: 10.5, h: 2.4, y: 7.3, s: 0.75 });
    box(4.4, 2.2, 4.4, M.WALL, 0, 9.8, 0, g);
    roof(g, { w: 7.2, d: 7.2, h: 2.2, y: 10.8, s: 0.65, dragons: true });
    balustrade(g, -3.6, 3.6, -1.2, 3.6, 0.5, 1.2); balustrade(g, 1.2, 3.6, 3.6, 3.6, 0.5, 1.2);
    blockLine(cx - 3.6, cz + 3.6, cx - 1.2, cz + 3.6, 0.3); blockLine(cx + 1.2, cz + 3.6, cx + 3.6, cz + 3.6, 0.3);      // lan can gác chuông / trống, chừa lối vào ở giữa
    return g;
  };
  {
    const g = pavilion(BELL.x, BELL.z);
    const pivot = new THREE.Group(); pivot.position.set(0, 6.9, 0); pivot.userData.dynamic = true; g.add(pivot);
    const prof = [[1.35, -3.1], [1.3, -2.9], [1.05, -2.2], [0.92, -1.2], [0.9, -0.5], [0.72, -0.15], [0.01, 0]].map(p => new THREE.Vector2(...p));
    const bellM = mat('bell', 0x56704c, { metalness: 0.8, roughness: 0.38, side: THREE.DoubleSide });
    mesh(new THREE.LatheGeometry(prof, 40), bellM, 0, 0, 0, pivot);
    for (const y of [-0.7, -1.6, -2.6]) { const t = mesh(new THREE.TorusGeometry(y < -2 ? 1.18 : 0.95, 0.05, 6, 40), bellM, 0, y, 0, pivot); t.rotation.x = Math.PI / 2; }
    mesh(new THREE.TorusGeometry(0.3, 0.1, 8, 16), bellM, 0, 0.2, 0, pivot);
    const striker = new THREE.Group(); striker.position.set(1.8, 5.4, 0); striker.userData.dynamic = true; g.add(striker);
    for (const sz of [-0.5, 0.5]) cyl(0.02, 0.02, 1.6, mat('rope', 0xc9b48a), 0.8, 0.8, sz, striker, 4, false);
    const log = cyl(0.22, 0.22, 2.4, M.WOOD, 0.8, 0, 0, striker, 10); log.rotation.z = Math.PI / 2;
    W.anim.bellPivot = pivot; W.anim.bellStriker = striker;
    W.bellPos = new THREE.Vector3(BELL.x, UP + 3.5, BELL.z);
  }
  {
    const g = pavilion(DRUM.x, DRUM.z);
    const stand = new THREE.Group(); stand.position.set(0, 0.5, 0); g.add(stand);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = cyl(0.08, 0.08, 2.4, M.WOOD, sx * 0.9, 1.2, sz * 1.2, stand, 6); leg.rotation.x = sz * 0.15; }
    const drum = new THREE.Group(); drum.position.set(0, 2.6, 0); drum.userData.dynamic = true; g.add(drum);
    const prof = [[1.25, -0.9], [1.45, -0.45], [1.5, 0], [1.45, 0.45], [1.25, 0.9]].map(p => new THREE.Vector2(...p));
    const body = mesh(new THREE.LatheGeometry(prof, 32), M.RED, 0, 0, 0, drum); body.rotation.x = Math.PI / 2;
    for (const sz of [-1, 1]) {
      const face = mesh(new THREE.CircleGeometry(1.25, 32), mat('skin', 0xe8d3a8), 0, 0, sz * 0.9, drum); face.rotation.y = sz > 0 ? 0 : Math.PI;
      mesh(new THREE.TorusGeometry(1.25, 0.06, 6, 40), M.GOLD, 0, 0, sz * 0.9, drum);
    }
    W.anim.drum = drum;
  }

  // tả vu - hữu vu: hành lang hai bên sân trên
  for (const sx of [-1, 1]) {
    const ZC = -34, HL = 28;                         // hành lang dài 56 m, từ z = -62 đến z = -6 (chừa góc đông bắc cho nhà ăn)
    const g = new THREE.Group(); g.position.set(sx * 34.5, UP, ZC); stat.add(g);
    box(7.5, 0.6, 2 * HL, M.STONE, 0, 0.3, 0, g);
    box(0.5, 5, 2 * HL - 1, M.WALL, sx * 3.4, 3.1, 0, g);
    box(0.3, 4.4, 2 * HL - 1.5, M.WALL, -sx * 1.05, 2.9, 0, g);
    for (let i = 0; i < 11; i++) {
      const z = (i - 5) * 4.5;
      const o = mesh(new THREE.PlaneGeometry(4, 3.4), M.LATTICE, -sx * 1.22, 2.6, z, g, false); o.rotation.y = -sx * Math.PI / 2;
    }
    for (let i = 0; i < 13; i++) { const z = (i - 6) * 4.2; column(g, -sx * 3.2, 0.6, z, 4.4, 0.26); blockCircle(sx * 34.5 - sx * 3.2, ZC + z, 0.3); }
    roofZ(g, { len: 2 * HL + 3, wid: 10, h: 2.6, y: 5.4, s: 0.7, ridge: 2 * HL - 2 });
    for (let i = 0; i < 7; i++) W.lanternAt(g, -sx * 3.2, 4.9, (i - 3) * 8.4 + 2.1, 0.6);
    blockBox(sx > 0 ? 33.3 : -38.6, sx > 0 ? 38.6 : -33.3, ZC - HL, ZC + HL);
  }

  buildHall(stat, W);
  buildKitchen(stat, W);
  buildDining(stat, W);
  buildPilgrimStairs(stat, W);                           // Đường Mây 1.080 bậc phía sau, bên tây
  buildSummit(stat, W);                                  // sân đỉnh: Chùa Đồng, tượng, thiền đài, tử vi, hai đài ngắm mây, check-in
  buildCable(stat, W);                                   // cáp treo từ đỉnh xuống chân núi

  // dãy nhà Tổ - giảng đường phía sau chánh điện
  {
    const g = new THREE.Group(); g.position.set(0, UP, -69.5); stat.add(g);
    box(46, 0.5, 6.6, M.STONE, 0, 0.25, 0, g);
    box(44, 4.2, 5.4, M.WALL, 0, 2.6, 0, g);
    for (const x of [-15, -5, 5, 15]) mesh(new THREE.PlaneGeometry(3.2, 2.6), M.LATTICE, x, 2.6, 2.72, g, false);
    roof(g, { w: 48, d: 8.6, h: 2.2, y: 4.7, s: 0.7, ridge: 40 });
    blockBox(-23, 23, -73, -66.2);
  }

  /* ================= KẾT THÚC ================= */
  bake(stat);
  setRoot(scene);
  return W;
}
