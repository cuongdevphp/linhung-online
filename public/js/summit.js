import * as THREE from 'three';
import { PLAZA, PLAZA_DISCS } from '/shared/stairs.js';
import { SU, SUMMIT_CUSHIONS, MEDITATION } from '/shared/summit.js';
import { CUSHION_H } from '/shared/layout.js';
import { mesh, box, cyl, sph, span, textPlate, canvasTex, softDot, mat, rng, smoothstep, lerp } from './util.js';
import { M } from './materials.js';
import { roof, column } from './parts.js';
import { blockBox, blockCircle } from './collision.js';
import { buildQuanAm, makeBuddha } from './statues.js';
import { buildTuVi } from './tuvi.js';

/* =====================================================================
   SÂN ĐỈNH ĐƯỜNG MÂY — sân tròn rộng 36 m trên đỉnh núi, phía sau 1.080 bậc.
   Hoạt động: dâng hương (Chùa Đồng), chiêm bái tượng Phật Bà Tây Bổ Đà Sơn và Phật Di Lặc, ngồi thiền (Thiền đài),
   xem tử vi (Tử Vi Đường), săn mây và đón bình minh / hoàng hôn (hai đài ở mép đông, tây), check-in
   (Cổng Trời, cột mốc 986 m, vườn hoa theo mùa) và đi cáp treo xuống chùa (ga ở góc tây nam, xem cable.js).
   Toạ độ trong file này là toạ độ cục bộ (u, v) của sân, trùng với shared/summit.js.
   ===================================================================== */
const BRONZE_ROOF = mat('summitBronzeRoof', 0x7b5a34, { metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide });
const BOWL = M.BRONZE.clone(); BOWL.side = THREE.DoubleSide;
const SACK = mat('summitSack', 0xb08a4e, { roughness: 0.95 });
const ROBE_Y = mat('summitRobe', 0xd98c1f, { metalness: 0.45, roughness: 0.45 });
const LINE = mat('faceLineGold', 0x2a1608, { roughness: 0.6 });
const FRAME = mat('summitFrame', 0x7a4a26, { roughness: 0.75 });
const WORLD = (u, v) => SU(u, v);
const faceCenter = (u, v) => Math.atan2(-u, -v);           // góc quay để mặt trước (+z cục bộ) hướng về tâm sân

/* Mùa hoa theo tháng của máy người chơi. */
const SEASONS = [
  { months: [2, 3, 4], name: 'XUÂN', label: 'HOA ĐÀO · HOA MAI', colors: [0xf4a6c0, 0xf9c9d8, 0xffd23f, 0xfff0b3] },
  { months: [5, 6, 7], name: 'HẠ', label: 'HOA PHƯỢNG · HƯỚNG DƯƠNG', colors: [0xe8382b, 0xff6a2b, 0xffcc1d, 0xf8f4e0] },
  { months: [8, 9, 10], name: 'THU', label: 'HOA CÚC', colors: [0xffc21a, 0xf6e27a, 0xfff7e0, 0xe98a1b] },
  { months: [11, 12, 1], name: 'ĐÔNG', label: 'HOA MAI TRẮNG · THỦY TIÊN', colors: [0xffffff, 0xf4f1e6, 0xffe9a8, 0xc8def5] }
];
export const currentSeason = (month = new Date().getMonth() + 1) => SEASONS.find(s => s.months.includes(month)) || SEASONS[0];

/* ---------- hoạ tiết ---------- */
const mandalaTex = () => canvasTex(1024, 1024, (g, w, h) => {
  const cx = w / 2, cy = h / 2;
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#dccba4'; g.beginPath(); g.arc(cx, cy, 506, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#8e1a10'; g.lineWidth = 16; g.beginPath(); g.arc(cx, cy, 494, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#d9a24a'; g.lineWidth = 8; g.beginPath(); g.arc(cx, cy, 468, 0, Math.PI * 2); g.stroke();
  const petal = (r0, r1, wid, fill, stroke) => {
    g.beginPath(); g.moveTo(0, -r0); g.quadraticCurveTo(wid, -(r0 + r1) / 2, 0, -r1); g.quadraticCurveTo(-wid, -(r0 + r1) / 2, 0, -r0); g.closePath();
    g.fillStyle = fill; g.fill(); g.strokeStyle = stroke; g.lineWidth = 5; g.stroke();
  };
  g.save(); g.translate(cx, cy);
  for (let k = 0; k < 16; k++) { g.save(); g.rotate((k + 0.5) / 16 * Math.PI * 2); petal(110, 430, 70, k % 2 ? '#f3e6c3' : '#e9d2a0', '#8e1a10'); g.restore(); }
  for (let k = 0; k < 8; k++) { g.save(); g.rotate(k / 8 * Math.PI * 2); petal(80, 340, 92, '#c9772b', '#6e140c'); g.restore(); }
  g.fillStyle = '#8e1a10'; g.beginPath(); g.arc(0, 0, 112, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#e8b65a'; g.lineWidth = 10;
  g.beginPath(); g.arc(0, 0, 96, 0, Math.PI * 2); g.stroke();
  for (let k = 0; k < 8; k++) { g.save(); g.rotate(k / 8 * Math.PI * 2); g.beginPath(); g.moveTo(0, -30); g.lineTo(0, -96); g.stroke(); g.restore(); }
  g.fillStyle = '#e8b65a'; g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.fill();
  g.restore();
}, [1, 1]);

const baguaTex = () => canvasTex(512, 512, (g, w, h) => {
  const cx = w / 2, cy = h / 2;
  g.fillStyle = '#6e140c'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#e8b65a'; g.lineWidth = 10; g.beginPath(); g.arc(cx, cy, 240, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, 126, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#f4ead0'; g.beginPath(); g.arc(cx, cy, 78, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(cx, cy, 78, -Math.PI / 2, Math.PI / 2, true); g.fill();     // âm dương
  g.beginPath(); g.arc(cx, cy - 39, 39, 0, Math.PI * 2); g.fillStyle = '#1b1b1b'; g.fill();
  g.beginPath(); g.arc(cx, cy + 39, 39, 0, Math.PI * 2); g.fillStyle = '#f4ead0'; g.fill();
  g.beginPath(); g.arc(cx, cy - 39, 11, 0, Math.PI * 2); g.fillStyle = '#f4ead0'; g.fill();
  g.beginPath(); g.arc(cx, cy + 39, 11, 0, Math.PI * 2); g.fillStyle = '#1b1b1b'; g.fill();
  g.fillStyle = '#e8b65a';
  for (let k = 0; k < 8; k++) {                                        // tám quẻ: ba vạch liền hoặc đứt
    g.save(); g.translate(cx, cy); g.rotate(k / 8 * Math.PI * 2);
    for (let b = 0; b < 3; b++) {
      const y = -(150 + b * 28);
      if ((k >> b) & 1) g.fillRect(-30, y, 60, 14);
      else { g.fillRect(-30, y, 25, 14); g.fillRect(5, y, 25, 14); }
    }
    g.restore();
  }
});

/* ---------- lan can đá vòng cung ---------- */
function railArc(g, cx, cz, rad, a0, a1, keep) {
  const n = Math.max(2, Math.round(Math.abs(a1 - a0) * rad / 2.4));
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n, x = cx + Math.cos(a) * rad, z = cz + Math.sin(a) * rad, ok = keep(x, z, a);
    if (ok) { box(0.3, 1.0, 0.3, M.WHITE, x, 0.55, z, g); sph(0.19, M.WHITE, x, 1.15, z, g, false, 8, 6); }
    if (prev && ok && prev.ok) {
      const dx = x - prev.x, dz = z - prev.z, len = Math.hypot(dx, dz), mx = (x + prev.x) / 2, mz = (z + prev.z) / 2, ry = Math.atan2(dx, dz);
      box(0.2, 0.14, len, M.WHITE, mx, 0.98, mz, g).rotation.y = ry;
      box(0.14, 0.1, len, M.WHITE, mx, 0.4, mz, g).rotation.y = ry;
    }
    prev = { x, z, ok };
  }
}

/* ---------- tượng Phật Di Lặc (tạo hình từ khối cơ bản, bụng to, miệng cười) ---------- */
function makeMaitreya() {
  const b = new THREE.Group();
  const SK = M.BGOLD;
  const add = (geo, m, x, y, z, sx = 1, sy = 1, sz = 1, shadow = true) => { const o = mesh(geo, m, x, y, z, b, shadow); o.scale.set(sx, sy, sz); return o; };
  const S = new THREE.SphereGeometry(1, 28, 20);
  // bệ đá và đài sen
  cyl(2.7, 3.0, 0.9, M.STONE, 0, 0.45, 0, b, 40);
  cyl(2.3, 2.6, 0.35, M.WHITE, 0, 1.05, 0, b, 40);
  const petal = new THREE.SphereGeometry(0.5, 10, 8);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, p = mesh(petal, M.GOLD, Math.cos(a) * 2.2, 1.35, Math.sin(a) * 2.2, b, false);
    p.scale.set(0.42, 0.3, 0.8); p.rotation.y = -a; p.rotation.z = 0.5;
  }
  const y0 = 1.2;
  add(S, ROBE_Y, 0, y0 + 0.65, 0.15, 1.75, 0.7, 1.35);                       // vạt áo chùm lên đầu gối
  add(S, SK, 0, y0 + 1.7, 0.2, 1.45, 1.2, 1.28);                             // cái bụng tròn trĩnh
  add(S, ROBE_Y, 0, y0 + 2.4, -0.15, 1.25, 0.7, 1.0);                        // vạt áo choàng sau lưng
  add(S, SK, 0, y0 + 3.1, 0.02, 1.15, 0.85, 0.95);                           // ngực và vai
  add(new THREE.CylinderGeometry(0.35, 0.45, 0.4, 14), SK, 0, y0 + 3.8, 0.05);   // cổ
  // đầu: tròn đầy, trọc, má phính
  add(S, SK, 0, y0 + 4.5, 0.1, 0.82, 0.76, 0.8);
  for (const sx of [-1, 1]) {
    add(S, SK, sx * 0.5, y0 + 4.3, 0.55, 0.26, 0.24, 0.2);                   // má
    add(S, SK, sx * 0.86, y0 + 4.15, 0.05, 0.14, 0.55, 0.12);                // tai và dái tai dài
    mesh(new THREE.TorusGeometry(0.15, 0.03, 6, 14, Math.PI), LINE, sx * 0.3, y0 + 4.66, 0.82, b, false);   // mắt cười cong lên
  }
  add(S, SK, 0, y0 + 4.48, 0.88, 0.11, 0.09, 0.09);                          // mũi
  const smile = mesh(new THREE.TorusGeometry(0.3, 0.045, 6, 20, Math.PI), LINE, 0, y0 + 4.4, 0.82, b, false); smile.rotation.z = Math.PI;
  add(S, M.PEARL, 0, y0 + 4.82, 0.8, 0.05, 0.05, 0.04, false);               // bạch hào
  // tay trái đặt lên bao vải, tay phải cầm chuỗi hạt
  const limb = (a, c, r0, r1, m = SK) => { const l = mesh(new THREE.CylinderGeometry(r1, r0, 1, 12), m, 0, 0, 0, b); span(l, new THREE.Vector3(...a), new THREE.Vector3(...c)); };
  limb([-1.05, y0 + 3.2, 0.1], [-1.95, y0 + 2.2, 0.55], 0.36, 0.3);
  limb([-1.95, y0 + 2.2, 0.55], [-1.75, y0 + 1.5, 1.35], 0.32, 0.24);
  add(S, SK, -1.75, y0 + 1.42, 1.45, 0.3, 0.2, 0.3);
  limb([1.05, y0 + 3.2, 0.1], [1.95, y0 + 2.4, 0.5], 0.36, 0.3);
  limb([1.95, y0 + 2.4, 0.5], [1.55, y0 + 1.85, 1.35], 0.32, 0.24);
  add(S, SK, 1.55, y0 + 1.8, 1.45, 0.3, 0.2, 0.3);
  const beads = mesh(new THREE.TorusGeometry(0.55, 0.06, 6, 20), M.JADE, 1.55, y0 + 1.2, 1.45, b, false); beads.rotation.y = Math.PI / 2;
  add(S, SACK, -2.35, y0 + 0.95, 1.1, 0.95, 0.8, 0.85);                      // bao vải
  add(new THREE.CylinderGeometry(0.16, 0.22, 0.4, 10), SACK, -2.35, y0 + 1.7, 1.1);
  return b;
}

/* ---------- bồn hoa theo mùa ---------- */
function flowerBed(g, cx, cz, r, colors, rand) {
  cyl(r + 0.28, r + 0.34, 0.5, M.STONE, cx, 0.25, cz, g, 28);
  cyl(r, r, 0.08, mat('summitSoil', 0x4a3524), cx, 0.52, cz, g, 28, false);
  const leaf = mat('summitLeaf', 0x3f7a3a, { roughness: 0.9 });
  const fg = new THREE.SphereGeometry(0.17, 8, 6);
  const n = Math.round(r * r * 7);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * (r - 0.2);
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, y = 0.62 + 0.35 * (1 - (d / r) ** 2) + rand() * 0.12;
    mesh(new THREE.CylinderGeometry(0.015, 0.015, y - 0.5, 4), leaf, x, 0.5 + (y - 0.5) / 2, z, g, false);
    const c = colors[Math.floor(rand() * colors.length)];
    mesh(fg, mat('summitFlower' + c, c, { roughness: 0.6, emissive: c, emissiveIntensity: 0.08 }), x, y, z, g, false);
  }
  const lf = new THREE.SphereGeometry(r * 0.9, 12, 8);
  mesh(lf, leaf, cx, 0.52, cz, g, false).scale.set(1, 0.4, 1);
}

/* =====================================================================
   buildSummit(scene, W): dựng toàn bộ sân đỉnh; lưu hàm cập nhật động ở W.anim.summit.
   ===================================================================== */
export function buildSummit(scene, W) {
  const g = new THREE.Group(); g.position.set(PLAZA.x, PLAZA.h, PLAZA.z); scene.add(g);
  g.updateMatrixWorld(true);
  const R = rng(986);
  const bc = (u, v, r) => { const [x, z] = WORLD(u, v); blockCircle(x, z, r); };
  const bb = (u1, u2, v1, v2) => { const [x1, z1] = WORLD(u1, v1), [x2, z2] = WORLD(u2, v2); blockBox(Math.min(x1, x2), Math.max(x1, x2), Math.min(z1, z2), Math.max(z1, z2)); };

  /* ---------- nền sân, hai đài, hoa văn trung tâm ---------- */
  cyl(PLAZA.r + 0.4, PLAZA.r + 0.9, 4, M.STONE, 0, -2, 0, g, 96);
  cyl(PLAZA.r - 0.2, PLAZA.r - 0.2, 0.1, M.PAVE, 0, 0, 0, g, 96, false);
  for (const D of PLAZA_DISCS.slice(1)) {
    const u = D.x - PLAZA.x, v = D.z - PLAZA.z;
    cyl(D.r + 0.4, D.r + 0.8, 4, M.STONE, u, -2, v, g, 40);
    cyl(D.r - 0.1, D.r - 0.1, 0.09, M.WOOD, u, 0.045, v, g, 40, false);                      // sàn gỗ của đài
  }
  const mandalaMat = new THREE.MeshStandardMaterial({ map: mandalaTex(), roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mandala = new THREE.Mesh(new THREE.CircleGeometry(9, 72), mandalaMat);
  mandala.rotation.x = -Math.PI / 2; mandala.position.set(0, 0.07, 2); mandala.receiveShadow = true; g.add(mandala);

  /* lan can vòng quanh sân, chừa lối vào phía nam, hai đài, và chỗ cabin cáp treo ra khỏi sân */
  const WEST = PLAZA_DISCS[2], wu = WEST.x - PLAZA.x, wv = WEST.z - PLAZA.z, wAng = Math.atan2(wv, wu);   // đài hoàng hôn ở tây bắc
  const GAPS = [[Math.PI / 2, 0.33], [0, 0.2], [wAng, 0.22], [Math.atan2(28.5, -22), 0.2]];
  const inGap = a => { a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); return GAPS.some(([c, w]) => { const d = Math.abs(((a - c + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI); return d < w; }); };
  railArc(g, 0, 0, PLAZA.r - 0.4, 0, Math.PI * 2, (x, z, a) => !inGap(a));
  railArc(g, 34, 0, 6.8, -Math.PI / 2, Math.PI / 2, (x, z) => Math.hypot(x, z) > 36.6);
  railArc(g, wu, wv, 6.8, wAng - Math.PI / 2, wAng + Math.PI / 2, (x, z) => Math.hypot(x, z) > 36.6);

  /* ---------- đèn đá dọc lối giữa ---------- */
  for (const v of [14, 4, -6]) for (const su of [-1, 1]) {
    const u = su * 5.6;
    box(0.8, 0.4, 0.8, M.WHITE, u, 0.2, v, g);
    cyl(0.14, 0.18, 2.4, M.STONE, u, 1.5, v, g, 8);
    sph(0.34, M.LANTERN, u, 2.95, v, g, false, 12, 10).scale.y = 1.25;
    mesh(new THREE.ConeGeometry(0.46, 0.42, 8), M.RIDGE, u, 3.5, v, g, false);
    bc(u, v, 0.5);
  }

  /* ---------- Cổng Trời (check-in) ---------- */
  {
    const gz = 25.5;
    for (const su of [-1, 1]) { box(1.5, 0.5, 1.5, M.STONE, su * 4.6, 0.25, gz, g); column(g, su * 4.6, 0.5, gz, 6.6, 0.48); bc(su * 4.6, gz, 0.8); }
    box(11.4, 0.9, 1.2, M.RED, 0, 7.5, gz, g);
    box(11.6, 0.12, 1.3, M.GOLD, 0, 7.02, gz, g, false);
    roof(g, { w: 12.6, d: 4.4, h: 1.7, y: 8.0, s: 0.6, ridge: 8.2, x: 0, z: gz });
    textPlate('CỔNG TRỜI', 5.4, 0.8, 0, 7.5, gz + 0.62, g, 0, { size: 0.5 });
    textPlate('CỔNG TRỜI', 5.4, 0.8, 0, 7.5, gz - 0.62, g, Math.PI, { size: 0.5 });
    for (const su of [-1, 1]) {
      const cloud = sph(1.0, M.WHITE, su * 4.6, 0.7, gz + 1.5, g, false, 10, 8); cloud.scale.set(1.6, 0.6, 1.2);       // vài bụm mây đá chân cột
    }
    W.lanternAt(g, -2.6, 6.8, gz + 0.9, 1); W.lanternAt(g, 2.6, 6.8, gz + 0.9, 1);
  }

  /* ---------- cột mốc cao độ (check-in) ---------- */
  {
    const m = new THREE.Group(); m.position.set(9.5, 0, 19); m.rotation.y = faceCenter(9.5, -12.6); g.add(m);
    box(1.9, 0.45, 1.9, M.STONE, 0, 0.22, 0, m);
    box(1.2, 3.4, 1.2, M.STONE, 0, 2.1, 0, m);
    mesh(new THREE.ConeGeometry(0.95, 0.9, 4), M.GOLD, 0, 4.25, 0, m, false).rotation.y = Math.PI / 4;
    textPlate('986 m', 1.0, 0.7, 0, 2.7, 0.62, m, 0, { size: 0.62 });
    textPlate('ĐỈNH ĐƯỜNG MÂY', 1.0, 0.38, 0, 1.9, 0.62, m, 0, { size: 0.5 });
    textPlate('1.080 BẬC', 1.0, 0.38, 0, 1.4, 0.62, m, 0, { size: 0.5 });
    bc(9.5, 19, 1.1);
  }

  /* ---------- vườn hoa theo mùa (check-in) ---------- */
  const season = currentSeason();
  {
    const cu = 22, cv = 17.5;
    flowerBed(g, cu, cv, 2.4, season.colors, R);
    for (const a of [0.4, 1.95, 3.5, 5.05]) flowerBed(g, cu + Math.cos(a) * 5.2, cv + Math.sin(a) * 5.2, 1.7, season.colors, R);
    bc(cu, cv, 2.7); for (const a of [0.4, 1.95, 3.5, 5.05]) bc(cu + Math.cos(a) * 5.2, cv + Math.sin(a) * 5.2, 2.0);
    const s = new THREE.Group(); s.position.set(13.6, 0, cv); s.rotation.y = -Math.PI / 2; g.add(s);
    box(0.16, 1.5, 0.16, M.WOOD, -1.0, 0.75, 0, s); box(0.16, 1.5, 0.16, M.WOOD, 1.0, 0.75, 0, s);
    textPlate(`VƯỜN HOA MÙA ${season.name}`, 2.6, 0.5, 0, 1.55, 0.02, s, 0, { size: 0.5 });
    textPlate(season.label, 2.6, 0.4, 0, 1.08, 0.02, s, 0, { size: 0.5 });
  }

  /* ---------- Chùa Đồng ---------- */
  {
    const cd = new THREE.Group(); cd.position.set(0, 0, -23); g.add(cd); cd.updateWorldMatrix(true, false);
    const by = 0.7;
    box(11.8, by, 9.8, M.STONE, 0, by / 2, 0, cd);
    box(5.6, 0.3, 1.0, M.STONE, 0, 0.15, 5.4, cd); box(5.0, 0.5, 0.8, M.STONE, 0, 0.25, 4.95, cd);
    const bzCol = (x, z, h) => { cyl(0.52, 0.56, 0.35, M.DARK, x, by + 0.17, z, cd, 14); cyl(0.36, 0.4, h, M.BRONZE, x, by + 0.35 + h / 2, z, cd, 16); cyl(0.44, 0.44, 0.16, M.GOLD, x, by + h, z, cd, 16, false); };
    for (const x of [-4.4, -1.5, 1.5, 4.4]) { bzCol(x, 3.7, 3.7); bzCol(x, -3.7, 3.7); }
    box(9.8, 3.8, 0.4, M.BRONZE, 0, by + 1.9, -3.95, cd);                                    // tường sau
    for (const sx of [-1, 1]) {
      box(0.4, 3.8, 7.6, M.BRONZE, sx * 4.85, by + 1.9, 0, cd);                              // tường hông
      box(0.1, 2.2, 5.4, M.LATTICE, sx * 5.08, by + 2.0, 0, cd);
    }
    box(10.2, 0.6, 0.5, M.RED2, 0, by + 3.95, 3.9, cd);                                      // xà ngang cửa
    box(10.0, 0.1, 0.1, M.GOLD, 0, by + 1.2, -3.72, cd, false); box(10.0, 0.1, 0.1, M.GOLD, 0, by + 3.2, -3.72, cd, false);
    textPlate('CHÙA ĐỒNG', 4.4, 0.8, 0, by + 3.3, 3.95, cd, 0, { size: 0.5 });
    roof(cd, { w: 13.0, d: 11.0, h: 1.5, y: by + 3.9, s: 0.85, ridge: 6, tile: BRONZE_ROOF });
    box(8.2, 2.0, 6.2, M.BRONZE, 0, by + 5.55, 0, cd);                                       // tầng trên
    box(8.4, 0.12, 6.4, M.GOLD, 0, by + 6.4, 0, cd, false);
    for (const sz of [-1, 1]) box(4.4, 1.0, 0.1, M.LATTICE, 0, by + 5.55, sz * 3.12, cd);
    roof(cd, { w: 10.6, d: 8.6, h: 2.3, y: by + 6.5, s: 0.8, ridge: 4.2, dragons: true, tile: BRONZE_ROOF });
    // bàn thờ, tượng Phật và đồ cúng bên trong
    box(4.6, 0.95, 1.3, M.RED2, 0, by + 0.5, -2.7, cd); box(4.8, 0.1, 1.5, M.GOLD, 0, by + 1.0, -2.7, cd, false);
    const bud = makeBuddha('sakya', M.HALO); bud.scale.setScalar(0.62); bud.position.set(0, by + 1.05, -2.95); cd.add(bud);
    for (const sx of [-1, 1]) {
      cyl(0.07, 0.07, 0.5, M.CANDLE, sx * 1.7, by + 1.28, -2.4, cd, 8, false);
      sph(0.22, M.PEARL, sx * 1.1, by + 1.18, -2.3, cd, false, 10, 8);
    }
    W.lanternAt(cd, -3, by + 3.4, 4.3, 0.8); W.lanternAt(cd, 3, by + 3.4, 4.3, 0.8);
    W.light(cd, 0, by + 3, 1, 0xffa860, 16, 1.6, 8, 1.5);
    bb(-5.9, 5.9, -27.9, -18.1);

    /* lư hương đồng trước chùa */
    const bz = new THREE.Group(); bz.position.set(0, 0, 9); cd.add(bz);
    cyl(1.6, 1.8, 0.35, M.STONE, 0, 0.17, 0, bz, 20);
    cyl(1.1, 0.75, 0.9, M.BRONZE, 0, 0.95, 0, bz, 22);
    mesh(new THREE.TorusGeometry(1.1, 0.08, 8, 26), M.GOLD, 0, 1.42, 0, bz, false).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; cyl(0.09, 0.12, 0.7, M.BRONZE, Math.cos(a) * 0.6, 0.55, Math.sin(a) * 0.6, bz, 8); }
    for (const sx of [-1, 1]) { const h = mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 14), M.GOLD, sx * 1.15, 1.2, 0, bz, false); h.rotation.y = Math.PI / 2; }
    const stick = mat('summitStick', 0x8a2b1a);
    for (let i = 0; i < 14; i++) {
      const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 0.7, s = cyl(0.014, 0.014, 0.85, stick, Math.cos(a) * d, 1.8, Math.sin(a) * d, bz, 4, false);
      s.rotation.set((R() - 0.5) * 0.3, 0, (R() - 0.5) * 0.3);
      sph(0.03, M.PEARL, Math.cos(a) * d, 2.25, Math.sin(a) * d, bz, false, 6, 4);
    }
    bc(0, -14, 1.9);
  }

  /* ---------- tượng Phật Bà Tây Bổ Đà Sơn ---------- */
  {
    const [u, v] = [-19, -21];
    const qa = buildQuanAm(); qa.root.scale.setScalar(0.2); qa.root.position.set(u, 0, v); qa.root.rotation.y = 0.45; g.add(qa.root);
    const st = new THREE.Group(); st.position.set(u + 2.0, 0, v + 6.2); st.rotation.y = 0.25; g.add(st);
    box(3.4, 0.9, 0.5, M.STONE, 0, 0.45, 0, st); textPlate('PHẬT BÀ TÂY BỔ ĐÀ SƠN', 3.1, 0.62, 0, 0.5, 0.27, st, 0, { size: 0.42 });
    bc(u, v, 4.5);
    W.light(g, u + 5, 5, v + 8, 0xfff0d8, 36, 1.4, 24);
  }

  /* ---------- tượng Phật Di Lặc ---------- */
  {
    const [u, v] = [19, -21];
    const mt = makeMaitreya(); mt.scale.setScalar(1.35); mt.position.set(u, 0, v); mt.rotation.y = -0.45; g.add(mt);
    const st = new THREE.Group(); st.position.set(u - 1.4, 0, v + 5.6); st.rotation.y = -0.25; g.add(st);
    box(2.6, 0.9, 0.5, M.STONE, 0, 0.45, 0, st); textPlate('PHẬT DI LẶC', 2.3, 0.62, 0, 0.5, 0.27, st, 0, { size: 0.5 });
    bc(u, v, 3.6);
  }

  /* ---------- Thiền đài ---------- */
  {
    const { u, v } = MEDITATION;
    cyl(7.2, 7.2, 0.06, M.DARK, u, 0.06, v, g, 48, false);
    cyl(6.5, 6.5, 0.06, M.PAVE, u, 0.07, v, g, 48, false);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.0, 48), new THREE.MeshStandardMaterial({ color: 0x8e1a10, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(u, 0.115, v); g.add(ring);
    for (const c of SUMMIT_CUSHIONS) cyl(0.55, 0.6, CUSHION_H, M.CUSHION, c.x - PLAZA.x, CUSHION_H / 2, c.z - PLAZA.z, g, 18, false);
    // bát đồng (khánh) trên bệ sen giữa đài
    cyl(0.55, 0.8, 0.7, M.STONE, u, 0.4, v, g, 16);
    const bowl = new THREE.LatheGeometry([[0.01, 0], [0.3, 0.02], [0.6, 0.2], [0.82, 0.55], [0.78, 0.58], [0.58, 0.3], [0.01, 0.18]].map(p => new THREE.Vector2(...p)), 24);
    mesh(bowl, BOWL, u, 0.75, v, g);
    bc(u, v, 0.9);
    const s = new THREE.Group(); s.position.set(u - 8.6, 0, v); s.rotation.y = -Math.PI / 2; g.add(s);
    box(0.16, 1.5, 0.16, M.WOOD, -1.0, 0.75, 0, s); box(0.16, 1.5, 0.16, M.WOOD, 1.0, 0.75, 0, s);
    textPlate('THIỀN ĐÀI', 2.4, 0.5, 0, 1.55, 0.02, s, 0, { size: 0.5 });
    textPlate('Ngồi xuống, nghe gió từ biển mây', 2.4, 0.4, 0, 1.08, 0.02, s, 0, { size: 0.3 });
    W.light(g, u, 3.2, v, 0xffb070, 12, 1.8, 5);
    for (const a of [0.3, 2.4, 4.0]) { const x = u + Math.cos(a) * 8.2, z = v + Math.sin(a) * 8.2; cyl(0.14, 0.18, 2.1, M.STONE, x, 1.1, z, g, 8); sph(0.32, M.LANTERN, x, 2.5, z, g, false, 12, 10).scale.y = 1.25; bc(x, z, 0.4); }
  }

  /* ---------- Đài đón bình minh (đông) và Đài ngắm hoàng hôn (tây) ---------- */
  {
    const e = new THREE.Group(); e.position.set(36.6, 0, 0); g.add(e); e.updateWorldMatrix(true, false);      // đình săn mây trên đài đông
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { column(e, sx * 2.0, 0.09, sz * 2.0, 3.2, 0.2); bc(36.6 + sx * 2.0, sz * 2.0, 0.35); }
    roof(e, { w: 6.0, d: 6.0, h: 1.7, y: 3.35, s: 0.55 });
    box(0.3, 0.45, 4.4, M.RED, -2.0, 3.05, 0, e);
    textPlate('ĐÀI ĐÓN BÌNH MINH', 2.6, 0.5, -2.2, 2.55, 0, e, -Math.PI / 2, { size: 0.42 });
    for (const sz of [-1, 1]) box(1.8, 0.45, 0.7, M.STONE, -4.4, 0.3, sz * 3.2, e);                          // ghế đá nhìn ra biển
    W.lanternAt(e, -2.0, 3.0, -2.0, 0.7); W.lanternAt(e, -2.0, 3.0, 2.0, 0.7);
    const fu = wu + Math.cos(wAng) * 5.2, fv = wv + Math.sin(wAng) * 5.2;                       // khung ở mép ngoài đài tây bắc, mặt hướng vào sân
    const w = new THREE.Group(); w.position.set(fu, 0, fv); w.rotation.y = Math.atan2(Math.sin(wAng), -Math.cos(wAng)); g.add(w);               // khung ảnh gỗ trên đài hoàng hôn
    for (const sz of [-1, 1]) { box(0.35, 3.6, 0.35, FRAME, 0, 1.8, sz * 2.5, w); bc(fu + sz * 2.5 * Math.sin(w.rotation.y), fv + sz * 2.5 * Math.cos(w.rotation.y), 0.4); }
    box(0.4, 0.4, 5.6, FRAME, 0, 3.7, 0, w);
    box(0.3, 0.3, 5.2, FRAME, 0, 0.35, 0, w);
    textPlate('HOÀNG HÔN', 2.2, 0.5, 0.22, 3.7, 0, w, Math.PI / 2, { size: 0.5 });
    for (const sz of [-1, 1]) box(0.7, 0.45, 1.8, M.STONE, 3.4, 0.3, sz * 3.2, w);                           // ghế đá nhìn ra phía tây
  }

  /* ---------- tầng ánh sáng và vật động ---------- */
  const dyn = new THREE.Group(); dyn.userData.dynamic = true; scene.add(dyn);
  const tuvi = buildTuVi(g, W, { bc, bb, dyn });                              // Tử Vi Đường: sảnh, sân Bát Quái, cây ước nguyện, ống xăm, đồng xu
  W.anim.oracle = kind => tuvi.oracle(kind);

  const smokeTex = softDot('rgba(235,235,235,0.6)', 64);
  const smokes = Array.from({ length: 6 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.userData.ph = i / 6; dyn.add(s); return s;
  });
  const [bxw, bzw] = WORLD(0, -14);

  // mây thấu kính: dải mây hình thấu kính lơ lửng quanh đỉnh vào lúc bình minh và hoàng hôn
  const lensTex = canvasTex(256, 96, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    [[0.5, 0.62, 0.48, 0.2], [0.5, 0.45, 0.36, 0.17], [0.5, 0.3, 0.24, 0.13]].forEach(([cx, cy, rx, ry], i) => {
      c.save(); c.translate(cx * w, cy * h); c.scale(rx * w, ry * h);
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, `rgba(255,255,255,${0.95 - i * 0.12})`); gr.addColorStop(0.65, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.fill(); c.restore();
    });
  }, [1, 1]);
  const lenses = Array.from({ length: 7 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: lensTex, transparent: true, depthWrite: false, opacity: 0, fog: false }));
    const a = -0.9 + i * 0.42 + R() * 0.2, d = 150 + R() * 120;
    s.userData = { x0: PLAZA.x + Math.cos(a) * d, z0: PLAZA.z + Math.sin(a) * d * 0.9, y0: PLAZA.h + 16 + R() * 40, ph: R() * 6.28 };
    s.scale.set(70 + R() * 60, 24 + R() * 10, 1); dyn.add(s); return s;
  });

  const col = new THREE.Color(), WHITE = new THREE.Color(0xffffff);
  W.anim.summit = {
    season,
    update(camera, env, t, dt) {
      tuvi.update(t, dt, env);
      const near = Math.hypot(camera.position.x - PLAZA.x, camera.position.z - PLAZA.z) < 80 && camera.position.y > PLAZA.h - 30;
      dyn.visible = true;
      // khói hương
      for (const s of smokes) {
        const k = (t * 0.12 + s.userData.ph) % 1;
        s.position.set(bxw + Math.sin(t * 0.7 + s.userData.ph * 9) * 0.35 * k + env.wind * k * 1.5, PLAZA.h + 2.4 + k * 4.2, bzw);
        s.scale.setScalar(0.6 + k * 2.2);
        s.material.opacity = near ? Math.sin(k * Math.PI) * 0.26 * (1 - env.rain * 0.6) : 0;
      }
      // mây thấu kính: hiện khi mặt trời thấp (bình minh / hoàng hôn), ẩn khi mưa, giông, ban đêm sâu
      const dusk = 1 - smoothstep(0.12, 0.34, env.el);
      const vis = dusk * (1 - env.rain) * (1 - env.storm) * (1 - env.mist * 0.6) * (1 - Math.max(0, env.night - 0.4) * 1.6);
      col.copy(env.sun).lerp(WHITE, 0.35);
      for (const s of lenses) {
        const u = s.userData;
        s.position.set(u.x0 + Math.sin(t * 0.02 + u.ph) * 14, u.y0 + Math.sin(t * 0.05 + u.ph) * 1.5, u.z0);
        s.material.opacity = Math.max(0, vis) * 0.85;
        s.material.color.copy(col);
      }
    }
  };
  void lerp;
  return g;
}
