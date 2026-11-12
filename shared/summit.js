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
  spot('fortune', -16.2, -2, 3.8, 'xem tử vi · xin lời khuyên hôm nay'),
  spot('meditate', 21, -2, 7.4, 'ngồi thiền trên thiền đài'),
  spot('view', 34, 0, 7.4, 'đón bình minh, săn mây'),
  spot('view', -34, 0, 7.4, 'ngắm mây hoàng hôn'),
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
  { name: 'Tử Vi Đường', sub: 'Xem tử vi, xin lời khuyên cho ngày hôm nay', ...spot('', -22, -2, 6.5) },
  { name: 'Đài đón bình minh', sub: 'Hướng đông, nhìn mặt trời lên trên biển mây', ...spot('', 34, 0, 7.4) },
  { name: 'Đài ngắm hoàng hôn', sub: 'Hướng tây, mây nhuộm vàng chiều tà', ...spot('', -34, 0, 7.4) },
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

/* ===================== TỬ VI ===================== */
const CAN = ['Canh', 'Tân', 'Nhâm', 'Quý', 'Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ'];
const HANH = ['Kim', 'Kim', 'Thủy', 'Thủy', 'Mộc', 'Mộc', 'Hỏa', 'Hỏa', 'Thổ', 'Thổ'];      // hành của thiên can, cùng thứ tự CAN
const CHI = ['Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi'];
const CON_GIAP = { Tý: 'Chuột', Sửu: 'Trâu', Dần: 'Hổ', Mão: 'Mèo', Thìn: 'Rồng', Tỵ: 'Rắn', Ngọ: 'Ngựa', Mùi: 'Dê', Thân: 'Khỉ', Dậu: 'Gà', Tuất: 'Chó', Hợi: 'Heo' };
const MAU = { Kim: 'trắng hoặc ánh kim', Mộc: 'xanh lá', Thủy: 'xanh dương hoặc đen', Hỏa: 'đỏ hoặc cam', Thổ: 'vàng hoặc nâu' };
const GIO = ['Tý (23h–1h)', 'Sửu (1h–3h)', 'Dần (3h–5h)', 'Mão (5h–7h)', 'Thìn (7h–9h)', 'Tỵ (9h–11h)', 'Ngọ (11h–13h)', 'Mùi (13h–15h)', 'Thân (15h–17h)', 'Dậu (17h–19h)', 'Tuất (19h–21h)', 'Hợi (21h–23h)'];
const LOI_KHUYEN = [
  'Làm lành tránh dữ, giữ tâm an thì mọi việc tự thông.',
  'Hôm nay hợp với việc tha thứ: buông được một điều, nhẹ thêm một bước.',
  'Việc gấp chớ vội, lời nặng chớ nói. Chậm một nhịp sẽ đỡ hối tiếc.',
  'Có người đang chờ một lời hỏi thăm của bạn. Hãy nhắn cho họ.',
  'Tài lộc đến từ sự chăm chỉ và giữ chữ tín, đừng chạy theo lời hứa dễ dãi.',
  'Giữ sức khỏe trước: ngủ đủ, uống đủ nước, đi bộ thêm một đoạn.',
  'Bố thí không chỉ là tiền bạc. Một nụ cười, một việc giúp người cũng là bố thí.',
  'Gặp chuyện không vừa ý, hít ba hơi thật sâu rồi hãy trả lời.',
  'Điều bạn định làm từ lâu, hôm nay là ngày thuận để bắt đầu.',
  'Đừng so mình với người khác, mỗi loài hoa nở một mùa riêng.',
  'Hôm nay nên giữ gìn lời nói, tránh tranh cãi chuyện tiền bạc.',
  'Dành thêm chút thời gian ngồi cùng người già và trẻ nhỏ trong nhà.'
];

function mulberry(a) {
  a = a | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Năm sinh hợp lệ (số nguyên trong khoảng cho phép)? */
export const validBirthYear = (y, now = new Date().getFullYear()) => Number.isInteger(y) && y >= 1900 && y <= now;

/* Kết quả tử vi cho một năm sinh vào một ngày (dayKey = 'YYYY-MM-DD'). Cùng năm sinh, cùng ngày thì ra cùng kết quả.
 * Chỉ mang tính giải trí. */
export function fortuneFor(year, dayKey) {
  const can = CAN[year % 10], chi = CHI[year % 12], hanh = HANH[year % 10];
  const [Y, Mo, D] = String(dayKey).split('-').map(Number);
  const r = mulberry(year * 10007 + (Y || 0) * 372 + (Mo || 0) * 31 + (D || 0));
  const star = () => 2 + Math.floor(r() * 4);              // 2..5 sao
  return {
    year, can, chi, animal: CON_GIAP[chi], hanh, day: dayKey,
    stars: { tai: star(), viec: star(), khoe: star(), tinh: star() },
    mau: MAU[hanh], so: 1 + Math.floor(r() * 9), gio: GIO[Math.floor(r() * 12)],
    advice: LOI_KHUYEN[Math.floor(r() * LOI_KHUYEN.length)]
  };
}
