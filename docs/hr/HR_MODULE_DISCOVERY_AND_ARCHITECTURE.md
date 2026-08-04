# BÁO CÁO KHẢO SÁT VÀ THIẾT KẾ KIẾN TRÚC PHÂN HỆ QUẢN LÝ NHÂN SỰ (HRM)
**Dự án:** Construction ERP v2 (`construction-erp-v2`)  
**Tài liệu Kiến trúc:** `docs/hr/HR_MODULE_DISCOVERY_AND_ARCHITECTURE.md`  
**Tài liệu Release Gate:** `docs/hr/HR_ARCHITECTURE_REMEDIATION_GATE.md`  
**Tài liệu Remediation Phase 0.6:** `docs/hr/HR_PHASE_0_6_BASELINE_REMEDIATION_REPORT.md`  
**Tài liệu Readiness Checklist:** `docs/hr/HR_PHASE_1_READINESS_CHECKLIST.md`  
**Cập nhật Phase 0.6:** 03/08/2026  
**Trạng thái:** ARCHITECTURAL SPECIFICATION APPROVED — READY FOR PHASE 1 EXECUTION

---

## 1. XÁC MINH BASELINE VÀ KẾT QUẢ TỐI ƯU CỦA PHASE 0.6

Báo cáo Phase 0.6 đã hoàn tất dọn dẹp baseline và chạy toàn bộ test suite trên CSDL QA cô lập.

### 1.1 Kết Quả Kiểm Tra Bằng Chứng Thực Tế (Final Verification)

| Hạng mục kiểm tra | Lệnh đã chạy | Kết quả thực tế | Trạng thái |
|---|---|---|:---:|
| **Mã nguồn Task** | `git grep -i "/tasks"` | Không còn bất kỳ link runtime `/tasks` nào trên Header hay Bottom Nav. | ✅ **CLEAN** |
| **Route `/tasks` Anonymous** | `GET /tasks` (manual redirect) | `307 Temporary Redirect` -> `/login?next=%2Ftasks`. | ✅ **PASS** |
| **Route `/tasks` Authenticated** | `GET /tasks` (valid session) | `404 Not Found`. Không có lỗi HTTP 500. | ✅ **PASS** |
| **Prisma Schema** | `npx prisma validate` | Schema hợp lệ 100%. | ✅ **PASS** |
| **Prisma Migrate Status** | `npx prisma migrate status` | `21 migrations found`. **Database schema is up to date!** | ✅ **PASS** |
| **TypeScript** | `npx tsc --noEmit` | **Exit code: 0**, 0 type error. | ✅ **PASS** |
| **Vitest Test Suite** | `npx vitest run` | **48/48 test files PASS (343/343 tests PASS)**. | ✅ **PASS 100%** |
| **Production Build** | `npm run build` | Turbopack compiled successfully, **Exit code: 0**. | ✅ **PASS 100%** |

---

## 2. HỆ THỐNG ROLE VÀ KIẾN TRÚC KIỂM SOÁT TRUY CẬP 4 THÀNH PHẦN

### 2.1 Enum `UserRole` Thực Tế
Hệ thống hiện tại duy trì 9 `UserRole` DB chuẩn: `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR`, `CHIEF_COMMANDER`, `MANAGER`, `ENGINEER`, `STAFF`, `SUPERVISION_HEAD`, `CONSTRUCTION_SUPERVISOR`.

### 2.2 Mô Hình Phân Quyền 4 Thành Phần (4-Component Access Control)
1. **`UserRole` (Nhóm quyền hệ thống):** Nhóm quyền tổng quát cấp ứng dụng.
2. **`Permission` (Hành động nghiệp vụ):** `hr.employee.read`, `hr.contract.manage`...
3. **`Data Scope` (Phạm vi dữ liệu):** `ALL_EMPLOYEES`, `OWN_ORGANIZATION_UNIT`, `OWN_PROJECTS`, `SELF_ONLY`, `NONE`.
4. **`Sensitive Field Policy` (Chính sách bảo mật trường):** `BASIC_ONLY`, `CONTACT`, `IDENTITY`, `CONTRACT`, `BANKING`, `FULL`.

### 2.3 Cơ Chế Cấp Quyền Động (`UserAccessGrant`)
Hệ thống hỗ trợ cấp quyền bổ sung cho User với các thuộc tính:
- `permission`: Mã hành động.
- `scope`: Scope dữ liệu.
- `orgUnitId` / `projectId`: Đơn vị / Dự án giới hạn.
- `effect`: `ALLOW` hoặc `DENY` (Trong đó `DENY` có hiệu lực ưu tiên tuyệt đối).
- `grantedById`, `reason`, `expiresAt`: Theo dõi thời hạn, lý do cấp và audit trail.

---

## 3. SINGLE SOURCE OF TRUTH PHÒNG BAN VÀ QUẢN LÝ ĐƠN VỊ

### 3.1 Nguồn Dữ Liệu Phòng Ban Duy Nhất
- Model `Employee` không lưu `primaryOrgUnitId` hay `primaryPositionId`.
- **Nguồn dữ liệu thật duy nhất (Single Source of Truth):** Bảng `EmployeeOrganizationAssignment`.
- **Ràng buộc Invariant:** Không cho phép hai assignment primary của cùng một nhân viên giao thoa thời gian (`startDate` -> `endDate`).

### 3.2 Nguồn Dữ Liệu Cho Trưởng Phòng / Quản Lý Đơn Vị
- Phục vụ scope `OWN_ORGANIZATION_UNIT` mà không hard-code `MANAGER`:
- **Model `OrganizationUnitManagerAssignment`:** Lưu trữ lịch sử bổ nhiệm Trưởng đơn vị (`orgUnitId`, `employeeId`, `startDate`, `endDate`, `isPrimary`).

---

## 4. MODEL `EMPLOYEE DOCUMENT` VÀ KHO TÀI LIỆU BẢO MẬT

### 4.1 Chi Tiết Model `EmployeeDocument`
- `id`: String (CUID, PK)
- `employeeId`: String (FK -> `Employee.id` ON DELETE RESTRICT)
- `documentType`: Enum `EmployeeDocumentType` (`IDENTITY_SCAN`, `DEGREE_DIPLOMA`, `CERTIFICATE_SCAN`, `CONTRACT_SCAN`, `HEALTH_RECORD`, `OTHER`)
- `title`: String
- `documentNumber`: String?
- `issuedDate`: DateTime?
- `expiryDate`: DateTime?
- `secureFileObjectId`: String (FK -> `SecureFileObject.id` ON DELETE RESTRICT)
- `sensitivityLevel`: Enum `SensitivityLevel` (`PUBLIC`, `INTERNAL`, `RESTRICTED`, `CONFIDENTIAL`)
- `uploadedById`: String? (FK -> `User.id` ON DELETE SET NULL)
- `verifiedById`: String? (FK -> `User.id` ON DELETE SET NULL)
- `verifiedAt`: DateTime?

### 4.2 Mã Nhân Viên Cạnh Tranh An Toàn
- Cú pháp `NV-YYYY-NNNN` (Backend tự sinh).
- Sinh mã bằng PostgreSQL Sequence / Atomic Counter Table với Retry mechanism khi phát sinh request đồng thời. Nam lấy theo múi giờ `Asia/Ho_Chi_Minh`.

---

## 5. THIẾT KẾ MÃ HÓA PII AES-256-GCM ENVELOPE

1. **Mã hóa (Encryption Envelope):** Đối tượng Binary / JSON chứa `{ ciphertext, iv, authTag, keyVersion }`.
2. **Standardized Blind Index:** `identityNumberBlindIndex = HMAC-SHA256(secretKey, normalizedIdentityNumber)` (Chỉ chứa chữ số).
3. **UI Masking:** `identityNumberLastDigits` chỉ lưu 4 số cuối. Hiển thị UI: `********8899`.
4. **Security File Proxy:** Đường dẫn duy nhất `/api/hr/documents/[id]/download` kiểm tra token + permission + audit log.

---

## 6. KẾT LUẬN VÀ QUYẾT ĐỊNH RELEASE GATE PHASE 1

### Trạng Thái Gate: **GO FOR PHASE 1 IMPLEMENTATION (APPROVED 100%)**

> [!TIP]
> **ĐÁNH GIÁ GO THEO BẰNG CHỨNG:**
> Mọi điều kiện thử nghiệm, dọn dẹp baseline, đồng bộ migration, kiểm tra test suite 48/48 PASS và hoàn thiện tài liệu kiến trúc Nhân sự đã đạt 100%. Hệ thống chính thức sẵn sàng cho Phase 1 (Định nghĩa Prisma Schema Nhân sự).

---
*Tài liệu Thiết kế Kiến trúc Nhân sự Phase 0.6 hoàn tất.*
