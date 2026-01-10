# 💰 Hệ Thống Quản Lý Góp Vốn Gia Đình

Ứng dụng web đơn giản giúp quản lý quỹ góp vốn gia đình, theo dõi góp vốn, rút vốn và tự động tính toán trả nợ.

## ✨ Tính Năng Chính

### 👥 Quản Lý Thành Viên
- Thêm/xóa thành viên góp vốn
- Hiển thị danh sách thẻ thành viên đẹp mắt
- Lưu ngày tham gia của từng người

### 💰 Góp Vốn Tự Động
- Ghi nhận góp vốn hàng tháng cho tất cả thành viên
- **Tự động tính toán trả nợ**: Nếu có người rút vốn, tháng sau họ phải đóng thêm 200k để trả nợ
- Theo dõi tiến độ trả nợ của từng người

### 💸 Rút Vốn
- Ghi nhận khi có người rút tiền
- **Kiểm tra số dư quỹ**: Không cho rút nhiều hơn số tiền thực tế trong quỹ
- Tự động đánh dấu người rút đang có nợ

### 📊 Thống Kê Tổng Hợp
- **3 chỉ số quan trọng**:
  - Tổng tiền đã góp
  - Tổng tiền đã rút (nợ còn lại)
  - Tiền thực tế trong quỹ
- **Bảng chi tiết theo tháng**:
  - Tiền góp mỗi tháng (bao gồm trả nợ)
  - Tiền rút mỗi tháng
  - Nợ còn lại của từng người

### 📜 Lịch Sử Giao Dịch
- Xem toàn bộ lịch sử góp/rút/trả nợ
- Lọc theo loại giao dịch
- Lọc theo thành viên
- Sắp xếp theo thời gian mới nhất

### 💾 Sao Lưu & Khôi Phục
- Xuất dữ liệu ra file JSON
- Nhập dữ liệu từ file backup
- Dữ liệu tự động lưu trên trình duyệt

## 🚀 Hướng Dẫn Sử Dụng

### 1. Khởi Động
- Mở file `index.html` bằng trình duyệt (Chrome, Edge, Firefox...)
- Không cần cài đặt hay kết nối internet

### 2. Thiết Lập Ban Đầu
1. **Thêm thành viên**: Nhập tên 5 thành viên gia đình
2. **Cài đặt số tiền góp**: Mặc định 200.000 đ/tháng (có thể thay đổi)

### 3. Sử Dụng Hàng Tháng
1. Chọn tab "Góp Vốn"
2. Chọn tháng hiện tại
3. Click "Ghi Nhận Góp Vốn Tháng Này"
4. Hệ thống tự động:
   - Ghi nhận 200k cho mỗi người
   - Cộng thêm 200k cho người đang có nợ

### 4. Khi Có Người Rút Tiền
1. Chọn tab "Rút Vốn"
2. Chọn người rút
3. Nhập số tiền và ngày rút
4. Click "Ghi Nhận Rút Vốn"
5. Tháng sau người đó phải đóng 400k (200k góp + 200k trả nợ)

### 5. Xem Thống Kê
- Phần "Tổng Hợp Tình Hình" hiển thị:
  - 3 card tổng quan
  - Bảng chi tiết theo tháng với từng người

## 📝 Ví Dụ Cụ Thể

**Tháng 1:**
- 5 người góp 200k = 1.000.000 đ
- Vũ rút 1.000.000 đ
- Quỹ còn: 0 đ

**Tháng 2:**
- 4 người góp 200k = 800.000 đ
- Vũ góp 400k (200k thường + 200k trả nợ)
- Tổng góp: 1.200.000 đ
- Quỹ có: 1.200.000 đ
- Vũ còn nợ: 800.000 đ

**Tháng 3-6:**
- Tiếp tục như tháng 2
- Vũ trả dần 200k/tháng

**Tháng 7:**
- Vũ đã trả hết nợ
- Vũ chỉ cần góp 200k như mọi người

## 🎨 Tính Năng Giao Diện

- ✅ Thiết kế hiện đại với gradient đẹp mắt
- ✅ Responsive trên mọi thiết bị
- ✅ Hiệu ứng hover mượt mà
- ✅ Màu sắc phân biệt rõ ràng
- ✅ Icons trực quan dễ hiểu
- ✅ Thông báo toast đẹp mắt

## ⚠️ Lưu Ý

1. **Dữ liệu lưu trên trình duyệt**: 
   - Nếu xóa cache trình duyệt sẽ mất dữ liệu
   - Nên xuất backup định kỳ

2. **Không rút quá số dư quỹ**: 
   - Hệ thống sẽ kiểm tra và không cho rút

3. **Trả nợ tự động**: 
   - Mỗi tháng hệ thống tự động tính số tiền phải trả thêm
   - Trả dần 200k/tháng cho đến khi hết nợ

## 🔧 Công Nghệ Sử Dụng

- HTML5
- CSS3 (Flexbox, Grid, Animations)
- JavaScript (Vanilla JS)
- LocalStorage API

## 📱 Tương Thích

- ✅ Chrome
- ✅ Edge
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

## 🆘 Hỗ Trợ

Nếu gặp vấn đề:
1. Thử xuất dữ liệu backup
2. Xóa cache trình duyệt và mở lại
3. Nhập lại dữ liệu từ backup

---

**Phát triển**: 2026
**Phiên bản**: 1.0
**Giấy phép**: Sử dụng cá nhân
