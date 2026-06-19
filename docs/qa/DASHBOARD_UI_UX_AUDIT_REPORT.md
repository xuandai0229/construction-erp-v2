# Báo Cáo Audit UI/UX Màn Hình Dashboard

## 1. Các file đã kiểm tra
- `src/app/(dashboard)/dashboard/page.tsx`: Màn hình Tổng quan hiện tại.
- `src/components/layout/sidebar.tsx`: Thanh điều hướng bên trái.
- `src/components/layout/header.tsx`: Thanh công cụ phía trên.

## 2. Vấn đề UI/UX hiện tại
- **Dashboard quá sơ khai:** Giao diện chỉ có 4 thẻ KPI đơn giản (Tổng công trình, Số tài liệu, Số hợp đồng, Nhà cung cấp) và một danh sách "Báo cáo hiện trường gần đây". Quá nhiều khoảng trắng, thiếu chiều sâu.
- **Tính đồng bộ kém:** Chưa mang âm hưởng cao cấp (SaaS/ERP) như màn hình Đăng nhập mới thiết kế.
- **Sidebar & Header đơn điệu:** Font chữ, màu sắc và icon chưa được chăm chút. Khoảng cách các menu chưa thật sự tối ưu, logo chỉ là dòng chữ text thường.
- **Thiếu thao tác nhanh:** Người dùng vào trang chủ không có lối tắt để đến ngay các tác vụ hàng ngày như "Nhập khối lượng", "Bảng khối lượng gốc".

## 3. Vấn đề Dữ liệu & Logic
- **Đứt gãy dữ liệu (Data disconnect):** Sidebar đang ẩn (commented out) các module Hợp đồng (`contracts`), Nhà cung cấp (`suppliers`), nhưng Dashboard vẫn query và hiển thị KPI của các module này. Điều này gây khó hiểu vì người dùng thấy số nhưng không bấm vào xem được.
- **Bỏ qua dữ liệu lõi:** Phân hệ quan trọng nhất là **Tiến độ thi công (Field Progress)** hoàn toàn vắng bóng trên Dashboard. 
- **Query `recentReports`:** Đang lấy từ bảng `SiteReport`. Tuy nhiên, trong phiên bản hiện tại, dữ liệu khối lượng hiện trường thực tế được lưu ở `FieldProgressEntry`. Việc lấy `SiteReport` có thể không phản ánh đúng tiến độ thi công thực tế hằng ngày.

## 4. Rủi ro nếu sửa sai
- **Rủi ro phân quyền (RBAC):** Màn hình dashboard đang dùng `accessibleProjectIds` để lọc dữ liệu theo user role. Nếu sửa query không cẩn thận có thể gây rò rỉ dữ liệu (IDOR) - User thấy công trình của người khác.
- **Rủi ro hiệu năng (Performance):** Nếu query `FieldProgressEntry` không tối ưu có thể gây chậm (N+1 query) vì bảng này chứa rất nhiều dòng dữ liệu hằng ngày.

## 5. Phạm vi sẽ sửa (In Scope)
- **Thiết kế lại `page.tsx` (Dashboard):** 
  - Tạo Hero section: Chào mừng, hiển thị ngày giờ và các nút thao tác nhanh (Quick actions).
  - Nâng cấp 4 thẻ KPI tập trung vào: *Công trình đang thi công*, *Tiến độ hiện trường*, *Số yêu cầu vật tư* hoặc *Tài liệu*.
  - Thêm danh sách "Công trình đang thi công" với status rõ ràng.
  - Thêm cảnh báo/việc cần chú ý (Ví dụ: Chưa nhập khối lượng hôm nay).
- **Tinh chỉnh `sidebar.tsx` & `header.tsx`:**
  - Làm đẹp logo, căn chỉnh spacing, cập nhật active states cho sang trọng.
  - Thay thế/gộp các KPI không quan trọng (Hợp đồng, Nhà cung cấp) bằng các KPI cốt lõi (Tiến độ).

## 6. Phạm vi không sửa (Out of Scope)
- Không chỉnh sửa DB Schema (`schema.prisma`).
- Không sửa logic Auth/Middleware/Session.
- Không chỉnh sửa hay thêm mới các route nằm ngoài dashboard (như trang chi tiết dự án hay trang nhập khối lượng).
- Không fake số liệu; nếu không có dữ liệu thật sẽ hiển thị Empty State tiêu chuẩn.
