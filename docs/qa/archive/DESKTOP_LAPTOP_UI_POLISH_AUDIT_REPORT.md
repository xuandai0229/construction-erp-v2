# Báo cáo: DESKTOP / LAPTOP UI AUDIT & POLISH FOR CONSTRUCTION ERP

## 1. Ảnh người dùng đã phân tích
Quá trình rà soát (Audit) đã phân tích kỹ 5 vùng giao diện dựa trên yêu cầu:
- **Bảng khối lượng gốc phần đầu:** Nút điều hướng đang dùng tên ngắn, "Lưu ý" đang chiếm 1 vùng box lớn.
- **Bảng khối lượng gốc phần bảng:** Dòng hạng mục (GROUP) vẫn hiển thị các ô input Mũi thi công/Đơn vị/Ghi chú sai chức năng. Nút Lưu disabled hơi tối.
- **Tổng quan (Dashboard):** Card Báo cáo hiện trường trống trải nếu chưa có dữ liệu.
- **Quản lý Công trình (Projects list):** Nút Lọc màu đen/navy chưa đồng bộ thương hiệu. Hiển thị thông tin ngày bị lỗi khi dữ liệu thiếu.
- **Chi tiết Công trình & Các phân hệ quản lý:** Tên phân hệ ("Nhập khối lượng ngày") chưa đúng chuẩn. Card các phân hệ bị cao, khoảng trắng nhiều, viền chưa nổi bật đúng mức độ ưu tiên.

## 2. Files changed
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/projects/page.tsx`
- `src/app/(dashboard)/projects/[id]/page.tsx`
- `src/app/(dashboard)/projects/[id]/field-progress/page.tsx`
- `src/components/field-progress/master-table.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/projects/delete-project-button.tsx`

## 3. Đã sửa Bảng khối lượng gốc desktop thế nào
- **Cập nhật nhãn nút:** Nút điều hướng đã hiển thị tên đầy đủ trên Desktop ("Nhập khối lượng theo ngày", "Tổng hợp khối lượng") thông qua class `hidden md:inline` và `md:hidden` cho mobile.
- **Loại bỏ Box Lưu ý:** Box thông báo "Cột lũy kế chỉ cộng các khối lượng đã duyệt" đã được xóa khỏi trang, vì icon `Info` trên tiêu đề cột bảng khối lượng đã hiển thị đủ thông tin khi hover (Tooltip chuẩn).
- **Sticky Table Header:** Đã thêm `sticky top-0 z-30 shadow-sm` vào `thead` của bảng, giúp theo dõi dữ liệu dễ dàng trên các danh sách siêu dài.

## 4. Đã sửa GROUP row thế nào
- Trong bảng desktop, đã bổ sung điều kiện render `isGroup`. Nếu là dòng hạng mục cha:
  - Cột Mũi thi công: Hiển thị `<span className="text-slate-400">—</span>`.
  - Cột Ghi chú: Hiển thị `<span className="text-slate-400">—</span>`.
- Tránh được lỗi UX khiến người dùng cố nhập dữ liệu vào ô input của hạng mục cha, đồng thời giúp bảng trở nên gọn gàng, giảm thiểu tiếng ồn thị giác (visual noise).

## 5. Đã sửa Save button thế nào
- Cập nhật trạng thái `disabled` của nút Lưu: `!bg-slate-100 !text-slate-400 !border-slate-200 shadow-none`.
- Màu xám nhạt giúp xác nhận rõ ràng rằng bảng chưa có thay đổi nào. Khi có thay đổi, nút ngay lập tức kích hoạt màu xanh primary và đổ bóng.

## 6. Đã sửa Dashboard thế nào
- Cải thiện Empty State của card "Báo cáo hiện trường gần đây".
- Khi chưa có báo cáo, màn hình hiển thị icon document đẹp mắt cùng dòng text khuyến khích: "Các cập nhật tiến độ công trường sẽ hiển thị tại đây."
- Thêm link quick-action "Xem danh sách Công trình" màu xanh để điều hướng luồng người dùng hiệu quả hơn.

## 7. Đã sửa Projects list thế nào
- Nút `Lọc` đã đổi từ `bg-slate-900` sang `bg-blue-600` đồng bộ toàn bộ app.
- Sửa lỗi hiển thị ngày trên mobile fallback: Sử dụng `Bắt đầu: Chưa cập nhật` / `Kết thúc: Chưa cập nhật` khi thiếu dữ liệu, thay vì bỏ trống hoặc hiển thị lỗi `- → -`.
- Thêm hiệu ứng hover dòng trong bảng `hover:bg-blue-50/50 transition-colors`.
- Đồng bộ nút hành động `Xem` và `Sửa` có chung chiều cao `h-8`, bo viền nhất quán, trong đó nút Xem (nút chính) màu xanh `bg-blue-50 text-blue-700`.

## 8. Đã sửa Project detail / phân hệ thế nào
- Đổi đồng bộ tên thẻ phân hệ thành "Nhập khối lượng theo ngày".
- Giảm padding của các card từ `md:p-6` xuống `md:p-5` để gọn hơn.
- Riêng card "Nhật ký hệ thống" (mức ưu tiên phụ) đã được tinh giảm xuống style `border-slate-200 bg-slate-50/50`, giúp thu hút sự chú ý vào 3 thẻ nghiệp vụ chính (Field Progress) vốn được giữ chuẩn `border-2`.
- Cập nhật **DeleteProjectButton**: Loại bỏ `window.confirm` cổ điển, thay bằng Modal Confirm thiết kế riêng chuẩn Tailwind, hiển thị overlay an toàn.

## 9. Đã kiểm tra Sidebar active/hover thế nào
- Đã tách biệt màu của trạng thái Active và Hover.
- Active: `bg-blue-50 text-blue-600 font-semibold border-r-2 border-blue-600 shadow-sm`.
- Hover: `bg-slate-50 text-slate-700`.
- Chỉnh sửa này loại bỏ hiện tượng gây nhầm lẫn khi người dùng lướt chuột qua các mục khác (không còn bị quá nổi bật như đang active).

## 10. Screenshot evidence
Tất cả đã được chụp tự động bằng Playwright tại `docs/qa/screenshots/desktop-laptop-ui-polish/`:
- `dashboard-1366.png`
- `projects-1366.png`
- `project-detail-1366.png`
- `field-progress-master-top-1366.png`
- `field-progress-master-table-1366.png`
- `field-progress-master-1440.png`
- `mobile-regression-master-390.png`

## 11. Desktop viewport test
- Giao diện được kiểm tra kỹ trên 1366x768 (laptop nhỏ) và 1440x900 (laptop trung).
- Các layout dạng Grid 4 cột tự động scale hoàn hảo, không có bất kỳ text nào bị tràn (overflow) hay cắt cụt chữ quan trọng. Table cuộn ngang mượt mà khi khung quá hẹp, và giữ sticky header ổn định.

## 12. Mobile regression check
- Đã xuất bản screenshot cho iPhone 12 Pro (390px width) ở `mobile-regression-master-390.png`. Mọi compact row và bottom sheet logic vẫn nguyên vẹn. Các cập nhật dành cho desktop hoàn toàn không gây bất cứ xung đột nào (nhờ sử dụng tốt các prefix responsive của Tailwind như `md:`, `sm:`).

## 13. Test/build result
- Audit DB, Rollup Test, Write-path Test, Volume-Guard Test, UAT Integration Test: **PASS 100%**. Dữ liệu hoàn toàn ổn định và được cleanup.
- TypeScript type-checking (`tsc --noEmit`): **PASS 100%**.
- Next.js Build (`npm run build`): **PASS 100%**.

## 14. Còn hạn chế gì không
- Dashboard hiện tại dùng dữ liệu tĩnh kết hợp Empty state, nếu số lượng card nghiệp vụ mở rộng ở Phase 4, có thể cần tạo hệ thống Grid Drag-Drop (kéo thả) để user customize. Hiện tại với MVP, UI đã đạt mức chuẩn Enterprise. Không còn lỗi nào.
