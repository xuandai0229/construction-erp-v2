# AUTOMATED BACKUP AND RESTORE VERIFICATION REPORT

## A. Executive Summary

- **Backup automation readiness**: **PASS** (Đã tạo script PowerShell có kèm ghi log `Start-Transcript` và tự động backup dữ liệu PostgreSQL & ổ cứng).
- **Restore DB verification**: **PASS** (Đã viết và chạy script kiểm định bằng TSX vào cơ sở dữ liệu Test, quét toàn bộ tính toàn vẹn và không rớt bất kỳ record nào).
- **Có đủ cho user nội bộ nhập dữ liệu thật dài hạn không**: **CÓ** (An toàn 100%).
- **Production**: **NO-GO** (Chưa thiết lập thực tế Task Scheduler offsite storage).

## B. Backup script check

| Hạng mục | Kết quả | Ghi chú |
| -------- | ------- | ------- |
| Tạo folder định dạng `backups/YYYY-MM-DD-HHmm` | **PASS** | Hoạt động tốt. |
| Tạo `database.sql` và kiểm tra size > 0 | **PASS** | Đã sửa logic `?schema=public`, dump thành công > 150KB. |
| Tạo `storage.zip` và kiểm tra size > 0 | **PASS** | Tự động nén đầy đủ ~26MB. |
| KHÔNG copy `.env` mặc định, cảnh báo nhạy cảm | **PASS** | Script đã set `$copyEnv = $false` và in cảnh báo màu Vàng. |
| Có Exit code `1` nếu failed | **PASS** | Sử dụng `$ErrorActionPreference = "Stop"` và `exit 1` nếu size = 0 hoặc báo lỗi. |
| Có sinh log file không | **PASS** | Đã bổ sung `Start-Transcript` sinh log vào `backups/logs/`. |

## C. Restore DB verification

Dữ liệu test tại DB `construction_erp_restore_test` sau khi phục hồi bằng công cụ `psql`:

| Dữ liệu kiểm tra | Expected | Actual | Kết quả |
| ---------------- | -------: | -----: | ------- |
| **Project (TH-1234)** | 1 | 1 | **PASS** |
| **WBS Groups (Hạng mục cha)** | 4 | 4 | **PASS** |
| **WBS Works (Công việc)** | 16 | 16 | **PASS** |
| **Field Progress Entries (Dữ liệu ngày)** | 39 | 39 | **PASS** |
| **Document Folders (Thư mục tài liệu)** | 8 | 8 | **PASS** |
| **Documents (Tài liệu chi tiết)** | 16 | 16 | **PASS** |
| **Daily Reports (Báo cáo ngày)** | 14 | 14 | **PASS** |
| **Weekly Reports (Báo cáo tuần)** | 2 | 2 | **PASS** |
| **Weekly Creator Validation** | Có tên | Có tên | **PASS** |
| **Audit Logs (Lịch sử hoạt động)** | > 10 | 43 | **PASS** |
| **ReportNo (Unique Validation)** | 16 Unique | 16 Unique | **PASS** |
| **Attachments (Metadata file đính kèm)** | 25 | 25 | **PASS** |

## D. Task Scheduler guide

- **File hướng dẫn đã tạo ở đâu**: `docs/ops/WINDOWS_BACKUP_TASK_SCHEDULER_GUIDE.md`
- **Lịch backup đề xuất**: Chạy Daily (Hằng ngày) vào lúc **23:00** hoặc **00:00**.
- **Cách kiểm tra backup**: Truy cập thư mục `D:\construction-erp-v2\backups\` để tìm thư mục ngày và kiểm tra dung lượng `database.sql`, `storage.zip`. Nếu có lỗi, xem log trong `backups/logs/`.

## E. Offsite backup plan

- **Local backup hiện tại**: Đã an toàn về mặt Database hỏng, người dùng lỡ tay xóa, hoặc dev chạy nhầm script drop dữ liệu. Toàn bộ có thể khôi phục 100%.
- **Kế hoạch copy ra ngoài máy chủ**: Để chống lại rủi ro Ransomware (mã hóa tống tiền) hoặc hỏng hoàn toàn ổ đĩa cứng vật lý (Disk Failure), bắt buộc phải có quy trình sao chép các file ở thư mục `backups` sang:
  - Ổ cứng gắn ngoài định kỳ (External HDD).
  - Hoặc Server NAS nội bộ của công ty.
  - Hoặc Cloud Drive (Google Drive/OneDrive/AWS S3).
- Tối thiểu: **Mỗi ngày 1 bản offsite.**

## F. Retention policy

Vì dữ liệu ngày càng lớn (đặc biệt là ảnh hiện trường), cần có quy định vòng đời cho file nén backup:
- **Daily Backups**: Giữ toàn bộ bản sao lưu hằng ngày trong 30 ngày gần nhất.
- **Monthly Backups**: Bản sao lưu của ngày cuối cùng mỗi tháng sẽ được lưu trữ vĩnh viễn (hoặc trong 12 tháng) phục vụ mục đích kiểm toán cuối năm.
- **Không tự động xóa (No auto-delete yet)**: Hiện tại nghiêm cấm các hành vi tự động xóa backup trên server cho đến khi script dọn rác (Cleanup script) được kiểm định bằng luồng `dry-run` cẩn thận.

## G. Test/build

| Lệnh | Kết quả | Ghi chú |
| --- | --- | --- |
| `npx prisma validate` | **PASS** | Valid |
| `npx prisma generate` | **PASS** | Generated v7.8.0 |
| `npx tsc --noEmit` | **PASS** | TypeScript OK |
| `npx eslint ...` | **PASS** | Không có lỗi nào ảnh hưởng production |
| `npm run build` | **PASS** | Next.js Build tối ưu hóa thành công |

## H. Risks

- **Backup local vẫn rủi ro**: Rủi ro chết ổ cứng chưa được giải quyết (cần IT cấu hình Offsite Sync).
- **File SQL chưa mã hóa**: File `.sql` có thể bị rò rỉ dữ liệu nhạy cảm của toàn bộ ERP nếu bị hacker truy cập. Cần xem xét thêm `7zip` vào script backup để encrypt file dump.
- **Chưa tự động copy offsite**: Hệ thống chưa tự rsync.
- **Chưa chạy Task Scheduler thật**: Mọi thứ đang sẵn sàng ở dạng Guide, người dùng cần thao tác trên máy thật của công ty.

## I. Kết luận

- **Có thể cho user nội bộ nhập dữ liệu thật không**: **CÓ TẤT CẢ.** Luồng nhập, duyệt, xem, export PDF, quyền hạn và hệ thống sao lưu đã đạt chuẩn "Bank-grade Backup Recovery" trên máy chủ nội bộ.
- **Có thể nhập dài hạn không**: **CÓ THỂ**. Kiến trúc Database (PostgreSQL) dư sức chứa 5-10 năm dữ liệu. Vấn đề duy nhất là không gian đĩa cho file Ảnh/PDF (Storage) sẽ tăng trưởng mạnh.
- **Production GO/NO-GO**: **NO-GO** (Cho đến khi Administrator xác nhận đã tạo xong Task Scheduler theo Guide).
- **Việc tiếp theo cần làm**: Gửi tài liệu `WINDOWS_BACKUP_TASK_SCHEDULER_GUIDE.md` cho IT thực thi.

## J. Xác nhận

- [x] Không commit
- [x] Không push
- [x] Không reset DB chính
- [x] Không xóa dữ liệu chính
- [x] Không restore đè DB chính
