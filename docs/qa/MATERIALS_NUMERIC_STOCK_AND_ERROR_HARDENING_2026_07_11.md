# BÁO CÁO FIX LỖI NHẬP SỐ VÀ HARDENING LỖI HỆ THỐNG MODULE MATERIALS

**Tên file:** `MATERIALS_NUMERIC_STOCK_AND_ERROR_HARDENING_2026_07_11.md`
**Ngày tạo:** 2026-07-11
**Trạng thái:** **GO**

## 1. Nguyên nhân và giải pháp cho Numeric Input
Trường "Ngưỡng cảnh báo" và các trường nhập số lượng trước đây sử dụng thẻ HTML `<input type="number">`. Trên nhiều trình duyệt, thẻ này cho phép nhập các ký tự đặc biệt liên quan đến toán học số thực (như `e`, `+`, `-`, hoặc đôi khi `p` ở một số engine). Nếu người dùng ấn nhầm, input value trả về rỗng hoặc NaN, gây sai sót dữ liệu khi đẩy xuống server.
**Giải pháp:**
- Tôi đã tạo ra một component chuẩn ERP: `NumericInput` tại `src/components/ui/numeric-input.tsx`.
- Component này sử dụng `type="text"` (chống mọi hành vi ngầm của trình duyệt) nhưng dùng `inputMode="decimal"` để bàn phím điện thoại vẫn hiện phím số.
- Component chặn ngay từ bàn phím bằng `onKeyDown` (chặn `e`, `p`, `+`, `-` nếu không được phép) và sanitize lại ở `onChange` (chỉ cho phép các ký tự số, dấu phẩy/chấm).
- Đã thay thế thành công ở: 
  + `material-form-dialog.tsx` (Ngưỡng cảnh báo, Tồn ban đầu)
  + `transaction-form-dialog.tsx` (Số lượng nhập/xuất)
  + `material-request-form.tsx` (Số lượng đề xuất)
  + `material-request-detail.tsx` (Số lượng cấp/nhận)

## 2. Server Validation & User Friendly Errors
**Bảo vệ dữ liệu Ledger:**
- Hàm `parsePositiveQuantity` và `parseNonNegativeQuantity` trong `ledger.ts` được sử dụng để chặn số âm, NaN, số 0 (nếu buộc phải dương).
- Các catch block ở `actions.ts` đã được tích hợp hàm `handlePrismaError`.
- Khi có lỗi DB thô bạo (ví dụ: `Invalid tx.materialMovement.create()`, lỗi Unique constraint P2002...), hàm này sẽ nuốt lỗi stack trace và ném ra thông điệp thân thiện: *"Không thể tạo giao dịch. Vui lòng kiểm tra lại số lượng hoặc dữ liệu"*, hoặc *"Mã vật tư đã tồn tại"*.

## 3. Quản lý hai khái niệm Tồn kho
**Ngưỡng cảnh báo vs Tồn ban đầu:**
- Giao diện đã có label và helper text rõ ràng để phân biệt. Ngưỡng cảnh báo KHÔNG bao giờ sinh ra phiếu Nhập.
- Tồn ban đầu, nếu được khai báo lúc tạo, sẽ gọi ngay một Transaction nhập kho.
- Kiểm thử đã vượt qua kịch bản: 
  + Tạo không có tồn ban đầu -> Tồn = 0.
  + Tạo có tồn ban đầu = 666 -> Tồn = 666 (Phiếu IMPORT được sinh ra).
  + Xuất 555 -> Tồn = 111. Hệ thống tự nhận dạng 111 < 660 và bật cờ "Sắp hết".
  + Nhập thêm 3000 -> Tồn = 3111. Hệ thống tự động tắt cờ cảnh báo.
- Việc sửa thông tin vật tư (Mã, Tên, Đơn vị, Ngưỡng cảnh báo) hoàn toàn KHÔNG làm thay đổi số tồn hiện tại. 

## 4. Kiểm thử Tự động & Lệnh Build (Zero Error)
Tất cả các QA Script đã được chạy với transaction rollback (bảo đảm an toàn dữ liệu 100%) và trả về mã thành công:
1. `npx prisma validate`: **PASS**
2. `npx tsc --noEmit`: **PASS**
3. `qa-material-numeric-input-validation.ts`: **PASS**
4. `qa-material-initial-stock-and-min-stock.ts`: **PASS**
5. `qa-material-update-full-fields.ts`: **PASS**
6. `qa-material-user-friendly-errors.ts`: **PASS**
7. `npm run build`: **PASS** (Hoàn thành mượt mà).

## 5. Kết luận
Lỗi input số dơ (dirty input) và lỗi rò rỉ Prisma Exception đã được vá triệt để toàn hệ thống Materials. 
Giao diện tĩnh bảo đảm tính Responsive, Mobile-friendly và chống tràn UI.
Hệ thống xử lý Tồn đầu kỳ / Cảnh báo cực kỳ rành mạch và an toàn.

=> **Trạng thái: GO** (Sẵn sàng Merge lên Production).
