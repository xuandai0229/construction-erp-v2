# BÁO CÁO PRECHECK XÓA SẠCH DỮ LIỆU NGHIỆP VỤ (BUSINESS DATA WIPE)
Ngày tạo: 2026-07-03

## 1. KẾT LUẬN CHUNG
- **Trạng thái:** PRECHECK PASS.
- Đã chuẩn bị đầy đủ 6 file script (Backup, Audit, Wipe, Quarantine, Restore, Verify).
- Đã tạo Approval Manifest mặc định khóa an toàn (`liveRunAllowed=false`).
- Đã tạo Bảng ma trận yêu cầu nhập liệu `BLANK_APP_INPUT_REQUIREMENTS_MATRIX_2026_07_03.md`.
- **CHƯA CÓ BẤT KỲ DỮ LIỆU NÀO BỊ XÓA HAY DI CHUYỂN.**

## 2. KIỂM TRA HỆ THỐNG TRƯỚC KHI XÓA
- Git repository sạch sẽ, không có code nghiệp vụ nào đang chờ commit.
- Chế độ DRY_RUN hoạt động ổn định trên tất cả các script.
- Danh sách model được phân loại rõ ràng:
  - **Giữ lại (Keep):** `SystemSetting`.
  - **Giữ có chọn lọc:** `User` (chỉ giữ ADMIN được phê duyệt).
  - **Xóa sạch (Wipe):** `Project`, `ProjectMember`, `SiteReport`, `Document`, `PaymentRequest`, v.v...
  - **Cần phê duyệt tay:** `Supplier`, `MaterialItem`, `AuditLog`.

## 3. CƠ CHẾ AN TOÀN TRƯỚC KHI CHẠY THẬT (LIVE)
Để chạy lệnh wipe thật sự, user phải vượt qua 5 lớp khóa:
1. Đặt biến `DRY_RUN="false"`.
2. Truyền cờ `CONFIRM_WIPE_BUSINESS_DATA="true"`.
3. Truyền cờ `I_UNDERSTAND_THIS_WILL_DELETE_PROJECT_DATA="true"`.
4. Điền biến `BACKUP_PATH_CONFIRMED="[path]"`.
5. Đổi cờ `requiresUserEdit` thành `false` và `liveRunAllowed` thành `true` trong file `docs/qa/business-data-wipe-approval-manifest-2026-07-03.json`.
6. Cung cấp ít nhất 1 UUID của user ADMIN vào mảng `protectedUsers`.

## 4. QUY TRÌNH TIẾP THEO NẾU ĐƯỢC DUYỆT
1. Chạy `scripts/backup-before-business-data-wipe.ts` (Sẽ trích xuất JSON toàn bộ DB ra folder `backups/business-data-wipe/`).
2. Sửa file Approval Manifest (Điền protectedUsers và liveRunAllowed).
3. Chạy lệnh Wipe.
4. Chạy lệnh Quarantine file vật lý.
5. Chạy Verify đếm số lượng bản ghi = 0.

Vui lòng kiểm tra file Manifest và Input Matrix trước khi ra lệnh chạy live!
