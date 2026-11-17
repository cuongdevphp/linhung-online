/* Hằng số bố cục dùng chung cho server (kiểm tra hành động) và client (dựng thế giới).
 *
 * Hệ toạ độ: +x hướng đông (phía biển), +z hướng nam (cổng Tam Quan, nhìn ra biển),
 * -z hướng lên núi Sơn Trà. Đơn vị: mét.
 */

import { stairQuery, stairNearest, stairWalk, GATE_CORRIDOR } from './stairs.js';
import { SUMMIT_SPOTS } from './summit.js';

export const UP = 5;        // cao độ sân trên (stairs.js dùng cùng giá trị làm chân Đường Mây)
export const POD = 6.2;     // cao độ nền Đại Hùng Bảo Điện

export const GATE = { x: 0, z: 56 };
export const HALL = { x: 0, z: -26 };
export const BURNER = { x: 0, z: -6 };
export const BELL = { x: 22, z: -6 };
export const DRUM = { x: -22, z: -6 };
export const MO_PLAYER = { x: 7, z: -22.5 };
export const MO_MONK = { x: -7, z: -22.5 };
export const POND = { x: 26, z: 33, r: 8 };
export const LAKE_SPOT = { x: 16.2, z: 33 };
export const BODHI = { x: -27, z: 31 };
export const PILE = { x: -21, z: 22 };
export const STATUE = { x: 66, z: 30 };
/* Nhà bếp (nhà trù) ở sân sau, tựa vào hành lang hữu vu. Toạ độ cục bộ của nhà: +x đông, +z là phía mặt hở,
 * -z là tường sau. Nhà xoay -90° quanh trục đứng: tường sau quay về phía đông (sát hành lang),
 * mặt hở nhìn ra giữa sân sau, trục dài chạy bắc-nam. */
export const KITCHEN = { x: 26.1, z: -50, rot: -Math.PI / 2 };
/* Nhà ăn (trai đường) sát tường sau của sân sau, góc đông bắc, kế đầu bắc nhà bếp. Không xoay: mặt hở nhìn về phía nam (+z). */
export const DINING = { x: 31.9, z: -69.6 };
export function kitchenToWorld(lx, lz) {
  const c = Math.cos(KITCHEN.rot), s = Math.sin(KITCHEN.rot);
  return [KITCHEN.x + lx * c + lz * s, KITCHEN.z - lx * s + lz * c];
}

/* Công quả: người chơi làm một việc kéo dài 5 đến 10 giây (server chọn ngẫu nhiên) thì được WORK_MERIT công đức.
 *   sweep: quét lá bồ đề ở sân dưới, đứng đâu trong vùng SWEEP_SPOT cũng được, quay mặt về đống lá (PILE)
 *   pick : ngồi lặt rau bên rổ rau trong nhà bếp
 *   cook : đứng khuấy nồi cơm / nồi canh trong nhà bếp, cạnh Phật tử đang nấu
 * Chỗ làm ở nhà bếp tính theo toạ độ cục bộ của nhà (xem kitchen.js); `side` là độ lệch ngang của miệng nồi so với thân người (m),
 * dùng để hai người đứng chung một nồi mà không đè lên nhau. Hoạt cảnh nằm ở public/js/work.js. */
export const WORK_MERIT = 10;
export const WORK_MS = [5000, 10000];
export const WORK_KINDS = {
  sweep: { act: 'sweep', text: 'quét lá', icon: '🧹', doing: 'Đang quét lá sân chùa' },
  pick: { act: 'pick', text: 'lặt rau', icon: '🥬', doing: 'Đang lặt rau cho nhà bếp' },
  cook: { act: 'stir', text: 'nấu cơm', icon: '🍚', doing: 'Đang nấu cơm cho đại chúng' }
};
export const SWEEP_SPOT = { x: -23.5, z: 28, r: 5 };
const TAU = Math.PI * 2;
const kseat = (kind, lx, lz, ry, extra = {}) => {
  const [x, z] = kitchenToWorld(lx, lz);
  return { kind, x, z, ry: (((ry + KITCHEN.rot) % TAU) + TAU) % TAU, ...extra };
};
export const WORK_SEATS = [
  kseat('cook', -6.9, -0.95, Math.PI, { side: 0.4 }),                  // bên phải nồi cơm (Bác Năm đứng bên trái)
  kseat('cook', -2.9, -0.95, Math.PI, { side: 0.4 }),                  // bên phải nồi canh (Dì Tư đứng bên trái)
  kseat('pick', -3, 0.5, 0, { sit: true }),                             // chiếu A: hai Phật tử ngồi hai đầu rổ, hai chỗ này ở hai bên kia
  kseat('pick', -3, 2.4, Math.PI, { sit: true }),
  kseat('pick', 0.8, 2.25, Math.PI / 2, { sit: true }),                 // chiếu B: Bác Bảy ngồi phía bắc rổ
  kseat('pick', 2.8, 2.25, -Math.PI / 2, { sit: true })
];

/* Phòng nghỉ trưa của Phật tử: một gian của tả vu (dãy hành lang bên trái khi từ cổng đi vào), cửa mở ra hành lang phía sân.
 * Lòng phòng rộng 4,05 m, sâu 12,8 m: 1,9 m ở đầu nam là chỗ để dép và cửa, phần còn lại trải 20 chiếu nằm đất (4 chiếu ngang x 5 hàng),
 * đầu người nằm quay về phía bắc (-z). (ax, az) là chỗ đặt bàn chân người nằm. Dựng ở public/js/restroom.js, va chạm ở world.js. */
export const NAP_ROOM = { x1: -37.65, x2: -33.6, z1: -21.4, z2: -8.6, door: { z1: -10.6, z2: -8.6 } };
export const NAP_MATS = [];
{
  const cx = (NAP_ROOM.x1 + NAP_ROOM.x2) / 2;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) {
    const x = cx + (c - 1.5) * 0.92, z = -11.5 - r * 2.2;
    NAP_MATS.push({ x, z, ax: x, az: z + 0.95, ry: 0 });
  }
}
export const NAP_NPC_MATS = [1, 6, 9, 12, 17];       // chiếu có Phật tử ảo đang ngủ trưa sẵn

/* Bồ đoàn trong chánh điện: 3 hàng x 5 chiếc, cao 0,24 m. Ngồi thiền gần đây sẽ tự ngồi lên bồ đoàn. */
export const CUSHION_H = 0.24;
export const CUSHIONS = [];
for (let r = 0; r < 3; r++) for (let c = -2; c <= 2; c++) CUSHIONS.push({ x: c * 2.4, z: HALL.z + 1 - r * 2.2 });

/* Vùng đi được: sân dưới (y=0) và sân trên (y=UP). */
export const LOWER = { x1: -38.3, x2: 90.2, z1: 0, z2: 55.4 };
export const UPPER = { x1: -38.3, x2: 38.3, z1: -73, z2: 0 };   // sân sau đã nới thêm 18 m về phía núi

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const inGate = (x, z) => x >= GATE_CORRIDOR.x1 && x <= GATE_CORRIDOR.x2 && z >= GATE_CORRIDOR.z1 && z <= GATE_CORRIDOR.z2;

/* Vùng đi được: hai sân, lối cổng ở tường tây sân sau và hệ 1.080 bậc thang Đường Mây (xem stairs.js). */
export function inBounds(x, z) {
  return (x >= LOWER.x1 && x <= LOWER.x2 && z >= LOWER.z1 && z <= LOWER.z2) ||
         (x >= UPPER.x1 && x <= UPPER.x2 && z >= UPPER.z1 && z <= UPPER.z2) ||
         inGate(x, z) || stairQuery(x, z, 0.4) !== null;
}

/* Vùng người chơi thật sự đứng được (client dùng để chặn, chặt hơn inBounds): bậc thang và sân đỉnh thu hẹp để thân người không xuyên
 * qua lan can. Sân dưới và sân trên giữ nguyên, riêng dải sát tường chắn / lan can ở z = 0 do collision.js chặn bằng hộp. */
export function walkable(x, z) {
  return (x >= LOWER.x1 && x <= LOWER.x2 && z >= LOWER.z1 && z <= LOWER.z2) ||
         (x >= UPPER.x1 && x <= UPPER.x2 && z >= UPPER.z1 && z <= UPPER.z2) ||
         inGate(x, z) || stairWalk(x, z) !== null;
}

export function clampToBounds(x, z) {
  if (inBounds(x, z)) return [x, z];
  const yard = z < 0 ? [clamp(x, UPPER.x1, UPPER.x2), clamp(z, UPPER.z1, 0)] : [clamp(x, LOWER.x1, LOWER.x2), clamp(z, 0, LOWER.z2)];
  const st = stairNearest(x, z);
  return st && st[2] < Math.hypot(x - yard[0], z - yard[1]) ? [st[0], st[1]] : yard;
}

export function spawnPoint() {
  return { x: (Math.random() - 0.5) * 5, z: 38 + Math.random() * 2, ry: Math.PI };
}

/* Điểm tương tác. Người chơi phải đứng trong bán kính r. */
export const SPOTS = [
  { type: 'incense', x: BURNER.x, z: BURNER.z, r: 4.6, text: 'thắp nhang' },
  { type: 'bell', x: BELL.x, z: BELL.z, r: 5, text: 'thỉnh chuông' },
  { type: 'drum', x: DRUM.x, z: DRUM.z, r: 5, text: 'đánh trống' },
  { type: 'mo', x: MO_PLAYER.x, z: MO_PLAYER.z, r: 2.6, text: 'gõ mõ' },
  { type: 'lantern', x: LAKE_SPOT.x, z: LAKE_SPOT.z, r: 4.5, text: 'thả hoa đăng' },
  { type: 'rest', x: (NAP_ROOM.x1 + NAP_ROOM.x2) / 2, z: (NAP_ROOM.z1 + NAP_ROOM.z2) / 2, r: 7, rect: NAP_ROOM, text: 'nằm nghỉ' },   // spot hình chữ nhật: đứng trong phòng mới hiện nút
  { type: 'sweep', x: SWEEP_SPOT.x, z: SWEEP_SPOT.z, r: SWEEP_SPOT.r, text: WORK_KINDS.sweep.text },
  ...WORK_SEATS.map(s => ({ type: s.kind, x: s.x, z: s.z, r: 1.2, text: WORK_KINDS[s.kind].text })),
  ...SUMMIT_SPOTS                                  // sân đỉnh Đường Mây (xem summit.js)
];

/* Người đứng ở (x, z) có trong vùng của điểm tương tác s không (hình tròn bán kính r, hoặc hình chữ nhật s.rect). */
export const inSpot = (s, x, z) => s.rect
  ? x >= s.rect.x1 && x <= s.rect.x2 && z >= s.rect.z1 && z <= s.rect.z2
  : Math.hypot(x - s.x, z - s.z) < s.r;

export const ACTIONS = ['bow', 'incense', 'bell', 'drum', 'mo', 'lantern', 'incenseTop'];

/* Thời gian chờ giữa hai lần cùng một hành động (ms), chống cày công đức. */
export const ACTION_COOLDOWN_MS = { bow: 1200, incense: 1500, bell: 5000, drum: 2500, mo: 350, lantern: 4000, meditate: 30000, incenseTop: 1500 };

/* Màu áo tràng: [mã màu, tên]. Server chỉ nhận các mã trong danh sách này. */
export const ROBES = [
  ['#c9772b', 'Nghệ'], ['#7a4a2a', 'Nâu'], ['#6b6f78', 'Lam xám'],
  ['#d9a227', 'Vàng'], ['#e9e2d0', 'Trắng'], ['#b4495c', 'Hồng sen']
];

export const WEATHER_KEYS = ['nang', 'binhminh', 'hoanghon', 'may', 'mua', 'giong', 'suong', 'dem', 'tuyet'];

export const LANTERN_LIFE_MS = 5 * 60 * 1000;
export const INCENSE_LIFE_MS = 5 * 60 * 1000;
export const BELL_PERIOD_S = 120;   // chú tiểu thỉnh chuông mỗi 2 phút
