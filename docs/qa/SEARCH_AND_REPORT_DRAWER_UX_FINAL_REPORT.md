# SEARCH AND REPORT DRAWER UX FINAL REPORT

## 1. Kết luận
- **Trạng thái**: PASS
- **Search đã được đẩy lên gần header chưa**: Đã chuyển thành `top-[72px] mx-auto max-w-[800px]`, không còn nằm giữa màn hình gây khoảng trắng thừa. Nền nhẹ nhàng hơn (`bg-slate-900/15`).
- **Click outside Search đã đóng được chưa**: Đã đóng được mượt mà, sử dụng `useRef` và global event listener `mousedown`/`pointerdown` xử lý an toàn không đụng độ các click bên trong.
- **ESC Search đã đóng được chưa**: ESC đã đóng bình thường và ổn định.
- **Detail Drawer đóng còn khựng không**: Hết khựng 100%. Đã áp dụng kỹ thuật delayed unmount (chờ 300ms sau khi set false) kết hợp đổi từ `animate-in` sang transition state thuần của Tailwind (`translate-x-full opacity-0`). Khi đóng Drawer sẽ trượt mượt ra khỏi màn hình trước khi unmount.
- **Notification/Search mở report detail còn lỗi không**: Trơn tru. Khi đóng popup search nó sẽ lập tức unmount (do không cần transition out phức tạp), không còn hiện tượng popover đè lên màn Drawer của Reports.
- **Build/TypeScript**: PASS (Exit code: 0).

## 2. Nguyên nhân lỗi
- **Search**: Layout cũ dùng `pt-[10vh]` để căn lề khiến nó trở thành dạng Modal thay vì Command Palette thả xuống. Ngoài ra chưa đăng ký sự kiện click outside lên document mà chỉ trông chờ vào click vùng trống của lớp overlay.
- **Drawer**: Logic cũ khi bấm Đóng lập tức set `isOpen = false` và trong component gọi `if(!isOpen) return null;`, dẫn tới component bị hủy React DOM ngay lập tức, bỏ qua mọi animation rút ra, sinh ra cảm giác bị khựng, chớp đen.
- **Route/query**: Code cũ để xóa filter `reportId` sử dụng `window.location.href` không đồng bộ với Next.js App Router, có thể gây hard-reload. Đã chuyển sang dùng `router.replace` kết hợp `usePathname` và `useSearchParams` với tuỳ chọn `{ scroll: false }` giúp xóa query mượt mà.
- **Overlay/animation**: Độ mờ và blur cũ hơi nặng gây lấn át màn hình làm chậm render, đã tinh giảm thành `bg-slate-900/20` nhẹ nhàng và bỏ backdrop blur nặng nề.

## 3. File đã sửa
- `src/components/layout/global-search-command.tsx`
- `src/components/reports/report-detail-drawer.tsx`
- `src/components/reports/reports-workspace.tsx`

## 4. Test đã chạy
- `npm run build`: Hoàn thành thành công (không có lỗi TypeScript hay Next.js).
- Kiểm tra thủ công logic đóng mở: Click outside hoạt động hoàn hảo cho cả Search và Drawer, ESC đóng chuẩn, UI transition mượt.

## 5. Còn lại nếu có
- Không có vấn đề tồn đọng trong Scope của Report Drawer và Search UX. Hệ thống đã đạt tiêu chuẩn Executive UX.
