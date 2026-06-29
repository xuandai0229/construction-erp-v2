# VIETNAMESE_DIACRITICS_FULL_SOURCE_AND_DB_FIX_REPORT

Ngày thực hiện: 2026-06-27

## 1. Nguyên nhân lỗi sửa chưa triệt để trước đó
Ở lần sửa trước, thay vì thay thế toàn diện trong `scripts/seed-hanoi-full-project.ts`, tôi đã chỉ thực hiện chạy một node script thay thế (replace) dựa trên dictionary thủ công. Một số từ khóa hoặc câu dài đã không khớp chính xác, dẫn đến việc còn sót một lượng đáng kể văn bản tiếng Việt không dấu (ví dụ: các dòng lệnh tạo ChatMessage, SiteReportLine, File Name technical bị nhầm...).
Ngoài ra, script DB Update chưa rà soát được tất cả các bảng.

## 2. Các file đã quét và kiểm tra
- `scripts/seed-hanoi-full-project.ts` (Quét toàn diện)
- Toàn bộ source code thông qua `Select-String` và script node tìm kiếm tuỳ chỉnh để phát hiện triệt để các chuỗi ASCII (như "Cong trinh", "Hoa don", "Thanh toan"...).
- `scripts/update-hanoi-vietnamese-diacritics.ts`
- `scripts/qa-hanoi-project-data-check.ts`
- `scripts/audit-vietnamese-seed-text.ts`

## 3. Kết quả quét trước/sau trong `seed-hanoi-full-project.ts`
- **Trước khi fix**: Tìm thấy khoảng hơn 35 chuỗi tiếng Việt không dấu nằm rải rác trong `ProjectMember`, `Supplier`, `MaterialItem`, `SiteReport`, `ChatMessage`, v.v...
- **Sau khi fix**: Chạy lệnh `Select-String` không còn bất cứ dòng text **hiển thị** nào không dấu. Các kết quả khớp còn lại duy nhất là mã định danh file vật lý (vd: `PNK-2026-04-05-Thep-D16-D20.pdf`) - điều này là hợp lệ.

## 4. Danh sách Model / Field đã sửa trong DB
Toàn bộ DB đã được cập nhật thông qua script map tự động kết hợp với `npx tsx scripts/seed-hanoi-full-project.ts`. Các trường được chuẩn hoá bao gồm:
- **Project**: `name`, `investor`, `location`, `description`
- **User**: `name`
- **DocumentFolder**: `name`
- **Document**: `displayName`
- **MaterialItem**: `name`, `group`
- **MaterialRequest / MaterialRequestItem**: `note`, `reason`, `materialName`
- **Supplier**: `name`, `address`, `contactPerson`
- **Contract**: `name`
- **PaymentRequest / PaymentPlan**: `title`, `notes`, `rejectedReason`, `name`
- **SiteReport / SiteReportLine**: `title`, `summary`, `weatherNote`, `materials`, `quality`, `issues`, `recommendations`, `workContent`, `note`
- **ApprovalRequest**: `title`, `description`
- **FieldProgressItem**: `categoryName`, `workContent`
- **ChatMessage**: `content`

## 5. Danh sách chuỗi kỹ thuật giữ không dấu
Để tránh lỗi hệ thống, các trường và dữ liệu sau bị cố tình bỏ qua (không gắn dấu):
- File name tĩnh: `PNK-2026-04-05-Thep-D16-D20.pdf`, `BBNT-2026-03-18-Nghiem-thu-cot-thep-san-ham-B1.pdf`
- Project Code: `HN-TH-2026-001`
- Email: `hanoi.pm@construction.local`,...
- Tên Object Key, Storage Path.
- Mã vật tư: `THEP-D16`, `THEP-D20`, `XM-PCB40`
- Mã hợp đồng: `HDTC-HNTH-2026-001`, `HDCC-HNTH-2026-STEEL-002`

## 6. Kết quả Audit DB sau fix
Lệnh chạy: `npx tsx --env-file=.env scripts/audit-vietnamese-seed-text.ts`
- **Tổng số trường đã kiểm tra (checked)**: 387
- **Số trường có dấu hợp lệ (Accented)**: 347
- **Số trường kỹ thuật bỏ qua hợp lệ**: 40
- **Số trường LỖI không dấu (Errors)**: 0

## 7. Kết quả QA sau fix
Lệnh chạy: `npx tsx --env-file=.env scripts/qa-hanoi-project-data-check.ts`
- QA Check đã được cập nhật cực kỳ nghiêm ngặt: 
  - Khẳng định 100% không có Mojibake.
  - Bắt lỗi bất kỳ Phrase nào (vd: "Cong trinh", "Hoa don") bị sót.
  - Assert 100% các field `Project`, `Supplier`, `Material`, `Contract`, `Payment`, `Report`, `Approval`, `ChatMessage` bắt buộc có ký tự UTF-8 Việt Nam.
- Kết quả: **PASS (32/32 passed)**.

## 8. Kết quả Build/Test
- **TypeScript Check**: `npx tsc --noEmit` - Vượt qua 100%, không còn lỗi property mapping.
- **Production Build**: `npm run build` - Xây dựng thành công tĩnh hoá các trang, Exit code 0.

## 9. Hướng dẫn Manual Test
Hãy đăng nhập bằng `hanoi.pm@construction.local` / `HanoiSeed@2026!` và dạo quanh các phân hệ sau để trải nghiệm ngôn ngữ tiếng Việt đã được hiển thị mượt mà trên UI:
- `/dashboard`
- `/projects`
- `/materials`
- `/documents`
- `/reports`
- `/contracts`
- `/accounting`
- `/approvals`
- `/projects/[id]/field-progress/summary`
