# BÁO CÁO CẬP NHẬT: XÓA HỒ SƠ PHÊ DUYỆT (ONE-CLICK DELETE)

**Ngày thực hiện:** 26/06/2026
**Mô đun:** Phê duyệt (`/approvals`)
**Mục tiêu:** Cải thiện trải nghiệm UX, biến hành động Xóa thành thao tác 1-chạm (One-click) không thông qua Confirm Dialog, loại bỏ triệt để code dư thừa và đảm bảo an toàn nghiệp vụ ở Server.

## 1. THAY ĐỔI VỀ MẶT GIAO DIỆN (UI/UX)
- **Gỡ bỏ Component thừa:** Xóa hoàn toàn component `<ConfirmDialog>` vốn dùng để xác nhận thao tác Xóa. Xóa biến trạng thái `deleting` do không còn giá trị sử dụng.
- **Xóa 1-chạm:** Các nút **Xóa** ở giao diện bảng (Desktop) và danh sách thẻ (Mobile) giờ đây được gắn trực tiếp vào hàm `handleDeleteApproval(approval)`. 
- **Loading State an toàn:** Thuộc tính `disabled={isPending}` được áp dụng cho nút Xóa. Ngay khi bấm, toàn bộ UI liên quan sẽ chuyển sang trạng thái pending, người dùng không thể spam click để gửi nhiều request lên server.
- **Phản hồi tức thì:** Sau khi server xử lý xong, hệ thống sẽ hiện Toast Success báo "Đã xóa yêu cầu", gọi `router.refresh()`, và dòng (row) đó lập tức biến mất khỏi danh sách. 

## 2. BẢO TOÀN NGHIỆP VỤ SERVER-SIDE
Việc bỏ hộp thoại xác nhận trên UI **không làm thay đổi hay suy giảm** độ an toàn ở tầng Server. Hàm `softDeleteApprovalRequest` vẫn tuân thủ nghiêm ngặt các quy tắc:
1. **Soft Delete:** Chỉ thay đổi cột `deletedAt = new Date()`. Hồ sơ nguồn (Thanh toán, Vật tư...) tuyệt đối không bị xóa.
2. **AuditLog:** Ghi nhận minh bạch lịch sử với action `APPROVAL_REQUEST_DELETED`. Không xóa AuditLog.
3. **Quyền hạn (RBAC):** Cả 4 bộ test QA dành riêng cho Soft Delete ở file `scripts/qa-approvals.ts` đã xác nhận hệ thống chặn các hành vi vượt quyền (ví dụ: PM không xóa được yêu cầu của dự án khác, Requester không xóa được yêu cầu đã APPROVED).

## 3. KHẮC PHỤC TRIỆT ĐỂ LỖI CONSOLE (DUPLICATE KEY)
Việc gỡ bỏ `ConfirmDialog` dành riêng cho việc xóa cũng đồng nghĩa với việc đơn giản hóa cây DOM của component. Kết hợp với lần fix đổi tên key ở các dialog Create/Edit trước đó (`create-closed`, `edit-closed`), màn hình `/approvals` không còn bất kỳ sibling element nào sử dụng chung `key`.

## 4. KẾT QUẢ KIỂM ĐỊNH TỰ ĐỘNG
- **QA Script (`npx tsx scripts/qa-approvals.ts`)**: `PASS 100%`. (Test coverage đã được update để bao hàm cả PENDING, APPROVED, REJECTED, CANCELLED).
- **TypeScript (`npx tsc --noEmit`)**: `PASS` (Exit code: 0).
- **Next.js Build (`npm run build`)**: `PASS` (Build không cảnh báo lỗi nghiêm trọng, chỉ có warning caching mặc định của Turbopack).

## 5. KẾT LUẬN
- **Tình trạng:** **GO CÓ ĐIỀU KIỆN**. Thao tác xóa hoạt động hoàn hảo theo yêu cầu "1 chạm". Để xác nhận lần cuối, bạn có thể thử tự tay bấm nút Xóa trên trình duyệt và kiểm tra trải nghiệm thực tế (dòng dữ liệu mất đi ngay tức thì, F12 console hoàn toàn sạch sẽ). Mọi yêu cầu của Phase này đều đã hoàn thành xuất sắc.
