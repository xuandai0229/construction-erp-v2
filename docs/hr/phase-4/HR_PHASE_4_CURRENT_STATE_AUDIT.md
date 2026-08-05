# HR PHASE 4 — BÁO CÁO KHẢO SÁT VÀ AUDIT MÃ NGUỒN HỆ THỐNG (CURRENT-STATE AUDIT)

- **Phiên bản:** 1.0.3
- **Trạng thái:** APPROVED — FROZEN FOR PHASE 4.1
- **Mã nguồn khảo sát (Surveyed Source SHA):** `8c1e1c89084a27eccacc3bc5fdf12aa3af160925`
- **Người phê duyệt:** Chủ dự án

---

## I. MỤC TIÊU AUDIT
Khảo sát thực tế các Model Prisma, Enum, Permissions và Services trong repository `construction-erp-v2` để phân định chính xác giữa **Trạng thái hiện có trong mã nguồn (CURRENT)** và **Đề xuất bổ sung cho Phase 4.1 (PROPOSED FOR PHASE 4.1)**.

---

## II. BẢNG ĐỐI SOÁT TRỰC TIẾP TỪ MÃ NGUỒN REPOSITORY

| Thành phần | Vị trí file và dòng trong repository | Đối tượng CSDL / Mã nguồn | Giá trị thực tế đã xác minh | Trạng thái |
| :--- | :--- | :--- | :--- | :---: |
| **`UserRole` Enum** | `prisma/schema.prisma:11-21` | Enum CSDL | `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR`, `CHIEF_COMMANDER`, `MANAGER`, `ENGINEER`, `STAFF`, `SUPERVISION_HEAD`, `CONSTRUCTION_SUPERVISOR` | **CURRENT** |
| **`ProjectRole` Enum** | `prisma/schema.prisma:23-32` | Enum CSDL | `PROJECT_MANAGER`, `SITE_COMMANDER`, `CHIEF_COMMANDER`, `ASSISTANT_COMMANDER`, `QA_QC`, `HSE`, `SUPERVISOR`, `VIEWER` | **CURRENT** |
| **`ProjectMember` Model** | `prisma/schema.prisma:355-378` | Model CSDL | `id`, `projectId`, `userId`, `role`, `assignedById`, `isActive` (`Boolean @default(true)`), `note`, `joinedAt`, `leftAt`, `deletedAt` | **CURRENT** |
| **`EmployeeProjectAssignment` Model** | `prisma/schema.prisma:2214-2240` | Model CSDL | `id`, `employeeId`, `projectId`, `projectPersonnelRoleId`, `startDate`, `expectedEndDate`, `endDate`, `allocationPercentage`, `status`, `overrideReason` | **CURRENT** |
| **`EmployeeProjectAssignmentStatus`** | `prisma/schema.prisma:2045-2050` | Enum CSDL | `ACTIVE`, `COMPLETED`, `RELEASED`, `CANCELLED` (Chỉ có 4 giá trị) | **CURRENT** |
| **Project Access Resolver** | `src/lib/permissions/project-scope.ts:9-14` | Hàm kiểm tra quyền | `getActiveProjectMembership(userId, projectId)` (Kiểm tra `isActive: true`, `leftAt: null`, `deletedAt: null`) | **CURRENT** |
| **Company-Wide Roles** | `src/lib/permissions/project-scope.ts:4` | Mảng hằng số | `COMPANY_WIDE = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"]` | **CURRENT** |
| **Operational Read Roles** | `src/lib/permissions/project-scope.ts:5` | Mảng hằng số | `ALL_PROJECT_OPERATIONAL_READ = ["CONSTRUCTION_SUPERVISOR"]` | **CURRENT** |

---

## III. AUDIT CẤU TRÚC INDEX VÀ BỔ SUNG CHO PHASE 4.1

| Chỉ mục Index | Trạng thái hiện tại | Vị trí định nghĩa | Đánh giá Yêu cầu Migration |
| :--- | :---: | :--- | :---: |
| `@@index([employeeId])` | **CURRENT** | `prisma/schema.prisma:2237` | Không cần migration |
| `@@index([projectId])` | **CURRENT** | `prisma/schema.prisma:2238` | Không cần migration |
| `@@index([projectPersonnelRoleId])` | **CURRENT** | `prisma/schema.prisma:2239` | Không cần migration |
| `@@index([startDate, endDate])` | **CURRENT** | `prisma/schema.prisma:2240` | Không cần migration |
| `@@index([employeeId, status, startDate])` | **PROPOSED FOR PHASE 4.1** | Đã duyệt tại DEC-07 | **CẦN MIGRATION ADDITIVE** |
| `@@index([projectId, status, startDate])` | **PROPOSED FOR PHASE 4.1** | Đã duyệt tại DEC-07 | **CẦN MIGRATION ADDITIVE** |
| Enum `EmployeeProjectAssignmentEndReason` | **PROPOSED FOR PHASE 4.1** | Đã duyệt tại DEC-06 | **CẦN MIGRATION ADDITIVE** |

---

## IV. NGUYÊN TẮC QUẢN LÝ DỮ LIỆU ĐIỀU ĐỘNG

1. **Khóa logic theo mốc thời gian:** Quyết định điều kiện cắm tại công trường thực tế dựa trên điều kiện `startDate <= at AND (endDate IS NULL OR at < endDate)` khi `status = ACTIVE`.
2. **Không làm sai lệch lịch sử khi đổi vai trò:** Khi nhân viên thay đổi vai trò hoặc tỷ lệ phân bổ, hệ thống kết thúc bản ghi cũ tại ngày $D$ (`endDate = D`, `status = RELEASED`, `endReason = ROLE_TRANSFER` hoặc `ALLOCATION_CHANGE`) và mở bản ghi mới bắt đầu từ ngày $D$ (`startDate = D`).
