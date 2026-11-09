import * as THREE from 'three';
import { span } from './util.js';

/* Động tác công quả trong nhà bếp, dựng trên bộ IK tay của human.js.
 *   stir : đứng khuấy nồi cơm / nồi canh bằng đũa cả
 *   chop : đứng thái rau trên thớt, dao chặt theo từng đợt
 *   pick : ngồi lặt rau từ rổ
 *   fan  : ngồi trước cửa lò, phe phẩy quạt cho lửa cháy
 *   eat  : ngồi xếp bằng bên bàn thấp, tay trái bưng bát, tay phải gắp cơm đưa lên miệng
 * Vị trí đứng/ngồi phải khớp với bố cục nhà bếp ở kitchen.js và server/npc.js.
 * Mọi mục tiêu của tay tính theo hệ "thân đã nghiêng": h = cao hơn hông, f = ra phía trước. */

const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.8 });
const STEEL = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, metalness: 0.8, roughness: 0.3 });
const LEAF = new THREE.MeshStandardMaterial({ color: 0x5aa43d, roughness: 0.8 });
const FAN = new THREE.MeshStandardMaterial({ color: 0xe6c57a, roughness: 0.9, side: THREE.DoubleSide });
const BOWL = new THREE.MeshStandardMaterial({ color: 0xe9e2d0, roughness: 0.4, side: THREE.DoubleSide });
const RICE = new THREE.MeshStandardMaterial({ color: 0xf4f0e2, roughness: 0.9 });
const STICK = new THREE.CylinderGeometry(0.022, 0.028, 1, 6);

const Rv = new THREE.Vector3(), B = new THREE.Vector3(), D = new THREE.Vector3(), H = new THREE.Vector3(), H2 = new THREE.Vector3(), A = new THREE.Vector3();

/* Điểm (x, h, f) trong hệ thân đã nghiêng góc th -> toạ độ trong không gian `upper`. */
function P(out, th, h, f, x = 0) {
  const c = Math.cos(th), s = Math.sin(th);
  return out.set(x, h * c + f * s, -h * s + f * c);
}
const ease = u => u * u * (3 - 2 * u);
const lerpV = (out, a, b, u) => out.copy(a).lerp(b, u);

export function attachWork(o, act) {
  const w = { act, off: Math.random() * 20 };
  const mk = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
  if (act === 'stir') {
    w.stick = mk(STICK, WOOD);
    w.blade = mk(new THREE.BoxGeometry(0.17, 0.24, 0.025), WOOD);
    o.upper.add(w.stick, w.blade);
  } else if (act === 'chop') {
    w.knife = mk(new THREE.BoxGeometry(0.014, 0.06, 0.2), STEEL);      // lưỡi chặt hướng xuống (trục z của bàn tay)
    w.knife.position.set(0, 0.04, 0.1);
    o.arms[1].hand.add(w.knife);
  } else if (act === 'fan') {
    const fan = mk(new THREE.CircleGeometry(0.16, 14), FAN); fan.rotation.x = -Math.PI / 2; fan.position.set(0, 0.17, 0);
    const handle = mk(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 5), WOOD); handle.position.set(0, 0.07, 0);
    o.arms[1].hand.add(fan, handle);
  } else if (act === 'eat') {
    const bowl = new THREE.Group(); bowl.rotation.x = -Math.PI / 2; bowl.position.set(0, 0.06, -0.015);   // miệng bát hướng lên
    const shell = mk(new THREE.SphereGeometry(0.065, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), BOWL);
    const rice = mk(new THREE.CircleGeometry(0.058, 10), RICE); rice.rotation.x = -Math.PI / 2; rice.position.y = -0.012;
    bowl.add(shell, rice);
    o.arms[-1].hand.add(bowl);
    for (const sx of [-1, 1]) {
      const c = mk(new THREE.CylinderGeometry(0.005, 0.004, 0.24, 4), WOOD); c.position.set(sx * 0.008, 0.13, 0);
      o.arms[1].hand.add(c);
    }
  } else if (act === 'pick') {
    w.leaf = mk(new THREE.SphereGeometry(0.04, 6, 4), LEAF); w.leaf.scale.set(1, 0.3, 1.5); w.leaf.position.set(0, 0.07, 0); w.leaf.visible = false;
    o.arms[1].hand.add(w.leaf);
  }
  o.work = w;
  return w;
}

/* Gọi mỗi khung hình sau khi tư thế mặc định đã đặt và trước o.idle(). */
export function updateWork(o, t) {
  const w = o.work, tt = t + w.off;
  o.closedEyes = false;

  if (w.act === 'stir') {
    const th = 0.12, a = tt * 2.2;
    P(Rv, th, 0.36, 0.45);                                      // điểm tựa trên miệng nồi
    P(B, th, 0.07, 1.2 + Math.sin(a) * 0.2, Math.cos(a) * 0.2); // đầu đũa vẽ vòng tròn trong nồi
    D.copy(Rv).sub(B);
    H.copy(Rv).addScaledVector(D, 0.08);
    H2.copy(Rv).addScaledVector(D, 0.26);
    A.copy(Rv).addScaledVector(D, 0.4);
    o.reach(1, H.x + 0.04, H.y, H.z, 1, -0.8, -0.2);
    o.reach(-1, H2.x - 0.04, H2.y, H2.z, -1, -0.8, -0.2);
    o.grip(1, 0.9); o.grip(-1, 0.9);
    span(w.stick, A, B);
    w.blade.position.copy(B); w.blade.quaternion.copy(w.stick.quaternion);
    o.upper.rotation.x = th + Math.sin(a) * 0.02;
    o.neck.rotation.x = 0.2;
  } else if (w.act === 'chop') {
    const th = 0.22, burst = Math.sin(tt * 0.9) > -0.5, k = burst ? Math.max(0, Math.sin(tt * 10)) : 0;
    P(H, th, 0.09 + 0.12 * k, 0.4 + Math.sin(tt * 0.6) * 0.03, 0.13);
    o.reach(1, H.x, H.y, H.z, 1, -0.8, -0.2); o.grip(1, 0.8);
    P(H2, th, 0.07, 0.44 + Math.sin(tt * 0.6) * 0.03, -0.03);
    o.reach(-1, H2.x, H2.y, H2.z, -1, -0.8, -0.2); o.grip(-1, 0.6);
    o.upper.rotation.x = th;
    o.neck.rotation.x = 0.35;
  } else if (w.act === 'fan') {
    const th = 0.3, wave = Math.sin(tt * 7);
    P(H, th, 0.12 + Math.cos(tt * 7) * 0.02, 0.5, 0.04 + wave * 0.1);
    o.reach(1, H.x, H.y, H.z, 1, -0.8, -0.2); o.grip(1, 0.7);
    P(H2, th, 0.08, 0.3, -0.12);
    o.reach(-1, H2.x, H2.y, H2.z, -1, -0.8, -0.2);
    o.upper.rotation.x = th;
    o.neck.rotation.x = 0.25;
  } else if (w.act === 'eat') {
    const th = 0.18, u = (tt / 3.8) % 1, seg = (a, b) => Math.min(1, Math.max(0, (u - a) / (b - a)));
    // cổ tay phải: từ miệng tới bát (đầu đũa gắp cơm) rồi đưa lại lên miệng
    const lift = ease(seg(0.35, 0.5)) * (1 - ease(seg(0.8, 0.95)));      // tay trái nâng bát lên gần ngực khi ăn
    P(Rv, th, 0.36, 0.17, 0.04);                                         // cổ tay phải ở miệng
    P(B, th, 0.2, 0.34, 0.06);                                           // cổ tay phải ở bát
    if (u < 0.2) lerpV(H, Rv, B, ease(seg(0, 0.2)));
    else if (u < 0.35) H.copy(B);
    else if (u < 0.55) lerpV(H, B, Rv, ease(seg(0.35, 0.55)));
    else { H.copy(Rv); H.y += Math.sin(tt * 6) * 0.004; }                // nhai
    o.reach(1, H.x, H.y, H.z, 1, -0.8, -0.2); o.grip(1, 0.6);
    P(H2, th, 0.2 + 0.1 * lift, 0.28 - 0.04 * lift, -0.06);
    o.reach(-1, H2.x, H2.y, H2.z, -1, -0.8, -0.2); o.grip(-1, 0.5);
    o.upper.rotation.x = th;
    o.neck.rotation.x = 0.12 + 0.1 * lift;
  } else if (w.act === 'pick') {
    const th = 0.35, T = 2.8, u = (tt / T) % 1;
    const lap = P(Rv, th, 0.1, 0.28, 0.04), bas = P(B, th, 0.16, 0.6, 0.07);
    let held = false;
    if (u < 0.3) lerpV(H, lap, bas, ease(u / 0.3));               // với tay tới rổ
    else if (u < 0.42) H.copy(bas);                                 // nhón rau
    else if (u < 0.72) { lerpV(H, bas, lap, ease((u - 0.42) / 0.3)); held = true; }
    else if (u < 0.9) { H.copy(lap); H.x += Math.sin(tt * 40) * 0.012; H.z += Math.sin(tt * 33) * 0.012; held = true; }   // tuốt lá
    else H.copy(lap);
    o.reach(1, H.x, H.y, H.z, 1, -0.8, -0.2); o.grip(1, held || (u >= 0.3 && u < 0.42) ? 0.9 : 0.3);
    P(H2, th, 0.1, 0.3, -0.06);
    o.reach(-1, H2.x, H2.y, H2.z, -1, -0.8, -0.2); o.grip(-1, held ? 0.8 : 0.4);
    w.leaf.visible = held;
    o.upper.rotation.x = th;
    o.neck.rotation.x = 0.3;
  }
}
