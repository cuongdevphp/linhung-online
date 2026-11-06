/* Phật tử "ảo" luôn có mặt trong chùa cho cảnh bớt vắng: 5 vị ngồi thiền trong chánh điện,
 * 2 vị lễ Phật Bà Quán Thế Âm, 3 vị đi dạo. Họ nằm chung Map `players` với người thật nên client
 * hiển thị, đếm số người và gửi vị trí y như người chơi bình thường, không cần sửa client nhiều.
 * Lộ trình đi dạo đã chọn thẳng qua các khoảng trống (không đụng cột đèn, La Hán, chậu cảnh, ao sen). */
import * as L from '../shared/layout.js';

const TICK_MS = 100;
const WALK_SPEED = 1.4;          // m/s, đi thong thả
const ROBE = i => L.ROBES[i][0];

/* Ngồi trên 5 trong 15 bồ đoàn (chỉ số = hàng * 5 + cột), quay mặt vào bàn thờ. */
const MEDITATORS = [
  ['Thích Thiện Tâm', 1, 0], ['Thích Giác Minh', 3, 1], ['Thích Từ Quang', 6, 2],
  ['Thích Nguyên Hạnh', 11, 1], ['Thích Huệ Đăng', 14, 0]
];

/* Đứng sau tượng Quán Thế Âm khoảng 20 m, giữa hai đèn đá, quay mặt về phía tượng. */
const BOWERS = [
  ['Thích Tâm An', 64.8, 49.8, 2],
  ['Thích Diệu Pháp', 67.2, 49.8, 3]
];

/* Đi qua lại giữa các điểm; dừng nghỉ vài giây ở mỗi đầu. */
const WALKERS = [
  ['Thích Đức Hòa', 5, [[-2, 16], [2, 31], [-2, 47], [2, 31]]],        // lối chính giữa hai hàng đèn
  ['Thích Minh Hạnh', 1, [[-16.5, 16], [-16.5, 48]]],                  // sân phía tây
  ['Thích Thanh Tịnh', 3, [[16.5, 16], [16.5, 48]]]                    // sân phía đông, cạnh ao sen
];

const rand = (a, b) => a + Math.random() * (b - a);
const wrap = ry => ((ry % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

/* Trả về số NPC đã thêm (để server không tính vào giới hạn người chơi). */
export function startNpcs(players, io, merit) {
  let n = 0;
  const add = (name, color, x, z, ry, sitting = false) => {
    const id = 'npc-' + (++n);
    const p = { id, name, color, x, z, ry, moving: false, sitting, lastMove: Date.now(), npc: true };
    players.set(id, p);
    return p;
  };

  MEDITATORS.forEach(([name, ci, ri], i) => {
    const c = L.CUSHIONS[ci];
    add(name, ROBE((ri + i) % L.ROBES.length), c.x, c.z, Math.PI, true);
  });

  const bowers = BOWERS.map(([name, x, z, ri]) => add(name, ROBE(ri), x, z, Math.PI));
  bowers.forEach((p, i) => { p.nextBow = Date.now() + 6000 + i * 9000; });

  const walkers = WALKERS.map(([name, ri, route]) => {
    const p = add(name, ROBE(ri), route[0][0], route[0][1], 0);
    Object.assign(p, { route, wi: 1, pause: rand(1, 5) });
    return p;
  });

  setInterval(() => {
    const now = Date.now(), dt = TICK_MS / 1000;

    for (const p of bowers) {
      if (now < p.nextBow) continue;
      p.nextBow = now + rand(14000, 28000);
      io.emit('action', { id: p.id, type: 'bow', merit: merit(), npc: true });   // npc: không nảy bộ đếm công đức
    }

    for (const p of walkers) {
      if (p.pause > 0) {
        p.pause -= dt;
        if (p.moving) { p.moving = false; io.volatile.emit('moved', { id: p.id, x: p.x, z: p.z, ry: p.ry, moving: false }); }
        continue;
      }
      const [tx, tz] = p.route[p.wi], dx = tx - p.x, dz = tz - p.z, dist = Math.hypot(dx, dz), step = WALK_SPEED * dt;
      if (dist <= step) {
        p.x = tx; p.z = tz;
        p.wi = (p.wi + 1) % p.route.length;
        p.pause = rand(3, 9);
        p.moving = false;
      } else {
        p.x += dx / dist * step; p.z += dz / dist * step;
        p.ry = wrap(Math.atan2(dx, dz));
        p.moving = true;
      }
      io.volatile.emit('moved', { id: p.id, x: p.x, z: p.z, ry: p.ry, moving: p.moving });
    }
  }, TICK_MS).unref();

  return n;
}
