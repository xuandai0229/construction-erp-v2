# BACKUP DB FIX & RESTORE READINESS REPORT

## A. Executive Summary

- **DB backup**: **PASS** (Đã phát hiện và sử dụng thành công `pg_dump.exe` với xử lý bóc tách Query Parameter an toàn).
- **Storage backup**: **PASS** (Tiếp tục nén thành công thư mục `storage/` ra file `storage.zip`).
- **Restore drill**: **PASS** (Đã thực hành tạo cơ sở dữ liệu `construction_erp_restore_test` độc lập và dùng `psql` để import lại dữ liệu từ file backup mà không phát sinh bất kỳ lỗi `COPY` hoặc `ALTER` nào).
- **Có đủ để nhập dữ liệu thật dài hạn không**: **CÓ** (Luồng lưu trữ đã được bảo vệ hoàn chỉnh qua backup, có thể yên tâm sử dụng hàng ngày).
- **Production**: **NO-GO** (Cần thiết lập Task Scheduler chạy thực tế trên máy chủ và upload backup sang phân vùng lưu trữ thứ 3 để đảm bảo an toàn cao nhất).

## B. pg_dump detection

| Kiểm tra | Kết quả | Ghi chú |
| -------- | ------- | ------- |
| Tìm `pg_dump.exe` trên máy chủ | **PASS** | Đã định vị tự động tại `C:\Program Files\PostgreSQL\16\bin\pg_dump.exe`. |
| Kết nối chuỗi cấu hình Prisma | **PASS** | Bóc tách thành công tham số `?schema=public` gây lỗi để lệnh `pg_dump` thực thi mượt mà. |

## C. Backup result

| File | Tồn tại | Size > 0 | Ghi chú |
| ---- | ------- | -------- | ------- |
| `database.sql` | CÓ | CÓ (156 KB) | Được dump hoàn chỉnh, giữ lại đúng dữ liệu UAT. |
| `storage.zip` | CÓ | CÓ (~26 MB) | Lưu đúng các cấu trúc tài liệu PDF/Jpg. |
| `.env` | KHÔNG | - | (Skipped) Bỏ copy mặc định để tránh lộ lọt mật khẩu DB ra folder không mã hóa. |

## D. Git safety

| Kiểm tra | Kết quả | Ghi chú |
| -------- | ------- | ------- |
| Backup có bị git track không | KHÔNG (PASS) | Thư mục `backups/` an toàn. |
| `.env` backup có bị git track không | KHÔNG (PASS) | Không bị track. |
| `storage/` có bị git track không | KHÔNG (PASS) | Đã ignore sẵn. |

## E. Restore drill

- **Có restore DB test không**: **CÓ**.
- Đã thực hiện tạo mới DB bằng lệnh `CREATE DATABASE construction_erp_restore_test;`.
- Đã chạy lệnh `psql` restore từ `database.sql`.
- Output log thể hiện toàn bộ `COPY`, `CREATE INDEX`, `ALTER TABLE` đã hoàn thành mà không có lỗi gãy vỡ khóa ngoại.
- **Không đè**: Tuyệt đối không can thiệp hay khôi phục ngược vào DB chính `construction_erp_v2`.

## F. Risks

1. **Rủi ro ổ cứng local**: Lưu chung file nén backup ở ổ đĩa chạy Server vẫn chịu rủi ro mất hoàn toàn khi hỏng ổ vật lý. Cần copy sang NAS/S3/Google Drive.
2. **Task Scheduler**: Script đã sẵn sàng, admin cần add job vào Windows Task Scheduler để chạy daily tự động.
3. **Mã hóa file SQL**: File dump không được mã hóa, bất kỳ ai vào được ổ cứng đều đọc được dữ liệu. Có thể cân nhắc thêm bước dùng 7zip đặt password cho file backup.
4. Cần test luồng khôi phục định kỳ (ví dụ mỗi cuối tháng).

## G. Kết luận

- **Có thể cho user nội bộ UAT không**: **CÓ**.
- **Có thể cho nhập dữ liệu thật dài hạn không**: **CÓ** (Luồng Backup/Restore đã thông, đảm bảo dữ liệu không bị bay mất).
- **Production GO/NO-GO**: **NO-GO**.
- **Việc cần làm tiếp**: Tích hợp luồng rsync file backup ra khỏi máy chủ hiện tại và setup tính năng tự động dọn dẹp các thư mục backup cũ hơn 30 ngày (Retention Policy).

## H. Xác nhận

- Không commit git.
- Không push source.
- Không reset DB hiện tại.
- Không xóa mất dữ liệu UAT.
- Không restore đè lên DB thật (chỉ restore vào `_test`).
