import * as THREE from 'three';
import { UP, POD, HALL, MO_PLAYER, MO_MONK, CUSHIONS, CUSHION_H } from '/shared/layout.js';
import { mesh, box, cyl, textPlate, mat, rng } from './util.js';
import { M } from './materials.js';
import { roof, column, dragonColumn, balustrade } from './parts.js';
import { blockBox, blockCircle } from './collision.js';
import { makeBuddha } from './statues.js';

/* ĐẠI HÙNG BẢO ĐIỆN: chánh điện hai tầng mái, mặt tiền cột rồng, bàn thờ Thích Ca - Quán Thế Âm - Địa Tạng. */
export function buildHall(scene, W) {
  const R = rng(31);
  const g = new THREE.Group(); g.position.set(HALL.x, 0, HALL.z); scene.add(g);
  const H = 8;                 // chiều cao cột
  const LZ = HALL.z;
  const wz = z => LZ + z;      // toạ độ cục bộ -> thế giới

  /* --- nền, bậc tam cấp, lan can --- */
  box(40, POD - UP, 24, M.STONE, 0, UP + (POD - UP) / 2, 0, g);
  box(40.6, 0.15, 24.6, M.WHITE, 0, POD, 0, g);
  for (let i = 0; i < 5; i++) box(16, 0.24 * (i + 1), 0.7, M.STONE, 0, UP + 0.12 * (i + 1), 15.15 - 0.7 * i, g);
  balustrade(g, -19.8, 11.9, -8.4, 11.9, POD); balustrade(g, 8.4, 11.9, 19.8, 11.9, POD);
  balustrade(g, -19.8, 11.9, -19.8, -11.8, POD); balustrade(g, 19.8, 11.9, 19.8, -11.8, POD);
  const floor = mesh(new THREE.PlaneGeometry(35.6, 19.2), M.FLOOR, 0, POD + 0.09, -0.2, g, false);
  floor.rotation.x = -Math.PI / 2;

  /* --- cột --- */
  for (const x of [-16.5, 16.5]) { column(g, x, POD, 9, H, 0.46); blockCircle(x, wz(9), 0.55); }
  for (const x of [-11, -5.5, 5.5, 11]) { dragonColumn(g, x, POD, 9, H, 0.46, x < 0 ? 1 : -1); blockCircle(x, wz(9), 0.55); }
  for (const x of [-11, 11]) for (const z of [3, -3]) { column(g, x, POD, z, H, 0.46); blockCircle(x, wz(z), 0.55); }
  for (const x of [-16.5, 16.5]) { column(g, x, POD, 11.2, H - 1.2, 0.36); blockCircle(x, wz(11.2), 0.45); }

  /* --- tường: sau, hai bên (cửa chấn song), hai gian bên mặt tiền --- */
  box(36, H + 0.4, 0.6, M.WALL, 0, POD + H / 2 + 0.2, -10, g);
  for (const sx of [-1, 1]) {
    box(0.6, H + 0.4, 19.4, M.WALL, sx * 18, POD + H / 2 + 0.2, -0.4, g);
    for (const z of [-6.8, -2.3, 2.2, 6.7]) {
      const o = mesh(new THREE.PlaneGeometry(4, 4.6), M.LATTICE, sx * 18.32, POD + 3.8, z, g, false); o.rotation.y = sx * Math.PI / 2;
      const i = mesh(new THREE.PlaneGeometry(4, 4.6), M.LATTICE, sx * 17.68, POD + 3.8, z, g, false); i.rotation.y = -sx * Math.PI / 2;
    }
  }
  for (const x of [-13.75, -8.25, 8.25, 13.75]) {
    box(5.3, 1.1, 0.3, M.WOOD, x, POD + 0.6, 9, g);
    mesh(new THREE.PlaneGeometry(5.3, 5.4), M.LATTICE, x, POD + 3.9, 9, g, false);
    box(5.3, 1.5, 0.3, M.WOOD, x, POD + H - 0.8, 9, g);
    blockBox(x - 2.75, x + 2.75, wz(8.7), wz(9.3));
  }
  blockBox(-18.5, 18.5, wz(-10.5), wz(-9.5)); blockBox(17.5, 18.6, wz(-10.4), wz(9.2)); blockBox(-18.6, -17.5, wz(-10.4), wz(9.2));

  /* --- trần, xà, hoành phi --- */
  box(36.6, 0.35, 21, M.WOOD, 0, POD + H + 0.6, -0.5, g);
  box(36.6, 0.7, 0.6, M.RED, 0, POD + H + 0.2, 9, g);
  box(36.6, 0.14, 0.65, M.GOLD, 0, POD + H - 0.2, 9, g, false);
  for (let i = 0; i < 5; i++) box(5, 0.5, 0.12, M.CARVED, -14 + i * 7, POD + H - 0.55, 9.32, g, false);
  textPlate('ĐẠI HÙNG BẢO ĐIỆN', 7.5, 1.4, 0, POD + H - 1.0, 9.35, g);

  /* --- mái hai tầng (trùng thiềm điệp ốc) --- */
  roof(g, { w: 46, d: 30, h: 3.6, y: POD + H + 0.8, s: 1.4, ridge: 26 });
  box(26, 5, 14, M.WALL, 0, POD + H + 3.3, -0.5, g);
  for (const x of [-10.5, -7, 7, 10.5]) mesh(new THREE.PlaneGeometry(2, 1.8), M.LATTICE, x, POD + H + 4.2, 6.52, g, false);
  roof(g, { w: 34, d: 21, h: 4.2, y: POD + H + 5.8, s: 1.6, ridge: 22, dragons: true });
  textPlate('LINH ỨNG TỰ', 7, 1.4, 0, POD + H + 4.3, 6.53, g, 0, { size: 0.5 });

  for (let x = -14; x <= 14; x += 4.66) W.lanternAt(g, x, POD + H - 1.2, 10.4, 1);
  for (let x = -12; x <= 12; x += 6) for (const z of [4, -2]) W.lanternAt(g, x, POD + H - 0.4, z, 1.2);

  /* --- bàn thờ --- */
  const ALT = -7;
  box(24, 1.2, 4.8, M.RED, 0, POD + 0.6, ALT, g); box(24.4, 0.12, 5.1, M.GOLD, 0, POD + 1.25, ALT, g, false);
  box(20, 1.2, 3.4, M.RED, 0, POD + 1.8, ALT - 0.7, g); box(20.4, 0.12, 3.7, M.GOLD, 0, POD + 2.45, ALT - 0.7, g, false);
  box(26, 8, 0.4, M.BACKDROP, 0, POD + 4, -9.6, g);
  /* Tỉ lệ tượng: đỉnh đầu (kể cả nhục kế) phải thấp hơn trần chánh điện (POD + H + 0.6 - 0.18 ≈ 14,6 m).
   * Bản cũ cao 2,1 - 2,5 nên trần cắt ngang đầu tượng ở ngang mắt, nhìn từ dưới lên thấy tượng "cụt đầu". */
  const buddhas = [['quanam', -7, 1.5, 'QUÁN THẾ ÂM BỒ TÁT'], ['sakya', 0, 1.75, 'THÍCH CA MÂU NI PHẬT'], ['diatang', 7, 1.5, 'ĐỊA TẠNG BỒ TÁT']];
  for (const [kind, x, s, label] of buddhas) {
    const b = makeBuddha(kind, M.HALO); b.scale.setScalar(s); b.position.set(x, POD + 2.5, ALT - 0.9); g.add(b);
    textPlate(label, 3.7, 0.62, x, POD + 0.62, ALT + 2.43, g, 0, { size: 0.5 });
  }
  // nến
  for (const x of [-10, -3.5, 3.5, 10]) {
    cyl(0.18, 0.18, 1.1, M.CANDLE, x, POD + 1.85, ALT + 1.6, g, 10);
    const f = mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd28a }), x, POD + 2.55, ALT + 1.6, g, false);
    f.scale.y = 1.8; f.userData.dynamic = true;
    (W.anim.flames ??= []).push(f);
  }
  // mâm quả
  const fruitC = [0xe0482a, 0xf2c12e, 0x6aa83a, 0xe88a2a, 0x9a3fa0];
  for (const x of [-6.5, 6.5]) {
    cyl(0.9, 0.6, 0.2, M.GOLD, x, POD + 1.35, ALT + 1.5, g, 16);
    for (let k = 0; k < 9; k++) mesh(new THREE.SphereGeometry(0.22, 10, 8), mat('fruit' + (k % 5), fruitC[k % 5], { roughness: 0.4 }), x + (R() - 0.5), POD + 1.6 + (k > 5 ? 0.3 : 0), ALT + 1.5 + (R() - 0.5) * 0.8, g, false);
  }
  // bình hoa sen
  for (const x of [-1.6, 1.6]) {
    cyl(0.3, 0.2, 0.8, M.POT, x, POD + 1.65, ALT + 1.7, g, 12);
    for (let k = 0; k < 3; k++) mesh(new THREE.SphereGeometry(0.22, 8, 6), mat('lotusPinkF', 0xf3a6bd), x + (k - 1) * 0.25, POD + 2.4 + (k % 2) * 0.3, ALT + 1.7, g, false).scale.y = 1.3;
  }
  blockBox(-12.2, 12.2, wz(-9.5), wz(ALT + 2.5));

  /* --- bồ đoàn --- */
  for (const c of CUSHIONS) cyl(0.55, 0.6, CUSHION_H, M.CUSHION, c.x, POD + CUSHION_H / 2, c.z - LZ, g, 18, false);

  /* --- mõ của người chơi và mõ của sư thầy --- */
  const moFor = (p, size, key) => {
    const lz = p.z - LZ;
    if (key === 'player') { box(1.6, 0.6, 1.2, M.WOOD, p.x, POD + 0.3, lz, g); blockBox(p.x - 0.9, p.x + 0.9, p.z - 0.7, p.z + 0.7); }
    else { box(0.7, 0.06, 0.6, M.CUSHION, p.x, POD + 0.03, lz, g); blockBox(p.x - 0.5, p.x + 0.5, p.z - 0.4, p.z + 1.4); }
    const m = mesh(new THREE.SphereGeometry(size, 20, 14), mat('mo', 0x8a2f17, { roughness: 0.35 }), p.x, POD + (key === 'player' ? 0.95 : 0.27), lz, g);
    m.userData.dynamic = true;
    return m;
  };
  W.anim.mo = moFor(MO_PLAYER, 0.48, 'player');
  W.anim.monkMo = moFor(MO_MONK, 0.25, 'monk');
  W.anim.mo.scale.set(1.1, 0.8, 0.9);
  W.anim.monkMo.scale.set(1.1, 0.8, 0.9);

  // ánh đèn ấm trong điện
  W.light(g, 0, POD + 6, -2, 0xffb060, 30, 1.4, 40, 18);
  return g;
}
