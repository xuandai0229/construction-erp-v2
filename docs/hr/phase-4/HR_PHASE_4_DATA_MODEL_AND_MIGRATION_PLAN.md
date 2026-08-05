# HR PHASE 4 — MÔ HÌNH DỮ LIỆU VÀ KẾ HOẠCH MIGRATION DATABASE (DATA MODEL & MIGRATION PLAN)

- **Phiên bản:** 1.0.3
- **Trạng thái:** APPROVED — FROZEN FOR PHASE 4.1
- **Mã nguồn khảo sát (Surveyed Source SHA):** `8c1e1c89084a27eccacc3bc5fdf12aa3af160925`
- **Người phê duyệt:** Chủ dự án

---

## I. MÔ HÌNH BẢNG DỮ LIỆU HIỆN TẠI (EXISTING DATABASE AUDIT)

Bảng `EmployeeProjectAssignment` và `ProjectPersonnelRole` trong `prisma/schema.prisma`:

```prisma
model EmployeeProjectAssignment {
  id                     String                          @id @default(cuid())
  employeeId             String
  projectId              String
  projectPersonnelRoleId String
  startDate              DateTime
  expectedEndDate        DateTime?
  endDate                DateTime?
  allocationPercentage   Int                             @default(100)
  status                 EmployeeProjectAssignmentStatus @default(ACTIVE)
  assignmentDecisionNo   String?
  notes                  String?
  overrideReason         String?
  createdById            String?
  createdAt              DateTime                        @default(now())
  updatedAt              DateTime                        @updatedAt

  employee             Employee             @relation(fields: [employeeId], references: [id], onDelete: Restrict)
  project              Project              @relation(fields: [projectId], references: [id], onDelete: Restrict)
  projectPersonnelRole ProjectPersonnelRole @relation(fields: [projectPersonnelRoleId], references: [id], onDelete: Restrict)
  createdBy            User?                @relation("EmployeeProjectAssignmentCreator", fields: [createdById], references: [id], onDelete: SetNull)

  @@index([employeeId])
  @@index([projectId])
  @@index([projectPersonnelRoleId])
  @@index([startDate, endDate])
}
```

---

## II. KẾ HOẠCH MIGRATION ADDITIVE CHO SUB-PHASE 4.1 (DEC-06 & DEC-07)

Sub-phase 4.1 bắt buộc thực thi một bản Additive Migration không phá hủy (Non-destructive) bao gồm:

### 1. Bổ sung Enum `EmployeeProjectAssignmentEndReason` (DEC-06):

```prisma
enum EmployeeProjectAssignmentEndReason {
  COMPLETED
  EARLY_RELEASE
  ROLE_TRANSFER
  ALLOCATION_CHANGE
  PROJECT_TRANSFER
}

// Bổ sung cột endReason vào model EmployeeProjectAssignment:
endReason EmployeeProjectAssignmentEndReason?
```

- Trạng thái `COMPLETED` bắt buộc đi cùng `endReason = COMPLETED`.
- Trạng thái `RELEASED` đi cùng các lý do `EARLY_RELEASE`, `ROLE_TRANSFER`, `ALLOCATION_CHANGE` hoặc `PROJECT_TRANSFER`.
- Trạng thái `CANCELLED` không cần `endReason`.

### 2. Bổ sung Composite Indexes (DEC-07):

```prisma
@@index([employeeId, status, startDate])
@@index([projectId, status, startDate])
```

- Bắt buộc tạo chỉ mục composite trong migration của Sub-phase 4.1 để tối ưu hiệu năng truy vấn cho toàn bộ hệ thống.

---

## III. DÂN CƯ DỮ LIỆU MẶC ĐỊNH (SEED DATA CATALOGUE)

Danh mục `ProjectPersonnelRole` là danh mục động cho phép doanh nghiệp tự chỉnh sửa. Hệ thống cung cấp bộ Seed Data mặc định bao gồm:

| Mã vai trò (`code`) | Tên vai trò (`name`) | Thứ tự | Mô tả nhiệm vụ |
| :--- | :--- | :---: | :--- |
| `SITE_COMMANDER` | Chỉ huy trưởng công trình | 10 | Điều hành chung toàn bộ công trường |
| `DEPUTY_SITE_COMMANDER` | Chỉ huy phó công trình | 20 | Hỗ trợ quản lý thi công trực tiếp |
| `CHIEF_ENGINEER` | Kỹ sư trưởng công trình | 30 | Phụ trách kỹ thuật và giải pháp |
| `SITE_ENGINEER` | Kỹ sư thi công | 40 | Quản lý giám sát thi công hàng ngày |
| `QA_QC_ENGINEER` | Kỹ sư QA/QC | 50 | Kiểm tra chất lượng và nghiệm thu |
| `HSE_OFFICER` | Cán bộ An toàn HSE | 60 | Giám sát an toàn, PCCC và VSMT |
| `QUANTITY_SURVEYOR` | Kỹ sư Khối lượng (QS) | 70 | Quản lý khối lượng và thanh quyết toán |
| `SITE_SURVEYOR` | Kỹ sư Trắc đạc | 75 | Đo đạc trắc đạc định vị công trình |
| `STOCKKEEPER` | Thủ kho công trường | 80 | Quản lý xuất nhập tồn kho công trường |
| `SITE_ACCOUNTANT` | Kế toán công trường | 85 | Theo dõi chứng từ nội bộ công trường |
| `FOREMAN` | Đội trưởng thi công | 90 | Điều hành tổ đội thi công trực tiếp |
