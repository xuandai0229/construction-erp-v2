# HANOI_FULL_PROJECT_RESET_AND_SEED_REPORT

Ngày thực hiện: 2026-06-27

## 1. Tóm tắt nhiệm vụ

Đã reset toàn bộ dữ liệu nghiệp vụ cũ của hệ thống `construction-erp-v2`, giữ lại tài khoản đăng nhập và cấu hình hệ thống, sau đó seed một công trình mới tại Hà Nội với dữ liệu đủ cho các màn chính: dashboard, projects, documents, field progress, reports, materials, contracts, accounting/payments, approvals, users/project members.

Không commit, không push, không chạy `npm run dev`.

## 2. Dữ liệu cũ đã xóa

Script: `scripts/reset-old-project-data.ts`

Các project cũ đã xóa:

| Code | Tên | Ghi chú |
|---|---|---|
| TH-125 | Trường học Chu Văn An | soft-deleted cũ nhưng còn record |
| QA-TUHIEP-5F-001 | Nha Van Phong Dieu Hanh 5 Tang - Khu Cong Nghiep Tu Hiep | active cũ |
| Ct-124 | Công trình test | soft-deleted cũ |
| TEST-MATERIALS-RBAC | Công trình test phân quyền vật tư | soft-deleted cũ |
| UAT-PAY-CT2-HANOI | UAT - CT2 Hà Nội - Khối văn phòng | active UAT cũ |
| UAT-PAY-TUHIEP-5F | UAT - Nhà văn phòng Diên Hồng 5F | active UAT cũ |
| UAT-APR-CT2 | UAT Approval Project UAT-APR-CT2 | soft-deleted cũ |
| UAT-APR-TUHIEP | UAT Approval Project UAT-APR-TUHIEP | soft-deleted cũ |

Before/After chính:

| Model | Before | After |
|---|---:|---:|
| Project | 8 | 0 |
| ProjectMember | 23 | 0 |
| Supplier | 39 | 0 |
| Contract | 18 | 0 |
| DocumentFolder | 26 | 0 |
| Document | 19 | 0 |
| SiteReport | 20 | 0 |
| SiteReportAttachment | 5 | 0 |
| SiteReportLine | 77 | 0 |
| MaterialRequest | 9 | 0 |
| MaterialRequestItem | 15 | 0 |
| MaterialItem | 7 | 0 |
| MaterialMovement | 7 | 0 |
| ProjectMaterialStock | 5 | 0 |
| PaymentRequest | 17 | 0 |
| ApprovalRequest | 15 | 0 |
| FieldProgressTemplate | 3 | 0 |
| FieldProgressItem | 62 | 0 |
| FieldProgressEntry | 49 | 0 |
| AuditLog | 200 | 103 |

File vật lý: 24 candidate, xóa được 19 file nằm an toàn trong `storage`, không có path bị skip.

## 3. Dữ liệu giữ lại

| Nhóm | Số lượng sau reset | Lý do |
|---|---:|---|
| User | 34 | Giữ tài khoản admin/core để không phá đăng nhập |
| SystemSetting | 1 | Cấu hình hệ thống, không phải dữ liệu công trình cũ |
| AuditLog không thuộc business/project | 103 | Giữ log không xác định là dữ liệu nghiệp vụ công trình |

## 4. Kiểm tra và fix file/folder

Đã rà các phần chính:

| Khu vực | Kết quả |
|---|---|
| Documents overview/page theo project | Scope bằng `getAccessibleProjectIds` và `requireProjectAccessOrRedirect` |
| Upload API | Check session, project access, folder thuộc cùng `projectId`, folder permission |
| Download API | Check session, document active, project chưa xóa, `canAccessProject` |
| Folder create/rename/delete | Check project access; parent folder phải cùng project; delete folder đang chặn an toàn nếu có file/folder con |
| Document delete/rename/metadata/status | Check project access, folder context, status immutable |
| Storage | Không lưu binary vào DB; chỉ lưu metadata/path và file vật lý trong `storage` |

Lỗi đã sửa:

| Mức | File | Nguyên nhân | Sửa |
|---|---|---|---|
| HIGH | `src/components/documents/document-workspace.tsx` | UI hiển thị “Tối đa 50/80MB” dù backend không validate dung lượng nhỏ | Bỏ thông tin giới hạn MB sai, chỉ hiển thị đuôi file hợp lệ |
| HIGH | `src/lib/storage/local-storage-provider.ts` | Upload mới lưu `storagePath` dạng absolute path, kém portable và trái hướng metadata/path | Lưu relative path dưới `storage` |
| MEDIUM | `src/lib/settings/settings-validation.ts` | Default allowed extensions thiếu `.doc`, `.xls`, `.dxf`, `.jpeg`, `.webp`, `.xml` dù folder rules cho phép | Mở rộng whitelist định dạng công trình an toàn |
| MEDIUM | `src/lib/documents/permissions.ts` | Permission folder phụ thuộc tên folder tiếng Việt cũ, không nhận cây folder Hà Nội dạng ASCII | Thêm keyword matching không dấu cho accounting/engineering folders |

Giới hạn còn lại: hạ tầng Next/server/proxy/storage vẫn có thể có giới hạn upload riêng ngoài app code. Backend app hiện không tự chặn 10MB/50MB.

## 5. Danh sách màn hình đã rà và dữ liệu seed

| Màn hình | Nguồn dữ liệu | Model liên quan | Dữ liệu seed | Trạng thái |
|---|---|---|---|---|
| `/dashboard` | page query trực tiếp | Project, Document, FieldProgressEntry, Contract | 1 project active, docs, entries, contracts | Đủ |
| `/projects` | page query trực tiếp | Project, ProjectMember | Project Hà Nội + members | Đủ |
| `/projects/[id]` | page query trực tiếp | Project, counts | Counts field/doc/report/member | Đủ |
| `/documents` | page query trực tiếp | Project, DocumentFolder, Document | 35 folders, 12 docs | Đủ |
| `/documents/[projectId]` | page + actions/API | DocumentFolder, Document | Cây folder nhiều cấp + files | Đủ |
| `/projects/[id]/field-progress` | page query trực tiếp | FieldProgressTemplate/Item/Entry | 1 template, 43 items, entries | Đủ |
| `/projects/[id]/field-progress/daily` | page/actions | FieldProgressItem/Entry, FieldMaterialRequest | Entries nhiều ngày/status | Đủ |
| `/projects/[id]/field-progress/summary` | page groupBy | FieldProgressEntry | Dữ liệu Jan-Jun, không vượt thiết kế | Đủ |
| `/reports` | actions/page | SiteReport, SiteReportLine, attachments | 20 reports, 5 attachments | Đủ |
| `/materials` | actions/page | MaterialItem, Movement, Stock, Request | 11 materials, 22 movements, 2 requests | Đủ |
| `/contracts` | actions/page | Contract, Supplier, Project | 5 contracts, suppliers | Đủ |
| `/accounting` | actions/page | PaymentRequest, PaymentPlan/Record, Contract | 6 requests, 4 plans, records | Đủ |
| `/approvals` | actions/page | ApprovalRequest | 6 approvals đủ trạng thái | Đủ |
| `/users` | actions/page | User, ProjectMember | Reuse admin + seed hanoi users/members | Đủ |
| Chat | Prisma model only | ChatMessage | 30 messages tagged `HN-TH-2026-001` | Có dữ liệu, schema chưa có room/projectId |

## 6. Dữ liệu công trình Hà Nội đã tạo

Script: `scripts/seed-hanoi-full-project.ts`

Project:

| Trường | Giá trị |
|---|---|
| Code | `HN-TH-2026-001` |
| Name | `Cong trinh Nha van phong ket hop can ho dich vu Tay Ho` |
| Địa chỉ | Số 88 đường Võ Chí Công, phường Xuân La, quận Tây Hồ, Hà Nội |
| Chủ đầu tư | Công ty Cổ phần Đầu tư Tây Hồ Xanh |
| Tổng thầu | Công ty TNHH Xây dựng và Cơ điện Minh An |
| Timeline | 2026-01-15 đến 2026-12-30 |
| Giá trị | 86.500.000.000 VND |
| Giai đoạn | Thi công thân tầng 3-4, bắt đầu MEP âm sàn |

Counts sau seed:

| Nhóm | Số lượng |
|---|---:|
| Project | 1 |
| Project members | 10 |
| Document folders | 35 |
| Documents | 12 |
| Field progress items | 43 |
| Field progress entries | 41 |
| Reports | 20 |
| Report attachments | 5 |
| Material items | 11 |
| Material movements | 22 |
| Material requests | 2 |
| Contracts | 5 |
| Payment requests | 6 |
| Payment plans | 4 |
| Approval requests | 6 |
| Chat messages | 30 |

Tài khoản seed thêm:

| Email | Vai trò |
|---|---|
| `hanoi.director@construction.local` | DIRECTOR |
| `hanoi.pm@construction.local` | MANAGER / Project Manager |
| `hanoi.commander@construction.local` | CHIEF_COMMANDER |
| `hanoi.engineer@construction.local` | ENGINEER |
| `hanoi.qs@construction.local` | ENGINEER / QS |
| `hanoi.accountant@construction.local` | ACCOUNTANT |
| `hanoi.storekeeper@construction.local` | STAFF / thủ kho |
| `hanoi.safety@construction.local` | STAFF / HSE |
| `hanoi.viewer@construction.local` | STAFF / viewer |

Password test cho các tài khoản `hanoi.*`: `HanoiSeed@2026!`

## 7. Lệnh đã chạy và kết quả

| Lệnh | Kết quả |
|---|---|
| `git status --short` | Ban đầu sạch; cuối có file sửa/script mới, không commit |
| `git diff --stat` | Xác nhận phạm vi thay đổi |
| `npx prisma validate` | PASS trước reset, sau reset, và cuối |
| `npx tsx --env-file=.env scripts/reset-old-project-data.ts` | PASS, xóa dữ liệu cũ |
| Query verify sau reset | PASS, business tables chính = 0 |
| `npx tsx --env-file=.env scripts/seed-hanoi-full-project.ts` | PASS, seed project Hà Nội |
| `npx tsx --env-file=.env scripts/qa-hanoi-project-data-check.ts` | PASS 21/21 |
| `npx prisma generate` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| `npx tsx scripts/qa-document-upload-settings.ts` | PASS |

Build warning còn lại:

`next build` pass nhưng Turbopack báo 1 warning `Encountered unexpected file in NFT list` trong import trace `next.config.ts -> src/app/api/reports/attachments/[attachmentId]/route.ts`. Warning này không liên quan trực tiếp đến reset/seed/document upload vừa sửa, nhưng nên xử lý ở một task riêng nếu muốn build sạch warning.

## 8. Rủi ro còn lại

- Chưa chạy E2E/browser thủ công vì yêu cầu không chạy `npm run dev`; vì vậy không khẳng định UI hoàn hảo 100%.
- `ChatMessage` schema hiện không có `projectId`/room, nên chat được seed bằng nội dung có tag `HN-TH-2026-001` chứ chưa scope quan hệ DB theo project.
- Một số label cũ trong codebase đang có mojibake tiếng Việt; build pass, nhưng nên chuẩn hóa encoding/UI text ở task riêng.

## 9. Hướng dẫn test tay

Đăng nhập bằng admin hiện có hoặc tài khoản seed:

- `hanoi.pm@construction.local` / `HanoiSeed@2026!`
- `hanoi.commander@construction.local` / `HanoiSeed@2026!`
- `hanoi.engineer@construction.local` / `HanoiSeed@2026!`
- `hanoi.accountant@construction.local` / `HanoiSeed@2026!`

Các màn nên mở trước:

1. `/dashboard`: kiểm tra project Hà Nội, hoạt động gần đây, docs/contracts/entries.
2. `/projects`: chỉ thấy `HN-TH-2026-001`.
3. `/projects/[id]`: kiểm tra counts và link field progress.
4. `/documents` và `/documents/[projectId]`: mở cây folder nhiều cấp, xem/download file mẫu.
5. `/projects/[id]/field-progress`, `/daily`, `/summary`: kiểm tra bảng gốc, nhập ngày, tổng hợp.
6. `/reports`: kiểm tra 20 báo cáo và attachment.
7. `/materials`: kiểm tra tồn kho, nhập/xuất, đề xuất vật tư.
8. `/contracts`, `/accounting`, `/approvals`: kiểm tra hợp đồng, hồ sơ thanh toán, phê duyệt.

