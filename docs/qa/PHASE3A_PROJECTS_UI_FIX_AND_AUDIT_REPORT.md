# Báo Cáo Phase 3A-Fix: UI Refinement & Audit Module Công Trình

**Ngày thực hiện**: 2026-06-08
**Mục tiêu**: Tối ưu UI/UX, chuẩn hóa hiển thị và audit lại kiến trúc dữ liệu cho Phase 3A mà không tạo mới module.

## 1. Tối Ưu Giao Diện & Trải Nghiệm (UI/UX Fixes)
- **Đổi Logo**: Đã chuyển văn bản từ "Construction ERP" thành **"ERP Công trình"** tại cả trang Login (`src/app/login/page.tsx`) và Sidebar (`src/components/layout/sidebar.tsx`), giúp thuần Việt hóa hệ thống.
- **Chuẩn hóa Ngày Tháng**: Đã sử dụng `date-fns` với format `'dd/MM/yyyy'` để thay thế hoàn toàn phương thức `toLocaleDateString('vi-VN')` trong `Dashboard`, `Projects List` và `Project Details`. Điều này đảm bảo định dạng ngày luôn luôn cố định, không bị ảnh hưởng bởi locale của thiết bị người dùng.
- **Form Công Trình (`project-form.tsx`)**: Đã cập nhật input styles. Những field bị khóa (Mã công trình) sẽ hiển thị mờ với nền xám (`read-only:bg-slate-100 read-only:text-slate-500`), tránh gây nhầm lẫn. Các input thông thường dùng viền `border-slate-300`, chữ `text-slate-900` đen rõ nét.
- **Tính năng chuyển trang nhanh**:
  - Đã thêm nút **"Xem"** trong bảng Danh sách công trình để dẫn thẳng vào trang Chi tiết dự án (`/projects/[id]`).
  - Đã thêm nút **"Quay lại danh sách"** ở góc phải trang Chi tiết để User dễ dàng thoát ra mà không cần dựa vào Sidebar.

## 2. Audit Kiến Trúc Database
- **Vấn đề từ vựng (`owner` vs `investor`)**: Schema `Project` đang lưu Chủ đầu tư vào trường `owner`. Mặc dù "Owner" có thể ám chỉ "Project Owner", trong ngữ cảnh ERP nó thường dễ nhầm lẫn thành người sở hữu phần mềm hoặc cá nhân phụ trách nội bộ. 
  - **Đề xuất**: Nên đổi tên cột thành `investor` hoặc `client` để tách bạch rõ ý nghĩa. 
  - **Hành động**: Để đảm bảo an toàn tuyệt đối cho dữ liệu hiện hành (nguyên tắc "Không rủi ro migration ở phase fix"), tôi giữ nguyên `owner` nhưng ghi nhận nợ kỹ thuật (technical debt) này cho Phase tái cấu trúc DB nếu có.

## 3. Data Integrity & Validation (Log Audit)
Thông qua kịch bản kiểm tra truy vấn dữ liệu trực tiếp:
- **Tự động sinh Folder**: Đã xác nhận công trình được tạo trong Database kéo theo đầy đủ 08 thư mục thuộc `DocumentFolder` ("01_Hợp đồng", "02_Bản vẽ", "03_Dự toán", "04_Nghiệm thu", "05_Hóa đơn", "06_Thanh toán", "07_Hình ảnh hiện trường", "08_Báo cáo ngày"). Code `$transaction` hoạt động chuẩn.
- **Ghi log Hệ thống**: Truy vấn bảng `AuditLog` xác nhận đầy đủ mọi tương tác (hành động `CREATE`) đều được đính kèm EntityType là `Project` và EntityId tương ứng.

## 4. Tình Trạng Build
Các công cụ CI nội bộ đã chạy và xác nhận tính toàn vẹn:
- `npx prisma validate`: **Passed**. (Schema hợp lệ).
- `npx tsc --noEmit`: **Passed**. (Không có cảnh báo TypeScript).
- `npm run build`: **Passed**. (Compile thành công production bundle với 0 lỗi).

Hệ thống Công trình đã thực sự đi vào ổn định. Sẵn sàng nhận chỉ thị mới (có thể chuyển sang tài liệu, WBS hoặc hợp đồng tùy ý bạn).
