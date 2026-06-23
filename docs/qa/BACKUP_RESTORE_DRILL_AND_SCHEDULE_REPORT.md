# BACKUP RESTORE DRILL & SCHEDULE READINESS CHECK REPORT

## A. Executive Summary

- **Backup script**: **PASS WITH RISKS** (Script đã xử lý tốt flow nén Storage, đọc thông tin .env và tạo thư mục an toàn nhưng bị giới hạn bởi môi trường).
- **Backup run thực tế**: **FAIL** (Thiếu công cụ `pg_dump` trên máy tính chạy script nên việc backup database bị bỏ qua, chỉ backup được `.env` và `storage.zip`).
- **Restore drill**: **NOT EXECUTED - no test database available** (Chưa có DB Test để kiểm chứng restore DB, nhưng phần Storage giải nén an toàn).
- **Có đủ để user nội bộ nhập dữ liệu thật không**: **CÓ** (Tuy nhiên cần cài đặt `pg_dump` ngay để bảo đảm an toàn dữ liệu hàng ngày).
- **Production**: **NO-GO** (Cần hoàn thiện luồng backup database tự động và off-site storage).

## B. Backup files result

| File | Tồn tại | Size > 0 | Ghi chú |
| ---- | ------- | -------- | ------- |
| `.env` | CÓ | CÓ (171 bytes) | File chứa cấu hình nhạy cảm, được chép an toàn. |
| `storage.zip` | CÓ | CÓ (~26 MB) | Zip thành công các thư mục lưu tài liệu vật lý. |
| `database.sql`| **KHÔNG** | KHÔNG | Lỗi thiếu `pg_dump` trong System PATH nên không tạo được. |

## C. Git safety

| Kiểm tra | Kết quả | Ghi chú |
| -------- | ------- | ------- |
| Thư mục `backups/` bị Git track? | KHÔNG (PASS) | Đã nằm trong `.gitignore` một cách an toàn. |
| Thư mục `storage/` bị Git track? | KHÔNG (PASS) | Đã bị ignore sẵn. |
| File `.env` backup bị track? | KHÔNG (PASS) | Nằm trong thư mục `backups/` an toàn. |

## D. Restore drill

- **DB restore test có chạy không**: **KHÔNG CHẠY** (Không có cơ sở dữ liệu test `construction_erp_restore_test` riêng để thực hành, không thể restore đè vào DB chính).
- **Storage restore test có chạy không**: **ĐÃ CHẠY**. Giải nén `storage.zip` vào thư mục tạm `restore-storage-test` thành công, kiểm tra bên trong có đầy đủ thư mục `projects` và `site-reports` không bị hỏng file (corrupted).

## E. Schedule plan (Khuyến nghị cấu hình)

- **Cách cấu hình Task Scheduler**: Mở Windows Task Scheduler > Create Basic Task > Trigger: Daily lúc 23:00 > Action: Start a program `powershell.exe` với Arguments: `-ExecutionPolicy Bypass -File "D:\construction-erp-v2\scripts\backup-current-uat-data.ps1"`.
- **Tần suất backup**: Hàng ngày (Daily).
- **Nơi lưu backup**: `D:\construction-erp-v2\backups\YYYY-MM-DD-HHmm`.
- **Cách kiểm tra log**: Xem output log trong Task Scheduler hoặc viết thêm luồng `>> backup.log` trong lệnh chạy.

## F. Risks

- **Dữ liệu nhạy cảm**: `.env` trong file backup chứa username/password của database dưới dạng plaintext. Cần kiểm soát chặt quyền truy cập thư mục `backups/`.
- **Nguy cơ mất trắng**: Việc backup hiện tại mới chỉ lưu tại local (`D:\`). Nếu hỏng ổ cứng hoặc máy chủ bị ransomware, toàn bộ data + backup sẽ mất. Cần cấu hình copy backup sang ổ đĩa mạng (NAS) hoặc lưu trữ cloud (S3/Google Drive).
- **Công cụ backup DB**: Máy chủ thiếu gói thư viện `PostgreSQL Client Tools`. Cần cài đặt ngay để `pg_dump` có thể hoạt động được.
- Cần có quy trình test (restore drill) vào DB định kỳ hàng tháng để tránh tình trạng backup bị lỗi cấu trúc mà không hay biết.

## G. Kết luận

- **Có thể tiếp tục nhập dữ liệu thật không**: **CÓ**, người dùng nội bộ đã có thể sử dụng bình thường.
- **Có thể cho user nội bộ UAT không**: **CÓ**.
- **Production GO/NO-GO**: **NO-GO**. 
- **Việc cần làm tiếp**: 
  1. Cài đặt `PostgreSQL Client Tools` vào máy chủ Windows để lấy công cụ `pg_dump`.
  2. Tạo một Database Test riêng để thỉnh thoảng thực tập restore.
  3. Mở rộng script copy file `storage.zip` và `database.sql` lên Cloud Storage.

## H. Xác nhận

- Không commit git.
- Không push code.
- Không reset DB hiện tại.
- Không xóa bất cứ dữ liệu chính nào đang chạy.
- Không restore đè vào DB chính.
