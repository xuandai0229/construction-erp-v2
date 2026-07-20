# Báo cáo hoàn tất UX nhập trực tiếp Báo cáo tuần Giám sát

Ngày kiểm tra: 20/07/2026  
Repository: `construction-erp-v2`  
Phạm vi: `/supervision/weekly` – Báo cáo kết quả tuần  
Kết luận: **DONE**

## 1. Vấn đề trước khi sửa

Editor dạng bảng đã tồn tại nhưng mỗi dòng còn mở một modal lớn để chọn nguồn, chia tab “Chọn từ hệ thống/Nhập trực tiếp”, có trạng thái compact/edit, nút bút chì, “Thu gọn”, “Áp dụng” và nhiều nhãn kỹ thuật. Người dùng phải thực hiện nhiều bước trước khi nhập đúng bốn nội dung của mẫu Word. Textarea nội dung/kết quả chưa có bằng chứng chịu được văn bản dài; cách lưu một chuỗi `manualText` cũng không phân biệt chắc chắn công trình nhập tay với hạng mục nhập tay.

## 2. Audit dữ liệu nghiệp vụ

- `Project` là Công trình và được lọc theo phạm vi Giám sát của người dùng.
- Repository không có model Prisma `ProjectWorkItem`.
- Nguồn “work item” đang dùng thực tế là `FieldProgressItem` với `itemType = WORK`: đây là **công tác thi công**, không phải mọi bản ghi đều là hạng mục.
- `ProjectLocationNode` mới là cây vị trí/bộ phận công trình có cấu trúc; `WBSItem` là cây phân rã công việc riêng.
- `WorkTask` thuộc module Nhiệm vụ, không được dùng làm nguồn cho báo cáo Giám sát.
- Audit chi tiết: `docs/qa/SUPERVISION_WEEKLY_INPUT_UX_DOMAIN_AUDIT.md`.

## 3. Luồng nhập mới của Mục I

Mỗi dòng luôn mở và nhập trực tiếp trong bảng, không còn modal, tab, chế độ nguồn, compact/edit, bút chì hoặc nút Thu gọn.

1. Tích Sáng/Chiều/Tối tự tạo ngay một dòng rỗng và focus vào combobox Công trình.
2. Cuối buổi có nút `+ Thêm dòng kiểm tra`; bấm là tạo row ngay.
3. Mỗi row độc lập về Công trình, Hạng mục/công tác, Nội dung kiểm tra và Kết quả.
4. Một buổi có thể dùng lại cùng công trình với hạng mục khác, hoặc chọn công trình hoàn toàn khác.
5. Bỏ chọn buổi có dữ liệu dùng dialog xác nhận ngắn; row rỗng xóa ngay, row có dữ liệu mới hỏi xác nhận.

Các textarea Nội dung kiểm tra và Kết quả có chiều cao đầu hai dòng, tự đo `scrollHeight`, tự tăng chiều cao, giữ xuống dòng, `overflow-wrap: anywhere` và không dùng scroll nội bộ trong điều kiện kiểm thử. Playwright đã nhập 2.390 ký tự nội dung và 1.175 ký tự kết quả, reload và preview không mất chữ.

## 4. Nhập Công trình và Hạng mục trực tiếp tại row

Component dùng chung `SourceSelector` đã được thay toàn bộ phần thân bằng cặp trường inline:

- Công trình: combobox tìm kiếm `Chọn công trình...` và input `Hoặc nhập công trình khác` ngay dưới.
- Hạng mục: combobox `Chọn hạng mục...` và input `Hoặc nhập hạng mục khác` ngay dưới.

Combobox mở ngay dưới ô, có giới hạn chiều cao, tìm theo mã/tên, không dấu, không phân biệt hoa thường, hỗ trợ bàn phím và ưu tiên công trình gần đây. Project selector toàn ứng dụng không bị thay đổi và không giới hạn một project cho cả tuần.

Hai nguồn Công trình loại trừ lẫn nhau: nhập tay sẽ bỏ `projectId`; chọn lại project có sẵn sẽ xóa tên project nhập tay. Đổi project xóa work item có cấu trúc không còn hợp lệ nhưng giữ hạng mục nhập tay. Khi project nhập tay, combobox hạng mục có sẵn bị vô hiệu hóa còn input hạng mục nhập tay vẫn dùng được.

## 5. Lưu dữ liệu, snapshot và migration

Migration additive `20260720183000_supervision_weekly_direct_entry` thêm hai cột nullable `manualProjectName` và `manualWorkItemName` cho Entry, Transition, Quantity, Progress và Observation. Không drop/rename/backfill suy diễn, không reset database, không xóa dữ liệu hoặc sửa migration đã áp.

Mỗi row tiếp tục lưu reference và snapshot:

- `projectId`, `projectNameSnapshot`;
- `workItemId`, `workItemNameSnapshot`;
- `manualProjectName`, `manualWorkItemName`;
- các field location/manual legacy;
- `displayText`, `sortOrder`, nội dung nghiệp vụ.

Formatter chung `formatSupervisionProjectAndWorkItem()` ghép `[Tên công trình] - [Tên hạng mục/công tác]`, bỏ phần rỗng và được editor, preview, print và validation dùng chung. Dữ liệu cũ chỉ có `manualText/displayText` được hiển thị nguyên văn; hệ thống không tự đoán sai để tách project/hạng mục và preview lịch sử không thay đổi.

Database QA đã áp migration: PostgreSQL `127.0.0.1:5432`, database `construction_erp_v2_qa`, schema `public`. `npx prisma migrate status` xác nhận 8 migration và schema up to date.

## 6. Mục II, III và V

- Mục II giữ đúng 6 cột; Mục III đúng 5 cột; Mục V đúng 5 cột.
- `+ Thêm dòng` sinh row ngay, không có input nhập trước, modal nguồn hay compact/edit.
- Cả ba dùng cùng cặp Công trình/Hạng mục inline.
- Các textarea Tiến độ đề ra và Lý do chậm tiến độ tự giãn.
- Trạng thái Mục V hiển thị “Đúng tiến độ/Chậm tiến độ”; không lộ enum `DAY/PERCENT`.

`SmartQuantityInput` mặc định chỉ hiện giá trị và đơn vị gọn. Parser hỗ trợ số Việt Nam/quốc tế và chuẩn hóa `m2/m^2/m²`, `m3/m^3/m³`, `kg/KG`, `tan/tấn`, `cai/cái`, `bo/bộ`, `ngay/ngày`. Text fallback chỉ mở qua link nhỏ. Chênh lệch chỉ tính khi hai unit code chuẩn hóa giống nhau; cảnh báo khác đơn vị được rút gọn và không làm cao bảng.

## 7. Nội dung và trạng thái đã loại bỏ khỏi editor

Đã bỏ: modal nguồn, tab “Chọn từ hệ thống/Nhập trực tiếp”, “Chưa chọn nguồn kiểm tra”, “Nguồn kiểm tra”, “Áp dụng”, “Thu gọn”, icon bút chì, row compact, “Bản in: …”, dropdown mode kỹ thuật, input tên trước nút thêm và các đoạn “Chưa nhập …” lặp trong ô. Placeholder trực tiếp thay thế các text rỗng.

## 8. Preview, PDF và đối chiếu Word

Mẫu Word đã được giám định bằng `python-docx` và Microsoft Word COM ở chế độ chỉ đọc: A4 ngang, lề 15 mm, Times New Roman, các mục I/II/III/V và bảng 4/6/5/5 cột. Bản runtime giữ nguyên cấu trúc này, không in input, checkbox, icon, nút, trạng thái editor hoặc cảnh báo.

PDF QA cuối nằm tại `docs/qa/artifacts/supervision-weekly-direct-entry-ux/result-report.pdf`; cả 7 trang đã render thành PNG trong thư mục `pdf-pages` và được xem trực tiếp. Trang 1–5 là Báo cáo kết quả tuần, nội dung 2.390/1.175 ký tự tiếp trang không bị cắt, không có trang trắng bất thường; trang 6–7 là Kế hoạch tuần tiếp theo hiện hữu và không bị cải tổ. Không tuyên bố giống DOCX từng pixel; khác biệt dự kiến là ngắt trang động theo lượng dữ liệu.

## 9. Kiểm thử runtime và dữ liệu

Playwright/runtime script `scripts/qa/verify-supervision-weekly-runtime.ts` đã chạy trên QA thật và cleanup fixture sau kiểm tra:

- tích buổi tự sinh row, focus Công trình, không mở modal;
- 4 dòng trong cùng buổi: cùng project/khác hạng mục, project khác, project và hạng mục nhập tay;
- autosave, reload, thứ tự, snapshot và nội dung dài giữ nguyên;
- Mục II cùng đơn vị tự tính, khác đơn vị không tính;
- Mục III: `120/115 m3 = -5 m³`, `100/95 m2 = -5 m²`, `2/1,5 tấn = -0,5 tấn`;
- Mục V: đúng tiến độ, chậm theo ngày và chậm theo phần trăm;
- hồ sơ legacy mở và preview được;
- preview đúng số cột `[4, 6, 5, 5]`, PDF tạo thành công;
- workflow submit/lock, RBAC và cleanup đều thành công;
- smoke `/dashboard`, `/projects`, `/reports`, `/materials`, `/documents`: HTTP 200;
- không có console/page error; mobile không gây horizontal overflow toàn trang.

Kiểm tra bổ sung bằng Browser trong ứng dụng đã mở trực tiếp `/supervision/weekly`, hiển thị danh sách hồ sơ và không có console log lỗi.

## 10. Screenshot artifacts đã xem

Thư mục: `docs/qa/artifacts/supervision-weekly-direct-entry-ux/`

- `01-section-I-empty.png`
- `02-shift-auto-row.png`
- `03-system-project-manual-work.png`
- `04-project-dropdown.png`
- `05-work-dropdown.png`
- `06-long-content-autogrow.png`
- `07-four-rows-one-shift.png`
- `08-section-II.png`
- `09-section-III.png`
- `10-section-V.png`
- `11-preview.png`
- `12-mobile-editor.png`
- `result-report.pdf` và `pdf-pages/page-1.png` đến `page-7.png`

Các screenshot đã được xem trực tiếp; hai lỗi nhìn thấy ở vòng đầu (dropdown còn mở khi focus input tay và đơn vị bị hiển thị lặp) đã được sửa, chạy lại và kiểm tra lại.

## 11. File chính đã sửa

- `prisma/schema.prisma`
- `prisma/migrations/20260720183000_supervision_weekly_direct_entry/migration.sql`
- `src/components/supervision-weekly/source-selector.tsx`
- `src/components/supervision-weekly/result-schedule-table.tsx`
- `src/components/supervision-weekly/result-data-tables.tsx`
- `src/components/supervision-weekly/smart-quantity-input.tsx`
- `src/components/supervision-weekly/weekly-editor.tsx`
- `src/components/supervision-weekly/weekly-print-template.tsx`
- `src/app/(dashboard)/supervision/weekly/actions.ts`
- `src/app/(dashboard)/supervision/weekly/[id]/edit/page.tsx`
- `src/lib/supervision-weekly/editor-types.ts`
- `src/lib/supervision-weekly/types.ts`
- `src/lib/supervision-weekly/source-formatter.ts`
- `tests/supervision-weekly/source-formatter.test.ts`
- `scripts/qa/verify-supervision-weekly-runtime.ts`

Các thay đổi khác có sẵn trong working tree được giữ nguyên, không checkout/revert/dọn Git.

## 12. Command và kết quả cuối

- `npx prisma validate`: PASS.
- `npx prisma migrate deploy`: PASS, áp migration additive vào QA.
- `npx prisma migrate status`: PASS, 8 migration, up to date.
- `npx prisma generate`: PASS, Prisma Client 7.8.0.
- `npx tsc --noEmit`: PASS.
- scoped `npx eslint` cho app/components/lib Supervision Weekly: PASS.
- `npx tsx --test tests/supervision-weekly/*.test.ts`: PASS 7/7.
- `npx tsx scripts/qa/verify-supervision-weekly-runtime.ts`: PASS toàn bộ runtime/data flow/RBAC/smoke/cleanup.
- `npm run build`: PASS với Next.js 16.2.7.

Build còn một cảnh báo NFT trace đã tồn tại ở `src/lib/storage/local-storage-provider.ts` qua `next.config.ts`. Cảnh báo không liên quan Supervision Weekly và không làm build thất bại.

## 13. Kết luận và rủi ro còn lại

**DONE.** Modal đã bỏ; Công trình/Hạng mục có thể chọn hoặc nhập trực tiếp ngay trong row; tích buổi tự sinh row; cùng công trình khác hạng mục và nhiều công trình trong một buổi đã được kiểm thử; textarea dài tự giãn; autosave/reload, hồ sơ cũ, preview, PDF, workflow, RBAC, mobile và build đều pass.

Rủi ro còn lại không chặn nghiệm thu:

1. `FieldProgressItem WORK` vẫn là nguồn công tác thi công được lưu vào field lịch sử tên `workItemId`; UI không gọi nhầm đây là model Hạng mục.
2. Dữ liệu legacy chỉ có một chuỗi `manualText` được giữ nguyên thay vì tự tách có rủi ro sai nghĩa.
3. Cảnh báo NFT trace ngoài phạm vi nên được xử lý trong nhiệm vụ hạ tầng riêng.
