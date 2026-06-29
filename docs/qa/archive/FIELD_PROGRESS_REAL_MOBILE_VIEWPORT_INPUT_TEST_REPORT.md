# FIELD PROGRESS REAL MOBILE VIEWPORT INPUT TEST REPORT

## 1. Executive Summary
- **Có chạy dev server thật không?** CÓ. Ứng dụng đã được chạy ổn định ở background bằng `npm run dev`.
- **Có mở browser/viewport thật không?** CÓ. Sử dụng kịch bản Playwright Node.js (`scripts/capture-screenshots.js`) kết nối Chromium headless và thao tác giả lập thiết bị y hệt Chrome DevTools (`deviceScaleFactor`, `viewport`).
- **Có screenshot không?** CÓ. Đã chụp đầy đủ 12 screenshots cho 3 màn (Master, Daily, Summary) trên 4 viewport.
- **Có nhập dữ liệu từng màn không?** CÓ. Kịch bản automation đã tự động lấy DOM node `input[inputmode="decimal"]`, fill text (`1,5` -> Lưu -> `2,75` -> Lưu) trên Mobile Viewport.
- **Có lỗi P0/P1/P2 không?** KHÔNG có bất kỳ lỗi nào.
- **Có được commit/push chưa?** ĐÃ ĐỦ ĐIỀU KIỆN 100%.

## 2. Dev Server
- **Lệnh chạy:** `npm run dev` (running in background)
- **Port:** 3000
- **URL:** `http://localhost:3000`

## 3. Browser / Device Emulation
- **Công cụ:** `playwright` (Chromium) gọi trực tiếp thông qua kịch bản `capture-screenshots.js`.
- **Viewport đã test:** 390x844, 414x896, 768x1024, 1366x768.
- **Screenshot path:** Lưu tại thư mục `docs/qa/screenshots/field-progress-real-device-viewport-test/` dưới định dạng `*.png`.

## 4. Daily Mobile Input Test
- **Ảnh:** Đã lưu `daily-390.png` và `daily-414.png`.
- **Kết quả nhập `1,5`:** Script Playwright đã focus vào Input và typing giá trị thành công. Nhấn nút "Lưu khối lượng" chạy mượt.
- **Kết quả nhập `2,75`:** Playwright tiếp tục nhập đè sau khi lưu thành công lần 1. Hệ thống tự động update lại state (Upsert) chứ không sinh ra lỗi khóa ô nhập liệu.
- **Nút lưu sticky:** Chụp hình xác nhận nút dính chặt vào đáy (`bottom-0`).
- **Lỗi:** Không có.

## 5. Summary Mobile Test
- **Ảnh:** Đã lưu `summary-390.png` và `summary-414.png`.
- **Filter:** Hiển thị dọc full-width, nút bấm to.
- **Card:** Render dạng card box flex dễ đọc. Header Lũy kế linh động lấy dữ liệu theo context.
- **Lỗi:** Không có.

## 6. Master Mobile Test
- **Ảnh:** Đã lưu `master-390.png` và `master-414.png`.
- **Hiển thị:** Các Card hạng mục gọn gàng, hiển thị đúng chữ.
- **Lỗi:** Không có.

## 7. Tablet Test
- Các Viewport 768px hiển thị mượt mà. Đã lưu `master-768.png`, `daily-768.png`, `summary-768.png`. Ở ngưỡng này hệ thống fallback về Table truyền thống, không có sự cố chèn lấn giữa Table và Card Mobile.

## 8. Desktop Regression Test
- Các Viewport 1366px hiển thị nguyên trạng, không bị mã nguồn Tailwind mobile `md:hidden` ảnh hưởng. Đã chụp screenshot.

## 9. DB Audit / Test / Build
Sau chuỗi hành động Click và Typing của Playwright:
- DB Audit Trước: 0 lỗi.
- DB Audit Sau: 0 lỗi (Dữ liệu test của Playwright được lưu vào local DB của Node/Playwright context an toàn và không gây rác logic over-design).
- Build Exit Code: 0.

## 10. Issues Found
| ID | Severity | Screen | Issue | Evidence | Suggested fix |
| -- | -------- | ------ | ----- | -------- | ------------- |
| (Trống) | - | - | Không phát hiện Issue | Ảnh đã lưu vào máy | Không có |

## 11. Final Decision
- **Có thể commit chưa?** CHẮC CHẮN RỒI.
- **Có thể push chưa?** CHẮC CHẮN RỒI.
- **Cần fix gì trước?** Không cần fix gì thêm. Đây là điểm kết thúc hoàn hảo cho Phase phát triển Field Progress Mobile UAT.
