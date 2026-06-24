# DATA INTEGRITY: DELETED PROJECT ORPHAN REPORTS FIX REPORT

## A. Executive Summary

* **Issue status**: PASS
* **Root cause**: Khi một `Project` bị xóa mềm (Soft Delete - `deletedAt` được gán ngày), các `SiteReport`, `SiteReportAttachment`, `Document`, và `WBSItem` thuộc dự án đó vẫn được giữ lại trong database và không tự động được cập nhật `deletedAt` thông qua logic Cascading ở tầng Application. Các câu query ở `/reports` (bao gồm filter và màn danh sách) chỉ kiểm tra `SiteReport.deletedAt = null` mà thiếu đi ràng buộc kiểm tra project mẹ còn `Active` hay không. Hậu quả là màn `/projects` thì trống (vì filter đúng), nhưng `/reports` thì lại thấy đầy đủ báo cáo của dự án đã bị xoá.
* **Đã sửa query**: Bổ sung `project: { deletedAt: null }` vào hàm `getSiteReports` và `getSiteReportsPage` để triệt để chặn hiển thị báo cáo của công trình đã xóa ở màn `/reports`. Cũng như cấu hình chặn hiển thị nếu mở trực tiếp bằng URL tại `/print/reports/[reportId]`.
* **Xóa DB/file**: **KHÔNG CÓ DỮ LIỆU/FILE NÀO BỊ XÓA** (chỉ ẩn khỏi UI).
* **Seed dữ liệu thật**: CHƯA SEED DỮ LIỆU THẬT.
* **Production Status**: **GO** (Build thành công).

## B. Root cause

- **Project soft delete**: Hành động xóa Project chỉ là gán `deletedAt`, nhưng không đồng bộ `deletedAt` xuống các bảng con.
- **Reports query thiếu filter project active**: Màn `/reports` query thẳng vào bảng `SiteReport` nhưng quên điều kiện project mẹ. 
- **Quyết định sửa chữa**: Dữ liệu con của một project bị xóa sẽ bị ẩn đi bằng cách giới hạn query ở tầng UI/API thay vì chạy một job delete hàng loạt, nhằm phục vụ mục đích audit trong tương lai.

## C. Data audit result

| Entity | Tổng | Active project | Deleted project | Orphan / Khác | Ghi chú |
| ------ | ----: | -------------: | --------------: | -----: | ------- |
| Project | 1 | 0 | 1 | 0 | |
| SiteReport | 27 | 0 | 27 | 0 | Có 8 báo cáo đã bị xóa mềm từ trước |
| Attachment | 29 | 0 | 29 | 0 | |
| Document | 16 | 0 | 16 | 0 | |
| WBSItem | 0 | 0 | 0 | 0 | |

*Tất cả reports, documents, attachments trên hệ thống hiện tại đều thuộc về 1 dự án duy nhất đã bị xóa mềm (`TH-1234`).*

## D. Query/UI fixes

Đã sửa ở các file sau:
1. `src/app/(dashboard)/reports/actions.ts`: 
   - Hàm `getSiteReports` và `getSiteReportsPage` bổ sung điều kiện `project: { deletedAt: null }` vào biến `where`.
2. `src/app/print/reports/[reportId]/page.tsx`:
   - Bổ sung logic kiểm tra: Nếu `report.project.deletedAt` khác null, trả về một màn hình `Báo cáo không khả dụng` để block quyền truy cập trực tiếp qua URL.
3. Các module khác: `Documents` và `Field-Progress` đều đã an toàn do yêu cầu phải vào từ dự án cụ thể hoặc query đã có filter `deletedAt: null`.

## E. Dry-run cleanup result

- Chạy lệnh mô phỏng `scripts/dry-run-clean-deleted-project-data.ts`.
- **Phát hiện**: 19 SiteReports, 29 Attachments và 16 Documents thuộc dự án đã bị xóa.
- **Proposed action**: 
  - `SiteReport`, `Document`: Đề xuất `SOFT_DELETE_CHILD`.
  - `Attachment`: Đề xuất `KEEP_HIDDEN`.
- **Trạng thái**: Script chạy Dry Run an toàn, **không có sự thay đổi DB nào**.

## F. Browser UAT

| Case | Result | Notes |
| ---- | ------ | ----- |
| Case A — Projects | PASS | `/projects` đang trống và không hiển thị project đã xóa. |
| Case B — Reports | PASS | `/reports` trống, không còn hiển thị báo cáo của project đã xóa. |
| Case C — Documents | PASS | Hệ thống không hiển thị tài liệu của project đã xóa. Báo rỗng. |
| Case D — Print URL | PASS | Báo "Công trình đã bị xóa hoặc không còn hoạt động". |

## G. Test/build

| Lệnh | Kết quả | Ghi chú |
| ---- | ------ | ----- |
| `npx tsx scripts/audit-deleted-project-orphan-data.ts` | PASS | Liệt kê chính xác dữ liệu orphan do bị xoá project. |
| `npx tsx scripts/dry-run-clean-deleted-project-data.ts`| PASS | Liệt kê plan dọn dẹp an toàn. |
| `npx prisma validate` | PASS | |
| `npx prisma generate` | PASS | |
| `npx tsc --noEmit` | PASS | |
| `npx eslint ...` | PASS | |
| `npm run build` | PASS | Exit code: 0 |

## H. Recommendation before real data seed

Để chuẩn bị môi trường chạy thật, bạn nên làm theo lộ trình sau:
1. Xác nhận chiến lược cleanup: Giữ lại để audit hay hard reset trắng trơn hệ thống.
2. Thiết lập Phase `SAFE_BASELINE_RESET_BEFORE_REAL_DATA_SEED` để xóa vật lý toàn bộ file, attachments và database records dư thừa.
3. Tạo mới dữ liệu thật theo quy trình nhập liệu.

## I. Risks remaining

* Toàn bộ dữ liệu con (report, doc) của project đã bị xoá vẫn đang nằm trong DB và làm nặng máy chủ, dù người dùng không thấy được. Nên chạy một script Clean-up Job vào ban đêm hoặc có cơ chế Archive.

## J. Confirmation

- [x] Không commit/push.
- [x] Không reset DB.
- [x] Không hard delete dữ liệu thật.
- [x] Không cleanup storage.
- [x] Không tạo dữ liệu thật mới.
- [x] Không tạo migration.
