# Báo cáo Seed Dữ liệu UAT - Phân hệ Kế toán & Thanh toán

Tài liệu này xác nhận việc khởi tạo thành công bộ dữ liệu UAT mô phỏng thực tế cho phân hệ **Kế toán & Thanh toán** (Accounting & Payments) để phục vụ quá trình User Acceptance Testing (UAT).

---

## 1. Mục tiêu seed dữ liệu
- Cung cấp dữ liệu nghiệp vụ xây dựng có cấu trúc giống thực tế (tên công trình, giá trị hợp đồng, nhà cung cấp, loại thanh toán, số tiền trước/sau thuế).
- Đảm bảo tính cô lập dữ liệu (Data Isolation): Tất cả các thực thể UAT đều có tiền tố `UAT-` để phân biệt hoàn toàn với dữ liệu thực tế và dễ dàng dọn dẹp (cleanup).
- Hỗ trợ kiểm thử đầy đủ các trạng thái nghiệp vụ, kiểm tra cảnh báo/chặn vượt hạn mức hợp đồng, kiểm thử phân quyền truy cập (RBAC) và kiểm tra quá hạn thanh toán.

---

## 2. Các thực thể dữ liệu đã tạo

### A. Công trình (Projects) - 2 công trình UAT
1. **UAT-PAY-CT2-HANOI**: `UAT - CT2 Hà Nội - Khối văn phòng` (Trạng thái: `ACTIVE`)
2. **UAT-PAY-TUHIEP-5F**: `UAT - Nhà văn phòng Diên Hồng 5F` (Trạng thái: `ACTIVE`)

### B. Nhà cung cấp (Suppliers) - 5 nhà cung cấp UAT
1. `UAT NCC Thép Hòa Phát` (Mã: `UAT-NCC-HOAPHAT`)
2. `UAT NCC Xi măng Bỉm Sơn` (Mã: `UAT-NCC-BIMSON`)
3. `UAT NCC Cát đá Sông Hồng` (Mã: `UAT-NCC-SONGHONG`)
4. `UAT Đội nhân công cốp pha` (Mã: `UAT-NCC-COPPHA`)
5. `UAT Nhà thầu MEP An Phát` (Mã: `UAT-NCC-ANPHAT`)

### C. Hợp đồng (Contracts) - 4 hợp đồng UAT
1. **UAT-HD-PAY-001**: Trị giá `1.500.000.000 đ` (Thép Hòa Phát - CT2 Hà Nội)
2. **UAT-HD-PAY-002**: Trị giá `850.000.000 đ` (Đội cốp pha - CT2 Hà Nội)
3. **UAT-HD-PAY-003**: Trị giá `620.000.000 đ` (Xi măng Bỉm Sơn - Diên Hồng 5F)
4. **UAT-HD-PAY-004**: Trị giá `1.200.000.000 đ` (MEP An Phát - Diên Hồng 5F)

### D. Tài khoản UAT phục vụ kiểm thử phân quyền (RBAC Users)
Mật khẩu mặc định của tất cả các tài khoản UAT là mật khẩu dev trong hệ thống (mặc định theo cấu hình biến môi trường `SEED_DEV_TEST_PASSWORD`).

1. **uat.admin@ct2.local**: vai trò hệ thống `ADMIN` (Có quyền toàn cục, được duyệt chéo, được tự duyệt hồ sơ của mình).
2. **uat.accountant@ct2.local**: vai trò hệ thống `ACCOUNTANT` (Xem toàn bộ, có quyền đánh dấu `PAID`, không thể duyệt hồ sơ).
3. **uat.pm@ct2.local**: vai trò hệ thống `ENGINEER`, được gán là `PROJECT_MANAGER` tại cả 2 dự án (Tạo đề nghị, cập nhật và duyệt hồ sơ ở cấp dự án).
4. **uat.site@ct2.local**: vai trò hệ thống `ENGINEER`, được gán là `SITE_COMMANDER` tại cả 2 dự án (Tạo, cập nhật và duyệt).
5. **uat.engineer@ct2.local**: vai trò hệ thống `ENGINEER`, chỉ được gán là `SUPERVISOR` tại dự án `UAT-PAY-CT2-HANOI` (Chỉ xem và tạo nháp, không có quyền duyệt, không xem được dự án Diên Hồng 5F).

---

## 3. Danh sách 12 Hồ sơ thanh toán (Payment Requests) theo trạng thái

| Mã Hồ Sơ | Tiêu đề hồ sơ | Dự án | Đối tác | Trạng thái | Tổng thanh toán (VNĐ) | Hạn thanh toán | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UAT-PR-001** | UAT Thanh toán thép đợt 1 | CT2 Hà Nội | Thép Hòa Phát | `DRAFT` | 198.000.000 | +7 ngày | Nháp |
| **UAT-PR-002** | UAT Thanh toán thép đợt 2 - chờ duyệt | CT2 Hà Nội | Thép Hòa Phát | `SUBMITTED` | 275.000.000 | +5 ngày | Chờ duyệt |
| **UAT-PR-003** | UAT Thanh toán cốp pha tầng 1 | CT2 Hà Nội | Đội cốp pha | `APPROVED` | 120.000.000 | +2 ngày | Đã duyệt |
| **UAT-PR-004** | UAT Đã thanh toán nhân công cốp pha tầng hầm | CT2 Hà Nội | Đội cốp pha | `PAID` | 90.000.000 | -5 ngày (Quá hạn) | Đã thanh toán lúc -3 ngày |
| **UAT-PR-005** | UAT Hồ sơ bị từ chối - thiếu biên bản nghiệm thu | CT2 Hà Nội | Đội cốp pha | `REJECTED` | 75.000.000 | +4 ngày | Lý do: Thiếu biên bản nghiệm thu... |
| **UAT-PR-006** | UAT Hồ sơ đã hủy - nhập sai hợp đồng | CT2 Hà Nội | Đội cốp pha | `CANCELLED` | 55.000.000 | +10 ngày | Đã hủy |
| **UAT-PR-007** | UAT Thanh toán xi măng đợt 1 | Diên Hồng 5F | Xi măng Bỉm Sơn | `SUBMITTED` | 104.500.000 | +10 ngày | Chờ duyệt |
| **UAT-PR-008** | UAT Thanh toán xi măng quá hạn | Diên Hồng 5F | Xi măng Bỉm Sơn | `APPROVED` | 143.000.000 | -7 ngày (Quá hạn) | **Dùng test card quá hạn** |
| **UAT-PR-009** | UAT Tạm ứng MEP An Phát | Diên Hồng 5F | MEP An Phát | `DRAFT` | 220.000.000 | +15 ngày | Tạm ứng |
| **UAT-PR-010** | UAT MEP đã duyệt chờ chi | Diên Hồng 5F | MEP An Phát | `APPROVED` | 330.000.000 | +2 ngày | Đã duyệt |
| **UAT-PR-011** | UAT MEP đã thanh toán | Diên Hồng 5F | MEP An Phát | `PAID` | 165.000.000 | -2 ngày | Đã thanh toán lúc -1 ngày |
| **UAT-PR-012** | UAT Hồ sơ không gắn hợp đồng - chi phí nhỏ | Diên Hồng 5F | Cát đá Sông Hồng | `SUBMITTED` | 38.500.000 | +4 ngày | Không có HĐ |

---

## 4. Giá trị Dashboard kỳ vọng (Tổng hợp từ UAT)
Nếu lọc xem toàn cục (vai trò Admin/Accountant):
- **Tổng giá trị (không tính Rejected/Cancelled)**: `1,645,500,000 đ`
- **Chờ duyệt (SUBMITTED)**: `418,000,000 đ` (UAT-PR-002, 007, 012)
- **Còn phải trả (Đã duyệt - APPROVED)**: `593,000,000 đ` (UAT-PR-003, 008, 010)
- **Đã thanh toán (PAID)**: `255,000,000 đ` (UAT-PR-004, 011)
- **Quá hạn thanh toán (APPROVED nhưng quá hạn hoặc các trạng thái khác chưa trả)**: 1 hồ sơ quá hạn chờ chi (`UAT-PR-008` trị giá 143M) và 1 hồ sơ đã thanh toán quá hạn (không tính vào cảnh báo quá hạn hoạt động).

---

## 5. Kết quả chạy script và kiểm thử hệ thống
Tất cả các lệnh cần thiết để kiểm thử build và types đã được thực thi thành công:
1. `npx tsx scripts/seed-accounting-payments-uat.ts` ✅ (Thêm mới/cập nhật thành công 5 user, 2 dự án, 5 nhà cung cấp, 4 hợp đồng, và 12 hồ sơ thanh toán).
2. `npx prisma validate` ✅ (Schema Prisma hợp lệ hoàn toàn).
3. `npx tsx scripts/qa-accounting-payments.ts` ✅ (Pass toàn bộ kiểm thử tích hợp).
4. `npx tsc --noEmit` ✅ (Không phát hiện lỗi Type).
5. `npm run build` ✅ (Build production tối ưu hóa tĩnh thành công).

---

## 6. Hướng dẫn Test UAT trên UI

### Bước 1: Đăng nhập bằng tài khoản UAT phân quyền
Hãy mở trình duyệt và đăng nhập với một trong các tài khoản sau:
- Đăng nhập `uat.admin@ct2.local` để có quyền quản trị tối cao (được approve, được đánh dấu PAID, xem toàn bộ).
- Đăng nhập `uat.pm@ct2.local` để test vai trò quản lý dự án (tạo đề nghị, duyệt đề nghị).
- Đăng nhập `uat.engineer@ct2.local` để test việc phân quyền hạn chế (chỉ xem được dự án CT2 Hà Nội, không thấy dự án Diên Hồng 5F, không có nút duyệt).

### Bước 2: Kiểm tra Dashboard và Bảng danh sách
- Truy cập vào `/accounting`.
- Kiểm tra các Card Dashboard (Tổng giá trị, Chờ duyệt, Còn phải trả, Đã thanh toán) hiển thị đúng số liệu cộng dồn của 12 hồ sơ trên.
- Thử bộ lọc **Công trình** (CT2 Hà Nội / Diên Hồng 5F) hoặc lọc theo **Trạng thái** (Chờ duyệt, Đã thanh toán...) để xem bảng dữ liệu phản hồi lập tức.
- Reload lại trang `/accounting` nhiều lần để đảm bảo không gặp lỗi crash `Decimal objects are not supported`.

### Bước 3: Test tạo mới hồ sơ & Gửi phê duyệt
- Bấm **"Tạo hồ sơ"** (chỉ hiển thị với vai trò có quyền).
- Điền tiêu đề, chọn công trình, chọn nhà cung cấp và hợp đồng tương ứng.
- Nhập tiền trước thuế, hệ thống sẽ tự động định dạng VNĐ và tính toán tổng tiền.
- Bấm **"Gửi phê duyệt"** (nút đã được đổi tên từ "Lưu & Trình duyệt"). Hồ sơ sẽ xuất hiện trong bảng với trạng thái **Chờ duyệt**.

### Bước 4: Test logic chặn vượt hạn mức Hợp đồng
- Hợp đồng `UAT-HD-PAY-001` có tổng giá trị là `1.500.000.000 đ`.
- Hiện tại đã có 2 hồ sơ đề nghị thanh toán gắn với hợp đồng này:
  - `UAT-PR-001` (DRAFT): `198.000.000 đ` (không tính vào lũy kế do là nháp).
  - `UAT-PR-002` (SUBMITTED): `275.000.000 đ` (được tính vào lũy kế).
- Hãy đăng nhập tài khoản UAT PM hoặc Admin, thử tạo một hồ sơ thanh toán mới liên kết với `UAT-HD-PAY-001`.
- Nhập số tiền trước thuế là `1.300.000.000 đ`.
- Bấm **"Gửi phê duyệt"**.
- **Kỳ vọng**: Hệ thống sẽ chặn đứng hành vi này, hiển thị thông báo lỗi màu đỏ dạng: `Thanh toán vượt quá giá trị hợp đồng (Vượt 75.000.000 đ)` (vì 275.000.000 + 1.300.000.000 = 1.575.000.000 đ, vượt quá 1.500.000.000 đ).

---

## 7. Cách dọn dẹp (Cleanup) dữ liệu UAT
Nếu muốn hoàn tác và dọn sạch dữ liệu UAT mà không ảnh hưởng tới dữ liệu gốc của hệ thống, bạn có thể thực hiện chạy câu lệnh SQL hoặc viết một script dọn dẹp ngắn lọc theo tiền tố:
```sql
DELETE FROM "PaymentRequest" WHERE "requestCode" LIKE 'UAT-%';
DELETE FROM "Contract" WHERE "contractNo" LIKE 'UAT-%';
DELETE FROM "Supplier" WHERE "code" LIKE 'UAT-%';
DELETE FROM "ProjectMember" WHERE "projectId" IN (SELECT "id" FROM "Project" WHERE "code" LIKE 'UAT-%');
DELETE FROM "Project" WHERE "code" LIKE 'UAT-%';
DELETE FROM "User" WHERE "email" LIKE 'uat.%';
```
Cách này đảm bảo loại bỏ hoàn toàn các thực thể UAT mà không đụng chạm tới bất kỳ dữ liệu thực tế nào của hệ thống.
