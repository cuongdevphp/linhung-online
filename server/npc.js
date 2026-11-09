/* Phật tử "ảo" luôn có mặt trong chùa cho cảnh bớt vắng: 5 vị ngồi thiền trong chánh điện,
 * 2 vị lễ Phật Bà Quán Thế Âm, 3 vị đi dạo, và 11 Phật tử tại gia ở sân ngoài. Họ nằm chung Map `players` với người thật nên client
 * hiển thị, đếm số người và gửi vị trí y như người chơi bình thường, không cần sửa client nhiều.
 * Lộ trình đi dạo đã chọn thẳng qua các khoảng trống (không đụng cột đèn, La Hán, chậu cảnh, ao sen). */
import * as L from '../shared/layout.js';

const TICK_MS = 100;
const WALK_SPEED = 1.4;          // m/s, đi thong thả
const ROBE = i => L.ROBES[i][0];

/* Ngồi trên 5 trong 15 bồ đoàn (chỉ số = hàng * 5 + cột), quay mặt vào bàn thờ. */
const MEDITATORS = [
  ['Thiện Tâm', 1, 0], ['Giác Minh', 3, 1], ['Từ Quang', 6, 2],
  ['Nguyên Hạnh', 11, 1], ['Huệ Đăng', 14, 0]
];

/* Đứng sau tượng Quán Thế Âm khoảng 20 m, giữa hai đèn đá, quay mặt về phía tượng. */
const BOWERS = [
  ['Tâm An', 64.8, 49.8, 2],
  ['Diệu Pháp', 67.2, 49.8, 3]
];

/* Đi qua lại giữa các điểm; dừng nghỉ vài giây ở mỗi đầu. */
const WALKERS = [
  ['Đức Hòa', 5, [[-2, 16], [2, 31], [-2, 47], [2, 31]]],        // lối chính giữa hai hàng đèn
  ['Minh Hạnh', 1, [[-16.5, 16], [-16.5, 48]]],                  // sân phía tây
  ['Thanh Tịnh', 3, [[16.5, 16], [16.5, 48]]]                    // sân phía đông, cạnh ao sen
];

/* ---- 11 Phật tử tại gia ở sân ngoài: sân trước chánh điện (cao độ sân trên) và sân dưới ---- */

/* Đứng yên quay mặt về (fx, fz); bow = thỉnh thoảng cúi lạy; sit = ngồi bệt (không có bồ đoàn). */
const LAY_STANDERS = [
  { name: 'Nguyễn Thu Hà', robe: 4, x: -1.6, z: -2.3, face: [0, -6], bow: true },       // trước lư hương
  { name: 'Trần Văn Bình', robe: 1, x: 1.6, z: -2.3, face: [0, -6], bow: true },
  { name: 'Lê Ngọc Lan', robe: 5, x: 16.5, z: -5, face: [22, -6], bow: true },           // ngắm gác chuông
  { name: 'Phạm Quốc Bảo', robe: 2, x: 15.2, z: 31.8, face: [26, 33], bow: false },      // bên hồ sen
  { name: 'Hoàng Mai Phương', robe: 0, x: 15.2, z: 34.2, face: [26, 33], bow: true },
  { name: 'Đặng Văn Hùng', robe: 3, x: -22.5, z: 31.5, face: [-27, 31], sit: true }      // ngồi dưới cội bồ đề
];

/* Đi vòng cung bên kia ao sen (cách tâm ao 11 m, ngoài vòng chắn của ao), tránh phía tây nơi có người đứng ngắm hoa sen.
 * Đi tới cuối cung thì quay lại theo đường cũ. */
const POND_ARC = Array.from({ length: 9 }, (_, i) => {
  const a = (-144 + i * 36) * Math.PI / 180;
  return [L.POND.x + Math.cos(a) * 11, L.POND.z + Math.sin(a) * 11];
});
const POND_LOOP = POND_ARC.concat(POND_ARC.slice(1, -1).reverse());

const LAY_WALKERS = [
  { name: 'Vũ Thanh Tâm', robe: 5, route: [[-30, -1.2], [30, -1.2]] },                   // dọc sân trước chánh điện
  { name: 'Bùi Đức Thịnh', robe: 1, route: [[-29, -12], [-29, -2]] },                    // phía gác trống
  { name: 'Đỗ Bảo Châu', robe: 4, route: POND_LOOP },                                    // dạo quanh ao sen
  { name: 'Ngô Hoàng Nam', robe: 2, route: [[42, 18], [42, 46], [47, 46]] },             // sân phía tượng Quán Thế Âm
  { name: 'Lý Lan Hương', robe: 0, route: [[3.5, 46], [3.5, -1.2]] }                     // đi thẳng lên đại bậc thang
];

/* ---- Phật tử làm công quả trong nhà bếp (nhà trù). Toạ độ và hướng nhìn theo hệ cục bộ của nhà (L.KITCHEN), khớp với public/js/kitchen.js ---- */
const KITCHEN_WORKERS = [
  { name: 'Bác Năm', robe: 1, x: -7.5, z: -0.95, ry: Math.PI, act: 'stir' },              // khuấy nồi cơm
  { name: 'Dì Tư', robe: 4, x: -3.5, z: -0.95, ry: Math.PI, act: 'stir' },                // khuấy nồi canh
  { name: 'Chú Ba', robe: 2, x: 0.5, z: -0.9, ry: Math.PI, act: 'fan', sit: true },       // ngồi quạt lửa bên xửng hấp
  { name: 'Cô Sáu', robe: 5, x: 4.6, z: -0.65, ry: Math.PI, act: 'chop' },                // thái rau
  { name: 'Anh Tám', robe: 3, x: 6.4, z: -0.65, ry: Math.PI, act: 'chop' },
  { name: 'Cô Lan', robe: 0, x: -3.9, z: 1.45, ry: Math.PI / 2, act: 'pick', sit: true },  // ngồi lặt rau, đối diện nhau qua rổ
  { name: 'Chị Hạnh', robe: 4, x: -2.1, z: 1.45, ry: -Math.PI / 2, act: 'pick', sit: true },
  { name: 'Bác Bảy', robe: 1, x: 1.8, z: 1.3, ry: 0, act: 'pick', sit: true }
];

/* ---- Trai đường (nhà ăn): 5 thầy và 5 Phật tử ngồi dùng cơm, 1 người xới cơm. Toạ độ cục bộ theo L.DINING,
 * khớp với SEAT_X / SEAT_ROWS / RICE_TUB trong public/js/dining.js. Dãy z = -2.4 và 1.1 quay mặt về nam (ry 0), dãy -0.4 và 3.1 quay về bắc (ry π). ---- */
const DINERS = [
  { name: 'Thầy Minh Đức', monk: true, robe: 1, x: -3, z: -2.4 },
  { name: 'Thầy Huệ Quang', monk: true, robe: 3, x: -1, z: -2.4 },
  { name: 'Thầy Thiện Nhân', monk: true, robe: 1, x: 1, z: -2.4 },
  { name: 'Thầy Giác Hạnh', monk: true, robe: 0, x: -1, z: -0.4 },
  { name: 'Thầy Từ Bi', monk: true, robe: 3, x: 1, z: -0.4 },
  { name: 'Chị Ngọc Anh', robe: 4, x: -3, z: 1.1 },
  { name: 'Bác Tư Lộc', robe: 2, x: 1, z: 1.1 },
  { name: 'Anh Quang Vinh', robe: 5, x: 3, z: 1.1 },
  { name: 'Cô Diệu Hiền', robe: 4, x: -1, z: 3.1 },
  { name: 'Bác Hai Nghĩa', robe: 1, x: 1, z: 3.1 }
];
const DINING_SERVER = { name: 'Bác Chín', robe: 5, x: 5.4, z: -1.0 };   // xới cơm ở thùng, đứng quay về bắc

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

  for (const s of LAY_STANDERS) {
    const p = add(s.name, ROBE(s.robe), s.x, s.z, wrap(Math.atan2(s.face[0] - s.x, s.face[1] - s.z)), !!s.sit);
    if (s.bow) { p.nextBow = Date.now() + rand(3000, 20000); bowers.push(p); }
  }

  for (const k of KITCHEN_WORKERS) {
    const [wx, wz] = L.kitchenToWorld(k.x, k.z);                 // nhà bếp xoay -90°: đổi toạ độ cục bộ sang thế giới
    const p = add(k.name, ROBE(k.robe), wx, wz, wrap(k.ry + L.KITCHEN.rot), !!k.sit);
    p.act = k.act;
  }

  for (const d of DINERS) {
    const p = add(d.name, ROBE(d.robe), L.DINING.x + d.x, L.DINING.z + d.z, d.z === -0.4 || d.z === 3.1 ? Math.PI : 0, true);
    p.act = 'eat';
    if (d.monk) p.monk = true;
  }
  const sv = add(DINING_SERVER.name, ROBE(DINING_SERVER.robe), L.DINING.x + DINING_SERVER.x, L.DINING.z + DINING_SERVER.z, Math.PI);
  sv.act = 'stir';

  for (const w of LAY_WALKERS) {
    const start = Math.floor(Math.random() * w.route.length);          // mỗi người bắt đầu ở một điểm khác nhau
    const p = add(w.name, ROBE(w.robe), w.route[start][0], w.route[start][1], 0);
    Object.assign(p, { route: w.route, wi: (start + 1) % w.route.length, pause: rand(0, 6) });
    walkers.push(p);
  }

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
