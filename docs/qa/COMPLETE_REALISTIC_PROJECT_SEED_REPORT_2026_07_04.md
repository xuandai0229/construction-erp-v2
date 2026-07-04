# Complete Realistic Project Seed Report - 2026-07-04

## A. Kết luận

**Kết quả:** PASS CÓ ĐIỀU KIỆN

Đã seed công trình mẫu **"Dự án Nhà Văn Phòng Kết Hợp Căn Hộ Dịch Vụ Tây Hồ"** với mã **CT-TAYHO-2026-001** bằng script riêng:

`scripts/seed-complete-realistic-project.ts`

Dữ liệu được nhận diện bằng:

- `SEED_TAG`: `COMPLETE_REALISTIC_PROJECT_TAY_HO_2026`
- Project code: `CT-TAYHO-2026-001`
- Email seed users: `@seed.local`
- ID deterministic cho các model không có unique business key
- `Document.metadata.seedTag` cho tài liệu seed
- Nội dung/note/audit chứa `SEED_TAG`

Script **không truncate, không reset migration, không xóa dữ liệu thật, không chạy npm run dev, không commit/push**. Script dùng `upsert`/find-or-create và chỉ cập nhật các bản ghi seed có khóa nhận diện cố định.

Các module đã có dữ liệu:

- User / Role / ProjectMember / RBAC
- Project
- Dashboard source data
- WBS phụ trợ
- Field progress baseline / daily entries / rollup source data
- Material catalog / movement / stock / material request / field material request
- Supplier / Contract
- Payment plan / payment record / payment request
- Approval request
- Document folder / document metadata / dummy storage files
- Site report / report lines / report attachments / report photos
- Notification
- ChatMessage standalone
- AuditLog
- SystemSetting: đã kiểm tra, có sẵn nên không ghi đè

Module/khả năng **CHƯA CÓ TRONG CODE** hoặc chưa có model riêng:

- `ProjectUser`: schema dùng `ProjectMember`, không có model `ProjectUser`.
- Role `PROJECT_MANAGER`, `SITE_MANAGER`, `WAREHOUSE`, `DOCUMENT_STAFF`, `VIEWER` không phải `UserRole`; đã map bằng `UserRole` + `ProjectRole`.
- Cột riêng cho tỉnh/thành, quận/huyện, GPS, số tầng, diện tích sàn, tầng hầm trong `Project`: chưa có; thông tin này được đưa vào `Project.description`, GPS có trong `SiteReport`.
- Model phụ lục hợp đồng riêng: chưa có.
- Model permission tài liệu riêng: chưa có; phân quyền tài liệu đang xử lý bằng role/folder trong code.
- Chat room hoặc chat theo project: chưa có; `ChatMessage` chỉ có `senderId/content/createdAt`.
- Comment model: chưa có.
- Dashboard table/model riêng: chưa có; dashboard tính từ dữ liệu nghiệp vụ.
- Đơn giá/thành tiền trong `FieldProgressItem`: chưa có field riêng.

## B. Ma trận dữ liệu đã quét

| Module | Model | Form/API liên quan | Dữ liệu bắt buộc | Dữ liệu đã seed | Trạng thái |
|---|---|---|---|---|---|
| User/RBAC | `User`, `ProjectMember` | `users/actions.ts`, `user-management-client.tsx`, `rbac.ts` | name, email, password, role, project membership | 9 users, 9 project members | SẼ SEED - DONE |
| Project | `Project` | `projects/actions.ts`, `project-form.tsx` | code, name, status; optional investor/location/dates/description/budget | `CT-TAYHO-2026-001`, ACTIVE, budget, dates, investor, location | SẼ SEED - DONE |
| Dashboard | no model riêng | `dashboard-queries.ts` | source data từ project/report/doc/payment/approval/progress | đủ count/sum cho dashboard | SẼ SEED - DONE |
| WBS legacy | `WBSItem` | reports/material fallback | projectId, code, name, status | 8 WBS items | SẼ SEED - DONE |
| Field progress baseline | `FieldProgressTemplate`, `FieldProgressItem` | `projects/[id]/field-progress/actions.ts` | template, group/work items, unit, designQuantity | 1 template, 8 groups, 20 work items | SẼ SEED - DONE |
| Daily progress | `FieldProgressEntry` | `field-progress/daily/actions.ts` | item/date/quantity/status/creator | 16 entries, DRAFT/SUBMITTED/APPROVED, no overrun | SẼ SEED - DONE |
| Materials | `MaterialItem`, `MaterialMovement`, `ProjectMaterialStock` | `materials/actions.ts`, material dialogs | code, name, unit, movement qty, stock | 10 materials, 17 movements, stock rows | SẼ SEED - DONE |
| Material requests | `MaterialRequest`, `MaterialRequestItem`, `FieldMaterialRequest` | `material-request.ts`, request form | project, requester, date, priority, status, items | 2 material requests, 1 field material request | SẼ SEED - DONE |
| Suppliers | `Supplier` | `suppliers/actions.ts`, supplier form | code, name | 5 suppliers | SẼ SEED - DONE |
| Contracts | `Contract` | `contracts/actions.ts`, contract form | project, contractNo, type, status, value | 5 contracts | SẼ SEED - DONE |
| Payments | `PaymentPlan`, `PaymentRecord`, `PaymentRequest` | `accounting/actions.ts`, payment form | project, amount, status, creator, contract | 4 plans, 1 record, 5 requests | SẼ SEED - DONE |
| Approvals | `ApprovalRequest` | `approvals/actions.ts`, approval center | project, title, type, status, priority, requester | 5 approvals with PENDING/APPROVED/REJECTED/CANCELLED | SẼ SEED - DONE |
| Documents | `DocumentFolder`, `Document` | `documents/actions.ts`, upload API, workspace | folder, file metadata, uploader, status | 27 folders, 8 docs, dummy storage files | SẼ SEED - DONE |
| Reports | `SiteReport`, `SiteReportLine`, `SiteReportAttachment`, `SiteReportPhoto` | `reports/actions.ts`, create report dialog, attachment routes | project, date, type, status, creator, lines | 6 daily + 1 weekly reports, lines/photos/attachments | SẼ SEED - DONE |
| Notifications | `Notification` | `project-context.ts`, notification actions | user/project/type/severity/title | 4 notifications | SẼ SEED - DONE |
| Chat | `ChatMessage` | no project chat UI/action found | sender/content only | 4 standalone messages tagged by project code | CÓ MODEL, CHƯA CÓ MODULE UI |
| Settings | `SystemSetting` | `settings/actions.ts` | many required org/security/workflow fields | detected existing settings, left untouched | CẦN KIỂM TRA UI |
| Audit | `AuditLog` | `audit.ts`, report services | user/project/action/entity | 1 seed audit log | SẼ SEED - DONE |

## C. Danh sách dữ liệu đã nhập

### Users

Mật khẩu mặc định nếu không set env `COMPLETE_REALISTIC_PROJECT_SEED_PASSWORD`: `CompleteSeed@2026!`

| Nhóm nghiệp vụ | Email | UserRole thật | ProjectRole thật |
|---|---|---|---|
| ADMIN / Admin hệ thống | `tayho.admin@seed.local` | `ADMIN` | `PROJECT_MANAGER` |
| DIRECTOR / Ban giám đốc | `tayho.director@seed.local` | `DIRECTOR` | `PROJECT_MANAGER` |
| PROJECT_MANAGER | `tayho.pm@seed.local` | `MANAGER` | `PROJECT_MANAGER` |
| SITE_MANAGER / Chỉ huy trưởng | `tayho.site@seed.local` | `CHIEF_COMMANDER` | `SITE_COMMANDER` |
| ENGINEER | `tayho.engineer@seed.local` | `ENGINEER` | `SUPERVISOR` |
| ACCOUNTANT | `tayho.accountant@seed.local` | `ACCOUNTANT` | `VIEWER` |
| WAREHOUSE / Thủ kho | `tayho.warehouse@seed.local` | `STAFF` | `SUPERVISOR` |
| DOCUMENT_STAFF | `tayho.document@seed.local` | `STAFF` | `QA_QC` |
| VIEWER | `tayho.viewer@seed.local` | `STAFF` | `VIEWER` |

### Project

- Code: `CT-TAYHO-2026-001`
- Name: `Dự án Nhà Văn Phòng Kết Hợp Căn Hộ Dịch Vụ Tây Hồ`
- Investor: `Công ty Cổ phần Đầu tư Tây Hồ Xanh`
- Location: `Lô đất CX-03, đường Võ Chí Công, phường Xuân La, quận Tây Hồ, Hà Nội`
- Status: `ACTIVE`
- Start date: `2026-06-15`
- End date: `2027-04-30`
- Budget: `98,500,000,000 VND`
- Description includes scale, floors, basement, GPS reference, and `SEED_TAG`

### Project users

- 9 users are linked to the project through `ProjectMember`.
- No seed user is left unassigned.

### Progress baseline

- 1 `FieldProgressTemplate`
- 8 groups:
  - Chuẩn bị công trường
  - Móng
  - Tầng hầm
  - Kết cấu thân
  - Xây trát
  - MEP điện nước
  - Hoàn thiện
  - Nghiệm thu bàn giao
- 20 work items with unit and design quantity.
- FieldProgress does not support unit price/amount fields; report marks this as CHƯA CÓ TRONG CODE.

### Daily progress

- 16 `FieldProgressEntry`
- Dates from `2026-06-24` to `2026-07-04`
- Statuses include `DRAFT`, `SUBMITTED`, `APPROVED`
- Includes completed 100%, in-progress, and not-started work items
- Verification confirms no seeded entry group exceeds design quantity

### Materials

Seeded materials include:

- Thép D10
- Thép D16
- Thép D20
- Xi măng PCB40
- Cát vàng
- Đá 1x2
- Gạch xây
- Ống PVC
- Dây điện
- Sơn nước

Seeded movements and stock:

- 17 material movements
- Import/export quantities with unitPrice
- 10 stock rows

Seeded requests:

- `MR-TAYHO-2026-0001`: `SUBMITTED`, high-priority request for steel/cement
- `MR-TAYHO-2026-0002`: `RECEIVED`, supporting material request
- 1 `FieldMaterialRequest`: `SUBMITTED`, `URGENT`

### Contracts

- Main client contract: `HD-TAYHO-2026-001`
- Steel supplier contract: `HD-TAYHO-2026-STEEL`
- Cement supplier contract: `HD-TAYHO-2026-CEMENT`
- MEP subcontractor contract: `HD-TAYHO-2026-MEP`
- Finishing labor contract: `HD-TAYHO-2026-FINISH`

### Payments

- 4 `PaymentPlan`
- 1 `PaymentRecord`
- 5 `PaymentRequest`:
  - `PAID`
  - `APPROVED`
  - `SUBMITTED`
  - `DRAFT`
  - `REJECTED`

### Approvals

- 5 `ApprovalRequest`
- Status coverage:
  - `PENDING`
  - `APPROVED`
  - `REJECTED`
  - `CANCELLED`
- Types:
  - `MATERIAL`
  - `PAYMENT`
  - `REPORT`
  - `CONTRACT`
  - `CHANGE_ORDER`

### Reports

- 6 daily reports
- 1 weekly report
- Statuses include:
  - `APPROVED`
  - `SUBMITTED`
  - `DRAFT`
  - `REJECTED`
- Reports include weather, temperature, labor, equipment, materials, quality, issues, recommendations, GPS, lines, photos, and attachments.

### Documents/folders

Root folders:

- `01_Bản_vẽ_thi_công`
- `02_Hợp_đồng`
- `03_Biên_bản_nghiệm_thu`
- `04_Hóa_đơn_chứng_từ`
- `05_Hình_ảnh_tiến_độ`
- `06_Báo_cáo_ngày`
- `07_An_toàn_lao_động`

Total folders: 27

Seeded documents:

- Bản vẽ móng PDF
- Bản vẽ móng DWG
- Hợp đồng chính PDF
- Biên bản nghiệm thu móng PDF
- Hóa đơn thép PDF
- Ảnh tiến độ PNG
- Báo cáo ngày DOCX
- Biên bản an toàn lao động PDF

All seeded document files are dummy files under `storage/`, not heavy uploads.

### Notifications/chat

- 4 `Notification` rows linked to users/project
- 4 `ChatMessage` rows with project code and `SEED_TAG`
- Chat remains standalone because schema has no project chat room relation.

## D. Quan hệ dữ liệu

- `User -> ProjectMember -> Project`: all 9 seed users are linked to `CT-TAYHO-2026-001`.
- `Project -> FieldProgressTemplate -> FieldProgressItem -> FieldProgressEntry`: baseline and daily progress entries share the same template/project.
- `Project -> WBSItem`: WBS items provide legacy/fallback work hierarchy.
- `Project -> MaterialItem -> MaterialMovement -> ProjectMaterialStock`: stock is computed from seeded import/export quantities.
- `Project -> MaterialRequest -> MaterialRequestItem`: request items link to field progress work where supported.
- `Project -> FieldMaterialRequest -> FieldMaterialRequestItem`: field material request links to a field progress item/template.
- `Project -> Supplier -> Contract -> PaymentPlan/PaymentRequest -> PaymentRecord`: financial data is linked to contracts and project.
- `Project -> ApprovalRequest`: approvals link to source identifiers for material/payment/report/contract flows.
- `Project -> DocumentFolder -> Document`: documents belong to seeded folders and have dummy storage files.
- `Project -> SiteReport -> SiteReportLine -> FieldProgressItem`: reports contain work lines linked to field progress items.
- `SiteReport -> SiteReportAttachment/SiteReportPhoto`: report attachments/photos point to dummy storage files.
- `Notification -> User/Project`: explicit sample notifications are linked to users and project.
- `ChatMessage -> User`: messages link to sender only; no project relation exists.
- `AuditLog -> User/Project`: seed operation is logged once with `SEED_TAG`.

## E. Các lệnh đã chạy và kết quả thực tế

### `npx prisma validate`

- First sandbox run failed because Prisma tried to access engine binaries through blocked network/proxy:
  - `ECONNREFUSED 127.0.0.1:9`
- Rerun with approval outside sandbox: PASS
- Output summary:
  - `The schema at prisma\schema.prisma is valid`

### `npx prisma generate`

- First sandbox run failed with same Prisma engine network/proxy issue.
- Rerun with approval outside sandbox: PASS
- Output summary:
  - `Generated Prisma Client (v7.8.0) to .\node_modules\@prisma\client`

### `npx tsx scripts/seed-complete-realistic-project.ts`

- First sandbox run failed with `spawn EPERM` from `tsx/esbuild`.
- Rerun with approval outside sandbox: PASS

Seed output summary:

```json
{
  "usersCount": 9,
  "projectMembers": 9,
  "folders": 27,
  "documents": 8,
  "wbsItems": 8,
  "fieldItems": 28,
  "fieldEntries": 16,
  "materialItems": 10,
  "materialMovements": 17,
  "materialRequests": 2,
  "fieldMaterialRequests": 1,
  "contracts": 5,
  "paymentPlans": 4,
  "paymentRecords": 1,
  "paymentRequests": 5,
  "approvals": 5,
  "reports": 7,
  "reportAttachments": 6,
  "notifications": 4,
  "chatMessages": 4,
  "dashboardReadable": {
    "totalProjects": 1,
    "activeProjects": 1,
    "entriesOnReferenceDate": 3,
    "pendingApprovals": 2,
    "pendingPaymentRequests": 2,
    "recentReports": 7,
    "documentCount": 8,
    "lowStockItems": 0
  }
}
```

Verification result:

- `Post-seed verification: PASS`

### `npx tsc --noEmit`

- PASS
- Exit code: 0

### `npm run build`

- PASS
- Output summary:
  - `Compiled successfully`
  - `Finished TypeScript`
  - `Generating static pages ... 8/8`
- Warning:
  - Turbopack reported an NFT tracing warning involving `next.config.ts`, `src/lib/storage/local-storage-provider.ts`, and `src/app/api/reports/attachments/[attachmentId]/route.ts`.
  - Build still completed successfully.

### Commands intentionally not run

- `npm run dev`: not run, per explicit requirement.
- `git commit` / `git push`: not run, per explicit requirement.

## F. Rủi ro còn lại

- Chat has only `ChatMessage` with sender/content; no project relation, room, participant, read state, or UI module was found. Seeded chat messages are standalone.
- Project lacks separate columns for province/district/GPS/scale/floors/basement. These details are stored in description and reports only.
- Contract appendices are not modeled separately.
- Document permission is code-driven by role/folder, not stored as rows in a permission table.
- Field progress has no unit price/amount field; the seed cannot create financial value per progress item.
- Material request status handling has some UI/action inconsistency: schema includes `PROCESSING/ISSUED`, while one action validator does not accept all schema statuses.
- Report file uploads are available through API, but seeded report/document files are dummy local files, not real heavy uploads.
- `SystemSetting` existed before seed, so script did not overwrite it. Settings UI should still be manually checked.
- Build warning from Turbopack NFT tracing should be reviewed separately if deployment packaging becomes strict.
- Dashboard progress percent appears to be computed primarily from planned project dates in current dashboard logic, not from field progress rollup.

## G. Hướng dẫn test thủ công

1. Đăng nhập bằng `tayho.director@seed.local`.
2. Mở dashboard và kiểm tra:
   - tổng công trình
   - công trình đang hoạt động
   - report/document mới
   - approval/payment pending
3. Chọn công trình `CT-TAYHO-2026-001`.
4. Kiểm tra thông tin công trình Tây Hồ:
   - tên
   - chủ đầu tư
   - địa chỉ
   - ngày khởi công/kết thúc
   - ngân sách
   - mô tả quy mô/GPS
5. Mở Field Progress:
   - kiểm tra 8 nhóm khối lượng gốc
   - kiểm tra work item có unit/design quantity
6. Mở Daily Progress:
   - kiểm tra ngày `2026-07-04`
   - kiểm tra entry `DRAFT/SUBMITTED/APPROVED`
   - kiểm tra không có khối lượng vượt thiết kế
7. Mở Summary tiến độ:
   - kiểm tra lũy kế
   - tỷ lệ hoàn thành
   - khối lượng còn lại
8. Mở Materials:
   - kiểm tra 10 vật tư
   - nhập/xuất/tồn
   - material requests
9. Mở Contracts:
   - kiểm tra 5 hợp đồng
   - status `ACTIVE/DRAFT`
10. Mở Accounting:
    - kiểm tra payment requests đủ trạng thái
    - kiểm tra plan/record nếu UI hiển thị
11. Mở Approvals:
    - kiểm tra `PENDING/APPROVED/REJECTED/CANCELLED`
    - thử duyệt bằng user có quyền, không tự duyệt request của chính mình nếu không phải ADMIN
12. Mở Documents:
    - kiểm tra cây thư mục chuẩn
    - mở metadata/download dummy files
    - kiểm tra status document
13. Mở Reports:
    - kiểm tra 6 báo cáo ngày và 1 báo cáo tuần
    - kiểm tra ảnh/file/GPS/weather/labor/equipment
14. Đăng nhập các role khác:
    - `tayho.pm@seed.local`
    - `tayho.site@seed.local`
    - `tayho.engineer@seed.local`
    - `tayho.accountant@seed.local`
    - `tayho.warehouse@seed.local`
    - `tayho.viewer@seed.local`
15. Kiểm tra phân quyền:
    - ai thấy dashboard/module nào
    - ai tạo/sửa/xóa được
    - ai duyệt được
    - ai chỉ xem được

