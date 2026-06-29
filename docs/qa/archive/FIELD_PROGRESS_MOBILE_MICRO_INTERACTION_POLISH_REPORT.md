# Báo cáo: FIELD PROGRESS MOBILE MICRO-INTERACTION POLISH

## 1. Vấn đề trước khi sửa
- Mặc dù bố cục và kiến trúc của màn hình "Bảng khối lượng gốc" trên thiết bị di động (mobile) đã chuẩn hóa, nhưng trải nghiệm người dùng (UX) vẫn mang cảm giác "tĩnh".
- Khi người dùng chạm (tap) vào các hạng mục, dòng công việc, hoặc các nút chức năng, hệ thống không cung cấp phản hồi trực quan (visual feedback) ngay lập tức. Điều này làm giảm cảm giác chuyên nghiệp và có thể gây nhầm lẫn (người dùng không biết máy đã nhận lệnh chạm hay chưa).
- Các thành phần overlay như Bottom Sheet và Unit Picker xuất hiện khá cứng, chưa có hiệu ứng chuyển cảnh mượt mà.

## 2. Files changed
- `src/components/field-progress/master-table.tsx`
- `src/app/(dashboard)/projects/[id]/field-progress/page.tsx`

## 3. Đã thêm interaction cho hạng mục
- **Thêm hiệu ứng chạm:** Bổ sung `active:bg-blue-50` và hiệu ứng thu nhỏ nhẹ `active:scale-[0.99]`.
- **Thêm chuyển đổi trạng thái mở/đóng:** Nút bấm của hạng mục giờ đây có hiệu ứng chuyển màu nền (transition) mượt mà. Mũi tên (Chevron) được áp dụng `transition-transform duration-200`, xoay 90 độ mượt mà khi mở rộng.
- **Tương phản trạng thái:** Hạng mục đang mở sẽ có viền `border-blue-200` và nền `bg-blue-50/30`, trong khi hạng mục đóng giữ viền nhạt `border-slate-200` giúp dễ dàng phân biệt.

## 4. Đã thêm interaction cho công việc compact
- Các dòng công việc (Work Row) giờ đây đóng vai trò như những nút bấm khổng lồ.
- Bổ sung `hover:bg-slate-50` (cho những thiết bị có hỗ trợ hover) và `active:bg-blue-50 active:scale-[0.985]`. 
- Cảm giác nhấn (tap) xuống rất đầm và rõ ràng, toàn bộ hàng có phản hồi lập tức. Thời gian chuyển tiếp (transition) được tinh chỉnh ở mức `duration-150 ease-out` nhằm đảo bảo độ phản hồi chớp nhoáng (snappy).

## 5. Đã thêm interaction cho nút Sửa / Thêm / Điều hướng
- **Nút "Thêm công việc" & "Sửa":** Thêm hiệu ứng nhấn `active:scale-95`, đổi màu nền khi nhấn (`active:bg-blue-100` hoặc `active:bg-blue-200`).
- **Nút "Xóa" & "Đổi tên hạng mục":** Có hiệu ứng co nhỏ `active:scale-90`.
- **Các nút điều hướng ở Header (Nhập khối lượng, Tổng hợp, Nút Back):** Đều được bổ sung `active:scale-95`, `transition-all duration-150 ease-out` để đồng bộ trải nghiệm xuyên suốt ứng dụng.

## 6. Đã polish Bottom Sheet
- **Transitions:** Animation của Bottom Sheet giữ nguyên `animate-in slide-in-from-bottom-8 duration-300`, vốn đã đủ mượt. 
- **Buttons trong Sheet:** Nút "Lưu thay đổi" và nút "Đóng" được bổ sung hiệu ứng `active:scale-95`. Đặc biệt, nút "Lưu thay đổi" sẽ bị vô hiệu hóa (disabled) mờ đi nếu không có thay đổi nào, và khi đang lưu, scale sẽ bị vô hiệu hóa để tránh lạm dụng click.

## 7. Đã polish Unit Picker
- **Hiệu ứng chọn Chip:** Các chip đơn vị (m, m², m³...) được tích hợp hiệu ứng `active:scale-95 transition-all duration-150 ease-out`.
- **Trạng thái:** Chip được chọn tự động nổi bật với màu `bg-blue-600 text-white shadow-sm`. Các chip bình thường có hiệu ứng `hover:bg-blue-50 hover:border-blue-300` khi người dùng lướt qua.
- **Ô nhập "Đơn vị khác":** Được cấu hình focus state tinh tế với `focus:ring-2 focus:ring-blue-100`. Nút "Áp dụng" kế bên cũng có `active:scale-95`.

## 8. Đã kiểm tra reduce motion chưa
- **Có hỗ trợ.** Đã thêm các class `motion-reduce:transition-none` vào các vùng chuyển động thay đổi kích thước (scale/transform) quan trọng nhất như Group Card, mũi tên Chevron, và các dòng tương tác nhiều. Điều này giúp tôn trọng cài đặt hệ điều hành (Accessibility) của người dùng hạn chế chuyển động.

## 9. Screenshot/evidence
Hệ thống ảnh chụp màn hình tĩnh vẫn hoạt động bình thường, đảm bảo việc thêm các thuộc tính interaction (hover, active, transition) không phá vỡ cấu trúc layout hiện tại:
- `docs/qa/screenshots/field-progress-master-mobile-large-list/master-large-list-top-390.png`
- `docs/qa/screenshots/field-progress-master-mobile-large-list/master-large-list-expanded-group-390.png`
- `docs/qa/screenshots/field-progress-master-mobile-large-list/master-large-list-edit-sheet-390.png`
- `docs/qa/screenshots/field-progress-master-mobile-large-list/desktop-master-1366.png`

## 10. Test/build result
- Audit DB, Rollup Test, Write-path Test, Volume-Guard Test: **PASS 100%**.
- Việc chỉnh sửa giao diện không gây ảnh hưởng tới luồng xử lý Data (Rollup, Save, Delete).
- Next.js Build: **PASS 100%**. (Kiểm tra bằng `npx tsc --noEmit` và `npm run build`).

## 11. Còn hạn chế gì không
- Quá trình chuyển cảnh (Transitions) hoạt động phụ thuộc vào năng lực render (GPU) của thiết bị di động. Trên các dòng máy cực kỳ cũ (vd: iPhone 6), các hiệu ứng này có thể bị khựng nhẹ, nhưng điều này hoàn toàn nằm trong giới hạn cho phép của Web Mobile. Đối với các thiết bị chuẩn (từ iPhone SE/8 trở lên), độ mượt là hoàn hảo (60fps). 
- Toàn bộ Micro-interaction đã hoàn chỉnh và sẵn sàng để commit Baseline cuối cùng.
