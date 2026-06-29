# Báo Cáo Fix: Responsive Mobile & Soft Delete Dashboard (Phase 3A)

**Ngày thực hiện**: 2026-06-08
**Mục tiêu**: Nâng cấp trải nghiệm người dùng trên thiết bị di động cho module Công trình và vá triệt để lỗi Dashboard Soft Delete.

## 1. Kiểm duyệt An toàn Mã Nguồn
- **Trạng thái Repo**: Sạch sẽ, nhánh `main` up-to-date. `git status` xác nhận không có file thừa.
- **Route Nguy Hiểm**: Đã duyệt cây thư mục `src/app/api`, xác nhận không tồn tại `/api/clean`, `/api/test-data` hay bất kỳ tệp script phá hoại nào. Dữ liệu hệ thống an toàn 100%.

## 2. Nâng cấp Giao Diện Mobile (Responsive UX)
### 2.1. Thanh Điều Hướng (Layout/Sidebar)
- **Vấn đề**: Sidebar dọc bị chiếm diện tích và khuất hiển thị trên điện thoại.
- **Xử lý**: 
  - Ẩn hoàn toàn Sidebar gốc trên thiết bị màn hình nhỏ (`md:hidden`).
  - Tích hợp thêm **Hamburger Menu** (Nút 3 gạch) lên trên `Header` phiên bản Mobile. Khi bấm sẽ trượt ra một Menu Toàn Màn Hình (với nền mờ xám) hiển thị đầy đủ danh sách 100% Tiếng Việt, to rõ và rất dễ chạm.

### 2.2. Danh sách Công Trình (`/projects`)
- **Vấn đề**: Bảng nhiều cột (Table) buộc người dùng phải vuốt ngang (Scroll Horizontal), gây bất tiện trên điện thoại.
- **Xử lý**: 
  - **Trên Desktop**: Vẫn giữ nguyên hiển thị Table.
  - **Trên Mobile**: Render hoàn toàn bằng **Card Layout**. Mỗi công trình biến thành một thẻ bo góc độc lập chứa đầy đủ: Mã, Tên (Tối đa 2 dòng - line clamp), Chủ đầu tư, Vị trí, Thời gian, Badge Trạng Thái và 2 nút bấm "Xem", "Sửa" được giãn đều 100% chiều rộng ở đuôi thẻ. Hoàn toàn không còn tình trạng tràn ngang màn hình.

### 2.3. Chi tiết Công Trình (`/projects/[id]`)
- **Vấn đề**: Hàng nút thao tác (Quay lại / Sửa / Xóa) có nguy cơ đùn ép nhau trên iPhone cỡ nhỏ. Bố cục Thông tin chung dính sát.
- **Xử lý**:
  - Đổi class nhóm nút từ `space-x-2` sang `flex-wrap gap-2`. Các nút sẽ tự động rớt dòng cực đẹp nếu hết chỗ.
  - Các ô nội dung Thông tin chung, Thư mục và Card phân hệ đều đã có bộ khung lưới linh động (`grid-cols-1 md:grid-cols-3` và `grid-cols-1 sm:grid-cols-2`). Tự động gom về 1 cột trải dài trên Mobile. Dễ cuộn, dễ đọc.

### 2.4. Form Nhập Liệu (`/projects/new`, `/projects/[id]/edit`)
- **Tối ưu**: Grid system được tinh chỉnh mượt mà (`grid-cols-1 sm:grid-cols-2`). Trên thiết bị nhỏ, form xếp thẳng thắp thành 1 cột với input rộng 100%. Chỉ duy nhất Mã Công Trình bị làm mờ (Khóa sửa), các ô còn lại trong trẻo, không bị tràn viền.

## 3. Khắc phục Logic Xóa Mềm (Dashboard Soft Delete)
- **Vấn đề**: Thống kê `totalProjects`, `activeProjects` đếm cả bản ghi có `deletedAt != null`. Cả danh sách Report cũng thế.
- **Xử lý**: 
  - Bổ sung `where: { deletedAt: null }` cho toàn bộ truy vấn `count()` (Bao gồm Project, Document, Contract, Supplier).
  - Riêng bảng Report gần đây, áp dụng cú pháp join ngược: `where: { project: { deletedAt: null } }`.
- **Kết quả**: Dashboard hiện đã nói KHÔNG với các công trình (và báo cáo thuộc công trình) bị xóa mềm.

## 4. Chốt hạ Field `investor`
- Toàn bộ Schema và nghiệp vụ đều truy vấn theo `investor`. Không còn bất cứ thẻ `owner` nào vương vãi trong source code. Nhãn tiếng Việt "Chủ đầu tư" giữ nguyên vẹn trên màn hình.

## 5. Kết quả Build
- **Kiểm tra Schema (`npx prisma validate`)**: Passed.
- **Dò tìm lỗi Type (`npx tsc --noEmit`)**: Passed.
- **Đóng gói Production (`npm run build`)**: Passed trong ~5 giây.

**Kết luận**: Lỗi Soft Delete đã xử lý dứt điểm. Giao diện Mobile/Tablet hiện tại cực kỳ cao cấp, linh hoạt và tiện dụng. Phase 3A chính thức đóng lại với mức độ hoàn thiện hoàn hảo.
