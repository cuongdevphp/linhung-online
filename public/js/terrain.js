import * as THREE from 'three';
import { UP } from '/shared/layout.js';
import { stairDistance, RAMP_K, START, PLAZA } from '/shared/stairs.js';
import { clamp, lerp, smoothstep, fbm, rng, softDot } from './util.js';

/* Địa hình quanh chùa: núi Sơn Trà ở phía bắc/tây, vách đá xuống biển ở phía nam/đông,
   bề mặt phẳng ở đúng cao độ các sân chùa bên trong "dấu chân" công trình. */

export const SEA_Y = -25;
const SEA_FLOOR = -32;

/* Hai hình chữ nhật mà địa hình được ép phẳng bên dưới sàn chùa. */
const FP_LOWER = { x1: -41.5, x2: 93.5, z1: -0.5, z2: 60, base: -0.45 };
const FP_UPPER = { x1: -40.5, x2: 40.5, z1: -76.5, z2: 0.5, base: UP - 0.45 };

function rectSDF(x, z, r) {
  const cx = (r.x1 + r.x2) / 2, cz = (r.z1 + r.z2) / 2, hx = (r.x2 - r.x1) / 2, hz = (r.z2 - r.z1) / 2;
  const dx = Math.abs(x - cx) - hx, dz = Math.abs(z - cz) - hz;
  return Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dz), 0);
}

function outerHeight(x, z) {
  const north = clamp((8 - z) / 300, 0, 1.3);
  const west = clamp((-30 - x) / 300, 0, 1.3);
  const t = Math.min(1.2, Math.max(north, west * 0.9));
  const n = fbm(x * 0.012, z * 0.012, 4, 3);
  const n2 = fbm(x * 0.05, z * 0.05, 3, 9);
  let h = 235 * Math.pow(t, 1.8) * (0.7 + 0.6 * n) + 7 * n2 * Math.min(1, t * 6);
  h += 4 * (fbm(x * 0.03, z * 0.03, 3, 5) - 0.5);
  h = Math.max(h, 0);
  const coast = Math.max(smoothstep(58, 72, z), smoothstep(94, 108, x));
  return lerp(h, SEA_FLOOR, coast);
}

/* Phần gồ ghề nhỏ của sườn núi (bỏ phần núi lớn), giữ lại khi vuốt sườn thành mặt dốc đều dưới Đường Mây. */
function reliefOf(x, z) {
  const north = clamp((8 - z) / 300, 0, 1.3), west = clamp((-30 - x) / 300, 0, 1.3);
  const t = Math.min(1.2, Math.max(north, west * 0.9));
  return 7 * fbm(x * 0.05, z * 0.05, 3, 9) * Math.min(1, t * 6) + 4 * (fbm(x * 0.03, z * 0.03, 3, 5) - 0.5);
}

/* Địa hình quanh Đường Mây (1.080 bậc): trong khoảng 24 m quanh đường, sườn núi được vuốt thành một mặt dốc đều
 * (dốc RAMP_K) để các chặng chữ chi nằm trên sườn, ngoài 80 m trả về núi gốc; sát bậc thang thì san phẳng thành dải đường. */
function pilgrimHeight(x, z, outer) {
  const sd = stairDistance(x, z);
  /* Chóp núi: quanh sân đỉnh, núi hạ dần ra xa (dốc 0,35) để sân nằm trên đỉnh chứ không bị đồi cao hơn bao quanh.
   * Ảnh hưởng nhạt dần và hết hẳn ở khoảng 220 m tính từ mép sân. */
  const dP = Math.max(0, Math.hypot(x - PLAZA.x, z - PLAZA.z) - PLAZA.r);
  const peakCap = PLAZA.h - 0.5 - 0.35 * Math.max(0, dP - 6), wCap = 1 - smoothstep(40, 220, dP);
  const capped = h => lerp(h, Math.min(h, peakCap), wCap);
  if (sd.d > 80) return capped(outer);
  const plane = FP_UPPER.base + RAMP_K * Math.max(0, START.z - z) + 0.3 * reliefOf(x, z);
  let h = capped(lerp(outer, plane, 1 - smoothstep(24, 80, sd.d)));
  h = lerp(h, sd.h - 0.5, 1 - smoothstep(0.8, 9, sd.d));
  return h;
}

export function terrainHeight(x, z) {
  const dl = rectSDF(x, z, FP_LOWER), du = rectSDF(x, z, FP_UPPER);
  const d = Math.min(dl, du), base = dl <= du ? FP_LOWER.base : FP_UPPER.base;
  const w = 1 - smoothstep(0, 26, d);
  return lerp(pilgrimHeight(x, z, outerHeight(x, z)), base, w);
}

/* Có nằm trong khuôn viên chùa (cộng lề) không? Dùng để không đặt cây vào sân hay lên Đường Mây. */
export function inCompound(x, z, margin = 0) {
  return Math.min(rectSDF(x, z, FP_LOWER), rectSDF(x, z, FP_UPPER)) < margin || stairDistance(x, z).d < margin + 6;
}

/* ----------------------------------------------------------------- */
function buildGround(scene) {
  const X0 = -450, X1 = 450, Z0 = -640, Z1 = 350, STEP = 4;      // Z0 lùi sâu về phía núi để phủ hết Đường Mây (đỉnh ở z ≈ -405)
  const nx = Math.round((X1 - X0) / STEP), nz = Math.round((Z1 - Z0) / STEP);
  const pos = new Float32Array((nx + 1) * (nz + 1) * 3), col = new Float32Array((nx + 1) * (nz + 1) * 3);
  const idx = new Uint32Array(nx * nz * 6);
  const c = new THREE.Color(), rock = new THREE.Color(0x857f70), rock2 = new THREE.Color(0x5f5c52);
  let p = 0;
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = X0 + i * STEP, z = Z0 + j * STEP, h = terrainHeight(x, z);
    const e = 2;
    const gx = (terrainHeight(x + e, z) - terrainHeight(x - e, z)) / (2 * e);
    const gz = (terrainHeight(x, z + e) - terrainHeight(x, z - e)) / (2 * e);
    const slope = Math.hypot(gx, gz);
    const n = fbm(x * 0.02, z * 0.02, 3, 21);
    // rừng nhiệt đới Sơn Trà: xanh đậm, nhạt dần theo độ cao (sương)
    c.setHSL(0.27 + n * 0.07, 0.42, 0.17 + n * 0.09 + clamp(h / 900, 0, 0.1));
    if (h < SEA_Y + 3) c.lerp(rock2, 0.8);
    c.lerp(rock, smoothstep(0.75, 1.5, slope) * 0.9);
    pos[p] = x; pos[p + 1] = h; pos[p + 2] = z;
    col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
    p += 3;
  }
  let q = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, d = a + nx + 1, e = d + 1;
    idx[q++] = a; idx[q++] = d; idx[q++] = b; idx[q++] = b; idx[q++] = d; idx[q++] = e;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: false }));
  m.receiveShadow = true; m.castShadow = false;
  scene.add(m);
  return m;
}

/* ----------------------------------------------------------------- */
function buildForest(scene) {
  const R = rng(77);
  const N = 1500;
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.42, 4, 6);
  trunkGeo.translate(0, 2, 0);
  const canGeo = new THREE.IcosahedronGeometry(1, 1);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4e3322, roughness: 1 });
  const canMat = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, N);
  const cans = new THREE.InstancedMesh(canGeo, canMat, N);
  const d = new THREE.Object3D(), c = new THREE.Color();
  let i = 0, tries = 0;
  while (i < N && tries++ < N * 12) {
    const x = -330 + R() * 470, z = -520 + R() * 590;
    const dist = Math.hypot(x - 20, z + 10);
    if (R() > 1.15 - dist / 330) continue;           // thưa dần khi ra xa
    if (inCompound(x, z, 9)) continue;
    const h = terrainHeight(x, z);
    if (h < SEA_Y + 8) continue;
    if ((z > 50 || x > 84) && h < 4) continue;          // mép vách đá hướng biển để trống cho tầm nhìn
    const e = 2.5, slope = Math.hypot((terrainHeight(x + e, z) - terrainHeight(x - e, z)) / (2 * e), (terrainHeight(x, z + e) - terrainHeight(x, z - e)) / (2 * e));
    if (slope > 0.8) continue;
    const s = 1.1 + R() * 1.5;
    d.position.set(x, h - 0.3, z); d.scale.set(s, s, s); d.rotation.set(0, R() * 6, 0); d.updateMatrix();
    trunks.setMatrixAt(i, d.matrix);
    d.position.set(x, h + 4.6 * s, z); d.scale.set(2.5 * s, (2.2 + R() * 1.4) * s, 2.5 * s); d.updateMatrix();
    cans.setMatrixAt(i, d.matrix);
    c.setHSL(0.24 + R() * 0.1, 0.45, 0.18 + R() * 0.12); cans.setColorAt(i, c);
    i++;
  }
  trunks.count = cans.count = i;
  trunks.castShadow = cans.castShadow = true;
  trunks.frustumCulled = cans.frustumCulled = false;
  scene.add(trunks, cans);

  // đá tảng dọc vách biển
  const rockGeo = new THREE.IcosahedronGeometry(1, 1);
  const rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x7d786b, flatShading: true, roughness: 1 }), 90);
  let k = 0;
  while (k < 90) {
    const side = R() < 0.6;
    const x = side ? -30 + R() * 130 : 96 + R() * 14, z = side ? 60 + R() * 16 : 0 + R() * 70;
    const h = terrainHeight(x, z);
    const s = 1.2 + R() * 3.2;
    d.position.set(x, h + s * 0.2, z); d.scale.set(s * (0.8 + R() * 0.8), s * (0.6 + R() * 0.6), s * (0.8 + R() * 0.8));
    d.rotation.set(R() * 3, R() * 6, R() * 3); d.updateMatrix(); rocks.setMatrixAt(k++, d.matrix);
  }
  rocks.castShadow = true; scene.add(rocks);
}

/* ----------------------------------------------------------------- */
function makeWaterNormal() {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'), img = g.createImageData(S, S), R = rng(5);
  // nhiều sóng tần số và hướng khác nhau để hoa văn không lộ chu kỳ lặp
  const waves = Array.from({ length: 34 }, (_, i) => {
    const f = 1 + (i % 6) * 1.3, a = R() * Math.PI * 2;
    return [Math.round(Math.cos(a) * f * 2), Math.round(Math.sin(a) * f * 2) || 1, 0.18 + R() * 0.55 / (1 + f * 0.25), R() * 6.28];
  });
  const Hf = (x, y) => waves.reduce((h, [fx, fy, a, ph]) => h + a * Math.sin(2 * Math.PI * (fx * x + fy * y) / S + ph), 0);
  const n = new THREE.Vector3();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = Hf(x + 1, y) - Hf(x - 1, y), dy = Hf(x, y + 1) - Hf(x, y - 1);
    n.set(-dx * 3, -dy * 3, 1).normalize();
    const i = (y * S + x) * 4;
    img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255; img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(110, 110); t.anisotropy = 8;
  return t;
}

function buildSea(scene) {
  const normal = makeWaterNormal();
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(2800, 2800),
    new THREE.MeshStandardMaterial({ color: 0x1f6577, roughness: 0.07, metalness: 0.55, normalMap: normal, normalScale: new THREE.Vector2(0.35, 0.35) })
  );
  m.rotation.x = -Math.PI / 2; m.position.set(150, SEA_Y, 300); m.receiveShadow = false;
  scene.add(m);
  return { mesh: m, normal };
}

/* ----------------------------------------------------------------- */
/* Phông xa: mọi vật liệu fog:false, tự pha màu sương mù để có chiều sâu không khí. */
function buildBackdrop(scene) {
  const R = rng(404);
  const group = new THREE.Group(); scene.add(group);
  const mats = [];
  const silMat = () => { const m = new THREE.MeshBasicMaterial({ color: 0x5b7388, fog: false, transparent: true, depthWrite: true }); mats.push(m); return m; };

  // dãy núi (Hải Vân ở phía tây, Ngũ Hành Sơn phía nam), đảo Cù Lao Chàm phía đông nam
  const ridge = (cx, cz, len, ang, hMax, count, mat) => {
    for (let i = 0; i < count; i++) {
      const u = (i / (count - 1) - 0.5) * len;
      const x = cx + Math.cos(ang) * u + (R() - 0.5) * 30, z = cz + Math.sin(ang) * u + (R() - 0.5) * 30;
      const h = hMax * (0.45 + 0.55 * Math.sin((i / (count - 1)) * Math.PI)) * (0.7 + R() * 0.5);
      const g = new THREE.ConeGeometry(70 + R() * 70, h, 7, 1); g.translate(0, h / 2, 0);
      const m = new THREE.Mesh(g, mat); m.position.set(x, SEA_Y - 2, z); m.rotation.y = R() * 6; m.frustumCulled = false; group.add(m);
    }
  };
  ridge(-900, 150, 900, Math.PI * 0.45, 230, 14, silMat());     // Hải Vân, phía tây
  ridge(60, 1020, 260, 0, 70, 5, silMat());                      // Ngũ Hành Sơn, phía nam
  ridge(760, 640, 160, 0.6, 38, 4, silMat());                    // Cù Lao Chàm, đông nam

  // thành phố Đà Nẵng bên kia vịnh (tây nam): khối nhà + điểm sáng cửa sổ + dải đèn ven biển
  const bm = new THREE.MeshBasicMaterial({ color: 0x4d6074, fog: false, transparent: true }); mats.push(bm);
  const cityGroup = new THREE.Group(); cityGroup.position.set(-260, SEA_Y, 880); group.add(cityGroup);
  const boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bm, 150);
  const dm = new THREE.Object3D();
  const lights = [];
  for (let i = 0; i < 150; i++) {
    const u = (R() - 0.5) * 520, w = 8 + R() * 18, tall = R() < 0.14;
    const h = tall ? 70 + R() * 90 : 14 + R() * 38;
    dm.position.set(u, h / 2, (R() - 0.5) * 60); dm.scale.set(w, h, w * (0.7 + R() * 0.6)); dm.updateMatrix();
    boxes.setMatrixAt(i, dm.matrix);
    const n = tall ? 14 : 4;
    for (let k = 0; k < n; k++) lights.push(u + (R() - 0.5) * w, 3 + R() * (h - 4), dm.position.z + dm.scale.z / 2 * 0.98);
  }
  boxes.frustumCulled = false; cityGroup.add(boxes);
  // dải đèn đường ven biển (như "vệt sao băng" nhìn từ chùa) và cầu Rồng phát sáng
  for (let i = 0; i < 90; i++) { const u = -300 + i * 7; lights.push(u + 40, 1.5, 38 + Math.sin(i * 0.2) * 6); }
  for (let i = 0; i <= 28; i++) { const a = i / 28; lights.push(-60 + a * 90, 3 + Math.sin(a * Math.PI) * 20, 22); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lights, 3));
  const lightMat = new THREE.PointsMaterial({ size: 3.2, map: softDot('rgba(255,225,150,1)'), color: 0xffd9a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const pts = new THREE.Points(lg, lightMat); pts.frustumCulled = false; cityGroup.add(pts);

  const hazeDark = new THREE.Color(0x35506a), tmp = new THREE.Color();
  return {
    update(env) {
      const vis = clamp(1 - env.mist * 0.92 - env.rain * 0.5, 0.04, 1);
      tmp.copy(env.fog).lerp(hazeDark, 0.5 * (1 - env.night * 0.6));
      for (const m of mats) { m.color.copy(tmp); m.opacity = vis; }
      lightMat.opacity = clamp(env.night * 1.1 - 0.15, 0, 1) * vis;
    }
  };
}

export function buildTerrain(scene) {
  const ground = buildGround(scene);
  buildForest(scene);
  const sea = buildSea(scene);
  const backdrop = buildBackdrop(scene);
  const base = new THREE.Color(0x1f6577), tint = new THREE.Color();
  return {
    ground, sea: sea.mesh,
    update(dt, env) {
      backdrop.update(env);
      sea.normal.offset.x += dt * (0.004 + env.wind * 0.006);
      sea.normal.offset.y += dt * 0.003;
      const ns = 0.3 + env.rain * 0.5 + env.wind * 0.15;
      sea.mesh.material.normalScale.set(ns, ns);
      tint.copy(base).lerp(env.fog, clamp(env.rain * 0.4 + env.storm * 0.2 + env.mist * 0.3, 0, 0.7));
      sea.mesh.material.color.copy(tint);
      if (env.night > 0.5) sea.mesh.material.color.multiplyScalar(1 - (env.night - 0.5) * 0.7);
    }
  };
}
