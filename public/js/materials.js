import * as THREE from 'three';
import { mat, canvasTex, rng } from './util.js';

/* Vật liệu và texture thủ tục của chùa. Vật liệu có userData.worldUV được bake()
   tính lại UV theo toạ độ thế giới (mật độ texel đồng đều). */
const R = rng(2026);

const roofTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#8f4220'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) {
    const gr = g.createLinearGradient(0, y, 0, y + 32);
    gr.addColorStop(0, '#c0602d'); gr.addColorStop(0.7, '#9a4821'); gr.addColorStop(1, '#4a1f0d');
    g.fillStyle = gr; g.fillRect(0, y, w, 32);
    for (let x = 0; x < w; x += 16) {
      g.fillStyle = 'rgba(40,12,4,.42)'; g.fillRect(x, y, 3, 32);
      g.fillStyle = 'rgba(255,210,150,.12)'; g.fillRect(x + 4, y, 4, 30);
    }
  }
});

const stoneTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#8f897b'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const off = r % 2 ? 32 : 0, v = 168 + R() * 36 | 0;
    g.fillStyle = `rgb(${v},${v - 5},${v - 16})`;
    g.fillRect(c * 64 + off + 2 - (off && c === 3 ? 64 : 0), r * 64 + 2, 60, 60);
    if (off && c === 0) g.fillRect(0, r * 64 + 2, 30, 60);
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.07})`; g.fillRect(R() * w, R() * h, 2, 2); }
});

const paveTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#8a8272'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const v = 196 + R() * 26 | 0; g.fillStyle = `rgb(${v},${v - 10},${v - 30})`;
    g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
    for (let k = 0; k < 50; k++) { g.fillStyle = `rgba(90,70,45,${R() * 0.12})`; g.fillRect(i * 64 + 2 + R() * 58, j * 64 + 2 + R() * 58, 2, 2); }
  }
});

const brickTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#5e3a26'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 16; r++) for (let c = 0; c < 5; c++) {
    const v = 150 + R() * 40 | 0; g.fillStyle = `rgb(${v},${v * 0.56 | 0},${v * 0.38 | 0})`;
    g.fillRect(c * 56 + (r % 2) * 28 - 28, r * 16 + 1, 54, 14);
  }
});

const grassTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#4f7a37'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = R() > 0.5 ? `rgba(125,168,75,${R() * 0.35})` : `rgba(28,62,26,${R() * 0.35})`;
    g.fillRect(R() * w, R() * h, 2, 3);
  }
});

const plasterTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#f0dba4'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(120,90,40,${R() * 0.07})`; g.fillRect(R() * w, R() * h, 2, 2); }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,250,225,${R() * 0.08})`; g.fillRect(R() * w, R() * h, 2, 2); }
});

/* Cửa chấn song: một ô song gỗ vàng trên nền đỏ, ánh xạ 0..1 trên mỗi tấm. */
export const latticeTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#e1b968'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#6e1810'; g.fillRect(40, 50, 176, 150);
  g.strokeStyle = '#d9a24a'; g.lineWidth = 6;
  for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(40 + i * 22, 50); g.lineTo(40 + i * 22, 200); g.stroke(); }
  for (let i = 0; i <= 6; i++) { g.beginPath(); g.moveTo(40, 50 + i * 25); g.lineTo(216, 50 + i * 25); g.stroke(); }
  g.strokeStyle = '#b8862e'; g.lineWidth = 10; g.strokeRect(36, 46, 184, 158);
});

function worldMat(map, scale, o = {}) {
  const m = new THREE.MeshStandardMaterial({ map, roughness: 0.9, ...o });
  m.userData.worldUV = scale;
  return m;
}

export const M = {
  RED: mat('red', 0x8e1a10, { roughness: 0.42 }),
  RED2: mat('red2', 0x6e140c, { roughness: 0.5 }),
  WOOD: mat('wood', 0x4a2617, { roughness: 0.7 }),
  WALL: worldMat(plasterTex, 0.35, { roughness: 0.92 }),
  DARK: mat('dstone', 0x5f584e),
  GOLD: mat('gold', 0xe2aa3c, { metalness: 0.9, roughness: 0.26, emissive: 0x2a1800 }),
  BRONZE: mat('bronze', 0x6e4a2c, { metalness: 0.85, roughness: 0.32 }),
  JADE: mat('jade', 0x3f8a6a, { metalness: 0.4, roughness: 0.35 }),
  WHITE: mat('whitestone', 0xf1ece2, { roughness: 0.55 }),
  RIDGE: mat('ridge', 0x6d2f15, { roughness: 0.6 }),
  STONE: worldMat(stoneTex, 0.42, { roughness: 0.92 }),
  PAVE: worldMat(paveTex, 0.36, { roughness: 0.88 }),
  BRICK: worldMat(brickTex, 0.62, { roughness: 0.85 }),
  GRASS: worldMat(grassTex, 0.17, { roughness: 1 }),
  ROOF: new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.62, side: THREE.DoubleSide }),
  LATTICE: new THREE.MeshStandardMaterial({ map: latticeTex, roughness: 0.8 }),
  CUSHION: mat('cushion', 0xb5452a),
  CANDLE: mat('candle', 0xf7ecd2),
  POT: mat('pot', 0x2f5c7a, { roughness: 0.35, metalness: 0.2 }),
  /* Đèn lồng đỏ: độ sáng điều khiển theo ban đêm. */
  LANTERN: new THREE.MeshStandardMaterial({ color: 0xd8321c, emissive: 0xff3a10, emissiveIntensity: 1.2, roughness: 0.6 }),
  /* Ngọc quý trên nóc mái và tượng vàng: phát sáng nhẹ. */
  PEARL: new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xff8a20, emissiveIntensity: 1.8 }),
  /* Vàng hai mặt cho vật mỏng như quạt. */
  BGOLD2: new THREE.MeshStandardMaterial({ color: 0xe2aa3c, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }),
  FLOOR: new THREE.MeshStandardMaterial({ color: 0x6b2a1c, roughness: 0.25, metalness: 0.15 }),
  BACKDROP: mat('backdrop', 0x7a1a10, { roughness: 0.5 }),
  CARVED: mat('carvedgold', 0xc8902e, { metalness: 0.7, roughness: 0.35 }),
  /* Vàng của tượng Phật trong chánh điện, phát sáng dần về đêm. */
  BGOLD: new THREE.MeshStandardMaterial({ color: 0xe2aa3c, metalness: 0.85, roughness: 0.3, emissive: 0xb86f12, emissiveIntensity: 0.9 }),
  HALO: new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffc060, emissiveIntensity: 1.4 }),
  /* Tượng Phật Bà đá trắng. */
  MARBLE: new THREE.MeshStandardMaterial({ color: 0xf5f2ea, roughness: 0.5, metalness: 0, emissive: 0xfff2dc, emissiveIntensity: 0, side: THREE.DoubleSide })
};

export const R_WORLD = R;
