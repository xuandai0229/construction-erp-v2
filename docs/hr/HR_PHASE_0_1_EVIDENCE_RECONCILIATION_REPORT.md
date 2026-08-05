# Báo Cáo Phân Tích & Đối Soát Bằng Chứng Phase 0.1 — HR Module Audit & Release Baseline Verification

**Dự án:** `construction-erp-v2` (Phân hệ Quản lý Nhân sự HR)  
**Phiên bản Báo cáo:** 1.0.0  
**Ngày thực hiện:** 04/08/2026  
**Đơn vị thực hiện:** Chuyên Gia Kiểm Định Kỹ Thuật & Kiến Trúc Sư Phần Mềm ERP  
**Trạng thái Working Tree Git:** DIRTY (`8afc0024f3c3d1df4ead29f94984caf898fcb278`)  
**QUYẾT ĐỊNH RELEASE GATE:** **NO-GO — PHASE 4 BLOCKED**  

---

## SECTION I. TRẠNG THÁI NGUỒN CƠ SỞ GIÁM SÁT (GIT WORKING TREE STATUS)

- **Git Commit SHA Baseline:** `8afc0024f3c3d1df4ead29f94984caf898fcb278`
- **Trạng thái Working Tree:** **DIRTY** (Tồn tại các thay đổi cục bộ chưa commit của đợt Hardening Phase 3.3).
- **Danh sách tệp tin thay đổi chưa commit:**
  - `src/app/hr/employees/[employeeId]/edit/page.tsx`
  - `src/app/hr/employees/[employeeId]/page.tsx`
  - `src/app/hr/employees/actions/employee-actions.ts`
  - `src/app/hr/organization/actions/organization-actions.ts`
  - `src/app/hr/organization/chart/page.tsx`
  - `src/app/hr/organization/managers/page.tsx`
  - `src/app/hr/organization/page.tsx`
  - `src/app/hr/organization/positions/page.tsx`
  - `src/components/hr/employee-create-form.tsx`
  - `src/components/hr/employee-detail-view.tsx`
  - `src/lib/audit-sanitizer.ts`
  - `src/lib/hr/hr-auth-guard.ts`
  - Các tệp tin untracked mới tạo trong `docs/hr/` và `scripts/qa/`.

> **Cam kết:** Không có bất kỳ thay đổi nào thực hiện trên `prisma/schema.prisma` hay các tệp migration SQL trong Phase 0.1 này.

---

## SECTION II. TỔNG QUAN HÀNH CHÍNH & MỤC TIÊU KIỂM TOÁN PHASE 0.1

Phase 0.1 được khởi chạy nhằm thực hiện kiểm tra thấu đáo (Due Diligence Audit) trên toàn bộ báo cáo và mã nguồn HR Phase 0 - Phase 3.3, đính chính triệt để các tuyên bố chủ quan chưa có lệnh chạy bằng chứng thực nghiệm, chuẩn hóa hệ thống tài liệu Master trong thư mục `docs/hr/`, và đưa ra quyết định phát hành dựa trên bằng chứng runtime khách quan.

### 4 Nguyên Tắc Kiểm Toán Tuyệt Đối:
1. **Chỉ công nhận những gì chạy được và có log bằng chứng thực nghiệm.**
2. **Không ảo tưởng về độ sẵn sàng của hệ thống (Strips unsupported claims).**
3. **Phân loại rõ ràng 4 trạng thái:** `VERIFIED CURRENT` (Đã xác minh hiện có), `PARTIALLY VERIFIED` (Đã xác minh một phần), `PROPOSED` (Đề xuất / Chưa làm), `DEFERRED` (Tạm hoãn).
4. **Tuyệt đối ngắt kết nối với Phase 4 khi Quality Gate chưa đạt 100% PASS.**

---

## SECTION III. BẢNG ĐỐI SOÁT CÁC TUYÊN BỐ CŨ VỚI BẰNG CHỨNG THỰC NGHIỆM

| Tuyên Bố Trong Báo Cáo Cũ | Bằng Chứng Thực Nghiệm Kết Xuất | Trạng Thái Thực Tế Sau Kiểm Toán |
| :--- | :--- | :---: |
| "Full 394 tests PASS 100%" | Lệnh `npx vitest run` thu được 394 tests PASS (60 test files). | **VERIFIED CURRENT** (Đã xác minh lại) |
| "Ba Playwright E2E suite PASS" | Lệnh `npx playwright test` chạy 3 suite integration/scope DB thu được 9/9 tests PASS trên `construction_erp_v2_settings_e2e_20260803`. Các suite UI smoke thu được 22/22 tests PASS. | **VERIFIED CURRENT** (Đã phân loại đúng là DB Integration Test & UI Smoke Test) |
| "Production Ready / Sẵn sàng Release Phase 4" | Lệnh `npx tsc --noEmit` và `npm run build` gặp 18 lỗi type mismatch TS2322 / TS2339 trong `employee-detail-view.tsx` & `page.tsx`. | **UNSUPPORTED / FALSE** -> **NO-GO (BLOCKED)** |
| "Phân hệ HR hoàn tất 100%" | Schema mới chỉ có 12 models HR cốt lõi. Các thực thể Hợp đồng, Chứng chỉ, Chấm công, Lương chưa có schema/code. | **UNSUPPORTED / OVERCLAIM** -> **PARTIALLY VERIFIED** |
| "Hỗ trợ Data Scope `OWN_ORGANIZATION_TREE`" | Enum `HrDataScope` trong `prisma/schema.prisma` chỉ có `ALL_EMPLOYEES`, `OWN_ORGANIZATION_UNIT`, `OWN_PROJECTS`, `SELF_ONLY`, `NONE`. Chưa có `OWN_ORGANIZATION_TREE`. | **UNSUPPORTED / PROPOSED** |

---

## SECTION IV. BẢNG XÁC MINH CÔNG NGHỆ VÀ DEPENDENCY CHÍNH THỨC

Được trích xuất trực tiếp từ `package.json`:

| Thành Phần Công Nghệ | Phiên Bản Khai Báo | Ghi Chú Tương Thích |
| :--- | :---: | :--- |
| **Next.js** | `16.2.7` | Framework chính (Turbopack Enabled) |
| **React** | `19.2.4` | Core UI Library |
| **React DOM** | `19.2.4` | DOM Rendering |
| **Prisma CLI / Client** | `^7.8.0` | ORM Engine (Phiên bản đồng bộ 7.8.0) |
| **@prisma/adapter-pg** | `^7.8.0` | PostgreSQL Adapter for Prisma |
| **PostgreSQL Driver (`pg`)** | `^8.21.0` | Driver kết nối cơ sở dữ liệu PostgreSQL |
| **Node Types** | `^20` | TypeScript definitions for Node.js v20 LTS |
| **Vitest** | `^4.1.10` | Unit & Domain Test Runner |
| **Playwright** | `^1.61.1` | E2E & Mutation Integration Runner |
| **TypeScript** | `^5` | Strict Static Typing Compiler |

---

## SECTION V. THỰC TRẠNG PRISMA SCHEMA VÀ MIGRATION

Lệnh kiểm tra kết xuất tại thời điểm audit:

1. **Schema Validation (`npx prisma validate`):**
   - Output: `The schema at prisma\schema.prisma is valid 🚀` (Exit code 0).
2. **Migration Status (`npx prisma migrate status`):**
   - Target Database: `construction_erp_v2_qa` at `127.0.0.1:5432`.
   - Result: `23 migrations found in prisma/migrations. Database schema is up to date!` (Exit code 0, 0 pending, 0 failed).
3. **Prisma Client Generation (`npx prisma generate`):**
   - Output: `✔ Generated Prisma Client (v7.8.0) to .\node_modules\@prisma\client in 609ms` (Exit code 0).

---

## SECTION VI. DANH MỤC THỰC THỂ HR (CURRENT VS PROPOSED)

### 1. Các Thực Thể Đã Có Trong Database Schema (`VERIFIED CURRENT`):
1. `Employee` — Hồ sơ nhân viên chính.
2. `OrganizationUnit` — Đơn vị tổ chức n-cấp.
3. `Position` — Chức danh hành chính.
4. `EmployeeOrganizationAssignment` — Phân công phòng ban chính.
5. `OrganizationUnitManagerAssignment` — Nhiệm kỳ quản lý đơn vị.
6. `ProjectPersonnelRole` — Danh mục vai trò công trường.
7. `EmployeeProjectAssignment` — Điều động công trình (`PARTIALLY VERIFIED`).
8. `HrPermissionDefinition` — Danh mục mã quyền HR.
9. `UserAccessGrant` — Cấp quyền và scope chi tiết cho user.
10. `EmployeeCodeSequence` — Quản lý dải mã tự động `NV-YYYY-NNNN`.
11. `EmployeeChangeHistory` — Lịch sử biến động lao động.
12. `AuditLog` — Nhật ký kiểm toán an ninh.

### 2. Các Thực Thể Đề Xuất Phân Kỳ Sau (`PROPOSED / UNBUILT`):
- `EmploymentContract`, `ContractAppendix` (Phase 5).
- `EmployeeDocument`, `EmployeeCertificate`, `SecureFileObject` (Phase 5).
- `WorkShift`, `AttendanceRecord`, `Timesheet`, `LeaveRequest` (Phase 6).
- `PayrollPeriod`, `PayrollRecord`, `EmployeeCompensation` (**DEFERRED**).

---

## SECTION VII. MA TRẬN MÃ QUYỀN VÀ PHẠM VI DỮ LIỆU (PERMISSIONS & DATA SCOPES)

### 1. Danh Mục Canonical Permissions Hiện Có:
- `hr:employee:read` — Xem hồ sơ nhân viên cơ bản.
- `hr:employee:create` — Khởi tạo hồ sơ nhân viên mới.
- `hr:employee:update` — Cập nhật thông tin nhân viên.
- `hr:employee:delete` — Lưu trữ / Chuyển trạng thái nghỉ việc.
- `hr:employee:read_sensitive` — Giải mã và xem số CCCD nhạy cảm.
- `hr:organization:manage` — Quản lý sơ đồ tổ chức & bổ nhiệm (Bao gồm alias `hr:org_unit:manage`).
- `hr:position:manage` — Quản lý danh mục chức danh.
- `hr:project_role:manage` — Quản lý vai trò công trường (Registry only).
- `hr:access_grant:manage` — Quản lý cấp quyền HR (Registry only).

### 2. Data Scope Enums Trong Schema DB:
- `ALL_EMPLOYEES` — Cho phép truy vấn tất cả bản ghi.
- `OWN_ORGANIZATION_UNIT` — Giới hạn trong đơn vị được phân công quản lý.
- `OWN_PROJECTS` — Giới hạn trong các dự án được tham gia.
- `SELF_ONLY` — Chỉ xem/sửa hồ sơ của chính bản thân.
- `NONE` — Chặn toàn bộ quyền truy vấn.
- `OWN_ORGANIZATION_TREE` — **[PROPOSED / CHƯA CÓ TRONG SCHEMADB]**.

---

## SECTION VIII. KIỂM TOÁN AN NINH PII VÀ MÃ HÓA

1. **Thuật Toán Mã Hóa:** AES-256-GCM với IV 12 bytes ngẫu nhiên và Auth Tag 16 bytes.
2. **Khóa Mã Hóa & Blind Index:**
   - Encryption Key: SHA-256 derived từ `HR_PII_ENCRYPTION_KEY`.
   - Blind Index Key: HMAC-SHA256 derived từ `HR_PII_BLIND_INDEX_KEY`.
   - Đảm bảo tra cứu trùng lập CCCD nhanh bằng `@unique` index trên `identityNumberBlindIndex`.
3. **Bảo Vệ Client Layer:**
   - DTO projection trong `hr-projection.ts` chủ động loại bỏ ciphertext và blind index.
   - Client Component chỉ nhận `identityNumberLastDigits` để hiển thị dạng `********1234`.
4. **Log Kiểm Toán:** Thao tác xem CCCD plaintext phát sự kiện `VIEW_SENSITIVE_IDENTITY_NUMBER` vào `AuditLog`. Plaintext CCCD bị redact 100% qua `audit-sanitizer.ts`.
5. **Key Rotation:** Trạng thái **PROPOSED** (Hệ thống lưu `keyVersion: 1`, chưa có hàm re-encrypt tự động).

---

## SECTION IX. KIỂM TOÁN QUẢN LÝ TỆP TIN BẢO MẬT (FILE STORAGE)

- **Hiện trạng:** Chưa triển khai các bảng lưu trữ file private (`SecureFileObject`), chưa có route proxy download file kiểm soát quyền HR.
- **Trạng thái:** **PROPOSED** (Dự kiến chuyển sang đầu Phase 5 trước khi phát hành tính năng Hợp đồng & Chứng chỉ).

---

## SECTION X. NHẬT KÝ CHẠY TIÊU CHUẨN ĐÁNH GIÁ (QUALITY GATES EXECUTION LOGS)

### Gate 1: Biên Dịch Static Type Check (`npx tsc --noEmit`)
- **Kết quả:** **FAIL** (Exit code 1).
- **Chi tiết lỗi:** 18 lỗi Type TS2322 / TS2339 phát sinh trong `employee-detail-view.tsx` và `page.tsx` (Xung đột kiểu giữa `linkedUser.email: string | null` với `string`, thiếu trường `roleId`, `effectiveDate` trong DTOs).

### Gate 2: Chạy Bộ Test Unit & Domain Integration (`npx vitest run --fileParallelism=false`)
- **Kết quả:** **PASS** (Exit code 0).
- **Thống kê:** 60 test files passed (60/60), 394 tests passed (394/394). Thời gian chạy: 21.92s.

### Gate 3: Chạy Production Build (`npm run build`)
- **Kết quả:** **FAIL** (Exit code 1).
- **Nguyên nhân:** Tiến trình build Turbopack bị dừng tại bước Next.js Typecheck Worker do 18 lỗi TypeScript nêu tại Gate 1.

---

## SECTION XI. XÁC MINH CỔNG AN TOÀN DATABASE QA (QA DB SAFETY GATE)

Module `scripts/qa/setup-qa-env.ts` thực thi kiểm tra 3 cấp trước khi chạy test mutation/integration:
1. Yêu cầu bắt buộc phải khai báo `QA_DATABASE_URL`.
2. Kiểm tra `QA_DATABASE_URL !== DATABASE_URL` để ngăn chạy nhầm DB phát triển chính.
3. Kiểm tra Tên Database phải chứa từ khóa an toàn (`qa`, `test`, `e2e`, hoặc `sandbox`).

### Kết Quả Chạy Suite DB Integration Qua Playwright (`npx playwright test hr-phase3-mutation hr-phase3-scope`):
- **Target DB:** `127.0.0.1:5432 / construction_erp_v2_settings_e2e_20260803` (Verified Safe).
- **Số lượng Test:** 9 tests passed (100%).
- **Phân loại:** Database Integration Test (Node.js/Prisma level verification), không phải Browser UI E2E.

---

## SECTION XII. NHẬT KÝ CHẠY AUTHENTICATED UI RUNTIME TESTS

Chạy 3 suite UI Playwright (`hr-phase2-runtime.spec.ts`, `hr-phase3-organization-runtime.spec.ts`, `hr-route-transition-stability.spec.ts`):

- **Số lượng Test:** 22 tests passed (22/22). Thời gian: 1.4m.
- **Xác thực:** Sử dụng môi trường dev/QA có cấu hình sẵn phiên đăng nhập an toàn.
- **Kết quả kiểm định UI:** Các tuyến đường `/hr`, `/hr/employees`, `/hr/organization/*` tải giao diện light-theme mượt mà, không gặp lỗi render trắng màn hình, tabs navigation chuyển đổi đúng định danh ID.

---

## SECTION XIII. AUDIT AN TOÀN TARGET SCOPE TRÊN SERVER ACTIONS

Toàn bộ 9 Server Actions trong `organization-actions.ts` và 6 Server Actions trong `employee-actions.ts` đã được tích hợp kiểm tra Target Scope:
- Mọi thao tác Mutation đều gọi `checkHrPermission()` và `validateTargetScope()`.
- Chặn đứng hoàn toàn nguy cơ rò rỉ hoặc can thiệp dữ liệu chéo đơn vị (IDOR Vulnerability).

---

## SECTION XIV. SỔ THEO DÕI LỖI (DEFECT REGISTER STATUS)

Trích xuất từ `HR_OPEN_DEFECTS.md`:
- **DEF-01 (Permission code drift):** VERIFIED CLOSED.
- **DEF-02 (Missing Position Deactivation Invariant):** VERIFIED CLOSED.
- **DEF-03 (Target Scope IDOR Vulnerability):** VERIFIED CLOSED.
- **DEF-04 (TypeScript Compile Error):** **OPEN / HIGH** — Xung đột kiểu DTO trong component `employee-detail-view.tsx` gây thất bại build production.

---

## SECTION XV. QUY TRÌNH KHÔI PHỤC KHI CÓ SỰ CỐ (ROLLBACK PROTOCOL)

Khi phát hiện sự cố nghiêm trọng trên môi trường production, quy trình khôi phục được thực hiện theo thứ tự ưu tiên:

1. **Cấp 1: Tắt Feature Flag (Nếu có):** Tắt tính năng biến động thông qua biến môi trường cấu hình mà không cần redeploy.
2. **Cấp 2: Application Rollback (Revert Commit / Redeploy Baseline Stable):** Rollback phiên bản ứng dụng về Commit SHA an toàn trước đó (`8afc0024f3c3d1df4ead29f94984caf898fcb278`).
3. **Cấp 3: Forward Fix (Phát hành bản sửa lỗi khẩn cấp):** Áp dụng cho các lỗi nhỏ không làm hỏng toàn bộ luồng làm việc.
4. **Cấp 4: Kiểm Soát & Xác Minh Dữ Liệu:** Chạy script đối soát tính toàn vẹn dữ liệu để đảm bảo không tồn tại bản ghi mồ côi (Orphan Record).
5. **Cấp 5: Database Restore (Biện pháp cuối cùng):** Khôi phục snapshot Database từ bản backup gần nhất trước thời điểm xảy ra sự cố.

---

## SECTION XVI. QUYẾT ĐỊNH PHÁT HÀNH CHÍNH THỨC (FINAL RELEASE GATE DECISION)

### Bảng Đánh Giá Release Gate Phase 0.1:
- Tiêu chuẩn Vitest Unit/Integration: **PASS** (394/394 tests passed).
- Tiêu chuẩn Playwright DB & UI Integration: **PASS** (31/31 tests passed).
- Tiêu chuẩn Security & Target Scope Guard: **PASS** (100% server actions secured).
- Tiêu chuẩn Static Typecheck (`npx tsc --noEmit`): **FAIL** (Lỗi DEF-04).
- Tiêu chuẩn Production Build (`npm run build`): **FAIL** (Lỗi DEF-04).

---

### QUYẾT ĐỊNH CHÍNH THỨC:
> **NO-GO — PHASE 4 BLOCKED**
> 
> Phân hệ HR **KHÔNG ĐƯỢC PHÉP** triển khai Phase 4 (Điều động công trình & Hợp đồng lao động) hay mở rộng tính năng mới cho đến khi defect **DEF-04** được khắc phục hoàn toàn, đảm bảo lệnh `npx tsc --noEmit` và `npm run build` đạt kết quả PASS 100%.
