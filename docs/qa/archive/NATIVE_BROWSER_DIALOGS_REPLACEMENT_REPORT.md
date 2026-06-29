# Báo cáo Cập nhật UX: Loại bỏ toàn bộ Native Browser Dialogs

## 1. Vấn đề phát hiện
Trong quá trình vận hành và kiểm thử các chức năng, đặc biệt là ở màn **Kế toán & Thanh toán**, hệ thống đã sử dụng các popup mặc định của trình duyệt (`window.prompt`, `window.confirm`) để nhận lý do từ chối hoặc xác nhận xóa/hủy hồ sơ.
Những popup này (ví dụ: `localhost:3000 cho biết...`) gây ra trải nghiệm người dùng (UX) rất kém, không đồng bộ với ngôn ngữ thiết kế của ứng dụng, và trông thiếu chuyên nghiệp, không phù hợp cho một hệ thống ERP doanh nghiệp.

## 2. Danh sách file đã được audit
Để đảm bảo ứng dụng sạch sẽ, không còn sót bất kỳ thành phần native popup nào, tôi đã thực hiện `grep_search` kiểm tra trên toàn bộ mã nguồn của:
- `src/app/(dashboard)/accounting`
- `src/app/(dashboard)/contracts`
- `src/app/(dashboard)/materials`
- `src/app/(dashboard)/reports`
- `src/app/(dashboard)/documents`
- `src/components` và các thư mục khác
- `scripts`

## 3. Danh sách file đã phát hiện và sửa lỗi
1. `src/app/(dashboard)/accounting/components/accounting-workspace.tsx`
   - **Xóa bỏ**: 2 lời gọi `confirm()` (Xóa mềm hồ sơ, Chốt trạng thái khác).
   - **Xóa bỏ**: 1 lời gọi `prompt()` (Nhập lý do từ chối).

*Không phát hiện thêm `alert`, `confirm`, `prompt` ở bất kỳ file production nào khác.*

## 4. Các giải pháp thay thế đã triển khai
Thay vì dùng native prompt/confirm, tôi đã chuyển toàn bộ sang sử dụng hệ thống Dialog tùy chỉnh của hệ thống để mang lại UX/UI đồng bộ.

1. **Xác nhận (Hủy / Xóa mềm / Chốt / Duyệt)**
   - Sử dụng lại component **`ConfirmDialog`** (`src/components/ui/confirm-dialog.tsx`) hiện có với các thiết lập hiển thị (variant) tương ứng:
     - Danger: Xác nhận hủy, Xóa mềm.
     - Warning: Xác nhận chốt thanh toán (hành động không thể hoàn tác).
     - Success: Xác nhận duyệt hồ sơ.
     - Info: Gửi phê duyệt.

2. **Nhập liệu (Lý do từ chối)**
   - **Tạo mới Component**: **`ReasonDialog`** (`src/components/ui/reason-dialog.tsx`).
   - Đây là một Component dùng chung (reusable), thiết kế cực kỳ hiện đại với `textarea`, thông báo lỗi (Error message), validate độ dài (min length) và tích hợp các tính năng phím tắt (nhấn Esc để đóng).
   - Tự động reset và focus vào textarea khi mở.

3. **Thông báo hệ thống (Thành công / Lỗi)**
   - Các hành động hoàn tất hoặc báo lỗi tiếp tục sử dụng hệ thống **`toast`** hiện có của dự án thay vì `alert()`.

## 5. Kết quả sau khi chỉnh sửa
- Chạy lại lệnh Quét (`grep`): **Không tìm thấy bất kỳ lời gọi `window.alert`, `window.confirm`, `window.prompt` nào trên thư mục `src`.** Hệ thống hiện tại sạch sẽ 100%.

## 6. Logic Nghiệp vụ Server-side (RBAC)
Mặc dù UI đã được thiết kế lại đẹp hơn, quá trình phân quyền dưới server (`actions.ts`) vẫn được giữ nguyên và đảm bảo cực kỳ chặt chẽ:
- **Từ chối hồ sơ**: Chỉ từ trạng thái `SUBMITTED -> REJECTED`. Bắt buộc phải có lý do gửi lên từ `ReasonDialog`. Người tạo không thể tự từ chối.
- **Duyệt hồ sơ**: Chỉ từ trạng thái `SUBMITTED -> APPROVED`.
- **Chốt thanh toán**: Chỉ từ trạng thái `APPROVED -> PAID`. Bắt buộc tài khoản có quyền ACCOUNTANT hoặc ADMIN.
- **Xóa hồ sơ**: Vẫn tuân thủ logic Soft Delete (`deletedAt`), không hard delete.

## 7. QA Script & Build Check
- Đã thực thi `npx tsx scripts/qa-accounting-payments.ts` để giả lập quá trình gửi yêu cầu Server không truyền lý do reject, test vẫn pass (Server trả về lỗi "Lý do từ chối là bắt buộc").
- `npx prisma validate`: OK.
- TypeScript Compile Check (`npx tsc --noEmit`): OK, không có lỗi.
- Next.js Production Build (`npm run build`): Thành công (Exit code 0).

## 8. Rủi ro còn lại
- Hiện tại `ReasonDialog` chỉ yêu cầu người dùng nhập lý do (default minLength: 10 ký tự, có thể config). Nếu cần định dạng phức tạp hơn hoặc upload file khi reject thì sẽ cần nâng cấp thêm, nhưng ở mức MVP thì textarea là hoàn toàn đáp ứng tốt.
