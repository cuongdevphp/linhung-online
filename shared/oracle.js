/* TỬ VI ĐƯỜNG: bốn dịch vụ xem vận ở sân đỉnh Đường Mây. Chỉ có toán và dữ liệu thuần, server dùng để tính kết quả.
 *   1. Xin xăm: rút một trong 100 quẻ xăm, mỗi số xăm luôn có cùng bài thơ và lời giải.
 *   2. Gieo quẻ Kinh Dịch: tung ba đồng xu sáu lần, ra quẻ (64 quẻ), hào động và quẻ biến.
 *   3. Tử vi và sao giải hạn: can chi, hành, sao chiếu mệnh theo tuổi và giới tính.
 *   4. Xem tuổi hợp: so hai năm sinh theo con giáp (lục hợp, tam hợp, lục xung) và ngũ hành.
 * Mọi kết quả chỉ mang tính giải trí, theo tín ngưỡng dân gian.
 */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function mulberry(a) {
  a = a | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];

/* ============================ 1. XIN XĂM ============================ */
export const STICK_COUNT = 100;
export const STICK_LEVELS = {
  thuong: { name: 'Thượng cát', stars: 5, tone: 'tot' },
  cat: { name: 'Trung cát', stars: 4, tone: 'tot' },
  binh: { name: 'Bình', stars: 3, tone: 'binh' },
  han: { name: 'Hạ · cần giữ mình', stars: 2, tone: 'xau' }
};

/* Bốn câu thơ: cảnh, tình thế, lời khuyên, kết quả. Mỗi giọng (tốt, bình, xấu) có sáu câu cho mỗi vị trí. */
const POEM = {
  tot: [
    ['Mây tan trăng sáng soi đầu ngõ', 'Xuân sang hoa nở khắp sân chùa', 'Gió thuận buồm căng ra bến rộng', 'Chim én báo xuân về trước cửa', 'Nước trong suối mát chảy về nguồn', 'Sen nở hương thơm lan bốn phía'],
    ['Quý nhân phù trợ đường thêm rộng', 'Việc cũ bao nhiêu đều gỡ rối', 'Công sức gieo trồng nay hái quả', 'Người xa tin tốt sắp về nhà', 'Lòng thành được Phật chứng cho hay', 'Thế đang lên cao, chớ ngại đường'],
    ['Giữ nếp hiền lành, lòng ngay thẳng', 'Biết đủ biết ơn, đừng tự mãn', 'Làm việc lành thêm, đừng chậm trễ', 'Chia sẻ cùng người, phúc lại đầy', 'Chuyên tâm một việc, chớ phân vân', 'Nói lời nhẹ nhàng, nghe điều phải'],
    ['Phúc lộc đong đầy cả mái nhà', 'Việc lớn việc nhỏ đều viên mãn', 'Một mùa an lạc, vạn sự thành', 'Cầu gì được nấy, bước thênh thang', 'Gia đạo bình yên, tài lộc đến', 'Thuận buồm xuôi gió tới bến xa']
  ],
  binh: [
    ['Trời nhiều mây xám gió heo may', 'Thuyền ngược dòng sông nước chảy xiết', 'Trăng khuyết nửa vầng soi bóng liễu', 'Đường xa chưa tỏ đèn đâu đó', 'Hoa chưa kịp nở đợi nắng lên', 'Sương mờ phủ kín lối ngang qua'],
    ['Việc chưa thành hẳn còn chờ đợi', 'Có được có mất, chớ buồn vui', 'Người giúp chưa đến, hãy tự cố', 'Tin vui chưa tới, tin buồn xa', 'Mọi thứ đang yên, chưa đổi dời', 'Đứng giữa ngã ba, cần suy xét'],
    ['Kiên nhẫn chờ thời, đừng nóng vội', 'Cẩn thận giấy tờ, lời hứa hẹn', 'Tiết kiệm lo xa, giữ sức khỏe', 'Lắng nghe người lớn, nhận lời khuyên', 'Việc gì cũng chậm một nhịp đã', 'Giữ vững niềm tin, bền từng bước'],
    ['Qua cơn sương sớm nắng lại lên', 'Chậm mà chắc, rồi cũng đến nơi', 'Bình an là phúc, giữ mới bền', 'Một lòng kiên định, việc sẽ thông', 'Sau thời gian ngắn, tin lành đến', 'Mất ít được nhiều, đừng tiếc nuối']
  ],
  xau: [
    ['Mây đen kéo tới che đầu núi', 'Gió lớn đêm qua rụng cành khô', 'Sóng cả thuyền nhỏ lênh đênh mãi', 'Đường trơn mưa lớn bước dè chừng', 'Cây già gặp bão, cành lay động', 'Sương lạnh đầu đông phủ lối về'],
    ['Việc đang gập ghềnh, lòng bất an', 'Tiểu nhân chực chờ, lời thị phi', 'Tiền của dễ hao, dễ lỡ dở', 'Sức khỏe cần lo, chớ chủ quan', 'Chớ vội đổi thay, chớ ký tên', 'Người thân hiểu lầm, lời khó nói'],
    ['Lòng giữ bình tĩnh, nhún nhường lời', 'Làm lành tránh dữ, niệm Phật thường', 'Đi chậm nghĩ sâu, đừng liều lĩnh', 'Nhờ người đáng tin, đừng tự ôm', 'Bố thí giúp người, giải bớt nghiệp', 'Giữ gìn lời nói, tránh tranh hơn'],
    ['Qua cơn bĩ cực, thái lai đến', 'Tai qua nạn khỏi, lòng nhẹ thênh', 'Hạn sắp qua rồi, đừng nản chí', 'Hết đêm trời sáng, việc sẽ yên', 'Chịu khó ít lâu, rồi hanh thông', 'Giữ lòng thiện lương, họa hóa lành']
  ]
};

/* Lời giải theo bốn mặt của đời sống, hai cách nói cho mỗi mức. */
const READ = {
  congdanh: {
    thuong: ['Công việc hanh thông, có người nâng đỡ', 'Cơ hội thăng tiến rộng mở, nên nắm bắt'],
    cat: ['Việc làm ổn định, tiến triển đều', 'Có tin vui về công việc, giữ sự chăm chỉ'],
    binh: ['Công việc bình thường, chưa nên đổi dời', 'Cần kiên nhẫn, kết quả đến chậm mà chắc'],
    han: ['Công việc nhiều trở ngại, nên thận trọng', 'Tránh tranh cãi nơi làm việc, giữ hòa khí']
  },
  taiLoc: {
    thuong: ['Tài lộc dồi dào, thu nhiều hơn chi', 'Có lộc bất ngờ, nhớ chia sẻ cho người'],
    cat: ['Tiền bạc khá, đầu tư nhỏ có lãi', 'Thu nhập đều, tích lũy dần'],
    binh: ['Thu chi cân bằng, chớ vay mượn', 'Giữ tiền chắc tay, tránh theo lời rủ rê'],
    han: ['Dễ hao tài, cần chi tiêu cẩn thận', 'Không nên đầu tư lớn lúc này']
  },
  tinhDuyen: {
    thuong: ['Tình duyên đẹp, gia đạo êm ấm', 'Có người hiểu mình, duyên lành gần kề'],
    cat: ['Tình cảm thuận hòa, nên nói lời yêu thương', 'Gia đình vui vẻ, có tin mừng'],
    binh: ['Tình cảm bình lặng, cần thêm quan tâm', 'Chớ nóng nảy, nhường nhau là hòa thuận'],
    han: ['Dễ hiểu lầm, nên nói chuyện thẳng thắn, bình tĩnh', 'Đừng quyết định lớn về tình cảm lúc này']
  },
  sucKhoe: {
    thuong: ['Sức khỏe tốt, tinh thần sảng khoái', 'Khí sắc hồng hào, nên giữ nếp tập luyện'],
    cat: ['Sức khỏe ổn, chú ý ăn uống', 'Ngủ đủ giấc để giữ sức'],
    binh: ['Chú ý thời tiết, giữ ấm và nghỉ ngơi', 'Khám sức khỏe định kỳ cho yên tâm'],
    han: ['Cẩn thận ốm vặt và tai nạn nhỏ', 'Nên nghỉ ngơi, bớt thức khuya và lo nghĩ']
  }
};
const GIAI_XAM = {
  thuong: 'Quẻ rất tốt: lòng thành cảm ứng, việc cầu có thể thành. Nhớ làm thêm việc thiện để giữ phúc.',
  cat: 'Quẻ tốt: có quý nhân giúp, cứ làm việc đều đặn và giữ lòng thiện.',
  binh: 'Quẻ bình hòa: không lớn không nhỏ, kiên nhẫn là chìa khóa.',
  han: 'Quẻ cần dè chừng: chậm lại, làm việc lành, khiêm tốn thì họa nhẹ đi.'
};

/* Mức của số xăm n (1..100): cố định theo n, tỉ lệ khoảng 20% thượng cát, 30% trung cát, 30% bình, 20% hạ. */
export function stickLevelKey(n) {
  const h = (n * 37 + 11) % 100;
  return h < 20 ? 'thuong' : h < 50 ? 'cat' : h < 80 ? 'binh' : 'han';
}

/* Quẻ xăm số n: cùng số thì luôn ra cùng một bài thơ và lời giải. */
export function stickFor(n) {
  n = clamp(Math.floor(n), 1, STICK_COUNT);
  const key = stickLevelKey(n), lv = STICK_LEVELS[key], r = mulberry(n * 7919 + 13);
  const poem = POEM[lv.tone].map(lines => pick(lines, r));
  const read = {};
  for (const topic of Object.keys(READ)) read[topic] = pick(READ[topic][key], r);
  return { n, level: key, levelName: lv.name, stars: lv.stars, poem, read, giai: GIAI_XAM[key] };
}

/* ============================ 2. KINH DỊCH ============================ */
export const HEX_NAMES = [
  '', 'Thuần Càn', 'Thuần Khôn', 'Thủy Lôi Truân', 'Sơn Thủy Mông', 'Thủy Thiên Nhu', 'Thiên Thủy Tụng', 'Địa Thủy Sư', 'Thủy Địa Tỷ',
  'Phong Thiên Tiểu Súc', 'Thiên Trạch Lý', 'Địa Thiên Thái', 'Thiên Địa Bĩ', 'Thiên Hỏa Đồng Nhân', 'Hỏa Thiên Đại Hữu', 'Địa Sơn Khiêm', 'Lôi Địa Dự',
  'Trạch Lôi Tùy', 'Sơn Phong Cổ', 'Địa Trạch Lâm', 'Phong Địa Quán', 'Hỏa Lôi Phệ Hạp', 'Sơn Hỏa Bí', 'Sơn Địa Bác', 'Địa Lôi Phục',
  'Thiên Lôi Vô Vọng', 'Sơn Thiên Đại Súc', 'Sơn Lôi Di', 'Trạch Phong Đại Quá', 'Thuần Khảm', 'Thuần Ly', 'Trạch Sơn Hàm', 'Lôi Phong Hằng',
  'Thiên Sơn Độn', 'Lôi Thiên Đại Tráng', 'Hỏa Địa Tấn', 'Địa Hỏa Minh Di', 'Phong Hỏa Gia Nhân', 'Hỏa Trạch Khuê', 'Thủy Sơn Kiển', 'Lôi Thủy Giải',
  'Sơn Trạch Tổn', 'Phong Lôi Ích', 'Trạch Thiên Quải', 'Thiên Phong Cấu', 'Trạch Địa Tụy', 'Địa Phong Thăng', 'Trạch Thủy Khốn', 'Thủy Phong Tỉnh',
  'Trạch Hỏa Cách', 'Hỏa Phong Đỉnh', 'Thuần Chấn', 'Thuần Cấn', 'Phong Sơn Tiệm', 'Lôi Trạch Quy Muội', 'Lôi Hỏa Phong', 'Hỏa Sơn Lữ',
  'Thuần Tốn', 'Thuần Đoài', 'Phong Thủy Hoán', 'Thủy Trạch Tiết', 'Phong Trạch Trung Phu', 'Lôi Sơn Tiểu Quá', 'Thủy Hỏa Ký Tế', 'Hỏa Thủy Vị Tế'
];
const HEX_MEANING = [
  '', 'Trời: mạnh mẽ, sáng tạo. Hành động đúng lúc, giữ chính đạo.', 'Đất: nhu thuận, nâng đỡ. Kiên nhẫn, lấy mềm thắng cứng.',
  'Khởi đầu gian nan. Kiên trì và tìm người đồng hành.', 'Còn non nớt, cần học hỏi. Khiêm tốn tìm thầy.', 'Chờ đợi đúng thời. Kiên nhẫn, đừng vội.',
  'Có tranh chấp. Nhường nhịn, hòa giải thì lợi.', 'Như một đạo quân: cần kỷ luật và người dẫn dắt chính trực.', 'Gắn bó, liên kết. Chọn bạn lành mà đi cùng.',
  'Tích lũy nhỏ. Chưa phải lúc làm việc lớn.', 'Bước đi cẩn trọng như đạp đuôi cọp. Giữ lễ độ thì qua nguy.', 'Trời đất giao hòa, hanh thông. Rất tốt.',
  'Bế tắc, trên dưới không thông. Giữ mình, chờ thời.', 'Đồng lòng cùng người. Hợp tác thì thành.', 'Giàu có, thịnh vượng. Giữ khiêm tốn.',
  'Khiêm nhường. Càng nhún càng được kính trọng.', 'Vui vẻ, chuẩn bị sẵn sàng để đón thời cơ.', 'Thuận theo. Biết linh hoạt theo thời thế.',
  'Chỉnh sửa điều hư cũ. Dọn dẹp để đi tiếp.', 'Tiến tới. Thời vận đang lên, hãy nắm lấy.', 'Quan sát. Nhìn kỹ rồi hãy hành động.',
  'Gỡ vướng mắc. Quyết đoán và công minh.', 'Trang sức bề ngoài. Chuộng thực chất hơn.', 'Mòn mỏi. Chưa nên tiến, giữ vững nền tảng.',
  'Trở lại. Khởi đầu mới sau gian khó.', 'Chân thật, không toan tính. Thuận theo tự nhiên.', 'Tích lũy lớn. Học hỏi, bồi đắp nội lực.',
  'Nuôi dưỡng. Chú ý lời ăn tiếng nói và việc ăn uống.', 'Gánh nặng quá sức. Cần chia sẻ, đừng cố một mình.', 'Hiểm trở trùng trùng. Giữ lòng thành sẽ vượt qua.',
  'Sáng suốt, nương tựa. Giữ ánh sáng của trí tuệ.', 'Cảm ứng. Tình cảm chân thành làm nên duyên lành.', 'Bền lâu. Kiên định với việc đã chọn.',
  'Rút lui. Lui đúng lúc là khôn ngoan.', 'Sức mạnh lớn. Dùng chính đạo, chớ ỷ mạnh.', 'Tiến lên như mặt trời mọc. Được người ghi nhận.',
  'Ánh sáng bị che. Giấu tài, chịu đựng, chờ thời.', 'Gia đạo. Trong nhà thuận thì ngoài yên.', 'Bất đồng. Nhìn điểm chung, làm việc nhỏ trước.',
  'Trở ngại trước mặt. Dừng lại, tìm quý nhân.', 'Gỡ rối, thoát nạn. Nên giải quyết nhanh.', 'Bớt đi để được. Hy sinh nhỏ, lợi lâu dài.',
  'Được thêm. Thời cơ tốt để làm việc lợi người.', 'Quyết đoán. Dứt khoát điều cần bỏ, nói thẳng nhưng nhã nhặn.', 'Gặp gỡ bất ngờ. Cảnh giác trước cám dỗ.',
  'Tụ họp. Đoàn kết, cần người đứng đầu chính trực.', 'Tiến dần từng bước. Thăng tiến đều đặn.', 'Khốn cùng. Giữ lòng ngay, bớt lời, qua cơn thử thách.',
  'Giếng nước: nguồn không đổi. Nên giữ gìn và chia sẻ.', 'Cải cách. Thay đổi đúng lúc thì được lòng người.', 'Vạc lớn. Nuôi người hiền, đổi mới tốt đẹp.',
  'Sấm động. Giật mình rồi tỉnh, giữ bình tĩnh.', 'Dừng lại. Tĩnh lặng, biết dừng đúng chỗ.', 'Tiến dần dần. Việc hôn nhân, công danh đều từ từ mà vững.',
  'Cẩn thận với tình cảm không chính danh.', 'Thịnh đạt. Đỉnh cao rồi sẽ đổi, hãy biết đủ.', 'Lữ khách xa nhà. Khiêm tốn và cẩn trọng.',
  'Gió: thuận theo, thấm dần, nhún nhường.', 'Vui vẻ. Giao tiếp hòa nhã, chia vui cùng người.', 'Tan, giải. Gỡ cái cứng, đoàn tụ nhân tâm.',
  'Tiết chế. Có chừng mực thì bền.', 'Thành tín. Lòng thành cảm hóa người.', 'Việc nhỏ làm được, việc lớn khoan. Chú ý chi tiết.',
  'Đã xong. Giữ gìn, đừng chủ quan vì dễ đổi.', 'Chưa xong, sắp thành. Đừng bỏ cuộc lúc cuối.'
];
const HEX_GOOD = new Set([1, 2, 11, 14, 15, 16, 17, 19, 24, 26, 30, 31, 32, 34, 35, 37, 42, 45, 46, 50, 53, 57, 58, 61, 63]);
const HEX_BAD = new Set([3, 6, 12, 18, 23, 28, 29, 36, 38, 39, 43, 44, 47, 54, 56, 59, 64]);
const TOPICS = {
  suNghiep: 'sự nghiệp', taiLoc: 'tiền bạc', tinhDuyen: 'tình cảm', sucKhoe: 'sức khỏe', diXa: 'chuyến đi'
};
export const YI_TOPICS = Object.keys(TOPICS);

/* Hàng = quẻ dưới (nội quái), cột = quẻ trên (ngoại quái); thứ tự: Càn, Chấn, Khảm, Cấn, Khôn, Tốn, Ly, Đoài. */
const HEX_TABLE = [
  [1, 34, 5, 26, 11, 9, 14, 43], [25, 51, 3, 27, 24, 42, 21, 17], [6, 40, 29, 4, 7, 59, 64, 47], [33, 62, 39, 52, 15, 53, 56, 31],
  [12, 16, 8, 23, 2, 20, 35, 45], [44, 32, 48, 18, 46, 57, 50, 28], [13, 55, 63, 22, 36, 37, 30, 49], [10, 54, 60, 41, 19, 61, 38, 58]
];
const TRIGRAM = { '111': 0, '100': 1, '010': 2, '001': 3, '000': 4, '011': 5, '101': 6, '110': 7 };      // từ hào dưới lên hào trên

/* lines: sáu số 6, 7, 8 hoặc 9 từ hào dưới lên; 7 và 9 là dương, 6 và 9 là hào động. Trả về số quẻ (1..64). */
export function hexagramOf(yang) {
  const lower = TRIGRAM[yang.slice(0, 3).map(b => b ? 1 : 0).join('')], upper = TRIGRAM[yang.slice(3).map(b => b ? 1 : 0).join('')];
  return HEX_TABLE[lower][upper];
}
export const hexGlyph = n => String.fromCodePoint(0x4DC0 + n - 1);                // thứ tự Văn Vương, trùng số quẻ
function hexInfo(n) { return { n, name: HEX_NAMES[n], glyph: hexGlyph(n), meaning: HEX_MEANING[n], tone: HEX_GOOD.has(n) ? 'tot' : HEX_BAD.has(n) ? 'xau' : 'binh' }; }

/* Tung ba đồng xu cho mỗi hào: mặt sấp tính 2, mặt ngửa tính 3. rnd là hàm trả về số trong [0,1). */
export function castYi(rnd = Math.random, topic = 'suNghiep') {
  const tosses = [], lines = [];
  for (let i = 0; i < 6; i++) {
    const coins = [rnd() < 0.5, rnd() < 0.5, rnd() < 0.5];                         // true = ngửa
    tosses.push(coins);
    lines.push(coins.reduce((s, heads) => s + (heads ? 3 : 2), 0));               // 6, 7, 8 hoặc 9
  }
  const yang = lines.map(v => v === 7 || v === 9);
  const moving = lines.map((v, i) => (v === 6 || v === 9) ? i + 1 : 0).filter(Boolean);
  const primary = hexInfo(hexagramOf(yang));
  const changed = moving.length ? hexInfo(hexagramOf(yang.map((y, i) => moving.includes(i + 1) ? !y : y))) : null;
  const topicName = TOPICS[topic] ? topic : 'suNghiep';
  const say = { tot: 'khá thuận', binh: 'bình thường, cần kiên nhẫn', xau: 'nhiều trở ngại, nên thận trọng' };
  const topicText = changed && changed.tone !== primary.tone
    ? `Về ${TOPICS[topicName]}: lúc đầu ${say[primary.tone]}, về sau ${say[changed.tone]}.`
    : `Về ${TOPICS[topicName]}: thế quẻ ${say[(changed || primary).tone]}.`;
  return { tosses, lines, moving, primary, changed, topic: topicName, topicText };
}

/* ============================ 3. TỬ VI VÀ SAO HẠN ============================ */
const CAN = ['Canh', 'Tân', 'Nhâm', 'Quý', 'Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ'];
const HANH = ['Kim', 'Kim', 'Thủy', 'Thủy', 'Mộc', 'Mộc', 'Hỏa', 'Hỏa', 'Thổ', 'Thổ'];
const CHI = ['Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi'];
const CON_GIAP = { Tý: 'Chuột', Sửu: 'Trâu', Dần: 'Hổ', Mão: 'Mèo', Thìn: 'Rồng', Tỵ: 'Rắn', Ngọ: 'Ngựa', Mùi: 'Dê', Thân: 'Khỉ', Dậu: 'Gà', Tuất: 'Chó', Hợi: 'Heo' };
const GIAP_ICON = { Tý: '🐭', Sửu: '🐮', Dần: '🐯', Mão: '🐱', Thìn: '🐲', Tỵ: '🐍', Ngọ: '🐴', Mùi: '🐐', Thân: '🐵', Dậu: '🐔', Tuất: '🐶', Hợi: '🐷' };
export const ZODIAC = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'].map(chi => ({ chi, animal: CON_GIAP[chi], icon: GIAP_ICON[chi] }));
const MAU = { Kim: 'trắng hoặc ánh kim', Mộc: 'xanh lá', Thủy: 'xanh dương hoặc đen', Hỏa: 'đỏ hoặc cam', Thổ: 'vàng hoặc nâu' };
const GIO = ['Tý (23h–1h)', 'Sửu (1h–3h)', 'Dần (3h–5h)', 'Mão (5h–7h)', 'Thìn (7h–9h)', 'Tỵ (9h–11h)', 'Ngọ (11h–13h)', 'Mùi (13h–15h)', 'Thân (15h–17h)', 'Dậu (17h–19h)', 'Tuất (19h–21h)', 'Hợi (21h–23h)'];
const LOI_KHUYEN = [
  'Làm lành tránh dữ, giữ tâm an thì mọi việc tự thông.', 'Hôm nay hợp với việc tha thứ: buông được một điều, nhẹ thêm một bước.',
  'Việc gấp chớ vội, lời nặng chớ nói. Chậm một nhịp sẽ đỡ hối tiếc.', 'Có người đang chờ một lời hỏi thăm của bạn. Hãy nhắn cho họ.',
  'Tài lộc đến từ sự chăm chỉ và giữ chữ tín, đừng chạy theo lời hứa dễ dãi.', 'Giữ sức khỏe trước: ngủ đủ, uống đủ nước, đi bộ thêm một đoạn.',
  'Bố thí không chỉ là tiền bạc. Một nụ cười, một việc giúp người cũng là bố thí.', 'Gặp chuyện không vừa ý, hít ba hơi thật sâu rồi hãy trả lời.',
  'Điều bạn định làm từ lâu, hôm nay là ngày thuận để bắt đầu.', 'Đừng so mình với người khác, mỗi loài hoa nở một mùa riêng.',
  'Hôm nay nên giữ gìn lời nói, tránh tranh cãi chuyện tiền bạc.', 'Dành thêm chút thời gian ngồi cùng người già và trẻ nhỏ trong nhà.'
];

/* Chín sao chiếu mệnh theo tuổi mụ (tuổi âm) và giới tính, theo cách tính dân gian. ngay: ngày âm lịch thường cúng sao. */
const SAO = {
  laHau: { name: 'La Hầu', tone: 'xau', ngay: 8, note: 'Dễ gặp thị phi, kiện tụng, nhất là khẩu thiệt. Giữ lời nói, tránh cho vay mượn.' },
  thoTu: { name: 'Thổ Tú', tone: 'xau', ngay: 19, note: 'Hay gặp chuyện phiền hà, người nhà có thể lo lắng. Tránh đi xa vội vàng.' },
  thuyDieu: { name: 'Thủy Diệu', tone: 'tot', ngay: 21, note: 'Sao tốt về tài lộc, nhưng cẩn thận sông nước và chuyện tình cảm.' },
  thaiBach: { name: 'Thái Bạch', tone: 'xau', ngay: 15, note: 'Dễ hao tài, mất của. Giữ tiền chắc tay, tránh góp vốn vội.' },
  thaiDuong: { name: 'Thái Dương', tone: 'tot', ngay: 27, note: 'Sao tốt: công việc rạng rỡ, có người giúp. Nam hợp hơn nữ.' },
  vanHan: { name: 'Vân Hán', tone: 'xau', ngay: 29, note: 'Hay gặp tai tiếng, nóng nảy. Bình tĩnh, tránh tranh cãi.' },
  keDo: { name: 'Kế Đô', tone: 'xau', ngay: 18, note: 'Dễ buồn phiền, sức khỏe giảm. Nữ nên đặc biệt giữ gìn sức khỏe.' },
  thaiAm: { name: 'Thái Âm', tone: 'tot', ngay: 26, note: 'Sao tốt: nhiều niềm vui, may mắn. Nữ hợp hơn nam.' },
  mocDuc: { name: 'Mộc Đức', tone: 'tot', ngay: 25, note: 'Sao tốt: vui vẻ, có tin mừng, tình duyên thuận lợi.' }
};
const SAO_NAM = [SAO.mocDuc, SAO.laHau, SAO.thoTu, SAO.thuyDieu, SAO.thaiBach, SAO.thaiDuong, SAO.vanHan, SAO.keDo, SAO.thaiAm];       // tuổi mụ % 9 = 0..8
const SAO_NU = [SAO.thuyDieu, SAO.keDo, SAO.vanHan, SAO.mocDuc, SAO.thaiAm, SAO.thoTu, SAO.laHau, SAO.thaiDuong, SAO.thaiBach];

export const validBirthYear = (y, now = new Date().getFullYear()) => Number.isInteger(y) && y >= 1900 && y <= now;

/* nowYear: năm hiện tại (dương lịch). Tuổi mụ = nowYear - năm sinh + 1. gender: 'nam' hoặc 'nu'. */
export function saoHan(year, gender, nowYear) {
  const age = nowYear - year + 1, g = gender === 'nu' ? SAO_NU : SAO_NAM;
  return { age, ...g[age % 9] };
}

export function fortuneFor(year, dayKey, gender, nowYear = new Date().getFullYear()) {
  const can = CAN[year % 10], chi = CHI[year % 12], hanh = HANH[year % 10];
  const [Y, Mo, D] = String(dayKey).split('-').map(Number);
  const r = mulberry(year * 10007 + (Y || 0) * 372 + (Mo || 0) * 31 + (D || 0));
  const star = () => 2 + Math.floor(r() * 4);              // 2..5 sao
  const out = {
    year, can, chi, animal: CON_GIAP[chi], icon: GIAP_ICON[chi], hanh, day: dayKey,
    stars: { tai: star(), viec: star(), khoe: star(), tinh: star() },
    mau: MAU[hanh], so: 1 + Math.floor(r() * 9), gio: GIO[Math.floor(r() * 12)],
    advice: LOI_KHUYEN[Math.floor(r() * LOI_KHUYEN.length)]
  };
  if (gender === 'nam' || gender === 'nu') out.sao = { gender, ...saoHan(year, gender, nowYear) };
  return out;
}

/* ============================ 4. XEM TUỔI HỢP ============================ */
const TAM_HOP = [['Thân', 'Tý', 'Thìn'], ['Dần', 'Ngọ', 'Tuất'], ['Tỵ', 'Dậu', 'Sửu'], ['Hợi', 'Mão', 'Mùi']];
const LUC_HOP = [['Tý', 'Sửu'], ['Dần', 'Hợi'], ['Mão', 'Tuất'], ['Thìn', 'Dậu'], ['Tỵ', 'Thân'], ['Ngọ', 'Mùi']];
const LUC_XUNG = [['Tý', 'Ngọ'], ['Sửu', 'Mùi'], ['Dần', 'Thân'], ['Mão', 'Dậu'], ['Thìn', 'Tuất'], ['Tỵ', 'Hợi']];
const SINH = { Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim', Kim: 'Thủy', Thủy: 'Mộc' };           // tương sinh
const KHAC = { Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim', Kim: 'Mộc' };           // tương khắc
const pairHas = (list, a, b) => list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

export function compatibility(yearA, yearB) {
  const A = { year: yearA, can: CAN[yearA % 10], chi: CHI[yearA % 12], hanh: HANH[yearA % 10] };
  const B = { year: yearB, can: CAN[yearB % 10], chi: CHI[yearB % 12], hanh: HANH[yearB % 10] };
  A.animal = CON_GIAP[A.chi]; B.animal = CON_GIAP[B.chi]; A.icon = GIAP_ICON[A.chi]; B.icon = GIAP_ICON[B.chi];
  let score = 55; const notes = [];
  if (A.chi === B.chi) { score += 6; notes.push(`Cùng tuổi ${A.animal}: hiểu nhau nhưng dễ cùng tính, cần nhường nhịn.`); }
  else if (pairHas(LUC_HOP, A.chi, B.chi)) { score += 28; notes.push(`${A.animal} và ${B.animal} thuộc lục hợp: rất ăn ý, bổ trợ cho nhau.`); }
  else if (TAM_HOP.some(g => g.includes(A.chi) && g.includes(B.chi))) { score += 22; notes.push(`${A.animal} và ${B.animal} thuộc tam hợp: cùng chí hướng, dễ hợp tác.`); }
  else if (pairHas(LUC_XUNG, A.chi, B.chi)) { score -= 26; notes.push(`${A.animal} và ${B.animal} thuộc lục xung: dễ va chạm, cần nhẫn nại và lắng nghe.`); }
  else notes.push(`${A.animal} và ${B.animal} không xung không hợp: êm đềm, tùy cách cư xử.`);
  if (A.hanh === B.hanh) { score += 8; notes.push(`Cùng hành ${A.hanh}: đồng điệu.`); }
  else if (SINH[A.hanh] === B.hanh) { score += 16; notes.push(`${A.hanh} sinh ${B.hanh}: ${A.can} nâng đỡ ${B.can}.`); }
  else if (SINH[B.hanh] === A.hanh) { score += 16; notes.push(`${B.hanh} sinh ${A.hanh}: ${B.can} nâng đỡ ${A.can}.`); }
  else if (KHAC[A.hanh] === B.hanh || KHAC[B.hanh] === A.hanh) { score -= 14; notes.push(`${A.hanh} và ${B.hanh} tương khắc: cần hóa giải bằng sự thấu hiểu.`); }
  score = clamp(score, 5, 98);
  const verdict = score >= 80 ? 'Rất hợp' : score >= 65 ? 'Hợp' : score >= 50 ? 'Bình thường' : score >= 35 ? 'Hơi khắc' : 'Khắc nhiều, cần nhường nhịn';
  return { a: A, b: B, score, verdict, notes };
}
