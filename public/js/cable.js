import * as THREE from 'three';
import { PLAZA, LOWER_PAD, stairDistance } from '/shared/stairs.js';
import { CABLE } from '/shared/summit.js';
import { mesh, box, cyl, sph, span, textPlate, mat, clamp, lerp } from './util.js';
import { M } from './materials.js';
import { roof, column } from './parts.js';
import { blockBox, blockCircle } from './collision.js';
import { terrainHeight } from './terrain.js';

/* =====================================================================
   CÁP TREO: một chiều từ ga Đỉnh Mây xuống ga chân núi (ngoài tường tây sân sau). Hai làn song song: làn xuống (tây) chở người chơi,
   làn lên (đông) có các cabin rỗng chạy vòng cho cảnh sống động. Cabin của người chơi chỉ tồn tại trong chuyến đi và chạy theo giờ server
   (xem 'ride' trong server/index.js và main.js), nên ai nhìn cũng thấy cùng một chuyến.
   ===================================================================== */
const N0 = 9;                                  // số cột trụ dự kiến là N0-1; cột nào không có chỗ trống (cách bậc thang đủ xa) thì bỏ, nhịp dây dài hơn
const LANE_DOWN = -2.4, LANE_UP = 2.4;         // độ lệch ngang (m, +: phía đông) của hai làn so với trục tim
const AMBIENT = 3;                             // số cabin rỗng chạy lên
const CLEAR = 10;                              // dây cao hơn mặt đất ít nhất bấy nhiêu mét
const TOWER_GAP = 8;                           // cột trụ cách mép bậc thang / sân nghỉ ít nhất bấy nhiêu mét

export function buildCable(scene, W) {
  const A = CABLE.top, B = CABLE.bottom;
  const dx = B.x - A.x, dz = B.z - A.z, Ld = Math.hypot(dx, dz), dirx = dx / Ld, dirz = dz / Ld;
  const ex = dirz, ez = -dirx;                                          // hướng ngang +: phía đông khi dây chạy về nam
  const heading = Math.atan2(dirx, dirz);
  const nx = [], nz = [], ny = [];
  /* Vị trí cột trụ: chia đều dọc đường cáp rồi dịch dọc theo dây đến chỗ gần nhất cách bậc thang / sân nghỉ / lan can và đèn đá
   * ít nhất TOWER_GAP mét (kiểm cả hai làn dây), để không cột nào đứng trên lối đi của Đường Mây. nf[i] là vị trí nút i (0..1) dọc đường cáp. */
  const clearAt = f => {
    const x = A.x + dx * f, z = A.z + dz * f;
    return Math.min(stairDistance(x, z).d, stairDistance(x + ex * LANE_UP, z + ez * LANE_UP).d, stairDistance(x - ex * LANE_UP, z - ez * LANE_UP).d);
  };
  const nf = [0];
  for (let i = 1; i < N0; i++) {
    const base = i / N0;
    for (let off = 0; off <= 0.06; off += 0.001) {
      const f = (off === 0 ? [base] : [base + off, base - off]).find(f => f > nf[nf.length - 1] + 0.04 && f < 0.95 && clearAt(f) >= TOWER_GAP);
      if (f !== undefined) { nf.push(f); break; }
    }
  }
  nf.push(1);
  const N = nf.length - 1;                                              // số đoạn dây thực tế
  for (let i = 0; i <= N; i++) { nx.push(A.x + dx * nf[i]); nz.push(A.z + dz * nf[i]); }
  const y0 = PLAZA.h + CABLE.cabinH + 0.3, yN = LOWER_PAD.h + CABLE.cabinH + 0.3;
  for (let i = 0; i <= N; i++) ny.push(i === 0 ? y0 : i === N ? yN : Math.max(lerp(y0, yN, nf[i]), terrainHeight(nx[i], nz[i]) + 18));
  // nâng cột nếu giữa hai cột dây sát mặt đất hơn CLEAR
  let minClear = Infinity;
  for (let pass = 0; pass < 4; pass++) {
    minClear = Infinity;
    for (let i = 0; i < N; i++) {
      for (let k = 0; k <= 12; k++) {
        if ((i === 0 && k === 0) || (i === N - 1 && k === 12)) continue;      // hai đầu là mặt sân ga, cabin ở sát nền là đúng
        const f = k / 12, y = lerp(ny[i], ny[i + 1], f), g = y - terrainHeight(lerp(nx[i], nx[i + 1], f), lerp(nz[i], nz[i + 1], f));
        minClear = Math.min(minClear, g);
        if (g < CLEAR && i > 0) ny[i] += (CLEAR - g) * 0.8;
        if (g < CLEAR && i + 1 < N) ny[i + 1] += (CLEAR - g) * 0.8;
      }
    }
  }
  const lat = (i, lane) => new THREE.Vector3(nx[i] + ex * lane, ny[i], nz[i] + ez * lane);

  /* ---------- dây cáp ---------- */
  const cableMat = mat('summitCable', 0x1d1d1d, { roughness: 0.5, metalness: 0.5 });
  const unit = new THREE.CylinderGeometry(0.055, 0.055, 1, 5);
  const rope = (a, b) => span(mesh(unit, cableMat, 0, 0, 0, scene, false), a, b);
  for (const lane of [LANE_DOWN, LANE_UP]) for (let i = 0; i < N; i++) rope(lat(i, lane), lat(i + 1, lane));

  /* ---------- cột trụ ---------- */
  const rod = new THREE.CylinderGeometry(0.1, 0.1, 1, 6);
  for (let i = 1; i < N; i++) {
    const tx = nx[i], tz = nz[i], base = terrainHeight(tx, tz) - 0.6, top = ny[i], H = top - base;
    const t = new THREE.Group(); t.position.set(tx, base, tz); t.rotation.y = heading; scene.add(t);
    const bw = 1.5, tw = 0.4, hTop = H - 0.9;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) span(mesh(rod, M.RED2, 0, 0, 0, t), new THREE.Vector3(sx * bw, 0, sz * bw), new THREE.Vector3(sx * tw, hTop, sz * tw));
    for (const f of [0.28, 0.55, 0.8]) {
      const w = lerp(bw, tw, f), y = hTop * f;
      box(2 * w, 0.12, 0.12, M.WHITE, 0, y, w, t, false); box(2 * w, 0.12, 0.12, M.WHITE, 0, y, -w, t, false);
      box(0.12, 0.12, 2 * w, M.WHITE, w, y, 0, t, false); box(0.12, 0.12, 2 * w, M.WHITE, -w, y, 0, t, false);
    }
    box(1.0, 0.7, 1.0, M.DARK, 0, hTop + 0.1, 0, t);
    box(6.6, 0.3, 0.55, M.RED, 0, H - 0.55, 0, t);                                 // xà ngang đỡ hai làn dây
    for (const lane of [LANE_DOWN, LANE_UP]) {
      const wh = cyl(0.32, 0.32, 0.3, M.DARK, lane, H - 0.32, 0, t, 14, false); wh.rotation.z = Math.PI / 2;
    }
  }

  /* ---------- hai ga ---------- */
  /* wz: toạ độ z cục bộ của bánh đà đón dây (đầu ga phía ngoài đường cáp); node: chỉ số nút dây nối vào ga. */
  const station = (cx, cz, h, label, sub, wz, node, northWall) => {
    const s = new THREE.Group(); s.position.set(cx, h, cz); scene.add(s); s.updateWorldMatrix(true, false);
    const cy = node === 0 ? y0 : yN;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { column(s, sx * 4.0, 0, sz * 3.2, 5.8, 0.3); blockCircle(cx + sx * 4.0, cz + sz * 3.2, 0.5); }
    box(8.8, 0.35, 0.5, M.RED, 0, 5.7, -3.2, s); box(8.8, 0.35, 0.5, M.RED, 0, 5.7, 3.2, s);
    box(0.5, 0.4, 6.4, M.RED, 4.0, 5.6, 0, s);                                      // xà phía đông đỡ bảng hiệu
    roof(s, { w: 10.4, d: 8.8, h: 1.6, y: 6.0, s: 0.6, ridge: 5.6 });
    box(8.4, 0.18, 6.6, M.WOOD, 0, 0.09, 0, s, false);                              // sàn gỗ
    if (northWall) { box(8.2, 5.0, 0.3, M.WALL, 0, 2.5, northWall, s); blockBox(cx - 4.1, cx + 4.1, cz + northWall - 0.3, cz + northWall + 0.3); }
    for (const lane of [LANE_DOWN, LANE_UP]) {                                      // bánh đà đón dây
      const wy = cy - h - 1.3;
      const bw = cyl(1.3, 1.3, 0.3, M.DARK, lane, wy, wz, s, 24); bw.rotation.z = Math.PI / 2;
      const rim = cyl(1.36, 1.36, 0.08, M.GOLD, lane, wy, wz, s, 24, false); rim.rotation.z = Math.PI / 2;
      rope(new THREE.Vector3(cx + lane, cy, cz + wz), lat(node, lane));            // đoạn dây từ bánh đà ra nút đầu
    }
    textPlate(label, 4.4, 0.72, 4.35, 5.05, 0, s, Math.PI / 2, { size: 0.42 });
    textPlate(sub, 4.4, 0.5, 4.35, 4.3, 0, s, Math.PI / 2, { size: 0.34 });
    W.lanternAt(s, -3.4, 4.6, 3.2, 0.8); W.lanternAt(s, 3.4, 4.6, 3.2, 0.8);
    return s;
  };
  const top = station(A.x, A.z, PLAZA.h, 'GA CÁP TREO ĐỈNH MÂY', 'Xuống chùa · một chiều', -3.8, 0, -4.4);
  box(2.6, 0.16, 5.4, M.PAVE, 4.4, 0.14, 0, top, false);                           // bậc lên xuống phía đông
  W.light(top, 0, 4.5, 0, 0xffc890, 14, 1.8, 6, 1.5);
  station(B.x, B.z, LOWER_PAD.h, 'GA CÁP TREO CHÂN NÚI', 'Về lại chùa · Nam mô A Di Đà Phật', 3.4, N, 0);

  /* ---------- cabin ---------- */
  const GLASS = new THREE.MeshStandardMaterial({ color: 0xcfe9f2, transparent: true, opacity: 0.2, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const makeCabin = () => {
    const c = new THREE.Group(); c.userData.dynamic = true;
    box(2.0, 0.14, 2.4, M.DARK, 0, 0.07, 0, c);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.09, 2.1, 0.09, M.RED, sx * 0.97, 1.19, sz * 1.17, c, false);
    for (const sx of [-1, 1]) { box(0.05, 0.55, 2.4, M.RED, sx * 0.99, 0.4, 0, c, false); box(0.04, 1.5, 2.25, GLASS, sx * 0.99, 1.4, 0, c, false); }
    for (const sz of [-1, 1]) { box(2.0, 0.55, 0.05, M.RED, 0, 0.4, sz * 1.19, c, false); box(1.9, 1.5, 0.04, GLASS, 0, 1.4, sz * 1.19, c, false); }
    box(2.3, 0.14, 2.7, M.RED2, 0, 2.28, 0, c);
    box(2.34, 0.06, 2.74, M.GOLD, 0, 2.2, 0, c, false);
    const hl = CABLE.cabinH - 2.35;
    cyl(0.07, 0.07, hl, M.DARK, 0, 2.35 + hl / 2, 0, c, 8, false);
    box(0.5, 0.3, 0.45, M.DARK, 0, CABLE.cabinH - 0.25, 0, c, false);
    const sh = cyl(0.3, 0.3, 0.14, M.DARK, 0, CABLE.cabinH, 0, c, 14, false); sh.rotation.z = Math.PI / 2;
    sph(0.1, M.LANTERN, 0, 2.1, 0, c, false, 8, 6);
    cyl(0.5, 0.55, 0.16, M.CUSHION, 0, 0.22, 0, c, 14, false);                      // bồ đoàn giữa cabin
    scene.add(c);
    return c;
  };
  /* Đặt obj (cabin hoặc người ngồi trong cabin) tại vị trí u (0..1) dọc làn lane; trả về cao độ sàn. */
  const place = (obj, u, lane, t = 0, sway = true) => {
    const uu = clamp(u, 0, 1);
    let i = 0; while (i < N - 1 && uu > nf[i + 1]) i++;
    const f = (uu - nf[i]) / (nf[i + 1] - nf[i]);
    const x = lerp(nx[i], nx[i + 1], f) + ex * lane, z = lerp(nz[i], nz[i + 1], f) + ez * lane;
    const y = lerp(ny[i], ny[i + 1], f) - CABLE.cabinH;
    obj.position.set(x, y, z); obj.rotation.y = heading;
    if (sway) obj.rotation.z = Math.sin(t * 1.3 + u * 40) * 0.025;
    return y;
  };

  /* các cabin rỗng chạy lên làn đông */
  const ambient = Array.from({ length: AMBIENT }, makeCabin);

  W.cable = {
    makeCabin, place, minClear, heading, laneDown: LANE_DOWN,
    nodes: () => nx.map((x, i) => [x, ny[i], nz[i]]),
    remove(c) { scene.remove(c); },
    update(st, t) {
      const T = CABLE.rideMs / 1000;
      ambient.forEach((c, k) => place(c, 1 - (((st / T + k / AMBIENT) % 1 + 1) % 1), LANE_UP, t));
    }
  };
  return W.cable;
}
