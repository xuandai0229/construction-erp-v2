# Báo Cáo Polish Giao Diện Dashboard & App Shell

## 1. Yêu cầu & Bối cảnh
Người dùng mong muốn Dashboard được polish gọn hơn, sang hơn, ít cuộn, ưu tiên hiển thị trên một màn hình và đồng bộ nhận diện thương hiệu "CT2 Hà Nội" ("Công ty Cổ phần Xây dựng và Thương mại Số 2 Hà Nội"). Tất cả thay đổi chỉ tác động đến UI/UX, không sửa đổi database, không tạo fake số liệu.

## 2. Chi tiết hạng mục đã thay đổi

### 2.1. Nhận diện thương hiệu (App Shell)
- **Sidebar & Header Logo**: Đổi từ `ERPCT` sang `CT2 Hà Nội` (Main) và `ERP Công trình` (Sub), bố cục lại kiểu logo xếp dọc gọn gàng, tăng độ chuyên nghiệp.
- **Sidebar Footer**: Đổi dòng text thành `CT2 Hà Nội` / `Nội bộ công ty`.
- **User Role (Header)**: Thêm logic nhận diện `ADMIN` (hoặc `Quản trị viên (Dev)`) để hiển thị clean text là `Quản trị viên` - `Quản trị hệ thống` thay cho text dev thô sơ.

### 2.2. Hero Section (Header Tổng quan)
- Giảm padding và chiều cao khối nền gradient. Chuyển sang bo góc `rounded-[20px]`.
- Thu gọn tiêu đề thành `text-xl sm:text-2xl` và subtitle tối đa 1-2 dòng (`line-clamp`).
- Đưa Date (ngày hiện tại) lên hàng ngang cùng tiêu đề để tiết kiệm chiều dọc.
- Di chuyển nút hành động ("Nhập khối lượng", "Tổng hợp") với kích thước `h-9` gọn gàng.

### 2.3. KPI Cards
- Giảm padding thẻ card (từ `p-6` xuống `p-4 sm:p-5`), bo góc `rounded-[16px]`.
- Thu nhỏ size text số liệu (`text-3xl` xuống `text-2xl`).
- Tối ưu thẻ "Tiến độ bình quân": Hiển thị `Chưa đủ dữ liệu` (thay cho 0%) nếu tổng WBS = 0. Không làm giả số liệu.

### 2.4. Thao tác nhanh (Quick Actions)
- Thiết kế dạng compact `h-[90px] sm:h-[100px]`, bố cục chiều ngang (`flex-row`) với mũi tên nhỏ (`ArrowRight`) thay vì bố cục cột kéo dài.
- Chỉ gồm 3 tính năng quan trọng nhất: "Bảng khối lượng gốc", "Nhập khối lượng ngày", và "Tổng hợp khối lượng".

### 2.5. Danh sách Công trình đang thi công
- Card header có nút `Xem tất cả` liên kết thẳng đến danh sách `/projects`.
- Bảng danh sách: Bổ sung thêm cột `Chủ đầu tư` (`investor`), lấy từ schema Prisma gốc để tăng thông tin giá trị (hiển thị `—` nếu null). Giới hạn tối đa 5 bản ghi.

### 2.6. Báo cáo hiện trường gần đây
- Giới hạn từ 6 xuống tối đa `5` báo cáo. Có nút `Xem tất cả` (khi > 5 bản ghi).
- Gọn lại padding từng dòng `p-3.5 sm:p-4`, icon nhỏ hơn, cấu trúc flex chặt chẽ, rút ngắn mô tả để tiết kiệm không gian.

### 2.7. Cảnh báo vận hành
- Sử dụng background và border cam cực nhạt (`bg-orange-50/30`, `border-orange-100/50`) để tạo sự êm dịu, không bị gắt như màn lỗi.
- Layout gọn gàng, giới hạn không gian tốt hơn.

## 3. Kiểm tra Kỹ thuật & Responsive
- [x] **Desktop (1920x1080 / 1366x768)**: Giao diện gọn gàng. Phần lớn nội dung (Hero, KPI, Quick actions, Danh sách) hiển thị ngay trong viewport đầu tiên, giảm cuộn rõ rệt.
- [x] **Mobile (390x844 / 430x932)**: Các flexbox tự động quấn hàng (`wrap`), card sắp xếp vừa vặn 1 cột. Sidebar ẩn chuẩn xác.
- [x] **Build & TS Check**: 
  - `npx tsc --noEmit`: PASS.
  - `npm run build`: PASS.
  - `npx prisma validate`: PASS.

## 4. Kết luận
Dashboard đã được polish theo hướng gọn, sang, ít cuộn, đúng nhận diện CT2 Hà Nội, ưu tiên 3 màn khối lượng hiện trường và sẵn sàng UAT. Không có rủi ro về logic phân quyền hay thao tác DB.
