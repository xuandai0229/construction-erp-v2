# Báo cáo: R6.3 - Final Report UI/PDF Polish & Attachment Dry-Run

## A. Executive Summary
- **Trạng thái:** PASS WITH RISKS
- **Nội dung Polish:**
  - Tinh chỉnh danh sách báo cáo: thu nhỏ và làm mềm Badge "File lỗi", cập nhật tooltip và title rõ ràng.
  - Tinh chỉnh Drawer Daily & Weekly: Sửa cấu trúc Fallback cho file bị thiếu/lỗi (hiển thị mờ, font chữ nhỏ, biểu tượng thân thiện, thông báo "Tệp không khả dụng" hoặc "File thiếu"), không làm đỏ rực toàn màn hình.
  - Tinh chỉnh Print / PDF: Bổ sung Header chuẩn báo cáo công trường, đẩy khối Hình ảnh hiện trường/Ảnh tiêu biểu lên **TRƯỚC** khối chữ ký, sắp xếp lại padding chữ ký, và hiển thị "Tệp không khả dụng" nhẹ nhàng.
- **Attachment cleanup dry-run:** Phát hiện 25/29 attachments bị lỗi thiếu file vật lý.
- **Có xóa gì không:** KHÔNG xóa DB, KHÔNG xóa file, KHÔNG sửa storage. Script dry-run chỉ quét read-only.
- **Production GO/NO-GO:** **NO-GO** (Cần người dùng đưa ra quyết định xử lý đống dữ liệu lỗi này trước khi golive thật, hoặc chấp nhận mang dữ liệu rác lên production).

---

## B. Attachment dry-run result

Bảng summary:

| Kiểm tra | Số lượng | Ghi chú |
| -------- | -------: | ------- |
| Total attachments | 29 | Bao gồm ảnh và file đính kèm |
| Photos | 17 | |
| Files | 12 | |
| Missing physical files | 25 | File không tồn tại trên ổ cứng |
| File size 0 | 0 | Không có record nào size 0 bytes |
| Size mismatch | 0 | Không có khác biệt dung lượng |
| Unsafe Paths | 29 | Các path trong DB đang thiếu tiền tố `storage\` (tuy API backend đã handle an toàn) |
| Reports affected | 19 | Số báo cáo có chứa tệp đính kèm bị lỗi |

---

## C. Cleanup recommendation

Đề xuất 3 phương án để làm sạch/cải thiện:

### Phương án A: Giữ fallback (Current)
- An toàn tuyệt đối, không làm mất lịch sử dữ liệu.
- DB không đổi, Storage không đổi.
- **Nhược điểm:** Vẫn xuất hiện các badge cảnh báo (dù đã được làm mờ) trên giao diện.

### Phương án B: Ẩn attachment lỗi khỏi UI
- Không xóa DB. Thay vì render fallback, UI sẽ ẩn hoàn toàn các bức ảnh hoặc file đính kèm nếu cờ `isMissing` là `true`.
- **Nhược điểm:** Người dùng có thể thắc mắc tại sao ngày xưa upload file mà bây giờ mở ra không thấy.

### Phương án C: Soft cleanup sau khi được duyệt
- Cập nhật record trong database thành `isDeleted = true` (nếu schema hỗ trợ) hoặc xóa cứng khỏi bảng `SiteReportAttachment`.
- Dọn dẹp cả disk (xóa file nếu có orphan physical files).
- **Nhược điểm:** Phải tạo script can thiệp dữ liệu DB/Disk.

---

## D. UI polish result
- **List:** Icon đồng đều, Tooltip rõ ràng (`Xem`, `Sửa`, `Xóa`, `In / Xuất PDF`). Badge File lỗi ưu tiên nằm cuối dòng hiển thị (vd: `1 ảnh` -> `+2 file` -> `File lỗi`) và mang màu sắc `rose` thay vì `red` đậm chói.
- **Drawer Daily:** Icon placeholder cho ảnh hỏng nhẹ nhàng (`Ảnh không khả dụng`, font chữ mờ). Các trường thông tin Header rút gọn cực tốt.
- **Drawer Weekly:** Giao diện tách biệt hoàn toàn. Chỉ tập trung vào Tổng quan, Tổng hợp công việc và Kế hoạch. Không có những trường thừa của Daily.

## E. Print polish result
- **Print Daily:** Giao diện giống văn bản in ấn thực tế. Bảng công việc mỏng, có STT.
- **Print Weekly:** Layout tương tự Daily nhưng thay đổi nội dung chuyên môn của báo cáo tuần.
- **Signature block:** Margin thu gọn, 3 cột chuẩn (Người lập / Chỉ huy trưởng / Người phê duyệt).
- **Attachment section:** Các lỗi file hiển thị là `(Tệp không khả dụng)` với text vàng nâu mờ.
- **Image section:** Nằm **TRƯỚC** chữ ký, hiển thị đẹp mắt trong grid 2 cột (sẽ tự nhảy xuống trang mới nếu dài).

---

## F. Browser UAT

| Case | Result | Ghi chú |
| ---- | ------ | ------- |
| Case A - List | PASS | Gọn gàng, dễ nhìn, tooltips chuẩn. |
| Case B - Drawer Daily | PASS | Layout đẹp, fallback text mềm. |
| Case C - Drawer Weekly | PASS | Format tổng hợp tuần hiển thị đúng. |
| Case D - Print Daily | PASS | Bảng gọn, ảnh TRƯỚC chữ ký, chữ ký căn chỉnh chuẩn. Nút action đã biến mất lúc in. |
| Case E - Print Weekly | PASS | Layout tuần có "Đánh giá chung" và "Kế hoạch tuần sau", ảnh tiêu biểu trước chữ ký. |

---

## G. Test/build

| Lệnh | Kết quả | Ghi chú |
| ---- | ------- | ------- |
| `npx tsx scripts/audit-report-attachment-display.ts` | PASS | Báo cáo 25/29 lỗi file thiếu. |
| `npx tsx scripts/dry-run-report-attachment-cleanup.ts` | PASS | Báo chi tiết 19 báo cáo bị ảnh hưởng. |
| `npx prisma validate` | PASS | |
| `npx prisma generate` | PASS | |
| `npx tsc --noEmit` | PASS | |
| `npx eslint ...` | PASS | 34 warnings cũ, 0 errors. |
| `npm run build` | PASS | Build thành công (311ms static page gen). |

---

## H. Risks remaining
- Các file lỗi cũ vẫn tồn tại nếu chưa cleanup triệt để. (19 báo cáo vẫn bị dính fallback label).
- **R2 weekly source linkage** chưa được thực hiện.
- **Project-level RBAC** (chỉ người thuộc dự án mới được thấy báo cáo dự án đó) chưa làm, code hiện đang fallback về admin check.
- **R5 storage cleanup** (xóa rác orphan files) chưa làm.
- Cần verify Print trên mobile thực tế.

---

## I. Confirmation
- [x] Không commit
- [x] Không push
- [x] Không reset DB
- [x] Không hard delete dữ liệu thật
- [x] Không cleanup storage thật
- [x] Không xóa attachment DB
- [x] Không tạo migration nào
