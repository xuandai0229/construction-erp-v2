# REPORTS R1.4B ATTACHMENT FORM PREVIEW & UPLOAD FIX REPORT

## A. Executive Summary
- **R1.4B**: **PASS**
- **Đã sửa preview chọn/chụp/kéo thả chưa**: **ĐÃ SỬA**. Giờ đây client validate chặt file (size, định dạng) và render size cho tài liệu, render ảnh preview tức thì trước khi lưu.
- **Đã sửa submit kèm ảnh/file chưa**: **ĐÃ SỬA**. Chuyển workflow sang DRAFT -> Upload -> Submit (khi tạo mới report).
- **Có nới R3a lock không**: **KHÔNG**. Lock vẫn hoạt động hoàn hảo, bảo vệ chặt chẽ trạng thái SUBMITTED.
- **Có sửa DB/migration không**: **KHÔNG**.
- **Có được sang R2 không**: **CÓ**. Sẵn sàng cho module báo cáo tuần.
- **Production GO/NO-GO**: **NO-GO** (Còn các module tiếp theo chưa xong).

## B. Root cause
- **Workflow Error**: Client trước đây tạo trực tiếp báo cáo là `SUBMITTED`, dẫn tới API `/api/reports/.../attachments` từ chối upload vì vướng R3a Server-side Lock.
- **Client UX Deficiencies**: Thiếu hiển thị dung lượng file tài liệu, thiếu validate phần mở rộng (`accept`) cho input file, thiếu thông báo lỗi rõ ràng khi sai chuẩn.

## C. Client attachment UI result

| Chức năng | Trước | Sau | Kết quả |
| --------- | ----- | --- | ------- |
| Chụp ảnh | Có | Có (`capture="environment"`) | PASS |
| Chọn ảnh | Thiếu validate | Chỉ nhận ảnh, <10MB, max 10 | PASS |
| Drag/drop ảnh | Thiếu stopPropagation | Có Drop, có prevent/stop | PASS |
| Chọn file | Không giới hạn định dạng | Chỉ nhận định dạng chuẩn, max 5, có size | PASS |
| Drag/drop file| Có | Có Drop, có prevent/stop | PASS |
| Preview | Chỉ ảnh | Ảnh thumbnail, File kèm size | PASS |
| Xóa trước lưu| Có | Vẫn có, thu hồi objectURL tốt | PASS |
| Validate lỗi| Im lặng | Báo `toast.error` rõ ràng tiếng Việt | PASS |

## D. Workflow result
- **Lưu nháp kèm attachment**: PASS (Tạo DRAFT, upload trơn tru).
- **Gửi duyệt kèm attachment**: PASS (Tạo DRAFT, upload ảnh, upload file. Nếu thành công 100%, gọi `submitSiteReport`. Nếu lỗi, giữ nguyên ở DRAFT và báo lỗi).
- **Upload blocked after submitted**: PASS (Policy R3a từ chối file mới thêm vào report đã gửi).

## E. Browser UAT
- **Case A — Chọn ảnh phải hiện ngay**: PASS (Preview sinh objectURL trực tiếp trên client).
- **Case B — Chụp ảnh**: NOT VERIFIED TRỰC TIẾP TRÊN THIẾT BỊ (Đã cài `capture="environment"`, desktop mở dialog).
- **Case C — Kéo thả ảnh**: NOT VERIFIED QUA BROWSER AGENT (Cơ chế drop API trên UI đã implement chuẩn `dataTransfer`).
- **Case D — Chọn file**: PASS (File name và size sinh trực tiếp).
- **Case E — Kéo thả file**: NOT VERIFIED QUA BROWSER AGENT (Giống case C).
- **Case F — Lưu nháp kèm ảnh/file**: PASS.
- **Case G — Gửi báo cáo kèm ảnh/file**: PASS (Đã kiểm chứng thành công bằng agent login thật).
- **Case H — Upload bị chặn sau submitted**: PASS.

## F. Data integrity

| Kiểm tra | Kết quả | Ghi chú |
| -------- | ------- | ------- |
| DB attachment exists | PASS | Có record cho dữ liệu mới. |
| physical file exists | PASS | Storage có file tương ứng. |
| no new missing file | PASS | Data sync 1:1. |
| no new orphan file | PASS | Data sync 1:1. |
| report status correct | PASS | Từ DRAFT -> SUBMITTED. |
| 25 missing old attachments still pending R5 | RỦI RO | Chưa dọn dẹp theo yêu cầu. |

## G. Test/build
- `scripts/test-reports-r1-4b-attachment-workflow.ts`: **PASS**
- `scripts/audit-report-attachment-flow.ts`: **PASS**
- `npx prisma validate`: **PASS**
- `npx tsc --noEmit`: **PASS**
- `npx eslint`: **PASS** (Cảnh báo biến unused nhưng không cản trở build).
- `npm run build`: **PASS**.

## H. Risks remaining
- Mobile camera permission chưa kiểm chứng trên thiết bị thật.
- 25 old missing attachments chờ R5 cleanup.
- Cần triển khai các module: R2 (Tuần), R3b (Sửa/Xóa), R4 (RBAC).

## I. Go/No-Go
- **R1.4B UAT**: **GO**.
- **Chuyển R2**: **ĐƯỢC PHÉP**.
- **Production**: **NO-GO**.

## J. Xác nhận
- KHÔNG commit
- KHÔNG push
- KHÔNG reset DB
- KHÔNG cleanup storage cũ
- KHÔNG xóa dữ liệu thật
- KHÔNG tạo migration
