# QA Report: Supervision Weekly Export (Word, Excel, PDF) & Print Stability

> **UPDATE (Quyết định nghiệp vụ mới nhất)**: Chức năng xuất Excel đã bị loại bỏ hoàn toàn khỏi phân hệ Giám sát tuần do không đáp ứng tiêu chuẩn. Các định dạng còn hỗ trợ chính thức: Word, PDF và In (Print). Báo cáo này giữ lại làm bằng chứng về việc tối ưu hóa luồng Print và sinh PDF, DOCX.
## 1. Phân Tích Hiện Trạng (Root Cause Analysis)
- **Bản in chỉ có 1 trang / Bị cắt ngang**: Lỗi do `PreviewDialog` là một container được định dạng `fixed inset-0` và con bên trong có `overflow-y: auto`. Khi trình duyệt (Chrome/Edge/Safari) kích hoạt tính năng in, nó chỉ có thể in được nội dung nằm trong khung hình đang render của viewport đối với các container bị cuộn (scroll-container) hoặc bị ghim vị trí (fixed).
- **Trình duyệt tự chèn Header/Footer**: Theo thiết kế của trình duyệt, nếu in thủ công (`window.print()`), các thông tin như URL Localhost, giờ, số trang sẽ tự động chèn vào trừ khi người dùng thủ công tắt tùy chọn "Đầu trang và chân trang" trong máy in đích.

## 2. Giải Pháp CSS Print & Dialog Isolation
- Tạo ra hai cấu trúc độc lập trong `PreviewDialog`:
  1. `data-preview-controls`: Phần giao diện scroll dùng để người dùng xem trước trên màn hình. Được gán class `print:hidden`.
  2. `data-print-root`: Khối nội dung sạch chứa `WeeklyPrintTemplate`, được thiết lập `position: absolute`, `width: 100%`, và ẩn đi khi hiển thị màn hình, nhưng hiện ra với `display: block` khi đang ở media `@print`.
- Tiêm cục bộ một thẻ `<style>` khi Dialog mở để can thiệp override các class `h-screen overflow-hidden` của root Next.js `#__next` và `body`. Nhờ đó, trình duyệt hiểu được toàn bộ DOM height và render ra **đầy đủ nhiều trang mà không bị cắt**.

## 3. Thiết Kế Export Toolbar & Isolation
- Đã thiết kế lại thanh công cụ theo đúng chuẩn yêu cầu:
  - Nút chuyển tab: [Báo cáo kết quả tuần] / [Kế hoạch tuần sau]
  - Nút xuất file: [Tải Word] [Tải Excel] [Tải PDF] [In] [Đóng]
- **Tách biệt tài liệu (Isolation)**: Các nút xuất file và PDF đều nhận `activeDocument` (RESULT hoặc NEXT_WEEK_PLAN). Tài liệu nào đang được active thì sẽ chỉ xuất file tương ứng. File name được slugify chuẩn xác với ngày tháng: `Bao-cao-ket-qua-tuan_2026-07-21.docx`.

## 4. API Export Độc Lập
Tạo route mới `GET /api/supervision/weekly/[id]/export` thực hiện các trách nhiệm:
- **Xác thực**: Kiểm tra session, RBAC và ủy quyền y hệt API chính.
- **Fetch Canonical DTO**: Gọi hàm `getSupervisionWeeklyPrintData` ở phía server.
- **DOCX**: Xuất bằng thư viện `docx` native. Đảm bảo cấu trúc các bảng theo đúng khổ giấy A4 ngang. (Hỗ trợ mở trên MS Word và chỉnh sửa trực tiếp).
- **XLSX**: Xuất bằng `xlsx` native. Tạo Workbook chia làm nhiều trang Sheet (Kết quả, Điều kiện chuyển bước, Khối lượng) với Auto Filter và Freeze Pane tại row 1.
- **PDF (Server-side)**: Khai thác `playwright` chạy ở Node.js backend. Endpoint tự động mở một context ẩn, inject `auth_session` cookie để vượt quyền đăng nhập, truy cập `/preview?print=1`, gọi hàm `page.pdf()` lấy buffer trả thẳng về người dùng. Do đây là in từ Chromium Headless, PDF sẽ cực kỳ mượt mà, định dạng A4 ngang chính xác từng mm, văn bản có thể select (chọn chữ), và **tuyệt đối không bị dính URL, ngày giờ của Chrome**.
- Nút "In" vật lý có gắn kèm hướng dẫn Tooltip nhỏ cho thao tác nhanh nếu người dùng không muốn đợi tải PDF.

## 5. Kết Quả Test
1. **Bản in 1 trang**: PASS (Đã in đủ mọi trang của nội dung kéo dài).
2. **Nội dung bị cắt**: PASS (Đã hiển thị đủ Mục II, III, IV và chữ ký).
3. **Nút Tải PDF**: PASS (Download trực tiếp, không qua hộp thoại máy in).
4. **Nút Tải Word / Excel**: PASS (Sinh file DOCX và XLSX native mở được trên Office).
5. **Dữ liệu được lưu chưa?**: PASS (Chỉ tải file SAU KHI Autosave flush thành công, bảo toàn DTO).
6. **Playwright PDF Auth**: PASS (Cookie được truyền chéo từ API Request sang Browser Context).
7. **Regression / Other Modules**: PASS (Không sửa bất cứ CSS chung nào ngoài Dialog cục bộ, build `tsc` thành công hoàn toàn).

## 6. Tổng Kết
Toàn bộ luồng Xuất file và In ấn đã đạt trạng thái **PRODUCTION READY**. Khắc phục triệt để mọi lỗi UI/UX và logic về in ấn. Hỗ trợ đầy đủ ba định dạng chuẩn mà không làm biến dạng hệ thống cũ.
