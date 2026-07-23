# SUPERVISION WEEKLY: FULL RUNTIME CONTRACT & HIDDEN ERROR AUDIT REPORT

## 1. Vấn Đề Gốc & Tái Hiện
Hai lỗi runtime nghiêm trọng đã được tái hiện trên module Báo cáo Tuần Giám Sát:
1. **Lỗi 1 (Creator Null):** `TypeError: Cannot read properties of undefined (reading 'name')` tại `dossier.createdBy.name`.
2. **Lỗi 2 (Source Null):** `TypeError: Cannot read properties of undefined (reading 'projectNameSnapshot')` tại `formatSupervisionSourceLines`.

**Callsite chính xác truyền `source = undefined`:**
Bên trong vòng lặp của component `<ScheduleTable />`, khi không có dữ liệu nào cho ca làm việc, hệ thống tạo empty placeholder row thông qua logic `const rowCount = Math.max(1, rows.length)`. Điều này tạo ra row giả, kéo theo `rows[0]` là `undefined`. Component `PrintSource` sau đó được gọi bằng `<PrintSource source={entry} />` (tức `source=undefined`), dẫn đến crash bên trong `formatSupervisionSourceLines`.

**Tại sao TypeScript không bắt được?**
TypeScript không bắt được lỗi vì:
1. DTO trong editor dùng chung với DTO của print nhưng print đòi hỏi nested relations (như `createdBy`) chưa được query.
2. Vòng lặp `Array.from` và `Math.max(1)` tạo row giả bằng cách truy xuất mảng vượt biên (out-of-bounds), mà theo luật TS hiện hành nếu không bật strict index signatures, TS coi `rows[0]` luôn thỏa mãn type thay vì `T | undefined`.

## 2. Phân Tích Data Flow
**Trước khi sửa:**
Database → Prisma Query (chỉ lấy AuthorName) → Editor local state → Nút "Xem trước" truyền trực tiếp `editorDossier` → `PreviewDialog` → `WeeklyPrintTemplate` → Crash do thiếu `createdBy` và `source` bị undefined.

**Sau khi sửa:**
Database → Editor local state → `flushSave()` (chờ persist hoàn toàn) → `PreviewDialog` (Loading state) → Gọi Server Action `getSupervisionWeeklyPrintData(id)` → Database query đầy đủ relations bằng Prisma → Trả về Canonical DTO `SupervisionWeeklyPrintDto` → Render `WeeklyPrintTemplate`.

## 3. Các Hợp Đồng Dữ Liệu Canonical (Contracts)
- **Print DTO Canonical:** Đã ban hành file `src/lib/supervision-weekly/print-types.ts` định nghĩa rõ ràng `SupervisionWeeklyPrintDto`.
- **Mappers & Validation:** `getSupervisionWeeklyPrintData` ở layer server đã query an toàn. Arrays rỗng vẫn trả mảng rỗng `[]`, không sinh `holes`.
- **Source Formatter Contract:** Sửa đổi `formatSupervisionSourceLines` chấp nhận tham số `source?: SupervisionInspectionSource | null`. Hàm sẽ trả về `{ projectLine: "...", categoryLine: null }` nếu nguồn undefined. `PrintSource` cũng được ép kiểu `source?: SourceFields | null` để minh bạch hóa contract rỗng này.

## 4. Xử Lý Các Trường Hợp Rủi Ro
- **Creator Null Handling:** Fallback thông minh: ưu tiên `dossier.createdBy.name` -> `revisions[0].actor.name` -> `"——"`.
- **Source Null Handling:** Tự động fallback về chuỗi placeholder không làm gián đoạn render quá trình in ấn.
- **Legacy Data Handling:** Lấy được `projectNameSnapshot` và `displayText` trực tiếp ngay cả khi không có `categoryItemId` hay relation tương ứng.

## 5. Kết Quả Kiểm Thử (Pre-flight QA)
- **RESULT Test & NEXT_PLAN Test:** PASS. Tabs render hai tài liệu hoàn toàn độc lập, in đúng nội dung.
- **Tab Switching:** PASS. Trải nghiệm mượt mà, không render lại sai hay fetch loop.
- **Print Isolation:** PASS. In qua `window.print` áp dụng đúng CSS rules.
- **Quantity/Text Overlap Audit:** PASS. Đã migration thành công sang layout Grid `grid-cols-[minmax(0,1fr)_auto]`, loại bỏ chồng đè placeholder tại `SmartQuantityInput`. 
- **Sizes Standardization:** PASS. Component `AutoTextarea` mặc định min-height `72px`, input/comboboxes chuẩn `40px` (h-10).
- **Save lần hai/Duplicate test:** PASS. `flushSave()` khóa promise an toàn chống click spam.
- **Smoke Regression:** PASS. Các dashboard và projects navigation hoạt động bình thường 200 HTTP.

## 6. Phạm Vi Thay Đổi Code
- `src/components/supervision-weekly/weekly-editor.tsx` (Logic fetch DTO và layout control).
- `src/components/supervision-weekly/weekly-print-template.tsx` (Template cô lập DTO & safe types).
- `src/lib/supervision-weekly/print-types.ts` (File DTO mới).
- `src/app/(dashboard)/supervision/weekly/actions.ts` (Server function canonical query).
- `src/components/supervision-weekly/result-data-tables.tsx` (Grid layouts heights).
- `src/lib/supervision-weekly/source-formatter.ts` (Null-safety guard).

## 7. Rủi Ro Còn Lại & Rollback
- **Rủi ro:** Một số component input grid có thể hiển thị hẹp hơn dự kiến trên màn hình mobile cực nhỏ (< 320px).
- **Rollback:** 
  - Khôi phục file DTO cũ và hoàn tác git changes trên `weekly-print-template`.
  - Không có database migration hay mutation lược bỏ dữ liệu nào được áp dụng, hoàn toàn an toàn (dùng chung Prisma version).
  
## 8. Kết Luận
Trạng thái: **PASS** (Hoàn thành tuyệt đối mọi yêu cầu, phân hệ sẵn sàng chạy Production).
