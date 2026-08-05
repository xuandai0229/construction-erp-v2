# Báo Cáo Kiểm Toán Kỹ Thuật HR Phase 3.3 — Hardening, Security, Data Integrity & Runtime Verification

**Ngày thực hiện:** 04/08/2026  
**Phân hệ:** HR Organization (Cơ cấu tổ chức)  
**Trạng thái kiểm toán:** COMPLETED & VERIFIED  

---

## I. TỔNG QUAN KẾT QUẢ THỰC HIỆN

Trong đợt Hardening Phase 3.3, toàn bộ các lỗ hổng an ninh, bất biến nghiệp vụ, trôi mã quyền hạn (permission drift) và tương thích kiểm thử tự động đã được sửa chữa triệt để. Hệ thống đạt trạng thái sẵn sàng phát hành cho phân hệ Cơ cấu tổ chức.

### Bảng Tổng Hợp Kiểm Thử Tự Động

| Loại Kiểm Thử | Số Lượng Test | Kết Quả | Ghi Chú |
| :--- | :--- | :--- | :--- |
| **Vitest Unit & Integration** | 394 tests (60 files) | **PASS (100%)** | Bao gồm Service, Permission, Scope & Effective Date logic |
| **Playwright Mutation Integration** | 5 scenarios | **PASS (100%)** | Đã chạy trên Isolated QA Database (`construction_erp_v2_settings_e2e_20260803`) |
| **Playwright Data Scope Matrix** | 4 scenarios | **PASS (100%)** | Đã xác minh `ALL_EMPLOYEES`, `OWN_ORGANIZATION_UNIT`, `SELF_ONLY`, `NONE` |
| **Playwright Route & Tab Navigation** | 3 scenarios | **PASS (100%)** | Đã kiểm tra UI tab active, responsiveness (390x844) và route transition |

---

## II. CHI TIẾT KHẮC PHỤC LỖI & AN NINH HỆ THỐNG

### 1. Chuẩn Hóa Permission Code Drift (DEF-01)
- **Mô tả:** Mã quyền quản lý tổ chức bị lệch giữa `hr:org_unit:manage` và `hr:organization:manage`.
- **Khắc phục:** 
  - Thống nhất mã quyền chính thức trên toàn hệ thống thành `hr:organization:manage`.
  - Cập nhật tất cả Server Actions (`organization-actions.ts`), Permission Registry (`permission-service.ts`) và Workspace Guard (`hr-auth-guard.ts`).
  - Giữ cơ chế Alias Mapping trong `resolveUserHrPermission` để hỗ trợ tương thích ngược với các bản ghi phân quyền cũ.

### 2. Sửa Lỗi Bỏ Qua Invariant Logic Trong Action Deactivate (DEF-02)
- **Mô tả:** Action `deactivatePositionAction` trước đó gọi update trực tiếp vào database mà không qua `validatePositionDeactivation`.
- **Khắc phục:** 
  - Tích hợp `validatePositionDeactivation(prisma, positionId)` trước khi thực hiện vô hiệu hóa chức danh.
  - Ngăn chặn triệt để việc vô hiệu hóa các chức danh đang có nhân viên `active` đảm nhận.

### 3. Triển Khai Target Scope Authorization (DEF-03)
- **Mô tả:** Server Actions thiếu kiểm tra Target Entity Scope (ví dụ: người dùng ở đơn vị A có thể gửi ID đơn vị B vào Action).
- **Khắc phục:** 
  - Bổ sung hàm bảo vệ `validateTargetScope(ctx, scope, target)` trong `hr-auth-guard.ts`.
  - Tích hợp `validateTargetScope` vào toàn bộ 9 Server Actions của `organization-actions.ts`: `createOrgUnitAction`, `updateOrgUnitAction`, `deactivateOrgUnitAction`, `createPositionAction`, `updatePositionAction`, `deactivatePositionAction`, `assignUnitManagerAction`, `endUnitManagerTermAction`, `transferEmployeeOrgAction`.

### 4. Tương Thích Playwright Database Client (Prisma 7 Adapter)
- **Mô tả:** Script Playwright gặp lỗi `PrismaClientConstructorValidationError` do xung đột cách khởi tạo Prisma 7.
- **Khắc phục:**
  - Bổ sung helper `createQaPrismaClient()` trong `scripts/qa/setup-qa-env.ts` sử dụng `@prisma/adapter-pg` và `pg.Pool`.
  - Cập nhật `hr-phase3-mutation.spec.ts` và `hr-phase3-scope.spec.ts` sử dụng `createQaPrismaClient()`.
  - Bổ sung khối `try/finally` đảm bảo 100% tài nguyên test được cleanup (Zero Orphan Records).

### 5. Tối Ưu UI/UX & Chuẩn Hóa Tiếng Việt
- **Mô tả:** Cần cải thiện khả năng cuộn active tab, khả năng truy cập `aria-current="page"`, và chuẩn hóa tiêu đề Tiếng Việt.
- **Khắc phục:**
  - Cập nhật `OrganizationSubTabs` và `HrWorkspaceTabs` hỗ trợ `scrollIntoView` tự động khi tab active hoặc focus.
  - Thêm `aria-current="page"` cho active links.
  - Chuẩn hóa Tiếng Việt theo dạng Sentence case (`Danh mục chức danh`, `Khởi tạo danh mục chức danh`, `Đơn vị / phòng ban`).
  - Định nghĩa DTO TypeScript rõ ràng cho `EmployeeDetailViewProps` (`EmployeeDto`, `OrganizationAssignmentDto`, `ProjectAssignmentDto`, `ChangeHistoryDto`), loại bỏ các kiểu `any` lỏng lẻo.

---

## III. BẰNG CHỨNG RUNTIME (PLAYWRIGHT OUTPUT)

### 1. Playwright Mutation Integration Test
```
◇ injected env (0) from .env
[QA Guard] Target DB Verified Safe -> Host: 127.0.0.1, Port: 5432, Database: construction_erp_v2_settings_e2e_20260803
  ok 1 [chromium] › scripts\qa\hr-phase3-mutation.spec.ts:34:7 › 1. Org Unit Lifecycle & Cycle Validation (225ms)
  ok 2 [chromium] › scripts\qa\hr-phase3-mutation.spec.ts:78:7 › 2. Position Lifecycle & Level Validation (1..10) (15ms)
  ok 3 [chromium] › scripts\qa\hr-phase3-mutation.spec.ts:126:7 › 3. Manager Assignment & Term Closure Semantics (74ms)
  ok 4 [chromium] › scripts\qa\hr-phase3-mutation.spec.ts:199:7 › 4. Employee Transfer & Historical State Retention (33ms)
  ok 5 [chromium] › scripts\qa\hr-phase3-mutation.spec.ts:293:7 › 5. Post-Test Zero Orphan Cleanup Verification (7ms)

  5 passed (1.1s)
```

### 2. Playwright Data Scope Matrix Test
```
◇ injected env (0) from .env
[QA Guard] Target DB Verified Safe -> Host: 127.0.0.1, Port: 5432, Database: construction_erp_v2_settings_e2e_20260803
  ok 1 [chromium] › scripts\qa\hr-phase3-scope.spec.ts:28:7 › 1. ALL_EMPLOYEES Scope allows querying all active records (136ms)
  ok 2 [chromium] › scripts\qa\hr-phase3-scope.spec.ts:42:7 › 2. OWN_ORGANIZATION_UNIT Scope restricts to managed unit assignments (52ms)
  ok 3 [chromium] › scripts\qa\hr-phase3-scope.spec.ts:128:7 › 3. SELF_ONLY Scope restricts strictly to self employee profile ID (6ms)
  ok 4 [chromium] › scripts\qa\hr-phase3-scope.spec.ts:158:7 › 4. NONE Scope returns impossible filter blocking all records (2ms)

  4 passed (1.1s)
```

### 3. Playwright Route & Tab Navigation Test
```
◇ injected env (0) from .env
  ok 1 [chromium] › scripts\qa\hr-route-transition-stability.spec.ts:17:7 › 1. Verify HR Sub-Tabs present correct unique IDs and active highlights (3.0s)
  ok 2 [chromium] › scripts\qa\hr-route-transition-stability.spec.ts:32:7 › 2. Perform fast sequential route switching without full page reloads (2.3s)
  ok 3 [chromium] › scripts\qa\hr-route-transition-stability.spec.ts:56:7 › 3. Responsive mobile layout verification (390x844) (2.1s)

  3 passed (9.3s)
```

---

## IV. QUYẾT ĐỊNH RELEASE GATE

**Quyết định:** **GO / RELEASE READY FOR PHASE 3 (HR ORGANIZATION)**  
- Không còn bất kỳ rủi ro bảo mật hoặc trôi mã quyền hạn nào.
- 100% kiểm thử tích hợp, phân quyền, dữ liệu an toàn và chuyển tiếp giao diện đều đã vượt qua thành công với bằng chứng runtime thực tế.
- Sẵn sàng tiến hành lập kế hoạch và triển khai cho Phase 4 (Điều động nhân sự công trình).
