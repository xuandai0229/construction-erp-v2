# REPORTS R1.4A ATTACHMENT FORM UX & DATA AUDIT REPORT

## A. Executive Summary
- **Attachment form audit**: **FAIL** (Về mặt kiến trúc upload).
- **Lỗi lớn nhất là gì**: Có sự xung đột nghiêm trọng (Race Condition / Policy Conflict) giữa thiết kế luồng Upload hiện tại (Luồng B) và policy R3a (Server-side Lock). Cụ thể: Khi người dùng chọn file và nhấn "Gửi báo cáo", báo cáo được tạo ra với trạng thái `SUBMITTED`. Lập tức sau đó, client gọi API upload file. Tuy nhiên, API upload lại bị R3a chặn lại vì báo cáo đang ở trạng thái `SUBMITTED` (không cho phép sửa đổi). Kết quả là báo cáo được tạo thành công nhưng mất toàn bộ file/ảnh.
- **Có nên sửa ngay không**: RẤT CẦN THIẾT. Đây là bug nghiêm trọng cản trở core workflow.
- **Có được sang R2 không**: CHƯA NÊN. Cần giải quyết R1.4B (Sửa upload) trước khi sang R2.
- **Production GO/NO-GO**: NO-GO.

## B. Current upload architecture
- **Luồng hiện tại**: **Luồng B (Staged files trong client)**.
- **Mô tả**: User chọn ảnh/file -> Lưu tạm trong React State (`form.photos`, `form.attachments`) -> Nhấn Submit -> Gọi `createSiteReport` -> Có `reportId` -> Gọi `/api/.../attachments` để upload thực tế.
- **Rủi ro với R3a lock**: Xung đột 100% khi người dùng chọn "Gửi báo cáo" (trạng thái `SUBMITTED`). Chỉ hoạt động đúng khi người dùng chọn "Lưu nháp" (`DRAFT`).

## C. Attachment UI audit

| Chức năng | Có input file | Có onChange | Có onDrop | Có preview | Gửi lên server | Ghi chú |
| --------- | ------------- | ----------- | --------- | ---------- | -------------- | ------- |
| **Chụp ảnh** | CÓ (`capture="environment"`) | CÓ | KHÔNG | CÓ | FAIL (nếu gửi duyệt) | Hoạt động tốt ở Client. |
| **Chọn ảnh** | CÓ (`multiple`) | CÓ | CÓ | CÓ | FAIL (nếu gửi duyệt) | Tối đa 10 ảnh, check size <10MB. |
| **Drag/drop ảnh** | KHÔNG (dùng div) | N/A | CÓ | CÓ | FAIL (nếu gửi duyệt) | |
| **Chọn file** | CÓ (`multiple`) | CÓ | CÓ | CÓ (tên) | FAIL (nếu gửi duyệt) | Tối đa 5 file, check size <20MB. |
| **Drag/drop file** | KHÔNG (dùng div) | N/A | CÓ | CÓ (tên) | FAIL (nếu gửi duyệt) | |
| **Preview** | N/A | N/A | N/A | CÓ | N/A | Sinh `ObjectURL` chuẩn xác. |
| **Delete before save** | N/A | N/A | N/A | CÓ | N/A | Bấm dấu X xóa khỏi state tốt. |
| **Submit** | N/A | N/A | N/A | N/A | LỖI | Lỗi do Policy `R3a` chặn `SUBMITTED`. |

## D. Browser UAT result
- **Tạo report nháp (Lưu nháp)**: **PASS** (Vì R3a cho phép upload file vào báo cáo `DRAFT`).
- **Gửi duyệt kèm ảnh/file**: **FAIL** (Ảnh/file bị chặn lại, sinh ra API Error 409 `Báo cáo đã gửi/đã duyệt nên không thể thêm file đính kèm`).
- **Drag/drop**: **PASS**.
- **Chụp ảnh**: **PASS** (Trên mobile, desktop kích hoạt dialog chọn file).
- **Preview ảnh/file**: **PASS**.

## E. Data audit

| Kiểm tra | Kết quả | Ghi chú |
| -------- | ------- | ------- |
| Tổng số report | 17 | Tăng 1 do quá trình UAT tạo thêm. |
| Report rỗng (Daily không có việc) | 0 | Validation client hoạt động tốt. |
| Report Submitted/Approved nhưng rỗng | 0 | Tốt. |
| DB attachment thiếu file vật lý | **25 file** | Dữ liệu seed cũ không có file vật lý tương ứng trong `storage/`. |
| File vật lý mồ côi (không DB) | 0 | Không bị rác từ file ngoài. |

## F. UX issues found
- **Critical**: Bug mất file khi bấm "Gửi báo cáo" (như đã phân tích ở trên).
- **Medium**: Nếu upload bị lỗi (vì R3a chặn), form đóng lại và báo cáo "Đã tạo báo cáo nhưng lỗi tải file", người dùng không có cách nào upload lại vì report đã bị lock. Cần rollback hoặc ngăn chặn việc này.
- **Low**: Chưa giải phóng (revoke) ObjectURL khi unmount 컴ponent trong một số trường hợp edge-case (mặc dù đã có code cleanup trong useEffect). Form trên Mobile có phần "Nội dung thi công" khá dài, cuộn mỏi tay nếu nhập nhiều.

## G. Recommended fix plan
**Đề xuất R1.4B Fix Upload Staging:**
1. Khi nhấn "Gửi báo cáo", client luôn tạo báo cáo ở trạng thái `DRAFT` trước.
2. Thực hiện vòng lặp upload toàn bộ ảnh và file đính kèm.
3. Nếu tất cả upload thành công, gọi API `submitSiteReport` để chuyển sang `SUBMITTED`.
4. Nếu upload thất bại giữa chừng, giữ nguyên trạng thái `DRAFT` và báo lỗi để user thử lại, không đóng dialog.

## H. Risks remaining
- Camera capture mobile có thể bị permission block tùy vào trình duyệt/hệ điều hành.
- DB chứa 25 attachment không có file vật lý (Do test data R3a/R1 seed ban đầu không có ảnh thật). Cần dọn dẹp sau.
- Vấn đề Storage rác chưa được giải quyết (R5).
- Tính năng liên kết báo cáo tuần (R2) chưa làm.

## I. Conclusion
- **Có được sang R2 không**: CHƯA NÊN.
- **Cần fix gì trước**: Bắt buộc phải thực thi đề xuất **R1.4B** để sửa lỗi mất file khi "Gửi báo cáo". Đây là luồng quan trọng nhất của người dùng hiện trường.
- **Không nên làm gì lúc này**: Không nên viết API upload chunking hoặc temp storage phức tạp, chỉ cần sửa luồng gọi API client là giải quyết được triệt để xung đột với R3a.

## J. Confirmation
- Đã đọc mã nguồn, kiểm tra UI logic, chạy script audit.
- KHÔNG sửa code.
- KHÔNG sửa DB.
- KHÔNG xóa dữ liệu.
- KHÔNG cleanup storage.
- KHÔNG tạo migration.
- KHÔNG commit.
- KHÔNG push.
