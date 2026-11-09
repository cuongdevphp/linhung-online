import { UP, POD, BELL, DRUM, inBounds, CUSHIONS, CUSHION_H } from '/shared/layout.js';
import { stairQuery } from '/shared/stairs.js';

/* Cao độ mặt đi được và va chạm đơn giản (hộp + trụ tròn). */
export const STAIR_RUN = 10.5;   // đại bậc thang dài 10,5 m (21 bậc)

export function heightAt(x, z) {
  if (x < -41) { const q = stairQuery(x, z, 0.6); if (q) return q.h; }   // Đường Mây 1.080 bậc: dốc liên tục theo chặng, sân nghỉ phẳng
  if (z <= 0) {
    if (Math.abs(x) < 20 && z > -38 && z < -14) return POD;
    if (Math.abs(x) < 8 && z >= -14 && z < -10.5) return UP + (POD - UP) * (-10.5 - z) / 3.5;
    if (Math.abs(x - BELL.x) < 4 && Math.abs(z - BELL.z) < 4) return UP + 0.5;
    if (Math.abs(x - DRUM.x) < 4 && Math.abs(z - DRUM.z) < 4) return UP + 0.5;
    if (Math.abs(x) > 30.75 && Math.abs(x) < 38.4 && z > -62 && z < -6) return UP + 0.6;   // nền hành lang tả vu, hữu vu
    return UP;
  }
  if (z < STAIR_RUN && Math.abs(x) < 7) return UP * (STAIR_RUN - z) / STAIR_RUN;
  return 0;
}

/* Bồ đoàn gần nhất trong tầm 1,3 m (null nếu không có), để ngồi thiền tự vào đúng chỗ. */
export function cushionNear(x, z) {
  let best = null, bd = 1.3;
  for (const c of CUSHIONS) { const d = Math.hypot(x - c.x, z - c.z); if (d < bd) { bd = d; best = c; } }
  return best;
}
/* Độ nâng khi ngồi: bằng chiều cao bồ đoàn nếu đang ngồi đúng trên một chiếc. */
export function seatLiftAt(x, z) {
  for (const c of CUSHIONS) if (Math.hypot(x - c.x, z - c.z) < 0.5) return CUSHION_H;
  return 0;
}

const boxes = [], circles = [];
export const blockBox = (x1, x2, z1, z2) => boxes.push({ x1, x2, z1, z2 });
export const blockCircle = (x, z, r) => circles.push({ x, z, r });

const PAD = 0.35;   // bán kính người chơi
export function blocked(x, z, fromH) {
  if (!inBounds(x, z)) return true;
  for (const b of boxes) if (x > b.x1 - PAD && x < b.x2 + PAD && z > b.z1 - PAD && z < b.z2 + PAD) return true;
  for (const c of circles) { const dx = x - c.x, dz = z - c.z, r = c.r + PAD; if (dx * dx + dz * dz < r * r) return true; }
  return Math.abs(heightAt(x, z) - fromH) > 0.7;
}
