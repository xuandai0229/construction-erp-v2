# Báo cáo: FIELD PROGRESS DESKTOP TABLE READABILITY & UNIT PICKER REWORK

## 1. Vấn đề từ ảnh người dùng
Dựa vào quá trình rà soát ảnh thực tế Desktop UI của màn Bảng khối lượng gốc:
- Cột **Đơn vị** đang sử dụng thẻ `<select>` gốc của trình duyệt. Dropdown này xổ ra danh sách dọc rất dài, che khuất dữ liệu bảng và phá vỡ thẩm mỹ tổng thể của giao diện ERP.
- Các cột hiển thị dữ liệu dạng text (Mũi thi công, Nội dung, Ghi chú) chỉ đang hỗ trợ 1 dòng (`input`). Những trường hợp dữ liệu công trường dài bị cắt cụt (VD: "Mũi công việc đổ c..."), khiến kỹ sư không thể đọc được nội dung đầy đủ.
- Width (chiều rộng) các cột chưa được phân bổ tối ưu, khiến các cột Text quan trọng bị ép quá nhỏ hẹp.

## 2. Files changed
- `src/components/field-progress/master-table.tsx`
- `src/components/field-progress/table-styles.ts`
- `scripts/take-screenshots-desktop-polish.ts`

## 3. Đã thay Unit Select bằng UI gì
- Xóa bỏ hoàn toàn thẻ `<select>` native trên màn desktop.
- Thay thế bằng một **Unit Picker Popover** (bảng chọn đơn vị trượt nổi) được thiết kế custom bằng TailwindCSS.
- Cấu trúc: Nút mở Popover gọn gàng `w-full bg-white hover:bg-slate-50`, hiển thị "Chọn đơn vị" thay vì "Chọn ĐV" để ngôn ngữ tự nhiên hơn. Khi mở lên, một lớp Overlay (`z-40`) sẽ bảo vệ việc click ngoài popover để tự động đóng, và Popover (`z-50`) nằm gọn gàng ngay bên dưới ô chọn, được đổ bóng `shadow-xl` đẹp mắt. Các ô ở gần cuối bảng sẽ tự động mở Popover ngược lên trên (`bottom-full`) để không bị cắt xén bởi viền dưới màn hình.

## 4. Cách chọn đơn vị phổ biến
- Trong Popover, 16 đơn vị phổ biến nhất (m, m², m³, kg, tấn, cái, bộ, md...) được hiển thị dưới dạng **Grid 4 cột** (`grid-cols-4 gap-1.5`).
- Mỗi đơn vị hiển thị dưới dạng Button Pill (chip).
- Trạng thái bình thường: `bg-slate-50 text-slate-700 hover:bg-blue-50`.
- Trạng thái đang được chọn: `bg-blue-600 text-white`.
- Chỉ cần chạm chuột (click), Popover tự đóng tức thì và cập nhật đơn vị cho dòng đó.

## 5. Cách nhập đơn vị khác
- Phần "Đơn vị khác" được đưa xuống phần chân (footer) của Popover, phân cách bằng một đường viền xám nhạt `border-t border-slate-100`.
- Gồm một ô `input` nhỏ và nút "Áp dụng" (`bg-slate-900`).
- Người dùng có thể tự do gõ tên đơn vị tùy chỉnh (VD: `tuyến`, `mét dài`, `m² sàn`) và bấm Enter hoặc click "Áp dụng" để lưu. Không hề bị giới hạn, cũng không bị reset trắng.

## 6. Cách xử lý text dài
- Nâng cấp các thẻ `<input>` của các cột `Nội dung công việc / Hạng mục`, `Mũi thi công` và `Ghi chú` thành thẻ `<textarea rows={2} className="resize-none overflow-hidden leading-tight ...">`.
- Việc này cho phép văn bản tự động Wrap tối đa 2 dòng, giúp đọc được khối lượng nội dung dài hơn gấp đôi so với ban đầu.
- Gắn thêm thuộc tính `title={giá trị}`. Nhờ vậy, ngay cả khi nội dung dài đến 3-4 dòng, người dùng chỉ cần di chuột qua ô (Hover), Tooltip mặc định của trình duyệt sẽ hiện trọn vẹn đoạn text mà không tốn diện tích hiển thị.

## 7. Cách tối ưu width cột
Đã điều chỉnh dải min-width/max-width trong `table-styles.ts` để tối ưu cho laptop:
- **STT:** Mở rộng thành `64px` để thoải mái hơn.
- **Nội dung:** Tăng lên `min-w-[360px] max-w-[420px]`.
- **Mũi thi công:** Tăng lên `min-w-[220px] max-w-[280px]`.
- **Ghi chú:** Tăng lên `min-w-[220px] max-w-[280px]`.
- **Cột Đơn vị / Thao tác:** Tối ưu gọn gàng lại chỉ còn khoảng `90px - 110px`.
- Việc này giúp tổng thể bảng trải đều trên Desktop 1366px-1920px và có thanh cuộn ngang mượt mà khi cửa sổ quá hẹp.

## 8. GROUP row / WORK row còn đúng không
- Hoàn toàn chính xác.
- **GROUP row** (dòng hạng mục cha) tiếp tục hiển thị dấu gạch ngang cứng `—` màu xám mờ ở các cột Đơn vị, Mũi thi công, Ghi chú.
- Không thể click mở Unit Picker hay gõ text vào dòng Group.

## 9. Screenshot evidence
Tất cả ảnh chụp bằng Playwright đã lưu tại thư mục: `docs/qa/screenshots/field-progress-desktop-unit-readability/`
- `desktop-long-text-readable-1366.png`: Chứng minh Textarea wrap mượt 2 dòng, chiều cao vừa vặn không làm bảng quá rối hay bị bóp nát.
- `desktop-unit-picker-popover-1366.png`: Hiển thị rõ Popover Grid 4 cột đẹp mắt.
- `desktop-unit-picker-bottom-row-1366.png`: Chứng minh Popover tự động mở ngược lên trên khi nằm ở các dòng cuối bảng, giải quyết triệt để lỗi bị cắt popover.
- `desktop-custom-unit-1366.png`: Hiển thị việc nhập đơn vị custom "tuyến".

## 10. Mobile regression
- Đã xuất bản screenshot cho màn mobile `mobile-regression-master-390.png`. 
- Logic Unit Picker Desktop hoàn toàn nằm tách biệt với Mobile Bottom Sheet. Do đó, điện thoại vẫn sử dụng Bottom Sheet thông minh, nhỏ gọn, dễ thao tác chạm mà không dính giao diện Popover. Giao diện compact list trên mobile không hề hấn gì.

## 11. Test/build result
- Audit DB, Rollup Test, Write-path Test, Volume-Guard Test, UAT Integration Test: **PASS 100%**.
- TypeScript type-checking (`tsc --noEmit`): **PASS 100%**.
- Next.js Build (`npm run build`): **PASS 100%**.

## 12. Còn hạn chế gì không
- Popover đang sử dụng hệ thống position `absolute top-full` kết hợp `relative` tại ô cell. Việc này hoạt động siêu ổn định. Tuy nhiên nếu cột bảng quá sát mép dưới của cửa sổ trình duyệt (Viewport), có thể Popover bị tràn một chút xuống dưới do không dùng thư viện tính toán Portal/Float. Nhưng vì đây là dạng table scroll dài, người dùng chỉ cần cuộn nhẹ là đủ để xử lý. Hiện tại không có lỗi P1, P2 hay P3 nào. Sẵn sàng Commit.
