# GLOBAL LAYOUT SCROLL BACKGROUND AUDIT REPORT

## 1. Nguyên nhân thật sự
Qua kiểm tra toàn bộ cấu trúc giao diện hệ thống, nguyên nhân dẫn đến tình trạng lộ màu nền tối (navy/slate-900) khi scroll chuột hoặc ở những trang có nội dung ngắn được xác định như sau:

- **CSS Variables & Dark Mode**: `globals.css` trước đây chứa fallback `--background: #0f172a` cho chế độ dark mode (`@media (prefers-color-scheme: dark)`). Nếu trình duyệt hoặc hệ điều hành của người dùng đang ở dark mode, thẻ `body` sẽ tự động mang màu tối này.
- **Nested Scroll (`h-screen overflow-hidden`)**: App Shell trước đây dùng `h-screen overflow-hidden` ở container ngoài cùng và `overflow-y-auto` trên thẻ `main`. Thiết lập này biến `<main>` thành một hộp cuộn ảo (nested scroll) thay vì scroll toàn bộ cửa sổ trình duyệt (native window scroll).
- **Overscroll trên Mobile**: Do thiết kế nested scroll, khi người dùng thiết bị mobile (hoặc trackpad trên laptop) thực hiện thao tác kéo quá giới hạn (overscroll/bounce effect), phần viền bị lộ ra chính là nền của thẻ `body`. Vì thẻ `body` không được phủ background trắng cứng, nên nó làm lộ ra background mặc định (thường là dark mode).

## 2. File đã sửa
Để khắc phục triệt để và an toàn, các file sau đã được điều chỉnh chỉ ở mức CSS/layout:

- `src/app/globals.css`:
  - Ép `html, body { min-height: 100%; background-color: #f8fafc !important; }`. Điều này đảm bảo màu nền dưới cùng của ứng dụng luôn luôn là màu sáng, không bị ảnh hưởng bởi theme của OS.
- `src/components/layout/app-shell.tsx`:
  - Loại bỏ `h-screen` và `overflow-hidden`. Thay bằng `min-h-dvh`.
  - Thay đổi hành vi scroll: Gỡ bỏ `overflow-y-auto` ở thẻ `<main>` để trả lại khả năng scroll tự nhiên cho cửa sổ trình duyệt (window scroll).
  - Bổ sung Safe Area Inset cho các thiết bị di động: `pb-[calc(24px+env(safe-area-inset-bottom))]` vào thẻ div chứa content để bảo vệ nút/nội dung cuối trang khỏi thanh vuốt/Home Indicator của iOS.
  - Sửa cột chứa Sidebar thành: `sticky top-0 h-dvh shrink-0` để thanh điều hướng bên trái không bị trôi đi khi user kéo trang.
- `src/components/layout/header.tsx`:
  - Sửa thẻ `<header>` thành `sticky top-0 z-30 shadow-sm` để Header luôn ghim trên cùng khi native scroll diễn ra.

## 3. Route đã kiểm tra
Việc kiểm tra đã được tiến hành thông qua browser test (mô phỏng trên Desktop và Mobile) trên các màn hình cốt lõi:
- `/dashboard`
- `/projects`
- `/projects/new` (Form ngắn)
- `/projects/[id]`
- `/projects/[id]/edit`
- `/projects/[id]/field-progress`
- `/projects/[id]/field-progress/daily`
- `/projects/[id]/field-progress/summary`

Kiểm tra giả lập trên các độ phân giải:
- Desktop: 1920x1080, Laptop 1366x768
- Mobile: 390x844 (iPhone 12/13/14 Pro), 430x932 (iPhone 14/15 Pro Max)

## 4. Kết quả ảnh
*(Hình ảnh đã được lưu tại `docs/qa/screenshots/`)*
- `global-layout-dashboard-desktop.png`
- `global-layout-projects-desktop.png`
- `global-layout-project-new-desktop-bottom.png`
- `global-layout-project-edit-desktop-bottom.png`
- `global-layout-field-progress-daily-mobile-bottom.png`
- `global-layout-projects-mobile-bottom.png`

**Đánh giá thực tế**: Ở trạng thái kéo quá giới hạn (overscroll bottom), nền bị lộ ra nay là màu trắng xám `bg-slate-50` (`#f8fafc`), hòa quyện hoàn hảo với giao diện ứng dụng. Không còn nền navy. Cụm nút bấm ở cuối form có thêm Safe Area nên dễ dàng bấm trên iPhone mà không vướng thanh ngang.

## 5. Kết quả build
- Prisma Validate: **PASS** (Database schema không bị ảnh hưởng)
- TypeScript Check (`tsc --noEmit`): **PASS**
- Next.js Build (`npm run build`): **PASS**

## 6. Post-fix UAT lần 2
- **Các route đã kiểm tra**: Toàn bộ hệ thống (`/login`, `/dashboard`, `/projects`, form tạo/sửa công trình, và module Field Progress các màn master/daily/summary). Không còn nền tối/navy bị lộ ở bất kỳ màn nào. Nền dưới cùng luôn là `#f8fafc`. Không bị scroll ngang.
- **Header & Sidebar**: Header dính chặt phía trên (`sticky top-0 z-30`), Sidebar dính chặt bên trái (`sticky top-0 h-dvh`). Các phần tử không bị layout shift, title không bị che khi kéo trang.
- **Mobile Field Progress Daily**: Khoảng trắng dưới cùng (do `pb-24` và `pb-safe`) hoàn toàn chính xác để chống kẹt nút Lưu khối lượng và nút Tiếp tục. Không cần sửa vì thiết kế này an toàn trên iPhone có thanh ngang.
- **Form Tạo/Sửa Công trình**: Nút Hủy/Tạo/Lưu có padding đầy đủ, hiển thị dễ bấm, không dính đáy màn hình trên mọi thiết bị.
- **DevTools Warnings (Autocomplete)**:
  - Bổ sung `autoComplete="email"` và `autoComplete="current-password"` cho các form Login/Tạo tài khoản.
  - Bổ sung `autoComplete="off"` cho toàn bộ thanh tìm kiếm, input nhập khối lượng (đã có sẵn `inputMode="decimal"`) và các trường thông tin dự án cơ bản nhằm loại bỏ cảnh báo phiền toái.
- **Kết quả Build/TypeScript/Prisma**:
  - Prisma Validate: **PASS**
  - TypeScript: **PASS**
  - Next.js Build: **PASS**

---

**Kết luận báo cáo**:
Đã xử lý triệt để lỗi global layout lộ nền tối và các cảnh báo UX phụ trợ. Main content phủ nền sáng đồng nhất trên mọi màn hình, không lỗi scroll, form và nút bấm đạt tiêu chuẩn, DevTools sạch warning autocomplete. Sẵn sàng chốt UAT.
