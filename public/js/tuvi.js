import * as THREE from 'three';
import { PLAZA } from '/shared/stairs.js';
import { SU } from '/shared/summit.js';
import { ZODIAC } from '/shared/oracle.js';
import { mesh, box, cyl, sph, textPlate, canvasTex, mat, rng, SERIF } from './util.js';
import { M } from './materials.js';
import { roof, column, dragonColumn } from './parts.js';
import { blockBox, blockCircle } from './collision.js';

/* =====================================================================
   TỬ VI ĐƯỜNG — khu xin xăm, gieo quẻ, xem tử vi và xem tuổi hợp ở phía tây sân đỉnh.
     - Đại sảnh hai tầng mái, quay mặt về đông: cột rồng vàng, hoành phi, câu đối, bàn xem quẻ có ống xăm, đĩa đồng xu, bàn tính, giấy bút,
       sau lưng là đĩa Bát Quái và hai bánh xe mười hai con giáp.
     - Sân trước lát hoa văn Bát Quái - Âm Dương, quanh sân mười hai bia con giáp (Tý ở phía bắc), đỉnh đồng ở thềm.
     - Cây ước nguyện treo dải lụa đỏ ở góc tây bắc sân.
   Toạ độ cục bộ (u, v) của sân đỉnh (+u đông, +v nam), cùng hệ với shared/summit.js. Các chi tiết động (ống xăm lắc, đồng xu tung,
   dải lụa đung đưa) nằm trong nhóm dyn và được cập nhật ở update(); oracle(kind) được main.js gọi khi server báo có người xem quẻ.
   ===================================================================== */
export const TUVI = { hall: { u: -28.5, v: -2 }, court: { u: -14.5, v: -2, r: 5.6 }, tree: { u: -14.5, v: -11.5 } };

const SER = SERIF;
const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
const BAMBOO = mat('bamboo', 0xc9a85a, { roughness: 0.55 });
const FRAME_GOLD = M.GOLD;

/* Hoa văn sân: vòng mười hai con giáp, vòng Bát Quái, Âm Dương ở giữa. */
function courtyardTexture() {
  return canvasTex(1024, 1024, (g, w, h) => {
    const cx = w / 2, cy = h / 2;
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#d9c7a0'; g.beginPath(); g.arc(cx, cy, 508, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#8e1a10'; g.lineWidth = 18; g.beginPath(); g.arc(cx, cy, 496, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#d9a24a'; g.lineWidth = 7; g.beginPath(); g.arc(cx, cy, 462, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(cx, cy, 372, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(cx, cy, 215, 0, Math.PI * 2); g.stroke();
    g.save(); g.translate(cx, cy);
    // mười hai con giáp: Tý ở phía bắc (trên cùng), đi theo chiều kim đồng hồ
    g.textAlign = 'center'; g.textBaseline = 'middle';
    ZODIAC.forEach((z, k) => {
      g.save(); g.rotate(k / 12 * Math.PI * 2);
      g.font = `64px ${EMOJI}`; g.fillText(z.icon, 0, -420);
      g.restore();
    });
    // tám quẻ: mỗi quẻ ba vạch liền hoặc đứt, hướng ra ngoài
    for (let k = 0; k < 8; k++) {
      g.save(); g.rotate(k / 8 * Math.PI * 2 + Math.PI / 8);
      for (let b = 0; b < 3; b++) {
        const y = -(255 + b * 30);
        g.fillStyle = '#8e1a10';
        if ((k >> b) & 1) g.fillRect(-52, y, 104, 16);
        else { g.fillRect(-52, y, 44, 16); g.fillRect(8, y, 44, 16); }
      }
      g.restore();
    }
    // Âm Dương
    g.fillStyle = '#f6ecd2'; g.beginPath(); g.arc(0, 0, 190, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1d1d1d'; g.beginPath(); g.arc(0, 0, 190, Math.PI / 2, -Math.PI / 2); g.fill();
    g.fillStyle = '#f6ecd2'; g.beginPath(); g.arc(0, -95, 95, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1d1d1d'; g.beginPath(); g.arc(0, 95, 95, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.fillStyle = '#1d1d1d'; g.arc(0, -95, 28, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.fillStyle = '#f6ecd2'; g.arc(0, 95, 28, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#8e1a10'; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 190, 0, Math.PI * 2); g.stroke();
    g.restore();
  }, [1, 1]);
}

/* Đĩa Bát Quái sau lưng thầy: nền đỏ, vòng vàng, tám quẻ trắng vàng, Âm Dương. */
function baguaDisc() {
  return canvasTex(512, 512, (g, w, h) => {
    const cx = w / 2, cy = h / 2;
    g.fillStyle = '#5c0f08'; g.fillRect(0, 0, w, h);
    const rg = g.createRadialGradient(cx, cy, 20, cx, cy, 250); rg.addColorStop(0, '#9a2417'); rg.addColorStop(1, '#4e0b05');
    g.fillStyle = rg; g.beginPath(); g.arc(cx, cy, 250, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#e8b65a'; g.lineWidth = 12; g.beginPath(); g.arc(cx, cy, 244, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, 128, 0, Math.PI * 2); g.stroke();
    g.save(); g.translate(cx, cy);
    g.fillStyle = '#ffd77a';
    for (let k = 0; k < 8; k++) {
      g.save(); g.rotate(k / 8 * Math.PI * 2 + Math.PI / 8);
      for (let b = 0; b < 3; b++) {
        const y = -(160 + b * 26);
        if ((k >> b) & 1) g.fillRect(-34, y, 68, 13); else { g.fillRect(-34, y, 29, 13); g.fillRect(5, y, 29, 13); }
      }
      g.restore();
    }
    g.fillStyle = '#f6ecd2'; g.beginPath(); g.arc(0, 0, 80, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(0, 0, 80, Math.PI / 2, -Math.PI / 2); g.fill();
    g.fillStyle = '#f6ecd2'; g.beginPath(); g.arc(0, -40, 40, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(0, 40, 40, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.fillStyle = '#1b1b1b'; g.arc(0, -40, 11, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.fillStyle = '#f6ecd2'; g.arc(0, 40, 11, 0, Math.PI * 2); g.fill();
    g.restore();
  });
}

/* Bánh xe mười hai con giáp (treo hai bên đĩa Bát Quái). */
function zodiacWheel() {
  return canvasTex(512, 512, (g, w, h) => {
    const cx = w / 2, cy = h / 2;
    g.fillStyle = '#6e140c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7d1a0f'; g.beginPath(); g.arc(cx, cy, 250, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#e8b65a'; g.lineWidth = 12; g.beginPath(); g.arc(cx, cy, 244, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, 150, 0, Math.PI * 2); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.translate(cx, cy);
    ZODIAC.forEach((z, k) => {
      g.save(); g.rotate(k / 12 * Math.PI * 2);
      g.font = `54px ${EMOJI}`; g.fillText(z.icon, 0, -198);
      g.fillStyle = '#ffd77a'; g.font = `700 24px ${SER}`; g.fillText(z.chi, 0, -150 + 4);
      g.restore();
    });
    g.fillStyle = '#ffd77a'; g.font = `700 44px ${SER}`; g.fillText('12', 0, 4);
    g.restore();
  });
}

/* Câu đối dọc: mỗi âm tiết một hàng chữ vàng trên nền đỏ. */
function verticalPlate(syllables, w, h) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#6e140c'; g.fillRect(0, 0, 256, 1024);
  g.strokeStyle = '#e8b65a'; g.lineWidth = 10; g.strokeRect(10, 10, 236, 1004);
  g.lineWidth = 3; g.strokeRect(26, 26, 204, 972);
  g.fillStyle = '#ffd77a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const row = 972 / syllables.length;
  syllables.forEach((s, i) => {
    let size = 110; g.font = `700 ${size}px ${SER}`;
    while (g.measureText(s).width > 190 && size > 24) { size -= 4; g.font = `700 ${size}px ${SER}`; }
    g.fillText(s, 128, 26 + row * (i + 0.5) + 6);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.28, roughness: 0.5 }));
}

export function buildTuVi(g, W, ctx) {
  const { bc, bb, dyn } = ctx;
  const R = rng(8686);
  const by = 0.7;
  const HU = TUVI.hall.u, HV = TUVI.hall.v;
  const toWorld = (lx, ly, lz) => new THREE.Vector3(PLAZA.x + HU + lz, PLAZA.h + ly, PLAZA.z + HV - lx);     // đại sảnh xoay π/2: mặt trước (+z cục bộ) quay về đông
  const faceCenterOf = (u, v, cu, cv) => Math.atan2(cu - u, cv - v);

  /* ---------- sân trước: hoa văn Bát Quái và mười hai bia con giáp ---------- */
  const C = TUVI.court;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(C.r, 72), new THREE.MeshStandardMaterial({ map: courtyardTexture(), roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(C.u, 0.075, C.v); floor.receiveShadow = true; g.add(floor);
  ZODIAC.forEach((z, k) => {
    const th = k / 12 * Math.PI * 2, rr = C.r + 1.1;
    const u = C.u + Math.sin(th) * rr, v = C.v - Math.cos(th) * rr;
    const s = new THREE.Group(); s.position.set(u, 0, v); s.rotation.y = faceCenterOf(u, v, C.u, C.v); g.add(s);
    if (z.chi === 'Dậu') {                                                         // phía tây là thềm đại sảnh: ở chỗ này đặt đỉnh đồng thay bia
      cyl(1.3, 1.5, 0.35, M.STONE, 0, 0.17, 0, s, 20);
      cyl(0.95, 0.65, 0.85, M.BRONZE, 0, 0.9, 0, s, 20);
      mesh(new THREE.TorusGeometry(0.95, 0.07, 8, 24), M.GOLD, 0, 1.33, 0, s, false).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; cyl(0.08, 0.1, 0.62, M.BRONZE, Math.cos(a) * 0.5, 0.5, Math.sin(a) * 0.5, s, 8); }
      for (let i = 0; i < 10; i++) { const a = R() * 6.28, rr2 = Math.sqrt(R()) * 0.6; cyl(0.012, 0.012, 0.8, mat('summitStick', 0x8a2b1a), Math.cos(a) * rr2, 1.7, Math.sin(a) * rr2, s, 4, false); sph(0.025, M.PEARL, Math.cos(a) * rr2, 2.1, Math.sin(a) * rr2, s, false, 6, 4); }
      textPlate(`${z.icon} ${z.chi}`, 0.9, 0.5, 0, 0.17, 1.52, s, 0, { size: 0.5 });
      bc(u, v, 1.5);
      return;
    }
    box(1.0, 0.35, 0.8, M.STONE, 0, 0.17, 0, s); box(0.82, 1.15, 0.34, M.WHITE, 0, 0.92, 0, s);
    mesh(new THREE.SphereGeometry(0.18, 10, 8), M.GOLD, 0, 1.62, 0, s, false);
    textPlate(`${z.icon} ${z.chi}`, 0.7, 0.5, 0, 0.98, 0.19, s, 0, { size: 0.5 });
    bc(u, v, 0.55);
  });

  /* ---------- đại sảnh ---------- */
  const hall = new THREE.Group(); hall.position.set(HU, 0, HV); hall.rotation.y = Math.PI / 2; g.add(hall); hall.updateWorldMatrix(true, false);
  box(13.6, by, 10.6, M.STONE, 0, by / 2, 0, hall);
  box(6.4, 0.3, 1.1, M.STONE, 0, 0.15, 5.7, hall); box(5.6, 0.52, 0.9, M.STONE, 0, 0.26, 5.25, hall);
  const FZ = 4.4, BZ = -4.4;                                                       // hàng cột trước, hàng cột sau
  for (const x of [-6, -4, -2, 2, 4, 6]) {
    if (Math.abs(x) === 2) dragonColumn(hall, x, by, FZ, 4.2, 0.36, x < 0 ? 1 : -1); else column(hall, x, by, FZ, 4.2, 0.34);
    column(hall, x, by, BZ, 4.2, 0.34);
  }
  for (const sx of [-1, 1]) {
    box(0.34, 3.9, 8.6, M.RED2, sx * 6.2, by + 1.95, 0, hall);                    // tường hông
    for (const sz of [-1, 1]) box(0.1, 2.2, 3.3, M.LATTICE, sx * 6.42, by + 2.2, sz * 2.2, hall);
  }
  box(12.4, 4.0, 0.42, M.RED2, 0, by + 2.0, BZ - 0.1, hall);                       // tường sau
  box(12.4, 0.12, 0.1, M.GOLD, 0, by + 1.1, BZ + 0.15, hall, false); box(12.4, 0.12, 0.1, M.GOLD, 0, by + 3.5, BZ + 0.15, hall, false);
  box(12.8, 0.7, 0.6, M.RED, 0, by + 4.35, FZ, hall);                              // xà ngang mặt tiền
  box(12.9, 0.1, 0.62, M.GOLD, 0, by + 3.97, FZ, hall, false);
  textPlate('TỬ VI ĐƯỜNG', 6.0, 1.0, 0, by + 4.35, FZ + 0.32, hall, 0, { size: 0.52 });
  textPlate('TỬ VI ĐƯỜNG', 6.0, 1.0, 0, by + 4.35, FZ - 0.32, hall, Math.PI, { size: 0.52 });

  // câu đối hai bên cửa chính
  for (const [x, sy] of [[-3.0, ['THIỆN', 'ÁC', 'HỮU', 'BÁO']], [3.0, ['HỌA', 'PHÚC', 'VÔ', 'MÔN']]]) {
    const p = verticalPlate(sy, 0.62, 2.5); p.position.set(x, by + 2.3, FZ + 0.05); hall.add(p);
  }

  // mái hai tầng, đao cong, rồng và ngọc trên nóc
  roof(hall, { w: 15.4, d: 12.4, h: 1.7, y: by + 4.7, s: 0.9, ridge: 7.6 });
  box(10.8, 2.3, 8.0, M.RED2, 0, by + 6.4, 0, hall);
  box(11.0, 0.14, 8.2, M.GOLD, 0, by + 7.45, 0, hall, false);
  for (const sz of [-1, 1]) {
    box(6.2, 1.2, 0.1, M.LATTICE, 0, by + 6.4, sz * 4.04, hall);
    textPlate('TRI MỆNH · AN TÂM', 3.6, 0.5, 0, by + 6.4, sz * 4.1, hall, sz > 0 ? 0 : Math.PI, { size: 0.42 });
  }
  roof(hall, { w: 13.0, d: 10.0, h: 2.6, y: by + 7.5, s: 0.85, ridge: 5.0, dragons: true });

  // sau lưng thầy: đĩa Bát Quái sáng và hai bánh xe con giáp
  const bagua = new THREE.Mesh(new THREE.CircleGeometry(1.9, 48), new THREE.MeshStandardMaterial({ map: baguaDisc(), roughness: 0.55, emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0 }));
  bagua.material.emissiveMap = bagua.material.map; bagua.material.emissiveIntensity = 0.32;
  bagua.position.set(0, by + 2.4, BZ + 0.16); hall.add(bagua);
  mesh(new THREE.TorusGeometry(1.95, 0.08, 8, 48), M.GOLD, 0, by + 2.4, BZ + 0.17, hall, false);
  for (const sx of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.CircleGeometry(1.35, 40), new THREE.MeshStandardMaterial({ map: zodiacWheel(), roughness: 0.55, emissive: 0xffffff, emissiveIntensity: 0.25 }));
    wheel.material.emissiveMap = wheel.material.map;
    wheel.position.set(sx * 4.3, by + 2.4, BZ + 0.16); hall.add(wheel);
    mesh(new THREE.TorusGeometry(1.38, 0.07, 8, 40), M.GOLD, sx * 4.3, by + 2.4, BZ + 0.17, hall, false);
  }

  // bàn xem quẻ phủ khăn đỏ
  const TZ = 1.0;
  box(6.0, 0.95, 1.5, M.RED2, 0, by + 0.48, TZ, hall); box(6.2, 0.1, 1.7, M.GOLD, 0, by + 1.0, TZ, hall, false);
  box(5.9, 0.04, 1.4, M.RED, 0, by + 1.05, TZ, hall, false);
  // bình hương đồng, nến, tách trà
  cyl(0.3, 0.22, 0.3, M.BRONZE, 2.2, by + 1.22, TZ, hall, 14, false);
  mesh(new THREE.TorusGeometry(0.28, 0.04, 6, 16), M.GOLD, 2.2, by + 1.38, TZ, hall, false).rotation.x = Math.PI / 2;
  for (let i = 0; i < 9; i++) cyl(0.008, 0.008, 0.45, mat('summitStick', 0x8a2b1a), 2.2 + (R() - 0.5) * 0.28, by + 1.6, TZ + (R() - 0.5) * 0.28, hall, 4, false);
  for (const sx of [-1, 1]) { cyl(0.05, 0.05, 0.32, M.CANDLE, sx * 2.55, by + 1.2, TZ - 0.4, hall, 8, false); sph(0.06, M.PEARL, sx * 2.55, by + 1.42, TZ - 0.4, hall, false, 6, 4); }
  // bàn tính
  box(0.62, 0.05, 0.3, M.WOOD, -1.0, by + 1.1, TZ + 0.35, hall, false);
  for (let r = 0; r < 5; r++) {
    cyl(0.008, 0.008, 0.28, M.DARK, -1.22 + r * 0.11, by + 1.15, TZ + 0.35, hall, 4, false).rotation.x = Math.PI / 2;
    for (let b = 0; b < 2; b++) sph(0.028, M.RED, -1.22 + r * 0.11, by + 1.16, TZ + 0.28 + b * 0.05 + R() * 0.06, hall, false, 6, 4);
  }
  // ống đựng bút lông, cuộn giấy
  cyl(0.07, 0.07, 0.2, M.WOOD, -2.35, by + 1.17, TZ + 0.3, hall, 8, false);
  for (let i = 0; i < 4; i++) cyl(0.006, 0.006, 0.34, BAMBOO, -2.35 + (i - 1.5) * 0.02, by + 1.4, TZ + 0.3, hall, 4, false).rotation.z = (i - 1.5) * 0.07;
  box(0.9, 0.012, 0.42, mat('paper', 0xf3e7c8), -2.0, by + 1.07, TZ - 0.3, hall, false);
  for (const sx of [-1, 1]) cyl(0.035, 0.035, 0.46, M.WOOD, -2.0 + sx * 0.46, by + 1.1, TZ - 0.3, hall, 8, false).rotation.x = Math.PI / 2;

  W.lanternAt(hall, -5.2, by + 3.3, FZ + 0.9, 0.9); W.lanternAt(hall, 5.2, by + 3.3, FZ + 0.9, 0.9);
  W.lanternAt(hall, -1.0, by + 3.5, FZ + 0.9, 0.9); W.lanternAt(hall, 1.0, by + 3.5, FZ + 0.9, 0.9);
  W.lanternAt(hall, -3.4, by + 3.6, 0, 0.8); W.lanternAt(hall, 3.4, by + 3.6, 0, 0.8);
  W.light(hall, 0, by + 3.4, 1.2, 0xff8a40, 20, 1.5, 10, 2);
  bb(HU - 5.4, HU + 5.4, HV - 6.9, HV + 6.9);                                      // chặn cả đại sảnh (thềm vẫn đứng sát được)

  // hai đèn đá đứng gác lối vào sân
  for (const sv of [-1, 1]) {
    const x = C.u + C.r + 0.2, z = C.v + sv * 3.2;
    box(0.8, 0.4, 0.8, M.WHITE, x, 0.2, z, g); cyl(0.14, 0.18, 2.4, M.STONE, x, 1.5, z, g, 8);
    sph(0.34, M.LANTERN, x, 2.95, z, g, false, 12, 10).scale.y = 1.25; mesh(new THREE.ConeGeometry(0.46, 0.42, 8), M.RIDGE, x, 3.5, z, g, false);
    bc(x, z, 0.5);
  }
  W.light(g, C.u, 3.4, C.v, 0xffd9a0, 16, 1.8, 6);

  /* ---------- cây ước nguyện ---------- */
  const T = TUVI.tree;
  {
    cyl(2.1, 2.3, 0.45, M.STONE, T.u, 0.22, T.v, g, 24);
    cyl(0.32, 0.5, 3.2, mat('treeTrunk', 0x5a3a24, { roughness: 1 }), T.u, 2.0, T.v, g, 8);
    const leaf = mat('wishLeaf', 0x4c8a3c, { roughness: 0.9, flatShading: true });
    for (const [dx, dy, dz, r] of [[0, 4.4, 0, 1.9], [-1.2, 3.8, 0.4, 1.4], [1.2, 3.9, -0.3, 1.5], [0.2, 5.2, 0.6, 1.2]]) mesh(new THREE.IcosahedronGeometry(r, 1), leaf, T.u + dx, dy, T.v + dz, g, true);
    bc(T.u, T.v, 1.4);
    const s = new THREE.Group(); s.position.set(T.u + 3.0, 0, T.v + 2.2); s.rotation.y = -0.7; g.add(s);
    box(0.14, 1.4, 0.14, M.WOOD, -0.7, 0.7, 0, s); box(0.14, 1.4, 0.14, M.WOOD, 0.7, 0.7, 0, s);
    textPlate('CÂY ƯỚC NGUYỆN', 1.9, 0.45, 0, 1.45, 0.02, s, 0, { size: 0.5 });
    textPlate('Buộc một điều lành', 1.9, 0.34, 0, 1.0, 0.02, s, 0, { size: 0.42 });
  }
  // dải lụa đỏ (InstancedMesh, đung đưa theo gió)
  const NR = 70;
  const ribbons = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 1, 0.012), new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide }), NR);
  const rib = [], col = new THREE.Color(), RC = [0xc8201a, 0xe03a2c, 0xe8b65a, 0xb4161a, 0xf0c05a];
  for (let i = 0; i < NR; i++) {
    const a = R() * Math.PI * 2, rr = 0.5 + R() * 1.9, top = 3.2 + R() * 1.9;
    rib.push({ x: PLAZA.x + T.u + Math.cos(a) * rr, z: PLAZA.z + T.v + Math.sin(a) * rr * 0.9, top, len: 0.6 + R() * 0.9, ph: R() * 6.28 });
    ribbons.setColorAt(i, col.setHex(RC[i % RC.length]));
  }
  ribbons.frustumCulled = false; dyn.add(ribbons);

  /* ---------- vật động: ống xăm, đồng xu, thẻ xăm bay lên ---------- */
  const tubeBase = toWorld(-1.5, by + 1.1, TZ + 0.1);
  const tube = new THREE.Group(); tube.position.copy(tubeBase); dyn.add(tube);
  const inner = new THREE.Group(); tube.add(inner);                                    // nghiêng quanh đáy ống khi lắc
  mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.62, 18), BAMBOO, 0, 0.31, 0, inner, false);
  for (const y of [0.1, 0.52]) mesh(new THREE.TorusGeometry(0.2, 0.014, 6, 20), M.GOLD, 0, y, 0, inner, false).rotation.x = Math.PI / 2;
  const sticks = [];
  for (let i = 0; i < 34; i++) {
    const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 0.12;
    const st = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.5, 4), i % 7 === 0 ? M.RED : mat('stickWood', 0xe0c58a), Math.cos(a) * rr, 0.72, Math.sin(a) * rr, inner, false);
    st.rotation.set((R() - 0.5) * 0.28, 0, (R() - 0.5) * 0.28); sticks.push(st);
  }
  const lucky = mesh(new THREE.BoxGeometry(0.03, 0.62, 0.012), M.RED, 0.02, 0.82, 0, inner, false);     // thẻ xăm bay ra khỏi ống
  mesh(new THREE.BoxGeometry(0.035, 0.1, 0.016), M.GOLD, 0.02, 1.08, 0, lucky, false);

  const coinBase = toWorld(1.5, by + 1.1, TZ + 0.1);
  const coinGroup = new THREE.Group(); coinGroup.position.copy(coinBase); dyn.add(coinGroup);
  mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.08, 20), M.RED, 0, 0.04, 0, coinGroup, false);          // đĩa đỏ đựng tiền
  const coins = [-0.17, 0, 0.17].map((dx, i) => {
    const c = new THREE.Group(); c.position.set(dx, 0.1, (i - 1) * 0.05); coinGroup.add(c);
    mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.018, 18), M.BRONZE, 0, 0, 0, c, false);
    mesh(new THREE.BoxGeometry(0.04, 0.02, 0.04), M.DARK, 0, 0, 0, c, false);
    mesh(new THREE.TorusGeometry(0.095, 0.008, 4, 18), M.GOLD, 0, 0.01, 0, c, false).rotation.x = Math.PI / 2;
    return c;
  });

  let shakeT = 0, coinT = 0, glowT = 0;
  const dummy = new THREE.Object3D();
  return {
    /* kind: 'stick' | 'yi' | 'star' | 'match' — có người vừa xem quẻ */
    oracle(kind) {
      if (kind === 'stick') shakeT = 2.6;
      else if (kind === 'yi') coinT = 2.4;
      else glowT = 1.6;
    },
    update(t, dt, env) {
      // ống xăm lắc, rồi một thẻ nhô lên
      if (shakeT > 0) {
        shakeT = Math.max(0, shakeT - dt);
        const env2 = Math.min(1, shakeT / 0.5), k = Math.sin(t * 40);
        inner.rotation.z = k * 0.3 * env2; inner.rotation.x = Math.cos(t * 33) * 0.16 * env2;
        tube.position.y = tubeBase.y + Math.abs(Math.sin(t * 20)) * 0.04 * env2;
        sticks.forEach((s, i) => { s.position.y = 0.72 + Math.sin(t * 55 + i * 1.7) * 0.05 * env2; });
        lucky.position.y = 0.82 + smooth(1 - shakeT / 2.6, 0.55, 0.85) * 0.36;
      } else if (inner.rotation.z !== 0 || lucky.position.y !== 0.82) {
        inner.rotation.set(0, 0, 0); tube.position.y = tubeBase.y; lucky.position.y = 0.82;
        sticks.forEach(s => { s.position.y = 0.72; });
      }
      // ba đồng xu tung lên, xoay, rơi xuống
      if (coinT > 0) {
        coinT = Math.max(0, coinT - dt);
        const k = 1 - coinT / 2.4;
        coins.forEach((c, i) => {
          const ph = Math.min(1, k * 1.5 - i * 0.08), fly = ph > 0 && ph < 1 ? Math.sin(ph * Math.PI) : 0;
          c.position.y = 0.1 + fly * (0.7 + i * 0.12);
          c.rotation.x = ph > 0 && ph < 1 ? ph * Math.PI * (6 + i * 2) : 0;
          c.rotation.z = fly * 0.4 * (i - 1);
        });
      }
      // dải lụa đung đưa theo gió
      const sway = 0.14 + env.wind * 0.18;
      for (let i = 0; i < NR; i++) {
        const r = rib[i];
        dummy.position.set(r.x, PLAZA.h + r.top - r.len / 2, r.z);
        dummy.rotation.set(Math.sin(t * 1.3 + r.ph) * sway, 0, Math.sin(t * 1.7 + r.ph * 1.3) * sway);
        dummy.scale.set(1, r.len, 1); dummy.updateMatrix(); ribbons.setMatrixAt(i, dummy.matrix);
      }
      ribbons.instanceMatrix.needsUpdate = true;
      if (glowT > 0) glowT = Math.max(0, glowT - dt);
    }
  };
}

function smooth(x, a, b) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
