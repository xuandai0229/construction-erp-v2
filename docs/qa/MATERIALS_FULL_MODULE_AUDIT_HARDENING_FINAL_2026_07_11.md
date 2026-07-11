# Materials Full Module Audit & Hardening Final - 2026-07-11

## 1. Tom tat pham vi

Da audit va harden man hinh `/materials` va cac tab: Tong quan, Danh muc vat tu, Ton kho, Yeu cau vat tu, Nhap/Xuat vat tu; kem drawer, modal/form, action menu, filter, table, KPI, combobox, date/number format, loading/submit state, toast, empty/error state, permission, URL query params va data flow lien thong.

Khong chay `npm run dev`, khong restart localhost, khong xoa du lieu that.

## 2. Phase 0 - Data flow

- `/materials/page.tsx`: load session, project context, permissions; lay `MaterialItem`, `ProjectMaterialStock`, `MaterialMovement` qua server actions; lay `MaterialRequest`, `ApprovalRequest`, WBS/FieldProgress bang Prisma read-only trong page va serialize Date/Decimal.
- Tong quan: tinh KPI tu `stocks`, `transactions`, `requests` da load tu DB.
- Danh muc: filter/search client tu `materialItems`; detail drawer dung `stocks` va `transactions` theo material.
- Ton kho: filter/search client tu `stocks`; detail drawer dung movement gan day va request co item lien quan.
- Yeu cau vat tu: list/detail/form dung `initialRequests`, `wbsItems`, `materialItems`, `stocks`; mutation qua `src/app/actions/material-request.ts`.
- Nhap/Xuat: filter client tren toan bo movements; tao giao dich qua `createMaterialTransaction`; ledger tinh ton truoc/sau tu stock hien tai va lich su movement.

## 3. Database analysis

Models lien quan: `MaterialItem`, `ProjectMaterialStock`, `MaterialMovement`, `MaterialRequest`, `MaterialRequestItem`, `ApprovalRequest`, `Project`, `User`, `ProjectMember`, `WBSItem`, `FieldProgressTemplate`, `FieldProgressItem`.

Ket qua audit DB that:

- Projects: 1
- MaterialItems: 10, active: 8, archived: 2
- ProjectMaterialStock: 10
- MaterialMovement: 18
- MaterialRequest: 5
- MaterialRequestItem: 7
- ApprovalRequest linked to material requests: 3
- Negative stock: 0
- Remaining quantity mismatch: 0
- Submitted request without ApprovalRequest: 1, `MR-TAYHO-2026-0001`

Decimal/Date serialization: DTO actions va page da convert Decimal sang number, Date sang ISO string; QA script khong phat hien Decimal/Date object tho trong payload mau.

Soft/hard delete:

- `MaterialItem`: soft archive bang `isActive=false`; hard delete chi khi chua co movement va ton <= 0.
- `MaterialRequest`: schema co `deletedAt`, nhung action hien tai hard delete DRAFT/REJECTED va cascade items/approval. Day la technical debt neu can audit trail day du.
- `MaterialMovement`: khong co delete/cancel/reverse backend; dung ledger create-only.

## 4. Phan tich tung tab

### Tong quan

KPI lay tu DB payload, khong hard-code. Recent transactions va issues co `slice` co chu dich cho overview preview. CTA dieu huong sang tab lien quan.

### Danh muc vat tu

Da load ca active va archived material de khong mat ngu canh lich su. UI co filter trang thai, badge archived, restore action, va khong cho nhap/xuat material archived. Delete action van qua ConfirmDialog; khong con `window.confirm`.

### Ton kho

Ton kho khop `ProjectMaterialStock`. Archived stock/material van hien voi badge de giai thich lich su, nhung action nhap/xuat bi disabled. Ledger server cung chan giao dich voi material archived.

### Yeu cau vat tu

6 KPI chinh hien co. Form tao/sua da co mode material catalog/custom va work catalog/custom; custom material/work chi luu snapshot, khong tu tao master data. Xoa dong/cuoi dong khong dung confirm; submit loading reset khi validation fail.

DB co 1 `SUBMITTED` request thieu ApprovalRequest. Detail UI canh bao ro neu `SUBMITTED` thieu approval mapping; QA script ghi technical debt thay vi im lang.

### Nhap/Xuat

Transaction count khop DB, khong `take/slice` an. Filter chinh gom search/type/material/advanced/clear. Advanced filter gom date range va archived checkbox. Transaction history hien badge archived. Copy action dung toast thay vi alert.

## 5. Loi tim thay va da sua

- Action menu 3 cham co nguy co bi cat boi overflow container: da chuyen sang portal/fixed positioning, co flip len khi gan day viewport, co `aria-label`, dung lucide `MoreVertical`.
- `window.confirm` trong catalog drawer: da bo, dung ConfirmDialog.
- `alert` trong request list va transaction copy: da thay bang toast.
- Archived materials bi loc khoi catalog/stock gay cam giac DB/UI lech: da load ca archived, them badge/filter/restore va disable action giao dich moi.
- Transaction/material/request create options co the chon archived sau khi load all: da filter options chi active.
- Ledger server cho material archived: da guard khong tao movement moi.
- Movement count QA gia dinh `take:50`: da sua de phan anh code hien tai khong truncate.
- Thieu QA scripts bat buoc: da them/cap nhat.

## 6. Loi khong sua va ly do

- Existing `MR-TAYHO-2026-0001` dang `SUBMITTED` nhung thieu `ApprovalRequest`: khong tu y backfill DB that vi day la data mutation co tac dong nghiep vu. UI da canh bao; can migration/repair duoc xac nhan.
- `MaterialMovement` khong co FK den `MaterialRequest`/`MaterialRequestItem`: khong the truy vet xuat kho theo phieu that su neu chua migration.
- `MaterialMovement` khong co snapshot code/name/unit: hien tai an toan khi archive, nhung can snapshot neu muon chong rui ro hard delete/migration sau nay.
- Scoped eslint con warning unused legacy trong cac component da co truoc/ngoai thay doi chinh; khong co lint error.
- Build co Turbopack warning ngoai Materials ve attachment route/local storage tracing; khong block build.

## 7. Files da sua/tao

Code:

- `src/app/(dashboard)/materials/actions.ts`
- `src/app/actions/material-request.ts`
- `src/components/material-request/material-request-form.tsx`
- `src/components/material-request/material-request-list.tsx`
- `src/components/materials/materials-catalog.tsx`
- `src/components/materials/materials-overview.tsx`
- `src/components/materials/materials-stock-table.tsx`
- `src/components/materials/materials-transactions.tsx`
- `src/components/materials/materials-workspace.tsx`
- `src/components/materials/transaction-form-dialog.tsx`
- `src/components/materials/materials-ui.tsx`
- `src/components/ui/enterprise-combobox.tsx`
- `src/lib/materials/ledger.ts`

QA scripts:

- `scripts/qa-materials-full-data-audit.ts`
- `scripts/qa-material-movement-count-consistency.ts`
- `scripts/qa-material-request-snapshot-persistence.ts`
- `scripts/qa-material-request-approval-mapping.ts`
- `scripts/qa-material-stock-negative-guard.ts`

## 8. Ket qua lenh test/build

- `git status --short`: worktree co nhieu thay doi Materials va docs/scripts QA; co cac file untracked QA/docs da ton tai tu truoc trong workspace.
- `git diff --stat`: 12 code files changed, 1400 insertions, 502 deletions, chua tinh report/scripts moi.
- `npx prisma validate`: PASS sau khi rerun escalated do sandbox bi `ECONNREFUSED 127.0.0.1:9` khi tai Prisma schema engine.
- `npx tsc --noEmit`: PASS.
- `npx eslint src/components/materials/ src/components/material-request/ src/app/(dashboard)/materials/actions.ts`: PASS exit 0, 13 warnings unused legacy, 0 errors.
- `npx tsx scripts/qa-materials-full-data-audit.ts`: PASS.
- `npx tsx scripts/qa-material-movement-count-consistency.ts`: PASS.
- `npx tsx scripts/qa-material-request-snapshot-persistence.ts`: PASS, rollback transaction.
- `npx tsx scripts/qa-material-request-approval-mapping.ts`: PASS with warning/debt for 1 submitted request missing approval mapping, UI warning present.
- `npx tsx scripts/qa-material-stock-negative-guard.ts`: PASS, rollback transaction.
- `npm run build`: PASS. Warning: Turbopack unexpected NFT trace in attachment API path outside Materials.

## 9. Role/permission matrix

Current material permission policy:

| Role | Them/sua/xoa material | Nhap kho | Xuat kho | Tao yeu cau | Duyet yeu cau | Xem lich su |
| --- | --- | --- | --- | --- | --- | --- |
| ADMIN | Co | Co | Co | Co, qua project access | Co | Co |
| Director/Deputy Director | Theo high-level/project policy | Theo project/material permission | Theo project/material permission | Co neu co project access | Co trong approval module/detail | Co |
| Chi huy truong / manager project | Co voi project role quan ly | Co | Co | Co | Neu role app cho phep | Co |
| Ky su hien truong / staff thuong | Khong | Khong mac dinh | Khong mac dinh | Co neu co project access hien tai | Khong | Co |
| Thu kho theo policy hien tai | Khong master data | Co | Co | Co neu co project access | Khong | Co |
| Ke toan | Khong master data | Co theo material permission hien tai | Co theo material permission hien tai | Co neu co project access | Khong | Co |

Can tach permission material request rieng neu business muon han che tao/huy/cap nhan theo role chi tiet.

## 10. UI/UX desktop/mobile matrix

| Surface | Desktop | Mobile |
| --- | --- | --- |
| Header/tabs | Sticky tabs, project context | Horizontal scroll tabs |
| Filters | Compact filter rows, advanced filter in transactions | Stack vertically, clear filters visible |
| Tables | EnterpriseTable, nowrap action header | Cards for catalog/stock/request/transaction |
| Action menu | Portal, fixed, flips up near viewport bottom | Same portal menu, avoids drawer/table clipping |
| Drawers | AppDrawer right side, sticky header/footer | Full-screen drawer, sticky footer |
| Combobox | Portal, max-height, boundary footer awareness | Fixed bottom panel, internal scroll |
| Archived material | Badge and status filter | Badge on cards/history |

## 11. Rui ro con lai

- Strict approval traceability chua dat vi co 1 submitted request missing ApprovalRequest trong DB that.
- Khong co FK `MaterialMovement -> MaterialRequestItem`, nen "xuat kho theo phieu" hien chi co deep link/prefill gioi han, chua phai ledger lien ket that.
- `MaterialRequest` hard delete DRAFT/REJECTED co the trai audit policy neu muon giu lich su tat ca phieu.
- Build warning ngoai Materials can xu ly rieng neu muon zero-warning build.

## 12. De xuat migration ky thuat

1. Them `materialRequestId` va `materialRequestItemId` nullable vao `MaterialMovement`, kem index.
2. Them snapshot fields vao `MaterialMovement`: `materialCodeSnapshot`, `materialNameSnapshot`, `unitSnapshot`.
3. Them reverse/cancel movement policy: khong hard delete giao dich kho, dung reversal movement/audit.
4. Doi delete material request sang soft delete bang `deletedAt` neu audit trail la bat buoc.
5. Backfill ApprovalRequest cho submitted requests thieu mapping bang script co prefix/log va xac nhan nguoi dung.

## 13. Ket luan GO/NO-GO

**NO-GO theo tieu chi PASS nghiem ngat** vi database that con 1 `SUBMITTED` MaterialRequest thieu ApprovalRequest. Module da duoc harden de khong im lang: UI canh bao, QA script report ro technical debt, build/typecheck/scoped lint/QA pass.

Dieu kien de chuyen sang GO/PASS: chay migration/backfill ApprovalRequest co xac nhan cho `MR-TAYHO-2026-0001`, va sau do rerun `qa-material-request-approval-mapping.ts` voi findings rong cho submitted-missing-approval.
