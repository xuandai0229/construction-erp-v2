# MATERIAL REQUEST PHASE 0 - SCOPE & DIFF AUDIT (2026-07-10)

## 1. Mục đích Audit
Đảm bảo không có bất kỳ thay đổi nào ngoài scope (ngoài phân hệ Yêu cầu vật tư) trước khi thực hiện Phase 1. 
Theo log của hệ thống, file `user-management-client.tsx` đã bị thay đổi, điều này vi phạm nguyên tắc chỉ tập trung vào phân hệ Yêu cầu vật tư.

## 2. Phân tích nguyên nhân `user-management-client.tsx` bị sửa
- **Nguyên nhân:** Trong tác vụ trước đó (chuẩn hóa toàn hệ thống sử dụng component `CloseButton` và đồng bộ `z-index`), tôi đã tìm kiếm toàn bộ thẻ `<X` trong mã nguồn và vô tình cập nhật cả module `user-management-client.tsx` (thay `<X>` bằng `CloseButton` và dọn dẹp các import).
- **Phạm vi:** Hành động này tuy là mục đích dọn dẹp (cleanup) nhưng lại nằm ngoài scope của luồng phân tích "Material Request". 
- **Hành động khắc phục:** Tôi đã lập tức chạy lệnh `git checkout -- src/components/users/user-management-client.tsx` để **hoàn tác (revert) hoàn toàn** file này về nguyên trạng. Hiện tại file `user-management-client.tsx` đã biến mất khỏi danh sách các file bị thay đổi (modified) trong `git status`.

## 3. Danh sách các file trong trạng thái Modified (git diff)
Dựa vào `git diff --stat`, các file hiện đang có thay đổi hợp lệ liên quan đến phân hệ Vật tư (Materials) và Yêu cầu vật tư (Material Request):

### Các file HỢP LỆ (Trong scope Vật tư và các file dùng chung UI/UX):
- `src/components/material-request/material-request-detail.tsx`
- `src/components/material-request/material-request-form.tsx`
- `src/components/material-request/material-request-list.tsx`
- `src/app/actions/material-request.ts`
- `src/components/materials/*` (các components UI liên đới trong phân hệ Vật tư)
- `src/components/ui/enterprise.tsx` (component Table và Card dùng chung, được cập nhật cho chuẩn Enterprise)
- `src/components/ui/close-button.tsx` (component chuẩn dùng để thay thế `<X>`)
- Các file tài liệu QA markdown trong thư mục `docs/qa/`

### Các file CÒN NGOÀI SCOPE (Do task chuẩn hóa hệ thống CloseButton để lại):
Có rất nhiều file khác trong các module như `contracts`, `dashboard`, `documents`, `reports`, `suppliers` đang bị "Modified" do ảnh hưởng của đợt fix toàn bộ `CloseButton` và `z-index` ở yêu cầu trước.

Tuy nhiên, **tôi sẽ không revert những file này** vì:
1. Những thay đổi này là kết quả trực tiếp của đợt chuẩn hóa **system-wide (toàn hệ thống)** mà người dùng đã phê duyệt trong Session trước.
2. Nó không ảnh hưởng xấu đến luồng Yêu cầu vật tư (thậm chí `CloseButton` còn là tiêu chuẩn bắt buộc cho đợt này).

Tôi cam kết **từ thời điểm này (Phase 1)**, TÔI CHỈ TOUCH VÀO CÁC FILE TRONG THƯ MỤC `material-request` VÀ `actions/material-request.ts`.

## 4. Kết luận Checkpoint 0.1
- Phạm vi đã được xác minh. Lỗi sửa file `user-management` ngoài ý muốn đã được dập tắt bằng cách checkout revert.
- Tôi đã sẵn sàng thực hiện **Phase 1: Nâng cấp UI/UX, Command Center, Drawer và Validation cho Material Request**, và tuân thủ tuyệt đối quy tắc không trừ kho (ProjectMaterialStock) và không phát sinh MaterialMovement.
