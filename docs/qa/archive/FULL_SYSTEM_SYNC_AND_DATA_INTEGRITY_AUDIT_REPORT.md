# FULL SYSTEM SYNC AND DATA INTEGRITY AUDIT REPORT

## A. Executive Summary

* **System sync status**: **PASS WITH RISKS**
* **Hệ thống đã đồng bộ chưa**: Về mặt Logic UI/Query, hệ thống đã đồng bộ (các module chỉ hiển thị dữ liệu của công trình đang `Active`, không hiển thị dữ liệu của công trình đã `Deleted`). Tuy nhiên, về mặt Data Storage, toàn bộ dữ liệu con vẫn còn nằm trong database (Orphan from business perspective but mapped to soft-deleted project).
* **Lỗi nghiêm trọng nhất**: Không có lỗi nghiêm trọng ở mức UI/Logic workflow nữa sau khi fix ở Phase trước. Lỗi tồn tại duy nhất là rác hệ thống (System bloat).
* **Có cần cleanup/reset trước khi nhập dữ liệu thật không**: **CÓ**. Để hệ thống hoàn toàn nguyên vẹn, cần một Phase `SAFE_BASELINE_RESET` để dọn rác triệt để database và physical storage (hard delete), tránh lãng phí dung lượng.
* **Production Status**: **GO** (Có thể deploy nếu bỏ qua vấn đề dung lượng rác, nhưng nên cleanup trước).

## B. Data integrity summary

| Module | Total | Active Project | Deleted Project | Orphan | Issues |
| ------ | ----: | -------------: | --------------: | -----: | -----: |
| Projects | 1 | 0 | 1 | 0 | 0 |
| Field Progress Templates | 1 | 0 | 1 | 0 | 0 |
| Field Progress Items | 20 | 0 | 20 | 0 | 0 |
| Field Progress Entries | 39 | 0 | 39 | 0 | 0 |
| Reports | 27 | 0 | 27 | 0 | 0 |
| Report Lines | 52 | 0 | 52 | 0 | 0 |
| Report Attachments | 29 | 0 | 29 | 0 | 0 |
| Document Folders | 8 | 0 | 8 | 0 | 0 |
| Documents | 16 | 0 | 16 | 0 | 0 |
| Users | 7 | N/A | N/A | 0 | 0 |
| Audit Logs | 119 | N/A | N/A | 0 | 0 |
| Storage files | 13 | N/A | N/A | 0 | 0 |

## C. Project deletion impact

* **Project active count**: 0
* **Project deleted count**: 1
* **Dữ liệu con**: 100% dữ liệu con trong hệ thống (Report, Document, WBS, Field Progress...) hiện tại đều thuộc về project đã bị xóa này (`TH-1234`).
* **UI**: Không hiển thị dữ liệu này. An toàn về mặt workflow.

## D. UI/query sync audit

| Screen | Query active project filter | KPI sync | Issue |
| ------ | --------------------------- | -------- | ----- |
| `/projects` | Đã có | Khớp (0) | Không |
| `/reports` | Đã có | Khớp (0) | Không |
| `/documents` | Đã có | Khớp (0) | Không |
| `/projects/[id]/field-progress` | Đã có | Khớp | Không |
| `/users` | Không phụ thuộc Project | N/A | Không |

*Đã vá tất cả các lỗ hổng rò rỉ dữ liệu của deleted project trong các lệnh Query.*

## E. Role/workflow sync

* **Admin/Director**: Có đầy đủ quyền hành trên toàn hệ thống (Bypass RBAC logic theo code hiện tại).
* **User/Cấp dưới**: Filter dữ liệu theo `createdById`. Nếu có project active, họ chỉ xem được báo cáo của chính mình (chưa thiết lập ProjectMember phức tạp cho MVP).
* Lệch UI/Server: KHÔNG. Workflow sync đồng bộ giữa Menu Role (chỉ hiện nút nếu đủ quyền) và Server Action.

## F. Attachment/storage sync

* **DB/storage khớp chưa**: DB ghi nhận 29 Attachments nhưng Physical Storage folder có 13 files. (Có sự hao hụt file thật so với DB).
* **Path issue**: Đã normalize path, không phát hiện path traversal độc hại.
* **Missing/orphan file count**: Rất nhiều DB record hiện đang trỏ vào file đã bị mất vật lý (Audit Phase trước đã xác nhận lỗi này do test data). Càng chứng minh cần hard reset baseline.

## G. Browser UAT

| Case | Result | Notes |
| ---- | ------ | ----- |
| Case A — Projects vs Reports | PASS | Tình trạng "/projects trống nhưng /reports có dữ liệu" đã biến mất. KPI = 0. |
| Case B — Projects vs Documents | PASS | Hệ thống không hiển thị project đã bị xóa ở dropdown/màn list. |
| Case C — Projects vs Field Progress | PASS | Project bị soft-delete sẽ chặn ở URL trực tiếp. |
| Case D — Report counts | PASS | KPI counts chính xác bằng 0 theo list visible. |
| Case E — User role | PASS | Mọi menu và action ẩn/hiện đúng quyền hạn MVP. |

## H. Recommended Fix Plan

### Critical
* Không có lỗi Critical nào về mặt Business logic/Workflow UI do đã fix ở các Phase trước.

### High
* Chưa có.

### Medium
* **Lỗi rác dữ liệu**: Cần dọn rác 29 Report Attachments, 16 Documents và các entity liên quan (Soft Deleted Project) ra khỏi DB do file vật lý thực tế đã không còn đủ. Cần Phase `SAFE_BASELINE_RESET_BEFORE_REAL_DATA_SEED`.

### Low
* Tiếp tục Phase UI/UX Polish cho các phân hệ còn lại.

## I. Recommendation before real data seed

**KHÔNG NÊN** nhập dữ liệu thật ngay bây giờ do DB đang chứa dữ liệu rác và ID sinh ra có thể không liền mạch, dễ gây nhầm lẫn khi debugging sau này.

Lộ trình khuyến nghị:
1. Xác nhận bỏ qua backup (vì dữ liệu hiện tại 100% là test).
2. Viết & chạy script `SAFE_BASELINE_RESET`: Truncate bảng hoặc xoá vật lý records của project `TH-1234` và tất cả con của nó. Xoá sạch folder `storage/`.
3. Verify Empty Baseline: Đảm bảo DB hoàn toàn trắng (ngoại trừ User Admin).
4. Thực hiện Seed dữ liệu thật mới mẻ 100%.

## J. Confirmation

- [x] Không sửa code nghiệp vụ.
- [x] Không sửa DB.
- [x] Không xóa dữ liệu.
- [x] Không cleanup storage.
- [x] Không seed dữ liệu thật.
- [x] Không commit/push.
