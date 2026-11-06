import * as THREE from 'three';
import { softDot } from './util.js';

/* Các kiểu thời tiết. Server chọn và đồng bộ cho mọi người chơi.
 * az: góc phương vị mặt trời (rad, 0 = đông, π/2 = nam, π = tây), el: góc nâng (rad). */
export const PRESETS = {
  nang:     { label: '☀️ Nắng đẹp',   top: 0x2f6fc0, mid: 0x8dbfe8, bot: 0xdcebf0, sun: 0xfff0d2, sunI: 3.2,  az: 1.05, el: 1.0,  hemi: 1.1,  fog: 0xcfe0e8, fogNear: 70, fogFar: 380, exp: 1.0,  rain: 0,   cloud: 0.3,  cloudDark: 0,    wind: 0.3,  night: 0,    stars: 0, mist: 0,   storm: 0, birds: 1, petals: 1,   disc: 1 },
  binhminh: { label: '🌅 Bình minh',  top: 0x35568f, mid: 0xe6a58f, bot: 0xffd7a6, sun: 0xffb97a, sunI: 2.7,  az: 0.32, el: 0.14, hemi: 0.9,  fog: 0xf0cba8, fogNear: 55, fogFar: 340, exp: 1.08, rain: 0,   cloud: 0.45, cloudDark: 0.05, wind: 0.25, night: 0.15, stars: 0, mist: 0.2, storm: 0, birds: 1, petals: 0.6, disc: 1 },
  hoanghon: { label: '🌇 Hoàng hôn',  top: 0x283a78, mid: 0xd47f86, bot: 0xf5a565, sun: 0xffa860, sunI: 2.6,  az: 2.75, el: 0.13, hemi: 0.85, fog: 0xe3a07c, fogNear: 60, fogFar: 320, exp: 1.08, rain: 0,   cloud: 0.4,  cloudDark: 0.1,  wind: 0.3,  night: 0.35, stars: 0, mist: 0,   storm: 0, birds: 1, petals: 1,   disc: 1 },
  may:      { label: '☁️ Trời âm u',  top: 0x67778a, mid: 0x9ea9b3, bot: 0xc0c5c8, sun: 0xdfe6ee, sunI: 0.9,  az: 1.05, el: 0.95, hemi: 1.35, fog: 0xb1b9be, fogNear: 45, fogFar: 260, exp: 1.0,  rain: 0,   cloud: 1,    cloudDark: 0.35, wind: 0.7,  night: 0.1,  stars: 0, mist: 0.1, storm: 0, birds: 1, petals: 0.5, disc: 0 },
  mua:      { label: '🌧️ Mưa',        top: 0x39424c, mid: 0x5b666f, bot: 0x79838a, sun: 0xc8d0d8, sunI: 0.4,  az: 1.05, el: 0.95, hemi: 1.0,  fog: 0x6c767c, fogNear: 12, fogFar: 150, exp: 1.05, rain: 0.6, cloud: 1,    cloudDark: 0.7,  wind: 0.9,  night: 0.3,  stars: 0, mist: 0.3, storm: 0, birds: 0, petals: 0,   disc: 0 },
  giong:    { label: '⛈️ Giông bão',  top: 0x1a2028, mid: 0x2f3741, bot: 0x444c55, sun: 0xaeb8c4, sunI: 0.25, az: 1.05, el: 0.95, hemi: 0.7,  fog: 0x39414a, fogNear: 8,  fogFar: 115, exp: 1.1,  rain: 1,   cloud: 1,    cloudDark: 1,    wind: 1.8,  night: 0.6,  stars: 0, mist: 0.3, storm: 1, birds: 0, petals: 0,   disc: 0 },
  suong:    { label: '🌫️ Sương mù',   top: 0xa7b2b8, mid: 0xcdd4d7, bot: 0xe3e7e8, sun: 0xfff6e8, sunI: 0.9,  az: 0.9,  el: 0.5,  hemi: 1.5,  fog: 0xdce2e4, fogNear: 2,  fogFar: 75,  exp: 1.0,  rain: 0,   cloud: 0.5,  cloudDark: 0,    wind: 0.1,  night: 0.15, stars: 0, mist: 1,   storm: 0, birds: 0, petals: 0.3, disc: 0.3 },
  dem:      { label: '🌙 Đêm trăng',  top: 0x040818, mid: 0x0e1836, bot: 0x22304e, sun: 0x9fb6ff, sunI: 0.55, az: 2.2,  el: 0.85, hemi: 0.3,  fog: 0x121a30, fogNear: 30, fogFar: 230, exp: 1.2,  rain: 0,   cloud: 0.25, cloudDark: 0.6,  wind: 0.2,  night: 1,    stars: 1, mist: 0.1, storm: 0, birds: 0, petals: 0,   disc: 0 }
};
const COLOR_KEYS = ['top', 'mid', 'bot', 'sun', 'fog'];
const NUM_KEYS = Object.keys(PRESETS.nang).filter(k => k !== 'label' && !COLOR_KEYS.includes(k));

const SKY_VERT = /* glsl */`
  varying vec3 vP;
  void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FRAG = /* glsl */`
  uniform vec3 top, mid, bot, sunDir, sunCol;
  uniform float disc, night, flash;
  varying vec3 vP;
  void main(){
    vec3 p = normalize(vP);
    float h = p.y;
    vec3 c = mix(bot, mid, smoothstep(-0.05, 0.22, h));
    c = mix(c, top, smoothstep(0.2, 0.8, h));
    float s = max(dot(p, normalize(sunDir)), 0.0);
    float glow = pow(s, mix(10.0, 60.0, night)) * mix(0.55, 0.15, night);
    float halo = pow(s, 3.0) * 0.10 * (1.0 - night);
    float core = smoothstep(mix(0.9993, 0.9996, night), mix(0.9997, 0.9999, night), s);
    c += sunCol * (glow + halo + core * mix(4.0, 2.0, night)) * disc;
    c += vec3(0.8, 0.85, 1.0) * flash;
    gl_FragColor = vec4(c, 1.0);
  }`;

export function createWeather(scene, renderer, sun, hemi) {
  const cur = {}, tgt = {};
  const init = PRESETS.nang;
  for (const k of COLOR_KEYS) { cur[k] = new THREE.Color(init[k]); tgt[k] = new THREE.Color(init[k]); }
  for (const k of NUM_KEYS) { cur[k] = init[k]; tgt[k] = init[k]; }
  let key = 'nang';
  const sunDir = new THREE.Vector3(0, 1, 0);

  /* ---------- bầu trời ---------- */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: cur.top.clone() }, mid: { value: cur.mid.clone() }, bot: { value: cur.bot.clone() },
      sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() },
      disc: { value: 1 }, night: { value: 0 }, flash: { value: 0 }
    },
    vertexShader: SKY_VERT, fragmentShader: SKY_FRAG
  });
  const skyGeo = new THREE.SphereGeometry(450, 32, 16);
  const sky = new THREE.Mesh(skyGeo, skyMat); sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);

  /* Môi trường phản chiếu (PMREM) dựng từ chính bầu trời: làm sáng vật liệu PBR và mặt biển. */
  const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(skyGeo, skyMat));
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null, envTimer = 0, envDirty = true;
  const updateEnv = () => {
    const rt = pmrem.fromScene(envScene, 0.04, 0.1, 1000);
    if (envRT) envRT.dispose();
    envRT = rt; scene.environment = rt.texture;
  };

  /* ---------- sao & trăng ---------- */
  const sp = [];
  for (let i = 0; i < 1800; i++) {
    const u = Math.random() * Math.PI * 2, v = Math.acos(Math.random() * 0.95);
    sp.push(Math.sin(v) * Math.cos(u) * 420, Math.cos(v) * 420, Math.sin(v) * Math.sin(u) * 420);
  }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  stars.frustumCulled = false; scene.add(stars);

  const moonTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const glow = g.createRadialGradient(128, 128, 20, 128, 128, 128);
    glow.addColorStop(0, 'rgba(235,240,255,.55)'); glow.addColorStop(1, 'rgba(235,240,255,0)');
    g.fillStyle = glow; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#f4f6ff'; g.beginPath(); g.arc(128, 128, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(170,180,210,.35)';
    [[118, 120, 7], [138, 132, 5], [124, 140, 4]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  moon.scale.setScalar(70); moon.frustumCulled = false; scene.add(moon);

  /* ---------- mây ---------- */
  const cloudTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    for (let i = 0; i < 26; i++) {
      const x = 50 + Math.random() * 156, y = 90 + Math.random() * 80, r = 30 + Math.random() * 50;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    }
    return new THREE.CanvasTexture(c);
  })();
  const CLOUD_CX = 40, CLOUD_CZ = 0, CLOUD_R = 330;
  const clouds = [];
  for (let i = 0; i < 46; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0 }));
    const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 260;
    s.position.set(CLOUD_CX + Math.cos(a) * d, 70 + Math.random() * 60, CLOUD_CZ + Math.sin(a) * d);
    s.scale.set(110 + Math.random() * 120, 60 + Math.random() * 40, 1);
    s.frustumCulled = false; scene.add(s); clouds.push(s);
  }

  /* ---------- mưa ---------- */
  const RN = 6000;
  const rainPos = new Float32Array(RN * 6);
  const rainBase = Array.from({ length: RN }, () => [(Math.random() - 0.5) * 80, Math.random() * 40, (Math.random() - 0.5) * 80]);
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xb8c6d4, transparent: true, opacity: 0.45, depthWrite: false }));
  rain.frustumCulled = false; rain.visible = false; scene.add(rain);

  /* ---------- sương ---------- */
  const mistTex = softDot('rgba(235,238,240,.9)', 128);
  const mists = [];
  for (let i = 0; i < 40; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.position.set(-40 + Math.random() * 150, 1.5 + Math.random() * 5, (Math.random() - 0.5) * 130);
    s.scale.set(26 + Math.random() * 20, 7 + Math.random() * 5, 1);
    s.userData.v = 0.3 + Math.random() * 0.6;
    s.visible = false; scene.add(s); mists.push(s);
  }

  /* ---------- sét ---------- */
  const boltGeo = new THREE.BufferGeometry();
  boltGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(3 * 40), 3));
  const bolt = new THREE.Line(boltGeo, new THREE.LineBasicMaterial({ color: 0xe8f0ff, fog: false, transparent: true }));
  bolt.visible = false; bolt.frustumCulled = false; scene.add(bolt);
  let flash = 0, boltT = 0, nextStrike = 4;

  const tmpC = new THREE.Color(), cloudC = new THREE.Color(), dark = new THREE.Color(0x3a4048), white = new THREE.Color(0xffffff);

  const api = {
    get key() { return key; },
    get label() { return PRESETS[key].label; },
    cur, sunDir, onThunder: null,

    set(k, instant = false) {
      const p = PRESETS[k]; if (!p) return;
      key = k;
      for (const c of COLOR_KEYS) tgt[c].set(p[c]);
      for (const n of NUM_KEYS) tgt[n] = p[n];
      if (instant) {
        for (const c of COLOR_KEYS) cur[c].copy(tgt[c]);
        for (const n of NUM_KEYS) cur[n] = tgt[n];
      }
      envDirty = true;
    },

    update(dt, t, camPos, focus) {
      const k = 1 - Math.exp(-dt * 0.45);
      let diff = 0;
      for (const c of COLOR_KEYS) { diff += Math.abs(cur[c].r - tgt[c].r); cur[c].lerp(tgt[c], k); }
      for (const n of NUM_KEYS) { diff += Math.abs(cur[n] - tgt[n]); cur[n] += (tgt[n] - cur[n]) * k; }

      // hướng mặt trời / mặt trăng
      sunDir.set(Math.cos(cur.az) * Math.cos(cur.el), Math.sin(cur.el), Math.sin(cur.az) * Math.cos(cur.el)).normalize();
      const u = skyMat.uniforms;
      u.sunDir.value.copy(sunDir);
      u.top.value.copy(cur.top); u.mid.value.copy(cur.mid); u.bot.value.copy(cur.bot);
      u.sunCol.value.copy(cur.sun); u.disc.value = cur.disc; u.night.value = cur.night;

      // đèn mặt trời bám theo người chơi để bóng đổ luôn sắc nét quanh họ
      const fx = Math.round(focus.x / 2) * 2, fz = Math.round(focus.z / 2) * 2;
      sun.position.set(fx + sunDir.x * 120, sunDir.y * 120, fz + sunDir.z * 120);
      sun.target.position.set(fx, 0, fz);
      sun.color.copy(cur.sun); sun.intensity = cur.sunI;
      hemi.color.copy(cur.mid).lerp(white, 0.5);
      hemi.intensity = cur.hemi;
      scene.fog.color.copy(cur.fog); scene.fog.near = cur.fogNear; scene.fog.far = cur.fogFar;
      renderer.toneMappingExposure = cur.exp;
      scene.environmentIntensity = 0.55 * (1 - cur.night * 0.75);
      sky.position.copy(camPos); stars.position.copy(camPos);

      stars.material.opacity = cur.stars * (1 - cur.cloud * 0.6);
      moon.position.copy(camPos).addScaledVector(sunDir, 400);
      moon.material.opacity = cur.stars;

      // mây
      cloudC.copy(white).lerp(dark, cur.cloudDark).lerp(cur.sun, 0.15 * (1 - cur.cloudDark));
      if (cur.night > 0.8) cloudC.multiplyScalar(0.25);
      clouds.forEach((c, i) => {
        c.position.x += (2 + cur.wind * 6) * dt * (0.7 + (i % 5) * 0.1);
        if (c.position.x > CLOUD_CX + CLOUD_R) c.position.x = CLOUD_CX - CLOUD_R;
        c.material.opacity = Math.min(0.95, cur.cloud * (0.55 + (i % 4) * 0.12));
        c.material.color.copy(cloudC);
      });

      // mưa
      const rn = Math.floor(RN * cur.rain);
      rainGeo.setDrawRange(0, rn * 2);
      rain.visible = rn > 10;
      if (rain.visible) {
        const spd = 28 + cur.rain * 10, slant = cur.wind * 0.35;
        for (let i = 0; i < rn; i++) {
          const b = rainBase[i];
          b[1] -= spd * dt; b[0] += slant * spd * dt * 0.3;
          if (b[1] < 0) { b[1] += 40; b[0] = (Math.random() - 0.5) * 80; }
          if (b[0] > 40) b[0] -= 80;
          const x = camPos.x + b[0], y = camPos.y - 8 + b[1], z = camPos.z + b[2];
          rainPos[i * 6] = x; rainPos[i * 6 + 1] = y; rainPos[i * 6 + 2] = z;
          rainPos[i * 6 + 3] = x - slant * 0.6; rainPos[i * 6 + 4] = y + 0.7; rainPos[i * 6 + 5] = z;
        }
        rainGeo.attributes.position.needsUpdate = true;
        rain.material.opacity = 0.25 + cur.night * 0.15;
      }

      // sương
      const showMist = cur.mist > 0.02;
      tmpC.copy(cur.fog);
      mists.forEach(m => {
        m.visible = showMist;
        if (!showMist) return;
        m.position.x += m.userData.v * dt * (0.5 + cur.wind);
        if (m.position.x > 110) m.position.x = -40;
        m.material.opacity = cur.mist * 0.42;
        m.material.color.copy(tmpC);
      });

      // sét
      flash = Math.max(0, flash - dt * 4);
      if (cur.storm > 0.6) {
        nextStrike -= dt;
        if (nextStrike <= 0) {
          nextStrike = 5 + Math.random() * 10;
          flash = 1.2; boltT = 0.25;
          const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 150;
          let x = camPos.x + Math.cos(a) * d, z = camPos.z + Math.sin(a) * d, y = 130;
          const arr = boltGeo.attributes.position.array;
          for (let i = 0; i < 40; i++) { arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z; x += (Math.random() - 0.5) * 9; z += (Math.random() - 0.5) * 9; y -= 3.4; }
          boltGeo.attributes.position.needsUpdate = true;
          api.onThunder?.(0.4 + Math.random() * 1.6, 0.6 + Math.random() * 0.4);
        }
      }
      boltT = Math.max(0, boltT - dt);
      bolt.visible = boltT > 0 && ((boltT * 30) | 0) % 2 === 0;
      const fl = flash > 0 ? Math.max(0, Math.sin(flash * 12)) * flash : 0;
      u.flash.value = fl * 0.6;
      hemi.intensity += fl * 3;

      envTimer -= dt;
      if ((envDirty || diff > 0.05) && envTimer <= 0) { updateEnv(); envTimer = 1.5; envDirty = diff > 0.02; }
    }
  };
  updateEnv();
  return api;
}
