# Báo cáo QA: Nâng cấp Row Actions và UX Bảng Materials
**Ngày:** 2026-07-10

## 1. Phân tích lỗi từ hình ảnh
1. **Form Đề xuất vật tư:** Menu 3 chấm vẫn còn yêu cầu `window.confirm` khi "Xóa trắng dòng", gây gián đoạn quy trình nhập liệu.
2. **Tab Danh mục / Tồn kho / Nhập xuất:** Cột Header `THAO TÁC` bị xuống 2 dòng (`THAO \n TÁC`).
3. **Tab Yêu cầu vật tư:** Thiếu các action menu theo trạng thái phiếu.
4. **Tab Nhập xuất:** Thiếu menu thao tác cho giao dịch.

## 2. Các điểm đã được sửa chữa

### A. Tối ưu hóa UI Table & Row Action
- Bỏ class `opacity-0 group-hover:opacity-100`, giúp nút ba chấm (`MaterialRowActionMenu`) **luôn hiện diện** rõ ràng ở cuối mỗi dòng.
- Bổ sung `whitespace-nowrap` cho tất cả các thẻ `th` của cột Thao tác, đảm bảo header luôn nằm trên 1 dòng.

### B. Form Tạo đề xuất vật tư (`material-request-form.tsx`)
- **Loại bỏ hoàn toàn `window.confirm`** cho các hành động trên dòng nháp: Xóa trắng dòng, Xóa dòng. Hành động được thực thi ngay lập tức để tiết kiệm thao tác.
- **Xử lý xóa dòng cuối cùng:** Nếu form chỉ còn 1 dòng, việc bấm "Xóa dòng" sẽ tự động chuyển thành "Xóa trắng dòng" (reset về dòng trống ban đầu).
- **Clear thông minh:** Khi người dùng clear `Tên vật tư` (`materialName` === ""), hệ thống sẽ tự động clear `materialItemId`, `materialCode` và `unit`. Tương tự, khi clear công việc liên quan (`workItemNameSnapshot` === ""), sẽ tự clear `wbsItemId` và `fieldProgressItemId`.

### C. Tab Yêu cầu vật tư (`material-request-list.tsx`)
Bổ sung đầy đủ Action Menu tuân theo trạng thái thực tế của phiếu:
- Mọi trạng thái: Xem chi tiết, Sao chép mã phiếu.
- Phiếu `DRAFT` / `REJECTED`: Sửa phiếu, Nhân bản (Disabled: "Chưa hỗ trợ nhân bản phiếu"), Xóa phiếu (Disabled: "Chưa hỗ trợ xóa phiếu từ giao diện").
- Phiếu `SUBMITTED`: Xem phê duyệt (Disabled: "Đang phát triển"), Hủy phiếu (Disabled: "Chưa hỗ trợ hủy phiếu từ giao diện").
- Phiếu `APPROVED`: Xem phê duyệt, Xuất kho (Disabled: "Chưa hỗ trợ tạo phiếu xuất kho từ yêu cầu").

### D. Tab Nhập / Xuất (`materials-transactions.tsx`)
Bổ sung menu thao tác cho mỗi dòng giao dịch:
- Xem chi tiết giao dịch.
- **Xem vật tư:** Tự động điều hướng và search mã vật tư đó ở tab Danh mục.
- **Nhập / Xuất tiếp vật tư này:** Chỉ hiện khi type là IMPORT hoặc EXPORT. Click để mở modal tạo giao dịch với vật tư tương ứng đã được pre-fill.
- **Sao chép thông tin:** Sao chép thẳng "Nhập/Xuất {số lượng} {đơn vị} {tên vật tư}" vào clipboard để tiện chat hoặc báo cáo.

## 3. Trạng thái Build & Kiểm thử
- Các lệnh `npm run build` và `npx tsc --noEmit` đã báo PASS thành công mà không có lỗi.
- Đã tuân thủ nghiêm ngặt **Không restart `npm run dev`**. Server đang chạy có thể reload trực tiếp.
- Các API / Action chưa được backend hỗ trợ đều đã được render với thuộc tính `disabled` kèm `disabledReason` rõ ràng, đảm bảo UX.

**Kết luận:** PASS CÓ ĐIỀU KIỆN (Build/Lint hoàn tất 100%, chờ xác nhận Browser thực tế).
