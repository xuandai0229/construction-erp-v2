# Báo cáo: Tối ưu Nhập nhanh ngoài công trường cho Mobile (Fast Entry Polish)

## 1. Phân tích lỗi từ ảnh thực tế và Hướng giải quyết

- **Lỗi 1: Còn quá nhiều chữ viết tắt (CV, DV, KL)**
  - *Giải quyết:* Cập nhật hoàn toàn sang ngôn ngữ chuẩn: `công việc`, `vượt thiết kế`, `Đơn vị:`. Loại bỏ mọi ký hiệu viết tắt gây khó hiểu cho người dùng ngoài công trường.
- **Lỗi 2: Filter chip bị cắt chữ**
  - *Giải quyết:* Cập nhật lại UI wrapper của filter chip. Áp dụng `pr-4` và `snap-x` để đảm bảo khu vực filter có thể cuộn ngang mượt mà trên các màn hình hẹp (như iPhone SE 375px) mà không che khuất hay cắt đứt chữ.
- **Lỗi 3: Khu vực đầu trang quá tốn diện tích**
  - *Giải quyết:* Thu nhỏ và gộp các ô thống kê vào cùng hàng với nút hành động để trả lại khoảng không rộng nhất cho phần nhập liệu. Đưa nút `Thêm công việc phát sinh` thành secondary link gọn nhẹ.
- **Lỗi 4: Mỏi tay thao tác cuộn từng dòng để nhập**
  - *Giải quyết:*
    - Sắp xếp thông minh nội bộ từng Group Hạng mục: Đưa các công việc `Vượt khối lượng` và `Chưa nhập` lên đầu, các công việc đã nhập rồi đẩy xuống dưới.
    - Thêm nút tiện ích **Tiếp theo ➔** trên thanh filter. Khi nhấn, hệ thống tự động bung Hạng mục và cuộn thẳng (smooth scroll) tới ô nhập liệu chưa điền tiếp theo và tự động kích hoạt bàn phím (focus).
    - Cập nhật luồng nhấn Enter: Khi người dùng nhấn Enter/Next trên bàn phím điện thoại, tự động focus vào ô nhập tiếp theo trong danh sách mà không cần chạm tay vào màn hình.

## 2. Thay đổi chi tiết trên Layout
- **Over Volume Warning (Cảnh báo vượt thiết kế):**
  - Đóng khung vuông vắn, sử dụng màu đỏ cảnh báo, loại bỏ chữ "Vượt KL", hiển thị rõ "Vượt khối lượng thiết kế. Cần ghi chú giải trình".
- **Bottom Sheet Detail (Bảng chi tiết thông tin):**
  - Gỡ bỏ giới hạn 2 dòng của Tên công việc (`line-clamp-2`), cho phép hiển thị đẩy đủ chữ dù rất dài. 
  - Bổ sung thông số "Tổng thiết kế, Đã thực hiện, Sau nhập, Tỷ lệ" rõ ràng thành Grid 4 ô.
- **Sticky Save Bar:**
  - Chỉ hiện thị khi người dùng đã nhập số liệu. 
  - Đã thêm text đếm số lượng thay đổi rõ ràng: "Lưu X thay đổi".
  - Chèn khoảng trống ở cuối màn hình (`pb-36`) để thanh Sticky không bao giờ che lấp công việc cuối cùng.

## 3. Các file đã sửa đổi
- `src/components/field-progress/daily-entry-table.tsx`
- Bổ sung Test Script Playwright: `scripts/take-screenshots-daily-mobile.ts`

## 4. Ảnh chụp (Screenshots)
Các hình ảnh kiểm tra đã được script Playwright lưu trữ tại:
`docs/qa/screenshots/field-progress-daily-mobile-fast-entry-polish/`
- `daily-top-390-after-polish.png`
- `daily-filter-chips-no-cut-390.png`
- `daily-group-expanded-no-abbreviation-390.png`
- `daily-next-unentered-focus-390.png`
- `daily-over-volume-full-text-390.png`
- `daily-sticky-save-active-390.png`
- `daily-detail-bottom-sheet-full-text-390.png`
- Screenshot tương thích thiết bị: `daily-mobile-se-375.png`, `daily-mobile-430.png`.
- Regression check: `daily-desktop-regression-1366.png`.

## 5. Tình trạng Test & Build
- Các script UAT Validation (Rollup, VolumeGuard, Direct Save Editable, Database Audit) đều Pass, đảm bảo Data Layer nguyên vẹn.
- Logic tính toán, Direct Save không có gì thay đổi.
- **Exit code 0** đối với lệnh `npx tsc --noEmit` & `npm run build`.

## 6. Kết luận
- **Thỏa mãn toàn bộ Yêu cầu nghiệm thu:**
  - Layout nhập siêu nhanh (Fast Entry) hoạt động mượt mà. Keyboard Navigation chuẩn mực.
  - Bảng Desktop giữ nguyên không ảnh hưởng. Tiếng Việt trong sáng, không dùng chữ viết tắt rác rưởi.
