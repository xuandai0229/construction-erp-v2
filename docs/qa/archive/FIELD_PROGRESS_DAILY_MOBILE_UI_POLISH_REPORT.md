# Báo cáo: Tối ưu UI/UX Mobile cho Màn hình Nhập khối lượng theo ngày

## 1. Phân tích lỗi từ ảnh thực tế và Hướng giải quyết

- **Lỗi 1:** Nút điều hướng bị xuống dòng.
  *Giải quyết:* Thay đổi nhãn thành "Bảng gốc" và "Tổng hợp" trên mobile bằng class `sm:hidden`, giữ nhãn đầy đủ cho màn desktop `hidden sm:inline`. Bổ sung class `whitespace-nowrap shrink-0`.
- **Lỗi 2:** Trùng lặp page title và card title.
  *Giải quyết:* Gọn hóa tiêu đề trong thẻ card của mobile từ "Nhập khối lượng theo ngày" thành "Danh sách công việc" hoặc ẩn hoàn toàn trên màn nhỏ, chỉ dùng Page Title chung.
- **Lỗi 3:** Card Lịch nhập quá cao.
  *Giải quyết:* Giảm padding (`p-2.5 sm:p-3`), giảm height nút ngày (`p-1.5 sm:p-2`, `gap-0.5`), thu nhỏ margin của Legend. Thêm hiệu ứng chạm `active:scale-[0.95]`.
- **Lỗi 4:** Khu vực bộ lọc dài, chiếm chỗ.
  *Giải quyết:* Đưa "Ngày báo cáo", "Tìm kiếm", "Mũi thi công" vào Grid compact 2 cột (`grid-cols-2`), giảm padding, sử dụng input `h-9 sm:h-10` và text nhỏ gọn hơn.
- **Lỗi 5:** Nút Thêm công việc quá nổi bật.
  *Giải quyết:* Đổi từ nút chính màu xanh sang nút Outline (`variant="outline"`, `bg-blue-50`, chữ xanh) và làm gọn hơn, ít gây nhầm lẫn với nút Lưu.
- **Lỗi 6:** Các ô thống kê bị vỡ chữ.
  *Giải quyết:* Thay đổi nhãn ngắn gọn "Tổng công việc", "Đã nhập", "Chưa nhập", "Vượt khối lượng". Đưa vào grid siêu hẹp `px-2.5 py-2 text-[11px]` trên mobile.
- **Lỗi 7:** Card công việc nhập bị rối.
  *Giải quyết:* Tạo grid 4 cột cho số liệu: "Thiết kế", "Đã làm", "Sau nhập", "Tỷ lệ". Bỏ các chữ viết tắt khó hiểu. Thu nhỏ padding, dùng text 11px gọn gàng.
- **Lỗi 8:** Nhập khối lượng.
  *Giải quyết:* Giữ nguyên input `inputMode="decimal"` với text `text-base` tránh iOS zoom, viền bo nhẹ, giao diện sáng rõ.
- **Lỗi 9:** Sticky Save Bar che màn hình.
  *Giải quyết:* Khi không có thay đổi (`!hasChanges`), áp dụng class `translate-y-full` để trượt nút bấm ra khỏi màn hình. Khi có thay đổi, thanh trượt lên mượt mà (`translate-y-0`) với màu primary nổi bật.

## 2. Các file đã sửa đổi
- `src/app/(dashboard)/projects/[id]/field-progress/daily/page.tsx`
- `src/components/field-progress/daily-status-calendar.tsx`
- `src/components/field-progress/daily-entry-table.tsx`

## 3. Ảnh chụp (Screenshots)
Các hình ảnh kiểm tra đã được script Playwright lưu trữ tại:
`docs/qa/screenshots/field-progress-daily-mobile-polish/`
*(Bao gồm Header, Bộ lọc, Card công việc, Ô input khi focus, Nút Lưu Sticky)*

## 4. Kiểm tra thiết bị
- **iPhone SE (375x667):** Pass - không vỡ chữ, không xuống dòng lỗi.
- **iPhone 12/13/14 (390px):** Pass - bố cục cân đối.
- **Desktop:** Hoàn toàn không bị ảnh hưởng do các class đều có prefix `sm:` hoặc `lg:`.

## 5. Tình trạng Test & Build
- Các script UAT Validation (Rollup, VolumeGuard, Direct Save Editable, Database Audit) đều Pass.
- `npx tsc --noEmit` & `npm run build`: Hoàn tất với Exit code 0, không có Type Error.
- **Logic:** Direct Save vẫn được giữ nguyên tính năng (nhập số lưu im lặng, trạng thái không bị khoá). Logic không bị regression.
