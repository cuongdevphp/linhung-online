/* SÂN ĐỈNH ĐƯỜNG MÂY, CÁP TREO và TỬ VI: dữ liệu dùng chung cho server (kiểm tra hành động, kết quả tử vi, thời gian chuyến cáp)
 * và client (dựng cảnh, điểm tương tác). Chỉ có toán thuần, không phụ thuộc three.js.
 *
 * Toạ độ cục bộ của sân đỉnh: (u, v) tính từ tâm sân, +u hướng đông, +v hướng nam (phía lối lên từ Đường Mây), -v hướng núi.
 * Bố cục (bán kính sân 36 m):
 *   Chùa Đồng ở giữa phía bắc, hai bên là Phật Bà Tây Bổ Đà Sơn (tây) và Phật Di Lặc (đông);
 *   Tử Vi Đường ở phía tây, Thiền đài ở phía đông; hai đài ngắm mây ở hai mép đông/tây;
 *   Cổng Trời, cột mốc và vườn hoa theo mùa ở phía nam, ga cáp treo ở góc tây nam.
 */
import { PLAZA, LOWER_PAD } from './stairs.js';

export const SU = (u, v) => [PLAZA.x + u, PLAZA.z + v];
const spot = (type, u, v, r, text) => { const [x, z] = SU(u, v); return { type, x, z, r, text }; };

/* Điểm tương tác của sân đỉnh. Loại 'incenseTop' và 'fortune' và 'cable' do server kiểm tra khoảng cách, nên mỗi loại chỉ có một điểm. */
export const SUMMIT_SPOTS = [
  spot('incenseTop', 0, -11.5, 4.4, 'dâng hương Chùa Đồng'),
  spot('fortune', -14.5, -2, 5.2, 'xin xăm · gieo quẻ · xem tử vi'),
  spot('meditate', 21, -2, 7.4, 'ngồi thiền trên thiền đài'),
  spot('view', 34, 0, 7.4, 'đón bình minh, săn mây'),
  spot('view', -31, -16, 7.4, 'ngắm mây hoàng hôn'),
  spot('photo', 0, 26, 4.6, 'check-in Cổng Trời'),
  spot('photo', 9.5, 19, 3.4, 'check-in bên cột mốc 986 m'),
  spot('photo', 22, 17.5, 8, 'check-in giữa vườn hoa'),
  spot('cable', -15.2, 19.4, 3.4, 'đi cáp treo xuống chùa')
];

/* Tám bồ đoàn trên thiền đài, quay mặt vào tâm. ry là hướng nhìn (atan2(dx, dz)). */
export const MEDITATION = { u: 21, v: -2, r: 4.3, n: 8 };
export const SUMMIT_CUSHIONS = Array.from({ length: MEDITATION.n }, (_, k) => {
  const a = k / MEDITATION.n * Math.PI * 2 + Math.PI / 8;
  const [x, z] = SU(MEDITATION.u + Math.cos(a) * MEDITATION.r, MEDITATION.v + Math.sin(a) * MEDITATION.r);
  return { x, z, ry: Math.atan2(-Math.cos(a), -Math.sin(a)) };
});

/* Tên khu vực trên sân đỉnh (hiện ở HUD), thử từ trên xuống, vùng nhỏ trước. */
export const SUMMIT_ZONES = [
  { name: 'Chùa Đồng', sub: 'Mái đồng, cột đồng, hương trầm trên đỉnh núi', ...spot('', 0, -22.5, 8) },
  { name: 'Phật Bà Tây Bổ Đà Sơn', sub: 'Phật Bà đứng trên đài sen, nhìn xuống biển mây', ...spot('', -19, -21, 7) },
  { name: 'Phật Di Lặc', sub: 'Cười một cái, bao nhiêu phiền não cũng nhẹ', ...spot('', 19, -21, 6.5) },
  { name: 'Thiền đài', sub: 'Ngồi xuống, nghe gió từ biển mây', ...spot('', 21, -2, 7.6) },
  { name: 'Tử Vi Đường', sub: 'Xin xăm, gieo quẻ Kinh Dịch, xem tử vi, xem tuổi hợp', ...spot('', -22, -2, 12) },
  { name: 'Đài đón bình minh', sub: 'Hướng đông, nhìn mặt trời lên trên biển mây', ...spot('', 34, 0, 7.4) },
  { name: 'Đài ngắm hoàng hôn', sub: 'Hướng tây, mây nhuộm vàng chiều tà', ...spot('', -31, -16, 7.4) },
  { name: 'Ga cáp treo Đỉnh Mây', sub: 'Trượt xuống chùa trong khoảng nửa phút', ...spot('', -22, 19.5, 8) },
  { name: 'Vườn hoa theo mùa', sub: 'Mỗi mùa một sắc hoa', ...spot('', 22, 17.5, 8) },
  { name: 'Cổng Trời', sub: 'Bước qua cổng là bước vào mây', ...spot('', 0, 25.5, 5.4) },
  { name: 'Sân đỉnh Đường Mây', sub: 'Trên cao 986 m, mây ở dưới chân' }
].map(z => ({ ...z, r: z.r ?? Infinity }));

/* ===================== CÁP TREO ===================== */
/* Một chiều từ đỉnh xuống chân núi (muốn lên thì leo bộ 1.080 bậc). Ga trên nằm ở góc tây nam sân đỉnh,
 * ga dưới nằm trên LOWER_PAD, ngay ngoài tường tây sân sau. */
export const CABLE = {
  top: { x: PLAZA.x - 22, z: PLAZA.z + 20 },               // trục tim cáp ở ga trên (cabin xuống đỗ lệch về phía tây 2,4 m)
  bottom: { x: -50, z: -57.5 },                             // vị trí cabin đỗ ở ga dưới
  exit: { x: -46.2, z: -57.5, ry: Math.PI / 2 },            // nơi hành khách bước ra ở ga dưới
  rideMs: 52000,                                            // thời gian một chuyến
  cabinH: 4.4                                               // dây cáp cao hơn sàn cabin bấy nhiêu mét
};
export { LOWER_PAD };

/* Tử vi, xin xăm, gieo quẻ, xem tuổi hợp: xem shared/oracle.js. Re-export để chỗ cũ vẫn import được. */
export { fortuneFor, validBirthYear } from './oracle.js';
