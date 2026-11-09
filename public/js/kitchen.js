import * as THREE from 'three';
import { UP, KITCHEN, kitchenToWorld } from '/shared/layout.js';
import { mesh, box, cyl, sph, textPlate, mat, rng, softDot } from './util.js';
import { M } from './materials.js';
import { roof, column } from './parts.js';
import { blockBox, blockCircle } from './collision.js';

const flatRot = m => { m.rotation.x = -Math.PI / 2; return m; };

/* NHÀ TRÙ (nhà bếp chùa) ở sân sau, tựa vào hành lang hữu vu (xem KITCHEN trong shared/layout.js).
 * Toạ độ cục bộ: gốc ở tâm nhà, +z là mặt hở nhìn ra sân, -z là tường sau; nhà được xoay để tường sau sát hành lang phía đông.
 * Nhà rộng 23 m x 6 m: bếp củi ba ông Táo dọc tường sau (nồi cơm, nồi canh, xửng hấp),
 * bàn thái rau bên phải, hai chiếc chiếu ngồi lặt rau ở phía trước.
 * Vị trí các Phật tử làm công quả đặt ở server/npc.js, phải khớp với bố cục này. */
export function buildKitchen(scene, W) {
  const R = rng(77);
  const g = new THREE.Group(); g.position.set(KITCHEN.x, UP, KITCHEN.z); g.rotation.y = KITCHEN.rot; scene.add(g);
  /* va chạm khai báo theo toạ độ cục bộ rồi đổi sang thế giới (nhà xoay 90° nên hộp vẫn song song trục) */
  const bb = (x1, x2, z1, z2) => {
    const [ax, az] = kitchenToWorld(x1, z1), [bx, bz] = kitchenToWorld(x2, z2);
    blockBox(Math.min(ax, bx), Math.max(ax, bx), Math.min(az, bz), Math.max(az, bz));
  };
  const bc = (x, z, r) => { const [wx, wz] = kitchenToWorld(x, z); blockCircle(wx, wz, r); };

  const IRON = mat('ironpot', 0x1d1d1f, { metalness: 0.7, roughness: 0.45 });
  const HOLE = mat('firehole', 0x0d0806);
  const EMBER = new THREE.MeshStandardMaterial({ color: 0x3a1004, emissive: 0xff6418, emissiveIntensity: 1.8, roughness: 0.8 });
  const RICE = mat('rice', 0xf4f0e2);
  const BROTH = mat('broth', 0x8a7a3a);
  const BAMBOO = mat('bamboo', 0xb38a4c);
  const CHIEU = mat('chieu', 0xc9b27a);
  const LEAF_A = mat('leafA', 0x4e9a3a), LEAF_B = mat('leafB', 0x7bb648), CARROT = mat('carrot', 0xe0701c);
  const BOARD = mat('board', 0xb08a55);
  const JAR = mat('jar', 0x6e4528, { roughness: 0.55 });
  const SACK = mat('sack', 0xcfc09a);
  const LOG = mat('log', 0x5a3a22, { roughness: 1 });

  /* ---------- nền, tường, cột, mái ---------- */
  flatRot(mesh(new THREE.PlaneGeometry(23.2, 6.4), M.BRICK, 0, 0.03, 0, g, false));
  box(23.4, 3.8, 0.4, M.WALL, 0, 1.9, -2.9, g);                                   // tường sau
  bb(-11.6, 11.6, -3.15, -2.75);
  for (const sx of [-1, 1]) {                                                      // tường hai đầu hồi, chừa cửa rộng 2,1 m
    box(0.4, 3.8, 1.9, M.WALL, sx * 11.3, 1.9, -2.0, g);
    box(0.4, 3.8, 1.9, M.WALL, sx * 11.3, 1.9, 2.0, g);
    box(0.4, 1.0, 2.3, M.WALL, sx * 11.3, 3.3, 0, g);
    const x1 = sx > 0 ? 11.1 : -11.5, x2 = sx > 0 ? 11.5 : -11.1;
    bb(x1, x2, -3.15, -1.05); bb(x1, x2, 1.05, 3.15);
  }
  for (const x of [-10, -6, -2, 2, 6, 10]) { column(g, x, 0, 3.0, 3.8, 0.28); bc(x, 3.0, 0.38); }
  box(23.6, 0.4, 0.5, M.RED2, 0, 3.55, 3.0, g);                                  // xà trước
  const ceil = mesh(new THREE.PlaneGeometry(23.4, 6.2), M.WOOD, 0, 3.78, 0, g, false); ceil.rotation.x = Math.PI / 2;
  roof(g, { w: 25.4, d: 7.8, h: 2.2, y: 3.8, s: 0.6, ridge: 18 });
  textPlate('NHÀ TRÙ', 3.2, 0.62, 0, 3.0, 3.12, g, 0);

  /* ---------- bếp củi: 3 lò dọc tường sau ---------- */
  const potTop = 1.17;
  [-7.5, -3.5, 0.5].forEach((x, i) => {
    box(3, 0.65, 1.5, M.BRICK, x, 0.325, -2.15, g);
    box(3.12, 0.07, 1.62, M.DARK, x, 0.685, -2.15, g);
    box(0.95, 0.42, 0.1, HOLE, x, 0.3, -1.38, g, false);                         // cửa lò
    box(0.7, 0.22, 0.05, EMBER, x, 0.22, -1.33, g, false);                       // than hồng
    bb(x - 1.56, x + 1.56, -2.95, -1.35);
    if (i < 2) {                                                                 // nồi cơm, nồi canh
      cyl(0.78, 0.66, 0.45, IRON, x, 0.72 + 0.225, -2.15, g, 24);
      const rim = mesh(new THREE.TorusGeometry(0.78, 0.035, 6, 28), IRON, x, potTop, -2.15, g); rim.rotation.x = Math.PI / 2;
      flatRot(mesh(new THREE.CircleGeometry(0.74, 24), i === 0 ? RICE : BROTH, x, potTop + 0.005, -2.15, g, false));
    } else {                                                                     // xửng hấp 3 tầng, nắp chóp
      for (let k = 0; k < 3; k++) cyl(0.62, 0.62, 0.3, BAMBOO, x, 0.72 + 0.15 + k * 0.3, -2.15, g, 20);
      mesh(new THREE.ConeGeometry(0.66, 0.3, 20), BAMBOO, x, 0.72 + 0.9 + 0.15, -2.15, g);
    }
  });
  W.light(g, -2, 2.8, 0, 0xffa860, 16, 1.6, 8, 4);                               // ánh đèn bếp ấm

  /* củi chất ở đầu tây */
  for (let row = 0; row < 4; row++) for (let k = 0; k < 5 - row; k++) {
    const l = cyl(0.09, 0.09, 1.15, LOG, -10.2, 0.1 + row * 0.17, -2.5 + k * 0.2 + row * 0.1, g, 7);
    l.rotation.z = Math.PI / 2;
  }
  bb(-10.9, -9.5, -2.95, -1.5);

  /* ---------- bàn thái rau ---------- */
  box(4.6, 0.08, 1.0, M.WOOD, 5.5, 0.84, -1.3, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.1, 0.8, 0.1, M.WOOD, 5.5 + sx * 2.2, 0.4, -1.3 + sz * 0.42, g, false);
  bb(3.1, 7.9, -1.85, -0.75);
  for (const x of [4.6, 6.4]) {
    box(1.1, 0.04, 0.55, BOARD, x, 0.9, -1.1, g, false);                          // thớt
    for (let k = 0; k < 7; k++) sph(0.05 + R() * 0.03, k % 3 ? LEAF_A : CARROT, x - 0.35 + k * 0.12, 0.96, -1.1 + (R() - 0.5) * 0.25, g, false, 6, 4);
  }
  cyl(0.36, 0.26, 0.2, BAMBOO, 5.5, 0.98, -1.4, g, 14);                           // rổ rau giữa bàn
  for (let k = 0; k < 9; k++) sph(0.1 + R() * 0.05, k % 2 ? LEAF_A : LEAF_B, 5.5 + (R() - 0.5) * 0.4, 1.12 + R() * 0.08, -1.4 + (R() - 0.5) * 0.4, g, false, 6, 4);

  /* dụng cụ treo trên tường sau */
  box(5, 0.06, 0.06, M.WOOD, 6.5, 2.1, -2.65, g, false);
  for (let k = 0; k < 6; k++) {
    const x = 4.5 + k * 0.8;
    cyl(0.015, 0.015, 0.85, IRON, x, 1.65, -2.65, g, 5, false);
    cyl(k % 2 ? 0.1 : 0.06, 0.1, 0.05, IRON, x, 1.2, -2.65, g, 10, false);
  }

  /* ---------- lu nước, bao gạo ---------- */
  for (const [x, z] of [[9.2, -2.2], [10.3, -1.9]]) {
    cyl(0.42, 0.36, 0.85, JAR, x, 0.425, z, g, 14);
    cyl(0.46, 0.46, 0.06, M.DARK, x, 0.88, z, g, 14);
    bc(x, z, 0.55);
  }
  for (let k = 0; k < 3; k++) box(0.8, 0.35, 0.5, SACK, -10.4, 0.2 + k * 0.36, 1.8, g, false);
  bb(-10.95, -9.85, 1.5, 2.1);

  /* ---------- chiếu và rổ rau để ngồi lặt ---------- */
  box(3.8, 0.02, 2.4, CHIEU, -3, 0.04, 1.45, g, false);                           // chiếu A: hai người ngồi đối diện
  box(2.4, 0.02, 2.8, CHIEU, 1.8, 0.04, 1.75, g, false);                          // chiếu B: một người
  box(1.6, 0.02, 1.2, CHIEU, 0.5, 0.04, -0.9, g, false);                          // chiếu nhỏ trước lò hấp, cho người nhóm lửa
  const veggies = (x, z) => {
    cyl(0.45, 0.36, 0.26, BAMBOO, x, 0.15, z, g, 16);
    for (let k = 0; k < 14; k++) {
      const a = R() * 6.28, r = Math.sqrt(R()) * 0.36;
      sph(0.09 + R() * 0.06, k % 3 ? LEAF_A : LEAF_B, x + Math.cos(a) * r, 0.3 + R() * 0.08, z + Math.sin(a) * r, g, false, 6, 4);
    }
  };
  veggies(-3, 1.45);
  veggies(1.8, 2.25);
  bb(-3.55, -2.45, 0.9, 2.0); bb(1.25, 2.35, 1.7, 2.8);

  /* ---------- hơi nước bốc lên từ nồi, than hồng lập loè ---------- */
  const stepSteam = makeSteam(g, [[-7.5, -2.15, 1.25], [-3.5, -2.15, 1.25], [0.5, -2.15, 1.9]], R);
  W.anim.kitchen = {
    update(t, dt) {
      EMBER.emissiveIntensity = 1.5 + Math.sin(t * 13) * 0.4 + Math.sin(t * 7.3) * 0.3;
      stepSteam(dt);
    }
  };
  return g;
}

/* Hơi nước bốc từ các nguồn [x, z, y] (toạ độ cục bộ của `parent`). Trả về hàm cập nhật theo dt. */
export function makeSteam(parent, sources, R) {
  const tex = softDot('rgba(255,255,255,.7)');
  const group = new THREE.Group(); group.userData.dynamic = true; parent.add(group);
  const puffs = [];
  sources.forEach(([x, z, y]) => {
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
      s.userData = { x, z, y, life: R() * 3.6, a: R() * 6.28, r: R() * 0.35 };
      group.add(s); puffs.push(s);
    }
  });
  return dt => {
    for (const s of puffs) {
      const u = s.userData;
      u.life += dt;
      if (u.life > 3.6) { u.life = 0; u.a = R() * 6.28; u.r = R() * 0.35; }
      const k = u.life / 3.6;
      s.position.set(u.x + Math.cos(u.a) * u.r + k * 0.3, u.y + k * 1.9, u.z + Math.sin(u.a) * u.r);
      s.scale.setScalar(0.5 + k * 1.3);
      s.material.opacity = Math.sin(k * Math.PI) * 0.32;
    }
  };
}
