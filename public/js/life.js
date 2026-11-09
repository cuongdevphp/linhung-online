import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, mesh, canvasTex, lerpAngle, makeLabel, softDot, rng, clamp, lerp, smoothstep, span } from './util.js';
import { makeHuman, makeSeated } from './human.js';
import { heightAt } from './collision.js';
import { UP, POD, BODHI, PILE, BURNER, BELL, MO_MONK, POND, BELL_PERIOD_S, INCENSE_LIFE_MS, LANTERN_LIFE_MS } from '/shared/layout.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* ============================================================================
   HOẠT CẢNH: mọi nhân vật NPC chạy theo giờ server `st` nên mọi người chơi thấy giống nhau.
   ============================================================================ */
export function createLife(scene, W, sfx) {
  const L = { onAutoBell: null };
  const R = rng(5150);
  const tmp = V3();

  /* ---------------- chú tiểu quét lá bồ đề ---------------- */
  const tieu = makeHuman({ robe: '#7b5a3c', shaved: true, tuft: true, child: true, skinTone: 2 });
  scene.add(tieu.root);
  { const l = makeLabel('Chú tiểu Minh Tâm', { npc: true }); l.position.y = tieu.height + 0.1; l.scale.multiplyScalar(0.8); tieu.root.add(l); }

  const broom = new THREE.Group(); tieu.body.add(broom);
  const handle = mesh(new THREE.CylinderGeometry(0.022, 0.026, 1, 8), mat('bamboo', 0xc9a85a, { roughness: 0.55 }), 0, 0, 0, broom);
  const broomHead = new THREE.Group(); broom.add(broomHead);
  const straw = mat('straw', 0xa7834a, { side: THREE.DoubleSide, roughness: 0.9 });
  for (let k = 0; k < 9; k++) {
    const s = mesh(new THREE.ConeGeometry(0.05, 0.55, 5, 1, true), straw, (k - 4) * 0.045, -0.24, 0, broomHead, false);
    s.rotation.set(Math.PI, 0, (k - 4) * 0.09);
  }
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8), mat('rope', 0xc9b48a), 0, 0.02, 0, broomHead, false);
  const bA = V3(), bB = V3(), bD = V3(), UPV = V3(0, 1, 0), hp = V3(), inv = new THREE.Matrix4();

  function placeBroom(sw) {
    bA.set(0.12 + sw * 0.08, 1.22, 0.24);
    bB.set(sw * 0.5, 0.06, 0.82);
    span(handle, bB, bA);
    bD.subVectors(bA, bB).normalize();
    broomHead.position.copy(bB); broomHead.quaternion.setFromUnitVectors(UPV, bD); broomHead.rotateY(sw * 0.4);
    tieu.upper.updateMatrix(); inv.copy(tieu.upper.matrix).invert();
    hp.copy(bA).lerp(bB, 0.03).applyMatrix4(inv); tieu.reach(1, hp.x, hp.y, hp.z, 1, -0.3, -0.6);
    hp.copy(bA).lerp(bB, 0.17).applyMatrix4(inv); tieu.reach(-1, hp.x, hp.y, hp.z, -1, -0.6, -0.4);
    tieu.grip(1, 0.9); tieu.grip(-1, 0.9);
  }

  const SWEEP_CYCLE = 120, SWEEP_R = 7.5;
  const spiral = k => { const r = SWEEP_R - 6.5 * k, a = k * Math.PI * 6; return [PILE.x + Math.cos(a) * r, PILE.z + Math.sin(a) * r]; };
  function tieuPose(st) {
    const p = (st % SWEEP_CYCLE) / SWEEP_CYCLE;
    let x, z, ry, sweeping = false, walking = true;
    if (p < 0.82) {
      const k = p / 0.82; [x, z] = spiral(k); const [x2, z2] = spiral(Math.min(1, k + 0.002));
      ry = Math.atan2(x2 - x, z2 - z); sweeping = true;
    } else if (p < 0.88) { [x, z] = spiral(1); ry = 0; sweeping = true; walking = false; }
    else {
      const k = (p - 0.88) / 0.12, [sx, sz] = spiral(1), [ex, ez] = spiral(0);
      x = sx + (ex - sx) * k; z = sz + (ez - sz) * k; ry = Math.atan2(ex - sx, ez - sz);
    }
    return { x, z, ry, sweeping, walking, p };
  }

  /* ---- lá bồ đề rơi (instanced), được quét về đống lá ---- */
  const N = 420;
  const leafGeo = new THREE.PlaneGeometry(0.26, 0.38); leafGeo.rotateX(-Math.PI / 2);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.85 }), N);
  leaves.castShadow = false; leaves.receiveShadow = true; leaves.frustumCulled = false;
  leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const palette = [0xd9a326, 0x8a5a2b, 0xc0702a, 0x9a9a3a, 0xb8862e, 0x6e4a24].map(c => new THREE.Color(c));
  const S = Array.from({ length: N }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, st: 0, age: 0, delay: 0, seed: Math.random() * 100 }));
  const spawn = (l, delay = 0, ground = false) => {
    const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * 10;
    l.x = BODHI.x + Math.cos(a) * d; l.z = BODHI.z + Math.sin(a) * d;
    l.y = ground ? 0.04 : 7 + Math.random() * 6; l.st = ground ? 1 : 0; l.delay = delay; l.age = Math.random() * 60;
    l.vx = l.vz = l.vy = 0; l.rx = Math.random() * 6; l.ry = Math.random() * 6; l.rz = Math.random() * 6;
    if (ground) { l.x += (Math.random() - 0.5) * 6; l.z += (Math.random() - 0.5) * 6; l.rx = l.rz = 0; }
  };
  S.forEach((l, i) => { spawn(l, Math.random() * 40, i < N * 0.55); leaves.setColorAt(i, palette[i % palette.length]); });
  scene.add(leaves);
  const dummy = new THREE.Object3D();

  function updateLeaves(dt, t, wind, sw) {
    for (let i = 0; i < N; i++) {
      const l = S[i];
      if (l.delay > 0) { l.delay -= dt * (1 + wind); dummy.position.set(0, -50, 0); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix); continue; }
      if (l.st === 0) {                                   // đang rơi
        l.y -= (0.55 + Math.sin(t * 2 + l.seed) * 0.2) * dt;
        l.x += (Math.sin(t * 1.7 + l.seed) * 0.7 + wind * 1.6) * dt;
        l.z += (Math.cos(t * 1.3 + l.seed) * 0.6 + wind * 0.5) * dt;
        l.rx += dt * 2.2; l.rz += dt * 1.6; l.ry += dt;
        if (l.y <= 0.04) { l.y = 0.04; l.st = 1; l.age = 0; l.rx = (Math.random() - 0.5) * 0.3; l.rz = (Math.random() - 0.5) * 0.3; }
      } else if (l.st === 1) {                            // nằm trên sân
        l.age += dt;
        if (sw.active) {
          const dx = l.x - sw.tip.x, dz = l.z - sw.tip.z;
          if (dx * dx + dz * dz < 1.0) {
            const cx = PILE.x - l.x, cz = PILE.z - l.z, len = Math.hypot(cx, cz) || 1, push = 2.2 + Math.random();
            l.vx = cx / len * push; l.vz = cz / len * push; l.vy = 1.4; l.ry += 1;
          }
        }
        if (wind > 1.2) { l.vx += wind * 0.6 * dt * Math.sin(l.seed); l.vz += wind * 0.3 * dt; }
        l.x += l.vx * dt; l.z += l.vz * dt; l.y += l.vy * dt; l.vy -= 9 * dt;
        if (l.y < 0.04) { l.y = 0.04; l.vy = 0; }
        const f = Math.exp(-dt * 3.2); l.vx *= f; l.vz *= f;
        if (Math.hypot(l.x - PILE.x, l.z - PILE.z) < 0.9 && Math.abs(l.vx) < 0.4) { l.st = 2; l.y = 0.06 + Math.random() * 0.35; }
        if (l.age > 200) spawn(l, Math.random() * 20);
      }
      l.x = clamp(l.x, -38.5, -9.5); l.z = clamp(l.z, 10, 54);
      dummy.position.set(l.x, l.y, l.z); dummy.rotation.set(l.rx, l.ry, l.rz); dummy.scale.setScalar(1); dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
    }
    leaves.instanceMatrix.needsUpdate = true;
  }
  const collectPile = () => S.forEach(l => { if (l.st === 2) spawn(l, 5 + Math.random() * 60); });
  { const basket = new THREE.Group(); basket.position.set(PILE.x + 1.4, 0, PILE.z - 0.8); scene.add(basket);
    mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.55, 12, 1, true), mat('basket', 0xa8844a, { side: THREE.DoubleSide }), 0, 0.28, 0, basket); }
  let lastPhase = 0;

  /* ---------------- chư Tăng kinh hành quanh lư hương ---------------- */
  const monks = [];
  for (let i = 0; i < 5; i++) {
    const m = makeHuman({ robe: i === 0 ? '#d9a127' : '#e0ae3a', shaved: true, kasaya: '#a8521f', skinTone: i });
    scene.add(m.root); monks.push(m);
  }
  { const l = makeLabel('Chư Tăng kinh hành', { npc: true }); l.position.y = monks[0].height + 0.15; l.scale.multiplyScalar(0.8); monks[0].root.add(l); }
  const WALK_R = 5.8, WALK_W = 0.12;

  /* ---------------- thầy tụng kinh gõ mõ trong chánh điện ---------------- */
  const seated = makeSeated({ robe: '#d9a127', shaved: true, kasaya: '#a8521f', skinTone: 1, closedEyes: true });
  seated.root.position.set(MO_MONK.x, POD, MO_MONK.z + 0.78); seated.root.rotation.y = Math.PI; scene.add(seated.root);
  { const c = mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.18, 18), mat('cushion', 0xb5452a), 0, 0.09, 0, seated.root); void c; }
  const mallet = new THREE.Group(); seated.arms[-1].hand.add(mallet);
  mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.34, 6), mat('wood', 0x4a2617), 0, 0.24, 0, mallet);
  mesh(new THREE.SphereGeometry(0.045, 10, 8), mat('red', 0x8e1a10), 0, 0.42, 0, mallet);
  { const l = makeLabel('Thầy tụng kinh', { npc: true }); l.position.y = 1.35; l.scale.multiplyScalar(0.75); seated.root.add(l); }
  let lastBeat = 0;
  const moRest = V3(1.1, 0.8, 0.9);

  /* ---------------- chú tiểu thỉnh chuông (mỗi 2 phút) ---------------- */
  const bellBoy = makeHuman({ robe: '#7b5a3c', shaved: true, tuft: true, child: true, skinTone: 3 });
  bellBoy.root.position.set(BELL.x + 2.9, UP + 0.5, BELL.z + 1.4); bellBoy.root.rotation.y = -Math.PI / 2 - 0.4; scene.add(bellBoy.root);
  let lastBellIdx = null, bellAnim = 0;

  /* ---------------- chim bồ câu quanh sân, hải âu trên biển ---------------- */
  const wingGeo = new THREE.BoxGeometry(0.5, 0.03, 0.22); wingGeo.translate(0.25, 0, 0);
  function makeBird(material, scale) {
    const b = new THREE.Group();
    mesh(new THREE.SphereGeometry(0.16, 10, 8), material, 0, 0, 0, b, false).scale.set(0.8, 0.8, 1.8);
    mesh(new THREE.SphereGeometry(0.09, 8, 6), material, 0, 0.07, 0.28, b, false);
    const wl = new THREE.Group(), wr = new THREE.Group(); b.add(wl, wr);
    mesh(wingGeo, material, 0, 0, 0, wl, false); mesh(wingGeo, material, 0, 0, 0, wr, false).scale.x = -1;
    b.scale.setScalar(scale);
    return { b, wl, wr };
  }
  const doves = new THREE.Group(); scene.add(doves);
  const gulls = new THREE.Group(); scene.add(gulls);
  const doveM = [mat('dove1', 0xf2f0ea), mat('dove2', 0x9aa0a8)], gullM = mat('gull', 0xf4f6f6);
  const dFlock = [], gFlock = [];
  for (let i = 0; i < 22; i++) {
    const o = makeBird(doveM[i % 3 === 0 ? 1 : 0], 1); doves.add(o.b);
    dFlock.push({ ...o, o: Math.random() * 6.28, r: 3 + Math.random() * 7, h: Math.random() * 4, sp: 0.9 + Math.random() * 0.3 });
  }
  for (let i = 0; i < 9; i++) {
    const o = makeBird(gullM, 2.2); gulls.add(o.b);
    gFlock.push({ ...o, o: Math.random() * 6.28, r: 14 + Math.random() * 30, h: Math.random() * 20, sp: 0.5 + Math.random() * 0.3 });
  }

  /* ---------------- khỉ Sơn Trà ---------------- */
  const furM = mat('monkeyFur', 0x8d6b4b, { roughness: 1 }), faceM = mat('monkeyFace', 0xe3b79a, { roughness: 0.8 }), darkM = mat('monkeyDark', 0x2a1d14);
  function makeMonkey() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    mesh(new THREE.SphereGeometry(0.2, 12, 10), furM, 0, 0.26, 0, body, false).scale.set(1, 0.95, 1.35);
    const head = new THREE.Group(); head.position.set(0, 0.46, 0.21); body.add(head);
    mesh(new THREE.SphereGeometry(0.115, 12, 10), furM, 0, 0, 0, head, false);
    mesh(new THREE.SphereGeometry(0.085, 10, 8), faceM, 0, -0.015, 0.075, head, false).scale.set(1, 0.9, 0.8);
    for (const s of [-1, 1]) {
      mesh(new THREE.SphereGeometry(0.03, 8, 6), darkM, s * 0.045, 0.02, 0.115, head, false);
      mesh(new THREE.SphereGeometry(0.04, 8, 6), faceM, s * 0.115, 0, -0.01, head, false).scale.set(0.5, 1, 0.8);
      mesh(new THREE.CapsuleGeometry(0.035, 0.18, 3, 6), furM, s * 0.14, 0.2, 0.14, body, false).rotation.x = 0.4;
      mesh(new THREE.CapsuleGeometry(0.045, 0.16, 3, 6), furM, s * 0.12, 0.1, -0.12, body, false).rotation.x = -0.5;
    }
    const tail = [V3(0, 0.25, -0.25), V3(0, 0.2, -0.5), V3(0, 0.35, -0.7), V3(0, 0.6, -0.72)];
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tail), 12, 0.025, 5), furM, 0, 0, 0, body, false);
    g.scale.setScalar(1.35);
    return { g, head, body };
  }
  const SEG = 30, MOVE = 7;   // mỗi chặng 30 giây: nghỉ 23 giây rồi chạy 7 giây tới điểm kế tiếp
  const monkeyRoutes = [
    [V3(-39.9, 2.9, 42), V3(-39.9, 2.9, 31), V3(-39.9, 2.9, 20)],
    [V3(BODHI.x + 2.8, 1.62, BODHI.z - 1.2), V3(BODHI.x + 5.5, 0.05, BODHI.z - 4), V3(BODHI.x + 1, 0.05, BODHI.z + 5.5)],
    [V3(-19.8, 7.25, -20), V3(-19.8, 7.25, -32), V3(-19.8, 7.25, -26)]
  ];
  const monkeys = monkeyRoutes.map((route, i) => { const m = makeMonkey(); scene.add(m.g); return { ...m, route, off: i * 11, ph: i * 2.1 }; });
  const _m0 = V3(), _m1 = V3();
  function updateMonkeys(st, t, env) {
    const hide = env.night > 0.6 || env.rain > 0.35 || env.mist > 0.8;     // ngủ trong rừng, trú mưa
    for (const m of monkeys) {
      m.g.visible = !hide;
      if (hide) continue;
      const s = st + m.off, seg = Math.floor(s / SEG), n = m.route.length;
      const into = s - seg * SEG, a = m.route[seg % n], b = m.route[(seg + 1) % n];
      if (into > SEG - MOVE) {
        const u = smoothstep(0, 1, (into - (SEG - MOVE)) / MOVE);
        _m0.lerpVectors(a, b, u);
        m.g.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
        m.g.position.copy(_m0); m.g.position.y += Math.abs(Math.sin(u * Math.PI * 14)) * 0.07;
        m.body.rotation.x = 0.25; m.head.rotation.y = 0;
      } else {
        m.g.position.copy(a);
        m.g.rotation.y = lerpAngle(m.g.rotation.y, Math.atan2(b.x - a.x, b.z - a.z) + Math.sin(seg * 7 + m.off) * 1.4, 0.02);
        m.body.rotation.x = 0;
        m.head.rotation.y = Math.sin(t * 0.7 + m.ph) * 0.7;
        m.head.rotation.x = Math.max(0, Math.sin(t * 1.9 + m.ph * 3)) * 0.25;
      }
    }
  }

  /* ---------------- cá chép koi trong hồ sen ---------------- */
  const kois = [], koiCols = [0xf26a1b, 0xffffff, 0xe8341c, 0xf5b52a];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group(); scene.add(g);
    const m = mat('koi' + (i % 4), koiCols[i % 4], { roughness: 0.4 });
    mesh(new THREE.SphereGeometry(0.16, 10, 8), m, 0, 0, 0, g, false).scale.set(0.7, 0.45, 2.2);
    const tail = mesh(new THREE.ConeGeometry(0.14, 0.3, 4), m, 0, 0, -0.42, g, false); tail.rotation.x = -Math.PI / 2; tail.scale.x = 0.25;
    if (i % 2) mesh(new THREE.SphereGeometry(0.07, 6, 6), mat('koiSpot', 0xd8261a), 0, 0.05, 0.1, g, false);
    kois.push({ g, tail, r: 1.8 + Math.random() * 4, sp: (0.3 + Math.random() * 0.3) * (i % 3 ? 1 : -1), o: Math.random() * 6.28 });
  }

  /* ---------------- cờ Phật giáo ---------------- */
  const flagTex = canvasTex(300, 180, (g, w, h) => {
    const C = ['#0050c8', '#ffd400', '#e00000', '#ffffff', '#ff8c00'], cw = w / 6;
    C.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * cw, 0, cw + 1, h); });
    C.forEach((c, i) => { g.fillStyle = c; g.fillRect(5 * cw, i * h / 5, cw, h / 5 + 1); });
  });
  const flags = W.flagSpots.map(s => {
    mesh(new THREE.CylinderGeometry(0.06, 0.09, 9, 8), mat('pole', 0xe8e1d0), s.x, s.y + 4.5, s.z, scene);
    mesh(new THREE.SphereGeometry(0.16, 10, 8), mat('goldBall', 0xe2aa3c), s.x, s.y + 9.1, s.z, scene, false);
    const geo = new THREE.PlaneGeometry(2.8, 1.7, 16, 6); geo.translate(1.4, 0, 0);
    const fm = mesh(geo, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.8 }), s.x, s.y + 8, s.z, scene, false);
    fm.rotation.y = Math.PI * 0.9;
    return { m: fm, base: Float32Array.from(geo.attributes.position.array), ph: Math.random() * 6 };
  });

  /* ---------------- hoa đăng trên hồ sen (instanced) ---------------- */
  const MAXL = 100, lanterns = new Map();
  const petalG = new THREE.SphereGeometry(0.2, 8, 6), pieces = [];
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * 6.28, g = petalG.clone();
    g.scale(0.55, 0.9, 1.3); g.rotateZ(0.6); g.rotateY(-a); g.translate(Math.cos(a) * 0.26, 0.1, Math.sin(a) * 0.26);
    pieces.push(g.toNonIndexed());
  }
  const lanternPetals = new THREE.InstancedMesh(mergeGeometries(pieces, false), mat('hdPetal', 0xf4a3b8, { emissive: 0x7a2038, emissiveIntensity: 0.6 }), MAXL);
  const candleG = new THREE.CylinderGeometry(0.09, 0.09, 0.2, 10); candleG.translate(0, 0.2, 0);
  const lanternCandle = new THREE.InstancedMesh(candleG, new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffa040, emissiveIntensity: 2.5 }), MAXL);
  const flameG = new THREE.SphereGeometry(0.075, 8, 6); flameG.scale(1, 1.7, 1); flameG.translate(0, 0.38, 0);
  const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 0.8) });
  const lanternFlame = new THREE.InstancedMesh(flameG, flameMat, MAXL);
  for (const im of [lanternPetals, lanternCandle, lanternFlame]) { im.count = 0; im.frustumCulled = false; scene.add(im); }
  L.addLantern = l => { if (!lanterns.has(l.id)) lanterns.set(l.id, l); };

  function updateLanterns(st, t) {
    let n = 0;
    for (const [id, l] of lanterns) {
      const age = st - l.t / 1000;
      if (age > LANTERN_LIFE_MS / 1000 || age < -5) { lanterns.delete(id); continue; }
      if (n >= MAXL) break;
      const a = Math.max(0, age), sd = l.seed;
      const rho = 1.8 + sd * (POND.r - 3.4), dir = sd > 0.5 ? 1 : -1, w = (0.035 + (sd * 7 % 1) * 0.03) * dir;
      const th = Math.PI + w * a;
      const ox = POND.x + Math.cos(th) * rho, oz = POND.z + Math.sin(th) * rho;
      const sx = POND.x - POND.r + 1.1, sz = POND.z + (sd - 0.5) * 3;       // điểm thả ở bờ phía lối đi
      const k = smoothstep(0, 5, a);
      dummy.position.set(lerp(sx, ox, k), 0.25 + Math.sin(t * 1.5 + sd * 20) * 0.015, lerp(sz, oz, k));
      dummy.rotation.set(Math.sin(t * 1.1 + sd * 9) * 0.05, a * 0.1 + sd * 6, Math.cos(t * 0.9 + sd * 5) * 0.05);
      dummy.scale.setScalar(1.25); dummy.updateMatrix();
      lanternPetals.setMatrixAt(n, dummy.matrix); lanternCandle.setMatrixAt(n, dummy.matrix);
      dummy.scale.set(1.25, 1.25 * (0.9 + Math.sin(t * 13 + sd * 50) * 0.18), 1.25); dummy.updateMatrix();
      lanternFlame.setMatrixAt(n, dummy.matrix);
      n++;
    }
    for (const im of [lanternPetals, lanternCandle, lanternFlame]) { im.count = n; im.instanceMatrix.needsUpdate = true; }
  }

  /* ---------------- nén nhang trên lư hương (instanced, cháy ngắn dần) ---------------- */
  const MAXS = 90, sticks = new Map();
  const stickG = new THREE.CylinderGeometry(0.022, 0.022, 1, 5); stickG.translate(0, 0.5, 0);
  const stickIM = new THREE.InstancedMesh(stickG, new THREE.MeshStandardMaterial({ color: 0xa83a24 }), MAXS);
  const emberIM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.7, 0.2) }), MAXS);
  for (const im of [stickIM, emberIM]) { im.count = 0; im.frustumCulled = false; W.incense.add(im); }
  L.addIncense = s => {
    if (sticks.has(s.id)) return;
    const h = (s.id * 2654435761 % 1000) / 1000;
    sticks.set(s.id, { ...s, tx: (h - 0.5) * 0.3, tz: ((h * 7.3) % 1 - 0.5) * 0.3 });
    while (sticks.size > MAXS) sticks.delete(sticks.keys().next().value);
  };
  let stickTimer = 0;
  function updateSticks(dt, nowMs) {
    stickTimer -= dt; if (stickTimer > 0) return; stickTimer = 0.5;
    let n = 0;
    for (const [id, s] of sticks) {
      const age = (nowMs - s.t) / INCENSE_LIFE_MS;
      if (age >= 1) { sticks.delete(id); continue; }
      const len = lerp(1.4, 0.18, Math.max(0, age));
      dummy.position.set(s.x, 0, s.z); dummy.rotation.set(s.tz, 0, -s.tx); dummy.scale.set(1, len, 1); dummy.updateMatrix();
      stickIM.setMatrixAt(n, dummy.matrix);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1); dummy.position.set(s.x + Math.sin(s.tx) * len, Math.cos(s.tx) * len, s.z + Math.sin(s.tz) * len); dummy.updateMatrix();
      emberIM.setMatrixAt(n, dummy.matrix);
      n++;
    }
    for (const im of [stickIM, emberIM]) { im.count = n; im.instanceMatrix.needsUpdate = true; }
  }
  L.incenseCount = () => sticks.size;

  /* ---------------- hạt môi trường: đom đóm, hoa sứ rơi, khói nhang ---------------- */
  const FF = 200, ffGeo = new THREE.BufferGeometry(), ffPos = new Float32Array(FF * 3), ffSeed = [];
  for (let i = 0; i < FF; i++) {
    const x = -36 + R() * 120, z = R() < 0.75 ? 6 + R() * 48 : -68 + R() * 64;
    ffPos.set([x, heightAt(x, z) + 0.6 + R() * 6, z], i * 3); ffSeed.push(R() * 100);
  }
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  const fireflies = new THREE.Points(ffGeo, new THREE.PointsMaterial({ size: 0.4, map: softDot('rgba(255,230,140,1)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd38a, opacity: 0 }));
  fireflies.frustumCulled = false; scene.add(fireflies);

  const PT = 220, ptGeo = new THREE.BufferGeometry(), ptPos = new Float32Array(PT * 3);
  for (let i = 0; i < PT; i++) ptPos.set([(R() - 0.5) * 80, R() * 16, (R() - 0.5) * 80], i * 3);
  ptGeo.setAttribute('position', new THREE.BufferAttribute(ptPos, 3));
  const petals = new THREE.Points(ptGeo, new THREE.PointsMaterial({ size: 0.26, color: 0xfff2cf, map: softDot('rgba(255,244,214,1)'), transparent: true, depthWrite: false }));
  petals.frustumCulled = false; scene.add(petals);

  const smokeTex = softDot('rgba(235,230,225,.55)');
  const smoke = Array.from({ length: 40 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.userData.life = Math.random() * 5; scene.add(s); return s;
  });
  let burstSmoke = 0;
  L.burst = () => { burstSmoke = 1; };

  /* ======================= CẬP NHẬT ======================= */
  const tipW = V3(), tmpQ = V3();
  L.update = (dt, st, t, env, me, focus) => {
    /* chú tiểu quét lá */
    const tp = tieuPose(st);
    tieu.root.position.set(tp.x, heightAt(tp.x, tp.z), tp.z);
    tieu.root.rotation.y = lerpAngle(tieu.root.rotation.y, tp.ry, Math.min(1, dt * 6));
    const sws = tp.sweeping ? Math.sin(t * 3.2) : 0;
    tieu.upper.rotation.set(0.32, sws * 0.22, 0);
    tieu.idle(dt, t);
    placeBroom(sws);
    if (tp.walking) tieu.step(t * 6, 0.6); else tieu.step(0, 0);
    tieu.body.position.y = tp.walking ? Math.abs(Math.sin(t * 6)) * 0.02 : 0;
    tieu.root.updateMatrixWorld(true);
    tipW.copy(bB).applyMatrix4(tieu.body.matrixWorld);
    updateLeaves(dt, t, env.wind, { active: tp.sweeping && sws * sws > 0.3, tip: tipW });
    if (lastPhase < 0.86 && tp.p >= 0.86) collectPile();
    lastPhase = tp.p;

    /* chư Tăng kinh hành */
    monks.forEach((m, i) => {
      const a = st * WALK_W - i * 0.4, x = BURNER.x + Math.cos(a) * WALK_R, z = BURNER.z + Math.sin(a) * WALK_R;
      m.root.position.set(x, heightAt(x, z), z);
      m.root.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
      const ph = st * 2.3 + i;
      m.body.position.y = Math.abs(Math.sin(ph)) * 0.012;
      m.step(ph, 0.55); m.anjali(); m.idle(dt, t);
    });

    /* thầy tụng kinh gõ mõ */
    const ph = (st / 0.85) % 1, beat = Math.floor(st / 0.85);
    const lift = Math.max(0, Math.sin(ph * Math.PI * 2));
    seated.reach(-1, -0.02, 0.33 + lift * 0.13, 0.42, -1, -0.4, -0.3);
    seated.reach(1, 0.1, 0.1, 0.34, 1, -0.7, -0.2);
    seated.idle(dt, t);
    if (beat !== lastBeat) {
      lastBeat = beat;
      W.anim.monkMo.scale.set(1.18, 0.72, 0.9);
      if (me) {
        const d = me.root.position.distanceTo(seated.root.position);
        if (d < 22) sfx.mo(0.28 * (1 - d / 22));
      }
    }
    W.anim.monkMo.scale.lerp(moRest, Math.min(1, dt * 10));

    /* chú tiểu thỉnh chuông */
    const bi = Math.floor((st + BELL_PERIOD_S / 2) / BELL_PERIOD_S);
    if (lastBellIdx === null) lastBellIdx = bi;
    if (bi !== lastBellIdx) { lastBellIdx = bi; bellAnim = 1; L.onAutoBell?.(); }
    if (bellAnim > 0) {
      bellAnim = Math.max(0, bellAnim - dt * 0.5);
      const pull = Math.sin((1 - bellAnim) * Math.PI * 3) * bellAnim;
      bellBoy.reach(1, 0.06, 0.55 - pull * 0.16, 0.34, 1, -0.5, -0.2); bellBoy.reach(-1, -0.06, 0.55 - pull * 0.16, 0.34, -1, -0.5, -0.2);
      bellBoy.grip(1, 0.9); bellBoy.grip(-1, 0.9);
      bellBoy.upper.rotation.x = -pull * 0.15;
    } else { bellBoy.anjali(); bellBoy.upper.rotation.x = 0; }
    bellBoy.idle(dt, t);

    /* chim */
    doves.visible = env.birds > 0.5;
    if (doves.visible) {
      const cx = Math.sin(st * 0.05) * 20 + 10, cz = 28 + Math.cos(st * 0.037) * 14;
      dFlock.forEach((f, i) => {
        const a = st * 0.35 * f.sp + f.o;
        f.b.position.set(cx + Math.cos(a) * (12 + f.r), 15 + f.h * 2 + Math.sin(st * 0.5 + i) * 1.5, cz + Math.sin(a) * (12 + f.r));
        f.b.rotation.y = -a;
        const fl = Math.sin(t * 14 + i) * 0.8; f.wl.rotation.z = fl; f.wr.rotation.z = -fl;
      });
    }
    gulls.visible = env.birds > 0.5;
    if (gulls.visible) {
      const cx = 40 + Math.sin(st * 0.021) * 30, cz = 92 + Math.cos(st * 0.017) * 22;
      gFlock.forEach((f, i) => {
        const a = st * 0.12 * f.sp + f.o;
        f.b.position.set(cx + Math.cos(a) * f.r * 1.6, 8 + f.h * 0.4 + Math.sin(st * 0.3 + i) * 3, cz + Math.sin(a) * f.r);
        f.b.rotation.y = -a; f.b.rotation.z = 0.12;
        const fl = Math.sin(t * 3.2 + i * 1.7) * 0.45 * (0.4 + 0.6 * Math.max(0, Math.sin(t * 0.3 + i)));
        f.wl.rotation.z = fl + 0.1; f.wr.rotation.z = -fl - 0.1;
      });
    }

    /* cá koi */
    kois.forEach((k, i) => {
      const a = st * k.sp + k.o, r = k.r + Math.sin(st * 0.3 + i) * 0.6;
      k.g.position.set(POND.x + Math.cos(a) * r, 0.12, POND.z + Math.sin(a) * r);
      k.g.rotation.y = -a + (k.sp > 0 ? 0 : Math.PI);
      k.tail.rotation.y = Math.sin(t * 8 + i) * 0.5;
    });

    /* cờ phấp phới */
    const wind = 0.35 + env.wind;
    flags.forEach(f => {
      const p = f.m.geometry.attributes.position, b = f.base;
      for (let i = 0; i < p.count; i++) {
        const x = b[i * 3], y = b[i * 3 + 1], u = x / 2.8;
        p.array[i * 3 + 2] = Math.sin(u * 5 - t * (3 + wind * 3) + f.ph) * 0.28 * u * Math.min(1.5, wind);
        p.array[i * 3 + 1] = y - u * u * Math.max(0, 0.9 - wind) * 0.9;
        p.array[i * 3] = x * (0.92 + 0.08 * Math.min(1, wind));
      }
      p.needsUpdate = true; f.m.geometry.computeVertexNormals();
    });

    updateMonkeys(st, t, env);
    updateLanterns(st, t);
    updateSticks(dt, st * 1000);

    /* đom đóm (đêm) */
    const night = env.night;
    fireflies.material.opacity = night * (0.7 + Math.sin(t * 2) * 0.25) * (1 - env.rain);
    if (fireflies.material.opacity > 0.01) {
      const fp = ffGeo.attributes.position;
      for (let i = 0; i < FF; i++) {
        const s = ffSeed[i];
        fp.array[i * 3] += Math.sin(t * 0.5 + s) * dt * 0.4; fp.array[i * 3 + 1] += Math.cos(t * 0.7 + s) * dt * 0.2; fp.array[i * 3 + 2] += Math.cos(t * 0.4 + s * 2) * dt * 0.4;
      }
      fp.needsUpdate = true;
    }
    /* hoa sứ rơi quanh người chơi */
    petals.material.opacity = env.petals; petals.visible = env.petals > 0.05;
    if (petals.visible) {
      const pp = ptGeo.attributes.position, fx = focus.x, fz = focus.z;
      for (let i = 0; i < PT; i++) {
        pp.array[i * 3 + 1] -= dt * 0.7;
        pp.array[i * 3] += (Math.sin(t + i) * 0.5 + env.wind) * dt;
        let x = pp.array[i * 3] - fx, z = pp.array[i * 3 + 2] - fz;
        if (x > 40) x -= 80; else if (x < -40) x += 80;
        if (z > 40) z -= 80; else if (z < -40) z += 80;
        pp.array[i * 3] = fx + x; pp.array[i * 3 + 2] = fz + z;
        if (pp.array[i * 3 + 1] < heightAt(fx + x, fz + z)) { pp.array[i * 3 + 1] = heightAt(fx, fz) + 14 + R() * 4; pp.array[i * 3] = fx + (R() - 0.5) * 80; pp.array[i * 3 + 2] = fz + (R() - 0.5) * 80; }
      }
      pp.needsUpdate = true;
    }
    /* khói nhang bốc từ lư hương */
    const active = Math.min(40, 8 + sticks.size * 0.5 + burstSmoke * 18);
    burstSmoke = Math.max(0, burstSmoke - dt * 0.3);
    smoke.forEach((s, i) => {
      s.userData.life += dt;
      if (s.userData.life > 5) { s.userData.life = 0; s.position.set(W.smokeOrigin.x + (Math.random() - 0.5) * 1.5, W.smokeOrigin.y - 1, W.smokeOrigin.z + (Math.random() - 0.5) * 1.5); }
      const k = s.userData.life / 5;
      s.position.y += dt * 1.0; s.position.x += (Math.sin(t + i) * 0.25 + env.wind * 0.8) * dt;
      s.scale.setScalar(0.6 + k * 3);
      s.material.opacity = i < active ? Math.sin(k * Math.PI) * 0.32 * (1 - env.rain * 0.6) : 0;
    });
  };

  L.bellBoy = bellBoy;
  L.tmp = tmp; void tmpQ;
  return L;
}
