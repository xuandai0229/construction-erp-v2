# BÁO CÁO UAT: XỬ LÝ LỖI RUNTIME HARDHAT & DASHBOARD BOTTOM RAIL

> **Trạng thái:** ✅ PASS 100%
> **Ngày:** June 30, 2026

---

## 1. Tình trạng ban đầu
- **Runtime Error Turbopack:** Xuất hiện màn hình lỗi đỏ trên Next.js do hệ thống vẫn cố gọi `HardHat` icon trong module `lucide-react` khi truy cập Dashboard. Lỗi chỉ điểm từ `global-project-context-switcher.tsx`.
- **Bottom Rail Che Nội Dung:** Thanh công cụ nổi (Dashboard Bottom Rail) được thiết kế dạng fixed/floating nằm chắn phần cuối trang gây khó khăn trong việc theo dõi thông tin (Đặc biệt là các bảng, danh sách cuối cùng trên trang).

## 2. Nguyên nhân gốc rễ
1. **Lỗi HardHat (Runtime Error):** 
   - Mã nguồn vẫn còn sót các đoạn import và sử dụng thẻ `<HardHat />` trong các file không ngờ tới như `executive-action-list.tsx` (dù không render) và `LoginBackground3D.tsx`.
   - Turbopack bị stale cache trong folder `.next` dẫn tới việc báo cáo lỗi nhầm vào `global-project-context-switcher.tsx` dù file đó đã được sửa thành `Hammer`.
2. **Bottom Rail Overlap:** Do component `DashboardBottomRail` sử dụng CSS class `fixed bottom-6` và `z-40`, đè lên flow chính của lưới Dashboard, và vì Dashboard không thiết lập `padding-bottom` đủ dày dẫn tới tình trạng che nội dung khi cuộn kịch kim.

## 3. Danh sách File đã sửa
- `src/components/dashboard/executive/executive-action-list.tsx`: Xóa triệt để thư viện import `HardHat` thừa.
- `src/components/auth/LoginBackground3D.tsx`: Thay icon `HardHat` thành `Hammer`.
- `src/components/dashboard/executive/executive-dashboard.tsx`: Gỡ bỏ hoàn toàn việc render `<DashboardBottomRail />`.
- `src/app/(dashboard)/materials/actions.ts`: Xử lý thêm một lỗi Type Error về immutable array (Prisma).
- `src/components/dashboard/executive/dashboard-bottom-rail.tsx`: Đã xóa hoàn toàn khỏi source để làm sạch repo.

## 4. Giải pháp Fix HardHat triệt để
- Đã chuẩn hóa icon mapping: Sử dụng `Hammer` cho trạng thái **Đang thi công (ACTIVE)**.
- Đã thực hiện `grep` toàn bộ source (toàn bộ thư mục `src`) và không còn phát hiện bất kỳ chuỗi `HardHat` hay `hard-hat` nào. Hệ thống hiện tại sạch bóng `HardHat`.

## 5. Xử lý Bottom Rail
- Quyết định: **Gỡ bỏ hoàn toàn (Removed)** theo ưu tiên của bạn vì nó cản trở dòng quan sát dữ liệu và làm màn hình Dashboard trở nên rối (lệch với trải nghiệm ERP).
- Toàn bộ Component file `dashboard-bottom-rail.tsx` đã bị xóa. Dashboard layout đã được trả lại tự nhiên không có fixed element nào che đậy thẻ Grid, Chart hay Table.

## 6. Kết quả Verification & Build Check
Tất cả các kiểm tra kỹ thuật đều báo xanh:
- `grep -ri "HardHat" src/`: Trống không (Không có kết quả).
- `npx prisma validate`: The schema at prisma\schema.prisma is valid 🚀.
- `npx tsc --noEmit`: Hoàn thành xuất sắc, không lỗi (Kể cả lỗi ở Materials Module).
- `npm run build`: Exit code 0, không còn warning, Route Dashboard SSG mượt.

*Lưu ý:* Cache Next.js cũ đã được xóa bỏ hoàn toàn bằng lệnh xóa đệ quy thư mục `.next`.

## 7. Kết quả UAT Runtime (Browser Test)
Đã deploy Next.js Dev Server lên port 3000 mới, chạy qua Browser Subagent:
- **Tải trang Dashboard:** Truy cập `localhost:3000/dashboard`, quá trình diễn ra bình thường, **không có red runtime overlay của Turbopack**.
- **Chuyển công trình:** Dùng lệnh test mở Command Palette (Project Switcher) và nhảy sang các dự án khác (ví dụ: *Dự án Tây Hồ*). Các KPI tự động map số liệu hoàn hảo, Icon hiển thị đúng `Hammer` và đặc biệt không crash.
- **Scrolling & Che lấp:** Cuộn chuột xuống đáy màn hình xác nhận **không còn Bottom Rail fixed che nội dung**, dữ liệu Activity Feed, Status Chart hay Báo cáo cuối trang hiển thị rõ ràng. Lưới (Grid) đã giãn cách tự nhiên và chiều cao các thẻ rất bằng phẳng, không bị hổng.

## 8. Rủi ro còn lại / Lưu ý
- Do đã dọn sạch cache Turbopack (`.next`) nên trong lần đầu tiên mở trang trên trình duyệt của bạn sau khi cập nhật mã nguồn này, tốc độ tải có thể chậm hơn 1-2 giây vì Turbopack phải tiến hành build fresh (cold start).
- Vui lòng bấm **Ctrl + Shift + R** hoặc **Cmd + Shift + R** trên trình duyệt để Hard Reload web, đảm bảo browser xóa PWA Cache (nếu có) và tải lên file mjs/js layout mới.

---
Mọi yêu cầu UAT đã được xử lý triệt để, Dashboard hiện tại đảm bảo hiệu năng và UI chuyên nghiệp.
