import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { span, clamp } from './util.js';

/* =====================================================================
   NHÂN VẬT
   - Hệ toạ độ: gốc `root` ở mặt đất, mặt quay về +z.
   - `upper` có gốc tại hông; vai ở (±0.19, 0.49, 0); chân cổ ở (0, 0.55, 0).
     Mọi mục tiêu IK của tay (reach) tính trong không gian `upper`.
   - Áo tràng dài che chân; bàn chân nhô dưới gấu áo và bước theo step().
   - Tay là chuỗi hai đốt, giải IK giải tích nên chắp tay, cầm chổi, gõ mõ đều đúng chỗ.
   ===================================================================== */

const SKIN = [0xe8b896, 0xdcaa86, 0xf0c4a2, 0xd09a76];
const matCache = new Map();
const std = (key, color, o = {}) => {
  let m = matCache.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o }); matCache.set(key, m); }
  return m;
};
const skinMat = i => std('skin' + (i & 3), SKIN[i & 3], { roughness: 0.62 });
const FEATURE = std('feature', 0x1b1210, { roughness: 0.5 });
const HAIR = std('hair', 0x15100d, { roughness: 0.55 });
const SCALP = std('scalp', 0x8f7d70, { roughness: 0.85 });
const SANDAL = std('sandal', 0x33261b, { roughness: 0.85 });
const robeMat = c => std('robe' + c, c, { roughness: 0.82 });

/* ---------- hình học dùng chung ---------- */
const geo = {};
function sphere(r, sx, sy, sz, x, y, z, ws = 14, hs = 10) {
  const g = new THREE.SphereGeometry(r, ws, hs); g.scale(sx, sy, sz); g.translate(x, y, z); return g;
}
function buildShared() {
  if (geo.ready) return;
  geo.ready = true;
  // đầu + tai + mũi + cổ (cùng vật liệu da)
  geo.head = mergeGeometries([
    sphere(0.108, 0.88, 1.08, 0.98, 0, 0, 0, 28, 20),
    sphere(0.075, 0.92, 0.96, 1, 0, -0.042, 0.02, 20, 14),
    sphere(0.015, 0.9, 1, 1.25, 0, -0.016, 0.1),
    sphere(0.03, 0.35, 0.7, 0.5, 0.093, -0.004, -0.005),
    sphere(0.03, 0.35, 0.7, 0.5, -0.093, -0.004, -0.005),
    (() => { const c = new THREE.CylinderGeometry(0.045, 0.05, 0.14, 12); c.translate(0, -0.125, 0); return c; })()
  ].map(g => g.index ? g.toNonIndexed() : g), false);
  geo.eyes = mergeGeometries([
    sphere(0.0125, 1, 1, 0.6, 0.037, 0, 0.093, 10, 8),
    sphere(0.0125, 1, 1, 0.6, -0.037, 0, 0.093, 10, 8)
  ].map(g => g.toNonIndexed()), false);
  const brow = (x, rz) => { const g = new THREE.CapsuleGeometry(0.0042, 0.03, 3, 6); g.rotateZ(Math.PI / 2 + rz); g.scale(1, 1, 0.55); g.translate(x, 0.04, 0.088); return g; };
  const mouth = (() => { const g = new THREE.CapsuleGeometry(0.005, 0.026, 3, 6); g.rotateZ(Math.PI / 2); g.scale(1, 1, 0.6); g.translate(0, -0.052, 0.092); return g; })();
  geo.face = mergeGeometries([brow(0.039, 0.12), brow(-0.039, -0.12), mouth].map(g => g.toNonIndexed()), false);
  // tóc
  const cap = (r, k) => { const g = new THREE.SphereGeometry(r, 24, 14, 0, Math.PI * 2, 0, Math.PI * k); g.scale(0.93, 1.1, 1.04); g.rotateX(-0.38); g.translate(0, 0.006, -0.008); return g; };
  geo.hairShort = cap(0.113, 0.56);
  geo.scalp = cap(0.1095, 0.55);
  geo.hairBun = mergeGeometries([cap(0.113, 0.56), sphere(0.05, 1, 1, 1, 0, 0.035, -0.115)].map(g => g.toNonIndexed()), false);
  geo.tuft = sphere(0.032, 1, 0.55, 1.15, 0, 0.118, 0.035);
  // tay
  geo.upperArm = new THREE.CylinderGeometry(0.05, 0.06, 1, 10);
  geo.foreArm = new THREE.CylinderGeometry(0.088, 0.054, 1, 10);   // đầu trên = cổ tay, tay áo rộng
  geo.elbow = new THREE.SphereGeometry(0.057, 10, 8);
  geo.hand = new THREE.SphereGeometry(0.036, 10, 8);
  geo.foot = new THREE.BoxGeometry(0.085, 0.045, 0.2);
  // thân áo (từ hông lên cổ) và vạt áo dài
  const L = pts => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 22);
  geo.torso = L([[0.17, -0.05], [0.172, 0.06], [0.152, 0.22], [0.164, 0.36], [0.192, 0.47], [0.158, 0.53], [0.06, 0.565], [0.05, 0.585]]);
  geo.torso.scale(1, 1, 0.74);
  geo.skirt = L([[0.28, 0.1], [0.255, 0.3], [0.205, 0.55], [0.178, 0.8], [0.172, 0.93]]);
  geo.skirt.scale(1, 1, 0.82);
  geo.robeSeat = new THREE.SphereGeometry(1, 20, 12);
  geo.band = new THREE.BoxGeometry(0.2, 0.66, 0.02);
}

const _T = new THREE.Vector3(), _D = new THREE.Vector3(), _P = new THREE.Vector3(), _E = new THREE.Vector3(), _W = new THREE.Vector3(), _F = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const A1 = 0.29, A2 = 0.27;     // chiều dài cánh tay trên, cẳng tay

export function makeHuman(o = {}) {
  buildShared();
  const seed = Math.random() * 100;
  const skin = skinMat(o.skinTone ?? 0);
  const robe = robeMat(o.robe || '#c9772b');
  const seated = !!o.seated;       // NPC ngồi cố định (thầy tụng kinh)
  const hipY = seated ? 0.2 : 0.86;

  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  if (o.child) body.scale.setScalar(0.74);

  const add = (parent, g, m, x = 0, y = 0, z = 0, shadow = true) => {
    const me = new THREE.Mesh(g, m); me.position.set(x, y, z); me.castShadow = shadow; me.receiveShadow = true; parent.add(me); return me;
  };

  /* ---- vạt áo & bàn chân (đứng) và đôi chân xếp bằng (ngồi) ---- */
  let skirt = null; const feet = [];
  if (!seated) {
    skirt = add(body, geo.skirt, robe);
    for (const s of [1, -1]) feet.push(add(body, geo.foot, SANDAL, s * 0.085, 0.025, 0.04));
  }
  const seat = new THREE.Group(); seat.visible = seated; body.add(seat);
  {
    const lap = add(seat, geo.robeSeat, robe, 0, 0.14, 0.02); lap.scale.set(0.42, 0.15, 0.34);
    for (const s of [-1, 1]) { const k = add(seat, geo.robeSeat, robe, s * 0.3, 0.12, 0.2); k.scale.set(0.15, 0.1, 0.16); }
  }

  /* ---- thân trên ---- */
  const upper = new THREE.Group(); upper.position.y = hipY; body.add(upper);
  add(upper, geo.torso, robe);
  if (o.kasaya) {
    const km = std('kasaya' + o.kasaya, o.kasaya, { roughness: 0.8, side: THREE.DoubleSide });
    for (const z of [0.128, -0.128]) { const b = add(upper, geo.band, km, 0.02, 0.28, z); b.rotation.z = 0.62 * (z > 0 ? 1 : -1); }
    const cape = add(upper, geo.elbow, km, 0.19, 0.47, 0); cape.scale.set(1.9, 1.15, 1.9);
  }

  /* ---- đầu ---- */
  const neck = new THREE.Group(); neck.position.set(0, 0.55, 0); upper.add(neck);
  const headG = new THREE.Group(); headG.position.set(0, 0.15, 0); neck.add(headG);
  if (o.child) headG.scale.setScalar(1.22);
  add(headG, geo.head, skin);
  const eyes = add(headG, geo.eyes, FEATURE, 0, 0.014, 0, false);
  add(headG, geo.face, FEATURE, 0, 0, 0, false);
  if (o.shaved) {
    add(headG, geo.scalp, SCALP, 0, 0, 0, false);
    if (o.tuft) add(headG, geo.tuft, HAIR, 0, 0, 0, false);
  } else {
    add(headG, o.hair === 'bun' ? geo.hairBun : geo.hairShort, HAIR, 0, 0, 0, false);
  }

  /* ---- hai tay ---- */
  const arms = {};
  for (const side of [1, -1]) {
    const up = add(upper, geo.upperArm, robe);
    const fo = add(upper, geo.foreArm, robe);
    const el = add(upper, geo.elbow, robe);
    const hand = new THREE.Group(); upper.add(hand);
    const palm = add(hand, geo.hand, skin, 0, 0.042, 0, false); palm.scale.set(0.7, 1.35, 0.6);
    arms[side] = { side, sh: new THREE.Vector3(side * 0.19, 0.49, 0), up, fo, el, hand, palm, grip: 0 };
  }

  const H = {
    root, body, upper, neck, hipY, seed, arms, feet, skirt,
    height: o.child ? 1.45 : 1.98,
    closedEyes: !!o.closedEyes,
    seatedPose: seated,
    _blink: 0, _blinkT: 1 + Math.random() * 3,

    /* Chuyển giữa đứng và ngồi xếp bằng (người chơi). Mắt nhắm khi ngồi. */
    setSeated(on) {
      if (seated || on === this.seatedPose) return;
      this.seatedPose = on;
      skirt.visible = !on; for (const f of feet) f.visible = !on;
      seat.visible = on;
      this.hipY = on ? 0.2 : 0.86;
      upper.position.y = this.hipY;
      this.closedEyes = on;
    },

    /* IK: đặt cổ tay `side` (+1 hoặc -1) tới (x,y,z) trong không gian `upper`, khuỷu hướng về `pole`. */
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
      a.palm.scale.set(0.7 + amt * 0.35, 1.35 - amt * 0.45, 0.6 + amt * 0.35);
    },
    /* Tay buông xuôi. */
    armsDown() {
      this.reach(1, 0.23, 0.02, 0.0, 0.3, -0.3, -1); this.reach(-1, -0.23, 0.02, 0.0, -0.3, -0.3, -1);
    },
    /* Chắp tay trước ngực. */
    anjali() {
      this.reach(1, 0.028, 0.31, 0.2, 1, -0.8, -0.2); this.reach(-1, -0.028, 0.31, 0.2, -1, -0.8, -0.2);
    },
    /* Thiền định: hai bàn tay đặt lòng, ngón cái chạm nhau. */
    dhyana() {
      this.reach(1, 0.035, 0.15, 0.3, 1, -0.7, -0.2); this.reach(-1, -0.035, 0.15, 0.3, -1, -0.7, -0.2);
    },
    /* Tay đánh theo nhịp bước. */
    walkArms(phase) {
      const s = Math.sin(phase) * 0.17;
      this.reach(1, 0.24, 0.05, -s, 0.3, -0.3, -1); this.reach(-1, -0.24, 0.05, s, -0.3, -0.3, -1);
    },
    /* Chân bước. amp 0 = đứng yên. */
    step(phase, amp = 1) {
      if (!feet.length) return;
      const s = Math.sin(phase) * 0.17 * amp;
      feet[0].position.z = 0.04 + s; feet[1].position.z = 0.04 - s;
      feet[0].position.y = 0.025 + Math.max(0, Math.cos(phase)) * 0.05 * amp;
      feet[1].position.y = 0.025 + Math.max(0, -Math.cos(phase)) * 0.05 * amp;
      skirt.rotation.z = Math.sin(phase) * 0.025 * amp;
    },
    /* Thở, chớp mắt, đầu khẽ động. */
    idle(dt, t) {
      this._blinkT -= dt;
      if (this._blinkT <= 0) { this._blinkT = 2.5 + Math.random() * 3.5; this._blink = 0.12; }
      this._blink -= dt;
      eyes.scale.y = this.closedEyes ? 0.14 : (this._blink > 0 ? 0.1 : 1);
      const calm = this.seatedPose;                       // ngồi: thở chậm và sâu, đầu gần như bất động
      upper.position.y = this.hipY + Math.sin(t * (calm ? 0.9 : 1.7) + seed) * (calm ? 0.011 : 0.005);
      neck.rotation.y = Math.sin(t * 0.35 + seed) * (calm ? 0.03 : 0.12);
      neck.rotation.z = Math.sin(t * 0.27 + seed * 2) * (calm ? 0.005 : 0.02);
    },
    dispose() { /* hình học & vật liệu dùng chung nên không giải phóng ở đây */ }
  };
  H.armsDown();
  return H;
}

export const makeSeated = o => makeHuman({ ...o, seated: true });
