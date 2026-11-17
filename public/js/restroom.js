import * as THREE from 'three';
import { UP, NAP_ROOM, NAP_MATS } from '/shared/layout.js';
import { mesh, box, cyl, textPlate, canvasTex, mat, rng } from './util.js';
import { M } from './materials.js';
import { blockBox, blockCircle } from './collision.js';

const flatRot = m => { m.rotation.x = -Math.PI / 2; return m; };

/* PHÒNG NGHỈ TRƯA của Phật tử: một gian của tả vu (hành lang bên trái khi từ cổng đi vào), xem NAP_ROOM / NAP_MATS trong shared/layout.js.
 * Tường ngoài, tường phía sân (có cửa), lối đi và va chạm đã dựng ở world.js. Ở đây dựng phần bên trong:
 * sàn, trần, hai vách ngăn đầu hồi, khung cửa và bảng hiệu, 20 chiếu cói nằm đất kèm gối, kệ dép, lu nước, đèn lồng.
 * Toạ độ trong hàm là toạ độ thế giới theo x, z; y tính từ mặt sàn gian (nền hành lang cao 0,6 m so với sân trên). */
export function buildRestRoom(parent, W) {
  const R = rng(4242);
  const { x1, x2, z1, z2, door } = NAP_ROOM;
  const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2, w = x2 - x1, d = z2 - z1;
  const g = new THREE.Group(); g.position.set(0, UP + 0.6, 0); parent.add(g);
  const wallX = x2 + 0.15;                                            // mặt phẳng tường phía sân (tâm tường dày 0,3)

  /* ---------- sàn, trần, vách ngăn ---------- */
  flatRot(mesh(new THREE.PlaneGeometry(w, d), M.BRICK, cx, 0.03, cz, g, false));
  const ceil = mesh(new THREE.PlaneGeometry(w, d), M.WOOD, cx, 3.7, cz, g, false); ceil.rotation.x = Math.PI / 2;
  for (let i = 0; i < 5; i++) box(w, 0.2, 0.22, M.RED2, cx, 3.58, z1 + 1.2 + i * (d - 2.4) / 4, g, false);          // xà ngang
  box(w, 4.5, 0.3, M.WALL, cx, 2.25, z1 - 0.15, g);                    // vách bắc, mặt trong ở z1
  box(w, 4.5, 0.3, M.WALL, cx, 2.25, z2 + 0.15, g);                    // vách nam, mặt trong ở z2

  /* ---------- cửa: hai trụ, xà ngang, mành tre cuốn, bảng hiệu ---------- */
  const dz = (door.z1 + door.z2) / 2;
  for (const z of [door.z1 + 0.1, door.z2 - 0.1]) box(0.26, 2.4, 0.26, M.RED2, wallX, 1.2, z, g);
  box(0.36, 0.26, door.z2 - door.z1 + 0.1, M.RED2, wallX, 2.27, dz, g);
  const blind = cyl(0.06, 0.06, door.z2 - door.z1 - 0.3, mat('blind', 0xb38a4c, { roughness: 0.7 }), wallX - 0.12, 2.05, dz, g, 8, false); blind.rotation.x = Math.PI / 2;
  textPlate('PHÒNG NGHỈ TRƯA', 3.6, 0.64, wallX + 0.17, 3.45, dz, g, Math.PI / 2, { size: 0.44 });
  textPlate('NGHỈ TRƯA · GIỮ YÊN LẶNG', 3.1, 0.5, cx, 2.5, z1 + 0.02, g, 0, { size: 0.4 });

  /* ---------- 20 chiếu cói nằm đất, mỗi chiếu một chiếc gối tròn ở đầu phía bắc ---------- */
  const weave = canvasTex(128, 256, (c, tw, th) => {
    c.fillStyle = '#d9c28c'; c.fillRect(0, 0, tw, th);
    for (let y = 0; y < th; y += 4) { c.fillStyle = y % 8 ? 'rgba(120,90,40,.16)' : 'rgba(255,240,200,.18)'; c.fillRect(0, y, tw, 2); }
    for (let x = 0; x < tw; x += 8) { c.fillStyle = 'rgba(110,80,35,.12)'; c.fillRect(x, 0, 2, th); }
    c.strokeStyle = '#7a3b1e'; c.lineWidth = 9; c.strokeRect(4, 4, tw - 8, th - 8);               // viền vải khâu quanh chiếu
    c.strokeStyle = 'rgba(255,225,160,.55)'; c.lineWidth = 2; c.strokeRect(11, 11, tw - 22, th - 22);
  });
  const tints = [0xffffff, 0xf3dcb4, 0xe8c9b0, 0xdfe6c4].map((c, i) => mat('napMat' + i, c, { map: weave, roughness: 0.95 }));
  const pillow = [0xf5efe0, 0xf4c9d2, 0xbfe0e6, 0xf3e3a6].map((c, i) => mat('napPillow' + i, c, { roughness: 0.8 }));
  const MATW = 0.8, MATL = 2.0;
  NAP_MATS.forEach((m, i) => {
    box(MATW, 0.03, MATL, tints[(i * 7 + (i >> 2)) % tints.length], m.x, 0.045, m.z, g, false);
    const p = cyl(0.085, 0.085, 0.46, pillow[(i * 5) % pillow.length], m.x, 0.15, m.z - MATL / 2 + 0.3, g, 10, false); p.rotation.z = Math.PI / 2;
    if (i % 3 === 0) box(0.5, 0.05, 0.36, mat('napCloth' + (i % 2), i % 2 ? 0x8aa6a0 : 0xc97a5a, { roughness: 0.9 }), m.x, 0.09, m.z + MATL / 2 - 0.4, g, false);   // khăn gấp ở chân chiếu
  });

  /* ---------- kệ dép và lu nước ở chỗ cửa vào ---------- */
  const rx = x1 + 0.22, rz = -9.9;
  for (let k = 0; k < 3; k++) {
    box(0.4, 0.04, 1.0, M.WOOD, rx, 0.18 + k * 0.32, rz, g, false);
    for (let s = 0; s < 3; s++) for (const sz of [-0.07, 0.07]) {
      const col = [0x3a3a3a, 0xb04a3a, 0x3f6a8a, 0xcab27a, 0x4a7a4a][Math.floor(R() * 5)];
      box(0.1, 0.05, 0.22, mat('shoe' + col, col, { roughness: 0.9 }), rx + (R() - 0.5) * 0.08, 0.23 + k * 0.32, rz - 0.36 + s * 0.34 + sz, g, false);
    }
  }
  for (const sz of [-0.5, 0.5]) box(0.05, 0.95, 0.05, M.WOOD, rx, 0.48, rz + sz, g, false);
  blockBox(x1, x1 + 0.55, rz - 0.55, rz + 0.55);
  const jx = x1 + 0.45, jz = z2 - 0.5;
  box(0.7, 0.4, 0.7, M.STONE, jx, 0.2, jz, g);
  cyl(0.3, 0.26, 0.6, mat('napJar', 0x6e4528, { roughness: 0.55 }), jx, 0.7, jz, g, 14);
  cyl(0.33, 0.33, 0.05, M.DARK, jx, 1.02, jz, g, 14, false);
  blockCircle(jx, jz, 0.42);

  /* ---------- ánh đèn ấm ---------- */
  for (const z of [cz - 3.2, cz + 2.4]) {
    W.lanternAt(g, cx, 3.25, z, 0.55);
    cyl(0.012, 0.012, 0.45, mat('rope', 0xc9b48a), cx, 3.48, z, g, 4, false);
  }
  W.light(g, cx, 3.0, cz, 0xffd9a0, 14, 1.7, 5, 2.2);
}
