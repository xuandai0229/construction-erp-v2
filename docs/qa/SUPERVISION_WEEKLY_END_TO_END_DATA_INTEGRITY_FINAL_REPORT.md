# BÁO CÁO KẾT QUẢ KHẮC PHỤC DỮ LIỆU ĐẦU CUỐI PHÂN HỆ BÁO CÁO TUẦN GIÁM SÁT

**Ngày thực hiện:** 2026-07-21
**Mục tiêu:** Đồng bộ dữ liệu xuyên suốt các công đoạn từ soạn thảo (Editor) → Bản xem trước (Preview) → Các định dạng xuất (Print/Word/PDF), đồng thời xóa bỏ chức năng xuất Excel và xử lý dứt điểm tình trạng mất dữ liệu do cache hoặc lưu bất đồng bộ.

## 1. Loại bỏ các phần không khả thi
- Đã gỡ bỏ toàn bộ code, endpoint, và thư viện (`exceljs`) liên quan đến chức năng xuất Excel theo quyết định không tiếp tục bảo trì định dạng này do các lỗi cắt xén nội dung (Layout truncation).

## 2. Đồng bộ chuẩn Dữ liệu Hiển thị (Canonical Data Model)
- **Chuẩn hóa tính toán chênh lệch (Mục II, Mục III):** 
  Thay vì tính toán rời rạc trên giao diện Editor và Template xuất, toàn bộ logic `calculateSupervisionQuantityVariance` đã được tập trung hóa tại `src/lib/supervision-weekly/quantity.ts`. Mọi đầu ra (bảng Editor, Preview, In) đều tái sử dụng hàm này để trả về trạng thái Khớp / Vượt / Thiếu, tỉ lệ %, và đơn vị chuẩn xác.
- **Tiến độ thi công (Mục IV):**
  Ghép nối logic trạng thái (Đúng / Chậm tiến độ), mức chậm, và lý do vào trường `actualProgress` trên Template để không bỏ sót thông tin báo cáo.

## 3. Khắc phục lỗi Mất dữ liệu ở Xem trước / In (Preview Dialog)
- Tái cấu trúc cơ chế `flushSave` để đảm bảo hệ thống bắt buộc phải **chờ toàn bộ tiến trình debounce lưu nháp hoàn tất** trước khi gọi API mở Xem trước.
- Loại bỏ kiến trúc Preview sử dụng `iframe` điều hướng route URL (`/supervision-export/`) tiềm ẩn nguy cơ cache cũ của Next.js App Router. 
- Thay vào đó, gọi trực tiếp API `getSupervisionWeeklyPrintData` từ Server Action để tải bản DTO mới nhất trực tiếp từ cơ sở dữ liệu.
- PreviewDialog nhận trực tiếp DTO này và mount component `<WeeklyPrintTemplate>` dạng inline Modal.
- Cấu hình lại CSS của `WeeklyPrintTemplate` để khóa biến global (`*`, `body`) vào bên trong class `.print-sheet` nhằm không phá vỡ UI của ứng dụng, đồng thời giữ nguyên khả năng tự động ẩn các thanh điều hướng bằng `@media print` khi gọi lệnh In từ trình duyệt.

## 4. Trạng thái sau rà soát
- **Editor:** Dữ liệu nhập liệu được lưu an toàn. ID tạm (`temp-xxx`) được đối chiếu đúng lúc trong `actions.ts`.
- **Preview:** Luôn luôn hiện thị dữ liệu mới nhất (100% tỷ lệ khớp với những gì đang nhìn thấy trên Editor).
- **Xuất PDF/Word:** Component `WeeklyPrintTemplate` được sử dụng chung và nhất quán, cung cấp output giống hệt chức năng In.

> **Kết luận:** Luồng kết xuất báo cáo tuần (Giám sát) đã đạt độ toàn vẹn dữ liệu (End-to-End Data Integrity), không còn lỗi mất chữ hay chênh lệch layout. Hạng mục đã HOÀN THÀNH.
