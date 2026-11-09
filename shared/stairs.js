/* ĐƯỜNG MÂY: 1.080 bậc thang hành hương lên núi Sơn Trà, phía sau chùa, bên trái (phía tây) khi đi từ cổng Tam Quan vào.
 *
 * Mười chặng, mỗi chặng 108 bậc (1.080 = 10 x 108, số hạt chuỗi). Mỗi chặng là một đoạn dốc thẳng dài 36,72 m
 * (bậc cao 0,17 m, sâu 0,34 m) lên 18,36 m, kết thúc ở một sân nghỉ hình tròn. Đoạn lẻ đi hướng tây bắc, đoạn chẵn
 * đi hướng đông bắc nên đường chữ chi leo dần lên núi.
 *
 * File này chỉ có toán thuần (không phụ thuộc three.js) để server dùng cho giới hạn đi lại và đường đi của Phật tử ảo,
 * client dùng cho độ cao nền, địa hình và dựng bậc thang.
 */
export const PILGRIM = { steps: 1080, stages: 10, perStage: 108, riser: 0.17, tread: 0.34, width: 5, landingR: 5.5 };

const { perStage, riser, tread, width, landingR } = PILGRIM;
const BASE_H = 5;                                   // = UP trong layout.js (cao độ sân trên)
const SQ = Math.SQRT1_2;
export const LEG = perStage * tread;                // chiều dài mặt bằng một chặng
export const RISE = perStage * riser;               // độ cao mỗi chặng
export const START = { x: -49, z: -68 };            // sân nghỉ số 0, ngay ngoài cổng mở ở tường tây sân sau
export const GATE_CORRIDOR = { x1: -50, x2: -37.5, z1: -71.5, z2: -64.5 };   // lối từ sân sau ra sân nghỉ số 0

export const STAIR_LANDINGS = [{ i: 0, x: START.x, z: START.z, h: BASE_H }];
export const STAIR_LEGS = [];
for (let i = 0; i < PILGRIM.stages; i++) {
  const ux = i % 2 === 0 ? -SQ : SQ, uz = -SQ;      // lẻ: tây bắc, chẵn: đông bắc
  const C = STAIR_LANDINGS[i], h1 = BASE_H + RISE * (i + 1);
  STAIR_LEGS.push({ i, ax: C.x + ux * landingR, az: C.z + uz * landingR, ux, uz, h0: BASE_H + RISE * i, h1 });
  STAIR_LANDINGS.push({ i: i + 1, x: C.x + ux * (LEG + 2 * landingR), z: C.z + uz * (LEG + 2 * landingR), h: h1 });
}
export const SUMMIT = STAIR_LANDINGS[PILGRIM.stages];

/* Độ dốc trung bình của sườn núi theo hướng bắc, để địa hình được vuốt thành một mặt dốc đều dưới đường chữ chi. */
export const RAMP_K = (SUMMIT.h - BASE_H) / (START.z - SUMMIT.z);

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const HALF = width / 2;

/* Điểm (x, z) có nằm trên bậc thang / sân nghỉ không? margin = lề cho phép ngoài mép (m).
 * Trả về { kind: 'leg'|'landing', i, h, s?, c? } hoặc null. h = cao độ mặt đi. */
export function stairQuery(x, z, margin = 0) {
  for (const L of STAIR_LANDINGS) {
    if (Math.hypot(x - L.x, z - L.z) <= landingR + margin) return { kind: 'landing', i: L.i, h: L.h };
  }
  for (const g of STAIR_LEGS) {
    const dx = x - g.ax, dz = z - g.az;
    const s = dx * g.ux + dz * g.uz, c = -dx * g.uz + dz * g.ux;
    if (s >= -1.5 && s <= LEG + 1.5 && Math.abs(c) <= HALF + margin) {
      return { kind: 'leg', i: g.i, s, c, h: g.h0 + RISE * clamp(s / LEG, 0, 1) };
    }
  }
  return null;
}

/* Khoảng cách tới tập bậc thang (0 nếu đang ở trên) và cao độ mặt đi tại điểm gần nhất; dùng để vuốt địa hình. */
export function stairDistance(x, z) {
  let d = Infinity, h = BASE_H;
  for (const L of STAIR_LANDINGS) {
    const k = Math.max(0, Math.hypot(x - L.x, z - L.z) - landingR);
    if (k < d) { d = k; h = L.h; }
  }
  for (const g of STAIR_LEGS) {
    const dx = x - g.ax, dz = z - g.az;
    const s = dx * g.ux + dz * g.uz, c = -dx * g.uz + dz * g.ux;
    const k = Math.hypot(s < 0 ? -s : s > LEG ? s - LEG : 0, Math.max(0, Math.abs(c) - HALF));
    if (k < d) { d = k; h = g.h0 + RISE * clamp(s / LEG, 0, 1); }
  }
  const G = GATE_CORRIDOR;
  const k = Math.hypot(Math.max(G.x1 - x, 0, x - G.x2), Math.max(G.z1 - z, 0, z - G.z2));
  if (k < d) { d = k; h = BASE_H; }
  return { d, h };
}

/* Điểm đi được gần (x, z) nhất trên hệ bậc thang + lối cổng. Dùng cho server khi kẹp vị trí. Trả về [x, z, khoảng cách]. */
export function stairNearest(x, z) {
  let best = null;
  const take = (px, pz) => { const d = Math.hypot(x - px, z - pz); if (!best || d < best[2]) best = [px, pz, d]; };
  for (const L of STAIR_LANDINGS) {
    const d = Math.hypot(x - L.x, z - L.z), r = landingR + 0.4;
    if (d <= r) take(x, z); else take(L.x + (x - L.x) / d * r, L.z + (z - L.z) / d * r);
  }
  for (const g of STAIR_LEGS) {
    const dx = x - g.ax, dz = z - g.az;
    const s = clamp(dx * g.ux + dz * g.uz, -1.5, LEG + 1.5), c = clamp(-dx * g.uz + dz * g.ux, -HALF - 0.4, HALF + 0.4);
    take(g.ax + g.ux * s - g.uz * c, g.az + g.uz * s + g.ux * c);
  }
  const G = GATE_CORRIDOR;
  take(clamp(x, G.x1, G.x2), clamp(z, G.z1, G.z2));
  return best;
}

/* Tiến độ hành hương: bậc đã đi qua (0..1080) và chặng (1..10) nếu đang ở trên bậc thang, ngược lại null. */
export function stairProgress(x, z) {
  const q = stairQuery(x, z, 0.6);
  if (!q) return null;
  if (q.kind === 'leg') {
    const k = clamp(Math.floor(Math.max(0, q.s) / tread) + 1, 1, perStage);
    return { step: q.i * perStage + k, stage: q.i + 1, landing: false };
  }
  return { step: q.i * perStage, stage: Math.max(1, q.i), landing: true, landingIndex: q.i };
}

/* Đường đi dọc bậc thang cho Phật tử ảo: từ cổng, qua từng chặng, lên tới đỉnh. */
export const STAIR_ROUTE = [[GATE_CORRIDOR.x2 - 1, START.z], [START.x, START.z]];
for (const g of STAIR_LEGS) {
  STAIR_ROUTE.push([g.ax, g.az]);
  STAIR_ROUTE.push([g.ax + g.ux * LEG, g.az + g.uz * LEG]);
}
