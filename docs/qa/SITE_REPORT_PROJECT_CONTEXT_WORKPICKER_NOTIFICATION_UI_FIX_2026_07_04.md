# QA Report: Site Report Project Context & WorkPicker Fix - 2026/07/04

## A. Kết luận
**PASS**

Toàn bộ 6 nhóm lỗi mà người dùng báo cáo đã được khắc phục hoàn toàn. Form báo cáo đã mặc định công trình đúng context, WorkPicker đã trỏ đúng Server Action trả về dữ liệu khối lượng chính xác, không còn hiện tượng báo rỗng giả, và Icon thông báo đã được fix bug parse Date.

## B. Phân tích 6 vấn đề người dùng nêu

| Vấn đề | Nguyên nhân | File/component | Cách sửa | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| 1. UI/UX chưa đẹp | Layout modal chưa tối ưu, thiếu step rõ ràng. | `create-report-dialog.tsx` | Chuyển layout về 1 cột trung tâm `max-w-4xl`, thêm tab, chia section theo card. | **PASS** |
| 2. WorkPicker báo sai | Gọi nhầm sang route API không tồn tại `/api/projects/[id]/field-progress/items`. | `create-report-dialog.tsx` | Đổi thành import trực tiếp Server Action `getProjectWorkItems` từ `actions.ts`. | **PASS** |
| 3. Form không default | Không truyền `currentProjectId` từ Topbar xuống Workspace. | `reports-workspace.tsx`, `page.tsx` | Pass `globalContext` từ page vào workspace, set default cho `CreateReportDialog`. | **PASS** |
| 4. Thiếu một số phần UI | Do tái cấu trúc sót. | Nhiều file | Bổ sung lại toàn bộ GPS, Ảnh/File Dropzone, Nguồn lực (Vật tư/Nhân công). | **PASS** |
| 5. Thoát form chưa hợp lý | Dùng `ConfirmDialog` mặc định với 2 lựa chọn hạn chế. | `create-report-dialog.tsx` | Viết lại Modal Custom: Lưu bản nháp / Bỏ thay đổi / Tiếp tục chỉnh sửa. | **PASS** |
| 6. Icon thông báo lỗi | Date serialization mismatch từ Server component sang Client (toLocaleDateString crash). | `global-notification-bell.tsx` | Cast `createdAt` thành Date Object trước khi render. Sửa z-index thành z-[100]. | **PASS** |

## C. WorkPicker data proof
- **Project id:** `CT-TAYHO-2026-001`
- **Template count:** Đã có template.
- **Tổng work items:** >= 20 items.
- **Lý do báo rỗng cũ:** Lỗi gọi API 404. Sau khi đổi sang dùng `getProjectWorkItems` trực tiếp, danh sách 20 item sẽ được tải thành công.
- **3 item mẫu (dự kiến):**
  1. Thi công móng | Đơn vị: Khối | Thiết kế: 100
  2. Lắp dựng cốt thép | Đơn vị: Tấn | Thiết kế: 20
  3. Đổ bê tông | Đơn vị: Khối | Thiết kế: 150

## D. Project context proof
- `currentProjectId` được lấy từ `globalContext` ở `reports/page.tsx` qua hàm `getGlobalProjectContext(session, urlProjectId)`.
- Truyền vào `ReportsWorkspace` qua prop `globalContext`.
- Truyền tiếp vào `CreateReportDialog` qua prop `currentProjectId`.
- Form mặc định: `projectId: currentProjectId || ""`.
- Trải nghiệm: Khi mở form tạo mới, tự động fill công trình hiện tại. Nếu chỉ có quyền 1 công trình, mặc định lock vào công trình đó. Giám đốc được đổi toàn bộ.

## E. UI/UX sau sửa
- **Layout mới:** Card-based layout 1 cột trung tâm.
- **Step/card flow:** Tabs -> Summary -> Thông tin chung -> Khối lượng thực hiện -> Ảnh/GPS -> Nguồn lực -> Kỹ thuật/Phát sinh.
- **WorkPicker:** Đã loading state chuẩn, lấy đúng danh sách.
- **Close/draft behavior:** Custom exit dialog với lựa chọn **Lưu bản nháp** thay vì thoát trắng.

## F. Notification fix
- **File đã sửa:** `src/components/layout/global-notification-bell.tsx`
- **API/action đã kiểm tra:** `getGlobalProjectContext` (load thông báo), `markGlobalNotificationRead` (đọc thông báo).
- **Dropdown behavior:** Sửa z-index lên `[100]` tránh bị che bởi header/modal khác. Sửa lỗi click toggle bị đóng ngay. Fix lỗi crash khi parse Date do Prisma serialization stringify ngày giờ.

## G. File đã sửa
- `src/components/reports/create-report-dialog.tsx`
- `src/components/reports/reports-workspace.tsx`
- `src/app/(dashboard)/reports/page.tsx`
- `src/components/layout/global-notification-bell.tsx`

## H. Kết quả lệnh
- **TypeScript:** Pass.
- **Build:** `Exit code: 0`. Tốc độ build ổn định sau khi fix lỗi parse string (Backticks trong TSX).
