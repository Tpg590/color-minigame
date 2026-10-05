# 🎮 COLOR SPILL: ARENA CONQUEST (Online Multiplayer & Big Board)

> Mini game mở rộng lãnh thổ màu sắc hỗ trợ cả **Chơi Offline với Bot** và **Chơi Online phòng riêng bằng Mã Code (P2P WebRTC)**. Bàn cờ siêu rộng 56x56 ô với **Camera tự động theo dõi nhân vật** và **Bản đồ Radar thu nhỏ**. 100% hoạt động tốt trên Vercel miễn phí mà không cần thuê server backend!

---

## 🌟 Những Nâng Cấp Đột Phá

### 1. 🌐 Chế Độ Chơi Online Tạo Phòng Bằng Mã Code (P2P WebRTC):
- **Tạo Phòng (Host)**: 
  - Bấm **"Tạo Phòng Online"** -> Hệ thống lập tức sinh một mã code phòng gồm 4 ký tự (ví dụ: `CSP-8492` hoặc `8492`).
  - Nút **"📋 Sao chép"** giúp gửi nhanh mã cho bạn bè qua Messenger/Zalo/Discord.
  - Danh sách người chơi trong phòng được cập nhật theo thời gian thực (hiển thị tên, avatar màu sắc đã chọn).
  - Chủ phòng bấm **"BẮT ĐẦU TRẬN ĐẤU"** để cùng vào chiến!
- **Vào Phòng (Join)**:
  - Chọn tab **"🔑 Vào Bằng Mã Code"** -> Nhập mã code phòng -> Bấm **"VÀO PHÒNG"**.
  - Tự động kết nối trực tiếp (Peer-to-Peer DataChannel) tới máy chủ phòng.
- **Hoạt động hoàn hảo trên Vercel**: Sử dụng công nghệ WebRTC PeerJS với máy chủ báo hiệu Cloud miễn phí, không tốn chi phí server, không cần cơ sở dữ liệu!

### 2. 🗺️ Bàn Cờ Mở Rộng 56x56 & Camera Theo Dõi (Viewport Tracking):
- **Bàn cờ cực lớn**: Kích thước 56x56 ô (hơn 3,100 ô gạch), không gian rộng rãi để tự do luồn lách, mở rộng đế chế và mai phục đối thủ.
- **Camera động thông minh**: Camera tự động trượt mượt mà (smooth lerp) theo từng bước di chuyển của khối màu bạn điều khiển, giữ nhân vật luôn ở trung tâm góc nhìn.
- **Frustum Culling**: Chỉ render các ô trong tầm nhìn của màn hình, đảm bảo game chạy mượt mà 60 FPS trên mọi thiết bị.
- **Bản Đồ Radar Thu Nhỏ (Minimap Radar)**: Ở góc dưới bên phải màn hình hiển thị toàn bộ chiến trường 56x56, các vùng đất đã chiếm, vị trí camera và các chấm màu đối thủ đang di chuyển!

### 3. 👑 Nhận Diện Nhân Vật Cực Rõ Ràng:
- Khối của bạn luôn có **Vương Miện Vàng 👑**, viền kép phát sáng Neon, thẻ tên **`👑 [TÊN BẠN] (BẠN)`**, và **sóng radar định vị** ở đầu trận.
- Đối thủ người chơi thật có nhãn `🎮 [Tên]`, đối thủ Bot có nhãn `🤖 [Tên]`.

---

## 🚀 Hướng Dẫn Deploy Lên Vercel Để Chơi Online

Dự án là Static Web App thuần túy nên triển khai lên Vercel chỉ mất 30 giây:

### Cách 1: Dùng Vercel CLI (Nhanh nhất)
1. Mở Terminal tại thư mục `mini-game`:
   ```bash
   cd c:/Users/trilt/Documents/Study/EXE101/mini-game
   ```
2. Chạy lệnh:
   ```bash
   vercel
   ```
3. Bấm `y` và nhấn `Enter` cho các lựa chọn mặc định. Bạn sẽ nhận được đường link web trực tiếp (ví dụ: `https://color-spill-mini-game.vercel.app`).
4. Gửi link này cho bạn bè, 1 người bấm **Tạo Phòng**, người kia bấm **Vào Bằng Mã Code** là có thể đấu trực tuyến ngay lập tức!

### Cách 2: Deploy qua Vercel Dashboard (GitHub)
1. Đẩy thư mục này lên GitHub cá nhân.
2. Đăng nhập [vercel.com](https://vercel.com) -> **Add New...** -> **Project**.
3. Chọn repo vừa tạo và bấm **Deploy**.

---

## 🎮 Phím Điều Khiển
- **Máy tính**: Phím Mũi Tên (`↑` `↓` `←` `→`) hoặc cụm phím `W - A - S - D`.
- **Tạm dừng**: Phím `P` hoặc `Escape`.
- **Điện thoại / Tablet**: Phím ảo D-Pad cảm ứng trên màn hình.
