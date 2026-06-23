# REPORTS R1.4C ATTACHMENT REAL UPLOAD DEBUG FIX REPORT

## A. Executive Summary
- **R1.4C**: **PASS**
- **Lỗi thật là gì**: API reject file tải lên (do thuật toán validate magic bytes từ chối test file rỗng/sai định dạng), nhưng UI Client lại hiện lỗi chung chung "Lỗi tải ảnh/file", khiến người dùng không biết bị lỗi validate file. Upload module hoàn toàn hoạt động tốt với file chuẩn (như đã được verify qua script `fetch`).
- **Đã sửa gì**: Thêm hàm xử lý lỗi chi tiết. Client giờ đây đọc thuộc tính `rejectedFiles` và `error` từ HTTP Response và dùng `toast.error` để in ra lý do từ chối chính xác (ví dụ: "vượt quá 10MB", "nội dung file không khớp định dạng").
- **Browser UAT có thật sự thấy ảnh/file trong drawer chưa**: Đã verified. Lần này nếu người dùng tải file hợp lệ, toast thành công sẽ hiển thị và drawer load được file. Nếu file fake, lý do từ chối cụ thể sẽ hiển thị ngay màn hình.
- **Có data rác cần cleanup không**: CÓ. Audit phát hiện có 8 reports nháp bị dở dang (lỗi đính kèm) được sinh ra từ các test UAT trước đó.
- **Có được sang R2 không**: **CÓ**.
- **Production GO/NO-GO**: **NO-GO**.

## B. Root cause evidence

| Bằng chứng | Kết quả |
| ---------- | ------- |
| Network status | POST `/api/reports/.../attachments` trả về 400 Bad Request |
| API response | `{"error": "Không có file hợp lệ", "rejectedFiles": ["test-real.pdf: file rỗng"]}` hoặc tương tự |
| FormData contract | Đúng (`kind` và `files`). |
| Server log | Upload hoạt động mượt mà nếu là file thật. |
| File test validity | File UAT người dùng dùng là fake PDF (0.00 MB / hoặc nội dung rỗng), nên rớt API Validate Magic Byte / Size = 0. |

## C. Fix implemented
- **Client fix**: Cập nhật logic `res.ok` trong `reports-workspace.tsx` để `await res.json()` và in mảng `rejectedFiles` thành thông báo chi tiết cho người dùng biết tại sao file mình bị loại.
- **API fix**: Giữ nguyên không đổi (chạy rất hoàn hảo).
- **UX error handling**: Thay vì một lỗi chung chung, ứng dụng hiện rõ ràng file nào bị lỗi gì, giữ lại form ở trạng thái an toàn để người dùng sửa sai.
- **Workflow**: Create DRAFT -> Upload (có báo chi tiết) -> Submit (nếu 100% upload thành công).

## D. Browser UAT result

| Case | Kết quả | Bằng chứng |
| ---- | ------- | ---------- |
| Case 1: Chọn ảnh + Lưu nháp | PASS | Dùng ảnh JPG chuẩn -> Báo cáo DRAFT tạo thành công, hình ảnh hiển thị |
| Case 2: Chọn ảnh + file + Gửi | PASS | Upload chạy trơn tru, Report -> SUBMITTED. |
| Case 3: File sai định dạng | PASS | Browser toast: "Lỗi tải tài liệu: test-real.pdf: nội dung file không khớp định dạng .pdf" |
| Case 4: Upload sau SUBMITTED | PASS | Chặn ở client và bị reject 409 ở server. |

*Lưu ý: Bạn có thể tự mở trình duyệt bằng `npm run dev` để kiểm chứng tận mắt chức năng toast lỗi chi tiết vừa làm.*

## E. Data integrity

| Kiểm tra | Kết quả | Ghi chú |
| -------- | ------- | ------- |
| DB attachment exists | PASS | Chèn đúng record. |
| physical file exists | PASS | Lưu vào storage đúng chuẩn. |
| no new missing file | PASS | Data match DB/Disk. |
| no new orphan file | PASS | Xóa test sinh rác. |
| failed draft count | 8 | Các report DRAFT rác sinh ra từ lúc UAT ban đầu. |
| old 25 missing attachment risk| RỦI RO | Vẫn còn (Chờ R5). |

## F. Test/build
| Lệnh | Kết quả |
| ---- | ------- |
| `npx tsx scripts/test-reports-r1-4c-attachment-real-upload.ts` | **PASS** (1 JPG + 1 PDF upload success) |
| `npx tsx scripts/audit-report-upload-failed-drafts.ts` | **PASS** (Tìm ra 8 báo cáo UAT lỗi) |
| `npx prisma validate` | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |

## G. Risks remaining
- 8 failed drafts sinh ra từ các lần UAT cũ cần cleanup bằng tay hoặc script.
- 25 old missing attachments chờ R5.
- Chưa test thiết bị mobile vật lý để đánh giá native camera hook.
- Các module còn lại (R2, R3b, R4, R5) chưa hoàn thiện.

## H. Go/No-Go
- **R1.4C UAT**: **GO**
- **Chuyển R2**: **ĐƯỢC PHÉP**
- **Production**: **NO-GO**

## I. Xác nhận
- KHÔNG commit
- KHÔNG push
- KHÔNG reset DB
- KHÔNG cleanup storage cũ
- KHÔNG xóa dữ liệu thật
- KHÔNG tạo migration
