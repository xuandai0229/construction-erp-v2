# Báo Cáo Tài Khoản Test Phân Quyền Materials (RBAC)

Thời gian tạo: 25/06/2026

## 1. Thông Tin Chung
- **Đã tạo/cập nhật**: 12 tài khoản test
- **Lệnh thực thi**: `npx tsx --env-file=.env scripts/seed-materials-rbac-test-accounts.ts`

**Công trình test:**
- Tên: Công trình test phân quyền vật tư
- Mã: `TEST-MATERIALS-RBAC`

**Mật khẩu chung:**
- `Test@123456`

---

## 2. Danh Sách Tài Khoản Đăng Nhập

| Email | Mật khẩu | Chức vụ tiếng Việt | Quyền kỳ vọng |
| ----- | -------- | ------------------ | ------------- |
| `admin.materials@test.local` | Test@123456 | Quản trị hệ thống | Toàn quyền vật tư |
| `pm.materials@test.local` | Test@123456 | Quản lý dự án | Toàn quyền vật tư |
| `sitecmd.materials@test.local` | Test@123456 | Chỉ huy công trường | Toàn quyền vật tư |
| `chief.materials@test.local` | Test@123456 | Chỉ huy trưởng công trình | Toàn quyền vật tư |
| `assistant.materials@test.local` | Test@123456 | Chỉ huy phó | Toàn quyền vật tư |
| `qaqc.materials@test.local` | Test@123456 | QA/QC | Chỉ xem |
| `hse.materials@test.local` | Test@123456 | An toàn lao động | Chỉ xem |
| `supervisor.materials@test.local` | Test@123456 | Giám sát | Chỉ xem |
| `viewer.materials@test.local` | Test@123456 | Chỉ xem | Chỉ xem |
| `guest.materials@test.local` | Test@123456 | User không thuộc công trình | Không thuộc công trình, bị chặn |
| `director.materials@test.local` | Test@123456 | Giám đốc chưa gán công trình | Giám đốc chưa gán công trình, bị chặn |
| `accountant.materials@test.local` | Test@123456 | Kế toán được gán chỉ xem | Kế toán chỉ xem |

---

## 3. Hướng Dẫn Test Thủ Công
Hãy dùng ẩn danh hoặc trình duyệt mới để đăng nhập thử nghiệm theo kịch bản:

**1. Đăng nhập `admin.materials@test.local`**
- Phải thấy toàn bộ nút Thêm/Sửa/Xóa/Nhập/Xuất tại công trình `TEST-MATERIALS-RBAC`.
- Thử xóa vật tư `TEST-XM` (đã có tồn kho): Phải xóa thẳng thành công mà không có confirm báo lỗi hay chặn.

**2. Đăng nhập `pm.materials@test.local`**
- Phải có toàn quyền vật tư giống hệt quản trị trong công trình `TEST-MATERIALS-RBAC`.

**3. Đăng nhập `viewer.materials@test.local`**
- Chỉ xem phân hệ vật tư.
- Bảng danh sách vật tư và tồn kho không hiển thị cột Thao tác (không còn nút Sửa/Xóa mờ).
- Không thấy nút Thêm/Sửa/Xóa/Nhập/Xuất trên UI.

**4. Đăng nhập `qaqc.materials@test.local`**
- Chỉ xem được danh mục, bảng tồn kho và lịch sử nhập xuất.
- Không thể thao tác ghi, không có nút thêm mới.

**5. Đăng nhập `guest.materials@test.local`**
- Màn hình sẽ hiển thị lỗi không có quyền truy cập / truy cập bị từ chối khi chọn công trình `TEST-MATERIALS-RBAC`.

**6. Đăng nhập `director.materials@test.local`**
- Do chưa được Add vào Project Member của công trình `TEST-MATERIALS-RBAC`, tài khoản cấp Giám Đốc này cũng sẽ bị chặn theo thiết kế "Fail-Closed" hiện tại.

---

## 4. Tình Trạng Kỹ Thuật (QA/System Check)
Các lệnh kiểm duyệt hệ thống đã được chạy thành công 100%:

- **Tạo Database:** Lệnh upsert 12 account pass, băm mật khẩu chuẩn bằng `bcryptjs`.
- **RBAC Script (`scripts/qa-materials-rbac.ts`):** Các role chặn / pass đúng như ma trận.
- **DB Sync Audit (`scripts/qa-materials-db-sync-audit.ts`):** Tồn kho đồng bộ 100% (Ví dụ: `TEST-XM` tồn 70 bao).
- **Prisma Validate:** Valid 🚀
- **Type Checking (`npx tsc --noEmit`):** Exit Code 0 (No Type Errors).
- **Build Server:** Compiled successfully.
