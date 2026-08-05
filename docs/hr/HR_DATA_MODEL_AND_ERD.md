# HR Data Model & ERD — Mô Hình Dữ Liệu Chi Tiết Phân Hệ Nhân Sự

**Phiên bản:** 1.1.0  
**Tác giả:** Kỹ Sư Cơ Sở Dữ Liệu PostgreSQL / Prisma  
**Trạng thái Kiểm toán:** PARTIALLY VERIFIED  

---

## I. TỔNG QUAN PHÂN BỔ MÔ HÌNH DỮ LIỆU THEO GIAI ĐOẠN

Mô hình dữ liệu HR được phân bổ theo các giai đoạn phát triển nhằm đảm bảo tính ổn định:

| Entity | Status | Có trong Schema | Có Route | Có Service | Có Test | Ghi Chú |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `Employee` | **CURRENT** | YES | YES | YES | YES | Bảng nhân sự cốt lõi, PII AES-256-GCM |
| `OrganizationUnit` | **CURRENT** | YES | YES | YES | YES | Cây đơn vị tổ chức n-cấp |
| `Position` | **CURRENT** | YES | YES | YES | YES | Danh mục chức danh hành chính |
| `EmployeeOrganizationAssignment` | **CURRENT** | YES | YES | YES | YES | Lịch sử phân công phòng ban chính |
| `OrganizationUnitManagerAssignment` | **CURRENT** | YES | YES | YES | YES | Bổ nhiệm/Mãn nhiệm quản lý đơn vị |
| `ProjectPersonnelRole` | **CURRENT** | YES | NO | YES | YES | Danh mục vai trò công trường |
| `EmployeeProjectAssignment` | **PARTIAL** | YES | Placeholder | YES | YES | Điều động công trình (Chưa có UI full) |
| `EmployeeChangeHistory` | **CURRENT** | YES | YES | YES | YES | Nhật ký biến động lao động |
| `HrPermissionDefinition` | **CURRENT** | YES | NO | YES | YES | Danh mục định nghĩa mã quyền HR |
| `UserAccessGrant` | **CURRENT** | YES | NO | YES | YES | Cấp quyền HR & Data Scope chi tiết |
| `EmployeeCodeSequence` | **CURRENT** | YES | NO | YES | YES | Sinh mã nhân viên tự động NV-YYYY-NNNN |
| `AuditLog` | **CURRENT** | YES | NO | YES | YES | Nhật ký kiểm toán an ninh hệ thống |
| `EmploymentContract` | **PROPOSED** | NO | NO | NO | NO | Hợp đồng lao động (Dự kiến Phase 5) |
| `ContractAppendix` | **PROPOSED** | NO | NO | NO | NO | Phụ lục hợp đồng (Dự kiến Phase 5) |
| `EmployeeDocument` | **PROPOSED** | NO | NO | NO | NO | Tài liệu nhân sự số hóa (Dự kiến Phase 5) |
| `EmployeeCertificate` | **PROPOSED** | NO | NO | NO | NO | Chứng chỉ hành nghề (Dự kiến Phase 5) |
| `SecureFileObject` | **PROPOSED** | NO | NO | NO | NO | Đóng gói lưu trữ file bảo mật (Phase 5) |
| `WorkShift` / `AttendanceRecord` | **PROPOSED** | NO | NO | NO | NO | Chấm công & Ca làm (Phase 6) |
| `PayrollPeriod` / `PayrollRecord` | **DEFERRED** | NO | NO | NO | NO | Tính lương (Tạm hoãn) |

---

## II. CHI TIẾT CÁC ENTITY CỐT LÕI (CURRENT IN SCHEMA)

### 1. `Employee` (Hồ Sơ Nhân Sự) — CURRENT
- **Mục đích:** Quản lý lý lịch cá nhân và pháp lý con người.
- **Trường chính:** `id` (PK, CUID), `code` (Unique, NV-YYYY-NNNN), `userId` (Unique, Optional FK), `fullName` (Bắt buộc), `gender`, `dateOfBirth`, `phoneNumber`, `personalEmail`, `joinedDate`, `resignedDate`, `status` (`PROBATION`, `ACTIVE`, `SUSPENDED`, `RESIGNED`, `RETIRED`).
- **Trường PII mã hóa:** `identityNumberEncrypted`, `identityNumberBlindIndex` (Unique), `identityNumberLastDigits`, `encryptionKeyVersion`.
- **Quan hệ:** `User` (onDelete: SetNull), `EmployeeOrganizationAssignment` (onDelete: Restrict), `EmployeeProjectAssignment` (onDelete: Restrict), `EmployeeChangeHistory` (onDelete: Restrict).

### 2. `OrganizationUnit` (Đơn Vị Tổ Chức) — CURRENT
- **Mục đích:** Quản lý nút cây phòng ban/đơn vị hành chính.
- **Trường chính:** `id` (PK, CUID), `code` (Unique), `name`, `parentId` (Optional FK), `description`, `orderIndex`, `isActive`.
- **Quan hệ:** Parent-Child hierarchy (onDelete: Restrict), `EmployeeOrganizationAssignment` (onDelete: Restrict), `OrganizationUnitManagerAssignment` (onDelete: Restrict).

### 3. `Position` (Chức Danh Administrative) — CURRENT
- **Mục đích:** Quản lý vị trí chức danh công ty.
- **Trường chính:** `id` (PK, CUID), `code` (Unique), `title`, `description`, `level` (1..10), `isActive`.
- **Quan hệ:** `EmployeeOrganizationAssignment` (onDelete: Restrict).

### 4. `EmployeeOrganizationAssignment` — CURRENT
- **Trường chính:** `id`, `employeeId`, `organizationUnitId`, `positionId`, `startDate`, `endDate`, `isPrimary`, `decisionNo`, `notes`.
- **Chính sách:** `onDelete: Restrict`.

### 5. `OrganizationUnitManagerAssignment` — CURRENT
- **Trường chính:** `id`, `organizationUnitId`, `employeeId`, `startDate`, `endDate`, `isPrimary`, `appointedById`, `decisionNo`.
- **Chính sách:** `onDelete: Restrict`.

### 6. `ProjectPersonnelRole` — CURRENT
- **Trường chính:** `id`, `code` (Unique), `name`, `description`, `orderIndex`, `isActive`.

### 7. `EmployeeProjectAssignment` — PARTIAL
- **Trường chính:** `id`, `employeeId`, `projectId`, `projectPersonnelRoleId`, `startDate`, `expectedEndDate`, `endDate`, `allocationPercentage`, `status`, `assignmentDecisionNo`, `notes`, `overrideReason`.
- **Chính sách:** `onDelete: Restrict`.

---

## III. NGUYÊN TẮC KHÔNG DÙNG ON DELETE CASCADE

Tất cả dữ liệu lịch sử nhân sự (phân công, bổ nhiệm, điều chuyển, lịch sử biến động, quyết định nghỉ việc) **TUỆT ĐỐI KHÔNG DÙNG `ON DELETE CASCADE`**.
Chỉ sử dụng:
- `RESTRICT`: Ngăn xóa các bản ghi danh mục/thực thể khi còn bản ghi lịch sử tham chiếu.
- `SET NULL`: Áp dụng cho các trường liên kết tùy chọn như `userId`, `createdById`, `updatedById` khi tài khoản hệ thống bị xóa.
