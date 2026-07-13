# Audit dữ liệu thật, hierarchy role và RBAC toàn hệ thống

Ngày thực hiện: 13/07/2026 (ICT)  
Phạm vi: toàn repository `construction-erp-v2`, trọng tâm dữ liệu User/ProjectMember, `/users`, session, route/server action/API guard và permission helpers.

## 1. Kết luận

**PASS có điều kiện.** Dữ liệu thật đã được đọc bằng script chỉ-đọc; nguyên nhân KPI/nhãn role được chứng minh và đã sửa. Một lỗi nghiêm trọng về coupling `System Role → Project Role` đã được loại bỏ: đổi system role không còn ghi đè role của tất cả project membership.

Chưa thể kết luận hệ thống RBAC đạt chuẩn production toàn diện: policy đang phân tán, có ngoại lệ global không được mô tả bằng quyền chuẩn (ACCOUNTANT cho PAYMENT approval; MANAGER cho approval), và không có bằng chứng browser runtime vì không khởi động `npm run dev` theo yêu cầu.

## 2. Bảo vệ repository và phương pháp

- Đã chạy `git status --short` trước khi sửa; worktree đã có nhiều thay đổi chưa commit từ audit tiếng Việt và `/users` trước đó. Tất cả được giữ nguyên, không hoàn tác.
- Không chạy `git checkout`, `git reset --hard`, `git clean`, seed, migration, commit, push hay thao tác ghi dữ liệu.
- Không chạy `npm run dev`.
- Script mới `scripts/audit-users-roles-and-permissions.ts` chỉ gọi `prisma.user.findMany`, không select password, hash, token hoặc secret; gọi `prisma.$disconnect()` khi kết thúc.

## 3. Dữ liệu thật đã xác minh

Kết quả script read-only tại 13/07/2026:

| Chỉ số | Giá trị |
| --- | ---: |
| Tổng User | 11 |
| Active, chưa deleted | 9 |
| Inactive hoặc soft-deleted | 2 |
| ADMIN (tổng / active) | 3 / 1 |
| DIRECTOR (tổng / active) | 1 / 1 |
| DEPUTY_DIRECTOR (tổng / active) | 0 / 0 |
| CHIEF_COMMANDER | 1 |
| MANAGER | 1 |
| ENGINEER | 1 |
| ACCOUNTANT | 1 |
| STAFF | 3 |

| Đối tượng trên ảnh | Record thật | Kết luận |
| --- | --- | --- |
| `xd` | `id=cmqizapi2000fuswkmtxv40ra`, username `Xdai`, displayName `xđ`, role `ADMIN`, active, không có project membership | Đây là **ADMIN**, không phải DIRECTOR. Script normalize không dấu để nhận diện biến thể `xd`/`xđ`. |
| Phạm Thu Hằng | `id=cmr5p2ivj0001r4wktvfev2k2`, username `tayho_seed_director`, displayName `Phạm Thu Hằng - Ban giám đốc`, role `DIRECTOR`, active | Đây là **DIRECTOR**, được gán `CT-TAYHO-2026-001` với `ProjectRole.PROJECT_MANAGER`. |
| Cùng record? | `false` | Hai User id khác nhau. |
| Duplicate username/email/phone | Không có | Script nhóm theo giá trị chuẩn hóa; các mảng duplicate rỗng. |

Hai ADMIN còn lại đều inactive và soft-deleted: `Admin (Dev)` không membership, `Admin` có membership `PROJECT_MANAGER` tại CT-TAYHO nhưng account đã deleted. Script in email vì yêu cầu audit của task; không in mật khẩu/hash/token.

## 4. Nguyên nhân chính xác của KPI `GĐ / Phó GĐ = 1`

`src/app/(dashboard)/users/page.tsx:33-37` tải toàn bộ User bằng Prisma, sau đó:

```ts
const activeAndLockedUsers = users.filter(u => u.deletedAt === null);
const directors = activeAndLockedUsers.filter(
  u => u.role === "DIRECTOR" || u.role === "DEPUTY_DIRECTOR"
).length;
```

Vì dữ liệu thật có 1 DIRECTOR và 0 DEPUTY_DIRECTOR, KPI **1 là đúng theo định nghĩa code**. KPI:

- đếm toàn hệ thống, không theo công trình;
- đếm trước filter/search/sort/pagination phía client;
- không đếm ADMIN;
- không loại current user;
- loại soft-deleted nhưng vẫn bao gồm account bị khóa (`isActive=false`, `deletedAt=null`).

Giao diện tạo cảm giác có hai “Giám đốc điều hành” vì `src/lib/rbac.ts` trước sửa map **cả** `ADMIN` và `DIRECTOR` thành `Giám đốc điều hành`; đồng thời `src/components/layout/header.tsx` còn hard-code `ADMIN` sang nhãn đó. Đây là lỗi mapping, không phải KPI đếm sai hoặc SSR/client dùng nguồn khác. Bảng/KPI đều dùng cùng `users` query SSR; bảng mặc định chỉ filter soft-deleted ở client (`statusFilter=all_active`) và current user không bị loại.

## 5. Sửa thực hiện

1. Thêm `src/lib/roles/role-registry.ts`: registry nhãn, mô tả, level, category, sensitive/default scope cho 8 system role và 8 project role.
2. `src/lib/rbac.ts` dùng registry làm `ROLE_DISPLAY_NAMES` và `USER_ROLE_LEVEL`.
3. `ADMIN` nay hiển thị chuẩn là **Quản trị viên hệ thống**; `DIRECTOR` là **Giám đốc điều hành**. `app-shell` đã truyền label chung; Header không còn tự map ADMIN sai.
4. `/users/page.tsx` truyền role công trình và label riêng; KPI có chú thích rõ “toàn hệ thống, không đổi theo bộ lọc bảng”.
5. `UserManagementClient` tách nhãn **Vai trò hệ thống** và **Vai trò tại công trình**, drawer hiển thị role từng project. Form tạo/sửa/gán có selector project role explicit.
6. `users/actions.ts` nhận/validate `projectRoles`, mặc định an toàn `VIEWER` nếu caller không gửi role, và chỉ đổi membership role khi form gửi role project rõ ràng.

## 6. Phân tách ba khái niệm

### A. System role

Nguồn chuẩn hiện tại: `User.role` (`prisma/schema.prisma:217-255`), session `getSession`, registry mới và `rbac.ts`. Enum và label:

| Enum | Nhãn chuẩn | Level hiện tại | Default scope |
| --- | --- | ---: | --- |
| ADMIN | Quản trị viên hệ thống | 100 | GLOBAL |
| DIRECTOR | Giám đốc điều hành | 90 | GLOBAL |
| DEPUTY_DIRECTOR | Phó giám đốc | 80 | GLOBAL |
| CHIEF_COMMANDER | Chỉ huy trưởng | 50 | ASSIGNED_PROJECTS |
| ACCOUNTANT | Kế toán | 40 | ASSIGNED_PROJECTS |
| MANAGER | Quản lý | 30 | ASSIGNED_PROJECTS |
| ENGINEER | Kỹ sư | 20 | ASSIGNED_PROJECTS |
| STAFF | Nhân viên | 10 | ASSIGNED_PROJECTS |

### B. Project role

Nguồn chuẩn: `ProjectMember.role` (`prisma/schema.prisma:298-325`). `PROJECT_MANAGER`, `SITE_COMMANDER`, `CHIEF_COMMANDER`, `ASSISTANT_COMMANDER`, `QA_QC`, `HSE`, `SUPERVISOR`, `VIEWER` chỉ có nghĩa trong một project membership active.

`Thủ kho` và `nhân sự hồ sơ` không phải enum UserRole/ProjectRole. Seed mô tả chúng bằng tổ hợp `STAFF + SUPERVISOR` và `STAFF + QA_QC` (`scripts/seed-complete-realistic-project.ts:298-299`); đây là chức danh/combination, không phải role hệ thống độc lập.

### C. Action permission + scope

`rbac.ts` cung cấp scope chung; module tự tính action permissions bằng helpers như `materials-permissions.ts`, `accounting-permissions.ts`, `approval-permissions.ts`, `documents/permissions.ts` và `field-progress-permissions.ts`. Do chưa có registry quyền chung, cùng company-wide set được lặp nhiều nơi.

## 7. Phân tích logic System Role → Project Role

Trước sửa, logic nằm trong `src/app/(dashboard)/users/actions.ts`:

- create: nếu `User.role === CHIEF_COMMANDER`, mọi membership mới thành `ProjectRole.CHIEF_COMMANDER`, nếu không thì `VIEWER`.
- update có `projectIds`: membership thêm/reactivate cũng nhận role suy ra như trên.
- update chỉ đổi `User.role`: `updateMany` ghi đè **tất cả membership active** thành `CHIEF_COMMANDER` hoặc `VIEWER`.
- assign nhanh cũng suy ra role từ `User.role`.

Hệ quả: đổi system role có thể làm mất project role cũ ở nhiều công trình cùng lúc; một Giám đốc/Quản lý/Kỹ sư bị ép `VIEWER`, còn system CHIEF_COMMANDER bị ép project CHIEF_COMMANDER. Không có rule nghiệp vụ được chứng minh cho suy luận này.

Sau sửa, `getExplicitProjectRole(projectId, projectRoles)` chỉ dùng input role project, validate bằng `ProjectRole`; không còn `updatedUser.role === "CHIEF_COMMANDER"` để rewrite membership. Form edit gửi role cho từng project rõ ràng. Điều này không thay đổi records hiện hữu; chỉ ngăn mutation sai về sau.

## 8. Phân tích các system role theo code hiện tại

| Role | Quyền/scope thực tế | Tài chính | Tài khoản/cấu hình | Phê duyệt | Nhận định |
| --- | --- | --- | --- | --- | --- |
| ADMIN | Global trong `rbac.ts` và full ở materials/contracts/accounting/field-progress | Xem, create, approve, mark paid, delete | Quản lý users; cài đặt rộng; guard ADMIN cuối cùng | Có thể duyệt nghiệp vụ | Không chỉ là kỹ thuật: code hiện cho toàn quyền nghiệp vụ. |
| DIRECTOR | Global project scope | Full accounting/contracts/materials | Manage users cấp thấp hơn; không tạo ADMIN; cài company settings | Có thể duyệt | Có nhiều account, data thật hiện 1 active. |
| DEPUTY_DIRECTOR | Global project scope | Full theo helper | Chỉ cấp role thấp hơn; cài company settings | Có thể duyệt | Không có delegation authority riêng; data thật 0. |
| CHIEF_COMMANDER | Scope project membership | Theo project role | Không quản lý users/settings | Conditional theo project/type | System role không đồng nghĩa project CHIEF_COMMANDER sau sửa. |
| MANAGER | Thường assigned-project, nhưng approvals cho phép global view/create | Theo project role | Không | Có thể xem/tạo approval global | Xung đột policy với default scope; cần quyết định. |
| ENGINEER | Assigned project + own report edits | Theo project role | Không | Không mặc định duyệt | Document edit có owner/folder condition. |
| ACCOUNTANT | Assigned project theo nhiều module, nhưng global PAYMENT approvals | Có create/update/mark paid khi được project role phù hợp | Không | View/create PAYMENT global | Cần chốt global hay assigned-only. |
| STAFF | Assigned project, thường read-only trừ project role | Theo project role | Không | Conditional membership/own | Không phải kho/hồ sơ riêng. |

`assertRoleHierarchy` dùng level số (`src/lib/rbac.ts:32+`). Nó bảo vệ create/update/reset/lock/delete/assign User ở server action, self role reset/change/disable/delete và admin active cuối cùng. Tuy nhiên level số không đủ diễn tả delegation, department hay approval authority, do đó không nên là kiến trúc cuối cùng.

## 9. Audit scope, guard và rủi ro

### Đã có guard server tốt

- `/users` page redirect cho người không `canManageUsers`; actions lại gọi `requireHighLevelUser` và `assertRoleHierarchy`.
- Document actions/API gọi `requireProjectScope` hoặc `canAccessProject`; download route có session + project access check.
- Materials, contracts, accounting và field progress actions lấy project role server-side trước mutation.
- Approval decision chặn self-approve/reject trong `approval-permissions.ts`.

### Phát hiện cần theo dõi

| Mức | Phát hiện | Bằng chứng | Tác động |
| --- | --- | --- | --- |
| Đã sửa | ADMIN map thành DIRECTOR | rbac/header cũ | Sai nhận diện role, làm hiểu sai KPI. |
| Đã sửa | System role tự ghi đè project role | users/actions cũ | Mất role project nhiều công trình. |
| Cao, policy chưa chốt | ACCOUNTANT xem/tạo PAYMENT approval mọi project | `approvals/actions.ts:buildApprovalWhere`, `assertCanCreateApproval`; `approval-permissions.ts:canViewApproval` | Có thể là truy cập chéo công trình nếu nghiệp vụ yêu cầu assigned-only. Không tự đổi vì chưa có quyết định policy. |
| Trung bình | MANAGER là global ở approval nhưng không company-wide trong rbac | `approvals/actions.ts:isHighLevelViewRole` vs `rbac.ts` | Quyền cùng role khác module. |
| Trung bình | Company-wide role set lặp | rbac, dashboard, navigation, approvals, materials, contracts, accounting | Dễ drift UI/action/API. |
| Trung bình | Supplier global không project scope | `suppliers/actions.ts:getSuppliers` | Không phải leak nếu master data global, nhưng policy cần xác nhận. |
| Thấp | UI hardcode audit báo 14 vị trí suspicious | `scripts/qa-rbac-hardcode-audit.ts` | UI không là boundary; cần dần thay bằng capability từ server. |

Không thấy bằng chứng từ audit code rằng người Công trình A không phải high-level có thể vượt `requireProjectScope` vào Công trình B ở documents/materials/contracts/accounting/field-progress. Nhưng claim này chưa được runtime/e2e trên DB QA, nên không gọi PASS tuyệt đối.

## 10. API, export, upload/download, notification và audit log

- API Documents upload/load-more/download và Reports attachments/history đều có dấu hiệu session + project scope. Download file gọi `canAccessProject` trước read storage.
- API login/logout là ngoại lệ hợp lý không có session guard; cron trash cleanup phải dùng secret/cron auth riêng, không coi như user route.
- PDF/Excel hiện không có permission registry tổng quát; export report đi qua `canExportReport`, module khác phải audit riêng từng endpoint/UI.
- `project-context.ts` lọc notifications theo `getAccessibleProjectIds`, nhưng audit log module không có một policy helper/routing surface rõ để đánh giá toàn diện.

## 11. Kiến trúc mục tiêu

### Phase 1 — hoàn thành trong task, không migration

- Sửa map ADMIN/DIRECTOR và Header.
- Chú thích KPI scope, giữ KPI theo một nguồn SSR/toàn hệ thống.
- Registry `role-registry.ts` cho label/category/level/scope.
- Tách explicit project role khi gán/sửa project membership; chặn auto system→project mapping.
- Static test cho role label, KPI predicate, separation và header.

### Phase 2 — chuẩn hóa RBAC code

Tạo central permission registry, ví dụ `users.view`, `users.create`, `users.update`, `users.assign_role`, `users.deactivate`, `projects.view_all`, `projects.view_assigned`, `reports.create`, `reports.approve`, `materials.request`, `materials.approve`, `payments.create`, `payments.approve`, `settings.manage`.

Mọi permission trả về một scope: `GLOBAL`, `ASSIGNED_PROJECTS`, `OWN_RECORDS`, `DEPARTMENT`, `NONE`. Page, server action, API và UI nhận cùng capability resolved server-side. Thay `canManageUsers` rộng và numeric level bằng permission cụ thể, có delegation policy riêng.

### Phase 3 — chỉ đề xuất, không migration trong task

Nếu policy cần configurable: `Role`, `Permission`, `RolePermission`, `UserRole`, `ProjectMemberRole`, bảng delegation/approval authority, và server-side session revocation. Cần migration/rollback/data ownership plan trước khi thực hiện.

## 12. File thay đổi trong task

- `scripts/audit-users-roles-and-permissions.ts` (mới, read-only)
- `scripts/qa-role-registry-and-users-kpi-static.ts` (mới, static)
- `src/lib/roles/role-registry.ts` (mới)
- `src/lib/rbac.ts`
- `src/components/layout/header.tsx`
- `src/app/(dashboard)/users/page.tsx`
- `src/app/(dashboard)/users/actions.ts`
- `src/components/users/user-management-client.tsx`
- `docs/qa/FULL_SYSTEM_PERMISSION_MATRIX.md`
- báo cáo này

Không tạo migration, không thay schema, không seed và không thay đổi dữ liệu hiện có.

## 13. Kết quả kiểm thử

| Kiểm tra | Kết quả |
| --- | --- |
| `npx tsx scripts/audit-users-roles-and-permissions.ts` | PASS, read-only; kết quả tại mục 3 |
| `npx tsx scripts/qa-role-registry-and-users-kpi-static.ts` | PASS 11/11 assertions |
| `npx tsx scripts/qa-users-rbac-static.ts` | PASS guards hierarchy/self/last ADMIN |
| `npx tsx scripts/qa-rbac-hardcode-audit.ts` | PASS server action audit; 14 UI hardcode suspicious ghi nhận để Phase 2 |
| `npx tsc --noEmit` | PASS |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| ESLint phạm vi file đã sửa | PASS, 0 warning/error |
| `npm run build` | PASS; còn 1 cảnh báo Turbopack có sẵn về dynamic filesystem tracing từ `next.config.ts` → local storage route Reports, không thuộc RBAC/Users |
| Browser/Playwright | Chưa chạy; không chạy dev server, và các test có mutation DB không được phép chạy trên dữ liệu thật |

## 14. Hướng dẫn tự test an toàn

1. Đăng nhập `xđ`/`Xdai`: Header, bảng và dropdown phải hiện **Quản trị viên hệ thống**, không phải Giám đốc điều hành.
2. Mở `/users`: KPI GĐ/Phó GĐ phải là 1 và tooltip/chú thích cho biết KPI toàn hệ thống; Phạm Thu Hằng hiển thị Giám đốc điều hành.
3. Tạo/sửa user test trong môi trường QA: chọn system role và project role khác nhau ở hai project; đổi system role và xác nhận project role vẫn giữ nguyên.
4. Gán công trình bằng dialog: chọn explicit `QA/QC`, `Giám sát` hoặc `Chỉ xem`, mở drawer xác nhận role project hiển thị riêng.
5. Dùng DIRECTOR/DEPUTY thử tạo ADMIN, tự đổi role, khóa/xóa ADMIN active cuối cùng: server phải từ chối đúng.
6. Trên DB QA, test ACCOUNTANT không có membership gọi approval/payment project khác để chốt policy Global hay Assigned-project trước Phase 2.
