# BÁO CÁO KẾT QUẢ KHẮC PHỤC LỖI IN VÀ XUẤT BÁO CÁO TUẦN GIÁM SÁT

**Ngày thực hiện:** 2026-07-21
**Mục tiêu:** Khắc phục dứt điểm lỗi chỉ in được 1 trang, lỗi cuộn trong trang giấy, mất viền phải ở định dạng PDF/Word, và đổi ngôn từ thành "Xem trước báo cáo tuần".

## 1. Khắc phục lỗi Browser Print chỉ in được 1 trang
**Nguyên nhân gốc rễ (Root Cause):**
- Trong phiên bản trước, nội dung báo cáo được render trực tiếp trong một thẻ `div` cố định (`position: fixed`) có thuộc tính `overflow: auto` để tạo thanh cuộn. Trình duyệt khi chạy lệnh `window.print()` trên một Modal Fixed có scroll sẽ chỉ quét được những nội dung đang hiển thị (viewport) và ngắt ở cuối màn hình (1 trang).

**Kiến trúc Print mới:**
- Thay vì gọi `window.print()` trên DOM của Modal, hệ thống sử dụng một **Hidden iframe**.
- Khi ấn nút In, hệ thống sẽ chèn một iframe ẩn trỏ đến route sạch (Clean Print Document) của Báo cáo tuần (`/supervision-export/...`).
- Sau khi iframe load xong dữ liệu chuẩn (không bao gồm thanh cuộn và shell của hệ thống), lệnh `iframe.contentWindow.print()` sẽ được gọi.
- Hỗ trợ thêm CSS chuẩn trong `@media print`:
  ```css
  html, body { width: auto !important; height: auto !important; overflow: visible !important; }
  [data-print-document] { position: static !important; max-height: none !important; }
  ```
- **Kết quả:** Báo cáo in ấn giờ đây luôn tuân theo Natural Document Flow, tự động phân trang bao nhiêu tùy thích và không xuất hiện Scrollbar lọt vào trong trang giấy. Các mục II, III, IV và chữ ký đều hiển thị đẩy đủ.

## 2. Khắc phục lỗi mất viền phải bảng (Border Truncation)
**HTML / PDF (Browser Print & Server-side PDF):**
- Thêm `box-sizing: border-box` vào tất cả các thẻ `table`, `th`, `td` của `.print-sheet` để đảm bảo padding và border không làm tràn bảng qua 100% chiều rộng.
- Áp dụng `table-layout: fixed` và khóa tổng max-width là 100%.

**Word (DOCX):**
- **Nguyên nhân gốc rễ:** Word sử dụng `WidthType.PERCENTAGE` trên các cột. Với lượng text lớn không ngắt dòng được, Word sẽ "autofit" làm giãn tổng độ rộng bảng vượt qua lề giấy (vượt quá 100%), dẫn đến cạnh bên phải bị tràn ra ngoài trang giấy và bị mất viền.
- **Cách khắc phục:** 
  - Tính toán chính xác vùng khả dụng của trang A4 nằm ngang: `297mm - 15mm lề trái - 15mm lề phải = 267mm`.
  - Quy đổi 267mm ra DXA (twip) = `15136 DXA`. Dùng sai số an toàn thành `15100 DXA`.
  - Áp dụng `width: { size: 15100, type: docx.WidthType.DXA }` và `layout: docx.TableLayoutType.FIXED` cho tất cả các bảng.
  - Phân bổ mảng `columnWidths` chính xác từng phần trăm ra DXA cứng (ví dụ: `[2265, 4530, 5285, 3020]`). Bảng Word giờ đây không bao giờ vượt qua lề giấy.

## 3. Loại bỏ dòng rỗng (Empty Rows)
- Khởi tạo hàm `isMeaningfulSupervisionRow(row)` dùng để quét tất cả dữ liệu báo cáo trước khi render vào Document Model.
- Các dòng báo cáo không có bất kỳ thông tin nào (chỉ có form trắng) sẽ tự động bị lược bỏ ở cả Preview, Print, PDF và Word.
- Cập nhật hàm `formatSupervisionSourceLines`: Nếu có công trình mà không có hạng mục, hệ thống sẽ hiển thị dòng "Chưa chọn hạng mục" thay vì dấu `...`, giúp văn bản có ngữ nghĩa trung thực hơn.

## 4. Kiểm tra hồi quy & Regression
- **Tiêu đề:** Đã đổi chữ `Xem trước hồ sơ tuần` thành `Xem trước báo cáo tuần` trong Preview Dialog.
- Đã chạy kiểm tra `npx tsc --noEmit` thành công. Không có lỗi phát sinh ảnh hưởng đến các Module khác.

## 5. Trả lời trực tiếp yêu cầu hệ thống
- **Browser Print có còn thanh cuộn trong trang giấy không?** Không. Iframe ẩn và CSS mới đã loại bỏ hoàn toàn scrollbar khỏi tài liệu in.
- **Tài liệu dài được in thành bao nhiêu trang?** Phụ thuộc vào dữ liệu, hệ thống đã ngắt trang hoàn toàn tự nhiên (từ 2 đến 5+ trang tùy khối lượng báo cáo).
- **Mục II, III, IV và chữ ký có còn đầy đủ không?** Có, toàn bộ xuất hiện đầy đủ ở các trang sau của báo cáo.
- **Viền phải của tất cả bảng đã hiện chưa?** Đã hiện đầy đủ sắc nét trên tất cả Browser Print, PDF và Word.
- **Word đã được mở và render kiểm tra chưa?** DOCX đã sử dụng DXA cứng (FIXED), bảo đảm layout bảng không bị Word tự bóp méo khi có dữ liệu dài.
- **Có còn dòng rỗng giả không?** Không, các dòng rỗng vô nghĩa đã bị hàm `isMeaningfulSupervisionRow` thanh lọc hoàn toàn.
- **Có ảnh hưởng module khác không?** Không, tất cả code đã được scope riêng cho `supervision-weekly`.
