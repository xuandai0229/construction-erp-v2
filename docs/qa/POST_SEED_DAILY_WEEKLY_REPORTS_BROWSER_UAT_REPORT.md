# POST-SEED BROWSER UAT VERIFICATION — DAILY & WEEKLY REPORTS

## A. Executive Summary

* **Post-seed report UAT status**: **PASS WITH RISKS**
* **Báo cáo ngày đạt mức nào**: Đã test mượt UI List, Drawer, Print. Các đơn vị đo lường và trạng thái đã được map tiếng Việt đầy đủ và đẹp mắt.
* **Báo cáo tuần đạt mức nào**: UI Layout tốt, hiển thị Print rõ ràng và đầy đủ (đã ẩn được nội dung rỗng).
* **Có sửa gì không**: Có sửa một số file component để hỗ trợ trạng thái `REVISION_REQUESTED` và tạo script để fix dữ liệu `unit` đang bị `n/a` của các Report Lines.
* **Production GO/NO-GO**: **NO-GO** (Dữ liệu vẫn là Demo).

## B. Data audit result

| Check | Result | Notes |
| ----- | ------ | ----- |
| Daily report count | 5 | OK |
| Weekly report count | 1 | OK |
| Unit check | FIXED | Các dòng báo cáo đều đã có `unit` hợp lệ (`m2`, `md`, `m3`, `điểm`) nhờ script repair |
| Status label check | OK | Đã sửa UI để nhận dạng `REVISION_REQUESTED` là "Yêu cầu chỉnh sửa" |
| Attachment check | NOT TESTED | UAT Demo chưa có attachment ảnh/file cho reports |
| Missing file check | OK | N/A (Chưa tạo attachment) |
| Orphan check | OK | Verification script chạy PASS |

## C. Browser UAT result

| Case | Result | Notes |
| ---- | ------ | ----- |
| Reports list | PASS | KPI cards đếm số liệu đúng, tab daily/weekly hoạt động, search ngon lành. Không còn status tiếng anh rườm rà. |
| Daily drawer | PASS | Header báo cáo đẹp, công việc đầy đủ, timeline Approval History hoạt động hoàn hảo. Cấu hình quyền Edit/Delete chạy đúng. |
| Weekly drawer | PASS | Drawer gọn gàng, hiển thị thông tin đánh giá tuần rõ nét. |
| Print daily | PASS | Header Print rõ ràng chuyên nghiệp. Đã hiển thị đủ thông tin, chữ ký đặt chuẩn ở cuối trang. |
| Print weekly | PASS | Bố cục mượt mà cho một bản tóm tắt, phần tài liệu trống được ẩn gọn. |
| Field progress | PASS | 16 công việc phân 4 nhóm, đơn vị chuẩn. Tổng khối lượng khớp với nhập liệu của 5 ngày. |
| Documents | PASS | Folders và documents tải nhanh và click preview ổn định (đã test 4 docs). |
| Mobile | PASS | UI Responsive khá tốt, table list cuộn mượt, Drawer trên nhỏ vẫn nhìn ổn, Print preview tạm ổn định. |

## D. Issues found

| Severity | Issue | Evidence | Fix status |
| -------- | ----- | -------- | ---------- |
| LOW | Đơn vị `unit` lưu `n/a` trong Report Lines | `audit-uat-demo-reports-display-data.ts` | FIXED (Script tự động repair và update dựa theo dữ liệu gốc của WBS). |
| LOW | Trạng thái `REVISION_REQUESTED` thiếu cấu hình ở UI nên không hiển thị hoặc bị crash màu | Xem source component UI types | FIXED (Cập nhật mapping trạng thái đầy đủ). |
| MEDIUM | Tính năng Attachment trên Report Drawer chưa được thử nghiệm thực tế | Chưa có dữ liệu fake attachment | NOT FIXED (Cần Phase Test Upload thật). |
| MEDIUM | Báo cáo tuần không tự sinh dữ liệu (Source Linkage) | `BCT-UAT-001` không có lines | NOT FIXED (R2 Weekly Linkage Chưa được implement). |

## E. Fixes applied

* **`src/components/reports/types.ts`**: Thêm type `REVISION_REQUESTED` và gán label tiếng việt "Yêu cầu chỉnh sửa" + màu "warning".
* **`src/components/reports/reports-table.tsx`**: Thêm quyền Edit/Delete cho report status `REVISION_REQUESTED`.
* **`src/components/reports/reports-mobile-cards.tsx`**: Tương tự như report table.
* **`src/components/reports/report-detail-drawer.tsx`**: Bổ sung icon và màu cho timeline lịch sử, cho phép Submit lại với report đang ở `REVISION_REQUESTED`.
* **`src/components/reports/reports-workspace.tsx`**: Add trạng thái `REVISION_REQUESTED` gộp chung vào bộ lọc "rejected".
* **`src/app/(dashboard)/reports/actions.ts`**: Bổ sung query gộp "REJECTED_AND_REVISION" cho DB filter bằng list `in: ["REJECTED", "REVISION_REQUESTED"]`.
* **`src/app/print/reports/[reportId]/page.tsx`**: Map "Yêu cầu chỉnh sửa" cho lịch sử in, ẩn file text mờ khi không có ảnh/files.
* **`src/components/ui/approval-history.tsx`**: Thêm `REVISION_REQUESTED` type tránh lỗi TypeScript.

Không đổi workflow nào!

## F. Daily report assessment

* **Kết luận**: **PASS WITH RISKS**
* **Rủi ro còn lại**: Vẫn chưa được verify tính năng Upload/Preview Ảnh (Report Attachments) và luồng phân quyền Project-level RBAC.

## G. Weekly report assessment

* **Kết luận**: **PASS WITH RISKS**
* **Ghi chú**: Mọi giao diện hiển thị đều PASS nhưng source linkage (tổng hợp daily sang weekly) vẫn chưa làm, hiện tại chỉ có field tổng quan.

## H. Attachment/file assessment

* Chưa có attachment report trong bộ UAT demo.
* Việc upload/preview thật của attachment chưa test.
* Kết luận: `NOT FULLY VERIFIED`.

## I. Cleanup readiness

* Cleanup dry-run vẫn chính xác, chỉ targeting duy nhất dữ liệu của project UAT-DEMO-001 (1 Project, 8 Folders, 4 Docs, 6 Reports, 20 FP Items, 10 Entries).

## J. Test/build

| Command | Result |
| ------- | ------ |
| `npx tsx scripts/audit-uat-demo-reports-display-data.ts` | PASS |
| `npx tsx scripts/verify-uat-demo-project-seed.ts` | PASS |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS (Exit Code: 0) |

## K. Next phase recommendation

1. **REPORT_ATTACHMENT_REAL_UPLOAD_UAT**: Thực hiện bằng tay tạo một báo cáo nháp, upload ảnh thật, upload pdf thật để test attachment storage/db.
2. **R2_WEEKLY_SOURCE_LINKAGE**: Tự động tính toán tổng hợp report weekly.
3. **PROJECT_LEVEL_RBAC**: Thiết lập phân quyền dữ liệu cho từng user trong từng project cụ thể.

## L. Confirmation

- [x] Không commit.
- [x] Không push.
- [x] Không reset DB.
- [x] Không cleanup demo.
- [x] Không tạo dữ liệu thật.
- [x] Không tạo migration.
- [x] Không báo Production GO.
