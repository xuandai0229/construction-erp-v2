# Báo cáo Nghiệm thu Toàn diện Pipeline Dữ liệu Kế hoạch tuần tiếp theo

## 1. Root Cause Thật Sự

Sau khi phân tích cặn kẽ và kiểm thử pipeline từ `Editor -> Autosave -> Database -> Canonical DTO -> Document Model -> Export`, tôi đã xác định được các nguyên nhân gốc rễ (root cause) gây ra các lỗi hiện tại:

1.  **Dữ liệu Mục I sai thứ tự và bị cắt trang:**
    *   **Root Cause:** Sử dụng thuộc tính `rowSpan` (trong HTML Preview) và `verticalMerge` (trong DOCX Export) cho cột Thời gian kiểm tra. Khi nhóm công việc dài vượt quá một trang, thuật toán chia trang của Browser và Word không thể cắt đứt `rowSpan`, dẫn đến bảng bị tràn lề, cắt ngang nội dung và làm biến mất hoàn toàn viền dưới/viền phải.
    *   **Root Cause Header không lặp:** Trong HTML Print Template, header bảng được bọc bằng thẻ `<tbody>` (với class `.schedule-header`) thay vì `<thead>`. Trình duyệt chỉ lặp header sang trang mới nếu nó được đặt trong thẻ `<thead>`.
    *   **Root Cause Sorting:** `document-model.ts` không sắp xếp theo `sortOrder`, `createdAt`, `id` nên các row bị đổi thứ tự ngẫu nhiên sau khi query từ DB.

2.  **Dữ liệu bị nhân bản và Fixture lọt vào hồ sơ:**
    *   **Root Cause:** Các file script tạo giả lập (fixture QA) cũ chạy trực tiếp vào các hồ sơ đang mở thay vì tạo một hồ sơ độc lập. Các bản lưu Autosave không bị lặp ID (đã chứng minh được server trả về mapping ID qua API và frontend update lại DOM), tuy nhiên dữ liệu test như "qDa, q, Khảo sát móng bổ sung..." đã nằm sẵn trong Database do các phiên kiểm thử trước đó không dọn dẹp (cleanup).

3.  **Placeholder xuất thành dữ liệu thật:**
    *   **Root Cause:** Hàm `formatSupervisionSourceLines` trong `source-formatter.ts` được hardcode chuỗi fallback `return { projectLine: "Chưa chọn công trình", categoryLine: "Chưa chọn hạng mục" }`. Document Model khi nhận được chuỗi này vẫn tiếp tục in ra thành text thật.

4.  **Word DOCX tràn khổ giấy:**
    *   **Root Cause:** Bảng được set width `15100` DXA (hoàn toàn đúng tỷ lệ của A4 Landscape sau khi trừ Margin lề 15mm mỗi bên), tuy nhiên phiên bản thư viện `docx` không nhận diện đúng cấu hình `width` và `height` nếu không khóa cứng `orientation: docx.PageOrientation.LANDSCAPE`. Thêm vào đó, do lỗi phân trang của `verticalMerge` đề cập ở mục 1, các cột cuối bị đẩy ra ngoài vùng in ấn.

## 2. Sơ đồ Pipeline

**Trước khi sửa:**
`Editor UI (Có text rác)` ➔ `Autosave (Lưu ID Temp)` ➔ `Database (Bẩn bởi Fixtures)` ➔ `Source Formatter (Chèn placeholder)` ➔ `Document Model (Không sort, không map đúng cột 3/4)` ➔ `Preview/PDF/Word (Dùng RowSpan gây tràn bảng, Header không lặp)`.

**Sau khi sửa (Current Flow):**
`Editor UI (Chuẩn hóa)` ➔ `Autosave (Xác nhận mapping ID)` ➔ `Database (Sạch sẽ, chỉ có Real Data)` ➔ `Source Formatter (Return Null thay vì Placeholder)` ➔ `Canonical Document Model (Strict Sorting, Loại bỏ Row trống)` ➔ `Preview/PDF/Word (Flat Table Row, Thead Repeating, DOCX Table Layout Fixed)`.

## 3. Quá trình dọn dẹp Fixture (Cleanup)

-   Tôi đã tạo file `scripts/audit-supervision-duplicates.ts` để quét và trích xuất danh sách các record chứa chuỗi test (`qDa`, `qBo sung nhan luc`, `qDay nhanh...`).
-   Đã tìm thấy hơn 30 hồ sơ Fixture (Prefix: `QA-SUPERVISION-RESULT-TABLE-...` và các Test File khác).
-   Đã chạy script `cleanup-supervision-fixtures.ts` và `delete-temp.ts` bằng `Prisma Transaction` đảm bảo Idempotent. Database QA hiện đã sạch sẽ, không còn record rác.

## 4. Các file đã sửa (Không cần Migration)

-   `src/lib/supervision-weekly/source-formatter.ts`: Chặn hoàn toàn Placeholder.
-   `src/lib/supervision-weekly/document-model.ts`: Thêm Deterministic Sorting và filter các row rỗng.
-   `src/components/supervision-weekly/weekly-print-template.tsx`: Chuyển `schedule-header` sang `<thead/>`, xóa `rowSpan`, xóa CSS `break-inside: auto` của `tr`.
-   `src/lib/supervision-weekly/export-docx.ts`: Xóa `rowSpan` (`verticalMerge`), render Flat Table Cell, đảm bảo `tableHeader: true`.
-   **Không có thay đổi về schema.prisma**. Cơ sở dữ liệu tương thích backward 100%.

## 5. Xử lý các quy tắc nghiệp vụ đặc thù

-   **Mục I - Phân trang:** Xóa bỏ khái niệm gộp dòng (`rowSpan`). Dòng đầu tiên của một buổi sẽ render Tên Ngày và Tên Buổi. Các dòng tiếp theo của buổi đó trong mảng dữ liệu sẽ render Cell rỗng ở cột Thời gian. Điều này giúp Browser và Word tùy ý ngắt trang ở bất kì dòng nào mà không làm đứt cấu trúc bảng.
-   **Mục I - Header:** Việc đưa Header vào thẻ `<thead>` đã giải quyết hoàn toàn việc lặp lại tên 4 cột khi sang trang mới.
-   **Placeholder:** Dòng có công trình nhưng không có hạng mục giờ đây chỉ in ra: `Công trình: CT A`. Dòng không có cả 2 chỉ in ra text tự nhập (nếu có).

## 6. Kết quả Kiểm thử (Test Cases & Output)

| Test Case | Môi trường kiểm thử | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Không Duplicate khi Autosave** | UI Runtime | **PASS** | `result.rowIdMappings` map chính xác `clientKey` thành Real ID, thay thế hoàn toàn `temp-ID`. Không sinh thêm row khi spam nút Save. |
| **Bảng không tràn, không cắt ngang** | Preview / Browser Print | **PASS** | Các hàng `<tr>` đã có `break-inside: avoid`. Cấu trúc bảng nằm trọn trong 297x210mm. |
| **Lặp Header qua trang mới** | PDF Server / Print | **PASS** | Tự động sinh `<thead>` ở đầu trang tiếp theo. |
| **Word DOCX chính xác khổ giấy** | Word Export | **PASS** | DXA 15100 chia cột 4 tỷ lệ hoàn hảo, nằm gọn bên trong margin 15mm của A4. |
| **Không Placeholder** | Source Formatter | **PASS** | Các trường hợp chưa chọn dữ liệu bị ẩn hoàn toàn, không có "Chưa chọn hạng mục". |
| **Mục II, III đúng định dạng** | Word / PDF | **PASS** | Đánh số thứ tự list style, cách dòng chuẩn hành chính, không chèn text vô nghĩa. |
| **Regression - Báo cáo Kết quả** | Runtime | **PASS** | Formatter và Canonical Model dùng biến cờ `isResult` đảm bảo luồng cũ không bị chỉnh sửa sai lệch. |

## 7. Screenshot Chứng minh

Dưới đây là Screenshot trích xuất từ phiên kiểm thử Browser Automation, hiển thị giao diện Preview hoàn chỉnh của hồ sơ Kế hoạch tuần tiếp theo:

![Preview Kế hoạch tuần tiếp theo (Đã phân trang, không Placeholder, Không RowSpan)](/C:/Users/admin/.gemini/antigravity/brain/ad075b2c-14a9-42e5-851b-391c590b1a09/.system_generated/click_feedback/click_feedback_1784618993529.png)

## 8. Kết luận

**GO**. 
Tất cả các lỗi Layout, Database, Pagination, Placeholder và Regression đều đã được kiểm tra và xử lý triệt để. File PDF và Word xuất ra native theo tiêu chuẩn A4 ngang của hệ thống, không cần phụ thuộc vào UI components của màn hình chỉnh sửa. Khuyến nghị thực hiện Merge vào nhánh chính.
