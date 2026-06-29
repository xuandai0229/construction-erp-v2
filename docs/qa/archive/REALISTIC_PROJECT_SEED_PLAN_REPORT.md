# REALISTIC PROJECT SEED PLAN REPORT

## 1. Mục tiêu

Bộ dữ liệu mẫu này dùng để kiểm thử end-to-end một công trình xây dựng thật giả lập, bao phủ các màn hình và workflow chính:

- Quản lý công trình, chi tiết công trình, dashboard.
- Bảng khối lượng gốc, nhập khối lượng theo ngày, tổng hợp khối lượng.
- Báo cáo công trường ngày/tuần, workflow nháp/gửi/duyệt/từ chối, file đính kèm.
- Tài liệu, folder, upload/download/preview, trạng thái tài liệu.
- Người dùng, phân quyền hệ thống, phân quyền theo công trình và direct URL guard.
- Đề xuất vật tư, cấp/nhận vật tư, trạng thái phiếu.
- Dữ liệu hỗ trợ dashboard từ bảng thật.

Yêu cầu hiện tại chỉ là lập kế hoạch. Chưa tạo script seed, chưa nhập dữ liệu vào DB, chưa reset DB, chưa xóa dữ liệu thật.

## 2. Hệ thống hiện có những model nào liên quan

Đã chạy kiểm tra bắt buộc:

| Lệnh | Kết quả |
| --- | --- |
| `git status --short` | Có untracked `.gemini-git-files.txt`; chưa thấy thay đổi tracked trước khi tạo báo cáo. |
| `git ls-files` | Đã liệt kê toàn bộ tracked files. |
| `npx prisma validate` | Lần đầu trong sandbox lỗi tải engine qua `127.0.0.1:9`; chạy lại ngoài sandbox thành công. |
| `npx prisma generate` | Lần đầu trong sandbox lỗi tải engine qua `127.0.0.1:9`; chạy lại ngoài sandbox thành công, Prisma Client v7.8.0 generated. |

Đã quét:

- `prisma/schema.prisma`.
- Toàn bộ danh sách file trong `src/app`, `src/components`, `src/lib`, `scripts`.
- `src/actions` không tồn tại.
- Action ngoài route dashboard nằm tại `src/app/actions/material-request.ts`.
- Đọc sâu các file route/action/service/policy/component liên quan đến `projects`, `field-progress`, `reports`, `documents`, `users`, `auth`, `rbac`, `materials`, `dashboard`, `material-requests`, `scripts`.
- Không chạy `npm run dev`.

| Model/schema | Action/API/route chính | UI nhập/xem | Ghi chú seed |
| --- | --- | --- | --- |
| `Project` | `src/app/(dashboard)/projects/actions.ts` | `/projects`, `/projects/new`, `/projects/[id]`, `/projects/[id]/edit` | Có form tạo/sửa. Tạo project qua action tự tạo 8 folder mặc định. Seed được nếu idempotent theo `code`. |
| `ProjectMember` | `src/app/(dashboard)/users/actions.ts`, `src/lib/rbac.ts` | `/users`, project guards | Dùng để giới hạn user không high-level vào project. Seed rất cần để test RBAC. |
| `User` | `src/app/(dashboard)/users/actions.ts`, `src/app/api/auth/*`, `src/lib/auth.ts` | `/users`, `/login` | Seed user test được, nhưng không đụng user thật. Dùng email/test domain riêng. |
| `FieldProgressTemplate` | `src/app/(dashboard)/projects/[id]/field-progress/actions.ts` | `/projects/[id]/field-progress` | `getOrCreateTemplate` tự tạo template nếu chưa có. Seed nên tạo một template chính. |
| `FieldProgressItem` | `createItem`, `updateItem`, `batchUpdateItems`, `deleteItem` | Master table và quick add trong daily screen | Đây là bảng khối lượng gốc thật của UI hiện tại. Nên seed đầy đủ GROUP/WORK. |
| `FieldProgressEntry` | `batchSaveDailyEntries` | `/projects/[id]/field-progress/daily`, `/summary` | Schema có `DRAFT/SUBMITTED/APPROVED`, nhưng UI daily hiện lưu thẳng `APPROVED`. Muốn test đủ trạng thái cần seed có kiểm soát. |
| `SiteReport` | `src/app/(dashboard)/reports/actions.ts`, report services | `/reports`, `/print/reports/[reportId]` | Có tạo/sửa/gửi/duyệt/từ chối/xóa mềm. Nên seed báo cáo đa trạng thái. |
| `SiteReportLine` | `createSiteReport`, weekly aggregation | Report dialog, table, detail drawer | Dùng cho công việc trong báo cáo; có thể link `fieldProgressItemId`. |
| `SiteReportAttachment` | `/api/reports/[reportId]/attachments`, `/api/reports/attachments/[attachmentId]` | Report dialog/detail/gallery | Upload thật kiểm tra magic bytes và giới hạn file. Nên seed metadata + dummy nhỏ hoặc nhập qua UI để test upload thật. |
| `SiteReportPhoto` | Schema legacy | Không thấy UI chính đang dùng model này | Không nên seed trừ khi test legacy. UI mới dùng `SiteReportAttachment(kind=PHOTO)`. |
| `DocumentFolder` | `src/app/(dashboard)/documents/actions.ts` | `/documents`, `/documents/[projectId]` | Project action tạo 8 folder mặc định. Có thể seed thêm folder 09/10 nếu cần. |
| `Document` | `/api/documents/upload`, `/api/documents/[documentId]/download`, document actions | Document workspace/viewer | Upload thật có validation, storage provider, status workflow. Nên seed rất cẩn thận. |
| `MaterialRequest` | `src/app/actions/material-request.ts` | `/projects/[id]/material-requests` | UI hiện có đầy đủ create/edit/detail/status. Nên seed phiếu vật tư test. |
| `MaterialRequestItem` | `createMaterialRequest`, `updateMaterialRequestItems` | Material request form/detail | Nên seed theo công việc field progress. |
| `FieldMaterialRequest` | Schema | Daily page chỉ đọc `fieldMaterialRequest`, không thấy form riêng | Chỉ seed nếu cần test tích hợp vật tư tại màn daily; ưu tiên `MaterialRequest` vì UI rõ hơn. |
| `FieldMaterialRequestItem` | Schema | Không thấy UI CRUD riêng | Không seed tự động ở phase đầu. |
| `MaterialItem`, `MaterialMovement` | Schema | `/materials` hiện EmptyState, chưa có action CRUD | Không nên seed nhiều vì UI chưa dùng. Có thể seed nhỏ nếu dashboard/kho tương lai cần. |
| `WBSItem` | Schema, fallback trong reports `getProjectWorkItems` | Không thấy UI WBS riêng ngoài field progress | Không seed mặc định để tránh song song hai hệ WBS. Chỉ seed nếu muốn test fallback khi chưa có FieldProgressItem. |
| `Supplier`, `Contract` | Schema | `/suppliers`, `/contracts` hiện EmptyState | Không có UI CRUD. Có thể seed 1 hợp đồng để dashboard recent activity, nhưng không nên seed nhiều. |
| `PaymentPlan`, `PaymentRecord` | Schema | `/accounting` hiện EmptyState | Không có UI CRUD. Không seed tự động giai đoạn này. |
| `ApprovalRequest` | Schema | `/approvals` hiện EmptyState | Không thấy workflow thật dùng bảng này. Không seed tự động. |
| `AuditLog` | `src/lib/audit.ts`, nhiều actions tạo log | `/audit` hiện EmptyState, report history API đọc audit log | Nên seed log đi kèm dữ liệu tạo bằng script để test history, nhưng không giả quá nhiều. |
| `ChatMessage` | Schema | Không thấy UI | Không seed. |

## 3. Dữ liệu nên tạo

| Nhóm dữ liệu | Model liên quan | Có UI nhập không | Có action/API không | Nên seed không | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| Công trình | `Project` | Có | Có | Có | Seed project chính theo mã riêng, không reset. |
| Thành viên công trình | `ProjectMember` | Có qua `/users` | Có | Có | Bắt buộc để test RBAC theo project. |
| Người dùng và vai trò | `User` | Có | Có | Có, nhưng hạn chế | Tạo user QA test với email domain riêng, không sửa user thật. |
| Folder tài liệu mặc định | `DocumentFolder` | Có | Có | Có | 8 folder mặc định tự tạo khi tạo project bằng action; script seed nên đảm bảo đủ 10 folder theo plan. |
| File/tài liệu mẫu | `Document` | Có upload | Có API upload/download | Seed metadata/dummy nhỏ hoặc nhập UI | File thật nên test qua UI. Metadata seed phải có physical file tồn tại. |
| Bảng khối lượng gốc | `FieldProgressTemplate`, `FieldProgressItem` | Có | Có | Có | Đây là dữ liệu nền cho daily/summary/reports/material. |
| Hạng mục cha/con | `FieldProgressItem` | Có | Có | Có | Dùng `itemType=GROUP/WORK`, `parentId`, `sortOrder`, `level`. |
| Công việc thi công | `FieldProgressItem` | Có | Có | Có | WORK items có code, crew, unit, designQuantity, note. |
| Mũi thi công | `FieldProgressItem.constructionCrew` | Có | Có | Có | Nên phân bổ nhiều mũi: Mũi móng A, Mũi cốt thép, Mũi MEP... |
| Đơn vị tính | `FieldProgressItem.unit`, line/item unit | Có | Có | Có | Không có model riêng, lưu text. |
| Khối lượng thiết kế | `FieldProgressItem.designQuantity` | Có | Có | Có | Dùng để test guard và tổng hợp. |
| Nhật ký khối lượng theo ngày | `FieldProgressEntry` | Có | Có | Có | Seed đa trạng thái vì UI daily hiện chỉ lưu APPROVED. |
| Trạng thái DRAFT/SUBMITTED/APPROVED | `FieldProgressEntry.status`, `SiteReport.status` | Một phần | Có | Có | Cần cho calendar, summary filter, report workflow. |
| Báo cáo ngày | `SiteReport`, `SiteReportLine` | Có | Có | Có | Nên seed nhiều trạng thái và issues. |
| Báo cáo tuần | `SiteReport(type=WEEKLY)` | Có | Có weekly aggregation | Có | Nên seed 1 DRAFT/SUBMITTED, 1 APPROVED sau khi có daily approved. |
| Ảnh/file đính kèm báo cáo | `SiteReportAttachment` | Có upload | Có API | Seed ít, test thật qua UI | Dummy file nhỏ, đúng magic bytes, hoặc để UI upload. |
| Vật tư | `MaterialRequest`, `MaterialRequestItem`, optional `MaterialItem` | Có request UI, materials page chưa có CRUD | Có | Có phiếu request | Seed phiếu vật tư theo công việc; không seed tồn kho lớn. |
| Chi phí/ngân sách | `Project.budget`, `Contract`, `PaymentPlan`, `PaymentRecord` | Project budget không có form; contracts/accounting EmptyState | Schema có | Seed hạn chế hoặc không | Chỉ budget project và 1 contract optional nếu cần dashboard. |
| Audit log | `AuditLog` | Report history API có dùng | Có helper | Có, đi kèm | Log tạo/gửi/duyệt cho reports, project, docs. |
| Dashboard | Lấy từ bảng thật | Không nhập riêng | Query trực tiếp | Không có bảng riêng | Dashboard sẽ tự phản ánh Project, Document, Contract, FieldProgressEntry. |

## 4. Dữ liệu KHÔNG nên tạo tự động

- Không tạo hoặc sửa dữ liệu thật không có prefix QA.
- Không chạy lại các script reset hiện có như `safe-baseline-reset.ts`, `reset-and-seed-single-real-construction-project.ts`, `reset-and-seed-one-real-project-uat.ts` cho yêu cầu này.
- Không tạo dữ liệu `PaymentPlan`/`PaymentRecord` số lượng lớn vì `/accounting` hiện chưa có UI CRUD.
- Không tạo `ApprovalRequest` giả nếu chưa có workflow UI dùng bảng này.
- Không tạo `ChatMessage`.
- Không tạo `WBSItem` mặc định khi đã seed `FieldProgressItem`, để tránh nhầm giữa WBS legacy/fallback và field progress chính.
- Không seed file đính kèm lớn hoặc file thiếu physical path. `Document` và `SiteReportAttachment` phải có file thật trong `storage` nếu muốn preview/download ổn định.
- Không tạo user test trùng email/username thật. Nên dùng domain nội bộ như `@qa.local` hoặc `@example.test`.

## 5. Công trình mẫu đề xuất

| Trường | Giá trị đề xuất |
| --- | --- |
| Tên công trình | Nhà Văn Phòng Điều Hành 5 Tầng - Khu Công Nghiệp Tứ Hiệp |
| Mã công trình | `QA-TUHIEP-5F-001` |
| Chủ đầu tư | Công ty TNHH Phát Triển Hạ Tầng Tứ Hiệp |
| Địa điểm | Lô A3-2, Khu Công Nghiệp Tứ Hiệp, huyện Thanh Trì, Hà Nội |
| Ngày khởi công | 2026-07-01 |
| Ngày dự kiến hoàn thành | 2027-03-31 |
| Trạng thái | `ACTIVE` |
| Quy mô | Nhà văn phòng điều hành 5 tầng, 1 tum kỹ thuật, móng cọc bê tông cốt thép, kết cấu khung BTCT toàn khối |
| Diện tích sàn | 4.850 m2 |
| Số tầng | 5 tầng nổi + 1 tum kỹ thuật |
| Giá trị hợp đồng/budget | 68.500.000.000 VND nếu seed vào `Project.budget` |
| Người phụ trách | Trần Minh Khôi - Giám đốc dự án |
| Chỉ huy trưởng | Nguyễn Hoàng Nam |
| Kỹ sư hiện trường | Lê Quang Huy, Phạm Gia Linh |
| Kế toán | Vũ Thị Mai Anh |
| Ban điều hành | Hoàng Đức Dũng, Trần Minh Khôi |
| Ghi chú | Dữ liệu QA giả lập, không phải hồ sơ pháp lý hoặc thông tin cá nhân thật. |

Vì schema `Project` chưa có trường riêng cho diện tích, số tầng, chỉ huy trưởng, kỹ sư, kế toán, các thông tin này nên lưu trong `Project.description` và trong `ProjectMember.note`.

## 6. Bảng khối lượng gốc đề xuất

Template: `Bảng khối lượng thi công - QA Tứ Hiệp 5F`.

| Code | Loại | Nhóm cha | Tên công việc/hạng mục | Mũi thi công | Đơn vị | KL thiết kế | Ghi chú thực tế |
| --- | --- | --- | --- | --- | --- | ---: | --- |
| G-01 | GROUP |  | Công tác chuẩn bị |  |  |  | Giai đoạn setup trước thi công móng |
| PRE-001 | WORK | G-01 | Dọn dẹp mặt bằng, bóc lớp hữu cơ | Mũi chuẩn bị | m2 | 1850 | Bao gồm thu gom phế thải, san gạt sơ bộ |
| PRE-002 | WORK | G-01 | Định vị tim trục, cao độ chuẩn | Tổ trắc đạc | điểm | 72 | Có nghiệm thu mốc gửi chủ đầu tư |
| PRE-003 | WORK | G-01 | Lán trại, kho vật tư, điện nước tạm | Mũi chuẩn bị | m2 | 120 | Lắp container văn phòng và kho nhỏ |
| G-02 | GROUP |  | Phần móng |  |  |  | Móng cọc và đài giằng BTCT |
| FND-001 | WORK | G-02 | Đào đất hố móng, vận chuyển nội bộ | Mũi móng A | m3 | 980 | Đào theo từng phân khu A/B |
| FND-002 | WORK | G-02 | Đổ bê tông lót móng M100 | Mũi bê tông | m3 | 82 | Dày 100 mm dưới đài và giằng móng |
| FND-003 | WORK | G-02 | Gia công lắp dựng cốt thép móng | Tổ thép móng | kg | 42000 | Thép CB400, nghiệm thu trước khi đổ |
| FND-004 | WORK | G-02 | Lắp dựng cốp pha móng | Tổ cốp pha | m2 | 1350 | Cốp pha thép kết hợp ván phủ phim |
| FND-005 | WORK | G-02 | Đổ bê tông móng M300 | Mũi bê tông | m3 | 430 | Chia 3 đợt đổ, có lấy mẫu nén |
| G-03 | GROUP |  | Phần thân tầng 1 đến tầng 5 |  |  |  | Khung BTCT toàn khối |
| STR-101 | WORK | G-03 | Cốt thép cột tầng 1 | Tổ thép thân | kg | 12500 | Cột trục A-D/1-6 |
| STR-102 | WORK | G-03 | Cốp pha cột tầng 1 | Tổ cốp pha thân | m2 | 520 | Cần kiểm tra tim cột sau ghép |
| STR-103 | WORK | G-03 | Bê tông cột tầng 1 | Mũi bê tông | m3 | 86 | Đổ bằng bơm cần |
| STR-104 | WORK | G-03 | Cốt thép dầm sàn tầng 1 | Tổ thép thân | kg | 23500 | Bao gồm dầm chính/phụ và thép sàn |
| STR-105 | WORK | G-03 | Cốp pha dầm sàn tầng 1 | Tổ cốp pha thân | m2 | 1460 | Có chống tăng và kiểm tra cao độ |
| STR-106 | WORK | G-03 | Bê tông dầm sàn tầng 1 | Mũi bê tông | m3 | 285 | Đổ liên tục trong 1 ca dài |
| STR-201 | WORK | G-03 | Cột, dầm, sàn tầng 2 | Mũi thân tầng 2 | m2 sàn | 970 | Tổng hợp theo tầng cho test dài hạn |
| STR-301 | WORK | G-03 | Cột, dầm, sàn tầng 3 | Mũi thân tầng 3 | m2 sàn | 970 | Chưa triển khai trong 14 ngày đầu |
| STR-401 | WORK | G-03 | Cột, dầm, sàn tầng 4 | Mũi thân tầng 4 | m2 sàn | 970 | Chưa triển khai trong 14 ngày đầu |
| STR-501 | WORK | G-03 | Cột, dầm, sàn tầng 5 | Mũi thân tầng 5 | m2 sàn | 970 | Chưa triển khai trong 14 ngày đầu |
| STR-STAIR | WORK | G-03 | Cầu thang bộ tầng 1 đến tầng 5 | Tổ hoàn thiện thô | m3 | 155 | Thi công xen kẽ theo tầng |
| STR-WALL | WORK | G-03 | Xây tường bao và tường ngăn | Tổ xây | m2 | 3620 | Gạch AAC/tường bao gạch đặc theo thiết kế |
| G-04 | GROUP |  | Hoàn thiện |  |  |  | Chưa thi công chính trong 14 ngày đầu |
| FIN-001 | WORK | G-04 | Trát tường trong/ngoài | Tổ trát | m2 | 7200 | Tính theo diện tích tường |
| FIN-002 | WORK | G-04 | Lát nền gạch porcelain | Tổ lát nền | m2 | 4300 | Khu văn phòng, hành lang, sảnh |
| FIN-003 | WORK | G-04 | Sơn bả hoàn thiện | Tổ sơn | m2 | 8500 | Bả 2 lớp, sơn lót và phủ |
| FIN-004 | WORK | G-04 | Lắp cửa nhôm kính, cửa thép chống cháy | Tổ cửa | bộ | 138 | Bao gồm cửa đi và cửa sổ |
| FIN-005 | WORK | G-04 | Trần thạch cao | Tổ trần | m2 | 3900 | Khung xương chìm, tấm chống ẩm khu vệ sinh |
| G-05 | GROUP |  | MEP |  |  |  | Thi công âm chờ song song phần thân |
| MEP-001 | WORK | G-05 | Điện âm tường, ống chờ sàn | Tổ điện | m | 9800 | Ống PVC, hộp nối, tủ tầng |
| MEP-002 | WORK | G-05 | Cấp thoát nước âm sàn/tường | Tổ nước | m | 2600 | PPR/uPVC theo shopdrawing |
| MEP-003 | WORK | G-05 | Điều hòa thông gió | Tổ HVAC | m | 1800 | Ống gió, ống đồng, giá treo |
| MEP-004 | WORK | G-05 | PCCC cơ bản | Tổ PCCC | m | 1450 | Ống sprinkler/hộp chữa cháy hành lang |

## 7. Dữ liệu nhập theo ngày đề xuất

Khoảng dữ liệu đề xuất: 2026-07-01 đến 2026-07-14. Có ngày trống, ngày DRAFT, SUBMITTED, APPROVED. Không có dòng nào vượt khối lượng thiết kế. Một số dòng sát giới hạn 90-100% để test guard.

| Ngày | Trạng thái ngày | Công việc | KL ngày | Lũy kế sau ngày | Tình huống test |
| --- | --- | --- | ---: | ---: | --- |
| 2026-07-01 | APPROVED | PRE-001 | 500 | 500/1850 | Bắt đầu dọn mặt bằng |
| 2026-07-01 | APPROVED | PRE-002 | 24 | 24/72 | Nhiều mũi trong ngày |
| 2026-07-01 | APPROVED | PRE-003 | 35 | 35/120 | Khối lượng 20-50% |
| 2026-07-02 | APPROVED | PRE-001 | 650 | 1150/1850 | Lũy kế nhiều ngày |
| 2026-07-02 | APPROVED | PRE-002 | 24 | 48/72 | 66.67% |
| 2026-07-02 | APPROVED | PRE-003 | 45 | 80/120 | 66.67% |
| 2026-07-03 | SUBMITTED | PRE-001 | 700 | 1850/1850 | 100%, test summary all statuses |
| 2026-07-03 | SUBMITTED | PRE-002 | 20 | 68/72 | 94.44%, sát giới hạn |
| 2026-07-03 | SUBMITTED | PRE-003 | 40 | 120/120 | 100% |
| 2026-07-04 | DRAFT | FND-001 | 160 | 160/980 | Draft ngày đầu phần móng |
| 2026-07-04 | DRAFT | FND-003 | 5000 | 5000/42000 | Draft có nhiều dòng |
| 2026-07-05 | EMPTY | Không nhập | 0 |  | Test ngày chưa nhập dữ liệu |
| 2026-07-06 | APPROVED | FND-001 | 180 | 340/980 | Approved sau ngày trống |
| 2026-07-06 | APPROVED | FND-003 | 7000 | 12000/42000 | 28.57% |
| 2026-07-06 | APPROVED | FND-004 | 200 | 200/1350 | Bắt đầu cốp pha |
| 2026-07-07 | SUBMITTED | FND-001 | 150 | 490/980 | 50% |
| 2026-07-07 | SUBMITTED | FND-002 | 20 | 20/82 | Bê tông lót bắt đầu |
| 2026-07-07 | SUBMITTED | FND-004 | 250 | 450/1350 | Nhiều mũi |
| 2026-07-08 | APPROVED | FND-001 | 170 | 660/980 | 67.35% |
| 2026-07-08 | APPROVED | FND-002 | 25 | 45/82 | 54.88% |
| 2026-07-08 | APPROVED | FND-003 | 9000 | 21000/42000 | 50% |
| 2026-07-09 | DRAFT | FND-001 | 150 | 810/980 | Draft gần hoàn thành |
| 2026-07-09 | DRAFT | FND-004 | 300 | 750/1350 | Draft có ghi chú phát sinh |
| 2026-07-10 | APPROVED | FND-001 | 170 | 980/980 | 100%, case bằng thiết kế |
| 2026-07-10 | APPROVED | FND-002 | 30 | 75/82 | 91.46%, near-limit |
| 2026-07-10 | APPROVED | FND-003 | 8000 | 29000/42000 | 69.05% |
| 2026-07-11 | SUBMITTED | FND-004 | 280 | 1030/1350 | 76.30% |
| 2026-07-11 | SUBMITTED | FND-005 | 120 | 120/430 | Bắt đầu bê tông móng |
| 2026-07-11 | SUBMITTED | STR-101 | 2500 | 2500/12500 | Phần thân bắt đầu |
| 2026-07-12 | APPROVED | FND-003 | 8500 | 37500/42000 | 89.29% |
| 2026-07-12 | APPROVED | FND-004 | 250 | 1280/1350 | 94.81%, sát giới hạn |
| 2026-07-12 | APPROVED | FND-005 | 130 | 250/430 | 58.14% |
| 2026-07-13 | APPROVED | FND-005 | 150 | 400/430 | 93.02%, near-limit |
| 2026-07-13 | APPROVED | STR-101 | 3000 | 5500/12500 | 44% |
| 2026-07-13 | APPROVED | STR-102 | 120 | 120/520 | 23.08% |
| 2026-07-14 | EMPTY | Không nhập | 0 |  | Test ngày trống sau chuỗi có dữ liệu |

Các công việc giữ 0% trong giai đoạn này: `STR-103`, `STR-104`, `STR-105`, `STR-106`, `STR-201`, `STR-301`, `STR-401`, `STR-501`, `STR-STAIR`, `STR-WALL`, toàn bộ `FIN-*`, phần lớn `MEP-*`.

Case guard nên test bằng UI sau khi seed:

- Với `FND-001`, nhập thêm `1 m3` sau khi đã đạt `980/980` phải bị chặn.
- Với `FND-004`, nhập thêm `70 m2` là đạt đúng `1350/1350`, nhập `71 m2` phải bị chặn.
- Với `FND-005`, nhập thêm `30 m3` là đạt đúng `430/430`, nhập `31 m3` phải bị chặn.
- Với `PRE-002`, còn `4 điểm`, nhập `4` được, nhập `5` bị chặn.

## 8. Báo cáo công trường đề xuất

Nếu seed reports, nên tạo dữ liệu khớp với ngày khối lượng:

| Report No | Loại | Ngày/kỳ | Trạng thái | Người tạo | Nội dung chính | File/ảnh mẫu |
| --- | --- | --- | --- | --- | --- | --- |
| `BCN-QA-TUHIEP-20260701` | DAILY | 2026-07-01 | APPROVED | Kỹ sư hiện trường | Dọn mặt bằng, định vị mốc, lắp lán trại | 1 ảnh hiện trường dummy |
| `BCN-QA-TUHIEP-20260702` | DAILY | 2026-07-02 | APPROVED | Kỹ sư hiện trường | Hoàn thiện phần lớn chuẩn bị | 1 ảnh + 1 PDF biên bản |
| `BCN-QA-TUHIEP-20260703` | DAILY | 2026-07-03 | SUBMITTED | Kỹ sư hiện trường | Chuẩn bị đạt 100%, chờ duyệt | Không bắt buộc |
| `BCN-QA-TUHIEP-20260704` | DAILY | 2026-07-04 | DRAFT | Kỹ sư hiện trường | Bắt đầu đào móng, chưa đủ ảnh | Không |
| `BCN-QA-TUHIEP-20260706` | DAILY | 2026-07-06 | APPROVED | Chỉ huy trưởng | Móng A triển khai ổn định | 1 ảnh |
| `BCN-QA-TUHIEP-20260707` | DAILY | 2026-07-07 | SUBMITTED | Kỹ sư hiện trường | Bê tông lót bắt đầu, chờ duyệt | Không |
| `BCN-QA-TUHIEP-20260709` | DAILY | 2026-07-09 | REJECTED | Kỹ sư hiện trường | Thiếu ảnh nghiệm thu cốp pha | Không |
| `BCN-QA-TUHIEP-20260710` | DAILY | 2026-07-10 | APPROVED | Chỉ huy trưởng | Đào móng đạt 100%, bê tông lót near-limit | 1 ảnh |
| `BCN-QA-TUHIEP-20260712` | DAILY | 2026-07-12 | APPROVED | Kỹ sư hiện trường | Cốp pha móng 94.81%, thép móng 89.29% | 1 ảnh |
| `BCN-QA-TUHIEP-20260713` | DAILY | 2026-07-13 | APPROVED | Kỹ sư hiện trường | Bê tông móng 93.02%, bắt đầu thân tầng 1 | 1 ảnh + PDF |
| `BCT-QA-TUHIEP-20260701-20260707` | WEEKLY | 2026-07-01 đến 2026-07-07 | APPROVED | Chỉ huy trưởng | Tổng hợp tuần 1, có 2 ngày chờ/nháp | 1 PDF |
| `BCT-QA-TUHIEP-20260708-20260714` | WEEKLY | 2026-07-08 đến 2026-07-14 | SUBMITTED | Chỉ huy trưởng | Tổng hợp tuần 2, có ngày trống và issue | 1 PDF |

Nội dung báo cáo nên bao gồm:

- `summary`: Diễn biến thi công chính trong ngày/kỳ.
- `materials`: Bê tông thương phẩm, thép, cốp pha, cát đá, điện nước tạm.
- `labor`: Số nhân công theo tổ, ví dụ 38 công nhân, 2 kỹ sư, 1 chỉ huy.
- `equipment`: Máy đào 1.0 m3, xe ben, máy toàn đạc, đầm dùi, bơm bê tông.
- `quality`: Nghiệm thu mốc, nghiệm thu cốt thép/cốp pha, lấy mẫu bê tông.
- `issues`: Ngày mưa nhẹ, thiếu 1 lô ván phủ phim, chờ xác nhận cao độ hố pit.
- `recommendations`: Bổ sung vật tư, duyệt shopdrawing MEP, tăng ca khi đổ bê tông.
- Workflow audit: tạo, gửi, duyệt/từ chối.

## 9. Tài liệu/folder đề xuất

Folder đề xuất:

| Folder | Cách tạo |
| --- | --- |
| `01_Hợp đồng` | Có default rule, seed hoặc project action |
| `02_Bản vẽ` | Có default rule |
| `03_Dự toán` | Có default rule |
| `04_Nghiệm thu` | Có default rule |
| `05_Hóa đơn` | Có default rule |
| `06_Thanh toán` | Có default rule |
| `07_Hình ảnh hiện trường` | Có default rule |
| `08_Báo cáo ngày` | Có default rule |
| `09_Vật tư` | Folder custom, dùng default document rule |
| `10_Phát sinh` | Folder custom, dùng default document rule |

File metadata mẫu:

| File | Folder | MIME/extension | Trạng thái đề xuất | Cách tạo an toàn |
| --- | --- | --- | --- | --- |
| `HD_QA-TUHIEP-5F-001_Hop-dong-thi-cong.pdf` | 01 | PDF | APPROVED | Dummy PDF nhỏ hoặc upload UI |
| `PLHD_QA-TUHIEP-5F-001_Tien-do-thanh-toan.pdf` | 01 | PDF | SUBMITTED | Dummy PDF nhỏ |
| `BV_KT_Tong-mat-bang_V01.pdf` | 02 | PDF | APPROVED | Dummy PDF nhỏ |
| `BV_KC_Mong_V01.pdf` | 02 | PDF | APPROVED | Dummy PDF nhỏ |
| `BV_MEP_Tang-1_V01.pdf` | 02 | PDF | SUBMITTED | Dummy PDF nhỏ |
| `DT_Goc_QA-TUHIEP-5F-001.xlsx` | 03 | XLSX | APPROVED | Tạo workbook nhỏ bằng `xlsx` |
| `NT_Dinh-vi-tim-truc_20260701.pdf` | 04 | PDF | APPROVED | Dummy PDF nhỏ |
| `NT_Cot-thep-mong-dot-1_20260712.pdf` | 04 | PDF | SUBMITTED | Dummy PDF nhỏ |
| `IMG_Hien-truong_20260701.jpg` | 07 | JPG | APPROVED | Ảnh dummy 1x1 hoặc upload UI |
| `BCN_20260710_NguyenHoangNam.pdf` | 08 | PDF | SUBMITTED | Dummy PDF nhỏ |
| `YC_Vat-tu_Cop-pha-dot-1.xlsx` | 09 | XLSX | DRAFT | Dummy XLSX nhỏ |
| `PS_Xu-ly-cao-do-ho-pit.docx` | 10 | DOCX | DRAFT | Dummy DOCX/ZIP hợp lệ |

Khuyến nghị: file thật nên nhập qua UI để test magic-byte, giới hạn size, rule theo folder, preview/download. Nếu script seed tạo dummy file, phải tạo file vật lý trong `storage` và path phải đúng với storage provider.

## 10. User/phân quyền đề xuất

| User test | Email/username | System role | Project access | Quyền kỳ vọng | Case cần test |
| --- | --- | --- | --- | --- | --- |
| Admin hệ thống | `qa.admin.tuhiep@example.test` / `qa_admin_tuhiep` | ADMIN | Xem tất cả | Tạo/sửa/xóa mềm project, tạo user, duyệt report/document | Admin xem được direct URL mọi project, không bị chặn |
| Giám đốc | `qa.director.tuhiep@example.test` / `qa_director_tuhiep` | DIRECTOR | Xem tất cả | Duyệt/từ chối report, quản lý project/user | Duyệt report SUBMITTED, không cần ProjectMember |
| Chỉ huy trưởng | `qa.commander.tuhiep@example.test` / `qa_commander_tuhiep` | CHIEF_COMMANDER | Có ProjectMember `CHIEF_COMMANDER` | Xem project được giao, nhập KL, tạo/gửi report | Direct URL project khác phải bị redirect/chặn |
| Kỹ sư hiện trường | `qa.engineer.tuhiep@example.test` / `qa_engineer_tuhiep` | ENGINEER | Có ProjectMember `SUPERVISOR` hoặc `VIEWER` | Nhập KL, tạo report, upload tài liệu kỹ thuật nếu folder cho phép | Report của mình có thể submit; không duyệt |
| Kế toán | `qa.accountant.tuhiep@example.test` / `qa_accountant_tuhiep` | ACCOUNTANT | Có ProjectMember `VIEWER` | Xem project, upload vào folder kế toán nếu rule khớp | Không upload vào folder kỹ thuật |
| Nhân viên chỉ xem | `qa.viewer.tuhiep@example.test` / `qa_viewer_tuhiep` | STAFF | Có ProjectMember `VIEWER` | Xem project/report/document nếu có access | Không tạo user, không quản lý project |
| User ngoài công trình | `qa.outsider@example.test` / `qa_outsider` | ENGINEER | Không có ProjectMember | Không thấy project, không mở direct URL | Direct URL `/projects/[id]`, `/documents/[id]`, `/reports?projectId=` phải chặn |

Lưu ý về code hiện tại:

- High-level roles: `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR` xem tất cả project.
- Non-high-level chỉ xem project có `ProjectMember` active.
- Document folder permission đang so tên dạng `"01. Hợp Đồng"` trong một số rule permission, trong khi folder thực tế là `"01_Hợp đồng"`. Cần test kỹ quyền upload theo role vì rule `includes` có thể không match như kỳ vọng.
- Report approve/reject chỉ cho `ADMIN`, `DIRECTOR`.
- Report submit chỉ cho creator theo `report-transition-service`.

## 11. Script seed nên viết như thế nào

Chưa viết script thật ở phase này. Đề xuất sau khi được duyệt:

| Hạng mục | Đề xuất |
| --- | --- |
| Tên script | `scripts/seed-realistic-tu-hiep-project.ts` |
| Chế độ chạy | `npx tsx scripts/seed-realistic-tu-hiep-project.ts --dry-run` và `--execute` |
| Rollback riêng | `scripts/rollback-realistic-tu-hiep-project.ts --dry-run/--execute` |
| Mã project | `QA-TUHIEP-5F-001` |
| Prefix report | `BCN-QA-TUHIEP-*`, `BCT-QA-TUHIEP-*` |
| Prefix file | `QA_TUHIEP_` hoặc folder storage riêng |
| Email user | `qa.*@example.test` |
| Transaction | Dùng `prisma.$transaction` cho DB records. File system tạo trước vào temp hoặc tạo sau với rollback file nếu DB lỗi. |
| Idempotency | `upsert` theo project code, user email, folder name. Với entries/reports dùng delete/recreate chỉ trong phạm vi project QA hoặc upsert theo reportNo. |
| Rollback an toàn | Chỉ xóa dữ liệu có project code `QA-TUHIEP-5F-001`, users `qa.*@example.test`, audit logs có `projectId` của project QA, storage path chứa project id/prefix QA. |
| Tránh đụng dữ liệu thật | Không dùng `deleteMany()` không có `where` hẹp. Không reset DB. Không xóa storage ngoài prefix/project id. |
| Backup | Trước `--execute`, bắt buộc yêu cầu backup DB + storage hoặc ít nhất dry-run count. |

Thứ tự seed đề xuất:

1. Kiểm tra `DATABASE_URL`, không chạy production nếu thiếu flag rõ ràng.
2. Tìm hoặc tạo QA users.
3. Tạo hoặc cập nhật project `QA-TUHIEP-5F-001`.
4. Tạo ProjectMember cho user QA.
5. Tạo document folders.
6. Tạo FieldProgressTemplate và FieldProgressItem GROUP/WORK.
7. Tạo FieldProgressEntry 14 ngày theo plan.
8. Tạo SiteReport, SiteReportLine, workflow fields, AuditLog.
9. Tạo dummy report attachments/documents nếu được duyệt.
10. Tạo MaterialRequest/MaterialRequestItem.
11. Chạy verify script riêng: count, no over quantity, no orphan attachment/document, RBAC sample queries.

## 12. Rủi ro và lưu ý

- DB hiện tại có thể đang có dữ liệu thật hoặc dữ liệu UAT cũ. Repo có nhiều báo cáo QA và script từng reset/seed, nên không được giả định database rỗng.
- Có script reset trong repo có thể xóa rộng toàn bộ business data. Không dùng cho yêu cầu này.
- Cần backup trước khi chạy seed execute, đặc biệt nếu tạo physical files trong `storage`.
- Cần transaction cho DB, nhưng file system không nằm trong DB transaction. Script phải có cleanup nếu lỗi giữa chừng.
- Cần prefix mã công trình, reportNo, file name, email test.
- Không nên seed `FieldProgressEntry` vượt thiết kế, vì summary/guard sẽ hiển thị sai và ảnh hưởng UAT.
- UI daily hiện lưu field progress entry trực tiếp `APPROVED`. Dữ liệu `DRAFT/SUBMITTED` của FieldProgressEntry chỉ test được qua seed hoặc script chuyên biệt, không phản ánh thao tác UI hiện hành.
- Weekly report aggregation chỉ tổng hợp report ngày `APPROVED`, nên cần đủ daily approved nếu muốn test tạo tuần qua UI.
- Report attachment upload bị khóa khi report không còn DRAFT/REJECTED/REVISION_REQUESTED. Nếu muốn test upload, tạo report DRAFT qua UI rồi upload trước khi submit.
- Document status `APPROVED/ARCHIVED/SUPERSEDED` khóa sửa/xóa. Nếu seed tài liệu approved, không dùng nó để test edit/delete.
- `/materials`, `/contracts`, `/accounting`, `/approvals`, `/audit` hiện chủ yếu EmptyState hoặc chưa có CRUD đầy đủ. Seed các model liên quan chỉ có ích gián tiếp cho dashboard hoặc tương lai.

## 13. Kết luận

Có thể seed, nhưng nên chia từng phần và có duyệt trước:

1. Seed core an toàn: Project, users QA, ProjectMember, folders, FieldProgressTemplate, FieldProgressItem.
2. Seed field progress entries 14 ngày: có DRAFT/SUBMITTED/APPROVED/EMPTY, không vượt thiết kế.
3. Seed reports và audit workflow: daily/weekly, lines, status, issue cases.
4. Seed documents/attachments: chỉ sau khi chốt cách tạo dummy file thật trong storage.
5. Seed material requests: nên làm sau khi field progress items đã có để link đúng công việc.
6. Không seed payment/accounting/approval legacy ở phase đầu, trừ khi bạn yêu cầu mở rộng.

Cần bạn duyệt trước khi tạo script:

- Có đồng ý mã project `QA-TUHIEP-5F-001` không.
- Có đồng ý tạo 7 user QA bằng email `@example.test` không.
- Có seed FieldProgressEntry đa trạng thái trực tiếp vào DB không, vì UI daily hiện chỉ lưu `APPROVED`.
- Có tạo dummy file vật lý trong `storage` không, hay để phần upload test bằng UI.
- Có seed MaterialRequest không.
- Có seed 1 contract/payment tối thiểu để dashboard/accounting future test không, hay bỏ qua.
