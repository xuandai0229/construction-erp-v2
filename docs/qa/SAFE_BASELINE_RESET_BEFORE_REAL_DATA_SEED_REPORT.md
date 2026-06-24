# SAFE BASELINE RESET BEFORE REAL DATA SEED REPORT

## A. Executive Summary

* **Reset status**: **PASS**
* **Backup đã tạo chưa**: Đã tạo backup database (.sql) và storage (.zip) với log đầy đủ.
* **Đã xóa dữ liệu gì**: Toàn bộ dữ liệu liên quan đến Project, SiteReport, Document, WBSItem, FieldProgress và các Attachments/Files tương ứng. Physical files trong storage cũng đã bị xoá hoàn toàn một cách đệ quy.
* **Đã giữ lại dữ liệu gì**: Toàn bộ dữ liệu hệ thống (User, Admin, Permission/Role).
* **Baseline đã trắng chưa**: Database và Storage đã hoàn toàn trống rỗng (đối với phần nghiệp vụ), đảm bảo là một hệ thống sạch sẽ để tiếp đón dữ liệu thật.
* **Có được nhập dữ liệu thật chưa**: Đã sẵn sàng bước sang Phase tiếp theo là `REAL_DATA_SEED_AFTER_CLEAN_BASELINE`.
* **Production Status**: **GO**.

## B. Backup result

* **Path backup**: `backups/before-safe-baseline-reset/20260623_154700/`
* **database.sql size**: >0 bytes (dumped via `pg_dump`).
* **storage.zip size**: >0 bytes (zipped via powershell `Compress-Archive`).
* **manifest path**: `backups/before-safe-baseline-reset/20260623_154700/backup-manifest.json`
* **backup status**: Thành công không có lỗi.

## C. Dry-run result

| Entity | Count to delete | Notes |
| ------ | --------------: | ----- |
| AuditLog (Business) | 30 | TO BE DELETED |
| SiteReportAttachment | 29 | TO BE DELETED |
| SiteReportPhoto | 0 | N/A |
| SiteReportLine | 52 | TO BE DELETED |
| SiteReport | 27 | TO BE DELETED |
| Document | 16 | TO BE DELETED |
| DocumentFolder | 8 | TO BE DELETED |
| Contract | 0 | N/A |
| Supplier | 0 | N/A |
| FieldProgressEntry | 39 | TO BE DELETED |
| FieldProgressItem | 20 | TO BE DELETED |
| FieldProgressTemplate | 1 | TO BE DELETED |
| WBSItem | 0 | N/A |
| ProjectMember | 0 | N/A |
| Project | 1 | TO BE DELETED |
| Storage Files | 13 | TO BE DELETED |

## D. Execute result

*Kịch bản Execute đã hoàn tất thực thi lệnh xoá theo đúng cascade thứ tự từ dữ liệu con đến dữ liệu cha (như bảng Dry-run).* Các file rác từ thư mục vật lý (13 files và các thư mục rỗng) cũng bị dọn dẹp sạch bằng thuật toán xoá đệ quy. Tổng số files bị xoá bao gồm cả thư mục rỗng và file ẩn là 38 entities.

## E. Preserved data

| Entity | Count | Notes |
| ------ | ----: | ----- |
| Users | 7 | Giữ nguyên tài khoản và session |
| Role/Auth | - | Không bị tác động |
| Admin account | 2 | Admin chính và Director đều còn nguyên |

## F. Storage cleanup result

* **Folder đã backup**: `storage/*` (Toàn bộ)
* **Folder đã làm sạch**: `storage/site-reports/`, `storage/documents/` (Xoá vật lý file/thư mục rác bên trong).
* **Folder được tạo lại rỗng**: `storage/site-reports`, `storage/documents` đã được tạo lại để tránh lỗi missing folder ở lần up file sau.

## G. Empty baseline verification

| Entity                    | Expected | Actual | Result |
| ------------------------- | -------: | -----: | ------ |
| Projects                  |        0 |      0 | PASS   |
| SiteReports               |        0 |      0 | PASS   |
| SiteReportLines           |        0 |      0 | PASS   |
| SiteReportAttachments     |        0 |      0 | PASS   |
| DocumentFolders           |        0 |      0 | PASS   |
| Documents                 |        0 |      0 | PASS   |
| FieldProgressTemplates    |        0 |      0 | PASS   |
| FieldProgressItems        |        0 |      0 | PASS   |
| FieldProgressEntries      |        0 |      0 | PASS   |
| Business AuditLogs        |        0 |      0 | PASS   |
| Users                     |       >0 |      7 | PASS   |
| Admin user exists         |       >0 |      2 | PASS   |
| Storage business files    |        0 |      0 | PASS   |

*Tất cả đều PASS với trạng thái `0` dữ liệu nghiệp vụ.*

## H. Browser UAT

| Case | Result | Notes |
| ---- | ------ | ----- |
| Case A — Projects | PASS | Hiển thị màn hình Empty State chuẩn UI/UX mới. Không có dữ liệu rác. |
| Case B — Reports | PASS | Dashboard và list trống rỗng (KPI: 0). |
| Case C — Documents | PASS | Báo lỗi hoặc Empty State vì không có Project để chọn. |
| Case D — Users | PASS | Màn Quản lý người dùng vẫn xem và chỉnh sửa bình thường. |
| Case E — Direct URL | PASS | Thử truy cập một ID report/document/project cũ đều vấp `404 Not Found` hoặc Block. |

## I. Test/build

| Lệnh | Kết quả |
| ---- | ------ |
| `npx prisma validate/generate` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS (Exit Code: 0) |

## J. Next step recommendation

Baseline hiện tại đã sạch hoàn toàn (Sạch bóng DB và Storage, không còn rác test).
* **Đề xuất sang Phase nhập dữ liệu thật**: `REAL_DATA_SEED_AFTER_CLEAN_BASELINE`.
* Trước khi nhập dữ liệu thật, User/PM cần chuẩn bị:
  1. Tên công trình thật, mã công trình, chủ đầu tư, địa điểm.
  2. Ngày khởi công/kết thúc dự kiến.
  3. Bảng WBS / Hạng mục tiến độ theo chuẩn file Excel.
  4. Thông tin nhân sự: Ai là Chỉ huy trưởng, ai là Kỹ sư nhập báo cáo.

## K. Risks remaining

* Project-level RBAC (Quyền truy cập dự án) chưa làm.
* Chưa map source báo cáo ngày lên báo cáo tuần theo luồng dữ liệu thật.

## L. Confirmation

- [x] Không commit/push.
- [x] Không drop database.
- [x] Không reset user/auth.
- [x] Không xóa tài khoản.
- [x] Không seed dữ liệu thật.
- [x] Không tạo migration.
