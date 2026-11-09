import * as THREE from 'three';
import { UP, DINING } from '/shared/layout.js';
import { mesh, box, cyl, sph, textPlate, mat, rng } from './util.js';
import { M } from './materials.js';
import { roof, column } from './parts.js';
import { blockBox, blockCircle } from './collision.js';
import { makeSteam } from './kitchen.js';

const flatRot = m => { m.rotation.x = -Math.PI / 2; return m; };

/* TRAI ĐƯỜNG (nhà ăn) cho chư Tăng và Phật tử, sát tường sau sân sau, góc đông bắc, kế đầu bắc nhà bếp.
 * Toạ độ cục bộ: gốc ở tâm nhà, +x đông, +z nam (mặt hở nhìn ra sân), -z là tường sau. Nhà không xoay.
 * Hai bàn thấp dài, bốn dãy chiếu ngồi xếp bằng đối diện nhau qua bàn (16 chỗ), thùng cơm và tủ chén ở đầu đông.
 * Vị trí người ngồi/đứng đặt ở server/npc.js, phải khớp với bố cục này (SEAT_ROWS, SEAT_X, thùng cơm). */
export const SEAT_X = [-3, -1, 1, 3];
export const SEAT_ROWS = [-2.4, -0.4, 1.1, 3.1];     // z của từng dãy ngồi
export const TABLE_Z = [-1.4, 2.1];                  // z tâm hai bàn
export const RICE_TUB = { x: 5.4, z: -2.2 };         // người xới cơm đứng ở (5.4, -1.0) nhìn về phía thùng

export function buildDining(scene, W) {
  const R = rng(91);
  const g = new THREE.Group(); g.position.set(DINING.x, UP, DINING.z); scene.add(g);
  const bb = (x1, x2, z1, z2) => blockBox(DINING.x + x1, DINING.x + x2, DINING.z + z1, DINING.z + z2);
  const bc = (x, z, r) => blockCircle(DINING.x + x, DINING.z + z, r);

  const PLANK = mat('diningfloor', 0x9a7650, { roughness: 0.85 });
  PLANK.polygonOffset = true; PLANK.polygonOffsetFactor = -2; PLANK.polygonOffsetUnits = -2;
  const CHIEU = mat('chieu', 0xc9b27a);
  const BOWL = mat('bowl', 0xe9e2d0, { roughness: 0.4 });
  const RICE = mat('rice', 0xf4f0e2);
  const IRON = mat('ironpot', 0x1d1d1f, { metalness: 0.7, roughness: 0.45 });
  const LEAF_A = mat('leafA', 0x4e9a3a), LEAF_B = mat('leafB', 0x7bb648);
  const DISH = mat('dish', 0xd9d2bf, { roughness: 0.5 });

  /* ---------- nền, tường, cột, mái ---------- */
  flatRot(mesh(new THREE.PlaneGeometry(12.8, 7.8), PLANK, 0, 0.03, 0, g, false));
  box(13.2, 3.8, 0.4, M.WALL, 0, 1.9, -3.8, g);                                    // tường sau
  bb(-6.6, 6.6, -4.05, -3.55);
  box(0.4, 3.8, 7.2, M.WALL, 6.4, 1.9, 0, g);                                      // tường đông, hai cửa sổ chấn song nhìn vào trong
  bb(6.2, 6.6, -3.7, 3.7);
  for (const z of [-1.4, 1.4]) mesh(new THREE.PlaneGeometry(2.4, 2.1), M.LATTICE, 6.18, 2.2, z, g, false).rotation.y = -Math.PI / 2;
  box(0.4, 3.8, 3.6, M.WALL, -6.4, 1.9, -1.9, g);                                 // tường tây, chừa cửa rộng 2,1 m
  box(0.4, 3.8, 1.7, M.WALL, -6.4, 1.9, 2.85, g);
  box(0.4, 1.0, 2.1, M.WALL, -6.4, 3.3, 0.95, g);
  bb(-6.6, -6.2, -3.7, -0.1); bb(-6.6, -6.2, 2.0, 3.7);
  for (const x of [-6, -2, 2, 6]) { column(g, x, 0, 4.0, 3.8, 0.28); bc(x, 4.0, 0.38); }
  box(13.6, 0.4, 0.5, M.RED2, 0, 3.55, 4.0, g);                                    // xà trước
  const ceil = mesh(new THREE.PlaneGeometry(13, 8), M.WOOD, 0, 3.78, 0, g, false); ceil.rotation.x = Math.PI / 2;
  roof(g, { w: 14.8, d: 8.6, h: 2.0, y: 3.8, s: 0.6, ridge: 6.6 });
  textPlate('TRAI ĐƯỜNG', 3.2, 0.62, 0, 3.0, 4.12, g, 0);
  textPlate('ĂN TRONG CHÁNH NIỆM', 5.2, 0.62, 0, 2.7, -3.55, g, 0);                // biển trên tường sau
  W.light(g, 0, 2.8, 0, 0xffc890, 16, 1.6, 8, 4);
  for (const x of [-4.5, 4.5]) W.lanternAt(g, x, 3.0, 3.6, 0.6);

  /* ---------- bàn thấp, chiếu, bát đũa ---------- */
  for (const tz of TABLE_Z) {
    box(8.6, 0.07, 0.8, M.WOOD, 0, 0.4, tz, g);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.08, 0.38, 0.08, M.WOOD, sx * 4.1, 0.19, tz + sz * 0.3, g, false);
    bb(-4.4, 4.4, tz - 0.45, tz + 0.45);
    for (const x of [-2.2, 0, 2.2]) {                                              // đĩa rau, bát canh giữa bàn
      cyl(0.17, 0.14, 0.04, DISH, x, 0.455, tz, g, 12, false);
      for (let k = 0; k < 4; k++) sph(0.06 + R() * 0.03, (k + (x > 0 ? 1 : 0)) % 2 ? LEAF_A : LEAF_B, x + (R() - 0.5) * 0.18, 0.5 + R() * 0.03, tz + (R() - 0.5) * 0.18, g, false, 6, 4);
    }
    cyl(0.2, 0.17, 0.2, IRON, 0, 0.56, tz - 0.12, g, 14, false);                  // nồi canh nhỏ
    for (const side of [-1, 1]) for (const x of SEAT_X) {
      cyl(0.075, 0.05, 0.07, BOWL, x, 0.475, tz + side * 0.25, g, 10, false);     // bát cơm của từng chỗ
      flatRot(mesh(new THREE.CircleGeometry(0.066, 10), RICE, x, 0.512, tz + side * 0.25, g, false));
    }
  }
  for (const zr of SEAT_ROWS) box(8.8, 0.02, 0.95, CHIEU, 0, 0.04, zr, g, false);

  /* ---------- thùng cơm ở góc đông bắc và tủ chén ---------- */
  cyl(0.6, 0.66, 1.1, M.WOOD, RICE_TUB.x, 0.62, RICE_TUB.z, g, 18);
  for (const y of [0.35, 0.85]) { const hoop = mesh(new THREE.TorusGeometry(0.64, 0.025, 6, 28), IRON, RICE_TUB.x, y, RICE_TUB.z, g); hoop.rotation.x = Math.PI / 2; }
  flatRot(mesh(new THREE.CircleGeometry(0.57, 20), RICE, RICE_TUB.x, 1.175, RICE_TUB.z, g, false));
  bc(RICE_TUB.x, RICE_TUB.z, 0.75);
  box(0.6, 0.9, 3.0, M.WOOD, 5.85, 0.45, 1.6, g);
  for (let k = 0; k < 5; k++) for (let h = 0; h < 4; h++) cyl(0.08, 0.055, 0.06, BOWL, 5.85, 0.93 + h * 0.055, 0.4 + k * 0.55, g, 10, false);
  bb(5.5, 6.2, 0.0, 3.2);

  const stepSteam = makeSteam(g, [[RICE_TUB.x, RICE_TUB.z, 1.25]], R);
  W.anim.dining = { update(t, dt) { stepSteam(dt); } };
  return g;
}
