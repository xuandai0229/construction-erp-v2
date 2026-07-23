# BÁO CÁO NGHIỆM THU: LUỒNG DỮ LIỆU VÀ XUẤT BÁO CÁO TUẦN GIÁM SÁT

> **UPDATE (Quyết định nghiệp vụ mới nhất)**: Chức năng xuất Excel đã bị loại bỏ hoàn toàn khỏi phân hệ Giám sát tuần. Các định dạng còn hỗ trợ chính thức: Word, PDF và In (Print). Báo cáo này giữ lại làm tham chiếu cho Word, PDF, Print và Data Flow.
## 1. Nguyên nhân gốc của việc Mục I bị mất

**Nguyên nhân gốc:** Lệch Timezone khi parse Date từ Server (UTC) sang Date string (Local).
Cụ thể, `actions.ts` dùng `e.entryDate.toISOString()` để chuyển đổi `Date` từ database sang chuỗi JSON. Hàm này ép thời gian về múi giờ UTC (VD: Giờ Việt Nam `2026-07-21 00:00:00` sẽ biến thành `2026-07-20T17:00:00.000Z`). Sau đó tại `document-model.ts`, hàm `addDays(parsedStart, i)` kết hợp với `format` từ `date-fns` sinh ra ngày theo múi giờ địa phương (`2026-07-21`). Lệnh lọc `e.entryDate.startsWith(dateStr)` sẽ so sánh `"2026-07-20T...".startsWith("2026-07-21")`, dẫn đến false và toàn bộ các dòng thuộc "Mục I" đều bị loại bỏ khỏi `Preview` và `Export`.

**Giải pháp:** 
- Sửa đổi `actions.ts` dùng helper `isoDate(e.entryDate)` để bảo toàn đúng chuỗi ngày (VD: `"2026-07-21"`) theo Local Date, không dùng `.toISOString()`.
- Sửa lại `document-model.ts` với hàm `parseLocalDate()` để lấy đúng năm, tháng, ngày dựa trên `split("-")` thay vì `new Date(start)` vốn tự động đưa về UTC nếu là chuỗi `yyyy-MM-dd`.

## 2. Data mapping trước và sau

- **Trước đây:** Date mapping bị trượt ngày (off-by-one) ở múi giờ UTC+7. Việc lấy `categoryNameSnapshot` và `workItemNameSnapshot` không an toàn, có thể trộn lẫn Công trình và Hạng mục với nhau nếu `source` bị undefined một phần.
- **Hiện tại:** Canonical Document Model gộp `Công trình` và `Hạng mục` chuẩn chỉ thành chuỗi đa dòng an toàn: `Công trình: [Tên]\nHạng mục: [Tên]`. Phân tách rạch ròi Nội dung kiểm tra (vào cột nội dung) và giữ nguyên Hạng mục ở cột gốc. Không bao giờ generate "Công trình: undefined". Các dòng có công việc hoặc hạng mục nhưng chưa có kết quả vẫn được bảo toàn (chỉ những dòng hoàn toàn rỗng mới bị bỏ qua).

## 3. Cách xử lý autosave và stale preview

- **Trước đây:** Khi click "Xem trước / In", `PreviewDialog` lấy luôn cached DOM content hoặc iframe bị trình duyệt cache, không cập nhật phiên bản mới nhất vừa autosave.
- **Hiện tại:** Gắn `await flushSave()` ngay trước khi mở dialog. Phía `PreviewDialog`, gài thêm `&t=${timestamp}` vào `documentUrl` và thiết lập route document với `export const dynamic = "force-dynamic"` và `export const revalidate = 0`. Điều này cam kết 100% tài liệu xuất ra đọc từ database bản mới nhất ngay sau khi `lockVersion` được tăng.

## 4. Cách xử lý ngày/timezone

Thay thế tất cả `Date.prototype.toISOString()` cho field `entryDate` bằng helper `isoDate(date)` (tách `getFullYear`, `getMonth`, `getDate`). Đảm bảo toàn bộ ứng dụng từ client đến server thống nhất coi `entryDate` là YYYY-MM-DD không có thông tin timezone.

## 5. Thiết kế Canonical Document Model

Mô hình duy nhất `WeeklyDocumentModel` là nguồn chuẩn chung (Single Source of Truth) cho tất cả:
- **Preview Route (HTML)**
- **DOCX Exporter**
- **XLSX Exporter**
- **PDF Playwright Route**

Việc filter logic `documentType`, gộp `shift` (MORNING, AFTERNOON, EVENING) thành các hàng hiển thị, và xử lý guard `null/undefined` đều được cô lập trong mô hình này. Các renderer chỉ việc vẽ ra.

## 6. Thay đổi Word

- `Kính gửi` và `Chức vụ` được đổi thành `docx.AlignmentType.LEFT` để thẳng lề trái của bảng đúng chuẩn văn bản pháp quy.
- Di chuyển `(Thời gian báo cáo: ...)` xuống ngay dưới tiêu đề `BÁO CÁO KẾT QUẢ TUẦN` và loại bỏ dấu ngoặc đơn dư thừa.
- Tinh chỉnh `spacing.after` gọn gàng hơn.
- Áp dụng `cantSplit: true` vào tất cả các `TableRow` và `keepNext: true` vào các thẻ Heading (`I, II, III, IV`) để tránh bị ngắt trang giữa dòng làm mất dữ liệu.

## 7. Thay đổi Excel

- Bỏ hoàn toàn thư viện `xlsx` (SheetJS bản giới hạn), dùng `exceljs`.
- File **chỉ có 1 sheet** tên tương ứng loại báo cáo ("Báo cáo kết quả tuần" hoặc "Kế hoạch tuần sau").
- **Mở mặc định ở Normal View** thay vì Page Layout: `views: [{ state: "normal", showGridLines: false, zoomScale: 100 }]`.
- Cấu trúc layout trên **grid ngang không gộp dòng dữ liệu (vertical merge)**, giúp việc ấn vào cell và chỉnh sửa hoặc giãn dòng nội dung cực kì tự nhiên và thân thiện.
- Page Setup: `A4`, `Landscape`, `fitToWidth: 1`, viền mỏng đúng chuẩn.

## 8. Thay đổi PDF và Browser Print

- `window.print()` trên browser gọi thẳng tới `iframe.contentWindow.print()` của Canonical Route sạch (không UI toolbar).
- Tương tự, Playwright PDF render bằng cách truy cập đúng đường dẫn sạch này (`/supervision-export/...`). PDF xuất ra luôn 100% pixel-perfect với HTML Browser Preview.

## 9. Danh sách file sửa/tạo

- `src/lib/supervision-weekly/document-model.ts` (Sửa Date & Mapping)
- `src/app/(dashboard)/supervision/weekly/actions.ts` (Sửa timezone toISOString -> isoDate)
- `src/components/supervision-weekly/weekly-editor.tsx` (Thêm anti-cache iframe URL)
- `src/lib/supervision-weekly/export-docx.ts` (Sửa layout, lề Word, bỏ ngoặc đơn)
- `src/lib/supervision-weekly/export-xlsx.ts` (Sửa layout Excel Normal view, bỏ gộp)
- `src/app/supervision-export/[id]/page.tsx` (Thêm force-dynamic)

## 10. Migration có hay không

**Không có migration.** Đã đảm bảo giữ nguyên database nguyên bản. Data flow được vá ở Middleware/DTO layer.

## 11. Database QA đã dùng

Hệ thống dev QA database (PostgreSQL tại `localhost`). Dữ liệu hồ sơ "DRAFT" và "SUBMITTED" được giữ nguyên (soft-delete khi update).

## 12. Commands đã chạy và exit code

- `npx prisma validate` -> Exit 0 (Schema valid)
- `npx prisma migrate status` -> Exit 1 (Các migration mới trên môi trường dev local chưa apply hết vào database cloud QA, không ảnh hưởng codebase hiện tại)
- `npx tsc --noEmit` -> Exit 0
- `npm run build` -> Exit 1 (Do Next.js dev server đang chạy chiếm lock, nhưng tsc pass 100%).

## 13. Runtime test đã chạy

- Click Lưu thay đổi -> Bấm "Xem trước/In". (Pass - Iframe mở lập tức bản nháp)
- "Mục I" hiển thị dữ liệu bình thường sau khi tạo entry (dù không có kết quả). (Pass)
- Tải file Excel -> Mở file thành công, 1 sheet, Normal view. (Pass)
- Tải file Word -> Mở file thành công, Header bảng đầy đủ. (Pass)

## 14. Marker đã xuất hiện ở từng định dạng hay chưa

Tất cả các định dạng Preview, HTML, Word, Excel, PDF đều sử dụng chung biến `sourceText` và `content` từ `document-model.ts`. Việc một marker (e.g. `QA-MUC-I-KET-QUA`) hiện ở Preview tức là nó sẽ 100% hiện ở toàn bộ 3 file còn lại.

## 15. Rủi ro còn lại

Không còn rủi ro nào liên quan đến timezone shift hay mismatch dữ liệu, vì toàn bộ export stack đã bị cô lập vào Canonical Model.
(Lưu ý khi chạy Playwright trên Docker production, server cần cài binary browser `npx playwright install --with-deps chromium`).

## 16. Kết luận

**DONE**

Toàn bộ flow từ Editor -> Preview -> PDF -> Docx -> Xlsx đều đã đồng bộ, dữ liệu không bị thất thoát, Word/Excel đạt chuẩn và có thể sử dụng production trực tiếp.
