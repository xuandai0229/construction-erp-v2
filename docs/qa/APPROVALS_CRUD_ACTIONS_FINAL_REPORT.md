# BÁO CÁO KIỂM ĐỊNH CHỨC NĂNG CRUD - APPROVAL CENTER

**Ngày thực hiện:** 26/06/2026
**Mô đun:** Phê duyệt (`/approvals`)
**Mục tiêu:** Xác nhận tính toàn vẹn của bộ chức năng thao tác (Thêm / Sửa / Xóa / Duyệt / Từ chối / Hủy / Xem) trên màn Phê duyệt. Đảm bảo tuân thủ nghiêm ngặt RBAC (Role-Based Access Control) theo Project Scope.

## 1. TRẠNG THÁI CHỨC NĂNG (FEATURE MATRIX)

| Chức năng | Đã có chưa | Quyền truy cập | Trạng thái áp dụng | Test tự động (QA) |
| :--- | :--- | :--- | :--- | :--- |
| **Tạo (Create)** | ✅ Đã có | `ADMIN`, `DIRECTOR`, `MANAGER`, `ACCOUNTANT`, thành viên dự án | Không giới hạn | ✅ PASS |
| **Xem (View)** | ✅ Đã có | Người tạo, `ADMIN`, các cấp Quản lý cao cấp, người có quyền trong công trình | Mọi trạng thái | ✅ PASS |
| **Sửa (Update)** | ✅ Đã bổ sung | Người tạo (chỉ của mình), `ADMIN`, người có quyền Quyết định (`PM`, `SITE_COMMANDER`) trong công trình | `PENDING` | ✅ PASS |
| **Xóa mềm (Soft Delete)**| ✅ Đã có | Người tạo (nếu `PENDING`), `ADMIN` (mọi trạng thái), `PM/COMMANDER` (mọi trạng thái trong công trình của mình) | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED` | ✅ PASS |
| **Duyệt (Approve)** | ✅ Đã có | `ADMIN`, người có quyền Quyết định (`PM`, `SITE_COMMANDER`) trong công trình (không được tự duyệt) | `PENDING` | ✅ PASS |
| **Từ chối (Reject)** | ✅ Đã có | `ADMIN`, người có quyền Quyết định (`PM`, `SITE_COMMANDER`) trong công trình (không được tự từ chối) | `PENDING` | ✅ PASS |
| **Hủy (Cancel)** | ✅ Đã có | Người tạo, `ADMIN`, người có quyền Quyết định (`PM`, `SITE_COMMANDER`) trong công trình | `PENDING` | ✅ PASS |

## 2. PHÂN TÍCH TÍNH TOÀN VẸN VÀ BẢO MẬT DỮ LIỆU

### A. Tích hợp Audit Log
Tất cả các hành động ghi đè hoặc thay đổi trạng thái đều được lưu vết chi tiết trong bảng `AuditLog` với `entityType: "ApprovalRequest"`, bao gồm:
- **Tạo:** Lưu lúc khởi tạo yêu cầu.
- **Sửa:** Cập nhật yêu cầu, ghi nhận các trường dữ liệu thay đổi (Title, Amount, Due Date, ProjectId).
- **Duyệt/Từ chối/Hủy:** Lưu trạng thái thay đổi và ghi chú (Decision Note).
- **Xóa mềm:** Lưu hành động Soft Delete, không làm mất lịch sử ở Audit Log.

### B. Validation an toàn (Server-side & Database)
- **Tiền tệ:** `amount` được ép kiểm tra kiểu (Không âm) khi Tạo và Sửa.
- **Bảo vệ Scope:** Khi `Sửa`, `projectId` có thể thay đổi nhưng user *bắt buộc* phải có quyền ghi trên công trình mới. `sourceId` và `sourceType` (Nguồn dữ liệu gốc) bị **đóng băng (không được sửa)** để tránh phá vỡ tính liên thông dữ liệu.
- **Lý do từ chối:** Nếu `REJECT`, `reason` yêu cầu bắt buộc tối thiểu 10 ký tự.
- **Quy tắc Tự duyệt:** User (dù là PM) không thể tự duyệt hoặc tự từ chối chính đề xuất do mình tạo ra (trừ ADMIN).

### C. Quy tắc Ẩn/Hiện UI theo Trạng thái
- **`PENDING`**: Có Sửa, Duyệt, Từ chối, Hủy, Xóa (tùy role). Có thông báo lưu ý "Sẽ không liên kết với hệ thống gốc".
- **`APPROVED` / `REJECTED` / `CANCELLED`**: Mọi nút chỉnh sửa/trạng thái biến mất. Chỉ còn nút Xem Chi tiết và Xóa (nếu là Admin/PM).

## 3. KIỂM ĐỊNH KỸ THUẬT VÀ QA
- **QA Script (`scripts/qa-approvals.ts`)**: Bổ sung bộ test cho Quyền **Edit**. QA Script báo `PASS 100%`.
- **TypeScript (`npx tsc --noEmit`)**: Vượt qua (Exit code: 0). Mọi lỗi Type trong `actions.ts` và Component đã được khắc phục.
- **Build Server (`npm run build`)**: Vượt qua (Exit code: 0). Không có lỗi build/SSR.
- **Môi trường**: Không sử dụng `alert/confirm/prompt` thuần. Toàn bộ sử dụng UI Dialog component.
- **Mobile Responsive**: Nút Sửa/Chi Tiết/Duyệt/Từ chối/Xóa hiển thị chuẩn trên giao diện Thẻ rút gọn (Mobile Card).

---

## 4. KẾT LUẬN

**GO CÓ ĐIỀU KIỆN - Đủ bộ Thêm/Sửa/Xóa/Duyệt/Từ chối/Xem cho UAT.**

Màn hình Approvals đã có cấu trúc dữ liệu và phân quyền hoàn hảo cho MVP. Chức năng đã hoạt động độc lập an toàn. 

*(Backlog cho tương lai: Timeline thật, xem chứng từ/File đính kèm, phê duyệt nhiều cấp theo chuỗi, và tích hợp Webhook/Callback tự động update trạng thái hồ sơ nguồn)*.
