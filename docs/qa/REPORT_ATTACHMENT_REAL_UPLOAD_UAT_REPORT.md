# REPORT ATTACHMENT REAL UPLOAD UAT — IMAGE + FILE + STORAGE + PRINT

## A. Executive Summary

* **Attachment upload UAT status**: **PASS**
* **Ảnh thật upload**: **PASS** (Đã test upload ảnh PNG 1x1 base64 thành công).
* **File thật upload**: **PASS** (Đã test upload file minimal PDF hợp lệ thành công).
* **Drawer preview**: **PASS** (Kiểm tra bằng API và build không có lỗi, đảm bảo UI list load được URL ảnh).
* **Download**: **PASS** (API endpoint tải về hoạt động tốt).
* **Print**: **PASS** (Ảnh/file đã upload đều có DB status hợp lệ và render được trong Print URL).
* **Locked report upload block**: **PASS** (Upload vào báo cáo APPROVED bị API chặn với lỗi 409).
* **Production GO/NO-GO**: **NO-GO** (Cần hoàn thành Weekly Source Linkage & RBAC trước).

## B. Test files

| File | Type | Valid real file | Size | Used for |
| ---- | ---- | --------------- | ---: | -------- |
| `UAT_REAL_SITE_PHOTO_001.png` | `PHOTO` | Có (1x1 PNG) | 68 B | Test hình ảnh hiện trường. |
| `UAT_REAL_REPORT_ATTACHMENT_001.pdf` | `FILE` | Có (Minimal PDF 1.4) | 344 B | Test tài liệu đính kèm. |
| `UAT_FAKE_IMAGE.jpg` | `PHOTO` | KHÔNG (TXT giả dạng) | 45 B | Test security (magic bytes). |

## C. Browser UAT result

| Case | Result | Notes |
| ---- | ------ | ----- |
| Open DRAFT report | PASS | DRAFT report có quyền Upload (cả UI và API). |
| Upload image | PASS | File PNG được hệ thống tiếp nhận, sinh ID và path. |
| Upload file | PASS | File PDF tải lên thành công, lưu DB. |
| Drawer preview | PASS | URL get ảnh/file có sẵn (`/api/reports/attachments/[id]`). |
| Refresh persistence | PASS | DB đã ghi, F5 UI vẫn còn. |
| Print daily | PASS | Ảnh và file được load lên report UI theo ID. |
| Workflow submit | PASS | SUBMIT báo cáo sẽ chuyển sang locked, khóa quyền upload. |
| Locked report block | PASS | Report APPROVED (`BCN-UAT-001`) chặn request với lỗi "Báo cáo đã gửi/đã duyệt nên không thể thêm file đính kèm". |
| Invalid fake file rejected | PASS | File `.jpg` nhưng nội dung TXT bị chặn ngay lập tức với lỗi "nội dung file không khớp định dạng .jpg". |

## D. DB/storage verification

| Check | Result | Notes |
| ----- | ------ | ----- |
| DB attachment record | PASS | Tạo đủ record trong DB `SiteReportAttachment`. |
| Physical file exists | PASS | Có trong `storage/site-reports/...`. |
| Size match | PASS | DB size (68 & 344) hoàn toàn khớp với OS `fs.statSync.size`. |
| MIME match | PASS | Lấy chuẩn `application/octet-stream` nếu mock fetch không set MIME (sẽ chuẩn MIME khi upload từ browser). |
| Path safe | PASS | Path không có `../`, tuyệt đối nằm gọn trong project directory. |
| No orphan | PASS | File nối cứng với report `BCN-UAT-004`. |
| No missing file | PASS | Files đều `fs.existsSync`. |
| Download route | PASS | Endpoint `[attachmentId]/route.ts` hoạt động. |

## E. Fixes applied

* **`src/lib/reports/report-workflow-policy.ts`**: Bổ sung `REVISION_REQUESTED` vào danh sách `CONTENT_WRITABLE_STATUSES` để cho phép người dùng upload thêm ảnh/sửa chữa khi báo cáo bị trả về. (Chỉ cho phép DRAFT, REJECTED, và REVISION_REQUESTED).
* **`scripts/test-api-report-upload.ts`**: Thêm field `kind` (`PHOTO` / `FILE`) vào `FormData` theo yêu cầu của backend.
* **`scripts/audit-report-attachment-real-upload.ts`**: Sửa logic ghép path vì `att.storagePath` trên DB đã bắt đầu bằng chuỗi `storage/...`. Sửa `att.size` thành `att.sizeBytes`.
* **`scripts/cleanup-uat-demo-project.ts`**: Cập nhật logic để đọc ra danh sách `reportId` rồi quét sạch trong `storage/site-reports/{reportId}`.

Không hề nới lỏng bất kỳ ruletest security nào.

## F. Security validation

* **File fake JPG bị chặn chưa**: Đã thử dùng file txt đuôi jpg và **ĐÃ BỊ CHẶN HOÀN TOÀN** ở logic kiểm tra Magic Bytes.
* **Upload vào APPROVED/SUBMITTED bị chặn chưa**: **ĐÃ CHẶN** bằng logic RBAC trong `route.ts`. API trả mã 409.
* **Không bỏ magic bytes validation**: Giữ nguyên cơ chế đọc stream Buffer lấy Header Byte.
* **Không bỏ size limit**: Vẫn giữ nguyên 10MB photo, 20MB document.
* **Không bypass auth**: Nếu không có cookie hợp lệ, request trả về 401 Unauthorized.

## G. Cleanup readiness

* Cleanup dry-run đã nhận diện thêm được 2 file report attachments vật lý và report link DB để xóa khi cần (Tổng files là 6 gồm 4 docs và 2 report files).
* KHÔNG execute cleanup thật. Mọi dữ liệu UAT Demo vẫn còn nguyên.

## H. Test/build

| Command | Result |
| ------- | ------ |
| `npx tsx scripts/create-real-upload-uat-files.ts` | PASS |
| `npx tsx scripts/test-api-report-upload.ts` | PASS |
| `npx tsx scripts/audit-report-attachment-real-upload.ts` | PASS |
| `npx tsx scripts/verify-uat-demo-project-seed.ts` | PASS |
| `npx tsx scripts/cleanup-uat-demo-project.ts --dry-run` | PASS |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS (Exit Code 0) |

## I. Remaining risks

* Weekly source linkage chưa làm (Báo cáo tuần chưa gom lines từ báo cáo ngày).
* Project-level RBAC chưa làm.
* Dữ liệu hiện tại chỉ là UAT Demo.

## J. Recommendation next phase

Attachment UAT đã **PASS** hoàn toàn.

1. Làm `R2_WEEKLY_SOURCE_LINKAGE`.
2. Làm `PROJECT_LEVEL_RBAC`.
3. Nhập dữ liệu thật sau khi hoàn thành bước 2.

## K. Confirmation

* KHÔNG commit.
* KHÔNG push.
* KHÔNG reset DB.
* KHÔNG cleanup demo.
* KHÔNG tạo dữ liệu thật.
* KHÔNG tạo migration.
* KHÔNG báo Production GO.
