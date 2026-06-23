# Hướng dẫn thiết lập tự động sao lưu trên Windows (Task Scheduler)

Tài liệu này cung cấp các bước để cấu hình tự động chạy script sao lưu cơ sở dữ liệu và dữ liệu vật lý hàng ngày cho dự án Construction ERP.

## 1. Yêu cầu hệ thống
- Môi trường Windows.
- Đã cài đặt PostgreSQL Client (`pg_dump.exe`) trong biến môi trường PATH hoặc cài ở đường dẫn chuẩn (`C:\Program Files\PostgreSQL\...`).
- PowerShell có quyền thực thi script (Sử dụng `-ExecutionPolicy Bypass`).

## 2. Các bước cấu hình Task Scheduler
1. Mở **Start Menu**, tìm kiếm và mở **Task Scheduler**.
2. Ở bảng bên phải (Actions panel), chọn **Create Basic Task...**
3. **Name**: Nhập `Construction ERP Daily Backup`.
4. **Description**: `Sao lưu dữ liệu PostgreSQL và thư mục storage hàng ngày lúc 23:00`.
5. Nhấn **Next**, chọn **Daily** (Hàng ngày).
6. **Time**: Đặt thời gian là `23:00:00` (hoặc giờ ít truy cập), Recur every: `1` days. Nhấn **Next**.
7. **Action**: Chọn **Start a program**. Nhấn **Next**.
8. Cấu hình Start a program:
   - **Program/script**: Nhập `powershell.exe`
   - **Add arguments (optional)**: Copy dòng sau:
     ```powershell
     -ExecutionPolicy Bypass -File "D:\construction-erp-v2\scripts\backup-current-uat-data.ps1"
     ```
   - **Start in (optional)**: Nhập đường dẫn thư mục gốc:
     ```text
     D:\construction-erp-v2
     ```
9. Nhấn **Next**, kiểm tra lại thông tin tổng hợp rồi nhấn **Finish**.

## 3. Cách kiểm tra sau khi chạy
Sau 23:00 mỗi ngày, bạn hãy mở thư mục dự án `D:\construction-erp-v2\backups`.
- Xem có thư mục mới dạng `YYYY-MM-DD-HHmm` được sinh ra không.
- Kiểm tra bên trong có `database.sql` và `storage.zip`. Kích thước (size) file phải lớn hơn 0.

## 4. Cách kiểm tra log
Bất kỳ khi nào script chạy, toàn bộ log hệ thống sẽ được ghi tại:
`D:\construction-erp-v2\backups\logs\backup-YYYY-MM-DD.log`
Bạn mở file log này ra để xem các thông báo lỗi nếu có.

## 5. Cách chạy thủ công Task
- Mở **Task Scheduler**.
- Chọn **Task Scheduler Library** ở cột bên trái.
- Tìm `Construction ERP Daily Backup` ở danh sách giữa.
- Chuột phải vào task, chọn **Run**.
- Quá trình sẽ chạy ngầm. Bạn kiểm tra lại bằng cách xem thư mục `backups/`.

## 6. Xử lý lỗi nếu không thấy `database.sql`
- Nếu file log có báo lỗi `pg_dump.exe NOT FOUND`, hãy cài đặt *PostgreSQL Command Line Tools* trên máy chạy script.
- Nếu log báo `FATAL: password authentication failed`, hãy kiểm tra lại file `.env` đang lưu mật khẩu có đúng với Database thật không.
