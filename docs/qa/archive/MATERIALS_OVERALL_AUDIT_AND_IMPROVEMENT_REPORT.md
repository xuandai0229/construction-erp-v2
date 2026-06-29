# Materials Overall Audit And Improvement Report

**Ngày kiểm tra:** 26/06/2026  
**Phân hệ:** Materials - Quản lý vật tư  
**Phạm vi:** Backend, UI/UX, copy, RBAC, project-scoped data, CRUD, nhập/xuất/tồn, scripts QA, Prisma, typecheck, build, git status.  
**Kết luận ngắn:** Có thể chốt tạm phân hệ Materials trong phạm vi MVP hiện tại.

---

## 1. Skill và tài liệu đã đọc

- Đã đọc đầy đủ `.agents/skills/design-taste-frontend/SKILL.md`.
- Design read: đây là ERP dashboard/dense product UI cho người dùng nội bộ công trình, cần giao diện utilitarian, rõ quyền hạn, scan nhanh, ít text thừa. Skill này tự ghi không dành cho dashboard/data table, nên chỉ áp dụng các checklist phù hợp: copy gọn, contrast, empty state, form label, mobile dialog, tránh placeholder/AI-slop, không ép aesthetic landing page.
- Đã đọc tài liệu Next.js 16 trong `node_modules/next/dist/docs/` trước khi sửa code:
  - `01-app/01-getting-started/05-server-and-client-components.md`
  - `01-app/01-getting-started/07-mutating-data.md`
  - `01-app/01-getting-started/09-revalidating.md`

---

## 2. Repo status trước khi làm

Lệnh đã chạy:

```text
git status --short
git diff --stat
```

Status ban đầu:

```text
 M src/components/materials/material-form-dialog.tsx
 M src/components/materials/materials-overview.tsx
 M src/components/materials/materials-transactions.tsx
 M src/components/materials/materials-workspace.tsx
 M src/components/materials/transaction-form-dialog.tsx
?? docs/qa/MATERIALS_HEADER_ACTIONS_CLEANUP_REPORT.md
?? docs/qa/MATERIALS_TEXT_COPY_CLEANUP_REPORT.md
```

Diff stat ban đầu:

```text
5 files changed, 34 insertions(+), 101 deletions(-)
```

Phân loại:

| Nhóm | File |
| --- | --- |
| Materials UI đã modified sẵn | `material-form-dialog.tsx`, `materials-overview.tsx`, `materials-transactions.tsx`, `materials-workspace.tsx`, `transaction-form-dialog.tsx` |
| Report QA untracked sẵn | `MATERIALS_HEADER_ACTIONS_CLEANUP_REPORT.md`, `MATERIALS_TEXT_COPY_CLEANUP_REPORT.md` |
| File rác/scratch/log tạm | Không thấy file log/scratch tạm rõ ràng trong status ban đầu |

Ghi chú: các file modified/untracked ban đầu được coi là thay đổi nền từ vòng trước, không revert.

---

## 3. File đã đọc

Backend:

- `src/app/(dashboard)/materials/actions.ts`
- `src/lib/materials/ledger.ts`
- `src/lib/materials/materials-permissions.ts`
- `src/app/(dashboard)/materials/page.tsx`

UI:

- `src/components/materials/materials-workspace.tsx`
- `src/components/materials/materials-overview.tsx`
- `src/components/materials/materials-catalog.tsx`
- `src/components/materials/materials-stock-table.tsx`
- `src/components/materials/materials-transactions.tsx`
- `src/components/materials/material-form-dialog.tsx`
- `src/components/materials/transaction-form-dialog.tsx`
- `src/components/materials/materials-badges.tsx`
- `src/components/materials/materials-formatters.ts`
- `src/components/materials/purchase-request-placeholder.tsx`

Database/schema:

- `prisma/schema.prisma`

Scripts:

- `scripts/qa-materials-rbac.ts`
- `scripts/qa-materials-crud-flow.ts`
- `scripts/qa-materials-db-sync-audit.ts`
- `scripts/qa-materials-project-scoped-flow.ts`
- `scripts/seed-materials-rbac-test-accounts.ts`

Reports gần nhất:

- `docs/qa/MATERIALS_RBAC_IMPLEMENTATION_REPORT.md`
- `docs/qa/MATERIALS_TEXT_COPY_CLEANUP_REPORT.md`
- `docs/qa/MATERIALS_HEADER_ACTIONS_CLEANUP_REPORT.md`
- `docs/qa/MATERIALS_ADD_BUTTON_UI_AUDIT_REPORT.md`

---

## 4. Audit nghiệp vụ Materials

| Mục kiểm tra | Kết quả | Ghi chú |
| --- | --- | --- |
| Công trình mới trắng vật tư | PASS | `qa-materials-project-scoped-flow.ts` tạo project mới và xác nhận Materials/Stocks/Movements ban đầu đều `0`. |
| Không global dictionary trong query/UI runtime | PASS | Query `MaterialItem` theo `projectId`; không còn tab dictionary/tham khảo/global trong runtime. |
| Thêm vật tư đúng project hiện tại | PASS | `createMaterialItem` bắt buộc `projectId`, check permission theo project, unique code theo `[projectId, code]`. |
| Sửa vật tư toàn bộ field | PASS | `updateMaterialItem` cho sửa `name`, `unit`, `group`, `description`, không chặn đổi đơn vị tính. |
| Xóa thẳng stock/movement/material | PASS | `deleteMaterialItem` xóa `MaterialMovement`, `ProjectMaterialStock`, rồi `MaterialItem` trong transaction. |
| Không orphan sau xóa | PASS | CRUD script xác nhận final material/stock/movement count đều `0`. |
| Nhập kho cập nhật tồn | PASS | `applyMaterialMovement` upsert/increment stock khi `IMPORT`. |
| Xuất kho cập nhật tồn | PASS | `applyMaterialMovement` decrement stock khi outbound. |
| Chặn xuất vượt tồn | PASS | Server dùng `updateMany` với `stock >= quantity`; UI form cũng chặn trước. |
| Lịch sử giao dịch đúng | PASS | `getRecentTransactions` lấy movement theo project, include material, sort theo `movementDate desc`, `take 50`. |
| Dashboard số liệu | PASS | Tổng quan tính từ `stocks` và `transactions` thật đã load theo project. |
| Tồn kho khớp movement | PASS | DB sync audit: `Total Mismatches: 0`, `Negative stocks: 0`. |
| Cross-project contamination | PASS | Project-scoped flow xác nhận project khác không thấy material test. |
| Project selector không lộ data project khác | PASS | `getActiveProjects` lọc project theo membership nếu không phải ADMIN; page chỉ load `projectId` nằm trong danh sách accessible. |

Phát hiện và đã sửa:

- `createMaterialTransaction` từng cho type `TRANSFER`/`RETURN`, nhưng chỉ check quyền cho `IMPORT`/`EXPORT`. Đây là direct Server Action payload risk. Đã khóa action về `IMPORT`/`EXPORT` trong phạm vi MVP và bổ sung QA assertion.
- `ledger.ts` còn check `isActive` và text "Vật tư đã ngừng sử dụng..." trong khi triết lý hiện tại không có archive/inactive/ngừng sử dụng. Đã bỏ check này khỏi ledger để không giữ workflow cũ.

---

## 5. Audit RBAC/phân quyền

| Mục kiểm tra | Kết quả | Ghi chú |
| --- | --- | --- |
| Map đủ UserRole/ProjectRole hiện tại | PASS | Schema có 8 `UserRole`, 8 `ProjectRole`; `materials-permissions.ts` xử lý ADMIN, no project role, management roles, view-only roles. |
| UI không lộ enum tiếng Anh | PASS | UI dùng label tiếng Việt, không render `ADMIN`, `PROJECT_MANAGER`, v.v. |
| Server actions check quyền thật | PASS | Create/update/delete/min stock/transaction đều gọi `requireProjectPermissions` và assert quyền. |
| User chỉ xem không thấy thao tác | PASS | UI cắt cột/nút thao tác khi không có quyền. |
| User không quyền gọi action trực tiếp | PASS | RBAC script test create/update/delete/import/export đều bị chặn. |
| ADMIN full quyền | PASS | RBAC script pass. |
| ProjectRole full quyền đúng | PASS | `PROJECT_MANAGER`, `SITE_COMMANDER`, `CHIEF_COMMANDER`, `ASSISTANT_COMMANDER` full quyền. |
| ProjectRole view-only đúng | PASS | `QA_QC`, `HSE`, `SUPERVISOR`, `VIEWER` chỉ xem. |
| UserRole không thuộc project bị chặn | PASS | Non-admin system roles không thuộc project bị chặn theo thiết kế. |
| Cross-project payload bị chặn | PASS | RBAC script pass. |
| Xóa thẳng không bị RBAC đổi logic | PASS | Có quyền là xóa thẳng, không confirm, không soft delete. |
| Sửa toàn bộ không bị RBAC đổi logic | PASS | Có quyền là sửa được cả đơn vị tính. |

Ghi chú: `canViewPurchase` vẫn còn trong permission set để không tự ý thay đổi permission matrix. UI placeholder "Đề xuất mua" đã được gỡ khỏi navigation/runtime.

---

## 6. Audit UI/UX tổng thể

Header:

- PASS: Không còn action button nghiệp vụ ở header.
- PASS: Project selector rõ, label "Công trình đang xem".
- PASS: Mobile layout dùng grid/flex gọn, không ép action button vào header.

Tabs:

- PASS sau sửa: chỉ còn `Tổng quan`, `Danh mục vật tư`, `Tồn kho`, `Nhập / Xuất`.
- Đã sửa: bỏ tab placeholder `Đề xuất mua` khỏi runtime vì chưa có module mua hàng thật.
- Đã sửa: URL cũ `?tab=proposals` fallback về `overview`, tránh vùng nội dung trống.

Tổng quan:

- PASS: Metrics đọc nhanh: `Mã vật tư`, `Có tồn kho`, `Cần bổ sung`, `Giao dịch tháng`.
- PASS: Empty state gọn, CTA chỉ điều hướng sang Danh mục.
- Không còn CTA nhập kho trong Tổng quan.

Danh mục:

- PASS: Search theo mã/tên/nhóm.
- PASS: Button thêm không lặp: chỉ hiện header khi đã có vật tư, empty state có CTA đầu tiên.
- Đã sửa: label `Tồn tại công trình` thành `Tồn kho`.
- Đã sửa: icon Sửa/Xóa dùng `lucide-react` thay vì SVG hand-roll.
- PASS: Cột thao tác ẩn nếu không có quyền.

Tồn kho:

- PASS: Bảng có filter `Tất cả`, `Đủ hàng`, `Sắp hết`, `Hết hàng`.
- Đã sửa: `Tồn hiện tại` thành `Tồn kho`.
- Đã sửa: empty state `Chưa có tồn kho.` gọn hơn.
- PASS: Nút Nhập/Xuất theo dòng, xuất disabled nếu tồn bằng 0.

Nhập/Xuất:

- PASS: Tab hiện lịch sử giao dịch và CTA `Tạo giao dịch`.
- PASS: Empty state gọn, nhắc tạo vật tư ở Danh mục nếu chưa có material.
- PASS: Giao dịch hiển thị badge, số lượng có dấu `+/-`, ngày và ghi chú.

Forms:

- PASS: Material form có label rõ, validation client và server.
- Đã sửa: Transaction form có type DTO thay vì `any[]`, label có `htmlFor`, close button có `aria-label`, state sync khi mở dialog.
- Đã sửa: Transaction dialog dùng max height và overflow trên mobile, tránh kẹt form trên màn nhỏ.
- PASS: Không thêm confirm xóa.

---

## 7. Audit text/copy

Đã quét source Materials cho các cụm: `dictionary`, `từ điển`, `tham khảo`, `global`, `confirm`, `archive`, `restore`, `inactive`, `ngừng sử dụng`, text lặp "Công trình này chưa...", enum tiếng Anh trong UI, placeholder.

Kết quả:

- Runtime Materials không còn text dictionary/tham khảo/global/confirm/archive/restore/inactive/ngừng sử dụng.
- Đã rút gọn các text còn dài:
  - `Công trình này chưa có vật tư.` -> `Chưa có vật tư.`
  - `Tồn tại công trình` -> `Tồn kho`
  - `Tồn hiện tại` -> `Tồn kho`
  - `Không tìm thấy vật tư phù hợp với từ khóa.` -> `Không tìm thấy vật tư phù hợp.`
  - `Công trình này chưa có tồn kho vật tư.` -> `Chưa có tồn kho.`
- Dead file `src/components/materials/purchase-request-placeholder.tsx` vẫn còn trên disk và còn text `Đề xuất mua vật tư`, nhưng không còn import/runtime. `apply_patch` delete file thất bại trên Windows workspace nên không ép xóa bằng lệnh destructive.

---

## 8. Audit code quality

Đã sửa ngay các mục an toàn:

- Bỏ prop chết `currentUser` trong `MaterialsWorkspace`.
- Bỏ prop/callback chết `materialItems`, `onCreateImport` trong `MaterialsOverview`.
- Bỏ import chết trong `MaterialsWorkspace`, `MaterialsOverview`, `MaterialsCatalog`.
- Thay SVG hand-roll Sửa/Xóa bằng `Pencil`, `Trash2` từ `lucide-react`.
- Bỏ `any[]` ở `TransactionFormDialog`, thay bằng `MaterialItemDto[]`, `ProjectStockDto[]`.
- Bỏ `catch (err: any)`, thay bằng `unknown`.
- Bổ sung sync state dialog transaction khi `initialMaterialId`/type thay đổi.
- Bổ sung RBAC QA assertion cho payload giao dịch ngoài `IMPORT`/`EXPORT`.

Không sửa lớn:

- Không sửa schema.
- Không thay permission matrix.
- Không thêm role mới.
- Không thêm archive/restore/confirm/global dictionary.
- Không xóa dữ liệu thật.
- Không chạy seed tài khoản test lâu dài.

Điểm còn lại:

- `purchase-request-placeholder.tsx` là dead file còn trên disk, không import. Nên xóa ở vòng cleanup có approval hoặc khi patch delete hoạt động.
- `canViewPurchase` còn trong permission set, hiện không có UI dùng. Giữ lại để tránh tự ý đổi permission matrix.

---

## 9. Những lỗi đã sửa ngay

| Lỗi/điểm chưa hợp lý | File | Sửa gì | Vì sao an toàn |
| --- | --- | --- | --- |
| Direct payload có thể gửi `TRANSFER`/`RETURN` mà không bị permission assert | `actions.ts`, `qa-materials-rbac.ts` | Chỉ cho tạo transaction `IMPORT`/`EXPORT`, thêm test | MVP hiện chỉ có Nhập/Xuất; không đổi schema, không ảnh hưởng UI hiện tại |
| Ledger còn nhánh "ngừng sử dụng" | `ledger.ts` | Bỏ check `isActive` khi tạo movement | Không còn workflow inactive/archive trong Materials hiện tại |
| Tab placeholder Đề xuất mua gây nhiễu | `materials-workspace.tsx` | Gỡ tab runtime, fallback invalid tab về overview | Không có module mua thật, không đụng schema/permission |
| Props/import/state chết sau cleanup header | `materials-workspace.tsx`, `materials-overview.tsx`, `page.tsx` | Bỏ `currentUser`, `onCreateImport`, prop `materialItems` ở overview, import chết | Cleanup compile-time, không đổi nghiệp vụ |
| Icon hand-roll SVG | `materials-catalog.tsx` | Dùng `Pencil`, `Trash2` từ lucide | Repo đã dùng lucide, giảm code thủ công |
| Copy còn dài/lặp | `materials-catalog.tsx`, `materials-stock-table.tsx` | Rút gọn label/empty state | Không đổi flow |
| Transaction form còn `any[]`, thiếu label binding, mobile dễ kẹt | `transaction-form-dialog.tsx` | DTO types, `unknown`, `htmlFor`, `aria-label`, max-height/overflow | Không đổi payload hay schema |

---

## 10. Những điểm đã ổn

- Project-scoped data là chuẩn: `MaterialItem.projectId` bắt buộc, unique code theo project.
- Công trình mới không tự nhận vật tư mẫu.
- Không còn global dictionary trong luồng runtime.
- CRUD vật tư đầy đủ, xóa thẳng đúng triết lý.
- Sửa vật tư không chặn đổi đơn vị tính.
- Nhập/Xuất/Tồn khớp movement.
- Chặn xuất vượt tồn ở server và UI.
- RBAC server-side có kiểm tra thật, không chỉ ẩn UI.
- Viewer/view-only không thấy thao tác ghi.
- ADMIN và project management roles full quyền đúng thiết kế.
- Header đã sạch action button.
- Build/typecheck pass.
- QA scripts pass.

---

## 11. Những điểm chưa nên làm ngay

- Không thêm role Thủ kho nếu chưa có yêu cầu schema/phân quyền rõ.
- Không thêm approval nhập/xuất khi chưa có workflow.
- Không thêm audit log movement nếu chưa thiết kế retention và người chịu trách nhiệm.
- Không thêm undo/confirm khi xóa vì trái triết lý hiện tại.
- Không mở lại module Đề xuất mua nếu chưa có module mua hàng thật.
- Không đổi permission matrix để bỏ `canViewPurchase` trong lượt này.
- Không sửa sâu các script tạo flow trực tiếp bằng Prisma sang gọi server action toàn bộ, vì scope lớn hơn và cần thiết kế test harness chuẩn.

---

## 12. Bảng đề xuất cải tiến/nâng cấp

| Đề xuất | Lý do | Mức độ | Rủi ro | Có nên làm ngay? |
| --- | --- | --- | --- | --- |
| Xóa hẳn `purchase-request-placeholder.tsx` | File dead, còn copy placeholder | Low | Low | Nên làm khi có thể xóa file bằng patch/approval |
| Chuẩn hóa lại `canViewPurchase` khi module mua chưa làm | Permission đang thừa runtime | Low | Medium vì đụng matrix | Để sau, cần yêu cầu rõ |
| Thêm test server action cho over-export bằng action thật | Script project-scoped hiện simulate trực tiếp | Medium | Low | Có thể làm sau |
| Thêm role Thủ kho | Phân quyền kho thực tế hơn | Medium | High vì schema/matrix | Không làm ngay |
| Thêm audit log movement | Truy vết nhập/xuất tốt hơn | High | Medium/High | Không làm ngay |
| Snapshot đơn vị tính trong movement | Lịch sử không đổi nếu sửa unit sau movement | Medium | High vì schema/data migration | Không làm ngay |
| Import Excel vật tư | Tăng tốc nhập danh mục | Medium | Medium | Không làm ngay |
| Approval nhập/xuất | Kiểm soát nghiệp vụ kho chặt hơn | High | High | Không làm ngay |
| Module Đề xuất mua thật | Đáp ứng procurement workflow | High | High | Không làm ngay |

Đề xuất đã làm ngay: khóa transaction type về `IMPORT`/`EXPORT`, gỡ placeholder tab runtime, cleanup import/props/type/copy nhỏ, cải thiện transaction dialog mobile/accessibility.

---

## 13. QA scripts

Seed tài khoản test:

- `scripts/seed-materials-rbac-test-accounts.ts` có tồn tại và đã đọc.
- Không chạy seed vì script upsert user/project test lâu dài, hiện không cần tạo lại tài khoản test.

Kết quả chạy scripts:

```text
npx tsx --env-file=.env scripts/qa-materials-rbac.ts
PASS
- ADMIN full quyền
- Non-admin không thuộc project bị chặn
- Project management roles full quyền
- QA/QC, HSE, SUPERVISOR, VIEWER view-only
- Cross-project payload bị chặn
- Payload ngoài Nhập/Xuất bị chặn
- Sửa được unit
- Xóa thẳng không orphan
```

```text
npx tsx --env-file=.env scripts/qa-materials-crud-flow.ts
PASS
- Create/update/import/export/delete direct flow
- Final material/stock/movement count đều 0
- Cleanup done
```

```text
npx tsx --env-file=.env scripts/qa-materials-db-sync-audit.ts
PASS
- Projects audited: 1
- Total stock rows: 4
- Total movement rows: 5
- Negative stocks: 0
- Movements without stock row: 0
- Total Mismatches: 0
```

```text
npx tsx --env-file=.env scripts/qa-materials-project-scoped-flow.ts
PASS
- Project mới init Materials/Stocks/Movements = 0
- Other project sees A?: NO
- Import 100, export 30, stock còn 70
- Over-export simulated blocked
- Cleanup done
```

Ghi chú kỹ thuật: lần chạy `tsx` đầu trong sandbox bị `spawn EPERM` ở esbuild. Đã rerun ngoài sandbox với approval, sau đó pass.

---

## 14. Prisma, typecheck, build

```text
npx prisma format
PASS
```

Lần đầu Prisma CLI bị sandbox chặn network/binary check (`ECONNREFUSED 127.0.0.1:9`), đã rerun ngoài sandbox với approval.

```text
npx prisma validate
PASS - schema valid
```

```text
npx prisma generate
PASS - Generated Prisma Client v7.8.0
```

```text
npx tsc --noEmit
PASS
```

```text
npm run build
PASS
Next.js 16.2.7, compiled successfully
```

Build warning còn lại:

```text
Turbopack build encountered 1 warning:
./next.config.ts
Encountered unexpected file in NFT list
Import trace:
  App Route:
    ./next.config.ts
    ./src/app/api/reports/attachments/[attachmentId]/route.ts
```

Đánh giá warning: không thuộc Materials, không làm build fail. Nên xử lý riêng ở module reports/attachment nếu chuẩn bị release toàn hệ thống.

---

## 15. Git status cuối

Trước khi tạo report này, status cuối:

```text
 M scripts/qa-materials-rbac.ts
 M src/app/(dashboard)/materials/actions.ts
 M src/app/(dashboard)/materials/page.tsx
 M src/components/materials/material-form-dialog.tsx
 M src/components/materials/materials-catalog.tsx
 M src/components/materials/materials-overview.tsx
 M src/components/materials/materials-stock-table.tsx
 M src/components/materials/materials-transactions.tsx
 M src/components/materials/materials-workspace.tsx
 M src/components/materials/transaction-form-dialog.tsx
 M src/lib/materials/ledger.ts
?? docs/qa/MATERIALS_HEADER_ACTIONS_CLEANUP_REPORT.md
?? docs/qa/MATERIALS_TEXT_COPY_CLEANUP_REPORT.md
```

Sau khi tạo report này sẽ có thêm:

```text
?? docs/qa/MATERIALS_OVERALL_AUDIT_AND_IMPROVEMENT_REPORT.md
```

Diff stat trước khi tạo report:

```text
11 files changed, 109 insertions(+), 172 deletions(-)
```

Ghi chú: `material-form-dialog.tsx`, `materials-overview.tsx`, `materials-transactions.tsx`, `materials-workspace.tsx`, `transaction-form-dialog.tsx` đã modified từ trước audit này. Tôi chỉ sửa tiếp các phần an toàn và không revert thay đổi nền.

---

## 16. Rủi ro còn lại

- `purchase-request-placeholder.tsx` còn trên disk, không import/runtime. Rủi ro thấp nhưng nên dọn để source audit không còn placeholder.
- `canViewPurchase` còn trong permission set. Rủi ro thấp ở runtime vì UI đã gỡ, nhưng về thiết kế permission nên quyết định sau khi module mua hàng có spec.
- Build còn warning Turbopack/NFT ở route reports attachment, ngoài scope Materials.
- `MaterialMovement` không snapshot `unit`; nếu sửa đơn vị tính sau khi đã có movement, lịch sử sẽ hiển thị theo unit mới. Đây là đúng triết lý "sửa toàn bộ" hiện tại, nhưng là rủi ro truy vết nếu sau này cần kế toán/kho chặt hơn.
- Script `qa-materials-project-scoped-flow.ts` vẫn simulate over-export bằng logic script thay vì gọi server action thật. Hiện đã có server logic trong ledger và RBAC action test, nhưng coverage có thể chặt hơn.

---

## 17. Kết luận

Không còn blocker trong phạm vi MVP hiện tại của Materials.

Materials đã đạt các điểm chính: project-scoped, công trình mới trắng vật tư, không global dictionary runtime, CRUD đầy đủ, xóa thẳng, sửa toàn bộ field, nhập/xuất/tồn khớp movement, RBAC server-side pass, UI/copy gọn hơn, scripts QA pass, Prisma/typecheck/build pass.

**Có thể chốt tạm phân hệ Materials trong phạm vi MVP hiện tại.**
