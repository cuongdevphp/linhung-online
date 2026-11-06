import * as THREE from 'three';
import { mesh, box, cyl, clamp } from './util.js';
import { M } from './materials.js';

/* Cấu kiện kiến trúc dùng lại nhiều nơi: mái cong, cột, rồng, lan can, đèn lồng. */

/* ====================== MÁI CONG ======================
   Mái 4 phái (mái đình) có độ võng và đầu đao vút lên ở bốn góc.
   w, d: kích thước mép mái; ridge: chiều dài nóc; h: độ cao nóc. */
function makeSurface({ w, d, ridge, h, flick, curve }) {
  const hw = w / 2, hd = d / 2, hr = Math.min(ridge / 2, hw - 0.05);
  return {
    hw, hd, hr,
    /* (u,v) ∈ [-1,1]² -> điểm trên mặt mái, kèm vùng ánh xạ UV. */
    at(u, v, out = {}) {
      let x = u * hw, z = v * hd;
      const sz = Math.abs(v), sx = Math.max(0, Math.abs(x) - hr) / (hw - hr);
      const s = Math.max(sz, sx);
      let y = h * Math.pow(1 - s, curve);
      const fx = Math.pow(clamp((Math.abs(u) - 0.5) / 0.5, 0, 1), 2);
      const fz = Math.pow(clamp((Math.abs(v) - 0.5) / 0.5, 0, 1), 2);
      const f = Math.pow(fx * fz, 0.9);
      y += flick * f;
      x += Math.sign(x) * 0.45 * flick * f;
      z += Math.sign(z) * 0.45 * flick * f;
      out.x = x; out.y = y; out.z = z; out.s = s; out.front = sz >= sx;
      return out;
    }
  };
}

export function roofGeometry({ w, d, ridge, h, flick = 1, curve = 1.7, nx = 30, nz = 22 }) {
  const S = makeSurface({ w, d, ridge, h, flick, curve });
  const pos = [], uv = [], idx = [], p = {};
  const slopeF = Math.hypot(h, S.hd), slopeS = Math.hypot(h, S.hw - S.hr);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    S.at((i / nx) * 2 - 1, (j / nz) * 2 - 1, p);
    pos.push(p.x, p.y, p.z);
    if (p.front) uv.push(p.x * 0.3, (1 - p.s) * slopeF * 0.3);
    else uv.push(p.z * 0.3, (1 - p.s) * slopeS * 0.3);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, e = c + 1;
    idx.push(a, c, b, b, c, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geometry: g, surface: S };
}

/* ====================== RỒNG NÓC ====================== */
const coneGeo = new THREE.ConeGeometry(1, 1, 6);
function dragon(parent, dir, h, s, len) {
  const pts = [], N = 16;
  for (let i = 0; i <= N; i++) {
    const k = i / N;
    pts.push(new THREE.Vector3(dir * (0.95 * s + k * len), h + (0.4 + 0.42 * Math.sin(k * Math.PI * 2.6) + k * 0.6) * s, Math.sin(k * 9) * 0.06 * s));
  }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.17 * s, 8), M.JADE, 0, 0, 0, parent);
  const head = mesh(new THREE.SphereGeometry(0.32 * s, 14, 10), M.JADE, dir * 0.8 * s, h + 0.78 * s, 0, parent);
  head.scale.set(1.5, 1, 1);
  for (const sz of [-1, 1]) {
    const horn = mesh(coneGeo, M.GOLD, dir * 0.95 * s, h + 1.12 * s, sz * 0.14 * s, parent, false);
    horn.scale.set(0.07 * s, 0.55 * s, 0.07 * s); horn.rotation.z = -dir * 0.7;
  }
  for (let i = 2; i < N - 1; i += 2) {
    const f = mesh(coneGeo, M.GOLD, pts[i].x, pts[i].y + 0.22 * s, pts[i].z, parent, false);
    f.scale.set(0.07 * s, 0.34 * s, 0.07 * s);
  }
}

function dragonPair(parent, h, ridge, s, pearl) {
  const len = clamp(ridge / 2 - 1.3 * s, 1.2 * s, 6.5 * s);
  dragon(parent, 1, h, s, len); dragon(parent, -1, h, s, len);
  if (pearl) {
    const p = mesh(new THREE.SphereGeometry(0.42 * s, 20, 14), M.PEARL, 0, h + 1.3 * s, 0, parent, false);
    mesh(new THREE.TorusGeometry(0.62 * s, 0.06 * s, 8, 32), M.GOLD, 0, h + 1.3 * s, 0, parent, false);
    const fl = mesh(coneGeo, M.PEARL, 0, h + 2.0 * s, 0, parent, false); fl.scale.set(0.25 * s, 0.75 * s, 0.25 * s);
    void p;
  }
}

/* ====================== MÁI ====================== */
export function roof(parent, { w, d, h, ridge, x = 0, y = 0, z = 0, flick = 1, s = 1, dragons = false, pearl = true, curve = 1.7 }) {
  ridge = ridge ?? Math.max(0.2, w - d);
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const { geometry, surface: S } = roofGeometry({ w, d, ridge, h, flick: flick * s, curve });
  mesh(geometry, M.ROOF, 0, 0, 0, g);

  // đường diềm mái: hai thanh ngang + hai thanh dọc
  const t = 0.34 * s;
  box(w * 0.95, t, 0.3 * s, M.RED2, 0, 0.0, S.hd - 0.12 * s, g); box(w * 0.95, t, 0.3 * s, M.RED2, 0, 0.0, -S.hd + 0.12 * s, g);
  box(0.3 * s, t, d * 0.95, M.RED2, S.hw - 0.12 * s, 0.0, 0, g); box(0.3 * s, t, d * 0.95, M.RED2, -S.hw + 0.12 * s, 0.0, 0, g);
  box(w * 0.97, 0.1 * s, 0.14 * s, M.GOLD, 0, -0.14 * s, S.hd - 0.12 * s, g, false); box(w * 0.97, 0.1 * s, 0.14 * s, M.GOLD, 0, -0.14 * s, -S.hd + 0.12 * s, g, false);

  // bờ nóc + bốn bờ chảy (đao) kết thúc bằng đầu đao cong vút
  const rl = S.hr * 2;
  box(rl + 0.9 * s, 0.46 * s, 0.5 * s, M.RIDGE, 0, h + 0.05 * s, 0, g);
  const pt = {};
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const k = i / 14;
      S.at(sx * (S.hr + k * (S.hw - S.hr)) / S.hw, sz * k, pt);
      pts.push(new THREE.Vector3(pt.x, pt.y + 0.1 * s, pt.z));
    }
    const e = pts[pts.length - 1];
    pts.push(new THREE.Vector3(e.x * 1.035, e.y + 0.32 * s, e.z * 1.035));
    pts.push(new THREE.Vector3(e.x * 1.07, e.y + 0.8 * s, e.z * 1.07));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, 0.13 * s, 6), M.RIDGE, 0, 0, 0, g, false);
  }
  for (const sx of [-1, 1]) {   // đầu kìm hai đầu nóc
    const e = mesh(coneGeo, M.RIDGE, sx * (S.hr + 0.45 * s), h + 0.5 * s, 0, g, false);
    e.scale.set(0.2 * s, 1.0 * s, 0.3 * s); e.rotation.z = -sx * 0.45;
  }
  if (dragons) dragonPair(g, h + 0.2 * s, rl, s, pearl);
  else if (rl < 0.6) {          // mái chóp: gắn đỉnh tháp
    cyl(0.05 * s, 0.11 * s, 1.6 * s, M.GOLD, 0, h + 0.8 * s, 0, g, 8, false);
    for (let i = 0; i < 3; i++) mesh(new THREE.SphereGeometry((0.3 - i * 0.08) * s, 12, 8), M.GOLD, 0, h + (0.3 + i * 0.5) * s, 0, g, false);
  }
  return g;
}

/* ====================== CỘT ====================== */
export function column(parent, x, y, z, h, r = 0.42) {
  cyl(r * 1.5, r * 1.65, 0.45, M.DARK, x, y + 0.225, z, parent, 14);
  cyl(r, r * 1.05, h - 0.45, M.RED, x, y + 0.45 + (h - 0.45) / 2, z, parent, 18);
  cyl(r * 1.12, r * 1.12, 0.18, M.GOLD, x, y + h - 0.1, z, parent, 18, false);
  cyl(r * 1.12, r * 1.12, 0.12, M.GOLD, x, y + 1.3, z, parent, 18, false);
}

/* Cột có rồng vàng quấn (mặt tiền Đại Hùng Bảo Điện). */
export function dragonColumn(parent, x, y, z, h, r = 0.46, dir = 1) {
  column(parent, x, y, z, h, r);
  const pts = [], N = 44, turns = 2.4, rr = r * 1.2;
  for (let i = 0; i <= N; i++) {
    const k = i / N, a = k * Math.PI * 2 * turns * dir;
    pts.push(new THREE.Vector3(x + Math.cos(a) * rr, y + 1.0 + k * (h - 2.3), z + Math.sin(a) * rr));
  }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.11, 8), M.GOLD, 0, 0, 0, parent, false);
  const top = pts[pts.length - 1];
  const head = mesh(new THREE.SphereGeometry(0.2, 12, 10), M.GOLD, top.x, top.y + 0.1, top.z + 0.06, parent, false);
  head.scale.set(1, 0.85, 1.4);
  for (const sx of [-1, 1]) {
    const horn = mesh(coneGeo, M.GOLD, top.x + sx * 0.1, top.y + 0.3, top.z, parent, false);
    horn.scale.set(0.04, 0.3, 0.04); horn.rotation.z = -sx * 0.5;
  }
}

/* ====================== LAN CAN ĐÁ ====================== */
export function balustrade(parent, x1, z1, x2, z2, y, step = 2.2) {
  const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(len / step));
  const ang = Math.atan2(x2 - x1, z2 - z1);
  for (let i = 0; i <= n; i++) {
    const k = i / n, px = x1 + (x2 - x1) * k, pz = z1 + (z2 - z1) * k;
    box(0.32, 1.05, 0.32, M.WHITE, px, y + 0.52, pz, parent);
    mesh(new THREE.SphereGeometry(0.2, 10, 8), M.WHITE, px, y + 1.15, pz, parent, false);
  }
  const r1 = box(0.22, 0.16, len, M.WHITE, (x1 + x2) / 2, y + 0.95, (z1 + z2) / 2, parent); r1.rotation.y = ang;
  const r2 = box(0.16, 0.12, len, M.WHITE, (x1 + x2) / 2, y + 0.35, (z1 + z2) / 2, parent); r2.rotation.y = ang;
}

/* ====================== ĐÈN LỒNG TREO (instanced) ====================== */
export function createLanternField(scene, max = 120) {
  const body = new THREE.SphereGeometry(0.42, 16, 12); body.scale(1, 1.25, 1); body.translate(0, -1.12, 0);
  const caps = [];
  const piece = (g) => caps.push(g.index ? g.toNonIndexed() : g);
  const string = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4); string.translate(0, -0.4, 0); piece(string);
  const top = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 10); top.translate(0, -0.86, 0); piece(top);
  const bot = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 10); bot.translate(0, -1.62, 0); piece(bot);
  const tas = new THREE.ConeGeometry(0.07, 0.45, 6); tas.rotateX(Math.PI); tas.translate(0, -1.9, 0); piece(tas);
  const capGeo = new THREE.BufferGeometry();
  { // gộp các mảnh vỏ đèn thành một geometry
    let n = 0; for (const g of caps) n += g.attributes.position.count;
    const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0;
    for (const g of caps) {
      P.set(g.attributes.position.array, o * 3); Nn.set(g.attributes.normal.array, o * 3); U.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count;
    }
    capGeo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    capGeo.setAttribute('normal', new THREE.BufferAttribute(Nn, 3));
    capGeo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  }
  const bodies = new THREE.InstancedMesh(body, M.LANTERN, max);
  const capsM = new THREE.InstancedMesh(capGeo, M.GOLD, max);
  bodies.frustumCulled = capsM.frustumCulled = false;
  bodies.castShadow = false; capsM.castShadow = false;
  bodies.count = capsM.count = 0;
  scene.add(bodies, capsM);

  const items = [];
  const dummy = new THREE.Object3D();
  const api = {
    add(x, y, z, s = 1) {
      if (items.length >= max) return;
      items.push({ x, y, z, s, ph: Math.random() * 6.28 });
      bodies.count = capsM.count = items.length;
      this.update(0, 0);
    },
    update(t, wind) {
      const amp = 0.05 + wind * 0.08;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        dummy.position.set(it.x, it.y, it.z);
        dummy.rotation.set(Math.sin(t * 0.9 + it.ph) * amp * 0.5, 0, Math.sin(t * (1.2 + wind) + it.ph) * amp);
        dummy.scale.setScalar(it.s);
        dummy.updateMatrix();
        bodies.setMatrixAt(i, dummy.matrix); capsM.setMatrixAt(i, dummy.matrix);
      }
      bodies.instanceMatrix.needsUpdate = true; capsM.instanceMatrix.needsUpdate = true;
    }
  };
  return api;
}
