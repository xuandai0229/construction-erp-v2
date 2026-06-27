# BÁO CÁO QA: ENFORCE CẤU HÌNH TÀI LIỆU (PHASE 2A)

## 1. Kết luận chung
- Trạng thái: **ENFORCED (Document Upload)**
- Mức độ xác minh:
  - **CODE VERIFIED**: PASS
  - **SCRIPT VERIFIED**: PASS (Qua Helper validation Test)
  - **BROWSER VERIFIED**: NOT VERIFIED (Chưa chạy end-to-end browser bot)
  - **RBAC VERIFIED**: CODE-LEVEL VERIFIED (Chưa test đa tài khoản)
- Đánh giá: Logic tải tài liệu (Document Upload) hiện đã tuân thủ các tham số cấu hình trong `SystemSetting`. Việc kiểm duyệt được tách ra thành hàm xử lý thuần (Pure Server Logic Helper) đảm bảo chặn thành công các file vi phạm cấu hình trước khi tạo bản ghi Document.
- Phase 2B (Auto Versioning Full Schema): Đã chống overwrite bằng cách tạo record mới/tăng version. Tuy nhiên chưa có model `DocumentVersion` để gom nhóm UI và rollback/lịch sử phiên bản chuẩn.

## 2. Các file đã sửa / tạo mới
- **Tạo mới:** `src/lib/settings/system-settings.ts` (Helper đọc DB an toàn trên server)
- **Tạo mới:** `src/lib/documents/validation.ts` (Pure Helper chứa quy tắc kiểm tra Size, Ext, Naming độc lập).
- **Sửa API:** `src/app/api/documents/upload/route.ts` (Gọi Validation Helper và xử lý Audit Log, gọi logic check chữ ký - Magic Byte).
- **Sửa Component:** `src/components/documents/document-workspace.tsx` (Lấy settings từ props và giới hạn phía client, hiển thị message).
- **Sửa Page:** `src/app/(dashboard)/documents/[projectId]/page.tsx` (Truyền cấu hình `systemSettings` từ Server xuống Workspace component).

## 3. Bảng Mapping Thực Thi Cấu Hình
| Setting | Stored DB | Enforced Server | UI Reflected | Test Result |
|---------|-----------|-----------------|--------------|-------------|
| `maxUploadSizeMb` | Yes | Helper chặn vượt byte | Hiển thị giới hạn + validate client | SCRIPT PASS |
| `allowedExtensions` | Yes | Helper reject sai extension & danger exts | Hiển thị đuôi hợp lệ | SCRIPT PASS |
| `enforceNaming` | Yes | Helper check min length, chặn path traversal (`../`) | API trả lỗi rõ ràng | SCRIPT PASS |
| `autoVersioning` | Yes | Route tăng field `version` nếu trùng tên | Đẩy doc mới vào danh sách | CODE PASS |

## 4. Luồng dữ liệu và Kiểm tra bảo mật (Code Verified)
1. Dữ liệu cấu hình đọc từ bảng `SystemSetting`.
2. Khi gọi API `/api/documents/upload`: 
   - `validateDocumentUploadPolicy` kiểm tra thông số File Name, Size, Extension và Path Traversal. Nếu vi phạm, trả về lỗi, **không lưu rác** lên storage, **không tạo** bản ghi Document, ghi vào `AuditLog` với action `DOCUMENT_UPLOAD_BLOCKED_BY_POLICY`.
   - `validateFileSignature` kiểm tra File Signature (Magic Byte) cho các đuôi nhạy cảm như `.pdf`, `.jpg`, `.png` nhằm ngăn việc ngụy trang mã độc dưới dạng đuôi hợp lệ.
3. Chặn RBAC: Người dùng gọi thẳng vào route không hợp lệ (sai session, không quyền project) đều bị middleware hoặc API chặn bằng HTTP 403.

## 5. Script QA Run (Bằng chứng Runtime)
Test case đã được thực hiện bằng lệnh: `npx tsx scripts/qa-document-upload-settings.ts`

| Test case | Expected | Result |
| --------- | -------- | ------ |
| Upload file 2MB (giới hạn 1MB) | Chặn | SCRIPT PASS |
| Upload file 0.5MB (giới hạn 1MB) | Cho phép | SCRIPT PASS |
| Upload file `.exe` | Chặn | SCRIPT PASS |
| Upload file `.vbs` (Danger Ext) | Chặn | SCRIPT PASS |
| Upload file tên quá ngắn (`ab.pdf`) | Chặn | SCRIPT PASS |
| Upload file path traversal (`../hack.pdf`) | Chặn | SCRIPT PASS |
| Upload tên chuẩn (`ban_ve.pdf`) | Cho phép | SCRIPT PASS |

## 6. Lệnh đã chạy kiểm chứng
- `npx prisma validate`: **PASS**
- `npx prisma generate`: **PASS**
- `npx tsc --noEmit`: **PASS**
- `npm run build`: **PASS**
