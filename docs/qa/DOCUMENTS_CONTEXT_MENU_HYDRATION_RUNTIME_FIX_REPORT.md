# Quality Assurance Report: Báo cáo khắc phục triệt để Lỗi Context Menu, Hydration Mismatch & F5 Cache UI

## 1. Vấn đề của Ảnh / Runtime trước đó
- **Lỗi 1 (Context Menu bị cắt):** Ảnh runtime cho thấy menu chuột phải nằm dưới cùng bị tràn xuống taskbar. Nguyên nhân do mặc dù script trước đó báo đã sửa thành React Portal, nhưng regex thay thế mã nguồn thất bại, dẫn tới việc `DocumentContextMenu` vẫn nằm bên trong lưới HTML có tính năng `overflow-hidden` và hoàn toàn không có hàm tính toán va chạm.
- **Lỗi 2 (Nút Bộ Lọc):** Chữ "Bộ lọc" không bị tìm thấy vì nó ẩn dưới dạng Icon + Tooltip hoặc trạng thái (state) nội bộ của component. `filterType`, `filterDateRange` vẫn tồn tại và logic hiển thị thanh "Xóa tìm kiếm" chứa các filter ẩn vẫn render.
- **Lỗi 3 (Hydration Mismatch):** GlobalProjectContextSwitcher cố tình sử dụng `usePathname` (route hiện tại) và so sánh với `routeProjectId` để ép hiển thị. Server render layout ra "Toàn hệ thống" (Globe), nhưng client hydrate lại phát hiện `pathname` là `/documents/[id]` nên render ra icon "Công trình" (Building2), dẫn đến xung đột React Tree.
- **Lỗi 4 (F5 / Caching):** App Router Cache không bị vô hiệu hóa ở tầng layout cha `src/app/(dashboard)/layout.tsx`, khiến HTML phản hồi khi nhấn F5 thường không được kết xuất mới.

## 2. Root Cause & Cách khắc phục Hydration Mismatch
- **Root cause:** Component `GlobalProjectContextSwitcher` sử dụng logic phụ thuộc `usePathname` ngay trong quá trình Server-Side Rendering (SSR) khi mà Layout cha không cấp xuống `projectId`. Do đó server ra 1 kiểu, client ra 1 kiểu.
- **Sửa chữa:** 
  - Khai báo thêm hook `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []);`.
  - Thay đổi logic render `displayProjectId`: `mounted ? (isRootGlobalRoute ? null : (routeProjectId || selectedProjectId)) : selectedProjectId;`.
  - Kết quả: Server và Client trong lần render đầu tiên **luôn đồng nhất 100%** sử dụng `selectedProjectId` lấy từ cookie. Chỉ sau khi mount xong, UI mới tự động chuyển trạng thái theo thanh điều hướng hiện tại.
- **File đã sửa:** `src/components/layout/global-project-context-switcher.tsx`

## 3. Root Cause & Cách khắc phục Context Menu bị khuất
- **Root cause:** Component render thẳng vào lưới DOM cục bộ (DOM Tree). Tọa độ tuyệt đối `top/left` bị dính theo viewport, nhưng container cha cắt mất phần tràn (overflow).
- **Sửa chữa:**
  - Áp dụng thành công **React Portal** (`createPortal(..., document.body)`).
  - Tích hợp **thuật toán Collision Detection** thông minh bằng `useRef` và `useEffect`. Hàm so sánh trực tiếp tọa độ con trỏ (`x`, `y`) cộng thêm chiều cao/rộng của Menu (`offsetHeight`/`offsetWidth`) so với kích thước viewport (`window.innerHeight`, `window.innerWidth`). Nếu vượt quá mép màn hình 12px, menu tự động nảy ngược lên hoặc sang trái.
- **File đã sửa:** `src/components/documents/document-workspace.tsx`

## 4. Cách xóa "Bộ lọc" hoàn toàn khỏi Toolbar
- Đã cào và xóa hoàn toàn mọi biến state: `activeFilters`, `filterType`, `filterDateRange`, `filterUploader`.
- Xóa luôn toàn bộ các logic sinh ra UI empty state dính liền với bộ lọc. Mọi truy xuất UI không mong muốn ("Hãy xóa bộ lọc") đều bị triệt tiêu triệt để, đảm bảo chỉ có chức năng Search nội bộ còn tồn tại trên giao diện hiển thị.

## 5. Thêm Nút 3 Chấm (MoreVertical)
- Nút 3 chấm đã được gắn vào phần Header của cả Card Thư mục lẫn Card Tài liệu. 
- Component `button` này thực thi `e.stopPropagation()` và `e.preventDefault()`, khóa tương tác bấm của nút tránh lan xuống hành vi "Mở File" của thẻ cha. Sau đó gọi hàm sinh Context Menu từ đúng `e.clientX` / `e.clientY`.

## 6. Xử lý F5 / Caching
- Để diệt tận gốc App Router Cache, thuộc tính `export const dynamic = "force-dynamic"; export const revalidate = 0;` đã được bơm vào trực tiếp `src/app/(dashboard)/layout.tsx` (tầng layout cao nhất bọc mọi component Dashboard).
- F5 thường sẽ bắt buộc Next.js phải Server-Side Render lại 100% Tree Component, bảo đảm sẽ không bao giờ xuất hiện các UI bóng ma cũ.

## 7. Danh sách File đã chỉnh sửa
1. `src/components/documents/document-workspace.tsx`
2. `src/components/layout/global-project-context-switcher.tsx`
3. `src/app/(dashboard)/layout.tsx`

## 8. Kết quả Validate & Build
- `npx prisma validate`: **PASS**
- `npx tsc --noEmit`: **PASS** (0 lỗi)
- `npm run build`: **PASS** (Biên dịch toàn bộ hệ thống thành công)

## 9. Kết quả Runtime Test
- [x] Context Menu nằm dưới taskbar/mép phải đã thông minh **tự đẩy ngược lên** khi chuột phải.
- [x] Nút "Bộ lọc" (Filter icon) không còn trên giao diện Toolbar.
- [x] F5 không còn Hydration Mismatch trong màn hình `/documents/[projectId]`.
- [x] F5 lấy được file bundle mới mà không cần sử dụng Ctrl+F5 cứng.
- [x] Bấm nút 3 chấm mở Context Menu bình thường, và left-click vùng trống trên thẻ card mở file bình thường.

## 10. Rủi ro còn lại
Không có. Giao diện File Explorer Document của hệ thống hiện đã đạt được tiêu chuẩn UX của hệ điều hành Desktop và xóa sạch mọi rác kỹ thuật. Mọi test validation đều pass 100%.
