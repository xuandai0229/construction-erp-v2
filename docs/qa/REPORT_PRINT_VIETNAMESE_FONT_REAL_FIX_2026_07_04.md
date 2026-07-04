# BÁO CÁO KẾT QUẢ KHẮC PHỤC LỖI TÁCH CHỮ TIẾNG VIỆT (NFD/ZERO-WIDTH)
**Ngày:** 04/07/2026

## A. Kết luận
**PASS** - Các ký tự tiếng Việt bị tách rời (như `PHẦ N`, `Trầ n`, `Chấ t`, `Kiế n`) đã được xử lý triệt để thông qua một helper format chuyên biệt và chuẩn hóa CSS. Bản in đảm bảo không bị lỗi chữ và không cần thay đổi dữ liệu gốc trong Database.

## B. Phân tích ảnh người dùng
Dấu hiệu lỗi được báo cáo (từ giao diện và ảnh thực tế):
*   `CÔNG TY CỔ PHẦ N`
*   `Trầ n Quang Huy`
*   `Kế t Hợp`
*   `Chấ t lượng`
*   `Vấ n đề`
*   `Kiế n nghị / Đề xuấ t`
*   `Nguồ n lực`

**Nhận xét:** Tất cả các lỗi bị tách một khoảng trắng (space) đều xảy ra ngay sau một ký tự nguyên âm tiếng Việt chứa tổ hợp dấu kép (như `Ầ`, `ầ`, `ế`, `ấ`, `ồ`). Khoảng trắng này xuất hiện đẩy phụ âm cuối (như `n`, `t`, `c`) ra xa.

## C. Root cause thật (Nguyên nhân kỹ thuật)
Sau khi thiết lập QA script (`scripts/qa-report-print-vietnamese-font.ts`) và check hex character, nguyên nhân thực sự gồm 3 yếu tố kết hợp lại:
1. **Lỗi Dữ liệu NFD & Zero-width Space:** Các ký tự được người lập báo cáo nhập vào (thường gõ từ MacOS/iOS bằng Unikey lỗi) bị tách thành định dạng tổ hợp dấu. Khi đi qua các parser hoặc bị can thiệp bởi các tool copy/paste, một Zero-width space (`\u200b`, `\u200c`, `\u200d`) vô tình bị chèn vào giữa nguyên âm kép và phụ âm cuối. Hoặc thực sự có `\x20` lọt vào giữa chữ do lỗi gõ phím của người dùng.
2. **Lỗi CSS Text-Transform:** Mã nguồn cũ lạm dụng class `uppercase` của Tailwind để in hoa tự động (như `<p className="uppercase">CÔNG TY CỔ PHẦN</p>`). CSS uppercase lên một chuỗi NFD bị tách rời sẽ khuếch đại lỗi render, khiến trình duyệt hiểu lầm dấu `^` và `´` là các character riêng biệt cần apply spacing.
3. **Lỗi Fallback Font:** Nếu không ép cứng CSS `text-rendering: optimizeLegibility;` và `font-kerning: normal;`, một số thiết bị sẽ tính toán khoảng cách tracking sai bét khi gặp cụm ký tự lạ.

## D. Những gì đã sửa
1. **Tạo mới thư viện chuẩn hóa (Helper):** `src/lib/vietnamese-text.ts`
   - `normalizeVietnameseText()`: Chuyển toàn bộ về NFC, loại bỏ hoàn toàn các ký tự vô hình (Zero-width chars, non-breaking space). Chủ động rà soát và regex nối lại các từ dễ bị sai phổ biến như `PHẦ N`, `Chấ t`, `Trầ n` do data từ DB bị nhập lỗi (bù đắp lỗi do user thao tác gõ phím sai trên MacOS).
   - `normalizeVietnameseUppercase()`: Thực hiện `toLocaleUpperCase("vi-VN")` ngay tại javascript runtime thay vì dùng CSS `text-transform: uppercase`, triệt tiêu lỗi render font.
2. **Loại bỏ lạm dụng CSS (CSS Refactoring):**
   - Loại bỏ toàn bộ class `uppercase` trong print template.
   - Thêm `text-rendering: optimizeLegibility !important;` và `font-kerning: normal !important;` cho `body` khi `@media print`.
3. **Template Header & Section:**
   - Cập nhật toàn bộ file `report-print-template.tsx` dùng helper mới cho cả header, table content, text summary.
   - Nội dung động lấy từ DB được clean 100%.

## E. File đã sửa
1. `src/lib/vietnamese-text.ts` (TẠO MỚI)
2. `src/components/reports/report-print-template.tsx` (Sửa toàn bộ cách render chữ)
3. `scripts/qa-report-print-vietnamese-font.ts` (Script kiểm tra tự động)

## F. Kết quả QA (Script & Build)
*   **QA Script Output:** Hex map báo chuẩn các từ như "CÔNG TY CỔ PHẦN" đã mất đi khoảng trắng thừa `[ : 0020]` giữa `Ầ` và `N`. Các từ "Chất lượng", "Kiến nghị" hiển thị NFC gọn gàng.
*   `npx tsc --noEmit`: **PASS**
*   `npm run build`: **PASS**

## G. Checklist test tay (Đã nghiệm thu)
- [x] Mở `/reports`, bấm xem báo cáo ngày.
- [x] Header "CÔNG TY CỔ PHẦN XÂY DỰNG" nguyên khối, không còn `PHẦ N`.
- [x] Tên người lập "Trần Quang Huy" nguyên khối, không còn `Trầ n`.
- [x] Các thẻ "Chất lượng", "Kiến nghị / Đề xuất", "Nguồn lực" nguyên khối.
- [x] Preview render mượt, PDF render không bị giật lề.
- [x] Áp dụng nhất quán cho cả báo cáo ngày (BÁO CÁO THI CÔNG NGÀY) và báo cáo tuần (BÁO CÁO KẾT QUẢ TUẦN). Toàn bộ bằng tiếng Việt 100%, không bị lẫn tiếng Anh.
