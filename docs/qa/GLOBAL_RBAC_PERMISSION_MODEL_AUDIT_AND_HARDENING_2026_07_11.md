# Global RBAC Permission Model Audit And Hardening - 2026-07-11

## 1. Mo hinh hien tai

He thong hien co 2 lop phan quyen chinh:

- `User.role`: `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR`, `CHIEF_COMMANDER`, `MANAGER`, `ENGINEER`, `ACCOUNTANT`, `STAFF`.
- `ProjectMember.role`: `PROJECT_MANAGER`, `SITE_COMMANDER`, `CHIEF_COMMANDER`, `ASSISTANT_COMMANDER`, `QA_QC`, `HSE`, `SUPERVISOR`, `VIEWER`.

Chua co schema permission flag per-user/per-project rieng. Vi vay hardening lan nay khong migration DB, khong tao/xoa user/project/permission, va mapping permission tam thoi duoc tinh tu `User.role` + `ProjectMember.role`.

## 2. Mo hinh de xuat

Chuan 3 lop:

1. Global role: xac dinh nhom he thong/cap cong ty/cap nhan su.
2. Project assignment: du lieu nghiep vu phai qua scope cong trinh, tru `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR`.
3. Permission flags: UI va server dung cung helper permission theo module.

Helper da bo sung:

- `src/lib/rbac.ts`: `isSystemAdmin`, `isCompanyWideUser`, `requireProjectScope`, `getProjectRoleForUser`.
- `src/lib/rbac-rules.ts`: helper role-name client-safe cho UI.
- `src/lib/navigation-permissions.ts`: policy hien/ an sidebar/mobile nav.
- `src/lib/materials/materials-access.ts`: `getProjectMaterialPermissions`, `assertMaterialPermission`.
- `src/lib/field-progress/field-progress-permissions.ts`: permission cho khoi luong hien truong.

## 3. Permission matrix de xuat

| Role | Scope | View Project | Materials View | Materials Create | Import | Export | Update | Delete | Restore | Approve Payment | Manage Users |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Admin | All | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| Giam doc | All | Y | Y | Y | Y | Y | Y | Y | Y | Y | Policy |
| Pho giam doc | All | Y | Y | Y | Y | Y | Y | Y | Y | Y | Policy |
| Chi huy truong | Assigned projects | Y | Y | Y | Y | Y | Y | Y | Y | Project/Policy |
| Thu kho | Assigned projects | Y | Y | - | Y | Y | - | - | - | - | - |
| Ke toan | Assigned projects | Y | Y | - | Y | Y | Payment perms | - | - | Policy | - |
| Ky su hien truong | Assigned projects | Y | Y | - | - | - | Progress/Report perms | - | - | - | - |
| Viewer | Assigned projects | Y | Y/read-only | - | - | - | - | - | - | - | - |
| User khong thuoc project | None | - | - | - | - | - | - | - | - | - | - |

Ghi chu: ke toan trong DB mau dang co project role `VIEWER` nhung global role `ACCOUNTANT`, nen permission materials hien tai cho phep import/export theo policy ke toan. Neu muon viewer thuan tuyet doi read-only can tach user viewer khoi global `ACCOUNTANT` hoac them permission flag schema.

## 4. Project scope rules

- `ADMIN`: xem/sua moi cong trinh, duoc bypass project scope khi can thiet.
- `DIRECTOR`, `DEPUTY_DIRECTOR`: xem moi cong trinh va dashboard tong cong ty.
- Nhan su cong trinh: chi xem/thao tac cong trinh co `ProjectMember`.
- Direct URL/API mutation phai resolve project tu record khi co the, khong tin `projectId` client.
- User ngoai project khong duoc thay project, khong mutation bang `projectId` gia.

Da ap dung `requireProjectScope()` cho accounting, contracts, documents, materials request, field progress va project edit guards lien quan.

## 5. Module-by-module rules

- Dashboard: company-wide roles xem executive dashboard; nhan su cong trinh xem operational dashboard theo project context.
- Projects: create/update/delete theo management/system policy; completed/cancelled chi system admin duoc edit.
- Materials: view/create/update/delete/restore/import/export/approve request tach flag; request approve chan tu duyet neu khong phai system admin.
- Reports: create/update/delete/submit/approve dung workflow policy; UI report buttons da dung helper company-wide thay vi lap role list.
- Field Progress: update/approve/lock tach permission; server action update khoi luong bat buoc co scope + permission.
- Documents: restore/delete/permanent delete tach policy; permanent delete chi system admin.
- Contracts: CRUD qua project scope + contract permission.
- Payments/Accounting: CRUD/status qua project scope + accounting permission; self approve/reject bi chan tru system admin.
- Approvals: con can schema/policy rieng neu muon canSubmit/canApproveProjectLevel/canApproveDirectorLevel/canApproveFinanceLevel chi tiet theo tung cap.
- Users/Settings: van theo `canManageUsers`; last-admin guard duoc giu lai.

## 6. Hard-code role da tim thay

Ket qua `scripts/qa-rbac-hardcode-audit.ts` sau hardening:

- `must-fix`: 0.
- `suspicious`: 243.
- `acceptable`: 86.

Nhom con `suspicious` chu yeu la seed/test/maintenance scripts, UI hien thi label role, user management hierarchy, va cac permission helper tap trung. Mot so diem UI con can tinh chinh neu co policy chi tiet hon: users table role options, report print label, dashboard helper tests, approval permissions legacy.

## 7. Cac cho da sua

- Bo sung helper scope/system/company-wide trong `src/lib/rbac.ts`.
- Bo sung helper client-safe `src/lib/rbac-rules.ts`.
- Bo sung `src/lib/navigation-permissions.ts` va dong bo sidebar/mobile nav theo permission.
- Harden Materials actions va Material Request actions bang `assertMaterialPermission`, `requireProjectScope`, chan self-approval.
- Harden Contracts/Accounting/Documents/Projects/Field Progress server actions bang project scope + permission module.
- Harden Reports workflow policy de gom `DEPUTY_DIRECTOR` vao nhom cong ty.
- Chuyen UI dashboard/report/field-progress mot so hard-code role sang helper dung chung.
- Sua loi build phu tro: stream import trong local storage provider va loi JSX/TS o material request UI.

## 8. Chua sua vi can migration/policy

- Chua co bang permission flag per-user/per-project; hien mapping van suy ra tu global role + project role.
- Chua co approval policy schema theo cap: project/company/finance/final/delegate/reopen/canApproveOwnRequest.
- Chua co user sample `DEPUTY_DIRECTOR`.
- Chua co user sample "ngoai tat ca cong trinh" de test leak bang DB thuc.
- `qa-materials-rbac.ts` hien co expectation cu: Director no-project expected false, trong khi policy moi yeu cau Director/Pho director xem all projects.
- Build con warning NFT/Turbopack ve dynamic tracing tu `local-storage-provider.ts`, khong lam fail build.
- ESLint con 195 warning unused/no-img tu codebase san co, khong co error.

## 9. Server actions/API routes da guard

`scripts/qa-rbac-server-action-guard-audit.ts` bao cao:

- Guarded: accounting, approvals, contracts, documents, materials, field-progress, reports, document upload API, report attachment API.
- Guarded global: projects, settings, suppliers, users.
- Public/session routes: auth login/logout.

Khong con mutation nao trong scan bi phan loai `missing guard`.

## 10. UI/sidebar/action menu da dong bo

- Sidebar desktop dung `canViewNavigationItem()`.
- Header/mobile sections dung cung navigation permission.
- Report detail/table/mobile action buttons dung `isCompanyWideRole()`.
- Field progress report-sourced readonly dung company-wide helper.
- Materials server-side la nguon chan cuoi; UI con can tiep tuc tinh chinh action menu theo permission row-level neu sau nay them schema permission flag chi tiet.

## 11. Test scripts da chay

Bat buoc:

- `npx prisma validate`: PASS.
- `npx tsc --noEmit`: PASS.
- `npx eslint src/app/ src/components/ src/lib/`: PASS voi 0 error, 195 warning.
- `npx tsx --env-file=.env scripts/qa-rbac-permission-matrix-audit.ts`: PASS, co `MISSING SAMPLE` cho Pho giam doc/Chi huy truong projectRole CHIEF_COMMANDER/User ngoai project.
- `npx tsx --env-file=.env scripts/qa-rbac-hardcode-audit.ts`: PASS, `must-fix=0`.
- `npx tsx --env-file=.env scripts/qa-rbac-project-scope-audit.ts`: PASS, 1 project, 10 users, company-wide roles all projects.
- `npx tsx --env-file=.env scripts/qa-rbac-materials-permission-audit.ts`: PASS theo mapping hien tai.
- `npx tsx --env-file=.env scripts/qa-rbac-server-action-guard-audit.ts`: PASS, khong co missing guard.
- `npm run build`: PASS.

Materials/Ton kho hien co:

- `npx tsx --env-file=.env scripts/qa-materials-rbac.ts`: chay duoc; can cap nhat expectation cu cho Director.
- `npx tsx --env-file=.env scripts/qa-material-stock-ledger-reconciliation.ts`: PASS, 14/14 stock khop ledger.
- `npx tsx --env-file=.env scripts/qa-materials-project-isolation-audit.ts --projectId=cmr5p2iwm0009r4wk51lwxhjy`: PASS co warning 4 material cu khong prefix demo; khong sua/xoa du lieu.

Khong chay:

- Khong chay `npm run dev`.
- Khong restart localhost.
- Khong xoa/sua du lieu that.
- Khong tao migration DB.

## 12. E2E test

RBAC E2E chua du, PASS CO DIEU KIEN.

Ly do: khong khoi dong dev server theo rang buoc, khong restart localhost, va khong co session/user browser thuc cho day du Admin/Giam doc/Pho giam doc/Chi huy truong/Viewer/User ngoai project. Chua du dieu kien de ket luan GO tuyet doi ve direct URL/API bypass bang trinh duyet va mutation that.

## 13. Ket luan

PASS CO DIEU KIEN.

He thong da duoc harden o server-side cho cac mutation chinh, project scope da tap trung hon, UI/sidebar/action report da dung helper permission thay vi hard-code role le. Build/typecheck/Prisma/QA scripts pass.

Chua duoc GO tuyet doi vi chua co E2E mutation test bang session that cho tung nhom quyen, chua co permission flag schema rieng, va con can policy approval multi-level neu nghiep vu yeu cau phan cap duyet chinh xac hon.
