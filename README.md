# Chùa Linh Ứng Online

Game 3D nhiều người chơi chạy trên trình duyệt, lấy bối cảnh **chùa Linh Ứng – Bãi Bụt, bán đảo Sơn Trà, Đà Nẵng**.
Mọi người cùng vào chùa, đi dạo, thắp nhang, thỉnh chuông, đánh trống, gõ mõ, thả hoa đăng, trò chuyện
và ngước nhìn tượng Phật Bà Quán Thế Âm cao 67 m hướng ra biển Đông.

Công nghệ: Three.js (r170) · Socket.IO · Express. Không cần build, không cần file âm thanh (tiếng chuông, trống, mõ, mưa, sóng… đều tổng hợp bằng WebAudio).

## Chạy thử

```bash
npm install
npm start            # http://localhost:3000   (đổi cổng: PORT=8080 npm start)
```

Mở nhiều tab để thử nhiều người chơi. Thêm `?dev=1` vào địa chỉ để bật công cụ gỡ lỗi (`window.__dev`).

## Điều khiển

| Phím / thao tác | Chức năng |
| --- | --- |
| `W A S D` hoặc mũi tên | Di chuyển (`Shift` đi nhanh) |
| Kéo chuột / vuốt, lăn chuột / chụm hai ngón | Xoay và zoom camera. Khi camera đã sát đất, kéo tiếp **lên trên** để ngước nhìn đầu tượng Phật Bà |
| `E` | Tương tác tại điểm đang đứng gần (nút sáng trên thanh hành động) |
| `B` | Lễ Phật (cúi lạy, dùng ở mọi nơi) |
| `T` hoặc nút **Ngồi thiền** | Ngồi thiền xếp bằng, nhắm mắt, hai tay đặt lòng. Bấm lại, bấm nút **Đứng dậy** hoặc bước đi để xả thiền |
| `Enter` | Gõ lời chúc an lành (hiện bong bóng trên đầu) |
| `H` | Ẩn giao diện để chụp ảnh |
| Cần ảo góc trái | Di chuyển trên điện thoại |

## Điểm tương tác (mỗi lần được +1 công đức, công đức là bộ đếm chung của cả chùa)

| Hành động | Ở đâu |
| --- | --- |
| Thắp nhang | Lư hương lớn trước Đại Hùng Bảo Điện (nén nhang cháy ngắn dần và tắt sau 5 phút) |
| Thỉnh chuông | Gác chuông (phía đông sân trên) |
| Đánh trống | Gác trống (phía tây sân trên) |
| Gõ mõ | Trong chánh điện, bên cạnh thầy tụng kinh |
| Thả hoa đăng | Bờ hồ sen phía lối đi (hoa đăng trôi quanh hồ 5 phút) |
| Lễ Phật | Bất cứ đâu; lời khấn đổi theo nơi đứng (chánh điện, đài Quán Thế Âm) |
| Ngồi thiền | Bất cứ đâu; trong chánh điện tự ngồi lên bồ đoàn gần nhất (trong 1,3 m) và quay mặt về bàn thờ. Mỗi lần ngồi được +1 công đức, cách nhau tối thiểu 30 giây. Người chơi khác thấy bạn đang ngồi |

Thời tiết là chung cho cả chùa: nắng, bình minh, hoàng hôn, âm u, mưa, giông bão, sương mù, đêm trăng.
Ai cũng có thể "cầu" đổi (cách nhau tối thiểu 15 giây), server cũng tự đổi sau mỗi 5–10 phút.

Các nhân vật phi người chơi chạy theo đồng hồ server nên ai cũng thấy cùng một cảnh:
chú tiểu quét lá bồ đề về đống lá, năm vị sư kinh hành quanh lư hương, thầy tụng kinh gõ mõ,
chú tiểu thỉnh chuông mỗi 2 phút, bồ câu trên sân, hải âu trên vịnh, cá koi trong hồ sen, cờ Phật giáo,
và ba chú khỉ Sơn Trà ngồi trên tường rào, miếu gốc bồ đề, lan can chánh điện (ban đêm hoặc khi mưa khỉ vào rừng).

## Bối cảnh: điều đã kiểm chứng và điều được cách điệu

Dựa trên các tư liệu công khai (xem cuối file):

- Chùa nằm ở Bãi Bụt, bán đảo Sơn Trà, cách trung tâm Đà Nẵng khoảng 10 km, rộng khoảng 20 ha, khởi công 04/07/2004, khánh thành 30/07/2010.
- Tượng Quán Thế Âm cao 67 m trên đài sen rộng 35 m, tựa lưng vào núi, hướng ra biển Đông; một tay cầm bình nước cam lộ, một tay thủ ấn.
  Trong tượng có 17 tầng.
- Chánh điện thờ Thích Ca Mâu Ni ở giữa, Quán Thế Âm và Địa Tạng hai bên. Có 18 tượng La Hán dọc lối đi.
- Hai câu đối ở cổng: *"Linh ứng sở cầu như ý nguyện / Sơn Trà Bãi Bụt thật hiển linh"*.
- Truyền thuyết thời vua Minh Mạng: một pho tượng Phật dạt vào bãi, ngư dân lập miếu thờ và biển trở nên lặng sóng.
- Sơn Trà là nơi sống của khỉ và voọc chà vá chân nâu.

Phần **cách điệu cho game** (không phải bản đồ thật): bố cục mặt bằng, kích thước các công trình,
gác chuông, gác trống, hồ sen dùng để thả hoa đăng, dãy nhà Tổ phía sau, và dải thành phố Đà Nẵng, núi Hải Vân, Ngũ Hành Sơn,
Cù Lao Chàm ở phía xa chỉ mang tính gợi nhớ.

## Cấu trúc thư mục

```
server/index.js        Express + Socket.IO: người chơi, chat, hành động, công đức, thời tiết, hoa đăng, nhang
shared/layout.js       Hằng số bố cục dùng chung cho server (kiểm tra vị trí) và client (dựng cảnh)
public/index.html      Giao diện (màn hình vào chùa, HUD)
public/style.css
public/js/main.js      Khởi tạo, mạng, điều khiển, camera, vòng lặp
public/js/world.js     Dựng khuôn viên: cổng, sân, bậc thang, lư hương, gác chuông/trống, hành lang, hồ sen…
public/js/hall.js      Đại Hùng Bảo Điện
public/js/statues.js   Tượng Quán Thế Âm, tượng chánh điện, 18 La Hán
public/js/parts.js     Mái cong, cột rồng, lan can, đèn lồng
public/js/terrain.js   Núi Sơn Trà, vách đá, biển, rừng, phông xa
public/js/life.js      NPC, chim, cá, cờ, hoa đăng, nhang, đom đóm, khói
public/js/human.js     Nhân vật (tay giải IK để chắp tay, cầm chổi, gõ mõ)
public/js/weather.js   Bầu trời, mây, mưa, sương, sét, ánh sáng theo thời tiết
public/js/audio.js     Âm thanh tổng hợp
public/js/collision.js Độ cao nền và va chạm
```

## Triển khai lên Render (có sẵn `render.yaml`)

Cấu hình đã khai báo dịch vụ **`linhungtu-online`** (gói free, vùng Singapore, health check `/healthz`),
nên địa chỉ sẽ là **https://linhungtu-online.onrender.com** nếu tên còn trống (tên bị lấy thì Render thêm hậu tố ngẫu nhiên).

1. Đưa mã lên GitHub (repo private cũng được). Nhớ đặt email GitHub dạng `…@users.noreply.github.com` cho repo này, đừng dùng email công ty:
   ```bash
   git init -b main
   git config user.name  "Tên của bạn"
   git config user.email "<id>+<tên>@users.noreply.github.com"
   git add .
   git commit -m "Chùa Linh Ứng Online"
   git remote add origin https://github.com/<tài-khoản>/linhungtu-online.git
   git push -u origin main
   ```
2. Vào https://dashboard.render.com → **New → Blueprint** → chọn repo vừa đẩy → **Apply**. Chờ build xong (khoảng 2–4 phút).
3. Mở địa chỉ Render hiển thị trên trang dịch vụ, ví dụ `https://linhungtu-online.onrender.com`.

Biến môi trường: `PORT` (Render tự cấp), `MAX_PLAYERS` (đặt 60 trong `render.yaml`), `DATA_DIR` (nơi lưu `state.json` chứa tổng công đức và thời tiết).

Lưu ý gói free: dịch vụ ngủ sau 15 phút không ai truy cập, lần mở lại mất khoảng 30–60 giây và công đức/thời tiết trở về mặc định
vì đĩa là tạm (muốn giữ lâu dài thì dùng gói trả phí có Disk và đặt `DATA_DIR` vào đường dẫn Disk).
Muốn dịch vụ luôn thức, dùng một dịch vụ ping định kỳ (ví dụ UptimeRobot) tới `/healthz` mỗi 10 phút; gói free có 750 giờ máy chạy mỗi tháng, đủ cho một dịch vụ chạy liên tục.

### Tên miền riêng (tuỳ chọn, mất phí)

`linhungtu-online.onrender.com` miễn phí. Muốn có tên như `linhungtu-online.com` hoặc `.vn`, phải mua ở nhà đăng ký tên miền
(Mắt Bão, PA Vietnam, Namecheap, GoDaddy…), rồi trong Render vào **Settings → Custom Domains → Add**, làm theo bản ghi CNAME/ALIAS mà Render hiển thị
và chờ cấp chứng chỉ HTTPS tự động (vài phút đến vài giờ).

## Mất mạng và kết nối lại

Khi đứt mạng, client tự nối lại và vào chùa lại đúng chỗ đang đứng (server cấp id mới). Thao tác tương tác bị chặn khi chưa có kết nối,
gói tin di chuyển được gửi dạng "volatile" nên không bị dồn lại khi mạng chậm.

## Bảo vệ phía server

Tên và lời chat được làm sạch (bỏ ký tự điều khiển, ký tự đổi chiều chữ, `<` `>`), giới hạn độ dài; màu áo chỉ nhận từ danh sách;
giới hạn tần suất theo từng loại sự kiện; mỗi hành động có thời gian chờ và phải đứng đủ gần điểm tương tác; vị trí bị kẹp trong vùng đi được
và giới hạn tốc độ; nội dung người dùng luôn được hiển thị bằng `textContent`.

## Nguồn tư liệu về chùa

- [Vietnam Discovery – Linh Ung Pagoda](https://vietnamdiscovery.com/da-nang/attractions/linh-ung-pagoda/)
- [Origin Vietnam – Linh Ung Pagoda guide](https://www.originvietnam.com/destinations/linh-ung-pagoda/)
- [Local Vietnam – Linh Ung Pagoda](https://localvietnam.com/da-nang/linh-ung-pagoda/)
- [Vietnam Tour 247 – Linh Ung Pagoda](https://vietnamtour247.com/linh-ung-pagoda/)
- [Cổng thông tin du lịch Đà Nẵng – Linh Ung Pagoda Bai But](https://danangfantasticity.com/en/linh-ung-pagoda-bai-but)
