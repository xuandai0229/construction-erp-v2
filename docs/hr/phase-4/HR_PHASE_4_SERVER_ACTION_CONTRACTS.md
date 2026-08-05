# HR PHASE 4 — THIẾT KẾ DỊCH VỤ VÀ HỢP ĐỒNG SERVER ACTIONS (SERVER ACTION CONTRACTS)

- **Phiên bản:** 1.0.3
- **Trạng thái:** APPROVED — FROZEN FOR PHASE 4.1
- **Mã nguồn khảo sát (Surveyed Source SHA):** `8c1e1c89084a27eccacc3bc5fdf12aa3af160925`
- **Người phê duyệt:** Chủ dự án

---

## I. NGUYÊN TẮC THIẾT KẾ DỊCH VỤ VÀ LOCKING PROTOCOL (DEC-02 & DEC-03)

1. **Transaction Integrity:** Mọi Server Action làm thay đổi dữ liệu điều động bắt buộc phải thực thi trong một `prisma.$transaction`.
2. **PostgreSQL Concurrency Locking Protocol (DEC-02):**
   - Sử dụng cú pháp khóa bắt buộc trong cùng interactive transaction:
     ```sql
     SET LOCAL lock_timeout = '5s';
     SELECT pg_advisory_xact_lock(hashtextextended($1, 0));
     ```
   - Tự động thử lại tối đa 3 lần với khoảng chờ tăng dần (exponential backoff) chỉ áp dụng cho các mã lỗi xung đột khóa:
     - `55P03`: lock_not_available
     - `40001`: serialization_failure
     - `40P01`: deadlock_detected
   - Không thử lại đối với lỗi validation, lỗi phân quyền hoặc lỗi logic nghiệp vụ. Khi xảy ra lỗi, transaction bắt buộc phải rollback toàn bộ.
   - Kiểm thử tại Sub-phase 4.1 bắt buộc sử dụng ít nhất hai kết nối CSDL thực tế.

3. **Chuẩn Định dạng Ngày Việt Nam (DEC-03):**
   - Định dạng ngày duy nhất: `YYYY-MM-DD`.
   - Xử lý thông qua hai hàm dùng chung `parseVietnamDateOnly(value)` và `formatVietnamDateOnly(value)` theo múi giờ `Asia/Ho_Chi_Minh`.

4. **Strict Type-Safe Return Standard:**
   ```typescript
   export type ActionResult<T> =
     | { success: true; data: T; message?: string }
     | { success: false; error: string; code?: string; details?: Record<string, unknown> };
   ```

---

## II. ĐẶC TẢ CHI TIẾT CÁC SERVER ACTIONS

### 1. `assignEmployeeToProjectAction` (Tạo mới điều động)

- **Permission Code:** `hr:project_assignment:create`
- **Input Zod Schema:**

```typescript
import { z } from "zod";

const isoDateString = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Ngày phải theo định dạng ISO YYYY-MM-DD")
  .refine((val) => {
    const [year, month, day] = val.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }, "Ngày không tồn tại trên lịch");

export const AssignEmployeeToProjectSchema = z.object({
  employeeId: z.string().cuid(),
  projectId: z.string().cuid(),
  projectPersonnelRoleId: z.string().cuid(),
  startDate: isoDateString,
  expectedEndDate: isoDateString.optional().nullable(),
  allocationPercentage: z.number().int().min(1).max(100).default(100),
  assignmentDecisionNo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  overrideReason: z.string().optional().nullable(),
});

export type AssignEmployeeToProjectInput = z.infer<typeof AssignEmployeeToProjectSchema>;
```

---

### 2. `transferProjectRoleOrAllocationAction` (Thay đổi Vai trò / Tỷ lệ - Historical Mutation)

- **Permission Code:** `hr:project_assignment:update`
- **Nguyên tắc bảo toàn lịch sử:** Đóng bản ghi hiện tại tại `effectiveDate` (`endDate = effectiveDate`, `status = RELEASED`, `endReason = ROLE_TRANSFER` hoặc `ALLOCATION_CHANGE`), tạo bản ghi phân công mới từ `effectiveDate` với vai trò/tỷ lệ mới.
- **Input Zod Schema:**

```typescript
export const TransferProjectRoleOrAllocationSchema = z.object({
  assignmentId: z.string().cuid(),
  effectiveDate: isoDateString,
  newProjectPersonnelRoleId: z.string().cuid().optional(),
  newAllocationPercentage: z.number().int().min(1).max(100).optional(),
  decisionNo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  overrideReason: z.string().optional().nullable(),
});

export type TransferProjectRoleOrAllocationInput = z.infer<typeof TransferProjectRoleOrAllocationSchema>;
```

---

### 3. `extendProjectAssignmentAction` (Gia hạn thời gian điều động)

- **Permission Code:** `hr:project_assignment:update`
- **Input Zod Schema:**

```typescript
export const ExtendProjectAssignmentSchema = z.object({
  assignmentId: z.string().cuid(),
  newExpectedEndDate: isoDateString,
  reason: z.string().min(5, "Lý do gia hạn phải có ít nhất 5 ký tự"),
});

export type ExtendProjectAssignmentInput = z.infer<typeof ExtendProjectAssignmentSchema>;
```

---

### 4. `releaseEmployeeFromProjectAction` (Rút nhân sự sớm)

- **Permission Code:** `hr:project_assignment:release`
- **Input Zod Schema:**

```typescript
export const ReleaseEmployeeFromProjectSchema = z.object({
  assignmentId: z.string().cuid(),
  endDate: isoDateString,
  releaseReason: z.string().min(5, "Lý do rút nhân sự phải có ít nhất 5 ký tự"),
});

export type ReleaseEmployeeFromProjectInput = z.infer<typeof ReleaseEmployeeFromProjectSchema>;
```

---

### 5. `getProjectAssignmentsQuery` (Truy vấn danh sách phân công)

- **Permission Code:** `hr:project_assignment:read`
- **Input Interface:**

```typescript
export interface GetProjectAssignmentsQueryInput {
  page?: number;
  pageSize?: number;
  projectId?: string;
  employeeId?: string;
  organizationUnitId?: string;
  roleId?: string;
  status?: "ACTIVE" | "COMPLETED" | "RELEASED" | "CANCELLED";
  searchQuery?: string;
}
```
