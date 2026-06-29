# GLOBAL CONFIRM DIALOG / TOAST UI STANDARDIZATION FIX REPORT

## Mục tiêu
Chuẩn hóa toàn bộ trải nghiệm người dùng bằng cách thay thế các hộp thoại mặc định của trình duyệt (`window.confirm`, `window.alert`, `window.prompt`) sang hệ thống `ConfirmDialog` và `Toast` Notification thống nhất của hệ thống ERP công trình.

## Phạm vi đã thực hiện (Phase Fix)

1. **Thành phần dùng chung (Core UI):**
   - Tạo mới `src/components/ui/confirm-dialog.tsx`: Hộp thoại xác nhận đa biến thể (`danger`, `warning`, `info`, `success`), hỗ trợ loading state, có backdrop blur, animation đóng/mở mượt mà.
   - Tạo mới `src/components/ui/toast-context.tsx`: Hệ thống Toast Notification đặt góc phải màn hình, hỗ trợ tự đóng, hiển thị dạng `success`, `error`, `warning`, `info`.
   - Tích hợp `ToastProvider` vào `src/app/layout.tsx`.

2. **Quản lý Tài khoản (`/users`):**
   - Đã thay thế `window.confirm` thành `ConfirmDialog` cho các hành động: Khóa, Mở khóa, Xóa mềm, Khôi phục, Gỡ công trình.
   - Đã thay thế `window.prompt` (đổi mật khẩu) thành một Custom Modal có validation đầy đủ.
   - Thay thế toàn bộ `window.alert` bằng `toast.success` và `toast.error`.

3. **Quản lý Công trình (`/projects`):**
   - Refactor `src/components/projects/delete-project-button.tsx`: Sử dụng `ConfirmDialog` (variant: danger) để xác nhận xóa công trình. Thay thế `alert` bằng `toast.error` và `toast.success`.

4. **Yêu cầu Vật tư (`Material Request`):**
   - Refactor `src/components/material-request/material-request-detail.tsx`:
     - Cập nhật cấp/nhận (`handleUpdateProgress`): Thay thế cảnh báo vượt quá khối lượng (`window.confirm`) thành logic gộp thông qua `ConfirmDialog` (variant: warning) chỉ hiển thị một lần nếu có bất kỳ vật tư nào vượt đề xuất.
     - Hủy phiếu (`handleCancel`): Thay thế `window.confirm` thành `ConfirmDialog` (variant: danger).
     - Thay thế toàn bộ `setError` cục bộ (text đỏ) và `alert` thành `toast.error` / `toast.success`.

5. **Field Progress (`Master Table` & `Daily Entry Table`):**
   - **`master-table.tsx`:** 
     - Thay thế modal xóa thủ công thành `ConfirmDialog` (đồng bộ logic cho nhóm và công việc con).
     - Xóa state `toast` cục bộ và chuyển sang sử dụng `useToast` toàn cục.
     - Thay `alert` ở các luồng `handleSave`, `handleAddGroup`, `handleAddWork` bằng `toast`.
   - **`daily-entry-table.tsx`:** 
     - Thay `window.confirm` khi chuyển ngày lúc có dữ liệu chưa lưu thành `ConfirmDialog` (variant: warning).
     - Đổi toàn bộ `alert` trong `handleQuickAdd`, `handleSave` và `focusNextEmpty` thành `toast`.

6. **Quản lý Tài liệu (`Document Manager`):**
   - Refactor `src/components/documents/document-manager.tsx`:
     - `window.prompt` khi đổi tên thư mục được thay bằng một custom `RenameModal`.
     - `window.confirm` khi xóa thư mục / tệp được gom chung vào một state `deleteConfirm` sử dụng `ConfirmDialog` (variant: danger).
     - Thay thế các lệnh `alert` cho giới hạn kích thước file và lỗi API bằng `toast`.

## Kết quả đạt được

- **Đồng bộ hóa UI/UX:** 100% các hộp thoại native đã được thay thế. Trải nghiệm người dùng đồng nhất với theme Tailwind CSS của ứng dụng.
- **Tính khả dụng (Accessibility):** Các modal đều có cấu trúc `role="dialog"` hoặc `aria-modal="true"`, các thẻ tiêu đề rõ ràng, hỗ trợ đóng bằng phím ESC.
- **Trải nghiệm Mobile:** Các modal `ConfirmDialog` có kích thước phù hợp (`max-w-sm`), có đệm padding, các nút bấm thao tác dễ dàng trên màn hình cảm ứng.

## Hình ảnh (Ảnh chụp / Screenshots)
*(Yêu cầu chạy Browser Subagent để chụp ảnh nếu cần)*

1. Modal Xác nhận xóa công trình
2. Toast thông báo thành công / lỗi (VD: Tạo hạng mục thành công)
3. Modal Xác nhận cảnh báo nhập vượt thiết kế (Material Request / Field Progress)
4. Đổi mật khẩu Modal (Quản lý tài khoản)
5. Đổi tên thư mục Modal (Document Manager)

## Kết luận
Quá trình chuẩn hóa đã loại bỏ toàn bộ các phương thức gọi native UI. Hệ thống sẵn sàng cho các bài test E2E (Playwright) và UAT.
