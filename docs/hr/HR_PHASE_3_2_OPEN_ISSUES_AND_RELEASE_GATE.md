# DANH SÁCH LỖI MỞ VÀ ĐÁNH GIÁ RELEASE GATE — HR PHASE 3.2

**Dự án**: Construction ERP v2  
**Phân hệ**: Quản lý Nhân sự & Cơ cấu Tổ chức (HR Organization)  
**Ngày đánh giá**: 2026-08-04  
**Quyết định phát hành (Release Decision)**: **CONDITIONAL NO-GO**

---

## I. DANH SÁCH LỖI VÀ ĐIỂM YẾU MỞ (OPEN DEFECT REGISTER)

| ID | Mức độ nghiêm trọng | File liên quan | Mô tả ảnh hưởng nghiệp vụ | Điều kiện đóng lỗi (Closure Conditions) |
| :--- | :---: | :--- | :--- | :--- |
| **DEF-01** | **CRITICAL** | `src/lib/hr/permission-service.ts`, `src/lib/hr/hr-auth-guard.ts`, `src/app/hr/organization/actions/organization-actions.ts` | **Permission Code Drift**: Registry đăng ký `hr:org_unit:manage` nhưng Server Actions và UI gọi `hr:organization:manage`. Gây từ chối truy cập sai cho tài khoản được gán quyền chuẩn. | Đồng bộ thống nhất 1 mã quyền duy nhất `hr:organization:manage` trên toàn bộ registry, seed, guards, pages và test files. |
| **DEF-02** | **HIGH** | `src/app/hr/organization/actions/organization-actions.ts` | **Invariant Bypass**: Action `deactivatePositionAction` cập nhật trực tiếp `isActive: false` mà không gọi `validatePositionDeactivation`, có thể vô hiệu hóa chức danh đang được nhân viên đảm nhận. | Thêm lệnh `await validatePositionDeactivation(prisma, positionId)` vào `deactivatePositionAction` trước khi update. |
| **DEF-03** | **HIGH** | `src/app/hr/organization/actions/organization-actions.ts` | **Thiếu Target Scope Guard**: Các Server Actions chỉ kiểm tra quyền hệ thống nhưng chưa kiểm tra đối tượng bị tác động có nằm trong `HrDataScope` của người dùng hay không. | Tích hợp kiểm tra Target Entity Scope vào toàn bộ các Server Actions tạo/sửa/vô hiệu hóa/bổ nhiệm/điều chuyển. |
| **DEF-04** | **MEDIUM** | `scripts/qa/hr-phase3-mutation.spec.ts` | **Prisma Client Constructor Error in Playwright**: Script khởi tạo `new PrismaClient({ datasources })` thất bại trên Prisma 7. | Cập nhật khởi tạo Prisma Client trong script Playwright sử dụng `PrismaPg` adapter tương tự `organization-service.test.ts`. |
| **DEF-05** | **MEDIUM** | `src/components/hr/employee-detail-view.tsx` | **Type Safety Incomplete**: Props `EmployeeDetailViewProps` sử dụng kiểu `any` cho `employee`, `organizationAssignments`, `projectAssignments`, `changeHistory`. | Thay thế các kiểu `any` bằng DTO types định nghĩa rõ ràng. |
| **DEF-06** | **LOW** | `scripts/qa/hr-phase3-mutation.spec.ts` | **Cleanup unsafe on assertion failure**: Khối lệnh cleanup không nằm trong `finally` block. | Đưa toàn bộ mã cleanup vào khối `finally` hoặc `afterEach` để đảm bảo dọn dẹp dữ liệu ngay cả khi test thất bại. |

---

## II. BẢNG ĐÁNH GIÁ QUALITY GATE TỔNG THỂ (25 CRITERIA)

| Gate # | Yêu cầu Quality Gate | Bằng chứng kiểm tra thực tế | Trạng thái | Rủi ro còn lại |
| :---: | :--- | :--- | :---: | :--- |
| 1 | **Git scope** | Working tree chưa sạch (9 modified, 6 untracked). | **PARTIAL** | Cần commit toàn bộ code và test mới. |
| 2 | **Permission registry consistency** | Lệch mã giữa `hr:org_unit:manage` và `hr:organization:manage`. | **FAIL** | User có quyền có thể bị HTTP 403. |
| 3 | **Page data scope** | Page `managers` và `employees` đã gắn scope clause. | **PASS** | Không. |
| 4 | **Server Action target scope** | Server Action chưa kiểm tra Target Scope. | **PARTIAL** | Người dùng có thể tác động entity ngoài scope. |
| 5 | **Effective-date helper** | `effective-date-helper.ts` hoạt động chuẩn, unit test PASS. | **PASS** | Không. |
| 6 | **Effective-date query adoption** | Đã dùng trong `transferEmployee`, `assignUnitManager`, timeline. | **PASS** | Không. |
| 7 | **Unit/position invariants** | Org unit có check hierarchy; Position deactivation bị bypass. | **PARTIAL** | Vô hiệu hóa chức danh đang dùng. |
| 8 | **Manager appointment** | Tự động đóng nhiệm kỳ cũ tại mốc $D$. | **PASS** | Không. |
| 9 | **Employee transfer** | Đóng phân công cũ, mở phân công mới, giữ `isPrimary`. | **PASS** | Không. |
| 10 | **Concurrency protection** | Có `FOR UPDATE` row lock trong `transferEmployee`. | **PASS** | Chưa có test tải đồng thời 20 req. |
| 11 | **Audit sanitization** | Allowlist sanitizer đã hoạt động, PII bị che. | **PASS** | Không. |
| 12 | **Vietnamese UI** | Đã map tiếng Việt cho status, changeType, role. | **PASS** | Không. |
| 13 | **Employee create form** | Có `joinedDate`, empty state prerequisite, responsive. | **PASS** | Không. |
| 14 | **Employee detail security** | Đã bỏ `window.location.reload`, CCCD auto-mask 30s. | **PASS** | Không. |
| 15 | **QA database isolation** | `setup-qa-env.ts` kiểm tra an toàn DB URL. | **PASS** | Không. |
| 16 | **Mutation integration test** | Vitest `organization-service.test.ts` PASS 4/4. | **PASS** | Không. |
| 17 | **Mutation UI E2E** | Chưa có script thao tác mutation qua browser. | **NOT IMPLEMENTED** | Chưa xác minh thao tác UI thực tế. |
| 18 | **Multi-user scope E2E** | `hr-phase3-scope.spec.ts` chưa login 5 user thật qua UI. | **PARTIAL** | Scope E2E UI chưa được chạy. |
| 19 | **Route transition stability** | Đã gán `#hr-tab-*` IDs; script Playwright timeout UI login. | **PARTIAL** | Phụ thuộc session auth UI. |
| 20 | **Responsive** | Đã kiểm tra 1440px, 768px, 390px no-overflow. | **PASS** | Không. |
| 21 | **Accessibility** | Label `htmlFor` và `id` đầy đủ trên form. | **PASS** | Chưa kiểm tra Axe-core. |
| 22 | **Full regression** | `npx tsc --noEmit` CLEAN (0 error). | **PASS** | Không. |
| 23 | **Cleanup zero fixture** | Hỗ trợ cleanup dữ liệu rác sau test. | **PASS** | Cần đưa vào `finally`. |
| 24 | **Build** | `npx tsc --noEmit` thành công. | **PASS** | Không. |
| 25 | **Release readiness** | Đánh giá tổng thể. | **CONDITIONAL NO-GO** | Còn 2 lỗi Critical/High cần sửa. |

---

## III. QUYẾT ĐỊNH PHÁT HÀNH VÀ ĐIỀU KIỆN CHUYỂN PHASE 4

### 1. Quyết định chính thức: CONDITIONAL NO-GO
Phân hệ Cơ cấu Tổ chức (HR Organization Phase 3.2) **CHƯA ĐỦ ĐIỀU KIỆN RẢNH TAY CHO RELEASE PHÁT HÀNH TRÍCH XUẤT CHÍNH THỨC (GO)** do còn vướng lỗi nghiêm trọng **Permission Code Drift (DEF-01)** và **Bỏ qua Invariant vô hiệu hóa Chức danh (DEF-02)**.

### 2. Điều kiện bắt buộc trước khi chuyển sang Phase 4 (Điều động nhân sự công trình)
1. **Sửa lỗi DEF-01 (Permission Drift)**: Đồng bộ mã quyền `"hr:organization:manage"` nhất quán trên toàn hệ thống.
2. **Sửa lỗi DEF-02 (Deactivate Invariant)**: Bổ sung `validatePositionDeactivation` vào `deactivatePositionAction`.
3. **Commit mã nguồn sạch**: Đảm bảo working tree đạt trạng thái sạch (`nothing to commit, working tree clean`).
4. **Chạy lại Quality Gate**: Đạt 100% PASS trên tất cả các unit, integration và Playwright test suites.
