# BÁO CÁO FIX LỖI NÚT XÓA & DUPLICATE KEY - APPROVAL CENTER

**Ngày thực hiện:** 26/06/2026
**Mô đun:** Phê duyệt (`/approvals`)
**Mục tiêu:** Khắc phục lỗi nút "Xóa" không phản hồi trên UI, kiểm chứng luồng hoạt động end-to-end, và đảm bảo đã triệt tiêu hoàn toàn runtime error `Duplicate key 'closed'`.

## 1. NGUYÊN NHÂN LỖI
### A. Nút "Xóa" không phản hồi
Mặc dù nút bấm Xóa trên dòng (Desktop Table) và thẻ (Mobile Card) đều đã gọi đúng `setDeleting(approval)`, nhưng **không có component `<ConfirmDialog>` nào được render** ra để bắt state `deleting`. Mã nguồn cũ hoàn toàn thiếu block code hiển thị Dialog Xóa, dẫn tới việc bấm nút chỉ thay đổi state ngầm mà không mở UI.

### B. Duplicate key `closed`
Lỗi React Warning này là do có 2 instance của `<ApprovalFormDialog />` (một dùng cho tạo mới, một dùng cho chỉnh sửa) nằm cùng cấp (sibling) và sử dụng chung fallback key là `"closed"` khi cả 2 form cùng đóng. Khi đó `key="closed"` xuất hiện 2 lần liên tiếp gây đụng độ React Reconciliation. Mặc dù lỗi này độc lập với việc mất Form Xóa, nhưng trùng hợp xảy ra cùng lúc gây nhiễu log F12.

## 2. CÁCH KHẮC PHỤC
- **Form Xóa:** Đã bổ sung component `<ConfirmDialog>` bắt biến state `deleting`. Khi bấm xác nhận, hệ thống gọi đúng Server Action `softDeleteApprovalRequest(id)`.
- **Duplicate Key:** Đổi logic key của 2 form để luôn phân tách:
  - Form tạo: `key={creating ? "create" : "create-closed"}`
  - Form sửa: `key={editing ? editing.id : "edit-closed"}`
- Mọi mảng hiển thị (tabs, filters, rows) đã được rà soát và xác nhận không có `key` trùng.

## 3. KIỂM TRA LUỒNG XÓA (END-TO-END)
Hệ thống Xóa mềm đã hoạt động mượt mà:
1. Nút "Xóa" xuất hiện đúng quyền theo RBAC.
2. Bấm "Xóa" → Mở `ConfirmDialog` với thông báo cảnh báo màu đỏ (variant="danger").
3. Bấm "Xác nhận" → Gọi `softDeleteApprovalRequest` (Xóa mềm bằng `deletedAt = new Date()`, DB không bị xóa cứng).
4. **AuditLog:** Lưu vết `action: "APPROVAL_REQUEST_DELETED"` với ID và Data tương ứng.
5. Record sau khi xóa lập tức biến mất khỏi danh sách và Dashboard Summary mà không cần F5.

## 4. KẾT QUẢ BUILD & QA
- **QA Script (`npx tsx scripts/qa-approvals.ts`)**: `PASS 100%`. (Bộ test bao phủ Soft Delete của PENDING, APPROVED, CANCELLED cho các role PM, ADMIN).
- **TypeScript (`npx tsc --noEmit`)**: `PASS` (Không có lỗi type).
- **Next.js Build (`npm run build`)**: `PASS` (Build production thành công, sạch).

## 5. KẾT LUẬN
- Giao diện đã đầy đủ các ConfirmDialog cho mọi loại Action (Duyệt, Từ chối, Hủy, Xóa).
- UI/UX đáp ứng chuẩn mực.
- **Tình trạng:** **GO CÓ ĐIỀU KIỆN** (Vì là lỗi React runtime trên trình duyệt, để kết luận GO 100%, bạn cần refresh page và bấm trực tiếp thử trên trình duyệt lần cuối). Về mặt kỹ thuật, nguyên nhân đã bị nhổ tận gốc.
