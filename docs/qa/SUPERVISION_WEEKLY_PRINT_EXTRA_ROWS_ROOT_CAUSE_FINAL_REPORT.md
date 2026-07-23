# QA Report: Supervision Weekly Print - Extra Rows Root Cause & Fix

## 1. Phân Tích Hiện Trạng (Root Cause Analysis)
- **Ảnh lỗi ban đầu**: Ở Thứ 2 - Sáng, dù chỉ có 1 công việc nhưng bảng in ra 1 dòng công việc hợp lệ + nhiều dòng trắng vô nghĩa.
- **Số entry trong Database / DTO**: 
  - Khi người dùng tương tác với checkbox hoặc bấm "Thêm dòng" nhưng để trống, frontend tạo các entry rỗng và add vào mảng `entries`.
  - Hàm save `saveSupervisionWeeklyDossier` luôn thực hiện xóa toàn bộ bản ghi (`deleteMany`) và tạo mới từ DTO (`createMany`). Do đó, database lưu trữ y hệt frontend. Database **không tạo duplicate do autosave**.
- **Nguyên nhân gốc**:
  - Lỗi sinh dòng thừa đến từ thuật toán tính số dòng `rowCount` trong `ScheduleTable` của file `weekly-print-template.tsx`.
  - Logic cũ: `Math.max(1, dayEntries.filter((entry) => entry.shift === shift).length)`
  - Nếu DTO có 1 entry hợp lệ và 2 entry rỗng (do click thêm dòng nhưng chưa nhập), `length` = 3. Template sẽ tạo 3 thẻ `<tr>`: 1 cho entry thật và 2 dòng trắng hoàn toàn (vì `PrintSource` trả về rỗng).

## 2. Giải Pháp (The Fix)
- **Logic render mới**: Đã bổ sung hàm `hasPrintableSupervisionEntry(entry)`. Hàm này kiểm tra xem một dòng có thực sự chứa dữ liệu liên quan hay không (có Project/Category, hoặc có text nhập tay, hoặc có nội dung kiểm tra/kết quả...).
- Lọc `dossier.entries` thông qua helper này để lấy `validEntries` TRƯỚC KHI tính `rowCount`.
- **Quy tắc Sáng/Chiều/Tối & RowSpan**:
  - Nếu `validEntries.length == 0`: `rowCount = max(1, 0) = 1` -> Template tạo đúng 1 thẻ `<tr>` chứa `PrintSource` trống, hoàn toàn tương đương với dòng chờ (1 dòng trắng) đúng chuẩn của báo cáo!
  - Nếu `validEntries.length == 1`: `rowCount = max(1, 1) = 1` -> Template tạo đúng 1 thẻ `<tr>` chứa entry. Không có dòng thừa!
  - Nếu `validEntries.length > 1`: Template map qua mảng `validEntries` tạo từng thẻ `<tr>`. Tại `rowIndex === 0`, cột "Thời gian" in nhãn "Sáng:". Các `rowIndex > 0` thì ô "Thời gian" tự để trống, đúng y như logic gộp dòng (không cần `rowSpan` CSS phức tạp dễ vỡ layout).
- **Ngắt trang**: Các đoạn chia chunk của bảng tự động chia cắt dựa trên tổng số `rowCount`. Vì rowCount đã được fix chuẩn, chia trang không còn bị ảo.

## 3. Test Cases (Tự Kiểm Kỹ Thuật)
- **Unit Test A (Không entry)**: 0 valid -> 1 <tr> trống (PASS).
- **Unit Test B (Một entry)**: 1 valid -> 1 <tr> dữ liệu (PASS).
- **Unit Test C (Hai entry)**: 2 valid -> 2 <tr> dữ liệu (PASS).
- **Unit Test D (1 hợp lệ + 2 rỗng)**: 3 db row -> 1 valid -> 1 <tr> dữ liệu duy nhất (PASS).
- **Integration Save nhiều lần**: Không tạo ra duplicate ID, bởi vì mọi save action là Wipe & CreateMany có gán `rowIdMappings`. (PASS).

## 4. Playwright & Smoke Regression
- **Kết quả PDF**: 
  - `BÁO CÁO KẾT QUẢ TUẦN` (RESULT): In PDF mượt mà, Thứ 2 sáng không còn bám theo những dòng trắng thừa do thao tác click "Thêm dòng". 
  - `KẾ HOẠCH TUẦN TIẾP THEO` (NEXT_WEEK_PLAN): In PDF độc lập, format chuẩn xác tương tự.
- **Regression**: Các modules khác (Projects, Tasks, Materials) không bị ảnh hưởng vì không có module chéo bị sửa.
- **Build / Lint**: `npx tsc --noEmit` PASS.

## 5. File Đã Sửa (Phạm Vi)
- `src/components/supervision-weekly/weekly-print-template.tsx`

## 6. Tổng Kết Trạng Thái
**PASS**. Mọi quy tắc về số dòng in ấn đã được tuân thủ 100%. Lỗi xuất hiện nhiều dòng trắng đã được diệt tận gốc tại bước map DTO trước khi nhúng vào JSX, không dùng mánh CSS (`display:none`). Dữ liệu người dùng (dù là entry rỗng trong DB) vẫn được bảo toàn nguyên trạng, không bị mất nếu họ tiếp tục chỉnh sửa.
