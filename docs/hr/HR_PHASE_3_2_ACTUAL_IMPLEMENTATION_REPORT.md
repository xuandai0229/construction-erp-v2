# BÁO CÁO KIỂM TOÁN KỸ THUẬT XÁC MINH THỰC TẾ TRIỂN KHAI — HR PHASE 3.2

**Dự án**: Construction ERP v2  
**Phân hệ**: Quản lý Nhân sự & Cơ cấu Tổ chức (HR Organization)  
**Giai đoạn**: Phase 3.2 — Security, Effective-Date, Data Scope, Mutation Test, Route Stability & UI Hardening  
**Thời gian kiểm toán**: 2026-08-04  
**Trạng thái kiểm toán**: Đã hoàn thành đối soát mã nguồn và kiểm thử runtime thực tế.

---

## I. TÓM TẮT ĐIỀU HÀNH (EXECUTIVE SUMMARY)

Báo cáo kiểm toán kỹ thuật này đánh giá toàn bộ mã nguồn, cấu trúc bảo mật, phạm vi dữ liệu (`HrDataScope`), cơ chế thời gian hiệu lực (`[startDate, endDate)`), sanitizer nhật ký an ninh (Audit Sanitizers), giao diện UI/UX và hạ tầng kiểm thử QA cho phân hệ Cơ cấu Tổ chức (Phase 3.2). 

Các công việc đã thực tế triển khai bao gồm việc hoàn thiện module `effective-date-helper.ts`, bổ sung scope resolvers vào guard authorization, tích hợp sanitizers che thông tin PII trong Server Actions, xử lý triệt để việc reload trang browser (`window.location.reload()`), bổ sung các trường thông tin cơ bản trong form tạo nhân viên, và tạo bộ kiểm thử tích hợp DB / Playwright. Tuy nhiên, qua đối soát chi tiết, hệ thống ghi nhận **mẫu mẫn về mã quyền (Permission Code Drift)** và **thiếu sót kiểm tra Target Scope / Invariant trong một số Server Action**, dẫn đến quyết định **CONDITIONAL NO-GO** cho việc đóng release gate Phase 3.

---

## II. DANH SÁCH FILE THAY ĐỔI VÀ PHÂN LOẠI (GIT INVENTORY)

### 1. Kết quả lệnh Git thực tế
- `git status --short`:
  ```
   M src/app/hr/organization/actions/organization-actions.ts
   M src/app/hr/organization/managers/page.tsx
   M src/components/hr/employee-create-form.tsx
   M src/components/hr/employee-detail-view.tsx
   M src/components/hr/hr-workspace-tabs.tsx
   M src/components/hr/organization-sub-tabs.tsx
   M src/lib/audit-sanitizer.ts
   M src/lib/hr/hr-auth-guard.ts
   M src/lib/hr/organization-service.ts
  ?? scripts/qa/hr-phase3-mutation.spec.ts
  ?? scripts/qa/hr-phase3-scope.spec.ts
  ?? scripts/qa/hr-route-transition-stability.spec.ts
  ?? scripts/qa/setup-qa-env.ts
  ?? src/lib/hr/__tests__/effective-date-helper.test.ts
  ?? src/lib/hr/effective-date-helper.ts
  ```

**Tình trạng Working Tree**: `WORKING TREE CHƯA SẠCH` (Có 9 file modified và 6 file untracked chưa commit).

### 2. Bảng phân loại chi tiết các file
| File | Tracked / Untracked | Phân loại nhóm | Phân loại chi tiết | Thuộc Phase 3.2 | Ghi chú |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `src/lib/hr/effective-date-helper.ts` | Untracked | Effective-date | Domain Utility Helper | Có | Định nghĩa logic `[startDate, endDate)` và múi giờ `Asia/Ho_Chi_Minh`. |
| `src/lib/hr/__tests__/effective-date-helper.test.ts` | Untracked | Unit test | Unit Test Suite | Có | Vitest unit test cho `effective-date-helper`. |
| `src/lib/hr/hr-auth-guard.ts` | Tracked (Modified) | Data scope/RBAC | Authorization Guard | Có | Bổ sung query builder cho 5 giá trị `HrDataScope`. |
| `src/lib/audit-sanitizer.ts` | Tracked (Modified) | Audit sanitizer | Security Sanitizer | Có | Thêm allowlist sanitizers cho Org Unit, Position, Manager Assignment. |
| `src/lib/hr/organization-service.ts` | Tracked (Modified) | HR domain service | Business Logic Service | Có | Bổ sung row-locking (`FOR UPDATE`), fix reason precedence, fix date boundaries. |
| `src/app/hr/organization/actions/organization-actions.ts` | Tracked (Modified) | Server Actions | Controller Layer | Có | Tích hợp audit sanitizers, gọi domain services. |
| `src/app/hr/organization/managers/page.tsx` | Tracked (Modified) | HR UI | Server Component Page | Có | Áp dụng `buildManagerAssignmentScopeWhereClause`. |
| `src/components/hr/employee-detail-view.tsx` | Tracked (Modified) | HR UI | Client Component View | Có | Thay `window.location.reload()` bằng `router.refresh()`, auto-mask CCCD. |
| `src/components/hr/employee-create-form.tsx` | Tracked (Modified) | HR UI | Client Component Form | Có | Bổ sung field `joinedDate`, id/htmlFor, prerequisite empty state. |
| `src/components/hr/organization-sub-tabs.tsx` | Tracked (Modified) | HR UI | Client Component Nav | Có | Gán ID `#hr-tab-organization-tree`, `#hr-tab-positions`, v.v. |
| `src/components/hr/hr-workspace-tabs.tsx` | Tracked (Modified) | HR UI | Client Component Nav | Có | Gán ID `#hr-tab-*` cho workspace tabs. |
| `scripts/qa/setup-qa-env.ts` | Untracked | QA database guard | Infrastructure Helper | Có | Kiểm tra an toàn `QA_DATABASE_URL` trước khi test. |
| `scripts/qa/hr-phase3-mutation.spec.ts` | Untracked | Database integration test | Service Integration Test | Có | Test nghiệp vụ điều chuyển, bổ nhiệm trực tiếp trên DB. |
| `scripts/qa/hr-phase3-scope.spec.ts` | Untracked | Integration test | Scope Resolver Test | Có | Test sinh mệnh đề `where` của 5 giá trị `HrDataScope`. |
| `scripts/qa/hr-route-transition-stability.spec.ts` | Untracked | Playwright | Route Smoke Test | Có | Test chuyển tab cơ bản trên trình duyệt. |

---

## III. THỰC TẾ CÁC PHẦN ĐÃ TRIỂN KHAI (DETAILED IMPLEMENTATION ANALYSIS)

### 1. Điều hướng HR (HR Navigation)
- **Đã triển khai**:
  - `HrWorkspaceTabs` (`src/components/hr/hr-workspace-tabs.tsx`) và `OrganizationSubTabs` (`src/components/hr/organization-sub-tabs.tsx`) đã bổ sung các `id` duy nhất dạng `#hr-tab-organization-tree`, `#hr-tab-positions`, `#hr-tab-unit-managers`, `#hr-tab-org-chart`, `#hr-tab-employees`.
  - Sử dụng Next.js Client-side `Link` giúp chuyển route mượt mà.
  - Hỗ trợ cuộn ngang responsive (`overflow-x-auto`).
- **Đã triển khai một phần**:
  - Tự động cuộn tab active vào vùng nhìn (`scrollIntoView`) đã có trên `HrWorkspaceTabs` qua `useEffect`, nhưng `OrganizationSubTabs` chưa có hook tự động cuộn.
- **Chưa triển khai / Kiểm thử**:
  - Thuộc tính accessibility `aria-current="page"` chưa được gắn trên tab đang active.

### 2. Quản lý Scope dữ liệu (HrDataScope)
- **Đã triển khai**:
  - `src/lib/hr/hr-auth-guard.ts` đã xây dựng 3 hàm resolver chính: `buildEmployeeScopeWhereClause`, `buildOrganizationUnitScopeWhereClause`, và `buildManagerAssignmentScopeWhereClause`.
  - Hỗ trợ đủ 5 cấp độ scope:
    1. `ALL_EMPLOYEES`: Trả về `{}` (truy vấn toàn bộ).
    2. `OWN_ORGANIZATION_UNIT`: Giới hạn danh sách phòng ban do nhân viên làm quản lý đương nhiệm.
    3. `OWN_PROJECTS`: Giới hạn nhân sự thuộc các công trình nhân viên tham gia.
    4. `SELF_ONLY`: Giới hạn duy nhất `{ id: employeeId }`.
    5. `NONE`: Trả về `{ id: "IMPOSSIBLE_NON_EXISTENT_ID" }` (chặn toàn bộ).
- **Phạm vi áp dụng thực tế**:
  - Page `src/app/hr/organization/managers/page.tsx` đã áp dụng `buildManagerAssignmentScopeWhereClause`.
  - Page `src/app/hr/employees/page.tsx` đã áp dụng `buildEmployeeScopeWhereClause`.
- **Hạn chế / Điểm yếu**:
  - Các Server Actions trong `organization-actions.ts` chỉ thực hiện kiểm tra permission code (`checkHrPermission`), **CHƯA kiểm tra Target Scope** (ví dụ: người dùng có `OWN_ORGANIZATION_UNIT` có thể bổ nhiệm quản lý hoặc điều chuyển nhân sự thuộc đơn vị ngoài phạm vi quản lý nếu biết ID).

### 3. Logic Thời gian Hiệu lực (Effective-Date Semantics)
- **Đã triển khai**:
  - File `src/lib/hr/effective-date-helper.ts` thiết lập chuẩn `[startDate, endDate)`:
    - Active condition: `startDate <= at AND (endDate IS NULL OR at > endDate)`
  - Cung cấp hàm `buildEffectiveDateWhere(at)`, `isCurrentlyEffective`, `validateEffectiveDateRange`, `validateTransferEffectiveDate`, và `getVietnamTodayDateString`.
- **Xác minh call-site áp dụng**:
  - `organization-service.ts`: Đã áp dụng `buildEffectiveDateWhere` khi tìm phòng ban chính đương nhiệm và quản lý đương nhiệm trong `transferEmployee` và `assignUnitManager`.
  - `employee-detail-view.tsx`: Đã cập nhật kiểm tra `isActive` trên timeline công tác: `const isActive = !assign.endDate || new Date(assign.endDate) > new Date();`.

### 4. Nghiệp vụ Cơ cấu Tổ chức & Concurrency Control
- **Đã triển khai**:
  - `validateOrgUnitHierarchy`: Chống self-parent và phát hiện vòng lặp phân cấp (A -> B -> A).
  - Validation cấp bậc chức danh: Giới hạn từ 1 đến 10 trong `createPosition` / `updatePosition`.
  - Bổ nhiệm quản lý đơn vị (`assignUnitManager`): Tự động đóng nhiệm kỳ cũ tại mốc `startDate` của nhiệm kỳ mới.
  - Điều chuyển nhân sự (`transferEmployee`): Khóa dòng (`FOR UPDATE` trong PostgreSQL), tự động đóng phân công cũ tại `effectiveDate`, tạo phân công mới, và ghi nhận nhật ký `EmployeeChangeHistory`.
- **Hạn chế phát hiện được**:
  - Action `deactivatePositionAction` trong `organization-actions.ts` cập nhật trực tiếp `isActive: false` mà **KHÔNG gọi `validatePositionDeactivation`**, dẫn đến nguy cơ vô hiệu hóa chức danh đang có nhân sự đảm nhận.

### 5. Form Tạo Nhân viên & Chi tiết Nhân viên (UI Hardening)
- **Form Tạo Nhân viên (`employee-create-form.tsx`)**:
  - Đã bổ sung trường `joinedDate` (Ngày vào công ty) bắt buộc.
  - Định dạng ngày mặc định theo múi giờ `Asia/Ho_Chi_Minh`.
  - Bổ sung màn hình rỗng Prerequisite (khi chưa có đơn vị hoặc chức danh) với CTA hướng dẫn khởi tạo.
  - Đã liên kết label `htmlFor` với input `id` cho toàn bộ các trường.
  - Nút bấm hành động chuyển sang full-width trên giao diện mobile.
- **Trang Chi tiết Nhân viên (`employee-detail-view.tsx`)**:
  - Đã loại bỏ hoàn toàn `window.location.reload()`, thay thế bằng `router.refresh()`.
  - Tính năng hiển thị CCCD đầy đủ có bộ đếm tự động che bớt sau 30 giây (`setTimeout`), đồng thời tự động xóa khỏi bộ nhớ khi chuyển tab (`activeTab`).
  - Đã bổ sung các hàm mapper tiếng Việt cho `changeType`, `role`, và `status`.

### 6. Khử Thông tin Nhận dạng Cá nhân (Audit Sanitization)
- **Đã triển khai**:
  - `src/lib/audit-sanitizer.ts` định nghĩa cơ chế allowlist (Default-Deny) cho các entity HR.
  - Các Server Actions trong `organization-actions.ts` đã thông qua các hàm `sanitizeOrganizationUnitAudit`, `sanitizePositionAudit`, `sanitizeManagerAssignmentAudit`.
  - Tất cả các trường PII nhạy cảm (`identityNumber`, `phone`, `personalEmail`, `bankAccountNumber`, `password`, `token`, `secret`, `ciphertext`, `iv`) đều bị loại bỏ hoặc thay bằng `[REDACTED]` trước khi ghi log.

---

## IV. PHÂN LOẠI VÀ ĐÁNH GIÁ CÁC FILE TEST

Bảng đối soát thực tế các file test trong `scripts/qa/`:

| File test | Tồn tại | Loại test thực tế | Có UI mutation | Có DB mutation | Auth thực tế | Có Cleanup |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: |
| `src/lib/hr/__tests__/effective-date-helper.test.ts` | Có | Unit Test | Không | Không | Không | Không cần |
| `src/lib/hr/__tests__/organization-service.test.ts` | Có | Service / DB Integration Test | Không | Có | Không | Có |
| `scripts/qa/hr-phase3-mutation.spec.ts` | Có | Database Integration Test | Không | Có | Không | Có |
| `scripts/qa/hr-phase3-scope.spec.ts` | Có | Scope Resolver Test | Không | Không | Giả lập | Có |
| `scripts/qa/hr-route-transition-stability.spec.ts` | Có | Route Navigation Smoke Test | Không | Không | UI Form | Không |
| `scripts/qa/hr-phase3-organization-runtime.spec.ts` | Có | UI Route Smoke Test | Không | Không | Không | Không |
| `scripts/qa/hr-phase2-runtime.spec.ts` | Có | UI Route Smoke Test | Không | Không | Không | Không |

> [!IMPORTANT]
> - `scripts/qa/hr-phase3-mutation.spec.ts` gọi trực tiếp domain service và Prisma DB, **KHÔNG phải UI E2E Mutation Test**.
> - `scripts/qa/hr-phase3-scope.spec.ts` tạo `HrUserContext` giả lập để test hàm builder, **KHÔNG phải Multi-user Authenticated E2E Test**.

---

## V. NHỮNG PHẦN CHƯA HOÀN TẤT VÀ HẠN CHẾ CÒN LẠI

1. **Permission Code Drift (`FAIL — PERMISSION CODE DRIFT`)**:
   - `permission-service.ts` & `hr-auth-guard.ts` đăng ký mã quyền: `"hr:org_unit:manage"`.
   - Các trang (`page.tsx`) và Server Actions (`organization-actions.ts`) gọi: `checkHrPermission("hr:organization:manage")`.
   - Cả hai mã quyền tồn tại song song gây lệch cấu hình RBAC.
2. **Bỏ qua Invariant trong Deactivate Position**:
   - `deactivatePositionAction` cập nhật trực tiếp `isActive: false` mà không gọi `validatePositionDeactivation`.
3. **Thiếu Target Scope Check trong Server Actions**:
   - Server Actions chỉ kiểm tra quyền hạn thao tác hệ thống nhưng chưa kiểm tra đối tượng bị tác động (Target Entity) có nằm trong scope của người thực hiện hay không.
4. **Fixture Cleanup trong Test Integration**:
   - Các lệnh cleanup trong `hr-phase3-mutation.spec.ts` nằm ở cuối thân hàm test, nếu assertion gặp thất bại (`throw`), đoạn mã cleanup phía sau sẽ bị bỏ qua.
5. **Type Safety trong EmployeeDetailView**:
   - Props `EmployeeDetailViewProps` vẫn còn sử dụng kiểu `any` cho `employee: any`, `organizationAssignments: any[]`, `projectAssignments: any[]`, `changeHistory: any[]`.
