# FULL SYSTEM HIDDEN BUG AUDIT - 2026-06-29

## 1. Tong quan ket qua

- CRITICAL: 2
- HIGH: 5
- MEDIUM: 7
- LOW: 3
- Trang thai audit truoc fix: FAIL
- Co sua code tai thoi diem lap bao cao nay: Chua
- Co migration: Khong
- Co tac dong du lieu that: Khong, chi doc code va chay command/test an toan

## 2. Stack va entry points

- Stack: Next.js 16.2.7, React 19.2.4, Prisma 7.8.0, PostgreSQL, TypeScript.
- App routes: `src/app/(dashboard)/**`, `src/app/print/reports/[reportId]/page.tsx`, `src/app/login/page.tsx`.
- API routes: `src/app/api/auth/*`, `src/app/api/documents/*`, `src/app/api/reports/*`.
- Server actions: reports, approvals, accounting, contracts, documents, projects, users, suppliers, materials, field-progress, material-request.
- Prisma models chinh: `Project`, `ProjectMember`, `FieldProgressItem`, `FieldProgressEntry`, `SiteReport`, `Document`, `MaterialRequest`, `MaterialMovement`, `PaymentRequest`, `ApprovalRequest`.
- QA scripts hien co: nhieu script trong `scripts/qa-*`; chi chay cac script da doc va xac nhan khong seed/reset DB.

## 3. Bang loi

| Severity | Module | File | Van de | Bang chung | Anh huong | De xuat fix |
| --- | --- | --- | --- | --- | --- | --- |
| CRITICAL | Reports / Weekly | `src/app/(dashboard)/reports/actions.ts` | `getWeeklyReportPreview()` va `createWeeklyReportFromApprovedDailyReports()` chi check login, khong check project membership. | Lines 402-430 query report theo `projectId`; lines 512-615 tao weekly report theo `input.projectId`; khong goi `getAccessibleProjectIds`/`canAccessProject`. | User dang nhap co the doc/tong hop/tao bao cao tuan cho cong trinh khong thuoc quyen neu biet `projectId`. | Them guard project access truoc preview/create; transaction tao weekly cung phai giu project scope. |
| CRITICAL | Approvals | `src/app/(dashboard)/approvals/actions.ts` | Approval nhan `sourceType/sourceId` tu client va khi approve/reject sync sang source record ma khong check source cung `projectId` voi approval. | Lines 249-254 luu `sourceType/sourceId`; lines 380-472 find/update `paymentRequest`, `contract`, `materialRequest`, `siteReport` bang `sourceId` don le. | Co the tao approval o project A nhung tro sourceId sang record project B, sau do nguoi duyet project A lam thay doi record project B. | Validate source belongs to approval.projectId khi create/update va check lai trong `syncSourceOnApprovalTx`. |
| HIGH | Field Progress master | `src/app/(dashboard)/projects/[id]/field-progress/actions.ts` | `updateItem`, `deleteItem`, `batchUpdateItems` check access theo `projectId` client gui nhung update/delete theo `itemId` don le. | Lines 88-97, 126-135, 174-183. | User co quyen project A co the sua/xoa item project B neu biet id va gui `projectId=A`. | Fetch item/template voi `projectId` + `templateId`; updateMany/findFirst scope theo project; reject mismatch. |
| HIGH | Field Progress master | `src/app/(dashboard)/projects/[id]/field-progress/actions.ts` | Xoa item se soft-delete entries lien quan ma khong chan entries da APPROVED. | Lines 153-155 updateMany `FieldProgressEntry` khong loc status. | Mat/che khuong luong da duyet, sai tong hop tien do. | Khong cho xoa item khi ton tai entry APPROVED/SUBMITTED hoac can workflow rieng. |
| HIGH | Field Progress daily | `src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts` | Moi save daily entry tu dong set `status = "APPROVED"` va `approvedAt`, tham so `_submit` khong dung. | Lines 15, 20, 144-176. | Bypass workflow DRAFT/SUBMITTED/APPROVED; engineer/member co access co the tao so lieu da duyet. | Can quyet dinh nghiep vu: neu co approval workflow, save thanh DRAFT/SUBMITTED va chi role duyet moi APPROVED. Chua fix ngay vi anh huong workflow lon. |
| HIGH | Material Request | `src/app/actions/material-request.ts` | Backend cho status bat ky va update item theo item id don le; validate so am/NaN phu thuoc UI. | Lines 88-97 nhan `status: any`; lines 111-120 update `MaterialRequestItem` by `{ id: item.id }`; lines 29-32, 73-76 dung Number/Math.max nhung khong reject input am/NaN. | Co the nhay trang thai sai, update item khong thuoc request, tao so lieu vat tu am/sai. | Dinh nghia allowed transitions, validate quantity >=0 finite, update item voi `materialRequestId`. |
| HIGH | Reports | `src/app/(dashboard)/reports/actions.ts` | Tao/sua report line khong reject quantity am/NaN. | Lines 117-125 va 676-684 dung `Number(line.quantityToday)` hoac default 0. | Bao cao hien truong co khoi luong am/NaN, tong hop tuan sai. | Validate finite non-negative server-side cho line quantities. |
| HIGH | Accounting | `src/app/(dashboard)/accounting/actions.ts` | Tao `requestCode` bang Date.now + random, khong retry khi unique conflict. | Line 292; schema `PaymentRequest.requestCode @unique`. | Double submit/concurrency co the tao conflict va tra loi loi chung, mat trai nghiem nhap thanh toan. | Dung retry giong material request number hoac DB sequence. |
| MEDIUM | Reports print | `src/app/print/reports/[reportId]/page.tsx` | Trang print chi cho ADMIN/DIRECTOR hoac creator xem, khong dung project membership. | Lines 70-79 co TODO `Implement ProjectUser RBAC`. | Thanh vien cong trinh co quyen xem report trong app co the bi chan khi in. | Dung `canAccessProject(session, report.projectId)`. |
| MEDIUM | Project detail | `src/app/(dashboard)/projects/[id]/page.tsx` | KPI "Hom nay" dem `createdAt` thay vi `entryDate`. | Lines 18-39. | Nhap bu/ngay khac se hien sai trang thai ngoai cong truong. | Dung `getWorkDateRange(todayWorkDate())` va loc `entryDate`. |
| MEDIUM | Documents upload | `src/lib/documents/validation.ts`, `src/app/api/documents/upload/route.ts` | Doc settings upload nhung khong enforce `maxUploadSizeMb`. | Validation lines 17-52 khong dung size; upload route lines 63-75 goi validation. | File qua lon co the gay timeout/RAM/IO bat ngo trong production. | Enforce size theo setting hoac thiet ke presigned/streaming policy ro rang. |
| MEDIUM | Report attachments | `src/app/api/reports/[reportId]/attachments/route.ts` | Gioi han hardcoded 10 photo/5 file. | Lines 13-14. | Co the khong dung yeu cau "khong hardcode gioi han dung luong/logic" va chan nhu cau hien truong. | Dua vao settings hoac ghi ro product limit. |
| MEDIUM | Build/runtime | `src/app/api/reports/[reportId]/attachments/route.ts`, `src/app/api/reports/attachments/[attachmentId]/route.ts` | Dynamic `require()` trong route Node gay lint fail va build warning NFT tracing. | Lint errors at lines 200-202 va line 79; build warning import trace qua storage provider. | Risk trace ca project / runtime packaging bat on. | Doi sang static imports. |
| MEDIUM | Field Progress guard | `scripts/qa-field-progress-volume-guard-test.ts`, `src/lib/field-progress/volume-guard.ts` | QA script va implementation lech nhau ve cho phep vuot 100% co note. | Script fail: expected `REQUIRE_NOTE`, got `BLOCK_SUBMIT`. Code lines 57-60 block moi `percent > 100`. | Khong ro rule nghiep vu; co the chan nhap phat sinh hop le hoac script da cu. | Chot policy va cap nhat code/test. |
| MEDIUM | Contracts/Accounting scope | `src/app/(dashboard)/contracts/actions.ts`, `src/app/(dashboard)/accounting/actions.ts` | `MANAGER/ACCOUNTANT` duoc global view trong code. | Contracts lines 65-69; Accounting lines 83-88. | Neu nghiep vu yeu cau project-scope cho hai role nay, se lo du lieu lien cong trinh. | Owner can chot role matrix; neu project-scope thi doi query. |
| LOW | Lint/tooling | Repo root/scripts/src | `npm run lint` fail 98 errors/264 warnings. | Command output: CommonJS `require`, `prefer-const`, dynamic require in API. | Khong chan build nhung lam CI/lint gate fail. | Tach lint config scripts cu hoac sua errors co anh huong src. |
| LOW | Auth proxy | `src/proxy.ts` | Proxy khong chan API non-auth, route tu bao ve. | Lines 49-56. | Chap nhan duoc neu moi API co guard; risk neu them API moi quen guard. | Co convention/test bat buoc API auth guard hoac proxy deny default. |
| LOW | UI/mobile chua verified bang browser | Multiple | Chua chay Playwright/dev server nen mobile/responsive chi audit static. | Khong co screenshot/browser log trong run nay. | Chua the PASS UI thuc te ngoai cong truong. | Can smoke browser sau khi user cho phep chay dev server. |

## 4. Bang audit RBAC/project scope rut gon

| Module | File | Action/API | Auth check | Role check | Project scope | Risk | Severity | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reports weekly | `reports/actions.ts` | `getWeeklyReportPreview`, `createWeeklyReportFromApprovedDailyReports` | Co `getSession` | Khong | Khong | Cross-project read/create weekly report | CRITICAL | Lines 402-615 |
| Approvals | `approvals/actions.ts` | create/update/approve sync source | Co `getSession` | Co approval policy | Thieu source-project binding | Cross-project source mutation | CRITICAL | Lines 249-254, 380-472 |
| Field Progress master | `field-progress/actions.ts` | create/update/delete/batch | Co `requireProjectAccess(projectId)` | Khong ro project role | Thieu item/template scope trong mutation | Cross-project item mutation | HIGH | Lines 41-211 |
| Field Progress daily | `daily/actions.ts` | `batchSaveDailyEntries` | Co `requireProjectAccess(projectId)` | Khong | Co item project/template check | Auto approve bypass | HIGH | Lines 20, 144-176 |
| Documents API | `api/documents/upload`, `download` | upload/download | Co `getSession` | Co folder/document policy | Co project/folder/document scope | Khong thay leak chinh | PASS co dieu kien | Upload lines 77-90; download lines 21-31 |
| Report attachments API | `api/reports/*attachments*` | upload/download attachments | Co `getSession` | Workflow status | Co report.projectId access | Build/lint risk, hardcoded limits | MEDIUM | Upload lines 57-90, 113-128; download lines 35-49 |
| Materials | `materials/actions.ts` | material CRUD/transactions | Co session | Co material permissions | Co project/material binding | Khong thay xuat vuot ton | PASS co dieu kien | Ledger lines 42-68 |
| Accounting | `accounting/actions.ts` | payment requests | Co session | Co accounting permissions | Project via record/membership | Concurrency code/rbac policy can chot | MEDIUM | Lines 271-289, 384-447 |
| Users | `users/actions.ts` | user admin | `requireHighLevelUser` | Role hierarchy | N/A | Khong thay missing auth | PASS | rg lines 33-601 |

## 5. Commands da chay va ket qua

| Command | Ket qua | Ghi chu |
| --- | --- | --- |
| `git status --short` | PASS | Repo dang dirty: dashboard changes va file report dashboard moi. Khong revert. |
| `git log -1 --oneline` | PASS | `0569ee7 docs: fix QA archive manifest paths` |
| `npx prisma validate` | PASS sau escalation | Trong sandbox fail `ECONNREFUSED 127.0.0.1:9`; chay ngoai sandbox pass. |
| `npx prisma generate` | PASS sau escalation | Generate Prisma Client v7.8.0. |
| `npx tsc --noEmit` | PASS | Khong co type error. |
| `npm run build` | PASS co warning | Next build pass; warning NFT trace qua storage/report attachment route. |
| `npm run lint` | FAIL | 98 errors/264 warnings. |
| `npx tsx scripts/qa-work-date-logic-test.ts` | PASS sau escalation | Sandbox fail `spawn EPERM`; ngoai sandbox pass 4/4 timezone cases. |
| `npx tsx scripts/qa-field-progress-volume-guard-test.ts` | FAIL | Fails at 105% DRAFT no note: expected REQUIRE_NOTE, got BLOCK_SUBMIT. |
| `npx tsx scripts/qa-accounting-contract-limit.ts` | PASS | Static verification contract limit present in create/update. |
| `npx tsx scripts/qa-approvals-sync-static.ts` | PASS co dieu kien | Script chi check co sync, khong check source-project binding nen khong bat duoc CRITICAL. |

## 6. Module chua xac minh duoc

- Browser UI/responsive/mobile: chua chay dev server/Playwright nen chua co screenshot bang chung.
- Database runtime tren du lieu that: khong chay script ghi DB, seed, reset, destructive cleanup.
- Full report attachment upload thuc te: chua upload file lon/thuc te.
- Full role matrix nghiep vu: `MANAGER`, `ACCOUNTANT`, project role nao duoc xem global can owner chot.

## 7. Ket luan truoc fix

- Khong nen production truoc khi fix it nhat 2 loi CRITICAL va Field Progress master cross-project mutation.
- Bat buoc fix truoc production: weekly report project scope, approval source-project binding, field-progress item mutation scope.
- Nen fix tiep/backlog: daily entry auto-approve, material request transition/quantity validation, report line validation, lint/build warning, upload limit policy, print report RBAC.
