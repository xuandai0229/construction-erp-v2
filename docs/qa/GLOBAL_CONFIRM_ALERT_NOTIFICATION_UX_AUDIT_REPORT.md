# GLOBAL CONFIRM / ALERT / NOTIFICATION UX AUDIT REPORT

## 1. Tóm tắt vấn đề từ ảnh UAT

Hiện tại hệ thống đang sử dụng rất nhiều hàm của trình duyệt như `window.confirm`, `window.alert` và `window.prompt` để tương tác với người dùng (ví dụ khi Xóa mềm tài khoản, báo lỗi lưu form, cảnh báo thay đổi dữ liệu, v.v). 
Các hạn chế của cách tiếp cận này:
- **UI kém thẩm mỹ, không đồng bộ**: Sử dụng hộp thoại mặc định của trình duyệt không khớp với thiết kế tổng thể của hệ thống.
- **Nội dung hiển thị hạn chế**: Chữ quá dài sẽ bị cắt hoặc cuộn trong một khung nhỏ khó nhìn.
- **Không tùy biến được Call To Action (CTA)**: Nút hành động chỉ cố định là "OK" / "Cancel", không thể hiện rõ ý nghĩa hành động (ví dụ: "Xóa", "Khóa").
- **Thiếu cấu trúc thị giác**: Không có màu sắc, icon báo hiệu mức độ nguy hiểm (danger, warning, success, info).
- **Trải nghiệm Mobile tệ**: Trên thiết bị di động, alert/confirm native trông cực kỳ thô và làm gián đoạn trải nghiệm.

## 2. Danh sách toàn bộ `window.confirm`/`window.alert`/`window.prompt` tìm thấy

Tổng cộng phát hiện **36** trường hợp dùng UI mặc định của trình duyệt trong toàn codebase:

### Window.Confirm (9 trường hợp)
- `src/components/users/user-management-client.tsx`
  - Dòng 103: Xác nhận khóa/mở khóa tài khoản.
  - Dòng 116: Xác nhận xóa mềm tài khoản.
  - Dòng 129: Xác nhận khôi phục tài khoản.
  - Dòng 191: Xác nhận gỡ công trình khỏi tài khoản.
- `src/components/material-request/material-request-detail.tsx`
  - Dòng 65: Cảnh báo lưu dữ liệu khi số lượng cấp/nhận vượt số lượng đề xuất.
  - Dòng 94: Xác nhận hủy phiếu vật tư.
- `src/components/field-progress/daily-entry-table.tsx`
  - Dòng 338: Cảnh báo chuyển ngày khi có dữ liệu thay đổi chưa lưu.
- `src/components/documents/document-manager.tsx`
  - Dòng 80: Xác nhận xóa thư mục.
  - Dòng 87: Xác nhận xóa tệp.

### Window.Alert (25 trường hợp)
- `src/components/users/user-management-client.tsx` (8 trường hợp): Báo lỗi khóa/mở, lỗi xóa, lỗi khôi phục, chỉnh sửa user đã xóa mềm, mật khẩu ngắn, báo thành công, v.v.
- `src/components/projects/delete-project-button.tsx` (1 trường hợp): Báo lỗi khi xóa công trình.
- `src/components/field-progress/master-table.tsx` (3 trường hợp): Báo lỗi lưu dữ liệu, xóa, update hạng mục.
- `src/components/field-progress/daily-entry-table.tsx` (7 trường hợp): Cảnh báo validation form, báo thành công khi nhập xong, báo lỗi submit.
- `src/components/documents/document-manager.tsx` (6 trường hợp): Báo file quá dung lượng, báo lỗi đổi tên, lỗi xóa, lỗi upload.

### Window.Prompt (2 trường hợp)
- `src/components/users/user-management-client.tsx` (dòng 203): Nhập mật khẩu mới.
- `src/components/documents/document-manager.tsx` (dòng 73): Đổi tên thư mục.

## 3. Danh sách toàn bộ toast/notification/modal hiện có

Hệ thống chưa có bộ UI Component chuẩn (`Toast`, `Dialog`, `Modal`) đặt tại `src/components/ui/`. Hiện tại các modal được xây dựng thủ công (ad-hoc) rải rác ở từng component:

- **Modal tạo/sửa thông tin**: 
  - Create User Modal, Edit User Modal, Detail User Modal, Assign Project Modal trong `user-management-client.tsx`.
  - Delete Project Modal tùy chỉnh trong `delete-project-button.tsx`.
- **Toast thủ công**:
  - Có một đoạn code Toast nội bộ nằm trong `src/components/field-progress/master-table.tsx` dòng 23, dùng `useState` và `setTimeout` để tự xây dựng toast. Tuy nhiên không thể tái sử dụng ở các module khác.
- **Alert Native**:
  - Hệ thống sử dụng `window.addEventListener('beforeunload', ...)` trong `master-table.tsx` dòng 139 để chống mất dữ liệu khi rời trang. (Nên giữ vì đây là tính năng native của trình duyệt chống tắt tab sai cách, nhưng cần kiểm tra thêm lúc navigate bằng router Next.js).

## 4. Bảng phân loại Audit

| STT | File | Dòng | Loại | Nội dung | Màn hình | Cần giữ không | Đề xuất |
|---|---|---:|---|---|---|---|---|
| 1 | `user-management-client.tsx` | 103 | `confirm` | Khóa/Mở khóa tài khoản | `/users` | Có | Đổi sang ConfirmDialog (Danger/Warning) |
| 2 | `user-management-client.tsx` | 116 | `confirm` | Xóa mềm tài khoản | `/users` | Có | Đổi sang ConfirmDialog (Danger) |
| 3 | `user-management-client.tsx` | 129 | `confirm` | Khôi phục tài khoản | `/users` | Có | Đổi sang ConfirmDialog (Info/Success) |
| 4 | `user-management-client.tsx` | 191 | `confirm` | Gỡ công trình | `/users` | Có | Đổi sang ConfirmDialog (Danger) |
| 5 | `user-management-client.tsx` | 203 | `prompt` | Nhập mật khẩu mới | `/users` | Có | Đổi sang Dialog có Input form |
| 6 | `user-management-client.tsx` | Nhiều | `alert` | Báo lỗi / Thành công thao tác | `/users` | Không | Đổi sang Toast Error/Success dùng chung |
| 7 | `delete-project-button.tsx` | 21 | `alert` | Lỗi khi xóa công trình | `/projects` | Không | Đổi sang Toast Error |
| 8 | `material-request-detail.tsx` | 65 | `confirm` | Cảnh báo vượt KL cấp/nhận | Vật tư | Có | Đổi sang ConfirmDialog (Warning) |
| 9 | `material-request-detail.tsx` | 94 | `confirm` | Hủy phiếu vật tư | Vật tư | Có | Đổi sang ConfirmDialog (Danger) |
| 10 | `master-table.tsx` | Nhiều | `alert` | Báo lỗi thao tác | Field Progress | Không | Đổi sang Toast Error |
| 11 | `daily-entry-table.tsx` | 338 | `confirm` | Chuyển ngày chưa lưu | Field Progress | Có | Đổi sang ConfirmDialog (Warning) |
| 12 | `daily-entry-table.tsx` | Nhiều | `alert` | Báo lỗi validate / Thành công | Field Progress | Không | Đổi sang Toast Error/Success |
| 13 | `document-manager.tsx` | 80, 87| `confirm` | Xóa thư mục/file | Documents | Có | Đổi sang ConfirmDialog (Danger) |
| 14 | `document-manager.tsx` | 73 | `prompt` | Đổi tên file/thư mục | Documents | Có | Đổi sang Dialog có Input form |
| 15 | `document-manager.tsx` | Nhiều | `alert` | Lỗi validate / Lỗi tác vụ | Documents | Không | Đổi sang Toast Error |

## 5. Đánh giá riêng màn Quản lý tài khoản (`/users`)

- **Thao tác dùng `window.confirm`**: Khóa, Mở khóa, Xóa mềm, Khôi phục, Gỡ công trình.
- **Thao tác dùng `window.prompt`**: Đổi mật khẩu tài khoản.
- **Thao tác không confirm**: Sửa tài khoản (Mở modal riêng), Gán công trình (Mở modal riêng).
- **Thao tác cần confirm**: Xóa mềm, Khóa, Gỡ công trình. (Nên đổi sang modal).
- **Đánh giá nội dung confirm**: Rất dài, đặc biệt là thông báo xóa mềm. Khi hiển thị trên native alert bị cuộn chữ rất xấu.
- **Đề xuất Modal thay thế**:
  - Đổi toàn bộ sang `ConfirmDialog` mới. 
  - Đổi prompt Reset Password thành một Form Dialog nhỏ với validation tối thiểu 6 ký tự.

## 6. Đánh giá riêng Công trình (`/projects`)

- **Xóa công trình**: Hiện tại đã sử dụng một Custom Modal tự build nằm trong `delete-project-button.tsx`. Modal này ổn, tuy nhiên đang fix cứng trong component. Cần tái sử dụng nếu thiết kế bộ ConfirmDialog chuẩn.
- **Báo lỗi khi xóa**: Vẫn dùng `alert(res.error)`. Cần chuyển thành Toast.

## 7. Đánh giá riêng Field Progress

- **Xóa hạng mục / công việc**: Hiện tại trong `master-table.tsx` (dòng 579) đang sử dụng một Custom Delete Confirmation Modal tự build. Cần tái cơ cấu để dùng component chuẩn.
- **Cảnh báo chuyển ngày**: Đang dùng `window.confirm` (dòng 338 trong `daily-entry-table.tsx`). Khá xấu, dễ bấm nhầm và gây khó chịu. Cần đổi sang ConfirmDialog Warning.
- **Alert thừa**: Dòng 393 `daily-entry-table.tsx` có alert "Tuyệt vời! Đã nhập hết các công việc". Cực kỳ phiền phức nếu phải tương tác nhiều lần. Nên thay bằng Toast.
- **Validate Form**: Các alert cảnh báo lỗi thiếu thông tin nội dung công việc (dòng 90, 101, v.v) đều đang dùng native alert chặn luồng của trình duyệt. Cần đổi sang Toast Error và highlight đỏ ô nhập liệu để thân thiện hơn.

## 8. Đánh giá riêng Material Requests

- **Hủy phiếu vật tư**: Đang dùng `window.confirm` -> Cần ConfirmDialog Danger.
- **Cảnh báo cấp/nhận vượt đề xuất**: Đang dùng `window.confirm` -> Cần ConfirmDialog Warning có thông điệp rõ ràng. Nút nên là "Vẫn Lưu" và "Kiểm tra lại".

## 9. Đề xuất chuẩn UI ConfirmDialog dùng chung

Nên tạo một component `src/components/ui/confirm-dialog.tsx` có các thuộc tính:

```tsx
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: React.ReactNode;
  variant?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  isLoading?: boolean;
}
```

**Nguyên tắc thiết kế (Accessibility & UX):**
- **Tiêu đề rõ ràng**: "Xóa mềm tài khoản?" thay vì "Xác nhận".
- **CTA Action**: Nút confirm phải ghi rõ hành động: "Xóa", "Khóa", "Vẫn Lưu" thay vì "OK".
- **Color**: Danger (Đỏ), Warning (Cam), Info (Xanh).
- **Mobile Friendly**: Padding lớn, nút to dễ bấm trên điện thoại.
- **A11y**: Focus tự động, có thể đóng bằng ESC, nhấn ngoài overlay để đóng.

## 10. Đề xuất chuẩn Toast / Notification dùng chung

Nên tích hợp một thư viện toast chuẩn (như `react-hot-toast` hoặc `sonner`) hoặc xây dựng một global Context Toast đơn giản:

```tsx
toast.success("Đã lưu thành công");
toast.error("Vui lòng nhập nội dung công việc");
```

- Bỏ tất cả các `window.alert` hiện có.
- Gắn Toast Provider ở root layout.

## 11. Danh sách lỗi theo mức độ

- **[HIGH] UX Regression**: Việc sử dụng quá nhiều `window.alert` để validate form trong màn Field Progress (Daily) chặn tương tác người dùng liên tục. Gây bực bội trên Mobile.
- **[HIGH] UI/UX Sync**: Native confirm khi Xóa mềm user hoặc Hủy phiếu vật tư hiển thị rất nhiều text, trên Mobile không thể hiện được màu sắc cảnh báo rủi ro (Danger). Dễ dẫn đến bấm nhầm.
- **[MEDIUM] Inconsistent System**: Trong dự án có chỗ dùng Modal custom (Xóa công trình, Xóa master table), có chỗ dùng native (Xóa user, Hủy phiếu). Thiếu sự nhất quán nghiêm trọng.
- **[LOW] Hardcoded Alerts**: Rất nhiều dòng code `alert(res.error)` thiếu tính chuyên nghiệp.

## 12. Phase Fix đề xuất sau audit

1. **Step 1**: Cài đặt / Tạo thư viện `Toast` và áp dụng đổi hàng loạt tất cả các file chứa `window.alert` sang Toast (tốn khoảng 30 phút).
2. **Step 2**: Xây dựng component `ConfirmDialog` chuẩn.
3. **Step 3**: Thay thế `window.confirm` tại màn Quản lý tài khoản (`/users`) và Material Request.
4. **Step 4**: Xây dựng `PromptDialog` nhỏ để thay thế `window.prompt` (Reset Password, Đổi tên thư mục).
5. **Step 5**: Thay thế `window.confirm` cảnh báo chuyển ngày trong Field Progress.

---

## 13. Xác nhận
- **Chưa sửa code**: Báo cáo chỉ thực hiện phân tích và đọc (Read-only), chưa có bất kỳ chỉnh sửa nào đối với source code của hệ thống.
- **Không commit/push**: Phase audit này chưa tạo commit và chưa push code nào lên remote repository.
