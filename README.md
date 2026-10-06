# 🎲 COLOR SPILL: TURN-BASED BOARD GAME & CARDS (Bàn Cờ Theo Lượt & 22 Thẻ Bài Chiến Thuật)

> Trò chơi chiến thuật bàn cờ theo lượt được chuyển thể hoàn hảo từ cơ chế gốc của **Color_Spill**. Hỗ trợ cả **Chơi Offline với Máy (AI)** và **Chơi Online Tạo Phòng Bằng Mã Code (P2P WebRTC)**. Sử dụng 100% hình ảnh icon thẻ bài và âm thanh SFX chính hãng từ kho dữ liệu `Color_Spill`!

---

## 🌟 Những Cơ Chế Đột Phá Giống Color_Spill

### 1. 🎲 Bàn Cờ Theo Lượt & Thời Gian 20 Giây:
- **Lượt chơi tuần tự**: Người chơi lần lượt thực hiện lượt đi theo chiều kim đồng hồ (hoặc bị đảo ngược bởi thẻ *Gió đổi chiều*).
- **Quy tắc di chuyển**: Mỗi lượt người chơi có **1 nước đi** để bấm vào ô **kề cận 8 hướng** (ngang, dọc, chéo) với lãnh thổ đang sở hữu.
- **Đồng hồ đếm ngược 20s**: Có âm thanh cảnh báo tích tắc. Nếu hết thời gian mà chưa đi, máy sẽ tự động chọn 1 nước đi ngẫu nhiên hợp lệ và chuyển lượt (`Fallback Move`).

### 2. 🌊 Cơ Chế Khép Kín & Nuốt Trọn Lãnh Thổ (FloodFill Capture):
- Khi các ô màu của bạn tạo thành một vòng khép kín bao vây hoàn toàn một nhóm ô (gồm cả ô trống lẫn ô của đối thủ) mà chúng không thể thoát ra đường biên ngoài bàn cờ, **TOÀN BỘ VÙNG BỊ BAO VÂY SẼ BỊ BẠN NUỐT TRỌN LẬP TỨC**!
- Kèm hiệu ứng âm thanh hào quang `auraframing.mp3` bùng nổ cùng làn sóng neon rực rỡ.

### 3. 🎴 Hệ Thống 22 Thẻ Bài Ma Thuật (Card Event Engine):
Mỗi người chơi có khay bài trên tay (tối đa 5 lá). Đầu mỗi lượt được rút 1 lá bài mới từ bộ bài:
- 🛡️ **Khiên (Shield)**: Tự động kích hoạt đỡ 1 đòn debuff/tấn công từ đối thủ.
- ⚔️ **Phản đòn (Counter)**: Tự động phản ngược chiêu thức debuff về lại kẻ vừa tấn công bạn.
- 🚀 **Khai hoang (Nuke)**: Ngẫu nhiên chiếm 3 ô trống chưa có chủ trên khắp bản đồ.
- ✝️ **Tuyến bất tử (Immortal Line)**: Chọn 1 ô của mình, toàn bộ hàng và cột tạo thành chữ thập qua ô đó được bảo vệ không thể bị cướp trong 3 vòng.
- 🍀 **May mắn bất ngờ (Unexpected Luck)**: Rút ngay 2 thẻ bài từ bộ bài.
- ⏳ **Lùi một bước (Gain Momentum)**: Khóa không dùng bài lượt này, nhưng lượt sau được rút tới 3 thẻ bài.
- 📥 **Thu thập (Card Collection)**: Rút số thẻ tương ứng với diện tích lãnh thổ (mỗi 12 ô được rút 1 lá).
- 👑 **Bộ 5 Mảnh Vỡ Cổ Đại (Shard 1 -> 5 - Thần bài Exodia)**: Thu thập đủ cả 5 mảnh vỡ trên tay sẽ **CHIẾN THẮNG TRẬN ĐẤU NGAY LẬP TỨC**!
- 🚫 **Cấm lượt (Ban Turn)**: Bắt buộc 1 đối thủ phải mất lượt tiếp theo.
- 🔒 **Khóa bài (Disable On Hand)**: Khóa toàn bộ thẻ bài trên tay 1 đối thủ trong 1 lượt.
- 🎯 **Đối thủ truyền kiếp (Rival)**: Bản thân được miễn nhiễm hoàn toàn mọi hiệu ứng từ đối thủ đó trong 3 lượt.
- 🧠 **Thao túng tâm lý (Psyco)**: Thao túng 1 đối thủ, lượt kế tiếp bạn sẽ là người đi cờ thay thế họ!
- 🌀 **Mất kiểm soát (Lose Control)**: Khiến 1 đối thủ bị máy tự động đi ngẫu nhiên ở lượt kế tiếp.
- 🔀 **Tráo bài (Swap Card)**: Đổi toàn bộ các lá bài trên tay với 1 đối thủ.
- 🕵️ **Trộm bài (Steal Card)**: Rút trộm 1 lá bài ngẫu nhiên từ tay đối thủ về tay mình.
- 👁️ **Xem bài (Show Card)**: Soi toàn bộ các lá bài trên tay đối thủ được chọn.
- 🔄 **Đổi thể xác (Body Swap)**: Đại chiêu lật kèo! Hoán đổi toàn bộ các ô lãnh thổ đã chiếm của mình với 1 đối thủ!
- ⛔ **Phong ấn ô (Block Cell)**: Phong ấn vĩnh viễn 1 ô trống trên bản đồ với ổ khóa đỏ 🔒, không ai có thể chiếm được.
- 🏰 **Lâu đài cô độc (Castle Isolate)**: Chọn 1 ô trống cách xa vùng đất của mình, biến 8 ô xung quanh thành lãnh thổ của mình!
- 🌪️ **Gió đổi chiều (Reverse Wind)**: Đảo ngược chiều đi của các đấu thủ.
- 🕊️ **Ngày hoà bình (Peace World)**: Toàn bộ đấu thủ bị khóa bài trong 3 lượt.
- ✌️ **Oẳn tù tì (Rock Paper Scissors)**: Khiêu chiến Kéo - Búa - Bao, người thắng cướp 3 ô đất của đối thủ!
- 🗑️ **Thùng rác**: Hủy bớt thẻ bài thừa trên tay để giải phóng chỗ trống.

### 4. 🏆 Điều Kiện Thắng / Thua:
1. **Thống trị lãnh thổ**: Chiếm từ **&ge; 70%** tổng số ô toàn bàn cờ.
2. **Kẻ sống sót duy nhất**: Tiêu diệt hết đối thủ (khi tất cả đối thủ về 0 ô đất).
3. **Thần bài Exodia**: Tập hợp đủ 5 Mảnh Vỡ Cổ Đại (Shard 1 -> 5) trên tay.
4. **Hết ô trên bàn cờ**: Đấu thủ sở hữu tỷ lệ % đất cao nhất sẽ thắng!

---

## 🚀 Triển Khai Lên Vercel
Dự án là Static Web App thuần túy nên triển khai lên Vercel chỉ mất 30 giây:
```bash
cd c:/Users/.../mini-game
vercel
```
100% không tốn server backend, hoạt động trơn tru trên mọi nền tảng di động và máy tính!
