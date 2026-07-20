# Báo cáo hoàn tất Table-first Editor — Báo cáo kết quả tuần Giám sát

## 1. Kết luận

**DONE.** Luồng `BÁO CÁO KẾT QUẢ TUẦN` đã được chuyển từ 21 card Sáng/Chiều/Tối sang trình nhập dạng bảng và đã được kiểm thử trên production build với chuỗi editor → PostgreSQL QA → reload → preview → PDF. Không reset database, không drop bảng, không xóa hồ sơ nghiệp vụ và không sửa lịch sử migration đã áp.

Database kiểm thử: `127.0.0.1:5432`, database `construction_erp_v2_qa`, schema `public`. Prisma báo 6 migration và schema up to date.

## 2. Nguyên nhân UI cũ không phù hợp

UI cũ tạo ba card cố định cho mỗi ngày, làm xuất hiện 21 khối lớn ngay cả khi không có dữ liệu. Một buổi không thể hiện tốt nhiều công việc/công trình; mục II và V bị nhập như observation textarea; preview không đọc các bảng Transition/Progress; mục III có cột in khác mẫu. Trạng thái “đã chọn buổi nhưng chưa có công việc” cũng không có nơi lưu qua reload.

## 3. Data flow trước và sau

| Phần | Trước | Sau |
| --- | --- | --- |
| I | 21 card; entry rời rạc | Một bảng tuần; selection và nhiều entry theo ngày/buổi |
| II | Observation textarea | `SupervisionWeeklyTransition` có row riêng |
| III | Quantity nhưng UI/in có cột thừa | `SupervisionWeeklyQuantity`, đúng 5 cột mẫu |
| V | Observation textarea | `SupervisionWeeklyProgress`, đúng 5 cột mẫu |
| Preview | Một phần dùng observation/mapper riêng | Dùng trực tiếp cùng structured data với editor |
| Autosave | Không bao phủ đầy đủ cấu trúc | Một transaction, `lockVersion`, retry/conflict state |

Chi tiết từng field nằm tại `docs/qa/SUPERVISION_WEEKLY_RESULT_DATA_FLOW_AUDIT.md`.

## 4. Schema và cách lưu

Migration additive `20260720150000_supervision_weekly_result_tables` đã được áp, không reset:

- `SupervisionWeeklyShiftSelection` lưu checkbox Sáng/Chiều/Tối, kể cả buổi đã chọn nhưng chưa có công việc.
- Mỗi công việc là một `SupervisionWeeklyEntry` độc lập, có `entryDate`, `shift`, `sortOrder`.
- Mỗi entry tự chọn nguồn theo `inputMode`: project/work item có sẵn; project + hạng mục nhập tay; hoặc nhập hoàn toàn tự do.
- `projectId`/`workItemId` nullable được lưu cùng `projectNameSnapshot`, `workItemNameSnapshot`, `manualText`, `displayText`; đổi tên master data không làm đổi báo cáo cũ.
- Project selector ở header không áp vào toàn tuần và không bị thay đổi khi chọn project trong một dòng.
- Transition được bổ sung giá trị số/text, đơn vị, chênh lệch và tiến độ đề ra. Chênh lệch chỉ tính khi hai giá trị là số và cùng đơn vị.
- Progress được bổ sung `delayValue` và `delayType` (`DAY`/`PERCENT`).
- Save giữ ID các row hiện có, thực hiện trong transaction và kiểm tra `lockVersion` để phát hiện bản server mới hơn.
- Observation RESULT legacy không bị xóa; nếu có sẽ hiển thị chỉ đọc để người dùng chuyển đổi an toàn.

## 5. Editor và bản in

- Mục I là bảng 4 cột có sticky header/time trên desktop, checkbox theo buổi, thêm/nhân bản/xóa/sắp xếp nhiều công việc và textarea tự giãn.
- Mục II/III/V lần lượt là bảng 6/5/5 cột đúng mẫu.
- Autosave hiển thị `Đang lưu…`, `Đã lưu`, `Lưu thất bại`, có retry và cảnh báo conflict; không cuộn lại đầu trang sau save.
- Ngày editor dùng dạng `Thứ Hai, ngày 20/07/2026`; bản in giữ nhãn Thứ/Sáng/Chiều/Tối và không in checkbox/control.
- Preview/PDF dùng A4 ngang, Times New Roman, lề 15 mm; lịch được chia trang động, header lặp lại và chữ ký nằm cuối phần kết quả.
- Phần Kế hoạch tuần tiếp theo không bị cải tổ sâu và dữ liệu hiện có vẫn được giữ.

## 6. Runtime test bắt buộc

Test `scripts/qa/verify-supervision-weekly-runtime.ts` chạy trên `next start` từ production build, dùng hồ sơ QA tạm và dữ liệu đầy đủ cả tuần:

- Route `/supervision/weekly`: HTTP 200; role `SUPERVISION_HEAD` truy cập được; role không quyền bị chặn.
- 12 entry; 10 buổi được chọn; buổi chọn nhưng rỗng vẫn tồn tại sau reload.
- Thứ Hai chỉ Chiều với hai công việc; Thứ Ba Sáng/Tối; Thứ Tư không chọn; Thứ Năm đủ ba buổi và Chiều có ba project khác nhau; Thứ Sáu–Chủ nhật có dữ liệu hỗn hợp.
- Mục II: 2 dòng, gồm cùng đơn vị có tính chênh lệch và khác đơn vị có cảnh báo/không tạo số giả.
- Mục III: 3 dòng. Mục V: 3 dòng gồm đúng tiến độ, chậm theo ngày và chậm theo phần trăm.
- Autosave + reload: pass; snapshot và thứ tự được giữ.
- Preview có số cột `[4, 6, 5, 5]`; PDF tạo thành công.
- Submit khóa chỉnh sửa: pass.
- Smoke routes `/dashboard`, `/projects`, `/reports`, `/materials`, `/documents`: đều HTTP 200.
- Hồ sơ QA được soft-delete. Hai fixture project của lần test bị ngắt đã được định danh bằng ID/marker, gỡ scope link và soft-delete. Kiểm tra cuối: `activeQaDossiers = 0`, `activeQaProjects = 0`.

## 7. Commands và kết quả

| Command | Kết quả |
| --- | --- |
| `npx prisma validate` | PASS |
| `npx prisma migrate status` | PASS — schema up to date |
| `npx prisma generate` | PASS — Prisma 7.8.0 |
| `npx tsc --noEmit` | PASS |
| scoped `npx eslint` cho app/components/lib Supervision Weekly | PASS, không warning |
| `npx tsx --test tests/supervision-weekly/date.test.ts` | PASS 2/2 |
| `npm run build` | PASS — Next.js 16.2.7 |
| Production Playwright/data-flow test | PASS |
| Script cleanup/inspect QA | PASS — không còn fixture active |

Build còn một warning tracing đã tồn tại ở `src/lib/storage/local-storage-provider.ts`; warning này không thuộc phân hệ Giám sát và không chặn build/runtime.

## 8. Artifacts đã kiểm tra

- DOCX do Microsoft Word render: `docs/qa/artifacts/supervision-weekly-result-reference/reference-word.pdf` (4 trang).
- PDF production runtime: `docs/qa/artifacts/supervision-weekly-result-table-editor/result-report.pdf` (5 trang với bộ dữ liệu QA lớn).
- PNG từng trang PDF cuối: `docs/qa/artifacts/supervision-weekly-result-table-editor/pdf-pages-production-final/page-1.png` đến `page-5.png`.
- Ảnh desktop: `desktop-editor-full.png`, `desktop-section-I.png`, `desktop-multi-shift-day.png`, `desktop-multi-project-shift.png`, `desktop-section-II.png`, `desktop-section-III.png`, `desktop-section-V.png`, `desktop-preview-full.png`.
- Ảnh mobile: `mobile-editor.png`, `mobile-preview.png`.
- Log production server: `production-server.stdout.log`, `production-server.stderr.log` (stderr rỗng).

Tất cả ảnh nêu trên đã được xem trực tiếp. PDF không có checkbox/control, không có cột thừa, không cắt tiếng Việt và không có trang trắng bất thường.

## 9. File chính đã sửa/tạo

- `prisma/schema.prisma`
- `prisma/migrations/20260720150000_supervision_weekly_result_tables/migration.sql`
- `src/app/(dashboard)/supervision/weekly/actions.ts`
- `src/app/(dashboard)/supervision/weekly/[id]/edit/page.tsx`
- `src/app/(dashboard)/supervision/weekly/[id]/preview/page.tsx`
- `src/components/supervision-weekly/weekly-editor.tsx`
- `src/components/supervision-weekly/result-schedule-table.tsx`
- `src/components/supervision-weekly/result-data-tables.tsx`
- `src/components/supervision-weekly/source-selector.tsx`
- `src/components/supervision-weekly/weekly-print-template.tsx`
- `src/lib/supervision-weekly/types.ts`
- `src/lib/supervision-weekly/editor-types.ts`
- App shell/header/mobile navigation: chỉ thêm marker/CSS để ẩn chrome khi in.
- Scripts QA, data-flow audit, forensic report và artifacts dưới `scripts/qa`, `tests`, `docs/qa`.

## 10. Sai khác và rủi ro còn lại

- Không tuyên bố pixel-perfect với DOCX: PDF browser chia thành 5 trang với bộ dữ liệu QA dày, còn DOCX gốc tĩnh là 4 trang. Cấu trúc, khổ/lề/font, thứ tự mục và số cột đã khớp.
- Mobile editor giữ cùng component/data và dùng vùng cuộn ngang có kiểm soát; không có form dữ liệu thứ hai. Mobile preview là chế độ zoom của A4; app chrome chỉ tồn tại ở màn hình preview, bị loại khỏi PDF/print.
- Lịch sử các hồ sơ QA cũ được giữ ở trạng thái soft-deleted theo nguyên tắc không xóa dữ liệu; không còn fixture QA active.
- Cơ chế autosave thay thế tập row của từng hồ sơ trong một transaction nhưng giữ ID row hiện có và được bảo vệ bằng `lockVersion`; các client cũ phải reload khi conflict.
