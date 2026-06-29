# BACKUP, MULTI-USER UAT & LONG-TERM DATA PERSISTENCE REPORT

## A. Executive Summary

- **Data persistence**: **PASS** (Tất cả dữ liệu đều lưu tại PostgreSQL và Storage vật lý, hoàn toàn bền vững qua các lần khởi động, build lại).
- **Multi-user UAT**: **PASS WITH RISKS** (Logic RBAC ở tầng Backend API hoạt động đúng, nhưng quy trình phân quyền trên UI cần thân thiện hơn).
- **Có đủ cho user nội bộ nhập thật không**: **CÓ**
- **Production**: **NO-GO** (Cần thiết lập xong lịch tự động backup và test quy trình dọn dẹp file trước khi triển khai).

## B. Data storage audit

| Nhóm dữ liệu | Nơi lưu | Có bền vững không | Ghi chú |
| --- | --- | --- | --- |
| **Công trình (Project)** | PostgreSQL | CÓ | Bền vững tuyệt đối |
| **Bảng khối lượng (WBS)** | PostgreSQL | CÓ | Bền vững tuyệt đối |
| **Nhập khối lượng (Entries)** | PostgreSQL | CÓ | Không phụ thuộc LocalStorage |
| **Metadata Tài liệu** | PostgreSQL | CÓ | Bền vững tuyệt đối |
| **Tài liệu cứng (Files)** | `storage/projects/...` | CÓ | Lưu trên ổ cứng thật |
| **Báo cáo (Reports)** | PostgreSQL | CÓ | Bền vững tuyệt đối |
| **File đính kèm (Attachments)**| `storage/site-reports/...` | CÓ | Lưu trên ổ cứng thật |
| **Log lịch sử duyệt** | PostgreSQL | CÓ | Bền vững tuyệt đối |

*Note: Không có bất kỳ dữ liệu nghiệp vụ chính nào đang dùng in-memory mock hoặc LocalStorage của trình duyệt.*

## C. Long-term persistence check

| Kiểm tra | Kết quả | Ghi chú |
| --- | --- | --- |
| **Sau khi F5 trình duyệt** | **PASS** | Giao diện tự động fetch lại từ DB |
| **Sau restart dev server** | **PASS** | Connection tới DB vẫn duy trì ổn định |
| **Sau khi npm run build** | **PASS** | Không ảnh hưởng đến dữ liệu |
| **Query Date Range (1 tuần)** | **PASS** | Trả về 0 do data seed nằm ngoài khoảng 1 tuần gần nhất |
| **Query Date Range (1 tháng)**| **PASS** | Trả về đúng 39 entries khối lượng ngày |
| **Query Date Range (1 năm)** | **PASS** | Trả về đúng 39 entries khối lượng ngày |
| **File storage còn tồn tại** | **PASS** | Cả 16 file documents và 25 ảnh/file đính kèm còn nguyên |

## D. Backup plan

- **Cách backup DB**: Dùng lệnh `pg_dump` để dump dữ liệu PostgreSQL ra file `.sql`.
- **Cách backup storage**: Compress thư mục `storage` thành `storage.zip`.
- **Công cụ tự động**: Script PowerShell `scripts/backup-current-uat-data.ps1` đã được tạo.
- **Cách restore cơ bản**:
  1. Restore DB: `psql --dbname="postgresql://user:pass@host/dbname" -f "database.sql"`
  2. Restore Storage: Giải nén `storage.zip` đè vào thư mục `storage/` ở gốc dự án.
  3. Cài lại file `.env`.
- **Rủi ro nếu không backup**: Mất trắng file PDF/ảnh hiện trường nếu ổ cứng bị lỗi vật lý hoặc ai đó lỡ tay chạy nhầm script reset/cleanup.

## E. Multi-user test matrix

| Role | Hành động | Kết quả mong muốn | Kết quả thực tế | Ghi chú |
| --- | --- | --- | --- | --- |
| **Admin** | Xem, duyệt, chỉnh sửa toàn bộ | Thành công | **PASS** | Quyền lực cao nhất |
| **Director** | Xem tổng quan, duyệt báo cáo | Thành công | **PASS** | Không cần nhập khối lượng |
| **Engineer** | Nhập khối lượng, submit báo cáo | Thành công | **PASS** | Bị chặn quyền Approve |
| **Viewer** | Chỉ xem (Read-only) | Thành công | **PASS** | Bị chặn nút Edit, Upload |

## F. Direct URL/API guard

| Endpoint/URL | Role test | Kết quả mong muốn | Kết quả thực tế |
| --- | --- | --- | --- |
| `/projects/[id]` | Không được assign | HTTP 403 / Redirect | **PASS** (Redirect về danh sách) |
| `/reports` | Không được assign | HTTP 403 / Redirect | **PASS** (Không thấy báo cáo) |
| `/print/reports/[id]` | Không phải Creator/Admin | Giao diện báo lỗi đỏ | **PASS** |
| `/api/reports/attachments/[id]`| Không phải Creator/Admin | HTTP 403 Forbidden | **PASS** |
| `/api/reports/[id]/history` | Không phải Creator/Admin | HTTP 403 Forbidden | **PASS** |
| `/api/reports/[id]/approve` | Cố tình gọi bằng Engineer | HTTP 403 Forbidden | **PASS** |

## G. Test/build

| Lệnh | Kết quả | Ghi chú |
| --- | --- | --- |
| `npx prisma validate` | **PASS** | Valid |
| `npx prisma generate` | **PASS** | Generated v7.8.0 |
| `npx tsc --noEmit` | **PASS** | Không lỗi TypeScript |
| `npx eslint ...` | **PASS** | 0 lỗi |
| `npm run build` | **PASS** | Build thành công |

## H. Lỗi phát hiện

Không phát hiện lỗi rò rỉ dữ liệu hoặc mất mát dữ liệu nào. Khả năng truy xuất bằng date range vượt qua thử nghiệm hoàn hảo.

## I. Rủi ro còn lại

1. **Backup storage tự động**: Script đã có, nhưng chưa cài đặt Windows Task Scheduler / Cron job để chạy mỗi ngày.
2. **Project-level RBAC**: Vẫn cần cấu hình UI tốt hơn để Admin dễ dàng gán Role cho từng user vào công trình.
3. **Cleanup file**: Cần viết thêm script tự dọn file trên ổ cứng khi Document/Report bị Hard Delete.
4. **Unique constraints DB**: Chưa áp dụng ở schema Prisma cho `reportNo` và tổ hợp Weekly.
5. **Production readiness**: NO-GO vì những thiếu sót nhỏ về dọn rác ổ đĩa nêu trên.

## J. Kết luận

- **Dữ liệu có lưu được dài hạn không**: Có, cực kỳ vững chắc trên PostgreSQL và ổ đĩa thật.
- **Có thể tiếp tục nhập dữ liệu thật không**: CÓ.
- **Có thể cho user nội bộ UAT không**: CÓ.
- **Production GO/NO-GO**: NO-GO.
- **Việc cần làm tiếp**: Test việc gán user từ giao diện Admin, cài Task Scheduler chạy backup hàng ngày.

## K. Xác nhận

- [x] Không commit, không push git
- [x] Không reset DB, Không drop DB
- [x] Không xóa dữ liệu
- [x] Không tạo migration mới
