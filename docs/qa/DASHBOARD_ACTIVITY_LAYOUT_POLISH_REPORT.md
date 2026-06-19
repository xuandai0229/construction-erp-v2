# Báo Cáo Tinh Gọn Layout Hoạt Động Hiện Trường (Dashboard)

## 1. Đánh giá vấn đề ban đầu
- **Vấn đề:** Card "Báo cáo hiện trường" nằm ở cột trái (`lg:col-span-2`), với danh sách kéo dài 5 dòng khiến toàn bộ dashboard bị kéo dài phần dưới, tạo khoảng trắng lớn ở phía cột phải. Điều này khiến giao diện giống một trang danh sách (list page) hơn là một trung tâm điều hành (dashboard).
- **Mục tiêu:** Di chuyển section này sang cột phải, giới hạn nội dung để dashboard cân đối, ngắn gọn và "cao cấp" hơn. Không làm sai lệch logic lấy dữ liệu thật.

## 2. Chi tiết các hạng mục đã thay đổi

### 2.1. Cấu trúc Layout mới (Grid cân đối)
- **Cột Trái (lg:col-span-2):** Hiện tại chỉ còn hiển thị danh sách **"Công trình đang thi công"**. Giới hạn không gian tốt hơn, bảng không bị chèn ngang hoặc kéo dài bất tận.
- **Cột Phải (lg:col-span-1):** 
  - Section trên: **Cảnh báo vận hành** (vẫn giữ nguyên màu cam nhạt tinh tế).
  - Section dưới: **Hoạt động hiện trường gần đây** (Được chuyển từ cột trái sang).

### 2.2. Tinh gọn "Hoạt động hiện trường gần đây"
- **Đổi tên:** Từ "Báo cáo hiện trường" thành "Hoạt động hiện trường gần đây".
- **Giới hạn dữ liệu (Prisma):** Query `prisma.fieldProgressEntry` đã được thay đổi từ `take: 5` thành `take: 3`. Chỉ 3 hoạt động mới nhất được xuất hiện để không kéo dài màn hình.
- **Tối ưu hiển thị dòng:**
  - Thu gọn kích thước icon và giảm text size (`text-[12px]`, `text-[11px]`).
  - Lượt bỏ các thông tin thừa, chỉ hiện Tên công trình, Hạng mục, Khối lượng và Ngày/Trạng thái/Người cập nhật một cách siêu gọn (`truncate`).
  - Header có nút `Xem tất cả` cực kỳ tinh tế nếu có >= 3 bản ghi.
  - Empty state cũng được làm nhỏ nhắn lại, với icon `w-10 h-10` và padding giảm từ `p-10` xuống `p-8`.

### 2.3. Tinh gọn "Cảnh báo vận hành"
- Danh sách công trình chưa có WBS và Chưa nhập khối lượng hôm nay được giới hạn render tối đa **3 dòng đầu tiên** `slice(0,3)`.
- Nếu số lượng vượt quá 3, hiển thị một liên kết tinh tế: `+ X công trình khác` (chuyển hướng về `/projects`).
- Thiết kế này loại bỏ rủi ro dashboard bị tràn chiều dài nếu hệ thống có 20-30 dự án cùng lúc.

### 2.4. Khắc phục triệt để hiển thị "Admin" trên Header
- Mặc dù bản trước đã ẩn chuỗi `(Dev)`, nhưng nếu bản thân giá trị `user.name` trong database gốc là `Admin` thì Header vẫn hiện `Admin`.
- **Đã sửa:** Cập nhật biến `displayUserName`. Nếu người dùng thuộc nhóm Quản trị và tên của họ chứa từ `admin`, hệ thống sẽ override (ghi đè) hiển thị hoàn toàn thành **"Quản trị viên"**. Không còn dấu vết của text kỹ thuật trên UI UAT.

## 3. Kiểm tra Kỹ thuật & Responsive
- [x] **Responsive Desktop (1920x1080 / 1366x768):** Layout 2 cột rất cân đối. Không còn khoảng trắng thừa thãi ở cột phải. Nội dung nằm trọn vẹn trong 1 đến 1.5 màn hình đầu tiên. Không scroll ngang.
- [x] **Responsive Mobile (390x844 / 430x932):** Các flexbox và grid tự động stack 1 cột (Công trình -> Cảnh báo -> Hoạt động). Rất dễ bấm, các font chữ nhỏ gọn không vỡ layout.
- [x] **Build & TS Check:** `npx tsc --noEmit` và `npm run build` PASS 100%. `npx prisma validate` PASS 100%. 
- [x] Không cài đặt thư viện ngoài, 3D Hero SVG vẫn giữ nguyên không thay đổi dung lượng. Không sửa core auth/session/DB.

## 4. Kết luận
Dashboard đã được tinh gọn phần hoạt động hiện trường, không còn card báo cáo kéo dài gây trống layout, giữ dữ liệu thật và sẵn sàng UAT.
