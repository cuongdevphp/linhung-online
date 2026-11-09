import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* =====================================================================
   MẶT PHẬT
   Điêu khắc thủ tục: một lưới cầu dày (mật độ dồn về phía mặt) được đẩy ra/vào theo các
   "nét khắc" để tạo trán cao, gò mày, mi mắt khép nhìn xuống, sống mũi, cánh mũi, nhân trung,
   đôi môi mỉm cười, má đầy, cằm tròn. Kèm vành tai dài, ốc phát xoắn, nhục kế, bạch hào.

   Hệ toạ độ đầu: gốc ở tâm đầu, mặt quay về +z, +y lên. Nửa chiều rộng ~0,9, nửa chiều cao ~1,14.
   Dùng makeBuddhaHead({...}) rồi scale cho đúng cỡ (bán kính 1 = đầu cao 2,28).
   ===================================================================== */

const SX = 0.85, SY = 1.14, SY_LOW = 0.82 * 1.14, SZ = 1.0;   // nửa dưới mặt ngắn lại cho khuôn mặt tròn đầy
const JAW = 0.16;                                             // độ thon của hàm
const sq = v => v * v;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const gauss = (dx, dy, sx, sy) => Math.exp(-(sq(dx / sx) + sq(dy / sy)));
const table = (tab, y) => {                      // nội suy tuyến tính bảng [[y, giá trị]] xếp giảm dần theo y
  if (y >= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (y >= tab[i][0]) { const [y0, v0] = tab[i - 1], [y1, v1] = tab[i]; return v0 + (v1 - v0) * (y - y0) / (y1 - y0); }
  return tab[tab.length - 1][1];
};

const NOSE_H = [[0.34, 0.0], [0.22, 0.02], [0.08, 0.05], [-0.06, 0.09], [-0.16, 0.135], [-0.23, 0.1], [-0.30, 0.0]];   // độ nhô sống mũi theo y
const NOSE_W = [[0.3, 0.07], [0.1, 0.08], [-0.1, 0.1], [-0.22, 0.13]];                                                   // độ rộng sống mũi

/* Đường mi mắt (khe mắt) của mắt bên phải (x > 0), u ∈ [-1, 1] từ khoé trong đến khoé ngoài. */
const EYE_CX = 0.3, EYE_HW = 0.15;
const eyeSlitY = u => 0.115 - 0.03 * (1 - u * u) + 0.02 * u;       // mi khép võng xuống như nụ cười, khoé ngoài hơi xếch lên
const browY = ax => 0.3 + 0.16 * ax - 0.5 * ax * ax;
const mouthY = x => -0.51 + 1.0 * x * x;                          // miệng cong lên ở hai khoé: nụ cười mỉm

/* Độ lồi/lõm (đơn vị đầu) tại điểm (x, y) trên mặt phẳng khuôn mặt. */
function carve(x, y) {
  const ax = Math.abs(x);
  let h = 0;

  h += 0.03 * gauss(x, y - 0.62, 0.5, 0.26);                                        // trán đầy

  // gò mày: vòng cung từ gốc mũi ra đuôi mày
  h += 0.04 * Math.exp(-sq((y - browY(ax)) / 0.04)) * (1 - smooth(0.4, 0.58, ax));
  h += -0.022 * gauss(ax - 0.32, y - 0.17, 0.16, 0.07);                              // hõm hốc mắt dưới gò mày

  // mắt khép nhìn xuống
  const u = (ax - EYE_CX) / EYE_HW;
  if (Math.abs(u) < 1.15) {
    const win = 1 - smooth(0.78, 1.12, Math.abs(u));
    const ys = eyeSlitY(Math.max(-1, Math.min(1, u)));
    h += 0.02 * gauss(ax - EYE_CX, y - 0.1, 0.15, 0.08);                             // nhãn cầu dưới mi
    h += 0.03 * Math.exp(-sq((y - (ys + 0.048)) / 0.045)) * win;                     // mi trên đầy
    h += -0.03 * Math.exp(-sq((y - ys) / 0.017)) * win;                              // khe mắt khép
  }

  // mũi: sống, đầu mũi, cánh mũi, lỗ mũi
  const nh = table(NOSE_H, y), nw = table(NOSE_W, y);
  h += nh * Math.exp(-sq(x / nw));
  h += 0.028 * gauss(x, y + 0.17, 0.06, 0.045);
  h += 0.045 * gauss(ax - 0.12, y + 0.2, 0.06, 0.045);
  h += -0.012 * Math.exp(-sq((ax - 0.19) / 0.03)) * smooth(-0.36, -0.27, y) * smooth(-0.08, -0.17, y);
  h += -0.018 * gauss(ax - 0.065, y + 0.255, 0.034, 0.022);

  // má đầy
  h += 0.055 * gauss(ax - 0.42, y + 0.2, 0.24, 0.26);

  // nhân trung (rất nhẹ), môi trên, môi dưới, khoé miệng
  h += -0.008 * Math.exp(-sq(x / 0.05)) * smooth(-0.46, -0.4, y) * smooth(-0.28, -0.33, y);
  h += 0.06 * gauss(x, y + 0.475, 0.17, 0.034);
  h += 0.07 * gauss(x, y + 0.565, 0.15, 0.042);
  h += -0.05 * Math.exp(-sq((y - mouthY(x)) / 0.013)) * (1 - smooth(0.2, 0.27, ax));
  h += 0.016 * gauss(ax - 0.29, y + 0.46, 0.07, 0.055);

  // rãnh dưới môi, cằm tròn đầy, hàm rộng
  h += -0.024 * Math.exp(-sq((y + 0.655) / 0.028)) * (1 - smooth(0.1, 0.22, ax));
  h += 0.05 * gauss(x, y + 0.78, 0.24, 0.13);
  h += 0.04 * gauss(ax - 0.6, y + 0.45, 0.2, 0.25);

  // thái dương hơi lõm
  h += -0.02 * gauss(ax - 0.76, y - 0.25, 0.12, 0.22);
  return h;
}

const jawK = y => smooth(-0.05, -0.95, y);
const skewY = dy => dy >= 0 ? dy * SY : dy * SY_LOW;
/* Toạ độ điểm mặt (x, y) -> hướng đơn vị trên mặt cầu gốc. */
function dirFromFace(x, y) {
  const dy = y >= 0 ? y / SY : y / SY_LOW, dx = x / (SX * (1 - JAW * jawK(dy)));
  return new THREE.Vector3(dx, dy, Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy)));
}
/* Điểm trên bề mặt đầu theo hướng d. */
function headPoint(d, out = new THREE.Vector3()) {
  const j = jawK(d.y);
  let x = d.x * SX * (1 - JAW * j), y = skewY(d.y), z = d.z * SZ;
  const w = smooth(0.02, 0.4, d.z);
  if (w > 0) {
    const h = w * carve(x, y);
    x += d.x * h; y += d.y * h; z += d.z * h;
  }
  return out.set(x, y, z);
}
/* Điểm trên da tại toạ độ mặt (x, y), đẩy ra `lift` theo hướng pháp tuyến gần đúng. */
function facePoint(x, y, lift = 0.004) {
  const d = dirFromFace(x, y).normalize();
  const p = headPoint(d);
  return p.addScaledVector(d, lift);
}

/* ---------------- lưới đầu ---------------- */
const cache = {};
function buildHeadGeometry(N, M) {
  const pos = new Float32Array((N + 1) * (M + 1) * 3), idx = [];
  const d = new THREE.Vector3(), p = new THREE.Vector3();
  let k = 0;
  for (let j = 0; j <= M; j++) {
    const th = j / M * Math.PI, st = Math.sin(th), ct = Math.cos(th);
    for (let i = 0; i <= N; i++) {
      const s = i / N * 2 - 1, ph = Math.PI * (0.5 * s + 0.5 * s * s * s);   // dồn lưới về phía mặt (ph = 0)
      d.set(st * Math.sin(ph), ct, st * Math.cos(ph));
      headPoint(d, p);
      pos[k++] = p.x; pos[k++] = p.y; pos[k++] = p.z;
    }
  }
  for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
    const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, e = c + 1;
    idx.push(a, c, b, b, c, e);
  }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g = mergeVertices(g, 1e-5);
  g.computeVertexNormals();
  return g;
}
function headGeometry(detail) {
  const key = detail === 'hi' ? 'hi' : 'mid';
  if (!cache[key]) cache[key] = key === 'hi' ? buildHeadGeometry(300, 200) : buildHeadGeometry(190, 130);
  return cache[key];
}

/* Đường chân tóc: phần da phía trên đường này được phủ tóc. */
const hairline = d => 0.62 - 0.4 * smooth(0.8, 0.0, d.z) - 0.55 * smooth(0.0, -1.0, d.z);

/* Vỏ tóc mỏng áp lên đầu phía trên đường chân tóc (nền tối dưới ốc phát, hoặc mũ cạo đầu của Địa Tạng). */
function hairShellGeometry(N = 260, M = 170, lift = 0.02) {
  if (cache.shell) return cache.shell;
  const d = new THREE.Vector3(), p = new THREE.Vector3();
  const pos = [], ok = [];
  for (let j = 0; j <= M; j++) {
    const th = j / M * Math.PI * 0.62, st = Math.sin(th), ct = Math.cos(th);
    for (let i = 0; i <= N; i++) {
      const ph = i / N * Math.PI * 2 - Math.PI;
      d.set(st * Math.sin(ph), ct, st * Math.cos(ph));
      headPoint(d, p); p.addScaledVector(d, lift);
      pos.push(p.x, p.y, p.z);
      ok.push(p.y > hairline(d) ? 1 : 0);
    }
  }
  const idx = [];
  for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
    const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, e = c + 1;
    if (ok[a] && ok[b] && ok[c] && ok[e]) idx.push(a, c, b, b, c, e);
  }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g = mergeVertices(g, 1e-5);
  g.computeVertexNormals();
  cache.shell = g;
  return g;
}

/* ---------------- đường nét (mi, mày, miệng) ---------------- */
function lineTube(points, radius, segs = 40) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segs, radius, 6, false);
}
function faceLines() {
  if (cache.lines) return cache.lines;
  const L = {};
  const eye = s => {
    const lash = [];
    for (let i = 0; i <= 14; i++) {
      const u = -1 + i / 7;
      lash.push(facePoint(s * (EYE_CX + EYE_HW * u), eyeSlitY(u), 0.002));
    }
    return [lineTube(lash, 0.009)];
  };
  const brow = s => {
    const pts = [];
    for (let i = 0; i <= 14; i++) { const ax = 0.03 + i / 14 * 0.49; pts.push(facePoint(s * ax, browY(ax) - 0.002, 0.003)); }
    return lineTube(pts, 0.0085, 48);
  };
  L.eyes = [...eye(1), ...eye(-1)];
  L.brows = [brow(1), brow(-1)];
  const mouth = [];
  for (let i = 0; i <= 16; i++) { const x = -0.2 + i / 16 * 0.4; mouth.push(facePoint(x, mouthY(x), 0.002)); }
  L.mouth = [lineTube(mouth, 0.0085)];
  cache.lines = L;
  return L;
}

/* ---------------- tai ---------------- */
function earGeometries() {
  if (cache.ears) return cache.ears;
  const make = s => {
    const parts = [];
    const ear = new THREE.SphereGeometry(1, 18, 14); ear.scale(0.08, 0.25, 0.15); ear.rotateZ(s * 0.12); ear.translate(s * 0.85, 0.0, -0.03);
    parts.push(ear);
    const lobe = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.855, -0.14, -0.01), new THREE.Vector3(s * 0.885, -0.34, 0.01), new THREE.Vector3(s * 0.9, -0.58, 0.03)]), 12, 0.058, 8, false);
    parts.push(lobe);
    const tip = new THREE.SphereGeometry(0.058, 8, 6); tip.translate(s * 0.9, -0.58, 0.03); parts.push(tip);
    return parts;
  };
  cache.ears = [make(1), make(-1)];
  return cache.ears;
}

/* ---------------- ốc phát (tóc xoắn) và nhục kế ---------------- */
function curlGeometry() {
  if (cache.curlGeo) return cache.curlGeo;
  const body = new THREE.SphereGeometry(1, 8, 6);
  const knot = new THREE.ConeGeometry(0.34, 0.55, 6); knot.translate(0, 0.95, 0);       // chóp xoắn nhỏ trên mỗi ốc
  cache.curlGeo = mergeGeometries([body, knot], false);
  return cache.curlGeo;
}
function curlMatrices() {
  if (cache.curls) return cache.curls;
  const list = [], d = new THREE.Vector3(), p = new THREE.Vector3(), n = new THREE.Vector3();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const put = (pt, nrm, r) => { q.setFromUnitVectors(up, nrm); sc.set(r, r * 0.85, r); m.compose(pt, q, sc); list.push(m.clone()); };
  const R = 0.056, STEP = 0.098;
  // trên đầu: các vòng vĩ tuyến phía trên đường chân tóc
  for (let th = 0.05, row = 0; th < 2.3; th += STEP * 0.95, row++) {
    const count = Math.max(1, Math.round(Math.PI * 2 * Math.sin(th) * 1.0 / STEP));
    for (let i = 0; i < count; i++) {
      const ph = (i + (row % 2) * 0.5) / count * Math.PI * 2;
      d.set(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph));
      headPoint(d, p);
      if (p.y < hairline(d) - 0.012) continue;
      n.copy(d); p.addScaledVector(d, 0.03);
      put(p.clone(), n.clone(), R);
    }
  }
  // nhục kế: vòm tóc nhô lên trên đỉnh đầu
  const DOME = { cx: 0, cy: 1.0, cz: -0.04, rx: 0.56, ry: 0.5, rz: 0.6 };
  for (let th = 0.0, row = 0; th < 1.75; th += STEP * 0.95, row++) {
    const count = th < 0.01 ? 1 : Math.max(1, Math.round(Math.PI * 2 * Math.sin(th) * 0.58 / STEP));
    for (let i = 0; i < count; i++) {
      const ph = (i + 0.5 * (row % 2)) / count * Math.PI * 2;
      d.set(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph));
      p.set(DOME.cx + d.x * DOME.rx, DOME.cy + d.y * DOME.ry, DOME.cz + d.z * DOME.rz);
      n.set(d.x / DOME.rx, d.y / DOME.ry, d.z / DOME.rz).normalize();
      p.addScaledVector(n, 0.025);
      put(p.clone(), n.clone(), R);
    }
  }
  cache.curls = { list, dome: DOME };
  return cache.curls;
}

/* ---------------- lắp ráp ---------------- */
/* Tham số:
 *   skin   vật liệu da/đá (bắt buộc)
 *   line   vật liệu cho nét mi/mày/miệng
 *   hair   vật liệu tóc (xanh thẫm) cho ốc phát hoặc mũ cạo đầu
 *   curls  true: có ốc phát + nhục kế (Phật Thích Ca)
 *   cap    true: vỏ tóc mỏng ôm đầu phía trên chân tóc (Bồ Tát Địa Tạng)
 *   jewel  vật liệu cho ngọc/chóp nhục kế (chỉ khi curls)
 *   urna   vật liệu cho bạch hào giữa trán (đặt nếu muốn có)
 *   detail 'hi' cho tượng lớn, 'mid' cho tượng nhỏ trên bàn thờ
 */
export function makeBuddhaHead({ skin, line, hair = null, curls = false, cap = false, jewel = null, urna = null, detail = 'mid' }) {
  const g = new THREE.Group();
  const add = (geo, m, shadow = false) => { const me = new THREE.Mesh(geo, m); me.castShadow = shadow; me.receiveShadow = true; g.add(me); return me; };

  add(headGeometry(detail), skin, true);
  const L = faceLines();
  for (const geo of [...L.eyes, ...L.brows, ...L.mouth]) add(geo, line);
  for (const parts of earGeometries()) for (const geo of parts) add(geo, skin);

  if (urna) {
    const u = add(new THREE.SphereGeometry(0.036, 12, 10), urna);
    u.position.copy(facePoint(0, 0.46, 0.012));
  }
  if ((cap || curls) && hair) add(hairShellGeometry(), hair);
  if (curls && hair) {
    const { list, dome } = curlMatrices();
    const inst = new THREE.InstancedMesh(curlGeometry(), hair, list.length);
    list.forEach((mat, i) => inst.setMatrixAt(i, mat));
    inst.castShadow = false; inst.receiveShadow = true; inst.frustumCulled = false;
    inst.userData.dynamic = true;                 // bake() bỏ qua, giữ nguyên dạng instanced
    g.add(inst);
    const domeMesh = add(new THREE.SphereGeometry(1, 28, 20), hair);          // lớp nền dưới ốc phát để không lộ khe
    domeMesh.scale.set(dome.rx * 0.98, dome.ry * 0.98, dome.rz * 0.98); domeMesh.position.set(dome.cx, dome.cy, dome.cz);
    if (jewel) {
      const j = add(new THREE.SphereGeometry(0.1, 14, 10), jewel); j.position.set(0, dome.cy + dome.ry + 0.1, dome.cz);
      const flame = add(new THREE.ConeGeometry(0.06, 0.2, 10), jewel); flame.position.set(0, dome.cy + dome.ry + 0.26, dome.cz);
    }
  }
  return g;
}
