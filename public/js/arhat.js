import * as THREE from 'three';
import { mesh, box, cyl, span, rng } from './util.js';
import { M } from './materials.js';
import { foldedLathe } from './statues.js';

/* 18 vị La Hán đá trắng dọc lối vào. Ba dáng ngồi (cười bụng phệ, thiền định, co gối cầm vật),
   bốn nét mặt hỷ - nộ - ái - bi, sáu vật cầm tay (tích trượng, bát, quạt, kinh cuốn, tràng hạt, túi). */
export function makeArhat(i) {
  const R = rng(900 + i * 31);
  const a = new THREE.Group();
  const add = (geo, m, x, y, z, shadow = true) => mesh(geo, m, x, y, z, a, shadow);
  const ball = (r, x, y, z, sx = 1, sy = 1, sz = 1, m = M.MARBLE, shadow = false) => {
    const o = add(new THREE.SphereGeometry(r, 14, 10), m, x, y, z, shadow); o.scale.set(sx, sy, sz); return o;
  };
  const pose = i % 3, mood = (i * 7 + (i >> 2)) % 4, prop = (i * 5 + 1) % 6;
  const stone = M.MARBLE, V = (x, y, z) => new THREE.Vector3(x, y, z);

  // bệ đá hai tầng
  box(1.25, 0.2, 1.25, M.STONE, 0, 0.1, 0, a);
  box(1.0, 0.5, 1.0, M.WHITE, 0, 0.45, 0, a);
  const B = 0.7;

  // thân: áo choàng nếp gấp, bụng phệ, đai lưng
  add(foldedLathe([[0.01, 0], [0.5, 0], [0.47, 0.12], [0.36, 0.45], [0.4, 0.8], [0.31, 0.98], [0.17, 1.05], [0.01, 1.08]], { seg: 24, fold: 0.045, squash: 0.86 }), stone, 0, B + 0.04, 0);
  ball(0.5, 0, B + 0.17, 0.05, 1.05, 0.34, 0.85);                                   // hai chân xếp bằng
  const belly = pose === 0 ? 0.42 : 0.33;
  ball(belly, 0, B + 0.52, 0.12, 1, 0.82, 0.78);
  const sash = add(new THREE.TorusGeometry(0.37, 0.035, 6, 28), M.GOLD, 0, B + 0.34, 0.06, false); sash.rotation.x = Math.PI / 2; sash.scale.set(1, 0.9, 1);
  const stole = add(new THREE.CapsuleGeometry(0.065, 0.66, 4, 8), stone, 0.08, B + 0.74, 0.24); stole.rotation.set(0.1, 0, 0.62);  // yếm vắt qua vai

  // đầu to, trán cao, tai dài, má phính
  const hy = B + 1.27, tilt = (R() - 0.5) * 0.5;
  const head = new THREE.Group(); head.position.set(0, hy, 0.03); head.rotation.set(pose === 0 ? -0.18 : 0.08, tilt, (R() - 0.5) * 0.12); a.add(head);
  const hmesh = (geo, m, x, y, z, sc = [1, 1, 1]) => { const o = mesh(geo, m, x, y, z, head, false); o.scale.set(...sc); return o; };
  hmesh(new THREE.SphereGeometry(0.235, 22, 16), stone, 0, 0, 0, [0.95, 1.05, 1]).castShadow = true;
  for (const s of [-1, 1]) {
    hmesh(new THREE.CapsuleGeometry(0.04, 0.3, 4, 8), stone, s * 0.235, -0.1, -0.01).rotation.z = s * 0.08;             // tai dài chấm vai
    hmesh(new THREE.SphereGeometry(0.075, 10, 8), stone, s * 0.12, -0.1, 0.16);                                          // má
    // lông mày: hỷ cong lên, nộ chúc vào trong, ái phẳng, bi xệ ra ngoài
    const bt = [0.22, -0.55, 0.0, 0.55][mood] * s;
    hmesh(new THREE.CapsuleGeometry(0.022, 0.12, 3, 6), stone, s * 0.085, 0.085, 0.215).rotation.z = Math.PI / 2 + bt;
    hmesh(new THREE.SphereGeometry(0.03, 8, 6), M.DARK, s * 0.085, 0.04, 0.222, [1.4, mood === 0 ? 0.3 : 0.75, 0.45]);
  }
  hmesh(new THREE.SphereGeometry(0.042, 10, 8), stone, 0, -0.03, 0.235, [1, 1.1, 0.9]);
  const mp = [0, -0.1, 0.215];
  if (mood === 0) { const m = hmesh(new THREE.TorusGeometry(0.075, 0.018, 5, 14, Math.PI), M.DARK, ...mp); m.rotation.z = Math.PI; }                    // cười
  else if (mood === 1) hmesh(new THREE.BoxGeometry(0.1, 0.055, 0.02), M.DARK, mp[0], mp[1] - 0.01, mp[2]);                                             // quát
  else if (mood === 2) { const m = hmesh(new THREE.TorusGeometry(0.04, 0.014, 5, 12, Math.PI), M.DARK, mp[0], mp[1] + 0.01, mp[2]); m.rotation.z = Math.PI; } // mỉm
  else hmesh(new THREE.TorusGeometry(0.05, 0.016, 5, 12, Math.PI), M.DARK, mp[0], mp[1] - 0.02, mp[2]);                                                // buồn

  // hai tay (đốt vai - khuỷu - bàn tay), tay áo rộng loe về phía cổ tay
  const limb = (p0, p1, r0, r1) => { const c = mesh(new THREE.CylinderGeometry(r1, r0, 1, 12), stone, 0, 0, 0, a, true); span(c, p0, p1); };
  const arm = (sx, elbow, hand) => {
    const sh = V(sx * 0.33, B + 0.95, 0.02);
    limb(sh, elbow, 0.085, 0.09); ball(0.095, elbow.x, elbow.y, elbow.z, 1, 1, 1, stone, true);
    limb(elbow, hand, 0.075, 0.125); ball(0.075, hand.x, hand.y, hand.z, 1, 1, 1, stone);
  };
  const L = V(-0.16, B + 0.5, 0.46), Rt = V(0.16, B + 0.5, 0.46);
  let rightHand = Rt.clone(), leftHand = L.clone();
  if (pose === 0) {                                               // hai tay ôm bụng cười
    arm(1, V(0.5, B + 0.66, 0.2), Rt); arm(-1, V(-0.5, B + 0.66, 0.2), L);
  } else if (pose === 1) {                                        // thiền định: tay đặt lòng
    rightHand = V(0.05, B + 0.4, 0.46); leftHand = V(-0.05, B + 0.4, 0.46);
    arm(1, V(0.46, B + 0.62, 0.16), rightHand); arm(-1, V(-0.46, B + 0.62, 0.16), leftHand);
  } else {                                                        // co một gối, tay giơ cầm vật
    ball(0.2, -0.36, B + 0.46, 0.34, 1, 1.1, 1.3, stone, true);
    rightHand = V(0.52, B + 1.22, 0.34); leftHand = V(-0.34, B + 0.62, 0.42);
    arm(1, V(0.58, B + 0.9, 0.14), rightHand); arm(-1, V(-0.5, B + 0.7, 0.2), leftHand);
  }

  // vật cầm
  if (prop === 0) {                                               // tích trượng
    cyl(0.022, 0.022, 1.8, M.GOLD, rightHand.x, B + 0.8, rightHand.z, a, 6);
    const ring = add(new THREE.TorusGeometry(0.1, 0.02, 6, 14), M.GOLD, rightHand.x, B + 1.72, rightHand.z, false); ring.rotation.y = 0.4;
  } else if (prop === 1) {                                        // bát khất thực
    const bowl = add(new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.BRONZE, leftHand.x, leftHand.y + 0.04, leftHand.z); bowl.rotation.x = Math.PI;
  } else if (prop === 2) {                                        // quạt
    const fan = add(new THREE.CircleGeometry(0.21, 16), M.BGOLD2, rightHand.x + 0.08, rightHand.y + 0.22, rightHand.z, false); fan.rotation.y = -0.5;
  } else if (prop === 3) {                                        // kinh cuốn
    const sc = add(new THREE.CylinderGeometry(0.05, 0.05, 0.36, 10), M.CUSHION, (leftHand.x + rightHand.x) / 2, (leftHand.y + rightHand.y) / 2 + 0.04, (leftHand.z + rightHand.z) / 2); sc.rotation.z = Math.PI / 2;
  } else if (prop === 4) {                                        // tràng hạt
    const bd = add(new THREE.TorusGeometry(0.25, 0.022, 6, 24), M.WOOD, 0, B + 0.93, 0.16, false); bd.rotation.x = Math.PI / 2 - 0.5; bd.scale.set(1, 1.15, 1);
  } else {                                                        // túi đại
    ball(0.26, -0.48, B + 0.3, -0.05, 1, 0.85, 0.95, stone, true);
    ball(0.09, -0.48, B + 0.56, -0.05, 1, 0.7, 1, M.CUSHION);
  }

  a.scale.setScalar(1.12 + R() * 0.14);
  return a;
}
