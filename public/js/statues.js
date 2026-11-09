import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { mesh, cyl, span, mat } from './util.js';
import { M } from './materials.js';
import { makeBuddhaHead } from './buddhaface.js';

/* Tượng: Phật Bà Quán Thế Âm trên đài sen, tượng thờ trong chánh điện, 18 vị La Hán. */

const LOTUS = mat('lotusPink', 0xf8e7ea, { roughness: 0.5, emissive: 0xfff0f0, emissiveIntensity: 0 });
/* HOOD: vàng hai mặt cho khăn trùm của Quán Âm (nhìn từ phía trước thấy mặt trong của nửa khăn phía sau). main.js đồng bộ độ sáng với M.BGOLD. */
const HOOD = M.BGOLD.clone(); HOOD.side = THREE.DoubleSide;
export const STATUE_MATS = { MARBLE: M.MARBLE, LOTUS, HOOD };

/* Lathe có nếp áo (gợn theo góc và theo chiều cao), đường nối đặt ở phía sau, pháp tuyến mượt. */
export function foldedLathe(profile, { seg = 56, fold = 0.025, phiStart = 0, phiLength = Math.PI * 2, squash = 1 } = {}) {
  let g = new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(p[0], p[1])), seg, phiStart, phiLength);
  g.rotateY(Math.PI);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const th = Math.atan2(x, z);
    const k = 1 + fold * Math.sin(9 * th + y * 0.17) + fold * 0.5 * Math.sin(21 * th - y * 0.31);
    p.setXYZ(i, r * k * Math.sin(th), y, r * k * Math.cos(th) * squash);
  }
  g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-3);
  g.computeVertexNormals();
  return g;
}

/* ====================== PHẬT BÀ QUÁN THẾ ÂM ====================== */
export function buildQuanAm() {
  const root = new THREE.Group();
  const add = (geo, m, x, y, z, parent = root, shadow = true) => mesh(geo, m, x, y, z, parent, shadow);

  /* --- bệ và đài sen --- */
  cyl(20.6, 21, 0.8, M.STONE, 0, 0.4, 0, root, 64);
  cyl(19.2, 19.6, 0.8, M.WHITE, 0, 1.2, 0, root, 64);
  for (let i = 0; i < 4; i++) cyl(17.6 - i * 0.9, 18 - i * 0.9, 0.35, M.STONE, 0, 1.78 + i * 0.35, 0, root, 64);
  cyl(7.2, 7.8, 9.4, M.WHITE, 0, 6.6, 0, root, 40);                    // thân đài (ruột bên trong chứa 17 tầng thờ)
  cyl(6.2, 6.2, 0.6, M.GOLD, 0, 10.9, 0, root, 40, false);

  const petalGeo = new THREE.SphereGeometry(1, 14, 10);
  const ring = (n, R0, y0, semiLen, semiW, lean, off = 0) => {
    for (let i = 0; i < n; i++) {
      const a = (i + off) / n * Math.PI * 2;
      const pivot = new THREE.Group(); pivot.position.set(Math.cos(a) * R0, y0, Math.sin(a) * R0); pivot.rotation.y = -a;
      const tilt = new THREE.Group(); tilt.rotation.z = -lean; pivot.add(tilt);
      const p = mesh(petalGeo, LOTUS, 0, semiLen, 0, tilt, true);
      p.scale.set(0.62, semiLen, semiW);
      root.add(pivot);
    }
  };
  ring(24, 11.5, 2.4, 4.7, 1.75, 0.62, 0);     // hàng cánh ngoài, đầu cánh chạm bán kính ~17 m
  ring(20, 8.8, 3.6, 4.3, 1.6, 0.36, 0.5);
  ring(16, 6.2, 5.6, 3.9, 1.45, 0.2, 0);
  ring(12, 4.4, 8.2, 3.2, 1.3, 0.1, 0.5);

  /* --- thân tượng (gốc toạ độ ở chân tượng, cao ~67 m) --- */
  const fig = new THREE.Group(); fig.position.set(0, 11.2, 0); root.add(fig);
  const robe = foldedLathe([[0.01, 0], [6.4, 0], [6.3, 1.2], [5.7, 6], [5, 14], [4.6, 24], [4.6, 32], [4.1, 38], [4.4, 43], [5, 48], [5.2, 51], [4.4, 53.5], [2.3, 55], [1.8, 56.2]], { seg: 64, fold: 0.022, squash: 0.82 });
  add(robe, M.MARBLE, 0, 0, 0, fig);

  // khăn voan trùm đầu và rủ xuống vai, chừa khoảng hở phía trước để lộ khuôn mặt
  // (lathe bị xoay π nên khe hở ban đầu đặt ở φ = π để sau khi xoay nằm phía trước +z)
  const veil = foldedLathe([[6.5, 43.5], [6.9, 48], [6.2, 52.5], [5.2, 56.5], [4.7, 60], [4.5, 63], [3.5, 65.8], [1.6, 67], [0.01, 67.5]], { seg: 64, fold: 0.02, phiStart: Math.PI + 0.6, phiLength: Math.PI * 2 - 1.2, squash: 0.92 });
  add(veil, M.MARBLE, 0, 0, 0, fig);

  // đầu và nét mặt: tượng đá trắng, mắt khép nhìn xuống, mày cong, môi mỉm, tai dài, bạch hào giữa trán (xem buddhaface.js)
  const face = makeBuddhaHead({ skin: M.MARBLE, line: mat('faceLineStone', 0x6b665f, { roughness: 0.7 }), urna: M.GOLD, detail: 'hi' });
  face.scale.setScalar(3.6); face.position.set(0, 60.4, 0.2); fig.add(face);
  // Đức Phật A Di Đà nhỏ trên đỉnh đầu
  const mini = new THREE.Group(); mini.position.set(0, 66.4, 0.3); fig.add(mini);
  add(new THREE.SphereGeometry(0.9, 12, 8), M.GOLD, 0, 0.6, 0, mini, false).scale.set(1.3, 0.8, 0.9);
  add(new THREE.SphereGeometry(0.45, 12, 10), M.GOLD, 0, 1.6, 0, mini, false);

  // vòng hào quang sau đầu
  const halo = add(new THREE.TorusGeometry(7.4, 0.32, 8, 64), M.PEARL, 0, 61, -4.8, fig, false);
  halo.userData.glow = true;

  /* --- hai cánh tay --- */
  const limb = (a, b, r0, r1, m = M.MARBLE) => {
    const g = new THREE.CylinderGeometry(r1, r0, 1, 16);
    const c = mesh(g, m, 0, 0, 0, fig, true); span(c, a, b);
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // tay trái của tượng (phía +x): giơ lên thủ ấn
  const S1 = V(5.0, 50.5, 0.6), E1 = V(8.4, 43.4, 3.4), H1 = V(6.4, 49.2, 7.4);
  limb(S1, E1, 1.9, 2.3); limb(E1, H1, 2.5, 1.5);
  add(new THREE.SphereGeometry(2.3, 14, 10), M.MARBLE, E1.x, E1.y, E1.z, fig);
  const palm = add(new THREE.SphereGeometry(1.15, 12, 10), M.MARBLE, H1.x, H1.y + 0.6, H1.z + 0.5, fig); palm.scale.set(1, 1.25, 0.45);
  for (let i = 0; i < 4; i++) {
    const f = add(new THREE.CapsuleGeometry(0.26, 1.2, 4, 8), M.MARBLE, H1.x + (i - 1.5) * 0.52, H1.y + 2.2 + (i === 1 || i === 2 ? 0.25 : 0), H1.z + 0.55, fig, false);
    f.rotation.z = -(i - 1.5) * 0.08;
  }
  // tay phải (phía -x): đỡ bình cam lộ
  const S2 = V(-5.0, 50.5, 0.6), E2 = V(-7.4, 43, 2.4), H2 = V(-3.9, 38.1, 6.4);
  limb(S2, E2, 1.9, 2.3); limb(E2, H2, 2.5, 1.4);
  add(new THREE.SphereGeometry(2.3, 14, 10), M.MARBLE, E2.x, E2.y, E2.z, fig);
  const palm2 = add(new THREE.SphereGeometry(1.2, 12, 10), M.MARBLE, H2.x, H2.y - 0.1, H2.z, fig); palm2.scale.set(1.2, 0.5, 1);
  const vase = new THREE.LatheGeometry([[0.01, 0], [0.95, 0], [1.4, 0.9], [1.6, 2], [1.1, 3.1], [0.6, 3.6], [0.65, 4.3], [1.0, 4.6]].map(p => new THREE.Vector2(...p)), 24);
  add(vase, M.MARBLE, H2.x, H2.y + 0.3, H2.z, fig);

  return { root, halo, height: 11.2 + 67 };
}

/* ====================== TƯỢNG THỜ TRONG CHÁNH ĐIỆN ====================== */
/* kind: 'sakya' (Thích Ca), 'quanam' (Quán Thế Âm), 'diatang' (Địa Tạng). Cao ~3,6 đơn vị ở tỉ lệ 1. */
export function makeBuddha(kind, haloMat) {
  const b = new THREE.Group();
  const G = M.BGOLD;
  const add = (geo, m, x, y, z, shadow = true) => mesh(geo, m, x, y, z, b, shadow);
  const lotusGold = mat('lotusGold', 0xd9a54a, { metalness: 0.7, roughness: 0.32 });
  const petal = new THREE.SphereGeometry(0.5, 12, 8);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 12; i++) {
    const a = (i + row * 0.5) / 12 * Math.PI * 2, r = 1 - row * 0.15;
    const p = add(petal, lotusGold, Math.cos(a) * r, 0.12 + row * 0.18, Math.sin(a) * r, false);
    p.scale.set(0.42, 0.3, 0.75); p.rotation.y = -a; p.rotation.z = 0.55;
  }
  add(new THREE.SphereGeometry(1, 24, 12), G, 0, 0.55, 0.1).scale.set(1.1, 0.36, 0.72);
  add(new THREE.LatheGeometry([[0.01, 0], [0.68, 0], [0.72, 0.4], [0.6, 0.95], [0.44, 1.28], [0.2, 1.4], [0.01, 1.43]].map(p => new THREE.Vector2(...p)), 28), G, 0, 0.62, 0);
  for (const sx of [-1, 1]) {
    const up = add(new THREE.CapsuleGeometry(0.13, 0.55, 4, 10), G, sx * 0.62, 1.45, 0.05); up.rotation.set(-0.25, 0, sx * 0.25);
    const lo = add(new THREE.CapsuleGeometry(0.11, 0.5, 4, 10), G, sx * 0.32, 1.0, 0.42); lo.rotation.set(Math.PI / 2 - 0.2, 0, sx * 1.1);
  }
  add(new THREE.SphereGeometry(0.2, 12, 10), G, 0, 0.92, 0.55).scale.set(1.4, 0.6, 1);
  add(new THREE.CylinderGeometry(0.13, 0.15, 0.2, 12), G, 0, 2.08, 0);
  // đầu: mặt Phật điêu khắc chi tiết. Thích Ca có ốc phát xanh thẫm + nhục kế + ngọc đỉnh; Địa Tạng có mũ tóc; Quán Âm có khăn trùm.
  const HAIR = mat('buddhaHair', 0x1c2a58, { metalness: 0.2, roughness: 0.45 });
  const head = makeBuddhaHead({
    skin: G, line: mat('faceLineGold', 0x2a1608, { roughness: 0.6 }), urna: M.PEARL, detail: 'mid',
    hair: kind === 'quanam' ? null : HAIR, curls: kind === 'sakya', cap: kind === 'diatang', jewel: kind === 'sakya' ? M.PEARL : null
  });
  head.scale.setScalar(0.36); head.position.set(0, 2.38, 0); b.add(head);

  if (kind === 'quanam') {
    // khăn trùm ôm sát đầu, chừa khe phía trước để lộ khuôn mặt
    const hood = foldedLathe([[0.4, 1.95], [0.44, 2.3], [0.42, 2.65], [0.31, 2.9], [0.13, 3.0], [0.01, 3.03]], { seg: 32, fold: 0.01, phiStart: Math.PI + 0.8, phiLength: Math.PI * 2 - 1.6 });
    add(hood, HOOD, 0, 0, 0);
    add(new THREE.LatheGeometry([[0.01, 0], [0.12, 0], [0.18, 0.2], [0.2, 0.4], [0.08, 0.65], [0.1, 0.8], [0.01, 0.8]].map(p => new THREE.Vector2(...p)), 14), G, -0.45, 1.25, 0.62);
  } else if (kind === 'diatang') {
    cyl(0.025, 0.025, 2.6, G, 0.82, 1.7, 0.45, b, 8);
    const ringT = add(new THREE.TorusGeometry(0.16, 0.025, 6, 16), G, 0.82, 3.0, 0.45); ringT.rotation.x = Math.PI / 2;
    add(new THREE.SphereGeometry(0.12, 12, 10), M.PEARL, -0.4, 1.12, 0.62, false);
  }
  add(new THREE.TorusGeometry(0.72, 0.045, 8, 48), haloMat, 0, 2.4, -0.4, false);
  add(new THREE.TorusGeometry(1.5, 0.04, 8, 64), haloMat, 0, 1.45, -0.5, false);
  add(new THREE.CircleGeometry(1.45, 48), new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0.12, depthWrite: false }), 0, 1.45, -0.52, false);
  return b;
}

/* Bộ 18 vị La Hán nằm ở arhat.js. */
