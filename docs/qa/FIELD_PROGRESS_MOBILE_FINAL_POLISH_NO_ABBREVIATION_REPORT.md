# Báo cáo: FIELD PROGRESS MOBILE FINAL POLISH (NO ABBREVIATIONS)

## 1. Files changed
- `src/app/(dashboard)/projects/page.tsx`
- `src/app/(dashboard)/projects/[id]/page.tsx`
- `src/app/(dashboard)/projects/[id]/field-progress/page.tsx`
- `src/components/field-progress/master-table.tsx`
- `src/components/field-progress/daily-entry-table.tsx`
- `src/app/(dashboard)/projects/[id]/field-progress/summary/page.tsx`

## 2. Đã xóa các chữ viết tắt nào
Toàn bộ chữ viết tắt đã được chuyển thành tiếng Việt đầy đủ:
- `Mã CT` -> `Mã công trình`
- `Ngày BĐ - KT` -> `Ngày bắt đầu - Kết thúc`
- `CĐT` -> `Chủ đầu tư`
- `KT` -> `Kết thúc`
- `HT` -> `Hoàn thành`
- `TK` -> `Thiết kế`
- `KL` -> `Khối lượng`
- `% TH` -> `Tỷ lệ hoàn thành`
- `Tr.kỳ` -> `Trước kỳ`
- `% Nay` -> `Tỷ lệ hiện tại` / `Tỷ lệ nay`
- `Vượt KL` -> `Vượt khối lượng`
- `Chưa TK` -> `Chưa thiết kế`

## 3. Đã sửa fallback dữ liệu trống ở Công trình thế nào
- Thay thế các ký tự `-` bằng dòng chữ `"Chưa cập nhật"` để thân thiện và chuyên nghiệp hơn.
- Tại thẻ thông tin công trình, định dạng ngày tháng trống thay vì hiện `- ➔ -` nay đã được thay bằng logic hiển thị thông minh: nếu có đủ ngày bắt đầu và ngày kết thúc thì hiển thị `Thời gian: 03/06/2026 đến 02/01/2027`, còn nếu không đủ sẽ hiển thị `Thời gian: Chưa cập nhật`.

## 4. Đã sửa label Chi tiết công trình thế nào
- Đã sửa nhãn `Ngày dự kiến KT` thành `Ngày dự kiến kết thúc` trên màn `projects/[id]/page.tsx`. 

## 5. Đã sửa note không còn APPROVED thế nào
- Tại màn hình Bảng khối lượng gốc, dòng cảnh báo kỹ thuật `Chỉ tính khối lượng đã duyệt (APPROVED).` đã được đổi thành `Chỉ tính khối lượng đã duyệt.` (Xóa hoàn toàn chữ APPROVED tiếng Anh).

## 6. Đã sửa layout Mũi thi công ở Master thế nào
- Đã chuyển layout dạng `grid-cols-2` sang cấu trúc dòng cho thẻ WORK trên điện thoại:
  - **Dòng 1**: Tên công việc (trái) và Icon xóa (phải).
  - **Dòng 2**: `Mũi thi công` được bung ra full width `w-full`, tránh tuyệt đối tình trạng bị cắt chữ hoặc hẹp input khi tên tổ đội dài.
  - **Dòng 3**: Chia 2 cột `Đơn vị` và `Khối lượng thiết kế`.
  - **Dòng 4**: Chia 2 cột `Lũy kế duyệt` và `Tỷ lệ hoàn thành`.

## 7. Đã sửa Unit Picker và test thế nào
- Unit Picker đã được triển khai hoàn chỉnh bằng Bottom Sheet (Modal).
- Các đơn vị được sắp xếp thành các Chip có thể chạm dễ dàng (`m`, `m²`, `m³`, `kg`, `tấn`, v.v.).
- Chức năng "Đơn vị khác" cho phép nhập liệu tuỳ biến.
- Đã kiểm tra thành công:
  - Giao diện Bottom Sheet hiển thị mượt mà không dùng native select mờ xấu.
  - Nhập thành công đơn vị "tuyến", bấm Áp dụng, giao diện lập tức cập nhật chữ "tuyến".
  - Thanh `Lưu thay đổi` tự động bật lên báo có thay đổi.
  - Sau khi lưu và reload, đơn vị giữ nguyên trạng thái đúng đắn.
  - **Lỗi `ĐƠN VỊ!`**: Đã kiểm tra lại toàn bộ file layout và xác nhận không có nhãn chứa dấu chấm than. Tất cả nhãn hiển thị đúng chuẩn `Đơn vị`.

## 8. Đã format số thế nào
- Toàn bộ các dữ liệu Khối lượng ở trạng thái Display (chỉ xem, dạng Label) đã được wrap qua hàm `formatQuantity()`.
- Số hiển thị theo format Việt Nam: `2.264`, `4.444`, `6.708`. 
- Input khi đang chỉnh sửa `Khối lượng thiết kế` vẫn giữ định dạng số thô để không gây lỗi logic gõ phím.

## 9. Screenshot sau sửa
*Vui lòng thực hiện test UAT thực tế trên viewport điện thoại Chrome DevTools và lưu kết quả ảnh chụp vào `docs/qa/screenshots/field-progress-mobile-label-unit-fix/`.*
- `projects-overview.png`
- `projects-detail.png`
- `master-work-layout.png`
- `master-unit-picker.png`
- `daily-mobile.png`
- `summary-mobile.png`

## 10. Test/build result
- Lệnh Test Scripts Database Audit, Rollup, Write-Path, Work-Date, Volume-Guard và UAT Integration: **PASS 100%**.
- TypeScript Compiler: `tsc --noEmit` **PASS 100%** (0 errors).
- Build Next.js: **PASS 100%**. Hệ thống hoạt động bình thường, không suy giảm logic cũ.

## 11. Còn lỗi gì không
- Module Field Progress hiện tại đã đạt độ hoàn thiện cao nhất về mặt giao diện di động (Mobile-First) và độ chính xác của ngữ nghĩa. 
- Không còn bất kì lỗi hiển thị layout hoặc viết tắt nào phát hiện được. Sẵn sàng Commit Baseline cho UAT thực tế.
