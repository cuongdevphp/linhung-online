import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ====================== TOÁN ====================== */
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerpAngle = (a, b, t) => {
  const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * t;
};

/* Random có seed (mulberry32): mọi người chơi thấy cùng một bố cục cây, đá… */
export function rng(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix, iy, seed) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/* Nhiễu giá trị 2D trong [0,1]. */
export function vnoise(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
export function fbm(x, y, oct = 4, seed = 0) {
  let s = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, y * f, seed + i * 17); f *= 2; amp *= 0.5; }
  return s / (1 - Math.pow(0.5, oct));
}

/* ====================== VẬT LIỆU & MESH ====================== */
let ROOT = null;
export const setRoot = r => { ROOT = r; };

const matCache = new Map();
export function mat(key, color, o = {}) {
  let m = matCache.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o }); matCache.set(key, m); }
  return m;
}

export function mesh(geo, material, x = 0, y = 0, z = 0, parent = ROOT, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
export const box = (w, h, d, m, x, y, z, p, s) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, p, s);
export const cyl = (rt, rb, h, m, x, y, z, p, seg = 16, s) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, p, s);
export const sph = (r, m, x, y, z, p, s = true, ws = 16, hs = 12) => mesh(new THREE.SphereGeometry(r, ws, hs), m, x, y, z, p, s);

/* Đặt một mesh đơn vị (cao 1 theo +Y) nằm giữa hai điểm a và b. */
const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
export function span(m, a, b) {
  m.position.copy(a).add(b).multiplyScalar(0.5);
  _d.copy(b).sub(a);
  const len = _d.length();
  m.scale.y = len;
  m.quaternion.setFromUnitVectors(_up, len > 1e-6 ? _d.divideScalar(len) : _up);
}

/* ====================== TEXTURE ====================== */
export function canvasTex(w, h, draw, repeat = [1, 1], srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function softDot(color, size = 64) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export const SERIF = '"Playfair Display", Georgia, "Times New Roman", serif';
export const SANS = '"Be Vietnam Pro", "Segoe UI", system-ui, sans-serif';

/* Bảng hiệu chữ vàng trên nền đỏ (hoành phi, biển cổng…). */
export function textPlate(text, w, h, x, y, z, parent, ry = 0, opts = {}) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w);
  const g = c.getContext('2d');
  g.fillStyle = opts.bg || '#6e140c'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = opts.fg || '#e8b65a'; g.lineWidth = 14; g.strokeRect(12, 12, c.width - 24, c.height - 24);
  g.lineWidth = 4; g.strokeRect(30, 30, c.width - 60, c.height - 60);
  g.fillStyle = opts.text || '#ffd77a';
  let size = Math.round(c.height * (opts.size || 0.46));
  g.font = `700 ${size}px ${SERIF}`;
  const maxW = c.width - 110;
  while (g.measureText(text).width > maxW && size > 14) { size -= 2; g.font = `700 ${size}px ${SERIF}`; }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height * 0.54);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.3, roughness: 0.5 }));
  m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

/* Nhãn tên / bóng thoại: sprite luôn quay về phía camera. */
export function makeLabel(text, opts = {}) {
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  const font = `${opts.bubble ? 500 : 600} 34px ${SANS}`;
  g.font = font;
  const w = Math.min(900, Math.ceil(g.measureText(text).width) + 56);
  c.width = w; c.height = 74;
  g.font = font;
  g.fillStyle = opts.bubble ? 'rgba(255,247,230,.95)' : (opts.npc ? 'rgba(60,40,10,.62)' : 'rgba(8,26,33,.74)');
  g.beginPath();
  if (g.roundRect) g.roundRect(2, 2, w - 4, 70, 35);
  else { const x = 2, y = 2, ww = w - 4, hh = 70, r = 35; g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath(); }
  g.fill();
  if (!opts.bubble) { g.strokeStyle = 'rgba(242,196,109,.7)'; g.lineWidth = 3; g.stroke(); }
  g.fillStyle = opts.bubble ? '#3a1d04' : '#ffe6ae';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 39);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(w / 74 * 0.42, 0.42, 1); s.renderOrder = 10;
  s.userData.dispose = () => { t.dispose(); s.material.dispose(); };
  return s;
}

/* ====================== GỘP HÌNH HỌC TĨNH ====================== */
/* UV theo toạ độ thế giới (mật độ texel đồng đều trên mọi bề mặt dùng cùng vật liệu). */
function applyWorldUV(g, scale) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (az >= ax) { u = p.getX(i); v = p.getY(i); }
    else { u = p.getZ(i); v = p.getY(i); }
    uv.setXY(i, u * scale, v * scale);
  }
  uv.needsUpdate = true;
}

function collectStatic(o, list) {
  if (o.userData.dynamic) return;
  if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.geometry && !Array.isArray(o.material)) list.push(o);
  for (const c of o.children) collectStatic(c, list);
}

/* Gộp mọi mesh tĩnh dưới `root` theo (vật liệu, đổ bóng). Nhóm có userData.dynamic được bỏ qua.
 * `root` phải có biến đổi đơn vị (thường là scene). */
export function bake(root) {
  root.updateMatrixWorld(true);
  const list = []; collectStatic(root, list);
  const buckets = new Map();
  for (const o of list) {
    const key = o.material.uuid + (o.castShadow ? 'c' : 'n') + (o.receiveShadow ? 'r' : 'n');
    let b = buckets.get(key);
    if (!b) { b = { material: o.material, cast: o.castShadow, receive: o.receiveShadow, geos: [] }; buckets.set(key, b); }
    let g = o.geometry.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv' && !(name === 'color' && o.material.vertexColors)) g.deleteAttribute(name);
    }
    g.groups = [];
    g.applyMatrix4(o.matrixWorld);
    if (o.material.userData.worldUV) applyWorldUV(g, o.material.userData.worldUV);
    b.geos.push(g);
    o.parent.remove(o);
  }
  let merged = 0;
  for (const b of buckets.values()) {
    const anyIndexed = b.geos.some(g => g.index), anyFlat = b.geos.some(g => !g.index);
    const geos = anyIndexed && anyFlat ? b.geos.map(g => g.index ? g.toNonIndexed() : g) : b.geos;
    // mergeGeometries trả về null nếu tập thuộc tính không khớp; khi đó giữ nguyên từng mesh
    const g = mergeGeometries(geos, false);
    const parts = g ? [g] : geos;   // nếu không gộp được thì giữ từng mảnh (đã ở toạ độ thế giới)
    if (!g) console.warn('bake: không gộp được một nhóm vật liệu, giữ nguyên từng mảnh');
    for (const part of parts) {
      const m = new THREE.Mesh(part, b.material);
      m.castShadow = b.cast; m.receiveShadow = b.receive;
      m.matrixAutoUpdate = false;
      root.add(m); merged++;
    }
  }
  return { meshes: list.length, merged };
}
