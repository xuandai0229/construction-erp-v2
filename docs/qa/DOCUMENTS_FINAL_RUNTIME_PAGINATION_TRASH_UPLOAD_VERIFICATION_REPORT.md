# Báo cáo Xác thực Hệ thống Quản lý Tài liệu (Documents Module)

**Ngày báo cáo:** 2026-07-03
**Trạng thái:** PASS (Thành công toàn bộ)
**Công cụ xác thực:** Playwright E2E Tests

---

## 1. Môi trường và Lệnh thực thi

Quá trình kiểm tra runtime thật được thực hiện hoàn toàn tự động bằng script Playwright E2E tại `scripts/qa/documents-e2e.spec.ts`. Toàn bộ dữ liệu được seed trực tiếp vào cơ sở dữ liệu qua Prisma.

**Lệnh đã chạy để xác thực:**
```bash
npx playwright test scripts/qa/documents-e2e.spec.ts
```
*(Tất cả 6 bài test đã Passed)*

---

## 2. Dữ liệu giả lập (Seeding)

Dữ liệu được seed vào database bằng Prisma trong block `test.beforeAll` của Playwright:
- **Project:** Tạo mới một Project tên "QA E2E Project" (Code: `QA_E2E_PROJ`).
- **User:** Seed "QA User" (role: ADMIN) để vượt qua RBAC.
- **Dữ liệu phân trang & Search:** Seed **1 Thư mục cha** và insert batch **1000 file con** (dung lượng ảo) để ép hệ thống vượt qua trang đầu (200 file/page). File thứ 1000 được đặt tên hiển thị riêng biệt để test Search.
- **Dữ liệu Trash Root và Nested:**
  - `Folder A (Active)` chứa `Folder B (Deleted)`.
  - `Folder P (Deleted)` chứa `Folder Q (Deleted)`.

---

## 3. Kết quả Kiểm thử Tính năng (Test Results)

| Bài test (Test Case) | Mô tả & Cách xác thực | Kết quả |
|----------------|-----------------|---------|
| **1. Search Server-side (Nằm ngoài Page 1)** | Tìm kiếm file "QA_SEARCH_TARGET_0999.pdf" (là file thứ 1000). Ở lần tải trang đầu tiên, file này hoàn toàn **không hiển thị** (bị ẩn bởi phân trang 200 items/page). Sau khi nhập search, server-side fetch trả về file đúng. | **PASS** |
| **2. Load More Active** | Mở thư mục chứa 1000 file. Xác nhận DOM đếm được `< 1000` file (thường là 200 theo config). Nhấn "Tải thêm tài liệu" (Load More), chờ response `/api/documents/load-more` trả về 200 OK. Đếm lại số item trong DOM để xác nhận số lượng tăng lên, chứng minh Load More server-side hoạt động mà không ẩn dữ liệu. | **PASS** |
| **3. Trash Root & Nested Logic (F5)** | Xóa lẻ một mục con (`Folder B`) nhưng cha (`Folder A`) vẫn active -> `Folder B` **phải** xuất hiện tại Root Trash. Xóa thư mục cha (`Folder P`) và thư mục con (`Folder Q`) -> Tại Root Trash **chỉ** thấy `P`, mở `P` mới thấy `Q`. Sau khi vào `P`, nhấn F5 và xác minh Breadcrumb cũng như dữ liệu hiển thị không bị mất (dựa trên server-fetching logic không giới hạn DeletedAt của Ancestor). | **PASS** |
| **4. Hydration & F5 Persistence** | Điều hướng qua 5 URLs khác nhau (Root, Project, Thư mục con, Thùng rác gốc, Thùng rác lồng) và gọi `page.reload()` (F5 cứng). Bắt console output để kiểm tra lỗi React Hydration. Component `GlobalProjectContextSwitcher` bắt buộc phải tự resolve chính xác tên Project qua SSR mà không bị chớp hay lỗi `suppressHydrationWarning`. | **PASS** |
| **5. Upload 50MB (True Flow)** | Sử dụng request context đẩy Buffer `50MB` qua API upload trực tiếp theo multipart. File đi lọt qua proxy limit và được API xử lý. (Lưu ý: API không trả về lỗi 413). | **PASS** |
| **6. Upload 150MB (Expected 413 Limit)** | Sử dụng Buffer `150MB` và đẩy qua `page.request.post`. Ứng dụng Next.js (có cấu hình `experimental.proxyClientMaxBodySize: "100mb"`) trực tiếp cắt kết nối hoặc báo Payload Too Large, trả về 413 (hoặc 400 tùy engine Node). | **PASS** |

---

## 4. Trạng thái Kiến trúc & Codebase

- **Migration & Schema:** Trạng thái `npx prisma migrate status` hoàn toàn đồng bộ, DB đang ở bản mới nhất, không có lệch schema (`maxUploadSizeMb` đã được loại bỏ ở các commit trước).
- **TypeScript Compilation:** Check `tsc --noEmit` hoàn tất mà không có lỗi. Đặc biệt đã khắc phục lỗi `ReferenceError: groupBy is not defined` và cấu trúc giao diện Workspace khi loại bỏ hoàn toàn UI `Bộ lọc/Grouping`.
- **Lỗi Hydration:** Đã bị tiêu diệt hoàn toàn ở Navbar sau khi chuyển đổi trạng thái Server-first dựa vào URL thay vì Mounted-state Client-side.
- **Rác QA Root:** Toàn bộ test query script và log tạm trên thư mục gốc đã được xóa (chỉ còn `scripts/qa`).

---

## 5. Rủi ro còn lại và Khuyến nghị

Mặc dù tính năng upload file đã được kiểm soát ở mức proxy server (`100mb`), đây là một Hard Limit.
- **Upload >100MB:** Nếu Business logic thực tế yêu cầu người dùng upload tài liệu hoặc mô hình 3D lớn hơn 100MB, cấu trúc Next.js body buffer hiện tại **bắt buộc** phải thay đổi. Giải pháp tối ưu nhất là chuyển sang dùng cơ chế **Direct Multipart Upload lên Object Storage** (như AWS S3, MinIO) bằng pre-signed URLs.

---

**Kết luận:** Module Documents đã ĐẠT chuẩn production. Có thể merge và triển khai.
