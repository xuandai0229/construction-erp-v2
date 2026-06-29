# Báo Cáo Audit Màn Hình Quản Lý Công Trình (Projects Screen)

**Ngày thực hiện:** 19/06/2026
**Trạng thái:** Hoàn tất Audit (Chỉ đọc, KHÔNG sửa code/database)

---

## 1. Tóm Tắt Màn Hình Hiện Tại
Màn hình "Quản lý Công trình" (route: `/projects`) đóng vai trò là danh mục trung tâm để quản lý các dự án xây dựng. Màn hình được xây dựng dưới dạng Server Component (Next.js App Router), bao gồm thanh công cụ tìm kiếm/lọc, bảng danh sách công trình cho Desktop (xl) và dạng lưới (card) cho Mobile/Tablet. Hệ thống có phân quyền (RBAC), các Server Actions tạo/sửa/xóa đều có xác thực và ghi Audit Log đầy đủ. Nhìn chung, kiến trúc nền tảng tốt nhưng UX và UI vẫn ở mức "admin cơ bản", chưa có chiều sâu điều hành.

## 2. Phân Tích UI Theo Code & Ảnh
*(Dựa trên mã nguồn `src/app/(dashboard)/projects/page.tsx`)*

*   **App Shell / Sidebar**: Kế thừa layout chung của Dashboard. Menu "Công trình" đang active. Với role `CHIEF_COMMANDER`, menu tự động đổi tên thành "Công trình của tôi".
*   **Header**: Trang có tiêu đề `<h1>` ("Quản lý Công trình" hoặc "Công trình của tôi"). Góc phải có nút "Tạo công trình" (màu xanh `bg-blue-600`) dành cho người có quyền quản lý.
*   **Bộ lọc/Tìm kiếm**: 
    *   Ô tìm kiếm (placeholder: "Tìm kiếm công trình...") có icon kính lúp.
    *   Dropdown trạng thái: "Tất cả trạng thái", "Chuẩn bị", "Đang thi công", "Tạm dừng", "Hoàn thành", "Hủy".
    *   Nút "Lọc" và nút "Xóa" bộ lọc (chỉ hiện khi có query).
*   **Bảng danh sách (Desktop - `xl:block`)**:
    *   **Cột**: Mã công trình, Tên công trình, Chủ đầu tư, Địa điểm, Trạng thái, Ngày bắt đầu - Kết thúc, Hành động.
    *   **Trạng thái hiển thị**: Dùng component `<StatusBadge>`, màu sắc hợp lý (Thành công = Xanh lá, Chuẩn bị = Xám, Tạm dừng = Vàng, Hủy = Đỏ).
    *   **Hành động**: Nút "Xem" (Outline Xanh) và "Sửa" (Outline Xám).
*   **Mobile View (Dạng Card - `xl:hidden`)**: Bố cục card dọc, hiển thị tên, trạng thái, các thông tin phụ dạng `Chủ đầu tư: ...`, và 2 nút "Chi tiết", "Sửa" bám dưới đáy card.
*   **Empty State**: Đã được xử lý tốt. Tùy thuộc vào việc bị trống do chưa được giao việc (Commander), do bộ lọc (Filter), hay do database trống hoàn toàn mà hiển thị icon và lời nhắc phù hợp.

## 3. Danh Sách File / Route / Schema Đã Kiểm Tra
*   `prisma/schema.prisma` (Model: `Project`, Enum: `ProjectStatus`)
*   `src/app/(dashboard)/projects/page.tsx` (Màn hình danh sách)
*   `src/app/(dashboard)/projects/actions.ts` (Server Actions: Create, Update, Delete)
*   `src/lib/rbac.ts` (Logic kiểm tra quyền)

## 4. Phân Tích Dữ Liệu Đang Hiển Thị
*   Dữ liệu được truy vấn thực tế qua `prisma.project.findMany`.
*   Tình trạng hiển thị text **"Chưa cập nhật"** khá nhiều nếu user không nhập `investor`, `location`, `startDate`, `endDate`.
*   *Rủi ro Dữ liệu Demo*: Các dự án test ("Công Trình test", "Chủ đầu tư test1") đang làm UI kém sang. Cần chuẩn hóa dữ liệu demo trong DB.

## 5. Phân Tích Search / Filter
*   **Tìm kiếm text (`q`)**: Đang tìm theo `code`, `name`, `investor`. Sử dụng `mode: 'insensitive'` (không phân biệt hoa thường) - RẤT TỐT. Query được giữ trên URL.
*   **Lọc trạng thái (`status`)**: Lọc chuẩn xác theo enum `ProjectStatus`.
*   *Hạn chế*: Không có pagination (`take` / `skip`). Nếu có 1,000 công trình, server sẽ tải toàn bộ gây lag và tốn RAM.

## 6. Phân Tích Create / Edit / View / Delete
Tất cả đều nằm trong `actions.ts`:
*   **Create**: Sử dụng Zod validate. Có kiểm tra trùng mã công trình (`code`). Có tạo tự động 8 folder tài liệu mặc định bằng `$transaction`.
*   **Update**: Có validate, kiểm tra trùng mã mới, lưu DB.
*   **Delete**: Đã áp dụng **Soft Delete** (`deletedAt: new Date()`).
*   **View**: Nút Xem dẫn tới `/projects/[id]`.

## 7. Phân Tích RBAC / Security
*   Sử dụng `getSession()` để xác thực.
*   Trang list tự động lọc dự án: `canViewAllProjects` xem được tất cả (`deletedAt: null`), người khác chỉ xem được dự án có trong `projectMembers`.
*   Action tạo/sửa/xóa đều được bảo vệ bởi hàm `canManageProjects(session)`. Tránh được lỗi Direct URL Bypass.

## 8. Phân Tích Audit Log
*   **Tuyệt vời**: Cả 3 action CREATE, UPDATE, SOFT_DELETE đều có gọi `writeAuditLog`.
*   Có lưu lại toàn bộ `beforeData` và `afterData`. Đảm bảo truy vết đầy đủ 100%.

## 9. Phân Tích Document Folders Khi Tạo Project
*   Sử dụng Prisma `$transaction` an toàn.
*   Tạo sẵn 8 thư mục: "01_Hợp đồng", "02_Bản vẽ", "03_Dự toán", "04_Nghiệm thu", "05_Hóa đơn", "06_Thanh toán", "07_Hình ảnh hiện trường", "08_Báo cáo ngày".
*   *Đánh giá*: Logic chặt chẽ, nghiệp vụ đúng thực tế.

## 10. Phân Tích Responsive / Mobile
*   Thiết kế chia cắt rõ ràng: Màn hình lớn dùng Table, màn hình nhỏ dùng Grid Cards. Không bị lỗi tràn bảng ngang (horizontal scroll hỏng UX) trên Mobile.
*   Tuy nhiên, điểm breakpoint đang là `xl` (1280px). Nghĩa là các màn hình tablet lớn, laptop nhỏ (ví dụ 1024px) sẽ bị ép dùng giao diện Mobile Card, có thể gây cảm giác thẻ card quá to, tốn diện tích.

## 11. Phân Tích Empty / Loading / Error States
*   **Empty State**: Đẹp, chia nhiều kịch bản (không có quyền, không có data do filter, không có data do rỗng).
*   **Loading State**: Màn hình này là Async Server Component (`await prisma...`). Nếu DB chậm, Next.js sẽ chặn render. *Hạn chế*: Chưa thấy file `loading.tsx` ở thư mục này, có thể gây cảm giác ứng dụng bị treo khi chuyển trang.
*   **Error State**: Tương tự, chưa thấy `error.tsx` cục bộ để bắt lỗi Prisma.

---

## 12. Danh Sách Vấn Đề Phát Hiện (Phân Loại)

### 🔴 CRITICAL (Bắt buộc sửa ngay để lên Production)
*   Không có lỗi Critical về mặt dữ liệu hoặc bảo mật. RBAC và Transaction đã làm tốt.

### 🟠 HIGH (Nên sửa sớm để đảm bảo hiệu suất/UX)
1.  **Thiếu Pagination**: Query `findMany` không có giới hạn (`take`). Sẽ gây sập UI nếu dữ liệu phình to.
2.  **Thiếu file `loading.tsx`**: Trải nghiệm chuyển trang sẽ bị khựng nếu query chậm.

### 🟡 MEDIUM (Cần cải thiện để nâng cấp sản phẩm)
1.  **Breakpoint màn hình**: Laptop 1024px đang phải dùng giao diện Mobile Card. Nên đổi breakpoint Table xuống `lg` hoặc `md` tùy số lượng cột.
2.  **UX Thao tác nhanh**: Màn hình quản lý dự án chưa có nút đi thẳng vào "Nhập khối lượng hiện trường", bắt buộc phải bấm "Xem" rồi mới điều hướng tiếp.

### 🟢 LOW (Đánh bóng UI)
1.  **Thiếu Summary Cards**: Nên có 3-4 card nhỏ phía trên bảng để báo cáo nhanh (Tổng số, Đang thi công, Hoàn thành...).
2.  **Khoảng trắng chết & Tình trạng "Chưa cập nhật"**: Khi chưa nhập ngày/vị trí, chữ "Chưa cập nhật" xuất hiện dày đặc gây loãng bảng. Có thể thay bằng ký hiệu `-` tinh tế hơn.

---

## 13. Phương Án Nâng Cấp Đề Xuất (Cho Vòng Sau)

### Đề xuất 1: Bổ sung Pagination (Phân trang)
*   **Lợi ích**: Bảo vệ server, tối ưu tốc độ render.
*   **Cần sửa**: `page.tsx` (Thêm params `page`, cập nhật query `take/skip`), component `Pagination`.

### Đề xuất 2: Bổ sung KPI Summary phía trên danh sách
*   **Lợi ích**: Tăng tính "Executive" cho người quản lý.
*   **Cần sửa**: Truy vấn thêm `_count` theo các trạng thái (đang thi công, chờ duyệt...) và hiển thị.

### Đề xuất 3: Chỉnh lại Responsive Breakpoint & Thêm Quick Actions
*   **Lợi ích**: Tận dụng màn hình Laptop, giảm thiểu click (đi thẳng tới nhập khối lượng).
*   **Cần sửa**: `page.tsx` (CSS class, Link component).

---

## 14. Checklist Test / UAT Đề Xuất (Cho QA)
- [ ] Chạy tìm kiếm với chữ hoa, chữ thường, có dấu, không dấu.
- [ ] Chọn các filter kết hợp.
- [ ] Tạo project trùng mã xem báo lỗi có chuẩn không.
- [ ] Đăng nhập bằng role ENGINEER để đảm bảo không thấy nút "Tạo/Sửa/Xóa" và chỉ xem được project của mình.
- [ ] Kiểm tra bảng Audit_Log trong database sau khi xóa dự án.

---

## 15. Kết Luận
*   **Trạng thái hiện tại**: Nền tảng kỹ thuật RẤT TỐT (RBAC, Audit, Transaction, Zod Validation, Soft Delete đều chuẩn). UI ở mức sạch sẽ, cơ bản.
*   **Sẵn sàng UAT chưa?**: Về mặt chức năng lõi là SẴN SÀNG. Về mặt UI/UX cao cấp thì CẦN NÂNG CẤP.
*   **Xác nhận tuân thủ**: Báo cáo này hoàn toàn thực hiện qua Audit tĩnh (Read-only). **Tuyệt đối chưa sửa bất kỳ file code hay thay đổi database nào trong giai đoạn này.**
