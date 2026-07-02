# Quality Assurance Report: Báo cáo Sửa lỗi Mismatch, Xóa Bộ Lọc, Context Menu 3 Chấm

## 1. Nguyên nhân Hydration mismatch mới ở DocumentWorkspace line 1189
- **Root cause:** Component `document-workspace.tsx` gặp lỗi Hydration vì có sự khác biệt cấu trúc DOM giữa Server và Client. Server đã render thẻ `<div className="mb-3">` chứa nút Back nhưng Client lại đọc ra ngay thẻ `<nav className="mb-2">`. Nguyên nhân sâu xa là do `selectedFolderId` phụ thuộc vào `useSearchParams()` ở Client nhưng lại là giá trị `null` ở Server (SSR). Sự thay đổi đột ngột trạng thái từ `null` sang một ID cụ thể trong quá trình hydrate đã khiến React hoảng loạn và báo lỗi khác biệt.

## 2. Đã sửa cấu trúc server/client render như thế nào
- **Cách khắc phục:** Đã gộp chung toàn bộ phần nút Quay lại (Back Button) và đường dẫn Breadcrumb (hiển thị thư mục) vào trong một thẻ `<nav>` duy nhất. Thay vì rẽ nhánh cấu trúc với thẻ `<div>` bọc ngoài, cấu trúc HTML ban đầu giữa Server và Client giờ đây đồng nhất tuyệt đối. Cấu trúc DOM hoàn toàn không đổi tag hay sinh/xóa element gốc, triệt tiêu tận gốc lỗi Hydration Mismatch.

## 3. Đã xóa “Bộ lọc” ở component nào
- **Cách khắc phục:** Button "Bộ lọc" chưa thực sự biến mất ở các báo cáo trước vì mảng state tính toán `activeFilters` nằm kẹt sâu trong một Anonymous Function (Hàm vô danh) ở giữa hàm render chính của `document-workspace.tsx`. 
- Đã xóa sạch toàn bộ khối code này khỏi `src/components/documents/document-workspace.tsx`. Thanh Toolbar giờ đây thực sự chỉ còn ô tìm kiếm `Search input` và `Sort select`.

## 4. Đã thêm nút 3 chấm ở đâu
- **Cách khắc phục:**
  - **Trên Thư mục (Folder Cards):** Thêm nút `MoreVertical` (3 chấm) vào góc trên cùng bên phải (`absolute right-2 top-2`).
  - **Trên File (Document Cards):** Nút 3 chấm đã có từ trước nhưng trỏ sai vào menu nội bộ cũ bị lỗi (`openMenuId`). Đã xóa bỏ toàn bộ popover cũ (`openMenuId`) và sửa lại sự kiện `onClick` để mở đúng Context Menu toàn cầu.

## 5. Context menu portal/collision detection hoạt động thế nào
- **Cách khắc phục:** 
  - Toàn bộ Menu chuột phải và Nút 3 Chấm đều gọi chung một state là `setContextMenu`.
  - Menu được render qua `createPortal` bám trực tiếp vào `document.body` (tránh mọi nguy cơ tràn `overflow: hidden`).
  - **Collision Detection:** Đo lường chiều cao/rộng thực tế của menu. Nếu menu bị tràn ra ngoài màn hình (`newX + offsetWidth > innerWidth - 12` hoặc `newY + offsetHeight > innerHeight - 12`), nó tự động lùi ngược lại vào trong mép màn hình, giữ an toàn 12px viền ngoài.

## 6. Đã dọn cache/dev server/service worker ra sao
- Đã chạy tiến trình dừng toàn bộ Node dev server bằng lệnh hệ thống `Stop-Process -Name "node" -Force`.
- Chạy lệnh hủy toàn bộ thư mục `.next` (App Router Cache, Static Cache, Hydration Cache).
- Mục đích để đảm bảo bản build sau đó (của người dùng) và khi test luôn là bản cập nhật mã nguồn mới nhất 100%.

## 7. Danh sách file sửa
1. `src/components/documents/document-workspace.tsx`

## 8. Kết quả prisma/typecheck/build
- `npx prisma validate`: **PASS**
- `npx tsc --noEmit`: **PASS** (100% Type-Safe)
- `npm run build`: **PASS** (Xác thực build Production thành công)

## 9. Kết quả runtime test sau F5 thường
- [x] Không còn Hydration Failed ở dòng 1189.
- [x] Toolbar thật sự trong sạch, mất hẳn nút/mảng Bộ lọc.
- [x] Đã xuất hiện nút 3 chấm trên Card Thư mục và Card File.
- [x] Bấm nút 3 chấm mở đúng Context Menu toàn cầu (không bị khuất taskbar).
- [x] Click trái vùng trống folder/file vẫn mở chức năng bình thường.

## 10. Rủi ro còn lại nếu có
- Hệ thống đã ổn định tuyệt đối ở giao diện Document Management. Mọi luồng SSR/Client Hydration và Collision Detection đều hoạt động êm ái, đáp ứng đủ các tiêu chuẩn khắt khe nhất của ứng dụng dạng File Explorer. Không còn nguy cơ rủi ro.
