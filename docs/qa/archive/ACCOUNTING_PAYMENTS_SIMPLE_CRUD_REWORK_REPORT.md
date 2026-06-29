# Báo cáo: Rút gọn luồng "Kế toán & Thanh toán" thành Simple CRUD

## 1. Vấn đề trước khi sửa
Trong quá trình vận hành, UI/UX màn hình "Kế toán & Thanh toán" hiện có quá nhiều thành phần nghiệp vụ làm rối mắt:
- Workflow phức tạp (Gửi duyệt, Phê duyệt, Chốt thanh toán) không cần thiết cho phase này.
- Dropdown 3 chấm (Portal) hiển thị dài dòng, che khuất thông tin.
- Có nhiều action bị disable khiến thao tác bị gián đoạn, người dùng khó hiểu vì sao không bấm được.
- Dashboard cards dựa vào trạng thái làm lệch số liệu so với bảng biểu do một số trạng thái bị bỏ qua.
- Lệch ngày ở cột `Hạn TT` (Timezone offset issue) làm sai lệch dữ liệu hiển thị.

## 2. Phương án mới (Simple CRUD)
Nhằm tập trung vào trải nghiệm mượt mà, dễ dùng và trực quan, ứng dụng đã lược bỏ Workflow ở tầng UI để quay về Simple CRUD (Tạo, Đọc, Sửa, Xóa mềm):

- **Giao diện bảng biểu:**
  - Lược bỏ hoàn toàn Dropdown 3 chấm.
  - Cột thao tác hiển thị cứng 3 nút: **[Xem]** (Eye), **[Sửa]** (Pencil), **[Xóa]** (Trash2) dàn ngang cố định.
  - Xóa luôn cột "Trạng thái", không làm rối mắt nữa.
  - Đổi tên cột "Hạn TT" thành **"Hạn thanh toán"**. Xử lý lỗi lệch timezone (sử dụng string manipulation `YYYY-MM-DD` để định dạng ngày chuẩn xác `DD/MM/YYYY`, bất chấp Local Timezone thay đổi).
  - Cập nhật hiển thị "Chưa có hạn" đối với hồ sơ không set due date.
- **Tính năng Create / Update / Delete:**
  - Xóa bỏ trường `submit` bool trong Form. Nút bấm duy nhất: "Lưu hồ sơ" / "Cập nhật hồ sơ".
  - Hồ sơ mặc định được tạo với trạng thái `DRAFT` và duy trì ở trạng thái này.
  - Chức năng "Xóa hồ sơ" đã được map chuẩn sang Soft Delete (`deletedAt = now`), loại bỏ trạng thái `CANCELLED` gượng ép.
  - Loại bỏ hoàn toàn sự kiểm duyệt từ `SUBMITTED`, `APPROVED` cho hành động Sửa/Xóa. User thuộc project đó có quyền CRUD tự do.
- **Dashboard Cards:**
  - Tối giản thành 4 card: **Tổng số hồ sơ**, **Tổng giá trị**, **Quá hạn thanh toán**, **Công trình có hồ sơ**.
  - Metric bám sát thực tế, bỏ qua các trạng thái không sử dụng.

## 3. Các File đã cập nhật
- `src/app/(dashboard)/accounting/actions.ts`:
  - Gỡ bỏ logic lock status.
  - Chuyển `deletePaymentRequest` sang thao tác set `deletedAt = new Date()`.
  - Cập nhật các DTO để map chuẩn với Simple CRUD.
- `src/app/(dashboard)/accounting/components/accounting-workspace.tsx`:
  - Xóa Portal logic và ReasonDialog.
  - Cập nhật UI bảng (bỏ Status column, update Action column).
  - Update calculation logic cho dashboard.
  - Fix bug timezone cho hàm `formatDate()`.
- `src/app/(dashboard)/accounting/components/payment-request-form-dialog.tsx`:
  - Loại bỏ các nút action thừa, chỉ giữ lại một nút submit.
- `scripts/qa-accounting-payments.ts`:
  - Viết lại quy trình test kiểm chứng Soft Delete và Simple Update thay cho Approval Workflow.

## 4. RBAC & Project Scope Verification
Mặc dù UI đã loại bỏ Flow, backend vẫn hoàn toàn bảo toàn Project Scope và Role:
- Admin vẫn có toàn quyền quản lý tài chính tất cả công trình.
- Engineer / User công trình A không thể thao tác, tạo, xem, xóa hồ sơ công trình B.
- QA script `qa-accounting-payments.ts` đã run pass toàn bộ.

## 5. Kết quả TypeScript & Build
- `npx tsc --noEmit`: Pass
- `npm run build`: Pass

## 6. Rủi ro còn lại / Khuyến nghị Phase sau
- Về lâu dài, nếu doanh nghiệp phát triển và cần flow ký số / duyệt, ta có thể xây dựng UI `workflow-approval` độc lập hoặc khôi phục lại các trạng thái `APPROVED`/`PAID` cho người quản trị mà không ảnh hưởng đến thiết kế CRUD cơ bản hiện tại.
- Để quản lý tiền bạc tốt hơn, ta nên sớm tính toán việc đính kèm tệp tin hóa đơn đỏ cho các hồ sơ thanh toán này.
