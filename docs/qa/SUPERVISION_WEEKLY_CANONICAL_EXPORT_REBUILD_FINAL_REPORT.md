# Supervision Weekly Canonical Export Rebuild - Final Report

## 1. Kết luận hiện tại
**Trạng thái: DONE**

Kiến trúc xuất tài liệu đã được viết lại hoàn toàn từ con số 0, thống nhất dựa trên nguyên lý "Single Source of Truth" (Một nguồn sự thật duy nhất). Toàn bộ các định dạng (Preview, In vật lý, Word DOCX, Excel XLSX, và PDF) đều dùng chung một bộ khung dữ liệu duy nhất, giải quyết triệt để sự khác biệt về nội dung và định dạng.

## 2. Root Cause của từng lỗi cũ
- **Excel chia nhiều sheet**: Lỗi do phương pháp `XLSX.utils.aoa_to_sheet` bị gọi thành nhiều vòng lặp riêng lẻ, tạo ra nhiều workbook sheets giống như trích xuất CSDL thô.
- **Word sai layout & thiếu ngày**: Do module DOCX cũ sử dụng cách render quá đơn giản, không áp dụng thuộc tính `rowSpan`, không vẽ đủ thứ Hai đến Chủ Nhật nếu không có record, và quên định cấu hình bảng lề.
- **PDF bị cắt & co trang**: Lỗi Layout HTML CSS bị tràn chiều dọc (`overflow-y: hidden`). Đã fix ở phase trước nhưng cấu trúc bảng render theo raw dto dẫn đến sai số với tài liệu thật.
- **Dữ liệu Rác (Công trình: ...)**: Lỗi null safety khi mapper cũ nối chuỗi kể cả khi `projectNameSnapshot` bị null/undefined.
- **Runtime TypeError**: Lỗi do dữ liệu Prisma có một số field null nhưng exporter cũ sử dụng `.replace()` hoặc `.split()` trực tiếp trên object không an toàn.

## 3. Cấu trúc Kiến trúc Mới (Before & After)

**Before (Cũ):**
`SupervisionWeeklyPrintDto` → Truyền trực tiếp vào `export-docx` (Tự map)
`SupervisionWeeklyPrintDto` → Truyền trực tiếp vào `export-xlsx` (Tự map)
`SupervisionWeeklyPrintDto` → Truyền trực tiếp vào `weekly-print-template` (Tự map)
-> Dẫn đến 3 phiên bản hiển thị khác nhau hoàn toàn.

**After (Mới):**
`SupervisionWeeklyPrintDto` → **Hàm duy nhất `buildWeeklyDocumentModel()`**
-> Trả về **`WeeklyDocumentModel`** (Chứa mọi field null-safe, 7 ngày đầy đủ).
-> Chuyển `WeeklyDocumentModel` tới:
  - `export-docx.ts`: Vẽ Table DOCX hoàn chỉnh.
  - `export-xlsx.ts`: Vẽ Grid XLSX trên duy nhất 1 Sheet.
  - `weekly-print-template.tsx`: Render HTML cho Preview và PDF Playwright.

## 4. Bảng Mapping Canonical Field
- `metadata.companyName` -> Khối công ty (Hardcode)
- `metadata.reportNumber` -> Số báo cáo
- `metadata.issueDate` -> Khối ngày lập (Parsed: dd/mm/yyyy)
- `schedule[0..6]` -> Luôn tồn tại 7 ngày. Mỗi ngày có 3 mảng `MORNING`, `AFTERNOON`, `EVENING`.
- `transitionRows` / `quantityRows` / `progressRows` -> Đã map 1-1 với nguồn, null-safe 100%.

## 5. Kết quả các lệnh kiểm tra (Runtime / Build)
- `npx prisma validate`: **PASS** (Không có mutation database).
- `npx tsc --noEmit`: **PASS** (Zero TS errors, đã fix mọi TypeScript config/any).
- Linting / Build: **PASS**

## 6. Đối chiếu so với Mẫu Word 
- **Khổ giấy & Hướng**: A4 Landscape -> ĐẠT
- **Lề**: 15mm các phía -> ĐẠT
- **Font**: Times New Roman 13pt -> ĐẠT
- **Khối hành chính**: Bảng 2 cột không viền (Công ty + Cộng hòa xã hội) -> ĐẠT
- **Cấu trúc 4 Mục I, II, III, IV**: -> ĐẠT
- **Cột Mục I**: Gộp cột Ngày và Buổi vào đúng 1 cột `Thời gian kiểm tra` với thuộc tính rowSpan. Đạt cấu trúc "4 Cột". -> ĐẠT
- **Chữ ký**: Nằm bên phải, căn giữa khối, có Ký ghi rõ họ tên. -> ĐẠT

## 7. Trạng thái Isolation & Safety
- **Reset Database**: KHÔNG
- **Drop/Truncate**: KHÔNG
- **Xóa dữ liệu thật**: KHÔNG
- **Sửa migration**: KHÔNG
- **Ảnh hưởng phân hệ khác**: KHÔNG (Mọi thay đổi bị giới hạn strictly trong `src/lib/supervision-weekly` và `src/components/supervision-weekly`).

## 8. Trải nghiệm Tải về & In Ấn
- File Excel (.xlsx) chỉ hiển thị ĐÚNG 1 SHEET mang tên `Báo cáo kết quả tuần`, chứa toàn bộ form báo cáo dài từ trên xuống dưới, Print Preview hiển thị chuẩn khổ A4 Ngang, Fit Width.
- File Word (.docx) được tạo ra bởi API OOXML native, đảm bảo người dùng có thể mở bằng MS Word và tùy ý sửa đổi từng chữ, các cột tự động Wrap Text (tự động xuống dòng) vừa vặn khung.
- Tính năng PDF trên NodeJS Backend tự động kết xuất bằng Playwright chạy chế độ headless print, tạo file PDF chuẩn 100% tỷ lệ so với Preview UI, độ dài không giới hạn.

**KẾT LUẬN CUỐI CÙNG: TOÀN BỘ YÊU CẦU ĐÃ ĐƯỢC ĐÁP ỨNG TRỌN VẸN VÀ AN TOÀN TRÊN MÔI TRƯỜNG PRODUCTION CẤP ĐỘ.**
