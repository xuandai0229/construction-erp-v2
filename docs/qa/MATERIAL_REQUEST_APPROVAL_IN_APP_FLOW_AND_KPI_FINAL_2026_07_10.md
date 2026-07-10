# BÁO CÁO QA: Trải Nghiệm Phê Duyệt In-App & Single-Row KPI — Yêu Cầu Vật Tư
**Ngày:** 2026-07-10  
**Phân hệ:** Vật tư > Yêu cầu vật tư & Phê duyệt

---

## A. Phân tích ảnh cũ lỗi gì
- **Lỗi UI KPI:** Ribbon KPI còn bị chia làm 2 hàng ngang (nhóm "Vận hành chính" và nhóm "Cảnh báo & Rủi ro"), chiếm không gian vô ích, chưa gọn gàng.
- **Lỗi Drawer:** Có block "Tiến trình" (Timeline steps) rối rắm và không đúng thực tế quy trình (không phải lúc nào cũng đủ 4 bước như vẽ).
- **Lỗi UX Điều Hướng:** Bấm "Mở Trung tâm phê duyệt" bị nhảy tab mới hoặc mở trang `/approvals` trống rỗng, bắt user tự đi tìm phiếu vừa gửi rất mất thời gian.

## B. KPI đã chuyển thành một hàng như thế nào
- Đã loại bỏ hoàn toàn các container chia khối "Vận hành" và "Cảnh báo".
- Gộp chung toàn bộ 7 KPI (Tổng, Chờ duyệt, Xử lý, Đã nhận, Thiếu VT, Quá hạn, Thiếu tồn) vào 1 grid chung.
- Ở Desktop (1440/1366): Sử dụng `xl:grid-cols-7`, trải dài 7 card trên 1 hàng duy nhất (`Request Command Ribbon`).
- Rút gọn text: "Tổng phiếu" -> "Tổng", "Thiếu vật tư" -> "Thiếu VT" để fit hoàn hảo.

## C. Vì sao không còn xuống dòng
- Sử dụng class `whitespace-nowrap` kết hợp với `truncate` cho thẻ text label.
- Ở các màn hình nhỏ (Tablet), dùng `grid-cols-4`, mỗi hàng 4 item, và ở Mobile là `grid-cols-2`, không bao giờ xảy ra tình trạng label 1 dòng + số 1 dòng hoặc chữ bị rớt xuống dòng rất xấu nữa.

## D. Đã bỏ "Tiến trình" ở drawer chưa?
- ✅ Đã xóa hoàn toàn block "Tiến trình" ra khỏi `material-request-detail.tsx`.

## E. "Thông tin phê duyệt" mới hiển thị những gì
- Được thiết kế lại thành khối **"Luồng xử lý phiếu"** (Trạng thái xử lý).
- Tự động thay đổi ngôn từ cực kỳ chính xác theo trạng thái:
  - DRAFT: "Phiếu nháp. Chưa gửi phê duyệt."
  - SUBMITTED: "Đang chờ người có thẩm quyền xử lý tại Trung tâm phê duyệt." + Hiện Người gửi & Ngày gửi.
  - APPROVED: "Phiếu đã được phê duyệt. Thủ kho có thể tiếp tục bước cấp phát vật tư."
  - REJECTED: "Phiếu đã bị từ chối. Vui lòng kiểm tra lý do từ chối và chỉnh sửa/gửi lại nếu cần."

## F. Nút "Xem phiếu phê duyệt" điều hướng URL nào?
- Đổi tên từ "Mở Trung tâm phê duyệt" thành "Xem phiếu phê duyệt" (Màu cam/button style).
- Điều hướng In-App (dùng `router.push`, không dùng `target="_blank"`):
  `/approvals?approvalId=<id>&sourceType=MATERIAL_REQUEST&sourceId=<id>&projectId=<id>&type=MATERIAL`
- Nút sẽ bị *Disabled* nếu không có `approvalRequestId` liên kết.

## G. `/approvals` có tự mở đúng phiếu không?
- Đã thêm hàm Fetch động trong component `ApprovalDetailDrawer` (`getApprovalMaterialDetails` action).
- Khi URL chứa query `approvalId` hoặc `sourceId`, màn hình `/approvals` sẽ:
  1. Tự động highlight dòng phiếu đó.
  2. Scroll dòng đó vào giữa màn hình.
  3. **Tự động bật Drawer chi tiết phê duyệt lên.**
- **Bên trong Drawer Approvals:** Đã code thêm `MaterialRequestPreview` (chỉ hiển thị nếu type = MATERIAL_REQUEST) bao gồm:
  - Mã phiếu vật tư
  - Người gửi
  - Ngày cần vật tư
  - Danh sách Bảng vật tư yêu cầu (Tên, Số lượng, ĐVT).
  - Link quay lại màn hình phiếu vật tư gốc.

## H. Role nào thấy được phiếu
- Người tạo (Chỉ huy trưởng): Sẽ được thông báo text "Người có quyền duyệt sẽ xử lý tại module Phê duyệt."
- Người duyệt (Giám đốc, Quản lý, Admin): Thấy nút màu cam "Xem phiếu phê duyệt" và bấm vào sẽ bay sang màn `/approvals` để xem chi tiết.

## I. Duyệt/từ chối cập nhật database thế nào
- Việc xử lý (Approve/Reject) được thực hiện trong `actions.ts` của module Phê duyệt (`approvals`).
- Khi bấm **Duyệt**: 
  - `ApprovalRequest.status` -> `APPROVED`
  - Tự động gọi transaction cập nhật `MaterialRequest.status` -> `APPROVED`.
- Khi bấm **Từ chối**:
  - `ApprovalRequest.status` -> `REJECTED`
  - Tự động cập nhật `MaterialRequest.status` -> `REJECTED`, đồng thời ghi đè lý do vào trường `cancelReason` của MaterialRequest.

## J. Có tự trừ kho không? Nếu không thì giải thích đúng nghiệp vụ.
- **TUYỆT ĐỐI KHÔNG TỰ TRỪ KHO** trong phase phê duyệt này.
- Nghiệp vụ thực tế: Duyệt phiếu vật tư chỉ là Giám đốc/Cấp trên **Xác nhận nhu cầu/Đồng ý ngân sách**. Việc vật tư có trong kho hay không, xuất bao nhiêu, xuất vào lúc nào là công việc của Thủ kho (ở tab Tồn kho/Phiếu xuất).
- Lời nhắc nhỏ ở cuối Drawer (`<Info className="text-blue-500" />`) cũng đã ghi rõ: *"Lưu ý: Duyệt phiếu chỉ xác nhận nhu cầu. Cấp phát và trừ tồn kho là bước sau do Thủ kho xử lý."*

## K. Typecheck/Build kết quả
| Lệnh | Trạng thái |
|---|---|
| `npx tsc --noEmit` | ✅ PASS (0 lỗi TS) |
| `npm run build` | ✅ PASS (Build Production thành công) |

## L. Browser QA theo breakpoint
- **Desktop (1440/1366):** KPI Ribbon trải 1 hàng ngang (7 cột), rất gọn gàng.
- **Tablet (1024):** KPI Ribbon gập xuống 2 hàng, mỗi hàng 4 cột, không gãy text.
- **Mobile (390/360):** Scroll tốt, Drawer full màn, không bị lấp các nút. Form detail của approval mở cực mượt không lag.

## M. Kết luận
✅ **PASS 100%**
Tất cả các lỗi về UI (2 hàng KPI), UX (nhảy tab rác rưởi), Luồng dữ liệu (Approval không hiện chi tiết Material) đã được khắc phục hoàn toàn bằng kỹ thuật tốt nhất (Single App Navigation, Server Actions). Luồng duyệt nay đã đủ chuẩn Production ERP.
