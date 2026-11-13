import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { span, clamp } from './util.js';

/* =====================================================================
   NHÂN VẬT DỄ THƯƠNG (nam / nữ) — phong cách chibi: đầu to, mắt to có điểm sáng, má hồng, miệng cười.
     Nữ:  áo dài cách điệu (tà trước và sau đung đưa khi bước) mặc với quần trắng, giày búp bê, tóc dài / hai búi / đuôi ngựa / tóc ngắn
          kèm nơ hoặc hoa cài tóc.
     Nam: áo cổ trụ cài cúc, tay áo ngắn lộ cẳng tay, quần dài có gấu, giày vải; tóc ngắn có mái hoặc dựng.
   Bộ xương dùng chung với human.js (cùng API, cùng kích thước vai/tay), nên mọi hoạt cảnh (chắp tay, ngồi thiền, nấu ăn, lễ Phật…) chạy như cũ.
   Hệ toạ độ: gốc `root` ở mặt đất, mặt quay về +z; `upper` có gốc tại hông; vai ở (±0.19, 0.49, 0); chân cổ ở (0, 0.55, 0).
   ===================================================================== */

export const SKIN_TONES = [0xf7d6bd, 0xf1c6a4, 0xe8b690, 0xd9a07a];
export const HAIR_COLORS = [0x1a1411, 0x2e1c14, 0x4a2f20, 0x6b4630];
export const HAIR_STYLES = { male: ['short', 'spiky'], female: ['long', 'twin', 'pony', 'bob'] };
const TROUSERS = [0x3b4a63, 0x4b3a2e, 0xefe3c8, 0x2f3b34];

const cache = new Map();
const std = (key, color, o = {}) => {
  let m = cache.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o }); cache.set(key, m); }
  return m;
};
const IRIS = std('cIris', 0x2a1912, { roughness: 0.18, metalness: 0.1 });
const HILITE = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
const LASH = std('cLash', 0x1a0f0b, { roughness: 0.6 });
const MOUTH = std('cMouth', 0xb5493f, { roughness: 0.5 });
const BLUSH = new THREE.MeshStandardMaterial({ color: 0xff8fa3, roughness: 0.9, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
const WHITE = std('cWhite', 0xfbf6ea, { roughness: 0.6 });
const GOLD = std('cGold', 0xe2b04a, { roughness: 0.35, metalness: 0.6 });
const PANT_F = std('cPantF', 0xf7efe0, { roughness: 0.8 });

const skinMat = i => std('cSkin' + (i & 3), SKIN_TONES[i & 3], { roughness: 0.55 });
const hairMat = i => std('cHair' + (i & 3), HAIR_COLORS[i & 3], { roughness: 0.42 });
const clothMat = (key, color, o = {}) => std('cCloth' + key + color, color, { roughness: 0.8, ...o });

/* ---------- hình học ---------- */
const sph = (r, sx, sy, sz, x, y, z, ws = 14, hs = 10) => { const g = new THREE.SphereGeometry(r, ws, hs); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const caps = (r, len, rx, rz, x, y, z) => { const g = new THREE.CapsuleGeometry(r, len, 4, 8); g.rotateX(rx); g.rotateZ(rz); g.translate(x, y, z); return g; };
const merge = list => mergeGeometries(list.map(g => (g.index ? g.toNonIndexed() : g)), false);
const hairCap = (r = 0.116, k = 0.58) => { const g = new THREE.SphereGeometry(r, 28, 16, 0, Math.PI * 2, 0, Math.PI * k); g.scale(0.97, 1.06, 1.02); g.rotateX(-0.3); g.translate(0, 0.008, -0.012); return g; };
const bangsRow = (n, wide) => Array.from({ length: n }, (_, i) => { const t = n === 1 ? 0 : i / (n - 1) * 2 - 1; return sph(0.03, wide, 0.8, 0.72, t * 0.066, 0.066 - Math.abs(t) * 0.014, 0.09 - Math.abs(t) * 0.014); });

const G = {};
function build() {
  if (G.ready) return;
  G.ready = true;
  // đầu tròn đầy, cằm nhỏ, tai bé, mũi nhỏ xíu, cổ
  G.head = merge([
    sph(0.108, 0.97, 1.03, 0.95, 0, 0, 0, 32, 22),
    sph(0.075, 0.86, 0.72, 0.9, 0, -0.048, 0.018, 22, 14),
    sph(0.028, 0.4, 0.75, 0.55, 0.098, -0.004, -0.004), sph(0.028, 0.4, 0.75, 0.55, -0.098, -0.004, -0.004),
    sph(0.0085, 0.9, 0.8, 1.1, 0, -0.016, 0.1),
    (() => { const c = new THREE.CylinderGeometry(0.042, 0.048, 0.14, 12); c.translate(0, -0.125, 0); return c; })()
  ]);
  // mắt to: tròng đen, hai điểm sáng
  const eyeAt = s => [sph(0.0285, 0.8, 1.1, 0.5, s * 0.044, -0.002, 0.0935, 16, 14)];
  G.iris = merge([...eyeAt(1), ...eyeAt(-1)]);
  G.hl = merge([1, -1].flatMap(s => [sph(0.0098, 1, 1, 0.6, s * 0.044 + 0.0085, 0.012, 0.0985, 8, 6), sph(0.0046, 1, 1, 0.6, s * 0.044 - 0.0095, -0.014, 0.0985, 6, 5)]));
  G.blush = merge([1, -1].map(s => sph(0.019, 1.4, 0.75, 0.3, s * 0.064, -0.026, 0.078, 10, 8)));
  G.mouth = (() => { const g = new THREE.TorusGeometry(0.0155, 0.0036, 6, 14, Math.PI); g.rotateZ(Math.PI); g.scale(1, 0.75, 0.6); g.translate(0, -0.047, 0.0865); return g; })();
  G.lashF = merge([1, -1].map(s => caps(0.0042, 0.046, 0, Math.PI / 2 + s * 0.2, s * 0.046, 0.032, 0.0955)));
  G.lashM = merge([1, -1].map(s => caps(0.0028, 0.036, 0, Math.PI / 2 + s * 0.1, s * 0.046, 0.03, 0.0955)));
  G.browF = merge([1, -1].map(s => caps(0.003, 0.034, 0, Math.PI / 2 + s * 0.22, s * 0.046, 0.058, 0.09)));
  G.browM = merge([1, -1].map(s => caps(0.0042, 0.04, 0, Math.PI / 2 + s * 0.06, s * 0.046, 0.054, 0.0905)));

  // tay
  G.upperArm = new THREE.CylinderGeometry(0.046, 0.054, 1, 10);
  G.foreArmF = new THREE.CylinderGeometry(0.044, 0.053, 1, 10);       // đầu trên = cổ tay: tay áo dài ôm
  G.foreArmM = new THREE.CylinderGeometry(0.043, 0.05, 1, 10);        // cẳng tay trần
  G.elbow = new THREE.SphereGeometry(0.056, 10, 8);
  G.hand = new THREE.SphereGeometry(0.039, 12, 10);
  // thân
  const L = pts => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 24);
  G.torsoF = L([[0.15, -0.05], [0.146, 0.06], [0.126, 0.2], [0.14, 0.34], [0.168, 0.45], [0.14, 0.52], [0.055, 0.56], [0.048, 0.575]]); G.torsoF.scale(1, 1, 0.74);
  G.torsoM = L([[0.17, -0.05], [0.17, 0.06], [0.16, 0.22], [0.17, 0.36], [0.2, 0.47], [0.16, 0.53], [0.062, 0.563], [0.052, 0.575]]); G.torsoM.scale(1, 1, 0.74);
  G.collar = new THREE.CylinderGeometry(0.054, 0.062, 0.045, 16, 1, true);
  G.button = new THREE.SphereGeometry(0.0095, 8, 6);
  G.sash = (() => { const g = new THREE.TorusGeometry(0.136, 0.016, 8, 28); g.rotateX(Math.PI / 2); g.scale(1, 1, 0.76); return g; })();
  G.bowKnot = new THREE.SphereGeometry(0.02, 8, 6);
  G.bowLoop = (() => { const g = new THREE.ConeGeometry(0.036, 0.085, 8); g.rotateZ(Math.PI / 2); return g; })();
  // váy áo dài cách tân: xòe nhẹ tới gối, viền gấu
  G.dress = (() => { const g = L([[0.13, 0.06], [0.158, -0.02], [0.2, -0.2], [0.248, -0.38], [0.275, -0.5]]); g.scale(1, 1, 0.9); return g; })();
  G.hem = (() => { const g = new THREE.TorusGeometry(0.275, 0.013, 6, 36); g.rotateX(Math.PI / 2); g.scale(1, 1, 0.9); g.translate(0, -0.5, 0); return g; })();
  // chân, giày
  G.legF = (() => { const c = new THREE.CylinderGeometry(0.055, 0.047, 0.8, 10); c.translate(0, -0.4, 0); return c; })();
  G.legM = (() => { const c = new THREE.CylinderGeometry(0.06, 0.052, 0.8, 10); c.translate(0, -0.4, 0); return c; })();
  G.cuff = new THREE.CylinderGeometry(0.056, 0.056, 0.05, 10);
  G.shoe = merge([sph(0.05, 1.0, 0.72, 1.55, 0, 0, 0.045, 12, 8)]);
  G.sock = new THREE.CylinderGeometry(0.044, 0.046, 0.07, 10);
  G.seatLap = new THREE.SphereGeometry(1, 20, 12);
}

/* tóc theo kiểu; trả về hình học đã gộp (dùng chung giữa các nhân vật cùng kiểu) */
function hairGeo(style) {
  const key = 'hair:' + style;
  if (G[key]) return G[key];
  const parts = [hairCap()];
  if (style === 'short') {
    parts.push(...bangsRow(5, 1.35));
    for (const s of [1, -1]) parts.push(sph(0.036, 0.7, 1.3, 0.9, s * 0.098, 0.016, 0.0, 10, 8));
    parts.push(caps(0.0045, 0.04, 0.3, -0.5, 0.012, 0.135, 0.04));                                 // sợi tóc ahoge ngộ nghĩnh
  } else if (style === 'spiky') {
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2, r = i === 0 ? 0 : 0.07, c = new THREE.ConeGeometry(0.026, 0.075, 6);
      c.rotateZ(-Math.cos(a) * 0.5); c.rotateX(Math.sin(a) * 0.5); c.translate(Math.cos(a) * r, 0.118, Math.sin(a) * r * 0.9 - 0.005); parts.push(c);
    }
    parts.push(...bangsRow(5, 1.2));
    for (const s of [1, -1]) parts.push(sph(0.034, 0.7, 1.3, 0.9, s * 0.098, 0.012, 0.0, 10, 8));
  } else {
    parts.push(...bangsRow(7, 1.5));                                                              // mái ngang dễ thương
    for (const s of [1, -1]) parts.push(caps(0.017, style === 'bob' ? 0.07 : 0.12, 0.08, s * 0.05, s * 0.102, style === 'bob' ? -0.03 : -0.05, 0.012));
    if (style === 'long') {
      parts.push(sph(0.1, 1.02, 2.3, 0.8, 0, -0.125, -0.075, 20, 14), sph(0.06, 1.35, 0.7, 0.8, 0, -0.34, -0.085, 12, 8));
    } else if (style === 'bob') {
      parts.push(sph(0.1, 1.08, 0.9, 0.92, 0, -0.035, -0.035, 20, 14));
    } else if (style === 'twin') {
      for (const s of [1, -1]) parts.push(sph(0.05, 1, 1, 1, s * 0.082, 0.112, -0.005, 14, 10), sph(0.028, 1, 1, 1, s * 0.098, 0.074, 0.0, 8, 6));
    } else if (style === 'pony') {
      const pts = [[0, 0.055, -0.112, 0.034], [0, 0.015, -0.14, 0.034], [0, -0.04, -0.168, 0.031], [0, -0.1, -0.178, 0.027], [0, -0.16, -0.17, 0.022], [0, -0.21, -0.158, 0.017]];
      for (const [x, y, z, r] of pts) parts.push(sph(r, 1, 1.15, 1, x, y, z, 10, 8));
    }
  }
  G[key] = merge(parts);
  return G[key];
}

const _D = new THREE.Vector3(), _P = new THREE.Vector3(), _E = new THREE.Vector3(), _W = new THREE.Vector3(), _F = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const A1 = 0.29, A2 = 0.27;

/* o: { gender: 'male'|'female', robe (màu áo), skinTone 0..3, hairStyle, hairColor 0..3, accessory ('bow'|'flower'|null), trousers 0..3, seed } */
export function makeCuteHuman(o = {}) {
  build();
  const female = o.gender === 'female';
  const seed = Math.random() * 100;
  const skin = skinMat(o.skinTone ?? 0);
  const topColor = new THREE.Color(o.robe || '#c9772b');
  const top = clothMat('top', topColor.getHex(), { roughness: 0.78 });
  const trim = clothMat('trim', topColor.clone().lerp(new THREE.Color(0xffffff), 0.6).getHex());
  const trimDark = clothMat('trimD', topColor.clone().multiplyScalar(0.72).getHex());
  const trousersMat = female ? PANT_F : clothMat('pants', TROUSERS[(o.trousers ?? 0) & 3]);
  const shoeMat = female ? clothMat('shoeF', 0xd35a6c) : clothMat('shoeM', 0x5a3b27);
  const hair = hairMat(o.hairColor ?? 0);
  const style = o.hairStyle || HAIR_STYLES[female ? 'female' : 'male'][0];
  const hipY = 0.86;

  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const add = (parent, g, m, x = 0, y = 0, z = 0, shadow = true) => {
    const me = new THREE.Mesh(g, m); me.position.set(x, y, z); me.castShadow = shadow; me.receiveShadow = true; parent.add(me); return me;
  };

  /* ---- chân và giày (xoay quanh hông khi bước) ---- */
  const legs = [], feet = [];
  for (const s of [1, -1]) {
    const leg = new THREE.Group(); leg.position.set(s * 0.085, hipY, 0); body.add(leg);
    add(leg, female ? G.legF : G.legM, trousersMat);
    if (!female) add(leg, G.cuff, trousersMat, 0, -0.77, 0);
    const foot = new THREE.Group(); foot.position.set(0, -0.82, 0); leg.add(foot);
    if (female) add(foot, G.sock, WHITE, 0, 0.04, 0);
    add(foot, G.shoe, shoeMat, 0, 0.0, 0);
    legs.push(leg); feet.push(foot);
  }

  /* ---- váy áo dài (nữ): xòe tới gối, đung đưa khi bước ---- */
  let skirt = null;
  if (female) {
    skirt = new THREE.Group(); skirt.position.y = hipY; body.add(skirt);
    const dressMat = clothMat('dress', topColor.getHex(), { roughness: 0.75, side: THREE.DoubleSide });
    add(skirt, G.dress, dressMat, 0, 0, 0);
    add(skirt, G.hem, trimDark, 0, 0, 0, false);
  }

  /* ---- ngồi xếp bằng ---- */
  const seat = new THREE.Group(); seat.visible = false; body.add(seat);
  {
    const lapMat = female ? top : trousersMat;
    const lap = add(seat, G.seatLap, lapMat, 0, 0.14, 0.02); lap.scale.set(0.4, 0.15, 0.32);
    for (const s of [-1, 1]) { const k = add(seat, G.seatLap, lapMat, s * 0.29, 0.12, 0.2); k.scale.set(0.14, 0.1, 0.15); }
    for (const s of [-1, 1]) { const f = add(seat, G.shoe, shoeMat, s * 0.1, 0.07, 0.34); f.scale.setScalar(0.9); }
  }

  /* ---- thân trên ---- */
  const upper = new THREE.Group(); upper.position.y = hipY; body.add(upper);
  add(upper, female ? G.torsoF : G.torsoM, top);
  add(upper, G.collar, trim, 0, 0.568, 0.0).scale.set(1, 1, 0.78);
  if (female) {
    add(upper, G.sash, trimDark, 0, 0.17, 0);                                          // thắt lưng và nơ sau lưng
    add(upper, G.bowKnot, trimDark, 0, 0.17, -0.098);
    for (const s of [1, -1]) { const loop = add(upper, G.bowLoop, trimDark, s * 0.045, 0.17, -0.1); loop.rotation.y = s > 0 ? 0 : Math.PI; loop.scale.set(1, 1, 0.6); }
    for (let i = 0; i < 3; i++) add(upper, G.button, GOLD, 0.045 + i * 0.03, 0.5 - i * 0.07, 0.118 - i * 0.004, false);   // khuy cài chéo
  } else {
    for (let i = 0; i < 4; i++) add(upper, G.button, WHITE, 0, 0.5 - i * 0.1, 0.124 - i * 0.002, false);                // hàng cúc áo
  }

  /* ---- đầu ---- */
  const neck = new THREE.Group(); neck.position.set(0, 0.55, 0); upper.add(neck);
  const headG = new THREE.Group(); headG.position.set(0, 0.21, 0); headG.scale.setScalar(female ? 1.52 : 1.46); neck.add(headG);      // đầu to kiểu chibi
  add(headG, G.head, skin);
  const eyes = new THREE.Group(); eyes.position.set(0, 0.004, 0); headG.add(eyes);
  add(eyes, G.iris, IRIS, 0, -0.004, 0, false);
  add(eyes, G.hl, HILITE, 0, -0.004, 0, false);
  add(headG, female ? G.lashF : G.lashM, LASH, 0, 0, 0, false);
  add(headG, female ? G.browF : G.browM, hair, 0, 0, 0, false);
  add(headG, G.blush, BLUSH, 0, 0, 0, false);
  add(headG, G.mouth, MOUTH, 0, 0, 0, false);
  const hairMesh = add(headG, hairGeo(style), hair, 0, 0, 0, true);
  void hairMesh;
  // phụ kiện tóc: nơ hoặc hoa cài
  const accessory = o.accessory ?? (female ? 'bow' : null);
  if (accessory === 'bow') {
    const bowM = clothMat('bow', o.bowColor ?? 0xff6b8a, { roughness: 0.5 });
    const b = new THREE.Group(); b.position.set(0.085, 0.092, 0.05); b.rotation.z = -0.5; headG.add(b);
    for (const s of [1, -1]) { const l = add(b, G.bowLoop, bowM, s * 0.036, 0, 0, false); l.rotation.y = s > 0 ? 0 : Math.PI; }
    add(b, G.bowKnot, bowM, 0, 0, 0, false);
  } else if (accessory === 'flower') {
    const petal = clothMat('petal', 0xfff4f6, { roughness: 0.55 });
    const f = new THREE.Group(); f.position.set(-0.085, 0.088, 0.055); headG.add(f);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(f, G.bowKnot, petal, Math.cos(a) * 0.026, Math.sin(a) * 0.026, 0, false).scale.set(1.1, 1.1, 0.6); }
    add(f, G.bowKnot, std('cStamen', 0xffc94a), 0, 0, 0.006, false).scale.setScalar(0.8);
  }

  /* ---- hai tay ---- */
  const arms = {};
  for (const side of [1, -1]) {
    const up = add(upper, G.upperArm, top);
    const fo = add(upper, female ? G.foreArmF : G.foreArmM, female ? top : skin);
    const el = add(upper, G.elbow, top);
    const hand = new THREE.Group(); upper.add(hand);
    const palm = add(hand, G.hand, skin, 0, 0.042, 0, false); palm.scale.set(0.72, 1.3, 0.62);
    arms[side] = { side, sh: new THREE.Vector3(side * 0.19, 0.49, 0), up, fo, el, hand, palm, grip: 0 };
  }

  const H = {
    root, body, upper, neck, hipY, seed, arms, feet, skirt, legs,
    gender: female ? 'female' : 'male',
    height: 1.98,
    closedEyes: !!o.closedEyes,
    seatedPose: false,
    _blink: 0, _blinkT: 1 + Math.random() * 3,

    setSeated(on) {
      if (on === this.seatedPose) return;
      this.seatedPose = on;
      for (const l of legs) l.visible = !on;
      if (skirt) skirt.visible = !on;
      seat.visible = on;
      this.hipY = on ? 0.2 : 0.86;
      upper.position.y = this.hipY;
      this.closedEyes = on;
    },
    reach(side, x, y, z, px = side * 0.4, py = -0.7, pz = -0.3) {
      const a = arms[side];
      _D.set(x, y, z).sub(a.sh);
      const d = clamp(_D.length(), Math.abs(A1 - A2) + 0.02, A1 + A2 - 0.003);
      _D.normalize();
      const k = (d * d + A1 * A1 - A2 * A2) / (2 * d), h = Math.sqrt(Math.max(0, A1 * A1 - k * k));
      _P.set(px, py, pz); _P.addScaledVector(_D, -_P.dot(_D));
      if (_P.lengthSq() < 1e-6) _P.set(0, -1, 0).addScaledVector(_D, _D.y);
      _P.normalize();
      _E.copy(a.sh).addScaledVector(_D, k).addScaledVector(_P, h);
      _W.copy(a.sh).addScaledVector(_D, d);
      span(a.up, a.sh, _E); span(a.fo, _E, _W);
      a.el.position.copy(_E);
      a.hand.position.copy(_W);
      _F.copy(_W).sub(_E).normalize();
      a.hand.quaternion.setFromUnitVectors(UP, _F);
    },
    grip(side, amt) {
      const a = arms[side]; a.grip = amt;
      a.palm.scale.set(0.72 + amt * 0.35, 1.3 - amt * 0.45, 0.62 + amt * 0.35);
    },
    armsDown() { this.reach(1, 0.23, 0.02, 0.0, 0.3, -0.3, -1); this.reach(-1, -0.23, 0.02, 0.0, -0.3, -0.3, -1); },
    anjali() { this.reach(1, 0.028, 0.31, 0.2, 1, -0.8, -0.2); this.reach(-1, -0.028, 0.31, 0.2, -1, -0.8, -0.2); },
    dhyana() { this.reach(1, 0.035, 0.15, 0.3, 1, -0.7, -0.2); this.reach(-1, -0.035, 0.15, 0.3, -1, -0.7, -0.2); },
    walkArms(phase) {
      const s = Math.sin(phase) * 0.17;
      this.reach(1, 0.24, 0.05, -s, 0.3, -0.3, -1); this.reach(-1, -0.24, 0.05, s, -0.3, -0.3, -1);
    },
    /* Chân bước, bàn chân nhấc lên theo nhịp, tà áo dài đung đưa. amp 0 = đứng yên. */
    step(phase, amp = 1) {
      const s = Math.sin(phase) * 0.2 * amp;
      legs[0].rotation.x = s; legs[1].rotation.x = -s;
      feet[0].position.y = -0.82 + Math.max(0, Math.cos(phase)) * 0.045 * amp;
      feet[1].position.y = -0.82 + Math.max(0, -Math.cos(phase)) * 0.045 * amp;
      if (skirt) {                                              // váy lắc nhẹ và phồng theo nhịp bước
        skirt.rotation.z = Math.sin(phase) * 0.05 * amp;
        skirt.scale.set(1 + Math.abs(s) * 0.5, 1, 1 + Math.abs(s) * 0.35);
      }
    },
    idle(dt, t) {
      this._blinkT -= dt;
      if (this._blinkT <= 0) { this._blinkT = 2.5 + Math.random() * 3.5; this._blink = 0.12; }
      this._blink -= dt;
      eyes.scale.y = this.closedEyes ? 0.12 : (this._blink > 0 ? 0.1 : 1);
      const calm = this.seatedPose;
      upper.position.y = this.hipY + Math.sin(t * (calm ? 0.9 : 1.7) + seed) * (calm ? 0.011 : 0.005);
      neck.rotation.y = Math.sin(t * 0.35 + seed) * (calm ? 0.03 : 0.12);
      neck.rotation.z = Math.sin(t * 0.27 + seed * 2) * (calm ? 0.005 : 0.03) + (calm ? 0 : 0.02);       // nghiêng đầu nhẹ cho đáng yêu
      if (style === 'pony' || style === 'long') headG.rotation.x = Math.sin(t * 1.3 + seed) * 0.012;      // tóc dài hơi lắc
    },
    dispose() { /* hình học & vật liệu dùng chung nên không giải phóng ở đây */ }
  };
  H.armsDown();
  H.step(0, 0);
  return H;
}

/* Chọn kiểu tóc, màu tóc, phụ kiện, quần… ổn định theo tên (cùng tên luôn ra cùng ngoại hình). */
export function looksFor(name, gender) {
  let hash = 0; for (const ch of String(name)) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  hash = Math.abs(hash);
  const female = gender === 'female', styles = HAIR_STYLES[female ? 'female' : 'male'];
  return {
    skinTone: hash % 4,
    hairStyle: styles[(hash >> 3) % styles.length],
    hairColor: [0, 0, 1, 2, 3][(hash >> 6) % 5],
    trousers: (hash >> 9) % 4,
    accessory: female ? ((hash >> 11) % 3 === 0 ? 'flower' : 'bow') : null,
    bowColor: [0xff6b8a, 0xf2a6c0, 0xe8453c, 0x7fc8d8, 0xffc94a][(hash >> 13) % 5]
  };
}

